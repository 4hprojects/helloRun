# Community Guidelines UI/UX Audit

Date: 19 July 2026
Route: `/community-guidelines`
Primary perspectives: runner, author/commenter, organizer, running-group member

## Outcome

The page now operates as a practical participation guide rather than an undifferentiated legal card. It explains where the rules apply, how to contribute constructively, which channel to use for a concern, what happens during moderation, and where the complete published policy remains authoritative.

The current file-backed copy is preserved as the immutable v1.0 fallback. Corrected content is prepared separately as an unpublished v1.1 draft, so redesigning the page does not silently change the live agreement.

## Visitor POV

### Runner or group member

“I need to understand whether I can criticize an event, share my experience, or report something without exposing another runner’s private information.”

The new hierarchy answers that before the complete policy through principles, practical situations, a publishing checklist, and reporting destinations.

### Author or commenter

“I need to know what happens when I reply, edit, delete, or report a comment.”

The guidelines now reflect one-level replies, public revision history, author redaction, tombstones, report snapshots, ownership boundaries, and the fact that editing or deleting content does not automatically close a report.

### Organizer

“I need to respond to criticism and make event decisions without confusing event authority with permission to retaliate or expose evidence.”

The page preserves organizer authority over event-specific operations while making platform safety, privacy, honesty, and anti-retaliation standards authoritative.

## Severity-ranked findings

### Critical — Published guidance no longer matched community functionality

The prior copy covered generic comments and reports but not nested replies, editing limits, public revision history, historical redaction, moderation snapshots, or deleted-root tombstones. A community member could not predict what would remain visible or preserved.

Resolution: corrected v1.1 content documents current behavior without changing the underlying APIs.

### High — Respectful disagreement was not distinguished from misconduct

The previous policy discouraged unverified claims but did not clearly protect relevant criticism or explain when a public conversation should move into a private event or support workflow.

Resolution: the situation matrix separates constructive criticism from personal attacks, doxxing, retaliation, unsupported accusations, and pressure on reviewers.

### High — Reporting channels were incomplete

The old page offered email guidance even though blog posts and comments now have reason-based reporting and Contact provides structured support routing.

Resolution: eligible blog content uses its Report action; profiles, groups, events, messages, privacy, and general safety concerns use Contact. Immediate danger is directed to local emergency services.

### High — Health-content boundaries were absent

Running communities naturally discuss injury, training, nutrition, and recovery. The earlier policy did not distinguish personal experience from diagnosis or dangerous instruction.

Resolution: personal experience remains welcome, while diagnosis, guaranteed outcomes, ignored serious symptoms, unsafe substances, dangerous restriction, and misrepresented credentials are prohibited.

### Medium — The legal card delayed practical answers

Visitors encountered one long policy body with no task-based orientation, responsive situation comparison, or publishing checklist.

Resolution: applicability, principles, situations, checklist, moderation, and reporting precede the complete policy. The complete document retains server-rendered contents and a readable 70ch measure.

### Medium — Policy lifecycle could silently replace the fallback

The corrected markdown and public fallback previously shared one file path.

Resolution: v1.0 is preserved under `docs/contents`, corrected content remains the editable source, and the idempotent preparation command creates a draft without publishing or notifying users.

## Design rationale

- Participation principles reduce the cognitive burden of interpreting a prohibition-only list.
- A semantic desktop table provides exact comparisons; below 780px each situation becomes a self-labeled card without horizontal scrolling.
- Neutral borders and restrained tones preserve seriousness without using colored status stripes.
- Five-stage moderation explains due process without promising a fixed strike system or guaranteed appeal.
- The page remains advertisement-free so rules, safety guidance, and reporting paths are uninterrupted. Publishing clear user-generated-content standards and usable reporting supports the publisher’s responsibility to manage community content, but does not guarantee advertising approval.

## Responsive verification targets

Capture these states after implementation:

- `1440px`: compact header, four-column applicability strip, five-column principles and moderation, sticky contents rail.
- `768px`: stacked header actions, two-column principles, situation cards, native contents disclosure.
- `390px`: single-column principles and checklist, full-width actions, shallow card padding.
- `320px`: long labels and examples wrap without clipping, horizontal scrolling, or sub-44px controls.

Also verify print output, keyboard-only navigation, 200% zoom, reduced motion, long organization/display names, no-JavaScript contents navigation, and role-aware guest/runner/organizer/admin actions.

## Acceptance criteria

- Exactly one `h1` renders; duplicate title and embedded metadata are removed from policy HTML.
- Applicability, five principles, situation guidance, checklist, health boundary, moderation stages, and reporting destinations appear before the complete policy.
- Complete policy headings have deterministic collision-safe anchors and server-rendered desktop/mobile contents.
- Current comment/reply/edit/history/delete/report behavior is described without exposing internal moderation signals.
- Criticism remains allowed; harassment, hate, threats, doxxing, exploitation, scams, spam, dangerous advice, malicious reporting, and retaliation are clearly prohibited.
- The public v1.0 fallback remains unchanged and v1.1 remains unpublished until an administrator acts.
- Future publication creates one retry-safe in-app notice for every eligible non-closed pre-publication account, without email or forced acceptance.
- No advertisements, run-proof modal, colored left-edge accents, or page-level horizontal overflow appear.
