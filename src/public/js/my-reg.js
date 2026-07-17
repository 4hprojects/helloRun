document.addEventListener('DOMContentLoaded', function () {
  const forms = document.querySelectorAll('[data-registration-form]');
  const changedForms = new Set();

  forms.forEach((form) => {
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach((input) => {
      input.addEventListener('change', () => {
        changedForms.add(form);
      });
    });

    form.addEventListener('submit', () => {
      changedForms.delete(form);
      form.setAttribute('aria-busy', 'true');

      const submitButton = form.querySelector('[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting\u2026';
      }

      const status = form.querySelector('.my-reg-form-status');
      if (status) status.textContent = 'Uploading your payment receipt\u2026';
    });
  });

  window.addEventListener('beforeunload', (event) => {
    if (!changedForms.size) return;
    event.preventDefault();
    event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  });

  document.querySelectorAll('[data-open-registration-details]').forEach((control) => {
    control.addEventListener('click', (event) => {
      const targetId = control.getAttribute('data-open-registration-details');
      const disclosure = targetId ? document.getElementById(targetId) : null;
      if (!disclosure) return;

      event.preventDefault();
      disclosure.open = true;
      disclosure.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
      const summary = disclosure.querySelector('summary');
      if (summary) summary.focus({ preventScroll: true });
    });
  });

  const message = document.querySelector('.page-message-success');
  if (message) {
    setTimeout(() => {
      message.style.transition = prefersReducedMotion() ? 'none' : 'opacity 0.3s';
      message.style.opacity = '0';
      setTimeout(() => {
        if (message.parentNode) message.parentNode.removeChild(message);
      }, prefersReducedMotion() ? 0 : 300);
    }, 5000);
  }
});

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
