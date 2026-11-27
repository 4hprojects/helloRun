# November 2026 Changelog

## November 27 — Reusable race bib generator

Added an opt-in event bib workflow for virtual, on-site, hybrid, and supported guest
registrations. Organizers can edit a landscape draft, publish immutable versions,
release or pause a selected version, copy reusable layout settings, and export bounded
category PDFs. Preview, PNG, and PDF output share one Sharp/PDFKit renderer.

Migration `029_race_bib_generator.sql` extends the existing PostgreSQL assignment
ledger with bib kind and event range policy. Virtual allocation is transactional,
retry-safe, and event-unique. Hybrid release audits existing assignments and requires
non-overlapping ranges. Race Pass QR and confirmation codes remain outside shareable
bibs.

Runner and guest views enforce owner or private-token access and disable caching.
Virtual runner names are off by default. Cancellation, claim, payment approval, normal
registration, guest registration, and on-site reassignment now connect to bib lifecycle
helpers without changing certificate, badge, merchandise, or check-in ownership.

Created the 2027k preview from the supplied text-free Cordillera artwork. Production
release and backfill were deliberately not run. Commands, rollback, and verification
boundaries are documented in [the implementation report](../implementation/race-bib-generator.md).

Upgraded Bib Design into a structured template creator. Organizers can choose the
existing photo split, a festival header, or a classic race layout without freeform
positioning. New bounded slots support event copy, one primary logo, three partner
logos, local typography presets, measured text fitting, contrast and overflow
checks, proof cases, grayscale review, and responsive crop controls.

Added optional 1800 × 1800 social exports. They wrap the unchanged printable bib and
keep CTA content outside print output. Account and guest downloads retain existing
eligibility, authorization, runner-name privacy, and private-cache controls. Existing
published `landscape_v1` designs remain visually compatible and no production design
or release state changed.

## November 23 — Finisher-only merchandise gate

- **Added.** `src/services/shop/finisher-eligibility.service.js`. A product with an
  active `finisher` row in the existing `achievement_merchandise_rules` table can
  be bought only by a runner who meets all of these for the rule's event:
  - a `confirmed` registration;
  - `paymentStatus: paid` (free events count as paid);
  - approved accumulated progress that is `completed`.
- **Enforcement points.** The gate runs on `POST /shop/cart/add`, on every cart
  read, so checkout and stale carts are covered, and on payment-proof upload.
- **Failure handling.** A rule whose event cannot be resolved fails closed.
  Products without a rule behave as before. No schema change was needed.
- **Verification.**
  - Eight DB-free cases cover open products, non-finishers, finishers, another
    event or another runner, an unresolved event, anonymous shoppers, order-level
    checks and the entry-point wiring.
  - The rule query ran against the isolated PostgreSQL schema.
  - The isolated shop cart and payment integration tests pass (9/9).
- **Still to do.** The quote and PayPal invoice workflow, private payment-method
  configuration, tracking, and duplicate-reference checks remain under
  `SHOP-FIN-01`. The 2027k card stays in `preview`.

## November 23 — 2027k HelloRun Challenge production publication

- **Published.** The owner confirmed `--apply`, which ran from `main` at `776a790`
  against production.
  - Event `6b03f0e6828e10075486eb83`, reference `2HC-262311`, slug
    `2027k-hellorun-challenge`, owned by the existing HelloRun organiser account
    and approved by the HelloRun admin.
  - Publication and registration opening happened together: November 23, 2026,
    3:53:10 PM Manila (`2026-11-23T07:53:10.109Z`). The listing date is null.
  - Stored Manila cutoffs: registration closes November 30, 2027 23:59:59;
    activity runs January 1, 2027 00:00 to December 31, 2027 23:59:59; proof
    closes January 14, 2028 23:59:59.
  - The run created the certificate template `6b03f0e6828e10075486eb8e` and 13
    badges, and uploaded five WebP objects to `cdn.hellorun.online`. The bundle
    is set to `orderingState: preview`.
- **Signed-out checks.**
  - The canonical URL returns 200 with "Register for free" and "Registration
    Open", and no "Coming soon" or December 1 date.
  - `/events` lists the event, and all five media URLs return 200 `image/webp`.
  - Exactly one 2027k event exists, and `/events/2026k-hellorun-challenge-4`
    returns 200.
  - Browser checks at 390px and 1280px show no horizontal overflow.
- **Not yet verified.** At the time of writing, no registration exists for the
  event. The owner's test sign-up had not reached the database, so live
  sign-ups are not yet proven by a completed registration.
- **Not yet deployed.** `776a790` is not deployed. Until it is, the live
  build:
  - hides the bundle card;
  - rejects treadmill proofs, which matters only from January 1;
  - returns 403 when the builder saves this event, because the event has
    badges.

## November 23 — 2027k HelloRun Challenge registration release

### Added

- **Event content and create script.** `src/content/events/2027k-hellorun-challenge.js`
  holds the approved copy, FAQ, dates and settings.
  `src/scripts/create-2027k-hellorun-challenge.js` runs as a dry run by default.
  With `--apply` it:
  - uploads the banner, poster, finisher badge, medal views and shirt mockup;
  - captures the publication instant as `registrationOpenAt`;
  - publishes the event with `publicListingAvailableAt: null`, so listing and
    registration open together;
  - publishes the certificate template and creates the default badges.

  It refuses to create a second event with the same slug or title. If any step
  fails after the save, it removes its own records and uploads.
- **Stored instants (Manila).**
  - Registration closes November 30, 2027 at 23:59:59.
  - The activity window and `virtualWindow` run from January 1, 2027 at 00:00 to
    December 31, 2027 at 23:59:59.
  - Proof uploads close January 14, 2028 at 23:59:59.

  The existing inclusive comparisons keep each final second open.
- **Finisher merchandise preview.** A new optional `Event.finisherMerchandise`
  shows a photo, ₱ price and shipping card in the finisher-rewards section.
  - The card leads with "Available after verified completion".
  - It shows the preview note until `orderingState` is `open`.
  - It never adds a package or a price to registration and has no order action.
  - Builders can edit its text fields and ordering state. Photos and the shop
    product link are preserved.

### Fixed

- **BUG-SRB-01.** Builder saves that post no benefit fields no longer erase
  `specialRewardBenefits`.
- **Treadmill submissions.** Before this fix, the proof controller rejected
  `treadmill` even when an event accepted it. Editing a rejected activity also
  dropped the type. Every submission layer now uses one list,
  `src/utils/activity-types.js`.
- **Event edits with badges.** Each badge editor was a `<form>` nested inside the
  event edit form. The browser flattened them, so saving any event with badges
  posted two `_csrf` values and returned 403. The badge editors now post through
  standalone forms linked with the `form` attribute. A browser save on the
  isolated stack returned 403 before the fix and now saves (302).

### Verification

- **DB-free tests.** 18 new cases cover:
  - the payload, readiness and exact instants;
  - CTA "Register for free" before January 1;
  - registration close, proof window and run-date window boundaries, including
    workouts recorded before registration;
  - the merchandise view, template and builder round-trip;
  - both fixes.

  The full unit run passed apart from two cases that fail only in the git
  worktree, because it has a `.git` file and no `.env`. Both pass in the main
  checkout.
- **Isolated stack** (`.env.development`, loopback Mongo/Postgres, in-memory
  uploads):
  - The script dry run passed `getPublishReadinessErrors`.
  - `--apply` created the event, certificate template, 13 badges and five media
    objects.
  - The public page and `/events` showed "Register for free".
  - A seed runner registered through the real form. The registration was
    confirmed, free (`paymentStatus: paid`), `2027K`, with no package and no
    payment step.
  - Browser checks at 390px and 1280px showed no horizontal overflow, and the
    merchandise card rendered both photos.

- **Builder round-trip on the isolated stack.** A browser save of the 2027k
  event kept its status, dates, activity types, FAQ, tagline, merchandise
  photos and ordering state. Two pre-existing builder behaviours showed up and
  were left unchanged:
  - `datetime-local` saves truncate the stored 23:59:59 cutoffs to 23:59:00;
  - an empty listing date is stored as the Unix epoch, which still lists the
    event immediately.

Production state is recorded under `EVT-2027K`.
## November 22 — Event page landing layout verification

The verification ran against the loopback-only isolated environment
(`.env.development`, Mongo `127.0.0.1:27018`, Postgres `127.0.0.1:5433`,
in-memory uploads). It touched no production service.

### Results

- **Isolated integration gate.** On `HEAD` plus only this change set, 547/547
  pass. That includes a new organiser-route case that covers the full upload
  and save path:
  - a multipart edit that uploads a package photo from a non-first card
  - saving the tagline and authored FAQ
  - preview rendering
  - edit-form round-trip
  - a rejected tampered photo URL
- **DB-free unit gate.** Everything passes in the main checkout except two OCR
  admin UI tests. Those also fail at `HEAD`, so this change set did not cause
  them.
- **Pre-existing failures outside this change.** Six integration tests in
  `runner-dashboard-modal` and `submission.service` fail only with the
  separate, uncommitted OCR work-in-progress present.
- **Browser checks.**
  - A free accumulated event and a paid onsite event were checked at 320, 390,
    720, 980, and 1280px. There was no horizontal overflow. The sticky CTA
    appeared only at 720px and below, and it was never disabled.
  - The browser console showed no app errors.
  - The FAQ builder handled add, remove, the 8-item limit, and renumbering
    correctly in the browser.

### Fixes from verification

- A single bundle photo was dwarfing the card on wide layouts. Wide layouts now
  place the photo beside the details.
- Onsite-only events showed "Activity period" and "Submit proof by". Their key
  dates are now Registration closes, Race day, and Venue, and the venue is no
  longer repeated in the meta row.
- Same-day date ranges rendered as "Dec 6–6, 2026". They now render as one date.

## November 22 — Event page landing layout (Phase B)

Phase B adds organiser-editable fields behind the Phase A layout.

### Organiser-editable fields

- **Model.** Three new fields on `Event`:
  - `tagline`: up to 140 characters.
  - `faqItems`: up to 8 `{question, answer}` items.
  - `registrationPackages[].imageUrl`: one photo per package.

  These need no migration. The Postgres event shadow uses an explicit column
  whitelist, so it ignores the new fields.
- **Builder.** The create, edit, and admin builders now include:
  - A "Hero tagline" input under Description.
  - A FAQ editor in Event Details. It is the new `event-faq-fields` partial,
    backed by `event-faq-builder.js`.
  - An optional "Bundle Photo" on each package card. In edit there is also a
    current-photo preview and a remove checkbox.
- **Validation.** A FAQ row must have both a question and an answer. A package
  photo URL must be absolute http(s).

### Package photo uploads

- Files post as `registrationPackageImageFile_<cardIndex>` through the existing
  branding upload limits: JPEG/PNG/WebP, the upload size limit, and webp
  conversion. They are stored under the R2 category `event-branding/package`.
- Normalized packages carry a non-persisted `formIndex`, so a skipped empty card
  cannot shift an upload onto the wrong package.
- New helpers live in `src/services/event-package-images.service.js`.
- Saves keep only package URLs the event already owned or that were uploaded in
  the same request. A tampered hidden URL therefore cannot claim another
  event's R2 object and later trigger its deletion.
- Edit and admin saves delete the R2 objects of replaced photos. Create and
  clone start with no inherited package photos.

### Public page

- An authored tagline replaces the derived one.
- Authored FAQs replace the generated set entirely. The generated set remains
  the fallback when no FAQ is written.
- Bundle cards show the package photo. Only http(s) URLs are exposed.

### Not done and found issues

- **Deferred by decision.** Completion-gated bundle purchases ("available after
  verified completion") need a Postgres shop migration and checkout checks.
- **Not added.** FAQPage structured data, because FAQ rich results are limited
  to authoritative sites.
- **Found, not fixed.** `specialRewardBenefits` has no builder inputs, and
  `applyEventFormData` resets it to `[]`. Any builder save therefore erases
  benefits that were set by script.

### Tests

- Added `tests/event-landing-phase-b.unit.test.js` with 9 cases.
- The full DB-free unit suite passes except the two OCR admin UI failures that
  were already present.
- Builder integration suites were not run because they need a database.

## November 22 — Event page landing layout (Phase A)

Adapted a focused landing-page mockup for public event pages. This changes only
the view, the view model, and CSS. It needs no schema change and no migration.

- **Hero.** The H1 is followed by a goal subtitle, a one-sentence tagline, the
  actions, and then a small "Hosted by" line.
  - The subtitle uses the organiser `shortTitle` when set. Otherwise
    single-goal accumulated challenges get "Cover 2,027 km in 2027".
  - The tagline is the first sentence of the description, capped at 140
    characters. It replaces the "About this event" lead box.
  - The CTA reads "Register for free" when registration is free.
- **Key dates.** A three-date strip shows Registration closes, Activity period,
  and Submit proof by. Location, goal, and price move to a compact meta row
  below it. The strip stacks into rows at 720px and below.
- **How it works.** The four steps now use Lucide icons. Accumulated
  challenges end with "Track Your Distance" or "Track Your Steps", and a
  one-line accepted-activities note follows. The full rules sit in a
  collapsed "Full submission rules" disclosure.
- **Finisher rewards.** Free digital rewards appear as one line, and
  registration packages appear as priced bundle cards. The cards show
  delivery-fee and Philippines-only notes when the organiser configured them;
  the page never states free shipping that was not configured. Packages and
  delivery now live here instead of in Pricing.
- **FAQ.** Up to four generated questions cover international eligibility,
  accepted activities, how to get the package, and the proof deadline. They
  render as escaped `<details>`, appear in the jump nav, and use existing
  event fields only.
- **Order and CTAs.** Rewards now come before goal and category details. The
  non-accumulated closing row keeps only onward navigation, because the
  sidebar card and the mobile sticky bar already offer registration.
- **Tests.** Added view-model coverage for the subtitle, tagline, CTA label, key
  dates, reward logistics, and FAQ. Updated the layout source assertions to
  the new intent. Focused event, escaping, and responsive suites pass (216).
  The full unit run shows only the unrelated OCR admin UI failures, which also
  fail at `HEAD`.
- **Not done (Phase B).** Per-event organiser-authored FAQ, reward and package
  images, a "requires verified completion" package flag, and an optional
  tagline field.

## November 15 — Security and reliability baseline

- Merged documentation PR #44 after required GitHub CI passed.
- Captured a no-mutation public baseline: HelloDeploy and MongoDB are healthy,
  the served commit remains unknown, Redis is not configured, Active Quest is
  live, and anonymous protected routes redirect to login.
- Verified `/sw.js` returns browser and CDN `no-store`, vendored Lucide and Quill
  assets return HTTP 200, and the public CSP uses nonces with script attributes
  disabled.
- Reconciled migration evidence: migrations 027 and 028 were already recorded
  on October 29. Current PostgreSQL metadata reports 36/36 RLS tables, 13/13
  security-invoker views, and no Data API table grants. No migration ran.
- Verified all 12 authoritative Active Quest events have Postgres shadows and
  reran the aggregate fixture audit across MongoDB and PostgreSQL. Fixture
  quarantine remains blocked on current backup and second-operator evidence.
- Added the [30-day security and reliability plan](../plans/platform-improvement/30-day-security-reliability-2026-11-16.md)
  and its [dated baseline](../analysis/2026-11-15/security-reliability-baseline.md).

## November 15 — Documentation audit and taxonomy migration

### Documentation

- Audited all governed project Markdown and separated current state, stable
  reference, plans, implementation records, operations, dated evidence, and
  historical material.
- Moved 118 tracked Markdown documents to canonical lowercase taxonomy paths.
- Left permanent one-link compatibility pointers at every former tracked path.
- Moved 16 untracked source-pack files outside `docs/` without changing their
  bytes or original filenames.
- Reconciled documentation navigation, conventions, status, roadmap, analysis,
  implementation, operations, archive, and changelog indexes.
- Added the dated [documentation audit](../analysis/2026-11-15/documentation-audit.md).

### Public production evidence

- A read-only public check on November 15 observed the
  [November Active Quest 2026 event](https://hellorun.online/events/november-active-quest-2026)
  published with registration open through November 22, activity dates of
  November 1–30, proof submission through December 14, six distance categories,
  and public reward artwork.
- This public observation does not prove the deployed commit, private migration
  records, backup readiness, flag history, administrator audit evidence, or
  post-deadline reward and certificate finalization. Those remain under `REL-11`.

## November 4 — Restrained motion and validation feedback

- Added shared 120ms, 180ms, and 240ms motion tokens, explicit property transitions,
  press feedback, and reduced-motion fallbacks across navigation, landing, event,
  leaderboard, registration, authentication, proof, and runner-dashboard surfaces.
- Preserved progressive navigation, server-rendered filtering and rankings, proof draft
  and submission authority, duplicate-submit guards, dashboard focus, disclosures,
  history, polling, and scroll position.
- Added accessible invalid-field associations and first-invalid focus. Dashboard refreshes
  now expose busy state, skip unchanged fragments, and animate only changed markup.
- Added focused motion regressions. Required syntax, format, whitespace, focused, and full
  DB-free unit checks pass. No deployment or production-like database suite ran.
