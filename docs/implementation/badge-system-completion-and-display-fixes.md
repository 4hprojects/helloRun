# Badge System — Completion Badge, Placeholder & Display Fixes

**Created:** June 22, 2026
**Status:** ✅ Implemented — June 22, 2026

---

## Overview

Deep dive into the full badge lifecycle (creation → awarding → display) revealed one confirmed bug and several systemic gaps in the placeholder and organiser experience. All five improvement steps implemented.

---

## Badge System Architecture (How It Works)

### Creation Flow
1. Event published with `digitalBadgeEnabled: true` → `publishEvent()` calls `generateDefaultEventBadgesInBackground()`
2. Creates `badge_definitions` rows in Postgres (per type: participant, finisher, distance_finisher, mode_finisher, challenge_progress/finisher, rank badges)
3. Links to event via `event_badges` table — this is where organiser image overrides live (`badge_image_url`)
4. Creates `BadgeContent` document in MongoDB (display cache)
5. **Image is NULL by default** — organiser must set it manually

### Award Flow
| Trigger | Function | Badges awarded |
|---------|----------|---------------|
| Registration confirmed + paid | `evaluateRegistrationAchievementsInBackground()` | `participant` |
| Submission approved | `evaluateSubmissionAchievementsInBackground()` | `finisher`, `distance_finisher`, `mode_finisher` |
| Accumulated activity approved | `refreshGlobalDistanceMilestoneProgressInBackground()` | `challenge_progress`, `challenge_finisher`, global distance |
| Rankings published | `evaluatePublishedRankingAchievements()` | rank badges |

All awards are idempotent (`ON CONFLICT DO NOTHING`) and revoked badges are never re-awarded (`hasRevokedBadge()` check).

### Image Resolution (before this fix)
- Only source: `event_badges.badge_image_url` (per-event, set by organiser as URL)
- No definition-level default
- Fallback: generic Lucide `award` icon on all surfaces

---

## What Was Fixed

### Step 1 — Profile page imageUrl bug (Critical fix)

`src/views/runner/profile.ejs` lines 219 and 231 always showed `<i data-lucide="award">` and never checked `badge.imageUrl` even though the data was available.

**Fixed:** Added conditional image-first rendering matching the pattern in `dashboard-badges.ejs`. Both the featured badge and badge grid now show the image when set, or a type-specific icon otherwise.

---

### Step 2 — Type-specific badge icons (consistency across all surfaces)

Added `getBadgeIcon(badgeType)` mapping in all badge display surfaces:

| Badge Type | Icon |
|-----------|------|
| `finisher` | `trophy` |
| `participant` | `user-check` |
| `distance_finisher` | `medal` |
| `mode_finisher` | `zap` |
| `challenge_finisher` | `award` |
| `challenge_progress` | `trending-up` |
| `category_winner` | `crown` |
| `top_rank` | `star` |
| `distance_winner` | `flag` |
| `mode_winner` | `shield-check` |

Applied to: `profile.ejs`, `dashboard-badges.ejs`, `runner-badge-collection.ejs`, `badge-verification.ejs`, `event-badges.ejs`

---

### Step 3 — CSS type-specific placeholder system

New `src/public/css/badge-display.css` (loaded globally via `head.ejs`):
- `.badge-placeholder[data-badge-type="finisher"]` → amber
- `.badge-placeholder[data-badge-type="participant"]` → blue
- `.badge-placeholder[data-badge-type="distance_finisher"]` → green
- `.badge-placeholder[data-badge-type="mode_finisher"]` → purple
- `.badge-placeholder[data-badge-type="challenge_finisher"]` → red
- `.badge-placeholder[data-badge-type="challenge_progress"]` → orange
- `.badge-placeholder[data-badge-type="category_winner"]` → pink
- `.badge-placeholder[data-badge-type="top_rank"]` → yellow
- `.badge-placeholder[data-badge-type="distance_winner"]` → cyan
- `.badge-placeholder[data-badge-type="mode_winner"]` → indigo

Each badge placeholder renders a colored circular background so badges are visually distinct without a custom image.

---

### Step 4 — Definition-level image URL (Migration 019)

**Migration:** `src/db/migrations/019_badge_definition_image_url.sql`
- Adds `image_url TEXT` column to `badge_definitions`
- Platform can set a default image per badge type that applies across all events

**Service updates:**
- `event-badge.service.js` — SELECT queries now include `bd.image_url AS definition_image_url`
- `formatEventBadgeRow()` — resolves `imageUrl: row.badge_image_url || row.definition_image_url || ''`
- `achievement.service.js` — both `getRunnerEarnedBadges()` queries include `bd.image_url AS definition_image_url`; resolution: event-level image overrides definition-level

**Priority:** `event_badges.badge_image_url` > `badge_definitions.image_url` > placeholder CSS

---

### Step 5 — Badge image upload in organiser manager

Organisers can now upload badge images directly to R2 instead of only pasting a URL.

**New upload middleware:** `uploadBadgeImage` in `src/services/upload.service.js` — uses `brandingUpload.single('badgeImageFile')`, accepts JPEG/PNG/WebP up to 5MB.

**New route:** `POST /organizer/events/:id/badges/:badgeId/image` — uploads to R2 category `badge-images/`, updates `event_badges.badge_image_url`, returns `{ success, imageUrl }` JSON.

**UI:** Upload button (file input) added next to the URL input in `event-badges.ejs`. On file select, JS sends multipart POST and populates the URL input with the returned CDN URL.

---

### Step 6 — Earned count in organiser badge manager

Badge manager GET route now queries `user_badges` grouped by `badge_definition_id` for the event's `event_core_id`. Result passed as `earnedCountByBadgeId` map to the view.

Each badge card shows: `"X runners earned"` (green) or `"Not yet earned"` (muted).

---

## Files Changed

| File | Change |
|------|--------|
| `src/views/runner/profile.ejs` | Fixed imageUrl bug; added getBadgeIcon helper; type-specific icons |
| `src/views/runner/partials/dashboard-badges.ejs` | Type-specific icons; badge-placeholder class |
| `src/views/pages/runner-badge-collection.ejs` | getBadgeIcon helper; badge-placeholder class |
| `src/views/pages/badge-verification.ejs` | getBadgeIcon helper; badge-placeholder class |
| `src/views/organizer/event-badges.ejs` | getBadgeIcon; upload button; earned count display; upload JS |
| `src/public/css/badge-display.css` | **New** — type-specific placeholder color system |
| `src/views/layouts/head.ejs` | Load badge-display.css globally |
| `src/db/migrations/019_badge_definition_image_url.sql` | **New** — image_url column on badge_definitions |
| `src/services/event-badge.service.js` | Include definition_image_url in SELECT; fallback in formatEventBadgeRow |
| `src/services/achievement.service.js` | Include definition_image_url in both badge queries; fallback in imageUrl resolution |
| `src/services/upload.service.js` | Added uploadBadgeImage middleware |
| `src/routes/organizer.routes.js` | Badge image upload route; earned count query in badge manager GET |
| `src/public/css/event-manage.css` | badge-image-url-row, badge-upload-btn, badge-earned-count CSS |

---

## Verification Checklist

- [x] Auth tests: 44/44 passing after all changes
- [x] Migration 019 applied: `badge_definitions.image_url` column exists
- [x] Runner profile: badge with imageUrl → shows image; no imageUrl → type-specific colored icon
- [x] Runner profile featured badge: same image-first logic
- [x] Dashboard, public collection, verification page: consistent type-specific icons
- [x] All badge types visually distinct (different colors in placeholder state)
- [x] `badge_definitions.image_url` serves as platform default; overridden by `event_badges.badge_image_url`
- [x] Organiser can upload badge image in badge manager (R2 upload, URL auto-populated)
- [x] Organiser sees "X runners earned" / "Not yet earned" per badge
