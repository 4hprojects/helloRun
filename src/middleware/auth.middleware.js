// Add this NEW middleware at the top
exports.setUserContext = async (req, res, next) => {
  if (req.session.userId) {
    try {
      const User = require('../models/User');
      const user = await User.findById(req.session.userId).select('-password');
      
      if (user) {
        res.locals.user = user;
        res.locals.isAuthenticated = true;
        res.locals.isOrganizer = user.role === 'organiser';
        res.locals.isAdmin = user.role === 'admin';
        res.locals.isApprovedOrganizer = user.organizerStatus === 'approved';
      } else {
        // User not found, clear session
        res.locals.user = null;
        res.locals.isAuthenticated = false;
        req.session.destroy();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      res.locals.user = null;
      res.locals.isAuthenticated = false;
    }
  } else {
    res.locals.user = null;
    res.locals.isAuthenticated = false;
    res.locals.isOrganizer = false;
    res.locals.isAdmin = false;
    res.locals.isApprovedOrganizer = false;
  }
  next();
};

// Existing middleware
exports.requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

exports.requireAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  
  const User = require('../models/User');
  const user = await User.findById(req.session.userId);
  
  if (!user || user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }
  
  next();
};

exports.requireOrganizer = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  
  const User = require('../models/User');
  const user = await User.findById(req.session.userId);
  
  if (!user || user.role !== 'organiser') {
    return res.status(403).send('Access denied');
  }
  
  next();
};

exports.requireApprovedOrganizer = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  
  const User = require('../models/User');
  const user = await User.findById(req.session.userId);
  
  if (!user || !user.isApprovedOrganizer()) {
    return res.status(403).send('Access denied - Organizer approval required');
  }
  
  next();
};