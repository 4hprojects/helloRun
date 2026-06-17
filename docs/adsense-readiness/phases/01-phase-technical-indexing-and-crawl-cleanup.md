# Phase 1 - Technical Indexing And Crawl Cleanup

Status: complete. Implemented in PR #10 and merged to `main`.

## Objective

Make sure search engines and AdSense reviewers can clearly discover the valuable public pages of HelloRun while avoiding low-value utility pages.

This phase focuses on:

- `robots.txt`
- `sitemap.xml`
- noindex rules
- public vs private route separation
- empty or thin utility pages
- crawlable public content

## Why This Matters

AdSense may review pages beyond the homepage. If login, signup, dashboard, submit forms, empty shop pages, or utility screens are indexed, the site can look thin even if the homepage is polished.

## Routes To Inspect

Inspect the project and identify actual route names before editing.

Likely public routes:

- `/`
- `/events`
- `/events/[slug]`
- `/blog`
- `/blog/[slug]`
- `/about`
- `/how-it-works`
- `/faq`
- `/contact`
- `/privacy`
- `/terms`
- `/cookie-policy`
- `/data-usage-policy`
- `/refund-policy`
- `/community-guidelines`

Likely utility or private routes:

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/dashboard`
- `/admin`
- `/organizer`
- `/account`
- `/profile`
- `/submit`
- `/api`
- empty `/shop` if shop has no real public content

## Tasks

1. Audit current metadata behavior.
   - Check if pages use dynamic metadata.
   - Check whether robots directives already exist.
   - Check if app routes accidentally expose modal or form text in public page HTML.

2. Create or fix `robots.txt`.
   - Allow public content.
   - Disallow private, admin, API, account, and utility routes.
   - Include sitemap location.

3. Create or fix `sitemap.xml`.
   - Include only useful public pages.
   - Include public event pages that have meaningful content.
   - Include blog posts.
   - Include core trust and guide pages.
   - Exclude login, signup, dashboards, API routes, empty pages, user account pages, and modal routes.

4. Add noindex rules to utility pages.
   - Login
   - Signup
   - Forgot password
   - Reset password
   - Dashboard
   - Admin
   - Organizer-only pages
   - Account settings
   - Submit result routes or modals if they have standalone URLs
   - Empty shop page if not ready

5. Check page titles and descriptions.
   - Homepage should clearly describe HelloRun as a running event and virtual run platform.
   - Blog posts should have unique titles and descriptions.
   - Event pages should have unique metadata.
   - Legal pages should be clear but not over-optimized.

6. Remove or hide empty public pages.
   - If `/shop` has no real content, hide it from header navigation and noindex it.
   - If pages are placeholders, either complete them or noindex them.

## Suggested `robots.txt`

Adjust paths based on the actual project routes.

```txt
User-agent: *
Allow: /

Disallow: /api
Disallow: /admin
Disallow: /dashboard
Disallow: /organizer
Disallow: /account
Disallow: /login
Disallow: /signup
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /submit

Sitemap: https://hellorun.online/sitemap.xml
```

## Acceptance Criteria

Phase 1 is complete when:

- `https://hellorun.online/robots.txt` loads.
- `https://hellorun.online/sitemap.xml` loads.
- Sitemap includes public content only.
- Login, signup, dashboard, admin, API, and submit utility routes are excluded from sitemap.
- Utility routes have noindex where appropriate.
- Header navigation does not promote empty pages.
- Important public pages have unique title and description metadata.
- No public page exposes unrelated modal text in its indexed HTML.

## Agent Prompt

Use this prompt with Codex or Claude:

```txt
You are working on the HelloRun codebase. Complete Phase 1 of the AdSense cleanup.

Goal: Fix technical indexing and crawl quality so Google and AdSense can discover valuable public pages while avoiding low-value utility pages.

Tasks:
1. Inspect the project routing and metadata patterns before editing.
2. Create or fix robots.txt.
3. Create or fix sitemap.xml.
4. Ensure sitemap includes only useful public pages.
5. Add noindex metadata to login, signup, forgot/reset password, dashboard, admin, organizer, account, submit, API, and other utility routes.
6. Hide or noindex empty public pages such as Shop if they are not ready.
7. Make sure public pages have unique titles and descriptions.
8. Do not refactor unrelated features.

Acceptance checks:
- robots.txt loads and includes the sitemap.
- sitemap.xml loads and excludes utility/private pages.
- public pages remain accessible.
- no login, dashboard, admin, API, or modal-only route appears in the sitemap.
- no placeholder or empty page is promoted in public navigation.

Report the files changed and any routes that still need content work.
```
