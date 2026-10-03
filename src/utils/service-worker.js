// src/utils/service-worker.js
// Serves src/public/sw.js with a per-deploy version stamped in.
//
// Static files get a 1-day max-age in production, which is wrong for a service worker:
// browsers would keep installed users on an old worker (and its caches) after a deploy.
// The worker is therefore served by its own route with `no-cache`, and its cache name is
// tied to the deployed commit so each deploy activates a fresh worker that deletes the
// previous caches.

const fs = require('node:fs');
const path = require('node:path');
const { getBuildInfo } = require('./build-info');

const SW_SOURCE_PATH = path.join(__dirname, '..', 'public', 'sw.js');
const VERSION_PLACEHOLDER = '__HELLORUN_SW_VERSION__';

function resolveServiceWorkerVersion(buildInfo = getBuildInfo()) {
  if (buildInfo.commitShort && buildInfo.commitShort !== 'unknown') {
    return buildInfo.commitShort;
  }
  // No commit available (e.g. a tarball deploy without env vars): fall back to the
  // process start time so a restart after a deploy still produces a new worker.
  return `start-${Date.parse(buildInfo.startedAt) || 0}`;
}

function renderServiceWorker(source, version) {
  const safeVersion = String(version).replace(/[^A-Za-z0-9._-]/g, '');
  return source.split(VERSION_PLACEHOLDER).join(safeVersion);
}

let cachedBody = null;

function serveServiceWorker(req, res, next) {
  try {
    if (cachedBody === null) {
      const source = fs.readFileSync(SW_SOURCE_PATH, 'utf8');
      cachedBody = renderServiceWorker(source, resolveServiceWorkerVersion());
    }
  } catch (error) {
    return next(error);
  }
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Service-Worker-Allowed', '/');
  return res.send(cachedBody);
}

module.exports = {
  VERSION_PLACEHOLDER,
  resolveServiceWorkerVersion,
  renderServiceWorker,
  serveServiceWorker
};
