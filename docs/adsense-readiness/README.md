# HelloRun AdSense Readiness

This folder tracks the AdSense readiness work for HelloRun.

## Current Status

Status: implemented and merged to `main`.

Merged PR: https://github.com/4hprojects/helloRun/pull/10

Merge commit: `13605158117096ba2155f6cd8d558783505654c0`

Implementation commit: `7ae1bb78ce1e88df315e9c265c059ad74baca5aa`

## Contents

- `implementation-status.md` - what was implemented, what was verified, and remaining deployment actions.
- `phases/` - the original phased implementation prompts, kept for traceability and future audits.

## Deployment Notes

Before requesting AdSense review again:

- Deploy the current `main` branch.
- Run the blog seed in the production environment if the 10 guide posts are not already present.
- Confirm `https://hellorun.online/robots.txt` and `https://hellorun.online/sitemap.xml` are reachable after deployment.
- Submit or refresh the sitemap in Google Search Console.
- Allow Google time to crawl the updated public pages.
