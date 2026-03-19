require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const { attachCsrfToken } = require('./middleware/csrf.middleware');

// Fail fast if critical env vars are missing
if (!process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

// ===== STEP 1: MIDDLEWARE (MUST BE FIRST) =====
console.log('Loading middleware...');

app.disable('x-powered-by');
if (isProduction) {
  app.set('trust proxy', 1);
}

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.google-analytics.com blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://cdn.jsdelivr.net",
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

// Optional dev request-body debug logging
if (!isProduction && process.env.DEBUG_HTTP_BODIES === '1') {
  app.use((req, res, next) => {
    if (req.method === 'POST') {
      console.log('Received POST:', req.url);
      const safeBody = { ...req.body };
      delete safeBody.password;
      delete safeBody.confirmPassword;
      delete safeBody.currentPassword;
      delete safeBody.newPassword;
      console.log('Body:', safeBody);
    }
    next();
  });
}

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ===== STEP 2: VIEW ENGINE =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== STEP 3: DATABASE CONNECTION =====
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

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
console.log('Loading routes...');
const { populateAuthLocals } = require('./middleware/auth.middleware');
const authRoutes = require('./routes/authRoutes');
const pageRoutes = require('./routes/pageRoutes');
const runnerRoutes = require('./routes/runner.routes');
const blogRoutes = require('./routes/blog.routes');
const organizerRoutes = require('./routes/organizer.routes');
const adminRoutes = require('./routes/admin.routes');

// Auth locals for all views (BEFORE routes)
app.use(populateAuthLocals);

app.use('/', authRoutes);
app.use('/', pageRoutes);
app.use('/', runnerRoutes);
app.use('/', blogRoutes);
app.use('/organizer', organizerRoutes);
app.use('/admin', adminRoutes);

// Chrome DevTools occasionally probes this path; return empty success to avoid noisy 404 logs.
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(204).set('Cache-Control', 'no-store').end();
});

// ===== STEP 6: 404 HANDLER (LAST) =====
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.url);
  res.status(404).send('<h1>404 - Page Not Found</h1>');
});

// ===== STEP 7: ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).send('<h1>500 - Server Error</h1>');
});

// ===== STEP 8: START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
