const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_ATTEMPTS,
  STALE_CLAIM_MS,
  addMonths,
  claimGenerationJob,
  getDueSchedulerTargets,
  isActiveQuestSchedulerEnabled,
  markJobFailed,
  runActiveQuestSchedulerCycle
} = require('../src/services/active-quest-scheduler.service');

function enabledSeries() {
  return {
    isActive: true,
    updatedBy: 'admin-1',
    scheduleDefaults: {
      registrationLeadDays: 7,
      draftPreparationDaysBeforeRegistration: 10,
      registrationCloseDay: 22,
      proofCloseDayNextMonth: 14,
      reviewTargetDays: 3
    },
    featureFlags: {
      activeQuestSeriesEnabled: true,
      activeQuestDraftGenerationEnabled: true,
      activeQuestSchedulerEnabled: true,
      activeQuestAutoPublishEnabled: false
    }
  };
}

test('scheduler flags fail closed and auto-publication prevents scheduling', () => {
  assert.equal(isActiveQuestSchedulerEnabled({}), false);
  const series = enabledSeries();
  series.featureFlags.activeQuestAutoPublishEnabled = true;
  assert.equal(isActiveQuestSchedulerEnabled(series), false);
});

test('disabled scheduler performs no event or job writes', async () => {
  const summary = await runActiveQuestSchedulerCycle({}, {
    SeriesModel: { findOne: async () => ({ ...enabledSeries(), featureFlags: {} }) },
    EventModel: { findOne: async () => { throw new Error('must not query'); } },
    JobModel: { findOneAndUpdate: async () => { throw new Error('must not write'); } }
  });
  assert.deepEqual(summary, { status: 'disabled', checked: 0, generated: 0, failed: 0 });
});

test('PHT due calculation handles December to January rollover', () => {
  assert.deepEqual(addMonths(2026, 12, 1), { year: 2027, month: 1 });
  const targets = getDueSchedulerTargets({
    now: new Date('2026-12-20T00:00:00.000Z'),
    scheduleDefaults: enabledSeries().scheduleDefaults,
    lookbackMonths: 0,
    lookaheadMonths: 1
  });
  assert.ok(targets.some((target) => target.year === 2027 && target.month === 1));
});

test('concurrent workers claim one idempotency key', async () => {
  let stored = null;
  const JobModel = {
    async findOneAndUpdate(query, update) {
      await new Promise((resolve) => setImmediate(resolve));
      if (stored) {
        const error = new Error('duplicate key');
        error.code = 11000;
        throw error;
      }
      stored = {
        _id: 'job-1',
        key: query.key,
        attempts: 1,
        claimedAt: update.$set.claimedAt,
        status: 'running'
      };
      return stored;
    }
  };
  const target = { year: 2026, month: 11 };
  const now = new Date('2026-10-15T00:00:00Z');
  const [left, right] = await Promise.all([
    claimGenerationJob(target, { now, JobModel, workerId: 'left' }),
    claimGenerationJob(target, { now, JobModel, workerId: 'right' })
  ]);
  assert.equal([left, right].filter(Boolean).length, 1);
});

test('stale claims are recoverable and failures back off with a bounded attempt count', async () => {
  const now = new Date('2026-10-20T00:00:00Z');
  let query;
  let update;
  const JobModel = {
    findOneAndUpdate: async (receivedQuery) => { query = receivedQuery; return { _id: 'job-1', attempts: 2, claimedAt: now }; },
    updateOne: async (_selector, receivedUpdate) => { update = receivedUpdate; return { modifiedCount: 1 }; }
  };
  await claimGenerationJob({ year: 2026, month: 11 }, { now, JobModel, workerId: 'worker' });
  const staleClause = query.$or.find((clause) => clause.status === 'running');
  assert.equal(staleClause.claimedAt.$lte.getTime(), now.getTime() - STALE_CLAIM_MS);
  await markJobFailed({ _id: 'job-1', attempts: 2, claimedAt: now }, new Error('transient failure'), { now, JobModel });
  assert.equal(update.$set.status, 'failed');
  assert.ok(update.$set.nextRetryAt > now);
  assert.equal(MAX_ATTEMPTS, 5);
});
