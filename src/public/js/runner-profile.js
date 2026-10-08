'use strict';

(function () {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  function init() {
    setupProfileEditors();
    setupNotificationPreferences();
    setupLocationForm();
    setupAvatarUpload();
    setupSectionNavigation();
    setupStravaConfirmations();
    setupPrivateStravaActivities();
    setupCorosStravaBridge();
    setupUnlinkConfirmation();
  }

  function setupNotificationPreferences() {
    const form = document.querySelector('[data-notification-preferences]');
    if (!form) return;
    const inputs = Array.from(form.querySelectorAll('input[name="emailEnabled"]'));
    const disclosure = form.closest('[data-preferences-disclosure]');
    const count = disclosure?.querySelector('[data-preference-count]') || form.querySelector('[data-preference-count]');
    const status = form.querySelector('[data-preference-status]');
    const saveButton = form.querySelector('[data-preference-save]');
    const initialState = inputs.map((input) => input.checked);

    const refresh = () => {
      const enabledCount = inputs.filter((input) => input.checked).length;
      const dirty = inputs.some((input, index) => input.checked !== initialState[index]);
      if (count) count.textContent = `${enabledCount} of ${inputs.length} enabled`;
      if (status) status.textContent = dirty ? 'You have unsaved preference changes.' : 'Preferences are saved.';
      if (saveButton) saveButton.disabled = !dirty;
      form.classList.toggle('is-dirty', dirty);
    };

    inputs.forEach((input) => input.addEventListener('change', refresh));
    refresh();
  }

  function setupProfileEditors() {
    const forms = Array.from(document.querySelectorAll('[data-profile-edit-form]'));
    const dirtyForms = new Set();
    forms.forEach((form) => {
      const editor = form.closest('[data-profile-editor]');
      form.addEventListener('input', () => dirtyForms.add(form));
      form.addEventListener('change', () => dirtyForms.add(form));
      form.addEventListener('submit', () => {
        dirtyForms.delete(form);
        const saveButton = form.querySelector('[data-save-btn]');
        if (saveButton) {
          saveButton.disabled = true;
          saveButton.setAttribute('aria-busy', 'true');
          saveButton.textContent = 'Saving…';
        }
      });
      form.querySelector('[data-cancel-profile-edit]')?.addEventListener('click', () => {
        form.reset();
        dirtyForms.delete(form);
        if (editor) editor.open = false;
        editor?.querySelector('summary')?.focus();
      });
    });
    window.addEventListener('beforeunload', (event) => {
      if (!dirtyForms.size) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  function setupLocationForm() {
    const form = document.getElementById('locationForm');
    const country = document.getElementById('profileCountry');
    const timezone = document.getElementById('profileTimezone');
    const source = document.getElementById('profileTimezoneSource');
    const status = document.getElementById('profileLocationStatus');
    if (!form || !country || !timezone || !source || !status) return;
    let detected = '';
    try { detected = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) {}
    const supported = detected && Array.from(timezone.options).some((option) => option.value === detected);
    const savedCountry = form.dataset.savedCountry || '';
    const savedTimezone = form.dataset.savedTimezone || '';
    const suggestedCountry = form.dataset.suggestedCountry || '';
    if (!savedTimezone && supported) {
      timezone.value = detected;
      source.value = 'browser';
    }
    const suggestions = savedCountry || savedTimezone ? ['Your saved location is selected.'] : ['Review the available suggestions before saving.'];
    if (!savedCountry && suggestedCountry) suggestions.push('Country was suggested from your network.');
    if (!savedTimezone && supported) suggestions.push('Timezone was suggested as ' + detected + '.');
    status.textContent = suggestions.join(' ');
    timezone.addEventListener('change', () => { source.value = timezone.value === detected ? 'browser' : 'user'; });
  }

  function setupAvatarUpload() {
    const input = document.getElementById('js-avatar-input');
    const status = document.getElementById('js-avatar-status');
    const wrap = document.getElementById('js-avatar-wrap');
    if (!input || !status || !wrap) return;
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!allowedTypes.has(file.type)) {
        status.textContent = 'Choose a JPG, PNG, or WebP image.';
        input.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        status.textContent = 'Choose an image smaller than 5 MB.';
        input.value = '';
        return;
      }
      const data = new FormData();
      data.append('avatarImageFile', file);
      data.append('_csrf', document.querySelector('[name="_csrf"]')?.value || '');
      input.disabled = true;
      wrap.setAttribute('aria-busy', 'true');
      status.textContent = 'Uploading profile photo…';
      try {
        const response = await fetch('/runner/profile/avatar', { method: 'POST', body: data });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.message || 'Upload failed.');
        let image = document.getElementById('js-avatar-img');
        if (!image) {
          image = document.createElement('img');
          image.id = 'js-avatar-img';
          image.className = 'profile-avatar-img';
          image.alt = '';
          image.addEventListener('error', () => { image.hidden = true; });
          wrap.insertBefore(image, wrap.querySelector('.profile-avatar-upload-btn'));
        }
        image.hidden = false;
        image.src = result.avatarUrl;
        status.textContent = 'Profile photo updated.';
      } catch (error) {
        status.textContent = error.message || 'Unable to upload the photo. Try again.';
      } finally {
        input.disabled = false;
        input.value = '';
        wrap.removeAttribute('aria-busy');
      }
    });
  }

  function setupSectionNavigation() {
    const sections = Array.from(document.querySelectorAll('[data-profile-section][id]'));
    const links = Array.from(document.querySelectorAll('.runner-profile-menu a[href^="#"], .runner-profile-menu-mobile a[href^="#"]'));
    const mobileMenu = document.querySelector('.runner-profile-menu-mobile');
    links.forEach((link) => link.addEventListener('click', () => { if (mobileMenu?.contains(link)) mobileMenu.open = false; }));
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link) => {
        const active = link.getAttribute('href') === '#' + visible.target.id;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { threshold: [0.2, 0.5], rootMargin: '-15% 0px -60% 0px' });
    sections.forEach((section) => observer.observe(section));
  }

  function setupUnlinkConfirmation() {
    const modal = document.getElementById('unlinkGoogleModal');
    const triggers = Array.from(document.querySelectorAll('[data-open-unlink-modal]:not([disabled])'));
    if (!modal || !triggers.length) return;
    const dialog = modal.querySelector('.modal-dialog');
    const cancel = modal.querySelector('[data-cancel-unlink]');
    const confirm = modal.querySelector('[data-confirm-unlink]');
    let activeForm = null;
    let lastTrigger = null;
    const focusables = () => Array.from(dialog.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    const close = () => {
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      lastTrigger?.focus();
      activeForm = null;
    };
    triggers.forEach((trigger) => trigger.addEventListener('click', () => {
      activeForm = trigger.closest('form');
      lastTrigger = trigger;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      cancel?.focus();
    }));
    cancel?.addEventListener('click', close);
    confirm?.addEventListener('click', () => {
      if (!activeForm) return;
      confirm.disabled = true;
      confirm.setAttribute('aria-busy', 'true');
      activeForm.submit();
    });
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    });
  }

  function setupStravaConfirmations() {
    const connectModal = document.getElementById('stravaConnectConfirmModal');
    const connectTriggers = Array.from(document.querySelectorAll('[data-open-strava-connect-confirm]'));
    if (connectModal && connectTriggers.length) {
      const confirm = connectModal.querySelector('[data-confirm-strava-connect]');
      if (confirm) confirm.href = connectTriggers[0].href;
      bindStravaConfirmation({
        modal: connectModal,
        triggers: connectTriggers,
        cancel: connectModal.querySelector('[data-cancel-strava-connect]'),
        confirm
      });
    }

    const disconnectModal = document.getElementById('stravaDisconnectConfirmModal');
    const disconnectTrigger = document.querySelector('[data-open-strava-disconnect-confirm]');
    if (disconnectModal && disconnectTrigger) {
      const form = disconnectTrigger.closest('[data-strava-disconnect-form]');
      const confirm = disconnectModal.querySelector('[data-confirm-strava-disconnect]');
      bindStravaConfirmation({
        modal: disconnectModal,
        triggers: [disconnectTrigger],
        cancel: disconnectModal.querySelector('[data-cancel-strava-disconnect]'),
        confirm,
        onConfirm: () => {
          if (!form || !confirm) return;
          confirm.disabled = true;
          confirm.setAttribute('aria-busy', 'true');
          form.submit();
        }
      });
    }
  }

  function setupPrivateStravaActivities() {
    const triggers = Array.from(document.querySelectorAll('[data-load-private-strava]'));
    const panel = document.querySelector('[data-private-strava-panel]');
    const status = panel?.querySelector('[data-private-strava-status]');
    const list = panel?.querySelector('[data-private-strava-list]');
    if (!triggers.length || !panel || !status || !list) return;

    triggers.forEach((trigger) => trigger.addEventListener('click', async () => {
      trigger.disabled = true;
      if (trigger.hasAttribute('data-close-coros-on-load')) {
        document.dispatchEvent(new CustomEvent('coros-strava-close'));
      }
      panel.hidden = false;
      panel.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      list.replaceChildren();
      status.textContent = 'Loading your recent Strava activities…';
      try {
        const response = await fetch('/api/integrations/strava/activities?per_page=20', {
          headers: { Accept: 'application/json' },
          credentials: 'same-origin'
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success !== true) throw new Error(payload.message || 'Unable to load activities.');
        const activities = Array.isArray(payload.activities) ? payload.activities : [];
        status.textContent = activities.length
          ? 'Private view only. These activities are not saved by HelloRun and cannot be submitted to an event.'
          : 'No recent activities were found.';
        for (const activity of activities) {
          const item = document.createElement('article');
          item.className = 'profile-private-activity';
          const title = document.createElement('strong');
          title.textContent = activity.name || 'Strava activity';
          const meta = document.createElement('p');
          const date = activity.startDateLocal || activity.startDate;
          meta.textContent = [
            activity.sportType || activity.type || 'Activity',
            `${Number(activity.distanceKm || 0).toFixed(2)} km`,
            date ? new Date(date).toLocaleDateString() : ''
          ].filter(Boolean).join(' · ');
          item.append(title, meta);
          list.append(item);
        }
      } catch (error) {
        status.textContent = error.message || 'Unable to load activities.';
      } finally {
        trigger.disabled = false;
      }
    }));
  }

  function setupCorosStravaBridge() {
    const modal = document.getElementById('corosStravaSetupModal');
    const openTriggers = Array.from(document.querySelectorAll('[data-open-coros-strava-wizard]'));
    const card = document.querySelector('[data-coros-strava-card]');
    if (!modal || !openTriggers.length || !card) return;
    const dialog = modal.querySelector('.modal-dialog');
    const closeButton = modal.querySelector('[data-close-coros-strava-wizard]');
    const checkbox = modal.querySelector('[data-coros-strava-confirm-check]');
    const confirmButton = modal.querySelector('[data-confirm-coros-strava]');
    const wizardStatus = modal.querySelector('[data-coros-wizard-status]');
    const cardStatus = card.querySelector('[data-coros-strava-status]');
    const resetButton = card.querySelector('[data-reset-coros-strava]');
    const stateLabel = card.querySelector('[data-coros-strava-state]');
    const summary = card.querySelector('[data-coros-strava-summary]');
    const confirmedCopy = card.querySelector('[data-coros-confirmed-copy]');
    const csrfToken = document.querySelector('[name="_csrf"]')?.value || '';
    let lastTrigger = null;

    const focusables = () => Array.from(dialog.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    const close = () => {
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      lastTrigger?.focus();
    };
    const request = async (url, method, body) => {
      const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: body ? JSON.stringify(body) : undefined
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success !== true) throw new Error(payload.message || 'Unable to update setup status.');
      return payload;
    };
    const renderStatus = (bridge) => {
      const status = bridge?.status || 'not_started';
      card.dataset.bridgeStatus = status;
      if (status === 'user_confirmed') {
        stateLabel.textContent = 'Confirmed by you';
        summary.textContent = 'Native sync confirmed by you';
        resetButton.hidden = false;
        confirmedCopy.hidden = false;
        const confirmedAt = bridge.confirmedAt ? new Date(bridge.confirmedAt) : new Date();
        confirmedCopy.textContent = `Confirmed by you on ${confirmedAt.toLocaleString()}. Connected activity data remains private and cannot be used as event proof.`;
      } else if (status === 'setup_started') {
        stateLabel.textContent = 'In progress';
        summary.textContent = 'Setup started';
        resetButton.hidden = false;
        confirmedCopy.hidden = true;
      } else {
        stateLabel.textContent = 'Optional';
        summary.textContent = 'Not set up';
        resetButton.hidden = true;
        confirmedCopy.hidden = true;
      }
    };

    openTriggers.forEach((trigger) => trigger.addEventListener('click', async () => {
      lastTrigger = trigger;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      closeButton?.focus();
      if (card.dataset.bridgeStatus === 'not_started') {
        try {
          const payload = await request('/api/integrations/coros-strava/setup/start', 'POST');
          renderStatus(payload.bridge);
        } catch (error) {
          if (wizardStatus) wizardStatus.textContent = error.message;
        }
      }
    }));
    closeButton?.addEventListener('click', close);
    document.addEventListener('coros-strava-close', close);
    checkbox?.addEventListener('change', () => {
      if (!confirmButton) return;
      confirmButton.disabled = !checkbox.checked;
    });
    confirmButton?.addEventListener('click', async () => {
      confirmButton.disabled = true;
      confirmButton.setAttribute('aria-busy', 'true');
      if (wizardStatus) wizardStatus.textContent = 'Saving your confirmation…';
      try {
        const payload = await request('/api/integrations/coros-strava/setup/confirm', 'POST', { confirmed: true });
        renderStatus(payload.bridge);
        if (wizardStatus) wizardStatus.textContent = 'Setup confirmed. Only you can see the connected activity view.';
        if (cardStatus) cardStatus.textContent = 'COROS–Strava setup confirmed by you.';
        checkbox.checked = false;
        setTimeout(close, 500);
      } catch (error) {
        if (wizardStatus) wizardStatus.textContent = error.message;
        confirmButton.disabled = !checkbox?.checked;
      } finally {
        confirmButton.removeAttribute('aria-busy');
      }
    });
    resetButton?.addEventListener('click', async () => {
      resetButton.disabled = true;
      if (cardStatus) cardStatus.textContent = 'Removing your HelloRun confirmation…';
      try {
        const payload = await request('/api/integrations/coros-strava/setup', 'DELETE');
        renderStatus(payload.bridge);
        if (cardStatus) cardStatus.textContent = payload.message;
      } catch (error) {
        if (cardStatus) cardStatus.textContent = error.message;
      } finally {
        resetButton.disabled = false;
      }
    });
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    });
  }

  function bindStravaConfirmation({ modal, triggers, cancel, confirm, onConfirm }) {
    const dialog = modal.querySelector('.modal-dialog');
    let lastTrigger = null;
    const focusables = () => Array.from(dialog.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
    const close = () => {
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      lastTrigger?.focus();
    };
    triggers.forEach((trigger) => trigger.addEventListener('click', (event) => {
      event.preventDefault();
      lastTrigger = trigger;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      cancel?.focus();
    }));
    cancel?.addEventListener('click', close);
    if (onConfirm) confirm?.addEventListener('click', onConfirm);
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    });
  }
})();
