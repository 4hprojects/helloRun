// Optional enhancements for My Registrations page
document.addEventListener('DOMContentLoaded', function () {
  // Confirm before leaving if a form has unsaved changes
  const forms = document.querySelectorAll('.inline-form');
  forms.forEach(form => {
    let formChanged = false;
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('change', () => { formChanged = true; });
    });

    form.addEventListener('submit', () => {
      formChanged = false; // reset so the beforeunload doesn't trigger
    });

    window.addEventListener('beforeunload', (e) => {
      if (formChanged) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    });
  });

  // Optional: auto‑hide success messages after a few seconds
  const message = document.querySelector('.page-message-success');
  if (message) {
    setTimeout(() => {
      message.style.transition = 'opacity 0.3s';
      message.style.opacity = '0';
      setTimeout(() => message.remove(), 300);
    }, 4000);
  }
});