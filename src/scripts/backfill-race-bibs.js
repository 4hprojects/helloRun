'use strict';

require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { evaluateBibEligibility } = require('../services/race-bib-eligibility.service');
const { getBibAssignmentsForRegistrations, issueVirtualBib } = require('../services/race-bib-assignment.service');
const { closePostgresClient } = require('../db/postgres');

function parseArgs(argv = process.argv.slice(2)) {
  const read = (name) => {
    const inline = argv.find((arg) => arg.startsWith(`--${name}=`));
    if (inline) return inline.slice(name.length + 3);
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : '';
  };
  const apply = argv.includes('--apply');
  if (apply && argv.includes('--dry-run')) throw new Error('Choose --dry-run or --apply, not both.');
  const eventSlug = read('event-slug');
  const batchSize = Math.min(500, Math.max(1, Number(read('batch-size') || 100)));
  if (!eventSlug) throw new Error('--event-slug is required.');
  if (apply && read('confirm-event-slug') !== eventSlug) throw new Error('--apply requires matching --confirm-event-slug.');
  return { eventSlug, batchSize, apply };
}

async function backfill({ event, apply, batchSize }) {
  const report = { scanned: 0, eligible: 0, existing: 0, prospective: 0, issued: 0, skipped: {}, failures: [] };
  let lastId = null;
  while (true) {
    const query = { eventId: event._id, participationMode: 'virtual', ...(lastId ? { _id: { $gt: lastId } } : {}) };
    // eslint-disable-next-line no-await-in-loop
    const batch = await Registration.find(query).sort({ _id: 1 }).limit(batchSize).lean();
    if (!batch.length) break;
    // eslint-disable-next-line no-await-in-loop
    const existing = await getBibAssignmentsForRegistrations(batch.map((registration) => registration._id));
    for (const registration of batch) {
      report.scanned += 1;
      const eligibility = evaluateBibEligibility(event, registration);
      if (!eligibility.eligible) {
        report.skipped[eligibility.reason] = (report.skipped[eligibility.reason] || 0) + 1;
        continue;
      }
      report.eligible += 1;
      if (existing.has(String(registration._id))) { report.existing += 1; continue; }
      report.prospective += 1;
      if (!apply) continue;
      try {
        // eslint-disable-next-line no-await-in-loop
        const outcome = await issueVirtualBib(registration._id, { event, registration });
        if (outcome.issued) report.issued += 1;
      } catch (error) {
        report.failures.push({ registrationId: String(registration._id), error: error.message });
      }
    }
    lastId = batch[batch.length - 1]._id;
  }
  return report;
}

async function main() {
  const args = parseArgs();
  if (!process.env.MONGODB_URI || !process.env.DATABASE_URL) throw new Error('MONGODB_URI and DATABASE_URL are required.');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const event = await Event.findOne({ slug: args.eventSlug, isDeleted: { $ne: true } }).lean();
    if (!event) throw new Error('Event not found.');
    const report = await backfill({ event, apply: args.apply, batchSize: args.batchSize });
    console.log(JSON.stringify({ mode: args.apply ? 'apply' : 'dry-run', eventSlug: args.eventSlug, batchSize: args.batchSize, ...report }, null, 2));
    if (report.failures.length) process.exitCode = 2;
  } finally {
    await Promise.all([mongoose.disconnect(), closePostgresClient()]);
  }
}

if (require.main === module) main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
module.exports = { parseArgs, backfill };
