# Runner submission history and review audit

Date: July 17, 2026  
Surfaces: `/runner/submissions` and `/runner/submissions/:submissionId`  
Primary audience: runners tracking organizer decisions, correcting rejected evidence, and collecting approved results

## Runner point of view

“I already submitted the activity. Tell me whether it was accepted, whether I need to fix anything, and where the approved result or certificate is. Keep the underlying record available, but do not make me interpret OCR data or organizer review mechanics.”

The redesigned history makes corrections and review state visible before supporting metadata. The detail page resolves one next action from the organizer decision, shows the submitted result, and progressively discloses the registration and proof-reading record.

## Severity-ranked findings and resolution

| Severity | Finding | Runner impact | Implemented resolution |
| --- | --- | --- | --- |
| High | Every submission was rendered twice as four-column tiles and a separate table. | The page shipped duplicate markup, a view preference, and two responsive systems without helping runners understand review status. | Replace both views with one semantic desktop table that transforms into cards below tablet width. |
| High | Rejected, pending, and approved entries used similar card weight and multiple competing actions. | Corrections could be missed and certificate collection competed with generic “View” controls. | Add linked state counts, one correction callout, concise status explanations, and one contextual primary action per row. |
| High | The detail page repeated status in the title row, banner, review section, and action rail. | Runners had to read the same decision repeatedly before finding the correction. | Use one outcome panel and move the appropriate correction workflow directly beneath it. |
| High | Rejection guidance was inferred from free-text keywords inside EJS. | Similar feedback could produce inconsistent correction choices and the behavior was difficult to test. | Resolve metadata, proof, combined, and Strava correction strategies from structured rejection codes in the service layer. |
| Medium | Search, view, sort, activity, status tabs, statistics, and auto-submitting selects formed a crowded control panel. | The archive required interface management before record review. | Keep search visible, collapse labeled filters, align result count and sort, and use explicit server-rendered Apply actions. |
| Medium | OCR confidence, extracted identity, and suspicious-review signals were mixed with runner-facing status. | Internal review mechanics could distract from authoritative organizer feedback. | Remove internal flags, raw OCR text, confidence, and identity analysis; disclose only extracted distance or duration when it explains a visible mismatch. |
| Medium | Raw fastest-time sorting was labeled like a performance ranking across different distances. | A shorter activity could appear “faster” than a longer event result. | Preserve the compatible `fastest` URL but label it “Shortest duration,” place missing durations last, and add stable ID tie-breaking. |
| Low | Mobile table mode reconstructed a second card layout and risked horizontal overflow. | Long titles and actions became difficult to scan at 320px. | Transform the single table rows into labelled cards with full-width actions and no horizontal scrolling. |

## Responsive evidence

### Submission history

- [Desktop, 1440 px](assets/runner-submissions-desktop.png)
- [Tablet, 768 px](assets/runner-submissions-tablet.png)
- [Mobile, 390 px](assets/runner-submissions-mobile.png)
- [Narrow mobile, 320 px](assets/runner-submissions-mobile-320.png)

### Rejected submission detail

- [Desktop, 1440 px](assets/runner-submission-detail-desktop.png)
- [Tablet, 768 px](assets/runner-submission-detail-tablet.png)
- [Mobile, 390 px](assets/runner-submission-detail-mobile.png)
- [Narrow mobile, 320 px](assets/runner-submission-detail-mobile-320.png)

The captures use deterministic runner-safe fixtures because MongoDB Atlas was not reachable from the development environment. They render the active EJS templates and production styles through a local Express preview.

## Rationale

- `/my-registrations` remains the place to decide what an event needs next; Submission History is the durable activity and organizer-review record.
- The correction callout links to the rejected filter rather than duplicating rejected entries above the history.
- Global counts remain stable while result count, chips, and pagination describe the current query.
- “Shortest duration” retains legacy compatibility without implying pace-normalized ranking.
- Structured rejection codes determine whether existing metadata can be edited or new proof is required; uncategorized legacy feedback offers both paths.
- Accumulated activities omit empty duration and pace facts while retaining verified distance and activity identity.
- Proof, metadata-edit, run-proof modal, certificate, verification, and ownership boundaries remain unchanged.

## Acceptance criteria

- [x] The header identifies Submission History and links to Submit Activity and My Registrations.
- [x] Needs correction, awaiting review, approved, and certificate counts are visible and linked.
- [x] The unfiltered page shows one correction callout without duplicating submission rows.
- [x] Search remains visible; status and activity filters use a native collapsed disclosure and explicit Apply action.
- [x] Active chips, pagination, sorting, and filter clearing preserve meaningful query state.
- [x] Default and empty URL parameters are omitted by generated service URLs.
- [x] Every sort has deterministic ID tie-breaking and missing durations sort last.
- [x] One semantic table becomes labelled cards at mobile widths without a JavaScript view preference.
- [x] Rows show runner-safe type, review state, result, activity timing, and one contextual action.
- [x] Internal suspicious flags, raw OCR text, OCR confidence, and identity analysis are absent.
- [x] Detail status appears once as an outcome with the correct metadata, proof, combined, or Strava workflow.
- [x] Existing CSRF fields, edit endpoint, modal registration hooks, proof route, and certificate route remain intact.
- [x] Submission and proof-reading records use native disclosures.
- [x] Forms expose busy and live feedback; changed forms retain unload protection.
- [x] Controls meet 44px targets, focus is visible, reduced motion is respected, and 320px has no horizontal scrolling.
