'use strict';

const fs = require('fs/promises');
const path = require('path');
const PrivacyPolicy = require('../models/PrivacyPolicy');
const { markdownToHtml } = require('../utils/markdown');
const { sanitizeHtml } = require('../utils/sanitize');
const { nextVersion } = require('./terms-draft.service');

const REFUND_POLICY_SLUG = 'refund-and-cancellation-policy';
const REFUND_POLICY_SOURCE = path.resolve(__dirname, '../../docs/policy-markdown-pack/refund-and-cancellation-policy.md');
const REFUND_POLICY_LEGACY_SOURCE = path.resolve(__dirname, '../../docs/contents/Refund and Cancellation Policy.md');
const BASELINE_EFFECTIVE_DATE = new Date('2026-05-23T00:00:00+08:00');
const SUMMARY = 'Clarifies cancellation versus refund processing, organizer and provider responsibilities, duplicate or rejected payments, event changes, shop fulfilment, request preparation, and applicable remedies.';
const ALLOWED_TAGS = ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'];

function normalizeMarkdown(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function renderPolicyHtml(source) {
  return sanitizeHtml(markdownToHtml(source), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ['href', 'rel', 'target'] }
  });
}

function toPlain(value) {
  return value?.toObject ? value.toObject() : value;
}

async function prepareRefundPolicyDraft(options = {}) {
  const Model = options.Model || PrivacyPolicy;
  const draftSource = normalizeMarkdown(options.contentMarkdown || await fs.readFile(options.sourceFile || REFUND_POLICY_SOURCE, 'utf8'));
  const legacySource = normalizeMarkdown(options.legacyMarkdown || await fs.readFile(options.legacySourceFile || REFUND_POLICY_LEGACY_SOURCE, 'utf8'));
  if (!draftSource) throw new Error('Refund Policy draft source is empty.');
  if (!legacySource) throw new Error('Refund Policy legacy baseline source is empty.');

  let baseline = await Model.findOne({ slug: REFUND_POLICY_SLUG, status: 'published', isCurrent: true }).lean();
  let baselineCreated = false;
  if (!baseline) {
    baseline = toPlain(await Model.create({
      title: 'HelloRun Refund and Cancellation Policy',
      slug: REFUND_POLICY_SLUG,
      versionNumber: '1.0',
      status: 'published',
      effectiveDate: BASELINE_EFFECTIVE_DATE,
      publishedAt: BASELINE_EFFECTIVE_DATE,
      contentMarkdown: legacySource,
      contentMode: 'markdown',
      contentHtml: renderPolicyHtml(legacySource),
      summaryOfChanges: 'Initial Refund and Cancellation Policy',
      isCurrent: true,
      source: 'seed',
      createdBy: { userId: null, name: 'Refund Policy Baseline Preparation' },
      updatedBy: { userId: null, name: 'Refund Policy Baseline Preparation' },
      publishedBy: { userId: null, name: 'Refund Policy Baseline Preparation' },
      noticeDispatch: { status: 'none' }
    }));
    baselineCreated = true;
  }

  const existingDraft = await Model.findOne({ slug: REFUND_POLICY_SLUG, status: 'draft', contentMarkdown: draftSource }).lean();
  if (existingDraft) return { baselineCreated, baseline, draftCreated: false, policy: existingDraft };

  const versions = await Model.find({ slug: REFUND_POLICY_SLUG }).select('versionNumber').lean();
  const versionNumber = nextVersion(versions.map((item) => item.versionNumber));
  const policy = toPlain(await Model.create({
    title: 'HelloRun Refund and Cancellation Policy',
    slug: REFUND_POLICY_SLUG,
    versionNumber,
    status: 'draft',
    effectiveDate: null,
    contentMarkdown: draftSource,
    contentMode: 'markdown',
    contentHtml: renderPolicyHtml(draftSource),
    summaryOfChanges: SUMMARY,
    isCurrent: false,
    source: 'admin',
    createdBy: { userId: null, name: 'Refund Policy Draft Preparation' },
    updatedBy: { userId: null, name: 'Refund Policy Draft Preparation' }
  }));
  return { baselineCreated, baseline, draftCreated: true, policy };
}

module.exports = {
  BASELINE_EFFECTIVE_DATE,
  REFUND_POLICY_LEGACY_SOURCE,
  REFUND_POLICY_SLUG,
  REFUND_POLICY_SOURCE,
  SUMMARY,
  prepareRefundPolicyDraft
};
