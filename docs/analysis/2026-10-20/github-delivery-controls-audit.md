# GitHub Delivery Controls Audit

**Audited:** October 20, 2026
**Completion verified:** October 27, 2026
**Repository:** `4hprojects/helloRun`
**Canonical task:** `PRC-01` — complete

## Read-only findings

The GitHub default branch and the local repository both resolve to `main` at
`0c1fd86fba9984b9649c7b70edf59854041ffad1` before this work is published.
The connected account has repository administrator permission, but this audit
made no GitHub changes.

GitHub reports:

- `main.protected` is `false`;
- branch protection is disabled and has no required status-check contexts;
- the repository ruleset collection is empty;
- the current head has no combined-status entries;
- the current head has no associated pull-request workflow runs; and
- the repository has no Actions runs on `main`.

The direct branch-protection detail endpoint returned `403 Resource not
accessible by integration`. That does not make the protection state ambiguous:
the branch response independently reports protection disabled, and the ruleset
collection is empty.

## Required completion sequence

`PRC-01` cannot complete until the repository changes containing the workflow
are published. After publication:

1. confirm the repository gate runs successfully on the published commit;
2. open a controlled temporary branch or pull request containing a harmless
   deliberate gate failure and confirm the gate fails;
3. restore the passing content and confirm the gate recovers;
4. protect `main` with the repository-gate check required before merge;
5. prevent direct bypass for the normal delivery path, while retaining a
   documented emergency-administrator procedure; and
6. record the successful run, failed proof run, recovered run, and effective
   branch/ruleset configuration.

No controlled failing revision should be placed directly on `main`.

## Completion evidence

PR #19 merged as `817ed8755f7654233d70d535119028d067be12d3` on October 27.
The resulting `main` push run `40373193463` passed `Repository checks / verify`.

The effective `main` protection requires a pull request and a strict, current
`verify` check. It applies to administrators, requires resolved conversations,
and disables force pushes and deletion. The required approval count is zero for
the single-maintainer repository. Emergency administrator recovery requires an
explicit, auditable protection change before bypassing normal delivery.

Controlled PR #27 supplied the enforcement proof without touching `main`:

1. commit `5e18c86` added one deliberate syntax error;
2. run `40375415475` failed `verify`, and GitHub reported the PR `BLOCKED`;
3. commit `3660f5f` removed the proof file;
4. run `40375618857` passed in 1m54s, and GitHub reported the PR `CLEAN`; and
5. the PR closed without merge and its temporary remote branch was deleted.

These results complete `PRC-01`. Deployment gating remains separate under
`OPS-01`.
