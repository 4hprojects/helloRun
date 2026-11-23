const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const Event = require('../src/models/Event');
const Submission = require('../src/models/Submission');
const AccumulatedActivitySubmission = require('../src/models/AccumulatedActivitySubmission');
const {
  applyEventFormData,
  getCreateEventFormData,
  getCreateEventFormDataFromEvent,
  validateCreateEventForm
} = require('../src/services/event-form.service');
const { buildPublicEventView } = require('../src/utils/event-public-view');
const submissionService = require('../src/services/submission.service');
const criticalAudit = require('../src/services/critical-audit.service');

const ROOT = path.resolve(__dirname, '..');

function eventWithMerchAndBenefits(overrides = {}) {
  return new Event({
    title: 'Year Challenge',
    slug: 'year-challenge',
    organiserName: 'HelloRun',
    organizerId: '507f1f77bcf86cd799439011',
    eventType: 'virtual',
    feeMode: 'free',
    specialRewardBenefits: [{ title: 'Partner discount', description: '10% off' }],
    finisherMerchandise: {
      enabled: true,
      name: 'Finisher Shirt + Medal Bundle',
      priceAmount: 1099,
      currency: 'PHP',
      includedItems: ['Medal', 'Shirt'],
      shippingNote: 'Free shipping within the Philippines.',
      imageItems: [{ url: 'https://cdn.example.test/medal.webp', key: 'k/medal.webp', alt: 'Bronze medal' }],
      orderingState: 'preview',
      previewNote: 'Orders open later.',
      openNote: 'Order from your dashboard.',
      productId: 'prod-1'
    },
    ...overrides
  });
}

test('BUG-SRB-01: a builder save that posts no benefit fields keeps special reward benefits', () => {
  const event = eventWithMerchAndBenefits();
  const formData = getCreateEventFormData({ title: 'Year Challenge', organiserName: 'HelloRun', eventType: 'virtual' });
  assert.equal(formData.specialRewardBenefitsSubmitted, false);

  applyEventFormData(event, formData);

  assert.equal(event.specialRewardBenefits.length, 1);
  assert.equal(event.specialRewardBenefits[0].title, 'Partner discount');
});

test('BUG-SRB-01: posted benefit fields still replace the stored benefits', () => {
  const event = eventWithMerchAndBenefits();
  const formData = getCreateEventFormData({
    title: 'Year Challenge',
    specialRewardBenefitTitle: ['New benefit'],
    specialRewardBenefitDescription: ['Updated'],
    specialRewardBenefitValidUntil: [''],
    specialRewardBenefitPackageNames: ['']
  });

  applyEventFormData(event, formData);

  assert.deepEqual(event.specialRewardBenefits.map((benefit) => benefit.title), ['New benefit']);
});

test('a builder save without the merchandise fieldset keeps finisher merchandise untouched', () => {
  const event = eventWithMerchAndBenefits();
  applyEventFormData(event, getCreateEventFormData({ title: 'Year Challenge' }));

  assert.equal(event.finisherMerchandise.enabled, true);
  assert.equal(event.finisherMerchandise.priceAmount, 1099);
  assert.equal(event.finisherMerchandise.imageItems.length, 1);
});

test('builder merchandise fields update text and ordering state but keep photos and product link', () => {
  const event = eventWithMerchAndBenefits();
  const formData = getCreateEventFormData({
    title: 'Year Challenge',
    finisherMerchandiseSubmitted: '1',
    finisherMerchandiseEnabled: '1',
    finisherMerchandiseName: 'Bundle',
    finisherMerchandisePriceAmount: '1199',
    finisherMerchandiseShippingNote: 'Free PH shipping.',
    finisherMerchandiseOrderingState: 'open',
    finisherMerchandisePreviewNote: 'Soon.',
    finisherMerchandiseOpenNote: 'Order now.'
  });

  applyEventFormData(event, formData);

  assert.equal(event.finisherMerchandise.name, 'Bundle');
  assert.equal(event.finisherMerchandise.priceAmount, 1199);
  assert.equal(event.finisherMerchandise.orderingState, 'open');
  assert.equal(event.finisherMerchandise.imageItems[0].url, 'https://cdn.example.test/medal.webp');
  assert.equal(event.finisherMerchandise.productId, 'prod-1');
  assert.deepEqual([...event.finisherMerchandise.includedItems], ['Medal', 'Shirt']);
});

test('an unknown ordering state falls back to preview, and an enabled card needs a name and price', () => {
  const formData = getCreateEventFormData({
    title: 'Year Challenge',
    finisherMerchandiseSubmitted: '1',
    finisherMerchandiseEnabled: '1',
    finisherMerchandiseOrderingState: 'sold_out'
  });
  assert.equal(formData.finisherMerchandise.orderingState, 'preview');
  const errors = validateCreateEventForm(formData);
  assert.match(errors.finisherMerchandiseName, /required/);
  assert.match(errors.finisherMerchandisePriceAmount, /required/);
});

test('builder form data round-trips merchandise from a stored event', () => {
  const formData = getCreateEventFormDataFromEvent(eventWithMerchAndBenefits());
  assert.equal(formData.finisherMerchandise.enabled, true);
  assert.equal(formData.finisherMerchandise.priceAmount, 1099);
  assert.equal(formData.finisherMerchandise.imageCount, 1);
});

test('public view shows a ₱ price, availability lead and the preview note, with no order action', () => {
  const view = buildPublicEventView(eventWithMerchAndBenefits().toObject());
  const offer = view.merchandiseOffer;

  assert.equal(offer.priceLabel, '₱1,099');
  assert.equal(offer.availabilityLabel, 'Available after verified completion');
  assert.equal(offer.note, 'Orders open later.');
  assert.equal(offer.orderingOpen, false);
  assert.deepEqual(offer.images, [{ url: 'https://cdn.example.test/medal.webp', alt: 'Bronze medal' }]);
  assert.equal(view.packageOptions.length, 0);
});

test('public view switches to the open note, and hides disabled or incomplete merchandise', () => {
  const open = buildPublicEventView(eventWithMerchAndBenefits({
    finisherMerchandise: { enabled: true, name: 'Bundle', priceAmount: 1099, orderingState: 'open', openNote: 'Order now.', previewNote: 'Soon.' }
  }).toObject());
  assert.equal(open.merchandiseOffer.note, 'Order now.');

  const disabled = buildPublicEventView(eventWithMerchAndBenefits({ finisherMerchandise: { enabled: false, name: 'Bundle', priceAmount: 1 } }).toObject());
  assert.equal(disabled.merchandiseOffer, null);
  const noPrice = buildPublicEventView(eventWithMerchAndBenefits({ finisherMerchandise: { enabled: true, name: 'Bundle' } }).toObject());
  assert.equal(noPrice.merchandiseOffer, null);
});

test('public view keeps one, two, or four merchandise images without exceeding the public cap', () => {
  for (const count of [1, 2, 4]) {
    const event = eventWithMerchAndBenefits();
    event.finisherMerchandise.imageItems = Array.from({ length: count }, (_, index) => ({
      url: `https://cdn.example.test/item-${index + 1}.webp`,
      key: `k/item-${index + 1}.webp`,
      alt: `Merchandise view ${index + 1}`
    }));

    const offer = buildPublicEventView(event.toObject()).merchandiseOffer;
    assert.equal(offer.images.length, count);
    assert.equal(offer.images.at(-1).alt, `Merchandise view ${count}`);
  }
});

test('event page renders zoomable merchandise images with escaped text and no order action', async () => {
  const template = fs.readFileSync(path.join(ROOT, 'src/views/pages/event-details.ejs'), 'utf8');
  const start = template.indexOf('<% if (details.merchandiseOffer) { %>');
  const end = template.indexOf('<% if (details.rewardDetails?.description) { %>', start);
  assert.ok(start > -1 && end > start);
  const fragment = template.slice(start, end);
  const html = await ejs.render(fragment, {
    details: {
      merchandiseOffer: {
        name: 'Bundle <b>',
        priceLabel: '₱1,099',
        description: '',
        includedItems: [],
        shippingNote: 'Free shipping within the Philippines.',
        availabilityLabel: 'Available after verified completion',
        orderingOpen: false,
        note: 'Orders open later.',
        images: [
          { url: 'https://cdn.example.test/medal.webp', alt: 'Bronze medal' },
          { url: 'https://cdn.example.test/shirt.webp', alt: 'Black finisher shirt' }
        ]
      }
    }
  }, { async: true });

  assert.match(html, /₱1,099/);
  assert.match(html, /Bundle &lt;b&gt;/);
  assert.match(html, /alt="Bronze medal"/);
  assert.match(html, /alt="Black finisher shirt"/);
  assert.match(html, /class="event-bundle-image event-merch-media event-merch-media-count-2"/);
  assert.equal((html.match(/class="event-merch-image-button event-image-zoom-trigger"/g) || []).length, 2);
  assert.match(html, /data-image-zoom-src="https:\/\/cdn\.example\.test\/medal\.webp"/);
  assert.match(html, /aria-label="View Bronze medal full size"/);
  assert.match(html, /class="event-merch-content"/);
  assert.doesNotMatch(html, /<a\b|<form\b|data-order|order-button/);
});

test('event page shows four badges first and progressively discloses any additional badges', async () => {
  const template = fs.readFileSync(path.join(ROOT, 'src/views/pages/event-details.ejs'), 'utf8');
  const start = template.indexOf('<% const eventBadges = badges || []; %>');
  const end = template.indexOf('          </section>', start);
  assert.ok(start > -1 && end > start);
  const fragment = template.slice(start, end);
  const badge = (index) => ({
    name: `Badge ${index}`,
    description: `Badge description ${index}`,
    badgeType: 'challenge_finisher',
    imageUrl: ''
  });

  const emptyHtml = await ejs.render(fragment, {
    badges: [],
    event: { digitalBadgeEnabled: true }
  }, { async: true });
  assert.match(emptyHtml, /class="event-badge-empty"/);
  assert.doesNotMatch(emptyHtml, /event-badge-disclosure/);

  const fourHtml = await ejs.render(fragment, {
    badges: Array.from({ length: 4 }, (_, index) => badge(index + 1)),
    event: { digitalBadgeEnabled: true }
  }, { async: true });
  assert.equal((fourHtml.match(/class="event-badge-card"/g) || []).length, 4);
  assert.doesNotMatch(fourHtml, /event-badge-disclosure/);

  const sixHtml = await ejs.render(fragment, {
    badges: Array.from({ length: 6 }, (_, index) => badge(index + 1)),
    event: { digitalBadgeEnabled: true }
  }, { async: true });
  assert.equal((sixHtml.match(/class="event-badge-card"/g) || []).length, 6);
  assert.match(sixHtml, /<details class="event-badge-disclosure">/);
  assert.match(sixHtml, /<summary>Show all 6 badges<\/summary>/);
  assert.match(sixHtml, /aria-label="Additional event badges"/);
});

test('editing a rejected accumulated activity keeps treadmill as the activity type', async (t) => {
  submissionService.__setDisableSubmissionSyncBackgroundTasks(true);
  criticalAudit.__setDisableCriticalAuditBackgroundWrites(true);
  const saved = [];
  const submission = {
    _id: '507f1f77bcf86cd799439012',
    eventId: '507f1f77bcf86cd799439013',
    status: 'rejected',
    runType: 'run',
    runDate: new Date('2026-02-01T00:00:00.000Z'),
    save: async function save() { saved.push(this.runType); }
  };
  t.mock.method(Submission, 'findOne', async () => null);
  t.mock.method(AccumulatedActivitySubmission, 'findOne', async () => submission);
  t.mock.method(Event, 'findById', () => ({
    select: () => ({
      lean: async () => ({
        eventStartAt: new Date('2026-01-01T00:00:00+08:00'),
        eventEndAt: new Date('2026-12-31T23:59:59+08:00'),
        acceptedRunTypes: ['run', 'walk', 'treadmill']
      })
    })
  }));
  t.after(() => {
    submissionService.__setDisableSubmissionSyncBackgroundTasks(false);
    criticalAudit.__setDisableCriticalAuditBackgroundWrites(false);
  });

  await submissionService.editRejectedSubmissionMetadata({
    submissionId: submission._id,
    runnerId: '507f1f77bcf86cd799439014',
    distanceKm: 8,
    runDate: '2026-02-01',
    runType: 'treadmill'
  });

  assert.equal(submission.runType, 'treadmill');
  assert.deepEqual(saved, ['treadmill']);
});

test('a builder merchandise save keeps a stored non-PHP currency', () => {
  const event = eventWithMerchAndBenefits();
  event.finisherMerchandise.currency = 'USD';
  applyEventFormData(event, getCreateEventFormData({
    title: 'Year Challenge',
    finisherMerchandiseSubmitted: '1',
    finisherMerchandiseEnabled: '1',
    finisherMerchandiseName: 'Bundle',
    finisherMerchandisePriceAmount: '25'
  }));
  assert.equal(event.finisherMerchandise.currency, 'USD');
});

test('both the create and the edit builder render the merchandise fields', () => {
  for (const view of ['create-event.ejs', 'edit-event.ejs']) {
    const source = fs.readFileSync(path.join(ROOT, 'src/views/organizer', view), 'utf8');
    assert.match(source, /include\('partials\/finisher-merchandise-fields'\)/, view);
  }
  const partial = fs.readFileSync(path.join(ROOT, 'src/views/organizer/partials/finisher-merchandise-fields.ejs'), 'utf8');
  assert.match(partial, /name="finisherMerchandiseSubmitted"/);
  assert.doesNotMatch(partial, /<%-/);
});

test('every submission layer accepts treadmill from the shared activity-type list', () => {
  const { RUN_TYPES, normalizeRunType } = require('../src/utils/activity-types');
  assert.deepEqual([...RUN_TYPES], ['run', 'walk', 'hike', 'trail_run', 'treadmill']);
  assert.equal(normalizeRunType(' Treadmill '), 'treadmill');
  assert.equal(normalizeRunType('cycling'), '');
  const controller = fs.readFileSync(path.join(ROOT, 'src/controllers/page/submission.controller.js'), 'utf8');
  assert.doesNotMatch(controller, /\['run', 'walk', 'hike', 'trail_run'\]/);
});

test('the event edit form contains no nested forms, so a save posts one _csrf value', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/views/organizer/edit-event.ejs'), 'utf8');
  const start = source.indexOf('<form id="eventEditForm"');
  const end = source.indexOf('</form>', start);
  assert.ok(start > -1 && end > start);
  const body = source.slice(start + 1, end);
  assert.doesNotMatch(body, /<form\b/);
  assert.equal((body.match(/name="_csrf"/g) || []).length, 1);
  // Badge editors post through standalone forms linked with the form attribute.
  assert.match(source, /<form id="wizBadgeForm-<%= badge\.eventBadgeId %>"/);
  assert.match(source, /name="name" value="<%= badge\.name %>" maxlength="120" form="wizBadgeForm-/);
});
