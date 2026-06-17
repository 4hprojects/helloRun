# Phase 8 - Final AdSense Readiness Audit

Status: complete for local code. Production crawl checks remain after deployment.

## Objective

Perform the final review before requesting AdSense review again.

This phase is not mainly for adding new features. It is for checking whether HelloRun now looks like a valuable public site.

## Audit Areas

1. Public content depth
2. Event page quality
3. Blog quality
4. Trust pages
5. Navigation
6. Technical indexing
7. Mobile experience
8. AdSense policy fit

## Public Content Checklist

Confirm:

- Homepage clearly explains HelloRun.
- About page is substantial.
- How It Works page is substantial.
- FAQ page is complete.
- Contact page has real contact information.
- Blog has at least 10 strong posts.
- Event pages are clean and useful.
- Ended event pages have recap content.
- Legal pages are accessible.

## Event Page Checklist

Confirm:

- No repeated major content blocks.
- No inconsistent dates.
- No "Badges pending."
- No unnecessary "Location TBA."
- No duplicate categories.
- No duplicate registration details.
- Ended events have recap value.
- Active events have clear registration and submission rules.

## Blog Checklist

Confirm:

- At least 10 complete posts are public.
- Posts are original and useful.
- Posts have categories.
- Posts show author and date.
- Posts have unique metadata.
- Posts use internal links.
- Posts are not generic filler.
- No placeholder posts are visible.

## Trust Checklist

Confirm:

- About identifies what HelloRun is and who it serves.
- Contact includes email and location.
- Privacy Policy is accessible.
- Terms and Conditions are accessible.
- Cookie or data usage disclosures are accessible.
- Author identity is visible on blog posts.
- Claims are honest and not inflated.

## Technical Checklist

Confirm:

- `https://hellorun.online/robots.txt` works.
- `https://hellorun.online/sitemap.xml` works.
- Sitemap includes public content pages.
- Sitemap excludes utility and private pages.
- Login/signup/dashboard/admin/API routes are noindexed or excluded.
- No important public page is accidentally blocked.
- Public pages have unique titles and descriptions.

## User Experience Checklist

Confirm:

- Mobile layout works.
- Desktop layout works.
- Header links work.
- Footer links work.
- Event cards work.
- Blog cards work.
- Images load.
- No horizontal scroll on mobile.
- No modal opens unexpectedly.
- No indexed page contains unrelated hidden form text.

## Ad Placement Recommendation After Approval

If AdSense approves the site, place ads only on:

- Blog posts
- Guide pages
- Event recap pages
- Public resource pages

Avoid ads on:

- Login
- Signup
- Forgot password
- Dashboard
- Submit result forms
- Admin pages
- Organizer dashboards
- Payment pages
- Empty pages

## Review Submission Recommendation

Request AdSense review only when:

- all previous phase acceptance criteria pass
- the site has been deployed
- Search Console has had time to crawl the important pages
- sitemap is submitted in Search Console
- public pages are accessible without login

## Acceptance Criteria

Phase 8 is complete when:

- The audit produces a pass/fail report.
- Any remaining blockers are fixed.
- Any non-blocking improvements are documented.
- The site is ready for AdSense review request.

## Agent Prompt

Use this prompt with Codex or Claude:

```txt
You are working on the HelloRun codebase. Complete Phase 8 of the AdSense cleanup.

Goal: Perform a final AdSense readiness audit before requesting review again.

Tasks:
1. Inspect the deployed or local public site.
2. Check homepage, events, event details, blog, blog posts, About, How It Works, FAQ, Contact, Privacy, and Terms.
3. Verify robots.txt and sitemap.xml.
4. Confirm private and utility pages are excluded from sitemap and noindexed where appropriate.
5. Check mobile and desktop layout.
6. Search for placeholder, repeated, inconsistent, or unfinished public content.
7. Verify at least 10 strong blog posts exist.
8. Produce a pass/fail report.
9. Fix small issues found during the audit if safe and scoped.
10. List remaining blockers separately from optional improvements.

Acceptance checks:
- Final report clearly says whether the site is ready for AdSense review.
- Any remaining blocker has a specific fix.
- Public pages are content-rich, accurate, and usable.

Report the final readiness status and all files changed.
```
