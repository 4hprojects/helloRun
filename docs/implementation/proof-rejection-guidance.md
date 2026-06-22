# Proof Rejection Guidance + Metadata Edit

**Created:** June 22, 2026
**Status:** ✅ Implemented — June 22, 2026
**Tests:** 44/44 auth passing
**Spec:** P6 from `docs/ROADMAP.md` and `docs/UX-IMPROVEMENT-PLAN.md`

---

## Problem

When a run submission is rejected, runners see the rejection reason text and a "Resubmit Proof" button — nothing in between. No guidance on what to fix. If they entered the wrong distance or time, they must upload a whole new proof file to correct a number.

---

## What Was Built

### Component 1 — Rejection Guidance Block
- Keyword-matching EJS helper on `submission-detail.ejs`
- 7 categories: distance/pace mismatch, time error, date error, unclear proof, name mismatch, wrong document, default
- Collapsible "How to fix this" section with actionable tip

### Component 2 — Metadata Edit Form (no new proof)
- New service function `editRejectedSubmissionMetadata()` in `submission.service.js`
- New route `POST /runner/submissions/:submissionId/edit-metadata` in `pageRoutes.js`
- New controller handler `postEditSubmissionMetadata()` in `page.controller.js`
- Inline form on submission detail: distance, time, date, run type, location (pre-filled)
- Strava submissions: edit form hidden; note shown instead
- On submit: status resets to 'submitted', submissionCount++, review fields cleared

### Component 3 — Resubmit Button UX
- Renamed "Resubmit Proof" → "Upload New Proof"
- Caption added: "Use this if your proof image was wrong or unclear."

---

## Files Changed

| File | Change |
|------|--------|
| `src/services/submission.service.js` | Add `editRejectedSubmissionMetadata()` + export |
| `src/routes/pageRoutes.js` | Add metadata edit route |
| `src/controllers/page.controller.js` | Add `postEditSubmissionMetadata()` handler |
| `src/views/runner/submission-detail.ejs` | Guidance block + edit form + button rename |
| `src/public/css/runner-submissions.css` | Guidance block + edit form styles |

---

## Verification Checklist

- [ ] Rejected submission → guidance block with relevant tip shown
- [ ] Strava rejected → edit form hidden, note shown
- [ ] Non-Strava rejected → edit form pre-filled with current values
- [ ] Submit edit → status = submitted, rejection cleared, count++
- [ ] Invalid distance → validation error
- [ ] "Upload New Proof" button still opens run proof modal
- [ ] Approved submission → no guidance or edit form
- [ ] `npm run test:auth` → 44/44 passing
