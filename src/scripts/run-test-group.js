const { spawnSync } = require('node:child_process');

const args = process.argv.slice(2);
const testArgs = args.length ? args : ['tests/*.test.js'];
const startedAt = Date.now();

const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...testArgs], {
  stdio: 'inherit',
  env: {
    ...process.env,
    CSRF_PROTECTION: process.env.CSRF_PROTECTION || '0'
  }
});

const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`[run-test-group] ${testArgs.join(' ')} completed in ${elapsedSeconds}s`);

process.exit(result.status ?? 1);
