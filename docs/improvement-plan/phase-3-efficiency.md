# Phase 3 — Efficiency

**Priority:** P2–P3 · **Effort:** ~1 day · **When:** after Phase 2 (some items want live measurement first).

**Context:** the DB layer is already disciplined (July 5 review validated indexes, pagination, aggregate facets, Redis-cached leaderboards). What's left is *request-path* and *asset-pipeline* cost. On a single small Render instance, request-path CPU is the scarce resource — items are ordered by that.

---

## EFF-1 · `populateAuthLocals` hits Mongo on every HTML request (P2)

**Where:** `src/middleware/auth.middleware.js:74` — every authenticated request does `User.findById().select(...).lean()` before any route runs (plus, for runners, a notification count already session-cached at 30 s).

**Why it matters:** this is the single most-executed query in the app — page views, AJAX polls, everything. It exists to (a) populate nav locals and (b) eject suspended accounts immediately.

**Action:** cache the selected user snapshot in the session with a short TTL, exactly like the existing `runnerUnreadNotifications` pattern in the same file:
- TTL 30–60 s; refresh on expiry.
- **Bust explicitly** on the paths that must be instant: logout everywhere, admin suspend/role-change (pairs with SEC-N2's session-invalidation work — a suspension can also delete the user's sessions from the store directly, making the TTL irrelevant for enforcement), profile edits (name/avatar shown in nav).
- Accepted trade-off to document: suspension enforcement moves from "next request" to "≤60 s or session-kill", role display can lag ≤60 s.
- **Verify:** unit test for the cache helper; post-deploy, watch Mongo ops/sec drop in Atlas metrics.

## EFF-2 · ID-OCR runs inside the application-submit request (P2)

**Where:** `src/routes/organiser/profile.js:214` — `await extractIdNameMatch(...)` (Tesseract WASM, 30 s timeout) runs before the user gets a response, on the web instance's CPU.

**Why it matters:** worst case the submitter stares at a spinner for 30+ s (OCR + R2 upload + DB writes), and one OCR run monopolizes a core on the shared instance. The verdict is *advisory for admins* — nothing about the response depends on it.

**Action:** respond first, compute later. After the application record is created, fire a background task (same fire-and-forget pattern as `syncUserComplianceInBackground`) that runs OCR and `findByIdAndUpdate`s the verdict onto the `OrganiserApplication`. Admin UI already tolerates missing verdicts (`not_checked`). Bonus: reuse one Tesseract worker per process instead of create/terminate per call (`defaultRecognize` currently spawns fresh each time) — or keep per-call spawn since volume is low; measure first.

## EFF-3 · Asset caching & versioning (P3)

- **Vendor tree (30 MB, mostly tesseract WASM + soon lucide/quill):** immutable by nature once pinned — serve `/js/vendor/` with `maxAge: '365d', immutable: true` (a second `express.static` mount for that subtree). Bump the folder name on upgrade (`vendor/tesseract@5/`).
- **App CSS/JS:** 1-day cache + ETag today means a stale-CSS window after every deploy and a revalidation request per asset per day. Cheapest fix without a bundler: append `?v=<git-sha-or-package-version>` in `head.ejs`/layout script tags via a single `res.locals.assetVersion` set at boot; then raise `maxAge` to 30d.
- **Confirm Cloudflare is doing edge compression** (Brotli on by default) rather than adding a `compression` middleware — check one response's `content-encoding` from production. If CF proxying is ever bypassed, add the middleware then.

## EFF-4 · Minification (P3 — optional)

Largest page assets: `run-proof-modal.js` 116 KB, `create-event.css` 67 KB, `admin.css` 66 KB — all shipped raw. Per-page splitting is already good, so this is a "nice" not a "need". If done: a 10-line `esbuild --minify` build step writing to `src/public/dist/`, run in CI/`postinstall`; don't hand-minify, don't add a framework. Skip entirely if Lighthouse post-deploy says transfer sizes are fine (Cloudflare compression already removes ~70% of the wire cost).

## EFF-5 · Measure before further work (P3)

After deploy, capture a baseline: Lighthouse on home/event/blog-post pages, Atlas slow-query log for a week, Render CPU/memory graphs. Future efficiency work should cite these numbers, not intuition. Add findings to the runbook.

---

## Exit criteria
- [ ] Auth-locals query rate visibly reduced (Atlas metrics), suspension path still enforced via session invalidation
- [ ] Application submit responds in seconds regardless of OCR; verdicts appear on admin page shortly after
- [ ] Vendor assets immutable-cached; app assets version-busted; compression confirmed at the edge
- [ ] Baseline performance numbers recorded
