'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  normalizeOrganizerEventListFilters,
  buildOrganizerEventListPath,
  buildEventRowsPipeline,
  mapPortfolioCounts,
  mapOrganizerEventListItem,
  listOrganizerEvents
} = require('../src/services/organizer-event-list.service');

test('event list filters normalize supported values and fail safely', () => {
  assert.deepEqual(normalizeOrganizerEventListFilters({}), {
    q: '', status: '', sort: 'attention', perPage: 25, page: 1
  });
  assert.deepEqual(normalizeOrganizerEventListFilters({
    q: `  ${'x'.repeat(100)}  `, status: 'archived', sort: 'start_desc', perPage: '100', page: '3'
  }), {
    q: 'x'.repeat(80), status: 'archived', sort: 'start_desc', perPage: 100, page: 3
  });
  assert.deepEqual(normalizeOrganizerEventListFilters({
    status: 'deleted', sort: 'unknown', perPage: '250', page: '-4'
  }), { q: '', status: '', sort: 'attention', perPage: 25, page: 1 });
});

test('event list URLs preserve filters and omit default noise', () => {
  assert.equal(buildOrganizerEventListPath({ sort: 'attention', perPage: 25, page: 1 }), '/organizer/events');
  assert.equal(
    buildOrganizerEventListPath({ q: 'Bayani Run', status: 'draft', sort: 'newest', perPage: 50, page: 2 }),
    '/organizer/events?q=Bayani+Run&status=draft&sort=newest&perPage=50&page=2'
  );
  assert.equal(
    buildOrganizerEventListPath({ q: 'Bayani Run', status: 'draft', sort: 'newest', perPage: 50, page: 2 }, { status: '', page: 1 }),
    '/organizer/events?q=Bayani+Run&sort=newest&perPage=50'
  );
});

test('attention pipeline aggregates both result sources and sorts workload deterministically', () => {
  const organizerId = new mongoose.Types.ObjectId();
  const pipeline = buildEventRowsPipeline({
    organizerId,
    filters: normalizeOrganizerEventListFilters({ q: 'Quest', sort: 'attention' }),
    skip: 25,
    limit: 25,
    collections: { registrations: 'registrations', submissions: 'submissions', accumulated: 'accumulated' }
  });
  assert.equal(pipeline[0].$match.organizerId, organizerId);
  assert.deepEqual(pipeline[0].$match.status, { $ne: 'archived' });
  assert.equal(pipeline.filter((stage) => stage.$lookup).length, 3);
  assert.equal(pipeline[1].$lookup.from, 'registrations');
  assert.equal(pipeline[2].$lookup.from, 'submissions');
  assert.equal(pipeline[3].$lookup.from, 'accumulated');
  assert.deepEqual(pipeline.find((stage) => stage.$sort).$sort, {
    attentionRank: 1, totalPendingWork: -1, updatedAt: -1, _id: 1
  });
  assert.equal(pipeline.at(-2).$skip, 25);
  assert.equal(pipeline.at(-1).$limit, 25);
  const priorityStage = pipeline.find((stage) => stage.$set?.attentionRank);
  assert.equal(priorityStage.$set.attentionRank.$switch.branches[0].then, 0);
  assert.deepEqual(priorityStage.$set.attentionRank.$switch.branches[0].case, { $gt: ['$totalPendingWork', 0] });
});

test('portfolio totals remain independent and event rows expose only actionable shortcuts', () => {
  assert.deepEqual(mapPortfolioCounts([
    { _id: 'draft', count: 2 }, { _id: 'published', count: 4 }, { _id: 'archived', count: 1 }
  ]), { total: 6, draft: 2, pending_review: 0, published: 4, closed: 0, archived: 1 });

  const item = mapOrganizerEventListItem({
    _id: 'event-1', title: 'Event', status: 'published', eventType: 'virtual',
    registrationCount: 18, pendingPaymentCount: 2,
    standardPendingResultCount: 1, accumulatedPendingResultCount: 2, pendingResultCount: 3
  });
  assert.equal(item.registrationCount, 18);
  assert.equal(item.totalPendingWork, 5);
  assert.equal(item.actionCount, 3);
  assert.deepEqual(item.attention, ['2 payment reviews needed', '3 result reviews needed']);
  assert.equal(item.paymentReviewHref, '/organizer/events/event-1/payment-proofs/review');
  assert.equal(item.resultReviewHref, '/organizer/events/event-1/run-proofs/review');

  const draft = mapOrganizerEventListItem({ _id: 'draft-1', status: 'draft', eventTypesAllowed: ['virtual'] });
  assert.deepEqual(draft.attention, ['Continue draft']);
  assert.equal(draft.actionCount, 1);
  assert.equal(draft.locationLabel, 'Virtual event');
});

test('list service clamps pages, keeps global counts, and returns paginated links', async () => {
  const organizerId = new mongoose.Types.ObjectId();
  const aggregateCalls = [];
  const EventModel = {
    countDocuments: async () => 52,
    aggregate: async (pipeline) => {
      aggregateCalls.push(pipeline);
      if (pipeline.some((stage) => stage.$group)) {
        return [{ _id: 'draft', count: 4 }, { _id: 'published', count: 50 }, { _id: 'archived', count: 3 }];
      }
      return [{
        _id: new mongoose.Types.ObjectId(), title: 'Last Page Event', status: 'published',
        registrationCount: 2, pendingPaymentCount: 0, pendingResultCount: 1,
        eventTypesAllowed: ['virtual'], updatedAt: new Date()
      }];
    }
  };

  const result = await listOrganizerEvents(organizerId, { page: '99', perPage: '25' }, {
    EventModel,
    collections: { registrations: 'registrations', submissions: 'submissions', accumulated: 'accumulated' }
  });
  assert.equal(result.pagination.page, 3);
  assert.equal(result.pagination.totalPages, 3);
  assert.equal(result.pagination.start, 51);
  assert.equal(result.pagination.end, 51);
  assert.match(result.pagination.prevHref, /page=2/);
  assert.equal(result.pagination.nextHref, '');
  assert.deepEqual(result.portfolioCounts, {
    total: 54, draft: 4, pending_review: 0, published: 50, closed: 0, archived: 3
  });
  const rowsPipeline = aggregateCalls.find((pipeline) => pipeline.some((stage) => stage.$lookup));
  assert.equal(rowsPipeline.at(-2).$skip, 50);
  assert.equal(result.events[0].attention[0], '1 result review needed');
});
