if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePasswordSettings, { once: true });
} else {
  initializePasswordSettings();
}

function initializePasswordSettings() {
  const form = document.querySelector('.password-settings-form');
  if (!form) return;

  setupPasswordStrength(form);
  setupPasswordChangeConfirmation(form);
  setupPasswordSuccessRedirect();
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

  updateStrength();
}

function setupPasswordChangeConfirmation(form) {
  const modal = document.getElementById('passwordConfirmModal');
  const cancelBtn = modal?.querySelector('[data-cancel-password-change]');
  const confirmBtn = modal?.querySelector('[data-confirm-password-change]');
  const submitBtn = form.querySelector('.password-settings-submit');
  if (!modal || !cancelBtn || !confirmBtn || !submitBtn) return;

  let isConfirmed = false;
  let lastTrigger = null;

  const getFocusable = () => {
    const dialog = modal.querySelector('.modal-dialog');
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    ));
  };

  const openModal = () => {
    lastTrigger = submitBtn;
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const focusables = getFocusable();
    if (focusables.length) focusables[0].focus();
  };

  const closeModal = () => {
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
  };

  form.addEventListener('submit', (event) => {
    if (isConfirmed) return;
    event.preventDefault();
    openModal();
  });

  cancelBtn.addEventListener('click', closeModal);
  confirmBtn.addEventListener('click', () => {
    isConfirmed = true;
    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    closeModal();
    form.requestSubmit();
  });

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
    const focusables = getFocusable();
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
}

function setupPasswordSuccessRedirect() {
  const page = document.querySelector('.dashboard-container[data-password-update-success]');
  const modal = document.getElementById('passwordSuccessModal');
  const countdownNode = modal?.querySelector('[data-password-success-countdown]');
  const redirectLink = modal?.querySelector('[data-password-success-redirect]');
  if (!page || !modal || !countdownNode || !redirectLink) return;
  if (page.dataset.passwordUpdateSuccess !== 'true') return;

  const redirectUrl = page.dataset.passwordUpdateRedirect || redirectLink.getAttribute('href') || '/runner/dashboard';
  let remainingSeconds = Number(countdownNode.textContent) || 5;
  let redirectTimer = null;
  let countdownTimer = null;

  const openModal = () => {
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const dialog = modal.querySelector('.modal-dialog');
    if (dialog) dialog.focus();
  };

  const redirectNow = () => {
    if (countdownTimer) window.clearInterval(countdownTimer);
    if (redirectTimer) window.clearTimeout(redirectTimer);
    window.location.assign(redirectUrl);
  };

  openModal();

  redirectLink.addEventListener('click', (event) => {
    event.preventDefault();
    redirectNow();
  });

  countdownTimer = window.setInterval(() => {
    remainingSeconds -= 1;
    if (remainingSeconds > 0) {
      countdownNode.textContent = String(remainingSeconds);
      return;
    }
    countdownNode.textContent = '0';
    window.clearInterval(countdownTimer);
  }, 1000);

  redirectTimer = window.setTimeout(redirectNow, remainingSeconds * 1000);
}
