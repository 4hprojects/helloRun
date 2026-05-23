require('dotenv').config();

const { spawnSync } = require('node:child_process');
const { createTestRunId } = require('../utils/smoke-test-meta');

function runCommand(command, args, env) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env
  });
}

function main() {
  const testRunId = process.env.SMOKE_TEST_RUN_ID || createTestRunId();
  const env = {
    ...process.env,
    SMOKE_TEST_RUN_ID: testRunId,
    SMOKE_TEST_AUTO_TAG: process.env.SMOKE_TEST_AUTO_TAG || '1'
  };

  let smokeStatus = 1;
  let cleanupStatus = 0;

  try {
    const smoke = runCommand('npm', ['run', 'test:smoke'], env);
    smokeStatus = smoke.status ?? 1;
  } finally {
    const cleanup = runCommand(
      process.execPath,
      ['src/scripts/cleanup-smoke-tests.js', '--test-run-id', testRunId],
      env
    );
    cleanupStatus = cleanup.status ?? 1;
  }

  process.exit(smokeStatus || cleanupStatus);
}

if (require.main === module) {
  main();
}

module.exports = {
  main
};
