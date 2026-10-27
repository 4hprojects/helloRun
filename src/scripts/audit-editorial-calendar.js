#!/usr/bin/env node

require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const { POSTS } = require('./seed-adsense-blog-posts');
const { hasCurrentEligibleContent, hasCurrentPublicationReview } = require('../utils/blog-content-eligibility');

const WINDOW_START = new Date('2026-10-01T00:00:00.000Z');
const WINDOW_END = new Date('2026-12-31T23:59:59.999Z');

function canonicalPosts() {
  return POSTS
    .filter((post) => {
      const date = new Date(post.publishedAt);
      return date >= WINDOW_START && date <= WINDOW_END;
    })
    .map((post) => ({ slug: post.slug, scheduledFor: new Date(post.publishedAt) }))
    .sort((left, right) => left.scheduledFor - right.scheduledFor);
}

function hasMetadata(record) {
  return Boolean(
    String(record.coverImageUrl || '').trim()
    && String(record.coverImageAlt || '').trim()
    && String(record.seoTitle || '').trim()
    && String(record.seoDescription || '').trim()
    && String(record.ogImageUrl || '').trim()
  );
}

function buildEditorialCalendarReport(planned, records, now = new Date()) {
  const bySlug = new Map(records.map((record) => [record.slug, record]));
  const missing = [];
  const overdue = [];
  const futureScheduleMismatch = [];
  const ineligible = [];
  const schedulerErrors = [];
  const missingMetadata = [];
  let publishedDue = 0;
  let scheduledFuture = 0;
  let healthSafety = 0;
  let healthReviewFailures = 0;

  for (const item of planned) {
    const record = bySlug.get(item.slug);
    if (!record) {
      missing.push(item.slug);
      continue;
    }
    const due = item.scheduledFor <= now;
    if (due) {
      if (record.status === 'published' && record.publishedAt) publishedDue += 1;
      else overdue.push(item.slug);
    } else if (record.status === 'scheduled' && record.scheduledFor && new Date(record.scheduledFor).getTime() === item.scheduledFor.getTime()) {
      scheduledFuture += 1;
    } else {
      futureScheduleMismatch.push(item.slug);
    }

    if (!hasCurrentEligibleContent(record) || !hasCurrentPublicationReview(record)) ineligible.push(item.slug);
    if (record.contentRisk === 'health_safety') {
      healthSafety += 1;
      if (!hasCurrentPublicationReview(record)) healthReviewFailures += 1;
    }
    if (record.scheduledPublishLastError) schedulerErrors.push(item.slug);
    if (!hasMetadata(record)) missingMetadata.push(item.slug);
  }

  return {
    planned: planned.length,
    found: planned.length - missing.length,
    missing,
    due: planned.filter((item) => item.scheduledFor <= now).length,
    publishedDue,
    overdue,
    future: planned.filter((item) => item.scheduledFor > now).length,
    scheduledFuture,
    futureScheduleMismatch,
    publicationEligible: planned.length - missing.length - ineligible.length,
    ineligible,
    healthSafety,
    healthReviewFailures,
    schedulerErrors,
    missingMetadata
  };
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  const planned = canonicalPosts();
  const records = await Blog.find({ slug: { $in: planned.map((post) => post.slug) }, isDeleted: { $ne: true } })
    .select('slug status publishedAt scheduledFor contentEligibility publicationReview contentRisk scheduledPublishLastError coverImageUrl coverImageAlt seoTitle seoDescription ogImageUrl title excerpt category customCategory contentHtml')
    .lean();
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: 'read-only',
    window: { start: WINDOW_START.toISOString(), end: WINDOW_END.toISOString() },
    report: buildEditorialCalendarReport(planned, records)
  }, null, 2));
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(`[Editorial calendar audit] ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
}

module.exports = { buildEditorialCalendarReport, canonicalPosts, hasMetadata };
