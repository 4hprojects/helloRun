const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const OrganiserApplication = require('../../models/OrganiserApplication');
const User = require('../../models/User');
const passwordService = require('../../services/password.service');
const Blog = require('../../models/Blog');
const BlogComment = require('../../models/BlogComment');
const BlogReport = require('../../models/BlogReport');
const Event = require('../../models/Event');
const Registration = require('../../models/Registration');
const Submission = require('../../models/Submission');
const AccumulatedActivitySubmission = require('../../models/AccumulatedActivitySubmission');
const PrivacyPolicy = require('../../models/PrivacyPolicy');
const communicationService = require('../../services/communication.service');
const {
  getCommunicationRetryHealth,
  listCommunicationRetryAudit,
  listCommunicationRetries,
  retryCommunicationNow
} = require('../../services/reliable-communication.service');
const homepageCarouselSettingService = require('../../services/homepage-carousel-setting.service');
const adSettingService = require('../../services/ad-setting.service');
const { recordCriticalAuditEventInBackground } = require('../../services/critical-audit.service');
const { getTestDataCounts, purgeTestData } = require('../../services/test-data-cleanup.service');
const { getTestUserCounts, purgeTestUsers, TEST_USER_EMAIL_PATTERN } = require('../../services/test-user-cleanup.service');
const { reviewSubmission } = require('../../services/submission.service');
const { reviewAccumulatedActivitySubmission } = require('../../services/accumulated-activity.service');
const { getPostgresClient } = require('../../db/postgres');
const crypto = require('crypto');
const { listRecentBadgeAuditLogs } = require('../../services/badge-audit.service');
const { publishEvent } = require('../../services/event-approval.service');
const { getPolicyByAdminPath } = require('../../services/policy-registry.service');
const {
  listBadgeDefinitions,
  listAdminUserBadges,
  getAdminBadgeAnalytics,
  revokeUserBadge,
  updateBadgeDefinitionStatus: updateBadgeDefinitionStatusSvc,
  updateBadgeDefinitionEmailLevel: updateBadgeDefinitionEmailLevelSvc,
  recalculateBadgeAwards,
  previewBadgeRecalculation,
  getRunnerEarnedBadges,
  evaluateOrganiserAchievementsInBackground
} = require('../../services/achievement.service');
const {
  buildSubmissionHubPath,
  listSubmissionHub,
  listSubmissionHubEvents
} = require('../../services/submission-hub.service');
const uploadService = require('../../services/upload.service');
const { markdownToHtml } = require('../../utils/markdown');
const { sanitizeHtml } = require('../../utils/sanitize');
const {
  DEFAULT_WAIVER_TEMPLATE,
  applyEventFormData,
  countries,
  getCreateEventFormData,
  getCreateEventFormDataFromEvent,
  getPublishReadinessErrors,
  validateCreateEventForm
} = require('../../services/event-form.service');
const {
  getCountries,
  getCountryName,
  isValidCountryCode,
  normalizeCountryCode
} = require('../../utils/country');
const { buildSubmissionReviewSignal } = require('../../utils/submission-review-labels');
const { isFullAdminTier } = require('../../middleware/auth.middleware');

const VALID_FILTER_STATUSES = ['pending', 'under_review', 'approved', 'rejected'];
const REVIEWABLE_STATUSES = ['pending', 'under_review'];
const MIN_REJECTION_REASON_LENGTH = 15;
const MAX_REJECTION_REASON_LENGTH = 500;
const MAX_PRIVACY_POLICY_CONTENT_LENGTH = 250000;
const POLICY_SLUG = 'privacy-policy';
const TERMS_POLICY_SLUG = 'terms-of-service';
const COOKIE_POLICY_SLUG = 'cookie-policy';
const PRIVACY_POLICY_MANAGE_PATH = '/admin/privacy-policy';
const TERMS_POLICY_MANAGE_PATH = '/admin/terms-and-conditions';
const COOKIE_POLICY_MANAGE_PATH = '/admin/cookie-policy';
const ADMIN_REVIEW_TYPES = ['all', 'payments', 'results'];
const ADMIN_REVIEW_SORTS = ['oldest', 'newest'];
const ADMIN_EVENT_STATUSES = ['draft', 'pending_review', 'published', 'closed', 'archived'];
const ADMIN_USER_ROLES = ['runner', 'organiser', 'admin'];
const ADMIN_TIER_OPTIONS = ['full', 'support'];
const ADMIN_USER_ORGANIZER_STATUSES = ['not_applied', 'pending', 'approved', 'rejected'];
const ADMIN_USER_AUTH_PROVIDERS = ['local', 'google'];
const ADMIN_USER_ACCOUNT_STATUSES = ['active', 'restricted', 'suspended', 'closed'];
const ADMIN_USER_SORTS = ['newest', 'oldest', 'updated', 'role'];
const ADMIN_USERS_PER_PAGE = 25;
const ADMIN_USER_PER_PAGE_OPTIONS = [25, 50, 100];
const ADMIN_BADGE_STATUSES = ['verified', 'revoked', 'pending_review', 'all'];
const ADMIN_BADGE_SCOPES = ['all', 'event', 'challenge', 'global', 'organiser'];
const adminUserProfileCountries = getCountries();
const POLICY_HEADING_PATTERNS = [
  /^hello\s*run\s*privacy\s*policy$/i,
  /^privacy\s*policy$/i,
  /^hello\s*run\s*terms\s+and\s+conditions$/i,
  /^terms\s+and\s+conditions$/i,
  /^terms\s+of\s+service$/i,
  /^hello\s*run\s*cookie\s*policy$/i,
  /^cookie\s*policy$/i,
  /^acceptance\s+of\s+terms$/i,
  /^eligibility$/i,
  /^account\s+registration$/i,
  /^user\s+responsibilities$/i,
  /^prohibited\s+conduct$/i,
  /^payments?\s+and\s+fees$/i,
  /^refunds?$/i,
  /^event\s+rules$/i,
  /^intellectual\s+property$/i,
  /^limitation\s+of\s+liability$/i,
  /^disclaimer$/i,
  /^termination$/i,
  /^governing\s+law$/i,
  /^dispute\s+resolution$/i,
  /^introduction$/i,
  /^overview$/i,
  /^scope$/i,
  /^information\s+we\s+collect$/i,
  /^data\s+we\s+collect$/i,
  /^information\s+you\s+provide$/i,
  /^how\s+we\s+use\s+(your\s+)?(information|data)$/i,
  /^how\s+we\s+share\s+(your\s+)?(information|data)$/i,
  /^sharing\s+of\s+(your\s+)?(information|data)$/i,
  /^data\s+retention$/i,
  /^data\s+security$/i,
  /^security$/i,
  /^cookies(\s+and\s+tracking)?$/i,
  /^payment(\s+information)?$/i,
  /^proof\s+of\s+payment$/i,
  /^third[-\s]?party\s+services$/i,
  /^children('?s)?\s+privacy$/i,
  /^your\s+rights$/i,
  /^changes\s+to\s+this\s+privacy\s+policy$/i,
  /^international\s+data\s+transfers?$/i,
  /^contact\s+us$/i
];
const POLICY_LABEL_ALLOWLIST = new Set([
  'effective date',
  'last updated',
  'updated',
  'version',
  'contact',
  'contact email',
  'email',
  'phone',
  'address',
  'website',
  'payment method',
  'proof of payment',
  'data controller',
  'support'
]);
const POLICY_LABEL_BLOCKLIST = new Set(['note', 'please note', 'important', 'example', 'tip', 'warning']);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getMessageFromQuery(req) {
  const rawMessage = typeof req.query.msg === 'string' ? req.query.msg.trim() : '';
  if (!rawMessage) return null;

  const type = ['success', 'error', 'info'].includes(req.query.type) ? req.query.type : 'info';
  return {
    type,
    text: rawMessage.slice(0, 200)
  };
}

function canPublishFromMessage(message) {
  if (!message || message.type !== 'success') return false;
  return /draft saved/i.test(String(message.text || ''));
}

function normalizeApplicationQueueReturn(value) {
  const path = String(value || '').trim();
  if (!path.startsWith('/admin/applications') || path.startsWith('//') || /[\r\n]/.test(path)) return '';
  return path.slice(0, 1200);
}

function buildDetailRedirect(applicationId, type, message, returnTo = '') {
  const params = new URLSearchParams({
    type,
    msg: message
  });
  const safeReturnTo = normalizeApplicationQueueReturn(returnTo);
  if (safeReturnTo) params.set('returnTo', safeReturnTo);
  return `/admin/applications/${applicationId}?${params.toString()}`;
}

function canTransitionStatus(currentStatus, targetStatus) {
  return REVIEWABLE_STATUSES.includes(currentStatus) && currentStatus !== targetStatus;
}

function getRequestIpAddress(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const directIp = String(req.ip || '').trim();
  return (forwardedFor || directIp).slice(0, 120);
}

function getRequestUserAgent(req) {
  return String(req.get('user-agent') || '').trim().slice(0, 500);
}

async function purgeApplicationDocuments(application) {
  const keys = [
    uploadService.extractObjectKeyFromPublicUrl(application.idProofUrl),
    uploadService.extractObjectKeyFromPublicUrl(application.businessProofUrl)
  ].filter(Boolean);

  if (keys.length) {
    await uploadService.deleteObjects(keys);
  }

  application.idProofUrl = '';
  application.businessProofUrl = '';
}

function renderApplicationNotFound(res) {
  return res.status(404).render('error', {
    title: '404 - Application Not Found',
    status: 404,
    message: 'The requested organizer application does not exist.'
  });
}

function renderServerError(res, error, fallbackMessage) {
  logger.error(fallbackMessage, error);
  return res.status(500).render('error', {
    title: '500 - Server Error',
    status: 500,
    message: fallbackMessage
  });
}

function buildAdminRedirect(pathname, type, message) {
  const params = new URLSearchParams({ type, msg: message });
  return `${pathname}?${params.toString()}`;
}

function appendAdminPageMessage(pathname, type, message) {
  const separator = String(pathname || '').includes('?') ? '&' : '?';
  const params = new URLSearchParams({ type, msg: message });
  return `${pathname}${separator}${params.toString()}`;
}

function buildCommunicationLogHref(filters = {}, page = 1) {
  const params = new URLSearchParams();
  ['eventKey', 'channel', 'status', 'recipient'].forEach((key) => {
    if (filters[key]) params.set(key, filters[key]);
  });
  if (Number(page) > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/admin/communications?${query}` : '/admin/communications';
}

function buildCommunicationRetryHref(filters = {}, page = 1) {
  const params = new URLSearchParams();
  ['eventKey', 'status', 'q'].forEach((key) => {
    if (filters[key]) params.set(key, filters[key]);
  });
  if (Number(page) > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/admin/communications/retries?${query}` : '/admin/communications/retries';
}

function buildCommunicationRetryActionHref(retryId, filters = {}) {
  const params = new URLSearchParams();
  ['eventKey', 'status', 'q'].forEach((key) => {
    if (filters[key]) params.set(key, filters[key]);
  });
  const query = params.toString();
  return `/admin/communications/retries/${retryId}/retry${query ? `?${query}` : ''}`;
}

function buildCommunicationFailureDetailHref(eventKey) {
  return `/admin/communications/failures/${encodeURIComponent(String(eventKey || '').trim())}`;
}

function getAdminPageMessage(query = {}) {
  const type = String(query.type || '').trim();
  const text = String(query.msg || '').trim();
  if (!text || !['success', 'error', 'info', 'warning'].includes(type)) return null;
  return { type, text };
}

function acceptsJson(req) {
  const accept = String(req.get('accept') || '').toLowerCase();
  if (accept.includes('text/html') && !accept.includes('application/json')) {
    return false;
  }
  return true;
}

function normalizePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function verifyAdminDeletionPassword(req) {
  const adminPassword = String(req.body?.adminPassword || '').trim();
  if (!adminPassword) {
    return { ok: false, status: 400, message: 'Password is required to confirm deletion.' };
  }
  const adminUser = await User.findById(req.session.userId).select('passwordHash').lean();
  if (!adminUser || !adminUser.passwordHash) {
    return { ok: false, status: 403, message: 'Unable to verify your identity. Deletion cancelled.' };
  }
  const isValidPassword = await passwordService.comparePassword(adminPassword, adminUser.passwordHash);
  if (!isValidPassword) {
    return { ok: false, status: 403, message: 'Incorrect password. Deletion cancelled.' };
  }
  return { ok: true };
}

function normalizeAdminEventFilters(query = {}) {
  const statusRaw = String(query.status || '').trim();
  const status = ADMIN_EVENT_STATUSES.includes(statusRaw) ? statusRaw : '';
  const eventType = ['virtual', 'onsite', 'hybrid'].includes(String(query.eventType || '').trim()) ? String(query.eventType).trim() : '';
  const deleted = statusRaw === 'deleted' || String(query.deleted || '').trim() === '1';
  const testData = String(query.testData || '').trim() === '1';
  const q = String(query.q || '').trim().slice(0, 100);
  const needsReview = String(query.needsReview || '').trim() === '1';
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const perPageRaw = String(query.perPage || '').trim().toLowerCase();
  const perPageParsed = Number.parseInt(perPageRaw, 10);
  const perPage = perPageRaw === 'all'
    ? 'all'
    : ([25, 50, 100].includes(perPageParsed) ? perPageParsed : 25);
  return { status, eventType, deleted, testData, q, needsReview, page, perPage };
}

function buildAdminEventQuery(filters) {
  const query = filters.deleted ? { isDeleted: true } : { isDeleted: { $ne: true } };
  if (filters.testData) query.isTestData = true;
  if (filters.needsReview) query.status = 'pending_review';
  else if (filters.status) query.status = filters.status;
  else if (!filters.deleted) query.status = { $ne: 'archived' };
  if (filters.eventType) query.eventType = filters.eventType;
  if (filters.q) {
    const safePattern = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { title: safePattern },
      { slug: safePattern },
      { referenceCode: safePattern },
      { organiserName: safePattern },
      { city: safePattern },
      { country: safePattern }
    ];
  }
  return query;
}

function normalizeAdminUserFilters(query = {}) {
  const role = ADMIN_USER_ROLES.includes(String(query.role || '').trim()) ? String(query.role).trim() : '';
  const organizerStatus = ADMIN_USER_ORGANIZER_STATUSES.includes(String(query.organizerStatus || '').trim())
    ? String(query.organizerStatus).trim()
    : '';
  const emailVerified = ['yes', 'no'].includes(String(query.emailVerified || '').trim())
    ? String(query.emailVerified).trim()
    : '';
  const authProvider = ADMIN_USER_AUTH_PROVIDERS.includes(String(query.authProvider || '').trim())
    ? String(query.authProvider).trim()
    : '';
  const sort = ADMIN_USER_SORTS.includes(String(query.sort || '').trim()) ? String(query.sort).trim() : 'newest';
  const q = String(query.q || '').trim().slice(0, 120);
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const perPageRaw = String(query.perPage || '').trim().toLowerCase();
  const perPageParsed = Number.parseInt(perPageRaw, 10);
  const perPage = perPageRaw === 'all'
    ? 'all'
    : (ADMIN_USER_PER_PAGE_OPTIONS.includes(perPageParsed) ? perPageParsed : ADMIN_USERS_PER_PAGE);

  const accountStatus = ADMIN_USER_ACCOUNT_STATUSES.includes(String(query.accountStatus || '').trim())
    ? String(query.accountStatus).trim()
    : '';
  const testFixture = String(query.testFixture || '').trim() === '1';

  return {
    role,
    organizerStatus,
    emailVerified,
    authProvider,
    accountStatus,
    testFixture,
    sort,
    q,
    page,
    perPage
  };
}

function buildAdminUserQuery(filters) {
  const query = {};
  if (filters.role) query.role = filters.role;
  if (filters.organizerStatus) query.organizerStatus = filters.organizerStatus;
  if (filters.emailVerified === 'yes') query.emailVerified = true;
  if (filters.emailVerified === 'no') query.emailVerified = false;
  if (filters.authProvider) query.authProvider = filters.authProvider;
  if (filters.accountStatus) query.accountStatus = filters.accountStatus;
  if (filters.testFixture) {
    query.email = TEST_USER_EMAIL_PATTERN;
    query.role = { $ne: 'admin' };
  }
  if (filters.q) {
    const safeRegex = new RegExp(escapeRegex(filters.q), 'i');
    query.$or = [
      { userId: safeRegex },
      { email: safeRegex },
      { firstName: safeRegex },
      { lastName: safeRegex }
    ];
  }
  return query;
}

function getAdminUserSort(sort) {
  if (sort === 'oldest') return { createdAt: 1 };
  if (sort === 'updated') return { updatedAt: -1, createdAt: -1 };
  if (sort === 'role') return { role: 1, createdAt: -1 };
  return { createdAt: -1 };
}

function buildAdminUserListPath(filters, overrides = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  ['q', 'role', 'organizerStatus', 'emailVerified', 'authProvider', 'accountStatus', 'sort'].forEach((key) => {
    if (next[key]) params.set(key, next[key]);
  });
  if (next.testFixture) params.set('testFixture', '1');
  if (next.perPage && next.perPage !== ADMIN_USERS_PER_PAGE) params.set('perPage', String(next.perPage));
  if (next.page && Number(next.page) > 1) params.set('page', String(next.page));
  const query = params.toString();
  return query ? `/admin/users?${query}` : '/admin/users';
}

function buildAdminUsersRedirect(type, message) {
  return buildAdminRedirect('/admin/users', type, message);
}

function formatUserDisplayName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'N/A';
}

function getCountMap(items, key = '_id') {
  return new Map((items || []).map((item) => [String(item[key]), Number(item.count || 0)]));
}

function maskDateForAdmin(value) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return 'Set';
}

function formatAdminShortDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US');
}

function formatAdminDateTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US');
}

function formatAdminEnumLabel(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return 'Not set';
  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateForAdminInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeAdminRunningGroups(value) {
  const asArray = Array.isArray(value) ? value : String(value || '').split(/[\n,]/);
  return Array.from(
    new Set(
      asArray
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  ).slice(0, 10);
}

function getAdminUserEditFormData(source = {}) {
  const runningGroups = normalizeAdminRunningGroups(source.runningGroups || source.runningGroup);
  return {
    firstName: String(source.firstName || '').trim(),
    lastName: String(source.lastName || '').trim(),
    mobile: String(source.mobile || '').trim(),
    country: normalizeCountryCode(source.country),
    dateOfBirth: formatDateForAdminInput(source.dateOfBirth),
    gender: String(source.gender || '').trim(),
    emergencyContactName: String(source.emergencyContactName || '').trim(),
    emergencyContactNumber: String(source.emergencyContactNumber || '').trim(),
    runningGroups,
    runningGroup: runningGroups[0] || '',
    role: String(source.role || '').trim() || 'runner',
    organizerStatus: String(source.organizerStatus || '').trim() || 'not_applied',
    adminTier: String(source.adminTier || '').trim() || 'full'
  };
}

function validateAdminUserEditForm(formData) {
  const errors = {};
  const validGenders = new Set(['', 'male', 'female', 'non_binary', 'prefer_not_to_say']);

  if (formData.firstName && (formData.firstName.length < 2 || formData.firstName.length > 60)) {
    errors.firstName = 'First name must be 2-60 characters when set.';
  }
  if (formData.lastName && (formData.lastName.length < 2 || formData.lastName.length > 60)) {
    errors.lastName = 'Last name must be 2-60 characters when set.';
  }
  if (formData.mobile && !/^[\d\s\-()+]{7,25}$/.test(formData.mobile)) {
    errors.mobile = 'Enter a valid mobile number.';
  }
  if (formData.country && !isValidCountryCode(formData.country)) {
    errors.country = 'Select a valid country.';
  }
  if (formData.dateOfBirth) {
    const dob = new Date(`${formData.dateOfBirth}T00:00:00.000Z`);
    if (Number.isNaN(dob.getTime())) {
      errors.dateOfBirth = 'Enter a valid date of birth.';
    } else if (dob > new Date()) {
      errors.dateOfBirth = 'Date of birth cannot be in the future.';
    }
  }
  if (!validGenders.has(formData.gender)) {
    errors.gender = 'Select a valid gender option.';
  }
  if (formData.emergencyContactName.length > 120) {
    errors.emergencyContactName = 'Emergency contact name must be 120 characters or less.';
  }
  if (formData.emergencyContactNumber && !/^[\d\s\-()+]{7,25}$/.test(formData.emergencyContactNumber)) {
    errors.emergencyContactNumber = 'Enter a valid emergency contact number.';
  }
  if (formData.runningGroups.length > 10) {
    errors.runningGroups = 'You can add up to 10 running groups.';
  }
  if (formData.runningGroups.some((item) => item.length > 120)) {
    errors.runningGroups = 'Each running group must be 120 characters or less.';
  }
  if (!ADMIN_USER_ROLES.includes(formData.role)) {
    errors.role = 'Select a valid role.';
  }
  if (!ADMIN_USER_ORGANIZER_STATUSES.includes(formData.organizerStatus)) {
    errors.organizerStatus = 'Select a valid organizer status.';
  }
  if (!ADMIN_TIER_OPTIONS.includes(formData.adminTier)) {
    errors.adminTier = 'Select a valid admin tier.';
  }

  return errors;
}

async function findAdminManagedUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  return User.findById(userId);
}

function renderAdminUserNotFound(res) {
  return res.status(404).render('error', {
    title: '404 - User Not Found',
    status: 404,
    message: 'User not found. The requested user does not exist.'
  });
}

function renderAdminUserEdit(res, user, formData, options = {}) {
  return res.status(options.status || 200).render('admin/user-edit', {
    title: `Edit ${formatUserDisplayName(user)} - User Management - HelloRun Admin`,
    managedUser: {
      id: String(user._id),
      userId: user.userId || 'N/A',
      email: user.email || 'N/A',
      displayName: formatUserDisplayName(user),
      role: user.role || 'runner',
      organizerStatus: user.organizerStatus || 'not_applied',
      adminTier: user.adminTier || 'full'
    },
    formData,
    countries: adminUserProfileCountries,
    viewerIsFullAdmin: Boolean(options.viewerIsFullAdmin),
    isSelfEdit: Boolean(options.isSelfEdit),
    errors: options.errors || {},
    message: options.message || null
  });
}

async function getAdminUserActivityCounts(userIds) {
  if (!userIds.length) {
    return {
      registrations: new Map(),
      submissions: new Map(),
      approvedSubmissions: new Map(),
      ownedEvents: new Map(),
      blogs: new Map(),
      comments: new Map(),
      applications: new Map()
    };
  }

  const [registrations, submissions, approvedSubmissions, ownedEvents, blogs, comments, applications] = await Promise.all([
    Registration.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]),
    Submission.aggregate([
      { $match: { runnerId: { $in: userIds } } },
      { $group: { _id: '$runnerId', count: { $sum: 1 } } }
    ]),
    Submission.aggregate([
      { $match: { runnerId: { $in: userIds }, status: 'approved' } },
      { $group: { _id: '$runnerId', count: { $sum: 1 } } }
    ]),
    Event.aggregate([
      { $match: { organizerId: { $in: userIds }, isDeleted: { $ne: true } } },
      { $group: { _id: '$organizerId', count: { $sum: 1 } } }
    ]),
    Blog.aggregate([
      { $match: { authorId: { $in: userIds }, isDeleted: { $ne: true } } },
      { $group: { _id: '$authorId', count: { $sum: 1 } } }
    ]),
    BlogComment.aggregate([
      { $match: { authorId: { $in: userIds }, isDeleted: { $ne: true } } },
      { $group: { _id: '$authorId', count: { $sum: 1 } } }
    ]),
    OrganiserApplication.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ])
  ]);

  return {
    registrations: getCountMap(registrations),
    submissions: getCountMap(submissions),
    approvedSubmissions: getCountMap(approvedSubmissions),
    ownedEvents: getCountMap(ownedEvents),
    blogs: getCountMap(blogs),
    comments: getCountMap(comments),
    applications: getCountMap(applications)
  };
}

function mapAdminUserListItem(user, counts, currentAdminId = '') {
  const id = String(user._id);
  const dependencyCount = (counts.registrations.get(id) || 0)
    + (counts.submissions.get(id) || 0)
    + (counts.ownedEvents.get(id) || 0)
    + (counts.blogs.get(id) || 0)
    + (counts.comments.get(id) || 0)
    + (counts.applications.get(id) || 0);
  const isCurrentAdmin = id === String(currentAdminId || '');

  return {
    id,
    userId: user.userId || 'N/A',
    name: formatUserDisplayName(user),
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || 'N/A',
    role: user.role || 'runner',
    organizerStatus: user.organizerStatus || 'not_applied',
    emailVerified: Boolean(user.emailVerified),
    authProvider: user.authProvider || 'local',
    hasGoogleLink: Boolean(user.googleId),
    mobile: user.mobile || 'Not set',
    country: user.country ? getCountryName(user.country) : 'Not set',
    dateOfBirth: maskDateForAdmin(user.dateOfBirth),
    gender: formatAdminEnumLabel(user.gender),
    emergencyContactName: user.emergencyContactName || 'Not set',
    emergencyContactNumber: user.emergencyContactNumber || 'Not set',
    runningGroups: user.runningGroups && user.runningGroups.length
      ? user.runningGroups.join(', ')
      : (user.runningGroup || 'Not set'),
    accountStatus: user.accountStatus || 'active',
    adminTier: user.role === 'admin' ? (user.adminTier || 'full') : '',
    lastLoginAt: user.lastLoginAt || null,
    lastLoginAtLabel: user.lastLoginAt ? formatAdminShortDate(user.lastLoginAt) : 'Never',
    lastLoginAtDetailLabel: user.lastLoginAt ? formatAdminDateTime(user.lastLoginAt) : 'Never logged in',
    createdAt: user.createdAt,
    createdAtLabel: formatAdminShortDate(user.createdAt),
    createdAtDetailLabel: formatAdminDateTime(user.createdAt),
    updatedAt: user.updatedAt,
    updatedAtLabel: formatAdminDateTime(user.updatedAt),
    registrationCount: counts.registrations.get(id) || 0,
    submissionCount: counts.submissions.get(id) || 0,
    approvedSubmissionCount: counts.approvedSubmissions.get(id) || 0,
    ownedEventCount: counts.ownedEvents.get(id) || 0,
    blogCount: counts.blogs.get(id) || 0,
    commentCount: counts.comments.get(id) || 0,
    applicationCount: counts.applications.get(id) || 0,
    dependencyCount,
    canDelete: !isCurrentAdmin,
    deleteBlockedReason: isCurrentAdmin
      ? 'You cannot delete your own admin account.'
      : ''
  };
}

function normalizeUserIdsForDeletion(req) {
  const rawValues = []
    .concat(req.params.id || [])
    .concat(req.body?.userId || [])
    .concat(req.body?.userIds || [])
    .flat();

  return Array.from(new Set(
    rawValues
      .flatMap((value) => String(value || '').split(','))
      .map((value) => value.trim())
      .filter((value) => mongoose.Types.ObjectId.isValid(value))
  ));
}

const BULK_DELETE_CAP = 50;

async function getUserDeleteBlockers(userIds, currentAdminId) {
  const blockers = new Map();

  userIds.forEach((id) => {
    if (String(id) === String(currentAdminId || '')) blockers.set(id, 'self');
  });

  return blockers;
}

function formatEventStatusLabel(status) {
  const value = String(status || '').trim();
  if (value === 'pending_review') return 'Pending Review';
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A';
}

function getAdminEventRedirect(eventId, type, message) {
  return buildAdminRedirect(`/admin/events/${eventId}`, type, message);
}

async function findAdminEventOrNull(eventId, includeDeleted = false) {
  if (!mongoose.Types.ObjectId.isValid(eventId)) return null;
  const query = { _id: eventId };
  if (!includeDeleted) query.isDeleted = { $ne: true };
  return Event.findOne(query).populate('organizerId', 'firstName lastName email role organizerStatus');
}

async function getEventCountsById(eventIds) {
  if (!eventIds.length) return new Map();
  const [registrationCounts, submissionCounts] = await Promise.all([
    Registration.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: '$eventId', count: { $sum: 1 } } }
    ]),
    Submission.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: '$eventId', count: { $sum: 1 } } }
    ])
  ]);
  const counts = new Map(eventIds.map((id) => [String(id), { registrations: 0, submissions: 0 }]));
  for (const item of registrationCounts) {
    const existing = counts.get(String(item._id)) || { registrations: 0, submissions: 0 };
    existing.registrations = Number(item.count || 0);
    counts.set(String(item._id), existing);
  }
  for (const item of submissionCounts) {
    const existing = counts.get(String(item._id)) || { registrations: 0, submissions: 0 };
    existing.submissions = Number(item.count || 0);
    counts.set(String(item._id), existing);
  }
  return counts;
}

function formatAdminReviewDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function normalizeAdminReviewType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ADMIN_REVIEW_TYPES.includes(normalized) ? normalized : 'all';
}

function normalizeAdminReviewSort(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ADMIN_REVIEW_SORTS.includes(normalized) ? normalized : 'oldest';
}

function buildReviewQueueParams(filters, overrides = {}) {
  const params = new URLSearchParams();
  const type = overrides.type ?? filters.type;
  const sort = overrides.sort ?? filters.sort;
  const q = overrides.q ?? filters.q;
  if (type && type !== 'all') params.set('type', type);
  if (sort && sort !== 'oldest') params.set('sort', sort);
  if (q) params.set('q', q);
  const query = params.toString();
  return query ? `/admin/reviews?${query}` : '/admin/reviews';
}

function buildPolicyHtmlFromMarkdown(markdown) {
  return sanitizeHtml(markdownToHtml(markdown), {
    allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
    allowedAttributes: {
      a: ['href', 'rel', 'target']
    }
  });
}

function buildEventDetailsHtml(markdown) {
  return sanitizeHtml(markdownToHtml(markdown), {
    allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    allowedAttributes: {
      a: ['href', 'rel', 'target']
    }
  });
}

function sanitizeRichPolicyHtml(rawHtml) {
  return sanitizeHtml(String(rawHtml || ''), {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'a', 'h1', 'h2', 'h3', 'h4', 'code', 'pre'],
    allowedAttributes: {
      a: ['href', 'rel', 'target']
    }
  });
}

function richHtmlToPlainTextBlocks(input) {
  return normalizePolicyMarkdown(
    String(input || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|blockquote|pre)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

function normalizePolicyMarkdown(rawValue) {
  return String(rawValue || '').replace(/\r\n/g, '\n');
}

function hasPolicyContent(markdown) {
  return String(markdown || '').trim().length > 0;
}

function replacePolicyArtifacts(value) {
  let output = String(value || '');

  // Try fixing common mojibake first (e.g., Ã¢â‚¬â„¢ style artifacts).
  if (/[Ãâ]/.test(output)) {
    try {
      const maybeUtf8 = Buffer.from(output, 'latin1').toString('utf8');
      if (maybeUtf8 && !maybeUtf8.includes('\uFFFD')) {
        output = maybeUtf8;
      }
    } catch (error) {
      // Keep original output if conversion fails.
    }
  }

  const replacements = [
    [/\u00e2\u20ac\u0153/g, '"'],
    [/\u00e2\u20ac\u009d/g, '"'],
    [/\u00e2\u20ac\u02dc/g, "'"],
    [/\u00e2\u20ac\u2122/g, "'"],
    [/\u00e2\u20ac\u201c/g, '-'],
    [/\u00e2\u20ac\u201d/g, '-'],
    [/\u00e2\u20ac\u00a6/g, '...'],
    [/\u00e2\u20ac\u00a2/g, '-'],
    [/[\u201c\u201d]/g, '"'],
    [/[\u2018\u2019]/g, "'"],
    [/[\u2013\u2014]/g, '-'],
    [/\u2026/g, '...'],
    [/[\u2022\u25cf\u25e6]/g, '-'],
    [/\\\[(.*?)\\\]/g, '[$1]']
  ];
  replacements.forEach(([patternItem, replacementItem]) => {
    output = output.replace(patternItem, replacementItem);
  });
  return output;
}

function collapseBlankLines(lines) {
  const compact = [];
  let previousWasBlank = true;

  lines.forEach((line) => {
    const isBlank = String(line || '').trim() === '';
    if (isBlank) {
      if (!previousWasBlank) compact.push('');
    } else {
      compact.push(line);
    }
    previousWasBlank = isBlank;
  });

  while (compact.length && compact[0] === '') compact.shift();
  while (compact.length && compact[compact.length - 1] === '') compact.pop();
  return compact;
}

function normalizeMarkdownLine(line) {
  let nextLine = String(line || '').replace(/[ \t]+$/g, '');

  // Normalize heading spacing and remove bold wrappers in headings.
  nextLine = nextLine.replace(/^(#{1,6})([^\s#])/g, '$1 $2');
  nextLine = nextLine.replace(/^(#{1,6})\s+\*\*(.+?)\*\*\s*$/, '$1 $2');

  // Normalize unordered list marker to "- ".
  nextLine = nextLine.replace(/^\s*\*\s+/, '- ');
  return nextLine;
}

function shouldUseSmartPolicyFormatting(markdown) {
  const text = String(markdown || '').trim();
  if (!text) return false;
  if (/^#{1,6}\s+/m.test(text)) return false;
  if (/`{3,}|~{3,}/.test(text)) return false;
  if (/\[[^\]]+\]\([^)]+\)/.test(text)) return false;
  if (/^\|.+\|$/m.test(text)) return false;
  return true;
}

function normalizeInlineSpacing(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function cleanupPolicyHeadingText(value) {
  return normalizeInlineSpacing(
    String(value || '')
      .replace(/^#{1,6}\s*/, '')
      .replace(/^\d+[\.)]\s+/, '')
      .replace(/^[ivxlcdm]+[\.)]\s+/i, '')
      .replace(/^\*\*(.+)\*\*$/, '$1')
      .replace(/:+$/, '')
  );
}

function looksLikeAllCapsHeading(text) {
  const lettersOnly = String(text || '').replace(/[^a-z]/gi, '');
  if (lettersOnly.length < 5 || lettersOnly.length > 90) return false;
  const upperCount = lettersOnly.replace(/[^A-Z]/g, '').length;
  return upperCount / lettersOnly.length >= 0.8;
}

function looksLikeTitleCaseHeading(text) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 10) return false;

  const stopWords = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'your', 'you', 'our']);
  let score = 0;

  words.forEach((word) => {
    const token = word.replace(/[^a-z0-9'-]/gi, '');
    if (!token) return;
    if (stopWords.has(token.toLowerCase())) {
      score += 0.5;
      return;
    }
    if (/^[A-Z0-9][a-zA-Z0-9'-]*$/.test(token)) {
      score += 1;
    }
  });

  return score >= words.length * 0.7;
}

function detectPolicyHeading(line, isFirstContentLine) {
  const trimmed = String(line || '').trim();
  if (!trimmed || trimmed.length > 120) return null;
  if (/^[>*`]/.test(trimmed)) return null;
  if (/^[\-*]\s+/.test(trimmed)) return null;
  if (/[.!?]$/.test(trimmed)) return null;
  if (/:.+/.test(trimmed) && !/:\s*$/.test(trimmed)) return null;

  const headingText = cleanupPolicyHeadingText(trimmed);
  if (!headingText) return null;

  const words = headingText.split(/\s+/);
  if (words.length > 12) return null;

  const matchesKnownHeading = POLICY_HEADING_PATTERNS.some((patternItem) => patternItem.test(headingText));
  const looksLikeTitle = /(privacy policy|terms of service|terms and conditions)/i.test(headingText);
  const looksLikeSectionTitle = /:\s*$/.test(trimmed) && words.length <= 8;

  if (isFirstContentLine && looksLikeTitle) {
    return { level: '#', text: headingText };
  }

  if (matchesKnownHeading) {
    return { level: looksLikeTitle ? '#' : '##', text: headingText };
  }

  if (looksLikeSectionTitle || looksLikeAllCapsHeading(headingText) || looksLikeTitleCaseHeading(headingText)) {
    return { level: '##', text: headingText };
  }

  return null;
}

function parsePolicyLabelLine(line) {
  const match = String(line || '').match(/^([A-Za-z][A-Za-z0-9 '&()\/.\-]{1,45}):\s*(.+)$/);
  if (!match) return null;

  const label = normalizeInlineSpacing(match[1]).replace(/\*+/g, '');
  const value = normalizeInlineSpacing(match[2]);
  const normalizedLabel = label.toLowerCase();
  if (!value) return null;
  if (POLICY_LABEL_BLOCKLIST.has(normalizedLabel)) return null;

  const wordCount = label.split(/\s+/).length;
  if (!POLICY_LABEL_ALLOWLIST.has(normalizedLabel) && wordCount > 3) return null;
  return { label, value };
}

function parsePolicyListLine(line) {
  const unorderedMatch = String(line || '').match(/^(?:[-*•]\s+)(.+)$/);
  if (unorderedMatch) {
    return {
      type: 'unordered',
      value: normalizeInlineSpacing(unorderedMatch[1])
    };
  }

  const orderedMatch = String(line || '').match(/^(?:\d+|[a-zA-Z])[\.)]\s+(.+)$/);
  if (orderedMatch) {
    return {
      type: 'ordered',
      value: normalizeInlineSpacing(orderedMatch[1])
    };
  }

  return null;
}

function formatRawPolicyTextToMarkdown(rawInput) {
  const cleanedInput = replacePolicyArtifacts(normalizePolicyMarkdown(rawInput));
  const lines = cleanedInput.split('\n').map((line) => String(line || '').replace(/[ \t]+$/g, ''));
  const output = [];
  let paragraphBuffer = [];
  let inList = false;
  let hasSeenContent = false;

  const ensureTrailingBlankLine = () => {
    if (output.length && output[output.length - 1] !== '') {
      output.push('');
    }
  };

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    ensureTrailingBlankLine();
    const paragraphText = normalizeInlineSpacing(paragraphBuffer.join(' '))
      .replace(/\s+([,.;!?])/g, '$1')
      .trim();
    if (paragraphText) output.push(paragraphText);
    paragraphBuffer = [];
  };

  const closeList = () => {
    if (!inList) return;
    inList = false;
    ensureTrailingBlankLine();
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      return;
    }

    const normalizedLine = normalizeMarkdownLine(trimmed);
    const markdownHeadingMatch = normalizedLine.match(/^(#{1,6})\s+(.+)$/);
    if (markdownHeadingMatch) {
      flushParagraph();
      closeList();
      ensureTrailingBlankLine();
      output.push(`${markdownHeadingMatch[1]} ${cleanupPolicyHeadingText(markdownHeadingMatch[2])}`);
      output.push('');
      hasSeenContent = true;
      return;
    }

    const listLine = parsePolicyListLine(normalizedLine);
    if (listLine) {
      const headingCandidate = cleanupPolicyHeadingText(normalizedLine);
      const numberedLineLooksLikeHeading = /^\d+[\.)]\s+/.test(normalizedLine)
        && (POLICY_HEADING_PATTERNS.some((patternItem) => patternItem.test(headingCandidate)) || /(privacy policy|terms of service|terms and conditions)/i.test(headingCandidate));

      if (!numberedLineLooksLikeHeading) {
        flushParagraph();
        if (!inList) ensureTrailingBlankLine();
        output.push(`${listLine.type === 'ordered' ? '1.' : '-'} ${listLine.value}`);
        inList = true;
        hasSeenContent = true;
        return;
      }
    }

    const heading = detectPolicyHeading(normalizedLine, !hasSeenContent);
    if (heading) {
      flushParagraph();
      closeList();
      ensureTrailingBlankLine();
      output.push(`${heading.level} ${heading.text}`);
      output.push('');
      hasSeenContent = true;
      return;
    }

    const labelLine = parsePolicyLabelLine(normalizedLine);
    if (labelLine) {
      flushParagraph();
      closeList();
      ensureTrailingBlankLine();
      output.push(`**${labelLine.label}:** ${labelLine.value}`);
      output.push('');
      hasSeenContent = true;
      return;
    }

    closeList();
    paragraphBuffer.push(normalizedLine);
    hasSeenContent = true;
  });

  flushParagraph();
  closeList();

  return collapseBlankLines(output).join('\n');
}

function autoFormatMarkdownContent(markdownInput) {
  const normalized = normalizePolicyMarkdown(markdownInput);
  const cleaned = replacePolicyArtifacts(normalized);

  if (!cleaned.trim()) return '';

  if (shouldUseSmartPolicyFormatting(cleaned)) {
    return formatRawPolicyTextToMarkdown(cleaned);
  }

  const normalizedLines = cleaned
    .split('\n')
    .map((line) => normalizeMarkdownLine(line));
  return collapseBlankLines(normalizedLines).join('\n');
}

function autoFormatRichHtmlContent(htmlInput) {
  let output = sanitizeRichPolicyHtml(replacePolicyArtifacts(htmlInput));

  // Collapse excessive empty paragraph blocks.
  output = output.replace(/(?:<p><br><\/p>\s*){2,}/g, '<p><br></p>');
  output = output.replace(/(?:<p>\s*<\/p>\s*){2,}/g, '<p></p>');
  output = output.trim();

  const plainTextFromHtml = richHtmlToPlainTextBlocks(output);
  const hasStructuredRichTags = /<(h[1-6]|ul|ol|li|blockquote|pre|code)\b/i.test(output);
  if (!hasStructuredRichTags && shouldUseSmartPolicyFormatting(plainTextFromHtml)) {
    const formattedMarkdown = formatRawPolicyTextToMarkdown(plainTextFromHtml);
    const formattedHtml = sanitizeRichPolicyHtml(buildPolicyHtmlFromMarkdown(formattedMarkdown));
    return {
      contentHtml: formattedHtml,
      markdownFallback: formattedMarkdown
    };
  }

  return {
    contentHtml: output,
    markdownFallback: plainTextFromHtml.trim()
  };
}

function autoFormatPolicyContent(content) {
  if (content.contentMode === 'rich') {
    const formattedRichContent = autoFormatRichHtmlContent(content.contentHtml);
    return {
      contentMode: 'rich',
      contentMarkdown: formattedRichContent.markdownFallback,
      contentHtml: formattedRichContent.contentHtml,
      hasContent: hasPolicyContent(formattedRichContent.markdownFallback)
    };
  }

  const formattedMarkdown = autoFormatMarkdownContent(content.contentMarkdown);
  return {
    contentMode: 'markdown',
    contentMarkdown: formattedMarkdown,
    contentHtml: buildPolicyHtmlFromMarkdown(formattedMarkdown),
    hasContent: hasPolicyContent(formattedMarkdown)
  };
}

function getPolicyContentFromRequest(body = {}) {
  const contentInputMode = body.contentInputMode === 'rich' ? 'rich' : 'markdown';
  const markdownInput = normalizePolicyMarkdown(body.contentMarkdown);

  if (contentInputMode === 'rich') {
    const richHtmlInput = typeof body.contentHtmlInput === 'string' ? body.contentHtmlInput : '';
    const contentHtml = sanitizeRichPolicyHtml(richHtmlInput);
    const markdownFallback = richHtmlToPlainTextBlocks(contentHtml);
    return {
      contentMode: 'rich',
      contentMarkdown: markdownFallback,
      contentHtml,
      hasContent: markdownFallback.length > 0
    };
  }

  return {
    contentMode: 'markdown',
    contentMarkdown: markdownInput,
    contentHtml: buildPolicyHtmlFromMarkdown(markdownInput),
    hasContent: hasPolicyContent(markdownInput)
  };
}

function parseVersionParts(versionNumber) {
  const match = String(versionNumber || '').trim().match(/^(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10)
  };
}

function compareVersions(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  return a.minor - b.minor;
}

function isValidVersionNumber(versionNumber) {
  return /^\d+\.\d+$/.test(String(versionNumber || '').trim());
}

function getAdminActor(req) {
  return {
    userId: req.session?.userId || null,
    name: req.session?.userName || req.session?.user?.firstName || 'Admin'
  };
}

async function getNextPolicyVersionNumberForSlug(slug) {
  const policies = await PrivacyPolicy.find({ slug })
    .select('versionNumber')
    .lean();

  if (!policies.length) {
    return '1.0';
  }

  const parsedVersions = policies
    .map((item) => parseVersionParts(item.versionNumber))
    .filter(Boolean)
    .sort(compareVersions);

  if (!parsedVersions.length) {
    return `1.${policies.length}`;
  }

  const latest = parsedVersions[parsedVersions.length - 1];
  return `${latest.major}.${latest.minor + 1}`;
}

async function getNextPolicyVersionNumber() {
  return getNextPolicyVersionNumberForSlug(POLICY_SLUG);
}

function mapPolicyListItem(policy, fallbackTitle = 'Privacy Policy') {
  return {
    id: String(policy._id),
    title: policy.title || fallbackTitle,
    versionNumber: policy.versionNumber || 'N/A',
    status: policy.status || 'draft',
    isCurrent: Boolean(policy.isCurrent),
    effectiveDate: policy.effectiveDate,
    updatedAt: policy.updatedAt,
    publishedAt: policy.publishedAt,
    updatedByName: policy.updatedBy?.name || 'System',
    publishedByName: policy.publishedBy?.name || 'System',
    summaryOfChanges: policy.summaryOfChanges || ''
  };
}

async function getApplicationById(applicationId) {
  return OrganiserApplication.findById(applicationId)
    .populate('userId', 'email firstName lastName role organizerStatus')
    .populate('reviewedBy', 'firstName lastName email role');
}

async function renderApplicationDetails(res, applicationId, options = {}) {
  const application = await getApplicationById(applicationId);
  if (!application) {
    return renderApplicationNotFound(res);
  }

  return res.render('admin/application-details', {
    title: 'Application Details - HelloRun Admin',
    application,
    message: options.message || null,
    rejectionReasonDraft: options.rejectionReasonDraft || '',
    returnTo: normalizeApplicationQueueReturn(options.returnTo)
  });
}



// ─── Shared exports ───────────────────────────────────────────────────────────
module.exports = {
  mongoose, logger, OrganiserApplication, User, passwordService, Blog, BlogComment, BlogReport,
  Event, Registration, Submission, AccumulatedActivitySubmission, PrivacyPolicy, communicationService,
  getCommunicationRetryHealth, listCommunicationRetryAudit, listCommunicationRetries, retryCommunicationNow,
  homepageCarouselSettingService, adSettingService, recordCriticalAuditEventInBackground, reviewSubmission,
  reviewAccumulatedActivitySubmission, getPostgresClient, crypto, listRecentBadgeAuditLogs, publishEvent,
  getPolicyByAdminPath, listBadgeDefinitions, listAdminUserBadges, getAdminBadgeAnalytics, revokeUserBadge,
  updateBadgeDefinitionStatusSvc, updateBadgeDefinitionEmailLevelSvc,
  recalculateBadgeAwards, previewBadgeRecalculation, getRunnerEarnedBadges, evaluateOrganiserAchievementsInBackground,
  buildSubmissionHubPath, listSubmissionHub,
  listSubmissionHubEvents, uploadService, markdownToHtml, sanitizeHtml, DEFAULT_WAIVER_TEMPLATE,
  applyEventFormData, countries, getCreateEventFormData, getCreateEventFormDataFromEvent,
  getPublishReadinessErrors, validateCreateEventForm, getCountries, getCountryName, isValidCountryCode,
  normalizeCountryCode, buildSubmissionReviewSignal,
  VALID_FILTER_STATUSES, REVIEWABLE_STATUSES, MIN_REJECTION_REASON_LENGTH, MAX_REJECTION_REASON_LENGTH,
  MAX_PRIVACY_POLICY_CONTENT_LENGTH, POLICY_SLUG, TERMS_POLICY_SLUG, COOKIE_POLICY_SLUG,
  PRIVACY_POLICY_MANAGE_PATH, TERMS_POLICY_MANAGE_PATH, COOKIE_POLICY_MANAGE_PATH,
  ADMIN_REVIEW_TYPES, ADMIN_REVIEW_SORTS, ADMIN_EVENT_STATUSES, ADMIN_USER_ROLES,
  ADMIN_USER_ORGANIZER_STATUSES, ADMIN_USER_AUTH_PROVIDERS, ADMIN_USER_ACCOUNT_STATUSES,
  ADMIN_USER_SORTS, ADMIN_USERS_PER_PAGE, ADMIN_USER_PER_PAGE_OPTIONS, ADMIN_BADGE_STATUSES,
  ADMIN_BADGE_SCOPES, adminUserProfileCountries, POLICY_HEADING_PATTERNS, POLICY_LABEL_ALLOWLIST,
  POLICY_LABEL_BLOCKLIST, BULK_DELETE_CAP, ADMIN_TIER_OPTIONS, isFullAdminTier,
  escapeRegex, getMessageFromQuery, canPublishFromMessage, buildDetailRedirect, normalizeApplicationQueueReturn, canTransitionStatus,
  getRequestIpAddress, getRequestUserAgent, purgeApplicationDocuments, renderApplicationNotFound,
  renderServerError, buildAdminRedirect, appendAdminPageMessage, buildCommunicationLogHref,
  buildCommunicationRetryHref, buildCommunicationRetryActionHref, buildCommunicationFailureDetailHref,
  getAdminPageMessage, acceptsJson, normalizePositiveInt, verifyAdminDeletionPassword,
  getTestDataCounts, purgeTestData, getTestUserCounts, purgeTestUsers,
  normalizeAdminEventFilters, buildAdminEventQuery, normalizeAdminUserFilters, buildAdminUserQuery,
  getAdminUserSort, buildAdminUserListPath, buildAdminUsersRedirect, formatUserDisplayName,
  getCountMap, maskDateForAdmin, formatAdminShortDate, formatAdminDateTime, formatAdminEnumLabel,
  formatDateForAdminInput, normalizeAdminRunningGroups, getAdminUserEditFormData, validateAdminUserEditForm,
  findAdminManagedUser, renderAdminUserNotFound, renderAdminUserEdit, getAdminUserActivityCounts,
  mapAdminUserListItem, normalizeUserIdsForDeletion, getUserDeleteBlockers, formatEventStatusLabel,
  getAdminEventRedirect, findAdminEventOrNull, getEventCountsById, formatAdminReviewDate,
  normalizeAdminReviewType, normalizeAdminReviewSort, buildReviewQueueParams, buildPolicyHtmlFromMarkdown,
  buildEventDetailsHtml, sanitizeRichPolicyHtml, richHtmlToPlainTextBlocks, normalizePolicyMarkdown,
  hasPolicyContent, replacePolicyArtifacts, collapseBlankLines, normalizeMarkdownLine,
  shouldUseSmartPolicyFormatting, normalizeInlineSpacing, cleanupPolicyHeadingText, looksLikeAllCapsHeading,
  looksLikeTitleCaseHeading, detectPolicyHeading, parsePolicyLabelLine, parsePolicyListLine,
  formatRawPolicyTextToMarkdown, autoFormatMarkdownContent, autoFormatRichHtmlContent, autoFormatPolicyContent,
  getPolicyContentFromRequest, parseVersionParts, compareVersions, isValidVersionNumber, getAdminActor,
  getNextPolicyVersionNumberForSlug, getNextPolicyVersionNumber, mapPolicyListItem,
  getApplicationById, renderApplicationDetails
};
