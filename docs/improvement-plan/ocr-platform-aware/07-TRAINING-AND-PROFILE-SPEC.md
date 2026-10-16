# Tesseract OCR profiles, ground truth and training

## Strategy

Use source-aware OCR configuration before committing to neural fine-tuning. Tesseract does not learn directly from a corrected database field. Fine-tuning requires verified text-line crop images and literal ground-truth text, then an explicit training process.

Official references to inspect during implementation:
- Tesseract docs: https://tesseract-ocr.github.io/tessdoc/
- Training repository: https://github.com/tesseract-ocr/tesstrain
- Tesseract source: https://github.com/tesseract-ocr/tesseract

Pin versions and verify CLI flags against installed tooling rather than copying stale commands blindly.

## Profile definition

Each platform/layout profile contains:

- `platform`, `layoutId`, `version`, `status` (`draft/test/active/retired`).
- Evidence-based detection patterns for brand text, layout anchors and relative geometry.
- OCR pipeline choices: crop anchors, deskew, grayscale, threshold options, upscale, OCR page segmentation mode, language packs.
- Field extractors for raw text and coordinates with confidence/provenance.
- Parser/normalizer version for distance, time, pace, dates and optional metrics.
- Unit tests and representative validated fixtures; benchmark results, not just profile author confidence.
- Backward-compatible fallback to generic profile on no match.

Profiles must be versioned separately from neural OCR models. Admin can test a new profile on a nonproduction sample and inspect field-level differences before activation.

## Image processing pipeline

1. Validate image headers, decoding, size and resolution.
2. Create immutable original asset reference and derived working copy.
3. Identify available branding and text regions using whole-image OCR and/or safe visual heuristics.
4. Rank candidate profiles with evidence. If uncertain, abstain and use generic profile.
5. Apply profile-specific region localization and preprocessing; never assume identical fixed coordinates across phone resolutions.
6. OCR localized text, preserve bounding boxes/raw transcriptions/confidence.
7. Parse fields, normalize units/time types, run plausibility checks, record contradictions.
8. Send low-confidence/missing/mismatched fields to reviewer.

## Ground-truth preparation

For each example, create `some-sample.png` containing a cropped text line and `some-sample.gt.txt` containing exactly the text visible in that image. Reviewer must confirm pixel/text alignment. Training set should not use only structured outputs like `distance=10.52` unless those bytes appear in the cropped image.

Validate that file pairs exist, transcriptions are not empty, crop contents are readable and approved, duplicates handled and parent activity groups do not cross train/holdout partitions.

## Dataset readiness

- Weekly reminder may fire after 100 **new approved** samples (configurable). This is not a scientific minimum for successful fine-tuning.
- Fine-tuning is only enabled when a dataset quality report passes minimum checks established after Phase 0; representativeness across platform/layout and consent/retention eligibility matter more than a single sample count.
- Inadequate dataset should produce `not ready` status and actionable reasons.

## Training mechanics

Use a compatible base English Tesseract LSTM model. Install and pin `tesstrain` dependencies. Example *conceptual* invocation, subject to tool/version validation:

```bash
make training MODEL_NAME=hellorun START_MODEL=eng
```

Prepare correct `data/hellorun-ground-truth` samples and base model data first. Record base model checksum, dataset manifest hash, flags, environment and start/end times. Do not train via `child_process.exec` with raw admin-supplied args; use validated internal config/argument arrays and worker isolation.

## Model evaluation and release

- Run candidate and current model on a fixed held-out dataset, applying the same downstream profiles when isolating model effect.
- Report CER, exact-field extraction, missing-field rate and per-platform/layout accuracy.
- Separate preprocessing/profile changes from trained-model changes in experiment tracking.
- Require minimum sample coverage and non-regression criteria to be approved by project owner after baseline; do not invent universal success thresholds.
- Never automatically promote a completed training run.
- Keep previous active model and support checksum-verified atomic activation and rollback.

## When fine-tuning is not appropriate

If errors are mostly wrong crop bounds, platform detection, unit parsing, changed layouts, or user-screenshot mismatches, fix those layers first. Neural training helps recognition errors only when representative verified examples show a real, reproducible benefit.
