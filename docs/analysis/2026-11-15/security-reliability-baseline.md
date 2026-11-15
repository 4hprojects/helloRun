# Security and Reliability Baseline — November 15, 2026

**Observed:** November 15, 2026, 18:55–18:58 Asia/Manila  
**Operator:** Codex repository workstation under owner-authorized read-only scope  
**Production mutation:** None  
**Secret or personal data recorded:** None

This record establishes the starting evidence for the
[30-day security and reliability plan](../../plans/platform-improvement/30-day-security-reliability-2026-11-16.md).
It does not replace provider logs, browser evidence, backup records, or
second-operator sign-off.

## Repository and GitHub

- Documentation PR [#44](https://github.com/4hprojects/helloRun/pull/44)
  passed the required `verify` check and merged at `2026-11-15T10:57:51Z`.
- Merge commit: `394d8dfbe6aa368a805aaabefce68464ebbf38a2`.
- Local gates passed: syntax and template checks, non-rewriting format checks,
  the 413-file documentation audit, and 2,625 DB-free unit tests.
- Imported source packs retain their original bytes. Their intentional trailing
  spaces remain outside the scoped diff-whitespace gate.

## Public production baseline

Read-only HTTP checks at `2026-11-15T10:55:32.046Z` returned:

| Path | Result | Boundary |
|---|---|---|
| `/` | HTTP 200 | Public homepage only |
| `/healthz` | HTTP 200 through `x-hellodeploy-route: hellorun.online` | Build commit and short commit are `unknown` |
| `/readyz` | HTTP 200 | MongoDB `ready`; Redis `not_configured`; private Strava viewer `disabled` |
| `/sw.js` | HTTP 200 | `Cache-Control: no-store, max-age=0, must-revalidate`; `CDN-Cache-Control: no-store`; Cloudflare `BYPASS` |
| `/active-quest` | HTTP 200 | Public series route only |
| `/events/november-active-quest-2026` | HTTP 200 | Public event route only |
| event registration route | HTTP 302 to `/login` | Anonymous gate only; no registration submitted |
| `/login` and `/signup` | HTTP 200 | Forms loaded; no credentials submitted |
| `/runner/submissions` and `/admin` | HTTP 302 to `/login` | Anonymous gate only |

The live build reports `builtAt: 2026-11-03T17:29:39.001Z` and
`startedAt: 2026-11-14T16:02:54.152Z`. This does not identify its source commit.

At `2026-11-15T10:58:17.154Z`, vendored Lucide JavaScript, Quill JavaScript,
and Quill CSS returned HTTP 200. The homepage CSP included a per-response nonce,
`script-src-attr 'none'`, and only first-party vendor asset paths. Browser-console
and CSP-report verification remain pending.

## PostgreSQL and Active Quest

The production PostgreSQL audit used aggregate metadata queries and SELECT-only
verification. It found:

- application connection role `postgres`, with `bypassrls: true` and successful
  metadata reads;
- migration 027 recorded at `2026-10-29T17:35:42.940Z`;
- migration 028 recorded at `2026-10-29T17:35:55.448Z`;
- 36/36 public tables with RLS enabled;
- 13/13 public views with `security_invoker=true`;
- zero table grants for `anon` and `authenticated`;
- zero public RLS policies, consistent with the application-role-only model.

Migration 027 was therefore not run. Reapplying it would violate the ledger and
single-change safety rules.

The Active Quest post-migration verifier ran inside a read-only PostgreSQL
transaction and found:

- all 28 prerequisite migrations present;
- 12 authoritative MongoDB events;
- 12 matching Postgres event shadows;
- 604 total event shadows, including 592 non-authoritative rows;
- migration 028 columns, constraint, and indexes present.

External Data API denial with a publishable key and authenticated test session
was not available from this workstation. Supabase Security Advisor was also not
available because the connected Supabase account does not expose the HelloRun
project. These remain `OPS-04` gaps.

## Fixture quarantine preflight

The cross-store fixture audit at `2026-11-15T10:55:44.269Z` was read-only and
matched the reviewed manifest:

- 102 non-admin `example.com` accounts: 29 organizers and 73 runners;
- 38 test-data events, 37 soft-deleted;
- 70 fixture registrations on those events and one fixture submission;
- one additional fixture registration on a soft-deleted test event;
- five authored blogs with five asset references;
- one certificate template;
- zero fixture-linked Postgres app-user shadows, event shadows, owned rows, or
  actor rows;
- zero non-fixture participant impact on fixture-organized events.

Quarantine was not run. A current recoverable MongoDB backup, reviewed apply
window, mode-`0600` rollback manifest, and second operator are still required.

## Remaining hold points

- HelloDeploy deployment and retained-release rollback require the HelloDeploy
  operator interface.
- Render/Cloudflare failover lacks recorded origin controls and a second
  operator.
- Atlas, Supabase, and R2 recovery rehearsals require provider access and an
  isolated restore target.
- Redis configuration and direct-origin client-IP probes require production
  infrastructure access.
- Authenticated browser, provider-email, device, accessibility, and admin
  authorization checks require supervised test accounts.
- `DEC-03` and `DEC-06` require legal, privacy, accounting, and owner decisions.
- Active Quest badges and certificates remain time-gated until December 18.
