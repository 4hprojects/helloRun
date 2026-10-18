'use strict';

// Phase 4 of docs/improvement-plan/ocr-platform-aware — training command safety, resource
// limits, process control, evaluation gates and engine model switching. DB-free.
// No real tesstrain run happens here: the trainer is a small Node stand-in process.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const runner = require('../src/services/ocr/training-runner.service');
const { applyGates, compareModels } = require('../src/services/ocr/model-evaluation.service');
const { createEngine, setLanguageResolver, BASE_LANGUAGE } = require('../src/services/ocr/ocr-engine');
const config = require('../src/services/ocr/ocr-config');

const PATHS = { tesstrainDir: '/opt/tesstrain', tessdataDir: '/opt/tessdata_best', workRoot: '/tmp/x' };
const CONFIG = { maxIterations: 5000, timeoutMinutes: 60, cpuQuotaPercent: 100, memoryMaxMb: 2048, minFreeDiskMb: 1024 };

test('the trainer command is an argument array with resource limits and low priority', () => {
  const withSystemd = runner.buildTrainingCommand({
    tools: { systemdRun: 'systemd 255', prlimit: 'x', nice: 'x', ionice: 'x' },
    config: CONFIG, paths: PATHS, modelName: 'hellorun_abc123', groundTruthDir: '/tmp/x/job/dataset/ground-truth', dataDir: '/tmp/x/job/data'
  });
  assert.equal(withSystemd.file, 'systemd-run');
  assert.equal(withSystemd.limiter, 'systemd-run');
  assert.deepEqual(withSystemd.args.slice(0, 7), ['--user', '--scope', '--quiet', '-p', 'CPUQuota=100%', '-p', 'MemoryMax=2048M']);
  assert.ok(withSystemd.argv.includes('nice') && withSystemd.argv.includes('ionice'));
  assert.ok(withSystemd.argv.includes('MAX_ITERATIONS=5000'));
  assert.ok(withSystemd.argv.includes('START_MODEL=eng'));
  assert.ok(withSystemd.argv.every((arg) => typeof arg === 'string'));

  const withPrlimit = runner.buildTrainingCommand({ tools: { prlimit: 'x', nice: 'x' }, config: CONFIG, paths: PATHS, modelName: 'm', groundTruthDir: '/a', dataDir: '/b' });
  assert.equal(withPrlimit.file, 'prlimit');
  assert.equal(withPrlimit.args[0], `--as=${2048 * 1024 * 1024}`);

  const clamped = runner.buildTrainingCommand({ tools: {}, config: { ...CONFIG, maxIterations: 10_000_000 }, paths: PATHS, modelName: 'm', groundTruthDir: '/a', dataDir: '/b' });
  assert.ok(clamped.argv.includes('MAX_ITERATIONS=100000'));
  assert.equal(clamped.limiter, 'none');

  for (const unsafe of ['m; rm -rf /', 'm $(id)', 'm`id`', 'a b']) {
    assert.throws(() => runner.buildTrainingCommand({ tools: {}, config: CONFIG, paths: PATHS, modelName: unsafe, groundTruthDir: '/a', dataDir: '/b' }), /Unsafe/);
  }
  assert.throws(() => runner.buildTrainingCommand({ tools: {}, config: CONFIG, paths: { ...PATHS, tesstrainDir: '/opt/x;y' }, modelName: 'm', groundTruthDir: '/a', dataDir: '/b' }), /Unsafe/);
});

test('preflight fails closed on any missing tool, model, limiter or resource', () => {
  const settings = { training: CONFIG };
  const allTools = { tesseract: 'tesseract 5.3.4', lstmtraining: 'x', make: 'x', systemdRun: 'x', nice: 'x' };
  const pass = runner.evaluatePreflight({ tools: allTools, paths: PATHS, settings, freeDisk: 5000, freeMemMb: 4000, existsSync: () => true });
  assert.equal(pass.passed, true);
  const noTesseract = runner.evaluatePreflight({ tools: { ...allTools, tesseract: null }, paths: PATHS, settings, freeDisk: 5000, freeMemMb: 4000, existsSync: () => true });
  assert.equal(noTesseract.passed, false);
  assert.equal(noTesseract.checks.find((check) => check.id === 'tesseract_installed').passed, false);
  const noLimiter = runner.evaluatePreflight({ tools: { ...allTools, systemdRun: null }, paths: PATHS, settings, freeDisk: 5000, freeMemMb: 4000, existsSync: () => true });
  assert.equal(noLimiter.checks.find((check) => check.id === 'resource_limiter').passed, false);
  const lowDisk = runner.evaluatePreflight({ tools: allTools, paths: PATHS, settings, freeDisk: 10, freeMemMb: 4000, existsSync: () => true });
  assert.equal(lowDisk.checks.find((check) => check.id === 'free_disk').passed, false);
  const noModel = runner.evaluatePreflight({ tools: allTools, paths: PATHS, settings, freeDisk: 5000, freeMemMb: 4000, existsSync: () => false });
  assert.equal(noModel.passed, false);
});

function trainerScript(dir, body) {
  const file = path.join(dir, 'fake-trainer.js');
  fs.writeFileSync(file, body);
  return file;
}

test('process control: normal exit, timeout and cancellation kill the whole group', { timeout: 60000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-runner-'));
  try {
    const ok = trainerScript(dir, "console.log('training step'); process.exit(0);");
    const done = await runner.runProcess({ file: process.execPath, args: [ok], cwd: dir, timeoutMs: 10_000, logFile: path.join(dir, 'a.log'), shouldCancel: async () => false, tickMs: 50 });
    assert.equal(done.exitCode, 0);
    assert.match(fs.readFileSync(path.join(dir, 'a.log'), 'utf8'), /training step/);

    const slow = trainerScript(dir, "const { spawn } = require('child_process'); spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' }); setInterval(() => {}, 1000);");
    const timedOut = await runner.runProcess({ file: process.execPath, args: [slow], cwd: dir, timeoutMs: 200, logFile: path.join(dir, 'b.log'), shouldCancel: async () => false, tickMs: 50 });
    assert.equal(timedOut.timedOut, true);
    assert.notEqual(timedOut.exitCode, 0);

    let ticks = 0;
    const cancelled = await runner.runProcess({ file: process.execPath, args: [slow], cwd: dir, timeoutMs: 60_000, logFile: path.join(dir, 'c.log'), shouldCancel: async () => (ticks += 1) > 2, tickMs: 50 });
    assert.equal(cancelled.cancelled, true);

    const missing = await runner.runProcess({ file: path.join(dir, 'no-such-binary'), args: [], cwd: dir, timeoutMs: 1000, logFile: path.join(dir, 'd.log'), shouldCancel: async () => false, tickMs: 50 });
    assert.equal(missing.exitCode, -1);
    assert.match(fs.readFileSync(path.join(dir, 'd.log'), 'utf8'), /spawn failed/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the trainer log is capped', { timeout: 30000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-runner-'));
  try {
    const noisy = trainerScript(dir, "const line = 'x'.repeat(1024) + '\\n'; for (let i = 0; i < 8000; i++) process.stdout.write(line); process.exit(0);");
    await runner.runProcess({ file: process.execPath, args: [noisy], cwd: dir, timeoutMs: 20_000, logFile: path.join(dir, 'big.log'), shouldCancel: async () => false, tickMs: 100 });
    assert.ok(fs.statSync(path.join(dir, 'big.log')).size <= 5 * 1024 * 1024);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('evaluation gates fail closed and never pass on an aggregate gain alone', async () => {
  const entries = [
    ...Array.from({ length: 6 }, (_, i) => ({ platform: 'strava', layoutId: 'tall', transcribedText: `5.0${i} km`, image: Buffer.from(`s${i}`) })),
    ...Array.from({ length: 6 }, (_, i) => ({ platform: 'coros', layoutId: 'card', transcribedText: `10.${i}0 km`, image: Buffer.from(`c${i}`) }))
  ];
  const textFor = new Map(entries.map((entry) => [entry.image.toString(), entry.transcribedText]));
  // Candidate is perfect on Strava but worse than baseline on COROS.
  const comparison = await compareModels({
    entries,
    recognizeCandidate: async (image) => (image.toString().startsWith('s') ? textFor.get(image.toString()) : 'l0.x0 km'),
    recognizeBaseline: async (image) => (image.toString().startsWith('s') ? 'S.0 km' : textFor.get(image.toString()))
  });
  const approved = { maxPlatformCerRegression: 0, minEvaluationSamplesPerPlatform: 5, gatesApprovedByOwner: true };
  const result = applyGates(comparison, approved);
  assert.equal(result.passed, false, 'a COROS regression blocks the candidate');
  assert.ok(result.gates.find((gate) => gate.id === 'no_regression:coros/card' && !gate.passed));
  assert.ok(result.gates.find((gate) => gate.id === 'no_regression:strava/tall' && gate.passed));

  const allBetter = await compareModels({ entries, recognizeCandidate: async (image) => textFor.get(image.toString()), recognizeBaseline: async () => 'garbage' });
  assert.equal(applyGates(allBetter, approved).passed, true);
  assert.equal(applyGates(allBetter, { ...approved, gatesApprovedByOwner: false }).passed, false, 'unapproved thresholds never pass');
  assert.equal(applyGates(allBetter, { ...approved, minEvaluationSamplesPerPlatform: 10 }).passed, false, 'thin coverage never passes');
  const empty = await compareModels({ entries: [], recognizeCandidate: async () => '', recognizeBaseline: async () => '' });
  assert.equal(applyGates(empty, approved).passed, false);
});

test('the engine switches models when the registry changes and recycles the worker', async () => {
  const created = [];
  const fakeCreateWorker = async (lang, oem, options) => {
    created.push(`${lang}@${options.langPath}`);
    return { setParameters: async () => {}, recognize: async () => ({ data: { text: '', confidence: 0, lines: [] } }), terminate: async () => {} };
  };
  let language = BASE_LANGUAGE;
  setLanguageResolver(async () => language);
  try {
    const engine = createEngine({ createWorker: fakeCreateWorker, limits: { ...config.getOcrLimits(), workerIdleTerminateMs: 60_000 } });
    const first = await engine.recognize(Buffer.from('a'));
    assert.equal(first.modelVersionId, 'base-eng');
    await engine.recognize(Buffer.from('b'));
    language = { lang: 'hellorun_x', langPath: '/tmp/models/m1', gzip: false, modelVersionId: 'm1' };
    const switched = await engine.recognize(Buffer.from('c'));
    assert.equal(switched.modelVersionId, 'm1');
    assert.deepEqual(created, [`eng@${BASE_LANGUAGE.langPath}`, 'hellorun_x@/tmp/models/m1']);
    await engine.terminate();
  } finally {
    setLanguageResolver(null);
  }
});

test('deployment routes require the full admin tier; the web app never starts the trainer', () => {
  const routes = fs.readFileSync(path.join(ROOT, 'src/routes/admin-ocr-training.routes.js'), 'utf8');
  for (const route of ["'/models/:modelId/approve'", "'/models/:modelId/activate'", "'/models/rollback'"]) {
    assert.match(routes, new RegExp(`${route.replace(/[/:]/g, (c) => `\\${c}`)}, requireFullAdmin, ocrDeployLimiter`));
  }
  const server = fs.readFileSync(path.join(ROOT, 'src/server.js'), 'utf8');
  assert.doesNotMatch(server, /training-worker|training-runner|runTrainingJob/);
  const runnerSource = fs.readFileSync(path.join(ROOT, 'src/services/ocr/training-runner.service.js'), 'utf8');
  assert.doesNotMatch(runnerSource, /\bexec\(|execSync|shell:\s*true/);
});

test('models and jobs pages render safely with and without deploy rights', () => {
  const render = (name, locals) => {
    const file = path.join(ROOT, 'src/views/admin/ocr-training', `${name}.ejs`);
    const source = fs.readFileSync(file, 'utf8').replace(/<%-\s*include\('\.\.\/\.\.\/layouts\/[^%]+%>/g, '');
    return ejs.render(source, { title: 't', message: null, flags: [], formatDateTime: String, csrfToken: 'tok', ...locals }, { filename: file });
  };
  const model = {
    _id: 'm'.repeat(24), label: '<i>hellorun</i>', status: 'approved', checksum: 'c'.repeat(64), sizeBytes: 2048, datasetManifestHash: 'd'.repeat(64), parentModelId: 'base-eng', createdAt: new Date(),
    evaluation: { evaluatedAt: new Date(), testSampleCount: 12, overall: { candidate: { cer: 0.01 }, baseline: { cer: 0.05 } }, byPlatformLayout: { 'strava/tall': { candidate: { lines: 6, cer: 0 }, baseline: { lines: 6, cer: 0.1 } } }, gates: [{ id: 'g', passed: true, detail: 'ok' }] }
  };
  const common = { section: 'models', registry: { activeModelId: 'base-eng', previousModelId: '', version: 4 }, models: [model], deployments: [], loadFailures: { count: 0 } };
  const full = render('models', { ...common, canDeploy: true });
  assert.match(full, /Type ACTIVATE/);
  assert.match(full, /name="registryVersion" value="4"/);
  assert.doesNotMatch(full, /<i>hellorun<\/i>/);
  const support = render('models', { ...common, canDeploy: false });
  assert.doesNotMatch(support, /Type ACTIVATE/);
  assert.match(support, /A full administrator approves and activates models/);

  const jobs = render('jobs', {
    section: 'jobs', worker: { online: false, preflightPassed: false, row: null }, datasets: [], readyDatasets: [], jobs: [], active: null, trainingEnabled: false, idempotencyKey: 'k'.repeat(24)
  });
  assert.match(jobs, /Training is disabled/);
  assert.match(jobs, /name="idempotencyKey" value="k{24}"/);
  assert.match(jobs, /<button type="submit" class="btn" disabled>Start training<\/button>/);
});
