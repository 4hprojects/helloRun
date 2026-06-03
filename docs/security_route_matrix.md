# Security Route Matrix

This matrix tracks the current protection posture for the main mutating auth/public routes after the June 3, 2026 auth abuse-protection pass.

| Route | Method | Auth | CSRF | Rate Limit | Bot Protection |
| --- | --- | --- | --- | --- | --- |
| `/login` | POST | public | no | yes | Adaptive Turnstile after 3 invalid credentials per email + IP in 15 minutes |
| `/signup` | POST | public | yes | yes | Turnstile, honeypot, form-age/session token, disposable email blocking |
| `/register` | POST | public | yes | yes | Turnstile, honeypot, form-age/session token, disposable email blocking |
| `/auth/google` | GET | public | n/a | no |
| `/forgot-password` | POST | public | yes | yes |
| `/reset-password/:token` | POST | public | yes | no |
| `/resend-verification` | POST | public | yes | yes |
| `/logout` | POST | authenticated | yes | no |
| `/events/:slug/register` | POST | runner | yes | no |
| `/profile/quick-update` | POST | runner | yes | yes |
| `/my-registrations/:registrationId/payment-proof` | POST | runner | yes | yes |
| `/my-registrations/:registrationId/submit-result` | POST | runner | yes | yes |
| `/my-registrations/:registrationId/resubmit-result` | POST | runner | yes | yes |

Notes:
- Multipart routes run upload parsing first, then CSRF validation, so the token can be read from the parsed form body.
- `CSRF_PROTECTION=0` still disables enforcement for local troubleshooting; production/staging should leave it enabled.
- Turnstile is enabled only when both `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are configured.
- Signup limits are 5 attempts per IP per hour and 3 attempts per email + IP per hour.
- Login keeps the existing 10-attempt email + IP rate limit and adds an adaptive Turnstile threshold at 3 invalid credential attempts. The threshold uses Redis when available and an in-memory fallback otherwise.
