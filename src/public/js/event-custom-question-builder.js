(function (globalObject, factory) {
  'use strict';

  const api = factory(globalObject);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!globalObject?.document) return;
  globalObject.HelloRunCustomQuestionBuilder = api;
  const start = () => api.initAll(globalObject.document);
  if (globalObject.document.readyState === 'loading') globalObject.document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}(typeof window !== 'undefined' ? window : null, function (runtime) {
  'use strict';

  const QUESTION_TYPES = new Set(['short_text', 'dropdown', 'single_choice', 'checkbox_agreement']);
  const ACTION_BUTTON_IDS = new Set(['previewBtn', 'saveDraftBtn', 'publishBtn', 'saveBtn', 'submitReviewBtn']);

  function needsOptions(type) {
    return type === 'dropdown' || type === 'single_choice';
  }

  function element(documentObject, tag, className, text) {
    const node = documentObject.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(documentObject, name) {
    const node = element(documentObject, 'i');
    node.dataset.lucide = name;
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function actionButton(documentObject, action, label, iconName, attributeName = 'data-question-action') {
    const button = element(documentObject, 'button');
    button.type = 'button';
    button.setAttribute(attributeName, action);
    button.setAttribute('aria-label', label);
    button.title = label;
    button.appendChild(icon(documentObject, iconName));
    return button;
  }

  function createOptionRow(documentObject, value = '') {
    const row = element(documentObject, 'div', 'custom-question-option');
    row.dataset.optionRow = '';
    row.appendChild(actionButton(documentObject, 'up', 'Move option up', 'arrow-up', 'data-option-action'));
    row.appendChild(actionButton(documentObject, 'down', 'Move option down', 'arrow-down', 'data-option-action'));
    const input = element(documentObject, 'input');
    input.type = 'text';
    input.maxLength = 80;
    input.value = value;
    input.dataset.optionInput = '';
    row.appendChild(input);
    row.appendChild(actionButton(documentObject, 'remove', 'Remove option', 'x', 'data-option-action'));
    return row;
  }

  function createQuestionCard(documentObject, type = 'short_text') {
    const normalizedType = QUESTION_TYPES.has(type) ? type : 'short_text';
    const card = element(documentObject, 'fieldset', 'custom-question-card');
    card.dataset.questionCard = '';
    card.dataset.questionCommitted = 'false';
    card.dataset.questionTouched = 'false';
    const legend = element(documentObject, 'legend', 'builder-visually-hidden', 'Question');
    card.appendChild(legend);

    const header = element(documentObject, 'div', 'custom-question-card-header');
    const drag = element(documentObject, 'button', 'custom-question-drag');
    drag.type = 'button';
    drag.draggable = true;
    drag.dataset.questionDrag = '';
    drag.title = 'Drag to reorder';
    drag.appendChild(icon(documentObject, 'grip-vertical'));
    header.appendChild(drag);
    const number = element(documentObject, 'strong', '', 'Question');
    number.dataset.questionNumber = '';
    header.appendChild(number);
    const actions = element(documentObject, 'div', 'custom-question-actions');
    actions.appendChild(actionButton(documentObject, 'up', 'Move question up', 'arrow-up'));
    actions.appendChild(actionButton(documentObject, 'down', 'Move question down', 'arrow-down'));
    actions.appendChild(actionButton(documentObject, 'duplicate', 'Duplicate question', 'copy'));
    actions.appendChild(actionButton(documentObject, 'delete', 'Delete question', 'trash-2'));
    header.appendChild(actions);
    card.appendChild(header);

    const idInput = element(documentObject, 'input');
    idInput.type = 'hidden';
    idInput.dataset.questionField = 'id';
    card.appendChild(idInput);

    const primaryFields = element(documentObject, 'div', 'custom-question-primary-fields');
    const promptLabel = element(documentObject, 'label');
    promptLabel.appendChild(element(documentObject, 'span', '', 'Question'));
    const prompt = element(documentObject, 'input');
    prompt.type = 'text';
    prompt.maxLength = 160;
    prompt.dataset.questionField = 'label';
    promptLabel.appendChild(prompt);
    primaryFields.appendChild(promptLabel);

    const typeLabel = element(documentObject, 'label');
    typeLabel.appendChild(element(documentObject, 'span', '', 'Answer type'));
    const select = element(documentObject, 'select');
    select.dataset.questionField = 'type';
    [
      ['short_text', 'Short answer'],
      ['dropdown', 'Pick from a list'],
      ['single_choice', 'Pick one'],
      ['checkbox_agreement', 'Agreement checkbox']
    ].forEach(([value, label]) => {
      const option = element(documentObject, 'option', '', label);
      option.value = value;
      option.selected = value === normalizedType;
      select.appendChild(option);
    });
    typeLabel.appendChild(select);
    primaryFields.appendChild(typeLabel);
    card.appendChild(primaryFields);

    const options = element(documentObject, 'div', 'custom-question-options');
    options.dataset.questionOptions = '';
    options.hidden = !needsOptions(normalizedType);
    const optionsHeading = element(documentObject, 'div', 'custom-question-options-heading');
    optionsHeading.appendChild(element(documentObject, 'span', '', 'Answer options'));
    const optionCount = element(documentObject, 'small', '', '0 of 20 options');
    optionCount.dataset.optionCount = '';
    optionsHeading.appendChild(optionCount);
    options.appendChild(optionsHeading);
    const optionList = element(documentObject, 'div');
    optionList.dataset.optionList = '';
    if (needsOptions(normalizedType)) optionList.appendChild(createOptionRow(documentObject));
    options.appendChild(optionList);
    const addOption = element(documentObject, 'button', 'custom-question-add-option');
    addOption.type = 'button';
    addOption.dataset.questionAction = 'add-option';
    addOption.appendChild(icon(documentObject, 'plus'));
    addOption.append(' Add option');
    options.appendChild(addOption);
    card.appendChild(options);

    const serializedOptions = element(documentObject, 'textarea', 'builder-visually-hidden');
    serializedOptions.dataset.questionField = 'options';
    serializedOptions.tabIndex = -1;
    serializedOptions.setAttribute('aria-hidden', 'true');
    card.appendChild(serializedOptions);

    const help = element(documentObject, 'details', 'custom-question-help');
    const helpSummary = element(documentObject, 'summary', '', 'Help text ');
    helpSummary.appendChild(element(documentObject, 'span', '', 'Optional'));
    help.appendChild(helpSummary);
    const helpLabel = element(documentObject, 'label');
    const helpVisibleLabel = element(documentObject, 'span', 'builder-visually-hidden', 'Help text');
    helpLabel.appendChild(helpVisibleLabel);
    const helpInput = element(documentObject, 'input');
    helpInput.type = 'text';
    helpInput.maxLength = 200;
    helpInput.placeholder = 'Explain what information you need';
    helpInput.dataset.questionField = 'help';
    helpLabel.appendChild(helpInput);
    help.appendChild(helpLabel);
    card.appendChild(help);

    const preview = element(documentObject, 'div', 'custom-question-preview');
    preview.dataset.questionPreview = '';
    preview.setAttribute('aria-live', 'polite');
    card.appendChild(preview);

    const footer = element(documentObject, 'div', 'custom-question-card-footer');
    const error = element(documentObject, 'p', 'custom-question-error');
    error.dataset.questionError = '';
    error.setAttribute('role', 'alert');
    error.hidden = true;
    footer.appendChild(error);
    const requiredLabel = element(documentObject, 'label', 'custom-question-required');
    const required = element(documentObject, 'input');
    required.type = 'checkbox';
    required.value = '1';
    required.dataset.questionField = 'required';
    requiredLabel.appendChild(required);
    requiredLabel.appendChild(element(documentObject, 'span', '', 'Required'));
    footer.appendChild(requiredLabel);
    card.appendChild(footer);
    return card;
  }

  function initBuilder(builder) {
    if (!builder || builder.dataset.questionBuilderReady === 'true') return null;
    builder.dataset.questionBuilderReady = 'true';
    const documentObject = builder.ownerDocument;
    const form = builder.closest('form');
    const list = builder.querySelector('[data-question-list]');
    const empty = builder.querySelector('[data-question-empty]');
    const count = builder.querySelector('[data-question-count]');
    const addMenu = builder.querySelector('[data-question-add-menu]');
    const limitMessage = builder.querySelector('[data-question-limit-message]');
    const status = builder.querySelector('[data-question-status]');
    const maxQuestions = Number(builder.dataset.maxQuestions || 10);
    const maxOptions = Number(builder.dataset.maxOptions || 20);
    let lastDeleted = null;
    let draggedCard = null;

    const cards = () => Array.from(list.querySelectorAll(':scope > [data-question-card]'));
    const optionRows = (card) => Array.from(card.querySelectorAll('[data-option-row]'));

    function refreshIcons() {
      runtime?.lucide?.createIcons?.();
    }

    function showStatus(message, undoAvailable = false) {
      status.replaceChildren();
      status.hidden = false;
      status.appendChild(documentObject.createTextNode(message));
      if (undoAvailable) {
        const undo = element(documentObject, 'button', '', 'Undo');
        undo.type = 'button';
        undo.dataset.questionUndo = '';
        status.append(' ', undo);
      }
    }

    function syncOptions(card) {
      const values = optionRows(card).map((row) => row.querySelector('[data-option-input]')?.value || '');
      const serialized = card.querySelector('[data-question-field="options"]');
      if (serialized) serialized.value = values.join('\n');
      const optionCount = card.querySelector('[data-option-count]');
      if (optionCount) optionCount.textContent = `${values.filter((value) => value.trim()).length} of ${maxOptions} options`;
      const addOption = card.querySelector('[data-question-action="add-option"]');
      if (addOption) {
        addOption.disabled = values.length >= maxOptions;
        addOption.setAttribute('aria-disabled', String(values.length >= maxOptions));
      }
      optionRows(card).forEach((row, index, rows) => {
        const input = row.querySelector('[data-option-input]');
        if (input) input.setAttribute('aria-label', `Option ${index + 1}`);
        const up = row.querySelector('[data-option-action="up"]');
        const down = row.querySelector('[data-option-action="down"]');
        if (up) up.disabled = index === 0;
        if (down) down.disabled = index === rows.length - 1;
      });
    }

    function renderPreview(card) {
      const preview = card.querySelector('[data-question-preview]');
      if (!preview) return;
      preview.replaceChildren();
      const labelValue = card.querySelector('[data-question-field="label"]')?.value.trim();
      const type = card.querySelector('[data-question-field="type"]')?.value || 'short_text';
      const heading = element(documentObject, 'strong', '', labelValue || 'Participant preview');
      preview.appendChild(heading);
      if (type === 'short_text') {
        const sample = element(documentObject, 'span', 'custom-question-preview-line', 'Short answer text');
        preview.appendChild(sample);
      } else if (type === 'checkbox_agreement') {
        const sample = element(documentObject, 'span', 'custom-question-preview-choice', '☐ Participant confirms this statement');
        preview.appendChild(sample);
      } else {
        const values = optionRows(card).map((row) => row.querySelector('[data-option-input]')?.value.trim()).filter(Boolean);
        const sample = element(documentObject, 'span', 'custom-question-preview-choice', values.length ? values.join(' · ') : 'Add at least one answer option');
        preview.appendChild(sample);
      }
      const help = card.querySelector('[data-question-field="help"]')?.value.trim();
      if (help) preview.appendChild(element(documentObject, 'small', '', help));
    }

    function isCardEmpty(card) {
      const label = card.querySelector('[data-question-field="label"]')?.value.trim();
      const help = card.querySelector('[data-question-field="help"]')?.value.trim();
      const required = card.querySelector('[data-question-field="required"]')?.checked;
      const options = optionRows(card).some((row) => row.querySelector('[data-option-input]')?.value.trim());
      return !label && !help && !required && !options;
    }

    function syncCard(card, index, allCards) {
      const number = index + 1;
      const untouchedEmpty = card.dataset.questionCommitted !== 'true' && card.dataset.questionTouched !== 'true' && isCardEmpty(card);
      card.querySelector('legend').textContent = `Question ${number}`;
      card.querySelector('[data-question-number]').textContent = `Question ${number}`;
      card.querySelector('[data-question-drag]').setAttribute('aria-label', `Reorder question ${number}`);
      const fields = {
        id: 'customQuestionId',
        label: 'customQuestionLabel',
        type: 'customQuestionType',
        options: 'customQuestionOptions',
        help: 'customQuestionHelp',
        required: 'customQuestionRequired'
      };
      Object.entries(fields).forEach(([field, prefix]) => {
        const input = card.querySelector(`[data-question-field="${field}"]`);
        if (!input) return;
        if (untouchedEmpty) input.removeAttribute('name');
        else input.name = `${prefix}${index}`;
        input.id = `${prefix}${index}`;
      });
      card.querySelectorAll('[data-question-action]').forEach((button) => {
        const action = button.dataset.questionAction;
        if (action === 'add-option') return;
        button.setAttribute('aria-label', `${action === 'up' ? 'Move' : action === 'down' ? 'Move' : action.charAt(0).toUpperCase() + action.slice(1)} question ${number}${action === 'up' ? ' up' : action === 'down' ? ' down' : ''}`);
      });
      const up = card.querySelector('[data-question-action="up"]');
      const down = card.querySelector('[data-question-action="down"]');
      if (up) up.disabled = index === 0;
      if (down) down.disabled = index === allCards.length - 1;
      const error = card.querySelector('[data-question-error]');
      if (error) error.id = `customQuestionError${index}`;
      syncOptions(card);
      renderPreview(card);
    }

    function syncAll() {
      const allCards = cards();
      allCards.forEach((card, index) => syncCard(card, index, allCards));
      if (empty) empty.hidden = allCards.length > 0;
      if (count) count.textContent = `${allCards.length} of ${maxQuestions} questions`;
      const atLimit = allCards.length >= maxQuestions;
      if (addMenu) {
        addMenu.classList.toggle('is-disabled', atLimit);
        addMenu.querySelector('summary')?.setAttribute('aria-disabled', String(atLimit));
        addMenu.querySelectorAll('[data-add-question-type]').forEach((button) => { button.disabled = atLimit; });
        if (atLimit) addMenu.open = false;
      }
      if (limitMessage) limitMessage.hidden = !atLimit;
      refreshIcons();
    }

    function clearError(card) {
      const error = card.querySelector('[data-question-error]');
      if (error) {
        error.hidden = true;
        error.textContent = '';
      }
      card.classList.remove('has-error');
      card.querySelectorAll('[aria-invalid="true"]').forEach((field) => {
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
      });
    }

    function setError(card, field, message) {
      const error = card.querySelector('[data-question-error]');
      card.classList.add('has-error');
      error.textContent = message;
      error.hidden = false;
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', error.id);
      return field;
    }

    function validate(options = {}) {
      syncAll();
      let firstInvalid = null;
      cards().forEach((card) => {
        clearError(card);
        const authored = card.dataset.questionCommitted === 'true' || card.dataset.questionTouched === 'true' || !isCardEmpty(card);
        if (!authored) return;
        const label = card.querySelector('[data-question-field="label"]');
        const type = card.querySelector('[data-question-field="type"]')?.value;
        if (!label.value.trim()) {
          firstInvalid ||= setError(card, label, 'Add the question text or remove this card before continuing.');
          return;
        }
        if (needsOptions(type)) {
          const filledOptions = optionRows(card).filter((row) => row.querySelector('[data-option-input]')?.value.trim());
          if (!filledOptions.length) {
            let optionInput = card.querySelector('[data-option-input]');
            if (!optionInput) {
              const optionList = card.querySelector('[data-option-list]');
              optionList.appendChild(createOptionRow(documentObject));
              optionInput = card.querySelector('[data-option-input]');
              syncAll();
            }
            firstInvalid ||= setError(card, optionInput, 'Add at least one answer option or choose another answer type.');
          }
        }
      });
      if (firstInvalid && options.focus !== false) {
        const EventConstructor = runtime?.CustomEvent || documentObject.defaultView?.CustomEvent;
        if (EventConstructor) form?.dispatchEvent(new EventConstructor('event-builder:reveal-field', { detail: { field: firstInvalid } }));
        firstInvalid.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus?.({ preventScroll: true });
        showStatus('Finish or remove the highlighted question before continuing.');
      }
      return !firstInvalid;
    }

    function addQuestion(type) {
      if (cards().length >= maxQuestions) return null;
      const card = createQuestionCard(documentObject, type);
      list.appendChild(card);
      if (needsOptions(type)) card.dataset.questionTouched = 'true';
      syncAll();
      addMenu.open = false;
      const prompt = card.querySelector('[data-question-field="label"]');
      prompt.focus();
      showStatus('Question added.');
      return card;
    }

    function duplicateQuestion(card) {
      if (cards().length >= maxQuestions) return;
      const copy = createQuestionCard(documentObject, card.querySelector('[data-question-field="type"]')?.value);
      copy.dataset.questionTouched = 'true';
      copy.querySelector('[data-question-field="label"]').value = card.querySelector('[data-question-field="label"]')?.value || '';
      copy.querySelector('[data-question-field="help"]').value = card.querySelector('[data-question-field="help"]')?.value || '';
      copy.querySelector('[data-question-field="required"]').checked = Boolean(card.querySelector('[data-question-field="required"]')?.checked);
      const copyOptionList = copy.querySelector('[data-option-list]');
      copyOptionList.replaceChildren();
      optionRows(card).forEach((row) => copyOptionList.appendChild(createOptionRow(documentObject, row.querySelector('[data-option-input]')?.value || '')));
      card.after(copy);
      syncAll();
      copy.querySelector('[data-question-field="label"]').focus();
      showStatus('Question duplicated.');
    }

    function moveNode(node, offset) {
      const all = node.parentElement ? Array.from(node.parentElement.children) : [];
      const index = all.indexOf(node);
      const target = all[index + offset];
      if (!target) return false;
      if (offset < 0) target.before(node);
      else target.after(node);
      return true;
    }

    function handleQuestionAction(button) {
      const card = button.closest('[data-question-card]');
      const action = button.dataset.questionAction;
      if (!card) return;
      if (action === 'up' || action === 'down') {
        if (moveNode(card, action === 'up' ? -1 : 1)) {
          syncAll();
          card.querySelector(`[data-question-action="${action}"]`)?.focus();
          showStatus(`Question moved ${action}.`);
        }
      } else if (action === 'duplicate') duplicateQuestion(card);
      else if (action === 'delete') {
        lastDeleted = { card, index: cards().indexOf(card) };
        card.remove();
        syncAll();
        showStatus('Question deleted.', true);
      } else if (action === 'add-option') {
        const rows = optionRows(card);
        if (rows.length >= maxOptions) return;
        const row = createOptionRow(documentObject);
        card.querySelector('[data-option-list]').appendChild(row);
        card.dataset.questionTouched = 'true';
        syncAll();
        row.querySelector('[data-option-input]').focus();
      }
    }

    function handleOptionAction(button) {
      const card = button.closest('[data-question-card]');
      const row = button.closest('[data-option-row]');
      const action = button.dataset.optionAction;
      if (!card || !row) return;
      if (action === 'remove') {
        row.remove();
        if (!optionRows(card).length) card.querySelector('[data-option-list]').appendChild(createOptionRow(documentObject));
      } else {
        moveNode(row, action === 'up' ? -1 : 1);
      }
      card.dataset.questionTouched = 'true';
      syncAll();
      card.querySelector('[data-option-input]')?.focus();
    }

    builder.addEventListener('click', (event) => {
      const addSummary = event.target.closest('[data-question-add-menu] > summary');
      if (addSummary && cards().length >= maxQuestions) {
        event.preventDefault();
        showStatus('Ten questions is the maximum for one event.');
        return;
      }
      const addButton = event.target.closest('[data-add-question-type]');
      if (addButton) {
        addQuestion(addButton.dataset.addQuestionType);
        return;
      }
      const questionAction = event.target.closest('[data-question-action]');
      if (questionAction) {
        handleQuestionAction(questionAction);
        return;
      }
      const optionAction = event.target.closest('[data-option-action]');
      if (optionAction) {
        handleOptionAction(optionAction);
        return;
      }
      if (event.target.closest('[data-question-undo]') && lastDeleted) {
        const current = cards();
        if (lastDeleted.index >= current.length) list.appendChild(lastDeleted.card);
        else current[lastDeleted.index].before(lastDeleted.card);
        const restored = lastDeleted.card;
        lastDeleted = null;
        syncAll();
        restored.querySelector('[data-question-field="label"]')?.focus();
        showStatus('Question restored.');
      }
    });

    builder.addEventListener('input', (event) => {
      const card = event.target.closest('[data-question-card]');
      if (!card) return;
      card.dataset.questionTouched = 'true';
      clearError(card);
      syncAll();
    });

    builder.addEventListener('change', (event) => {
      const card = event.target.closest('[data-question-card]');
      if (!card) return;
      card.dataset.questionTouched = 'true';
      if (event.target.matches('[data-question-field="type"]')) {
        const type = event.target.value;
        const options = card.querySelector('[data-question-options]');
        options.hidden = !needsOptions(type);
        if (needsOptions(type) && !optionRows(card).length) card.querySelector('[data-option-list]').appendChild(createOptionRow(documentObject));
      }
      clearError(card);
      syncAll();
    });

    builder.addEventListener('dragstart', (event) => {
      const handle = event.target.closest('[data-question-drag]');
      if (!handle) return;
      draggedCard = handle.closest('[data-question-card]');
      draggedCard.classList.add('is-dragging');
      event.dataTransfer?.setData('text/plain', 'question');
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });
    builder.addEventListener('dragover', (event) => {
      if (!draggedCard || !event.target.closest('[data-question-card]')) return;
      event.preventDefault();
    });
    builder.addEventListener('drop', (event) => {
      const target = event.target.closest('[data-question-card]');
      if (!draggedCard || !target || draggedCard === target) return;
      event.preventDefault();
      const box = target.getBoundingClientRect();
      if (event.clientY < box.top + box.height / 2) target.before(draggedCard);
      else target.after(draggedCard);
      draggedCard.classList.remove('is-dragging');
      draggedCard.querySelector('[data-question-drag]')?.focus();
      draggedCard = null;
      syncAll();
      showStatus('Question reordered.');
    });
    builder.addEventListener('dragend', () => {
      draggedCard?.classList.remove('is-dragging');
      draggedCard = null;
    });

    if (form) {
      form.addEventListener('click', (event) => {
        const action = event.target.closest('button, a');
        if (!action || !ACTION_BUTTON_IDS.has(action.id)) return;
        if (validate()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);
      form.addEventListener('submit', (event) => {
        if (validate()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);
    }

    cards().forEach((card) => {
      if (needsOptions(card.querySelector('[data-question-field="type"]')?.value) && !optionRows(card).length) {
        card.querySelector('[data-option-list]').appendChild(createOptionRow(documentObject));
      }
    });
    syncAll();
    return { addQuestion, cards, syncAll, validate };
  }

  function initAll(documentObject) {
    return Array.from(documentObject.querySelectorAll('[data-custom-question-builder]')).map(initBuilder).filter(Boolean);
  }

  return { createQuestionCard, initAll, initBuilder, needsOptions };
}));
