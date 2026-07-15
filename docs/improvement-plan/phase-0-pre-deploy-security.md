# Phase 0 — Pre-Deploy Security Quick Wins

**Priority:** P0–P1 · **Effort:** ~half a day total · **When:** before or with the production push.
All three open items change auth-adjacent runtime behavior → each is a **separate commit** with its own post-deploy smoke check and a rollback plan (Render → previous deploy).

---

## SEC-N1 · `passwordHash` in the session store — ✅ FIXED (July 6)

`startAuthenticatedSession` (`src/routes/authRoutes.js:105`) did `req.session.user = user` with the **full Mongoose user document** — including `passwordHash`, tokens, and every profile field — serializing it into the `sessions` collection for up to 7 days per login. A repo-wide grep confirmed **nothing ever read `req.session.user`**; it was pure sensitive-data sprawl (any session-store dump/backup contained bcrypt hashes) plus session-document bloat.

- **Fix applied:** the line was deleted. Unit suite 315/315 green.
- **Post-deploy cleanup (one-off, optional):** existing session docs still contain old snapshots until they expire (≤7 days). To purge immediately: `db.sessions.deleteMany({})` — logs everyone out once — or just let TTL expiry drain them.

## SEC-N2 · No `session.regenerate()` on login (session fixation) — **supervised**

**Where (all 3 login sites):**
1. Password login → `startAuthenticatedSession` call at `src/routes/authRoutes.js:299`
2. Google OAuth callback → `startAuthenticatedSession` call at `:703`
3. Email-verification auto-login → direct `req.session.userId = user._id` at `:1008`

**Problem:** the pre-auth session ID is kept after authentication. If an attacker can fixate a victim's cookie value beforehand (shared computer, subdomain cookie injection, XSS on any same-site page), logging in upgrades the attacker-known session ID to an authenticated one. `httpOnly` + `sameSite=lax` narrows the window; regenerating closes it. Same mechanism also means a suspended-then-reinstated user keeps the same SID forever.

**Fix sketch:** make `startAuthenticatedSession` async and regenerate first, carrying over the few pre-auth values that must survive:

```js
function startAuthenticatedSession(req, user) {
  return new Promise((resolve, reject) => {
    const carried = {
      returnTo: req.session.returnTo,
      firstLogin: req.session.firstLogin
    };
    req.session.regenerate((err) => {
      if (err) return reject(err);
      if (carried.returnTo) req.session.returnTo = carried.returnTo;
      if (carried.firstLogin) req.session.firstLogin = carried.firstLogin;
      req.session.userId = user._id;
      req.session.role = user.role;
      req.session.userName = user.firstName || '';
      req.session.loginSuccess = true;
      resolve();
    });
  });
}
```

- Update the two call sites to `await` it; convert the `:1008` inline assignment to use the same helper.
- **Watch for:** `redirectAfterLogin` reads `req.session.returnTo` (must be carried); the OAuth path reads `req.session.firstLogin` *before* the call (already does); the CSRF token in `attachCsrfToken` is session-bound — a fresh session gets a fresh token, which is correct.
- Also add `req.session.regenerate` (or at minimum destroy) when an **admin grants/revokes admin role or tier** on a live user — today a demoted admin's `req.session.role === 'admin'` still passes the `/healthz/sync` check (that endpoint trusts the session role; every other admin route re-reads the DB).
- **Verify:** unit suite; then post-deploy: password login, Google login, email-verify auto-login, and a login with `?returnTo` — confirm redirect target survives and the `hr.sid` cookie value **changes** across login.

## SEC-N3 · IP attribution is spoofable and inconsistent — **supervised**

**Two conflicting mechanisms exist today:**
- `getRequestIpAddress` (`src/routes/authRoutes.js:95`) takes the **first** `x-forwarded-for` entry — that is the *client-supplied* value behind Cloudflare (CF appends the real IP; it doesn't strip client-sent XFF). An attacker can rotate fake IPs to dodge the per-IP login-failure tracking, or **poison the record for someone else's IP**. This value is also what lands in consent records and audit logs.
- Rate limiters key on `req.ip` (`src/middleware/rate-limit.middleware.js:68`) with `trust proxy: 1` (`server.js:62`). Behind **two** hops (Cloudflare → Render's proxy), one trusted hop likely resolves `req.ip` to a **Cloudflare edge IP**, so "per-IP" limits actually bucket many real users together (over-throttling) while giving each attacker a fresh bucket per CF edge.

**Fix:** one canonical helper, used everywhere:
1. Create `src/utils/client-ip.js`: prefer `req.headers['cf-connecting-ip']` (set by Cloudflare, not client-forgeable **as long as origin traffic only comes via Cloudflare**), fall back to `req.ip`.
2. Replace `getRequestIpAddress`'s XFF parsing and the limiter's `req.ip` with it.
3. Ops prerequisite (see runbook, Phase 2): Render origin should only accept Cloudflare traffic (Cloudflare IP allowlist or Authenticated Origin Pulls) — otherwise a direct-to-origin request can forge `CF-Connecting-IP`.
- **Verify:** post-deploy, log the resolved IP for one known request (your own) and confirm it matches your real public IP, not a 104.x/172.x Cloudflare address.

## SEC-N4 · Unpinned third-party CDN script on every page

**Where:** `src/views/layouts/head.ejs:47` → `<script src="https://unpkg.com/lucide@latest"></script>` (site-wide head, also `error.ejs` + 3 more); `quill@1.3.7` from jsdelivr in 3 editor views.

**Problem:** `@latest` means any new lucide release — or an unpkg compromise — ships arbitrary JS to every visitor instantly, with the CSP explicitly allowing it. No SRI is possible on `@latest`. It's also the slowest resource pattern available (302 redirect + short edge cache) on the critical path of *every* page. Quill 1.3.7 is pinned but from 2019 and unmaintained (Quill 1.x has a disputed XSS advisory, CVE-2021-3163).

**Fix (pattern already exists — tesseract is vendored in `src/public/js/vendor/`):**
1. Vendor a pinned `lucide.min.js` into `src/public/js/vendor/lucide/` and swap all 4+ references to the local path.
2. Vendor `quill.min.js` + its CSS the same way (upgrade to Quill 2.x later — separate item, Phase 5, since the API changed).
3. Then **remove `https://unpkg.com` and `https://cdn.jsdelivr.net` from the CSP** `script-src`/`style-src`/`connect-src` in `server.js` — shrinking the allowed script origins is the real win.
- **Verify:** grep views for `unpkg|jsdelivr` → 0 hits; load home/dashboard/blog post pages, confirm icons render and no CSP violations in console.

---

## Exit criteria
- [ ] SEC-N1 deployed (already merged in working tree)
- [ ] All logins regenerate the session ID; smoke-checked on prod
- [ ] One canonical client-IP helper; limiter and abuse-tracking keys verified against a real request
- [ ] Zero third-party script origins in CSP; lucide/quill served from `/js/vendor/`
