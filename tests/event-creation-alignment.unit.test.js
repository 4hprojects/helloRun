const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('organizer forms explain which public details are automatic', () => {
  for (const relativePath of ['src/views/organizer/create-event.ejs', 'src/views/organizer/edit-event.ejs']) {
    const source = read(relativePath);
    assert.match(source, /Structured schedules, categories, fees, rewards, and proof settings appear automatically/);
    assert.match(source, /Add context, FAQs, policies, route notes, and runner guidance not already covered by structured event settings/);
    assert.doesNotMatch(source, /full event rules, FAQs, pricing explanation, submission rules/);
  }
});

test('organizer forms only advertise configured Strava activity import', () => {
  const createSource = read('src/views/organizer/create-event.ejs');
  const editSource = read('src/views/organizer/edit-event.ejs');

  for (const source of [createSource, editSource]) {
    assert.match(source, /locals\.runningAppSyncAvailable/);
    assert.match(source, /Strava activity import is unavailable until the integration is configured/);
    assert.doesNotMatch(source, /Strava sync or other running app sync/);
  }

  assert.match(createSource, /locals\.runningAppSyncAvailable \? \['running_app_sync', 'photo', 'manual'\] : \['photo', 'manual'\]/);
  assert.match(editSource, /type="hidden" name="proofTypesAllowed" value="running_app_sync"/);
  assert.match(editSource, /is saved for this event but is not advertised while the integration is unavailable/);
});
