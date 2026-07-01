# Event Promotion Feature

## Document Role
- **Purpose:** Spec and implementation tracker for the organiser/admin event promotion (bulk email) feature.
- **Status:** Active — implementation in progress Jun 30, 2026.

---

## Feature Summary

Organisers and admins can email runner audiences about upcoming events directly from the platform.

- **Organiser scope:** Own runner pool only (previous participants OR runners who haven't joined their events). Daily cap: 20 emails/day (basic package).
- **Admin scope:** Any event, any audience (including all runners). No daily cap.
- **Platform email limit:** Resend free tier — 100 emails/day total.
- **Email content:** Auto-generated professional template with event poster, event details, and "Register Now" CTA.

---

## Implementation Status

| Phase | Description | Status | Completed |
|-------|-------------|--------|-----------|
| 1a | `EventPromotion` MongoDB model | ✅ Done | Jun 30, 2026 |
| 1b | `sendEventPromotionEmail` HTML template in email.service.js | ✅ Done | Jun 30, 2026 |
| 1c | Register `event.promotion` event key in communication.service.js | ✅ Done | Jun 30, 2026 |
| 2 | Organiser promotion page (GET/POST /organizer/promote + preview AJAX) | ✅ Done | Jun 30, 2026 |
| 3 | Admin promotion page (GET/POST /admin/promote + preview AJAX) | ✅ Done | Jun 30, 2026 |
| 4 | Polish, tests, CLAUDE.md fix, commit, push, docs update | ✅ Done | Jun 30, 2026 |

---

## Phase Details

### Phase 1 — Foundation

**1a. `src/models/EventPromotion.js`**
Fields: `organizerId`, `eventId`, `audience` (previous_participants / non_participants / all_runners), `recipientCount`, `dateKey` (YYYY-MM-DD), `status` (sending/completed/failed), `adminTriggered`, `sentAt`, `createdAt`.
Indexes: `{ organizerId, dateKey }` and `{ eventId, dateKey }`.

**1b. `src/services/email.service.js`**
New function `sendEventPromotionEmail(to, firstName, eventTitle, posterUrl, eventUrl, organiserName)`.
- 600px max-width container, orange gradient header.
- Event poster image inline (CDN URL from `Event.posterImageUrl || bannerImageUrl`).
- Subject: `Don't miss it: {eventTitle} — Register Now`
- "Register Now" CTA button.
- Footer attribution + opt-out note.

**1c. `src/services/communication.service.js`**
Add `case 'event.promotion'` to `sendEventEmail()` switch.
Seed `CommunicationEventSetting` for `event.promotion` (priority: low, email: true, inApp: false).

### Phase 2 — Organiser Page

Routes in `src/routes/organiser/event-management.js`:
- `GET /organizer/promote` — page with event picker + audience selector + quota bar + campaign history
- `GET /organizer/promote/preview` — JSON: recipient count + quota status
- `POST /organizer/promote` — validate quota → resolve audience → fan-out via `notifyWithRetryInBackground`

View: `src/views/organizer/event-promote.ejs`

Daily quota: 20 emails/day tracked via `EventPromotion` aggregate on `(organizerId, dateKey)`.

### Phase 3 — Admin Page

Routes in `src/routes/admin.routes.js`:
- `GET /admin/promote`, `GET /admin/promote/preview`, `POST /admin/promote`

Handlers in `src/controllers/admin/events.controller.js`.
View: `src/views/admin/promote.ejs`

Admin extras: all-runners audience option, no quota check, shows platform DailyEmailUsage remaining.

### Phase 4 — Ship

- Fix CLAUDE.md ("Nodemailer" → "Resend")
- `npm test` full suite
- Commit → push
- Update `docs/STATUS.md` + `docs/ROADMAP.md`

---

## Key Files

| File | Role |
|------|------|
| `src/models/EventPromotion.js` | New — campaign log + quota source |
| `src/services/email.service.js` | Add `sendEventPromotionEmail` |
| `src/services/communication.service.js` | Add `event.promotion` event key case |
| `src/routes/organiser/event-management.js` | Add 3 organiser promotion routes |
| `src/views/organizer/event-promote.ejs` | New — organiser promotion page |
| `src/routes/admin.routes.js` | Add 3 admin promotion routes |
| `src/controllers/admin/events.controller.js` | Add 3 admin promotion handlers |
| `src/views/admin/promote.ejs` | New — admin promotion page |
