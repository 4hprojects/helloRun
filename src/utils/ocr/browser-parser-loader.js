'use strict';

/**
 * Loads the browser OCR parser (src/public/js/ocr-proof-reader.js and its
 * helpers) into a Node vm context, the same way tests/ocr-proof-reader.unit.test.js
 * does, so server-side tooling scores exactly the parser runners use.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PUBLIC_JS_DIR = path.resolve(__dirname, '../../public/js');
const SUPPORT_FILES = [
  'ocr/ocr-source-detector.js',
  'ocr/ocr-confidence.js',
  'ocr/ocr-location-resolver.js'
];

function loadBrowserOcrParser() {
  const context = { window: {}, console: { debug: () => {} } };
  vm.createContext(context);
  for (const file of [...SUPPORT_FILES, 'ocr-proof-reader.js']) {
    vm.runInContext(fs.readFileSync(path.join(PUBLIC_JS_DIR, file), 'utf8'), context, { filename: file });
  }
  const reader = context.window.OcrProofReader;
  if (!reader || typeof reader._parseOcrText !== 'function') {
    throw new Error('Browser OCR parser did not expose OcrProofReader._parseOcrText');
  }
  return reader;
}

module.exports = { loadBrowserOcrParser };
