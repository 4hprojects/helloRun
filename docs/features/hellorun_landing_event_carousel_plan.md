# Landing Page Event Carousel Plan

## Summary

Add a responsive "Featured Events" carousel to the public homepage to promote selected and upcoming events without turning the landing page into a full event directory.

Use a hybrid event source:

- First show admin-curated homepage-featured events.
- If fewer than the carousel limit are curated, fill remaining slots with public upcoming/open events.
- Hide the section entirely when no promotable events exist.

Place the carousel on `src/views/pages/home.ejs` after the "What helloRun does" section and before "Why helloRun," so users understand the platform before seeing event CTAs.

## Key Changes

- Add homepage promotion fields to `Event`:
  - `homeFeatured`: boolean, default `false`
  - `homeFeaturedRank`: number, nullable, lower values appear first
  - `homeFeaturedUntil`: date, nullable, optional expiration for featured placement
- Add admin-only controls on event management/edit screens so admins can mark an event as homepage featured, set rank, and optionally set expiration.
- Add admin-only carousel settings at `/admin/homepage-carousel` for section visibility, maximum loaded events, and loop behavior.
- Add a homepage event loader, preferably in `src/services/public-event-list.service.js`, that returns up to 8 cards:
  - published, non-deleted, non-personal-record events only
  - respects `publicListingAvailableAt`
  - excludes past events where `eventEndAt < now`
  - featured events first, ordered by rank then start date
  - fallback events ordered by registration/opening urgency and event start date
  - deduplicates featured and fallback results
- Reuse existing event card concepts:
  - banner image with `/images/helloRun-icon.webp` fallback
  - event title, status chip, mode, date, location, distance summary, short description
  - CTA to `/events/:slug`
  - secondary "View all events" link to `/events`
- Export or centralize the existing event display-state helper so homepage cards use the same status labels as `/events`.

## Admin Settings UX Refinement

Completed May 28, 2026:

- `/admin/homepage-carousel` now presents the carousel settings as a guided admin workflow with:
  - a status hero summarizing visibility, event limit, desktop pages, and navigation mode
  - a compact homepage carousel preview mock
  - responsive context cards for mobile/tablet behavior and last saved time
  - switch-style controls for section visibility and looping navigation
  - an event-capacity panel with a visual range indicator
  - a guidance note explaining that carousel ordering is managed from event admin controls
- Action behavior was refined:
  - `Preview Homepage` opens in a new tab
  - `Manage Events` opens a confirmation modal before leaving the page
  - `Save Settings` opens a confirmation modal before applying public homepage changes

## Carousel UX

- Section heading:
  - kicker: `Featured events`
  - title: `Find your next run`
  - summary: short copy focused on discovering open and upcoming events
- Desktop:
  - show 3 cards per view
  - left/right arrow buttons
  - arrow navigation loops from the last page back to the first, and from the first page back to the last
  - pagination dots
  - no forced autoplay
- Tablet:
  - show 2 cards per view
  - keep arrows and dots
  - support touch swipe through native horizontal scrolling
- Mobile:
  - show 1 card per view
  - full-width card with stable image aspect ratio
  - dots remain visible
  - arrows may remain but must be compact and not overlap content
- Accessibility:
  - wrap carousel in a labelled region
  - use real buttons for previous/next
  - expose current slide group through dots with `aria-current`
  - support keyboard operation
  - respect `prefers-reduced-motion`
- Implementation approach:
  - CSS scroll snap for layout and swipe behavior
  - lightweight JS in `src/public/js/main.js` for previous/next buttons and active dot updates
  - no new frontend dependency

## Responsive Styling

- Add carousel styles to `src/public/css/helloRun.css`.
- Use CSS variables already defined under `.home`.
- Card sizing:
  - mobile: `flex-basis: 100%`
  - tablet, `min-width: 768px`: `flex-basis: calc(50% - gap)`
  - desktop, `min-width: 1024px`: `flex-basis: calc(33.333% - gap)`
- Keep image ratio stable, preferably `aspect-ratio: 16 / 9`.
- Avoid nested cards and oversized rounded containers; match the current landing page's clean card style.
- Ensure text wraps cleanly and card heights remain consistent across breakpoints.

## Tests And Verification

- Add or extend service tests for homepage promoted event selection:
  - featured events appear first
  - fallback events fill empty slots
  - future `publicListingAvailableAt` events are hidden
  - expired `homeFeaturedUntil` events are not prioritized
  - past ended events are excluded
- Add route/render coverage for `/`:
  - homepage renders featured event cards when eligible events exist
  - homepage hides the carousel when no eligible events exist
  - card links point to `/events/:slug`
  - image fallback is present
- Run targeted checks:
  - `node --test tests/public-search-filters.test.js`
  - `node --test tests/static-pages.test.js`
  - any new homepage carousel test file
- Manually verify at mobile, tablet, and desktop widths:
  - 1/2/3 cards per view
  - swipe works on mobile/tablet
  - arrows and dots update correctly
  - no text clipping or horizontal page overflow

## Assumptions

- The markdown plan should be saved under `docs/features`.
- The implementation should promote real published events, not hardcoded marketing cards.
- Homepage curation is admin-controlled only; organizers do not directly control homepage placement.
- Carousel autoplay is intentionally excluded for v1 to keep the landing page calm and accessible.
