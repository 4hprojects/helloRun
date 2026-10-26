'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateAgeFromDateOnly,
  getDateOfBirthValidationError
} = require('../src/utils/platform-date');

test('Manila today is accepted just after midnight while UTC is on the prior date', () => {
  const now = new Date('2026-10-19T16:30:00.000Z'); // October 20, 00:30 in Manila
  assert.equal(getDateOfBirthValidationError('2026-10-20', { now }), '');
  assert.equal(
    getDateOfBirthValidationError('2026-10-21', { now }),
    'Date of birth cannot be in the future.'
  );
});

test('date-only validation rejects impossible calendar dates instead of normalizing them', () => {
  assert.equal(getDateOfBirthValidationError('2026-02-29'), 'Enter a valid date of birth.');
  assert.equal(getDateOfBirthValidationError('not-a-date'), 'Enter a valid date of birth.');
});

test('age uses UTC birth-date components and the Manila calendar boundary', () => {
  const beforeBirthday = new Date('2026-10-19T15:59:59.000Z');
  const onBirthday = new Date('2026-10-19T16:00:00.000Z');
  const birthDate = new Date('2000-10-20T00:00:00.000Z');
  assert.equal(calculateAgeFromDateOnly(birthDate, { now: beforeBirthday }), 25);
  assert.equal(calculateAgeFromDateOnly(birthDate, { now: onBirthday }), 26);
});
