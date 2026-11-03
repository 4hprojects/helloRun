# HelloRun Motion UI/UX Improvements

**Status:** Implemented and repository-verified

**Date:** November 4, 2026

**Deployment:** Not performed

## Scope

This change adds restrained motion to existing EJS, CSS, and vanilla-JavaScript flows.
It does not change routes, APIs, schemas, authentication, registration rules, OCR rules,
ranking authority, copy, or deployment configuration.

## Motion contract

The shared design system now defines:

- `--hr-motion-fast: 120ms` for press feedback.
- `--hr-motion-state: 180ms` for state changes.
- `--hr-motion-panel: 240ms` for panel entry and exit.
- `--hr-ease-out`, `--hr-ease-in`, and `--hr-ease-standard` easing tokens.

In-scope styles use explicit transition properties. Enabled interactive controls use a
restrained `scale(0.98)` press state. Focus indicators remain visible. Reduced-motion
rules suppress nonessential transforms, animation, and smooth scrolling.

## Implemented surfaces

### Navigation

- Desktop account and mobile navigation panels now enter from their trigger origin.
- Existing Escape, outside-click, focus return, focus trap, `aria-expanded`, and no-JavaScript
  behavior remain intact.
- The mobile panel becomes motion-ready only after JavaScript initializes it.

### Landing, events, and leaderboards

- Cards, images, CTAs, tabs, chips, pagination, and filters now provide restrained hover,
  focus-within, active, and press feedback.
- Full-page event and leaderboard filtering remains server-rendered.
- Rankings remain static. No client-side interpolation, reordering, or result replacement
  animation was added.

### Login, signup, and registration

- Client validation now maintains inline errors, `aria-invalid`, `aria-describedby`, and
  first-invalid-field focus.
- A single short invalid-submit nudge runs only when normal motion is preferred.
- Reduced-motion users receive immediate focus and automatic scrolling.
- Submit loading and disable behavior still starts only after validation succeeds.

### Run proof modal

- Existing date, proof, OCR processing, review, confirmation, submitting, success, and
  recoverable-error phases now drive presentation changes.
- File preview, OCR feedback, step content, confirmation, and confirmed success receive
  scoped motion.
- OCR surfaces expose busy state. Draft recovery, upload fallback, idempotency, duplicate
  protection, and focus behavior remain unchanged.
- Success remains gated on a successful backend response.

### Runner dashboard

- AJAX refresh roots and the page expose busy state while a request is active.
- Identical returned markup is not replaced.
- Changed fragments fade in without artificial delays or skeletons.
- Focused fragments and open disclosures remain protected. History, polling, and document
  scroll position remain preserved.

## Verification

- `npm run lint:check` — passed; 1,105 JavaScript files and 183 EJS templates checked.
- `npm run format:check` — passed; 2 JSON and 101 automation files checked without rewrites.
- `git diff --check` — passed.
- Focused motion and affected-flow tests — passed, 46/46.
- `npm run test:unit` — passed; DB-free suite completed in 179.3 seconds.

Database-writing integration suites were not run because the current `.env` is
production-like. No live service or deployment checks ran.

## Manual follow-up

Repository checks cover responsive contracts, touch targets, focus behavior, reduced
motion, duplicate submission, retry paths, and unchanged dashboard fragments. A release
operator should still perform real-device checks at 320px, 375px, 768px, and 1280px,
including 200% zoom, slow OCR/upload, failed requests, keyboard navigation, and both
motion preferences in an isolated environment.
