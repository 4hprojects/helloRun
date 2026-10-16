'use strict';

/**
 * One long-lived tesseract.js worker for server OCR.
 *
 * tesseract.js runs recognition in its own worker thread, so the event loop
 * stays free; this module makes sure there is only ever one such thread, that
 * calls are serialised, that each call has a timeout, and that the thread is
 * recycled after N jobs or an idle period so its memory is returned.
 *
 * The language data comes from `resolveLanguage()`. Until a trained model is
 * activated (Phase 4) that is the bundled base `eng` model.
 */

const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const logger = require('../../utils/logger');
const { getOcrLimits } = require('./ocr-config');

const BASE_TESSDATA_DIR = path.resolve(__dirname, '../../public/assets/tessdata');
const BASE_LANGUAGE = Object.freeze({ lang: 'eng', langPath: BASE_TESSDATA_DIR, gzip: true, modelVersionId: 'base-eng' });
const CACHE_DIR = path.join(os.tmpdir(), 'hellorun-ocr-cache');

class OcrEngineError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'OcrEngineError';
    this.code = code;
  }
}

let languageResolver = async () => BASE_LANGUAGE;

/** Phase 4 registers the model registry resolver here. */
function setLanguageResolver(resolver) {
  languageResolver = typeof resolver === 'function' ? resolver : async () => BASE_LANGUAGE;
}

function createEngine({ createWorker, limits = getOcrLimits() } = {}) {
  let worker = null;
  let workerLanguageKey = '';
  let jobsSinceStart = 0;
  let idleTimer = null;
  let chain = Promise.resolve();
  let busy = false;

  const loadCreateWorker = () => createWorker || require('tesseract.js').createWorker;

  function clearIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
  }

  async function terminate() {
    clearIdleTimer();
    const current = worker;
    worker = null;
    workerLanguageKey = '';
    jobsSinceStart = 0;
    if (current) await current.terminate().catch(() => {});
  }

  function scheduleIdleTerminate() {
    clearIdleTimer();
    idleTimer = setTimeout(() => {
      terminate().catch(() => {});
    }, limits.workerIdleTerminateMs);
    if (idleTimer.unref) idleTimer.unref();
  }

  async function ensureWorker(language) {
    const key = `${language.modelVersionId}|${language.langPath}|${language.lang}`;
    if (worker && (workerLanguageKey !== key || jobsSinceStart >= limits.workerRecycleAfterJobs)) {
      await terminate();
    }
    if (!worker) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      worker = await loadCreateWorker()(language.lang, 1, {
        langPath: language.langPath,
        gzip: language.gzip !== false,
        cachePath: CACHE_DIR,
        cacheMethod: 'none',
        logger: () => {}
      });
      workerLanguageKey = key;
    }
    return worker;
  }

  function withTimeout(promise, ms) {
    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new OcrEngineError('ocr_timeout', `OCR recognition exceeded ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  /**
   * Recognise one image buffer. Serialised: concurrent callers queue.
   * @returns {{ text, confidence, lines: Array<{text, confidence, bbox}>, modelVersionId }}
   */
  function recognize(buffer, { pageSegMode = '11' } = {}) {
    const run = async () => {
      busy = true;
      clearIdleTimer();
      try {
        const language = await languageResolver();
        const active = await ensureWorker(language);
        await active.setParameters({ tessedit_pageseg_mode: String(pageSegMode) });
        let result;
        try {
          result = await withTimeout(active.recognize(buffer), limits.recognitionTimeoutMs);
        } catch (error) {
          // A timed-out or crashed worker is not reused.
          await terminate();
          throw error.code ? error : new OcrEngineError('ocr_engine_failed', 'OCR engine failed.');
        }
        jobsSinceStart += 1;
        const data = result?.data || {};
        return {
          text: String(data.text || ''),
          confidence: Number(data.confidence) || 0,
          lines: (Array.isArray(data.lines) ? data.lines : []).map((line) => ({
            text: String(line.text || '').trim(),
            confidence: Number(line.confidence) || 0,
            bbox: line.bbox ? { x0: line.bbox.x0, y0: line.bbox.y0, x1: line.bbox.x1, y1: line.bbox.y1 } : null
          })),
          modelVersionId: language.modelVersionId
        };
      } finally {
        busy = false;
        scheduleIdleTerminate();
      }
    };
    const next = chain.then(run, run);
    chain = next.catch(() => {});
    return next;
  }

  return {
    recognize,
    terminate,
    isBusy: () => busy
  };
}

let sharedEngine = null;

function getSharedEngine() {
  if (!sharedEngine) sharedEngine = createEngine();
  return sharedEngine;
}

async function shutdownSharedEngine() {
  if (!sharedEngine) return;
  const engine = sharedEngine;
  sharedEngine = null;
  await engine.terminate().catch((error) => {
    logger.warn('[ocr-engine] terminate failed', { error: error?.message || String(error) });
  });
}

module.exports = {
  BASE_LANGUAGE,
  BASE_TESSDATA_DIR,
  OcrEngineError,
  createEngine,
  getSharedEngine,
  shutdownSharedEngine,
  setLanguageResolver
};
