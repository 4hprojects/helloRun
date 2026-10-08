'use strict';

const CorosStravaBridge = require('../models/CorosStravaBridge');
const StravaConnection = require('../models/StravaConnection');

const GUIDE_VERSION = 'coros-strava-v1';

class CorosStravaBridgeError extends Error {
  constructor(message, { status = 400, code = 'coros_strava_bridge_error' } = {}) {
    super(message);
    this.name = 'CorosStravaBridgeError';
    this.status = status;
    this.code = code;
  }
}

async function getStatus(userId) {
  const [bridge, stravaConnected] = await Promise.all([
    CorosStravaBridge.findOne({ userId }).lean(),
    StravaConnection.exists({ userId, status: 'connected' })
  ]);
  return normalizeStatus(bridge, Boolean(stravaConnected));
}

async function startSetup(userId) {
  const existing = await CorosStravaBridge.findOne({ userId });
  if (existing) return normalizeStatus(existing, await hasStravaConnection(userId));

  try {
    const bridge = await CorosStravaBridge.create({
      userId,
      status: 'setup_started',
      guideVersion: GUIDE_VERSION,
      startedAt: new Date()
    });
    return normalizeStatus(bridge, await hasStravaConnection(userId));
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return getStatus(userId);
  }
}

async function confirmSetup(userId) {
  if (!await hasStravaConnection(userId)) {
    throw new CorosStravaBridgeError('Connect Strava to HelloRun before confirming the COROS bridge.', {
      status: 409,
      code: 'strava_connection_required'
    });
  }

  const existing = await CorosStravaBridge.findOne({ userId });
  if (existing?.status === 'user_confirmed') return normalizeStatus(existing, true);

  const confirmedAt = new Date();
  try {
    const bridge = await CorosStravaBridge.findOneAndUpdate(
      { userId },
      {
        $set: { status: 'user_confirmed', guideVersion: GUIDE_VERSION, confirmedAt },
        $setOnInsert: { startedAt: confirmedAt }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    return normalizeStatus(bridge, true);
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return getStatus(userId);
  }
}

async function resetSetup(userId) {
  await CorosStravaBridge.deleteOne({ userId });
  return normalizeStatus(null, await hasStravaConnection(userId));
}

async function clearForUser(userId) {
  const result = await CorosStravaBridge.deleteOne({ userId });
  return Number(result.deletedCount || 0) > 0;
}

async function hasStravaConnection(userId) {
  return Boolean(await StravaConnection.exists({ userId, status: 'connected' }));
}

function normalizeStatus(bridge, stravaConnected) {
  return {
    status: bridge?.status || 'not_started',
    guideVersion: bridge?.guideVersion || GUIDE_VERSION,
    startedAt: bridge?.startedAt || null,
    confirmedAt: bridge?.confirmedAt || null,
    stravaConnected: Boolean(stravaConnected),
    canValidate: Boolean(stravaConnected)
  };
}

module.exports = {
  GUIDE_VERSION,
  CorosStravaBridgeError,
  getStatus,
  startSetup,
  confirmSetup,
  resetSetup,
  clearForUser,
  normalizeStatus
};
