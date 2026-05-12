# Event QR Promotion Links [DRAFT]

## Goal

Generate QR codes for event promotion links so organisers can promote HelloRun events across offline and online materials.

The QR code should open the public event page or registration page, allowing runners to scan and proceed directly to event details or signup.

## Product Scope

HelloRun should support QR promotion links for both virtual runs and onsite events.

The feature should support:

- Public event share links
- Generated event QR codes
- QR code preview
- QR code download
- Event link copy action
- Admin and organiser access controls
- Stable QR codes for published event URLs

## Use Cases

Organisers may use event QR codes in:

- Posters
- Social media graphics
- Event tarpaulins
- Organiser announcements
- Partner promotions
- Registration booths
- Race kit claiming areas
- Onsite information desks

## User Stories

### Organiser

- As an organiser, I want to generate a QR code for my event so I can promote the event on posters and announcements.
- As an organiser, I want to download the QR code as an image so I can include it in promotional materials.
- As an organiser, I want to copy the public event link so I can share it directly with runners.
- As an organiser, I want the QR code to point to the correct event page so runners can register without searching manually.

### Admin

- As an admin, I want to access QR codes for all published events so I can support event promotion.
- As an admin, I want to verify the destination URL before sharing QR codes publicly.

### Runner

- As a runner, I want to scan an event QR code so I can quickly open the event page and register.

## Suggested QR Destination

The QR code should initially point to the public event detail page.

Suggested destination:

- `/events/:slug`

The public event page template is documented in:

- `docs/public_event_page_template.md`

Reason:

The public event page is the runner-facing landing page for understanding the event, pricing, rewards, submission rules, and deadlines before registration.

If the product later supports a dedicated registration landing step, the QR destination may point to:

- `/events/:slug/register`

The selected destination should be consistent per event and should not change unexpectedly after QR codes have been distributed.

## Suggested Routes

Organiser routes:

- `GET /organizer/events/:id/promotion`
- `GET /organizer/events/:id/promotion/qr`
- `GET /organizer/events/:id/promotion/qr/download`

Admin routes:

- `GET /admin/events/:id/promotion`
- `GET /admin/events/:id/promotion/qr`
- `GET /admin/events/:id/promotion/qr/download`

Public destination route:

- `GET /events/:slug`

## Suggested UI Placement

Organiser event management:

- Event overview page
- Event edit/manage page
- Event promotion tab or section

Admin event management:

- Event detail page
- Event promotion section

Suggested actions:

- `Copy Event Link`
- `Download QR Code`
- `Preview Public Event Page`

## Suggested Data Fields

QR codes may be generated dynamically from the event public URL. If persistence is needed, suggested event-level fields are:

- `publicUrl`
- `qrCodeUrl`
- `qrCodeGeneratedAt`
- `qrCodeUpdatedAt`
- `promotionSlug` optional

If QR download files are stored, the system should track:

- `eventId`
- `generatedBy`
- `destinationUrl`
- `filePath`
- `createdAt`
- `updatedAt`

## Visibility And Permission Rules

- QR codes should be available only for published or promotion-ready events.
- Organisers can access QR codes only for events they own.
- Admins can access QR codes for all events.
- Draft, archived, or private events should not expose public QR promotion links unless explicitly enabled.
- QR code generation should respect the same public visibility rules as the event page.

## Stability Rules

- QR codes should remain stable once promotional materials are distributed.
- Event slug changes should be handled carefully because they may break printed QR codes.
- If event slugs can change, the platform should use redirects from old slugs to the current event URL.
- A future `promotionSlug` may be used to keep QR destinations stable independently from the event title slug.

## Acceptance Criteria

- Published events have a public event link.
- Organisers can copy the public event link.
- Organisers can preview the event QR code.
- Organisers can download the QR code as an image.
- Admins can access and download event QR codes.
- QR codes open the correct public event page.
- QR generation works for virtual runs and onsite events.
- Draft or private events do not expose public QR links unless explicitly enabled.
- Event ownership and admin permissions are enforced.
- Mobile and desktop layouts support QR preview and download.

## Deferred Scope

- QR scan analytics
- Campaign-specific QR codes
- UTM parameter management
- Short-link service
- Dynamic destination switching
- Bulk QR export for multiple events
- QR codes for race kit claiming
- QR codes for participant check-in

## Notes For PRD Integration

This can be referenced as an organiser support feature under event management and promotion tools.

It does not need to be a full standalone phase yet. It can be included as a future enhancement under organiser event operations, or added to a smaller event promotion phase when the roadmap is refined.
