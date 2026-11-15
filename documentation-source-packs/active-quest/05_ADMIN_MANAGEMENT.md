# Phase 4: Admin Controls, Prepublication Validation and Permissions

## Admin screens
Active Quest overview; master series template versions; monthly edition list; generate draft; configuration diff; full public preview; publish checklist; audit log; pause series scheduler; reward configuration navigation. Reuse event admin forms and review screens.

## Permissions
Use existing auth/RBAC with least privilege: view series, edit template, generate draft, edit draft, attach assets, publish, configure automation, revoke rewards. Server-side checks on every endpoint; deny by default.

## Publication blocker checklist
- Unique month/year/slug, valid local dates and cutoff ordering.
- Exact six configured baseline categories, 0 fee, correct event type and active organizer.
- Valid proof/eligible-activity policy and supported submission choices.
- No contradictory dates/categories in rendered text.
- Required badge asset for all six categories and valid certificate template if public copy promises them.
- Poster/hero asset meets accepted type and dimensions, valid public preview.
- No broken referenced assets and no unpublished template dependencies.

## Warnings vs blockers
Block impossible activity dates, permission failure, duplicate IDs, absent promised rewards and mismatched event policy. Warn on optional SEO enhancements and nonessential promo copy.

## Admin operations
Publishing and re-opening require explicit authorized action, versioned history and audit logs. Edited active events surface change notices. Disabled series blocks new generation but never erases records. Feature flags default off for new automation and publication features.

## Acceptance tests
Unauthorized mutations rejected; safe double-click of Generate/Publish; fail-closed missing flag; preview equals published computed dates; no bypass through API; event editing regression.
