# HelloRun Blog Run Hub UX Todo

_Status: Active backlog — not started as of June 29, 2026. This is Priority 3 after production deployment and homepage P1 fixes._

Purpose: review and improve the public `/blog` experience so it feels like a HelloRun running and event guide hub, not a generic blog index and article slug view.

This todo focuses on the public reader experience first:

- `/blog`
- `/blog/:slug`
- public category, tag, search, and related-post discovery

Author dashboard, composer, and admin moderation improvements are out of scope for this pass unless they directly affect the public reading experience.

## Current context

The live public blog routes are currently served by `pageRoutes` before `blogRoutes`:

- `src/routes/pageRoutes.js`
- `src/controllers/page.controller.js`
- `src/views/pages/blog.ejs`
- `src/views/pages/blog-post.ejs`

There is also a richer blog module:

- `src/routes/blog.routes.js`
- `src/controllers/blog.controller.js`
- `src/views/public/blog/index.ejs`
- `src/views/public/blog/post.ejs`

Because `pageRoutes` is mounted before `blogRoutes`, the `/blog` and `/blog/:slug` routes in `blog.routes.js` appear to be shadowed for the main public listing and slug pages. Before large UI changes, confirm and document which public blog route/view is canonical.

## Current workflow review

### Blog index

Current `/blog` supports:

- search
- category filter
- sort by latest, oldest, popular
- featured posts
- regular post grid
- pagination
- blog card cover image fallback
- write CTA
- authenticated user link to `My Blogs`
- AdSense placement handling
- empty states

Current opportunity:

The page is functional, but it reads like a standard content grid. It should more clearly guide runners and organizers by intent.

### Blog post page

Current `/blog/:slug` supports:

- SEO metadata and canonical URL
- title, excerpt, category, author, publish date, read time, views
- share buttons
- reading progress
- table of contents
- cover image
- article body with in-article ad slot
- tags
- likes
- comments
- report post
- author box
- gallery modal
- related posts

Current opportunity:

The slug page has useful pieces, but the experience is still article-first. It should become journey-first: what can the reader do next in HelloRun after reading?

## UX problems and opportunities

- The blog index does not strongly segment readers by intent.
- Category filters exist, but they are not framed as useful paths like proof help, beginner running, certificates, badges, or organizer guides.
- Blog slug pages do not yet have a strong HelloRun action layer.
- Related posts are generic instead of framed as "continue this path."
- Public posts are not strongly connected to events, proof submission, certificates, badges, leaderboard behavior, or organizer workflows.
- The write CTA is visible, but the reader next step is less clear.
- Duplicate public blog routes/views increase the risk of improving a view that is not actually live.

## Phase 1: Clarify public blog source of truth

Todo:

- Confirm which route/controller/view owns live `/blog`.
- Confirm which route/controller/view owns live `/blog/:slug`.
- Decide whether `pageController` or `blogController` should own public blog pages.
- Remove, retire, or clearly document shadowed routes/views.
- Move useful ideas from the shadowed public blog module into the canonical route if needed.
- Add a short comment or docs note naming the canonical public blog route and view.

Acceptance criteria:

- A developer can identify the active `/blog` implementation in under one minute.
- There are no duplicate public `/blog` routes that create ambiguity.
- Tests still hit the canonical public blog path.

## Phase 2: Reframe `/blog` as a Run Hub

Todo:

- Replace generic blog intro framing with a clearer Run Hub message.
- Add intent-based entry points, such as:
  - Start a Virtual Run
  - Submit Proof Correctly
  - Improve Your Run
  - Understand Certificates and Badges
  - Organizer Playbook
- Keep search, category, and sort, but make them secondary to guided discovery.
- Add a "popular guide paths" or "recommended next reads" section.
- Make featured posts feel curated around runner/organizer goals, not just highlighted content.
- Keep the write CTA, but separate it visually from reader navigation.

Acceptance criteria:

- A first-time visitor understands how the blog helps them run, submit proof, earn certificates/badges, or organize events.
- The page still supports existing search/category/sort behavior.
- The layout remains usable on mobile.

## Phase 3: Make `/blog/:slug` non-typical

Todo:

- Add a compact "Who this helps" block near the top of the post.
- Add a "Run Action Panel" near the top or side of the article with contextual links:
  - Browse events
  - How proof submission works
  - FAQ
  - Certificate or badge guidance
  - Organizer resources, when relevant
- Add a "Next step" CTA near the end of each post based on category or tags.
- Rename or redesign related posts as "Continue this path."
- Keep comments, likes, share, and reports, but make them support the reading journey rather than dominate it.
- Keep the table of contents, but ensure it does not compete with the action panel on mobile.

Acceptance criteria:

- Blog post pages feel tied to HelloRun workflows, not isolated articles.
- Readers get a clear next action after reading.
- Existing interactions still work: like, comment, report, share, gallery, TOC.

## Phase 4: Improve discovery metadata without schema changes first

Todo:

- Use existing category, tags, title, excerpt, and content to derive reader-intent labels.
- Suggested labels:
  - Beginner Runner
  - Proof Submission
  - Organizer Guide
  - Event Prep
  - Certificate Help
  - Badge Help
  - Leaderboard Help
- Show labels on cards and/or detail pages only when useful.
- Avoid a schema migration in the first pass unless existing fields prove insufficient.

Acceptance criteria:

- Blog cards communicate the practical purpose of each article faster.
- Intent labels do not duplicate category text awkwardly.
- Existing blog creation and admin review flows continue to work.

## Phase 5: User Blog SEO Assistant follow-up

This is a separate future enhancement, but it pairs well with the Run Hub direction.

Todo:

- Add optional system-suggested SEO fields for user-created blogs.
- Suggestions should include:
  - SEO title
  - meta description
  - excerpt
  - tags
  - reader intent label
- Suggestions should be editable by the user.
- The system should not silently generate hidden SEO metadata without showing it to the author or admin.
- Admin review should still be the final quality gate before publishing.

Acceptance criteria:

- User posts get better previews and metadata without removing author control.
- Admins can see and adjust generated suggestions before publishing.
- Public meta description still falls back safely to excerpt when SEO description is empty.

## Phase 6: Mobile and accessibility QA

Todo:

- Test `/blog` on mobile, tablet, and desktop.
- Test `/blog/:slug` on mobile, tablet, and desktop.
- Verify the following do not overlap or clip:
  - filters
  - cards
  - action panel
  - table of contents
  - share menu
  - comments
  - gallery modal
- Verify keyboard navigation for:
  - search/filter form
  - post cards
  - share buttons
  - TOC links
  - comments
  - report form
- Verify cover image fallback behavior.

Acceptance criteria:

- No horizontal overflow on mobile.
- Interactive controls are reachable by keyboard.
- Icon-only controls have accessible labels or titles.
- Text wraps before it clips.

## Test checklist

Run targeted checks after implementation:

```bash
node --test tests/public-search-filters.smoke.test.js --test-name-pattern blog
node --test tests/blog-interaction.integration.test.js
node --test tests/sitemap-readiness.smoke.test.js --test-name-pattern blog
```

Compile active EJS views:

```bash
node -e "const fs=require('fs'); const ejs=require('ejs'); for (const file of ['src/views/pages/blog.ejs','src/views/pages/blog-post.ejs']) ejs.compile(fs.readFileSync(file,'utf8'),{filename:file});"
```

Manual QA routes:

- `/blog`
- `/blog?q=proof`
- `/blog?category=Training`
- `/blog?sort=popular`
- `/blog/:slug`
- `/blog/:slug` while logged out
- `/blog/:slug` while logged in
- `/blog/category/:categorySlug`
- `/blog/tag/:tagSlug`

## Implementation notes

- Preserve current public SEO behavior.
- Preserve public readability without login.
- Preserve existing AdSense safety behavior for thin filtered pages.
- Avoid database schema changes in the first UI pass.
- Do not remove comments, likes, reports, sharing, gallery, or related posts.
- Treat the first UI pass as a reader-experience improvement, not a full CMS rewrite.
