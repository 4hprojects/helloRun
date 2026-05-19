# Payment-Proof Review Page

## Overview

HelloRun now has a dedicated organizer/admin page for event registration payment-proof tracking and verification:

`GET /organizer/events/:eventId/payment-proofs/review`

The page gives organizers a focused workflow for reviewing uploaded payment receipts without relying on the wider registrants table.

## Current Behavior

- Shows event context and payment review metrics for pending, reviewed, approved, and rejected receipts.
- Supports queue filters for pending, approved, rejected, and all payment proofs.
- Supports search by confirmation code, participant name, or participant email.
- Displays participant details, confirmation code, race distance, participation mode, expected payment, payee, payment instructions, proof link, and image preview when the proof is an image.
- Pending proofs include approve and reject forms that reuse the existing registration payment review endpoints.
- Reviewed proofs show reviewed timestamp, reviewer details, rejection reason, and review notes.
- Empty states distinguish no pending proofs from no results matching the current filters.

## Routes and Reused Actions

- Review page: `GET /organizer/events/:eventId/payment-proofs/review`
- Approve: `POST /organizer/events/:id/registrants/:registrationId/payment/approve`
- Reject: `POST /organizer/events/:id/registrants/:registrationId/payment/reject`

The page uses the existing registration payment status model:

- `proof_submitted`: pending review
- `paid`: approved
- `proof_rejected`: rejected

## Access Control

- Approved organizers can access the page for events they own.
- Admins can access any event payment-proof review page.
- Runners, unauthenticated users, and unrelated organizers are blocked by the same access rules used for registrant review pages.

## Integration Points

- Organizer dashboard payment-review links now point to the dedicated page.
- Admin review queue payment items now open the dedicated page.
- The legacy registrants-table review controls remain available for compatibility.
- The registrants page links to the focused payment-proof review page when filtered to submitted payment receipts.

## Validation

Covered by:

- `tests/payment-route-guards.test.js`
- `tests/organizer-dashboard-analytics.test.js`
- `tests/admin-dashboard.test.js`

Verified scenarios:

- Auth and ownership enforcement.
- Pending proof render with proof URL, participant details, expected payment, payee, and review forms.
- Rejected/reviewed filter render with review history.
- Search no-match empty state.
- Dashboard and admin queue link updates.

## Out of Scope

- Standalone shop-order payment proof upload/review UI.
- Payment gateway automation and webhook reconciliation.
- Schema changes or migrations.
