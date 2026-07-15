const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Submission = require('../src/models/Submission');
const Notification = require('../src/models/Notification');
const BadgeContent = require('../src/models/BadgeContent');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');
const { getPostgresClient, closePostgresClient } = require('../src/db/postgres');
const {
  evaluateRegistrationAchievements,
  evaluateSubmissionAchievements,
  evaluateOrganiserAchievements
} = require('../src/services/achievement.service');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3142;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;

function hasRequiredEnvironment() {
  if (!String(process.env.DATABASE_URL || '').trim()) {
    test.skip('DATABASE_URL is not configured for badge route tests');
    return false;
  }
  if (!String(process.env.MONGODB_URI || '').trim()) {
    test.skip('MONGODB_URI is not configured for badge route tests');
    return false;
  }
  return true;
}

test.before(async () => {
  if (!hasRequiredEnvironment()) return;

  await mongoose.connect(process.env.MONGODB_URI);
  seed = await seedBadgeRouteFixture();

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
  await cleanupSeed(seed);
  await closePostgresClient();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test('public event badge route returns only active visible event badges', async () => {
  if (!seed) return;

  const eventPage = await fetch(`${BASE_URL}/events/${seed.event.slug}`);
  assert.equal(eventPage.status, 200);
  const eventHtml = await eventPage.text();
  assert.match(eventHtml, /event-badge-grid/);
  assert.match(eventHtml, /Event badges/);

  const response = await fetch(`${BASE_URL}/events/${seed.event.slug}/badges`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.success, true);
  assert.equal(payload.badges.length, 4);

  const hiddenBadge = payload.badges.find((badge) => badge.requirementType === 'mode_completed');
  assert.ok(hiddenBadge);

  const sql = getPostgresClient();
  await sql`
    UPDATE event_badges
    SET is_visible_on_event_page = FALSE
    WHERE id = ${hiddenBadge.eventBadgeId}
  `;

  const filteredResponse = await fetch(`${BASE_URL}/events/${seed.event.slug}/badges`);
  assert.equal(filteredResponse.status, 200);
  const filteredPayload = await filteredResponse.json();
  assert.equal(filteredPayload.success, true);
  assert.equal(filteredPayload.badges.length, 3);
  assert.equal(filteredPayload.badges.some((badge) => badge.eventBadgeId === hiddenBadge.eventBadgeId), false);
});

test('organizer badge manager renders hidden badges and updates display fields', async () => {
  if (!seed) return;

  const organizerCookie = await login(seed.organizer.email, seed.password);
  await waitForSessionReady('/organizer/dashboard', organizerCookie);

  const dashboardResponse = await fetch(`${BASE_URL}/organizer/dashboard`, {
    headers: { Cookie: organizerCookie }
  });
  assert.equal(dashboardResponse.status, 200);
  const dashboardHtml = await dashboardResponse.text();
  assert.match(dashboardHtml, /Organizer Badges/);
  assert.match(dashboardHtml, /Verified Organiser/);
  assert.match(dashboardHtml, /\/badges\/[0-9a-f-]+/i);

  await waitForSessionReady(`/organizer/events/${seed.event._id}/badges/manage`, organizerCookie);

  const managerResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/badges/manage`, {
    headers: { Cookie: organizerCookie }
  });
  assert.equal(managerResponse.status, 200);
  const managerHtml = await managerResponse.text();
  assert.match(managerHtml, /data-organizer-badge-manager/);
  assert.match(managerHtml, /Badge Manager/);
  assert.match(managerHtml, /Hidden/);

  const sql = getPostgresClient();
  const badgeRows = await sql`
    SELECT id
    FROM event_badges
    WHERE mongo_event_id = ${String(seed.event._id)}
    ORDER BY created_at ASC
    LIMIT 1
  `;
  assert.equal(badgeRows.length, 1);

  const csrf = await getCsrfFromAuthedPage(`/organizer/events/${seed.event._id}/badges/manage`, organizerCookie);
  const updateResponse = await fetch(`${BASE_URL}/organizer/events/${seed.event._id}/badges/${badgeRows[0].id}`, {
    method: 'POST',
    headers: {
      Cookie: organizerCookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html'
    },
    body: new URLSearchParams({
      _csrf: csrf.csrfToken,
      name: 'Custom Route Badge',
      description: 'Updated by organizer badge manager route test.',
      imageUrl: 'https://example.com/custom-route-badge.png',
      isVisible: '1',
      isActive: '1'
    }),
    redirect: 'manual'
  });
  assert.equal(updateResponse.status, 302);

  const updatedRows = await sql`
    SELECT badge_name_override, badge_description_override, badge_image_url, is_visible_on_event_page, is_active
    FROM event_badges
    WHERE id = ${badgeRows[0].id}
    LIMIT 1
  `;
  assert.equal(updatedRows[0]?.badge_name_override, 'Custom Route Badge');
  assert.equal(updatedRows[0]?.badge_description_override, 'Updated by organizer badge manager route test.');
  assert.equal(updatedRows[0]?.badge_image_url, 'https://example.com/custom-route-badge.png');
  assert.equal(updatedRows[0]?.is_visible_on_event_page, true);
  assert.equal(updatedRows[0]?.is_active, true);
});

test('runner badge endpoints return own badges and featured badge update is owner-scoped', async () => {
  if (!seed) return;

  const runnerCookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/profile', runnerCookie);

  const profilePage = await fetch(`${BASE_URL}/runner/profile`, {
    headers: { Cookie: runnerCookie }
  });
  assert.equal(profilePage.status, 200);
  const profileHtml = await profilePage.text();
  assert.match(profileHtml, /profile-badge-grid/);
  assert.match(profileHtml, /Achievement Badges/);
  assert.match(profileHtml, /Challenge Progress/);
  assert.match(profileHtml, /Public Collection/);
  assert.match(profileHtml, /\/badges\/[0-9a-f-]+/i);
  assert.match(profileHtml, new RegExp(`/runners/${seed.runner.userId}/badges`));

  const dashboardPage = await fetch(`${BASE_URL}/runner/dashboard`, {
    headers: { Cookie: runnerCookie }
  });
  assert.equal(dashboardPage.status, 200);
  const dashboardHtml = await dashboardPage.text();
  assert.match(dashboardHtml, /Recent Badges/);
  assert.match(dashboardHtml, /dashboard-badge-list/);
  assert.match(dashboardHtml, /Challenge Progress/);

  const badgesResponse = await fetch(`${BASE_URL}/runner/profile/badges`, {
    headers: { Cookie: runnerCookie }
  });
  assert.equal(badgesResponse.status, 200);
  const badgesPayload = await badgesResponse.json();
  assert.equal(badgesPayload.success, true);
  assert.equal(badgesPayload.badges.length, 4);

  const progressResponse = await fetch(`${BASE_URL}/runner/profile/badge-progress`, {
    headers: { Cookie: runnerCookie }
  });
  assert.equal(progressResponse.status, 200);
  const progressPayload = await progressResponse.json();
  assert.equal(progressPayload.success, true);
  assert.equal(Array.isArray(progressPayload.progress), true);

  const targetBadge = badgesPayload.badges.find((badge) => badge.requirementType === 'result_approved');
  assert.ok(targetBadge);

  const publicBadgePage = await fetch(`${BASE_URL}/badges/${targetBadge.userBadgeId}`);
  assert.equal(publicBadgePage.status, 200);
  const publicBadgeHtml = await publicBadgePage.text();
  assert.match(publicBadgeHtml, /Verified Badge/);
  assert.match(publicBadgeHtml, /Share This Badge/);
  assert.match(publicBadgeHtml, new RegExp(`/badges/${targetBadge.userBadgeId}/share-image\\.svg`));
  assert.match(publicBadgeHtml, new RegExp(`/badges/${targetBadge.userBadgeId}/open-badge\\.json`));
  assert.match(publicBadgeHtml, /application\/ld\+json/);
  assert.match(publicBadgeHtml, /og:image:width/);
  assert.match(publicBadgeHtml, new RegExp(targetBadge.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const publicBadgeShareImage = await fetch(`${BASE_URL}/badges/${targetBadge.userBadgeId}/share-image.svg`);
  assert.equal(publicBadgeShareImage.status, 200);
  assert.match(publicBadgeShareImage.headers.get('content-type') || '', /image\/svg\+xml/);
  const publicBadgeShareImageSvg = await publicBadgeShareImage.text();
  assert.match(publicBadgeShareImageSvg, /Verified Badge/);
  assert.match(publicBadgeShareImageSvg, new RegExp(targetBadge.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const openBadgeResponse = await fetch(`${BASE_URL}/badges/${targetBadge.userBadgeId}/open-badge.json`);
  assert.equal(openBadgeResponse.status, 200);
  assert.match(openBadgeResponse.headers.get('content-type') || '', /application\/json/);
  const openBadgePayload = await openBadgeResponse.json();
  assert.ok(Array.isArray(openBadgePayload['@context']));
  assert.ok(openBadgePayload.type.includes('OpenBadgeCredential'));
  assert.equal(openBadgePayload.credentialSubject.name, 'Badge Runner');
  assert.equal(openBadgePayload.credentialSubject.achievement.name, targetBadge.name);
  assert.equal(openBadgePayload.helloRun.userBadgeId, targetBadge.userBadgeId);
  assert.match(openBadgePayload.evidence[0].id, new RegExp(`/badges/${targetBadge.userBadgeId}$`));

  const publicVerifyResponse = await fetch(`${BASE_URL}/badges/${targetBadge.userBadgeId}/verify`);
  assert.equal(publicVerifyResponse.status, 200);
  const publicVerifyPayload = await publicVerifyResponse.json();
  assert.equal(publicVerifyPayload.success, true);
  assert.equal(publicVerifyPayload.badge.userBadgeId, targetBadge.userBadgeId);
  assert.equal(publicVerifyPayload.badge.verificationStatus, 'verified');

  const publicCollectionPage = await fetch(`${BASE_URL}/runners/${seed.runner.userId}/badges`);
  assert.equal(publicCollectionPage.status, 200);
  const publicCollectionHtml = await publicCollectionPage.text();
  assert.match(publicCollectionHtml, /Verified Collection/);
  assert.match(publicCollectionHtml, /Collection Summary/);
  assert.match(publicCollectionHtml, /Verified Badges/);
  assert.match(publicCollectionHtml, /Share Collection/);
  assert.match(publicCollectionHtml, new RegExp(`/runners/${seed.runner.userId}/badges/share-image\\.svg`));
  assert.match(publicCollectionHtml, new RegExp(targetBadge.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(publicCollectionHtml, new RegExp(seed.runner.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const publicCollectionShareImage = await fetch(`${BASE_URL}/runners/${seed.runner.userId}/badges/share-image.svg`);
  assert.equal(publicCollectionShareImage.status, 200);
  assert.match(publicCollectionShareImage.headers.get('content-type') || '', /image\/svg\+xml/);
  const publicCollectionShareImageSvg = await publicCollectionShareImage.text();
  assert.match(publicCollectionShareImageSvg, /Verified Collection/);
  assert.match(publicCollectionShareImageSvg, /BADGES/);

  const csrf = await getCsrfFromAuthedPage('/runner/profile', runnerCookie);
  const featureResponse = await fetch(`${BASE_URL}/runner/profile/badges/featured`, {
    method: 'POST',
    headers: {
      Cookie: runnerCookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrf.csrfToken,
      userBadgeId: targetBadge.userBadgeId
    }),
    redirect: 'manual'
  });
  assert.equal(featureResponse.status, 302);

  const sql = getPostgresClient();
  const featuredRows = await sql`
    SELECT id, is_featured
    FROM user_badges
    WHERE id = ${targetBadge.userBadgeId}
    LIMIT 1
  `;
  assert.equal(featuredRows[0]?.is_featured, true);

  const otherCookie = await login(seed.otherRunner.email, seed.password);
  await waitForSessionReady('/runner/profile', otherCookie);
  const otherCsrf = await getCsrfFromAuthedPage('/runner/profile', otherCookie);
  const otherFeatureResponse = await fetch(`${BASE_URL}/runner/profile/badges/featured`, {
    method: 'POST',
    headers: {
      Cookie: otherCookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: otherCsrf.csrfToken,
      userBadgeId: targetBadge.userBadgeId
    }),
    redirect: 'manual'
  });
  assert.equal(otherFeatureResponse.status, 302);

  const stillFeaturedRows = await sql`
    SELECT id, is_featured
    FROM user_badges
    WHERE id = ${targetBadge.userBadgeId}
    LIMIT 1
  `;
  assert.equal(stillFeaturedRows[0]?.is_featured, true);
});

test('admin badge revoke endpoint validates reason and revokes awarded badge', async () => {
  if (!seed) return;

  const sql = getPostgresClient();
  const badgeRows = await sql`
    SELECT ub.id, ub.badge_definition_id
    FROM user_badges ub
    JOIN badge_definitions bd ON bd.id = ub.badge_definition_id
    WHERE ub.mongo_user_id = ${String(seed.runner._id)}
      AND bd.requirement_type = 'distance_completed'
      AND ub.verification_status = 'verified'
    LIMIT 1
  `;
  assert.equal(badgeRows.length, 1);

  const adminCookie = await login(seed.admin.email, seed.password);
  await waitForSessionReady('/admin/dashboard', adminCookie);
  const csrf = await getCsrfFromAuthedPage('/admin/dashboard', adminCookie);

  const adminBadgesPage = await fetch(`${BASE_URL}/admin/badges`, {
    headers: {
      Cookie: adminCookie,
      Accept: 'text/html'
    }
  });
  assert.equal(adminBadgesPage.status, 200);
  const adminBadgesHtml = await adminBadgesPage.text();
  assert.match(adminBadgesHtml, /Badge Management/);
  assert.match(adminBadgesHtml, /Earned Badge Awards/);
  assert.match(adminBadgesHtml, /Recent Badge Audit Logs/);
  assert.match(adminBadgesHtml, /Badge Analytics/);
  assert.match(adminBadgesHtml, /Revocation Rate/);
  assert.match(adminBadgesHtml, /Top Awarded Definitions/);
  assert.match(adminBadgesHtml, /admin-badge-revoke-form/);
  assert.match(adminBadgesHtml, /badgeScope/);
  assert.match(adminBadgesHtml, /admin-badge-definition-status-form/);
  assert.match(adminBadgesHtml, /\/admin\/badge-definitions\/[0-9a-f-]+\/email/i);
  assert.match(adminBadgesHtml, /\/admin\/badges\/recalculate/);

  const adminBadgesJsonResponse = await fetch(`${BASE_URL}/admin/badges?scope=event&status=verified`, {
    headers: {
      Cookie: adminCookie,
      Accept: 'application/json'
    }
  });
  assert.equal(adminBadgesJsonResponse.status, 200);
  const adminBadgesJson = await adminBadgesJsonResponse.json();
  assert.equal(adminBadgesJson.success, true);
  assert.equal(adminBadgesJson.filters.scope, 'event');
  assert.equal(typeof adminBadgesJson.analytics.verifiedAwards, 'number');
  assert.ok(Array.isArray(adminBadgesJson.analytics.byType));

  const organiserBadgesPage = await fetch(`${BASE_URL}/admin/badges?scope=organiser&status=verified`, {
    headers: {
      Cookie: adminCookie,
      Accept: 'text/html'
    }
  });
  assert.equal(organiserBadgesPage.status, 200);
  const organiserBadgesHtml = await organiserBadgesPage.text();
  assert.match(organiserBadgesHtml, /Organiser Awards/);
  assert.match(organiserBadgesHtml, /Verified Organiser/);
  assert.match(organiserBadgesHtml, /status-badge-organiser/);
  assert.match(organiserBadgesHtml, /Open public badge/);
  assert.doesNotMatch(organiserBadgesHtml, /Badge Route Event/);

  const invalidDefinitionStatusResponse = await fetch(`${BASE_URL}/admin/badge-definitions/${badgeRows[0].badge_definition_id}/status`, {
    method: 'POST',
    headers: {
      Cookie: adminCookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html'
    },
    body: new URLSearchParams({
      _csrf: csrf.csrfToken,
      action: 'disable',
      reason: 'short',
      scope: 'all',
      status: 'verified'
    }),
    redirect: 'manual'
  });
  assert.equal(invalidDefinitionStatusResponse.status, 302);

  const disableDefinitionResponse = await fetch(`${BASE_URL}/admin/badge-definitions/${badgeRows[0].badge_definition_id}/status`, {
    method: 'POST',
    headers: {
      Cookie: adminCookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html'
    },
    body: new URLSearchParams({
      _csrf: csrf.csrfToken,
      action: 'disable',
      reason: 'Route test disable reason',
      scope: 'all',
      status: 'verified'
    }),
    redirect: 'manual'
  });
  assert.equal(disableDefinitionResponse.status, 302);

  const disabledDefinitionRows = await sql`
    SELECT is_active
    FROM badge_definitions
    WHERE id = ${badgeRows[0].badge_definition_id}
    LIMIT 1
  `;
  assert.equal(disabledDefinitionRows[0]?.is_active, false);

  const disabledPublicVerifyResponse = await fetch(`${BASE_URL}/badges/${badgeRows[0].id}/verify`);
  assert.equal(disabledPublicVerifyResponse.status, 200);

  const enableDefinitionResponse = await fetch(`${BASE_URL}/admin/badge-definitions/${badgeRows[0].badge_definition_id}/status`, {
    method: 'POST',
    headers: {
      Cookie: adminCookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html'
    },
    body: new URLSearchParams({
      _csrf: csrf.csrfToken,
      action: 'enable',
      reason: 'Route test enable reason',
      scope: 'all',
      status: 'verified'
    }),
    redirect: 'manual'
  });
  assert.equal(enableDefinitionResponse.status, 302);

  const enabledDefinitionRows = await sql`
    SELECT is_active
    FROM badge_definitions
    WHERE id = ${badgeRows[0].badge_definition_id}
    LIMIT 1
  `;
  assert.equal(enabledDefinitionRows[0]?.is_active, true);

  const emailLevelResponse = await fetch(`${BASE_URL}/admin/badge-definitions/${badgeRows[0].badge_definition_id}/email`, {
    method: 'POST',
    headers: {
      Cookie: adminCookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({
      _csrf: csrf.csrfToken,
      emailNotificationLevel: 'all',
      reason: 'Route test badge email rollout update',
      scope: 'all',
      status: 'verified'
    })
  });
  assert.equal(emailLevelResponse.status, 200);
  const emailLevelPayload = await emailLevelResponse.json();
  assert.equal(emailLevelPayload.success, true);

  const emailLevelRows = await sql`
    SELECT email_notification_level
    FROM badge_definitions
    WHERE id = ${badgeRows[0].badge_definition_id}
    LIMIT 1
  `;
  assert.equal(emailLevelRows[0]?.email_notification_level, 'all');

  const recalculateResponse = await fetch(`${BASE_URL}/admin/badges/recalculate`, {
    method: 'POST',
    headers: {
      Cookie: adminCookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({
      _csrf: csrf.csrfToken,
      scope: 'organiser',
      limit: '25',
      reason: 'Route test badge recalculation'
    })
  });
  assert.equal(recalculateResponse.status, 200);
  const recalculatePayload = await recalculateResponse.json();
  assert.equal(recalculatePayload.success, true);
  assert.equal(recalculatePayload.result.scope, 'organiser');
  assert.equal(typeof recalculatePayload.result.awardsCreated, 'number');
  assert.equal(typeof recalculatePayload.result.progressRefreshes, 'number');

  const recalculationAuditRows = await sql`
    SELECT action, metadata
    FROM badge_audit_logs
    WHERE action = 'badge_recalculated'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  assert.equal(recalculationAuditRows.length, 1);
  assert.equal(recalculationAuditRows[0].metadata.scope, 'organiser');

  const invalidResponse = await fetch(`${BASE_URL}/admin/user-badges/${badgeRows[0].id}/revoke`, {
    method: 'POST',
    headers: {
      Cookie: adminCookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrf.csrfToken,
      reason: 'bad'
    })
  });
  assert.equal(invalidResponse.status, 400);

  const revokeResponse = await fetch(`${BASE_URL}/admin/user-badges/${badgeRows[0].id}/revoke`, {
    method: 'POST',
    headers: {
      Cookie: adminCookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      _csrf: csrf.csrfToken,
      reason: 'Route integration revoke'
    })
  });
  assert.equal(revokeResponse.status, 200);
  const revokePayload = await revokeResponse.json();
  assert.equal(revokePayload.success, true);

  const revokedRows = await sql`
    SELECT verification_status, revoke_reason
    FROM user_badges
    WHERE id = ${badgeRows[0].id}
    LIMIT 1
  `;
  assert.equal(revokedRows[0]?.verification_status, 'revoked');
  assert.equal(revokedRows[0]?.revoke_reason, 'Route integration revoke');

  const revokedPublicResponse = await fetch(`${BASE_URL}/badges/${badgeRows[0].id}/verify`);
  assert.equal(revokedPublicResponse.status, 404);
});

async function seedBadgeRouteFixture() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const runner = await createUser({
    userId: `UBR${stamp}`.replace(/\W/g, '').slice(0, 22),
    email: `badge.route.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Badge',
    lastName: 'Runner'
  });
  const otherRunner = await createUser({
    userId: `UBO${stamp}`.replace(/\W/g, '').slice(0, 22),
    email: `badge.route.other.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Other',
    lastName: 'Runner'
  });
  const organizer = await createUser({
    userId: `UBG${stamp}`.replace(/\W/g, '').slice(0, 22),
    email: `badge.route.organizer.${stamp}@example.com`,
    passwordHash,
    role: 'organiser',
    organizerStatus: 'approved',
    firstName: 'Badge',
    lastName: 'Organizer'
  });
  const admin = await createUser({
    userId: `UBA${stamp}`.replace(/\W/g, '').slice(0, 22),
    email: `badge.route.admin.${stamp}@example.com`,
    passwordHash,
    role: 'admin',
    firstName: 'Badge',
    lastName: 'Admin'
  });

  const databaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = '';
  let event;
  let registration;
  let submission;
  try {
    const now = Date.now();
    event = await Event.create({
      isTestData: true,
      organizerId: organizer._id,
      slug: `badge-route-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
      referenceCode: `BRT-${String(stamp).replace(/\D/g, '').slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
      title: `Badge Route Event ${stamp}`.slice(0, 150),
      organiserName: 'Badge Organizer',
      description: 'Badge route fixture',
      status: 'published',
      eventType: 'virtual',
      eventTypesAllowed: ['virtual'],
      feeMode: 'free',
      feeAmount: 0,
      raceDistances: ['5K'],
      digitalBadgeEnabled: true,
      leaderboardRecognitionEnabled: false,
      registrationOpenAt: new Date(now - 24 * 60 * 60 * 1000),
      registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
      eventStartAt: new Date(now - 60 * 60 * 1000),
      eventEndAt: new Date(now + 24 * 60 * 60 * 1000),
      proofTypesAllowed: ['gps'],
      waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
      waiverVersion: 1
    });

    registration = await Registration.create({
      eventId: event._id,
      userId: runner._id,
      participant: {
        firstName: runner.firstName,
        lastName: runner.lastName,
        email: runner.email,
        mobile: runner.mobile,
        country: runner.country,
        emergencyContactName: runner.emergencyContactName,
        emergencyContactNumber: runner.emergencyContactNumber
      },
      participationMode: 'virtual',
      raceDistance: '5K',
      status: 'confirmed',
      paymentStatus: 'paid',
      confirmationCode: `HR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      waiver: {
        accepted: true,
        version: 1,
        signature: 'Badge Runner',
        acceptedAt: new Date(),
        templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
        renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
      },
      registeredAt: new Date()
    });

    submission = await Submission.create({
      registrationId: registration._id,
      eventId: event._id,
      runnerId: runner._id,
      participationMode: 'virtual',
      raceDistance: '5K',
      distanceKm: 5,
      elapsedMs: 1800000,
      proofType: 'gps',
      proof: {
        url: 'https://example.com/badge-route-proof.gpx',
        mimeType: 'application/gpx+xml',
        size: 1024
      },
      status: 'approved',
      reviewedAt: new Date(),
      reviewedBy: organizer._id
    });
  } finally {
    process.env.DATABASE_URL = databaseUrl;
  }

  await evaluateRegistrationAchievements(registration, { performedBy: organizer._id });
  await evaluateSubmissionAchievements(submission, { performedBy: organizer._id });
  await evaluateOrganiserAchievements(organizer._id, { performedBy: admin._id });

  return {
    password,
    runner,
    otherRunner,
    organizer,
    admin,
    event,
    registration,
    submission
  };
}

async function createUser(input) {
  return User.create({
    userId: input.userId,
    email: input.email,
    passwordHash: input.passwordHash,
    role: input.role,
    organizerStatus: input.organizerStatus || undefined,
    firstName: input.firstName,
    lastName: input.lastName,
    emailVerified: true,
    mobile: '09170000221',
    country: 'PH',
    emergencyContactName: 'Emergency Badge',
    emergencyContactNumber: '09170000222'
  });
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed) return;

  const sql = String(process.env.DATABASE_URL || '').trim() ? getPostgresClient() : null;
  const mongoUserIds = [
    currentSeed.runner?._id,
    currentSeed.otherRunner?._id,
    currentSeed.organizer?._id,
    currentSeed.admin?._id
  ].filter(Boolean).map(String);
  const mongoEventId = currentSeed.event?._id ? String(currentSeed.event._id) : '';
  const mongoRegistrationId = currentSeed.registration?._id ? String(currentSeed.registration._id) : '';
  const mongoSubmissionId = currentSeed.submission?._id ? String(currentSeed.submission._id) : '';

  if (sql && mongoEventId) {
    const eventRows = await sql`SELECT id FROM events_core WHERE mongo_event_id = ${mongoEventId}`;
    const eventCoreIds = eventRows.map((row) => row.id);
    if (eventCoreIds.length) {
      const definitionRows = await sql`
        SELECT badge_definition_id
        FROM event_badges
        WHERE event_core_id = ANY(${eventCoreIds})
      `;
      const definitionIds = definitionRows.map((row) => row.badge_definition_id);

      await sql`DELETE FROM badge_audit_logs WHERE event_core_id = ANY(${eventCoreIds})`;
      await sql`DELETE FROM user_badges WHERE event_core_id = ANY(${eventCoreIds}) OR mongo_event_id = ${mongoEventId}`;
      await sql`DELETE FROM event_badges WHERE event_core_id = ANY(${eventCoreIds})`;
      if (definitionIds.length) {
        await sql`DELETE FROM badge_definitions WHERE id = ANY(${definitionIds})`;
      }
      if (mongoSubmissionId) await sql`DELETE FROM submissions_core WHERE mongo_submission_id = ${mongoSubmissionId}`;
      if (mongoRegistrationId) await sql`DELETE FROM registrations WHERE mongo_registration_id = ${mongoRegistrationId}`;
      await sql`DELETE FROM events_core WHERE id = ANY(${eventCoreIds})`;
    }
  }

  if (sql && mongoUserIds.length) {
    await sql`DELETE FROM migration_records WHERE source_id = ANY(${mongoUserIds})`;
    await sql`DELETE FROM app_users WHERE mongo_user_id = ANY(${mongoUserIds})`;
  }

  await BadgeContent.deleteMany({ mongoEventId });
  await Notification.deleteMany({ userId: { $in: mongoUserIds } });
  await Submission.deleteMany({ _id: { $in: [currentSeed.submission?._id].filter(Boolean) } });
  await Registration.deleteMany({ _id: { $in: [currentSeed.registration?._id].filter(Boolean) } });
  if (currentSeed.event?._id) await Event.deleteOne({ _id: currentSeed.event._id });
  if (mongoUserIds.length) await User.deleteMany({ _id: { $in: mongoUserIds } });
}

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }),
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie, 'expected login to set a session cookie');
  return cookie;
}

async function getCsrfFromAuthedPage(pathname, cookie) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    headers: { Cookie: cookie }
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  const token = html.match(/name="_csrf"\s+value="([^"]+)"/)?.[1]
    || html.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1]
    || '';
  return { csrfToken: token };
}

async function waitForSessionReady(pathname, cookie, timeoutMs = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.status === 200) return true;
    await sleep(150);
  }
  throw new Error(`Session was not ready for ${pathname}`);
}

async function waitForServerReady(timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/healthz`);
      if (response.ok) return;
    } catch (_) {}
    await sleep(200);
  }
  throw new Error('Server did not become ready in time.');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
