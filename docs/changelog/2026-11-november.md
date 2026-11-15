# November 2026 Changelog

## November 15 — Security and reliability baseline

- Merged documentation PR #44 after required GitHub CI passed.
- Captured a no-mutation public baseline: HelloDeploy and MongoDB are healthy,
  the served commit remains unknown, Redis is not configured, Active Quest is
  live, and anonymous protected routes redirect to login.
- Verified `/sw.js` returns browser and CDN `no-store`, vendored Lucide and Quill
  assets return HTTP 200, and the public CSP uses nonces with script attributes
  disabled.
- Reconciled migration evidence: migrations 027 and 028 were already recorded
  on October 29. Current PostgreSQL metadata reports 36/36 RLS tables, 13/13
  security-invoker views, and no Data API table grants. No migration ran.
- Verified all 12 authoritative Active Quest events have Postgres shadows and
  reran the aggregate fixture audit across MongoDB and PostgreSQL. Fixture
  quarantine remains blocked on current backup and second-operator evidence.
- Added the [30-day security and reliability plan](../plans/platform-improvement/30-day-security-reliability-2026-11-16.md)
  and its [dated baseline](../analysis/2026-11-15/security-reliability-baseline.md).

## November 15 — Documentation audit and taxonomy migration

### Documentation

- Audited all governed project Markdown and separated current state, stable
  reference, plans, implementation records, operations, dated evidence, and
  historical material.
- Moved 118 tracked Markdown documents to canonical lowercase taxonomy paths.
- Left permanent one-link compatibility pointers at every former tracked path.
- Moved 16 untracked source-pack files outside `docs/` without changing their
  bytes or original filenames.
- Reconciled documentation navigation, conventions, status, roadmap, analysis,
  implementation, operations, archive, and changelog indexes.
- Added the dated [documentation audit](../analysis/2026-11-15/documentation-audit.md).

### Public production evidence

- A read-only public check on November 15 observed the
  [November Active Quest 2026 event](https://hellorun.online/events/november-active-quest-2026)
  published with registration open through November 22, activity dates of
  November 1–30, proof submission through December 14, six distance categories,
  and public reward artwork.
- This public observation does not prove the deployed commit, private migration
  records, backup readiness, flag history, administrator audit evidence, or
  post-deadline reward and certificate finalization. Those remain under `REL-11`.

## November 4 — Restrained motion and validation feedback

- Added shared 120ms, 180ms, and 240ms motion tokens, explicit property transitions,
  press feedback, and reduced-motion fallbacks across navigation, landing, event,
  leaderboard, registration, authentication, proof, and runner-dashboard surfaces.
- Preserved progressive navigation, server-rendered filtering and rankings, proof draft
  and submission authority, duplicate-submit guards, dashboard focus, disclosures,
  history, polling, and scroll position.
- Added accessible invalid-field associations and first-invalid focus. Dashboard refreshes
  now expose busy state, skip unchanged fragments, and animate only changed markup.
- Added focused motion regressions. Required syntax, format, whitespace, focused, and full
  DB-free unit checks pass. No deployment or production-like database suite ran.
