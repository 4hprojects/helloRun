# HelloRun Documentation

This index describes where each class of documentation belongs. Current
delivery claims come only from [STATUS.md](STATUS.md).

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

- [`improvement-plan/`](improvement-plan/) is the canonical cross-cutting
  engineering and operational plan.
- [`implementation/verification-pending/`](implementation/verification-pending/)
  contains completed code records that still require approved live or
  production verification.
- [`adsense-readiness/`](adsense-readiness/) contains the implementation and
  operational AdSense readiness sequence.

The former `todo/` and `to-implement/` trees were emptied during reconciliation:
implemented work moved to `implementation/` or `archive/`, and residual work
moved to `improvement-plan/`.

## Stable Reference

| Directory | Contents |
|---|---|
| [`architecture/`](architecture/) | Workflows, roles, schemas, security, time policy, and package architecture |
| [`database/`](database/) | Hybrid MongoDB/PostgreSQL architecture |
| [`design/`](design/) | Design system, UI patterns, and upload presentation |
| [`features/`](features/) | Feature-level behavior and product specifications |
| [`implementation/`](implementation/) | Completed implementation records and handoffs |
| [`create_event/`](create_event/) | Event-builder requirements and mappings |
| [`ocr/`](ocr/) | Run-proof OCR and auto-approval criteria |
| [`sys_access_mngr/`](sys_access_mngr/) | System and communication access matrices |
| [`blog/`](blog/) | Blog/composer design records |
| [`policy-markdown-pack/`](policy-markdown-pack/) | Canonical runtime-consumed policy Markdown |
| [`contents/`](contents/) | Policy content source snapshots |
| [`codex/`](codex/) | Focused implementation notes |
| [`example/`](example/) | Reference event examples |
| [`template/`](template/) | Reusable event templates |

## Evidence and History

| Directory | Contents |
|---|---|
| [`analysis/`](analysis/) | Dated engineering and UI/UX evidence |
| [`ux-analysis/`](ux-analysis/) | Feature-specific UI audits retained for traceability |
| [`changelog/`](changelog/) | Monthly session and commit summaries |
| [`done/`](done/) | Older completed-phase records retained at their historical paths |
| [`archive/`](archive/) | Superseded PRDs, roadmaps, plans, reviews, and status snapshots |

See [`analysis/README.md`](analysis/README.md) and
[`archive/README.md`](archive/README.md) for lifecycle details.

## Package Documentation

The reusable threaded-comment package maintains its own documentation under
[`../packages/threaded-comments/`](../packages/threaded-comments/). Those files
are indexed by the package README and are not reorganized into application
documentation.

## Assets

Screenshots and audit images live beside the dated analysis that produced them
or under `image_test/`. They are evidence, not canonical product state.
