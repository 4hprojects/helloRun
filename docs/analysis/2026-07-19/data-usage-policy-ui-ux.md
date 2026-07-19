# `/data-usage-policy` UI/UX audit — data journey and transparency

Date: 19 July 2026
Primary visitors: runners deciding what happens to submitted information; organizers deciding what participant data they may access and use
Implementation state: public data-journey presentation implemented; corrected v1.2 prepared as an unpublished admin draft

## Runner point of view

> “I want to know whether my proof is private, what the automated checks actually do, what an organizer can see, what may appear publicly, and how I can correct or remove information.”

The previous page contained substantial policy text but made visitors assemble the data journey themselves. Registration, proof, OCR, organizer access, public standings, retention, and requests appeared as separate legal sections without a concise explanation of how one record moves between them.

## Organizer point of view

> “I need to understand which participant records I can use for an event, what I must protect after export, and which internal or private fields must never be published or reused.”

The former policy described allowed organizer uses but did not make the transition from platform access to exported-record responsibility prominent enough. It also lacked current community revision, report evidence, accumulated progress, certificate snapshot, notification, and communication workflows.

## Severity-ranked findings

| Severity | Finding | Visitor impact | Resolution |
| --- | --- | --- | --- |
| High | The generic policy page led immediately into a long legal document rather than explaining the data lifecycle. | Runners could not quickly answer what happens after uploading evidence. | A five-stage journey now covers collection, assisted checks, authorized review, service outcomes, and retention/end state. |
| High | The body carried a May 2026 “Last Updated” date while the published v1.1 metadata showed June 2026. | Visitors saw two competing dates for the same policy. | Embedded title and metadata are removed from presentation; the review draft contains no hardcoded policy metadata. |
| High | Private evidence, organizer-visible records, and public result fields were described in distant sections. | Proof visibility and leaderboard privacy boundaries were easy to misunderstand. | An eleven-category matrix identifies purpose, access, public visibility, and authoritative retention guidance in one scan path. |
| High | The policy did not cover several implemented workflows. | Accumulated progress, final certificate snapshots, comment revisions, report snapshots, contact drafts, anti-flood records, and durable notifications were unexplained. | The v1.2 draft documents each workflow and its privacy boundary. |
| High | Assisted review language grouped OCR and suspicious-entry checks without enough distinction between a signal and a decision. | A runner could interpret a mismatch as an automatic fraud finding. | The draft states that assisted tools may be wrong, flags do not establish fraud, and configured auto-approval or human review still applies. |
| Medium | Exact retention and advertising disclosures were duplicated across policy documents. | Independently edited copies could drift or conflict. | Data Usage explains operational purpose and links to Privacy/Cookie as authoritative for exact periods, legal bases, international processing, and advertising technologies. |
| Medium | Organizer export responsibility was secondary. | Organizers could overlook their responsibility for copies downloaded from HelloRun. | The journey, matrix, and full policy distinguish platform access from responsibility for exported participant records. |
| Medium | No proactive update path existed for future Data Usage publication. | Existing users might not notice a materially clearer policy. | The durable policy worker now supports a deduplicated, non-blocking Data Usage notice without rewriting consent history. |

## Design rationale

- The page starts with practical comprehension and retains the complete policy as the authoritative document.
- A lifecycle is more useful than a catalogue because one activity can create submitted metrics, private proof, assisted checks, a human decision, public approved results, and later recognition.
- The desktop matrix is semantic tabular content. Below 760px, the same rows become labeled cards so no horizontal table scrolling is required.
- “What stays private,” “What may be public,” and “Your controls” answer the three highest-risk runner questions before the legal body.
- Server-generated contents, normalized headings, and stable anchors preserve navigation without JavaScript.
- The page remains advertisement-free so privacy and data-use guidance is not interrupted by the technology it explains.
- The National Privacy Commission emphasizes clear, accessible information about processing purpose, method, recipients, retention, controller identity, and rights. See the [implementing rules](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/) and [right to be informed](https://privacy.gov.ph/the-right-to-be-informed/).

## Responsive evidence

- [Desktop — 1440 px](assets/data-usage-desktop.png)
- [Tablet — 768 px](assets/data-usage-tablet.png)
- [Mobile — 390 px](assets/data-usage-mobile.png)
- [Small mobile — 320 px](assets/data-usage-mobile-320.png)

Desktop shows the five-stage journey in one connected row and keeps the complete-policy contents rail sticky. Tablet uses a compact two-column journey. Mobile uses task-sized journey rows, labeled data-category cards, a native contents disclosure, and a single reading column.

## Acceptance criteria

- [x] One rendered page `h1`; duplicate policy title and body metadata are removed.
- [x] Header shows version, effective date, updated date, reading time, and Print policy.
- [x] Five server-rendered journey stages describe input through retention/end state.
- [x] Eleven data categories state purpose, access, public visibility, and retention guidance.
- [x] Private proof, internal review data, public safe results, and organizer access are distinguished explicitly.
- [x] OCR and structured signals are described as fallible review assistance.
- [x] Accumulated progress, over-goal totals, final certificate snapshots, community revisions, report snapshots, notifications, contact drafts, audit, and security records are covered.
- [x] Privacy and Cookie remain authoritative for exact retention, legal basis, international processing, breach, minors, and advertising disclosure.
- [x] Privacy requests link to Contact and `4hprojects@proton.me` with a sensitive-file warning.
- [x] Contents and section anchors work without JavaScript.
- [x] The reading column stays near 70ch and mobile data rows require no horizontal scrolling.
- [x] Print, focus, reduced motion, 200% zoom, and 44px controls are supported.
- [x] No advertisement or run-proof modal appears.
- [x] `data-usage:prepare-draft` creates one matching draft and never publishes it.
- [x] Published v1.1 remains current; v1.2 is draft-only and no notice is dispatched during preparation.
- [x] Future publication creates retry-safe `data_usage_policy_updated` notifications for eligible existing accounts.
- [x] Historical consent remains unchanged; future signups continue recording the current published version.

## Publication note

The revised v1.2 wording is a review-ready operational draft, not legal advice. It requires owner or counsel review before a full administrator publishes it. Draft preparation does not notify users, require re-acceptance, or change the policy version previously recorded on an account.
