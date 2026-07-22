'use strict';

const crypto = require('crypto');
const net = require('net');
const { sanitizeHtml, htmlToPlainText } = require('./sanitize');
const { analyzePostSpamSignals } = require('./blog-safety');

const BLOG_CONTENT_POLICY_VERSION = 'ugc-adsense-v1';
const MIN_BLOG_WORDS = 500;
const MIN_SEMANTIC_UNITS = 3;
const MIN_UNIT_WORDS = 12;
const MIN_UNIQUE_WORDS = 90;

const HEALTH_CATEGORIES = new Set(['Nutrition', 'Injury Prevention', 'Mental Health']);
const HEALTH_SIGNAL_PATTERN = /\b(?:diagnos(?:e|ed|is)|treat(?:ment|ed|ing)?|cure[sd]?|medic(?:al|ation|ine)|doctor|physician|therap(?:y|ist)|injur(?:y|ies|ed)|pain|symptom|illness|disease|supplement|dosage|dose|recovery|recover(?:y|ing)?|nutrition|diet|calorie|pregnan(?:t|cy)|chronic|heart|blood pressure|mental health|anxiety|depression|weight loss|hydration)\b/i;
const DEFAULT_SHORTENER_HOSTS = Object.freeze([
  'bit.ly', 'buff.ly', 'cutt.ly', 'is.gd', 'ow.ly', 'rebrand.ly', 't.co', 'tiny.cc',
  'tinyurl.com', 'trib.al'
]);
const HEALTH_REVIEW_CONFIRMATIONS = Object.freeze([
  'healthExperienceConfirmed',
  'healthSourcesConfirmed',
  'healthSafetyConfirmed',
  'healthCredentialsConfirmed'
]);

function getWordTokens(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || [];
}

function countSemanticUnits(contentHtml) {
  const html = String(contentHtml || '');
  const units = [];
  const pattern = /<(p|blockquote|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const text = htmlToPlainText(match[2]);
    if (getWordTokens(text).length >= MIN_UNIT_WORDS) units.push(text);
  }
  return units.length;
}

function getShortenerHosts() {
  const configured = String(process.env.BLOG_BLOCKED_SHORTENER_HOSTS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_SHORTENER_HOSTS, ...configured]);
}

function inspectBlogLinks(contentHtml) {
  const html = String(contentHtml || '');
  const issues = [];
  const links = [];
  const shorteners = getShortenerHosts();
  const anchorPattern = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi;
  let match;

  while ((match = anchorPattern.exec(html)) !== null) {
    const href = String(match[1] ?? match[2] ?? match[3] ?? '').trim();
    if (!href) continue;
    if (href.startsWith('/') && !href.startsWith('//')) {
      links.push({ href, kind: 'internal' });
      continue;
    }
    if (href.startsWith('#')) {
      links.push({ href, kind: 'fragment' });
      continue;
    }

    let parsed;
    try {
      parsed = new URL(href);
    } catch (_) {
      issues.push({ code: 'malformed_external_link', href });
      continue;
    }

    const hostname = String(parsed.hostname || '').replace(/^\[|\]$/g, '').toLowerCase();
    if (parsed.protocol !== 'https:') issues.push({ code: 'external_link_must_use_https', href });
    if (parsed.username || parsed.password) issues.push({ code: 'credential_bearing_link', href });
    if (net.isIP(hostname)) issues.push({ code: 'raw_ip_link', href });
    if (shorteners.has(hostname)) issues.push({ code: 'blocked_shortener_link', href });
    links.push({ href, kind: 'external', hostname });
  }

  return {
    links,
    externalLinks: links.filter((link) => link.kind === 'external'),
    issues: uniqueIssues(issues)
  };
}

function uniqueIssues(issues) {
  const seen = new Set();
  return issues.filter((issue) => {
    const key = `${issue.code}|${issue.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sanitizeUserBlogHtml(input) {
  return sanitizeHtml(input, {
    allowedSchemes: ['https'],
    allowProtocolRelative: false,
    transformTags: {
      a(tagName, attribs = {}) {
        const href = String(attribs.href || '').trim();
        const internal = (href.startsWith('/') && !href.startsWith('//')) || href.startsWith('#');
        return {
          tagName,
          attribs: internal
            ? { href }
            : {
                href,
                rel: 'ugc nofollow noopener noreferrer',
                target: '_blank'
              }
        };
      }
    }
  });
}

function buildBlogContentSourceHash(input = {}) {
  const stable = {
    title: String(input.title || '').trim(),
    excerpt: String(input.excerpt || '').trim(),
    category: String(input.category || '').trim(),
    customCategory: String(input.customCategory || '').trim(),
    coverImageUrl: String(input.coverImageUrl || '').trim(),
    contentHtml: String(input.contentHtml || '').trim()
  };
  return crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

function requiresHealthReview(input = {}) {
  if (HEALTH_CATEGORIES.has(String(input.category || '').trim())) return true;
  const text = [input.title, input.excerpt, input.contentText || htmlToPlainText(input.contentHtml)]
    .filter(Boolean)
    .join(' ');
  return HEALTH_SIGNAL_PATTERN.test(text);
}

function evaluateBlogContentEligibility(input = {}, options = {}) {
  const contentHtml = String(input.contentHtml || '');
  const contentText = String(input.contentText || htmlToPlainText(contentHtml)).trim();
  const tokens = getWordTokens(contentText);
  const uniqueWords = new Set(tokens.filter((token) => token.length > 2));
  const semanticUnitCount = countSemanticUnits(contentHtml);
  const linkInspection = inspectBlogLinks(contentHtml);
  const spam = analyzePostSpamSignals({
    title: input.title,
    excerpt: input.excerpt,
    contentText
  });
  const blockingReasons = [];

  if (tokens.length < MIN_BLOG_WORDS) blockingReasons.push('minimum_500_words');
  if (semanticUnitCount < MIN_SEMANTIC_UNITS) blockingReasons.push('minimum_3_semantic_units');
  if (tokens.length >= MIN_BLOG_WORDS && uniqueWords.size < MIN_UNIQUE_WORDS) blockingReasons.push('insufficient_substantive_vocabulary');
  for (const issue of linkInspection.issues) blockingReasons.push(issue.code);
  if ((spam.flags || []).includes('post_repetitive')) blockingReasons.push('repetitive_filler');

  const evaluatedAt = options.evaluatedAt ? new Date(options.evaluatedAt) : new Date();
  return {
    policyVersion: BLOG_CONTENT_POLICY_VERSION,
    sourceHash: buildBlogContentSourceHash(input),
    wordCount: tokens.length,
    uniqueWordCount: uniqueWords.size,
    semanticUnitCount,
    externalLinkCount: linkInspection.externalLinks.length,
    healthReviewRequired: requiresHealthReview({ ...input, contentText }),
    blockingReasons: Array.from(new Set(blockingReasons)),
    eligible: blockingReasons.length === 0,
    evaluatedAt,
    linkIssues: linkInspection.issues,
    moderationFlags: spam.flags || []
  };
}

function hasCurrentEligibleContent(post = {}) {
  const snapshot = post.contentEligibility || {};
  return Boolean(
    snapshot.eligible === true
    && snapshot.policyVersion === BLOG_CONTENT_POLICY_VERSION
    && snapshot.sourceHash
    && snapshot.sourceHash === buildBlogContentSourceHash(post)
  );
}

function hasCurrentPublicationReview(post = {}) {
  const eligibility = post.contentEligibility || {};
  const review = post.publicationReview || {};
  if (
    review.policyVersion !== BLOG_CONTENT_POLICY_VERSION
    || !review.sourceHash
    || review.sourceHash !== eligibility.sourceHash
    || review.originalityConfirmed !== true
  ) return false;
  if (eligibility.externalLinkCount > 0 && review.externalLinksConfirmed !== true) return false;
  if (eligibility.healthReviewRequired) {
    if (review.healthSafetyConfirmed !== true) return false;
    if (HEALTH_REVIEW_CONFIRMATIONS.some((key) => review.healthChecks?.[key] !== true)) return false;
  }
  return true;
}

function isCurrentEligibleBlog(post = {}) {
  return Boolean(
    post.status === 'published'
    && post.isDeleted !== true
    && hasCurrentEligibleContent(post)
    && hasCurrentPublicationReview(post)
  );
}

function buildTrustedEditorialReview(input = {}, actorId = null, evaluatedAt = new Date()) {
  const contentEligibility = evaluateBlogContentEligibility(input, { evaluatedAt });
  if (!contentEligibility.eligible) {
    throw new Error(`Editorial article is not publication eligible: ${contentEligibility.blockingReasons.join(', ')}`);
  }
  return {
    contentEligibility,
    publicationReview: {
      policyVersion: BLOG_CONTENT_POLICY_VERSION,
      sourceHash: contentEligibility.sourceHash,
      originalityConfirmed: true,
      externalLinksConfirmed: contentEligibility.externalLinkCount > 0,
      healthSafetyConfirmed: contentEligibility.healthReviewRequired,
      healthChecks: contentEligibility.healthReviewRequired
        ? Object.fromEntries(HEALTH_REVIEW_CONFIRMATIONS.map((key) => [key, true]))
        : {},
      overrideReason: '',
      reviewSource: 'editorial_pipeline',
      reviewedBy: actorId || null,
      reviewedAt: new Date(evaluatedAt)
    }
  };
}

module.exports = {
  BLOG_CONTENT_POLICY_VERSION,
  DEFAULT_SHORTENER_HOSTS,
  HEALTH_CATEGORIES,
  HEALTH_REVIEW_CONFIRMATIONS,
  MIN_BLOG_WORDS,
  MIN_SEMANTIC_UNITS,
  buildBlogContentSourceHash,
  buildTrustedEditorialReview,
  countSemanticUnits,
  evaluateBlogContentEligibility,
  getWordTokens,
  hasCurrentEligibleContent,
  hasCurrentPublicationReview,
  inspectBlogLinks,
  isCurrentEligibleBlog,
  requiresHealthReview,
  sanitizeUserBlogHtml
};
