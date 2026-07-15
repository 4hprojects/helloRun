'use strict';

// DB-free coverage: certificate records are represented as plain populated
// objects, so this file never opens a MongoDB connection.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const {
  buildPublicCertificateData,
  normalizeCertificateNumber
} = require('../src/services/certificateVerification.service');
const {
  buildVerificationPagePresentation
} = require('../src/controllers/certificateVerification.controller');

const viewPath = path.resolve(__dirname, '../src/views/certificates/verification-result.ejs');

function baseCertificate(overrides = {}) {
  return {
    certificateNumber: 'HR-CERT-2026-TEST-000001',
    status: 'valid',
    runnerName: 'Maria Runner',
    eventTitle: 'Sunrise 10K',
    eventSlug: 'sunrise-10k',
    eventDate: new Date('2026-08-07T00:00:00.000Z'),
    organizerName: 'Hello Striders',
    distance: '10K',
    finishTime: '01:02:03',
    generatedAt: new Date('2026-08-08T00:00:00.000Z'),
    eventLogoUrl: '/uploads/sunrise.webp',
    ...overrides
  };
}

function renderPage(result, overrides = {}) {
  const canonicalUrl = 'https://hellorun.test/certificates/verify/HR-CERT-2026-TEST-000001';
  const presentation = buildVerificationPagePresentation(result, canonicalUrl);
  return new Promise((resolve, reject) => {
    ejs.renderFile(viewPath, {
      title: presentation.title,
      seo: presentation.seo,
      certificateNumber: result.certificate?.certificateNumber || 'HR-CERT-2026-TEST-000001',
      result,
      canonicalUrl,
      shareUrls: presentation.shareUrls,
      currentPath: '/certificates/verify/HR-CERT-2026-TEST-000001',
      renderRunProofModal: false,
      isAuthenticated: false,
      isAdmin: false,
      isFullAdmin: false,
      isOrganizer: false,
      isApprovedOrganizer: false,
      runnerUnreadNotifications: 0,
      user: null,
      flash: null,
      ads: {},
      ...overrides
    }, (error, html) => error ? reject(error) : resolve(html));
  });
}

test('public certificate data includes event date and public event slug', () => {
  const eventDate = new Date('2026-08-07T00:00:00.000Z');
  const publicData = buildPublicCertificateData({
    certificate: {
      certificateNumber: 'HR-CERT-2026-TEST-000001',
      issuedAt: new Date('2026-08-08T00:00:00.000Z')
    },
    eventId: {
      title: 'Sunrise 10K',
      slug: 'sunrise-10k',
      organiserName: 'Hello Striders',
      eventStartAt: eventDate,
      logoUrl: '/uploads/sunrise.webp'
    },
    registrationId: { raceDistance: '10K' },
    runnerId: { firstName: 'Maria', lastName: 'Runner' },
    elapsedMs: 3723000
  });

  assert.equal(publicData.eventSlug, 'sunrise-10k');
  assert.equal(publicData.eventDate, eventDate);
  assert.equal(publicData.runnerName, 'Maria Runner');
  assert.equal(publicData.finishTime, '01:02:03');
});

test('public certificate data provides safe empty event defaults', () => {
  const publicData = buildPublicCertificateData({
    certificate: { certificateNumber: 'HR-CERT-2026-TEST-000001' },
    eventId: {},
    registrationId: {},
    runnerId: {}
  });

  assert.equal(publicData.eventSlug, '');
  assert.equal(publicData.eventDate, null);
  assert.equal(publicData.eventTitle, 'Event unavailable');
});

test('valid certificate presentation uses achievement metadata and runner-aware share copy', () => {
  const result = { found: true, certificate: baseCertificate() };
  const canonicalUrl = 'https://hellorun.test/certificates/verify/HR-CERT-1';
  const presentation = buildVerificationPagePresentation(result, canonicalUrl);

  assert.match(presentation.title, /Maria Runner.*Verified Achievement/);
  assert.match(presentation.seo.ogTitle, /Sunrise 10K Achievement/);
  assert.equal(presentation.seo.robots, undefined);
  assert.match(decodeURIComponent(presentation.shareUrls.x), /Maria Runner officially completed 10K at Sunrise 10K/);
  assert.match(presentation.shareUrls.facebook, /facebook\.com\/sharer/);
  assert.match(presentation.shareUrls.linkedin, /linkedin\.com\/sharing/);
});

test('not-found and revoked presentations are noindex and have no share URLs', () => {
  const canonicalUrl = 'https://hellorun.test/certificates/verify/UNKNOWN';
  for (const result of [
    { found: false, status: 'not_found' },
    { found: true, certificate: baseCertificate({ status: 'revoked' }) }
  ]) {
    const presentation = buildVerificationPagePresentation(result, canonicalUrl);
    assert.equal(presentation.seo.robots, 'noindex, nofollow');
    assert.equal(presentation.shareUrls, null);
    assert.equal(presentation.title, 'Certificate Verification - HelloRun');
  }
});

test('valid page renders marketable achievement content, safe links, and accessible sharing', async () => {
  const certificate = baseCertificate({
    runnerName: 'Maria <img src=x onerror=alert(1)>',
    eventTitle: 'Sunrise & Summit 10K'
  });
  const html = await renderPage({ found: true, certificate });

  assert.match(html, /Verified achievement/i);
  assert.match(html, /Authenticity confirmed/i);
  assert.match(html, /class="certificate-metrics"/);
  assert.match(html, /href="\/events\/sunrise-10k"/);
  assert.match(html, /href="\/events"[^>]*>Discover running events/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Maria &lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /Maria <img src=x/);
});

test('valid page omits unavailable metric cards and does not create an empty event link', async () => {
  const certificate = baseCertificate({
    eventSlug: '',
    eventDate: null,
    generatedAt: null,
    distance: '',
    finishTime: '',
    eventLogoUrl: '',
    organizerName: ''
  });
  const html = await renderPage({ found: true, certificate });

  assert.doesNotMatch(html, /class="certificate-metrics"/);
  assert.doesNotMatch(html, /href="\/events\/"/);
  assert.match(html, /src="\/images\/helloRun-icon\.webp"/);
  assert.match(html, /<dd>HelloRun<\/dd>/);
});

test('revoked and unknown certificate pages cannot be shared and offer another verification', async () => {
  const revokedHtml = await renderPage({ found: true, certificate: baseCertificate({ status: 'revoked' }) });
  const missingHtml = await renderPage({ found: false, status: 'not_found' });

  assert.match(revokedHtml, /no longer valid/i);
  assert.match(missingHtml, /Certificate not found/i);
  assert.match(revokedHtml, /Verify another certificate/);
  assert.match(missingHtml, /Verify another certificate/);
  assert.doesNotMatch(revokedHtml, /Share this achievement/);
  assert.doesNotMatch(missingHtml, /Share this achievement/);
});

test('certificate layout defines tablet and mobile adaptations', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../src/public/css/static-pages.css'), 'utf8');
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.certificate-card-body \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /@media \(max-width: 460px\)[\s\S]*\.certificate-metrics \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.cert-share-btn:focus-visible/);
});

test('certificate number normalization retains the established safe lookup behavior', () => {
  assert.equal(normalizeCertificateNumber(' hr-cert-2026-abc_123<script> '), 'HR-CERT-2026-ABC123SCRIPT');
  assert.equal(normalizeCertificateNumber(''), '');
  assert.equal(normalizeCertificateNumber('A'.repeat(100)).length, 80);
});
