// src/services/realtime-checkin.service.js
// Real-time check-in dashboard support

const { getPostgresClient } = require('../db/postgres');
const EventEmitter = require('events');

// Global event emitter for real-time updates
const checkInEmitter = new EventEmitter();

/**
 * Get check-in summary for event in real-time
 * Returns aggregated stats: total checked in, no-show count, pending, etc.
 */
async function getRealtimeCheckInSummary(eventId) {
  const sql = getPostgresClient();

  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_registrations,
        COUNT(CASE WHEN ci.check_in_status = 'checked_in' THEN 1 END) as checked_in_count,
        COUNT(CASE WHEN ci.check_in_status = 'no_show' THEN 1 END) as no_show_count,
        COUNT(CASE WHEN ci.check_in_status = 'deferred' THEN 1 END) as deferred_count,
        COUNT(CASE WHEN ci.check_in_status IS NULL THEN 1 END) as pending_count,
        MAX(ci.checked_in_at) as last_checkin,
        COUNT(DISTINCT ci.participation_mode) as participation_modes
      FROM registrations r
      LEFT JOIN check_ins ci ON r.id = ci.registration_id
      LEFT JOIN events_core e ON r.event_core_id = e.id
      WHERE e.mongo_event_id = ${eventId}
    `;

    return {
      success: true,
      timestamp: new Date().toISOString(),
      summary: result[0] || {
        total_registrations: 0,
        checked_in_count: 0,
        no_show_count: 0,
        deferred_count: 0,
        pending_count: 0,
        last_checkin: null,
        participation_modes: 0
      }
    };
  } catch (error) {
    throw new Error(`Failed to get check-in summary: ${error.message}`);
  }
}

/**
 * Get recent check-ins (last N)
 */
async function getRecentCheckIns(eventId, limit = 20) {
  const sql = getPostgresClient();

  try {
    const result = await sql`
      SELECT 
        ci.id,
        ci.mongo_check_in_id,
        ba.bib_number,
        ci.check_in_status,
        ci.participation_mode,
        ci.verification_method,
        ci.checked_in_at,
        r.participant_first_name,
        r.participant_last_name
      FROM check_ins ci
      LEFT JOIN bib_assignments ba ON ci.bib_assignment_id = ba.id
      LEFT JOIN registrations r ON ci.registration_id = r.id
      LEFT JOIN events_core e ON ci.event_core_id = e.id
      WHERE e.mongo_event_id = ${eventId}
      ORDER BY ci.checked_in_at DESC NULLS LAST
      LIMIT ${limit}
    `;

    return {
      success: true,
      count: result.length,
      checkIns: result
    };
  } catch (error) {
    throw new Error(`Failed to get recent check-ins: ${error.message}`);
  }
}

/**
 * Get check-in by participation mode
 */
async function getCheckInsByMode(eventId) {
  const sql = getPostgresClient();

  try {
    const result = await sql`
      SELECT 
        ci.participation_mode,
        ci.check_in_status,
        COUNT(*) as count
      FROM check_ins ci
      LEFT JOIN events_core e ON ci.event_core_id = e.id
      WHERE e.mongo_event_id = ${eventId}
      GROUP BY ci.participation_mode, ci.check_in_status
      ORDER BY ci.participation_mode, ci.check_in_status
    `;

    const grouped = {};
    for (const row of result) {
      if (!grouped[row.participation_mode]) {
        grouped[row.participation_mode] = {};
      }
      grouped[row.participation_mode][row.check_in_status] = row.count;
    }

    return {
      success: true,
      byMode: grouped
    };
  } catch (error) {
    throw new Error(`Failed to get check-ins by mode: ${error.message}`);
  }
}

/**
 * Broadcast check-in update to all connected clients
 * Used by server to emit real-time updates via polling or WebSocket
 */
function broadcastCheckInUpdate(eventId, checkIn) {
  checkInEmitter.emit(`event:${eventId}:check-in`, {
    timestamp: new Date().toISOString(),
    eventId,
    checkIn
  });
}

/**
 * Subscribe to check-in updates for an event
 */
function subscribeToCheckIns(eventId, callback) {
  const listener = (data) => callback(data);
  checkInEmitter.on(`event:${eventId}:check-in`, listener);

  // Return unsubscribe function
  return () => {
    checkInEmitter.off(`event:${eventId}:check-in`, listener);
  };
}

/**
 * Get check-in velocity (check-ins per minute)
 */
async function getCheckInVelocity(eventId, windowMinutes = 5) {
  const sql = getPostgresClient();

  try {
    const result = await sql`
      SELECT 
        COUNT(*) as check_in_count,
        COUNT(*) / ${windowMinutes} as per_minute
      FROM check_ins ci
      LEFT JOIN events_core e ON ci.event_core_id = e.id
      WHERE e.mongo_event_id = ${eventId}
        AND ci.checked_in_at > CURRENT_TIMESTAMP - INTERVAL '${windowMinutes} minutes'
    `;

    return {
      success: true,
      window_minutes: windowMinutes,
      check_in_count: result[0]?.check_in_count || 0,
      check_ins_per_minute: parseFloat(result[0]?.per_minute || 0).toFixed(2)
    };
  } catch (error) {
    throw new Error(`Failed to get check-in velocity: ${error.message}`);
  }
}

/**
 * Get estimated arrival time based on check-in pace
 */
async function estimateCheckInCompletion(eventId) {
  const sql = getPostgresClient();

  try {
    // Get total registered
    const totalRows = await sql`
      SELECT COUNT(*) as total FROM registrations r
      JOIN events_core e ON r.event_core_id = e.id
      WHERE e.mongo_event_id = ${eventId}
    `;
    const totalExpected = totalRows[0]?.total || 0;

    // Get current checked-in
    const checkedRows = await sql`
      SELECT COUNT(*) as checked_in FROM check_ins ci
      JOIN events_core e ON ci.event_core_id = e.id
      WHERE e.mongo_event_id = ${eventId} AND ci.check_in_status = 'checked_in'
    `;
    const checkedIn = checkedRows[0]?.checked_in || 0;

    // Get check-in velocity (last 5 minutes)
    const velocityRows = await sql`
      SELECT COUNT(*) as recent_count
      FROM check_ins ci
      JOIN events_core e ON ci.event_core_id = e.id
      WHERE e.mongo_event_id = ${eventId}
        AND ci.checked_in_at > CURRENT_TIMESTAMP - INTERVAL '5 minutes'
    `;
    const recentCount = velocityRows[0]?.recent_count || 1;
    const checkInsPerMinute = recentCount / 5 || 0.1; // Avoid division by zero

    // Estimate remaining time
    const remaining = totalExpected - checkedIn;
    const estimatedMinutesRemaining = checkInsPerMinute > 0 ? remaining / checkInsPerMinute : 0;

    return {
      success: true,
      total_expected: totalExpected,
      checked_in: checkedIn,
      remaining: remaining,
      percentage_complete: totalExpected > 0 ? ((checkedIn / totalExpected) * 100).toFixed(1) : 0,
      check_ins_per_minute: parseFloat(checkInsPerMinute).toFixed(2),
      estimated_minutes_remaining: Math.ceil(estimatedMinutesRemaining),
      estimated_completion_time: new Date(Date.now() + estimatedMinutesRemaining * 60000).toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to estimate completion: ${error.message}`);
  }
}

module.exports = {
  getRealtimeCheckInSummary,
  getRecentCheckIns,
  getCheckInsByMode,
  broadcastCheckInUpdate,
  subscribeToCheckIns,
  getCheckInVelocity,
  estimateCheckInCompletion,
  checkInEmitter
};
