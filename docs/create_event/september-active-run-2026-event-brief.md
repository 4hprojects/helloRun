# September Active Run 2026 Event Brief

Status: **Operational work pending**  
Reconciled: August 29, 2026  
Intended route: `/organizer/create-event`

This document is the publish-ready reference for encoding **September Active Run** in HelloRun. It defines the event's public copy, canonical schedule, category mapping, participation rules, recognition settings, media direction, and organizer checklist. It does not create or publish the event.

## Event Setup Summary

| Field | Canonical value |
|---|---|
| Event title | September Active Run |
| Slug | `september-active-run-2026` |
| Organizer | HelloRun |
| Tagline | Choose your goal. Build your month. Finish strong. |
| Event type | Virtual |
| Event format | Accumulated distance challenge |
| Location | Virtual — run anywhere |
| Country | Philippines (`PH`) |
| Event timezone | Asia/Manila (UTC+08:00) |
| Registration fee | Free |
| Registration opens | August 30, 2026 at 12:00 AM Asia/Manila |
| Registration closes | September 22, 2026 at 11:59 PM Asia/Manila |
| Activity window opens | September 1, 2026 at 12:00 AM Asia/Manila |
| Activity window closes | September 30, 2026 at 11:59 PM Asia/Manila |
| Final proof deadline | October 14, 2026 at 11:59 PM Asia/Manila |
| Organizer review period | October 15–17, 2026, Asia/Manila |
| Recognition release | October 18, 2026, Asia/Manila |
| Accepted activities | Run, jog, walk, trail run, and hike |
| Proof methods | Verified running-app synchronization and screenshot upload |
| Minimum activity distance | 1 km per submitted activity |
| Completion basis | Approved, eligible, non-duplicate distance in the selected category |
| Recognition | Category finisher badge, certificate, finisher standings, and highest verified distance ranking |

## Canonical Date Values

Use the following offset-bearing values wherever the event is created programmatically. All public copy must display the equivalent Asia/Manila dates and times.

| Purpose | Canonical value |
|---|---|
| Public listing available | `2026-08-29T00:00:00+08:00` |
| Registration opens | `2026-08-30T00:00:00+08:00` |
| Registration closes | `2026-09-22T23:59:00+08:00` |
| Event starts | `2026-09-01T00:00:00+08:00` |
| Event ends | `2026-09-30T23:59:00+08:00` |
| Virtual window starts | `2026-09-01T00:00:00+08:00` |
| Virtual window ends | `2026-09-30T23:59:00+08:00` |
| Final submission deadline | `2026-10-14T23:59:00+08:00` |
| Review period begins | `2026-10-15T00:00:00+08:00` |
| Review period ends | `2026-10-17T23:59:00+08:00` |
| Recognition release begins | `2026-10-18T00:00:00+08:00` |

The review period and recognition release are operational commitments rather than current first-class `Event` date fields. Include them in the event details and organizer closeout checklist.

## Registration Categories

Each participant selects exactly one category. There is no participant cap and no category slot limit.

| Category ID | Public category name | Distance label | Target | Suggested pace over 30 days |
|---|---|---|---:|---:|
| `september-starter-run-25k` | September Starter Run | 25K | 25 km | About 0.84 km/day |
| `september-progress-run-50k` | September Progress Run | 50K | 50 km | About 1.67 km/day |
| `september-endurance-run-75k` | September Endurance Run | 75K | 75 km | 2.5 km/day |
| `september-active-run-100k` | September Active Run | 100K | 100 km | About 3.34 km/day |
| `september-distance-run-150k` | September Distance Run | 150K | 150 km | 5 km/day |
| `september-ultra-run-200k` | September Ultra Run | 200K | 200 km | About 6.67 km/day |

Use `type: distance` for every category. Set `slots`, `cutoffTime`, and `ageGroup` to empty or null values. The category reward description should state: **Digital category finisher badge and certificate after the selected approved-distance target is reached.**

The event-level `targetDistanceKm` is 200 km only as the maximum/fallback challenge target. A registered participant's selected category target is authoritative for completion, progress, badges, and certificates.

## Public Listing Copy

### Tagline

Choose your goal. Build your month. Finish strong.

### Short Description

Make September your active month with a free virtual distance challenge you can complete anywhere. Choose a 25K, 50K, 75K, 100K, 150K, or 200K goal, then build your approved distance through runs, jogs, walks, trail runs, or hikes from September 1 to 30. Finish your selected goal to earn a category badge and digital certificate, and keep moving beyond it if you want to climb the distance standings.

### Event Overview

September Active Run is a free, month-long virtual challenge for runners, walkers, hikers, beginners, and experienced distance athletes. Choose one goal that fits your September, record eligible foot-based activities wherever you are, and submit clear proof through HelloRun.

You do not need to complete your selected distance in one activity. Approved activities of at least 1 km accumulate throughout the event period until you reach your category target. Every eligible kilometer beyond your target remains part of your verified total and may improve your position in the friendly distance standings, but it does not change the category you selected at registration.

## Full Event Details

The following content is ready for the organizer event-details editor.

---

## Choose a September goal

Pick one accumulated-distance category that is challenging but realistic for your current fitness and available time.

- **25K September Starter Run** — a welcoming goal for beginners, walkers, and first-time virtual participants; about 0.84 km per day.
- **50K September Progress Run** — for active walkers, joggers, and recreational runners; about 1.67 km per day.
- **75K September Endurance Run** — for participants ready to build steady endurance; 2.5 km per day.
- **100K September Active Run** — a strong month-long consistency goal; about 3.34 km per day.
- **150K September Distance Run** — for experienced and high-volume participants; 5 km per day.
- **200K September Ultra Run** — the highest-volume September goal; about 6.67 km per day.

The daily figures are pacing guides, not daily requirements. You may cover more distance on some days, less on others, and take rest days. Completion depends on your approved total by the end of the challenge.

Choose carefully when you register. Your selected category determines your official finisher target, badge, and certificate. Extra distance does not move you into another category.

## How to participate

1. Create or sign in to your HelloRun runner account.
2. Register for September Active Run by September 22, 2026 at 11:59 PM Asia/Manila.
3. Select one category from 25K through 200K.
4. Complete eligible activities from September 1 through September 30, 2026.
5. Record each activity with a supported running or fitness app.
6. Submit a verified app activity or a clear screenshot through HelloRun.
7. Continue until your approved distance reaches your selected target.
8. Submit all remaining September proof by October 14, 2026 at 11:59 PM Asia/Manila.

Only approved, eligible, non-duplicate submissions count toward official progress.

## Eligible activities

Eligible foot-based activities are:

- Outdoor running
- Jogging
- Walking
- Trail running
- Hiking
- Treadmill running or walking when the submitted proof clearly shows the distance and activity date

In HelloRun's event configuration, jogging is recorded under `run`. The internal accepted activity values are `run`, `walk`, `trail_run`, and `hike`.

The following do not count:

- Cycling or stationary-bike distance
- Swimming
- Motorcycle, car, or other vehicle-assisted distance
- Activities completed before September 1 or after September 30, 2026
- Activities shorter than 1 km
- Edited, manipulated, unreadable, or incomplete evidence
- Duplicate submissions of the same activity
- Activities completed by another person

## Activity proof requirements

Submit proof through verified running-app synchronization or a clear screenshot from a fitness or running app. Examples include Strava, Garmin Connect, COROS, Nike Run Club, Adidas Running, Apple Fitness, Samsung Health, Google Fit, Fitbit, Suunto, and comparable apps.

Each proof must clearly show:

- Activity date
- Distance completed in kilometers, or a clearly convertible distance unit
- Duration or moving time
- Activity type
- App or tracker source
- Participant or profile identity when available
- Route or activity summary when available

Do not crop out the date or distance. Do not alter recorded figures. If the same activity appears in more than one screenshot or source, submit it only once.

Activities must be at least 1 km. Multiple valid activities may be submitted, and there is no required daily or weekly submission schedule. The final deadline for all September activities is October 14, 2026 at 11:59 PM Asia/Manila.

## Completion and extra distance

You become an official category finisher when your approved distance reaches or exceeds the target selected during registration.

| Selected category | Approved total | Result |
|---|---:|---|
| September Starter Run | 24.99 km | In progress |
| September Starter Run | 25.00 km | Finisher |
| September Active Run | 99.90 km | In progress |
| September Active Run | 100.00 km | Finisher |
| September Active Run | 112.40 km | Finisher; 112.40 km remains in the standings |

Pending submissions do not count toward the official total until approved. Rejected, duplicate, flagged, or out-of-window activities do not count.

Extra approved distance remains visible and can affect highest-distance rankings. It does not change the participant's selected category, finisher badge, or certificate category.

## Badges, certificates, and standings

Every verified finisher is eligible for:

- A digital finisher badge for the selected distance category
- A digital completion certificate reflecting the selected category
- Placement among finishers for the selected category
- Inclusion in the event's highest verified distance standings when public leaderboard participation is enabled

The leaderboard uses approved distance only. Pending and flagged results are hidden. Public names use a privacy-aware format, and participants may use the privacy controls available during registration. The standings are intended as friendly motivation; reaching your selected goal remains the event's primary achievement.

Organizer review runs from October 15 through October 17, 2026. Final badges, certificates, and recognition are scheduled for release beginning October 18, 2026 after eligible submissions are reviewed.

## Safety and personal responsibility

Choose a goal appropriate to your current fitness, health, schedule, and experience. Increase distance gradually, include recovery time, stay hydrated, use routes and equipment suitable for local conditions, and stop if you feel pain, dizziness, or unusual discomfort.

This challenge is not medical advice or a promise that a particular goal is safe for every participant. Consult a qualified health professional before beginning or increasing physical activity when appropriate for your circumstances.

Follow local laws, weather advisories, trail rules, facility policies, and traffic-safety practices. Do not take screenshots, submit proof, or interact with HelloRun while moving in traffic or in an unsafe location.

## Privacy and fair participation

Share only the activity information needed for event verification. Review screenshots before uploading and avoid exposing home addresses, private messages, account numbers, health information, or other unnecessary personal details.

By submitting proof, you confirm that the activity is yours, occurred during the official event period, has not been materially edited, and has not already been submitted to this event. HelloRun and the organizer may reject or investigate evidence that is incomplete, duplicated, inconsistent, manipulated, or otherwise ineligible under the published rules.

---

## Organizer Form Mapping

### Core Details

| Organizer field | Value |
|---|---|
| Event Title | September Active Run |
| Organizer Name | HelloRun |
| Short Description | Use **Public Listing Copy → Short Description** |
| Event Details | Use **Full Event Details** |
| Event Type | Virtual |
| Event Types Allowed | Virtual only |
| Race Distances | `25K`, `50K`, `75K`, `100K`, `150K`, `200K` |

### Schedule and Location

| Organizer field | Value |
|---|---|
| Registration Open | August 30, 2026 at 12:00 AM Asia/Manila |
| Registration Close | September 22, 2026 at 11:59 PM Asia/Manila |
| Event Start | September 1, 2026 at 12:00 AM Asia/Manila |
| Event End | September 30, 2026 at 11:59 PM Asia/Manila |
| Virtual Start | September 1, 2026 at 12:00 AM Asia/Manila |
| Virtual End | September 30, 2026 at 11:59 PM Asia/Manila |
| Final Submission Deadline | October 14, 2026 at 11:59 PM Asia/Manila |
| Venue Name | Virtual — run anywhere |
| City / Province | Leave blank |
| Country | Philippines (`PH`) |

### Virtual Challenge Rules

| Organizer field | Value |
|---|---|
| Completion Mode | Accumulated activity (`accumulated_activity`) |
| Challenge Metrics | Distance |
| Primary Challenge Metric | Distance |
| Event Target Distance | 200 km maximum/fallback; category target governs each participant |
| Minimum Activity Distance | 1 km |
| Accepted Run Types | `run`, `walk`, `trail_run`, `hike` |
| Proof Types | `running_app_sync`, `photo` |
| Multiple Submissions | Yes, inherent to accumulated challenge flow |
| Count Pending Submissions | No |
| Count Approved Submissions Only | Yes |
| Allow Pre-event Activities | No |
| Allow Post-event Activities | No |
| Milestone Distances | 25, 50, 75, 100, 150, and 200 km |

### Registration and Pricing

| Organizer field | Value |
|---|---|
| Fee Mode | Free (`free`) |
| Pricing Mode | Free (`free`) |
| Fee Amount | Empty/null |
| Currency | PHP |
| Guest Registration | Disabled |
| Participant Capacity | Unlimited |
| Category Slots | Empty/null for every category |
| Waitlist | Disabled |
| Registration Packages | None |
| Add-ons | None |
| Physical Rewards | Disabled |
| Delivery Fee | Disabled |
| Delivery Address | Not required |
| International Runners | Allowed |

### Recognition and Leaderboard

| Organizer field | Value |
|---|---|
| Recognition Mode | Completion with optional ranking (`completion_with_optional_ranking`) |
| Leaderboard Mode | Finishers and top metric (`finishers_and_top_metric`) |
| Digital Badge | Enabled |
| Digital Certificate | Enabled |
| Leaderboard Recognition | Enabled |
| Leaderboard Type | Accumulated challenge (`accumulated_challenge`) |
| Ranking Basis | Highest verified distance (`highest_verified_distance`) |
| Visibility | Public |
| Show Pending | No |
| Hide Flagged | Yes |
| Public Name Format | First name and last initial (`first_name_last_initial`) |
| Visible Columns | Rank, runner, category, distance, and status |
| Highest Steps Card | Disabled |
| Highest Elevation Card | Disabled |
| Most Consistent Card | Disabled |

### Media and Waiver

| Organizer field | Value |
|---|---|
| Logo | `assets/events/september-active-run-2026/september-active-run-2026-badge.png` |
| Banner | New September Active Run landscape artwork |
| Poster | New September Active Run portrait/social artwork |
| Gallery | Optional inclusive running, walking, trail, and community imagery |
| Waiver | Current HelloRun default event waiver |
| Waiver Version | Current version at encoding time |

## Media Direction

The visual system should communicate fresh September momentum rather than elite racing.

- Use HelloRun green and orange as the primary brand colors, supported by warm sunrise neutrals and accessible dark text.
- Show a varied group of everyday participants running, jogging, walking, or hiking outdoors. Represent different ages, abilities, body types, and experience levels without presenting a specific participant as the event winner.
- Favor natural movement, open routes, early-morning light, and forward energy. Avoid stadium-only imagery, extreme-race cues, unsafe road behavior, identifiable home routes, or imagery implying that all six distances must be completed in one session.
- Make **September Active Run** the dominant text, followed by **25K • 50K • 75K • 100K • 150K • 200K** and **September 1–30, 2026**.
- Include **Free Virtual Challenge** and the tagline only when space permits. Do not place the registration deadline in artwork; keep dates authoritative in structured event content so they can be corrected without replacing media.
- Produce landscape banner and portrait/social versions with safe margins for responsive cropping. Ensure text contrast remains readable at mobile card size.

Asset generation and upload are outside this reference document.

The approved event badge source is a transparent, circle-safe square emblem with the exact text **September Active Run** and **2026**. The publishing script uploads it as the event logo and derives the circular badge image used by the event's automatically generated participant, finisher, distance-finisher, and ranking badge records.

## Organizer Publication Checklist

- [ ] Confirm the title is **September Active Run** and the slug is `september-active-run-2026`.
- [ ] Confirm all stored timestamps use the canonical Asia/Manila values in this brief.
- [ ] Confirm registration closes before the activity window ends and proof remains open only through October 14.
- [ ] Create all six categories with the exact IDs, unique distance labels, and numeric targets listed above.
- [ ] Confirm participants can select exactly one category.
- [ ] Confirm the event is free and has no packages, physical rewards, delivery fields, capacity, or waitlist.
- [ ] Confirm `running_app_sync` and `photo` are the only configured proof types.
- [ ] Confirm the minimum activity distance is 1 km and only approved submissions count.
- [ ] Confirm the accepted internal activities are `run`, `walk`, `trail_run`, and `hike`.
- [ ] Confirm the category target, not the 200 km event fallback, governs participant completion.
- [ ] Configure and preview category-specific finisher badges for all six distances.
- [ ] Configure and publish the certificate template before recognition release.
- [ ] Confirm the leaderboard ranks highest verified distance, hides pending and flagged results, and uses privacy-aware names.
- [ ] Upload approved banner, poster, logo, and optional gallery media with accessible alternative text.
- [ ] Preview the event as a guest and as a registered runner at desktop and mobile widths.
- [ ] Check that public copy, structured dates, registration cards, proof rules, and recognition promises agree.
- [ ] Use the current HelloRun default waiver and complete the organizer/admin review workflow before publication.
- [ ] After October 14, complete final reviews from October 15–17 and release recognition beginning October 18.

## Acceptance Checks

- The registration, activity, proof, review, and recognition periods are chronological and expressed in Asia/Manila.
- All six category names map to unique labels and the exact targets 25, 50, 75, 100, 150, and 200 km.
- The short description is below the current 2,000-character `Event.description` limit.
- The event-details content is below the current 20,000-character `Event.eventDetailsMarkdown` limit.
- Every enumerated value in the form mapping is supported by the current `Event` model and event-form service.
- The brief contains enough information to encode and review the event without inventing additional product rules.
