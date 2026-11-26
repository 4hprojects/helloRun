'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateBibEligibility } = require('../src/services/race-bib-eligibility.service');
const { normalizedRanges, normalizeDesignInput } = require('../src/services/race-bib-design.service');

const releasedEvent = {
  feeMode: 'free',
  eventType: 'virtual',
  bibSettings: { releaseStatus: 'released', releasedDesignVersionId: 'design-1' }
};
const registration = { status: 'confirmed', paymentStatus: 'not_required', participationMode: 'virtual' };

test('bib eligibility follows registration and payment state only', () => {
  assert.equal(evaluateBibEligibility(releasedEvent, registration).eligible, true);
  assert.equal(evaluateBibEligibility({ ...releasedEvent, feeMode: 'paid' }, registration).reason, 'payment_pending');
  assert.equal(evaluateBibEligibility({ ...releasedEvent, feeMode: 'paid' }, { ...registration, paymentStatus: 'paid' }).eligible, true);
  assert.equal(evaluateBibEligibility(releasedEvent, { ...registration, status: 'cancelled' }).reason, 'inactive_registration');
  assert.equal(evaluateBibEligibility(releasedEvent, { ...registration, paymentStatus: 'refunded' }).reason, 'inactive_registration');
  assert.equal(evaluateBibEligibility(releasedEvent, { ...registration, finisherBundle: false, completionStatus: 'pending' }).eligible, true);
});

test('onsite bibs require an official assignment', () => {
  const onsite = { ...registration, participationMode: 'onsite' };
  assert.equal(evaluateBibEligibility(releasedEvent, onsite, { requireAssignment: true }).reason, 'number_awaiting_assignment');
  assert.equal(evaluateBibEligibility(releasedEvent, onsite, { requireAssignment: true, bibNumber: '42' }).eligible, true);
});

test('hybrid ranges must be complete and non-overlapping', () => {
  assert.deepEqual(normalizedRanges({ eventType: 'virtual', bibSettings: {} }), {
    virtualStart: 1, virtualEnd: 999999, onsiteStart: null, onsiteEnd: null
  });
  assert.throws(() => normalizedRanges({ eventType: 'hybrid', bibSettings: { virtualRange: { start: 1, end: 100 }, onsiteRange: { start: 100, end: 200 } } }), /overlap/);
  assert.deepEqual(normalizedRanges({ eventType: 'hybrid', bibSettings: { virtualRange: { start: 1, end: 99 }, onsiteRange: { start: 100, end: 200 } } }), {
    virtualStart: 1, virtualEnd: 99, onsiteStart: 100, onsiteEnd: 200
  });
});

test('draft input clamps crop, colors, and print settings', () => {
  const draft = { crop: {}, content: {}, display: {}, style: {}, print: {}, artwork: {} };
  const normalized = normalizeDesignInput(draft, { focalX: -5, focalY: 120, zoom: 9, accentColor: 'red', pageWidthMm: 999 });
  assert.deepEqual(normalized.crop, { focalX: 0, focalY: 100, zoom: 3 });
  assert.equal(normalized.style.accentColor, '#F97316');
  assert.equal(normalized.print.pageWidthMm, 500);
});
