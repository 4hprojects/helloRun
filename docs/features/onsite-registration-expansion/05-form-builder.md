# Registration Form Builder

**Status: Partially implemented — the useful subset shipped August 8, the rest still deferred**

Organiser-defined questions now exist: up to ten per event, as a short answer, a pick from a
list, or an agreement checkbox, asked on every registration path and included in the
registrants export. See `src/services/custom-questions.service.js`.

Still deferred, each with a reason rather than an omission: file upload (needs R2 plumbing,
size and type handling, and a retention story), conditional routing (the complexity
multiplier, and nothing asks for it), profile-linked fields, sections, repeating groups and
address composites. The reuse premise below — the HelloUniversity builder — remains false.

**Last reconciled:** August 7, 2026 · **Delivery state:** [STATUS.md](../../STATUS.md) · **Sequencing:** [delivery-plan.md](delivery-plan.md)

This document is part of a pack whose premise is out of date. Read the
[README preface](README.md) before using it.

> This document depends on reusing "the HelloUniversity form or quiz builder", which **does
> not exist in this repository**. Registration fields are a fixed Mongoose sub-document.
> Deferred until there is evidence that fixed fields are insufficient.


## Objective

Provide a reusable form system for virtual, onsite, and future hybrid events. Reuse concepts from the HelloUniversity form or quiz builder, including field types, required flags, options, sections, validation, conditional routing, sanitization, and server-side validation. Do not directly couple HelloRun registration to quiz-specific logic.

## Field categories

### Profile-linked fields

Connected to a reusable participant profile key.

Examples:

- `profile.firstName`
- `profile.middleName`
- `profile.lastName`
- `profile.email`
- `profile.phone`
- `profile.birthDate`
- `profile.gender`
- `profile.address.barangay`
- `profile.emergencyContact.name`

### Event fields

Belong only to a registration.

Examples:

- Category
- Distance
- Shirt size
- Package
- Running club
- Wave
- Meal option
- Transportation option
- Payment method

### Custom fields

Organizer-defined questions that are not standard profile or event fields.

## Supported field types

Initial field types:

- `text`
- `paragraph`
- `email`
- `phone`
- `number`
- `date`
- `single_choice`
- `multiple_choice`
- `dropdown`
- `yes_no`
- `checkbox_agreement`
- `file_upload`
- `information_block`
- `profile_linked`

Potential future types:

- Address composite
- Repeating group
- Signature
- Time
- Currency

## Field schema

```js
{
  id,
  key,
  type,
  label,
  description,
  source: 'profile' | 'event' | 'custom',
  profileKey,
  required,
  prefill,
  editable,
  allowProfileUpdate,
  options,
  validation,
  visibilityRule,
  sectionId,
  organizerVisibility,
  participantVisibility,
  exportable,
  isSensitive,
  order
}
```

## Standard field library

### Personal information

- First name
- Middle name
- Last name
- Full name
- Email address
- Contact number
- Birth date
- Age
- Gender
- Address
- Sitio
- Barangay
- Municipality
- Province

### Emergency and safety

- Emergency contact name
- Emergency contact number
- Relationship
- Medical condition
- Allergy
- Blood type
- Special medical instruction

These fields must be optional unless genuinely required and should be marked sensitive.

### Event information

- Distance category
- Race category
- Shirt size
- Package
- Running club
- Team name
- Expected pace
- Transportation option
- Meal preference
- Wave assignment

### Registration and payment

- Payment method
- Payment reference
- Payment proof
- Discount code
- Membership number

### Consent

- Event waiver
- Data privacy consent
- Photo and video consent
- Health declaration
- Guardian consent

## Organizer templates

Recommended templates:

### Basic onsite event

- Full name
- Email
- Contact number
- Category
- Emergency contact
- Waiver

### Standard fun run

- Personal details
- Address
- Category
- Shirt size
- Running club
- Emergency contact
- Payment fields
- Waiver and privacy consent

### School or workplace event

- Personal details
- School, office, or department
- Student or employee number
- Category
- Emergency contact
- Internal consent

## Prefill behavior

For logged-in participants:

1. Resolve each `profileKey`.
2. Prefill values when available.
3. Allow review and correction when editable.
4. Save submitted value in registration snapshot.
5. Do not silently update the permanent profile.
6. Offer an explicit `Save this change to my profile` option only for reusable fields.

Never automatically sync:

- Medical information
- Payment proof
- Event waiver
- Guardian consent
- Identification files
- Event-specific declarations

## Duplicate field detection

The builder should warn when organizers add the same standard field more than once.

Example:

> A standard Contact Number field is already included. Add another contact field anyway?

Custom fields may duplicate labels intentionally, but organizers should receive a warning.

## Sections and conditional logic

Support sections and visibility rules.

Examples:

- Show guardian section when participant age is below the configured threshold.
- Show payment proof when payment method is manual transfer.
- Show team name when team category is selected.
- Show medical details only when participant answers yes to a health question.

Conditional logic must be validated server-side. Client-side hiding is only a user-interface aid.

## Validation

Supported validation rules:

- Minimum and maximum length
- Minimum and maximum number
- Email format
- Philippine mobile number format
- Date range
- Age requirement
- Allowed file types
- File size limit
- Required agreement
- Allowed choices
- Custom regular expression when safely supported

## Response normalization

Normalize before validation and persistence:

- Trim strings
- Lowercase normalized emails
- Normalize phone format
- Convert dates to a consistent representation
- Convert checkbox values to arrays or booleans
- Remove unknown fields
- Reject unsupported option values

## Form versioning

Each published change creates a new form version.

Registrations must retain:

- Form version ID
- Field ID and key
- Field label at submission
- Field type at submission
- Option label at submission
- Submitted value

Rules:

- Unused fields may be deleted.
- Fields with responses should be archived.
- Options with selections should be deactivated rather than removed.
- Field-type changes after responses should create a new field or version.
- Profile mapping changes affect future registrations only.

## Form preview and testing

Organizer should be able to:

- Preview as logged-in user
- Preview as guest
- Test conditional logic
- Test mobile layout
- Submit a test registration
- Test confirmation email
- Test QR check-in
- Delete or exclude test records from analytics
