const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  buildBaselineTemplateInput,
  buildFrozenTemplateSnapshot
} = require('../src/services/active-quest-foundation.service');
const { buildActiveQuestSchedule } = require('../src/services/active-quest-schedule.service');
const { serializeSchedule } = require('../src/services/active-quest-generator.service');
const { prepareActiveQuestPublication } = require('../src/services/event-approval.service');

function buildEvent() {
  const actorId = new mongoose.Types.ObjectId();
  const seriesId = new mongoose.Types.ObjectId();
  const templateInput = buildBaselineTemplateInput({ seriesId, actorId });
  templateInput.categories = templateInput.categories.map((category) => ({
    ...category,
    badgeAssetUrl: `https://cdn.hellorun.online/${category.key}.webp`
  }));
  templateInput.rewardRequirements.certificateTemplate = {
    name: 'Active Quest Certificate',
    content: {
      heading: 'Certificate of Completion',
      bodyText: 'Completed {{distance}} in {{eventTitle}}.'
    },
    displayOptions: { showCertificateNumber: true, showQrCode: true }
  };
  const template = {
    ...templateInput,
    _id: new mongoose.Types.ObjectId(),
    status: 'published',
    frozen: true,
    effectiveAt: new Date('2026-10-28T00:00:00.000Z')
  };
  const schedule = serializeSchedule(buildActiveQuestSchedule({ year: 2026, month: 11 }));

  return {
    seriesKey: 'active-quest',
    seriesYear: 2026,
    seriesMonth: 11,
    seriesSnapshot: buildFrozenTemplateSnapshot(template),
    seriesSchedule: schedule,
    registrationOpenAt: new Date(schedule.instants.registrationOpen),
    publicListingAvailableAt: null,
    seriesAdminOverrides: [],
    description: 'Old description',
    eventDetailsMarkdown: 'Old content',
    set(path, value) {
      this[path] = value;
    }
  };
}

test('late Active Quest approval opens registration at publication without moving activity or proof windows', () => {
  const event = buildEvent();
  const originalActivityStart = event.seriesSchedule.instants.activityStart;
  const originalActivityEnd = event.seriesSchedule.instants.activityEndExclusive;
  const originalRegistrationEnd = event.seriesSchedule.instants.registrationEndExclusive;
  const originalSubmissionEnd = event.seriesSchedule.instants.submissionEndExclusive;
  const approvedAt = new Date('2026-11-04T02:15:00.000Z');
  const actorId = new mongoose.Types.ObjectId();

  const changed = prepareActiveQuestPublication(event, approvedAt, actorId);

  assert.equal(changed, true);
  assert.equal(event.registrationOpenAt.toISOString(), approvedAt.toISOString());
  assert.equal(event.publicListingAvailableAt.toISOString(), approvedAt.toISOString());
  assert.equal(event.seriesSchedule.local.registrationOpen, '2026-11-04');
  assert.equal(event.seriesSchedule.display.registrationOpen, 'November 4, 2026');
  assert.equal(event.seriesSchedule.instants.registrationOpen, approvedAt.toISOString());
  assert.equal(event.seriesSchedule.instants.activityStart, originalActivityStart);
  assert.equal(event.seriesSchedule.instants.activityEndExclusive, originalActivityEnd);
  assert.equal(event.seriesSchedule.instants.registrationEndExclusive, originalRegistrationEnd);
  assert.equal(event.seriesSchedule.instants.submissionEndExclusive, originalSubmissionEnd);
  assert.match(event.eventDetailsMarkdown, /Registration: \*\*November 4, 2026\*\* through \*\*November 22, 2026\*\*/);
  assert.match(event.eventDetailsMarkdown, /Eligible activities: \*\*November 1, 2026\*\* through \*\*November 30, 2026\*\*/);
  assert.match(event.eventDetailsMarkdown, /Final proof deadline: end of \*\*December 14, 2026\*\*/);
  assert.doesNotMatch(event.eventDetailsMarkdown, /October 25, 2026/);
  assert.equal(event.seriesAdminOverrides.length, 1);
  assert.equal(event.seriesAdminOverrides[0].actorUserId, actorId);
  assert.equal(event.seriesAdminOverrides[0].changes.registrationOpenAt.previous, '2026-10-24T16:00:00.000Z');
  assert.equal(event.seriesAdminOverrides[0].changes.registrationOpenAt.next, approvedAt.toISOString());
});

test('approval before the scheduled registration opening preserves the future schedule', () => {
  const event = buildEvent();
  const originalSchedule = JSON.parse(JSON.stringify(event.seriesSchedule));
  const originalContent = event.eventDetailsMarkdown;

  const changed = prepareActiveQuestPublication(event, new Date('2026-10-20T02:15:00.000Z'));

  assert.equal(changed, false);
  assert.equal(event.registrationOpenAt.toISOString(), '2026-10-24T16:00:00.000Z');
  assert.equal(event.publicListingAvailableAt, null);
  assert.deepEqual(event.seriesSchedule, originalSchedule);
  assert.equal(event.eventDetailsMarkdown, originalContent);
});
