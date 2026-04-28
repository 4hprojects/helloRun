'use strict';

/**
 * Copies Tesseract.js browser assets from node_modules to src/public/js/vendor/tesseract/
 * so the OCR engine can be served entirely from our own server (no CDN at runtime).
 *
 * Run automatically via postinstall. Safe to re-run (overwrites existing files).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEST = path.join(ROOT, 'src', 'public', 'js', 'vendor', 'tesseract');

// Named files to copy from tesseract.js/dist/
const TESSERACT_DIST_FILES = ['tesseract.min.js', 'worker.min.js'];

// Copy everything from tesseract.js-core that looks like JS or WASM
const CORE_FILE_PATTERN = /\.(js|wasm)$/;

fs.mkdirSync(DEST, { recursive: true });

let copied = 0;

// --- tesseract.js dist files ---
const distDir = path.join(ROOT, 'node_modules', 'tesseract.js', 'dist');
for (const file of TESSERACT_DIST_FILES) {
  const src = path.join(distDir, file);
  const dest = path.join(DEST, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('[copy-tesseract-assets] Copied:', file);
    copied++;
  } else {
    console.warn('[copy-tesseract-assets] WARNING: not found:', src);
  }
}

// --- tesseract.js-core files ---
const coreDir = path.join(ROOT, 'node_modules', 'tesseract.js-core');
if (fs.existsSync(coreDir)) {
  const coreFiles = fs.readdirSync(coreDir).filter(f => CORE_FILE_PATTERN.test(f));
  if (coreFiles.length === 0) {
    console.warn('[copy-tesseract-assets] WARNING: no .js/.wasm files found in', coreDir);
  }
  for (const file of coreFiles) {
    const src = path.join(coreDir, file);
    const dest = path.join(DEST, file);
    fs.copyFileSync(src, dest);
    console.log('[copy-tesseract-assets] Copied:', file);
    copied++;
  }
} else {
  console.warn('[copy-tesseract-assets] WARNING: tesseract.js-core not found at', coreDir);
  console.warn('[copy-tesseract-assets] WASM core files not copied. OCR may fall back to CDN.');
}

console.log('[copy-tesseract-assets] Done. Copied', copied, 'files to', DEST);
