# Onboarding Flow Implementation

**Created:** June 22, 2026
**Status:** ✅ Implemented — June 22, 2026
**Tests:** 44/44 auth passing
**Spec:** P2 from `docs/ROADMAP.md` and `docs/UX-IMPROVEMENT-PLAN.md`

---

## Problem

New users sign up and land on the dashboard with zero guidance. No welcome banner, no profile nudge, no welcome email. "Welcome back, {firstName}!" is shown to first-time users and returning users identically. Users who don't know what to do on day 1 don't return.

---

## Approach

No new DB migrations or model changes. Uses a session flag (`req.session.firstLogin = true`) set at the moment authentication is first established — at email verification success or Google OAuth new-user creation — then consumed once by the dashboard controller.

---

## What Was Built

### Step 1 — First-Login Detection
- `req.session.firstLogin = true` set in the email verification route (after `req.session.userId` is assigned)
- Email verify success page bypassed → redirect to `/runner/dashboard?welcome=1` directly
- Same flag set for new Google OAuth users at account creation
- Dashboard controller reads the flag, passes `isFirstLogin: true` to view, clears the flag

### Step 2 — Welcome Banner on Dashboard
- Shown when `isFirstLogin` is true
- 3-step onboarding guide: Complete profile → Browse events → Register and run
- Dismissable via localStorage (`hr_welcome_dismissed`) — never shown again after dismiss
- CSS in `runner-dashboard.css`

### Step 3 — Profile Completeness Nudge on Dashboard
- `getRunnerProfileCompleteness(user)` (already exists in `profile-completion.service.js`) added to dashboard data
- Card shown when `profileCompleteness.percent < 60` (fewer than 5 of 8 fields)
- Lists missing fields; links to `/runner/profile`

### Step 4 — Welcome Email
- New `account.welcome` event registered in `communication-events.registry.js`
- Sent (non-blocking) at email verification success and at Google OAuth new user creation
- Email: "Welcome to HelloRun, {firstName}!" with 3 next steps and dashboard link

### Step 5 — Improved Empty State CTAs
- Upcoming events empty state: more actionable copy + prominent Browse Events button
- Submissions empty state: explains what to do after registering
- Badges empty state: explains how badges are earned

---

## Files Changed

| File | Change |
|------|--------|
| `src/routes/authRoutes.js` | `firstLogin` flag at email verify + Google OAuth; send welcome email; redirect to dashboard |
| `src/services/communication-events.registry.js` | Register `account.welcome` event |
| `src/services/communication.service.js` | Add `account.welcome` email case |
| `src/controllers/runner.controller.js` | Add `profileCompleteness` + `isFirstLogin` to dashboard data |
| `src/views/runner/dashboard.ejs` | Welcome banner, profile nudge, improved empty states |
| `src/public/css/runner-dashboard.css` | Banner + nudge styles |

---

## Verification Checklist

- [ ] Email signup → verify → lands on dashboard with welcome banner
- [ ] Refresh dashboard → banner gone (localStorage)
- [ ] Welcome email received with correct name and steps
- [ ] Google OAuth signup → dashboard with welcome banner
- [ ] Profile < 60% → nudge card shown with missing fields
- [ ] Profile ≥ 60% → nudge card hidden
- [ ] Returning user login → no banner
- [ ] `npm run test:auth` → 44/44 passing
