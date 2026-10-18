# Target architecture and data contracts

The following is logical architecture, not a mandate to replace the established HelloRun stack.

## Components

1. Existing participant submission and reviewer interfaces.
2. Server API: authentication, authorization, upload rules, URL classification, request validation, persistence, and audit.
3. OCR processing pipeline: quarantine/validate image -> preprocess -> detect source/layout -> extract fields -> normalize -> validate -> persist structured evidence.
4. URL verification adapter: parse allowlisted provider URL -> normalize provider activity ID -> check accessibility via authorized means -> optional data comparison -> persist outcome and provenance.
5. Review service: field corrections, event acceptance/rejection, training label approvals (distinct decisions).
6. Storage: original media, derived crops, candidate/model binaries and logs in access-controlled storage with lifecycle rules.
7. Durable job service: OCR, safe URL inspection, dataset build, training, evaluation, reminder processing; separate resource-intensive worker class.
8. Model registry and inference resolver: stable current version and atomic updates; preserve previous version for rollback.
9. Analytics service: metrics by app, layout, model and time period; privacy-minimized research export.

## Core entities (adapt naming to existing schema)

### ActivitySubmission

`id`, `userId`, `eventId`, `originalImageAssetId`, `optionalActivityUrl` (access-controlled), `normalizedProvider`, `providerActivityId`, `uploadStatus`, `sourceDetectionId`, `extractionId`, `verificationId`, `createdAt`, `updatedAt`.

Keep historical submissions valid when URL is null or extraction fails. Submission acceptance must rely on existing event rules plus explicitly approved extensions.

### SourceDetection

`id`, `submissionId`, `platformCandidate`, `layoutProfileId`, `profileVersion`, `signals[]` (`kind`, `confidence`, `evidencePointer`), `confidenceScore`, `confirmedPlatform`, `status`, `resolvedBy`, `resolvedAt`.

Provider inferred from URL and platform inferred from screenshot are separate signals. A mismatch is not automatic fraud.

### OCRExtraction

`id`, `submissionId`, `jobId`, `modelVersionId`, `profileVersion`, `fields` (value, unit, rawText, confidence, boundingBox, sourceRegion), `validationFlags[]`, `elapsedMs`, `errorCode`, `createdAt`.

Write original recognition results immutably; create subsequent revisions for reviewer edits.

### OCRCorrection / ReviewDecision

`id`, `submissionId`, `fieldKey`, `originalValue`, `correctedValue`, `reviewerId`, `reasonCode`, `reviewedAt`, `linkedCropAssetId`, `groundTruthStatus`; and distinct event-level `activityDecision`, `reviewOutcome`, `reason`, `actorId`, `timestamp`.

A correct activity value does **not** prove the screenshot pixels display that same text.

### URLVerification

`id`, `submissionId`, `originalURLReference`, `provider`, `activityId`, `method` (`format_only`, `manual_open`, `authorized_api`), `checkedAt`, `accessStatus`, `fetchedFields` (minimal), `comparisonResults`, `provenance`, `error`, `reviewStatus`.

Avoid persisting full page HTML, arbitrary redirect targets, unnecessary GPS routes or credentials.

### TrainingSample

`id`, `originalScreenshotId`, `cropAssetId`, `cropBoundingBox`, `transcribedText`, `platform`, `layoutVersion`, `reviewerId`, `reviewedAt`, `eligibility`, `consentBasis`, `exclusionReason`, `imageHash`, `activityGroupId`, `datasetMemberships[]`, `retentionExpiry`.

Ground truth is literal text displayed in cropped image; never unreviewed imported API values.

### DatasetVersion

`id`, `manifestHash`, `createdBy`, `createdAt`, `sampleIds`, `splitGroups`, `platformDistribution`, `qualityReport`, `consentCheck`, `validationStatus`.

Snapshot immutable manifests and avoid train/validation/test data leakage.

### TrainingJob

`id`, `requestedBy`, `idempotencyKey`, `datasetVersionId`, `startModelVersionId`, `configHash`, `status`, `progress`, `resources`, `queueId`, `logsAssetId`, `startedAt`, `finishedAt`, `resultModelVersionId`, `errorSummary`.

Status: queued -> preparing -> training -> evaluating -> completed OR failed/cancelled/interrupted. Recovery on restart must be explicit.

### ModelVersion and DeploymentEvent

Model: `id`, `artifactPointer`, `checksum`, `parentModelId`, `datasetVersionId`, `trainingJobId`, `metrics`, `createdAt`, `status`. Deployment: `id`, `oldModelId`, `newModelId`, `approvedBy`, `approvedAt`, `activatedAt`, `rollbackReason`, `auditId`.

Never overwrite model binaries in place. Use atomic activation pointer and verified checksum.

### NotificationPreference / NotificationEvent

`recipientAdminId`, `enabled`, `frequency`, `timezone`, `minimumNewSamples`, `eventTypes`, `lastSummaryAt`; and `eventType`, `eventKey`, `recipientId`, `deliveryStatus`, `providerMessageId`, `attemptCount`, `sentAt`, `errorCode`.

Unique `eventKey + recipientId` or equivalent prevents duplicates.

## Recommended indexes and data ownership

- Submission by `userId,eventId,createdAt`; unique provider activity ID scoped appropriately to detect repeats without assuming same account ownership.
- Review queue by status, source platform, createdAt; training samples by eligibility, platform, layout and timestamp.
- Jobs unique idempotency key, status and creation time; model versions by status/creation time; notification events unique dedupe key.
- Service-bound authorization: ordinary users access own submissions only; reviewers have event-scoped access; model actions are reserved for OCR administrators or super admins.

## Migrations and resilience

- Add nullable fields or new collections; backfill separately and idempotently.
- Keep legacy reads/writes compatible while feature flags are disabled.
- Record a reversible migration or rollback procedure, including API/schema compatibility with previously stored data.
- Ensure background workers cannot run against unsupported schema versions.
