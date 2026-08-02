'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  auditPublicLinks,
  extractInternalLinks,
  extractSitemapUrls,
  fetchWithRetry,
  normalizeBaseUrl,
  parseArguments
} = require('../src/scripts/audit-public-links');

test('audit arguments require a safe base URL and bounded controls', () => {
  assert.deepEqual(parseArguments(['--base-url', 'https://hellorun.online/anything']), {
    baseUrl: 'https://hellorun.online',
    timeoutMs: 15000,
    concurrency: 8
  });
  assert.deepEqual(
    parseArguments(['--base-url', 'http://127.0.0.1:3000', '--timeout-ms', '5000', '--concurrency', '4']),
    { baseUrl: 'http://127.0.0.1:3000', timeoutMs: 5000, concurrency: 4 }
  );
  assert.throws(() => parseArguments([]), /--base-url is required/);
  assert.throws(() => normalizeBaseUrl('ftp://example.com'), /HTTP or HTTPS/);
  assert.throws(() => normalizeBaseUrl('https://user:pass@example.com'), /credential-free/);
  assert.throws(() => parseArguments(['--base-url', 'https://example.com', '--concurrency', '21']), /1 to 20/);
});

test('sitemap and anchor extraction keep unique same-origin navigation only', () => {
  assert.deepEqual(
    extractSitemapUrls(`
      <urlset>
        <url><loc>https://hellorun.online/</loc></url>
        <url><loc>https://hellorun.online/blog?a=1&amp;b=2</loc></url>
        <url><loc>https://other.example/page</loc></url>
        <url><loc>https://hellorun.online/</loc></url>
      </urlset>
    `, 'https://hellorun.online'),
    ['https://hellorun.online/', 'https://hellorun.online/blog?a=1&b=2']
  );

  const links = extractInternalLinks(`
    <a href="/events#results">Events</a>
    <a href="https://hellorun.online/events#other">Duplicate event</a>
    <a href="/blog?q=run&amp;sort=popular">Blog</a>
    <a href="#section">Section</a>
    <a href="mailto:support@hellorun.online">Mail</a>
    <a href="tel:+630000000">Call</a>
    <a href="javascript:void(0)">Script</a>
    <a href="https://external.example/path">External</a>
    <a href="/cdn-cgi/l/email-protection#encoded">Protected email</a>
  `, 'https://hellorun.online/about', 'https://hellorun.online');

  assert.deepEqual(links, [
    'https://hellorun.online/events',
    'https://hellorun.online/blog?q=run&sort=popular'
  ]);
});

test('fetch retry recovers once from transient responses and network errors', async () => {
  let transientCalls = 0;
  const transientResponse = await fetchWithRetry('https://hellorun.test/flaky', {
    retryDelayMs: 0,
    fetchImpl: async () => {
      transientCalls += 1;
      return response(transientCalls === 1 ? 503 : 200);
    }
  });
  assert.equal(transientResponse.status, 200);
  assert.equal(transientCalls, 2);

  let errorCalls = 0;
  const networkResponse = await fetchWithRetry('https://hellorun.test/network', {
    retryDelayMs: 0,
    fetchImpl: async () => {
      errorCalls += 1;
      if (errorCalls === 1) throw new Error('temporary network failure');
      return response(200);
    }
  });
  assert.equal(networkResponse.status, 200);
  assert.equal(errorCalls, 2);
});

test('public audit follows successful destinations, deduplicates links, and reports failures with sources', async () => {
  const baseUrl = 'https://hellorun.test';
  const calls = new Map();
  const pages = new Map([
    [`${baseUrl}/sitemap.xml`, response(200, `
      <urlset>
        <url><loc>${baseUrl}/</loc></url>
        <url><loc>${baseUrl}/blog</loc></url>
      </urlset>
    `, 'application/xml')],
    [`${baseUrl}/`, response(200, `
      <a href="/ok">OK</a>
      <a href="/runner/submissions">Results</a>
      <a href="/missing">Missing</a>
    `)],
    [`${baseUrl}/blog`, response(200, `
      <a href="/ok#duplicate">OK again</a>
      <a href="/missing">Missing again</a>
      <a href="/flaky">Flaky</a>
    `)],
    [`${baseUrl}/ok`, response(200)],
    [`${baseUrl}/runner/submissions`, response(200, '<h1>Log in</h1>', 'text/html', `${baseUrl}/login`)],
    [`${baseUrl}/missing`, response(404)],
    [`${baseUrl}/flaky`, () => response((calls.get(`${baseUrl}/flaky`) || 0) === 1 ? 503 : 200)]
  ]);

  const fetchImpl = async (url) => {
    calls.set(url, (calls.get(url) || 0) + 1);
    const configured = pages.get(url);
    if (!configured) throw new Error(`Unexpected URL: ${url}`);
    return typeof configured === 'function' ? configured() : configured;
  };

  const result = await auditPublicLinks({
    baseUrl,
    concurrency: 2,
    retryDelayMs: 0,
    fetchImpl
  });

  assert.equal(result.pageCount, 2);
  assert.equal(result.linkCount, 4);
  assert.equal(calls.get(`${baseUrl}/ok`), 1);
  assert.equal(calls.get(`${baseUrl}/flaky`), 2);
  assert.deepEqual(result.failures, [{
    type: 'link',
    url: `${baseUrl}/missing`,
    status: 404,
    sources: [`${baseUrl}/`, `${baseUrl}/blog`]
  }]);
});

test('public audit reports sitemap page and link network failures', async () => {
  const baseUrl = 'https://hellorun.test';
  const calls = new Map();
  const fetchImpl = async (url) => {
    calls.set(url, (calls.get(url) || 0) + 1);
    if (url === `${baseUrl}/sitemap.xml`) {
      return response(200, `<urlset><url><loc>${baseUrl}/</loc></url><url><loc>${baseUrl}/broken-page</loc></url></urlset>`, 'application/xml');
    }
    if (url === `${baseUrl}/`) return response(200, '<a href="/network-error">Network</a>');
    if (url === `${baseUrl}/broken-page`) return response(500);
    throw new Error('socket closed');
  };

  const result = await auditPublicLinks({
    baseUrl,
    concurrency: 2,
    retryDelayMs: 0,
    fetchImpl
  });

  assert.equal(calls.get(`${baseUrl}/broken-page`), 2);
  assert.equal(calls.get(`${baseUrl}/network-error`), 2);
  assert.deepEqual(result.failures, [
    {
      type: 'page',
      url: `${baseUrl}/broken-page`,
      status: 500,
      sources: [`${baseUrl}/sitemap.xml`]
    },
    {
      type: 'link',
      url: `${baseUrl}/network-error`,
      error: 'socket closed',
      sources: [`${baseUrl}/`]
    }
  ]);
});

function response(status, body = '', contentType = 'text/html; charset=utf-8', finalUrl = '') {
  return {
    status,
    ok: status >= 200 && status < 300,
    url: finalUrl,
    headers: {
      get(name) {
        return String(name).toLowerCase() === 'content-type' ? contentType : null;
      }
    },
    body: {
      async cancel() {}
    },
    async text() {
      return body;
    }
  };
}
