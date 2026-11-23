'use strict';

const OcrProductEvent = require('../models/OcrProductEvent');
const {
  OCR_PRODUCT_EVENTS,
  OCR_TARGET_KINDS,
  OCR_DEVICE_CLASSES,
  OCR_RESULT_STATUSES,
  OCR_PLATFORM_BUCKETS,
  OCR_DETECTED_FIELDS
} = require('../models/OcrProductEvent');

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

function enumValue(value, allowed, fallback) {
  const safe = String(value || '').trim().toLowerCase();
  return allowed.includes(safe) ? safe : fallback;
}

function sanitizeOcrProductEvent(body = {}, now = new Date()) {
  const flowId = String(body.flowId || '').trim();
  const event = enumValue(body.event, OCR_PRODUCT_EVENTS, '');
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(flowId) || !event) return null;

  const latency = Number(body.latencyMs);
  const fieldsDetected = Array.isArray(body.fieldsDetected)
    ? [...new Set(body.fieldsDetected.map((field) => enumValue(field, OCR_DETECTED_FIELDS, '')).filter(Boolean))].slice(0, OCR_DETECTED_FIELDS.length)
    : [];
  return {
    flowId,
    event,
    latencyMs: Number.isFinite(latency) ? Math.max(0, Math.min(300000, Math.round(latency))) : null,
    targetKind: enumValue(body.targetKind, OCR_TARGET_KINDS, 'unknown'),
    deviceClass: enumValue(body.deviceClass, OCR_DEVICE_CLASSES, 'unknown'),
    resultStatus: enumValue(body.resultStatus, OCR_RESULT_STATUSES, 'unknown'),
    detectedPlatform: enumValue(body.detectedPlatform, OCR_PLATFORM_BUCKETS, 'unknown'),
    fieldsDetected,
    occurredAt: now,
    expiresAt: new Date(now.getTime() + RETENTION_MS)
  };
}

exports.record = async (req, res) => {
  const payload = sanitizeOcrProductEvent(req.body);
  if (!payload) return res.status(400).json({ success: false, message: 'Invalid OCR event.' });
  try {
    await OcrProductEvent.create(payload);
    return res.status(202).json({ success: true });
  } catch (_error) {
    return res.status(503).json({ success: false, message: 'Event not recorded.' });
  }
};

exports.RETENTION_MS = RETENTION_MS;
exports.sanitizeOcrProductEvent = sanitizeOcrProductEvent;
