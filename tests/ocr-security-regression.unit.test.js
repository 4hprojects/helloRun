'use strict';

// Phase 6 of docs/improvement-plan/ocr-platform-aware — cross-cutting security, privacy and
// backward-compatibility checks over everything the OCR work added. DB-free.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const { buildEvidenceSnapshot } = require('../src/services/review-decision.service');
const config = require('../src/services/ocr/ocr-config');

function listFiles(dir, predicate) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(relative, predicate));
    else if (predicate(relative)) out.push(relative);
  }
  return out;
}

const OCR_SERVICE_FILES = listFiles('src/services/ocr', (file) => file.endsWith('.js'));

test('every OCR feature flag is off unless explicitly set', () => {
  const saved = {};
  for (const name of config.OCR_FLAGS) {
    saved[name] = process.env[name];
    delete process.env[name];
  }
  try {
    assert.equal(config.isServerOcrPipelineEnabled(), false);
    assert.equal(config.isServerOcrAutoApprovalEnabled(), false);
    assert.equal(config.isActivityUrlEnabled(), false);
    assert.equal(config.isTrainingConsentPromptEnabled(), false);
    assert.equal(config.isTrainingEnabled(), false);
    assert.equal(config.isRemindersEnabled(), false);
    process.env.OCR_TRAINING_ENABLED = 'yes';
    assert.equal(config.isTrainingEnabled(), false, 'only true/1 enable a flag');
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
  const example = read('.env.example');
  for (const name of config.OCR_FLAGS) assert.match(example, new RegExp(`^${name}=false$`, 'm'), name);
});

test('review decisions keep the OCR evidence behind a decision, and nothing extra for old entries', () => {
  const withOcr = buildEvidenceSnapshot({
    distanceKm: 5,
    serverOcr: { status: 'complete', platform: 'strava', autoApproval: { confidence: 0.9 } },
    activityUrl: { provider: 'strava', providerActivityId: '1', normalizedUrl: 'https://www.strava.com/activities/1' },
    duplicateSignals: [{ kind: 'near_duplicate_screenshot' }]
  }, 'run_submission');
  assert.equal(withOcr.serverOcr.platform, 'strava');
  assert.equal(withOcr.activityUrl.providerActivityId, '1');
  assert.equal(withOcr.duplicateSignals.length, 1);
  const legacy = buildEvidenceSnapshot({ distanceKm: 5 }, 'run_submission');
  assert.equal('serverOcr' in legacy, false);
  assert.equal('activityUrl' in legacy, false);
});

test('OCR code never logs screenshot text, crops or provider tokens', () => {
  for (const file of [...OCR_SERVICE_FILES, 'src/workers/ocr-extraction-worker.js', 'src/workers/ocr-maintenance-worker.js', 'src/controllers/admin/ocr-training.controller.js', 'src/controllers/admin/ocr-training-data.controller.js']) {
    const source = read(file);
    for (const call of source.match(/logger\.(?:info|warn|error|debug)\([^;]*\);/gs) || []) {
      assert.doesNotMatch(call, /rawText|ocrText|transcribedText|buffer|normalizedUrl|accessToken/, `${file}: ${call.slice(0, 120)}`);
    }
    assert.doesNotMatch(source, /console\.log\(/, file);
  }
});

test('no OCR module makes outbound HTTP requests or runs a shell', () => {
  for (const file of OCR_SERVICE_FILES) {
    const source = read(file);
    assert.doesNotMatch(source, /\bfetch\(|require\(['"](?:node:)?https?['"]\)|axios/, file);
    assert.doesNotMatch(source, /\bexecSync\(|\bexec\(|shell:\s*true/, file);
  }
});

test('every OCR admin mutation is behind admin auth and CSRF; deployment and settings need the full tier', () => {
  const routes = read('src/routes/admin-ocr-training.routes.js');
  const lines = routes.split('\n').filter((line) => /^router\.(post|put|patch|delete)\(/.test(line));
  // Pinned: adding a mutating route means reviewing it here.
  assert.equal(lines.length, 14, `found ${lines.length} mutating routes`);
  assert.ok(routes.indexOf('router.use(requireAdmin)') < routes.indexOf('router.get('), 'requireAdmin precedes every route');
  for (const line of lines) {
    if (line.includes('uploadService.')) assert.match(line, /uploadService\.\w+, requireCsrfProtection/, line);
  }
  for (const pathname of ["'/settings'", "'/models/:modelId/approve'", "'/models/:modelId/activate'", "'/models/rollback'"]) {
    const line = lines.find((candidate) => candidate.includes(`(${pathname},`));
    assert.ok(line, pathname);
    assert.match(line, /requireFullAdmin/, pathname);
  }
  assert.match(routes, /'\/analytics\/research-export\.csv', requireFullAdmin/);
});

test('new organiser and runner routes are CSRF-protected and scoped', () => {
  assert.match(read('src/routes/organiser/activity-evidence.js'), /requireAuth,\s*requireCsrfProtection/);
  const runnerRoutes = read('src/routes/runner.routes.js');
  assert.match(runnerRoutes, /if \(req\.method === 'POST'\)[\s\S]*requireCsrfProtection\(req, res, next\)/);
  assert.match(runnerRoutes, /ocr-training-consent\/withdraw/);
});

test('admin redirects only go back inside the OCR area', () => {
  const data = read('src/controllers/admin/ocr-training-data.controller.js');
  assert.match(data, /returnTo \|\| ''\)\.startsWith\('\/admin\/ocr-training\/samples'\)/);
  const main = read('src/controllers/admin/ocr-training.controller.js');
  assert.match(main, /returnTo \|\| ''\)\.startsWith\('\/admin\/'\)/);
});

test('new OCR views escape output (raw output only for includes)', () => {
  const views = [...listFiles('src/views/admin/ocr-training', (file) => file.endsWith('.ejs')), 'src/views/organizer/partials/server-ocr-panel.ejs', 'src/views/organizer/partials/activity-url-panel.ejs'];
  for (const file of views) {
    for (const raw of read(file).match(/<%-[\s\S]*?%>/g) || []) {
      assert.match(raw, /^<%-\s*include\(/, `${file}: ${raw.slice(0, 60)}`);
    }
  }
});

test('flags off keeps the stored entry shape and the payload unchanged', () => {
  const { sanitizeActivityEvidence, sanitizeTrainingConsent } = require('../src/utils/ocr/activity-evidence');
  assert.deepEqual(sanitizeActivityEvidence(undefined), {});
  assert.deepEqual(sanitizeTrainingConsent(undefined), {});
  const shadow = read('src/services/submission-shadow.service.js');
  for (const field of ['serverOcr', 'activityUrl', 'duplicateSignals', 'ocrTrainingConsent']) {
    assert.doesNotMatch(shadow, new RegExp(field), `${field} must stay out of the Supabase shadow`);
  }
});

test('the training trainer and the reminder worker never run in a request', () => {
  for (const file of listFiles('src/controllers', (f) => f.endsWith('.js')).concat(listFiles('src/routes', (f) => f.endsWith('.js')))) {
    const source = read(file);
    assert.doesNotMatch(source, /runTrainingJob|buildTrainingCommand|runProcess\(/, file);
  }
});
