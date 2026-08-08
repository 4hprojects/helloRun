'use strict';

// Two things that were quietly lying.
//
// A guest cancellation filed a delivery failure that never happened, and the
// step-competition flag hid its controls while the server accepted the fields anyway.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Event = require('../src/models/Event');
const { applyEventFormData } = require('../src/services/event-form.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

// --- A guest has no in-app inbox -------------------------------------------------------------

test('no account to notify is not a delivery failure', () => {
  // createNotification throws on a null userId, createNotificationSafe swallowed it, and
  // the log row went in as `failed` — so every guest cancellation filed a false failure,
  // which is exactly the noise that buries a real one.
  const service = read('src/services/communication.service.js');
  assert.match(service, /if \(!payload\.notification\.userId\) \{/);
  assert.match(service, /no account to notify in-app; email only/);
  assert.match(service, /That is not a delivery\n\s*\/\/ failure and must not be logged as one/);

  // The failed-row write must sit inside the else, not run for a guest.
  const block = service.slice(service.indexOf('if (settings.inAppNotificationsEnabled'));
  const guard = block.indexOf('if (!payload.notification.userId)');
  const failedRow = block.indexOf("status: result.inApp ? 'sent' : 'failed'");
  assert.ok(guard > -1 && failedRow > guard, 'the guard must come before the log write');

  // logger has to actually be in scope, or the guard throws where it is meant to be quiet.
  assert.match(service, /const logger = require\('\.\.\/utils\/logger'\)/);
});

test('the cancellation asks for an in-app notification only when there is an account', () => {
  const cancellation = read('src/services/registration-cancellation.service.js');
  assert.match(cancellation, /notification: registration\.userId \? \{/);
  assert.match(cancellation, /\} : null,/);
  // The same shape the guest confirmation already used.
  const guest = read('src/services/guest-registration.service.js');
  assert.match(guest, /notify\('registration\.guest_confirmed', \{\n\s*email:/);
});

// --- The flag now gates the feature, not just the form ------------------------------------------

function applyWith(existing, formOverrides = {}) {
  const event = new Event({ slug: `s${Math.random()}`, waiverTemplate: 'W', ...existing });
  applyEventFormData(
    event,
    {
      title: 'T',
      organiserName: 'O',
      description: 'd',
      eventType: 'virtual',
      virtualCompletionMode: 'accumulated_activity',
      raceDistances: ['5K'],
      raceCategories: [],
      challengeMetrics: ['distance', 'steps'],
      primaryChallengeMetric: 'steps',
      targetSteps: 100000,
      targetDistanceKm: 50,
      proofTypesAllowed: ['photo'],
      acceptedRunTypes: ['outdoor'],
      ...formOverrides
    },
    { firstName: 'A', lastName: 'B' }
  );
  return event;
}

test('steps cannot be introduced while the flag is off', async (t) => {
  const previous = process.env.FEATURE_STEP_COMPETITIONS_ENABLED;
  delete process.env.FEATURE_STEP_COMPETITIONS_ENABLED;
  t.after(() => {
    if (previous === undefined) delete process.env.FEATURE_STEP_COMPETITIONS_ENABLED;
    else process.env.FEATURE_STEP_COMPETITIONS_ENABLED = previous;
  });

  // A posted body used to configure a steps competition with the flag off, because the
  // flag was only ever read when building form data for rendering.
  const fresh = applyWith({});
  assert.ok(!fresh.challengeMetrics.includes('steps'));
  assert.equal(fresh.primaryChallengeMetric, 'distance');
  assert.equal(fresh.targetSteps, null);

  // But an event that already has steps is not silently downgraded — the form's hidden
  // inputs replay its values on every save, and stripping them would undo the event.
  const configured = applyWith({
    challengeMetrics: ['distance', 'steps'],
    primaryChallengeMetric: 'steps',
    targetSteps: 5
  });
  assert.ok(configured.challengeMetrics.includes('steps'));
  assert.equal(configured.targetSteps, 100000);
});

test('steps are accepted normally once the flag is on', async (t) => {
  const previous = process.env.FEATURE_STEP_COMPETITIONS_ENABLED;
  process.env.FEATURE_STEP_COMPETITIONS_ENABLED = 'true';
  t.after(() => {
    if (previous === undefined) delete process.env.FEATURE_STEP_COMPETITIONS_ENABLED;
    else process.env.FEATURE_STEP_COMPETITIONS_ENABLED = previous;
  });

  const event = applyWith({});
  assert.ok(event.challengeMetrics.includes('steps'));
  assert.equal(event.primaryChallengeMetric, 'steps');
  assert.equal(event.targetSteps, 100000);
});

test('the enforcement lives with the write, not only with the render', () => {
  const form = read('src/services/event-form.service.js');
  assert.match(form, /const stepsAllowed = isStepCompetitionsEnabled\(\)/);
  assert.match(form, /The feature flag is enforced here, not only on the form/);
  // And STATUS.md no longer claims the flag disables the feature.
  assert.match(read('docs/STATUS.md'), /hides the organiser controls rather than disabling the feature/);
});
