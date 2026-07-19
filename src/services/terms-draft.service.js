'use strict';

const fs = require('fs/promises');
const path = require('path');
const PrivacyPolicy = require('../models/PrivacyPolicy');
const { markdownToHtml } = require('../utils/markdown');
const { sanitizeHtml } = require('../utils/sanitize');

const TERMS_SLUG = 'terms-of-service';
const TERMS_SOURCE = path.resolve(__dirname, '../../docs/policy-markdown-pack/terms-and-conditions.md');
const SUMMARY = 'Clarifies operator identity, event authority, safety, payment and activity review, accumulated progress, recognition, community content, privacy, and update notices.';
const ALLOWED_TAGS = ['h1','h2','h3','h4','p','br','strong','em','ul','ol','li','blockquote','a','code','pre','hr'];

function nextVersion(values = []) {
  let best = { major: 1, minor: 0 };
  for (const value of values) {
    const match = String(value || '').match(/^(\d+)(?:\.(\d+))?/);
    if (!match) continue;
    const candidate = { major: Number(match[1]), minor: Number(match[2] || 0) };
    if (candidate.major > best.major || (candidate.major === best.major && candidate.minor > best.minor)) best = candidate;
  }
  return `${best.major}.${best.minor + 1}`;
}

async function prepareTermsDraft(options = {}) {
  const Model = options.Model || PrivacyPolicy;
  const source = String(options.contentMarkdown || await fs.readFile(options.sourceFile || TERMS_SOURCE, 'utf8')).replace(/\r\n/g, '\n').trim();
  if (!source) throw new Error('Terms draft source is empty.');

  const existing = await Model.findOne({ slug: TERMS_SLUG, status: 'draft', contentMarkdown: source }).lean();
  if (existing) return { created: false, policy: existing };

  const versions = await Model.find({ slug: TERMS_SLUG }).select('versionNumber').lean();
  const versionNumber = nextVersion(versions.map((item) => item.versionNumber));
  const contentHtml = sanitizeHtml(markdownToHtml(source), { allowedTags: ALLOWED_TAGS, allowedAttributes: { a: ['href','rel','target'] } });
  const policy = await Model.create({
    title: 'HelloRun Terms and Conditions', slug: TERMS_SLUG, versionNumber, status: 'draft',
    effectiveDate: null, contentMarkdown: source, contentMode: 'markdown', contentHtml,
    summaryOfChanges: SUMMARY, isCurrent: false, source: 'admin',
    createdBy: { userId: null, name: 'Terms Draft Preparation' },
    updatedBy: { userId: null, name: 'Terms Draft Preparation' }
  });
  return { created: true, policy: policy.toObject ? policy.toObject() : policy };
}

module.exports = { SUMMARY, TERMS_SLUG, TERMS_SOURCE, nextVersion, prepareTermsDraft };
