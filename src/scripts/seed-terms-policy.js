require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const PrivacyPolicy = require('../models/PrivacyPolicy');
const { markdownToHtml } = require('../utils/markdown');
const { sanitizeHtml } = require('../utils/sanitize');

const SOURCE_POLICY_PATH = path.resolve(__dirname, '../../docs/contents/Terms and Conditions.md');
const POLICY_SLUG = 'terms-of-service';
const INITIAL_VERSION = '1.0';

async function seedTermsPolicy() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set.');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existingPolicyCount = await PrivacyPolicy.countDocuments({ slug: POLICY_SLUG });
    if (existingPolicyCount > 0) {
      console.log('Seed skipped: terms and conditions records already exist.');
      process.exit(0);
    }

    const rawContent = await fs.readFile(SOURCE_POLICY_PATH, 'utf8');
    const contentMarkdown = rawContent.replace(/\r\n/g, '\n').trim();

    if (!contentMarkdown) {
      throw new Error('Source terms file is empty.');
    }

    const contentHtml = sanitizeHtml(markdownToHtml(contentMarkdown), {
      allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
      allowedAttributes: {
        a: ['href', 'rel', 'target']
      }
    });

    const now = new Date();

    await PrivacyPolicy.create({
      title: 'HelloRun Terms and Conditions',
      slug: POLICY_SLUG,
      versionNumber: INITIAL_VERSION,
      status: 'published',
      effectiveDate: now,
      contentMarkdown,
      contentHtml,
      summaryOfChanges: 'Initial Terms and Conditions',
      isCurrent: true,
      source: 'seed',
      createdBy: {
        userId: null,
        name: 'System Seed'
      },
      updatedBy: {
        userId: null,
        name: 'System Seed'
      },
      publishedBy: {
        userId: null,
        name: 'System Seed'
      },
      publishedAt: now
    });

    console.log(`Seeded terms and conditions ${INITIAL_VERSION} from docs/contents source.`);
    process.exit(0);
  } catch (error) {
    console.error('Terms and conditions seed failed:', error);
    process.exit(1);
  }
}

seedTermsPolicy();
