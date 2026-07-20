'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const runnerController = require('../src/controllers/runner.controller');
const registrationController = require('../src/controllers/page/registration.controller');
const {
  normalizeAdminRunningGroups,
  getAdminUserEditFormData,
  validateAdminUserEditForm
} = require('../src/controllers/admin/_shared');

const memberships = Array.from({ length: 12 }, (_, index) => `Community Group ${index + 1}`);

test('runner profile normalization accepts more than ten ordered memberships', () => {
  const normalized = runnerController.__testNormalizeRunnerGroupValues([
    ...memberships,
    ' community   group 1 ',
    'COMMUNITY GROUP 2'
  ]);
  assert.deepEqual(normalized, memberships);

  const errors = runnerController.__testValidateRunnerProfileForm({
    firstName: 'Jamie', lastName: 'Runner', displayName: '', mobile: '', country: '',
    dateOfBirth: '', gender: '', emergencyContactName: '', emergencyContactNumber: '',
    runningGroups: normalized
  });
  assert.equal(errors.runningGroups, undefined);
});

test('registration quick-profile normalization preserves unlimited memberships', () => {
  const normalized = registrationController.__testNormalizeRunnerGroups(memberships.join(', '));
  assert.deepEqual(normalized, memberships);
  const errors = registrationController.__testValidateQuickProfileUpdatePayload({
    mobile: '09170000000', country: 'PH', dateOfBirth: '', gender: '',
    emergencyContactName: '', emergencyContactNumber: '', requiresEmergencyContact: false,
    runningGroups: normalized, hasCountryInput: true, hasEmergencyContactInput: false,
    hasRunningGroupsInput: true
  });
  assert.equal(errors.runningGroups, undefined);
});

test('admin normalization preserves memberships beyond ten and the first legacy primary', () => {
  const normalized = normalizeAdminRunningGroups([...memberships, memberships[0].toUpperCase()]);
  assert.deepEqual(normalized, memberships);
  const formData = getAdminUserEditFormData({
    firstName: 'Admin', lastName: 'Runner', country: 'PH', role: 'runner',
    runningGroups: normalized
  });
  const errors = validateAdminUserEditForm(formData);
  assert.equal(errors.runningGroups, undefined);
  assert.equal(formData.runningGroup, memberships[0]);
});

test('all compatibility validators retain the per-name 120-character limit', () => {
  const invalidGroups = ['x'.repeat(121)];
  const runnerErrors = runnerController.__testValidateRunnerProfileForm({
    firstName: 'Jamie', lastName: 'Runner', displayName: '', mobile: '', country: '',
    dateOfBirth: '', gender: '', emergencyContactName: '', emergencyContactNumber: '',
    runningGroups: invalidGroups
  });
  assert.match(runnerErrors.runningGroups, /120 characters/);

  const registrationErrors = registrationController.__testValidateQuickProfileUpdatePayload({
    mobile: '09170000000', country: 'PH', dateOfBirth: '', gender: '',
    emergencyContactName: '', emergencyContactNumber: '', requiresEmergencyContact: false,
    runningGroups: invalidGroups, hasCountryInput: true, hasEmergencyContactInput: false,
    hasRunningGroupsInput: true
  });
  assert.match(registrationErrors.runningGroups, /120 characters/);
});
