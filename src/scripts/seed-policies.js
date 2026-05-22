require('dotenv').config();
const fs = require('fs/promises');
const mongoose = require('mongoose');
const PrivacyPolicy = require('../models/PrivacyPolicy');
const { listPolicyDocuments, getPolicyByKey } = require('../services/policy-registry.service');
const { markdownToHtml } = require('../utils/markdown');
const { sanitizeHtml } = require('../utils/sanitize');

const INITIAL_VERSION = '1.0';
const ALLOWED_TAGS = ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'];
const ALLOWED_ATTRIBUTES = {
  a: ['href', 'rel', 'target']
};

async function seedPolicies(options = {}) {
  const policyKeys = Array.isArray(options.policyKeys) && options.policyKeys.length
    ? options.policyKeys
    : listPolicyDocuments().map((policy) => policy.key);

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set.');
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  }

  const seeded = [];
  const skipped = [];

  for (const key of policyKeys) {
    const policyDocument = getPolicyByKey(key);
    if (!policyDocument) {
      throw new Error(`Unknown policy key: ${key}`);
    }

    const existingPolicyCount = await PrivacyPolicy.countDocuments({ slug: policyDocument.slug });
    if (existingPolicyCount > 0) {
      skipped.push(policyDocument.title);
      continue;
    }

    const rawContent = await fs.readFile(policyDocument.sourceFile, 'utf8');
    const contentMarkdown = rawContent.replace(/\r\n/g, '\n').trim();
    if (!contentMarkdown) {
      throw new Error(`Source policy file is empty: ${policyDocument.sourceFile}`);
    }

    const contentHtml = sanitizeHtml(markdownToHtml(contentMarkdown), {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: ALLOWED_ATTRIBUTES
    });
    const now = new Date();

    await PrivacyPolicy.create({
      title: policyDocument.dbTitle,
      slug: policyDocument.slug,
      versionNumber: INITIAL_VERSION,
      status: 'published',
      effectiveDate: now,
      contentMarkdown,
      contentHtml,
      summaryOfChanges: policyDocument.summaryOfChanges,
      isCurrent: true,
      source: 'seed',
      createdBy: { userId: null, name: 'System Seed' },
      updatedBy: { userId: null, name: 'System Seed' },
      publishedBy: { userId: null, name: 'System Seed' },
      publishedAt: now
    });

    seeded.push(policyDocument.title);
  }

  return { seeded, skipped };
}

async function runCli() {
  try {
    const result = await seedPolicies();
    console.log(`Seeded policies: ${result.seeded.length ? result.seeded.join(', ') : 'none'}`);
    console.log(`Skipped existing policies: ${result.skipped.length ? result.skipped.join(', ') : 'none'}`);
    process.exit(0);
  } catch (error) {
    console.error('Policy seed failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  seedPolicies
};
