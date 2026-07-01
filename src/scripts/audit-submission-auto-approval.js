require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');

const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const {
  getSubmissionReviewReasonLabel,
  getSubmissionReviewReasonDescription
} = require('../utils/submission-review-labels');

const CONFIDENCE_BUCKET_BOUNDARIES = [0, 0.3, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0001];
const CONFIDENCE_BUCKET_ORDER = [0, 0.3, 0.5, 0.6, 0.7, 0.8, 0.9, 'missing_or_out_of_range'];
const CONFIDENCE_BUCKET_LABELS = {
  0: '< 0.3',
  0.3: '0.3 - 0.5',
  0.5: '0.5 - 0.6',
  0.6: '0.6 - 0.7 (near-miss below cutoff)',
  0.7: '0.7 - 0.8',
  0.8: '0.8 - 0.9',
  0.9: '0.9 - 1.0',
  missing_or_out_of_range: 'Missing / no confidence recorded'
};

const NO_VALIDATION_SENTINEL = '__no_validation_field__';
const MISSING_OCR_SENTINEL = '__missing_ocrData__';

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    output: '',
    sinceDays: 0
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--output') {
      options.output = String(argv[i + 1] || '').trim();
      i += 1;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length).trim();
    } else if (arg === '--since-days') {
      options.sinceDays = Number(argv[i + 1] || options.sinceDays);
      i += 1;
    } else if (arg.startsWith('--since-days=')) {
      options.sinceDays = Number(arg.slice('--since-days='.length));
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!Number.isFinite(options.sinceDays) || options.sinceDays < 0) {
    throw new Error('--since-days must be zero or a positive number.');
  }

  return options;
}

function defaultOutputPath(now = new Date()) {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  return `logs/submission-auto-approval-audit-${stamp}.json`;
}

function buildBaseMatch(options) {
  const match = { isSmokeTest: { $ne: true } };
  if (options.sinceDays > 0) {
    match.submittedAt = { $gte: new Date(Date.now() - options.sinceDays * 24 * 60 * 60 * 1000) };
  }
  return match;
}

function pct(numerator, denominator) {
  if (!denominator) return null;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function labelReviewReason(code) {
  if (code === NO_VALIDATION_SENTINEL) return 'Legacy doc predates validation schema (no data)';
  if (code === '') return 'Auto-approved / no reason recorded';
  return getSubmissionReviewReasonLabel({ validation: { reviewReason: code } }) || code;
}

function describeReviewReason(code) {
  if (code === NO_VALIDATION_SENTINEL || code === '') return '';
  return getSubmissionReviewReasonDescription({ validation: { reviewReason: code } });
}

function confidenceBucketLabel(bucketId) {
  return CONFIDENCE_BUCKET_LABELS[bucketId] || String(bucketId);
}

function reviewReasonGroupExpr() {
  return {
    $switch: {
      branches: [
        { case: { $eq: [{ $type: '$validation' }, 'missing'] }, then: NO_VALIDATION_SENTINEL }
      ],
      default: { $ifNull: ['$validation.reviewReason', ''] }
    }
  };
}

function buildVolumeAndAgreementPipeline(baseMatch) {
  return [
    { $match: baseMatch },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        statusSubmitted: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
        statusApproved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        statusRejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        autoApprovalEligibleTrue: {
          $sum: { $cond: [{ $eq: ['$validation.autoApprovalEligible', true] }, 1, 0] }
        },
        autoApprovedProxy: {
          $sum: { $cond: [{ $and: [{ $eq: ['$status', 'approved'] }, { $not: '$reviewedBy' }] }, 1, 0] }
        },
        humanApproved: {
          $sum: { $cond: [{ $and: [{ $eq: ['$status', 'approved'] }, '$reviewedBy'] }, 1, 0] }
        },
        missingValidation: { $sum: { $cond: [{ $eq: [{ $type: '$validation' }, 'missing'] }, 1, 0] } },
        missingOcrData: { $sum: { $cond: [{ $eq: [{ $type: '$ocrData' }, 'missing'] }, 1, 0] } }
      }
    }
  ];
}

function buildAgreementMismatchMatch(baseMatch) {
  return {
    ...baseMatch,
    $expr: {
      $ne: [
        { $eq: ['$validation.autoApprovalEligible', true] },
        { $and: [{ $eq: ['$status', 'approved'] }, { $not: '$reviewedBy' }] }
      ]
    }
  };
}

function buildReviewReasonBreakdownPipeline(baseMatch) {
  return [
    { $match: baseMatch },
    {
      $group: {
        _id: reviewReasonGroupExpr(),
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ];
}

function buildForcedReviewOutcomePipeline(baseMatch) {
  return [
    { $match: { ...baseMatch, 'validation.reviewRequired': true } },
    {
      $group: {
        _id: {
          reviewReason: reviewReasonGroupExpr(),
          status: '$status'
        },
        count: { $sum: 1 }
      }
    }
  ];
}

function buildConfidenceHistogramPipeline(baseMatch) {
  return [
    { $match: { ...baseMatch, 'validation.method': 'ocr' } },
    {
      $bucket: {
        groupBy: { $ifNull: ['$ocrData.confidence', -1] },
        boundaries: CONFIDENCE_BUCKET_BOUNDARIES,
        default: 'missing_or_out_of_range',
        output: {
          count: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } }
        }
      }
    }
  ];
}

function buildNameMatchDistributionPipeline(baseMatch) {
  return [
    { $match: baseMatch },
    {
      $group: {
        _id: {
          $switch: {
            branches: [{ case: { $eq: [{ $type: '$ocrData' }, 'missing'] }, then: MISSING_OCR_SENTINEL }],
            default: { $ifNull: ['$ocrData.nameMatchStatus', 'not_checked'] }
          }
        },
        count: { $sum: 1 },
        reviewReasonNameNotMatchedCount: {
          $sum: { $cond: [{ $eq: ['$validation.reviewReason', 'ocr_name_not_matched'] }, 1, 0] }
        },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ];
}

function buildDetectedSourceBreakdownPipeline(baseMatch) {
  return [
    { $match: baseMatch },
    {
      $group: {
        _id: {
          $switch: {
            branches: [{ case: { $eq: [{ $type: '$ocrData' }, 'missing'] }, then: MISSING_OCR_SENTINEL }],
            default: { $ifNull: ['$ocrData.detectedSource', ''] }
          }
        },
        count: { $sum: 1 },
        avgConfidence: { $avg: '$ocrData.confidence' },
        reviewReasons: { $push: { $ifNull: ['$validation.reviewReason', ''] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ];
}

function buildSourceComparisonPipeline(baseMatch) {
  return [
    { $match: baseMatch },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        autoApprovalEligibleTrue: { $sum: { $cond: [{ $eq: ['$validation.autoApprovalEligible', true] }, 1, 0] } },
        autoApprovedProxy: {
          $sum: { $cond: [{ $and: [{ $eq: ['$status', 'approved'] }, { $not: '$reviewedBy' }] }, 1, 0] }
        },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } }
      }
    }
  ];
}

function assembleCollectionReport({
  volumeRows,
  mismatchSamples,
  reviewReasonRows,
  forcedReviewRows,
  confidenceRows,
  nameMatchRows,
  detectedSourceRows,
  sourceComparisonRows
}) {
  const v = volumeRows[0] || {};
  const volume = {
    total: Number(v.total || 0),
    statusSubmitted: Number(v.statusSubmitted || 0),
    statusApproved: Number(v.statusApproved || 0),
    statusRejected: Number(v.statusRejected || 0),
    autoApprovalEligibleTrue: Number(v.autoApprovalEligibleTrue || 0),
    autoApprovedProxy: Number(v.autoApprovedProxy || 0),
    humanApproved: Number(v.humanApproved || 0),
    missingValidation: Number(v.missingValidation || 0),
    missingOcrData: Number(v.missingOcrData || 0),
    eligibilityAgreesWithOutcome: Number(v.autoApprovalEligibleTrue || 0) === Number(v.autoApprovedProxy || 0)
  };

  const mismatchSample = mismatchSamples.map((doc) => ({
    id: String(doc._id),
    status: doc.status,
    reviewedBy: doc.reviewedBy ? String(doc.reviewedBy) : null,
    submittedAt: doc.submittedAt,
    autoApprovalEligible: doc.validation?.autoApprovalEligible ?? null,
    reviewReason: doc.validation?.reviewReason ?? null
  }));

  const reviewReasonBreakdown = reviewReasonRows.map((row) => ({
    code: row._id,
    label: labelReviewReason(row._id),
    description: describeReviewReason(row._id),
    count: row.count,
    percentOfTotal: pct(row.count, volume.total)
  }));
  const reviewReasonTotal = reviewReasonRows.reduce((sum, row) => sum + row.count, 0);
  if (reviewReasonTotal !== volume.total) {
    console.warn(
      `Review-reason breakdown total (${reviewReasonTotal}) does not reconcile with volume total (${volume.total}).`
    );
  }

  const forcedReviewByReason = new Map();
  for (const row of forcedReviewRows) {
    const code = row._id.reviewReason;
    const status = row._id.status;
    if (!forcedReviewByReason.has(code)) {
      forcedReviewByReason.set(code, { code, label: labelReviewReason(code), approved: 0, rejected: 0, submitted: 0 });
    }
    const entry = forcedReviewByReason.get(code);
    if (status === 'approved') entry.approved += row.count;
    else if (status === 'rejected') entry.rejected += row.count;
    else if (status === 'submitted') entry.submitted += row.count;
  }
  const forcedReviewOutcome = Array.from(forcedReviewByReason.values())
    .map((entry) => {
      const total = entry.approved + entry.rejected + entry.submitted;
      return { ...entry, total, approvedAnywayPct: pct(entry.approved, total) };
    })
    .sort((a, b) => (b.approvedAnywayPct ?? -1) - (a.approvedAnywayPct ?? -1));

  const confidenceByBucket = new Map(confidenceRows.map((row) => [row._id, row]));
  const confidenceHistogram = CONFIDENCE_BUCKET_ORDER.map((bucketId) => {
    const row = confidenceByBucket.get(bucketId) || { count: 0, approved: 0, rejected: 0, pending: 0 };
    return {
      bucket: confidenceBucketLabel(bucketId),
      count: row.count,
      approved: row.approved,
      rejected: row.rejected,
      pending: row.pending,
      approvedPct: pct(row.approved, row.count)
    };
  });

  const nameMatchDistribution = nameMatchRows.map((row) => ({
    nameMatchStatus: row._id,
    count: row.count,
    reviewReasonNameNotMatchedCount: row.reviewReasonNameNotMatchedCount,
    approved: row.approved,
    rejected: row.rejected,
    pending: row.pending
  }));

  const detectedSourceBreakdown = detectedSourceRows.map((row) => {
    const reasonCounts = {};
    for (const code of row.reviewReasons) {
      const key = code === '' ? '(auto-approved / none)' : code;
      reasonCounts[key] = (reasonCounts[key] || 0) + 1;
    }
    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([code, count]) => `${code}:${count}`)
      .join(', ');
    return {
      detectedSource: row._id === '' ? 'not_detected/blank' : row._id,
      count: row.count,
      avgConfidence: Number.isFinite(row.avgConfidence) ? Number(row.avgConfidence.toFixed(3)) : null,
      topReviewReasons: topReasons,
      approved: row.approved,
      rejected: row.rejected,
      pending: row.pending
    };
  });

  const sourceComparison = sourceComparisonRows.map((row) => ({
    source: row._id,
    count: row.count,
    autoApprovalEligibleTrue: row.autoApprovalEligibleTrue,
    autoApprovedProxy: row.autoApprovedProxy,
    autoApprovalRate: pct(row.autoApprovedProxy, row.count),
    approved: row.approved,
    rejected: row.rejected,
    pending: row.pending
  }));

  return {
    volume,
    mismatchSample,
    reviewReasonBreakdown,
    forcedReviewOutcome,
    confidenceHistogram,
    nameMatchDistribution,
    detectedSourceBreakdown,
    sourceComparison
  };
}

async function buildCollectionAudit(Model, options) {
  const baseMatch = buildBaseMatch(options);

  const [
    volumeRows,
    mismatchSamples,
    reviewReasonRows,
    forcedReviewRows,
    confidenceRows,
    nameMatchRows,
    detectedSourceRows,
    sourceComparisonRows
  ] = await Promise.all([
    Model.aggregate(buildVolumeAndAgreementPipeline(baseMatch)),
    Model.find(buildAgreementMismatchMatch(baseMatch))
      .select('_id status reviewedBy submittedAt validation.autoApprovalEligible validation.reviewReason')
      .sort({ submittedAt: -1 })
      .limit(25)
      .lean(),
    Model.aggregate(buildReviewReasonBreakdownPipeline(baseMatch)),
    Model.aggregate(buildForcedReviewOutcomePipeline(baseMatch)),
    Model.aggregate(buildConfidenceHistogramPipeline(baseMatch)),
    Model.aggregate(buildNameMatchDistributionPipeline(baseMatch)),
    Model.aggregate(buildDetectedSourceBreakdownPipeline(baseMatch)),
    Model.aggregate(buildSourceComparisonPipeline(baseMatch))
  ]);

  return assembleCollectionReport({
    volumeRows,
    mismatchSamples,
    reviewReasonRows,
    forcedReviewRows,
    confidenceRows,
    nameMatchRows,
    detectedSourceRows,
    sourceComparisonRows
  });
}

function printConsoleSummary(report) {
  for (const [modelName, sub] of Object.entries({
    Submission: report.Submission,
    AccumulatedActivitySubmission: report.AccumulatedActivitySubmission
  })) {
    console.log(`\n=== ${modelName} ===`);
    console.log('-- Volume & agreement --');
    console.table([sub.volume]);
    if (sub.mismatchSample.length) {
      console.warn(
        `${sub.mismatchSample.length} doc(s) where validation.autoApprovalEligible disagrees with the actual (status, reviewedBy) outcome:`
      );
      console.table(sub.mismatchSample);
    }

    console.log('-- Review-reason breakdown --');
    console.table(sub.reviewReasonBreakdown.map(({ code, label, count, percentOfTotal }) => ({ code, label, count, percentOfTotal })));

    console.log('-- Forced-review outcome (sorted by "approved anyway" rate) --');
    console.table(sub.forcedReviewOutcome);

    console.log('-- OCR confidence histogram --');
    console.table(sub.confidenceHistogram);

    console.log('-- Name-match distribution --');
    console.table(sub.nameMatchDistribution);

    console.log('-- Detected-source breakdown --');
    console.table(sub.detectedSourceBreakdown);

    console.log('-- Source comparison (strava vs manual_upload) --');
    console.table(sub.sourceComparison);
  }
}

async function ensureParentDir(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function runAudit(options) {
  const mongoUri = String(process.env.MONGODB_URI || '').trim();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to run the submission auto-approval audit.');
  }

  await mongoose.connect(mongoUri, { dbName: process.env.MONGODB_DB_NAME });

  try {
    const [submissionReport, accumulatedReport] = await Promise.all([
      buildCollectionAudit(Submission, options),
      buildCollectionAudit(AccumulatedActivitySubmission, options)
    ]);

    const report = {
      generatedAt: new Date().toISOString(),
      options,
      Submission: submissionReport,
      AccumulatedActivitySubmission: accumulatedReport
    };

    await ensureParentDir(options.output);
    await fs.writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log(`Submission auto-approval audit complete. Output: ${options.output}`);
    printConsoleSummary(report);

    return report;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

async function main() {
  const options = parseArgs();
  if (!options.output) options.output = defaultOutputPath();
  await runAudit(options);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Submission auto-approval audit failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  defaultOutputPath,
  buildBaseMatch,
  pct,
  labelReviewReason,
  describeReviewReason,
  confidenceBucketLabel,
  buildVolumeAndAgreementPipeline,
  buildAgreementMismatchMatch,
  buildReviewReasonBreakdownPipeline,
  buildForcedReviewOutcomePipeline,
  buildConfidenceHistogramPipeline,
  buildNameMatchDistributionPipeline,
  buildDetectedSourceBreakdownPipeline,
  buildSourceComparisonPipeline,
  assembleCollectionReport,
  buildCollectionAudit,
  runAudit
};
