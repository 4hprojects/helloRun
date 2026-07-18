# `@hellorun/threaded-comments`

A private, storage-neutral threaded discussion workflow for server-rendered applications. It provides a deterministic workflow engine, repository contracts, an optional Mongoose adapter, an Express router factory, and an accessible Shadow DOM web component.

## Install

```json
{
  "dependencies": {
    "@hellorun/threaded-comments": "file:packages/threaded-comments"
  }
}
```

The package is deliberately `private`. Extract it to another private repository or vendor the directory when sharing it with another project.

## Quick start

```js
const {
  createThreadedComments,
  createMongooseRepositories,
  createExpressCommentsRouter
} = require('@hellorun/threaded-comments');

const repositories = createMongooseRepositories({
  models: { Comment, Report, Resource, Identity: User },
  fields: { resourceId: 'articleId', resourceKey: 'slug', contributionCount: 'commentsCount' }
});

const workflow = createThreadedComments({
  repositories,
  policy: { editWindowMs: 30 * 60 * 1000, maxEdits: 5, replyPreviewSize: 3 },
  sanitize: textOnlySanitizer,
  analyzeSafety
});

app.use('/articles/:resourceKey/comments', createExpressCommentsRouter({
  workflow,
  resolveActor: req => req.user && ({ id: req.user.id }),
  beforeWrite: [requireAuthentication, csrfProtection, commentRateLimit]
}));
```

On the client:

```html
<script type="module" src="/vendor/threaded-comments.js"></script>
<threaded-comments id="discussion"></threaded-comments>
<script type="module">
  document.querySelector('#discussion').configure({
    resourceKey: 'trail-running-basics',
    endpointBase: '/articles/trail-running-basics/comments',
    authenticated: true,
    actor: { id: 'runner-123' },
    csrfToken: document.querySelector('meta[name=csrf-token]').content,
    policy: { maxContentLength: 1000, reportReasons: ['spam', 'abuse', 'other'] }
  });
</script>
```

## Repository contracts

The core never imports Mongoose or host models. A host supplies:

- `resources.findVisible(key)`
- `comments.findActive`, `create`, `updateIfVersion`, `remove`, `listThreads`, `listReplies`, `listHistory`, and `redactRevision`
- optionally `reports.create`, `identities.find`, and `counts.increment`

Write operations must be atomic. `updateIfVersion` must compare the caller's expected timestamp/version and return `null` on a stale write. Report creation should enforce one open report per actor and target. See [the adapter guide](docs/adapter-authoring.md).

## Policy

`normalizePolicy()` validates page sizes, preview depth, content/report limits, edit window and count, tombstone/redaction labels, report reasons, and public-history behavior. Values are integration configuration rather than package-wide product decisions.

## Lifecycle events

The workflow emits `comment.created`, `reply.created`, `comment.edited`, `comment.deleted`, `comment.restored`, `comment.reported`, and `revision.redacted`. Subscribe through `workflow.events.on(name, listener)`. Delivery is host-owned; listeners can create notifications, enqueue analytics, or write audit records without coupling those systems to the core.

## Express and security

`createExpressCommentsRouter()` supplies the conventional list, replies, create, edit, delete, report, history, and redaction routes. Authentication, CSRF, rate limits, resource authorization, sanitization, and safety analysis are intentionally injected by the host. Never expose the write router without those controls.

Errors use `ThreadedCommentsError` with stable `code`, HTTP `status`, and a runner-safe message. Hosts may provide `mapError` to retain an existing response envelope.

## Widget, accessibility, and theming

`<threaded-comments>` renders its own responsive thread rails, avatars, editors, history/report/confirmation dialogs, pagination, and live feedback in Shadow DOM. It uses inline SVG and has no icon dependency. Override `--tc-color`, `--tc-muted`, `--tc-accent`, `--tc-border`, `--tc-bg`, `--tc-soft`, `--tc-radius`, and `--tc-space` on the host element.

The widget dispatches composed events: `threaded-comments-create`, `threaded-comments-edit`, `threaded-comments-delete`, `threaded-comments-report`, and `threaded-comments-error`. A host can also provide a custom `transport` and login destination.

## Versioning

The current `0.x` line may refine adapter signatures. Patch releases preserve contracts; minor releases may add or deliberately revise pre-1.0 interfaces and document the change in `CHANGELOG.md`. Persistence changes are never implicit.
