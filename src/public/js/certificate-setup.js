(function () {
  'use strict';

  if (window.lucide) {
    try { window.lucide.createIcons(); } catch (_error) { /* Text remains usable. */ }
  }

  const editor = document.querySelector('[data-certificate-editor]');
  const assetForm = document.querySelector('[data-certificate-assets-form]');
  const publishTrigger = document.querySelector('[data-open-certificate-publish]');
  const publishDialog = document.getElementById('certificatePublishDialog');
  const unsavedAssetsDialog = document.getElementById('certificateUnsavedAssetsDialog');
  const confirmAssetUpload = document.querySelector('[data-confirm-asset-upload]');
  const pageSize = document.querySelector('[data-certificate-page-size]');
  const customSizeFields = document.querySelector('[data-certificate-custom-size-fields]');
  const orientation = document.querySelector('[data-certificate-orientation]');
  const orientationField = document.querySelector('[data-certificate-orientation-field]');
  const orientationHelp = document.querySelector('[data-certificate-orientation-help]');
  let dirty = false;
  let submitting = false;
  let assetUploadApproved = false;
  let activeDialog = null;
  let activeTrigger = null;

  function syncPageSizeControls() {
    const custom = pageSize?.value === 'CUSTOM';
    if (customSizeFields) customSizeFields.hidden = !custom;
    if (orientation) orientation.disabled = Boolean(custom);
    if (orientationField) orientationField.classList.toggle('is-disabled', Boolean(custom));
    if (orientationHelp) orientationHelp.textContent = custom
      ? 'Custom width and height define the final orientation.'
      : 'Applies to A4 and Letter.';
  }

  syncPageSizeControls();
  pageSize?.addEventListener('change', syncPageSizeControls);

  function dialogPanel(dialog) {
    return dialog?.querySelector('[role="dialog"]') || null;
  }

  function focusable(dialog) {
    const panel = dialogPanel(dialog);
    if (!panel) return [];
    return Array.from(panel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
  }

  function setPageInert(dialog, inert) {
    Array.from(document.body.children).forEach((node) => {
      if (node !== dialog && node.tagName !== 'SCRIPT') node.inert = inert;
    });
  }

  function closeDialog(dialog, restoreFocus = true) {
    if (!dialog || dialog.classList.contains('hidden')) return;
    dialog.classList.add('hidden');
    dialog.setAttribute('aria-hidden', 'true');
    setPageInert(dialog, false);
    document.body.classList.remove('no-scroll');
    const trigger = activeTrigger;
    activeDialog = null;
    activeTrigger = null;
    if (restoreFocus && trigger && document.contains(trigger)) trigger.focus();
  }

  function openDialog(dialog, trigger) {
    if (!dialog) return;
    if (activeDialog && activeDialog !== dialog) closeDialog(activeDialog, false);
    activeDialog = dialog;
    activeTrigger = trigger || document.activeElement;
    dialog.classList.remove('hidden');
    dialog.setAttribute('aria-hidden', 'false');
    setPageInert(dialog, true);
    document.body.classList.add('no-scroll');
    const items = focusable(dialog);
    (items[0] || dialogPanel(dialog) || dialog).focus();
  }

  document.querySelectorAll('.certificate-dialog').forEach((dialog) => {
    dialog.querySelectorAll('[data-close-certificate-dialog]').forEach((button) => {
      button.addEventListener('click', () => closeDialog(dialog));
    });
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog(dialog);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable(dialog);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  });

  editor?.addEventListener('input', () => { dirty = true; });
  editor?.addEventListener('change', () => { dirty = true; });

  publishTrigger?.addEventListener('click', (event) => {
    event.preventDefault();
    openDialog(publishDialog, publishTrigger);
  });

  editor?.addEventListener('submit', (event) => {
    const submitter = event.submitter;
    if (submitter?.matches('[data-preview-certificate]')) return;
    if (submitter?.matches('[data-open-certificate-publish]')) {
      event.preventDefault();
      openDialog(publishDialog, submitter);
      return;
    }
    if (submitting) {
      event.preventDefault();
      return;
    }
    submitting = true;
    dirty = false;
    document.querySelectorAll('[data-save-certificate], [data-confirm-certificate-publish]').forEach((button) => {
      button.setAttribute('aria-disabled', 'true');
      button.classList.add('is-submitting');
    });
  });

  assetForm?.addEventListener('submit', (event) => {
    if (dirty && !assetUploadApproved) {
      event.preventDefault();
      openDialog(unsavedAssetsDialog, event.submitter || assetForm.querySelector('[type="submit"]'));
      return;
    }
    if (submitting) {
      event.preventDefault();
      return;
    }
    submitting = true;
    assetForm.querySelectorAll('[type="submit"]').forEach((button) => {
      button.setAttribute('aria-disabled', 'true');
      button.classList.add('is-submitting');
    });
  });

  confirmAssetUpload?.addEventListener('click', () => {
    assetUploadApproved = true;
    closeDialog(unsavedAssetsDialog, false);
    const submitButton = assetForm?.querySelector('[type="submit"]');
    if (assetForm) assetForm.requestSubmit(submitButton || undefined);
  });

  window.addEventListener('beforeunload', (event) => {
    if (!dirty || submitting) return;
    event.preventDefault();
    event.returnValue = '';
  });
})();
