'use strict';

/**
 * Server-side OCR assist for organizer ID verification.
 *
 * Runs Tesseract on the uploaded ID image and reports whether the applicant's
 * account name appears in the document. The verdict is shown to the admin
 * reviewer as a pre-computed signal — it never approves or rejects on its own,
 * and an OCR failure must never block an application submission.
 *
 * Statuses (subset of the run-proof vocabulary in submission.service.js):
 * - matched:      every part of the account name was found in the ID text
 * - not_detected: OCR produced text but the account name was not found in it
 *                 (an ID scan can't distinguish "different person" from
 *                 "name unreadable", so there is deliberately no "mismatched")
 * - not_checked:  OCR could not run (unsupported file type, engine error)
 */

const path = require('path');
const logger = require('../utils/logger');

const ID_NAME_MATCH_STATUSES = ['matched', 'not_detected', 'not_checked'];
const NAME_PART_SIMILARITY_THRESHOLD = 0.75;
const TESSDATA_DIR = path.resolve(__dirname, '..', 'public', 'assets', 'tessdata');
const OCR_TIMEOUT_MS = Number(process.env.ID_OCR_TIMEOUT_MS || 30000);

// Same normalization as the client run-proof matcher (src/public/js/ocr/ocr-identity.js).
function normalizeName(value) {
  let safe = String(value || '').toLowerCase();
  if (typeof safe.normalize === 'function') {
    safe = safe.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  }
  return safe.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function charSimilarity(a, b) {
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  if (!longer.length) return 0;
  let matches = 0;
  for (let i = 0; i < shorter.length; i += 1) {
    if (longer[i] === shorter[i]) matches += 1;
  }
  return matches / longer.length;
}

/**
 * Scan the full OCR text for the account name instead of trying to extract
 * "the name line" — ID layouts vary too much for line extraction to be robust.
 */
function matchAccountNameInText(rawText, accountName) {
  const normalizedText = normalizeName(rawText);
  const normalizedAccount = normalizeName(accountName);

  if (!normalizedAccount) {
    return { status: 'not_checked', detectedName: '', reason: 'account_name_missing' };
  }
  if (!normalizedText) {
    return { status: 'not_detected', detectedName: '' };
  }

  if (normalizedText.includes(normalizedAccount)) {
    return { status: 'matched', detectedName: normalizedAccount };
  }

  const textWords = normalizedText.split(/\s+/).filter(Boolean);
  const accountParts = normalizedAccount.split(/\s+/).filter((part) => part.length >= 2);
  if (!accountParts.length) {
    return { status: 'not_checked', detectedName: '', reason: 'account_name_missing' };
  }

  const matchedWords = [];
  for (const part of accountParts) {
    let best = null;
    for (const word of textWords) {
      const similarity = charSimilarity(part, word);
      if (similarity >= NAME_PART_SIMILARITY_THRESHOLD && (!best || similarity > best.similarity)) {
        best = { word, similarity };
      }
    }
    if (!best) {
      return { status: 'not_detected', detectedName: '' };
    }
    matchedWords.push(best.word);
  }

  return { status: 'matched', detectedName: matchedWords.join(' ') };
}

async function defaultRecognize(buffer) {
  // Lazy-load: tesseract.js spawns workers; only pay the cost when an ID arrives.
  const { createWorker } = require('tesseract.js');
  const worker = await createWorker('eng', 1, {
    langPath: TESSDATA_DIR,
    gzip: true,
    logger: () => {}
  });
  try {
    const { data } = await worker.recognize(buffer);
    return data?.text || '';
  } finally {
    await worker.terminate().catch(() => {});
  }
}

function withTimeout(promise, ms) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`ID OCR timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * @param {{ buffer: Buffer, mimetype: string, accountName: string }} input
 * @param {{ recognize?: (buffer: Buffer) => Promise<string>, timeoutMs?: number }} options
 *   `recognize` is injectable for DB/engine-free unit tests.
 */
async function extractIdNameMatch(input = {}, options = {}) {
  const { buffer, mimetype, accountName } = input;

  if (!buffer || !buffer.length) {
    return { status: 'not_checked', detectedName: '', reason: 'no_file_buffer' };
  }
  if (String(mimetype || '') === 'application/pdf') {
    return { status: 'not_checked', detectedName: '', reason: 'pdf_not_supported' };
  }

  const recognize = options.recognize || defaultRecognize;
  const timeoutMs = Number(options.timeoutMs || OCR_TIMEOUT_MS);

  try {
    const text = await withTimeout(recognize(buffer), timeoutMs);
    return matchAccountNameInText(text, accountName);
  } catch (error) {
    logger.warn('[id-ocr] ID name-match OCR failed (submission continues):', {
      error: error?.message || String(error)
    });
    return { status: 'not_checked', detectedName: '', reason: 'ocr_error' };
  }
}

module.exports = {
  ID_NAME_MATCH_STATUSES,
  matchAccountNameInText,
  extractIdNameMatch
};
