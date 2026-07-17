(function () {
  'use strict';

  const dialog = document.querySelector('[data-notification-dialog]');
  const items = Array.from(document.querySelectorAll('[data-notification-item]'));
  if (!dialog || !items.length || typeof dialog.showModal !== 'function') return;

  document.documentElement.classList.add('notifications-enhanced');

  const closeButton = dialog.querySelector('[data-notification-dialog-close]');
  const dialogTitle = dialog.querySelector('[data-notification-dialog-title]');
  const dialogCategory = dialog.querySelector('[data-notification-dialog-category]');
  const dialogMessage = dialog.querySelector('[data-notification-dialog-message]');
  const dialogTime = dialog.querySelector('[data-notification-dialog-time]');
  const dialogIcon = dialog.querySelector('[data-notification-dialog-icon]');
  const dialogDestination = dialog.querySelector('[data-notification-dialog-destination]');
  const dialogStateForm = dialog.querySelector('[data-notification-dialog-state-form]');
  const dialogStateButton = dialog.querySelector('[data-notification-dialog-state-button]');
  const dialogFeedback = dialog.querySelector('[data-notification-dialog-feedback]');
  const liveRegion = document.querySelector('[data-notification-live]');
  let activeSummary = null;

  items.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      item.open = false;
      openNotification(item);
    });
  });

  closeButton?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (activeSummary) activeSummary.focus();
    activeSummary = null;
  });
  dialog.addEventListener('keydown', trapDialogFocus);

  function openNotification(item) {
    const summary = item.querySelector('summary');
    const sourceIcon = item.querySelector('.notification-icon');
    const destination = item.querySelector('[data-notification-destination]');
    const stateForm = item.querySelector('[data-notification-state-form]');
    const time = item.querySelector('.notification-meta');

    activeSummary = summary;
    dialogTitle.textContent = item.querySelector('.notification-title')?.textContent.trim() || 'Notification';
    dialogCategory.textContent = item.querySelector('.notification-category')?.textContent.trim() || 'HelloRun update';
    dialogMessage.textContent = item.querySelector('[data-notification-message]')?.textContent.trim() || '';
    dialogTime.textContent = time?.textContent.replace(/\s+/g, ' ').trim() || '';
    dialogFeedback.textContent = '';
    dialogFeedback.classList.remove('is-error');

    if (sourceIcon && dialogIcon) {
      dialogIcon.className = sourceIcon.className;
      dialogIcon.innerHTML = sourceIcon.innerHTML;
    }

    if (destination) {
      dialogDestination.href = destination.getAttribute('href');
      dialogDestination.textContent = destination.textContent.trim();
      dialogDestination.hidden = false;
      dialog.querySelector('.notification-dialog-actions')?.classList.remove('has-single-action');
    } else {
      dialogDestination.hidden = true;
      dialogDestination.removeAttribute('href');
      dialog.querySelector('.notification-dialog-actions')?.classList.add('has-single-action');
    }

    if (stateForm) {
      dialogStateForm.action = stateForm.action;
      dialogStateButton.textContent = stateForm.querySelector('button')?.textContent.trim() || 'Archive';
      dialogStateForm.hidden = false;
    } else {
      dialogStateForm.hidden = true;
    }

    dialog.showModal();
    closeButton?.focus();
    if (window.lucide) window.lucide.createIcons();

    const readForm = item.querySelector('[data-notification-read-form]');
    if (readForm && item.classList.contains('is-unread')) markRead(item, readForm);
  }

  async function markRead(item, form) {
    setFeedback('Marking this notification as read…');
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
        credentials: 'same-origin'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success !== true) throw new Error(payload.message || 'Unable to mark this notification as read.');

      item.classList.remove('is-unread');
      item.classList.add('is-read');
      item.querySelector('.notification-unread-dot')?.remove();
      form.remove();
      updateUnreadCounts();
      setFeedback('Marked as read.');
      announce('Notification marked as read.');
    } catch (error) {
      setFeedback(error.message || 'Unable to mark this notification as read.', true);
      announce('Unable to mark the notification as read. You can try again from the notification details.');
    }
  }

  function updateUnreadCounts() {
    document.querySelectorAll('[data-notification-unread-count]').forEach((node) => {
      const count = Number.parseInt(node.textContent, 10);
      node.textContent = String(Math.max(0, Number.isFinite(count) ? count - 1 : 0));
    });
  }

  function setFeedback(message, isError) {
    dialogFeedback.textContent = message;
    dialogFeedback.classList.toggle('is-error', Boolean(isError));
  }

  function announce(message) {
    if (!liveRegion) return;
    liveRegion.textContent = '';
    window.setTimeout(() => { liveRegion.textContent = message; }, 20);
  }

  function trapDialogFocus(event) {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialog.querySelectorAll('a[href]:not([hidden]), button:not([disabled]):not([hidden]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}());
