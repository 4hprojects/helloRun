'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { renderRaceBibPng, renderRaceBibPdf } = require('../services/race-bib-renderer.service');

function valueOf(argv, name, fallback = '') {
  const prefix = `--${name}=`;
  const inline = argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] || fallback : fallback;
}

async function main(argv = process.argv.slice(2)) {
  const preset = valueOf(argv, 'preset', '2027k');
  const artwork = valueOf(argv, 'artwork');
  const outputDir = path.resolve(valueOf(argv, 'output-dir', 'tmp/race-bib-previews'));
  if (preset !== '2027k') throw new Error('Only the 2027k preview preset is available.');
  if (!artwork) throw new Error('--artwork is required.');
  const artworkBuffer = await fs.readFile(path.resolve(artwork));
  const design = {
    layoutKey: 'landscape_v1',
    crop: { focalX: 50, focalY: 50, zoom: 1 },
    content: { eventTitle: '2027k HelloRun Challenge', participationLabel: '2,027 KM VIRTUAL RUN', eventDate: '2027' },
    display: { showCategory: true, showRunnerName: false, showEventDate: true, showEventLogo: false },
    style: { accentColor: '#F97316', backgroundColor: '#0F172A', numberPanelColor: '#F8FAFC', numberTextColor: '#0F172A' },
    print: { pageWidthMm: 254, pageHeightMm: 152.4 }
  };
  const data = { eventTitle: design.content.eventTitle, participationLabel: design.content.participationLabel, category: '2027K', bibNumber: '2027', eventDate: '2027' };
  const png = await renderRaceBibPng({ design, data, artworkBuffer });
  const pdf = await renderRaceBibPdf({ design, data, pngBuffer: png });
  await fs.mkdir(outputDir, { recursive: true });
  const pngPath = path.join(outputDir, '2027k-hellorun-challenge.png');
  const pdfPath = path.join(outputDir, '2027k-hellorun-challenge.pdf');
  await Promise.all([fs.writeFile(pngPath, png), fs.writeFile(pdfPath, pdf)]);
  process.stdout.write(`${JSON.stringify({ png: pngPath, pdf: pdfPath }, null, 2)}\n`);
  return { pngPath, pdfPath };
}

if (require.main === module) main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
module.exports = { main, valueOf };
