# Administrator reminders and scheduling

## Purpose

Remind OCR administrators about actionable sample reviews or training readiness. Reminders **never trigger training automatically**. Model deployment is separately approved.

## Defaults (editable)

- Digest: weekly, timezone `Asia/Manila`, on a day/time chosen in settings during implementation. Do not invent a fixed clock time without admin selection.
- New verified sample threshold since last training: 100, used to recommend review, not to determine scientific readiness.
- Send only if actionable work exists. Allow frequency `off`, weekly, every two weeks, monthly.
- Recipients: RBAC-resolved OCR administrators and super administrators, not hardcoded addresses.

## Email events

| Event | Condition | Audience | Outcome |
|---|---|---|---|
| `ocr.review_digest` | Scheduled review with pending tasks | Configured admins | Queue count and dashboard link |
| `ocr.dataset_ready` | Eligible new sample threshold crossed and quality review pending | OCR admins | Suggest preparation, not automatic training |
| `ocr.training_completed` | Training job finished | Initiator, configured admins | Link to evaluation and model candidate |
| `ocr.training_failed` | Job failed/interrupted | Initiator, technical admins | Error category and admin job link |
| `ocr.model_approval_needed` | Candidate passed evaluation gate but not deployed | Deploy-authorized admins | Review and approve manually |
| `ocr.model_activated` | Model activation/rollback | Admins | Version change, actor, timestamp |
| `ocr.quality_regression` | Evidence of meaningful accuracy drop by predefined thresholds | OCR admins | Investigate affected platform/profile |

All emails contain secure dashboard links and summary counts only, no private screenshots or GPS data.

## Scheduling mechanics

- Use existing app scheduling/job infrastructure if present, otherwise add persistent job scheduling and processing in the minimal manner consistent with HelloRun deployment.
- Multi-instance safe claim/lease or unique event key to avoid duplicate scheduled emails; survive process restarts.
- Calculate next schedule using administrator timezone and daylight saving rules if recipients later use other zones.
- Event dedupe: unique event key incorporating event type, recipient, resource/job/version and relevant period.
- Bounded retries with exponential backoff, provider rate handling, delivery state and suppression after repeated permanent failures.
- Record `queued`, `sent`, `failed`, `suppressed` with timestamps and provider message IDs where available.

## Admin settings UX

Provide enabled toggle, review cadence, minimum new samples threshold, event subscriptions, recipient management (permission-scoped), timezone, test email, delivery history and mute options. Validate changes and audit privileged updates.

## Sample email copy

Subject: HelloRun OCR review reminder

`There are {pendingSampleCount} OCR samples awaiting review and {newEligibleSampleCount} new approved training examples since the last training job. Review extraction issues by platform, then decide whether to prepare a dataset or schedule manual training. Open the OCR Training Center: {authenticatedAdminLink}`

Another event: `Training job {jobId} failed. Your current production OCR model has not changed. Review the job log through the authenticated admin dashboard.`

## Verification tests

- No emails if disabled, no action, or no eligible recipient.
- Duplicate scheduler and retry cannot send the same notification twice outside the chosen retry policy.
- Changing timezone/frequency changes next trigger correctly.
- Worker failure and system reboot preserve due reminders without bursts of redundant mail.
- Emails do not contain personal evidence; destination requires session and sufficient role.
