# Phase 5 - Blog Content System And Editorial Structure

Status: complete. Implemented in PR #10 and merged to `main`.

## Objective

Prepare the HelloRun blog so it can support consistent, useful, original content.

This phase focuses on structure, categories, metadata, internal links, author information, and content quality rules.

## Pages And Features To Inspect

- `/blog`
- `/blog/[slug]`
- blog post data source
- author fields
- category fields
- tags
- metadata
- related posts
- blog cards on homepage
- blog cards on blog index

## Blog Categories

Use these categories unless the existing project already has a better structure:

- Runner Guides
- Organizer Guides
- Training Tips
- Virtual Run Rules
- Event Recaps
- Running Apps
- Community Stories

## Blog Post Metadata

Each post should support:

- Title
- Slug
- Description
- Category
- Author
- Published date
- Updated date
- Reading time
- Featured image if available
- Tags
- SEO title if separate
- SEO description if separate

## Blog Index Requirements

The blog index should:

- Show categories or category filters.
- Show post title, excerpt, category, date, and reading time.
- Avoid empty category pages.
- Avoid showing placeholder posts.
- Link to core resources such as How It Works and FAQ.

## Blog Detail Requirements

Each blog post should:

- Have one clear H1.
- Show author, date, and category.
- Include a short intro.
- Use meaningful headings.
- Include internal links.
- Include practical examples.
- Avoid generic filler.
- End with a useful next step.

## Internal Linking Rules

Every blog post should link to at least two relevant internal pages:

- `/events`
- `/how-it-works`
- `/faq`
- `/contact`
- related blog posts
- specific event pages when relevant

## Editorial Quality Rules

Each post should answer:

- Who is this for?
- What problem does it solve?
- What should the reader do next?
- What examples make this more useful?
- Does it contain HelloRun-specific context?

Avoid:

- Generic AI-style advice
- Unsupported medical claims
- Copied content
- Thin posts under 500 words
- Posts made only to target keywords
- Repeating the same introduction across posts

## Suggested Blog Enhancements

Add if feasible within the current codebase:

- Author bio component
- Related posts section
- Category badges
- Last updated date
- Table of contents for long posts
- "Helpful links" section at the end of posts

## Acceptance Criteria

Phase 5 is complete when:

- Blog index is organized and useful.
- Blog posts have clear metadata.
- Categories exist and are visible.
- Author identity is visible.
- Related/internal links are supported.
- Placeholder posts are not visible.
- Empty categories are not promoted.

## Agent Prompt

Use this prompt with Codex or Claude:

```txt
You are working on the HelloRun codebase. Complete Phase 5 of the AdSense cleanup.

Goal: Improve the blog structure so HelloRun can publish useful, organized, original running content for AdSense review.

Tasks:
1. Inspect the blog data model, blog index, blog detail page, homepage blog cards, and metadata patterns.
2. Add or improve categories: Runner Guides, Organizer Guides, Training Tips, Virtual Run Rules, Event Recaps, Running Apps, Community Stories.
3. Ensure each post supports title, slug, description, category, author, published date, updated date, reading time, tags, and metadata.
4. Improve blog index cards and category display.
5. Add author bio support if feasible.
6. Add related posts or helpful internal links if feasible.
7. Hide placeholder posts and empty category pages.
8. Keep the existing design style.

Acceptance checks:
- Blog index is organized.
- Blog detail pages show useful metadata.
- Author identity is visible.
- Internal links are supported.
- No placeholder posts appear publicly.

Report the files changed and any fields that still need content entry.
```
