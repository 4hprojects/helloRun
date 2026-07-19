# Cookie Policy UI/UX and Transparency Audit

Date: 19 July 2026
Page: `/cookie-policy` and shared cookie-preference controls

## Visitor point of view

A guest needs to know what is required before optional providers run. A returning runner needs drafts and sign-in to remain predictable. An organizer needs to understand whether local workspace recovery is active. Every visitor needs a choice that is reversible without losing access to public content.

The previous page was a long generic policy with no working preference center. It said optional choices could be managed “where available,” while configured Analytics and AdSense tags loaded directly from shared layouts. It also did not identify the real `hr.sid` session, HelloRun draft storage, or the difference between signup policy agreement and runtime browser choices.

## Severity-ranked findings

### Critical

1. Optional Analytics and Advertising were requested before an explicit visitor choice.
2. The public policy implied a platform preference tool that did not exist.
3. Functional local storage could retain entered form values without a visible category control.

### High

1. The page did not provide an implementation-level storage inventory or reliable durations.
2. Signup agreement and browser consent could be mistaken for the same action.
3. Declining advertising did not prevent ad scripts or empty placements.
4. Provider-controlled cookies and HelloRun-controlled storage were not clearly separated.

### Medium

1. Contents navigation depended on a legacy page treatment rather than the shared server-rendered policy resolver.
2. The reading column, heading hierarchy, and mobile policy navigation were inconsistent with the redesigned legal pages.
3. Clearing drafts, withdrawing Analytics, and managing Google advertising preferences lacked recovery guidance.

## Design rationale

- Essential storage is always available because sessions and protected forms depend on it.
- Functional, Analytics, and Advertising are independent, globally opt-in categories.
- The non-blocking banner keeps public content usable while presenting equal reject, customize, and accept paths.
- The policy begins with categories and the current storage matrix before the complete legal text.
- Browser-specific persistence matches how cookies and local storage actually behave and avoids changing the user schema.
- Google Consent Mode defaults are established before provider tags, while Google-certified CMP configuration remains a separate deployment responsibility.
- The shared footer keeps preferences discoverable after the first choice.

## Responsive verification targets

Capture the public policy and open preference dialog after implementation at:

- `1440px`: compact hero, four-category row, full inventory table, sticky contents rail.
- `768px`: two-column category layout, readable policy column, mobile contents available.
- `390px`: non-wrapping banner actions, storage rows transformed into cards, balanced dialog actions.
- `320px`: single-column controls, 44px targets, shallow spacing, no horizontal overflow.

Store approved captures beside this audit as `cookie-policy-1440.png`, `cookie-policy-768.png`, `cookie-policy-390.png`, and `cookie-policy-320.png` when the production-like Google CMP configuration is available. The repository implementation tests cover the corresponding structural and responsive rules without treating local screenshots as legal or CMP validation.

## Acceptance criteria

- No Analytics or AdSense network tag is rendered before the matching opt-in.
- Essential, Functional, Analytics, and Advertising are explained in plain language.
- A visitor can reject optional categories, accept all, customize, and later withdraw choices.
- Preference controls work through an ordinary server form when JavaScript is unavailable.
- Functional withdrawal clears only known HelloRun-owned browser-storage keys.
- Declined advertising produces neither ad code nor empty ad placements.
- The complete policy has one `h1`, server-rendered anchors, a `68–72ch` reading measure, print support, and stable mobile navigation.
- Signup policy consent remains unchanged and separate from browser preferences.
- Future policy publication creates one deduplicated in-app notice without forced re-acceptance.
- Keyboard use, focus restoration, reduced motion, 200% zoom, and 320px layouts remain usable without horizontal scrolling.

## External validation boundary

The HelloRun preference center is not represented as a Google-certified CMP. Before serving AdSense in the EEA, UK, or Switzerland, the owner must configure and validate a certified CMP through AdSense Privacy & Messaging and confirm behavior with Google Tag Assistant.
