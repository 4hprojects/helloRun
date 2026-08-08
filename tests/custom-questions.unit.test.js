'use strict';

// Organiser-defined questions on the registration form.
//
// The scope is the interesting decision here, and the failure that matters is an export
// where a column no longer means what it says.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  parseQuestions,
  parseQuestionsFromBody,
  validateAnswers,
  answersForExport,
  exportHeaders,
  hasQuestions,
  slugifyQuestionId,
  QUESTION_TYPES,
  MAX_QUESTIONS,
  MAX_ANSWER_LENGTH
} = require('../src/services/custom-questions.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const service = read('src/services/custom-questions.service.js');

const EVENT = {
  customQuestions: [
    { questionId: 'meal', label: 'Meal option', type: 'dropdown', required: true, options: ['Chicken', 'Vegetarian'] },
    { questionId: 'club', label: 'Running club', type: 'short_text', required: false, options: [] },
    { questionId: 'photos', label: 'I agree to be photographed', type: 'checkbox_agreement', required: false, options: [] }
  ]
};

// --- What this deliberately is not ------------------------------------------------------------

test('the scope is a stated subset of the spec, not an accident', () => {
  // The spec asks for fourteen field types, conditional routing and file upload, on the
  // basis of reusing a builder that does not exist here — and defers itself until there is
  // evidence fixed fields are insufficient.
  assert.match(service, /deliberate subset of `05-form-builder\.md`/);
  assert.match(service, /Left out on purpose/);
  assert.match(service, /file upload: needs R2 plumbing/);
  assert.match(service, /conditional routing: the complexity multiplier/);
  // Four types, covering the spec's own examples: meal, transport, wave, running club.
  assert.deepEqual(QUESTION_TYPES, ['short_text', 'dropdown', 'single_choice', 'checkbox_agreement']);
});

// --- Defining questions -------------------------------------------------------------------------

test('an incoherent question is dropped rather than failing the whole event save', () => {
  // This sits on a long event form; losing every other edit to one bad row is the wrong trade.
  const parsed = parseQuestionsFromBody({
    customQuestionLabel0: 'Meal option',
    customQuestionType0: 'dropdown',
    customQuestionOptions0: 'Chicken\nVegetarian',
    customQuestionRequired0: '1',
    customQuestionLabel1: '', // blank label — removed
    customQuestionLabel2: 'Nothing to pick',
    customQuestionType2: 'dropdown',
    customQuestionOptions2: '' // a list question with no options is not a question
  });

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].label, 'Meal option');
  assert.deepEqual(parsed[0].options, ['Chicken', 'Vegetarian']);
  assert.equal(parsed[0].required, true);
});

test('renaming a question keeps its id, so answers already given stay attached', () => {
  const original = parseQuestions([{ label: 'Meal option', type: 'dropdown', options: 'Chicken,Vegetarian' }]);
  assert.equal(original[0].questionId, 'meal_option');

  const renamed = parseQuestions(
    [{ questionId: original[0].questionId, label: 'Meal choice', type: 'dropdown', options: ['Chicken', 'Vegetarian'] }],
    original
  );
  assert.equal(renamed[0].questionId, 'meal_option', 'a rename must not orphan every answer');
  assert.equal(renamed[0].label, 'Meal choice');
});

test('parsing is stable over its own output, because the save path runs it twice', () => {
  // Options arrive as text from the form and as an array once parsed.
  const first = parseQuestionsFromBody({
    customQuestionLabel0: 'Wave',
    customQuestionType0: 'single_choice',
    customQuestionOptions0: 'A\nB'
  });
  assert.deepEqual(parseQuestions(first, first), first);
});

test('ids are unique, bounded and never empty', () => {
  const parsed = parseQuestions([
    { label: 'Meal', type: 'short_text' },
    { label: 'Meal', type: 'short_text' },
    { label: '!!!', type: 'short_text' }
  ]);
  const ids = parsed.map((question) => question.questionId);
  assert.equal(new Set(ids).size, ids.length, 'a duplicate id would collide two answers');
  assert.ok(ids.every(Boolean));

  const tooMany = parseQuestions(
    Array.from({ length: MAX_QUESTIONS + 5 }, (_, index) => ({ label: `Q${index}`, type: 'short_text' }))
  );
  assert.equal(tooMany.length, MAX_QUESTIONS);
});

test('slugs are derived from the label and never blank', () => {
  assert.equal(slugifyQuestionId('Meal option', 0), 'meal_option');
  assert.equal(slugifyQuestionId('  T-shirt / size!  ', 0), 't_shirt_size');
  assert.equal(slugifyQuestionId('', 3), 'question_4');
});

// --- Answering them -------------------------------------------------------------------------------

test('a required question is enforced, and an optional one left blank is simply absent', () => {
  const missing = validateAnswers(EVENT, {});
  assert.equal(missing.errors.custom_meal, 'Meal option is required.');
  assert.equal(missing.errors.custom_club, undefined);

  const given = validateAnswers(EVENT, { custom_meal: 'Chicken', custom_club: 'Harriers' });
  assert.deepEqual(given.errors, {});
  assert.equal(given.answers.length, 3, 'the agreement is always recorded, as Yes or No');
  assert.equal(given.answers.find((a) => a.questionId === 'meal').value, 'Chicken');
  assert.equal(given.answers.find((a) => a.questionId === 'photos').value, 'No');
});

test('an answer outside the offered options is refused', () => {
  // A stale page, or a hand-crafted post: either way the form and the event have come apart.
  const bad = validateAnswers(EVENT, { custom_meal: 'Steak' });
  assert.match(bad.errors.custom_meal, /Choose one of the options/);
  assert.equal(bad.answers.find((a) => a.questionId === 'meal'), undefined);
});

test('the answer carries its label, so a later rename cannot relabel it', () => {
  // Worse than useless on an export being used to order 400 meals.
  const { answers } = validateAnswers(EVENT, { custom_meal: 'Chicken' });
  assert.equal(answers[0].label, 'Meal option');
  assert.match(service, /Snapshotted, so a later rename cannot relabel an answer/);
});

test('a long answer is truncated rather than rejected', () => {
  const { answers } = validateAnswers(EVENT, { custom_club: 'x'.repeat(1000) });
  assert.equal(answers.find((a) => a.questionId === 'club').value.length, MAX_ANSWER_LENGTH);
});

test('a bulk import is not failed for answers the organiser cannot know', () => {
  // A required question is a question for the participant. Demanding it of somebody pasting
  // a spreadsheet would reject every row.
  const strict = validateAnswers(EVENT, {});
  assert.ok(strict.errors.custom_meal);

  const imported = validateAnswers(EVENT, {}, { requireAnswers: false });
  assert.deepEqual(imported.errors, {});

  assert.match(read('src/services/registrant-import.service.js'), /requireCustomAnswers: false/);
});

test('an event with no questions behaves exactly as before', () => {
  assert.equal(hasQuestions({}), false);
  assert.deepEqual(validateAnswers({}, { custom_anything: 'x' }), { answers: [], errors: {} });
  assert.deepEqual(exportHeaders({}), []);
});

// --- Getting the answers back out --------------------------------------------------------------------

test('an export column means the same thing for every row', () => {
  // Matched by id and read back through the event's current labels, so a question renamed
  // halfway through does not produce two columns that disagree.
  const headers = exportHeaders(EVENT);
  assert.deepEqual(headers, ['Meal option', 'Running club', 'I agree to be photographed']);

  const answered = { customAnswers: [{ questionId: 'club', label: 'Old name', value: 'Harriers' }] };
  assert.deepEqual(answersForExport(EVENT, answered), ['', 'Harriers', '']);

  // A registration from before the questions existed produces empty cells, not a short row.
  assert.equal(answersForExport(EVENT, {}).length, headers.length);
});

test('the answers and the kit size actually reach the export', () => {
  // Ordering shirts and counting meals are the two things an export is for.
  const shared = read('src/routes/organiser/_shared.js');
  assert.match(shared, /const customHeaders = exportHeaders\(event\)/);
  assert.match(shared, /\.\.\.answersForExport\(event, registration\)/);
  assert.match(shared, /'Kit Size',/);
  // Both export routes must pass the event, or every custom column would silently vanish.
  const routes = read('src/routes/organiser/registrants.js');
  assert.equal((routes.match(/getRegistrantExportData\(registrations, event\)/g) || []).length, 2);
});

// --- Where they are asked ---------------------------------------------------------------------------------

test('every registration path asks the questions and stores the answers', () => {
  assert.match(read('src/services/guest-registration.service.js'), /customAnswers: form\.customAnswers \|\| \[\]/);
  assert.match(read('src/controllers/page/registration.controller.js'), /customAnswers: customAnswers\.answers/);
  // Validated inside validateGuestForm so the guest form, the walk-in desk, the waitlist
  // claim and the importer cannot drift apart.
  assert.match(read('src/services/guest-registration.service.js'), /cannot drift apart/);
  // The walk-in route has to actually load the questions to be able to check them.
  assert.match(read('src/routes/organiser/onsite-operations.js'), /kitSizeRequired customQuestions'\)/);

  for (const view of [
    'src/views/pages/event-register.ejs',
    'src/views/pages/guest-register.ejs',
    'src/views/pages/waitlist-offer.ejs',
    'src/views/pages/transfer-accept.ejs'
  ]) {
    assert.match(read(view), /custom_<%= question\.questionId %>/, view);
  }
});

test('answers are escaped, being organiser and participant text on a public page', () => {
  for (const view of ['src/views/pages/guest-register.ejs', 'src/views/pages/event-register.ejs']) {
    const source = read(view);
    assert.match(source, /<%= question\.label %>/, view);
    assert.doesNotMatch(source, /<%-\s*question\./, `${view} must never raw-render a question`);
  }
});

test('the editor is on both event forms and survives a save', () => {
  const form = read('src/services/event-form.service.js');
  assert.match(form, /customQuestions: parseQuestionsFromBody\(body\)/);
  // Re-parsed from formData, not from a body that is not in scope there — that mistake
  // would have silently wiped every question on save.
  assert.match(form, /parseQuestions\(formData\.customQuestions, event\.customQuestions\)/);
  assert.match(form, /which is not in scope here/);
  for (const view of ['src/views/organizer/edit-event.ejs', 'src/views/organizer/create-event.ejs']) {
    assert.match(read(view), /customQuestionLabel<%= qi %>/, view);
    assert.match(read(view), /customQuestionType<%= qi %>/, view);
  }
});
