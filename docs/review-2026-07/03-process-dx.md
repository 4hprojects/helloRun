# Process & Developer-Experience Findings — July 6, 2026

Context that shapes everything here: **solo maintainer, no staging environment, single `.env` pointing at production, Render auto-deploys from GitHub `main`.** One incident has already occurred (July 2: a live integration test wrote fixtures into production). The theme of this file is: add guardrails that catch mistakes *before* they reach the production database or a production deploy.

---

## PROC-1 · No CI — pushes to `main` deploy to production untested — **P0 · M**

There is no `.github/workflows/` directory. The deploy pipeline is literally `git push` → Render build → live. A syntax error in `server.js` takes the site down; nothing runs `npm run test:unit` or `npm audit` before deploy. This is the single highest-leverage process fix available.

**Fix:** one workflow, DB-free by design (no secrets needed):

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm audit --omit=dev
      - run: npm run test:unit
        env: { CSRF_PROTECTION: '0' }
```

The 42 `*.unit.test.js` files are already DB-free (that was the point of the post-incident pattern), so this needs no database service. Then enable **"Wait for CI"** on the Render service so a red build never deploys. If `postinstall` (uploads setup + tessdata download) is slow/fragile in CI, guard it with `if [ -z "$CI" ]`.

---

## PROC-2 · No guard preventing integration tests from hitting production — **P0 · S**

`npm run test:integration` and any direct `node --test tests/*.integration.test.js` connect to whatever `MONGODB_URI`/`DATABASE_URL` are in `.env` — which is production. The July 2 incident was this exact failure mode, and the current mitigation is "remember not to." CLAUDE.md documents the rule, but a rule the tooling doesn't enforce will eventually be broken again — by a tired human or by an agent.

**Fix:** add a shared guard module required at the top of every integration test (or in `run-test-group.js` when the glob matches `*.integration.test.js`):

```js
// tests/helpers/live-db-guard.js
const uri = process.env.MONGODB_URI || '';
if (process.env.ALLOW_LIVE_DB_TESTS !== '1') {
  console.error(`\nRefusing to run integration tests.\nTarget DB: ${uri.replace(/\/\/[^@]*@/, '//***@')}\nSet ALLOW_LIVE_DB_TESTS=1 to run against this database deliberately.\n`);
  process.exit(1);
}
```

Cheap, unmissable, and turns "supervised one-off" from a convention into a mechanism. Pairs with the existing live-DB verification backlog: when those runs happen, the flag makes them explicit.

---

## PROC-3 · No linter or formatter — **P1 · M**

`devDependencies` contains only `nodemon`. At 44k lines with heavy agent-assisted editing, ESLint is the cheapest class-of-bug catcher available (unused/undefined vars — note the July 2 `deleteEvent` latent `ReferenceError` was exactly this class, caught only by accident).

**Fix:** `eslint` flat config with `eslint:recommended` + `no-unused-vars`/`no-undef` as errors, semicolons/quotes off (don't fight existing style). Add `npm run lint` and put it in the CI workflow from PROC-1. Expect a one-time triage of warnings; set anything noisy to `warn` initially. Prettier optional — the codebase is consistent enough that ESLint alone carries most of the value.

---

## PROC-4 · No staging environment — **P2 · L**

Already a documented operational fact, restated here because Phase-1/2 items reduce but don't remove the risk. The minimal viable staging that fits a solo-dev budget:

- Second Render web service (free/starter) deploying a `staging` branch.
- MongoDB Atlas free-tier cluster (M0) for staging Mongo.
- Supabase branch database (the MCP tooling already supports branches) for staging PG.
- A `.env.staging` with distinct `SESSION_SECRET`, staging `APP_URL`, and **no** production secrets; Turnstile/Resend in test mode or absent.

Payoff: `*.integration.test.js` files get a legitimate target again (set `ALLOW_LIVE_DB_TESTS=1` + staging URIs), and risky migrations get a rehearsal space. Sequence after the production deploy settles.

---

## PROC-5 · `docs/` sprawl — **P3 · S**

`docs/` has 26 top-level entries including ambiguous or stale-looking ones: `todo refinement/` (space in name), `done/`, `example/`, `image_test/`, `codex/`, `contents/`, plus the documented-as-historical `to-implement/` and `implementation/`. STATUS/ROADMAP discipline is good; the directory tree around them undermines findability.

**Fix:** one archive pass — move anything superseded into `docs/archive/`, rename `todo refinement`, and add a line to `docs/README.md` stating which directories are live vs. historical. Keep it to 30 minutes; the goal is signal, not taxonomy.

---

## PROC-6 · Webhook HMAC computed over re-serialized JSON — **P3 · S**

`src/routes/webhooks/timing-system.js:38` signs `JSON.stringify(req.body)` — the body after `express.json()` parsing — rather than the raw request bytes. Any sender whose raw JSON differs from Node's re-serialization (whitespace, key order from a non-JS producer, unicode escapes) will fail verification even with the correct secret. Not a vulnerability; a correctness/robustness trap that will surface as "signature invalid" support tickets when a real timing vendor integrates.

**Fix:** capture raw bytes for this route only: `express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } })` (global, cheap) and HMAC `${timestamp}.${req.rawBody}`. Document the signing recipe in the webhook doc so vendors sign the same bytes.

---

## Checked and healthy

- Boot-time env validation with fatal/warn tiers (`src/config/validate-env.js`) — good pattern, already flags missing `REDIS_URL`.
- Test taxonomy (`*.unit.test.js` vs `*.integration.test.js`) and grouped npm scripts are clear; 105 test files.
- `npm audit --omit=dev` already wired into `test:smoke`.
- STATUS.md / ROADMAP.md session discipline is consistently maintained.
- Process-level error guards + Sentry hooks in `server.js`.
- Workers are behind env-tunable intervals and wired into startup (shutdown gap covered in EFF-2).
