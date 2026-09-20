(() => {
  'use strict';

  const page = document.querySelector('.registrant-submissions-page');
  if (!page) return;

  // Without <dialog> support the status buttons stay hidden and each entry's "Open Review" link
  // remains the way to approve or reject.
  if (typeof HTMLDialogElement !== 'function') return;

  page.querySelectorAll('[data-rs-decisions], [data-rs-js-only]').forEach((element) => { element.hidden = false; });

  const getDialog = (id) => {
    const dialog = id ? document.getElementById(id) : null;
    return dialog && typeof dialog.showModal === 'function' ? dialog : null;
  };

  function fillSuggestedMessage(dialog, { onlyIfEmpty }) {
    const select = dialog.querySelector('[data-reject-code]');
    const message = dialog.querySelector('[data-reject-message]');
    if (!select || !message) return;
    const suggestion = select.selectedOptions[0]?.dataset.defaultMessage || '';
    // A message the organizer has edited by hand is never overwritten by choosing another reason.
    const untouched = !message.value.trim() || message.value === message.dataset.suggested;
    if (onlyIfEmpty && !untouched) return;
    message.value = suggestion;
    message.dataset.suggested = suggestion;
  }

  // "Reject approval": the runner sees "<reason>: <note, or the reason's standard guidance>".
  // "Other" has no standard guidance, so it needs a note of its own. The server enforces the same
  // rules; this only gives early feedback and a preview.
  function updateReversalPreview(dialog) {
    const select = dialog?.querySelector('[data-reversal-code]');
    const note = dialog?.querySelector('[data-reversal-note]');
    const preview = dialog?.querySelector('[data-reversal-preview]');
    if (!select || !note || !preview) return;

    const option = select.selectedOptions[0];
    const isOther = select.value === 'other';
    note.required = isOther;
    if (isOther) note.setAttribute('minlength', '10');
    else note.removeAttribute('minlength');

    const text = note.value.trim();
    if (!select.value) {
      preview.textContent = 'Select a reason to preview the message.';
    } else if (isOther && text.length < 10) {
      preview.textContent = 'Add a note of at least 10 characters for the runner.';
    } else {
      const label = option.dataset.label || option.textContent.trim();
      preview.textContent = (label + ': ' + (text || option.dataset.guidance || '')).slice(0, 500);
    }
  }

  page.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open-dialog]');
    if (opener) {
      getDialog(opener.dataset.openDialog)?.showModal();
      return;
    }
    const closer = event.target.closest('[data-close-dialog]');
    if (closer) {
      closer.closest('dialog')?.close();
      return;
    }
    const suggest = event.target.closest('[data-use-suggested]');
    if (suggest) {
      const dialog = suggest.closest('dialog');
      if (dialog) fillSuggestedMessage(dialog, { onlyIfEmpty: false });
    }
  });

  page.addEventListener('change', (event) => {
    const select = event.target.closest('[data-reject-code]');
    if (select) fillSuggestedMessage(select.closest('dialog'), { onlyIfEmpty: true });
    const reversalSelect = event.target.closest('[data-reversal-code]');
    if (reversalSelect) updateReversalPreview(reversalSelect.closest('dialog'));
  });

  page.addEventListener('input', (event) => {
    const note = event.target.closest('[data-reversal-note]');
    if (note) updateReversalPreview(note.closest('dialog'));
  });

  page.querySelectorAll('dialog.rs-dialog').forEach((dialog) => {
    // A click on the backdrop targets the dialog element itself; the form fills the rest.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    dialog.querySelector('form')?.addEventListener('submit', (event) => {
      const form = event.currentTarget;
      // The browser has already enforced required fields by the time this runs. Disabling the
      // submit buttons stops a double click from posting the decision twice.
      window.setTimeout(() => {
        form.querySelectorAll('button[type="submit"]').forEach((button) => {
          button.disabled = true;
          button.setAttribute('aria-disabled', 'true');
        });
      }, 0);
    });
  });
})();
