(function adminRunningGroupsPage() {
  'use strict';
  if (window.lucide) window.lucide.createIcons();
  const modal = document.querySelector('[data-admin-group-modal]');
  if (!modal) return;
  const dialog = modal.querySelector('[role="dialog"]');
  const title = modal.querySelector('[data-admin-group-modal-title]');
  const copy = modal.querySelector('[data-admin-group-modal-copy]');
  const cancel = modal.querySelector('[data-admin-group-modal-cancel]');
  const confirm = modal.querySelector('[data-admin-group-modal-confirm]');
  let activeForm = null;
  let trigger = null;
  let submitting = false;

  document.querySelectorAll('form[data-admin-group-confirm]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (submitting) return;
      event.preventDefault();
      if (!form.reportValidity()) return;
      activeForm = form;
      trigger = event.submitter || form.querySelector('[type="submit"]');
      title.textContent = form.dataset.confirmTitle || 'Confirm action';
      copy.textContent = form.dataset.confirmCopy || 'Review this action before continuing.';
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('admin-group-modal-open');
      dialog.focus();
    });
  });

  function close() {
    if (submitting) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('admin-group-modal-open');
    const previous = trigger;
    activeForm = null;
    trigger = null;
    if (previous) previous.focus();
  }
  cancel.addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  document.addEventListener('keydown', (event) => {
    if (modal.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const controls = [cancel, confirm].filter((item) => !item.disabled);
    const first = controls[0]; const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  confirm.addEventListener('click', () => {
    if (!activeForm || submitting) return;
    submitting = true;
    confirm.disabled = true;
    confirm.setAttribute('aria-busy', 'true');
    activeForm.submit();
  });
}());

(function adminRunningGroupsBulkDelete() {
  'use strict';
  const form = document.getElementById('adminRunningGroupsBulkDeleteForm');
  const modal = document.querySelector('[data-admin-group-bulk-modal]');
  if (!form || !modal) return;
  const checkboxes = Array.from(form.querySelectorAll('[data-admin-group-checkbox]'));
  const selectAll = form.querySelector('[data-admin-group-select-all]');
  const trigger = form.querySelector('[data-admin-group-bulk-trigger]');
  const selectedCount = form.querySelector('[data-admin-group-selected-count]');
  const dialog = modal.querySelector('[role="dialog"]');
  const summary = modal.querySelector('[data-admin-group-delete-summary]');
  const names = modal.querySelector('[data-admin-group-delete-names]');
  const reason = modal.querySelector('[data-admin-group-delete-reason]');
  const password = modal.querySelector('[data-admin-group-delete-password]');
  const reasonError = modal.querySelector('[data-admin-group-delete-reason-error]');
  const passwordError = modal.querySelector('[data-admin-group-delete-password-error]');
  const status = modal.querySelector('[data-admin-group-delete-status]');
  const cancel = modal.querySelector('[data-admin-group-delete-cancel]');
  const confirm = modal.querySelector('[data-admin-group-delete-confirm]');
  let submitting = false;

  const selected = () => checkboxes.filter((checkbox) => checkbox.checked);

  function updateSelection() {
    const count = selected().length;
    trigger.disabled = count === 0;
    selectedCount.textContent = `${count} selected`;
    selectAll.checked = checkboxes.length > 0 && count === checkboxes.length;
    selectAll.indeterminate = count > 0 && count < checkboxes.length;
  }

  function setError(node, message) {
    node.textContent = message || '';
    node.hidden = !message;
  }

  function setSubmitting(next) {
    submitting = next;
    dialog.setAttribute('aria-busy', next ? 'true' : 'false');
    reason.disabled = next;
    password.disabled = next;
    cancel.disabled = next;
    confirm.disabled = next;
    confirm.querySelector('span').textContent = next ? 'Deleting…' : 'Delete permanently';
    status.textContent = next ? 'Deleting selected running groups. Keep this page open.' : '';
  }

  function openModal() {
    const items = selected();
    if (!items.length) return;
    summary.textContent = `${items.length} running group${items.length === 1 ? '' : 's'} selected.`;
    names.replaceChildren(...items.slice(0, 10).map((checkbox) => {
      const item = document.createElement('li');
      item.textContent = checkbox.dataset.groupName || 'Running group';
      return item;
    }));
    if (items.length > 10) {
      const remaining = document.createElement('li');
      remaining.textContent = `And ${items.length - 10} more`;
      names.append(remaining);
    }
    setError(reasonError, '');
    setError(passwordError, '');
    status.textContent = '';
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-group-modal-open');
    dialog.focus();
  }

  function closeModal() {
    if (submitting) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('admin-group-modal-open');
    password.value = '';
    trigger.focus();
  }

  selectAll.addEventListener('change', () => {
    checkboxes.forEach((checkbox) => { checkbox.checked = selectAll.checked; });
    updateSelection();
  });
  checkboxes.forEach((checkbox) => checkbox.addEventListener('change', updateSelection));
  trigger.addEventListener('click', openModal);
  cancel.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
    if (event.key !== 'Tab') return;
    const controls = [reason, password, cancel, confirm].filter((control) => !control.disabled && !control.hidden);
    const first = controls[0]; const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  confirm.addEventListener('click', async () => {
    if (submitting) return;
    const cleanReason = reason.value.trim();
    const cleanPassword = password.value;
    setError(reasonError, cleanReason.length < 8 ? 'Enter a moderation reason of at least 8 characters.' : '');
    setError(passwordError, cleanPassword ? '' : 'Enter your current password.');
    if (cleanReason.length < 8) { reason.focus(); return; }
    if (!cleanPassword) { password.focus(); return; }
    const ids = selected().map((checkbox) => checkbox.value);
    if (!ids.length) { closeModal(); updateSelection(); return; }
    setSubmitting(true);
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-CSRF-Token': form.querySelector('[name="_csrf"]').value
        },
        body: JSON.stringify({ groupIds: ids, reason: cleanReason, adminPassword: cleanPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to delete the selected running groups.');
      window.location.reload();
    } catch (error) {
      setSubmitting(false);
      const message = error.message || 'Unable to delete the selected running groups.';
      const passwordFailure = /password|verify your identity/i.test(message);
      setError(passwordError, passwordFailure ? message : '');
      if (!passwordFailure) status.textContent = message;
      password.value = '';
      if (passwordFailure) password.focus();
      else dialog.focus();
    }
  });

  updateSelection();
}());
