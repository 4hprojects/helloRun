# Implementation Effort, Token Budget and Completion Plan

Estimates only, prepared 2026-10-28 without private repository inspection. **No claim that implementation has started.** Token figures refer to combined Claude Code/Codex input + generated output across prompts, code inspection, edits, and test-fix loops, not the size of these Markdown files. Actual consumption depends heavily on model context caching, files read, existing abstractions, tests and debugging.

| Workstream | AI tokens, low–high | Human / active engineering hours, low–high | Calendar dependence |
|---|---:|---:|---|
| Phase 0 repository audit | 25k–60k | 4–8 h | Starting point |
| Phase 1 versioned series/template | 40k–100k | 8–16 h | After audit |
| Phase 2 draft generation | 35k–90k | 6–14 h | After schema |
| Phase 3 content and date composition | 25k–65k | 5–10 h | After generator |
| Phase 4 admin preview/publish validator | 40k–110k | 8–18 h | Critical path |
| Phase 5 rewards templates | 35k–100k | 7–16 h | Existing assets may vary |
| Phase 6 public landing/archives | 30k–80k | 6–14 h | Can follow MVP |
| Phase 7 analytics | 35k–90k | 7–16 h | Depends on stored stats |
| Phase 8 cross-month achievements | 45k–120k | 9–20 h | Complex distance dedupe |
| Phase 9 recurring draft scheduler | 30k–80k | 6–14 h | After generator |
| Phase 10 optional auto publishing | 25k–70k | 5–12 h | Separate explicit approval |
| November configuration and publishing | 10k–30k | 2–6 h | Does not wait for framework |
| **Total** | **375k–990k** | **73–164 h** | Excludes waiting for review/deployment windows |

### Milestones
- **Immediate November launch:** 2–6 active engineering hours if current admin workflow supports it, plus artwork/review time. Not dependent on new code.
- **Recurring-series MVP (phases 0–5):** 38–82 active engineering hours. At 15–25 focused hours/week, roughly 2–6 calendar weeks, excluding delays and unexpected defects.
- **Full roadmap (phases 0–10):** 71–158 active engineering hours excluding November configuration. At 15–25 focused hours/week, approximately 3–11 calendar weeks plus acceptance/release slack.

### Risk adjustments
Add 25–50% if current event models couple dates to UI copy, if reward issuance cannot be reused, or if tests are sparse. Major rework of existing OCR/provider syncing is **out of scope**, quoted separately. Token estimates can be lower with targeted file reads or higher with repeatedly exhausted context windows and extensive test failures.

### Per-phase execution prompt
"Implement only Phase N from `docs/active-quest/NN_*.md` and follow `00_ACTIVE_QUEST_MASTER_PLAN.md`. Start by inspecting relevant existing code. Reuse existing HelloRun models/workflows. Show the implementation plan and changed files, add automated tests, run tests/build, report results and migration/rollback instructions. Do not rename historical events, change unrelated modules, publish live events, or enable automation flags without explicit administrator authorization. Stop after the phase and provide its acceptance evidence."

### Recommended developer cadence
One PR per phase; use gate reviews after 0, 1, 4, 5, 8 and 9. Parallelize only independent work (e.g. landing-page mockups after data contract solidifies). Plan for validation and deployment verification rather than treating model-generated code as complete.
