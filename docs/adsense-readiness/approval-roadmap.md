# AdSense Approval Work Roadmap

## Authority And Current Decision

This file is the single active tracker for HelloRun's AdSense approval work. The phase files in `phases/`, `implementation-status.md`, and `next-articles-todo.md` are historical evidence, not parallel task queues.

Current decision: **Hold the AdSense review request until Priorities 1-7 pass.**

Current active state:

| Priority | Workstream | Status | Dependency |
| --- | --- | --- | --- |
| 1 | Public link integrity | **Complete** | None |
| 2 | Event heading hierarchy | **Complete** | Priority 1 complete |
| 3 | Metadata and crawl hygiene | **Complete** | Priority 2 complete |
| 4 | Advertising consent architecture | Production implementation verified; policy publication and Google account verification pending | Priority 3 complete |
| 5 | SEO keyword quality | Repository mapping complete; Search Console review pending | Priority 4 account verification |
| 6 | Production quality audit | Release audit passed; post-policy spot check pending | Priority 5 complete |
| 7 | Indexing and approval gate | Blocked | Priority 6 complete |

## One-Priority Operating Rule

- Completion gates remain sequential even when coordinated repository changes for later priorities are prepared in one workstream.
- Do not mark a priority complete until every acceptance criterion and its evidence and completion note are recorded here.
- Keep focused test evidence attributable to each priority.
- A code pass is not enough when a priority includes production, Search Console, AdSense, or CMP verification.
- New findings must be added to the current priority when they are required for its acceptance criteria. Unrelated improvements belong in a separate backlog and must not silently expand the active task.

## Audit Baseline — July 31, 2026

The production audit that created this roadmap recorded:

- 46 sitemap URLs responding successfully.
- 24 published AdSense-eligible guides.
- 54 audited public images loading successfully.
- 84 focused content, trust-page, event, and cookie-preference tests passing.
- A valid public `ads.txt` declaration for `pub-4537208011192461`.
- An AdSense ownership meta tag on public pages.
- Two actionable public internal links returning `404`.
- Five event pages rendering a second `<h1>` inside rich event content.
- Missing canonical URLs on About, How It Works, and Contact.
- A short Privacy Policy meta description.
- Search Console crawl/index coverage and AdSense account-side status not independently verified.
- Certified advertising CMP configuration not independently verified.

## Repository Validation — August 2, 2026

- Focused AdSense, event, trust-page, metadata, policy, and consent verification passed: 90 tests, 0 failures.
- Full DB-free unit verification passed: 965 tests, 0 failures.
- The pre-release production link audit still found one `/runner` failure across 46 sitemap pages and 107 unique same-origin links.
- The pre-release production metadata audit found the nine expected stale-build findings: missing canonicals on About, How It Works, and Contact; a short Privacy description; and duplicate page-level headings on five event pages.
- `robots.txt`, `sitemap.xml`, and `ads.txt` each returned `200` during the production metadata audit.
- These production findings remain release-verification evidence and are not described as failures of the repository implementation.

## Production Release Verification — August 2, 2026

- Released commit `42d96ac` to `main`; the previous release point was `5b59b83`.
- Restarted only the existing PM2 `hellorun` process. Nginx, Cloudflare Tunnel, Cloudflare DNS, and GoDaddy configuration were unchanged.
- PM2 remained online with zero unstable restarts. Direct and public `/healthz` and `/readyz` checks and the public homepage returned `200`.
- The post-release link audit checked 46 sitemap pages and 106 unique same-origin links with zero actionable failures.
- The post-release image audit checked 82 unique images referenced by 46 sitemap pages with zero failures.
- The post-release metadata audit checked 46 sitemap HTML pages with zero findings; `robots.txt`, `sitemap.xml`, and `ads.txt` returned `200`.
- All five registered historical guide URLs returned `301` to their intended canonical articles. Anonymous `/runner/submissions` returned `302` to `/login`.
- Production HTML contained the Google AdSense bootstrap and zero manual ad units while `ADSENSE_MANUAL_PLACEMENTS_ENABLED` remained unset.
- Responsive screenshots covered the homepage, event discovery, a representative event, a representative guide, About, How It Works, Contact, Privacy, and Cookie Policy. Core pages were checked at 320px, 768px, and 1440px without a visible broken layout or horizontal-overflow defect.
- The release-focused suite passed 49/49, the complete DB-free unit suite passed 965/965, and the repository Markdown audit checked 210 files with zero findings.
- Existing non-blocking operational limitation: the Supabase shadow-sync worker continued to report DNS resolution failures for its configured database host. The Mongo-backed application, public traffic, and readiness probes remained healthy; this warning predates and is separate from the AdSense release.

## Priority 1 — Public Link Integrity

**Status:** Complete
**Dependency:** None

### Objective

Remove known broken public navigation and prevent new eligible content from publishing links that fail for anonymous visitors.

### Implementation Checklist

- [x] Replace `/blog/how-to-choose-between-running-distances` with the canonical distance-choice article URL in the schools and organizations guide and its seed metadata.
- [x] Replace the Training-category `View your results` destination at `/runner` with a valid public or authentication-aware destination.
- [x] Add regression coverage for both destinations.
- [x] Add or document a repeatable public internal-link crawl that distinguishes real failures from Cloudflare email-protection links and intentional redirects.

### Acceptance Criteria

- [x] Both known broken links resolve without an actionable `4xx` response for an anonymous visitor.
- [x] The canonical distance-choice URL is used consistently in article content, seed links, and tests.
- [x] Every same-origin link discovered from sitemap pages returns `2xx`, an intentional `3xx`, or is explicitly documented as a non-navigational provider route.
- [x] Focused tests and the public-link crawl pass.

### Verification Evidence

- Source commits pushed to `main` on August 2, 2026:
  - `042f959` — public-link fixes, compatibility redirect, reusable crawl command, and regression tests.
  - `eed3800` — historical no-content commit created while the production mechanism was still incorrectly assumed to be externally triggered.
- Focused verification passed: 22 tests, 0 failures.
- Full unit verification passed: 956 tests, 0 failures.
- The production schools and organizations guide was reconciled with the canonical distance-choice URL. A follow-up dry run reported `changedFields: []`, and the live page contains the canonical URL with the obsolete URL absent.
- The pre-deployment production crawl found 46 sitemap pages, 108 unique same-origin links, and the two expected actionable `404` failures.
- After the article reconciliation, the production crawl found 46 sitemap pages, 107 unique same-origin links, and one remaining actionable `404`: `/runner`, linked from six Training guides.
- Anonymous `/runner/submissions` requests correctly finish at `/login`, confirming the replacement destination is authentication-aware.
- Hosting clarification recorded August 2, 2026: HelloRun is self-hosted on the Ubuntu Inspiron 3443 through PM2, Nginx, and Cloudflare Tunnel; GoDaddy is the registrar and Cloudflare provides DNS/proxying. DigitalOcean is not the application platform and its GitHub check is not a deployment authority.
- Read-only verification confirmed PM2 process `hellorun` uses this repository, but its three-day-old runtime still served the pre-fix application: the public crawl checked 46 sitemap pages and 107 same-origin links with one remaining `/runner` failure from six Training guides. No deployment infrastructure was modified during this work.
- Commit `42d96ac` was released through the existing PM2 process. The post-release crawl checked 46 sitemap pages and 106 unique same-origin links with zero actionable failures.
- Anonymous `/runner/submissions` returned `302` to `/login`, and all five registered legacy guide routes returned the intended canonical `301`.

### Completion Note

Completed August 2, 2026 after the production release and zero-failure public-link crawl.

## Priority 2 — Event Heading Hierarchy

**Status:** Complete
**Dependency:** Priority 1 complete

### Objective

Ensure every public event page has one page-level `<h1>` while preserving the complete rich event description.

### Implementation Checklist

- [x] Normalize rich-description `<h1>` elements to `<h2>` during public sanitization.
- [x] Preserve the heading text, following sections, links, lists, tables, and other allowed content.
- [x] Cover stored HTML and Markdown-derived event descriptions.
- [x] Add regression tests for rich descriptions containing one or multiple `<h1>` elements.

### Acceptance Criteria

- [x] Every sitemap event page renders exactly one `<h1>`.
- [x] Description headings begin at `<h2>` or lower in DB-free rendering tests.
- [x] No supported description text or structure is lost in regression fixtures.
- [x] Unit tests and a production heading scan pass after release.

### Verification Evidence

- `renderEventDetailsContent` converts HTML and Markdown-derived description `<h1>` elements to `<h2>` without changing the stored source.
- Focused event public-view tests cover single and multiple headings, links, lists, tables, and lower headings.
- The production metadata audit found zero heading issues across all 46 sitemap pages, including the five event pages that previously rendered two `<h1>` elements.

### Completion Note

Completed August 2, 2026 after DB-free rendering tests and the production heading scan passed.

## Priority 3 — Metadata And Crawl Hygiene

**Status:** Complete
**Dependency:** Priority 2 complete

### Objective

Give every indexable sitemap page complete, internally consistent metadata and crawl signals.

### Implementation Checklist

- [x] Add canonical URLs to About, How It Works, and Contact.
- [x] Replace the short Privacy Policy meta description with a useful page-specific description.
- [x] Add a sitemap metadata audit for unique titles, useful descriptions, self-referencing canonical URLs, one `<h1>`, `200` responses, and indexable robots directives.
- [x] Add regression coverage for metadata parsing, validation, duplicates, and required public files.

### Acceptance Criteria

- [x] Every sitemap URL returns `200`.
- [x] Every sitemap HTML page has a unique non-empty title, a useful description, a self-referencing canonical URL, exactly one `<h1>`, and no accidental `noindex`.
- [x] `robots.txt`, `sitemap.xml`, and `ads.txt` remain reachable and correct.
- [x] Focused tests and the production metadata scan pass after release.

### Verification Evidence

- Added `npm run adsense:audit-metadata -- --base-url https://hellorun.online`.
- DB-free coverage verifies metadata extraction, minimum description quality, self-canonicals, one-`h1`, indexability, duplicate titles, and required public-file responses.
- The production metadata audit checked 46 sitemap HTML pages with zero findings. About, How It Works, and Contact served self-referencing canonicals; Privacy served the expanded description.
- `robots.txt`, `sitemap.xml`, and `ads.txt` each returned `200`.

### Completion Note

Completed August 2, 2026 after the production metadata and crawl-signal audit passed.

## Priority 4 — Advertising Consent Architecture

**Status:** Production implementation verified; policy publication and Google account verification pending
**Dependency:** Priority 3 complete

### Objective

Make Google’s certified CMP authoritative for advertising consent while HelloRun continues to control functional and analytics choices.

### Implementation Checklist

- [x] Remove contradictory ownership of advertising consent from the HelloRun preference UI and runtime checks.
- [x] Keep Functional and Analytics choices independent and default-denied.
- [x] Align banner, dialog, Cookie Policy, Privacy Policy, consent-mode defaults, ad middleware, and shared layouts with the same consent model.
- [x] Allow the AdSense bootstrap to load the certified Google message without activating manual ad placements.
- [x] Keep manual placements disabled by default behind `ADSENSE_MANUAL_PLACEMENTS_ENABLED=true`.
- [x] Record the required Google Privacy & Messaging account configuration for EEA, UK, and Swiss visitors.

### Acceptance Criteria

- [x] The repository UI and policy sources clearly identify which system controls each consent category.
- [x] Analytics remains disabled until the HelloRun Analytics choice is granted.
- [ ] Google advertising behavior follows the certified CMP and consent signals.
- [x] No manual AdSense unit renders during approval preparation unless the explicit post-approval environment gate is enabled.
- [x] DB-free consent tests cover first visit, acceptance, rejection, preference changes, legacy cookies, regional-message ownership, and JavaScript failure behavior.

### Verification Evidence

- HelloRun preference schema v2 stores Functional and Analytics only.
- Signed schema v1 cookies remain readable; their obsolete advertising bit is ignored and the next save writes schema v2.
- Google ad consent defaults remain denied for the certified CMP to update; HelloRun updates only Analytics consent.
- Account-side Google Privacy & Messaging configuration remains unverified.
- The authenticated account checklist and official Google references are recorded in [`google-account-verification.md`](google-account-verification.md).
- Updated Privacy and Cookie policy sources require the normal draft review and publication workflow before their public production wording changes.
- Production rendered the Google AdSense bootstrap and zero manual ad units with the manual-placement environment gate unset.
- The normal draft workflow retained published Privacy v1.4 and Cookie Policy v1.3 and prepared idempotent Privacy v1.7 and Cookie Policy v1.5 drafts. Full-admin review and publication remain pending.

### Completion Note

Pending.

## Priority 5 — SEO Keyword Quality

**Status:** Repository mapping complete; Search Console review pending
**Dependency:** Priority 4 complete

### Objective

Turn the uncurated keyword notes into a user-focused intent map that strengthens existing authoritative pages without producing filler.

### Implementation Checklist

- [ ] Review Search Console query and page data when access is available.
- [x] Remove unrelated, outdated, trademark-driven, and unsupported commercial queries.
- [x] Classify retained opportunities by user intent, audience, evidence, and target page.
- [x] Map useful queries to existing pages before identifying a genuine content gap.
- [x] Define one primary topic and a small set of natural supporting terms per target page.
- [x] Document exclusions and prohibit keyword stuffing, doorway pages, mass variations, and articles created only to reach a count.

### Acceptance Criteria

- [x] Every retained keyword supports HelloRun's running-event audience and public purpose.
- [x] Every retained keyword has an existing target page.
- [x] No target page competes with another HelloRun page for the same primary intent in the repository map.
- [x] `seo-keywords.md` is an actionable intent-to-page map rather than an unreviewed phrase list.

### Verification Evidence

- `seo-keywords.md` is now an intent-to-page map for existing canonical pages, with an explicit evidence boundary, exclusions, anti-cannibalization rules, and a Search Console review checklist.
- No new article is proposed without Search Console evidence of an unmet relevant intent.

### Completion Note

Pending.

## Priority 6 — Production Quality Audit

**Status:** Release audit passed; post-policy spot check pending
**Dependency:** Priority 5 complete

### Objective

Repeat the complete production audit after all repository-controlled approval work is deployed.

### Implementation Checklist

- [x] Audit sitemap responses, internal links, images, titles, descriptions, canonicals, headings, and robots directives.
- [x] Review homepage, events, event details, blog, representative articles, trust pages, and policy pages on desktop and mobile widths.
- [ ] Check navigation, focus behavior, horizontal overflow, unexpected dialogs, placeholders, duplicate content, and misleading claims.
- [x] Run focused AdSense readiness tests and the full unit suite.
- [x] Record commands, production URLs, counts, results, screenshots where useful, and accepted limitations.

### Acceptance Criteria

- [ ] No actionable broken public link or image remains.
- [ ] No sitemap page has a metadata, heading, response, or indexing defect.
- [ ] Public pages remain useful and operable at 320px, common mobile, tablet, and desktop widths.
- [ ] Focused tests and the full unit suite pass.
- [ ] Any accepted limitation is non-blocking, justified, and recorded here.

### Verification Evidence

- Link audit: 46 sitemap pages, 106 unique same-origin links, zero actionable failures.
- Image audit: 82 unique images referenced by 46 sitemap pages, zero failures.
- Metadata audit: 46 sitemap HTML pages and three required public files, zero findings.
- Responsive browser screenshots covered core public and policy surfaces at 320px, 768px, and 1440px.
- Release-focused tests passed 49/49; full DB-free unit tests passed 965/965.
- The known Supabase shadow-sync DNS warning is recorded as a non-blocking operational limitation because the application and readiness checks remained healthy.
- A final Privacy and Cookie Policy spot check remains required after their reviewed drafts are published.

### Completion Note

Pending.

## Priority 7 — Indexing And Approval Gate

**Status:** Blocked
**Dependency:** Priority 6 complete

### Objective

Complete external crawl, account, policy, and consent checks before requesting AdSense review.

### Implementation Checklist

- [ ] Submit or refresh `https://hellorun.online/sitemap.xml` in Google Search Console.
- [ ] Inspect the homepage, Events, Blog, About, How It Works, FAQ, and the three newest guides.
- [ ] Confirm there is no broad crawl or indexing failure affecting intended public content.
- [ ] Verify `hellorun.online` ownership in AdSense.
- [ ] Verify the AdSense `ads.txt` status is `Authorized`.
- [ ] Complete required identity, address, payment, and account setup tasks.
- [ ] Confirm the AdSense Policy Center has no unresolved blocking issue.
- [ ] Confirm the certified Google CMP and regional message configuration.
- [ ] Record the request date and resulting AdSense site status.

### Acceptance Criteria

- [ ] Search Console accepts the sitemap without a site-wide error.
- [ ] Core pages and the three newest guides are crawled or indexed without a shared technical blocker.
- [ ] AdSense ownership, account setup, Policy Center, `ads.txt`, and CMP checks pass.
- [ ] Priorities 1-6 are complete with evidence.
- [ ] The AdSense review request is submitted once, without removing and re-adding the site.

### Verification Evidence

Pending.

### Completion Note

Pending.

## Post-Approval Boundary

Ad-slot creation, slot activation, placement tuning, revenue analysis, and post-launch ad-experience monitoring are outside this approval roadmap. After approval, follow [`adsense-placement-strategy.md`](adsense-placement-strategy.md) and create a separate controlled activation plan.
