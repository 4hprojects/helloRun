# Privacy Policy Phase 1 Baseline

Date locked: March 9, 2026

## Objective

Freeze the initial source for the HelloRun Privacy Policy before building versioned admin workflows.

## Source of Truth (Initial Content)

- Canonical draft file: `docs/contents/Privacy Policy.md`
- Usage:
  - Default content for new policy draft initialization.
  - Initial Privacy Policy content for first publish (`v1.0`).

## File Integrity Snapshot

- Path: `docs/contents/Privacy Policy.md`
- SHA-256: `C9FF9605EFA579614D73EA0AC11FEACBE49436657A53B33519044D488F511709`
- Size profile at lock time: 374 lines, 2,283 words, 15,486 characters.

## Phase 1 Decisions

1. Do not seed from `docs/privacy_policy.md`.
2. Seed from `docs/contents/Privacy Policy.md` only.
3. Public policy release target name: `Initial Privacy Policy`.
4. Initial version label: `1.0`.
5. Initial status on first seed: `published` and `isCurrent: true`.

## Known Content Notes (to address in later phases)

- The source file currently contains mojibake characters such as `â€œ` and `â€`.
- The source file uses `**Last Updated:** [Insert Date]` placeholder.
- These will be normalized/finalized during content cleanup and publish validation.

## Phase 1 Exit Criteria

1. Source file path confirmed and locked.
2. Hash snapshot recorded.
3. Team agreement that all next phases use this file as initial content.
4. No schema/route changes are made in Phase 1.

## Rollback Plan

If later phases fail, keep public `/privacy` served from current fallback view and retain this baseline as the migration anchor.
