# Active Quest Decisions

Last updated: 2026-10-28

## Confirmed by supplied specification

### AQ-D001: monthly edition shape

Status: confirmed.

Each edition is one virtual accumulated-distance event with exactly one selected category from 25K, 50K, 75K, 100K, 150K, or 200K.

### AQ-D002: timezone and monthly windows

Status: implemented.

Business time uses `Asia/Manila`. Registration opens seven days before the month, closes after day 22, activities occur within the calendar month, and proof closes after day 14 of the next month.

### AQ-D003: evidence and review

Status: confirmed.

Screenshot proof is required. Activity URL is optional corroboration. An inaccessible URL does not cause automatic rejection. Rewards depend on approved totals after final review.

### AQ-D004: historical continuity

Status: confirmed.

Historical event URLs and records must remain valid. No title-based destructive migration or slug rewrite is allowed.

### AQ-D005: automation safety

Status: confirmed.

Series, draft generation, scheduler, and auto-publication flags default to off. Generation is draft-only. Auto-publication requires separate explicit approval.

## Approved architecture

### AQ-D006: aggregate design

Status: implemented.

Keep `Event` as the monthly edition. Add `ActiveQuestSeries` and immutable `ActiveQuestTemplateVersion` models. Do not add a duplicate monthly-edition model.

### AQ-D007: series identity

Status: implemented.

Add optional series identity and frozen snapshot fields to `Event`. Enforce one edition per `(seriesKey, year, month)` with a partial unique index.

### AQ-D008: source of truth

Status: implemented.

Keep MongoDB authoritative. Add nullable series identity to the Postgres event shadow for reports, joins, and operational consistency.

### AQ-D009: time representation

Status: implemented.

Store UTC instants derived from PHT and use half-open intervals. Display inclusive calendar days in public copy. Protect historical events from shared-helper behavior changes.

### AQ-D010: feature-flag storage

Status: implemented.

Store the four audited flags on the series/settings aggregate with actor, reason, old value, new value, and timestamp. Missing state evaluates to false.

### AQ-D011: administration permission

Status: implemented.

Limit template approval, edition generation, flag changes, and Active Quest publication to full administrators initially. Revisit a narrower capability after manual operation is proven.

### AQ-D012: reward gate

Status: implemented in Phase 5.

Do not publish category reward promises until an isolated integration test proves accumulated selected-category award, reversal, and idempotency behavior.

### AQ-D013: achievement order

Status: proposed.

Implement month-streak achievements before lifetime-distance achievements. Defer distance achievements until cross-event activity reuse has an explicit identity and counting policy.

### AQ-D014: historical backfill

Status: proposed.

Do not infer series membership from titles or slugs. Backfill only after a reviewed production inventory maps exact event IDs to editions.

## Implemented decisions

### AQ-D015: Phase 1 model ownership

Status: implemented.

MongoDB owns `ActiveQuestSeries`, `ActiveQuestTemplateVersion`, and monthly `Event` records. Postgres receives nullable edition identity through the existing event shadow.

### AQ-D016: immutable template behavior

Status: implemented.

Draft templates can be published once. Publication freezes the record. Later document saves and query updates are rejected; changes require a new monotonic version.

### AQ-D017: edition creation contract

Status: implemented at the foundation layer.

Edition provenance can be built only from the series' current published, frozen template. New series editions validate as drafts and carry a deep-copied snapshot.

### AQ-D018: migration sequencing

Status: implemented, not executed.

Migration 028 expands `events_core` with nullable series fields and partial indexes. It performs no historical inference or data rewrite. Contraction requires a separate approved migration.

### AQ-D019: auto-publication lock

Status: implemented.

The Phase 1 flag service rejects attempts to enable `activeQuestAutoPublishEnabled`. A later separately authorized phase must deliberately remove this lock.

### AQ-D020: operational deadline compatibility

Status: implemented.

Exact half-open PHT instants live in the immutable schedule snapshot. Legacy inclusive event-end fields store the exclusive instant minus one millisecond, preserving existing shared helper behavior.

### AQ-D021: publication boundary

Status: implemented.

Active Quest uses the normal event approval lifecycle, but only a full administrator can approve it. Organizer auto-approval never applies.

### AQ-D022: reward finalization

Status: implemented.

Approved distance is evaluated against only the registration-selected category. New category badge issuance occurs after the deadline and zero unresolved event reviews. Corrections can revoke or restore only system-issued rewards, with audit history.

### AQ-D023: reusable certificate design

Status: implemented.

Certificate design configuration is frozen inside each immutable Active Quest template snapshot. Generation clones the design into the existing event-scoped certificate system, allowing monthly customization without mutating the series version.

### AQ-D024: public series routing

Status: implemented.

Use permanent `/active-quest` and yearly `/active-quest/:year` discovery pages. Monthly editions retain normal event URLs and historical slugs.

### AQ-D025: analytics privacy

Status: implemented.

Active Quest admin analytics expose aggregate operational metrics only. They do not add participant-level exports or public personal data.

### AQ-D026: streak achievement finality

Status: implemented.

Recompute streak achievements only from editions past the review deadline with zero unresolved reviews. Reconciliation is idempotent and can revoke invalid system awards.

### AQ-D027: lifetime-distance deferral

Status: implemented as a safety boundary.

Do not add Active Quest 500K or 1000K achievements until activities have cross-event canonical identity and an approved duplicate-counting policy.

### AQ-D028: scheduler claim model

Status: implemented.

Use persistent unique generation jobs as atomic claims. Recover stale claims, cap retries at five, record failures, and generate future drafts only.

### AQ-D029: release authority boundary

Status: enforced.

Repository implementation and local preflight do not authorize production publication. November release requires production inventory, approved assets, readiness review, and explicit publication authority.

### AQ-D030: November public launch authority

Status: authorized, not executed.

Public launch of November Active Quest 2026 is authorized after the correct
HelloRun Supabase project, restorable backup, migration 028, exact deployment,
approved assets, private-draft readiness, and manual full-admin review all pass.
The current preparation run stops before every production write.
