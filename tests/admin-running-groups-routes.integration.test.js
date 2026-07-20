'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const RunningGroup = require('../src/models/RunningGroup');
const RunningGroupActivity = require('../src/models/RunningGroupActivity');
const Notification = require('../src/models/Notification');
const { createRunningGroup } = require('../src/services/running-group.service');

const ROOT = path.resolve(__dirname, '..');
const PORT = 3194;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const password = 'Pass1234';
let server;
let fixture;

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  fixture = await seedFixture();
  await mongoose.disconnect();
  server = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), CSRF_PROTECTION: '0', DATABASE_URL: '' },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServer();
});

test.after(async () => {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([once(server, 'exit'), new Promise((resolve) => setTimeout(resolve, 2000))]);
    if (server.exitCode === null) server.kill('SIGKILL');
    server.unref();
  }
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI);
  await Notification.deleteMany({ userId: { $in: [fixture.admin._id, fixture.fullAdmin._id, fixture.runner._id] } });
  await RunningGroupActivity.deleteMany({ groupId: { $in: [fixture.group._id, fixture.deleteGroup._id] } });
  await RunningGroup.deleteMany({ _id: { $in: [fixture.group._id, fixture.deleteGroup._id] } });
  await User.deleteMany({ _id: { $in: [fixture.admin._id, fixture.fullAdmin._id, fixture.runner._id] } });
  await mongoose.disconnect();
});

test('running group management denies runners and renders for support admins', async () => {
  const runnerCookie = await login(fixture.runner.email, '/runner/dashboard');
  const denied = await get('/admin/running-groups', runnerCookie);
  assert.equal(denied.status, 403);

  const adminCookie = await login(fixture.admin.email, '/admin/running-groups');
  const list = await get('/admin/running-groups?status=all', adminCookie);
  assert.equal(list.status, 200);
  const listHtml = await list.text();
  assert.match(listHtml, /Running Group Management/);
  assert.doesNotMatch(listHtml, /data-admin-group-bulk-trigger/);
  const detail = await get(`/admin/running-groups/${fixture.group._id}`, adminCookie);
  assert.equal(detail.status, 200);
  const html = await detail.text();
  assert.match(html, new RegExp(escapeRegex(fixture.group.name)));
  assert.match(html, /Creator attribution/);
  assert.match(html, /Critical audit/);
});

test('bulk deletion is hidden from support admins and requires a full admin password', async () => {
  const supportCookie = await login(fixture.admin.email, '/admin/running-groups');
  const denied = await postJson('/admin/running-groups/bulk-delete', supportCookie, {
    groupIds: [String(fixture.deleteGroup._id)], reason: 'Valid moderation reason', adminPassword: password
  });
  assert.equal(denied.status, 403);
  await connect();
  assert.ok(await RunningGroup.findById(fixture.deleteGroup._id));
  await mongoose.disconnect();

  const fullCookie = await login(fixture.fullAdmin.email, '/admin/running-groups');
  const fullList = await get('/admin/running-groups?status=all', fullCookie);
  assert.match(await fullList.text(), /data-admin-group-bulk-trigger/);
  const formFailure = await postForm('/admin/running-groups/bulk-delete', fullCookie, {
    groupIds: String(fixture.deleteGroup._id), reason: 'short', adminPassword: password,
    returnTo: '/admin/running-groups?status=all'
  });
  assert.equal(formFailure.status, 302);
  assert.match(formFailure.headers.get('location') || '', /^\/admin\/running-groups\?status=all&type=error/);
  const badPassword = await postJson('/admin/running-groups/bulk-delete', fullCookie, {
    groupIds: [String(fixture.deleteGroup._id)], reason: 'Valid moderation reason', adminPassword: 'WrongPassword'
  });
  assert.equal(badPassword.status, 403);
  const badBody = await badPassword.json();
  assert.equal(badBody.success, false);

  const deleted = await postJson('/admin/running-groups/bulk-delete', fullCookie, {
    groupIds: [String(fixture.deleteGroup._id)], reason: 'Permanent group cleanup test', adminPassword: password
  });
  assert.equal(deleted.status, 200);
  assert.equal((await deleted.json()).deletedCount, 1);
  await connect();
  assert.equal(await RunningGroup.countDocuments({ _id: fixture.deleteGroup._id }), 0);
  const runner = await User.findById(fixture.runner._id).lean();
  assert.equal(runner.runningGroups.some((name) => name === fixture.deleteGroup.name), false);
  assert.ok(await Notification.findOne({ userId: fixture.runner._id, type: 'running_group_deleted' }));
  await mongoose.disconnect();
});

test('support admins can mutate metadata and invalid reasons do not archive', async () => {
  const cookie = await login(fixture.admin.email, '/admin/running-groups');
  const invalidArchive = await post(`/admin/running-groups/${fixture.group._id}/archive`, cookie, { reason: 'short' });
  assert.equal(invalidArchive.status, 302);
  await connect();
  assert.equal((await RunningGroup.findById(fixture.group._id).lean()).isActive, true);
  await mongoose.disconnect();

  const updatedName = `${fixture.group.name} Updated`;
  const update = await post(`/admin/running-groups/${fixture.group._id}/update`, cookie, { name: updatedName, description: 'Updated by support admin' });
  assert.equal(update.status, 302);
  assert.match(update.headers.get('location') || '', /type=success/);
  await connect();
  const fresh = await RunningGroup.findById(fixture.group._id).lean();
  assert.equal(fresh.name, updatedName);
  assert.equal(fresh.slug, fixture.group.slug);
  await mongoose.disconnect();
});

async function seedFixture() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const passwordHash = await bcrypt.hash(password, 4);
  const admin = await User.create({ userId: `ARGA${stamp}`.slice(0, 22), email: `admin.rg.route.${stamp}@example.com`, passwordHash, role: 'admin', adminTier: 'support', firstName: 'Support', lastName: 'Admin', emailVerified: true, accountStatus: 'active' });
  const fullAdmin = await User.create({ userId: `ARGF${stamp}`.slice(0, 22), email: `admin.rg.full.${stamp}@example.com`, passwordHash, role: 'admin', adminTier: 'full', firstName: 'Full', lastName: 'Admin', emailVerified: true, accountStatus: 'active' });
  const runner = await User.create({ userId: `ARGR${stamp}`.slice(0, 22), email: `runner.rg.route.${stamp}@example.com`, passwordHash, role: 'runner', firstName: 'Route', lastName: 'Runner', emailVerified: true, accountStatus: 'active' });
  const group = await createRunningGroup({ user: runner, name: `Route Group ${stamp}`, description: 'Route test group' });
  const deleteGroup = await createRunningGroup({ user: runner, name: `Delete Route Group ${stamp}`, description: 'Bulk delete route test group' });
  return { admin, fullAdmin, runner, group, deleteGroup };
}

async function login(email, readinessPath) {
  const response = await fetch(`${BASE_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email, password }), redirect: 'manual' });
  assert.equal(response.status, 302);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const ready = await get(readinessPath, cookie);
    if (ready.status !== 302 || ready.headers.get('location') !== '/login') return cookie;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  return cookie;
}
async function get(url, cookie) { return fetch(`${BASE_URL}${url}`, { headers: { Cookie: cookie }, redirect: 'manual' }); }
async function post(url, cookie, body) { return fetch(`${BASE_URL}${url}`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body), redirect: 'manual' }); }
async function postForm(url, cookie, body) { return fetch(`${BASE_URL}${url}`, { method: 'POST', headers: { Cookie: cookie, Accept: 'text/html', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body), redirect: 'manual' }); }
async function postJson(url, cookie, body) { return fetch(`${BASE_URL}${url}`, { method: 'POST', headers: { Cookie: cookie, Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body), redirect: 'manual' }); }
async function connect() { if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI); }
async function waitForServer() { for (let i = 0; i < 50; i += 1) { try { const response = await fetch(`${BASE_URL}/`); if (response.status < 500) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 200)); } throw new Error('Admin running group test server did not start.'); }
function escapeRegex(value) { return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
