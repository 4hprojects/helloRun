// src/routes/organiser/onsite-operations.js
// Routes for organiser to manage onsite event operations

const express = require('express');
const router = express.Router();
const { sendJsonServerError } = require('../../utils/json-error-response');
const { createRateLimiter } = require('../../middleware/rate-limit.middleware');
const {
  isValidTimeFormat,
  timeToMilliseconds
} = require('../../services/result-import-validation.service');
const Registration = require('../../models/Registration');
const { resolveScannedQr } = require('../../services/qr-code.service');
const { findRegistrationByExactBib } = require('../../services/onsite-roster.service');
const { uploadResultSheet } = require('../../services/upload.service');
const { generateErrorCSV } = require('../../services/result-import-validation.service');
const {
  previewResultImport,
  applyResultRows,
  recordImportLog
} = require('../../services/result-import.service');

// Parsing a spreadsheet is heavier than a scan, so this is tighter.
const resultImportLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many result imports. Please wait a few minutes and try again.'
});
const {
  protectEventMutation,
  protectEventRead
} = require('./event-route-protection');

// Generous enough for a busy start line, tight enough to bound abuse. Note that
// Redis is not configured in production, so this is currently per-process.
const checkInLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: 'Too many check-in requests. Please wait a moment and try again.'
});

// Bulk assignment is one request per batch, so this is deliberately tighter.
const bulkBibLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many bulk bib assignments. Please wait a few minutes and try again.'
});

// Bounds a single request's work; the roster page itself caps at 500 rows.
const MAX_BULK_BIB_ASSIGNMENTS = 500;
const {
  assignBib,
  assignBibsInBulk,
  markRaceKitReleased,
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

// Scan a bib QR and check the runner in.
//
// Answers the cases staff actually hit at a start line: valid, already checked in,
// cancelled, unpaid, wrong event, unknown bib, unreadable code. Each returns an
// `outcome` the scanner can render without parsing prose.
router.post('/events/:eventId/check-in/scan', protectEventMutation, checkInLimiter, async (req, res) => {
  try {
    const { eventId } = req.params;
    const scanned = String(req.body?.scanned || '').trim();

    if (!scanned) {
      return res.status(400).json({ outcome: 'invalid', message: 'Nothing was scanned.' });
    }

    const resolved = resolveScannedQr(scanned);
    if (!resolved.success) {
      return res.status(400).json({ outcome: 'invalid', message: 'That code is not a HelloRun bib.' });
    }

    if (String(resolved.eventId) !== String(eventId)) {
      return res.status(409).json({
        outcome: 'wrong_event',
        message: 'That bib belongs to a different event.'
      });
    }

    const match = await findRegistrationByExactBib(eventId, resolved.bibNumber);
    if (!match) {
      return res.status(404).json({
        outcome: 'unknown_bib',
        message: `No runner is holding bib ${resolved.bibNumber} for this event.`
      });
    }

    const registration = await Registration.findById(match.registrationId)
      .select('participant raceDistance status paymentStatus')
      .lean();
    if (!registration) {
      return res.status(404).json({ outcome: 'unknown_bib', message: 'Registration not found.' });
    }

    const participantName =
      [registration.participant?.firstName, registration.participant?.lastName]
        .filter(Boolean)
        .join(' ') || 'Unnamed participant';

    if (registration.status === 'cancelled' || registration.status === 'refunded') {
      return res.status(409).json({
        outcome: 'cancelled',
        message: `${participantName} has a ${registration.status} registration.`,
        participant: { name: participantName, bibNumber: match.bibNumber }
      });
    }

    const checkIn = await recordCheckIn(eventId, match.registrationId, {
      participationMode: 'onsite',
      verificationMethod: resolved.format === 'token' ? 'bib_scan' : 'bib_scan_legacy'
    });

    const alreadyCheckedIn = Boolean(checkIn.was_already_checked_in);
    // Payment is a warning, not a block: plenty of events settle at the desk, and
    // refusing entry over it would be the wrong call to make on the organiser's behalf.
    const warnings = [];
    if (registration.paymentStatus && registration.paymentStatus !== 'paid') {
      warnings.push(`Payment is ${registration.paymentStatus}.`);
    }
    if (resolved.format === 'legacy') {
      warnings.push('Scanned an older bib code.');
    }

    return res.json({
      outcome: alreadyCheckedIn ? 'already_checked_in' : 'checked_in',
      message: alreadyCheckedIn
        ? `${participantName} was already checked in.`
        : `${participantName} checked in.`,
      warnings,
      participant: {
        name: participantName,
        bibNumber: match.bibNumber,
        raceDistance: registration.raceDistance || '',
        paymentStatus: registration.paymentStatus || ''
      }
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error scanning bib:', error);
  }
});

// Assign bibs to many registrations at once
router.post('/events/:eventId/bibs/assign-bulk', protectEventMutation, bulkBibLimiter, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { assignments } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'assignments array required' });
    }

    if (assignments.length > MAX_BULK_BIB_ASSIGNMENTS) {
      return res.status(400).json({
        error: `Assign at most ${MAX_BULK_BIB_ASSIGNMENTS} bibs at a time.`
      });
    }

    const result = await assignBibsInBulk(eventId, assignments);

    res.status(result.failed.length > 0 && result.assigned.length === 0 ? 422 : 200).json({
      success: result.failed.length === 0,
      message: `${result.assigned.length} assigned, ${result.failed.length} failed`,
      assigned: result.assigned,
      failed: result.failed
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error assigning bibs in bulk:', error);
  }
});

// Mark a participant's race kit as released
router.post('/events/:eventId/race-kits/release', protectEventMutation, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: 'registrationId required' });
    }

    const record = await markRaceKitReleased(eventId, registrationId);

    res.json({
      success: true,
      message: 'Race kit released',
      bib: record
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error releasing race kit:', error);
  }
});

// Record a check-in
router.post('/events/:eventId/check-ins', protectEventMutation, checkInLimiter, async (req, res) => {
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

    const wasAlreadyCheckedIn = Boolean(checkInRecord.was_already_checked_in);

    res.status(201).json({
      success: true,
      message: wasAlreadyCheckedIn ? 'Participant was already checked in' : 'Check-in recorded',
      alreadyCheckedIn: wasAlreadyCheckedIn,
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

// Parse and validate a results file without writing anything.
router.post(
  '/events/:eventId/result-imports/preview',
  protectEventMutation,
  resultImportLimiter,
  uploadResultSheet,
  async (req, res) => {
    try {
      if (req.uploadError) {
        return res.status(400).json({ error: req.uploadError });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'Choose a .csv or .xlsx results file.' });
      }

      const preview = await previewResultImport(req.file.buffer, req.file.originalname);
      return res.json({
        success: true,
        fileName: req.file.originalname,
        ...preview,
        // Only the rows that passed validation are offered for import.
        rows: preview.valid_rows_data,
        errorCsv: preview.error_summary.total > 0
          ? generateErrorCSV(Object.values(preview.error_summary.by_category).flat())
          : ''
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not read that file.' });
    }
  }
);

// Apply rows the organiser confirmed from the preview.
router.post(
  '/events/:eventId/result-imports/commit',
  protectEventMutation,
  resultImportLimiter,
  async (req, res) => {
    try {
      const { rows, fileName } = req.body || {};
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'No rows to import.' });
      }

      const result = await applyResultRows(req.params.eventId, rows, {
        performedBy: req.user?.mongoUserId || req.session?.userId || null
      });

      await recordImportLog(req.params.eventId, req.user?.mongoUserId || req.session?.userId, {
        fileName: fileName || 'results',
        importedCount: result.imported.length,
        failedCount: result.failed.length
      });

      return res.json({
        success: result.failed.length === 0,
        message: `${result.imported.length} imported, ${result.failed.length} failed`,
        imported: result.imported.length,
        failed: result.failed
      });
    } catch (error) {
      return sendJsonServerError(res, 'Error importing results:', error);
    }
  }
);

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

    // Derive milliseconds from the entered finish time so the stored value and the
    // display string cannot disagree. Rejecting here keeps bad times out of results
    // that later feed rankings.
    let resolvedElapsedMs = elapsedMs;
    if (displayTime) {
      if (!isValidTimeFormat(String(displayTime))) {
        return res.status(400).json({
          error: 'Finish time must be HH:MM:SS or MM:SS.'
        });
      }
      resolvedElapsedMs = timeToMilliseconds(String(displayTime));
    }

    const resultRecord = await recordOnsiteResult(eventId, registrationId, {
      category,
      distanceKm,
      elapsedMs: resolvedElapsedMs,
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
      message: approved.submissionCreated
        ? 'Onsite result approved'
        : 'Result approved, but it has not entered the results yet',
      result: approved.result,
      awardsCreated: approved.awards.length,
      submissionCreated: Boolean(approved.submissionCreated),
      submissionError: approved.submissionError || null
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
