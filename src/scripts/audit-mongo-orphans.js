#!/usr/bin/env node

require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const mongoose = require('mongoose');

const MAX_TIME_MS = 60_000;

function sumFlag(expression) {
  return { $sum: { $cond: [expression, 1, 0] } };
}

async function auditRegistrations(Registration) {
  const [counts = {}] = await Registration.aggregate([
    {
      $lookup: {
        from: 'events',
        localField: 'eventId',
        foreignField: '_id',
        as: '_auditEvent'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: '_auditUser'
      }
    },
    {
      $set: {
        _auditEventMissing: { $eq: [{ $size: '$_auditEvent' }, 0] },
        _auditEventSoftDeleted: {
          $eq: [{ $ifNull: [{ $arrayElemAt: ['$_auditEvent.isDeleted', 0] }, false] }, true]
        },
        _auditAccountUserMissing: {
          $and: [
            { $ne: ['$participantType', 'guest'] },
            {
              $or: [
                { $eq: [{ $ifNull: ['$userId', null] }, null] },
                { $eq: [{ $size: '$_auditUser' }, 0] }
              ]
            }
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        onsiteTotal: sumFlag({ $eq: ['$participationMode', 'onsite'] }),
        missingEvent: sumFlag('$_auditEventMissing'),
        softDeletedEvent: sumFlag('$_auditEventSoftDeleted'),
        unavailableEvent: sumFlag({
          $or: ['$_auditEventMissing', '$_auditEventSoftDeleted']
        }),
        missingAccountUser: sumFlag('$_auditAccountUserMissing'),
        onsiteMissingEvent: sumFlag({
          $and: [{ $eq: ['$participationMode', 'onsite'] }, '$_auditEventMissing']
        }),
        onsiteSoftDeletedEvent: sumFlag({
          $and: [{ $eq: ['$participationMode', 'onsite'] }, '$_auditEventSoftDeleted']
        }),
        onsiteUnavailableEvent: sumFlag({
          $and: [
            { $eq: ['$participationMode', 'onsite'] },
            { $or: ['$_auditEventMissing', '$_auditEventSoftDeleted'] }
          ]
        })
      }
    },
    { $project: { _id: 0 } }
  ]).option({ maxTimeMS: MAX_TIME_MS });

  return counts;
}

async function auditSubmissions(Model) {
  const [counts = {}] = await Model.aggregate([
    {
      $lookup: {
        from: 'events',
        localField: 'eventId',
        foreignField: '_id',
        as: '_auditEvent'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'runnerId',
        foreignField: '_id',
        as: '_auditUser'
      }
    },
    {
      $lookup: {
        from: 'registrations',
        localField: 'registrationId',
        foreignField: '_id',
        as: '_auditRegistration'
      }
    },
    {
      $set: {
        _auditEventMissing: { $eq: [{ $size: '$_auditEvent' }, 0] },
        _auditEventSoftDeleted: {
          $eq: [{ $ifNull: [{ $arrayElemAt: ['$_auditEvent.isDeleted', 0] }, false] }, true]
        },
        _auditRunnerMissing: {
          $and: [
            { $ne: [{ $ifNull: ['$runnerId', null] }, null] },
            { $eq: [{ $size: '$_auditUser' }, 0] }
          ]
        },
        _auditRegistrationMissing: { $eq: [{ $size: '$_auditRegistration' }, 0] }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        missingEvent: sumFlag('$_auditEventMissing'),
        softDeletedEvent: sumFlag('$_auditEventSoftDeleted'),
        missingRunner: sumFlag('$_auditRunnerMissing'),
        missingRegistration: sumFlag('$_auditRegistrationMissing'),
        missingRunnerOrEvent: sumFlag({
          $or: ['$_auditRunnerMissing', '$_auditEventMissing']
        }),
        unavailableRunnerOrEvent: sumFlag({
          $or: ['$_auditRunnerMissing', '$_auditEventMissing', '$_auditEventSoftDeleted']
        }),
        anyBrokenReference: sumFlag({
          $or: [
            '$_auditRunnerMissing',
            '$_auditEventMissing',
            '$_auditEventSoftDeleted',
            '$_auditRegistrationMissing'
          ]
        })
      }
    },
    { $project: { _id: 0 } }
  ]).option({ maxTimeMS: MAX_TIME_MS });

  return counts;
}

function combineSubmissionCounts(counts) {
  return counts.reduce((combined, current) => {
    for (const [key, value] of Object.entries(current)) {
      combined[key] = (combined[key] || 0) + Number(value || 0);
    }
    return combined;
  }, {});
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000
  });

  const Registration = require('../models/Registration');
  const Submission = require('../models/Submission');
  const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');

  const [registrations, singleActivity, accumulatedActivity] = await Promise.all([
    auditRegistrations(Registration),
    auditSubmissions(Submission),
    auditSubmissions(AccumulatedActivitySubmission)
  ]);

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'read-only',
    definitions: {
      missing: 'Referenced ObjectId is null where required or has no matching MongoDB document.',
      softDeletedEvent: 'The referenced Event exists and has isDeleted=true.',
      unavailableEvent: 'The referenced Event is either missing or soft-deleted.',
      anyBrokenReference: 'A submission has an unavailable event, missing non-null runner, or missing registration.'
    },
    registrations,
    submissions: {
      singleActivity,
      accumulatedActivity,
      combined: combineSubmissionCounts([singleActivity, accumulatedActivity])
    }
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(`[Mongo orphan audit] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
