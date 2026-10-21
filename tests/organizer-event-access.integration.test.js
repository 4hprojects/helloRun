'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const EventCoOrganizer = require('../src/models/EventCoOrganizer');
const {
  requireOrganizerEventAccess,
  requireOrganizerEventReviewAccess
} = require('../src/middleware/organizer-event-access.middleware');

const fixtureIds = {
  users: [],
  events: [],
  memberships: []
};
let fixtures;

test.before(async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is required for organizer event access integration tests.');
  if (mongoose.connection.readyState === 0) await mongoose.connect(mongoUri);
  fixtures = await seedFixtures();
});

test.after(async () => {
  await EventCoOrganizer.deleteMany({ _id: { $in: fixtureIds.memberships } });
  await Event.deleteMany({ _id: { $in: fixtureIds.events } });
  await User.deleteMany({ _id: { $in: fixtureIds.users } });
  await mongoose.disconnect();
});

test('event access admits the owner, an active co-organizer, and both admin tiers', async () => {
  for (const user of [fixtures.owner, fixtures.coOrganizer, fixtures.fullAdmin, fixtures.supportAdmin]) {
    const result = await invoke(requireOrganizerEventAccess, user._id, fixtures.event._id);
    assert.equal(result.nextCalled, true, `${user.email} should have event access`);
    assert.equal(String(result.req.organizerEvent._id), String(fixtures.event._id));
  }
});

test('event access denies unrelated organizers, ordinary runners, and stale co-organizer memberships', async () => {
  for (const user of [fixtures.otherOrganizer, fixtures.runner, fixtures.staleCoOrganizer]) {
    const result = await invoke(requireOrganizerEventAccess, user._id, fixtures.event._id);
    assert.equal(result.statusCode, 404, `${user.email} must not learn whether the event exists`);
    assert.equal(result.nextCalled, false);
  }
});

test('event access rejects restricted accounts before resolving ownership or membership', async () => {
  for (const user of [fixtures.restrictedOwner, fixtures.restrictedCoOrganizer]) {
    const result = await invoke(requireOrganizerEventAccess, user._id, fixtures.restrictedEvent._id);
    assert.equal(result.statusCode, 403);
    assert.match(result.body.message, /cannot manage events/i);
  }
});

test('review access requires organizer approval but admits both admin tiers', async () => {
  const pendingResult = await invoke(requireOrganizerEventReviewAccess, fixtures.pendingOwner._id, fixtures.pendingEvent._id);
  assert.equal(pendingResult.statusCode, 403);
  assert.match(pendingResult.body.message, /approval is required/i);

  for (const user of [fixtures.owner, fixtures.coOrganizer, fixtures.fullAdmin, fixtures.supportAdmin]) {
    const result = await invoke(requireOrganizerEventReviewAccess, user._id, fixtures.event._id);
    assert.equal(result.nextCalled, true, `${user.email} should have participant review access`);
  }
});

test('the guard accepts legacy :id route parameters and handles invalid or missing references', async () => {
  const legacy = await invoke(requireOrganizerEventAccess, fixtures.owner._id, fixtures.event._id, { paramName: 'id' });
  assert.equal(legacy.nextCalled, true);

  const invalid = await invoke(requireOrganizerEventAccess, fixtures.owner._id, 'not-an-object-id');
  assert.equal(invalid.statusCode, 400);

  const missing = await invoke(requireOrganizerEventAccess, fixtures.owner._id, new mongoose.Types.ObjectId());
  assert.equal(missing.statusCode, 404);
});

test('missing sessions redirect and deleted users are denied', async () => {
  const noSession = await invoke(requireOrganizerEventAccess, null, fixtures.event._id);
  assert.equal(noSession.redirectedTo, '/login');

  const deletedUser = await invoke(requireOrganizerEventAccess, new mongoose.Types.ObjectId(), fixtures.event._id);
  assert.equal(deletedUser.statusCode, 403);
});

async function invoke(middleware, userId, eventId, { paramName = 'eventId' } = {}) {
  const req = {
    session: userId ? { userId: String(userId) } : {},
    params: { [paramName]: String(eventId) },
    body: {},
    path: `/organizer/events/${eventId}`,
    headers: { accept: 'application/json' },
    get(name) { return this.headers[String(name).toLowerCase()]; }
  };
  const result = { req, statusCode: 200, body: null, redirectedTo: null, nextCalled: false };
  const res = {
    set() { return this; },
    status(code) { result.statusCode = code; return this; },
    json(body) { result.body = body; return body; },
    render(_view, body) { result.body = body; return body; },
    redirect(path) { result.redirectedTo = path; return path; }
  };
  await middleware(req, res, (error) => {
    if (error) throw error;
    result.nextCalled = true;
  });
  return result;
}

async function seedFixtures() {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const user = (label, overrides = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    userId: `CQ3${label}${suffix}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 22),
    email: `cq3.${label}.${suffix}@example.test`,
    passwordHash: 'not-used-by-middleware-tests',
    firstName: 'CQ3',
    lastName: label,
    role: 'runner',
    emailVerified: true,
    accountStatus: 'active',
    ...overrides
  });
  const users = {
    owner: user('owner', { role: 'organiser', organizerStatus: 'approved' }),
    coOrganizer: user('coorg', { role: 'organiser', organizerStatus: 'approved' }),
    fullAdmin: user('fulladmin', { role: 'admin', adminTier: 'full' }),
    supportAdmin: user('supportadmin', { role: 'admin', adminTier: 'support' }),
    otherOrganizer: user('other', { role: 'organiser', organizerStatus: 'approved' }),
    runner: user('runner'),
    staleCoOrganizer: user('stale', { role: 'organiser', organizerStatus: 'approved' }),
    restrictedOwner: user('restrictedowner', { role: 'organiser', organizerStatus: 'approved', accountStatus: 'restricted' }),
    restrictedCoOrganizer: user('restrictedcoorg', { role: 'organiser', organizerStatus: 'approved', accountStatus: 'restricted' }),
    pendingOwner: user('pending', { role: 'organiser', organizerStatus: 'pending' })
  };
  await User.collection.insertMany(Object.values(users));
  fixtureIds.users.push(...Object.values(users).map((entry) => entry._id));

  const event = buildEvent(users.owner._id, `cq3-main-${suffix}`);
  const restrictedEvent = buildEvent(users.restrictedOwner._id, `cq3-restricted-${suffix}`);
  const pendingEvent = buildEvent(users.pendingOwner._id, `cq3-pending-${suffix}`);
  await Event.collection.insertMany([event, restrictedEvent, pendingEvent]);
  fixtureIds.events.push(event._id, restrictedEvent._id, pendingEvent._id);

  const memberships = [
    buildMembership(event._id, users.coOrganizer, users.owner._id, 'active'),
    buildMembership(event._id, users.staleCoOrganizer, users.owner._id, 'revoked'),
    buildMembership(restrictedEvent._id, users.restrictedCoOrganizer, users.restrictedOwner._id, 'active')
  ];
  await EventCoOrganizer.collection.insertMany(memberships);
  fixtureIds.memberships.push(...memberships.map((entry) => entry._id));

  return { ...users, event, restrictedEvent, pendingEvent };
}

function buildEvent(organizerId, slug) {
  return {
    _id: new mongoose.Types.ObjectId(),
    organizerId,
    slug,
    referenceCode: `CQ3-${new mongoose.Types.ObjectId().toString().slice(-8)}`,
    title: `CQ-3 ${slug}`,
    organiserName: 'CQ-3 Test Organizer',
    status: 'draft',
    isTestData: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function buildMembership(eventId, member, invitedBy, status) {
  return {
    _id: new mongoose.Types.ObjectId(),
    eventId,
    userId: member._id,
    invitedEmail: member.email,
    status,
    invitedBy,
    invitedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
}
