'use strict';

require('dotenv').config();

const SUBSCRIPTIONS_URL = 'https://www.strava.com/api/v3/push_subscriptions';
const COMMANDS = new Set(['list', 'create', 'verify', 'delete']);

function parseArguments(argv = process.argv.slice(2)) {
  const command = String(argv[0] || '').trim().toLowerCase();
  if (!COMMANDS.has(command)) {
    throw new Error('Usage: node src/scripts/manage-strava-webhook.js <list|create|verify|delete> [--id=<subscription-id>]');
  }
  let id = null;
  for (const argument of argv.slice(1)) {
    if (!argument.startsWith('--id=')) throw new Error(`Unknown argument: ${argument}`);
    id = Number.parseInt(argument.slice(5), 10);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Webhook subscription id must be a positive integer.');
  }
  return { command, id };
}

function getConfiguration(env = process.env) {
  for (const name of ['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET', 'STRAVA_WEBHOOK_VERIFY_TOKEN', 'APP_URL']) {
    if (!String(env[name] || '').trim()) throw new Error(`${name} is required.`);
  }
  const callbackUrl = String(env.STRAVA_WEBHOOK_CALLBACK_URL || `${String(env.APP_URL).replace(/\/$/, '')}/api/integrations/strava/webhook`).trim();
  const parsed = new URL(callbackUrl);
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    throw new Error('The Strava webhook callback must use HTTPS outside local development.');
  }
  return {
    clientId: String(env.STRAVA_CLIENT_ID).trim(),
    clientSecret: String(env.STRAVA_CLIENT_SECRET).trim(),
    verifyToken: String(env.STRAVA_WEBHOOK_VERIFY_TOKEN).trim(),
    callbackUrl
  };
}

async function requestSubscriptions(config, fetchImpl = fetch) {
  const url = new URL(SUBSCRIPTIONS_URL);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('client_secret', config.clientSecret);
  const response = await fetchSafe(fetchImpl, url, { headers: { Accept: 'application/json' } }, 'Unable to contact Strava while listing webhook subscriptions.');
  return readResponse(response, 'Unable to list Strava webhook subscriptions.');
}

async function createSubscription(config, fetchImpl = fetch) {
  const existing = await requestSubscriptions(config, fetchImpl);
  if (existing.length) {
    const current = existing[0];
    if (existing.length === 1 && String(current.callback_url || '') === config.callbackUrl) {
      return { action: 'unchanged', subscription: sanitizeSubscription(current) };
    }
    throw new Error('A different Strava webhook subscription already exists. Review it and delete it explicitly before creating another.');
  }
  const response = await fetchSafe(fetchImpl, SUBSCRIPTIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      callback_url: config.callbackUrl,
      verify_token: config.verifyToken
    }).toString()
  }, 'Unable to contact Strava while creating the webhook subscription.');
  const payload = await readResponse(response, 'Unable to create the Strava webhook subscription.');
  return { action: 'created', subscription: sanitizeSubscription({ ...payload, callback_url: config.callbackUrl }) };
}

async function verifySubscription(config, fetchImpl = fetch) {
  const subscriptions = await requestSubscriptions(config, fetchImpl);
  const matching = subscriptions.filter((item) => String(item.callback_url || '') === config.callbackUrl);
  return {
    verified: subscriptions.length === 1 && matching.length === 1,
    expectedCallbackUrl: config.callbackUrl,
    subscriptions: subscriptions.map(sanitizeSubscription)
  };
}

async function deleteSubscription(config, id, fetchImpl = fetch) {
  let subscriptionId = id;
  if (!subscriptionId) {
    const subscriptions = await requestSubscriptions(config, fetchImpl);
    if (subscriptions.length !== 1) throw new Error('Specify --id when there is not exactly one Strava webhook subscription.');
    subscriptionId = Number(subscriptions[0].id);
  }
  const url = new URL(`${SUBSCRIPTIONS_URL}/${subscriptionId}`);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('client_secret', config.clientSecret);
  const response = await fetchSafe(fetchImpl, url, { method: 'DELETE', headers: { Accept: 'application/json' } }, 'Unable to contact Strava while deleting the webhook subscription.');
  if (!response.ok) await readResponse(response, 'Unable to delete the Strava webhook subscription.');
  return { action: 'deleted', subscriptionId };
}

function sanitizeSubscription(subscription = {}) {
  return {
    id: Number(subscription.id || 0) || null,
    callbackUrl: String(subscription.callback_url || ''),
    createdAt: subscription.created_at || null,
    updatedAt: subscription.updated_at || null
  };
}

async function readResponse(response, fallback) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(payload.message || payload.error || fallback).slice(0, 300);
    throw new Error(`${message} (HTTP ${response.status})`);
  }
  return payload;
}

async function fetchSafe(fetchImpl, url, options, failureMessage) {
  try {
    return await fetchImpl(url, options);
  } catch (_error) {
    throw new Error(failureMessage);
  }
}

async function run(options, { env = process.env, fetchImpl = fetch } = {}) {
  const config = getConfiguration(env);
  if (options.command === 'list') {
    const subscriptions = await requestSubscriptions(config, fetchImpl);
    return { subscriptions: subscriptions.map(sanitizeSubscription) };
  }
  if (options.command === 'create') return createSubscription(config, fetchImpl);
  if (options.command === 'verify') {
    const result = await verifySubscription(config, fetchImpl);
    if (!result.verified) throw new Error(`Strava webhook verification failed for ${result.expectedCallbackUrl}.`);
    return result;
  }
  return deleteSubscription(config, options.id, fetchImpl);
}

if (require.main === module) {
  let options;
  try {
    options = parseArguments();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  run(options)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = {
  SUBSCRIPTIONS_URL,
  parseArguments,
  getConfiguration,
  sanitizeSubscription,
  requestSubscriptions,
  createSubscription,
  verifySubscription,
  deleteSubscription,
  run
};
