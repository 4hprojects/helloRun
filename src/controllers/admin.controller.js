const mongoose = require('mongoose');
const OrganiserApplication = require('../models/OrganiserApplication');
const User = require('../models/User');
const passwordService = require('../services/password.service');
const Blog = require('../models/Blog');
const BlogComment = require('../models/BlogComment');
const BlogReport = require('../models/BlogReport');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const PrivacyPolicy = require('../models/PrivacyPolicy');
const communicationService = require('../services/communication.service');
const { recordCriticalAuditEventInBackground } = require('../services/critical-audit.service');
const { listRecentBadgeAuditLogs } = require('../services/badge-audit.service');
const { generateDefaultEventBadgesInBackground } = require('../services/event-badge.service');
const { evaluateOrganiserAchievementsInBackground } = require('../services/achievement.service');
const {
  listBadgeDefinitions,
  listAdminUserBadges,
  getAdminBadgeAnalytics,
  revokeUserBadge,
  updateBadgeDefinitionStatus,
  updateBadgeDefinitionEmailLevel,
  recalculateBadgeAwards
} = require('../services/achievement.service');
const uploadService = require('../services/upload.service');
const { markdownToHtml } = require('../utils/markdown');
const { sanitizeHtml } = require('../utils/sanitize');
const {
  DEFAULT_WAIVER_TEMPLATE,
  applyEventFormData,
  countries,
  getCreateEventFormData,
  getCreateEventFormDataFromEvent,
  getPublishReadinessErrors,
  validateCreateEventForm
} = require('../services/event-form.service');
const {
  getCountries,
  getCountryName,
  isValidCountryCode,
  normalizeCountryCode
} = require('../utils/country');

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
const ADMIN_USER_ORGANIZER_STATUSES = ['not_applied', 'pending', 'approved', 'rejected'];
const ADMIN_USER_AUTH_PROVIDERS = ['local', 'google'];
const ADMIN_USER_SORTS = ['newest', 'oldest', 'updated', 'role'];
const ADMIN_USERS_PER_PAGE = 25;
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

function buildDetailRedirect(applicationId, type, message) {
  const params = new URLSearchParams({
    type,
    msg: message
  });
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
  console.error(fallbackMessage, error);
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

function buildCommunicationLogHref(filters = {}, page = 1) {
  const params = new URLSearchParams();
  ['eventKey', 'channel', 'status', 'recipient'].forEach((key) => {
    if (filters[key]) params.set(key, filters[key]);
  });
  if (Number(page) > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/admin/communications?${query}` : '/admin/communications';
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

function normalizeAdminEventFilters(query = {}) {
  const status = ADMIN_EVENT_STATUSES.includes(String(query.status || '').trim()) ? String(query.status).trim() : '';
  const eventType = ['virtual', 'onsite', 'hybrid'].includes(String(query.eventType || '').trim()) ? String(query.eventType).trim() : '';
  const deleted = String(query.deleted || '').trim() === '1';
  const q = String(query.q || '').trim().slice(0, 100);
  const needsReview = String(query.needsReview || '').trim() === '1';
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  return { status, eventType, deleted, q, needsReview, page };
}

function buildAdminEventQuery(filters) {
  const query = filters.deleted ? { isDeleted: true } : { isDeleted: { $ne: true } };
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

  return {
    role,
    organizerStatus,
    emailVerified,
    authProvider,
    sort,
    q,
    page
  };
}

function buildAdminUserQuery(filters) {
  const query = {};
  if (filters.role) query.role = filters.role;
  if (filters.organizerStatus) query.organizerStatus = filters.organizerStatus;
  if (filters.emailVerified === 'yes') query.emailVerified = true;
  if (filters.emailVerified === 'no') query.emailVerified = false;
  if (filters.authProvider) query.authProvider = filters.authProvider;
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
  ['q', 'role', 'organizerStatus', 'emailVerified', 'authProvider', 'sort'].forEach((key) => {
    if (next[key]) params.set(key, next[key]);
  });
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
    organizerStatus: String(source.organizerStatus || '').trim() || 'not_applied'
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
    title: `Edit ${formatUserDisplayName(user)} - User Management - helloRun Admin`,
    managedUser: {
      id: String(user._id),
      userId: user.userId || 'N/A',
      email: user.email || 'N/A',
      displayName: formatUserDisplayName(user),
      role: user.role || 'runner',
      organizerStatus: user.organizerStatus || 'not_applied'
    },
    formData,
    countries: adminUserProfileCountries,
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
    title: 'Application Details - helloRun Admin',
    application,
    message: options.message || null,
    rejectionReasonDraft: options.rejectionReasonDraft || ''
  });
}

exports.listUsers = async (req, res) => {
  try {
    const filters = normalizeAdminUserFilters(req.query);
    const query = buildAdminUserQuery(filters);
    const total = await User.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / ADMIN_USERS_PER_PAGE));
    const page = Math.min(filters.page, totalPages);

    const users = await User.find(query)
      .select('userId email firstName lastName mobile country dateOfBirth gender emergencyContactName emergencyContactNumber runningGroup runningGroups role organizerStatus emailVerified authProvider googleId createdAt updatedAt')
      .sort(getAdminUserSort(filters.sort))
      .skip((page - 1) * ADMIN_USERS_PER_PAGE)
      .limit(ADMIN_USERS_PER_PAGE)
      .lean();

    const counts = await getAdminUserActivityCounts(users.map((user) => user._id));
    const mappedUsers = users.map((user) => mapAdminUserListItem(user, counts, req.session.userId));

    return res.render('admin/users-list', {
      title: 'User Management - helloRun Admin',
      users: mappedUsers,
      filters: { ...filters, page },
      message: getAdminPageMessage(req.query),
      pagination: {
        page,
        totalPages,
        total,
        perPage: ADMIN_USERS_PER_PAGE,
        prevHref: page > 1 ? buildAdminUserListPath(filters, { page: page - 1 }) : '',
        nextHref: page < totalPages ? buildAdminUserListPath(filters, { page: page + 1 }) : ''
      },
      clearSearchHref: buildAdminUserListPath(filters, { q: '', page: 1 }),
      resetHref: '/admin/users'
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading users.');
  }
};

exports.deleteUsers = async (req, res) => {
  try {
    const adminPassword = String(req.body?.adminPassword || '');
    if (!adminPassword) {
      return res.redirect(buildAdminUsersRedirect('error', 'Password is required to confirm deletion.'));
    }
    const adminUser = await User.findById(req.session.userId).select('passwordHash').lean();
    if (!adminUser || !adminUser.passwordHash) {
      return res.redirect(buildAdminUsersRedirect('error', 'Unable to verify your identity. Deletion cancelled.'));
    }
    const isValidPassword = await passwordService.comparePassword(adminPassword, adminUser.passwordHash);
    if (!isValidPassword) {
      return res.redirect(buildAdminUsersRedirect('error', 'Incorrect password. Deletion cancelled.'));
    }

    const userIds = normalizeUserIdsForDeletion(req);
    if (!userIds.length) {
      return res.redirect(buildAdminUsersRedirect('error', 'Select at least one user to delete.'));
    }
    if (userIds.length > BULK_DELETE_CAP) {
      return res.redirect(buildAdminUsersRedirect(
        'error',
        `You can delete at most ${BULK_DELETE_CAP} users at a time. Narrow your selection and try again.`
      ));
    }

    const users = await User.find({ _id: { $in: userIds } })
      .select('_id email')
      .lean();
    if (!users.length) {
      return res.redirect(buildAdminUsersRedirect('error', 'No matching users were found.'));
    }

    const foundIds = users.map((user) => String(user._id));
    const blockers = await getUserDeleteBlockers(foundIds, req.session.userId);
    const deletableIds = foundIds.filter((id) => !blockers.has(id));

    if (!deletableIds.length) {
      return res.redirect(buildAdminUsersRedirect(
        'error',
        'No users were deleted. You cannot delete your own admin account.'
      ));
    }

    const result = await User.deleteMany({ _id: { $in: deletableIds } });
    const deletedCount = Number(result.deletedCount || 0);
    const blockedCount = foundIds.length - deletedCount;
    const message = blockedCount > 0
      ? `${deletedCount} user(s) deleted. ${blockedCount} user(s) skipped because you cannot delete your own admin account.`
      : `${deletedCount} user(s) deleted.`;

    return res.redirect(buildAdminUsersRedirect('success', message));
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while deleting users.');
  }
};

exports.renderEditUser = async (req, res) => {
  try {
    const user = await findAdminManagedUser(req.params.id);
    if (!user) return renderAdminUserNotFound(res);

    return renderAdminUserEdit(res, user, getAdminUserEditFormData(user));
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the user edit form.');
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await findAdminManagedUser(req.params.id);
    if (!user) return renderAdminUserNotFound(res);

    const formData = getAdminUserEditFormData(req.body);
    if (String(user._id) === String(req.session.userId || '') && formData.role !== 'admin') {
      formData.role = 'admin';
      return renderAdminUserEdit(res, user, formData, {
        status: 400,
        errors: { role: 'You cannot remove the admin role from your own account.' },
        message: { type: 'error', text: 'Your own admin role cannot be changed here.' }
      });
    }

    const errors = validateAdminUserEditForm(formData);
    if (Object.keys(errors).length) {
      return renderAdminUserEdit(res, user, formData, {
        status: 400,
        errors,
        message: { type: 'error', text: 'Review the highlighted fields and try again.' }
      });
    }

    user.firstName = formData.firstName;
    user.lastName = formData.lastName;
    user.mobile = formData.mobile;
    user.country = formData.country;
    user.dateOfBirth = formData.dateOfBirth ? new Date(`${formData.dateOfBirth}T00:00:00.000Z`) : null;
    user.gender = formData.gender;
    user.emergencyContactName = formData.emergencyContactName;
    user.emergencyContactNumber = formData.emergencyContactNumber;
    user.runningGroups = formData.runningGroups;
    user.runningGroup = formData.runningGroups[0] || '';
    user.role = formData.role;
    user.organizerStatus = formData.organizerStatus;

    await user.save();

    return res.redirect(buildAdminRedirect(`/admin/users/${user._id}`, 'success', 'User information updated.'));
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while updating the user.');
  }
};

exports.viewUser = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return renderAdminUserNotFound(res);
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return renderAdminUserNotFound(res);
    }

    const objectId = user._id;
    const [
      registrationCount,
      submissionCount,
      approvedSubmissionCount,
      certificateCount,
      ownedEventCount,
      blogCount,
      commentCount,
      application,
      recentRegistrations,
      recentSubmissions,
      ownedEvents
    ] = await Promise.all([
      Registration.countDocuments({ userId: objectId }),
      Submission.countDocuments({ runnerId: objectId }),
      Submission.countDocuments({ runnerId: objectId, status: 'approved' }),
      Submission.countDocuments({ runnerId: objectId, 'certificate.issuedAt': { $ne: null } }),
      Event.countDocuments({ organizerId: objectId, isDeleted: { $ne: true } }),
      Blog.countDocuments({ authorId: objectId, isDeleted: { $ne: true } }),
      BlogComment.countDocuments({ authorId: objectId, isDeleted: { $ne: true } }),
      OrganiserApplication.findOne({ userId: objectId })
        .populate('reviewedBy', 'firstName lastName email')
        .lean(),
      Registration.find({ userId: objectId })
        .populate('eventId', 'title slug status eventStartAt')
        .sort({ registeredAt: -1, createdAt: -1 })
        .limit(5)
        .lean(),
      Submission.find({ runnerId: objectId })
        .populate('eventId', 'title slug status')
        .sort({ submittedAt: -1, createdAt: -1 })
        .limit(5)
        .lean(),
      Event.find({ organizerId: objectId, isDeleted: { $ne: true } })
        .select('title slug status eventStartAt updatedAt')
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    const hasLocalPassword = Boolean(user.passwordHash);
    delete user.passwordHash;

    return res.render('admin/user-detail', {
      title: `${formatUserDisplayName(user)} - User Management - helloRun Admin`,
      managedUser: {
        ...user,
        id: String(user._id),
        displayName: formatUserDisplayName(user),
        hasLocalPassword,
        hasGoogleLink: Boolean(user.googleId),
        maskedDateOfBirth: maskDateForAdmin(user.dateOfBirth)
      },
      counts: {
        registrations: registrationCount,
        submissions: submissionCount,
        approvedSubmissions: approvedSubmissionCount,
        certificates: certificateCount,
        ownedEvents: ownedEventCount,
        blogs: blogCount,
        comments: commentCount
      },
      application,
      recentRegistrations,
      recentSubmissions,
      ownedEvents,
      message: getAdminPageMessage(req.query)
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the user details.');
  }
};

exports.listApplications = async (req, res) => {
  try {
    const status = VALID_FILTER_STATUSES.includes(req.query.status) ? req.query.status : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const query = {};
    if (status) {
      query.status = status;
    }

    if (q) {
      const safeRegex = new RegExp(escapeRegex(q), 'i');
      query.$or = [
        { businessName: safeRegex },
        { applicationId: safeRegex }
      ];
    }

    let applications = await OrganiserApplication.find(query)
      .populate('userId', 'email firstName lastName')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ submittedAt: -1 });

    if (q) {
      const qLower = q.toLowerCase();
      applications = applications.filter((app) => {
        const firstName = app.userId?.firstName?.toLowerCase() || '';
        const lastName = app.userId?.lastName?.toLowerCase() || '';
        const email = app.userId?.email?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`.trim();
        return (
          fullName.includes(qLower) ||
          email.includes(qLower) ||
          app.businessName?.toLowerCase().includes(qLower) ||
          app.applicationId?.toLowerCase().includes(qLower)
        );
      });
    }

    return res.render('admin/applications-list', {
      title: 'Organizer Applications - helloRun Admin',
      applications,
      filters: { status, q }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading organizer applications.');
  }
};

exports.viewApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return renderApplicationNotFound(res);
    }

    return renderApplicationDetails(res, applicationId, {
      message: getMessageFromQuery(req)
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the application details.');
  }
};

exports.approveApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return renderApplicationNotFound(res);
    }

    const application = await getApplicationById(applicationId);
    if (!application) {
      return renderApplicationNotFound(res);
    }

    if (!canTransitionStatus(application.status, 'approved')) {
      return res.status(400).render('admin/application-details', {
        title: 'Application Details - helloRun Admin',
        application,
        rejectionReasonDraft: '',
        message: {
          type: 'error',
          text: `Cannot approve application from "${application.status}" status.`
        }
      });
    }

    const previousStatus = application.status;
    application.status = 'approved';
    application.rejectionReason = '';
    application.reviewedBy = req.session.userId;
    application.reviewedAt = new Date();
    await purgeApplicationDocuments(application);
    await application.save();

    const userId = application.userId?._id || application.userId;
    await User.findByIdAndUpdate(userId, {
      role: 'organiser',
      organizerStatus: 'approved',
      organizerApplicationId: application._id
    });
    evaluateOrganiserAchievementsInBackground(userId, {
      performedBy: req.session.userId
    });

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'organiser.application.approved',
      targetType: 'organiser_application',
      targetId: String(application._id),
      statusFrom: previousStatus,
      statusTo: 'approved',
      notes: `Application ${application.applicationId || application._id} approved.`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: application.reviewedAt
    });

    if (application.userId?.email) {
      try {
        await communicationService.notify('organiser.application_approved', {
          email: {
            to: application.userId.email,
            firstName: application.userId.firstName || 'Organizer',
            recipientUserId: application.userId._id,
            metadata: { applicationId: application.applicationId }
          }
        });
      } catch (emailError) {
        console.error(
          `[Admin Review] Failed to send approval email for application ${application.applicationId}`,
          emailError
        );
      }
    }

    return res.redirect(
      buildDetailRedirect(application._id.toString(), 'success', 'Application approved successfully.')
    );
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while approving the application.');
  }
};

exports.rejectApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return renderApplicationNotFound(res);
    }

    const application = await getApplicationById(applicationId);
    if (!application) {
      return renderApplicationNotFound(res);
    }

    if (!canTransitionStatus(application.status, 'rejected')) {
      return res.status(400).render('admin/application-details', {
        title: 'Application Details - helloRun Admin',
        application,
        rejectionReasonDraft: '',
        message: {
          type: 'error',
          text: `Cannot reject application from "${application.status}" status.`
        }
      });
    }

    const rejectionReason = typeof req.body.rejectionReason === 'string'
      ? req.body.rejectionReason.trim()
      : '';

    if (
      rejectionReason.length < MIN_REJECTION_REASON_LENGTH ||
      rejectionReason.length > MAX_REJECTION_REASON_LENGTH
    ) {
      return res.status(400).render('admin/application-details', {
        title: 'Application Details - helloRun Admin',
        application,
        rejectionReasonDraft: rejectionReason,
        message: {
          type: 'error',
          text: `Rejection reason must be ${MIN_REJECTION_REASON_LENGTH}-${MAX_REJECTION_REASON_LENGTH} characters.`
        }
      });
    }

    const previousStatus = application.status;
    application.status = 'rejected';
    application.rejectionReason = rejectionReason;
    application.reviewedBy = req.session.userId;
    application.reviewedAt = new Date();
    await purgeApplicationDocuments(application);
    await application.save();

    const userId = application.userId?._id || application.userId;
    await User.findByIdAndUpdate(userId, {
      organizerStatus: 'rejected'
    });

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'organiser.application.rejected',
      targetType: 'organiser_application',
      targetId: String(application._id),
      statusFrom: previousStatus,
      statusTo: 'rejected',
      notes: rejectionReason,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: application.reviewedAt
    });

    if (application.userId?.email) {
      try {
        await communicationService.notify('organiser.application_rejected', {
          email: {
            to: application.userId.email,
            firstName: application.userId.firstName || 'Organizer',
            rejectionReason,
            recipientUserId: application.userId._id,
            metadata: { applicationId: application.applicationId }
          }
        });
      } catch (emailError) {
        console.error(
          `[Admin Review] Failed to send rejection email for application ${application.applicationId}`,
          emailError
        );
      }
    }

    return res.redirect(
      buildDetailRedirect(application._id.toString(), 'success', 'Application rejected successfully.')
    );
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while rejecting the application.');
  }
};

exports.listEvents = async (req, res) => {
  try {
    const filters = normalizeAdminEventFilters(req.query);
    const limit = 20;
    const skip = (filters.page - 1) * limit;
    const query = buildAdminEventQuery(filters);
    if (filters.q) {
      const safePattern = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const organizerMatches = await User.find({
        $or: [
          { email: safePattern },
          { firstName: safePattern },
          { lastName: safePattern }
        ]
      }).select('_id').limit(50).lean();
      if (organizerMatches.length) {
        query.$or = query.$or || [];
        query.$or.push({ organizerId: { $in: organizerMatches.map((item) => item._id) } });
      }
    }
    const sort = filters.status || filters.deleted
      ? { updatedAt: -1, createdAt: -1 }
      : { status: 1, submittedForReviewAt: 1, updatedAt: -1 };

    const [totalEvents, events, statusCounts] = await Promise.all([
      Event.countDocuments(query),
      Event.find(query)
        .populate('organizerId', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const eventIds = events.map((event) => event._id);
    const counts = await getEventCountsById(eventIds);
    const statusCountMap = new Map(statusCounts.map((item) => [String(item._id), Number(item.count || 0)]));
    const eventRows = events.map((event) => {
      const itemCounts = counts.get(String(event._id)) || { registrations: 0, submissions: 0 };
      return {
        ...event,
        statusLabel: formatEventStatusLabel(event.status),
        organizerName: [event.organizerId?.firstName, event.organizerId?.lastName].filter(Boolean).join(' ').trim() || event.organiserName || 'N/A',
        organizerEmail: event.organizerId?.email || 'N/A',
        registrationsCount: itemCounts.registrations,
        submissionsCount: itemCounts.submissions
      };
    });

    return res.render('admin/events-list', {
      title: 'Event Management - helloRun Admin',
      message: getAdminPageMessage(req.query),
      filters,
      events: eventRows,
      pagination: {
        page: filters.page,
        totalPages: Math.max(1, Math.ceil(totalEvents / limit)),
        totalEvents
      },
      statusCounts: {
        pendingReview: statusCountMap.get('pending_review') || 0,
        draft: statusCountMap.get('draft') || 0,
        published: statusCountMap.get('published') || 0,
        archived: statusCountMap.get('archived') || 0
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading admin events.');
  }
};

exports.viewEvent = async (req, res) => {
  try {
    const event = await findAdminEventOrNull(req.params.id, true);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'The requested event does not exist.'
      });
    }
    const counts = await getEventCountsById([event._id]);
    const itemCounts = counts.get(String(event._id)) || { registrations: 0, submissions: 0 };
    const readinessErrors = event.status === 'pending_review' ? getPublishReadinessErrors(event) : [];
    return res.render('admin/event-detail', {
      title: `Event Management - ${event.title}`,
      event,
      counts: itemCounts,
      readinessErrors,
      statusLabel: formatEventStatusLabel(event.status),
      eventDetailsHtml: buildEventDetailsHtml(event.eventDetailsMarkdown || ''),
      message: getAdminPageMessage(req.query)
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the admin event detail.');
  }
};

exports.renderEditEvent = async (req, res) => {
  try {
    const event = await findAdminEventOrNull(req.params.id, true);
    if (!event || event.isDeleted) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'The requested event does not exist or has been deleted.'
      });
    }
    return res.render('organizer/edit-event', {
      title: `Admin Edit Event - ${event.title}`,
      pageHeading: 'Admin Edit Event',
      pageDescription: 'Update event details, media, schedule, rules, and waiver as an admin.',
      user: event.organizerId || null,
      event,
      errors: {},
      formData: getCreateEventFormDataFromEvent(event),
      countries,
      defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
      message: getAdminPageMessage(req.query),
      formAction: `/admin/events/${event._id}/edit`,
      backHref: `/admin/events/${event._id}`,
      mediaRemovePath: `/admin/events/${event._id}/media/remove`
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the admin event editor.');
  }
};

exports.updateEvent = async (req, res) => {
  const uploadedKeys = [];
  try {
    const event = await findAdminEventOrNull(req.params.id, true);
    if (!event || event.isDeleted) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'The requested event does not exist or has been deleted.'
      });
    }
    const actor = await User.findById(req.session.userId);
    const formData = getCreateEventFormData(req.body);
    const incomingPaymentQrFile = req.files?.paymentQrImageFile?.[0] || null;
    if (incomingPaymentQrFile && formData.feeMode === 'paid' && !formData.paymentQrImageUrl) {
      formData.paymentQrImageUrl = 'https://pending-upload.local/payment-qr.png';
    }
    if (formData.removePaymentQrImage && !incomingPaymentQrFile) {
      formData.paymentQrImageUrl = '';
      formData.paymentQrImageKey = '';
    }
    formData.actionType = event.status === 'published' || event.status === 'pending_review' ? 'publish' : 'draft';

    if (req.uploadError) {
      return res.status(400).render('organizer/edit-event', {
        title: `Admin Edit Event - ${event.title}`,
        pageHeading: 'Admin Edit Event',
        pageDescription: 'Update event details, media, schedule, rules, and waiver as an admin.',
        user: event.organizerId || null,
        event,
        errors: { bannerImageUrl: req.uploadError },
        formData,
        countries,
        defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
        message: null,
        formAction: `/admin/events/${event._id}/edit`,
        backHref: `/admin/events/${event._id}`,
        mediaRemovePath: `/admin/events/${event._id}/media/remove`
      });
    }

    const validationErrors = validateCreateEventForm(formData);
    if (Object.keys(validationErrors).length) {
      return res.status(400).render('organizer/edit-event', {
        title: `Admin Edit Event - ${event.title}`,
        pageHeading: 'Admin Edit Event',
        pageDescription: 'Update event details, media, schedule, rules, and waiver as an admin.',
        user: event.organizerId || null,
        event,
        errors: validationErrors,
        formData,
        countries,
        defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
        message: null,
        formAction: `/admin/events/${event._id}/edit`,
        backHref: `/admin/events/${event._id}`,
        mediaRemovePath: `/admin/events/${event._id}/media/remove`
      });
    }

    const bannerImageFile = req.files?.bannerImageFile?.[0] || null;
    const logoFile = req.files?.logoFile?.[0] || null;
    const posterImageFile = req.files?.posterImageFile?.[0] || null;
    const paymentQrImageFile = incomingPaymentQrFile;
    const galleryImageFiles = req.files?.galleryImageFiles || [];
    if (bannerImageFile || logoFile || posterImageFile || paymentQrImageFile || galleryImageFiles.length) {
      const uploadedBranding = await uploadService.uploadEventBrandingToR2({
        userId: actor?._id || event.organizerId?._id || event.organizerId,
        slug: event.slug,
        bannerImageFile: bannerImageFile || undefined,
        logoFile: logoFile || undefined,
        posterImageFile: posterImageFile || undefined,
        paymentQrImageFile: paymentQrImageFile || undefined,
        galleryImageFiles: galleryImageFiles.length ? galleryImageFiles : undefined
      });
      if (uploadedBranding.banner) {
        uploadedKeys.push(uploadedBranding.banner.key);
        formData.bannerImageUrl = uploadedBranding.banner.url;
      }
      if (uploadedBranding.logo) {
        uploadedKeys.push(uploadedBranding.logo.key);
        formData.logoUrl = uploadedBranding.logo.url;
      }
      if (uploadedBranding.poster) {
        uploadedKeys.push(uploadedBranding.poster.key);
        formData.posterImageUrl = uploadedBranding.poster.url;
      }
      if (uploadedBranding.paymentQr) {
        uploadedKeys.push(uploadedBranding.paymentQr.key);
        formData.paymentQrImageUrl = uploadedBranding.paymentQr.url;
        formData.paymentQrImageKey = uploadedBranding.paymentQr.key;
      }
      if (Array.isArray(uploadedBranding.gallery) && uploadedBranding.gallery.length) {
        uploadedKeys.push(...uploadedBranding.gallery.map((item) => item.key));
        formData.galleryImageUrls = Array.from(new Set([...(formData.galleryImageUrls || []), ...uploadedBranding.gallery.map((item) => item.url)]));
      }
    }

    applyEventFormData(event, formData, actor || event.organizerId);
    event.adminNotes = String(req.body.adminNotes || event.adminNotes || '').trim().slice(0, 1000);
    await event.save();
    return res.redirect(getAdminEventRedirect(event._id, 'success', 'Event updated.'));
  } catch (error) {
    if (uploadedKeys.length) await uploadService.deleteObjects(uploadedKeys);
    return renderServerError(res, error, 'An error occurred while updating the admin event.');
  }
};

exports.approveEvent = async (req, res) => {
  try {
    const event = await findAdminEventOrNull(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    if (event.status !== 'pending_review') {
      return res.status(409).json({ success: false, message: 'Only pending review events can be approved.' });
    }
    const readinessErrors = getPublishReadinessErrors(event);
    if (readinessErrors.length) {
      return res.status(400).json({ success: false, message: readinessErrors[0], errors: readinessErrors });
    }
    const previousStatus = event.status;
    event.status = 'published';
    event.approvedAt = new Date();
    event.approvedBy = req.session.userId;
    await event.save();
    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'event.published',
      targetType: 'event',
      targetId: String(event._id),
      statusFrom: previousStatus,
      statusTo: 'published',
      notes: `Event ${event.referenceCode || event.slug || event._id} approved and published.`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: event.approvedAt
    });
    generateDefaultEventBadgesInBackground(event, {
      performedBy: req.session.userId
    });
    evaluateOrganiserAchievementsInBackground(event.organizerId, {
      performedBy: req.session.userId
    });
    return res.json({ success: true, message: 'Event approved and published.' });
  } catch (error) {
    console.error('approveEvent error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve event.' });
  }
};

exports.archiveEvent = async (req, res) => {
  try {
    const event = await findAdminEventOrNull(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    const reason = String(req.body.reason || req.body.archiveReason || '').trim();
    if (reason.length < 8) return res.status(400).json({ success: false, message: 'Archive reason must be at least 8 characters.' });
    if (event.status === 'archived') return res.status(409).json({ success: false, message: 'Event is already archived.' });
    const previousStatus = event.status;
    event.status = 'archived';
    event.archivedAt = new Date();
    event.archivedBy = req.session.userId;
    event.archiveReason = reason.slice(0, 500);
    await event.save();
    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'event.archived',
      targetType: 'event',
      targetId: String(event._id),
      statusFrom: previousStatus,
      statusTo: 'archived',
      notes: event.archiveReason,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: event.archivedAt
    });
    return res.json({ success: true, message: 'Event archived.' });
  } catch (error) {
    console.error('archiveEvent error:', error);
    return res.status(500).json({ success: false, message: 'Failed to archive event.' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await findAdminEventOrNull(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    const reason = String(req.body.reason || req.body.deleteReason || '').trim();
    if (reason.length < 8) return res.status(400).json({ success: false, message: 'Delete reason must be at least 8 characters.' });
    const previousStatus = event.isDeleted ? 'deleted' : event.status;
    event.isDeleted = true;
    event.deletedAt = new Date();
    event.deletedBy = req.session.userId;
    event.deleteReason = reason.slice(0, 500);
    await event.save();
    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'event.deleted',
      targetType: 'event',
      targetId: String(event._id),
      statusFrom: previousStatus,
      statusTo: 'deleted',
      notes: event.deleteReason,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: event.deletedAt
    });
    return res.json({ success: true, message: 'Event soft-deleted.' });
  } catch (error) {
    console.error('deleteEvent error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete event.' });
  }
};

exports.removeEventMedia = async (req, res) => {
  try {
    const event = await findAdminEventOrNull(req.params.id, true);
    if (!event || event.isDeleted) return res.status(404).json({ success: false, message: 'Event not found.' });
    const kind = String(req.body.kind || '').trim();
    const keysToDelete = [];
    if (kind === 'logo' && event.logoUrl) {
      const key = uploadService.extractObjectKeyFromPublicUrl(event.logoUrl);
      if (key) keysToDelete.push(key);
      event.logoUrl = '';
    } else if (kind === 'banner' && event.bannerImageUrl) {
      const key = uploadService.extractObjectKeyFromPublicUrl(event.bannerImageUrl);
      if (key) keysToDelete.push(key);
      event.bannerImageUrl = '';
    } else if (kind === 'poster' && event.posterImageUrl) {
      const key = uploadService.extractObjectKeyFromPublicUrl(event.posterImageUrl);
      if (key) keysToDelete.push(key);
      event.posterImageUrl = '';
    } else if (kind === 'gallery') {
      const url = String(req.body.url || '').trim();
      const current = Array.isArray(event.galleryImageUrls) ? event.galleryImageUrls : [];
      const targets = req.body.all === '1' ? current : current.filter((item) => item === url);
      for (const item of targets) {
        const key = uploadService.extractObjectKeyFromPublicUrl(item);
        if (key) keysToDelete.push(key);
      }
      event.galleryImageUrls = req.body.all === '1' ? [] : current.filter((item) => item !== url);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid media kind.' });
    }
    await event.save();
    if (keysToDelete.length) await uploadService.deleteObjects(keysToDelete);
    return res.json({ success: true });
  } catch (error) {
    console.error('removeEventMedia error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove media.' });
  }
};

exports.dashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      totalBlogs,
      pendingBlogs,
      publishedBlogs,
      rejectedBlogs,
      archivedBlogs,
      openBlogReports,
      totalBlogComments,
      removedBlogComments,
      totalEvents,
      draftEvents,
      pendingEventReviews,
      publishedEvents,
      totalRegistrations,
      pendingPaymentReviews,
      totalSubmissions,
      approvedSubmissions,
      pendingResultReviews,
      pendingApplicationQueue,
      draftEventQueue,
      pendingResultEvent
    ] =
      await Promise.all([
        User.countDocuments(),
        OrganiserApplication.countDocuments(),
        OrganiserApplication.countDocuments({ status: 'pending' }),
        OrganiserApplication.countDocuments({ status: 'approved' }),
        OrganiserApplication.countDocuments({ status: 'rejected' }),
        Blog.countDocuments({ isDeleted: { $ne: true } }),
        Blog.countDocuments({ isDeleted: { $ne: true }, status: 'pending' }),
        Blog.countDocuments({ isDeleted: { $ne: true }, status: 'published' }),
        Blog.countDocuments({ isDeleted: { $ne: true }, status: 'rejected' }),
        Blog.countDocuments({ isDeleted: { $ne: true }, status: 'archived' }),
        BlogReport.countDocuments({ status: 'open' }),
        BlogComment.countDocuments({ isDeleted: { $ne: true } }),
        BlogComment.countDocuments({ status: 'removed' }),
        Event.countDocuments({ isDeleted: { $ne: true } }),
        Event.countDocuments({ status: 'draft', isDeleted: { $ne: true } }),
        Event.countDocuments({ status: 'pending_review', isDeleted: { $ne: true } }),
        Event.countDocuments({ status: 'published', isDeleted: { $ne: true } }),
        Registration.countDocuments(),
        Registration.countDocuments({ paymentStatus: 'proof_submitted' }),
        Submission.countDocuments(),
        Submission.countDocuments({ status: 'approved' }),
        Submission.countDocuments({ status: 'submitted' }),
        OrganiserApplication.find({ status: { $in: ['pending', 'under_review'] } })
          .populate('userId', 'firstName lastName email')
          .sort({ submittedAt: 1 })
          .limit(8)
          .lean(),
        Event.find({ status: { $in: ['draft', 'pending_review'] }, isDeleted: { $ne: true } })
          .populate('organizerId', 'firstName lastName email')
          .sort({ updatedAt: -1, createdAt: -1 })
          .limit(8)
          .select('title status updatedAt createdAt eventStartAt organizerId')
          .lean(),
        Submission.findOne({ status: 'submitted' })
          .sort({ submittedAt: -1, createdAt: -1 })
          .select('eventId')
          .lean()
      ]);

    const pendingApplicationsList = pendingApplicationQueue.map((application) => ({
      id: String(application._id),
      applicationId: application.applicationId || 'N/A',
      businessName: application.businessName || 'N/A',
      status: application.status || 'pending',
      submittedAt: application.submittedAt || application.createdAt || null,
      applicantName: [application.userId?.firstName, application.userId?.lastName].filter(Boolean).join(' ').trim() || 'N/A',
      applicantEmail: application.userId?.email || 'N/A'
    }));
    const pendingResultReviewHref = pendingResultEvent?.eventId
      ? `/organizer/events/${String(pendingResultEvent.eventId)}/registrants?result=submitted`
      : '';
    const draftEventsList = draftEventQueue.map((event) => ({
      id: String(event._id),
      title: event.title || 'Untitled event',
      status: event.status || 'draft',
      updatedAt: event.updatedAt || event.createdAt || null,
      eventStartAt: event.eventStartAt || null,
      organizerName: [event.organizerId?.firstName, event.organizerId?.lastName].filter(Boolean).join(' ').trim() || 'N/A',
      organizerEmail: event.organizerId?.email || 'N/A',
      actionLabel: event.status === 'pending_review' ? 'Review' : 'Open',
      actionHref: `/admin/events/${event._id}`
    }));

    return res.render('admin/dashboard', {
      title: 'Admin Dashboard - helloRun',
      stats: {
        totalUsers,
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalBlogs,
        pendingBlogs,
        publishedBlogs,
        rejectedBlogs,
        archivedBlogs,
        openBlogReports,
        totalBlogComments,
        removedBlogComments,
        totalEvents,
        draftEvents,
        pendingEventReviews,
        publishedEvents,
        totalRegistrations,
        pendingPaymentReviews,
        pendingPaymentReviewHref: pendingPaymentReviews > 0 ? '/admin/reviews?type=payments' : '',
        totalSubmissions,
        approvedSubmissions,
        pendingResultReviews,
        pendingResultReviewHref: pendingResultReviews > 0 ? '/admin/reviews?type=results' : pendingResultReviewHref
      },
      pendingApplicationsList,
      draftEventsList
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the admin dashboard.');
  }
};

exports.listBadges = async (req, res) => {
  try {
    const wantsJson = acceptsJson(req);
    const statusFilter = ADMIN_BADGE_STATUSES.includes(String(req.query.status || '').trim())
      ? String(req.query.status).trim()
      : 'verified';
    const scopeFilter = ADMIN_BADGE_SCOPES.includes(String(req.query.scope || '').trim())
      ? String(req.query.scope).trim()
      : 'all';
    const badgeScope = scopeFilter === 'all' ? '' : scopeFilter;
    const [badges, userBadges, auditLogs, analytics] = await Promise.all([
      listBadgeDefinitions({ limit: 200, badgeScope }),
      listAdminUserBadges({
        limit: normalizePositiveInt(req.query.limit, 50),
        status: statusFilter,
        badgeScope
      }),
      listRecentBadgeAuditLogs({ limit: 30, badgeScope }),
      getAdminBadgeAnalytics({ badgeScope })
    ]);
    if (!wantsJson) {
      return res.render('admin/badges', {
        title: 'Badge Management - helloRun Admin',
        badges,
        userBadges,
        auditLogs,
        analytics,
        filters: {
          status: statusFilter,
          scope: scopeFilter
        },
        badgeStatuses: ADMIN_BADGE_STATUSES,
        badgeScopes: ADMIN_BADGE_SCOPES,
        message: getAdminPageMessage(req.query),
        formatDateTime: formatAdminDateTime
      });
    }
    return res.json({ success: true, badges, userBadges, auditLogs, analytics, filters: { status: statusFilter, scope: scopeFilter } });
  } catch (error) {
    console.error('listBadges error:', error);
    if (!acceptsJson(req)) {
      return renderServerError(res, error, 'An error occurred while loading badge management.');
    }
    return res.status(500).json({ success: false, message: 'Failed to load badges.' });
  }
};

exports.revokeBadge = async (req, res) => {
  try {
    const wantsJson = acceptsJson(req);
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 5) {
      if (!wantsJson) {
        return res.redirect(buildAdminRedirect('/admin/badges', 'error', 'Revocation reason is required.'));
      }
      return res.status(400).json({ success: false, message: 'Revocation reason is required.' });
    }

    const revoked = await revokeUserBadge(req.params.userBadgeId, {
      performedBy: req.session.userId,
      reason
    });
    if (!revoked) {
      if (!wantsJson) {
        return res.redirect(buildAdminRedirect('/admin/badges', 'error', 'Badge award not found.'));
      }
      return res.status(404).json({ success: false, message: 'Badge award not found.' });
    }

    if (!wantsJson) {
      return res.redirect(buildAdminRedirect('/admin/badges', 'success', 'Badge award revoked.'));
    }
    return res.json({ success: true, badge: revoked });
  } catch (error) {
    console.error('revokeBadge error:', error);
    if (!acceptsJson(req)) {
      return res.redirect(buildAdminRedirect('/admin/badges', 'error', 'Failed to revoke badge.'));
    }
    return res.status(500).json({ success: false, message: 'Failed to revoke badge.' });
  }
};

exports.updateBadgeDefinitionStatus = async (req, res) => {
  try {
    const wantsJson = acceptsJson(req);
    const action = String(req.body.action || '').trim();
    const isActive = action === 'enable';
    if (!['enable', 'disable'].includes(action)) {
      if (!wantsJson) {
        return res.redirect(buildAdminRedirect('/admin/badges', 'error', 'Invalid badge definition action.'));
      }
      return res.status(400).json({ success: false, message: 'Invalid badge definition action.' });
    }

    const reason = String(req.body.reason || '').trim();
    if (!isActive && reason.length < 10) {
      if (!wantsJson) {
        return res.redirect(buildAdminRedirect('/admin/badges', 'error', 'A disable reason of at least 10 characters is required.'));
      }
      return res.status(400).json({ success: false, message: 'A disable reason of at least 10 characters is required.' });
    }

    const updated = await updateBadgeDefinitionStatus(req.params.badgeDefinitionId, {
      performedBy: req.session.userId,
      isActive,
      reason: reason || (isActive ? 'Admin enabled badge definition' : '')
    });
    if (!updated) {
      if (!wantsJson) {
        return res.redirect(buildAdminRedirect('/admin/badges', 'error', 'Badge definition not found or already in that state.'));
      }
      return res.status(404).json({ success: false, message: 'Badge definition not found or already in that state.' });
    }

    const params = new URLSearchParams({
      type: 'success',
      msg: isActive ? 'Badge definition enabled.' : 'Badge definition disabled.'
    });
    const scope = String(req.body.scope || '').trim();
    const status = String(req.body.status || '').trim();
    if (scope) params.set('scope', scope);
    if (status) params.set('status', status);

    if (!wantsJson) {
      return res.redirect(`/admin/badges?${params.toString()}`);
    }
    return res.json({ success: true, badgeDefinition: updated });
  } catch (error) {
    console.error('updateBadgeDefinitionStatus error:', error);
    if (!acceptsJson(req)) {
      return res.redirect(buildAdminRedirect('/admin/badges', 'error', 'Failed to update badge definition.'));
    }
    return res.status(500).json({ success: false, message: 'Failed to update badge definition.' });
  }
};

exports.updateBadgeDefinitionEmailLevel = async (req, res) => {
  try {
    const wantsJson = acceptsJson(req);
    const emailNotificationLevel = String(req.body.emailNotificationLevel || '').trim();
    const reason = String(req.body.reason || '').trim();

    const updated = await updateBadgeDefinitionEmailLevel(req.params.badgeDefinitionId, {
      performedBy: req.session.userId,
      emailNotificationLevel,
      reason: reason || `Admin set badge email level to ${emailNotificationLevel}`
    });
    if (!updated) {
      if (!wantsJson) {
        return res.redirect(buildAdminRedirect('/admin/badges', 'error', 'Badge email notification level was unchanged or invalid.'));
      }
      return res.status(400).json({ success: false, message: 'Badge email notification level was unchanged or invalid.' });
    }

    const params = new URLSearchParams({
      type: 'success',
      msg: 'Badge email notification level updated.'
    });
    const scope = String(req.body.scope || '').trim();
    const status = String(req.body.status || '').trim();
    if (scope) params.set('scope', scope);
    if (status) params.set('status', status);

    if (!wantsJson) {
      return res.redirect(`/admin/badges?${params.toString()}`);
    }
    return res.json({ success: true, badgeDefinition: updated });
  } catch (error) {
    console.error('updateBadgeDefinitionEmailLevel error:', error);
    if (!acceptsJson(req)) {
      return res.redirect(buildAdminRedirect('/admin/badges', 'error', 'Failed to update badge email notification level.'));
    }
    return res.status(500).json({ success: false, message: 'Failed to update badge email notification level.' });
  }
};

exports.recalculateBadges = async (req, res) => {
  try {
    const wantsJson = acceptsJson(req);
    const scope = String(req.body.scope || 'all').trim();
    const limit = normalizePositiveInt(req.body.limit, 50);
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 10) {
      if (!wantsJson) {
        return res.redirect(buildAdminRedirect('/admin/badges', 'error', 'A recalculation reason of at least 10 characters is required.'));
      }
      return res.status(400).json({ success: false, message: 'A recalculation reason of at least 10 characters is required.' });
    }

    const result = await recalculateBadgeAwards({
      scope,
      limit,
      reason,
      performedBy: req.session.userId
    });
    const message = `Badge recalculation finished. ${result.awardsCreated} new award${result.awardsCreated === 1 ? '' : 's'} created.`;
    if (!wantsJson) {
      return res.redirect(buildAdminRedirect('/admin/badges', result.errors.length ? 'error' : 'success', message));
    }
    return res.json({ success: true, result });
  } catch (error) {
    console.error('recalculateBadges error:', error);
    if (!acceptsJson(req)) {
      return res.redirect(buildAdminRedirect('/admin/badges', 'error', 'Failed to recalculate badge awards.'));
    }
    return res.status(500).json({ success: false, message: 'Failed to recalculate badge awards.' });
  }
};

exports.renderCommunications = async (req, res) => {
  try {
    const data = await communicationService.getAdminCommunicationPageData(req.query);
    return res.render('admin/communications', {
      title: 'Communications - helloRun Admin',
      message: getAdminPageMessage(req.query),
      ...data,
      emailFrom: process.env.EMAIL_FROM || '',
      formatDateTime: formatAdminDateTime,
      buildLogPageHref: (page) => buildCommunicationLogHref(data.logFilters, page)
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading communication settings.');
  }
};

exports.updateCommunicationSettings = async (req, res) => {
  try {
    await communicationService.updateGlobalSettings(req.body, getAdminActor(req));
    return res.redirect(buildAdminRedirect('/admin/communications', 'success', 'Communication settings updated.'));
  } catch (error) {
    return res.redirect(buildAdminRedirect('/admin/communications', 'error', error.message || 'Could not update communication settings.'));
  }
};

exports.updateCommunicationEvent = async (req, res) => {
  try {
    await communicationService.updateEventSetting(req.params.eventKey, req.body, getAdminActor(req));
    return res.redirect(buildAdminRedirect('/admin/communications', 'success', 'Communication event updated.'));
  } catch (error) {
    return res.redirect(buildAdminRedirect('/admin/communications', 'error', error.message || 'Could not update communication event.'));
  }
};

exports.sendCommunicationTestEmail = async (req, res) => {
  try {
    const to = String(req.body.to || '').trim().toLowerCase();
    const subject = String(req.body.subject || '').trim().slice(0, 180);
    const message = String(req.body.message || '').trim().slice(0, 1000);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      throw new Error('Enter a valid recipient email.');
    }
    await communicationService.sendTestEmail({
      to,
      subject: subject || 'HelloRun test email',
      message: message || 'This is a test email from HelloRun.',
      actorId: req.session?.userId || null
    });
    return res.redirect(buildAdminRedirect('/admin/communications', 'success', 'Test email processed. Check logs for delivery status.'));
  } catch (error) {
    return res.redirect(buildAdminRedirect('/admin/communications', 'error', error.message || 'Could not send test email.'));
  }
};

exports.reviewQueue = async (req, res) => {
  try {
    const filters = {
      type: normalizeAdminReviewType(req.query.type),
      sort: normalizeAdminReviewSort(req.query.sort),
      q: typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 120) : ''
    };
    const sortDirection = filters.sort === 'newest' ? -1 : 1;
    const includePayments = filters.type === 'all' || filters.type === 'payments';
    const includeResults = filters.type === 'all' || filters.type === 'results';
    const searchRegex = filters.q ? new RegExp(escapeRegex(filters.q), 'i') : null;

    const [paymentDocs, resultDocs] = await Promise.all([
      includePayments
        ? Registration.find({ paymentStatus: 'proof_submitted' })
          .populate('eventId', 'title slug')
          .sort({ 'paymentProof.uploadedAt': sortDirection, updatedAt: sortDirection, createdAt: sortDirection })
          .limit(300)
          .lean()
        : [],
      includeResults
        ? Submission.find({ status: 'submitted' })
          .populate('eventId', 'title slug')
          .populate('registrationId', 'participant confirmationCode')
          .sort({ submittedAt: sortDirection, updatedAt: sortDirection, createdAt: sortDirection })
          .limit(300)
          .lean()
        : []
    ]);

    const paymentItems = paymentDocs.filter((registration) => registration.eventId?._id).map((registration) => {
      const participant = registration.participant || {};
      const event = registration.eventId || {};
      const submittedAt = registration.paymentProof?.uploadedAt || registration.updatedAt || registration.createdAt;
      return {
        type: 'Payment Receipt',
        typeKey: 'payment',
        eventId: String(event._id || registration.eventId || ''),
        eventTitle: event.title || 'Event unavailable',
        participantName: [participant.firstName, participant.lastName].filter(Boolean).join(' ').trim() || 'N/A',
        participantEmail: participant.email || 'N/A',
        confirmationCode: registration.confirmationCode || 'N/A',
        raceDistance: registration.raceDistance || 'N/A',
        participationMode: registration.participationMode || 'N/A',
        submittedAt,
        submittedAtLabel: formatAdminReviewDate(submittedAt),
        status: registration.paymentStatus || 'proof_submitted',
        actionHref: `/organizer/events/${String(event._id || registration.eventId)}/payment-proofs/review`
      };
    });

    const resultItems = resultDocs.filter((submission) => submission.eventId?._id && submission.registrationId?._id).map((submission) => {
      const registration = submission.registrationId || {};
      const participant = registration.participant || {};
      const event = submission.eventId || {};
      const submittedAt = submission.submittedAt || submission.updatedAt || submission.createdAt;
      return {
        type: 'Run Result',
        typeKey: 'result',
        eventId: String(event._id || submission.eventId || ''),
        eventTitle: event.title || 'Event unavailable',
        participantName: [participant.firstName, participant.lastName].filter(Boolean).join(' ').trim() || 'N/A',
        participantEmail: participant.email || 'N/A',
        confirmationCode: registration.confirmationCode || 'N/A',
        raceDistance: submission.raceDistance || 'N/A',
        participationMode: submission.participationMode || 'N/A',
        submittedAt,
        submittedAtLabel: formatAdminReviewDate(submittedAt),
        status: submission.status || 'submitted',
        suspiciousFlag: Boolean(submission.suspiciousFlag),
        suspiciousFlagReason: String(submission.suspiciousFlagReason || '').trim(),
        actionHref: `/organizer/events/${String(event._id || submission.eventId)}/registrants?result=submitted`
      };
    });

    let reviewItems = paymentItems.concat(resultItems);
    if (searchRegex) {
      reviewItems = reviewItems.filter((item) => (
        searchRegex.test(item.eventTitle) ||
        searchRegex.test(item.participantName) ||
        searchRegex.test(item.participantEmail) ||
        searchRegex.test(item.confirmationCode)
      ));
    }

    reviewItems.sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return filters.sort === 'newest' ? bTime - aTime : aTime - bTime;
    });

    return res.render('admin/review-queue', {
      title: 'Payment Receipt and Run Result Reviews - helloRun Admin',
      filters,
      reviewItems,
      counts: {
        all: paymentItems.length + resultItems.length,
        payments: paymentItems.length,
        results: resultItems.length
      },
      links: {
        all: buildReviewQueueParams(filters, { type: 'all' }),
        payments: buildReviewQueueParams(filters, { type: 'payments' }),
        results: buildReviewQueueParams(filters, { type: 'results' }),
        newest: buildReviewQueueParams(filters, { sort: 'newest' }),
        oldest: buildReviewQueueParams(filters, { sort: 'oldest' }),
        reset: '/admin/reviews'
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the admin review queue.');
  }
};

exports.listPrivacyPolicies = async (req, res) => {
  try {
    const [currentPolicy, versions] = await Promise.all([
      PrivacyPolicy.findOne({ slug: POLICY_SLUG, status: 'published', isCurrent: true }).lean(),
      PrivacyPolicy.find({ slug: POLICY_SLUG }).sort({ createdAt: -1 }).lean()
    ]);

    return res.render('admin/privacy-policy-list', {
      title: 'Privacy Policy Management - helloRun Admin',
      message: getMessageFromQuery(req),
      currentPolicy: currentPolicy ? mapPolicyListItem(currentPolicy) : null,
      versions: versions.map(mapPolicyListItem)
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading privacy policy versions.');
  }
};

exports.renderNewPrivacyPolicyDraft = async (req, res) => {
  try {
    const message = getMessageFromQuery(req);
    const [currentPolicy, nextVersionNumber] = await Promise.all([
      PrivacyPolicy.findOne({ slug: POLICY_SLUG, status: 'published', isCurrent: true }).lean(),
      getNextPolicyVersionNumber()
    ]);

    const initialMarkdown = currentPolicy?.contentMarkdown || '';

    return res.render('admin/privacy-policy-form', {
      title: 'New Privacy Policy Draft - helloRun Admin',
      mode: 'create',
      message,
      canPublish: false,
      policy: {
        id: '',
        title: currentPolicy?.title || 'HelloRun Privacy Policy',
        versionNumber: nextVersionNumber,
        summaryOfChanges: '',
        status: 'draft',
        contentMode: 'markdown',
        contentMarkdown: initialMarkdown,
        contentHtmlRaw: '',
        contentHtmlPreview: buildPolicyHtmlFromMarkdown(initialMarkdown)
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while preparing a new privacy policy draft.');
  }
};

exports.createPrivacyPolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Privacy Policy';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);
    const renderCreateWithError = (text) => res.status(400).render('admin/privacy-policy-form', {
      title: 'New Privacy Policy Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'error', text },
      policy: {
        id: '',
        title: title || 'HelloRun Privacy Policy',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });

    if (!versionNumber) {
      return renderCreateWithError('Version number is required.');
    }

    if (!isValidVersionNumber(versionNumber)) {
      return renderCreateWithError('Version format must be major.minor (e.g., 1.1).');
    }

    if (!content.hasContent) {
      return renderCreateWithError('Policy content cannot be empty.');
    }

    if (
      content.contentMarkdown.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH ||
      content.contentHtml.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH
    ) {
      return renderCreateWithError('Policy content is too large.');
    }

    const existingVersion = await PrivacyPolicy.findOne({ slug: POLICY_SLUG, versionNumber }).lean();
    if (existingVersion) {
      return renderCreateWithError('Version number already exists.');
    }

    await PrivacyPolicy.create({
      title: title || 'HelloRun Privacy Policy',
      slug: POLICY_SLUG,
      versionNumber,
      status: 'draft',
      effectiveDate: null,
      contentMode: content.contentMode,
      contentMarkdown: content.contentMarkdown,
      contentHtml: content.contentHtml,
      summaryOfChanges,
      isCurrent: false,
      source: 'admin',
      createdBy: getAdminActor(req),
      updatedBy: getAdminActor(req)
    });

    return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'success', 'Privacy policy draft created.'));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).render('admin/privacy-policy-form', {
        title: 'New Privacy Policy Draft - helloRun Admin',
        mode: 'create',
        message: { type: 'error', text: 'Version number already exists.' },
        policy: {
          id: '',
          title: typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Privacy Policy',
          versionNumber: typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '',
          summaryOfChanges: typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '',
          status: 'draft',
          contentMode: getPolicyContentFromRequest(req.body).contentMode,
          contentMarkdown: getPolicyContentFromRequest(req.body).contentMode === 'markdown' ? getPolicyContentFromRequest(req.body).contentMarkdown : '',
          contentHtmlRaw: getPolicyContentFromRequest(req.body).contentMode === 'rich' ? getPolicyContentFromRequest(req.body).contentHtml : '',
          contentHtmlPreview: getPolicyContentFromRequest(req.body).contentHtml
        }
      });
    }
    return renderServerError(res, error, 'An error occurred while creating the privacy policy draft.');
  }
};

exports.formatNewPrivacyPolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Privacy Policy';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const formattedContent = autoFormatPolicyContent(getPolicyContentFromRequest(req.body));

    return res.render('admin/privacy-policy-form', {
      title: 'New Privacy Policy Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'info', text: 'Auto-format applied. Review before saving.' },
      canPublish: false,
      policy: {
        id: '',
        title: title || 'HelloRun Privacy Policy',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: formattedContent.contentMode,
        contentMarkdown: formattedContent.contentMode === 'markdown' ? formattedContent.contentMarkdown : '',
        contentHtmlRaw: formattedContent.contentMode === 'rich' ? formattedContent.contentHtml : '',
        contentHtmlPreview: formattedContent.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while formatting the privacy policy draft.');
  }
};

exports.previewNewPrivacyPolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Privacy Policy';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);

    return res.render('admin/privacy-policy-form', {
      title: 'New Privacy Policy Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'info', text: 'Preview mode: review before saving or publishing.' },
      canPublish: false,
      policy: {
        id: '',
        title: title || 'HelloRun Privacy Policy',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while previewing the privacy policy draft.');
  }
};

exports.viewPrivacyPolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).render('error', {
        title: '404 - Privacy Policy Not Found',
        status: 404,
        message: 'The requested privacy policy version does not exist.'
      });
    }

    const policy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!policy) {
      return res.status(404).render('error', {
        title: '404 - Privacy Policy Not Found',
        status: 404,
        message: 'The requested privacy policy version does not exist.'
      });
    }

    if (policy.slug !== POLICY_SLUG) {
      return res.status(404).render('error', {
        title: '404 - Privacy Policy Not Found',
        status: 404,
        message: 'The requested privacy policy version does not exist.'
      });
    }

    return res.render('admin/privacy-policy-form', {
      title: `Privacy Policy ${policy.versionNumber} - helloRun Admin`,
      mode: 'view',
      message: getMessageFromQuery(req),
      canPublish: true,
      policy: {
        id: String(policy._id),
        title: policy.title || 'Privacy Policy',
        versionNumber: policy.versionNumber || 'N/A',
        summaryOfChanges: policy.summaryOfChanges || '',
        status: policy.status,
        contentMode: policy.contentMode || 'markdown',
        isCurrent: Boolean(policy.isCurrent),
        effectiveDate: policy.effectiveDate,
        publishedAt: policy.publishedAt,
        contentMarkdown: policy.contentMarkdown || '',
        contentHtmlRaw: policy.contentHtml || '',
        contentHtmlPreview: policy.contentHtml || buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '')
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the privacy policy version.');
  }
};

exports.renderEditPrivacyPolicyDraft = async (req, res) => {
  try {
    const message = getMessageFromQuery(req);
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Invalid privacy policy version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!policy) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (policy.slug !== POLICY_SLUG) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (policy.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${policy._id}`, 'error', 'Only draft versions can be edited.'));
    }

    return res.render('admin/privacy-policy-form', {
      title: `Edit Privacy Policy ${policy.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message,
      canPublish: canPublishFromMessage(message),
      policy: {
        id: String(policy._id),
        title: policy.title || 'Privacy Policy',
        versionNumber: policy.versionNumber || '',
        summaryOfChanges: policy.summaryOfChanges || '',
        status: policy.status,
        contentMode: policy.contentMode || 'markdown',
        contentMarkdown: policy.contentMarkdown || '',
        contentHtmlRaw: policy.contentHtml || '',
        contentHtmlPreview: policy.contentHtml || buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '')
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the privacy policy draft.');
  }
};

exports.updatePrivacyPolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Invalid privacy policy version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id);
    if (!policy) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (policy.slug !== POLICY_SLUG) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (policy.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${policy._id}`, 'error', 'Only draft versions can be edited.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);
    const renderEditWithError = (text) => res.status(400).render('admin/privacy-policy-form', {
      title: `Edit Privacy Policy ${policy.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'error', text },
      canPublish: false,
      policy: {
        id: String(policy._id),
        title: title || policy.title || 'Privacy Policy',
        versionNumber,
        summaryOfChanges,
        status: policy.status,
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });

    if (!title || !versionNumber || !content.hasContent) {
      return renderEditWithError('Title, version, and content are required.');
    }

    if (!isValidVersionNumber(versionNumber)) {
      return renderEditWithError('Version format must be major.minor (e.g., 1.1).');
    }

    if (
      content.contentMarkdown.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH ||
      content.contentHtml.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH
    ) {
      return renderEditWithError('Policy content is too large.');
    }

    const duplicateVersion = await PrivacyPolicy.findOne({
      _id: { $ne: policy._id },
      slug: POLICY_SLUG,
      versionNumber
    }).lean();

    if (duplicateVersion) {
      return renderEditWithError('Version number already exists.');
    }

    policy.title = title;
    policy.versionNumber = versionNumber;
    policy.summaryOfChanges = summaryOfChanges;
    policy.contentMode = content.contentMode;
    policy.contentMarkdown = content.contentMarkdown;
    policy.contentHtml = content.contentHtml;
    policy.updatedBy = getAdminActor(req);

    await policy.save();

    return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${policy._id}/edit`, 'success', 'Privacy policy draft saved.'));
  } catch (error) {
    if (error?.code === 11000) {
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        const existing = await PrivacyPolicy.findById(req.params.id).lean();
        if (existing) {
          const content = getPolicyContentFromRequest(req.body);
          return res.status(400).render('admin/privacy-policy-form', {
            title: `Edit Privacy Policy ${existing.versionNumber} - helloRun Admin`,
            mode: 'edit',
            message: { type: 'error', text: 'Version number already exists.' },
            canPublish: false,
            policy: {
              id: String(existing._id),
              title: typeof req.body.title === 'string' ? req.body.title.trim() : existing.title,
              versionNumber: typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber,
              summaryOfChanges: typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '',
              status: existing.status,
              contentMode: content.contentMode,
              contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
              contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
              contentHtmlPreview: content.contentHtml
            }
          });
        }
      }
      return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${req.params.id}/edit`, 'error', 'Version number already exists.'));
    }
    return renderServerError(res, error, 'An error occurred while saving the privacy policy draft.');
  }
};

exports.formatExistingPrivacyPolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Invalid privacy policy version.'));
    }

    const existing = await PrivacyPolicy.findById(req.params.id).lean();
    if (!existing || existing.slug !== POLICY_SLUG) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (existing.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${existing._id}`, 'error', 'Only draft versions can be formatted here.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : existing.title;
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber;
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const formattedContent = autoFormatPolicyContent(getPolicyContentFromRequest(req.body));

    return res.render('admin/privacy-policy-form', {
      title: `Edit Privacy Policy ${existing.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'info', text: 'Auto-format applied. Review before saving.' },
      canPublish: false,
      policy: {
        id: String(existing._id),
        title: title || existing.title || 'Privacy Policy',
        versionNumber,
        summaryOfChanges,
        status: existing.status,
        contentMode: formattedContent.contentMode,
        contentMarkdown: formattedContent.contentMode === 'markdown' ? formattedContent.contentMarkdown : '',
        contentHtmlRaw: formattedContent.contentMode === 'rich' ? formattedContent.contentHtml : '',
        contentHtmlPreview: formattedContent.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while formatting the privacy policy draft.');
  }
};

exports.previewExistingPrivacyPolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Invalid privacy policy version.'));
    }

    const existing = await PrivacyPolicy.findById(req.params.id).lean();
    if (!existing || existing.slug !== POLICY_SLUG) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (existing.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${existing._id}`, 'error', 'Only draft versions can be previewed here.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : existing.title;
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber;
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);

    return res.render('admin/privacy-policy-form', {
      title: `Edit Privacy Policy ${existing.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'info', text: 'Preview mode: review before saving or publishing.' },
      canPublish: false,
      policy: {
        id: String(existing._id),
        title: title || existing.title || 'Privacy Policy',
        versionNumber,
        summaryOfChanges,
        status: existing.status,
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while previewing the privacy policy draft.');
  }
};

exports.clonePrivacyPolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Invalid privacy policy version.'));
    }

    const sourcePolicy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!sourcePolicy) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (sourcePolicy.slug !== POLICY_SLUG) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    const nextVersionNumber = await getNextPolicyVersionNumber();

    const newDraft = await PrivacyPolicy.create({
      title: sourcePolicy.title || 'HelloRun Privacy Policy',
      slug: POLICY_SLUG,
      versionNumber: nextVersionNumber,
      status: 'draft',
      effectiveDate: null,
      contentMarkdown: sourcePolicy.contentMarkdown || '',
      contentHtml: sourcePolicy.contentHtml || buildPolicyHtmlFromMarkdown(sourcePolicy.contentMarkdown || ''),
      contentMode: sourcePolicy.contentMode || 'markdown',
      summaryOfChanges: '',
      isCurrent: false,
      source: 'admin',
      createdBy: getAdminActor(req),
      updatedBy: getAdminActor(req)
    });

    return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${newDraft._id}/edit`, 'success', 'Draft cloned from selected version.'));
  } catch (error) {
    if (error?.code === 11000) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Could not clone due to version conflict. Try again.'));
    }
    return renderServerError(res, error, 'An error occurred while cloning the privacy policy version.');
  }
};

exports.publishPrivacyPolicyDraft = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Invalid privacy policy version.'));
    }

    session.startTransaction();

    const policy = await PrivacyPolicy.findById(req.params.id).session(session);
    if (!policy) {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy draft not found.'));
    }

    if (policy.slug !== POLICY_SLUG) {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (policy.status !== 'draft') {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${policy._id}`, 'error', 'Only draft versions can be published.'));
    }

    await PrivacyPolicy.updateMany(
      {
        slug: POLICY_SLUG,
        status: 'published',
        isCurrent: true
      },
      {
        $set: { isCurrent: false }
      },
      { session }
    );

    const now = new Date();
    policy.status = 'published';
    policy.isCurrent = true;
    policy.effectiveDate = now;
    policy.publishedAt = now;
    if (policy.contentMode === 'rich') {
      // Preserve rich editor structure on publish so public page matches preview.
      policy.contentHtml = sanitizeRichPolicyHtml(policy.contentHtml || '');
      if (!policy.contentHtml) {
        policy.contentHtml = buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '');
      }
    } else {
      policy.contentHtml = buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '');
    }
    policy.publishedBy = getAdminActor(req);
    policy.updatedBy = getAdminActor(req);

    await policy.save({ session });
    await session.commitTransaction();

    return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'success', `Version ${policy.versionNumber} is now live.`));
  } catch (error) {
    await session.abortTransaction();
    return renderServerError(res, error, 'An error occurred while publishing the privacy policy draft.');
  } finally {
    session.endSession();
  }
};

exports.archivePrivacyPolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Invalid privacy policy version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id);
    if (!policy) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (policy.slug !== POLICY_SLUG) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (policy.isCurrent) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Current live policy cannot be archived.'));
    }

    policy.status = 'archived';
    policy.updatedBy = getAdminActor(req);

    await policy.save();

    return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'success', `Version ${policy.versionNumber} archived.`));
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while archiving the privacy policy version.');
  }
};




exports.listTermsPolicies = async (req, res) => {
  try {
    const [currentPolicy, versions] = await Promise.all([
      PrivacyPolicy.findOne({ slug: TERMS_POLICY_SLUG, status: 'published', isCurrent: true }).lean(),
      PrivacyPolicy.find({ slug: TERMS_POLICY_SLUG }).sort({ createdAt: -1 }).lean()
    ]);

    return res.render('admin/privacy-policy-list', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: 'Terms and Conditions Management - helloRun Admin',
      message: getMessageFromQuery(req),
      currentPolicy: currentPolicy ? mapPolicyListItem(currentPolicy, 'Terms and Conditions') : null,
      versions: versions.map((item) => mapPolicyListItem(item, 'Terms and Conditions'))
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading terms and conditions versions.');
  }
};

exports.renderNewTermsPolicyDraft = async (req, res) => {
  try {
    const message = getMessageFromQuery(req);
    const [currentPolicy, nextVersionNumber] = await Promise.all([
      PrivacyPolicy.findOne({ slug: TERMS_POLICY_SLUG, status: 'published', isCurrent: true }).lean(),
      getNextPolicyVersionNumberForSlug(TERMS_POLICY_SLUG)
    ]);

    const initialMarkdown = currentPolicy?.contentMarkdown || '';

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: 'New Terms and Conditions Draft - helloRun Admin',
      mode: 'create',
      message,
      canPublish: false,
      policy: {
        id: '',
        title: currentPolicy?.title || 'HelloRun Terms and Conditions',
        versionNumber: nextVersionNumber,
        summaryOfChanges: '',
        status: 'draft',
        contentMode: 'markdown',
        contentMarkdown: initialMarkdown,
        contentHtmlRaw: '',
        contentHtmlPreview: buildPolicyHtmlFromMarkdown(initialMarkdown)
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while preparing a new terms and conditions draft.');
  }
};

exports.createTermsPolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Terms and Conditions';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);
    const renderCreateWithError = (text) => res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: 'New Terms and Conditions Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'error', text },
      policy: {
        id: '',
        title: title || 'HelloRun Terms and Conditions',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });

    if (!versionNumber) {
      return renderCreateWithError('Version number is required.');
    }

    if (!isValidVersionNumber(versionNumber)) {
      return renderCreateWithError('Version format must be major.minor (e.g., 1.1).');
    }

    if (!content.hasContent) {
      return renderCreateWithError('Policy content cannot be empty.');
    }

    if (
      content.contentMarkdown.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH ||
      content.contentHtml.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH
    ) {
      return renderCreateWithError('Policy content is too large.');
    }

    const existingVersion = await PrivacyPolicy.findOne({ slug: TERMS_POLICY_SLUG, versionNumber }).lean();
    if (existingVersion) {
      return renderCreateWithError('Version number already exists.');
    }

    await PrivacyPolicy.create({
      title: title || 'HelloRun Terms and Conditions',
      slug: TERMS_POLICY_SLUG,
      versionNumber,
      status: 'draft',
      effectiveDate: null,
      contentMode: content.contentMode,
      contentMarkdown: content.contentMarkdown,
      contentHtml: content.contentHtml,
      summaryOfChanges,
      isCurrent: false,
      source: 'admin',
      createdBy: getAdminActor(req),
      updatedBy: getAdminActor(req)
    });

    return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'success', 'Terms and conditions draft created.'));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
        title: 'New Terms and Conditions Draft - helloRun Admin',
        mode: 'create',
        message: { type: 'error', text: 'Version number already exists.' },
        policy: {
          id: '',
          title: typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Terms and Conditions',
          versionNumber: typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '',
          summaryOfChanges: typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '',
          status: 'draft',
          contentMode: getPolicyContentFromRequest(req.body).contentMode,
          contentMarkdown: getPolicyContentFromRequest(req.body).contentMode === 'markdown' ? getPolicyContentFromRequest(req.body).contentMarkdown : '',
          contentHtmlRaw: getPolicyContentFromRequest(req.body).contentMode === 'rich' ? getPolicyContentFromRequest(req.body).contentHtml : '',
          contentHtmlPreview: getPolicyContentFromRequest(req.body).contentHtml
        }
      });
    }
    return renderServerError(res, error, 'An error occurred while creating the terms and conditions draft.');
  }
};

exports.formatNewTermsPolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Terms and Conditions';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const formattedContent = autoFormatPolicyContent(getPolicyContentFromRequest(req.body));

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: 'New Terms and Conditions Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'info', text: 'Auto-format applied. Review before saving.' },
      canPublish: false,
      policy: {
        id: '',
        title: title || 'HelloRun Terms and Conditions',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: formattedContent.contentMode,
        contentMarkdown: formattedContent.contentMode === 'markdown' ? formattedContent.contentMarkdown : '',
        contentHtmlRaw: formattedContent.contentMode === 'rich' ? formattedContent.contentHtml : '',
        contentHtmlPreview: formattedContent.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while formatting the terms and conditions draft.');
  }
};

exports.previewNewTermsPolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Terms and Conditions';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: 'New Terms and Conditions Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'info', text: 'Preview mode: review before saving or publishing.' },
      canPublish: false,
      policy: {
        id: '',
        title: title || 'HelloRun Terms and Conditions',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while previewing the terms and conditions draft.');
  }
};

exports.viewTermsPolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).render('error', {
        title: '404 - Terms and Conditions Not Found',
        status: 404,
        message: 'The requested terms and conditions version does not exist.'
      });
    }

    const policy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!policy) {
      return res.status(404).render('error', {
        title: '404 - Terms and Conditions Not Found',
        status: 404,
        message: 'The requested terms and conditions version does not exist.'
      });
    }

    if (policy.slug !== TERMS_POLICY_SLUG) {
      return res.status(404).render('error', {
        title: '404 - Terms and Conditions Not Found',
        status: 404,
        message: 'The requested terms and conditions version does not exist.'
      });
    }

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: `Terms and Conditions ${policy.versionNumber} - helloRun Admin`,
      mode: 'view',
      message: getMessageFromQuery(req),
      canPublish: true,
      policy: {
        id: String(policy._id),
        title: policy.title || 'Terms and Conditions',
        versionNumber: policy.versionNumber || 'N/A',
        summaryOfChanges: policy.summaryOfChanges || '',
        status: policy.status,
        contentMode: policy.contentMode || 'markdown',
        isCurrent: Boolean(policy.isCurrent),
        effectiveDate: policy.effectiveDate,
        publishedAt: policy.publishedAt,
        contentMarkdown: policy.contentMarkdown || '',
        contentHtmlRaw: policy.contentHtml || '',
        contentHtmlPreview: policy.contentHtml || buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '')
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the terms and conditions version.');
  }
};

exports.renderEditTermsPolicyDraft = async (req, res) => {
  try {
    const message = getMessageFromQuery(req);
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Invalid terms and conditions version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!policy) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (policy.slug !== TERMS_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (policy.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${policy._id}`, 'error', 'Only draft versions can be edited.'));
    }

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: `Edit Terms and Conditions ${policy.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message,
      canPublish: canPublishFromMessage(message),
      policy: {
        id: String(policy._id),
        title: policy.title || 'Terms and Conditions',
        versionNumber: policy.versionNumber || '',
        summaryOfChanges: policy.summaryOfChanges || '',
        status: policy.status,
        contentMode: policy.contentMode || 'markdown',
        contentMarkdown: policy.contentMarkdown || '',
        contentHtmlRaw: policy.contentHtml || '',
        contentHtmlPreview: policy.contentHtml || buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '')
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the terms and conditions draft.');
  }
};

exports.updateTermsPolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Invalid terms and conditions version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id);
    if (!policy) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (policy.slug !== TERMS_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (policy.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${policy._id}`, 'error', 'Only draft versions can be edited.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);
    const renderEditWithError = (text) => res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: `Edit Terms and Conditions ${policy.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'error', text },
      canPublish: false,
      policy: {
        id: String(policy._id),
        title: title || policy.title || 'Terms and Conditions',
        versionNumber,
        summaryOfChanges,
        status: policy.status,
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });

    if (!title || !versionNumber || !content.hasContent) {
      return renderEditWithError('Title, version, and content are required.');
    }

    if (!isValidVersionNumber(versionNumber)) {
      return renderEditWithError('Version format must be major.minor (e.g., 1.1).');
    }

    if (
      content.contentMarkdown.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH ||
      content.contentHtml.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH
    ) {
      return renderEditWithError('Policy content is too large.');
    }

    const duplicateVersion = await PrivacyPolicy.findOne({
      _id: { $ne: policy._id },
      slug: TERMS_POLICY_SLUG,
      versionNumber
    }).lean();

    if (duplicateVersion) {
      return renderEditWithError('Version number already exists.');
    }

    policy.title = title;
    policy.versionNumber = versionNumber;
    policy.summaryOfChanges = summaryOfChanges;
    policy.contentMode = content.contentMode;
    policy.contentMarkdown = content.contentMarkdown;
    policy.contentHtml = content.contentHtml;
    policy.updatedBy = getAdminActor(req);

    await policy.save();

    return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${policy._id}/edit`, 'success', 'Terms and conditions draft saved.'));
  } catch (error) {
    if (error?.code === 11000) {
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        const existing = await PrivacyPolicy.findById(req.params.id).lean();
        if (existing) {
          const content = getPolicyContentFromRequest(req.body);
          return res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
            title: `Edit Terms and Conditions ${existing.versionNumber} - helloRun Admin`,
            mode: 'edit',
            message: { type: 'error', text: 'Version number already exists.' },
            canPublish: false,
            policy: {
              id: String(existing._id),
              title: typeof req.body.title === 'string' ? req.body.title.trim() : existing.title,
              versionNumber: typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber,
              summaryOfChanges: typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '',
              status: existing.status,
              contentMode: content.contentMode,
              contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
              contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
              contentHtmlPreview: content.contentHtml
            }
          });
        }
      }
      return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${req.params.id}/edit`, 'error', 'Version number already exists.'));
    }
    return renderServerError(res, error, 'An error occurred while saving the terms and conditions draft.');
  }
};

exports.formatExistingTermsPolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Invalid terms and conditions version.'));
    }

    const existing = await PrivacyPolicy.findById(req.params.id).lean();
    if (!existing || existing.slug !== TERMS_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (existing.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${existing._id}`, 'error', 'Only draft versions can be formatted here.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : existing.title;
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber;
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const formattedContent = autoFormatPolicyContent(getPolicyContentFromRequest(req.body));

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: `Edit Terms and Conditions ${existing.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'info', text: 'Auto-format applied. Review before saving.' },
      canPublish: false,
      policy: {
        id: String(existing._id),
        title: title || existing.title || 'Terms and Conditions',
        versionNumber,
        summaryOfChanges,
        status: existing.status,
        contentMode: formattedContent.contentMode,
        contentMarkdown: formattedContent.contentMode === 'markdown' ? formattedContent.contentMarkdown : '',
        contentHtmlRaw: formattedContent.contentMode === 'rich' ? formattedContent.contentHtml : '',
        contentHtmlPreview: formattedContent.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while formatting the terms and conditions draft.');
  }
};

exports.previewExistingTermsPolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Invalid terms and conditions version.'));
    }

    const existing = await PrivacyPolicy.findById(req.params.id).lean();
    if (!existing || existing.slug !== TERMS_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (existing.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${existing._id}`, 'error', 'Only draft versions can be previewed here.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : existing.title;
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber;
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: `Edit Terms and Conditions ${existing.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'info', text: 'Preview mode: review before saving or publishing.' },
      canPublish: false,
      policy: {
        id: String(existing._id),
        title: title || existing.title || 'Terms and Conditions',
        versionNumber,
        summaryOfChanges,
        status: existing.status,
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while previewing the terms and conditions draft.');
  }
};

exports.cloneTermsPolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Invalid terms and conditions version.'));
    }

    const sourcePolicy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!sourcePolicy) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (sourcePolicy.slug !== TERMS_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    const nextVersionNumber = await getNextPolicyVersionNumberForSlug(TERMS_POLICY_SLUG);

    const newDraft = await PrivacyPolicy.create({
      title: sourcePolicy.title || 'HelloRun Terms and Conditions',
      slug: TERMS_POLICY_SLUG,
      versionNumber: nextVersionNumber,
      status: 'draft',
      effectiveDate: null,
      contentMarkdown: sourcePolicy.contentMarkdown || '',
      contentHtml: sourcePolicy.contentHtml || buildPolicyHtmlFromMarkdown(sourcePolicy.contentMarkdown || ''),
      contentMode: sourcePolicy.contentMode || 'markdown',
      summaryOfChanges: '',
      isCurrent: false,
      source: 'admin',
      createdBy: getAdminActor(req),
      updatedBy: getAdminActor(req)
    });

    return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${newDraft._id}/edit`, 'success', 'Draft cloned from selected version.'));
  } catch (error) {
    if (error?.code === 11000) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Could not clone due to version conflict. Try again.'));
    }
    return renderServerError(res, error, 'An error occurred while cloning the terms and conditions version.');
  }
};

exports.publishTermsPolicyDraft = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Invalid terms and conditions version.'));
    }

    session.startTransaction();

    const policy = await PrivacyPolicy.findById(req.params.id).session(session);
    if (!policy) {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions draft not found.'));
    }

    if (policy.slug !== TERMS_POLICY_SLUG) {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (policy.status !== 'draft') {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${policy._id}`, 'error', 'Only draft versions can be published.'));
    }

    await PrivacyPolicy.updateMany(
      {
        slug: TERMS_POLICY_SLUG,
        status: 'published',
        isCurrent: true
      },
      {
        $set: { isCurrent: false }
      },
      { session }
    );

    const now = new Date();
    policy.status = 'published';
    policy.isCurrent = true;
    policy.effectiveDate = now;
    policy.publishedAt = now;
    if (policy.contentMode === 'rich') {
      // Preserve rich editor structure on publish so public page matches preview.
      policy.contentHtml = sanitizeRichPolicyHtml(policy.contentHtml || '');
      if (!policy.contentHtml) {
        policy.contentHtml = buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '');
      }
    } else {
      policy.contentHtml = buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '');
    }
    policy.publishedBy = getAdminActor(req);
    policy.updatedBy = getAdminActor(req);

    await policy.save({ session });
    await session.commitTransaction();

    return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'success', `Version ${policy.versionNumber} is now live.`));
  } catch (error) {
    await session.abortTransaction();
    return renderServerError(res, error, 'An error occurred while publishing the terms and conditions draft.');
  } finally {
    session.endSession();
  }
};

exports.archiveTermsPolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Invalid terms and conditions version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id);
    if (!policy) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (policy.slug !== TERMS_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (policy.isCurrent) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Current live terms and conditions cannot be archived.'));
    }

    policy.status = 'archived';
    policy.updatedBy = getAdminActor(req);

    await policy.save();

    return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'success', `Version ${policy.versionNumber} archived.`));
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while archiving the terms and conditions version.');
  }
};

exports.listCookiePolicies = async (req, res) => {
  try {
    const [currentPolicy, versions] = await Promise.all([
      PrivacyPolicy.findOne({ slug: COOKIE_POLICY_SLUG, status: 'published', isCurrent: true }).lean(),
      PrivacyPolicy.find({ slug: COOKIE_POLICY_SLUG }).sort({ createdAt: -1 }).lean()
    ]);

    return res.render('admin/privacy-policy-list', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: 'Cookie Policy Management - helloRun Admin',
      message: getMessageFromQuery(req),
      currentPolicy: currentPolicy ? mapPolicyListItem(currentPolicy, 'Cookie Policy') : null,
      versions: versions.map((item) => mapPolicyListItem(item, 'Cookie Policy'))
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading cookie policy versions.');
  }
};

exports.renderNewCookiePolicyDraft = async (req, res) => {
  try {
    const message = getMessageFromQuery(req);
    const [currentPolicy, nextVersionNumber] = await Promise.all([
      PrivacyPolicy.findOne({ slug: COOKIE_POLICY_SLUG, status: 'published', isCurrent: true }).lean(),
      getNextPolicyVersionNumberForSlug(COOKIE_POLICY_SLUG)
    ]);

    const initialMarkdown = currentPolicy?.contentMarkdown || '';

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: 'New Cookie Policy Draft - helloRun Admin',
      mode: 'create',
      message,
      canPublish: false,
      policy: {
        id: '',
        title: currentPolicy?.title || 'HelloRun Cookie Policy',
        versionNumber: nextVersionNumber,
        summaryOfChanges: '',
        status: 'draft',
        contentMode: 'markdown',
        contentMarkdown: initialMarkdown,
        contentHtmlRaw: '',
        contentHtmlPreview: buildPolicyHtmlFromMarkdown(initialMarkdown)
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while preparing a new cookie policy draft.');
  }
};

exports.createCookiePolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Cookie Policy';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);
    const renderCreateWithError = (text) => res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: 'New Cookie Policy Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'error', text },
      policy: {
        id: '',
        title: title || 'HelloRun Cookie Policy',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });

    if (!versionNumber) {
      return renderCreateWithError('Version number is required.');
    }

    if (!isValidVersionNumber(versionNumber)) {
      return renderCreateWithError('Version format must be major.minor (e.g., 1.1).');
    }

    if (!content.hasContent) {
      return renderCreateWithError('Policy content cannot be empty.');
    }

    if (
      content.contentMarkdown.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH ||
      content.contentHtml.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH
    ) {
      return renderCreateWithError('Policy content is too large.');
    }

    const existingVersion = await PrivacyPolicy.findOne({ slug: COOKIE_POLICY_SLUG, versionNumber }).lean();
    if (existingVersion) {
      return renderCreateWithError('Version number already exists.');
    }

    await PrivacyPolicy.create({
      title: title || 'HelloRun Cookie Policy',
      slug: COOKIE_POLICY_SLUG,
      versionNumber,
      status: 'draft',
      effectiveDate: null,
      contentMode: content.contentMode,
      contentMarkdown: content.contentMarkdown,
      contentHtml: content.contentHtml,
      summaryOfChanges,
      isCurrent: false,
      source: 'admin',
      createdBy: getAdminActor(req),
      updatedBy: getAdminActor(req)
    });

    return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'success', 'Cookie policy draft created.'));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
        title: 'New Cookie Policy Draft - helloRun Admin',
        mode: 'create',
        message: { type: 'error', text: 'Version number already exists.' },
        policy: {
          id: '',
          title: typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Cookie Policy',
          versionNumber: typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '',
          summaryOfChanges: typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '',
          status: 'draft',
          contentMode: getPolicyContentFromRequest(req.body).contentMode,
          contentMarkdown: getPolicyContentFromRequest(req.body).contentMode === 'markdown' ? getPolicyContentFromRequest(req.body).contentMarkdown : '',
          contentHtmlRaw: getPolicyContentFromRequest(req.body).contentMode === 'rich' ? getPolicyContentFromRequest(req.body).contentHtml : '',
          contentHtmlPreview: getPolicyContentFromRequest(req.body).contentHtml
        }
      });
    }
    return renderServerError(res, error, 'An error occurred while creating the cookie policy draft.');
  }
};

exports.formatNewCookiePolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Cookie Policy';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const formattedContent = autoFormatPolicyContent(getPolicyContentFromRequest(req.body));

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: 'New Cookie Policy Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'info', text: 'Auto-format applied. Review before saving.' },
      canPublish: false,
      policy: {
        id: '',
        title: title || 'HelloRun Cookie Policy',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: formattedContent.contentMode,
        contentMarkdown: formattedContent.contentMode === 'markdown' ? formattedContent.contentMarkdown : '',
        contentHtmlRaw: formattedContent.contentMode === 'rich' ? formattedContent.contentHtml : '',
        contentHtmlPreview: formattedContent.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while formatting the cookie policy draft.');
  }
};

exports.previewNewCookiePolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Cookie Policy';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: 'New Cookie Policy Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'info', text: 'Preview mode: review before saving or publishing.' },
      canPublish: false,
      policy: {
        id: '',
        title: title || 'HelloRun Cookie Policy',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while previewing the cookie policy draft.');
  }
};

exports.viewCookiePolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).render('error', {
        title: '404 - Cookie Policy Not Found',
        status: 404,
        message: 'The requested cookie policy version does not exist.'
      });
    }

    const policy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!policy) {
      return res.status(404).render('error', {
        title: '404 - Cookie Policy Not Found',
        status: 404,
        message: 'The requested cookie policy version does not exist.'
      });
    }

    if (policy.slug !== COOKIE_POLICY_SLUG) {
      return res.status(404).render('error', {
        title: '404 - Cookie Policy Not Found',
        status: 404,
        message: 'The requested cookie policy version does not exist.'
      });
    }

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: `Cookie Policy ${policy.versionNumber} - helloRun Admin`,
      mode: 'view',
      message: getMessageFromQuery(req),
      canPublish: true,
      policy: {
        id: String(policy._id),
        title: policy.title || 'Cookie Policy',
        versionNumber: policy.versionNumber || 'N/A',
        summaryOfChanges: policy.summaryOfChanges || '',
        status: policy.status,
        contentMode: policy.contentMode || 'markdown',
        isCurrent: Boolean(policy.isCurrent),
        effectiveDate: policy.effectiveDate,
        publishedAt: policy.publishedAt,
        contentMarkdown: policy.contentMarkdown || '',
        contentHtmlRaw: policy.contentHtml || '',
        contentHtmlPreview: policy.contentHtml || buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '')
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the cookie policy version.');
  }
};

exports.renderEditCookiePolicyDraft = async (req, res) => {
  try {
    const message = getMessageFromQuery(req);
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Invalid cookie policy version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!policy) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (policy.slug !== COOKIE_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (policy.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${policy._id}`, 'error', 'Only draft versions can be edited.'));
    }

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: `Edit Cookie Policy ${policy.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message,
      canPublish: canPublishFromMessage(message),
      policy: {
        id: String(policy._id),
        title: policy.title || 'Cookie Policy',
        versionNumber: policy.versionNumber || '',
        summaryOfChanges: policy.summaryOfChanges || '',
        status: policy.status,
        contentMode: policy.contentMode || 'markdown',
        contentMarkdown: policy.contentMarkdown || '',
        contentHtmlRaw: policy.contentHtml || '',
        contentHtmlPreview: policy.contentHtml || buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '')
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the cookie policy draft.');
  }
};

exports.updateCookiePolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Invalid cookie policy version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id);
    if (!policy) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (policy.slug !== COOKIE_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (policy.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${policy._id}`, 'error', 'Only draft versions can be edited.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);
    const renderEditWithError = (text) => res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: `Edit Cookie Policy ${policy.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'error', text },
      canPublish: false,
      policy: {
        id: String(policy._id),
        title: title || policy.title || 'Cookie Policy',
        versionNumber,
        summaryOfChanges,
        status: policy.status,
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });

    if (!title || !versionNumber || !content.hasContent) {
      return renderEditWithError('Title, version, and content are required.');
    }

    if (!isValidVersionNumber(versionNumber)) {
      return renderEditWithError('Version format must be major.minor (e.g., 1.1).');
    }

    if (
      content.contentMarkdown.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH ||
      content.contentHtml.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH
    ) {
      return renderEditWithError('Policy content is too large.');
    }

    const duplicateVersion = await PrivacyPolicy.findOne({
      _id: { $ne: policy._id },
      slug: COOKIE_POLICY_SLUG,
      versionNumber
    }).lean();

    if (duplicateVersion) {
      return renderEditWithError('Version number already exists.');
    }

    policy.title = title;
    policy.versionNumber = versionNumber;
    policy.summaryOfChanges = summaryOfChanges;
    policy.contentMode = content.contentMode;
    policy.contentMarkdown = content.contentMarkdown;
    policy.contentHtml = content.contentHtml;
    policy.updatedBy = getAdminActor(req);

    await policy.save();

    return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${policy._id}/edit`, 'success', 'Cookie policy draft saved.'));
  } catch (error) {
    if (error?.code === 11000) {
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        const existing = await PrivacyPolicy.findById(req.params.id).lean();
        if (existing) {
          const content = getPolicyContentFromRequest(req.body);
          return res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
            title: `Edit Cookie Policy ${existing.versionNumber} - helloRun Admin`,
            mode: 'edit',
            message: { type: 'error', text: 'Version number already exists.' },
            canPublish: false,
            policy: {
              id: String(existing._id),
              title: typeof req.body.title === 'string' ? req.body.title.trim() : existing.title,
              versionNumber: typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber,
              summaryOfChanges: typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '',
              status: existing.status,
              contentMode: content.contentMode,
              contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
              contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
              contentHtmlPreview: content.contentHtml
            }
          });
        }
      }
      return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${req.params.id}/edit`, 'error', 'Version number already exists.'));
    }
    return renderServerError(res, error, 'An error occurred while saving the cookie policy draft.');
  }
};

exports.formatExistingCookiePolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Invalid cookie policy version.'));
    }

    const existing = await PrivacyPolicy.findById(req.params.id).lean();
    if (!existing || existing.slug !== COOKIE_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (existing.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${existing._id}`, 'error', 'Only draft versions can be formatted here.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : existing.title;
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber;
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const formattedContent = autoFormatPolicyContent(getPolicyContentFromRequest(req.body));

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: `Edit Cookie Policy ${existing.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'info', text: 'Auto-format applied. Review before saving.' },
      canPublish: false,
      policy: {
        id: String(existing._id),
        title: title || existing.title || 'Cookie Policy',
        versionNumber,
        summaryOfChanges,
        status: existing.status,
        contentMode: formattedContent.contentMode,
        contentMarkdown: formattedContent.contentMode === 'markdown' ? formattedContent.contentMarkdown : '',
        contentHtmlRaw: formattedContent.contentMode === 'rich' ? formattedContent.contentHtml : '',
        contentHtmlPreview: formattedContent.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while formatting the cookie policy draft.');
  }
};

exports.previewExistingCookiePolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Invalid cookie policy version.'));
    }

    const existing = await PrivacyPolicy.findById(req.params.id).lean();
    if (!existing || existing.slug !== COOKIE_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (existing.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${existing._id}`, 'error', 'Only draft versions can be previewed here.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : existing.title;
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber;
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: `Edit Cookie Policy ${existing.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'info', text: 'Preview mode: review before saving or publishing.' },
      canPublish: false,
      policy: {
        id: String(existing._id),
        title: title || existing.title || 'Cookie Policy',
        versionNumber,
        summaryOfChanges,
        status: existing.status,
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while previewing the cookie policy draft.');
  }
};

exports.cloneCookiePolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Invalid cookie policy version.'));
    }

    const sourcePolicy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!sourcePolicy) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (sourcePolicy.slug !== COOKIE_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    const nextVersionNumber = await getNextPolicyVersionNumberForSlug(COOKIE_POLICY_SLUG);

    const newDraft = await PrivacyPolicy.create({
      title: sourcePolicy.title || 'HelloRun Cookie Policy',
      slug: COOKIE_POLICY_SLUG,
      versionNumber: nextVersionNumber,
      status: 'draft',
      effectiveDate: null,
      contentMarkdown: sourcePolicy.contentMarkdown || '',
      contentHtml: sourcePolicy.contentHtml || buildPolicyHtmlFromMarkdown(sourcePolicy.contentMarkdown || ''),
      contentMode: sourcePolicy.contentMode || 'markdown',
      summaryOfChanges: '',
      isCurrent: false,
      source: 'admin',
      createdBy: getAdminActor(req),
      updatedBy: getAdminActor(req)
    });

    return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${newDraft._id}/edit`, 'success', 'Draft cloned from selected version.'));
  } catch (error) {
    if (error?.code === 11000) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Could not clone due to version conflict. Try again.'));
    }
    return renderServerError(res, error, 'An error occurred while cloning the cookie policy version.');
  }
};

exports.publishCookiePolicyDraft = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Invalid cookie policy version.'));
    }

    session.startTransaction();

    const policy = await PrivacyPolicy.findById(req.params.id).session(session);
    if (!policy) {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy draft not found.'));
    }

    if (policy.slug !== COOKIE_POLICY_SLUG) {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (policy.status !== 'draft') {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${policy._id}`, 'error', 'Only draft versions can be published.'));
    }

    await PrivacyPolicy.updateMany(
      {
        slug: COOKIE_POLICY_SLUG,
        status: 'published',
        isCurrent: true
      },
      {
        $set: { isCurrent: false }
      },
      { session }
    );

    const now = new Date();
    policy.status = 'published';
    policy.isCurrent = true;
    policy.effectiveDate = now;
    policy.publishedAt = now;
    if (policy.contentMode === 'rich') {
      // Preserve rich editor structure on publish so public page matches preview.
      policy.contentHtml = sanitizeRichPolicyHtml(policy.contentHtml || '');
      if (!policy.contentHtml) {
        policy.contentHtml = buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '');
      }
    } else {
      policy.contentHtml = buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '');
    }
    policy.publishedBy = getAdminActor(req);
    policy.updatedBy = getAdminActor(req);

    await policy.save({ session });
    await session.commitTransaction();

    return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'success', `Version ${policy.versionNumber} is now live.`));
  } catch (error) {
    await session.abortTransaction();
    return renderServerError(res, error, 'An error occurred while publishing the cookie policy draft.');
  } finally {
    session.endSession();
  }
};

exports.archiveCookiePolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Invalid cookie policy version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id);
    if (!policy) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (policy.slug !== COOKIE_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (policy.isCurrent) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Current live cookie policy cannot be archived.'));
    }

    policy.status = 'archived';
    policy.updatedBy = getAdminActor(req);

    await policy.save();

    return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'success', `Version ${policy.versionNumber} archived.`));
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while archiving the cookie policy version.');
  }
};
