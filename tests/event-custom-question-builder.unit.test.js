'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { Window } = require('happy-dom');

const ROOT = path.resolve(__dirname, '..');
const partial = fs.readFileSync(path.join(ROOT, 'src/views/organizer/partials/custom-question-builder.ejs'), 'utf8');
const builderApi = require('../src/public/js/event-custom-question-builder');

function setup(customQuestions = []) {
  const window = new Window({ url: 'https://hellorun.test/organizer/create-event' });
  const markup = ejs.render(partial, { formData: { customQuestions } });
  window.document.body.innerHTML = `<form class="create-event-form">${markup}<button type="button" id="saveDraftBtn">Save</button></form>`;
  const builder = window.document.querySelector('[data-custom-question-builder]');
  const controller = builderApi.initBuilder(builder);
  return { window, document: window.document, builder, controller };
}

function input(window, field, value) {
  field.value = value;
  field.dispatchEvent(new window.Event('input', { bubbles: true }));
}

test('empty state adds each supported question type with conditional options', () => {
  const { builder, controller } = setup();
  assert.equal(controller.cards().length, 0);
  assert.equal(builder.querySelector('[data-question-empty]').hidden, false);

  const shortCard = controller.addQuestion('short_text');
  assert.equal(shortCard.querySelector('[data-question-options]').hidden, true);
  assert.equal(shortCard.querySelector('[data-question-field="type"]').value, 'short_text');

  const listCard = controller.addQuestion('dropdown');
  assert.equal(listCard.querySelector('[data-question-options]').hidden, false);
  assert.equal(listCard.querySelectorAll('[data-option-row]').length, 1);

  const choiceCard = controller.addQuestion('single_choice');
  assert.equal(choiceCard.querySelector('[data-question-options]').hidden, false);

  const agreementCard = controller.addQuestion('checkbox_agreement');
  assert.equal(agreementCard.querySelector('[data-question-options]').hidden, true);
  assert.equal(builder.querySelector('[data-question-count]').textContent, '4 of 10 questions');
});

test('question fields reindex after move, duplicate, delete, and undo', () => {
  const existing = [
    { questionId: 'meal', label: 'Meal', type: 'dropdown', options: 'A\nB', helpText: '', required: true },
    { questionId: 'club', label: 'Club', type: 'short_text', options: '', helpText: '', required: false }
  ];
  const { builder, controller } = setup(existing);
  let cards = controller.cards();
  cards[1].querySelector('[data-question-action="up"]').click();
  cards = controller.cards();
  assert.equal(cards[0].querySelector('[data-question-field="id"]').value, 'club');
  assert.equal(cards[0].querySelector('[data-question-field="label"]').name, 'customQuestionLabel0');

  cards[0].querySelector('[data-question-action="duplicate"]').click();
  cards = controller.cards();
  assert.equal(cards.length, 3);
  assert.equal(cards[1].querySelector('[data-question-field="id"]').value, '');
  assert.equal(cards[1].querySelector('[data-question-field="label"]').value, 'Club');
  assert.equal(cards[1].querySelector('[data-question-field="label"]').name, 'customQuestionLabel1');

  cards[1].querySelector('[data-question-action="delete"]').click();
  assert.equal(controller.cards().length, 2);
  builder.querySelector('[data-question-undo]').click();
  assert.equal(controller.cards().length, 3);
  assert.equal(controller.cards()[1].querySelector('[data-question-field="label"]').value, 'Club');
});

test('choice options add, move, remove, serialize, and stop at twenty', () => {
  const { window, controller } = setup();
  const card = controller.addQuestion('dropdown');
  input(window, card.querySelector('[data-question-field="label"]'), 'Meal option');
  const first = card.querySelector('[data-option-input]');
  input(window, first, 'Chicken');
  card.querySelector('[data-question-action="add-option"]').click();
  const optionInputs = card.querySelectorAll('[data-option-input]');
  input(window, optionInputs[1], 'Vegetarian');
  assert.equal(card.querySelector('[data-question-field="options"]').value, 'Chicken\nVegetarian');

  optionInputs[1].closest('[data-option-row]').querySelector('[data-option-action="up"]').click();
  assert.equal(card.querySelector('[data-question-field="options"]').value, 'Vegetarian\nChicken');
  card.querySelector('[data-option-row] [data-option-action="remove"]').click();
  assert.equal(card.querySelectorAll('[data-option-row]').length, 1);

  while (card.querySelectorAll('[data-option-row]').length < 20) card.querySelector('[data-question-action="add-option"]').click();
  assert.equal(card.querySelectorAll('[data-option-row]').length, 20);
  assert.equal(card.querySelector('[data-question-action="add-option"]').disabled, true);
});

test('partial questions block actions and focus the first recoverable error', () => {
  const { window, document, controller } = setup();
  const card = controller.addQuestion('single_choice');
  const save = document.getElementById('saveDraftBtn');
  const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
  save.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(card.classList.contains('has-error'), true);
  assert.equal(document.activeElement, card.querySelector('[data-question-field="label"]'));

  input(window, card.querySelector('[data-question-field="label"]'), 'Meal option');
  assert.equal(controller.validate(), false);
  assert.equal(document.activeElement, card.querySelector('[data-option-input]'));
  input(window, card.querySelector('[data-option-input]'), 'Vegetarian');
  assert.equal(controller.validate(), true);
});

test('untouched blank questions do not serialize and ten-question limit is explicit', () => {
  const { builder, controller } = setup();
  const first = controller.addQuestion('short_text');
  assert.equal(first.querySelector('[data-question-field="label"]').hasAttribute('name'), false);
  assert.equal(first.querySelector('[data-question-field="label"]').disabled, false);
  for (let index = 1; index < 10; index += 1) controller.addQuestion('short_text');
  assert.equal(controller.cards().length, 10);
  assert.equal(controller.addQuestion('short_text'), null);
  assert.equal(builder.querySelector('[data-question-limit-message]').hidden, false);
  assert.equal(builder.querySelector('[data-add-question-type]').disabled, true);
});

test('organizer text remains text in participant preview', () => {
  const { window, document, controller } = setup();
  const card = controller.addQuestion('short_text');
  const payload = '<img src=x onerror=alert(1)>';
  input(window, card.querySelector('[data-question-field="label"]'), payload);
  assert.equal(card.querySelector('[data-question-preview] strong').textContent, payload);
  assert.equal(document.querySelectorAll('img').length, 0);
});
