// tests/ranking.service.test.js
// Unit tests for ranking service

const test = require('node:test');
const assert = require('node:assert');
const {
  normalizeSingleActivityRanking,
  normalizeAccumulatedRanking,
  buildRankingChecksum
} = require('../src/services/ranking.service');

test('Ranking Service - normalizeSingleActivityRanking maps entry correctly', async (t) => {
  const entry = {
    submissionId: 'sub_123',
    raceDistance: '5km',
    participationMode: 'virtual',
    elapsedMs: 1800000,
    submittedAt: new Date('2026-05-17T10:00:00Z'),
    leaderboardType: 'single_activity'
  };

  const normalized = normalizeSingleActivityRanking(entry, 5);

  assert.strictEqual(normalized.mongo_submission_id, 'sub_123');
  assert.strictEqual(normalized.leaderboard_type, 'single_activity');
  assert.strictEqual(normalized.rank_position, 5);
  assert.strictEqual(normalized.race_distance, '5km');
  assert.strictEqual(normalized.participation_mode, 'virtual');
  assert.strictEqual(normalized.elapsed_ms, 1800000);
  assert.strictEqual(normalized.approved_distance_km, null);
  assert.strictEqual(normalized.approved_activity_count, null);
});

test('Ranking Service - normalizeAccumulatedRanking maps entry correctly', async (t) => {
  const entry = {
    submissionId: 'accum_456',
    raceDistance: '50km',
    participationMode: 'virtual',
    approvedDistanceKm: 50.5,
    approvedActivityCount: 12,
    submittedAt: new Date('2026-05-17T10:00:00Z'),
    leaderboardType: 'accumulated'
  };

  const normalized = normalizeAccumulatedRanking(entry, 3);

  assert.strictEqual(normalized.mongo_submission_id, 'accum_456');
  assert.strictEqual(normalized.leaderboard_type, 'accumulated');
  assert.strictEqual(normalized.rank_position, 3);
  assert.strictEqual(normalized.race_distance, '50km');
  assert.strictEqual(normalized.participation_mode, 'virtual');
  assert.strictEqual(normalized.elapsed_ms, null);
  assert.strictEqual(normalized.approved_distance_km, 50.5);
  assert.strictEqual(normalized.approved_activity_count, 12);
});

test('Ranking Service - buildRankingChecksum generates stable hash', async (t) => {
  const normalized = {
    mongo_submission_id: 'sub_123',
    leaderboard_type: 'single_activity',
    rank_position: 1,
    elapsed_ms: 1800000,
    approved_distance_km: null,
    approved_activity_count: null
  };

  const checksum1 = buildRankingChecksum(normalized);
  const checksum2 = buildRankingChecksum(normalized);

  assert.strictEqual(checksum1, checksum2, 'Checksums should be stable');
  assert.strictEqual(typeof checksum1, 'string', 'Checksum should be a string');
  assert(checksum1.length === 64, 'SHA256 checksum should be 64 chars');
});

test('Ranking Service - checksum changes when rank changes', async (t) => {
  const base = {
    mongo_submission_id: 'sub_123',
    leaderboard_type: 'single_activity',
    elapsed_ms: 1800000,
    approved_distance_km: null,
    approved_activity_count: null
  };

  const normalized1 = { ...base, rank_position: 1 };
  const normalized2 = { ...base, rank_position: 2 };

  const checksum1 = buildRankingChecksum(normalized1);
  const checksum2 = buildRankingChecksum(normalized2);

  assert.notStrictEqual(checksum1, checksum2, 'Checksums should differ when rank changes');
});

test('Ranking Service - checksum unaffected by rank_position order', async (t) => {
  // Both have different positions but should show different checksums
  const rank1 = {
    mongo_submission_id: 'sub_123',
    leaderboard_type: 'single_activity',
    rank_position: 1,
    elapsed_ms: 1800000,
    approved_distance_km: null,
    approved_activity_count: null
  };

  const rank5 = {
    mongo_submission_id: 'sub_123',
    leaderboard_type: 'single_activity',
    rank_position: 5,
    elapsed_ms: 1800000,
    approved_distance_km: null,
    approved_activity_count: null
  };

  const checksum1 = buildRankingChecksum(rank1);
  const checksum5 = buildRankingChecksum(rank5);

  assert.notStrictEqual(checksum1, checksum5, 'Different ranks should produce different checksums');
});

test('Ranking Service - handles missing optional fields', async (t) => {
  const entry = {
    submissionId: 'sub_789',
    // Missing raceDistance, participationMode
    elapsedMs: 2000000,
    // Missing submittedAt
    leaderboardType: 'single_activity'
  };

  const normalized = normalizeSingleActivityRanking(entry, 10);

  assert.strictEqual(normalized.race_distance, '');
  assert.strictEqual(normalized.participation_mode, 'virtual');
  assert.ok(normalized.submitted_at instanceof Date);
});
