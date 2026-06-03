# HelloRun About Page Implementation Brief

## Current Status

Status: implemented.

Primary route:

- `GET /about`

The page now uses the dedicated `about.css` stylesheet, server-rendered SEO metadata, and up to three currently promoted published events.

Primary implementation files:

- `src/controllers/page.controller.js`
- `src/routes/pageRoutes.js`
- `src/views/pages/about.ejs`
- `src/public/css/about.css`
- `tests/static-pages.test.js`

## Goal

Improve `/about` so it clearly explains what HelloRun is, who it serves, how event submissions work, and why runners can trust the platform.

The page should build confidence before a runner registers, uploads proof, submits activity screenshots, or uploads payment receipts.

## Core positioning

Use this as the main positioning statement:

> HelloRun is a running event platform built to help runners join events, submit results, track approvals, and keep their running achievements in one place.

Do not position HelloRun as only Philippine-based.

The platform can have local roots, but the About page should sound open to runners, organisers, and communities anywhere.

## Recommended page headline

```text
A running event platform for flexible participation and verified progress
```

## Recommended hero copy

```text
HelloRun helps runners join events, submit results, track approvals, and keep their running achievements in one place.

It is built for runners who want flexibility, and for organisers who need a clearer way to manage registrations, payment proof, run submissions, leaderboards, and certificates.

Whether you are joining a virtual challenge, an on-site race, or a hybrid event, HelloRun gives you one place to register, submit, review, and celebrate progress.
```

## Suggested hero buttons

```text
Browse Events
Create Account
Become an Organiser
```

Recommended button routing:

- Browse Events: `/events`
- Create Account: `/register` or current signup route
- Become an Organiser: `/organizer/register`, `/organizer`, or current organiser route

## Page sections

Use the following sections in order:

1. What HelloRun is
2. Who HelloRun is for
3. How virtual runs work
4. Why submissions and leaderboards are reviewed
5. Data privacy and proof handling
6. Certificates and recognition
7. Official and organiser-managed events
8. Why HelloRun exists
9. Our story
10. Current official events
11. Final call to action

---

## Implementation Notes

- The implemented page follows the recommended section order and positions HelloRun as open to runners, organisers, and communities anywhere.
- The "Current events" section uses the same promoted-event listing source as the homepage and renders an empty state when no published events are available.
- Event cards are labeled as organiser-managed unless an event page explicitly identifies a different management relationship.
- The page links runners to `/events`, account creation to `/signup`, and privacy guidance to `/privacy`.
- No database schema changes were required.

## Test Coverage

Focused coverage exists in `tests/static-pages.test.js`.

Verified scenarios:

- `/about` renders successfully with the new headline.
- Trust, privacy, review, event-management, and current-event guidance is present.
- The Privacy Policy link is rendered.

---

# Full About Page Content

## Section 1: What HelloRun is

### Heading

```text
What HelloRun is
```

### Body

```text
HelloRun is a running event platform for runners, organisers, and communities.

The platform supports different types of running events, including virtual runs, on-site races, hybrid events, distance challenges, community runs, and organiser-managed events.

For runners, HelloRun makes the event journey easier.

You can browse events, register online, submit run proof, monitor your review status, view approved results, and access certificates when your entry is accepted.

For organisers, HelloRun provides tools for managing event pages, participant records, payment verification, proof review, leaderboard publishing, and certificates.

The goal is simple.

Make running events easier to join, easier to manage, and easier to trust.
```

### Optional card list

```text
Virtual runs
On-site races
Hybrid events
Distance challenges
Community runs
Organiser-managed events
```

---

## Section 2: Who HelloRun is for

### Heading

```text
Who HelloRun is for
```

### Body

```text
HelloRun is for runners who want to stay active without being limited by one location, schedule, device, or tracking app.

You can use HelloRun if you are joining your first virtual run, working toward a personal distance goal, completing a walking or fitness challenge, joining a community running event, tracking your approved race submissions, or checking event leaderboards and certificates.

HelloRun is also for organisers who want a better way to manage running events without relying only on spreadsheets, chat messages, manual screenshots, and separate certificate files.

Whether you are a runner, coach, community leader, race organiser, or fitness group admin, HelloRun helps keep the event process clear from registration to completion.
```

### Optional two-column cards

#### Card 1

```text
For runners

Join events, submit results, monitor approvals, and keep your finishes in one place.
```

#### Card 2

```text
For organisers

Create event pages, review submissions, manage participants, and publish approved results through one workflow.
```

---

## Section 3: How virtual runs work

### Heading

```text
How virtual runs work
```

### Body

```text
A virtual run allows you to complete your distance wherever you are, within the event period set by the organiser.

You do not need to be at one physical starting line.

You can run on the road, on a track, on a treadmill, or in any safe location accepted by the event rules.
```

### Step list

```text
1. Choose an event that matches your distance or goal.
2. Register through the event page.
3. Complete your run within the allowed event period.
4. Record your activity using your preferred running app, watch, treadmill record, or accepted tracking method.
5. Submit your proof through HelloRun.
6. Wait for organiser or admin review.
7. Once approved, your result may appear on the leaderboard and your certificate may become available.
```

### Closing copy

```text
Each event may have its own rules.

Some events may require one completed activity.

Others may allow accumulated distance across multiple runs.

Before submitting, always check the event details, accepted proof types, distance rules, and submission deadline.
```

---

## Section 4: Why submissions and leaderboards are reviewed

### Heading

```text
Why submissions and leaderboards are reviewed
```

### Body

```text
HelloRun is built around submission review, status tracking, and organiser approval.

Results are not meant to become final just because a screenshot was uploaded.

Submissions may be reviewed before they appear publicly, count toward rankings, or qualify for certificates.

This helps protect the credibility of each event.
```

### Review checklist

```text
Depending on the event rules, reviewers may check details such as:

- Runner name
- Distance completed
- Activity duration
- Activity date
- Uploaded screenshot or activity proof
- Event eligibility
- Duplicate submissions
- Mismatched proof details
- Suspicious or incomplete entries
```

### Closing copy

```text
Each event may have its own review process.

Organisers set the rules for their events, while HelloRun provides the workflow for submitting, reviewing, approving, and publishing results.

Approved results should be based on submitted evidence, not unchecked claims.

That is what makes the leaderboard more meaningful for runners.
```

---

## Section 5: Data privacy and proof handling

### Heading

```text
Data privacy and proof handling
```

### Body

```text
HelloRun may ask runners to upload screenshots, activity records, payment receipts, or other event-related proof.

These uploads are used for event operations such as confirming registration, reviewing payment status, verifying run completion, checking leaderboard eligibility, resolving event concerns, and supporting certificate approval.
```

### Suggested bullet list

```text
Uploaded proof may be used to:

- Confirm registration
- Review payment status
- Verify run completion
- Check leaderboard eligibility
- Resolve event concerns
- Support certificate approval
```

### Trust copy

```text
Uploaded proof may be viewed by authorised reviewers, such as platform administrators or the organiser responsible for the event.

HelloRun does not treat uploaded proof as public content unless the platform or event page clearly states that a specific item will be shown publicly.

Public event information may include approved results, rankings, participant names, event participation, and leaderboard details, depending on the event settings.

We aim to keep the process clear:

You should know what you submit, why it is needed, and how it may be used for event review.

For more details, please read our Privacy Policy and event-specific rules before joining an event.
```

### Suggested link

```text
Privacy Policy
```

Route:

```text
/privacy
```

---

## Section 6: Certificates and recognition

### Heading

```text
Certificates and recognition
```

### Body

```text
HelloRun certificates are event-based recognition records.

A certificate confirms that a runner joined or completed a specific event based on the event rules and approved submissions.

Certificates may be issued after the runner’s registration, payment status, and run proof have been reviewed and accepted, depending on the event requirements.

Each certificate reflects participation or completion in the specific HelloRun event where the runner was registered and approved.

A HelloRun certificate does not replace official race timing, government-issued documents, school records, professional accreditation, or third-party certification unless clearly stated by the organiser.

For runners, certificates help record progress.

For organisers, certificates help provide structured recognition for approved participants.
```

---

## Section 7: Official and organiser-managed events

### Heading

```text
Official and organiser-managed events
```

### Body

```text
HelloRun may host different types of events.

Some events may be directly managed by HelloRun.

Others may be created and managed by independent organisers using the HelloRun platform.

To keep this clear, event pages may use labels that identify how the event is managed.
```

### Label cards

#### Card 1

```text
Official HelloRun Event

This means the event is directly managed or officially recognised by HelloRun.
```

#### Card 2

```text
Organiser-Managed Event

This means the event is created, managed, and reviewed by an organiser using the HelloRun platform.
```

### Closing copy

```text
This distinction helps runners understand who is responsible for event rules, registration review, proof approval, participant support, and event-specific decisions.

Before joining, runners should always check the event details and organiser information.
```

---

## Section 8: Why HelloRun exists

### Heading

```text
Why HelloRun exists
```

### Body

```text
Running events are meaningful, but the process behind them can become messy.

Runners submit screenshots through chat.

Organisers check payment receipts manually.

Results get stored in spreadsheets.

Certificates are prepared separately.

Leaderboards are hard to keep updated.

HelloRun was created to make that process clearer.

The platform brings registration, proof submission, review, results, and recognition into one organised workflow.

For runners, that means fewer scattered forms and messages.

For organisers, that means less manual tracking and a clearer way to manage participants.

For the running community, that means better event credibility and better visibility for approved finishers.
```

---

## Section 9: Our story

### Heading

```text
Our story
```

### Body

```text
HelloRun started from a practical idea:

Running events should be easier to manage and easier to trust.

Many running communities already have strong participation, motivated runners, and dedicated organisers.

The challenge is often the system behind the event.

How do you collect registrations?

How do you check payment proof?

How do you review screenshots?

How do you update leaderboards?

How do you issue certificates without losing track of approved participants?

HelloRun was built to answer those problems.

It began as a solution for managing running events in a local community. It is now designed for runners, organisers, and communities wherever they are.

The goal is not to replace the experience of running.

The goal is to remove confusion around registration, submissions, review, results, and recognition.
```

---

## Section 10: Current official events

### Heading

```text
Current official events
```

### Body

```text
HelloRun features events that runners can join based on their goals, distance preferences, and schedule.

Official HelloRun events are directly managed or officially recognised by HelloRun.

Organiser-managed events are hosted on the platform and handled by their respective organisers.
```

### Event card data points

Each event card should show:

```text
- Event name
- Event type
- Distance options
- Registration period
- Run period
- Accepted proof types
- Review process
- Certificate availability
- Organiser information
- Event rules
```

### Empty state copy

Use this if there are no official events currently available:

```text
No official HelloRun events are available at the moment. You can still browse organiser-managed events and upcoming challenges.
```

### Button

```text
Browse Events
```

Route:

```text
/events
```

---

## Section 11: Final call to action

### Heading

```text
Ready for your next run?
```

### Body

```text
Join an event, submit your progress, and keep your achievements in one place.

Whether you are running your first 5K, completing a monthly challenge, or managing your own running event, HelloRun gives you a clearer way to participate, verify, and celebrate progress.

Start with an event that matches your goal.

Run it your way.

Submit it clearly.

Get recognised properly.
```

### Buttons

```text
Browse Events
Create Account
Become an Organiser
```

---

# UI and layout recommendations

## Visual style

Keep the page clean, modern, and trust-focused.

Recommended style:

- Wide hero section
- Short paragraphs
- Alternating content blocks
- Cards for runner and organiser sections
- Numbered process steps for virtual runs
- Trust checklist for review process
- Privacy section with a clear policy link
- Event cards for current official events
- Strong final CTA

## Suggested page layout

```text
Hero
  Headline
  Intro copy
  CTA buttons

Section: What HelloRun is
  Text block
  Event type cards

Section: Who HelloRun is for
  Runner card
  Organiser card

Section: How virtual runs work
  Numbered steps

Section: Why submissions and leaderboards are reviewed
  Text block
  Review checklist

Section: Data privacy and proof handling
  Text block
  Proof usage cards
  Privacy Policy link

Section: Certificates and recognition
  Text block

Section: Official and organiser-managed events
  Two label cards

Section: Why HelloRun exists
  Narrative block

Section: Our story
  Founder/platform story

Section: Current official events
  Event cards
  Browse Events button

Final CTA
```

---

# Suggested component names

Use any naming that fits the existing project structure.

```text
AboutHero
AboutWhatIsHelloRun
AboutAudience
AboutVirtualRuns
AboutSubmissionReview
AboutPrivacyProofHandling
AboutCertificates
AboutEventTypes
AboutWhyExists
AboutStory
AboutOfficialEvents
AboutCTA
```

---

# Data recommendations

## Static content option

If the About page is static, store the content in the page component.

## Content config option

Better option:

Create a content file such as:

```text
src/content/aboutPageContent.js
```

or

```text
src/data/aboutPageContent.js
```

Then map the content into reusable UI components.

## Events option

For the Current official events section:

- Fetch published active events if the app already has an event API.
- Filter by official HelloRun events if the event model supports that field.
- If no official flag exists yet, use a temporary curated list or hide the section until official event tagging is available.

Recommended future field:

```js
eventManagementType: "official_hellorun" | "organizer_managed"
```

or

```js
isOfficialHelloRunEvent: true
```

---

# Copy rules

Follow these rules when adding the content:

- Use `organiser` and `organisers`.
- Use `on-site`, not `onsite`, inside the About page copy.
- Use `HelloRun` consistently in page headings and body copy.
- Do not use `helloRun` in the About page copy unless the current brand guide requires lowercase styling.
- Avoid saying HelloRun is only Philippine-based.
- Mention local roots only in the story section.
- Do not overclaim certificate authority.
- Do not imply all events are verified by HelloRun.
- Distinguish official HelloRun events from organiser-managed events.
- Make privacy language clear but not overly legalistic.
- Link to Privacy Policy from the proof handling section.

---

# SEO recommendations

## Suggested meta title

```text
About HelloRun | Running Event Platform for Virtual, On-Site, and Hybrid Events
```

## Suggested meta description

```text
Learn how HelloRun helps runners join events, submit results, track approvals, and keep achievements in one place while helping organisers manage registrations, proof review, leaderboards, and certificates.
```

## Suggested H1

```text
A running event platform for flexible participation and verified progress
```

## Suggested keywords to naturally include

```text
running event platform
virtual runs
running events
event registration
run proof submission
leaderboards
running certificates
race organiser tools
hybrid running events
on-site races
```

---

# Accessibility recommendations

- Use only one H1.
- Keep section headings as H2.
- Use H3 for cards under each section.
- Use real buttons or accessible links for CTAs.
- Add descriptive aria-labels for buttons if needed.
- Ensure sufficient contrast for trust cards and section backgrounds.
- Avoid placing important trust text only inside images.
- Event cards should be keyboard accessible.

---

# Acceptance criteria

The implementation is complete when:

- `/about` has a stronger hero section with a clear value proposition.
- The page explains what HelloRun is.
- The page explains who it is for.
- The page explains virtual, on-site, and hybrid event support.
- The page explains the virtual run submission process.
- The page explains why submissions and leaderboards are reviewed.
- The page explains how uploaded proof and payment receipts may be handled.
- The page links to the Privacy Policy.
- The page explains certificates without overclaiming official authority.
- The page distinguishes official HelloRun events from organiser-managed events.
- The page includes a story section without limiting the brand to the Philippines.
- The page includes current official events or a clean empty state.
- The page ends with a clear CTA.
- The copy uses `organiser` spelling consistently.
- The page is responsive on mobile, tablet, and desktop.
- The page maintains the current HelloRun visual identity.

---

# Suggested implementation prompt for Codex

```text
Improve the HelloRun `/about` page using the content and structure in this Markdown file.

Goals:
- Make the About page stronger and more trust-building.
- Explain what HelloRun is, who it serves, and how virtual runs work.
- Explain submission review, leaderboard credibility, proof handling, certificates, and organiser-managed events.
- Keep the positioning globally open and avoid presenting HelloRun as only Philippine-based.
- Use the existing design system, routes, components, and styling conventions of the project.
- Use organiser/organisers spelling.
- Add a Privacy Policy link in the Data privacy and proof handling section.
- Add responsive cards, steps, and CTA sections where appropriate.
- Do not overclaim that all certificates are official race certifications.
- Do not imply every organiser-managed event is directly verified by HelloRun unless the event data supports that.
- Preserve existing app functionality.
```

---

# Suggested future improvement

Add a small trust badge or info row near the hero:

```text
Submission review
Proof-based results
Organiser-managed workflows
Certificate-ready events
```

This gives runners quick confidence before they scroll.
