'use strict';

/**
 * Training worker internals (Phase 4). Runs only in the separate training process
 * (`npm run ocr:training-worker`), never in the web app.
 *
 * Safety properties:
 * - The trainer is started with execFile/spawn and a fixed argument array built from
 *   validated settings. No admin input reaches a shell.
 * - Resource limits: `systemd-run --user --scope -p CPUQuota -p MemoryMax` when available,
 *   otherwise `prlimit --as`; always `nice -n 19` and `ionice -c3`; wall-clock timeout; the
 *   whole process group is killed on cancel or timeout.
 * - One job at a time (TrainingJob.activeLock), lease + heartbeat, and jobs left running by
 *   a dead worker are marked `interrupted`, never silently resumed.
 * - The dataset is materialised from the immutable manifest and its hash re-checked.
 * - Output is a candidate model only; activation is a separate, approved admin action.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const logger = require('../../utils/logger');
const TrainingJob = require('../../models/TrainingJob');
const DatasetVersion = require('../../models/DatasetVersion');
const OcrTrainingWorkerStatus = require('../../models/OcrTrainingWorkerStatus');
const { getOcrSettings } = require('./ocr-settings.service');
const { materializeDataset, verifyDatasetIntegrity } = require('./dataset.service');
const registry = require('./model-registry.service');
const { evaluateCandidate } = require('./model-evaluation.service');

const LEASE_MS = 2 * 60 * 1000;
const HEARTBEAT_MS = 15 * 1000;
const MAX_LOG_BYTES = 5 * 1024 * 1024;
const KILL_GRACE_MS = 10 * 1000;
const WORKER_ID = `${os.hostname()}:${process.pid}`;

function getTrainingPaths() {
  return {
    tesstrainDir: path.resolve(process.env.OCR_TESSTRAIN_DIR || '/opt/tesstrain'),
    tessdataDir: path.resolve(process.env.OCR_TRAINING_TESSDATA_DIR || '/opt/tessdata_best'),
    workRoot: path.resolve(process.env.OCR_TRAINING_WORK_DIR || path.join(os.tmpdir(), 'hellorun-ocr-training'))
  };
}

function execVersion(file, args, execFile = childProcess.execFile) {
  return new Promise((resolve) => {
    execFile(file, args, { timeout: 10_000 }, (error, stdout, stderr) => {
      if (error) return resolve(null);
      resolve(String(stdout || stderr || '').split('\n')[0].trim().slice(0, 120) || 'present');
    });
  });
}

async function detectTools({ execFile } = {}) {
  const [tesseract, lstmtraining, make, systemdRun, prlimit, nice, ionice] = await Promise.all([
    execVersion('tesseract', ['--version'], execFile),
    execVersion('lstmtraining', ['--version'], execFile),
    execVersion('make', ['--version'], execFile),
    execVersion('systemd-run', ['--version'], execFile),
    execVersion('prlimit', ['--version'], execFile),
    execVersion('nice', ['--version'], execFile),
    execVersion('ionice', ['--version'], execFile)
  ]);
  return { tesseract, lstmtraining, make, systemdRun, prlimit, nice, ionice };
}

function freeDiskMb(dir, statfs = fs.statfsSync) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const stats = statfs(dir);
    return Math.floor((Number(stats.bavail) * Number(stats.bsize)) / (1024 * 1024));
  } catch (_) {
    return null;
  }
}

/** Every check must pass before a job may run. Values are reported to the admin page. */
function evaluatePreflight({ tools, paths, settings, freeDisk, freeMemMb, existsSync = fs.existsSync }) {
  const training = settings.training || {};
  const checks = [
    { id: 'tesseract_installed', passed: Boolean(tools.tesseract), detail: tools.tesseract || 'tesseract not found on PATH' },
    { id: 'lstmtraining_installed', passed: Boolean(tools.lstmtraining), detail: tools.lstmtraining || 'lstmtraining not found on PATH' },
    { id: 'make_installed', passed: Boolean(tools.make), detail: tools.make || 'make not found' },
    { id: 'tesstrain_present', passed: existsSync(path.join(paths.tesstrainDir, 'Makefile')), detail: paths.tesstrainDir },
    { id: 'start_model_present', passed: existsSync(path.join(paths.tessdataDir, 'eng.traineddata')), detail: path.join(paths.tessdataDir, 'eng.traineddata') },
    { id: 'resource_limiter', passed: Boolean(tools.systemdRun || tools.prlimit), detail: tools.systemdRun ? 'systemd-run scope' : (tools.prlimit ? 'prlimit address-space limit' : 'neither systemd-run nor prlimit available') },
    { id: 'low_priority', passed: Boolean(tools.nice), detail: tools.nice ? 'nice -n 19' : 'nice not available' },
    { id: 'free_disk', passed: freeDisk !== null && freeDisk >= Number(training.minFreeDiskMb || 0), detail: `${freeDisk === null ? 'unknown' : freeDisk} MB free / ${training.minFreeDiskMb} MB required` },
    { id: 'free_memory', passed: freeMemMb >= Math.min(Number(training.memoryMaxMb || 0), 1024), detail: `${freeMemMb} MB free` }
  ];
  return { passed: checks.every((check) => check.passed), checks, checkedAt: new Date() };
}

async function runPreflight(deps = {}) {
  const settings = deps.settings || await getOcrSettings({ fresh: true });
  const paths = deps.paths || getTrainingPaths();
  const tools = deps.tools || await detectTools(deps);
  const freeDisk = freeDiskMb(paths.workRoot, deps.statfs);
  const freeMemMb = Math.floor((deps.freemem || os.freemem)() / (1024 * 1024));
  return { ...evaluatePreflight({ tools, paths, settings, freeDisk, freeMemMb, existsSync: deps.existsSync }), tools };
}

const SAFE_VALUE = /^[A-Za-z0-9_./-]+$/;

/** Build the trainer command as a fixed argument array. */
function buildTrainingCommand({ tools, config, paths, modelName, groundTruthDir, dataDir }) {
  for (const value of [modelName, groundTruthDir, dataDir, paths.tesstrainDir, paths.tessdataDir]) {
    if (!SAFE_VALUE.test(String(value))) throw new Error(`Unsafe training path or name: ${value}`);
  }
  const iterations = Math.max(100, Math.min(100_000, Number.parseInt(config.maxIterations, 10) || 2000));
  const make = [
    'make', '-C', paths.tesstrainDir, 'training',
    `MODEL_NAME=${modelName}`,
    'START_MODEL=eng',
    `TESSDATA=${paths.tessdataDir}`,
    `GROUND_TRUTH_DIR=${groundTruthDir}`,
    `DATA_DIR=${dataDir}`,
    `MAX_ITERATIONS=${iterations}`
  ];
  const priority = [];
  if (tools.nice) priority.push('nice', '-n', '19');
  if (tools.ionice) priority.push('ionice', '-c3');
  let limiter = 'none';
  let prefix = [];
  if (tools.systemdRun) {
    limiter = 'systemd-run';
    prefix = ['systemd-run', '--user', '--scope', '--quiet', '-p', `CPUQuota=${Number(config.cpuQuotaPercent)}%`, '-p', `MemoryMax=${Number(config.memoryMaxMb)}M`];
  } else if (tools.prlimit) {
    limiter = 'prlimit';
    prefix = ['prlimit', `--as=${Number(config.memoryMaxMb) * 1024 * 1024}`, '--'];
  }
  const argv = [...prefix, ...priority, ...make];
  return { file: argv[0], args: argv.slice(1), limiter, argv };
}

function processGroupRssMb(pgid) {
  if (process.platform !== 'linux') return null;
  let pages = 0;
  try {
    for (const entry of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(entry)) continue;
      try {
        const stat = fs.readFileSync(`/proc/${entry}/stat`, 'utf8');
        const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
        if (Number(fields[2]) !== pgid) continue;
        pages += Number(fields[21]) || 0;
      } catch (_) { /* process exited */ }
    }
  } catch (_) {
    return null;
  }
  return Math.round((pages * 4096) / (1024 * 1024));
}

/**
 * Run the trainer as its own process group. Resolves; never rejects.
 * @returns {{ exitCode, signal, cancelled, timedOut, durationSeconds, peakRssMb }}
 */
function runProcess({ file, args, cwd, timeoutMs, logFile, shouldCancel, onTick, spawn = childProcess.spawn, tickMs = HEARTBEAT_MS }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const log = fs.openSync(logFile, 'a');
    let logged = 0;
    let peakRssMb = null;
    let cancelled = false;
    let timedOut = false;
    let settled = false;
    const child = spawn(file, args, { cwd, detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, OMP_THREAD_LIMIT: '1' } });
    const write = (chunk) => {
      if (logged >= MAX_LOG_BYTES) return;
      const slice = chunk.subarray(0, MAX_LOG_BYTES - logged);
      logged += slice.length;
      fs.writeSync(log, slice);
    };
    child.stdout?.on('data', write);
    child.stderr?.on('data', write);
    const killGroup = (signal) => {
      try { process.kill(-child.pid, signal); } catch (_) { try { child.kill(signal); } catch (__) { /* gone */ } }
    };
    const stop = (reason) => {
      if (reason === 'cancel') cancelled = true;
      if (reason === 'timeout') timedOut = true;
      killGroup('SIGTERM');
      setTimeout(() => killGroup('SIGKILL'), KILL_GRACE_MS).unref();
    };
    const tick = setInterval(async () => {
      const rss = processGroupRssMb(child.pid);
      if (rss !== null) peakRssMb = Math.max(peakRssMb || 0, rss);
      if (Date.now() - started > timeoutMs && !timedOut) stop('timeout');
      try {
        if (!cancelled && await shouldCancel()) stop('cancel');
        if (onTick) await onTick({ elapsedSeconds: Math.round((Date.now() - started) / 1000), peakRssMb });
      } catch (_) { /* heartbeat failures are retried next tick */ }
    }, tickMs);
    const finish = (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearInterval(tick);
      fs.closeSync(log);
      resolve({ exitCode, signal, cancelled, timedOut, durationSeconds: Math.round((Date.now() - started) / 1000), peakRssMb });
    };
    child.on('error', (error) => {
      write(Buffer.from(`\n[runner] spawn failed: ${error.message}\n`));
      finish(-1, null);
    });
    child.on('close', finish);
  });
}

async function claimTrainingJob({ now = new Date(), workerId = WORKER_ID } = {}) {
  return TrainingJob.findOneAndUpdate(
    { status: 'queued', cancelRequested: { $ne: true } },
    { $set: { status: 'preparing', claimedBy: workerId, startedAt: now, heartbeatAt: now, leaseExpiresAt: new Date(now.getTime() + LEASE_MS), 'progress.phase': 'preparing' } },
    { new: true, sort: { createdAt: 1 } }
  );
}

/** A job whose worker stopped heart-beating is closed as interrupted (explicit recovery). */
async function recoverInterruptedJobs({ now = new Date() } = {}) {
  const result = await TrainingJob.updateMany(
    { status: { $in: ['preparing', 'training', 'evaluating'] }, leaseExpiresAt: { $lte: now } },
    { $set: { status: 'interrupted', errorCode: 'worker_lost', errorSummary: 'The training worker stopped before the job finished. Start a new job to retry.', finishedAt: now }, $unset: { activeLock: 1 } }
  );
  return Number(result.modifiedCount || 0);
}

async function heartbeat(job, fields = {}) {
  const now = new Date();
  return TrainingJob.findOneAndUpdate(
    { _id: job._id, claimedBy: job.claimedBy },
    { $set: { heartbeatAt: now, leaseExpiresAt: new Date(now.getTime() + LEASE_MS), ...fields } },
    { new: true }
  ).lean();
}

async function finishJob(job, status, fields = {}) {
  return TrainingJob.findOneAndUpdate(
    { _id: job._id, claimedBy: job.claimedBy },
    { $set: { status, finishedAt: new Date(), leaseExpiresAt: null, ...fields }, $unset: { activeLock: 1 } },
    { new: true }
  ).lean();
}

async function reportWorkerStatus({ preflight, now = new Date() }) {
  return OcrTrainingWorkerStatus.findOneAndUpdate(
    { key: 'training-worker' },
    { $set: { hostname: os.hostname(), pid: process.pid, lastSeenAt: now, preflight: { passed: preflight.passed, checks: preflight.checks, checkedAt: preflight.checkedAt }, toolVersions: preflight.tools } },
    { upsert: true, new: true }
  );
}

function defaultStorage() {
  const upload = require('../upload.service');
  return {
    put: upload.putPrivateObjectToR2,
    read: (key) => upload.getObjectBufferFromR2(key, { bucket: upload.getPrivateBucketName(), maxBytes: 5 * 1024 * 1024 })
  };
}

/** Line recogniser for one model, used by evaluation. Real tesseract.js by default. */
async function defaultCreateLineRecognizer(language) {
  const { createWorker } = require('tesseract.js');
  const worker = await createWorker(language.lang, 1, { langPath: language.langPath, gzip: language.gzip !== false, cacheMethod: 'none', logger: () => {} });
  await worker.setParameters({ tessedit_pageseg_mode: '7' });
  return {
    recognize: async (buffer) => String((await worker.recognize(buffer))?.data?.text || ''),
    close: () => worker.terminate().catch(() => {})
  };
}

async function emitEvent(deps, eventType, payload) {
  try {
    const notify = deps.notify || require('./ocr-notification.service').emitOcrEvent;
    await notify(eventType, payload);
  } catch (error) {
    logger.warn('[training-runner] notification failed (job unaffected)', { eventType, error: error?.message });
  }
}

/**
 * Run one claimed job to a terminal state. Returns the final job document.
 * deps: { runProcess, storage, createLineRecognizer, preflight, paths, settings, notify }
 */
async function runTrainingJob(job, deps = {}) {
  const paths = deps.paths || getTrainingPaths();
  const storage = deps.storage || defaultStorage();
  const run = deps.runProcess || runProcess;
  const createLineRecognizer = deps.createLineRecognizer || defaultCreateLineRecognizer;
  const settings = deps.settings || await getOcrSettings({ fresh: true });
  const workDir = path.join(paths.workRoot, String(job._id));
  const modelName = `hellorun_${String(job._id).slice(-8)}`;
  const isCancelled = async () => Boolean((await TrainingJob.findById(job._id).select('cancelRequested').lean())?.cancelRequested);
  const fail = async (errorCode, errorSummary, extra = {}) => {
    const finished = await finishJob(job, 'failed', { errorCode, errorSummary: String(errorSummary).slice(0, 500), ...extra });
    await emitEvent(deps, 'ocr.training_failed', { jobId: String(job._id), requestedBy: String(job.requestedBy || ''), errorCode });
    return finished;
  };

  try {
    const preflight = deps.preflight || await runPreflight({ settings, paths });
    await heartbeat(job, { preflight: { passed: preflight.passed, checks: preflight.checks }, environment: { tools: preflight.tools, node: process.version, hostname: os.hostname() } });
    if (!preflight.passed) return fail('preflight_failed', preflight.checks.filter((c) => !c.passed).map((c) => `${c.id}: ${c.detail}`).join('; '));

    const dataset = await DatasetVersion.findById(job.datasetVersionId).lean();
    if (!dataset || dataset.manifestHash !== job.datasetManifestHash || !verifyDatasetIntegrity(dataset)) {
      return fail('dataset_changed', 'The dataset snapshot is missing or no longer matches the hash recorded on the job.');
    }
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.mkdirSync(workDir, { recursive: true });
    const materialized = await materializeDataset(dataset, path.join(workDir, 'dataset'), { readObject: storage.read });
    if (await isCancelled()) return finishJob(job, 'cancelled', { errorCode: 'cancelled' });

    await heartbeat(job, { status: 'training', 'progress.phase': 'training', 'progress.message': `${materialized.written.train + materialized.written.validation} training lines` });
    const dataDir = path.join(workDir, 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    const command = buildTrainingCommand({ tools: preflight.tools, config: job.config, paths, modelName, groundTruthDir: materialized.groundTruthDir, dataDir });
    const logFile = path.join(workDir, 'training.log');
    fs.writeFileSync(logFile, `[runner] ${new Date().toISOString()} ${command.argv.join(' ')}\n`);
    const processResult = await run({
      file: command.file,
      args: command.args,
      cwd: paths.tesstrainDir,
      timeoutMs: Number(job.config.timeoutMinutes) * 60 * 1000,
      logFile,
      shouldCancel: isCancelled,
      onTick: ({ elapsedSeconds, peakRssMb }) => heartbeat(job, { 'progress.message': `training ${elapsedSeconds}s`, 'resources.peakRssMb': peakRssMb })
    });
    const logsKey = `ocr-training/logs/${String(job._id)}.log`;
    await storage.put({ key: logsKey, body: fs.readFileSync(logFile), contentType: 'text/plain' }).catch(() => {});
    const resources = { peakRssMb: processResult.peakRssMb, durationSeconds: processResult.durationSeconds, limiter: command.limiter };
    if (processResult.cancelled) return finishJob(job, 'cancelled', { errorCode: 'cancelled', logsKey, resources });
    if (processResult.timedOut) return fail('timeout', `Training exceeded ${job.config.timeoutMinutes} minutes and was stopped.`, { logsKey, resources });
    if (processResult.exitCode !== 0) return fail('trainer_failed', `Trainer exited with code ${processResult.exitCode}${processResult.signal ? ` (${processResult.signal})` : ''}. See the job log.`, { logsKey, resources });

    const outputFile = path.join(dataDir, `${modelName}.traineddata`);
    if (!fs.existsSync(outputFile)) return fail('no_model_output', 'The trainer finished but produced no traineddata file.', { logsKey, resources });
    const artifact = fs.readFileSync(outputFile);
    const checksum = crypto.createHash('sha256').update(artifact).digest('hex');
    const artifactKey = `ocr-models/${String(job._id)}/${modelName}.traineddata`;
    await storage.put({ key: artifactKey, body: artifact, contentType: 'application/octet-stream' });
    const model = await registry.registerCandidate({
      label: `${modelName} (${dataset.name})`,
      langCode: modelName,
      artifactKey,
      checksum,
      sizeBytes: artifact.length,
      parentModelId: job.startModelVersionId,
      datasetVersionId: dataset._id,
      datasetManifestHash: dataset.manifestHash,
      trainingJobId: job._id,
      toolVersions: preflight.tools
    });

    await heartbeat(job, { status: 'evaluating', 'progress.phase': 'evaluating', resultModelVersionId: model._id, logsKey, resources });
    const testEntries = [];
    for (const entry of dataset.manifest.filter((item) => item.split === 'test')) {
      testEntries.push({ ...entry, image: fs.readFileSync(path.join(materialized.testDir, `${String(entry.sampleId).replace(/[^a-f0-9]/gi, '')}.png`)) });
    }
    const baselineLanguage = await registry.resolveLanguage();
    const candidate = await createLineRecognizer({ lang: modelName, langPath: dataDir, gzip: false, modelVersionId: String(model._id) });
    const baseline = await createLineRecognizer(baselineLanguage);
    let evaluation;
    try {
      evaluation = await evaluateCandidate({
        entries: testEntries,
        recognizeCandidate: candidate.recognize,
        recognizeBaseline: baseline.recognize,
        thresholds: settings.evaluation || {},
        baselineModelId: baselineLanguage.modelVersionId
      });
    } finally {
      await candidate.close();
      await baseline.close();
    }
    await registry.recordEvaluation(model._id, evaluation);
    const done = await finishJob(job, 'completed', { resultModelVersionId: model._id, logsKey, resources, 'progress.phase': 'completed', 'progress.percent': 100 });
    await emitEvent(deps, 'ocr.training_completed', { jobId: String(job._id), modelId: String(model._id), requestedBy: String(job.requestedBy || ''), passed: evaluation.passed });
    if (evaluation.passed) await emitEvent(deps, 'ocr.model_approval_needed', { modelId: String(model._id) });
    return done;
  } catch (error) {
    logger.error('[training-runner] job failed', { jobId: String(job._id), error: error?.message || String(error) });
    return fail(error?.code === 'checksum_mismatch' ? 'dataset_checksum_mismatch' : 'runner_error', error?.message || 'Training failed.');
  } finally {
    if (!deps.keepWorkDir) fs.rmSync(path.join(workDir, 'dataset'), { recursive: true, force: true });
  }
}

module.exports = {
  WORKER_ID,
  LEASE_MS,
  getTrainingPaths,
  detectTools,
  evaluatePreflight,
  runPreflight,
  buildTrainingCommand,
  runProcess,
  claimTrainingJob,
  recoverInterruptedJobs,
  heartbeat,
  finishJob,
  reportWorkerStatus,
  runTrainingJob
};
