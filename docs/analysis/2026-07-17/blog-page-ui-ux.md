# `/blog` Community Publishing and Reading UI/UX Audit

Date: July 17, 2026  
Surfaces: `/blog`, `/blog/:slug`  
Primary audience: community readers and contributors  
Secondary audience: runners and organisers seeking practical guidance

## Outcome

The public blog now behaves like a community publication rather than a generic content index. Discovery leads with community voices, contribution, writers, and engagement. Article pages make the author and discussion visible while preserving a calm reading column, practical HelloRun actions, and every existing interaction.

The implementation remains server-rendered and progressively enhanced. No route, schema, or interaction API changed.

## User POV

### Reader

> “I want to see what other runners are sharing, quickly understand whether a story is relevant, and know whether people found it useful before I open it.”

The listing now exposes topic, writer, date, reading time, views, likes, and comments at card level. Search remains the primary discovery control, while topics and filters are secondary and explicitly labelled.

### Contributor

> “I want it to feel like my story belongs to a real community, and I want readers to find both my post and my other writing.”

“Write a post” is a primary header action. Writer identity, verified state, avatars, top-writer discovery, and author-filter links are visible throughout the listing and article journey.

### Article reader

> “I want to read without fighting the interface, but sharing, reacting, and joining the discussion should stay close.”

Desktop provides a sticky share/like rail beside the readable article column and sticky table of contents. Tablet and mobile convert those controls into a balanced inline action row, avoiding a viewport-obstructing overlay.

## Findings and resolutions

| Severity | Previous issue | User impact | Resolution |
| --- | --- | --- | --- |
| High | The listing looked like a generic guide grid despite supporting community publishing. | Writers and community participation felt secondary. | Reframed the header, spotlight, feed, cards, and empty state around community voices and contribution. |
| High | Featured posts were excluded only on page one and could reappear later. | Pagination could repeat content and misrepresent the feed. | Centralized spotlight selection and consistently excludes the selected spotlight from every feed page. |
| High | “Popular” meant views only even though likes, comments, and trending score already existed. | Ranking did not reflect community response. | Popular now orders by trending score, likes, comments, views, publication date, and stable ID. |
| Medium | Search, category, and sort were compressed into an unlabeled pill-style toolbar. | Controls were harder to scan, especially at tablet widths and zoom. | Search remains visible; category/writer filters use disclosure; all controls have persistent labels, equal baselines, and explicit actions. |
| Medium | Featured stories used multiple oversized full-width cards. | The regular feed began late and visual hierarchy repeated itself. | Uses one editorial spotlight, followed by a compact writer strip and responsive feed. |
| Medium | Regular cards hid likes, comments, views, avatars, and verification. | Readers could not judge community relevance before opening a post. | Added normalized author and engagement metadata to every card. |
| High | The article header populated only author names although the template expected avatar and verification fields. | Contributor trust and identity silently disappeared. | Extended author population and rebuilt the byline around real contributor metadata. |
| Medium | Article actions were fragmented between header sharing, body quick links, end interactions, and next-step modules. | Readers had to hunt for actions and the page felt assembled from unrelated blocks. | Consolidated share/like/discuss controls into a responsive engagement rail and centralized category presentation. |
| Medium | Category audience, action, and next-step maps lived independently inside EJS. | Copy and destinations could contradict each other. | Added one deterministic article presentation resolver used by the template. |
| Medium | Toast and asynchronous actions lacked complete live/busy state coverage. | Screen-reader and slow-network feedback was incomplete. | Added polite live feedback plus `aria-busy` and disabled-state handling for likes, comments, and reports. |
| Low | Related-post excerpts were rendered by EJS but omitted from the database projection. | The intended supporting copy never appeared. | Extended the related-post selection with excerpt and engagement metadata. |

## Responsive evidence

### Listing

- [1440px desktop](assets/blog-list-desktop.png)
- [768px tablet](assets/blog-list-tablet.png)
- [390px mobile](assets/blog-list-mobile.png)
- [320px mobile](assets/blog-list-mobile-320.png)
- [768px expanded filters](assets/blog-filters-tablet-expanded.png)

The default listing presents a three-column feed on desktop, two columns on tablet, and one column on mobile. Topic paths and writer cards become horizontally scrollable where appropriate without increasing page width. The expanded filter state uses equal-width fields and a separate, aligned sort row.

### Article

- [1440px desktop](assets/blog-post-desktop.png)
- [768px tablet](assets/blog-post-tablet.png)
- [390px mobile](assets/blog-post-mobile.png)
- [320px mobile](assets/blog-post-mobile-320.png)

Desktop keeps engagement and the TOC visible beside a constrained reading measure. Tablet and mobile move both into document flow. At 320px, like, share, and discussion controls remain balanced, readable, and free of horizontal overflow.

## Information architecture rationale

The listing hierarchy is now:

1. Community purpose and contribution action.
2. Search and topic shortcuts.
3. Disclosed filters and explicit sorting.
4. Result context and removable filter chips.
5. One editorial spotlight and compact contributor discovery on the unfiltered first page.
6. Responsive community feed, advertisements, and pagination.

The article hierarchy is now:

1. Topic, audience, title, excerpt, author, and community response.
2. Cover image.
3. Reading navigation and share/like/discuss actions.
4. Compact practical actions and article body.
5. Gallery and tags when available.
6. Category-aware next step.
7. Discussion, reporting, and contributor details.
8. Related community reading.

This order supports the selected community-publishing goal without allowing engagement mechanics to obstruct reading.

## Acceptance criteria

- [x] `/blog` and `/blog/:slug` remain server-rendered.
- [x] Existing `q`, `category`, `author`, `sort`, and `page` URLs remain compatible.
- [x] Default and empty URL parameters are omitted from generated links.
- [x] Canonical URLs exclude sort variants.
- [x] Popular ordering uses existing community engagement signals.
- [x] Spotlight content cannot reappear in paginated feed results.
- [x] Search stays visible; topic and writer filters use progressive disclosure.
- [x] Filter labels, baselines, actions, and “Sort by” are balanced at desktop and tablet widths.
- [x] Cards expose writer identity and views, likes, and comments.
- [x] The feed renders at three, two, and one columns.
- [x] Article author avatars and verification data are populated.
- [x] Desktop engagement is sticky; tablet/mobile engagement remains inline.
- [x] Likes, comments, reports, sharing, gallery, TOC, reading progress, ads, and related posts retain their existing hooks.
- [x] Interactive controls provide visible focus and at least 44px targets where space permits.
- [x] Reduced-motion preferences disable decorative transitions.
- [x] No horizontal scrolling was observed at 320px, 390px, 768px, or 1440px.
- [x] Focused service, template, escaping, and composer tests pass: 28/28.
- [x] Public blog filter smoke passes; the environment continues to emit unrelated Supabase DNS warnings.
- [x] Blog interaction behavior passes 17/17 when run with the repository’s required `CSRF_PROTECTION=0` test setting.

## Follow-up boundaries

The author dashboard, composer, admin moderation, writer profile pages, follower relationships, and new blog schema fields remain out of scope. The compact top-writers module uses the existing aggregation and author-filtered listing rather than introducing a new public profile route.
