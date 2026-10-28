const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Event = require('../src/models/Event');
const ActiveQuestSeries = require('../src/models/ActiveQuestSeries');
const ActiveQuestTemplateVersion = require('../src/models/ActiveQuestTemplateVersion');
const { renderEventDetailsContent } = require('../src/utils/event-public-view');
const {
  buildBaselineSeriesInput,
  buildBaselineTemplateInput,
  buildFrozenTemplateSnapshot
} = require('../src/services/active-quest-foundation.service');
const { buildActiveQuestSchedule } = require('../src/services/active-quest-schedule.service');
const {
  assertEditorialIntegrity,
  buildActiveQuestContent
} = require('../src/services/active-quest-content.service');
const {
  buildActiveQuestEventPayload,
  generateActiveQuestEdition,
  getRewardReadiness
} = require('../src/services/active-quest-generator.service');

const ACTOR_ID = new mongoose.Types.ObjectId();
const ORGANIZER_ID = new mongoose.Types.ObjectId();
const SERIES_ID = new mongoose.Types.ObjectId();
const TEMPLATE_ID = new mongoose.Types.ObjectId();

function actor() {
  return { _id: ACTOR_ID, role: 'admin', adminTier: 'full' };
}

function foundation({ readyRewards = false, contentBlocks = [] } = {}) {
  const series = new ActiveQuestSeries(buildBaselineSeriesInput({ organizerId: ORGANIZER_ID, actorId: ACTOR_ID }));
  series._id = SERIES_ID;
  series.featureFlags.activeQuestSeriesEnabled = true;
  series.featureFlags.activeQuestDraftGenerationEnabled = true;
  const input = buildBaselineTemplateInput({ seriesId: SERIES_ID, actorId: ACTOR_ID });
  if (readyRewards) {
    input.categories = input.categories.map((category) => ({
      ...category,
      badgeAssetUrl: `https://cdn.example.com/${category.key}.png`
    }));
    input.rewardRequirements.certificateTemplate = {
      name: 'Active Quest Certificate',
      content: {
        heading: 'Certificate of Completion',
        bodyText: 'Completed {{goalDistance}} at {{eventTitle}} with {{verifiedDistance}} verified.'
      },
      displayOptions: { showCertificateNumber: true, showQrCode: true },
      styleOptions: { primaryColor: '#0F172A', accentColor: '#FA9A4B' }
    };
  }
  input.contentBlocks = contentBlocks;
  const template = new ActiveQuestTemplateVersion({
    ...input,
    _id: TEMPLATE_ID,
    status: 'published',
    frozen: true,
    effectiveAt: new Date('2026-10-28T00:00:00.000Z'),
    publishedAt: new Date('2026-10-28T00:00:00.000Z'),
    publishedBy: ACTOR_ID
  });
  series.currentTemplateVersionId = template._id;
  return { series, template, snapshot: buildFrozenTemplateSnapshot(template) };
}

test('November 2026 schedule uses exact PHT half-open boundaries', () => {
  const schedule = buildActiveQuestSchedule({ year: 2026, month: 11 });
  assert.equal(schedule.timezone, 'Asia/Manila');
  assert.equal(schedule.boundaryMode, 'half_open');
  assert.equal(schedule.local.activityStart, '2026-11-01');
  assert.equal(schedule.local.activityEndExclusive, '2026-12-01');
  assert.equal(schedule.local.registrationOpen, '2026-10-25');
  assert.equal(schedule.local.registrationEndExclusive, '2026-11-23');
  assert.equal(schedule.local.submissionEndExclusive, '2026-12-15');
  assert.equal(schedule.local.reviewTarget, '2026-12-17');
  assert.equal(schedule.local.rewardReleaseTarget, '2026-12-18');
  assert.equal(schedule.instants.activityStart.toISOString(), '2026-10-31T16:00:00.000Z');
  assert.equal(schedule.instants.submissionEndExclusive.toISOString(), '2026-12-14T16:00:00.000Z');
});

test('registration and proof windows accept final days and reject following midnights', () => {
  const schedule = buildActiveQuestSchedule({ year: 2026, month: 11 });
  const registrationOpen = schedule.instants.registrationOpen.getTime();
  const registrationEnd = schedule.instants.registrationEndExclusive.getTime();
  const submissionEnd = schedule.instants.submissionEndExclusive.getTime();
  const isRegistrationOpen = (instant) => instant.getTime() >= registrationOpen && instant.getTime() < registrationEnd;
  const isProofOpen = (instant) => instant.getTime() < submissionEnd;

  assert.equal(isRegistrationOpen(new Date('2026-11-22T15:59:59.999Z')), true);
  assert.equal(isRegistrationOpen(new Date('2026-11-22T16:00:00.000Z')), false);
  assert.equal(isProofOpen(new Date('2026-12-14T15:59:59.999Z')), true);
  assert.equal(isProofOpen(new Date('2026-12-14T16:00:00.000Z')), false);
});

test('schedule handles 28, 29, 30, and 31-day months plus year rollover', () => {
  const cases = [
    [2027, 2, '2027-03-01'],
    [2028, 2, '2028-03-01'],
    [2026, 4, '2026-05-01'],
    [2026, 7, '2026-08-01'],
    [2026, 12, '2027-01-01']
  ];
  for (const [year, month, expectedEnd] of cases) {
    assert.equal(buildActiveQuestSchedule({ year, month }).local.activityEndExclusive, expectedEnd);
  }
  assert.equal(buildActiveQuestSchedule({ year: 2028, month: 2 }).display.activityEndInclusive, 'February 29, 2028');
  assert.equal(buildActiveQuestSchedule({ year: 2026, month: 12 }).local.submissionEndExclusive, '2027-01-15');
});

test('schedule rejects invalid months and updates all registration displays from configuration', () => {
  assert.throws(() => buildActiveQuestSchedule({ year: 2026, month: 0 }), /month must be an integer/i);
  assert.throws(() => buildActiveQuestSchedule({ year: 2026, month: 13 }), /month must be an integer/i);
  const schedule = buildActiveQuestSchedule({
    year: 2026,
    month: 11,
    scheduleDefaults: { registrationLeadDays: 5, registrationCloseDay: 20, proofCloseDayNextMonth: 12 }
  });
  assert.equal(schedule.local.registrationOpen, '2026-10-27');
  assert.equal(schedule.local.registrationEndExclusive, '2026-11-21');
  assert.equal(schedule.display.registrationEndInclusive, 'November 20, 2026');
  assert.equal(schedule.display.submissionEndInclusive, 'December 12, 2026');
});

test('structured content renders exact categories, dates, privacy, evidence, and review rules', () => {
  const { snapshot } = foundation();
  const schedule = buildActiveQuestSchedule({ year: 2026, month: 11 });
  const content = buildActiveQuestContent({
    monthName: 'November',
    year: 2026,
    templateSnapshot: snapshot,
    schedule,
    rewardReadiness: getRewardReadiness(snapshot)
  });

  for (const heading of [
    'About the Challenge', 'Choose Your Quest', 'How to Join', 'Eligible Activities',
    'How Proof Works', 'Valid Activity Rules', 'Leaderboard and Privacy',
    'Digital Rewards', 'Dates and Deadlines', 'FAQ'
  ]) assert.match(content.markdown, new RegExp(`## ${heading}`));
  for (const target of [25, 50, 75, 100, 150, 200]) assert.match(content.markdown, new RegExp(`\\b${target}K`));
  assert.match(content.markdown, /November 1, 2026/);
  assert.match(content.markdown, /December 14, 2026/);
  assert.match(content.markdown, /inaccessible URL is marked unverified/i);
  assert.match(content.markdown, /approved distance only/i);
  assert.match(content.markdown, /leaderboard privacy preference/i);
  assert.match(content.markdown, /rewards remain disabled/i);
});

test('admin editorial HTML is sanitized and literal deadline dates are blocked', () => {
  const safeFoundation = foundation({
    contentBlocks: [{ key: 'summary', markdown: '<script>alert(1)</script><b>Move safely.</b>', displayOrder: 1 }]
  });
  const schedule = buildActiveQuestSchedule({ year: 2026, month: 11 });
  const content = buildActiveQuestContent({
    monthName: 'November',
    year: 2026,
    templateSnapshot: safeFoundation.snapshot,
    schedule,
    rewardReadiness: getRewardReadiness(safeFoundation.snapshot)
  });
  assert.doesNotMatch(content.description, /script|<b>|alert\(/i);
  assert.doesNotMatch(renderEventDetailsContent(content.markdown), /<script|<img/i);

  const conflicting = { ...safeFoundation.snapshot, rulesText: 'Proof closes on December 13, 2026.' };
  assert.throws(() => assertEditorialIntegrity(conflicting), /literal monthly deadline dates/i);
});

test('reward claims appear only when all category assets and certificate mapping are ready', () => {
  const { snapshot } = foundation({ readyRewards: true });
  const content = buildActiveQuestContent({
    monthName: 'November',
    year: 2026,
    templateSnapshot: snapshot,
    schedule: buildActiveQuestSchedule({ year: 2026, month: 11 }),
    rewardReadiness: getRewardReadiness(snapshot)
  });
  assert.match(content.markdown, /eligible finishers earn a category-specific digital badge and a digital completion certificate/i);
});

test('generated event payload is a private draft with frozen provenance and existing workflow settings', async () => {
  const { series, template, snapshot } = foundation();
  const schedule = buildActiveQuestSchedule({ year: 2026, month: 11 });
  const content = buildActiveQuestContent({
    monthName: 'November', year: 2026, templateSnapshot: snapshot, schedule,
    rewardReadiness: getRewardReadiness(snapshot)
  });
  const provenance = {
    seriesKey: 'active-quest',
    seriesYear: 2026,
    seriesMonth: 11,
    seriesTemplateVersionId: template._id,
    generatedFromKey: 'active-quest:2026-11:v1',
    seriesSnapshot: snapshot,
    seriesGeneratedAt: new Date('2026-10-28T08:00:00.000Z'),
    seriesGeneratedBy: ACTOR_ID
  };
  const event = new Event(buildActiveQuestEventPayload({
    series, year: 2026, month: 11, monthName: 'November', slug: 'november-active-quest-2026',
    schedule, provenance, content, rewardReadiness: getRewardReadiness(snapshot)
  }));
  await event.validate();

  assert.equal(event.status, 'draft');
  assert.equal(event.publicListingAvailableAt, null);
  assert.equal(event.autoEmailPromotionEnabled, false);
  assert.equal(event.title, 'November Active Quest 2026');
  assert.equal(event.slug, 'november-active-quest-2026');
  assert.equal(event.virtualCompletionMode, 'accumulated_distance');
  assert.equal(event.requireActivityScreenshot, true);
  assert.equal(event.minimumActivityDistanceKm, 1);
  assert.deepEqual(event.raceCategories.map((category) => category.distanceKm), [25, 50, 75, 100, 150, 200]);
  assert.equal(event.registrationCloseAt.toISOString(), '2026-11-22T15:59:59.999Z');
  assert.equal(event.eventEndAt.toISOString(), '2026-11-30T15:59:59.999Z');
  assert.equal(event.finalSubmissionDeadlineAt.toISOString(), '2026-12-14T15:59:59.999Z');
  assert.equal(event.seriesSchedule.instants.activityEndExclusive, '2026-11-30T16:00:00.000Z');
  assert.equal(event.digitalBadgeEnabled, false);
  assert.equal(event.digitalCertificateEnabled, false);
});

test('generator returns an existing edition without overwriting manual edits', async () => {
  const { series, template } = foundation();
  const existing = {
    _id: new mongoose.Types.ObjectId(),
    seriesKey: 'active-quest', seriesYear: 2026, seriesMonth: 11,
    title: 'Manually edited title', status: 'draft', seriesSnapshot: { version: 1 }
  };
  const dependencies = fakeDependencies({ series, template, rows: [existing] });
  const result = await generateActiveQuestEdition({
    seriesKey: 'active-quest', year: 2026, month: 11, requestedBy: actor()
  }, dependencies);
  assert.equal(result.created, false);
  assert.equal(existing.title, 'Manually edited title');
});

test('concurrent generator requests return one shared draft', async () => {
  const { series, template } = foundation();
  const dependencies = fakeDependencies({ series, template, rows: [] });
  const input = { seriesKey: 'active-quest', year: 2026, month: 11, requestedBy: actor() };
  const [left, right] = await Promise.all([
    generateActiveQuestEdition(input, dependencies),
    generateActiveQuestEdition(input, dependencies)
  ]);
  assert.equal(dependencies.rows.length, 1);
  assert.equal(left.eventId, right.eventId);
  assert.deepEqual([left.created, right.created].sort(), [false, true]);
  assert.equal(dependencies.rows[0].status, 'draft');
});

test('unrelated slug collision blocks generation', async () => {
  const { series, template } = foundation();
  const dependencies = fakeDependencies({
    series,
    template,
    rows: [{ _id: new mongoose.Types.ObjectId(), slug: 'november-active-quest-2026', status: 'draft' }]
  });
  await assert.rejects(generateActiveQuestEdition({
    seriesKey: 'active-quest', year: 2026, month: 11, requestedBy: actor()
  }, dependencies), (error) => error.code === 'ACTIVE_QUEST_SLUG_COLLISION');
});

function fakeDependencies({ series, template, rows }) {
  class FakeEvent {
    constructor(payload) {
      Object.assign(this, payload);
      this._id = new mongoose.Types.ObjectId();
    }

    async validate() {
      await new Event({ ...this }).validate();
    }

    async save() {
      await new Promise((resolve) => setImmediate(resolve));
      const duplicate = rows.find((row) =>
        row.slug === this.slug ||
        (row.seriesKey === this.seriesKey && row.seriesYear === this.seriesYear && row.seriesMonth === this.seriesMonth)
      );
      if (duplicate) {
        const error = new Error('duplicate key');
        error.code = 11000;
        throw error;
      }
      rows.push(this);
      return this;
    }

    static async findOne(query) {
      return rows.find((row) => Object.entries(query).every(([key, value]) => String(row[key]) === String(value))) || null;
    }
  }

  return {
    EventModel: FakeEvent,
    SeriesModel: { findOne: async () => series },
    TemplateModel: { findById: async () => template },
    auditRecorder: () => {},
    CertificateTemplateModel: false,
    now: new Date('2026-10-28T08:00:00.000Z'),
    rows
  };
}
