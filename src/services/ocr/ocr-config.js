'use strict';

/**
 * Feature flags and resource limits for the server OCR stack
 * (docs/improvement-plan/ocr-platform-aware). Every flag defaults to off, which
 * leaves run-proof submission exactly as it was before this work.
 *
 * Read on every call so tests and operators can flip a flag without a restart
 * of the module graph.
 */

function readFlag(name) {
  const value = String(process.env[name] || '').trim().toLowerCase();
  return value === 'true' || value === '1';
}

function readPositiveInt(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const numeric = Number.parseInt(String(process.env[name] ?? ''), 10);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

const OCR_FLAGS = Object.freeze([
  'OCR_SERVER_PIPELINE_ENABLED',
  'OCR_SERVER_AUTO_APPROVAL_ENABLED',
  'ACTIVITY_URL_ENABLED',
  'OCR_TRAINING_CONSENT_PROMPT_ENABLED',
  'OCR_TRAINING_ENABLED',
  'OCR_REMINDERS_ENABLED'
]);

function isServerOcrPipelineEnabled() {
  return readFlag('OCR_SERVER_PIPELINE_ENABLED');
}

/** Server auto-approval only makes sense when the pipeline that feeds it runs. */
function isServerOcrAutoApprovalEnabled() {
  return isServerOcrPipelineEnabled() && readFlag('OCR_SERVER_AUTO_APPROVAL_ENABLED');
}

function isActivityUrlEnabled() {
  return readFlag('ACTIVITY_URL_ENABLED');
}

function isTrainingConsentPromptEnabled() {
  return readFlag('OCR_TRAINING_CONSENT_PROMPT_ENABLED');
}

function isTrainingEnabled() {
  return readFlag('OCR_TRAINING_ENABLED');
}

function isRemindersEnabled() {
  return readFlag('OCR_REMINDERS_ENABLED');
}

/**
 * `inline` (default) runs the extraction worker inside the web process.
 * `separate` leaves it to `npm run ocr:worker` under its own PM2 process.
 */
function getOcrWorkerMode() {
  return String(process.env.OCR_WORKER_MODE || '').trim().toLowerCase() === 'separate' ? 'separate' : 'inline';
}

function getOcrLimits() {
  return {
    maxInputPixels: readPositiveInt('OCR_MAX_INPUT_PIXELS', 40_000_000, { min: 1_000_000, max: 100_000_000 }),
    maxProofBytes: readPositiveInt('OCR_MAX_PROOF_BYTES', 10 * 1024 * 1024, { min: 256 * 1024, max: 30 * 1024 * 1024 }),
    workingMaxDimension: readPositiveInt('OCR_WORKING_MAX_DIMENSION', 1600, { min: 800, max: 4000 }),
    maxPasses: readPositiveInt('OCR_MAX_PASSES', 3, { min: 1, max: 4 }),
    recognitionTimeoutMs: readPositiveInt('OCR_RECOGNITION_TIMEOUT_MS', 45_000, { min: 5_000, max: 300_000 }),
    jobTimeoutMs: readPositiveInt('OCR_JOB_TIMEOUT_MS', 120_000, { min: 10_000, max: 900_000 }),
    workerRecycleAfterJobs: readPositiveInt('OCR_WORKER_RECYCLE_AFTER_JOBS', 50, { min: 1, max: 10_000 }),
    workerIdleTerminateMs: readPositiveInt('OCR_WORKER_IDLE_MS', 5 * 60 * 1000, { min: 10_000, max: 24 * 60 * 60 * 1000 }),
    pollIntervalMs: readPositiveInt('OCR_WORKER_INTERVAL_MS', 15_000, { min: 1_000, max: 10 * 60 * 1000 }),
    jobsPerCycle: readPositiveInt('OCR_WORKER_JOBS_PER_CYCLE', 3, { min: 1, max: 50 }),
    jobLeaseMs: readPositiveInt('OCR_JOB_LEASE_MS', 5 * 60 * 1000, { min: 30_000, max: 60 * 60 * 1000 }),
    maxJobAttempts: readPositiveInt('OCR_JOB_MAX_ATTEMPTS', 3, { min: 1, max: 10 })
  };
}

module.exports = {
  OCR_FLAGS,
  readFlag,
  readPositiveInt,
  isServerOcrPipelineEnabled,
  isServerOcrAutoApprovalEnabled,
  isActivityUrlEnabled,
  isTrainingConsentPromptEnabled,
  isTrainingEnabled,
  isRemindersEnabled,
  getOcrWorkerMode,
  getOcrLimits
};
