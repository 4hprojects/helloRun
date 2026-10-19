'use strict';

/**
 * Backfill OCR training candidates from existing run-proof entries (accepted and rejected),
 * under the published notice + objection basis (owner decision 2026-10-18).
 *
 * Gates (all enforced here): training basis is `notice_opt_out` with a recorded notice, the
 * objection period has passed (`backfillNotBefore`), server OCR is enabled, and no other run is
 * active. Every entry goes through isEntryUsableForTraining, so objectors, known minors,
 * inactive accounts, guest entries and withdrawn entries are skipped at the moment of processing.
 *
 * Resource use: driven by the OCR extraction worker only when no normal submission job is
 * waiting, a few entries per cycle, a daily cap, and a bound on outstanding backfill jobs.
 * Entries with a current server reading reuse it (no OCR run); others queue a priority-90 job.
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const OcrBackfillRun = require('../../models/OcrBackfillRun');
const OcrJob = require('../../models/OcrJob');
const OcrExtraction = require('../../models/OcrExtraction');
const TrainingSample = require('../../models/TrainingSample');
const User = require('../../models/User');
const Submission = require('../../models/Submission');
const AccumulatedActivitySubmission = require('../../models/AccumulatedActivitySubmission');
const { getOcrSettings } = require('./ocr-settings.service');
const { isServerOcrPipelineEnabled } = require('./ocr-config');
const { isEntryUsableForTraining } = require('./training-sample.service');
const { enqueueExtraction } = require('./ocr-job.service');

const SOURCES = [
  { collection: 'submissions', kind: 'run_submission', Model: Submission },
  { collection: 'accumulatedactivitysubmissions', kind: 'accumulated_activity', Model: AccumulatedActivitySubmission }
];
const ENTRY_FIELDS = '_id runnerId eventId status proof.key proof.hash proof.mimeType ocrTrainingConsent serverOcr.status serverOcr.extractionId serverOcr.proofKey';
const BACKFILL_PRIORITY = 90;
const ENTRIES_PER_STEP = 5;
const MAX_OUTSTANDING_JOBS = 5;
const PLAN_BATCH = 500;

class BackfillError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function manilaDateKey(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function checkGates(settings, now = new Date()) {
  const training = settings?.training || {};
  if (training.basis !== 'notice_opt_out') return 'Training basis is not "notice and objection". Change it in Settings after the revised policy is published.';
  if (!training.noticePublishedAt || !training.noticePolicyVersion) return 'Record the published notice date and policy version in Settings first.';
  if (!training.backfillNotBefore || new Date(training.backfillNotBefore) > now) {
    return `The objection period has not ended; the backfill may start on ${training.backfillNotBefore ? new Date(training.backfillNotBefore).toISOString().slice(0, 10) : 'a date set in Settings'}.`;
  }
  if (!isServerOcrPipelineEnabled()) return 'OCR_SERVER_PIPELINE_ENABLED must be on.';
  return '';
}

async function loadRunners(entries) {
  const ids = [...new Set(entries.map((entry) => String(entry.runnerId || '')).filter((id) => mongoose.isValidObjectId(id)))];
  if (!ids.length) return new Map();
  const runners = await User.find({ _id: { $in: ids } }).select('_id accountStatus dateOfBirth ocrTrainingOptOut').lean();
  return new Map(runners.map((runner) => [String(runner._id), runner]));
}

/** Dry run: how many entries would be used, and why the rest would not. Read-only. */
async function planBackfill({ now = new Date(), settingsOverride = null } = {}) {
  const settings = settingsOverride || await getOcrSettings({ fresh: true });
  const evaluateAs = { ...settings, training: { ...(settings.training || {}), basis: 'notice_opt_out', noticePublishedAt: settings.training?.noticePublishedAt || now } };
  const result = { total: 0, usable: 0, byStatus: {}, excluded: {}, alreadySampled: 0, gate: checkGates(settings, now) };
  for (const source of SOURCES) {
    let lastId = null;
    for (;;) {
      const query = { 'proof.key': { $type: 'string', $ne: '' } };
      if (lastId) query._id = { $gt: lastId };
      const batch = await source.Model.find(query).select(ENTRY_FIELDS).sort({ _id: 1 }).limit(PLAN_BATCH).lean();
      if (!batch.length) break;
      lastId = batch[batch.length - 1]._id;
      const runners = await loadRunners(batch);
      const sampled = new Set((await TrainingSample.find({ 'sourceEntry.id': { $in: batch.map((entry) => entry._id) } }).select('sourceEntry.id').lean()).map((row) => String(row.sourceEntry.id)));
      for (const entry of batch) {
        result.total += 1;
        const verdict = isEntryUsableForTraining(entry, runners.get(String(entry.runnerId)), evaluateAs, now);
        if (!verdict.usable) {
          result.excluded[verdict.reason] = (result.excluded[verdict.reason] || 0) + 1;
          continue;
        }
        if (sampled.has(String(entry._id))) {
          result.alreadySampled += 1;
          continue;
        }
        result.usable += 1;
        result.byStatus[entry.status || 'unknown'] = (result.byStatus[entry.status || 'unknown'] || 0) + 1;
      }
    }
  }
  return result;
}

async function getActiveRun() {
  return OcrBackfillRun.findOne({ status: { $in: ['running', 'paused'] } }).sort({ createdAt: -1 }).lean();
}

async function startBackfill({ actorId, now = new Date() }) {
  const settings = await getOcrSettings({ fresh: true });
  const gate = checkGates(settings, now);
  if (gate) throw new BackfillError('gate_closed', gate, 422);
  try {
    return (await OcrBackfillRun.create({
      startedBy: actorId,
      noticePolicyVersion: settings.training.noticePolicyVersion,
      dailyCap: Number(settings.training.backfillDailyCap || 500),
      status: 'running',
      activeLock: 'active'
    })).toObject();
  } catch (error) {
    if (error?.code === 11000) throw new BackfillError('backfill_active', 'A backfill is already running or paused.', 409);
    throw error;
  }
}

async function setRunStatus(runId, from, to) {
  if (!mongoose.isValidObjectId(runId)) throw new BackfillError('not_found', 'Backfill run not found.', 404);
  const update = { $set: { status: to } };
  if (['completed', 'cancelled', 'failed'].includes(to)) {
    update.$set.finishedAt = new Date();
    update.$unset = { activeLock: 1 };
  }
  const updated = await OcrBackfillRun.findOneAndUpdate({ _id: runId, status: { $in: from } }, update, { new: true }).lean();
  if (!updated) throw new BackfillError('invalid_state', `Backfill cannot move to ${to} from its current state.`, 409);
  return updated;
}

const pauseBackfill = (runId) => setRunStatus(runId, ['running'], 'paused');
const resumeBackfill = (runId) => setRunStatus(runId, ['paused'], 'running');
const cancelBackfill = (runId) => setRunStatus(runId, ['running', 'paused'], 'cancelled');

async function nextEntries(run, limit) {
  const picked = [];
  for (const source of SOURCES) {
    if (picked.length >= limit) break;
    if (run.exhausted?.[source.collection]) continue;
    const query = { 'proof.key': { $type: 'string', $ne: '' } };
    if (run.cursor?.[source.collection]) query._id = { $gt: run.cursor[source.collection] };
    const rows = await source.Model.find(query).select(ENTRY_FIELDS).sort({ _id: 1 }).limit(limit - picked.length).lean();
    if (!rows.length) {
      await OcrBackfillRun.updateOne({ _id: run._id }, { $set: { [`exhausted.${source.collection}`]: true } });
      run.exhausted = { ...(run.exhausted || {}), [source.collection]: true };
      continue;
    }
    for (const row of rows) picked.push({ source, entry: row });
  }
  return picked;
}

async function reuseExistingReading(entry, source, settings, verdict, deps) {
  const extraction = await OcrExtraction.findById(entry.serverOcr.extractionId).lean();
  if (!extraction || extraction.status === 'failed') return 0;
  const readProof = deps.readProof || ((key) => require('../upload.service').getObjectBufferFromR2(key, { maxBytes: 10 * 1024 * 1024 }));
  const createCandidates = deps.createTrainingCandidates || require('./training-sample.service').createCandidatesFromExtraction;
  const buffer = await readProof(entry.proof.key);
  const created = await createCandidates({
    extraction,
    buffer,
    consentBasis: verdict.consentBasis,
    consentRecordedAt: verdict.consentBasis === 'participant_opt_in' ? entry.ocrTrainingConsent?.recordedAt : settings.training.noticePublishedAt,
    consentNoticeVersion: verdict.consentBasis === 'participant_opt_in' ? entry.ocrTrainingConsent?.noticeVersion : settings.training.noticePolicyVersion,
    source: 'backfill',
    sourceEntry: { kind: source.kind, id: entry._id },
    eventId: entry.eventId || null,
    runnerId: entry.runnerId || null
  });
  return created.length;
}

/**
 * Process a few entries for the active run. Called by the extraction worker after normal jobs.
 * @returns {{ ran: boolean, reason?: string, processed?: number }}
 */
async function stepBackfill({ now = new Date(), deps = {} } = {}) {
  const run = await OcrBackfillRun.findOne({ status: 'running' }).lean();
  if (!run) return { ran: false, reason: 'no_running_backfill' };
  const settings = deps.settings || await getOcrSettings({ fresh: true });
  const gate = checkGates(settings, now);
  if (gate) {
    // The basis was withdrawn or the pipeline switched off: stop rather than continue under a changed basis.
    await OcrBackfillRun.updateOne({ _id: run._id, status: 'running' }, { $set: { status: 'paused', errorSummary: gate.slice(0, 300) } });
    return { ran: false, reason: 'gate_closed' };
  }
  const waitingSubmissionJobs = await OcrJob.countDocuments({ status: { $in: ['queued', 'running'] }, priority: { $lt: BACKFILL_PRIORITY } });
  if (waitingSubmissionJobs) return { ran: false, reason: 'yielding_to_submissions' };
  const outstanding = await OcrJob.countDocuments({ status: { $in: ['queued', 'running'] }, 'options.reason': 'backfill' });
  if (outstanding >= MAX_OUTSTANDING_JOBS) return { ran: false, reason: 'outstanding_jobs' };

  const dateKey = manilaDateKey(now);
  const processedToday = run.today?.dateKey === dateKey ? Number(run.today.processed || 0) : 0;
  const budget = Math.min(ENTRIES_PER_STEP, Number(run.dailyCap) - processedToday, MAX_OUTSTANDING_JOBS - outstanding);
  if (budget <= 0) return { ran: false, reason: 'daily_cap_reached' };

  const batch = await nextEntries(run, budget);
  if (!batch.length) {
    await setRunStatus(run._id, ['running'], 'completed');
    return { ran: true, processed: 0, reason: 'completed' };
  }
  const runners = await loadRunners(batch.map((item) => item.entry));
  let processed = 0;
  for (const { source, entry } of batch) {
    const inc = { 'counts.scanned': 1 };
    const verdict = isEntryUsableForTraining(entry, runners.get(String(entry.runnerId)), settings, now);
    if (!verdict.usable) {
      inc[`counts.excluded.${verdict.reason}`] = 1;
    } else if (await TrainingSample.exists({ 'sourceEntry.id': entry._id })) {
      inc['counts.alreadySampled'] = 1;
    } else {
      processed += 1;
      try {
        const current = entry.serverOcr?.extractionId && entry.serverOcr.status !== 'failed' && entry.serverOcr.proofKey === entry.proof.key;
        if (current) {
          inc['counts.candidates'] = await reuseExistingReading(entry, source, settings, verdict, deps);
          inc['counts.reused'] = 1;
        } else {
          await enqueueExtraction({
            proofKey: entry.proof.key,
            proofHash: String(entry.proof.hash || ''),
            runnerId: entry.runnerId,
            targets: [{ kind: source.kind, id: entry._id }],
            priority: BACKFILL_PRIORITY,
            reason: 'backfill',
            idempotencyKey: `backfill:${String(run._id)}:${String(entry._id)}`
          });
          inc['counts.queued'] = 1;
        }
      } catch (error) {
        logger.warn('[ocr-backfill] entry skipped', { error: error?.message });
        inc['counts.excluded.processing_error'] = 1;
      }
    }
    await OcrBackfillRun.updateOne(
      { _id: run._id },
      { $set: { [`cursor.${source.collection}`]: entry._id, lastStepAt: now }, $inc: inc }
    );
  }
  await OcrBackfillRun.updateOne(
    { _id: run._id },
    run.today?.dateKey === dateKey
      ? { $inc: { 'today.processed': processed } }
      : { $set: { today: { dateKey, processed } } }
  );
  return { ran: true, processed };
}

async function listBackfillRuns(limit = 5) {
  return OcrBackfillRun.find({}).sort({ createdAt: -1 }).limit(limit).lean();
}

module.exports = {
  BACKFILL_PRIORITY,
  BackfillError,
  checkGates,
  planBackfill,
  getActiveRun,
  startBackfill,
  pauseBackfill,
  resumeBackfill,
  cancelBackfill,
  stepBackfill,
  listBackfillRuns,
  manilaDateKey
};
