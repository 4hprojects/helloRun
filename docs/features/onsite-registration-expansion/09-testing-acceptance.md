# Testing and Acceptance Criteria

**Status: Requirements source; current**

**Last reconciled:** August 7, 2026 · **Delivery state:** [STATUS.md](../../STATUS.md) · **Sequencing:** [delivery-plan.md](delivery-plan.md)

This document is part of a pack whose premise is out of date. Read the
[README preface](README.md) before using it.

> Its concurrency requirements were sound and two are now met — repeated scans no longer
> create duplicate check-ins, and a registration cannot hold multiple live bibs (migration
> `023`). The last-slot capacity race remains open and is sequenced as P3.


## Unit tests

Cover:

- Form response normalization
- Field validation
- Profile-key resolution
- Participant snapshot creation
- Duplicate detection
- Capacity and inventory rules
- Price calculations
- Status transitions
- Claim-token generation and verification
- QR-token verification
- Permission checks
- Consent version capture
- Event-timezone calculations

## Integration tests

### Logged-in registration

- Prefills profile values
- Requires missing required fields
- Saves snapshot
- Does not silently update profile
- Creates confirmation and audit event

### Guest registration

- Works without account
- Applies rate limiting and validation
- Generates secure management link
- Generates claim token
- Sends confirmation without blocking success

### Account claiming

- New account can claim after verification
- Existing account is asked to sign in
- Invalid, expired, used, or revoked token fails
- Registration cannot be claimed by wrong identity

### Payment

- Proof upload is private
- Payment verification requires permission
- Rejection records reason
- Verification updates status and audit log

### Waitlist

- Joins when capacity is full
- Promotion respects order and category
- Expired promotion releases slot

### Check-in

- Valid QR checks in participant
- Duplicate scan warns
- Cancelled, unpaid, invalid, wrong-event, and revoked QR are blocked
- Manual check-in enforces same rules

### Import

- Maps columns
- Validates rows
- Detects duplicates and capacity conflicts
- Produces error report
- Creates imported guest registrations only after confirmation

### Registration edits

- Honors edit deadline
- Restricts category and payment fields
- Preserves audit history
- Disables self-edit after check-in when configured

### Virtual compatibility

- Existing virtual registration still works
- Existing activity submissions still work
- Distance, steps, elevation, OCR validation, rankings, badges, and certificates still work
- Existing dashboards still display records correctly

## Security tests

- Unauthorized organizer cannot access another event
- Staff cannot exceed assigned permissions
- Guest token cannot be guessed through reference number
- Raw token is not stored
- Signed URLs expire
- Private files cannot be accessed without authorization
- Rate limits are enforced
- Server rejects hidden conditional-field bypasses
- Export restrictions are enforced
- QR token cannot expose personal information

## Concurrency tests

- Two users cannot claim the same final slot
- Inventory cannot be oversold under concurrent registration
- Duplicate bib assignment is prevented
- Claim token is single-use under concurrent requests
- Repeated QR scans do not create multiple check-ins

## Accessibility and mobile tests

- Registration works on common mobile screen sizes
- Inputs have labels
- Errors are understandable and associated with fields
- Keyboard navigation works
- Status is not communicated through color alone
- Buttons are touch-friendly

## Performance tests

- Registration submission under expected event load
- Participant list pagination and filtering
- QR validation response time
- CSV import batch processing
- Dashboard aggregation performance

## Acceptance criteria by phase

### Phase 1 accepted when

- Existing virtual tests pass.
- Shared registration service is used by virtual registration.
- Logged-in onsite registration works.
- Guest registration works.
- Registration snapshots and form versions are saved.
- Account claiming works securely.
- Organizer authorization and audit logging are active.
- Feature flags can disable all new behavior.

### Phase 2 accepted when

- Payment proof and manual verification work.
- Bib assignment prevents duplicates.
- QR and manual check-in work.
- Staff permissions are enforced.
- CSV import and export work.
- Inventory and waitlist flows work.

### Phase 3 accepted when

- Advanced capabilities meet separate specifications and do not regress prior phases.
