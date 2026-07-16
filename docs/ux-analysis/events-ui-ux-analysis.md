# Public `/events` UI/UX Analysis

> Code- and documentation-based expert review of the public HelloRun event-discovery listing as of July 16, 2026. This audit covers anonymous visitors and authenticated runners on desktop, tablet, and mobile. It does not replace production analytics, browser/device testing, accessibility testing with assistive technology, or moderated usability research.

## 1. Executive summary

The `/events` page has a sound discovery foundation: public visibility is enforced centrally, search covers useful event and location fields, filters are server-rendered and shareable, event cards expose status/date/location/distance, empty states offer recovery, pagination preserves the main filters, and authenticated users can save an event without leaving the page.

Its main weakness is that it presents a large amount of guidance and filtering UI before the runner reaches an event, while the cards omit several decision-making facts that matter most at comparison time. The mobile layout then solves density by hiding useful feedback—including the result count, filter summary, active-filter chips, hero description, and authenticated shortcut—instead of progressively disclosing it. This makes the compact experience visually shorter but less clear about what the system is showing.

Two verified behavioral defects should lead implementation:

1. Date filters affect the database query and active-filter count, but generated pagination, canonical, and filter-clear URLs omit `dateFrom` and `dateTo`; date filters also receive no active-filter chips. Moving between pages or clearing another chip therefore drops the date range without clearly telling the user.
2. The saved-event interaction exposes no success or error status beyond changing the heart, silently absorbs API failures, and inherits conflicting width rules that can make the icon-only control consume a large share of the card action row.

No P0 issue was found in the inspected source. The highest priorities are preserving and exposing filter state, restoring useful mobile result feedback, making cards more decision-oriented, and making saved-event feedback reliable and accessible.

### Recommended outcome

Reframe the page around a compact sequence:

`Page purpose -> search and essential filters -> visible result/filter state -> comparable event cards -> pagination`

Keep learning content available, but move it after discovery or behind an optional help treatment. Preserve all filters in every generated URL, show a compact filter summary on mobile, and make each card answer: **Can I join? When is it? Where/how does it happen? What distance and price apply?**

## 2. Scope, method, and confidence

### In scope

- `GET /events` and its anonymous/authenticated variants.
- Landing, searching, filtering, clearing filters, comparing cards, encountering ads, saving events, pagination, empty results, and opening `/events/:slug`.
- Responsive behavior at compact phone (320–375 px), standard phone (390–430 px), tablet (768–1024 px), and desktop (1280 px and above).
- Accessibility and interaction semantics visible in the server template, CSS, shared layout, and client script.

### Out of scope

- Organizer and admin event-management pages.
- A full audit of `/events/:slug`, registration, payment, submission, leaderboards, or event shops. Those surfaces are referenced only where `/events` hands a runner to them.
- Visual conclusions that require a real browser, live event data, ad loading, or production fonts/assets.
- Conversion rates, search terms, filter usage, scroll depth, save frequency, bounce rate, and user motivations; no analytics dataset was inspected.

### Sources inspected

| Source | What it establishes |
|---|---|
| `src/routes/pageRoutes.js` and `src/controllers/page/home.controller.js` | Public route, session welcome state, saved-event lookup, error handling, and rendered view model |
| `src/services/public-event-list.service.js` | Visibility, search/filter semantics, sorting, pagination, display states, SEO text, active filters, and generated URLs |
| `src/views/pages/events.ejs` | Information hierarchy, controls, cards, ads, empty states, pagination, and conditional authenticated content |
| `src/public/css/events.css` | Layout, breakpoints, focus styles, hidden mobile content, card/action sizing, and saved state |
| `src/public/js/event-save.js` and `src/routes/runner.routes.js` | Save toggle behavior, API response handling, and authenticated mutation |
| Shared head, navigation, mobile navigation, button, and ad assets | Page-wide CSS order, landmarks, active navigation, mobile bottom navigation, and ad layout |
| `tests/public-search-filters.smoke.test.js` and related event tests | Existing coverage for combined filters, search ranking, visibility, status labels, SEO, ordering, and pagination URLs |

Findings marked **Verified** follow directly from source behavior. Findings marked **Heuristic** are expert predictions that should be confirmed in a browser or with users.

## 3. Current-state inventory and data contract

### Route and server flow

1. `GET /events` calls `pageController.getEvents`.
2. `buildPublicEventListPage(req.query)` normalizes query values and builds the public MongoDB query.
3. Only publicly visible published events are eligible. Test/placeholder and future-posted records are excluded by shared visibility logic.
4. Results are limited to nine cards per page.
5. Search results are ranked by exact title/organizer matches, then location, partial title/organizer, partial location, and description.
6. The default result set prioritizes events with registration currently open, then upcoming events, then past/closed events.
7. The controller separately loads the signed-in user's `savedEvents` into a `Set` used by the template.
8. The EJS view renders one complete page; search/filter and pagination changes reload it.

### Query inputs

| Input | Accepted values/behavior | Reflected in UI | Preserved in generated URLs |
|---|---|---|---|
| `q` | Trimmed, maximum 100 characters; searches title, organizer, description, venue, city, and country | Search input, active chip, dynamic title/summary | Yes |
| `eventType` | `virtual`, `onsite`, or `hybrid`; matches primary or allowed modes | Select, active chip | Yes |
| `distance` | Uppercase, maximum 30 characters; options come from public events | Select, active chip | Yes |
| `status` | `all`, `upcoming`, `open`, or `closed` | Select, active chip when not `all` | Yes |
| `dateFrom` | Valid `YYYY-MM-DD`; filters `eventStartAt >= date` | Date input and active-filter count | **No** |
| `dateTo` | Valid `YYYY-MM-DD`; filters through end of selected UTC day | Date input and active-filter count | **No** |
| `page` | Positive integer; clamped to available pages | Pagination state | Yes |

The date discrepancy is not cosmetic. `buildEventsQueryParams()` serializes search, mode, distance, status, and page only. `getEventsActiveFilters()` also creates chips for only those four filter dimensions. As a result, the view can say that one or two date filters are active while providing no chip for them, and any generated link loses them.

### View-model outputs used by the page

- `events`: normalized cards with uppercased distances, formatted start date, public location, and a display state.
- `filters`: normalized search, mode, distance, status, and parsed date values.
- `pageContent`: dynamic page title, hero title/description, and SEO fields.
- `filterMeta`: total matches, number of active filters, available distances, active-filter chips, and narrative summary.
- `pagination`: current page, total pages, fixed page size of nine, and a URL generator.
- `savedEventIds`: authenticated user's saved event identifiers.
- `loginSuccess` and `userName`: a one-request welcome toast.

### Card status model

Cards display a text label, semantic tone class, and helper sentence. States include Open Registration, Starts Soon, Registration Closed, Past Event, and neutral Event Listing. This is stronger than color-only communication and gives users a time-relative explanation such as “Registration closes in 5 days.”

### Current page hierarchy

1. Shared navigation.
2. Optional fixed welcome toast.
3. Hero title/description, authenticated My Registrations action, and three summary tiles.
4. “Browse races” explanation.
5. “Choosing a distance” education block.
6. Search, mode, distance, status, and date controls.
7. Result count and narrative summary.
8. Optional ad after result metadata.
9. Active-filter chips.
10. Event card grid with optional in-feed ads after every sixth event, capped at two.
11. Pagination or contextual empty state.
12. Footer and, for runners, persistent mobile navigation.

## 4. Current journey analysis

### 4.1 Arrive and orient

**Strengths (Verified)**

- One `h1` describes the listing, while dynamic filter text updates it for search and filtered landings.
- The Events navigation item receives `aria-current="page"`; authenticated runners also have Events in persistent mobile navigation.
- The hero communicates purpose and shows result/filter counts without requiring interaction.
- Authenticated users receive a shortcut back to My Registrations.

**Friction (Heuristic unless noted)**

- Two similarly styled explanatory toolbars sit between the hero and filter form. On desktop, the runner reads a hero, up to three summary tiles, two headings, and two paragraphs before reaching the primary discovery controls.
- “Check Out Ongoing Events” does not fully describe the default result set, which can include upcoming and closed/past listings. **Verified content mismatch.**
- “Matching events” is shown even when no filter is active; “Published events” or “Available listings” would describe the unfiltered state more accurately.
- The “Distance choices” number is a system inventory, not a strong runner decision aid. It may be less useful than a shortcut to Open registration or the total visible result range.

### 4.2 Search and filter

**Strengths (Verified)**

- Search is a standard GET form, so filtered URLs are shareable and work without JavaScript.
- Controls use explicit names and associated labels. Search has a visually hidden label and useful placeholder.
- Search scope is broader than the placeholder suggests: organizer, venue, city, country name/code, and description are searchable.
- Mode, distance, and status offer bounded choices rather than free-form input.
- Results update only on explicit Search submit, avoiding surprise reloads while choosing multiple filters.
- Clear and individual filter-removal paths exist for the four established filter dimensions.

**Friction (Verified)**

- The submit button is labelled only “Search,” although it applies every control. “Show events” or “Apply filters” would better describe the action.
- There is no sort control or statement explaining the default open/upcoming/past priority. Users cannot intentionally sort by soonest start, closing soon, or newest.
- Date inputs are present but do not receive the common input styling selector used for selects/search, so their sizing and appearance depend on browser defaults.
- The desktop grid defines five columns for seven possible children (search, three selects, two dates, and Clear), creating implicit wrapping rather than an explicit information hierarchy.
- Date filters are excluded from chips, narratives, canonical URLs, and generated pagination/clear links.
- An inverted range (`dateFrom > dateTo`) is accepted and simply produces no matches; no validation or explanation distinguishes it from a legitimate empty result.
- Dynamic hero/SEO narratives ignore date filters even while the result count treats them as active.

**Friction (Heuristic)**

- Six filter fields are always exposed, even though mode/status/distance likely drive most discovery sessions. On phones this creates a dense three-column row of compact controls.
- “From” and “To” are ambiguous without nearby “Event start date” context.
- The distance list is lexically/numerically sorted from raw public values; mixed formats such as `5 KM`, `5K`, accumulated totals, or category-derived values may be hard to compare if organizer data is inconsistent.

### 4.3 Understand the result set

**Strengths (Verified)**

- Desktop/tablet users see a numeric total, active-filter count, narrative summary, and removable chips.
- Search-specific titles and summaries reinforce query state.
- Empty filtered results provide a direct Clear filters action.

**Friction (Verified)**

- At 640 px and below, `.results-meta`, `.results-summary`, and `.active-filters` are all `display: none`. A phone user cannot see the number of matches, which filters are active, or remove one filter at a time.
- The hero summary and description are hidden at the same breakpoint, so the page gives almost no post-submit confirmation beyond selected values inside compact controls.
- Date filters count toward “active filters” on larger screens, but have no corresponding visible chips.
- The ad after result metadata appears before active-filter chips. When enabled, it can interrupt the cognitive connection between result feedback and the controls that explain it.

### 4.4 Compare event cards

**Strengths (Verified)**

- Cards have a consistent image, status, mode, title, helper, date, location, distance, description, and View Event action.
- Title and image both open the event, giving large navigation targets.
- Missing images fall back to the HelloRun icon both before load and on image error.
- Missing date/location/distance/description values have readable fallback copy.
- Long titles and metadata can wrap; descriptions are clamped to three lines to protect grid rhythm.
- Text labels accompany status colors.

**Friction (Verified)**

- Cards do not show organizer, registration price/free status, or an explicit registerability action. A runner must open each event to compare these high-value facts.
- Raw `event.eventType` is rendered rather than the normalized human label; `onsite` appears instead of “On-site.”
- Image alt text repeats the title plus “banner.” Because the linked title immediately repeats the same destination, screen-reader users encounter redundant link content. Decorative event imagery should use empty alt text unless the image conveys unique information.
- Metadata Lucide placeholders lack `aria-hidden="true"`; they are visual decoration adjacent to text.
- Every description is treated as plain escaped text. If event descriptions contain HTML/Markdown source, cards may show formatting syntax or overly long unstructured excerpts rather than a prepared plain-text summary.
- The entire card is not clickable, but hover styling affects the whole card; this is acceptable but can imply a larger clickable region than exists.

**Friction (Heuristic)**

- Status helper plus three metadata rows plus description creates tall cards. When content differs, primary actions can sit at different visual depths despite flex alignment within each grid row.
- The status and mode tags compete for attention with the event title, while fee and organizer—often stronger trust and choice signals—are absent.
- “View Event” is safe but generic. For an open event, “View details” remains honest, while a compact “Registration open” cue should carry the action urgency without implying one-click registration.

### 4.5 Save an event (authenticated)

**Strengths (Verified)**

- Save is available directly on each card for authenticated users.
- The control has a state-dependent `aria-label` and `title`.
- The button is disabled while the request is pending, preventing rapid duplicate toggles.
- All matching controls on a page are synchronized after success.

**Friction (Verified)**

- The script only changes the heart/title/accessible label after success. There is no live-region announcement such as “Event saved.”
- API errors, non-success responses, and network failures silently re-enable the button. The user cannot tell whether the action failed or whether retrying is appropriate.
- The script assumes every response is JSON and does not branch on HTTP status before parsing.
- `.card-actions .btn { width: 100%; }` applies to both View Event and the icon-only save control. With no action-row gap, the save control can occupy disproportionate space instead of remaining a 44-by-44 secondary action.
- The page relies on heart fill/color and an icon-only control for visible state. The accessible name is good, but sighted users unfamiliar with the convention receive no “Saved” text or confirmation.

### 4.6 Ads

**Strengths (Verified)**

- Ads are conditional on server settings and are marked with an `aside`, an accessible “Advertisement” label, and visible label text.
- In-feed ads span the full card grid, so they do not masquerade as event cards.
- Feed insertion is capped at two and occurs only after each sixth event.

**Risks (Heuristic)**

- A minimum 90–100 px slot can grow after ad load, causing layout shift unless production ad dimensions are reserved accurately.
- The first ad sits between result metadata and active chips, weakening state continuity.
- On a nine-item page, an ad after item six interrupts scanning near the final third of results. Its effect should be checked against card click-through and abandonment analytics.

### 4.7 Pagination and handoff

**Strengths (Verified)**

- Pagination uses a labelled `nav`, previous/next controls, `aria-current` on the active page, ellipses, and stable filtered URLs for search/mode/distance/status.
- Disabled previous/next links are removed from tab order and expose `aria-disabled`.
- Mobile previous/next controls become two full-width targets and page numbers move above them.
- The event detail handoff has consistent canonical `/events/:slug` links.

**Friction (Verified)**

- Pagination loses date filters.
- Page links do not expose accessible labels such as “Go to page 3”; visible numbers may still be understandable, but explicit labels improve context.
- Disabled controls remain anchors with valid current-page URLs. Keyboard activation is prevented by `tabindex`, and pointer interaction by CSS, but native disabled buttons or conditional non-links would be clearer semantics.
- There is no result range (“Showing 10–18 of 42”), only total matches and current page.
- Page changes do not include an in-page results anchor, so the browser returns users to the top hero rather than the result heading/grid.

## 5. Responsive audit

### Compact phone: 320–375 px

**Current behavior (Verified)**

- Hero summary, hero description, authenticated hero action, explanatory paragraphs, result count, result summary, and active chips are hidden.
- Search occupies a full row. Mode, distance, and status occupy three equal columns, with their visible labels hidden.
- Date inputs continue into the grid with “From” and “To” labels; Clear spans the full row when present.
- Cards become one column; actions and previous/next pagination controls are at least 44 px high.
- Authenticated runners also have a five-item persistent bottom navigation, and shared mobile CSS reserves page space for it.

**Assessment**

- **P1 risk:** A 320 px content width minus padding/gaps leaves very narrow select controls. Hidden labels force users to infer meaning from currently selected option text; after a non-default selection, “Virtual” no longer visibly says it is the Mode filter.
- **P1 risk:** Removing result feedback and active chips makes filters hard to inspect and undo, especially when the selected value is truncated.
- **P2 risk:** Browser-native date controls can overflow or compress unpredictably because the event stylesheet does not normalize them.
- The one-column card layout and full-width pagination are appropriate.

### Standard phone: 390–430 px

The same 640 px rules apply. Extra width helps the three selects but does not solve hidden filter identity or missing result feedback. This range should support a compact “Filters (n)” control, visible result count, and removable chips without restoring the full desktop hero.

### Tablet: 768–1024 px

**Current behavior (Verified)**

- At 1024 px and below, the hero becomes one column, summary tiles become a three-column row, explanatory toolbars stack their paragraph below the heading, and the filter form uses two columns with search spanning both.
- The grid uses auto-fill cards with a 300 px minimum, yielding two or possibly three cards depending on available width.
- Mobile content hiding does not start until 640 px.

**Assessment**

- This is the most coherent current breakpoint: controls have room, all state feedback remains visible, and cards can compare side by side.
- The two educational blocks still postpone the primary task and may make the page feel longer than necessary.
- Filter wrapping should be explicitly designed rather than relying on auto-placement of seven possible children.

### Desktop: 1280 px and above

**Current behavior (Verified)**

- Content is capped at 1200 px. Hero uses a copy/summary split, filters begin with a wide search column, and cards form a three-column grid at common widths.
- Nine results make a balanced three-by-three page before ads.

**Assessment**

- The page is visually structured, but its first screen emphasizes explanatory material and metrics over actual events.
- Seven filter/form children exceed the declared five-column template, so the final placement is dependent on implicit grid rows.
- A three-column card comparison is appropriate; prioritizing consistent decision facts would improve it more than increasing density.

## 6. Accessibility audit

### Existing strengths

- Semantic `main`, `section`, `article`, navigation, form, and pagination structures are present.
- One page-level heading is followed by section and card headings in logical order.
- Form controls have programmatic labels, and the search icon is not interactive.
- Status meaning is expressed in text, not color alone.
- Primary buttons meet a 44 px minimum; mobile pagination controls do as well.
- Active navigation and active pagination expose `aria-current`.
- Save buttons have state-specific accessible names and are disabled during the request.
- Advertisement containers are explicitly labelled.
- Long titles and metadata use wrapping rather than forced clipping.

### Gaps and recommendations

| Area | Evidence | Risk | Recommendation |
|---|---|---|---|
| Filter identity on mobile | Select labels use `display: none` at <=640 px | Sighted users lose persistent control labels; zoomed layouts are harder to scan | Keep short visible labels or move filters into a labelled disclosure/sheet |
| Result updates | Full page reload; result metadata hidden on mobile | Users may not perceive what changed | Focus a results heading after intentional navigation where practical; retain a visible count and add a polite result summary |
| Save feedback | No live status or visible error | Screen-reader and sighted users cannot confirm failure | Add a shared `aria-live="polite"` region and visible non-blocking success/error feedback |
| Toast | Welcome toast has no `role="status"`, dismissal, or reduced-motion treatment | It may not be announced and can obscure content | Use the shared flash/status pattern or add status semantics and controlled dismissal |
| Decorative icons | Card metadata and pagination icons lack `aria-hidden` | Potential redundant or unclear announcements | Mark decorative icons hidden; keep text labels as the accessible content |
| Repeated image links | Linked image alt repeats the linked title | Duplicate destination announcements | Use empty alt text for decorative banners or remove the image link from sequential focus while retaining title link |
| Focus visibility | Explicit focus styles cover buttons and pagination, not chips/title/image links | Browser defaults may be inconsistent against custom surfaces | Add consistent `:focus-visible` styling to every interactive element |
| Touch sizing | Page-number controls are 42 px; `.btn-icon-only` globally unsets minimum height | Some targets can fall below 44 px | Enforce at least 44-by-44 px for page numbers and save controls |
| Motion | Toast/card image/button transitions lack `prefers-reduced-motion` override in `events.css` | Motion-sensitive users cannot opt out at component level | Disable transforms/animations under reduced motion, subject to shared CSS verification |
| Filter grouping | Six controls are in one form without `fieldset`/legend | Date range and filter purpose are less explicit | Add visible section heading and group date range with meaningful text; a fieldset is optional if layout semantics remain clear |
| Pagination semantics | Numeric links have no explicit accessible labels | Numbers can be context-light in verbose navigation | Add `aria-label="Go to page N"`; label current page accordingly |

### Contrast notes

Source colors appear intentionally dark on light surfaces, and status pills use both label and color. Exact WCAG contrast cannot be certified from source inspection alone because global cascade, font rendering, browser state, and production ad content affect the final page. Validate normal, hover, focus, disabled, saved-heart, status-pill, and placeholder states with automated contrast tooling and manual browser inspection.

## 7. State coverage

| State | Current behavior | UX assessment |
|---|---|---|
| Default results | Open registration first, then upcoming, then past/closed; nine per page | Useful priority but undisclosed; “ongoing” headline is inaccurate when past listings appear |
| Combined filters | Server applies search/mode/distance/status/dates | Strong baseline; dates break generated-link persistence |
| Search | Ranked across event, organizer, location, country, and description | More capable than placeholder communicates; ranking is not visible or controllable |
| No matches | Filter-aware heading, explanation, Clear filters | Good recovery; copy omits search/date as possible causes |
| No published events | Guidance links to How It Works and Blog | Helpful alternative actions; `.card-actions .btn {width:100%}` can make two empty-state buttons compete for full width |
| Open event | Green text status and closing helper | Clear; card still lacks fee and direct comparison facts |
| Upcoming event | Starts Soon or neutral state depending on dates | Understandable, but “upcoming” filter is based on start date and can include registrations already open |
| Closed/past event | Registration Closed or Past Event with helper | Explicit and de-emphasizable; default page may still surface these after active events |
| Long content | Titles/metadata wrap; descriptions clamp to three lines | Resilient, though raw formatted source may reduce excerpt quality |
| Missing media/data | Default image and fallback text | Robust; repeated logo fallback across many cards can become visually noisy |
| Authenticated save | Heart toggles without navigation | Useful but lacks reliable status/error communication and compact sizing |
| Ads enabled | One ad after result metadata and full-width feed ads | Clearly labelled; validate layout shift and discovery interruption |
| Multiple pages | Condensed numeric pagination plus previous/next | Good baseline; dates drop and page reload returns to top |
| Invalid page | Positive input normalized and clamped | Safe recovery; URL can say a high page while content renders last page without redirecting to canonical page |
| Invalid/inverted dates | Invalid values become null; inverted valid dates query normally | No validation feedback; inverted range looks like a legitimate no-match result |
| Server failure | Styled 500 error page | Context is lost; no direct retry action is supplied by this route |

## 8. Prioritized findings

Priority definitions: **P0** blocks the core task or creates severe harm; **P1** materially impairs discovery or trust; **P2** causes recurring friction or accessibility debt; **P3** is incremental polish. Effort is a relative estimate for planning, not a commitment.

| ID | Priority | Finding | User impact and evidence | Affected state/viewport | Recommended remedy | Effort |
|---|---|---|---|---|---|---|
| E-01 | P1 | Date state is not represented or preserved | Verified: dates affect queries/count but are absent from URL builder and active-filter generator | Any date-filtered result; especially pagination/chip clearing | Serialize both dates, add chips/narratives, validate range, and add regression tests | S |
| E-02 | P1 | Mobile hides all result and active-filter feedback | Verified CSS hides counts, summaries, and chips <=640 px | 320–430 px filtered/search results | Keep compact result count and a Filters (n) summary; allow individual removal in a wrap/scroll-safe treatment | M |
| E-03 | P1 | Mobile filter controls lose visible identity | Verified labels for mode/distance/status are hidden in a three-column row | 320–430 px, zoom, selected filters | Use visible short labels or a labelled filter disclosure with stacked 44 px controls | M |
| E-04 | P1 | Save interaction fails silently and sizes inconsistently | Verified JS error paths and conflicting `.card-actions .btn` width rule | Authenticated cards, all viewports | Make save a fixed 44 px secondary action; announce success; show retryable error; test response/status branches | S–M |
| E-05 | P1 | Cards omit price/free and organizer trust context | Verified selected fields/template omit these comparison facts | All result sets | Add normalized organizer and pricing summary to the card view model; keep detail CTA primary | M |
| E-06 | P2 | Guidance delays the discovery task | Verified two educational blocks precede filters | All viewports, most visible on desktop/tablet | Keep one concise discovery intro; move distance education below results or into optional help | S |
| E-07 | P2 | Filter layout relies on implicit grid placement | Verified five declared desktop columns for up to seven children; dates lack shared styling | Desktop/tablet and browser variations | Define deliberate filter rows/areas and normalize every input/touch target | S–M |
| E-08 | P2 | Default ordering is useful but opaque and not controllable | Verified service sorting; no sort UI/copy | Default and broad result sets | State default order; add sort only if analytics/research shows demand (recommended options: Recommended, Starting soon, Closing soon) | M |
| E-09 | P2 | Card links/icons have accessibility redundancy and incomplete focus treatment | Verified markup and explicit focus selector coverage | Keyboard and screen-reader use | Hide decorative icons, avoid repeated linked alt text, and standardize focus-visible styles | S |
| E-10 | P2 | Pagination loses context and returns to top | Verified URL behavior and no results anchor | Page 2+, all viewports | Preserve all filters, include result range, add accessible page labels, and navigate to results anchor | S–M |
| E-11 | P2 | Page heading and summary terminology can contradict results | Verified default includes past/closed but headline says ongoing | Default results | Use “Discover running events” and state the result/order model plainly | S |
| E-12 | P2 | No invalid date-range feedback | Verified query behavior | Inverted ranges | Validate server-side, retain values, and show an inline actionable message | S |
| E-13 | P3 | Search capability is under-described | Verified search fields exceed placeholder promise | Search users | Use “Search events, organizer, or location” | S |
| E-14 | P3 | Result count lacks visible range | Verified total-only rendering | Page 2+ | Show “10–18 of 42 events” | S |
| E-15 | P3 | Reduced-motion behavior is not component-specific | Verified events stylesheet has transforms/animation and no media query | Motion-sensitive users | Add reduced-motion override after checking shared global coverage | S |
| E-16 | P3 | Ad placement separates state from controls | Verified template order | Ads enabled | Place after chips/filter summary or after the first result group; validate against revenue/engagement data | S |

### P0 assessment

No P0 issue was found in the inspected UI flow. Public listing access, core search/filter submission, event navigation, empty recovery, and non-date pagination remain available without JavaScript. E-01 is P1 because it silently changes user-selected constraints and can undermine trust, but it does not prevent all event discovery.

## 9. Proposed experience

### Information hierarchy

1. **Purpose and orientation:** “Discover running events” plus one short sentence.
2. **Primary discovery control:** prominent search.
3. **Essential filters:** mode, distance, registration status; date range behind “More filters” on compact layouts.
4. **State confirmation:** result range, applied filters, Clear all, and default sort explanation/control.
5. **Results:** decision-oriented, comparable cards.
6. **Pagination:** preserve state and return focus/scroll near results.
7. **Learning help:** concise “Choosing your event” content after results or in an optional disclosure.

### Text wireframe

```text
[Main navigation]

Discover running events
Find a virtual, on-site, or hybrid event that fits your next goal.
[My registrations — authenticated only]

[ Search events, organizer, or location... ] [Show events]
[Mode ▾] [Distance ▾] [Registration status ▾] [More filters (date) ▾]

Showing 1–9 of 24 events                         Sorted: Recommended ▾
[Open registration ×] [Virtual ×] [From Jul 20 ×]              [Clear all]

[Event image]
OPEN REGISTRATION       VIRTUAL
Event title
Organizer name
Closes in 5 days
Jul 26, 2026  ·  Anywhere
5K, 10K        ·  Free
[View details                                  ] [♡ Save]

[Clearly labelled advertisement, placed between result groups]

[Previous] [1] [2] [3] [Next]

[Optional: How to choose a distance/event]
[Footer]
```

### Filter behavior

- Submit all filters explicitly with “Show events”; pressing Enter in search does the same.
- Preserve `q`, `eventType`, `distance`, `status`, `dateFrom`, and `dateTo` in pagination, canonical URLs where appropriate, and removal links.
- Represent every applied filter with a visible chip on desktop/tablet and within a compact mobile filter summary.
- Reset page to 1 whenever a filter changes or is removed.
- Reject an inverted date range with “From date must be on or before To date,” without discarding other inputs.
- Label the date group “Event start date” and use “From”/“To” only within that context.
- Mobile: show search and a “Filters (n)” button in the page flow. Open a native page section or accessible modal/sheet with one control per row, visible labels, Apply, and Clear all. Prefer an inline disclosure unless user testing supports a modal sheet.
- Do not add instant auto-submit in v1; explicit application is predictable, accessible, and consistent with the server-rendered architecture.

### Event-card behavior

- Keep status, mode, title, start date, location, and distances.
- Add organizer name and normalized price/free summary from server-prepared card data.
- Remove the full description from compact mobile cards; on larger cards, use a sanitized plain-text excerpt only if it contributes information not already shown.
- Keep “View details” as the primary action so users review event rules before registration.
- Make Save a fixed-size labelled/tooltip secondary control with visible saved state and live feedback.
- Use decorative empty-alt imagery unless an organizer-supplied image needs a genuinely descriptive alt field in the future.
- Do not make the entire card a nested clickable target; maintain clear title/image/action links and visible focus.

### Empty and failure states

- No matches: repeat the active constraints, suggest removing the most restrictive filter, and offer Clear all.
- No published events: retain How It Works and Blog alternatives, but lay them out as distinct secondary actions.
- Save failure: keep the previous state, announce “Could not save this event. Try again,” and leave the control enabled.
- Listing failure: styled error with Retry events and Home links.
- Missing card data: retain explicit fallbacks, but prefer omitting nonessential description rather than displaying “No event description available” on every sparse card.

### Pagination behavior

- Show the visible range and total.
- Preserve every active filter.
- Give page links explicit accessible labels.
- Include a `#event-results` target in generated page URLs or use a server-compatible enhancement that restores focus to the result heading after navigation.
- Keep Previous/Next as large mobile controls; page numbers may be abbreviated more aggressively on narrow screens.

## 10. Change-impact map

This map identifies likely implementation areas; no listed UI or service file was changed as part of this analysis.

| Area | Likely change | Compatibility concern |
|---|---|---|
| Public list service | Preserve/describe dates, validate ranges, add card organizer/pricing data and visible result range | Existing query URLs and SEO tests; Event pricing fields may require shared normalization rather than duplicate logic |
| Events template | Reorder hierarchy, compact learning content, improve filter grouping/state, enrich cards, accessible pagination/live feedback | Ads, anonymous/authenticated branches, server-only functionality, existing regex smoke assertions |
| Events stylesheet | Explicit filter grid, mobile disclosure/summary, normalized date controls, compact save action, focus/reduced-motion rules | Global design-system and project-button cascade order |
| Save-event script | HTTP-aware error handling, pending/success/failure status, state synchronization | Same script is used by event details and runner saved-event surfaces; changes must remain cross-page compatible |
| Public-search tests | Add date persistence, invalid range, card contract, accessibility hooks, save-state markup, and responsive source assertions | DB-backed smoke fixture lifecycle and nine-item pagination assumptions |
| Optional browser test layer | Validate layout, keyboard use, mobile filter disclosure, ads, and visual states | No browser automation dependency currently appears in `package.json`; adopt only if the project accepts it |

No database migration is expected for the recommended first pass. Price and organizer data already exist on event records, but the implementation should reuse established pricing normalization so card summaries cannot disagree with event details.

## 11. Test and validation matrix

### Server/service tests

- A request containing both dates applies the range and returns normalized date values.
- Pagination URLs preserve both dates plus all other active filters.
- Removing one chip preserves every other filter, including dates.
- Date chips have human-readable labels and reset pagination to page 1.
- An inverted date range returns a clear validation state instead of a misleading no-match result.
- Search/mode/distance/status behavior, ranking, visibility, and closed-event ordering remain unchanged.
- Card view data returns normalized mode, organizer, price/free summary, and safe fallback values.

### Render/smoke tests

- Default, search, combined filters, date-only filters, all-filter combinations, empty filtered, and empty platform states render the correct heading and controls.
- Anonymous cards omit Save; authenticated cards expose a correct state-specific accessible name.
- Open, upcoming, closed, and past cards show text status plus helper copy.
- Long title/location/distance values render without malformed HTML.
- Missing and broken image paths retain safe fallback behavior.
- Ads render only when configured and remain labelled as advertisements.
- Pagination exposes current page, accessible labels, filter-preserving links, and result range.
- Every active filter has a removable representation; Clear all returns to `/events`.

### Browser and accessibility tests

At 320, 375, 390, 430, 768, 1024, and 1280 px:

- No horizontal page scrolling at 100% or 200% zoom.
- Search, filter, date, Save, card, and pagination targets are at least 44 px where touch interaction is expected.
- Filter identity and applied count remain visible on phones.
- Long selected option text and active chips do not overlap or become impossible to remove.
- Card actions remain stable for anonymous, unsaved, saved, pending, and failure states.
- Keyboard order follows visual order; every control has a visible focus indicator.
- Screen readers announce page/result headings, labels, saved state changes, errors, current pagination, and advertisements without redundant image-link text.
- Status remains understandable without color.
- Reduced-motion preference removes nonessential toast, image, card, and button movement.
- Late-loading ads do not produce unacceptable layout shift or cover interactive content.

### Acceptance criteria for a subsequent implementation

1. All valid filters survive pagination and individual filter removal; every applied filter is discoverable and removable at every viewport.
2. An invalid date range produces inline guidance and preserves all entered values.
3. Phone layouts show result count and active-filter count without requiring users to infer state from compact select values.
4. No discovery control or primary/secondary card action is narrower than 44 px in its intended touch dimension.
5. Cards consistently expose status, mode, title, organizer, date, location, distance, and price/free information using server-normalized labels.
6. Save success and failure are visibly and programmatically announced; failures never leave an ambiguous displayed state.
7. Keyboard and screen-reader users can identify, operate, and confirm every filter, card action, and page control.
8. Existing public visibility, search ranking, SEO, status, ordering, empty-state, and advertisement behavior remains covered by automated tests.
9. The page works for core discovery with JavaScript disabled; JavaScript enhances only saved-event feedback and optional interaction polish.

## 12. Suggested implementation sequence

### Phase 1 — Correctness and trust

1. Fix date serialization, chips, summaries, and range validation.
2. Correct saved-event sizing and add explicit pending/success/error feedback without breaking other pages that use `event-save.js`.
3. Add regression tests for both behaviors before restructuring the page.

### Phase 2 — Mobile discovery and accessibility

1. Retain compact result/filter feedback below 640 px.
2. Replace the three unlabeled compact selects with a labelled, touch-safe filter treatment.
3. Normalize date inputs, focus styles, decorative icon semantics, page labels, and reduced motion.
4. Validate at the viewport/zoom matrix with keyboard and at least one screen reader.

### Phase 3 — Hierarchy and card comparison

1. Shorten/reposition educational content and align heading terminology with the actual result set.
2. Add server-normalized organizer and pricing information to cards.
3. Tune description visibility, result ranges, pagination return position, and ad placement.
4. Compare card click-through, filter use, save success, and event-detail conversion after release if analytics are available.

### Phase 4 — Evidence-led enhancements

Consider a visible sort selector, promoted quick filters, or more advanced search only after production data or user research demonstrates demand. Do not add client-side filtering or an SPA layer solely for this redesign; the existing server-rendered model already supports shareable, resilient discovery.

## 13. Research and measurement needs

The following questions cannot be answered from the repository and should not be treated as established facts:

- Which filters are used most, and how often do users combine them?
- Do runners understand “Open,” “Upcoming,” and “Closed / Past” as implemented?
- Are price, organizer, rewards, date, distance, or mode the strongest card-level decision factors?
- How often do users save events, and how often does saving lead to registration?
- Where do phone users abandon: before filters, after no results, during card comparison, or on event details?
- Do ads materially reduce event-card engagement or create layout shift in production?
- Is a sort selector needed, and which order do runners expect by default?

Recommended events for analytics, if consent and policy allow: listing viewed, search submitted, filters applied/removed, no-results shown, event card opened, save attempted/succeeded/failed, pagination used, and event-detail-to-registration conversion. Avoid recording raw free-text search terms unless privacy review explicitly permits it; categorized or hashed/aggregated measurement may be safer.

## 14. Implementation handoff

The first engineering plan should treat E-01 through E-05 as the required baseline and preserve server-rendered GET behavior. Before editing, inspect the current global CSS cascade and all pages using `event-save.js`, then lock date URL behavior and save feedback with tests. The visual hierarchy and card enrichment can follow in separate, reviewable changes.

This document is the review gate requested before implementation. No `/events` template, style, script, service, route, model, or test behavior was modified while producing it.

## 15. Implementation tracker

Implementation began July 16, 2026 after review approval. The audit remains the source of truth; this tracker is updated immediately before and after each priority tier.

| Priority | Status | Started | Completed | Findings |
|---|---|---|---|---|
| P1 | **Complete** | July 16, 2026 | July 16, 2026 | E-01 through E-05 |
| P2 | **Complete** | July 16, 2026 | July 16, 2026 | E-06 through E-12 |
| P3 | **Complete** | July 16, 2026 | July 16, 2026 | E-13 through E-16 |

### P1 pre-implementation note

Work is starting with correctness and trust: complete date-filter persistence/validation, compact and understandable mobile filters, reliable saved-event feedback/sizing, and decision-ready organizer/pricing card data. Focused service/render tests will be added before P1 is marked complete.

### P1 completion note

All P1 findings are implemented. Date filters now persist in generated URLs, appear as chips/narratives, and show an inline inverted-range error. Mobile keeps visible filter identity and result state. Saved-event controls are fixed-size and expose pending, success, and retryable failure feedback. Cards now use normalized mode, organizer, and pricing data from the same public-view normalization as event details. Focused unit and EJS compilation checks passed (22/22 tests plus template compilation). The public-search smoke fixture was also aligned with the platform rule that `isTestData` events are never public; its final rerun is included in the closing regression pass.

### P2 pre-implementation note

P2 work is starting on hierarchy, explicit layout, ordering clarity, link/icon accessibility, pagination continuity, accurate terminology, and robust date validation behavior. These changes will retain the server-rendered GET contract established in P1.

### P2 completion note

All P2 findings are implemented. The filter task now precedes optional education, the form uses deliberate search/primary/date groupings, and the page explains its recommended order. Result ranges and anchored pagination preserve context. Card imagery and decorative icons avoid duplicate announcements, filter/page controls have explicit labels and focus treatment, and invalid dates expose linked `aria-invalid` guidance. The default heading now accurately covers open, upcoming, and past public listings. The updated EJS template compiles and the focused service/view tests remain green.

### P3 pre-implementation note

P3 work is starting on clearer search scope, final result-range polish, reduced-motion behavior, and ad placement continuity. These are deliberately small refinements on the completed P1/P2 structure.

### P3 completion note

All P3 findings are implemented. Search now advertises event, organizer, and location scope; paginated results show the visible range; reduced-motion preferences disable nonessential component motion; and the first ad follows applied-filter feedback rather than separating it from the results state. Card excerpts now use the shared public plain-text normalization. Four UI source-contract tests were added, bringing the focused service/view total to 26/26 passing before the final regression run.

### Final validation — July 16, 2026

- Focused `/events` service, public-view, template, responsive, accessibility, and save-interaction tests: **26/26 passing**.
- DB-backed public search/filter smoke test: **14/14 passing** with external Postgres shadow sync disabled for the local fixture run.
- Full unit suite: **409/411 passing**. The two failures are pre-existing runner-dashboard wording assertions expecting “Active event journey”; the unchanged dashboard currently renders “Active Event Progress.” Neither failure touches `/events` or any file changed by this implementation.
- `events.ejs` compilation, JavaScript syntax checks, and `git diff --check`: passing.
- No database migration was required.
