# HelloRun AdSense Fix Master Workflow

Status: implemented and merged to `main` through PR #10.

This file is retained as the original phase workflow. For the current implementation state, see `../implementation-status.md`.

## Purpose

This workflow breaks the HelloRun AdSense cleanup into phases that can be executed one at a time using Codex, Claude, or another coding assistant.

The goal is to address the AdSense rejection reason:

- Low value content
- Thin or shallow public pages
- Repeated or template-heavy event content
- Weak public content depth compared with app utility pages
- Possible indexing of login, dashboard, submit, and other low-value utility routes

## Main Strategy

HelloRun should look like a useful public running resource first, and a running platform second.

Before requesting another AdSense review, the public site should have:

- Strong homepage
- Expanded About page
- Expanded How It Works page
- Complete FAQ page
- Complete Contact page
- Clean event pages
- Event recap content for ended events
- 10 to 15 useful blog posts
- Working sitemap.xml
- Working robots.txt
- Low-value utility pages hidden from indexing
- No placeholders or unfinished public labels

## Recommended Phase Order

1. Phase 1 - Technical Indexing and Crawl Cleanup
2. Phase 2 - Event Page Cleanup
3. Phase 3 - Trust Page Expansion
4. Phase 4 - How It Works and FAQ Expansion
5. Phase 5 - Blog Content System and Editorial Structure
6. Phase 6 - Initial Blog Content Batch
7. Phase 7 - User Experience and Mobile QA
8. Phase 8 - Final AdSense Readiness Audit

## Files

- `01-phase-technical-indexing-and-crawl-cleanup.md`
- `02-phase-event-page-cleanup.md`
- `03-phase-trust-page-expansion.md`
- `04-phase-how-it-works-and-faq.md`
- `05-phase-blog-content-system.md`
- `06-phase-initial-blog-content-batch.md`
- `07-phase-ux-mobile-and-link-qa.md`
- `08-phase-final-adsense-readiness-audit.md`

## How To Use With Codex Or Claude

Use one phase file at a time.

Recommended process:

1. Open the phase file.
2. Give the coding assistant access to the HelloRun repository.
3. Paste the "Agent Prompt" section.
4. Ask the assistant to inspect the repository before editing.
5. Let it implement the phase.
6. Run the acceptance checks listed in the file.
7. Commit or save only after the phase passes.

## Global Rules For Every Phase

The agent must:

- Inspect the existing project structure first.
- Follow the current routing, styling, and content management patterns.
- Avoid unrelated refactors.
- Avoid deleting public content unless the task explicitly says to remove or hide it.
- Preserve existing working features.
- Test affected public routes.
- Keep public content honest and specific.
- Avoid exaggerated claims such as "thousands of runners" unless supported by actual data.
- Avoid publishing placeholder content.
- Avoid adding ads to login, signup, dashboards, forms, or private pages.

## AdSense Review Target

Do not request AdSense review until all of these are true:

- Public content pages are substantial and useful.
- Event pages do not look duplicated or under construction.
- Blog has at least 10 strong posts.
- Sitemap and robots.txt are working.
- Private and utility pages are noindexed or blocked where appropriate.
- Mobile layout is clean.
- No broken navigation links remain.
- Search Console has no obvious indexing errors for important public pages.
