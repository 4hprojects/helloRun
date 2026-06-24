// src/services/ranking.service.js
// Normalizes MongoDB leaderboard data into Supabase rankings and reporting tables

const crypto = require('crypto');
const logger = require('../utils/logger');
const { getPostgresClient } = require('../db/postgres');

/**
 * Normalize a single-activity leaderboard entry to rankings row
 * @param {Object} entry leaderboard entry from leaderboard.service
 * @param {number} rank position in leaderboard
 * @returns {Object} normalized ranking row
 */
function normalizeSingleActivityRanking(entry, rank) {
  return {
    mongo_submission_id: entry.submissionId,
    leaderboard_type: 'single_activity',
    rank_position: rank,
    race_distance: entry.raceDistance || '',
    participation_mode: entry.participationMode || 'virtual',
    elapsed_ms: entry.elapsedMs || 0,
    approved_distance_km: null,
    approved_activity_count: null,
    submitted_at: entry.submittedAt ? new Date(entry.submittedAt) : new Date()
  };
}

/**
 * Normalize an accumulated-activity leaderboard entry to rankings row
 * @param {Object} entry leaderboard entry from leaderboard.service
 * @param {number} rank position in leaderboard
 * @returns {Object} normalized ranking row
 */
function normalizeAccumulatedRanking(entry, rank) {
  return {
    mongo_submission_id: entry.submissionId,
    leaderboard_type: 'accumulated',
    rank_position: rank,
    race_distance: entry.raceDistance || '',
    participation_mode: entry.participationMode || 'virtual',
    elapsed_ms: null,
    approved_distance_km: entry.approvedDistanceKm || 0,
    approved_activity_count: entry.approvedActivityCount || 0,
    submitted_at: entry.submittedAt ? new Date(entry.submittedAt) : new Date()
  };
}

/**
 * Build stable checksum for ranking row
 * @param {Object} normalized normalized ranking object
 * @returns {string} SHA256 checksum
 */
function buildRankingChecksum(normalized) {
  const fields = [
    normalized.mongo_submission_id,
    normalized.leaderboard_type,
    normalized.rank_position,
    normalized.elapsed_ms,
    normalized.approved_distance_km,
    normalized.approved_activity_count
  ].join('|');
  return crypto.createHash('sha256').update(fields).digest('hex');
}

/**
 * Sync a leaderboard entry to Supabase rankings table
 * @param {Object} entry leaderboard entry with rank included
 * @param {Object} eventData event info { eventId, eventSlug }
 * @param {Object} runnerData runner info { runnerId }
 * @param {Object} options sync options { operation, sql }
 * @returns {Promise<Object>} synced ranking row
 */
async function syncRankingEntry(entry, eventData, runnerData, options = {}) {
  const sql = options.sql || getPostgresClient();
  const operation = options.operation || 'live_sync';

  try {
    // Normalize based on leaderboard type
    let normalized;
    if (entry.leaderboardType === 'accumulated') {
      normalized = normalizeAccumulatedRanking(entry, entry.rank);
    } else {
      normalized = normalizeSingleActivityRanking(entry, entry.rank);
    }

    const checksum = buildRankingChecksum(normalized);

    // Look up event and runner by event slug and runner ID
    const [eventRows, submissionRows] = await Promise.all([
      sql`
        SELECT id FROM events_core
        WHERE slug = ${eventData.eventSlug}
        LIMIT 1
      `,
      sql`
        SELECT runner_user_id FROM submissions_core
        WHERE mongo_submission_id = ${normalized.mongo_submission_id}
        LIMIT 1
      `
    ]);

    if (eventRows.length === 0) {
      throw new Error(`Event not found for slug ${eventData.eventSlug}`);
    }
    if (submissionRows.length === 0) {
      throw new Error(`Submission not found for mongo_submission_id ${normalized.mongo_submission_id}`);
    }

    const eventCoreId = eventRows[0].id;
    const runnerUserId = submissionRows[0].runner_user_id;

    // Upsert into rankings table
    const rankingResult = await sql`
      INSERT INTO rankings (
        mongo_submission_id, event_core_id, runner_user_id,
        leaderboard_type, rank_position, race_distance, participation_mode,
        elapsed_ms, approved_distance_km, approved_activity_count,
        submitted_at, calculated_at
      ) VALUES (
        ${normalized.mongo_submission_id},
        ${eventCoreId},
        ${runnerUserId},
        ${normalized.leaderboard_type},
        ${normalized.rank_position},
        ${normalized.race_distance},
        ${normalized.participation_mode},
        ${normalized.elapsed_ms},
        ${normalized.approved_distance_km},
        ${normalized.approved_activity_count},
        ${normalized.submitted_at},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (mongo_submission_id) DO UPDATE SET
        rank_position = EXCLUDED.rank_position,
        calculated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const rankingRow = rankingResult[0];

    // Log to migration_records
    await sql`
      INSERT INTO migration_records (
        phase, source_system, source_collection, source_id,
        target_system, target_table, target_id, operation, status, checksum, synced_at
      ) VALUES (
        'phase_6_rankings',
        'mongodb',
        'leaderboard_entries',
        ${normalized.mongo_submission_id},
        'supabase',
        'rankings',
        ${rankingRow.id},
        ${operation},
        'synced',
        ${checksum},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (source_system, source_collection, source_id, target_system, target_table)
      DO UPDATE SET status = 'synced', synced_at = CURRENT_TIMESTAMP
    `;

    return rankingRow;
  } catch (error) {
    logger.error('Ranking sync error:', error.message);
    throw error;
  }
}

/**
 * Publish (make visible) rankings for an event/leaderboard combination
 * @param {Object} filter { eventSlug?, leaderboardType? }
 * @param {Object} options { sql? }
 * @returns {Promise<number>} count of published rankings
 */
async function publishRankings(filter = {}, options = {}) {
  const sql = options.sql || getPostgresClient();

  try {
    let query = 'UPDATE rankings SET published_at = CURRENT_TIMESTAMP WHERE published_at IS NULL';
    const params = [];

    if (filter.eventSlug) {
      query += ` AND event_core_id IN (SELECT id FROM events_core WHERE slug = $${params.length + 1})`;
      params.push(filter.eventSlug);
    }

    if (filter.leaderboardType) {
      query += ` AND leaderboard_type = $${params.length + 1}`;
      params.push(filter.leaderboardType);
    }

    query += ' RETURNING id';

    // Use template literal for safe query construction
    const result = await sql.unsafe(query, params);
    if (result.length) {
      await evaluatePublishedRankingAchievementsSafe({
        rankingIds: result.map((row) => row.id)
      }, options);
    }
    return result.length;
  } catch (error) {
    logger.error('Ranking publish error:', error.message);
    throw error;
  }
}

async function evaluatePublishedRankingAchievementsSafe(input = {}, options = {}) {
  try {
    const { evaluatePublishedRankingAchievements } = require('./achievement.service');
    return await evaluatePublishedRankingAchievements(input, options);
  } catch (error) {
    logger.error('Ranking achievement evaluation failed:', error.message);
    return [];
  }
}

/**
 * Get current ranking for a specific submission
 * @param {string} mongoSubmissionId MongoDB submission ID
 * @param {Object} options { sql? }
 * @returns {Promise<Object|null>} ranking row or null
 */
async function getRankingForSubmission(mongoSubmissionId, options = {}) {
  const sql = options.sql || getPostgresClient();

  try {
    const result = await sql`
      SELECT * FROM rankings
      WHERE mongo_submission_id = ${mongoSubmissionId}
      AND published_at IS NOT NULL
      LIMIT 1
    `;

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    logger.error('Get ranking error:', error.message);
    return null;
  }
}

/**
 * Get event leaderboard from Supabase
 * @param {string} eventSlug event slug
 * @param {Object} filter { leaderboardType?, raceDistance?, participationMode? }
 * @param {Object} options { limit?, sql? }
 * @returns {Promise<Array>} ranked entries
 */
async function getEventLeaderboard(eventSlug, filter = {}, options = {}) {
  const sql = options.sql || getPostgresClient();
  const limit = Math.min(Number.isFinite(Number(options.limit)) ? Number(options.limit) : 100, 500);

  try {
    const safeSlug = String(eventSlug || '');
    const leaderboardType = filter.leaderboardType ? String(filter.leaderboardType) : null;
    const raceDistance = filter.raceDistance ? String(filter.raceDistance) : null;
    const participationMode = filter.participationMode ? String(filter.participationMode) : null;

    const result = await sql`
      SELECT r.*, e.title AS event_title
      FROM rankings r
      JOIN events_core e ON r.event_core_id = e.id
      WHERE e.slug = ${safeSlug}
        AND r.published_at IS NOT NULL
        AND (${leaderboardType} IS NULL OR r.leaderboard_type = ${leaderboardType})
        AND (${raceDistance} IS NULL OR r.race_distance = ${raceDistance})
        AND (${participationMode} IS NULL OR r.participation_mode = ${participationMode})
      ORDER BY r.rank_position ASC
      LIMIT ${limit}
    `;
    return result;
  } catch (error) {
    logger.error('Get event leaderboard error:', error.message);
    return [];
  }
}

/**
 * Get runner certification count from materialized view
 * @param {string} appUserId Supabase app_users ID
 * @param {Object} options { sql? }
 * @returns {Promise<Object>} certification counts
 */
async function getRunnerCertifications(appUserId, options = {}) {
  const sql = options.sql || getPostgresClient();

  try {
    const result = await sql`
      SELECT * FROM v_runner_certifications
      WHERE runner_user_id = ${appUserId}
      LIMIT 1
    `;

    return result.length > 0 ? result[0] : {
      runner_user_id: appUserId,
      finisher_count: 0,
      personal_record_count: 0,
      total_certificates: 0,
      most_recent_certificate_at: null
    };
  } catch (error) {
    logger.error('Get runner certifications error:', error.message);
    return null;
  }
}

module.exports = {
  normalizeSingleActivityRanking,
  normalizeAccumulatedRanking,
  buildRankingChecksum,
  syncRankingEntry,
  publishRankings,
  getRankingForSubmission,
  getEventLeaderboard,
  getRunnerCertifications
};
