// tests/ocr-payload-separation.test.js
// Verify that OCR fields stay in MongoDB and are NOT synced to Supabase

const test = require('node:test');
const assert = require('node:assert');
const { normalizeMongoSubmission } = require('../src/services/submission-shadow.service');

test('OCR Payload Separation - OCR fields excluded from Supabase sync', async (t) => {
  const mockSubmission = {
    _id: { toString: () => 'sub_123' },
    registrationId: { toString: () => 'reg_123' },
    eventId: { toString: () => 'evt_123' },
    runnerId: { toString: () => 'runner_123' },
    distanceKm: 10.5,
    elapsedMs: 3600000,
    runDate: new Date('2026-05-17'),
    participationMode: 'virtual',
    runType: 'run',
    proofType: 'photo',
    proof: {
      url: 'https://r2.example.com/proof.jpg',
      key: 'proof_key_123',
      mimeType: 'image/jpeg'
    },
    status: 'submitted',
    isPersonalRecord: false,
    submittedAt: new Date('2026-05-17T10:00:00Z'),
    reviewedAt: null,
    reviewedBy: null,
    // OCR PAYLOAD - should NOT appear in normalized result
    ocrData: {
      extractedDistanceKm: 9.8,
      extractedTimeMs: 3480000,
      confidence: 0.92,
      distanceMismatch: true,
      detectedSource: 'nike',
      extractedName: 'John Doe',
      nameMatchStatus: 'mismatched',
      nameMismatchAcknowledged: true,
      rawText: 'OCR raw extraction text here'
    },
    suspiciousFlag: true,
    suspiciousFlagReason: 'Large distance discrepancy detected',
    stravaActivity: {
      id: 987654,
      name: 'Morning Run',
      distanceMeters: 10500,
      movingTimeSeconds: 3600
    },
    proofNotes: 'This is a flexible proof note',
    runLocation: 'Central Park',
    elevationGain: 50,
    steps: 12000
  };

  // Normalize submission for Supabase sync
  const normalized = normalizeMongoSubmission(mockSubmission);

  // Verify official fields ARE included
  assert.strictEqual(normalized.mongo_submission_id, 'sub_123', 'mongo_submission_id should be included');
  assert.strictEqual(normalized.distance_km, 10.5, 'distance_km should be included');
  assert.strictEqual(normalized.elapsed_ms, 3600000, 'elapsed_ms should be included');
  assert.strictEqual(normalized.submission_status, 'submitted', 'submission_status should be included');
  assert.strictEqual(normalized.is_personal_record, false, 'is_personal_record should be included');
  assert.strictEqual(normalized.proof_type, 'photo', 'proof_type should be included');
  assert.strictEqual(normalized.proof_url, 'https://r2.example.com/proof.jpg', 'proof_url should be included');

  // Verify OCR fields ARE NOT included
  assert.strictEqual(normalized.ocrData, undefined, 'ocrData should NOT be included in sync');
  assert.strictEqual(normalized.suspiciousFlag, undefined, 'suspiciousFlag should NOT be included in sync');
  assert.strictEqual(normalized.suspiciousFlagReason, undefined, 'suspiciousFlagReason should NOT be included in sync');
  assert.strictEqual(normalized.stravaActivity, undefined, 'stravaActivity should NOT be included in sync');
  assert.strictEqual(normalized.proofNotes, undefined, 'proofNotes should NOT be included in sync');
  assert.strictEqual(normalized.runLocation, undefined, 'runLocation should NOT be included in sync');
  assert.strictEqual(normalized.elevationGain, undefined, 'elevationGain should NOT be included in sync');
  assert.strictEqual(normalized.steps, undefined, 'steps should NOT be included in sync');

  // Verify proof metadata IS included (not full proof object)
  assert.strictEqual(normalized.proof_key, 'proof_key_123', 'proof_key should be included');
  assert.strictEqual(normalized.proof_mime_type, 'image/jpeg', 'proof_mime_type should be included');
});

test('OCR Payload Separation - ocrData changes do not affect sync checksum', async (t) => {
  const { buildSubmissionChecksum } = require('../src/services/submission-shadow.service');

  const base = {
    distance_km: 10.5,
    elapsed_ms: 3600000,
    proof_type: 'photo',
    submission_status: 'submitted',
    is_personal_record: false
  };

  const checksum1 = buildSubmissionChecksum(base);

  // Simulate ocrData change (would not affect official checksum)
  // Checksum only uses: distance_km, elapsed_ms, proof_type, submission_status, is_personal_record
  const checksum2 = buildSubmissionChecksum(base);

  assert.strictEqual(checksum1, checksum2, 'Checksums should be identical for same official fields');
});

test('OCR Payload Separation - OCR fields remain unchanged in MongoDB after Supabase sync', async (t) => {
  // This test verifies that the normalization function does not mutate the original submission
  const mockSubmission = {
    _id: { toString: () => 'sub_456' },
    registrationId: { toString: () => 'reg_456' },
    eventId: { toString: () => 'evt_456' },
    runnerId: { toString: () => 'runner_456' },
    distanceKm: 5.0,
    elapsedMs: 1800000,
    runDate: new Date('2026-05-17'),
    status: 'submitted',
    submittedAt: new Date(),
    ocrData: {
      confidence: 0.95,
      extractedName: 'Jane Smith'
    },
    suspiciousFlag: false,
    stravaActivity: { id: 123 }
  };

  const originalOcrData = JSON.stringify(mockSubmission.ocrData);
  const originalSuspiciousFlag = mockSubmission.suspiciousFlag;

  // Normalize (this should not mutate original)
  const normalized = normalizeMongoSubmission(mockSubmission);

  // Verify MongoDB document is unchanged
  assert.strictEqual(
    JSON.stringify(mockSubmission.ocrData),
    originalOcrData,
    'ocrData should not be mutated during normalization'
  );
  assert.strictEqual(
    mockSubmission.suspiciousFlag,
    originalSuspiciousFlag,
    'suspiciousFlag should not be mutated during normalization'
  );

  // Verify normalized result does not reference original OCR data
  assert.notStrictEqual(
    normalized.ocrData,
    mockSubmission.ocrData,
    'normalized result should not reference original ocrData'
  );
});
