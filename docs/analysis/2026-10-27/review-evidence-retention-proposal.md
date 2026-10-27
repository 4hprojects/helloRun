# Review Evidence Retention Proposal

**Status:** implementation-ready draft; privacy/legal approval required before publication or disposal
**Scope:** MongoDB `ReviewDecision` records and R2 activity/payment proof objects
**Prepared:** October 27, 2026

## Decision boundary

No production record or object is eligible for automated deletion under this draft. The read-only audit reports inventory and age bands only. A later change must record the approved policy version, effective date, hold process, backup state, exact dry run, and rollback limits before enabling mutation.

Philippine law does not set one universal retention period. Republic Act No. 10173 requires retention only while necessary for the declared purpose, legal claims, legitimate business purposes, or another legal requirement. Its Implementing Rules require a retention schedule and secure disposal. National Privacy Commission Advisory Opinion No. 2017-024 states that records must not be kept indefinitely for an unspecified future use. BIR Revenue Regulations No. 5-2014 require accounting books and supporting records to be preserved for ten years and longer while a relevant tax matter remains unresolved.

## Proposed schedule

| Record | Proposed normal period | End action | Reason |
|---|---|---|---|
| Activity proof object and full activity evidence snapshot | 730 days after the later of final decision or event end | Delete the R2 object; remove proof URL/key/hash, raw OCR, location, device, free-text notes, and duplicate signals from the decision snapshot | Supports correction, event integrity, fraud review, and ordinary disputes without indefinite image retention |
| Minimized activity `ReviewDecision` row | 10 years after the later of final decision or event end | Delete the row or irreversibly aggregate it | Preserves a narrow decision trail during the possible written-contract claim period while removing the high-risk proof payload earlier |
| Payment proof object and full payment decision snapshot | 10 years from the applicable tax-record anchor | Delete the R2 object and decision row unless another required accounting record replaces it | Conservative treatment as a possible accounting source document under BIR Revenue Regulations No. 5-2014 |
| Active review, correction, refund, complaint, incident, tax matter, or legal claim | Until final resolution plus the otherwise applicable period | Release hold, then recompute expiry | Prevents disposal of material evidence during a defined matter |
| Backups | Normal encrypted backup lifecycle; no selective immediate purge promise | Expire or overwrite through the documented backup schedule | Avoids an unsupported deletion promise while keeping restored data subject to the same lifecycle |

The ten-year activity decision period is a conservative proposal based on Civil Code Article 1144. Legal review must confirm whether that period is proportionate for HelloRun's actual agreements and claims. Accounting review must confirm the correct tax-record anchor and whether every uploaded payment proof qualifies as a supporting record.

## Account-deletion rule

Account deletion does not silently erase evidence needed for an active event, payment, dispute, security incident, or hold. It must immediately restrict access and remove account credentials, profile data, integrations, and unrelated data under their own lifecycle.

For review evidence:

1. Delete expired activity proof objects and minimize their decision snapshots.
2. Keep unexpired records restricted to authorized review, privacy, security, and legal roles.
3. Remove free-text fields and direct account links when they are no longer needed for the retained purpose.
4. Keep payment evidence only under the approved accounting rule.
5. Record each denial, restriction, deletion, or hold decision and tell the requester the applicable limitation.

## Hold controls

- Require a case reference, reason code, authorized owner, start time, and review date.
- Review every hold at least every 90 days.
- Never use a generic or permanent hold.
- Block both proof deletion and decision minimization while a relevant hold is active.
- On release, recompute expiry from the original lifecycle anchor. Do not restart the normal period.

## Implemented preparation

`npm run mongo:audit:review-evidence-retention` is read-only. It reports counts by kind and decision, unique proof-reference counts, missing event/runner links, and age bands based on the later of decision time, row creation, or event end. It prints no object keys or personal data and computes no deletion candidates.

The October 27 production run found 260 decision rows: 254 accumulated-activity and six single-run decisions. All 260 had an available runner and event, all fell within the 0–180-day inventory band, and they referenced 224 unique proof-object keys. No payment-proof decision existed. The audit changed nothing.

## Approval gates

- Privacy/legal reviewer approves or revises every period and account-deletion rule.
- Accounting reviewer confirms payment-proof classification and tax anchor.
- Published Privacy and Data Usage policy versions disclose the approved schedule.
- Hold storage, authorization, and review workflow exists before disposal begins.
- Production dry run identifies exact rows and R2 objects without printing sensitive keys.
- Current MongoDB and R2 recovery evidence exists, with documented restore limits.
- Apply requires exact expected counts and produces a non-sensitive operation manifest.

## Primary authorities

- [Republic Act No. 10173, section 11](https://privacy.gov.ph/data-privacy-act/)
- [Implementing Rules and Regulations, sections 19 and 26](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/)
- [NPC Advisory Opinion No. 2017-024](https://privacy.gov.ph/wp-content/uploads/2022/01/NPC_AdvisoryOpinionNo._2017-024.pdf)
- [BIR Revenue Regulations No. 5-2014](https://bir-cdn.bir.gov.ph/BIR/pdf/RR%205-2014.pdf)
- [Civil Code Article 1144 discussion](https://lawphil.net/judjuris/juri2018/jan2018/gr_212472_2018.html)
