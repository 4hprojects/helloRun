# `/runner/profile` UI/UX audit

Date: 2026-07-18  
Perspective: authenticated runner managing account information

## Runner point of view

“I came here to confirm that my registration name, contact details, timezone, emergency contact, and sign-in settings are correct. I should immediately see what is missing, edit one group without scanning a long settings document, and understand which information is private or public. My badges matter, but they should not make routine account maintenance harder.”

## Findings before redesign

### P1 — Account tasks competed with a long achievement feed

Nine equally weighted sections placed identity, security, notification settings, Strava, active badge progress, and up to twelve earned badges in one continuous document. The page did not communicate which information required attention or which task should happen first.

### P1 — Editing behavior was inconsistent

Identity, contact, and emergency information started in read-only controls and depended on JavaScript edit buttons. Location and notifications were always editable. Without JavaScript, the read-only controls could not be opened for editing, and the visual treatment made disabled facts resemble unavailable actions.

### P1 — Sensitive identity and contact information was overexposed in the scan view

The birth date, personal mobile number, and emergency contact number were shown in full even when the runner was only scanning the page. The redesign masks the birth day and month, and shows only the final four digits of both numbers. Full values remain available only inside the authenticated edit disclosures.

### P2 — Mobile navigation increased page length before useful content

The nine-item quick menu changed into a single-column list on phones. This delayed the first profile field and duplicated the same document structure rather than providing a compact jump control.

### P2 — Completion lacked a direct recovery path

The overview listed every missing field but did not take the runner to the first incomplete group. Completion was informative rather than actionable.

### P2 — Notification settings contained duplicated content

“Badge earned” appeared twice because notification definitions were embedded directly in EJS. Presentation options now come from one deterministic, unit-tested list.

## Implemented direction and rationale

- The compact My Profile header combines identity, avatar management, email, completion, and dashboard recovery.
- One completion callout appears only when needed and links to the first incomplete group.
- Personal details use native edit disclosures. Read-only summaries stay compact while forms remain available without JavaScript.
- Email and running groups render as facts instead of disabled inputs.
- Preferences, Connections, Security, and Achievements have distinct headings and task language.
- The desktop section menu remains sticky; mobile uses one collapsed native “Jump to profile section” control.
- Achievements show a featured badge, totals, three goals, and three recent badges by default. Remaining items stay available in a native disclosure.
- On mobile, Public collection is paired with the Achievements heading, while badge actions use balanced 44 px controls: Share and Certificate share an equal row and Feature badge spans the card width.
- The mobile Security card gives password management and Google unlink equal space in one row; a sole password action expands to the full card width.
- Preferences uses a native disclosure that starts collapsed, keeps its enabled count visible, and preserves unsaved switch selections when opened or closed.
- Strava connection changes use focused confirmation dialogs before OAuth navigation or the CSRF-protected disconnect request; no-JavaScript fallbacks retain the original link and form behavior.
- Avatar upload, password, Google unlink, Strava, badge feature/share, CSRF, and legacy fragment routes remain compatible.

## Responsive captures

The captures use a deterministic privacy-safe fixture rendered from the production EJS partial and profile stylesheet.

- [Desktop, 1440 px](assets/runner-profile-desktop.png)
- [Tablet, 768 px](assets/runner-profile-tablet.png)
- [Mobile, 390 px](assets/runner-profile-mobile.png)
- [Mobile, 320 px](assets/runner-profile-mobile-320.png)
- [Achievements fragment, 390 px](assets/runner-profile-badges-mobile.png)
- [Achievements fragment, 320 px](assets/runner-profile-badges-mobile-320.png)
- [Security fragment, 390 px](assets/runner-profile-security-mobile.png)
- [Security fragment, 320 px](assets/runner-profile-security-mobile-320.png)
- [Preferences open and collapsed, 390 px](assets/runner-profile-preferences-mobile.png)
- [Preferences open and collapsed, 320 px](assets/runner-profile-preferences-mobile-320.png)
- [Strava confirmations, 390 px](assets/runner-profile-strava-confirmations-mobile.png)

## Acceptance criteria

- The page has one `h1`, logical section headings, visible focus, and 44 px primary controls.
- Display name, avatar fallback, completion percentage, email, and Back to Dashboard appear in the compact header.
- Missing profile information produces exactly one recovery callout linked to the correct section.
- Identity, contact, location, and emergency information can be edited through native disclosures with ordinary POST forms.
- The emergency number summary reveals only its final four digits; editing retains the full stored value.
- Every existing profile fragment and mutation endpoint remains valid.
- Notification choices are unique and preserve current opt-outs.
- Achievements are compact initially while all badge management remains reachable.
- Achievement actions remain aligned, wrap safely, and have no page-level overflow at 390 px, 320 px, or 200% zoom.
- Security actions retain 44 px targets, equal columns when both are available, and a full-width single-action fallback.
- Preferences is collapsed on every server render, remains keyboard-operable without JavaScript, and does not discard edits when opened or closed.
- Strava confirmation dialogs trap focus, support Escape and outside-click cancellation, restore the initiating control, and prevent repeated disconnect confirmation.
- Password and unlink dialogs trap and restore focus, support Escape, and prevent repeated submission.
- Layouts at 1440, 768, 390, and 320 px have no page-level horizontal overflow and remain usable at 200% zoom and reduced motion.
