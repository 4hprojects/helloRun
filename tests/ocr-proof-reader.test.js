'use strict';

/**
 * OCR Proof Reader — unit tests
 *
 * Loads the browser IIFE via vm.runInContext so we can exercise the parsing
 * logic (detectSourceApp, _parseOcrText, compareWithForm) in Node.js without
 * a browser or a live Tesseract worker.
 *
 * Each sample text is representative of what Tesseract actually returns from
 * a real running-app screenshot.
 */

const { test } = require('node:test');
const assert  = require('node:assert/strict');
const fs      = require('node:fs');
const path    = require('node:path');
const vm      = require('node:vm');

// ---------------------------------------------------------------------------
// Load module
// ---------------------------------------------------------------------------

function loadOcrModule () {
  const src = fs.readFileSync(
    path.join(__dirname, '../src/public/js/ocr-proof-reader.js'),
    'utf8'
  );
  const ctx = {
    window:  {},
    console: { debug: () => {} } // silence verbose logs during tests
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx.window.OcrProofReader;
}

const ocr = loadOcrModule();

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function parse (text, ocrConf) {
  return ocr._parseOcrText(text, ocrConf == null ? 80 : ocrConf);
}

// ---------------------------------------------------------------------------
// detectSourceApp
// ---------------------------------------------------------------------------

test('detectSourceApp — identifies Strava', () => {
  assert.equal(ocr.detectSourceApp('Strava · 5.02 km'), 'strava');
});

test('detectSourceApp — identifies Nike Run Club (NRC shorthand)', () => {
  assert.equal(ocr.detectSourceApp('NRC\n10.0 km'), 'nike');
});

test('detectSourceApp — identifies Nike Run Club (full name)', () => {
  assert.equal(ocr.detectSourceApp('Nike Run Club — your weekly summary'), 'nike');
});

test('detectSourceApp — identifies Garmin', () => {
  assert.equal(ocr.detectSourceApp('Garmin Connect activity'), 'garmin');
});

test('detectSourceApp — identifies Apple Health', () => {
  assert.equal(ocr.detectSourceApp('Apple Health · Outdoor Run'), 'apple');
});

test('detectSourceApp — identifies Google Fit', () => {
  assert.equal(ocr.detectSourceApp('Google Fit running activity'), 'google');
});

test('detectSourceApp — returns unknown for unrecognised text', () => {
  assert.equal(ocr.detectSourceApp('Some random fitness app'), 'unknown');
});

// ---------------------------------------------------------------------------
// _parseOcrText — distance extraction
// ---------------------------------------------------------------------------

test('parseOcrText — extracts km distance with space', () => {
  const r = parse('Distance\n5.02 km\nTime 25:30');
  assert.ok(r.distance, 'distance should be found');
  assert.equal(r.distance.value, 5.02);
  assert.equal(r.distance.unit, 'km');
});

test('parseOcrText — extracts km with comma decimal', () => {
  const r = parse('10,5 km\n55:12');
  assert.ok(r.distance);
  assert.equal(r.distance.value, 10.5);
});

test('parseOcrText — extracts miles and converts to km', () => {
  const r = parse('3.1 mi\n28:45');
  assert.ok(r.distance);
  assert.equal(r.distance.unit, 'mi');
  // 3.1 × 1.60934 ≈ 4.99
  assert.ok(r.distance.valueKm > 4.9 && r.distance.valueKm < 5.1,
    `Expected ~4.99 km, got ${r.distance.valueKm}`);
});

test('parseOcrText — extracts distance without space before unit', () => {
  const r = parse('Activity: 21.1km completed');
  assert.ok(r.distance);
  assert.equal(r.distance.value, 21.1);
});

test('parseOcrText — returns null distance when no distance-unit pattern present', () => {
  // No recognisable "number + unit" pair → null
  const r = parse('Settings Privacy Notifications Bluetooth');
  assert.equal(r.distance, null);
});

test('parseOcrText — zero-value distance is rejected', () => {
  // "0 km" is structurally valid but value <= 0 should be ignored
  const r = parse('0 km completed');
  assert.equal(r.distance, null);
});

// ---------------------------------------------------------------------------
// _parseOcrText — time extraction
// ---------------------------------------------------------------------------

test('parseOcrText — extracts hh:mm:ss time', () => {
  const r = parse('5.02 km\n1:23:45');
  assert.ok(r.time);
  assert.equal(r.time.hours, 1);
  assert.equal(r.time.minutes, 23);
  assert.equal(r.time.seconds, 45);
  assert.equal(r.time.totalMs, (3600 + 23 * 60 + 45) * 1000);
});

test('parseOcrText — extracts mm:ss time', () => {
  const r = parse('5.02 km\n25:30');
  assert.ok(r.time);
  assert.equal(r.time.hours, 0);
  assert.equal(r.time.minutes, 25);
  assert.equal(r.time.seconds, 30);
});

test('parseOcrText — extracts h m s format', () => {
  const r = parse('10.0 km\n1h 02m 30s');
  assert.ok(r.time);
  assert.equal(r.time.hours, 1);
  assert.equal(r.time.minutes, 2);
  assert.equal(r.time.seconds, 30);
});

test('parseOcrText — rejects impossible seconds (> 59)', () => {
  const r = parse('5.0 km\n25:99');
  // 25:99 is not valid mm:ss
  assert.equal(r.time, null);
});

// ---------------------------------------------------------------------------
// _parseOcrText — date extraction
// ---------------------------------------------------------------------------

test('parseOcrText — extracts ISO date (YYYY-MM-DD)', () => {
  const r = parse('5.02 km\n25:30\n2025-04-15');
  assert.equal(r.date, '2025-04-15');
});

test('parseOcrText — extracts dd/mm/yyyy date', () => {
  const r = parse('5.02 km\n25:30\n15/04/2025');
  assert.equal(r.date, '2025-04-15');
});

test('parseOcrText — extracts named-month date', () => {
  const r = parse('10.0 km\n55:12\nApril 14, 2025');
  assert.equal(r.date, '2025-04-14');
});

test('parseOcrText — extracts abbreviated month date', () => {
  const r = parse('5.02 km\n25:30\nApr 15 2025');
  assert.equal(r.date, '2025-04-15');
});

test('parseOcrText — rejects future date', () => {
  // Use a date far in the future
  const r = parse('5.02 km\n25:30\n2099-01-01');
  assert.equal(r.date, null);
});

// ---------------------------------------------------------------------------
// _parseOcrText — pace extraction
// ---------------------------------------------------------------------------

test('parseOcrText — extracts km pace', () => {
  const r = parse('5.02 km\n25:30\n5:03 /km');
  assert.ok(r.pace);
  assert.equal(r.pace.minutes, 5);
  assert.equal(r.pace.seconds, 3);
  assert.equal(r.pace.unit, '/km');
});

test('parseOcrText — extracts mi pace', () => {
  const r = parse('3.1 mi\n28:45\n9:16 /mi');
  assert.ok(r.pace);
  assert.equal(r.pace.unit, '/mi');
});

// ---------------------------------------------------------------------------
// _parseOcrText — source app detection inside parse
// ---------------------------------------------------------------------------

test('parseOcrText — detects Strava source from full screenshot text', () => {
  const text = 'Strava\n5.02 km\n25:30\n5:03 /km\n2025-04-15';
  const r = parse(text);
  assert.equal(r.detectedSource, 'strava');
});

test('parseOcrText — detects Garmin source', () => {
  const r = parse('Garmin Connect\n21.1 km\n1:45:33');
  assert.equal(r.detectedSource, 'garmin');
});

// ---------------------------------------------------------------------------
// _parseOcrText — confidence scoring
// ---------------------------------------------------------------------------

test('parseOcrText — full result (dist+time+pace+date) yields high confidence', () => {
  const text = 'Strava\n5.02 km\n25:30\n5:03 /km\n2025-04-15';
  const r = parse(text, 85);
  // dist(0.4) + time(0.4) + pace(0.1) + date(0.05) + ocrConf bonus(0.05) = 1.0
  assert.ok(r.confidence >= 0.9, `Expected >= 0.9, got ${r.confidence}`);
});

test('parseOcrText — distance only yields low confidence', () => {
  const r = parse('5.02 km', 0);
  assert.ok(r.confidence <= 0.4, `Expected <= 0.4, got ${r.confidence}`);
});

test('parseOcrText — no run data yields zero confidence', () => {
  const r = parse('Settings Notifications Privacy', 0);
  assert.equal(r.confidence, 0);
});

// ---------------------------------------------------------------------------
// _parseOcrText — realistic full-screenshot scenarios
// ---------------------------------------------------------------------------

test('parseOcrText — Strava screenshot: 5 km run', () => {
  const text = [
    'Strava',
    'Morning Run',
    '5.02 km',
    '25:30',
    '5:05 /km',
    'Apr 15, 2025'
  ].join('\n');

  const r = parse(text, 82);
  assert.equal(r.detectedSource, 'strava');
  assert.ok(r.distance);
  assert.equal(r.distance.value, 5.02);
  assert.ok(r.time);
  assert.equal(r.time.minutes, 25);
  assert.equal(r.time.seconds, 30);
  assert.ok(r.pace);
  assert.equal(r.date, '2025-04-15');
  assert.ok(r.confidence >= 0.9);
});

test('parseOcrText — Nike Run Club screenshot: 10 km', () => {
  const text = [
    'Nike Run Club',
    '10.00 km',
    '55:12',
    '5:31 /km',
    '14/04/2025'
  ].join('\n');

  const r = parse(text, 78);
  assert.equal(r.detectedSource, 'nike');
  assert.equal(r.distance.value, 10);
  assert.equal(r.time.minutes, 55);
  assert.equal(r.time.seconds, 12);
  assert.equal(r.date, '2025-04-14');
});

test('parseOcrText — Garmin Connect: half marathon in miles', () => {
  const text = [
    'Garmin Connect',
    '13.1 mi',
    '1:58:42',
    '9:03 /mi',
    '2025-03-22'
  ].join('\n');

  const r = parse(text, 88);
  assert.equal(r.detectedSource, 'garmin');
  assert.equal(r.distance.unit, 'mi');
  assert.ok(r.distance.valueKm > 21 && r.distance.valueKm < 22,
    `Expected ~21.1 km, got ${r.distance.valueKm}`);
  assert.equal(r.time.hours, 1);
  assert.equal(r.time.minutes, 58);
  assert.equal(r.time.seconds, 42);
});

test('parseOcrText — partial OCR (distance + time only, no pace/date)', () => {
  const text = '10.0 km\n55:12';
  const r = parse(text, 60);
  assert.ok(r.distance);
  assert.ok(r.time);
  assert.equal(r.pace, null);
  assert.equal(r.date, null);
  // dist(0.4) + time(0.4) = 0.8 (no ocrConf bonus since 60 <= 70)
  assert.ok(r.confidence >= 0.79 && r.confidence <= 0.81,
    `Expected ~0.80, got ${r.confidence}`);
});

test('parseOcrText — poor OCR output with garbled text returns nulls', () => {
  const text = 'K3|IA RV|\nS3tT|NGS 4PPL|C4T|0N';
  const r = parse(text, 20);
  assert.equal(r.distance, null);
  assert.equal(r.time, null);
  assert.equal(r.confidence, 0);
});

// ---------------------------------------------------------------------------
// compareWithForm
// ---------------------------------------------------------------------------

test('compareWithForm — no mismatch when values match', () => {
  const ocrResult = parse('5.02 km\n25:30');
  // 5.02 km, 25:30 = 1530000 ms
  const result = ocr.compareWithForm(ocrResult, 5.02, 1530000);
  assert.equal(result.distanceMismatch, false);
  assert.equal(result.timeMismatch, false);
});

test('compareWithForm — flags distance mismatch > 10% threshold', () => {
  const ocrResult = parse('5.02 km\n25:30');
  // Form says 10 km — clearly different
  const result = ocr.compareWithForm(ocrResult, 10, 1530000);
  assert.equal(result.distanceMismatch, true);
  assert.ok(result.distanceDelta > 4);
});

test('compareWithForm — flags distance mismatch when > 0.5 km apart', () => {
  const ocrResult = parse('5.02 km\n25:30');
  // Form says 5.6 km (0.58 km difference > 0.5 km threshold at this range)
  const result = ocr.compareWithForm(ocrResult, 5.6, 1530000);
  assert.equal(result.distanceMismatch, true);
});

test('compareWithForm — no mismatch for small distance difference within 10%', () => {
  const ocrResult = parse('10.0 km\n55:12');
  // Form says 10.05 km — within 10% (threshold = max(1.0, 0.5) = 1.0)
  const result = ocr.compareWithForm(ocrResult, 10.05, 55 * 60 * 1000 + 12 * 1000);
  assert.equal(result.distanceMismatch, false);
});

test('compareWithForm — flags time mismatch > 60 seconds apart', () => {
  const ocrResult = parse('5.02 km\n25:30');
  // OCR time = 1530000 ms; form says 5 minutes off = 1830000 ms
  const result = ocr.compareWithForm(ocrResult, 5.02, 1830000);
  assert.equal(result.timeMismatch, true);
  assert.ok(result.timeDelta > 60);
});

test('compareWithForm — no time mismatch when within 60 seconds', () => {
  const ocrResult = parse('5.02 km\n25:30');
  // OCR = 1530000 ms; form = 1570000 ms (40s difference)
  const result = ocr.compareWithForm(ocrResult, 5.02, 1570000);
  assert.equal(result.timeMismatch, false);
});

test('compareWithForm — gracefully handles missing OCR distance', () => {
  const ocrResult = parse('no distance here\n25:30');
  const result = ocr.compareWithForm(ocrResult, 5.0, 1530000);
  assert.equal(result.distanceMismatch, false); // can't compare what wasn't found
  assert.equal(result.distanceDelta, null);
});
