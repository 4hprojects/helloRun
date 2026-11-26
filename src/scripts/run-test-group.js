const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { assertTestDatabasesAreSafe } = require('./test-db-guard');

// The suites read connection strings from .env the same way the app does, so the guard has
// to see what they will see.
try {
  require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });
} catch (_) {
  // dotenv is a dependency, but a missing .env is normal in CI.
}

const args = process.argv.slice(2);
const parallel = args.includes('--parallel');
const testArgs = args.filter((arg) => arg !== '--parallel');

if (!testArgs.length) {
  const testDirectory = path.resolve(__dirname, '../../tests');
  const testFiles = fs.readdirSync(testDirectory)
    .filter((name) => name.endsWith('.test.js'))
    .sort()
    .map((name) => path.join('tests', name));
  const groups = [
    testFiles.filter((name) => name.endsWith('.unit.test.js')),
    testFiles.filter((name) => name.endsWith('.integration.test.js')),
    testFiles.filter((name) => name.endsWith('.smoke.test.js'))
  ].filter((group) => group.length);

  for (const group of groups) {
    const result = spawnSync(process.execPath, [__filename, ...group], {
      stdio: 'inherit',
      env: process.env
    });
    if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
  }
  process.exit(0);
}

const patterns = testArgs;

if (!parallel && patterns.length > 1 && patterns.every((name) => name.endsWith('.smoke.test.js'))) {
  for (const pattern of patterns) {
    const result = spawnSync(process.execPath, [__filename, pattern], {
      stdio: 'inherit',
      env: process.env
    });
    if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
  }
  process.exit(0);
}

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
const databaseTouchingRun = patterns.some((pattern) => !pattern.includes('.unit.test.js'));
const smokeRun = patterns.some((pattern) => pattern.includes('.smoke.test.js'));
const publicDiscoverySmokeRun = patterns.some((pattern) => [
  'public-search-filters.smoke.test.js',
  'sitemap-readiness.smoke.test.js'
].includes(path.basename(pattern)));
const result = spawnSync(process.execPath, ['--test', ...runnerFlags, ...patterns], {
  stdio: 'inherit',
  env: {
    ...process.env,
    CSRF_PROTECTION: process.env.CSRF_PROTECTION || '0',
    ...(databaseTouchingRun ? {
      NODE_ENV: 'test',
      ALLOW_TEST_EVENT_VISIBILITY: '1',
      TEST_UPLOAD_STORAGE: 'memory',
      ...(smokeRun && publicDiscoverySmokeRun ? { ALLOW_TEST_EVENT_VISIBILITY: '0' } : {})
    } : {})
  }
});

const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`[run-test-group] ${patterns.join(' ')} completed in ${elapsedSeconds}s`);

process.exit(result.status ?? 1);
