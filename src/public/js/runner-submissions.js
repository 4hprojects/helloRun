(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var changedForms = new Set();

    document.querySelectorAll('[data-submission-edit-form]').forEach(function (form) {
      form.querySelectorAll('input, select, textarea').forEach(function (field) {
        field.addEventListener('change', function () { changedForms.add(form); });
      });

      form.addEventListener('submit', function () {
        changedForms.delete(form);
        form.setAttribute('aria-busy', 'true');
        var button = form.querySelector('[type="submit"]');
        if (button) {
          button.disabled = true;
          button.textContent = 'Updating\u2026';
        }
        var status = form.querySelector('.sub-form-status');
        if (status) status.textContent = 'Updating your activity details\u2026';
      });
    });

    window.addEventListener('beforeunload', function (event) {
      if (!changedForms.size) return;
      event.preventDefault();
      event.returnValue = 'You have unsaved changes.';
    });

    document.querySelectorAll('[data-copy-url]').forEach(function (button) {
      button.addEventListener('click', function () {
        var status = button.parentElement && button.parentElement.querySelector('.sub-copy-status');
        var url = button.getAttribute('data-copy-url') || '';
        if (!url || !navigator.clipboard) {
          if (status) status.textContent = 'Copy is unavailable. Open the verification page and copy its address.';
          return;
        }
        button.disabled = true;
        navigator.clipboard.writeText(url).then(function () {
          if (status) status.textContent = 'Verification link copied.';
        }).catch(function () {
          if (status) status.textContent = 'Could not copy the link. Please try again.';
        }).finally(function () {
          button.disabled = false;
        });
      });
    });
  });
}());
