const StravaConnection = require('../models/StravaConnection');
const { encryptToken, decryptToken } = require('./token-encryption.service');

const STRAVA_AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE_URL = 'https://www.strava.com/api/v3';
const DEFAULT_SCOPE = 'read,activity:read';
const REFRESH_SKEW_SECONDS = 300;

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

async function saveConnectionFromTokenResponse(userId, tokenPayload) {
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
      scope: String(tokenPayload.scope || DEFAULT_SCOPE),
      status: 'connected',
      disconnectedAt: null,
      updatedAt: now
    },
    $setOnInsert: {
      connectedAt: now
    }
  };

  return StravaConnection.findOneAndUpdate(
    { userId },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function getConnectionSummary(userId) {
  const connection = await StravaConnection.findOne({ userId, status: 'connected' })
    .select('stravaAthleteId athleteName scope connectedAt updatedAt status')
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
    updatedAt: connection.updatedAt || null
  };
}

async function disconnect(userId) {
  const connection = await StravaConnection.findOne({ userId });
  if (!connection) return null;
  connection.status = 'disconnected';
  connection.disconnectedAt = new Date();
  connection.updatedAt = new Date();
  connection.accessTokenEncrypted = encryptToken('disconnected-access-token');
  connection.refreshTokenEncrypted = encryptToken('disconnected-refresh-token');
  await connection.save();
  return connection;
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
  const params = new URLSearchParams();
  ['after', 'before', 'page', 'per_page'].forEach((key) => {
    const value = query[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      params.set(key, String(value).trim());
    }
  });
  if (!params.has('per_page')) params.set('per_page', '30');

  const payload = await fetchStravaJson(`/athlete/activities?${params.toString()}`, accessToken);
  return {
    connection: {
      stravaAthleteId: connection.stravaAthleteId,
      athleteName: connection.athleteName || ''
    },
    activities: Array.isArray(payload) ? payload.map(normalizeActivitySummary) : []
  };
}

async function fetchActivityById(userId, activityId) {
  const connection = await getConnectedAccount(userId);
  const accessToken = await getValidAccessToken(connection);
  const activity = await fetchStravaJson(`/activities/${encodeURIComponent(String(activityId))}`, accessToken);
  return {
    connection,
    activity: normalizeActivityDetail(activity)
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
    throw new Error(payload.message || payload.error || 'Strava token request failed.');
  }
  return payload;
}

async function fetchStravaJson(path, accessToken) {
  const response = await fetch(`${STRAVA_API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'Strava API request failed.');
  }
  return payload;
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
  fetchRecentActivities,
  fetchActivityById,
  normalizeActivitySummary,
  normalizeActivityDetail,
  _private: {
    getValidAccessToken,
    refreshAccessToken
  }
};
