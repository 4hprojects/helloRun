# Blog Scheduled Publishing (P12)

**Created:** June 23, 2026
**Status:** ✅ Implemented — June 23, 2026
**Tests:** Auth subset 17/17 passing

---

## Problem

The blog system supported `status: 'scheduled'` and `publishedAt` fields, and the admin review page had scheduling UI — but no recurring process ever auto-published due posts. A one-off manual script existed but had to be run by hand.

---

## What Was Built

### `publishScheduledBlogs()` in `src/workers/pg-sync-worker.js`
- Finds all blogs with `status = 'scheduled'` AND `scheduledFor <= now` AND `isDeleted != true`.
- Falls back to the legacy `publishedAt` schedule field during migration.
- Rechecks the content-eligibility and publication-review hashes before publishing.
- For each due post: sets `status = 'published'`, records the real `publishedAt`, clears `scheduledFor`, and saves.
- Tracks failed/blocked attempts so overdue posts are visible in the admin queue.
- Batch limit: 20 posts per run
- Logs each published post by title and ID

### `startBlogSchedulerWorker()` in `src/workers/pg-sync-worker.js`
- Runs on a 5-minute interval (configurable via `BLOG_SCHEDULER_INTERVAL_MS` env var)
- Fires once 10 seconds after server startup to catch any overdue posts immediately
- Skips when `NODE_ENV === 'test'`
- Graceful shutdown on `SIGTERM`/`SIGINT`
- Exported alongside existing `startSyncRetryWorker`

### `src/server.js`
- `startBlogSchedulerWorker()` called in `startServer()` after `connectToDatabase()`

---

## How Admin Scheduling Works (already existed)

1. Author submits post → `status = 'pending'`
2. Admin completes the publication checklist and chooses **Publish Now** or **Schedule** with a future `scheduledFor` date.
3. Worker runs every 5 minutes → finds due scheduled posts → publishes them automatically

---

## Files Changed

| File | Change |
|------|--------|
| `src/workers/pg-sync-worker.js` | Add Blog import; `publishScheduledBlogs()`; `startBlogSchedulerWorker()`; export |
| `src/server.js` | Import + call `startBlogSchedulerWorker()` |

---

## Optional Config

```
BLOG_SCHEDULER_INTERVAL_MS=300000   # 5 minutes default
```

Before deployment, preview and apply the legacy-field migration:

```bash
npm run blog:migrate-scheduled-for
npm run blog:migrate-scheduled-for -- --apply
```

---

## Verification Checklist

- [ ] Server starts → `[blog-scheduler] Started — interval: 300000ms` in logs
- [ ] Set a blog post to `status=scheduled` with `publishedAt` 1 minute from now → auto-publishes
- [ ] Worker skips cleanly in test environment
- [ ] Syntax checks pass
