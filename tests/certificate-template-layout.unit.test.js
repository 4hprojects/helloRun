'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildCertificatePdfBuffer,
  normalizeCertificateInput,
  normalizeCertificateBodyText,
  buildVisibleStats
} = require('../src/services/certificate.service');
const {
  buildDefaultTemplatePayload,
  resolveRenderLayoutKey,
  updateTemplate
} = require('../src/services/certificateTemplate.service');

const LEGACY_LAYOUTS = ['modern_race', 'classic', 'minimal', 'school_event', 'charity_run'];
const ONE_PIXEL_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X10AAAAASUVORK5CYII=';

test('legacy main layouts resolve to Verified Achievement while Split Panel remains distinct', () => {
  for (const layoutKey of LEGACY_LAYOUTS) {
    assert.equal(resolveRenderLayoutKey(layoutKey), 'verified_achievement');
  }
  assert.equal(resolveRenderLayoutKey('verified_achievement'), 'verified_achievement');
  assert.equal(resolveRenderLayoutKey('split_panel_event'), 'split_panel_event');
  assert.equal(resolveRenderLayoutKey('unknown'), 'verified_achievement');
});

test('new certificate templates use the canonical layout and achievement copy', () => {
  const payload = buildDefaultTemplatePayload({
    event: {
      _id: 'event-1',
      organizerId: 'organizer-1',
      title: 'Sunrise 10K',
      organiserName: 'Hello Striders',
      eventStartAt: new Date('2026-08-07T00:00:00.000Z'),
      raceDistances: ['10K']
    }
  });

  assert.equal(payload.layoutKey, 'verified_achievement');
  assert.equal(payload.content.bodyText, 'Officially completed {{distance}} at {{eventTitle}}.');
  assert.match(payload.content.footerText, /Scan the QR code/i);
});

test('template updates persist canonical print and color controls', async () => {
  const template = {
    layoutKey: 'classic',
    name: 'Legacy template',
    content: {},
    displayOptions: {},
    styleOptions: {},
    async save() { this.saved = true; }
  };

  await updateTemplate(template, {
    layoutKey: 'verified_achievement',
    primaryColor: '#123456',
    accentColor: '#ABCDEF',
    secondaryAccentColor: '#654321',
    pageSize: 'letter',
    orientation: 'portrait'
  });

  assert.equal(template.layoutKey, 'verified_achievement');
  assert.deepEqual(template.styleOptions, {
    primaryColor: '#123456',
    accentColor: '#ABCDEF',
    secondaryAccentColor: '#654321',
    fontFamily: 'Helvetica',
    pageSize: 'LETTER',
    orientation: 'portrait'
  });
  assert.equal(template.saved, true);
});

test('legacy default body text modernizes while custom organizer copy remains unchanged', () => {
  assert.equal(
    normalizeCertificateBodyText('This certifies that {{runnerName}} successfully completed {{distance}} in {{eventTitle}}.'),
    'Officially completed {{distance}} at {{eventTitle}}.'
  );
  assert.equal(
    normalizeCertificateBodyText('Presented with pride to {{runnerName}} for conquering {{eventTitle}}.'),
    'Presented with pride to {{runnerName}} for conquering {{eventTitle}}.'
  );
});

test('normalization carries colors and all supported assets into the render model', async () => {
  const normalized = await normalizeCertificateInput({
    runnerName: 'Maria Runner',
    eventTitle: 'Sunrise 10K',
    layoutKey: 'classic',
    assets: {
      eventLogoUrl: ONE_PIXEL_PNG,
      organizerLogoUrl: ONE_PIXEL_PNG,
      eventArtworkUrl: ONE_PIXEL_PNG,
      backgroundImageUrl: ONE_PIXEL_PNG,
      signatureImageUrl: ONE_PIXEL_PNG,
      sponsorLogoUrls: Array.from({ length: 8 }, () => ONE_PIXEL_PNG)
    },
    styleOptions: {
      primaryColor: '#123456',
      accentColor: '#ABCDEF',
      secondaryAccentColor: '#654321'
    }
  });

  assert.equal(normalized.layoutKey, 'verified_achievement');
  assert.equal(normalized.styleOptions.primaryColor, '#123456');
  assert.ok(Buffer.isBuffer(normalized.assetImages.eventLogo));
  assert.ok(Buffer.isBuffer(normalized.assetImages.organizerLogo));
  assert.ok(Buffer.isBuffer(normalized.assetImages.eventArtwork));
  assert.ok(Buffer.isBuffer(normalized.assetImages.background));
  assert.ok(Buffer.isBuffer(normalized.assetImages.signature));
  assert.equal(normalized.assetImages.sponsorLogos.length, 6);
});

test('unavailable performance values are omitted from printable metric cards', async () => {
  const normalized = await normalizeCertificateInput({
    runnerName: 'Maria Runner',
    eventTitle: 'Sunrise 10K',
    distance: 'N/A',
    finishTime: '00:00:00',
    eventDate: '',
    rank: ''
  });
  assert.deepEqual(buildVisibleStats(normalized), []);

  const trulyMissing = await normalizeCertificateInput({ runnerName: 'Maria Runner', eventTitle: 'Sunrise 10K' });
  assert.deepEqual(buildVisibleStats(trulyMissing), []);
});

test('both canonical layouts generate single-page A4 and Letter PDFs in either orientation', async () => {
  const cases = [];
  for (const layoutKey of ['verified_achievement', 'split_panel_event']) {
    for (const pageSize of ['A4', 'LETTER']) {
      for (const orientation of ['landscape', 'portrait']) cases.push({ layoutKey, pageSize, orientation });
    }
  }

  for (const options of cases) {
    const buffer = await buildCertificatePdfBuffer({
      runnerName: 'Maria Alessandra Rosario de la Cruz-Santos With A Very Long Runner Name',
      eventTitle: 'The 2026 International Mountain Ridge Endurance Running Festival and Community Challenge',
      organizerName: 'HelloRun Community Endurance Events Association',
      distance: '42.195 km',
      finishTime: '05:28:42',
      eventDate: 'Aug 07, 2026',
      certificateNumber: 'HR-CERT-2026-EXTREMELY-LONG-PUBLIC-CERTIFICATE-NUMBER-000001',
      verificationUrl: 'https://hellorun.test/certificates/verify/HR-CERT-2026-LONG-000001',
      layoutKey: options.layoutKey,
      template: { layoutKey: options.layoutKey },
      content: {
        bodyText: 'Officially completed {{distance}} at {{eventTitle}}.',
        signatureName: 'Jordan Alexander Santos',
        signatureRole: 'Event Director'
      },
      styleOptions: options
    });

    assert.equal(buffer.subarray(0, 4).toString('utf8'), '%PDF');
    assert.ok(buffer.length > 1000);
    const source = buffer.toString('latin1');
    assert.equal((source.match(/\/Type\s*\/Page\b/g) || []).length, 1, JSON.stringify(options));
  }
});

test('organizer setup exposes canonical layouts, print controls, and current asset previews', () => {
  const view = fs.readFileSync(path.resolve(__dirname, '../src/views/organizer/certificate-setup.ejs'), 'utf8');
  assert.match(view, /verified_achievement.*Verified Achievement/);
  assert.match(view, /split_panel_event.*Split Panel Event/);
  assert.doesNotMatch(view, /\['classic', 'Classic'\]/);
  for (const control of ['primaryColor', 'accentColor', 'secondaryAccentColor', 'pageSize', 'orientation']) {
    assert.match(view, new RegExp(`name="${control}"`));
  }
  assert.match(view, /certificate-asset-preview/);
  assert.match(view, /sponsorLogoUrls\.slice\(0, 6\)/);
});
