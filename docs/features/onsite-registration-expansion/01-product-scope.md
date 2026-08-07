# Product Scope

**Status: Historical reference**

**Last reconciled:** August 7, 2026 · **Delivery state:** [STATUS.md](../../STATUS.md) · **Sequencing:** [delivery-plan.md](delivery-plan.md)

This document is part of a pack whose premise is out of date. Read the
[README preface](README.md) before using it.

> Much of the scope below already shipped before this pack was written — event types,
> participation mode, bibs, check-in, race kits, result imports, QR generation and a timing
> webhook. Treat the outcomes list as a wish list to check against
> [delivery-plan.md](delivery-plan.md), not as a description of missing work.


## Objective

Expand HelloRun from a primarily virtual-event platform into a platform that can also create and manage onsite events. The implementation must improve code organization and provide a reusable registration foundation for virtual, onsite, and future hybrid events.

## Core outcomes

HelloRun should allow organizers to:

- Create onsite events and categories.
- Accept registrations from HelloRun users and guests.
- Build registration forms using standard, profile-linked, event-specific, and custom fields.
- Configure capacity, waitlists, payment, approval, edit, duplicate, and privacy rules.
- Manage participants, imports, exports, bibs, race kits, check-in, and results.
- Assign staff with limited permissions.
- Track actions through audit logs.

Participants should be able to:

- Register using an existing HelloRun account.
- Receive prefilled profile information when available.
- Register as a guest when enabled.
- Receive a registration reference, secure management link, confirmation email, and QR code when applicable.
- Create or connect a HelloRun account after registration without re-entering the same information.
- Claim eligible guest registrations after identity verification.

## Event types

Supported event types:

- `virtual`
- `onsite`
- `hybrid` as a future combination of virtual and onsite capabilities

The implementation must avoid scattered event-type conditions across controllers. Event-specific behavior must be provided through event handlers or strategies.

## Registration access modes

Each event may support one or more of the following:

- HelloRun account required
- Guest registration allowed
- Account or guest registration
- Organizer-managed registration
- Walk-in registration
- Imported registration
- External registration link

Recommended default for public onsite events:

- Account or guest registration

## Main participant journeys

### Logged-in participant

1. Open event registration.
2. HelloRun loads event fields and matching profile values.
3. Profile-linked fields are prefilled.
4. Participant reviews details and completes missing or event-specific fields.
5. Participant accepts required consent and waiver versions.
6. Registration is validated and saved with a participant snapshot.
7. Participant receives confirmation, reference, and QR code when enabled.

### Guest participant

1. Open event registration.
2. Choose guest registration.
3. Complete all required fields.
4. Submit registration.
5. Receive registration reference and secure guest-management link.
6. Receive an invitation to create a HelloRun account.
7. Account signup uses prefilled name, email, and contact information.
8. After verification, the guest registration is linked to the new or existing account.

### Organizer journey

1. Create onsite event.
2. Configure categories, capacity, pricing, registration dates, and eligibility.
3. Select standard fields and add custom fields.
4. Configure guest access, payment, approval, duplicate, waitlist, consent, and edit rules.
5. Preview registration as account user and guest.
6. Publish event.
7. Manage registration, payment, bibs, inventory, and staff.
8. Check in participants.
9. Record attendance, results, kit release, and completion.
10. Export reports and review analytics.

## Functional scope

### Included in initial architecture

- Shared registration services
- Event-type handlers
- Participant profile mapping
- Registration snapshots
- Guest registration
- Secure registration management links
- Account claiming
- Standard and custom fields
- Conditional fields and sections
- Capacity and waitlist foundations
- Duplicate detection
- Registration statuses
- Organizer authorization
- Audit logging
- Notifications
- CSV export
- Backward compatibility for current virtual events

### Organizer operations scope

- Manual payment proof and verification
- Bib assignment
- QR and manual check-in
- Walk-in registration
- Race-kit inventory
- Staff roles
- Bulk actions
- CSV import
- Waitlist promotion
- Basic dashboard analytics

### Deferred advanced capabilities

- Direct online payment gateway
- Full refund automation
- RFID or chip timing integrations
- Live timing and live leaderboards
- Full offline-first check-in application
- Advanced hybrid-event combinations
- Automated fraud analysis for onsite payments

## Non-functional requirements

- Mobile-first participant registration and staff check-in
- Server-side validation and authorization
- Accessible labels, touch targets, and validation messages
- Event timezone support
- Secure private file storage
- Auditability of sensitive actions
- Backward compatibility during migration
- Feature-flagged rollout
- Automated regression tests
