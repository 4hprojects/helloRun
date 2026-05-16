const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeMongoOrganiser,
  normalizeMongoEvent,
  buildEventChecksum
} = require('../src/services/event-shadow.service');

test('normalizeMongoOrganiser maps approved application and user identity', () => {
  const user = {
    _id: '665000000000000000000001',
    email: 'organiser@example.com',
    role: 'organiser',
    organizerStatus: 'approved'
  };
  const application = {
    _id: '665000000000000000000002',
    applicationId: 'APP000001',
    businessName: 'Run Club',
    businessType: 'sports_club',
    contactPhone: '09171234567',
    businessRegistrationNumber: 'BRN-123',
    businessAddress: 'Manila',
    status: 'approved',
    reviewedAt: new Date('2026-01-02T00:00:00.000Z'),
    submittedAt: new Date('2026-01-01T00:00:00.000Z')
  };

  const normalized = normalizeMongoOrganiser({ user, application });

  assert.equal(normalized.mongoUserId, user._id);
  assert.equal(normalized.mongoApplicationId, application._id);
  assert.equal(normalized.applicationReference, 'APP000001');
  assert.equal(normalized.businessName, 'Run Club');
  assert.equal(normalized.status, 'approved');
});

test('normalizeMongoEvent keeps core fields and unique distance labels', () => {
  const event = {
    _id: '665000000000000000000003',
    organizerId: '665000000000000000000001',
    slug: 'sample-event',
    referenceCode: 'EV-123',
    title: 'Sample Event',
    organiserName: 'Run Club',
    status: 'published',
    eventType: 'virtual',
    virtualCompletionMode: 'accumulated_distance',
    raceDistances: ['5K', '10K', '5K', ''],
    registrationOpenAt: new Date('2026-02-01T00:00:00.000Z'),
    registrationCloseAt: new Date('2026-02-10T00:00:00.000Z'),
    eventStartAt: new Date('2026-02-11T00:00:00.000Z'),
    eventEndAt: new Date('2026-02-12T00:00:00.000Z'),
    feeMode: 'paid',
    feeAmount: 250,
    feeCurrency: 'php',
    isDeleted: false
  };

  const normalized = normalizeMongoEvent(event);

  assert.equal(normalized.mongoEventId, event._id);
  assert.equal(normalized.status, 'published');
  assert.equal(normalized.eventType, 'virtual');
  assert.equal(normalized.virtualCompletionMode, 'accumulated_distance');
  assert.deepEqual(normalized.distances, ['5K', '10K']);
  assert.equal(normalized.feeCurrency, 'PHP');
});

test('buildEventChecksum changes when core event fields change', () => {
  const base = normalizeMongoEvent({
    _id: '665000000000000000000004',
    slug: 'checksum-event',
    title: 'Checksum Event',
    organiserName: 'Run Club',
    status: 'draft',
    raceDistances: ['5K']
  });
  const changed = { ...base, status: 'published' };

  assert.notEqual(buildEventChecksum(base), buildEventChecksum(changed));
});

test('syncEventShadow inserts event core and distances into Supabase shadow tables', async () => {
  const { syncEventShadow } = require('../src/services/event-shadow.service');
  const calls = [];
  const sql = (strings, ...values) => {
    const query = strings.join('${}');
    calls.push({ query, values });

    if (query.includes('select id from organisers')) {
      return [{ id: 'organiser-uuid' }];
    }
    if (query.includes('insert into events_core')) {
      return [{ id: 'event-core-uuid' }];
    }
    if (query.includes('delete from event_distances')) {
      return [];
    }
    if (query.includes('insert into event_distances')) {
      return [];
    }
    if (query.includes('insert into migration_records')) {
      return [];
    }

    throw new Error(`Unexpected SQL query: ${query}`);
  };

  const event = {
    _id: '665000000000000000000005',
    organizerId: '665000000000000000000001',
    slug: 'sync-event',
    referenceCode: 'SE-001',
    title: 'Sync Event',
    organiserName: 'Run Club',
    status: 'published',
    eventType: 'virtual',
    virtualCompletionMode: 'single_activity',
    raceDistances: ['5K', '10K'],
    registrationOpenAt: new Date('2026-06-01T00:00:00.000Z'),
    registrationCloseAt: new Date('2026-06-10T00:00:00.000Z'),
    eventStartAt: new Date('2026-06-11T00:00:00.000Z'),
    eventEndAt: new Date('2026-06-12T00:00:00.000Z'),
    feeMode: 'paid',
    feeAmount: 200,
    feeCurrency: 'PHP',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-02T00:00:00.000Z')
  };

  const result = await syncEventShadow(event, { sql, operation: 'test' });

  assert.equal(result.id, 'event-core-uuid');
  assert.ok(calls.some((call) => call.query.includes('insert into events_core')));
  assert.ok(calls.some((call) => call.query.includes('insert into event_distances')));
});
