# OCR Improvement Plan

## Summary

HelloRun uses browser-side Tesseract.js plus local parsing rules for activity proof screenshots. The current approach remains the right production baseline, but user-submitted samples in `docs/image_test` show recurring parser and preprocessing gaps.

This plan is based on local sample images and recent database OCR payloads. The real OCR usage is concentrated in accumulated-distance submissions. Recent rows showed many successful Strava parses, but several `unknown` source detections, noisy COROS detections, compact Strava metric rows, and false mismatches from missing optional values being stored as `0`.

## Image Findings

The sample set contains:

- Tall Strava mobile screenshots with route maps and metric cards.
- Dark-mode Strava screenshots.
- Cropped activity cards with only metrics visible.
- COROS route/elevation screenshots with map labels and compact metric panels.
- Non-proof images such as certificates, form screenshots, and unrelated educational screenshots.

The highest-impact failures are:

- Strava screenshots where OCR misses the literal word `Strava`.
- OCR text like `1214 km` that should be read as `12.14 km` only in distance metric rows.
- Wall-clock timestamps such as `Today at 18:57` being confused with elapsed time.
- COROS text misread as `COoOROS`.
- COROS metric rows where elevation appears before the `Elev Gain` label.
- Missing elevation or steps becoming `0` in saved OCR metadata.

## Implemented Direction

- Keep frontend Tesseract.js as the OCR engine.
- Improve parser rules around source detection, Strava metric grids, COROS metric grids, and wall-clock stripping.
- Add multi-pass preprocessing:
  - full preprocessed image
  - lower metric crop for tall screenshots
  - dark-enhanced pass for dark screenshots
  - original image fallback
- Merge OCR pass results by available field quality instead of relying on the first pass only.
- Store parser metadata for future debugging:
  - `parserVersion`
  - `ocrPass`
  - `qualityFlags`
- Preserve manual correction as the final source of truth.

## Storage Notes

OCR payloads remain in MongoDB and are not synced to Supabase official submission tables.

Both single-activity and accumulated-activity submission OCR payloads support:

- `detectedSource: coros`
- optional parser version
- optional OCR pass label
- optional quality flags

No migration is required. Existing rows with `detectedSource: unknown` remain unchanged.

## Test Checklist

Parser regressions should cover:

- Strava `1214 km` in a metric row parses as `12.14 km`, not `214 km`.
- `Today at 18:57` does not become elapsed time.
- Noisy `COoOROS` source text detects as `coros`.
- COROS `351.` near `Elev Gain` parses as elevation gain.
- Missing elevation and steps remain `null`.
- Non-proof images/text produce no autofillable activity data.

Core validation commands:

```text
node --test --test-concurrency=1 tests/ocr-proof-reader.unit.test.js
node --test --test-concurrency=1 tests/run-proof-integrity.unit.test.js
node --test --test-concurrency=1 tests/submission-integrity.integration.test.js
```

## Future Follow-Up

- Add a debug-only OCR fixture runner that can process local files in `docs/image_test` without committing user images.
- Add a curated source dictionary for more Philippines locations beyond the current Baguio/COROS map-label support.
- Consider a server-side OCR fallback only if browser OCR accuracy or device performance remains insufficient after parser improvements.
