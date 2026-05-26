(function () {
  const config = window.helloRunAdminEventsList || {};
  const csrfToken = String(config.csrfToken || '');
  const filterForm = document.querySelector('.event-admin-filters');
  const eventSearchSubmitBtn = document.getElementById('eventSearchSubmitBtn');
  const perPageSelect = document.getElementById('perPage');
  const currentParams = new URLSearchParams(window.location.search || '');
  if (perPageSelect && !currentParams.has('perPage')) {
    perPageSelect.value = '25';
  }
  if (filterForm) {
    filterForm.querySelectorAll('select').forEach((selectEl) => {
      selectEl.addEventListener('change', () => {
        filterForm.requestSubmit();
      });
    });
  }
  if (filterForm && eventSearchSubmitBtn) {
    eventSearchSubmitBtn.addEventListener('click', () => {
      filterForm.requestSubmit();
    });
  }

  const selectAll = document.getElementById('adminEventsSelectAll');
  const bulkDeleteBtn = document.getElementById('adminEventsBulkDeleteBtn');
  const selectedCountEl = document.getElementById('adminEventsSelectedCount');
  const checkboxes = Array.from(document.querySelectorAll('[data-event-checkbox]'));
  const modal = document.getElementById('adminEventsBulkDeleteModal');
  const modalDialog = modal ? modal.querySelector('.admin-delete-confirm-dialog') : null;
  const modalDesc = document.getElementById('adminEventsBulkDeleteDesc');
  const reasonInput = document.getElementById('adminEventsBulkDeleteReason');
  const reasonError = document.getElementById('adminEventsBulkDeleteReasonError');
  const pwInput = document.getElementById('adminEventsBulkDeletePassword');
  const pwError = document.getElementById('adminEventsBulkDeletePwError');
  const pwToggle = document.getElementById('adminEventsBulkDeletePwToggle');
  const cancelBtn = document.getElementById('adminEventsBulkDeleteCancelBtn');
  const okBtn = document.getElementById('adminEventsBulkDeleteOkBtn');
  const progress = document.getElementById('adminEventsBulkDeleteProgress');
  const progressStatus = document.getElementById('adminEventsBulkDeleteProgressStatus');
  const progressReason = document.getElementById('adminEventsBulkDeleteProgressReason');
  const progressSteps = Array.from(document.querySelectorAll('#adminEventsBulkDeleteProgressSteps [data-progress-step]'));
  let modalResolve = null;
  let lastTrigger = null;
  let isSubmitting = false;

  function updateProgressStep(activeStep) {
    const activeIndex = progressSteps.findIndex((item) => item.dataset.progressStep === activeStep);
    progressSteps.forEach((step, index) => {
      const isActive = step.dataset.progressStep === activeStep;
      const isComplete = activeIndex >= 0 && index < activeIndex;
      step.classList.toggle('is-active', isActive);
      step.classList.toggle('is-complete', isComplete);
    });
  }

  function setModalPending(pending, state = {}) {
    isSubmitting = pending;
    if (modalDialog) {
      modalDialog.setAttribute('aria-busy', pending ? 'true' : 'false');
      modalDialog.classList.toggle('is-pending', pending);
    }
    if (reasonInput) reasonInput.disabled = pending;
    if (pwInput) pwInput.disabled = pending;
    if (pwToggle) pwToggle.disabled = pending;
    if (cancelBtn) cancelBtn.disabled = pending;
    if (okBtn) {
      okBtn.disabled = pending;
      okBtn.textContent = pending ? 'Deleting...' : 'Delete';
    }
    if (progressStatus) progressStatus.textContent = state.status || 'Working...';
    if (progressReason) progressReason.textContent = state.reason || 'Preparing your request.';
    updateProgressStep(pending ? (state.step || 'prepare') : '');
    if (progress) progress.hidden = !pending;
  }

  function waitForPaint() {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
    });
  }

  function refreshPasswordToggleIcon(button, input) {
    const icon = button ? button.querySelector('i') : null;
    if (icon) icon.setAttribute('data-lucide', input && input.type === 'text' ? 'eye-off' : 'eye');
    if (button) button.setAttribute('aria-label', input && input.type === 'text' ? 'Hide password' : 'Show password');
    if (window.lucide && button) window.lucide.createIcons({ nodes: [button] });
  }

  function openModal(description, triggerEl, options = {}) {
    if (!modal) return Promise.resolve(null);
    const initialReason = typeof options.reason === 'string' ? options.reason : '';
    const initialPwError = typeof options.passwordError === 'string' ? options.passwordError : '';
    const initialReasonError = typeof options.reasonError === 'string' ? options.reasonError : '';
    setModalPending(false);
    lastTrigger = triggerEl || null;
    if (modalDesc) modalDesc.textContent = description;
    if (reasonInput) reasonInput.value = initialReason;
    if (reasonError) {
      reasonError.textContent = initialReasonError;
      reasonError.hidden = !initialReasonError;
    }
    if (pwInput) {
      pwInput.value = '';
      pwInput.type = 'password';
    }
    if (pwError) {
      pwError.textContent = initialPwError;
      pwError.hidden = !initialPwError;
    }
    refreshPasswordToggleIcon(pwToggle, pwInput);
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    if (modalDialog) modalDialog.focus();
    return new Promise((resolve) => {
      modalResolve = resolve;
    });
  }

  function resolveModal(result) {
    const resolve = modalResolve;
    modalResolve = null;
    if (resolve) resolve(result);
  }

  function closeModal(result) {
    if (!modal || isSubmitting) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    if (pwInput) pwInput.value = '';
    if (reasonInput) reasonInput.value = '';
    resolveModal(result);
    if (lastTrigger) lastTrigger.focus();
    lastTrigger = null;
  }

  if (pwToggle && pwInput) {
    pwToggle.addEventListener('click', () => {
      if (isSubmitting) return;
      pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
      refreshPasswordToggleIcon(pwToggle, pwInput);
    });
  }

  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(null));

  if (okBtn) {
    okBtn.addEventListener('click', () => {
      let valid = true;
      const reason = reasonInput ? reasonInput.value.trim() : '';
      if (reason.length < 8) {
        if (reasonError) {
          reasonError.textContent = 'Reason must be at least 8 characters.';
          reasonError.hidden = false;
        }
        if (reasonInput) reasonInput.focus();
        valid = false;
      } else if (reasonError) {
        reasonError.hidden = true;
      }
      const pw = pwInput ? pwInput.value.trim() : '';
      if (!pw) {
        if (pwError) {
          pwError.textContent = 'Please enter your password.';
          pwError.hidden = false;
        }
        if (valid && pwInput) pwInput.focus();
        valid = false;
      } else if (pwError) {
        pwError.hidden = true;
      }
      if (!valid) return;
      resolveModal({ reason, password: pw });
    });
  }

  if (pwInput) {
    pwInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !isSubmitting) {
        event.preventDefault();
        if (okBtn) okBtn.click();
      }
    });
  }

  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(null);
    });
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal(null);
    });
  }

  function updateBulkState() {
    const enabled = checkboxes.filter((cb) => !cb.disabled);
    const selected = enabled.filter((cb) => cb.checked);
    if (bulkDeleteBtn) bulkDeleteBtn.disabled = selected.length === 0;
    if (selectedCountEl) selectedCountEl.textContent = `${selected.length} selected`;
    if (selectAll) {
      selectAll.checked = enabled.length > 0 && selected.length === enabled.length;
      selectAll.indeterminate = selected.length > 0 && selected.length < enabled.length;
      selectAll.disabled = enabled.length === 0;
    }
  }

  if (selectAll) {
    selectAll.addEventListener('change', () => {
      checkboxes.forEach((cb) => {
        if (!cb.disabled) cb.checked = selectAll.checked;
      });
      updateBulkState();
    });
  }

  checkboxes.forEach((cb) => cb.addEventListener('change', updateBulkState));

  async function fetchBulkDelete(payload) {
    const response = await fetch('/admin/events/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify(payload)
    });
    let data = null;
    let text = '';
    try {
      data = await response.json();
    } catch (_jsonError) {
      try {
        text = await response.text();
      } catch (_textError) {
        text = '';
      }
    }
    if (!response.ok || !data || !data.success) {
      const textMessage = text.includes('Invalid or missing security token')
        ? 'Invalid or expired security token. Please refresh the page and try again.'
        : '';
      throw new Error((data && data.message) || textMessage || `Bulk delete failed (HTTP ${response.status}).`);
    }
    return data;
  }

  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', async () => {
      const selected = checkboxes.filter((cb) => cb.checked && !cb.disabled);
      if (!selected.length) return;
      const desc = `You are about to soft-delete ${selected.length} event${selected.length === 1 ? '' : 's'}. This will mark them as deleted. This action cannot be undone here.`;
      const eventIds = selected.map((cb) => cb.value);
      let nextModalOptions = {};
      while (true) {
        const result = await openModal(desc, bulkDeleteBtn, nextModalOptions);
        if (!result) return;
        bulkDeleteBtn.disabled = true;
        bulkDeleteBtn.textContent = 'Deleting...';
        try {
          setModalPending(true, {
            status: 'Preparing request...',
            reason: 'Locking the form and packaging the selected events for deletion.',
            step: 'prepare'
          });
          await waitForPaint();
          const fetchPromise = fetchBulkDelete({
            eventIds,
            reason: result.reason,
            adminPassword: result.password,
            _csrf: csrfToken
          });
          setModalPending(true, {
            status: 'Verifying access...',
            reason: 'The server is checking your password and security token before allowing deletion.',
            step: 'verify'
          });
          await waitForPaint();
          setModalPending(true, {
            status: `Deleting ${eventIds.length} event${eventIds.length === 1 ? '' : 's'}...`,
            reason: 'The server is soft-deleting the selected events and recording audit entries for each one.',
            step: 'delete'
          });
          await fetchPromise;
          window.location.reload();
          return;
        } catch (err) {
          setModalPending(false);
          bulkDeleteBtn.disabled = false;
          bulkDeleteBtn.textContent = 'Delete Selected';
          updateBulkState();
          nextModalOptions = { reason: result.reason, passwordError: err.message || 'An error occurred.' };
        }
      }
    });
  }

  updateBulkState();
})();
