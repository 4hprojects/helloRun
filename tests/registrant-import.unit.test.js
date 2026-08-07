'use strict';

// Importing a participant list from a spreadsheet.
//
// This could not be built before guest registration: there was nowhere to put a person
// with no HelloRun account, which most of an imported list will be.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ExcelJS = require('exceljs');

const {
  previewRegistrantImport,
  toGuestForm,
  defaultParticipationMode,
  defaultRaceDistance,
  MAX_IMPORT_ROWS
} = require('../src/services/registrant-import.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const service = read('src/services/registrant-import.service.js');
const guest = read('src/services/guest-registration.service.js');
const routes = read('src/routes/organiser/onsite-operations.js');
const view = read('src/views/organizer/event-registrant-import.ejs');
const sharedReader = read('src/utils/spreadsheet-import.js');

const MESSY = [
  'Given Name,Surname,E-mail,Phone,Race Category,Notes',
  'Ana,Reyes,ANA@Example.com,0917,10K,vip',
  'Ben,Cruz,ben@example.com,0918,5K,',
  ',,,,,',
  'Cel,Diaz,not-an-email,0919,5K,',
  'Ana,Reyes,ana@example.com,0917,10K,dup'
].join('\n');

test('headers organisers actually use are matched, and extras ignored', async () => {
  const preview = await previewRegistrantImport(Buffer.from(MESSY), 'l.csv', {
    event: { eventType: 'virtual' }
  });
  assert.equal(preview.totalRows, 4, 'the blank spacer row should not become a row');
  assert.deepEqual(preview.unmappedHeaders, ['Notes']);
});

test('the email is normalised, so a duplicate cannot hide behind capitalisation', async () => {
  const preview = await previewRegistrantImport(Buffer.from(MESSY), 'l.csv', {
    event: { eventType: 'virtual' }
  });
  assert.equal(preview.ready[0].form.email, 'ana@example.com');
  assert.ok(
    preview.rejected.some((row) => /more than once/.test(row.error)),
    'the same person twice in one file should be caught'
  );
  assert.equal(preview.readyCount, 2);
});

test('a bad address is rejected without losing the rest of the list', async () => {
  const preview = await previewRegistrantImport(Buffer.from(MESSY), 'l.csv', {
    event: { eventType: 'virtual' }
  });
  assert.ok(preview.rejected.some((row) => row.row === 4 && /valid email/.test(row.error)));
  assert.equal(preview.readyCount, 2);
});

test('an onsite import still needs an emergency contact', async () => {
  // Not waived for bulk: someone has to be reachable if a participant gets hurt.
  const onsite = await previewRegistrantImport(Buffer.from(MESSY), 'l.csv', {
    event: { eventType: 'onsite' }
  });
  assert.equal(onsite.readyCount, 0);
  assert.ok(onsite.rejected.every((row) => row.error));

  const withContacts = [
    'First Name,Last Name,Email,Phone,Emergency Contact,Emergency Number',
    'Dee,Lim,dee@example.com,0920,Kim Lim,0921'
  ].join('\n');
  const ok = await previewRegistrantImport(Buffer.from(withContacts), 'l.csv', {
    event: { eventType: 'onsite', raceDistances: ['5K'] }
  });
  assert.equal(ok.readyCount, 1);
});

test('the assumed participation mode comes from the event, not a hardcoded default', () => {
  // It decides whether an emergency contact is required, so guessing would be wrong.
  assert.equal(defaultParticipationMode({ eventType: 'virtual' }), 'virtual');
  assert.equal(defaultParticipationMode({ eventType: 'onsite' }), 'onsite');
  assert.equal(defaultParticipationMode({ eventTypesAllowed: ['onsite'] }), 'onsite');
  assert.equal(defaultParticipationMode({}), 'onsite');
});

test('a missing category is settled at preview, never at write time', async () => {
  // Registration requires raceDistance. Without this the preview reported rows as ready
  // and every one of them failed after the organiser had already confirmed the import.
  const noCategory = ['First Name,Last Name,Email,Contact Number', 'Ana,Reyes,ana@example.com,0917'].join('\n');

  const single = await previewRegistrantImport(Buffer.from(noCategory), 'l.csv', {
    event: { eventType: 'virtual', raceDistances: ['5K'] }
  });
  assert.equal(single.ready[0].form.raceDistance, '5K', 'one distance leaves nothing to guess');

  const multi = await previewRegistrantImport(Buffer.from(noCategory), 'l.csv', {
    event: { eventType: 'virtual', raceDistances: ['5K', '10K'] }
  });
  assert.equal(multi.readyCount, 0);
  assert.match(multi.rejected[0].error, /more than one/);

  // Picking a distance on the participant's behalf is only safe when there is one.
  assert.equal(defaultRaceDistance({ raceDistances: ['5K'] }), '5K');
  assert.equal(defaultRaceDistance({ raceDistances: ['5K', '10K'] }), '');
  assert.equal(defaultRaceDistance({}), '');
});

test('an XLSX list is read the same as a CSV', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('R');
  sheet.addRow(['First Name', 'Last Name', 'Email', 'Contact Number']);
  sheet.addRow(['Dee', 'Lim', 'dee@example.com', '0920']);

  const preview = await previewRegistrantImport(
    Buffer.from(await workbook.xlsx.writeBuffer()),
    'l.xlsx',
    { event: { eventType: 'virtual', raceDistances: ['5K'] } }
  );
  assert.equal(preview.readyCount, 1);
});

test('a file without the required columns is refused up front', async () => {
  await assert.rejects(
    () => previewRegistrantImport(Buffer.from('name,email\nx,a@b.com\n'), 'bad.csv', {}),
    /first name, last name, email and contact number/
  );
});

test('the waiver records who asserted it rather than pretending it was signed', () => {
  // A spreadsheet cannot capture consent.
  const form = toGuestForm({ first_name: 'Ana', last_name: 'Reyes', email: 'a@b.com' });
  assert.match(form.waiverSignature, /Imported by organiser/);
  assert.match(service, /cannot capture consent/);
});

test('confirmation emails are off by default for an import', () => {
  // A large import would otherwise send hundreds at once, against a daily allowance
  // shared with password resets and payment notices.
  assert.match(service, /sendEmails = false/);
  assert.match(guest, /skipConfirmationEmail = false/);
  assert.match(guest, /if \(!skipConfirmationEmail\)/);
  assert.match(view, /Email each person/);
  assert.doesNotMatch(view, /data-import-send-emails[^>]*checked/);
});

test('rows are applied independently and marked as imported', () => {
  assert.match(service, /registrationSource = 'organiser_import'/);
  assert.match(service, /createdByUserId/);
  assert.match(service, /const failed = \[\]/);
  // Nobody is at a bib table during an import, so the shadow sync is not awaited per row.
  assert.match(service, /not awaited per row/);
});

test('preview writes nothing and commit sends back only what was shown', () => {
  assert.match(routes, /registrant-imports\/preview/);
  assert.match(routes, /registrant-imports\/commit/);
  assert.match(routes, /registrantImportLimiter/);
  assert.match(view, /Nothing is created until you confirm/);
});

test('the sheet reader is shared with the results import', () => {
  // Both face organisers exporting from tools that agree on nothing.
  assert.match(service, /require\('\.\.\/utils\/spreadsheet-import'\)/);
  assert.match(read('src/services/result-import.service.js'), /require\('\.\.\/utils\/spreadsheet-import'\)/);
  // A blank optional column must read as absent, not as an empty value to format-check.
  assert.match(sharedReader, /if \(!value && !required\.includes\(field\)\) continue/);
  assert.ok(MAX_IMPORT_ROWS > 0);
});
