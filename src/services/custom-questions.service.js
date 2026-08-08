// src/services/custom-questions.service.js
// Organiser-defined questions on the registration form.
//
// This is a deliberate subset of `05-form-builder.md`, not the whole of it. That spec asks
// for fourteen field types, sections, conditional routing, file upload and profile mapping,
// on the stated basis of reusing a builder that does not exist in this repository — and its
// own note defers it "until there is evidence that fixed fields are insufficient".
//
// The evidence is narrow and specific: the spec's own examples of what organisers need to
// ask — meal option, transport, wave, running club — are all a short answer or a pick from
// a list. So that is what this does, and nothing more.
//
// Left out on purpose, because each is a real cost with no evidence behind it yet:
//   - file upload: needs R2 plumbing, size and type handling, and a retention story
//   - conditional routing: the complexity multiplier, and nothing asks for it
//   - profile-linked fields: profile mapping is a separate problem from asking a question
//   - repeating groups and address composites
//
// Answers are snapshotted with their question label. A question renamed after people have
// answered it would otherwise silently relabel their answers, which is worse than useless
// on an export an organiser is using to order 400 meals.

const QUESTION_TYPES = ['short_text', 'dropdown', 'single_choice', 'checkbox_agreement'];

const MAX_QUESTIONS = 10;
const MAX_OPTIONS = 20;
const MAX_ANSWER_LENGTH = 300;

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

/**
 * A stable identifier for a question.
 *
 * Derived from the label but kept once assigned, so answers already given stay attached to
 * their question when the label is edited.
 */
function slugifyQuestionId(label, index) {
  const base = String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return base || `question_${index + 1}`;
}

function typeNeedsOptions(type) {
  return type === 'dropdown' || type === 'single_choice';
}

/**
 * Normalise what an organiser submitted into storable questions.
 *
 * Invalid rows are dropped rather than rejected: this sits on a long event form, and losing
 * an entire save because one question has no label would be the wrong trade. What survives
 * is always coherent.
 */
function parseQuestions(rawQuestions, existing = []) {
  const existingIds = new Map(
    (existing || []).map((question) => [String(question.label || '').toLowerCase(), question.questionId])
  );
  const used = new Set();
  const questions = [];

  for (const [index, raw] of (rawQuestions || []).entries()) {
    if (questions.length >= MAX_QUESTIONS) break;

    const label = clean(raw?.label, 160);
    if (!label) continue;

    const type = QUESTION_TYPES.includes(raw?.type) ? raw.type : 'short_text';

    // Options arrive as newline/comma text from the form and as an array once parsed, and
    // this function runs over both — the form body on submit, and its own output on save.
    const rawOptions = Array.isArray(raw?.options) ? raw.options : String(raw?.options || '').split(/[\n,]/);
    const options = typeNeedsOptions(type)
      ? rawOptions.map((option) => clean(option, 80)).filter(Boolean).slice(0, MAX_OPTIONS)
      : [];

    // A dropdown with nothing to pick is not a question. Drop it rather than render an
    // empty select that nobody can answer.
    if (typeNeedsOptions(type) && options.length === 0) continue;

    // Keep the id an answered question already has, so renaming the label does not orphan
    // every answer given under it.
    let questionId = clean(raw?.questionId, 40) || existingIds.get(label.toLowerCase()) || slugifyQuestionId(label, index);
    while (used.has(questionId)) questionId = `${questionId}_${used.size + 1}`;
    used.add(questionId);

    questions.push({
      questionId,
      label,
      type,
      required: raw?.required === true || raw?.required === '1' || raw?.required === 'on',
      options,
      helpText: clean(raw?.helpText, 200)
    });
  }

  return questions;
}

/**
 * Read the questions off a form body.
 *
 * Named fields rather than nested brackets: the app parses urlencoded bodies with
 * `extended: false`, so `questions[0][label]` would arrive as a literal key.
 */
function parseQuestionsFromBody(body = {}, existing = []) {
  const raw = [];
  for (let index = 0; index < MAX_QUESTIONS; index += 1) {
    const label = body[`customQuestionLabel${index}`];
    if (label === undefined) continue;
    raw.push({
      questionId: body[`customQuestionId${index}`],
      label,
      type: body[`customQuestionType${index}`],
      options: body[`customQuestionOptions${index}`],
      helpText: body[`customQuestionHelp${index}`],
      required: body[`customQuestionRequired${index}`]
    });
  }
  return parseQuestions(raw, existing);
}

function getQuestions(event) {
  return Array.isArray(event?.customQuestions) ? event.customQuestions : [];
}

function hasQuestions(event) {
  return getQuestions(event).length > 0;
}

/**
 * Check a participant's answers and return what should be stored.
 *
 * @param {Object} [options]
 * @param {boolean} [options.requireAnswers=true] - set false for a bulk import. A required
 *   question is a question for the participant; demanding it of an organiser pasting a
 *   spreadsheet would fail every row for an answer they have no way of knowing.
 * @returns {{answers: Array, errors: Object}} errors keyed by `custom_<questionId>`, so a
 *   form can put each message next to the question it belongs to.
 */
function validateAnswers(event, body = {}, { requireAnswers = true } = {}) {
  const answers = [];
  const errors = {};

  for (const question of getQuestions(event)) {
    const field = `custom_${question.questionId}`;
    const submitted = body[field];

    if (question.type === 'checkbox_agreement') {
      const agreed = submitted === 'on' || submitted === '1' || submitted === true;
      if (question.required && requireAnswers && !agreed) {
        errors[field] = `Please confirm: ${question.label}`;
        continue;
      }
      answers.push({
        questionId: question.questionId,
        label: question.label,
        type: question.type,
        value: agreed ? 'Yes' : 'No'
      });
      continue;
    }

    const value = clean(submitted, MAX_ANSWER_LENGTH);

    if (!value) {
      if (question.required && requireAnswers) errors[field] = `${question.label} is required.`;
      continue;
    }

    // An answer that is not one of the offered options means the form and the event have
    // come apart — a stale page, or a hand-crafted post.
    if (typeNeedsOptions(question.type) && !question.options.includes(value)) {
      errors[field] = `Choose one of the options for ${question.label}.`;
      continue;
    }

    answers.push({
      questionId: question.questionId,
      // Snapshotted, so a later rename cannot relabel an answer already given.
      label: question.label,
      type: question.type,
      value
    });
  }

  return { answers, errors };
}

/**
 * Column headers and row values for an export, in the event's question order.
 *
 * Answers are matched by id and read back through the event's current labels, so a column
 * means the same thing for every row even when a question was renamed halfway through.
 */
function answersForExport(event, registration) {
  const questions = getQuestions(event);
  const byId = new Map((registration?.customAnswers || []).map((answer) => [answer.questionId, answer]));
  return questions.map((question) => byId.get(question.questionId)?.value || '');
}

function exportHeaders(event) {
  return getQuestions(event).map((question) => question.label);
}

module.exports = {
  QUESTION_TYPES,
  MAX_QUESTIONS,
  MAX_OPTIONS,
  MAX_ANSWER_LENGTH,
  parseQuestions,
  parseQuestionsFromBody,
  validateAnswers,
  getQuestions,
  hasQuestions,
  answersForExport,
  exportHeaders,
  slugifyQuestionId,
  typeNeedsOptions
};
