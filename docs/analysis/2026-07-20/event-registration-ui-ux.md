# Event registration guided-review redesign

Date: July 20, 2026
Surface: `/events/:slug/register`
Primary acceptance case: `/events/july-active-quest-virtual-run/register`

## Runner point of view

“Help me choose the correct mode and goal, show the exact event dates and total, let me verify the profile saved with my entry, and give me one final check before creating the registration.”

The shared registration page now follows that sequence. Structured event settings remain authoritative, server-side registration and pricing rules are unchanged, and JavaScript enhances the existing form without becoming a requirement.

## Findings and resolution

| Severity | Finding | Implemented resolution |
| --- | --- | --- |
| High | Mode, distance, profile, waiver, and submission appeared as unrelated cards without a clear completion path. | Introduced four linked sections: event choices, profile, waiver, and final review. |
| High | The form submitted immediately without a concise final check of category, package, add-ons, or total. | Added a live summary and progressively enhanced confirmation dialog before the existing POST. |
| High | Registration drafts included every non-file field despite claiming sensitive values were excluded. | Restricted drafts to mode, distance, signup option, package, and add-on identifiers; profile, emergency, waiver, signature, CSRF, and file values are excluded. |
| High | Distance-price behavior was implemented twice in inline scripts. | Consolidated pricing, summary, validation, emergency-contact, and confirmation behavior in the page-specific script. |
| Medium | Goal cards made a simple category choice take too much space. | Standardized goal/category selection as one native dropdown ordered from longest distance to shortest, with price and availability in each option. |
| Medium | The summary used server-locale date rendering and showed “Location not listed” for a virtual event. | Added Asia/Manila platform-date labels and participation-aware location copy. |
| Medium | The profile snapshot and inline editor interrupted registration even when no update was needed. | Removed the profile card from registration; the server still records the current participant snapshot and applies existing event-specific validation. |
| Medium | The full waiver occupied a large part of the page. | Collapsed the accessible waiver copy while keeping acceptance and exact-name signature controls visible; the accepted snapshot is included in the confirmation email. |
| Medium | Add-on copy described checkout as unfinished even though the registration checkout bridge is active. | Explained that selected add-ons are added to the registration checkout and included in the displayed total. |
| Medium | Validation errors moved runners back to a summary at the top of the form. | Kept the viewport in place and rendered each missing or invalid value in red beside its field, with `aria-invalid`, `aria-describedby`, and live announcements. |
| Low | Existing-registration confirmation omitted add-ons, total, and the next payment action. | Added separated registration/add-on totals, human-readable states, and a contextual payment or event action. |
| Medium | The reduced two-step navigator still reserved four columns, while this page did not initialize shared Lucide icons. | Made step columns content-driven and initialized icons on every registration-page state, restoring the mobile menu and bottom-navigation symbols. |

## Responsive evidence

- [Desktop, 1440 px](assets/event-registration-1440.png)
- [Tablet, 768 px](assets/event-registration-768.png)
- [Mobile, 390 px](assets/event-registration-390.png)
- [Narrow mobile, 320 px](assets/event-registration-320.png)

Desktop keeps the event choices beside a sticky registration summary. Tablet places a compact summary before the form. Mobile preserves the two-step sequence with a native goal dropdown, a manually collapsible waiver that reopens for validation, a registration trigger beside the signature workflow, bounded step navigation, 44-pixel controls, and no page-level horizontal overflow.

The mobile captures show the complete narrow-width flow: the persistent “Your registration” summary is hidden, the waiver section opens the confirmation dialog through one Register button, and the modal’s Go back and Confirm registration actions remain in one equal-width row at 390 and 320 pixels. Tablet and desktop retain the live summary with the same neutral card border as the rest of the page.

The captures use a deterministic privacy-safe July Active Quest fixture: free virtual participation, six accumulated-distance categories from 25K through 200K, registration closing July 22, activity ending July 31, and proof due August 14.

## Compatibility and acceptance

- Existing GET and POST routes, CSRF protection, field names, server validation, pricing resolution, capacity enforcement, waiver snapshots, confirmation redirects, payment workflow, and notification behavior remain unchanged.
- The page works as a native server form without JavaScript; the review dialog, live totals, client error summary, and safe drafts are progressive enhancements.
- Server pricing remains authoritative. Client totals explain the current selection but cannot authorize or persist a price.
- Free, distance-priced, period-priced, customized-option, package, and add-on presentations use one review-data contract.
- Goal/category options are ordered by descending numeric distance; non-numeric categories follow deterministically.
- No goal is preselected; runners must explicitly choose from the “Select goal or category” placeholder.
- Participant details continue to be snapshotted server-side without adding a profile-editing step to registration; participation-specific requirements remain authoritative.
- The sanitized waiver snapshot stored with the registration is delivered with the registration confirmation code.
- Virtual mode suppresses unnecessary emergency-contact collection; onsite mode restores the existing conditional requirement.
- Review confirmation prevents repeated final submission and exposes an `aria-busy` state.
- Focus indicators, reduced-motion behavior, contrast, 200% zoom, and 320-pixel layouts retain usable controls.
