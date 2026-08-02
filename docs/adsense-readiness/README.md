# HelloRun AdSense Readiness

This folder tracks the AdSense readiness work for HelloRun.

## Current Status

Status: **approval review on hold while the active roadmap is completed**.

The original implementation phases were completed and merged, and the July 31, 2026 production audit confirmed strong content and technical foundations. It also found remaining public-link, heading, metadata, consent, indexing, and account-verification work.

Active tracker: [`approval-roadmap.md`](approval-roadmap.md)

Only the active roadmap controls current sequencing. Work proceeds one priority at a time, and the AdSense review request must wait until Priorities 1-7 pass.

Merged PR: https://github.com/4hprojects/helloRun/pull/10

Merge commit: `13605158117096ba2155f6cd8d558783505654c0`

Implementation commit: `7ae1bb78ce1e88df315e9c265c059ad74baca5aa`

## Contents

- `approval-roadmap.md` - authoritative current priorities, gates, acceptance criteria, and evidence.
- `implementation-status.md` - what was implemented, what was verified, and remaining deployment actions.
- `next-articles-todo.md` - completed article-batch history.
- `seo-keywords.md` - repository-backed intent-to-page map awaiting Search Console validation.
- `google-account-verification.md` - authenticated AdSense, ads.txt, Policy Center, and certified-CMP evidence checklist.
- `adsense-placement-strategy.md` - post-approval placement boundary and controls.
- `phases/` - the original phased implementation prompts, kept for traceability and future audits.

## Historical Deployment Notes

The original deployment notes below are retained for traceability. The active roadmap now supersedes them as the approval checklist.

- Deploy the current `main` branch.
- Run the blog seed in the production environment if the 10 guide posts are not already present.
- Confirm `https://hellorun.online/robots.txt` and `https://hellorun.online/sitemap.xml` are reachable after deployment.
- Submit or refresh the sitemap in Google Search Console.
- Allow Google time to crawl the updated public pages.
