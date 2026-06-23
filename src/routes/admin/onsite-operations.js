// src/routes/admin/onsite-operations.js
// Admin routes for bulk onsite operations management

const express = require('express');
const router = express.Router();
const { sendJsonServerError } = require('../../utils/json-error-response');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const {
  bulkAssignBibs,
  bulkRecordCheckIns,
  processImportBatch,
  retryFailedImportRows,
  exportImportErrors,
  listEventCheckIns,
  listEventResultImports,
  updateCheckInStatus
} = require('../../services/onsite-operations-bulk.service');

// Middleware: verify admin access
async function verifyAdminAccess(req, res, next) {
  if (!req.user || !req.session) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  next();
}

// Bulk bib assignment
// POST /admin/events/:eventId/bibs/bulk-assign
// Body: { assignments: [{ registrationId, bibNumber, category }, ...] }
router.post('/events/:eventId/bibs/bulk-assign', requireAuth, requireRole('admin'), verifyAdminAccess, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { assignments } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'assignments must be non-empty array' });
    }

    const results = await bulkAssignBibs(eventId, assignments);

    res.status(200).json({
      success: true,
      message: `Bulk bib assignment completed`,
      summary: {
        total: results.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      },
      results
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error in bulk bib assignment:', error);
  }
});

// Bulk check-in recording
// POST /admin/events/:eventId/check-ins/bulk
// Body: { checkIns: [{ registrationId, participationMode?, verificationMethod?, notes? }, ...] }
router.post('/events/:eventId/check-ins/bulk', requireAuth, requireRole('admin'), verifyAdminAccess, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { checkIns } = req.body;

    if (!Array.isArray(checkIns) || checkIns.length === 0) {
      return res.status(400).json({ error: 'checkIns must be non-empty array' });
    }

    const results = await bulkRecordCheckIns(eventId, checkIns);

    res.status(200).json({
      success: true,
      message: 'Bulk check-in completed',
      summary: {
        total: results.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        checked_in: results.filter(r => r.success && r.data?.check_in_status === 'checked_in').length,
        no_show: results.filter(r => r.success && r.data?.check_in_status === 'no_show').length
      },
      results
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error in bulk check-in:', error);
  }
});

// Process result import batch
// POST /admin/events/:eventId/result-imports/:importId/process
// Triggers parsing and row-by-row validation of CSV/XLSX file
router.post('/events/:eventId/result-imports/:importId/process', requireAuth, requireRole('admin'), verifyAdminAccess, async (req, res) => {
  try {
    const { eventId, importId } = req.params;
    const { fileKey } = req.body;

    if (!fileKey) {
      return res.status(400).json({ error: 'fileKey required' });
    }

    const result = await processImportBatch(eventId, importId, fileKey);

    res.status(200).json({
      success: true,
      message: 'Import batch processing completed',
      summary: result.summary,
      errors: result.errors || [],
      import: result.import
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error processing import batch:', error);
  }
});

// Retry failed imports
// POST /admin/events/:eventId/result-imports/:importId/retry-failures
router.post('/events/:eventId/result-imports/:importId/retry-failures', requireAuth, requireRole('admin'), verifyAdminAccess, async (req, res) => {
  try {
    const { eventId, importId } = req.params;

    const result = await retryFailedImportRows(eventId, importId);

    res.status(200).json({
      success: true,
      message: 'Failed rows reprocessed',
      summary: {
        total_retried: result.retried_count,
        newly_succeeded: result.newly_succeeded,
        still_failed: result.still_failed
      },
      import: result.import
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error retrying failed imports:', error);
  }
});

// Export import errors as CSV
// GET /admin/events/:eventId/result-imports/:importId/errors/export
router.get('/events/:eventId/result-imports/:importId/errors/export', requireAuth, requireRole('admin'), verifyAdminAccess, async (req, res) => {
  try {
    const { eventId, importId } = req.params;

    const csv = await exportImportErrors(eventId, importId);

    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename="import-errors-${importId}.csv"`);
    res.send(csv);
  } catch (error) {
    return sendJsonServerError(res, 'Error exporting import errors:', error);
  }
});

// List all event check-ins with filters
// GET /admin/events/:eventId/check-ins?status=checked_in&participationMode=onsite
router.get('/events/:eventId/check-ins', requireAuth, requireRole('admin'), verifyAdminAccess, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status, participationMode, verified_after } = req.query;

    const filters = {};
    if (status) filters.check_in_status = status;
    if (participationMode) filters.participation_mode = participationMode;
    if (verified_after) filters.checked_in_after = new Date(verified_after);

    const checkIns = await listEventCheckIns(eventId, filters);

    res.json({
      success: true,
      total: checkIns.length,
      checkIns
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error listing check-ins:', error);
  }
});

// List all event result imports
// GET /admin/events/:eventId/result-imports?status=completed
router.get('/events/:eventId/result-imports', requireAuth, requireRole('admin'), verifyAdminAccess, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.query;

    const imports = await listEventResultImports(eventId, status);

    res.json({
      success: true,
      total: imports.length,
      imports
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error listing result imports:', error);
  }
});

// Update check-in status (for corrections)
// PATCH /admin/events/:eventId/check-ins/:checkInId
// Body: { check_in_status: 'checked_in' | 'no_show' | 'deferred' | 'cancelled', notes? }
router.patch('/events/:eventId/check-ins/:checkInId', requireAuth, requireRole('admin'), verifyAdminAccess, async (req, res) => {
  try {
    const { eventId, checkInId } = req.params;
    const { check_in_status, notes } = req.body;

    if (!['checked_in', 'no_show', 'deferred', 'cancelled'].includes(check_in_status)) {
      return res.status(400).json({ error: 'Invalid check_in_status' });
    }

    const updated = await updateCheckInStatus(eventId, checkInId, check_in_status, notes);

    res.json({
      success: true,
      message: 'Check-in status updated',
      checkIn: updated
    });
  } catch (error) {
    return sendJsonServerError(res, 'Error updating check-in:', error);
  }
});

module.exports = router;
