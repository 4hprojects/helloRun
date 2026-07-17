# Circular Event Badges from Event Logos

## Document Role

- **Purpose:** Implementation source of truth for generating reusable circular badge
  artwork from organizer-uploaded event logos.
- **Status:** Implemented — July 16, 2026. Focused unit coverage passes; live R2 and
  Postgres integration verification remains environment-dependent.
- **Priority model:** The P0–P3 labels in this document are local to this feature and
  do not change the project-wide roadmap.
- **Required delivery:** P0, P1, and P2. P3 is an optional follow-up.

---

## Problem Statement

Organizers already upload an event logo, but badge artwork is managed separately. The
current default badge generator copies the normal event logo URL into
`event_badges.badge_image_url`; it does not create a badge-sized or circular asset.
Organizers must otherwise upload or paste artwork for individual badges in Badge
Manager.

HelloRun should derive one optimized circular image from an uploaded event logo, store
it with the event, and use it consistently for every badge belonging to that event.

## Confirmed Product Decisions

1. The generated artwork applies to **all event badges**, not only completion badges.
2. Output is a **512 x 512 WebP** produced with a center crop.
3. Pixels outside the circular boundary are transparent; circular presentation must
   not depend only on CSS.
4. Replacing the event logo regenerates the asset and overwrites the image URL for
   **every existing event badge**, including artwork customized in Badge Manager.
5. Removing the event logo clears the event's generated badge asset and every
   event-level badge image URL.
6. Automatic processing is limited to files uploaded through HelloRun. A URL-only logo
   continues to use the original URL as a compatibility fallback.

---

## Current State

### Event logo upload

- Event creation and editing accept `logoFile` through the shared branding upload
  middleware in `src/services/upload.service.js`.
- `uploadEventBrandingToR2()` normalizes uploaded images to WebP and stores the normal
  logo under the event-branding R2 path.
- The resulting public URL is stored as `Event.logoUrl`.
- Create/edit routes already track newly uploaded keys for rollback and delete replaced
  R2 objects after a successful save.

### Badge image resolution

- `generateDefaultEventBadges()` in `src/services/event-badge.service.js` currently
  inserts the trimmed `event.logoUrl` into `event_badges.badge_image_url`.
- Organizer-specific artwork lives in `event_badges.badge_image_url` and takes
  precedence over `badge_definitions.image_url`.
- Badge Manager can upload a separate image or save an external URL for each badge.
- Runner, organizer, and public badge surfaces already consume the resolved badge image
  URL; they do not need a new response field.

### Lifecycle gap

`generateDefaultEventBadges()` only inserts missing badge links. Its conflict path does
not replace existing image URLs, so an event-logo edit does not currently propagate to
existing badges. The implementation needs an explicit event-wide synchronization path.

---

## Implementation Tracker

| Priority | Phase | Deliverable | Status |
|----------|-------|-------------|--------|
| **P0** | Asset generation and safe storage | Generate, persist, roll back, and retire circular badge assets safely | **Done** |
| **P1** | Badge synchronization | Apply the generated asset to all new and existing event badges | **Done** |
| **P2** | Organizer experience | Preview the asset and communicate destructive overwrite behavior | **Done** |
| **P3** | Optional enhancements | Crop controls, non-destructive overrides, and legacy backfill | Deferred |

## P0 — Asset Generation and Safe Storage

### Image pipeline

- When `logoFile` is present, generate a second asset from the original upload buffer.
- Use Sharp auto-rotation before transformation.
- Resize to exactly 512 x 512 using `fit: 'cover'` and centered positioning.
- Apply a circular alpha mask so all four corners are transparent.
- Encode the result as WebP using the upload service's established quality setting.
- Store it in a dedicated R2 category such as `event-branding/badge` with an event-slug
  label distinct from the normal logo.
- Return it from `uploadEventBrandingToR2()` as a separate result, for example
  `badgeImage: { key, url }`, without changing the existing `logo` result.

### Event persistence

- Add optional `badgeImageUrl` to the Event schema and include it in create/edit form
  persistence where branding fields are applied.
- Do not expose a user-editable badge URL field in the event form. This value is managed
  by the upload pipeline.
- A newly uploaded logo sets both `logoUrl` and `badgeImageUrl` before the event is
  saved.

### Storage safety

- Add the generated badge key to the same rollback collection as other branding
  uploads. Validation or save failures must delete both newly uploaded logo assets.
- During edit, retain the previous normal logo and badge URLs until the event save
  succeeds.
- After a successful replacement, delete the prior R2 logo and prior generated badge
  object when their keys can be safely extracted from HelloRun's public R2 URL.
- Never attempt to delete external URLs or an object that is still referenced by the
  saved event.
- If circular-image generation or upload fails, fail the branding operation rather than
  saving a new logo with stale badge artwork.

## P1 — Badge Synchronization

### New badges

- `generateDefaultEventBadges()` resolves its initial image as
  `event.badgeImageUrl || event.logoUrl || null`.
- All automatically created badge types receive the same resolved event artwork.
- Legacy and URL-only events therefore retain the existing normal-logo fallback.

### Existing badges

- Add an event-badge service operation that updates
  `event_badges.badge_image_url` for every row matching the Mongo event ID.
- Invoke it after a successful event save whenever the uploaded logo is replaced or the
  logo is explicitly removed.
- Replacement sets every row to the new `badgeImageUrl`, intentionally overwriting
  Badge Manager customization.
- Removal sets every event-level image URL to `NULL`, allowing the existing
  definition-level image and CSS placeholder fallback chain to take effect.
- Run synchronization before deleting the old R2 asset so badge rows do not point to a
  deleted object while the update is pending.

### Consistency and failure behavior

- MongoDB remains the source of the event's generated badge URL; Postgres remains the
  source of per-event badge links.
- A Postgres synchronization failure must be logged with the event ID and target URL.
  It must not roll back an already committed Mongo event edit.
- Keep the previous R2 badge object when synchronization fails, avoiding broken badge
  images. Delete it only after synchronization succeeds.
- Re-running synchronization with the same URL must be safe and idempotent.
- Events without generated badge rows may still save normally; later badge generation
  uses the stored `badgeImageUrl`.

## P2 — Organizer Experience

- Show a circular badge preview beside the event-logo controls on both create and edit
  pages. Before upload, the browser preview may use a circular crop for guidance; after
  save, render `badgeImageUrl` as the authoritative preview.
- Add concise helper text explaining that HelloRun generates badge artwork from the
  center of the uploaded logo.
- On edit, warn that replacing or removing the event logo updates every event badge and
  overwrites custom Badge Manager artwork.
- Keep Badge Manager's per-badge image upload and URL controls available. Its artwork
  remains valid until the next event-logo replacement or removal.
- Confirm all runner, organizer, public event, and verification surfaces continue using
  the existing resolved `imageUrl` contract.

## P3 — Optional Follow-up

The following work is deliberately outside the initial delivery:

- Organizer-selectable crop position or interactive crop controls.
- A per-badge "preserve custom artwork" flag or non-destructive synchronization mode.
- Different derived artwork by badge type.
- A bulk migration that downloads existing logos and backfills generated assets for
  legacy events.
- Processing arbitrary externally hosted logo URLs.

These items require separate product and security decisions and must not delay P0–P2.

---

## Acceptance Criteria

- Uploading a JPEG, PNG, or WebP event logo stores both the normal event logo and a
  valid 512 x 512 circular WebP badge asset.
- The generated image uses a centered cover crop and has transparent corner pixels.
- A created event persists `badgeImageUrl`; all of its generated event badges use that
  URL.
- Replacing an event logo changes `badgeImageUrl`, updates every existing event badge,
  and retires the superseded HelloRun-hosted assets only after persistence and badge
  synchronization succeed.
- Removing an event logo clears `logoUrl`, `badgeImageUrl`, and every corresponding
  `event_badges.badge_image_url` value.
- A Badge Manager customization is overwritten on the next event-logo replacement, as
  stated in the UI.
- URL-only and legacy events continue to render the normal event logo or the existing
  definition/placeholder fallback without errors.
- Validation, Mongo save, R2 upload, and Postgres synchronization failures follow the
  cleanup and preservation rules in this document.

## Test Matrix

### Image processing and uploads

- Landscape, portrait, and square inputs produce exactly 512 x 512 output.
- JPEG, PNG, and WebP inputs produce WebP output after orientation correction.
- Center-crop behavior is verified with an asymmetric fixture.
- Alpha-mask tests confirm transparent corner pixels and an opaque center pixel.
- Upload-service tests assert separate logo and badge keys, URLs, categories, and
  rollback cleanup.
- A badge transformation/upload failure leaves no newly uploaded branding objects.

### Event creation and editing

- Creation with a file persists both URLs and assigns the badge asset to all generated
  badge types.
- Creation with a URL only leaves `badgeImageUrl` empty and preserves normal-logo
  fallback behavior.
- Replacing a logo updates all event badge rows, including a row previously customized
  through Badge Manager.
- Removing a logo clears generated and per-event badge URLs.
- A failed validation or event save removes new assets and retains previous saved
  references.
- A failed Postgres synchronization retains the old badge object and records a useful
  error without reversing the Mongo event edit.

### Rendering and regression coverage

- Create and edit views show the preview and overwrite warning in the appropriate
  states.
- Badge Manager still supports direct per-badge uploads and displays the synchronized
  URL after an event-logo update.
- Runner profile, dashboard, badge collection, verification, and public event badge
  surfaces render the generated image through the existing `imageUrl` interface.
- Events with no logo continue to render definition-level artwork or type-specific
  placeholders.

---

## Compatibility Notes

- No Postgres migration is required because the existing
  `event_badges.badge_image_url` column remains the public badge-artwork source.
- MongoDB gains one optional field; existing event documents remain valid.
- No runner-facing route or JSON response needs a new badge field.
- Existing earned badge records do not need migration because display resolution uses
  the current event-badge image relationship.
- The initial release does not backfill legacy events. Their current logo fallback
  remains intact until an organizer uploads a new logo.

## Definition of Done

P0–P2 are complete only when the image pipeline, event persistence, event-wide badge
synchronization, cleanup behavior, organizer messaging, and the full test matrix above
are implemented and passing. Completing only the image transformation without lifecycle
synchronization is not a releasable partial implementation.
