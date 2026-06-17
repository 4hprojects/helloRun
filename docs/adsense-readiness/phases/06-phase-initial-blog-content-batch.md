# Phase 6 - Initial Blog Content Batch

Status: complete. Implemented in PR #10 and merged to `main`.

## Objective

Publish an initial batch of original, useful blog posts so HelloRun has enough public content for AdSense review.

Target:

- Minimum: 10 strong posts
- Better: 15 posts
- Recommended length: 800 to 1,500 words each

## Content Principles

Each post should:

- Be original.
- Help a real runner or organizer.
- Include HelloRun-specific examples.
- Use Philippine virtual run context where relevant.
- Link to related HelloRun pages.
- Avoid generic filler.
- Avoid unsupported health claims.
- Avoid copied text from other websites.

## Recommended First 15 Posts

1. How to Join a Virtual Run in the Philippines
2. How to Submit Run Proof Correctly on HelloRun
3. Best Running Apps for Virtual Runs
4. Beginner 5K Training Plan for New Runners
5. Walking vs Running in Virtual Fitness Challenges
6. How Accumulated Distance Challenges Work
7. Common Mistakes When Joining a Virtual Run
8. How to Organize a Community Virtual Run
9. How Schools Can Use Virtual Runs for Wellness Events
10. Running Safety Tips for Early Morning and Night Runs
11. How to Read Pace, Distance, and Duration in Running Apps
12. What Counts as Valid Run Proof?
13. How Leaderboards Work in Virtual Running Events
14. Why Virtual Runs Help Build Consistency
15. Virtual Run vs Traditional Race

## Priority First 10 Posts

If time is limited, publish these first:

1. How to Join a Virtual Run in the Philippines
2. How to Submit Run Proof Correctly on HelloRun
3. Best Running Apps for Virtual Runs
4. Beginner 5K Training Plan for New Runners
5. How Accumulated Distance Challenges Work
6. What Counts as Valid Run Proof?
7. How Leaderboards Work in Virtual Running Events
8. Virtual Run vs Traditional Race
9. How to Organize a Community Virtual Run
10. Running Safety Tips for Early Morning and Night Runs

## Required Post Template

Each post should include:

```md
# Title

Short intro explaining who the guide is for and what the reader will learn.

## Main Section

Practical explanation.

## Example

Use a concrete HelloRun or virtual run example.

## Common Mistakes

List mistakes and how to avoid them.

## What To Do Next

Link to relevant HelloRun pages.
```

## Internal Links To Use

Use links naturally:

- Events page
- How It Works
- FAQ
- Contact
- Relevant event page
- Related blog posts

## Example Content Angles

For "How to Submit Run Proof Correctly on HelloRun":

- Explain what a proof screenshot should show.
- Mention date, distance, duration, and app source.
- Explain name mismatch review.
- Explain why blurry screenshots delay approval.
- Give an example for a 25K accumulated challenge.

For "How Accumulated Distance Challenges Work":

- Explain that distance can be completed over multiple activities.
- Example: 25K can be five 5K walks or mixed activities within the event window.
- Explain accepted activities.
- Explain deadline and review.

For "How to Organize a Community Virtual Run":

- Explain goal setting.
- Explain categories.
- Explain event timeline.
- Explain proof review.
- Explain communication with participants.

## Acceptance Criteria

Phase 6 is complete when:

- At least 10 strong blog posts are published.
- Each post has title, description, category, author, date, and reading time.
- Each post has internal links.
- Each post has practical examples.
- No post is a short placeholder.
- Blog index shows the posts correctly.
- Homepage blog section shows polished posts.

## Agent Prompt

Use this prompt with Codex or Claude:

```txt
You are working on the HelloRun codebase. Complete Phase 6 of the AdSense cleanup.

Goal: Add an initial batch of original blog content so HelloRun has enough public value for AdSense review.

Tasks:
1. Inspect how blog posts are stored and rendered.
2. Add at least 10 complete blog posts from the priority list.
3. Each post must include title, slug, description, category, author, published date, updated date if supported, reading time, and useful body content.
4. Use HelloRun-specific examples and Philippine virtual run context where relevant.
5. Add internal links to Events, How It Works, FAQ, Contact, or related posts.
6. Avoid generic filler and unsupported health claims.
7. Ensure posts appear correctly on blog index, blog detail pages, and homepage blog cards.

Acceptance checks:
- At least 10 complete posts are public.
- No post is thin or placeholder.
- Blog index and detail pages render correctly.
- Internal links work.
- Metadata is unique per post.

Report the posts added and any content that should be reviewed by the owner before publishing.
```
