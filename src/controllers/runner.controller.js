const User = require('../models/User');
const passwordService = require('../services/password.service');
const { getCountries, isValidCountryCode, normalizeCountryCode } = require('../utils/country');
const { getRunnerRegistrations, buildRunnerDashboardData } = require('../services/runner-data.service');
const { getRunnerPerformanceSnapshot, getRunnerEligibleSubmissionRegistrations } = require('../services/submission.service');
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
    const locale = getRequestLocale(req);

    const groupQuery = String(req.query.groupQ || '').trim().slice(0, 80);
    const dashboardFilters = getDashboardFilters(req.query);
    const [registrations, topGroups, searchedGroups, currentRunningGroup, recentGroupActivity, performanceSnapshot] = await Promise.all([
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
      .slice(0, 5)
      .map(normalizeRegistrationCard);
    const pastCards = dashboardData.past
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
          atLabel: formatDateTime(item.at, locale),
          atRelativeLabel: formatRelativeTime(item.at)
        })),
        certificates: (performanceSnapshot.recentCertificates || []).map((item) => ({
          ...item,
          issuedAtLabel: formatDateTime(item.issuedAt, locale)
        })),
        results: (performanceSnapshot.recentSubmissions || []).map((item) => ({
          ...item,
          submittedAtLabel: formatDateTime(item.submittedAt, locale),
          reviewedAtLabel: formatDateTime(item.reviewedAt, locale),
          submittedAtRelativeLabel: formatRelativeTime(item.submittedAt),
          reviewedAtRelativeLabel: formatRelativeTime(item.reviewedAt)
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
    const locale = getRequestLocale(req);

    const formData = getRunnerProfileFormData(req.body);
    const errors = validateRunnerProfileForm(formData);
    const dashboardFilters = getDashboardFilters(req.query);

    if (Object.keys(errors).length > 0) {
      const [registrations, topGroups, currentRunningGroup, recentGroupActivity, performanceSnapshot] = await Promise.all([
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
        .slice(0, 5)
        .map(normalizeRegistrationCard);
      const pastCards = dashboardData.past
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
            atLabel: formatDateTime(item.at, locale),
            atRelativeLabel: formatRelativeTime(item.at)
          })),
          certificates: (performanceSnapshot.recentCertificates || []).map((item) => ({
            ...item,
            issuedAtLabel: formatDateTime(item.issuedAt, locale)
          })),
          results: (performanceSnapshot.recentSubmissions || []).map((item) => ({
            ...item,
            submittedAtLabel: formatDateTime(item.submittedAt, locale),
            reviewedAtLabel: formatDateTime(item.reviewedAt, locale),
            submittedAtRelativeLabel: formatRelativeTime(item.submittedAt),
            reviewedAtRelativeLabel: formatRelativeTime(item.reviewedAt)
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

exports.getPasswordSettings = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    return res.render('runner/password-settings', {
      user,
      userName: user.firstName,
      message: getRunnerProfileMessage(req.query),
      errors: {},
      hasLocalPassword: Boolean(user.passwordHash)
    });
  } catch (error) {
    console.error('Runner password settings load error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading password settings.'
    });
  }
};

exports.getProfilePage = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const profileData = getRunnerProfileFormData(user);
    const profileCompleteness = getProfileCompleteness(profileData);
    const selectedCountry = (countries || []).find((item) => item.code === profileData.country);

    return res.render('runner/profile', {
      title: 'Personal Information - helloRun',
      user,
      userName: user.firstName,
      message: getRunnerProfileMessage(req.query),
      profileData,
      profileCompleteness,
      selectedCountryName: selectedCountry?.name || 'Not set'
    });
  } catch (error) {
    console.error('Runner profile page load error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your profile page.'
    });
  }
};

exports.updateProfileContact = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const mobile = String(req.body.mobile || '').trim();
    if (mobile && !/^[\d\s\-()+]{7,25}$/.test(mobile)) {
      return res.redirect('/runner/profile?type=error&msg=Enter%20a%20valid%20mobile%20number.#contact');
    }

    user.mobile = mobile;
    await user.save();
    return res.redirect('/runner/profile?type=success&msg=Contact%20details%20updated.#contact');
  } catch (error) {
    console.error('Runner profile contact update error:', error);
    return res.redirect('/runner/profile?type=error&msg=Unable%20to%20update%20contact%20details.#contact');
  }
};

exports.updateProfileEmergency = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const emergencyContactName = String(req.body.emergencyContactName || '').trim();
    const emergencyContactNumber = String(req.body.emergencyContactNumber || '').trim();

    if (emergencyContactName.length > 120) {
      return res.redirect('/runner/profile?type=error&msg=Emergency%20contact%20name%20must%20be%20120%20characters%20or%20less.#emergency');
    }
    if (emergencyContactNumber && !/^[\d\s\-()+]{7,25}$/.test(emergencyContactNumber)) {
      return res.redirect('/runner/profile?type=error&msg=Enter%20a%20valid%20emergency%20contact%20number.#emergency');
    }

    user.emergencyContactName = emergencyContactName;
    user.emergencyContactNumber = emergencyContactNumber;
    await user.save();
    return res.redirect('/runner/profile?type=success&msg=Emergency%20contact%20updated.#emergency');
  } catch (error) {
    console.error('Runner profile emergency update error:', error);
    return res.redirect('/runner/profile?type=error&msg=Unable%20to%20update%20emergency%20contact.#emergency');
  }
};

exports.updatePasswordSettings = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const throttle = checkPasswordUpdateThrottle(req.session);
    if (!throttle.allowed) {
      return res.status(429).render('runner/password-settings', {
        user,
        userName: user.firstName,
        message: {
          type: 'error',
          text: `Too many password update attempts. Try again in ${throttle.retryMinutes} minute(s).`
        },
        errors: {},
        hasLocalPassword: Boolean(user.passwordHash)
      });
    }

    const hasLocalPassword = Boolean(user.passwordHash);
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    const confirmPassword = String(req.body.confirmPassword || '');
    const errors = {};

    if (hasLocalPassword) {
      if (!currentPassword) {
        errors.currentPassword = 'Current password is required.';
      } else {
        const currentMatches = await passwordService.comparePassword(currentPassword, user.passwordHash || '');
        if (!currentMatches) {
          errors.currentPassword = 'Current password is incorrect.';
        }
      }
    }

    if (!newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (!passwordService.validatePassword(newPassword)) {
      errors.newPassword = 'Password must be at least 8 characters with uppercase, lowercase, and number.';
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length) {
      registerPasswordUpdateAttempt(req.session, false);
      return res.status(400).render('runner/password-settings', {
        user,
        userName: user.firstName,
        message: null,
        errors,
        hasLocalPassword
      });
    }

    user.passwordHash = await passwordService.hashPassword(newPassword);
    await user.save();
    registerPasswordUpdateAttempt(req.session, true);

    return res.redirect('/runner/security/password?type=success&msg=Password%20updated%20successfully.');
  } catch (error) {
    console.error('Runner password update error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while updating your password.'
    });
  }
};

exports.unlinkGoogleAuth = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const returnTo = getSafeRunnerReturnTo(req.body.returnTo || '/runner/dashboard');
    if (!user.googleId) {
      return res.redirect(`${returnTo}?type=success&msg=${encodeURIComponent('Google account is already unlinked.')}`);
    }

    if (!user.passwordHash) {
      return res.redirect('/runner/security/password?type=error&msg=Set%20a%20password%20before%20unlinking%20Google%20sign-in.');
    }

    user.googleId = undefined;
    user.authProvider = 'local';
    await user.save();

    return res.redirect(`${returnTo}?type=success&msg=${encodeURIComponent('Google sign-in unlinked successfully.')}`);
  } catch (error) {
    console.error('Unlink Google auth error:', error);
    const returnTo = getSafeRunnerReturnTo(req.body.returnTo || '/runner/dashboard');
    return res.redirect(`${returnTo}?type=error&msg=${encodeURIComponent('Unable to unlink Google sign-in right now.')}`);
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

exports.getCreateRunningGroupPage = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const currentGroup = await getCurrentRunnerGroup(user);
    return res.render('runner/create-group', {
      title: 'Create Running Group - helloRun',
      user,
      userName: user.firstName,
      message: getRunnerProfileMessage(req.query),
      currentGroup
    });
  } catch (error) {
    console.error('Create running group page load error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the create running group page.'
    });
  }
};

exports.getRunningGroupsPage = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const query = String(req.query.q || '').trim().slice(0, 80);
    const [currentGroup, topGroups, searchResults] = await Promise.all([
      getCurrentRunnerGroup(user),
      getTopRunningGroups(10),
      query ? searchRunningGroups(query, { limit: 12 }) : Promise.resolve([])
    ]);

    return res.render('runner/groups', {
      title: 'Running Groups - helloRun',
      user,
      userName: user.firstName,
      message: getRunnerProfileMessage(req.query),
      runningGroups: {
        query,
        currentGroup,
        topGroups,
        searchResults
      }
    });
  } catch (error) {
    console.error('Running groups page load error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading running groups.'
    });
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
    const locale = getRequestLocale(req);

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
        atLabel: formatDateTime(item.createdAt, locale)
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
    const locale = getRequestLocale(req);

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
          createdAtLabel: formatDateTime(item.createdAt, locale),
          createdAtRelativeLabel: formatRelativeTime(item.createdAt),
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

exports.getEligibleResultSubmissionOptions = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const items = await getRunnerEligibleSubmissionRegistrations(user._id, {
      limit: normalizePositiveInt(req.query.limit, 50)
    });

    return res.json({
      success: true,
      items
    });
  } catch (error) {
    console.error('Runner eligible submission options load error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load submission options right now.'
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

function formatDateTime(value, locale = 'en-US') {
  if (!value) return 'TBA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBA';
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    return date.toLocaleString('en-US');
  }
}

function getRequestLocale(req) {
  const header = String(req.headers['accept-language'] || '').trim();
  if (!header) return 'en-US';
  const primary = header.split(',')[0].trim();
  if (!primary) return 'en-US';
  return primary;
}

function checkPasswordUpdateThrottle(session) {
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX_ATTEMPTS = 5;
  const now = Date.now();
  if (!session) return { allowed: true, retryMinutes: 0 };

  const state = session.passwordUpdateThrottle || { windowStartedAt: now, attempts: 0 };
  if ((now - Number(state.windowStartedAt || 0)) > WINDOW_MS) {
    session.passwordUpdateThrottle = { windowStartedAt: now, attempts: 0 };
    return { allowed: true, retryMinutes: 0 };
  }

  if (Number(state.attempts || 0) >= MAX_ATTEMPTS) {
    const retryMs = WINDOW_MS - (now - Number(state.windowStartedAt || now));
    return { allowed: false, retryMinutes: Math.max(1, Math.ceil(retryMs / 60000)) };
  }

  return { allowed: true, retryMinutes: 0 };
}

function registerPasswordUpdateAttempt(session, success) {
  if (!session) return;
  const WINDOW_MS = 15 * 60 * 1000;
  const now = Date.now();
  const state = session.passwordUpdateThrottle || { windowStartedAt: now, attempts: 0 };

  if ((now - Number(state.windowStartedAt || 0)) > WINDOW_MS) {
    session.passwordUpdateThrottle = { windowStartedAt: now, attempts: success ? 0 : 1 };
    return;
  }

  if (success) {
    session.passwordUpdateThrottle = { windowStartedAt: now, attempts: 0 };
    return;
  }

  session.passwordUpdateThrottle = {
    windowStartedAt: Number(state.windowStartedAt || now),
    attempts: Number(state.attempts || 0) + 1
  };
}

function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const absMs = Math.abs(diffMs);
  if (absMs < 60 * 1000) return 'just now';

  const minutes = Math.floor(absMs / (60 * 1000));
  if (minutes < 60) return diffMs >= 0 ? `${minutes}m ago` : `in ${minutes}m`;

  const hours = Math.floor(absMs / (60 * 60 * 1000));
  if (hours < 24) return diffMs >= 0 ? `${hours}h ago` : `in ${hours}h`;

  const days = Math.floor(absMs / (24 * 60 * 60 * 1000));
  return diffMs >= 0 ? `${days}d ago` : `in ${days}d`;
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

function getDashboardFilters(query = {}) {
  return {
    resultStatus: normalizeDashboardResultStatus(query.resultStatus)
  };
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
