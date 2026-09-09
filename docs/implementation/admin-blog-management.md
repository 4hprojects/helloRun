# Admin Blog Management

**Updated:** August 30, 2026

The canonical entry point is `/admin/blog`, which redirects to the posts workspace at `/admin/blog/review`. Persistent navigation connects posts, comments, and reports.

## Publication workflow

- Content autosave never changes workflow status.
- Pending posts are edited in place and use explicit approve, schedule, or reject actions.
- Editing a published or scheduled post creates an `admin_revision`; the live post remains unchanged until the revision passes the publication checklist.
- Approval accepts `publicationMode=now|scheduled`. Scheduled approval also requires a future UTC `scheduledFor` value.
- Archived posts restore to draft and must pass review before publication.
- Feature/unfeature is a dedicated audited action.

## Moderation workspace

- Post filters support status, category, review type, author ID, dates, flags, reports, sorting, and pagination.
- `/admin/blog/comments` is the browser workspace; `/admin/blog/comments.json` is the JSON listing.
- Report resolution requires an outcome: remove/archive target, retain target, or escalate.
- Post, comment, and report moderation mutations are written to the critical audit trail.

## Compatibility and operations

- Scheduled records created before `scheduledFor` continue to publish through the `publishedAt` fallback until migrated.
- Use `npm run blog:migrate-scheduled-for` for a dry run and append `-- --apply` to migrate.
- Overdue scheduled posts and publisher eligibility failures appear in the post-management queue.
