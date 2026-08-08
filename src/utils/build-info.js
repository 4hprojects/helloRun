// src/utils/build-info.js
// Which build is this?
//
// There was no way to ask the running app what code it was on. A deploy was reported as
// verified on the strength of a route returning 302 — but that mount answers 302 for any
// path, deployed or not, so it proved nothing. `/healthz` now answers the question
// directly, and a wrong answer is visible rather than inferred.
//
// Resolved once at startup: the commit cannot change without a restart, and reading the
// filesystem on every health check would be pointless work on the busiest endpoint.

const fs = require('node:fs');
const path = require('node:path');

const STARTED_AT = new Date();

/**
 * Read the checked-out commit from `.git` without shelling out.
 *
 * Only useful in development — a platform build usually deploys a tarball with no `.git`
 * at all, which is why the environment variables are tried first.
 */
function readCommitFromGitDir() {
  try {
    const gitDir = path.resolve(__dirname, '..', '..', '.git');
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();

    // Detached HEAD holds the SHA directly; otherwise it points at a ref to follow.
    if (!head.startsWith('ref:')) return head;

    const ref = head.slice(4).trim();
    try {
      return fs.readFileSync(path.join(gitDir, ref), 'utf8').trim();
    } catch (_) {
      // A packed ref, once the loose file has been gc'd.
      const packed = fs.readFileSync(path.join(gitDir, 'packed-refs'), 'utf8');
      const line = packed.split('\n').find((entry) => entry.endsWith(` ${ref}`));
      return line ? line.split(' ')[0] : '';
    }
  } catch (_) {
    return '';
  }
}

function resolveCommit() {
  // RENDER_GIT_COMMIT is what production actually sets; the others cost nothing and keep
  // this honest anywhere else it runs.
  const fromEnv =
    process.env.RENDER_GIT_COMMIT ||
    process.env.SOURCE_VERSION ||
    process.env.GIT_COMMIT ||
    process.env.COMMIT_SHA ||
    '';
  return String(fromEnv || readCommitFromGitDir()).trim();
}

const COMMIT = resolveCommit();

const BUILD_INFO = Object.freeze({
  commit: COMMIT || 'unknown',
  // Enough to recognise at a glance, and what a git log shows.
  commitShort: COMMIT ? COMMIT.slice(0, 7) : 'unknown',
  branch: process.env.RENDER_GIT_BRANCH || '',
  startedAt: STARTED_AT.toISOString()
});

function getBuildInfo() {
  return {
    ...BUILD_INFO,
    // Distinguishes a fresh deploy from a process that merely restarted under it.
    uptimeSeconds: Math.round(process.uptime())
  };
}

module.exports = { getBuildInfo, readCommitFromGitDir };
