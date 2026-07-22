'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

const Event = require('../models/Event');
const { formatPlatformDate } = require('../utils/platform-date');

const DATE_TEXT = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?\\s+\\d{1,2},\\s+\\d{4}';

function parseArguments(argv = process.argv.slice(2)) {
  const flags = new Set(argv);
  const unknown = argv.filter((arg) => !['--dry-run', '--apply'].includes(arg));
  if (unknown.length) throw new Error(`Unknown argument(s): ${unknown.join(', ')}`);
  if (flags.has('--dry-run') && flags.has('--apply')) {
    throw new Error('Choose either --dry-run or --apply, not both.');
  }
  return { mode: flags.has('--apply') ? 'apply' : 'dry-run' };
}

function normalizeDateLabel(value) {
  const match = String(value || '').trim().match(/^([A-Za-z]+)\.?\s+(\d{1,2}),\s+(\d{4})$/);
  if (!match) return '';
  const monthKey = match[1].slice(0, 3).toLowerCase();
  const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(monthKey);
  if (month < 0) return '';
  return `${match[3]}-${String(month + 1).padStart(2, '0')}-${String(Number(match[2])).padStart(2, '0')}`;
}

function replaceDateForField(text, field, expectedLabel, changes) {
  if (!expectedLabel) return text;
  const patterns = {
    registrationOpenAt: [`(Registration opens(?:\\s*:\\s*|\\s+))(${DATE_TEXT})`],
    registrationCloseAt: [`(Registration closes(?:\\s*:\\s*|\\s+))(${DATE_TEXT})`],
    eventStartAt: [`(Event starts(?:\\s*:\\s*|\\s+))(${DATE_TEXT})`],
    eventEndAt: [`(Event ends(?:\\s*:\\s*|\\s+))(${DATE_TEXT})`],
    finalSubmissionDeadlineAt: [
      `((?:Final submissions are due by|Final submission deadline)(?:\\s*:\\s*|\\s+))(${DATE_TEXT})`
    ]
  };
  return (patterns[field] || []).reduce((output, source) => output.replace(
    new RegExp(source, 'gi'),
    (full, prefix, currentLabel) => {
      if (normalizeDateLabel(currentLabel) === normalizeDateLabel(expectedLabel)) return full;
      changes.push({ field, from: currentLabel, to: expectedLabel });
      return `${prefix}${expectedLabel}`;
    }
  ), text);
}

function replaceDateRange(text, event, changes) {
  const startLabel = event.eventStartAt ? formatPlatformDate(event.eventStartAt) : '';
  const endLabel = event.eventEndAt ? formatPlatformDate(event.eventEndAt) : '';
  if (!startLabel || !endLabel) return text;
  const rangePatterns = [
    `(scheduled from\\s+)(${DATE_TEXT})(\\s+to\\s+)(${DATE_TEXT})`,
    `((?:activities|activity) (?:completed|recorded) from\\s+)(${DATE_TEXT})(\\s+to\\s+)(${DATE_TEXT})`
  ];
  return rangePatterns.reduce((output, source) => output.replace(
    new RegExp(source, 'gi'),
    (full, prefix, currentStart, separator, currentEnd) => {
      const startMatches = normalizeDateLabel(currentStart) === normalizeDateLabel(startLabel);
      const endMatches = normalizeDateLabel(currentEnd) === normalizeDateLabel(endLabel);
      if (startMatches && endMatches) return full;
      if (!startMatches) changes.push({ field: 'eventStartAt', from: currentStart, to: startLabel });
      if (!endMatches) changes.push({ field: 'eventEndAt', from: currentEnd, to: endLabel });
      return `${prefix}${startLabel}${separator}${endLabel}`;
    }
  ), text);
}

function reconcileEventText(event, value) {
  let output = String(value || '');
  const changes = [];
  for (const field of [
    'registrationOpenAt',
    'registrationCloseAt',
    'eventStartAt',
    'eventEndAt',
    'finalSubmissionDeadlineAt'
  ]) {
    const expectedLabel = event[field] ? formatPlatformDate(event[field]) : '';
    output = replaceDateForField(output, field, expectedLabel, changes);
  }
  output = replaceDateRange(output, event, changes);
  return { value: output, changes };
}

async function run({ mode = 'dry-run' } = {}) {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const events = await Event.find({ status: 'published', isDeleted: { $ne: true } })
      .select('_id slug description eventDetailsMarkdown registrationOpenAt registrationCloseAt eventStartAt eventEndAt finalSubmissionDeadlineAt')
      .lean();
    const results = [];
    for (const event of events) {
      const description = reconcileEventText(event, event.description);
      const details = reconcileEventText(event, event.eventDetailsMarkdown);
      if (!description.changes.length && !details.changes.length) continue;
      results.push({
        slug: event.slug,
        descriptionChanges: description.changes,
        eventDetailsChanges: details.changes
      });
      if (mode === 'apply') {
        await Event.updateOne(
          { _id: event._id, status: 'published', isDeleted: { $ne: true } },
          { $set: { description: description.value, eventDetailsMarkdown: details.value } }
        );
      }
    }
    return { mode, publishedEvents: events.length, changedEvents: results.length, results };
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  let options;
  try {
    options = parseArguments();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  run(options)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { normalizeDateLabel, parseArguments, reconcileEventText, run };
