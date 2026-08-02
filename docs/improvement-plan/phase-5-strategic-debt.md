# Phase 5 — Strategic Debt

**Status:** Active long-term backlog

**Last reconciled:** July 31, 2026

## 1. CSP and Third-Party Assets

- Replace `lucide@latest` with a pinned, locally served or integrity-verified
  asset.
- Replace the Quill CDN dependency with a pinned controlled asset.
- Inventory inline scripts and introduce CSP nonces in bounded slices.
- Remove `'unsafe-inline'` only after all rendered pages and administrator
  editors pass focused checks.

## 2. Organiser Authorization Chain (CQ-3)

- Consolidate event read and mutation authorization on the shared protection
  helpers without changing ownership semantics.
- Cover organiser owner, non-owner, administrator, support-tier, runner,
  restricted-account, missing-event, and stale-session cases.
- Perform this work only with an approved runtime environment and immediate
  rollback path because source-scan tests cannot prove 200/403 behavior.

## 3. Dependency Majors

- Handle Express, Mongoose, EJS, Resend, bcrypt, and Tesseract major upgrades
  separately.
- For each upgrade, record compatibility notes, focused test evidence,
  deployment smoke checks, and a rollback revision.
- Do not combine dependency majors with authorization or data migrations.

## Acceptance Criteria

- External assets are pinned and compatible with the production CSP.
- CQ-3 has focused authorization tests plus supervised runtime results.
- Each dependency major is independently reviewable and reversible.
- Current behavior and persisted `organiser` compatibility identifiers remain
  unchanged unless a separately approved migration says otherwise.
