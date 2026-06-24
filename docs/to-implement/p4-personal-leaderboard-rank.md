# P4 — Personal Leaderboard Rank Display

**Priority:** P4 (Quick Win)  
**Estimated effort:** ~2 hours  
**Status:** Implemented — June 24, 2026  
**Commit:** see `docs/STATUS.md`

---

## Problem

Runners who submit results to an event can view the leaderboard, but there is no clear "you are here" context indicator. The existing My Standing card displays the rank number (e.g., `#42`) but not the total field size, so a runner cannot gauge competitiveness without manually counting all rows.

---

## Solution

Add a rank-in-context line directly inside the My Standing card:

> **Ranked #42 of 156 verified runners**

No new queries, routes, services, or controllers are required — all necessary data is already returned by the existing `getEventLeaderboard()` and `getMyStanding()` calls and passed to the view.

---

## Data Available (no backend changes needed)

| Variable in view | Source | Value |
|-----------------|--------|-------|
| `standing.rank` | `getMyStanding()` return value | Runner's position in the active distance group |
| `leaderboard.stats.verifiedEntries` | `getEventLeaderboard()` → `stats` | Count of verified results in the active distance group |

Both are already present in every server-rendered leaderboard page response via `getEventLeaderboardPage` in `page.controller.js`.

---

## Scope

**Changed:** `src/views/pages/event-leaderboard.ejs` — ~4 lines added inside `.leaderboard-standing-card`

**Unchanged:**
- `src/services/leaderboard.service.js`
- `src/controllers/page.controller.js`
- All routes

---

## Display Rules

- Show only when `standing.rank` is a positive integer AND `leaderboard.stats.verifiedEntries > 0`
- Do not show for pending, rejected, or unsubmitted states
- Works for both single-activity and accumulated-distance events

---

## Acceptance Criteria

- [ ] Logged-in runner with a verified submission sees "Ranked **#N** of **M** verified runners" in the My Standing card
- [ ] Runner with a pending submission does not see the rank-context line
- [ ] Logged-out visitor does not see the My Standing card (unchanged behavior)
- [ ] Accumulated distance event leaderboard renders rank context when available
- [ ] Line is hidden if `verifiedEntries` is 0
