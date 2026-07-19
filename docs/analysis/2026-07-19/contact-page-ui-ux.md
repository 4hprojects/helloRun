# `/contact` guided support UI/UX audit

Date: 2026-07-19
Perspectives: runner seeking help, organizer resolving operational work, and guest evaluating support trust

## Visitor point of view

“I should not need to understand HelloRun’s internal teams before asking for help. Show me where to start, what details will speed up a response, which decisions belong to an event organizer, and whether my message has actually been sent.”

The redesigned page leads with one guided email composer. It prepares a structured draft locally and then hands the visitor to their email application, where they remain in control of sending it.

## Severity-ranked findings and resolution

| Severity | Finding | User impact | Implemented resolution |
| --- | --- | --- | --- |
| High | Eight equally weighted cards required visitors to diagnose and route their own problem. | The actual contact action was easy to miss and the page felt like another FAQ. | Replace the card catalogue with one topic-led composer followed by compact supporting guidance. |
| High | The page exposed only a `mailto:` link without helping visitors include identifiers support needs. | Registration, organizer, proof, and certificate requests could require avoidable follow-up. | Collect optional account, event/page, and reference context plus one required issue description in the local draft. |
| High | Contact content used the Proton address while the configured operational inbox and smoke contract expected Gmail. | Visitors and tests disagreed about the authoritative support destination. | Route operational topics through `ADMIN_EMAIL` with the Gmail fallback and privacy/data requests through Proton. |
| Medium | The page did not clearly distinguish opening an email client from sending a message. | A visitor could believe HelloRun had received a request after clicking a mail link. | Label the action “Open email draft” and announce that nothing is sent until the visitor sends it from their email app. |
| Medium | Organizer-dashboard context was an extra generic card rather than a prepared support path. | Organizers still had to find the correct topic and remember which identifiers mattered. | Allowlist the source, preselect organizer support, and surface application/event reference guidance. |
| Medium | Privacy, event authority, response expectations, and self-service routes were buried among long paragraphs. | Visitors could overshare documents, wait on the wrong party, or contact support for a task already visible in their account. | Add compact privacy, event-decision, inclusion-checklist, and role-aware quick-help modules. |
| Low | The generic static-page layout repeated large cards and offered limited mobile task hierarchy. | The page required excessive scrolling and did not prioritize the composer. | Use a dedicated responsive stylesheet with a compact header, one primary column, and a secondary guidance rail. |

## Implemented direction and rationale

- The composer runs entirely in the browser and adds no ticket storage or new submission endpoint.
- Eight deterministic topics provide enough routing without presenting separate departments as page sections.
- Privacy/data messages use `4hprojects@proton.me`; other messages use the configured support inbox.
- Direct email links remain visible when JavaScript or mail-draft enhancement is unavailable.
- Authenticated users receive a prefilled account email and role-relevant recovery links without exposing private data publicly.
- Event-specific commercial, approval, and rule decisions remain with the event organizer where applicable.
- The page retains online support, Benguet operation, and a truthful 24–48-hour typical response expectation.

## Responsive captures

- [Desktop, 1440 px](assets/contact-desktop.png)
- [Tablet, 768 px](assets/contact-tablet.png)
- [Mobile, 390 px](assets/contact-mobile.png)
- [Mobile, 320 px](assets/contact-mobile-320.png)

## Acceptance criteria

- [x] The page has one `h1`, a compact support header, response expectations, and one dominant composer.
- [x] Topic, account email, context, reference, and issue fields have visible labels and native validation.
- [x] The issue description is limited to 1,000 characters and has a live count.
- [x] Privacy/data drafts use Proton; other topics use the configured support inbox.
- [x] The generated subject and body are encoded, bounded, structured, and built only on the visitor’s device.
- [x] The primary action says “Open email draft” and never claims the message was sent.
- [x] Direct operational and privacy email links remain available without JavaScript.
- [x] Organizer-dashboard source context is allowlisted and preselects organizer support.
- [x] Guest, runner, organizer, and administrator quick-help actions are deterministic.
- [x] Privacy guidance discourages unsolicited sensitive attachments.
- [x] Event-specific organizer authority is explained with a direct event-discovery route.
- [x] The page contains no advertisements or run-proof modal content.
- [x] Controls meet 44px, focus is visible, motion is reducible, and layouts remain usable at 1440, 768, 390, and 320px without horizontal scrolling.
