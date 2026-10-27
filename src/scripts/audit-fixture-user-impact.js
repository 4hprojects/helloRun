#!/usr/bin/env node

require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const mongoose = require('mongoose');
const { getPostgresClient, closePostgresClient } = require('../db/postgres');
const {
  POSTGRES_APP_USER_ACTOR_COLUMNS,
  POSTGRES_APP_USER_OWNERSHIP_COLUMNS
} = require('../services/test-user-cleanup.service');
const { POSTGRES_EVENT_TABLES } = require('../services/test-data-cleanup.service');

const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const ReviewDecision = require('../models/ReviewDecision');
const GuestRegistrationToken = require('../models/GuestRegistrationToken');
const WaitlistEntry = require('../models/WaitlistEntry');
const RegistrationTransfer = require('../models/RegistrationTransfer');
const BibQrToken = require('../models/BibQrToken');
const EventCoOrganizer = require('../models/EventCoOrganizer');
const CertificateTemplate = require('../models/CertificateTemplate');
const Blog = require('../models/Blog');

const FIXTURE_QUERY = { email: /@example\.com$/i, role: { $ne: 'admin' } };
const MONGO_ONLY = process.argv.includes('--mongo-only');

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function countBy(records, key, fallback = '(unset)') {
  return records.reduce((counts, record) => {
    const value = String(record[key] ?? fallback);
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function classifyOwners(records, field, fixtureIds) {
  const result = { fixture: 0, nonFixture: 0, null: 0 };
  const nonFixtureIds = new Set();
  for (const record of records) {
    const value = record[field];
    if (!value) {
      result.null += 1;
    } else if (fixtureIds.has(String(value))) {
      result.fixture += 1;
    } else {
      result.nonFixture += 1;
      nonFixtureIds.add(String(value));
    }
  }
  return { counts: result, nonFixtureIds };
}

function countEventAssetReferences(events) {
  const singleFields = ['bannerImageUrl', 'logoUrl', 'badgeImageUrl', 'posterImageUrl'];
  let references = 0;
  for (const event of events) {
    references += singleFields.filter((field) => String(event[field] || '').trim()).length;
    references += Array.isArray(event.galleryImageUrls)
      ? event.galleryImageUrls.filter((value) => String(value || '').trim()).length
      : 0;
  }
  return references;
}

function countTemplateAssetReferences(templates) {
  const singleFields = [
    'backgroundImageUrl', 'backgroundImageKey', 'organizerLogoUrl', 'organizerLogoKey',
    'eventLogoUrl', 'eventLogoKey', 'eventArtworkUrl', 'eventArtworkKey',
    'signatureImageUrl', 'signatureImageKey'
  ];
  let references = 0;
  for (const template of templates) {
    const assets = template.assets || {};
    references += singleFields.filter((field) => String(assets[field] || '').trim()).length;
    for (const field of ['sponsorLogoUrls', 'sponsorLogoKeys']) {
      references += Array.isArray(assets[field])
        ? assets[field].filter((value) => String(value || '').trim()).length
        : 0;
    }
  }
  return references;
}

async function safeCount(sql, query, values) {
  try {
    const [row] = await sql.unsafe(query, values);
    return Number(row.count || 0);
  } catch (error) {
    if (['42P01', '42703'].includes(String(error.code || ''))) return null;
    throw error;
  }
}

async function postgresImpact(mongoUserIds, mongoEventIds) {
  const sql = getPostgresClient();
  const appUsers = await sql.unsafe(
    'select id from app_users where mongo_user_id = any($1)',
    [mongoUserIds]
  );
  const eventCores = await sql.unsafe(
    'select id from events_core where mongo_event_id = any($1)',
    [mongoEventIds]
  );
  const appUserIds = appUsers.map((row) => row.id);
  const eventCoreIds = eventCores.map((row) => row.id);

  const eventRows = {};
  for (const { table, column, viaEventCoreId } of POSTGRES_EVENT_TABLES) {
    const ids = viaEventCoreId ? eventCoreIds : mongoEventIds;
    eventRows[`${table}.${column}`] = ids.length
      ? await safeCount(
          sql,
          `select count(*)::int as count from ${quoteIdentifier(table)} where ${quoteIdentifier(column)} = any($1)`,
          [ids]
        )
      : 0;
  }

  const userOwnedRows = {};
  for (const { table, column } of POSTGRES_APP_USER_OWNERSHIP_COLUMNS) {
    userOwnedRows[`${table}.${column}`] = appUserIds.length
      ? await safeCount(
          sql,
          `select count(*)::int as count from ${quoteIdentifier(table)} where ${quoteIdentifier(column)} = any($1)`,
          [appUserIds]
        )
      : 0;
  }

  const actorRows = {};
  for (const { table, column } of POSTGRES_APP_USER_ACTOR_COLUMNS) {
    actorRows[`${table}.${column}`] = appUserIds.length
      ? await safeCount(
          sql,
          `select count(*)::int as count from ${quoteIdentifier(table)} where ${quoteIdentifier(column)} = any($1)`,
          [appUserIds]
        )
      : 0;
  }

  return {
    appUserShadows: appUserIds.length,
    eventCoreShadows: eventCoreIds.length,
    eventRows,
    userOwnedRows,
    actorRows
  };
}

async function main() {
  if (!process.env.MONGODB_URI || (!MONGO_ONLY && !process.env.DATABASE_URL)) {
    throw new Error(MONGO_ONLY ? 'MONGODB_URI is required' : 'MONGODB_URI and DATABASE_URL are required');
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });

  const fixtureUsers = await User.find(FIXTURE_QUERY).select('_id role isSmokeTest').lean();
  const fixtureIds = new Set(fixtureUsers.map((user) => String(user._id)));
  const fixtureObjectIds = fixtureUsers.map((user) => user._id);
  const events = await Event.find({ organizerId: { $in: fixtureObjectIds } })
    .select('_id status isDeleted isTestData bannerImageUrl logoUrl badgeImageUrl posterImageUrl galleryImageUrls')
    .lean();
  const eventObjectIds = events.map((event) => event._id);

  const [registrations, directRegistrations, submissions, accumulated, templates, blogs] = await Promise.all([
    Registration.find({ eventId: { $in: eventObjectIds } }).select('userId participantType').lean(),
    Registration.find({ userId: { $in: fixtureObjectIds } }).select('eventId').lean(),
    Submission.find({ eventId: { $in: eventObjectIds } }).select('runnerId').lean(),
    AccumulatedActivitySubmission.find({ eventId: { $in: eventObjectIds } }).select('runnerId').lean(),
    CertificateTemplate.find({
      $or: [
        { eventId: { $in: eventObjectIds } },
        { organizerId: { $in: fixtureObjectIds } }
      ]
    }).select('assets').lean(),
    Blog.find({ authorId: { $in: fixtureObjectIds } }).select('status isDeleted coverImageUrl galleryImageUrls').lean()
  ]);

  const registrationOwners = classifyOwners(registrations, 'userId', fixtureIds);
  const submissionOwners = classifyOwners(submissions, 'runnerId', fixtureIds);
  const accumulatedOwners = classifyOwners(accumulated, 'runnerId', fixtureIds);
  const nonFixtureParticipantIds = new Set([
    ...registrationOwners.nonFixtureIds,
    ...submissionOwners.nonFixtureIds,
    ...accumulatedOwners.nonFixtureIds
  ]);
  const existingNonFixtureParticipants = nonFixtureParticipantIds.size
    ? await User.countDocuments({ _id: { $in: Array.from(nonFixtureParticipantIds) } })
    : 0;
  const fixtureEventIds = new Set(events.map((event) => String(event._id)));
  const outsideEventIds = Array.from(new Set(
    directRegistrations
      .map((registration) => String(registration.eventId || ''))
      .filter((eventId) => eventId && !fixtureEventIds.has(eventId))
  ));
  const outsideEvents = outsideEventIds.length
    ? await Event.find({ _id: { $in: outsideEventIds } }).select('status isDeleted isTestData').lean()
    : [];

  const eventScopedCounts = await Promise.all([
    ReviewDecision.countDocuments({ eventId: { $in: eventObjectIds } }),
    GuestRegistrationToken.countDocuments({ eventId: { $in: eventObjectIds } }),
    WaitlistEntry.countDocuments({ eventId: { $in: eventObjectIds } }),
    RegistrationTransfer.countDocuments({ eventId: { $in: eventObjectIds } }),
    BibQrToken.countDocuments({ eventId: { $in: eventObjectIds } }),
    EventCoOrganizer.countDocuments({ eventId: { $in: eventObjectIds } })
  ]);

  const blogAssetReferences = blogs.reduce((count, blog) => (
    count
      + (String(blog.coverImageUrl || '').trim() ? 1 : 0)
      + (blog.galleryImageUrls || []).filter((value) => String(value || '').trim()).length
  ), 0);

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'read-only',
    scope: 'Active non-admin MongoDB users whose email ends in the reserved example.com domain.',
    users: {
      total: fixtureUsers.length,
      roles: countBy(fixtureUsers, 'role'),
      markedSmokeTest: fixtureUsers.filter((user) => user.isSmokeTest === true).length
    },
    organizedEvents: {
      total: events.length,
      statuses: countBy(events, 'status'),
      softDeleted: events.filter((event) => event.isDeleted === true).length,
      markedTestData: events.filter((event) => event.isTestData === true).length,
      assetReferences: countEventAssetReferences(events)
    },
    participantImpactOnOrganizedEvents: {
      registrations: { total: registrations.length, ...registrationOwners.counts },
      singleActivitySubmissions: { total: submissions.length, ...submissionOwners.counts },
      accumulatedActivitySubmissions: { total: accumulated.length, ...accumulatedOwners.counts },
      distinctNonFixtureParticipantIds: nonFixtureParticipantIds.size,
      existingNonFixtureParticipantUsers: existingNonFixtureParticipants
    },
    fixtureUserRegistrations: {
      total: directRegistrations.length,
      onFixtureOrganizedEvents: directRegistrations.filter((registration) => (
        fixtureEventIds.has(String(registration.eventId || ''))
      )).length,
      outsideFixtureOrganizedEvents: directRegistrations.length - directRegistrations.filter((registration) => (
        fixtureEventIds.has(String(registration.eventId || ''))
      )).length,
      outsideEventDocumentsFound: outsideEvents.length,
      outsideEventStatuses: countBy(outsideEvents, 'status'),
      outsideEventsSoftDeleted: outsideEvents.filter((event) => event.isDeleted === true).length,
      outsideEventsMarkedTestData: outsideEvents.filter((event) => event.isTestData === true).length
    },
    eventScopedMongoRecords: {
      reviewDecisions: eventScopedCounts[0],
      guestRegistrationTokens: eventScopedCounts[1],
      waitlistEntries: eventScopedCounts[2],
      registrationTransfers: eventScopedCounts[3],
      bibQrTokens: eventScopedCounts[4],
      coOrganizers: eventScopedCounts[5],
      certificateTemplates: templates.length
    },
    authoredBlogs: {
      total: blogs.length,
      statuses: countBy(blogs, 'status'),
      softDeleted: blogs.filter((blog) => blog.isDeleted === true).length,
      assetReferences: blogAssetReferences
    },
    certificateTemplateAssetReferences: countTemplateAssetReferences(templates),
    postgres: MONGO_ONLY
      ? { status: 'not_checked', reason: 'Mongo-only mode does not satisfy the DEC-07 cross-store gate.' }
      : await postgresImpact(
          fixtureUsers.map((user) => String(user._id)),
          events.map((event) => String(event._id))
        ),
    caveat: 'Asset references are counts from MongoDB fields; this audit does not list or delete R2 objects.'
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(`[Fixture impact audit] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    await closePostgresClient();
  });
