#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUTPUT = path.join(ROOT, 'tmp', 'build-info.json');

function firstValue(values) {
  return values.map((value) => String(value || '').trim()).find(Boolean) || '';
}

function resolveBuildCommit(env = process.env, cwd = ROOT) {
  const fromEnvironment = firstValue([
    env.HELLODEPLOY_GIT_COMMIT,
    env.HELLODEPLOY_COMMIT_SHA,
    env.RENDER_GIT_COMMIT,
    env.SOURCE_VERSION,
    env.GIT_COMMIT,
    env.COMMIT_SHA,
    env.GITHUB_SHA
  ]);
  if (fromEnvironment) return fromEnvironment;

  try {
    return String(execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })).trim();
  } catch (_) {
    return '';
  }
}

function resolveBuildBranch(env = process.env, cwd = ROOT) {
  const fromEnvironment = firstValue([
    env.HELLODEPLOY_GIT_BRANCH,
    env.RENDER_GIT_BRANCH,
    env.GIT_BRANCH,
    env.GITHUB_REF_NAME
  ]);
  if (fromEnvironment) return fromEnvironment;

  try {
    const branch = String(execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })).trim();
    return branch === 'HEAD' ? '' : branch;
  } catch (_) {
    return '';
  }
}

function captureBuildInfo(options = {}) {
  const env = options.env || process.env;
  const cwd = options.cwd || ROOT;
  const outputPath = options.outputPath || DEFAULT_OUTPUT;
  const commit = resolveBuildCommit(env, cwd);
  const metadata = {
    commit: /^[0-9a-f]{7,40}$/i.test(commit) ? commit : '',
    branch: resolveBuildBranch(env, cwd),
    builtAt: new Date().toISOString()
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o644 });
  return metadata;
}

if (require.main === module) {
  const metadata = captureBuildInfo();
  if (metadata.commit) {
    console.log(`[build-info] captured ${metadata.commit.slice(0, 7)}`);
  } else {
    console.warn('[build-info] no commit metadata was available; /healthz will report unknown');
  }
}

module.exports = {
  DEFAULT_OUTPUT,
  captureBuildInfo,
  resolveBuildBranch,
  resolveBuildCommit
};
