const logger = require('../utils/logger');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const Event = require('../models/Event');

// A runner can send one proof to several events in a single request. Each target gets its
// own entry, and the entries share a submissionAttemptId. One manual review decision on any
// of them applies to the rest, so the same proof is not reviewed (and possibly decided
// differently) once per event.
//
// The cascade only touches siblings still awaiting review. A sibling that its own event's
// reviewer has already approved or rejected, or that was auto-approved, keeps that decision,
// and a cascaded rejection never reverses an approval.
const PENDING_STATUSES_BY_ACTION = {
  approve: {
    run_submission: new Set(['submitted']),
    accumulated_activity: new Set(['submitted', 'needs_clarification'])
  },
  reject: {
    run_submission: new Set(['submitted']),
    accumulated_activity: new Set(['submitted'])
  }
};

const LINKED_ENTRY_FIELDS = '_id eventId runnerId status submissionAttemptId';

// Both review services call back into this module, so they are loaded lazily to keep the
// require graph acyclic.
function getReviewFunctions() {
  return {
    reviewSubmission: require('./submission.service').reviewSubmission,
    reviewAccumulatedActivitySubmission: require('./accumulated-activity.service').reviewAccumulatedActivitySubmission
  };
}

async function findLinkedEntries(entry) {
  const submissionAttemptId = String(entry?.submissionAttemptId || '').trim();
  // Review screens load the entry with runnerId populated.
  const runnerId = entry?.runnerId?._id || entry?.runnerId;
  if (!submissionAttemptId || !runnerId) return [];

  const query = {
    _id: { $ne: entry._id },
    runnerId,
    submissionAttemptId
  };
  const [submissions, activities] = await Promise.all([
    Submission.find(query).select(LINKED_ENTRY_FIELDS).lean(),
    AccumulatedActivitySubmission.find(query).select(LINKED_ENTRY_FIELDS).lean()
  ]);
  return [
    ...(submissions || []).map((doc) => ({ ...doc, kind: 'run_submission' })),
    ...(activities || []).map((doc) => ({ ...doc, kind: 'accumulated_activity' }))
  ];
}

// Linked entries with their event titles, for the reviewer's notice on the review panel.
async function describeLinkedEntries(entry) {
  const linked = await findLinkedEntries(entry);
  if (!linked.length) return [];
  const eventIds = [...new Set(linked.map((doc) => String(doc.eventId)))];
  const events = await Event.find({ _id: { $in: eventIds } }).select('title').lean();
  const titleById = new Map((events || []).map((event) => [String(event._id), event.title || 'Event']));
  return linked.map((doc) => ({
    id: String(doc._id),
    kind: doc.kind,
    eventId: String(doc.eventId),
    eventTitle: titleById.get(String(doc.eventId)) || 'Event',
    status: doc.status,
    willFollowDecision: PENDING_STATUSES_BY_ACTION.approve[doc.kind].has(doc.status)
  }));
}

function buildLinkedReviewNotes(sourceEntry, sourceEvent, reviewNotes) {
  const origin = `Applied from linked entry ${sourceEntry._id} (${sourceEvent?.title || 'another event'}).`;
  const notes = String(reviewNotes || '').trim();
  return (notes ? `${origin} ${notes}` : origin).slice(0, 1200);
}

/**
 * Applies a manual approve or reject decision to every pending entry submitted together with
 * the source entry. Never throws: a sibling that fails (for example, one reviewed by someone
 * else in the meantime) is logged and reported as skipped, and the source review stands.
 */
async function applyLinkedReview({
  sourceEntry,
  sourceKind,
  sourceEvent,
  action,
  organizerId,
  reviewerRole,
  reviewNotes,
  rejectionCode,
  rejectionReason
}) {
  const result = { applied: [], skipped: [] };
  const pendingStatuses = PENDING_STATUSES_BY_ACTION[action];
  if (!pendingStatuses) return result;

  let linked;
  try {
    linked = await findLinkedEntries(sourceEntry);
  } catch (error) {
    logger.error('Linked entry lookup failed; decision applied to the source entry only:', {
      sourceId: String(sourceEntry?._id || ''),
      error: error.message
    });
    return result;
  }

  const { reviewSubmission, reviewAccumulatedActivitySubmission } = getReviewFunctions();
  const linkedFrom = { kind: sourceKind, targetId: sourceEntry._id, eventId: sourceEntry.eventId };
  const siblingInput = {
    organizerId,
    reviewerRole,
    action,
    reviewNotes: buildLinkedReviewNotes(sourceEntry, sourceEvent, reviewNotes),
    rejectionCode,
    rejectionReason,
    linkedFrom
  };

  for (const sibling of linked) {
    const summary = { id: String(sibling._id), kind: sibling.kind, eventId: String(sibling.eventId) };
    if (!pendingStatuses[sibling.kind].has(sibling.status)) {
      result.skipped.push({ ...summary, reason: `already ${sibling.status}` });
      continue;
    }
    try {
      if (sibling.kind === 'accumulated_activity') {
        await reviewAccumulatedActivitySubmission({ activityId: sibling._id, ...siblingInput });
      } else {
        await reviewSubmission({ submissionId: sibling._id, ...siblingInput });
      }
      result.applied.push(summary);
    } catch (error) {
      logger.error('Linked entry review failed; sibling left for its own review:', {
        sourceId: String(sourceEntry._id),
        siblingId: summary.id,
        action,
        error: error.message
      });
      result.skipped.push({ ...summary, reason: error.message });
    }
  }
  return result;
}

function formatLinkedReviewMessage(reviewedEntry) {
  const applied = reviewedEntry?.$locals?.linkedReview?.applied?.length || 0;
  if (!applied) return '';
  return ` Also applied to ${applied} linked ${applied === 1 ? 'event' : 'events'} submitted with the same proof.`;
}

module.exports = {
  applyLinkedReview,
  describeLinkedEntries,
  findLinkedEntries,
  formatLinkedReviewMessage,
  PENDING_STATUSES_BY_ACTION
};
