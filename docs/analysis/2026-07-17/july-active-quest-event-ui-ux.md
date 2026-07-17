# July Active Quest event detail UI/UX audit

Date: July 17, 2026  
Surface: `/events/july-active-quest-virtual-run`  
Primary audiences: a guest choosing a July goal and a registered runner returning to check progress

## Runner point of view

### Guest deciding whether to join

“I want to know whether this is free, whether I can still join, which goal fits me, which activities count, and when proof is due. I should not need to read the organizer’s full article before I can make that decision.”

The redesigned page answers those questions in sequence: challenge identity, six comparable goals, authoritative dates, a short process, accepted activity and proof rules, and rewards. Registration stays available without allowing repeated pricing and timeline panels to dominate the page.

### Registered runner returning to the event

“I already joined. Do not ask me to register again. Show my selected quest, verified total, pending distance, remaining distance, and what I should do next.”

The page now resolves the runner’s active registration and category target, then replaces registration prompts with verified progress and a state-aware action. Pending activity remains separate from official progress, and an over-target runner keeps the true total while the visual bar stops at 100%.

## Severity-ranked findings and resolution

| Severity | Finding | Runner impact | Implemented resolution |
| --- | --- | --- | --- |
| Critical | Registered runners received the same registration prompts as guests. | The page ignored the runner’s actual journey and sent duplicate registrations to a downstream error. | Resolve the active registration and show selected quest, verified/pending progress, timing, and the correct activity or history action. |
| High | The hero occupied most of the first viewport while the six goal choices appeared far below it. | A runner could not answer “Which challenge fits me?” without scrolling past repeated marketing content. | Use a compact challenge header and place the balanced goal grid immediately below navigation. |
| High | The description and organizer article said registration closed July 15 while structured settings said July 22. | Conflicting deadlines undermine trust and can cause missed registration. | Correct both stored text fields to July 22 and render structured dates as authoritative. Promotional artwork receives an explicit current-dates caveat. |
| High | Pricing, registration state, timeline, categories, and CTAs were repeated across the hero, statistics, sidebar, mobile facts, and final CTA. | Repetition increased page length without improving the decision. | Give each decision fact one primary location and use one contextual mobile action bar. |
| Medium | The long organizer article repeated most structured rules and remained fully expanded. | Decision-critical content was buried in a long reading flow. | Preserve the sanitized server-rendered content in an “Additional organizer details” disclosure after structured rules and rewards. |
| Medium | Accumulated registrations with descriptive labels such as “25K July Starter Quest” could fall back to the event-level 200 km target. | Personal progress could show the wrong goal. | Extend selected-distance parsing to resolve leading kilometre values before using the event fallback. |
| Medium | The event detail linked to leaderboard discovery instead of the event’s standings. | Runners needed an unnecessary second event-selection step. | Link directly to `/events/:slug/leaderboard`. |
| Medium | Mobile goal cards repeated the distance in the title, target, and per-card instructions. | Six tall cards slowed comparison and pushed the event dates out of view. | State the accumulation and registration model once, strip the repeated leading distance from the visible quest name, and use compact target/name rows on phones. |
| Medium | The desktop goal area explained the options but did not advance the runner from comparison to registration. | Runners reached the key decision point without a contextual next step. | Compress all six goals into one comparison strip and place a single “Choose a goal & register” action beside the decision copy. Category selection remains on the registration page. |
| Medium | The four “How This Event Works” cards used more vertical space than their short instructions required. | The oversized explainer delayed proof rules, rewards, and the final conversion point. | Use compact numbered rows inside the four-column desktop grid while retaining the existing concise mobile step list. |
| Medium | The poster ended the event story without a next action. | A persuaded runner reached the bottom of the decision content and had to scroll back up to register. | Add a closing registration prompt after poster/gallery content for guests and unregistered runners; suppress it in preview, registered, and sticky-mobile states. |
| Medium | Removing accumulated-event sidebar cards left the desktop content confined to the old main column. | Large screens showed an unused right rail while decision content felt unnecessarily narrow. | Expand the shell to one full-width column when no shop, contact form, or configured sidebar ad is present. |
| Low | The event poster was visually prominent beside the first decision content. | Promotional artwork competed with choosing a goal and retained an older embedded deadline. | Move accumulated-event posters below structured content while preserving the accessible lightbox. |

## Responsive evidence

- [Guest desktop, 1440 px](assets/july-active-quest-desktop.png)
- [Guest tablet, 768 px](assets/july-active-quest-tablet.png)
- [Guest mobile, 390 px](assets/july-active-quest-mobile.png)
- [Guest narrow mobile, 320 px](assets/july-active-quest-mobile-320.png)
- [Completed runner desktop, 1440 px](assets/july-active-quest-runner-desktop.png)
- [Completed runner mobile, 390 px](assets/july-active-quest-runner-mobile.png)

The full-width desktop goal grid uses six compact columns so every option can be compared in one scan; desktop layouts with a substantive sidebar and tablet layouts use three columns. Mobile uses one compact comparison row per goal. The target stays in a stable left column, while the visible quest name omits its redundant leading distance; the complete category name remains available to assistive technology. Desktop places one registration action at the comparison point. On mobile that in-section action is suppressed in favor of the existing safe-area-aware sticky action bar, preventing duplicate actionable controls. Long category names wrap without forcing horizontal scrolling.

## Presentation and data rationale

- The event model remains authoritative for pricing, registration state, categories, challenge and submission windows, eligible activities, and proof types.
- Category target precedence remains pricing snapshot category, selected distance, then event target. Descriptive selected-distance labels now resolve their leading kilometre value.
- The authenticated presentation queries only the current runner’s registration and safe aggregate activity fields. It does not expose proof files, OCR data, contact details, suspicious flags, or organizer review metadata.
- Race-result events do not receive the accumulated runner-progress presentation.
- Existing save, contact, badge, shop, advertisement, preview, related-event, gallery, poster, SEO, and run-proof hooks remain in place.

## Acceptance criteria

- [x] The header is materially shorter than the previous 620 px hero and uses concise generated challenge copy.
- [x] Guests see all six category goals immediately after the header and before secondary content.
- [x] Phone-width goal choices avoid repeated distance and instruction text and keep each comparison row compact.
- [x] Full-width desktop presents all six goals in one scan and provides a contextual route into registration.
- [x] The four-step explainer uses compact numbered cards without losing activity or proof guidance.
- [x] The desktop guest journey ends with a registration action after the poster/content sequence.
- [x] Decision-support section titles align directly beside their icons instead of inheriting centered global heading styles.
- [x] Desktop accumulated content expands when no substantive sidebar modules render.
- [x] Structured registration, activity, and submission dates appear together and use the platform date formatter.
- [x] The stored July registration deadline copy matches the July 22 structured setting.
- [x] Registered runners never receive another registration CTA.
- [x] Verified and pending distance are visually and semantically separate.
- [x] Category-specific targets, remaining distance, activity counts, completion, and over-target progress are accurate.
- [x] Mobile uses one 48 px contextual action and coordinates with the runner navigation safe area.
- [x] Organizer details are collapsed by default but remain server-rendered and accessible.
- [x] Event standings use the direct event leaderboard route.
- [x] Keyboard focus, reduced motion, 200% zoom behavior, and narrow layouts retain usable controls without page-level horizontal scrolling.
