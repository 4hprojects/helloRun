require('dotenv').config();

// ===== SENTRY (initialise before anything else) =====
let Sentry;
if (process.env.SENTRY_DSN) {
  Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0
  });
}

// ===== PROCESS-LEVEL ERROR GUARDS =====
process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  try { require('./utils/logger').error('[UnhandledRejection]', { reason: msg }); } catch (_) { console.error('[UnhandledRejection]', msg); }
  if (Sentry) Sentry.captureException(reason instanceof Error ? reason : new Error(msg));
});

process.on('uncaughtException', (error) => {
  try { require('./utils/logger').error('[UncaughtException]', { error: error.message, stack: error.stack }); } catch (_) { console.error('[UncaughtException]', error); }
  if (Sentry) Sentry.captureException(error);
  process.exit(1);
});

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const { sendJsonServerError } = require('./utils/json-error-response');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const { attachCsrfToken } = require('./middleware/csrf.middleware');

// Fail fast if critical env vars are missing
if (!process.env.SESSION_SECRET) {
  logger.error('FATAL: SESSION_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

// ===== STEP 1: MIDDLEWARE (MUST BE FIRST) =====
logger.info('Loading middleware...');

// Sentry request tracing (must be first Express middleware when enabled)
if (Sentry) {
  app.use(Sentry.Handlers.requestHandler());
}

// Request timeout — kill hung requests before they exhaust the connection pool
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    logger.warn('Request timeout', { method: req.method, url: req.url });
    if (!res.headersSent) res.status(503).json({ error: 'Request timed out.' });
  });
  next();
});

app.disable('x-powered-by');
if (isProduction) {
  app.set('trust proxy', 1);
}

function canEmbedSameOriginReviewPage(pathname) {
  return (
    /^\/organizer\/events\/[^/]+\/submissions\/[^/]+\/review\/?$/.test(pathname) ||
    /^\/organizer\/events\/[^/]+\/run-proofs\/review\/?$/.test(pathname)
  );
}

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', canEmbedSameOriginReviewPage(req.path) ? 'SAMEORIGIN' : 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://challenges.cloudflare.com blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' data: https://www.google-analytics.com https://analytics.google.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://unpkg.com",
      "frame-src 'self' https://challenges.cloudflare.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Body parser BEFORE routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/healthz', (req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/readyz', async (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const { getRedisClient } = require('./config/redis');
  const redisClient = getRedisClient();
  let redisStatus = 'not_configured';
  if (redisClient) {
    try {
      const pong = await redisClient.ping();
      redisStatus = pong === 'PONG' ? 'ready' : 'degraded';
    } catch (_) {
      redisStatus = 'not_ready';
    }
  }

  const ok = mongoReady && redisStatus !== 'not_ready';
  return res.status(ok ? 200 : 503).json({
    ok,
    dependencies: {
      mongo: mongoReady ? 'ready' : 'not_ready',
      redis: redisStatus
    }
  });
});

app.get('/healthz/sync', async (req, res) => {
  if (req.session?.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Admin access required.' });
  }
  try {
    const { getRecentFailures, countUnresolvedFailures } = require('./services/sync-failure.service');
    const [byType, recent] = await Promise.all([
      countUnresolvedFailures(1440),
      getRecentFailures({ limit: 10, sinceMins: 1440 })
    ]);
    const total = byType.reduce((sum, row) => sum + row.count, 0);
    return res.status(200).json({
      ok: total === 0,
      checkedAt: new Date().toISOString(),
      unresolvedLast24h: { total, byType },
      recentFailures: recent
    });
  } catch (error) {
    return sendJsonServerError(res, 'Sync health check failed:', error, {
      status: 503,
      clientMessage: 'Postgres unavailable.',
      body: { ok: false }
    });
  }
});

// Avoid noisy 404s for favicon requests in development
app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

// Optional dev request-body debug logging
if (!isProduction && process.env.DEBUG_HTTP_BODIES === '1') {
  app.use((req, res, next) => {
    if (req.method === 'POST') {
      logger.info('Received POST:', req.url);
      const safeBody = { ...req.body };
      delete safeBody.password;
      delete safeBody.confirmPassword;
      delete safeBody.currentPassword;
      delete safeBody.newPassword;
      logger.info('Body:', safeBody);
    }
    next();
  });
}

// Static files — 1-day cache; browsers revalidate with ETag/Last-Modified
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: isProduction ? '1d' : 0,
  etag: true,
  lastModified: true
}));

// ===== STEP 2: VIEW ENGINE =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== STEP 3: DATABASE CONNECTION =====
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 20,
      minPoolSize: 5
    });
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

// ===== STEP 4: SESSION =====
app.use(session({
  name: 'hr.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7
  },
  store: new MongoStore({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600
  })
}));
app.use(attachCsrfToken);

// ===== ROUTES =====
logger.info('Loading routes...');
const { populateAuthLocals } = require('./middleware/auth.middleware');
const { populateAdLocals } = require('./middleware/ad.middleware');
const authRoutes = require('./routes/authRoutes');
const pageRoutes = require('./routes/pageRoutes');
const runnerRoutes = require('./routes/runner.routes');
const blogRoutes = require('./routes/blog.routes');
const organizerRoutes = require('./routes/organizer.routes');
const certificateTemplateRoutes = require('./routes/certificateTemplate.routes');
const certificateRoutes = require('./routes/certificate.routes');
const certificateVerificationRoutes = require('./routes/certificateVerification.routes');
const adminRoutes = require('./routes/admin.routes');
const stravaRoutes = require('./routes/strava.routes');
const shopRoutes = require('./routes/shop.routes');
const organizerShopRoutes = require('./routes/organizer-shop.routes');
const adminShopRoutes = require('./routes/admin-shop.routes');
const timingSystemWebhooks = require('./routes/webhooks/timing-system');

// Auth locals for all views (BEFORE routes)
app.use(populateAuthLocals);
app.use(populateAdLocals);
app.use(populatePublicPageLocals);

app.use('/', authRoutes);
app.use('/', shopRoutes);
// pageRoutes mounts before blogRoutes — pageController owns GET /blog and GET /blog/:slug
app.use('/', pageRoutes);
app.use('/', runnerRoutes);
app.use('/', stravaRoutes);
app.use('/', blogRoutes);
app.use('/', certificateVerificationRoutes);
app.use('/organizer', certificateTemplateRoutes);
app.use('/organizer', certificateRoutes);
app.use('/organizer', organizerRoutes);
app.use('/organizer', organizerShopRoutes);
app.use('/admin', adminRoutes);
app.use('/admin', adminShopRoutes);
app.use('/webhooks/timing-system', timingSystemWebhooks);

function populatePublicPageLocals(req, res, next) {
  const pathname = req.path || '/';
  res.locals.renderRunProofModal = shouldRenderRunProofModal(pathname);

  if (shouldNoindexPath(pathname)) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.locals.seo = {
      ...(res.locals.seo || {}),
      robots: 'noindex, nofollow'
    };
  }

  next();
}

function shouldRenderRunProofModal(pathname) {
  return (
    pathname === '/my-registrations' ||
    pathname.startsWith('/runner/')
  );
}

function shouldNoindexPath(pathname) {
  return [
    /^\/login\/?$/,
    /^\/register\/?$/,
    /^\/signup\/?$/,
    /^\/forgot-password\/?$/,
    /^\/reset-password(?:\/.*)?$/,
    /^\/resend-verification\/?$/,
    /^\/verify-email(?:\/.*)?$/,
    /^\/verify-email-(?:sent|success|result|expired|already-verified)\/?$/,
    /^\/auth(?:\/.*)?$/,
    /^\/admin(?:\/.*)?$/,
    /^\/organizer(?:\/.*)?$/,
    /^\/runner(?:\/.*)?$/,
    /^\/my-(?:registrations|submissions)(?:\/.*)?$/,
    /^\/profile(?:\/.*)?$/,
    /^\/account(?:\/.*)?$/,
    /^\/shop\/(?:cart|checkout)(?:\/.*)?$/,
    /^\/orders(?:\/.*)?$/,
    /^\/api(?:\/.*)?$/,
    /^\/webhooks(?:\/.*)?$/
  ].some((pattern) => pattern.test(pathname));
}

// Chrome DevTools occasionally probes this path; return empty success to avoid noisy 404 logs.
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(204).set('Cache-Control', 'no-store').end();
});

// ===== STEP 6: 404 HANDLER (LAST) =====
app.use((req, res) => {
  logger.info('404 Not Found:', `${req.method} ${req.url}`);
  res.status(404).render('error', {
    title: '404 - Page Not Found',
    status: 404,
    message: 'The page you requested could not be found.'
  });
});

// ===== STEP 7: ERROR HANDLER =====
// Sentry error capture (must be before the generic handler)
if (Sentry) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use((err, req, res, next) => {
  logger.error('Error:', err.message);
  res.status(500).render('error', {
    title: '500 - Server Error',
    status: 500,
    message: 'An unexpected error occurred. Please try again.'
  });
});

// ===== STEP 8: START SERVER =====
const PORT = process.env.PORT || 3000;

const { startSyncRetryWorker, startBlogSchedulerWorker } = require('./workers/pg-sync-worker');
const { startCommunicationRetryWorker } = require('./workers/communication-retry-worker');

async function startServer() {
  await connectToDatabase();
  startSyncRetryWorker();
  startBlogSchedulerWorker();
  startCommunicationRetryWorker();

  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
