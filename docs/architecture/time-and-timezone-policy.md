# HelloRun Time and Timezone Policy

**Status:** Adopted; Phase 1 implementation in progress

**Business timezone:** `Asia/Manila`

**Storage and interchange standard:** UTC

**Related specification:** `../features/profile-location-timezone-reminder.md`

## Implementation progress

The initial foundation is implemented:

- Central `Asia/Manila` business-timezone constant, IANA validation, supported-zone listing, country suggestion, and explicit-zone formatting.
- Runner timezone profile fields and profile-completeness integration.
- DB-free unit coverage for timezone validation, formatting, and completeness.

Event form parsing, critical-time display conversion, activity eligibility, and existing-data verification remain future phases.

## Purpose

This document is the source of truth for how HelloRun stores, interprets, compares, and displays dates and times. It is intended to make event deadlines deterministic while giving international runners accurate local-time guidance.

The governing principle is:

> Store exact instants in UTC, define business schedules in `Asia/Manila`, and display those instants in the user's confirmed timezone with an explicit Manila reference when the time affects eligibility.

`Asia/Manila` is the required identifier. Do not use abbreviations such as `PST`, `MST`, or `Philippine time`; abbreviations are ambiguous and are not valid storage values.

## Temporal value categories

Every date or time field must belong to one of these categories before it is implemented.

| Category | Examples | Storage | Interpretation |
|---|---|---|---|
| Exact instant | Submission received, review completed, registration deadline | MongoDB `Date` or PostgreSQL `TIMESTAMPTZ` | UTC instant |
| Manila business schedule | Event window, registration window, final submission deadline | UTC instant plus documented Manila input context | Organizer input is interpreted in `Asia/Manila` |
| Activity occurrence | Strava start, manually reported run time | UTC instant plus source timezone/local representation | Activity source or confirmed activity location |
| Date only | Birthday, a runner-reported calendar date when no time exists | `YYYY-MM-DD` semantics | No timezone conversion |
| Duration | Elapsed run time, cutoff duration | Integer milliseconds/seconds | Never a wall-clock timestamp |

Date-only values must not be represented as midnight UTC merely for convenience. Converting midnight across zones can change the visible calendar day.

## Sources of truth and precedence

### Exact timestamps

- UTC is the technical source of truth for persistence, comparison, sorting, APIs, queues, and logs.
- MongoDB `Date` and PostgreSQL `TIMESTAMPTZ` may continue to be used because both represent instants. PostgreSQL sessions and queries must not depend on an implicit session timezone.
- APIs and form-to-service boundaries must use ISO 8601 values containing `Z` or an explicit numeric offset, for example `2026-09-01T00:00:00Z` or `2026-09-01T08:00:00+08:00`.
- Ambiguous values such as `2026-09-01T08:00` must not cross a service or API boundary without an accompanying IANA timezone.

### Event schedules and deadlines

- `Asia/Manila` is the authoritative business-rule timezone for registration windows, event windows, virtual windows, check-in windows, and submission deadlines.
- Organizer `datetime-local` input is a Manila wall-clock value, regardless of the organizer's browser or server timezone.
- The server must parse that wall-clock value in `Asia/Manila`, convert it once to a UTC instant, and persist the instant.
- Eligibility checks compare `now` or an activity instant with the stored UTC boundaries. They must not compare formatted strings or server-local calendar fields.
- Changing a user's timezone changes presentation only. It must never move an event boundary.

### Runner profile timezone

- `User.timezone` is the primary timezone for runner-facing presentation.
- It must contain a valid IANA identifier, such as `Asia/Manila`, `America/New_York`, or `Pacific/Auckland`.
- Country may suggest a timezone but is not authoritative. Countries can span multiple zones, and a runner can live or run outside their profile country.
- Browser detection may suggest a timezone. It must never silently replace a confirmed profile value.
- When the profile timezone is absent or invalid, use `Asia/Manila` for display and show a prompt or warning rather than pretending it is the runner's local time.

### Activity timezone

Activity evidence is immutable historical evidence and has separate timezone semantics from the current user profile.

Preserve, when available:

- The authoritative UTC activity start instant.
- The source IANA timezone or source-provided timezone text.
- The source-local wall-clock representation.
- The source and import metadata, such as Strava or manual submission.

The activity instant determines whether the activity falls inside an event window. The activity-local representation explains when and where the runner performed it. A later profile change must not rewrite imported evidence.

For manual evidence without a reliable instant, require the runner to confirm the activity date/time and timezone. If only a calendar date is available, retain it as date-only evidence and route ambiguous boundary cases to review rather than manufacturing a precise timestamp.

## Display policy

### Runner-facing critical times

For registration close, event start/end, virtual activity windows, and final submission deadlines:

1. Show the time in the runner's confirmed profile timezone.
2. Show the authoritative Manila equivalent nearby.
3. Label both with timezone identifiers or clear city labels.

Example:

```text
Your time: Sep 30, 2026, 8:00 PM (America/New_York)
Official deadline: Oct 1, 2026, 8:00 AM (Asia/Manila)
```

If the runner's timezone is `Asia/Manila`, display one labeled value instead of duplicating it.

### Organizer and administrator screens

- Operational event schedules default to `Asia/Manila` and must display that label.
- Audit timestamps may optionally show the viewer's local equivalent, but the Manila or UTC audit value must remain available.
- Machine-oriented exports use ISO 8601 UTC. Human-readable exports must include a timezone in the column name or value.

### Non-critical relative times

Relative text such as "5 minutes ago" is acceptable for convenience, but the underlying exact time should be accessible where auditability matters.

## Shared implementation contract

Introduce one centralized time module before converting individual screens. Its public responsibilities should include:

- `BUSINESS_TIME_ZONE = 'Asia/Manila'` and the default locale `en-PH`.
- Validate and normalize supported IANA timezone identifiers.
- Parse a Manila wall-clock form value into a UTC instant.
- Parse an ISO 8601 instant only when it has an offset or `Z`.
- Format an instant in an explicitly supplied timezone.
- Produce the paired runner-local/Manila critical-time display model.
- Compare instants and event windows without relying on process-local timezone settings.
- Handle date-only strings without passing them through timestamp conversion.

Application code must not use bare `new Date(ambiguousString)`, unzoned `toLocaleString()`, or `toISOString().slice(...)` to interpret business input. Direct `Date.now()` or `new Date()` remains valid for obtaining the current instant.

Use a timezone-capable implementation based on a maintained library or the JavaScript runtime's standards-supported temporal APIs. Do not implement timezone offset tables manually.

## Recommended data model

Add these runner profile fields in a later implementation:

| Field | Type | Purpose |
|---|---|---|
| `timezone` | String, nullable | Validated IANA timezone used for presentation |
| `timezoneConfirmedAt` | Date, nullable | When the runner explicitly confirmed the value |
| `timezoneSource` | Enum, nullable | `user`, `browser`, or `country_suggestion` |

The existing `country` ISO code remains profile/location context. It does not replace `timezone`.

Existing event timestamp fields remain exact instants. A new event-timezone field is not required while all event business schedules are governed by `Asia/Manila`; the policy context should be represented centrally instead of copied onto every event.

Submission activity metadata must retain its source timezone independently from the user's profile timezone. Existing Strava fields for UTC start, local start, and source timezone should be preserved during migration.

## Migration plan

### Phase 1: Inventory and safeguards

- Inventory every timestamp input, parser, formatter, comparison, email, export, worker, and database boundary.
- Add the business-timezone constant and centralized utilities.
- Add unit tests that run with multiple process `TZ` values before changing behavior.
- Prevent new ambiguous parsing through review guidance or a focused static test.

### Phase 2: Event input and enforcement

- Convert organizer schedule forms and handlers to explicit Manila parsing.
- Convert registration, event, check-in, virtual-run, and submission-deadline checks to UTC instant comparisons.
- Label all organizer/admin business schedule displays as Manila time.

### Phase 3: Runner profile and presentation

- Add the timezone profile fields and reminder behavior defined in the related feature specification.
- Convert critical runner pages and communications to paired local/Manila output.
- Keep Manila-only fallback output explicitly labeled until a timezone is confirmed.

### Phase 4: Activity evidence

- Preserve or collect activity timezone and local occurrence data for every submission source.
- Use exact activity instants for eligibility where available.
- Send imprecise boundary cases to review instead of guessing.

### Phase 5: Existing-data verification and cleanup

- Compare existing MongoDB timestamps with PostgreSQL shadow timestamps by ISO UTC value.
- Sample historical event schedules with organizers before changing any stored instant. Existing values may have been parsed under an unknown server timezone.
- Migrate only records whose intended wall-clock interpretation is known; flag uncertain records for manual confirmation.
- Replace remaining unzoned display calls after the critical flows are stable.

## Compatibility, monitoring, and rollback

- Do not bulk-shift existing timestamps based solely on an assumed timezone.
- During rollout, log input wall time, declared timezone, resulting UTC instant, and request correlation identifier for schedule changes. Do not log sensitive location details unnecessarily.
- Monitor validation failures, missing timezone rates, browser/profile mismatches, deadline disputes, and submission boundary reviews.
- Release parsing changes behind a configuration flag if practical. Rollback should restore the previous parser without reversing already verified UTC instants.
- Preserve original timestamp values and migration audit records for every corrective data migration.

## Acceptance criteria

- The same deadline is enforced when the Node process runs under `UTC`, `Asia/Manila`, or `America/New_York`.
- Organizer `2026-10-01T08:00` consistently becomes `2026-10-01T00:00:00Z` under the Manila business rule.
- Runners ahead of and behind Manila see correct, explicitly labeled equivalents.
- Daylight-saving transitions in runner zones do not alter Manila event boundaries.
- Activities around midnight and the International Date Line are evaluated by their exact instant when one exists.
- Manual, OCR, and Strava paths apply the same event-window rule.
- Profile changes never rewrite activity evidence or event boundaries.
- MongoDB and PostgreSQL shadow values retain identical instants through migration.
- No critical deadline is displayed without a timezone label.
