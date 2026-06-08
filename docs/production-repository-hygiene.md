# Production Repository Hygiene

## Rule

Production commits should include application code, tests, migrations, documentation, and intentional configuration only.

Do not commit local workspace state, agent/tool settings, lock files, temporary outputs, generated caches, machine-specific paths, credentials, or files unrelated to the production change.

## Before Committing

- Review `git status --short`.
- Inspect untracked files before staging them.
- Stage only files that belong to the requested change.
- Add local-only paths to `.gitignore` when they are likely to reappear.
- Remove accidentally tracked local-only files with `git rm --cached` so they stay on disk but leave the repository.

## Local-Only Examples

- `.claude/`
- editor or IDE state
- local logs and temp files
- test cookies and smoke-test artifacts
- generated caches or downloaded vendor assets
- machine-specific settings or absolute local paths

## Future Work Note

For future implementation tasks, treat production-unrelated files as out of scope by default. If a tool creates local state while working, keep it ignored and out of commits unless the user explicitly asks to publish it and it has been checked for secrets or machine-specific data.
