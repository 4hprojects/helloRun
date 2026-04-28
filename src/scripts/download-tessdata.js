'use strict';

/**
 * Downloads Tesseract.js English language data (eng.traineddata.gz) to
 * src/public/assets/tessdata/ so it can be served from our own server.
 *
 * Run automatically via postinstall. Skips download if the file already exists.
 * Exits 0 even on network failure to avoid blocking `npm install` in offline environments.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEST_DIR = path.join(ROOT, 'src', 'public', 'assets', 'tessdata');
const DEST_FILE = path.join(DEST_DIR, 'eng.traineddata.gz');

// Tessdata source — same URL Tesseract.js uses by default
const TESSDATA_URL = 'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz';

if (fs.existsSync(DEST_FILE)) {
  const sizeKb = Math.round(fs.statSync(DEST_FILE).size / 1024);
  console.log('[download-tessdata] eng.traineddata.gz already exists (' + sizeKb + ' KB). Skipping download.');
  process.exit(0);
}

fs.mkdirSync(DEST_DIR, { recursive: true });

console.log('[download-tessdata] Downloading eng.traineddata.gz from', TESSDATA_URL);

function download(url, destPath, redirectCount, cb) {
  if (redirectCount > 5) {
    return cb(new Error('Too many redirects'));
  }

  const client = url.startsWith('https') ? https : http;

  client.get(url, function (res) {
    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
      const location = res.headers.location;
      res.resume(); // discard response body
      console.log('[download-tessdata] Redirecting to', location);
      return download(location, destPath, redirectCount + 1, cb);
    }

    if (res.statusCode !== 200) {
      res.resume();
      return cb(new Error('HTTP ' + res.statusCode + ' from ' + url));
    }

    const tmp = destPath + '.tmp';
    const out = fs.createWriteStream(tmp);

    res.pipe(out);

    out.on('finish', function () {
      out.close(function () {
        fs.renameSync(tmp, destPath);
        cb(null);
      });
    });

    out.on('error', function (err) {
      fs.unlink(tmp, function () {});
      cb(err);
    });

    res.on('error', function (err) {
      fs.unlink(tmp, function () {});
      cb(err);
    });
  }).on('error', cb);
}

download(TESSDATA_URL, DEST_FILE, 0, function (err) {
  if (err) {
    console.error('[download-tessdata] ERROR:', err.message);
    console.warn('[download-tessdata] Language data not downloaded.');
    console.warn('[download-tessdata] To retry, run: npm run download-tessdata');
    console.warn('[download-tessdata] Without it, OCR will attempt to fetch from CDN as fallback.');
    process.exit(0); // non-fatal — don't break npm install
  }

  const sizeKb = Math.round(fs.statSync(DEST_FILE).size / 1024);
  console.log('[download-tessdata] Done. ' + sizeKb + ' KB saved to ' + DEST_FILE);
});
