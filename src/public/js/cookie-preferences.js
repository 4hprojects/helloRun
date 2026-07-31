'use strict';

(function initCookiePreferences() {
  const dialog = document.getElementById('cookiePreferencesDialog');
  if (!dialog) return;
  const openers = Array.from(document.querySelectorAll('[data-open-cookie-preferences]'));
  const closeButton = dialog.querySelector('[data-close-cookie-preferences]');
  const rejectButton = dialog.querySelector('[data-reject-cookie-preferences]');
  const customForm = dialog.querySelector('[data-cookie-custom-form]');
  const banner = document.querySelector('[data-cookie-banner]');
  const preferenceForms = Array.from(document.querySelectorAll('[data-cookie-preference-form]'));
  let returnFocus = null;
  let isSaving = false;

  const setBusy = (form, busy) => {
    form.setAttribute('aria-busy', busy ? 'true' : 'false');
    form.querySelectorAll('button, input').forEach((control) => { control.disabled = busy; });
  };

  const getStatus = (form) => form.querySelector('[data-cookie-preference-status]');

  const getActionValue = (control) => {
    if (!control) return '';
    return String(control.dataset?.cookieAction || control.value || '').trim();
  };

  const clearHelloRunStorage = () => {
    [window.localStorage, window.sessionStorage].forEach((storage) => {
      if (!storage) return;
      const keys = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key && key.startsWith('helloRun:')) keys.push(key);
      }
      keys.forEach((key) => storage.removeItem(key));
    });
  };

  const clearAnalyticsCookies = () => {
    document.cookie.split(';').map((part) => part.split('=')[0].trim()).filter((name) => name === '_ga' || name.startsWith('_ga_')).forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${window.location.hostname}; SameSite=Lax`;
    });
  };

  const submitPreferences = async (form, action = '') => {
    if (!form || isSaving) return;
    const before = window.HelloRunPrivacy || {};
    const body = new FormData(form);
    const normalizedAction = String(action || '').trim();
    if (normalizedAction) body.set('action', normalizedAction);
    else body.delete('action');
    const status = getStatus(form);
    isSaving = true;
    preferenceForms.forEach((preferenceForm) => setBusy(preferenceForm, true));
    document.querySelectorAll('[data-cookie-preference-status]').forEach((statusElement) => {
      statusElement.textContent = '';
    });
    if (status) status.textContent = 'Saving your choices…';
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json', 'x-csrf-token': String(body.get('_csrf') || '') },
        body: new URLSearchParams(body)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.message || 'Unable to save cookie preferences.');
      if (before.functional && !payload.preferences.functional) clearHelloRunStorage();
      if (before.analytics && !payload.preferences.analytics) clearAnalyticsCookies();
      if (status) status.textContent = 'Preferences saved. Reloading with your choices…';
      window.setTimeout(() => window.location.reload(), 150);
    } catch (error) {
      isSaving = false;
      preferenceForms.forEach((preferenceForm) => setBusy(preferenceForm, false));
      if (status) status.textContent = error.message || 'Unable to save cookie preferences. Please try again.';
    }
  };

  preferenceForms.forEach((form) => {
    form.addEventListener('click', (event) => {
      const actionControl = event.target.closest?.('[data-cookie-action]');
      if (!actionControl || !form.contains(actionControl)) return;
      form.dataset.pendingCookieAction = getActionValue(actionControl);
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const activeControl = document.activeElement?.form === form ? document.activeElement : null;
      const action = getActionValue(event.submitter) ||
        getActionValue(activeControl) ||
        String(form.dataset.pendingCookieAction || '').trim();
      delete form.dataset.pendingCookieAction;
      void submitPreferences(form, action);
    });
  });

  if (banner && document.querySelector('.mobile-bottom-nav')) {
    banner.classList.add('has-mobile-navigation');
  }

  const openDialog = (trigger) => {
    returnFocus = trigger || document.activeElement;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    closeButton?.focus();
  };
  const closeDialog = () => {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
  };

  openers.forEach((opener) => opener.addEventListener('click', (event) => { event.preventDefault(); openDialog(opener); }));
  closeButton?.addEventListener('click', closeDialog);
  rejectButton?.addEventListener('click', () => {
    void submitPreferences(customForm, 'reject_optional');
  });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeDialog(); });
})();
