const User = require('../models/User');
const logger = require('../utils/logger');
const Submission = require('../models/Submission');
const Event = require('../models/Event');
const passwordService = require('../services/password.service');
const { getCountries, isValidCountryCode, normalizeCountryCode } = require('../utils/country');
const {
  getTimeZoneOptions,
  normalizeTimeZone
} = require('../utils/timezone');
const { getCloudflareCountrySuggestion } = require('../utils/location-suggestion');
const {
  getRunnerRegistrations,
  getRunnerEventProgressCards,
  buildRunnerDashboardData,
  buildRunnerDashboardPresentation,
  splitEventProgressCards,
  sortEventProgressCardsByRecency,
  buildCertificateShareUrls
} = require('../services/runner-data.service');
const {
  getRunnerPerformanceSnapshot,
  getRunnerEligibleSubmissionRegistrationState
} = require('../services/submission.service');
const {
  listRunnerSubmissions,
  normalizeListOptions,
  buildRunnerSubmissionListPresentation,
  getRunnerSubmissionDetail,
  getRunnerSubmissionProof,
  getRunnerSubmissionCounts
} = require('../services/runner-submissions.service');
const uploadService = require('../services/upload.service');
const {
  searchRunningGroups,
  getTopRunningGroups,
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
  markAllNotificationsAsRead,
  archiveNotification,
  restoreNotification,
  archiveAllReadNotifications,
  normalizeNotificationView,
  buildNotificationListUrl,
  buildNotificationPresentation
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
const { buildRunnerProfilePresentation } = require('../services/runner-profile-presentation.service');
const { buildRunnerGroupsPresentation } = require('../services/runner-groups-presentation.service');
const {
  listAnnouncements: listRunningGroupAnnouncements,
  REPORT_REASONS: runningGroupReportReasons
} = require('../services/running-group-community.service');
const {
  MAX_RUNNING_GROUP_NAME_LENGTH,
  normalizeRunningGroupMemberships
} = require('../utils/running-group-memberships');

const countries = getCountries();
const timezones = getTimeZoneOptions();

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
    logger.error('Runner dashboard load error:', error);
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
    const registrations = await getRunnerRegistrations(user._id);
    const eventProgressCards = await getRunnerEventProgressCards(registrations);
    const { active: activeProgressCards } = splitEventProgressCards(eventProgressCards);
    const resultCards = filterEventProgressCardsForResultsCard(
      sortEventProgressCardsByRecency(activeProgressCards),
      dashboardFilters.resultStatus
    );

    return res.render('runner/partials/result-submissions-card', {
      selectedResultStatus: dashboardFilters.resultStatus,
      preservedGroupQuery: groupQuery,
      resultCards: formatRunnerEventProgressCards(resultCards, locale)
    });
  } catch (error) {
    logger.error('Runner result submissions partial load error:', error);
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
      return res.status(400).render('runner/profile', await buildRunnerProfileViewData(user, req, {
        errors,
        message: { type: 'error', text: Object.values(errors).join(' ') },
        profileData: formData
      }));
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
    logger.error('Runner profile update error:', error);
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
    const fragmentNames = ['active-journey', 'summary', 'recent-activity', 'latest-achievement'];
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
    logger.error('Runner dashboard refresh error:', error);
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
    logger.error('Runner profile page load error:', error);
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
    logger.error('Runner badges load error:', error);
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
    logger.error('Runner badge progress load error:', error);
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
    logger.error('Featured badge update error:', error);
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
    logger.error('Runner profile identity update error:', error);
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
    if (mobile && !/^[\d\s\-()+]{7,25}$/.test(mobile)) {
      return res.redirect('/runner/profile?type=error&msg=Enter%20a%20valid%20mobile%20number.#contact');
    }

    user.mobile = mobile;
    await user.save();
    await syncProfileCompletionNotification(user);
    return res.redirect('/runner/profile?type=success&msg=Contact%20details%20updated.#contact');
  } catch (error) {
    logger.error('Runner profile contact update error:', error);
    return res.redirect('/runner/profile?type=error&msg=Unable%20to%20update%20contact%20details.#contact');
  }
};

exports.updateProfileLocation = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) return res.redirect('/login');

    const country = normalizeCountryCode(req.body.country);
    const submittedTimezone = String(req.body.timezone || '').trim();
    const timezone = normalizeTimeZone(submittedTimezone);
    if (!country || !isValidCountryCode(country)) {
      return res.redirect('/runner/profile?type=error&msg=Select%20a%20valid%20country.#location');
    }
    if (!timezone) {
      return res.redirect('/runner/profile?type=error&msg=Select%20a%20valid%20timezone.#location');
    }

    user.country = country;
    user.timezone = timezone;
    user.timezoneConfirmedAt = new Date();
    user.timezoneSource = normalizeTimezoneSource(req.body.timezoneSource);
    await user.save();
    await syncProfileCompletionNotification(user);
    return res.redirect('/runner/profile?type=success&msg=Location%20and%20timezone%20saved.#location');
  } catch (error) {
    logger.error('Runner profile location update error:', error);
    return res.redirect('/runner/profile?type=error&msg=Unable%20to%20save%20location%20and%20timezone.#location');
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
    logger.error('Runner profile emergency update error:', error);
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
    logger.error('Runner password update error:', error);
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
    logger.error('Unlink Google auth error:', error);
    const returnTo = getSafeRunnerReturnTo(req.body.returnTo || '/runner/dashboard');
    return res.redirect(`${returnTo}?type=error&msg=${encodeURIComponent('Unable to unlink Google sign-in right now.')}`);
  }
};

const NOTIFICATION_OPTOUT_ALLOWED_KEYS = new Set([
  'result.approved',
  'result.rejected',
  'certificate.issued',
  'badge.earned',
  'organiser.payment_reminder',
  'event.promotion'
]);

exports.updateNotificationSettings = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) return res.redirect('/login');

    const submitted = Array.isArray(req.body.emailEnabled)
      ? req.body.emailEnabled
      : (req.body.emailEnabled ? [req.body.emailEnabled] : []);

    const enabledKeys = new Set(
      submitted.map((k) => String(k).trim()).filter((k) => NOTIFICATION_OPTOUT_ALLOWED_KEYS.has(k))
    );
    const emailOptOut = [...NOTIFICATION_OPTOUT_ALLOWED_KEYS].filter((k) => !enabledKeys.has(k));

    user.notificationPreferences = { emailOptOut };
    await user.save();

    return res.redirect('/runner/profile?section=notifications&type=success&msg=Notification+preferences+saved.');
  } catch (error) {
    logger.error('Update notification settings error:', error);
    return res.redirect('/runner/profile?section=notifications&type=error&msg=Unable+to+save+preferences.');
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
    logger.error('Create running group page load error:', error);
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
      },
      groupsPresentation: buildRunnerGroupsPresentation({ currentGroups, topGroups, searchResults, query })
    });
  } catch (error) {
    logger.error('Running groups page load error:', error);
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
    const group = await getRunningGroupBySlug(slug);
    if (!group) {
      return res.status(404).render('error', {
        title: 'Group Not Found',
        status: 404,
        message: 'The running group you requested was not found.'
      });
    }

    const [activity, announcements] = await Promise.all([
      getRunningGroupActivity(group._id, 20),
      listRunningGroupAnnouncements(group, { page: req.query.page, currentUserId: user._id })
    ]);

    return res.render('runner/group-detail', {
      user,
      userName: user.firstName,
      message: getRunnerProfileMessage(req.query),
      group,
      announcements,
      focusAnnouncementId: String(req.query.announcement || ''),
      reportReasons: runningGroupReportReasons,
      activity: activity.map((item) => ({
        ...item,
        atLabel: formatDateTime(item.createdAt, locale)
      })),
      membership: {
        isMember: normalizeRunnerGroupValues(user.runningGroups || user.runningGroup).some(
          (name) => normalizeGroupName(name) === normalizeGroupName(group.name)
        )
      }
    });
  } catch (error) {
    logger.error('Running group detail load error:', error);
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
    const view = normalizeNotificationView(req.query.view, req.query.unread);
    const notifications = await getUserNotifications(user._id, {
      page,
      limit: 20,
      view
    });
    const returnTo = buildNotificationListUrl(view, notifications.page);

    return res.render('runner/notifications', {
      title: 'Notifications - HelloRun',
      user,
      message: getRunnerProfileMessage(req.query),
      notifications: {
        ...notifications,
        view,
        returnTo,
        urls: {
          all: buildNotificationListUrl('all'),
          unread: buildNotificationListUrl('unread'),
          archived: buildNotificationListUrl('archived'),
          previous: buildNotificationListUrl(view, Math.max(1, notifications.page - 1)),
          next: buildNotificationListUrl(view, Math.min(notifications.totalPages, notifications.page + 1))
        },
        items: notifications.items.map((item) => ({
          ...item,
          ...buildNotificationPresentation(item),
          id: String(item._id),
          createdAtLabel: formatDateTime(item.createdAt, locale),
          createdAtRelativeLabel: formatRelativeTime(item.createdAt)
        }))
      }
    });
  } catch (error) {
    logger.error('Runner notifications load error:', error);
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

    const result = await getRunnerEligibleSubmissionRegistrationState(user._id, {
      limit: normalizePositiveInt(req.query.limit, 50)
    });

    return res.json({
      success: true,
      items: result.items,
      context: result.context
    });
  } catch (error) {
    logger.error('Runner eligible submission options load error:', error);
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
    const result = await markNotificationAsRead(user._id, req.params.notificationId);
    if (wantsJsonResponse(req)) {
      return res.status(result.matched ? 200 : 404).json({
        success: result.matched,
        message: result.matched ? 'Notification marked as read.' : 'Notification is unavailable.'
      });
    }
    return res.redirect(returnTo);
  } catch (error) {
    if (wantsJsonResponse(req)) {
      return res.status(500).json({ success: false, message: 'Unable to update notification state.' });
    }
    const returnTo = getSafeRunnerReturnTo(req.body.returnTo || '/runner/notifications');
    return res.redirect(withRunnerPageMessage(returnTo, 'error', 'Unable to update notification state.'));
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
    return res.redirect(withRunnerPageMessage(returnTo, 'success', 'All notifications marked as read.'));
  } catch (error) {
    const returnTo = getSafeRunnerReturnTo(req.body.returnTo || '/runner/notifications');
    return res.redirect(withRunnerPageMessage(returnTo, 'error', 'Unable to update notification state.'));
  }
};

exports.archiveRunnerNotification = async (req, res) => {
  const returnTo = getSafeRunnerReturnTo(req.body.returnTo || '/runner/notifications');
  try {
    const user = await getRunnerFromSession(req);
    if (!user) return res.redirect('/login');
    const result = await archiveNotification(user._id, req.params.notificationId);
    const message = result.matched ? 'Notification archived.' : 'Notification is unavailable.';
    return res.redirect(withRunnerPageMessage(returnTo, result.matched ? 'success' : 'error', message));
  } catch (error) {
    return res.redirect(withRunnerPageMessage(returnTo, 'error', 'Unable to archive notification.'));
  }
};

exports.restoreRunnerNotification = async (req, res) => {
  const returnTo = getSafeRunnerReturnTo(req.body.returnTo || '/runner/notifications?view=archived');
  try {
    const user = await getRunnerFromSession(req);
    if (!user) return res.redirect('/login');
    const result = await restoreNotification(user._id, req.params.notificationId);
    const message = result.matched ? 'Notification restored.' : 'Notification is unavailable.';
    return res.redirect(withRunnerPageMessage(returnTo, result.matched ? 'success' : 'error', message));
  } catch (error) {
    return res.redirect(withRunnerPageMessage(returnTo, 'error', 'Unable to restore notification.'));
  }
};

exports.archiveReadRunnerNotifications = async (req, res) => {
  const returnTo = getSafeRunnerReturnTo(req.body.returnTo || '/runner/notifications');
  try {
    const user = await getRunnerFromSession(req);
    if (!user) return res.redirect('/login');
    const result = await archiveAllReadNotifications(user._id);
    const message = result.modifiedCount
      ? `${result.modifiedCount} read notification${result.modifiedCount === 1 ? '' : 's'} archived.`
      : 'There are no read notifications to archive.';
    return res.redirect(withRunnerPageMessage(returnTo, 'success', message));
  } catch (error) {
    return res.redirect(withRunnerPageMessage(returnTo, 'error', 'Unable to archive read notifications.'));
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
  const { active: activeProgressCards, missed: missedProgressCards } = splitEventProgressCards(eventProgressCards);
  const mergedActivity = mergeRunnerActivity(
    dashboardData.activity,
    recentGroupActivity,
    performanceSnapshot.recentActivity
  );
  const formattedProgressCards = formatRunnerEventProgressCards(activeProgressCards, locale);
  const allFormattedProgressCards = formatRunnerEventProgressCards(eventProgressCards, locale);

  const now = new Date();
  let savedEvents = [];
  if (user.savedEvents && user.savedEvents.length) {
    try {
      const savedDocs = await Event.find({ _id: { $in: user.savedEvents }, status: 'published' })
        .select('title slug bannerImageUrl eventStartAt registrationOpenAt registrationCloseAt status')
        .lean();
      savedEvents = savedDocs.map((ev) => {
        const regOpen = ev.registrationOpenAt ? new Date(ev.registrationOpenAt) : null;
        const regClose = ev.registrationCloseAt ? new Date(ev.registrationCloseAt) : null;
        const isOpen = regOpen && regClose && regOpen <= now && regClose >= now;
        const startLabel = ev.eventStartAt ? new Date(ev.eventStartAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        return {
          _id: ev._id,
          slug: ev.slug,
          title: ev.title,
          bannerImageUrl: ev.bannerImageUrl || '',
          startDateLabel: startLabel,
          registrationOpen: isOpen,
          statusLabel: isOpen ? 'Open' : (regClose && regClose < now ? 'Closed' : 'Upcoming'),
          statusTone: isOpen ? 'positive' : (regClose && regClose < now ? 'negative' : 'neutral')
        };
      });
    } catch (_) {}
  }

  const formattedActivity = mergedActivity.slice(0, 3).map((item) => ({
    ...item,
    atLabel: formatDateTime(item.at, locale),
    atRelativeLabel: formatRelativeTime(item.at)
  }));
  const latestAchievement = buildLatestAchievement({
    certificates: performanceSnapshot.recentCertificates || [],
    badges: recentBadges,
    nextMilestones,
    locale
  });
  const dashboardSnapshot = {
    activeEvents: activeProgressCards.filter((card) => !['approved', 'completed'].includes(card.state)).length,
    approvedDistanceKm: Number(performanceSnapshot.metrics?.totalDistanceKm || 0),
    pendingReview: Number(performanceSnapshot.counts?.submitted || 0),
    completedEvents: Number(performanceSnapshot.metrics?.completedEvents || 0),
    certificates: Number(performanceSnapshot.counts?.certificates || 0),
    achievementPoints: Number(badgePointsSummary?.totalPoints || 0)
  };
  const runnerDashboardPresentation = buildRunnerDashboardPresentation({
    user,
    cards: allFormattedProgressCards,
    profileCompleteness: getRunnerProfileCompleteness(user),
    snapshot: dashboardSnapshot,
    recentActivity: formattedActivity,
    latestAchievement,
    unavailableHistoryCount: registrations.filter((registration) => !registration?.eventId).length,
    toolCounts: {
      submissions: performanceSnapshot.counts?.total,
      achievements: badgePointsSummary?.badgeCount,
      groups: currentRunningGroups.length,
      savedEvents: savedEvents.length
    }
  });

  return {
    dashboardFilters,
    runningGroupFeature: {
      currentGroup: currentRunningGroups[0] || null,
      currentGroups: currentRunningGroups
    },
    savedEvents,
    runnerDashboardPresentation,
    cards: {
      upcoming: dashboardData.upcoming.slice(0, 1).map(normalizeRegistrationCard),
      past: dashboardData.past.slice(0, 5).map(normalizeRegistrationCard),
      activity: formattedActivity,
      certificates: (performanceSnapshot.recentCertificates || []).map((item) => ({
        ...item,
        issuedAtLabel: formatDateTime(item.issuedAt, locale)
      })),
      results: formatRunnerEventProgressCards(
        filterEventProgressCardsForResultsCard(sortEventProgressCardsByRecency(activeProgressCards), dashboardFilters.resultStatus),
        locale
      ).slice(0, 8),
      eventProgress: formattedProgressCards,
      missedSubmissions: formatRunnerEventProgressCards(missedProgressCards, locale),
      badges: recentBadges,
      badgeProgress
    },
    badgePointsSummary,
    nextMilestones,
    latestAchievement,
    dashboardSnapshot,
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

function buildLatestAchievement({ certificates = [], badges = [], nextMilestones, locale }) {
  const certificate = certificates[0];
  if (certificate) {
    return {
      type: 'certificate',
      title: certificate.eventTitle,
      label: 'Certificate Ready',
      description: `Issued ${formatDateTime(certificate.issuedAt, locale)}`,
      href: `/my-submissions/${certificate.submissionId}/certificate`,
      verifyUrl: certificate.verifyUrl || '',
      shareUrls: buildCertificateShareUrls(certificate.verifyUrl, certificate.eventTitle),
      submissionId: certificate.submissionId
    };
  }
  const badge = badges[0];
  if (badge) {
    return {
      type: 'badge',
      title: badge.name || 'New badge',
      label: 'Latest Badge',
      description: badge.description || 'A new achievement was added to your collection.',
      href: '/runner/profile#badges',
      imageUrl: badge.imageUrl || ''
    };
  }
  const milestone = nextMilestones?.nextGlobalMilestone || nextMilestones?.challengesInProgress?.[0];
  if (!milestone) return null;
  return {
    type: 'milestone',
    title: milestone.name || `${milestone.distanceKm || 0} km milestone`,
    label: 'Next Milestone',
    description: `${Number(milestone.progressPercent || 0).toFixed(0)}% complete`,
    href: '/runner/profile#badges'
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
  const suggestedCountry = getCloudflareCountrySuggestion(req.headers);
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
  const profilePresentation = buildRunnerProfilePresentation({
    user,
    profileData,
    profileCompleteness,
    selectedCountryName: selectedCountry?.name || 'Not set',
    stravaConnection,
    badges,
    badgeProgress,
    badgePointsSummary,
    certifiedSubmissionIds,
    publicBadgeCollectionPath: user.userId ? `/runners/${encodeURIComponent(user.userId)}/badges` : ''
  });

  return {
    title: 'My Profile - HelloRun',
    user,
    userName: user.firstName,
    message: getRunnerProfileMessage(req.query),
    profileData,
    profileCompleteness,
    countries,
    timezones,
    selectedCountryName: selectedCountry?.name || 'Not set',
    suggestedCountry,
    stravaConnection,
    badges,
    badgeProgress,
    badgePointsSummary,
    certifiedSubmissionIds,
    publicBadgeCollectionPath: user.userId ? `/runners/${encodeURIComponent(user.userId)}/badges` : '',
    profilePresentation,
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
    timezone: normalizeTimeZone(body.timezone),
    dateOfBirth: formatDateForInput(body.dateOfBirth),
    gender: String(body.gender || '').trim(),
    emergencyContactName: String(body.emergencyContactName || '').trim(),
    emergencyContactNumber: String(body.emergencyContactNumber || '').trim(),
    runningGroups: normalizedGroups,
    runningGroup: normalizedGroups[0] || ''
  };
}

function normalizeTimezoneSource(value) {
  const source = String(value || '').trim();
  return ['browser', 'country_suggestion'].includes(source) ? source : 'user';
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
    if (formData.runningGroups.some((item) => String(item || '').trim().length > MAX_RUNNING_GROUP_NAME_LENGTH)) {
      errors.runningGroups = `Each running group must be ${MAX_RUNNING_GROUP_NAME_LENGTH} characters or less.`;
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
  return normalizeRunningGroupMemberships(value);
}

exports.__testNormalizeRunnerGroupValues = normalizeRunnerGroupValues;
exports.__testValidateRunnerProfileForm = validateRunnerProfileForm;

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

const RESULTS_CARD_STATES = new Set(['submitted', 'in_progress', 'rejected', 'completed', 'approved']);
const RESULTS_CARD_STATUS_STATES = {
  submitted: new Set(['submitted', 'in_progress']),
  approved: new Set(['approved', 'completed']),
  rejected: new Set(['rejected'])
};

function filterEventProgressCardsForResultsCard(cards = [], resultStatus = '') {
  const allowedStates = RESULTS_CARD_STATUS_STATES[resultStatus] || RESULTS_CARD_STATES;
  return (cards || []).filter((card) => RESULTS_CARD_STATES.has(card.state) && allowedStates.has(card.state));
}

function formatRunnerEventProgressCards(cards = [], locale) {
  return (cards || []).map((item) => ({
    ...item,
    eventStartAtLabel: formatDateTime(item.eventStartAt, locale),
    eventEndAtLabel: formatDateTime(item.eventEndAt, locale),
    submissionDeadlineLabel: formatDateTime(item.submissionDeadlineAt, locale),
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

    const filters = normalizeListOptions(req.query);

    const [result, counts] = await Promise.all([
      listRunnerSubmissions(user._id, filters),
      getRunnerSubmissionCounts(user._id)
    ]);

    const presentation = buildRunnerSubmissionListPresentation(result, counts, filters);

    return res.render('runner/submissions', {
      title: 'Submission History - HelloRun',
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
      filters,
      presentation
    });
  } catch (error) {
    logger.error('Runner submissions page load error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your submission history.'
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
    logger.error('Runner submission detail load error:', error);
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
        logger.error('Runner proof signed URL error:', error.message);
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
    logger.error('Runner proof access error:', error);
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

function wantsJsonResponse(req) {
  return String(req.get('accept') || '').toLowerCase().includes('application/json');
}

function withRunnerPageMessage(returnTo, type, message) {
  const separator = String(returnTo || '').includes('?') ? '&' : '?';
  return `${returnTo}${separator}type=${encodeURIComponent(type)}&msg=${encodeURIComponent(message)}`;
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
