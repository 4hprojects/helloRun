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
