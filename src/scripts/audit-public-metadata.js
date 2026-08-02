'use strict';

const {
  extractSitemapUrls,
  fetchWithRetry,
  normalizeBaseUrl,
  parseArguments: parseLinkAuditArguments
} = require('./audit-public-links');

const MIN_DESCRIPTION_LENGTH = 50;
const REQUIRED_PUBLIC_FILES = Object.freeze(['/robots.txt', '/sitemap.xml', '/ads.txt']);

function parseArguments(argv = process.argv.slice(2)) {
  return parseLinkAuditArguments(argv);
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:0*39|x0*27);/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function extractAttribute(html, tagName, attributeName, attributeValue, resultAttribute = 'content') {
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  for (const match of String(html || '').matchAll(tagPattern)) {
    const tag = match[0];
    const selector = tag.match(new RegExp(`\\b${attributeName}\\s*=\\s*(["'])${attributeValue}\\1`, 'i'));
    if (!selector) continue;
    const result = tag.match(new RegExp(`\\b${resultAttribute}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
    if (result) return decodeHtml(result[2]).trim();
  }
  return '';
}

function extractPageMetadata(html) {
  const source = String(html || '');
  const title = decodeHtml(source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
  const description = extractAttribute(source, 'meta', 'name', 'description');
  const robots = extractAttribute(source, 'meta', 'name', 'robots');
  const canonical = extractAttribute(source, 'link', 'rel', 'canonical', 'href');
  const h1Count = (source.match(/<h1\b/gi) || []).length;
  return { title, description, robots, canonical, h1Count };
}

function normalizeComparableUrl(value) {
  const url = new URL(value);
  url.hash = '';
  url.search = '';
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
  return url.href;
}

function inspectPage(pageUrl, metadata, options = {}) {
  const findings = [];
  const minimumDescriptionLength = options.minimumDescriptionLength || MIN_DESCRIPTION_LENGTH;

  if (!metadata.title) findings.push('missing title');
  if (!metadata.description) findings.push('missing meta description');
  else if (metadata.description.length < minimumDescriptionLength) findings.push(`meta description shorter than ${minimumDescriptionLength} characters`);
  if (!metadata.canonical) findings.push('missing canonical URL');
  else {
    try {
      if (normalizeComparableUrl(metadata.canonical) !== normalizeComparableUrl(pageUrl)) {
        findings.push(`canonical does not self-reference (${metadata.canonical})`);
      }
    } catch (_error) {
      findings.push(`invalid canonical URL (${metadata.canonical})`);
    }
  }
  if (metadata.h1Count !== 1) findings.push(`expected one h1, found ${metadata.h1Count}`);
  if (/(?:^|,)\s*noindex\b/i.test(metadata.robots)) findings.push(`unexpected robots directive (${metadata.robots})`);
  return findings;
}

async function auditPublicMetadata(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const requestOptions = {
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
    retryDelayMs: options.retryDelayMs
  };
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  const sitemapResponse = await fetchWithRetry(sitemapUrl, requestOptions);
  if (sitemapResponse.status < 200 || sitemapResponse.status >= 300) {
    throw new Error(`Sitemap request failed with HTTP ${sitemapResponse.status}: ${sitemapUrl}`);
  }

  const pageUrls = extractSitemapUrls(await sitemapResponse.text(), baseUrl);
  const findings = [];
  const titles = new Map();

  for (const pageUrl of pageUrls) {
    try {
      const response = await fetchWithRetry(pageUrl, requestOptions);
      if (response.status < 200 || response.status >= 300) {
        findings.push({ url: pageUrl, issues: [`HTTP ${response.status}`] });
        continue;
      }
      const contentType = String(response.headers?.get?.('content-type') || '').toLowerCase();
      if (contentType && !contentType.includes('text/html')) {
        findings.push({ url: pageUrl, issues: [`unexpected content type (${contentType})`] });
        continue;
      }
      const metadata = extractPageMetadata(await response.text());
      const issues = inspectPage(pageUrl, metadata, options);
      if (metadata.title) {
        const normalizedTitle = metadata.title.toLowerCase();
        if (!titles.has(normalizedTitle)) titles.set(normalizedTitle, []);
        titles.get(normalizedTitle).push(pageUrl);
      }
      if (issues.length) findings.push({ url: pageUrl, issues });
    } catch (error) {
      findings.push({ url: pageUrl, issues: [error.message] });
    }
  }

  for (const [title, urls] of titles) {
    if (urls.length < 2) continue;
    urls.forEach((url) => {
      const existing = findings.find((finding) => finding.url === url);
      const issue = `duplicate title "${title}"`;
      if (existing) existing.issues.push(issue);
      else findings.push({ url, issues: [issue] });
    });
  }

  const publicFiles = [];
  for (const path of REQUIRED_PUBLIC_FILES) {
    const url = `${baseUrl}${path}`;
    try {
      const response = await fetchWithRetry(url, requestOptions);
      publicFiles.push({ url, status: response.status });
      if (response.status < 200 || response.status >= 300) findings.push({ url, issues: [`HTTP ${response.status}`] });
      if (response.body?.cancel) await response.body.cancel();
    } catch (error) {
      publicFiles.push({ url, error: error.message });
      findings.push({ url, issues: [error.message] });
    }
  }

  findings.sort((left, right) => left.url.localeCompare(right.url));
  return { baseUrl, sitemapUrl, pageCount: pageUrls.length, publicFiles, findings };
}

async function main() {
  const options = parseArguments();
  const result = await auditPublicMetadata(options);
  console.log(`Sitemap HTML pages checked: ${result.pageCount}`);
  result.publicFiles.forEach((file) => console.log(`${file.status || 'ERROR'} ${file.url}`));
  console.log(`Pages or files with findings: ${result.findings.length}`);
  result.findings.forEach((finding) => {
    console.error(finding.url);
    finding.issues.forEach((issue) => console.error(`  ${issue}`));
  });
  if (result.findings.length) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`${error.name}: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  MIN_DESCRIPTION_LENGTH,
  REQUIRED_PUBLIC_FILES,
  auditPublicMetadata,
  extractAttribute,
  extractPageMetadata,
  inspectPage,
  normalizeComparableUrl,
  parseArguments
};
