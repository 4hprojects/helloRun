// src/services/registrant-import.service.js
// Bringing a list of participants in from a spreadsheet.
//
// Organisers arrive with registrations already collected elsewhere — a form, a previous
// system, a sheet passed around a running club. Until guest registration existed there was
// nowhere to put people with no HelloRun account, which is why this could not be built
// before.
//
// Shares its sheet reading with the results import and its writing with the guest flow, so
// an imported participant is the same kind of record as one who registered themselves.

const { readSheetRows } = require('../utils/spreadsheet-import');
const { createGuestRegistration, validateGuestForm } = require('./guest-registration.service');
const { findAnyExistingRegistration } = require('./walk-in-registration.service');
const { syncRegistrationPaymentShadow } = require('./registration-payment-shadow.service');
const logger = require('../utils/logger');

const MAX_IMPORT_ROWS = 1000;

// Registration lists come from every direction, so accept the obvious spellings.
const COLUMN_ALIASES = {
  first_name: ['first name', 'firstname', 'given name', 'first'],
  last_name: ['last name', 'lastname', 'surname', 'family name', 'last'],
  email: ['email', 'email address', 'e-mail'],
  mobile: ['mobile', 'phone', 'contact', 'contact number', 'mobile number', 'phone number'],
  race_distance: ['category', 'distance', 'race category', 'race distance'],
  participation_mode: ['mode', 'participation', 'participation mode'],
  emergency_contact_name: ['emergency contact', 'emergency contact name', 'emergency name'],
  emergency_contact_number: ['emergency number', 'emergency contact number', 'emergency phone'],
  kit_size: ['size', 'kit size', 'shirt size', 'shirt', 'singlet size', 'tshirt size', 't-shirt size']
};

/**
 * The participation mode to assume when a file does not say.
 *
 * Taken from the event rather than hardcoded, because it decides whether an emergency
 * contact is required — a virtual entrant needs none, an onsite one does.
 */
function defaultParticipationMode(event = {}) {
  const allowed = Array.isArray(event.eventTypesAllowed) ? event.eventTypesAllowed : [];
  if (allowed.length === 1) return allowed[0];
  return event.eventType === 'virtual' ? 'virtual' : 'onsite';
}

/**
 * The category to assume when a file does not name one.
 *
 * Only safe when the event offers exactly one — anything else would be picking a distance
 * on the participant's behalf.
 */
function defaultRaceDistance(event = {}) {
  const distances = Array.isArray(event.raceDistances) ? event.raceDistances.filter(Boolean) : [];
  return distances.length === 1 ? distances[0] : '';
}

/**
 * Turn a sheet row into the shape the guest validator expects.
 *
 * The waiver is the interesting one. A spreadsheet cannot capture consent, so an import
 * records that the organiser is asserting it on the participant's behalf, rather than
 * pretending the person signed something.
 */
function toGuestForm(row, defaults = {}) {
  return {
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    mobile: row.mobile || '',
    participationMode: row.participation_mode || defaults.participationMode || 'onsite',
    raceDistance: row.race_distance || defaults.raceDistance || '',
    emergencyContactName: row.emergency_contact_name || '',
    emergencyContactNumber: row.emergency_contact_number || '',
    waiverAccepted: true,
    waiverSignature: `Imported by organiser (${row.first_name || ''} ${row.last_name || ''})`.trim(),
    kitSize: row.kit_size || ''
  };
}

/**
 * Read and check a file without writing anything.
 */
async function previewRegistrantImport(buffer, filename, { eventId, event = null, defaults = {} } = {}) {
  const resolvedDefaults = {
    participationMode: defaults.participationMode || (event ? defaultParticipationMode(event) : 'onsite'),
    raceDistance: defaults.raceDistance || (event ? defaultRaceDistance(event) : '')
  };
  const parsed = await readSheetRows(buffer, filename, {
    aliases: COLUMN_ALIASES,
    // Mobile is required by the same validator the self-serve guest form uses, so
    // demand the column up front rather than failing every row individually for it.
    required: ['first_name', 'last_name', 'email', 'mobile'],
    missingMessage: 'The file needs first name, last name, email and contact number columns.',
    maxRows: MAX_IMPORT_ROWS
  });

  const ready = [];
  const rejected = [];
  const seenEmails = new Set();

  for (let index = 0; index < parsed.rows.length; index += 1) {
    const row = parsed.rows[index];
    const rowNumber = index + 2; // 1-based, and row 1 is the header
    // Use the form the validator hands back, not the one passed in: it trims and
    // lowercases the email, and the duplicate check below depends on that. Keeping the
    // raw one let "ANA@Example.com" and "ana@example.com" through as two people.
    const { form, errors } = validateGuestForm(toGuestForm(row, resolvedDefaults), event);

    if (Object.keys(errors).length > 0) {
      rejected.push({ row: rowNumber, email: form.email, error: Object.values(errors)[0] });
      continue;
    }

    // Registration requires a category. Catch it here rather than letting the write fail
    // after the organiser has already confirmed the import.
    if (!form.raceDistance) {
      rejected.push({
        row: rowNumber,
        email: form.email,
        error: 'No category given, and this event offers more than one. Add a category column.'
      });
      continue;
    }

    // A list often contains the same person twice. Catching it here means the import
    // does not half-succeed and leave the organiser reconciling by hand.
    if (seenEmails.has(form.email)) {
      rejected.push({ row: rowNumber, email: form.email, error: 'Appears more than once in this file.' });
      continue;
    }
    seenEmails.add(form.email);

    const existing = eventId ? await findAnyExistingRegistration(eventId, form.email) : null;
    if (existing) {
      rejected.push({
        row: rowNumber,
        email: form.email,
        error: `Already registered (${existing.confirmationCode}).`
      });
      continue;
    }

    ready.push({ row: rowNumber, form });
  }

  return {
    participationMode: resolvedDefaults.participationMode,
    totalRows: parsed.rows.length,
    readyCount: ready.length,
    rejectedCount: rejected.length,
    ready,
    rejected,
    unmappedHeaders: parsed.unmappedHeaders,
    truncated: parsed.truncated,
    maxRows: MAX_IMPORT_ROWS
  };
}

/**
 * Create the registrations an organiser confirmed.
 *
 * Each row is attempted on its own, so one bad address cannot discard a whole club's
 * worth of entries, and capacity is still taken atomically per row by the guest flow.
 */
async function applyRegistrantRows({ event, rows, organiser, sendEmails = false }) {
  const imported = [];
  const failed = [];

  for (const entry of (rows || []).slice(0, MAX_IMPORT_ROWS)) {
    const form = entry.form || entry;
    try {
      const { registration } = await createGuestRegistration({
        event,
        form,
        // A bulk import would otherwise mail everyone at once, and the daily email
        // budget is shared with password resets and payment notices.
        skipConfirmationEmail: !sendEmails
      });

      registration.registrationSource = 'organiser_import';
      registration.createdByUserId = organiser?._id || organiser?.mongoUserId || null;
      await registration.save();

      // Best effort, and not awaited per row the way a walk-in is: nobody is standing at
      // a bib table during an import, and the retry worker will catch any that miss.
      syncRegistrationPaymentShadow(registration, { operation: 'live_sync' }).catch((error) => {
        logger.error(`[RegistrantImport] Shadow sync failed for ${registration._id}: ${error.message}`);
      });

      imported.push({ email: form.email, confirmationCode: registration.confirmationCode });
    } catch (error) {
      failed.push({ email: form.email, error: error.message });
    }
  }

  return { imported, failed };
}

module.exports = {
  previewRegistrantImport,
  applyRegistrantRows,
  toGuestForm,
  defaultParticipationMode,
  defaultRaceDistance,
  COLUMN_ALIASES,
  MAX_IMPORT_ROWS
};
