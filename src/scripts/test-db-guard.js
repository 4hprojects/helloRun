'use strict';

/**
 * Refuse to run database-touching tests against a database that is not local.
 *
 * This repository has no staging tier, and a developer's `.env` routinely points at the
 * production MongoDB and Supabase instances — that is how the app is run locally. So
 * `npm test` has always been one command away from writing to production, and every run
 * during the onsite work had to be done by hand with that in mind. Care is not a control.
 *
 * The rule is deliberately about the *target*, not about a list of known production
 * hostnames: a hostname allowlist fails open the day a new host appears. Anything that is
 * not plainly a local database is refused, and the escape hatch is explicit.
 *
 * Unit tests are exempt because they are DB-free by policy — the same policy that makes
 * `npm run test:unit` the suite to reach for.
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

// Every connection string the suites might pick up. Redis is included because a test that
// flushes a shared cache is disruptive even though it destroys nothing permanent.
const CONNECTION_ENV_VARS = [
  'MONGODB_URI',
  'MONGO_URI',
  'MONGODB_URL',
  'DATABASE_URL',
  'SUPABASE_DB_URL',
  'POSTGRES_URL',
  'POSTGRES_URI',
  'REDIS_URL'
];

const OVERRIDE_ENV_VAR = 'ALLOW_REMOTE_TEST_DB';

/**
 * The host a connection string points at, with any credentials discarded.
 *
 * Never returns the URI itself: this ends up in terminal output and CI logs, and these
 * strings carry passwords.
 */
function hostnameOf(uri) {
  const value = String(uri || '').trim();
  if (!value) return '';
  try {
    // mongodb+srv:// and postgres:// both parse; the protocol is irrelevant here.
    return new URL(value).hostname.toLowerCase();
  } catch (_) {
    // Unparseable is not the same as absent. Treat it as unknown, which counts as remote.
    return 'unparseable';
  }
}

function isLocalHostname(hostname) {
  if (!hostname) return true; // not configured at all — nothing to connect to
  return LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost');
}

/**
 * Does this selection of test files include anything that may touch a database?
 *
 * Only a group made entirely of `*.unit.test.js` is exempt. A catch-all such as
 * `tests/*.test.js` is not, because it sweeps the integration suites in with everything
 * else — which is exactly what `npm test` with no arguments does.
 */
function groupIsUnitOnly(testArgs) {
  const patterns = (testArgs || []).filter((arg) => !String(arg).startsWith('-'));
  if (patterns.length === 0) return false;
  return patterns.every((pattern) => /\.unit\.test\.js$/.test(String(pattern)));
}

/**
 * Which configured databases are not local.
 *
 * @returns {Array<{ variable: string, hostname: string }>}
 */
function findRemoteTargets(env = process.env) {
  return CONNECTION_ENV_VARS.map((variable) => ({ variable, hostname: hostnameOf(env[variable]) }))
    .filter((target) => target.hostname && !isLocalHostname(target.hostname));
}

/**
 * Throw unless it is safe to run this group.
 *
 * @param {string[]} testArgs - the file patterns about to be handed to the test runner
 * @param {Object} [env]
 */
function assertTestDatabasesAreSafe(testArgs, env = process.env) {
  if (groupIsUnitOnly(testArgs)) return { checked: false, remote: [] };

  const remote = findRemoteTargets(env);
  if (remote.length === 0) return { checked: true, remote: [] };

  if (String(env[OVERRIDE_ENV_VAR] || '') === '1') {
    console.warn(
      `[run-test-group] ${OVERRIDE_ENV_VAR}=1 — running against non-local databases: ` +
        remote.map((target) => `${target.variable}@${target.hostname}`).join(', ')
    );
    return { checked: true, remote, overridden: true };
  }

  const lines = [
    'Refusing to run: these tests can write to a database, and the configured databases are not local.',
    '',
    ...remote.map((target) => `  ${target.variable} -> ${target.hostname}`),
    '',
    'This repository has no staging tier, so a local .env usually points at production.',
    '',
    'Choose one:',
    '  npm run test:unit                     # DB-free, always safe',
    '  point the variables above at a local database',
    `  ${OVERRIDE_ENV_VAR}=1 npm test         # only when the target is verified non-production`
  ];
  const error = new Error(lines.join('\n'));
  error.code = 'REMOTE_TEST_DB';
  throw error;
}

module.exports = {
  assertTestDatabasesAreSafe,
  findRemoteTargets,
  groupIsUnitOnly,
  hostnameOf,
  isLocalHostname,
  CONNECTION_ENV_VARS,
  OVERRIDE_ENV_VAR
};
