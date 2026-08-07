'use strict';

// The organiser-facing switch for guest registration.
//
// Without this the setting exists but nobody can turn it on, so the whole guest flow is
// unreachable — which is exactly what production looked like before this landed.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const formService = read('src/services/event-form.service.js');
const createView = read('src/views/organizer/create-event.ejs');
const editView = read('src/views/organizer/edit-event.ejs');
const publicView = read('src/views/pages/event-details.ejs');
const eventModel = read('src/models/Event.js');

test('the setting is wired through all four points of the event form', () => {
  // Miss any one and the toggle silently fails to stick: no default, not parsed from the
  // body, not read back onto the form, or never written to the event.
  assert.match(formService, /allowGuestRegistration: '0'/, 'needs a default for a new form');
  assert.match(
    formService,
    /allowGuestRegistration: normalizeBoolean\(body\.allowGuestRegistration\)/,
    'needs to be parsed from the submitted body'
  );
  assert.match(
    formService,
    /allowGuestRegistration: Boolean\(event\.allowGuestRegistration\)/,
    'needs to be read back when editing a saved event'
  );
  assert.match(
    formService,
    /event\.allowGuestRegistration = Boolean\(formData\.allowGuestRegistration\)/,
    'needs to be persisted onto the event'
  );
});

test('it defaults to off', () => {
  // A guest entry cannot submit results or earn a certificate until claimed, so turning
  // this on is a trade the organiser makes deliberately.
  assert.match(eventModel, /allowGuestRegistration: \{ type: Boolean, default: false \}/);
  assert.match(formService, /allowGuestRegistration: '0'/);
});

test('both builder forms carry the toggle, with a hidden field so unchecking sticks', () => {
  [['create-event', createView], ['edit-event', editView]].forEach(([name, view]) => {
    assert.match(view, /name="allowGuestRegistration" value="0"/, `${name} needs the hidden fallback`);
    assert.match(
      view,
      /type="checkbox" id="allowGuestRegistration"[^>]*value="1"/,
      `${name} needs the checkbox`
    );
    assert.match(view, /formData\.allowGuestRegistration \? 'checked' : ''/, `${name} must reflect state`);
  });
});

test('the toggle explains the trade rather than just naming the setting', () => {
  [createView, editView].forEach((view) => {
    assert.match(view, /cannot submit results, earn badges or download a certificate/);
  });
});

test('the public event page links to the guest form only when it is enabled', () => {
  assert.match(publicView, /event\.allowGuestRegistration/);
  assert.match(publicView, /\/register\/guest/);
  // And only when registration is actually open — offering it on a closed event would
  // walk someone into a refusal.
  assert.match(publicView, /event\.allowGuestRegistration && details\.primaryCta && !details\.primaryCta\.disabled/);
});
