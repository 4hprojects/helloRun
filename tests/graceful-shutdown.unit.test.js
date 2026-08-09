'use strict';

// Stopping when the platform asks.
//
// Four workers register `process.once('SIGTERM', cleanup)` to clear their intervals. Any
// SIGTERM listener replaces Node's default disposition, which is to terminate — so the app
// cleared four timers on SIGTERM and then carried on serving, indefinitely. Verified by
// spawning it: still alive eight seconds after SIGTERM, while a bare HTTP server with the
// same spawn options exited in 7ms.
//
// In production that means the host asks the service to stop, waits out its entire
// shutdown grace period, then SIGKILLs it — dropping in-flight requests and making every
// deploy as slow as that timeout.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const server = read('src/server.js');

test('the app installs a shutdown that actually ends the process', () => {
  assert.match(server, /function installGracefulShutdown/);
  assert.match(server, /installGracefulShutdown\(server\)/);
  assert.match(server, /process\.on\('SIGTERM', \(\) => shutdown\('SIGTERM'\)\)/);
  assert.match(server, /process\.on\('SIGINT', \(\) => shutdown\('SIGINT'\)\)/);
  // The bit the workers' listeners never did.
  assert.match(server, /process\.exit\(0\)/);
});

test('it stops taking connections before it drops the databases', () => {
  // A request already in flight should be able to finish.
  const shutdown = server.slice(server.indexOf('function installGracefulShutdown'));
  const close = shutdown.indexOf('server.close');
  const mongo = shutdown.indexOf('mongoose.connection.close');
  const postgres = shutdown.indexOf('closePostgresClient');
  assert.ok(close > -1 && mongo > close, 'the HTTP server must close before Mongo');
  assert.ok(postgres > close, 'and before Postgres');
});

test('a connection that will not drain cannot hold the process open', () => {
  const shutdown = server.slice(server.indexOf('function installGracefulShutdown'));
  assert.match(shutdown, /FORCE_EXIT_MS = 10000/);
  assert.match(shutdown, /Timed out waiting for a clean close/);
  // Shorter than a platform kill timeout, so we exit on our own terms.
  assert.match(shutdown, /shorter than any platform's kill timeout/);
  // And a second signal must not start a second shutdown.
  assert.match(shutdown, /if \(shuttingDown\) return/);
});

test('the workers that caused this still clean up their timers', () => {
  // Their listeners are not the problem and are not removed — they simply were never
  // enough on their own.
  for (const worker of ['pg-sync-worker', 'communication-retry-worker', 'accumulated-certificate-worker']) {
    assert.match(read(`src/workers/${worker}.js`), /process\.once\('SIGTERM', cleanup\)/, worker);
  }
  assert.match(server, /The workers' own `process\.once\('SIGTERM', …\)` handlers still run/);
});

test('integration tests share one spawn helper that waits for exit', () => {
  // 41 files spawned the server inline and every one of them called kill() without
  // awaiting exit, so the runner was left holding a live handle each time.
  const helper = read('tests/helpers/test-server.js');
  assert.match(helper, /await exitPromise/);
  assert.match(helper, /wait for it to be gone, not just for the signal to be sent/);
  assert.match(helper, /child\.kill\('SIGKILL'\)/, 'a hung server must not hang the run');
  assert.match(helper, /if \(exited\) return/, 'stop must be idempotent');
});
