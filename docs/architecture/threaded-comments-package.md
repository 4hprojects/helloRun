# Threaded comments package integration

HelloRun uses the private local package at `packages/threaded-comments` as the reusable boundary for comment policy, presentation, lifecycle semantics, storage contracts, Express integration, and the optional Shadow DOM widget.

## HelloRun compatibility map

| Package boundary | HelloRun implementation |
|---|---|
| Resource | Published `Blog`, resolved by slug and excluding deleted posts |
| Comment repository | `BlogComment`, with `blogId` mapped to the package resource ID |
| Report repository | `BlogReport`, retaining immutable comment snapshot fields |
| Identity | Public-safe `User` name and avatar fields |
| Count | `Blog.commentsCount`, including roots and replies |
| Sanitizer and safety | `utils/sanitize` and `utils/blog-safety` |
| Authentication | Session `userId` and existing `requireAuth` middleware |
| CSRF and limits | Existing page-route middleware and per-runner limiters |
| Reply notification | `reply.created` translated to `blog_comment_reply` by the HelloRun facade |
| Moderation | Existing admin report/comment controllers and views remain authoritative |

`src/services/blog-comment.service.js` is the compatibility facade. Existing `/blog/:slug/comments...` URLs and response envelopes remain stable. The `BlogComment` and `BlogReport` schemas require no migration.

## Adoption strategy

The first adoption deliberately keeps HelloRun's server-rendered article shell and compatibility browser initializer. New projects can mount the generic Express router and `<threaded-comments>` directly. HelloRun can move individual routes to the router factory without changing public URLs because both use the same policy and repository contracts.

Keep host-only behavior outside the package: blog visibility, notification copy/destination, admin report screens, authentication/session semantics, CSRF tokens, and operational rate-limit keys.
