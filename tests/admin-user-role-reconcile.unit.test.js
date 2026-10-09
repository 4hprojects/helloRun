'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { reconcileAdminUserRole } = require('../src/controllers/admin/_shared');

const reconcile = (role, organizerStatus) => reconcileAdminUserRole({ role, organizerStatus }).role;

test('approving a runner grants the organiser role', () => {
  assert.equal(reconcile('runner', 'approved'), 'organiser');
});

test('non-approved runner statuses keep the runner role', () => {
  for (const status of ['not_applied', 'pending', 'rejected']) {
    assert.equal(reconcile('runner', status), 'runner', status);
  }
});

test('organiser and admin roles are never changed', () => {
  for (const status of ['not_applied', 'pending', 'approved', 'rejected']) {
    assert.equal(reconcile('organiser', status), 'organiser', status);
    assert.equal(reconcile('admin', status), 'admin', status);
  }
});
