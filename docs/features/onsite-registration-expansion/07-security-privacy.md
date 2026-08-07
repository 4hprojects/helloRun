# Security and Privacy Requirements

**Status: Requirements source; current**

**Last reconciled:** August 7, 2026 · **Delivery state:** [STATUS.md](../../STATUS.md) · **Sequencing:** [delivery-plan.md](delivery-plan.md)

This document is part of a pack whose premise is out of date. Read the
[README preface](README.md) before using it.

> The strongest document in the pack and still the reference for this work. It correctly
> identified the QR weakness — codes encode the raw event id, unsigned and unrevocable — which
> remains open and is sequenced as P2 in [delivery-plan.md](delivery-plan.md).


## Authorization

Every protected action must verify:

- User identity
- Organizer membership
- Event ownership or assignment
- Required role or permission
- Registration belongs to the event
- Sensitive fields are permitted for the staff role

Do not rely on hidden buttons or client-side checks.

## Guest management links

Use secure random tokens.

Requirements:

- Store token hash, not raw token
- Use sufficiently long random values
- Support expiration
- Support revocation
- Rate-limit attempts
- Invalidate claim token after successful use
- Require additional verification for sensitive changes

Registration reference numbers are public identifiers and must not grant access by themselves.

## QR security

QR codes must not include personal information or database IDs.

Use:

- Random token, or
- Signed and revocable token

Invalidate QR tokens when a registration is:

- Cancelled
- Transferred
- Replaced
- Suspected compromised

## Audit logs

Record:

- Registration creation and edit
- Payment upload, verification, rejection, and refund
- Status changes
- Bib assignment or change
- Check-in
- Kit release
- Cancellation and transfer
- Guest registration claiming
- Participant export
- Staff-role changes
- Sensitive-data access where practical

Audit logs should include actor, event, registration, action, old and new value, IP address, user agent, reason, and timestamp.

## Consent versioning

Store:

- Consent type
- Version
- Content hash
- Acceptance timestamp
- Accepted-by identity
- IP address
- User agent

If a waiver changes materially, create a new version. Existing registrations must retain the version they accepted.

## File uploads

For payment proof, consent documents, and other files:

- Allow only configured types
- Enforce file-size limits
- Validate MIME type
- Generate secure filenames
- Store privately in Cloudflare R2
- Serve using short-lived signed URLs
- Enforce authorization on every download
- Compress images where appropriate
- Remove unnecessary metadata where practical
- Add malware scanning later if not available initially

Never expose permanent predictable public URLs.

## Rate limiting and abuse prevention

Rate-limit:

- Guest registration submission
- Claim-token attempts
- Verification-code requests
- Registration lookup
- Payment-proof upload
- QR validation
- Login and signup

Use Cloudflare Turnstile for guest registration and suspicious traffic when appropriate.

Detect or review:

- Automated submissions
- Repeated duplicates
- Excessive claim attempts
- Malformed email and phone values
- File-upload abuse

## Duplicate detection

Duplicate detection may use:

- Account ID
- Verified email
- Normalized phone
- Name and birth date
- Organizer-defined participant identifier

Organizer policy may warn, block, or allow.

Never merge or delete suspected duplicates automatically without review.

## Data visibility

Each field may define:

- Participant visibility
- Organizer visibility
- Staff visibility
- Exportability
- Public visibility
- Sensitive status

Public lists must be optional and disabled by default.

Never publish:

- Email
- Phone
- Exact address
- Medical data
- Emergency contact
- Payment proof
- Identification documents

## Data retention

Define retention by data category:

- Registration records may remain for event history.
- Payment proof should be deleted after settlement and configured retention.
- Medical data should be deleted after the organizer-defined period.
- Guardian documents should be deleted after the configured period.
- Audit logs may be retained longer.
- Public results follow event privacy settings.

Organizers should receive warnings before deleting fields or records with historical responses.

## Privacy-safe exports

Default exports should exclude sensitive fields.

Require additional permission for:

- Emergency contact export
- Medical information export
- Payment proof access
- Identification document access

Record export audit events.

## Notification privacy

- Do not place sensitive values in email subject lines.
- Use secure links rather than attaching sensitive files.
- Do not expose full participant lists in notification templates.
- Avoid logging raw secure tokens.
