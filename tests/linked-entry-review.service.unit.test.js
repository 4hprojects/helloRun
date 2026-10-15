// DB-free unit tests: every Mongoose model call is mocked, and nothing here opens a real
// MongoDB or Postgres connection (see "Test Safety" in CLAUDE.md).
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

process.env.DATABASE_URL = '';

const Submission = require('../src/models/Submission');
const AccumulatedActivitySubmission = require('../src/models/AccumulatedActivitySubmission');
const Registration = require('../src/models/Registration');
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const ReviewDecision = require('../src/models/ReviewDecision');
const criticalAuditService = require('../src/services/critical-audit.service');
const submissionService = require('../src/services/submission.service');
const accumulatedActivityService = require('../src/services/accumulated-activity.service');
const {
  applyLinkedReview,
  findLinkedEntries,
  formatLinkedReviewMessage
} = require('../src/services/linked-entry-review.service');

function patch(obj, key, impl) {
  const original = obj[key];
  obj[key] = impl;
  return () => { obj[key] = original; };
}

function chainable(result) {
  const chain = {
    select() { return chain; },
    populate() { return chain; },
    lean: async () => result,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  };
  return chain;
}

const runnerId = new mongoose.Types.ObjectId();
const reviewerId = new mongoose.Types.ObjectId();

function linkedDoc(status, overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    eventId: new mongoose.Types.ObjectId(),
    runnerId,
    status,
    submissionAttemptId: 'attempt-1',
    ...overrides
  };
}

function buildSubmission(overrides = {}) {
  return new Submission({
    registrationId: new mongoose.Types.ObjectId(),
    eventId: new mongoose.Types.ObjectId(),
    runnerId,
    raceDistance: '10K',
    distanceKm: 10.2,
    elapsedMs: 3_600_000,
    source: 'manual_upload',
    proofType: 'photo',
    proof: { url: 'https://cdn.example/proof.png', key: 'proofs/r1/a.png', mimeType: 'image/png', size: 1200, hash: 'abc' },
    submissionAttemptId: 'attempt-1',
    submissionCount: 1,
    ...overrides
  });
}

// Mocks the sibling lookup and both review functions, recording every cascaded call.
function mockLinkedEntries({ submissions = [], activities = [], failIds = [] } = {}) {
  const calls = [];
  const finds = [];
  const restores = [
    patch(Submission, 'find', (query) => { finds.push(query); return chainable(submissions); }),
    patch(AccumulatedActivitySubmission, 'find', (query) => { finds.push(query); return chainable(activities); }),
    patch(submissionService, 'reviewSubmission', async (input) => {
      calls.push({ kind: 'run_submission', id: String(input.submissionId), input });
      if (failIds.includes(String(input.submissionId))) throw new Error('Only submitted results can be rejected.');
    }),
    patch(accumulatedActivityService, 'reviewAccumulatedActivitySubmission', async (input) => {
      calls.push({ kind: 'accumulated_activity', id: String(input.activityId), input });
    })
  ];
  return { calls, finds, restore: () => restores.forEach((restore) => restore()) };
}

const source = linkedDoc('approved');
const sourceEvent = { _id: source.eventId, title: 'Bayani Run' };

test('approval cascades to pending standard and accumulated siblings, never past a human decision', async () => {
  const pendingRun = linkedDoc('submitted');
  const rejectedRun = linkedDoc('rejected');
  const approvedRun = linkedDoc('approved');
  const pendingActivity = linkedDoc('submitted');
  const clarifyActivity = linkedDoc('needs_clarification');
  const mocks = mockLinkedEntries({
    submissions: [pendingRun, rejectedRun, approvedRun],
    activities: [pendingActivity, clarifyActivity]
  });
  try {
    const result = await applyLinkedReview({
      sourceEntry: source,
      sourceKind: 'run_submission',
      sourceEvent,
      action: 'approve',
      organizerId: reviewerId,
      reviewerRole: 'organiser',
      reviewNotes: 'Looks good'
    });

    assert.deepEqual(
      mocks.calls.map((call) => call.id).sort(),
      [pendingRun, pendingActivity, clarifyActivity].map((doc) => String(doc._id)).sort()
    );
    assert.deepEqual(result.skipped.map((entry) => entry.id).sort(), [rejectedRun, approvedRun].map((doc) => String(doc._id)).sort());
    for (const { input } of mocks.calls) {
      assert.equal(input.action, 'approve');
      assert.equal(input.requireVerification, undefined);
      assert.equal(String(input.linkedFrom.targetId), String(source._id));
      assert.equal(input.linkedFrom.kind, 'run_submission');
      assert.match(input.reviewNotes, /^Applied from linked entry .+ \(Bayani Run\)\. Looks good$/);
    }
    assert.equal(String(mocks.finds[0].runnerId), String(runnerId));
    assert.equal(String(mocks.finds[0]._id.$ne), String(source._id));
  } finally {
    mocks.restore();
  }
});

test('rejection cascades only to submitted siblings, so it never reverses an approval', async () => {
  const pendingRun = linkedDoc('submitted');
  const approvedRun = linkedDoc('approved');
  const clarifyActivity = linkedDoc('needs_clarification');
  const mocks = mockLinkedEntries({ submissions: [pendingRun, approvedRun], activities: [clarifyActivity] });
  try {
    const result = await applyLinkedReview({
      sourceEntry: source,
      sourceKind: 'run_submission',
      sourceEvent,
      action: 'reject',
      organizerId: reviewerId,
      reviewerRole: 'organiser',
      rejectionCode: 'unclear_proof'
    });
    assert.deepEqual(mocks.calls.map((call) => call.id), [String(pendingRun._id)]);
    assert.equal(mocks.calls[0].input.rejectionCode, 'unclear_proof');
    assert.equal(result.skipped.length, 2);
  } finally {
    mocks.restore();
  }
});

test('a failing sibling is skipped and the rest still follow the decision', async () => {
  const lost = linkedDoc('submitted');
  const next = linkedDoc('submitted');
  const mocks = mockLinkedEntries({ submissions: [lost, next], failIds: [String(lost._id)] });
  try {
    const result = await applyLinkedReview({
      sourceEntry: source,
      sourceKind: 'run_submission',
      sourceEvent,
      action: 'reject',
      organizerId: reviewerId,
      reviewerRole: 'organiser'
    });
    assert.deepEqual(result.applied.map((entry) => entry.id), [String(next._id)]);
    assert.equal(result.skipped[0].id, String(lost._id));
  } finally {
    mocks.restore();
  }
});

test('an entry with no submission attempt has no linked entries and queries nothing', async () => {
  const mocks = mockLinkedEntries({ submissions: [linkedDoc('submitted')] });
  try {
    assert.deepEqual(await findLinkedEntries({ ...source, submissionAttemptId: '' }), []);
    const result = await applyLinkedReview({
      sourceEntry: { ...source, submissionAttemptId: '' },
      sourceKind: 'run_submission',
      sourceEvent,
      action: 'approve',
      organizerId: reviewerId
    });
    assert.equal(mocks.finds.length, 0);
    assert.equal(mocks.calls.length, 0);
    assert.deepEqual(result, { applied: [], skipped: [] });
  } finally {
    mocks.restore();
  }
});

test('a lookup failure leaves the decision on the source entry only', async () => {
  const restore = patch(Submission, 'find', () => { throw new Error('mongo down'); });
  try {
    const result = await applyLinkedReview({
      sourceEntry: source,
      sourceKind: 'run_submission',
      sourceEvent,
      action: 'approve',
      organizerId: reviewerId
    });
    assert.deepEqual(result, { applied: [], skipped: [] });
  } finally {
    restore();
  }
});

test('the reviewer message counts the linked entries that followed', () => {
  assert.equal(formatLinkedReviewMessage({ $locals: {} }), '');
  assert.equal(
    formatLinkedReviewMessage({ $locals: { linkedReview: { applied: [{}, {}], skipped: [] } } }),
    ' Also applied to 2 linked events submitted with the same proof.'
  );
});

// Drives the real reviewSubmission on both entries, with only the models mocked.
function mockReviewModels(entries, created) {
  const restores = [
    patch(Submission, 'findById', async (id) => entries.get(String(id)) || null),
    patch(Event, 'findById', (id) => chainable({ _id: id, title: `Event ${String(id).slice(-4)}`, acceptedRunTypes: ['run'] })),
    patch(User, 'findById', () => chainable(null)),
    patch(Registration, 'findById', () => chainable(null)),
    patch(Submission, 'findOneAndUpdate', async (filter, update) => {
      const current = entries.get(String(filter._id));
      if (!current || current.status !== filter.status) return null;
      const next = buildSubmission({ ...current.toObject(), ...update.$set });
      next._id = current._id;
      entries.set(String(current._id), next);
      return next;
    }),
    patch(AccumulatedActivitySubmission, 'find', () => chainable([])),
    patch(ReviewDecision, 'create', async (record) => { created.push(record); return record; })
  ];
  return () => restores.forEach((restore) => restore());
}

test('reviewSubmission applies a rejection to the linked entry once, recording where it came from', async () => {
  const sourceEntry = buildSubmission();
  const sibling = buildSubmission();
  const entries = new Map([[String(sourceEntry._id), sourceEntry], [String(sibling._id), sibling]]);
  const created = [];
  const finds = [];

  criticalAuditService.__setDisableCriticalAuditBackgroundWrites(true);
  submissionService.__setDisableSubmissionSyncBackgroundTasks(true);
  const restoreModels = mockReviewModels(entries, created);
  const restoreFind = patch(Submission, 'find', (query) => {
    finds.push(query);
    const docs = [...entries.values()]
      .filter((doc) => String(doc._id) !== String(query._id.$ne))
      .map((doc) => ({ ...doc.toObject(), _id: doc._id }));
    return chainable(docs);
  });

  try {
    const reviewed = await submissionService.reviewSubmission({
      submissionId: sourceEntry._id,
      organizerId: reviewerId,
      reviewerRole: 'admin',
      action: 'reject',
      rejectionCode: 'unclear_proof'
    });
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(entries.get(String(sibling._id)).status, 'rejected');
    assert.equal(entries.get(String(sibling._id)).rejectionCode, 'unclear_proof');
    assert.equal(reviewed.$locals.linkedReview.applied.length, 1);
    // Only the source looked for siblings: the cascaded review did not cascade again.
    assert.equal(finds.length, 1);

    const siblingDecision = created.find((record) => String(record.targetId) === String(sibling._id));
    assert.equal(siblingDecision.decision, 'rejected');
    assert.equal(String(siblingDecision.linkedFrom.targetId), String(sourceEntry._id));
    assert.equal(siblingDecision.linkedFrom.kind, 'run_submission');
    const sourceDecision = created.find((record) => String(record.targetId) === String(sourceEntry._id));
    assert.equal(sourceDecision.linkedFrom, null);
  } finally {
    restoreFind();
    restoreModels();
    criticalAuditService.__setDisableCriticalAuditBackgroundWrites(false);
    submissionService.__setDisableSubmissionSyncBackgroundTasks(false);
  }
});

test('an approval reversal stays on its own entry', async () => {
  const sourceEntry = buildSubmission({ status: 'approved' });
  const entries = new Map([[String(sourceEntry._id), sourceEntry]]);
  const created = [];
  let findCalls = 0;

  criticalAuditService.__setDisableCriticalAuditBackgroundWrites(true);
  submissionService.__setDisableSubmissionSyncBackgroundTasks(true);
  const restoreModels = mockReviewModels(entries, created);
  const restoreFind = patch(Submission, 'find', () => { findCalls += 1; return chainable([]); });
  try {
    const reviewed = await submissionService.reviewSubmission({
      submissionId: sourceEntry._id,
      organizerId: reviewerId,
      reviewerRole: 'admin',
      action: 'reject',
      rejectionCode: 'unclear_proof',
      allowApprovedReversal: true
    });
    assert.equal(reviewed.status, 'rejected');
    assert.equal(findCalls, 0);
    assert.equal(reviewed.$locals.linkedReview, undefined);
  } finally {
    restoreFind();
    restoreModels();
    criticalAuditService.__setDisableCriticalAuditBackgroundWrites(false);
    submissionService.__setDisableSubmissionSyncBackgroundTasks(false);
  }
});

test('ReviewDecision keeps the linkedFrom reference', () => {
  const doc = new ReviewDecision({
    kind: 'run_submission',
    targetId: new mongoose.Types.ObjectId(),
    decision: 'approved',
    decidedAt: new Date(),
    linkedFrom: { kind: 'accumulated_activity', targetId: source._id, eventId: source.eventId }
  });
  assert.equal(doc.validateSync(), undefined);
  assert.equal(doc.linkedFrom.kind, 'accumulated_activity');
  assert.equal(new ReviewDecision({}).linkedFrom, null);
});
