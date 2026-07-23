(function () {
  'use strict';

  var page = document.querySelector('[data-organizer-submissions]');
  if (!page) return;
  if (window.lucide) window.lucide.createIcons();

  var bulkForm = document.querySelector('[data-bulk-approval-form]');
  var selectAll = document.querySelector('[data-select-all-eligible]');
  var selectedCount = document.querySelector('[data-selected-count]');
  var bulkButton = document.querySelector('[data-bulk-approve-button]');
  var dialogBackdrop = document.querySelector('[data-approval-dialog]');
  var dialog = dialogBackdrop && dialogBackdrop.querySelector('[role="dialog"]');
  var dialogTitle = dialogBackdrop && dialogBackdrop.querySelector('[data-approval-title]');
  var dialogDescription = dialogBackdrop && dialogBackdrop.querySelector('[data-approval-description]');
  var dialogSelection = dialogBackdrop && dialogBackdrop.querySelector('[data-approval-selection]');
  var dialogError = dialogBackdrop && dialogBackdrop.querySelector('[data-approval-error]');
  var cancelButton = dialogBackdrop && dialogBackdrop.querySelector('[data-approval-cancel]');
  var confirmButton = dialogBackdrop && dialogBackdrop.querySelector('[data-approval-confirm]');
  var activeForm = null;
  var activeTrigger = null;
  var submitting = false;

  function getEligibleCheckboxes() {
    return Array.from(document.querySelectorAll('[data-eligible-submission]'));
  }

  function updateSelection() {
    var eligibleCheckboxes = getEligibleCheckboxes();
    var checked = eligibleCheckboxes.filter(function (checkbox) { return checkbox.checked; });
    if (selectedCount) selectedCount.textContent = checked.length + ' selected';
    if (bulkButton) bulkButton.disabled = checked.length === 0;
    if (selectAll) {
      selectAll.checked = eligibleCheckboxes.length > 0 && checked.length === eligibleCheckboxes.length;
      selectAll.indeterminate = checked.length > 0 && checked.length < eligibleCheckboxes.length;
    }
  }

  if (selectAll) {
    selectAll.addEventListener('change', function () {
      getEligibleCheckboxes().forEach(function (checkbox) { checkbox.checked = selectAll.checked; });
      updateSelection();
    });
  }
  getEligibleCheckboxes().forEach(function (checkbox) { checkbox.addEventListener('change', updateSelection); });
  document.addEventListener('submission:reviewed', updateSelection);
  updateSelection();

  function selectedRunnerLabels() {
    return getEligibleCheckboxes().filter(function (checkbox) { return checkbox.checked; }).map(function (checkbox) {
      var row = checkbox.closest('[data-submission-id]');
      var name = row && row.querySelector('.organizer-submission-identity > strong');
      var event = row && row.querySelector('.organizer-submission-identity > a');
      return [name && name.textContent.trim(), event && event.textContent.trim()].filter(Boolean).join(' — ');
    });
  }

  function getFocusable(container) {
    return Array.from(container.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(function (element) { return !element.hidden; });
  }

  function openApprovalDialog(form, trigger, details) {
    if (!dialogBackdrop || !dialog) return false;
    activeForm = form;
    activeTrigger = trigger;
    submitting = false;
    confirmButton.disabled = false;
    confirmButton.textContent = 'Confirm approval';
    dialogError.hidden = true;
    dialogError.textContent = '';
    dialogTitle.textContent = details.title;
    dialogDescription.textContent = details.description;
    dialogSelection.innerHTML = '';
    details.labels.forEach(function (label) {
      var paragraph = document.createElement('p');
      paragraph.textContent = label;
      dialogSelection.appendChild(paragraph);
    });
    dialogBackdrop.hidden = false;
    document.body.classList.add('organizer-approval-dialog-open');
    dialog.focus();
    return true;
  }

  function closeApprovalDialog() {
    if (!dialogBackdrop || dialogBackdrop.hidden || submitting) return;
    dialogBackdrop.hidden = true;
    document.body.classList.remove('organizer-approval-dialog-open');
    if (activeTrigger) activeTrigger.focus();
    activeForm = null;
    activeTrigger = null;
  }

  document.querySelectorAll('[data-quick-approval-form]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (!dialogBackdrop) return;
      event.preventDefault();
      var trigger = event.submitter || form.querySelector('button[type="submit"]');
      openApprovalDialog(form, trigger, {
        title: 'Approve this result?',
        description: 'Confirm only after checking the runner, event, result, and evidence source.',
        labels: [form.dataset.runner + ' — ' + form.dataset.event + ' — ' + form.dataset.result]
      });
    });
  });

  if (bulkForm) {
    bulkForm.addEventListener('submit', function (event) {
      if (!dialogBackdrop) return;
      var labels = selectedRunnerLabels();
      if (!labels.length) {
        event.preventDefault();
        updateSelection();
        return;
      }
      event.preventDefault();
      var trigger = event.submitter || bulkButton;
      openApprovalDialog(bulkForm, trigger, {
        title: 'Approve ' + labels.length + ' selected result' + (labels.length === 1 ? '?' : 's?'),
        description: 'Only clean pending results are included. The server will recheck every result before approval.',
        labels: labels
      });
    });
  }

  function submitActiveForm() {
    if (!activeForm || submitting) return;
    submitting = true;
    confirmButton.disabled = true;
    confirmButton.textContent = 'Approving…';
    dialogError.hidden = true;
    var form = activeForm;
    fetch(form.action, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form),
      credentials: 'same-origin'
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok || !payload.success) throw new Error(payload.message || 'Approval could not be completed.');
        return payload;
      });
    }).then(function (payload) {
      window.location.assign(payload.returnPath || window.location.pathname);
    }).catch(function (error) {
      submitting = false;
      confirmButton.disabled = false;
      confirmButton.textContent = 'Confirm approval';
      dialogError.textContent = error.message || 'Approval could not be completed.';
      dialogError.hidden = false;
      dialogError.focus && dialogError.focus();
    });
  }

  if (confirmButton) confirmButton.addEventListener('click', submitActiveForm);
  if (cancelButton) cancelButton.addEventListener('click', closeApprovalDialog);
  if (dialogBackdrop) {
    dialogBackdrop.addEventListener('click', function (event) {
      if (event.target === dialogBackdrop) closeApprovalDialog();
    });
  }
  document.addEventListener('keydown', function (event) {
    if (!dialogBackdrop || dialogBackdrop.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeApprovalDialog();
      return;
    }
    if (event.key !== 'Tab') return;
    var focusable = getFocusable(dialog);
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
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
})();
