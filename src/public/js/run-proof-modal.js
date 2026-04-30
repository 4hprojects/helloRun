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
    const stepsInput = document.getElementById('runProofSteps');

    const chipList = document.getElementById('runProofTypeChips');
    const runTypeInput = document.getElementById('runProofRunType');

    const uploadDropzone = document.getElementById('runProofUploadDropzone');
    const fileInput = document.getElementById('runProofImage');
    const uploadInitial = document.getElementById('runProofUploadInitial');
    const uploadPreview = document.getElementById('runProofUploadPreview');
    const uploadActions = document.getElementById('runProofUploadActions');
    const previewImage = document.getElementById('runProofPreviewImage');
    const removeImageBtn = document.getElementById('runProofRemoveImageBtn');
    const replaceImageBtn = document.getElementById('runProofReplaceImageBtn');

    const ocrStatusEl = document.getElementById('runProofOcrStatus');
    const ocrResultsEl = document.getElementById('runProofOcrResults');
    const ocrSummaryEl = document.getElementById('runProofOcrSummary');
    const ocrWarningEl = document.getElementById('runProofOcrWarning');
    const ocrDistanceInput = document.getElementById('runProofOcrDistance');
    const ocrTimeInput = document.getElementById('runProofOcrTime');
    const ocrElevationInput = document.getElementById('runProofOcrElevation');
    const ocrStepsInput = document.getElementById('runProofOcrSteps');
    const ocrDateInput = document.getElementById('runProofOcrDate');
    const ocrLocationInput = document.getElementById('runProofOcrLocation');
    const ocrRunTypeExtractedInput = document.getElementById('runProofOcrRunType');
    const ocrRawTextInput = document.getElementById('runProofOcrRawText');
    const ocrConfidenceInput = document.getElementById('runProofOcrConfidence');
    const ocrDistanceMismatchInput = document.getElementById('runProofOcrDistanceMismatch');
    const ocrTimeMismatchInput = document.getElementById('runProofOcrTimeMismatch');
    const ocrElevationMismatchInput = document.getElementById('runProofOcrElevationMismatch');
    const ocrStepsMismatchInput = document.getElementById('runProofOcrStepsMismatch');
    const ocrDateMismatchInput = document.getElementById('runProofOcrDateMismatch');
    const ocrLocationMismatchInput = document.getElementById('runProofOcrLocationMismatch');
    const ocrRunTypeMismatchInput = document.getElementById('runProofOcrRunTypeMismatch');
    const ocrDetectedSourceInput = document.getElementById('runProofOcrDetectedSource');
    const ocrExtractedNameInput = document.getElementById('runProofOcrExtractedName');
    const ocrNameMatchStatusInput = document.getElementById('runProofOcrNameMatchStatus');
    const imageHashInput = document.getElementById('runProofImageHash');
    const autoFillBannerEl = document.getElementById('runProofAutoFillBanner');
    const detectedSourceEl = document.getElementById('runProofDetectedSource');
    const nameMatchEl = document.getElementById('runProofNameMatch');
    const nameMismatchDialog = document.getElementById('runProofNameMismatchDialog');
    const nameMismatchDetail = document.getElementById('runProofNameMismatchDetail');
    const nameMismatchBack = document.getElementById('runProofNameMismatchBack');
    const nameMismatchContinue = document.getElementById('runProofNameMismatchContinue');
    const nameMismatchInput = document.getElementById('runProofNameMismatch');
    const runnerName = (modal.dataset.runnerName || '').trim().toLowerCase();
    const runnerNameDisplay = String(modal.dataset.runnerName || '').trim() || 'unknown';
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
    const closeConfirmTitle = document.getElementById('runProofCloseConfirmTitle');
    const closeConfirmDesc = document.getElementById('runProofCloseConfirmDesc');

    const submitReviewOverlay = document.getElementById('runProofSubmitReview');
    const submitReviewRows = document.getElementById('runProofSubmitReviewRows');
    const submitReviewEdit = document.getElementById('runProofSubmitReviewEdit');
    const submitReviewConfirm = document.getElementById('runProofSubmitReviewConfirm');

    const postSubmitOverlay = document.getElementById('runProofPostSubmit');
    const postSubmitAnother = document.getElementById('runProofPostSubmitAnother');
    const postSubmitView = document.getElementById('runProofPostSubmitView');
    const postSubmitTitle = document.getElementById('runProofPostSubmitTitle');
    const postSubmitDesc = document.getElementById('runProofPostSubmitDesc');

    if (
      !dialog || !form || !titleEl || !descEl || !submitBtn || !messageEl || !modeInput || !selectedIdsInput || !primaryRegistrationInput ||
      !eventsList || !eventsErrorEl || !runDateInput || !distanceInput || !hoursInput || !minutesInput || !secondsInput || !elapsedInput ||
      !locationInput || !elevationInput || !chipList || !runTypeInput || !uploadDropzone || !fileInput || !uploadInitial || !uploadPreview ||
      !uploadActions || !previewImage || !removeImageBtn || !replaceImageBtn
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
      ocrResult: null,
      ocrRunId: 0,
      confirmAction: 'close',
      allowPageExit: false,
      pendingUploadFile: null,
      allowFileDialogOnce: false,
      pendingNameMismatchAction: ''
    };

    const STEP_ONE_ANALYSE_LABEL = 'Submit Screenshot';
    const STEP_ONE_CONTINUE_LABEL = 'Continue to Details';
    const STEP_ONE_ANALYSING_LABEL = 'Analysing...';
    const OCR_ANALYSIS_TIMEOUT_MS = 75000;
    const OCR_WAITING_STATUS = 'Waiting for file upload.';
    const OCR_READY_STATUS = 'Screenshot ready. Submit it to read distance and time.';
    const OCR_ESTIMATE_LABEL = 'Estimated analysis time: 10-30 seconds.';
    const OCR_ANALYSING_HINT = 'Reading your screenshot. Please wait while we extract the run details.';

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

    const setStepOneActionLabel = (text) => {
      const label = String(text || STEP_ONE_ANALYSE_LABEL).trim() || STEP_ONE_ANALYSE_LABEL;
      if (analyseBtn) analyseBtn.textContent = label;
      submitBtn.textContent = label;
      submitBtn.setAttribute('aria-label', label);
      if (submitBtn.hasAttribute('data-tooltip')) submitBtn.dataset.tooltip = label;
    };

    const setOcrStatus = (text, options = {}) => {
      if (!ocrStatusEl) return;
      const message = String(text || OCR_WAITING_STATUS).trim() || OCR_WAITING_STATUS;
      ocrStatusEl.textContent = options.withEstimate ? message + ' ' + OCR_ESTIMATE_LABEL : message;
      ocrStatusEl.hidden = Boolean(options.hidden);
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

    const renderEventOptionsLoading = () => {
      const dynamicCards = eventsList.querySelectorAll('[data-run-proof-event-card="1"]');
      dynamicCards.forEach((node) => node.remove());
      state.options = [];
      state.selectedRegistrationIds.clear();
      syncSelectedRegistrationFields();
      form.removeAttribute('action');
      setFieldError('runProofEventsError', 'events', '');
      setEventsHelperText('Loading eligible events...');

      const card = document.createElement('div');
      card.className = 'run-proof-event-card run-proof-event-loading';
      card.setAttribute('data-run-proof-event-card', '1');
      card.setAttribute('role', 'status');
      card.textContent = 'Checking eligible events...';
      eventsList.appendChild(card);
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
      const selectedCount = state.selectedRegistrationIds.size;
      let nextLabel = selectedPrimary?.canResubmit ? 'Resubmit Run' : baseLabel;
      if (selectedCount > 1) {
        nextLabel = 'Submit ' + selectedCount + ' Entries';
      }
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

      submitBtn.classList.remove('btn-loading');
      if (submitInlineBtn) {
        submitInlineBtn.disabled = state.isFetchingOptions;
        submitInlineBtn.setAttribute('aria-busy', state.isFetchingOptions ? 'true' : 'false');
        submitInlineBtn.classList.remove('btn-loading');
      }
      dialog.classList.remove('is-submitting');

      if (state.currentStep === 1) {
        // On step 1 the header button is gated by file selection, not options loading
        const hasFile = Boolean(fileInput.files && fileInput.files[0]);
        submitBtn.disabled = !hasFile || state.ocrRunning;
        submitBtn.setAttribute('aria-busy', state.ocrRunning ? 'true' : 'false');
      } else {
        updateSubmitLabelForSelection();
        submitBtn.disabled = state.isFetchingOptions;
        submitBtn.setAttribute('aria-busy', state.isFetchingOptions ? 'true' : 'false');
      }
    };

    const clearFilePreview = () => {
      if (state.previewUrl) {
        URL.revokeObjectURL(state.previewUrl);
        state.previewUrl = '';
      }
      previewImage.removeAttribute('src');
      uploadPreview.hidden = true;
      uploadActions.hidden = true;
      uploadInitial.hidden = false;
    };

    const setFilePreview = (file) => {
      clearFilePreview();
      if (!file) return;
      state.previewUrl = URL.createObjectURL(file);
      previewImage.src = state.previewUrl;
      uploadPreview.hidden = false;
      uploadActions.hidden = false;
      uploadInitial.hidden = true;
    };

    const setSelectedFileFromDrop = (file) => {
      if (!file) return;
      clearOcrState();
      clearRunDetailFields();
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
      }
      submitBtn.disabled = false;
      setStepOneActionLabel(STEP_ONE_ANALYSE_LABEL);
      setOcrStatus(OCR_READY_STATUS + ' ' + OCR_ESTIMATE_LABEL);
      if (analyseHint) analyseHint.hidden = true;
    };

    const hideNameMismatchState = () => {
      if (nameMismatchDialog) nameMismatchDialog.hidden = true;
      if (nameMismatchDetail) nameMismatchDetail.textContent = '';
      if (nameMismatchInput) nameMismatchInput.value = '0';
      state.pendingNameMismatchAction = '';
      const confirmOverlay = document.getElementById('runProofNameMismatchConfirm');
      if (confirmOverlay) confirmOverlay.hidden = true;
    };

    const clearOcrState = () => {
      state.ocrRunId += 1;
      state.ocrRunning = false;
      state.ocrResult = null;
      setOcrStatus(OCR_WAITING_STATUS);
      if (analyseHint) analyseHint.hidden = true;
      if (ocrResultsEl) ocrResultsEl.hidden = true;
      if (ocrWarningEl) ocrWarningEl.hidden = true;
      if (ocrDistanceInput) ocrDistanceInput.value = '';
      if (ocrTimeInput) ocrTimeInput.value = '';
      if (ocrElevationInput) ocrElevationInput.value = '';
      if (ocrStepsInput) ocrStepsInput.value = '';
      if (ocrDateInput) ocrDateInput.value = '';
      if (ocrLocationInput) ocrLocationInput.value = '';
      if (ocrRunTypeExtractedInput) ocrRunTypeExtractedInput.value = '';
      if (ocrRawTextInput) ocrRawTextInput.value = '';
      if (ocrConfidenceInput) ocrConfidenceInput.value = '';
      if (ocrDistanceMismatchInput) ocrDistanceMismatchInput.value = '';
      if (ocrTimeMismatchInput) ocrTimeMismatchInput.value = '';
      if (ocrElevationMismatchInput) ocrElevationMismatchInput.value = '';
      if (ocrStepsMismatchInput) ocrStepsMismatchInput.value = '';
      if (ocrDateMismatchInput) ocrDateMismatchInput.value = '';
      if (ocrLocationMismatchInput) ocrLocationMismatchInput.value = '';
      if (ocrRunTypeMismatchInput) ocrRunTypeMismatchInput.value = '';
      if (ocrDetectedSourceInput) ocrDetectedSourceInput.value = '';
      if (ocrExtractedNameInput) ocrExtractedNameInput.value = '';
      if (ocrNameMatchStatusInput) ocrNameMatchStatusInput.value = 'not_checked';
      if (imageHashInput) imageHashInput.value = '';
      if (autoFillBannerEl) autoFillBannerEl.hidden = true;
      if (ocrSummaryEl) ocrSummaryEl.textContent = '';
      if (detectedSourceEl) {
        detectedSourceEl.textContent = '';
        detectedSourceEl.hidden = true;
      }
      if (nameMatchEl) {
        nameMatchEl.textContent = '';
        nameMatchEl.className = 'run-proof-name-match';
        nameMatchEl.hidden = true;
      }
      hideNameMismatchState();
      if (submitReviewOverlay) submitReviewOverlay.hidden = true;
      if (postSubmitOverlay) postSubmitOverlay.hidden = true;
    };

    const clearRunDetailFields = () => {
      distanceInput.value = '';
      hoursInput.value = '';
      minutesInput.value = '';
      secondsInput.value = '';
      elapsedInput.value = '';
      locationInput.value = '';
      if (elevationInput) elevationInput.value = '';
      if (stepsInput) stepsInput.value = '';
      runTypeInput.value = '';
      chipList.querySelectorAll('.run-proof-chip').forEach((chip) => {
        chip.classList.remove('is-selected');
        chip.setAttribute('aria-checked', 'false');
      });
      setTodayDate();
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
      if (!state.ocrResult) return;

      const formDistKm = Number(distanceInput.value);
      const parts = parseDurationParts();
      const formMs = (parts.h * 3600 + parts.m * 60 + parts.s) * 1000;

      const comparison = window.RunProofIntegrity
        ? window.RunProofIntegrity.compareWithForm(state.ocrResult, {
          distanceKm: formDistKm,
          elapsedMs: formMs,
          runDate: runDateInput.value,
          runLocation: locationInput.value,
          runType: runTypeInput.value,
          elevationGain: elevationInput ? elevationInput.value : '',
          steps: stepsInput ? stepsInput.value : ''
        })
        : window.OcrProofReader.compareWithForm(state.ocrResult, formDistKm, formMs);

      if (ocrDistanceMismatchInput) ocrDistanceMismatchInput.value = comparison.distanceMismatch ? '1' : '0';
      if (ocrTimeMismatchInput) ocrTimeMismatchInput.value = comparison.timeMismatch ? '1' : '0';
      if (ocrElevationMismatchInput) ocrElevationMismatchInput.value = comparison.elevationMismatch ? '1' : '0';
      if (ocrStepsMismatchInput) ocrStepsMismatchInput.value = comparison.stepsMismatch ? '1' : '0';
      if (ocrDateMismatchInput) ocrDateMismatchInput.value = comparison.dateMismatch ? '1' : '0';
      if (ocrLocationMismatchInput) ocrLocationMismatchInput.value = comparison.locationMismatch ? '1' : '0';
      if (ocrRunTypeMismatchInput) ocrRunTypeMismatchInput.value = comparison.runTypeMismatch ? '1' : '0';

      if (ocrWarningEl) {
        const warnings = Array.isArray(comparison.warnings) ? comparison.warnings : [];
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

    const namesMatch = (ocrName, accountName) => {
      const ocrNameLower = String(ocrName || '').trim().toLowerCase();
      const accountNameLower = String(accountName || '').trim().toLowerCase();
      if (!ocrNameLower || !accountNameLower) return false;

      // Exact / substring match
      if (
        ocrNameLower === accountNameLower ||
        ocrNameLower.includes(accountNameLower) ||
        accountNameLower.includes(ocrNameLower)
      ) {
        return true;
      }

      // Both first and last name appear in OCR text
      const parts = accountNameLower.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const first = parts[0];
        const last = parts[parts.length - 1];
        if (ocrNameLower.includes(first) && ocrNameLower.includes(last)) {
          return true;
        }
      }

      // Fuzzy fallback — OCR often introduces 1-2 character substitutions
      // (e.g. "Sagorsor" → "Sagorcer"). Compare each account name part against
      // each OCR word: if positional character similarity ≥ 75%, treat as matched.
      const charSim = (a, b) => {
        if (!a || !b) return 0;
        const longer  = a.length >= b.length ? a : b;
        const shorter = a.length >= b.length ? b : a;
        if (longer.length === 0) return 1;
        let matches = 0;
        for (let i = 0; i < shorter.length; i++) {
          if (longer[i] === shorter[i]) matches++;
        }
        return matches / longer.length;
      };
      const accountParts = accountNameLower.split(/\s+/).filter(Boolean);
      const ocrWords = ocrNameLower.split(/\s+/).filter(Boolean);
      const allPartsClose = accountParts.every((part) =>
        ocrWords.some((word) => charSim(part, word) >= 0.75)
      );
      return allPartsClose;
    };

    const setNameAnalysis = (result) => {
      const extractedName = String(result && result.name ? result.name : '').trim();
      const hasAccountName = Boolean(runnerName);
      let status = 'not_checked';
      hideNameMismatchState();

      if (extractedName) {
        status = hasAccountName && namesMatch(extractedName, runnerName) ? 'matched' : 'mismatched';
      } else if (result && (result.rawText || result.ok || result.confidence > 0)) {
        status = 'not_detected';
      }

      if (ocrExtractedNameInput) ocrExtractedNameInput.value = extractedName;
      if (ocrNameMatchStatusInput) ocrNameMatchStatusInput.value = status;

      if (!nameMatchEl) return status;

      if (status === 'matched') {
        nameMatchEl.textContent = '';
        const _matchLabel = document.createElement('span');
        _matchLabel.textContent = 'Name matches \u00b7 ';
        const _matchName = document.createElement('strong');
        _matchName.textContent = extractedName;
        nameMatchEl.appendChild(_matchLabel);
        nameMatchEl.appendChild(_matchName);
        nameMatchEl.className = 'run-proof-name-match run-proof-name-match--ok';
        nameMatchEl.hidden = false;
        return status;
      }

      if (status === 'mismatched') {
        // Hide the inline badge — the dialog below is the sole mismatch signal
        if (nameMatchEl) nameMatchEl.hidden = true;
        if (nameMismatchDialog && nameMismatchDetail) {
          nameMismatchDetail.textContent = 'The screenshot shows the name "' + extractedName + '", but your account is registered as "' + runnerNameDisplay + '".';
          nameMismatchDialog.hidden = false;
        }
        return status;
      }

      if (status === 'not_detected') {
        nameMatchEl.textContent = 'Name not detected';
        nameMatchEl.className = 'run-proof-name-match run-proof-name-match--neutral';
        nameMatchEl.hidden = false;
        return status;
      }

      nameMatchEl.hidden = true;
      return status;
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
      if (result.elevationGain && result.elevationGain.value >= 0 && elevationInput) {
        elevationInput.value = String(result.elevationGain.value);
        elevationInput.dispatchEvent(new Event('input', { bubbles: true }));
        filled = true;
      }
      if (result.steps !== null && result.steps !== undefined && stepsInput) {
        stepsInput.value = String(result.steps);
        stepsInput.dispatchEvent(new Event('input', { bubbles: true }));
        filled = true;
      }
      if (result.location && locationInput) {
        locationInput.value = result.location;
        locationInput.dispatchEvent(new Event('input', { bubbles: true }));
        filled = true;
      }
      if (result.runType && chipList && runTypeInput) {
        const chip = chipList.querySelector('[data-run-type="' + result.runType + '"]');
        if (chip) {
          runTypeInput.value = result.runType;
          chipList.querySelectorAll('.run-proof-chip').forEach((node) => {
            const isSelected = node === chip;
            node.classList.toggle('is-selected', isSelected);
            node.setAttribute('aria-checked', isSelected ? 'true' : 'false');
          });
          filled = true;
        }
      }
      if (filled && autoFillBannerEl) {
        autoFillBannerEl.hidden = false;
      }
    };

    const focusEventSelectionPanel = () => {
      if (!eventsList || typeof eventsList.focus !== 'function') return;
      window.requestAnimationFrame(() => {
        if (step2Panel && step2Panel.hidden) return;
        eventsList.focus({ preventScroll: true });
        eventsList.scrollIntoView({ block: 'nearest' });
      });
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
        if (stepIndicator) stepIndicator.textContent = 'Step 1 of 2 \u2014 Submit your screenshot';
        const hasFile = Boolean(fileInput.files && fileInput.files[0]);
        const hasCachedOcr = state.ocrResult !== null;
        const step1Label = hasCachedOcr && hasFile ? STEP_ONE_CONTINUE_LABEL : STEP_ONE_ANALYSE_LABEL;
        if (analyseBtn) {
          analyseBtn.disabled = !hasFile;
        }
        submitBtn.hidden = false;
        submitBtn.disabled = !hasFile;
        setStepOneActionLabel(step1Label);
        submitBtn.setAttribute('aria-busy', 'false');
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
        toggleSubmitState();
        focusEventSelectionPanel();
      }
    };

    const runOcrAnalysis = (file) => {
      if (!file) return;

      if (!window.OcrProofReader) {
        state.ocrRunning = false;
        state.ocrResult = {
          ok: false,
          errorCode: 'OCR_READER_MISSING',
          errorMessage: 'Image analysis is unavailable. Continue by entering your run details manually.'
        };
        if (ocrResultsEl && ocrSummaryEl) {
          ocrSummaryEl.textContent = 'Image analysis is unavailable. Continue by entering your run details manually.';
          ocrResultsEl.hidden = false;
        }
        goToStep(2);
        return;
      }

      clearOcrState();
      state.ocrRunning = true;
      const runId = state.ocrRunId;

      setOcrStatus('Starting analysis...', { withEstimate: true });
      if (analyseHint) {
        analyseHint.textContent = OCR_ANALYSING_HINT;
        analyseHint.hidden = false;
      }

      const ocrTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('OCR timed out')), OCR_ANALYSIS_TIMEOUT_MS));

      Promise.race([window.OcrProofReader.extractRunData(file, (status, progress) => {
        if (ocrStatusEl && state.ocrRunning && runId === state.ocrRunId) {
          if (status === 'loading tesseract core') {
            setOcrStatus('Loading OCR engine...', { withEstimate: true });
          } else if (status === 'initializing tesseract') {
            setOcrStatus('Initialising OCR engine...', { withEstimate: true });
          } else if (status === 'loading language traineddata') {
            const pct = Math.round((progress || 0) * 100);
            setOcrStatus('Downloading language data' + (pct > 0 ? '... ' + pct + '%' : '...'), { withEstimate: true });
          } else if (status === 'initializing api') {
            setOcrStatus('Preparing image reader...', { withEstimate: true });
          } else if (status === 'recognizing text') {
            const pct = Math.round((progress || 0) * 100);
            setOcrStatus('Reading image' + (pct > 0 ? '... ' + pct + '%' : '...'), { withEstimate: true });
          } else if (status === 'preprocessing image') {
            setOcrStatus('Preparing screenshot...', { withEstimate: true });
          } else if (status === 'preprocessed image ready') {
            setOcrStatus('Reading enhanced screenshot...', { withEstimate: true });
          } else if (status === 'retrying original image') {
            setOcrStatus('Trying the original screenshot...', { withEstimate: true });
          }
        }
      }), ocrTimeout]).then((result) => {
        if (runId !== state.ocrRunId) return;
        state.ocrRunning = false;
        state.ocrResult = result;

        setOcrStatus(OCR_READY_STATUS, { hidden: true });
        if (analyseHint) analyseHint.hidden = true;

        if (ocrDistanceInput) ocrDistanceInput.value = result.distance ? String(result.distance.valueKm) : '';
        if (ocrTimeInput) ocrTimeInput.value = result.time ? String(result.time.totalMs) : '';
        if (ocrElevationInput) ocrElevationInput.value = result.elevationGain ? String(result.elevationGain.value) : '';
        if (ocrStepsInput) ocrStepsInput.value = result.steps !== null && result.steps !== undefined ? String(result.steps) : '';
        if (ocrDateInput) ocrDateInput.value = result.date || '';
        if (ocrLocationInput) ocrLocationInput.value = result.location || '';
        if (ocrRunTypeExtractedInput) ocrRunTypeExtractedInput.value = result.runType || '';
        if (ocrRawTextInput) ocrRawTextInput.value = result.rawText || '';
        if (ocrConfidenceInput) ocrConfidenceInput.value = String(result.confidence || 0);
        if (ocrDetectedSourceInput) ocrDetectedSourceInput.value = result.detectedSource || '';
        setNameAnalysis(result);

        if (result.confidence > 0 && (result.distance || result.time)) {
          if (ocrResultsEl && ocrSummaryEl) {
            const parts = [];
            if (result.distance) parts.push(result.distance.value + ' ' + result.distance.unit + (result.distance.unit === 'mi' ? ' (' + result.distance.valueKm + ' km)' : ''));
            if (result.time) parts.push(formatOcrTime(result.time));
            if (result.pace) parts.push('Pace ' + result.pace.label);
            ocrSummaryEl.textContent = 'Detected from image: ' + parts.join(' | ');
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
          if (ocrResultsEl && ocrSummaryEl) {
            ocrSummaryEl.textContent = result.errorMessage || 'We could not read the screenshot automatically. You can continue by entering the details manually.';
            ocrResultsEl.hidden = false;
          }
        }
        goToStep(2);
      }).catch(() => {
        if (runId !== state.ocrRunId) return;
        state.ocrRunning = false;
        state.ocrResult = {
          ok: false,
          errorCode: 'OCR_TIMEOUT',
          errorMessage: 'We could not read the screenshot automatically. You can continue by entering the details manually.'
        };
        setOcrStatus(OCR_READY_STATUS, { hidden: true });
        if (analyseHint) analyseHint.hidden = true;
        if (ocrResultsEl && ocrSummaryEl) {
          ocrSummaryEl.textContent = 'We could not read the screenshot automatically. You can continue by entering the details manually.';
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

    const requireNameMismatchAcknowledgement = (nextAction) => {
      const isMismatch = ocrNameMatchStatusInput && ocrNameMatchStatusInput.value === 'mismatched';
      const isAcknowledged = nameMismatchInput && nameMismatchInput.value === '1';
      // Never gate on mismatch if the name was confirmed as matched
      const isConfirmedMatch = nameMatchEl && nameMatchEl.classList.contains('run-proof-name-match--ok');
      if (!isMismatch || isAcknowledged || isConfirmedMatch) return true;
      state.pendingNameMismatchAction = String(nextAction || '');
      const mismatchWarningWasVisible = Boolean(nameMismatchDialog && !nameMismatchDialog.hidden);
      if (nameMismatchDialog) nameMismatchDialog.hidden = false;
      const confirmOverlay = document.getElementById('runProofNameMismatchConfirm');
      const confirmOk = document.getElementById('runProofNameMismatchConfirmOk');
      if (confirmOverlay && mismatchWarningWasVisible) {
        confirmOverlay.hidden = false;
        if (confirmOk) confirmOk.focus();
      } else if (nameMismatchContinue) {
        nameMismatchContinue.focus();
      }
      setMessage('Review the detected name before submitting. Choose Change Screenshot or Continue Anyway.', 'error');
      return false;
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
      clearRunDetailFields();

      state.isSubmitting = false;
      state.currentSurface = '';
      state.emptyState = null;
      toggleSubmitState();
      goToStep(1);
    };

    const showModalShell = () => {
      modal.removeAttribute('hidden');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      dialog.focus();
    };

    const redirectToLogin = () => {
      const loginUrl = new URL(String(modal.dataset.loginUrl || '/login').trim() || '/login', window.location.origin);
      loginUrl.searchParams.set('redirect', '/runner/dashboard?openRunProof=1');
      window.location.href = loginUrl.pathname + loginUrl.search;
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
        const isDuplicate = resultMessage.type === 'error' && /already been submitted/i.test(resultMessage.text);

        if (resultMessage.type === 'success' || isDuplicate) {
          // Dashboard-specific: refresh the result card on success
          if (resultMessage.type === 'success' && state.currentSurface === 'runner-dashboard') {
            if (typeof window.refreshRunnerDashboardResultSubmissions === 'function') {
              await window.refreshRunnerDashboardResultSubmissions();
            }
          }

          // Set context-sensitive overlay copy
          if (isDuplicate) {
            if (postSubmitTitle) postSubmitTitle.textContent = 'Screenshot already submitted';
            if (postSubmitDesc) postSubmitDesc.textContent = 'This exact screenshot has already been submitted. Upload a different image to submit another entry, or view your existing submissions.';
          } else {
            if (postSubmitTitle) postSubmitTitle.textContent = 'Run submitted!';
            if (postSubmitDesc) postSubmitDesc.textContent = 'Your submission has been received and is pending review. What would you like to do next?';
          }

          // All surfaces: show the post-submit overlay
          if (postSubmitOverlay) {
            postSubmitOverlay.hidden = false;
            if (postSubmitView) postSubmitView.focus();
          } else {
            // Fallback if overlay element is missing
            closeModal();
            showSurfaceMessage({ type: isDuplicate ? 'error' : 'success', text: resultMessage.text });
          }
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

      const preferredRegistrationId = String(
        triggerElement?.getAttribute?.('data-registration-id') ||
        triggerElement?.getAttribute?.('data-run-proof-registration-id') ||
        ''
      ).trim();

      if (state.currentSurface === 'runner-dashboard') {
        showModalShell();
        renderEventOptionsLoading();
        state.isFetchingOptions = true;
        toggleSubmitState();
        try {
          const items = await fetchEligibleOptions();
          if (!items.length) {
            renderEventOptions([], '');
            setMessage((state.emptyState && state.emptyState.text) || 'No eligible event is currently accepting run submissions.', 'error');
            return;
          }
          renderEventOptions(items, preferredRegistrationId);
        } catch (error) {
          renderEventOptions([], '');
          setMessage(String(error?.message || 'Unable to load eligible events.'), 'error');
          return;
        } finally {
          state.isFetchingOptions = false;
          toggleSubmitState();
        }
      } else {
        showModalShell();

        if (state.initialEvents.length) {
          renderEventOptions(state.initialEvents, preferredRegistrationId);
        }
        await loadEligibleOptions(preferredRegistrationId);
        return;
      }
    };

    const closeModal = () => {
      modal.setAttribute('hidden', '');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      clearFilePreview();
      if (submitReviewOverlay) submitReviewOverlay.hidden = true;
      if (postSubmitOverlay) postSubmitOverlay.hidden = true;
      state.isSubmitting = false;
      toggleSubmitState();
      if (state.lastTrigger && typeof state.lastTrigger.focus === 'function') {
        state.lastTrigger.focus();
      }
      state.lastTrigger = null;
    };

    const hasDraftWork = () => {
      const hasFile = Boolean(fileInput.files && fileInput.files[0]);
      const hasDetails = Boolean(
        String(distanceInput.value || '').trim() ||
        String(hoursInput.value || '').trim() ||
        String(minutesInput.value || '').trim() ||
        String(secondsInput.value || '').trim() ||
        String(locationInput.value || '').trim() ||
        String(runTypeInput.value || '').trim()
      );
      return hasFile || hasDetails || state.currentStep > 1;
    };

    const setCloseConfirmCopy = (hasDraft, action = 'close') => {
      const isRefresh = action === 'refresh';
      const isUploadInterrupt = action === 'replace-image' || action === 'drop-image';
      const isRemoveInterrupt = action === 'remove-image';
      if (closeConfirmTitle) {
        if (isRefresh) {
          closeConfirmTitle.textContent = 'Refresh page?';
        } else if (isUploadInterrupt) {
          closeConfirmTitle.textContent = 'Upload a different screenshot?';
        } else if (isRemoveInterrupt) {
          closeConfirmTitle.textContent = 'Remove screenshot?';
        } else {
          closeConfirmTitle.textContent = hasDraft ? 'Discard submission?' : 'Exit submission?';
        }
      }
      if (closeConfirmDesc) {
        if (isRefresh) {
          closeConfirmDesc.textContent = hasDraft
            ? "Refreshing will close this modal and your upload and details will be lost."
            : "Refreshing will close this modal. You can reopen it from the dashboard when you're ready.";
        } else if (isUploadInterrupt) {
          closeConfirmDesc.textContent = "Image analysis is still running. Uploading a different screenshot will stop this analysis and clear any detected details from the current image.";
        } else if (isRemoveInterrupt) {
          closeConfirmDesc.textContent = "Image analysis is still running. Removing this screenshot will stop the analysis and clear any detected details from the current image.";
        } else {
          closeConfirmDesc.textContent = hasDraft
            ? "Your upload and any details you've entered will be lost."
            : "You can reopen this modal from the dashboard when you're ready.";
        }
      }
      if (closeConfirmOk) {
        closeConfirmOk.textContent = isRefresh
          ? 'Refresh'
          : (isUploadInterrupt ? 'Upload again' : '')
            || (isRemoveInterrupt ? 'Remove' : '')
            || (hasDraft ? 'Discard and close' : 'Exit');
      }
    };

    const shouldConfirmPageExit = () => {
      return !state.allowPageExit && !modal.hasAttribute('hidden') && !state.isSubmitting;
    };

    const requestCloseModal = (options = {}) => {
      if (state.isSubmitting) return;
      const shouldConfirm = Boolean(options.forceConfirm) || hasDraftWork();
      if (shouldConfirm) {
        state.confirmAction = 'close';
        setCloseConfirmCopy(hasDraftWork(), 'close');
        openCloseConfirm();
        return;
      }
      closeModal();
    };

    const requestRefreshPage = () => {
      if (!shouldConfirmPageExit()) return false;
      state.confirmAction = 'refresh';
      setCloseConfirmCopy(hasDraftWork(), 'refresh');
      openCloseConfirm();
      return true;
    };

    const requestOcrInterrupt = (action, file = null) => {
      if (!state.ocrRunning) return false;
      state.confirmAction = action;
      state.pendingUploadFile = file;
      setCloseConfirmCopy(true, action);
      openCloseConfirm();
      return true;
    };

    const openFilePicker = () => {
      state.allowFileDialogOnce = true;
      fileInput.value = '';
      fileInput.click();
    };

    const removeSelectedImage = () => {
      fileInput.value = '';
      clearFilePreview();
      clearOcrState();
      clearRunDetailFields();
      validateImage();
      if (analyseBtn) analyseBtn.disabled = true;
      submitBtn.disabled = true;
      setStepOneActionLabel(STEP_ONE_ANALYSE_LABEL);
      if (analyseHint) analyseHint.textContent = 'Upload a screenshot to enable analysis';
      if (step2Panel && !step2Panel.hidden) goToStep(1);
    };

    const handleConfirmedOcrInterrupt = () => {
      const action = state.confirmAction;
      const pendingFile = state.pendingUploadFile;
      state.pendingUploadFile = null;
      clearOcrState();

      if (action === 'remove-image') {
        removeSelectedImage();
        return true;
      }

      if (action === 'drop-image' && pendingFile) {
        setSelectedFileFromDrop(pendingFile);
        return true;
      }

      if (action === 'replace-image') {
        openFilePicker();
        return true;
      }

      return false;
    };

    parseInitialPayload();
    applyModeConfig(state.modeConfig);
    setTodayDate();

    closeButtons.forEach((button) => {
      button.addEventListener('click', () => requestCloseModal({ forceConfirm: true }));
    });

    modal.addEventListener('click', (event) => {
      if (event.target === modal) requestCloseModal({ forceConfirm: true });
    });

    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !state.isSubmitting) {
        event.preventDefault();
        if (closeConfirmOverlay && !closeConfirmOverlay.hidden) {
          dismissCloseConfirm();
        } else {
          requestCloseModal();
        }
      }
    });

    window.addEventListener('keydown', (event) => {
      const key = String(event.key || '').toLowerCase();
      const isKeyboardRefresh = key === 'f5' || ((event.ctrlKey || event.metaKey) && key === 'r');
      if (!isKeyboardRefresh) return;
      if (!requestRefreshPage()) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);

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
        if (input === runDateInput) { validateDate(); updateOcrComparison(); }
        if (input === distanceInput) { validateDistance(); updateOcrComparison(); }
        if (input === locationInput) { validateLocation(); updateOcrComparison(); }
      });
      input.addEventListener('blur', () => {
        if (input === runDateInput) { validateDate(); updateOcrComparison(); }
        if (input === distanceInput) { validateDistance(); updateOcrComparison(); }
        if (input === locationInput) { validateLocation(); updateOcrComparison(); }
      });
    });

    [elevationInput, stepsInput].forEach((input) => {
      if (!input) return;
      input.addEventListener('input', updateOcrComparison);
      input.addEventListener('blur', updateOcrComparison);
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
      updateOcrComparison();
    });

    chipList.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const chip = event.target.closest('.run-proof-chip');
      if (!chip) return;
      event.preventDefault();
      chip.click();
    });

    fileInput.addEventListener('click', (event) => {
      if (state.allowFileDialogOnce) {
        state.allowFileDialogOnce = false;
        return;
      }
      if (!requestOcrInterrupt('replace-image')) return;
      event.preventDefault();
      event.stopPropagation();
    });

    fileInput.addEventListener('change', () => {
      const selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
      clearOcrState();
      clearRunDetailFields();
      setFilePreview(selectedFile);
      validateImage();
      if (selectedFile) {
        computeImageHash(selectedFile).then((hash) => {
          if (imageHashInput) imageHashInput.value = hash;
        });
        if (analyseBtn) {
          analyseBtn.disabled = false;
        }
        submitBtn.disabled = false;
        setStepOneActionLabel(STEP_ONE_ANALYSE_LABEL);
        setOcrStatus(OCR_READY_STATUS + ' ' + OCR_ESTIMATE_LABEL);
        if (analyseHint) analyseHint.textContent = 'Click to detect your run data from the image';
      } else {
        if (analyseBtn) analyseBtn.disabled = true;
        submitBtn.disabled = true;
        setStepOneActionLabel(STEP_ONE_ANALYSE_LABEL);
        setOcrStatus(OCR_WAITING_STATUS);
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
      if (file && requestOcrInterrupt('drop-image', file)) return;
      if (file) setSelectedFileFromDrop(file);
    });

    uploadDropzone.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if (requestOcrInterrupt('replace-image')) return;
      openFilePicker();
    });

    removeImageBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (requestOcrInterrupt('remove-image')) return;
      removeSelectedImage();
    });

    replaceImageBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (requestOcrInterrupt('replace-image')) return;
      openFilePicker();
    });

    const triggerAnalyse = () => {
      const selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
      if (!selectedFile || state.ocrRunning) return;
      // OCR already ran for the current file — go straight to step 2
      if (state.ocrResult !== null) {
        goToStep(2);
        return;
      }
      if (analyseBtn) {
        analyseBtn.disabled = true;
      }
      submitBtn.disabled = true;
      setStepOneActionLabel(STEP_ONE_ANALYSING_LABEL);
      if (analyseHint) {
        analyseHint.textContent = OCR_ANALYSING_HINT;
        analyseHint.hidden = false;
      }
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
          requestCloseModal({ forceConfirm: true });
        } else {
          goToStep(1);
        }
      });
    }

    if (closeConfirmCancel) {
      closeConfirmCancel.addEventListener('click', dismissCloseConfirm);
    }

    const nameMismatchConfirmOverlay = document.getElementById('runProofNameMismatchConfirm');
    const nameMismatchConfirmCancel = document.getElementById('runProofNameMismatchConfirmCancel');
    const nameMismatchConfirmOk = document.getElementById('runProofNameMismatchConfirmOk');

    if (nameMismatchBack) {
      nameMismatchBack.addEventListener('click', () => {
        state.pendingNameMismatchAction = '';
        if (nameMismatchDialog) nameMismatchDialog.hidden = true;
        goToStep(1);
      });
    }

    if (nameMismatchContinue) {
      nameMismatchContinue.addEventListener('click', () => {
        if (nameMismatchConfirmOverlay) {
          nameMismatchConfirmOverlay.hidden = false;
          if (nameMismatchConfirmOk) nameMismatchConfirmOk.focus();
        }
      });
    }

    if (nameMismatchConfirmCancel) {
      nameMismatchConfirmCancel.addEventListener('click', () => {
        state.pendingNameMismatchAction = '';
        if (nameMismatchConfirmOverlay) nameMismatchConfirmOverlay.hidden = true;
      });
    }

    if (nameMismatchConfirmOk) {
      nameMismatchConfirmOk.addEventListener('click', () => {
        if (nameMismatchInput) nameMismatchInput.value = '1';
        if (nameMismatchConfirmOverlay) nameMismatchConfirmOverlay.hidden = true;
        if (nameMismatchDialog) nameMismatchDialog.hidden = true;
        if (nameMatchEl) {
          nameMatchEl.textContent = 'Name difference acknowledged';
          nameMatchEl.className = 'run-proof-name-match run-proof-name-match--neutral';
          nameMatchEl.hidden = false;
        }
        // Always proceed to the review overlay so the runner can verify all
        // details before the final submit — regardless of original pending action.
        state.pendingNameMismatchAction = 'submit-review';
        continueAfterNameMismatchAcknowledgement();
      });
    }

    if (nameMismatchConfirmOverlay) {
      nameMismatchConfirmOverlay.addEventListener('click', (event) => {
        if (event.target === nameMismatchConfirmOverlay) {
          state.pendingNameMismatchAction = '';
          nameMismatchConfirmOverlay.hidden = true;
        }
      });
    }



    if (closeConfirmOk) {
      closeConfirmOk.addEventListener('click', () => {
        dismissCloseConfirm();
        if (handleConfirmedOcrInterrupt()) return;
        if (state.confirmAction === 'refresh') {
          state.allowPageExit = true;
          window.location.reload();
          return;
        }
        closeModal();
      });
    }

    if (closeConfirmOverlay) {
      closeConfirmOverlay.addEventListener('click', (event) => {
        if (event.target === closeConfirmOverlay) dismissCloseConfirm();
      });
    }

    window.addEventListener('beforeunload', (event) => {
      if (!shouldConfirmPageExit()) return;
      event.preventDefault();
      event.returnValue = '';
    });

    // ── Post-submission overlay ─────────────────────────────────────────────

    const dismissPostSubmitOverlay = () => {
      if (postSubmitOverlay) postSubmitOverlay.hidden = true;
    };

    if (postSubmitAnother) {
      postSubmitAnother.addEventListener('click', () => {
        dismissPostSubmitOverlay();
        resetFormState();
        // Re-load eligible options so the new submission can pick events
        void loadEligibleOptions('');
      });
    }

    if (postSubmitView) {
      postSubmitView.addEventListener('click', () => {
        dismissPostSubmitOverlay();
        closeModal();
        window.location.assign('/runner/submissions');
      });
    }

    // ── Submit review overlay ──────────────────────────────────────────────

    const dismissSubmitReview = () => {
      if (submitReviewOverlay) submitReviewOverlay.hidden = true;
    };

    const makeReviewRow = (label, value, modifier) => {
      const li = document.createElement('li');
      const labelEl = document.createElement('span');
      labelEl.className = 'run-proof-submit-review-row-label';
      labelEl.textContent = label;
      const valueEl = document.createElement('span');
      const cls = 'run-proof-submit-review-row-value' + (modifier ? ' run-proof-submit-review-row-value--' + modifier : '');
      valueEl.className = cls;
      valueEl.textContent = value;
      li.appendChild(labelEl);
      li.appendChild(valueEl);
      return li;
    };

    const buildSubmitReview = () => {
      if (!submitReviewRows) return;
      submitReviewRows.innerHTML = '';

      // Event (selected event name or Personal Record)
      const selectedCards = eventsList ? eventsList.querySelectorAll('.run-proof-event-card.is-selected input[type="checkbox"]') : [];
      const eventNames = [];
      selectedCards.forEach((cb) => {
        const card = cb.closest('.run-proof-event-card');
        const strong = card ? card.querySelector('strong') : null;
        if (strong) eventNames.push(strong.textContent.trim());
      });
      const eventLabel = eventNames.length ? eventNames.join(', ') : 'Personal Record';
      submitReviewRows.appendChild(makeReviewRow('Event', eventLabel));

      // Activity type
      const runTypeLabels = { run: 'Run', walk: 'Walk', hike: 'Hike', trail_run: 'Trail Run' };
      const runTypeVal = String(runTypeInput ? runTypeInput.value : '').trim();
      if (runTypeVal) {
        submitReviewRows.appendChild(makeReviewRow('Activity Type', runTypeLabels[runTypeVal] || runTypeVal));
      } else {
        submitReviewRows.appendChild(makeReviewRow('Activity Type', 'Not selected', 'missing'));
      }

      // Date
      const dateVal = String(runDateInput ? runDateInput.value : '').trim();
      if (dateVal) {
        const [y, m, d] = dateVal.split('-');
        const formatted = d && m && y ? d + '/' + m + '/' + y : dateVal;
        submitReviewRows.appendChild(makeReviewRow('Date', formatted));
      } else {
        submitReviewRows.appendChild(makeReviewRow('Date', 'Not entered', 'missing'));
      }

      // Distance
      const distVal = String(distanceInput ? distanceInput.value : '').trim();
      if (distVal) {
        submitReviewRows.appendChild(makeReviewRow('Distance', distVal + ' km'));
      } else {
        submitReviewRows.appendChild(makeReviewRow('Distance', 'Not entered', 'missing'));
      }

      // Duration
      const h = String(hoursInput ? hoursInput.value : '').padStart(2, '0') || '00';
      const m = String(minutesInput ? minutesInput.value : '').padStart(2, '0') || '00';
      const s = String(secondsInput ? secondsInput.value : '').padStart(2, '0') || '00';
      const hasTime = (hoursInput && hoursInput.value) || (minutesInput && minutesInput.value) || (secondsInput && secondsInput.value);
      if (hasTime) {
        submitReviewRows.appendChild(makeReviewRow('Duration', h + 'h ' + m + 'm ' + s + 's'));
      } else {
        submitReviewRows.appendChild(makeReviewRow('Duration', 'Not entered', 'missing'));
      }

      // Location
      const locVal = String(locationInput ? locationInput.value : '').trim();
      if (locVal) {
        submitReviewRows.appendChild(makeReviewRow('Location', locVal));
      } else {
        submitReviewRows.appendChild(makeReviewRow('Location', 'Not entered', 'missing'));
      }

      // Elevation (optional)
      const elevVal = String(elevationInput ? elevationInput.value : '').trim();
      if (elevVal) {
        submitReviewRows.appendChild(makeReviewRow('Elevation Gain', elevVal + ' m'));
      }

      // Steps (optional)
      const stepsVal = String(stepsInput ? stepsInput.value : '').trim();
      if (stepsVal) {
        const stepsNum = parseInt(stepsVal, 10);
        submitReviewRows.appendChild(makeReviewRow('Steps', isNaN(stepsNum) ? stepsVal : stepsNum.toLocaleString()));
      }

      // Name mismatch warning
      const hasMismatch = nameMismatchInput && nameMismatchInput.value === '1';
      if (hasMismatch) {
        submitReviewRows.appendChild(makeReviewRow('Name on screenshot', 'Mismatch — pending admin review', 'warn'));
      }
    };

    const appendIntegrityReviewWarnings = () => {
      if (!submitReviewRows || !state.ocrResult || !window.RunProofIntegrity) return;
      const durationParts = parseDurationParts();
      const comparison = window.RunProofIntegrity.compareWithForm(state.ocrResult, {
        distanceKm: Number(distanceInput.value),
        elapsedMs: (durationParts.h * 3600 + durationParts.m * 60 + durationParts.s) * 1000,
        runDate: runDateInput.value,
        runLocation: locationInput.value,
        runType: runTypeInput.value,
        elevationGain: elevationInput ? elevationInput.value : '',
        steps: stepsInput ? stepsInput.value : ''
      });
      if (comparison.warnings && comparison.warnings.length) {
        submitReviewRows.appendChild(makeReviewRow('Analysis warnings', comparison.warnings.join(' '), 'warn'));
      }
    };

    const showSubmitReview = () => {
      buildSubmitReview();
      appendIntegrityReviewWarnings();
      if (submitReviewOverlay) {
        submitReviewOverlay.hidden = false;
        if (submitReviewConfirm) submitReviewConfirm.focus();
      }
    };

    const submitConfirmedRunProof = () => {
      if (state.isSubmitting) return;

      syncSelectedRegistrationFields();
      syncFormAction();

      if (!form.getAttribute('action')) {
        setMessage('Select at least one eligible event before submitting.', 'error');
        validateEvents();
        return;
      }

      const isValid = validateAll();
      if (!isValid) {
        setMessage('Please fix the highlighted fields before submitting.', 'error');
        return;
      }
      if (!requireNameMismatchAcknowledgement('final-submit')) {
        return;
      }

      state.isSubmitting = true;
      setMessage('', '');
      toggleSubmitState();

      void submitViaFetch();
    };

    const continueAfterNameMismatchAcknowledgement = () => {
      const action = state.pendingNameMismatchAction;
      state.pendingNameMismatchAction = '';
      setMessage('', '');
      if (action === 'submit-review') {
        showSubmitReview();
        return;
      }
      if (action === 'final-submit') {
        submitConfirmedRunProof();
      }
    };

    if (submitReviewEdit) {
      submitReviewEdit.addEventListener('click', dismissSubmitReview);
    }

    if (submitReviewConfirm) {
      submitReviewConfirm.addEventListener('click', () => {
        dismissSubmitReview();
        submitConfirmedRunProof();
      });
    }

    if (submitReviewOverlay) {
      submitReviewOverlay.addEventListener('click', (event) => {
        if (event.target === submitReviewOverlay) dismissSubmitReview();
      });
    }

    // ── Form submit event ────────────────────────────────────────────────────

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

      // Always prevent default on step 2 first pass — show the review dialog instead
      event.preventDefault();

      syncSelectedRegistrationFields();
      syncFormAction();

      if (!form.getAttribute('action')) {
        setMessage('Select at least one eligible event before submitting.', 'error');
        validateEvents();
        return;
      }

      const isValid = validateAll();
      if (!isValid) {
        setMessage('Please fix the highlighted fields before submitting.', 'error');
        return;
      }

      // Show review/confirm overlay — actual submission happens in submitReviewConfirm handler
      if (!requireNameMismatchAcknowledgement('submit-review')) {
        return;
      }

      showSubmitReview();
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

    const params = new URLSearchParams(window.location.search || '');
    if (params.get('openRunProof') === '1') {
      params.delete('openRunProof');
      const nextQuery = params.toString();
      const nextUrl = window.location.pathname + (nextQuery ? '?' + nextQuery : '') + window.location.hash;
      window.history.replaceState({}, '', nextUrl);

      window.setTimeout(() => {
        const dashboardTrigger = document.querySelector('[data-open-run-proof-modal][data-run-proof-surface="runner-dashboard"]');
        const fallbackTrigger = document.querySelector('[data-open-run-proof-modal]');
        openModal(dashboardTrigger || fallbackTrigger || null, null);
      }, 0);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
    return;
  }

  onReady();
})();
