# Related Events / Recommendations (P14)

**Created:** June 23, 2026
**Status:** ✅ Implemented — June 23, 2026
**Tests:** Auth subset 17/17 passing

---

## What Was Built

"Similar Events" section at the bottom of every event detail page showing up to 3 related events.

---

## Priority Logic

1. **Same organiser** — other published events by the same organiser, newest first
2. **Same race distances** — events sharing any of the current event's distances, newest first
3. **Fallback** — any event with open registration, newest first

Deduplicated across all 3 tiers. Current event never appears in its own related section. Section hidden entirely if no related events found. Hidden in preview mode.

---

## Implementation

### Controller (`src/controllers/page.controller.js`)
- Added `getEventCardDisplayState` to import from `public-event-list.service.js`
- New `getRelatedEvents(event, visibilityQuery, now)` helper function at bottom of file
- `getEventDetails()`: runs `getRelatedEvents()` in parallel with existing queries via `Promise.all`, passes `relatedEvents` to render

### View (`src/views/pages/event-details.ejs`)
- "Similar Events" section added before footer
- Shows banner image (120px), status badge, distance tags, title link, organiser name
- Hidden when `!relatedEvents.length` or `isPreviewMode`
- "Browse all events →" link at bottom of section

### CSS (`src/public/css/event-details.css`)
- 3-column grid on desktop, 2-column at ≤900px, single column at ≤580px
- Cards have hover shadow, linked title on hover turns orange
- Light blue-grey background contrasts with main page

---

## Files Changed

| File | Change |
|------|--------|
| `src/controllers/page.controller.js` | Import + `getRelatedEvents()` helper + updated `getEventDetails()` |
| `src/views/pages/event-details.ejs` | Similar Events section before footer |
| `src/public/css/event-details.css` | Related events grid + card styles |
