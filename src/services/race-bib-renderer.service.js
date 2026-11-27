'use strict';

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');
const fontkit = require('fontkit');
const sharp = require('sharp');
const uploadService = require('./upload.service');

const WIDTH = 1800;
const HEIGHT = 1080;
const SOCIAL_SIZE = 1800;
const LEGACY_ARTWORK_WIDTH = 1200;
const MAX_PARTNER_LOGOS = 3;

const FONT_FILES = {
  inter: require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff2'),
  interBold: require.resolve('@fontsource/inter/files/inter-latin-700-normal.woff2'),
  interExtraBold: require.resolve('@fontsource/inter/files/inter-latin-800-normal.woff2'),
  archivo: require.resolve('@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff2'),
  fredoka: require.resolve('@fontsource/fredoka/files/fredoka-latin-600-normal.woff2')
};

const FONT_FACES = Object.fromEntries(Object.entries(FONT_FILES).map(([key, file]) => [key, {
  font: fontkit.openSync(file),
  data: fsSync.readFileSync(file).toString('base64')
}]));

const TYPE_PRESETS = {
  clean: { display: 'interExtraBold', body: 'inter', label: 'interBold' },
  athletic: { display: 'archivo', body: 'inter', label: 'interBold' },
  friendly: { display: 'fredoka', body: 'inter', label: 'interBold' }
};

function escapeXml(value) {
  return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function normalizeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toUpperCase() : fallback;
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

function typographyFor(design = {}) {
  const preset = TYPE_PRESETS[design.style?.typographyPreset] || TYPE_PRESETS.clean;
  return {
    display: { key: preset.display, family: `Bib-${preset.display}` },
    body: { key: preset.body, family: `Bib-${preset.body}` },
    label: { key: preset.label, family: `Bib-${preset.label}` }
  };
}

function fontCss() {
  return Object.entries(FONT_FACES).map(([key, value]) => (
    `@font-face{font-family:Bib-${key};src:url(data:font/woff2;base64,${value.data}) format('woff2');}`
  )).join('');
}

function measureText(text, fontKey, size, letterSpacing = 0) {
  const characters = Array.from(String(text || ''));
  const face = FONT_FACES[fontKey] || FONT_FACES.inter;
  const advance = face.font.layout(characters.join('')).advanceWidth / face.font.unitsPerEm * size;
  return advance + Math.max(0, characters.length - 1) * letterSpacing;
}

function truncateLine(text, maxWidth, fontKey, size, letterSpacing = 0) {
  const characters = Array.from(String(text || ''));
  while (characters.length && measureText(`${characters.join('')}…`, fontKey, size, letterSpacing) > maxWidth) characters.pop();
  return characters.length ? `${characters.join('').trimEnd()}…` : '…';
}

function wrapAtSize(text, maxWidth, maxLines, fontKey, size, letterSpacing = 0) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { lines: [], truncated: false };
  const lines = [];
  let current = '';
  let truncated = false;
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureText(candidate, fontKey, size, letterSpacing) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (measureText(current, fontKey, size, letterSpacing) > maxWidth) current = truncateLine(current, maxWidth, fontKey, size, letterSpacing);
    if (lines.length >= maxLines) {
      truncated = true;
      current = '';
      break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (truncated && lines.length) lines[lines.length - 1] = truncateLine(lines[lines.length - 1], maxWidth, fontKey, size, letterSpacing);
  return { lines, truncated };
}

function fitTextBlock(text, { maxWidth, maxLines = 1, maxSize, minSize, fontKey, letterSpacing = 0 }) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    const wrapped = wrapAtSize(text, maxWidth, maxLines, fontKey, size, letterSpacing);
    if (!wrapped.truncated && wrapped.lines.every((line) => measureText(line, fontKey, size, letterSpacing) <= maxWidth)) {
      return { ...wrapped, size, tooSmall: false };
    }
  }
  const wrapped = wrapAtSize(text, maxWidth, maxLines, fontKey, minSize, letterSpacing);
  if (wrapped.lines.length) wrapped.lines[wrapped.lines.length - 1] = truncateLine(wrapped.lines[wrapped.lines.length - 1], maxWidth, fontKey, minSize, letterSpacing);
  return { ...wrapped, size: minSize, truncated: true, tooSmall: true };
}

function svgTextLines({ lines, x, y, size, lineHeight = 1.12, anchor = 'start', fill, family, weight = 700, letterSpacing = 0 }) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${letterSpacing}">${lines.map((line, index) => `<tspan x="${x}" dy="${index ? size * lineHeight : 0}">${escapeXml(line)}</tspan>`).join('')}</text>`;
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

async function cropArtwork(buffer, targetWidth, targetHeight, crop = {}) {
  if (!buffer) return null;
  const focalX = Math.min(100, Math.max(0, Number(crop.focalX ?? 50)));
  const focalY = Math.min(100, Math.max(0, Number(crop.focalY ?? 50)));
  const zoom = Math.min(3, Math.max(1, Number(crop.zoom || 1)));
  const rotated = await sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 }).rotate().png().toBuffer();
  const metadata = await sharp(rotated).metadata();
  const targetRatio = targetWidth / targetHeight;
  let cropWidth = metadata.width;
  let cropHeight = metadata.width / targetRatio;
  if (cropHeight > metadata.height) {
    cropHeight = metadata.height;
    cropWidth = metadata.height * targetRatio;
  }
  cropWidth = Math.max(1, Math.floor(cropWidth / zoom));
  cropHeight = Math.max(1, Math.floor(cropHeight / zoom));
  const left = Math.min(metadata.width - cropWidth, Math.max(0, Math.round((metadata.width - cropWidth) * focalX / 100)));
  const top = Math.min(metadata.height - cropHeight, Math.max(0, Math.round((metadata.height - cropHeight) * focalY / 100)));
  return sharp(rotated).extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(targetWidth, targetHeight, { fit: 'fill' }).png().toBuffer();
}

async function logoData(buffer, width, height) {
  if (!buffer) return '';
  try {
    const logo = await sharp(buffer, { failOn: 'error', limitInputPixels: 20_000_000 })
      .rotate().resize(width, height, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
    return `data:image/png;base64,${logo.toString('base64')}`;
  } catch (_error) {
    return '';
  }
}

function normalizedData(design, data) {
  const content = design.content || {};
  return {
    eventTitle: String(data.eventTitle || content.eventTitle || 'HelloRun Event').slice(0, 150),
    participationLabel: String(data.participationLabel || content.participationLabel || '').slice(0, 100),
    category: String(data.category || '').slice(0, 100),
    location: String(data.location || content.location || '').slice(0, 100),
    runnerName: String(data.runnerName || '').slice(0, 130),
    bibNumber: String(data.bibNumber || '2027').slice(0, 12),
    eventDate: String(data.eventDate || content.eventDate || '').slice(0, 80),
    tagline: String(data.tagline || content.tagline || '').slice(0, 140),
    entryBadge: String(data.entryBadge || content.entryBadge || '').slice(0, 50),
    footerNote: String(data.footerNote || content.footerNote || '').slice(0, 120)
  };
}

function palette(design = {}) {
  const style = design.style || {};
  const background = normalizeColor(style.backgroundColor, '#0F172A');
  const accent = normalizeColor(style.accentColor, '#F97316');
  const panel = normalizeColor(style.numberPanelColor, '#F8FAFC');
  const requestedNumber = normalizeColor(style.numberTextColor, '#0F172A');
  const footer = normalizeColor(style.footerColor, accent);
  const text = normalizeColor(style.textColor, '#F8FAFC');
  return { background, accent, panel, footer, text, number: readableTextColor(requestedNumber, panel) };
}

function assetImage(data, x, y, width, height) {
  return data ? `<image href="${data}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>` : '';
}

function logoStrip(primary, partners, { y = 40, align = 'end', dark = false } = {}) {
  const logos = [primary, ...partners].filter(Boolean).slice(0, MAX_PARTNER_LOGOS + 1);
  if (!logos.length) return '';
  const box = 120;
  const gap = 24;
  const total = logos.length * box + (logos.length - 1) * gap;
  const start = align === 'center' ? (WIDTH - total) / 2 : WIDTH - 64 - total;
  const backdrop = dark ? `<rect x="${start - 20}" y="${y - 12}" width="${total + 40}" height="${box + 24}" rx="20" fill="#0F172A" opacity=".42"/>` : '';
  return `${backdrop}${logos.map((logo, index) => assetImage(logo, start + index * (box + gap), y, box, box)).join('')}`;
}

function guideOverlay() {
  return `<g aria-hidden="true" opacity=".82"><rect x="48" y="48" width="1704" height="984" rx="8" fill="none" stroke="#F97316" stroke-width="4" stroke-dasharray="18 12"/><text x="64" y="92" fill="#F97316" font-family="Bib-interBold" font-size="22">PRINT SAFE AREA</text><path d="M900 0V1080M0 540H1800" stroke="#F97316" stroke-width="2" stroke-dasharray="10 12" opacity=".65"/></g>`;
}

function legacySvg({ design, data, artworkData, primaryLogo }) {
  const colors = palette(design);
  const display = design.display || {};
  const titleSize = fitSize(data.eventTitle, 28, 82, 44);
  const nameSize = fitSize(data.runnerName, 30, 44, 26);
  const numberSize = fitSize(data.bibNumber, 4, 230, 100);
  return `<rect width="${WIDTH}" height="${HEIGHT}" fill="${colors.background}"/>
    ${artworkData ? `<image href="${artworkData}" x="0" y="0" width="${LEGACY_ARTWORK_WIDTH}" height="${HEIGHT}" preserveAspectRatio="none"/>` : ''}
    <defs><linearGradient id="legacyShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${colors.background}" stop-opacity=".82"/><stop offset=".72" stop-color="${colors.background}" stop-opacity=".25"/><stop offset="1" stop-color="${colors.background}" stop-opacity=".72"/></linearGradient></defs>
    <rect x="0" y="0" width="${LEGACY_ARTWORK_WIDTH}" height="${HEIGHT}" fill="url(#legacyShade)"/><rect x="0" y="0" width="18" height="${HEIGHT}" fill="${colors.accent}"/>
    ${primaryLogo ? assetImage(primaryLogo, 80, 64, 180, 180) : ''}
    <text x="80" y="${primaryLogo ? 360 : 190}" fill="#F8FAFC" font-family="Helvetica,Arial,sans-serif" font-size="${titleSize}" font-weight="700" lengthAdjust="spacingAndGlyphs" textLength="${Math.min(1000, Math.max(300, data.eventTitle.length * titleSize * .58))}">${escapeXml(data.eventTitle)}</text>
    ${data.participationLabel ? `<text x="80" y="${primaryLogo ? 445 : 275}" fill="${colors.accent}" font-family="Helvetica,Arial,sans-serif" font-size="40" font-weight="700" letter-spacing="3">${escapeXml(data.participationLabel.toUpperCase())}</text>` : ''}
    ${display.showCategory !== false && data.category ? `<text x="80" y="${primaryLogo ? 515 : 345}" fill="#E2E8F0" font-family="Helvetica,Arial,sans-serif" font-size="34">${escapeXml(data.category)}</text>` : ''}
    ${display.showEventDate && data.eventDate ? `<text x="80" y="920" fill="#E2E8F0" font-family="Helvetica,Arial,sans-serif" font-size="30">${escapeXml(data.eventDate)}</text>` : ''}
    ${display.showRunnerName && data.runnerName ? `<text x="80" y="1000" fill="#F8FAFC" font-family="Helvetica,Arial,sans-serif" font-size="${nameSize}" font-weight="700" lengthAdjust="spacingAndGlyphs" textLength="${Math.min(1000, Math.max(220, data.runnerName.length * nameSize * .56))}">${escapeXml(data.runnerName)}</text>` : ''}
    <rect x="${LEGACY_ARTWORK_WIDTH}" y="0" width="600" height="${HEIGHT}" fill="${colors.panel}"/><rect x="${LEGACY_ARTWORK_WIDTH}" y="0" width="16" height="${HEIGHT}" fill="${colors.accent}"/>
    <text x="1500" y="310" text-anchor="middle" fill="${colors.number}" font-family="Helvetica,Arial,sans-serif" font-size="34" font-weight="700" letter-spacing="5">RACE BIB</text>
    <text x="1500" y="650" text-anchor="middle" fill="${colors.number}" font-family="Helvetica,Arial,sans-serif" font-size="${numberSize}" font-weight="800">${escapeXml(data.bibNumber)}</text>
    <text x="1500" y="870" text-anchor="middle" fill="${colors.accent}" font-family="Helvetica,Arial,sans-serif" font-size="30" font-weight="700">HELLO • RUN • FINISH</text>`;
}

function festivalSvg({ design, data, artworkData, primaryLogo, partnerLogos, diagnostics }) {
  const colors = palette(design);
  const display = design.display || {};
  const type = typographyFor(design);
  const title = fitTextBlock(data.eventTitle, { maxWidth: partnerLogos.length ? 820 : 1050, maxLines: 2, maxSize: 76, minSize: 38, fontKey: type.display.key });
  const number = fitTextBlock(data.bibNumber, { maxWidth: 1500, maxLines: 1, maxSize: 330, minSize: 150, fontKey: type.display.key, letterSpacing: -4 });
  const name = fitTextBlock(data.runnerName, { maxWidth: 1200, maxLines: 1, maxSize: 54, minSize: 28, fontKey: type.label.key });
  if (title.tooSmall) diagnostics.push('event_title_overflow');
  if (number.tooSmall) diagnostics.push('bib_number_overflow');
  if (name.tooSmall && display.showRunnerName) diagnostics.push('runner_name_overflow');
  const overlay = Math.min(.9, Math.max(0, Number(design.style?.overlayStrength ?? .45)));
  const label = [display.showLocation && data.location, data.participationLabel].filter(Boolean).join(' • ');
  return `<rect width="1800" height="1080" fill="${colors.background}"/>
    ${artworkData ? `<image href="${artworkData}" x="0" y="0" width="1800" height="400" preserveAspectRatio="none"/>` : ''}
    <rect width="1800" height="400" fill="${colors.background}" opacity="${overlay}"/>
    ${primaryLogo ? assetImage(primaryLogo, 64, 56, 180, 180) : ''}${logoStrip('', partnerLogos, { y: 56, dark: true })}
    ${svgTextLines({ lines: title.lines, x: primaryLogo ? 290 : 72, y: 168, size: title.size, lineHeight: 1.08, fill: colors.text, family: type.display.family })}
    ${data.tagline && display.showTagline ? `<text x="${primaryLogo ? 292 : 74}" y="330" fill="${colors.text}" font-family="${type.body.family}" font-size="30">${escapeXml(data.tagline)}</text>` : ''}
    <rect y="400" width="1800" height="480" fill="${colors.panel}"/>
    ${label ? `<text x="900" y="475" text-anchor="middle" fill="${colors.number}" font-family="${type.label.family}" font-size="30" font-weight="700" letter-spacing="4">${escapeXml(label.toUpperCase())}</text>` : ''}
    ${svgTextLines({ lines: number.lines, x: 900, y: 755, size: number.size, anchor: 'middle', fill: colors.number, family: type.display.family, letterSpacing: -4 })}
    ${display.showRunnerName && data.runnerName ? svgTextLines({ lines: name.lines, x: 900, y: 842, size: name.size, anchor: 'middle', fill: colors.number, family: type.label.family }) : ''}
    <rect y="880" width="1800" height="200" fill="${colors.footer}"/>
    ${data.entryBadge && display.showEntryBadge ? `<rect x="64" y="936" width="${Math.min(390, Math.max(210, measureText(data.entryBadge, type.label.key, 30) + 64))}" height="76" rx="12" fill="${colors.panel}"/><text x="96" y="986" fill="${colors.number}" font-family="${type.label.family}" font-size="30" font-weight="700">${escapeXml(data.entryBadge.toUpperCase())}</text>` : ''}
    ${data.footerNote && display.showFooterNote ? `<text x="900" y="976" text-anchor="middle" fill="${readableTextColor(colors.text, colors.footer)}" font-family="${type.label.family}" font-size="34" font-weight="700">${escapeXml(data.footerNote)}</text>` : ''}
    ${display.showCategory !== false && data.category ? `<text x="1736" y="988" text-anchor="end" fill="${readableTextColor(colors.text, colors.footer)}" font-family="${type.display.family}" font-size="56">${escapeXml(data.category)}</text>` : ''}`;
}

function classicSvg({ design, data, artworkData, primaryLogo, partnerLogos, diagnostics }) {
  const colors = palette(design);
  const display = design.display || {};
  const type = typographyFor(design);
  const title = fitTextBlock(data.eventTitle, { maxWidth: 1220, maxLines: 2, maxSize: 88, minSize: 40, fontKey: type.display.key });
  const number = fitTextBlock(data.bibNumber, { maxWidth: 1600, maxLines: 1, maxSize: 390, minSize: 160, fontKey: type.display.key, letterSpacing: -5 });
  if (title.tooSmall) diagnostics.push('event_title_overflow');
  if (number.tooSmall) diagnostics.push('bib_number_overflow');
  const overlay = Math.min(.9, Math.max(0, Number(design.style?.overlayStrength ?? .55)));
  const headerLogos = [primaryLogo, ...partnerLogos].filter(Boolean);
  return `<rect width="1800" height="1080" fill="${colors.background}"/>
    ${artworkData ? `<image href="${artworkData}" x="0" y="0" width="1800" height="320" preserveAspectRatio="none"/>` : ''}
    <rect width="1800" height="320" fill="${colors.background}" opacity="${overlay}"/>
    ${headerLogos.length ? logoStrip(primaryLogo, partnerLogos, { y: 28, align: 'center', dark: true }) : ''}
    ${svgTextLines({ lines: title.lines, x: 900, y: headerLogos.length ? 246 : 146, size: title.size, lineHeight: 1.02, anchor: 'middle', fill: colors.text, family: type.display.family })}
    <rect y="320" width="1800" height="600" fill="${colors.panel}"/>
    ${data.tagline && display.showTagline ? `<text x="900" y="402" text-anchor="middle" fill="${colors.number}" font-family="${type.label.family}" font-size="32" font-weight="700">${escapeXml(data.tagline)}</text>` : ''}
    ${data.participationLabel ? `<text x="900" y="464" text-anchor="middle" fill="${colors.accent}" font-family="${type.label.family}" font-size="30" font-weight="700" letter-spacing="4">${escapeXml(data.participationLabel.toUpperCase())}</text>` : ''}
    ${svgTextLines({ lines: number.lines, x: 900, y: 790, size: number.size, anchor: 'middle', fill: colors.number, family: type.display.family, letterSpacing: -5 })}
    ${display.showRunnerName && data.runnerName ? `<text x="900" y="878" text-anchor="middle" fill="${colors.number}" font-family="${type.label.family}" font-size="46" font-weight="700">${escapeXml(data.runnerName)}</text>` : ''}
    <rect y="920" width="1800" height="160" fill="${colors.footer}"/>
    ${data.location && display.showLocation ? `<text x="64" y="1014" fill="${readableTextColor(colors.text, colors.footer)}" font-family="${type.label.family}" font-size="32" font-weight="700">${escapeXml(data.location)}</text>` : ''}
    ${data.footerNote && display.showFooterNote ? `<text x="900" y="1014" text-anchor="middle" fill="${readableTextColor(colors.text, colors.footer)}" font-family="${type.label.family}" font-size="30" font-weight="700">${escapeXml(data.footerNote)}</text>` : ''}
    ${display.showCategory !== false && data.category ? `<text x="1736" y="1022" text-anchor="end" fill="${readableTextColor(colors.text, colors.footer)}" font-family="${type.display.family}" font-size="58">${escapeXml(data.category)}</text>` : ''}`;
}

function configuredLogoCount(design = {}) {
  return Array.isArray(design.branding?.partnerLogos) ? design.branding.partnerLogos.filter((logo) => logo?.key || logo?.url || logo?.localPath).length : 0;
}

async function loadRenderAssets(design, input = {}) {
  const artworkBuffer = input.artworkBuffer || await readManagedAsset(design.artwork || {});
  const primaryBuffer = input.logoBuffer || await readManagedAsset({
    key: design.branding?.primaryLogo?.key || design.artwork?.logoKey,
    url: design.branding?.primaryLogo?.url || design.artwork?.logoUrl,
    localPath: design.branding?.primaryLogo?.localPath || design.artwork?.logoLocalPath
  });
  const configuredPartners = Array.isArray(design.branding?.partnerLogos) ? design.branding.partnerLogos.slice(0, MAX_PARTNER_LOGOS) : [];
  const partnerBuffers = input.partnerLogoBuffers || await Promise.all(configuredPartners.map(readManagedAsset));
  return { artworkBuffer, primaryBuffer, partnerBuffers };
}

async function buildRaceBibSvg(input = {}) {
  const design = input.design || {};
  const data = normalizedData(design, input.data || {});
  const diagnostics = [];
  const { artworkBuffer, primaryBuffer, partnerBuffers } = await loadRenderAssets(design, input);
  const display = design.display || {};
  const layout = design.layoutKey || 'landscape_v1';
  const artworkTarget = ['landscape_v1', 'photo_split_v1'].includes(layout)
    ? [LEGACY_ARTWORK_WIDTH, HEIGHT]
    : layout === 'festival_header_v1' ? [WIDTH, 400] : [WIDTH, 320];
  const cropped = await cropArtwork(artworkBuffer, artworkTarget[0], artworkTarget[1], design.crop || {});
  const artworkData = cropped ? `data:image/png;base64,${cropped.toString('base64')}` : '';
  if (!artworkData && design.artwork?.source !== 'solid') diagnostics.push('artwork_missing');
  const primaryLogo = display.showEventLogo === false ? '' : await logoData(primaryBuffer, 180, 180);
  const partnerLogos = display.showPartnerLogos === false ? [] : (await Promise.all(partnerBuffers.slice(0, MAX_PARTNER_LOGOS).map((buffer) => logoData(buffer, 140, 140)))).filter(Boolean);
  if (configuredLogoCount(design) > MAX_PARTNER_LOGOS) diagnostics.push('partner_logo_limit');
  let body;
  if (['landscape_v1', 'photo_split_v1'].includes(layout)) body = legacySvg({ design, data, artworkData, primaryLogo });
  else if (layout === 'classic_race_v1') body = classicSvg({ design, data, artworkData, primaryLogo, partnerLogos, diagnostics });
  else body = festivalSvg({ design, data, artworkData, primaryLogo, partnerLogos, diagnostics });
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><style>${fontCss()}</style>${body}${input.editorGuides ? guideOverlay() : ''}</svg>`);
  svg.diagnostics = [...new Set(diagnostics)];
  return svg;
}

function analyzeRaceBibDesign(design = {}, dataInput = {}) {
  const warnings = [];
  const colors = palette(design);
  const requestedNumber = normalizeColor(design.style?.numberTextColor, '#0F172A');
  if (contrastRatio(requestedNumber, colors.panel) < 4.5) warnings.push('number_contrast');
  if (design.artwork?.source !== 'solid' && !(design.artwork?.key || design.artwork?.url || design.artwork?.localPath)) warnings.push('artwork_missing');
  if (configuredLogoCount(design) > MAX_PARTNER_LOGOS) warnings.push('partner_logo_limit');
  if (!['landscape_v1', 'photo_split_v1', 'festival_header_v1', 'classic_race_v1'].includes(design.layoutKey || 'landscape_v1')) warnings.push('layout_unknown');
  const layout = design.layoutKey || 'landscape_v1';
  if (!['landscape_v1', 'photo_split_v1'].includes(layout)) {
    const type = typographyFor(design);
    const data = normalizedData(design, dataInput);
    const titleWidth = layout === 'festival_header_v1' && configuredLogoCount(design) ? 820 : layout === 'classic_race_v1' ? 1220 : 1050;
    if (fitTextBlock(data.eventTitle, { maxWidth: titleWidth, maxLines: 2, maxSize: 76, minSize: 38, fontKey: type.display.key }).tooSmall) warnings.push('event_title_overflow');
    if (fitTextBlock(data.bibNumber, { maxWidth: layout === 'classic_race_v1' ? 1600 : 1500, maxLines: 1, maxSize: 330, minSize: 150, fontKey: type.display.key }).tooSmall) warnings.push('bib_number_overflow');
    if (design.display?.showRunnerName && fitTextBlock(data.runnerName, { maxWidth: 1200, maxLines: 1, maxSize: 54, minSize: 28, fontKey: type.label.key }).tooSmall) warnings.push('runner_name_overflow');
  }
  return warnings;
}

async function renderRaceBibPng(input = {}) {
  const svg = await buildRaceBibSvg(input);
  let pipeline = sharp(svg, { limitInputPixels: 40_000_000 }).png({ compressionLevel: 9 });
  if (input.grayscale) pipeline = pipeline.grayscale();
  return pipeline.toBuffer();
}

async function renderRaceBibSocialPng(input = {}) {
  const design = input.design || {};
  const printPng = input.pngBuffer || await renderRaceBibPng({ ...input, editorGuides: false, grayscale: false });
  const colors = palette(design);
  const type = typographyFor(design);
  const social = design.social || {};
  const cta = String(social.ctaText || '').slice(0, 100);
  const url = String(social.ctaUrl || '').slice(0, 160);
  const textColor = readableTextColor(colors.text, colors.background);
  const frame = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SOCIAL_SIZE}" height="${SOCIAL_SIZE}"><style>${fontCss()}</style><rect width="1800" height="1800" fill="${colors.background}"/><rect x="64" y="64" width="1672" height="1004" rx="32" fill="#0B1220" opacity=".22"/><text x="900" y="1252" text-anchor="middle" fill="${textColor}" font-family="${type.label.family}" font-size="52" font-weight="700">${escapeXml(cta)}</text><text x="900" y="1328" text-anchor="middle" fill="${colors.accent}" font-family="${type.body.family}" font-size="34">${escapeXml(url)}</text><text x="900" y="1688" text-anchor="middle" fill="${textColor}" font-family="${type.label.family}" font-size="26" letter-spacing="4">HELLO • RUN • FINISH</text></svg>`);
  const resized = await sharp(printPng).resize(1640, 984, { fit: 'fill' }).toBuffer();
  let pipeline = sharp(frame).composite([{ input: resized, left: 80, top: 74 }]).png({ compressionLevel: 9 });
  if (input.grayscale) pipeline = pipeline.grayscale();
  return pipeline.toBuffer();
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

module.exports = {
  WIDTH, HEIGHT, SOCIAL_SIZE, MAX_PARTNER_LOGOS, buildRaceBibSvg, renderRaceBibPng,
  renderRaceBibSocialPng, renderRaceBibPdf, renderRaceBibBatchPdf, readManagedAsset,
  analyzeRaceBibDesign, contrastRatio, readableTextColor, measureText, fitTextBlock
};
