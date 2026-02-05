require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const session = require('express-session');
const path = require('path');
const connectDB = require('./config/db');
const sessionConfig = require('./config/session');
const { setUserContext } = require('./middleware/auth.middleware');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session(sessionConfig));
app.use(express.static(path.join(__dirname, 'public')));

// Set user context for all routes
app.use(setUserContext);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', require('./routes/page.routes'));
app.use('/', require('./routes/authRoutes')); // Remove /auth prefix
app.use('/organizer', require('./routes/organizer.routes'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`GA Measurement ID: ${process.env.GA_MEASUREMENT_ID}`); // Add this line to verify
});