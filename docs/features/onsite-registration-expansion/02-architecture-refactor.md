# Architecture and Refactor Plan

**Status: Superseded**

**Last reconciled:** August 7, 2026 · **Delivery state:** [STATUS.md](../../STATUS.md) · **Sequencing:** [delivery-plan.md](delivery-plan.md)

This document is part of a pack whose premise is out of date. Read the
[README preface](README.md) before using it.

> Rejected in full. The `src/modules/` tree conflicts with the established
> `src/{controllers,routes,services,models,middleware}` layout, and the scattered event-type
> conditionals it targets do not exist: the registration controller has 18 event-type
> references, already centralised in helpers. The service layer this document asks for is
> already present.


## Architectural objective

Introduce onsite event registration by refactoring the current registration architecture into shared modules and event-specific handlers. Do not implement onsite registration by adding large numbers of `if (event.type === ...)` branches inside existing controllers.

## Suggested module structure

```text
src/
├── modules/
│   ├── registration/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── validators/
│   │   ├── policies/
│   │   ├── repositories/
│   │   ├── field-types/
│   │   ├── profile-mapping/
│   │   ├── guest-access/
│   │   ├── notifications/
│   │   ├── exports/
│   │   └── errors/
│   ├── events/
│   │   ├── shared/
│   │   ├── virtual/
│   │   ├── onsite/
│   │   └── hybrid/
│   ├── payments/
│   ├── check-in/
│   ├── inventory/
│   ├── staff/
│   └── audit/
```

Adjust paths to match the existing HelloRun repository structure.

## Shared registration core

The shared registration core should handle:

- Registration creation and retrieval
- Participant identity resolution
- Profile-prefill mapping
- Guest participant creation
- Registration snapshots
- Form response normalization
- Form validation and sanitization
- Duplicate checks
- Capacity checks
- Waitlist decisions
- Status transitions
- Consent capture
- Confirmation notifications
- Claim-token creation and verification
- Registration ownership

## Event-type handlers

Define a common handler interface.

```js
class RegistrationEventHandler {
  async validateContext(context) {}
  async validatePayload(context) {}
  async beforeCreate(context) {}
  async afterCreate(context) {}
  async beforeStatusChange(context) {}
  async afterStatusChange(context) {}
}
```

Implement:

- `VirtualRegistrationHandler`
- `OnsiteRegistrationHandler`
- `HybridRegistrationHandler` later

Example resolver:

```js
function getRegistrationHandler(eventType) {
  const handlers = {
    virtual: virtualRegistrationHandler,
    onsite: onsiteRegistrationHandler,
    hybrid: hybridRegistrationHandler
  };

  const handler = handlers[eventType];
  if (!handler) throw new UnsupportedEventTypeError(eventType);
  return handler;
}
```

## Core services

Recommended services:

- `RegistrationService`
- `RegistrationQueryService`
- `ParticipantProfileService`
- `GuestParticipantService`
- `RegistrationClaimService`
- `RegistrationFormService`
- `RegistrationFieldService`
- `ProfileFieldMapperService`
- `DuplicateRegistrationService`
- `CapacityService`
- `WaitlistService`
- `RegistrationStatusService`
- `ConsentService`
- `PaymentService`
- `CheckInService`
- `BibService`
- `InventoryService`
- `NotificationService`
- `RegistrationImportService`
- `RegistrationExportService`
- `AuditService`

## Thin controllers

Controllers should:

- Parse request context
- Call policies and services
- Return views, redirects, or JSON responses
- Pass errors to centralized error handling

Controllers should not directly contain:

- Profile mapping
- Event-type business rules
- Capacity calculations
- Duplicate detection
- Claim-token logic
- Payment verification rules
- Notification-provider calls
- QR-token generation

Example:

```js
async function submitRegistration(req, res, next) {
  try {
    const result = await registrationService.register({
      eventId: req.params.eventId,
      actorUser: req.user || null,
      sessionId: req.sessionID,
      payload: req.body,
      files: req.files,
      requestMeta: {
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    return res.redirect(result.successUrl);
  } catch (error) {
    return next(error);
  }
}
```

## Policies and authorization

Use dedicated policies for:

- Viewing event registrations
- Editing registrations
- Verifying payments
- Checking in participants
- Exporting participant data
- Viewing sensitive fields
- Assigning staff
- Managing event settings
- Claiming guest registrations

Authorization must be checked server-side for every protected action.

## Status transitions

Use a status transition service rather than direct field assignment.

```js
await registrationStatusService.transition({
  registration,
  toStatus: 'approved',
  actor,
  reason: 'payment_verified'
});
```

The service should:

- Validate allowed transition
- Apply event-specific rules
- Update timestamps
- Record audit event
- Trigger notifications asynchronously after commit

## Notifications

Notification failures must not invalidate a successful registration.

Flow:

1. Save registration successfully.
2. Commit registration state.
3. Attempt email notification.
4. Log provider result.
5. Queue or permit resend if failed.

## Error handling

Use typed domain errors where possible:

- `RegistrationClosedError`
- `CapacityReachedError`
- `DuplicateRegistrationError`
- `InvalidRegistrationStatusError`
- `UnauthorizedRegistrationAccessError`
- `InvalidClaimTokenError`
- `PaymentVerificationError`
- `InventoryUnavailableError`

## Backward compatibility layer

During migration, expose existing virtual registration behavior through adapter services.

```js
class LegacyVirtualRegistrationAdapter {
  async register(input) {
    return registrationService.register({
      ...mapLegacyInput(input),
      eventType: 'virtual'
    });
  }
}
```

Existing routes may temporarily call adapters while new routes call shared services directly.

## Refactor order

1. Document current registration routes, models, middleware, and virtual-event dependencies.
2. Add regression tests around existing virtual registration.
3. Extract response normalization and validation.
4. Extract registration persistence and status transitions.
5. Add event-type handler interface.
6. Move virtual-specific logic into the virtual handler.
7. Add profile mapping and participant snapshots.
8. Add guest registration and claiming.
9. Add onsite handler and onsite-specific services.
10. Migrate controllers to thin orchestration.
11. Remove legacy branches only after regression tests pass.
