'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('historical remediation defaults to dry-run and requires an explicit apply flag', () => {
  const { parseArguments, assertApplyApproval, RECOVERY_WINDOW_MS } = require('../src/scripts/remediate-strava-data');

  assert.deepEqual(parseArguments([]), { mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--dry-run']), { mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--apply']), { mode: 'apply' });
  assert.throws(() => parseArguments(['--apply', '--dry-run']), /Choose --dry-run or --apply/);
  assert.throws(() => parseArguments(['--production']), /Unknown argument/);
  assert.equal(RECOVERY_WINDOW_MS, 30 * 24 * 60 * 60 * 1000);
  assert.throws(() => assertApplyApproval({ standardRecords: 1, accumulatedRecords: 1 }), /reviewing the dry-run report/);
});

test('normal submission models exclude Strava-origin records unless explicitly bypassed', () => {
  const scope = read('src/utils/restricted-provider-scope.js');
  const standard = read('src/models/Submission.js');
  const accumulated = read('src/models/AccumulatedActivitySubmission.js');

  assert.match(scope, /source: \{ \$ne: 'strava' \}/);
  assert.match(scope, /includeRestrictedProviderData/);
  assert.match(scope, /schema\.pre\('aggregate'/);
  assert.match(standard, /applyRestrictedProviderScope\(submissionSchema\)/);
  assert.match(accumulated, /applyRestrictedProviderScope\(accumulatedActivitySubmissionSchema\)/);
});

test('manual recovery is one-time, owner-bound, expiring, and can override a closed window', () => {
  const submission = read('src/services/submission.service.js');
  const accumulated = read('src/services/accumulated-activity.service.js');
  const grant = read('src/models/SubmissionRemediationGrant.js');

  assert.match(submission, /userId: runnerId,[\s\S]*registrationId: registration\._id,[\s\S]*slotsRemaining: 1,[\s\S]*expiresAt: \{ \$gt: new Date\(\) \}/);
  assert.match(submission, /!isSubmissionWindowOpen\(\{ registration, event \}\) && !recoveryGrant/);
  assert.match(submission, /claimRemediationGrant\(registration\._remediationGrantId\)/);
  assert.match(submission, /releaseRemediationGrant\(claimedGrant\?\._id\)/);
  assert.match(accumulated, /claimRemediationGrant\(registration\._remediationGrantId\)/);
  assert.match(grant, /slotsRemaining: \{ type: Number, default: 1, min: 0, max: 1 \}/);
});

test('service-level gates prevent Strava-derived writes outside the HTTP route', () => {
  const submission = read('src/services/submission.service.js');
  const accumulated = read('src/services/accumulated-activity.service.js');

  assert.match(submission, /assertPermittedSubmissionSource\(source\)/);
  assert.match(submission, /error\.code = 'external_use_blocked'/);
  assert.match(accumulated, /assertPermittedSubmissionSource\(input\.source\)/);
});

test('remediation receipts retain HelloRun identifiers without provider identifiers or metrics', () => {
  const receipt = read('src/models/StravaRemediationReceipt.js');
  const migration = read('src/scripts/remediate-strava-data.js');

  assert.match(receipt, /sourceRecordId/);
  assert.match(receipt, /registrationId/);
  assert.match(receipt, /eventId/);
  assert.doesNotMatch(receipt, /stravaAthleteId|stravaActivityId|distanceKm|elapsedMs|activityMetrics/);
  assert.match(migration, /resumeInterruptedReceipts/);
  assert.match(migration, /DELETE FROM certificates/);
  assert.match(migration, /DELETE FROM rankings/);
  assert.match(migration, /DELETE FROM submissions_core/);
  assert.match(migration, /deleteObjects/);
});

test('documented environment template contains sanitized Strava configuration names', () => {
  const example = read('.env.example');
  for (const name of [
    'STRAVA_CLIENT_ID',
    'STRAVA_CLIENT_SECRET',
    'STRAVA_REDIRECT_URI',
    'STRAVA_ENCRYPTION_KEY',
    'STRAVA_WEBHOOK_VERIFY_TOKEN'
  ]) assert.match(example, new RegExp(`^${name}=`, 'm'));
});
