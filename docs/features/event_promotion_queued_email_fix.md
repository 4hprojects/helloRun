# Event Promotion — "Queued" Emails Diagnosis & Fix (July 5, 2026)

## Symptom

Admin promotion sends report most recipients as **queued** instead of sent, and the queued
emails never arrive. Observed campaigns (all for *July Active Quest Virtual Run*):

| Date | Audience | Selected | Sent | Queued |
|------|----------|----------|------|--------|
| Jul 5 | All Runners | 46 | 4 | 42 |
| Jul 3 | All Runners | 45 | 4 | 41 |
| Jul 3 | Prev. Participants | 3 | 2 | 1 |
| Jul 3 | Selected Emails | 1 | 1 | 0 |

The platform daily email quota was nowhere near exhausted (4/100), so the budget system is
not the cause (a budget stop produces `skipped`, not `queued`).

## Root Causes

### 1. Concurrent dispatch trips Resend's rate limit (why sends fail at all)

`dispatchEventPromotionCampaign` (`src/services/event-promotion.service.js`) fired **all
recipients simultaneously** via `Promise.allSettled`. Resend's API allows ~2 requests/second;
the first few sends win the burst, the rest are rejected with HTTP 429. Each rejection is
caught by `notifyWithRetry` (`src/services/reliable-communication.service.js`), which
enqueues a `CommunicationRetry` job and reports the recipient as `queued`. That is exactly
the 4-sent/rest-queued pattern in every campaign.

### 2. Retry idempotency key omits the campaign ID (why queued emails never send)

`buildCommunicationRetryKey` hashed only:

```
eventKey · source · recipientUserId · recipientEmail ·
registrationId · submissionId · activityId · eventId
```

`campaignId` was **not** part of the key, so two campaigns for the same event and the same
recipient collide on the same retry job. `enqueueCommunicationRetry` upserts with
`$setOnInsert` for `status`/`attempts` — if the existing job already finished (`sent` from an
earlier campaign's retry, retained 14 days, or `dead` after 5 failed attempts / the 24 h
stale window), the new enqueue only bumps `lastError`/`updatedAt` and the job is **never
retried again**. Result: the Jul 5 campaign's 42 "queued" recipients collided with the Jul 3
jobs and were silently swallowed.

The retry pipeline itself is healthy: `communication-retry-worker` runs every 60 s,
processes up to 20 due jobs **sequentially** (which naturally respects the rate limit) with
backoff 1 m / 5 m / 15 m / 1 h / 6 h, max 5 attempts. It delivered the first campaign's
queued mails fine — the collision only bites from the second campaign onward.

## Fix (implemented in this session)

1. **Include `campaignId` in the retry idempotency key**
   (`buildCommunicationRetryKey` in `src/services/reliable-communication.service.js`).
   Each campaign now gets its own retry jobs; deliberate re-sends are no longer deduplicated
   against a previous campaign. Retries for the *same* campaign still dedupe correctly.

2. **Throttle campaign dispatch** — `dispatchEventPromotionCampaign` now sends
   **sequentially** with a configurable gap (`EVENT_PROMOTION_SEND_INTERVAL_MS`, default
   600 ms ≈ 1.6 req/s) instead of firing everything at once. The vast majority of sends now
   succeed on the first attempt; the retry queue returns to being a safety net.

3. **Run campaigns in the background** — sequential throttling means a 500-recipient
   admin campaign takes minutes, far too long to hold an HTTP request open. Both the admin
   controller (`src/controllers/admin/events.controller.js`) and the organiser route
   (`src/routes/organiser/event-management.js`) now call
   `dispatchEventPromotionCampaignInBackground(...)` and redirect immediately with a
   "campaign started" message. The campaign document is finalised (counts + status) when the
   background run completes; progress is visible in the existing **Recent Campaigns** table
   (status `sending` → `completed`/`partial`/`failed`).

4. **Quota race guard** — `recipientCount`/`selectedCount` are now set on the
   `EventPromotion` document at creation time (not after dispatch), because the organiser
   daily quota (`getQuotaUsed`) sums `recipientCount` for the day. Otherwise two quick sends
   during the background window could both pass the quota check.

## Deployment Notes / Follow-ups

- **Key-format change:** adding `campaignId` to the hashed key changes *every* idempotency
  key (non-campaign sources hash `campaignId: ""`). Pre-deploy queued jobs keep their old
  keys and still retry normally; the only edge case is a notification that fails again
  post-deploy while its pre-deploy job is still queued — it would enqueue a second job and
  could double-send once. Accepted as a one-time, low-probability cost.
- **The swallowed Jul 5 recipients are not resurrected by this fix.** After deploying,
  simply re-send the campaign — with the new key it will create fresh retry jobs for anyone
  whose direct send still fails, and throttling means most will send directly anyway.
- Retry state can be inspected at `/admin/communications/retries` (filter
  `eventKey=event.promotion`).
