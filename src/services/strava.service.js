const StravaConnection = require('../models/StravaConnection');
const StravaRevocationJob = require('../models/StravaRevocationJob');
const StravaDeletionReceipt = require('../models/StravaDeletionReceipt');
const { encryptToken, decryptToken } = require('./token-encryption.service');

const STRAVA_AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE_URL = 'https://www.strava.com/api/v3';
const DEFAULT_SCOPE = 'read,activity:read';
const REFRESH_SKEW_SECONDS = 300;
const MAX_ACTIVITY_PAGE_SIZE = 30;
const REVOCATION_JOB_TTL_MS = 24 * 60 * 60 * 1000;
let providerBackoffUntil = 0;
let lastQuota = null;

class StravaApiError extends Error {
  constructor(message, { status = 500, code = 'strava_api_error', retryAfter = null } = {}) {
    super(message);
    this.name = 'StravaApiError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

function assertConfigured() {
  if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET || !process.env.STRAVA_REDIRECT_URI) {
    throw new Error('Strava integration is not configured.');
  }
}

function buildAuthorizationUrl(state) {
  assertConfigured();
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: process.env.STRAVA_REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: DEFAULT_SCOPE,
    state: String(state || '')
  });
  return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  assertConfigured();
  const payload = await postStravaToken({
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code'
  });
  return payload;
}

async function saveConnectionFromTokenResponse(userId, tokenPayload, acceptedScopes = '') {
  const athlete = tokenPayload?.athlete || {};
  const stravaAthleteId = Number(athlete.id || 0);
  if (!stravaAthleteId) {
    throw new Error('Strava did not return an athlete account.');
  }

  const athleteName = [athlete.firstname, athlete.lastname].filter(Boolean).join(' ').trim();
  const now = new Date();
  const update = {
    $set: {
      userId,
      stravaAthleteId,
      athleteName,
      accessTokenEncrypted: encryptToken(tokenPayload.access_token),
      refreshTokenEncrypted: encryptToken(tokenPayload.refresh_token),
      expiresAt: Number(tokenPayload.expires_at || 0),
      scope: normalizeAcceptedScopes(acceptedScopes || tokenPayload.scope),
      status: 'connected',
      disconnectedAt: null,
      updatedAt: now
    },
    $setOnInsert: {
      connectedAt: now
    }
  };

  const existingOwner = await StravaConnection.findOne({
    stravaAthleteId,
    userId: { $ne: userId }
  }).select('_id').lean();
  if (existingOwner) {
    throw new StravaApiError('This Strava account is already connected to another HelloRun account.', {
      status: 409,
      code: 'strava_athlete_conflict'
    });
  }

  try {
    return await StravaConnection.findOneAndUpdate(
      { userId },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error?.code === 11000) {
      throw new StravaApiError('This Strava account is already connected to another HelloRun account.', {
        status: 409,
        code: 'strava_athlete_conflict'
      });
    }
    throw error;
  }
}

async function getConnectionSummary(userId) {
  const connection = await StravaConnection.findOne({ userId, status: 'connected' })
    .select('stravaAthleteId athleteName scope connectedAt updatedAt lastSyncAt status')
    .lean();
  if (!connection) {
    return { connected: false };
  }
  return {
    connected: true,
    stravaAthleteId: connection.stravaAthleteId,
    athleteName: connection.athleteName || '',
    scope: connection.scope || '',
    connectedAt: connection.connectedAt || null,
    updatedAt: connection.updatedAt || null,
    lastSyncAt: connection.lastSyncAt || null
  };
}

async function disconnect(userId, { reason = 'user_disconnect' } = {}) {
  const connection = await StravaConnection.findOne({ userId });
  if (!connection) {
    return createDeletionReceipt(userId, reason, 'not_needed');
  }

  let remoteRevocationStatus = 'completed';
  let queuedToken = '';
  try {
    await revokeToken(decryptToken(connection.refreshTokenEncrypted), 'refresh_token');
  } catch (error) {
    if (![400, 401].includes(Number(error?.status || 0))) {
      remoteRevocationStatus = 'queued';
      queuedToken = connection.refreshTokenEncrypted;
    }
  }

  await StravaConnection.deleteOne({ _id: connection._id });
  const receipt = await createDeletionReceipt(userId, reason, remoteRevocationStatus);
  if (queuedToken) {
    const expiresAt = new Date(Date.now() + REVOCATION_JOB_TTL_MS);
    try {
      await StravaRevocationJob.create({
        userId,
        deletionReceiptId: receipt._id,
        encryptedToken: queuedToken,
        tokenType: 'refresh_token',
        retryAt: new Date(),
        expiresAt
      });
    } catch (error) {
      receipt.remoteRevocationStatus = 'manual_action_required';
      receipt.remoteRevocationLastErrorCode = String(error.code || 'queue_persistence_failed').slice(0, 80);
      await receipt.save();
    }
  }
  return receipt;
}

async function disconnectByAthleteId(stravaAthleteId) {
  const connection = await StravaConnection.findOne({ stravaAthleteId });
  if (!connection) return null;
  const userId = connection.userId;
  await StravaConnection.deleteOne({ _id: connection._id });
  return createDeletionReceipt(userId, 'provider_deauthorization', 'not_needed');
}

async function getConnectedAccount(userId) {
  const connection = await StravaConnection.findOne({ userId, status: 'connected' });
  if (!connection) {
    throw new Error('Connect Strava before importing activities.');
  }
  return connection;
}

async function getValidAccessToken(connection) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Number(connection.expiresAt || 0) > nowSeconds + REFRESH_SKEW_SECONDS) {
    return decryptToken(connection.accessTokenEncrypted);
  }

  return refreshAccessToken(connection);
}

async function refreshAccessToken(connection) {
  assertConfigured();
  const refreshToken = decryptToken(connection.refreshTokenEncrypted);
  try {
    const payload = await postStravaToken({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    connection.accessTokenEncrypted = encryptToken(payload.access_token);
    connection.refreshTokenEncrypted = encryptToken(payload.refresh_token);
    connection.expiresAt = Number(payload.expires_at || 0);
    connection.updatedAt = new Date();
    connection.status = 'connected';
    await connection.save();
    return payload.access_token;
  } catch (error) {
    connection.status = 'revoked';
    connection.updatedAt = new Date();
    await connection.save().catch(() => {});
    throw error;
  }
}

async function fetchRecentActivities(userId, query = {}) {
  const connection = await getConnectedAccount(userId);
  const accessToken = await getValidAccessToken(connection);
  const params = normalizeActivityQuery(query);

  const payload = await fetchStravaJson(`/athlete/activities?${params.toString()}`, accessToken);
  connection.lastSyncAt = new Date();
  connection.updatedAt = new Date();
  await connection.save();
  return {
    connection: {
      stravaAthleteId: connection.stravaAthleteId,
      athleteName: connection.athleteName || ''
    },
    activities: Array.isArray(payload) ? payload.map(normalizeActivitySummary) : []
  };
}

async function postStravaToken(body) {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw buildApiError(response, payload, 'Strava token request failed.');
  }
  return payload;
}

async function fetchStravaJson(path, accessToken) {
  assertProviderCapacity();
  const response = await fetch(`${STRAVA_API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  });
  applyQuotaHeaders(response.headers, response.status);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw buildApiError(response, payload, 'Strava API request failed.');
  }
  return payload;
}

function parseQuotaHeader(value) {
  const parts = String(value || '').split(',').map((part) => Number.parseInt(part.trim(), 10));
  return parts.length >= 2 && parts.every((part) => Number.isSafeInteger(part) && part >= 0)
    ? { short: parts[0], daily: parts[1] }
    : null;
}

function applyQuotaHeaders(headers, status = 200, now = Date.now()) {
  const limits = parseQuotaHeader(headers?.get?.('x-ratelimit-limit'));
  const usage = parseQuotaHeader(headers?.get?.('x-ratelimit-usage'));
  lastQuota = limits && usage ? { limits, usage, observedAt: new Date(now) } : lastQuota;
  const retryAfterSeconds = Number.parseInt(headers?.get?.('retry-after'), 10);
  if (Number(status) === 429) {
    providerBackoffUntil = Math.max(providerBackoffUntil, now + ((Number.isSafeInteger(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : 60) * 1000));
  } else if (limits && usage && (usage.short >= limits.short || usage.daily >= limits.daily)) {
    providerBackoffUntil = Math.max(providerBackoffUntil, now + (15 * 60 * 1000));
  }
  return lastQuota;
}

function assertProviderCapacity(now = Date.now()) {
  if (providerBackoffUntil <= now) return;
  const retryAfter = Math.max(1, Math.ceil((providerBackoffUntil - now) / 1000));
  throw new StravaApiError('Strava request capacity is temporarily exhausted.', {
    status: 429,
    code: 'strava_rate_limited',
    retryAfter
  });
}

async function revokeToken(token, tokenType = 'refresh_token') {
  assertConfigured();
  const basic = Buffer.from(`${process.env.STRAVA_CLIENT_ID}:${process.env.STRAVA_CLIENT_SECRET}`).toString('base64');
  const response = await fetch('https://www.strava.com/oauth/revoke', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({ token, token_type_hint: tokenType }).toString()
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw buildApiError(response, payload, 'Strava token revocation failed.');
  }
  return true;
}

async function processRevocationJobs({ limit = 20, now = new Date() } = {}) {
  const expiredJobs = await StravaRevocationJob.find({
    status: { $in: ['pending', 'processing', 'failed'] },
    expiresAt: { $lte: now }
  }).limit(100);
  for (const job of expiredJobs) {
    if (job.deletionReceiptId) {
      await StravaDeletionReceipt.updateOne(
        { _id: job.deletionReceiptId },
        { $set: { remoteRevocationStatus: 'exhausted', remoteRevocationLastErrorCode: job.lastErrorCode || 'retry_window_expired' } }
      );
    }
    await job.deleteOne();
  }
  const jobs = await StravaRevocationJob.find({
    status: { $in: ['pending', 'failed'] },
    retryAt: { $lte: now },
    expiresAt: { $gt: now }
  }).sort({ retryAt: 1 }).limit(Math.min(Math.max(Number(limit) || 20, 1), 100));

  const result = { processed: 0, completed: 0, failed: 0 };
  for (const job of jobs) {
    result.processed += 1;
    job.status = 'processing';
    await job.save();
    try {
      await revokeToken(decryptToken(job.encryptedToken), job.tokenType);
      if (job.deletionReceiptId) {
        await StravaDeletionReceipt.updateOne(
          { _id: job.deletionReceiptId },
          { $set: { remoteRevocationStatus: 'completed', remoteRevocationCompletedAt: new Date(), remoteRevocationLastErrorCode: '' } }
        );
      }
      await job.deleteOne();
      result.completed += 1;
    } catch (error) {
      job.attempts += 1;
      job.status = 'failed';
      job.lastErrorCode = String(error.code || error.status || 'revocation_failed').slice(0, 80);
      job.retryAt = new Date(Date.now() + Math.min(60 * 60 * 1000, 30_000 * (2 ** job.attempts)));
      await job.save();
      result.failed += 1;
    }
  }
  return result;
}

function normalizeActivityQuery(query = {}) {
  const params = new URLSearchParams();
  for (const key of ['after', 'before']) {
    const value = Number.parseInt(query[key], 10);
    if (Number.isSafeInteger(value) && value > 0) params.set(key, String(value));
  }
  const page = Number.parseInt(query.page, 10);
  params.set('page', String(Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100) : 1));
  const perPage = Number.parseInt(query.per_page, 10);
  params.set('per_page', String(Number.isSafeInteger(perPage) ? Math.min(Math.max(perPage, 1), MAX_ACTIVITY_PAGE_SIZE) : MAX_ACTIVITY_PAGE_SIZE));
  return params;
}

function normalizeAcceptedScopes(value) {
  const scopes = String(value || '').split(',').map((scope) => scope.trim()).filter(Boolean);
  if (!scopes.includes('activity:read')) {
    throw new StravaApiError('Strava activity permission was not granted.', {
      status: 400,
      code: 'strava_scope_declined'
    });
  }
  return [...new Set(scopes)].sort().join(',');
}

function buildApiError(response, payload, fallback) {
  const status = Number(response.status || 500);
  const retryAfter = response.headers?.get?.('retry-after');
  const code = status === 429 ? 'strava_rate_limited' : status === 401 ? 'strava_unauthorized' : 'strava_api_error';
  return new StravaApiError(payload?.message || payload?.error || fallback, { status, code, retryAfter });
}

function createDeletionReceipt(userId, reason, remoteRevocationStatus) {
  return StravaDeletionReceipt.create({
    userId,
    reason,
    localDeletionCompletedAt: new Date(),
    remoteRevocationStatus
  });
}

function normalizeActivitySummary(activity = {}) {
  const distanceMeters = Number(activity.distance || 0);
  const movingTimeSeconds = Number(activity.moving_time || 0);
  const elapsedTimeSeconds = Number(activity.elapsed_time || movingTimeSeconds || 0);
  return {
    id: Number(activity.id || 0),
    name: String(activity.name || 'Untitled activity').trim(),
    type: String(activity.type || activity.sport_type || '').trim(),
    sportType: String(activity.sport_type || activity.type || '').trim(),
    distanceMeters,
    distanceKm: roundDistanceKm(distanceMeters / 1000),
    movingTimeSeconds,
    elapsedTimeSeconds,
    startDate: activity.start_date || '',
    startDateLocal: activity.start_date_local || activity.start_date || '',
    timezone: String(activity.timezone || '').trim(),
    elevationGain: numberOrNull(activity.total_elevation_gain),
    averageSpeed: numberOrNull(activity.average_speed),
    stravaUrl: activity.id ? `https://www.strava.com/activities/${activity.id}` : ''
  };
}

function normalizeActivityDetail(activity = {}) {
  return {
    ...normalizeActivitySummary(activity),
    athleteId: Number(activity.athlete?.id || 0),
    description: String(activity.description || '').trim().slice(0, 500)
  };
}

function roundDistanceKm(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
}

function numberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

module.exports = {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  saveConnectionFromTokenResponse,
  getConnectionSummary,
  disconnect,
  disconnectByAthleteId,
  fetchRecentActivities,
  normalizeActivitySummary,
  normalizeActivityDetail,
  revokeToken,
  processRevocationJobs,
  StravaApiError,
  _private: {
    getValidAccessToken,
    refreshAccessToken,
    normalizeAcceptedScopes,
    normalizeActivityQuery,
    buildApiError,
    parseQuotaHeader,
    applyQuotaHeaders,
    assertProviderCapacity,
    resetProviderThrottleForTests() { providerBackoffUntil = 0; lastQuota = null; }
  }
};
