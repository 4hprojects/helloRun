# Deployment, Verification and Rollback Runbook

**Status: In progress — HelloDeploy path and repository metadata capture are ready;
live metadata verification and the Render failover drill remain incomplete**

**Last reconciled:** October 28, 2026 · **Delivery state:** [../STATUS.md](../STATUS.md) · **Priorities:** [../ROADMAP.md](../ROADMAP.md)

Written after a week in which a deploy was reported as verified when it had not
shipped, and a second stretch where sixteen commits sat unlive for a day without
anyone being able to say why. Both were avoidable with a procedure. This is it.

Commands marked as production evidence were run read-only on October 20. The
Render cutover and restore drills have not been run and are not described as if
they work.

The October 28 `REL-01` attempt stopped before activation. Repository gates
passed for `1190f0c`, but no deploy was queued because the operator environment
could not verify a current Atlas backup, authenticate to the production
HelloDeploy control surface, or establish a retained healthy rollback release.
Repository defaults and a development HelloDeploy database were not accepted as
production flag or rollback evidence. See the
[release attempt](../analysis/2026-10-28/rel-01-production-deployment.md).

---

## 1. How a deploy happens

**Corrected October 20, 2026.** The August record described HelloRun as a PM2
process running directly from this checkout. That is no longer the live release
path. October release records and the public response header agree that
HelloDeploy now builds and activates HelloRun as a managed container:

```
Cloudflare Tunnel
  hellorun.online → http://localhost:80
    nginx + HelloDeploy generated route
      proxy_pass → active HelloDeploy container on a loopback host port
        node src/server.js
```

The public response currently includes `x-hellodeploy-route: hellorun.online`.
That is the reliable discriminator for the primary origin. The earlier
PM2/port-3002 incident remains useful history, but its commands must not be used
as the current release procedure unless host inspection proves the old topology
has been restored.

### Production release procedure

1. Record the full target SHA and confirm it is on `origin/main`:

   ```bash
   git rev-parse <target-ref>
   git ls-remote origin refs/heads/main
   ```

2. Confirm migrations, destructive scripts, and feature-flag changes are
   separately approved. A HelloDeploy release must not implicitly authorize any
   of them.
3. In HelloDeploy, open the HelloRun project and select **Deployments**. Use
   **Deploy a Specific Commit**, paste the full 40-character SHA, then select
   **Deploy Commit**. Do not use **Deploy Latest** when the release record names
   a specific SHA.
4. Open the new deployment immediately. Confirm the displayed SHA is the target
   and follow its event/log stream through `QUEUED`, `VALIDATING`, `BUILDING`,
   and `DEPLOYING` to `HEALTHY`. A `FAILED` or `CANCELLED` record is not a
   release. HelloDeploy preserves the prior active route when the candidate
   fails its health check.
5. Confirm the new release is marked active and the former release remains an
   eligible retained rollback target. Record the HelloDeploy release number,
   full SHA, activation time, operator, and feature-flag state in the delivery
   record.
6. Run the public checks in §2. Do not declare success from the HelloDeploy
   `HEALTHY` state alone.

HelloDeploy itself may be supervised by PM2 or systemd on the host depending on
the installed platform release. That host-level detail affects platform outage
recovery, not the project release steps above. Before a host maintenance window,
record the actual service manager and service names from the host; do not infer
them from this application repository.

| HelloRun release property | Current contract |
|---|---|
| Source | Full commit on the configured production branch |
| Runtime | HelloDeploy-managed Node container |
| Application start | `node src/server.js` |
| Install hook | `capture-build-info` → `setup` → `copy-tesseract-assets` → `download-tessdata` |
| Activation | Candidate health check succeeds, then HelloDeploy switches nginx route |
| Failed candidate | Existing active release remains routed |

`download-tessdata` fetches from a third-party host on every install. It cannot
fail or hang the install — every path exits 0 and it has request and overall
timeouts — but it is the one step that depends on somebody else's uptime.

Other environments can still interact with production infrastructure: see the
shared-queue failure in §3 item 3.

The install hook now begins with `capture-build-info`. It prefers a platform commit
environment variable, otherwise reads `git rev-parse HEAD` while the build checkout is
still available, and writes `tmp/build-info.json` into the image. Runtime `/healthz`
resolves environment → captured artifact → development `.git`, so stripping `.git` from
the final container no longer loses the served revision. If the install log says no
commit metadata was available, stop and repair the HelloDeploy checkout/build context
before activation.

## 2. Verifying a deploy actually landed

**Ask both the route and the app what is serving. Do not infer it from a
dashboard.**

```bash
curl -fsSI https://hellorun.online/healthz | grep -i '^x-hellodeploy-route:'
curl -fsS https://hellorun.online/healthz
# {"ok":true,"build":{"commitShort":"a1b2c3d","startedAt":"…","uptimeSeconds":…}}
```

- `x-hellodeploy-route: hellorun.online` proves the request used the current
  HelloDeploy route. It does not prove which commit the container runs.
- `commitShort` must equal the target SHA. If it does not, **the deploy has
  not landed** — regardless of what any dashboard says.
- `uptimeSeconds` climbing across checks with an unchanged `commitShort` means the
  service has not restarted. That is a stalled deploy, not a slow one.

**Deployment gate recorded October 20:** production currently returns
`commit: "unknown"` and `commitShort: "unknown"`. Therefore the served commit
cannot presently be verified from the application, and `OPS-01` / `REL-01`
cannot be completed. The repository capture fix is ready but not deployed; deploy this
revision, confirm `[build-info] captured <sha>` in the install log, then repeat this
section. Until then,
match the active HelloDeploy release SHA and activation time to `startedAt`, and
record that this is weaker evidence rather than calling it commit verification.

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

### Client-IP trust boundary

All abuse limits, consent records, and audit writers use the canonical
`src/utils/client-ip.js` resolver. It ignores raw `X-Forwarded-For` and rejects
malformed or multi-value IP strings. `CF-Connecting-IP` is accepted only when
`TRUST_CLOUDFLARE_IP_HEADER=1`.

Keep that flag at `0` until host inspection proves the application origin cannot
be reached around Cloudflare (for example, the application binds only to the
HelloDeploy/nginx loopback route and no public host port reaches it). Then:

1. send a request through `https://hellorun.online` from a known public IP;
2. confirm the resolved audit/rate-limit IP equals that client, not an nginx,
   cloudflared, or Cloudflare edge address;
3. attempt the approved direct-origin probe with a forged
   `CF-Connecting-IP` header and prove it cannot reach the application; and
4. record the host rule, flag value, observed IPs, and time in the release
   record.

Do not enable the flag merely because Cloudflare normally sends the header. A
client can forge it whenever the origin is directly reachable. This deployed
verification is shared by `SEC-02` and `OPS-05` in ROADMAP.

## 3. When a deploy does not land

Work down this list.

1. **Is the commit on the remote?** `git ls-remote origin -h refs/heads/main`.
   A push can fail on credentials and leave you believing it went. Note this
   only confirms GitHub has the commit; HelloDeploy still has to fetch, build,
   and activate it.
2. **Open the HelloDeploy deployment detail.** Find the first failed stage and
   preserve its sanitized build/runtime logs and correlation ID. Do not queue
   repeated releases until the cause is known.
3. **Check the HelloDeploy worker that claimed the job.** Release 10 was claimed
   by a development worker connected to the production queue and failed because
   that machine lacked Docker permission. Ensure only the intended production
   worker can consume production jobs before retrying.
4. **Did the previous instance refuse to stop?** Until August 8 the app ignored
   `SIGTERM` entirely — four workers registered a `SIGTERM` listener to clear
   their intervals, which replaces Node's default disposition to terminate, so
   the process cleared four timers and carried on serving. The host then waited
   out its whole shutdown grace period and killed it. Fixed in `76f50e6`; if you
   ever see slow restarts again, re-check `installGracefulShutdown` in
   `src/server.js` is still installed and still calls `process.exit`.
5. **Did `postinstall` hang?** The tessdata download has timeouts now, but a
   build that stops with no error is the shape that failure took.
6. **Did route activation fail?** Inspect the HelloDeploy deployment event and
   platform nginx-helper/worker logs on the production host. Confirm the
   candidate container is healthy and its loopback port is listening before
   changing nginx manually.

The August 10 `PORT=3000` versus nginx `3002` PM2 outage belongs to the retired
direct-process topology and remains preserved in Git history. If the public
`x-hellodeploy-route` header disappears and the host has intentionally reverted
to that topology, recover its incident procedure from history; do not mix the
direct-PM2 repair with the current container route.

### A different shape: the origin is gone

A stalled deploy still serves the old commit. **If every path returns `502` —
including `/` — the origin is not answering at all**, which is a separate
failure and a full outage rather than a stale one. Tell them apart from the
response, not the dashboard:

```bash
curl -sI https://hellorun.online/healthz | head -3
```

`server: cloudflare` with a plain-text `error code: 502` body is Cloudflare's own
edge error, meaning it could not get a response from the origin. Nothing in the
repository can fix that and no push will route around it (see the correction in
§1). Work in this order:

1. **Which origin should be live?** `x-hellodeploy-route` means the HelloDeploy
   primary is serving. `x-render-origin-server` means the Render backup is
   serving. Record all response headers before changing anything.
2. **Walk the primary chain from the bottom up on the production host:** active
   HelloRun container and its loopback port, HelloDeploy-generated nginx route,
   nginx configuration/reload state, then the Cloudflare Tunnel service.
3. **If that will take a while, fail over to the Render backup.** Restoring
   service beats diagnosing it.

Before assuming the code is at fault, check whether the commit boots:
`PORT=3211 node src/server.js` and curl `/healthz` locally. A clean local boot on
the same commit points at the host configuration, not at the build.

### Render failover and restore-primary hold point

The repository still does not contain the Render service hostname or the exact
Cloudflare control used to switch origins. Do not guess, create a new tunnel, or
change public DNS from this workstation. Before the first drill, the owner must
record these non-secret values here:

- Render service name and canonical `*.onrender.com` hostname;
- Cloudflare zone/record or load-balancer pool changed during cutover;
- current primary and backup record values, TTL/proxy mode, and account owner;
- whether Render tracks `main` automatically or requires a manual deployment;
- the last SHA verified on Render.

Once recorded, the drill is: verify Render directly; capture the current
Cloudflare value; switch only the documented origin control; poll public
`/healthz` until `x-render-origin-server` appears; run the §7 checks; repair the
primary; verify it directly; restore the captured Cloudflare value; poll until
`x-hellodeploy-route` returns; run §7 again. Record timestamps, DNS/route
propagation, served SHA on each origin, and the rollback point. Until that drill
has evidence, Render is an unverified recovery option, not a tested failover.

**Diagnose on the production host, not a development machine.** During the
August 9–10 outage a parallel investigation ran on a development workstation,
found no tunnel and its router's admin page on port 443, and concluded the route
was missing. That workstation was never the origin; the real cause was the
historical direct-PM2 `PORT` drift described above. Do not install a tunnel or run
`cloudflared tunnel route dns` from anywhere but the production host — it would
repoint `hellorun.online` at that machine.

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

For a release-only failure, use HelloDeploy's retained-release rollback:

1. Open the HelloRun project's **Deployments** page.
2. Under **Rollback**, select the intended retained `HEALTHY` deployment by
   release number and SHA, select **Roll Back**, and confirm.
3. Follow the rollback deployment to `HEALTHY`. HelloDeploy reuses the retained
   image, health-checks the candidate, and switches the route only on success.
4. Verify the public route and application with §2 and §7, then record the new
   rollback deployment number and restored SHA.
5. Separately revert or fix `main` so the next normal deployment does not
   reintroduce the failed change. Keep the Render backup aligned after its
   release method is documented.

**A migration cannot be rolled back by redeploying.** Every migration this
codebase has taken is additive (relaxing `NOT NULL`, adding columns, dropping
an unused view), so reverting the *code* is safe and leaves the schema ahead.
A destructive migration would need a restore — see below, and note it is
untested.

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
