# Public Event Page Template

## Purpose

This document defines the reusable public event landing page pattern for:

```text
/events/:slug
```

The public event page is the primary runner-facing marketing and decision page for every published event. It should explain what the event is, how registration works, how completion is measured, what runners receive, and what to do next.

This page is also the preferred destination for public event links and future event QR promotion links.

## Implementation Surfaces

Current implementation files:

| Surface | File |
|---|---|
| Route/controller | `src/controllers/page.controller.js` |
| Public view model | `src/utils/event-public-view.js` |
| Public template | `src/views/pages/event-details.ejs` |
| Page styling | `src/public/css/event-details.css` |
| Focused tests | `tests/event-public-view.test.js` |

The public page should use the normalized public view model from `src/utils/event-public-view.js` rather than duplicating date, price, reward, or registration-state logic inside EJS.

## Page Role

The event page should behave like a landing page, not only a data sheet.

Primary runner questions:

- What is this event?
- Is registration open?
- How much does it cost?
- What distance or goal do I need to complete?
- How does the event work?
- What proof or result do I need to submit?
- What rewards or recognition are available?
- When are the important deadlines?
- What should I do next?

## Recommended Page Order

1. Visual hero
2. Registration/pricing summary
3. Quick event stats
4. How this event works
5. Challenge goal or race distance
6. Rewards and recognition
7. Pricing and optional add-ons
8. Submission rules
9. Full event details
10. Gallery/poster
11. Final CTA

## Hero Pattern

The hero should use the event banner first, then poster, then the default helloRun image.

Recommended content:

- event type chip, for example `Virtual`, `Onsite`, or `Hybrid`
- format chip, for example `Accumulated Challenge`
- registration state chip
- organizer name
- event title
- short event description
- primary registration CTA
- secondary browse/back action
- pricing/registration summary panel

The short description must render inside a semi-transparent contrast layer:

```css
background: rgba(15, 23, 42, 0.5);
```

Reason:

Organizers may upload bright, dark, detailed, or text-heavy banners. A 50% contrast layer keeps the description readable without forcing every banner to follow the same design style.

The event logo is not currently displayed in the hero. It may still be used elsewhere later, such as cards, organizer dashboards, or share images.

## Structured Data Priority

The public event page should prefer structured fields for scannable sections.

Use structured fields for:

- registration state
- registration deadline
- event start/end
- virtual window
- final submission deadline
- event type and allowed participation modes
- race distances
- target distance
- accumulated or single-activity completion mode
- accepted activity types
- proof types
- pricing summary
- delivery fee
- registration packages
- rewards and recognition
- location
- total signup count

Use organizer-authored Event Details content for:

- story and event overview
- longer rules
- FAQ
- special organizer instructions
- nuanced pricing explanation
- payment reminders
- support/contact instructions

Do not force critical event mechanics to appear only in the long-form Event Details content if a structured field already exists.

## Event Details Content

The persisted field name remains:

```text
eventDetailsMarkdown
```

However, organizer create/edit pages currently use Quill and store rich HTML. Public rendering must therefore support sanitized rich HTML.

Current behavior:

- if content looks like HTML, sanitize and render it as HTML
- otherwise, convert markdown to HTML and sanitize it

This keeps old markdown-style content working while supporting the current Quill editor.

## Pricing Rules

The public page must distinguish:

- free base registration
- required registration fee
- optional add-ons
- package pricing
- delivery or claiming fees

For events like the 2026K challenge:

```text
Base registration: free
Optional shirt/package/delivery: may have a fee
```

The public page should not show `PHP 0.00` for paid-looking events when the actual model represents optional delivery or package costs. It should say `Free to join` or `Free base registration` and explain optional costs.

## Rewards Rules

Rewards should be shown from structured fields where possible:

- digital certificate
- digital badge
- leaderboard recognition
- medal
- shirt
- patch
- towel
- finisher kit
- other configured physical items

If long-form details promise physical rewards but structured reward toggles are off, this is a data quality issue in organizer setup. The public page should not invent structured reward items from description text.

Follow-up work should improve organizer validation so reward promises, package setup, and public display do not conflict.

## Signup Count

The public event page shows total signups using non-cancelled registrations for the event.

Current source:

```js
Registration.countDocuments({
  eventId: event._id,
  status: { $ne: 'cancelled' }
})
```

Future versions may add:

- participant previews
- progress totals
- total approved distance
- leaderboard preview

## Responsive UX

Desktop:

- visual hero with pricing panel
- main content plus sticky side summary
- full multi-column mechanics and stat cards

Tablet:

- registration summary appears before long content
- side cards become compact grid cards
- mechanics reduce to two columns

Mobile:

- hero text and CTA stack
- description remains in contrast layer
- sections become single-column
- buttons are full-width and touch-friendly
- sticky bottom registration CTA appears
- gallery and lightbox controls adapt to small screens

## SEO and Sharing

Each public event page should provide:

- canonical URL
- meta description from event description/details
- Open Graph title
- Open Graph image from banner or poster
- Twitter large-image card

The canonical public URL should be:

```text
/events/:slug
```

## QR Promotion Relationship

Future QR promotion links should point to:

```text
/events/:slug
```

Reason:

The public event page is now structured to explain the event before pushing runners into registration. This is better for scanned posters, social posts, and shared links than sending runners directly to the registration form.

## Current Follow-Up Work

- Add runner-facing package/add-on selection during registration.
- Add payment amount snapshot to `Registration`.
- Add active price resolver for registration date, selected package, distance/category, and delivery fee.
- Add payment proof enforcement against the resolved amount.
- Improve organizer validation for public reward and pricing consistency.
- Add public preview parity for organizer preview pages.
- Add optional leaderboard/signup preview modules when data volume is meaningful.
