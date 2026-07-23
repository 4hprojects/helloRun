(() => {
  'use strict';

  const page = document.querySelector('[data-registrant-roster]');
  if (!page) return;
  const eventId = page.dataset.organizerEventId || '';
  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let activeDialog = null;
  let dialogTrigger = null;

  if (window.lucide?.createIcons) window.lucide.createIcons();
  page.classList.add('is-enhanced');

  document.querySelectorAll('[data-registrant-record]').forEach((record) => {
    const button = record.querySelector('[data-toggle-registrant-details]');
    const panel = button ? document.getElementById(button.getAttribute('aria-controls')) : null;
    if (!button || !panel) return;
    panel.hidden = true;
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      button.setAttribute('aria-label', `${open ? 'Hide' : 'Show'} details for ${record.querySelector('.organizer-roster-runner strong')?.textContent || 'runner'}`);
      panel.hidden = !open;
      button.querySelector('svg')?.classList.toggle('is-rotated', open);
    });
  });

  function getFocusable(dialog) {
    return Array.from(dialog.querySelectorAll(focusableSelector)).filter((item) => !item.hidden && item.offsetParent !== null);
  }

  function openDialog(backdrop, trigger) {
    if (!backdrop) return;
    if (activeDialog && activeDialog !== backdrop) closeDialog(activeDialog, false);
    activeDialog = backdrop;
    dialogTrigger = trigger || document.activeElement;
    backdrop.hidden = false;
    document.body.classList.add('organizer-roster-dialog-open');
    const dialog = backdrop.querySelector('[role="dialog"]');
    (getFocusable(dialog)[0] || dialog)?.focus();
  }

  function closeDialog(backdrop = activeDialog, restoreFocus = true) {
    if (!backdrop) return;
    backdrop.hidden = true;
    activeDialog = null;
    document.body.classList.remove('organizer-roster-dialog-open');
    if (restoreFocus && dialogTrigger?.focus) dialogTrigger.focus();
    dialogTrigger = null;
  }

  document.querySelectorAll('[data-dialog-cancel]').forEach((button) => {
    button.addEventListener('click', () => closeDialog(button.closest('[data-message-dialog], [data-reminder-dialog]')));
  });
  document.querySelectorAll('[data-message-dialog], [data-reminder-dialog]').forEach((backdrop) => {
    backdrop.addEventListener('mousedown', (event) => {
      if (event.target === backdrop) closeDialog(backdrop);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (!activeDialog) {
      if (event.key === 'Escape') {
        document.querySelectorAll('[data-export-menu][open]').forEach((menu) => menu.removeAttribute('open'));
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = activeDialog.querySelector('[role="dialog"]');
    const focusable = getFocusable(dialog);
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
  });

  const messageDialog = document.querySelector('[data-message-dialog]');
  const messageForm = messageDialog?.querySelector('[data-message-form]');
  document.querySelectorAll('[data-message-runner]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!messageDialog || !messageForm) return;
      const name = (button.dataset.runnerName || '').trim() || 'Runner';
      messageDialog.querySelector('[data-message-title]').textContent = `Message ${name}`;
      messageForm.action = `/organizer/events/${encodeURIComponent(eventId)}/registrants/${encodeURIComponent(button.dataset.registrationId || '')}/send-message`;
      openDialog(messageDialog, button);
      messageForm.querySelector('textarea')?.focus();
    });
  });

  const reminderDialog = document.querySelector('[data-reminder-dialog]');
  const reminderButton = document.querySelector('[data-open-reminder]');
  reminderButton?.addEventListener('click', () => {
    const count = Number(reminderButton.dataset.unpaidCount || 0);
    const title = reminderButton.dataset.eventTitle || 'this event';
    reminderDialog.querySelector('[data-reminder-description]').textContent = `Send the standard reminder to ${count} runner${count === 1 ? '' : 's'} with unpaid or rejected payment status.`;
    reminderDialog.querySelector('[data-reminder-event]').textContent = title;
    openDialog(reminderDialog, reminderButton);
  });

  document.querySelectorAll('.organizer-roster-dialog form').forEach((form) => {
    form.addEventListener('submit', () => {
      form.querySelectorAll('button[type="submit"]').forEach((button) => {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
      });
    });
  });

  document.addEventListener('click', (event) => {
    document.querySelectorAll('[data-export-menu][open]').forEach((menu) => {
      if (!menu.contains(event.target)) menu.removeAttribute('open');
    });
  });
})();
