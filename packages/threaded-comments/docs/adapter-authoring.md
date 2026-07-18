# Adapter authoring and conformance

An adapter translates host persistence into the normalized comment workflow. Keep host field names and indexes in the adapter; never import them into the core.

## Required behavior

- Resource lookup applies the host's visibility rules.
- Comment IDs are validated before database queries.
- Root pagination excludes replies; replies are chronological and independently bounded.
- Replies to replies resolve to the root while retaining their specific target.
- Removed roots remain as tombstones only while active replies exist.
- Versioned updates are atomic and return no record on conflict.
- Revision redaction replaces stored public text while retaining timestamps.
- Report snapshots are immutable even after edit, redaction, or deletion.
- Contribution counts include active roots and replies and cannot become negative.
- All returned identities contain only public-safe fields.

## Conformance checklist

1. Run creation/retrieval/update/removal tests from `@hellorun/threaded-comments/testing`.
2. Add boundary tests for the database's ID and timestamp precision.
3. Verify stable `_id` or equivalent tie-breaking for every ordered query.
4. Test concurrent edit and duplicate-report constraints against the real database.
5. Verify removed content and private moderation fields never enter public presentation.
6. Test transaction/retry behavior for comment and contribution-count writes.

PostgreSQL adapters should use a transaction for the comment/count pair and an expected-version predicate in `UPDATE ... WHERE version = $expected`. Return the updated row only when exactly one row changes.
