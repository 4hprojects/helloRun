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
- Finds all blogs with `status = 'scheduled'` AND `publishedAt <= now` AND `isDeleted != true`
- For each due post: sets `status = 'published'`, sets `approvedAt` if not already set, saves
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
2. Admin reviews → can choose **Publish Now** (immediate) OR set `status = 'scheduled'` + future `publishedAt` date via the datetime picker on the review page
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

---

## Verification Checklist

- [ ] Server starts → `[blog-scheduler] Started — interval: 300000ms` in logs
- [ ] Set a blog post to `status=scheduled` with `publishedAt` 1 minute from now → auto-publishes
- [ ] Worker skips cleanly in test environment
- [ ] Syntax checks pass
