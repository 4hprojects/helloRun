# Phase 5 — Strategic Debt

**Status:** Active long-term backlog

**Last reconciled:** October 27, 2026 · **Current ownership:** `SEC-03`,
`SEC-04`, and `DEBT-02` in
[ROADMAP.md](../ROADMAP.md) · **Delivery state:** [STATUS.md](../STATUS.md)

## 1. CSP and Third-Party Assets

- Replace `lucide@latest` with a pinned, locally served or integrity-verified
  asset.
- Replace the Quill CDN dependency with a pinned controlled asset.
- Inventory inline scripts and introduce CSP nonces in bounded slices.
- Remove `'unsafe-inline'` only after all rendered pages and administrator
  editors pass focused checks.

## 2. Organiser Authorization Chain (CQ-3)

Repository implementation and focused isolated verification completed October
20. Shared event read/mutation and participant-review guards now cover the
event-scoped registrant and proof-review surfaces without changing owner,
active co-organiser, or administrator semantics. Direct and route tests cover
owner, unrelated organiser, active/stale co-organiser, full/support admin,
runner, restricted account, missing/deleted identities, invalid references,
and missing events. Supervised deployed 200/403/404 smoke evidence remains
under `SEC-04`; source and isolated tests do not close that operational gate.

## 3. Dependency Majors

- Handle Express, Mongoose, EJS, Resend, bcrypt, and Tesseract major upgrades
  separately.
- For each upgrade, record compatibility notes, focused test evidence,
  deployment smoke checks, and a rollback revision.
- Do not combine dependency majors with authorization or data migrations.

## 4. PostgreSQL object retirement

The October 20 read-only inventory found 13 production public views. Application code
uses `v_event_checkin_summary` and `v_bib_assignment_status`; preserve them. Eleven other
views have no runtime source reference, database dependent, or retained statement call,
and `shop_platform_fees` is empty with no foreign key or runtime source reference.

The technical inventory is complete in
[`analysis/2026-10-20/postgres-object-consumer-inventory.md`](../analysis/2026-10-20/postgres-object-consumer-inventory.md).
On October 27 the owner chose indefinite retention for all 12 candidates. Unknown
external consumers are treated as a reason to retain, not permission to remove. No
`DEBT-03` migration will be created. Any future removal proposal must reopen the full
inventory and its reversible-migration gates.

## Acceptance Criteria

- External assets are pinned and compatible with the production CSP.
- CQ-3 has focused authorization tests plus supervised runtime results.
- Each dependency major is independently reviewable and reversible.
- Current behavior and persisted `organiser` compatibility identifiers remain
  unchanged unless a separately approved migration says otherwise.
- PostgreSQL candidates remain retained unless a new decision completes the external
  consumer inventory and reversible-removal gates; the two runtime onsite views remain
  protected.
