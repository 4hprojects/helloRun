# About page runner trust and conversion audit

Date: July 17, 2026  
Surface: `/about`  
Primary audience: runners deciding whether HelloRun is credible and useful  
Secondary audience: event organizers evaluating the platform workflow

## Visitor point of view

### Runner considering HelloRun

“Before I join, I need to know what HelloRun helps me do, whether submitted results are checked, who controls each event, and what happens to my proof. Once those questions are answered, show me an event I can join.”

The redesigned page answers that in one sequence: a clear platform promise, visible trust signals, the four-step runner journey, accountability boundaries, accountable operator information, live events, and one final discovery action.

### Organizer considering the platform

“I need to see whether this replaces the forms, spreadsheets, screenshots, and manual certificates I already manage, without making the page feel like it is only selling organizer software.”

Organizer value is now a compact secondary pathway. It identifies participant records, review status, leaderboards, and certificates, then routes guests to signup and existing organizers to their dashboard.

## Severity-ranked findings and resolution

| Severity | Finding | Visitor impact | Implemented resolution |
| --- | --- | --- | --- |
| High | The original page required visitors to read roughly a dozen sections before reaching current events. | The page explained the platform repeatedly but delayed the runner’s primary action. | Reorder the experience around hero, trust, four runner steps, accountability, operator credibility, and live events. |
| High | Review, privacy, event ownership, and certificate limitations were separated into long standalone narratives. | Visitors had to assemble the trust model themselves and could miss important boundaries. | Consolidate all four topics into one visible “Trust and accountability” section with concise factual cards. |
| High | The hero offered Browse Events, Create Account, and Become an Organiser with similar prominence. | Three competing paths weakened the main conversion goal. | Make Browse Events primary, use one contextual account action, and keep the organizer pathway subdued. |
| Medium | The virtual-run explanation used seven tall cards and duplicated `/how-it-works`. | General About content became operational documentation and significantly increased page length. | Reduce the journey to four compact steps and retain detailed instructions on `/how-it-works` and event pages. |
| Medium | “What HelloRun is,” “Why HelloRun exists,” “Our story,” and operator identity repeated similar context. | Credibility information felt promotional and harder to verify. | Merge the origin and operating facts into one compact block naming 4HProjects, Henson M. Sagorsor, Benguet, Philippines, and the Contact route. |
| Medium | CTAs did not adapt for visitors who already had an account or organizer access. | Returning users were sent toward signup instead of their existing work. | Resolve guest, runner, organizer, and administrator account actions in the controller. |
| Low | Accumulated-event distance collections could dominate a compact event card. | One event made a three-card row uneven and harder to scan. | Clamp the visual distance fact to two lines while leaving the complete text in the accessibility tree. |

## Responsive evidence

- [Guest desktop, 1440 px](assets/about-page-desktop.png)
- [Guest tablet, 768 px](assets/about-page-tablet.png)
- [Guest mobile, 390 px](assets/about-page-mobile.png)
- [Guest narrow mobile, 320 px](assets/about-page-mobile-320.png)

Desktop uses a compact two-column hero, four-column trust and runner-step rows, two-column accountability cards, and a three-card event grid. Tablet preserves the decision context while moving trust and journey content into two columns. Mobile uses one-column journey and accountability cards, full-width 44px actions, compact trust rows, and no page-level horizontal scrolling.

## Rationale

- The About page establishes trust and directs action; detailed proof instructions remain on `/how-it-works` and individual event pages.
- “Reviewed” is described conditionally because organizer settings remain authoritative and not every uploaded item is automatically an official result.
- Proof privacy, public result visibility, event ownership, and certificate limitations remain explicit rather than being replaced with broad trust claims.
- Promoted events continue to use the existing public-visibility aggregation and three-event limit, making the conversion module evidence-backed and current.
- Account actions are contextual without changing authentication, registration, organizer application, or dashboard behavior.
- No advertisements interrupt the company and trust narrative.

## Acceptance criteria

- [x] The hero contains one concise platform explanation and prioritizes Browse Events.
- [x] Guests see How It Works and an organizer pathway without a repeated Create Account CTA.
- [x] Authenticated runners receive My Registrations; organizers receive Organizer Dashboard and Manage Your Events.
- [x] Trust signals appear directly after the hero.
- [x] The runner journey uses four steps across four desktop, two tablet, and one mobile columns.
- [x] Virtual, on-site, hybrid, accumulated-distance, and community event support remains visible.
- [x] Review, proof handling, event ownership, and recognition boundaries remain factual and visible.
- [x] Founder, operator, location, company, and Contact information remain public.
- [x] Three eligible current events or one simple empty state render from the existing aggregation.
- [x] Current-event images retain lazy loading and fallbacks; long distances do not expand cards indefinitely.
- [x] Controls meet 44px targets with visible focus, reduced-motion behavior, and no horizontal scrolling at 320px.
- [x] The page contains no advertisement or run-proof modal content.
