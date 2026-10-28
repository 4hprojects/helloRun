const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const ActiveQuestSeries = require('../src/models/ActiveQuestSeries');
const ActiveQuestTemplateVersion = require('../src/models/ActiveQuestTemplateVersion');
const Event = require('../src/models/Event');
const {
  ACTIVE_QUEST_CATEGORIES,
  ACTIVE_QUEST_FEATURE_FLAGS,
  ACTIVE_QUEST_SERIES_KEY,
  ACTIVE_QUEST_TIMEZONE
} = require('../src/config/active-quest');
const {
  assertFullAdmin,
  buildBaselineSeriesInput,
  buildBaselineTemplateInput,
  buildFrozenTemplateSnapshot,
  buildSeriesEditionProvenance,
  updateActiveQuestFeatureFlag
} = require('../src/services/active-quest-foundation.service');
const { normalizeMongoEvent, buildEventChecksum } = require('../src/services/event-shadow.service');

const ACTOR_ID = new mongoose.Types.ObjectId();
const ORGANIZER_ID = new mongoose.Types.ObjectId();
const SERIES_ID = new mongoose.Types.ObjectId();
const TEMPLATE_ID = new mongoose.Types.ObjectId();

function fullAdmin() {
  return { _id: ACTOR_ID, role: 'admin', adminTier: 'full' };
}

function buildSeriesDocument() {
  const series = new ActiveQuestSeries(buildBaselineSeriesInput({ organizerId: ORGANIZER_ID, actorId: ACTOR_ID }));
  series._id = SERIES_ID;
  series.save = async () => series;
  return series;
}

function buildTemplate(overrides = {}) {
  return new ActiveQuestTemplateVersion({
    ...buildBaselineTemplateInput({ seriesId: SERIES_ID, actorId: ACTOR_ID }),
    ...overrides
  });
}

function buildEvent(overrides = {}) {
  return new Event({
    organizerId: ORGANIZER_ID,
    slug: 'active-quest-foundation-test',
    title: 'Active Quest Foundation Test',
    organiserName: 'HelloRun',
    status: 'draft',
    ...overrides
  });
}

test('baseline series preserves PHT defaults and all feature flags fail closed', async () => {
  const series = buildSeriesDocument();
  await series.validate();

  assert.equal(series.key, ACTIVE_QUEST_SERIES_KEY);
  assert.equal(series.timezone, ACTIVE_QUEST_TIMEZONE);
  assert.equal(series.scheduleDefaults.registrationLeadDays, 7);
  assert.equal(series.scheduleDefaults.registrationCloseDay, 22);
  assert.equal(series.scheduleDefaults.proofCloseDayNextMonth, 14);
  assert.deepEqual(
    Object.fromEntries(ACTIVE_QUEST_FEATURE_FLAGS.map((flag) => [flag, series.featureFlags[flag]])),
    Object.fromEntries(ACTIVE_QUEST_FEATURE_FLAGS.map((flag) => [flag, false]))
  );
});

test('baseline template carries the exact six category targets and one-category policy', async () => {
  const template = buildTemplate();
  await template.validate();

  assert.equal(template.timezone, ACTIVE_QUEST_TIMEZONE);
  assert.equal(template.eventDefaults.completionMode, 'accumulated_distance');
  assert.equal(template.eventDefaults.oneCategoryPerRegistration, true);
  assert.equal(template.eventDefaults.minimumActivityDistanceKm, 1);
  assert.deepEqual(template.categories.map((category) => Number(category.targetKm)), [25, 50, 75, 100, 150, 200]);
  assert.deepEqual(template.categories.map((category) => category.label), ACTIVE_QUEST_CATEGORIES.map((category) => category.label));
});

test('template validation rejects missing, duplicate, or changed category definitions', async () => {
  const missing = buildTemplate({ categories: ACTIVE_QUEST_CATEGORIES.slice(0, 5) });
  await assert.rejects(missing.validate(), /exact six baseline category targets/i);

  const changed = ACTIVE_QUEST_CATEGORIES.map((category) => ({ ...category }));
  changed[5].targetKm = 201;
  await assert.rejects(buildTemplate({ categories: changed }).validate(), /exact six baseline category targets/i);
});

test('published templates require complete freeze and publication provenance', async () => {
  const invalid = buildTemplate({ status: 'published', frozen: false });
  await assert.rejects(invalid.validate(), /must be frozen/i);

  const published = buildTemplate({
    _id: TEMPLATE_ID,
    status: 'published',
    frozen: true,
    effectiveAt: new Date('2026-11-01T00:00:00+08:00'),
    publishedAt: new Date('2026-10-28T00:00:00.000Z'),
    publishedBy: ACTOR_ID
  });
  await published.validate();
  assert.equal(published.status, 'published');
});

test('frozen template snapshots are deep copies and cannot be mutated in memory', () => {
  const published = buildTemplate({
    _id: TEMPLATE_ID,
    status: 'published',
    frozen: true,
    effectiveAt: new Date('2026-11-01T00:00:00+08:00'),
    publishedAt: new Date('2026-10-28T00:00:00.000Z'),
    publishedBy: ACTOR_ID
  });
  const snapshot = buildFrozenTemplateSnapshot(published);

  assert.equal(snapshot.templateVersionId, String(TEMPLATE_ID));
  assert.equal(snapshot.effectiveAt, '2026-10-31T16:00:00.000Z');
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.categories), true);
  assert.throws(() => snapshot.categories.push({}), TypeError);
  assert.equal(published.categories.length, 6);
});

test('edition provenance accepts only the series current published frozen template', () => {
  const series = buildSeriesDocument();
  const published = buildTemplate({
    _id: TEMPLATE_ID,
    status: 'published',
    frozen: true,
    effectiveAt: new Date('2026-11-01T00:00:00+08:00'),
    publishedAt: new Date('2026-10-28T00:00:00.000Z'),
    publishedBy: ACTOR_ID
  });
  series.currentTemplateVersionId = TEMPLATE_ID;

  const provenance = buildSeriesEditionProvenance({
    series,
    template: published,
    year: 2026,
    month: 11,
    actor: fullAdmin(),
    generatedAt: new Date('2026-10-28T08:00:00.000Z')
  });
  assert.equal(provenance.generatedFromKey, 'active-quest:2026-11:v1');
  assert.equal(provenance.seriesSnapshot.version, 1);

  series.currentTemplateVersionId = new mongoose.Types.ObjectId();
  assert.throws(() => buildSeriesEditionProvenance({
    series,
    template: published,
    year: 2026,
    month: 11,
    actor: fullAdmin()
  }), /current published, frozen template/i);
});

test('foundation mutations deny runners, organizers, and support admins', async () => {
  for (const actor of [
    { _id: ACTOR_ID, role: 'runner' },
    { _id: ACTOR_ID, role: 'organiser' },
    { _id: ACTOR_ID, role: 'admin', adminTier: 'support' }
  ]) {
    assert.throws(() => assertFullAdmin(actor), /full admin access/i);
    await assert.rejects(updateActiveQuestFeatureFlag({
      series: buildSeriesDocument(),
      flag: 'activeQuestSeriesEnabled',
      enabled: true,
      actor,
      reason: 'Denied test.'
    }), /full admin access/i);
  }
});

test('feature flag changes require a reason and retain actor, old value, new value, and time', async () => {
  const series = buildSeriesDocument();
  const audits = [];
  const effectiveAt = new Date('2026-10-28T08:00:00.000Z');

  await assert.rejects(updateActiveQuestFeatureFlag({
    series,
    flag: 'activeQuestSeriesEnabled',
    enabled: true,
    actor: fullAdmin(),
    reason: ''
  }), /reason is required/i);

  const result = await updateActiveQuestFeatureFlag({
    series,
    flag: 'activeQuestSeriesEnabled',
    enabled: true,
    actor: fullAdmin(),
    reason: 'Begin manually supervised series rollout.',
    effectiveAt,
    auditRecorder: (entry) => audits.push(entry)
  });

  assert.equal(result.changed, true);
  assert.equal(series.featureFlags.activeQuestSeriesEnabled, true);
  assert.equal(series.featureFlagHistory.length, 1);
  assert.equal(series.featureFlagHistory[0].previousValue, false);
  assert.equal(series.featureFlagHistory[0].nextValue, true);
  assert.equal(String(series.featureFlagHistory[0].actorUserId), String(ACTOR_ID));
  assert.equal(series.featureFlagHistory[0].effectiveAt.toISOString(), effectiveAt.toISOString());
  assert.equal(audits[0].action, 'active_quest.feature_flag_changed');
});

test('Phase 1 cannot enable auto-publication even for a full admin', async () => {
  await assert.rejects(updateActiveQuestFeatureFlag({
    series: buildSeriesDocument(),
    flag: 'activeQuestAutoPublishEnabled',
    enabled: true,
    actor: fullAdmin(),
    reason: 'Attempt before separate approval.'
  }), /not available in Phase 1/i);
});

test('ordinary historical events remain valid without series fields', async () => {
  const event = buildEvent();
  await event.validate();
  assert.equal(event.seriesKey, null);
  assert.equal(event.seriesYear, null);
});

test('series editions require complete provenance and must be created as drafts', async () => {
  await assert.rejects(buildEvent({ seriesKey: ACTIVE_QUEST_SERIES_KEY }).validate(), /complete identity/i);

  const provenance = {
    seriesKey: ACTIVE_QUEST_SERIES_KEY,
    seriesYear: 2026,
    seriesMonth: 11,
    seriesTemplateVersionId: TEMPLATE_ID,
    generatedFromKey: 'active-quest:2026-11:v1',
    seriesSnapshot: { version: 1 },
    seriesSchedule: { timezone: 'Asia/Manila', boundaryMode: 'half_open' },
    seriesGeneratedAt: new Date('2026-10-28T08:00:00.000Z'),
    seriesGeneratedBy: ACTOR_ID
  };
  await buildEvent(provenance).validate();
  await assert.rejects(buildEvent({ ...provenance, status: 'published' }).validate(), /must start as drafts/i);
});

test('event model declares one partial unique edition index per series month', () => {
  const index = Event.schema.indexes().find(([fields]) =>
    fields.seriesKey === 1 && fields.seriesYear === 1 && fields.seriesMonth === 1
  );
  assert.ok(index);
  assert.equal(index[1].unique, true);
  assert.deepEqual(index[1].partialFilterExpression, { seriesKey: { $type: 'string' } });
});

test('event shadow carries nullable series identity and changes checksum with provenance', () => {
  const ordinary = normalizeMongoEvent(buildEvent().toObject());
  assert.equal(ordinary.seriesKey, null);
  assert.equal(ordinary.seriesYear, null);
  assert.equal(ordinary.seriesSnapshotChecksum, null);

  const seriesEvent = normalizeMongoEvent(buildEvent({
    seriesKey: ACTIVE_QUEST_SERIES_KEY,
    seriesYear: 2026,
    seriesMonth: 11,
    seriesTemplateVersionId: TEMPLATE_ID,
    generatedFromKey: 'active-quest:2026-11:v1',
    seriesSnapshot: { version: 1 }
  }).toObject());
  assert.equal(seriesEvent.seriesKey, ACTIVE_QUEST_SERIES_KEY);
  assert.equal(seriesEvent.seriesYear, 2026);
  assert.match(seriesEvent.seriesSnapshotChecksum, /^[a-f0-9]{64}$/);
  assert.notEqual(buildEventChecksum(ordinary), buildEventChecksum(seriesEvent));
});

test('Postgres migration is additive, nullable, unique by series month, and contains no backfill', () => {
  const sql = fs.readFileSync(
    path.resolve(__dirname, '../src/db/migrations/028_active_quest_series_foundation.sql'),
    'utf8'
  );
  assert.match(sql, /ADD COLUMN IF NOT EXISTS series_key text/i);
  assert.match(sql, /events_core_unique_series_month/i);
  assert.match(sql, /series_key, series_year, series_month/i);
  assert.match(sql, /WHERE series_key IS NOT NULL/i);
  assert.doesNotMatch(sql, /UPDATE events_core/i);
  assert.doesNotMatch(sql, /DELETE FROM events_core/i);
});
