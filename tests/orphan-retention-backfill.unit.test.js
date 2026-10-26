'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const {
  hasAvailableReferences: hasAvailableSubmissionReferences
} = require('../src/scripts/backfill-submission-certificate-shadow');
const {
  hasAvailableReferences: hasAvailableRegistrationReferences
} = require('../src/scripts/backfill-registration-payment-shadow');
const { unavailableEventReason } = require('../src/services/ocr/ocr-backfill.service');

const ids = {
  event: new mongoose.Types.ObjectId(),
  registration: new mongoose.Types.ObjectId(),
  user: new mongoose.Types.ObjectId()
};

test('submission shadow backfill excludes unavailable references while retaining legitimate guests', () => {
  const available = {
    events: new Set([String(ids.event)]),
    registrations: new Set([String(ids.registration)]),
    users: new Set([String(ids.user)])
  };

  assert.equal(hasAvailableSubmissionReferences({ eventId: ids.event, registrationId: ids.registration, runnerId: ids.user }, available), true);
  assert.equal(hasAvailableSubmissionReferences({ eventId: ids.event, registrationId: ids.registration, runnerId: null }, available), true);
  assert.equal(hasAvailableSubmissionReferences({ eventId: new mongoose.Types.ObjectId(), registrationId: ids.registration, runnerId: ids.user }, available), false);
  assert.equal(hasAvailableSubmissionReferences({ eventId: ids.event, registrationId: new mongoose.Types.ObjectId(), runnerId: ids.user }, available), false);
  assert.equal(hasAvailableSubmissionReferences({ eventId: ids.event, registrationId: ids.registration, runnerId: new mongoose.Types.ObjectId() }, available), false);
});

test('registration shadow backfill excludes unavailable references while retaining legitimate guests', () => {
  const available = {
    events: new Set([String(ids.event)]),
    users: new Set([String(ids.user)])
  };

  assert.equal(hasAvailableRegistrationReferences({ eventId: ids.event, userId: ids.user }, available), true);
  assert.equal(hasAvailableRegistrationReferences({ eventId: ids.event, userId: null }, available), true);
  assert.equal(hasAvailableRegistrationReferences({ eventId: new mongoose.Types.ObjectId(), userId: ids.user }, available), false);
  assert.equal(hasAvailableRegistrationReferences({ eventId: ids.event, userId: new mongoose.Types.ObjectId() }, available), false);
});

test('OCR backfill requires an existing non-deleted event', () => {
  const available = new Set([String(ids.event)]);
  assert.equal(unavailableEventReason({ eventId: ids.event }, available), '');
  assert.equal(unavailableEventReason({ eventId: new mongoose.Types.ObjectId() }, available), 'event_unavailable');
  assert.equal(unavailableEventReason({ eventId: null }, available), 'event_unavailable');
});
