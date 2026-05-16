// src/routes/organiser/qr-and-dashboard.js
// QR code generation and real-time dashboard endpoints for organisers

const express = require('express');
const router = express.Router();
const { 
  generateBibQRCode, 
  generateBatchQRCodes,
  decodeQRData
} = require('../../services/qr-code.service');
const {
  getRealtimeCheckInSummary,
  getRecentCheckIns,
  getCheckInsByMode,
  getCheckInVelocity,
  estimateCheckInCompletion
} = require('../../services/realtime-checkin.service');

// Generate QR code for single bib
// GET /organizer/events/:eventId/bibs/:bibNumber/qr
router.get('/events/:eventId/bibs/:bibNumber/qr', async (req, res) => {
  try {
    const { eventId, bibNumber } = req.params;
    const { format = 'data-url' } = req.query;

    if (!eventId || !bibNumber) {
      return res.status(400).json({ error: 'Missing eventId or bibNumber' });
    }

    const qr = await generateBibQRCode(eventId, bibNumber);

    res.json({
      success: true,
      eventId,
      bibNumber,
      qr_data_url: qr.data_url,
      encoded_data: qr.encoded_data,
      format: 'PNG data URL'
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate QR codes for all bibs in event (batch)
// POST /organizer/events/:eventId/bibs/qr/batch
// Body: { bibAssignments: [{ bib_number: '001' }, ...] }
router.post('/events/:eventId/bibs/qr/batch', async (req, res) => {
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
    console.error('Error generating batch QR codes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Decode QR code
// POST /organizer/events/:eventId/bibs/qr/decode
// Body: { qr_data: 'EVENT:...|BIB:...|TIME:...' }
router.post('/events/:eventId/bibs/qr/decode', async (req, res) => {
  try {
    const { qr_data } = req.body;

    if (!qr_data) {
      return res.status(400).json({ error: 'Missing qr_data' });
    }

    const decoded = decodeQRData(qr_data);

    if (!decoded.success) {
      return res.status(400).json({ error: decoded.error });
    }

    res.json({
      success: true,
      eventId: decoded.eventId,
      bibNumber: decoded.bibNumber,
      scanned_at: new Date(decoded.timestamp * 1000).toISOString(),
      timestamp: decoded.timestamp
    });
  } catch (error) {
    console.error('Error decoding QR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Real-time check-in dashboard summary
// GET /organizer/events/:eventId/check-in-dashboard/summary
router.get('/events/:eventId/check-in-dashboard/summary', async (req, res) => {
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
    console.error('Error getting dashboard summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Real-time check-in activity feed
// GET /organizer/events/:eventId/check-in-dashboard/activity?limit=20
router.get('/events/:eventId/check-in-dashboard/activity', async (req, res) => {
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
    console.error('Error getting activity feed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Real-time check-ins by mode
// GET /organizer/events/:eventId/check-in-dashboard/by-mode
router.get('/events/:eventId/check-in-dashboard/by-mode', async (req, res) => {
  try {
    const { eventId } = req.params;

    const byMode = await getCheckInsByMode(eventId);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      byMode: byMode.byMode
    });
  } catch (error) {
    console.error('Error getting check-ins by mode:', error);
    res.status(500).json({ error: error.message });
  }
});

// Polling endpoint for real-time updates (5-second poll)
// GET /organizer/events/:eventId/check-in-dashboard/poll?since=timestamp
router.get('/events/:eventId/check-in-dashboard/poll', async (req, res) => {
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
    console.error('Error polling dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
