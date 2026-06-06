# DOCUMENT ROLE (REPOSITORY TRACKER)
- Purpose: File-level repository tracking and chronological implementation changelog.
- Scope: Added/updated/removed files, behavior changes, and session smoke checklist.
- Planning source: See PRD.md for roadmap, backlog, and detailed tasks.

---

> **This file is an index.** Full session logs are in [docs/changelog/](changelog/).
> Add new sessions to the appropriate monthly file, not here.

---

## Session Log Index

| Period | File | Sessions |
|--------|------|----------|
| June 2026 | [changelog/2026-06-june.md](changelog/2026-06-june.md) | 9 |
| May 2026 | [changelog/2026-05-may.md](changelog/2026-05-may.md) | 21 |
| April 2026 | [changelog/2026-04-april.md](changelog/2026-04-april.md) | 8 |
| March 2026 | [changelog/2026-03-march.md](changelog/2026-03-march.md) | 33 |
| February 2026 | [changelog/2026-02-february.md](changelog/2026-02-february.md) | 16 |

**Total:** 87 sessions across 5 months.

---

## Recent Sessions (June 2026)

### June 3 — About Page & Run Proof Review Workflow
Rebuilt `/about` as full platform overview; added per-event run proof review queue with filters, search, sorting, and pagination.

### June 3 — Signup & Login Bot Protection
Added Cloudflare Turnstile, IP/email rate limits, honeypot, form-age check, session-bound token, disposable email blocking, and adaptive login challenge after 3 failed attempts.

### June 2 — Submission Review UI Card Redesign
Redesigned organizer/admin submission review from a wide table into a responsive card-based layout with decision sidebar and review history.

### June 2 — Accumulated Challenge Progress Target Fix
Fixed accumulated-distance progress to use the runner's selected registration distance before falling back to event-level target.

### June 2 — Run Proof Philippine Date Standard
Standardized run proof future-date validation to Philippine time (`Asia/Manila`) with shared platform date utility.

### June 1 — Local Auth Workflow Refinement
Multiple sub-sessions: favicon, mobile nav guidance callout, virtual registration emergency contact removal, password/email normalization and login error recovery.

### June 1 — Accumulated Challenge Multi-Distance Target
Fixed accumulated-distance event submission for multiple numeric race distances (e.g. `25,50,75,100`); largest value sets the goal.

### June 1 — Gallery Image Entry Removal
Organiser can now remove individual gallery upload previews before saving the form.

### June 1 — Event Race Category ID Validation Fix
Fixed event creation blocking due to stale duplicate hidden category IDs; normalization now repairs duplicates before validation.

---

## How to Add a New Session

1. Open the monthly file for the current month under `docs/changelog/`.
2. Prepend your session block at the **top** of the file (most-recent-first order).
3. Update the session count in the table above.
