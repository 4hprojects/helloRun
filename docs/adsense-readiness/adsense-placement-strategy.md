# HelloRun AdSense Placement Strategy

## Summary
HelloRun supports manual Google AdSense placements controlled from `/admin/ads`, but manual units remain disabled throughout approval preparation.

Ads are allowed only on public content and discovery pages. Private account pages, admin pages, organizer pages, runner dashboards, registration flows, checkout, cart, order/payment pages, auth pages, error pages, and upload/payment-proof workflows must remain ad-free.

Publisher ID: `ca-pub-4537208011192461`

## Admin Controls
Admins can manage ads from `/admin/ads`:

- Enable or disable ads globally.
- Enable or disable AdSense script loading.
- Confirm the publisher ID.
- Enable or disable page groups.
- Enable or disable individual placements.
- Add AdSense slot IDs per placement.

Blank slot IDs suppress the related placement even when its toggles are enabled.
The runtime also requires `ADSENSE_MANUAL_PLACEMENTS_ENABLED=true`. Keep this variable unset or false until approval and a separate activation review; admin settings alone cannot activate a manual unit.

## Public Placement Map
- Home `/`
  - After core features.
  - Before final CTA.
- Events listing `/events`
  - After filters and results summary when results exist.
  - In-feed after every 6 event cards, capped at 2 per page.
- Event detail `/events/:slug`
  - After “How This Event Works”.
  - Desktop sidebar below event detail/support cards.
  - Disabled in organizer preview mode.
- Leaderboard discovery `/leaderboard`
  - After filters and results summary when cards exist.
  - In-feed after every 6 leaderboard cards, capped at 2 per page.
- Blog listing `/blog`, `/blog/category/:categorySlug`, `/blog/tag/:tagSlug`
  - After filters and results summary when posts exist.
  - In-feed after every 4 post cards, capped at 2 per page.
- Blog post `/blog/:slug`
  - After intro or cover image.
  - In article body at a paragraph boundary near the first third of the post.
  - Before related posts.
- Shop discovery `/shop` and `/events/:eventSlug/shop`
  - Optional placement after listing context when products exist.

## Compliance Defaults
- Use neutral labeling only: `Advertisement`.
- Do not style ads as navigation, cards, calls to action, download links, recommendations, or internal content.
- Do not place ads inside registration, checkout, cart, order, payment-proof, comments, report, admin, organizer, runner account, or auth workflows.
- `ads.txt` already contains the approved publisher declaration and should remain:
  `google.com, pub-4537208011192461, DIRECT, f08c47fec0942fa0`

## Implementation Notes
- Ad settings are stored as a singleton `AdSetting` document keyed by `ads.global`.
- `populateAdLocals` resolves the current public route to an ad page group and exposes safe render helpers to EJS.
- `partials/ad-unit.ejs` renders nothing unless global settings, page group, placement toggle, and slot ID all allow rendering.
- `populateAdLocals` additionally requires the explicit post-approval `ADSENSE_MANUAL_PLACEMENTS_ENABLED=true` environment gate before any unit can render.
- The AdSense bootstrap can load from shared head/layout templates on eligible enabled routes so Google’s certified consent message can operate even while every manual unit remains disabled.
- HelloRun’s preference cookie controls Functional and Analytics only. Google’s certified CMP and provider controls remain authoritative for Google advertising consent.
