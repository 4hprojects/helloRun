helloRun Blog Feature - Updated Draft Specification

Implementation note (Feb 27, 2026):
- Admin inline edit with autosave is implemented on admin review page.
- Blog revision tracking is implemented via BlogRevision (before/after + changedFields).

1. Product Direction

Goal:
- Allow all registered users to contribute running-related blog posts.
- Keep quality and brand trust through moderation before public publishing.

Publishing principle:
- Anyone can write.
- Only approved posts are public.

2. Roles and Permissions

Roles:
- Admin
- Author (all registered users)
- Public (not logged in)

Author permissions:
- Create post
- Edit own draft
- Submit for review
- View rejection reason
- Edit rejected post and resubmit
- Delete own draft/rejected post
- View own analytics (views, likes, comments count)

Admin permissions:
- View all posts by status
- Review pending posts
- Approve/reject posts
- Require rejection reason
- Edit post content and metadata from review page (autosave)
- Feature/unfeature posts
- Archive posts
- Soft-delete any post
- Moderate comments
- View edit/revision history per post

Public permissions:
- View only published posts
- View comments
- Like post (if logged in)
- Comment (if logged in)

3. Status Workflow and Rules

Post statuses:
- draft
- pending
- published
- rejected
- archived

Allowed transitions:
- draft -> pending
- pending -> published
- pending -> rejected
- rejected -> pending (after author edits)
- published -> archived
- archived -> published (admin only)

Edit rules:
- Author can edit draft, pending, and rejected posts.
- Published edits by author will use a revision flow (locked decision):
  - author clicks "Update Published Post"
  - system creates a new draft revision linked to the published post
  - original published post remains public until revision is approved
  - approved revision replaces the public version and updates publishedAt

Review transparency:
- Rejection must include reason.
- Store:
  - rejectionReason
  - rejectedAt
  - rejectedBy
- Also store approvals:
  - approvedAt
  - approvedBy

Moderation SLA (product target):
- Pending posts should be reviewed within 48 hours.
- Dashboard should display:
  - submittedAt
  - reviewedAt
  - reviewer (admin)

4. Content Structure and Template Rules

Required fields:
- title
- category
- coverImageUrl
- contentHtml (sanitized)

MVP category policy (implemented):
- Use fixed enum categories in Phase A:
  - Training
  - Nutrition
  - Gear
  - Motivation
  - Race Tips
  - Injury Prevention
  - General
  - Travel
  - Mental Health
  - Community
  - Personal Stories
  - Other
- If "Other" is selected, customCategory is required (2-80 chars).

Optional fields:
- excerpt
- tags[]
- galleryImageUrls[] (max 3)
- seoTitle
- seoDescription

Template rendering:
- Content is written by author.
- Display follows helloRun blog template (fixed page layout).
- No arbitrary custom page layout by users.

Image policy:
- 1 cover image required
- up to 3 gallery images
- file type: image/jpeg or image/png
- max size per file: 5MB
- compress/optimize on upload
- storage paths:
  - /blog/covers/
  - /blog/gallery/

5. Rich Text Editor Policy

Editor:
- Simple WYSIWYG editor (safe subset only)

Allowed formatting:
- headings
- bold
- italic
- lists
- blockquotes
- links

Security:
- sanitize HTML server-side before saving
- strip script/style/unsafe attributes
- never trust client-side sanitization only

Storage:
- contentHtml (required, sanitized)
- contentRaw (optional for future editor migrations)

6. Public Blog Experience

Blog list page (/blog):
- published posts only
- search (title/tags)
- filter by category/tag
- sort by latest/popular
- featured section

Post page (/blog/:slug):
- breadcrumb/category
- title, excerpt
- author info
- publish date
- reading time
- views
- cover image
- optional gallery
- content body
- tags
- share links
- like button
- comments section
- related posts

Slug policy (locked):
- Slug auto-generated from title on first save.
- Slug must be unique.
- Once published, slug is immutable in Phase A.
- If slug changes are needed in future, implement redirect history in later phase.

View-count policy (locked for MVP):
- Count 1 view per user per post per 24-hour window.
- For anonymous users, count 1 view per IP per post per 24-hour window.
- Do not increment views on admin/author preview routes.

7. Comments System (Phase 1.1)

Visibility:
- anyone can read comments
- logged-in users can create comments

Rules:
- text only
- no HTML
- max length enforced
- sanitized on save

Comment status:
- active
- removed

Moderation:
- admin can remove/restore comments
- audit fields stored for moderation actions

8. Database Design

Blog collection fields:
- _id
- authorId
- title
- slug
- excerpt
- contentHtml
- contentRaw (optional)
- coverImageUrl
- galleryImageUrls[]
- category
- tags[]
- status
- featured (boolean)
- rejectionReason
- rejectedAt
- rejectedBy
- approvedAt
- approvedBy
- views
- likesCount
- commentsCount
- readingTime
- seoTitle
- seoDescription
- ogImageUrl
- isDeleted
- deletedAt
- deletedBy
- createdAt
- updatedAt
- publishedAt

Comment collection fields:
- _id
- blogId
- authorId
- content
- status
- isDeleted
- deletedAt
- deletedBy
- createdAt
- updatedAt

Like collection fields (recommended for integrity):
- _id
- blogId
- userId
- createdAt

9. Required Indexes

Blog:
- slug (unique)
- status + publishedAt (for public listing)
- authorId + createdAt (for author dashboard)
- category + publishedAt
- tags + publishedAt

Comment:
- blogId + createdAt
- authorId + createdAt

Like:
- blogId + userId (unique)

10. Author Dashboard Features

My Blogs page:
- tabs: Draft, Pending, Published, Rejected, Archived
- list with quick status badges
- rejection reason display
- edit and resubmit action
- delete draft/rejected action
- simple analytics per post (views, likes, comments)

11. Admin Review Dashboard

Admin blog panel:
- pending queue
- quick preview
- approve/reject actions
- reject modal requires reason
- inline metadata/content edits with debounced autosave
- archive and feature controls
- revision history per post (who, when, changed fields, before/after)

Quality checklist (admin):
- running-related topic
- no spam/pure promotion
- no plagiarism/copyright violation
- no unsafe medical claims
- readable structure and useful value

12. SEO and Growth

SEO features:
- canonical post URL
- custom meta title/description
- OG image (default to cover)
- structured data (Article)
- include published posts in sitemap

Content strategy examples:
- virtual run training
- 10k training guide
- half marathon preparation
- running in Baguio
- recovery after long run

13. Safety and Legal

Terms updates:
- author retains ownership, grants helloRun publishing license
- helloRun can edit/remove/archive content
- no copyright infringement
- no harmful/unsafe medical advice

Platform safety:
- rate limit submission and comment endpoints
- anti-spam checks (keyword/link density)
- report post/comment action (phase 2)

14. Performance

Must-have:
- image compression and optimized sizes
- lazy loading images
- paginate blog lists and comments
- cache public published posts
- cap content and tag lengths

15. Phased Delivery Plan

Phase A (MVP - recommended first):
- Blog model + slug + statuses
- Author create/edit draft + submit
- Admin pending review + approve/reject
- Public /blog and /blog/:slug for published posts
- Cover image support
- Explicitly out of scope in Phase A:
  - comments
  - likes
  - gallery images
  - trending/top writers
  - advanced analytics

Phase A.1:
- Comments
- Likes (one per user)
- Author analytics basics

Phase B:
- Gallery images
- Featured/trending logic
- Revision workflow for published edits
- report content flow

Phase C:
- top writers leaderboard
- trust badges / verified runner writer
- deeper anti-spam/plagiarism checks

16. Definition of Done (MVP)

- Author can create draft, submit, and receive review result.
- Admin can approve/reject with reason logging.
- Only published posts are publicly visible.
- Slugs are unique and SEO-safe.
- HTML is sanitized server-side.
- Cover upload validation enforced.
- Basic audit fields and indexes are in place.
