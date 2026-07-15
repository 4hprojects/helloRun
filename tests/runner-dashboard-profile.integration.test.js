const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Notification = require('../src/models/Notification');
const {
  buildRunnerDashboardData,
  buildRunnerEventProgressCards
} = require('../src/services/runner-data.service');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3103;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;

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
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
});

test('buildRunnerDashboardData groups upcoming/past and computes stats', () => {
  const now = new Date('2026-03-07T00:00:00.000Z');
  const registrations = [
    {
      _id: 'r1',
      paymentStatus: 'unpaid',
      registeredAt: '2026-03-06T09:00:00.000Z',
      eventId: { title: 'Future 1', eventStartAt: '2026-03-12T00:00:00.000Z' }
    },
    {
      _id: 'r2',
      paymentStatus: 'paid',
      registeredAt: '2026-03-05T09:00:00.000Z',
      eventId: { title: 'Past 1', eventStartAt: '2026-03-01T00:00:00.000Z' }
    },
    {
      _id: 'r3',
      paymentStatus: 'proof_rejected',
      registeredAt: '2026-03-04T09:00:00.000Z',
      eventId: { title: 'Future 2', eventStartAt: '2026-03-10T00:00:00.000Z' }
    }
  ];

  const data = buildRunnerDashboardData(registrations, now);
  assert.equal(data.upcoming.length, 2);
  assert.equal(data.past.length, 1);
  assert.equal(data.unpaid.length, 2);
  assert.equal(data.stats.total, 3);
  assert.equal(data.stats.upcoming, 2);
  assert.equal(data.stats.past, 1);
  assert.equal(data.stats.unpaid, 2);
  assert.equal(data.stats.paid, 1);
  assert.equal(data.activity[0].eventTitle, 'Future 1');
});

test('buildRunnerEventProgressCards summarizes registered event proof status', () => {
  const registrations = [
    {
      _id: 'reg-standard',
      paymentStatus: 'paid',
      status: 'confirmed',
      raceDistance: '10K',
      confirmationCode: 'HR-ABC123',
      eventId: {
        title: 'Standard Challenge',
        slug: 'standard-challenge',
        virtualCompletionMode: 'single_activity'
      }
    },
    {
      _id: 'reg-accumulated',
      paymentStatus: 'paid',
      status: 'confirmed',
      raceDistance: '100K',
      confirmationCode: 'HR-DEF456',
      eventId: {
        title: '100K Builder',
        slug: '100k-builder',
        virtualCompletionMode: 'accumulated_distance',
        targetDistanceKm: 200
      }
    },
    {
      _id: 'reg-unpaid',
      paymentStatus: 'unpaid',
      status: 'pending_payment',
      raceDistance: '5K',
      confirmationCode: 'HR-GHI789',
      eventId: {
        title: 'Payment First Run',
        slug: 'payment-first-run',
        virtualCompletionMode: 'single_activity'
      }
    }
  ];

  const cards = buildRunnerEventProgressCards(registrations, {
    standardSubmissions: [
      {
        _id: 'sub-standard',
        registrationId: 'reg-standard',
        status: 'submitted',
        submittedAt: new Date('2026-03-10T08:00:00.000Z')
      }
    ],
    accumulatedActivities: [
      {
        _id: 'act-approved',
        registrationId: 'reg-accumulated',
        status: 'approved',
        distanceKm: 25,
        submittedAt: new Date('2026-03-09T08:00:00.000Z')
      },
      {
        _id: 'act-pending',
        registrationId: 'reg-accumulated',
        status: 'submitted',
        distanceKm: 10,
        submittedAt: new Date('2026-03-11T08:00:00.000Z')
      }
    ]
  });

  const standard = cards.find((item) => item.registrationId === 'reg-standard');
  assert.equal(standard.state, 'submitted');
  assert.equal(standard.stateLabel, 'Under Review');
  assert.equal(standard.nextAction.href, '/runner/submissions/sub-standard');

  const accumulated = cards.find((item) => item.registrationId === 'reg-accumulated');
  assert.equal(accumulated.isAccumulated, true);
  assert.equal(accumulated.state, 'in_progress');
  assert.equal(accumulated.progress.targetDistanceKm, 100);
  assert.equal(accumulated.progress.approvedDistanceKm, 25);
  assert.equal(accumulated.progress.pendingActivityCount, 1);
  assert.equal(accumulated.progress.percent, 25);
  assert.equal(accumulated.nextAction.type, 'submit');

  const unpaid = cards.find((item) => item.registrationId === 'reg-unpaid');
  assert.equal(unpaid.state, 'payment_required');
  assert.equal(unpaid.nextAction.href, '/my-registrations');
});

test('runner profile update validates and persists normalized data', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const runner = await createRunner(`profile.${stamp}`, password);
  const cookie = await login(runner.email, password);
  const ready = await waitForSessionReady('/runner/dashboard', cookie);
  assert.equal(ready, true);

  const invalidDobResponse = await postForm('/runner/profile', cookie, {
    firstName: 'A',
    lastName: 'Runner',
    mobile: '123',
    country: 'PH',
    dateOfBirth: '2099-01-01',
    gender: 'male',
    emergencyContactName: 'x',
    emergencyContactNumber: '123',
    runningGroup: ''
  });
  assert.equal(invalidDobResponse.status, 400);
  const invalidHtml = await invalidDobResponse.text();
  assert.match(invalidHtml, /Date of birth cannot be in the future/i);

  const validResponse = await postForm('/runner/profile', cookie, {
    firstName: 'Profile',
    lastName: 'Updated',
    displayName: 'Road Runner_7',
    mobile: '+1 555 100 2000',
    country: 'US',
    dateOfBirth: '1997-08-23',
    gender: 'female',
    emergencyContactName: 'Emergency Contact',
    emergencyContactNumber: '+1 555 100 9999',
    runningGroup: 'Road Warriors'
  });
  assert.equal(validResponse.status, 302);
  assert.equal(validResponse.headers.get('location'), '/runner/dashboard?type=success&msg=Profile%20updated%20successfully.');

  await mongoose.connect(process.env.MONGODB_URI);
  const fresh = await User.findById(runner._id).lean();
  await mongoose.disconnect();

  assert.equal(fresh.firstName, 'Profile');
  assert.equal(fresh.lastName, 'Updated');
  assert.equal(fresh.displayName, 'Road Runner_7');
  assert.equal(fresh.country, 'US');
  assert.equal(fresh.runningGroup, 'Road Warriors');
  assert.equal(new Date(fresh.dateOfBirth).toISOString().slice(0, 10), '1997-08-23');
});

test('runner profile page supports identity edits and display name validation', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const runner = await createRunner(`profile.identity.${stamp}`, password);
  const cookie = await login(runner.email, password);
  const ready = await waitForSessionReady('/runner/profile', cookie);
  assert.equal(ready, true);

  const page = await fetch(`${BASE_URL}/runner/profile`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /name="displayName"/i);
  assert.match(html, /Optional\. If set, HelloRun can show this instead of your full name/i);
  assert.match(html, /data-open-password-modal/i);
  assert.match(html, /id="passwordSettingsModal"/i);
  assert.match(html, /id="passwordActionConfirmModal"/i);
  assert.match(html, /data-confirm-password-action/i);
  assert.match(html, /action="\/runner\/security\/password"/i);

  const invalid = await postForm('/runner/profile/identity', cookie, {
    firstName: 'Profile',
    lastName: 'Runner',
    displayName: 'bad@example.com',
    dateOfBirth: '1995-01-01',
    gender: 'male'
  });
  assert.equal(invalid.status, 302);
  assert.match(String(invalid.headers.get('location') || ''), /Display%20name/i);

  const valid = await postForm('/runner/profile/identity', cookie, {
    firstName: 'Profile',
    lastName: 'Identity',
    displayName: 'Pace Maker',
    dateOfBirth: '1995-01-01',
    gender: 'prefer_not_to_say'
  });
  assert.equal(valid.status, 302);
  assert.match(String(valid.headers.get('location') || ''), /Identity%20details%20updated/i);

  await mongoose.connect(process.env.MONGODB_URI);
  const fresh = await User.findById(runner._id).lean();
  await mongoose.disconnect();

  assert.equal(fresh.lastName, 'Identity');
  assert.equal(fresh.displayName, 'Pace Maker');
  assert.equal(fresh.gender, 'prefer_not_to_say');
  assert.equal(new Date(fresh.dateOfBirth).toISOString().slice(0, 10), '1995-01-01');
});

test('incomplete Google runner receives one profile completion notification', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const runner = await createRunner(`profile.notice.${stamp}`, password, {
    authProvider: 'google',
    googleId: `profile-notice-${stamp}`,
    mobile: '',
    country: '',
    gender: '',
    emergencyContactName: '',
    emergencyContactNumber: ''
  });
  const cookie = await login(runner.email, password);
  const ready = await waitForSessionReady('/runner/dashboard', cookie);
  assert.equal(ready, true);

  await new Promise((resolve) => setTimeout(resolve, 150));

  await mongoose.connect(process.env.MONGODB_URI);
  const notices = await Notification.find({
    userId: runner._id,
    type: 'profile_incomplete',
    readAt: null
  }).lean();
  await mongoose.disconnect();

  assert.equal(notices.length, 1);
  assert.equal(notices[0].href, '/runner/profile?source=notification#overview');
});

test('runner can unlink Google auth when local password exists', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const runner = await createRunner(`unlink.google.${stamp}`, password, {
    authProvider: 'google',
    googleId: `gid-${stamp}`
  });
  const cookie = await login(runner.email, password);
  const ready = await waitForSessionReady('/runner/dashboard', cookie);
  assert.equal(ready, true);

  const response = await postForm('/runner/auth/google/unlink', cookie, {
    returnTo: '/runner/dashboard'
  });
  assert.equal(response.status, 302);
  assert.match(String(response.headers.get('location') || ''), /type=success/i);

  await mongoose.connect(process.env.MONGODB_URI);
  const fresh = await User.findById(runner._id).lean();
  await mongoose.disconnect();

  assert.equal(Boolean(fresh.googleId), false);
  assert.equal(fresh.authProvider, 'local');
});

test('runner cannot unlink Google auth when no local password exists', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const runner = await createRunner(`unlink.block.${stamp}`, password, {
    authProvider: 'google',
    googleId: `gid-block-${stamp}`
  });
  const cookie = await login(runner.email, password);
  const ready = await waitForSessionReady('/runner/dashboard', cookie);
  assert.equal(ready, true);

  // Simulate a Google-only account after session is already established.
  await mongoose.connect(process.env.MONGODB_URI);
  await User.updateOne({ _id: runner._id }, { $unset: { passwordHash: 1 } });
  await mongoose.disconnect();

  const response = await postForm('/runner/auth/google/unlink', cookie, {
    returnTo: '/runner/dashboard'
  });
  assert.equal(response.status, 302);
  assert.match(String(response.headers.get('location') || ''), /type=error/i);
  assert.match(String(response.headers.get('location') || ''), /Set%20a%20password/i);
});

test('google-only runner can set local password from authenticated security page', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const runner = await createRunner(`set.password.${stamp}`, password, {
    authProvider: 'google',
    googleId: `gid-set-${stamp}`
  });

  const cookie = await login(runner.email, password);
  const ready = await waitForSessionReady('/runner/dashboard', cookie);
  assert.equal(ready, true);

  await mongoose.connect(process.env.MONGODB_URI);
  await User.updateOne({ _id: runner._id }, { $unset: { passwordHash: 1 } });
  await mongoose.disconnect();

  const page = await fetch(`${BASE_URL}/runner/security/password`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(page.status, 302);
  assert.equal(page.headers.get('location'), '/runner/profile?modal=password#account');

  const profilePage = await fetch(`${BASE_URL}/runner/profile?modal=password`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(profilePage.status, 200);
  const profileHtml = await profilePage.text();
  assert.match(profileHtml, /Set Password/i);
  assert.match(profileHtml, /data-auto-open="true"/i);
  assert.doesNotMatch(profileHtml, /name="currentPassword"/i);

  const update = await postForm('/runner/security/password', cookie, {
    newPassword: 'NewPass123',
    confirmPassword: 'NewPass123'
  });
  assert.equal(update.status, 302);
  assert.equal(
    update.headers.get('location'),
    '/runner/profile?type=success&msg=Password%20updated%20successfully.#account'
  );

  await mongoose.connect(process.env.MONGODB_URI);
  const fresh = await User.findById(runner._id).lean();
  await mongoose.disconnect();
  assert.equal(Boolean(fresh.passwordHash), true);
});

test('runner result submissions partial renders for async dashboard filtering', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const runner = await createRunner(`result.partial.${stamp}`, password);
  const cookie = await login(runner.email, password);
  const ready = await waitForSessionReady('/runner/dashboard', cookie);
  assert.equal(ready, true);

  const response = await fetch(`${BASE_URL}/runner/dashboard/result-submissions?resultStatus=approved`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Result Submissions/i);
  assert.match(html, /data-result-submissions-root/i);
  assert.match(html, /Approved/i);
  assert.match(html, /aria-current=.*page/i);
});

test('runner dashboard refresh endpoint requires authentication and returns fragments', async () => {
  const unauthenticated = await fetch(`${BASE_URL}/runner/dashboard/refresh`, { redirect: 'manual' });
  assert.equal(unauthenticated.status, 302);
  assert.equal(unauthenticated.headers.get('location'), '/login');

  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const runner = await createRunner(`dashboard.refresh.${stamp}`, password);
  const cookie = await login(runner.email, password);
  const ready = await waitForSessionReady('/runner/dashboard', cookie);
  assert.equal(ready, true);

  const response = await fetch(`${BASE_URL}/runner/dashboard/refresh?resultStatus=approved`, {
    headers: { Cookie: cookie, Accept: 'application/json' },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.success, true);
  assert.ok(payload.refreshedAt);
  for (const key of ['nextAction', 'summary', 'upcoming', 'badges', 'badgeProgress', 'eventProgress', 'missedSubmissions', 'resultSubmissions', 'past', 'activity', 'certificates', 'progressStats', 'runningGroups', 'latestAchievement']) {
    assert.equal(typeof payload.fragments[key], 'string');
  }
  assert.match(payload.fragments.resultSubmissions, /aria-current=(?:&#34;|")page/i);
  assert.match(payload.fragments.resultSubmissions, /Approved/i);
});

test('runner dashboard gives a new runner an action-first empty state', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const runner = await createRunner(`dashboard.trigger.${stamp}`, password);
  const cookie = await login(runner.email, password);
  const ready = await waitForSessionReady('/runner/dashboard', cookie);
  assert.equal(ready, true);

  const response = await fetch(`${BASE_URL}/runner/dashboard`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Your Next Action/i);
  assert.match(html, /Browse Active Events/i);
  assert.match(html, /Active Event Progress/i);
  assert.match(html, /You have not joined an event yet/i);
});

test('runner change password requires valid current password', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const oldPassword = 'Pass1234';
  const runner = await createRunner(`change.password.${stamp}`, oldPassword);
  const cookie = await login(runner.email, oldPassword);
  const ready = await waitForSessionReady('/runner/dashboard', cookie);
  assert.equal(ready, true);

  const bad = await postForm('/runner/security/password', cookie, {
    currentPassword: 'WrongPass123',
    newPassword: 'NextPass123',
    confirmPassword: 'NextPass123'
  });
  assert.equal(bad.status, 400);
  const badHtml = await bad.text();
  assert.match(badHtml, /Current password is incorrect/i);
  assert.match(badHtml, /id="passwordSettingsModal"/i);
  assert.match(badHtml, /data-auto-open="true"/i);
  assert.doesNotMatch(badHtml, /value="WrongPass123"/i);

  const good = await postForm('/runner/security/password', cookie, {
    currentPassword: oldPassword,
    newPassword: 'NextPass123',
    confirmPassword: 'NextPass123'
  });
  assert.equal(good.status, 302);
  assert.equal(
    good.headers.get('location'),
    '/runner/profile?type=success&msg=Password%20updated%20successfully.#account'
  );
});

test('runner password update throttle renders the profile modal', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const runner = await createRunner(`password.throttle.${stamp}`, password);
  const cookie = await login(runner.email, password);
  const ready = await waitForSessionReady('/runner/dashboard', cookie);
  assert.equal(ready, true);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await postForm('/runner/security/password', cookie, {
      currentPassword: 'WrongPass123',
      newPassword: 'NextPass123',
      confirmPassword: 'NextPass123'
    });
    assert.equal(response.status, 400);
    await new Promise((resolve) => setTimeout(resolve, 75));
  }

  const blocked = await postForm('/runner/security/password', cookie, {
    currentPassword: password,
    newPassword: 'NextPass123',
    confirmPassword: 'NextPass123'
  });
  assert.equal(blocked.status, 429);
  const html = await blocked.text();
  assert.match(html, /Too many password update attempts/i);
  assert.match(html, /data-auto-open="true"/i);
});

async function createRunner(emailLocal, password, overrides = {}) {
  await mongoose.connect(process.env.MONGODB_URI);
  const passwordHash = await bcrypt.hash(password, 10);
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const user = await User.create({
    userId: `URGPROF${stamp}`.slice(0, 22),
    email: `${emailLocal}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Profile',
    lastName: 'Runner',
    emailVerified: true,
    mobile: '09170000000',
    country: 'PH',
    gender: 'male',
    emergencyContactName: 'Profile Emergency',
    emergencyContactNumber: '09171111111',
    ...overrides
  });
  await mongoose.disconnect();
  return user;
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

async function postForm(routePath, cookie, payload = {}) {
  return fetch(`${BASE_URL}${routePath}`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(payload),
    redirect: 'manual'
  });
}

async function waitForSessionReady(pathname, cookie) {
  const maxAttempts = 8;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      method: 'GET',
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.headers.get('location') !== '/login') {
      return true;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  return false;
}

async function waitForServerReady() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch (error) {
      // server booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}
