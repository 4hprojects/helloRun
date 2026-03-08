document.addEventListener('DOMContentLoaded', function () {
  const forms = document.querySelectorAll('.inline-form');
  forms.forEach((form) => {
    let formChanged = false;
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach((input) => {
      input.addEventListener('change', () => {
        formChanged = true;
      });
    });

    form.addEventListener('submit', () => {
      formChanged = false;
    });

    window.addEventListener('beforeunload', (event) => {
      if (!formChanged) return;
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    });
  });

  const message = document.querySelector('.page-message-success');
  if (message) {
    setTimeout(() => {
      message.style.transition = 'opacity 0.3s';
      message.style.opacity = '0';
      setTimeout(() => {
        if (message.parentNode) message.parentNode.removeChild(message);
      }, 300);
    }, 4000);
  }
});

