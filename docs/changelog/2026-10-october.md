# HelloRun Changelog — October 2026

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
