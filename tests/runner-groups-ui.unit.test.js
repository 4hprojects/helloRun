'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { Window } = require('happy-dom');
const { buildRunnerGroupsPresentation } = require('../src/services/runner-groups-presentation.service');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('group presentation selects one discovery source and marks membership actions', () => {
  const current = { _id: 'current', name: 'Sunrise Runners', slug: 'sunrise', description: 'Early runs', memberCount: 8 };
  const popular = { _id: 'popular', name: 'Night Pacers', slug: 'night', description: 'Evening runs', memberCount: 12 };
  const searchMember = { ...current, name: ' sunrise   runners ' };

  const popularView = buildRunnerGroupsPresentation({ currentGroups: [current], topGroups: [current, popular] });
  assert.equal(popularView.discovery.title, 'Popular groups');
  assert.equal(popularView.discovery.groups[0].isMember, true);
  assert.equal(popularView.discovery.groups[0].actionType, 'joined');
  assert.equal(popularView.discovery.groups[1].actionType, 'switch');
  assert.equal(popularView.discovery.groups[1].actionLabel, 'Switch group');

  const searchView = buildRunnerGroupsPresentation({
    currentGroups: [current],
    topGroups: [popular],
    searchResults: [searchMember],
    query: 'sunrise'
  });
  assert.equal(searchView.discovery.title, 'Search results');
  assert.deepEqual(searchView.discovery.groups.map((group) => group.slug), ['sunrise']);
  assert.equal(searchView.discovery.groups[0].isMember, true);
});

test('group presentation supports no membership, legacy multiple groups, and safe values', () => {
  const noMembership = buildRunnerGroupsPresentation({ topGroups: [{ _id: 7, name: 'Open Group', memberCount: -2 }] });
  assert.equal(noMembership.joinedCount, 0);
  assert.equal(noMembership.discovery.groups[0].actionType, 'join');
  assert.equal(noMembership.discovery.groups[0].actionLabel, 'Join group');
  assert.equal(noMembership.discovery.groups[0].memberCount, 0);

  const multiple = buildRunnerGroupsPresentation({
    currentGroups: [{ name: 'One' }, { name: 'Two' }],
    topGroups: []
  });
  assert.equal(multiple.joinedCount, 2);
  assert.deepEqual(multiple.currentGroupNames, ['One', 'Two']);
});

test('group templates compile and preserve routes, CSRF, and dedicated creation', () => {
  const groups = read('src/views/runner/groups.ejs');
  const detail = read('src/views/runner/group-detail.ejs');
  const create = read('src/views/runner/create-group.ejs');
  for (const [file, source] of [
    ['src/views/runner/groups.ejs', groups],
    ['src/views/runner/group-detail.ejs', detail],
    ['src/views/runner/create-group.ejs', create]
  ]) ejs.compile(source, { filename: path.join(root, file) });

  assert.match(groups, /href="\/runner\/groups\/create"/);
  assert.doesNotMatch(groups, /action="\/runner\/groups\/create"/);
  assert.match(groups, /method="GET" action="\/runner\/groups"/);
  assert.match(groups, /name="q" value="<%= groupsPresentation\.query %>"/);
  assert.match(groups, /action="\/runner\/groups\/join"/);
  assert.match(groups, /action="\/runner\/groups\/leave"/);
  assert.ok((groups.match(/name="_csrf"/g) || []).length >= 2);
  assert.match(detail, /data-group-action-form/);
  assert.match(detail, /Switch Group/);
  assert.match(create, /Back to Groups/);
  assert.match(create, /Creating a group adds it to your profile/);
  assert.match(create, /href="\/runner\/groups" class="btn btn-outline">Cancel/);
});

test('switch and leave confirmations cancel, restore focus, and submit once', () => {
  const window = new Window({ url: 'https://hellorun.test/runner/groups' });
  window.document.body.innerHTML = `
    <form data-group-action-form data-group-action="switch" data-group-name="Night Pacers" data-current-groups="Sunrise Runners">
      <button type="submit">Switch group</button>
    </form>
    <form data-group-action-form data-group-action="leave" data-group-name="Sunrise Runners">
      <button type="submit">Leave</button>
    </form>
    <div data-group-confirm-modal hidden aria-hidden="true">
      <div role="dialog" tabindex="-1">
        <h2 data-group-confirm-title></h2><p data-group-confirm-description></p>
        <button data-cancel-group-action>Cancel</button><button data-confirm-group-action>Confirm</button>
      </div>
    </div>`;
  window.lucide = { createIcons() {} };
  const forms = Array.from(window.document.querySelectorAll('form'));
  let submitCount = 0;
  forms.forEach((form) => { form.submit = () => { submitCount += 1; }; });
  window.eval(read('src/public/js/runner-groups.js'));

  const modal = window.document.querySelector('[data-group-confirm-modal]');
  const switchTrigger = forms[0].querySelector('button');
  switchTrigger.focus();
  switchTrigger.click();
  assert.equal(modal.hidden, false);
  assert.equal(window.document.querySelector('[data-group-confirm-title]').textContent, 'Switch to Night Pacers?');
  assert.match(window.document.querySelector('[data-group-confirm-description]').textContent, /replaces your current membership in Sunrise Runners/);
  window.document.querySelector('[data-cancel-group-action]').click();
  assert.equal(modal.hidden, true);
  assert.equal(window.document.activeElement, switchTrigger);

  forms[1].querySelector('button').click();
  assert.equal(window.document.querySelector('[data-group-confirm-title]').textContent, 'Leave Sunrise Runners?');
  const confirm = window.document.querySelector('[data-confirm-group-action]');
  confirm.click();
  confirm.click();
  assert.equal(submitCount, 1);
  assert.equal(confirm.disabled, true);
  assert.equal(confirm.getAttribute('aria-busy'), 'true');
});

test('ordinary join remains a direct no-confirmation form submission', () => {
  const window = new Window({ url: 'https://hellorun.test/runner/groups' });
  window.document.body.innerHTML = `
    <form data-group-action-form data-group-action="join"><button type="submit">Join group</button></form>
    <div data-group-confirm-modal hidden aria-hidden="true"><div role="dialog"><h2 data-group-confirm-title></h2><p data-group-confirm-description></p><button data-cancel-group-action>Cancel</button><button data-confirm-group-action>Confirm</button></div></div>`;
  window.eval(read('src/public/js/runner-groups.js'));
  const event = new window.Event('submit', { bubbles: true, cancelable: true });
  window.document.querySelector('form').dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  assert.equal(window.document.querySelector('[data-group-confirm-modal]').hidden, true);
});

test('responsive group controls retain balanced 44-pixel actions', () => {
  const css = read('src/public/css/runner-groups.css');
  assert.match(css, /\.runner-group-card-actions\s*\{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.runner-group-card-actions \.btn,[\s\S]*?min-height: 44px/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.runner-groups-grid\s*\{[^}]*grid-template-columns: 1fr/);
  assert.match(css, /\.runner-groups-header \.header-subtitle\s*\{[^}]*color: #64748b/);
  assert.match(css, /\.runner-groups-search \.sr-only\s*\{[^}]*position: absolute/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.runner-groups-shell \.nav-run-proof-callout\s*\{[^}]*display: none/);
  assert.match(css, /@media \(max-width: 340px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
