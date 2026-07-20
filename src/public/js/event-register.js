(function initEventRegistrationPage() {
  'use strict';

  const onReady = () => {
    window.lucide?.createIcons?.();
    const form = document.getElementById('eventRegisterForm');
    const dataElement = document.getElementById('registrationReviewData');
    if (!form || !dataElement) return;

    let data = {};
    try {
      data = JSON.parse(dataElement.textContent || '{}');
    } catch (_) {
      data = {};
    }

    const dialog = document.getElementById('registrationReviewDialog');
    const reviewButton = document.getElementById('reviewRegistrationBtn');
    const confirmButton = document.getElementById('confirmRegistrationBtn');
    const waiverDetails = document.getElementById('waiverDetails');
    const waiverSummary = waiverDetails?.querySelector('summary');
    const waiverAccepted = document.getElementById('waiverAccepted');
    const modeSelect = form.elements.namedItem('participationMode');
    const expectedSignatureName = String(data.expectedSignatureName || '').trim();
    let allowFinalSubmit = false;
    let isSubmitting = false;
    let waiverMustRemainOpen = waiverDetails?.dataset.validationLockedOpen === 'true';

    const setWaiverValidationLock = (locked) => {
      waiverMustRemainOpen = Boolean(locked);
      if (!waiverDetails) return;
      waiverDetails.dataset.validationLockedOpen = waiverMustRemainOpen ? 'true' : 'false';
      if (waiverMustRemainOpen) waiverDetails.open = true;
      if (waiverSummary) {
        if (waiverMustRemainOpen) waiverSummary.setAttribute('aria-disabled', 'true');
        else waiverSummary.removeAttribute('aria-disabled');
      }
    };

    setWaiverValidationLock(waiverMustRemainOpen && !waiverAccepted?.checked);

    const fieldValue = (name) => {
      const field = form.elements.namedItem(name);
      if (!field) return '';
      if (typeof RadioNodeList !== 'undefined' && field instanceof RadioNodeList) return String(field.value || '');
      if (field.type === 'radio') return field.checked ? String(field.value || '') : '';
      return String(field.value || '');
    };

    const selectedAddOnIds = () => Array.from(form.querySelectorAll('input[name="addOnProductIds"]:checked')).map((input) => String(input.value || ''));
    const findByValue = (items, value, key = 'value') => (Array.isArray(items) ? items : []).find((item) => String(item[key] || '') === String(value || '')) || null;
    const formatMoney = (amount, currency) => {
      const numeric = Number(amount);
      if (!Number.isFinite(numeric) || numeric <= 0) return 'Free';
      return `${currency} ${numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    const setText = (selector, value) => document.querySelectorAll(selector).forEach((node) => { node.textContent = value; });
    const setRow = (selector, visible) => document.querySelectorAll(selector).forEach((node) => { node.hidden = !visible; });

    const getSelectionSummary = () => {
      const mode = findByValue(data.modes, fieldValue('participationMode'));
      const distance = findByValue(data.distances, fieldValue('raceDistance'));
      const option = findByValue(data.customizedOptions, fieldValue('customizedOptionId'), 'id');
      const packageOption = findByValue(data.packages, fieldValue('registrationPackageId'), 'id');
      const addOns = selectedAddOnIds().map((id) => findByValue(data.addOns, id, 'id')).filter(Boolean);
      const currency = String(option?.currency || data.currency || 'PHP').trim().toUpperCase();
      let registrationAmount = 0;

      if (String(data.feeMode || '') === 'paid') {
        if (option) registrationAmount = Number(option.amount || 0);
        else if (packageOption && packageOption.amount !== null) registrationAmount = Number(packageOption.amount || 0);
        else {
          const distancePrice = data.distancePricing?.[fieldValue('raceDistance')];
          registrationAmount = Number(distancePrice?.amount || 0);
        }
      }

      const addOnAmount = addOns.reduce((total, item) => total + Number(item.amount || 0), 0);
      return {
        modeLabel: mode?.label || fieldValue('participationMode') || 'Not selected',
        distanceLabel: distance?.title || fieldValue('raceDistance') || 'Not selected',
        optionLabel: option?.label || '',
        packageLabel: packageOption?.label || '',
        addOns,
        addOnsLabel: addOns.map((item) => item.label).join(', '),
        registrationAmount,
        addOnAmount,
        totalAmount: registrationAmount + addOnAmount,
        currency
      };
    };

    const updateReview = () => {
      const summary = getSelectionSummary();
      const registrationLabel = formatMoney(summary.registrationAmount, summary.currency);
      const addOnsLabel = formatMoney(summary.addOnAmount, summary.currency);
      const totalLabel = formatMoney(summary.totalAmount, summary.currency);

      setText('[data-review-mode], [data-dialog-mode]', summary.modeLabel);
      setText('[data-review-distance], [data-dialog-distance]', summary.distanceLabel);
      setText('[data-review-option], [data-dialog-option]', summary.optionLabel || '—');
      setText('[data-review-package], [data-dialog-package]', summary.packageLabel || '—');
      setText('[data-review-registration-cost]', registrationLabel);
      setText('[data-review-addons-cost]', addOnsLabel);
      setText('[data-review-total], [data-dialog-total]', totalLabel);
      setText('[data-dialog-addons]', summary.addOnsLabel || '—');
      setText('[data-dialog-waiver]', document.getElementById('waiverAccepted')?.checked ? 'Accepted and signed' : 'Not confirmed');
      const profileName = document.querySelector('[data-profile-field="name"]')?.textContent?.trim() || data.profileName || 'Not set';
      setText('[data-dialog-profile]', profileName);

      setRow('[data-review-option-row], [data-dialog-option-row]', Boolean(summary.optionLabel));
      setRow('[data-review-package-row], [data-dialog-package-row]', Boolean(summary.packageLabel));
      setRow('[data-review-addons-row], [data-dialog-addons-row]', summary.addOns.length > 0);
    };

    const normalizeName = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const getClientErrors = () => {
      const errors = [];
      const requiredSelections = [
        ['participationMode', 'participationModeGroup', 'Select a participation mode.'],
        ['raceDistance', 'raceDistanceGroup', 'Select a goal or category.']
      ];
      if (form.elements.namedItem('customizedOptionId')) requiredSelections.push(['customizedOptionId', 'customizedOptionGroup', 'Select a signup option.']);
      if (form.elements.namedItem('registrationPackageId')) requiredSelections.push(['registrationPackageId', 'registrationPackageGroup', 'Select a registration package.']);
      requiredSelections.forEach(([name, id, message]) => {
        if (!fieldValue(name)) errors.push({ id, message });
      });

      const emergencyFields = document.querySelector('[data-emergency-contact-fields]');
      if (emergencyFields && !emergencyFields.hidden) {
        if (!fieldValue('emergencyContactName').trim()) errors.push({ id: 'emergencyContactName', message: 'Enter an emergency contact name.' });
        if (!fieldValue('emergencyContactNumber').trim()) errors.push({ id: 'emergencyContactNumber', message: 'Enter an emergency contact number.' });
      }

      if (!waiverAccepted?.checked) errors.push({ id: 'waiverAccepted', message: 'Read and accept the event waiver.' });
      const signature = document.getElementById('waiverSignature');
      if (!signature?.value.trim()) errors.push({ id: 'waiverSignature', message: 'Enter your digital signature.' });
      else if (expectedSignatureName && normalizeName(signature.value) !== normalizeName(expectedSignatureName)) {
        errors.push({ id: 'waiverSignature', message: 'Your signature must exactly match your full account name.' });
      }
      return errors;
    };

    const clearClientErrors = () => {
      form.querySelectorAll('.registration-client-field-error').forEach((message) => message.remove());
      form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.setAttribute('aria-invalid', 'false'));
      form.querySelectorAll('[aria-describedby]').forEach((field) => {
        const describedBy = String(field.getAttribute('aria-describedby') || '')
          .split(/\s+/)
          .filter((id) => id && !id.startsWith('registrationClientError-'));
        if (describedBy.length) field.setAttribute('aria-describedby', describedBy.join(' '));
        else field.removeAttribute('aria-describedby');
      });
    };

    const showClientErrors = (errors) => {
      clearClientErrors();
      const hasWaiverAcceptanceError = errors.some((error) => error.id === 'waiverAccepted');
      const hasWaiverSignatureError = errors.some((error) => error.id === 'waiverSignature');
      if (hasWaiverAcceptanceError) setWaiverValidationLock(true);
      if ((hasWaiverAcceptanceError || hasWaiverSignatureError) && waiverDetails) waiverDetails.open = true;
      errors.forEach((error) => {
        const target = document.getElementById(error.id);
        if (!target) return;
        const invalidField = target?.matches('input, select') ? target : target?.querySelector('input:not([disabled]), select:not([disabled])');
        invalidField?.setAttribute('aria-invalid', 'true');
        const message = document.createElement('small');
        const messageId = `registrationClientError-${error.id}`;
        message.id = messageId;
        message.className = 'error-text registration-client-field-error';
        message.setAttribute('role', 'alert');
        message.textContent = error.message;

        if (error.id === 'waiverAccepted') {
          const checkboxLabel = target.closest('label');
          if (checkboxLabel) checkboxLabel.insertAdjacentElement('afterend', message);
          else target.parentElement?.appendChild(message);
        } else {
          const messageContainer = target.matches('fieldset') ? target : target.closest('.form-group') || target.parentElement;
          messageContainer?.appendChild(message);
        }

        if (invalidField) {
          const describedBy = new Set(String(invalidField.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
          describedBy.add(messageId);
          invalidField.setAttribute('aria-describedby', Array.from(describedBy).join(' '));
        }
      });
    };

    const updateEmergencyContactVisibility = () => {
      const emergencyFields = document.querySelector('[data-emergency-contact-fields]');
      const isVirtual = fieldValue('participationMode').trim().toLowerCase() === 'virtual';
      if (emergencyFields) emergencyFields.hidden = isVirtual;
    };

    form.addEventListener('input', () => {
      updateReview();
      clearClientErrors();
    });
    form.addEventListener('change', () => {
      if (waiverAccepted?.checked) setWaiverValidationLock(false);
      else if (waiverMustRemainOpen && waiverDetails) waiverDetails.open = true;
      updateEmergencyContactVisibility();
      updateReview();
      clearClientErrors();
    });

    waiverSummary?.addEventListener('click', (event) => {
      if (!waiverMustRemainOpen || waiverAccepted?.checked) return;
      event.preventDefault();
      waiverDetails.open = true;
    });

    waiverSummary?.addEventListener('keydown', (event) => {
      if (!waiverMustRemainOpen || waiverAccepted?.checked || !['Enter', ' ', 'Spacebar'].includes(event.key)) return;
      event.preventDefault();
      waiverDetails.open = true;
    });

    waiverDetails?.addEventListener('toggle', () => {
      if (waiverMustRemainOpen && !waiverAccepted?.checked && !waiverDetails.open) waiverDetails.open = true;
    });

    form.addEventListener('submit', (event) => {
      if (allowFinalSubmit) {
        if (isSubmitting) {
          event.preventDefault();
          return;
        }
        isSubmitting = true;
        if (confirmButton) {
          confirmButton.disabled = true;
          confirmButton.setAttribute('aria-busy', 'true');
          confirmButton.textContent = 'Registering…';
        }
        if (reviewButton) reviewButton.disabled = true;
        form.dispatchEvent(new CustomEvent('registration:confirmed-submit'));
        return;
      }

      event.preventDefault();
      const errors = getClientErrors();
      if (errors.length) {
        showClientErrors(errors);
        return;
      }
      updateReview();
      if (dialog && typeof dialog.showModal === 'function') {
        dialog.showModal();
        window.lucide?.createIcons?.({ root: dialog });
        confirmButton?.focus();
      } else {
        allowFinalSubmit = true;
        form.requestSubmit();
      }
    });

    confirmButton?.addEventListener('click', () => {
      if (isSubmitting) return;
      allowFinalSubmit = true;
      dialog?.close();
      form.requestSubmit();
    });

    dialog?.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    updateEmergencyContactVisibility();
    updateReview();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady, { once: true });
  else onReady();
})();
