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
    // Onsite-only, matching the check-in console and the completion estimate.
    const result = await sql`
      SELECT
        COUNT(*)::int as total_registrations,
        COUNT(CASE WHEN ci.check_in_status = 'checked_in' THEN 1 END)::int as checked_in_count,
        COUNT(CASE WHEN ci.check_in_status = 'no_show' THEN 1 END)::int as no_show_count,
        COUNT(CASE WHEN ci.check_in_status = 'deferred' THEN 1 END)::int as deferred_count,
        COUNT(CASE WHEN ci.check_in_status IS NULL THEN 1 END)::int as pending_count,
        MAX(ci.checked_in_at) as last_checkin
      FROM registrations r
      LEFT JOIN check_ins ci ON r.id = ci.registration_id
      LEFT JOIN events_core e ON r.event_core_id = e.id
      WHERE e.mongo_event_id = ${eventId}
        AND r.participation_mode = 'onsite'
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
        last_checkin: null
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
    // make_interval takes a bound parameter. An INTERVAL '...' literal cannot:
    // the placeholder would sit inside the string and Postgres would reject it.
    const result = await sql`
      SELECT
        COUNT(*)::int as check_in_count
      FROM check_ins ci
      LEFT JOIN events_core e ON ci.event_core_id = e.id
      WHERE e.mongo_event_id = ${eventId}
        AND ci.checked_in_at > CURRENT_TIMESTAMP - make_interval(mins => ${windowMinutes})
    `;

    const checkInCount = result[0]?.check_in_count || 0;

    return {
      success: true,
      window_minutes: windowMinutes,
      check_in_count: checkInCount,
      check_ins_per_minute: (checkInCount / windowMinutes).toFixed(2)
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
    // Scoped to onsite registrations so the board agrees with the check-in console,
    // which also counts only onsite participants.
    const totalRows = await sql`
      SELECT COUNT(*)::int as total FROM registrations r
      JOIN events_core e ON r.event_core_id = e.id
      WHERE e.mongo_event_id = ${eventId}
        AND r.participation_mode = 'onsite'
    `;
    const totalExpected = totalRows[0]?.total || 0;

    const checkedRows = await sql`
      SELECT COUNT(*)::int as checked_in FROM check_ins ci
      JOIN events_core e ON ci.event_core_id = e.id
      WHERE e.mongo_event_id = ${eventId} AND ci.check_in_status = 'checked_in'
    `;
    const checkedIn = checkedRows[0]?.checked_in || 0;

    const velocityWindowMinutes = 5;
    const velocityRows = await sql`
      SELECT COUNT(*)::int as recent_count
      FROM check_ins ci
      JOIN events_core e ON ci.event_core_id = e.id
      WHERE e.mongo_event_id = ${eventId}
        AND ci.checked_in_at > CURRENT_TIMESTAMP - make_interval(mins => ${velocityWindowMinutes})
    `;
    const recentCount = velocityRows[0]?.recent_count || 0;
    const checkInsPerMinute = recentCount / velocityWindowMinutes;

    const remaining = Math.max(totalExpected - checkedIn, 0);

    // With no recent arrivals there is no basis for an estimate. Reporting null is
    // honest; the previous code defaulted the window to one arrival and produced a
    // confident-looking completion time out of nothing.
    const canEstimate = checkInsPerMinute > 0 && remaining > 0;
    const estimatedMinutesRemaining = canEstimate ? Math.ceil(remaining / checkInsPerMinute) : null;

    return {
      success: true,
      total_expected: totalExpected,
      checked_in: checkedIn,
      remaining,
      percentage_complete: totalExpected > 0 ? ((checkedIn / totalExpected) * 100).toFixed(1) : '0.0',
      check_ins_per_minute: checkInsPerMinute.toFixed(2),
      estimated_minutes_remaining: estimatedMinutesRemaining,
      estimated_completion_time: estimatedMinutesRemaining === null
        ? null
        : new Date(Date.now() + estimatedMinutesRemaining * 60000).toISOString()
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
