# OCR Training Legal Review Packet

**Status:** ready for independent privacy/legal review; not approved or published
**Prepared:** October 27, 2026
**Proposed processing:** use cropped distance, time, and pace text lines from eligible past and future run-proof screenshots to improve OCR under notice and objection

## Safe default

Keep `training.basis=opt_in`. Do not publish the draft wording, select `notice_opt_out`, or backfill historical proof until an authorized reviewer approves the lawful basis and safeguards. The application now requires both published policy versions, an assessment version, approval date, and review reference before notice-based processing can start.

## Processing map

| Stage | Input | Output | Access | Safeguard |
|---|---|---|---|---|
| Eligibility | Image proof, account state, date of birth when known, objection and withdrawal state | Eligible or excluded | Server workflow | Excludes known minors, guests, missing/closed/suspended accounts, objectors, withdrawn entries, and non-images |
| Crop creation | Eligible screenshot and OCR bounding boxes | Small distance/time/pace text-line crops | OCR administrators | No map, face, route, profile photo, or name is intended; administrator must reject a crop containing them |
| Ground-truth review | Crop and OCR reading | Confirmed literal transcription | OCR administrators | Sample stays ineligible until human approval and alignment confirmation |
| Dataset | Approved eligible samples | Versioned training/validation/test membership | OCR administrators and isolated training worker | Activity-group split prevents one screenshot crossing evaluation partitions |
| Model/report | Crops and confirmed text | OCR model; aggregate counts and rates | Restricted model workflow | No image or identifier in aggregate reporting; objection excludes future dataset use |
| Disposal | Sample reaching expiry or objection | Excluded sample and deleted crop | Maintenance worker | Default maximum 730 days; model learning cannot be selectively reversed and notice says so |

## Legitimate-interest assessment draft

### Purpose test

The proposed interest is accurate and consistent reading of runner-submitted evidence. This can reduce transcription errors and inconsistent manual review. The purpose is specific and related to the existing proof-review service.

### Necessity test

Synthetic images and administrator-owned screenshots remain safer sources but may not represent real application layouts and capture conditions. The reviewer must decide whether opt-in collection can provide enough representative material. If it can, notice-based use of historical screenshots is not necessary and must not be approved.

### Balancing test

Factors supporting the proposal are narrow text-line crops, restricted access, human crop review, no effect on the source result, exclusion of known minors, a 30-day historical objection window, continuing objection, and a 730-day maximum.

Factors against it are the unexpected secondary use of old proof, potentially private activity context, imperfect minor detection when birth date is absent, possible names or sensitive details inside OCR bounds, and the inability to remove learning from an already-built model. Historical and rejected submissions increase that impact.

The reviewer must document why the interest is not overridden by those risks. Approval should require evidence that crop review and access controls work in production.

## Required legal decisions

1. Confirm whether legitimate interest under Republic Act No. 10173 section 12(f) is available for these crops.
2. Confirm that no sensitive personal information under section 13 is intentionally used. Define the response when a crop contains health, government identifier, or other sensitive data.
3. Decide whether unknown-age accounts may enter notice-based processing. Safest choice is exclusion unless adult status is known.
4. Decide whether rejected and historical submissions are necessary and proportionate.
5. Confirm the 30-day advance objection period and 730-day sample period.
6. Confirm whether publication must use both the Privacy Policy and Data Usage Policy drafts.
7. Confirm the notice delivery evidence required before the publication date is recorded.
8. Confirm whether the OCR processing system or automated-decision workflow requires NPC registration or an updated registration record.

## Approval record

The approver must provide:

- approved Privacy Policy version;
- approved Data Usage Policy version;
- legitimate-interest assessment identifier and version;
- approval date;
- durable review reference;
- approved notice/publication date;
- any conditions, exclusions, or expiry date.

The admin settings gate records these values. It rejects future approval dates and future notice dates. It forces the historical backfill date to at least 30 days after publication. The backfill rechecks these gates and stops if the basis returns to opt-in.

## Primary authorities

- [Republic Act No. 10173](https://privacy.gov.ph/data-privacy-act/)
- [Implementing Rules and Regulations](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/)
- [NPC Circular No. 2023-07 and official FAQ](https://privacy.gov.ph/pips-and-pics/advisories-circulars/)
- [NPC right to object guidance](https://privacy.gov.ph/right-to-object/)
- [NPC Circular No. 2022-04](https://www.privacy.gov.ph/wp-content/uploads/2023/05/Circular-2022-04.pdf)

This packet maps code and unresolved decisions. It is not legal approval.
