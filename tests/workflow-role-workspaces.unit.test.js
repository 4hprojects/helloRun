'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('runner dashboard promotes one canonical stage-based event journey', () => {
  const dashboard = read('src/views/runner/dashboard.ejs');
  assert.match(dashboard, /Active event journey/);
  assert.equal((dashboard.match(/dashboard-event-progress/g) || []).length, 1);
  assert.match(read('src/views/runner/partials/event-progress-row.ejs'), /Stage <%= stageNumbers\[item.state\]/);
});

test('organizer queue ranks events by pending workload and links direct review work', () => {
  const route = read('src/routes/organiser/dashboard.js');
  assert.match(route, /sort\(\(a, b\) => b\.totalPending - a\.totalPending/);
  assert.match(route, /paymentHref/);
  assert.match(route, /resultHref/);
});

test('admin supports cross-domain search and user-centered case evidence', () => {
  const routes = read('src/routes/admin.routes.js');
  assert.match(routes, /\/search/);
  assert.match(routes, /\/cases\/user\/:id/);
  const controller = read('src/controllers/admin/events.controller.js');
  ['User.find', 'Event.find', 'OrganiserApplication.find', 'Submission.find', 'Registration.find'].forEach((token) => assert.match(controller, new RegExp(token.replace('.', '\\.'))));
  assert.match(read('src/views/admin/user-case.ejs'), /Mutations remain on their governed source screens/);
});

