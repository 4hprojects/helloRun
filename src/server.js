require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

// ===== STEP 1: MIDDLEWARE (MUST BE FIRST) =====
console.log('📦 Loading middleware...');

// ✅ CRITICAL: Body parser BEFORE everything
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Debug middleware - log what's being received
app.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log('📨 Received POST:', req.url);
    // Log body without sensitive fields
    const safeBody = { ...req.body };
    delete safeBody.password;
    delete safeBody.confirmPassword;
    delete safeBody.currentPassword;
    delete safeBody.newPassword;
    console.log('📦 Body:', safeBody);
  }
  next();
});

// ✅ Static files
app.use(express.static(path.join(__dirname, 'public')));

// ===== STEP 2: VIEW ENGINE =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== STEP 3: DATABASE CONNECTION =====
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ===== STEP 4: SESSION =====
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  store: new MongoStore({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // Lazy session update
  })
}));

// ===== ROUTES =====
console.log('🔀 Loading routes...');
const { populateAuthLocals } = require('./middleware/auth.middleware');
const authRoutes = require('./routes/authRoutes');
const pageRoutes = require('./routes/pageRoutes');
const organizerRoutes = require('./routes/organizer.routes');
const adminRoutes = require('./routes/admin.routes');

// Auth locals for all views (BEFORE routes)
app.use(populateAuthLocals);

app.use('/', authRoutes);
app.use('/', pageRoutes);
app.use('/organizer', organizerRoutes);
app.use('/admin', adminRoutes);

// ===== STEP 6: 404 HANDLER (LAST) =====
app.use((req, res) => {
  console.log('⚠️  404 Not Found:', req.method, req.url);
  res.status(404).send('<h1>404 - Page Not Found</h1>');
});

// ===== STEP 7: ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).send('<h1>500 - Server Error</h1>');
});

// ===== STEP 8: START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});