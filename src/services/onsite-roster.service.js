// src/services/onsite-roster.service.js
// Shared read model for the organiser onsite pages: check-in, bib assignment, and
// race-kit release.
//
// MongoDB is the system of record for who registered; the Phase 7 onsite tables in
// Postgres hold bib, kit and check-in state. This service joins the two so race-day
// staff see one list. Registrations whose Postgres shadow row is missing are surfaced
// rather than silently dropped, because no onsite action can be recorded for them.

const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const { getPostgresClient } = require('../db/postgres');
const logger = require('../utils/logger');

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizePageSize(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

/**
 * Look up onsite state for a batch of registrations.
 * Returns a Map keyed by mongo_registration_id.
 */
async function getOnsiteStateByRegistrationId(eventId, registrationIds) {
  if (registrationIds.length === 0) return new Map();

  const sql = getPostgresClient();
  const rows = await sql`
    SELECT
      r.mongo_registration_id,
      ba.bib_number,
      ba.assignment_status AS bib_status,
      ba.picked_up_at,
      ci.check_in_status,
      ci.checked_in_at,
      ci.verification_method,
      res.id AS result_id,
      res.elapsed_time_display,
      res.elapsed_ms,
      res.result_status,
      res.place_in_category
    FROM registrations r
    LEFT JOIN bib_assignments ba
      ON ba.registration_id = r.id AND ba.assignment_status <> 'voided'
    LEFT JOIN check_ins ci
      ON ci.registration_id = r.id
    -- onsite_results has no uniqueness per registration, so take the newest row.
    LEFT JOIN LATERAL (
      SELECT id, elapsed_time_display, elapsed_ms, result_status, place_in_category
      FROM onsite_results
      WHERE registration_id = r.id
      ORDER BY created_at DESC
      LIMIT 1
    ) res ON TRUE
    WHERE r.mongo_event_id = ${String(eventId)}
      AND r.mongo_registration_id = ANY(${registrationIds})
  `;

  return new Map(rows.map((row) => [row.mongo_registration_id, row]));
}

/**
 * Event-wide check-in progress, independent of the current search or page limit.
 * The list-scoped counts must never be shown as overall progress: on a 300-runner
 * event a 100-row page would otherwise report "checked in" for the page only.
 */
async function getEventWideTotals(eventId) {
  const registered = await Registration.countDocuments({
    eventId: new mongoose.Types.ObjectId(String(eventId)),
    participationMode: 'onsite'
  });

  try {
    const sql = getPostgresClient();
    const rows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE ci.check_in_status = 'checked_in')::int AS checked_in,
        COUNT(*) FILTER (WHERE ba.bib_number IS NOT NULL)::int AS bibs_assigned,
        COUNT(*) FILTER (WHERE ba.assignment_status = 'picked_up')::int AS kits_released,
        COUNT(*) FILTER (WHERE res.id IS NOT NULL)::int AS results_recorded,
        COUNT(*) FILTER (WHERE res.result_status = 'approved')::int AS results_approved
      FROM registrations r
      LEFT JOIN check_ins ci ON ci.registration_id = r.id
      LEFT JOIN bib_assignments ba
        ON ba.registration_id = r.id AND ba.assignment_status <> 'voided'
      LEFT JOIN LATERAL (
        SELECT id, result_status FROM onsite_results
        WHERE registration_id = r.id ORDER BY created_at DESC LIMIT 1
      ) res ON TRUE
      WHERE r.mongo_event_id = ${String(eventId)}
    `;

    const checkedIn = rows[0]?.checked_in || 0;
    return {
      registered,
      checkedIn,
      awaiting: Math.max(registered - checkedIn, 0),
      bibsAssigned: rows[0]?.bibs_assigned || 0,
      kitsReleased: rows[0]?.kits_released || 0,
      resultsRecorded: rows[0]?.results_recorded || 0,
      resultsApproved: rows[0]?.results_approved || 0
    };
  } catch (error) {
    // Progress is informational; a Postgres failure must not blank the roster.
    logger.error(`[Onsite] Onsite totals failed for event ${eventId}: ${error.message}`);
    return {
      registered,
      checkedIn: null,
      awaiting: null,
      bibsAssigned: null,
      kitsReleased: null,
      resultsRecorded: null,
      resultsApproved: null
    };
  }
}

/**
 * Resolve registration ids whose bib number matches a search term.
 * Bib numbers live only in Postgres, so bib search cannot be answered from Mongo.
 */
async function findRegistrationIdsByBibNumber(eventId, search) {
  const sql = getPostgresClient();
  const rows = await sql`
    SELECT r.mongo_registration_id
    FROM bib_assignments ba
    JOIN registrations r ON r.id = ba.registration_id
    WHERE r.mongo_event_id = ${String(eventId)}
      AND ba.assignment_status <> 'voided'
      AND ba.bib_number ILIKE ${`%${search}%`}
    LIMIT ${MAX_PAGE_SIZE}
  `;
  return rows.map((row) => row.mongo_registration_id);
}

function buildParticipantRow(registration, onsiteState) {
  const participant = registration.participant || {};
  const firstName = String(participant.firstName || '').trim();
  const lastName = String(participant.lastName || '').trim();

  return {
    registrationId: String(registration._id),
    confirmationCode: registration.confirmationCode || '',
    fullName: [firstName, lastName].filter(Boolean).join(' ') || 'Unnamed participant',
    email: participant.email || '',
    mobile: participant.mobile || '',
    emergencyContactName: participant.emergencyContactName || '',
    emergencyContactNumber: participant.emergencyContactNumber || '',
    raceDistance: registration.raceDistance || '',
    participationMode: registration.participationMode || '',
    paymentStatus: registration.paymentStatus || '',
    registrationStatus: registration.status || '',
    bibNumber: onsiteState?.bib_number || '',
    bibStatus: onsiteState?.bib_status || '',
    hasBib: Boolean(onsiteState?.bib_number),
    // Kit release is tracked as pickup on the bib assignment; there is no separate
    // per-participant kit record in the Phase 7 schema.
    isKitReleased: onsiteState?.bib_status === 'picked_up',
    kitReleasedAt: onsiteState?.picked_up_at || null,
    checkInStatus: onsiteState?.check_in_status || '',
    checkedInAt: onsiteState?.checked_in_at || null,
    verificationMethod: onsiteState?.verification_method || '',
    isCheckedIn: onsiteState?.check_in_status === 'checked_in',
    resultId: onsiteState?.result_id || '',
    finishTime: onsiteState?.elapsed_time_display || '',
    resultStatus: onsiteState?.result_status || '',
    hasResult: Boolean(onsiteState?.result_id),
    isResultApproved: onsiteState?.result_status === 'approved',
    isDisqualified: onsiteState?.result_status === 'disqualified',
    placeInCategory: onsiteState?.place_in_category ?? null,
    // A registration with no Postgres shadow row cannot be checked in; the onsite
    // service resolves mongo_registration_id -> registrations.id and throws otherwise.
    isMissingShadowRecord: !onsiteState
  };
}

/**
 * Build the shared onsite roster read model for an event, used by the check-in,
 * bib assignment, and race-kit pages.
 *
 * @param {string} eventId - MongoDB event id
 * @param {Object} options
 * @param {string} [options.search] - name, email, confirmation code, or bib number
 * @param {number} [options.limit]
 * @returns {Promise<Object>} participants, event-wide totals, and list-scoped counts
 */
async function getOnsiteRosterData(eventId, options = {}) {
  if (!mongoose.Types.ObjectId.isValid(String(eventId))) {
    throw new Error(`Invalid event id: ${eventId}`);
  }

  const search = String(options.search || '').trim();
  const limit = normalizePageSize(options.limit);

  const query = {
    eventId: new mongoose.Types.ObjectId(String(eventId)),
    participationMode: 'onsite'
  };

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    const bibMatchIds = await findRegistrationIdsByBibNumber(eventId, search).catch((error) => {
      // Bib search is an enhancement; a Postgres failure should not blank the console.
      logger.error(`[Onsite] Bib search failed for event ${eventId}: ${error.message}`);
      return [];
    });

    query.$or = [
      { 'participant.firstName': pattern },
      { 'participant.lastName': pattern },
      { 'participant.email': pattern },
      { confirmationCode: pattern }
    ];

    if (bibMatchIds.length > 0) {
      query.$or.push({
        _id: { $in: bibMatchIds.filter((id) => mongoose.Types.ObjectId.isValid(id)) }
      });
    }
  }

  const registrations = await Registration.find(query)
    .select('confirmationCode participant raceDistance participationMode paymentStatus status registeredAt')
    .sort({ 'participant.lastName': 1, 'participant.firstName': 1 })
    .limit(limit)
    .lean();

  const registrationIds = registrations.map((registration) => String(registration._id));
  const onsiteState = await getOnsiteStateByRegistrationId(eventId, registrationIds);

  const participants = registrations.map((registration) =>
    buildParticipantRow(registration, onsiteState.get(String(registration._id)))
  );

  const totals = await getEventWideTotals(eventId);

  return {
    participants,
    // Event-wide progress. Safe to show as the headline figures.
    totals,
    // Scoped to the rows actually returned by this search/page. Never present
    // these as overall progress.
    listCounts: {
      listed: participants.length,
      checkedIn: participants.filter((participant) => participant.isCheckedIn).length,
      missingShadowRecord: participants.filter((participant) => participant.isMissingShadowRecord).length
    },
    search,
    limit,
    isTruncated: participants.length >= limit
  };
}

module.exports = {
  getOnsiteRosterData,
  getEventWideTotals,
  // exported for unit tests
  buildParticipantRow,
  escapeRegex,
  normalizePageSize
};
