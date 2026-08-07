# Registration Workflows

**Status: Requirements source; partly implemented**

**Last reconciled:** August 7, 2026 · **Delivery state:** [STATUS.md](../../STATUS.md) · **Sequencing:** [delivery-plan.md](delivery-plan.md)

This document is part of a pack whose premise is out of date. Read the
[README preface](README.md) before using it.

> Check-in, walk-up handling at the desk, bib assignment and kit release now exist. Guest
> registration, claiming, waitlist, transfers and cancellation do not. See
> [delivery-plan.md](delivery-plan.md) for which of these are sequenced and which are
> deferred.


## Logged-in participant registration

1. Resolve current user and participant profile.
2. Load published event form version.
3. Prefill profile-linked fields.
4. Show missing, editable, and event-specific fields.
5. Validate event lifecycle, deadline, capacity, category, inventory, duplicate policy, and eligibility.
6. Validate and sanitize submitted responses.
7. Capture consent versions.
8. Recheck capacity and inventory atomically at submission.
9. Save participant snapshot and response snapshot.
10. Create payment record when needed.
11. Create onsite detail and QR token when enabled.
12. Record audit event.
13. Show success page.
14. Send confirmation notification without blocking success.

## Guest registration

1. Confirm guest registration is enabled.
2. Apply rate limiting and Turnstile when configured.
3. Load published event form version.
4. Collect all required profile-linked and event-specific values manually.
5. Normalize email and phone.
6. Check duplicate policy.
7. Validate capacity and inventory.
8. Create guest participant.
9. Create registration with participant snapshot.
10. Generate secure management token and optional claim token.
11. Create QR token when enabled.
12. Show registration reference and secure access link.
13. Send confirmation email or message.
14. Present account creation invitation.

Guest registration must remain valid even when the participant declines account creation.

## Post-registration account creation

Success-page actions:

- `Create My HelloRun Account`
- `Continue Without an Account`

Account creation page should prefill:

- First name
- Last name
- Email
- Contact number when collected

Participant should normally only need to:

- Create password
- Verify email
- Accept HelloRun terms

After verification:

1. Verify claim token.
2. Confirm account identity matches eligible registration.
3. Link registration to user.
4. Mark guest record as claimed.
5. Invalidate claim token.
6. Add registration to participant dashboard.
7. Record audit event.

## Existing-account claim

When the email already belongs to a verified HelloRun account:

1. Ask participant to sign in.
2. Revalidate claim token.
3. Confirm email ownership.
4. Show eligible registrations.
5. Let participant confirm which registrations to claim.
6. Link selected registrations.
7. Invalidate relevant tokens.

Do not silently merge registrations based only on email matching.

## Registration management for guests

Guest management links may allow:

- View confirmation
- View payment instructions
- Upload payment proof
- Edit permitted fields
- Request cancellation
- View QR code
- View certificate when allowed

Sensitive actions should require one-time email verification or another proof of identity.

## Registration edits

Event settings define:

- Whether participants may edit
- Edit deadline
- Editable fields
- Whether category or package changes are allowed
- Whether organizer approval is required

Rules:

- Save registration snapshots and form-version references.
- Organizer edits require audit logs.
- Category, package, pricing, or payment changes may trigger recalculation and approval.
- After check-in, participant self-editing should normally be disabled.

## Payment proof flow

1. Registration created as `pending_payment`.
2. Participant sees payment instructions.
3. Participant uploads proof and reference number.
4. Payment becomes `submitted`.
5. Registration may become `payment_submitted`.
6. Authorized payment staff review proof.
7. Staff verify or reject.
8. Verification records staff user, amount, timestamp, and audit event.
9. Registration becomes `approved` when all approval requirements are satisfied.
10. Participant receives notification.

Notification failure must not roll back payment verification.

## Capacity reservation

Supported policies:

- Reserve on registration submission
- Reserve on payment-proof submission
- Reserve on payment verification

Capacity checks must be repeated at final submission and handled atomically where possible.

For temporary reservations, store expiration and release the slot when the reservation expires.

## Waitlist flow

1. Capacity is reached.
2. Participant joins category-specific or event-wide waitlist.
3. Registration becomes `waitlisted`.
4. Promotion occurs manually or automatically.
5. Promoted participant receives a payment or confirmation deadline.
6. Slot is confirmed when required action is completed.
7. If deadline expires, promote the next participant.

## Cancellation flow

1. Participant requests cancellation or organizer initiates cancellation.
2. Validate cancellation policy and deadline.
3. Record reason.
4. Invalidate active QR token.
5. Release reserved capacity and inventory where applicable.
6. Start refund review when allowed.
7. Record audit event.
8. Notify participant.

## Transfer flow

1. Original participant requests transfer.
2. Validate transfer policy and deadline.
3. Collect new participant details.
4. Require new waiver and consent acceptance.
5. Recalculate pricing if needed.
6. Organizer approves when required.
7. Replace participant ownership through a controlled service.
8. Invalidate old QR token and create new token.
9. Preserve audit history of original and replacement participant.

## Walk-in registration

1. Authorized staff open event-day registration interface.
2. Select category and package.
3. Collect required participant details and consent.
4. Record onsite payment when applicable.
5. Assign bib and inventory.
6. Create registration source `walk_in`.
7. Mark checked in immediately when appropriate.
8. Offer post-event account claiming.

## QR check-in

1. Staff scan QR code.
2. System resolves random or signed token.
3. Confirm event match.
4. Confirm registration is valid and not cancelled.
5. Display limited participant summary based on staff role.
6. Show payment, bib, category, and kit status.
7. Mark checked in after confirmation.
8. Record staff user, timestamp, device metadata, and audit event.

Possible responses:

- Valid registration
- Already checked in
- Cancelled
- Unpaid
- Wrong event
- Invalid QR
- Revoked QR
- Duplicate scan

## Manual check-in

Search by:

- Name
- Email
- Phone
- Registration reference
- Bib number

Manual check-in must enforce the same status and authorization rules as QR check-in.

## Result and fulfillment flow

Onsite events may track:

- Start status
- Finish status
- Finish time
- Overall and category position
- DNS, DNF, and DQ status
- Race-kit release
- Medal release
- Certificate availability

Advanced live timing integrations are outside the initial scope.
