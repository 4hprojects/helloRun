# My Registrations runner task and management audit

Date: July 17, 2026  
Surface: `/my-registrations`  
Primary audience: authenticated runners managing event registrations, payments, activities, and recognition

## Runner point of view

“Tell me which event needs me, why it needs me, and the one thing I should do next. Keep registrations that are moving normally visible, but do not make me scan completed events or expanded administrative details to find an urgent correction.”

The redesigned page answers that question before exposing record detail. Corrections and ready tasks appear first, current registrations remain visible, and completed or unavailable records remain recoverable in a collapsed history. Each card separates payment review from activity review and presents one contextual primary action.

## Severity-ranked findings and resolution

| Severity | Finding | Runner impact | Implemented resolution |
| --- | --- | --- | --- |
| High | Registrations were presented as an undifferentiated two-column collection. | A rejected receipt, ready activity, and completed event carried similar visual weight, forcing runners to inspect every card. | Group registrations server-side into Next actions, Active registrations, and collapsed Registration history with deterministic ordering. |
| High | Payment and activity evidence were both fully expanded inside each card. | The immediate action was buried and runners could confuse payment approval with result approval. | Show separate payment and activity states in the action area; move receipts and result records into labeled native disclosures. |
| High | Dashboard progress and this page assembled status independently. | The same registration could appear to need different actions on two runner surfaces. | Build registration groups and cards from the shared runner event-progress resolver. |
| High | Unavailable event records could disappear when populated event data was absent. | Runners lost access to their confirmation reference and a recovery path. | Preserve unavailable records in History with the confirmation code and a Contact Support action. |
| Medium | Accumulated challenges did not lead with approved progress and pending separation. | Runners could not quickly judge verified distance, remaining work, or evidence still under review. | Add a precise accessible progress bar, verified and remaining distance, pending distance, and approved activity count. |
| Medium | Participant, package, review, and proof metadata competed with decision-critical facts. | Cards became tall forms instead of scannable task objects. | Keep category, mode, event timing, submission deadline, confirmation code, payment state, and activity state visible; disclose supporting records on demand. |
| Medium | Upload forms lacked a clear in-progress state. | Slow uploads could encourage duplicate submission. | Disable the submit control, set `aria-busy`, and announce upload progress in a polite live region. |
| Low | The page hierarchy and card geometry were uneven between desktop and mobile. | Desktop wasted width while narrow screens required excessive scanning. | Use one-column horizontal desktop cards and retain the same identity, facts, status, and action order when stacked at tablet and mobile widths. |
| Low | Header actions stacked into three full-width rows on phones. | Navigation consumed too much vertical space before registration status appeared. | Present Dashboard, Events, and Submissions as three equal mobile controls with compact labels and stacked icons. |
| Low | The desktop header persisted at tablet widths and compact labels could clip on narrow phones. | Actions could overflow around 768 px or lose label text around 320 px. | Stack the header before tablet width, use three equal columns, and reserve smaller single-line labels for phones. |

## Responsive evidence

- [Task-first desktop, 1440 px](assets/my-registrations-desktop.png)
- [Task-first tablet, 768 px](assets/my-registrations-tablet.png)
- [Task-first mobile, 390 px](assets/my-registrations-mobile.png)
- [Task-first narrow mobile, 320 px](assets/my-registrations-mobile-320.png)
- [Balanced mobile header, 390 px](assets/my-registrations-header-mobile.png)
- [Balanced narrow header, 320 px](assets/my-registrations-header-mobile-320.png)
- [Balanced tablet header, 768 px](assets/my-registrations-header-tablet.png)

Desktop uses a compact image, decision content, and action column within one horizontal card. Tablet moves the action area below the event context while retaining aligned status fields. Mobile preserves identity first, decision facts second, and the primary action third; details remain closed and there is no page-level horizontal scrolling.

The screenshots use a deterministic privacy-safe fixture because the development MongoDB Atlas connection was unavailable from the verification environment. Template compilation and service tests exercise the production EJS and shared resolver directly.

## Rationale

- “Next action” is computed from workflow state rather than inferred from visual badge text.
- Payment-required and payment-rejected states take precedence because activity submission cannot proceed until payment is approved.
- Rejected activity evidence remains a correction task; organizer review states remain Active because the runner has already completed the immediate task.
- Certificates ready to collect remain a Next action, while approved records without a collection task move to History.
- Native `details` elements keep payment, participant, and result records usable without JavaScript.
- Existing modal triggers, upload endpoints, CSRF fields, file restrictions, certificate routes, proof links, confirmation anchors, and authentication boundaries remain unchanged.

## Acceptance criteria

- [x] Header copy and counts answer what needs attention and provide Browse Events and Submission History actions.
- [x] Mobile header actions use three equal columns with compact labels, 64 px targets, and no horizontal overflow.
- [x] Tablet header actions remain inside the card, while 320 px labels fit on one line without clipping.
- [x] Registrations are grouped into Next actions, Active registrations, and collapsed Registration history.
- [x] Next actions prioritize corrections, payment, deadlines, ready submissions, and certificate collection deterministically.
- [x] Active and History use deterministic date and activity ordering.
- [x] Unavailable events retain their confirmation code and Contact Support action.
- [x] Cards use a one-column horizontal desktop layout and stack without reordering runner tasks.
- [x] Payment and activity review states remain visually separate.
- [x] Accumulated challenges expose approved, remaining, pending, and activity-count progress with an accessible progress bar.
- [x] Each card presents one contextual primary action and a subdued event-detail link where useful.
- [x] Payment forms retain endpoint, multipart encoding, CSRF field, accepted file types, and upload guidance.
- [x] Run submission buttons retain the existing modal hooks and registration ID.
- [x] Receipt, result, participant, package, and review metadata use labeled native disclosures.
- [x] Uploads expose busy and live status; changed forms retain unload protection.
- [x] Controls meet 44 px targets, keyboard focus is visible, reduced motion is respected, and 320 px has no horizontal scrolling.
