# Security Findings — July 6, 2026

Verified against source on this date. Each finding lists the file/line as of commit `a14d1bd`.

---

## SEC-1 · No session regeneration at login (session fixation) — **P1 · S**

`startAuthenticatedSession()` (`src/routes/authRoutes.js:105`) assigns `req.session.userId` onto the **pre-auth session** without calling `req.session.regenerate()`. The same applies to the email-verification auto-login (`authRoutes.js:~1008`) and the Google OAuth callback (both funnel into the same pattern). A session ID that existed before login stays valid after login, which is the definition of session fixation. Exploitability is limited (cookies are httpOnly, no session ID in URLs), but regeneration is standard defense-in-depth and cheap.

**Fix:** wrap the session writes:

```js
function startAuthenticatedSession(req, user) {
  return new Promise((resolve, reject) => {
    const returnTo = req.session.returnTo; // preserve pre-auth intent
    req.session.regenerate((err) => {
      if (err) return reject(err);
      if (returnTo) req.session.returnTo = returnTo;
      req.session.userId = user._id;
      req.session.role = user.role;
      req.session.userName = user.firstName || '';
      req.session.save((err2) => (err2 ? reject(err2) : resolve()));
    });
  });
}
```

Callers must `await` it. Also regenerate in the verify-email auto-login path.

---

## SEC-2 · Full user document written into the session store — **P1 · S**

`src/routes/authRoutes.js:109`: `req.session.user = user;` stores the entire Mongoose user document — including `passwordHash`, `passwordResetToken`, and verification tokens — into the `sessions` collection in MongoDB, where it sits for up to 7 days per session. A grep shows **nothing ever reads `req.session.user`**; it is dead weight and a data-at-rest exposure (any session-collection dump or backup now contains bcrypt hashes and live reset tokens outside the users collection).

**Fix:** delete the line. Bundle with SEC-1 since both touch `startAuthenticatedSession`. Optionally run a one-off cleanup to strip `session.user` from existing session documents.

---

## SEC-3 · Production rate limiters run in-memory (Redis not configured) — **P0 (ops) · S**

`src/middleware/rate-limit.middleware.js` falls back to a per-process `Map` when `REDIS_URL` is unset — and per the hosting notes, **production Render has no Redis configured**. Consequences in prod:
- Limits reset on every deploy/restart (Render restarts on each push to main).
- If the service ever scales to >1 instance, each instance has its own counters, multiplying every limit.
- The auth-abuse stored-failure counters and Turnstile escalation thresholds weaken accordingly.

**Fix:** provision a Redis instance (Render Key-Value / Upstash free tier suffices at current traffic) and set `REDIS_URL` before or with the production deploy. `validate-env.js` already warns about this at boot — treat the warning as a deploy checklist item. No code change needed.

---

## SEC-4 · Client-IP resolution likely wrong behind Cloudflare + Render — **P0 (ops) · S**

Two related issues:

1. `src/server.js:62` sets `app.set('trust proxy', 1)`. Production runs **two** proxy hops (Cloudflare → Render's load balancer). With `trust proxy = 1`, `req.ip` resolves to the value the *last* hop appended — i.e. a **Cloudflare edge IP**, not the client. Every per-IP rate limit key (`req.ip` in `rate-limit.middleware.js:68`) then buckets many real users behind one edge IP — users can be rate-limited by strangers' traffic, and a single attacker rotates edge IPs for free.
2. `getRequestIpAddress()` (`src/routes/authRoutes.js:96`) takes the **leftmost** `x-forwarded-for` entry, which is fully attacker-controlled — an attacker can spoof any IP into the auth-abuse failure counters and audit logs, or dodge the email+IP signup limits.

**Fix:** since all traffic is proxied by Cloudflare, prefer `CF-Connecting-IP` (set only by Cloudflare, provided Render only accepts traffic from Cloudflare or the header is validated) as the canonical client IP via one shared helper, and use that helper in both the rate limiter `keyFn`s and `getRequestIpAddress`. At minimum, set `trust proxy` to `2` (or a subnet list) and stop reading leftmost XFF. **Verify live** with a debug endpoint right after deploy: log `req.ip`, `req.ips`, and `cf-connecting-ip` for a known request.

---

## SEC-5 · `POST /login` has no CSRF protection — **P2 · S**

`src/routes/authRoutes.js:215` — every other state-changing auth route (`/register`, `/signup`, `/forgot-password`, `/reset-password/:token`, `/logout`, `/resend-verification`) chains `requireCsrfProtection`; `/login` does not. This enables **login CSRF**: an attacker silently logs the victim's browser into an attacker-controlled account, and anything the victim then submits (profile data, uploaded run proofs, payment receipts) lands in the attacker's account.

**Fix:** add `requireCsrfProtection` to the `/login` chain and `<input type="hidden" name="_csrf" value="<%= csrfToken %>">` to `views/auth/login.ejs` (the token is already in `res.locals` on every render). Verify the Turnstile re-render path keeps the token.

---

## SEC-6 · Password reset/change does not invalidate other sessions — **P2 · M**

After a successful `POST /reset-password/:token` (`authRoutes.js:840`), any *existing* sessions for that user stay valid for up to 7 days. The primary reason a user resets a password is suspicion of compromise — the attacker's logged-in session should die with the old password. Same applies to the in-account password-change flow and admin suspension (suspension is handled lazily by `populateAuthLocals`, which is acceptable, but reset is not covered at all).

**Fix:** sessions live in the `sessions` collection (connect-mongo). Two options:
- **Direct delete:** `db.sessions.deleteMany({ session: { $regex: userIdString } })` — works but couples to connect-mongo's JSON-string storage format.
- **Cleaner (recommended):** add `User.sessionEpoch` (Date). Set it to now on password reset/change. In `populateAuthLocals`, destroy any session whose `session.createdAt` (stamp it at login) predates `sessionEpoch`. One extra field on an already-fetched document — no extra query.

---

## SEC-7 · `passwordHash` and token fields are selected by default — **P2 · M**

`src/models/User.js` — `passwordHash`, `passwordResetToken`, `passwordResetExpires`, and email-verification token fields have no `select: false`. Call sites that remember to `.select(...)` (like `populateAuthLocals`) are safe, but any future `User.findById(id)` that flows into a JSON response or template leaks hashes by default. This is exactly the class of bug SEC-2 already instantiated once.

**Fix:** add `select: false` to `passwordHash` and all token/expiry fields; update the few call sites that legitimately need them (`/login` compare, reset flows) to use `.select('+passwordHash')` etc. Run the full auth test group (`npm run test:auth`) after — this change has a real blast radius, hence M.

---

## SEC-8 · `/healthz/sync` trusts session-cached role — **P3 · S**

`src/server.js:200` gates on `req.session?.role !== 'admin'`, set once at login. A demoted admin keeps access until their session expires (up to 7 days). Every other admin route re-checks the DB via `requireAdmin`. Low impact (read-only sync diagnostics) but inconsistent.

**Fix:** route it through `requireAdmin`, or fold it into the admin router.

---

## SEC-9 · CSP allows `'unsafe-inline'` scripts — **P3 · L**

`src/server.js:81` — `script-src 'self' 'unsafe-inline' …`. With EJS templates embedding inline `<script>` blocks (including JSON bootstrapping), this is understandable, but it neutralizes most of CSP's XSS value: any injected `<script>` executes. The existing escaping discipline (enforced by `tests/blog-template-escaping.unit.test.js`) is the real defense today.

**Fix (long-term):** per-request nonce (`res.locals.cspNonce = crypto.randomBytes(16).toString('base64')`), stamp `nonce="<%= cspNonce %>"` on every inline script, replace `'unsafe-inline'` with `'nonce-…'`. Migrate view-by-view behind a report-only header first (`Content-Security-Policy-Report-Only`) to find stragglers without breaking prod. Sequence this **after** AdSense is live — Google's ad scripts have their own CSP requirements and you want to tune both at once.

---

## Checked and clean (do not re-audit)

- Regex injection: all 22 `new RegExp(user input)` sites use `escapeRegex`.
- NoSQL injection: no `$where`; queries build from normalized scalars.
- Uploads: MIME allowlist + magic-byte verification + 5 MB limit + R2 (no local writes).
- Webhook auth: HMAC + replay window + length-safe compare (`routes/webhooks/timing-system.js`). (PROC-6 notes a robustness nit, not a vulnerability.)
- Open redirects: `resolveSafeReturnTo` / `getSafeRunnerReturnTo` enforce same-origin relative paths (`/` prefix, `//` rejected).
- CSRF kill-switch is fail-safe in production (`csrf.middleware.js:9`).
- Admin tiering: `requireFullAdmin` DB-checks role + tier on every call; missing tier defaults to full only for pre-existing admins (documented rationale in code).
