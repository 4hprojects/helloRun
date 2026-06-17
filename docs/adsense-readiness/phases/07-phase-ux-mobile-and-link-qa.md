# Phase 7 - UX, Mobile, And Link QA

Status: mostly complete. Automated checks and HTTP smoke checks passed; in-app Browser visual QA was blocked by local plugin runtime setup.

## Objective

Verify that HelloRun's public pages are usable, readable, and free from obvious errors before AdSense review.

This phase checks:

- mobile layout
- desktop layout
- navigation
- broken links
- placeholder content
- repeated content
- page readability
- modal behavior

## Pages To Test

Core pages:

- `/`
- `/events`
- `/events/[slug]`
- `/blog`
- `/blog/[slug]`
- `/about`
- `/how-it-works`
- `/faq`
- `/contact`
- `/privacy`
- `/terms`

Utility pages:

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`

Private pages:

- `/dashboard`
- `/admin`
- `/organizer`
- `/account`

These should not be promoted as public AdSense content.

## Mobile QA Checklist

Check at common widths:

- 360px
- 390px
- 430px
- 768px

Look for:

- horizontal scrolling
- overlapping buttons
- unreadable text
- clipped cards
- too much vertical spacing
- modals that open unexpectedly
- footer links wrapping badly
- event cards with cramped dates or categories
- blog cards with cut-off titles

## Desktop QA Checklist

Check at:

- 1366px
- 1440px
- 1920px if available

Look for:

- overly wide text lines
- repeated content blocks
- empty sections
- broken images
- weak hierarchy
- inconsistent card spacing
- confusing navigation

## Link QA Checklist

Test:

- Header links
- Footer links
- Homepage CTAs
- Event cards
- Blog cards
- Blog internal links
- Legal page links
- FAQ links
- Contact links

Fix links that lead to:

- missing pages
- irrelevant pages
- private pages when public info is promised
- placeholder pages
- empty Shop page

## Content QA Checklist

Search the public site for:

- "pending"
- "TBA"
- "lorem"
- "placeholder"
- "coming soon"
- "test"
- "sample"
- repeated event blocks
- unsupported claims like "thousands"

Fix or remove anything that weakens trust.

## Accessibility And Readability Checks

Check:

- Pages have one clear H1.
- Buttons have clear text.
- Links are distinguishable.
- Text contrast is readable.
- Images have alt text.
- Forms have labels.
- Navigation works by keyboard where practical.

## Acceptance Criteria

Phase 7 is complete when:

- Core public pages work on mobile and desktop.
- No major layout overlap or clipping remains.
- Header and footer links are accurate.
- Blog and event links work.
- No obvious placeholder text remains.
- Empty pages are hidden or noindexed.
- Public pages are readable without login.

## Agent Prompt

Use this prompt with Codex or Claude:

```txt
You are working on the HelloRun codebase. Complete Phase 7 of the AdSense cleanup.

Goal: QA the public site for mobile layout, desktop layout, navigation, broken links, placeholder content, and readability issues.

Tasks:
1. Inspect and run the project locally.
2. Test core public pages: homepage, events, event detail, blog, blog detail, about, how-it-works, FAQ, contact, privacy, terms.
3. Test mobile widths around 360px, 390px, 430px, and 768px.
4. Test desktop layout around 1366px and 1440px.
5. Fix broken links, layout overlap, clipped content, broken images, and confusing navigation.
6. Search for placeholder or unfinished words such as pending, TBA, lorem, placeholder, coming soon, test, and sample.
7. Remove inflated claims unless supported by actual platform data.
8. Keep private utility pages out of public navigation.

Acceptance checks:
- Public pages are readable on mobile and desktop.
- No broken public navigation links remain.
- No placeholder or unfinished labels appear publicly.
- Event and blog cards work.
- Public content is accessible without login.

Report what was tested, what was fixed, and any remaining risks.
```
