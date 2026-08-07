# Implementation Checklist

**Status: Superseded**

**Last reconciled:** August 7, 2026 · **Delivery state:** [STATUS.md](../../STATUS.md) · **Sequencing:** [delivery-plan.md](delivery-plan.md)

This document is part of a pack whose premise is out of date. Read the
[README preface](README.md) before using it.

> Replaced by [delivery-plan.md](delivery-plan.md). Phases 0–3 and 7 of this checklist are
> largely redundant — they describe software that already shipped.


Use this checklist when implementing the refactor and onsite registration feature.

## Phase 0: Repository assessment

- [ ] Identify all existing registration routes.
- [ ] Identify all registration controllers and middleware.
- [ ] Identify current event and registration models.
- [ ] Identify direct model access from views and utilities.
- [ ] Identify virtual-only registration logic.
- [ ] Identify activity-submission, OCR, ranking, badge, and certificate dependencies.
- [ ] Document current status values.
- [ ] Add regression tests before refactoring.

## Phase 1: Shared registration foundation

- [ ] Create shared registration module.
- [ ] Create typed domain errors.
- [ ] Extract response normalization.
- [ ] Extract field validation and sanitization.
- [ ] Create registration repository or persistence abstraction.
- [ ] Create registration status transition service.
- [ ] Create event-type handler interface.
- [ ] Move virtual-specific logic into virtual handler.
- [ ] Add legacy virtual adapter.
- [ ] Add participant snapshot generation.
- [ ] Add registration public ID and reference generation.
- [ ] Add audit service.
- [ ] Add server-side authorization policies.
- [ ] Add feature flags.

## Phase 2: Form builder and profile mapping

- [ ] Create field registry.
- [ ] Add profile-linked, event, and custom field sources.
- [ ] Add standard field library.
- [ ] Add sections.
- [ ] Add required rules.
- [ ] Add conditional visibility.
- [ ] Add server-side conditional validation.
- [ ] Add duplicate-field warnings.
- [ ] Add form versioning.
- [ ] Preserve field labels and option labels in registration snapshots.
- [ ] Add organizer preview as account user and guest.

## Phase 3: Onsite event registration

- [ ] Add onsite event type and settings.
- [ ] Add category capacity.
- [ ] Add registration access modes.
- [ ] Add registration lifecycle checks.
- [ ] Add onsite registration handler.
- [ ] Add logged-in profile-prefill flow.
- [ ] Add organizer-configurable edit rules.
- [ ] Add duplicate policy.
- [ ] Add consent version capture.
- [ ] Add timezone-aware deadlines.

## Phase 4: Guest registration and claiming

- [ ] Add guest participant model.
- [ ] Add guest registration flow.
- [ ] Add rate limiting and Turnstile support.
- [ ] Add secure management token.
- [ ] Add secure claim token.
- [ ] Store token hashes only.
- [ ] Add guest success page.
- [ ] Add account invitation.
- [ ] Prefill signup data.
- [ ] Add new-account claim flow.
- [ ] Add existing-account sign-in and claim flow.
- [ ] Add multiple eligible registration review.
- [ ] Revoke tokens after use.

## Phase 5: Payment and approval

- [ ] Add payment record.
- [ ] Add free, onsite, and manual-transfer modes.
- [ ] Add private proof upload.
- [ ] Add payment status transitions.
- [ ] Add payment verifier permission.
- [ ] Add rejection reason.
- [ ] Add amount verification.
- [ ] Add participant notifications.
- [ ] Add price snapshot.
- [ ] Add reservation policy.

## Phase 6: Organizer operations

- [ ] Add participant table with filters and search.
- [ ] Add staff roles and permissions.
- [ ] Add bulk actions.
- [ ] Add CSV export.
- [ ] Add CSV import mapping and validation.
- [ ] Add import error report.
- [ ] Add waitlist management.
- [ ] Add cancellation requests.
- [ ] Add transfer foundation.
- [ ] Add dashboard analytics.

## Phase 7: Bibs, inventory, and check-in

- [ ] Add onsite detail model.
- [ ] Add manual and automatic bib assignment.
- [ ] Prevent duplicate bib numbers.
- [ ] Add inventory model.
- [ ] Add shirt, kit, meal, transport, and add-on inventory.
- [ ] Add QR token generation and revocation.
- [ ] Add mobile QR check-in.
- [ ] Add manual search check-in.
- [ ] Add already-checked-in and invalid-status warnings.
- [ ] Add kit-release tracking.
- [ ] Add downloadable backup participant list.

## Phase 8: Security and privacy

- [ ] Enforce server-side policies on every protected route.
- [ ] Add audit events for sensitive operations.
- [ ] Add signed R2 URLs.
- [ ] Add MIME and file-size validation.
- [ ] Add export restrictions.
- [ ] Add data retention configuration.
- [ ] Add consent and waiver versioning.
- [ ] Add token and QR revocation.
- [ ] Add sensitive-field visibility rules.
- [ ] Confirm public lists are disabled by default.

## Phase 9: Migration and rollout

- [ ] Add migration version fields.
- [ ] Build idempotent dry-run migration script.
- [ ] Add batch processing and failure logs.
- [ ] Back up database.
- [ ] Enable shared services for virtual routes.
- [ ] Run virtual regression tests.
- [ ] Enable internal onsite test events.
- [ ] Pilot with selected organizers.
- [ ] Monitor errors and audit events.
- [ ] Enable general availability only after pilot acceptance.

## Definition of done

- [ ] No extensive onsite conditionals were added to existing virtual controllers.
- [ ] Shared services are reusable across event types.
- [ ] Virtual behavior remains functional.
- [ ] Guest registration is genuinely optional and usable without an account.
- [ ] Post-registration account signup does not require re-entering participant data.
- [ ] Registration claiming is secure and verified.
- [ ] Capacity and inventory are concurrency-safe.
- [ ] Organizer actions are authorized and audited.
- [ ] Sensitive files and fields remain private.
- [ ] New features can be disabled through feature flags.
- [ ] Unit, integration, security, concurrency, mobile, and regression tests pass.
