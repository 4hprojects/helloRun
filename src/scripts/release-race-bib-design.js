'use strict';

require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });
const mongoose = require('mongoose');
const Event = require('../models/Event');
const RaceBibDesign = require('../models/RaceBibDesign');
const { releaseDesign } = require('../services/race-bib-design.service');
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
  const version = Number(read('version'));
  if (!eventSlug || !Number.isInteger(version) || version < 1) throw new Error('--event-slug and a positive --version are required.');
  if (apply && read('confirm-event-slug') !== eventSlug) throw new Error('--apply requires matching --confirm-event-slug.');
  return { eventSlug, version, apply };
}

async function main() {
  const args = parseArgs();
  if (!process.env.MONGODB_URI || !process.env.DATABASE_URL) throw new Error('MONGODB_URI and DATABASE_URL are required.');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const event = await Event.findOne({ slug: args.eventSlug, isDeleted: { $ne: true } });
    if (!event) throw new Error('Event not found.');
    const design = await RaceBibDesign.findOne({ eventId: event._id, status: 'published', version: args.version });
    if (!design) throw new Error('Published design version not found.');
    const result = await releaseDesign(event, design, { apply: args.apply });
    console.log(JSON.stringify({ mode: args.apply ? 'apply' : 'dry-run', eventSlug: args.eventSlug, version: args.version, ...result }, null, 2));
    if (result.conflicts?.length) process.exitCode = 2;
  } finally {
    await Promise.all([mongoose.disconnect(), closePostgresClient()]);
  }
}

if (require.main === module) main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
module.exports = { parseArgs };
