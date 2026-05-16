const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeMongoRegistration,
  buildRegistrationChecksum
} = require('../src/services/registration-payment-shadow.service');

test('normalizeMongoRegistration maps registration and payment proof fields', () => {
  const registration = {
    _id: '665000000000000000000100',
    eventId: '665000000000000000000101',
    userId: '665000000000000000000102',
    confirmationCode: 'hr-abc123',
    participant: {
      firstName: 'Runner',
      lastName: 'One',
      email: 'Runner.One@Example.com',
      mobile: '09171234567',
      gender: 'female'
    },
    participationMode: 'onsite',
    raceDistance: '10K',
    status: 'confirmed',
    paymentStatus: 'proof_submitted',
    paymentProof: {
      url: 'https://example.com/proof.png',
      key: 'proof-key',
      mimeType: 'image/png',
      size: 1234,
      uploadedAt: new Date('2026-03-01T00:00:00.000Z'),
      submittedBy: '665000000000000000000102'
    },
    paymentSubmissionCount: 2,
    paymentReviewedAt: new Date('2026-03-02T00:00:00.000Z'),
    paymentReviewedBy: '665000000000000000000103',
    paymentReviewNotes: 'Looks good',
    waiver: {
      accepted: true,
      version: 3,
      signature: 'Runner One',
      acceptedAt: new Date('2026-02-28T00:00:00.000Z')
    },
    registeredAt: new Date('2026-02-28T00:00:00.000Z')
  };

  const normalized = normalizeMongoRegistration(registration);

  assert.equal(normalized.mongoRegistrationId, registration._id);
  assert.equal(normalized.confirmationCode, 'HR-ABC123');
  assert.equal(normalized.participantEmail, 'runner.one@example.com');
  assert.equal(normalized.participationMode, 'onsite');
  assert.equal(normalized.paymentStatus, 'proof_submitted');
  assert.equal(normalized.paymentProofUrl, 'https://example.com/proof.png');
  assert.equal(normalized.paymentSubmissionCount, 2);
  assert.equal(normalized.waiverVersion, 3);
});

test('buildRegistrationChecksum changes when payment status changes', () => {
  const base = normalizeMongoRegistration({
    _id: '665000000000000000000104',
    eventId: '665000000000000000000101',
    userId: '665000000000000000000102',
    confirmationCode: 'HR-XYZ789',
    participant: { email: 'runner@example.com' },
    participationMode: 'virtual',
    raceDistance: '5K',
    status: 'confirmed',
    paymentStatus: 'unpaid'
  });

  const changed = { ...base, paymentStatus: 'paid' };
  assert.notEqual(buildRegistrationChecksum(base), buildRegistrationChecksum(changed));
});

test('syncRegistrationPaymentShadow inserts registration and payment shadow rows', async () => {
  const { syncRegistrationPaymentShadow } = require('../src/services/registration-payment-shadow.service');
  const calls = [];
  const sql = (strings, ...values) => {
    const query = strings.join('${}');
    calls.push({ query, values });

    if (query.includes('select id from events_core')) {
      return [{ id: 'event-core-uuid' }];
    }
    if (query.includes('select id from app_users')) {
      return [{ id: 'app-user-uuid' }];
    }
    if (query.includes('insert into registrations')) {
      return [{ id: 'registration-uuid' }];
    }
    if (query.includes('insert into payments')) {
      return [];
    }
    if (query.includes('insert into migration_records')) {
      return [];
    }

    throw new Error(`Unexpected SQL query: ${query}`);
  };

  const registration = {
    _id: '665000000000000000000110',
    eventId: '665000000000000000000101',
    userId: '665000000000000000000102',
    participant: { email: 'runner@example.com' },
    participationMode: 'virtual',
    raceDistance: '5K',
    status: 'confirmed',
    paymentStatus: 'proof_submitted',
    paymentProof: {
      url: 'https://example.com/proof.png',
      key: 'proof-key',
      mimeType: 'image/png',
      size: 1234,
      uploadedAt: new Date('2026-05-01T00:00:00.000Z'),
      submittedBy: '665000000000000000000102'
    },
    paymentSubmissionCount: 1,
    paymentReviewedAt: new Date('2026-05-02T00:00:00.000Z'),
    paymentReviewedBy: '665000000000000000000103',
    paymentReviewNotes: 'Looks good',
    paymentRejectionReason: '',
    waiver: {
      accepted: true,
      version: 1,
      signature: 'Runner',
      acceptedAt: new Date('2026-04-30T00:00:00.000Z')
    },
    registeredAt: new Date('2026-04-30T00:00:00.000Z')
  };

  const result = await syncRegistrationPaymentShadow(registration, { sql, operation: 'test' });

  assert.equal(result.id, 'registration-uuid');
  assert.ok(calls.some((call) => call.query.includes('insert into registrations')));
  assert.ok(calls.some((call) => call.query.includes('insert into payments')));
});
