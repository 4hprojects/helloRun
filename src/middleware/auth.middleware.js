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