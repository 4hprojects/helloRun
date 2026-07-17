'use strict';

// Shared imports and cross-concern helpers for the page/* sub-controllers.
// Split out of the former 3.5k-line page.controller.js (analysis CQ-2).

const crypto = require('crypto');

const Event = require('../../models/Event');

const User = require('../../models/User');

const Registration = require('../../models/Registration');

const Submission = require('../../models/Submission');

const OrganiserApplication = require('../../models/OrganiserApplication');

const Blog = require('../../models/Blog');

const BlogLike = require('../../models/BlogLike');

const communicationService = require('../../services/communication.service');

const { registerBlogView } = require('../../services/blog-view.service');

const { getRunnerRegistrations } = require('../../services/runner-data.service');

const { listPolicyDocuments } = require('../../services/policy-registry.service');

const uploadService = require('../../services/upload.service');

const { getCountries, isValidCountryCode, normalizeCountryCode, getCountryName } = require('../../utils/country');

const { BLOG_CATEGORIES } = require('../../utils/blog');

const { renderWaiverTemplate } = require('../../utils/waiver');

const { assertRunDateNotFuture, parseRunDateOnly } = require('../../utils/platform-date');

const { isRunDateAlignedWithEvent } = require('../../utils/submission-window');

const {
  canRunnerSubmitPaymentProof,
  getInitialRegistrationPaymentStatus
} = require('../../utils/payment-workflow');

const {
  createSubmission,
  editRejectedSubmissionMetadata,
  resubmitSubmission,
  getEligibleRunnerRegistration,
  getRunnerSubmissions,
  getRunnerPerformanceSnapshot,
  PERSONAL_RECORD_REGISTRATION_ID
} = require('../../services/submission.service');

const AccumulatedActivitySubmission = require('../../models/AccumulatedActivitySubmission');

const {
  createAccumulatedActivitySubmission,
  getAccumulatedActivitiesForRegistrations,
  buildAccumulatedProgress
} = require('../../services/accumulated-activity.service');

const {
  acquireSubmissionIdempotencyLock,
  buildPaymentProofIdempotencyKey,
  buildProofSubmissionIdempotencyKey
} = require('../../services/submission-idempotency.service');

const { resolveAccumulatedTargetDistanceKm } = require('../../services/accumulated-target.service');

const {
  evaluateRegistrationAchievementsInBackground,
  getRunnerEarnedBadges,
  getPublicBadgeVerification: loadPublicBadgeVerification
} = require('../../services/achievement.service');

const {
  getLeaderboardDiscoveryData,
  getHomepageLeaderboard,
  getEventLeaderboard,
  getMyStanding
} = require('../../services/leaderboard.service');

const {
  buildPublicEventSeo,
  buildPublicEventView,
  renderEventDetailsContent
} = require('../../utils/event-public-view');

const {
  getCustomizedRegistrationOptions,
  getRegistrationPackageOptions,
  getRaceCategoryOptions,
  resolveRegistrationPrice
} = require('../../services/registration-price.service');

const { getEventBadgesByMongoEventId } = require('../../services/event-badge.service');

const { listProductsByMongoEventId } = require('../../services/shop/product.service');

const { recalculateOrderTotals } = require('../../services/shop/order.service');

const { buildPublicEventListPage, listHomepagePromotedEvents, getEventCardDisplayState } = require('../../services/public-event-list.service');

const { getHomepageCarouselSettings } = require('../../services/homepage-carousel-setting.service');

const { getPostgresClient } = require('../../db/postgres');

const { getPublicEventVisibilityQuery } = require('../../utils/public-event-visibility');
const { getCanonicalBlogSlug, getPublicBlogQuery } = require('../../utils/blog-canonical');

const logger = require('../../utils/logger');

const { recordSyncFailureInBackground } = require('../../services/sync-failure.service');

const { recordCriticalAuditEventInBackground } = require('../../services/critical-audit.service');

const countries = getCountries();

function getAppBaseUrl() {
  return String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
}

function getSitemapBaseUrl(req) {
  const configured = getAppBaseUrl();
  if (configured) return configured;

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = String(req.get('host') || '').trim();
  return host ? `${protocol}://${host}` : 'https://hellorun.online';
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildRegistrationOrderNote(registrationId) {
  return `registration:${String(registrationId || '').trim()}`;
}

function formatDateOnly(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

async function getPublishedEventBySlug(slugInput) {
  const slug = typeof slugInput === 'string' ? slugInput.trim() : '';
  if (!slug) return null;
  return Event.findOne({ slug, ...getPublicEventVisibilityQuery(new Date()) });
}

function renderEventNotFound(res) {
  return res.status(404).render('error', {
    title: '404 - Event Not Found',
    status: 404,
    message: 'This event is not available.'
  });
}

module.exports = {
  crypto,
  Event,
  User,
  Registration,
  Submission,
  OrganiserApplication,
  Blog,
  BlogLike,
  communicationService,
  registerBlogView,
  getRunnerRegistrations,
  listPolicyDocuments,
  uploadService,
  getCountries,
  isValidCountryCode,
  normalizeCountryCode,
  getCountryName,
  BLOG_CATEGORIES,
  renderWaiverTemplate,
  assertRunDateNotFuture,
  parseRunDateOnly,
  isRunDateAlignedWithEvent,
  canRunnerSubmitPaymentProof,
  getInitialRegistrationPaymentStatus,
  createSubmission,
  editRejectedSubmissionMetadata,
  resubmitSubmission,
  getEligibleRunnerRegistration,
  getRunnerSubmissions,
  getRunnerPerformanceSnapshot,
  PERSONAL_RECORD_REGISTRATION_ID,
  AccumulatedActivitySubmission,
  createAccumulatedActivitySubmission,
  getAccumulatedActivitiesForRegistrations,
  buildAccumulatedProgress,
  acquireSubmissionIdempotencyLock,
  buildPaymentProofIdempotencyKey,
  buildProofSubmissionIdempotencyKey,
  resolveAccumulatedTargetDistanceKm,
  evaluateRegistrationAchievementsInBackground,
  getRunnerEarnedBadges,
  loadPublicBadgeVerification,
  getLeaderboardDiscoveryData,
  getHomepageLeaderboard,
  getEventLeaderboard,
  getMyStanding,
  buildPublicEventSeo,
  buildPublicEventView,
  renderEventDetailsContent,
  getCustomizedRegistrationOptions,
  getRegistrationPackageOptions,
  getRaceCategoryOptions,
  resolveRegistrationPrice,
  getEventBadgesByMongoEventId,
  listProductsByMongoEventId,
  recalculateOrderTotals,
  buildPublicEventListPage,
  listHomepagePromotedEvents,
  getEventCardDisplayState,
  getHomepageCarouselSettings,
  getPostgresClient,
  getPublicEventVisibilityQuery,
  getCanonicalBlogSlug,
  getPublicBlogQuery,
  logger,
  recordSyncFailureInBackground,
  recordCriticalAuditEventInBackground,
  countries,
  getAppBaseUrl,
  getSitemapBaseUrl,
  escapeXml,
  buildRegistrationOrderNote,
  formatDateOnly,
  getPublishedEventBySlug,
  renderEventNotFound
};
