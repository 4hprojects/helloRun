# Phase 1: Versioned Master Template and Series Model

## Required entities (adapt to existing schema)
**Series**: stable key `active-quest`, display label, tagline, active flag, organizer ref, schedule defaults, brand asset refs, creation/audit metadata.
**TemplateVersion**: series key, monotonic version, effective timestamp, policy and rules text, category definitions, content blocks, reward requirements, UI settings, published/frozen state, audit. Never mutate a published template version.
**MonthlyEdition**: existing Event record extended with series key, `year`, `month`, template version, generated-from key, deep-copied policy/config snapshot, admin overrides and status.

## Baseline data
- Series: Active Quest, tagline `Your Distance. Your Pace. Your Quest.`
- Categories (target km, label, display order): 25 Starter Quest, 50 Active Quest, 75 Momentum Quest, 100 Endurance Quest, 150 Distance Quest, 200 Ultra Quest.
- Free virtual accumulated-distance activity event; one registration category per edition; minimum qualifying activity 1 km.
- Timezone `Asia/Manila` stored explicitly. Local business dates and UTC instants both accessible.

## Validation constraints
- Unique `(seriesKey, year, month)` for monthly edition, with DB unique index where practical.
- Exactly six unique positive category targets for baseline template.
- Valid template version must exist before edition creation.
- Changes to published template create new version. Existing editions retain snapshots.
- Document manual override provenance, actor, reason and effective date.
- Historical Active Run events must not be renamed or overwritten.

## Security and migrations
Use existing admin permission model, fail closed. Schema additive; backfill only after audit; reversible indexes/migrations where safe. Avoid inferring series membership solely from a title match.

## Tests
Template creation/versioning; conflicting edition uniqueness; timezone preservation; snapshot immutability; invalid category set; nonadmin denial; existing event regression.

## Done when
A versioned master template exists and new editions reference frozen configuration without changing historical events.
