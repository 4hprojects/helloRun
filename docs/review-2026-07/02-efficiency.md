# Efficiency Findings — July 6, 2026

Overall verdict: the June 24 Organizer Workflow phases already fixed the worst offenders (facet aggregations, bounded review-queue pagination, Redis leaderboard cache, parallel notifications). What remains is per-request overhead and lifecycle gaps, not query-shape problems.

---

## EFF-1 · Duplicate per-request User lookups — **P2 · M**

Every authenticated request pays **two** `User.findById` round trips:

1. `populateAuthLocals` (`src/middleware/auth.middleware.js:79`) — runs on *all* routes, fetches the locals field set.
2. The route's role guard — `requireAdmin` / `requireFullAdmin` / `requireOrganizer` / `requireApprovedOrganizer` / `requireCanCreateEvents` (same file) — each does its **own** fresh `findById`.

Both queries hit the `_id` index so each is ~1 ms, but it's 2× Mongo round trips on every page and AJAX call, and `requireFullAdmin` stacked after `requireAdmin` makes it 3×.

**Fix:** in `populateAuthLocals`, widen the select to also cover the guard fields (`adminTier`, `accountStatus`, `organizerEventCreationAcknowledgement`) and stash the lean doc on `req.currentUser`. Each guard then uses `req.currentUser` when present and falls back to its own query when not (keeps guards safe standalone and in tests). One file, mechanical change; run `npm run test:auth`.

**Not recommended:** trusting `req.session.role` in guards — the DB re-check is what makes demotion/suspension take effect mid-session. Keep one fresh read per request, just not two.

---

## EFF-2 · No graceful shutdown — **P1 · S**

`src/server.js` installs no `SIGTERM`/`SIGINT` handler. Render sends SIGTERM on **every deploy**, then SIGKILLs after a grace period. Today the default handler kills the process instantly:

- In-flight requests are dropped mid-response (users see connection resets on every deploy).
- The three workers (`pg-sync`, `blog-scheduler`, `communication-retry`) can die **mid-batch** — a retry batch interrupted between "send" and "mark sent" is exactly how duplicate emails happen.
- Mongo/PG/Redis connections close abruptly.

**Fix:**

```js
const server = app.listen(PORT, …);
async function shutdown(signal) {
  logger.info(`${signal} received — draining`);
  server.close(async () => {
    stopSyncRetryWorker(); stopBlogSchedulerWorker(); stopCommunicationRetryWorker();
    await Promise.allSettled([mongoose.connection.close(), closePostgres(), closeRedis()]);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 25_000).unref(); // beat Render's 30s SIGKILL
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

The workers keep timer handles (`workerTimer`, `communicationRetryTimer`) — add/export `stop*()` functions if not already exported. `src/db/postgres.js` already has an `sql.end({ timeout: 5 })` path to reuse.

---

## EFF-3 · No origin compression — **P3 · S**

No `compression` middleware and no dependency for it. Cloudflare compresses **edge → browser**, so end users are mostly covered in production, but **origin → Cloudflare** transfers full-size HTML (some dashboard pages are large), and any direct-to-origin access (health checks aside) is uncompressed.

**Fix:** `npm i compression`, `app.use(compression())` before the static handler. One line; measurable mainly on HTML/JSON since static assets are cached at the edge anyway. Low urgency — do it whenever `server.js` is next touched.

---

## EFF-4 · No front-end asset pipeline — **P3 · L (optional)**

`src/public/js/run-proof-modal.js` is 2,816 lines shipped raw; `ocr-proof-reader.js` ~1,064; no minification or bundling exists. With Cloudflare edge caching + 1-day `maxAge` + ETag this costs little in practice, and the no-build-step simplicity is genuinely valuable for a solo maintainer.

**Recommendation:** leave as-is until there's a concrete page-weight problem. If AdSense/PageSpeed scores later demand it, start with `esbuild --minify` on the top 3 files in a `postinstall` step rather than adopting a bundler.

---

## Checked and clean

- Mongo indexes present on all hot models (Submission 17, Event 16, CommunicationLog 8, Registration 7).
- PG pool bounded (`max` 5 default, 8s statement timeout, idle/connect timeouts).
- Hot controllers use `Promise.all`; dashboards use `$facet` aggregations (June 24 work).
- Session-cached unread-notification count (30s TTL) avoids a per-request count query.
- Rate-limiter in-memory fallback has sweep + hard cap (no unbounded growth).
- Static serving: 1-day cache + ETag/Last-Modified, appropriate behind Cloudflare.
- `express.json()` at the default 100 kb limit — correct for this app's payloads.
