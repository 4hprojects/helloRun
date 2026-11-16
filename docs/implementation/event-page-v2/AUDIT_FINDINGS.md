# Event Experience v2: Phase 0 Audit

Audit date: 2026-11-17  
Base commit: `11d09645d24479c6d2075358b271b5304e27a2f5`  
Base branch: `docs/deployment-target-preflight`  
Feature branch: `feat/event-experience-v2`  
Runtime: Node `v20.20.2`, npm `10.8.2` on Linux; `package.json` requires Node `>=22.0.0`

## Gate result

The current implementation already contains most July 2026 mobile fixes. Event Experience v2 should refine the existing view model and template, not replace them. No schema migration is required. Existing OCR and submission work was already present in the working tree before this branch and is outside this project; it must remain unstaged.

## Source-of-truth flow

```text
organizer/create-event.ejs or organizer/edit-event.ejs
  -> event-form.service.js: getCreateEventFormData / validateCreateEventForm
  -> event-form.service.js: applyEventFormData
  -> Event model
  -> event.controller.js: getEventDetails
  -> event-public-view.js: buildPublicEventView / buildPublicEventSeo
  -> pages/event-details.ejs
  -> /events/:slug/register and participant services
```

- Create, unsaved preview, and save are owned by `src/routes/organiser/event-creation.js:96-295,302-556`.
- Edit and saved preview use the same form service through `src/routes/organiser/event-management.js:458-721`.
- Preview and public both render `src/views/pages/event-details.ejs`; preview overrides registration state and removes live actions at `src/routes/organiser/event-creation.js:222-286`.
- Public visibility only admits published, non-deleted, non-personal records after `publicListingAvailableAt`; see `src/utils/public-event-visibility.js:1-30`.
- Public detail loads registration count, public badges, shop, related events, runner progress, existing registration, contact state, and co-organizers in parallel at `src/controllers/page/event.controller.js:121-232`.
- Registration GET/POST reuse public visibility, eligibility, category, price, waiver, capacity, and existing-registration guards at `src/controllers/page/registration.controller.js:120-370`.
- Checkout amount is authoritative in `src/services/registration-price.service.js:107-249`. Public pricing currently duplicates this resolver's modes and date-period rules in `src/utils/event-public-view.js:344-544`.
- Accumulated participant state comes from `src/services/public-event-detail.service.js:13-35`; other event formats use the existing registration summary at lines 46-99.

## Field-to-display contract

| Field or concept | Form and normalization | Persistence | Public mapping and placement | Contract / gap |
| --- | --- | --- | --- | --- |
| `title`, `slug` | Create title at `create-event.ejs:187`; normalized at `event-form.service.js:910-915`; slug generated server-side | `Event.js:41-59` | `buildPublicEventView` title/slug at `event-public-view.js:96-101`; one H1 at `event-details.ejs:144` | Preserve exact title and canonical slug. |
| Organizer and co-organizers | Organizer name at `create-event.ejs:194`; co-organizers are managed separately | `Event.js:66-71`; relation service | Hero byline at `event-details.ejs:140-143` | Correct and reusable. |
| `description` | Short summary at `create-event.ejs:198-203`; minimum 20 characters on publish | `Event.js:72-76` | Escaped plain text in hero; SEO fallback | Keep concise; do not treat as rules. |
| `eventDetailsMarkdown` | Rich editor at `create-event.ejs:1126-1139`; sanitized on render | `Event.js:77-82` | Supplemental section at `event-details.ejs:676-690` | Safe pipeline exists. Organizer helper wrongly encourages duplicating structured pricing and submission rules. |
| Event type and allowed modes | `eventType`; allowed modes derived by `getEventTypesAllowed` | `Event.js:88-100` | Type chip, mode facts, location and participation copy | Hybrid derives `virtual` plus `onsite`; no schema change. |
| Registration and event dates | Datetime-local inputs; parsed as platform time by shared helpers | `Event.js:137-138,274-275` | Registration state, hero helper, timeline, mobile facts | Public labels use `formatPlatformDate`. Boundary tests exist. |
| Public listing | `publicListingAvailableAt` | `Event.js:218-221` | Visibility query only | Drafts and future listings remain private. |
| Virtual window and upload deadline | Virtual inputs plus derived 14-day fallback | `Event.js:313-316,368-370` | Challenge timeline and submission rules | Deadline is distinct from event end. |
| Venue and geography | Onsite/hybrid form fields | `Event.js:276-306` | `buildLocation` and sidebar facts | Current `isVirtual` logic treats hybrid as virtual and can label an empty hybrid venue `Anywhere`; fix mapping without schema changes. |
| Categories, capacity, waitlist | Category editor; normalized/merged to preserve `targetSteps` and `reserved` | `Event.js:101-151` | Goals, category summaries, registration selection, `waitlistCategories` | Capacity source is `slots - reserved`. Public summaries show slot limits, but not remaining/full state per category. Waitlist route exists separately. |
| Challenge metrics | Accumulated mode, distance/steps metrics, primary metric | `Event.js:329-390` | Goal labels, mechanics, participant progress, leaderboard copy | Step creation fails closed unless `FEATURE_STEP_COMPETITIONS_ENABLED`; historic step events remain editable. |
| Proof methods | Form normalizes aliases to `running_app_sync`, `photo`, `manual` | `Event.js:317-328` | Rules and participant essentials | Public copy currently advertises running-app sync solely from stored configuration. It does not verify credentials or effective submission availability. Fix with an explicit effective-capability input. |
| Pricing | Free/paid plus customized, distance, period, or package configuration | `Event.js:391-429,595-739` | Hero/sidebar summary and pricing options | Public and checkout implement parallel logic. Reuse checkout resolver semantics for active period availability and honest ranges; no payment details exposed publicly. |
| Rewards | Digital toggles, physical items, benefits, packages | `Event.js:430-456,525-593,658-739` | Reward list, badges, packages | Physical description, claiming notes, and special benefits are persisted but not displayed. Add truthful conditional presentation. |
| Media | Logo, banner, poster, gallery inputs | `Event.js:741-764` | Hero, poster dialog, gallery | Hero fallback exists; below-fold media should lazy-load and preserve focus handling. |
| Waiver and policies | Waiver editor and sanitizer | `Event.js:766-776` | Registration only | Correct: public page must not bypass acknowledgement. |
| Existing registration | Not organizer-authored | `Registration` model | Notice or accumulated progress replaces duplicate register action | Confirmed, payment-pending, submit/resubmit states already covered. |
| Leaderboard/results | Recognition settings and visibility | Event leaderboard settings | Standing link and participant actions | Public view checks only `leaderboardRecognitionEnabled`, not full visibility. Existing leaderboard route remains authoritative. |
| SEO and sharing | Derived only | No new fields | Canonical, meta, OG/Twitter from `buildPublicEventSeo` | No Event JSON-LD exists. Add truthful physical/hybrid schema only; do not mark virtual events as physical. |
| Cancelled lifecycle | No create/edit control | Event status enum has no `cancelled` value | No public state | Unsupported in current domain. Do not invent a migration. Closed/archived are not public because visibility requires `published`. Document limitation. |

## Actual lifecycle and viewer matrix

| State | Current public behavior | Required v2 handling |
| --- | --- | --- |
| Guest, open | Register CTA; guest alternate only when enabled | One dominant action, exact fee/deadline nearby. |
| Signed-in eligible, open | Register CTA | Preserve route and workspace guard. |
| Existing non-accumulated registration | Status notice and registration/payment action | Keep registration action dominant; remove disabled duplicate CTA. |
| Existing accumulated registration | Personalized progress and submit/resubmit action | Preserve modal loading only when actionable. |
| Registration not open | Disabled in-page status; no mobile sticky CTA | Show opening date, not a false action. |
| Registration closed | Disabled in-page status; no mobile sticky CTA | Show closed state and valid results/standings only. |
| Event ended | Ended state, recap, standings link | Preserve recap and genuine participant actions. |
| Draft preview | Shared template, preview banner, no live registration/share/shop/contact | Preserve parity and restriction. |
| Sold-out category | Registration form disables full options; public view exposes waitlist categories | Add category availability text and supported waitlist link only when enabled. |
| Paid/payment pending | Existing registration notice points to payment | Never show a second registration CTA. |
| Onsite | Venue and standard event mechanics | Stop showing virtual proof language when irrelevant. |
| Hybrid | Both modes | Show venue and virtual participation facts without calling it `Anywhere`. |
| Cancelled | Not represented by Event schema | Out of scope without a domain migration. |

## Reusable components and confirmed prior fixes

- `buildPublicEventView`, `buildPublicEventSeo`, and `renderEventDetailsContent` remain the presentation seam.
- Shared nav, head, footer, event share menu, ad unit, runner proof modal, event save, buttons, and design tokens remain in use.
- July fixes are present: contextual mobile sticky CTA, runner-nav and scroll-top offsets, safe-area support, 320 px wrapping, jump navigation, keyboard lightbox focus trap/return, reduced motion, lazy related images, and rich table containment.
- Current responsive breakpoints are 980, 900, 820, 720, 580, 420, and 340 CSS px. Verification must include required widths without adding arbitrary new breakpoints.

## Duplicate information map

- Register/price/status appears in hero actions, hero summary panel, desktop sidebar, final CTA, accumulated closing CTA, and mobile sticky CTA.
- Timeline appears in challenge dates or stats, mobile key facts, and desktop sidebar.
- Category goals can appear in goal choice, goal panel, category section, pricing options, and organizer-authored details.
- Proof rules appear in participant essentials, mechanics, submission rules, and often long-form details.
- Rewards appear as structured reward items, badge cards, packages, category notes, and long-form details.

The v2 template should keep one primary action per viewport section, one structured fact source, and existing organizer narrative unchanged.

## Risks and decisions

1. **Pricing drift:** make public price options follow the checkout resolver's active-period semantics. Keep public summaries read-only.
2. **Unsupported integrations:** pass effective proof capabilities from server configuration. Stored configuration remains intact but unavailable integrations must not be promised.
3. **Onsite wording:** condition mechanics and proof sections by event type. Existing template currently uses virtual-oriented copy for all types.
4. **Preview locals:** preview omits several live-only locals by design. Template guards must remain defensive.
5. **Historic records:** all new view fields need derived fallbacks. No new required schema fields.
6. **SEO:** add generated JSON-LD with safe JSON serialization. Pure virtual events omit physical Event rich-result claims.
7. **Working tree:** stage only Event Experience v2 files. Do not commit unrelated OCR/submission changes or the supplied package directory.

## Baseline verification

Command:

```bash
env -u MONGODB_URI -u DATABASE_URL -u REDIS_URL node --test \
  tests/event-public-view.unit.test.js \
  tests/event-details-mobile-ui.unit.test.js \
  tests/event-details-guest-render.unit.test.js \
  tests/event-details-registered-state.unit.test.js \
  tests/event-details-runner-access.unit.test.js \
  tests/event-details-run-proof-modal.unit.test.js \
  tests/event-registration-presentation.unit.test.js \
  tests/step-competition-events.unit.test.js
```

Result: 100 tests passed, 0 failed. The repository test wrapper refused the first attempt because the loaded MongoDB and PostgreSQL URLs look production-bound. No remote database test was run.

## Revised implementation plan

### Phase 1: presentation hierarchy

- Refine `src/views/pages/event-details.ejs` and `src/public/css/event-details.css` around one decision summary and one dominant action.
- Add conditional onsite, virtual, and hybrid mechanics. Reduce duplicate timeline, price, and CTA blocks without removing live modules.
- Keep current responsive and accessibility fixes; add focused render/source tests.

### Phase 2: creation, preview, and mapping alignment

- Correct description and rich-details helper copy in create/edit forms.
- Add effective proof capability mapping and hybrid location correction to `src/utils/event-public-view.js` and controller/preview callers.
- Keep shared preview rendering and no-side-effect restrictions.

### Phase 3: lifecycle, price, capacity, rewards, and SEO

- Align public active price choices with `registration-price.service.js` semantics.
- Surface category availability/waitlist, physical reward notes, benefits, and valid participant actions conditionally.
- Add safe, truthful event structured data for onsite/hybrid only and test metadata/XSS boundaries.

### Phase 4: release proof

- Run focused and broad DB-free tests, lint, format, docs checks, and diff checks under the available runtime.
- Run browser screenshots at required widths if a local browser and safe fixture path are available; otherwise report exact limitation.
- Review, commit only scoped files, push `feat/event-experience-v2`, and do not merge or deploy.
