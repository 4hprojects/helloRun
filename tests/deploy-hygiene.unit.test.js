'use strict';

// Three small guards, each one traceable to something that actually went wrong.
//
// A deploy was reported as verified from a route that 302s whether or not it shipped; a
// third-party download sits in the install path of every deploy; and `npm test` has always
// been one command away from writing to the production databases.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { getBuildInfo, readCommitFromGitDir } = require('../src/utils/build-info');
const {
  assertTestDatabasesAreSafe,
  findRemoteTargets,
  groupIsUnitOnly,
  hostnameOf,
  OVERRIDE_ENV_VAR
} = require('../src/scripts/test-db-guard');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

// --- Which build is running -------------------------------------------------------------

test('/healthz reports the running commit, so a deploy is checkable rather than inferred', () => {
  const server = read('src/server.js');
  assert.match(server, /build: getBuildInfo\(\)/);
  assert.match(server, /require\('\.\/utils\/build-info'\)/);

  const info = getBuildInfo();
  assert.equal(typeof info.commit, 'string');
  assert.ok(info.commit.length > 0);
  assert.equal(info.commitShort.length <= 7, true);
  assert.ok(Number.isInteger(info.uptimeSeconds), 'a restart under the same build must be visible');
  assert.ok(!Number.isNaN(Date.parse(info.startedAt)));
});

test('the commit resolves from the environment first, then from .git', () => {
  // A platform build deploys a tarball with no .git, so the env var is the real source;
  // reading .git is what makes it work in development.
  const source = read('src/utils/build-info.js');
  assert.match(source, /RENDER_GIT_COMMIT/);

  const fromGit = readCommitFromGitDir();
  assert.match(fromGit, /^[0-9a-f]{40}$/, 'this repository has a .git to read');
});

// --- The install path -------------------------------------------------------------------

test('a failed language-pack download cannot fail a deploy', () => {
  const script = read('src/scripts/download-tessdata.js');

  // Every exit is 0 on purpose: OCR degrading is not a reason to stop shipping the platform.
  assert.doesNotMatch(script, /process\.exit\(1\)/);
  assert.match(script, /process\.on\('uncaughtException'/);
  assert.match(script, /catch \(err\) \{\n  giveUp\('Setup failed/);
});

test('a host that never answers cannot hang the install', () => {
  // Worse than failing: npm waits until the build platform gives up, with no useful output.
  const script = read('src/scripts/download-tessdata.js');
  assert.match(script, /request\.setTimeout\(REQUEST_TIMEOUT_MS/);
  assert.match(script, /TOTAL_TIMEOUT_MS/);
  assert.match(script, /request\.destroy\(\)/);
  // One download must not report both success and failure.
  assert.match(script, /let settled = false/);
});

// --- Tests against production ------------------------------------------------------------

test('a database-touching group is refused when the database is not local', () => {
  const production = { MONGODB_URI: 'mongodb+srv://user:hunter2@cluster0.11fgflq.mongodb.net/db' };

  assert.throws(
    () => assertTestDatabasesAreSafe(['tests/*.test.js'], production),
    (error) => {
      assert.equal(error.code, 'REMOTE_TEST_DB');
      assert.match(error.message, /cluster0\.11fgflq\.mongodb\.net/);
      // The message is printed to a terminal and pasted into issues.
      assert.doesNotMatch(error.message, /hunter2/, 'the password must never be echoed');
      return true;
    }
  );
});

test('unit groups are exempt, and every other selection is checked', () => {
  // DB-free by policy, which is what makes test:unit the suite to reach for.
  assert.equal(groupIsUnitOnly(['tests/*.unit.test.js']), true);
  assert.equal(groupIsUnitOnly(['tests/a.unit.test.js', 'tests/b.unit.test.js']), true);

  // The catch-all sweeps the integration suites in with everything else — this is `npm test`.
  assert.equal(groupIsUnitOnly(['tests/*.test.js']), false);
  assert.equal(groupIsUnitOnly(['tests/*.integration.test.js']), false);
  assert.equal(groupIsUnitOnly(['tests/*.unit.test.js', 'tests/x.integration.test.js']), false);
  assert.equal(groupIsUnitOnly([]), false, 'an empty selection must not be treated as safe');
});

test('local databases run freely', () => {
  const local = {
    MONGODB_URI: 'mongodb://localhost:27017/hellorun',
    DATABASE_URL: 'postgres://user:pass@127.0.0.1:5432/hellorun'
  };
  assert.deepEqual(findRemoteTargets(local), []);
  assert.doesNotThrow(() => assertTestDatabasesAreSafe(['tests/*.integration.test.js'], local));
});

test('the guard judges the target, not a list of known production hostnames', () => {
  // An allowlist of production hosts fails open the day a new host appears, so anything
  // not plainly local is refused.
  assert.equal(hostnameOf('mongodb+srv://u:p@anything-new.example.com/db'), 'anything-new.example.com');
  assert.equal(findRemoteTargets({ DATABASE_URL: 'postgres://u:p@anything-new.example.com/db' }).length, 1);
  // Unparseable is unknown, and unknown is not local.
  assert.equal(findRemoteTargets({ DATABASE_URL: 'not a uri' }).length, 1);
  // Absent is nothing to connect to.
  assert.deepEqual(findRemoteTargets({ DATABASE_URL: '' }), []);
});

test('the override is explicit and says what it is doing', () => {
  const production = { MONGODB_URI: 'mongodb+srv://u:p@cluster0.11fgflq.mongodb.net/db' };
  const result = assertTestDatabasesAreSafe(['tests/*.test.js'], {
    ...production,
    [OVERRIDE_ENV_VAR]: '1'
  });
  assert.equal(result.overridden, true);
  // Not truthiness: a stray ALLOW_REMOTE_TEST_DB=0 must not disable the guard.
  assert.throws(() => assertTestDatabasesAreSafe(['tests/*.test.js'], { ...production, [OVERRIDE_ENV_VAR]: '0' }));
});

test('every test script routes through the guard', () => {
  // A script spawning the runner directly would walk straight past it, which is what the
  // old inline `node -e` test:parallel did.
  const scripts = JSON.parse(read('package.json')).scripts;
  const testScripts = Object.entries(scripts).filter(([name]) => name === 'test' || name.startsWith('test:'));

  for (const [name, command] of testScripts) {
    if (name === 'test:audit') continue; // npm audit, no database
    assert.match(command, /run-test-group\.js/, `${name} must go through the guard`);
    assert.doesNotMatch(command, /node --test|spawnSync/, `${name} must not spawn the runner itself`);
  }
});

// --- Four safety fixes ---------------------------------------------------------------------

test('a missing event renders a 404, not a 500', () => {
  // onsite-pages.js:55 rendered 'errors/404'. There is no errors/ directory, so the view
  // lookup threw, the catch passed it to next(error), and the user got a 500.
  const pages = read('src/routes/organiser/onsite-pages.js');
  assert.doesNotMatch(pages, /render\('errors\/404'/);
  assert.equal(fs.existsSync(path.join(ROOT, 'src/views/error.ejs')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'src/views/errors')), false);

  // Every render target in the file must resolve to a view that exists.
  for (const match of pages.matchAll(/render\('([^']+)'/g)) {
    assert.equal(
      fs.existsSync(path.join(ROOT, 'src/views', `${match[1]}.ejs`)),
      true,
      `${match[1]} must exist`
    );
  }
});

test('every auth POST is CSRF protected, including login', () => {
  const auth = read('src/routes/authRoutes.js');
  const posts = [...auth.matchAll(/router\.post\('([^']+)',([^\n]*)/g)];
  assert.ok(posts.length > 0);
  for (const [, route, rest] of posts) {
    assert.match(rest, /requireCsrfProtection/, `POST ${route} must be CSRF protected`);
  }
  // And the form actually sends one, or enabling it would break every login.
  assert.match(read('src/views/auth/login.ejs'), /name="_csrf"/);
});

test('an offer or transfer token never reaches the log', () => {
  // Both route files promise this; the URL loggers were filing live credentials.
  const server = read('src/server.js');
  assert.match(server, /function redactUrlForLogs/);
  assert.doesNotMatch(server, /url: req\.url \}/);
  assert.match(server, /redactUrlForLogs\(req\.url\)/);
  const uses = server.match(/redactUrlForLogs\(req\.url\)/g) || [];
  assert.equal(uses.length, 2, 'the timeout logger and the 404 logger both need it');
});

test('a swallowed failure is logged rather than degrading into a wrong screen', () => {
  // Each of these turned a query failure into a plausible-looking but false UI: an empty
  // audit trail, every badge at 0 earned, every event showing as un-saved.
  const sites = [
    ['src/controllers/admin/users.controller.js', /\[Admin\] Could not load critical audit history/],
    ['src/routes/organiser/event-management.js', /\[Badges\] Could not load earned counts/],
    ['src/controllers/page/home.controller.js', /\[Home\] Could not load saved events/],
    ['src/controllers/page/event.controller.js', /\[Event\] Could not resolve saved state/],
    ['src/controllers/runner.controller.js', /\[Runner\] Could not enrich event cards/]
  ];
  for (const [file, pattern] of sites) {
    const source = read(file);
    assert.match(source, pattern, file);
    assert.doesNotMatch(source, /catch \(_\) \{\}/, `${file} must have no silent catch left`);
  }
});
