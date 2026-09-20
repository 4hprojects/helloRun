# HelloRun Changelog — September 2026

## September 20 — Badge re-evaluation after organizer corrections

Closes the gap recorded in the previous entry. Reading the badge requirement checks showed
which badges a correction can actually affect: per-entry badges (result approved, distance
completed, mode completed) depend on status and category, never on distance, time or date,
so they cannot change. Three kinds are value-sensitive:

- **Accumulated challenge badges** were already refreshed in both directions by
  `refreshAccumulatedChallengeProgress`, which the correction service calls. No change.
- **Lifetime distance milestones** were not refreshed after a correction and never revoked
  when a total fell. `refreshGlobalDistanceMilestoneProgress` now takes an opt-in
  `revokeUnmet` option, used only by the correction service, that revokes auto-awarded
  milestones the corrected total no longer reaches. Revocations carry a dedicated reason and
  are audit-logged; the award pass restores exactly those rows (and nothing an admin
  revoked) when the total reaches the milestone again. Ordinary review flows do not pass
  the option, so their behaviour is unchanged.
- **Rank badges**: ranking sync already awarded newly qualifying ranks but never withdrew
  one. New `reconcileRankBadgesForRunner` runs for the corrected runner once the re-rank has
  finished, revoking rank badges the published ranking no longer earns and restoring ones it
  earns again, with the same marker-reason guard. It judges nothing when the runner has no
  published ranking row. Rank badges of runners displaced by another runner's entry are not
  revoked, which matches how approving a faster entry has always behaved.
- **Ranking row defect found on the way:** the `rankings` upsert updated the rank but not
  `elapsed_ms`, so a corrected finish time reordered the ranking while the published row kept
  the old time (visible to the reporting view and the rank-badge context). It is now
  refreshed on conflict. `syncEventRankingsInBackground` also returns its promise (still
  never rejecting) so follow-up work can wait for the re-rank.
- 14 DB-free tests use an injected fake Postgres client to cover the revoke, keep, restore
  and admin-revocation-stays-permanent paths and pin the wiring. Nothing was run against a
  real database.

## September 20 — Per-runner submissions page with organizer value corrections

- Added `/organizer/events/:id/registrants/:registrationId/submissions`, listing every
  entry one runner submitted for an event from both `Submission` and
  `AccumulatedActivitySubmission`, newest first, on the same responsive card layout as the
  run-proof queue. Entry points: a "Submissions" button on each registrants row, an "All
  entries by this runner" link on the individual review page, and an "All entries" link on
  each queue card. Access is owner, co-organizer and admin via the existing
  `resolveEventAccess` path; the edit route adds CSRF protection, the review rate limiter
  and a check that the entry belongs to the registration in the URL.
- Organizers can now correct an entry's distance, elapsed time, run date, location and
  activity type (`submission-correction.service.js`). A reason is required. Nothing
  previously allowed this outside the admin-only data patch, which has no access check,
  notification or downstream effects. Status changes remain on the existing review page.
- Each correction is saved through `save()` (so the PostgreSQL shadow sync fires), audited
  as `submission.values_corrected` (plus `submission.self_reviewed` for a self-edit),
  stored as before/after pairs in a new additive `organizerCorrections` array on both
  models, and announced to the runner through a new `result.corrected` communication event
  (registry entry, sender, subject line and email template).
- For approved entries the service also recalculates derived data: published ranking and
  leaderboard cache; standard certificates are regenerated when distance, time or date
  change; accumulated entries refresh challenge progress and reconcile the certificate.
  Badge follow-up: see the next entry.
- Added DB-free coverage: validation and diffing rules, service wiring, route middleware
  and ownership guard, and view/CSS structure (34 tests in three new files). Integration
  suites were not run because the configured databases are not confirmed non-production.

## September 20 — Run proof review queue: responsive redesign

- Reworked `/organizer/events/:eventId/run-proofs/review` for desktop, tablet, and
  phone. Desktop shows a proof thumbnail, evidence details, and an action column;
  tablet moves the actions to a full-width row; phones stack the card with full-width
  44px actions and a swipeable queue-tab strip.
- Queue tabs now carry the status filter and counts with a per-status accent, and the
  redundant Queue dropdown was removed (search keeps the active queue through a
  hidden `status` field). Filter labels stay visible on every breakpoint; the old
  mobile styles hid them and shrank controls to 2rem.
- Validation signals (suspicious flag, OCR mismatch) render as visible text on the
  card instead of hover-only tooltips, which were unreachable on touch devices.
  Header navigation buttons carry visible labels in place of icon-only tooltips.
- Moved the page's ~900 lines of layered rules out of `organizer-events.css` into a
  dedicated, fully scoped `run-proof-review.css`, and deleted
  `run-proof-review-tooltips.css` plus dead approve-modal CSS. No route, data, or
  markup contract changed; test-relied class names and strings are preserved.
- Updated `organizer-run-proof-review-ui.unit.test.js` to guard both stylesheets,
  enforce page scoping and breakpoints, and cover the new visible-signal and
  search-state markup.

## September 17 — Mobile Submit tab works from every runner page

- Fixed the runner mobile navigation's **Submit** tab on pages that intentionally do
  not load the run-proof modal bundle, including public discovery and content pages.
  Those pages previously rendered a modal-only button with no click handler, so the
  tap appeared to do nothing.
- When the modal is present, the tab remains a button and opens it in place. Otherwise
  it links to `/runner/submissions?openRunProof=1`, where the existing query handler
  removes the signal from the URL and opens the modal automatically.
- Rendered and checked every runner, organiser, and administrator mobile-tab target.
  Added focused coverage for both Submit modes and all role-specific destinations;
  the 31-test mobile/navigation regression group passes.

## September 16 — Release validation and dependency security updates

- Verified the live CNS event content through the dry-run-only sync command; the
  event record already matches the repository source for the extended registration
  deadline, mobile challenge guide, and required registration fields.
- Verified the deployed public CNS page, `/healthz`, and `/readyz` return HTTP 200.
  The page exposes the September 21 registration deadline, 50-kilometer goal,
  walk/run/hike activities, and CAS Little Theater awarding venue.
- Updated production dependencies with available security fixes: Express 4.22.3,
  Mongoose 8.24.4, Multer 2.4.0, sanitize-html 2.17.7, Sharp 0.35.4, and patched
  transitive parsing/build dependencies. `npm audit --omit=dev` now reports zero
  vulnerabilities.
- Re-ran the CNS-focused workflow coverage and the complete DB-free unit suite after
  the dependency updates. Database-writing integration tests remain intentionally
  excluded because the configured MongoDB target is remote rather than an isolated
  local test database.

## September 16 — Organiser participation: audit trail replaces the self-review block

Audited the register → upload → submit → review path for all three roles after the
own-event participation ban was removed. Organisers and co-organisers work end to end.
Admins are blocked at every gate and stay that way. Three problems came out of the trace.

- **The "Add activity" button on the event page did nothing, for every role.**
  `event-details.ejs` renders three `data-open-run-proof-modal` buttons — one tagged
  `data-run-proof-surface="event-detail"`, so this was the intent — but
  `shouldRenderRunProofModal` matched only `/my-registrations` and `/runner/*`, so neither
  the modal partial nor its script ever loaded there. Rather than widening the path match,
  which would put the modal, a stylesheet, Tesseract and six OCR scripts on every public
  SEO-indexed event page, the event controller now sets `renderRunProofModal` only when the
  viewer actually has a `submit`/`resubmit` action. The modal's auth attribute also moved
  from `isRunnerWorkspace` (false on the public event page, so it would have bounced a
  signed-in participant to login) to `canUseRunnerWorkspace`, which is set on every page and
  is the condition that actually governs whether the submit is accepted.
- **The self-review block is replaced by a self-review audit trail.** Blocking it deadlocked
  a sole organiser: with no co-organiser, and a submission that is not auto-approvable,
  nobody could approve their entry except an admin navigating to the organiser-side review
  form. Reviewing, rejecting and reversing your own entry are now allowed and write an extra
  `submission.self_reviewed` audit row alongside the normal approve/reject event. The
  original action is left alone so existing audit filters and the rejection-volume anomaly
  detector keep working, and the new action is deliberately kept out of `rejectionActions`.
- **The reviewer is warned before acting, not after a failed POST.** The review rows and the
  review form now carry `isOwnSubmission`, showing a "Your own entry" badge and a note that
  the decision is recorded as a self-review. Previously an organiser's own entry looked fully
  actionable and only failed on submit, and the bulk path discarded the explanation entirely.
- **Fixed a contradiction in the admin rule.** `canUseRunnerWorkspace` refuses admins while
  `User.canParticipateInEvents()` allowed them; the latter was unreachable only because the
  workspace gate is checked first. Removed `'admin'` from the model method so the two agree.
- Hardened `approveCleanSubmission`, which hard-coded `reviewerRole: 'organiser'` where every
  other call site forwards `user.role`. Unreachable for admins today, but it would have
  silently downgraded them if the quick/bulk-approve 403 gates were ever relaxed.

### Known limitation

Payment-proof self-approval stays blocked, with its existing
`payment.self_approval_blocked` audit event. A sole organiser registering for their own
**paid** event therefore still cannot get their own payment approved. That control is about
money and was not part of this change, so it was not relaxed silently. Free events —
including CNS — are unaffected.

### Coverage

Added 24 tests across three new files: the full role matrix for `canUseRunnerWorkspace` and
its agreement with `canParticipateInEvents`; self-review detection and auditing; and a
controller-driven test of the modal loading, which fails on the old code and passes on the
new. The previous self-review coverage was a single regex over source text.

## September 16 — Approved entries page, with reversal back to rejected

Once a run entry was approved there was no way to take it back, and by then the approval
had already issued a certificate, awarded badges and published a ranking. The gap was
asymmetric: an approved `AccumulatedActivitySubmission` was already rejectable at the
service layer and only the UI never offered it, while a standard `Submission` was hard
blocked in three places.

- **New Approved Entries page**, mounted twice: `/organizer/approved-entries` for
  organizers and co-organizers, `/admin/approved-entries` for admins. It reuses
  `listSubmissionHub` with the status pinned to `approved`, so both submission kinds are
  listed through the existing `$unionWith` pipeline with the existing event, type, search
  and sort filters. Co-organizers needed no new access work: `listAccessibleReviewEvents`
  already resolves through `getAccessibleEventIdQuery`.
- **Reversing an approval** unwinds what the approval did, through one shared
  `approval-reversal.service.js` so the two mounts cannot drift: the status flips back via
  the existing review services, any issued certificate is revoked, badges earned off the
  entry are withdrawn, the published ranking row is deleted and the event recomputed, and
  the leaderboard cache is flushed. One entry at a time, reason required.
- Ordinary review still treats an approved standard result as final. Rather than widening
  `REJECTABLE_STATUS`, `reviewSubmission` takes an explicit `allowApprovedReversal`
  option, so only the reversal path can undo an approval.
- **Reversal is audited as its own action**, `submission.approval_reversed`, recording
  what was unwound. It is added to the audit filter group but deliberately kept out of
  `rejectionActions`, so reversals do not feed the rejection-volume anomaly alarm as if
  they were ordinary rejections.
- The runner is told their approved result was **withdrawn**, via a new
  `result.approval_reversed` communication key. The generic rejection copy tells them to
  resubmit, which is the wrong instruction and worse when a certificate was just revoked.
- Certificate revocation is now a shared `certificate-revocation.service.js` that the
  organizer's explicit revoke action and the reversal both call, instead of two copies of
  the same field writes.
- Added `deleteRankingEntry` to the ranking service. `syncEventRankings` recomputes from
  currently-approved rows, which self-heals everyone else's position but only ever writes
  — a reversed entry would have kept its stale ranking row forever.

### The trap this avoids

`awardEligibleBadges` permanently skips any badge that has a revoked row for the same
runner, badge and event — an anti-gaming guard. Withdrawing a badge on reversal would
therefore have meant that re-approving the entry never gave it back: the runner would lose
it silently and forever. Reversal-driven revocations are marked on `revoke_reason` and
**restored** on re-approval, before the normal award pass runs. Deliberate admin
revocations keep their permanent block. This is covered by its own test file.

### Coverage

The per-registration privacy rules aside, nothing in `tests/` asserted the
`REJECTABLE_STATUS` guard, and neither the standard nor the accumulated approved→rejected
path was tested. Added 29 tests across three new files covering the guards, the unwinding,
the badge trap, access scoping, and the page itself.

## September 15 — Registrations can be edited after signup

Until now the leaderboard choice (`leaderboardDisplayPreference` / `consentToLeaderboard`)
was write-once: set on the signup form and never again, by anyone. A runner who left the
consent box unticked could not appear on the leaderboard, and no organiser could fix it.
Guest, walk-in and imported registrations never touch these fields at all, so they
silently inherit the opt-in defaults.

- **Organisers and co-organisers can now edit a registration** from the registrants page:
  the leaderboard choice, the participant contact snapshot, and name corrections. New
  `POST /organizer/events/:id/registrants/:registrationId/details`, authorized with the
  same `canAccessRegistrantReview` + `getRegistrantAccessibleEventOrNull` pair as the
  other registrant routes, so co-organisers are covered through `resolveEventAccess`. The
  registration lookup is scoped to the event being administered.
- **Runners can now change their own** leaderboard choice and event contact details from
  `/my-registrations`. The `userId` filter is the entire authorization. Name and emergency
  contact stay profile-owned and are not offered there.
- Both paths share `src/services/registration-details.service.js`, which reads only the
  field groups the submitted form actually carried — so a form editing the leaderboard
  choice alone cannot blank someone's contact details — and reports which fields moved so
  an unchanged resubmit writes nothing.
- **Privacy safeguards on the organiser path**, since it changes whether someone else
  appears in public: a reason is required, a critical audit event is written recording
  **field names only, never values**, and the runner is notified. New communication key
  `registration.updated_by_organiser`.
- Added a `registrations` group to the organiser audit filters. `registration.cancelled`
  already had no group, so it was written to the audit log but unreachable from the UI;
  it is now included.
- Both paths persist with `registration.save()` rather than an atomic update, so the
  post-save hook mirrors the participant fields into the Postgres shadow, and call
  `invalidateLeaderboardCache(event.slug)` when the leaderboard fields change — the cached
  board holds rendered names with hidden runners already filtered out.
- **First test coverage for the leaderboard privacy rules.** Nothing in `tests/` referenced
  either field before. `isRegistrationPublicOnLeaderboard` and `formatRunnerName` are now
  exported and pinned: either field opts a runner out; a missing registration stays visible
  (matching the schema defaults); `abbreviated` downgrades the event name mode but never
  overrides `anonymous_runner_id`; and a per-registration `full_name` never upgrades it.

### Known limitation

Editing `participant.firstName` corrects the registration record, the roster and the
exports, but both the leaderboard
([leaderboard.service.js](../../src/services/leaderboard.service.js)) and certificates
([certificate.service.js](../../src/services/certificate.service.js)) prefer the linked
account's name and fall back to the snapshot only when there is none. So a name edit is
authoritative for guest, walk-in and imported registrations, while an account holder's
leaderboard name and certificate keep following their own profile. The organiser form says
so, because the expectation otherwise is that a leaderboard typo would disappear.

## September 14 — Organisers can join their own events; CNS registration extended

### Organiser and co-organiser participation

- **Organisers may now register for, pay for, and submit results to events they manage.**
  `isOwnOrganizerEvent` blocked the owning organiser across five call sites — the
  registration form (GET and POST), the public event CTA and banner, payment
  continuation, the eligible-submission list, and result submission. The helper and
  every call site are removed. Co-organisers were never covered by the rule, so they
  gain nothing new here beyond the same unblocked path.
- **Replaced with a narrower conflict-of-interest guard: nobody reviews their own work.**
  `reviewSubmission` and `reviewAccumulatedActivitySubmission` now refuse when the
  reviewer is the submission's `runnerId`, unless the reviewer is an admin. Both are
  single chokepoints, so the individual, quick-approve, bulk-approve, and admin paths
  are all covered; bulk approve already reports skipped rows. Payment proofs already
  had an equivalent self-approval guard, which is left in place and now asserted.

### CNS Move More Challenge 2026

- **Registration extended from September 13 to September 21, 2026.**
- Event copy now states that this is an exclusive event of the College of Natural
  Sciences, on the public description and as a "Who can join" row in the submission
  rules.
- **The preferred tracking app or device is now optional and offers concrete choices.**
  It was required free text, which produced guesses from participants who had never
  used a tracking app. It is now a checkbox group of ten options covering watch users,
  phone-only users, an "Other" free-text fallback, and an explicit "Not sure yet",
  which is exclusive of the rest. Removed `preferred_fitness_app` from the event's
  `requiredRegistrationFields`. The per-activity field in the run-proof modal stays
  required — by upload time the participant has actually used an app.
- **Dropped the contact number and position fields from CNS registration.** The
  contact number was never read from the submitted body — it is taken from the
  account profile — so the input only ever looked editable. Department stays,
  since it is a leaderboard column.
- **Participant fields now render per event instead of all-or-nothing.** The
  `participantEventDetails` fieldset used to show contact number, department, and
  position together whenever the event listed any one of them, marking the rest
  optional. Each field now renders only when `requiredRegistrationFields` names it,
  the leaderboard choice is gated on `leaderboard_consent`, and an event that asks
  for nothing renders no fieldset at all.
- Selections are stored as `participant.preferredTrackingApps` plus
  `participant.preferredTrackingAppOther`, with a readable summary still written to
  `participant.preferredFitnessApp` so registrant CSV exports and organiser review
  fallbacks read the field they always have. No Postgres shadow migration is needed —
  the shadow does not carry participant tracking fields.
- **The "Complete challenge guide" was rewritten for mobile.** Four dense prose blocks
  became an "At a glance" summary plus four numbered steps, with what-counts and
  what-does-not as separate lists and the screenshot requirements as a checklist. The
  720px and 420px stylesheets now give each `h2` a divider and top padding, widen list
  spacing, and darken bold lead-ins so the steps read as distinct chunks.
- Added `npm run event:sync-cns-content` (`src/scripts/sync-cns-move-more-content.js`),
  a narrow, idempotent, dry-run-by-default sync for `description`,
  `eventDetailsMarkdown`, `registrationCloseAt`, and `requiredRegistrationFields`.
  `event:update-cns-content` remains the one-time migration and is not re-runnable —
  it asserts fixed record counts and rewrites registrations and certificates.

### Fixes

- The registration page 500'd when a newer view met an older cached controller.
  EJS reads views from disk per render while `require`d modules stay in memory, and
  a bare reference to an undefined local is a `ReferenceError` in EJS. The tracking
  option list is now read through a `typeof` guard, matching the existing
  `csrfToken` convention, so the field hides instead of taking the page down.
