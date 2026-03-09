require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const PrivacyPolicy = require('../models/PrivacyPolicy');
const { markdownToHtml } = require('../utils/markdown');
const { sanitizeHtml } = require('../utils/sanitize');

const SOURCE_POLICY_PATH = path.resolve(__dirname, '../../docs/contents/Cookie Policy.md');
const POLICY_SLUG = 'cookie-policy';
const INITIAL_VERSION = '1.0';

async function seedCookiePolicy() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set.');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existingPolicyCount = await PrivacyPolicy.countDocuments({ slug: POLICY_SLUG });
    if (existingPolicyCount > 0) {
      console.log('Seed skipped: cookie policy records already exist.');
      process.exit(0);
    }

    const rawContent = await fs.readFile(SOURCE_POLICY_PATH, 'utf8');
    const contentMarkdown = rawContent.replace(/\r\n/g, '\n').trim();

    if (!contentMarkdown) {
      throw new Error('Source cookie policy file is empty.');
    }

    const contentHtml = sanitizeHtml(markdownToHtml(contentMarkdown), {
      allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
      allowedAttributes: {
        a: ['href', 'rel', 'target']
      }
    });

    const now = new Date();

    await PrivacyPolicy.create({
      title: 'HelloRun Cookie Policy',
      slug: POLICY_SLUG,
      versionNumber: INITIAL_VERSION,
      status: 'published',
      effectiveDate: now,
      contentMarkdown,
      contentHtml,
      summaryOfChanges: 'Initial Cookie Policy',
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

    console.log(`Seeded cookie policy ${INITIAL_VERSION} from docs/contents source.`);
    process.exit(0);
  } catch (error) {
    console.error('Cookie policy seed failed:', error);
    process.exit(1);
  }
}

seedCookiePolicy();
