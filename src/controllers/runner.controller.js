const User = require('../models/User');
const passwordService = require('../services/password.service');
const { getCountries, isValidCountryCode, normalizeCountryCode } = require('../utils/country');
const { getRunnerRegistrations, buildRunnerDashboardData } = require('../services/runner-data.service');
const { getRunnerPerformanceSnapshot, getRunnerEligibleSubmissionRegistrations } = require('../services/submission.service');
const {
  listRunnerSubmissions,
  getRunnerSubmissionDetail,
  getRunnerSubmissionProof,
  getRunnerSubmissionCounts
} = require('../services/runner-submissions.service');
const uploadService = require('../services/upload.service');
const {
  searchRunningGroups,
  getTopRunningGroups,
  getCurrentRunnerGroup,
  getCurrentRunnerGroups,
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
    const [registrations, topGroups, searchedGroups, currentRunningGroups, recentGroupActivity, performanceSnapshot] = await Promise.all([
      getRunnerRegistrations(user._id),
      getTopRunningGroups(8),
      groupQuery ? searchRunningGroups(groupQuery, { limit: 10 }) : Promise.resolve([]),
      getCurrentRunnerGroups(user),
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
    const resultSubmissions = formatRunnerResultSubmissions(performanceSnapshot, locale);

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
        currentGroup: currentRunningGroups[0] || null,
        currentGroups: currentRunningGroups
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
        results: resultSubmissions
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

exports.getDashboardResultSubmissions = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const locale = getRequestLocale(req);
    const groupQuery = String(req.query.groupQ || '').trim().slice(0, 80);
    const dashboardFilters = getDashboardFilters(req.query);
    const performanceSnapshot = await getRunnerPerformanceSnapshot(user._id, {
      recentLimit: 8,
      resultStatus: dashboardFilters.resultStatus
    });

    return res.render('runner/partials/result-submissions-card', {
      selectedResultStatus: dashboardFilters.resultStatus,
      preservedGroupQuery: groupQuery,
      resultCards: formatRunnerResultSubmissions(performanceSnapshot, locale)
    });
  } catch (error) {
    console.error('Runner result submissions partial load error:', error);
    return res.status(500).send('<div class="empty-state"><p class="empty-message">Unable to load result submissions right now.</p></div>');
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
      const [registrations, topGroups, currentRunningGroups, recentGroupActivity, performanceSnapshot] = await Promise.all([
        getRunnerRegistrations(user._id),
        getTopRunningGroups(8),
        getCurrentRunnerGroups(user),
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
          currentGroup: currentRunningGroups[0] || null,
          currentGroups: currentRunningGroups
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
    const sanitizedGroups = normalizeRunnerGroupValues(formData.runningGroups);
    user.runningGroups = sanitizedGroups;
    user.runningGroup = sanitizedGroups[0] || '';
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

    const currentGroups = await getCurrentRunnerGroups(user);
    return res.render('runner/create-group', {
      title: 'Create Running Group - helloRun',
      user,
      userName: user.firstName,
      message: getRunnerProfileMessage(req.query),
      currentGroup: currentGroups[0] || null,
      currentGroups
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
    const [currentGroups, topGroups, searchResults] = await Promise.all([
      getCurrentRunnerGroups(user),
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
        currentGroup: currentGroups[0] || null,
        currentGroups,
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
    const groupId = String(req.body.groupId || '').trim();
    const result = await leaveRunningGroupService({ user, groupId });
    const message = result.hadGroup
      ? 'Running group membership updated.'
      : 'You are not currently in that running group.';
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
        isMember: normalizeRunnerGroupValues(user.runningGroups || user.runningGroup).some(
          (name) => normalizeGroupName(name) === normalizeGroupName(group.name)
        ),
        currentGroupName: currentRunningGroup?.name || '',
        currentGroupNames: normalizeRunnerGroupValues(user.runningGroups || user.runningGroup)
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
  const normalizedGroups = normalizeRunnerGroupValues(body.runningGroups || body.runningGroup);
  return {
    firstName: String(body.firstName || '').trim(),
    lastName: String(body.lastName || '').trim(),
    mobile: String(body.mobile || '').trim(),
    country: normalizeCountryCode(body.country),
    dateOfBirth: formatDateForInput(body.dateOfBirth),
    gender: String(body.gender || '').trim(),
    emergencyContactName: String(body.emergencyContactName || '').trim(),
    emergencyContactNumber: String(body.emergencyContactNumber || '').trim(),
    runningGroups: normalizedGroups,
    runningGroup: normalizedGroups[0] || ''
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
  if (!Array.isArray(formData.runningGroups)) {
    errors.runningGroups = 'Running groups are invalid.';
  } else {
    if (formData.runningGroups.length > 10) {
      errors.runningGroups = 'You can add up to 10 running groups.';
    }
    if (formData.runningGroups.some((item) => String(item || '').trim().length > 120)) {
      errors.runningGroups = 'Each running group must be 120 characters or less.';
    }
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

function normalizeRunnerGroupValues(value) {
  const asArray = Array.isArray(value) ? value : String(value || '').split(',');
  return Array.from(
    new Set(
      asArray
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  ).slice(0, 10);
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

function formatRunnerResultSubmissions(performanceSnapshot, locale) {
  return (performanceSnapshot?.recentSubmissions || []).map((item) => ({
    ...item,
    submittedAtLabel: formatDateTime(item.submittedAt, locale),
    reviewedAtLabel: formatDateTime(item.reviewedAt, locale),
    submittedAtRelativeLabel: formatRelativeTime(item.submittedAt),
    reviewedAtRelativeLabel: formatRelativeTime(item.reviewedAt),
    isPersonalRecord: Boolean(item.isPersonalRecord),
    runType: item.runType || 'run',
    registrationId: String(item.registrationId || '')
  }));
}

exports.getRunnerSubmissionsPage = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const VALID_STATUSES = new Set(['submitted', 'approved', 'rejected']);
    const VALID_ACTIVITY_TYPES = new Set(['run', 'walk', 'hike', 'trail_run']);
    const VALID_SORTS = new Set(['newest', 'oldest', 'eventDate', 'fastest', 'distance']);

    const rawStatus = String(req.query.status || '').trim().toLowerCase();
    const rawActivity = String(req.query.activityType || '').trim().toLowerCase();
    const rawSort = String(req.query.sort || '').trim().toLowerCase();
    const rawPage = Number.parseInt(String(req.query.page || '1'), 10);

    const filters = {
      status: VALID_STATUSES.has(rawStatus) ? rawStatus : '',
      activityType: VALID_ACTIVITY_TYPES.has(rawActivity) ? rawActivity : '',
      q: String(req.query.q || '').trim().slice(0, 100),
      sort: VALID_SORTS.has(rawSort) ? rawSort : 'newest',
      page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
    };

    const [result, counts] = await Promise.all([
      listRunnerSubmissions(user._id, filters),
      getRunnerSubmissionCounts(user._id)
    ]);

    return res.render('runner/submissions', {
      title: 'Submitted Entries - helloRun',
      user,
      userName: user.firstName,
      message: getRunnerProfileMessage(req.query),
      submissions: result.items,
      pagination: {
        page: result.page,
        totalPages: result.totalPages,
        total: result.total
      },
      counts,
      filters
    });
  } catch (error) {
    console.error('Runner submissions page load error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your submitted entries.'
    });
  }
};

exports.getRunnerSubmissionDetailPage = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const submissionId = String(req.params.submissionId || '').trim();
    // Validate ObjectId format before hitting DB
    if (!/^[0-9a-fA-F]{24}$/.test(submissionId)) {
      return res.status(404).render('error', {
        title: 'Not Found',
        status: 404,
        message: 'Submission not found.'
      });
    }

    const submission = await getRunnerSubmissionDetail(user._id, submissionId);

    return res.render('runner/submission-detail', {
      title: `Entry – ${submission.eventTitle} - helloRun`,
      user,
      userName: user.firstName,
      submission
    });
  } catch (error) {
    if (error.statusCode === 403) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        status: 403,
        message: 'You do not have access to this submission.'
      });
    }
    if (error.statusCode === 404) {
      return res.status(404).render('error', {
        title: 'Not Found',
        status: 404,
        message: 'Submission not found.'
      });
    }
    console.error('Runner submission detail load error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading this submission.'
    });
  }
};

exports.getRunnerSubmissionProof = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const submissionId = String(req.params.submissionId || '').trim();
    if (!/^[0-9a-fA-F]{24}$/.test(submissionId)) {
      return res.status(404).render('error', {
        title: 'Not Found',
        status: 404,
        message: 'Proof not found.'
      });
    }

    const proof = await getRunnerSubmissionProof(user._id, submissionId);
    let targetUrl = proof.url;
    const proofKey = proof.key || uploadService.extractObjectKeyFromPublicUrl(proof.url);

    if (proofKey) {
      try {
        targetUrl = await uploadService.getSignedReadUrlFromR2(proofKey, {
          contentDisposition: 'inline',
          contentType: proof.mimeType,
          expiresIn: 300
        });
      } catch (error) {
        console.error('Runner proof signed URL error:', error.message);
      }
    }

    if (!targetUrl || targetUrl.startsWith('data:')) {
      return res.status(404).render('error', {
        title: 'Not Found',
        status: 404,
        message: 'Proof not found.'
      });
    }

    return res.redirect(targetUrl);
  } catch (error) {
    if (error.statusCode === 403) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        status: 403,
        message: 'You do not have access to this proof.'
      });
    }
    if (error.statusCode === 404) {
      return res.status(404).render('error', {
        title: 'Not Found',
        status: 404,
        message: 'Proof not found.'
      });
    }
    console.error('Runner proof access error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading this proof.'
    });
  }
};

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
