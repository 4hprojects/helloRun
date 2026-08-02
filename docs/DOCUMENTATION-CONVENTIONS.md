# Documentation Conventions

## Canonical Ownership

- `PRODUCT.md`: product purpose, audiences, personality, and design principles.
- `docs/PRD.md`: stable product and quality requirements.
- `docs/STATUS.md`: current delivery and verification state.
- `docs/ROADMAP.md`: forward-looking priorities.
- `docs/CHANGELOG.md`: chronological implementation history.
- `docs/README.md`: documentation navigation.

Do not duplicate current status or priority lists in feature specifications.
Link to the canonical document instead.

## Status Metadata

Plans and implementation records should state a reconciliation date and use one
of these labels:

- **Implemented and repository-verified**
- **Implemented; production/live verification pending**
- **Operational work pending**
- **Not implemented**
- **Historical or superseded**

DB-free tests are not production verification.

## Placement

- Put stable system behavior in `architecture/`, `design/`, `features/`, or the
  relevant domain folder.
- Put completed implementation records in `implementation/`.
- Put current cross-cutting work in `improvement-plan/`.
- Put dated evidence in `analysis/`.
- Put superseded plans and trackers in `archive/`.
- Keep package-specific documentation inside its package.

## Links and Naming

- Use paths relative to the Markdown file containing the link.
- Use root application paths such as `/privacy` only when linking to a web
  route, not a repository file.
- Prefer lowercase kebab-case filenames for new documentation.
- Do not rename files consumed by runtime scripts without updating and testing
  those consumers.

## Organiser and Organizer

Preserve `organiser` for persisted role values and established internal
compatibility identifiers. Use `organizer` for product copy and existing
`/organizer/*` URLs unless a specific surface already has a compatibility
requirement. Document exceptions rather than silently renaming identifiers.
