'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  buildRegistrationPagePresentation,
  buildDistanceChoices,
  getChoiceControlKind
} = require('../src/services/registration-page-presentation.service');
const { getRunnerProfileCompleteness } = require('../src/services/profile-completion.service');
const { buildEventRegistrationConfirmationEmailHtml } = require('../src/services/email.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function buildJulyEvent(overrides = {}) {
  return {
    title: 'July Active Quest Virtual Run',
    slug: 'july-active-quest-virtual-run',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    feeMode: 'free',
    feeCurrency: 'PHP',
    pricingMode: 'free',
    virtualCompletionMode: 'accumulated_distance',
    registrationCloseAt: '2026-07-22T23:59:00.000Z',
    eventStartAt: '2026-07-01T00:00:00.000Z',
    eventEndAt: '2026-07-31T23:59:00.000Z',
    finalSubmissionDeadlineAt: '2026-08-14T23:59:00.000Z',
    ...overrides
  };
}

const distances = [
  '200K JULY ULTRA QUEST',
  '25K JULY STARTER QUEST',
  '100K JULY ACTIVE QUEST',
  '50K JULY PROGRESS QUEST',
  '150K JULY DISTANCE QUEST',
  '75K JULY ENDURANCE QUEST'
];

const categories = distances.map((distanceLabel) => ({
  id: distanceLabel,
  name: distanceLabel.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()),
  distanceLabel
}));

test('July registration presentation exposes six configured free accumulated goal cards and structured dates', () => {
  const presentation = buildRegistrationPagePresentation({
    event: buildJulyEvent(),
    formData: {
      participationMode: 'virtual',
      raceDistance: '25K JULY STARTER QUEST',
      addOnProductIds: []
    },
    profileSnapshot: {
      firstName: 'Jamie',
      lastName: 'Runner',
      email: 'jamie@example.com',
      country: 'PH'
    },
    allowedModes: ['virtual'],
    allowedRaceDistances: distances,
    raceCategoryOptions: categories,
    profileCompleteness: {
      percent: 44,
      completedCount: 4,
      requiredCount: 9,
      missingFields: ['Mobile', 'Timezone']
    }
  });

  assert.equal(presentation.event.formatLabel, 'Accumulated challenge');
  assert.equal(presentation.event.registrationCloseLabel, 'Jul 22, 2026');
  assert.equal(presentation.event.activityWindowLabel, 'Jul 1, 2026 – Jul 31, 2026');
  assert.equal(presentation.event.submissionDeadlineLabel, 'Aug 14, 2026');
  assert.equal(presentation.event.locationLabel, 'Virtual participation');
  assert.equal(presentation.modes.kind, 'fixed');
  assert.equal(presentation.distances.kind, 'cards');
  assert.deepEqual(
    presentation.distances.items.map((item) => item.sortDistance),
    [200, 25, 100, 50, 150, 75]
  );
  assert.ok(presentation.distances.items.every((item) => item.priceLabel === 'Free'));
  assert.equal(presentation.reviewData.distancePricing['25K JULY STARTER QUEST'].amount, 0);
  assert.deepEqual(presentation.profile.completion, {
    percent: 44,
    completedCount: 4,
    requiredCount: 9,
    missingFields: ['Mobile', 'Timezone']
  });
});

test('CNS registration presentation fixes the single official 50 km goal', () => {
  const event = buildJulyEvent({
    title: 'CNS Move More Challenge 2026',
    slug: 'cns-move-more-challenge-2026',
    organiserName: 'College of Natural Sciences, Benguet State University',
    virtualCompletionMode: 'accumulated_activity',
    eventStartAt: '2026-09-14T00:00:00+08:00',
    eventEndAt: '2026-11-03T23:59:00+08:00'
  });
  const cnsCategories = [{ id: '50', name: '50 km in 50 days', distanceLabel: '50K', distanceKm: 50, targetSteps: 0 }];
  const allowed = cnsCategories.map((item) => item.distanceLabel);
  const presentation = buildRegistrationPagePresentation({
    event,
    formData: { participationMode: 'virtual', raceDistance: '', addOnProductIds: [] },
    profileSnapshot: { firstName: 'Jamie', lastName: 'Runner', email: 'jamie@example.com' },
    allowedModes: ['virtual'],
    allowedRaceDistances: allowed,
    raceCategoryOptions: cnsCategories
  });

  assert.equal(presentation.distances.kind, 'fixed');
  assert.deepEqual(presentation.distances.items.map((item) => item.goalLabel), ['50 km']);
  assert.equal(presentation.distances.items[0].requiresBoth, false);
  assert.match(presentation.distances.items[0].trackingRequirement, /distance and the activity date/i);
});

test('adaptive choice controls use fixed, cards, and select thresholds', () => {
  assert.equal(getChoiceControlKind(1), 'fixed');
  assert.equal(getChoiceControlKind(2), 'cards');
  assert.equal(getChoiceControlKind(8), 'cards');
  assert.equal(getChoiceControlKind(9), 'select');

  const choices = buildDistanceChoices({
    allowedRaceDistances: ['HALF MARATHON', '5K', '10K'],
    raceCategoryOptions: [
      { name: 'Half marathon', distanceLabel: 'HALF MARATHON' },
      { name: '5K', distanceLabel: '5K' },
      { name: '10K', distanceLabel: '10K' }
    ],
    isFree: true
  });
  assert.deepEqual(choices.map((item) => item.value), ['10K', '5K', 'HALF MARATHON']);
});

test('standard events retain the existing distance select and numeric sorting', () => {
  const presentation = buildRegistrationPagePresentation({
    event: buildJulyEvent({ virtualCompletionMode: 'single_activity' }),
    formData: { participationMode: 'virtual', raceDistance: '' },
    allowedModes: ['virtual'],
    allowedRaceDistances: ['5K', '10K'],
    raceCategoryOptions: [
      { id: '5k', name: '5K', distanceLabel: '5K' },
      { id: '10k', name: '10K', distanceLabel: '10K' }
    ]
  });

  assert.equal(presentation.isAccumulated, false);
  assert.equal(presentation.distances.kind, 'select');
  assert.deepEqual(presentation.distances.items.map((item) => item.value), ['10K', '5K']);
});

test('distance choices sort standard numeric goals longest first and named values deterministically', () => {
  const values = ['5K', '200K', '10K', '50K', '21K', '100K', '25K', '75K', 'TRAIL OPEN'];
  const choices = buildDistanceChoices({
    allowedRaceDistances: values,
    raceCategoryOptions: values.map((distanceLabel) => ({ name: distanceLabel, distanceLabel })),
    isFree: true
  });

  assert.deepEqual(choices.map((item) => item.value), [
    '200K', '100K', '75K', '50K', '25K', '21K', '10K', '5K', 'TRAIL OPEN'
  ]);
});

test('registration profile uses the shared nine-field completion calculation', () => {
  const empty = getRunnerProfileCompleteness({});
  assert.deepEqual({ percent: empty.percent, completed: empty.completedCount, total: empty.requiredCount }, {
    percent: 0,
    completed: 0,
    total: 9
  });

  const complete = getRunnerProfileCompleteness({
    firstName: 'Jamie',
    lastName: 'Runner',
    mobile: '+639171234567',
    country: 'PH',
    timezone: 'Asia/Manila',
    dateOfBirth: '1990-01-01',
    gender: 'prefer_not_to_say',
    emergencyContactName: 'Alex Runner',
    emergencyContactNumber: '+639181234567'
  });
  assert.deepEqual({ percent: complete.percent, completed: complete.completedCount, total: complete.requiredCount }, {
    percent: 100,
    completed: 9,
    total: 9
  });
});

test('registration confirmation email includes the accepted waiver version and sanitized snapshot', () => {
  const html = buildEventRegistrationConfirmationEmailHtml({
    firstName: 'Jamie',
    eventTitle: 'July Active Quest',
    confirmationCode: 'HR-TEST123',
    participationMode: 'virtual',
    eventStartAt: '2026-07-01T00:00:00.000Z',
    raceDistance: '200K JULY ULTRA QUEST',
    waiverVersion: 4,
    renderedWaiver: '<div class="waiver-card"><p>Accepted waiver copy.</p><script>alert(1)</script></div>'
  });

  assert.match(html, /Confirmation Code:<\/strong> HR-TEST123/);
  assert.match(html, /Accepted event waiver/);
  assert.match(html, /version 4/);
  assert.match(html, /Accepted waiver copy/);
  assert.doesNotMatch(html, /<script>|alert\(1\)/);
});

test('existing registration presentation separates registration, add-ons, total, and next action', () => {
  const presentation = buildRegistrationPagePresentation({
    event: buildJulyEvent({ feeMode: 'paid', feeAmount: 380, pricingMode: 'distance_based' }),
    formData: { participationMode: 'virtual', raceDistance: '5K', addOnProductIds: [] },
    profileSnapshot: { firstName: 'Jamie', lastName: 'Runner', email: 'jamie@example.com' },
    allowedModes: ['virtual'],
    allowedRaceDistances: ['5K'],
    raceCategoryOptions: [{ id: '5k', name: '5K', distanceLabel: '5K' }],
    existingRegistration: {
      paymentAmountDue: 380,
      paymentCurrency: 'PHP',
      addOnsSubtotal: 120,
      addOnsCurrency: 'PHP',
      paymentStatus: 'unpaid',
      status: 'confirmed'
    }
  });

  assert.equal(presentation.existing.registrationAmountLabel, 'PHP 380.00');
  assert.equal(presentation.existing.addOnsAmountLabel, 'PHP 120.00');
  assert.equal(presentation.existing.totalAmountLabel, 'PHP 500.00');
  assert.deepEqual(presentation.existing.nextAction, { href: '/my-registrations', label: 'Continue to payment' });
});

test('registration page keeps backend contracts and progressive review hooks', () => {
  const view = read('src/views/pages/event-register.ejs');
  const script = read('src/public/js/event-register.js');
  const main = read('src/public/js/main.js');
  const profile = read('src/views/partials/quick-profile-modal.ejs');
  const css = read('src/public/css/event-register.css');
  const controller = read('src/controllers/page/registration.controller.js');
  const communication = read('src/services/communication.service.js');
  const email = read('src/services/email.service.js');

  assert.match(view, /action="\/events\/<%= event\.slug %>\/register"/);
  assert.match(view, /name="_csrf"/);
  assert.match(view, /name="participationMode"/);
  assert.match(view, /name="raceDistance"/);
  assert.match(view, /name="waiverAccepted"/);
  assert.match(view, /name="waiverSignature"/);
  assert.match(view, /<select id="raceDistance" name="raceDistance"/);
  assert.match(view, /<option value="" disabled <%= formData\.raceDistance \? '' : 'selected' %>>Select goal or category<\/option>/);
  assert.match(view, /id="raceDistance-<%= index %>"/);
  assert.match(view, /Goals are listed from longest distance to shortest/);
  assert.doesNotMatch(view, /registrationProfile|Update profile|Optional profile update/);
  assert.match(view, /Waiver & review/);
  assert.match(view, /Department or office/);
  assert.match(view, /Position or designation/);
  assert.match(view, /Preferred tracking app or device/);
  assert.match(view, /Leaderboard name display/);
  assert.doesNotMatch(view, /registrationReviewTitle|Ready to check your registration|href="#registrationReview"/);
  assert.match(view, /class="register-actions waiver-register-actions">[\s\S]*id="reviewRegistrationBtn">Review registration<\/button>/);
  assert.match(view, /<details class="waiver-details" id="waiverDetails"/);
  assert.match(view, /errors\.waiverAccepted \|\| errors\.waiverSignature/);
  assert.match(view, /data-validation-locked-open="<%= errors\.waiverAccepted \? 'true' : 'false' %>"/);
  assert.doesNotMatch(view, /quick-profile-modal/);
  assert.match(view, /registrationReviewDialog/);
  assert.doesNotMatch(view, /registrationErrorSummary|Check your registration details/);
  assert.match(script, /registration-client-field-error/);
  assert.match(script, /scrollIntoView/);
  assert.match(view, /Final pricing is validated when you submit/);
  assert.doesNotMatch(view, /Charges and checkout linking will be finalized in the next phase/);
  assert.equal((view.match(/raceDistancePricingPreviewData/g) || []).length, 0);

  assert.match(script, /allowFinalSubmit/);
  assert.match(script, /window\.lucide\?\.createIcons\?\.\(\)/);
  assert.match(script, /Your signature must exactly match your full account name/);
  assert.match(script, /registration:confirmed-submit/);
  assert.match(script, /waiverDetails\.open = true/);
  assert.match(script, /setWaiverValidationLock\(true\)/);
  assert.match(script, /waiverSummary\?\.addEventListener\('click'/);
  assert.match(script, /waiverSummary\?\.addEventListener\('keydown'/);
  assert.match(script, /waiverMustRemainOpen && !waiverAccepted\?\.checked && !waiverDetails\.open/);
  assert.match(main, /allowedDraftFields/);
  assert.match(main, /'participationMode'/);
  assert.doesNotMatch(main.match(/const allowedDraftFields[\s\S]*?\]\);/)?.[0] || '', /waiverSignature|emergencyContact|firstName|email/);

  assert.match(profile, /name="country"/);
  assert.match(profile, /name="dateOfBirth"/);
  assert.match(profile, /name="gender"/);
  assert.match(profile, /name="runningGroupsText"/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /\.registration-review-dialog \{[\s\S]*position: fixed;[\s\S]*inset: 0;[\s\S]*margin: auto;/);
  assert.match(css, /@media \(min-width: 681px\) \{[\s\S]*\.registration-dialog-summary \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(css, /@media \(min-width: 1041px\) \{[\s\S]*\.event-register-form \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.registration-step-nav ol \{[\s\S]*grid-auto-flow: column;[\s\S]*grid-auto-columns: minmax\(0, 1fr\);/);
  assert.doesNotMatch(css, /\.registration-step-nav ol \{[^}]*grid-template-columns: repeat\(4,/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /\.registration-review-dialog \.register-actions \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.registration-review-dialog \.register-actions,[\s\S]*\.registration-state-actions \{\s*display: grid;\s*grid-template-columns: 1fr;/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*\.registration-review-card \{\s*display: none;/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*\.registration-goal-card \{[\s\S]*min-height:\s*58px;[\s\S]*padding:\s*0\.55rem 0\.6rem;/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*\.registration-goal-category,[\s\S]*\.registration-goal-requirement-full,[\s\S]*display:\s*none;/);
  assert.match(view, /registration-goal-requirement-compact">Both goals required/);
  assert.doesNotMatch(css, /\.registration-review-card\s*\{[^}]*border-top:\s*4px solid var\(--register-accent\)/);
  assert.match(controller, /waiverVersion: Number\(event\.waiverVersion \|\| 1\)/);
  assert.match(controller, /participationMode: defaultParticipationMode,\s*raceDistance: allowedRaceDistances\.length === 1 \? allowedRaceDistances\[0\] : '',/);
  assert.match(controller, /Choose at least one tracking app or device\./);
  assert.match(controller, /renderedWaiver,/);
  assert.match(communication, /email\.waiverVersion,[\s\S]*email\.renderedWaiver/);
  assert.match(email, /Accepted event waiver/);
  assert.match(email, /renderWaiverTemplate\(String\(renderedWaiver\)\)/);
});

test('the tracking app field is an optional checkbox group, not required free text', () => {
  // Participants who have never used a tracking app used to be forced to type a name
  // they were guessing at. The field now offers concrete choices and accepts none.
  const form = read('src/views/pages/event-register.ejs');

  assert.match(form, /name="preferredTrackingApps" value="<%= option\.id %>"/);
  assert.match(form, /type="checkbox" id="trackingApp-<%= option\.id %>"/);
  assert.match(form, /Preferred tracking app or device <span class="registration-optional-hint">\(optional\)<\/span>/);
  assert.doesNotMatch(form, /id="preferredFitnessApp"/);

  // Nothing in the tracking fieldset may carry `required`.
  const fieldset = form.slice(form.indexOf('id="participantTrackingApps"'), form.indexOf('<% } %>', form.indexOf('id="participantTrackingApps"')));
  assert.doesNotMatch(fieldset, /\brequired\b/);

  // It must render for tracking events even when no other participant field is required.
  assert.match(form, /event\.requireTrackingAppDevice === true \|\| requiredFields\.has\('preferred_fitness_app'\)/);
});

test('each participant field renders only when the event asks for it', () => {
  // Previously one listed field rendered all of them, so an event wanting a department
  // also collected a contact number and a job title it never used.
  const form = read('src/views/pages/event-register.ejs');

  assert.match(form, /<% if \(requiredFields\.has\('mobile'\)\) \{ %>.*name="mobile"/);
  assert.match(form, /<% if \(requiredFields\.has\('department'\)\) \{ %>.*name="department"/);
  assert.match(form, /<% if \(requiredFields\.has\('position'\)\) \{ %>.*name="position"/);
  assert.match(form, /const showLeaderboardChoice = requiredFields\.has\('leaderboard_consent'\)/);

  // A rendered participant field is always one the event asked for, so it is required.
  assert.doesNotMatch(form, /requiredFields\.has\('mobile'\) \? 'required' : ''/);
  assert.doesNotMatch(form, /requiredFields\.has\('position'\) \? 'required' : ''/);

  // No empty fieldset when the event asks for nothing.
  assert.match(form, /if \(participantFieldCount \|\| showLeaderboardChoice\)/);
});

test('the tracking fieldset degrades instead of 500ing when the option list is absent', () => {
  // Regression: EJS reads the view from disk per render while the controller stays cached
  // in memory, so during a restart a new view can meet an older controller that passes no
  // `trackingAppOptions`. A bare reference to an undefined local is a ReferenceError in
  // EJS, which 500'd the whole registration page. Guard it the way csrfToken is guarded.
  const form = read('src/views/pages/event-register.ejs');

  assert.match(form, /typeof trackingAppOptions !== 'undefined' && Array\.isArray\(trackingAppOptions\)/);
  assert.match(form, /availableTrackingAppOptions\.forEach/);
  assert.doesNotMatch(form, /<% trackingAppOptions\.forEach/);
  // The gate reads the safe local, never the raw one.
  assert.match(form, /showTrackingApps && availableTrackingAppOptions\.length/);
});

test('"Other" and "Not sure yet" behave correctly in the registration form script', () => {
  const script = read('src/public/js/event-register.js');

  // The free-text box is visible without JS and hidden on init, so a no-JS
  // participant can still type an app name.
  assert.match(script, /trackingAppOther\.hidden = !otherChecked/);
  assert.match(script, /updateTrackingAppVisibility\(\);\n    updateReview\(\)/);
  assert.match(script, /applyTrackingAppExclusivity/);
  assert.match(script, /isUndecided \|\| boxIsUndecided/);
});
