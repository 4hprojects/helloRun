const User = require('../models/User');
const Submission = require('../models/Submission');
const passwordService = require('../services/password.service');
const { getCountries, isValidCountryCode, normalizeCountryCode } = require('../utils/country');
const {
  getRunnerRegistrations,
  getRunnerEventProgressCards,
  buildRunnerDashboardData
} = require('../services/runner-data.service');
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
const {
  getRunnerProfileCompleteness,
  syncProfileCompletionNotification
} = require('../services/profile-completion.service');
const {
  getRunnerEarnedBadges,
  getRunnerPointsSummary,
  setFeaturedRunnerBadge
} = require('../services/achievement.service');
const { getRunnerBadgeProgress, getRunnerNextMilestones } = require('../services/badge-progress.service');
const stravaService = require('../services/strava.service');

const countries = getCountries();

exports.getDashboard = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const isFirstLogin = req.session.firstLogin === true || req.query.welcome === '1';
    if (req.session.firstLogin) delete req.session.firstLogin;

    const profileCompleteness = getRunnerProfileCompleteness(user);
    const dashboardViewData = await buildRunnerDashboardViewData(user, req);
    return res.render('runner/dashboard', {
      user,
      userName: user.firstName,
      errors: {},
      message: getRunnerProfileMessage(req.query),
      isFirstLogin,
      profileCompleteness,
      ...dashboardViewData
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
      recentLimit: 2,
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
    const formData = getRunnerProfileFormData(req.body);
    const errors = validateRunnerProfileForm(formData);

    if (Object.keys(errors).length > 0) {
      const dashboardViewData = await buildRunnerDashboardViewData(user, req);
      return res.status(400).render('runner/dashboard', {
        user,
        userName: user.firstName,
        errors,
        message: null,
        ...dashboardViewData
      });
    }

    user.firstName = formData.firstName;
    user.lastName = formData.lastName;
    user.displayName = formData.displayName;
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
    await syncProfileCompletionNotification(user);

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
  return res.redirect('/runner/profile?modal=password#account');
};

exports.getDashboardRefresh = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const viewData = await buildRunnerDashboardViewData(user, req);
    const fragmentNames = [
      'summary',
      'hero-highlights',
      'upcoming',
      'badges',
      'badge-progress',
      'event-progress',
      'result-submissions',
      'past',
      'activity',
      'certificates',
      'progress-stats',
      'running-groups'
    ];
    const rendered = await Promise.all(fragmentNames.map(async (name) => [
      name.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase()),
      await renderViewFragment(res, `runner/partials/dashboard-${name}`, viewData)
    ]));

    return res.json({
      success: true,
      refreshedAt: new Date().toISOString(),
      fragments: Object.fromEntries(rendered)
    });
  } catch (error) {
    console.error('Runner dashboard refresh error:', error);
    return res.status(500).json({ success: false, message: 'Unable to refresh dashboard right now.' });
  }
};

exports.getProfilePage = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    return res.render('runner/profile', await buildRunnerProfileViewData(user, req));
  } catch (error) {
    console.error('Runner profile page load error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your profile page.'
    });
  }
};

exports.getRunnerBadges = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const badges = await getRunnerEarnedBadges(user._id, {
      limit: normalizePositiveInt(req.query.limit, 30)
    });

    return res.json({ success: true, badges });
  } catch (error) {
    console.error('Runner badges load error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load badges.' });
  }
};

exports.getRunnerBadgeProgress = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const progress = await getRunnerBadgeProgress(user._id, {
      limit: normalizePositiveInt(req.query.limit, 30)
    });

    return res.json({ success: true, progress });
  } catch (error) {
    console.error('Runner badge progress load error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load badge progress.' });
  }
};

exports.updateFeaturedBadge = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const userBadgeId = String(req.body.userBadgeId || '').trim();
    await setFeaturedRunnerBadge(user._id, userBadgeId);
    return res.redirect('/runner/profile?type=success&msg=Featured%20badge%20updated.#badges');
  } catch (error) {
    console.error('Featured badge update error:', error);
    return res.redirect('/runner/profile?type=error&msg=Unable%20to%20update%20featured%20badge.#badges');
  }
};

exports.updateProfileIdentity = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const formData = getRunnerProfileFormData({
      ...user.toObject(),
      ...req.body
    });
    const errors = validateRunnerProfileIdentityForm(formData);
    if (errors.firstName) {
      return res.redirect(`/runner/profile?type=error&msg=${encodeURIComponent(errors.firstName)}#identity`);
    }
    if (errors.lastName) {
      return res.redirect(`/runner/profile?type=error&msg=${encodeURIComponent(errors.lastName)}#identity`);
    }
    if (errors.displayName) {
      return res.redirect(`/runner/profile?type=error&msg=${encodeURIComponent(errors.displayName)}#identity`);
    }
    if (errors.dateOfBirth) {
      return res.redirect(`/runner/profile?type=error&msg=${encodeURIComponent(errors.dateOfBirth)}#identity`);
    }
    if (errors.gender) {
      return res.redirect(`/runner/profile?type=error&msg=${encodeURIComponent(errors.gender)}#identity`);
    }

    user.firstName = formData.firstName;
    user.lastName = formData.lastName;
    user.displayName = formData.displayName;
    user.dateOfBirth = formData.dateOfBirth ? new Date(`${formData.dateOfBirth}T00:00:00.000Z`) : null;
    user.gender = formData.gender;
    await user.save();
    await syncProfileCompletionNotification(user);

    return res.redirect('/runner/profile?type=success&msg=Identity%20details%20updated.#identity');
  } catch (error) {
    console.error('Runner profile identity update error:', error);
    return res.redirect('/runner/profile?type=error&msg=Unable%20to%20update%20identity%20details.#identity');
  }
};

exports.updateProfileContact = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const mobile = String(req.body.mobile || '').trim();
    const country = normalizeCountryCode(req.body.country);
    if (mobile && !/^[\d\s\-()+]{7,25}$/.test(mobile)) {
      return res.redirect('/runner/profile?type=error&msg=Enter%20a%20valid%20mobile%20number.#contact');
    }
    if (country && !isValidCountryCode(country)) {
      return res.redirect('/runner/profile?type=error&msg=Select%20a%20valid%20country.#contact');
    }

    user.mobile = mobile;
    user.country = country;
    await user.save();
    await syncProfileCompletionNotification(user);
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
    await syncProfileCompletionNotification(user);
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
      return res.status(429).render('runner/profile', await buildRunnerProfileViewData(user, req, {
        message: null,
        passwordMessage: {
          type: 'error',
          text: `Too many password update attempts. Try again in ${throttle.retryMinutes} minute(s).`
        },
        passwordErrors: {},
        openPasswordModal: true
      }));
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
      return res.status(400).render('runner/profile', await buildRunnerProfileViewData(user, req, {
        message: null,
        passwordErrors: errors,
        openPasswordModal: true
      }));
    }

    user.passwordHash = await passwordService.hashPassword(newPassword);
    await user.save();
    registerPasswordUpdateAttempt(req.session, true);

    return res.redirect('/runner/profile?type=success&msg=Password%20updated%20successfully.#account');
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
      title: 'Create Running Group - HelloRun',
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
      title: 'Running Groups - HelloRun',
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
      title: 'Notifications - HelloRun',
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

async function buildRunnerDashboardViewData(user, req) {
  const locale = getRequestLocale(req);
  const dashboardFilters = getDashboardFilters(req.query);
  const [registrations, currentRunningGroups, recentGroupActivity, performanceSnapshot, recentBadges, badgeProgress, badgePointsSummary, nextMilestones] = await Promise.all([
    getRunnerRegistrations(user._id),
    getCurrentRunnerGroups(user),
    getRecentRunnerGroupActivity(user, 4),
    getRunnerPerformanceSnapshot(user._id, {
      recentLimit: 8,
      resultStatus: dashboardFilters.resultStatus
    }),
    getRunnerEarnedBadges(user._id, { limit: 4 }).catch(() => []),
    getRunnerBadgeProgress(user._id, { limit: 4 }).catch(() => []),
    getRunnerPointsSummary(user._id).catch(() => ({ totalPoints: 0, badgeCount: 0 })),
    getRunnerNextMilestones(user._id).catch(() => ({ nextGlobalMilestone: null, challengesInProgress: [] }))
  ]);
  const dashboardData = buildRunnerDashboardData(registrations);
  const eventProgressCards = await getRunnerEventProgressCards(registrations);
  const mergedActivity = mergeRunnerActivity(
    dashboardData.activity,
    recentGroupActivity,
    performanceSnapshot.recentActivity
  );

  return {
    dashboardFilters,
    runningGroupFeature: {
      currentGroup: currentRunningGroups[0] || null,
      currentGroups: currentRunningGroups
    },
    cards: {
      upcoming: dashboardData.upcoming.slice(0, 5).map(normalizeRegistrationCard),
      past: dashboardData.past.slice(0, 5).map(normalizeRegistrationCard),
      activity: mergedActivity.slice(0, 8).map((item) => ({
        ...item,
        atLabel: formatDateTime(item.at, locale),
        atRelativeLabel: formatRelativeTime(item.at)
      })),
      certificates: (performanceSnapshot.recentCertificates || []).map((item) => ({
        ...item,
        issuedAtLabel: formatDateTime(item.issuedAt, locale)
      })),
      results: formatRunnerResultSubmissions(performanceSnapshot, locale),
      eventProgress: formatRunnerEventProgressCards(eventProgressCards, locale).slice(0, 6),
      badges: recentBadges,
      badgeProgress
    },
    badgePointsSummary,
    nextMilestones,
    stats: dashboardData.stats,
    submissionStats: performanceSnapshot.counts || { total: 0, submitted: 0, approved: 0, rejected: 0, certificates: 0 },
    performanceStats: performanceSnapshot.metrics || {
      totalDistanceKm: 0,
      completedEvents: 0,
      fastestElapsedMs: 0,
      fastestElapsedLabel: ''
    },
    personalBest: performanceSnapshot.personalBest || null
  };
}

function renderViewFragment(res, view, locals) {
  return new Promise((resolve, reject) => {
    res.render(view, locals, (error, html) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(html);
    });
  });
}

function getProfileCompleteness(profileData) {
  return getRunnerProfileCompleteness({ ...profileData, role: 'runner' });
}

async function buildRunnerProfileViewData(user, req, overrides = {}) {
  const profileData = getRunnerProfileFormData(user);
  const profileCompleteness = getProfileCompleteness(profileData);
  const selectedCountry = (countries || []).find((item) => item.code === profileData.country);
  const [stravaConnection, badges, badgeProgress, badgePointsSummary] = await Promise.all([
    stravaService.getConnectionSummary(user._id).catch(() => ({ connected: false })),
    getRunnerEarnedBadges(user._id, { limit: 30 }).catch(() => []),
    getRunnerBadgeProgress(user._id, { limit: 30 }).catch(() => []),
    getRunnerPointsSummary(user._id).catch(() => ({ totalPoints: 0, badgeCount: 0 }))
  ]);

  const finisherBadgeTypes = new Set(['finisher', 'distance_finisher', 'mode_finisher']);
  const submissionIds = badges
    .filter((b) => finisherBadgeTypes.has(b.badgeType) && b.mongoSubmissionId)
    .map((b) => b.mongoSubmissionId);
  const certifiedSubmissionIds = await (async () => {
    if (!submissionIds.length) return new Set();
    const docs = await Submission.find(
      { _id: { $in: submissionIds }, 'certificate.url': { $exists: true, $ne: '' } },
      { _id: 1 }
    ).lean().catch(() => []);
    return new Set(docs.map((d) => String(d._id)));
  })();

  return {
    title: 'Personal Information - HelloRun',
    user,
    userName: user.firstName,
    message: getRunnerProfileMessage(req.query),
    profileData,
    profileCompleteness,
    countries,
    selectedCountryName: selectedCountry?.name || 'Not set',
    stravaConnection,
    badges,
    badgeProgress,
    badgePointsSummary,
    certifiedSubmissionIds,
    publicBadgeCollectionPath: user.userId ? `/runners/${encodeURIComponent(user.userId)}/badges` : '',
    passwordErrors: {},
    passwordMessage: null,
    openPasswordModal: req.query.modal === 'password',
    ...overrides
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
    displayName: String(body.displayName || '').trim(),
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
  const displayNameError = validateDisplayName(formData.displayName);
  if (displayNameError) {
    errors.displayName = displayNameError;
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

function validateRunnerProfileIdentityForm(formData) {
  const errors = {};
  const genderValues = new Set(['', 'male', 'female', 'non_binary', 'prefer_not_to_say']);

  if (!formData.firstName || formData.firstName.length < 2 || formData.firstName.length > 60) {
    errors.firstName = 'First name must be 2-60 characters.';
  }
  if (!formData.lastName || formData.lastName.length < 2 || formData.lastName.length > 60) {
    errors.lastName = 'Last name must be 2-60 characters.';
  }
  const displayNameError = validateDisplayName(formData.displayName);
  if (displayNameError) {
    errors.displayName = displayNameError;
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

  return errors;
}

function validateDisplayName(value) {
  const displayName = String(value || '').trim();
  if (!displayName) return '';
  if (displayName.length < 2 || displayName.length > 60) {
    return 'Display name must be 2-60 characters.';
  }
  if (!/^[A-Za-z0-9 ._-]+$/.test(displayName)) {
    return 'Display name can use letters, numbers, spaces, dots, hyphens, and underscores only.';
  }
  if (displayName.includes('@') || /^https?:\/\//i.test(displayName) || /^\+?[\d\s\-()]{7,}$/.test(displayName)) {
    return 'Display name cannot be an email, URL, or phone number.';
  }
  return '';
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

function formatRunnerEventProgressCards(cards = [], locale) {
  return (cards || []).map((item) => ({
    ...item,
    eventStartAtLabel: formatDateTime(item.eventStartAt, locale),
    submittedAtLabel: formatDateTime(item.submittedAt, locale),
    reviewedAtLabel: formatDateTime(item.reviewedAt, locale),
    submittedAtRelativeLabel: formatRelativeTime(item.submittedAt),
    reviewedAtRelativeLabel: formatRelativeTime(item.reviewedAt)
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
      title: 'Submitted Entries - HelloRun',
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
      title: `Entry – ${submission.eventTitle} - HelloRun`,
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
