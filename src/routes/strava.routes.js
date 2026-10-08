const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const {
  requireAuth,
  requireRunnerWorkspace,
  requireRunnerWorkspaceJson
} = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const stravaService = require('../services/strava.service');
const stravaWebhookService = require('../services/strava-webhook.service');
const corosStravaBridgeService = require('../services/coros-strava-bridge.service');
const { isStravaPrivateViewerEnabled } = require('../utils/strava-private-viewer');

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const stravaActivityFetchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Too many Strava activity refreshes. Please wait a moment and try again.'
});

const stravaProviderLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 90,
  message: 'Strava request capacity is temporarily exhausted. Please try again later.',
  keyFn: () => 'strava:provider:read'
});

const stravaWebhookLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: 'Too many webhook requests.',
  keyFn: (req) => `strava:webhook:${req.ip || 'unknown'}`
});

const corosStravaBridgeLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many connected-app setup changes. Please wait a few minutes and try again.',
  keyFn: (req) => `coros-strava:${String(req.session?.userId || req.ip || 'unknown')}`
});

router.get('/integrations/strava/connect', requireAuth, requireRunnerWorkspace, requireStravaViewerPage, (req, res) => {
  try {
    const state = crypto.randomBytes(24).toString('hex');
    req.session.stravaOAuth = {
      state,
      userId: String(req.session.userId),
      createdAt: Date.now(),
      returnTo: getSafeReturnTo(req.query.returnTo || req.get('referer') || '/runner/profile')
    };
    return res.redirect(stravaService.buildAuthorizationUrl(state));
  } catch (error) {
    return res.redirect(`/runner/profile?type=error&msg=${encodeURIComponent(error.message || 'Unable to start Strava connection.')}`);
  }
});

router.get('/integrations/strava/callback', requireAuth, requireRunnerWorkspace, requireStravaViewerPage, async (req, res) => {
  const oauth = req.session?.stravaOAuth || {};
  const returnTo = getSafeReturnTo(oauth.returnTo || '/runner/profile');
  try {
    const expectedState = boundedString(oauth.state, 128);
    const actualState = boundedString(req.query.state, 128);
    delete req.session.stravaOAuth;

    const stateAgeMs = Date.now() - Number(oauth.createdAt);
    if (
      !safeEqual(expectedState, actualState) ||
      String(oauth.userId || '') !== String(req.session.userId || '') ||
      !Number.isFinite(Number(oauth.createdAt)) ||
      stateAgeMs < 0 ||
      stateAgeMs > OAUTH_STATE_TTL_MS
    ) {
      throw new Error('Invalid Strava connection state. Please try again.');
    }

    const code = boundedString(req.query.code, 512).trim();
    if (!code) {
      throw new Error('Strava did not return an authorization code.');
    }

    const payload = await stravaService.exchangeCodeForToken(code);
    await stravaService.saveConnectionFromTokenResponse(
      req.session.userId,
      payload,
      boundedString(req.query.scope, 256)
    );
    return res.redirect(withPageMessage(returnTo, 'success', 'Strava connected successfully.'));
  } catch (error) {
    return res.redirect(withPageMessage(returnTo, 'error', error.message || 'Unable to connect Strava.'));
  }
});

router.post('/integrations/strava/disconnect', requireAuth, requireRunnerWorkspace, requireCsrfProtection, async (req, res) => {
  const returnTo = getSafeReturnTo(req.body.returnTo || '/runner/profile');
  try {
    await stravaService.disconnect(req.session.userId);
    return res.redirect(withPageMessage(returnTo, 'success', 'Strava disconnected and your HelloRun COROS setup confirmation was cleared. Your native COROS–Strava connection was not changed.'));
  } catch (error) {
    return res.redirect(withPageMessage(returnTo, 'error', error.message || 'Unable to disconnect Strava.'));
  }
});

async function statusHandler(req, res) {
  try {
    const connection = await stravaService.getConnectionSummary(req.session.userId);
    return res.json({ success: true, connection });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load Strava connection.'
    });
  }
}

async function activitiesHandler(req, res) {
  try {
    const result = await stravaService.fetchRecentActivities(req.session.userId, {
      after: req.query.after,
      before: req.query.before,
      page: req.query.page,
      per_page: req.query.per_page
    });
    return res.json({
      success: true,
      connection: result.connection,
      activities: result.activities
    });
  } catch (error) {
    if (error.retryAfter) res.set('Retry-After', String(error.retryAfter));
    return res.status(getStatusForError(error)).json({
      success: false,
      code: error.code || 'strava_activity_fetch_failed',
      message: error.message || 'Unable to fetch Strava activities.'
    });
  }
}

router.get('/api/integrations/strava/status', requireAuthJson, requireRunnerWorkspaceJson, requireStravaViewerJson, statusHandler);
router.get('/api/integrations/strava/activities', requireAuthJson, requireRunnerWorkspaceJson, requireStravaViewerJson, stravaActivityFetchLimiter, stravaProviderLimiter, activitiesHandler);

router.delete('/api/integrations/strava/connection', requireAuthJson, requireRunnerWorkspaceJson, requireCsrfProtection, async (req, res) => {
  try {
    const receipt = await stravaService.disconnect(req.session.userId);
    return res.json({
      success: true,
      message: 'Strava connection and locally held connection data were deleted. HelloRun also cleared your COROS setup confirmation; your native COROS–Strava connection was not changed.',
      deletion: {
        receiptId: String(receipt._id),
        completedAt: receipt.localDeletionCompletedAt,
        remoteRevocationStatus: receipt.remoteRevocationStatus
      }
    });
  } catch (error) {
    return res.status(getStatusForError(error)).json({ success: false, code: error.code || 'strava_disconnect_failed', message: error.message });
  }
});

router.get('/api/strava/connection', requireAuthJson, requireRunnerWorkspaceJson, requireStravaViewerJson, deprecate('/api/integrations/strava/status'), statusHandler);
router.get('/api/strava/activities', requireAuthJson, requireRunnerWorkspaceJson, requireStravaViewerJson, deprecate('/api/integrations/strava/activities'), stravaActivityFetchLimiter, stravaProviderLimiter, activitiesHandler);

router.get('/api/integrations/coros-strava/status', requireAuthJson, requireRunnerWorkspaceJson, requireStravaViewerJson, async (req, res) => {
  try {
    const bridge = await corosStravaBridgeService.getStatus(req.session.userId);
    return res.json({ success: true, bridge });
  } catch (_error) {
    return res.status(500).json({ success: false, code: 'coros_strava_status_failed', message: 'Unable to load COROS setup status.' });
  }
});

router.post('/api/integrations/coros-strava/setup/start', requireAuthJson, requireRunnerWorkspaceJson, requireStravaViewerJson, corosStravaBridgeLimiter, requireCsrfProtection, async (req, res) => {
  try {
    const bridge = await corosStravaBridgeService.startSetup(req.session.userId);
    return res.json({ success: true, bridge });
  } catch (_error) {
    return res.status(500).json({ success: false, code: 'coros_strava_start_failed', message: 'Unable to start COROS setup.' });
  }
});

router.post('/api/integrations/coros-strava/setup/confirm', requireAuthJson, requireRunnerWorkspaceJson, requireStravaViewerJson, corosStravaBridgeLimiter, requireCsrfProtection, async (req, res) => {
  if (req.body?.confirmed !== true) {
    return res.status(400).json({ success: false, code: 'explicit_confirmation_required', message: 'Confirm that you saw your COROS activity in the private Strava view.' });
  }
  try {
    const bridge = await corosStravaBridgeService.confirmSetup(req.session.userId);
    return res.json({ success: true, bridge });
  } catch (error) {
    const isExpectedError = error instanceof corosStravaBridgeService.CorosStravaBridgeError;
    return res.status(isExpectedError ? error.status : 500).json({
      success: false,
      code: isExpectedError ? error.code : 'coros_strava_confirm_failed',
      message: isExpectedError ? error.message : 'Unable to confirm COROS setup.'
    });
  }
});

router.delete('/api/integrations/coros-strava/setup', requireAuthJson, requireRunnerWorkspaceJson, requireStravaViewerJson, corosStravaBridgeLimiter, requireCsrfProtection, async (req, res) => {
  try {
    const bridge = await corosStravaBridgeService.resetSetup(req.session.userId);
    return res.json({
      success: true,
      bridge,
      message: 'HelloRun removed your setup confirmation. Your native COROS–Strava connection was not changed.'
    });
  } catch (_error) {
    return res.status(500).json({ success: false, code: 'coros_strava_reset_failed', message: 'Unable to reset COROS setup.' });
  }
});

router.post('/api/events/:eventId/submissions/strava', requireAuthJson, requireRunnerWorkspaceJson, requireCsrfProtection, async (req, res) => {
  return res.status(403).json({
    success: false,
    code: 'external_use_blocked',
    message: 'Connected Strava activities are private and cannot be submitted to events. Upload permitted manual proof instead.'
  });
});

router.get('/api/integrations/strava/webhook', stravaWebhookLimiter, (req, res) => {
  const challenge = stravaWebhookService.verifyChallenge(req.query);
  if (!challenge) return res.status(403).json({ success: false, message: 'Webhook verification failed.' });
  return res.json({ 'hub.challenge': challenge });
});

router.post('/api/integrations/strava/webhook', stravaWebhookLimiter, async (req, res) => {
  try {
    await stravaWebhookService.enqueueWebhookEvent(req.body || {});
    return res.status(200).json({ success: true });
  } catch (_error) {
    return res.status(400).json({ success: false, message: 'Invalid webhook event.' });
  }
});

function requireAuthJson(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }
  return next();
}

function requireStravaViewerPage(req, res, next) {
  if (isStravaPrivateViewerEnabled()) return next();
  return res.redirect('/runner/profile?type=error&msg=Private%20Strava%20viewing%20is%20currently%20unavailable.');
}

function requireStravaViewerJson(req, res, next) {
  if (isStravaPrivateViewerEnabled()) return next();
  return res.status(503).json({
    success: false,
    code: 'integration_disabled',
    message: 'Private Strava viewing is currently unavailable.'
  });
}

function getSafeReturnTo(value) {
  const raw = String(value || '').trim();
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/runner/profile';
  if (/^\/(?:runner|my-registrations|events)(?:\/|$|\?)/.test(raw)) return raw;
  return '/runner/profile';
}

function safeEqual(left, right) {
  const a = Buffer.from(boundedString(left, 128));
  const b = Buffer.from(boundedString(right, 128));
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

function boundedString(value, maxLength) {
  const text = typeof value === 'string' ? value : '';
  return text.length <= maxLength ? text : '';
}

function deprecate(successor) {
  return function deprecationMiddleware(_req, res, next) {
    res.set('Deprecation', 'true');
    res.set('Link', `<${successor}>; rel="successor-version"`);
    next();
  };
}

function withPageMessage(path, type, message) {
  const url = new URL(getSafeReturnTo(path), 'https://hellorun.local');
  url.searchParams.set('type', type === 'error' ? 'error' : 'success');
  url.searchParams.set('msg', String(message || '').slice(0, 200));
  return `${url.pathname}${url.search}${url.hash}`;
}

function getStatusForError(error) {
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599) return error.status;
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('connect strava')) return 409;
  if (message.includes('not configured')) return 503;
  if (message.includes('already')) return 409;
  if (message.includes('not accepted') || message.includes('outside') || message.includes('registration')) return 400;
  return 500;
}

module.exports = router;
module.exports._private = {
  safeEqual,
  boundedString,
  getSafeReturnTo,
  getStatusForError,
  requireStravaViewerPage,
  requireStravaViewerJson,
  OAUTH_STATE_TTL_MS
};
