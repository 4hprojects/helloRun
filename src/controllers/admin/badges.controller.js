'use strict';

const {
  User, Blog, BlogComment, BlogReport, Registration, Submission, Event, PrivacyPolicy,
  logger, communicationService, getCommunicationRetryHealth, listCommunicationRetryAudit,
  listCommunicationRetries, retryCommunicationNow, homepageCarouselSettingService, adSettingService,
  listBadgeDefinitions, listAdminUserBadges, getAdminBadgeAnalytics, revokeUserBadge,
  updateBadgeDefinitionStatusSvc, updateBadgeDefinitionEmailLevelSvc, recalculateBadgeAwards, previewBadgeRecalculation,
  listRecentBadgeAuditLogs, buildSubmissionHubPath, listSubmissionHub, listSubmissionHubEvents,
  buildSubmissionReviewSignal,
  ADMIN_BADGE_STATUSES, ADMIN_BADGE_SCOPES, ADMIN_REVIEW_TYPES, ADMIN_REVIEW_SORTS,
  acceptsJson, normalizePositiveInt, buildAdminRedirect, getAdminPageMessage, renderServerError,
  buildCommunicationLogHref, buildCommunicationRetryHref, buildCommunicationRetryActionHref,
  buildCommunicationFailureDetailHref, normalizeAdminReviewType, normalizeAdminReviewSort,
  buildReviewQueueParams, getCountMap, formatAdminReviewDate, appendAdminPageMessage,
  canPublishFromMessage
} = require('./_shared');

// Service functions renamed to avoid collision with controller export names
const updateBadgeDefinitionStatus = updateBadgeDefinitionStatusSvc;
const updateBadgeDefinitionEmailLevel = updateBadgeDefinitionEmailLevelSvc;

// SECTION: Badge Management
// ═══════════════════════════════════════════════════════════

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
        title: 'Badge Management - HelloRun Admin',
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
    logger.error('listBadges error:', error);
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
    logger.error('revokeBadge error:', error);
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
    logger.error('updateBadgeDefinitionStatus error:', error);
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
    logger.error('updateBadgeDefinitionEmailLevel error:', error);
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

    if (String(req.body.previewOnly || '') === '1') {
      const preview = await previewBadgeRecalculation({ scope, limit });
      const message = `Preview: up to ${preview.maximumRecordsEvaluated} source records will be evaluated (${preview.registrationsEligible} registrations, ${preview.submissionsEligible} submissions, ${preview.organisersEligible} organizers). No awards were changed.`;
      if (!wantsJson) return res.redirect(buildAdminRedirect('/admin/badges', 'info', message));
      return res.json({ success: true, preview, dryRun: true });
    }

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
    return res.json({ success: true, result, dryRun: false });
  } catch (error) {
    logger.error('recalculateBadges error:', error);
    if (!acceptsJson(req)) {
      return res.redirect(buildAdminRedirect('/admin/badges', 'error', 'Failed to recalculate badge awards.'));
    }
    return res.status(500).json({ success: false, message: 'Failed to recalculate badge awards.' });
  }
};

exports.renderCommunications = async (req, res) => {
  try {
    const [data, retryHealth] = await Promise.all([
      communicationService.getAdminCommunicationPageData(req.query),
      getCommunicationRetryHealth()
    ]);
    return res.render('admin/communications', {
      title: 'Communications - HelloRun Admin',
      message: getAdminPageMessage(req.query),
      ...data,
      retryHealth,
      emailFrom: process.env.EMAIL_FROM || '',
      formatDateTime: formatAdminDateTime,
      buildLogPageHref: (page) => buildCommunicationLogHref(data.logFilters, page),
      buildFailureDetailHref: buildCommunicationFailureDetailHref
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading communication settings.');
  }
};

exports.renderCommunicationRetries = async (req, res) => {
  try {
    const [retryData, communicationData, retryAuditData] = await Promise.all([
      listCommunicationRetries(req.query),
      communicationService.getAdminCommunicationPageData({}),
      listCommunicationRetryAudit({ ...req.query, limit: 20 })
    ]);
    return res.render('admin/communication-retries', {
      title: 'Notification Retry Queue - HelloRun Admin',
      message: getAdminPageMessage(req.query),
      events: communicationData.events,
      retryAudit: retryAuditData.items,
      retryAuditFilters: retryAuditData.filters,
      retryAuditActions: retryAuditData.actions,
      retryAuditTotalItems: retryAuditData.totalItems,
      ...retryData,
      formatDateTime: formatAdminDateTime,
      buildRetryPageHref: (page) => buildCommunicationRetryHref(retryData.filters, page),
      buildRetryActionHref: (retryId) => buildCommunicationRetryActionHref(retryId, retryData.filters)
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading notification retries.');
  }
};

exports.renderCommunicationFailureDetail = async (req, res) => {
  try {
    const detail = await communicationService.getCommunicationFailureDetail(req.params.eventKey);
    return res.render('admin/communication-failure-detail', {
      title: `${detail.eventName} Failures - HelloRun Admin`,
      detail,
      formatDateTime: formatAdminDateTime,
      buildLogHref: () => buildCommunicationLogHref({ eventKey: detail.eventKey, status: 'failed' }),
      buildRetryHref: (status = '') => buildCommunicationRetryHref({ eventKey: detail.eventKey, status })
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading notification failure detail.');
  }
};

exports.retryCommunicationDelivery = async (req, res) => {
  const returnTo = buildCommunicationRetryHref(req.query || {});
  try {
    const result = await retryCommunicationNow(req.params.retryId, {
      actor: {
        actorUserId: req.session?.userId || null,
        ipAddress: String(req.ip || ''),
        userAgent: String(req.get('user-agent') || '')
      }
    });
    if (result.alreadySent) {
      return res.redirect(appendAdminPageMessage(returnTo, 'info', 'This retry job was already sent.'));
    }
    if (result.sent) {
      return res.redirect(appendAdminPageMessage(returnTo, 'success', 'Notification retry sent successfully.'));
    }
    return res.redirect(appendAdminPageMessage(returnTo, 'warning', 'Notification retry was attempted and remains queued.'));
  } catch (error) {
    return res.redirect(appendAdminPageMessage(returnTo, 'error', error.message || 'Could not retry notification.'));
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

exports.renderHomepageCarouselSettings = async (req, res) => {
  try {
    const setting = await homepageCarouselSettingService.getHomepageCarouselSettings();
    return res.render('admin/homepage-carousel-settings', {
      title: 'Homepage Carousel Settings - HelloRun Admin',
      message: getAdminPageMessage(req.query),
      setting
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading homepage carousel settings.');
  }
};

exports.updateHomepageCarouselSettings = async (req, res) => {
  try {
    await homepageCarouselSettingService.updateHomepageCarouselSettings(req.body, getAdminActor(req));
    return res.redirect(buildAdminRedirect('/admin/homepage-carousel', 'success', 'Homepage carousel settings updated.'));
  } catch (error) {
    return res.redirect(buildAdminRedirect('/admin/homepage-carousel', 'error', error.message || 'Could not update homepage carousel settings.'));
  }
};

exports.renderAdSettings = async (req, res) => {
  try {
    const setting = await adSettingService.getAdSettings();
    return res.render('admin/ad-settings', {
      title: 'Ad Settings - HelloRun Admin',
      message: getAdminPageMessage(req.query),
      setting,
      adPageGroups: adSettingService.AD_PAGE_GROUPS
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading ad settings.');
  }
};

exports.updateAdSettings = async (req, res) => {
  try {
    await adSettingService.updateAdSettings(req.body, getAdminActor(req));
    return res.redirect(buildAdminRedirect('/admin/ads', 'success', 'Ad settings updated.'));
  } catch (error) {
    return res.redirect(buildAdminRedirect('/admin/ads', 'error', error.message || 'Could not update ad settings.'));
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

    const [paymentDocs, resultDocs, accumulatedResultDocs] = await Promise.all([
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
        : [],
      includeResults
        ? AccumulatedActivitySubmission.find({ status: 'submitted' })
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
        reviewSignal: buildSubmissionReviewSignal(submission),
        actionHref: `/organizer/events/${String(event._id || submission.eventId)}/submissions/${String(submission._id)}/review`
      };
    });
    const accumulatedResultItems = accumulatedResultDocs.filter((submission) => submission.eventId?._id && submission.registrationId?._id).map((submission) => {
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
        reviewSignal: buildSubmissionReviewSignal(submission),
        actionHref: `/organizer/events/${String(event._id || submission.eventId)}/submissions/${String(submission._id)}/review`
      };
    });

    let reviewItems = paymentItems.concat(resultItems, accumulatedResultItems);
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
      title: 'Payment Receipt and Run Result Reviews - HelloRun Admin',
      filters,
      reviewItems,
      counts: {
        all: paymentItems.length + resultItems.length + accumulatedResultItems.length,
        payments: paymentItems.length,
        results: resultItems.length + accumulatedResultItems.length
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


// ═══════════════════════════════════════════════════════════
