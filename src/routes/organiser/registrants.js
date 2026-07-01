// src/routes/organiser/registrants.js
const express = require('express');
const router = express.Router();
const {
  logger,
  User,
  Event,
  Registration,
  Submission,
  AccumulatedActivitySubmission,
  ExcelJS,
  requireAuth,
  registrantExportLimiter,
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
  getRegistrantExportData,
  mapSubmissionForRegistrant,
  formatExpectedPaymentLabel,
  formatGenderLabel,
  formatAgeFromDateOfBirth,
  formatDateTime,
  csvEscape,
  canAccessRegistrantReview,
  getRegistrantAccessibleEventOrNull,
  getPageMessage,
  getRequestIpAddress,
  getRequestUserAgent
} = require('./_shared');

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
      requestedPage
    } = filterContext;

    const registrantQuery = { ...query };
    if (selectedResultStatus) {
      registrantQuery._id = {
        $in: await getRegistrationIdsWithSubmissionStatus(event._id, selectedResultStatus)
      };
    }

    const filteredRegistrantsCount = await Registration.countDocuments(registrantQuery);
    const totalPages = Math.max(1, Math.ceil(filteredRegistrantsCount / REGISTRANTS_PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const pageStart = (page - 1) * REGISTRANTS_PAGE_SIZE;

    const registrationsRaw = filteredRegistrantsCount > 0
      ? await Registration.find(registrantQuery)
        .sort({ registeredAt: -1 })
        .skip(pageStart)
        .limit(REGISTRANTS_PAGE_SIZE)
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
      waiverAcceptedAtLabel: formatDateTime(item.waiver?.acceptedAt),
      paymentProofUploadedAtLabel: formatDateTime(item.paymentProof?.uploadedAt),
      paymentReviewedAtLabel: formatDateTime(item.paymentReviewedAt),
      expectedPaymentLabel: formatExpectedPaymentLabel(item, event),
      signupOptionLabel: item.pricingSnapshot?.optionDescription || '',
      pricingPeriodLabel: item.pricingSnapshot?.pricingPeriodLabel || '',
      accumulatedProgress: event.virtualCompletionMode === 'accumulated_distance'
        ? buildAccumulatedProgress({
          activities: accumulatedProgressActivitiesByRegistrationId.get(String(item._id)) || [],
          targetDistanceKm: event.targetDistanceKm
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

    const [
      registrationSummaryCounts,
      standardSubmissionSummaryCounts,
      accumulatedSubmissionSummaryCounts
    ] = await Promise.all([
      getEventRegistrationSummaryCounts(event._id),
      getEventSubmissionSummaryCounts(Submission, event._id),
      event.virtualCompletionMode === 'accumulated_distance'
        ? getEventSubmissionSummaryCounts(AccumulatedActivitySubmission, event._id)
        : { submitted: 0, approved: 0, rejected: 0 }
    ]);

    return res.render('organizer/event-registrants', {
      title: `Registrants - ${event.title}`,
      user,
      isAdminViewer: user.role === 'admin',
      event,
      registrations,
      selectedMode,
      selectedDistance,
      selectedPaymentStatus: filterContext.selectedPaymentStatus,
      selectedResultStatus,
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
        pageSize: REGISTRANTS_PAGE_SIZE,
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

    const { query } = getRegistrantFilterContext(event, req.query);
    const registrations = await Registration.find(query).sort({ registeredAt: -1 }).lean();
    const { headers, rows } = getRegistrantExportData(registrations);

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

    const { query } = getRegistrantFilterContext(event, req.query);
    const registrations = await Registration.find(query).sort({ registeredAt: -1 }).lean();
    const { headers, rows } = getRegistrantExportData(registrations);

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

module.exports = router;
