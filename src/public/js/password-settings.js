if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePasswordSettings, { once: true });
} else {
  initializePasswordSettings();
}

function initializePasswordSettings() {
  const form = document.querySelector('.password-settings-form');
  if (!form) return;

  setupPasswordStrength(form);
  setupPasswordSettingsModal(form);
}

function setupPasswordStrength(form) {
  const passwordInput = form.querySelector('#newPassword');
  const confirmInput = form.querySelector('#confirmPassword');
  const strengthRoot = form.querySelector('[data-password-strength]');
  const strengthText = form.querySelector('#passwordStrengthText');
  const confirmStatus = form.querySelector('#confirmPasswordStatus');
  const bars = Array.from(form.querySelectorAll('.password-strength-bar'));
  const rules = {
    length: form.querySelector('[data-password-rule="length"]'),
    uppercase: form.querySelector('[data-password-rule="uppercase"]'),
    lowercase: form.querySelector('[data-password-rule="lowercase"]'),
    number: form.querySelector('[data-password-rule="number"]')
  };

  if (!passwordInput || !confirmInput || !strengthRoot || !strengthText || !confirmStatus || !bars.length) {
    return;
  }

  const updateStrength = () => {
    const password = passwordInput.value;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password)
    };

    Object.entries(rules).forEach(([key, node]) => {
      if (!node) return;
      node.classList.toggle('is-met', checks[key]);
    });

    const score = Object.values(checks).filter(Boolean).length;
    let state = 'empty';
    let message = 'Enter a new password.';

    if (password.length) {
      if (score <= 2) {
        state = 'weak';
        message = 'Weak password. Add the missing requirements.';
      } else if (score === 3) {
        state = 'medium';
        message = 'Almost there. Add one more requirement for a stronger password.';
      } else {
        state = 'strong';
        message = 'Strong password.';
      }
    }

    strengthRoot.dataset.strength = state;
    strengthText.textContent = message;
    updateConfirmState();
  };

  const updateConfirmState = () => {
    const confirmPassword = confirmInput.value;
    if (!confirmPassword) {
      confirmStatus.textContent = '';
      confirmStatus.classList.remove('is-match', 'is-mismatch');
      return;
    }

    const matches = confirmPassword === passwordInput.value;
    confirmStatus.textContent = matches ? 'Passwords match.' : 'Passwords do not match yet.';
    confirmStatus.classList.toggle('is-match', matches);
    confirmStatus.classList.toggle('is-mismatch', !matches);
  };

  passwordInput.addEventListener('input', updateStrength);
  confirmInput.addEventListener('input', updateConfirmState);
  form.addEventListener('reset', () => {
    window.setTimeout(updateStrength, 0);
  });

  updateStrength();
}

function setupPasswordSettingsModal(form) {
  const modal = document.getElementById('passwordSettingsModal');
  const confirmModal = document.getElementById('passwordActionConfirmModal');
  const openButtons = document.querySelectorAll('[data-open-password-modal]');
  const closeButtons = modal?.querySelectorAll('[data-close-password-modal]');
  const submitBtn = form.querySelector('.password-settings-submit');
  const confirmTitle = confirmModal?.querySelector('#passwordActionConfirmTitle');
  const confirmDesc = confirmModal?.querySelector('#passwordActionConfirmDesc');
  const dismissActionBtn = confirmModal?.querySelector('[data-dismiss-password-action]');
  const confirmActionBtn = confirmModal?.querySelector('[data-confirm-password-action]');
  if (
    !modal ||
    !confirmModal ||
    !closeButtons?.length ||
    !submitBtn ||
    !confirmTitle ||
    !confirmDesc ||
    !dismissActionBtn ||
    !confirmActionBtn
  ) return;

  let lastTrigger = null;
  let actionTrigger = null;
  let pendingAction = null;
  let isConfirmedSubmit = false;

  const getFocusable = (root) => {
    const dialog = root.querySelector('.modal-dialog');
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    ));
  };

  const openModal = (trigger = null) => {
    lastTrigger = trigger;
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const focusables = getFocusable(modal);
    const firstPasswordInput = form.querySelector('input[type="password"]');
    if (firstPasswordInput) {
      firstPasswordInput.focus();
    } else if (focusables.length) {
      focusables[0].focus();
    }
  };

  const closeModal = () => {
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
    lastTrigger = null;
  };

  const closeConfirmModal = () => {
    confirmModal.setAttribute('hidden', '');
    confirmModal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('aria-hidden', 'false');
    if (actionTrigger && typeof actionTrigger.focus === 'function') {
      actionTrigger.focus();
    }
    actionTrigger = null;
    pendingAction = null;
  };

  const openConfirmModal = (action, trigger = null) => {
    pendingAction = action;
    actionTrigger = trigger;
    const isSave = action === 'save';
    confirmTitle.textContent = isSave ? 'Save password change?' : 'Cancel password change?';
    confirmDesc.textContent = isSave
      ? 'Your account password will be updated.'
      : 'Any password information you entered will be discarded.';
    confirmActionBtn.textContent = isSave ? 'Yes, save' : 'Yes, cancel';
    confirmActionBtn.classList.toggle('btn-primary', isSave);
    confirmActionBtn.classList.toggle('btn-danger', !isSave);
    modal.setAttribute('aria-hidden', 'true');
    confirmModal.removeAttribute('hidden');
    confirmModal.setAttribute('aria-hidden', 'false');
    confirmActionBtn.focus();
  };

  const requestCancel = (trigger = null) => {
    if (confirmModal.hasAttribute('hidden')) {
      openConfirmModal('cancel', trigger);
    }
  };

  openButtons.forEach((button) => {
    button.addEventListener('click', () => openModal(button));
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', () => requestCancel(button));
  });

  form.addEventListener('submit', (event) => {
    if (!isConfirmedSubmit) {
      event.preventDefault();
      openConfirmModal('save', submitBtn);
      return;
    }
    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) requestCancel();
  });

  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      requestCancel();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusables = getFocusable(modal);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  dismissActionBtn.addEventListener('click', closeConfirmModal);
  confirmActionBtn.addEventListener('click', () => {
    const action = pendingAction;
    closeConfirmModal();
    if (action === 'cancel') {
      form.reset();
      closeModal();
      return;
    }
    if (action === 'save') {
      isConfirmedSubmit = true;
      form.requestSubmit();
    }
  });

  confirmModal.addEventListener('click', (event) => {
    if (event.target === confirmModal) closeConfirmModal();
  });

  confirmModal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeConfirmModal();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusables = getFocusable(confirmModal);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  if (modal.dataset.autoOpen === 'true') {
    openModal();
  }
}
