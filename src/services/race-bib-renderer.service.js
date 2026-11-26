'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');
const uploadService = require('./upload.service');

const WIDTH = 1800;
const HEIGHT = 1080;
const ARTWORK_WIDTH = 1200;

function escapeXml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function normalizeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
}

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((value) => parseInt(value, 16) / 255)
    .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function readableTextColor(requested, background) {
  if (contrastRatio(requested, background) >= 4.5) return requested;
  return contrastRatio('#000000', background) >= contrastRatio('#FFFFFF', background) ? '#000000' : '#FFFFFF';
}

function fitSize(text, maxChars, largest, smallest) {
  const length = Array.from(String(text || '')).length;
  if (length <= maxChars) return largest;
  return Math.max(smallest, Math.floor(largest * maxChars / length));
}

async function readManagedAsset(asset = {}) {
  try {
    if (asset.buffer && Buffer.isBuffer(asset.buffer)) return asset.buffer;
    if (asset.key) return uploadService.getObjectBufferFromR2(asset.key, { maxBytes: 12 * 1024 * 1024 });
    if (asset.localPath) {
      const absolute = path.resolve(asset.localPath);
      const publicRoot = path.resolve(__dirname, '../public');
      const fixtureRoot = path.resolve(process.cwd(), 'docs');
      if (!absolute.startsWith(`${publicRoot}${path.sep}`) && !absolute.startsWith(`${fixtureRoot}${path.sep}`)) return null;
      return fs.readFile(absolute);
    }
    const key = uploadService.extractObjectKeyFromPublicUrl(asset.url || '');
    if (key) return uploadService.getObjectBufferFromR2(key, { maxBytes: 12 * 1024 * 1024 });
  } catch (_error) {
    return null;
  }
  return null;
}

async function cropArtwork(buffer, crop = {}) {
  if (!buffer) return null;
  const focalX = Math.min(100, Math.max(0, Number(crop.focalX ?? 50)));
  const focalY = Math.min(100, Math.max(0, Number(crop.focalY ?? 50)));
  const zoom = Math.min(3, Math.max(1, Number(crop.zoom || 1)));
  const rotated = await sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 }).rotate().png().toBuffer();
  const metadata = await sharp(rotated).metadata();
  const sourceWidth = metadata.width;
  const sourceHeight = metadata.height;
  const targetRatio = ARTWORK_WIDTH / HEIGHT;
  let cropWidth = sourceWidth;
  let cropHeight = sourceWidth / targetRatio;
  if (cropHeight > sourceHeight) {
    cropHeight = sourceHeight;
    cropWidth = sourceHeight * targetRatio;
  }
  cropWidth = Math.max(1, Math.floor(cropWidth / zoom));
  cropHeight = Math.max(1, Math.floor(cropHeight / zoom));
  const left = Math.round((sourceWidth - cropWidth) * focalX / 100);
  const top = Math.round((sourceHeight - cropHeight) * focalY / 100);
  return sharp(rotated)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(ARTWORK_WIDTH, HEIGHT, { fit: 'fill' })
    .png()
    .toBuffer();
}

async function buildRaceBibSvg({ design = {}, data = {}, artworkBuffer, logoBuffer } = {}) {
  const style = design.style || {};
  const display = design.display || {};
  const content = design.content || {};
  const background = normalizeColor(style.backgroundColor, '#0F172A');
  const accent = normalizeColor(style.accentColor, '#F97316');
  const panel = normalizeColor(style.numberPanelColor, '#F8FAFC');
  const numberColor = readableTextColor(normalizeColor(style.numberTextColor, '#0F172A'), panel);
  const title = String(data.eventTitle || content.eventTitle || 'HelloRun Event').slice(0, 150);
  const label = String(data.participationLabel || content.participationLabel || '').slice(0, 100);
  const category = String(data.category || '').slice(0, 100);
  const runnerName = String(data.runnerName || '').slice(0, 130);
  const bibNumber = String(data.bibNumber || '2027').slice(0, 12);
  const eventDate = String(data.eventDate || content.eventDate || '').slice(0, 80);
  const titleSize = fitSize(title, 28, 82, 44);
  const nameSize = fitSize(runnerName, 30, 44, 26);
  const numberSize = fitSize(bibNumber, 4, 230, 100);

  let artworkData = '';
  if (artworkBuffer) {
    const cropped = await cropArtwork(artworkBuffer, design.crop || {});
    artworkData = `data:image/png;base64,${cropped.toString('base64')}`;
  }
  let logoData = '';
  if (logoBuffer && display.showEventLogo !== false) {
    const logo = await sharp(logoBuffer, { failOn: 'error', limitInputPixels: 20_000_000 })
      .rotate().resize(180, 180, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
    logoData = `data:image/png;base64,${logo.toString('base64')}`;
  }

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${background}"/>
    ${artworkData ? `<image href="${artworkData}" x="0" y="0" width="${ARTWORK_WIDTH}" height="${HEIGHT}" preserveAspectRatio="none"/>` : ''}
    <defs><linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${background}" stop-opacity=".82"/><stop offset=".72" stop-color="${background}" stop-opacity=".25"/><stop offset="1" stop-color="${background}" stop-opacity=".72"/></linearGradient></defs>
    <rect x="0" y="0" width="${ARTWORK_WIDTH}" height="${HEIGHT}" fill="url(#shade)"/>
    <rect x="0" y="0" width="18" height="${HEIGHT}" fill="${accent}"/>
    ${logoData ? `<image href="${logoData}" x="80" y="64" width="180" height="180" preserveAspectRatio="xMidYMid meet"/>` : ''}
    <text x="80" y="${logoData ? 360 : 190}" fill="#F8FAFC" font-family="Helvetica,Arial,sans-serif" font-size="${titleSize}" font-weight="700" lengthAdjust="spacingAndGlyphs" textLength="${Math.min(1000, Math.max(300, title.length * titleSize * .58))}">${escapeXml(title)}</text>
    ${label ? `<text x="80" y="${logoData ? 445 : 275}" fill="${accent}" font-family="Helvetica,Arial,sans-serif" font-size="40" font-weight="700" letter-spacing="3">${escapeXml(label.toUpperCase())}</text>` : ''}
    ${display.showCategory !== false && category ? `<text x="80" y="${logoData ? 515 : 345}" fill="#E2E8F0" font-family="Helvetica,Arial,sans-serif" font-size="34">${escapeXml(category)}</text>` : ''}
    ${display.showEventDate && eventDate ? `<text x="80" y="920" fill="#E2E8F0" font-family="Helvetica,Arial,sans-serif" font-size="30">${escapeXml(eventDate)}</text>` : ''}
    ${display.showRunnerName && runnerName ? `<text x="80" y="1000" fill="#F8FAFC" font-family="Helvetica,Arial,sans-serif" font-size="${nameSize}" font-weight="700" lengthAdjust="spacingAndGlyphs" textLength="${Math.min(1000, Math.max(220, runnerName.length * nameSize * .56))}">${escapeXml(runnerName)}</text>` : ''}
    <rect x="${ARTWORK_WIDTH}" y="0" width="600" height="${HEIGHT}" fill="${panel}"/>
    <rect x="${ARTWORK_WIDTH}" y="0" width="16" height="${HEIGHT}" fill="${accent}"/>
    <text x="1500" y="310" text-anchor="middle" fill="${numberColor}" font-family="Helvetica,Arial,sans-serif" font-size="34" font-weight="700" letter-spacing="5">RACE BIB</text>
    <text x="1500" y="650" text-anchor="middle" fill="${numberColor}" font-family="Helvetica,Arial,sans-serif" font-size="${numberSize}" font-weight="800">${escapeXml(bibNumber)}</text>
    <text x="1500" y="870" text-anchor="middle" fill="${accent}" font-family="Helvetica,Arial,sans-serif" font-size="30" font-weight="700">HELLO • RUN • FINISH</text>
  </svg>`);
}

async function renderRaceBibPng(input = {}) {
  const design = input.design || {};
  const [artworkBuffer, logoBuffer] = await Promise.all([
    input.artworkBuffer || readManagedAsset(design.artwork || {}),
    input.logoBuffer || readManagedAsset({
      key: design.artwork?.logoKey,
      url: design.artwork?.logoUrl,
      localPath: design.artwork?.logoLocalPath
    })
  ]);
  const svg = await buildRaceBibSvg({ ...input, artworkBuffer, logoBuffer });
  return sharp(svg, { limitInputPixels: 40_000_000 }).png({ compressionLevel: 9 }).toBuffer();
}

async function renderRaceBibPdf(input = {}) {
  const png = input.pngBuffer || await renderRaceBibPng(input);
  const widthMm = Number(input.design?.print?.pageWidthMm || 254);
  const heightMm = Number(input.design?.print?.pageHeightMm || 152.4);
  const mmToPt = 72 / 25.4;
  const width = widthMm * mmToPt;
  const height = heightMm * mmToPt;
  const doc = new PDFDocument({ size: [width, height], margin: 0, autoFirstPage: true });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const completed = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  doc.image(png, 0, 0, { fit: [width, height], align: 'center', valign: 'center' });
  doc.end();
  return completed;
}

async function renderRaceBibBatchPdf(items = [], design = {}) {
  const widthMm = Number(design.print?.pageWidthMm || 254);
  const heightMm = Number(design.print?.pageHeightMm || 152.4);
  const mmToPt = 72 / 25.4;
  const size = [widthMm * mmToPt, heightMm * mmToPt];
  const doc = new PDFDocument({ size, margin: 0, autoFirstPage: false });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const completed = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  for (const item of items) {
    // Bounded by the caller. Sequential rendering avoids retaining 250 full-size PNGs.
    // eslint-disable-next-line no-await-in-loop
    const png = await renderRaceBibPng({ design, data: item });
    doc.addPage({ size, margin: 0 });
    doc.image(png, 0, 0, { fit: size, align: 'center', valign: 'center' });
  }
  doc.end();
  return completed;
}

module.exports = { WIDTH, HEIGHT, buildRaceBibSvg, renderRaceBibPng, renderRaceBibPdf, renderRaceBibBatchPdf, readManagedAsset, contrastRatio, readableTextColor };
