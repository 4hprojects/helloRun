'use strict';

/**
 * Safe image decoding and OCR working copies (doc 05 "Upload controls",
 * doc 07 "Image processing pipeline" steps 1–2 and 5).
 *
 * The original bytes are never modified; every pass gets its own derived
 * buffer. Pass definitions mirror the browser reader (processed, tall metric
 * crop, dark enhanced, original) so server and browser results are comparable,
 * but use relative geometry only, never device-specific coordinates.
 */

const sharp = require('sharp');
const { getOcrLimits } = require('./ocr-config');

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const DARK_MEAN_THRESHOLD = 96;
const TALL_ASPECT_RATIO = 1.45;
const METRIC_CROP_FRACTION = 0.58;

class OcrImageError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'OcrImageError';
    this.code = code;
  }
}

/**
 * Decode headers and basic statistics without trusting the declared type.
 * Throws OcrImageError with a stable code on anything unsafe.
 */
async function inspectImage(buffer, limits = getOcrLimits()) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new OcrImageError('image_empty', 'Image buffer is empty.');
  }
  if (buffer.length > limits.maxProofBytes) {
    throw new OcrImageError('image_too_large', 'Image exceeds the OCR byte limit.');
  }
  let metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: limits.maxInputPixels, failOn: 'error' }).metadata();
  } catch (error) {
    const message = String(error?.message || '');
    if (/pixel limit/i.test(message)) {
      throw new OcrImageError('image_too_many_pixels', 'Image exceeds the OCR pixel limit.');
    }
    throw new OcrImageError('image_undecodable', 'Image could not be decoded.');
  }
  if (!ALLOWED_FORMATS.has(String(metadata.format || ''))) {
    throw new OcrImageError('image_unsupported_format', 'Only JPEG, PNG and WebP images are processed.');
  }
  const width = Number(metadata.width) || 0;
  const height = Number(metadata.height) || 0;
  if (width < 32 || height < 32) {
    throw new OcrImageError('image_too_small', 'Image is too small to read.');
  }
  if (width * height > limits.maxInputPixels) {
    throw new OcrImageError('image_too_many_pixels', 'Image exceeds the OCR pixel limit.');
  }

  const stats = await sharp(buffer, { limitInputPixels: limits.maxInputPixels })
    .rotate()
    .greyscale()
    .resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true })
    .stats();
  const meanBrightness = Number(stats.channels?.[0]?.mean ?? 255);

  // EXIF orientation 5–8 swaps width and height once rotated.
  const rotated = Number(metadata.orientation) >= 5;
  const displayWidth = rotated ? height : width;
  const displayHeight = rotated ? width : height;
  const aspectRatio = displayHeight / displayWidth;

  return {
    format: metadata.format,
    width: displayWidth,
    height: displayHeight,
    aspectRatio: Number(aspectRatio.toFixed(3)),
    meanBrightness: Number(meanBrightness.toFixed(1)),
    orientation: aspectRatio >= TALL_ASPECT_RATIO ? 'tall' : (aspectRatio >= 1 ? 'portrait' : 'landscape'),
    theme: meanBrightness < DARK_MEAN_THRESHOLD ? 'dark' : 'light'
  };
}

function shouldRunPass(passName, info) {
  if (passName === 'metric_crop') return info.aspectRatio >= TALL_ASPECT_RATIO;
  if (passName === 'dark_enhanced') return info.theme === 'dark';
  return true;
}

/** Build one derived working copy. Returns { name, buffer, offset, scale }. */
async function buildPass(passName, buffer, info, limits = getOcrLimits()) {
  const base = () => sharp(buffer, { limitInputPixels: limits.maxInputPixels }).rotate();
  const maxDim = limits.workingMaxDimension;

  if (passName === 'original') {
    return { name: passName, buffer: await base().png().toBuffer(), offset: { left: 0, top: 0 }, scale: 1 };
  }

  if (passName === 'metric_crop') {
    const top = Math.floor(info.height * (1 - METRIC_CROP_FRACTION));
    const cropHeight = info.height - top;
    const targetWidth = Math.min(info.width * 2, maxDim);
    const scale = targetWidth / info.width;
    const output = await base()
      .extract({ left: 0, top, width: info.width, height: cropHeight })
      .resize({ width: Math.round(targetWidth) })
      .greyscale()
      .linear(1.6, -(128 * 1.6) + 128)
      .png()
      .toBuffer();
    return { name: passName, buffer: output, offset: { left: 0, top }, scale };
  }

  const longest = Math.max(info.width, info.height);
  const scale = longest > maxDim ? maxDim / longest : 1;
  let pipeline = base()
    .resize({ width: Math.round(info.width * scale), height: Math.round(info.height * scale), fit: 'fill' })
    .greyscale();
  if (passName === 'dark_enhanced') {
    pipeline = pipeline.negate({ alpha: false }).linear(1.75, -(128 * 1.75) + 128);
  } else {
    pipeline = pipeline.linear(1.45, -(128 * 1.45) + 128);
  }
  return { name: passName, buffer: await pipeline.png().toBuffer(), offset: { left: 0, top: 0 }, scale };
}

/** Map a bbox from pass coordinates back to original-image coordinates. */
function toOriginalBox(bbox, pass) {
  if (!bbox) return null;
  const scale = pass?.scale || 1;
  const offset = pass?.offset || { left: 0, top: 0 };
  const x0 = Math.round(bbox.x0 / scale + offset.left);
  const y0 = Math.round(bbox.y0 / scale + offset.top);
  const x1 = Math.round(bbox.x1 / scale + offset.left);
  const y1 = Math.round(bbox.y1 / scale + offset.top);
  return { left: x0, top: y0, width: Math.max(1, x1 - x0), height: Math.max(1, y1 - y0) };
}

/** Compact 64-bit difference hash for near-duplicate screenshot detection. */
async function computeDifferenceHash(buffer, limits = getOcrLimits()) {
  const { data } = await sharp(buffer, { limitInputPixels: limits.maxInputPixels })
    .rotate()
    .greyscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bits = '';
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      bits += data[row * 9 + col] > data[row * 9 + col + 1] ? '1' : '0';
    }
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, '0');
}

function hammingDistanceHex(a, b) {
  if (!/^[0-9a-f]{16}$/i.test(String(a)) || !/^[0-9a-f]{16}$/i.test(String(b))) return 64;
  let diff = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let count = 0;
  while (diff) {
    count += Number(diff & 1n);
    diff >>= 1n;
  }
  return count;
}

module.exports = {
  OcrImageError,
  ALLOWED_FORMATS,
  inspectImage,
  shouldRunPass,
  buildPass,
  toOriginalBox,
  computeDifferenceHash,
  hammingDistanceHex
};
