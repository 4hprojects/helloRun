// src/routes/organiser/onsite-operations.js
// Routes for organiser to manage onsite event operations

const express = require('express');
const router = express.Router();
const { sendJsonServerError } = require('../../utils/json-error-response');
const {
  protectEventMutation,
  protectEventRead
} = require('./event-route-protection');
const {
  assignBib,
  recordCheckIn,
  createRaceKit,
  logResultImport,
  recordOnsiteResult,
  approveOnsiteResult,
  getEventCheckInSummary,
  getEventBibAssignmentStatus
} = require('../../services/onsite-operations.service');

// Assign a bib number to a registration
router.post('/events/:eventId/bibs/assign', protectEventMutation, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { registrationId, bibNumber, category } = req.body;

    if (!registrationId || !bibNumber) {
      return res.status(400).json({ error: 'registrationId and bibNumber required' });
    }

    const bibRecord = await assignBib(eventId, registrationId, bibNumber, { category });

    res.status(201).json({
      success: true,
      message: `Bib ${bibNumber} assigned successfully`,
      bib: bibRecord
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error assigning bib:', error);
  }
});

// Record a check-in
router.post('/events/:eventId/check-ins', protectEventMutation, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { registrationId, participationMode, verificationMethod, notes } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: 'registrationId required' });
    }

    const checkInRecord = await recordCheckIn(eventId, registrationId, {
      participationMode,
      verificationMethod: verificationMethod || 'manual',
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Check-in recorded',
      checkIn: checkInRecord
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error recording check-in:', error);
  }
});

// Create a race kit
router.post('/events/:eventId/race-kits', protectEventMutation, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, description, includedItems, quantity, cost, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name required' });
    }

    const kitRecord = await createRaceKit(eventId, {
      name,
      description,
      includedItems,
      quantity: quantity || 0,
      cost,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Race kit created',
      raceKit: kitRecord
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error creating race kit:', error);
  }
});

// Log a result import file
router.post('/events/:eventId/result-imports', protectEventMutation, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { source, fileName, fileKey, mimeType, fileSize, notes } = req.body;
    const userId = req.user.mongoUserId; // Get MongoDB user ID from auth

    const importRecord = await logResultImport(eventId, userId, {
      source: source || 'csv_upload',
      fileName,
      fileKey,
      mimeType,
      fileSize,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Result import logged',
      import: importRecord
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error logging result import:', error);
  }
});

// Record an onsite result
router.post('/events/:eventId/onsite-results', protectEventMutation, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { registrationId, category, distanceKm, elapsedMs, displayTime, pacePerKm, placeInCategory, dataSource, notes, resultStatus } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: 'registrationId required' });
    }

    const resultRecord = await recordOnsiteResult(eventId, registrationId, {
      category,
      distanceKm,
      elapsedMs,
      displayTime,
      pacePerKm,
      placeInCategory,
      dataSource: dataSource || 'manual_entry',
      notes,
      resultStatus,
      performedBy: req.user?.mongoUserId || req.session?.userId || null
    });

    res.status(201).json({
      success: true,
      message: 'Onsite result recorded',
      result: resultRecord
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error recording onsite result:', error);
  }
});

// Approve an onsite result and evaluate achievement badges
router.post('/events/:eventId/onsite-results/:resultId/approve', protectEventMutation, async (req, res) => {
  try {
    const { eventId, resultId } = req.params;
    const approved = await approveOnsiteResult(eventId, resultId, {
      performedBy: req.user?.mongoUserId || req.session?.userId || null,
      notes: req.body?.notes || null
    });

    res.json({
      success: true,
      message: 'Onsite result approved',
      result: approved.result,
      awardsCreated: approved.awards.length
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error approving onsite result:', error);
  }
});

// Get event check-in summary
router.get('/events/:eventId/check-in-summary', protectEventRead, async (req, res) => {
  try {
    const { eventId } = req.params;

    const summary = await getEventCheckInSummary(eventId);

    res.json({
      success: true,
      summary: summary || { message: 'No check-in data for this event' }
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error getting check-in summary:', error);
  }
});

// Get event bib assignment status
router.get('/events/:eventId/bib-assignment-status', protectEventRead, async (req, res) => {
  try {
    const { eventId } = req.params;

    const status = await getEventBibAssignmentStatus(eventId);

    res.json({
      success: true,
      status: status || { message: 'No bib data for this event' }
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error getting bib assignment status:', error);
  }
});

module.exports = router;
