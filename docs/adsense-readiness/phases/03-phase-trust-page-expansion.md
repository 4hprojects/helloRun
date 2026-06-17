# Phase 3 - Trust Page Expansion

Status: complete. Implemented in PR #10 and merged to `main`.

## Objective

Strengthen HelloRun's trust signals by expanding key public pages:

- About
- Contact
- Author profile or team page
- Legal page links and footer organization

This phase helps AdSense reviewers understand who owns the site, what the site does, and how users can contact the platform.

## Pages To Inspect

- `/about`
- `/contact`
- footer layout
- author links on blog posts
- privacy and terms links
- any existing team or profile routes

## About Page Requirements

The About page should explain:

- What HelloRun is
- Why it was created
- Who it serves
- What problems it solves for runners
- What problems it solves for organizers
- Where the platform is based
- Who operates or manages it
- How it supports virtual, hybrid, and community running events

## Suggested About Page Structure

1. About HelloRun
   - Short explanation of the platform.

2. Why HelloRun was created
   - Mention the need for flexible virtual runs.
   - Mention easier proof submission and event tracking.
   - Mention community movement and consistency.

3. Who HelloRun is for
   - Beginner runners
   - Recreational runners
   - Walkers and fitness participants
   - Schools
   - Community organizations
   - Event organizers

4. What HelloRun does
   - Event discovery
   - Registration
   - Proof submission
   - Result review
   - Leaderboard
   - Certificates and recognition when enabled

5. Platform values
   - Clear rules
   - Honest submissions
   - Flexible participation
   - Community health and activity

6. Founder or organizer profile
   - Henson M. Sagorsor
   - Educator, systems developer, recreational runner, and event organizer
   - Based in Benguet, Philippines
   - Keep this factual and not exaggerated.

7. Contact
   - Email
   - Location
   - Link to contact page

## Contact Page Requirements

The Contact page should include:

- Support email
- Platform/business identity
- Location
- Expected response time
- What users can contact HelloRun about
- Links to FAQ, Privacy Policy, and Terms

## Suggested Contact Sections

1. Contact HelloRun
2. Runner support
3. Organizer inquiries
4. Payment or registration concerns
5. Data and privacy requests
6. Event partnerships
7. Response time
8. Important links

## Author Profile Requirements

If blog posts show an author name, make it more credible.

Add or improve:

- Author name
- Role
- Short bio
- Running or event background
- Link from blog posts

Suggested bio:

```txt
Henz writes HelloRun guides for runners and event organizers, focusing on virtual race setup, proof submission, beginner-friendly running, and community fitness events in the Philippines.
```

## Footer Requirements

Footer should clearly link to:

- About
- How It Works
- FAQ
- Contact
- Blog
- Events
- Privacy Policy
- Terms and Conditions
- Cookie Policy
- Data Usage Policy
- Refund and Cancellation Policy
- Community Guidelines

Avoid footer links to:

- Empty Shop page
- Dashboard
- Admin
- Placeholder pages

## Acceptance Criteria

Phase 3 is complete when:

- About page is at least 800 words or clearly substantial.
- Contact page includes direct contact information and support categories.
- Blog author identity is clearer.
- Footer links are accurate and useful.
- Empty or private links are not promoted in the footer.
- Claims are honest and supported.
- The pages are readable and useful without login.

## Agent Prompt

Use this prompt with Codex or Claude:

```txt
You are working on the HelloRun codebase. Complete Phase 3 of the AdSense cleanup.

Goal: Expand trust-focused public pages so AdSense reviewers can clearly understand who owns HelloRun, what it does, who it serves, and how users can contact support.

Tasks:
1. Inspect existing About, Contact, footer, and blog author patterns.
2. Expand the About page with substantial original content.
3. Expand the Contact page with support categories, location, email, response expectations, and important links.
4. Improve blog author identity or add an author profile if the project structure supports it.
5. Clean footer links so they point to real public pages only.
6. Avoid exaggerated claims.
7. Keep the existing design style.

Acceptance checks:
- About and Contact are substantial and not thin.
- Contact information is visible.
- Footer links are accurate.
- No private or empty page is promoted.
- Author information is clearer.

Report the files changed and any content that still needs owner confirmation.
```
