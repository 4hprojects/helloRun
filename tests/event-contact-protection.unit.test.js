'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const CommunicationLog = require('../src/models/CommunicationLog');
const {
  CONTACT_COOLDOWN_MS,
  getContactCooldown,
  startContactCooldown,
  acquireContactSendLock,
  __resetContactProtectionForTests,
  __setDisableContactProtectionRedis
} = require('../src/services/event-contact-protection.service');

const originalFindOne = CommunicationLog.findOne;

test.before(() => {
  __setDisableContactProtectionRedis(true);
});

test.after(() => {
  CommunicationLog.findOne = originalFindOne;
  __setDisableContactProtectionRedis(false);
  __resetContactProtectionForTests();
});

test.beforeEach(() => {
  __resetContactProtectionForTests();
  stubRecentLog(null);
});

test('successful contact starts a ten-minute user-and-event cooldown', async () => {
  const now = new Date('2026-07-17T04:00:00.000Z');
  const started = await startContactCooldown({ userId: 'runner-1', eventId: 'event-1', now });
  const active = await getContactCooldown({
    userId: 'runner-1',
    eventId: 'event-1',
    now: new Date(now.getTime() + 60_000)
  });

  assert.equal(started.retryAt.getTime(), now.getTime() + CONTACT_COOLDOWN_MS);
  assert.equal(active.active, true);
  assert.equal(active.retryAfterSeconds, 540);
});

test('contact cooldown does not leak across runners or events', async () => {
  const now = new Date('2026-07-17T04:00:00.000Z');
  await startContactCooldown({ userId: 'runner-1', eventId: 'event-1', now });

  assert.equal(await getContactCooldown({ userId: 'runner-2', eventId: 'event-1', now }), null);
  assert.equal(await getContactCooldown({ userId: 'runner-1', eventId: 'event-2', now }), null);
});

test('in-flight lock rejects a concurrent double send and releases cleanly', async () => {
  const scope = { userId: 'runner-1', eventId: 'event-1', now: new Date('2026-07-17T04:00:00.000Z') };
  const firstLock = await acquireContactSendLock(scope);

  await assert.rejects(
    () => acquireContactSendLock(scope),
    (error) => error?.code === 'CONTACT_SEND_IN_PROGRESS'
  );

  await firstLock.release();
  const nextLock = await acquireContactSendLock(scope);
  await nextLock.release();
});

test('recent successful communication log restores cooldown after cache loss', async () => {
  const now = new Date('2026-07-17T04:10:00.000Z');
  stubRecentLog({ sentAt: new Date(now.getTime() - 2 * 60_000), createdAt: now });

  const active = await getContactCooldown({ userId: 'runner-1', eventId: 'event-1', now });

  assert.equal(active.active, true);
  assert.equal(active.retryAfterSeconds, 8 * 60);
});

function stubRecentLog(value) {
  CommunicationLog.findOne = () => ({
    sort() { return this; },
    select() { return this; },
    async lean() { return value; }
  });
}
