'use strict';

const {
  User, OrganiserApplication, Registration, Submission, Event, Blog, BlogComment, BlogReport,
  logger, uploadService, publishEvent, recordCriticalAuditEventInBackground,
  ADMIN_EVENT_STATUSES,
  normalizeAdminEventFilters, buildAdminEventQuery, getEventCountsById, formatEventStatusLabel,
  getAdminPageMessage, renderServerError, findAdminEventOrNull, getPublishReadinessErrors,
  getAdminEventRedirect, buildAdminRedirect, buildEventDetailsHtml,
  getCreateEventFormDataFromEvent, validateCreateEventForm, applyEventFormData,
  countries, DEFAULT_WAIVER_TEMPLATE, formatAdminShortDate, formatAdminDateTime,
  getRequestIpAddress, getRequestUserAgent,
  verifyAdminDeletionPassword, getTestDataCounts, purgeTestData, isFullAdminTier
} = require('./_shared');
const {
  buildCsvContent,
  buildMultiSheetXlsxBuffer,
  buildExportFilename
} = require('../../utils/tabular-export');
const {
  dispatchEventPromotionCampaignInBackground,
  hydrateSelectedPromotionRecipients,
  resolveAdminPromotionRecipients
} = require('../../services/event-promotion.service');

// SECTION: Event Management
// ═══════════════════════════════════════════════════════════

exports.listEvents = async (req, res) => {
  try {
    const filters = normalizeAdminEventFilters(req.query);
    const isAll = filters.perPage === 'all';
    const limit = isAll ? 0 : Number(filters.perPage || 25);
    const skip = isAll ? 0 : (filters.page - 1) * limit;
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

    const eventQuery = Event.find(query)
      .populate('organizerId', 'firstName lastName email')
      .sort(sort);
    if (!isAll) {
      eventQuery.skip(skip).limit(limit);
    }

    const [totalEvents, events, statusCounts, testDataCount] = await Promise.all([
      Event.countDocuments(query),
      eventQuery.lean(),
      Event.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Event.countDocuments({ isTestData: true })
    ]);
    const testDataCascadeCounts = filters.testData ? await getTestDataCounts() : null;
    const viewer = await User.findById(req.session.userId).select('adminTier').lean();

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
      title: 'Event Management - HelloRun Admin',
      message: getAdminPageMessage(req.query),
      filters,
      events: eventRows,
      pagination: {
        page: filters.page,
        totalPages: isAll ? 1 : Math.max(1, Math.ceil(totalEvents / limit)),
        totalEvents
      },
      statusCounts: {
        pendingReview: statusCountMap.get('pending_review') || 0,
        draft: statusCountMap.get('draft') || 0,
        published: statusCountMap.get('published') || 0,
        archived: statusCountMap.get('archived') || 0
      },
      testDataCount,
      testDataCascadeCounts,
      viewerIsFullAdmin: isFullAdminTier(viewer)
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

exports.toggleEventSitemapExclusion = async (req, res) => {
  try {
    const event = await findAdminEventOrNull(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    if (event.isTestData) {
      return res.redirect(getAdminEventRedirect(event._id, 'error', 'Test data events cannot have their sitemap status changed.'));
    }
    event.excludeFromSitemap = req.body.excludeFromSitemap === '1';
    await event.save();
    const msg = event.excludeFromSitemap ? 'Event excluded from sitemap.' : 'Event re-included in sitemap.';
    return res.redirect(getAdminEventRedirect(event._id, 'success', msg));
  } catch (error) {
    return renderServerError(res, error, 'Unable to update sitemap exclusion.');
  }
};

exports.approveEvent = async (req, res) => {
  try {
    const event = await findAdminEventOrNull(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    if (event.status !== 'pending_review') {
      return res.status(409).json({ success: false, message: 'Only pending review events can be approved.' });
    }
    try {
      await publishEvent(event, {
        approvalSource: 'admin',
        actorUserId: req.session.userId,
        approvalNote: req.body?.approvalNote,
        ipAddress: getRequestIpAddress(req),
        userAgent: getRequestUserAgent(req)
      });
    } catch (error) {
      if (Array.isArray(error.readinessErrors) && error.readinessErrors.length) {
        return res.status(400).json({ success: false, message: error.readinessErrors[0], errors: error.readinessErrors });
      }
      throw error;
    }
    const organizer = event.organizerId;
    if (organizer?.email) {
      const appUrl = String(process.env.APP_URL || '').replace(/\/+$/, '');
      const eventUrl = appUrl && event.slug ? `${appUrl}/events/${event.slug}` : '';
      const approvalNote = String(req.body?.approvalNote || '').trim().slice(0, 500);
      try {
        await communicationService.notify('event.published', {
          notification: {
            userId: organizer._id,
            type: 'event_published',
            title: 'Event published',
            message: `${event.title} has been approved and published.`,
            href: `/organizer/events/${event._id}`,
            metadata: {
              eventId: String(event._id),
              eventSlug: event.slug || '',
              approvalNote
            }
          },
          email: {
            to: organizer.email,
            recipientUserId: organizer._id,
            firstName: organizer.firstName || 'Organizer',
            eventTitle: event.title,
            eventUrl,
            approvalNote,
            metadata: {
              eventId: String(event._id),
              eventSlug: event.slug || ''
            }
          }
        });
      } catch (notifyError) {
        logger.error('Event published communication failed:', {
          eventId: String(event._id),
          error: notifyError?.message || String(notifyError)
        });
      }
    }
    return res.json({ success: true, message: 'Event approved and published.' });
  } catch (error) {
    logger.error('approveEvent error:', error);
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
    logger.error('archiveEvent error:', error);
    return res.status(500).json({ success: false, message: 'Failed to archive event.' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await findAdminEventOrNull(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    const passwordResult = await verifyAdminDeletionPassword(req);
    if (!passwordResult.ok) return res.status(passwordResult.status).json({ success: false, message: passwordResult.message });
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
    logger.error('deleteEvent error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete event.' });
  }
};

exports.bulkDeleteEvents = async (req, res) => {
  try {
    const passwordResult = await verifyAdminDeletionPassword(req);
    if (!passwordResult.ok) return res.status(passwordResult.status).json({ success: false, message: passwordResult.message });
    const rawIds = [].concat(req.body?.eventIds || []).flatMap((v) => String(v || '').split(','));
    const eventIds = Array.from(new Set(
      rawIds.map((v) => v.trim()).filter((v) => mongoose.Types.ObjectId.isValid(v))
    ));
    if (!eventIds.length) {
      return res.status(400).json({ success: false, message: 'No valid event IDs provided.' });
    }
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 8) {
      return res.status(400).json({ success: false, message: 'Delete reason must be at least 8 characters.' });
    }
    const events = await Event.find({ _id: { $in: eventIds }, isDeleted: { $ne: true } });
    if (!events.length) {
      return res.status(404).json({ success: false, message: 'No eligible events found (they may already be deleted).' });
    }
    const now = new Date();
    const deletedIds = [];
    for (const event of events) {
      const previousStatus = event.status;
      event.isDeleted = true;
      event.deletedAt = now;
      event.deletedBy = req.session.userId;
      event.deleteReason = reason.slice(0, 500);
      await event.save();
      deletedIds.push(String(event._id));
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
        occurredAt: now
      });
    }
    return res.json({ success: true, message: `${deletedIds.length} event${deletedIds.length === 1 ? '' : 's'} soft-deleted.`, deletedCount: deletedIds.length });
  } catch (error) {
    logger.error('bulkDeleteEvents error:', error);
    return res.status(500).json({ success: false, message: 'Failed to bulk-delete events.' });
  }
};

exports.purgeTestData = async (req, res) => {
  try {
    const passwordResult = await verifyAdminDeletionPassword(req);
    if (!passwordResult.ok) return res.status(passwordResult.status).json({ success: false, message: passwordResult.message });
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 8) {
      return res.status(400).json({ success: false, message: 'Purge reason must be at least 8 characters.' });
    }
    const confirmation = String(req.body?.confirmation || '').trim().toUpperCase();
    if (confirmation !== 'PURGE') {
      return res.status(400).json({ success: false, message: 'Type PURGE to confirm this action.' });
    }
    const summary = await purgeTestData({
      actorUserId: req.session.userId,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req)
    });
    if (!summary.eventsDeleted) {
      return res.json({ success: true, message: 'No test-data events found to purge.', ...summary });
    }
    return res.json({
      success: true,
      message: `Permanently deleted ${summary.eventsDeleted} test-data event${summary.eventsDeleted === 1 ? '' : 's'} and everything linked to them.`,
      ...summary
    });
  } catch (error) {
    logger.error('purgeTestData error:', error);
    return res.status(500).json({ success: false, message: 'Failed to purge test data.' });
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
    logger.error('removeEventMedia error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove media.' });
  }
};

exports.analyticsPage = async (req, res) => {
  try {
    const { getPlatformAnalytics } = require('../../services/platform-analytics.service');
    const VALID_RANGES = ['7d', '30d', '90d', '365d'];
    const range = VALID_RANGES.includes(req.query.range) ? req.query.range : '365d';
    const rangeDays = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
    const since = new Date(Date.now() - rangeDays[range] * 24 * 60 * 60 * 1000);
    const analytics = await getPlatformAnalytics({ since });
    return res.render('admin/analytics', {
      title: 'Platform Analytics - HelloRun Admin',
      analytics,
      range,
      message: getAdminPageMessage(req.query)
    });
  } catch (error) {
    return renderServerError(res, error, 'Unable to load platform analytics.');
  }
};

// SECTION: Analytics Export (CSV/XLSX)
// ═══════════════════════════════════════════════════════════

const ANALYTICS_EXPORT_RANGES = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };

function formatAnalyticsValue(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return value;
}

function flattenAnalyticsSections(analytics, prefix = '') {
  const sections = [];
  if (!analytics || typeof analytics !== 'object') return sections;

  const scalarRows = [];
  for (const [key, value] of Object.entries(analytics)) {
    const label = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) {
      continue;
    } else if (Array.isArray(value)) {
      if (!value.length) {
        sections.push({ sectionName: label, headers: ['Value'], rows: [] });
        continue;
      }
      if (value[0] && typeof value[0] === 'object') {
        const headerSet = new Set();
        value.forEach((item) => Object.keys(item).forEach((k) => headerSet.add(k)));
        const headers = Array.from(headerSet);
        const rows = value.map((item) => headers.map((h) => formatAnalyticsValue(item[h])));
        sections.push({ sectionName: label, headers, rows });
      } else {
        sections.push({ sectionName: label, headers: ['Value'], rows: value.map((v) => [formatAnalyticsValue(v)]) });
      }
    } else if (typeof value === 'object') {
      sections.push(...flattenAnalyticsSections(value, label));
    } else {
      scalarRows.push([key, formatAnalyticsValue(value)]);
    }
  }
  if (scalarRows.length) {
    sections.unshift({ sectionName: prefix || 'summary', headers: ['Metric', 'Value'], rows: scalarRows });
  }
  return sections;
}

function sanitizeAnalyticsSheetName(name, usedNames) {
  let safe = String(name || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet';
  let candidate = safe;
  let suffix = 2;
  while (usedNames.has(candidate)) {
    candidate = `${safe.slice(0, 28)}-${suffix}`;
    suffix += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

async function getAnalyticsForExport(req) {
  const { getPlatformAnalytics } = require('../../services/platform-analytics.service');
  const range = ANALYTICS_EXPORT_RANGES[req.query.range] ? req.query.range : '365d';
  const since = new Date(Date.now() - ANALYTICS_EXPORT_RANGES[range] * 24 * 60 * 60 * 1000);
  const analytics = await getPlatformAnalytics({ since });
  return { range, sections: flattenAnalyticsSections(analytics || {}) };
}

exports.exportAnalyticsCsv = async (req, res) => {
  try {
    const { range, sections } = await getAnalyticsForExport(req);
    const csvBlocks = sections.map((section) => {
      const header = `=== ${section.sectionName} ===`;
      const body = buildCsvContent(section.headers, section.rows);
      return `${header}\n${body}`;
    });
    const csvContent = csvBlocks.join('\n\n');
    const filename = buildExportFilename(`analytics-${range}`, 'csv');

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'admin.analytics_exported',
      targetType: 'analytics',
      targetId: `admin.analytics.${range}`,
      notes: `CSV analytics export generated for range ${range}.`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: new Date()
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while exporting platform analytics.');
  }
};

exports.exportAnalyticsXlsx = async (req, res) => {
  try {
    const { range, sections } = await getAnalyticsForExport(req);
    const usedNames = new Set();
    const sheets = sections.map((section) => ({
      sheetName: sanitizeAnalyticsSheetName(section.sectionName, usedNames),
      headers: section.headers,
      rows: section.rows
    }));
    const buffer = await buildMultiSheetXlsxBuffer({ sheets });
    const filename = buildExportFilename(`analytics-${range}`, 'xlsx');

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'admin.analytics_exported',
      targetType: 'analytics',
      targetId: `admin.analytics.${range}`,
      notes: `XLSX analytics export generated for range ${range}.`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: new Date()
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while exporting platform analytics.');
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
      title: 'Admin Dashboard - HelloRun',
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

// ═══════════════════════════════════════════════════════════
// SECTION: Event Promotion (Admin)
// ═══════════════════════════════════════════════════════════

exports.promotePage = async (req, res) => {
  try {
    const EventPromotion = require('../../models/EventPromotion');
    const DailyEmailUsage = require('../../models/DailyEmailUsage');
    const dateKey = new Date().toISOString().slice(0, 10);

    const [events, recentCampaigns, dailyUsage] = await Promise.all([
      Event.find({ isDeleted: { $ne: true }, status: { $ne: 'archived' } })
        .select('_id title slug status organizerId organizerDisplayName')
        .sort({ updatedAt: -1 })
        .limit(200)
        .lean(),
      EventPromotion.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('eventId', 'title')
        .populate('organizerId', 'firstName lastName')
        .lean(),
      DailyEmailUsage.findOne({ dateKey }).lean()
    ]);

    const platformSent = Number(dailyUsage?.sentCount || 0);
    const platformLimit = Number(dailyUsage?.totalLimit || 100);

    return res.render('admin/promote', {
      title: 'Promote Event - Admin',
      events,
      recentCampaigns,
      platformSent,
      platformRemaining: Math.max(0, platformLimit - platformSent),
      platformLimit,
      message: getAdminPageMessage(req.query)
    });
  } catch (error) {
    return renderServerError(res, error, 'Unable to load promotion page.');
  }
};

exports.promotePreview = async (req, res) => {
  try {
    const { eventId, audience, selectedEmails } = req.query;
    const validAudiences = ['previous_participants', 'non_participants', 'all_runners', 'selected_emails'];
    if (!eventId || !validAudiences.includes(audience)) {
      return res.json({ count: 0 });
    }
    const event = await Event.findById(eventId).select('_id organizerId slug').lean();
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    if (audience === 'selected_emails') {
      const parsed = await hydrateSelectedPromotionRecipients(selectedEmails);
      return res.json({
        count: parsed.recipients.length,
        invalidCount: parsed.invalid.length,
        optedOutCount: parsed.optedOutCount || 0,
        capped: parsed.capped,
        limit: parsed.limit
      });
    }

    const recipients = await resolveAdminPromotionRecipients({ event, audience });
    return res.json({ count: recipients.length });
  } catch (error) {
    logger.error('Admin promote preview error:', error);
    return res.status(500).json({ error: 'Preview failed.' });
  }
};

exports.promoteSend = async (req, res) => {
  const redirectBase = '/admin/promote';
  try {
    const EventPromotion = require('../../models/EventPromotion');
    const { eventId, audience, selectedEmails } = req.body;
    const validAudiences = ['previous_participants', 'non_participants', 'all_runners', 'selected_emails'];
    if (!eventId || !validAudiences.includes(audience)) {
      const q = new URLSearchParams({ type: 'error', msg: 'Invalid promotion request.' });
      return res.redirect(`${redirectBase}?${q}`);
    }

    const event = await Event.findById(eventId).select('_id title slug organizerId organizerDisplayName posterImageUrl bannerImageUrl').lean();
    if (!event) {
      const q = new URLSearchParams({ type: 'error', msg: 'Event not found.' });
      return res.redirect(`${redirectBase}?${q}`);
    }

    const selectedEmailResult = audience === 'selected_emails'
      ? await hydrateSelectedPromotionRecipients(selectedEmails)
      : null;
    if (selectedEmailResult && selectedEmailResult.invalid.length) {
      const q = new URLSearchParams({ type: 'error', msg: `${selectedEmailResult.invalid.length} invalid email${selectedEmailResult.invalid.length === 1 ? '' : 's'} found. Please fix the selected email list.` });
      return res.redirect(`${redirectBase}?${q}`);
    }

    const recipients = selectedEmailResult
      ? selectedEmailResult.recipients
      : await resolveAdminPromotionRecipients({ event, audience });
    if (!recipients.length) {
      const q = new URLSearchParams({ type: 'error', msg: 'No eligible recipients found.' });
      return res.redirect(`${redirectBase}?${q}`);
    }

    const dateKey = new Date().toISOString().slice(0, 10);
    // recipientCount is set up front so daily-quota sums include in-flight campaigns.
    const campaign = await EventPromotion.create({
      organizerId: event.organizerId,
      eventId: event._id,
      audience,
      recipientCount: recipients.length,
      selectedCount: recipients.length,
      dateKey,
      status: 'sending',
      adminTriggered: true,
      sentAt: new Date()
    });

    const organiserName = event.organizerDisplayName || 'an organiser';

    // Sends are throttled to respect the email provider's rate limit, so a large
    // campaign takes minutes — dispatch in the background and redirect immediately.
    dispatchEventPromotionCampaignInBackground({
      campaign,
      recipients,
      event,
      organiserName,
      source: 'event.promotion.admin',
      adminTriggered: true
    });

    const resultText = `Promotion started for ${recipients.length} runner${recipients.length !== 1 ? 's' : ''}. Progress appears under Recent Campaigns.`;
    const q = new URLSearchParams({ type: 'success', msg: resultText });
    return res.redirect(`${redirectBase}?${q}`);
  } catch (error) {
    logger.error('Admin promote send error:', error);
    const q = new URLSearchParams({ type: 'error', msg: 'An error occurred while sending the promotion.' });
    return res.redirect(`${redirectBase}?${q}`);
  }
};
