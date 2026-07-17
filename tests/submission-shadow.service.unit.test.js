// tests/submission-shadow.service.test.js
// Unit tests for submission and certificate shadow sync behavior

const { test } = require('node:test');
const assert = require('node:assert');
const {
  normalizeMongoSubmission,
  buildSubmissionChecksum,
  normalizeMongoSubmissionCertificate
} = require('../src/services/submission-shadow.service');

test('normalizeMongoSubmission maps submission and proof fields', async () => {
  const fakeSubmission = {
    _id: { toString: () => 'mongo_submission_123' },
    registrationId: { toString: () => 'mongo_reg_456' },
    runnerId: { toString: () => 'mongo_runner_789' },
    eventId: { toString: () => 'mongo_event_321' },
    distanceKm: 21.1,
    elapsedMs: 7200000,
    runDate: new Date('2026-05-15'),
    participationMode: 'virtual',
    runType: 'run',
    proofType: 'gps',
    proof: {
      url: 'https://r2.example.com/proof.png',
      key: 'submissions/proofs/123.png',
      mimeType: 'image/png'
    },
    status: 'approved',
    isPersonalRecord: true,
    submittedAt: new Date('2026-05-10'),
    reviewedAt: new Date('2026-05-11'),
    reviewedBy: { toString: () => 'mongo_reviewer_111' }
  };

  const normalized = normalizeMongoSubmission(fakeSubmission);

  assert.equal(normalized.mongo_submission_id, 'mongo_submission_123');
  assert.equal(normalized.registration_id, 'mongo_reg_456');
  assert.equal(normalized.runner_user_id, 'mongo_runner_789');
  assert.equal(normalized.event_id, 'mongo_event_321');
  assert.equal(normalized.distance_km, 21.1);
  assert.equal(normalized.elapsed_ms, 7200000);
  assert.equal(normalized.participation_mode, 'virtual');
  assert.equal(normalized.run_type, 'run');
  assert.equal(normalized.proof_type, 'gps');
  assert.equal(normalized.proof_url, 'https://r2.example.com/proof.png');
  assert.equal(normalized.proof_key, 'submissions/proofs/123.png');
  assert.equal(normalized.submission_status, 'approved');
  assert.ok(normalized.is_personal_record);
  assert.equal(normalized.reviewed_by, 'mongo_reviewer_111');
});

test('buildSubmissionChecksum changes when submission status changes', () => {
  const normalizedApproved = {
    distance_km: 21.1,
    elapsed_ms: 7200000,
    proof_type: 'gps',
    submission_status: 'approved',
    is_personal_record: true
  };

  const normalizedRejected = {
    distance_km: 21.1,
    elapsed_ms: 7200000,
    proof_type: 'gps',
    submission_status: 'rejected',
    is_personal_record: true
  };

  const checksumApproved = buildSubmissionChecksum(normalizedApproved);
  const checksumRejected = buildSubmissionChecksum(normalizedRejected);

  assert.notEqual(checksumApproved, checksumRejected, 'checksums should differ for different status');
});

test('normalizeMongoSubmissionCertificate maps certificate metadata', () => {
  const fakeSubmission = {
    _id: { toString: () => 'mongo_submission_123' },
    certificate: {
      url: 'https://r2.example.com/cert.pdf',
      key: 'certificates/cert_123.pdf',
      issuedAt: new Date('2026-05-12'),
      goalDistanceKm: 21,
      verifiedDistanceKm: 30,
      approvedActivityCount: 3,
      finalizedAt: new Date('2026-05-13')
    },
    reviewedBy: { toString: () => 'mongo_reviewer_111' }
  };

  const fakeSubmissionCoreRow = {
    id: 'uuid_submission_core_123',
    runner_user_id: 'uuid_runner_789',
    event_id: 'uuid_event_321'
  };

  const normalized = normalizeMongoSubmissionCertificate(fakeSubmission, fakeSubmissionCoreRow);

  assert.ok(normalized, 'should return certificate object');
  assert.equal(normalized.mongo_certificate_id, 'cert_mongo_submission_123');
  assert.equal(normalized.submission_id, 'uuid_submission_core_123');
  assert.equal(normalized.runner_user_id, 'uuid_runner_789');
  assert.equal(normalized.certificate_url, 'https://r2.example.com/cert.pdf');
  assert.equal(normalized.certificate_key, 'certificates/cert_123.pdf');
  assert.equal(normalized.certificate_type, 'finisher');
  assert.equal(normalized.goal_distance_km, 21);
  assert.equal(normalized.verified_distance_km, 30);
  assert.equal(normalized.approved_activity_count, 3);
  assert.equal(normalized.finalized_at.toISOString(), '2026-05-13T00:00:00.000Z');
});

test('normalizeMongoSubmissionCertificate returns null when no certificate', () => {
  const fakeSubmission = {
    _id: { toString: () => 'mongo_submission_123' },
    certificate: {
      url: '',
      key: '',
      issuedAt: null
    }
  };

  const fakeSubmissionCoreRow = {
    id: 'uuid_submission_core_123',
    runner_user_id: 'uuid_runner_789',
    event_id: 'uuid_event_321'
  };

  const normalized = normalizeMongoSubmissionCertificate(fakeSubmission, fakeSubmissionCoreRow);

  assert.equal(normalized, null, 'should return null when certificate is empty');
});
