# HelloRun Documentation

This index describes where each class of documentation belongs. Current
delivery claims come only from [STATUS.md](STATUS.md), and every incomplete
priority is owned by [ROADMAP.md](ROADMAP.md).

## Start Here

| Document | Purpose |
|---|---|
| [Product brief](../PRODUCT.md) | Audience, positioning, brand, and design principles |
| [Product requirements](PRD.md) | Stable functional and quality requirements |
| [Current status](STATUS.md) | Implemented, verification-pending, operational, and backlog state |
| [Roadmap](ROADMAP.md) | Forward-looking priorities |
| [Changelog](CHANGELOG.md) | Monthly implementation history |
| [Documentation conventions](DOCUMENTATION-CONVENTIONS.md) | Ownership, statuses, placement, links, and terminology |

## Current Work

- [ROADMAP.md](ROADMAP.md) is the canonical detailed backlog. Supporting
  implementation and rollout plans live under [`plans/`](plans/README.md)
  and link back to the ROADMAP task that owns their remaining work.
- [`implementation/verification-pending/`](implementation/verification-pending)
  contains completed code records that still require approved live or
  production verification.
- [`plans/adsense-readiness/`](plans/adsense-readiness/README.md) contains the implementation and
  operational AdSense readiness sequence.
- [`operations/active-quest/`](operations/active-quest/README.md) contains the
  live Active Quest operating record and verification boundary.

The former `todo/`, `to do/`, and `to-implement/` trees were emptied during
reconciliation. Implemented or superseded plans moved to `archive/`; residual
work is represented once in ROADMAP and may link to a supporting specification.

## Canonical Taxonomy

| Directory | Contents |
|---|---|
| [`reference/`](reference/README.md) | Stable architecture, feature, design, integration, and example references |
| [`plans/`](plans/README.md) | Supporting plans whose remaining work is owned by ROADMAP |
| [`implementation/`](implementation/README.md) | Completed implementation records and handoffs |
| [`operations/`](operations/README.md) | Deployment, environment, and release runbooks |
| [`analysis/`](analysis/README.md) | Dated engineering, production, and UI/UX evidence |
| [`archive/`](archive/README.md) | Historical and superseded plans, reviews, and snapshots |
| [`policy-markdown-pack/`](policy-markdown-pack) | Canonical runtime-consumed policy Markdown |
| [`contents/`](contents) | Policy content source snapshots |
| [`template/`](template) | Reusable event templates |

## Evidence and History

| Directory | Contents |
|---|---|
| [`analysis/`](analysis/README.md) | Dated engineering and UI/UX evidence |
| [`operations/`](operations/README.md) | Deployment and isolated-environment runbooks |
| [`changelog/`](changelog) | Monthly session and commit summaries |
| [`archive/`](archive) | Superseded PRDs, roadmaps, plans, reviews, and status snapshots |

See [`analysis/README.md`](analysis/README.md) and
[`archive/README.md`](archive/README.md) for lifecycle details.

## Package Documentation

The reusable threaded-comment package maintains its own documentation under
[`../packages/threaded-comments/`](../packages/threaded-comments). Those files
are indexed by the package README and are not reorganized into application
documentation.

## Assets

Screenshots and audit images live beside the dated analysis that produced them
or under `image_test/`. They are evidence, not canonical product state.

## Compatibility and Source Material

Former tracked paths contain short pointer documents. They preserve repository
and external bookmarks but are not canonical content. Original third-party or
operator-supplied planning packs live under
[`../documentation-source-packs/`](../documentation-source-packs/README.md) and
remain outside the governed `docs/` quality gate.
