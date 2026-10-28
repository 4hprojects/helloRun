# Active Quest Issues

Last updated: 2026-10-28

## Open critical and high issues

### AQ-I001: generated events can reach existing auto-approval

Severity: critical. Status: resolved in Phase 4.

Generated editions remain drafts. Active Quest is excluded from organizer auto-approval and requires manual full-admin approval.

### AQ-I002: selected-category accumulated badge award is unproven

Severity: critical. Status: resolved in Phase 5.

Approved accumulated distance now maps only to the registration-selected category. Final-review issuance, idempotency, overtarget isolation, and reversal behavior have focused tests.

### AQ-I003: deadline representation conflicts with current inclusive checks

Severity: high. Status: resolved in Phases 2–3.

Immutable snapshots retain exact half-open instants. Existing inclusive operational fields receive the exclusive instant minus one millisecond.

### AQ-I004: no immutable series template or edition identity

Severity: high. Status: resolved in Phase 1.

The repository now has series and immutable template models plus unique series/month identity. Historical editions remain untouched.

### AQ-I005: no persistent audited Active Quest flags

Severity: high. Status: resolved in Phase 1.

All four flags now fail closed in persistent series state. Changes require full-admin access, a reason, provenance history, and critical audit emission. Auto-publication remains locked off.

### AQ-I006: dual-database series fields can drift

Severity: high. Status: mitigated; applied locally only in Phase 10.

Mongo event fields, shadow normalization, checksums, SQL writes, and additive migration 028 now change together. Migration 028 passed against loopback development Postgres. Production still requires normal migration controls before series events are saved with Postgres sync enabled.

### AQ-I007: lifetime distance can count the same real activity more than once

Severity: high. Status: open.

Runner lifetime totals sum approved rows without a cross-event canonical activity identity. Defer series distance achievements pending policy and design.

## Open medium issues

### AQ-I008: certificate templates are mutable and event-scoped

Severity: medium. Status: resolved in Phase 5.

Reusable certificate configuration is frozen in each Active Quest template version and cloned into each monthly event.

### AQ-I009: generic publish readiness is incomplete for Active Quest

Severity: medium. Status: resolved in Phase 4.

Active Quest now has a dedicated publication validator covering provenance, schedule, categories, assets, structured dates, content, and certificate readiness.

### AQ-I010: one unresolved review can delay all accumulated certificates

Severity: medium. Status: open.

Current finalization waits for zero unresolved reviews across the event. Confirm whether this event-wide gate matches operations.

### AQ-I011: provider and OCR copy can overstate current capability

Severity: medium. Status: open.

Official Strava submission is blocked. URL verification is manual corroboration. OCR is advisory unless separately enabled.

### AQ-I012: multi-replica scheduler duplication risk

Severity: medium. Status: resolved in Phase 9.

Persistent unique generation jobs provide atomic claims, stale recovery, bounded retries, and observable failure records. Edition uniqueness remains a second idempotency boundary.

### AQ-I013: supplied package fails documentation heading validation

Severity: low. Status: open; package preserved unchanged.

`12_EFFORT_AND_TOKEN_ESTIMATE.md:21` jumps from H1 to H3. This is the only observed `docs:check` failure during Stage 0.

### AQ-I014: production does not serve the Active Quest implementation

Severity: critical. Status: open.

On October 29, 2026, production `/active-quest` returned HTTP 404. Health reported the served commit as `unknown`. The production MongoDB database does not contain the new Active Quest series or template-version collections. Deploy and verify the repository implementation before any production foundation setup.

### AQ-I015: production category reward assets are incomplete

Severity: critical. Status: open.

Production R2 contains one event badge image for September and one for October. No six-asset category set exists for November. Existing Mongo badge-content rows do not supply category image URLs. Publication readiness must remain blocked until 25K, 50K, 75K, 100K, 150K, and 200K assets are approved and reachable.

### AQ-I016: production migration state is unreachable

Severity: critical. Status: open.

The configured Supabase hostname returned `ENOTFOUND` during an authorized read-only transaction attempt. Migration 028 and event-badge rows cannot be verified. Identify the live Postgres project and restore read-only connectivity before migration review or deployment.

## Production inventory state

- Historical May through October events and organizer IDs are inventoried in `PRODUCTION_INVENTORY_2026-10-29.md`.
- No November edition or expected-slug conflict exists as of the inventory timestamp.
- Recent September and October editions are owned by a full administrator. Earlier May through August editions use a separate organiser account.
- Active September and October certificate templates exist and provide reusable design candidates. No candidate is approved for November yet.
- Applied Postgres migration versions remain unknown because the configured hostname is unavailable.
- Final six category badge assets do not exist.
- Existing production reward outcomes, backup state, web replica count, and worker topology remain unknown.

These blockers prevent production setup or publication. The October 29 inspection was read-only and authorized; it did not authorize deployment or data mutation.
