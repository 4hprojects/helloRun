// src/services/guest-registration.service.js
// Registering someone who has no HelloRun account.
//
// Kept apart from the account flow rather than folded into it. That flow starts from a
// signed-in user and reads their profile, workspace and prior registrations; a guest has
// none of those, and threading "maybe there is no user" through it would put a null check
// in front of every one of those reads. The two share what actually is shared — pricing,
// capacity, the waiver — and diverge where they genuinely differ.

const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const { resolveRegistrationPrice } = require('./registration-price.service');
const { reserveCategorySlot, releaseCategorySlot } = require('./category-capacity.service');
const { issueToken } = require('./guest-registration-token.service');
const { renderWaiverTemplate } = require('../utils/waiver');
const communicationService = require('./communication.service');
const logger = require('../utils/logger');

const MAX_FIELD = 200;

function clean(value, max = MAX_FIELD) {
  return String(value || '').trim().slice(0, max);
}

function normaliseEmail(value) {
  return clean(value).toLowerCase();
}

/**
 * Validate what a guest must supply.
 *
 * An account registration can fall back to the profile for anything missing. A guest has
 * no profile, so everything needed to identify them on race day has to come from the form.
 */
function validateGuestForm(body = {}) {
  const errors = {};
  const form = {
    firstName: clean(body.firstName, 80),
    lastName: clean(body.lastName, 80),
    email: normaliseEmail(body.email),
    mobile: clean(body.mobile, 40),
    participationMode: clean(body.participationMode, 20),
    raceDistance: clean(body.raceDistance, 30),
    emergencyContactName: clean(body.emergencyContactName, 120),
    emergencyContactNumber: clean(body.emergencyContactNumber, 40),
    waiverAccepted: body.waiverAccepted === 'on' || body.waiverAccepted === true,
    waiverSignature: clean(body.waiverSignature, 120)
  };

  if (!form.firstName) errors.firstName = 'Enter your first name.';
  if (!form.lastName) errors.lastName = 'Enter your last name.';
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address. Your confirmation goes here.';
  }
  if (!form.mobile) errors.mobile = 'Enter a contact number.';
  if (!form.waiverAccepted) errors.waiverAccepted = 'You must accept the waiver to register.';
  if (!form.waiverSignature) errors.waiverSignature = 'Type your name to sign the waiver.';

  // Onsite means someone has to be reachable if this person gets hurt.
  if (form.participationMode === 'onsite') {
    if (!form.emergencyContactName) errors.emergencyContactName = 'Enter an emergency contact name.';
    if (!form.emergencyContactNumber) errors.emergencyContactNumber = 'Enter an emergency contact number.';
  }

  return { form, errors };
}

/**
 * Reasons an event will not take a guest registration right now.
 */
function getGuestRegistrationBlock(event) {
  if (!event) return 'Event not found.';
  if (!event.allowGuestRegistration) {
    return 'This event requires a HelloRun account to register.';
  }
  if (event.status !== 'published') return 'This event is not open for registration.';
  const now = Date.now();
  if (event.registrationOpenAt && new Date(event.registrationOpenAt).getTime() > now) {
    return 'Registration has not opened yet.';
  }
  if (event.registrationCloseAt && new Date(event.registrationCloseAt).getTime() < now) {
    return 'Registration for this event has closed.';
  }
  return null;
}

/**
 * Refuse a second guest entry for the same person on the same event.
 *
 * Accounts get this from a unique index; guests cannot, because the partial index is
 * keyed on a user that is absent. Email is the only stable handle a guest has, so it is
 * checked explicitly — a check, not a guarantee, since two requests could still race.
 * Duplicate guest entries are recoverable by an organiser; blocking the common case is
 * what matters.
 */
async function findExistingGuestRegistration(eventId, email) {
  if (!email) return null;
  return Registration.findOne({
    eventId,
    participantType: 'guest',
    'participant.email': email
  })
    .select('_id confirmationCode')
    .lean();
}

/**
 * Does this email already belong to an account?
 *
 * Not a refusal — plenty of people forget they have an account — but it changes what we
 * tell them afterwards, so they are pointed at signing in rather than left with a guest
 * entry they will have to claim later.
 */
async function emailBelongsToAccount(email) {
  if (!email) return false;
  const user = await User.findOne({ email }).select('_id').lean();
  return Boolean(user);
}

function generateConfirmationCode() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `HR-${code}`;
}

/**
 * Create a guest registration and mint its management link.
 *
 * @returns {Promise<{registration: Object, manageToken: string, hasAccount: boolean}>}
 */
async function createGuestRegistration({ event, form, requestMeta = {} }) {
  const existing = await findExistingGuestRegistration(event._id, form.email);
  if (existing) {
    const error = new Error('That email is already registered for this event.');
    error.code = 'DUPLICATE_GUEST';
    error.confirmationCode = existing.confirmationCode;
    throw error;
  }

  const resolvedPrice = resolveRegistrationPrice(event, {
    raceDistance: form.raceDistance,
    participationMode: form.participationMode
  });
  if (resolvedPrice?.error) {
    const error = new Error(resolvedPrice.error);
    error.code = 'PRICING';
    throw error;
  }

  // Take the slot before writing, and give it back if anything after this fails.
  let reservedCategoryId = '';
  if (resolvedPrice?.raceCategoryId) {
    const reservation = await reserveCategorySlot(event._id, resolvedPrice.raceCategoryId);
    if (reservation.limited && !reservation.reserved) {
      const error = new Error('That category is now full. Please choose another.');
      error.code = 'CAPACITY';
      throw error;
    }
    if (reservation.reserved) reservedCategoryId = String(resolvedPrice.raceCategoryId);
  }

  try {
    const renderedWaiver = renderWaiverTemplate(event.waiverTemplate, {
      organizerName: event.organiserName,
      eventTitle: event.title
    });

    const registration = new Registration({
      eventId: event._id,
      userId: null,
      participantType: 'guest',
      participant: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        mobile: form.mobile,
        emergencyContactName: form.emergencyContactName,
        emergencyContactNumber: form.emergencyContactNumber
      },
      participationMode: form.participationMode,
      raceDistance: form.raceDistance || resolvedPrice?.raceDistance || '',
      status: 'confirmed',
      paymentStatus: String(event.feeMode || '').toLowerCase() === 'paid' ? 'unpaid' : 'paid',
      paymentAmountDue: resolvedPrice?.amount ?? 0,
      paymentCurrency: resolvedPrice?.currency || 'PHP',
      pricingSnapshot: {
        pricingMode: resolvedPrice?.pricingMode || '',
        raceCategoryId: resolvedPrice?.raceCategoryId || '',
        raceCategoryName: resolvedPrice?.raceCategoryName || '',
        raceDistance: resolvedPrice?.raceDistance || form.raceDistance || '',
        amount: resolvedPrice?.amount ?? 0,
        currency: resolvedPrice?.currency || 'PHP'
      },
      waiver: {
        accepted: true,
        version: Number(event.waiverVersion || 1),
        signature: form.waiverSignature,
        acceptedAt: new Date(),
        templateSnapshot: String(event.waiverTemplate || ''),
        renderedSnapshot: renderedWaiver
      },
      confirmationCode: generateConfirmationCode(),
      registeredAt: new Date()
    });

    await registration.save();

    const { token } = await issueToken(registration._id, event._id, 'manage');
    const hasAccount = await emailBelongsToAccount(form.email);

    notifyGuestInBackground({ registration, event, manageToken: token, requestMeta });

    return { registration, manageToken: token, hasAccount };
  } catch (error) {
    if (reservedCategoryId) {
      await releaseCategorySlot(event._id, reservedCategoryId);
    }
    throw error;
  }
}

function notifyGuestInBackground({ registration, event, manageToken }) {
  (async () => {
    try {
      const baseUrl = String(process.env.APP_URL || '').replace(/\/$/, '');
      await communicationService.notify('registration.guest_confirmed', {
        email: {
          to: registration.participant.email,
          firstName: registration.participant.firstName,
          eventTitle: event.title || 'your event',
          confirmationCode: registration.confirmationCode,
          // The only time this link is ever sent. It is not recoverable from the
          // database, so if the email is lost the guest needs a fresh one.
          manageUrl: `${baseUrl}/guest/registrations/${manageToken}`,
          metadata: {
            registrationId: String(registration._id),
            eventId: String(event._id)
          }
        }
      });
    } catch (error) {
      // The registration is already saved; a failed email must not undo it.
      logger.error(`[GuestRegistration] Confirmation email failed: ${error.message}`);
    }
  })();
}

module.exports = {
  validateGuestForm,
  getGuestRegistrationBlock,
  createGuestRegistration,
  findExistingGuestRegistration,
  emailBelongsToAccount,
  generateConfirmationCode
};
