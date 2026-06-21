# Hellorun Structured Blog Composer - Action Plan

## 1. Feature Overview

### Feature Name
Structured Blog Composer

### Purpose
Create a guided blog-writing feature for Hellorun that allows non-technical users to publish clean, readable, and visually consistent blog posts without needing HTML, CSS, Markdown, or design knowledge.

### Core Principle
Users control the content.

Hellorun controls the presentation.

This means writers focus on what they want to say, while the app ensures the final deployed page remains professional, consistent, and on-brand.

---

## 2. Main Product Direction

Hellorun should avoid a completely open rich text editor as the default writing experience.

Instead, the blog system should use a guided, structured writing flow where users either:

- fill in predefined templates
- add approved content blocks one by one

This approach is better suited for non-technical users because it:

- reduces confusion
- prevents broken layouts
- keeps blog pages visually consistent
- makes moderation easier
- improves content quality
- supports SEO structure more effectively

---

## 3. Recommended Writing Model

### Recommended Approach
A template-based composer with limited content blocks.

### Why this fits Hellorun
This model gives enough freedom for expression while keeping layout control inside the system.

It is more practical than giving users a totally blank editor because most users do not want to design pages. They want a simple and guided way to tell their story.

---

## 4. User Experience Goal

The blog-writing experience should feel simple, guided, and friendly.

A non-technical user should be able to:

- create a blog title
- upload a cover image
- choose a category or tags
- fill in structured sections
- preview the post
- save a draft
- submit for review or publish

The interface should feel closer to filling out a guided story form than editing raw webpage content.

---

## 5. Writing Interface Structure

The blog creation screen should include the following sections:

### Basic Blog Information
- Blog title
- Short excerpt or summary
- Cover image
- Category
- Tags
- Slug

### Main Content Composer
The user should create the article using structured content units such as:

- section heading
- paragraph
- bullet list
- numbered list
- quote
- image
- divider
- closing note or call to action

### Action Controls
- Save draft
- Preview post
- Submit for review
- Publish

---

## 6. Recommended Templates for Hellorun

Hellorun can start with predefined post templates so users do not need to begin from a blank page.

### Template 1: Race Recap
Suggested fields:

- Event name
- Date
- Location
- Intro
- My run experience
- Highlights
- Challenges
- Photos
- Final thoughts

### Template 2: Training Journal
Suggested fields:

- Title
- Workout summary
- What went well
- What felt hard
- Lesson learned
- Next goal

### Template 3: Motivation Post
Suggested fields:

- Title
- Opening hook
- Main message
- Bullet tips
- Closing line

### Template 4: Gear or Event Reflection
Suggested fields:

- Title
- Context
- What was used or experienced
- Key observations
- Pros or lessons learned
- Final recommendation or conclusion

---

## 7. Block Types to Support

To keep the system clean and manageable, Hellorun should allow only approved content blocks.

### Initial block types
- Heading
- Paragraph
- Bullet List
- Numbered List
- Quote
- Image
- Divider
- Closing Section

### Optional future block types
- Gallery
- Embedded run stats
- Route map block
- Highlight card
- Callout box
- Related event reference

---

## 8. Formatting Controls to Allow

The content editor should stay simple.

### Allow
- Heading 2
- Heading 3
- Bold
- Italic
- Bullet list
- Numbered list
- Quote
- Link
- Image
- Divider

### Avoid
- Raw HTML editing
- Too many colours
- Too many font choices
- Too many heading levels
- Arbitrary spacing controls
- Full page-builder freedom

This keeps content clean and reduces the chance of inconsistent public pages.

---

## 9. Guidance Pattern for Users

Tooltips should be included, but they should not be the only source of guidance.

### Best UX rule
Use helper text for what the user must know now.

Use tooltips for extra help.

### Recommended guidance pattern
- visible helper text under each important field
- tooltip icon for optional extra explanation
- placeholder examples for tone or format
- inline validation for mistakes
- live preview for final output

### Example field guidance

#### Section Title
- Helper text: Write a short heading for this section.
- Tooltip: Good headings are usually 3 to 8 words.

#### Paragraph Content
- Helper text: Write 2 to 4 sentences about one clear idea.
- Tooltip: Keep this part focused and easy to scan.

#### Bullet List
- Helper text: Add key takeaways or tips.
- Tooltip: Try 3 to 5 bullets for readability.

#### Cover Image
- Helper text: Upload a clear image related to the post.
- Tooltip: Landscape images usually display better on blog pages.

---

## 10. Data Structure Direction

Hellorun should store blog content in structured form.

Do not rely on uncontrolled raw formatting as the main content source.

### Suggested post fields
- title
- excerpt
- coverImage
- category
- tags
- slug
- seoTitle
- metaDescription
- coverImageAlt
- contentBlocks
- status
- authorId
- createdAt
- updatedAt

### Suggested content block structure
Each block can contain:

- type
- order
- content
- metadata

### Example block types
- heading
- paragraph
- bullets
- numberedList
- quote
- image
- divider
- closing

This structure makes content easier to render, validate, moderate, and reuse later.

---

## 11. Rendering Strategy

When a user saves or publishes a post, Hellorun should render the final page using its own design system.

### Rendering principle
The app should decide:

- font styles
- spacing
- image sizes
- heading sizes
- quote styling
- layout width
- mobile responsiveness

The user should provide the content, but not full design control.

This ensures every blog post looks professional even if the writer is not technical.

---

## 12. Publishing Workflow

A structured publishing workflow should be used.

### Recommended flow
1. Draft
2. Preview
3. Submit for review
4. Admin approval
5. Publish

### Optional future enhancement
Allow trusted users to publish directly after meeting certain criteria.

Examples:
- approved contributor status
- a minimum number of accepted posts
- no moderation flags in previous submissions

---

## 13. Moderation and Safety Plan

Before any post is made public, Hellorun should validate and review the content.

### Minimum moderation checks
- required fields completed
- content blocks are valid
- uploaded images are acceptable
- links are safe
- formatting is within allowed structure

### Recommended controls
- admin review queue
- draft and revision history
- status labels such as draft, pending, approved, published, rejected
- content reporting feature for future community growth

---

## 14. SEO Plan for Blog Posts

The blog system should support strong page-level SEO from the start.

### Recommended SEO fields
- SEO title
- Meta description
- Slug
- Cover image alt text
- Category
- Tags

### SEO benefit
This helps each post:

- have a clearer search preview
- support keyword targeting
- improve discoverability
- stay consistent across the platform

---

## 15. Technical Direction Options

Hellorun can implement the frontend writing experience in one of the following ways.

### Option A: Template-based custom form builder
Best when strict control is the top priority.

**Pros**
- easiest for beginners
- strongest consistency
- easiest to validate
- easiest to moderate

**Cons**
- less flexible for advanced writers

### Option B: Restricted block editor
Best when some flexibility is needed without losing structure.

**Pros**
- more natural writing flow
- still controlled
- reusable for different templates

**Cons**
- slightly more complex to build

### Best fit for Hellorun
Start with a template-based composer or restricted block editor.

Do not start with a fully open editor.

---

## 16. Suggested Product Positioning

This feature can be positioned internally and in documentation as:

- Structured Blog Composer
- Guided Blog Builder
- Template-Based Blog Editor

### Recommended final name
Structured Blog Composer

This name sounds clear, modern, and product-ready.

---

## 17. Phase-by-Phase Development Plan

### Phase 1: Scope Definition
Define the rules and feature boundaries.

Tasks:
- choose template-only or template-plus-block model
- list allowed block types
- define publishing workflow
- define roles and permissions

### Phase 2: UX and UI Design
Design the writing interface.

Tasks:
- create blog creation page layout
- design field helper text
- add tooltips
- add placeholders
- design preview mode
- design validation messages

### Phase 3: Data Model Design
Create the post and content block structure.

Tasks:
- define post fields
- define content block schema
- define statuses
- define tag and category relationships

### Phase 4: Frontend Composer Development
Build the writing experience.

Tasks:
- create title, excerpt, and cover image inputs
- create template selector
- create block input controls
- create add, remove, and reorder block actions
- create preview mode

### Phase 5: Rendering and Public Page Integration
Build the final public display.

Tasks:
- map each block type to a styled frontend component
- apply Hellorun typography and spacing
- ensure responsive rendering
- handle image display rules

### Phase 6: Moderation and Workflow Controls
Build the admin and approval flow.

Tasks:
- save drafts
- submit posts for review
- review pending content
- approve or reject posts
- manage post status changes

### Phase 7: SEO and Quality Enhancements
Add quality and discoverability improvements.

Tasks:
- add SEO fields
- add slug generator
- add cover image alt text
- calculate estimated reading time
- add related posts logic

### Phase 8: Future Improvements
Expand the feature after the core version is stable.

Possible future additions:
- reusable personal templates
- featured post support
- scheduled publishing
- author profile blocks
- gallery blocks
- route map embedding
- event linking
- running stats blocks

---

## 18. Final Recommendation

Hellorun should build the blog feature as a guided, structured content system.

It should not begin as a fully open freeform editor.

### Final product recommendation
Build:

- a Structured Blog Composer
- predefined templates
- approved content blocks only
- visible helper text
- optional tooltips
- preview before publish
- consistent frontend rendering
- moderation before public release

This gives users enough freedom to write meaningful content while protecting the quality and consistency of the Hellorun platform.

---

## 19. Short Internal Summary

### What Hellorun is building
A guided blog feature for non-technical users.

### What users do
They fill in templates or approved content blocks.

### What Hellorun controls
The visual layout, styling, validation, moderation, and final public rendering.

### Why this is the right direction
It is easier to use, easier to maintain, safer to moderate, and more professional for the public site.
