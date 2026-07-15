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
  const publishCurrent = options.publishCurrent === true;

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
    const existingCurrent = await PrivacyPolicy.findOne({
      slug: policyDocument.slug,
      status: 'published',
      isCurrent: true
    }).lean();

    if (existingCurrent && !publishCurrent) {
      skipped.push(policyDocument.title);
      continue;
    }

    if (existingCurrent && normalizeMarkdown(existingCurrent.contentMarkdown) === contentMarkdown) {
      skipped.push(`${policyDocument.title} (already current)`);
      continue;
    }

    const existingPolicyCount = await PrivacyPolicy.countDocuments({ slug: policyDocument.slug });
    const versionNumber = existingPolicyCount > 0
      ? await getNextVersionNumber(policyDocument.slug, existingCurrent?.versionNumber)
      : INITIAL_VERSION;

    if (existingPolicyCount > 0 && !publishCurrent) {
      skipped.push(policyDocument.title);
      continue;
    }

    await PrivacyPolicy.updateMany(
      { slug: policyDocument.slug, isCurrent: true },
      { $set: { isCurrent: false } }
    );

    await PrivacyPolicy.create({
      title: policyDocument.dbTitle,
      slug: policyDocument.slug,
      versionNumber,
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

    seeded.push(`${policyDocument.title} v${versionNumber}`);
  }

  return { seeded, skipped };
}

async function runCli() {
  try {
    const result = await seedPolicies(parseCliOptions(process.argv.slice(2)));
    console.log(`Seeded policies: ${result.seeded.length ? result.seeded.join(', ') : 'none'}`);
    console.log(`Skipped existing policies: ${result.skipped.length ? result.skipped.join(', ') : 'none'}`);
    process.exit(0);
  } catch (error) {
    console.error('Policy seed failed:', error);
    process.exit(1);
  }
}

function parseCliOptions(args = []) {
  const options = {};
  for (const arg of args) {
    if (arg === '--publish-current') {
      options.publishCurrent = true;
      continue;
    }
    if (arg.startsWith('--keys=')) {
      options.policyKeys = arg
        .slice('--keys='.length)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return options;
}

async function getNextVersionNumber(slug, currentVersionNumber) {
  const base = parseVersionNumber(currentVersionNumber);
  for (let minor = base.minor + 1; minor < base.minor + 100; minor += 1) {
    const candidate = `${base.major}.${minor}`;
    const exists = await PrivacyPolicy.exists({ slug, versionNumber: candidate });
    if (!exists) return candidate;
  }
  return `${base.major + 1}.0`;
}

function parseVersionNumber(value) {
  const match = String(value || INITIAL_VERSION).trim().match(/^(\d+)(?:\.(\d+))?/);
  if (!match) return { major: 1, minor: 0 };
  return {
    major: Number(match[1]) || 1,
    minor: Number(match[2]) || 0
  };
}

function normalizeMarkdown(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

if (require.main === module) {
  runCli();
}

module.exports = {
  seedPolicies,
  parseCliOptions
};
