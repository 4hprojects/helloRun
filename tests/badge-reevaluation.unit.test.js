'use strict';

// DB-free tests for badge re-evaluation after an organizer corrects an approved entry.
//
// The Postgres client is injected into these services, so a fake tagged-template `sql`
// stands in for it and records every statement. That exercises the revoke / restore
// decisions and the SQL guards (source, status, marker reason) without a database.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://fake/not-used';

const {
  reconcileRankBadgesForRunner,
  RANK_UNMET_REVOKE_REASON
} = require('../src/services/achievement.service');
const {
  revokeUnmetGlobalDistanceBadges,
  awardCompletedGlobalDistanceBadges,
  GLOBAL_DISTANCE_UNMET_REVOKE_REASON
} = require('../src/services/badge-progress.service');

// Minimal tagged-template stand-in. Handlers are tried in order against the statement text;
// anything unmatched returns no rows.
function makeSql(handlers = []) {
  const calls = [];
  const sql = (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    calls.push({ text, values });
    for (const [pattern, respond] of handlers) {
      if (pattern.test(text)) return Promise.resolve(respond(values, text));
    }
    return Promise.resolve([]);
  };
  sql.calls = calls;
  sql.find = (pattern) => calls.filter((call) => pattern.test(call.text));
  return sql;
}

const rankBadge = (overrides = {}) => ({
  id: 'ub-1',
  badge_definition_id: 'bd-1',
  verification_status: 'verified',
  requirement_type: 'rank_achieved',
  requirement_value: { rank: 3, leaderboardType: 'single_activity', raceDistance: '10K', mode: 'virtual' },
  ...overrides
});

const ranking = (rankPosition, overrides = {}) => ({
  id: 'r-1',
  rank_position: rankPosition,
  leaderboard_type: 'single_activity',
  race_distance: '10K',
  participation_mode: 'virtual',
  ...overrides
});

function rankSql({ badges, rankings }) {
  return makeSql([
    [/FROM app_users/, () => [{ id: 'runner-1' }]],
    [/FROM events_core/, () => [{ id: 'event-core-1' }]],
    [/FROM user_badges ub JOIN badge_definitions/, () => badges],
    [/FROM rankings/, () => rankings],
    [/SET verification_status = 'revoked'/, () => [{ id: 'ub-1', badge_definition_id: 'bd-1', event_core_id: 'event-core-1', runner_user_id: 'runner-1' }]],
    [/SET verification_status = 'verified'/, () => [{ id: 'ub-1' }]]
  ]);
}

const input = { mongoUserId: 'mongo-user', mongoEventId: 'mongo-event', performedBy: null };

test('a rank badge is revoked when the corrected time no longer earns the rank', async () => {
  const sql = rankSql({ badges: [rankBadge()], rankings: [ranking(5)] });
  const result = await reconcileRankBadgesForRunner(input, { sql });
  assert.equal(result.revoked.length, 1);
  assert.equal(result.restored.length, 0);
  const update = sql.find(/SET verification_status = 'revoked'/)[0];
  assert.ok(update, 'expected a revoking UPDATE');
  assert.ok(update.values.includes(RANK_UNMET_REVOKE_REASON), 'revoked with the marker reason');
});

test('a rank badge is kept while the runner still meets the rank', async () => {
  const sql = rankSql({ badges: [rankBadge()], rankings: [ranking(2)] });
  const result = await reconcileRankBadgesForRunner(input, { sql });
  assert.deepEqual([result.revoked.length, result.restored.length], [0, 0]);
  assert.equal(sql.find(/UPDATE user_badges/).length, 0);
});

test('a badge for a different category is judged against that category only', async () => {
  // Rank 1 in the 5K does not satisfy a 10K badge, so it is revoked.
  const sql = rankSql({ badges: [rankBadge()], rankings: [ranking(1, { race_distance: '5K' })] });
  assert.equal((await reconcileRankBadgesForRunner(input, { sql })).revoked.length, 1);
});

test('nothing is revoked when the runner has no published ranking to judge against', async () => {
  const sql = rankSql({ badges: [rankBadge()], rankings: [] });
  const result = await reconcileRankBadgesForRunner(input, { sql });
  assert.deepEqual([result.revoked.length, result.restored.length], [0, 0]);
  assert.equal(sql.find(/UPDATE user_badges/).length, 0);
});

test('a badge withdrawn by an earlier correction is restored once the rank is met again', async () => {
  const sql = rankSql({ badges: [rankBadge({ verification_status: 'revoked' })], rankings: [ranking(1)] });
  const result = await reconcileRankBadgesForRunner(input, { sql });
  assert.equal(result.restored.length, 1);
  assert.equal(result.revoked.length, 0);
  const restore = sql.find(/SET verification_status = 'verified'/)[0];
  assert.match(restore.text, /revoke_reason = \?/, 'restore is guarded by the exact marker reason');
  assert.ok(restore.values.includes(RANK_UNMET_REVOKE_REASON));
});

test('only auto-awarded badges are ever considered, so a deliberate admin revocation stays permanent', async () => {
  const sql = rankSql({ badges: [], rankings: [ranking(9)] });
  await reconcileRankBadgesForRunner(input, { sql });
  const select = sql.find(/FROM user_badges ub JOIN badge_definitions/)[0];
  assert.match(select.text, /ub\.source = 'system_auto_award'/);
  assert.match(select.text, /ub\.verification_status = 'revoked' AND ub\.revoke_reason = \?/);
});

test('an event with no core row is a no-op', async () => {
  // An unknown runner would fall back to a MongoDB lookup, which a DB-free test avoids.
  const sql = makeSql([[/FROM app_users/, () => [{ id: 'runner-1' }]], [/FROM events_core/, () => []]]);
  assert.deepEqual(await reconcileRankBadgesForRunner(input, { sql }), { revoked: [], restored: [] });
  assert.equal(sql.find(/user_badges/).length, 0);
});

const globalBadges = [
  { id: 'g-10', requirement_type: 'global_distance', requirement_value: { distanceKm: 10 } },
  { id: 'g-50', requirement_type: 'global_distance', requirement_value: { distanceKm: 50 } },
  { id: 'g-100', requirement_type: 'global_distance', requirement_value: { distanceKm: 100 } }
];
const globalContext = (currentValue) => ({ runnerUserId: 'runner-1', mongoUserId: 'mongo-user', currentValue, approvedDistanceKm: currentValue });

test('lifetime milestones the corrected total no longer reaches are revoked, and only those', async () => {
  const sql = makeSql([
    [/FROM badge_definitions/, () => globalBadges],
    [/SET verification_status = 'revoked'/, () => [{ id: 'ub-50', badge_definition_id: 'g-50' }, { id: 'ub-100', badge_definition_id: 'g-100' }]]
  ]);
  const revoked = await revokeUnmetGlobalDistanceBadges(globalContext(20), { sql });
  assert.equal(revoked.length, 2);
  const update = sql.find(/SET verification_status = 'revoked'/)[0];
  assert.deepEqual(update.values.find(Array.isArray), ['g-50', 'g-100']);
  assert.ok(update.values.includes(GLOBAL_DISTANCE_UNMET_REVOKE_REASON));
  assert.match(update.text, /event_core_id IS NULL/);
  assert.match(update.text, /verification_status = 'verified' AND source = 'system_auto_award'/);
  assert.equal(sql.find(/INSERT INTO badge_audit_logs/).length, 2, 'each revocation is audit-logged');
});

test('no milestone is revoked while the total still reaches all of them', async () => {
  const sql = makeSql([[/FROM badge_definitions/, () => globalBadges]]);
  assert.deepEqual(await revokeUnmetGlobalDistanceBadges(globalContext(150), { sql }), []);
  assert.equal(sql.find(/UPDATE user_badges/).length, 0);
});

test('a milestone withdrawn by a correction is restored, not re-inserted, when the total reaches it again', async () => {
  const sql = makeSql([
    [/FROM badge_definitions/, () => [globalBadges[0]]],
    [/SET verification_status = 'verified'/, () => [{ id: 'ub-10' }]]
  ]);
  const awarded = await awardCompletedGlobalDistanceBadges(globalContext(20), { sql });
  assert.deepEqual(awarded, [{ id: 'ub-10' }]);
  const restore = sql.find(/SET verification_status = 'verified'/)[0];
  assert.ok(restore.values.includes(GLOBAL_DISTANCE_UNMET_REVOKE_REASON));
  assert.equal(sql.find(/INSERT INTO user_badges/).length, 0, 'restored rather than re-awarded');
});

test('an admin-revoked milestone is still never restored or re-awarded', async () => {
  const sql = makeSql([
    [/FROM badge_definitions/, () => [globalBadges[0]]],
    [/SET verification_status = 'verified'/, () => []],
    [/AND verification_status = 'revoked' LIMIT 1/, () => [{ id: 'admin-revoked' }]]
  ]);
  assert.deepEqual(await awardCompletedGlobalDistanceBadges(globalContext(20), { sql }), []);
  assert.equal(sql.find(/INSERT INTO user_badges/).length, 0);
});

test('distance milestone revocation is opt-in, so ordinary review flows never start revoking', () => {
  const source = read('src/services/badge-progress.service.js');
  assert.match(source, /options\.revokeUnmet\s*\?\s*await revokeUnmetGlobalDistanceBadges/);
  for (const file of ['src/services/submission.service.js', 'src/services/accumulated-activity.service.js']) {
    assert.doesNotMatch(read(file), /revokeUnmet/, file);
  }
});

test('the correction service re-evaluates value-dependent badges for approved entries only', () => {
  const source = read('src/services/submission-correction.service.js');
  assert.match(source, /refreshGlobalDistanceMilestoneProgress\(runnerId, \{ performedBy: actorUserId, revokeUnmet: true \}\)/);
  assert.match(source, /changed\('distanceKm'\) && !record\.isPersonalRecord/);
  // Rank badges are judged only after the re-rank has finished.
  assert.match(source, /ranking = syncEventRankingsInBackground\(record, event\.slug\)/);
  assert.match(source, /Promise\.resolve\(ranking\)\s*\.then\(\(\) => reconcileRankBadgesForRunner\(/);
  assert.match(source, /submissionKind === 'standard' && changed\('elapsedMs'\)/);
  // Per-entry badges cannot be affected by these values; the comment records why.
  assert.match(source, /never on its distance, time or date/);
  assert.match(source, /if \(record\.status === 'approved'\) \{\s*certificateRegenerated = await applyApprovedEntryEffects/);
});

test('a corrected finish time reaches the published ranking row, and the re-rank can be awaited', () => {
  assert.match(read('src/services/ranking.service.js'), /rank_position = EXCLUDED\.rank_position,[\s\S]*?elapsed_ms = EXCLUDED\.elapsed_ms,/);
  const submission = read('src/services/submission.service.js');
  assert.match(submission, /function syncEventRankingsInBackground\(submission, eventSlug\) \{\s*if \(disableSubmissionSyncBackgroundTasks\) return Promise\.resolve\(\);/);
  assert.match(submission, /return \(async \(\) => \{\s*try \{\s*const allApproved/);
});
