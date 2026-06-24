const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const stravaService = require('../services/strava.service');
const { submitStravaActivity } = require('../services/strava-submission.service');

const stravaActivityFetchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Too many Strava activity refreshes. Please wait a moment and try again.'
});

const stravaSubmissionLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 8,
  message: 'Too many Strava result submissions. Please wait a few minutes and try again.'
});

router.get('/integrations/strava/connect', requireAuth, (req, res) => {
  try {
    const state = crypto.randomBytes(24).toString('hex');
    req.session.stravaOAuthState = state;
    req.session.stravaReturnTo = getSafeReturnTo(req.query.returnTo || req.get('referer') || '/runner/profile');
    return res.redirect(stravaService.buildAuthorizationUrl(state));
  } catch (error) {
    return res.redirect(`/runner/profile?type=error&msg=${encodeURIComponent(error.message || 'Unable to start Strava connection.')}`);
  }
});

router.get('/integrations/strava/callback', requireAuth, async (req, res) => {
  const returnTo = getSafeReturnTo(req.session?.stravaReturnTo || '/runner/profile');
  try {
    const expectedState = String(req.session?.stravaOAuthState || '');
    const actualState = String(req.query.state || '');
    delete req.session.stravaOAuthState;
    delete req.session.stravaReturnTo;

    if (!expectedState || !actualState || expectedState !== actualState) {
      throw new Error('Invalid Strava connection state. Please try again.');
    }

    const code = String(req.query.code || '').trim();
    if (!code) {
      throw new Error('Strava did not return an authorization code.');
    }

    const payload = await stravaService.exchangeCodeForToken(code);
    await stravaService.saveConnectionFromTokenResponse(req.session.userId, payload);
    return res.redirect(withPageMessage(returnTo, 'success', 'Strava connected successfully.'));
  } catch (error) {
    return res.redirect(withPageMessage(returnTo, 'error', error.message || 'Unable to connect Strava.'));
  }
});

router.post('/integrations/strava/disconnect', requireAuth, requireCsrfProtection, async (req, res) => {
  const returnTo = getSafeReturnTo(req.body.returnTo || '/runner/profile');
  try {
    await stravaService.disconnect(req.session.userId);
    return res.redirect(withPageMessage(returnTo, 'success', 'Strava disconnected successfully.'));
  } catch (error) {
    return res.redirect(withPageMessage(returnTo, 'error', error.message || 'Unable to disconnect Strava.'));
  }
});

router.get('/api/strava/connection', requireAuthJson, async (req, res) => {
  try {
    const connection = await stravaService.getConnectionSummary(req.session.userId);
    return res.json({ success: true, connection });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load Strava connection.'
    });
  }
});

router.get('/api/strava/activities', requireAuthJson, stravaActivityFetchLimiter, async (req, res) => {
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
    return res.status(getStatusForError(error)).json({
      success: false,
      message: error.message || 'Unable to fetch Strava activities.'
    });
  }
});

router.post('/api/events/:eventId/submissions/strava', requireAuthJson, requireCsrfProtection, stravaSubmissionLimiter, async (req, res) => {
  try {
    const result = await submitStravaActivity({
      runnerId: req.session.userId,
      eventId: req.params.eventId,
      stravaActivityId: req.body.stravaActivityId
    });

    return res.status(201).json({
      success: true,
      message: 'Strava activity submitted for review.',
      submissionId: String(result.submission?._id || ''),
      submissionType: result.type
    });
  } catch (error) {
    return res.status(getStatusForError(error)).json({
      success: false,
      message: error.message || 'Unable to submit Strava activity.'
    });
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

function getSafeReturnTo(value) {
  const raw = String(value || '').trim();
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/runner/profile';
  if (/^\/(?:runner|my-registrations|events)(?:\/|$|\?)/.test(raw)) return raw;
  return '/runner/profile';
}

function withPageMessage(path, type, message) {
  const url = new URL(getSafeReturnTo(path), 'https://hellorun.local');
  url.searchParams.set('type', type === 'error' ? 'error' : 'success');
  url.searchParams.set('msg', String(message || '').slice(0, 200));
  return `${url.pathname}${url.search}${url.hash}`;
}

function getStatusForError(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('connect strava')) return 409;
  if (message.includes('not configured')) return 503;
  if (message.includes('already')) return 409;
  if (message.includes('not accepted') || message.includes('outside') || message.includes('registration')) return 400;
  return 500;
}

module.exports = router;
