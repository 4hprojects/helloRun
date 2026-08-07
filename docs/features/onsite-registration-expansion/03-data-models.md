# Proposed Data Models

**Status: Superseded in part**

**Last reconciled:** August 7, 2026 · **Delivery state:** [STATUS.md](../../STATUS.md) · **Sequencing:** [delivery-plan.md](delivery-plan.md)

This document is part of a pack whose premise is out of date. Read the
[README preface](README.md) before using it.

> The MongoDB models proposed here for onsite detail and inventory **must not** be built:
> that data lives in PostgreSQL (`007_phase7_onsite_operations.sql`), which this pack never
> mentions, and duplicating it would create two sources of truth for bib and kit state. The
> 14-status registration model is also not adopted — the current enums are referenced across
> ~25 files including the Postgres shadow sync. The consent, claim-token and audit shapes
> remain useful references.


The following schemas are implementation guidance. Adapt names and references to the existing HelloRun MongoDB and Mongoose conventions.

## Event additions

```js
{
  eventType: 'virtual' | 'onsite' | 'hybrid',
  eventTimezone: 'Asia/Manila',
  lifecycleStatus: 'draft' | 'published' | 'registration_open' |
    'registration_closed' | 'ongoing' | 'completed' | 'archived' | 'cancelled',

  registrationSettings: {
    accessMode: 'account_required' | 'guest_allowed' | 'account_or_guest' |
      'organizer_managed' | 'external',
    allowWalkIns: Boolean,
    allowImports: Boolean,
    requiresApproval: Boolean,
    allowParticipantEdits: Boolean,
    editDeadlineAt: Date,
    allowTransfers: Boolean,
    allowCancellationRequests: Boolean,
    publicParticipantList: Boolean,
    publicResults: Boolean,
    capacityPolicy: 'reserve_on_submit' | 'reserve_on_payment_submit' |
      'reserve_on_payment_verify',
    duplicatePolicy: {
      mode: 'warn' | 'block' | 'allow',
      matchBy: ['account', 'email', 'phone', 'name_birthdate'],
      allowMultipleCategories: Boolean
    }
  },

  paymentSettings: {
    mode: 'free' | 'pay_onsite' | 'manual_transfer' | 'online_gateway',
    currency: 'PHP',
    instructions: String,
    proofRequired: Boolean,
    paymentDeadlineAt: Date
  },

  featureFlags: {
    guestRegistration: Boolean,
    qrCheckIn: Boolean,
    walkInRegistration: Boolean,
    registrationImport: Boolean,
    paymentProof: Boolean
  }
}
```

## Participant profile

Reusable profile information should be stored separately from event registrations.

```js
{
  userId,
  firstName,
  middleName,
  lastName,
  email,
  phone,
  birthDate,
  gender,
  address: {
    line1,
    sitio,
    barangay,
    municipality,
    province,
    postalCode,
    country
  },
  emergencyContact: {
    name,
    relationship,
    phone
  },
  runningClub,
  updatedAt
}
```

Sensitive or event-specific information must not be added to the reusable profile automatically.

## Guest participant

```js
{
  publicId,
  firstName,
  middleName,
  lastName,
  email,
  phone,
  normalizedEmail,
  normalizedPhone,
  claimedByUserId: null,
  claimedAt: null,
  createdAt,
  updatedAt
}
```

## Registration

```js
{
  publicId,
  registrationReference,
  eventId,
  eventType,
  userId: null,
  guestParticipantId: null,
  participantType: 'account' | 'guest' | 'walk_in' | 'imported',

  participantSnapshot: {
    firstName,
    middleName,
    lastName,
    email,
    phone,
    birthDate,
    gender,
    address,
    emergencyContact
  },

  formVersionId,
  categoryId,
  packageId,
  answers: [
    {
      fieldId,
      fieldKey,
      fieldLabel,
      fieldType,
      value,
      optionLabel,
      isSensitive
    }
  ],

  status,
  paymentStatus,
  registrationSource: 'web' | 'walk_in' | 'import' | 'organizer',

  priceSnapshot: {
    currency,
    baseFee,
    categoryFee,
    packageFee,
    addOns,
    discountCode,
    discountAmount,
    serviceFee,
    totalAmount
  },

  consentRecords: [ObjectId],
  createdAt,
  updatedAt,
  cancelledAt,
  checkedInAt
}
```

Exactly one of `userId` or `guestParticipantId` may be present for account or guest registrations. Organizer-managed imported records may initially have neither if data cleanup is pending, but this should be exceptional.

## Registration statuses

Recommended core statuses:

- `draft`
- `pending`
- `pending_payment`
- `payment_submitted`
- `payment_verified`
- `approved`
- `waitlisted`
- `rejected`
- `cancelled`
- `checked_in`
- `did_not_attend`
- `finished`
- `disqualified`
- `certificate_available`

Use a transition map rather than arbitrary updates.

## Payment record

```js
{
  registrationId,
  method: 'cash' | 'gcash' | 'bank_transfer' | 'onsite' | 'gateway',
  expectedAmount,
  submittedAmount,
  verifiedAmount,
  currency,
  referenceNumber,
  proofFileId,
  status: 'not_required' | 'pending' | 'submitted' | 'verified' |
    'rejected' | 'refunded' | 'partially_refunded',
  submittedAt,
  verifiedAt,
  verifiedBy,
  rejectionReason,
  refundAmount,
  refundedAt
}
```

## Onsite registration detail

```js
{
  registrationId,
  bibNumber,
  waveId,
  qrTokenHash,
  qrTokenVersion,
  qrRevokedAt,
  checkedInAt,
  checkedInBy,
  checkInMethod: 'qr' | 'manual' | 'walk_in',
  raceKitStatus: 'not_released' | 'partially_released' | 'released',
  raceKitReleasedAt,
  raceKitReleasedBy,
  resultStatus: 'not_started' | 'started' | 'finished' | 'dnf' | 'dns' | 'dq',
  finishTimeMs,
  finishPosition,
  categoryPosition
}
```

## Virtual registration detail

Existing virtual fields should be moved or mapped into a virtual-specific record when practical.

```js
{
  registrationId,
  activitySubmissionIds,
  accumulatedDistance,
  accumulatedSteps,
  accumulatedElevation,
  completionStatus,
  proofValidationSummary
}
```

## Registration form

```js
{
  eventId,
  currentVersionId,
  status: 'draft' | 'published' | 'archived',
  createdAt,
  updatedAt
}
```

## Registration form version

```js
{
  registrationFormId,
  versionNumber,
  sections: [
    {
      id,
      title,
      description,
      order,
      visibilityRule
    }
  ],
  fields: [
    {
      id,
      key,
      type,
      label,
      description,
      source: 'profile' | 'event' | 'custom',
      profileKey,
      sectionId,
      required,
      prefill,
      editable,
      allowProfileUpdate,
      options,
      validation,
      visibilityRule,
      organizerVisibility,
      participantVisibility,
      exportable,
      isSensitive,
      order,
      archivedAt
    }
  ],
  waiverVersionIds,
  publishedAt,
  createdBy
}
```

## Consent record

```js
{
  registrationId,
  consentType: 'event_waiver' | 'privacy' | 'photo_video' |
    'health_declaration' | 'guardian_consent',
  version,
  contentHash,
  accepted: Boolean,
  acceptedAt,
  acceptedBy: 'participant' | 'guardian' | 'organizer_staff',
  acceptedByName,
  ipAddress,
  userAgent
}
```

## Claim token

```js
{
  registrationId,
  guestParticipantId,
  tokenHash,
  purpose: 'claim_registration' | 'manage_registration' | 'verify_sensitive_action',
  expiresAt,
  usedAt,
  revokedAt,
  createdAt
}
```

## Audit event

```js
{
  organizerId,
  eventId,
  registrationId,
  actorUserId,
  actorRole,
  action,
  previousValue,
  newValue,
  reason,
  ipAddress,
  userAgent,
  createdAt
}
```

## Staff assignment

```js
{
  eventId,
  userId,
  role: 'owner' | 'registration_manager' | 'payment_verifier' |
    'check_in_staff' | 'race_kit_staff' | 'results_staff' | 'viewer',
  permissions,
  assignedBy,
  assignedAt,
  revokedAt
}
```

## Inventory item

```js
{
  eventId,
  type: 'shirt' | 'race_kit' | 'meal' | 'transport' | 'addon',
  optionKey,
  label,
  capacity,
  reserved,
  released,
  backorderAllowed,
  status: 'active' | 'inactive' | 'depleted'
}
```

## Index recommendations

Add indexes for:

- `registrationReference` unique
- `publicId` unique
- `eventId + userId`
- `eventId + guestParticipantId`
- normalized email and phone for duplicate checking
- `eventId + status`
- `eventId + paymentStatus`
- `eventId + categoryId`
- `eventId + bibNumber` unique when bib exists
- claim-token hash unique
- audit events by `eventId + createdAt`
