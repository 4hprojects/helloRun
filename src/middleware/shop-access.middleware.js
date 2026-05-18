const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');

async function requireRunner(req, res, next) {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'runner') {
      return renderAccessDenied(res, 'Runner access is required.');
    }
    req.shopActor = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function requireOrganizer(req, res, next) {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'organiser') {
      return renderAccessDenied(res, 'Organizer access is required.');
    }
    req.shopActor = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function canManageEventShop(req, res, next) {
  try {
    const user = req.shopActor || await getSessionUser(req);
    if (!user) return renderAccessDenied(res, 'Authentication required.');
    if (user.role === 'admin') return next();
    if (user.role !== 'organiser') return renderAccessDenied(res, 'Organizer access is required.');

    const eventId = String(req.params.eventId || req.body.eventId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return renderBadRequest(res, 'Invalid event reference.');
    }

    const event = await Event.findById(eventId).select('organizerId').lean();
    if (!event || String(event.organizerId || '') !== String(user._id)) {
      return renderAccessDenied(res, 'You can only manage shop data for your own events.');
    }

    req.shopEvent = event;
    return next();
  } catch (error) {
    return next(error);
  }
}

function canReviewShopPayment(_req, _res, next) {
  return next();
}

function canUpdateFulfilment(_req, _res, next) {
  return next();
}

function canViewShopOrder(_req, _res, next) {
  return next();
}

function canManageShopProduct(_req, _res, next) {
  return next();
}

async function getSessionUser(req) {
  if (!req.session || !req.session.userId) return null;
  return User.findById(req.session.userId).select('role organizerStatus').lean();
}

function renderAccessDenied(res, message) {
  return res.status(403).render('error', {
    title: '403 - Access Denied',
    status: 403,
    message
  });
}

function renderBadRequest(res, message) {
  return res.status(400).render('error', {
    title: '400 - Bad Request',
    status: 400,
    message
  });
}

module.exports = {
  requireRunner,
  requireOrganizer,
  canManageEventShop,
  canReviewShopPayment,
  canUpdateFulfilment,
  canViewShopOrder,
  canManageShopProduct
};
