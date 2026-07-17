# 2026K HelloRun Challenge progress leaderboard audit

Date: 2026-07-17  
Route: `/events/2026k-hellorun-challenge-4/leaderboard`  
Reusable surface: all accumulated-distance event leaderboards

## Runner point of view

> I joined a year-long 2,026 km challenge. Rank matters, but I also need to know how far I have completed, what remains, how many activities were verified, and whether pending activities are included.

The prior shared race-result presentation explained rank correctly but rendered accumulated runners with empty time and pace values. It also showed controls that could not change this event: one distance, one participation mode, and no public pending results. The redesigned view gives official rank and challenge progress equal weight while keeping verified and pending distance strictly separate.

## Severity-ranked findings

| Severity | Previous issue | Runner impact | Resolution |
| --- | --- | --- | --- |
| High | Accumulated standings used race columns for time and pace. | The most useful challenge data was replaced by empty dashes. | Use accumulated-specific distance, progress, remaining, activity-count, and latest-verification fields. |
| High | Progress used only the event-level target. | Multi-category challenges could calculate a runner against the wrong goal. | Resolve target from category pricing snapshot, selected distance, then event fallback. |
| High | Pending accumulated activity was treated like a single race result. | Personal progress and pending activity count could be misleading. | Aggregate the authenticated runner’s pending distance and activity count separately from verified rank. |
| Medium | One 2026K distance still rendered distance navigation. | A non-choice consumed space before standings. | Hide navigation for one category and retain it for multi-category challenges. |
| Medium | Virtual-only mode and disabled pending status still rendered filters. | Runners saw controls that could not produce a useful alternative view. | Derive filter visibility from event capabilities; retain search and removable query chips. |
| Medium | Completion percentage was rounded and visually capped as the same value. | Over-target achievements could be understated or lose precision. | Keep a precise, unclamped numeric percentage and clamp only progress-bar width. |
| Low | The header described the selected category but not the year-long goal. | Challenge context required returning to the event page. | Surface the 2,026 km goal, Jan–Dec window, verified field size, and freshness compactly. |

## Responsive evidence

- [1440px](assets/2026k-leaderboard-desktop.png)
- [768px](assets/2026k-leaderboard-tablet.png)
- [390px](assets/2026k-leaderboard-mobile.png)
- [320px](assets/2026k-leaderboard-mobile-320.png)

Desktop uses a compact seven-column progress table. Tablet and mobile switch to ranked cards with the same information and no horizontal page scrolling. Mobile search remains touch-sized, redundant controls are absent, and progress bars expose native progress semantics to assistive technology.

## Data and presentation contract

- Official rank is based only on verified accumulated distance and is assigned before runner search filtering.
- Each entry exposes its resolved target, total verified distance, precise progress percentage, bar percentage, remaining distance, completion state, verified activity count, and latest verification.
- A visual bar never exceeds 100%; an over-target runner retains their true percentage and total and receives “Goal completed.”
- Personal pending distance and activity count never increase official progress or rank.
- Single-category accumulated pages hide category repetition. Multi-category pages retain category navigation and category context.
- Race-result leaderboards retain their organizer-configured time, pace, distance, status, and category presentation.
- Public responses remain aggregate-only and do not expose proof, OCR, contact details, suspicious flags, or internal review metadata.

## Acceptance criteria

- [x] Header shows 2,026 km goal, event window, verified runner count, ranking rule, and latest update.
- [x] Single distance, virtual-only mode, and disabled public-pending status do not render redundant controls.
- [x] Official cards and table show rank, verified distance, goal progress, remaining distance, activities, and latest verification.
- [x] Time and pace remain isolated to race-result leaderboards.
- [x] Progress calculations support category, selected-distance, and event fallback targets.
- [x] Fractional, complete, over-target, and missing-target states are deterministic.
- [x] Authenticated standing supports verified, pending-only, rejected, no-activity, and verified-plus-pending states.
- [x] Search preserves authoritative event rank.
- [x] Responsive layouts work at 1440px, 768px, 390px, and 320px with visible focus and reduced-motion support.
- [x] Existing routes, query aliases, canonical behavior, organizer privacy settings, and public-safe APIs remain compatible.

## Verification notes

The live local 2026K dataset rendered four verified runners against the correct 2,026 km target. The leading 390.65 km total renders as 19.3% with 1,635.35 km remaining and 25 verified activities. Capability resolution correctly removed the distance carousel and advanced filter disclosure for this single-category, virtual-only event with public pending results disabled.
