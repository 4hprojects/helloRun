# HelloRun Event Builder UI/UX v2

**Status:** Proposed; documentation only  
**Created:** November 17, 2026  
**Routes:** `/organizer/create-event`, `/organizer/events/:id/edit`  
**Audience:** First-time and repeat event organizers  
**Implementation branch:** `feat/event-builder-ui-v2`  
**Required base:** `feat/event-experience-v2` at `cd816f5`  

## Document Role

This document records the approved UI/UX improvement contract for the HelloRun
event builder. It is the source for future phased implementation work. Creating
this file does not authorize application code, style, schema, test, production
data, deployment, or publishing changes.

The current repository remains the source of truth for behavior. Future work
must preserve existing event IDs, URLs, field names, stored records,
registration, payment, proof, leaderboard, badge, certificate, organizer-role,
participant-state, preview, and export behavior.

## Evidence Reviewed

The audit used:

- Four organizer create-event screenshots captured November 17, 2026.
- `src/views/organizer/create-event.ejs`
- `src/views/organizer/edit-event.ejs`
- `src/views/organizer/partials/event-builder-navigation.ejs`
- `src/public/css/create-event.css`
- `src/public/css/organizer-events.css`
- `src/public/js/event-builder-groups.js`
- `src/services/custom-questions.service.js`
- `src/services/event-form.service.js`
- `src/models/Event.js`
- `tests/custom-questions.unit.test.js`
- `tests/event-builder-responsive-ui.unit.test.js`
- HelloUniversity teacher quiz-builder views, styles, and client behavior as an
  interaction reference only.

Baseline verification run:

```text
node --test tests/custom-questions.unit.test.js tests/event-builder-responsive-ui.unit.test.js
24 tests passed, 0 failed
```

## UX Strategy

**Target user:** An organizer who may be configuring a first event carefully or
updating recurring events quickly. They need to feel confident that settings are
complete, accurate, and reflected in registration and the public event page.

**Core insight:** Keep the established five-group workflow, but reduce cognitive
load inside each group. Show the common decision first, reveal advanced controls
only when relevant, and make every destructive or complex action recoverable.

**Primary experience goal:** An organizer can understand the current section,
identify the next required action, and save or preview without fearing silent
data loss.

**Interaction reference:** Borrow HelloUniversity's question-card authoring
pattern. Do not copy its quiz scoring, sections, routing, visual styling, or
other classroom-specific complexity.

**Biggest UX risk:** Turning a registration-question feature into a full form or
quiz builder would add unsupported behavior and increase maintenance cost. This
plan therefore preserves HelloRun's four question types and existing storage
contract.

## CLEAR Audit

Overall assessment: **2.4/5**. The builder is functional and structurally sound,
but density and weak progressive disclosure make it harder to scan than it
needs to be.

| Dimension | Score | Evidence | Direction |
| --- | ---: | --- | --- |
| Copy | 3/5 | Guidance is thorough, but several hints are long and distant from the decision they explain. | Shorten default guidance. Keep detailed explanations in accessible disclosures or help controls. |
| Layout | 2/5 | Long vertical sections, full-width size inputs, checkbox walls, and repetitive review cards weaken scanning. | Use compact responsive grids, stronger grouping, and conditional sections. |
| Emphasis | 2/5 | Basic decisions and advanced controls often have equal visual weight. | Establish one focal decision per section and subordinate optional settings. |
| Accessibility | 3/5 | Labels, focus recovery, reduced-motion handling, and minimum target rules provide a base. Small helper copy, dense controls, reorder behavior, and sticky layers still need verification. | Verify WCAG AA, keyboard authoring, focus placement, semantic state, and mobile touch targets. |
| Reward | 2/5 | Readiness and toast feedback exist, but question authoring lacks direct add, duplicate, remove, reorder, preview, and validation feedback. | Add immediate local feedback and recoverable actions at the point of change. |

## What Already Works

- Five primary groups replace the old visible thirteen-step navigation.
- Create and edit use the same persisted field contract.
- Sticky actions keep Preview, Save, and Submit available.
- Error links open the owning group and focus the invalid field.
- Group navigation exposes active, complete, and error states.
- Responsive behavior, reduced motion, and minimum touch targets have focused
  static coverage.
- Custom questions already reach standard, guest, waitlist, transfer, and
  walk-in registration paths.
- Custom answers are escaped, snapshotted, and included in exports.
- Existing question IDs survive label edits, preventing answer orphaning.
- Preview and public display already share the event-page rendering path.

These behaviors are compatibility requirements, not redesign targets.

## Priority Findings

### 1. Custom questions are hard to author

The current UI renders fixed fieldsets and exposes the options textarea for
every answer type. Removal depends on clearing the label. There are no direct
controls for adding, duplicating, deleting, or reordering questions. Organizers
cannot see a participant-facing preview while authoring.

The service deliberately drops blank questions and choice questions without
options. That protects event saves from malformed rows, but the current UI does
not warn organizers clearly enough before their work is omitted.

### 2. Advanced leaderboard settings dominate the section

Leaderboard type, ranking, name display, visibility, cutoff, visible columns,
review visibility, and recognition settings appear together. The page gives
common and uncommon choices equal emphasis. Some controls are applicable only
to accumulated challenges, increasing the cost of scanning other event types.

### 3. Race-kit inventory wastes vertical space

Seven size inputs appear as full-width rows in the audited screen. Compact
`.kit-inventory-grid` styles exist in `organizer-events.css`, while create and
edit load `create-event.css`. Future work should place the builder presentation
in the stylesheet that the builder actually loads, without importing unrelated
organizer-page styles.

Blank and zero stock have different domain meanings and must remain distinct:

- Blank means the size is not offered.
- Zero means the size is offered but sold out.
- Released counts are maintained elsewhere and must never be reset by editing.

### 4. Review is accurate but repetitive

The review step renders seven equal cards and repeats `Not set` across many
rows. Missing data competes visually with configured data. Cards do not link
back to their owning sections. Readiness blockers exist, but the relationship
between a blocker and its editing location can be clearer.

### 5. Hierarchy and helper copy need refinement

Several sections use small helper text for important domain consequences.
Long explanations increase reading effort and compete with adjacent controls.
Content needs a consistent hierarchy: decision, concise consequence, optional
detail.

### 6. Sticky layers need explicit viewport checks

The top navigation, group navigation, mobile group menu, and bottom action bar
all use sticky positioning. Existing static tests confirm expected rules, but
future implementation must inspect real short and narrow viewports for overlap,
covered fields, trapped content, and safe-area spacing.

## Design Principles

1. Preserve the five groups: Basics, Participation, Commerce, Public
   Experience, and Review.
2. Keep common controls visible and place advanced controls behind semantic,
   keyboard-accessible disclosure.
3. Use the existing HelloRun color, type, spacing, button, and icon language.
4. Apply the same behavior to create and edit through shared markup and client
   code.
5. Keep labels visible. Placeholders may provide examples but never replace
   labels.
6. Use semantic buttons, fieldsets, legends, labels, status regions, and error
   associations.
7. Maintain at least 44 by 44 pixel touch targets where layout permits.
8. Use visible `:focus-visible` states and never convey state by color alone.
9. Respect `prefers-reduced-motion`; motion must explain a state change.
10. Avoid decorative gradients, glass effects, colored side borders, excessive
    nested cards, and animation of layout properties.

## Phase 1: Builder Foundation

### Changes

- Preserve all routes, form actions, field names, element IDs required by
  current scripts, and business rules.
- Retain the five-group navigation and existing section ownership.
- Establish a clearer product-UI type scale and an 8px-based spacing rhythm.
- Improve content width and section separation at desktop, tablet, and mobile
  breakpoints.
- Make important consequences readable without relying on tiny helper text.
- Use concise default guidance with accessible detail where more explanation is
  needed.
- Introduce progressive disclosure for advanced settings without hiding
  required fields.
- Improve group completion, warning, and error states without rebuilding the
  wizard.
- Reserve enough bottom space that sticky actions never cover the last field or
  validation message.
- Apply every foundation change to create and edit.

### Quality Gate

- Both EJS views compile.
- Existing section IDs and action IDs remain present.
- `tests/event-builder-responsive-ui.unit.test.js` passes.
- Error recovery still opens the owning group and focuses the invalid field.
- Keyboard, sticky-layer, and responsive checks pass at 320, 375, 768, 1024,
  and 1440px widths.
- No horizontal document overflow appears.

## Phase 2: Google Forms-Style Custom Questions

### Scope and Data Contract

No schema or API change is allowed. Continue using:

- Maximum 10 questions.
- Maximum 20 options per choice question.
- Maximum 160 characters for the prompt.
- Maximum 200 characters for help text.
- Existing indexed names: `customQuestionId0..9`,
  `customQuestionLabel0..9`, `customQuestionType0..9`,
  `customQuestionOptions0..9`, `customQuestionHelp0..9`, and
  `customQuestionRequired0..9`.
- Existing types only:
  - `short_text`: Short answer
  - `dropdown`: Pick from a list
  - `single_choice`: Pick one
  - `checkbox_agreement`: Agreement checkbox

### Shared Structure

- Extract create/edit question markup into a shared EJS partial.
- Add a dedicated client controller for question state, rendering, validation,
  focus management, and indexed field synchronization.
- Keep the server-normalized form body as the authoritative persistence
  contract.
- Generate UI with DOM APIs. Put organizer-entered values into `textContent` or
  form values, never unescaped HTML.

### Question Card Anatomy

Each card contains:

- Question number and reorder handle.
- Visible prompt label and input.
- Answer-type select.
- Participant-facing answer preview.
- Conditional option editor for `dropdown` and `single_choice` only.
- Optional help-text control.
- Required toggle.
- Move Up, Move Down, Duplicate, and Delete actions.

The active card uses the existing HelloRun accent through focus and internal
state treatment. Do not use a colored side-tab border.

### Add and Empty States

- An empty builder explains that custom questions appear during registration
  and in registrant exports.
- Add Question opens an accessible menu containing the four supported types.
- A visible counter reports `x of 10 questions`.
- At ten questions, disable Add Question and provide the reason in visible text.

### Choice Options

- Render one input per option instead of a newline textarea.
- Provide Add Option, Remove Option, Move Up, and Move Down actions.
- Permit at most 20 non-empty options.
- Serialize option values to the existing newline-separated field before form
  submission or preview.
- Hide and disable the option editor for types that do not use options.
- Preserve unsaved option values in client state when switching types, so an
  accidental type change is recoverable before save.

### Reorder, Duplicate, and Delete

- Pointer users may drag by a dedicated handle.
- Keyboard and touch users always receive Move Up and Move Down buttons.
- Reordering preserves the original question ID.
- Duplicating copies authored content, clears the stored ID, inserts the copy
  after the source, and focuses the copied prompt.
- Deleting removes the card locally and presents an Undo action.
- Undo restores the question to its previous position and returns focus to it.
- All mutations recompute visible numbering and indexed form names.

### Validation and Serialization

- An untouched empty card does not serialize and does not block an action.
- A card becomes partially authored when any prompt, option, help, required, or
  type change differs from its untouched state.
- A partially authored card requires a prompt.
- `dropdown` and `single_choice` require at least one non-empty option, matching
  the current server contract.
- Show errors at the question card, connect them with `aria-describedby`, set
  `aria-invalid`, and focus the first invalid field.
- Block Save, Preview, and Submit while a partially authored question is
  incoherent. Explain whether the organizer must finish or remove it. This
  prevents the existing normalizer from silently dropping visible work.
- Keep all other draft incompleteness rules unchanged.

### Quality Gate

- `tests/custom-questions.unit.test.js` passes unchanged.
- New `happy-dom` tests cover:
  - Empty state and first question
  - Each supported answer type
  - Conditional option editor
  - Add and remove option
  - Duplicate with cleared ID
  - Delete and undo
  - Pointer-independent reorder behavior
  - Reindexing after every mutation
  - Ten-question and twenty-option limits
  - Partial-question validation and focus
  - Escaping of organizer-entered text
- Create, edit, registration, guest registration, waitlist, transfer, walk-in,
  import, and export contracts remain intact.

## Phase 3: Dense Sections and Review

### Leaderboard

- Place Enable Event Leaderboard before its dependent settings.
- Show common configuration first: leaderboard type, ranking basis, and runner
  name display.
- Move visibility, public cutoff, visible columns, pending-result display, and
  recognition cards into labeled accessible disclosures.
- Keep privacy-sensitive controls explicit; do not hide their current value.
- Hide and disable accumulated-challenge recognition settings when the selected
  type does not support them.
- Keep existing hidden fallback inputs so unchecked values continue to submit
  reliably.

### Race-Kit Inventory

- Show inventory only when Require a Race Kit Size is enabled.
- Render Size, Available Stock, and Released information in a compact responsive
  grid.
- Use seven columns when space permits, a smaller wrapped grid on tablet, and a
  readable two-column or row layout on mobile.
- Keep blank-versus-zero semantics visible near the inputs.
- Preserve released counts as read-only information.
- Never overwrite or reset released counts during an unrelated event save.

### Review

- Keep readiness blockers and warnings before the configuration summary.
- Add an Edit link to each summary group. The link opens the correct builder
  group and focuses or scrolls to the owning section.
- Hide rows that are irrelevant to the selected event type or fee mode.
- Show configured values before absent optional values.
- Replace repeated `Not set` rows with one useful group-level empty message when
  a group has no meaningful configured values.
- Preserve exact pricing, payment, schedule, rewards, content, and lifecycle
  meaning.
- Continue escaping all server- and organizer-provided summary text.

### Quality Gate

- Create and edit values round-trip without change.
- Review summary tests cover section targets, omission rules, escaping, and
  event-type relevance.
- Virtual, on-site, hybrid, free, paid, draft, incomplete, and historical events
  render safely.
- Feature-flagged settings are not advertised as active when their integration
  is unavailable.

## Phase 4: Quality and Release Readiness

### Automated Verification

Run and record actual results for:

```text
node --test tests/custom-questions.unit.test.js tests/event-builder-responsive-ui.unit.test.js
npm run test:organizer
npm run lint:check
npm run format:check
npm run docs:check
npm run test:unit
```

Add focused commands for every new test file created during implementation.
Never report a passing command that was not run.

### Browser Verification

Use the isolated development environment:

```text
npm run dev:services:up
npm run dev:isolated
```

Inspect create and edit at 320, 375, 768, 1024, and 1440px widths. Record the
browser, viewport, event configuration, and actual result.

Verify:

- Keyboard-only question creation and editing.
- Logical focus order and focus return after add, duplicate, delete, undo, and
  disclosure changes.
- Screen-reader names, descriptions, status updates, and error associations.
- Visible focus on every interactive element.
- Minimum touch targets.
- WCAG AA contrast against the actual rendered surface.
- Reduced-motion behavior.
- Hero navigation, group navigation, menus, and sticky action layering.
- Safe-area spacing and no covered last field.
- No horizontal page overflow.
- Long prompts, long help text, 20 options, and 10 questions.
- Empty, partial, valid, invalid, server-error, and restored edit states.
- XSS payloads in prompts, help text, options, and review summaries.

### Final Documentation

Update this file with:

- Exact files changed per phase.
- Commands run and actual results.
- Manual viewport and keyboard evidence.
- Decisions made during implementation.
- Known limitations and follow-up work.
- Branch, commit SHA, and push result.
- Deployment handoff. Do not deploy or merge automatically.

## Compatibility Boundaries

- No new frontend framework.
- No database migration.
- No new question types.
- No conditional question routing, quiz scoring, file upload, sections, or
  profile mapping.
- No event URL or identifier changes.
- No registration, payment, proof, leaderboard, badge, certificate, role,
  participant-state, or export behavior changes.
- No draft publication or production-data mutation.
- Reuse EJS, current services, HelloRun design tokens, Lucide icons, and the
  existing action flow.
- Preserve preview restrictions and parity with the public event page.
- Historical events without newer optional fields must remain editable.

## Worktree and Delivery Safety

The current checkout contains unrelated OCR and submission-review work. Future
implementation must not stage, rewrite, delete, or commit those changes.

Create an isolated worktree from `feat/event-experience-v2` at `cd816f5`, create
`feat/event-builder-ui-v2` there, and commit each completed phase separately.
Do not force-push, merge, or deploy. If push access is unavailable, retain
verified local commits and report the exact blocker.

## Acceptance Summary

The future implementation is complete only when:

- Create and edit provide the same builder behavior.
- The five-group architecture remains intact.
- Custom questions use the approved card workflow without changing storage.
- Advanced settings are discoverable without dominating common tasks.
- Review directs organizers to incomplete sections and avoids repetitive noise.
- All existing event and participant behavior remains compatible.
- Automated and manual evidence is recorded honestly.
- The feature branch is ready for deployment review but is not deployed.

