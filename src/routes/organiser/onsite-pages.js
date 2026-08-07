// src/routes/organiser/onsite-pages.js
// Organiser-facing onsite pages: race-day check-in, bib assignment, and race kits.
//
// The JSON operations API lives in ./onsite-operations.js; this file only renders the
// pages and the offline backup list that staff fall back to when connectivity drops.
// All three read the same roster model so a participant looks identical on each.

const express = require('express');
const router = express.Router();
const Event = require('../../models/Event');
const logger = require('../../utils/logger');
const { createRateLimiter } = require('../../middleware/rate-limit.middleware');
const { buildCsvContent, buildExportFilename } = require('../../utils/tabular-export');
const { protectEventRead } = require('./event-route-protection');
const { getOnsiteRosterData } = require('../../services/onsite-roster.service');
const {
  getRealtimeCheckInSummary,
  getRecentCheckIns,
  estimateCheckInCompletion
} = require('../../services/realtime-checkin.service');

const checkInBackupListLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many backup list downloads. Please wait a few minutes and try again.'
});

// Check-in console
router.get('/events/:eventId/check-in', protectEventRead, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId)
      .select('title slug eventType eventTypesAllowed startDate venueName')
      .lean();

    if (!event) {
      return res.status(404).render('errors/404', { title: 'Event not found' });
    }

    const consoleData = await getOnsiteRosterData(eventId, {
      search: req.query.q,
      limit: req.query.limit
    });

    return res.render('organizer/event-check-in', {
      title: `Check-in — ${event.title}`,
      event,
      eventId: String(eventId),
      participants: consoleData.participants,
      totals: consoleData.totals,
      listCounts: consoleData.listCounts,
      search: consoleData.search,
      isTruncated: consoleData.isTruncated
    });
  } catch (error) {
    return next(error);
  }
});

// Offline backup participant list. Deliberately a plain CSV so it opens on any device
// and remains usable when the venue has no usable connectivity.
router.get(
  '/events/:eventId/check-in/backup-list',
  protectEventRead,
  checkInBackupListLimiter,
  async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const event = await Event.findById(eventId).select('title').lean();
      if (!event) {
        return res.status(404).render('error', {
          title: '404 - Event Not Found',
          status: 404,
          message: 'Event not found.'
        });
      }

      const consoleData = await getOnsiteRosterData(eventId, { limit: 500 });

      const headers = [
        'Bib',
        'Confirmation code',
        'Name',
        'Category',
        'Payment status',
        'Checked in',
        'Emergency contact',
        'Emergency number'
      ];
      const rows = consoleData.participants.map((participant) => [
        participant.bibNumber,
        participant.confirmationCode,
        participant.fullName,
        participant.raceDistance,
        participant.paymentStatus,
        participant.isCheckedIn ? 'yes' : 'no',
        participant.emergencyContactName,
        participant.emergencyContactNumber
      ]);

      const filename = buildExportFilename('checkin-backup-list', 'csv');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buildCsvContent(headers, rows));
    } catch (error) {
      logger.error(`[Onsite] Backup list export failed: ${error.message}`);
      return next(error);
    }
  }
);

// Live check-in board. Renders a first paint server-side, then polls the existing
// dashboard endpoints so a dropped connection degrades to a stale board, not a blank one.
router.get('/events/:eventId/check-in/board', protectEventRead, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).select('title venueName').lean();
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found.'
      });
    }

    let board = null;
    try {
      const [summary, estimate, recent] = await Promise.all([
        getRealtimeCheckInSummary(eventId),
        estimateCheckInCompletion(eventId),
        getRecentCheckIns(eventId, 15)
      ]);
      board = {
        summary: summary.summary,
        estimate,
        recent: recent.checkIns || []
      };
    } catch (error) {
      // The board is a monitoring surface; if Postgres is unreachable, say so rather
      // than failing the page the organiser is standing in front of.
      logger.error(`[Onsite] Check-in board data failed for event ${eventId}: ${error.message}`);
    }

    return res.render('organizer/event-check-in-board', {
      title: `Live check-in — ${event.title}`,
      event,
      eventId: String(eventId),
      board
    });
  } catch (error) {
    return next(error);
  }
});

// Bib assignment
router.get('/events/:eventId/bibs', protectEventRead, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).select('title raceCategories').lean();
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found.'
      });
    }

    const rosterData = await getOnsiteRosterData(eventId, {
      search: req.query.q,
      limit: req.query.limit
    });

    return res.render('organizer/event-bibs', {
      title: `Bib assignment — ${event.title}`,
      event,
      eventId: String(eventId),
      participants: rosterData.participants,
      totals: rosterData.totals,
      listCounts: rosterData.listCounts,
      search: rosterData.search,
      isTruncated: rosterData.isTruncated
    });
  } catch (error) {
    return next(error);
  }
});

// Race-kit release
router.get('/events/:eventId/race-kits', protectEventRead, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).select('title').lean();
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found.'
      });
    }

    const rosterData = await getOnsiteRosterData(eventId, {
      search: req.query.q,
      limit: req.query.limit
    });

    return res.render('organizer/event-race-kits', {
      title: `Race kits — ${event.title}`,
      event,
      eventId: String(eventId),
      participants: rosterData.participants,
      totals: rosterData.totals,
      listCounts: rosterData.listCounts,
      search: rosterData.search,
      isTruncated: rosterData.isTruncated
    });
  } catch (error) {
    return next(error);
  }
});

// Onsite results entry and approval
router.get('/events/:eventId/onsite-results', protectEventRead, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).select('title').lean();
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found.'
      });
    }

    const rosterData = await getOnsiteRosterData(eventId, {
      search: req.query.q,
      limit: req.query.limit
    });

    return res.render('organizer/event-onsite-results', {
      title: `Results — ${event.title}`,
      event,
      eventId: String(eventId),
      participants: rosterData.participants,
      totals: rosterData.totals,
      listCounts: rosterData.listCounts,
      search: rosterData.search,
      isTruncated: rosterData.isTruncated
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
