'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateBibEligibility } = require('../src/services/race-bib-eligibility.service');
const { normalizedRanges, normalizeDesignInput, copiedDesignPayload } = require('../src/services/race-bib-design.service');

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

test('draft input normalizes template fields, typography, and optional social framing', () => {
  const draft = { layoutKey: 'festival_header_v1', crop: {}, content: {}, display: {}, style: {}, social: {}, print: {}, artwork: {} };
  const normalized = normalizeDesignInput(draft, {
    layoutKey: 'classic_race_v1',
    location: 'La Trinidad',
    tagline: 'Stride together',
    entryBadge: 'FREE ENTRY',
    footerNote: 'Community Run',
    typographyPreset: 'friendly',
    overlayStrength: 4,
    socialEnabled: 'on',
    socialCtaText: 'Join us',
    socialCtaUrl: 'hellorun.online'
  });
  assert.equal(normalized.layoutKey, 'classic_race_v1');
  assert.equal(normalized.content.location, 'La Trinidad');
  assert.equal(normalized.style.typographyPreset, 'friendly');
  assert.equal(normalized.style.overlayStrength, 0.9);
  assert.deepEqual(normalized.social, { enabled: true, ctaText: 'Join us', ctaUrl: 'hellorun.online' });
});

test('template copy preserves presentation but resolves destination identity and excludes assets and social CTA', () => {
  const copied = copiedDesignPayload({
    layoutKey: 'festival_header_v1',
    crop: { focalX: 20, focalY: 80, zoom: 1.4 },
    display: { showRunnerName: true },
    style: { typographyPreset: 'friendly' },
    print: { pageWidthMm: 254, pageHeightMm: 152.4 },
    artwork: { source: 'custom', key: 'source-art' },
    branding: { partnerLogos: [{ key: 'source-logo' }] },
    social: { enabled: true, ctaText: 'Source CTA', ctaUrl: 'source.invalid' }
  }, {
    title: 'Destination Run', venueName: 'Baguio', feeMode: 'free',
    bannerImageUrl: 'https://cdn.invalid/banner.png', logoUrl: 'https://cdn.invalid/logo.png'
  });
  assert.equal(copied.layoutKey, 'festival_header_v1');
  assert.equal(copied.content.eventTitle, 'Destination Run');
  assert.equal(copied.artwork.source, 'banner');
  assert.deepEqual(copied.branding.partnerLogos, []);
  assert.deepEqual(copied.social, { enabled: false, ctaText: '', ctaUrl: '' });
  assert.equal(JSON.stringify(copied).includes('source-art'), false);
  assert.equal(JSON.stringify(copied).includes('source-logo'), false);
  assert.equal(JSON.stringify(copied).includes('Source CTA'), false);
});
