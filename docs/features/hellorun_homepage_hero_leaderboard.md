# HelloRun Homepage Hero Leaderboard

## Purpose

The homepage hero pairs the acquisition message with a compact, real leaderboard from an eligible public event. It provides current community proof without presenting a platform-wide rank or exposing private runner information.

## Selection and ranking

- Consider only publicly listed events whose leaderboard is enabled and whose leaderboard visibility is explicitly `public`.
- Rank candidate events by verified-result count, using the existing leaderboard discovery ordering for deterministic ties.
- Select the candidate's distance/category group with the most verified entries; preserve the existing group order when counts tie.
- Show at most the first three official entries from that group.
- Preserve the event leaderboard's ranking rules: fastest verified time for race results and highest verified accumulated distance for accumulated challenges.
- Refresh through the existing event-leaderboard cache, which expires after 60 seconds.

## Privacy and integrity

- Use the event's configured public name-display mode.
- Include approved entries only. Exclude pending, rejected, suspicious, and personal-record submissions.
- Never include registered-only or private-until-published leaderboards.
- Keep the event title and selected distance/category visible so ranks cannot be mistaken for platform-wide standings.

## Display contract

The homepage view model contains the event title and leaderboard URL, leaderboard type, selected category, ranking explanation, last-updated label, and up to three entries. Race-result entries show rank, public runner name, elapsed time, and pace. Accumulated-challenge entries show rank, public runner name, verified total distance, and activity count.

The component links to the complete event leaderboard. It does not poll or animate rank changes.

## Fallback and responsive behavior

If no eligible leaderboard has verified entries, or leaderboard loading fails, the homepage renders a centered card-free hero and remains successful. On desktop, a populated leaderboard forms the right column of the hero. On tablet and mobile it stacks below the acquisition copy, preserves readable row spacing, and never requires horizontal scrolling.

## Acceptance criteria

- Every displayed rank is a current official rank within the named event and category.
- Only privacy-safe formatted names and verified results appear.
- The top three remain readable with long event and runner names.
- The homepage remains available when leaderboard data is missing or fails to load.
