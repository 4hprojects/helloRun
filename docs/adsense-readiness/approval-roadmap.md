# AdSense Approval Work Roadmap

## Authority And Current Decision

This file is the single active tracker for HelloRun's AdSense approval work. The phase files in `phases/`, `implementation-status.md`, and `next-articles-todo.md` are historical evidence, not parallel task queues.

Current decision: **Hold the AdSense review request until Priorities 1-7 pass.**

Current active state:

| Priority | Workstream | Status | Dependency |
| --- | --- | --- | --- |
| 1 | Public link integrity | **In progress** | None |
| 2 | Event heading hierarchy | Blocked | Priority 1 complete |
| 3 | Metadata and crawl hygiene | Blocked | Priority 2 complete |
| 4 | Advertising consent architecture | Blocked | Priority 3 complete |
| 5 | SEO keyword quality | Blocked | Priority 4 complete |
| 6 | Production quality audit | Blocked | Priority 5 complete |
| 7 | Indexing and approval gate | Blocked | Priority 6 complete |

## One-Priority Operating Rule

- Only one priority may be `Next` or `In progress` at a time.
- Change `Next` to `In progress` when implementation begins.
- Do not unblock the following priority until the current priority meets every acceptance criterion and its evidence and completion note are recorded here.
- Complete each priority in a separate commit with focused tests.
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

## Priority 1 — Public Link Integrity

**Status:** In progress
**Dependency:** None

### Objective

Remove known broken public navigation and prevent new eligible content from publishing links that fail for anonymous visitors.

### Implementation Checklist

- [x] Replace `/blog/how-to-choose-between-running-distances` with the canonical distance-choice article URL in the schools and organizations guide and its seed metadata.
- [x] Replace the Training-category `View your results` destination at `/runner` with a valid public or authentication-aware destination.
- [x] Add regression coverage for both destinations.
- [x] Add or document a repeatable public internal-link crawl that distinguishes real failures from Cloudflare email-protection links and intentional redirects.

### Acceptance Criteria

- [ ] Both known broken links resolve without an actionable `4xx` response for an anonymous visitor.
- [x] The canonical distance-choice URL is used consistently in article content, seed links, and tests.
- [ ] Every same-origin link discovered from sitemap pages returns `2xx`, an intentional `3xx`, or is explicitly documented as a non-navigational provider route.
- [ ] Focused tests and the public-link crawl pass.

### Verification Evidence

- Source commits pushed to `main` on August 2, 2026:
  - `042f959` — public-link fixes, compatibility redirect, reusable crawl command, and regression tests.
  - `eed3800` — no-content deployment retrigger after production remained on the previous build.
- Focused verification passed: 22 tests, 0 failures.
- Full unit verification passed: 956 tests, 0 failures.
- The production schools and organizations guide was reconciled with the canonical distance-choice URL. A follow-up dry run reported `changedFields: []`, and the live page contains the canonical URL with the obsolete URL absent.
- The pre-deployment production crawl found 46 sitemap pages, 108 unique same-origin links, and the two expected actionable `404` failures.
- After the article reconciliation, the production crawl found 46 sitemap pages, 107 unique same-origin links, and one remaining actionable `404`: `/runner`, linked from six Training guides.
- Anonymous `/runner/submissions` requests correctly finish at `/login`, confirming the replacement destination is authentication-aware.
- Deployment blocker observed August 2, 2026: production still returns `404` for the compatibility slug and still renders `/runner`, so the application build containing `042f959` is not live. GitHub reports DigitalOcean check suites for `042f959` and `eed3800` as `queued` with no check runs; the workspace has no DigitalOcean or Render deployment credentials, and GitHub denied a check-suite rerequest.

### Completion Note

Pending production deployment and a zero-failure public-link crawl. Do not advance Priority 2 until both are recorded.

## Priority 2 — Event Heading Hierarchy

**Status:** Blocked
**Dependency:** Priority 1 complete

### Objective

Ensure every public event page has one page-level `<h1>` while preserving the complete rich event description.

### Implementation Checklist

- [ ] Normalize rich-description `<h1>` elements to `<h2>` during rendering or sanitization.
- [ ] Preserve the heading text, following sections, links, lists, tables, and other allowed content.
- [ ] Cover stored HTML and Markdown-derived event descriptions.
- [ ] Add regression tests for rich descriptions containing one or multiple `<h1>` elements.

### Acceptance Criteria

- [ ] Every sitemap event page renders exactly one `<h1>`.
- [ ] Description headings begin at `<h2>` or lower.
- [ ] No event description text or supported structure is lost.
- [ ] Unit tests and a production heading scan pass.

### Verification Evidence

Pending.

### Completion Note

Pending.

## Priority 3 — Metadata And Crawl Hygiene

**Status:** Blocked
**Dependency:** Priority 2 complete

### Objective

Give every indexable sitemap page complete, internally consistent metadata and crawl signals.

### Implementation Checklist

- [ ] Add canonical URLs to About, How It Works, and Contact.
- [ ] Replace the short Privacy Policy meta description with a useful page-specific description.
- [ ] Audit sitemap pages for unique titles, useful descriptions, self-referencing canonical URLs, one `<h1>`, `200` responses, and indexable robots directives.
- [ ] Add regression coverage for the corrected trust-page metadata.

### Acceptance Criteria

- [ ] Every sitemap URL returns `200`.
- [ ] Every sitemap HTML page has a unique non-empty title, a useful description, a self-referencing canonical URL, exactly one `<h1>`, and no accidental `noindex`.
- [ ] `robots.txt`, `sitemap.xml`, and `ads.txt` remain reachable and correct.
- [ ] Focused tests and the production metadata scan pass.

### Verification Evidence

Pending.

### Completion Note

Pending.

## Priority 4 — Advertising Consent Architecture

**Status:** Blocked
**Dependency:** Priority 3 complete

### Objective

Make Google’s certified CMP authoritative for advertising consent while HelloRun continues to control functional and analytics choices.

### Implementation Checklist

- [ ] Remove contradictory ownership of advertising consent from the HelloRun preference UI and runtime checks.
- [ ] Keep Functional and Analytics choices independent and default-denied.
- [ ] Align banner, dialog, Cookie Policy, Privacy Policy, consent-mode defaults, ad middleware, and shared layouts with the same consent model.
- [ ] Confirm how the AdSense script loads the certified Google message without activating manual ad placements.
- [ ] Keep all manual placement slot IDs blank or placements disabled during approval preparation.
- [ ] Record the required Google Privacy & Messaging account configuration for EEA, UK, and Swiss visitors.

### Acceptance Criteria

- [ ] The public UI and policies clearly identify which system controls each consent category.
- [ ] Analytics remains disabled until the HelloRun Analytics choice is granted.
- [ ] Google advertising behavior follows the certified CMP and consent signals.
- [ ] No manual AdSense unit renders during approval preparation.
- [ ] Consent tests cover first visit, acceptance, rejection, preference changes, regional-message ownership, and JavaScript failure behavior.

### Verification Evidence

Pending.

### Completion Note

Pending.

## Priority 5 — SEO Keyword Quality

**Status:** Blocked
**Dependency:** Priority 4 complete

### Objective

Turn the uncurated keyword notes into a user-focused intent map that strengthens existing authoritative pages without producing filler.

### Implementation Checklist

- [ ] Review Search Console query and page data when access is available.
- [ ] Remove unrelated, outdated, trademark-driven, and unsupported commercial queries.
- [ ] Classify retained opportunities by user intent, audience, evidence, and target page.
- [ ] Map useful queries to existing pages before identifying a genuine content gap.
- [ ] Define one primary topic and a small set of natural supporting terms per target page.
- [ ] Document exclusions and prohibit keyword stuffing, doorway pages, mass variations, and articles created only to reach a count.

### Acceptance Criteria

- [ ] Every retained keyword supports HelloRun's running-event audience and public purpose.
- [ ] Every retained keyword has an existing target page or a documented evidence-backed content gap.
- [ ] No target page competes with another HelloRun page for the same primary intent without a consolidation decision.
- [ ] `seo-keywords.md` becomes an actionable intent-to-page map rather than an unreviewed phrase list.

### Verification Evidence

Pending.

### Completion Note

Pending.

## Priority 6 — Production Quality Audit

**Status:** Blocked
**Dependency:** Priority 5 complete

### Objective

Repeat the complete production audit after all repository-controlled approval work is deployed.

### Implementation Checklist

- [ ] Audit sitemap responses, internal links, images, titles, descriptions, canonicals, headings, and robots directives.
- [ ] Review homepage, events, event details, blog, representative articles, trust pages, and policy pages on desktop and mobile widths.
- [ ] Check navigation, focus behavior, horizontal overflow, unexpected dialogs, placeholders, duplicate content, and misleading claims.
- [ ] Run focused AdSense readiness tests and the full unit suite.
- [ ] Record commands, production URLs, counts, results, screenshots where useful, and accepted limitations.

### Acceptance Criteria

- [ ] No actionable broken public link or image remains.
- [ ] No sitemap page has a metadata, heading, response, or indexing defect.
- [ ] Public pages remain useful and operable at 320px, common mobile, tablet, and desktop widths.
- [ ] Focused tests and the full unit suite pass.
- [ ] Any accepted limitation is non-blocking, justified, and recorded here.

### Verification Evidence

Pending.

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
