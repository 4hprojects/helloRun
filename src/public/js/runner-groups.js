(function () {
  'use strict';

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  var modal = document.querySelector('[data-group-confirm-modal]');
  if (!modal) return;

  var dialog = modal.querySelector('[role="dialog"]');
  var title = modal.querySelector('[data-group-confirm-title]');
  var description = modal.querySelector('[data-group-confirm-description]');
  var cancelButton = modal.querySelector('[data-cancel-group-action]');
  var confirmButton = modal.querySelector('[data-confirm-group-action]');
  var activeForm = null;
  var activeTrigger = null;
  var submitting = false;

  function getFocusable() {
    return Array.from(modal.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
  }

  function closeModal() {
    if (submitting) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('runner-groups-modal-open');
    var trigger = activeTrigger;
    activeForm = null;
    activeTrigger = null;
    trigger?.focus();
  }

  function openModal(form, submitter) {
    var groupName = form.dataset.groupName || 'this group';
    activeForm = form;
    activeTrigger = submitter;
    submitting = false;
    confirmButton.disabled = false;
    confirmButton.removeAttribute('aria-busy');

    title.textContent = 'Leave ' + groupName + '?';
    description.textContent = 'This removes only this group from your runner profile. Your other group memberships stay unchanged.';
    confirmButton.textContent = 'Leave group';
    confirmButton.className = 'btn btn-outline-danger';

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('runner-groups-modal-open');
    cancelButton.focus();
  }

  document.querySelectorAll('[data-group-action-form]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (submitting || form.dataset.groupAction !== 'leave') return;
      event.preventDefault();
      openModal(form, event.submitter || form.querySelector('[type="submit"]'));
    });
  });

  cancelButton.addEventListener('click', closeModal);
  confirmButton.addEventListener('click', function () {
    if (!activeForm || submitting) return;
    submitting = true;
    confirmButton.disabled = true;
    confirmButton.setAttribute('aria-busy', 'true');
    activeForm.submit();
  });

  modal.addEventListener('click', function (event) {
    if (event.target === modal) closeModal();
  });

  modal.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    var focusable = getFocusable();
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  dialog?.addEventListener('click', function (event) { event.stopPropagation(); });
})();
