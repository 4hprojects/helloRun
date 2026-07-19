# HelloRun Cookie Policy

## 1. Purpose and scope

This Cookie Policy explains how Henson M. Sagorsor, operating as 4HProjects, uses cookies and similar browser technologies for HelloRun.

It covers the HelloRun website, authenticated dashboards, event workflows, community pages, and browser storage created by HelloRun. It should be read with the [Privacy Policy](/privacy), [Data Usage Policy](/data-usage-policy), and [Terms and Conditions](/terms).

The preference center controls optional technology requested by HelloRun. It does not control cookies already placed by another website or provider.

## 2. Cookies and similar technologies

A cookie is a small value a website or service asks a browser to retain and send with later requests. HelloRun also uses local storage and session storage.

- Local storage can remain after the browser closes until it expires or is removed.
- Session storage normally remains only for the current browser tab or session.
- Server-side sessions retain protected state while the browser holds a session identifier.
- Provider tags may use cookies, pixels, identifiers, or similar technology under the provider's policies.

The inventory shown above this complete policy describes the current implementation. Names and durations controlled by third parties may change.

## 3. Your choice comes first

HelloRun separates browser technology into Essential, Functional, Analytics, and Advertising categories.

Functional, Analytics, and Advertising are off unless you allow them through the preference center. You can change those choices at any time using the Cookie preferences link in the footer.

Your choices apply to the current browser for up to twelve months. A different browser, browser profile, or device requires its own choice.

Publishing an ordinary policy wording update does not automatically reset your choices. HelloRun may ask again when the categories, purposes, or preference mechanism materially change.

## 4. Essential storage

Essential storage supports security and workflows that cannot operate reliably without request state.

### 4.1 HelloRun session

HelloRun uses the `hr.sid` cookie for server-side session state, including authentication, CSRF protection, secure forms, and short-lived workflow messages.

The cookie is configured as `HttpOnly` and `SameSite=Lax`. It is sent only over secure connections in production and may remain for up to seven days. The cookie contains a session identifier, not the complete session record.

Clearing or blocking it can sign you out and prevent protected forms, registration, payment review, activity submission, dashboards, or account settings from working.

### 4.2 Preference record

The `hr.cookie_preferences` cookie remembers whether this browser allowed Functional, Analytics, or Advertising technology. It contains the category choices, preference-schema version, and save time.

It is `HttpOnly`, `SameSite=Lax`, secure in production, and retained for up to twelve months. It is essential because optional scripts must know whether they are permitted before loading.

Clearing it returns all optional categories to off and shows the choice prompt again.

## 5. Functional storage

Functional storage is optional and remains on the browser. When allowed, HelloRun may save:

- registration form drafts for up to seven days;
- run-proof form values for up to seven days, excluding uploaded proof files;
- organizer event and policy workspace drafts for up to seven days;
- saved operational filters, selected columns, collapsed panels, and similar display preferences until removed; and
- short-lived queue or scroll position in session storage.

Browser drafts can contain values entered into eligible form fields. HelloRun excludes password fields, CSRF tokens, and file uploads from its draft helpers. Users should still avoid entering unnecessary sensitive information.

Turning Functional storage off removes known HelloRun-owned local and session-storage keys from that browser. Core forms remain usable, but unfinished values and persistent interface choices will not be restored.

## 6. Analytics

When Analytics is allowed and a measurement ID is configured, HelloRun loads Google Analytics to understand aggregate visits, page use, device or browser trends, and workflow reliability.

HelloRun uses Google Consent Mode defaults that deny Analytics storage before the visitor's choice. Under the selected basic implementation, the Analytics tag is not loaded while Analytics is declined.

Google Analytics may use identifiers such as `_ga` and related values. Google controls its provider processing and may change cookie details. HelloRun does not intentionally send payment proof, run proof, passwords, contact details, or precise activity evidence as Analytics event data.

Turning Analytics off prevents future Analytics tag loading. HelloRun also attempts to remove Analytics cookies accessible on its own domain. Provider-controlled or previously synchronized data remains governed by Google's controls and retention practices.

## 7. Advertising and Google AdSense

Some public content pages may contain configured Google AdSense placements. Advertising is not loaded while the Advertising category is declined.

When allowed, Google and participating advertising providers may use first-party or third-party cookies, IP addresses, browser or device identifiers, web beacons, ad-request data, and similar technology to:

- deliver and measure advertisements;
- limit repetitive advertising;
- prevent invalid traffic and abuse;
- apply the visitor's advertising settings; and
- meet provider and legal requirements.

HelloRun does not intentionally provide passwords, payment proof, activity proof, private contact details, or precise activity evidence to advertising providers as identifiable advertising data.

Google may use data from partner sites according to [How Google uses information from sites or apps that use its services](https://policies.google.com/technologies/partner-sites). Visitors can use [Google Ads Settings](https://adssettings.google.com) where available.

HelloRun's preference center is not a Google-certified consent management platform. Serving Google advertising to visitors in regions where Google requires a certified platform remains subject to a separately configured certified consent solution and Google's requirements.

## 8. Security and explicitly requested providers

Some features contact another provider only when the feature is configured or requested.

- Cloudflare Turnstile may support login or signup abuse prevention.
- Google may process authorization state when a user chooses Google sign-in or account linking.
- Strava may process authorization and activity requests when a runner connects or uses the integration.
- Font, icon, or editor resources may be requested from configured content-delivery providers.

Those providers may receive ordinary request information such as IP address, browser details, requested resource, and timestamp. They may use their own cookies or storage under their notices. Disconnecting an integration does not automatically clear storage on the provider's own domain.

## 9. Signup policy agreement is separate

Agreeing to the Cookie Policy during account creation records the policy version presented during signup. It does not enable optional browser storage.

Changing browser preferences does not rewrite historical policy-consent records, and signing into an account does not copy preferences between devices.

## 10. Managing and clearing storage

Visitors can:

- use HelloRun's Cookie preferences control;
- clear site cookies and browser storage through browser settings;
- use private-browsing or browser-profile controls;
- disconnect supported integrations;
- manage Google advertising preferences; and
- contact HelloRun for privacy guidance.

Clearing all HelloRun site data removes the preference record, session, and local drafts. It may sign the user out and discard unsaved work.

Third-party cookies may not be removable by HelloRun. Use the browser or provider's controls for those values.

## 11. Privacy rights and contact

The Privacy Policy remains authoritative for lawful processing criteria, retention, international processing, advertising disclosures, security, and complete data-subject rights.

For a privacy or cookie question, use [Contact](/contact) or email `4hprojects@proton.me`. Do not email activity proof, payment proof, identity documents, credentials, or other sensitive records unless an authorized reviewer specifically requests them through an appropriate channel.

## 12. Policy changes

HelloRun may revise this policy when browser storage, provider configuration, legal requirements, or platform features change.

Material updates may be announced through a non-blocking in-app notification. A new policy version does not require existing users to re-accept unless HelloRun introduces a separate lawful and clearly communicated requirement.
