# Runner Profile Location and Timezone Reminder

**Status:** Initial profile and dashboard slice implemented

**Audience:** Product, design, and engineering

**Related policy:** `../architecture/time-and-timezone-policy.md`

## Implementation progress

Implemented in the first slice:

- Persisted timezone, confirmation timestamp, and selection source on runner profiles.
- Editable IANA timezone selector in the profile contact/location section.
- Browser recommendation, conservative Philippines country suggestion, privacy copy, and explicit confirmation.
- Timezone in profile completeness and dashboard reminders linked to `/runner/profile#contact`.

Registration review reminders, submission evidence comparison, mismatch dismissal state, and paired deadline displays remain to be implemented.

## Goal

Help runners maintain an accurate country and timezone so HelloRun can show event deadlines in their local time and interpret international activity evidence correctly.

The reminder is guidance, not a location-tracking feature. The runner stays in control of the saved value, and an explicit choice is never silently overwritten.

## User experience principles

- Explain the benefit before asking for information.
- Prefer an explicit IANA timezone over inference from country.
- Use browser detection only to recommend a value.
- Ask at moments when accuracy matters, without blocking ordinary browsing.
- Avoid repeated prompts after the runner confirms a valid timezone.
- Always keep the authoritative Manila deadline visible for time-sensitive actions.

## Profile fields and precedence

The feature uses the existing ISO `country` profile field and adds:

| Field | Allowed value | Behavior |
|---|---|---|
| `timezone` | Valid IANA identifier or null | Primary runner display timezone |
| `timezoneConfirmedAt` | Exact timestamp or null | Records explicit confirmation |
| `timezoneSource` | `user`, `browser`, `country_suggestion`, or null | Explains how the saved value was chosen |

Precedence is:

1. A valid, explicitly confirmed profile timezone.
2. A valid saved but unconfirmed timezone, presented for confirmation.
3. Browser-detected timezone, presented as a suggestion.
4. An unambiguous country-based suggestion.
5. `Asia/Manila` as a clearly labeled fallback, never described as the runner's local time.

Country must not automatically select a timezone when more than one reasonable timezone exists. Browser detection must not update the database until the runner confirms or saves it.

## Profile experience

Add a Timezone field to the contact/location section at `/runner/profile#contact`.

The selector should:

- List supported IANA timezones with readable city/region labels and current offsets.
- Support type-ahead search.
- Show the currently detected browser timezone as a recommendation when it differs from the saved value.
- Explain that offsets can change seasonally and the named timezone is therefore saved instead of a fixed `UTC+/-` offset.
- Save confirmation time and `timezoneSource` with the selected value.

Suggested helper copy:

> Your timezone helps HelloRun show event deadlines in your local time and interpret international activity submissions. Official event deadlines remain based on Asia/Manila time.

Suggested privacy copy:

> HelloRun uses your saved country and timezone, plus an optional browser timezone suggestion, to format dates and times. This does not collect or track your precise location. You can change your timezone at any time.

## Reminder surfaces

### Runner dashboard

Include Country and Timezone in the existing profile-completeness notice. When either is missing, link the action to `/runner/profile#contact`.

Suggested copy:

> Update your location and timezone so event schedules appear correctly wherever you run.

This reminder is non-blocking.

### Profile contact/location section

Show an inline recommendation when the saved timezone is missing, invalid, unconfirmed, or materially different from browser detection.

Actions:

- **Use suggested timezone** — saves and confirms the recommendation.
- **Choose another timezone** — opens/focuses the selector.
- **Not now** — dismisses the current reminder without changing profile data.

### Event registration review

Before final registration confirmation, show the saved timezone and local equivalent of critical event times.

- If the timezone is valid and confirmed, provide an unobtrusive **Change in profile** link.
- If it is missing, invalid, or unconfirmed, show an inline reminder with **Confirm**, **Choose another**, and **Not now** actions.
- A timezone mismatch does not block registration, but every official deadline remains labeled in Manila time.

### Activity submission

Before submitting time-sensitive activity evidence:

- Display the profile timezone and any source timezone supplied by Strava or other evidence.
- Ask for confirmation when no reliable activity timezone exists.
- Warn when profile, browser, and evidence timezones conflict; do not silently rewrite any of them.
- Allow submission to proceed to manual review when evidence is inherently date-only or the exact instant cannot be established.

Suggested warning:

> This activity appears to use a different timezone from your profile. Review the activity time and location before submitting. Your original evidence will not be changed.

## Reminder state and suppression

A normal reminder is suppressed after a runner confirms a valid timezone. It may appear again only when:

- The saved identifier is no longer valid or supported.
- Browser detection differs from the confirmed timezone and the runner has not dismissed that specific mismatch.
- A time-sensitive submission lacks sufficient activity timezone information.
- The runner deliberately clears or changes their country/timezone data.

Dismissal should be scoped to the condition, not permanent. Store a condition fingerprint or equivalent state so the same mismatch is not shown on every page load. A new browser timezone or invalidated saved value creates a new condition.

Do not treat ordinary travel as proof that the profile is wrong. A browser mismatch is a suggestion, not an automatic profile update.

## Validation and failure behavior

- Validate submitted timezone identifiers on the server against the runtime's supported IANA timezone set.
- Reject fixed-offset strings, abbreviations, and unknown identifiers as profile timezone values.
- If browser timezone detection is unavailable, retain the saved value or show the Manila fallback.
- If the saved timezone becomes invalid, preserve it for audit/debug context if needed but do not use it for formatting.
- Country and timezone can disagree because a runner may live abroad or travel; do not reject that combination.
- Changing the profile timezone affects future formatting only. It does not modify event timestamps, submission evidence, or prior audit records.

## Accessibility and content requirements

- Reminders must have a heading or accessible label that identifies the timezone issue.
- Do not rely on color alone for missing, warning, or confirmed state.
- Buttons must be keyboard accessible and have unambiguous text.
- Move focus to the timezone selector after **Choose another timezone**.
- Announce successful confirmation and validation errors through the page's accessible status pattern.
- Render timezone names as text; flags must not be used as timezone controls.
- Every critical time must include a textual timezone label.

## Privacy requirements

- Do not request GPS coordinates or precise browser geolocation for timezone selection.
- Browser detection is limited to the browser-reported IANA timezone.
- Explain why country and timezone are used and allow the runner to edit both.
- Do not expose a runner's timezone on their public profile unless a separate, explicit product decision authorizes it.
- Follow existing audit and retention practices for `timezoneConfirmedAt`; do not create a history of browser locations.

## Implementation sequence

1. Add server-side timezone validation and the profile fields.
2. Add timezone to contact/location profile read and update flows.
3. Add browser suggestion and explicit confirmation behavior.
4. Extend profile completeness and the dashboard reminder.
5. Add registration review messaging and paired deadline display.
6. Add submission timezone comparison and ambiguity handling.
7. Add reminder suppression, telemetry, and accessibility verification.

This sequence depends on the centralized timezone utilities defined in the architecture policy. Feature code must not introduce its own parsing or timezone mapping logic.

## Acceptance criteria

- A runner can search, select, save, and later change a valid IANA timezone.
- A confirmed timezone is never silently overwritten by country or browser detection.
- A single-zone country can provide a suggestion; a multi-zone country requires user choice.
- Missing Country or Timezone appears in the existing profile-completeness experience.
- Confirmation suppresses routine reminders, while a new meaningful mismatch can be dismissed independently.
- Registration and submission reminders link clearly to `/runner/profile#contact`.
- Critical runner deadlines show both runner-local and Manila time unless both zones are Manila.
- Browser detection failure leaves the experience functional with an explicitly labeled Manila fallback.
- Profile timezone changes do not alter stored event instants or historical activity evidence.
- The experience works by keyboard, announces validation results, and never relies only on color.
- No precise geolocation is requested or stored.

## Test scenarios

- New runner with no country or timezone.
- Existing Philippine runner receiving and confirming `Asia/Manila`.
- Runner in a single-zone country receiving a country suggestion.
- Runner in a multi-zone country choosing among valid IANA zones.
- Confirmed profile and matching browser timezone.
- Confirmed profile and mismatching browser timezone, including dismissal and suppression.
- Invalid or retired saved timezone identifier.
- Browser timezone detection unavailable.
- Traveler whose activity source timezone differs from both profile and browser.
- Strava evidence with UTC start, local start, and source timezone.
- Manual evidence containing only a calendar date near an event boundary.
- Screen-reader and keyboard operation of the reminder and timezone selector.
