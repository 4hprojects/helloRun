# Test matrix, acceptance checks and MIT research support

## Baseline and measurements

Report number of screenshots, source platforms, layout types and held-out activities. Calculate metrics independently for each platform/layout; use `N/A` when denominator is zero. Baseline and candidate must be tested on the same fixed held-out set.

| Measure | Definition |
|---|---|
| Platform detection accuracy | Correct platform predictions / labeled platform examples; report unknown/abstained separately |
| Layout detection accuracy | Correct profile predictions / labeled layout examples |
| CER | Character-level Levenshtein edit count / reference character count on line images |
| Exact-field accuracy | Correct normalized field predictions / evaluable labeled fields |
| Required-field completeness | Required fields extracted / applicable required fields |
| Correction rate | Reviewed fields edited / reviewed extracted fields |
| Comparison coverage | Valid accessible URL comparisons / URL-supplied submissions |
| Incorrect comparison decisions | False match or false mismatch / independently reviewed comparisons |
| Review time | Median and percentile review duration per submission |
| Latency | Median, p95 processing time by source platform/profile |
| Resource overhead | Peak worker CPU, RSS memory, disk and model artifact sizes |

Define canonical normalization rules before scoring. Exact field metrics must account for units and allowed rounding, not silently conflate moving time and elapsed time.

## Experimental conditions for MIT capstone

A. Unmodified baseline Tesseract configuration.  
B. Preprocessing + platform extraction profile.  
C. Profile/rules improved with approved reviewer error analysis (no network weight update).  
D. Fine-tuned model evaluated on the same held-out set.  
E. URL-assisted verification, measured separately for reviewer accuracy/time and discrepancy detection.

Never claim E improves OCR neural recognition directly. Report CER and exact fields for A–D; verification outcomes for E. Pre-register test groups and key outcomes if capstone research design permits. Document possible selection bias from URL opt-in, public activity access, screenshots contributed by frequent users, and app layout changes.

## Automated test matrix

### Parser and detection

- Strava, COROS and Garmin recognized from genuine labeled screenshot evidence.
- Android/iOS/web/share card where observed; unknown layouts do not get falsely confident labels.
- Logo missing, ambiguous branding, URL-screenshot provider mismatch, poor quality, no URL.
- Distance miles/km, pace min/mile/min/km, decimal comma, varying time representations, locale/date/timezone.
- Missing values, cropped text, distorted scans, conflicting labels, moving-vs-elapsed distinction.

### URL verification

- Recognized exact provider host and route, unknown domain, URL shortener, redirects, Unicode/punycode lookalike, malformed URL.
- SSRF prevention including localhost, IPv4/IPv6 private ranges, DNS rebinding/hops, metadata IP, long response and redirect loop.
- Private/expired/unauthorized link, rate-limit, 404, provider outage, mismatched screenshot, duplicate activity ID.
- No URL and unsupported provider still allow normal screenshot submission.

### Review / dataset

- Reviewer cannot edit another event without permission; participant cannot access another person's proof.
- OCR value correction persists distinct from literal image transcription.
- Incorrect or duplicate crop excluded; reviewer action audited.
- Consent/retention ineligible samples do not enter training dataset; image-text crop alignment validated.
- Activity-group based partition prevents cross-split leakage; dataset hash is reproducible and immutable.

### Training / deployment

- Idempotent double-click Start; second concurrent training rejected or queued according to documented rules.
- Dataset validation, failed resource preflight, worker crash/restart, cancel, network interruption and disk-full conditions.
- Tesseract version and start model pinned; model artifacts checksum-verified.
- Candidate worse on a platform cannot silently replace production.
- Activation requires privilege and approval; migration/activation failure leaves old model working.
- Atomic activation and tested rollback, with accurate audit trail.

### Email and operations

- Weekly actionable only; configurable threshold, opt-out, timezone/DST, late scheduler, process restart and duplicate scheduler.
- Completion/failure/approval alerts sent to correct admins; idempotent events; failure retry with bounded backoff.
- Templates contain no private screenshots, raw activity data or access tokens.
- Web app stays responsive during training under resource limits; queue prioritizes inference.

## Release gates

- Existing submission, reviewer approval, event totals and user-facing pages pass regression tests.
- Threat-model fixes or documented accepted risks approved.
- Accessibility and mobile layout tested for all new admin routes.
- Performance baseline and candidate reports contain real counts/results, not mock numbers.
- Feature flags, DB migration, monitoring, data retention and rollback rehearsed in staging.
- Reviewer workflow tested using actual appropriately permissioned screenshots.
- No merge/deploy before owner authorization.

## Research exports

Provide de-identified experiment ID, dataset version, model/profile version, platform/layout, sample counts, metric definitions, confidence intervals where appropriate, time points, reviewer effort summary and exclusion criteria. Never export contact details, raw URLs with identifying tokens, or route coordinates without explicit protocol and authorization.
