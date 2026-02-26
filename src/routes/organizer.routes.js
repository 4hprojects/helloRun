const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const OrganiserApplication = require('../models/OrganiserApplication');
const uploadService = require('../services/upload.service');
const emailService = require('../services/email.service');
const { requireAuth, requireApprovedOrganizer } = require('../middleware/auth.middleware');
const { getCountries, isValidCountryCode, normalizeCountryCode, getCountryName } = require('../utils/country');
const { DEFAULT_WAIVER_TEMPLATE, normalizeWaiverTemplate } = require('../utils/waiver');

const countries = getCountries();
const RACE_DISTANCE_PRESETS = new Set(['3K', '5K', '10K', '21K']);

/* ==========================================
   GET: Organizer Dashboard
   ========================================== */

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    // Only organiser role can access
    if (user.role !== 'organiser') {
      return res.status(403).render('error', {
        title: '403 - Access Denied',
        status: 403,
        message: 'Only organizers can access this page.'
      });
    }

    // Get application info (may be null)
    const application = await OrganiserApplication.findOne({
      userId: req.session.userId
    });

    const now = new Date();
    const eventQuery = { organizerId: user._id };

    const [totalEvents, activeEvents, upcomingEvents, recentEventDocs, organizerEventIdDocs] = await Promise.all([
      Event.countDocuments(eventQuery),
      Event.countDocuments({ ...eventQuery, status: 'published', eventEndAt: { $gte: now } }),
      Event.countDocuments({ ...eventQuery, status: 'published', eventStartAt: { $gt: now } }),
      Event.find(eventQuery).sort({ createdAt: -1 }).limit(5),
      Event.find(eventQuery).select('_id').lean()
    ]);

    const organizerEventIds = organizerEventIdDocs.map((eventDoc) => eventDoc._id);
    const recentEventIds = recentEventDocs.map((eventDoc) => eventDoc._id);

    const [totalRegistrations, recentRegistrationCounts] = await Promise.all([
      organizerEventIds.length
        ? Registration.countDocuments({ eventId: { $in: organizerEventIds } })
        : 0,
      recentEventIds.length
        ? Registration.aggregate([
            { $match: { eventId: { $in: recentEventIds } } },
            { $group: { _id: '$eventId', count: { $sum: 1 } } }
          ])
        : []
    ]);

    const recentRegistrationsByEventId = new Map(
      recentRegistrationCounts.map((item) => [String(item._id), item.count])
    );

    const recentEvents = recentEventDocs.map((event) => ({
      id: event._id,
      name: event.title,
      date: event.eventStartAt || event.createdAt,
      location: [event.venueName, event.city, event.country].filter(Boolean).join(', ') || 'TBA',
      status: event.status,
      registrations: recentRegistrationsByEventId.get(String(event._id)) || 0
    }));

    // Build dashboard data
    const dashboardData = {
      title: 'Organizer Dashboard - helloRun',
      user: user,
      application: application || null,
      adminEmail: process.env.ADMIN_EMAIL || 'hellorunonline@gmail.com',
      stats: {
        totalEvents,
        activeEvents,
        totalRegistrations,
        upcomingEvents
      },
      recentEvents,
      quickActions: [
        {
          icon: 'plus-circle',
          label: 'Create Event',
          href: '/organizer/create-event',
          description: 'Set up a new running event'
        },
        {
          icon: 'calendar',
          label: 'My Events',
          href: '/organizer/events',
          description: 'Manage your events'
        },
        {
          icon: 'users',
          label: 'Participants',
          href: '/organizer/participants',
          description: 'View registrations'
        },
        {
          icon: 'settings',
          label: 'Settings',
          href: '/organizer/settings',
          description: 'Account settings'
        }
      ],
      approvedDate: application && application.reviewedAt
        ? new Date(application.reviewedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : application && application.submittedAt
        ? new Date(application.submittedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : null
    };

    res.render('organizer/dashboard', dashboardData);
  } catch (error) {
    console.error('Error loading organizer dashboard:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the dashboard.'
    });
  }
});

/* ==========================================
   GET: Create Event Page (Approved Organizers)
   ========================================== */

router.get('/create-event', requireApprovedOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    return res.render('organizer/create-event', {
      title: 'Create Event - helloRun',
      user,
      errors: {},
      formData: getCreateEventFormData(),
      countries,
      defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
      message: getPageMessage(req.query)
    });
  } catch (error) {
    console.error('Error loading create-event page:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the event creation page.'
    });
  }
});

/* ==========================================
   GET: Event Preview (Approved Organizers)
   ========================================== */

router.get('/preview-event', requireApprovedOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const formData = getCreateEventFormData(req.query);
    const errors = validateCreateEventForm(formData);
    const eventTypesAllowed = getEventTypesAllowed(formData.eventType);

    const previewEvent = {
      ...formData,
      eventTypesAllowed,
      registrationOpenAt: parseDateSafe(formData.registrationOpenAt),
      registrationCloseAt: parseDateSafe(formData.registrationCloseAt),
      eventStartAt: parseDateSafe(formData.eventStartAt),
      eventEndAt: parseDateSafe(formData.eventEndAt),
      virtualWindow: {
        startAt: parseDateSafe(formData.virtualStartAt),
        endAt: parseDateSafe(formData.virtualEndAt)
      },
      geo: formData.geoLat && formData.geoLng
        ? { lat: Number(formData.geoLat), lng: Number(formData.geoLng) }
        : null
    };

    return res.render('organizer/event-preview', {
      title: 'Preview Event - helloRun',
      user,
      previewEvent,
      errors
    });
  } catch (error) {
    console.error('Error loading event preview page:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the event preview page.'
    });
  }
});

/* ==========================================
   GET: My Events (Approved Organizers)
   ========================================== */

router.get('/events', requireApprovedOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const selectedStatus = ['draft', 'published', 'closed'].includes(req.query.status)
      ? req.query.status
      : '';
    const selectedSort = ['newest', 'oldest', 'start_asc', 'start_desc'].includes(req.query.sort)
      ? req.query.sort
      : 'newest';
    const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';

    const query = { organizerId: user._id };
    if (selectedStatus) {
      query.status = selectedStatus;
    }
    if (searchQuery) {
      const safePattern = new RegExp(escapeRegex(searchQuery), 'i');
      query.$or = [
        { title: safePattern },
        { organiserName: safePattern },
        { slug: safePattern },
        { venueName: safePattern },
        { city: safePattern },
        { country: safePattern }
      ];
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      start_asc: { eventStartAt: 1, createdAt: -1 },
      start_desc: { eventStartAt: -1, createdAt: -1 }
    };

    const events = await Event.find(query).sort(sortMap[selectedSort]);

    return res.render('organizer/events', {
      title: 'My Events - helloRun',
      user,
      events,
      selectedStatus,
      selectedSort,
      searchQuery,
      message: getPageMessage(req.query)
    });
  } catch (error) {
    console.error('Error loading organizer events:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your events.'
    });
  }
});

/* ==========================================
   GET: Event Details (Owner Only)
   ========================================== */

router.get('/events/:id', requireApprovedOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const event = await getOwnedEventOrNull(req.params.id, user._id);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found or you do not have access.'
      });
    }
    return res.render('organizer/event-details', {
      title: `Event Details - ${event.title}`,
      user,
      event,
      message: getPageMessage(req.query)
    });
  } catch (error) {
    console.error('Error loading event details:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading event details.'
    });
  }
});

/* ==========================================
   GET: Event Registrants (Owner Only)
   ========================================== */

router.get('/events/:id/registrants', requireApprovedOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const event = await getOwnedEventOrNull(req.params.id, user._id);
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
      searchQuery
    } = filterContext;

    const registrationsRaw = await Registration.find(query)
      .sort({ registeredAt: -1 })
      .lean();

    const registrations = registrationsRaw.map((item) => ({
      ...item,
      participant: {
        ...item.participant,
        countryLabel: getCountryName(item.participant?.country),
        genderLabel: formatGenderLabel(item.participant?.gender),
        ageLabel: formatAgeFromDateOfBirth(item.participant?.dateOfBirth)
      },
      waiverAcceptedAtLabel: formatDateTime(item.waiver?.acceptedAt)
    }));

    const [totalRegistrants, virtualCount, onsiteCount] = await Promise.all([
      Registration.countDocuments({ eventId: event._id }),
      Registration.countDocuments({ eventId: event._id, participationMode: 'virtual' }),
      Registration.countDocuments({ eventId: event._id, participationMode: 'onsite' })
    ]);

    return res.render('organizer/event-registrants', {
      title: `Registrants - ${event.title}`,
      user,
      event,
      registrations,
      selectedMode,
      selectedDistance,
      eventRaceDistances,
      searchQuery,
      exportQuery: buildRegistrantExportQuery(filterContext),
      summary: {
        totalRegistrants,
        virtualCount,
        onsiteCount
      },
      message: getPageMessage(req.query)
    });
  } catch (error) {
    console.error('Error loading event registrants:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading event registrants.'
    });
  }
});

router.get('/events/:id/registrants/export', requireApprovedOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const event = await getOwnedEventOrNull(req.params.id, user._id);
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

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting event registrants CSV:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while exporting registrants.'
    });
  }
});

router.get('/events/:id/registrants/export-xlsx', requireApprovedOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const event = await getOwnedEventOrNull(req.params.id, user._id);
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

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrants');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const safeSlug = String(event.slug || 'event').replace(/[^a-zA-Z0-9-_]/g, '');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${safeSlug}-registrants-${timestamp}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Error exporting event registrants XLSX:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while exporting registrants.'
    });
  }
});

/* ==========================================
   GET: Edit Event (Owner Only)
   ========================================== */

router.get('/events/:id/edit', requireApprovedOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const event = await getOwnedEventOrNull(req.params.id, user._id);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found or you do not have access.'
      });
    }
    if (event.status === 'closed') {
      const query = new URLSearchParams({
        type: 'error',
        msg: 'Closed events cannot be edited.'
      });
      return res.redirect(`/organizer/events/${event._id}?${query.toString()}`);
    }

    return res.render('organizer/edit-event', {
      title: `Edit Event - ${event.title}`,
      user,
      event,
      errors: {},
      formData: getCreateEventFormDataFromEvent(event),
      countries,
      defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
      message: getPageMessage(req.query)
    });
  } catch (error) {
    console.error('Error loading event edit page:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading event edit page.'
    });
  }
});

/* ==========================================
   POST: Update Event (Owner Only)
   ========================================== */

router.post('/events/:id/edit', requireApprovedOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const event = await getOwnedEventOrNull(req.params.id, user._id);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found or you do not have access.'
      });
    }
    if (event.status === 'closed') {
      const query = new URLSearchParams({
        type: 'error',
        msg: 'Closed events cannot be edited.'
      });
      return res.redirect(`/organizer/events/${event._id}?${query.toString()}`);
    }

    const formData = getCreateEventFormData(req.body);
    const validationErrors = validateCreateEventForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).render('organizer/edit-event', {
        title: `Edit Event - ${event.title}`,
        user,
        event,
        errors: validationErrors,
        formData,
        countries,
        defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
        message: null
      });
    }

    const organiserNameFromUser = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const organiserName = formData.organiserName || organiserNameFromUser || 'helloRun Organizer';
    const eventTypesAllowed = getEventTypesAllowed(formData.eventType);

    event.title = formData.title;
    event.organiserName = organiserName;
    event.description = formData.description;
    event.eventType = formData.eventType;
    event.eventTypesAllowed = eventTypesAllowed;
    event.raceDistances = formData.raceDistances;
    event.registrationOpenAt = parseDateSafe(formData.registrationOpenAt);
    event.registrationCloseAt = parseDateSafe(formData.registrationCloseAt);
    event.eventStartAt = parseDateSafe(formData.eventStartAt);
    event.eventEndAt = parseDateSafe(formData.eventEndAt);
    event.venueName = formData.venueName || '';
    event.venueAddress = formData.venueAddress || '';
    event.city = formData.city || '';
    event.province = formData.province || '';
    event.country = formData.country || '';
    event.geo = formData.geoLat && formData.geoLng
      ? { lat: Number(formData.geoLat), lng: Number(formData.geoLng) }
      : undefined;
    const isVirtualMode = formData.eventType === 'virtual' || formData.eventType === 'hybrid';

    event.virtualWindow = isVirtualMode && formData.virtualStartAt && formData.virtualEndAt
      ? {
          startAt: parseDateSafe(formData.virtualStartAt),
          endAt: parseDateSafe(formData.virtualEndAt)
        }
      : undefined;
    event.proofTypesAllowed = isVirtualMode ? formData.proofTypesAllowed : [];
    event.bannerImageUrl = formData.bannerImageUrl || '';
    event.logoUrl = formData.logoUrl || '';
    const normalizedWaiverTemplate = normalizeWaiverTemplate(formData.waiverTemplate);
    const previousWaiverTemplate = normalizeWaiverTemplate(event.waiverTemplate || DEFAULT_WAIVER_TEMPLATE);
    if (previousWaiverTemplate !== normalizedWaiverTemplate) {
      event.waiverVersion = Number(event.waiverVersion || 1) + 1;
    } else if (!event.waiverVersion) {
      event.waiverVersion = 1;
    }
    event.waiverTemplate = normalizedWaiverTemplate;

    await event.save();

    const query = new URLSearchParams({
      type: 'success',
      msg: 'Event updated successfully.'
    });
    return res.redirect(`/organizer/events/${event._id}?${query.toString()}`);
  } catch (error) {
    console.error('Error updating event:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while updating event.'
    });
  }
});

/* ==========================================
   POST: Event Status Transition (Owner Only)
   ========================================== */

router.post('/events/:id/status', requireApprovedOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const event = await getOwnedEventOrNull(req.params.id, user._id);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found or you do not have access.'
      });
    }

    const nextStatus = typeof req.body.nextStatus === 'string' ? req.body.nextStatus.trim() : '';
    const transitionError = getStatusTransitionError(event.status, nextStatus);
    if (transitionError) {
      const q = new URLSearchParams({ type: 'error', msg: transitionError });
      return res.redirect(`/organizer/events/${event._id}?${q.toString()}`);
    }

    if (nextStatus === 'published') {
      const readinessErrors = getPublishReadinessErrors(event);
      if (readinessErrors.length) {
        const q = new URLSearchParams({
          type: 'error',
          msg: `Cannot publish yet: ${readinessErrors[0]}`
        });
        return res.redirect(`/organizer/events/${event._id}?${q.toString()}`);
      }
    }

    event.status = nextStatus;
    await event.save();

    const q = new URLSearchParams({
      type: 'success',
      msg: `Event status updated to ${nextStatus}.`
    });
    return res.redirect(`/organizer/events/${event._id}?${q.toString()}`);
  } catch (error) {
    console.error('Error updating event status:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while updating event status.'
    });
  }
});

/* ==========================================
   POST: Create Event (Approved Organizers)
   ========================================== */

router.post('/create-event', requireApprovedOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const formData = getCreateEventFormData(req.body);
    const validationErrors = validateCreateEventForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).render('organizer/create-event', {
        title: 'Create Event - helloRun',
        user,
        errors: validationErrors,
        formData,
        countries,
        defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
        message: null
      });
    }

    const organiserNameFromUser = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const organiserName = formData.organiserName || organiserNameFromUser || 'helloRun Organizer';
    const status = formData.actionType === 'publish' ? 'published' : 'draft';
    const slug = await generateUniqueSlug(formData.title);
    const eventTypesAllowed = getEventTypesAllowed(formData.eventType);

    const event = new Event({
      organizerId: user._id,
      slug,
      title: formData.title,
      organiserName,
      description: formData.description,
      status,
      eventType: formData.eventType,
      eventTypesAllowed,
      raceDistances: formData.raceDistances,
      registrationOpenAt: parseDateSafe(formData.registrationOpenAt),
      registrationCloseAt: parseDateSafe(formData.registrationCloseAt),
      eventStartAt: parseDateSafe(formData.eventStartAt),
      eventEndAt: parseDateSafe(formData.eventEndAt),
      venueName: formData.venueName || '',
      venueAddress: formData.venueAddress || '',
      city: formData.city || '',
      province: formData.province || '',
      country: formData.country || '',
      geo: formData.geoLat && formData.geoLng
        ? { lat: Number(formData.geoLat), lng: Number(formData.geoLng) }
        : undefined,
      virtualWindow: (formData.eventType === 'virtual' || formData.eventType === 'hybrid') && formData.virtualStartAt && formData.virtualEndAt
        ? {
            startAt: parseDateSafe(formData.virtualStartAt),
            endAt: parseDateSafe(formData.virtualEndAt)
          }
        : undefined,
      proofTypesAllowed: formData.eventType === 'virtual' || formData.eventType === 'hybrid'
        ? formData.proofTypesAllowed
        : [],
      bannerImageUrl: formData.bannerImageUrl || '',
      logoUrl: formData.logoUrl || '',
      waiverTemplate: normalizeWaiverTemplate(formData.waiverTemplate),
      waiverVersion: 1
    });

    await event.save();

    const successText = status === 'published'
      ? 'Event published successfully.'
      : 'Event saved as draft successfully.';

    const query = new URLSearchParams({ type: 'success', msg: successText });
    return res.redirect(`/organizer/create-event?${query.toString()}`);
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while creating the event.'
    });
  }
});

/* ==========================================
   GET: Complete Profile Page
   ========================================== */

router.get('/complete-profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    // Try to find the user's organizer application
    const application = await OrganiserApplication.findOne({ userId: user._id });

    res.render('organizer/complete-profile', {
      title: 'Complete Organizer Profile - helloRun',
      user: user,
      application: application || null,
      ORGANIZER_REVIEW_TIME_DAYS: process.env.ORGANIZER_REVIEW_TIME_DAYS || 3
    });
  } catch (error) {
    console.error('Error loading complete-profile:', error);
    res.status(500).send('Server error');
  }
});

/* ==========================================
   POST: Complete Profile Submission
   ========================================== */

router.post(
  '/complete-profile',
  requireAuth,
  uploadService.uploadOrganizerDocs,
  async (req, res) => {
    try {
      // ========== STEP 1: Validate Authentication ==========
      const userId = req.session.userId;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found or session expired.'
        });
      }

      if (user.role !== 'organiser') {
        return res.status(403).json({
          success: false,
          message: 'Only organizers can submit applications.'
        });
      }

      // ========== STEP 2: Validate Existing Application ==========
      const existingApplication = await OrganiserApplication.findOne({
        userId: userId
      });

      if (existingApplication && existingApplication.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'You have already been approved as an organizer.'
        });
      }

      if (existingApplication && existingApplication.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Your application is already under review. Please wait for feedback.'
        });
      }

      // ========== STEP 3: Validate Request Body ==========
      const {
        businessName,
        businessType,
        contactPhone,
        businessRegistrationNumber,
        businessAddress,
        additionalInfo,
        terms: agreeTerms
      } = req.body;

      // Validate required fields
      const errors = {};

      if (!businessName || businessName.trim().length < 2) {
        errors.businessName = 'Business name is required (minimum 2 characters)';
      }

      if (!businessType || !['individual', 'company', 'ngo', 'sports_club'].includes(businessType)) {
        errors.businessType = 'Please select a valid business type';
      }

      if (!contactPhone || !isValidPhone(contactPhone)) {
        errors.contactPhone = 'Please provide a valid phone number';
      }

      if (businessAddress && businessAddress.length > 500) {
        errors.businessAddress = 'Address must not exceed 500 characters';
      }

      if (additionalInfo && additionalInfo.length > 500) {
        errors.additionalInfo = 'Additional info must not exceed 500 characters';
      }

      if (!agreeTerms) {
        errors.agreeTerms = 'You must accept the terms and conditions';
      }

      // Return validation errors if any
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Please fix the errors and try again',
          errors: errors
        });
      }

      // ========== STEP 4: Validate File Uploads ==========
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please upload both ID proof and business proof documents'
        });
      }

      const idProofFile = req.files.idProof ? req.files.idProof[0] : null;
      const businessProofFile = req.files.businessProof ? req.files.businessProof[0] : null;

      if (!idProofFile) {
        return res.status(400).json({
          success: false,
          message: 'ID proof document is required'
        });
      }

      if (!businessProofFile) {
        return res.status(400).json({
          success: false,
          message: 'Business proof document is required'
        });
      }

      const fileValidation = validateFiles([idProofFile, businessProofFile]);
      if (!fileValidation.valid) {
        // Delete uploaded files on validation failure
        uploadService.deleteFiles([idProofFile.filename, businessProofFile.filename]);
        
        return res.status(400).json({
          success: false,
          message: fileValidation.error
        });
      }

      // ========== STEP 5: Create OrganiserApplication Record ==========
      let application;

      try {
        application = new OrganiserApplication({
          userId: userId,
          businessName: businessName.trim(),
          businessType: businessType,
          contactPhone: contactPhone.trim(),
          businessRegistrationNumber: businessRegistrationNumber?.trim() || '',
          businessAddress: businessAddress?.trim() || '',
          idProofUrl: `/uploads/organizer-docs/${idProofFile.filename}`,
          businessProofUrl: `/uploads/organizer-docs/${businessProofFile.filename}`,
          additionalInfo: additionalInfo?.trim() || '',
          status: 'pending',
          submittedAt: new Date()
        });

        // Save application (auto-generates applicationId via pre-save hook)
        await application.save();
      } catch (dbError) {
        console.error('Database save error:', dbError);

        // Delete uploaded files on database failure
        uploadService.deleteFiles([idProofFile.filename, businessProofFile.filename]);

        return res.status(500).json({
          success: false,
          message: 'Failed to save application. Please try again.'
        });
      }

      // ========== STEP 6: Update User Status ==========
      try {
        user.organizerApplicationId = application._id;
        user.organizerStatus = 'pending';
        await user.save();
      } catch (updateError) {
        console.error('User update error:', updateError);
        // Continue even if user update fails - application is already saved
      }

      // ========== STEP 7: Send Confirmation Email ==========
      try {
        await emailService.sendApplicationSubmittedEmail(
          user.email,
          user.firstName || 'Organizer',
          application.applicationId
        );
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the submission if email fails
      }

      // ========== STEP 8: Send Success Response ==========
      return res.status(201).json({
        success: true,
        message: 'Application submitted successfully!',
        applicationId: application.applicationId,
        redirectUrl: '/organizer/application-status'
      });

    } catch (error) {
      console.error('Unexpected error in complete-profile POST:', error);

      // Attempt to delete uploaded files if they exist
      if (req.files) {
        const filenames = [];
        if (req.files.idProof && req.files.idProof[0]) filenames.push(req.files.idProof[0].filename);
        if (req.files.businessProof && req.files.businessProof[0]) filenames.push(req.files.businessProof[0].filename);

        if (filenames.length > 0) {
          uploadService.deleteFiles(filenames);
        }
      }

      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred. Please try again later.'
      });
    }
  }
);

/* ==========================================
   GET: Application Status Page
   ========================================== */

router.get('/application-status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    // Check if user has submitted an application
    const application = await OrganiserApplication.findOne({
      userId: req.session.userId
    });

    if (!application) {
      return res.redirect('/organizer/complete-profile');
    }

    // Calculate days since submission
    const submittedDate = new Date(application.submittedAt);
    const daysAgo = Math.floor((Date.now() - submittedDate) / (1000 * 60 * 60 * 24));

    // Calculate estimated review completion date
    const reviewDays = parseInt(process.env.ORGANIZER_REVIEW_TIME_DAYS) || 3;
    const estimatedDate = new Date(submittedDate);
    estimatedDate.setDate(estimatedDate.getDate() + reviewDays);

    res.render('organizer/application-status', {
      title: 'Application Status - helloRun',
      user: user,
      application: application,
      daysAgo: daysAgo,
      estimatedDate: estimatedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      submittedDate: submittedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      reviewDays: reviewDays,
      adminEmail: process.env.ADMIN_EMAIL || 'hellorunonline@gmail.com'
    });
  } catch (error) {
    console.error('Error loading application status:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your application status.'
    });
  }
});

/* ==========================================
   HELPER METHODS
   ========================================== */

/**
 * Validate phone number format
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  // Allow various phone formats with at least 7 digits
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  const digitsOnly = phone.replace(/\D/g, '');
  return phoneRegex.test(phone) && digitsOnly.length >= 7;
}

/**
 * Validate uploaded files
 */
function validateFiles(files) {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 5242880; // 5MB

  for (const file of files) {
    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `Invalid file type: ${file.originalname}. Please upload PDF, JPG, or PNG files only.`
      };
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024);
      return {
        valid: false,
        error: `File ${file.originalname} exceeds ${maxSizeMB}MB limit.`
      };
    }
  }

  return { valid: true };
}

function getPageMessage(query) {
  const msg = typeof query.msg === 'string' ? query.msg.trim() : '';
  if (!msg) return null;
  const type = query.type === 'error' ? 'error' : 'success';
  return { type, text: msg.slice(0, 200) };
}

function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function normalizeProofTypes(value) {
  const allowed = new Set(['gps', 'photo', 'manual']);
  return normalizeArray(value)
    .map((item) => String(item || '').trim())
    .filter((item) => allowed.has(item));
}

function normalizeRaceDistanceLabel(value) {
  if (!value) return '';
  const compact = String(value)
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/[^0-9A-Z.]/g, '');
  if (!compact || compact.length > 30) return '';
  return compact;
}

function normalizeRaceDistances(presetValues, customDistancesRaw) {
  const presetDistances = normalizeArray(presetValues).map(normalizeRaceDistanceLabel);
  const customDistances = String(customDistancesRaw || '')
    .split(',')
    .map((item) => normalizeRaceDistanceLabel(item));
  return Array.from(new Set([...presetDistances, ...customDistances].filter(Boolean)));
}

function getRegistrantFilterContext(event, queryParams = {}) {
  const selectedMode = ['virtual', 'onsite'].includes(queryParams.mode)
    ? queryParams.mode
    : '';
  const eventRaceDistances = Array.isArray(event.raceDistances) ? event.raceDistances : [];
  const selectedDistance = eventRaceDistances.includes(queryParams.distance)
    ? queryParams.distance
    : '';
  const searchQuery = typeof queryParams.q === 'string' ? queryParams.q.trim().slice(0, 80) : '';

  const query = { eventId: event._id };
  if (selectedMode) {
    query.participationMode = selectedMode;
  }
  if (selectedDistance) {
    query.raceDistance = selectedDistance;
  }
  if (searchQuery) {
    const safePattern = new RegExp(escapeRegex(searchQuery), 'i');
    query.$or = [
      { confirmationCode: safePattern },
      { 'participant.firstName': safePattern },
      { 'participant.lastName': safePattern },
      { 'participant.email': safePattern },
      { 'participant.emergencyContactName': safePattern },
      { 'participant.emergencyContactNumber': safePattern },
      { 'participant.runningGroup': safePattern },
      { raceDistance: safePattern }
    ];
  }

  return {
    query,
    selectedMode,
    selectedDistance,
    eventRaceDistances,
    searchQuery
  };
}

function buildRegistrantExportQuery(filterContext) {
  const params = new URLSearchParams();
  if (filterContext.selectedMode) params.set('mode', filterContext.selectedMode);
  if (filterContext.selectedDistance) params.set('distance', filterContext.selectedDistance);
  if (filterContext.searchQuery) params.set('q', filterContext.searchQuery);
  return params.toString();
}

function getRegistrantExportData(registrations = []) {
  const headers = [
    'Confirmation Code',
    'First Name',
    'Last Name',
    'Email',
    'Mobile',
    'Country',
    'Date of Birth',
    'Gender',
    'Emergency Contact Name',
    'Emergency Contact Number',
    'Running Group',
    'Waiver Version',
    'Waiver Signature',
    'Waiver Accepted At',
    'Participation Mode',
    'Race Distance',
    'Status',
    'Payment Status',
    'Registered At'
  ];

  const rows = registrations.map((registration) => {
    const participant = registration.participant || {};
    return [
      registration.confirmationCode || '',
      participant.firstName || '',
      participant.lastName || '',
      participant.email || '',
      participant.mobile || '',
      getCountryName(participant.country) || participant.country || '',
      formatDateOnly(participant.dateOfBirth) || '',
      formatGenderLabel(participant.gender) || '',
      participant.emergencyContactName || '',
      participant.emergencyContactNumber || '',
      participant.runningGroup || '',
      registration.waiver?.version || '',
      registration.waiver?.signature || '',
      registration.waiver?.acceptedAt ? new Date(registration.waiver.acceptedAt).toISOString() : '',
      registration.participationMode || '',
      registration.raceDistance || '',
      registration.status || '',
      registration.paymentStatus || '',
      registration.registeredAt ? new Date(registration.registeredAt).toISOString() : ''
    ];
  });

  return { headers, rows };
}

function csvEscape(value) {
  const raw = String(value ?? '');
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function escapeRegex(input) {
  return String(input || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCreateEventFormData(body = {}) {
  const raceDistancePresets = normalizeArray(body.raceDistancePresets).map(normalizeRaceDistanceLabel).filter(Boolean);
  const raceDistances = normalizeRaceDistances(body.raceDistancePresets, body.raceDistanceCustom);
  const waiverTemplateRaw = typeof body.waiverTemplate === 'string'
    ? body.waiverTemplate
    : DEFAULT_WAIVER_TEMPLATE;
  return {
    title: (body.title || '').trim(),
    organiserName: (body.organiserName || '').trim(),
    description: (body.description || '').trim(),
    eventType: (body.eventType || '').trim(),
    registrationOpenAt: body.registrationOpenAt || '',
    registrationCloseAt: body.registrationCloseAt || '',
    eventStartAt: body.eventStartAt || '',
    eventEndAt: body.eventEndAt || '',
    venueName: (body.venueName || '').trim(),
    venueAddress: (body.venueAddress || '').trim(),
    city: (body.city || '').trim(),
    province: (body.province || '').trim(),
    country: normalizeCountryCode(body.country),
    geoLat: (body.geoLat || '').trim(),
    geoLng: (body.geoLng || '').trim(),
    virtualStartAt: body.virtualStartAt || '',
    virtualEndAt: body.virtualEndAt || '',
    proofTypesAllowed: normalizeProofTypes(body.proofTypesAllowed),
    raceDistances,
    raceDistancePresets,
    raceDistanceCustom: String(body.raceDistanceCustom || '').trim(),
    bannerImageUrl: (body.bannerImageUrl || '').trim(),
    logoUrl: (body.logoUrl || '').trim(),
    waiverTemplate: normalizeWaiverTemplate(waiverTemplateRaw),
    actionType: body.actionType === 'publish' ? 'publish' : 'draft'
  };
}

function formatDateForInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getCreateEventFormDataFromEvent(event) {
  const eventRaceDistances = Array.isArray(event.raceDistances) ? event.raceDistances : [];
  const normalizedEventDistances = eventRaceDistances
    .map((item) => normalizeRaceDistanceLabel(item))
    .filter(Boolean);
  const raceDistancePresets = normalizedEventDistances.filter((item) => RACE_DISTANCE_PRESETS.has(item));
  const raceDistanceCustom = normalizedEventDistances
    .filter((item) => !RACE_DISTANCE_PRESETS.has(item))
    .join(', ');

  return {
    title: event.title || '',
    organiserName: event.organiserName || '',
    description: event.description || '',
    eventType: event.eventType || '',
    registrationOpenAt: formatDateForInput(event.registrationOpenAt),
    registrationCloseAt: formatDateForInput(event.registrationCloseAt),
    eventStartAt: formatDateForInput(event.eventStartAt),
    eventEndAt: formatDateForInput(event.eventEndAt),
    venueName: event.venueName || '',
    venueAddress: event.venueAddress || '',
    city: event.city || '',
    province: event.province || '',
    country: normalizeCountryCode(event.country),
    geoLat: event.geo?.lat?.toString?.() || '',
    geoLng: event.geo?.lng?.toString?.() || '',
    virtualStartAt: formatDateForInput(event.virtualWindow?.startAt),
    virtualEndAt: formatDateForInput(event.virtualWindow?.endAt),
    proofTypesAllowed: Array.isArray(event.proofTypesAllowed) ? event.proofTypesAllowed : [],
    raceDistances: normalizedEventDistances,
    raceDistancePresets,
    raceDistanceCustom,
    bannerImageUrl: event.bannerImageUrl || '',
    logoUrl: event.logoUrl || '',
    waiverTemplate: normalizeWaiverTemplate(event.waiverTemplate || DEFAULT_WAIVER_TEMPLATE),
    actionType: event.status === 'published' ? 'publish' : 'draft'
  };
}

function parseDateSafe(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateOnly(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US');
}

function formatGenderLabel(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (normalized === 'prefer_not_to_say') return 'Prefer not to say';
  if (normalized === 'non_binary') return 'Non-binary';
  if (normalized === 'male') return 'Male';
  if (normalized === 'female') return 'Female';
  return normalized;
}

function formatAgeFromDateOfBirth(value) {
  if (!value) return '';
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  if (age < 0 || age > 130) return '';
  return String(age);
}

function isValidUrl(url) {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

function validateCreateEventForm(formData) {
  const errors = {};
  const dateFields = [
    'registrationOpenAt',
    'registrationCloseAt',
    'eventStartAt',
    'eventEndAt'
  ];

  if (!formData.title || formData.title.length < 5) {
    errors.title = 'Event title must be at least 5 characters.';
  }

  if (!formData.description || formData.description.length < 20) {
    errors.description = 'Description must be at least 20 characters.';
  }

  if (!['virtual', 'onsite', 'hybrid'].includes(formData.eventType)) {
    errors.eventType = 'Select a valid event type.';
  }
  if (!Array.isArray(formData.raceDistances) || !formData.raceDistances.length) {
    errors.raceDistances = 'Add at least one race distance (for example: 3K, 5K, 10K, 21K).';
  } else if (formData.raceDistances.length > 12) {
    errors.raceDistances = 'You can add up to 12 race distances per event.';
  }

  for (const field of dateFields) {
    if (!formData[field]) {
      errors[field] = 'This date is required.';
    } else if (!parseDateSafe(formData[field])) {
      errors[field] = 'Invalid date format.';
    }
  }

  const registrationOpenAt = parseDateSafe(formData.registrationOpenAt);
  const registrationCloseAt = parseDateSafe(formData.registrationCloseAt);
  const eventStartAt = parseDateSafe(formData.eventStartAt);
  const eventEndAt = parseDateSafe(formData.eventEndAt);

  if (registrationOpenAt && registrationCloseAt && registrationOpenAt >= registrationCloseAt) {
    errors.registrationCloseAt = 'Registration close must be after registration open.';
  }
  if (eventStartAt && eventEndAt && eventStartAt >= eventEndAt) {
    errors.eventEndAt = 'Event end must be after event start.';
  }
  if (registrationCloseAt && eventStartAt && registrationCloseAt > eventStartAt) {
    errors.registrationCloseAt = 'Registration close must be on/before event start.';
  }

  const needsOnsiteFields = formData.eventType === 'onsite' || formData.eventType === 'hybrid';
  if (needsOnsiteFields) {
    if (!formData.venueName) errors.venueName = 'Venue name is required for on-site/hybrid events.';
    if (!formData.venueAddress) errors.venueAddress = 'Venue address is required for on-site/hybrid events.';
    if (!formData.city) errors.city = 'City is required for on-site/hybrid events.';
    if (!formData.country) {
      errors.country = 'Country is required for on-site/hybrid events.';
    } else if (!isValidCountryCode(formData.country)) {
      errors.country = 'Select a valid country.';
    }
  }

  const hasGeoLat = !!formData.geoLat;
  const hasGeoLng = !!formData.geoLng;
  if (hasGeoLat !== hasGeoLng) {
    errors.geo = 'Provide both latitude and longitude, or leave both empty.';
  }
  if (hasGeoLat && hasGeoLng) {
    const lat = Number(formData.geoLat);
    const lng = Number(formData.geoLng);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      errors.geoLat = 'Latitude must be between -90 and 90.';
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      errors.geoLng = 'Longitude must be between -180 and 180.';
    }
  }

  const needsVirtualFields = formData.eventType === 'virtual' || formData.eventType === 'hybrid';
  if (needsVirtualFields) {
    if (!formData.virtualStartAt) errors.virtualStartAt = 'Virtual window start is required for virtual/hybrid events.';
    if (!formData.virtualEndAt) errors.virtualEndAt = 'Virtual window end is required for virtual/hybrid events.';
    if (!formData.proofTypesAllowed.length) errors.proofTypesAllowed = 'Select at least one proof type.';

    const virtualStart = parseDateSafe(formData.virtualStartAt);
    const virtualEnd = parseDateSafe(formData.virtualEndAt);
    if (virtualStart && virtualEnd && virtualStart >= virtualEnd) {
      errors.virtualEndAt = 'Virtual window end must be after virtual window start.';
    }
  }

  if (!isValidUrl(formData.bannerImageUrl)) {
    errors.bannerImageUrl = 'Banner URL must be a valid URL.';
  }
  if (!isValidUrl(formData.logoUrl)) {
    errors.logoUrl = 'Logo URL must be a valid URL.';
  }
  if (!formData.waiverTemplate || formData.waiverTemplate.length < 200) {
    errors.waiverTemplate = 'Waiver template must be at least 200 characters.';
  } else if (formData.waiverTemplate.length > 20000) {
    errors.waiverTemplate = 'Waiver template must be 20,000 characters or less.';
  }

  return errors;
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getEventTypesAllowed(eventType) {
  if (eventType === 'virtual') return ['virtual'];
  if (eventType === 'onsite') return ['onsite'];
  if (eventType === 'hybrid') return ['virtual', 'onsite'];
  return [];
}

async function generateUniqueSlug(title) {
  const base = slugify(title) || 'event';
  let candidate = base;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await Event.exists({ slug: candidate });
    if (!exists) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

async function getOwnedEventOrNull(eventId, userId) {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return null;
  }
  return Event.findOne({ _id: eventId, organizerId: userId });
}

function getStatusTransitionError(currentStatus, nextStatus) {
  const validStatuses = ['draft', 'published', 'closed'];
  if (!validStatuses.includes(nextStatus)) {
    return 'Invalid target status.';
  }
  if (currentStatus === nextStatus) {
    return `Event is already ${currentStatus}.`;
  }

  const allowed = {
    draft: ['published'],
    published: ['closed'],
    closed: []
  };

  if (!allowed[currentStatus] || !allowed[currentStatus].includes(nextStatus)) {
    return `Cannot move event from ${currentStatus} to ${nextStatus}.`;
  }

  return null;
}

function getPublishReadinessErrors(event) {
  const formData = getCreateEventFormDataFromEvent(event);
  formData.actionType = 'publish';
  const errors = validateCreateEventForm(formData);
  return Object.values(errors);
}

module.exports = router;
