# 04 - Install HelloRun Experience

## Goal

Give users an obvious but non-intrusive way to install HelloRun.

The install interface must respond to browser capabilities.

Do not display a button that cannot perform a meaningful action.

## Install states

Implement a reusable install-state layer with states similar to:

```ts
type InstallState =
  | "unknown"
  | "installable"
  | "installed"
  | "ios-manual"
  | "unsupported"
```

The exact implementation may differ.

## Chromium in-app install flow

The `beforeinstallprompt` event is non-standard and supported primarily in Chromium-based browsers.

Reference:

https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt

Concept:

```ts
let deferredPrompt = null

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault()
  deferredPrompt = event
  setInstallAvailable(true)
})
```

When the user clicks the install control:

```ts
if (!deferredPrompt) return

const result = await deferredPrompt.prompt()

deferredPrompt = null

// update UI according to application conventions
```

Use the actual event result API supported by the target browser/tooling.

Do not repeatedly prompt automatically.

The user must initiate the in-app prompt.

## Installed event

Listen for:

```js
window.addEventListener("appinstalled", ...)
```

Update application state and hide install CTAs.

## Standalone detection

Where appropriate:

```js
window.matchMedia("(display-mode: standalone)").matches
```

For iOS legacy standalone detection, only use a feature check if necessary and do not depend exclusively on it.

## UI locations

The install action may appear in:

### Guest desktop

```text
header utility area
```

### Authenticated desktop

```text
profile menu or header utility area
```

### Mobile

```text
navigation drawer
profile/account menu
optional contextual install card
```

Do not place multiple competing install buttons on one screen.

## Recommended label

Use one consistent label:

```text
Install HelloRun
```

Avoid mixing:

```text
Get App
Download App
Add App
Install PWA
```

unless platform-specific instructions require it.

"Install PWA" is technical wording and should not be user-facing.

## Button visibility rules

### Show install CTA when

- browser reports installability through supported mechanisms
- app is not already installed

### Show iOS install guidance when

- user is on a relevant iOS/iPadOS browser context
- app is not already running in standalone mode
- Add to Home Screen is a practical option

### Hide install CTA when

- already installed/standalone
- browser cannot perform or explain an install path
- environment is an embedded webview where install is unavailable
- repository-specific browser detection indicates a misleading flow

Capability detection is preferred over broad user-agent assumptions.

## iPhone/iPad experience

Do not call `beforeinstallprompt` on iOS because the technique is not supported there.

Provide manual instructions.

Suggested UI:

```text
Install HelloRun

Add HelloRun to your Home Screen for faster access.

1. Open the browser's Share menu.
2. Choose "Add to Home Screen".
3. Confirm by tapping "Add".
```

Browser wording can change.

Keep instructions generic enough to remain valid.

If current Safari behavior differs, update the copy during implementation testing.

## iOS install UI format

Use a small modal, bottom sheet, or help panel.

Do not permanently occupy navigation space with full instructions.

Example flow:

```text
Install HelloRun
       ↓
Open guidance sheet
       ↓
User follows browser controls
```

## Post-install behavior

After installation:

- hide install action
- retain all normal authenticated behavior
- do not force a different account
- do not force onboarding unless product already has onboarding
- allow normal deep links inside app scope
- preserve sign-in state according to existing authentication behavior

## Analytics

If HelloRun already has privacy-compliant analytics, optionally track:

```text
install CTA displayed
install CTA clicked
browser prompt accepted
browser prompt dismissed
manual iOS guidance opened
appinstalled event
```

Do not add a new analytics provider solely for this feature.

Do not capture sensitive user data.

## Install component architecture

Possible structure:

```text
pwa/
  install-state
  InstallHelloRunButton
  InstallHelloRunMenuItem
  IOSInstallInstructions
```

or equivalent inside the existing component structure.

Avoid duplicating event listeners in several components.

Prefer one provider/hook/service that manages the deferred prompt.

Example conceptual API:

```ts
const {
  installState,
  canInstall,
  isInstalled,
  requestInstall,
  showIOSInstructions
} = usePWAInstall()
```

Adapt to current framework.

## Lifecycle cleanup

If framework components add global listeners:

- register once
- remove listeners correctly
- avoid duplicate prompts during hot reload/navigation
- keep deferred prompt in an appropriate client-side lifecycle

## No automatic popups

Do not open an install modal immediately on first page load.

Do not block event browsing behind an installation request.

Installation is optional.

## Install acceptance criteria

- Chromium install CTA appears only when installable
- clicking CTA opens native browser install flow
- dismissal does not break navigation
- appinstalled hides install CTA
- installed standalone state hides install CTA
- iOS users receive manual instructions instead of a broken native prompt
- unsupported browsers are not shown misleading controls
- install functionality survives normal client-side navigation
- no duplicate global listeners occur
