const { spawnSync } = require('node:child_process');
const { assertTestDatabasesAreSafe } = require('./test-db-guard');

// The suites read connection strings from .env the same way the app does, so the guard has
// to see what they will see.
try {
  require('dotenv').config();
} catch (_) {
  // dotenv is a dependency, but a missing .env is normal in CI.
}

const args = process.argv.slice(2);
const parallel = args.includes('--parallel');
const testArgs = args.filter((arg) => arg !== '--parallel');
const patterns = testArgs.length ? testArgs : ['tests/*.test.js'];

// Anything that is not a DB-free unit group is refused against a non-local database.
// See test-db-guard.js: there is no staging tier, so a local .env is usually production.
try {
  assertTestDatabasesAreSafe(patterns);
} catch (error) {
  console.error(`\n[run-test-group] ${error.message}\n`);
  process.exit(1);
}

const startedAt = Date.now();

const runnerFlags = parallel ? [] : ['--test-concurrency=1'];
const result = spawnSync(process.execPath, ['--test', ...runnerFlags, ...patterns], {
  stdio: 'inherit',
  env: {
    ...process.env,
    CSRF_PROTECTION: process.env.CSRF_PROTECTION || '0'
  }
});

const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`[run-test-group] ${patterns.join(' ')} completed in ${elapsedSeconds}s`);

process.exit(result.status ?? 1);
