'use strict';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

const CONNECTION_ENV_VARS = [
  'MONGODB_URI',
  'MONGO_URI',
  'MONGODB_URL',
  'DATABASE_URL',
  'SUPABASE_DB_URL',
  'POSTGRES_URL',
  'POSTGRES_URI',
  'REDIS_URL'
];

const DATABASE_ENV_VARS = new Set(CONNECTION_ENV_VARS.filter((name) => name !== 'REDIS_URL'));
const SAFE_DATABASE_NAME = /(?:^|[-_])(dev|test|testing|staging)(?:$|[-_])/i;

function parseConnectionTarget(uri) {
  const value = String(uri || '').trim();
  if (!value) return { hostname: '', database: '' };

  try {
    const parsed = new URL(value);
    return {
      hostname: parsed.hostname.toLowerCase(),
      database: decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] || '').toLowerCase()
    };
  } catch (_) {
    return { hostname: 'unparseable', database: '' };
  }
}

function hostnameOf(uri) {
  return parseConnectionTarget(uri).hostname;
}

function databaseNameOf(uri) {
  return parseConnectionTarget(uri).database;
}

function isLocalHostname(hostname) {
  if (!hostname) return true;
  return LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost');
}

function isSafeNonProductionDatabaseName(name) {
  return SAFE_DATABASE_NAME.test(String(name || ''));
}

function configuredTargets(env = process.env) {
  return CONNECTION_ENV_VARS.map((variable) => {
    const parsed = parseConnectionTarget(env[variable]);
    return { variable, ...parsed };
  }).filter((target) => target.hostname);
}

function findRemoteTargets(env = process.env) {
  return configuredTargets(env).filter((target) => !isLocalHostname(target.hostname));
}

function findUnsafeRemoteTargets(env = process.env) {
  return findRemoteTargets(env).filter((target) => (
    !DATABASE_ENV_VARS.has(target.variable) ||
    !isSafeNonProductionDatabaseName(target.database)
  ));
}

module.exports = {
  CONNECTION_ENV_VARS,
  databaseNameOf,
  findRemoteTargets,
  findUnsafeRemoteTargets,
  hostnameOf,
  isLocalHostname,
  isSafeNonProductionDatabaseName
};
