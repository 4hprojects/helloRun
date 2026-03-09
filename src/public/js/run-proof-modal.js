(function initRunProofModal() {
  const onReady = () => {
    const modal = document.getElementById('runProofModal');
    if (!modal) return;

    const dialog = modal.querySelector('.run-proof-modal-dialog');
    const form = document.getElementById('runProofForm');
    const closeButtons = modal.querySelectorAll('[data-run-proof-close]');
    const registrationSelect = document.getElementById('runProofRegistrationId');
    const runDateInput = document.getElementById('runProofDate');
    const routeInfo = document.getElementById('runProofRouteInfo');
    const messageEl = document.getElementById('runProofMessage');
    const submitBtn = document.getElementById('runProofSubmitBtn');
    const fileInput = document.getElementById('runProofImage');

    if (!dialog || !form || !registrationSelect || !runDateInput || !routeInfo || !messageEl || !submitBtn || !fileInput) {
      return;
    }

    const allowedImageMimes = new Set(['image/jpeg', 'image/png']);
    const state = {
      options: [],
      lastTrigger: null
    };

    const setTodayDate = () => {
      const now = new Date();
      const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60 * 1000));
      runDateInput.value = local.toISOString().slice(0, 10);
    };

    const setMessage = (text, type) => {
      messageEl.textContent = text || '';
      messageEl.classList.remove('is-error', 'is-success');
      if (type === 'error') messageEl.classList.add('is-error');
      if (type === 'success') messageEl.classList.add('is-success');
    };

    const setLoadingState = (isLoading) => {
      registrationSelect.disabled = isLoading;
      submitBtn.disabled = isLoading;
      submitBtn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
      submitBtn.textContent = isLoading ? 'Loading...' : 'Submit Run Proof';
    };

    const getSelectedOptionMeta = () => {
      const selectedRegistrationId = String(registrationSelect.value || '').trim();
      if (!selectedRegistrationId) return null;
      return state.options.find((item) => String(item.registrationId) === selectedRegistrationId) || null;
    };

    const syncFormAction = () => {
      const selected = getSelectedOptionMeta();
      if (!selected) {
        form.removeAttribute('action');
        routeInfo.textContent = '';
        submitBtn.textContent = 'Submit Run Proof';
        submitBtn.disabled = true;
        return;
      }

      const modePath = selected.canResubmit ? 'resubmit-result' : 'submit-result';
      form.action = `/my-registrations/${encodeURIComponent(selected.registrationId)}/${modePath}`;
      routeInfo.textContent = [
        selected.eventTitle || 'Event',
        selected.raceDistance || '',
        selected.participationMode || ''
      ].filter(Boolean).join(' · ');
      submitBtn.textContent = selected.canResubmit ? 'Resubmit Run Proof' : 'Submit Run Proof';
      submitBtn.disabled = false;
    };

    const populateRegistrationOptions = (items, preferredRegistrationId) => {
      state.options = Array.isArray(items) ? items : [];
      registrationSelect.innerHTML = '';

      if (!state.options.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No eligible events available';
        registrationSelect.appendChild(option);
        submitBtn.disabled = true;
        form.removeAttribute('action');
        routeInfo.textContent = '';
        setMessage('No eligible event is currently accepting run submissions.', 'error');
        return;
      }

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select an eligible event';
      registrationSelect.appendChild(placeholder);

      state.options.forEach((item) => {
        const option = document.createElement('option');
        option.value = String(item.registrationId || '');
        option.textContent = [
          item.eventTitle || 'Event',
          item.raceDistance || '',
          item.participationMode || '',
          item.canResubmit ? 'Resubmission' : 'New Submission'
        ].filter(Boolean).join(' · ');
        registrationSelect.appendChild(option);
      });

      const preselectValue = String(preferredRegistrationId || '').trim();
      if (preselectValue && state.options.some((item) => String(item.registrationId) === preselectValue)) {
        registrationSelect.value = preselectValue;
      } else {
        registrationSelect.value = String(state.options[0].registrationId || '');
      }

      setMessage('', '');
      syncFormAction();
    };

    const loadEligibleOptions = async (preferredRegistrationId) => {
      setLoadingState(true);
      setMessage('', '');
      try {
        const response = await fetch('/runner/submissions/eligible?limit=100', {
          method: 'GET',
          headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
          throw new Error('Unable to load eligible events.');
        }

        const payload = await response.json();
        if (!payload || payload.success !== true) {
          throw new Error(payload?.message || 'Unable to load eligible events.');
        }

        populateRegistrationOptions(payload.items || [], preferredRegistrationId);
      } catch (error) {
        registrationSelect.innerHTML = '<option value="">Unable to load eligible events</option>';
        submitBtn.disabled = true;
        form.removeAttribute('action');
        routeInfo.textContent = '';
        setMessage(String(error?.message || 'Unable to load eligible events.'), 'error');
      } finally {
        setLoadingState(false);
      }
    };

    const redirectToLogin = () => {
      const loginUrl = String(modal.dataset.loginUrl || '/login').trim() || '/login';
      window.location.href = loginUrl;
    };

    const openModal = async (triggerElement) => {
      const isAuthenticated = String(modal.dataset.authenticated || '') === '1';
      if (!isAuthenticated) {
        redirectToLogin();
        return;
      }

      state.lastTrigger = triggerElement || null;
      setTodayDate();
      fileInput.value = '';
      setMessage('', '');
      modal.removeAttribute('hidden');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      const preferredRegistrationId = String(triggerElement?.getAttribute?.('data-registration-id') || '').trim();
      await loadEligibleOptions(preferredRegistrationId);
      registrationSelect.focus();
    };

    const closeModal = () => {
      modal.setAttribute('hidden', '');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (state.lastTrigger && typeof state.lastTrigger.focus === 'function') {
        state.lastTrigger.focus();
      }
      state.lastTrigger = null;
    };

    closeButtons.forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
      }
    });

    registrationSelect.addEventListener('change', syncFormAction);

    form.addEventListener('submit', (event) => {
      if (!form.getAttribute('action')) {
        event.preventDefault();
        setMessage('Select an eligible event before submitting.', 'error');
        return;
      }

      const selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
      if (!selectedFile) {
        event.preventDefault();
        setMessage('Select a proof image before submitting.', 'error');
        return;
      }
      if (!allowedImageMimes.has(selectedFile.type)) {
        event.preventDefault();
        setMessage('Only JPG and PNG image files are allowed.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.classList.add('btn-loading');
      submitBtn.setAttribute('aria-busy', 'true');
    });

    const openTriggers = document.querySelectorAll('[data-open-run-proof-modal]');
    openTriggers.forEach((button) => {
      if (button.dataset.runProofBound === 'true') return;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        openModal(button);
      });
      button.dataset.runProofBound = 'true';
    });

    window.openRunProofModal = () => openModal(null);
    setTodayDate();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
    return;
  }
  onReady();
})();
