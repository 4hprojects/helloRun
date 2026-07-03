# Event Promotion Email Sending — Flow Analysis & Grayed-Button Diagnosis

_Date: July 4, 2026 · Trigger: after a successful "Selected Emails" test send from `/admin/promote`, the Send Promotion button stayed grayed out on retry, while the platform email quota barely moved._

Related historical doc: `docs/to-implement/event-promotion-feature-analysis.md` (pre-refinement analysis, Jul 3).

---

## TL;DR — Why the button grays out but credits don't move

The Send button and the email-credit quota are **two unrelated systems**:

- The **button** is enabled only when the live recipient preview returns a count **> 0**. For Selected Emails, the preview count is `pasted emails − invalid − duplicates − registered users opted out of event.promotion`.
- The **credits** (`DailyEmailUsage.sentCount`, shown as "Platform email quota") increment only when an email actually reaches Resend. Opted-out, skipped, and suppressed recipients never hit the provider, so they consume nothing.

**Most likely cause of the incident:** the test recipient account is now opted out of `event.promotion`. The test email's footer contains an "Unsubscribe from event promotions" link — a plain GET to `/unsubscribe?key=event.promotion` with **no confirmation step**, which opts out **whichever account is logged in in that browser** (`req.session.userId`), not the address the email was sent to. Clicking it once while checking the test email is enough. From then on, pasting that same address previews as **"0 eligible runners"** (with a small "1 opted out" hint under the count) and the button stays disabled.

This is by design (opt-out filtering was added in the Jul 3 refinement pass), but during self-testing it looks like a mysterious lockout.

### How to recover

1. Log in as the opted-out test account.
2. Go to `/runner/profile?section=notifications` (works for any role — the route is `requireAuth`, not runner-gated).
3. Re-tick **"Event promotions"** and save. `updateNotificationSettings` rebuilds `emailOptOut` from the checked keys, removing the opt-out.

Or directly in MongoDB (read-check first):

```js
// verify
db.users.findOne({ email: 'test@example.com' }, { 'notificationPreferences.emailOptOut': 1 })
// fix
db.users.updateOne(
  { email: 'test@example.com' },
  { $pull: { 'notificationPreferences.emailOptOut': 'event.promotion' } }
)
```

---

## How the send pipeline works

### Key files

| Layer | File |
|-------|------|
| Shared service (recipient resolution, dispatch, campaign summary) | `src/services/event-promotion.service.js` |
| Admin page/preview/send | `src/controllers/admin/events.controller.js` (`promotePage`, `promotePreview`, `promoteSend`) |
| Admin routes + limiter | `src/routes/admin.routes.js` (`/admin/promote*`) |
| Organiser page/preview/send + daily quota | `src/routes/organiser/event-management.js` (`/organizer/promote*`) |
| Campaign record | `src/models/EventPromotion.js` |
| Retry wrapper | `src/services/reliable-communication.service.js` (`notifyWithRetry`) |
| Budget gate + credit counters | `src/services/email-budget.service.js` (`decideEmailSend`, `incrementSentEmail`) + `src/models/DailyEmailUsage.js` |
| Opt-out suppression + logging | `src/services/communication.service.js` (`notify`) |
| Template + unsubscribe link | `src/services/email.service.js` (`sendEventPromotionEmail`) |
| Unsubscribe route | `src/routes/pageRoutes.js` (`GET /unsubscribe`) |

### Flow (both roles)

1. **Preview** (`GET .../promote/preview`) resolves recipients with the same opt-out-aware resolver used at send time and returns a count. The page script enables the Send button only when that count is > 0 (organiser page additionally requires `quotaRemaining > 0`).
2. **Send** (`POST .../promote`) re-resolves recipients, creates an `EventPromotion` row (`status: 'sending'`), then `dispatchEventPromotionCampaign()` fires `notifyWithRetry('event.promotion', …)` per recipient.
3. `notify()` in `communication.service.js` then, per email:
   - `decideEmailSend()` — global email system flags + daily budget (hard stop, reserved-critical headroom, soft stop for `low` priority — and `event.promotion` **is** `priority: 'low'`). Not allowed → status `skipped`/`suppressed`, no provider call.
   - **User-level opt-out re-check** for known `recipientUserId` → status `suppressed`, no provider call.
   - Otherwise → Resend send → `incrementSentEmail()` bumps `DailyEmailUsage.sentCount` (the "credit").
   - Throw → enqueued into the communication retry queue (`queued`).
4. Outcome counts (`selected/sent/skipped/suppressed/failed/queued`) are written back onto the campaign, and the redirect message spells them out — e.g. "Promotion processed for 2 runners: 0 sent, 2 skipped, 0 failed" means **no credits were used**.

### Audiences and caps

| Role | Audiences | Caps |
|------|-----------|------|
| Organiser | `previous_participants`, `non_participants` (≤200 candidates) | **25 selected recipients/day** (`PROMO_DAILY_LIMIT`, summed from `EventPromotion.recipientCount` for today's `dateKey`) |
| Admin (full tier) | those two + `all_runners` (≤500) + `selected_emails` (≤500) | No recipient/day cap; **5 campaigns/hour** rate limit on the POST; per-email budget gate still applies |

---

## All the ways the Send button can gray out

Ranked by likelihood for the reported incident:

1. **All pasted emails are opted out** (admin, `selected_emails`). Registered users with `event.promotion` in `notificationPreferences.emailOptOut` are dropped by `hydrateSelectedPromotionRecipients()`; preview count hits 0. The only visible hint is the small "N opted out" line under the big count. ← **most likely here** (see TL;DR). Note: emails that are *not* registered users can never be opted out and always pass, so the lockout specifically points to a registered test account.
2. **Preview request fails** (expired session → login redirect → `resp.json()` throws; or a 5xx). The catch block shows "Preview unavailable" and never re-enables the button. There is no retry hint.
3. **Organiser daily quota exhausted** (`quotaRemaining === 0` is baked into the page at render). Two sharp edges make this fire earlier than expected:
   - The quota burns on **selected** recipients (`recipientCount = selectedCount`), even when every email was skipped/suppressed and **zero credits were used** — a "failed" campaign still eats quota.
   - `getQuotaUsed()` does **not** exclude `adminTriggered` campaigns, and admin sends store `organizerId: event.organizerId`. An admin test blast against an organiser's event silently consumes that organiser's 25/day allowance.
4. **Form state reset after redirect** — event/audience must be re-selected before the preview runs at all ("Select an event and audience to preview").

Not a graying cause but adjacent: the admin POST limiter (5 campaigns/hour) rejects the *submit* with a flash error; it never disables the button.

## Why "credits" can stay flat even after a "send"

- Opted-out recipients → `suppressed`, no Resend call.
- Budget gate says no (hard stop / soft stop for low-priority / reserved-critical headroom / maintenance mode / system disabled) → `skipped`, no Resend call.
- `notify()` throws before the provider call → `queued` for the retry worker.

Only `sentCount` on the campaign row corresponds to consumed Resend credits. `DailyEmailUsage` is keyed by **UTC** `dateKey` (`toISOString()`), so both the platform quota and the organiser 25/day quota reset at **8:00 AM Philippine time**, not midnight.

---

## Other findings worth fixing (backlog candidates)

1. **Unsubscribe applies to the session user, not the addressed recipient.** A forwarded promotion email lets the wrong account opt itself out; conversely the addressed user can't unsubscribe without logging in. The Jul 3 analysis doc already recommends signed one-click unsubscribe tokens — this incident is a concrete argument for it.
2. **One-click GET with no confirmation.** A single accidental click (or any logged-in visit to the URL) opts the account out silently except for a flash message. Add an "Are you sure?" interstitial or make it a POST behind a confirm page.
3. **Grayed button gives no reason.** When the count is 0 purely from opt-outs, show an explicit message ("All 1 pasted address has opted out of promotions") instead of a small hint line, and say why the button is disabled.
4. **Organiser quota counts selected, not sent** — and admin campaigns burn the organiser's quota (see above). Consider summing `sentCount` (or excluding `adminTriggered`) in `getQuotaUsed()`.
5. **UTC quota reset** at 8 AM PH time will eventually confuse someone; consider computing `dateKey` in `Asia/Manila`.
6. **Admin promote page reads `DailyEmailUsage.findOne({ dateKey })` without a provider filter** — fine with a single provider, wrong the day a second provider doc exists.
7. **Preview-failure state** leaves the button dead with no retry; re-run `updatePreview` on window focus or add a retry link.
