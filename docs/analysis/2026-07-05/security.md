# Security — Full Codebase Analysis (July 5, 2026)

**Scope:** authz/authn, injection, CSRF & rate-limit coverage, upload handling, XSS in EJS, secrets, privilege escalation. Fresh-eyes pass over all of `src/`. The June 24 review's SEC-1…SEC-4 were spot-checked and are all still fixed (see bottom).

Severity key: **Critical** (fix before next release) · **High** · **Medium** · **Low**.

---

## SEC-A · Stored XSS in the admin blog-review page (author → admin)
- **Severity:** High
- **Location:** `src/views/admin/blog-review.ejs` — lines 656, 660, 672, 705, 709, 713, 756, 760, 764, 768, 772 (and the paired `author-form.ejs` fields)
- **Description:** Author-controlled scalar fields are emitted with the **unescaped** EJS tag `<%-` directly into HTML attributes and textareas:
  ```ejs
  <input ... value="<%- post.title %>" ...>
  <textarea ...><%- post.excerpt || '' %></textarea>
  <input ... value="<%- post.coverImageUrl || '' %>">
  <textarea ...><%- post.contentRaw || '' %></textarea>
  ```
  `post.title`/`excerpt`/`tags`/etc. are cleaned only by `cleanText()` in `src/utils/blog-composer.js:303` — which collapses whitespace and truncates but **does not HTML-escape**. A blog author can submit a post whose title is `"><img src=x onerror=…>` (or `"><script>…`), and it executes in the **admin reviewer's** authenticated session when they open the moderation page. Because the CSRF token is present in that same page, the payload can read it and drive privileged admin mutations.
- **Why it's real:** blog authoring is open to organiser/runner accounts; the review page is exactly where an admin lands to moderate untrusted submissions. Note the neighbouring `<%= category %>` on line 666 is correctly escaped — this is an inconsistent misuse of `<%-`, not a deliberate raw-HTML field.
- **Fix:** Change `<%-` to `<%=` for every plain-text scalar in `blog-review.ejs` and `author-form.ejs` (title, excerpt, tags, customCategory, coverImageUrl, coverImageAlt, seoTitle, ogImageUrl, seoDescription, moderationNotes, contentRaw, galleryImageUrls). These are text values, never HTML — escaping is correct and loses nothing. Leave genuine rendered-HTML fields (`contentHtml`, `policyHtml`) on `<%-` since they go through the sanitizer.
- **Verify after fix:** submit a draft with a title of `"><b>x` and confirm it renders as literal text in the review form.

## SEC-B · `<%- contentHtml %>` placed inside an HTML attribute
- **Severity:** Medium
- **Location:** `src/views/blog/author-form.ejs:1232`, `:1324`
- **Description:** `value="<%- formData?.contentHtml || '' %>"` puts *sanitised HTML* into a double-quoted attribute without attribute-escaping. Even post-sanitisation the HTML legitimately contains `"` and `>` (e.g. `<a href="…">`), which break out of the `value="…"` attribute. Practically this is self-XSS (the author's own draft in the author's own session), so severity is Medium, but it is still incorrect output encoding.
- **Fix:** Use `<%= %>` (attribute-safe) for the hidden-field serialisation, or JSON-encode via the existing `safeJson()` helper used in `blog-post.ejs`.

## SEC-C · PDF uploads are not content-validated
- **Severity:** Low
- **Location:** `src/services/upload.service.js:37` (`fileFilter`), `:673` (`normalizeFileForUpload`)
- **Description:** Image uploads are re-encoded through `sharp` (which rejects non-images), but PDFs (allowed for payment proofs) are accepted on the **client-supplied MIME type** only and stored verbatim, with `ContentType` set from that same spoofable value. Because objects are served from R2 with the stored `application/pdf` content-type (not `text/html`), browser execution is not directly achievable, so risk is Low — but there is no magic-byte check confirming the bytes are actually a PDF.
- **Fix:** Sniff the first bytes for the `%PDF-` signature in `normalizeFileForUpload` before upload; reject on mismatch.

## SEC-D · Non-constant-time CSRF token comparison
- **Severity:** Low
- **Location:** `src/middleware/csrf.middleware.js:33`
- **Description:** Session vs. request token compared with `!==`. Timing side-channels on a per-session random token are not practically exploitable, but the codebase already uses `crypto.timingSafeEqual` elsewhere (timing webhook) — this should match.
- **Fix:** Length-check then `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`.

## SEC-E · `CSRF_PROTECTION=0` kill-switch is a production footgun
- **Severity:** Low
- **Location:** `src/middleware/csrf.middleware.js:18`; default-on in the test harness `src/scripts/run-test-group.js:12`
- **Description:** CSRF can be globally disabled by an env var. The test harness sets `CSRF_PROTECTION=0` by default, so the whole default test run exercises the app *without* CSRF (only `csrf-route-guards.integration.test.js` re-enables it). The switch is convenient but one stray env value in prod silently disables CSRF site-wide.
- **Fix:** Ignore the kill-switch when `NODE_ENV === 'production'` (fail safe), and/or log a loud warning at boot when CSRF is disabled.

---

## What is already handled correctly ✓
- **June review fixes all hold:** SEC-1 organiser self-approval is blocked in both the bulk (`src/routes/organiser/review.js:332`) and single (`:870`) payment-approval paths, with a `payment.self_approval_blocked` audit entry. SEC-2 password reset is a single atomic `findOneAndUpdate` (`src/routes/authRoutes.js:868`). SEC-3 timing webhook is rate-limited (`src/routes/webhooks/timing-system.js:13`).
- **Admin authorization is strong and consistent:** every `/admin` route carries `requireAdmin`; the highest-blast-radius actions (account/event delete, test-data & test-user purge, policy publish, data exports, mass-email promotion, communications/site settings, submission correction) additionally require `requireFullAdmin` (`src/routes/admin.routes.js`). Blanket CSRF on all admin mutations via `router.use`. Purge endpoints are gated **and** rate-limited.
- **No SQL injection surface:** all Postgres access uses the `postgres` library's tagged-template parameterisation. The two `sql.unsafe(...)` call sites (`src/services/ranking.service.js:197`, `src/scripts/cleanup-smoke-tests.js`) pass values as bound `$1…$n` parameters, and dynamic identifiers in the purge services come from hard-coded allowlists via `quoteIdentifier()`. No `$where`, no `eval`/`new Function` in app code.
- **Upload hardening:** memory storage, 5 MB limit, MIME allowlist, and — critically — all images re-encoded through `sharp` (strips embedded payloads/EXIF, guarantees real image bytes). R2 keys are sanitised and user-scoped.
- **Auth/session:** bcrypt password hashing; Turnstile on signup and on login after repeated failures; layered rate limiting keyed by account+IP on login/forgot/resend/signup; Google OAuth with single-use, 10-minute, session-bound state token; sessions `httpOnly` + `sameSite=lax` + `secure` in prod; suspended/closed accounts are ejected in `populateAuthLocals`.
- **Response headers:** strict CSP, `X-Content-Type-Options`, frame-ancestors locked to `DENY` except the two same-origin review-embed routes, HSTS in prod.
- **Shop authorization:** resource-ownership middleware chains verify event ownership before the resource-scoped checks in `src/routes/organizer-shop.routes.js` (e.g. `canManageEventShop` runs before `canReviewShopPayment`).
