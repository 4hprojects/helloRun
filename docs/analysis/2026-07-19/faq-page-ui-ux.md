# `/faq` UI/UX audit — searchable support and content readiness

Date: 2026-07-19
Audience: prospective runners, registered runners, organizers, administrators, and guests seeking support

## Outcome

The FAQ is now a public, advertisement-free support library with 40 original answers across eight task-oriented topics. Visitors can search question text, full answers, and related terms; browse stable category and answer links; or read every answer through native disclosures without JavaScript.

One normalized server-side source now supplies the visible page, role-aware actions, search metadata, and `FAQPage` structured data. This removes the previous risk of the visible answers and hand-maintained JSON-LD contradicting each other.

This work improves content usefulness and site readiness but cannot guarantee AdSense approval. Google independently evaluates the full site and account. The direction follows Google's guidance to provide original, relevant content, clear navigation, and a useful experience rather than pages built primarily around ads:

- [Make sure your site's pages are ready for AdSense](https://support.google.com/adsense/answer/7299563?hl=en)
- [Your AdSense account wasn't approved](https://support.google.com/adsense/answer/81904?hl=en)
- [AdSense Program policies](https://support.google.com/adsense/answer/48182?hl=en)

## Visitor POV

### Guest choosing whether to trust HelloRun

The guest needs to understand the supported event formats, who operates a particular event, what information is reviewed, and what joining may require before creating an account. The compact introduction, event-record reminder, getting-started content, privacy explanations, and Browse Events action now answer those questions without forcing sign-in.

### Registered runner with an immediate problem

The runner usually arrives with a state rather than a broad topic: payment pending, activity rejected, pending distance, a missing leaderboard result, or a certificate that is not ready. Search recognizes both interface labels and runner language. Answers then link to My Registrations, Submission History, Notifications, Profile, or the relevant policy.

### Organizer resolving responsibility

The organizer needs the boundary between platform workflow and event authority to be explicit. The FAQ now distinguishes payment review from activity review, HelloRun-operated events from organizer-managed events, and platform support from event-specific package, schedule, refund, eligibility, and result decisions.

### Visitor with a privacy, safety, or community concern

The page explains that proof and payment evidence are operational records for authorized review, should not be posted publicly, and must not be included in an initial support message unless requested. Community answers cover comment replies, editing history, and reason-based reporting without exposing moderation-only signals. Health and safety guidance defers to qualified local professionals and emergency services.

## Severity-ranked findings

### Critical — visible answers and structured data were duplicated

The previous template contained a manually written FAQ list and a separate manually written JSON-LD list. Any content edit could leave search-engine data inconsistent with the visible page. Both now derive from one presentation service, with safely serialized structured data containing only visible questions.

### High — the content stopped before the most important current workflows

The previous 23 answers did not explain accumulated goals, verified versus pending distance, over-goal submissions, final certificate release, task-first registration management, notification archiving, or community reporting. The expanded 40-answer library covers those workflows using runner-safe language and links to authoritative pages.

### High — a flat document made problem recovery slow

Visitors had to scan five broad headings and many fully visible cards. The redesign adds visible search, eight category shortcuts, a sticky desktop directory, stable answer anchors, native disclosures, match counts, highlighted matching categories, and one recovery action when no answer matches.

### Medium — account actions did not reflect the visitor's role

The previous page ended without a deterministic next step. The final action panel now routes guests, runners, organizers, and administrators to the most useful account surface while retaining Contact Support.

### Medium — shared static-page styling limited independent refinement

FAQ previously depended on the shared static-page stylesheet and inline initialization. It now has scoped responsive CSS and a small focused browser module, preventing FAQ density and search behavior from affecting Contact, policy, or How It Works pages.

### Low — the page did not establish policy boundaries near answers

Answers now link to Privacy, Data Usage, Refund and Cancellation, Community Guidelines, Contact, and How It Works where detailed policy or workflow guidance belongs. A final boundary note reinforces that event pages and applicable policies are authoritative.

## Responsive evidence

- [Desktop — 1440 px](assets/faq-desktop.png)
- [Tablet — 768 px](assets/faq-tablet.png)
- [Mobile — 390 px](assets/faq-mobile.png)
- [Compact mobile — 320 px](assets/faq-mobile-320.png)

Desktop uses a compact hero, supporting preparation card, sticky category directory, and readable answer column. At tablet and mobile widths, the directory becomes a horizontally scrollable topic strip with 44 px targets. Answer cards retain full content width, shallow spacing, and native disclosure behavior without page-level horizontal overflow.

## Content and interaction rationale

- Forty complete answers provide useful operational guidance rather than keyword padding.
- Eight categories follow the event lifecycle and the vocabulary already used by runner-facing interfaces.
- Search reads rendered question, answer, related-link, and keyword text without sending a request or storing a query.
- Native `<details>` elements keep the full library usable when scripting fails or is disabled.
- Stable category and question IDs support direct links from support messages and future documentation.
- Search opens matching answers, preserves manually opened answers, provides a live result count, and clears safely with Escape or a visible control.
- No advertisement unit is rendered. The FAQ's purpose remains support and trust; ad placement can be reconsidered after approval and only after useful content.
- Event-specific dates, pricing, activities, evidence, refunds, and recognition remain authoritative on the relevant event or policy page.

## Acceptance criteria

- Exactly one `h1` identifies the page as “How can we help?”
- Forty questions render in eight labeled categories from one deterministic content source.
- Every visible question and answer has an identical `FAQPage` structured-data counterpart.
- Structured-data serialization cannot close the JSON script element through supplied text.
- Search matches questions, answers, and keywords; reports the result count; highlights matching topics; and offers one recovery action when empty.
- All content remains readable and navigable without JavaScript.
- Individual answers and categories have stable deep links; loading an answer link opens and focuses it.
- Guest, runner, organizer, and administrator actions resolve predictably.
- Payment and activity review remain distinct, pending progress remains unofficial, over-goal approved totals remain uncapped, and accumulated certificates remain final-review dependent.
- Proof privacy, organizer ownership, community reporting, and support boundaries are visible without making medical, accreditation, refund, or approval guarantees.
- No ad unit or run-proof modal appears on `/faq`.
- Interactive controls meet a 44 px target, focus is visible, reduced motion is honored, and the page remains usable at 200% zoom and 320 px without horizontal overflow.
