(function initEventFaqBuilder() {
  'use strict';

  function renumber(list) {
    Array.from(list.querySelectorAll('[data-faq-row]')).forEach(function (row, index) {
      var number = index + 1;
      var title = row.querySelector('[data-faq-row-title]');
      if (title) title.textContent = 'Question ' + number;
      var removeButton = row.querySelector('[data-faq-remove]');
      if (removeButton) removeButton.setAttribute('aria-label', 'Remove question ' + number);
      var question = row.querySelector('input[name="faqQuestion"]');
      if (question) question.setAttribute('aria-label', 'Question ' + number);
      var answer = row.querySelector('textarea[name="faqAnswer"]');
      if (answer) answer.setAttribute('aria-label', 'Answer ' + number);
    });
  }

  function clearRow(row) {
    row.querySelectorAll('input[name="faqQuestion"], textarea[name="faqAnswer"]').forEach(function (field) {
      field.value = '';
    });
    row.querySelectorAll('.error-text').forEach(function (node) { node.remove(); });
    row.querySelectorAll('.has-error').forEach(function (node) { node.classList.remove('has-error'); });
  }

  function setup(builder) {
    var list = builder.querySelector('[data-faq-list]');
    var addButton = builder.querySelector('[data-faq-add]');
    var max = Number(builder.getAttribute('data-faq-max')) || 8;
    if (!list) return;

    function rows() {
      return Array.from(list.querySelectorAll('[data-faq-row]'));
    }

    function syncAddButton() {
      if (addButton) addButton.disabled = rows().length >= max;
    }

    addButton && addButton.addEventListener('click', function () {
      var current = rows();
      if (current.length >= max || !current.length) return;
      var clone = current[current.length - 1].cloneNode(true);
      clearRow(clone);
      list.appendChild(clone);
      renumber(list);
      syncAddButton();
      var question = clone.querySelector('input[name="faqQuestion"]');
      if (question) question.focus();
    });

    list.addEventListener('click', function (event) {
      var removeButton = event.target.closest('[data-faq-remove]');
      if (!removeButton) return;
      var row = removeButton.closest('[data-faq-row]');
      if (!row) return;
      // Keep one row so the section never disappears; clearing it removes the FAQ entry.
      if (rows().length === 1) {
        clearRow(row);
      } else {
        row.remove();
      }
      renumber(list);
      syncAddButton();
      if (addButton) addButton.focus();
    });

    syncAddButton();
  }

  function init() {
    document.querySelectorAll('[data-faq-builder]').forEach(setup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
