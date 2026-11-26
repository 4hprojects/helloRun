# Reusable Race Bib Generator

**Implementation date:** November 27, 2026  
**Activation state:** opt-in; no production event or registration was changed

## Delivered behavior

HelloRun now has one `landscape_v1` bib renderer for organizer previews,
personalized PNG files, and printable PDF files. It uses an 1800 × 1080 canvas,
managed event or custom artwork, crop controls, fixed text regions, a high-contrast
number panel, and a solid fallback. PDFKit embeds the PNG produced by Sharp, so
preview and print share one layout.

Organizers can save a mutable draft, publish immutable versions, and separately
release one version. Event settings remain disabled by default. Copying transfers
layout, crop, display, color, and print settings only. Destination event assets and
identity are resolved again.

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
- full unit suite: 2,715/2,715 pass;
- full integration suite: 551/551 pass;
- isolated smoke workflows: 61/61 pass;
- race-bib unit checks: 12/12 pass;
- isolated issuance and hybrid-policy integration checks: 2/2 pass;
- existing on-site and payment regression integration checks: 25/25 pass;
- route modules load without startup errors;
- isolated 2027k release dry-run: one assignment, zero conflicts;
- isolated 2027k backfill apply: one scanned, one eligible, one issued;
- repeat isolated backfill dry-run: one existing, zero prospective, zero failures;
- preview PNG: 1800 × 1080; PDF: one 254 × 152.4 mm page;
- PDF raster at 180 DPI: 1800 × 1080, matching PNG bounds with mean absolute
  channel difference 1.16.

The test runner now executes unit, integration, and smoke groups with the correct
database and visibility isolation. A real authenticated Chromium pass at 375, 768,
and 1200 pixels was not run.

No production release, backfill, data read, or setting change was performed.
Production 2027k counts therefore remain unknown until an authorized operator runs the
dry-run commands above.
