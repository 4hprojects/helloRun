# Organizer Operations

**Status: Requirements source; partly implemented**

**Last reconciled:** August 7, 2026 · **Delivery state:** [STATUS.md](../../STATUS.md) · **Sequencing:** [delivery-plan.md](delivery-plan.md)

This document is part of a pack whose premise is out of date. Read the
[README preface](README.md) before using it.

> The check-in console, live board, bib assignment, race-kit release and results entry now
> exist. Staff roles, waitlist, per-size inventory, bulk actions and CSV import do not. Note
> that `inventory_movements` is shop-only and keyed on product variants, and there is no
> shirt-size field anywhere in the codebase.


## Organizer dashboard

Display:

- Total registrations
- Approved registrations
- Pending registrations
- Pending payments
- Payment proofs awaiting review
- Verified payments
- Waitlisted participants
- Cancelled registrations
- Checked-in participants
- No-shows
- Finishers
- Registrations by category
- Shirt-size totals
- Package totals
- Registration source
- Account users versus guests
- Guest-to-account conversion rate
- Inventory remaining

## Staff roles

### Event owner

- Full event control
- Staff management
- Sensitive exports
- Event cancellation and archival

### Registration manager

- View and edit registrations
- Approve or reject registrations
- Manage waitlist
- Import and export when permitted

### Payment verifier

- View payment records and proof
- Verify or reject payments
- No access to unrelated sensitive information

### Check-in staff

- Scan QR codes
- Search participants
- Mark check-in
- View only operational fields

### Race-kit staff

- View bib and kit allocation
- Mark kit or item release

### Results staff

- Record finish status and results
- Manage DNS, DNF, and DQ statuses

### Viewer

- Read-only access to permitted dashboards and reports

Permissions must be enforced server-side.

## Registration management table

Recommended filters:

- Registration status
- Payment status
- Category
- Guest or account user
- Shirt size
- Bib assignment
- Check-in status
- Registration date
- Registration source
- Potential duplicate
- Waitlisted

Recommended search fields:

- Name
- Email
- Phone
- Registration reference
- Bib number

## Bulk actions

- Approve registrations
- Reject registrations
- Verify payments
- Assign bib ranges
- Send reminders
- Export selected records
- Move to waitlist
- Cancel registrations
- Mark kits released

Bulk actions require:

- Confirmation step
- Permission check
- Result summary
- Audit log
- Partial-failure handling

## Bib assignment

Support:

- Manual assignment
- Automatic sequential assignment
- Category-based number ranges
- Import of existing bib numbers
- Duplicate-bib prevention
- Bib reassignment with audit history

## Inventory and race kits

Track inventory by option, including:

- Shirt size
- Race kit
- Meal
- Transportation
- Add-ons

Organizer chooses unavailable-option behavior:

- Hide
- Disable
- Offer alternative
- Allow backorder

Inventory must be rechecked when registration changes or when items are released.

## Check-in operations

Provide:

- Mobile QR scanner
- Manual participant search
- Bib search
- Payment and approval warnings
- Already-checked-in warning
- Kit-release action
- Limited participant details based on role

For poor connectivity, initial release should include:

- Lightweight pages
- Downloadable backup participant list
- Printable check-in sheet
- Manual reference and bib search

Full offline synchronization can be a later phase.

## CSV import

Recommended flow:

1. Upload CSV.
2. Select event and category mapping.
3. Map source columns to HelloRun fields.
4. Normalize values.
5. Validate each row.
6. Show valid, invalid, duplicate, and capacity-conflict rows.
7. Confirm import.
8. Create imported guest registrations.
9. Generate downloadable error report.

Import validation should detect:

- Missing required values
- Invalid email or phone
- Unknown category
- Duplicate participant
- Invalid option value
- Invalid date
- Capacity conflict
- Unsupported custom-field value

## CSV export

Provide exports for:

- Participant master list
- Payment reconciliation
- Check-in list
- Bib list
- Race-kit distribution
- Category summary
- Emergency contact sheet
- Results list

Export controls:

- Field selection
- Masked contact data
- Sensitive-field exclusion
- Staff permission checks
- Export audit events

## Notifications

Organizer may send:

- Registration confirmation
- Payment instructions
- Payment verification or rejection
- Waitlist promotion
- Event reminders
- QR code reminder
- Event changes
- Check-in instructions
- Results and certificate availability

Store delivery attempts, provider IDs, status, retry count, and failure reason.

## Event lifecycle controls

### Draft

- All settings editable
- Test registration allowed

### Published or registration open

- Public registration allowed
- Destructive form changes restricted
- Field versioning required

### Registration closed

- Public registration disabled
- Organizer and walk-in registration may remain configurable

### Ongoing

- Check-in and walk-ins active
- Participant self-edits normally disabled

### Completed

- Results and certificate operations active

### Archived

- Mostly read-only

### Cancelled

- New registrations disabled
- Notifications and refund handling available
