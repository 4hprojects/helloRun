# Phase 4 - How It Works And FAQ Expansion

Status: complete. Implemented in PR #10 and merged to `main`.

## Objective

Turn HelloRun's How It Works and FAQ pages into strong public resources.

This phase directly addresses the "low value content" concern by creating pages that are useful even to visitors who are not logged in.

## Pages To Inspect

- `/how-it-works`
- `/faq`
- submit result components or modals
- event detail pages that link to instructions
- footer resource links

## Key Issue To Fix

The current How It Works page may expose submit-run modal or form text in indexed content. That makes the page look messy and app-like instead of guide-like.

Fix this by:

- Keeping the public guide content clean.
- Ensuring modals are not rendered as indexed page content unless opened by users.
- Avoiding hidden form content in the public HTML if possible.

## How It Works Page Structure

Build a detailed guide with these sections:

1. What HelloRun is
2. How virtual runs work
3. Who can join
4. Step 1: Create an account
5. Step 2: Choose an event
6. Step 3: Complete your activity
7. Step 4: Prepare your proof
8. Step 5: Submit your result
9. Step 6: Wait for organizer review
10. Step 7: Check leaderboard or certificate
11. For accumulated challenges
12. For single-distance events
13. For organizers
14. Common proof submission mistakes
15. Safety and honesty reminder
16. Links to FAQ and Events

## FAQ Page Structure

Create a detailed FAQ with grouped questions.

### Runner Questions

- What is HelloRun?
- What is a virtual run?
- Do I need a GPS watch?
- Can I use Strava?
- Can I use Nike Run Club, Garmin, Huawei Health, Samsung Health, or other apps?
- Can I walk instead of run?
- Can I join from anywhere?
- How do I register for an event?
- Can I join multiple events?
- Can one activity count for multiple eligible events?

### Proof Submission Questions

- What proof is accepted?
- What should my screenshot show?
- Can I submit manual entries?
- Why does my result need review?
- Why was my result rejected?
- Can I edit a submitted result?
- What happens if the screenshot name does not match my account?
- What if my app shows miles instead of kilometers?

### Leaderboard And Certificate Questions

- When will my result appear?
- How are rankings calculated?
- How do accumulated distances work?
- How do certificates work?
- What if my certificate has the wrong name?

### Organizer Questions

- Can I create an event?
- What event types are supported?
- Can HelloRun support school or community events?
- Can events be free or paid?
- How are payment receipts reviewed?
- How are submissions approved?

### Account And Privacy Questions

- Is HelloRun free?
- How do I delete my account?
- How is my data handled?
- How do I contact support?

## Content Rules

- Use practical examples.
- Use Philippine and HelloRun context where natural.
- Avoid generic running filler.
- Avoid unsupported health claims.
- Avoid copying text from other sites.
- Keep answers short but complete.
- Link to related pages.

## Acceptance Criteria

Phase 4 is complete when:

- How It Works is a complete guide, not just a short feature list.
- FAQ answers the main runner and organizer questions.
- Modal/form text does not clutter indexed public guide content.
- Both pages are useful without login.
- Both pages have unique metadata.
- Both pages link to Events, Blog, Contact, Privacy, and Terms where relevant.

## Agent Prompt

Use this prompt with Codex or Claude:

```txt
You are working on the HelloRun codebase. Complete Phase 4 of the AdSense cleanup.

Goal: Expand How It Works and FAQ into strong public resources that explain virtual runs, proof submission, leaderboards, certificates, and organizer workflows.

Tasks:
1. Inspect the current How It Works and FAQ routes.
2. Remove or prevent submit-result modal/form text from appearing as indexed guide content.
3. Expand How It Works into a detailed step-by-step guide.
4. Create or expand FAQ with grouped runner, proof submission, leaderboard, organizer, account, and privacy questions.
5. Add useful internal links.
6. Add unique metadata for both pages.
7. Keep the design consistent with the existing site.

Acceptance checks:
- How It Works is substantial and readable.
- FAQ is complete and grouped by topic.
- No unrelated modal text appears in the visible public guide.
- Pages work on mobile.
- Public links are accurate.

Report the files changed and any questions that need owner confirmation.
```
