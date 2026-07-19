# Organiser Terms UI/UX Audit

Date: 19 July 2026
Page: `/organiser-terms`
Primary perspectives: new organizer, approved organizer, event operator, participant-support reviewer

## Organizer POV

An organizer needs to know what their account can do, what must be ready before an event becomes public, which decisions remain theirs, and what obligations continue after an event ends. The previous page listed duties but did not reflect HelloRun's current risk-based capability rules, separate payment and result review, accumulated recognition, participant exports, event-shop operations, or trusted-organizer publication.

## Severity-ranked findings

| Severity | Finding | Organizer impact | Resolution |
| --- | --- | --- | --- |
| High | Verification language implied one approval gate for all event creation. | Acknowledged organizers could not tell that they may create free virtual events while higher-risk setups remain locked. | Added an accurate capability strip and an authoritative event-creation access section. |
| High | Registration payment and activity review were not clearly separated. | Organizers could treat payment acceptance as result approval or provide inconsistent recovery. | Added separate lifecycle responsibilities, records, and runner-safe correction expectations. |
| High | Shop orders, inventory, delivery, and fulfilment were absent. | Event commerce obligations appeared to end at registration payment. | Added an event-shop section that separates order payment and organizer fulfilment from registration. |
| High | The draft source was also the public fallback. | Correcting legal content could silently change the live agreement before admin publication. | Preserved the legacy copy as an immutable fallback and separated corrected draft content. |
| Medium | Data handling stopped at general confidentiality. | Export accountability, access restriction, incident escalation, and deletion were unclear. | Added operational export and incident duties linked to Privacy and Data Usage. |
| Medium | Closure obligations were not connected. | Pending reviews, accumulated certificate finalization, refunds, products, and exports could remain unresolved. | Added a closure stage and continuing-duty section. |
| Medium | Penalties appeared without a proportional review model. | Organizers could not distinguish correction from immediate safety restriction. | Added risk-aware remediation, review, and serious-incident language. |

## Design rationale

- The six-stage lifecycle mirrors the organizer's real operational sequence and identifies organizer responsibility, HelloRun's role, and the controlling record at each stage.
- Capability guidance explains the difference between the existing acknowledgement, identity approval, readiness, and conditional auto-publication without promising publication.
- Critical duties bring safety, money, exports, conflicts, communication, and material changes into the scan path.
- Neutral borders and icons preserve hierarchy without colored status edges.
- The complete terms remain authoritative in a readable `70ch` column with server-rendered navigation.

## Responsive verification

Capture references for final visual review:

- `screenshots/organiser-terms-1440.png`: capability strip, four-column lifecycle, duties, sticky contents, and legal text.
- `screenshots/organiser-terms-768.png`: lifecycle cards, native contents, and two-column duty layout.
- `screenshots/organiser-terms-390.png`: single-column capability, duty, and legal flow.
- `screenshots/organiser-terms-320.png`: compact padding, readable labels, and no horizontal overflow.

The lifecycle becomes labeled cards below 780px. Contents remain available without JavaScript, controls retain 44px targets, print removes orientation and navigation modules, and reduced-motion preferences disable transitions.

## Acceptance criteria

- [x] One `h1`, compact policy metadata, Print action, and contextual Organizer Dashboard access.
- [x] Capability guidance matches current acknowledgement, verification, readiness, and publication rules.
- [x] Six lifecycle stages distinguish organizer responsibility, HelloRun support, and operational records.
- [x] Registration payment, activity review, and shop payment remain separate.
- [x] Safety, exports, conflicts, communication, changes, products, fulfilment, recognition, and closure are covered.
- [x] Complete terms use server-generated contents and a `70ch` reading column.
- [x] Legacy v1.0 fallback is separated from corrected draft source.
- [x] Draft preparation is idempotent and never publishes or notifies for baseline creation.
- [x] Future updates notify organizer accounts only and do not replace the existing acknowledgement.
- [x] No advertisements, run-proof modal, forced re-acceptance, or workflow-schema migration.
