'use strict';

// deploy/ocr-training scripts: the survey is read-only and the installer is a pinned,
// dry-run-by-default script that refuses unsafe input. Nothing here installs anything.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SURVEY = path.join(ROOT, 'deploy/ocr-training/survey.sh');
const INSTALL = path.join(ROOT, 'deploy/ocr-training/install-training-tools.sh');
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const isUbuntu = fs.existsSync('/etc/os-release') && /^ID=ubuntu/m.test(fs.readFileSync('/etc/os-release', 'utf8'));
const user = require('node:os').userInfo().username;

function install(args, env = {}) {
  return spawnSync('bash', [INSTALL, ...args], { encoding: 'utf8', env: { PATH: process.env.PATH, ...env } });
}

test('both scripts are valid bash', () => {
  execFileSync('bash', ['-n', SURVEY]);
  execFileSync('bash', ['-n', INSTALL]);
});

test('the survey contains no state-changing commands', () => {
  const source = fs.readFileSync(SURVEY, 'utf8');
  assert.doesNotMatch(source, /\b(apt-get|apt|dnf|yum|pip|npm install|git clone|curl|wget|rm -|mkdir|chown|chmod|loginctl enable|systemctl (start|stop|enable|restart)|pm2 (start|stop|restart|delete))\b/);
});

test('the installer is dry-run by default and never pipes downloads into a shell', () => {
  const source = fs.readFileSync(INSTALL, 'utf8');
  assert.match(source, /^APPLY=0$/m);
  assert.match(source, /set -euo pipefail/);
  assert.doesNotMatch(source, /\|\s*(sudo\s+)?(ba)?sh\b/);
  assert.doesNotMatch(source, /add-apt-repository|ppa:/);
  const beforeNextSteps = source.slice(0, source.indexOf('cat <<NEXT'));
  assert.doesNotMatch(beforeNextSteps, /^\s*(?:run\s+)?pm2\s/m, 'PM2 is never run; it is only printed as a next step');
});

test('the installer refuses missing pins, bad users and unsafe paths', () => {
  assert.match(install(['--user', user]).stderr, /TESSTRAIN_REF must be a full 40-character commit SHA/);
  assert.match(install(['--user', user], { TESSTRAIN_REF: 'main', TESSDATA_BEST_REF: SHA_B }).stderr, /TESSTRAIN_REF must be/);
  assert.match(install([], { TESSTRAIN_REF: SHA_A, TESSDATA_BEST_REF: SHA_B }).stderr, /--user <pm2-user> is required/);
  assert.match(install(['--user', 'no-such-user-xyz'], { TESSTRAIN_REF: SHA_A, TESSDATA_BEST_REF: SHA_B }).stderr, /does not exist/);
  assert.match(install(['--user', user], { TESSTRAIN_REF: SHA_A, TESSDATA_BEST_REF: SHA_B, TESSTRAIN_DIR: '/opt/x;rm' }).stderr, /unsafe path/);
});

test('a dry run prints the plan and changes nothing', { skip: !isUbuntu && 'installer supports Ubuntu only' }, () => {
  const result = install(['--user', user], { TESSTRAIN_REF: SHA_A, TESSDATA_BEST_REF: SHA_B, TESSTRAIN_DIR: '/tmp/hellorun-never-created-tesstrain' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /DRY RUN/);
  assert.match(result.stdout, new RegExp(`checkout --quiet ${SHA_A}`));
  assert.match(result.stdout, new RegExp(`tessdata_best/${SHA_B}/eng.traineddata`));
  assert.equal(fs.existsSync('/tmp/hellorun-never-created-tesstrain'), false);
  if (process.getuid && process.getuid() !== 0) {
    assert.match(install(['--user', user, '--apply'], { TESSTRAIN_REF: SHA_A, TESSDATA_BEST_REF: SHA_B }).stderr, /must run as root/);
  }
});
