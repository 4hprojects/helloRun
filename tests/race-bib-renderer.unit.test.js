'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { buildRaceBibSvg, renderRaceBibPng, renderRaceBibPdf, contrastRatio, readableTextColor } = require('../src/services/race-bib-renderer.service');

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
