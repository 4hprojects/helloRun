'use strict';

/**
 * Reviewer checks of an optional activity link (Phase 2).
 *
 * Methods (doc 02 "URLVerification"):
 *   format_only     — recorded automatically on submission: host/route allowlisted, id parsed.
 *   manual_open     — a reviewer opened the link in their own browser and compared values.
 *   authorized_api  — not available: no provider API access is authorised for HelloRun
 *                     (Strava use is blocked by policy; no Garmin/COROS partner access).
 *                     getAuthorizedApiAvailability() reports this; nothing is fetched.
 *
 * The server never requests the URL. A matched link is corroboration, not proof.
 */

const mongoose = require('mongoose');
const ActivityUrlVerification = require('../../models/ActivityUrlVerification');
const Submission = require('../../models/Submission');
const AccumulatedActivitySubmission = require('../../models/AccumulatedActivitySubmission');

const MANUAL_STATUSES = Object.freeze(['matched', 'mismatched', 'inaccessible', 'needs_review']);
const FIELD_RESULTS = Object.freeze(['matched', 'mismatched', 'not_compared']);

function modelForKind(kind) {
  return kind === 'accumulated_activity' ? AccumulatedActivitySubmission : Submission;
}

function getAuthorizedApiAvailability(provider) {
  return {
    provider: String(provider || ''),
    available: false,
    reason: 'no_authorised_provider_api',
    detail: 'HelloRun has no authorised provider API access for activity verification. Reviewers open links manually.'
  };
}

function cleanFieldResult(value) {
  const safe = String(value || '').trim();
  return FIELD_RESULTS.includes(safe) ? safe : 'not_compared';
}

/**
 * Record a reviewer's manual check. Caller must already have authorised the reviewer for
 * the entry's event.
 */
async function recordManualUrlCheck({ kind, entryId, eventId, status, comparedFields = {}, notes = '', reviewerId }) {
  if (!mongoose.isValidObjectId(entryId)) {
    const error = new Error('Entry not found.');
    error.code = 'not_found';
    throw error;
  }
  if (!MANUAL_STATUSES.includes(status)) {
    const error = new Error('Choose what you found when you opened the link.');
    error.code = 'invalid_status';
    throw error;
  }
  const Model = modelForKind(kind);
  const entry = await Model.findOne({ _id: entryId, eventId }).select('_id eventId activityUrl').lean();
  if (!entry) {
    const error = new Error('Entry not found.');
    error.code = 'not_found';
    throw error;
  }
  if (!entry.activityUrl?.providerActivityId) {
    const error = new Error('This entry has no activity link to check.');
    error.code = 'no_activity_url';
    throw error;
  }
  const fields = {
    distance: cleanFieldResult(comparedFields.distance),
    duration: cleanFieldResult(comparedFields.duration),
    date: cleanFieldResult(comparedFields.date)
  };
  const anyMismatch = Object.values(fields).includes('mismatched');
  // A field-level mismatch is never recorded as an overall match.
  const finalStatus = status === 'matched' && anyMismatch ? 'mismatched' : status;
  const safeNotes = String(notes || '').trim().slice(0, 500);
  const checkedAt = new Date();
  const row = await ActivityUrlVerification.create({
    entryKind: kind,
    entryId: entry._id,
    eventId: entry.eventId,
    provider: entry.activityUrl.provider,
    providerActivityId: entry.activityUrl.providerActivityId,
    method: 'manual_open',
    status: finalStatus,
    comparedFields: fields,
    notes: safeNotes,
    provenance: 'reviewer_browser',
    checkedBy: reviewerId || null,
    checkedAt
  });
  await Model.updateOne(
    { _id: entry._id },
    {
      $set: {
        activityUrlVerification: {
          status: finalStatus,
          method: 'manual_open',
          checkedAt,
          checkedBy: reviewerId || null,
          notes: safeNotes,
          comparedFields: fields
        }
      }
    }
  );
  return { row, status: finalStatus };
}

async function listUrlChecks(entryId, limit = 10) {
  if (!mongoose.isValidObjectId(entryId)) return [];
  return ActivityUrlVerification.find({ entryId }).sort({ checkedAt: -1 }).limit(limit).lean();
}

module.exports = {
  MANUAL_STATUSES,
  getAuthorizedApiAvailability,
  recordManualUrlCheck,
  listUrlChecks
};
