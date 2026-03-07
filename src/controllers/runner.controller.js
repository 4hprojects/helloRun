const User = require('../models/User');
const { getCountries, isValidCountryCode, normalizeCountryCode } = require('../utils/country');
const { getRunnerRegistrations, buildRunnerDashboardData } = require('../services/runner-data.service');
const { getRunnerPerformanceSnapshot } = require('../services/submission.service');
const {
  searchRunningGroups,
  getTopRunningGroups,
  getCurrentRunnerGroup,
  getRunningGroupBySlug,
  getRunningGroupActivity,
  getRecentRunnerGroupActivity,
  createRunningGroup: createRunningGroupService,
  joinRunningGroup: joinRunningGroupService,
  leaveRunningGroup: leaveRunningGroupService
} = require('../services/running-group.service');
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} = require('../services/notification.service');

const countries = getCountries();

exports.getDashboard = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const groupQuery = String(req.query.groupQ || '').trim().slice(0, 80);
    const dashboardFilters = getDashboardFilters(req.query);
    const [runningGroups, registrations, topGroups, searchedGroups, currentRunningGroup, recentGroupActivity, performanceSnapshot] = await Promise.all([
      getRunningGroupSuggestions(),
      getRunnerRegistrations(user._id),
      getTopRunningGroups(8),
      groupQuery ? searchRunningGroups(groupQuery, { limit: 10 }) : Promise.resolve([]),
      getCurrentRunnerGroup(user),
      getRecentRunnerGroupActivity(user, 4),
      getRunnerPerformanceSnapshot(user._id, {
        recentLimit: 8,
        resultStatus: dashboardFilters.resultStatus
      })
    ]);
    const dashboardData = buildRunnerDashboardData(registrations);
    const mergedActivity = mergeRunnerActivity(
      dashboardData.activity,
      recentGroupActivity,
      performanceSnapshot.recentActivity
    );
    const upcomingCards = dashboardData.upcoming
      .filter((item) => matchesModeFilter(item, dashboardFilters.eventMode))
      .slice(0, 5)
      .map(normalizeRegistrationCard);
    const pastCards = dashboardData.past
      .filter((item) => matchesModeFilter(item, dashboardFilters.eventMode))
      .slice(0, 5)
      .map(normalizeRegistrationCard);
    const profileCompleteness = getProfileCompleteness(getRunnerProfileFormData(user));

    return res.render('runner/dashboard', {
      user,
      userName: user.firstName,
      countries,
      errors: {},
      message: getRunnerProfileMessage(req.query),
      profileData: getRunnerProfileFormData(user),
      runningGroups,
      runningGroupFeature: {
        query: groupQuery,
        searchResults: searchedGroups,
        topGroups,
        currentGroup: currentRunningGroup
      },
      profileCompleteness,
      dashboardFilters,
      cards: {
        upcoming: upcomingCards,
        past: pastCards,
        activity: mergedActivity.slice(0, 8).map((item) => ({
          ...item,
          atLabel: formatDateTime(item.at)
        })),
        certificates: (performanceSnapshot.recentCertificates || []).map((item) => ({
          ...item,
          issuedAtLabel: formatDateTime(item.issuedAt)
        })),
        results: (performanceSnapshot.recentSubmissions || []).map((item) => ({
          ...item,
          submittedAtLabel: formatDateTime(item.submittedAt),
          reviewedAtLabel: formatDateTime(item.reviewedAt)
        }))
      },
      stats: dashboardData.stats,
      submissionStats: performanceSnapshot.counts || { total: 0, submitted: 0, approved: 0, rejected: 0, certificates: 0 },
      performanceStats: performanceSnapshot.metrics || {
        totalDistanceKm: 0,
        completedEvents: 0,
        fastestElapsedMs: 0,
        fastestElapsedLabel: ''
      },
      personalBest: performanceSnapshot.personalBest || null
    });
  } catch (error) {
    console.error('Runner dashboard load error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your dashboard.'
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const formData = getRunnerProfileFormData(req.body);
    const errors = validateRunnerProfileForm(formData);
    const dashboardFilters = getDashboardFilters(req.query);

    if (Object.keys(errors).length > 0) {
      const [runningGroups, registrations, topGroups, currentRunningGroup, recentGroupActivity, performanceSnapshot] = await Promise.all([
        getRunningGroupSuggestions(),
        getRunnerRegistrations(user._id),
        getTopRunningGroups(8),
        getCurrentRunnerGroup(user),
        getRecentRunnerGroupActivity(user, 4),
        getRunnerPerformanceSnapshot(user._id, {
          recentLimit: 8,
          resultStatus: dashboardFilters.resultStatus
        })
      ]);
      const dashboardData = buildRunnerDashboardData(registrations);
      const mergedActivity = mergeRunnerActivity(
        dashboardData.activity,
        recentGroupActivity,
        performanceSnapshot.recentActivity
      );
      const upcomingCards = dashboardData.upcoming
        .filter((item) => matchesModeFilter(item, dashboardFilters.eventMode))
        .slice(0, 5)
        .map(normalizeRegistrationCard);
      const pastCards = dashboardData.past
        .filter((item) => matchesModeFilter(item, dashboardFilters.eventMode))
        .slice(0, 5)
        .map(normalizeRegistrationCard);
      const profileCompleteness = getProfileCompleteness(formData);

      return res.status(400).render('runner/dashboard', {
        user,
        userName: user.firstName,
        countries,
        errors,
        message: null,
        profileData: formData,
        runningGroups,
        runningGroupFeature: {
          query: '',
          searchResults: [],
          topGroups,
          currentGroup: currentRunningGroup
        },
        profileCompleteness,
        dashboardFilters,
        cards: {
          upcoming: upcomingCards,
          past: pastCards,
          activity: mergedActivity.slice(0, 8).map((item) => ({
            ...item,
            atLabel: formatDateTime(item.at)
          })),
          certificates: (performanceSnapshot.recentCertificates || []).map((item) => ({
            ...item,
            issuedAtLabel: formatDateTime(item.issuedAt)
          })),
          results: (performanceSnapshot.recentSubmissions || []).map((item) => ({
            ...item,
            submittedAtLabel: formatDateTime(item.submittedAt),
            reviewedAtLabel: formatDateTime(item.reviewedAt)
          }))
        },
        stats: dashboardData.stats,
        submissionStats: performanceSnapshot.counts || { total: 0, submitted: 0, approved: 0, rejected: 0, certificates: 0 },
        performanceStats: performanceSnapshot.metrics || {
          totalDistanceKm: 0,
          completedEvents: 0,
          fastestElapsedMs: 0,
          fastestElapsedLabel: ''
        },
        personalBest: performanceSnapshot.personalBest || null
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
    user.runningGroup = formData.runningGroup;
    await user.save();

    return res.redirect('/runner/dashboard?type=success&msg=Profile%20updated%20successfully.');
  } catch (error) {
    console.error('Runner profile update error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while updating your profile.'
    });
  }
};

exports.createRunningGroup = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const returnTo = getSafeRunnerReturnTo(req.body.returnTo);
    const name = String(req.body.name || '');
    const description = String(req.body.description || '');
    await createRunningGroupService({ user, name, description });
    return res.redirect(`${returnTo}?type=success&msg=Running%20group%20created%20and%20joined.`);
  } catch (error) {
    const returnTo = getSafeRunnerReturnTo(req.body.returnTo);
    return res.redirect(`${returnTo}?type=error&msg=${encodeURIComponent(error.message || 'Unable to create running group.')}`);
  }
};

exports.joinRunningGroup = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const returnTo = getSafeRunnerReturnTo(req.body.returnTo);
    const groupId = String(req.body.groupId || '');
    const result = await joinRunningGroupService({ user, groupId });
    const message = result.alreadyMember
      ? 'You are already a member of this running group.'
      : 'Joined running group successfully.';
    return res.redirect(`${returnTo}?type=success&msg=${encodeURIComponent(message)}`);
  } catch (error) {
    const returnTo = getSafeRunnerReturnTo(req.body.returnTo);
    return res.redirect(`${returnTo}?type=error&msg=${encodeURIComponent(error.message || 'Unable to join running group.')}`);
  }
};

exports.leaveRunningGroup = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const returnTo = getSafeRunnerReturnTo(req.body.returnTo);
    const result = await leaveRunningGroupService({ user });
    const message = result.hadGroup
      ? 'You left your running group.'
      : 'You are not currently in a running group.';
    return res.redirect(`${returnTo}?type=success&msg=${encodeURIComponent(message)}`);
  } catch (error) {
    const returnTo = getSafeRunnerReturnTo(req.body.returnTo);
    return res.redirect(`${returnTo}?type=error&msg=${encodeURIComponent(error.message || 'Unable to leave running group.')}`);
  }
};

exports.getRunningGroupDetail = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const slug = String(req.params.slug || '').trim().toLowerCase();
    const [group, currentRunningGroup] = await Promise.all([getRunningGroupBySlug(slug), getCurrentRunnerGroup(user)]);
    if (!group) {
      return res.status(404).render('error', {
        title: 'Group Not Found',
        status: 404,
        message: 'The running group you requested was not found.'
      });
    }

    const activity = await getRunningGroupActivity(group._id, 20);

    return res.render('runner/group-detail', {
      user,
      userName: user.firstName,
      message: getRunnerProfileMessage(req.query),
      group,
      activity: activity.map((item) => ({
        ...item,
        atLabel: formatDateTime(item.createdAt)
      })),
      membership: {
        isMember: normalizeGroupName(user.runningGroup) === normalizeGroupName(group.name),
        currentGroupName: currentRunningGroup?.name || ''
      }
    });
  } catch (error) {
    console.error('Running group detail load error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading running group details.'
    });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const page = normalizePositiveInt(req.query.page, 1);
    const unreadOnly = String(req.query.unread || '').trim() === '1';
    const notifications = await getUserNotifications(user._id, {
      page,
      limit: 20,
      unreadOnly
    });

    return res.render('runner/notifications', {
      title: 'Notifications - helloRun',
      user,
      message: getRunnerProfileMessage(req.query),
      notifications: {
        ...notifications,
        unreadOnly,
        items: notifications.items.map((item) => ({
          ...item,
          createdAtLabel: formatDateTime(item.createdAt),
          isRead: Boolean(item.readAt)
        }))
      }
    });
  } catch (error) {
    console.error('Runner notifications load error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading notifications.'
    });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const returnTo = getSafeRunnerReturnTo(req.body.returnTo || '/runner/notifications');
    await markNotificationAsRead(user._id, req.params.notificationId);
    return res.redirect(returnTo);
  } catch (error) {
    const returnTo = getSafeRunnerReturnTo(req.body.returnTo || '/runner/notifications');
    return res.redirect(`${returnTo}?type=error&msg=${encodeURIComponent('Unable to update notification state.')}`);
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const returnTo = getSafeRunnerReturnTo(req.body.returnTo || '/runner/notifications');
    await markAllNotificationsAsRead(user._id);
    return res.redirect(`${returnTo}?type=success&msg=${encodeURIComponent('All notifications marked as read.')}`);
  } catch (error) {
    const returnTo = getSafeRunnerReturnTo(req.body.returnTo || '/runner/notifications');
    return res.redirect(`${returnTo}?type=error&msg=${encodeURIComponent('Unable to update notification state.')}`);
  }
};

function normalizeRegistrationCard(registration) {
  return {
    id: String(registration._id),
    confirmationCode: registration.confirmationCode || '',
    title: registration.eventId?.title || 'Event unavailable',
    slug: registration.eventId?.slug || '',
    startAtLabel: formatDateTime(registration.eventId?.eventStartAt),
    distance: registration.raceDistance || 'N/A',
    mode: registration.participationMode || 'N/A',
    status: registration.status || 'N/A',
    paymentStatus: registration.paymentStatus || 'N/A',
    isUnpaid: registration.paymentStatus === 'unpaid' || registration.paymentStatus === 'proof_rejected'
  };
}

function getProfileCompleteness(profileData) {
  const required = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'country', label: 'Country' },
    { key: 'dateOfBirth', label: 'Date of Birth' },
    { key: 'gender', label: 'Gender' },
    { key: 'emergencyContactName', label: 'Emergency Contact Name' },
    { key: 'emergencyContactNumber', label: 'Emergency Contact Number' }
  ];

  const missingFields = required
    .filter((item) => !String(profileData[item.key] || '').trim())
    .map((item) => item.label);

  const completedCount = required.length - missingFields.length;
  const percent = Math.round((completedCount / required.length) * 100);

  return {
    requiredCount: required.length,
    completedCount,
    percent,
    missingFields
  };
}

function getRunnerProfileMessage(query) {
  const msg = typeof query.msg === 'string' ? query.msg.trim() : '';
  if (!msg) return null;
  return {
    type: query.type === 'error' ? 'error' : 'success',
    text: msg.slice(0, 200)
  };
}

function formatDateForInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const utcYear = date.getUTCFullYear();
  const utcMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const utcDay = String(date.getUTCDate()).padStart(2, '0');
  return `${utcYear}-${utcMonth}-${utcDay}`;
}

function formatDateTime(value) {
  if (!value) return 'TBA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBA';
  return date.toLocaleString('en-US');
}

function getRunnerProfileFormData(body = {}) {
  return {
    firstName: String(body.firstName || '').trim(),
    lastName: String(body.lastName || '').trim(),
    mobile: String(body.mobile || '').trim(),
    country: normalizeCountryCode(body.country),
    dateOfBirth: formatDateForInput(body.dateOfBirth),
    gender: String(body.gender || '').trim(),
    emergencyContactName: String(body.emergencyContactName || '').trim(),
    emergencyContactNumber: String(body.emergencyContactNumber || '').trim(),
    runningGroup: String(body.runningGroup || '').trim()
  };
}

function validateRunnerProfileForm(formData) {
  const errors = {};
  const genderValues = new Set(['', 'male', 'female', 'non_binary', 'prefer_not_to_say']);

  if (!formData.firstName || formData.firstName.length < 2 || formData.firstName.length > 60) {
    errors.firstName = 'First name must be 2-60 characters.';
  }
  if (!formData.lastName || formData.lastName.length < 2 || formData.lastName.length > 60) {
    errors.lastName = 'Last name must be 2-60 characters.';
  }
  if (formData.mobile && !/^[\d\s\-()+]{7,25}$/.test(formData.mobile)) {
    errors.mobile = 'Enter a valid mobile number.';
  }
  if (formData.country && !isValidCountryCode(formData.country)) {
    errors.country = 'Select a valid country.';
  }
  if (formData.dateOfBirth) {
    const dobDate = new Date(`${formData.dateOfBirth}T00:00:00.000Z`);
    if (Number.isNaN(dobDate.getTime())) {
      errors.dateOfBirth = 'Enter a valid date of birth.';
    } else if (dobDate > new Date()) {
      errors.dateOfBirth = 'Date of birth cannot be in the future.';
    }
  }
  if (!genderValues.has(formData.gender)) {
    errors.gender = 'Select a valid gender option.';
  }
  if (formData.emergencyContactName && formData.emergencyContactName.length > 120) {
    errors.emergencyContactName = 'Emergency contact name must be 120 characters or less.';
  }
  if (formData.emergencyContactNumber && !/^[\d\s\-()+]{7,25}$/.test(formData.emergencyContactNumber)) {
    errors.emergencyContactNumber = 'Enter a valid emergency contact number.';
  }
  if (formData.runningGroup.length > 120) {
    errors.runningGroup = 'Running group must be 120 characters or less.';
  }

  return errors;
}

function normalizeGroupName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

function mergeRunnerActivity(registrationActivity = [], groupActivity = [], submissionActivity = []) {
  const normalizedRegistration = (registrationActivity || []).map((item) => ({
    type: 'registration',
    at: item.at,
    eventTitle: item.eventTitle,
    confirmationCode: item.confirmationCode
  }));

  return normalizedRegistration
    .concat(groupActivity || [])
    .concat(submissionActivity || [])
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
}

function matchesModeFilter(registration, mode) {
  if (!mode) return true;
  return String(registration?.participationMode || '').trim().toLowerCase() === mode;
}

function getDashboardFilters(query = {}) {
  return {
    eventMode: normalizeDashboardMode(query.eventMode),
    resultStatus: normalizeDashboardResultStatus(query.resultStatus)
  };
}

function normalizeDashboardMode(value) {
  const safe = String(value || '').trim().toLowerCase();
  if (safe === 'virtual' || safe === 'onsite') {
    return safe;
  }
  return '';
}

function normalizeDashboardResultStatus(value) {
  const safe = String(value || '').trim().toLowerCase();
  if (safe === 'submitted' || safe === 'approved' || safe === 'rejected') {
    return safe;
  }
  return '';
}

function normalizePositiveInt(input, fallback) {
  const value = Number.parseInt(input, 10);
  if (Number.isInteger(value) && value > 0) return value;
  return fallback;
}

function getSafeRunnerReturnTo(value) {
  const raw = String(value || '').trim();
  if (!raw) return '/runner/dashboard';
  if (!raw.startsWith('/runner/')) return '/runner/dashboard';
  if (raw.includes('://')) return '/runner/dashboard';
  return raw;
}

async function getRunnerFromSession(req) {
  if (!req.session.userId) {
    return null;
  }
  const user = await User.findById(req.session.userId);
  if (!user || user.role !== 'runner') {
    return null;
  }
  return user;
}

async function getRunningGroupSuggestions() {
  const groups = await User.distinct('runningGroup', { runningGroup: { $exists: true, $ne: '' } });
  return groups
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 50);
}
