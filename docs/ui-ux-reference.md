# HelloRun — UI/UX Reference Document

> Living reference for all design decisions, CSS architecture, component patterns, and known rules for the HelloRun project.
> Update this file whenever a new design decision is made, a component is built, or a bug is fixed that affects the UI.

---

## Table of Contents

1. [Brand Identity](#1-brand-identity)
2. [Global Design Tokens (style.css)](#2-global-design-tokens-stylecss)
3. [Typography](#3-typography)
4. [CSS Architecture & File Map](#4-css-architecture--file-map)
5. [CSS Variable Inconsistency Warning](#5-css-variable-inconsistency-warning)
6. [Page Background Pattern](#6-page-background-pattern)
7. [Global .btn Gotcha (Critical)](#7-global-btn-gotcha-critical)
8. [Auth Pages — Login & Signup](#8-auth-pages--login--signup)
   - [Layout Structure](#81-layout-structure)
   - [Left Panel Design Pattern (Shared)](#82-left-panel-design-pattern-shared)
   - [Login Page — login.ejs / login.css](#83-login-page--loginejs--logincss)
   - [Signup Page — signup.ejs / signup.css](#84-signup-page--signupejs--signupcss)
   - [Auth Form Inputs (Floating Label Pattern)](#85-auth-form-inputs-floating-label-pattern)
   - [Auth Buttons](#86-auth-buttons)
   - [Google OAuth Button](#87-google-oauth-button)
   - [Alerts & Validation Feedback](#88-alerts--validation-feedback)
   - [Icons in Auth Pages](#89-icons-in-auth-pages)
   - [Auth Page Animations](#810-auth-page-animations)
   - [Auth Mobile Breakpoints](#811-auth-mobile-breakpoints)
9. [Navigation](#9-navigation)
10. [Lucide Icons Integration](#10-lucide-icons-integration)
11. [Runner Dashboard](#11-runner-dashboard)
12. [Organizer Dashboard](#12-organizer-dashboard)
13. [Admin Dashboard](#13-admin-dashboard)
14. [Public Events Page](#14-public-events-page)
15. [Running Groups](#15-running-groups)
16. [Blog System](#16-blog-system)
17. [Notifications](#17-notifications)
18. [Static Pages](#18-static-pages)
19. [Known Bugs Fixed (Do Not Re-Introduce)](#19-known-bugs-fixed-do-not-re-introduce)
20. [Design Decisions Log](#20-design-decisions-log)
21. [Pending UI/UX Work](#21-pending-uiux-work)

---

## 1. Brand Identity

| Property | Value |
|---|---|
| Platform name | **helloRun** (lowercase h, uppercase R) |
| Domain | hellorun.online |
| Icon file | `/images/helloRun-icon.webp` |
| Brand tone | Warm, energetic, inclusive, community-first |
| Icon concept | Runner stepping forward inside a conversation shape |

### Colour Personality
- **Warm orange** → energy, action, CTAs
- **Cool blue** → trust, community, backgrounds
- **White** → clarity, form panels

---

## 2. Global Design Tokens (style.css)

These are defined in `src/public/css/style.css` and apply globally via `:root`.

```css
/* Colors */
--orange: #FA9A4B
--soft-orange: #E0A46A
--light-blue: #8FD5EC
--sky-blue: #78C0E9
--warm-beige: #F2EAD3
--white: #FFFFFF
--dark-gray: #333333
--medium-gray: #666666
--light-gray: #F8F9FA

/* Typography */
--heading-font: 'Poppins', sans-serif
--body-font: 'Inter', sans-serif

/* Layout */
--section-padding: 4rem 1.5rem
--container-width: 1200px

/* Shadows */
--shadow-sm: 0 2px 4px rgba(0,0,0,0.05)
--shadow-md: 0 4px 12px rgba(0,0,0,0.08)
--shadow-lg: 0 10px 25px rgba(0,0,0,0.1)

/* Border Radius */
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 20px
```

---

## 3. Typography

| Context | Font | Weight | Size |
|---|---|---|---|
| Headings (h1–h6) | Poppins | 700–800 | clamp-based, responsive |
| Body text | Inter | 400 | 1rem / 16px base |
| h1 | Poppins | 800 | clamp(2.5rem, 5vw, 3.5rem) |
| h2 | Poppins | 700 | clamp(2rem, 4vw, 2.5rem) |
| Auth panel headline | Poppins | 700 | ~1.72–1.8rem |
| Form labels (floating) | System font | 400 | 1rem → shrinks to 0.8rem on focus |
| Feature list items | System font | 400 | 0.92rem |
| Link helpers / footnotes | System font | 400–600 | 0.85–0.88rem |

**h2 underline decoration:** `h2::after` draws a 4px wide orange underline centered below the heading (defined in `style.css`).

---

## 4. CSS Architecture & File Map

```
src/public/css/
  style.css              ← Global: nav, footer, .btn, typography, layout, home page
  helloRun.css           ← Landing page (hero, features, how-it-works, CTA sections)
  login.css              ← /login page only
  signup.css             ← /signup page only
  forgot-password.css    ← /forgot-password page
  reset-password.css     ← /reset-password page
  events.css             ← /events and /events/:slug
  leaderboard.css        ← /leaderboard
  runner-dashboard.css   ← /runner/dashboard, /runner/profile, /runner/groups, /runner/security
  organizer-dashboard.css← /organizer/* dashboard pages
  create-event.css       ← /organizer/events/new and /organizer/events/:id/edit
  complete-profile.css   ← /organizer/complete-profile
  application-status.css ← /organizer/application-status
  blog.css               ← /blog and /blog/:slug (public)
  admin-blog.css         ← /admin/blog/* (admin blog management)
  verify-email-sent.css  ← email verification flow pages
```

**Rule:** Each page has its own CSS file. Never add page-specific styles to `style.css`.

---

## 5. CSS Variable Inconsistency Warning

`login.css` and `signup.css` use **different spacing variable prefixes**. This is an existing inconsistency. Do not "fix" it without a full audit — the values are also slightly different.

| Variable | login.css | signup.css |
|---|---|---|
| Extra small | `--spacing-xs: 0.5rem` | `--space-xs: 0.25rem` |
| Small | `--spacing-sm: 0.75rem` | `--space-sm: 0.375rem` |
| Medium | `--spacing-md: 1rem` | `--space-md: 0.75rem` |
| Large | `--spacing-lg: 1.25rem` | `--space-lg: 1rem` |
| Extra large | `--spacing-xl: 1.5rem` | `--space-xl: 1.5rem` |

When porting CSS between the two auth files, always translate variable names.

---

## 6. Page Background Pattern

Used on `/login`, `/signup`, and `/forgot-password` — creates the soft gradient atmosphere:

```css
background:
  radial-gradient(900px 420px at 15% -10%, rgba(14, 165, 233, 0.16), transparent 62%),
  linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
```

This gives a very subtle blue glow top-left over a light gray gradient.

---

## 7. Global `.btn` Gotcha (Critical)

`style.css` defines `.btn` with these properties that **bleed into any element that also uses `.btn`**:

```css
.btn {
  text-transform: uppercase;
  letter-spacing: 1px;
  background: linear-gradient(135deg, var(--orange), var(--soft-orange));
  border-radius: 50px;           /* pill shape */
}
```

**Rule:** Any auth page button that uses `.btn` as a base class MUST override these:
```css
.my-auth-btn {
  text-transform: none;
  letter-spacing: normal;
}
```

This was already fixed on `.btn-primary` and `.btn-cta` in `login.css`. Applies to any new button that combines `.btn` with auth styling.

---

## 8. Auth Pages — Login & Signup

### 8.1 Layout Structure

Both pages use a **two-panel card** layout:

| Page | Left Panel | Right Panel |
|---|---|---|
| `/login` | "New to HelloRun?" — warm red-orange gradient, right-aligned, feature list | Login form — white background |
| `/signup` | "Create Your Account" — cool blue gradient, right-aligned, feature list | Signup form — white background |

**Shared structural rules:**
- Container max-width: `980px` (login) / `1040px` (signup)
- Grid: `1fr 1fr` (login) / `40% / 60%` (signup)
- Card has `border-radius: var(--radius-md)`, `box-shadow: 0 22px 55px rgba(15,23,42,0.16)`, `overflow: hidden`
- Both panels have `padding: var(--spacing-xl)` / `var(--space-xl)`
- On mobile (≤767px): stacks vertically, right/form panel shown first (on top)

---

### 8.2 Left Panel Design Pattern (Shared)

Both the login left panel and signup left panel follow the same visual design language. This is the **canonical panel pattern**:

**HTML structure:**
```html
<div class="[panel-wrapper]">
  <!-- Brand Logo (signup only — removed from login) -->
  <div class="brand-logo">
    <img src="/images/helloRun-icon.webp" class="logo-img">
    <span class="brand-name">helloRun</span>
  </div>

  <!-- Headline -->
  <h1 / h3 class="[headline-class]">New to HelloRun? / Create Your Account</h1>
  <p class="[subheading-class]">Subtext line</p>

  <!-- Feature list -->
  <ul class="features-list / brand-features">
    <li class="feature-item / li">
      <i data-lucide="trophy" class="feature-icon"></i>
      <span class="feature-text">Join virtual races &amp; events</span>
    </li>
    <!-- ... 4 items total -->
  </ul>

  <!-- Closing link with divider -->
  <p class="panel-signup-link / auth-login-link">
    Already have an account? <a href="/login">Log in →</a>
  </p>
</div>
```

**CSS rules that make the panel look correct:**

```css
/* Panel container */
align-items: flex-end;   /* content snaps to right edge */
text-align: right;        /* all text right-aligned */
position: relative;
overflow: hidden;

/* Decorative radial gradient overlay via ::before */
::before {
  content: '';
  position: absolute; top:0; left:0; right:0; bottom:0;
  background:
    radial-gradient(circle at 20% 80%, rgba(255,255,255,0.12-0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08-0.10) 0%, transparent 50%);
  pointer-events: none;
}

/* Content sits above overlay */
.panel-content / .auth-header > * {
  position: relative;
  z-index: 1;
}

/* Feature list items — icon on RIGHT */
.feature-item / .brand-features li {
  display: flex;
  flex-direction: row-reverse;   /* ← this puts icon on right */
  align-items: center;
  gap: var(--spacing-sm);
}

/* Feature text — must override inherited text-align: right */
.feature-text {
  flex: 1;
  text-align: left;   /* ← critical: without this, text renders against the icon */
}

/* Feature icon — circular white badge */
.feature-icon / .brand-features i {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22–26px;
  height: 22–26px;
  min-width: 22–26px;
  background: rgba(255,255,255,0.92);
  border-radius: 50% / var(--radius-full);
  padding: 3–4px;
  flex-shrink: 0;
}

/* Closing link — border-top divider style */
.panel-signup-link / .auth-login-link {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid rgba(255,255,255,0.2);
  font-size: 0.88rem;
  color: rgba(255,255,255,0.85);
  text-align: right;
}
.panel-signup-link a / .auth-login-link a {
  color: var(--white);
  font-weight: 600;
  text-decoration: none;
}
```

**The 4 feature bullets (same wording on both pages):**
1. `<i data-lucide="trophy">` — Join virtual races & events
2. `<i data-lucide="activity">` — Track your runs & progress
3. `<i data-lucide="award">` — Earn finisher certificates
4. `<i data-lucide="users">` — Connect with a running community

---

### 8.3 Login Page — login.ejs / login.css

**Left panel gradient (warm red-orange):**
```css
background: linear-gradient(135deg, rgba(124,45,18,0.94) 0%, rgba(194,65,12,0.96) 58%, rgba(154,52,18,0.96) 100%);
```

**Left panel class names (login-specific):**
- Wrapper: `.auth-panel.auth-panel-left`
- Content container: `.panel-content`
- Headline: `.panel-headline` — `font-size: 1.72rem; font-weight: 700; text-align: right`
- Subheading: `.panel-subheading` — `font-size: 1rem; text-align: right`
- Feature list: `.features-list` (with `border-top` divider)
- Feature items: `.feature-item` with `.feature-icon` and `.feature-text`
- Closing link: `.panel-signup-link`
- Feature icon color: `color: #9a3412` (dark rust)

**Right panel (login form):**
- Class: `.auth-panel.auth-panel-right`
- Background: `#ffffff`
- Form title: `.form-title` — `font-size: 1.45rem; text-align: center`
- Form subtitle: `.form-subtitle` — `font-size: 0.88rem; text-align: center`
- Inputs use the `.form-group` floating-label pattern (see §8.5)
- Buttons: `.btn.btn-primary` (orange) + `.btn.btn-google` (white outlined)

**Note:** The login left panel does NOT include the `brand-logo` / `brand-name` block. That was intentionally removed in favour of a pure "New to HelloRun?" headline-first approach.

---

### 8.4 Signup Page — signup.ejs / signup.css

**Left panel gradient (cool blue-teal):**
```css
background: linear-gradient(135deg, #075985 0%, #0369a1 58%, #0f766e 100%);
```

**Left panel class names (signup-specific):**
- Wrapper: `.auth-header` (the whole left section)
- Brand logo block: `.brand-logo` with `.logo-img` and `.brand-name`
- Headline: `h1` inside `.auth-header` — `font-size: 1.8rem; font-weight: 800`
- Subheading: `.auth-subtitle` — `font-size: 0.98rem; color: #e0f2fe`
- Feature list: `.brand-features` (with `border-top` divider)
- Feature items: `li` inside `.brand-features`
- Feature icon: `i` inside `li` — `color: #075985` (dark blue)
- Closing link: `.auth-login-link`

**Right panel (signup form):**
- Class: `.auth-form-wrapper`
- Uses `.compact-input-group` floating-label inputs (see §8.5)
- Two-column name row: `.compact-form-row` with two `.compact-input-group` children
- Role selector: `<select>` inside `.compact-input-group`
- Password strength indicator: `.password-strength > .strength-bar > .strength-fill`
- Consent checkbox: `.checkbox-group` with links to `/privacy` and `/terms`
- Submit button: `.btn.btn-primary.btn-full`
- Google OAuth divider: `.oauth-divider`
- Google button: `.btn-google`

---

### 8.5 Auth Form Inputs (Floating Label Pattern)

Both auth pages use floating labels — the label sits centred in the input and floats to the top-left corner on focus or when filled.

**Login pattern (`.form-group`):**
```html
<div class="form-group">
  <input type="email" id="email" name="email" required>
  <label for="email">Email address</label>
</div>
```
```css
/* Label default: vertically centred */
.form-group label {
  position: absolute;
  top: 50%;
  left: 14px;          /* ← must match input's padding-left */
  transform: translateY(-50%);
  transition: all 0.2s;
}
/* Label floated: top-left corner */
.form-group input:focus ~ label,
.form-group input:not(:placeholder-shown) ~ label {
  top: 6px;
  left: 10px;
  font-size: 0.75rem;
}
/* Input */
.form-group input {
  padding: 14px 12px 6px 14px;   /* top/bottom creates space for floating label */
  height: 44px;
}
```

**⚠️ Input padding critical note:** Input `padding-left` and label `left` MUST match. Previously the CSS had `padding-left: 40px` and `left: 40px` expecting icon elements that no longer exist in the HTML. This was corrected to `14px`. Never re-add icon padding offsets without adding the actual icon HTML.

**Signup pattern (`.compact-input-group`):**
```css
/* Adds `.focused` class via JS, and `.filled` class when has value */
.compact-input-group.focused label,
.compact-input-group.filled label {
  top: 0.2rem;
  font-size: 0.8rem;
  color: var(--primary-orange);
}
```
- Focus ring: `box-shadow: 0 0 0 3px rgba(194,65,12,0.18)`
- Filled state border: `#0ea5e9` (blue)
- Error state border: `var(--error-red)`

---

### 8.6 Auth Buttons

**Primary CTA (orange, used in both login and signup right panel):**
```css
.btn.btn-primary {
  background: #c2410c;
  color: white;
  border: 2px solid #c2410c;
  border-radius: var(--radius-md);   /* 12px — NOT pill */
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  text-transform: none;              /* overrides global .btn */
  letter-spacing: normal;            /* overrides global .btn */
  min-height: 48px;
  box-shadow: 0 4px 12px rgba(194,65,12,0.26);
}
.btn-primary:hover {
  background: #9a3412;
  transform: translateY(-2px);
}
```

**Rule:** Auth buttons use `border-radius: var(--radius-md)` (12px squared corners). The landing page now reuses this stronger CTA treatment for primary acquisition buttons as well; do not reintroduce the older pill-shaped landing CTA style.

---

### 8.7 Google OAuth Button

```css
.btn-google {
  background: white;
  color: #111827;
  border: 2px solid #94a3b8;
  border-radius: var(--radius-md);
  min-height: 48px;
}
.btn-google:hover {
  background: #f8fafc;
  border-color: #475569;
  color: #c2410c;
}
```

**Google "G" mark:** Uses a CSS conic-gradient circle (no image needed):
```css
.google-mark {
  width: 24px; height: 24px;
  border-radius: var(--radius-full);
  background: conic-gradient(from -45deg, #4285f4 0 25%, #34a853 0 50%, #fbbc05 0 75%, #ea4335 0 100%);
  color: white;
  font-size: 0.86rem;
  font-weight: 800;
}
```

**Divider between password submit and Google button:**
```html
<div class="oauth-divider"><span>or</span></div>
```
Uses `::before` pseudo-element for the horizontal line.

---

### 8.8 Alerts & Validation Feedback

**Login alerts (`.alert`):**
```css
.alert-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
  border-radius: var(--radius-sm);
}
```
Animates in with `slideInDown` (0.3s ease, from -10px opacity 0 → normal).

**Signup alerts (`.compact-alert`):**
```css
.alert-error  → background #fee2e2, border #fca5a5
.alert-info   → background #d1fae5, border #6ee7b7 (success/info state)
```

**Inline field errors (`.form-error`, `.checkbox-error`):**
- Default: `height: 0; opacity: 0` (invisible but in flow)
- Shown via `.show` class: `height: auto; opacity: 1`
- Font size: `0.75rem`, color: `var(--error-red)`

**Consent checkbox error state (`.checkbox-group.error`):**
- Background: `#fef2f2`, border: `1px solid #fca5a5`

---

### 8.9 Icons in Auth Pages

**Library:** Lucide Icons, loaded via CDN in `<head>`.

**Initialisation (MUST be in each auth page's inline `<script>`):**
```html
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  });
</script>
```

**Usage pattern — icon as SVG replacement:**
```html
<i data-lucide="trophy" class="feature-icon"></i>
```
Lucide replaces `<i>` elements with inline `<svg>`. SVG size is controlled by the parent's CSS (`width`/`height` on the wrapper).

**Icons used in auth feature lists:**
- `trophy` — races/events
- `activity` — run tracking
- `award` — certificates
- `users` — community

**Why `display: flex` on icon container matters:** Using `display: inline-flex` or not setting `display` causes the icon to align to text baseline instead of centre. Always use `display: flex; align-items: center; justify-content: center;` on icon badge wrappers.

---

### 8.10 Auth Page Animations

Both auth pages use keyframe animations for entrance effects:

```css
@keyframes slideInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

**Staggered delays on login left panel:**
- Panel headline: `0.1s`
- Panel subheading: `0.2s`
- Feature items: `0.3s`, `0.4s`, `0.5s`, `0.6s` (nth-child)
- Closing link: `0.8s`

---

### 8.11 Auth Mobile Breakpoints

**≤767px (tablet/mobile):**
- Two-panel grid collapses to single column
- Left/branding panel is hidden or de-emphasised; form panel shown at top
- `.features-list` / `.brand-features` → `display: none`
- `.panel-signup-link` → `display: none`
- Form panel takes full width
- Container border-radius reduced

**≤480px (small mobile):**
- Input font-size: 0.9rem
- Tighter padding throughout
- Form title font-size reduced

---

## 9. Navigation

**File:** `src/views/layouts/nav.ejs`
**Styles:** `src/public/css/style.css`

### State-based nav links

| User State | Links shown |
|---|---|
| Logged out | Home · Events · Blog · Leaderboard · **Login** · **Sign Up** |
| Runner | Home · Events · Blog · Leaderboard · **Dashboard** · Hi, [Name] · Logout |
| Pending Organizer | Home · Events · Blog · Leaderboard · **My Application** · Hi, [Name] · Logout |
| Approved Organizer | Home · Events · Blog · Leaderboard · **Dashboard** · Hi, [Name] · Logout |
| Admin | Home · Events · Blog · Leaderboard · **Admin** · Hi, [Name] · Logout |

**Notification badge:** Runners see an unread count badge on the notification bell icon in the nav.

**Mobile nav:** Hamburger menu (`☰`) collapses nav links. Mobile breakpoint: `≤768px`.

**Auth redirect rule:** If a logged-in user visits `/login` or `/signup`, they are redirected to their role-based dashboard (`redirectIfAuth` middleware).

---

## 10. Lucide Icons Integration

- **Loaded via CDN** in `src/views/layouts/head.ejs`
- **Must call `lucide.createIcons()`** on `DOMContentLoaded` in any page that uses `data-lucide` elements
- Pages that include Lucide icons: `login.ejs`, `signup.ejs`, runner dashboard, organizer dashboard, admin pages, notification pages
- **Icon rendering:** `<i data-lucide="icon-name">` gets replaced with an inline `<svg>` element
- **Sizing:** Control via CSS on the `<i>` wrapper or its parent — the SVG inherits `width`/`height`

---

## 11. Runner Dashboard

**File:** `src/views/runner/dashboard.ejs`
**CSS:** `src/public/css/runner-dashboard.css`

### Panel layout
- Left quick-menu panel + main content area on desktop
- Collapsible panels: Personal Info, Activity, Certificates, Progress, Running Groups, Account Security
- Global filter bar: `eventMode` + `resultStatus` dropdowns with Apply / Clear actions

### Activity feed
- Shows merged registration events + running-group events
- Relative timestamps: `just now`, `Xm ago`, `Xh ago`, `Xd ago`
- Locale-aware absolute timestamps via `Intl.DateTimeFormat`

### Account security panel
- Shows sign-in method label
- Shows `Google linked` badge when Google identity is attached
- Shows `Set password` CTA for Google-only users (no local password)
- Unlink button with confirmation modal (focus-trapped, returns focus on close)

### Mobile breakpoints
- `max-width: 768px`: list rows compact mode, tighter typography
- `max-width: 480px`: single-column, minimal gaps

---

## 12. Organizer Dashboard

**CSS:** `src/public/css/organizer-dashboard.css`

### Analytics panels
- Range filter: `7d`, `30d`, `all`
- Range-based metrics: registrations, submissions, approvals
- Per-event queue breakdown with direct review links
- Quick actions for next pending payment/result review

### Review queue
- Pending payment proof reviews
- Pending result submission reviews
- Direct links: `/organizer/events/:id/registrants?payment=proof_submitted`

---

## 13. Admin Dashboard

**CSS:** inline/admin-specific files

### Panels
- Platform stats snapshot
- Pending organizer applications queue
- Blog moderation queue

### Blog review page
- Inline editing of all blog fields
- Debounced autosave (`PATCH /admin/blog/posts/:id/autosave`)
- Change History panel showing before/after revisions
- Moderation UI adapts to selected status while editing

---

## 14. Public Events Page

**CSS:** `src/public/css/events.css`

### Filter/search UX
- Filters: `q` (text), `eventType`, `distance`, `status`
- Results summary with active-filter count
- `Clear filters` action (standardised label across all list pages)
- Pagination with preserved query params
- Direct page-number navigation

### Event detail page (`/events/:slug`)
- Hero section + key facts block + CTA hierarchy
- Mobile sticky registration CTA
- Organizer branding: logo, banner, promotional poster, gallery images

---

## 15. Running Groups

**Routes:** `GET /runner/groups`, `GET /runner/groups/:slug`, `GET /runner/groups/create`

### Group detail page
- Activity feed for the group (create/join/leave events)
- Member list
- Locale-aware timestamps

### Dashboard panel (compact)
- Shows current group membership summary
- Single `Manage Groups` entry button
- Search + join + create flows on the dedicated `/runner/groups` page

---

## 16. Blog System

**Public:** `GET /blog`, `GET /blog/:slug`
**Author:** `GET/POST /runner/blog/*`
**Admin:** `GET/POST /admin/blog/*`
**CSS:** `src/public/css/blog.css` (public), admin-specific files

### Status workflow
`draft` → `pending_review` → `published` | `rejected` → `archived`

### Public page SEO
- `canonical`, `meta description`, `og:*`, `twitter:*` tags set per post
- Cover image served from Cloudflare R2

### View counting policy
- Logged-in user: 1 view per post per 24h
- Anonymous: 1 view per IP per 24h
- Admin and post author views are excluded

### Blog composer (admin)
- Quill rich text editor
- Debounced autosave (PATCH endpoint)
- BlogRevision model tracks before/after + changedFields

---

## 17. Notifications

**Runner nav badge:** Unread notification count shown on bell icon.

**Notification types:**
- Registration confirmed
- Payment proof submitted (to organizer)
- Payment approved / rejected (to runner)
- Result approved / rejected (to runner)
- Certificate issued (to runner)

**Read/mark flow:** `POST /runner/notifications/:id/mark-read`
- `returnTo` param is sanitised against open redirects

---

## 18. Static Pages

All static pages share the global layout (nav + footer). No page-specific CSS files exist for these — they use `style.css` global styles.

| Route | Page |
|---|---|
| `/about` | About HelloRun |
| `/how-it-works` | Platform explainer |
| `/contact` | Contact form / info |
| `/faq` | Frequently asked questions |
| `/privacy` | Privacy policy (DB-driven, fallback to markdown) |
| `/terms` | Terms and conditions (DB-driven, fallback to markdown) |

**Privacy / Terms rendering:** Loads current published DB version. Falls back to `docs/contents/` markdown file if no published record exists.

---

## 19. Known Bugs Fixed (Do Not Re-Introduce)

### Bug 1: Global `.btn` text-transform bleeding into auth buttons
**Problem:** `style.css` sets `text-transform: uppercase; letter-spacing: 1px` on `.btn`. Any auth button using `.btn` as a base class inherits this, making button text appear in ALL CAPS with wide spacing.
**Fix:** Both `.btn-cta` and `.btn-primary` in `login.css` have explicit overrides:
```css
text-transform: none;
letter-spacing: normal;
```
**Rule:** Always add these overrides when creating any new auth button that extends `.btn`.

---

### Bug 2: Input padding offset with no icons
**Problem:** Form inputs in `login.css` had `padding-left: 40px` and labels at `left: 40px`, expecting `.input-icon` elements that were removed from the HTML in a previous redesign. This caused labels to be misaligned and inputs to have a large left gap.
**Fix:** Corrected to:
```css
input: padding-left: 14px
label: left: 14px
focused label: left: 10px
```
**Rule:** Input `padding-left` and label `left` values must always match. If you add an icon to an input, you must update both values (typically to 40px) AND add the icon HTML.

---

### Bug 3: Feature icon SVG baseline alignment
**Problem:** Using `display: inline-flex` or no `display` on icon wrappers caused SVG icons to align to text baseline instead of vertically centring within their circular badge.
**Fix:** All feature icon containers use `display: flex; align-items: center; justify-content: center;`.
**Rule:** Never use `inline-flex` for Lucide icon badge wrappers in list rows.

---

### Bug 4: Feature text aligning to right inside row-reverse flex
**Problem:** When `.auth-panel-left` sets `text-align: right`, child `.feature-text` inherits this. In a `row-reverse` flex row, this causes the text to read right-to-left against the icon instead of naturally left-to-right.
**Fix:** `.feature-text { text-align: left; }` explicitly overrides the inherited alignment.
**Rule:** Any text element inside a `row-reverse` flex container that lives inside a `text-align: right` parent must set `text-align: left` to read naturally.

---

### Bug 5: Port EADDRINUSE on server start
**Problem:** `npm start` fails with `EADDRINUSE :3001`. This is caused by a previous server instance still running, not a code error.
**Fix:** Kill the existing process: find and kill the process on port 3001, then restart.
**Not a code bug** — this is an operational issue.

---

## 20. Design Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| Apr 2026 | Login left panel: removed brand logo/name block | Headline-first approach — "New to HelloRun?" is stronger as an opener than repeating the logo already in the nav |
| Apr 2026 | Login/Signup panels: icons on RIGHT (row-reverse) | Visual consistency — both panels use the same row-reverse icon pattern, creating a mirror effect between the two auth pages |
| Apr 2026 | Login left panel: right-aligned, not centred | Matches signup's `auth-header` alignment — both branded panels are now right-aligned, creating visual parity |
| Apr 2026 | Login closing element: link with divider, not CTA button | Signup uses a plain link footer too. A CTA button on the login left panel was redundant — the "New here? Sign up free →" link is lighter and consistent |
| Apr 2026 | Auth and landing primary buttons: `border-radius: 12px` (not pill) | The stronger squared CTA treatment now applies to auth surfaces and the home-page acquisition CTAs for consistency and clearer contrast |
| Apr 2026 | Home-page explanatory sections: editorial split layouts for `What helloRun does` and `Why helloRun` | Reduced the generic template-card feel and gave the landing page a sharper product narrative without adding heavy motion or extra assets |
| Apr 2026 | Audience section: keep two cards, but compact them and move identity into the heading | Preserved runner/organizer scanning while avoiding the more generic label-strip and oversized-card treatment |
| Apr 2026 | Blog header CTA: dedicated `Visit Blog` action instead of shared outline button | The blog surface needs a lighter editorial action that reads as section navigation, not as a second acquisition CTA |
| Mar 2026 | Standardised list-page clear action label to `Clear filters` | Consistency across Events, Blog, and Leaderboard list pages |
| Mar 2026 | Relative timestamps on runner dashboard | More human-readable for activity feeds (`2h ago` vs `March 8, 2026 14:23`) |
| Mar 2026 | Locale-aware timestamps via `Intl.DateTimeFormat` | Removed hardcoded `en-US` locale — respects user's browser language |

---

## 21. Pending UI/UX Work

### Auth pages
- [ ] Confirm final mobile stacking order and panel visibility on both pages
- [ ] True-device browser matrix pass (iOS Safari, Android Chrome)

### Runner dashboard
- [ ] Replace browser `confirm()` with inline modal for Google unlink confirmation
- [ ] Compact card-density pass for mobile result/activity rows
- [ ] Relative-time labels on non-dashboard list surfaces for consistency

### Events
- [ ] Continue polishing `/events/:slug` visual rhythm and CTA conversion flow
- [ ] Mobile typography/tap-target pass across event and registration pages

### Search
- [ ] Quick filter chips for Events, Blog, Leaderboard
- [ ] Retained "recent search" suggestions
- [ ] Filter state badges in hero/header blocks

### Blog
- [ ] Comments and likes system (Phase B)
- [ ] Final UX polish pass: spacing/typography consistency, empty states, badges

### Waiver editor
- [ ] Replace confirm/alert dialogs with inline modal/toast pattern

### Legal pages
- [ ] Remove encoding artifacts from imported Privacy/Terms markdown before first live publish
- [ ] Replace placeholder legal entity fields

### General
- [ ] CSP rollout after inline-script refactor
- [ ] Full CSRF token rollout for remaining state-changing form routes
