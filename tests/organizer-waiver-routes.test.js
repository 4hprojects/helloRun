const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const { applyEventFormData, getCreateEventFormData } = require('../src/services/event-form.service');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3117;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;

test.before(async () => {
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT)
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
  seed = await seedOrganizer('waiver-route');
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupSeed(seed);
  await mongoose.disconnect();
});

test('create and edit event views do not contain mojibake UI artifacts', () => {
  const files = [
    path.join(ROOT, 'src/views/organizer/create-event.ejs'),
    path.join(ROOT, 'src/views/organizer/edit-event.ejs')
  ];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(content, /\u00c3|\u00e2|\u00f0\u0178|[\u{1f4cb}\u{1f4dd}\u{1f4c5}\u{1f4cd}\u{1f3c3}\u{1f3a8}\u2190\u00d7]/u, file);
  }
});

test('create and edit event views expose ordered create-event sections', () => {
  const files = [
    path.join(ROOT, 'src/views/organizer/create-event.ejs'),
    path.join(ROOT, 'src/views/organizer/edit-event.ejs')
  ];
  const requiredSectionClasses = [
    'form-section-core',
    'form-section-schedule',
    'form-section-location',
    'form-section-virtual',
    'form-section-rewards',
    'form-section-fees',
    'form-section-details',
    'form-section-media',
    'form-section-waiver'
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const className of requiredSectionClasses) {
      assert.match(content, new RegExp(className), `${file} should include ${className}`);
    }
    if (file.endsWith('create-event.ejs')) {
      assert.match(content, /form-section-event-type" tabindex="-1"/, `${file} should make Event Type focusable`);
      assert.match(content, /eventTypeSection\.focus\(\{ preventScroll: true \}\)/, `${file} should focus Event Type on load`);
      assert.match(content, /wizard-progress/, `${file} should include guided wizard progress`);
      assert.doesNotMatch(content, /AUTO_SAVE|autosave|hellorun_create_event_draft|draftRestore|draftDiscard|previous session/i, `${file} should not include create-event autosave or recovery code`);
      assert.match(content, /form-section-race-categories/, `${file} should expose the race category step`);
      assert.match(content, /form-section-review/, `${file} should expose the preview and submit step`);
      assert.match(content, /data-event-type-card="virtual"[\s\S]*Virtual Event/, `${file} should explain virtual events`);
      assert.match(content, /raceCategoryHelper\.textContent/, `${file} should update race category guidance by event type`);
    } else {
      assert.match(content, /form-section-event-type" tabindex="-1"/, `${file} should make Event Type focusable`);
      assert.match(content, /eventTypeSection\.focus\(\{ preventScroll: true \}\)/, `${file} should focus Event Type on load`);
      assert.match(content, /wizard-progress/, `${file} should include guided wizard progress`);
      assert.match(content, /form-section-race-categories/, `${file} should expose the race category step`);
      assert.match(content, /form-section-review/, `${file} should expose the review step`);
      assert.match(content, /data-event-type-card="virtual"[\s\S]*Virtual Event/, `${file} should explain virtual events`);
      assert.match(content, /raceCategoryHelper\.textContent/, `${file} should update race category guidance by event type`);
      assert.match(content, /setActiveWizardStep/, `${file} should wire active wizard step state`);
      assert.match(content, /id="submitReviewBtn"[\s\S]*Submit for Review|value="publish"[\s\S]*id="submitReviewBtn"/, `${file} should expose draft submit-for-review action`);
      assert.match(content, /id="actionConfirmOverlay"/, `${file} should include the step action confirmation modal`);
      assert.match(content, /Submit changes for review\?/, `${file} should confirm submit-for-review before proceeding`);
      assert.match(content, /form\.addEventListener\('submit', \(e\) => \{\s*if \(e\.defaultPrevented\) return;/, `${file} should not disable save buttons before confirmation resolves`);
    }
    assert.doesNotMatch(content, /id="title"[\s\S]*?autofocus/, `${file} should not steal focus with the title field`);
    assert.match(content, /Leaderboard Mode[\s\S]*?name="leaderboardRecognitionEnabled"/, `${file} should group leaderboard recognition with leaderboard settings`);
    const rewardsSection = content.match(/form-section-rewards[\s\S]*?form-section-details/);
    assert.ok(rewardsSection, `${file} should include rewards before event details`);
    assert.doesNotMatch(rewardsSection[0], /name="leaderboardRecognitionEnabled"/, `${file} should keep leaderboard recognition out of rewards`);
    assert.match(content, /Rewards, Merchandise, and Registration Packages|Rewards and Inclusions/, `${file} should expose the expanded rewards section`);
    assert.match(content, /Total Event Fee|Pricing Per Distance/, `${file} should expose paid pricing setup`);
    assert.match(content, /name="pricingMode"/, `${file} should expose pricing mode`);
    assert.match(content, /name="physicalRewardMedalEnabled"/, `${file} should expose medal reward item`);
    assert.match(content, /name="physicalRewardMedalAmount"/, `${file} should expose medal amount`);
    assert.match(content, /name="physicalRewardShirtEnabled"/, `${file} should expose shirt reward item`);
    assert.match(content, /name="physicalRewardPatchEnabled"/, `${file} should expose patch reward item`);
    assert.match(content, /name="physicalRewardTowelEnabled"/, `${file} should expose towel reward item`);
    assert.match(content, /name="physicalRewardFinisherKitEnabled"/, `${file} should expose finisher kit reward item`);
    assert.match(content, /name="physicalRewardOtherItemName"/, `${file} should expose custom merchandise items`);
    assert.match(content, /name="deliveryFeeAmount"/, `${file} should expose delivery fee`);
    assert.match(content, /name="claimingMethod"/, `${file} should expose claiming method`);
    assert.match(content, /rebuildPerDistanceFeeRows/, `${file} should wire per-distance fee rows`);
    assert.match(content, /Preview current (setup|changes)\?/, `${file} should confirm preview actions`);
    assert.doesNotMatch(content, /name="minimumActivityDistanceKm"/, `${file} should not expose minimum activity distance`);
    assert.doesNotMatch(content, /name="milestoneDistancesKm"/, `${file} should not expose manual milestone setup`);
    assert.match(content, /Final Submission Deadline[\s\S]*Event End plus 14 days/, `${file} should explain the final submission deadline grace period`);
    assert.match(content, /Virtual Window Start[\s\S]*Defaults to Event Start/, `${file} should explain the virtual window start default`);
    assert.match(content, /Virtual Window End[\s\S]*Defaults to Event End/, `${file} should explain the virtual window end default`);
    assert.match(content, /syncVirtualWindowFromEventDates/, `${file} should auto-fill virtual window dates from event dates`);
    assert.match(content, /virtualStartWasAutoFilled/, `${file} should stop auto-filling virtual start after manual edits`);
    assert.match(content, /virtualEndWasAutoFilled/, `${file} should stop auto-filling virtual end after manual edits`);
  }

  const css = fs.readFileSync(path.join(ROOT, 'src/public/css/create-event.css'), 'utf8');
  const organizerRoutes = fs.readFileSync(path.join(ROOT, 'src/routes/organizer.routes.js'), 'utf8');
  const publicEventDetailsView = fs.readFileSync(path.join(ROOT, 'src/views/pages/event-details.ejs'), 'utf8');
  assert.doesNotMatch(organizerRoutes, /create-event\/autosave|Autosave Draft|CREATE_EVENT_AUTOSAVE|A title is required to autosave/i, 'create-event autosave route should be removed');
  assert.match(organizerRoutes, /buildPublicEventView\(previewEvent/, 'organizer preview should use the public event detail view model');
  assert.match(organizerRoutes, /res\.render\('pages\/event-details'/, 'organizer preview should render the actual public event details page');
  assert.match(publicEventDetailsView, /Preview mode/, 'public event details page should expose a preview mode banner');
  assert.match(publicEventDetailsView, /isPreviewMode[\s\S]*Back to Editor/, 'public event details page should route preview navigation back to the editor');
  assert.doesNotMatch(css, /draft-restore|autosave-status/i, 'create-event recovery and autosave styles should be removed');
  assert.match(css, /\.create-event-form\s*\{[^}]*display:\s*grid/s);
  assert.match(css, /\.wizard-progress\s*\{[^}]*position:\s*sticky/s);
  assert.match(css, /\.form-section:focus\s*\{[^}]*outline:\s*2px solid var\(--border-focus\)/s);
  assert.match(css, /\.form-section-event-type\s*\{[^}]*order:\s*10/s);
  assert.match(css, /\.form-section-core\s*\{[^}]*order:\s*20/s);
  assert.match(css, /\.form-section-schedule\s*\{[^}]*order:\s*30/s);
  assert.match(css, /\.form-section-location\s*\{[^}]*order:\s*40/s);
  assert.match(css, /\.form-section-virtual\s*\{[^}]*order:\s*40/s);
  assert.match(css, /\.form-section-race-categories\s*\{[^}]*order:\s*50/s);
  assert.match(css, /\.form-section-rewards\s*\{[^}]*order:\s*60/s);
  assert.match(css, /\.form-section-fees\s*\{[^}]*order:\s*70/s);
  assert.match(css, /\.form-section-details\s*\{[^}]*order:\s*80/s);
  assert.match(css, /\.form-section-media\s*\{[^}]*order:\s*90/s);
  assert.match(css, /\.form-section-waiver\s*\{[^}]*order:\s*100/s);
  assert.match(css, /\.form-section-review\s*\{[^}]*order:\s*110/s);
});

test('create-event sanitizes waiver html before saving', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);

  const title = `Waiver Sanitize Event ${seed.stamp}`;
  const payload = buildValidCreateEventPayload({
    title,
    waiverTemplate: [
      '<div class="waiver-card">',
      '<h4>Waiver Terms</h4>',
      '<p onclick="alert(1)">I agree to the participation terms and acknowledge all risks.</p>',
      '<script>alert("xss")</script>',
      `<p>${'Safe waiver text '.repeat(20)}</p>`,
      '<p>{{ORGANIZER_NAME}} and {{EVENT_TITLE}}</p>',
      '</div>'
    ].join('')
  });
  await appendCreateEventCsrf(payload, cookie);

  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString(),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  assert.match(String(response.headers.get('location') || ''), /\/organizer\/events\?type=success/i);

  await ensureConnected();
  const event = await Event.findOne({ title }).lean();
  assert.ok(event, 'created event should exist');
  assert.ok(event.waiverTemplate, 'waiver template should be saved');
  assert.doesNotMatch(event.waiverTemplate, /<script/i);
  assert.doesNotMatch(event.waiverTemplate, /\son[a-z]+\s*=/i);
  assert.match(event.waiverTemplate, /\{\{\s*ORGANIZER_NAME\s*\}\}/);
  assert.match(event.waiverTemplate, /\{\{\s*EVENT_TITLE\s*\}\}/);
});

test('approved verified organizer can open create-event page', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Create Event/i);
  assert.match(html, /Event Format/i);
});

test('organizer preview renders actual event details page with multiple race distances', async () => {
  const cookie = seed.organizerCookie || (seed.organizerCookie = await login(seed.organizer.email, seed.password));
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);

  const params = buildValidCreateEventPayload({
    title: `Preview Multi Distance ${seed.stamp}`
  });
  params.set('eventType', 'virtual');
  params.set('virtualCompletionMode', 'accumulated_distance');
  params.set('targetDistanceKm', '10');
  params.delete('raceDistancePresets');
  params.append('raceDistancePresets', '10K');
  params.set('raceDistanceCustom', '25, 50 km, 100');
  params.set('previewSource', 'create');
  params.delete('_csrf');

  const response = await fetch(`${BASE_URL}/organizer/preview-event?${params.toString()}`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Preview mode/i);
  assert.match(html, /How This Event Works/i);
  assert.match(html, /<span>Registration Options<\/span>\s*<strong>10K, 25K, 50K, 100K<\/strong>/i);
  assert.match(html, /Registration options:<\/strong>\s*10K, 25K, 50K, 100K\./i);
  assert.match(html, /<strong>10 km<\/strong>\s*<span>Completion goal<\/span>/i);
  assert.match(html, /<strong>Registration Options<\/strong><span>10K, 25K, 50K, 100K<\/span>/i);
  assert.match(html, /<strong>Completion Goal<\/strong><span>10 km<\/span>/i);
  assert.doesNotMatch(html, /organizer-event-preview-page/i);
});

test('pending organizer sees create-event modal only on dashboard action and must sign matching account name', async () => {
  const cookie = seed.organizerCookie || (seed.organizerCookie = await login(seed.organizer.email, seed.password));
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);

  await ensureConnected();
  await User.updateOne(
    { _id: seed.organizer._id },
    {
      $set: { organizerStatus: 'pending' },
      $unset: { organizerEventCreationAcknowledgement: '' }
    }
  );

  try {
    const dashboardResponse = await fetch(`${BASE_URL}/organizer/dashboard`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    assert.equal(dashboardResponse.status, 200);
    const dashboardHtml = await dashboardResponse.text();
    assert.match(dashboardHtml, /id="pendingCreateEventTrigger"/);
    assert.match(dashboardHtml, /id="pendingCreateEventModal"[\s\S]*hidden/);
    assert.match(dashboardHtml, /Create New Event/);

    const blockedResponse = await fetch(`${BASE_URL}/organizer/create-event`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    assert.equal(blockedResponse.status, 403);

    const badAckPayload = new URLSearchParams({
      agreedCheckbox: '1',
      signatureName: 'Wrong Name'
    });
    await appendDashboardCsrf(badAckPayload, cookie);
    const badAckResponse = await fetch(`${BASE_URL}/organizer/acknowledge-event-creation`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: badAckPayload.toString(),
      redirect: 'manual'
    });
    assert.equal(badAckResponse.status, 302);
    assert.match(String(badAckResponse.headers.get('location') || ''), /ack_error=signature_mismatch/);

    const goodAckPayload = new URLSearchParams({
      agreedCheckbox: '1',
      signatureName: 'Waiver Owner'
    });
    await appendDashboardCsrf(goodAckPayload, cookie);
    const goodAckResponse = await fetch(`${BASE_URL}/organizer/acknowledge-event-creation`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: goodAckPayload.toString(),
      redirect: 'manual'
    });
    assert.equal(goodAckResponse.status, 302);
    assert.equal(goodAckResponse.headers.get('location'), '/organizer/create-event');

    const updatedUser = await User.findById(seed.organizer._id).lean();
    assert.ok(updatedUser.organizerEventCreationAcknowledgement?.agreedAt);
    assert.equal(updatedUser.organizerEventCreationAcknowledgement.signatureName, 'Waiver Owner');

    const acknowledgedDashboardResponse = await fetch(`${BASE_URL}/organizer/dashboard`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    assert.equal(acknowledgedDashboardResponse.status, 200);
    const acknowledgedDashboardHtml = await acknowledgedDashboardResponse.text();
    assert.match(acknowledgedDashboardHtml, /id="pendingCreateEventTrigger"[\s\S]*data-pending-create-event-trigger/);
    assert.match(acknowledgedDashboardHtml, /Acknowledgement already recorded/i);
    assert.match(acknowledgedDashboardHtml, /Continue to Create Event/i);

    const allowedResponse = await fetch(`${BASE_URL}/organizer/create-event`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    assert.equal(allowedResponse.status, 200);
  } finally {
    await User.updateOne(
      { _id: seed.organizer._id },
      {
        $set: { organizerStatus: 'approved' },
        $unset: { organizerEventCreationAcknowledgement: '' }
      }
    );
  }
});

test('create-event page opens with guided blank defaults and new event setup fields', async () => {
  const cookie = seed.organizerCookie || (seed.organizerCookie = await login(seed.organizer.email, seed.password));
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.doesNotMatch(html, /2026K Accumulated Run Challenge/i);
  assert.match(html, /id="title" name="title" type="text" value=""/i);
  assert.match(html, /id="organiserName" name="organiserName" type="text" value="Waiver Owner"/i);
  assert.match(html, /Defaults to the account owner's name/i);
  assert.match(html, /id="description"[\s\S]*?>\s*<\/textarea>/i);
  assert.match(html, /id="eventDetailsMarkdown"[\s\S]*?>\s*<\/textarea>/i);
  assert.match(html, /id="eventType"[\s\S]*<option value="">Select event type<\/option>/i);
  assert.match(html, /id="raceDistanceCustom" name="raceDistanceCustom" type="text" value=""/i);
  assert.match(html, /<option value="free" selected>Free<\/option>/i);
  assert.match(html, /id="feeCurrency" name="feeCurrency" type="text" value="PHP"/i);
  assert.match(html, /<option value="accumulated_distance" selected>Accumulated distance challenge<\/option>/i);
  assert.doesNotMatch(html, /name="minimumActivityDistanceKm"/i);
  assert.doesNotMatch(html, /name="milestoneDistancesKm"/i);
  assert.match(html, /name="eventDetailsMarkdown"/i);
  assert.match(html, /name="feeMode"/i);
  assert.match(html, /Pricing Per Distance/i);
  assert.match(html, /Payment QR Image/i);
  assert.match(html, /Digital Finisher Certificate/i);
  assert.match(html, /name="physicalRewardMedalEnabled"/i);
  assert.match(html, /name="physicalRewardPatchEnabled"/i);
});

test('organizer edit-event page uses wizard UI and preserves draft submit action with media controls', async () => {
  const cookie = seed.organizerCookie || (seed.organizerCookie = await login(seed.organizer.email, seed.password));
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const event = await seedEditableEvent(seed, { status: 'draft', title: `Editable Draft ${seed.stamp}` });

  const response = await fetch(`${BASE_URL}/organizer/events/${event._id}/edit`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Edit Event/i);
  assert.match(html, /Update setup, preview changes, and submit drafts for review/i);
  assert.match(html, /wizard-progress/i);
  assert.match(html, /id="event-type-step"/i);
  assert.match(html, /id="race-categories-step"/i);
  assert.match(html, /id="review-step"/i);
  assert.match(html, /Editable Draft/i);
  assert.match(html, /id="physicalRewardsEnabled"[\s\S]*checked/i);
  assert.match(html, /name="physicalRewardMedalEnabled"[\s\S]*checked/i);
  assert.match(html, /name="physicalRewardMedalAmount"[\s\S]*value="125"/i);
  assert.match(html, /Edit reward details with courier instructions/i);
  assert.match(html, /Editable (?:&quot;|&#34;|\\")quoted(?:&quot;|&#34;|\\") event details/i);
  assert.match(html, /Existing edit waiver template/i);
  assert.match(html, /id="submitReviewBtn"[\s\S]*Submit for Review|value="publish"[\s\S]*id="submitReviewBtn"/i);
  assert.match(html, /id="removeLogoBtn"/i);
  assert.match(html, /media\/remove/i);
});

test('published edit-event page hides draft submit-for-review action', async () => {
  const cookie = seed.organizerCookie || (seed.organizerCookie = await login(seed.organizer.email, seed.password));
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const event = await seedEditableEvent(seed, { status: 'published', title: `Editable Published ${seed.stamp}` });

  const response = await fetch(`${BASE_URL}/organizer/events/${event._id}/edit`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /wizard-progress/i);
  assert.match(html, /Editable Published/i);
  assert.doesNotMatch(html, /id="submitReviewBtn"/i);
  assert.match(html, /id="saveBtn"/i);
  assert.match(html, /id="previewBtn"/i);
});

test('create-event form normalization returns guided blank defaults without a request body', () => {
  const formData = getCreateEventFormData();

  assert.equal(formData.title, '');
  assert.equal(formData.description, '');
  assert.equal(formData.eventDetailsMarkdown, '');
  assert.equal(formData.eventType, '');
  assert.deepEqual(formData.raceDistances, []);
  assert.equal(formData.raceDistanceCustom, '');
  assert.equal(formData.registrationOpenAt, '');
  assert.equal(formData.eventStartAt, '');
  assert.equal(formData.virtualCompletionMode, 'accumulated_distance');
  assert.deepEqual(formData.acceptedRunTypes, ['run', 'walk', 'hike', 'trail_run']);
  assert.equal(formData.recognitionMode, 'completion_with_optional_ranking');
  assert.equal(formData.leaderboardMode, 'finishers_and_top_distance');
  assert.equal(formData.feeMode, 'free');
  assert.equal(formData.feeCurrency, 'PHP');
  assert.equal(formData.pricingMode, 'free');
  assert.equal(formData.digitalBadgeEnabled, true);
  assert.equal(formData.digitalCertificateEnabled, true);
  assert.equal(formData.leaderboardRecognitionEnabled, true);
  assert.match(formData.waiverTemplate, /Waiver and Release Form Acknowledgment/i);
});

test('create-event form normalization still supports explicit 2026K accumulated challenge data', () => {
  const formData = getCreateEventFormData({
    title: '2026K Accumulated Run Challenge',
    description: 'A year-long accumulated challenge with enough detail for validation.',
    eventType: 'virtual',
    raceDistanceCustom: '2026K',
    registrationOpenAt: '2026-05-08T00:00',
    registrationCloseAt: '2026-05-31T23:59',
    eventStartAt: '2026-01-01T00:00',
    eventEndAt: '2026-12-31T23:59',
    virtualStartAt: '2026-01-01T00:00',
    virtualEndAt: '2026-12-31T23:59',
    proofTypesAllowed: ['gps', 'photo'],
    virtualCompletionMode: 'accumulated_distance',
    targetDistanceKm: '2026',
    finalSubmissionDeadlineAt: '2026-12-31T23:59',
    acceptedRunTypes: ['run', 'walk', 'hike', 'trail_run'],
    recognitionMode: 'completion_with_optional_ranking',
    leaderboardMode: 'finishers_and_top_distance',
    feeMode: 'free',
    feeCurrency: 'PHP',
    digitalBadgeEnabled: '1',
    digitalCertificateEnabled: '1',
    leaderboardRecognitionEnabled: '1'
  });

  assert.equal(formData.title, '2026K Accumulated Run Challenge');
  assert.deepEqual(formData.raceDistances, ['2026K']);
  assert.equal(formData.virtualCompletionMode, 'accumulated_distance');
  assert.equal(formData.targetDistanceKm, 2026);
  assert.deepEqual(formData.proofTypesAllowed, ['gps', 'photo']);
  assert.deepEqual(formData.acceptedRunTypes, ['run', 'walk', 'hike', 'trail_run']);
  assert.equal(formData.digitalBadgeEnabled, true);
  assert.equal(formData.digitalCertificateEnabled, true);
  assert.equal(formData.leaderboardRecognitionEnabled, true);
});

test('create-event form normalization treats bare custom distances as kilometers', () => {
  const formData = getCreateEventFormData({
    eventType: 'virtual',
    raceDistancePresets: ['10K'],
    raceDistanceCustom: '10k, 25, 50 km, 100',
    virtualCompletionMode: 'accumulated_distance'
  });

  assert.deepEqual(formData.raceDistances, ['10K', '25K', '50K', '100K']);
  assert.equal(formData.targetDistanceKm, null);
});

test('applyEventFormData clears physical reward item flags when physical rewards are disabled', () => {
  const event = {
    physicalRewardMedalEnabled: true,
    physicalRewardMedalAmount: 100,
    physicalRewardShirtEnabled: true,
    physicalRewardShirtAmount: 200,
    physicalRewardPatchEnabled: true,
    physicalRewardPatchAmount: 50,
    physicalRewardTowelEnabled: true,
    physicalRewardTowelAmount: 75,
    physicalRewardFinisherKitEnabled: true,
    physicalRewardFinisherKitAmount: 300,
    physicalRewardOtherItems: [{ name: 'Sticker', amount: 20 }],
    physicalRewardsDescription: 'Existing rewards',
    waiverTemplate: ''
  };
  const formData = getCreateEventFormData({
    title: 'Disabled Physical Rewards Event',
    organiserName: 'Organizer',
    description: 'A valid description for form normalization.',
    eventType: 'virtual',
    raceDistancePresets: '5K',
    registrationOpenAt: '2026-01-01T00:00',
    registrationCloseAt: '2026-01-02T00:00',
    eventStartAt: '2026-01-03T00:00',
    eventEndAt: '2026-01-04T00:00',
    virtualStartAt: '2026-01-03T00:00',
    virtualEndAt: '2026-01-04T00:00',
    proofTypesAllowed: 'gps',
    feeMode: 'free',
    physicalRewardMedalEnabled: '1',
    physicalRewardMedalAmount: '100',
    physicalRewardShirtEnabled: '1',
    physicalRewardShirtAmount: '200',
    physicalRewardPatchEnabled: '1',
    physicalRewardPatchAmount: '50',
    physicalRewardTowelEnabled: '1',
    physicalRewardTowelAmount: '75',
    physicalRewardFinisherKitEnabled: '1',
    physicalRewardFinisherKitAmount: '300',
    physicalRewardOtherItemName: 'Sticker',
    physicalRewardOtherItemAmount: '20',
    physicalRewardsDescription: 'Should be cleared'
  });

  applyEventFormData(event, formData, null);

  assert.equal(event.physicalRewardsEnabled, false);
  assert.equal(event.physicalRewardMedalEnabled, false);
  assert.equal(event.physicalRewardMedalAmount, null);
  assert.equal(event.physicalRewardShirtEnabled, false);
  assert.equal(event.physicalRewardShirtAmount, null);
  assert.equal(event.physicalRewardPatchEnabled, false);
  assert.equal(event.physicalRewardPatchAmount, null);
  assert.equal(event.physicalRewardTowelEnabled, false);
  assert.equal(event.physicalRewardTowelAmount, null);
  assert.equal(event.physicalRewardFinisherKitEnabled, false);
  assert.equal(event.physicalRewardFinisherKitAmount, null);
  assert.deepEqual(event.physicalRewardOtherItems, []);
  assert.equal(event.physicalRewardsDescription, '');
});

test('create-event form normalization supports organizer setup pricing fields', () => {
  const formData = getCreateEventFormData({
    title: 'Organizer Setup Event',
    feeMode: 'paid',
    pricingMode: 'package_period',
    physicalRewardsEnabled: '1',
    physicalRewardMedalEnabled: '1',
    physicalRewardMedalAmount: '100',
    physicalRewardTowelEnabled: '1',
    physicalRewardTowelAmount: '75',
    physicalRewardOtherItemName: ['Sticker', ''],
    physicalRewardOtherItemAmount: ['25', ''],
    registrationPackageName: ['Medal Only'],
    registrationPackageMedal_0: '1',
    registrationPackageEarlyBirdStartAt: ['2026-05-01T00:00'],
    registrationPackageEarlyBirdEndAt: ['2026-05-10T23:59'],
    registrationPackageEarlyBirdAmount: ['500'],
    deliveryFeeEnabled: '1',
    deliveryFeeAmount: '100',
    claimingMethod: 'both',
    specialRewardBenefitTitle: ['Free engraving'],
    specialRewardBenefitDescription: ['Available for early orders'],
    specialRewardBenefitValidUntil: ['2026-05-10T23:59'],
    finalEventFee: '700'
  });

  assert.equal(formData.pricingMode, 'package_period');
  assert.equal(formData.physicalRewardMedalAmount, 100);
  assert.equal(formData.physicalRewardTowelEnabled, true);
  assert.deepEqual(formData.physicalRewardOtherItems, [{ name: 'Sticker', amount: 25 }]);
  assert.equal(formData.registrationPackages.length, 1);
  assert.equal(formData.registrationPackages[0].pricingPeriods[0].amount, 500);
  assert.equal(formData.deliveryFeeEnabled, true);
  assert.equal(formData.claimingMethod, 'both');
  assert.equal(formData.specialRewardBenefits[0].title, 'Free engraving');
  assert.equal(formData.suggestedEventFee, 800);
  assert.equal(formData.finalEventFee, 700);
});

test('approved unverified organizer cannot open create-event page', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  await ensureConnected();
  await User.updateOne({ _id: seed.organizer._id }, { $set: { emailVerified: false } });

  try {
    const response = await fetch(`${BASE_URL}/organizer/create-event`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });

    assert.equal(response.status, 403);
  } finally {
    await User.updateOne({ _id: seed.organizer._id }, { $set: { emailVerified: true } });
  }
});

test('create-event draft can save with title only', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const title = `Partial Draft Event ${seed.stamp}`;
  const payload = new URLSearchParams({
    title,
    actionType: 'draft'
  });
  await appendCreateEventCsrf(payload, cookie);

  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString(),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  await ensureConnected();
  const event = await Event.findOne({ title }).lean();
  assert.ok(event, 'draft event should be saved');
  assert.equal(event.status, 'draft');
  assert.equal(event.virtualCompletionMode, 'single_activity');
});

test('create-event publish rejects incomplete event data', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const payload = new URLSearchParams({
    title: `Incomplete Publish Event ${seed.stamp}`,
    actionType: 'publish'
  });
  await appendCreateEventCsrf(payload, cookie);

  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString(),
    redirect: 'manual'
  });

  assert.equal(response.status, 400);
  const html = await response.text();
  assert.match(html, /Description must be at least 20 characters/i);
});

test('create-event submit for review accepts valid single-activity virtual event', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const title = `Published Single Activity Event ${seed.stamp}`;
  const payload = buildValidCreateEventPayload({
    title,
    actionType: 'publish',
    virtualCompletionMode: 'single_activity'
  });
  await appendCreateEventCsrf(payload, cookie);

  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString(),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  await ensureConnected();
  const event = await Event.findOne({ title }).lean();
  assert.ok(event, 'pending review event should be saved');
  assert.equal(event.status, 'pending_review');
  assert.ok(event.submittedForReviewAt);
  assert.equal(event.virtualCompletionMode, 'single_activity');
});

test('create-event accumulated-distance draft saves setup fields', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const title = `Accumulated Draft Event ${seed.stamp}`;
  const payload = new URLSearchParams({
    title,
    eventType: 'virtual',
    actionType: 'draft',
    virtualCompletionMode: 'accumulated_distance',
    targetDistanceKm: '100',
    finalSubmissionDeadlineAt: toLocalDateTimeString(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
    recognitionMode: 'completion_with_optional_ranking',
    leaderboardMode: 'finishers_and_top_distance'
  });
  payload.append('acceptedRunTypes', 'run');
  payload.append('acceptedRunTypes', 'walk');
  payload.append('acceptedRunTypes', 'hike');
  payload.append('acceptedRunTypes', 'trail_run');
  await appendCreateEventCsrf(payload, cookie);

  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString(),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  await ensureConnected();
  const event = await Event.findOne({ title }).lean();
  assert.ok(event, 'accumulated draft should be saved');
  assert.equal(event.status, 'draft');
  assert.equal(event.virtualCompletionMode, 'accumulated_distance');
  assert.equal(event.targetDistanceKm, 100);
  assert.equal(event.minimumActivityDistanceKm, null);
  assert.deepEqual(event.acceptedRunTypes, ['run', 'walk', 'hike', 'trail_run']);
  assert.deepEqual(event.milestoneDistancesKm, []);
  assert.equal(event.recognitionMode, 'completion_with_optional_ranking');
  assert.equal(event.leaderboardMode, 'finishers_and_top_distance');
});

test('create-event accumulated-distance publish accepts configured challenge', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const title = `Accumulated Publish Event ${seed.stamp}`;
  const payload = buildValidCreateEventPayload({
    title,
    actionType: 'publish',
    virtualCompletionMode: 'accumulated_distance'
  });
  payload.set('targetDistanceKm', '100');
  payload.append('acceptedRunTypes', 'run');
  await appendCreateEventCsrf(payload, cookie);

  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString(),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  await ensureConnected();
  const event = await Event.findOne({ title }).lean();
  assert.ok(event, 'accumulated event should be saved');
  assert.equal(event.status, 'pending_review');
  assert.equal(event.virtualCompletionMode, 'accumulated_distance');
  assert.equal(event.targetDistanceKm, 100);
  assert.equal(event.minimumActivityDistanceKm, null);
  assert.deepEqual(event.acceptedRunTypes, ['run']);
  assert.ok(event.finalSubmissionDeadlineAt);
  const expectedDeadline = new Date(payload.get('eventEndAt'));
  expectedDeadline.setDate(expectedDeadline.getDate() + 14);
  assert.equal(toLocalDateTimeString(event.finalSubmissionDeadlineAt), toLocalDateTimeString(expectedDeadline));
  assert.deepEqual(event.milestoneDistancesKm, []);
});

test('create-event accumulated-distance publish rejects missing challenge setup', async () => {
  const cookie = await login(seed.organizer.email, seed.password);
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const payload = buildValidCreateEventPayload({
    title: `Accumulated Publish Missing Setup ${seed.stamp}`,
    actionType: 'publish',
    virtualCompletionMode: 'accumulated_distance'
  });
  payload.delete('targetDistanceKm');
  payload.append('raceDistancePresets', '10K');
  payload.delete('acceptedRunTypes');
  await appendCreateEventCsrf(payload, cookie);

  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString(),
    redirect: 'manual'
  });

  assert.equal(response.status, 400);
  const html = await response.text();
  assert.match(html, /Select at least one accepted activity type/i);
});

test('create-event paid publish allows blank fee amount but still requires payment QR', async () => {
  const cookie = seed.organizerCookie || (seed.organizerCookie = await login(seed.organizer.email, seed.password));
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const payload = buildValidCreateEventPayload({
    title: `Paid Missing QR Event ${seed.stamp}`,
    actionType: 'publish'
  });
  payload.set('feeMode', 'paid');
  payload.delete('feeAmount');
  payload.delete('paymentQrImageUrl');
  await appendCreateEventCsrf(payload, cookie);

  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString(),
    redirect: 'manual'
  });

  assert.equal(response.status, 400);
  const html = await response.text();
  assert.doesNotMatch(html, /Fee amount is required for paid events/i);
  assert.doesNotMatch(html, /Paid event amount must be zero or higher/i);
  assert.match(html, /Payment QR image is required/i);
});

test('create-event paid publish persists fee payment and reward setup', async () => {
  const cookie = seed.organizerCookie || (seed.organizerCookie = await login(seed.organizer.email, seed.password));
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const title = `Paid Configured Event ${seed.stamp}`;
  const payload = buildValidCreateEventPayload({
    title,
    actionType: 'publish'
  });
  payload.set('eventDetailsMarkdown', '# Paid Event Details\n\nFull editable details.');
  payload.set('feeMode', 'paid');
  payload.set('feeAmount', '599');
  payload.set('feeCurrency', 'PHP');
  payload.set('paymentQrImageUrl', 'https://example.com/payment-qr.png');
  payload.set('paymentQrImageKey', 'event-payments/qr/test/payment-qr.png');
  payload.set('paymentAccountName', 'HelloRun Payments');
  payload.set('paymentInstructions', 'Upload proof after payment.');
  payload.set('digitalBadgeEnabled', '1');
  payload.set('digitalCertificateEnabled', '1');
  payload.set('leaderboardRecognitionEnabled', '1');
  payload.set('physicalRewardsEnabled', '1');
  payload.set('physicalRewardMedalEnabled', '1');
  payload.set('physicalRewardMedalAmount', '100');
  payload.set('physicalRewardShirtEnabled', '1');
  payload.set('physicalRewardShirtAmount', '200');
  payload.set('physicalRewardPatchEnabled', '1');
  payload.set('physicalRewardPatchAmount', '50');
  payload.set('physicalRewardTowelEnabled', '1');
  payload.set('physicalRewardTowelAmount', '75');
  payload.set('physicalRewardFinisherKitEnabled', '1');
  payload.set('physicalRewardFinisherKitAmount', '300');
  payload.append('physicalRewardOtherItemName', 'Sticker');
  payload.append('physicalRewardOtherItemAmount', '25');
  payload.set('physicalRewardsDescription', 'Medal and shirt package.');
  payload.set('physicalRewardsClaimingNotes', 'Claim by courier.');
  payload.set('pricingMode', 'package_period');
  payload.set('finalEventFee', '1299');
  payload.append('registrationPackageName', 'Medal + Shirt');
  payload.set('registrationPackageMedal_0', '1');
  payload.set('registrationPackageShirt_0', '1');
  payload.append('registrationPackageOtherItemNames', 'Sticker');
  payload.append('registrationPackageEarlyBirdStartAt', '2026-05-01T00:00');
  payload.append('registrationPackageEarlyBirdEndAt', '2026-05-10T23:59');
  payload.append('registrationPackageEarlyBirdAmount', '999');
  payload.append('registrationPackageRegularStartAt', '');
  payload.append('registrationPackageRegularEndAt', '');
  payload.append('registrationPackageRegularAmount', '');
  payload.append('registrationPackageLateStartAt', '');
  payload.append('registrationPackageLateEndAt', '');
  payload.append('registrationPackageLateAmount', '');
  payload.append('registrationPackageNotes', 'Includes medal and shirt.');
  payload.set('deliveryFeeEnabled', '1');
  payload.set('deliveryFeeAmount', '100');
  payload.set('deliveryFeeDescription', 'Flat local delivery.');
  payload.set('requiresDeliveryAddress', '1');
  payload.set('requiresPhilippineDeliveryAddress', '1');
  payload.set('internationalRunnersAllowed', '0');
  payload.set('claimingMethod', 'both');
  payload.append('specialRewardBenefitTitle', 'Free engraving');
  payload.append('specialRewardBenefitDescription', 'Available during early bird.');
  payload.append('specialRewardBenefitValidUntil', '2026-05-10T23:59');
  payload.append('specialRewardBenefitPackageNames', 'Medal + Shirt');
  await appendCreateEventCsrf(payload, cookie);

  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString(),
    redirect: 'manual'
  });

  assert.equal(response.status, 302);
  await ensureConnected();
  const event = await Event.findOne({ title }).lean();
  assert.ok(event, 'paid event should be saved');
  assert.equal(event.status, 'pending_review');
  assert.equal(event.feeMode, 'paid');
  assert.equal(event.feeAmount, 599);
  assert.equal(event.feeCurrency, 'PHP');
  assert.equal(event.paymentQrImageUrl, 'https://example.com/payment-qr.png');
  assert.equal(event.paymentAccountName, 'HelloRun Payments');
  assert.equal(event.digitalBadgeEnabled, true);
  assert.equal(event.digitalCertificateEnabled, true);
  assert.equal(event.leaderboardRecognitionEnabled, true);
  assert.equal(event.physicalRewardsEnabled, true);
  assert.equal(event.physicalRewardMedalEnabled, true);
  assert.equal(event.physicalRewardMedalAmount, 100);
  assert.equal(event.physicalRewardShirtEnabled, true);
  assert.equal(event.physicalRewardShirtAmount, 200);
  assert.equal(event.physicalRewardPatchEnabled, true);
  assert.equal(event.physicalRewardPatchAmount, 50);
  assert.equal(event.physicalRewardTowelEnabled, true);
  assert.equal(event.physicalRewardTowelAmount, 75);
  assert.equal(event.physicalRewardFinisherKitEnabled, true);
  assert.equal(event.physicalRewardFinisherKitAmount, 300);
  assert.deepEqual(event.physicalRewardOtherItems.map((item) => ({ name: item.name, amount: item.amount })), [{ name: 'Sticker', amount: 25 }]);
  assert.equal(event.physicalRewardsDescription, 'Medal and shirt package.');
  assert.equal(event.physicalRewardsClaimingNotes, 'Claim by courier.');
  assert.equal(event.pricingMode, 'package_period');
  assert.equal(event.finalEventFee, 1299);
  assert.equal(event.registrationPackages.length, 1);
  assert.equal(event.registrationPackages[0].name, 'Medal + Shirt');
  assert.equal(event.registrationPackages[0].pricingPeriods[0].amount, 999);
  assert.equal(event.deliveryFeeEnabled, true);
  assert.equal(event.deliveryFeeAmount, 100);
  assert.equal(event.claimingMethod, 'both');
  assert.equal(event.requiresDeliveryAddress, true);
  assert.equal(event.requiresPhilippineDeliveryAddress, true);
  assert.equal(event.internationalRunnersAllowed, false);
  assert.equal(event.specialRewardBenefits.length, 1);
  assert.equal(event.specialRewardBenefits[0].title, 'Free engraving');
  assert.match(event.eventDetailsMarkdown, /Paid Event Details/);
});

test('create-event rejects invalid organizer setup amounts and pricing periods', async () => {
  const cookie = seed.organizerCookie || (seed.organizerCookie = await login(seed.organizer.email, seed.password));
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);
  const payload = buildValidCreateEventPayload({
    title: `Invalid Organizer Setup ${seed.stamp}`,
    actionType: 'publish'
  });
  payload.set('physicalRewardsEnabled', '1');
  payload.set('physicalRewardMedalEnabled', '1');
  payload.set('physicalRewardMedalAmount', '-1');
  payload.set('registrationPackageName', 'Broken Package');
  payload.set('registrationPackageEarlyBirdAmount', '500');
  await appendCreateEventCsrf(payload, cookie);

  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString(),
    redirect: 'manual'
  });

  assert.equal(response.status, 400);
  const html = await response.text();
  assert.match(html, /Medal amount must be zero or higher/i);
  assert.match(html, /Pricing period start date is required/i);
  assert.match(html, /Pricing period end date is required/i);
});

test('create-event rejects waiver rich html with insufficient plain text', async () => {
  const cookie = seed.organizerCookie || (seed.organizerCookie = await login(seed.organizer.email, seed.password));
  const ready = await waitForSessionReady('/organizer/dashboard', cookie);
  assert.equal(ready, true);

  const payload = buildValidCreateEventPayload({
    title: `Waiver Too Short Event ${seed.stamp}`,
    actionType: 'publish',
    waiverTemplate: '<div><h4>Header</h4><p><br></p><p><em>   </em></p></div>'
  });
  await appendCreateEventCsrf(payload, cookie);

  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString(),
    redirect: 'manual'
  });

  assert.equal(response.status, 400);
  const html = await response.text();
  assert.match(html, /Waiver template must be at least 200 characters\./i);
});

function buildValidCreateEventPayload(overrides = {}) {
  const now = new Date();
  const registrationOpen = toLocalDateTimeString(new Date(now.getTime() + 60 * 60 * 1000));
  const registrationClose = toLocalDateTimeString(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const eventStart = toLocalDateTimeString(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000));
  const eventEnd = toLocalDateTimeString(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000));
  const virtualStart = toLocalDateTimeString(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000));
  const virtualEnd = toLocalDateTimeString(new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000));

  const params = new URLSearchParams({
    title: overrides.title || `Organizer Waiver Event ${Date.now()}`,
    organiserName: 'Waiver Organizer',
    description: 'This description is intentionally long enough for create-event validation.',
    eventType: 'virtual',
    registrationOpenAt: registrationOpen,
    registrationCloseAt: registrationClose,
    eventStartAt: eventStart,
    eventEndAt: eventEnd,
    virtualStartAt: virtualStart,
    virtualEndAt: virtualEnd,
    raceDistanceCustom: '',
    waiverTemplate: overrides.waiverTemplate || `<p>${'I accept all waiver terms and conditions. '.repeat(12)}</p>`,
    actionType: overrides.actionType || 'draft',
    virtualCompletionMode: overrides.virtualCompletionMode || 'single_activity'
  });
  params.append('raceDistancePresets', '5K');
  params.append('proofTypesAllowed', 'gps');
  return params;
}

async function appendCreateEventCsrf(payload, cookie) {
  const response = await fetch(`${BASE_URL}/organizer/create-event`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  const match = html.match(/name="_csrf"\s+value="([^"]*)"/i);
  assert.ok(match, 'create-event page should include csrf token');
  payload.set('_csrf', match[1]);
}

async function appendDashboardCsrf(payload, cookie) {
  const response = await fetch(`${BASE_URL}/organizer/dashboard`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  const match = html.match(/name="_csrf"\s+value="([^"]*)"/i);
  assert.ok(match, 'organizer dashboard should include csrf token');
  payload.set('_csrf', match[1]);
}

function toLocalDateTimeString(value) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

async function seedOrganizer(tag, options = {}) {
  await ensureConnected();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const organizer = await User.create({
    userId: `UOWR${stamp}`.slice(0, 22),
    email: `org.waiver.${tag}.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Waiver',
    lastName: 'Owner',
    emailVerified: options.emailVerified !== false
  });

  return {
    stamp,
    password,
    extraUsers: [],
    organizer: {
      _id: organizer._id,
      email: organizer.email
    }
  };
}

async function seedEditableEvent(currentSeed, overrides = {}) {
  await ensureConnected();
  const now = Date.now();
  return Event.create({
    organizerId: currentSeed.organizer._id,
    slug: `editable-${currentSeed.stamp}-${String(overrides.status || 'draft')}-${Math.floor(Math.random() * 100000)}`.toLowerCase(),
    title: overrides.title || `Editable Event ${currentSeed.stamp}`,
    organiserName: 'Waiver Owner',
    description: 'This editable event description is intentionally long enough for validation.',
    eventDetailsMarkdown: '<p>Editable "quoted" event details and runner instructions.</p>',
    status: overrides.status || 'draft',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now + 24 * 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 2 * 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 4 * 24 * 60 * 60 * 1000),
    virtualWindow: {
      startAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
      endAt: new Date(now + 4 * 24 * 60 * 60 * 1000)
    },
    proofTypesAllowed: ['gps'],
    virtualCompletionMode: 'single_activity',
    feeMode: 'free',
    feeCurrency: 'PHP',
    physicalRewardsEnabled: true,
    physicalRewardMedalEnabled: true,
    physicalRewardMedalAmount: 125,
    physicalRewardShirtEnabled: true,
    physicalRewardShirtAmount: 250,
    physicalRewardsDescription: 'Edit reward details with courier instructions.',
    physicalRewardsClaimingNotes: 'Bring your valid ID at claiming.',
    claimingMethod: 'both',
    deliveryFeeAmount: 89,
    deliveryFeeDescription: 'Doorstep delivery or race-kit pickup.',
    requiresDeliveryAddress: true,
    logoUrl: 'https://example.com/logo.png',
    waiverTemplate: `<p>Existing edit waiver template. ${'I accept all waiver terms and conditions. '.repeat(12)}</p>`
  });
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed || !currentSeed.stamp) return;
  await ensureConnected();
  const userIds = [currentSeed.organizer._id, ...(currentSeed.extraUsers || [])].filter(Boolean);
  await Promise.all([
    Event.deleteMany({ title: new RegExp(escapeRegex(currentSeed.stamp), 'i') }),
    User.deleteMany({ _id: { $in: userIds } })
  ]);
}

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }),
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie);
  return setCookie.split(';')[0];
}

async function waitForSessionReady(pathname, cookie) {
  const maxAttempts = 8;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      method: 'GET',
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.headers.get('location') !== '/login') return true;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return false;
}

async function waitForServerReady() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.status >= 200 && response.status < 500) return;
    } catch (error) {
      // server booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
