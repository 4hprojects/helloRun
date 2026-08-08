'use strict';

/**
 * Downloads Tesseract.js English language data (eng.traineddata.gz) to
 * src/public/assets/tessdata/ so it can be served from our own server.
 *
 * Run automatically via postinstall. Skips download if the file already exists.
 *
 * This script must never fail a deploy. It fetches from a third-party host on every
 * install, and a missing OCR language pack should degrade OCR — Tesseract.js falls back to
 * the CDN at runtime — not block shipping the platform. So every path here ends in exit 0,
 * including the ones that used to throw: an unwritable directory, a rename across
 * filesystems, a stat on a file that vanished.
 *
 * The timeout matters as much as the error handling. Without one, a host that accepts the
 * connection and then never answers hangs `npm install` until the build platform gives up,
 * which is a slower and far more confusing failure than not having the file.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEST_DIR = path.join(ROOT, 'src', 'public', 'assets', 'tessdata');
const DEST_FILE = path.join(DEST_DIR, 'eng.traineddata.gz');
const MIN_VALID_TESSDATA_BYTES = 1024 * 1024;

// No single stage of this should be able to stall the whole install.
const REQUEST_TIMEOUT_MS = 60000;
const TOTAL_TIMEOUT_MS = 180000;

// Tessdata source — same URL Tesseract.js uses by default
const TESSDATA_URL = 'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz';

function giveUp(reason) {
  console.warn('[download-tessdata] ' + reason);
  console.warn('[download-tessdata] Language data not downloaded.');
  console.warn('[download-tessdata] To retry, run: npm run download-tessdata');
  console.warn('[download-tessdata] Without it, OCR falls back to fetching from the CDN.');
  process.exit(0); // non-fatal by design — see the note at the top of this file
}

function download(url, destPath, redirectCount, cb) {
  if (redirectCount > 5) {
    return cb(new Error('Too many redirects'));
  }

  const client = url.startsWith('https') ? https : http;

  // A callback that fires twice — a response error arriving after the stream finished, say
  // — would report both success and failure for one download.
  let settled = false;
  const done = (err) => {
    if (settled) return;
    settled = true;
    cb(err);
  };

  const request = client.get(url, function (res) {
    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
      const location = res.headers.location;
      res.resume(); // discard response body
      if (!location) return done(new Error('Redirect with no location from ' + url));
      console.log('[download-tessdata] Redirecting to', location);
      settled = true; // the retry owns the callback from here
      return download(location, destPath, redirectCount + 1, cb);
    }

    if (res.statusCode !== 200) {
      res.resume();
      return done(new Error('HTTP ' + res.statusCode + ' from ' + url));
    }

    const tmp = destPath + '.tmp';
    let out;
    try {
      out = fs.createWriteStream(tmp);
    } catch (err) {
      res.resume();
      return done(err);
    }

    res.pipe(out);

    out.on('finish', function () {
      out.close(function () {
        try {
          // Rename can fail even after a clean download — across a filesystem boundary, or
          // where the target directory is read-only in a hardened build image.
          fs.renameSync(tmp, destPath);
        } catch (err) {
          fs.unlink(tmp, function () {});
          return done(err);
        }
        done(null);
      });
    });

    out.on('error', function (err) {
      fs.unlink(tmp, function () {});
      done(err);
    });

    res.on('error', function (err) {
      fs.unlink(tmp, function () {});
      done(err);
    });
  });

  request.setTimeout(REQUEST_TIMEOUT_MS, function () {
    request.destroy();
    done(new Error('Timed out after ' + REQUEST_TIMEOUT_MS + 'ms waiting for ' + url));
  });

  request.on('error', done);
}

function main() {
  if (fs.existsSync(DEST_FILE)) {
    const size = fs.statSync(DEST_FILE).size;
    if (size >= MIN_VALID_TESSDATA_BYTES) {
      const sizeKb = Math.round(size / 1024);
      console.log('[download-tessdata] eng.traineddata.gz already exists (' + sizeKb + ' KB). Skipping download.');
      process.exit(0);
    }

    console.warn('[download-tessdata] Existing eng.traineddata.gz is too small. Re-downloading.');
    fs.unlinkSync(DEST_FILE);
  }

  fs.mkdirSync(DEST_DIR, { recursive: true });

  console.log('[download-tessdata] Downloading eng.traineddata.gz from', TESSDATA_URL);

  // A backstop for anything the per-request timeout cannot see, such as a response that
  // trickles bytes forever without ever going idle.
  const overall = setTimeout(function () {
    giveUp('Gave up after ' + TOTAL_TIMEOUT_MS + 'ms.');
  }, TOTAL_TIMEOUT_MS);
  overall.unref();

  download(TESSDATA_URL, DEST_FILE, 0, function (err) {
    clearTimeout(overall);
    if (err) return giveUp('ERROR: ' + err.message);

    try {
      const sizeKb = Math.round(fs.statSync(DEST_FILE).size / 1024);
      console.log('[download-tessdata] Done. ' + sizeKb + ' KB saved to ' + DEST_FILE);
    } catch (statError) {
      console.log('[download-tessdata] Done.');
    }
    return process.exit(0);
  });
}

// Nothing above — an unwritable directory, a broken symlink, a full disk — may exit
// non-zero, because npm treats that as a failed install.
process.on('uncaughtException', function (err) {
  giveUp('Unexpected error: ' + err.message);
});

try {
  main();
} catch (err) {
  giveUp('Setup failed: ' + err.message);
}
