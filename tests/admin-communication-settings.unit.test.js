const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CommunicationEventSetting = require('../src/models/CommunicationEventSetting');
const { COMMUNICATION_EVENTS, COMMUNICATION_EVENT_MAP } = require('../src/services/communication-events.registry');

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

test('every registered communication event uses a schema-supported priority', () => {
  const supportedPriorities = new Set(CommunicationEventSetting.PRIORITIES);
  const unsupported = COMMUNICATION_EVENTS
    .filter((event) => !supportedPriorities.has(event.priority))
    .map((event) => `${event.eventKey}:${event.priority}`);

  assert.deepEqual(unsupported, []);
  assert.equal(COMMUNICATION_EVENT_MAP.get('event.started_reminder').priority, 'medium');
  assert.equal(COMMUNICATION_EVENT_MAP.get('result.submission_reminder').priority, 'medium');
});

test('admin communication pages receive the shared date formatter', () => {
  const controller = read('src/controllers/admin/badges.controller.js');
  const shared = read('src/controllers/admin/_shared.js');

  assert.match(shared, /module\.exports\s*=\s*\{[\s\S]*formatAdminDateTime/);
  assert.match(
    controller,
    /const\s*\{[\s\S]*formatAdminReviewDate,\s*formatAdminDateTime,\s*appendAdminPageMessage[\s\S]*\}\s*=\s*require\('\.\/_shared'\)/
  );
  assert.match(controller, /formatDateTime:\s*formatAdminDateTime/);
});
