# `/privacy` UI/UX audit

Date: 19 July 2026
Audience: visitors, runners, organizers, authors, and account holders
Primary task: understand privacy boundaries and exercise an appropriate control or right

## Visitor point of view

“I need to know whether my proof, contact details, route, or payment information is public; who can see it; and what I can do if something is wrong.”

The previous page presented a long legal document with a generic summary. Its contents navigation was generated only in the browser, the privacy boundaries were not visible before the legal text, dates used locale-dependent formatting, and the page did not provide a direct privacy-request pathway. It also maintained a separate legacy template from the shared public-policy renderer.

## Severity-ranked findings

### High

1. Private evidence and public result fields were not clearly separated in the primary hierarchy.
2. Rights were listed in policy text but were not connected to practical controls or support routes.
3. Client-generated contents meant the primary legal navigation was unavailable without JavaScript and could drift from sanitized server content.
4. Retention language used unsupported fixed ranges and did not distinguish deletion, restriction, anonymization, provider records, audit evidence, and durable public recognition.

### Medium

1. Organizer access and responsibility for exported participant records needed stronger, task-specific explanation.
2. Current accumulated challenges, certificate snapshots, comment revisions, report snapshots, notification history, and cookie preferences were missing from the page hierarchy.
3. Breach wording could be interpreted as promising notification for every technical incident rather than applying the legal notification conditions.
4. The generic side card competed with the agreement without helping visitors complete a privacy task.

### Low

1. The reading line was wider and less consistent than the redesigned policy pages.
2. Mobile contents, printing, zoom behavior, and focus treatment were inconsistent with the shared policy experience.
3. Version dates were not rendered in the established unambiguous `9 March 2026` format.

## Design rationale

The redesign leads with three boundaries: what stays private, what may be public, and who may access a record. A rights-and-controls grid then directs visitors to profile correction, notification settings, integration controls, Cookie Preferences, or the preselected privacy Contact workflow. The processing matrix shows source, purpose, access, visibility, retention, and control without replacing the complete policy.

The complete policy remains database-authoritative and server-rendered. A sticky desktop contents rail becomes a native disclosure on smaller screens. The legal column is capped near 70 characters, while the matrix changes into labeled cards below tablet width to avoid horizontal scrolling.

The corrected source is a review draft. Live Privacy Policy v1.4 remains unchanged until a full administrator publishes a new version. Publication creates a non-blocking in-app notice and does not rewrite historical signup consent.

## Responsive verification targets

- 1440px: compact header, three boundary cards, three-column rights grid, readable matrix, sticky contents rail.
- 768px: two-column rights grid, mobile contents disclosure, matrix cards, no sticky rail.
- 390px: one-column controls, full-width actions, shallow card spacing, readable legal column.
- 320px: no horizontal scrolling, 44px controls, wrapping-safe labels and long policy links.

## Acceptance criteria

- Exactly one page `h1`; duplicate embedded titles and metadata are removed server-side.
- Current database policy content remains authoritative with the legacy file as fallback.
- Private proof, emergency data, contact details, OCR, report evidence, and internal signals are never described as public.
- Public results, recognition, and community content are described conditionally and separately from private evidence.
- Every processing category states purpose, access, visibility, retention guidance, and an available control.
- `/contact?topic=privacy_data` preselects the privacy topic and routes the email draft to the privacy inbox.
- Contents and collision-safe anchors work without JavaScript.
- The page has no advertisement placement or run-proof modal.
- Print, keyboard, reduced-motion, 200% zoom, and 320px layouts remain usable.
- Draft preparation is idempotent and never publishes or alters live v1.4.
- Future publication sends one deduplicated notice to each eligible non-closed account without forcing re-acceptance.

## Reference screenshots

Capture the implemented page at 1440px, 768px, 390px, and 320px after deployment with the published policy database available. Include the default page, opened mobile contents, long matrix content, keyboard focus, and print-preview states.
