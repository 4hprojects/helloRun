(function () {
  'use strict';

  if (window.lucide) {
    try {
      window.lucide.createIcons();
    } catch (_error) {
      // Labels and native controls remain usable without decorative icons.
    }
  }

  const form = document.querySelector('[data-event-filter-form]');
  if (!form || typeof form.requestSubmit !== 'function') return;

  form.querySelectorAll('[data-event-auto-submit]').forEach((control) => {
    control.addEventListener('change', () => form.requestSubmit());
  });
})();
