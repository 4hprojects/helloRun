# HelloRun Changelog — October 2026

## October 3 — Admin promotion live send status

- `/admin/promote` has a **Live Send Status** card under Recipient Preview. It shows every
  campaign that is currently sending (admin, organiser and automatic-publish), with a progress
  bar, sent/failed/skipped/queued counters and a per-recipient list
  (pending → sending → sent/failed/skipped/suppressed/queued). It polls
  `GET /admin/promote/live` every 3 seconds while a campaign is sending, pauses while the tab is
  hidden, and updates the Recent Campaigns row when a campaign finishes. Recipient emails are
  shown to full administrators only; the endpoint requires `requireFullAdmin`.
- `dispatchEventPromotionCampaign` now records progress after each recipient through a
  best-effort tracker. `EventPromotion` gains `deliveries` (capped at 1,000; counters stay
  exact beyond the cap), `deliveryListTruncated`, `processedCount`, `lastProgressAt` and
  `completedAt`, plus a `{ status, createdAt }` index. A campaign with no progress for two
  minutes is shown as stalled.
- After a send, the redirect includes the new `campaign` id so the page tracks it immediately.
- DB-free coverage: `tests/admin-promote-live-status.unit.test.js`. No live-database
  verification was run.

## October 3 — October Active Run 2026 published

### October Active Run 2026

- **Live at `/events/october-active-run-2026`** (reference `OAR-260210`, event
  `6abfdb46e6176464b7c200d2`). Free virtual accumulated-distance challenge with six
  categories: 25K, 50K, 75K, 100K, 150K and 200K.
- Activity window October 1–31, 2026; registration closes October 22, 2026 at
  11:59 PM Asia/Manila; final proof deadline November 14, 2026. Activities from
  October 1 onward count even though the event was published on October 3.
- Event content lives in `src/content/events/october-active-run-2026.js`;
  `npm run event:create-october-active-run-2026` is dry-run unless `--apply` is passed.
  The apply run uploaded the banner, poster and badge to R2, published the certificate
  template, and created 19 finisher badges (none deferred). Automatic email promotion
  is disabled.
- The banner and poster published on October 3 are text edits of the September Active
  Run artwork.

### October Active Run artwork replacement

- New illustrated banner (1920×1080), poster (1080×1620) and transparent badge
  (1254×1254) replace the September-derived artwork in
  `assets/events/october-active-run-2026/`: rice terraces at sunset with palms, a runner
  and a walker on a winding road, in HelloRun green, orange and gold. The badge drops the
  maple-leaf motif.
- `npm run event:update-october-active-run-2026-artwork` uploads the committed artwork
  to R2, updates the event's banner, poster, logo and badge URLs and the active
  certificate template's logo and artwork, and re-synchronises the badge image on the
  event's PostgreSQL badges. It is dry-run unless `--apply` is passed and keeps the
  previous R2 objects so already-shared links still resolve.
