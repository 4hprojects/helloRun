# Production Readiness Checklist

Use this as the release gate for Phase 9 closeout. Every item must be marked `PASS`, `BLOCKED`, or `N/A` with an owner/date before deployment.

## 1. Runtime Configuration
- `PASS/BLOCKED` `NODE_ENV=production` in staging/production.
- `PASS/BLOCKED` `MONGODB_URI` points to the correct environment database.
- `PASS/BLOCKED` `SESSION_SECRET` is strong and environment-specific.
- `PASS/BLOCKED` `APP_URL` matches the deployed public base URL.
- `PASS/BLOCKED` email settings are configured: `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`.
- `PASS/BLOCKED` Google OAuth settings are configured for the deployed domain.
- `PASS/BLOCKED` storage settings are configured for uploads/assets.
- `PASS/BLOCKED` CSRF enforcement is enabled in runtime config. `CSRF_PROTECTION=0` must not be set in staging/production.

## 2. Health and Security Gate
- `PASS/BLOCKED` app fails fast when Mongo is unavailable.
- `PASS/BLOCKED` `/healthz` returns `200` with `{ ok: true }`.
- `PASS/BLOCKED` `/readyz` returns `503` when Mongo is not ready and `200` when it is ready.
- `PASS/BLOCKED` session cookie settings are correct for production: `httpOnly`, `sameSite=lax`, `secure=true`.
- `PASS/BLOCKED` security headers are present on public responses.
- `PASS/BLOCKED` CSRF-protected forms reject missing/invalid tokens in staging verification.

## 3. Automated Verification
- `PASS/BLOCKED` full regression suite passes: `npm test`.
- `PASS/BLOCKED` targeted reruns pass for any touched areas.
- `PASS/BLOCKED` no known flaky or quarantined tests remain open for launch-critical flows.

## 4. Manual Smoke Coverage
- `PASS/BLOCKED` auth flows:
  - signup
  - login/logout
  - forgot-password/reset-password
  - resend-verification
  - Google OAuth entry/callback basics
- `PASS/BLOCKED` runner flows:
  - event registration
  - quick profile update
  - payment proof upload
  - result submission/resubmission
  - certificate download
- `PASS/BLOCKED` moderation flows:
  - organizer payment/result review
  - admin review queue
  - admin blog moderation
- `PASS/BLOCKED` public flows:
  - `/events`
  - `/blog`
  - `/blog/:slug`
  - `/leaderboard`
  - legal pages
  - `/sitemap.xml`

## 5. External Operations
- `PASS/BLOCKED` SSL certificate issued and validated.
- `PASS/BLOCKED` domain and DNS are correctly configured.
- `PASS/BLOCKED` uptime checks are configured for `/healthz` and `/readyz`.
- `PASS/BLOCKED` error tracking is configured and tested.
- `PASS/BLOCKED` backup policy and restore runbook are documented and verified.
- `PASS/BLOCKED` staging smoke signoff is recorded before production launch.

## Launch Rule
Do not deploy while any launch-critical item above is `BLOCKED`.
