# Submission Review Workflow Redesign

**Created:** June 22, 2026
**Status:** ✅ Implemented — June 22, 2026
**Tests:** Auth subset 17/17 + unit 6/6 passing
**Triggered by:** Full audit of organiser submission review flow

---

## Problem

Current workflow to approve 1 submission from the hub: Open Review → iframe modal → Open Full Page (new tab) → fill form → submit → back to review page → navigate back manually. **3 page loads, 5+ clicks.**

The modal is an iframe that shows nothing actionable. No quick actions on list. No auto-advance. OCR data always expanded (noise). Proof image opens new tab.

---

## What Was Built

### Component 1 — AJAX Review Panel (replaces iframe modal)
- New `GET /organizer/submissions/:id/review-panel` JSON endpoint
- Modal now renders AJAX content: participant info, proof image inline, activity metrics, OCR warnings, approve/reject forms
- No iframe, no new tab required

### Component 2 — Inline Approve/Reject via fetch
- Approve/reject in modal submits via `fetch()` — no page reload
- Card status badge updates in-place on success
- Error shown inline, form stays for retry

### Component 3 — Quick-Approve on List Cards
- Non-flagged pending cards get a "✓ Approve" button directly on the card
- Flagged/suspicious items: no quick-approve (force full context review)
- Single click → fetch POST → card updates in-place

### Component 4 — Auto-Advance to Next Pending
- After approve/reject from modal: 1.2s flash → auto-opens next pending item
- "Next →" manual button in modal footer
- If no next item: "All caught up ✓" state shown

### Component 5 — Review Page Quality Improvements
- OCR section collapsed by default (`<details>` not `<details open>`)
- Proof image lightbox (click to zoom, click anywhere to close)
- Keyboard shortcuts: `A` → focus approve, `R` → focus reject, `Escape` → back to queue
- "Next Pending →" button appears after approve/reject

---

## Files Changed

| File | Change |
|------|--------|
| `src/routes/organizer.routes.js` | New review-panel JSON endpoint |
| `src/services/submission-hub.service.js` | Add proofUrl, proofMimeType, approveUrl, rejectUrl to hub rows |
| `src/views/organizer/submissions.ejs` | Quick-approve buttons; data-submission-id on cards |
| `src/views/partials/submission-link-modal.ejs` | Replace iframe with content div |
| `src/public/js/submission-link-modal.js` | Full rewrite: AJAX load, panel render, inline fetch, auto-advance |
| `src/views/organizer/submission-review.ejs` | OCR collapsed; lightbox; keyboard shortcuts; Next Pending button |
| `src/public/css/submission-hub.css` | Panel styles; quick-approve; lightbox overlay |

---

## Verification Checklist

- [ ] "Open Review" → AJAX panel loads with proof image, metrics, approve/reject forms
- [ ] Approve in modal → no reload, badge updates green, next pending auto-loads
- [ ] Quick-approve on clean card → 1 click, card turns green
- [ ] Flagged card → no quick-approve button
- [ ] Full review page: OCR collapsed by default
- [ ] Click proof image → lightbox overlay opens
- [ ] Press A → approve textarea focused; R → reject textarea focused
- [ ] After approve/reject on full page → "Next Pending →" button shown
- [ ] `npm run test:auth` → 44/44 passing
