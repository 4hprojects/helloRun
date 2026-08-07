// src/routes/organiser/qr-and-dashboard.js
// QR code generation and real-time dashboard endpoints for organisers

const express = require('express');
const router = express.Router();
const { sendJsonServerError } = require('../../utils/json-error-response');
const {
  protectEventMutation,
  protectEventRead
} = require('./event-route-protection');
const { generateBatchQRCodes } = require('../../services/qr-code.service');
const {
  renderBibQrCode,
  verifyScannedBibCode
} = require('../../services/bib-qr-token.service');
const {
  getRealtimeCheckInSummary,
  getRecentCheckIns,
  getCheckInsByMode,
  getCheckInVelocity,
  estimateCheckInCompletion
} = require('../../services/realtime-checkin.service');

// Generate QR code for single bib
// GET /organizer/events/:eventId/bibs/:bibNumber/qr
router.get('/events/:eventId/bibs/:bibNumber/qr', protectEventRead, async (req, res) => {
  try {
    const { eventId, bibNumber } = req.params;
    const { format = 'data-url' } = req.query;

    if (!eventId || !bibNumber) {
      return res.status(400).json({ error: 'Missing eventId or bibNumber' });
    }

    const qr = await renderBibQrCode(eventId, bibNumber);

    res.json({
      success: true,
      eventId,
      bibNumber,
      qr_data_url: qr.data_url,
      encoded_data: qr.encoded_data,
      format: 'PNG data URL'
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error generating QR code:', error);
  }
});

// Generate QR codes for all bibs in event (batch)
// POST /organizer/events/:eventId/bibs/qr/batch
// Body: { bibAssignments: [{ bib_number: '001' }, ...] }
router.post('/events/:eventId/bibs/qr/batch', protectEventMutation, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { bibAssignments } = req.body;

    if (!Array.isArray(bibAssignments)) {
      return res.status(400).json({ error: 'bibAssignments must be array' });
    }

    const result = await generateBatchQRCodes(eventId, bibAssignments);

    res.json({
      success: true,
      eventId,
      summary: {
        total: result.total,
        succeeded: result.succeeded,
        failed: result.failed
      },
      results: result.results.slice(0, 50) // Return first 50
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error generating batch QR codes:', error);
  }
});

// Decode a scanned code, honouring revocation.
// POST /organizer/events/:eventId/bibs/qr/decode
router.post('/events/:eventId/bibs/qr/decode', protectEventMutation, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { qr_data } = req.body;

    if (!qr_data) {
      return res.status(400).json({ error: 'Missing qr_data' });
    }

    const verified = await verifyScannedBibCode(eventId, qr_data);

    if (verified.outcome !== 'ok') {
      return res.status(400).json({
        error: describeQrOutcome(verified),
        outcome: verified.outcome
      });
    }

    res.json({
      success: true,
      eventId,
      bibNumber: verified.bibNumber,
      legacy: verified.legacy,
      scanned_at: new Date().toISOString()
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error decoding QR:', error);
  }
});

// Real-time check-in dashboard summary
// GET /organizer/events/:eventId/check-in-dashboard/summary
router.get('/events/:eventId/check-in-dashboard/summary', protectEventRead, async (req, res) => {
  try {
    const { eventId } = req.params;

    const summary = await getRealtimeCheckInSummary(eventId);
    const velocity = await getCheckInVelocity(eventId, 5);
    const estimate = await estimateCheckInCompletion(eventId);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: summary.summary,
      velocity,
      estimate
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error getting dashboard summary:', error);
  }
});

// Real-time check-in activity feed
// GET /organizer/events/:eventId/check-in-dashboard/activity?limit=20
router.get('/events/:eventId/check-in-dashboard/activity', protectEventRead, async (req, res) => {
  try {
    const { eventId } = req.params;
    const limit = parseInt(req.query.limit || '20');

    const activity = await getRecentCheckIns(eventId, limit);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      activity
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error getting activity feed:', error);
  }
});

// Real-time check-ins by mode
// GET /organizer/events/:eventId/check-in-dashboard/by-mode
router.get('/events/:eventId/check-in-dashboard/by-mode', protectEventRead, async (req, res) => {
  try {
    const { eventId } = req.params;

    const byMode = await getCheckInsByMode(eventId);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      byMode: byMode.byMode
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error getting check-ins by mode:', error);
  }
});

// Polling endpoint for real-time updates (5-second poll)
// GET /organizer/events/:eventId/check-in-dashboard/poll?since=timestamp
router.get('/events/:eventId/check-in-dashboard/poll', protectEventRead, async (req, res) => {
  try {
    const { eventId } = req.params;
    const sinceTimestamp = req.query.since;

    // Get summary and recent activity
    const summary = await getRealtimeCheckInSummary(eventId);
    const recent = await getRecentCheckIns(eventId, 10);
    const velocity = await getCheckInVelocity(eventId, 5);

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      poll_interval_seconds: 5,
      summary: summary.summary,
      recent_activity: recent.checkIns,
      velocity,
      // Client can use this for change detection
      sequence: Math.floor(Date.now() / 5000)
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error polling dashboard:', error);
  }
});

/**
 * Turn a verification outcome into something a person can act on.
 */
function describeQrOutcome(verified) {
  if (verified.outcome === 'wrong_event') return 'That bib belongs to a different event.';
  if (verified.outcome === 'revoked') {
    return verified.reason
      ? `That code was withdrawn: ${verified.reason}.`
      : 'That code has been withdrawn.';
  }
  if (verified.outcome === 'unknown') return 'That code is not recognised for this event.';
  return verified.error || 'That code could not be read.';
}

module.exports = router;
