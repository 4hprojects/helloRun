# Deployment, Verification and Rollback Runbook

**Status: Implemented and repository-verified — the restore drill is untested**

**Last reconciled:** August 10, 2026 · **Delivery state:** [../STATUS.md](../STATUS.md) · **Priorities:** [../ROADMAP.md](../ROADMAP.md)

Written after a week in which a deploy was reported as verified when it had not
shipped, and a second stretch where sixteen commits sat unlive for a day without
anyone being able to say why. Both were avoidable with a procedure. This is it.

Everything here has been run against production except the restore drill, which
is called out as untested rather than described as if it works.

---

## 1. How a deploy happens

**Corrected August 10, 2026.** Every previous version of this section said
Render auto-deploys from GitHub `main`. That was wrong — there is no evidence
this repository has ever been hosted on Render. Production runs on a single
host via PM2, discovered by tracing an actual outage rather than trusting the
prior text:

```
Cloudflare Tunnel (systemd service `cloudflared`, /etc/cloudflared/config.yml)
  hellorun.online → http://localhost:80
    nginx (/etc/nginx/sites-enabled/hellorun)
      proxy_pass → http://127.0.0.1:${PORT}   (PORT read from this repo's .env)
        PM2 process "hellorun" → node src/server.js, run directly from this
        checkout (confirm with `pm2 describe hellorun`: cwd and script path
        point at this exact directory)
```

What that means in practice:

- **A `git push` to `main` does not deploy anything by itself.** Nothing
  watches this repository. The checkout PM2 runs from *is* production —
  getting new code live means pulling it into this exact directory and
  restarting the PM2 process. **The precise pull/install/restart procedure
  is not written down anywhere** — treat that as an open gap, not an assumed
  `git pull && pm2 restart hellorun`, until someone confirms it.
- **`PORT` in `.env` must match nginx's `proxy_pass` target for `hellorun`**
  (currently `3002`). Nothing checks this automatically. They drifted out of
  sync on August 10 and took the site down — see item 5 in §3.
- **PM2 supervises the process, not a platform.** It restarts on crash and
  logs to `~/.pm2/logs/hellorun-{error,out}.log`. `pm2 describe hellorun`
  shows the live script path, restart count, and the Node version actually
  running — trust that over anything in this repo.
- **`engines.node` in `package.json` is not enforced here.** PM2 launches
  whatever `node` is already on `PATH` on this host. The field only matters
  if some install step runs with `engine-strict` set, which nothing in this
  chain does.

What still holds regardless of host:

| | |
|---|---|
| Start command | `node src/server.js`, launched by PM2 (not `npm start`) |
| Build | none; `postinstall` does the work when `npm install` is run |
| `postinstall` | `setup` → `copy-tesseract-assets` → `download-tessdata` |

`download-tessdata` fetches from a third-party host on every install. It cannot
fail or hang the install — every path exits 0 and it has request and overall
timeouts — but it is the one step that depends on somebody else's uptime.

Other apps share this host and can interact with `hellorun` in ways a
Render-style isolated service never would — see §3 item 5.

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
   A push can fail on credentials and leave you believing it went. Note this
   only confirms GitHub has the commit — see §1, nothing pulls it further
   automatically.
2. **Read `pm2 logs hellorun --lines 200 --nostream`, or
   `~/.pm2/logs/hellorun-error.log` directly.** There is no separate platform
   build log — PM2 restarting the same process, over and over, in the same log
   file *is* the failure signal. A climbing restart count
   (`pm2 describe hellorun`) with the same stack trace repeating is a
   crash-on-boot; check the timestamp of the first occurrence to find what
   changed.
3. **Did the previous instance refuse to stop?** Until August 8 the app ignored
   `SIGTERM` entirely — four workers registered a `SIGTERM` listener to clear
   their intervals, which replaces Node's default disposition to terminate, so
   the process cleared four timers and carried on serving. The host then waited
   out its whole shutdown grace period and killed it. Fixed in `76f50e6`; if you
   ever see slow restarts again, re-check `installGracefulShutdown` in
   `src/server.js` is still installed and still calls `process.exit`.
4. **Did `postinstall` hang?** The tessdata download has timeouts now, but a
   build that stops with no error is the shape that failure took.
5. **Is something else already bound to the port nginx proxies to?** On
   August 10 the site returned `502` on every route because `hellorun`'s
   `.env` had drifted to `PORT=3000` — nginx doesn't proxy there (it proxies
   to `3002`), and `3000` was already held by an unrelated app (`hellotasks`)
   running on the same host. `hellorun` crash-looped over 600 times on
   `EADDRINUSE` while nginx correctly 502'd a port nothing was listening on.
   `ss -ltn` shows what's actually bound; diff that against `.env`'s `PORT`
   and `/etc/nginx/sites-enabled/hellorun`'s `proxy_pass`. This is a real risk
   specific to sharing a host with other apps — nothing in this repository
   would ever surface it.

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

1. **Revert the commit, push, then pull it into the production checkout and
   restart PM2.** `git revert <sha> && git push origin main` leaves history
   honest; `/healthz` tells you when the revert is live once it's actually
   pulled and `pm2 restart hellorun` has run — pushing alone does not deploy
   it, per §1.
2. **Check out a previous commit directly in the production checkout and
   `pm2 restart hellorun`.** Faster, but riskier than it sounds: this
   directory *is* what's running, so `git checkout` here changes production
   the moment PM2 next restarts, and the repository and GitHub `main` disagree
   until you also revert there.
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
