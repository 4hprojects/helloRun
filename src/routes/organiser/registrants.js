// src/routes/organiser/registrants.js
const express = require('express');
const router = express.Router();
const { isAccumulatedChallenge, resolveChallengeConfig } = require('../../utils/challenge-metrics');
const {
  logger,
  User,
  Event,
  Registration,
  Submission,
  AccumulatedActivitySubmission,
  ExcelJS,
  requireAuth,
  requireCsrfProtection,
  registrantExportLimiter,
  registrantCancellationLimiter,
  registrantDetailsLimiter,
  getCountryName,
  buildAccumulatedProgress,
  getAccumulatedActivitiesForRegistrations,
  recordCriticalAuditEventInBackground,
  REGISTRANTS_PAGE_SIZE,
  getRegistrantFilterContext,
  getEventRegistrationSummaryCounts,
  getEventSubmissionSummaryCounts,
  getRegistrationIdsWithSubmissionStatus,
  buildRegistrantListPath,
  buildRegistrantExportQuery,
  getRegistrantSortSpec,
  getRegistrantExportData,
  mapSubmissionForRegistrant,
  formatExpectedPaymentLabel,
  formatGenderLabel,
  formatAgeFromDateOfBirth,
  csvEscape,
  canAccessRegistrantReview,
  getRegistrantAccessibleEventOrNull,
  getPageMessage,
  getRequestIpAddress,
  getRequestUserAgent,
  notifyWithRetryInBackground
} = require('./_shared');
const { resolveAccumulatedTargetDistanceKm, resolveAccumulatedTargetSteps } = require('../../services/accumulated-target.service');
const { cancelRegistration } = require('../../services/registration-cancellation.service');
const {
  normalizeRegistrationDetailsInput,
  applyRegistrationDetailsUpdate,
  normalizeReason,
  describeLeaderboardState
} = require('../../services/registration-details.service');
const { TRACKING_APP_OPTIONS } = require('../../utils/tracking-apps');

const LEADERBOARD_DISPLAY_OPTIONS = Object.freeze([
  { value: 'full_name', label: 'Full name' },
  { value: 'abbreviated', label: 'First name and last initial' },
  { value: 'hidden', label: 'Do not show on the leaderboard' }
]);
const { invalidateLeaderboardCache } = require('../../services/leaderboard.service');
const { buildEntryExtras, formatEntryExtrasSummary } = require('../../utils/entry-extras');

function formatRegistrantDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleString('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  })} PHT`;
}

function humanizeStatus(value) {
  return String(value || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/* ==========================================
   GET: Event Registrants
   ========================================== */

router.get('/events/:id/registrants', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    if (!canAccessRegistrantReview(user)) {
      return res.status(403).render('error', {
        title: '403 - Access Denied',
        status: 403,
        message: 'Only approved organizers or admins can access this page.'
      });
    }

    const event = await getRegistrantAccessibleEventOrNull(req.params.id, user);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found or you do not have access.'
      });
    }
    const filterContext = getRegistrantFilterContext(event, req.query);
    const {
      query,
      selectedMode,
      selectedDistance,
      eventRaceDistances,
      searchQuery,
      selectedResultStatus,
      selectedRegistrationStatus,
      selectedSort,
      pageSize,
      fieldMode,
      requestedPage
    } = filterContext;

    const registrantQuery = { ...query };
    if (selectedResultStatus) {
      registrantQuery._id = {
        $in: await getRegistrationIdsWithSubmissionStatus(event._id, selectedResultStatus)
      };
    }

    const filteredRegistrantsCount = await Registration.countDocuments(registrantQuery);
    const totalPages = Math.max(1, Math.ceil(filteredRegistrantsCount / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const pageStart = (page - 1) * pageSize;

    const registrationsRaw = filteredRegistrantsCount > 0
      ? await Registration.find(registrantQuery)
        .sort(getRegistrantSortSpec(selectedSort))
        .skip(pageStart)
        .limit(pageSize)
        .lean()
      : [];

    const registrationIds = registrationsRaw.map((item) => item._id);
    const submissionFilter = {
      eventId: event._id,
      registrationId: { $in: registrationIds }
    };
    if (selectedResultStatus) {
      submissionFilter.status = selectedResultStatus;
    }
    const submissions = registrationIds.length
      ? await Submission.find(submissionFilter)
        .select('registrationId status distanceKm elapsedMs runDate runLocation proofType proof submittedAt reviewedAt reviewedBy reviewNotes rejectionReason ocrData runType elevationGain steps suspiciousFlag suspiciousFlagReason validation')
        .populate('reviewedBy', 'firstName lastName')
        .lean()
      : [];
    const submissionsByRegistrationId = new Map(
      submissions.map((item) => [String(item.registrationId), item])
    );
    const [
      accumulatedActivities,
      accumulatedProgressActivities
    ] = registrationIds.length
      ? await Promise.all([
        getAccumulatedActivitiesForRegistrations(registrationIds, selectedResultStatus ? { status: selectedResultStatus } : {}),
        selectedResultStatus
          ? getAccumulatedActivitiesForRegistrations(registrationIds)
          : Promise.resolve([])
      ])
      : [[], []];
    const accumulatedActivitiesByRegistrationId = new Map();
    for (const activity of accumulatedActivities) {
      const key = String(activity.registrationId);
      const current = accumulatedActivitiesByRegistrationId.get(key) || [];
      current.push(activity);
      accumulatedActivitiesByRegistrationId.set(key, current);
    }
    const accumulatedProgressActivitiesByRegistrationId = selectedResultStatus
      ? new Map()
      : accumulatedActivitiesByRegistrationId;
    if (selectedResultStatus) {
      for (const activity of accumulatedProgressActivities) {
        const key = String(activity.registrationId);
        const current = accumulatedProgressActivitiesByRegistrationId.get(key) || [];
        current.push(activity);
        accumulatedProgressActivitiesByRegistrationId.set(key, current);
      }
    }

    const registrations = registrationsRaw.map((item) => ({
      ...item,
      participant: {
        ...item.participant,
        countryLabel: getCountryName(item.participant?.country),
        genderLabel: formatGenderLabel(item.participant?.gender),
        ageLabel: formatAgeFromDateOfBirth(item.participant?.dateOfBirth)
      },
      registrationStatusLabel: humanizeStatus(item.status),
      paymentStatusLabel: humanizeStatus(item.paymentStatus),
      registeredAtLabel: formatRegistrantDateTime(item.registeredAt),
      waiverAcceptedAtLabel: formatRegistrantDateTime(item.waiver?.acceptedAt),
      paymentProofUploadedAtLabel: formatRegistrantDateTime(item.paymentProof?.uploadedAt),
      paymentReviewedAtLabel: formatRegistrantDateTime(item.paymentReviewedAt),
      expectedPaymentLabel: formatExpectedPaymentLabel(item, event),
      signupOptionLabel: item.pricingSnapshot?.optionDescription || '',
      pricingPeriodLabel: item.pricingSnapshot?.pricingPeriodLabel || '',
      accumulatedProgress: isAccumulatedChallenge(event)
        ? buildAccumulatedProgress({
          activities: accumulatedProgressActivitiesByRegistrationId.get(String(item._id)) || [],
          targetDistanceKm: resolveAccumulatedTargetDistanceKm(item, event),
          targetSteps: resolveAccumulatedTargetSteps(item, event),
          primaryMetric: resolveChallengeConfig(event).primaryMetric
        })
        : null,
      submission: mapSubmissionForRegistrant(
        submissionsByRegistrationId.get(String(item._id)) ||
          (accumulatedActivitiesByRegistrationId.get(String(item._id)) || [])[0],
        {
          isAccumulatedActivity: !submissionsByRegistrationId.has(String(item._id)) &&
            Boolean((accumulatedActivitiesByRegistrationId.get(String(item._id)) || [])[0])
        }
      )
    }));

    registrations.forEach((item) => {
      const categoryName = String(item.pricingSnapshot?.raceCategoryName || '').trim();
      const distance = String(item.raceDistance || '').trim();
      item.categoryLabel = categoryName && distance && categoryName.toLowerCase() !== distance.toLowerCase()
        ? `${categoryName} · ${distance}`
        : distance || categoryName || 'Unspecified category';
      if (item.submission) item.submission.submittedAtLabel = formatRegistrantDateTime(item.submission.submittedAt);
      // A single entry's elevation or steps means little beside an accumulated running total, so
      // only standard results get the extra line.
      if (item.submission && !item.accumulatedProgress) {
        item.submission.extrasLabel = formatEntryExtrasSummary(buildEntryExtras(item.submission));
      }
      item.resultStatusLabel = item.accumulatedProgress
        ? `${item.accumulatedProgress.approvedActivityCount} approved · ${item.accumulatedProgress.pendingActivityCount} pending`
        : item.submission ? humanizeStatus(item.submission.status) : 'No result';
      item.resultReviewHref = item.submission?.status === 'submitted'
        ? `/organizer/events/${event._id}/submissions/${item.submission._id}/review`
        : '';
      item.paymentReviewHref = item.paymentStatus === 'proof_submitted'
        ? `/organizer/events/${event._id}/payment-proofs/review?q=${encodeURIComponent(item.confirmationCode || '')}`
        : '';
    });

    const [
      registrationSummaryCounts,
      standardSubmissionSummaryCounts,
      accumulatedSubmissionSummaryCounts
    ] = await Promise.all([
      getEventRegistrationSummaryCounts(event._id),
      getEventSubmissionSummaryCounts(Submission, event._id),
      isAccumulatedChallenge(event)
        ? getEventSubmissionSummaryCounts(AccumulatedActivitySubmission, event._id)
        : { submitted: 0, approved: 0, rejected: 0 }
    ]);

    const allowedModes = new Set([event.eventType, ...(event.eventTypesAllowed || [])]);
    if (allowedModes.has('hybrid')) {
      allowedModes.add('virtual');
      allowedModes.add('onsite');
    }
    const isPaidEvent = event.feeMode === 'paid';
    const isAccumulatedEvent = isAccumulatedChallenge(event);
    const supportsOnsite = allowedModes.has('onsite');
    const supportsVirtual = allowedModes.has('virtual');
    const hasAdvancedFilters = Boolean(
      selectedMode || selectedDistance || filterContext.selectedPaymentStatus || selectedResultStatus ||
      selectedRegistrationStatus || selectedSort !== 'newest' || pageSize !== REGISTRANTS_PAGE_SIZE
    );

    return res.render('organizer/event-registrants', {
      title: `Registrants - ${event.title}`,
      user,
      isAdminViewer: user.role === 'admin',
      trackingAppOptions: TRACKING_APP_OPTIONS,
      leaderboardStateLabel: describeLeaderboardState,
      leaderboardDisplayOptions: LEADERBOARD_DISPLAY_OPTIONS,
      event,
      registrations,
      selectedMode,
      selectedDistance,
      selectedPaymentStatus: filterContext.selectedPaymentStatus,
      selectedResultStatus,
      selectedRegistrationStatus,
      selectedSort,
      pageSize,
      fieldMode,
      capabilities: {
        isPaidEvent,
        isAccumulatedEvent,
        supportsOnsite,
        supportsVirtual,
        showModeFilter: supportsOnsite && supportsVirtual,
        hasAdvancedFilters
      },
      eventRaceDistances,
      searchQuery,
      exportQuery: buildRegistrantExportQuery(filterContext),
      summary: {
        totalRegistrants: registrationSummaryCounts.totalRegistrants,
        virtualCount: registrationSummaryCounts.virtualCount,
        onsiteCount: registrationSummaryCounts.onsiteCount,
        proofSubmittedCount: registrationSummaryCounts.proofSubmittedCount,
        paidCount: registrationSummaryCounts.paidCount,
        proofRejectedCount: registrationSummaryCounts.proofRejectedCount,
        unpaidCount: registrationSummaryCounts.unpaidCount,
        submissionSubmittedCount: standardSubmissionSummaryCounts.submitted + accumulatedSubmissionSummaryCounts.submitted,
        submissionApprovedCount: standardSubmissionSummaryCounts.approved + accumulatedSubmissionSummaryCounts.approved,
        submissionRejectedCount: standardSubmissionSummaryCounts.rejected + accumulatedSubmissionSummaryCounts.rejected
      },
      message: getPageMessage(req.query),
      pagination: {
        page,
        totalPages,
        totalItems: filteredRegistrantsCount,
        pageSize,
        prevHref: page > 1 ? buildRegistrantListPath(event._id, filterContext, { page: page - 1 }) : '',
        nextHref: page < totalPages ? buildRegistrantListPath(event._id, filterContext, { page: page + 1 }) : ''
      }
    });
  } catch (error) {
    logger.error('Error loading event registrants:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading event registrants.'
    });
  }
});

/* ==========================================
   GET: Export Registrants (CSV)
   ========================================== */

// Cancel a registration. Frees the category slot (the capacity check counts confirmed
// registrations), voids the bib so it can be reissued, and stops any check-in counting.
router.post(
  '/events/:id/registrants/:registrationId/cancel',
  requireAuth,
  requireCsrfProtection,
  registrantCancellationLimiter,
  async (req, res) => {
    const listPath = `/organizer/events/${req.params.id}/registrants`;
    try {
      const user = await User.findById(req.session.userId);
      if (!user || !canAccessRegistrantReview(user)) {
        return res.status(403).render('error', {
          title: '403 - Access Denied',
          status: 403,
          message: 'Only approved organizers or admins can cancel a registration.'
        });
      }

      const event = await getRegistrantAccessibleEventOrNull(req.params.id, user);
      if (!event) {
        return res.status(404).render('error', {
          title: '404 - Event Not Found',
          status: 404,
          message: 'Event not found.'
        });
      }

      const { registration, onsite } = await cancelRegistration({
        registrationId: req.params.registrationId,
        eventId: event._id,
        actorUserId: user._id,
        reason: req.body?.reason
      });

      const name = [registration.participant?.firstName, registration.participant?.lastName]
        .filter(Boolean)
        .join(' ') || 'The registration';
      const suffix = onsite.released ? ' The bib is free to reissue.' : '';
      return res.redirect(
        `${listPath}?msg=${encodeURIComponent(`${name} was cancelled.${suffix}`)}`
      );
    } catch (error) {
      logger.error('Error cancelling registration:', error);
      return res.redirect(
        `${listPath}?type=error&msg=${encodeURIComponent(error.message || 'Could not cancel that registration.')}`
      );
    }
  }
);

router.get('/events/:id/registrants/export', requireAuth, registrantExportLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    if (!canAccessRegistrantReview(user)) {
      return res.status(403).render('error', {
        title: '403 - Access Denied',
        status: 403,
        message: 'Only approved organizers or admins can export registrants.'
      });
    }

    const event = await getRegistrantAccessibleEventOrNull(req.params.id, user);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found or you do not have access.'
      });
    }

    const filterContext = getRegistrantFilterContext(event, req.query);
    const exportFilter = { ...filterContext.query };
    if (filterContext.selectedResultStatus) {
      exportFilter._id = { $in: await getRegistrationIdsWithSubmissionStatus(event._id, filterContext.selectedResultStatus) };
    }
    const registrations = await Registration.find(exportFilter)
      .sort(getRegistrantSortSpec(filterContext.selectedSort))
      .lean();
    const { headers, rows } = getRegistrantExportData(registrations, event);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');

    const safeSlug = String(event.slug || 'event').replace(/[^a-zA-Z0-9-_]/g, '');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${safeSlug}-registrants-${timestamp}.csv`;

    recordCriticalAuditEventInBackground({
      actorMongoUserId: user._id,
      action: 'organiser.registrants_exported',
      targetType: 'event',
      targetId: String(event._id),
      notes: `CSV registrant export generated with ${rows.length} row(s).`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: new Date()
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    logger.error('Error exporting event registrants CSV:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while exporting registrants.'
    });
  }
});

/* ==========================================
   GET: Export Registrants (XLSX)
   ========================================== */

router.get('/events/:id/registrants/export-xlsx', requireAuth, registrantExportLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    if (!canAccessRegistrantReview(user)) {
      return res.status(403).render('error', {
        title: '403 - Access Denied',
        status: 403,
        message: 'Only approved organizers or admins can export registrants.'
      });
    }

    const event = await getRegistrantAccessibleEventOrNull(req.params.id, user);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found or you do not have access.'
      });
    }

    const filterContext = getRegistrantFilterContext(event, req.query);
    const exportFilter = { ...filterContext.query };
    if (filterContext.selectedResultStatus) {
      exportFilter._id = { $in: await getRegistrationIdsWithSubmissionStatus(event._id, filterContext.selectedResultStatus) };
    }
    const registrations = await Registration.find(exportFilter)
      .sort(getRegistrantSortSpec(filterContext.selectedSort))
      .lean();
    const { headers, rows } = getRegistrantExportData(registrations, event);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HelloRun';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Registrants');
    worksheet.addRow(headers);
    rows.forEach((row) => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };
    worksheet.columns.forEach((column) => {
      let maxLength = 12;
      column.eachCell({ includeEmpty: true }, (cell) => {
        maxLength = Math.max(maxLength, String(cell.value || '').length);
      });
      column.width = Math.min(maxLength + 2, 48);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const safeSlug = String(event.slug || 'event').replace(/[^a-zA-Z0-9-_]/g, '');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${safeSlug}-registrants-${timestamp}.xlsx`;

    recordCriticalAuditEventInBackground({
      actorMongoUserId: user._id,
      action: 'organiser.registrants_exported',
      targetType: 'event',
      targetId: String(event._id),
      notes: `XLSX registrant export generated with ${rows.length} row(s).`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: new Date()
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
    return res.status(200).send(buffer);
  } catch (error) {
    logger.error('Error exporting event registrants XLSX:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while exporting registrants.'
    });
  }
});

// Edit a registration after the fact: the runner's leaderboard choice, their contact
// snapshot, and name corrections. The leaderboard half is privacy-sensitive — an
// organiser is changing whether someone else appears in public — so it demands a reason,
// writes an audit entry, and tells the runner what happened.
router.post(
  '/events/:id/registrants/:registrationId/details',
  requireAuth,
  requireCsrfProtection,
  registrantDetailsLimiter,
  async (req, res) => {
    const listPath = `/organizer/events/${req.params.id}/registrants`;
    const fail = (message) => res.redirect(`${listPath}?type=error&msg=${encodeURIComponent(message)}`);
    try {
      const user = await User.findById(req.session.userId);
      if (!user || !canAccessRegistrantReview(user)) {
        return res.status(403).render('error', {
          title: '403 - Access Denied',
          status: 403,
          message: 'Only approved organizers or admins can edit a registration.'
        });
      }

      const event = await getRegistrantAccessibleEventOrNull(req.params.id, user);
      if (!event) {
        return res.status(404).render('error', {
          title: '404 - Event Not Found',
          status: 404,
          message: 'Event not found.'
        });
      }

      const reason = normalizeReason(req.body?.reason);
      if (!reason) {
        return fail('Give a short reason for the change, for example that the runner asked for it.');
      }

      // Scoped to this event so a registration id from elsewhere cannot be edited here.
      const registration = await Registration.findOne({
        _id: req.params.registrationId,
        eventId: event._id
      });
      if (!registration) {
        return fail('Registration record not found.');
      }

      const { values, errors } = normalizeRegistrationDetailsInput(req.body, { allowName: true });
      const firstError = Object.values(errors)[0];
      if (firstError) {
        return fail(firstError);
      }

      const outcome = applyRegistrationDetailsUpdate({ registration, values });
      if (!outcome.changedFields.length) {
        return res.redirect(`${listPath}?msg=${encodeURIComponent('No changes to save.')}`);
      }

      // save(), not an atomic update: the post-save hook mirrors the participant fields
      // into the Postgres shadow.
      await registration.save();

      if (outcome.leaderboardChanged && event.slug) {
        // The cached leaderboard holds rendered names with hidden runners already removed,
        // so without this the change is invisible for up to the cache TTL.
        invalidateLeaderboardCache(event.slug);
      }

      const runnerName = [registration.participant?.firstName, registration.participant?.lastName]
        .filter(Boolean)
        .join(' ') || 'The registration';
      const occurredAt = new Date();

      // Field names only. An audit log is the wrong place to accumulate a second copy of
      // participants' contact details.
      recordCriticalAuditEventInBackground({
        actorMongoUserId: user._id,
        action: outcome.leaderboardChanged
          ? 'registration.leaderboard_preference_changed'
          : 'registration.participant_details_updated',
        targetType: 'registration',
        targetId: String(registration._id),
        statusFrom: outcome.leaderboardChanged ? describeLeaderboardState(outcome.before) : '',
        statusTo: outcome.leaderboardChanged ? describeLeaderboardState(outcome.after) : '',
        notes: `Updated ${outcome.changedFields.join(', ')}. Reason: ${reason}`,
        ipAddress: getRequestIpAddress(req),
        userAgent: getRequestUserAgent(req),
        occurredAt
      });

      if (registration.userId) {
        const leaderboardLine = outcome.leaderboardChanged
          ? ` Your leaderboard display is now “${describeLeaderboardState(outcome.after)}”.`
          : '';
        notifyWithRetryInBackground('registration.updated_by_organiser', {
          notification: {
            userId: registration.userId,
            type: 'registration_updated',
            title: 'Your registration was updated',
            message: `An organizer updated your registration for ${event.title || 'an event'}.${leaderboardLine}`,
            href: `/my-registrations#registration-${String(registration._id)}`,
            metadata: {
              registrationId: String(registration._id),
              eventId: String(event._id),
              eventTitle: event.title || ''
            }
          },
          email: registration.participant?.email ? {
            to: registration.participant.email,
            firstName: registration.participant?.firstName || 'Runner',
            eventTitle: event.title || 'Event',
            confirmationCode: registration.confirmationCode || '',
            recipientUserId: registration.userId,
            changeSummary: outcome.leaderboardChanged
              ? `Leaderboard display: ${describeLeaderboardState(outcome.after)}`
              : 'Registration details were updated.',
            reason,
            metadata: {
              registrationId: String(registration._id),
              eventId: String(event._id)
            }
          } : null
        }, { source: 'organizer.registration_details_update' });
      }

      return res.redirect(
        `${listPath}?msg=${encodeURIComponent(`${runnerName} was updated.`)}`
      );
    } catch (error) {
      logger.error('Error updating registration details:', error);
      return fail(error.message || 'Could not update that registration.');
    }
  }
);

module.exports = router;
