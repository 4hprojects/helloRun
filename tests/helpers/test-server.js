'use strict';

/**
 * Start and stop the app for an integration test.
 *
 * Forty-one test files spawned `src/server.js` inline, every one of them ending with
 * `serverProc.kill('SIGTERM')` and not one of them waiting for the process to actually
 * exit. `kill` only delivers a signal — it returns immediately, so the test finished while
 * the child was still shutting down and the runner was left holding a live handle. That is
 * the "server-spawning test open handles" problem, and it is the same shape in all 41
 * files, which is why it belongs in one place instead.
 *
 * What this adds over the pattern it replaces:
 *   - teardown awaits the child's `exit`, so the handle is gone before the test ends;
 *   - a SIGKILL fallback, because a hung server would otherwise hang the whole run;
 *   - the readiness poll every file had its own copy of.
 *
 *   const { startTestServer } = require('./helpers/test-server');
 *   let server;
 *   test.before(async () => { server = await startTestServer({ port: 3114 }); });
 *   test.after(async () => { await server.stop(); });
 *   // server.baseUrl
 */

const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

// Long enough for a cold boot with a remote database, short enough that a genuinely stuck
// server fails the run rather than hanging it.
const READY_ATTEMPTS = 40;
const READY_INTERVAL_MS = 250;
// A server that ignores SIGTERM gets SIGKILL rather than stalling the suite.
const EXIT_GRACE_MS = 5000;

async function waitForServerReady(baseUrl) {
  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/`);
      // Any answer at all means it is listening; the status is the test's business.
      if (response.status >= 200 && response.status < 500) return;
    } catch (error) {
      // Still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, READY_INTERVAL_MS));
  }
  throw new Error(`Server did not become ready at ${baseUrl}`);
}

/**
 * @param {Object} [options]
 * @param {number} [options.port]
 * @param {Object} [options.env] - merged over process.env
 * @returns {Promise<{baseUrl: string, process: import('node:child_process').ChildProcess, stop: () => Promise<void>}>}
 */
async function startTestServer(options = {}) {
  const port = Number(options.port || process.env.TEST_PORT || 3110);
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), ...(options.env || {}) },
    stdio: ['ignore', 'ignore', 'ignore']
  });

  // A spawn that fails outright (bad path, no permission) would otherwise surface as a
  // readiness timeout forty seconds later, which says nothing useful.
  const spawnFailure = new Promise((resolve, reject) => {
    child.once('error', reject);
    setTimeout(resolve, 0);
  });
  await spawnFailure;

  let exited = false;
  const exitPromise = new Promise((resolve) => child.once('exit', resolve));
  child.once('exit', () => {
    exited = true;
  });

  try {
    await waitForServerReady(baseUrl);
  } catch (error) {
    // Do not leave a half-started process behind on a failed boot.
    await stop();
    throw error;
  }

  async function stop() {
    if (exited) return;

    child.kill('SIGTERM');

    // The point of this helper: wait for it to be gone, not just for the signal to be sent.
    const killed = await Promise.race([
      exitPromise.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), EXIT_GRACE_MS))
    ]);

    if (!killed) {
      child.kill('SIGKILL');
      await exitPromise;
    }
  }

  return { baseUrl, port, process: child, stop };
}

module.exports = { startTestServer, waitForServerReady };
