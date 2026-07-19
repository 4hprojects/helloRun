# `/terms` UI/UX audit — readability, accuracy, and versioned notices

Date: 19 July 2026
Primary visitor: a runner, organizer, or prospective account holder deciding what using HelloRun means
Implementation state: public reading experience shipped; corrected Terms v1.2 prepared as an unpublished admin draft

## Visitor point of view

> “I need to understand the rules that affect my account or event without deciphering a wall of oversized headings. I also need to know which version applies, what changed, and where to find the operational policy behind a specific question.”

The previous page made the agreement harder to scan than its length required. The published v1.1 document contained 23 embedded `<h1>` elements, repeated page-level metadata in the legal body, and no reliable table of contents. On narrow screens, those headings dominated the viewport. The legal copy also contained an unsupported corporate suffix and named payment services that may not match the platform's configured provider.

## Severity-ranked findings

| Severity | Finding | Runner or organizer impact | Resolution |
| --- | --- | --- | --- |
| Critical | The legal body identified the operator as “4HProjects Inc,” which is not the selected verified identity. | Visitors could misunderstand who operates the service. | The review draft uses “Henson M. Sagorsor, operating as 4HProjects.” The current published agreement remains unchanged until an administrator reviews and publishes the draft. |
| High | Twenty-three embedded `<h1>` elements competed with the page title and produced an inaccurate document hierarchy. | Screen-reader and visual navigation were confusing; mobile reading was especially slow. | The presentation resolver removes the duplicate title, demotes legacy section headings to `<h2>`, and guarantees one rendered page `<h1>`. |
| High | The long agreement had no dependable server-rendered contents navigation. | Visitors could not jump to payments, submissions, liability, updates, or contact without scrolling the entire document. | A sticky desktop contents rail and native mobile disclosure are generated from normalized headings, with collision-safe anchors. |
| High | Named payment-provider claims and older workflow language could drift from configured behavior. | Users could form incorrect expectations about payments, accumulated activities, badges, or certificates. | The draft refers to configured third-party providers and documents current review, over-goal, leaderboard, badge, and final-certificate behavior. |
| Medium | Version, effective date, updated date, and reading effort were not presented as one unambiguous header. | It was difficult to know which agreement applied. | The compact header uses `9 March 2026` formatting, visible version metadata, reading time, and a print action. |
| Medium | No concise orientation connected legal rules to everyday runner tasks. | Visitors had to interpret the full agreement before understanding core responsibilities. | “Terms at a glance” summarizes seven practical themes and explicitly states that the complete Terms control. |
| Medium | Related operational policies were difficult to discover. | Visitors could miss more authoritative privacy, refund, organizer, community, or acceptable-use detail. | A related-policy section links all relevant policy and Contact destinations. |
| Medium | Publishing a changed Terms version had no durable non-blocking account notice workflow. | Existing users could remain unaware of a published update. | Publication queues a retry-safe, deduplicated in-app notice for eligible pre-existing accounts without modifying consent history or blocking workflows. |

## Design rationale

- The agreement is treated as reading content, not a marketing surface: no advertisements or run-proof modal are included.
- The legal column is constrained to roughly 70 characters for readable line length, while the contents rail carries navigation separately.
- The summary is intentionally short and subordinate. It helps orientation but cannot replace the agreement.
- Contents are derived from the same sanitized HTML that is visibly rendered, preventing navigation drift and retaining no-JavaScript access.
- Stable section anchors support direct links and keyboard focus. `/terms#pending-organizer-terms` remains compatible and points toward the authoritative Organiser Terms guidance.
- The source revision is prepared as an admin draft rather than silently replacing a live contract. This preserves review authority and immutable consent records.
- Policy publication and notification creation are separated safely: the transaction records durable dispatch state, then a worker delivers idempotent notices in batches.

Google's official guidance emphasizes useful content and clear navigation for site readiness; it does not guarantee approval. Advertising disclosure requirements remain in the Privacy Policy rather than being padded into this agreement. See [AdSense site-readiness guidance](https://support.google.com/adsense/answer/7299563?hl=en) and [required privacy content](https://support.google.com/adsense/answer/1348695?hl=en).

## Responsive evidence

- [Desktop — 1440 px](assets/terms-desktop.png)
- [Tablet — 768 px](assets/terms-tablet.png)
- [Mobile — 390 px](assets/terms-mobile.png)
- [Small mobile — 320 px](assets/terms-mobile-320.png)

Desktop keeps a sticky contents rail beside the focused reading column. Tablet and mobile replace it with a native disclosure, retain the print action and metadata, and stack the summary without horizontal scrolling.

## Acceptance criteria

- [x] Exactly one page-level `<h1>` is rendered.
- [x] Duplicate embedded title and leading metadata are removed from the presentation without rewriting the live database content.
- [x] Legacy `<h1>` sections become deterministic, focusable `<h2>` sections with unique IDs.
- [x] Version, effective date, updated date, reading time, and Print Terms are visible and unambiguous.
- [x] Plain-language summary states that the complete Terms control.
- [x] Contents navigation is server-rendered and works without JavaScript.
- [x] Desktop reading width remains within 68–72ch; mobile has no page-level horizontal overflow.
- [x] Related Privacy, Data Usage, Cookie, Refund, Organiser, Community, Acceptable Use, and Contact links are present.
- [x] The organizer compatibility anchor remains available.
- [x] Terms remains advertisement-free and excludes run-proof modal content.
- [x] Revised source uses the selected operator identity and current platform workflows without unsupported payment-provider claims.
- [x] `terms:prepare-draft` is idempotent and creates a draft only.
- [x] Published v1.1 remains current; prepared v1.2 remains unpublished and does not dispatch notices.
- [x] Future publication creates one durable, retry-safe in-app notice per eligible existing account and leaves consent records unchanged.
- [x] Notification copy identifies the version, summarizes changes, and links safely to `/terms#terms-changes`.
- [x] Print, keyboard focus, reduced motion, 200% zoom, and 320px presentation are supported.

## Publication note

The v1.2 wording is a review-ready operational draft, not legal advice. A full administrator, owner, or counsel must review it before publication. Preparing the draft does not publish it, notify users, or change the Terms version recorded on any prior signup consent.
