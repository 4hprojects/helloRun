const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const PrivacyPolicy = require('../src/models/PrivacyPolicy');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3112;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;

test.before(async () => {
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT)
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
});

test('signup records accepted privacy policy version and organizer status', async () => {
  const { policyId, versionNumber } = await ensureCurrentPrivacyPolicy();
  const { termsPolicyId, termsVersionNumber } = await ensureCurrentTermsPolicy();
  const { cookiePolicyId, cookieVersionNumber } = await ensureCurrentCookiePolicy();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `phase6.privacy.signup.${stamp}@example.com`;

  const response = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      firstName: 'Phase',
      lastName: 'Six',
      email,
      password: 'Pass1234',
      confirmPassword: 'Pass1234',
      role: 'organiser',
      agreeTerms: 'on'
    }),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  assert.match(response.headers.get('location') || '', /\/verify-email-sent\?email=/);

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const user = await User.findOne({ email }).lean();
    assert.ok(user, 'Expected newly created user.');

    assert.equal(user.role, 'organiser');
    assert.equal(user.organizerStatus, 'not_applied');
    assert.ok(user.termsAcceptedAt, 'Expected termsAcceptedAt timestamp.');

    assert.ok(user.agreedPolicies, 'Expected agreedPolicies object.');
    assert.ok(user.agreedPolicies.agreedAt, 'Expected agreedPolicies.agreedAt.');
    assert.equal(String(user.agreedPolicies.privacyPolicyId || ''), String(policyId));
    assert.equal(user.agreedPolicies.privacyPolicyVersion || '', versionNumber);
    assert.equal(String(user.agreedPolicies.termsPolicyId || ''), String(termsPolicyId));
    assert.equal(user.agreedPolicies.termsPolicyVersion || '', termsVersionNumber);
    assert.equal(String(user.agreedPolicies.cookiePolicyId || ''), String(cookiePolicyId));
    assert.equal(user.agreedPolicies.cookiePolicyVersion || '', cookieVersionNumber);
    assert.ok((user.agreedPolicies.ipAddress || '').length > 0, 'Expected IP address to be captured.');
    assert.ok((user.agreedPolicies.userAgent || '').length > 0, 'Expected user agent to be captured.');
  } finally {
    await mongoose.disconnect();
  }
});

test('signup requires terms/privacy/cookie checkbox consent', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `phase6.privacy.no-consent.${stamp}@example.com`;

  const response = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      firstName: 'Phase',
      lastName: 'NoConsent',
      email,
      password: 'Pass1234',
      confirmPassword: 'Pass1234',
      role: 'runner'
    })
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /must agree to the Terms and Conditions, Privacy Policy, and Cookie Policy/i);

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const user = await User.findOne({ email }).lean();
    assert.equal(user, null);
  } finally {
    await mongoose.disconnect();
  }
});

async function ensureCurrentPrivacyPolicy() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const existing = await PrivacyPolicy.findOne({
      slug: 'privacy-policy',
      status: 'published',
      isCurrent: true
    })
      .select('_id versionNumber')
      .lean();

    if (existing) {
      return {
        policyId: existing._id,
        versionNumber: existing.versionNumber || ''
      };
    }

    const now = new Date();
    const created = await PrivacyPolicy.create({
      title: 'HelloRun Privacy Policy',
      slug: 'privacy-policy',
      versionNumber: '1.0',
      status: 'published',
      effectiveDate: now,
      contentMarkdown: '# Privacy Policy\n\nInitial policy.',
      contentHtml: '<h1>Privacy Policy</h1><p>Initial policy.</p>',
      summaryOfChanges: 'Initial Privacy Policy',
      isCurrent: true,
      source: 'seed',
      createdBy: { userId: null, name: 'Test Seed' },
      updatedBy: { userId: null, name: 'Test Seed' },
      publishedBy: { userId: null, name: 'Test Seed' },
      publishedAt: now
    });

    return {
      policyId: created._id,
      versionNumber: created.versionNumber
    };
  } finally {
    await mongoose.disconnect();
  }
}

async function ensureCurrentTermsPolicy() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const existing = await PrivacyPolicy.findOne({
      slug: 'terms-of-service',
      status: 'published',
      isCurrent: true
    })
      .select('_id versionNumber')
      .lean();

    if (existing) {
      return {
        termsPolicyId: existing._id,
        termsVersionNumber: existing.versionNumber || ''
      };
    }

    const now = new Date();
    const created = await PrivacyPolicy.create({
      title: 'HelloRun Terms and Conditions',
      slug: 'terms-of-service',
      versionNumber: '1.0',
      status: 'published',
      effectiveDate: now,
      contentMarkdown: '# Terms and Conditions\n\nInitial terms.',
      contentHtml: '<h1>Terms and Conditions</h1><p>Initial terms.</p>',
      summaryOfChanges: 'Initial Terms and Conditions',
      isCurrent: true,
      source: 'seed',
      createdBy: { userId: null, name: 'Test Seed' },
      updatedBy: { userId: null, name: 'Test Seed' },
      publishedBy: { userId: null, name: 'Test Seed' },
      publishedAt: now
    });

    return {
      termsPolicyId: created._id,
      termsVersionNumber: created.versionNumber
    };
  } finally {
    await mongoose.disconnect();
  }
}

async function ensureCurrentCookiePolicy() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const existing = await PrivacyPolicy.findOne({
      slug: 'cookie-policy',
      status: 'published',
      isCurrent: true
    })
      .select('_id versionNumber')
      .lean();

    if (existing) {
      return {
        cookiePolicyId: existing._id,
        cookieVersionNumber: existing.versionNumber || ''
      };
    }

    const now = new Date();
    const created = await PrivacyPolicy.create({
      title: 'HelloRun Cookie Policy',
      slug: 'cookie-policy',
      versionNumber: '1.0',
      status: 'published',
      effectiveDate: now,
      contentMarkdown: '# Cookie Policy\n\nInitial cookie policy.',
      contentHtml: '<h1>Cookie Policy</h1><p>Initial cookie policy.</p>',
      summaryOfChanges: 'Initial Cookie Policy',
      isCurrent: true,
      source: 'seed',
      createdBy: { userId: null, name: 'Test Seed' },
      updatedBy: { userId: null, name: 'Test Seed' },
      publishedBy: { userId: null, name: 'Test Seed' },
      publishedAt: now
    });

    return {
      cookiePolicyId: created._id,
      cookieVersionNumber: created.versionNumber
    };
  } finally {
    await mongoose.disconnect();
  }
}

async function waitForServerReady() {
  const timeoutMs = 20000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/login`, { redirect: 'manual' });
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch (_) {
      // Keep polling until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('Server did not become ready in time.');
}
