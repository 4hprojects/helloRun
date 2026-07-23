'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const {
  buildCertificatePdfBuffer,
  normalizeCertificateInput,
  normalizeCertificateBodyText,
  buildVisibleStats,
  buildCertificatePageOptions,
  resolveCertificateLogo
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
    orientation: 'portrait',
    customPageWidthMm: 297,
    customPageHeightMm: 210
  });
  assert.equal(template.saved, true);
});

test('custom paper size stores bounded millimetre dimensions and renders exact points', async () => {
  const template = {
    layoutKey: 'verified_achievement', name: 'Custom certificate', content: {}, displayOptions: {}, styleOptions: {},
    async save() { this.saved = true; }
  };
  await updateTemplate(template, {
    pageSize: 'CUSTOM', customPageWidthMm: '320.5', customPageHeightMm: '180.2', orientation: 'landscape'
  });
  assert.equal(template.styleOptions.pageSize, 'CUSTOM');
  assert.equal(template.styleOptions.customPageWidthMm, 320.5);
  assert.equal(template.styleOptions.customPageHeightMm, 180.2);
  const page = buildCertificatePageOptions(template.styleOptions);
  assert.equal(page.layout, 'portrait');
  assert.deepEqual(page.size, [Number((320.5 * 72 / 25.4).toFixed(4)), Number((180.2 * 72 / 25.4).toFixed(4))]);

  const normalized = await normalizeCertificateInput({ styleOptions: { pageSize: 'CUSTOM', customPageWidthMm: 99, customPageHeightMm: 1001 } });
  assert.equal(normalized.styleOptions.customPageWidthMm, 297);
  assert.equal(normalized.styleOptions.customPageHeightMm, 210);
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

test('WebP certificate assets are normalized to PDFKit-compatible PNG and corrupt images are omitted', async () => {
  const webp = await sharp({
    create: { width: 24, height: 24, channels: 4, background: '#FA9A4B' }
  }).webp().toBuffer();
  const normalized = await normalizeCertificateInput({
    assets: {
      eventLogoUrl: `data:image/webp;base64,${webp.toString('base64')}`,
      eventArtworkUrl: 'data:image/webp;base64,dGhpcyBpcyBub3QgYW4gaW1hZ2U='
    }
  });

  assert.ok(Buffer.isBuffer(normalized.assetImages.eventLogo));
  assert.equal((await sharp(normalized.assetImages.eventLogo).metadata()).format, 'png');
  assert.equal(normalized.assetImages.eventArtwork, null);

  const pdf = await buildCertificatePdfBuffer({
    runnerName: 'WebP Runner',
    eventTitle: 'WebP Challenge',
    distance: '10 km',
    assets: { eventLogoUrl: `data:image/webp;base64,${webp.toString('base64')}` }
  });
  assert.equal(pdf.subarray(0, 4).toString('utf8'), '%PDF');
  assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 1);
});

test('the repeated event-card logo respects its display toggle and branding fallbacks', async () => {
  const enabled = await normalizeCertificateInput({
    assets: { eventLogoUrl: ONE_PIXEL_PNG, organizerLogoUrl: ONE_PIXEL_PNG },
    displayOptions: { showEventLogo: true, showOrganizerLogo: true }
  });
  assert.equal(resolveCertificateLogo(enabled, { eventDisplayRequired: true }), enabled.assetImages.eventLogo);

  const disabled = await normalizeCertificateInput({
    assets: { eventLogoUrl: ONE_PIXEL_PNG, organizerLogoUrl: ONE_PIXEL_PNG },
    displayOptions: { showEventLogo: false, showOrganizerLogo: true }
  });
  assert.equal(resolveCertificateLogo(disabled, { eventDisplayRequired: true }), null);

  const organizerFallback = await normalizeCertificateInput({
    assets: { organizerLogoUrl: ONE_PIXEL_PNG },
    displayOptions: { showEventLogo: true, showOrganizerLogo: true }
  });
  assert.equal(resolveCertificateLogo(organizerFallback, { eventDisplayRequired: true }), organizerFallback.assetImages.organizerLogo);
});

test('both layouts render optional branding and verification combinations on one page', async () => {
  const displayCases = [
    { showEventLogo: true, showOrganizerLogo: true, showSponsorLogos: true, showQrCode: true, showCertificateNumber: true },
    { showEventLogo: false, showOrganizerLogo: false, showSponsorLogos: false, showQrCode: false, showCertificateNumber: false }
  ];
  for (const layoutKey of ['verified_achievement', 'split_panel_event']) {
    for (const displayOptions of displayCases) {
      const pdf = await buildCertificatePdfBuffer({
        runnerName: 'Optional Branding Runner',
        eventTitle: 'Premium Event Certificate',
        organizerName: 'HelloRun Editorial Team',
        distance: '21.0975 km',
        finishTime: '02:14:36',
        rank: '12th overall',
        eventDate: 'Aug 31, 2026',
        certificateNumber: 'HR-CERT-OPTIONAL-0001',
        verificationUrl: 'https://hellorun.test/certificates/verify/HR-CERT-OPTIONAL-0001',
        layoutKey,
        template: { layoutKey },
        displayOptions: { ...displayOptions, showDistance: true, showFinishTime: true, showRank: true, showEventDate: true },
        assets: {
          eventLogoUrl: ONE_PIXEL_PNG,
          organizerLogoUrl: ONE_PIXEL_PNG,
          signatureImageUrl: ONE_PIXEL_PNG,
          sponsorLogoUrls: Array.from({ length: 6 }, () => ONE_PIXEL_PNG)
        },
        content: { signatureName: 'Event Director', signatureRole: 'Organiser' }
      });
      assert.equal(pdf.subarray(0, 4).toString('utf8'), '%PDF');
      assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 1);
    }
  }
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

test('custom paper dimensions generate a single-page PDF without applying preset orientation', async () => {
  const buffer = await buildCertificatePdfBuffer({
    runnerName: 'Custom Size Runner', eventTitle: 'Bayani Run 2026', distance: '21K',
    certificateNumber: 'HR-CERT-CUSTOM-0001', verificationUrl: 'https://hellorun.test/certificates/verify/HR-CERT-CUSTOM-0001',
    template: { layoutKey: 'verified_achievement' },
    styleOptions: { pageSize: 'CUSTOM', customPageWidthMm: 320.5, customPageHeightMm: 180.2, orientation: 'portrait' }
  });
  assert.equal(buffer.subarray(0, 4).toString('utf8'), '%PDF');
  assert.equal((buffer.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 1);
});

test('both layouts remain single-page across wide, square, narrow, minimum, and maximum custom sheets', async () => {
  const sheets = [
    [320, 180],
    [210, 210],
    [180, 320],
    [100, 100],
    [1000, 100],
    [100, 1000]
  ];
  for (const layoutKey of ['verified_achievement', 'split_panel_event']) {
    for (const [customPageWidthMm, customPageHeightMm] of sheets) {
      const pdf = await buildCertificatePdfBuffer({
        runnerName: 'A Very Long Custom Certificate Runner Name That Must Stay On One Page',
        eventTitle: 'International Accumulated Endurance Challenge With A Long Event Name',
        organizerName: 'HelloRun Community Events and Endurance Association',
        goalDistance: '2,026 kilometres',
        verifiedDistance: '2,041.8 kilometres',
        approvedActivityCount: 84,
        isAccumulatedChallenge: true,
        eventDate: 'December 31, 2026',
        certificateNumber: 'HR-CERT-2026-VERY-LONG-CERTIFICATE-NUMBER-000012',
        verificationUrl: 'https://hellorun.test/certificates/verify/HR-CERT-2026-000012',
        layoutKey,
        template: { layoutKey },
        styleOptions: { pageSize: 'CUSTOM', customPageWidthMm, customPageHeightMm }
      });
      assert.equal(pdf.subarray(0, 4).toString('utf8'), '%PDF');
      assert.equal(
        (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length,
        1,
        `${layoutKey} ${customPageWidthMm}x${customPageHeightMm}`
      );
    }
  }
});

test('organizer setup exposes canonical layout cards, print controls, and current asset previews', () => {
  const view = fs.readFileSync(path.resolve(__dirname, '../src/views/organizer/certificate-setup.ejs'), 'utf8');
  assert.match(view, /presentation\.layouts\.forEach/);
  assert.match(view, /name="layoutKey" value="<%= layout\.value %>"/);
  assert.doesNotMatch(view, /\['classic', 'Classic'\]/);
  for (const control of ['primaryColor', 'accentColor', 'secondaryAccentColor']) assert.match(view, new RegExp(`'${control}'`));
  for (const control of ['pageSize', 'orientation', 'customPageWidthMm', 'customPageHeightMm']) assert.match(view, new RegExp(`name="${control}"`));
  assert.match(view, /value="CUSTOM"/);
  assert.match(view, /certificate-asset-preview/);
  assert.match(view, /presentation\.sponsorUrls\.forEach/);
});
