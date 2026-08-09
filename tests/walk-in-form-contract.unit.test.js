'use strict';

// The seam between the walk-in form and the service that consumes it.
//
// This is the test that was missing. Walk-in registration shipped, passed its unit tests
// and passed a live probe, while being completely broken through its own interface: the
// form posted neither `participationMode` nor `raceDistance`, both `required` on
// Registration, so validateGuestForm raised nothing and save() threw a 500 every time.
//
// The existing tests all called createWalkInRegistration directly with the fields already
// supplied. A test that constructs its own input cannot find a defect in whatever
// constructs that input in production — so this one builds the body the *form* serialises
// and asserts a Registration made from it is actually valid.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const ejs = require('ejs');

const { validateGuestForm } = require('../src/services/guest-registration.service');
const Registration = require('../src/models/Registration');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const VIEW = 'src/views/organizer/event-check-in.ejs';

function renderCheckIn(event) {
  const render = ejs.compile(read(VIEW), { filename: path.join(ROOT, VIEW), views: [path.join(ROOT, 'src/views')] });
  return render({
    title: 't', eventId: 'e1', locals: {}, user: {}, event,
    participants: [], totals: {}, listCounts: {}, search: '', isTruncated: false,
    recentCheckIns: [], summary: {}, completion: null
  });
}

/**
 * What the browser would POST: every named field in the walk-in form, with a plausible
 * value. This mirrors `new FormData(form)` in organizer-walk-in.js — unchecked boxes are
 * omitted, which is why `paymentCollected` is absent.
 */
function bodyFromForm(html) {
  const form = html.slice(html.indexOf('data-walkin-form'), html.indexOf('</form>', html.indexOf('data-walkin-form')));
  const body = {};

  for (const [, name, value] of form.matchAll(/<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"/g)) {
    body[name] = value;
  }
  for (const [, name] of form.matchAll(/<input(?![^>]*type="(?:hidden|checkbox)")[^>]*name="([^"]+)"/g)) {
    body[name] = name.toLowerCase().includes('email') ? 'walkin@example.com' : 'x';
  }
  // A checked box is submitted as 'on'; an unchecked one is absent entirely. Match the
  // whole tag — `checked` can sit either side of `name`.
  for (const [tag] of form.matchAll(/<input[^>]*type="checkbox"[^>]*>/g)) {
    const name = (tag.match(/name="([^"]+)"/) || [])[1];
    if (name && /\schecked\b/.test(tag)) body[name] = 'on';
  }
  // Each select contributes its first enabled non-empty option, as a browser would when
  // the user picks something.
  for (const [block] of form.matchAll(/<select[\s\S]*?<\/select>/g)) {
    const name = (block.match(/name="([^"]+)"/) || [])[1];
    if (!name) continue;
    const option = [...block.matchAll(/<option value="([^"]*)"((?:(?!>)[\s\S])*)>/g)]
      .filter(([, value, attrs]) => value && !/\sdisabled\b/.test(attrs))
      .map(([, value]) => value)[0];
    if (option !== undefined) body[name] = option;
  }
  return body;
}

const ONSITE_EVENT = {
  _id: 'e1', title: 'T', eventType: 'onsite', eventTypesAllowed: ['onsite'],
  raceDistances: ['5K', '10K'], kitInventory: [], customQuestions: []
};

test('the walk-in form posts everything a Registration requires', () => {
  const body = bodyFromForm(renderCheckIn(ONSITE_EVENT));

  // The two fields whose absence made every walk-in 500.
  assert.ok(body.participationMode, 'the form must post participationMode');
  assert.ok(body.raceDistance, 'the form must post raceDistance');
  assert.equal(body.participationMode, 'onsite');
  assert.equal(body.raceDistance, '5K', 'the category select must have real options');

  const { form, errors } = validateGuestForm(body, ONSITE_EVENT);
  assert.deepEqual(errors, {}, `the form's own body must pass validation: ${JSON.stringify(errors)}`);

  // And the model must accept what the validator produced — the step that used to throw.
  const registration = new Registration({
    eventId: new mongoose.Types.ObjectId(),
    participantType: 'guest',
    participant: { firstName: form.firstName, lastName: form.lastName, email: form.email },
    participationMode: form.participationMode,
    raceDistance: form.raceDistance,
    confirmationCode: 'HR-ABC123',
    waiver: { accepted: true, version: 1, signature: form.waiverSignature, templateSnapshot: 't', renderedSnapshot: 'r' }
  });
  const invalid = registration.validateSync();
  assert.equal(invalid, undefined, `Registration must validate: ${invalid && Object.keys(invalid.errors).join(', ')}`);
});

test('a category with no options can no longer be posted', () => {
  // The check-in page projection omitted raceDistances, so the select rendered empty and
  // the walk-in posted no category — the second cause of the same 500.
  assert.match(read('src/routes/organiser/onsite-pages.js'), /raceDistances kitInventory kitSizeRequired customQuestions/);
  const empty = bodyFromForm(renderCheckIn({ ...ONSITE_EVENT, raceDistances: [] }));
  assert.equal(empty.raceDistance, undefined);
  assert.ok(validateGuestForm(empty, ONSITE_EVENT).errors.raceDistance, 'an empty category must now be an error, not a 500');
});

test('the validator enforces what the model requires, for every caller', () => {
  // The real fix. Its contract is that everything Registration requires comes from the
  // form, because a guest has no profile to fall back on.
  const base = { firstName: 'A', lastName: 'B', email: 'a@b.com', mobile: '0917', waiverAccepted: true, waiverSignature: 'A B' };
  const missing = validateGuestForm(base, ONSITE_EVENT);
  assert.ok(missing.errors.participationMode);
  assert.ok(missing.errors.raceDistance);

  // A mode outside the enum is refused rather than passed through to a save() failure.
  assert.ok(validateGuestForm({ ...base, participationMode: 'hybrid', raceDistance: '5K' }, ONSITE_EVENT).errors.participationMode);
});

test('a walk-in captures the kit size and the organiser questions', () => {
  // The route projection dropped kitInventory and customQuestions, so isTrackingSizes()
  // was false and getQuestions() empty — a walk-in at a shirt-stocked event silently
  // recorded neither. Both routes must select them.
  const operations = read('src/routes/organiser/onsite-operations.js');
  const projections = operations.match(/kitInventory kitSizeRequired customQuestions/g) || [];
  assert.equal(projections.length, 2, 'the walk-in and the import commit both need them');

  const event = {
    ...ONSITE_EVENT,
    kitInventory: [{ size: 'M', stock: 5, released: 0 }],
    kitSizeRequired: true,
    customQuestions: [{ questionId: 'meal', label: 'Meal', type: 'dropdown', required: true, options: ['Chicken'] }]
  };
  const body = bodyFromForm(renderCheckIn(event));
  assert.equal(body.kitSize, 'M');
  assert.equal(body.custom_meal, 'Chicken');

  const { form, errors } = validateGuestForm(body, event);
  assert.deepEqual(errors, {});
  assert.equal(form.kitSize, 'M');
  assert.equal(form.customAnswers.find((answer) => answer.questionId === 'meal').value, 'Chicken');
});

test('an onsite walk-in cannot be registered without an emergency contact', () => {
  // The fields existed but were not marked required, and the rule was never reached
  // because the mode never arrived.
  const html = renderCheckIn(ONSITE_EVENT);
  assert.match(html, /name="emergencyContactName" required/);
  assert.match(html, /name="emergencyContactNumber" required/);

  const body = bodyFromForm(html);
  const { errors } = validateGuestForm({ ...body, emergencyContactName: '', emergencyContactNumber: '' }, ONSITE_EVENT);
  assert.ok(errors.emergencyContactName);
});
