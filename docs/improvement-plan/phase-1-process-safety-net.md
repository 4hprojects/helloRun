# Phase 1 — Process Safety Net

**Priority:** P0–P1 · **Effort:** ~1 day · **When:** same week as Phase 0.
None of these touch runtime app behavior (except the shutdown handler), so they're low-risk and can be batched.

**Why this phase exists:** the repo has excellent code-review history but *zero automated process*: no CI, no lint, no version pinning, no dependency automation — and Render auto-deploys `main`. Every safeguard currently lives in one person's discipline. These items convert that discipline into infrastructure.

---

## PRC-1 · CI pipeline (P0)

**Problem:** pushes to `main` deploy to production with no automated check ever running. The July 5 batch found stale tests that had been broken for days — CI would have caught them at commit time.

**Action:** add `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: package.json, cache: npm }
      - run: npm ci
      - run: npm run test:unit          # DB-free — safe in CI, 315 tests, ~8s
      - run: npm audit --omit=dev
```

Notes:
- **Only the unit suite** — integration tests need a live DB and must never run in CI until Phase 2 provides a disposable one.
- `postinstall` downloads tessdata (~11 MB) — if that makes CI slow/flaky, guard it: `if [ -z "$CI" ]` in the script or `npm ci --ignore-scripts` + explicit setup.
- Optional second job: render-compile all EJS templates (the escaping unit test already walks all views, so much of this is covered).
- In Render, enable **"Wait for CI to pass before deploy"** (supported for GitHub-connected services) so a red build never ships.

## PRC-2 · Make the default test command DB-safe (P0)

**Problem:** `npm test` runs *all* tests including `*.integration.test.js`, which connect to the **production** database (single `.env`). One habitual `npm test` = the July 2 incident again.

**Action:**
1. `"test": "npm run test:unit"` — the safe default.
2. Add a guard at the top of the integration harness (`src/scripts/run-test-group.js` or a shared test bootstrap): if any selected file matches `*.integration.test.js` and `process.env.ALLOW_LIVE_DB !== '1'`, exit with a loud explanation. Live runs become `ALLOW_LIVE_DB=1 npm run test:integration` — deliberate, greppable, incident-proof.
3. Update `CLAUDE.md` Key Commands accordingly.

## PRC-4 · Graceful shutdown (P1)

**Problem:** Render sends SIGTERM on every deploy/restart. Today the process just dies: in-flight requests are dropped mid-response, the three workers (pg-sync, communication-retry, blog-scheduler) are killed mid-job, and Mongo/Postgres connections are severed. The retry-queue design absorbs most damage, but a payment-proof upload cut mid-write is a real user-facing failure on *every single deploy*.

**Action** in `server.js`:

```js
const server = app.listen(PORT, ...);
process.on('SIGTERM', async () => {
  logger.info('SIGTERM — draining');
  server.close(async () => {                 // stop accepting, finish in-flight
    stopWorkers();                           // add stop fns that clearInterval + await current job
    await mongoose.disconnect().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 25_000).unref();  // hard deadline < Render's 30s grace
});
```

Workers currently expose only `start*()`; add matching `stop*()` that clear their timers.

## PRC-3 · Pin the Node version (P1)

No `engines` field, no `.nvmrc` — local Node and Render's default can silently diverge (Render pins to the version at first deploy unless told otherwise, so a rebuild can jump majors). **Action:** add `"engines": { "node": "22.x" }` (match what production currently runs — check the Render dashboard first) + a `.nvmrc`; CI reads it via `node-version-file`.

## PRC-5 · Dependency automation (P1)

`npm audit` is clean *today*; nothing re-checks tomorrow. **Action:** add `.github/dependabot.yml` (weekly, npm ecosystem, grouped minor/patch). With CI from PRC-1, bumps arrive pre-tested. Majors stay manual (Phase 5 list).

## PRC-6 · ESLint + Prettier (P2)

There's even an `// eslint-disable-next-line` comment in `src/config/redis.js` — but no ESLint. **Action:** flat-config ESLint (`eslint:recommended` + `no-undef`, `no-unused-vars`, `require-atomic-updates`), Prettier with house style, `npm run lint` in CI. Run once, commit the (likely large) autofix diff separately from any logic change. Note: the CQ-2 splits already built an acorn-based no-undef checker — ESLint supersedes it.

---

## Exit criteria
- [ ] Every push runs unit suite + audit; Render waits for green
- [ ] `npm test` cannot touch a live DB; integration runs require `ALLOW_LIVE_DB=1`
- [ ] Deploys drain connections and stop workers cleanly
- [ ] Node version pinned in three places (engines, .nvmrc, CI)
- [ ] Dependabot PRs flowing
