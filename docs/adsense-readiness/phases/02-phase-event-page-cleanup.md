# Phase 2 - Event Page Cleanup

Status: complete. Implemented in PR #10 and merged to `main`.

## Objective

Clean HelloRun event pages so they look complete, accurate, useful, and unique instead of repeated or template-heavy.

This phase targets AdSense concerns around:

- duplicate content
- repeated event blocks
- thin event pages
- under-construction labels
- inconsistent dates
- event pages that become dead pages after registration closes

## Pages To Inspect

Start with:

- `/events`
- every public `/events/[slug]` page
- May Active Quest
- June Active Quest
- Kalayaan Run
- 2026K HelloRun Challenge
- any Cordillera Run or July event drafts if already public

## Problems To Fix

1. Repeated content blocks.
   - Registration options repeated several times.
   - Categories repeated several times.
   - Completion goal repeated.
   - Event ended labels repeated.
   - Timeline repeated.

2. Inconsistent dates.
   - Event window should match event details.
   - Registration close date should match all sections.
   - Final submission deadline should be consistent.

3. Unfinished labels.
   - Remove or hide "Badges pending."
   - Remove placeholder text.
   - Remove "Location TBA" if event is virtual and can say "Anywhere."

4. Ended events that feel dead.
   - Add recap sections.
   - Keep them useful for readers.

## Event Page Structure

Use this structure for each public event page:

1. Event hero
   - Event name
   - Status
   - Mode: Virtual, on-site, or hybrid
   - Main description
   - Registration status

2. Event summary
   - Event dates
   - Registration deadline
   - Final submission deadline
   - Location or virtual participation note
   - Fee
   - Organizer

3. Who this event is for
   - Beginner runners
   - Walkers
   - Returning runners
   - Active community members
   - Long-distance participants if relevant

4. Categories
   - Show each distance once.
   - Explain accumulated distance if applicable.

5. How the event works
   - Register
   - Complete activity
   - Submit proof
   - Wait for approval
   - View leaderboard or certificate

6. Submission rules
   - Accepted activities
   - Accepted proof types
   - Required screenshot details
   - Deadline
   - Review process

7. Rewards and recognition
   - Certificate
   - Badge if actually available
   - Leaderboard
   - Social media card if actually available

8. Event recap for ended events
   - What the event encouraged
   - Categories offered
   - Participation summary if available
   - Link to leaderboard or next event

## Specific Content Rules

- Do not repeat the same event data in multiple sections.
- Do not show incomplete features publicly.
- Do not promise medals, shirts, badges, or certificates unless the event actually provides them.
- Replace "Location TBA" with "Anywhere" for virtual events.
- Use plain dates consistently.
- Keep event-specific details unique.

## Suggested Recap Template

```md
## Event Recap

The [Event Name] encouraged runners, walkers, and active community members to complete [distance/categories] within the official event period. Participants could submit proof from supported fitness apps or clear activity screenshots for organizer review.

This event focused on [purpose], making it suitable for [audience]. Approved submissions were counted toward official progress and leaderboard recognition.
```

## Acceptance Criteria

Phase 2 is complete when:

- Every public event page has no repeated major content blocks.
- Event dates are consistent within each event.
- No "Badges pending" or unfinished labels appear publicly.
- Ended events include useful recap content.
- Virtual events do not show "Location TBA" unless truly necessary.
- Event pages are readable without logging in.
- Event details are unique enough to avoid looking auto-generated.
- Event list cards have accurate title, date, status, and short description.

## Agent Prompt

Use this prompt with Codex or Claude:

```txt
You are working on the HelloRun codebase. Complete Phase 2 of the AdSense cleanup.

Goal: Clean all public event pages so they are accurate, useful, and not repetitive.

Tasks:
1. Inspect the event page components, event data model, and public event routes.
2. Remove repeated event sections such as duplicate categories, duplicate registration options, duplicate timeline blocks, and repeated event ended labels.
3. Fix inconsistent dates across each event page.
4. Hide incomplete public labels such as "Badges pending."
5. Replace "Location TBA" with "Anywhere" for virtual events when appropriate.
6. Add recap content for ended events.
7. Make event pages readable and useful even after registration closes.
8. Keep changes scoped to event listing and event detail pages.

Acceptance checks:
- No public event page has repeated major content blocks.
- Dates are consistent inside every event page.
- No placeholder or unfinished label appears publicly.
- Ended events have recap content.
- Event pages remain responsive and readable on mobile.

Report the files changed, the event pages updated, and any events that still need manual content from the owner.
```
