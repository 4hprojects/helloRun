# Phases 2 and 3: Monthly Event Generation and Content Composition

## Generator contract
Input: `{seriesKey: 'active-quest', year: 2026, month: 11, requestedBy}`. Outputs existing-or-new **draft** event ID, preview URL, template version and warnings. No publish side effects. Access: authorized admin only. Concurrent requests must not create duplicates.

## Deterministic schedule
All dates in `Asia/Manila`, converted into instants and stored with explicit local date/timezone:
- Month window `[first day 00:00, first day next month 00:00)`.
- Registration window `[first day minus 7 days 00:00, day 23 of target month 00:00)`.
- Submission cutoff is **start of day 15 of following month** (exclusive), capturing all of day 14.
- Review target day 17 next month; reward release target no earlier than day 18, contingent on review completion.
- Leap-year February, year rollover and DST-independent Philippines time must be tested.

## Generated values
`<Month> Active Quest <Year>`, slug `<month-lowercase>-active-quest-<year>`, free registration, event type virtual-accumulated, fixed categories, eligible activity settings, inherited policy snapshot, editable marketing block IDs, reward slots, organizer, publish state `draft`.

## Duplicate and edit behavior
When the edition exists, return it without overwriting manual changes. Duplicate slug collision with unrelated event = blocking error. Allow explicit regeneration of *unpublished* text via admin diff/confirmation only; never silently update finalized policy.

## Reusable content blocks
1. Summary and tagline.
2. How it works (register, choose category, complete, submit proof, track approval, earn rewards).
3. Rules generated from actual configured activity categories and minimum km.
4. Dates, registration, submission deadlines from date model.
5. Reward section generated from active, validated reward mappings.
6. Privacy/leaderboard text from current site behavior.
7. FAQ and next edition navigation.
All displayed values must be rendered from config or an explicitly versioned editorial override. Escape output in EJS, sanitize admin rich text.

## November 2026 fixture
Start Nov 1 00:00 PHT, exclusive end Dec 1 00:00; registration opens Oct 25 00:00, closes Nov 23 00:00; submissions close Dec 15 00:00; review target Dec 17, release target Dec 18 contingent on finalized reviews.

## Tests
Unit tests for each month, Feb 2028 leap year, Dec→Jan, invalid months, concurrent generation, existing-draft no overwrite, HTML escaping, mismatched display date prevention.
