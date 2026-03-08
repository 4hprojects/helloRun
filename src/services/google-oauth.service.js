const crypto = require('crypto');

const GOOGLE_AUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

function getConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || ''
  };
}

function isConfigured() {
  const config = getConfig();
  return Boolean(config.clientId && config.clientSecret && config.callbackUrl);
}

function createStateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function buildAuthorizationUrl({ state }) {
  const { clientId, callbackUrl } = getConfig();
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account'
  });
  return `${GOOGLE_AUTH_BASE_URL}?${query.toString()}`;
}

async function exchangeCodeForTokens({ code }) {
  const { clientId, clientSecret, callbackUrl } = getConfig();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: callbackUrl,
    grant_type: 'authorization_code'
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token exchange failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function fetchUserInfo({ accessToken }) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google userinfo request failed: ${response.status} ${text}`);
  }

  return response.json();
}

module.exports = {
  isConfigured,
  createStateToken,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  fetchUserInfo
};
