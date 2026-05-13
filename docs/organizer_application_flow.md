# Organizer Application Flow

## Current Implementation - May 13, 2026

Organizer accounts now land on `/organizer/dashboard` after login or email verification. The dashboard shows the current application state and links users to the application/status flow.

Routes:

- `/organizer/dashboard`: organizer landing page for approved and unapproved organizers.
- `/organizer/complete-profile`: organizer application form.
- `/organizer/complete-profile?edit=1`: editable application form for `pending`, `under_review`, and `rejected` applications.
- `/organizer/application-status`: application status page with review state, timeline, submitted details, and edit/dashboard actions.
- `/organizer/acknowledge-event-creation`: records pending-organizer acknowledgement before provisional create-event access.

## Status Behavior

- New organizer signup keeps `organizerStatus` as `not_applied` until an application is submitted.
- Submitted applications set the user `organizerStatus` to `pending`.
- Users can edit pending or under-review applications without re-uploading an existing ID proof.
- Rejected applications can be corrected and resubmitted through edit mode.
- Saving edits returns the application to `pending` and clears prior review fields.
- Approved applications cannot be edited through the organizer application form.

## Pending Organizer Event Creation

Pending organizers can see the normal `/organizer/dashboard` without interruption. The pending-account acknowledgement modal opens only when the organizer clicks a `Create New Event` action.

Before a pending organizer can access `/organizer/create-event`, they must:

- confirm the acknowledgement checkbox for limited pending-account event access;
- type their full account name as an electronic signature;
- submit the acknowledgement form.

The typed signature must match the account full name after trimming and normalizing whitespace/case. The server records the acknowledgement timestamp, signature name, IP address, and user agent in `User.organizerEventCreationAcknowledgement`.

After acknowledgement is saved, `canCreateEvents()` allows the pending organizer to open `/organizer/create-event`. Approved organizers continue to have normal create-event access without the modal.

## Document Requirements

- ID proof is required unless a previous ID proof is already on file.
- Business proof is optional for now. Solo or small organizers may submit without it, and admins may treat it as document pending.
- Accepted document types are PDF, JPG, PNG, and WebP.
- JPG and PNG uploads are converted to WebP before Cloudflare R2 storage. PDFs and existing WebP files are stored without image conversion.
- Organizer document object names use uniform labels such as `id-proof` and `business-proof`.

## Confidentiality and Replacement

Organizer verification documents are confidential review files. The edit page does not fetch, preview, or expose download links for the user's existing uploaded documents. It only shows that a document is securely on file.

When a user selects a replacement file for an existing document, a modal asks them to confirm the overwrite. If they save the update, the previous R2 object is deleted after the new document is stored and the application record is updated.

When an admin approves or rejects an application, stored verification documents are purged from Cloudflare R2 and the application document URLs are cleared. Admin detail pages show `Purged after verification` for finalized applications and `Document pending` for missing optional business proof.

## Verification

Focused coverage:

- `tests/upload-validation.test.js`
- `tests/organiser-application-review.test.js`
- `tests/organizer-dashboard-analytics.test.js`
- `tests/organizer-waiver-routes.test.js`
- `tests/privacy-signup-consent.test.js`
