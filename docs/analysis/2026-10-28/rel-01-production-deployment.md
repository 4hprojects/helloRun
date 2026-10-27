# REL-01 Production Deployment Attempt

**Date:** October 28, 2026

**Outcome:** Blocked before activation

**Production mutation:** None

## Candidate and repository gates

- Stale worktree metadata for the absent `/tmp/hellorun-dec03` checkout was
  confirmed with `git worktree prune --dry-run --verbose` and pruned. The other
  two worktrees were retained.
- The clean checkout was switched from the merged release-hardening branch to
  `main` and fast-forwarded to `origin/main`.
- Frozen candidate: `1190f0c4c6afbe8948078a77b497731d51829324`.
- `git ls-remote origin refs/heads/main` returned the same full SHA after the
  gates.
- `npm ci --ignore-scripts`, syntax/template, non-rewriting format,
  documentation/link, and DB-free unit gates passed. The unit command exited
  zero after 179.4 seconds.
- GitHub `Repository checks` run `40465739878` also completed successfully for
  the frozen SHA under the workflow's Node 22 environment.
- The host runs Node 20.20.2 while the package requires Node 22 or newer. npm
  emitted `EBADENGINE` warnings, but the mandatory commands completed. This
  workstation warning is not deployment evidence and did not bypass a gate.

## Mandatory readiness gate

| Requirement | Result | Evidence |
|---|---|---|
| Current restorable MongoDB backup | **Not verified** | No Atlas CLI, Atlas API credentials, or authenticated Atlas control surface was available. |
| Authenticated HelloDeploy control access | **Not verified** | The hosted sign-in page was reachable, but automated sign-in stopped at the production Turnstile check. No deployment request was submitted. |
| Previous healthy retained rollback release | **Not verified** | The only accessible HelloDeploy database is the development checkout's `hellotasks` database. It has no active or retained healthy HelloRun release and is not authoritative for production. |
| Production feature flags | **Not verified** | Authenticated HelloDeploy environment settings were unavailable. Public `/readyz` proves only that the private Strava viewer is disabled. Repository defaults and development values were not substituted for production evidence. |

The release stopped at this gate. No HelloDeploy release number, activation
timestamp, new container, migration, backfill, policy publication, application
data write, feature change, Cloudflare change, or Render change exists.

## Public baseline after the stop

- `https://hellorun.online/healthz` returned HTTP 200 through
  `x-hellodeploy-route: hellorun.online`, but still reported `commit` and
  `commitShort` as `unknown`.
- `/readyz` returned HTTP 200 with MongoDB `ready`, Redis `not_configured`, and
  the private Strava viewer `disabled`.
- `/`, `/events`, `/blog`, `/about`, `/login`, and `/signup` returned HTTP 200.
- The vendored Lucide JS, Quill JS, and Quill CSS URLs returned HTTP 404.
- Production CSP still permits `unpkg.com`, `cdn.jsdelivr.net`, and legacy
  inline script behavior. This matches the earlier unpublished-revision
  fingerprint and proves the candidate did not land.
- Authenticated Quill and authentication-regression checks were not run because
  no authenticated application or deployment-control session was available.
- `npm run probe:cleanup:dry` found zero stranded MongoDB probe events, then
  failed before completing PostgreSQL verification because the configured
  Supabase hostname returned `ENOTFOUND`. Follow-up queries through both the
  system resolver and Cloudflare `1.1.1.1` returned authoritative `NXDOMAIN`
  for the database host and project API host. The configured project reference
  is unavailable or stale; this is not a workstation resolver failure. The dry
  run made no deletion.

## Required continuation

An operator with Atlas and production HelloDeploy access must verify a current
restorable backup, the active release, a retained healthy rollback image, and
the ten disabled production settings. The operator must also identify the live
Supabase project or correct the stale project configuration through a separately
approved production configuration change. Then rerun the remote-main equality
check and all mandatory repository gates if `origin/main` changed. Deploy only
the resulting frozen SHA and complete the live verification matrix. `REL-01`
remains blocked; `OPS-01` remains in progress.
