#!/usr/bin/env node

require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const mongoose = require('mongoose');

const DAY_MS = 24 * 60 * 60 * 1000;
const AGE_BOUNDARIES_DAYS = [180, 730, 3650];

function countBy(records, field, fallback = '(unset)') {
  return records.reduce((counts, record) => {
    const value = String(record[field] ?? fallback);
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function getProofKey(record) {
  return String(record?.evidence?.proof?.key || record?.evidence?.paymentProof?.key || '').trim();
}

function laterDate(...values) {
  const dates = values
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => Number.isFinite(value.getTime()));
  return dates.length ? new Date(Math.max(...dates.map((value) => value.getTime()))) : null;
}

function ageBucket(anchor, now) {
  if (!anchor) return 'unknown';
  const days = Math.max(0, Math.floor((now.getTime() - anchor.getTime()) / DAY_MS));
  if (days <= AGE_BOUNDARIES_DAYS[0]) return '0-180_days';
  if (days <= AGE_BOUNDARIES_DAYS[1]) return '181-730_days';
  if (days <= AGE_BOUNDARIES_DAYS[2]) return '731-3650_days';
  return 'over_3650_days';
}

function buildRetentionInventory(decisions, events, users, now = new Date()) {
  const eventById = new Map(events.map((event) => [String(event._id), event]));
  const userIds = new Set(users.map((user) => String(user._id)));
  const proofKeys = new Set();
  const anchors = [];
  const eventLinks = { activeOrFuture: 0, ended: 0, missing: 0, unset: 0 };
  const runnerLinks = { present: 0, missing: 0, unset: 0 };

  for (const decision of decisions) {
    const proofKey = getProofKey(decision);
    if (proofKey) proofKeys.add(proofKey);

    const eventId = decision.eventId ? String(decision.eventId) : '';
    const event = eventId ? eventById.get(eventId) : null;
    if (!eventId) eventLinks.unset += 1;
    else if (!event) eventLinks.missing += 1;
    else if (event.eventEndAt && new Date(event.eventEndAt) <= now) eventLinks.ended += 1;
    else eventLinks.activeOrFuture += 1;

    const runnerId = decision.runnerId ? String(decision.runnerId) : '';
    if (!runnerId) runnerLinks.unset += 1;
    else if (userIds.has(runnerId)) runnerLinks.present += 1;
    else runnerLinks.missing += 1;

    anchors.push(laterDate(decision.decidedAt, decision.createdAt, event?.eventEndAt));
  }

  return {
    total: decisions.length,
    byKind: countBy(decisions, 'kind'),
    byDecision: countBy(decisions, 'decision'),
    retentionAnchorAge: countBy(anchors.map((anchor) => ({ bucket: ageBucket(anchor, now) })), 'bucket'),
    proofReferences: {
      decisionRows: decisions.filter((decision) => Boolean(getProofKey(decision))).length,
      uniqueObjectKeys: proofKeys.size
    },
    eventLinks,
    runnerLinks
  };
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  const ReviewDecision = require('../models/ReviewDecision');
  const Event = require('../models/Event');
  const User = require('../models/User');

  const decisions = await ReviewDecision.find({})
    .select('kind decision decidedAt createdAt eventId runnerId evidence.proof.key evidence.paymentProof.key')
    .lean();
  const eventIds = [...new Set(decisions.map((row) => String(row.eventId || '')).filter(Boolean))];
  const runnerIds = [...new Set(decisions.map((row) => String(row.runnerId || '')).filter(Boolean))];
  const [events, users] = await Promise.all([
    Event.find({ _id: { $in: eventIds } }).select('_id eventEndAt').lean(),
    User.find({ _id: { $in: runnerIds } }).select('_id').lean()
  ]);

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: 'read-only',
    policyStatus: 'legal-review-required',
    deletionCandidatesComputed: false,
    definitions: {
      retentionAnchor: 'Later of decision creation, decision time, or linked event end.',
      ageBands: 'Inventory only. They are not approved deletion deadlines.',
      proofReferences: 'Counts only. Object keys and personal data are never printed.'
    },
    inventory: buildRetentionInventory(decisions, events, users)
  }, null, 2));
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(`[Review evidence retention audit] ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
}

module.exports = { ageBucket, buildRetentionInventory, laterDate };
