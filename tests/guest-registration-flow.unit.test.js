'use strict';

// Registering without a HelloRun account.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const {
  validateGuestForm,
  getGuestRegistrationBlock,
  generateConfirmationCode
} = require('../src/services/guest-registration.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const service = read('src/services/guest-registration.service.js');
const routes = read('src/routes/guest.routes.js');
const successView = read('src/views/pages/guest-register-success.ejs');
const registry = read('src/services/communication-events.registry.js');
const communication = read('src/services/communication.service.js');

const validBody = {
  firstName: 'Ana',
  lastName: 'Reyes',
  email: 'Ana@Example.COM',
  mobile: '09171234567',
  participationMode: 'virtual',
  waiverAccepted: 'on',
  waiverSignature: 'Ana Reyes'
};

test('a guest must supply everything, because there is no profile to fall back on', () => {
  const { errors } = validateGuestForm({});
  ['firstName', 'lastName', 'email', 'mobile', 'waiverAccepted', 'waiverSignature'].forEach((field) => {
    assert.ok(errors[field], `${field} should be required`);
  });
});

test('a valid guest form passes, and the email is normalised', () => {
  const { form, errors } = validateGuestForm(validBody);
  assert.deepEqual(errors, {});
  // Normalised so a duplicate check cannot be defeated by capitalisation.
  assert.equal(form.email, 'ana@example.com');
});

test('an onsite guest must give an emergency contact', () => {
  // Someone has to be reachable if this person gets hurt.
  const { errors } = validateGuestForm({ ...validBody, participationMode: 'onsite' });
  assert.ok(errors.emergencyContactName);
  assert.ok(errors.emergencyContactNumber);

  const { errors: ok } = validateGuestForm({
    ...validBody,
    participationMode: 'onsite',
    emergencyContactName: 'Lito',
    emergencyContactNumber: '09170000000'
  });
  assert.deepEqual(ok, {});
});

test('a bad email is refused, since the confirmation link goes there', () => {
  ['', 'nope', 'a@b', 'a b@c.com'].forEach((email) => {
    assert.ok(validateGuestForm({ ...validBody, email }).errors.email, `${email} should fail`);
  });
});

test('guest registration is off unless the organiser turns it on', () => {
  const base = { status: 'published', allowGuestRegistration: true };
  assert.equal(getGuestRegistrationBlock({ ...base }), null);
  assert.match(getGuestRegistrationBlock({ ...base, allowGuestRegistration: false }), /requires a HelloRun account/);
  assert.match(getGuestRegistrationBlock({ ...base, status: 'draft' }), /not open/);
  assert.match(getGuestRegistrationBlock(null), /not found/);
});

test('the registration window is honoured', () => {
  const base = { status: 'published', allowGuestRegistration: true };
  const future = new Date(Date.now() + 86400000);
  const past = new Date(Date.now() - 86400000);
  assert.match(getGuestRegistrationBlock({ ...base, registrationOpenAt: future }), /has not opened/);
  assert.match(getGuestRegistrationBlock({ ...base, registrationCloseAt: past }), /has closed/);
});

test('confirmation codes match the required shape', () => {
  for (let i = 0; i < 20; i += 1) {
    assert.match(generateConfirmationCode(), /^HR-[A-Z0-9]{6}$/);
  }
});

test('a slot taken for a guest is given back if the write fails', () => {
  assert.match(service, /reserveCategorySlot\(event\._id, resolvedPrice\.raceCategoryId\)/);
  assert.match(service, /releaseCategorySlot\(event\._id, reservedCategoryId\)/);
});

test('a duplicate guest entry is refused on email', () => {
  // Accounts get this from a unique index; guests cannot, because that index is keyed
  // on a user they do not have.
  assert.match(service, /findExistingGuestRegistration/);
  assert.match(service, /DUPLICATE_GUEST/);
  assert.match(service, /a check, not a guarantee/);
});

test('the unauthenticated routes are rate limited and CSRF protected', () => {
  assert.match(routes, /guestRegistrationLimiter/);
  assert.match(routes, /guestLookupLimiter/);
  assert.match(routes, /requireCsrfProtection/);
  assert.match(routes, /verifyTurnstileToken/);
});

test('the management link is never put in a URL redirect', () => {
  // A token in a redirect ends up in history, referrer headers and server logs.
  assert.match(routes, /never redirected to/);
  assert.match(routes, /res\.render\('pages\/guest-register-success'/);
  assert.doesNotMatch(routes, /redirect\(`?\/guest\/registrations\//);
});

test('an invalid link gives one message whatever the reason', () => {
  // Saying "expired" rather than "unknown" leaks that a registration exists.
  assert.match(routes, /one message for every failure reason/);
  assert.match(routes, /That link is not valid/);
});

test('the success page tells the guest the link cannot be reissued', () => {
  assert.match(successView, /Save it now/);
  assert.match(successView, /cannot show it again/);
  assert.match(successView, /do not share it/i);
  assert.doesNotMatch(successView, /<%-\s*manageToken/);
});

test('the guest confirmation email is a registered event with a sender', () => {
  assert.match(registry, /eventKey: 'registration\.guest_confirmed'/);
  assert.match(communication, /eventKey === 'registration\.guest_confirmed'/);
  assert.match(read('src/services/email.service.js'), /sendGuestRegistrationConfirmationEmail/);
});

test('the guest form renders, including its error states', () => {
  const view = read('src/views/pages/guest-register.ejs');
  const file = path.join(ROOT, 'src/views/pages/guest-register.ejs');
  assert.doesNotThrow(() => ejs.compile(view, { filename: file }));
  assert.match(view, /name="_csrf"/);
  assert.doesNotMatch(view, /<%-\s*form/);
});
