# 00 - Mandatory Repository Audit

## Objective

Before changing code, determine how HelloRun is currently built.

Do not assume the framework, router, CSS system, authentication provider, API pattern, or PWA setup.

The output of this phase should be a short repository audit added to the implementation PR or development notes.

## 1. Identify the application stack

Determine and record:

- frontend framework
- rendering model
- package manager
- build tool
- router
- CSS strategy
- component library
- icon library
- state management
- authentication implementation
- user/role model
- API client pattern
- image optimization approach
- deployment target
- existing testing tools
- linting and formatting tools

Examples of files that may help:

```text
package.json
package-lock.json
pnpm-lock.yaml
yarn.lock
vite.config.*
next.config.*
astro.config.*
nuxt.config.*
src/
app/
pages/
routes/
public/
styles/
components/
```

Use what exists. Do not manufacture framework files.

## 2. Inventory all routes

Build a route inventory.

At minimum classify routes into:

### Public

Examples:

```text
/
events
event detail
about
how it works
blog
faq/help
contact
privacy
terms
community guidelines
refund policy
```

### Authentication

Examples:

```text
sign in
sign up
forgot password
reset password
verification
```

### Runner

Examples:

```text
runner dashboard
my events / my runs
registrations
activities
submission detail
results
leaderboards
certificates
profile
settings
```

### Organizer

Examples:

```text
organizer dashboard
organizer events
create event
edit event
participants
registrations
payments
activity submissions
reviews
results
certificates
event settings
```

### Administrator

If present:

```text
admin dashboard
users
events
moderation
content
system settings
```

Do not rename routes during this audit.

## 3. Find all current navigation implementations

Search for:

```text
nav
navbar
header
sidebar
drawer
menu
mobile menu
bottom navigation
breadcrumbs
footer
profile menu
account menu
```

Document:

- components involved
- duplicated link definitions
- current responsive behavior
- role-specific conditions
- current active-route styling
- current mobile behavior
- places where pages implement their own local header

The goal is to determine what can be consolidated.

## 4. Find responsive styling problems

Search for likely risk patterns:

```text
fixed pixel widths
min-width values
large absolute positioning
overflow-x
white-space: nowrap
fixed multi-column grids
hard-coded modal dimensions
large tables
inline styles
viewport-height layouts
100vh
```

Inspect important pages manually at:

```text
320
360
375
390
412
480
768
1024
1280
1440
1920
```

Record:

- horizontal overflow
- clipped content
- overlapping elements
- tiny controls
- inaccessible menus
- off-screen dialogs
- table problems
- long text breaking layouts
- form fields displayed too narrowly
- filter controls consuming excessive screen space
- footer issues
- sticky components covering content

## 5. Audit existing PWA setup

Search for:

```text
manifest.json
manifest.webmanifest
site.webmanifest
service-worker
serviceWorker
sw.js
workbox
vite-plugin-pwa
next-pwa
@serwist
serwist
registerSW
navigator.serviceWorker
beforeinstallprompt
appinstalled
apple-touch-icon
theme-color
display-mode
```

Determine whether the site already has:

- a manifest
- manifest link metadata
- 192x192 icon
- 512x512 icon
- maskable icon
- Apple touch icon
- service worker
- offline page
- install prompt code
- installed-state detection
- framework-specific PWA plugin
- cache versioning
- update mechanism

### Important

If PWA infrastructure already exists, extend it.

Do not create a second manifest or second service worker.

## 6. Audit authentication and roles

Identify:

```text
guest
runner
organizer
admin
mixed runner + organizer
```

Determine:

- where role data is loaded
- whether a user can have multiple roles
- how protected routes work
- whether navigation currently hides unauthorized links
- whether route access is enforced independently of navigation

Navigation hiding is not authorization.

Do not weaken route guards.

## 7. Audit page-shell architecture

Determine whether the repository already has:

```text
AppLayout
RootLayout
MainLayout
DashboardLayout
AuthenticatedLayout
PublicLayout
OrganizerLayout
```

Prefer extending existing layout boundaries over introducing nested wrappers everywhere.

## 8. Audit design tokens

Find existing definitions for:

```text
brand colors
font families
font sizes
spacing
border radius
shadows
breakpoints
container widths
button variants
form states
focus styles
z-index
```

Do not create competing tokens unless necessary.

## 9. Audit performance-sensitive areas

Identify:

- large event images
- heavy dashboard bundles
- large client-side table dependencies
- duplicate icon libraries
- large modal dependencies
- excessive client-side navigation code
- components rendering differently only because of JavaScript viewport checks

Prefer CSS media/container queries for visual layout.

Use JavaScript only when behavior truly needs runtime viewport or platform state.

## 10. Required audit output

Before implementation, write a concise internal note containing:

```markdown
## Repository audit

Framework:
Router:
Styling:
Component library:
Authentication:
Role model:
Deployment:
Current navigation components:
Existing PWA support:
Primary responsive risks:
Files likely to change:
Files that must not be duplicated:
```

Then proceed with the remaining documents.
