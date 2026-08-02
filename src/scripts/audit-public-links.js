'use strict';

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_CONCURRENCY = 8;
const DEFAULT_RETRY_DELAY_MS = 500;
const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const IGNORED_PATHS = new Set(['/cdn-cgi/l/email-protection']);

function parseArguments(argv = process.argv.slice(2)) {
  let baseUrl = '';
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let concurrency = DEFAULT_CONCURRENCY;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--base-url') {
      baseUrl = String(argv[index + 1] || '').trim();
      index += 1;
    } else if (argument === '--timeout-ms') {
      timeoutMs = parseBoundedInteger(argv[index + 1], 'timeout-ms', 1000, 60000);
      index += 1;
    } else if (argument === '--concurrency') {
      concurrency = parseBoundedInteger(argv[index + 1], 'concurrency', 1, 20);
      index += 1;
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }

  if (!baseUrl) throw new Error('--base-url is required.');
  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    timeoutMs,
    concurrency
  };
}

function parseBoundedInteger(value, label, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`--${label} must be an integer from ${minimum} to ${maximum}.`);
  }
  return parsed;
}

function normalizeBaseUrl(value) {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch (_error) {
    throw new Error('--base-url must be a valid HTTP or HTTPS URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('--base-url must be a credential-free HTTP or HTTPS URL.');
  }
  return url.origin;
}

function decodeHtmlAttribute(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:0*39|x0*27);/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function extractSitemapUrls(xml, baseUrl) {
  const origin = new URL(baseUrl).origin;
  const urls = [];
  const seen = new Set();

  for (const match of String(xml || '').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
    let url;
    try {
      url = new URL(decodeHtmlAttribute(match[1]), origin);
    } catch (_error) {
      continue;
    }
    url.hash = '';
    if (url.origin !== origin || seen.has(url.href)) continue;
    seen.add(url.href);
    urls.push(url.href);
  }

  if (!urls.length) throw new Error('The sitemap did not contain any same-origin URLs.');
  return urls;
}

function extractInternalLinks(html, pageUrl, baseUrl) {
  const origin = new URL(baseUrl).origin;
  const links = [];
  const seen = new Set();
  const anchorPattern = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi;

  for (const match of String(html || '').matchAll(anchorPattern)) {
    const rawHref = decodeHtmlAttribute(match[2]).trim();
    if (!rawHref || rawHref.startsWith('#') || /^(?:mailto|tel|javascript):/i.test(rawHref)) continue;

    let url;
    try {
      url = new URL(rawHref, pageUrl);
    } catch (_error) {
      continue;
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || IGNORED_PATHS.has(url.pathname)) continue;
    url.hash = '';
    if (seen.has(url.href)) continue;
    seen.add(url.href);
    links.push(url.href);
  }

  return links;
}

async function fetchWithRetry(url, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'user-agent': 'HelloRun-AdSense-Link-Audit/1.0' }
      });
      if (!TRANSIENT_STATUSES.has(response.status) || attempt === 2) return response;
      if (response.body?.cancel) await response.body.cancel();
    } catch (error) {
      lastError = error;
      if (attempt === 2) throw error;
    }
    if (retryDelayMs > 0) await delay(retryDelayMs);
  }

  throw lastError || new Error(`Unable to fetch ${url}`);
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
  return results;
}

async function auditPublicLinks(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const concurrency = options.concurrency || DEFAULT_CONCURRENCY;
  const requestOptions = {
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_MS,
    retryDelayMs: options.retryDelayMs
  };
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  const sitemapResponse = await fetchWithRetry(sitemapUrl, requestOptions);
  if (!isSuccess(sitemapResponse.status)) {
    throw new Error(`Sitemap request failed with HTTP ${sitemapResponse.status}: ${sitemapUrl}`);
  }

  const sitemapUrls = extractSitemapUrls(await sitemapResponse.text(), baseUrl);
  const failures = [];
  const sourcesByLink = new Map();

  await mapWithConcurrency(sitemapUrls, concurrency, async (pageUrl) => {
    try {
      const response = await fetchWithRetry(pageUrl, requestOptions);
      if (!isSuccess(response.status)) {
        failures.push({ type: 'page', url: pageUrl, status: response.status, sources: [sitemapUrl] });
        return;
      }
      const contentType = String(response.headers?.get?.('content-type') || '');
      if (contentType && !contentType.toLowerCase().includes('text/html')) return;
      const links = extractInternalLinks(await response.text(), pageUrl, baseUrl);
      links.forEach((link) => {
        if (!sourcesByLink.has(link)) sourcesByLink.set(link, new Set());
        sourcesByLink.get(link).add(pageUrl);
      });
    } catch (error) {
      failures.push({ type: 'page', url: pageUrl, error: error.message, sources: [sitemapUrl] });
    }
  });

  const links = [...sourcesByLink.keys()].sort();
  await mapWithConcurrency(links, concurrency, async (url) => {
    try {
      const response = await fetchWithRetry(url, requestOptions);
      if (!isSuccess(response.status)) {
        failures.push({
          type: 'link',
          url,
          status: response.status,
          sources: [...sourcesByLink.get(url)].sort()
        });
      }
    } catch (error) {
      failures.push({
        type: 'link',
        url,
        error: error.message,
        sources: [...sourcesByLink.get(url)].sort()
      });
    }
  });

  failures.sort((a, b) => a.url.localeCompare(b.url));
  return {
    baseUrl,
    sitemapUrl,
    pageCount: sitemapUrls.length,
    linkCount: links.length,
    failures
  };
}

function isSuccess(status) {
  return Number(status) >= 200 && Number(status) < 300;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const options = parseArguments();
  const result = await auditPublicLinks(options);
  console.log(`Sitemap pages checked: ${result.pageCount}`);
  console.log(`Unique same-origin links checked: ${result.linkCount}`);
  console.log(`Actionable failures: ${result.failures.length}`);

  result.failures.forEach((failure) => {
    const reason = failure.status ? `HTTP ${failure.status}` : failure.error;
    console.error(`${reason}: ${failure.url}`);
    failure.sources.forEach((source) => console.error(`  from ${source}`));
  });

  if (result.failures.length) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`${error.name}: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  DEFAULT_CONCURRENCY,
  DEFAULT_TIMEOUT_MS,
  IGNORED_PATHS,
  auditPublicLinks,
  decodeHtmlAttribute,
  extractInternalLinks,
  extractSitemapUrls,
  fetchWithRetry,
  normalizeBaseUrl,
  parseArguments
};
