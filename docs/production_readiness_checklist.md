# Production Readiness Checklist

## Completed In Repo
- Fail-fast startup when the initial MongoDB connection cannot be established.
- Health endpoint: `/healthz`
- Readiness endpoint: `/readyz`
- Shared rendered 404/500 error surfaces instead of raw HTML responses.
- Dynamic sitemap route backed by live public pages and published content.

## External Setup Still Required
- SSL certificate issuance and domain validation.
- Error tracking provider configuration.
- Uptime monitoring and alert routing.
- Backup policy and restore runbook verification.
- Staging smoke pass before production deployment.

## Recommended Verification
- Run full regression suite with CSRF protection enabled.
- Manual smoke:
  - signup, forgot/reset password, resend verification
  - event registration
  - payment proof and result submission
  - blog list/detail, sitemap, contact/legal pages
  - organizer/admin moderation flows
