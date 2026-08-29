'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Event = require('../src/models/Event');
const {
  applyEventFormData,
  getCreateEventFormData,
  getCreateEventFormDataFromEvent
} = require('../src/services/event-form.service');

const ROOT = path.resolve(__dirname, '..');

test('event-wide recognition settings default off and round-trip for accumulated challenges', () => {
  assert.equal(Event.schema.path('leaderboardSettings.showHighestStepsCard').defaultValue, false);
  assert.equal(Event.schema.path('leaderboardSettings.showHighestElevationCard').defaultValue, false);
  assert.equal(Event.schema.path('leaderboardSettings.showMostConsistentCard').defaultValue, false);
  assert.equal(Event.schema.path('leaderboardSettings.publicRankCutoff').defaultValue, 0);

  const formData = getCreateEventFormData({
    title: 'Accumulated Challenge',
    organiserName: 'Organizer',
    description: 'Challenge description',
    eventType: 'virtual',
    virtualCompletionMode: 'accumulated_activity',
    leaderboardSettingsType: 'accumulated_challenge',
    leaderboardSettingsShowHighestStepsCard: '1',
    leaderboardSettingsShowHighestElevationCard: '1',
    leaderboardSettingsShowMostConsistentCard: '1',
    leaderboardSettingsPublicRankCutoff: '10'
  });
  const event = {};
  applyEventFormData(event, formData, null);

  assert.equal(event.leaderboardSettings.showHighestStepsCard, true);
  assert.equal(event.leaderboardSettings.showHighestElevationCard, true);
  assert.equal(event.leaderboardSettings.showMostConsistentCard, true);
  assert.equal(event.leaderboardSettings.publicRankCutoff, 10);
  assert.equal(getCreateEventFormDataFromEvent(event).leaderboardSettings.showHighestStepsCard, true);
  assert.equal(getCreateEventFormDataFromEvent(event).leaderboardSettings.showHighestElevationCard, true);
  assert.equal(getCreateEventFormDataFromEvent(event).leaderboardSettings.showMostConsistentCard, true);
  assert.equal(getCreateEventFormDataFromEvent(event).leaderboardSettings.publicRankCutoff, 10);
});

test('event-wide recognition settings stay off for race-result leaderboards', () => {
  const formData = getCreateEventFormData({
    eventType: 'virtual',
    virtualCompletionMode: 'single_activity',
    leaderboardSettingsType: 'race_result',
    leaderboardSettingsShowHighestStepsCard: '1',
    leaderboardSettingsShowHighestElevationCard: '1',
    leaderboardSettingsShowMostConsistentCard: '1'
  });

  assert.equal(formData.leaderboardSettings.showHighestStepsCard, false);
  assert.equal(formData.leaderboardSettings.showHighestElevationCard, false);
  assert.equal(formData.leaderboardSettings.showMostConsistentCard, false);
});

test('organizer create and edit forms expose recognition and public-rank controls', () => {
  for (const relativePath of ['src/views/organizer/create-event.ejs', 'src/views/organizer/edit-event.ejs']) {
    const view = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    assert.match(view, /name="leaderboardSettingsShowHighestStepsCard" value="1"/);
    assert.match(view, /name="leaderboardSettingsShowHighestElevationCard" value="1"/);
    assert.match(view, /name="leaderboardSettingsShowMostConsistentCard" value="1"/);
    assert.match(view, /data-event-wide-recognition-setting/);
    assert.match(view, /Only approved, publicly eligible results across all categories count/);
    assert.match(view, /name="leaderboardSettingsPublicRankCutoff"/);
    assert.match(view, /positive value publishes that rank and all exact ties/);
  }
});

test('organizer controls clear and disable all event-wide settings for race results', () => {
  const client = fs.readFileSync(path.join(ROOT, 'src/public/js/event-builder-groups.js'), 'utf8');
  assert.match(client, /leaderboardType\.value === 'accumulated_challenge'/);
  assert.match(client, /recognitionSettings\.forEach/);
  assert.match(client, /setting\.hidden = !available/);
  assert.match(client, /checkbox\.disabled = !available/);
  assert.match(client, /if \(!available\) checkbox\.checked = false/);
  assert.match(client, /leaderboardType\?\.addEventListener\('change', syncEventWideRecognitionSettings\)/);
});

test('CNS activation command is targeted, dry-run by default, and idempotent', () => {
  const script = fs.readFileSync(path.join(ROOT, 'src/scripts/enable-cns-elevation-card.js'), 'utf8');
  assert.match(script, /const APPLY = process\.argv\.includes\('--apply'\)/);
  assert.match(script, /findOne\(\{ slug: SLUG \}\)/);
  assert.match(script, /showHighestStepsCard': \{ \$ne: true \}/);
  assert.match(script, /showHighestElevationCard': \{ \$ne: true \}/);
  assert.match(script, /showMostConsistentCard': \{ \$ne: true \}/);
  assert.match(script, /publicRankCutoff': \{ \$ne: 10 \}/);
  assert.match(script, /'leaderboardSettings\.publicRankCutoff': 10/);
  assert.match(script, /mutationApplied: false/);
});

test('CNS demo cleanup requires the complete tagged fixture and preserves non-demo counts', () => {
  const script = fs.readFileSync(path.join(ROOT, 'src/scripts/seed-cns-leaderboard-demo.js'), 'utf8');
  assert.match(script, /const EXPECTED_DEMO_RECORDS = DEMO_RUNNERS_PER_CATEGORY \* 5/);
  assert.match(script, /Refusing cleanup: expected/);
  assert.match(script, /countNonDemoEventRecords\(event\._id\)/);
  assert.match(script, /Non-demo event records changed during cleanup/);
  assert.match(script, /taggedResidue: await countDemoRecords\(event\._id\)/);
});

test('public cutoff is enforced before filtering while private standing cannot expose neighbors below it', () => {
  const service = fs.readFileSync(path.join(ROOT, 'src/services/leaderboard.service.js'), 'utf8');
  const controller = fs.readFileSync(path.join(ROOT, 'src/controllers/page/leaderboard.controller.js'), 'utf8');
  const cutoffIndex = service.indexOf('applyPublicRankCutoff(rankedGroups, settings.publicRankCutoff)');
  const searchIndex = service.indexOf('filterEventWideLeaderboardGroup(publishedGroups[0], effectiveOptions)');

  assert.ok(cutoffIndex > -1 && searchIndex > cutoffIndex);
  assert.match(service, /includeUnpublishedRanks: true/);
  assert.match(service, /isBelowPublicCutoff \? \[\] : await getNearbyRunners/);
  assert.match(controller, /getEventLeaderboardMyStanding[\s\S]*metric: req\.query\.metric/);
});
