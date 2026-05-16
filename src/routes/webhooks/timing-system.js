// src/routes/webhooks/timing-system.js
// Webhook endpoints for timing system result feeds

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { recordOnsiteResult, logResultImport } = require('../../services/onsite-operations.service');
const { getPostgresClient } = require('../../db/postgres');

// Webhook signature verification middleware
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-timing-webhook-signature'];
  const timestamp = req.headers['x-timing-webhook-timestamp'];
  const secret = process.env.TIMING_SYSTEM_WEBHOOK_SECRET;

  if (!signature || !timestamp || !secret) {
    return res.status(401).json({ error: 'Missing webhook headers or secret not configured' });
  }

  // Prevent replay attacks: allow 5-minute window
  const requestTime = parseInt(timestamp);
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - requestTime) > 300) {
    return res.status(401).json({ error: 'Webhook timestamp too old' });
  }

  // Compute expected signature
  const payload = JSON.stringify(req.body);
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature))) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
}

// Webhook: result feed from timing system
// POST /webhooks/timing-system/results
// Headers: x-timing-webhook-signature, x-timing-webhook-timestamp
// Body: { event_id, system_name, results: [{ bib_number, elapsed_ms, run_date, ... }, ...] }
router.post('/results', verifyWebhookSignature, async (req, res) => {
  try {
    const { event_id, system_name, results } = req.body;

    if (!event_id || !results || !Array.isArray(results)) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const sql = getPostgresClient();

    // Get or create import record
    const importRecord = await logResultImport(event_id, 'webhook-user', {
      source: `timing_system_${system_name}`,
      fileName: `${system_name}-${Date.now()}.json`,
      fileKey: `webhooks/${event_id}/${system_name}/${Date.now()}.json`,
      mimeType: 'application/json',
      fileSize: JSON.stringify(results).length
    });

    // Process each result
    const processed = [];
    const errors = [];

    for (const result of results) {
      try {
        // Find registration by bib number
        const { bib_number, elapsed_ms, run_date, distance_km, category, ...otherFields } = result;

        if (!bib_number) {
          errors.push({
            index: processed.length,
            error: 'Missing bib_number'
          });
          continue;
        }

        // Look up bib assignment to find registration
        const bibRows = await sql`
          SELECT ba.registration_id, ba.runner_user_id, ba.event_core_id
          FROM bib_assignments ba
          JOIN events_core ec ON ba.event_core_id = ec.id
          WHERE ec.mongo_event_id = ${event_id} AND ba.bib_number = ${bib_number}
        `;

        if (bibRows.length === 0) {
          errors.push({
            bib_number,
            error: 'Bib assignment not found'
          });
          continue;
        }

        const bibAssignment = bibRows[0];

        // Calculate pace if we have distance and time
        let pace_per_km = null;
        if (distance_km && elapsed_ms) {
          const minutes = elapsed_ms / 60000;
          pace_per_km = minutes / distance_km;
        }

        // Get the mongo registration ID for recordOnsiteResult
        const regRows = await sql`
          SELECT mongo_registration_id FROM registrations WHERE id = ${bibAssignment.registration_id}
        `;
        if (regRows.length === 0) throw new Error('Registration mongo ID not found');

        const mongoRegistrationId = regRows[0].mongo_registration_id;

        // Record result
        const onsite_result = await recordOnsiteResult(event_id, mongoRegistrationId, {
          category: category || 'general',
          distanceKm: distance_km || null,
          elapsedMs: elapsed_ms,
          displayTime: otherFields.display_time || formatElapsedTime(elapsed_ms),
          pacePerKm: pace_per_km,
          placeInCategory: otherFields.place_in_category || null,
          dataSource: 'timing_system_import',
          notes: `Imported from ${system_name} via webhook`
        });

        processed.push({
          bib_number,
          status: 'imported',
          onsite_result_id: onsite_result.id
        });
      } catch (err) {
        errors.push({
          bib_number: result.bib_number,
          error: err.message
        });
      }
    }

    // Update import record
    await sql`
      UPDATE result_imports
      SET 
        imported_rows = ${processed.length},
        failed_rows = ${errors.length},
        import_status = ${errors.length === 0 ? 'completed' : 'partially_completed'},
        import_completed_at = CURRENT_TIMESTAMP
      WHERE id = ${importRecord.id}
    `;

    res.json({
      success: true,
      message: 'Results imported from timing system',
      summary: {
        total: results.length,
        imported: processed.length,
        failed: errors.length,
        import_id: importRecord.id
      },
      processed: processed.slice(0, 10), // Return first 10 for brevity
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    console.error('Error processing timing system webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook: check-in confirmation from timing system
// POST /webhooks/timing-system/check-ins
router.post('/check-ins', verifyWebhookSignature, async (req, res) => {
  try {
    const { event_id, bib_number, timestamp } = req.body;

    if (!event_id || !bib_number) {
      return res.status(400).json({ error: 'Missing event_id or bib_number' });
    }

    const sql = getPostgresClient();

    // Look up and verify bib, then create check-in
    const bibRows = await sql`
      SELECT ba.registration_id, ba.runner_user_id
      FROM bib_assignments ba
      JOIN events_core ec ON ba.event_core_id = ec.id
      WHERE ec.mongo_event_id = ${event_id} AND ba.bib_number = ${bib_number}
    `;

    if (bibRows.length === 0) {
      return res.status(404).json({ error: 'Bib not found' });
    }

    const bibAssignment = bibRows[0];

    // Get registration mongo ID
    const regRows = await sql`
      SELECT mongo_registration_id FROM registrations WHERE id = ${bibAssignment.registration_id}
    `;

    const mongoRegistrationId = regRows[0].mongo_registration_id;

    // Record check-in
    const checkInResult = await sql`
      INSERT INTO check_ins (
        event_core_id, registration_id, runner_user_id, 
        participation_mode, check_in_status, checked_in_at, verification_method
      )
      VALUES (
        (SELECT id FROM events_core WHERE mongo_event_id = ${event_id}),
        ${bibAssignment.registration_id},
        ${bibAssignment.runner_user_id},
        'onsite', 'checked_in', ${new Date(timestamp || Date.now()).toISOString()}, 'timing_system_scan'
      )
      RETURNING *
    `;

    res.json({
      success: true,
      message: 'Check-in recorded from timing system',
      checkIn: checkInResult[0]
    });
  } catch (error) {
    console.error('Error processing check-in webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook health check
// GET /webhooks/timing-system/health
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoint: 'POST /webhooks/timing-system/results',
    authentication: 'HMAC-SHA256'
  });
});

/**
 * Format elapsed milliseconds as HH:MM:SS
 */
function formatElapsedTime(ms) {
  if (!ms) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

module.exports = router;
