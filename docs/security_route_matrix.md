# Security Route Matrix

This matrix tracks the current protection posture for the main mutating auth/public routes after the Apr 24, 2026 stabilization pass.

| Route | Method | Auth | CSRF | Rate Limit |
| --- | --- | --- | --- | --- |
| `/login` | POST | public | no | yes |
| `/signup` | POST | public | yes | no |
| `/register` | POST | public | yes | no |
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
