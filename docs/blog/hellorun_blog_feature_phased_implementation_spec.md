# HelloRun Blog Feature - Phased Implementation Specification

## Purpose

This document refocuses the blog/content publishing system for HelloRun first.

The goal is to implement a safe, SEO-friendly, moderated blog feature that supports running-related content while keeping the system simple enough to build in phases.

HelloUniversity can reuse the same pattern later, but this specification only targets HelloRun implementation.

---

## 1. Product Direction

### Main Goal

Build a HelloRun blog system where registered users can write running-related posts, but only admin-approved posts become public.

### Publishing Principle

- Anyone with a registered HelloRun account can create a blog draft.
- Authors can submit posts for review.
- Admins approve, reject, archive, feature, or moderate posts.
- Only published posts appear publicly.
- Published content must follow HelloRun quality, safety, SEO, and legal standards.

### Primary Use Cases

HelloRun blog content should support:

- Running guides
- Virtual run guides
- Race preparation tips
- Event announcements
- Recovery and injury-prevention articles
- Running community stories
- Organizer education content
- Baguio and Philippine running-related SEO content

### Examples of Blog Topics

- How to prepare for your first 5K virtual run
- How to submit a valid running proof in HelloRun
- Common reasons run proofs get flagged
- Beginner 10K training guide
- Running in Baguio: what new runners should know
- How organisers can manage virtual run submissions
- Recovery tips after a long run
- What makes a fair virtual run leaderboard

---

## 2. Implementation Direction

### Recommended Approach

Implement the blog as a HelloRun module first.

Recommended module name:

```txt
/modules/blog
```

Recommended folder structure:

```txt
/modules/blog
  blog.model.js
  blog.revision.model.js
  blog.comment.model.js
  blog.like.model.js
  blog.view.model.js
  blog.controller.js
  blog.admin.controller.js
  blog.author.controller.js
  blog.public.controller.js
  blog.service.js
  blog.validation.js
  blog.policy.js
  blog.seo.js
  blog.routes.js
  blog.admin.routes.js
  blog.author.routes.js
  blog.public.routes.js
```

Recommended view structure:

```txt
/views/admin/blog
  index.ejs
  review.ejs
  preview.ejs
  revisions.ejs

/views/author/blog
  dashboard.ejs
  editor.ejs
  preview.ejs

/views/public/blog
  index.ejs
  post.ejs
  category.ejs
  tag.ejs
```

Recommended public routes:

```txt
/blog
/blog/:slug
/blog/category/:categorySlug
/blog/tag/:tagSlug
```

Recommended author routes:

```txt
/my/blogs
/my/blogs/new
/my/blogs/:id/edit
/my/blogs/:id/preview
/my/blogs/:id/submit
```

Recommended admin routes:

```txt
/admin/blog
/admin/blog/pending
/admin/blog/:id/review
/admin/blog/:id/approve
/admin/blog/:id/reject
/admin/blog/:id/archive
/admin/blog/:id/feature
/admin/blog/:id/revisions
```

---

## 3. Roles and Permissions

### Admin

Admins can:

- View all blog posts by status
- Review pending posts
- Approve posts
- Reject posts with a required reason
- Edit post content and metadata from the review page
- Feature or unfeature posts
- Archive posts
- Restore archived posts
- Soft-delete posts
- Moderate comments
- View revision history
- View blog analytics

### Author

All registered users may be treated as authors in Phase A, unless HelloRun later chooses a verified-author model.

Authors can:

- Create blog drafts
- Edit own drafts
- Submit posts for review
- View own pending posts
- View rejection reasons
- Edit rejected posts
- Resubmit rejected posts
- Delete own draft or rejected post
- View simple analytics for own published posts

Authors cannot:

- Publish directly
- Edit another author’s post
- Delete published posts directly
- Change featured status
- Override admin rejection
- Moderate comments

### Public User

Public users can:

- View published posts
- Search and filter published posts
- Read comments

Logged-in users can:

- Like posts
- Comment on posts
- Report posts or comments in a later phase

---

## 4. Blog Status Workflow

### Status Values

Use these statuses:

```txt
draft
pending
published
rejected
archived
```


## Scheduled Publishing (Phase F)

### New Status

Add a new status:

```txt
scheduled
```

### Scheduled Publishing Workflow

- Authors or admins can set a post to 'scheduled' and specify a future `publishedAt` date.
- Posts with `status = scheduled` and `publishedAt > now` are not public.
- A background script (`publish-scheduled-blogs.js`) runs periodically (e.g., every 5 minutes via cron) and auto-publishes posts where `status = scheduled` and `publishedAt <= now`.
- When published, the post's status is set to 'published', and `approvedAt` is set to the publish time.
- All public blog queries already filter for `status = published` and `publishedAt <= now`.

### Author/Admin UI

- Author and admin dashboards should allow setting a future publish date and choosing 'scheduled' status.
- Scheduled posts are visible to their author and admins, but not to the public until published.

### Script Example

See: `src/scripts/publish-scheduled-blogs.js`

This script should be run on a schedule (e.g., with cron or a task runner) to process scheduled posts.

### Acceptance Criteria

- Authors/admins can schedule posts for future publication.
- Scheduled posts are auto-published at the correct time.
- No scheduled post is visible to the public before its `publishedAt`.
- All public blog queries remain correct.

---

### Allowed Status Transitions

```txt
draft -> pending
pending -> published
pending -> rejected
rejected -> pending
published -> archived
archived -> published
```

### Author Edit Rules

| Status | Author Can Edit? | Notes |
|---|---:|---|
| draft | Yes | Normal editing allowed |
| pending | Limited | Allow editing only if system resets status to draft, or lock while under review |
| rejected | Yes | Author can revise and resubmit |
| published | Not directly | Use revision workflow in later phase |
| archived | No | Admin-controlled |

Recommended MVP rule:

- Authors can edit drafts and rejected posts.
- Pending posts are locked while under admin review.
- If the author wants to change a pending post, they must withdraw it back to draft.

This is simpler and safer than allowing active edits while admins are reviewing.

### Admin Review Rules

Admins can approve or reject pending posts.

When approving, store:

```txt
approvedAt
approvedBy
publishedAt
```

When rejecting, require and store:

```txt
rejectionReason
rejectedAt
rejectedBy
```

### Moderation SLA

Product target:

```txt
Pending posts should be reviewed within 48 hours.
```

Admin dashboard should show:

```txt
submittedAt
reviewedAt
reviewer
reviewAge
```

---

## 5. Content Model

### Required Fields

```txt
authorId
title
slug
category
coverImageUrl
contentHtml
status
```

### Optional Fields

```txt
excerpt
tags[]
galleryImageUrls[]
seoTitle
seoDescription
ogImageUrl
featured
readingTime
```

### Suggested Blog Schema

```js
{
  authorId: ObjectId,

  title: String,
  slug: String,
  excerpt: String,

  contentHtml: String,
  contentRaw: String,

  coverImageUrl: String,
  galleryImageUrls: [String],

  category: String,
  customCategory: String,
  tags: [String],

  status: {
    type: String,
    enum: ['draft', 'pending', 'published', 'rejected', 'archived'],
    default: 'draft'
  },

  featured: {
    type: Boolean,
    default: false
  },

  views: {
    type: Number,
    default: 0
  },

  likesCount: {
    type: Number,
    default: 0
  },

  commentsCount: {
    type: Number,
    default: 0
  },

  readingTime: Number,

  seoTitle: String,
  seoDescription: String,
  ogImageUrl: String,
  canonicalUrl: String,

  submittedAt: Date,

  approvedAt: Date,
  approvedBy: ObjectId,

  rejectedAt: Date,
  rejectedBy: ObjectId,
  rejectionReason: String,

  archivedAt: Date,
  archivedBy: ObjectId,
  archiveReason: String,

  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedAt: Date,
  deletedBy: ObjectId,

  publishedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 6. Category Policy

### MVP Fixed Categories

Use fixed categories first.

```txt
Training
Nutrition
Gear
Motivation
Race Tips
Injury Prevention
General
Travel
Mental Health
Community
Personal Stories
Organizer Guide
Virtual Run Guide
Other
```

### Category Rules

- Category is required.
- Category must match the fixed enum list.
- If category is `Other`, `customCategory` is required.
- `customCategory` must be 2 to 80 characters.
- Public category pages should use SEO-safe category slugs.

### Suggested Category Slugs

| Category | Slug |
|---|---|
| Training | training |
| Nutrition | nutrition |
| Gear | gear |
| Motivation | motivation |
| Race Tips | race-tips |
| Injury Prevention | injury-prevention |
| General | general |
| Travel | travel |
| Mental Health | mental-health |
| Community | community |
| Personal Stories | personal-stories |
| Organizer Guide | organizer-guide |
| Virtual Run Guide | virtual-run-guide |
| Other | other |

---

## 7. Rich Text Editor Policy

### Editor Choice

Use a simple WYSIWYG or markdown editor with preview.

Recommended MVP:

- Store sanitized `contentHtml`
- Optionally store `contentRaw` for future editor migration

### Allowed Formatting

Allow only:

- Headings
- Paragraphs
- Bold
- Italic
- Ordered lists
- Unordered lists
- Blockquotes
- Links
- Images only through approved upload flow

### Disallowed Content

Strip or reject:

- Script tags
- Style tags
- Inline JavaScript
- Unsafe attributes
- Embedded iframes
- External tracking scripts
- Arbitrary HTML layouts
- Forms
- Hidden inputs
- Auto-playing media

### Sanitization Rule

Server-side sanitization is required before saving.

Do not rely only on client-side sanitization.

Recommended package options:

```txt
sanitize-html
DOMPurify with jsdom
```

---

## 8. Image Policy

### Cover Image

MVP requires one cover image.

Rules:

```txt
file types: image/jpeg, image/png, image/webp
max size: 5MB
required dimensions: recommend at least 1200x630
storage path: /blog/covers/
```

### Gallery Images

Gallery images should be Phase B, not MVP.

Rules:

```txt
max images: 3
file types: image/jpeg, image/png, image/webp
max size per image: 5MB
storage path: /blog/gallery/
```

### Image Optimization

Implement:

- Compression
- Web-friendly sizes
- Lazy loading
- Meaningful alt text
- Default OG image fallback to cover image

### R2 Storage Direction

If HelloRun uses Cloudflare R2, use predictable storage keys:

```txt
blog/covers/{postId}/{filename}
blog/gallery/{postId}/{filename}
```

---

## 9. Public Blog Experience

### Blog List Page

Route:

```txt
/blog
```

Show:

- Featured posts
- Latest posts
- Category filter
- Tag filter
- Search by title, excerpt, and tags
- Sort by latest or popular
- Pagination

Only show posts where:

```txt
status = published
isDeleted = false
publishedAt <= now
```

### Blog Post Page

Route:

```txt
/blog/:slug
```

Show:

- Breadcrumb
- Category
- Title
- Excerpt
- Author info
- Publish date
- Reading time
- View count
- Cover image
- Content body
- Tags
- Share links
- Like button
- Comments section
- Related posts

### Related Posts Logic

MVP related posts can be simple:

1. Same category
2. Same tags
3. Exclude current post
4. Sort by latest
5. Limit to 3 posts

---

## 10. Slug Policy

### MVP Slug Rules

- Slug is auto-generated from title on first save.
- Slug must be unique.
- Slug is immutable after publishing.
- Draft slug can still change if the title changes.
- Published slug should not change in Phase A.

### Unique Slug Examples

```txt
how-to-prepare-for-your-first-5k
how-to-prepare-for-your-first-5k-2
how-to-prepare-for-your-first-5k-3
```

### Future Redirect History

Do not implement redirect history in MVP.

For a later phase, add:

```txt
previousSlugs[]
redirectFromOldSlugToCurrentSlug
```

---

## 11. View Count Policy

### MVP View Counting

Count one view per user or anonymous visitor per post per 24-hour window.

For logged-in users:

```txt
blogId + userId + dateWindow
```

For anonymous users:

```txt
blogId + ipHash + dateWindow
```

Do not count views from:

- Admin preview routes
- Author preview routes
- Bot/crawler requests where detectable

### Suggested Blog View Schema

```js
{
  blogId: ObjectId,
  userId: ObjectId,
  ipHash: String,
  userAgentHash: String,
  windowStart: Date,
  createdAt: Date
}
```

Recommended index:

```txt
blogId + userId + windowStart
blogId + ipHash + windowStart
```

---

## 12. Comments System

### Phase Recommendation

Do not include comments in Phase A.

Add comments in Phase A.1 or Phase B after the core blog publishing flow is stable.

### Comment Rules

- Anyone can read comments.
- Logged-in users can comment.
- Comments are text-only.
- HTML is not allowed.
- Max length should be enforced.
- Content must be sanitized before saving.

### Comment Statuses

```txt
active
removed
pending_review
```

Recommended MVP for comments:

```txt
active
removed
```

### Suggested Comment Schema

```js
{
  blogId: ObjectId,
  authorId: ObjectId,
  content: String,
  status: {
    type: String,
    enum: ['active', 'removed'],
    default: 'active'
  },
  removedAt: Date,
  removedBy: ObjectId,
  removeReason: String,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 13. Likes System

### Phase Recommendation

Add likes after public blog pages are stable.

### Like Rules

- Only logged-in users can like posts.
- One like per user per post.
- Clicking again may unlike the post.
- Store likes separately for integrity.
- Maintain `likesCount` on Blog for fast display.

### Suggested Like Schema

```js
{
  blogId: ObjectId,
  userId: ObjectId,
  createdAt: Date
}
```

Required unique index:

```txt
blogId + userId
```

---

## 14. Revision Workflow

### Current Implementation Note

The previous draft notes that admin inline edit with autosave is already implemented on the admin review page, and blog revision tracking is implemented through `BlogRevision` using before/after and changed fields.

Keep that direction, but phase it carefully.

### Phase A Revision Scope

For MVP:

- Track admin edits during review.
- Track status changes.
- Track approval and rejection actions.

### Published Edit Revision Flow

Add this in Phase B, not Phase A.

Flow:

1. Author clicks `Update Published Post`.
2. System creates a draft revision linked to the published post.
3. Original published post remains public.
4. Author edits revision.
5. Author submits revision for review.
6. Admin approves or rejects revision.
7. Approved revision replaces the public version.
8. Revision history records what changed.

### Suggested Blog Revision Schema

```js
{
  blogId: ObjectId,
  revisionOf: ObjectId,
  changedBy: ObjectId,
  changeType: String,
  before: Object,
  after: Object,
  changedFields: [String],
  reason: String,
  createdAt: Date
}
```

Suggested `changeType` values:

```txt
create
edit
submit
approve
reject
archive
restore
feature
unfeature
published_revision
```

---

## 15. SEO Requirements

### Required SEO Fields

```txt
seoTitle
seoDescription
canonicalUrl
ogImageUrl
```

### SEO Fallback Rules

If `seoTitle` is empty:

```txt
Use title
```

If `seoDescription` is empty:

```txt
Use excerpt
If excerpt is empty, generate from stripped contentHtml
```

If `ogImageUrl` is empty:

```txt
Use coverImageUrl
```

### Public Metadata

Each published post page should render:

- `<title>`
- meta description
- canonical URL
- Open Graph title
- Open Graph description
- Open Graph image
- Twitter card metadata
- Article structured data

### Sitemap

Include only:

```txt
published posts
not deleted
not archived
```

Sitemap entry should include:

```txt
/blog/:slug
lastmod = updatedAt or publishedAt
```

---

## 16. Admin Review Dashboard

### Admin Blog List

Route:

```txt
/admin/blog
```

Tabs:

```txt
All
Pending
Published
Rejected
Drafts
Archived
Featured
Deleted
```

Show per post:

- Title
- Author
- Category
- Status
- Submitted date
- Published date
- Views
- Likes
- Comments
- Featured status
- Quick actions

### Admin Review Page

Route:

```txt
/admin/blog/:id/review
```

Show:

- Full preview
- Editable title
- Editable excerpt
- Editable category
- Editable tags
- Editable SEO title
- Editable SEO description
- Cover image preview
- Content preview
- Quality checklist
- Approve button
- Reject button
- Revision history link

### Rejection Modal

Required input:

```txt
rejectionReason
```

Optional quick rejection templates:

```txt
The post is not clearly related to running or HelloRun.
The post needs clearer structure and more useful details.
The post contains unsupported health or medical claims.
The post appears promotional without enough reader value.
The post may contain copyrighted or copied content.
The post needs grammar, clarity, or formatting improvements.
```

### Admin Quality Checklist

Admin should check:

- Is the topic running-related?
- Is the content useful to runners or organisers?
- Is the content original?
- Is it free from spam or pure promotion?
- Does it avoid unsafe medical claims?
- Is the formatting readable?
- Is the title clear?
- Is the cover image appropriate?
- Are SEO fields acceptable?

---

## 17. Author Dashboard

### My Blogs Page

Route:

```txt
/my/blogs
```

Tabs:

```txt
Drafts
Pending
Published
Rejected
Archived
```

Show per post:

- Title
- Status badge
- Category
- Created date
- Updated date
- Submitted date
- Published date
- Rejection reason, if rejected
- Views
- Likes
- Comments
- Actions

### Author Actions

Draft:

```txt
Edit
Preview
Submit for Review
Delete
```

Pending:

```txt
Preview
Withdraw to Draft
```

Rejected:

```txt
View Rejection Reason
Edit
Preview
Resubmit
Delete
```

Published:

```txt
View Public Post
View Analytics
Request Update / Create Revision, Phase B
```

Archived:

```txt
View only
```

---

## 18. Security and Abuse Prevention

### Required Security Controls

- Require authentication for author actions.
- Require admin role for admin actions.
- Validate ownership for author edit/delete/submit routes.
- Sanitize blog content server-side.
- Sanitize comments server-side.
- Validate upload MIME type and file extension.
- Enforce upload size limits.
- Rate limit blog submissions.
- Rate limit comments.
- Rate limit likes.
- Add CSRF protection for state-changing routes if the app uses cookie sessions.

### Anti-Spam Checks

MVP checks:

- Limit number of links per post.
- Reject empty or very short posts.
- Limit repeated characters.
- Limit excessive tags.
- Prevent duplicate title by same author within a short period.

Future checks:

- Report post
- Report comment
- Admin spam queue
- Plagiarism check
- Trust score for authors
- Verified runner writer badge

---

## 19. Legal and Policy Updates

Update HelloRun Terms and Conditions to include:

- Authors retain ownership of their submitted content.
- Authors grant HelloRun permission to publish, display, edit, format, archive, and remove submitted content.
- Authors must not submit copyrighted content they do not own or have permission to use.
- Authors must not submit harmful medical advice.
- Authors must not submit defamatory, hateful, misleading, or illegal content.
- HelloRun may moderate, reject, archive, or delete content that violates platform rules.

Update Privacy Policy to mention:

- Public author display name may appear on published posts.
- Blog interactions such as likes, comments, and views may be stored.
- Admin moderation actions may be logged.

---

## 20. Performance Requirements

### Public Pages

Must support:

- Pagination
- Lazy-loaded images
- Compressed images
- Cached public post queries where practical
- Limited related posts query
- Indexed listing queries

### Admin Pages

Must support:

- Pagination by status
- Search by title, author, category, and tag
- Fast pending review queue

### Content Limits

Recommended limits:

```txt
title: 10 to 120 characters
excerpt: max 220 characters
contentHtml: max 50,000 characters for MVP
tags: max 8 tags
tag length: 2 to 30 characters
seoTitle: max 60 characters
seoDescription: max 160 characters
rejectionReason: 10 to 1,000 characters
comment: 1 to 1,000 characters
```

---

## 21. Required Indexes

### Blog Indexes

```txt
slug unique
status + publishedAt
status + featured + publishedAt
authorId + createdAt
authorId + status + updatedAt
category + publishedAt
tags + publishedAt
isDeleted + status
```

### Comment Indexes

```txt
blogId + createdAt
authorId + createdAt
status + createdAt
```

### Like Indexes

```txt
blogId + userId unique
blogId + createdAt
userId + createdAt
```

### View Indexes

```txt
blogId + userId + windowStart
blogId + ipHash + windowStart
blogId + createdAt
```

### Revision Indexes

```txt
blogId + createdAt
changedBy + createdAt
changeType + createdAt
```

---

# 22. Comprehensive Phased Implementation Plan

## Phase 0 - Audit and Preparation

### Goal

Prepare the current HelloRun codebase before adding or expanding the blog feature.

### Scope

- Check existing blog-related files.
- Identify current models, routes, controllers, and views.
- Confirm whether `BlogRevision` already exists.
- Confirm whether admin autosave already works.
- Confirm current authentication and role middleware.
- Confirm current upload handling and Cloudflare R2 integration.
- Confirm current SEO partials and sitemap implementation.

### Tasks

1. Search the codebase for:

```txt
Blog
BlogPost
BlogRevision
blog.routes
blog.controller
/admin/blog
/blog
```

2. Document current implementation status:

```txt
Implemented
Partially implemented
Missing
Needs refactor
```

3. Identify reusable existing utilities:

```txt
auth middleware
admin middleware
slug helper
upload helper
R2 storage helper
SEO partials
sitemap generator
flash messages
pagination helper
validation helper
sanitize helper
```

4. Create or update a blog implementation checklist.

### Deliverables

- Codebase audit summary
- Blog route map
- Existing file map
- Missing feature checklist

### Definition of Done

- Current blog state is documented.
- Existing reusable utilities are identified.
- No implementation changes yet unless required for safe setup.

---

## Phase A - Blog MVP Core Publishing

### Goal

Create the minimum complete blog publishing workflow.

Authors can create drafts, submit for review, and admins can approve or reject posts. Public users can read approved posts.

### Included Features

- Blog model
- Blog statuses
- Slug generation
- Author create/edit draft
- Author submit for review
- Admin pending review queue
- Admin approve/reject
- Public blog list
- Public blog post page
- Cover image support
- Server-side HTML sanitization
- Basic SEO fields
- Required indexes

### Excluded from Phase A

- Comments
- Likes
- Gallery images
- Trending posts
- Top writers
- Published edit revisions
- Advanced analytics
- Report content flow
- Scheduled publishing

### Backend Tasks

1. Create or update Blog model.
2. Add required schema fields.
3. Add indexes.
4. Add blog validation.
5. Add slug generation helper.
6. Add server-side sanitization.
7. Add reading time calculation.
8. Add author ownership checks.
9. Add status transition policy.
10. Add admin review service methods.

### Author Route Tasks

Implement:

```txt
GET /my/blogs
GET /my/blogs/new
POST /my/blogs
GET /my/blogs/:id/edit
POST /my/blogs/:id
POST /my/blogs/:id/submit
POST /my/blogs/:id/withdraw
POST /my/blogs/:id/delete
```

### Admin Route Tasks

Implement:

```txt
GET /admin/blog
GET /admin/blog/pending
GET /admin/blog/:id/review
POST /admin/blog/:id/approve
POST /admin/blog/:id/reject
```

### Public Route Tasks

Implement:

```txt
GET /blog
GET /blog/:slug
```

### View Tasks

Create:

```txt
/views/author/blog/dashboard.ejs
/views/author/blog/editor.ejs
/views/author/blog/preview.ejs
/views/admin/blog/index.ejs
/views/admin/blog/review.ejs
/views/public/blog/index.ejs
/views/public/blog/post.ejs
```

### Validation Rules

Required:

```txt
title
category
coverImageUrl
contentHtml
```

Recommended limits:

```txt
title: 10 to 120 characters
excerpt: max 220 characters
contentHtml: max 50,000 characters
tags: max 8
seoTitle: max 60 characters
seoDescription: max 160 characters
```

### Definition of Done

- Author can create a draft.
- Author can edit own draft.
- Author can submit draft for review.
- Pending post appears in admin queue.
- Admin can approve a post.
- Admin can reject a post with reason.
- Rejected post shows reason to author.
- Only published posts appear on `/blog`.
- `/blog/:slug` only shows published posts.
- HTML is sanitized server-side.
- Slugs are unique.
- Cover image validation works.
- Basic SEO metadata renders.

---

## Phase A.1 - Admin Review Improvements and Audit Trail

### Goal

Improve admin review usability and accountability without adding public interaction features yet.

### Included Features

- Admin inline metadata edits
- Debounced autosave, if already aligned with current implementation
- Blog revision records for admin changes
- Admin quality checklist
- Better rejection templates
- Review age indicator
- Featured/unfeatured control
- Archive/restore control

### Backend Tasks

1. Add BlogRevision model if not already stable.
2. Log admin edits.
3. Log status changes.
4. Log approve/reject/archive/restore actions.
5. Add featured toggle.
6. Add archive and restore service methods.

### Admin Route Tasks

Implement:

```txt
POST /admin/blog/:id/autosave
POST /admin/blog/:id/feature
POST /admin/blog/:id/unfeature
POST /admin/blog/:id/archive
POST /admin/blog/:id/restore
GET /admin/blog/:id/revisions
```

### View Tasks

Update admin review page with:

- Autosave indicator
- Changed field notice
- Quality checklist
- Reject reason templates
- Revision history panel
- Feature toggle
- Archive button

### Definition of Done

- Admin edits are saved safely.
- Revision history records who changed what and when.
- Feature/unfeature works.
- Archive/restore works.
- Archived posts do not appear publicly.
- Admin can view revision history.

---

## Phase A.2 - Public Blog Discovery and SEO Hardening

### Goal

Improve public discoverability and SEO after the core publishing flow is stable.

### Included Features

- Category pages
- Tag pages
- Search
- Sort by latest/popular
- Featured section
- Related posts
- Article structured data
- Sitemap integration
- Canonical URL support

### Backend Tasks

1. Add category slug mapping.
2. Add public search query.
3. Add tag query.
4. Add featured posts query.
5. Add related posts query.
6. Update sitemap generator.
7. Add structured data helper.

### Public Route Tasks

Implement:

```txt
GET /blog/category/:categorySlug
GET /blog/tag/:tagSlug
GET /blog?search=keyword
GET /blog?sort=latest
GET /blog?sort=popular
```

### View Tasks

Update public blog views with:

- Featured posts block
- Category filter
- Tag links
- Search input
- Sort dropdown
- Related posts section
- Empty-state messages

### Definition of Done

- Users can filter posts by category.
- Users can open tag pages.
- Users can search posts.
- Featured posts display on `/blog`.
- Related posts display on post page.
- Blog posts are included in sitemap.
- Structured data renders on published post pages.

---

## Phase B - Comments and Likes

### Goal

Add safe public engagement features.

### Included Features

- Logged-in users can like posts.
- Logged-in users can comment.
- Anyone can read comments.
- Admin can remove/restore comments.
- Comment and like counters update.

### Backend Tasks

1. Add BlogComment model.
2. Add BlogLike model.
3. Add comment validation.
4. Add comment sanitization.
5. Add like/unlike service.
6. Add comment count update.
7. Add like count update.
8. Add rate limits.
9. Add admin moderation actions.

### Public Route Tasks

Implement:

```txt
POST /blog/:slug/comments
POST /blog/:slug/like
POST /blog/:slug/unlike
```

### Admin Route Tasks

Implement:

```txt
GET /admin/blog/comments
POST /admin/blog/comments/:id/remove
POST /admin/blog/comments/:id/restore
```

### View Tasks

Update blog post page with:

- Comment list
- Comment form for logged-in users
- Login prompt for guests
- Like button
- Like count

Update admin with:

- Comment moderation page
- Remove/restore action
- Comment context link to post

### Definition of Done

- Logged-in users can comment.
- Guests cannot comment.
- Comments are sanitized.
- Admin can remove comments.
- Removed comments do not show publicly.
- Logged-in users can like once.
- Like count remains accurate.
- Comment count remains accurate.

---

## Phase B.1 - View Counts and Author Analytics (Status: Complete as of May 28, 2026)

**Backend Implementation:**
- `BlogView` model tracks views per user or IP per 24-hour window.
- `registerBlogView` service is called in the blog post controller and increments the `views` field on the blog.
- Views are not counted for admin/author previews, matching the spec.

**Author Dashboard:**
- Author dashboard route and controller return all blog posts with `views`, `likesCount`, and `commentsCount` fields.
- No dedicated author analytics UI found, but all required data is available for display.

**Admin Dashboard:**
- Admin dashboard displays total/published/rejected/archived blog counts and total blog comments.
- No explicit "top posts by views/likes" or analytics cards, but all metrics are available for extension.

**Conclusion:**
Phase B.1 (View Counts and Analytics) is implemented at the data/model/controller level. All required metrics are tracked and available for both author and admin dashboards. UI for "top posts" and analytics cards can be easily added if desired, but the core analytics and view counting logic are present and match the specification.

---

## Phase C - Published Post Revision Workflow

### Goal

Allow authors to propose updates to already published posts without immediately changing the public version.

### Included Features

- Author creates revision from published post
- Revision has separate draft state
- Original published post remains visible
- Admin reviews revision
- Approved revision replaces public post
- Rejected revision keeps original post unchanged

### Backend Tasks

1. Extend BlogRevision or create BlogRevisionDraft model.
2. Add revision relationship fields.
3. Add published revision submit flow.
4. Add admin approve/reject revision flow.
5. Add replacement logic.
6. Add audit history.

### Author Route Tasks

Implement:

```txt
POST /my/blogs/:id/create-revision
GET /my/blogs/revisions/:revisionId/edit
POST /my/blogs/revisions/:revisionId
POST /my/blogs/revisions/:revisionId/submit
```

### Admin Route Tasks

Implement:

```txt
GET /admin/blog/revisions/pending
GET /admin/blog/revisions/:revisionId/review
POST /admin/blog/revisions/:revisionId/approve
POST /admin/blog/revisions/:revisionId/reject
```

### Definition of Done

- Published posts cannot be directly edited by authors.
- Authors can create update revisions.
- Public version remains stable during revision review.
- Admin can approve or reject revisions.
- Approved revision updates the public post.
- Full revision history is preserved.

---

## Phase C - Published Post Revision Workflow (Status: Complete as of May 28, 2026)

**Backend Implementation:**
- `BlogRevision` model supports author-initiated revisions for published posts, with before/after fields, status, and review tracking.
- `Blog` model tracks the active revision draft for each published post.
- Controller logic allows authors to create, edit, and submit revision drafts for admin review.
- Admin review and approval/rejection of revisions is supported; only approved revisions update the public post.
- Revision history is preserved and accessible.

**Frontend Implementation:**
- Editing a published post opens a revision draft ("edit-published" mode), with clear UI for saving or submitting the revision.
- The original published post remains visible until the revision is approved.

**Conclusion:**
Phase C (Published Post Revision Workflow) is fully implemented. Authors can propose updates to published posts, revisions are reviewed by admins, and only approved revisions update the public version. The workflow matches the specification.

---

## Phase D - Gallery Images, Reporting, and Trust Features (Status: Partially Complete as of May 28, 2026)

**Gallery Images:**
- Fully implemented. Authors can upload up to 3 gallery images per post, with validation and Cloudflare R2 integration. Gallery images are supported in both draft and published post revision flows.

**Reporting (Post/Comment):**
- Fully implemented. Users can report posts and comments for spam, plagiarism, promotion, unsafe medical content, abuse, or other reasons. Duplicate open reports are prevented. Admins can view and resolve/dismiss reports.

**Trust/Author Profile Features:**
- Not implemented. No verified author badge, trust score, or public author profile snippet exists in the current codebase. The `User` model contains basic profile fields, but no trust/verification fields or public profile logic.

**Next Steps:**
- To fully complete Phase D, implement:
  - Verified author/trust badge field in the `User` model
  - Author profile snippet and trust indicator on public blog posts
  - Admin controls for verifying authors

---

## Phase E - Growth Features (Status: Complete as of May 28, 2026)

**Backend Implementation:**
- Trending score calculation and batch update logic implemented (`blog-trending.service.js`, `recalculate-blog-trending.js`).
- Top writers leaderboard logic implemented (`blog-top-writers.service.js`).
- Organizer resources and running guides grouping implemented (`blog-guides.service.js`).
- RSS/Atom feed route implemented using the `feed` npm package (`/feed.xml`).
- All endpoints available: `/blog/trending`, `/blog/top-writers`, `/blog/guides`, `/feed.xml`.

**UI Implementation:**
- Public blog index and post EJS templates created at `/views/public/blog/index.ejs` and `/views/public/blog/post.ejs`.
- `/blog` page displays trending posts, top writers, guides/resources, and newsletter/feed link.
- `/blog/:slug` page displays full post details, author/trust info, and is ready for future engagement features.
- All growth features are visible and accessible to public users.

**Public Route Tasks (Implemented):**

```txt
GET /blog/trending
GET /blog/top-writers
GET /blog/guides
GET /feed.xml
GET /blog
GET /blog/:slug
```

**Definition of Done:**
- Trending posts are displayed on the public blog index.
- Top writers leaderboard is visible and ranks authors fairly.
- Organizer resources and running guides are grouped and accessible.
- Newsletter/feed is available via `/feed.xml`.
- All growth features are integrated into the public blog UI.
- Implementation matches the spec and is fully documented.

---

# 23. Recommended Build Order for Codex

Use this exact order to reduce risk.

## Step 1

Audit current blog implementation.

Target output:

```txt
Current blog files
Existing routes
Existing models
Implemented features
Missing features
Risky areas
```

## Step 2

Implement or clean up Blog model and indexes.

Do not touch views yet.

## Step 3

Implement blog service functions:

```txt
createDraft
updateDraft
submitForReview
approvePost
rejectPost
publishPost
archivePost
generateUniqueSlug
sanitizeContent
calculateReadingTime
```

## Step 4

Implement author routes and dashboard.

## Step 5

Implement admin review routes and pending queue.

## Step 6

Implement public `/blog` and `/blog/:slug` pages.

## Step 7

Add SEO metadata and sitemap integration.

## Step 8

Add admin audit/revision history.

## Step 9

Add comments and likes.

## Step 10

Add analytics and view counting.

## Step 11

Add published revision workflow.

## Step 12

Add reporting, gallery images, and growth features.

---

# 24. MVP Acceptance Test Checklist

## Author Flow

- [ ] Registered user can open My Blogs page.
- [ ] Registered user can create draft.
- [ ] Registered user can save draft.
- [ ] Registered user can preview own draft.
- [ ] Registered user can submit draft for review.
- [ ] Registered user cannot submit empty or invalid content.
- [ ] Registered user can see pending status.
- [ ] Registered user can see rejection reason.
- [ ] Registered user can edit rejected post.
- [ ] Registered user can resubmit rejected post.
- [ ] Registered user cannot edit another author’s post.

## Admin Flow

- [ ] Admin can view pending posts.
- [ ] Admin can preview pending post.
- [ ] Admin can approve pending post.
- [ ] Admin can reject pending post.
- [ ] Reject action requires reason.
- [ ] Approval stores approvedAt and approvedBy.
- [ ] Rejection stores rejectedAt, rejectedBy, and rejectionReason.
- [ ] Admin can archive published post.
- [ ] Archived post is hidden from public blog.

## Public Flow

- [ ] Public users can view `/blog`.
- [ ] Public users can view `/blog/:slug` for published posts.
- [ ] Public users cannot view draft posts.
- [ ] Public users cannot view pending posts.
- [ ] Public users cannot view rejected posts.
- [ ] Public users cannot view archived posts.
- [ ] Published posts show SEO metadata.
- [ ] Published posts show cover image.
- [ ] Published posts show author and published date.

## Security Flow

- [ ] HTML is sanitized before saving.
- [ ] Script tags are removed.
- [ ] Unsafe attributes are removed.
- [ ] Upload file type is validated.
- [ ] Upload size is enforced.
- [ ] Admin routes require admin role.
- [ ] Author routes require login.
- [ ] Ownership checks are enforced.
- [ ] State-changing routes are CSRF-protected if sessions use cookies.

## SEO Flow

- [ ] Slugs are unique.
- [ ] Published slug is immutable.
- [ ] Meta title renders.
- [ ] Meta description renders.
- [ ] Canonical URL renders.
- [ ] OG image renders.
- [ ] Published posts are included in sitemap.

---

# 25. Out of Scope for MVP

Do not implement these in Phase A:

- Comments
- Likes
- Gallery images
- Trending posts
- Top writers leaderboard
- Report post/comment
- Published edit revision workflow
- Scheduled publishing
- Newsletter automation
- AI writing assistant
- Plagiarism checker
- Full CMS builder
- Custom page layouts

---

# 26. Future HelloUniversity Reuse Note

This spec focuses on HelloRun first.

When reused for HelloUniversity, the same blog module can later be generalized into a content module by adding:

```txt
platform: hellorun | hellouniversity
contentType: blog | announcement | guide | help_article | resource
academicAudience: public | students | faculty | admins
courseCode
academicTerm
department
```

Do not generalize too early.

Build HelloRun blog first, make it stable, then extract reusable patterns later.

---

# 27. Recommended Codex Prompt

Use this prompt when asking Codex to begin implementation:

```txt
You are working on the HelloRun codebase. Implement the HelloRun Blog Feature based on docs/hellorun_blog_feature_phased_implementation_spec.md.

Start with Phase 0 and Phase A only.

Do not implement comments, likes, analytics, gallery images, published revision workflow, reporting, scheduled publishing, or top writers yet.

First audit the existing codebase for blog-related files, routes, models, views, middleware, upload utilities, sanitization utilities, SEO helpers, and sitemap generation.

After the audit, implement the minimum core publishing flow:
- Blog model and indexes
- Author draft create/edit/submit flow
- Admin pending review approve/reject flow
- Public /blog and /blog/:slug pages for published posts only
- Unique slug generation
- Server-side HTML sanitization
- Cover image validation
- Basic SEO metadata

Preserve existing working code where possible.
Use the existing HelloRun authentication, admin middleware, layout, flash messages, upload patterns, and SEO partials if available.
Keep changes modular and easy to review.
Update or add tests where appropriate.
```