# User-Generated Blog Moderation and Ad Eligibility

HelloRun treats publication, search indexing, and advertising as separate privileges. A saved draft is not public, and a published URL is not automatically eligible for search indexing or Google advertisements.

## Publication baseline

A community post may be submitted for review only when it contains at least 500 substantive words, three meaningful semantic content units, a valid title and category, and a cover image. Repeated filler does not satisfy the word requirement. Drafts may remain shorter while their authors work on them.

Every initial post and published-post revision requires an administrator decision. Approval is bound to a hash of the reviewed title, excerpt, category, cover, and content. Changing reviewed content invalidates the previous eligibility decision.

## Required review

Reviewers must confirm originality and publishing rights for every post. Safe site-relative links and external HTTPS sources are permitted. External links receive `ugc`, `nofollow`, `noopener`, and `noreferrer` relationship attributes and require reviewer confirmation. Unsafe schemes, credentials in URLs, raw-IP destinations, malformed URLs, and configured URL shorteners are rejected.

Nutrition, injury-prevention, mental-health, and detected health-claim content requires the health checklist. Reviewers confirm that experience is distinguished from professional advice, factual claims are sourced where appropriate, dangerous or individualized guidance is absent, and credentials and emergency guidance are represented responsibly.

Spam, promotion, repetition, and similarity signals assist review but do not independently prove wrongdoing. Confirmed copied or infringing content must be rejected. An administrator may approve a false-positive signal only with a recorded explanation.

## Advertising and indexing

Ads and normal indexing are allowed only when the published content matches a current eligible snapshot and completed publication review. Ineligible legacy posts may remain directly accessible, but they are ad-free, marked `noindex, follow`, and excluded from discovery, feeds, and the sitemap.

Search, category, tag, author, or base listings with fewer than three eligible posts are ad-free and `noindex, follow`. Author dashboards, composers, previews, drafts, pending reviews, rejected posts, and submission pages are ad-free and `noindex, nofollow`.

## Reporting

Authenticated users may report published posts and comments for spam, plagiarism, promotion, unsafe medical advice, abuse, or another concern. Reports do not automatically disable advertisements because automatic suppression could be abused. Administrators remain responsible for timely review and proportionate archival or removal.
