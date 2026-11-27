# Reusable Race Bib Generator

**Implementation date:** November 27, 2026  
**Activation state:** opt-in; no production event or registration was changed

## Delivered behavior

HelloRun now has a structured template creator with three controlled families:
legacy `landscape_v1`/`photo_split_v1`, `festival_header_v1`, and
`classic_race_v1`. Existing `landscape_v1` snapshots keep their original layout.
New drafts default to `festival_header_v1`. Each family uses the same 1800 × 1080
print canvas for organizer previews, personalized PNG files, and printable PDF
files. PDFKit embeds the PNG produced by Sharp, so preview and print share one
layout.

Templates provide bounded slots for event identity, participation label, category,
location, runner name, date, tagline, entry badge, footer note, one primary logo,
and up to three ordered partner logos. Managed artwork retains focal-point and zoom
controls. Inter, Archivo Black, and Fredoka are bundled locally with measured text
fitting. Missing artwork falls back to a solid theme. Contrast, overflow,
print-safe, and missing-asset checks appear in the editor.

Optional social export wraps the unchanged print bib in an 1800 × 1800 event-colored
frame. Its CTA and URL never enter printable PNG, PDF, or organizer batch output.
Social downloads use the same ownership, guest-token, eligibility, runner-name, and
private-cache rules as printable output.

Organizers can save a mutable draft, publish immutable versions, and separately
release one version. Event settings remain disabled by default. Copying transfers
layout and presentation settings only. Destination event assets and identity are
resolved again. Custom artwork, uploaded logos, CTA copy, published versions,
release state, and assignments never copy.

Virtual numbers use the authoritative PostgreSQL `bib_assignments` ledger. Migration
`029_race_bib_generator.sql` adds bib kind and event range policies. Allocation locks
the event policy row, returns existing assignments on retry, and reactivates the same
virtual assignment after eligibility returns. Existing on-site assignments remain
authoritative. Hybrid release requires disjoint ranges and audits live assignments.

Runner and private guest routes enforce ownership or token access before rendering.
Personalized responses use `Cache-Control: private, no-store`. Virtual names remain
hidden unless both the design permits names and the runner opts in. Standard bib PNG
and PDF files contain no Race Pass QR or confirmation code.

## 2027k preview

The preview command uses the text-free Cordillera banner from the supplied package:

```bash
npm run bibs:preview -- \
  --preset=2027k \
  --artwork="docs/to do/HelloRun_2027k_Claude_Code_Package/assets/event-banner.png" \
  --output-dir=tmp/race-bib-previews
```

Outputs:

- `tmp/race-bib-previews/2027k-hellorun-challenge.png`
- `tmp/race-bib-previews/2027k-hellorun-challenge.pdf`

The PNG is 1800 × 1080. The PDF is one 720 × 432 point page, equal to 254 ×
152.4 mm. The pilot text is `2027k HelloRun Challenge` and `2,027 KM VIRTUAL
RUN`; the sample number appears separately.

## Production preparation

Apply migration `029` before deploying code that can issue guest or virtual bibs.
Then publish the reviewed design through Bib Design. Keep the event paused until the
release dry-run has no conflicts.

```bash
npm run bibs:release -- \
  --event-slug=2027k-hellorun-challenge \
  --version=1 \
  --dry-run

npm run bibs:release -- \
  --event-slug=2027k-hellorun-challenge \
  --version=1 \
  --apply \
  --confirm-event-slug=2027k-hellorun-challenge

npm run bibs:backfill -- \
  --event-slug=2027k-hellorun-challenge \
  --dry-run \
  --batch-size=100

npm run bibs:backfill -- \
  --event-slug=2027k-hellorun-challenge \
  --apply \
  --batch-size=100 \
  --confirm-event-slug=2027k-hellorun-challenge
```

Both scripts default to dry-run. Apply mode requires the event slug a second time.
The backfill reports scanned, eligible, existing, prospective, issued, skipped, and
failure counts. It processes stable `_id` batches and can restart safely.

## Rollback

Pause runner access from Bib Design. This clears the released version reference and
disables event opt-in. Keep published versions and assignments for audit and later
reactivation. Migration `029` is additive and constraint-relaxing; do not contract it
during an application rollback. Old application code ignores its new column and table.

## Verification boundary

The following checks ran against repository files or loopback-only development
services:

- syntax, format, documentation, and `git diff --check`: pass;
- full unit suite: pass, including 18 focused race-bib checks;
- full integration suite: 551/551 pass;
- isolated smoke workflows: 61/61 pass;
- race-bib template checks cover all families, bundled fonts, 1-, 4-, 6-, and
  12-digit numbers, long text, missing art, deterministic output, and social wrapping;
- isolated issuance and hybrid-policy integration checks: 2/2 pass;
- existing on-site and payment regression integration checks: 25/25 pass;
- route modules load without startup errors;
- isolated 2027k release dry-run: one assignment, zero conflicts;
- isolated 2027k backfill apply: one scanned, one eligible, one issued;
- repeat isolated backfill dry-run: one existing, zero prospective, zero failures;
- preview PNG: 1800 × 1080; PDF: one 254 × 152.4 mm page;
- PDF raster at 180 DPI: 1800 × 1080, matching PNG bounds with mean absolute
  channel difference 1.16.
- rendered-EJS Chromium checks at 375, 768, and 1200 pixels confirm responsive
  control ordering and the desktop sticky-preview layout;
- generated visual proofs exist under `tmp/race-bib-template-proof/` for all three
  template families and the square social frame.

The test runner now executes unit, integration, and smoke groups with the correct
database and visibility isolation. The responsive Chromium pass used the actual EJS
and CSS with fixture data, not an authenticated organizer session.

No production release, backfill, data read, or setting change was performed.
Production 2027k counts therefore remain unknown until an authorized operator runs the
dry-run commands above.
