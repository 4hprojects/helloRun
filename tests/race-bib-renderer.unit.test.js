'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sharp = require('sharp');
const {
  buildRaceBibSvg,
  renderRaceBibPng,
  renderRaceBibSocialPng,
  renderRaceBibPdf,
  analyzeRaceBibDesign,
  fitTextBlock,
  contrastRatio,
  readableTextColor
} = require('../src/services/race-bib-renderer.service');

const design = {
  crop: { focalX: 50, focalY: 50, zoom: 1 },
  content: { eventTitle: 'A Very Long HelloRun Challenge Title That Must Stay Inside Its Fixed Bounds', participationLabel: '2,027 KM VIRTUAL RUN' },
  display: { showCategory: true, showRunnerName: true, showEventDate: true },
  style: { accentColor: '#F97316', backgroundColor: '#0F172A', numberPanelColor: '#FFFFFF', numberTextColor: '#111111' },
  print: { pageWidthMm: 254, pageHeightMm: 152.4 },
  artwork: { source: 'solid' }
};
const data = { bibNumber: '999999', runnerName: 'Alexandria-Marguerite Villanueva-Santos', category: 'Open', eventDate: '2027' };

test('shared SVG renders a fixed 1800x1080 PNG with missing-art fallback', async () => {
  const svg = await buildRaceBibSvg({ design, data });
  assert.match(svg.toString(), /width="1800" height="1080"/);
  assert.match(svg.toString(), /999999/);
  const png = await renderRaceBibPng({ design, data });
  const metadata = await sharp(png).metadata();
  assert.deepEqual({ width: metadata.width, height: metadata.height }, { width: 1800, height: 1080 });
});

test('PDF embeds the same rendered PNG and contains no private identifiers', async () => {
  const png = await renderRaceBibPng({ design, data });
  const pdf = await renderRaceBibPdf({ design, data, pngBuffer: png });
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.equal(pdf.includes(Buffer.from('confirmationCode')), false);
  assert.equal(pdf.includes(Buffer.from('qrToken')), false);
});

test('number panel enforces readable contrast, including grayscale-equivalent colors', () => {
  assert.ok(contrastRatio('#000000', '#FFFFFF') > 20);
  assert.equal(readableTextColor('#777777', '#777777'), '#000000');
});

test('all structured templates render deterministic 1800x1080 output across number lengths', async () => {
  for (const layoutKey of ['photo_split_v1', 'festival_header_v1', 'classic_race_v1']) {
    for (const bibNumber of ['7', '2027', '999999', '123456789012']) {
      const input = { design: { ...design, layoutKey, style: { ...design.style, typographyPreset: 'athletic' } }, data: { ...data, bibNumber } };
      // eslint-disable-next-line no-await-in-loop
      const first = await renderRaceBibPng(input);
      // eslint-disable-next-line no-await-in-loop
      const second = await renderRaceBibPng(input);
      // eslint-disable-next-line no-await-in-loop
      const metadata = await sharp(first).metadata();
      assert.deepEqual({ width: metadata.width, height: metadata.height }, { width: 1800, height: 1080 });
      assert.equal(crypto.createHash('sha256').update(first).digest('hex'), crypto.createHash('sha256').update(second).digest('hex'));
    }
  }
});

test('social output is square and embeds the supplied printable bib without changing print rendering', async () => {
  const socialDesign = { ...design, layoutKey: 'festival_header_v1', social: { enabled: true, ctaText: 'Join the challenge', ctaUrl: 'hellorun.online' } };
  const print = await renderRaceBibPng({ design: socialDesign, data });
  const social = await renderRaceBibSocialPng({ design: socialDesign, data, pngBuffer: print });
  const metadata = await sharp(social).metadata();
  assert.deepEqual({ width: metadata.width, height: metadata.height }, { width: 1800, height: 1800 });
  const rerenderedPrint = await renderRaceBibPng({ design: socialDesign, data });
  assert.deepEqual(print, rerenderedPrint);
});

test('measured fitting and design diagnostics catch difficult content and unsafe requested contrast', () => {
  const fitted = fitTextBlock('A title with several words that must wrap', {
    maxWidth: 260, maxLines: 2, maxSize: 60, minSize: 20, fontKey: 'interExtraBold'
  });
  assert.ok(fitted.lines.length <= 2);
  assert.ok(fitted.size >= 20 && fitted.size <= 60);
  const warnings = analyzeRaceBibDesign({
    ...design,
    layoutKey: 'festival_header_v1',
    style: { ...design.style, numberPanelColor: '#777777', numberTextColor: '#777777' },
    artwork: { source: 'custom' },
    branding: { partnerLogos: [{ key: '1' }, { key: '2' }, { key: '3' }, { key: '4' }] }
  }, data);
  assert.ok(warnings.includes('number_contrast'));
  assert.ok(warnings.includes('artwork_missing'));
  assert.ok(warnings.includes('partner_logo_limit'));
});
