# Deployment, Verification and Rollback Runbook

**Status: Implemented and repository-verified — the restore drill is untested**

**Last reconciled:** August 8, 2026 · **Delivery state:** [../STATUS.md](../STATUS.md) · **Priorities:** [../ROADMAP.md](../ROADMAP.md)

Written after a week in which a deploy was reported as verified when it had not
shipped, and a second stretch where sixteen commits sat unlive for a day without
anyone being able to say why. Both were avoidable with a procedure. This is it.

Everything here has been run against production except the restore drill, which
is called out as untested rather than described as if it works.

---

## 1. How a deploy happens

Render auto-deploys from GitHub `main`. There is no `render.yaml` or `Procfile`
in the repository — the service definition lives in the Render dashboard, so the
repository cannot tell you what will run. What it does control:

| | |
|---|---|
| Start command | `npm start` → `node src/server.js` |
| Build | none; `postinstall` does the work |
| `postinstall` | `setup` → `copy-tesseract-assets` → `download-tessdata` |
| Node version | pinned by `engines` in `package.json` |

`download-tessdata` fetches from a third-party host on every install. It cannot
fail or hang a deploy — every path exits 0 and it has request and overall
timeouts — but it is the one step that depends on somebody else's uptime.

## 2. Verifying a deploy actually landed

**Ask the app which commit it is running. Do not infer it.**

```bash
curl -s https://hellorun.online/healthz
# {"ok":true,"build":{"commitShort":"a1b2c3d","startedAt":"…","uptimeSeconds":…}}
```

- `commitShort` must equal the commit you pushed. If it does not, **the deploy has
  not landed** — regardless of what any dashboard says.
- `uptimeSeconds` climbing across checks with an unchanged `commitShort` means the
  service has not restarted. That is a stalled deploy, not a slow one.

This endpoint exists because a deploy was once "verified" from `/organizer/*`
returning 302 — a mount that answers 302 whether or not the code shipped. Static
assets are the only other honest canary: a file added in the commit under test
returns 404 until it deploys.

Then check readiness, which is a different question from liveness:

```bash
curl -s https://hellorun.online/readyz     # mongo + redis
```

Redis is **not configured in production**, so `redis: "not_configured"` is
expected and the shared rate limiters run on their documented in-memory fallback.

## 3. When a deploy does not land

Work down this list. Each has actually happened.

1. **Is the commit on the remote?** `git ls-remote origin -h refs/heads/main`.
   A push can fail on credentials and leave you believing it went.
2. **Read the Render deploy log.** This is the only place a build failure is
   visible, and nothing in the repository can substitute for it.
3. **Did the previous instance refuse to stop?** Until August 8 the app ignored
   `SIGTERM` entirely — four workers registered a `SIGTERM` listener to clear
   their intervals, which replaces Node's default disposition to terminate, so
   the process cleared four timers and carried on serving. The host then waited
   out its whole shutdown grace period and killed it. Fixed in `76f50e6`; if you
   ever see slow restarts again, re-check `installGracefulShutdown` in
   `src/server.js` is still installed and still calls `process.exit`.
4. **Did `postinstall` hang?** The tessdata download has timeouts now, but a
   build that stops with no error is the shape that failure took.

## 4. Migrations

Never bundled with a deploy. Always run deliberately, in this order — the same
sequence used for every migration this week.

```bash
# 1. Read-only: confirm the object exists, and what depends on it.
node -e "…information_schema query…"        # see 025 for the shape

# 2. Apply exactly one file, never the whole queue by accident.
npm run supabase:migrate -- --only=025_guest_submission_columns.sql

# 3. Verify the change, not the exit code.
node -e "…re-query information_schema…"
```

For a data backfill, dry run first and read what it would change:

```bash
npm run capacity:recount -- --dry-run
npm run capacity:recount
```

**Order matters when a migration relaxes a constraint the new code depends on:**
apply the migration *before* deploying the code, or the code writes rows the
schema rejects and fills `sync_failures` with work the retry worker cannot do.

## 5. Rolling back

There is no one-button rollback. In order of preference:

1. **Revert the commit and push.** `git revert <sha> && git push origin main`
   triggers a normal deploy. Preferred — it leaves history honest and `/healthz`
   tells you when the revert is live.
2. **Redeploy a previous commit from the Render dashboard.** Faster, but the
   repository and production then disagree until you also revert.
3. **A migration cannot be rolled back by redeploying.** Every migration this
   codebase has taken is additive (relaxing `NOT NULL`, adding columns, dropping
   an unused view), so reverting the *code* is safe and leaves the schema ahead.
   A destructive migration would need a restore — see below, and note it is
   untested.

After any rollback, re-check `/healthz` for the commit you expect.

## 6. Backups and restore

**Read this as a description of what exists, not as a tested procedure.**

- **MongoDB Atlas** takes managed snapshots. Retention and restore are configured
  in the Atlas UI.
- **Supabase/Postgres** takes managed backups on the project's plan.
- **Cloudflare R2** holds uploads. There is no lifecycle or replication policy in
  the repository.

**Untested and therefore not to be trusted under pressure:**

- [ ] Restore an Atlas snapshot into a scratch cluster and point a local checkout
      at it.
- [ ] Restore a Supabase backup and confirm the Mongo↔Postgres shadow still
      reconciles (`npm run supabase:verify:registrations` and friends).
- [ ] Confirm what R2 loses if a bucket is deleted.

A restore path nobody has walked is a plan, not a capability. This is the largest
untested risk on the platform and it needs an isolated environment to rehearse
in — the same environment [../ROADMAP.md](../ROADMAP.md) §4 asks for.

## 7. After every deploy

```bash
curl -s https://hellorun.online/healthz     # commit matches what you pushed
curl -s https://hellorun.online/readyz      # mongo ready
npm run probe:cleanup:dry                   # no verification data left behind
```

Then the part no command covers: **open the thing you changed in a browser.**
Two defects this week — walk-in registration returning 500 on every attempt, and
an approved guest result producing nothing — passed unit tests and live probes
and would have been caught in thirty seconds by a human clicking the button.

## 8. Constraints worth remembering

- **There is no staging tier.** A local `.env` points at production Mongo and
  Postgres. `npm test` and `npm run test:integration` are refused against a
  non-local database; `npm run test:unit` is always safe.
- **Verification against production uses throwaway data** and must tear down
  through `teardownProbe` in `src/scripts/probe-cleanup.js`, which deletes in
  foreign-key order and then proves nothing survived. Hand-written teardown has
  left residue twice.
- **DB-free tests are not production verification**, and a test that supplies its
  own input is not evidence that the interface producing that input works.
