'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  auditPublicMetadata,
  extractPageMetadata,
  inspectPage,
  parseArguments
} = require('../src/scripts/audit-public-metadata');

const baseUrl = 'https://hellorun.test';
const ROOT = path.resolve(__dirname, '..');

function response(status, body = '', contentType = 'text/html') {
  return {
    status,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? contentType : '' },
    text: async () => body,
    body: { cancel: async () => {} }
  };
}

function page({ title = 'Useful HelloRun Page', path = '/about', description, h1 = '<h1>About</h1>', robots = '' } = {}) {
  return `<!doctype html><html><head>
    <title>${title}</title>
    <meta name="description" content="${description || 'A sufficiently detailed description of this useful public HelloRun page for runners and organizers.'}">
    <link rel="canonical" href="${baseUrl}${path}">
    ${robots ? `<meta name="robots" content="${robots}">` : ''}
  </head><body>${h1}</body></html>`;
}

test('metadata audit arguments reuse the bounded public-audit interface', () => {
  assert.deepEqual(parseArguments(['--base-url', `${baseUrl}/path`, '--concurrency', '4']), {
    baseUrl,
    timeoutMs: 15000,
    concurrency: 4
  });
});

test('extractPageMetadata reads escaped values and counts page headings', () => {
  const metadata = extractPageMetadata(page({ title: 'About &amp; Trust', h1: '<h1>About</h1><h1>Duplicate</h1>' }));
  assert.equal(metadata.title, 'About & Trust');
  assert.equal(metadata.canonical, `${baseUrl}/about`);
  assert.equal(metadata.h1Count, 2);
});

test('inspectPage requires useful self-referencing indexable metadata', () => {
  assert.deepEqual(inspectPage(`${baseUrl}/about`, extractPageMetadata(page())), []);
  const issues = inspectPage(`${baseUrl}/about`, {
    title: '',
    description: 'Short',
    canonical: `${baseUrl}/contact`,
    h1Count: 2,
    robots: 'noindex, follow'
  });
  assert.ok(issues.some((issue) => issue.includes('missing title')));
  assert.ok(issues.some((issue) => issue.includes('shorter')));
  assert.ok(issues.some((issue) => issue.includes('does not self-reference')));
  assert.ok(issues.some((issue) => issue.includes('expected one h1')));
  assert.ok(issues.some((issue) => issue.includes('noindex')));
});

test('auditPublicMetadata reports no findings for healthy sitemap pages and public files', async () => {
  const responses = new Map([
    [`${baseUrl}/sitemap.xml`, response(200, `<urlset><url><loc>${baseUrl}/about</loc></url><url><loc>${baseUrl}/contact</loc></url></urlset>`, 'application/xml')],
    [`${baseUrl}/about`, response(200, page({ path: '/about', title: 'About HelloRun' }))],
    [`${baseUrl}/contact`, response(200, page({ path: '/contact', title: 'Contact HelloRun', h1: '<h1>Contact</h1>' }))],
    [`${baseUrl}/robots.txt`, response(200, 'User-agent: *', 'text/plain')],
    [`${baseUrl}/ads.txt`, response(200, 'google.com, pub-1, DIRECT', 'text/plain')]
  ]);
  const result = await auditPublicMetadata({
    baseUrl,
    fetchImpl: async (url) => responses.get(url) || response(404),
    retryDelayMs: 0
  });
  assert.equal(result.pageCount, 2);
  assert.deepEqual(result.findings, []);
});

test('auditPublicMetadata flags duplicate titles across sitemap pages', async () => {
  const responses = new Map([
    [`${baseUrl}/sitemap.xml`, response(200, `<urlset><url><loc>${baseUrl}/about</loc></url><url><loc>${baseUrl}/contact</loc></url></urlset>`, 'application/xml')],
    [`${baseUrl}/about`, response(200, page({ path: '/about', title: 'Repeated Title' }))],
    [`${baseUrl}/contact`, response(200, page({ path: '/contact', title: 'Repeated Title', h1: '<h1>Contact</h1>' }))],
    [`${baseUrl}/robots.txt`, response(200, '', 'text/plain')],
    [`${baseUrl}/ads.txt`, response(200, '', 'text/plain')]
  ]);
  const result = await auditPublicMetadata({
    baseUrl,
    fetchImpl: async (url) => responses.get(url) || response(404),
    retryDelayMs: 0
  });
  assert.equal(result.findings.length, 2);
  assert.ok(result.findings.every((finding) => finding.issues.some((issue) => issue.includes('duplicate title'))));
});

test('trust and Privacy routes supply the corrected canonical and description metadata', () => {
  const homeController = fs.readFileSync(path.join(ROOT, 'src/controllers/page/home.controller.js'), 'utf8');
  const pageRoutes = fs.readFileSync(path.join(ROOT, 'src/routes/pageRoutes.js'), 'utf8');

  for (const publicPath of ['/about', '/how-it-works', '/contact']) {
    assert.ok(homeController.includes(`canonicalUrl: baseUrl ? \`\${baseUrl}${publicPath}\` : ''`));
  }
  assert.match(pageRoutes, /policyDocument\.key === 'privacy'[\s\S]*collects, uses, shares, protects, retains/);
});
