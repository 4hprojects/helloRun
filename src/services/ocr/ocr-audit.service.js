'use strict';

const OcrAuditEvent = require('../../models/OcrAuditEvent');
const { recordCriticalAuditEventInBackground } = require('../critical-audit.service');
const { getClientIp } = require('../../utils/client-ip');

function requestContext(req) {
  if (!req) return { actorId: null, ipAddress: '', userAgent: '' };
  return {
    actorId: req.session?.userId || null,
    ipAddress: getClientIp(req).slice(0, 64),
    userAgent: String(req.get?.('user-agent') || '').slice(0, 300)
  };
}

/**
 * Record one OCR administration action. Awaited: callers should treat a failure
 * as a failure of the action itself for destructive operations.
 */
async function recordOcrAudit({ action, targetType, targetId = '', statusFrom = '', statusTo = '', reason = '', details = {}, req = null, actorId }) {
  const context = requestContext(req);
  const row = await OcrAuditEvent.create({
    action,
    actorId: actorId !== undefined ? actorId : context.actorId,
    targetType,
    targetId: String(targetId || ''),
    statusFrom,
    statusTo,
    reason: String(reason || '').slice(0, 500),
    details,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
  recordCriticalAuditEventInBackground({
    actorMongoUserId: String(row.actorId || ''),
    action,
    targetType,
    targetId: String(targetId || ''),
    statusFrom,
    statusTo,
    notes: String(reason || '').slice(0, 500),
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    occurredAt: row.createdAt
  });
  return row;
}

async function listOcrAudit({ limit = 50, targetType = '' } = {}) {
  const query = targetType ? { targetType } : {};
  return OcrAuditEvent.find(query).sort({ createdAt: -1 }).limit(Math.min(200, Math.max(1, Number(limit) || 50))).lean();
}

module.exports = { recordOcrAudit, listOcrAudit };
