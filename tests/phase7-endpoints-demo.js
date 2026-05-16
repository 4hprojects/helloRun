/**
 * Phase 7 Extended - Endpoint Demo & Validation
 * This script demonstrates how to use all Phase 7 Extended endpoints
 * with proper authentication and webhook signature generation
 */

const crypto = require('crypto');

// Configuration
const BASE_URL = 'http://localhost:3001'; // Using port 3001 from .env
const TIMING_SYSTEM_WEBHOOK_SECRET = process.env.TIMING_SYSTEM_WEBHOOK_SECRET || 'hellorun_timing_system_secret_key_v1';

/**
 * Generate HMAC-SHA256 webhook signature
 */
function generateWebhookSignature(timestamp, payload) {
  const message = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', TIMING_SYSTEM_WEBHOOK_SECRET)
    .update(message)
    .digest('hex');
  return signature;
}

/**
 * Example 1: Webhook Integration with Timing System Results
 */
function exampleWebhookTimingResults() {
  console.log('\n=== Example 1: Webhook Timing System Results ===');
  
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    event_id: 'evt_20250115_marathon_001',
    system_name: 'Chronotrack',
    results: [
      { bib_number: 1001, elapsed_ms: 1234567 },
      { bib_number: 1002, elapsed_ms: 1243567 },
      { bib_number: 1003, elapsed_ms: 1298567 }
    ]
  });

  const signature = generateWebhookSignature(timestamp, payload);

  console.log('cURL Command:');
  console.log(`
curl -X POST ${BASE_URL}/webhooks/timing-system/results \\
  -H "Content-Type: application/json" \\
  -H "X-Timing-Webhook-Signature: ${signature}" \\
  -H "X-Timing-Webhook-Timestamp: ${timestamp}" \\
  -d '${payload}'
  `);
}

/**
 * Example 2: QR Code Generation for Bib
 */
function exampleQRCodeGeneration() {
  console.log('\n=== Example 2: QR Code Generation ===');
  
  const eventId = 'evt_20250115_marathon_001';
  const bibNumber = 1001;
  
  console.log('Generate single QR code:');
  console.log(`GET ${BASE_URL}/organizer/events/${eventId}/bibs/${bibNumber}/qr`);
  
  console.log('\nGenerate batch QR codes:');
  console.log(`
curl -X POST ${BASE_URL}/organizer/events/${eventId}/bibs/qr/batch \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "bibs": [1001, 1002, 1003]
  }'
  `);

  console.log('\nQR code encoding format:');
  console.log('EVENT:evt_20250115_marathon_001|BIB:1001|TIME:1705334400');
}

/**
 * Example 3: Real-Time Check-In Dashboard
 */
function exampleRealtimeDashboard() {
  console.log('\n=== Example 3: Real-Time Check-In Dashboard ===');
  
  const eventId = 'evt_20250115_marathon_001';
  
  console.log('Get check-in summary:');
  console.log(`GET ${BASE_URL}/organizer/events/${eventId}/check-in-dashboard/summary`);
  
  console.log('\nExample response:');
  console.log(`{
  "total_registrations": 500,
  "checked_in_count": 425,
  "check_in_percentage": 85,
  "no_show_count": 10,
  "deferred_count": 5,
  "pending_count": 60,
  "last_checkin_timestamp": "2025-01-15T10:30:45Z",
  "participation_modes": {
    "race": 300,
    "walk": 100,
    "run_for_charity": 25
  },
  "check_in_velocity": 12.5,
  "estimated_completion_time": "2025-01-15T11:15:00Z",
  "estimated_minutes_remaining": 45
}`);

  console.log('\nGet recent check-ins activity:');
  console.log(`GET ${BASE_URL}/organizer/events/${eventId}/check-in-dashboard/activity?limit=20`);

  console.log('\nPoll for updates (every 5 seconds):');
  console.log(`GET ${BASE_URL}/organizer/events/${eventId}/check-in-dashboard/poll`);
}

/**
 * Example 4: Bulk Operations - Bib Assignment
 */
function exampleBulkBibAssignment() {
  console.log('\n=== Example 4: Bulk Bib Assignment ===');
  
  const eventId = 'evt_20250115_marathon_001';
  
  console.log('Assign bibs in bulk:');
  console.log(`
curl -X POST ${BASE_URL}/admin/events/${eventId}/bibs/bulk-assign \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "assignments": [
      {"registration_id": "reg_001", "bib_number": 1001},
      {"registration_id": "reg_002", "bib_number": 1002},
      {"registration_id": "reg_003", "bib_number": 1003}
    ]
  }'
  `);

  console.log('\nExample response:');
  console.log(`{
  "total": 3,
  "successful": 3,
  "failed": 0,
  "results": [
    {"registration_id": "reg_001", "success": true, "bib_number": 1001},
    {"registration_id": "reg_002", "success": true, "bib_number": 1002},
    {"registration_id": "reg_003", "success": true, "bib_number": 1003}
  ]
}`);
}

/**
 * Example 5: Result Import with Error Handling
 */
function exampleResultImport() {
  console.log('\n=== Example 5: Result Import with Advanced Error Handling ===');
  
  const eventId = 'evt_20250115_marathon_001';
  const importId = 'imp_001';
  
  console.log('Process batch import:');
  console.log(`
curl -X POST ${BASE_URL}/admin/events/${eventId}/result-imports/${importId}/process \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "file_key": "result-imports/20250115_timing_results.csv"
  }'
  `);

  console.log('\nExport import errors as CSV:');
  console.log(`GET ${BASE_URL}/admin/events/${eventId}/result-imports/${importId}/errors/export`);

  console.log('\nError categories:');
  console.log(`
- missing_field: Required fields missing from result row
- invalid_format: Field format doesn't match expected pattern (e.g., invalid time format)
- duplicate: Duplicate bib number in results
- constraint_violation: Violates database constraint
- not_found: Referenced bib number not found in event
- other: Unexpected error
  `);
}

/**
 * Example 6: Bulk Check-In Recording
 */
function exampleBulkCheckIn() {
  console.log('\n=== Example 6: Bulk Check-In Recording ===');
  
  const eventId = 'evt_20250115_marathon_001';
  
  console.log('Record multiple check-ins:');
  console.log(`
curl -X POST ${BASE_URL}/admin/events/${eventId}/check-ins/bulk \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "checkIns": [
      {
        "bib_number": 1001,
        "status": "checked_in",
        "participation_mode": "race",
        "check_in_timestamp": "2025-01-15T09:00:00Z"
      },
      {
        "bib_number": 1002,
        "status": "checked_in",
        "participation_mode": "walk",
        "check_in_timestamp": "2025-01-15T09:05:00Z"
      }
    ]
  }'
  `);
}

/**
 * Main execution
 */
function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║      Phase 7 Extended - Endpoint Usage Examples        ║');
  console.log('║         Webhooks, QR Codes, Real-Time Dashboard        ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  exampleWebhookTimingResults();
  exampleQRCodeGeneration();
  exampleRealtimeDashboard();
  exampleBulkBibAssignment();
  exampleResultImport();
  exampleBulkCheckIn();

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                   Implementation Notes                  ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`
✓ All endpoints require authentication via JWT token (except webhooks)
✓ Webhook signature must be HMAC-SHA256 of "timestamp.payload"
✓ Webhook timestamp must be within 5 minutes of current time
✓ QR codes encode: EVENT:{id}|BIB:{number}|TIME:{timestamp}
✓ Real-time dashboard uses polling (5-second intervals)
✓ Result imports support CSV/XLSX with error tracking
✓ Bulk operations return individual success/failure per item
✓ All endpoints protected by role-based authorization (admin/organizer)
  `);

  console.log('\n═══════════════════════════════════════════════════════\n');
}

main();
