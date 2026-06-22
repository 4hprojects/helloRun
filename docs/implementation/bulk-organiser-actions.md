# Bulk Organiser Actions Implementation

**Created:** June 22, 2026
**Status:** ✅ Implemented — June 22, 2026
**Tests:** 44/44 auth passing
**Spec:** P7 from `docs/ROADMAP.md` and `docs/UX-IMPROVEMENT-PLAN.md`

---

## Problem

Organisers with 50+ registrants spend hours reviewing submissions and payment proofs one by one. No bulk select, no bulk approve, no way to notify unpaid runners.

---

## What Was Built

### Action 1 — Bulk Submission Approve
- Checkboxes on pending submission cards in `submissions.ejs`
- "Select All Pending" toggle + "Approve Selected" form
- Route: `POST /organizer/submissions/bulk-approve`
- Runs `reviewSubmission()` in parallel via `Promise.allSettled()` (badges + certs auto-handled)
- Cap: 50 per action

### Action 2 — Bulk Payment Proof Approve
- Checkboxes on pending payment proof cards in `payment-proof-review.ejs`
- Route: `POST /organizer/events/:id/payment-reviews/bulk-approve`
- Extracted `approveRegistrationPayment()` service helper (shared with single approve)
- Runs in parallel, cap 50

### Action 3 — "Email All Unpaid" Reminder
- "Email Unpaid" button on registrants page → confirmation modal
- Route: `POST /organizer/events/:id/registrants/email-unpaid`
- New `organiser.payment_reminder` event + `sendOrganizerPaymentReminderEmail()`
- Sends to all `unpaid` / `proof_rejected` registrants, cap 100

---

## Files Changed

| File | Change |
|------|--------|
| `src/views/organizer/submissions.ejs` | Checkboxes + select-all + bulk approve form + JS |
| `src/views/organizer/payment-proof-review.ejs` | Checkboxes + select-all + bulk approve form + JS |
| `src/views/organizer/event-registrants.ejs` | "Email Unpaid" button + confirmation modal |
| `src/routes/organizer.routes.js` | 3 new bulk routes + refactor payment approve |
| `src/services/email.service.js` | `sendOrganizerPaymentReminderEmail()` |
| `src/services/communication-events.registry.js` | `organiser.payment_reminder` event |
| `src/services/communication.service.js` | Wire `organiser.payment_reminder` |

---

## Verification Checklist

- [ ] Select 3 pending submissions → Approve Selected → all approved, badges evaluated
- [ ] Select 2 pending payment proofs → Approve Selected → both paid, achievements triggered
- [ ] Email Unpaid → modal shows count → confirm → redirect with count
- [ ] Organiser cannot bulk-approve submissions from other organisers' events
- [ ] >50 selected → first 50 processed, remainder noted in message
- [ ] `npm run test:auth` → 44/44 passing
