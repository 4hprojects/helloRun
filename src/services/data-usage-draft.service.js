'use strict';

const fs = require('fs/promises');
const path = require('path');
const PrivacyPolicy = require('../models/PrivacyPolicy');
const { markdownToHtml } = require('../utils/markdown');
const { sanitizeHtml } = require('../utils/sanitize');
const { nextVersion } = require('./terms-draft.service');

const DATA_USAGE_SLUG = 'data-usage-policy';
const DATA_USAGE_SOURCE = path.resolve(__dirname, '../../docs/policy-markdown-pack/data-usage-policy.md');
const SUMMARY = 'Clarifies the data journey, authorized access, assisted review, private evidence, public results, organizer exports, community records, retention, advertising boundaries, and user controls.';
const ALLOWED_TAGS = ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'];

async function prepareDataUsageDraft(options = {}) {
  const Model = options.Model || PrivacyPolicy;
  const source = String(options.contentMarkdown || await fs.readFile(options.sourceFile || DATA_USAGE_SOURCE, 'utf8'))
    .replace(/\r\n/g, '\n')
    .trim();
  if (!source) throw new Error('Data Usage draft source is empty.');

  const existing = await Model.findOne({ slug: DATA_USAGE_SLUG, status: 'draft', contentMarkdown: source }).lean();
  if (existing) return { created: false, policy: existing };

  const versions = await Model.find({ slug: DATA_USAGE_SLUG }).select('versionNumber').lean();
  const versionNumber = nextVersion(versions.map((item) => item.versionNumber));
  const contentHtml = sanitizeHtml(markdownToHtml(source), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ['href', 'rel', 'target'] }
  });
  const policy = await Model.create({
    title: 'HelloRun Data Usage Policy',
    slug: DATA_USAGE_SLUG,
    versionNumber,
    status: 'draft',
    effectiveDate: null,
    contentMarkdown: source,
    contentMode: 'markdown',
    contentHtml,
    summaryOfChanges: SUMMARY,
    isCurrent: false,
    source: 'admin',
    createdBy: { userId: null, name: 'Data Usage Draft Preparation' },
    updatedBy: { userId: null, name: 'Data Usage Draft Preparation' }
  });
  return { created: true, policy: policy.toObject ? policy.toObject() : policy };
}

module.exports = { DATA_USAGE_SLUG, DATA_USAGE_SOURCE, SUMMARY, prepareDataUsageDraft };
