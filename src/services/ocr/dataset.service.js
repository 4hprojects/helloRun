'use strict';

/**
 * Immutable dataset snapshots and Tesseract ground-truth export (Phase 3).
 *
 * Split rule `group-sha256-v1`: each activity group (one screenshot) goes wholly into one
 * split, chosen from a hash of its id, so the same sample always lands in the same split
 * across dataset versions and the held-out test set never leaks into training.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const TrainingSample = require('../../models/TrainingSample');
const { CONSENT_BASES } = require('../../models/TrainingSample');
const DatasetVersion = require('../../models/DatasetVersion');
const { getOcrSettings } = require('./ocr-settings.service');

const SPLIT_RULE = 'group-sha256-v1';
const SPLIT_SALT = 'hellorun-ocr-split-v1';

function assignSplit(activityGroupId) {
  const digest = crypto.createHash('sha256').update(`${SPLIT_SALT}:${String(activityGroupId)}`).digest('hex');
  const bucket = Number.parseInt(digest.slice(0, 8), 16) % 100;
  if (bucket < 80) return 'train';
  if (bucket < 90) return 'validation';
  return 'test';
}

function canonicalManifestJson(manifest) {
  return JSON.stringify(manifest.map((entry) => [
    String(entry.sampleId), entry.split, entry.activityGroupId, entry.cropChecksum, entry.transcribedText, entry.platform, entry.layoutId, entry.fieldKey
  ]));
}

function computeManifestHash(manifest) {
  return crypto.createHash('sha256').update(canonicalManifestJson(manifest)).digest('hex');
}

/** Pure: build manifest + quality report from eligible sample rows. */
function buildDatasetPlan(samples, thresholds) {
  const seenChecksums = new Set();
  const duplicates = [];
  const manifest = [];
  const sorted = samples.slice().sort((a, b) => String(a._id).localeCompare(String(b._id)));
  for (const sample of sorted) {
    if (seenChecksums.has(sample.cropChecksum)) {
      duplicates.push(String(sample._id));
      continue;
    }
    seenChecksums.add(sample.cropChecksum);
    manifest.push({
      sampleId: sample._id,
      split: assignSplit(sample.activityGroupId),
      activityGroupId: sample.activityGroupId,
      cropKey: sample.cropKey,
      cropChecksum: sample.cropChecksum,
      transcribedText: String(sample.transcribedText || '').trim(),
      platform: sample.platform || 'unknown',
      layoutId: sample.layoutId || '',
      fieldKey: sample.fieldKey || ''
    });
  }

  const counts = { total: manifest.length, train: 0, validation: 0, test: 0, groups: 0 };
  const groupSplits = new Map();
  const platformDistribution = {};
  for (const entry of manifest) {
    counts[entry.split] += 1;
    if (!groupSplits.has(entry.activityGroupId)) groupSplits.set(entry.activityGroupId, new Set());
    groupSplits.get(entry.activityGroupId).add(entry.split);
    platformDistribution[entry.platform] = platformDistribution[entry.platform] || { train: 0, validation: 0, test: 0 };
    platformDistribution[entry.platform][entry.split] += 1;
  }
  counts.groups = groupSplits.size;
  const leakingGroups = [...groupSplits.entries()].filter(([, splits]) => splits.size > 1).map(([group]) => group);
  const emptyTranscriptions = manifest.filter((entry) => !entry.transcribedText).length;

  const checks = [
    { id: 'min_approved_samples', passed: counts.total >= thresholds.minApprovedSamples, detail: `${counts.total} / ${thresholds.minApprovedSamples}` },
    { id: 'min_test_samples', passed: counts.test >= thresholds.minTestSamples, detail: `${counts.test} / ${thresholds.minTestSamples}` },
    { id: 'min_validation_samples', passed: counts.validation >= thresholds.minValidationSamples, detail: `${counts.validation} / ${thresholds.minValidationSamples}` },
    { id: 'no_split_leakage', passed: leakingGroups.length === 0, detail: `${leakingGroups.length} groups in more than one split` },
    { id: 'no_empty_transcriptions', passed: emptyTranscriptions === 0, detail: `${emptyTranscriptions} empty` },
    { id: 'duplicates_removed', passed: true, detail: `${duplicates.length} duplicate crops skipped` }
  ];
  if (thresholds.minSamplesPerPlatform > 0) {
    for (const [platform, splits] of Object.entries(platformDistribution)) {
      const total = splits.train + splits.validation + splits.test;
      checks.push({ id: `min_samples_${platform}`, passed: total >= thresholds.minSamplesPerPlatform, detail: `${total} / ${thresholds.minSamplesPerPlatform}` });
    }
  }
  if (!thresholds.thresholdsApprovedByOwner) {
    checks.push({ id: 'thresholds_approved_by_owner', passed: false, detail: 'Dataset readiness thresholds are placeholders until the project owner approves them in Settings.' });
  }
  const notReadyReasons = checks.filter((check) => !check.passed).map((check) => `${check.id}: ${check.detail}`);
  return {
    manifest,
    counts,
    platformDistribution,
    checks,
    duplicates,
    leakingGroups,
    manifestHash: computeManifestHash(manifest),
    validationStatus: notReadyReasons.length ? 'not_ready' : 'ready',
    notReadyReasons
  };
}

async function loadEligibleSamples(now = new Date()) {
  return TrainingSample.find({
    status: 'approved',
    eligibility: 'eligible',
    cropDeletedAt: null,
    consentBasis: { $in: CONSENT_BASES },
    alignmentConfirmed: true,
    transcribedText: { $gt: '' },
    $or: [{ retentionExpiry: null }, { retentionExpiry: { $gt: now } }]
  }).select('_id activityGroupId cropKey cropChecksum transcribedText platform layoutId fieldKey consentBasis').lean();
}

/** Create an immutable snapshot of every currently eligible sample. */
async function createDatasetVersion({ name, createdBy }) {
  const settings = await getOcrSettings({ fresh: true });
  const samples = await loadEligibleSamples();
  const plan = buildDatasetPlan(samples, settings.dataset);
  const bases = {};
  for (const sample of samples) bases[sample.consentBasis] = (bases[sample.consentBasis] || 0) + 1;
  const dataset = await DatasetVersion.create({
    name: String(name || '').trim().slice(0, 80) || `dataset-${new Date().toISOString().slice(0, 10)}`,
    manifestHash: plan.manifestHash,
    splitRule: SPLIT_RULE,
    manifest: plan.manifest,
    counts: plan.counts,
    platformDistribution: plan.platformDistribution,
    qualityReport: { checks: plan.checks, thresholds: settings.dataset },
    consentCheck: { allConsented: samples.every((sample) => Boolean(sample.consentBasis)), bases },
    validationStatus: plan.validationStatus,
    notReadyReasons: plan.notReadyReasons,
    createdBy: createdBy || null
  });
  if (plan.manifest.length) {
    await TrainingSample.updateMany(
      { _id: { $in: plan.manifest.map((entry) => entry.sampleId) } },
      { $addToSet: { datasetMemberships: dataset._id } }
    );
  }
  return dataset;
}

function safeFileStem(sampleId) {
  return String(sampleId).replace(/[^a-f0-9]/gi, '').slice(0, 40);
}

/**
 * Write a dataset to disk in tesstrain layout:
 *   <outDir>/ground-truth/<id>.png + <id>.gt.txt   (train + validation splits)
 *   <outDir>/test/<id>.png + <id>.gt.txt           (held-out test split, never trained on)
 * Every crop's checksum is verified against the manifest before it is written.
 */
async function materializeDataset(dataset, outDir, { readObject } = {}) {
  if (!readObject) {
    const upload = require('../upload.service');
    readObject = (key) => upload.getObjectBufferFromR2(key, { bucket: upload.getPrivateBucketName(), maxBytes: 5 * 1024 * 1024 });
  }
  const groundTruthDir = path.join(outDir, 'ground-truth');
  const testDir = path.join(outDir, 'test');
  fs.mkdirSync(groundTruthDir, { recursive: true });
  fs.mkdirSync(testDir, { recursive: true });
  const written = { train: 0, validation: 0, test: 0 };
  for (const entry of dataset.manifest) {
    const buffer = await readObject(entry.cropKey);
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    if (checksum !== entry.cropChecksum) {
      const error = new Error(`Crop checksum mismatch for sample ${entry.sampleId}.`);
      error.code = 'checksum_mismatch';
      throw error;
    }
    const dir = entry.split === 'test' ? testDir : groundTruthDir;
    const stem = safeFileStem(entry.sampleId);
    fs.writeFileSync(path.join(dir, `${stem}.png`), buffer);
    fs.writeFileSync(path.join(dir, `${stem}.gt.txt`), `${entry.transcribedText}\n`, 'utf8');
    written[entry.split] += 1;
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({
    datasetId: String(dataset._id),
    name: dataset.name,
    manifestHash: dataset.manifestHash,
    splitRule: dataset.splitRule,
    counts: dataset.counts
  }, null, 2));
  return { groundTruthDir, testDir, written };
}

/** Recompute the hash from stored rows: proves a snapshot was not altered. */
function verifyDatasetIntegrity(dataset) {
  return computeManifestHash(dataset.manifest) === dataset.manifestHash;
}

async function listDatasets(limit = 20) {
  return DatasetVersion.find({}).sort({ createdAt: -1 }).limit(limit).select('-manifest').lean();
}

module.exports = {
  SPLIT_RULE,
  assignSplit,
  computeManifestHash,
  buildDatasetPlan,
  loadEligibleSamples,
  createDatasetVersion,
  materializeDataset,
  verifyDatasetIntegrity,
  listDatasets
};
