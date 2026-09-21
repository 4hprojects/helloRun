'use strict';

// DB-free: the runner's run-proof form treats "Tracking app or device" as optional unless a
// selected event has the organizer setting requireTrackingAppDevice. The server already enforced
// the setting per event; the form used to hard-code the field as required for every event.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const modalView = read('src/views/partials/run-proof-modal.ejs');
const modalJs = read('src/public/js/run-proof-modal.js');
const service = read('src/services/submission.service.js');
const controller = read('src/controllers/page/submission.controller.js');

const deviceInput = () => modalView.match(/<input id="runProofTrackingAppDevice"[^>]*>/)[0];

test('the device input is not required by default', () => {
  const input = deviceInput();
  assert.match(input, /name="trackingAppDevice"/);
  assert.doesNotMatch(input, /\brequired\b/);
  assert.match(input, /placeholder="Optional:/);
});

test('each submission option says whether its event requires a device, and the event field is loaded', () => {
  assert.match(service, /requiresTrackingDevice: Boolean\(registration\.eventId\?\.requireTrackingAppDevice\)/);
  const select = service.match(/select: 'title slug status organizerId[^']*'/)[0];
  assert.match(select, /\brequireTrackingAppDevice\b/);
});

test('the form toggles required from the selected events, like steps', () => {
  assert.match(modalJs, /trackingAppDeviceInput\.required = selectedOptions\.some\(\(item\) => item\.requiresTrackingDevice === true\)/);
});

// Runs the real validator with stubbed inputs.
function runValidator({ value, options }) {
  const source = modalJs.match(/const validateTrackingAppDevice = \(\) => \{[\s\S]*?\n    \};/)[0];
  const errors = [];
  const factory = new Function('trackingAppDeviceInput', 'getSelectedOptions', 'setFieldError', `${source}\nreturn validateTrackingAppDevice;`);
  const validate = factory({ value }, () => options, (id, field, message) => errors.push(message));
  return { valid: validate(), errors };
}

test('a blank device is accepted when no selected event requires it', () => {
  assert.deepEqual(runValidator({ value: '', options: [{ requiresTrackingDevice: false }, {}] }), { valid: true, errors: [''] });
  assert.equal(runValidator({ value: '   ', options: [] }).valid, true);
});

test('a blank device is blocked when any selected event requires it', () => {
  const result = runValidator({ value: '  ', options: [{ requiresTrackingDevice: false }, { requiresTrackingDevice: true }] });
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['Enter the tracking app or device used.']);
});

test('a filled device always validates', () => {
  assert.equal(runValidator({ value: 'Garmin 265', options: [{ requiresTrackingDevice: true }] }).valid, true);
});

test('the server still enforces the setting per event', () => {
  assert.match(controller, /selectedRegistrations\.some\(\(item\) => item\.eventId\?\.requireTrackingAppDevice\) && !trackingAppDevice/);
  assert.match(controller, /code: 'TRACKER_REQUIRED'/);
});
