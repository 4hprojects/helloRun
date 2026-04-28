(function initRunProofModal() {
  const onReady = () => {
    const modal = document.getElementById('runProofModal');
    if (!modal) return;

    const dialog = modal.querySelector('.run-proof-modal-dialog');
    const form = document.getElementById('runProofForm');
    const closeButtons = modal.querySelectorAll('[data-run-proof-close]');
    const openTriggers = document.querySelectorAll('[data-open-run-proof-modal]');

    const titleEl = document.getElementById('runProofModalTitle');
    const descEl = document.getElementById('runProofModalDesc');
    const submitBtn = document.getElementById('runProofSubmitBtn');
    const submitInlineBtn = document.getElementById('runProofSubmitInlineBtn');
    const messageEl = document.getElementById('runProofMessage');

    const modeInput = document.getElementById('runProofMode');
    const selectedIdsInput = document.getElementById('runProofSelectedRegistrationIds');
    const primaryRegistrationInput = document.getElementById('runProofPrimaryRegistrationId');

    const eventsList = document.getElementById('runProofEventsList');
    const eventsErrorEl = document.getElementById('runProofEventsError');
    const eventsHelperEl = document.getElementById('runProofEventsHelper');

    const runDateInput = document.getElementById('runProofDate');
    const distanceInput = document.getElementById('runProofDistanceKm');
    const hoursInput = document.getElementById('runProofHours');
    const minutesInput = document.getElementById('runProofMinutes');
    const secondsInput = document.getElementById('runProofSeconds');
    const elapsedInput = document.getElementById('runProofElapsedTime');
    const locationInput = document.getElementById('runProofLocation');
    const elevationInput = document.getElementById('runProofElevationGain');

    const chipList = document.getElementById('runProofTypeChips');
    const runTypeInput = document.getElementById('runProofRunType');

    const uploadDropzone = document.getElementById('runProofUploadDropzone');
    const fileInput = document.getElementById('runProofImage');
    const uploadInitial = document.getElementById('runProofUploadInitial');
    const uploadPreview = document.getElementById('runProofUploadPreview');
    const previewImage = document.getElementById('runProofPreviewImage');
    const removeImageBtn = document.getElementById('runProofRemoveImageBtn');
    const replaceImageBtn = document.getElementById('runProofReplaceImageBtn');

    const ocrStatusEl = document.getElementById('runProofOcrStatus');
    const ocrResultsEl = document.getElementById('runProofOcrResults');
    const ocrWarningEl = document.getElementById('runProofOcrWarning');
    const ocrDistanceInput = document.getElementById('runProofOcrDistance');
    const ocrTimeInput = document.getElementById('runProofOcrTime');
    const ocrRawTextInput = document.getElementById('runProofOcrRawText');
    const ocrConfidenceInput = document.getElementById('runProofOcrConfidence');
    const ocrDistanceMismatchInput = document.getElementById('runProofOcrDistanceMismatch');
    const ocrTimeMismatchInput = document.getElementById('runProofOcrTimeMismatch');
    const imageHashInput = document.getElementById('runProofImageHash');
    const autoFillBannerEl = document.getElementById('runProofAutoFillBanner');
    const detectedSourceEl = document.getElementById('runProofDetectedSource');
    const analyseBtn = document.getElementById('runProofAnalyseBtn');
    const analyseHint = document.getElementById('runProofAnalyseHint');
    const backBtn = document.getElementById('runProofBackBtn');
    const step1Panel = document.getElementById('runProofStep1');
    const step2Panel = document.getElementById('runProofStep2');
    const stepIndicator = document.getElementById('runProofStepIndicator');

    const closeConfirmOverlay = document.getElementById('runProofCloseConfirm');
    const closeConfirmCancel = document.getElementById('runProofCloseConfirmCancel');
    const closeConfirmOk = document.getElementById('runProofCloseConfirmOk');
    const closeConfirmDialog = closeConfirmOverlay ? closeConfirmOverlay.querySelector('.run-proof-close-confirm-dialog') : null;

    if (
      !dialog || !form || !titleEl || !descEl || !submitBtn || !messageEl || !modeInput || !selectedIdsInput || !primaryRegistrationInput ||
      !eventsList || !eventsErrorEl || !runDateInput || !distanceInput || !hoursInput || !minutesInput || !secondsInput || !elapsedInput ||
      !locationInput || !elevationInput || !chipList || !runTypeInput || !uploadDropzone || !fileInput || !uploadInitial || !uploadPreview ||
      !previewImage || !removeImageBtn || !replaceImageBtn
    ) {
      return;
    }

    const allowedImageMimes = new Set(['image/jpeg', 'image/png']);
    const maxImageBytes = 5 * 1024 * 1024;

    const defaultConfig = {
      mode: String(modal.dataset.defaultMode || 'submit').trim() || 'submit',
      title: String(modal.dataset.defaultTitle || 'Submit Run').trim() || 'Submit Run',
      description: String(modal.dataset.defaultDescription || descEl.textContent || 'Submit your run details and proof image for review.').trim(),
      submitLabel: String(modal.dataset.defaultSubmitLabel || submitBtn.dataset.defaultLabel || 'Submit Run').trim() || 'Submit Run',
      submitEndpoint: String(modal.dataset.defaultEndpoint || '').trim()
    };

    const state = {
      options: [],
      selectedRegistrationIds: new Set(),
      primaryRegistrationId: '',
      lastTrigger: null,
      currentStep: 1,
      isFetchingOptions: false,
      isSubmitting: false,
      previewUrl: '',
      modeConfig: { ...defaultConfig },
      defaultSelectedEventIds: [],
      initialEvents: [],
      currentSurface: '',
      emptyState: null,
      ocrRunning: false,
      ocrResult: null
    };

    const parseInitialPayload = () => {
      const payloadNode = document.getElementById('runProofModalInitialData');
      if (!payloadNode) return;
      try {
        const parsed = JSON.parse(payloadNode.textContent || '{}');
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.initialEvents)) state.initialEvents = parsed.initialEvents;
          if (Array.isArray(parsed.defaultSelectedEventIds)) state.defaultSelectedEventIds = parsed.defaultSelectedEventIds.map((id) => String(id));
          state.modeConfig = {
            mode: String(parsed.mode || defaultConfig.mode),
            title: String(parsed.title || defaultConfig.title),
            description: String(parsed.description || defaultConfig.description),
            submitLabel: String(parsed.submitLabel || defaultConfig.submitLabel),
            submitEndpoint: String(parsed.submitEndpoint || defaultConfig.submitEndpoint)
          };
        }
      } catch (_error) {
        state.modeConfig = { ...defaultConfig };
      }
    };

    const getTodayIsoDate = () => {
      const now = new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
      return local.toISOString().slice(0, 10);
    };

    const setTodayDate = () => {
      runDateInput.value = getTodayIsoDate();
      runDateInput.max = getTodayIsoDate();
    };

    const setMessage = (text, type) => {
      messageEl.textContent = text || '';
      messageEl.classList.remove('is-error', 'is-success');
      if (type === 'error') messageEl.classList.add('is-error');
      if (type === 'success') messageEl.classList.add('is-success');
    };

    const setEventsHelperText = (text) => {
      if (!eventsHelperEl) return;
      eventsHelperEl.textContent = text || 'Select the event result you want to submit. Personal record stays selected by default.';
    };

    const setFieldError = (errorElId, wrapperKey, text) => {
      const errorEl = document.getElementById(errorElId);
      if (errorEl) errorEl.textContent = text || '';

      if (wrapperKey === 'events') {
        eventsList.classList.toggle('is-invalid', Boolean(text));
        return;
      }
      if (wrapperKey === 'runType') {
        chipList.classList.toggle('is-invalid', Boolean(text));
        return;
      }
      if (wrapperKey === 'image') {
        uploadDropzone.classList.toggle('is-invalid', Boolean(text));
        return;
      }

      const wrapper = form.querySelector('[data-field-wrapper="' + wrapperKey + '"]');
      if (wrapper) wrapper.classList.toggle('is-invalid', Boolean(text));
    };

    const clearAllErrors = () => {
      setFieldError('runProofEventsError', 'events', '');
      setFieldError('runProofDateError', 'runDate', '');
      setFieldError('runProofDistanceError', 'distanceKm', '');
      setFieldError('runProofDurationError', 'elapsedTime', '');
      setFieldError('runProofLocationError', 'runLocation', '');
      setFieldError('runProofRunTypeError', 'runType', '');
      setFieldError('runProofImageError', 'image', '');
    };

    const formatEventDate = (value) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleDateString();
    };

    const renderEventOptions = (items, preferredRegistrationId) => {
      const dynamicCards = eventsList.querySelectorAll('[data-run-proof-event-card="1"]');
      dynamicCards.forEach((node) => node.remove());

      state.options = Array.isArray(items) ? items : [];
      state.selectedRegistrationIds.clear();

      if (!state.options.length) {
        setFieldError('runProofEventsError', 'events', 'No eligible event is currently accepting run submissions.');
        primaryRegistrationInput.value = '';
        form.removeAttribute('action');
        setEventsHelperText('No eligible event is currently accepting run submissions.');
        return;
      }

      const personalRecordOnly = state.options.length === 1 && state.options[0] && state.options[0].isPersonalRecord;
      if (personalRecordOnly) {
        const personalRecordId = String(state.options[0].registrationId || '').trim();
        if (personalRecordId) {
          state.selectedRegistrationIds.add(personalRecordId);
          state.primaryRegistrationId = personalRecordId;
          syncSelectedRegistrationFields();
          syncFormAction();
          updateSubmitLabelForSelection();
        }
        setEventsHelperText('You can submit this run as a personal record even without a registered event.');
        validateEvents();
        return;
      }

      const preferredId = String(preferredRegistrationId || '').trim();
      const selectedDefaults = new Set(state.defaultSelectedEventIds);

      state.options.forEach((item, index) => {
        const registrationId = String(item.registrationId || '').trim();
        if (!registrationId) return;

        const checked =
          (preferredId && preferredId === registrationId) ||
          selectedDefaults.has(registrationId) ||
          (!preferredId && !selectedDefaults.size && index === 0);

        if (checked) state.selectedRegistrationIds.add(registrationId);

        const label = document.createElement('label');
        label.className = 'run-proof-event-card';
        label.setAttribute('data-run-proof-event-card', '1');
        label.setAttribute('for', 'runProofEventOption-' + registrationId);

        const start = formatEventDate(item.eventStartAt || item.challengeStart);
        const end = formatEventDate(item.eventEndAt || item.challengeEnd);
        const dateRange = start && end ? start + ' - ' + end : (start || end || 'Schedule TBA');

        label.innerHTML =
          '<span class="run-proof-event-main">' +
            '<input type="checkbox" id="runProofEventOption-' + registrationId + '" data-registration-id="' + registrationId + '" ' + (checked ? 'checked' : '') + '>' +
            '<span>' +
              '<strong>' + escapeHtml(String(item.eventTitle || 'Event')) + '</strong>' +
              '<small>' + escapeHtml(dateRange) + '</small>' +
            '</span>' +
          '</span>' +
          '<span class="run-proof-event-pill">' + escapeHtml(item.canResubmit ? 'Resubmission' : 'New') + '</span>';

        if (checked) label.classList.add('is-selected');
        eventsList.appendChild(label);
      });

      if (state.options.length === 1) {
        const onlyOption = state.options[0];
        setEventsHelperText(
          `${String(onlyOption?.eventTitle || 'Your eligible event')} is ready and preselected for this submission.`
        );
      } else {
        setEventsHelperText('Select the event result you want to submit. Personal record stays selected by default.');
      }

      syncSelectedRegistrationFields();
      syncFormAction();
      updateSubmitLabelForSelection();
      validateEvents();
    };

    const escapeHtml = (value) => {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const syncSelectedRegistrationFields = () => {
      const ids = Array.from(state.selectedRegistrationIds);
      selectedIdsInput.value = ids.join(',');

      if (!ids.length) {
        state.primaryRegistrationId = '';
        primaryRegistrationInput.value = '';
        return;
      }

      if (!ids.includes(state.primaryRegistrationId)) {
        state.primaryRegistrationId = ids[0];
      }

      primaryRegistrationInput.value = state.primaryRegistrationId;
    };

    const getSelectedPrimaryMeta = () => {
      if (!state.primaryRegistrationId) return null;
      return state.options.find((item) => String(item.registrationId || '') === state.primaryRegistrationId) || null;
    };

    const setSubmitBtnLabel = (text) => {
      [submitBtn, submitInlineBtn].forEach((btn) => {
        if (!btn) return;
        const textSpan = btn.querySelector('.run-proof-btn-text');
        if (textSpan) {
          textSpan.textContent = text;
        } else {
          btn.textContent = text;
        }
        btn.setAttribute('aria-label', text);
        if (btn.hasAttribute('data-tooltip')) {
          btn.dataset.tooltip = text;
        }
      });
    };

    const updateSubmitLabelForSelection = () => {
      if (state.isSubmitting) return;
      const selectedPrimary = getSelectedPrimaryMeta();
      const baseLabel = String(state.modeConfig.submitLabel || submitBtn.dataset.defaultLabel || 'Submit Run').trim() || 'Submit Run';
      const nextLabel = selectedPrimary?.canResubmit ? 'Resubmit Run' : baseLabel;
      submitBtn.dataset.defaultLabel = nextLabel;
      if (submitInlineBtn) submitInlineBtn.dataset.defaultLabel = nextLabel;
      setSubmitBtnLabel(state.isFetchingOptions ? 'Loading...' : nextLabel);
    };

    const resolveFormAction = () => {
      const selectedPrimary = getSelectedPrimaryMeta();
      if (!selectedPrimary) return '';

      const forcedEndpoint = String(state.modeConfig.submitEndpoint || '').trim();
      if (forcedEndpoint) {
        return forcedEndpoint.replace('{registrationId}', encodeURIComponent(state.primaryRegistrationId));
      }

      const modePath = selectedPrimary.canResubmit ? 'resubmit-result' : 'submit-result';
      return '/my-registrations/' + encodeURIComponent(state.primaryRegistrationId) + '/' + modePath;
    };

    const syncFormAction = () => {
      const action = resolveFormAction();
      if (!action) {
        form.removeAttribute('action');
        return;
      }
      form.action = action;
    };

    const toggleSubmitState = () => {
      if (state.isSubmitting) {
        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy', 'true');
        submitBtn.classList.add('btn-loading');
        if (submitInlineBtn) {
          submitInlineBtn.disabled = true;
          submitInlineBtn.setAttribute('aria-busy', 'true');
          submitInlineBtn.classList.add('btn-loading');
        }
        setSubmitBtnLabel('Submitting...');
        dialog.classList.add('is-submitting');
        return;
      }

      updateSubmitLabelForSelection();
      submitBtn.disabled = state.isFetchingOptions;
      submitBtn.setAttribute('aria-busy', state.isFetchingOptions ? 'true' : 'false');
      submitBtn.classList.remove('btn-loading');
      if (submitInlineBtn) {
        submitInlineBtn.disabled = state.isFetchingOptions;
        submitInlineBtn.setAttribute('aria-busy', state.isFetchingOptions ? 'true' : 'false');
        submitInlineBtn.classList.remove('btn-loading');
      }
      dialog.classList.remove('is-submitting');
    };

    const clearFilePreview = () => {
      if (state.previewUrl) {
        URL.revokeObjectURL(state.previewUrl);
        state.previewUrl = '';
      }
      previewImage.removeAttribute('src');
      uploadPreview.hidden = true;
      uploadInitial.hidden = false;
    };

    const setFilePreview = (file) => {
      clearFilePreview();
      if (!file) return;
      state.previewUrl = URL.createObjectURL(file);
      previewImage.src = state.previewUrl;
      uploadPreview.hidden = false;
      uploadInitial.hidden = true;
    };

    const setSelectedFileFromDrop = (file) => {
      if (!file) return;
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      setFilePreview(file);
      validateImage();
      computeImageHash(file).then((hash) => {
        if (imageHashInput) imageHashInput.value = hash;
      });
      if (analyseBtn) {
        analyseBtn.disabled = false;
        analyseBtn.textContent = 'Submit Screenshot';
      }
      if (analyseHint) analyseHint.hidden = true;
    };

    const clearOcrState = () => {
      state.ocrRunning = false;
      state.ocrResult = null;
      if (ocrStatusEl) ocrStatusEl.hidden = true;
      if (analyseHint) analyseHint.hidden = true;
      if (ocrResultsEl) ocrResultsEl.hidden = true;
      if (ocrWarningEl) ocrWarningEl.hidden = true;
      if (ocrDistanceInput) ocrDistanceInput.value = '';
      if (ocrTimeInput) ocrTimeInput.value = '';
      if (ocrRawTextInput) ocrRawTextInput.value = '';
      if (ocrConfidenceInput) ocrConfidenceInput.value = '';
      if (ocrDistanceMismatchInput) ocrDistanceMismatchInput.value = '';
      if (ocrTimeMismatchInput) ocrTimeMismatchInput.value = '';
      if (imageHashInput) imageHashInput.value = '';
      if (autoFillBannerEl) autoFillBannerEl.hidden = true;
      if (detectedSourceEl) detectedSourceEl.hidden = true;
    };

    const formatOcrTime = (time) => {
      if (!time) return 'N/A';
      const parts = [
        time.hours > 0 ? time.hours + 'h' : '',
        String(time.minutes).padStart(2, '0') + 'm',
        String(time.seconds).padStart(2, '0') + 's'
      ].filter(Boolean);
      return parts.join(' ');
    };

    const updateOcrComparison = () => {
      if (!state.ocrResult || !window.OcrProofReader) return;

      const formDistKm = Number(distanceInput.value);
      const parts = parseDurationParts();
      const formMs = (parts.h * 3600 + parts.m * 60 + parts.s) * 1000;

      const comparison = window.OcrProofReader.compareWithForm(state.ocrResult, formDistKm, formMs);

      if (ocrDistanceMismatchInput) ocrDistanceMismatchInput.value = comparison.distanceMismatch ? '1' : '0';
      if (ocrTimeMismatchInput) ocrTimeMismatchInput.value = comparison.timeMismatch ? '1' : '0';

      if (ocrWarningEl) {
        const warnings = [];
        if (comparison.distanceMismatch) {
          warnings.push('Distance mismatch: image shows ' + (state.ocrResult.distance ? state.ocrResult.distance.value + ' ' + state.ocrResult.distance.unit : '?') + ' but form says ' + (Number.isFinite(formDistKm) ? formDistKm + ' km' : '?'));
        }
        if (comparison.timeMismatch) {
          warnings.push('Time mismatch: image shows ' + formatOcrTime(state.ocrResult.time) + ' but form says ' + formatOcrTime({ hours: parts.h, minutes: parts.m, seconds: parts.s }));
        }
        if (warnings.length > 0) {
          ocrWarningEl.innerHTML = '<strong>Possible mismatch detected</strong><br>' + warnings.map(escapeHtml).join('<br>');
          ocrWarningEl.hidden = false;
        } else {
          ocrWarningEl.hidden = true;
        }
      }
    };

    const computeImageHash = (file) => {
      if (!file || !window.crypto || !window.crypto.subtle) return Promise.resolve('');
      return file.arrayBuffer().then((buf) => {
        return window.crypto.subtle.digest('SHA-256', buf);
      }).then((hashBuf) => {
        return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
      }).catch(() => '');
    };

    const SOURCE_LABELS = {
      strava: 'Strava',
      nike: 'Nike Run Club',
      garmin: 'Garmin Connect',
      apple: 'Apple Health',
      google: 'Google Fit',
      unknown: ''
    };

    const applyOcrAutoFill = (result) => {
      let filled = false;
      if (result.distance && result.distance.valueKm > 0) {
        distanceInput.value = String(result.distance.valueKm);
        distanceInput.dispatchEvent(new Event('input', { bubbles: true }));
        filled = true;
      }
      if (result.time && result.time.totalMs > 0) {
        hoursInput.value = String(result.time.hours);
        minutesInput.value = String(result.time.minutes).padStart(2, '0');
        secondsInput.value = String(result.time.seconds).padStart(2, '0');
        hoursInput.dispatchEvent(new Event('input', { bubbles: true }));
        filled = true;
      }
      if (result.date) {
        runDateInput.value = result.date;
        filled = true;
      }
      if (filled && autoFillBannerEl) {
        autoFillBannerEl.hidden = false;
      }
    };

    const goToStep = (step) => {
      if (step === 1) {
        if (step1Panel) step1Panel.hidden = false;
        if (step2Panel) step2Panel.hidden = true;
        state.currentStep = 1;
        if (backBtn) {
          const s = backBtn.querySelector('.run-proof-btn-text');
          if (s) s.textContent = 'Close';
          backBtn.setAttribute('aria-label', 'Close');
          backBtn.dataset.tooltip = 'Close';
          const icon = backBtn.querySelector('[data-lucide]');
          if (icon) icon.setAttribute('data-lucide', 'x');
          if (window.lucide) window.lucide.createIcons({ nodes: [backBtn] });
        }
        submitBtn.hidden = true;
        if (stepIndicator) stepIndicator.textContent = 'Step 1 of 2 \u2014 Upload your screenshot';
        const hasFile = Boolean(fileInput.files && fileInput.files[0]);
        if (analyseBtn) {
          analyseBtn.disabled = !hasFile;
          analyseBtn.textContent = 'Submit Screenshot';
        }
        if (analyseHint) analyseHint.hidden = true;
      } else {
        if (step1Panel) step1Panel.hidden = true;
        if (step2Panel) step2Panel.hidden = false;
        state.currentStep = 2;
        if (backBtn) {
          const s = backBtn.querySelector('.run-proof-btn-text');
          if (s) s.textContent = 'Back';
          backBtn.setAttribute('aria-label', 'Back');
          backBtn.dataset.tooltip = 'Back';
          const icon = backBtn.querySelector('[data-lucide]');
          if (icon) icon.setAttribute('data-lucide', 'arrow-left');
          if (window.lucide) window.lucide.createIcons({ nodes: [backBtn] });
        }
        submitBtn.hidden = false;
        if (stepIndicator) stepIndicator.textContent = 'Step 2 of 2 \u2014 Review and submit';
      }
    };

    const runOcrAnalysis = (file) => {
      if (!file || !window.OcrProofReader) return;

      clearOcrState();
      state.ocrRunning = true;

      if (ocrStatusEl) {
        ocrStatusEl.hidden = false;
        ocrStatusEl.textContent = 'Starting...';
      }
      if (analyseHint) analyseHint.hidden = false;

      const ocrTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('OCR timed out')), 30000));

      Promise.race([window.OcrProofReader.extractRunData(file, (status, progress) => {
        if (ocrStatusEl && state.ocrRunning) {
          if (status === 'loading tesseract core') {
            ocrStatusEl.textContent = 'Loading OCR engine...';
          } else if (status === 'initializing tesseract') {
            ocrStatusEl.textContent = 'Initialising OCR engine...';
          } else if (status === 'loading language traineddata') {
            const pct = Math.round((progress || 0) * 100);
            ocrStatusEl.textContent = 'Downloading language data' + (pct > 0 ? '... ' + pct + '%' : '...');
          } else if (status === 'initializing api') {
            ocrStatusEl.textContent = 'Preparing image reader...';
          } else if (status === 'recognizing text') {
            const pct = Math.round((progress || 0) * 100);
            ocrStatusEl.textContent = 'Reading image' + (pct > 0 ? '... ' + pct + '%' : '...');
          }
        }
      }), ocrTimeout]).then((result) => {
        state.ocrRunning = false;
        state.ocrResult = result;

        if (ocrStatusEl) ocrStatusEl.hidden = true;
        if (analyseHint) analyseHint.hidden = true;

        if (ocrDistanceInput) ocrDistanceInput.value = result.distance ? String(result.distance.valueKm) : '';
        if (ocrTimeInput) ocrTimeInput.value = result.time ? String(result.time.totalMs) : '';
        if (ocrRawTextInput) ocrRawTextInput.value = result.rawText || '';
        if (ocrConfidenceInput) ocrConfidenceInput.value = String(result.confidence || 0);

        if (result.confidence > 0 && (result.distance || result.time)) {
          if (ocrResultsEl) {
            let detailsHtml = '<strong>Detected from image:</strong> ';
            const parts = [];
            if (result.distance) parts.push(result.distance.value + ' ' + result.distance.unit + (result.distance.unit === 'mi' ? ' (' + result.distance.valueKm + ' km)' : ''));
            if (result.time) parts.push(formatOcrTime(result.time));
            if (result.pace) parts.push('Pace ' + result.pace.label);
            detailsHtml += parts.map(escapeHtml).join(' &middot; ');
            ocrResultsEl.innerHTML = detailsHtml;
            ocrResultsEl.hidden = false;
          }
          if (detectedSourceEl && result.detectedSource && result.detectedSource !== 'unknown') {
            const sourceLabel = SOURCE_LABELS[result.detectedSource] || result.detectedSource;
            detectedSourceEl.textContent = 'Detected: ' + sourceLabel;
            detectedSourceEl.hidden = false;
          }
          applyOcrAutoFill(result);
          updateOcrComparison();
        } else {
          if (ocrResultsEl) {
            ocrResultsEl.textContent = 'Could not read distance or time from this image.';
            ocrResultsEl.hidden = false;
          }
        }
        goToStep(2);
      }).catch(() => {
        state.ocrRunning = false;
        if (ocrStatusEl) ocrStatusEl.hidden = true;
        if (analyseHint) analyseHint.hidden = true;
        if (ocrResultsEl) {
          ocrResultsEl.textContent = 'Could not read distance or time from this image.';
          ocrResultsEl.hidden = false;
        }
        goToStep(2);
      });
    };

    const validateEvents = () => {
      if (state.selectedRegistrationIds.size > 0) {
        setFieldError('runProofEventsError', 'events', '');
        return true;
      }
      setFieldError('runProofEventsError', 'events', 'Select at least one eligible event.');
      return false;
    };

    const validateDate = () => {
      const raw = String(runDateInput.value || '').trim();
      if (!raw) {
        setFieldError('runProofDateError', 'runDate', 'Date is required.');
        return false;
      }

      const selectedDate = new Date(raw + 'T00:00:00');
      if (Number.isNaN(selectedDate.getTime())) {
        setFieldError('runProofDateError', 'runDate', 'Date is invalid.');
        return false;
      }

      const today = new Date(getTodayIsoDate() + 'T23:59:59');
      if (selectedDate.getTime() > today.getTime()) {
        setFieldError('runProofDateError', 'runDate', 'Date cannot be in the future.');
        return false;
      }

      setFieldError('runProofDateError', 'runDate', '');
      return true;
    };

    const validateDistance = () => {
      const value = Number(distanceInput.value);
      if (!Number.isFinite(value) || value <= 0) {
        setFieldError('runProofDistanceError', 'distanceKm', 'Distance must be a positive number.');
        return false;
      }
      if (value > 500) {
        setFieldError('runProofDistanceError', 'distanceKm', 'Distance must be 500 km or less.');
        return false;
      }
      setFieldError('runProofDistanceError', 'distanceKm', '');
      return true;
    };

    const parseDurationParts = () => {
      const h = Number.parseInt(hoursInput.value || '0', 10);
      const m = Number.parseInt(minutesInput.value || '0', 10);
      const s = Number.parseInt(secondsInput.value || '0', 10);
      return {
        h: Number.isInteger(h) ? h : NaN,
        m: Number.isInteger(m) ? m : NaN,
        s: Number.isInteger(s) ? s : NaN
      };
    };

    const validateDuration = () => {
      const parts = parseDurationParts();
      if ([parts.h, parts.m, parts.s].some((n) => !Number.isInteger(n) || n < 0)) {
        setFieldError('runProofDurationError', 'elapsedTime', 'Enter duration in hours, minutes, and seconds.');
        return false;
      }

      if (parts.m > 59 || parts.s > 59 || parts.h > 99) {
        setFieldError('runProofDurationError', 'elapsedTime', 'Use valid duration values (hh up to 99, mm/ss up to 59).');
        return false;
      }

      const totalSeconds = parts.h * 3600 + parts.m * 60 + parts.s;
      if (totalSeconds <= 0) {
        setFieldError('runProofDurationError', 'elapsedTime', 'Duration must be greater than zero.');
        return false;
      }

      elapsedInput.value = [parts.h, parts.m, parts.s].map((value) => String(value).padStart(2, '0')).join(':');
      setFieldError('runProofDurationError', 'elapsedTime', '');
      return true;
    };

    const validateLocation = () => {
      const value = String(locationInput.value || '').trim();
      if (!value) {
        setFieldError('runProofLocationError', 'runLocation', 'Location is required.');
        return false;
      }
      setFieldError('runProofLocationError', 'runLocation', '');
      return true;
    };

    const validateRunType = () => {
      const value = String(runTypeInput.value || '').trim();
      if (!value) {
        setFieldError('runProofRunTypeError', 'runType', 'Select one run type.');
        return false;
      }
      setFieldError('runProofRunTypeError', 'runType', '');
      return true;
    };

    const validateImage = () => {
      const selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
      if (!selectedFile) {
        setFieldError('runProofImageError', 'image', 'Proof image is required.');
        return false;
      }
      if (!allowedImageMimes.has(selectedFile.type)) {
        setFieldError('runProofImageError', 'image', 'Only JPG and PNG files are allowed.');
        return false;
      }
      if (Number(selectedFile.size || 0) > maxImageBytes) {
        setFieldError('runProofImageError', 'image', 'Image must be 5MB or smaller.');
        return false;
      }
      setFieldError('runProofImageError', 'image', '');
      return true;
    };

    const validateAll = () => {
      const allValid = [
        validateEvents(),
        validateDate(),
        validateDistance(),
        validateDuration(),
        validateLocation(),
        validateRunType(),
        validateImage()
      ].every(Boolean);

      return allValid;
    };

    const applyModeConfig = (incomingConfig) => {
      const config = {
        mode: String(incomingConfig.mode || defaultConfig.mode || 'submit').trim() || 'submit',
        title: String(incomingConfig.title || defaultConfig.title || 'Submit Run').trim() || 'Submit Run',
        description: String(incomingConfig.description || defaultConfig.description || 'Submit your run details and proof image for review.').trim(),
        submitLabel: String(incomingConfig.submitLabel || defaultConfig.submitLabel || 'Submit Run').trim() || 'Submit Run',
        submitEndpoint: String(incomingConfig.submitEndpoint || defaultConfig.submitEndpoint || '').trim()
      };

      state.modeConfig = config;
      modeInput.value = config.mode;
      titleEl.textContent = config.title;
      descEl.textContent = config.description;
      submitBtn.dataset.defaultLabel = config.submitLabel;
      setSubmitBtnLabel(config.submitLabel);
      toggleSubmitState();
    };

    const applyTriggerOverrides = (triggerElement) => {
      const overrides = {
        mode: triggerElement?.getAttribute?.('data-run-proof-mode') || '',
        title: triggerElement?.getAttribute?.('data-run-proof-title') || '',
        description: triggerElement?.getAttribute?.('data-run-proof-description') || '',
        submitLabel: triggerElement?.getAttribute?.('data-run-proof-submit-label') || '',
        submitEndpoint: triggerElement?.getAttribute?.('data-run-proof-submit-endpoint') || ''
      };

      applyModeConfig({
        ...state.modeConfig,
        ...overrides
      });
    };

    const loadEligibleOptions = async (preferredRegistrationId) => {
      state.isFetchingOptions = true;
      toggleSubmitState();
      setMessage('', '');
      try {
        const items = await fetchEligibleOptions();
        renderEventOptions(items, preferredRegistrationId);
        return items;
      } catch (error) {
        renderEventOptions([], '');
        setMessage(String(error?.message || 'Unable to load eligible events.'), 'error');
        return [];
      } finally {
        state.isFetchingOptions = false;
        toggleSubmitState();
      }
    };

    const resetFormState = () => {
      clearAllErrors();
      setMessage('', '');
      form.reset();
      setTodayDate();
      setEventsHelperText('Select the event result you want to submit. Personal record stays selected by default.');
      clearFilePreview();
      clearOcrState();
      runTypeInput.value = '';
      chipList.querySelectorAll('.run-proof-chip').forEach((chip) => {
        chip.classList.remove('is-selected');
        chip.setAttribute('aria-checked', 'false');
      });
      elapsedInput.value = '';
      hoursInput.value = '';
      minutesInput.value = '';
      secondsInput.value = '';
      locationInput.value = '';
      distanceInput.value = '';
      elevationInput.value = '';

      state.isSubmitting = false;
      state.currentSurface = '';
      state.emptyState = null;
      toggleSubmitState();
      goToStep(1);
    };

    const redirectToLogin = () => {
      const loginUrl = String(modal.dataset.loginUrl || '/login').trim() || '/login';
      window.location.href = loginUrl;
    };

    const getTriggerConfig = (triggerElement) => {
      const surface = String(triggerElement?.getAttribute?.('data-run-proof-surface') || '').trim();
      const emptyMessage = String(triggerElement?.getAttribute?.('data-run-proof-empty-message') || '').trim();
      const emptyLinkHref = String(triggerElement?.getAttribute?.('data-run-proof-empty-link-href') || '').trim();
      const emptyLinkLabel = String(triggerElement?.getAttribute?.('data-run-proof-empty-link-label') || '').trim();

      return {
        surface,
        emptyState: emptyMessage
          ? {
              type: 'error',
              text: emptyMessage,
              linkHref: emptyLinkHref,
              linkLabel: emptyLinkLabel
            }
          : null
      };
    };

    const fetchEligibleOptions = async () => {
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

      return Array.isArray(payload.items) ? payload.items : [];
    };

    const showSurfaceMessage = (payload) => {
      if (!payload || !payload.text) return;
      if (state.currentSurface === 'runner-dashboard' && typeof window.showRunnerDashboardFlashMessage === 'function') {
        window.showRunnerDashboardFlashMessage(payload);
        return;
      }
      setMessage(payload.text, payload.type || 'error');
    };

    const parseRedirectMessage = (urlString) => {
      const fallback = { type: 'error', text: 'Unable to save your result right now.' };
      if (!urlString) return fallback;

      let parsedUrl;
      try {
        parsedUrl = new URL(urlString, window.location.origin);
      } catch (_error) {
        return fallback;
      }

      const messageText = String(parsedUrl.searchParams.get('msg') || '').trim();
      return {
        type: String(parsedUrl.searchParams.get('type') || '').trim().toLowerCase() === 'error' ? 'error' : 'success',
        text: messageText || fallback.text,
        pathname: parsedUrl.pathname
      };
    };

    const submitViaFetch = async () => {
      const action = String(form.getAttribute('action') || '').trim();
      if (!action) {
        setMessage('Select at least one eligible event before submitting.', 'error');
        return;
      }

      try {
        const response = await fetch(action, {
          method: 'POST',
          body: new FormData(form),
          credentials: 'same-origin'
        });

        if (response.url && new URL(response.url, window.location.origin).pathname === '/login') {
          redirectToLogin();
          return;
        }

        const resultMessage = parseRedirectMessage(response.url);
        if (resultMessage.type === 'success') {
          closeModal();
          if (state.currentSurface === 'runner-dashboard') {
            if (typeof window.refreshRunnerDashboardResultSubmissions === 'function') {
              await window.refreshRunnerDashboardResultSubmissions();
            }
            showSurfaceMessage({
              type: 'success',
              text: resultMessage.text
            });
            return;
          }

          window.location.assign(response.url || action);
          return;
        }

        setMessage(resultMessage.text, 'error');
      } catch (_error) {
        setMessage('Unable to save your result right now. Please try again.', 'error');
      } finally {
        state.isSubmitting = false;
        toggleSubmitState();
      }
    };

    const openModal = async (triggerElement, overrides) => {
      const isAuthenticated = String(modal.dataset.authenticated || '') === '1';
      if (!isAuthenticated) {
        redirectToLogin();
        return;
      }

      state.lastTrigger = triggerElement || null;
      resetFormState();

      if (overrides && typeof overrides === 'object') {
        applyModeConfig({ ...state.modeConfig, ...overrides });
      } else {
        applyTriggerOverrides(triggerElement);
      }

      const triggerConfig = getTriggerConfig(triggerElement);
      state.currentSurface = triggerConfig.surface;
      state.emptyState = triggerConfig.emptyState;

      const preferredRegistrationId = String(triggerElement?.getAttribute?.('data-registration-id') || '').trim();

      if (state.currentSurface === 'runner-dashboard') {
        state.isFetchingOptions = true;
        toggleSubmitState();
        try {
          const items = await fetchEligibleOptions();
          if (!items.length) {
            showSurfaceMessage(state.emptyState || {
              type: 'error',
              text: 'No eligible event is currently accepting run submissions.',
              linkHref: '/my-registrations',
              linkLabel: 'Review my registrations'
            });
            return;
          }
          renderEventOptions(items, preferredRegistrationId);
        } catch (error) {
          showSurfaceMessage({
            type: 'error',
            text: String(error?.message || 'Unable to load eligible events.')
          });
          return;
        } finally {
          state.isFetchingOptions = false;
          toggleSubmitState();
        }
      } else {
        modal.removeAttribute('hidden');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        if (state.initialEvents.length) {
          renderEventOptions(state.initialEvents, preferredRegistrationId);
        }
        await loadEligibleOptions(preferredRegistrationId);
        dialog.focus();
        return;
      }

      modal.removeAttribute('hidden');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      dialog.focus();
    };

    const closeModal = () => {
      modal.setAttribute('hidden', '');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      clearFilePreview();
      state.isSubmitting = false;
      toggleSubmitState();
      if (state.lastTrigger && typeof state.lastTrigger.focus === 'function') {
        state.lastTrigger.focus();
      }
      state.lastTrigger = null;
    };

    parseInitialPayload();
    applyModeConfig(state.modeConfig);
    setTodayDate();

    closeButtons.forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });

    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !state.isSubmitting) {
        event.preventDefault();
        if (closeConfirmOverlay && !closeConfirmOverlay.hidden) {
          dismissCloseConfirm();
        } else {
          closeModal();
        }
      }
    });

    eventsList.addEventListener('change', (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      if (input.type !== 'checkbox') return;

      const registrationId = String(input.dataset.registrationId || '').trim();
      if (!registrationId) return;

      if (input.checked) {
        state.selectedRegistrationIds.add(registrationId);
      } else {
        state.selectedRegistrationIds.delete(registrationId);
      }

      const card = input.closest('.run-proof-event-card');
      if (card) card.classList.toggle('is-selected', input.checked);

      syncSelectedRegistrationFields();
      syncFormAction();
      updateSubmitLabelForSelection();
      validateEvents();
    });

    [runDateInput, distanceInput, locationInput].forEach((input) => {
      input.addEventListener('input', () => {
        if (input === runDateInput) validateDate();
        if (input === distanceInput) { validateDistance(); updateOcrComparison(); }
        if (input === locationInput) validateLocation();
      });
      input.addEventListener('blur', () => {
        if (input === runDateInput) validateDate();
        if (input === distanceInput) { validateDistance(); updateOcrComparison(); }
        if (input === locationInput) validateLocation();
      });
    });

    const durationInputs = [hoursInput, minutesInput, secondsInput];
    durationInputs.forEach((input, index) => {
      input.addEventListener('input', () => {
        const numeric = String(input.value || '').replace(/[^0-9]/g, '').slice(0, 2);
        input.value = numeric;
        if (numeric.length === 2 && index < durationInputs.length - 1) {
          durationInputs[index + 1].focus();
          durationInputs[index + 1].select();
        }
        validateDuration();
        updateOcrComparison();
      });
      input.addEventListener('blur', () => {
        validateDuration();
        updateOcrComparison();
      });
    });

    chipList.addEventListener('click', (event) => {
      const chip = event.target.closest('.run-proof-chip');
      if (!chip) return;

      const value = String(chip.dataset.runType || '').trim();
      runTypeInput.value = value;

      chipList.querySelectorAll('.run-proof-chip').forEach((node) => {
        const isSelected = node === chip;
        node.classList.toggle('is-selected', isSelected);
        node.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      });
      validateRunType();
    });

    chipList.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const chip = event.target.closest('.run-proof-chip');
      if (!chip) return;
      event.preventDefault();
      chip.click();
    });

    fileInput.addEventListener('change', () => {
      const selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
      setFilePreview(selectedFile);
      validateImage();
      if (selectedFile) {
        computeImageHash(selectedFile).then((hash) => {
          if (imageHashInput) imageHashInput.value = hash;
        });
        if (analyseBtn) {
          analyseBtn.disabled = false;
          analyseBtn.textContent = 'Submit Screenshot';
        }
        if (analyseHint) analyseHint.textContent = 'Click to detect your run data from the image';
      } else {
        clearOcrState();
        if (analyseBtn) analyseBtn.disabled = true;
        if (analyseHint) analyseHint.textContent = 'Upload a screenshot to enable analysis';
      }
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      uploadDropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        uploadDropzone.classList.add('is-dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      uploadDropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        uploadDropzone.classList.remove('is-dragover');
      });
    });

    uploadDropzone.addEventListener('drop', (event) => {
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]
        ? event.dataTransfer.files[0]
        : null;
      if (file) setSelectedFileFromDrop(file);
    });

    uploadDropzone.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      fileInput.click();
    });

    removeImageBtn.addEventListener('click', () => {
      fileInput.value = '';
      clearFilePreview();
      clearOcrState();
      validateImage();
      if (analyseBtn) analyseBtn.disabled = true;
      if (analyseHint) analyseHint.textContent = 'Upload a screenshot to enable analysis';
      if (step2Panel && !step2Panel.hidden) goToStep(1);
    });

    replaceImageBtn.addEventListener('click', () => {
      fileInput.click();
    });

    const triggerAnalyse = () => {
      const selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
      if (!selectedFile) return;
      if (analyseBtn) {
        analyseBtn.disabled = true;
        analyseBtn.textContent = 'Analysing...';
      }
      if (analyseHint) analyseHint.hidden = true;
      computeImageHash(selectedFile).then((hash) => {
        if (imageHashInput) imageHashInput.value = hash;
      });
      runOcrAnalysis(selectedFile);
    };

    if (analyseBtn) {
      analyseBtn.addEventListener('click', triggerAnalyse);
    }

    const openCloseConfirm = () => {
      if (!closeConfirmOverlay) { closeModal(); return; }
      closeConfirmOverlay.removeAttribute('hidden');
      if (closeConfirmDialog) closeConfirmDialog.focus();
    };

    const dismissCloseConfirm = () => {
      if (!closeConfirmOverlay) return;
      closeConfirmOverlay.setAttribute('hidden', '');
    };

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (state.currentStep === 1) {
          openCloseConfirm();
        } else {
          clearOcrState();
          goToStep(1);
        }
      });
    }

    if (closeConfirmCancel) {
      closeConfirmCancel.addEventListener('click', dismissCloseConfirm);
    }

    if (closeConfirmOk) {
      closeConfirmOk.addEventListener('click', () => {
        dismissCloseConfirm();
        closeModal();
      });
    }

    if (closeConfirmOverlay) {
      closeConfirmOverlay.addEventListener('click', (event) => {
        if (event.target === closeConfirmOverlay) dismissCloseConfirm();
      });
    }

    form.addEventListener('submit', (event) => {
      if (state.currentStep === 1) {
        event.preventDefault();
        triggerAnalyse();
        return;
      }

      if (state.isSubmitting) {
        event.preventDefault();
        return;
      }

      syncSelectedRegistrationFields();
      syncFormAction();

      if (!form.getAttribute('action')) {
        event.preventDefault();
        setMessage('Select at least one eligible event before submitting.', 'error');
        validateEvents();
        return;
      }

      const isValid = validateAll();
      if (!isValid) {
        event.preventDefault();
        setMessage('Please fix the highlighted fields before submitting.', 'error');
        return;
      }

      state.isSubmitting = true;
      setMessage('', '');
      toggleSubmitState();

      if (state.currentSurface === 'runner-dashboard') {
        event.preventDefault();
        void submitViaFetch();
      }
    });

    openTriggers.forEach((button) => {
      if (button.dataset.runProofBound === 'true') return;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        openModal(button, null);
      });
      button.dataset.runProofBound = 'true';
    });

    window.openRunProofModal = (overrides) => openModal(null, overrides || null);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
    return;
  }

  onReady();
})();
