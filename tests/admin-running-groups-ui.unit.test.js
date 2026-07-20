'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { Window } = require('happy-dom');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('admin running group templates compile and expose management routes', () => {
  const list = read('src/views/admin/running-groups-list.ejs');
  const detail = read('src/views/admin/running-group-detail.ejs');
  ejs.compile(list, { filename: 'src/views/admin/running-groups-list.ejs' });
  ejs.compile(detail, { filename: 'src/views/admin/running-group-detail.ejs' });
  assert.match(list, /action="\/admin\/running-groups"/);
  assert.match(detail, /\/update/);
  assert.match(detail, /\/archive/);
  assert.match(detail, /\/reactivate/);
  assert.match(detail, /\/reconcile/);
  assert.match(detail, /\/members\/<%= member\._id %>\/remove/);
  assert.match(detail, /name="_csrf"/);
  assert.match(detail, /name="reason" required minlength="8"/);
});

test('all running group mutations require admin access and moderation rate limits', () => {
  const routes = read('src/routes/admin.routes.js');
  for (const action of ['update', 'archive', 'reactivate', 'reconcile', 'creator']) {
    assert.match(routes, new RegExp(`running-groups/:id/${action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\n]+requireAdmin[^\n]+adminModerationLimiter`));
  }
  assert.match(routes, /running-groups\/:id\/members\/:userId\/remove[^\n]+requireAdmin[^\n]+adminModerationLimiter/);
  assert.doesNotMatch(routes, /running-groups[^\n]+requireFullAdmin/);
});

test('confirmation dialog cancels, restores focus, and submits once', () => {
  const window = new Window({ url: 'https://hellorun.test/admin/running-groups/1' });
  window.document.body.innerHTML = `
    <form data-admin-group-confirm data-confirm-title="Archive?" data-confirm-copy="Members are removed.">
      <textarea name="reason" required minlength="8">valid reason</textarea><button type="submit">Archive</button>
    </form>
    <div data-admin-group-modal hidden aria-hidden="true"><div role="dialog" tabindex="-1"><h3 data-admin-group-modal-title></h3><p data-admin-group-modal-copy></p><button data-admin-group-modal-cancel>Cancel</button><button data-admin-group-modal-confirm>Confirm</button></div></div>`;
  window.lucide = { createIcons() {} };
  window.eval(read('src/public/js/admin-running-groups.js'));
  const form = window.document.querySelector('form');
  const button = form.querySelector('[type="submit"]');
  let submits = 0;
  form.submit = () => { submits += 1; };
  button.focus();
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  const modal = window.document.querySelector('[data-admin-group-modal]');
  assert.equal(modal.hidden, false);
  modal.querySelector('[data-admin-group-modal-cancel]').click();
  assert.equal(modal.hidden, true);
  assert.equal(window.document.activeElement, button);
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  const confirm = modal.querySelector('[data-admin-group-modal-confirm]');
  confirm.click(); confirm.click();
  assert.equal(submits, 1);
});

test('responsive stylesheet provides card conversion and 44 pixel actions', () => {
  const css = read('src/public/css/admin-running-groups.css');
  assert.match(css, /@media \(max-width: 860px\)/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /\.admin-running-groups-page \.sr-only \{ position: absolute !important;/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.admin-group-status-strip/);
  assert.match(css, /\.admin-group-description-preview \{ display: none; \}/);
  assert.match(css, /td\[data-label="Action"\] \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(css, /\.admin-group-table td \{ width: 100% !important; grid-template-columns: 68px minmax\(0, 1fr\) !important;/);
  assert.match(css, /\.admin-group-status-label-compact \{ display: inline; \}/);
  assert.match(css, /prefers-reduced-motion/);
});

test('list renders compact status filters, persistent GET controls, and expandable metadata', async () => {
  const defaultHtml = await renderList({
    filters: { q: '', status: 'active', sort: 'members', page: 1, perPage: 25 }
  });
  const defaultWindow = new Window();
  defaultWindow.document.documentElement.innerHTML = defaultHtml;
  const statusItems = defaultWindow.document.querySelectorAll('.admin-group-status-item');
  assert.equal(statusItems.length, 4);
  assert.equal(defaultWindow.document.querySelector('.admin-group-status-item[aria-current="page"] span').textContent.trim(), 'Active');
  assert.equal(defaultWindow.document.querySelector('.admin-group-filter-disclosure').open, false);
  assert.equal(defaultWindow.document.querySelector('.admin-group-discovery-form').method.toLowerCase(), 'get');
  assert.ok(defaultWindow.document.querySelector('.admin-group-metadata'));
  assert.ok(defaultWindow.document.querySelector('.admin-group-description-preview[aria-hidden="true"]'));

  const filteredHtml = await renderList({
    filters: { q: 'long group', status: 'archived', sort: 'name', page: 1, perPage: 50 }
  });
  const filteredWindow = new Window();
  filteredWindow.document.documentElement.innerHTML = filteredHtml;
  assert.equal(filteredWindow.document.querySelector('.admin-group-filter-disclosure').open, true);
  assert.equal(filteredWindow.document.querySelector('.admin-group-filter-count').textContent.trim(), '3');
  assert.equal(filteredWindow.document.querySelector('select[name="status"] option[selected]').value, 'archived');
  assert.equal(filteredWindow.document.querySelector('select[name="sort"] option[selected]').value, 'name');
  assert.equal(filteredWindow.document.querySelector('select[name="perPage"] option[selected]').value, '50');
  assert.ok(filteredWindow.document.querySelector('a[href="/admin/running-groups"]'));
});

test('detail prioritizes members and distinguishes matching from mismatched counts', async () => {
  const detail = read('src/views/admin/running-group-detail.ejs');
  assert.ok(detail.indexOf('admin-group-members-section') < detail.indexOf('admin-group-settings'));
  assert.match(detail, /href="\/admin\/users\/<%= member\._id %>"/);
  assert.match(detail, /countsMatch \? 'Counts match' : 'Reconcile needed'/);
  assert.match(detail, /if \(!countsMatch\)/);
  assert.match(detail, /Metadata, attribution, integrity, and visibility controls/);
});

test('dashboard, universal search, and audit filters include running groups', () => {
  assert.match(read('src/views/admin/dashboard.ejs'), /href="\/admin\/running-groups"/);
  assert.match(read('src/views/admin/search.ejs'), /Running groups/);
  assert.match(read('src/controllers/admin/events.controller.js'), /results\.runningGroups/);
  const audit = read('src/services/critical-audit-query.service.js');
  assert.match(audit, /admin\.running_group\.archived/);
  assert.match(audit, /value: 'running_group'/);
});

async function renderList(overrides = {}) {
  const filters = overrides.filters || { q: '', status: 'active', sort: 'members', page: 1, perPage: 25 };
  const group = {
    _id: '507f1f77bcf86cd799439011',
    name: 'A Very Long Running Group Name for Responsive Testing',
    slug: 'a-very-long-running-group-name-for-responsive-testing',
    description: 'A deliberately long group description that should be previewed on desktop and placed inside the metadata disclosure on compact layouts without forcing the entire card to grow.',
    createdBy: null,
    isActive: filters.status !== 'archived',
    memberCount: 12,
    updatedAt: new Date('2026-07-20T00:00:00.000Z')
  };
  return ejs.renderFile(path.join(ROOT, 'src/views/admin/running-groups-list.ejs'), {
    title: 'Running groups',
    currentPath: '/admin/running-groups',
    isAuthenticated: true,
    isAdmin: true,
    isFullAdmin: false,
    isOrganizer: false,
    isApprovedOrganizer: false,
    runnerUnreadNotifications: 0,
    renderRunProofModal: false,
    user: { firstName: 'Admin' },
    csrfToken: 'token',
    flash: null,
    filters,
    groups: [group],
    pagination: { page: 1, total: 1, totalPages: 1 },
    counts: { active: 1, archived: 1, total: 2, cachedMemberships: 12 },
    message: null
  });
}
