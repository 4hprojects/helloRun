const CommunicationLog = require('../models/CommunicationLog');

async function recordCommunicationLog(input = {}) {
  return CommunicationLog.create({
    eventKey: String(input.eventKey || '').trim() || 'unknown',
    channel: input.channel || 'email',
    recipientUserId: input.recipientUserId || null,
    recipientEmail: String(input.recipientEmail || '').trim().toLowerCase(),
    subject: String(input.subject || '').trim().slice(0, 300),
    status: input.status || 'skipped',
    statusReason: String(input.statusReason || '').trim().slice(0, 1000),
    provider: String(input.provider || 'resend').trim(),
    providerMessageId: String(input.providerMessageId || '').trim(),
    priority: String(input.priority || 'low').trim(),
    quotaCounted: Boolean(input.quotaCounted),
    isTest: Boolean(input.isTest),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
    sentAt: input.sentAt || null
  });
}

module.exports = {
  recordCommunicationLog
};
