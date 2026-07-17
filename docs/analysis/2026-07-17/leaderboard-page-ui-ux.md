# `/leaderboard` runner-results UI/UX audit

Date: 2026-07-17  
Surfaces: `/leaderboard`, `/events/:slug/leaderboard`  
Primary audience: casual and returning runners looking for an event result

## Runner point of view

### Finding an event

> I usually arrive with an event name in mind. I want to confirm that I found the right event, see whether official results exist, and open the standings without reading an explanation of the interface.

The redesigned discovery flow keeps search visible, moves count/sort/filter state directly above the cards, and reduces each card to the signals needed to choose confidently: leaderboard type, mode, distance, ranking rule, verified-result count, freshness, and one primary action.

### Finding my result

> Once I open an event, my first questions are “Was my result verified?” and “What place am I?” If it is still pending, I need to know that it is not an official rank yet.

The event page now places personal standing before distance navigation and public standings. Guest, verified, pending, rejected, and authenticated-without-result states have distinct language and actions. Search and filters no longer change the personal-standing resolver; only the selected distance does.

### Comparing the field

> After finding myself, I want to scan official results and nearby runners. Pending submissions should not look like tied or missing ranks.

Verified entries remain the primary, contiguous official table/card list. Public pending submissions are separated in a disclosed section and never receive a rank. The top three are emphasized within the normal list instead of adding a second podium that delays the standings.

## Severity-ranked findings

| Severity | Previous issue | Runner impact | Resolution |
| --- | --- | --- | --- |
| Critical | Filtered event groups were written to the shared Redis key. | The first visitor’s search, status, or mode could hide results for later visitors for the cache lifetime. | Cache only complete unfiltered groups and apply normalized request filters after retrieval. A pure isolation regression test verifies ranks and base data remain unchanged. |
| High | Verified and pending entries appeared in one list with rank dashes. | Pending submissions looked like incomplete official rankings. | Split official and pending presentation while retaining organizer-controlled pending visibility. |
| High | Authenticated runners without a result received guest-oriented login copy. | Signed-in runners were given an incorrect recovery path. | Resolve five explicit standing states and provide state-specific actions. |
| High | Discovery stopped at an arbitrary 200 events and exposed no pagination. | Large result sets could be incomplete and difficult to navigate. | Remove the cap, compute accurate counts, add stable server-rendered sorting, and paginate at 12 cards by default. |
| Medium | Discovery filters consumed a full dense row and results began late. | Mobile runners spent too long before reaching the first event. | Keep search visible; collapse advanced filters and open them only when active. |
| Medium | “Sort by” lacked a stable balanced control group. | The label appeared detached or misaligned at responsive widths. | Use a dedicated label/select/action grid with shared 44px control sizing and a stacked mobile state. |
| Medium | Event filters were always expanded. | Search and standings competed with secondary controls. | Keep runner/bib search visible and progressively disclose mode/status controls. |
| Medium | Distance carousel controls were smaller than the touch-target requirement. | Previous/next distance navigation was hard to operate. | Use 44px controls, keyboard focus, and reduced-motion scrolling. |
| Low | Cards repeated four boxed statistics and two equally weighted actions. | Event choice required unnecessary scanning. | Promote verified count and freshness, keep one primary standings CTA, and demote event details to a text link. |

## Responsive evidence

### Discovery

- [1440px discovery](assets/leaderboard-discovery-desktop.png)
- [768px discovery](assets/leaderboard-discovery-tablet.png)
- [390px discovery](assets/leaderboard-discovery-mobile.png)
- [320px discovery](assets/leaderboard-discovery-mobile-320.png)

### Event standings

- [1440px event standings](assets/leaderboard-event-desktop.png)
- [768px event standings](assets/leaderboard-event-tablet.png)
- [390px event standings](assets/leaderboard-event-mobile.png)
- [320px event standings](assets/leaderboard-event-mobile-320.png)

The verified layouts use an explicit 3/2/1 discovery grid. At 900px and below, the standings table becomes result cards; at 640px and below, forms and actions stack without horizontal page scrolling. The first discovery card is visible within the initial 320px capture after the compact search and controls.

## Rationale and behavior contract

- Search is the primary discovery control; type, distance, and mode are optional refinements.
- Sorting is not a filter. Removing or clearing filters retains the selected sort.
- `recommended` prefers query relevance, active/upcoming events, verified availability, recent activity, verified volume, event date, and stable ID. Explicit sorts retain the match constraint.
- Default sort and empty parameters are omitted from URLs. Canonicals remove discovery sort and event result filters to avoid duplicate variants.
- Distance is event-leaderboard navigation, not an active filter. Generated URLs use `distance`; legacy `category` remains accepted.
- Official ranks are assigned before request filtering. Searching a runner therefore preserves their actual event rank rather than renumbering the filtered subset.
- Personal standing ignores public-list search, mode, and status filters so it cannot disappear accidentally.
- Advertisements begin after useful leaderboard cards and cannot separate a results heading from its first card.

## Acceptance criteria

- [x] Discovery has compact title/support copy and visible event/organizer search.
- [x] Result count, aligned sorting, collapsed filters, removable chips, and explicit Apply actions precede the grid.
- [x] Discovery supports normalized `recommended`, `recent`, `most-results`, and `event-date` sorts with accurate pagination.
- [x] Legacy query parameters and explicit limits remain accepted.
- [x] Cards use a 3/2/1 grid and one primary “View standings” action.
- [x] Guest, verified, pending, rejected, and signed-in/no-result standing states are distinct.
- [x] Personal standing depends only on event and selected distance.
- [x] Pending submissions are separate, unranked, and organizer-controlled.
- [x] Desktop tables have captions; tablet/mobile use compact cards without horizontal scrolling.
- [x] Controls meet 44px targets, visible focus is provided, and carousel motion respects reduced-motion preferences.
- [x] Unfiltered groups—not visitor-specific results—are cached.
- [x] Templates compile and focused presentation/homepage tests pass.

## Verification notes

The local application rendered both redesigned surfaces at all four target widths. Focused unit coverage passes for URL normalization, canonical behavior, every discovery sort, standing states, cache isolation, hierarchy, responsive grids, touch targets, focus treatment, reduced motion, and EJS compilation. The existing integration fixtures mark their seeded events as `isTestData: true` while public leaderboard queries intentionally exclude test data; those pre-existing fixture/visibility failures remain separate from this redesign. Supabase shadow-sync DNS warnings were also environmental and did not affect local rendering.
