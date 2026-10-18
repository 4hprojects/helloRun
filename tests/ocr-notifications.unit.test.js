'use strict';

// Phase 5 of docs/improvement-plan/ocr-platform-aware — reminder schedule, event keys,
// email content, research export safety and admin surfaces. DB-free.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const { getDigestSchedule, isoWeek } = require('../src/utils/ocr/digest-schedule');
const { buildEventKey, buildEmail } = require('../src/services/ocr/ocr-notification.service');
const { csvCell } = require('../src/services/ocr/ocr-analytics.service');
const { startOcrMaintenanceWorker } = require('../src/workers/ocr-maintenance-worker');

const weekly = { frequency: 'weekly', dayOfWeek: 1, hour: 8, timezone: 'Asia/Manila' };

test('nothing is scheduled until an admin picks a day and hour, or when off', () => {
  assert.equal(getDigestSchedule(new Date(), { ...weekly, dayOfWeek: null }).reason, 'schedule_not_set');
  assert.equal(getDigestSchedule(new Date(), { ...weekly, hour: undefined }).reason, 'schedule_not_set');
  assert.equal(getDigestSchedule(new Date(), { ...weekly, frequency: 'off' }).reason, 'frequency_off');
});

test('weekly digest is due once per ISO week at or after the local time', () => {
  // Monday 2026-10-19 08:00 Asia/Manila = 00:00 UTC.
  const before = getDigestSchedule(new Date('2026-10-18T23:59:00Z'), weekly); // Mon 07:59 Manila
  assert.equal(before.due, false);
  const at = getDigestSchedule(new Date('2026-10-19T00:00:00Z'), weekly);
  assert.equal(at.due, true);
  const later = getDigestSchedule(new Date('2026-10-23T10:00:00Z'), weekly);
  assert.equal(later.due, true, 'a late scheduler still sends within the same week');
  assert.equal(later.periodKey, at.periodKey, 'one key per week, so a late run cannot send twice');
  const nextWeek = getDigestSchedule(new Date('2026-10-26T00:30:00Z'), weekly);
  assert.notEqual(nextWeek.periodKey, at.periodKey);
  assert.equal(at.periodKey, '2026-W43');
});

test('local time follows the configured zone across daylight-saving changes', () => {
  const ny = { frequency: 'weekly', dayOfWeek: 1, hour: 9, timezone: 'America/New_York' };
  // Monday 9 March 2026 is the first Monday after the US switch to EDT (UTC-4).
  assert.equal(getDigestSchedule(new Date('2026-03-09T12:59:00Z'), ny).due, false); // 08:59 EDT
  assert.equal(getDigestSchedule(new Date('2026-03-09T13:00:00Z'), ny).due, true); // 09:00 EDT
  // Monday 2 March 2026 is still EST (UTC-5).
  assert.equal(getDigestSchedule(new Date('2026-03-02T13:30:00Z'), ny).due, false); // 08:30 EST
  assert.equal(getDigestSchedule(new Date('2026-03-02T14:00:00Z'), ny).due, true); // 09:00 EST
  const manila = getDigestSchedule(new Date('2026-03-09T13:00:00Z'), { ...ny, timezone: 'Asia/Manila' });
  assert.equal(manila.due, true, 'changing the timezone changes when the digest is due');
});

test('fortnightly and monthly periods', () => {
  const biweekly = { ...weekly, frequency: 'biweekly' };
  const odd = getDigestSchedule(new Date('2026-10-19T00:00:00Z'), biweekly); // ISO week 43
  const even = getDigestSchedule(new Date('2026-10-26T00:00:00Z'), biweekly); // ISO week 44
  assert.equal(odd.periodKey, even.periodKey, 'weeks 43 and 44 share one fortnight');
  const monthly = { ...weekly, frequency: 'monthly' };
  // First Monday of November 2026 is the 2nd.
  assert.equal(getDigestSchedule(new Date('2026-10-31T16:00:00Z'), monthly).periodKey, '2026-11'); // Nov 1 00:00 local
  assert.equal(getDigestSchedule(new Date('2026-10-31T16:00:00Z'), monthly).due, false);
  assert.equal(getDigestSchedule(new Date('2026-11-02T00:00:00Z'), monthly).due, true);
  assert.deepEqual(isoWeek(2026, 1, 1), { isoYear: 2026, week: 1 });
  assert.deepEqual(isoWeek(2027, 1, 1), { isoYear: 2026, week: 53 });
});

test('every event type has a deterministic dedupe key', () => {
  assert.equal(buildEventKey('ocr.review_digest', { periodKey: '2026-W43' }), 'ocr.review_digest:2026-W43');
  assert.equal(buildEventKey('ocr.training_failed', { jobId: 'j1' }), 'ocr.training_failed:j1');
  assert.equal(buildEventKey('ocr.model_activated', { registryVersion: 3 }), 'ocr.model_activated:3');
  assert.equal(buildEventKey('ocr.dataset_ready', { sinceJobId: '', threshold: 100 }), 'ocr.dataset_ready:none:100');
  assert.equal(buildEventKey('ocr.quality_regression', { platform: 'coros', periodKey: '2026-W43' }), 'ocr.quality_regression:coros:2026-W43');
  assert.equal(buildEventKey('nope', {}), '');
});

test('emails carry counts and admin links only, and say production is unchanged on failure', () => {
  process.env.APP_URL = 'https://hellorun.online';
  const digest = buildEmail('ocr.review_digest', { pendingSampleCount: 12, newEligibleSampleCount: 3, rawText: 'Juan Dela Cruz 5.02 km' });
  assert.equal(digest.subject, 'HelloRun OCR review reminder');
  assert.match(digest.paragraphs[0], /12 OCR samples awaiting review and 3 new approved/);
  assert.equal(digest.ctaHref, 'https://hellorun.online/admin/ocr-training/samples');
  assert.doesNotMatch(JSON.stringify(digest), /Juan|5\.02/);
  const failed = buildEmail('ocr.training_failed', { jobId: 'abc', errorCode: 'timeout' });
  assert.match(failed.paragraphs[0], /current production OCR model has not changed/);
  const ready = buildEmail('ocr.dataset_ready', { newEligibleSampleCount: 120, threshold: 100 });
  assert.match(ready.paragraphs[1], /Nothing starts automatically/);
});

test('research CSV cells cannot inject spreadsheet formulas', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('+1'), "'+1");
  assert.equal(csvCell('-2'), "'-2");
  assert.equal(csvCell('@SUM'), "'@SUM");
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell(0.25), '0.25');
  assert.equal(csvCell(null), '');
});

test('the research export never selects participant identifiers', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/services/ocr/ocr-analytics.service.js'), 'utf8');
  const exportSource = source.slice(source.indexOf('async function buildResearchExportCsv'));
  assert.doesNotMatch(exportSource, /runnerId|email|firstName|normalizedUrl|runLocation|eventId|proof\.key/);
  assert.match(exportSource, /shortHash\(model\._id\)/);
});

test('settings changes and research export need the full tier; reminders worker is flag-gated', () => {
  const routes = fs.readFileSync(path.join(ROOT, 'src/routes/admin-ocr-training.routes.js'), 'utf8');
  assert.match(routes, /router\.post\('\/settings', requireFullAdmin/);
  assert.match(routes, /'\/analytics\/research-export\.csv', requireFullAdmin, ocrExportLimiter/);
  const previous = process.env.OCR_REMINDERS_ENABLED;
  delete process.env.OCR_REMINDERS_ENABLED;
  assert.equal(startOcrMaintenanceWorker(), false);
  if (previous !== undefined) process.env.OCR_REMINDERS_ENABLED = previous;
  const server = fs.readFileSync(path.join(ROOT, 'src/server.js'), 'utf8');
  assert.match(server, /startOcrMaintenanceWorker\(\)/);
});

function render(name, locals) {
  const file = path.join(ROOT, 'src/views/admin/ocr-training', `${name}.ejs`);
  const source = fs.readFileSync(file, 'utf8').replace(/<%-\s*include\('\.\.\/\.\.\/layouts\/[^%]+%>/g, '');
  return ejs.render(source, { title: 't', message: null, flags: [], formatDateTime: String, csrfToken: 'tok', ...locals }, { filename: file });
}

test('analytics page reports N/A instead of invented numbers', () => {
  const html = render('analytics', {
    section: 'analytics', windows: [7, 30], canExport: false,
    analytics: { windowDays: 30, since: new Date(), metricRulesVersion: 'ocr-metrics-v1', extraction: [], entries: [], groundTruth: [], jobs: { extractionByStatus: {}, extractionFailures: [], training: [] }, models: [] }
  });
  assert.match(html, /No approved samples in this window, so no accuracy is reported/);
  assert.doesNotMatch(html, /research-export/);
  const withData = render('analytics', {
    section: 'analytics', windows: [30], canExport: true,
    analytics: { windowDays: 30, since: new Date(), metricRulesVersion: 'v', extraction: [{ platform: 'strava', total: 4, completeRate: 1, failedRate: 0, confirmed: 3, uncertain: 1, unknown: 0, latencyMedianMs: 900, latencyP95Ms: 'N/A' }], entries: [], groundTruth: [], jobs: { extractionByStatus: {}, extractionFailures: [], training: [] }, models: [] }
  });
  assert.match(withData, /100\.0%/);
  assert.match(withData, /0\.0%/);
  assert.match(withData, /research-export\.csv\?days=30/);
});

test('settings page disables editing for support admins and lists delivery history', () => {
  const settings = {
    notifications: { enabled: false, frequency: 'weekly', dayOfWeek: null, hour: null, timezone: 'Asia/Manila', minimumNewSamples: 100, eventTypes: ['ocr.review_digest'], recipientMode: 'all_admins', recipientUserIds: [], mutedUserIds: [] },
    dataset: { minApprovedSamples: 50, minTestSamples: 10, minValidationSamples: 5, minSamplesPerPlatform: 0, thresholdsApprovedByOwner: false },
    evaluation: { maxPlatformCerRegression: 0, minEvaluationSamplesPerPlatform: 5, gatesApprovedByOwner: false },
    retention: { sampleRetentionDays: 730 }, training: { maxIterations: 2000, timeoutMinutes: 240, cpuQuotaPercent: 100, memoryMaxMb: 2048, minFreeDiskMb: 5120 }
  };
  const common = { section: 'settings', settings, admins: [{ _id: 'a'.repeat(24), firstName: '<b>Ana</b>', email: 'a@example.test' }], schedule: { due: false, reason: 'schedule_not_set', periodKey: '' }, remindersFlag: false, eventTypeLabels: { 'ocr.review_digest': 'Digest' } };
  const support = render('settings', { ...common, deliveries: [], canEdit: false });
  assert.match(support, /Only a full administrator can change these settings/);
  assert.match(support, /<fieldset class="ocr-panel" disabled>/);
  assert.match(support, /choose a day and hour/);
  assert.doesNotMatch(support, /<b>Ana<\/b>/);
  const full = render('settings', { ...common, deliveries: [{ createdAt: new Date(), eventType: 'ocr.review_digest', status: 'sent', attempts: 1, sentAt: new Date(), errorCode: '' }], canEdit: true });
  assert.match(full, /Save settings/);
  assert.match(full, /ocr-pill-sent/);
});

test('the digest defaults to the owner-chosen Friday 16:00 Asia/Manila', () => {
  const OcrSettings = require('../src/models/OcrSettings');
  const defaults = new OcrSettings().notifications.toObject();
  assert.equal(defaults.dayOfWeek, 5);
  assert.equal(defaults.hour, 16);
  assert.equal(defaults.timezone, 'Asia/Manila');
  assert.equal(defaults.enabled, false, 'still off until an admin enables reminders');
  // Friday 2026-10-23 16:00 Manila = 08:00 UTC.
  assert.equal(getDigestSchedule(new Date('2026-10-23T07:59:00Z'), defaults).due, false);
  assert.equal(getDigestSchedule(new Date('2026-10-23T08:00:00Z'), defaults).due, true);
});
