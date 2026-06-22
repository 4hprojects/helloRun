# Event Wishlist / Favorites (P10)

**Created:** June 22, 2026
**Status:** ✅ Implemented — June 22, 2026
**Tests:** Auth subset 17/17 passing

---

## What Was Built

Runners can now save/bookmark events they're interested in before registering. Heart icon on every event card and event detail page. Saved events section on the runner dashboard.

---

## Implementation

### User model — `savedEvents` field
- `savedEvents: [{ type: ObjectId, ref: 'Event' }]` added to User schema
- No migration needed (MongoDB lazy field)

### Save-toggle route
- `POST /runner/events/:eventSlug/save-toggle` (runner.routes.js)
- Uses `$addToSet` / `$pull` for atomic toggle
- Returns `{ success, saved: bool }` JSON
- Rate-limited via `groupActionLimiter`

### Page controller updates
- `getEvents()`: loads `savedEventIds` Set for authenticated users, passed to view
- `getEventDetails()`: passes `isSaved: bool` based on user's savedEvents

### Runner dashboard
- `buildRunnerDashboardViewData()` fetches saved event documents
- New `dashboard-saved-events.ejs` partial — shows title, status badge, start date, remove button
- Included in `dashboard.ejs` after the upcoming events section

### Views
- `events.ejs`: heart button on each card (guests see nothing; authenticated see heart)
- `event-details.ejs`: save button in event hero CTA area
- `dashboard.ejs`: saved events partial included

### AJAX toggle (`src/public/js/event-save.js`)
- Intercepts clicks on `.js-save-event` buttons
- fetch POST → updates all matching buttons on page instantly (no reload)
- Heart fills red when saved; removes card row from dashboard on unsave
- Included on events.ejs, event-details.ejs, dashboard.ejs

### CSS (`src/public/css/events.css`)
- `.btn-save-event.is-saved` → red heart fill via SVG fill property

---

## Files Changed

| File | Change |
|------|--------|
| `src/models/User.js` | Add `savedEvents` array |
| `src/routes/runner.routes.js` | Add Event import + save-toggle route |
| `src/controllers/page.controller.js` | Pass savedEventIds / isSaved to event views |
| `src/controllers/runner.controller.js` | Add Event import + fetch savedEvents for dashboard |
| `src/views/pages/events.ejs` | Heart button on cards + event-save.js script |
| `src/views/pages/event-details.ejs` | Save button in hero + event-save.js script |
| `src/views/runner/dashboard.ejs` | Include saved-events partial + event-save.js script |
| `src/views/runner/partials/dashboard-saved-events.ejs` | **New** — saved events card |
| `src/public/js/event-save.js` | **New** — AJAX toggle handler |
| `src/public/css/events.css` | Heart button filled/red styles |
