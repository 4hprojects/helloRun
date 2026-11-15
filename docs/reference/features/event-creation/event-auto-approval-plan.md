# HelloRun Event Auto-Approval Plan

This document tracks the planned event auto-approval work for HelloRun. It is a living implementation tracker for the current manual approval flow, the first safe automatic approval criteria, rollout phases, and acceptance tests.

## Current State

Event publishing is currently manual after organiser submission.

- Event status flow is `draft -> pending_review -> published`.
- Organisers create or edit events as drafts.
- Submitting an event for review sets the event to `pending_review`.
- Submit-for-review uses the existing publish-readiness validation from `getPublishReadinessErrors(event)`.
- Admin approval currently publishes the event manually from the admin event detail page.
- Admin approval sets `status` to `published`, records `approvedAt` and `approvedBy`, writes a critical audit event, generates default event badges, and evaluates organiser achievement badges.
- Public event visibility requires `status: published`, not deleted, not a personal-record event, and within the `publicListingAvailableAt` rule.
- There is no current event auto-approval path.

## Auto-Approval V1 Criteria

V1 should be conservative. The first implementation target is free virtual events only.

An event may auto-approve only when all criteria are true:

- Event status is `pending_review`.
- `getPublishReadinessErrors(event)` returns no errors.
- Organiser account is approved.
- Organiser email is verified.
- Event type is virtual-only.
- Event fee mode is free.
- Event has no physical rewards.
- Event has no delivery requirements.
- Event has no paid collection, payment QR, payment account setup, or paid pricing configuration.
- Event has no onsite or hybrid logistics.
- Event passes content and media safety checks once those checks are implemented.
- Auto-publishing writes audit metadata with a system actor or explicit system-auto-approval marker.
- Auto-publishing triggers the same publish side effects as manual approval, including badge generation and organiser achievement evaluation.

## Manual Review Required

The event must remain in admin review when any of these conditions apply:

- Paid events.
- Onsite events.
- Hybrid events.
- Events with physical rewards.
- Events with delivery or merchandise requirements.
- Events from pending organisers.
- Events from unverified organisers.
- Events with publish-readiness validation errors.
- Events with content safety flags.
- Events with media safety flags.
- Events with payment setup risk.
- Events with suspicious schedule, date, or registration-window issues.
- Events with organiser trust-score risk flags.
- Events with prior admin intervention signals that make automatic publication unsafe.

## Implementation Checklist

- [x] Define an event auto-approval eligibility service.
- [x] Reuse `getPublishReadinessErrors(event)` as a hard eligibility gate.
- [x] Add system actor or system marker support for auto-approval audit metadata.
- [x] Wire auto-approval after valid submit-for-review.
- [x] Keep the admin manual approval path unchanged.
- [x] Ensure auto-approval triggers the same publish side effects as manual approval.
- [x] Add admin visibility for auto-approved events.
- [ ] Add dry-run logging before enabling automatic publication.
- [x] Add tests for eligible free virtual events.
- [x] Add tests for ineligible paid events.
- [x] Add tests for ineligible onsite and hybrid events.
- [x] Add tests for ineligible unapproved or unverified organisers.
- [x] Add tests for audit and side-effect parity with manual approval.

## Phased Rollout

### Phase 1: Documentation and Criteria

- Track current manual flow.
- Lock V1 criteria.
- Identify manual-review exclusions.
- Define acceptance tests.

### Phase 2: Dry-Run Eligibility Logging

- Evaluate auto-approval eligibility after submit-for-review.
- Do not publish automatically.
- Log eligibility outcome, failed criteria, event ID, organiser ID, and rule version.
- Use logged outcomes to validate criteria against real event submissions.

### Phase 3: Auto-Publish Free Virtual Low-Risk Events

- Enable automatic publication only for events that satisfy all V1 criteria.
- Use a system actor or system-auto-approval marker for audit.
- Trigger the same side effects as manual admin approval.
- Keep all non-eligible events in `pending_review`.

### Phase 4: Data-Based Expansion

- Review production outcomes before expanding criteria.
- Consider paid events only after payment account verification and fraud controls exist.
- Consider onsite or hybrid events only after safety and logistics review criteria are explicit.
- Expand by rule version, not by broad default approval.

## Test Plan

- Free virtual eligible event auto-approves.
- Paid event remains `pending_review`.
- Onsite event remains `pending_review`.
- Hybrid event remains `pending_review`.
- Event with publish-readiness errors cannot auto-approve.
- Event from an unapproved organiser cannot auto-approve.
- Event from an unverified organiser cannot auto-approve.
- Event with physical rewards cannot auto-approve.
- Event with delivery requirements cannot auto-approve.
- Event with content or media risk flags cannot auto-approve once those flags exist.
- Auto-approved event writes audit metadata.
- Auto-approved event triggers the same publish side effects as manual approval.
- Manual admin approval continues to work for `pending_review` events.

## Acceptance Criteria

- The first implementation does not bypass existing publish-readiness validation.
- The first implementation does not auto-approve paid, onsite, hybrid, reward-bearing, or delivery-bearing events.
- Ineligible events remain reviewable by admins through the existing admin flow.
- Auto-approved events become publicly visible under the same visibility rules as manually approved events.
- Auto-approved events are distinguishable in audit records or admin metadata.
- Badge generation and organiser achievement evaluation remain consistent with manual approval.

## Open Questions

- What exact organiser trust-score thresholds should be required before auto-approval?
- Can paid events ever auto-approve, or should they always require manual review?
- Should content moderation start as rule-based checks or use an external moderation service?
- Should media moderation start as file/type checks only or include image content review?
- Should HelloRun add a `rejected` or `changes_requested` event status before expanding auto-approval?
- Should auto-approval be controlled by a global feature flag, per-organiser allowlist, or both?
- What admin UI label should be used for auto-approved events?

## Defaults and Assumptions

- This file is the source tracker for event auto-approval planning.
- The first implementation target is free virtual events only.
- Existing manual admin approval remains the fallback for all other events.
- Existing event status values remain unchanged for V1.
- Existing publish-readiness validation remains the source of truth for event completeness.
- Automatic approval must be auditable before it is enabled for real publishing.
