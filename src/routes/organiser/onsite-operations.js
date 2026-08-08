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
const { verifyScannedBibCode, revokeTokensForBib } = require('../../services/bib-qr-token.service');
const { releaseRaceKit } = require('../../services/race-kit-release.service');
const { findRegistrationByExactBib } = require('../../services/onsite-roster.service');
const Event = require('../../models/Event');
const { validateGuestForm } = require('../../services/guest-registration.service');
const { createWalkInRegistration } = require('../../services/walk-in-registration.service');
const {
  previewRegistrantImport,
  applyRegistrantRows
} = require('../../services/registrant-import.service');
const { buildCsvContent } = require('../../utils/tabular-export');
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
  protectEventRead,
  protectOnsiteRead,
  protectOnsiteMutation
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

// Importing a list is heavier than a single registration, and organiser-only.
const registrantImportLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many registrant imports. Please wait a few minutes and try again.'
});

// A desk registers a handful of walk-ins, not hundreds.
const walkInLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 40,
  message: 'Too many walk-in registrations. Please wait a few minutes and try again.'
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
router.post('/events/:eventId/bibs/assign', protectOnsiteMutation('check_in'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { registrationId, bibNumber, category } = req.body;

    if (!registrationId || !bibNumber) {
      return res.status(400).json({ error: 'registrationId and bibNumber required' });
    }

    // The bib is changing hands or number, so any code already printed for it stops
    // working — otherwise the previous holder's QR would still check someone in.
    await revokeTokensForBib(eventId, bibNumber, 'Bib reassigned');
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

// Read a registrant list without writing anything.
router.post(
  '/events/:eventId/registrant-imports/preview',
  protectEventMutation,
  registrantImportLimiter,
  uploadResultSheet,
  async (req, res) => {
    try {
      if (req.uploadError) return res.status(400).json({ error: req.uploadError });
      if (!req.file) return res.status(400).json({ error: 'Choose a .csv or .xlsx file.' });

      const event = await Event.findById(req.params.eventId)
        .select('eventType eventTypesAllowed')
        .lean();
      const preview = await previewRegistrantImport(req.file.buffer, req.file.originalname, {
        eventId: req.params.eventId,
        event
      });

      return res.json({
        success: true,
        fileName: req.file.originalname,
        ...preview,
        errorCsv: preview.rejected.length
          ? buildCsvContent(['Row', 'Email', 'Reason'], preview.rejected.map((r) => [r.row, r.email, r.error]))
          : ''
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not read that file.' });
    }
  }
);

// Create the registrations the organiser confirmed from the preview.
router.post(
  '/events/:eventId/registrant-imports/commit',
  protectEventMutation,
  registrantImportLimiter,
  async (req, res) => {
    try {
      const { rows, sendEmails } = req.body || {};
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'No rows to import.' });
      }

      const event = await Event.findById(req.params.eventId)
        .select('title waiverTemplate waiverVersion organiserName feeMode feeCurrency pricingMode distancePricing pricingPeriods customizedOptions registrationPackages raceCategories raceDistances kitInventory kitSizeRequired customQuestions')
        .lean();
      if (!event) return res.status(404).json({ error: 'Event not found.' });

      const result = await applyRegistrantRows({
        event,
        rows,
        organiser: req.user,
        sendEmails: sendEmails === true
      });

      return res.json({
        success: result.failed.length === 0,
        message: `${result.imported.length} imported, ${result.failed.length} failed`,
        imported: result.imported.length,
        failed: result.failed
      });
    } catch (error) {
      return sendJsonServerError(res, 'Error importing registrants:', error);
    }
  }
);

// Register a walk-in: someone who turned up on the day.
//
// Deliberately does NOT consult event.allowGuestRegistration. That setting governs whether
// the public may self-register without an account; an organiser adding somebody standing in
// front of them at their own event is a different decision.
router.post('/events/:eventId/walk-ins', protectOnsiteMutation('check_in'), walkInLimiter, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .select('title waiverTemplate waiverVersion organiserName feeMode feeCurrency pricingMode distancePricing pricingPeriods customizedOptions registrationPackages raceCategories raceDistances')
      .lean();
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const { form, errors } = validateGuestForm(req.body, event);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Some details are missing.', errors });
    }

    const { registration, shadowReady } = await createWalkInRegistration({
      event,
      form,
      organiser: req.user,
      paymentCollected: req.body.paymentCollected === 'on' || req.body.paymentCollected === true
    });

    return res.status(201).json({
      success: true,
      message: `${form.firstName} ${form.lastName} registered.`,
      confirmationCode: registration.confirmationCode,
      paymentStatus: registration.paymentStatus,
      // Tells the desk whether a bib can be assigned right now.
      readyForBib: shadowReady,
      registrationId: String(registration._id)
    });
  } catch (error) {
    if (error.code === 'ALREADY_REGISTERED' || error.code === 'CAPACITY' || error.code === 'PRICING') {
      return res.status(409).json({ error: error.message, code: error.code });
    }
    return sendJsonServerError(res, 'Error registering walk-in:', error);
  }
});

// Scan a bib QR and check the runner in.
//
// Answers the cases staff actually hit at a start line: valid, already checked in,
// cancelled, unpaid, wrong event, unknown bib, unreadable code. Each returns an
// `outcome` the scanner can render without parsing prose.
router.post('/events/:eventId/check-in/scan', protectOnsiteMutation('check_in'), checkInLimiter, async (req, res) => {
  try {
    const { eventId } = req.params;
    const scanned = String(req.body?.scanned || '').trim();

    if (!scanned) {
      return res.status(400).json({ outcome: 'invalid', message: 'Nothing was scanned.' });
    }

    const resolved = await verifyScannedBibCode(eventId, scanned);
    if (resolved.outcome === 'invalid') {
      return res.status(400).json({ outcome: 'invalid', message: 'That code is not a HelloRun bib.' });
    }
    if (resolved.outcome === 'wrong_event') {
      return res.status(409).json({
        outcome: 'wrong_event',
        message: 'That bib belongs to a different event.'
      });
    }
    if (resolved.outcome === 'revoked') {
      return res.status(409).json({
        outcome: 'revoked',
        message: resolved.reason
          ? `That code was withdrawn: ${resolved.reason}.`
          : 'That code has been withdrawn. Issue the runner a new one.'
      });
    }
    if (resolved.outcome === 'unknown') {
      return res.status(409).json({
        outcome: 'unknown',
        message: 'That code is not recognised for this event.'
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
      verificationMethod: resolved.legacy ? 'bib_scan_legacy' : 'bib_scan'
    });

    const alreadyCheckedIn = Boolean(checkIn.was_already_checked_in);
    // Payment is a warning, not a block: plenty of events settle at the desk, and
    // refusing entry over it would be the wrong call to make on the organiser's behalf.
    const warnings = [];
    if (registration.paymentStatus && registration.paymentStatus !== 'paid') {
      warnings.push(`Payment is ${registration.paymentStatus}.`);
    }
    if (resolved.legacy) {
      warnings.push('Scanned an older bib code that predates revocation.');
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
router.post('/events/:eventId/bibs/assign-bulk', protectOnsiteMutation('check_in'), bulkBibLimiter, async (req, res) => {
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
router.post('/events/:eventId/race-kits/release', protectOnsiteMutation('race_kit'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: 'registrationId required' });
    }

    const { bib, size, remaining, substituted } = await releaseRaceKit({
      eventId,
      registrationId,
      // A size sent by the desk is a deliberate substitution — usually because the size
      // this person chose has run out.
      size: req.body.size || ''
    });

    res.json({
      success: true,
      message: size
        ? `Race kit released (${size})${substituted ? ' — substituted' : ''}.`
        : 'Race kit released',
      bib,
      size,
      remaining,
      substituted
    });
  } catch (error) {
    // Running out of a size is an ordinary Saturday, not a server fault, and the desk has
    // to be able to act on it rather than see a 500.
    if (error.code === 'NO_STOCK' || error.code === 'ALREADY_RELEASED') {
      return res.status(409).json({ success: false, error: error.message, reason: error.reason || error.code });
    }
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: error.message });
    }
    return sendJsonServerError(res, 'Error releasing race kit:', error);
  }
});

// Record a check-in
router.post('/events/:eventId/check-ins', protectOnsiteMutation('check_in'), checkInLimiter, async (req, res) => {
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
  protectOnsiteMutation('results'),
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
  protectOnsiteMutation('results'),
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
router.post('/events/:eventId/onsite-results', protectOnsiteMutation('results'), async (req, res) => {
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
router.post('/events/:eventId/onsite-results/:resultId/approve', protectOnsiteMutation('results'), async (req, res) => {
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
router.get('/events/:eventId/check-in-summary', protectOnsiteRead('check_in'), async (req, res) => {
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
router.get('/events/:eventId/bib-assignment-status', protectOnsiteRead('check_in'), async (req, res) => {
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
