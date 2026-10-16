'use strict';

// Phase 2 of docs/improvement-plan/ocr-platform-aware — optional activity URL, SSRF
// resistance, duplicate signals and review surfaces. DB-free.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const { parseActivityUrl, listSupportedProviders } = require('../src/utils/ocr/activity-url');
const { sanitizeActivityEvidence } = require('../src/utils/ocr/activity-evidence');
const { buildActivityEvidence } = require('../src/services/ocr/activity-evidence.service');
const { getAuthorizedApiAvailability } = require('../src/services/ocr/activity-url-verification.service');
const validation = require('../src/services/submission-validation.service');

function withEnv(values, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const restore = () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
  return Promise.resolve().then(fn).finally(restore);
}

test('supported provider links are normalised from the activity id only', () => {
  const strava = parseActivityUrl('  https://www.strava.com/activities/12345678901?utm_source=share&token=secret#map ');
  assert.equal(strava.ok, true);
  assert.equal(strava.provider, 'strava');
  assert.equal(strava.providerActivityId, '12345678901');
  assert.equal(strava.normalizedUrl, 'https://www.strava.com/activities/12345678901');
  assert.equal(parseActivityUrl('https://strava.com/activities/42/overview').normalizedUrl, 'https://www.strava.com/activities/42');

  const garmin = parseActivityUrl('https://connect.garmin.com/app/activity/987654321');
  assert.equal(garmin.provider, 'garmin');
  assert.equal(garmin.normalizedUrl, 'https://connect.garmin.com/modern/activity/987654321');

  const coros = parseActivityUrl('https://t.coros.com/admin/views/activity?labelId=abc123XYZ&sportType=100&x=y');
  assert.equal(coros.provider, 'coros');
  assert.equal(coros.providerActivityId, 'abc123XYZ');
  assert.equal(coros.patternStatus, 'unverified-format');
  assert.doesNotMatch(coros.normalizedUrl, /sportType|x=y/);
});

test('empty input is allowed: the link is optional', () => {
  assert.deepEqual(parseActivityUrl(''), { ok: true, provided: false });
  assert.deepEqual(parseActivityUrl('   '), { ok: true, provided: false });
  assert.deepEqual(parseActivityUrl(undefined), { ok: true, provided: false });
});

test('SSRF and spoofing inputs are rejected without any network access', () => {
  const cases = {
    'http://www.strava.com/activities/1': 'unsupported_scheme',
    'javascript:alert(1)': 'unsupported_scheme',
    'file:///etc/passwd': 'unsupported_scheme',
    'ftp://www.strava.com/activities/1': 'unsupported_scheme',
    'https://user:pass@www.strava.com/activities/1': 'credentials_in_url',
    'https://www.strava.com@evil.example/activities/1': 'credentials_in_url',
    'https://www.strava.com:8443/activities/1': 'unsupported_port',
    'https://127.0.0.1/activities/1': 'unsupported_provider',
    'https://[::1]/activities/1': 'unsupported_provider',
    'https://169.254.169.254/latest/meta-data': 'unsupported_provider',
    'https://10.0.0.5/activities/1': 'unsupported_provider',
    'https://localhost/activities/1': 'unsupported_provider',
    'https://strava.com.evil.example/activities/1': 'unsupported_provider',
    'https://evilstrava.com/activities/1': 'unsupported_provider',
    'https://www.strаva.com/activities/1': 'unsupported_provider',
    'https://xn--strva-3ve.com/activities/1': 'unsupported_provider',
    'https://strava.app.link/AbCdEf': 'unsupported_shortlink',
    'https://bit.ly/abc': 'unsupported_shortlink',
    'https://www.strava.com/athletes/123': 'missing_activity_id',
    'https://www.strava.com/activities/abc': 'missing_activity_id',
    'https://www.strava.com/activities/1/../../admin': 'missing_activity_id',
    'https://www.strava.com/activities/%2e%2e/1': 'missing_activity_id',
    'https://connect.garmin.com/modern/activity/': 'missing_activity_id',
    'https://t.coros.com/share': 'missing_activity_id',
    'not a url': 'invalid_url',
    'https://www.strava.com/activities/1\nHost: evil': 'invalid_url'
  };
  for (const [input, code] of Object.entries(cases)) {
    const result = parseActivityUrl(input);
    assert.equal(result.ok, false, input);
    assert.equal(result.errorCode, code, input);
    assert.ok(result.message.length > 10);
  }
  assert.equal(parseActivityUrl(`https://www.strava.com/activities/1?${'a'.repeat(600)}`).errorCode, 'too_long');
});

test('the URL modules contain no network code at all', () => {
  for (const file of ['src/utils/ocr/activity-url.js', 'src/utils/ocr/activity-evidence.js', 'src/services/ocr/activity-evidence.service.js', 'src/services/ocr/activity-url-verification.service.js', 'src/services/ocr/activity-duplicate.service.js']) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.doesNotMatch(source, /require\(['"](?:node:)?(?:https?|net|tls|dns|dgram|http2)['"]\)/, file);
    assert.doesNotMatch(source, /\bfetch\(|axios|got\(|undici|XMLHttpRequest/, file);
  }
});

test('authorized provider API verification is reported unavailable, never attempted', () => {
  const availability = getAuthorizedApiAvailability('strava');
  assert.equal(availability.available, false);
  assert.equal(availability.reason, 'no_authorised_provider_api');
});

test('supported providers are listed with honest pattern status', () => {
  const providers = listSupportedProviders();
  assert.deepEqual(providers.map((p) => p.provider), ['strava', 'garmin', 'coros']);
  assert.equal(providers.find((p) => p.provider === 'coros').patternStatus, 'unverified-format');
});

test('evidence sanitising adds nothing when the feature is off and stores no raw URL', () => {
  assert.deepEqual(sanitizeActivityEvidence(undefined), {});
  const parsed = parseActivityUrl('https://www.strava.com/activities/77?private_token=abc');
  const stored = sanitizeActivityEvidence({ parsed, duplicateSignals: [{ kind: 'provider_activity_id', sameRunner: false, sameEvent: true, otherEntryKind: 'run_submission' }, { kind: 'evil' }] });
  assert.equal(stored.activityUrl.normalizedUrl, 'https://www.strava.com/activities/77');
  assert.doesNotMatch(JSON.stringify(stored), /private_token/);
  assert.equal(stored.activityUrlVerification.status, 'unchecked');
  assert.equal(stored.activityUrlVerification.method, 'format_only');
  assert.equal(stored.duplicateSignals.length, 1);
  const none = sanitizeActivityEvidence({ parsed: { ok: true, provided: false }, duplicateSignals: [] });
  assert.equal(none.activityUrl, undefined);
  assert.equal(none.activityUrlVerification.status, 'not_provided');
});

test('the request builder is a no-op with the flag off and never blocks on lookup errors', async () => {
  await withEnv({ ACTIVITY_URL_ENABLED: undefined }, async () => {
    assert.deepEqual(await buildActivityEvidence({ rawUrl: 'garbage' }), { ok: true, evidence: undefined });
  });
  await withEnv({ ACTIVITY_URL_ENABLED: 'true' }, async () => {
    const bad = await buildActivityEvidence({ rawUrl: 'https://evil.example/x' });
    assert.equal(bad.ok, false);
    assert.equal(bad.errorCode, 'unsupported_provider');
    const empty = await buildActivityEvidence({ rawUrl: '' });
    assert.equal(empty.ok, true);
    assert.equal(empty.evidence.parsed.provided, false);
    const tolerant = await buildActivityEvidence({ rawUrl: 'https://www.strava.com/activities/5' }, {
      findProviderActivityDuplicates: async () => { throw new Error('db down'); }
    });
    assert.equal(tolerant.ok, true);
    assert.deepEqual(tolerant.evidence.duplicateSignals, []);
    const flagged = await buildActivityEvidence({ rawUrl: 'https://www.strava.com/activities/5' }, {
      findProviderActivityDuplicates: async () => [{ kind: 'provider_activity_id' }]
    });
    assert.equal(flagged.evidence.duplicateSignals.length, 1);
  });
});

test('a duplicate signal keeps an entry out of auto-approval on every path', () => {
  const entry = {
    status: 'submitted', source: 'manual_upload', proof: { key: 'k' },
    ocrData: { extractedDistanceKm: 5, extractedTimeMs: 1_500_000, confidence: 0.95, nameMatchStatus: 'matched' }
  };
  assert.equal(validation.isAutoApprovableSubmission(entry), true);
  assert.equal(validation.isAutoApprovableSubmission({ ...entry, duplicateSignals: [{ kind: 'near_duplicate_screenshot' }] }), false);
  assert.equal(validation.isAutoApprovableSubmission({ ...entry, duplicateSignals: [] }), true);
});

test('activity link panel renders the rebuilt link safely and explains its limits', () => {
  const file = path.join(ROOT, 'src/views/organizer/partials/activity-url-panel.ejs');
  const template = fs.readFileSync(file, 'utf8');
  const html = ejs.render(template, {
    entry: {
      activityUrl: { provider: 'strava', normalizedUrl: 'https://www.strava.com/activities/1', patternStatus: 'verified-format' },
      activityUrlVerification: { status: 'unchecked' },
      duplicateSignals: [{ kind: 'provider_activity_id', sameRunner: false, sameEvent: true, distance: null }]
    },
    actionHref: '/organizer/events/e/submissions/s/activity-url-check',
    entryKind: 'run_submission',
    csrfToken: 'tok'
  }, { filename: file });
  assert.match(html, /href="https:\/\/www\.strava\.com\/activities\/1"/);
  assert.match(html, /rel="noopener noreferrer nofollow"/);
  assert.match(html, /does not prove the activity belongs to this runner/);
  assert.match(html, /same activity link is on another entry/);
  assert.match(html, /name="_csrf" value="tok"/);
  assert.equal(ejs.render(template, { entry: {} }, { filename: file }).trim(), '');
});

test('run-proof modal offers the optional link only behind the flag', () => {
  const modal = fs.readFileSync(path.join(ROOT, 'src/views/partials/run-proof-modal.ejs'), 'utf8');
  assert.match(modal, /locals\.activityUrlEnabled/);
  assert.match(modal, /name="activityUrl"/);
  assert.match(modal, /Optional/);
});

test('submission controller validates the link before uploading the proof', () => {
  const controller = fs.readFileSync(path.join(ROOT, 'src/controllers/page/submission.controller.js'), 'utf8');
  const evidenceAt = controller.indexOf('await buildActivityEvidence(');
  assert.ok(evidenceAt > 0);
  assert.ok(evidenceAt < controller.indexOf('uploadService.uploadResultProofToR2'));
  assert.match(controller, /fieldErrors: \{ activityUrl:/);
  assert.match(controller, /honorSystemConfirmed,\s*activityEvidence\s*\};/);
});

test('a screenshot/link provider disagreement keeps an entry on review', async () => {
  await withEnv({ OCR_SERVER_PIPELINE_ENABLED: 'true', OCR_SERVER_AUTO_APPROVAL_ENABLED: 'true' }, () => {
    const serverOcr = {
      status: 'complete', proofKey: 'k', suspicious: false, validationFlags: [],
      autoApproval: { extractedDistanceKm: 5, extractedTimeMs: 1_500_000, confidence: 0.9, nameMatchStatus: 'not_detected' }
    };
    const entry = { status: 'submitted', source: 'manual_upload', proof: { key: 'k' }, serverOcr };
    assert.equal(validation.isAutoApprovableSubmission(entry), true);
    assert.equal(validation.isAutoApprovableSubmission({ ...entry, serverOcr: { ...serverOcr, validationFlags: ['url_provider_mismatch'] } }), false);
  });
});

test('organiser link-check route is event-scoped, CSRF-protected and mounted', () => {
  const route = fs.readFileSync(path.join(ROOT, 'src/routes/organiser/activity-evidence.js'), 'utf8');
  assert.match(route, /requireAuth,\s*requireCsrfProtection,\s*submissionReviewActionLimiter/);
  assert.match(route, /getRegistrantAccessibleEventOrNull\(eventId, user\)/);
  assert.match(route, /canAccessRegistrantReview\(user\)/);
  const barrel = fs.readFileSync(path.join(ROOT, 'src/routes/organizer.routes.js'), 'utf8');
  assert.match(barrel, /router\.use\('\/', activityEvidenceRoutes\)/);
});
