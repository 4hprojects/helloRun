# Public Deployment Smoke Baseline

**Checked:** October 20, 2026 at approximately 14:23 Asia/Manila
**Target:** `https://hellorun.online`
**Canonical tasks:** `OPS-01`, `REL-01`, `OPS-05`, and `SEC-03` in
[ROADMAP](../../ROADMAP.md)

## Health and routing

Read-only public requests returned:

| Request | Result |
|---|---|
| `/` | HTTP 200 with the public homepage |
| `/healthz` | HTTP 200, `ok: true` |
| `/readyz` | HTTP 200, Mongo ready |

Both health responses include `x-hellodeploy-route: hellorun.online`, confirming
that the public path reaches the HelloDeploy route. `/healthz` reports both
`commit` and `commitShort` as `unknown`, an empty branch, and a process start at
`2026-10-19T06:54:05.502Z`. The served revision therefore remains unverifiable.

`/readyz` reports Mongo ready, Redis `not_configured`, and the private Strava
viewer disabled with no missing viewer configuration. This is healthy enough to
serve current traffic, but it does not satisfy the Redis or controlled Strava
rollout gates.

## Deployment-generation fingerprint

The public response still has the pre-hardening asset and policy fingerprint:

- the homepage loads Lucide from `https://unpkg.com/lucide@latest`;
- the homepage contains inline script without a nonce;
- CSP still permits `'unsafe-inline'`, `unpkg.com`, and `cdn.jsdelivr.net`; and
- the repository-complete vendored Lucide JS and Quill JS/CSS URLs each return
  HTTP 404 publicly.

This independently confirms that the unpublished vendoring/nonce revision is
not the public revision. It is expected before deployment and is not evidence
of a defect in the repository implementation.

The public `/events`, `/blog`, `/about`, `/login`, and `/signup` routes all
return HTTP 200. The actual PWA resources—`/manifest.webmanifest`, `/sw.js`, and
`/offline.html`—also return HTTP 200 with the expected content types.

The service-worker response exposes a separate delivery defect: it returns
`Cache-Control: max-age=14400` with `CF-Cache-Status: REVALIDATED`, despite the
application's origin route intending revalidation on every request. A generic
Cloudflare browser/edge TTL is overriding the origin behavior and can delay an
installed client's update check by four hours. The repository now sends
browser `no-store` plus `CDN-Cache-Control: no-store` and
`Cloudflare-CDN-Cache-Control: no-store`; the deployed Cloudflare Cache Rule
must also exclude `/sw.js` because an Edge Cache TTL rule can override all
three origin directives.

## Required post-deployment comparison

After the repository revision is published:

1. require `/healthz` to report the exact published commit;
2. require the three vendored asset URLs to return HTTP 200 with their expected
   content types;
3. require the homepage to use the local Lucide URL and nonce-bearing scripts;
4. require CSP to omit `unpkg.com`, `cdn.jsdelivr.net`, and unnecessary inline
   script permission;
5. review the browser console and CSP reports on the homepage and Quill-backed
   administrator page; and
6. exclude `/sw.js` from Cloudflare Browser/Edge Cache TTL overrides, purge the
   cached URL, and require `Cache-Control: no-store, max-age=0, must-revalidate`
   without a cached Cloudflare status; and
7. verify `/readyz` again after the production Redis decision is implemented.

No production state was changed during this smoke check.
