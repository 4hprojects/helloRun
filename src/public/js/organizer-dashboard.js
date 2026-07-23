(function () {
  'use strict';

  function renderIcons(root) {
    if (!window.lucide) return;
    try {
      window.lucide.createIcons(root ? { root } : undefined);
    } catch (_error) {
      // Icons are decorative; the labelled controls remain usable.
    }
  }

  renderIcons();

  const modal = document.getElementById('pendingCreateEventModal');
  if (!modal) return;

  const dialog = modal.querySelector('.pce-modal-card');
  const triggers = Array.from(document.querySelectorAll('[data-pending-create-event-trigger]'));
  const closeButton = document.getElementById('pceModalClose');
  const cancelButtons = Array.from(modal.querySelectorAll('[data-pce-cancel]'));
  const form = document.getElementById('pceAckForm');
  const checkbox = document.getElementById('pceAgreeCheckbox');
  const signature = document.getElementById('pceSignatureName');
  const confirmButton = document.getElementById('pceModalConfirmBtn');
  const validationMessage = document.getElementById('pceValidationMsg');
  const accountName = normalizeName(modal.dataset.accountName || '');
  let returnFocus = null;
  let submitting = false;

  function normalizeName(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function focusableElements() {
    return Array.from(modal.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => !element.hidden && element.getClientRects().length > 0);
  }

  function signatureMatches() {
    return Boolean(signature && normalizeName(signature.value).length >= 3 && normalizeName(signature.value) === accountName);
  }

  function updateConfirmationState() {
    const typed = Boolean(signature && signature.value.trim());
    const matches = signatureMatches();
    if (signature) {
      signature.classList.toggle('pce-sig-ok', matches);
      signature.classList.toggle('pce-sig-error', typed && !matches);
      signature.setAttribute('aria-invalid', String(typed && !matches));
    }
    if (confirmButton && !submitting) confirmButton.disabled = !(checkbox && checkbox.checked && matches);
  }

  function openModal(trigger) {
    returnFocus = trigger || document.activeElement;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    renderIcons(modal);
    window.requestAnimationFrame(() => (closeButton || dialog)?.focus());
  }

  function closeModal() {
    if (submitting) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (validationMessage) validationMessage.hidden = true;
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
    returnFocus = null;
  }

  triggers.forEach((trigger) => trigger.addEventListener('click', () => openModal(trigger)));
  if (closeButton) closeButton.addEventListener('click', closeModal);
  cancelButtons.forEach((button) => button.addEventListener('click', closeModal));
  if (checkbox) checkbox.addEventListener('change', updateConfirmationState);
  if (signature) signature.addEventListener('input', updateConfirmationState);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = focusableElements();
    if (!focusable.length) {
      event.preventDefault();
      dialog?.focus();
      return;
    }
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

  if (form) {
    form.addEventListener('submit', (event) => {
      const accepted = Boolean(checkbox && checkbox.checked);
      const matches = signatureMatches();
      if (!accepted || !matches) {
        event.preventDefault();
        if (validationMessage) {
          validationMessage.textContent = !accepted
            ? 'Please accept the event-creation terms to continue.'
            : 'Your signature must exactly match the name on your account.';
          validationMessage.hidden = false;
        }
        (accepted ? signature : checkbox)?.focus();
        updateConfirmationState();
        return;
      }
      if (submitting) {
        event.preventDefault();
        return;
      }
      submitting = true;
      if (confirmButton) {
        confirmButton.disabled = true;
        confirmButton.setAttribute('aria-busy', 'true');
        confirmButton.textContent = 'Processing…';
      }
    });
  }

  updateConfirmationState();
})();
