(function initOrganizerPricingStepModule(global) {
  'use strict';

  function createOrganizerPricingStepController(config) {
    const feeModeSelect = config?.feeModeSelect || null;
    const pricingTypeSelect = config?.pricingTypeSelect || null;
    const paymentFields = Array.isArray(config?.paymentFields) ? config.paymentFields : [];
    const pricingPanels = Array.isArray(config?.pricingPanels) ? config.pricingPanels : [];
    const pricingTypeHintEl = config?.pricingTypeHintEl || null;
    const rebuildPerDistanceFeeRows = typeof config?.rebuildPerDistanceFeeRows === 'function' ? config.rebuildPerDistanceFeeRows : function noop() {};
    const showInlineActionToast = typeof config?.showInlineActionToast === 'function' ? config.showInlineActionToast : function noop() {};
    const enablePricingPeriodsCheckbox = config?.enablePricingPeriodsCheckbox || document.getElementById('enablePricingPeriods');

    function updateRegistrationPackageSummaries() {
      const packageCards = Array.from(document.querySelectorAll('#registrationPackageGrid [data-registration-package-card]'));
      packageCards.forEach((card) => {
        const summaryInclusions = card.querySelector('[data-registration-package-summary-inclusions]');
        const summaryPricing = card.querySelector('[data-registration-package-summary-pricing]');
        const summaryStatus = card.querySelector('[data-registration-package-summary-status]');
        if (!summaryInclusions && !summaryPricing && !summaryStatus) return;

        const name = card.querySelector('input[name="registrationPackageName"]')?.value?.trim() || '';
        const otherItems = (card.querySelector('input[name="registrationPackageOtherItemNames"]')?.value || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        const includedCount = Array.from(card.querySelectorAll('input[type="checkbox"]')).filter((input) => input.checked).length + otherItems.length;
        const pricedWindows = Array.from(card.querySelectorAll('input[name="registrationPackageEarlyBirdAmount"], input[name="registrationPackageRegularAmount"], input[name="registrationPackageLateAmount"]'))
          .filter((input) => String(input.value || '').trim() !== '').length;

        if (summaryInclusions) {
          summaryInclusions.textContent = includedCount > 0
            ? includedCount + ' inclusion' + (includedCount === 1 ? '' : 's')
            : 'No inclusions selected';
        }
        if (summaryPricing) {
          summaryPricing.textContent = pricedWindows > 0
            ? pricedWindows + ' pricing window' + (pricedWindows === 1 ? '' : 's') + ' set'
            : 'Add pricing windows';
        }
        if (summaryStatus) {
          summaryStatus.textContent = !name
            ? 'Needs bundle name'
            : pricedWindows > 0
              ? 'Ready'
              : 'Needs pricing';
        }
      });
    }

    function setupRegistrationPackageHandlers(options) {
      const opts = options || {};
      const registrationPackageGrid = opts.registrationPackageGrid || document.getElementById('registrationPackageGrid');
      const registrationPackageTemplate = opts.registrationPackageTemplate || document.getElementById('registrationPackageTemplate');
      const addRegistrationPackageBtn = opts.addRegistrationPackageBtn || document.getElementById('addRegistrationPackageBtn');
      const applySuggestedPricingDates = typeof opts.applySuggestedPricingDates === 'function' ? opts.applySuggestedPricingDates : function noop() {};

      function getRegistrationPackageCards() {
        return Array.from(registrationPackageGrid?.querySelectorAll('[data-registration-package-card]') || []);
      }

      function updateRegistrationPackageIndexes() {
        getRegistrationPackageCards().forEach((card, index) => {
          const number = index + 1;
          card.dataset.packageIndex = String(index);
          const title = card.querySelector('[data-registration-package-title]');
          if (title) title.textContent = 'Package ' + number;
          const suggestButton = card.querySelector('.btn-suggest-pricing-dates');
          if (suggestButton) {
            suggestButton.dataset.packageIndex = String(index);
            suggestButton.setAttribute('aria-label', 'Suggest pricing dates for package ' + number);
          }
          const removeButton = card.querySelector('.btn-remove-registration-package');
          if (removeButton) removeButton.setAttribute('aria-label', 'Remove package ' + number);
          [
            'registrationPackageMedal_',
            'registrationPackageShirt_',
            'registrationPackagePatch_',
            'registrationPackageTowel_',
            'registrationPackageFinisherKit_'
          ].forEach((prefix) => {
            const input = Array.from(card.querySelectorAll('input[type="checkbox"]')).find((checkbox) => checkbox.name.startsWith(prefix));
            if (input) input.name = prefix + index;
          });
        });
        updateRegistrationPackageSummaries();
      }

      function addRegistrationPackageCard() {
        if (!registrationPackageGrid || !registrationPackageTemplate) return;
        const nextIndex = getRegistrationPackageCards().length;
        if (nextIndex >= 10) {
          showInlineActionToast('You can add up to 10 registration packages.', 'warning');
          return;
        }
        const html = registrationPackageTemplate.innerHTML
          .replace(/__INDEX__/g, String(nextIndex))
          .replace(/__NUMBER__/g, String(nextIndex + 1));
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html.trim();
        registrationPackageGrid.appendChild(wrapper.firstElementChild);
        if (window.lucide) lucide.createIcons({ root: wrapper });
        updateRegistrationPackageIndexes();
        updatePricingStepSnapshot();
        showInlineActionToast('Package ' + (nextIndex + 1) + ' added.', 'success');
      }

      function removeRegistrationPackageCard(card) {
        if (!card) return;
        const packageTitle = card.querySelector('[data-registration-package-title]')?.textContent?.trim() || 'Package';
        card.remove();
        updateRegistrationPackageIndexes();
        updatePricingStepSnapshot();
        showInlineActionToast(packageTitle + ' removed.', 'danger');
      }

      registrationPackageGrid?.addEventListener('click', (event) => {
        const suggestButton = event.target.closest('.btn-suggest-pricing-dates');
        if (suggestButton) {
          applySuggestedPricingDates(suggestButton.dataset.packageIndex);
          return;
        }
        const removeButton = event.target.closest('.btn-remove-registration-package');
        if (removeButton) removeRegistrationPackageCard(removeButton.closest('[data-registration-package-card]'));
      });
      registrationPackageGrid?.addEventListener('input', updatePricingStepSnapshot);
      registrationPackageGrid?.addEventListener('change', updatePricingStepSnapshot);
      addRegistrationPackageBtn?.addEventListener('click', addRegistrationPackageCard);
      updateRegistrationPackageIndexes();
    }

    function getSelectedPricingType() {
      if (pricingTypeSelect?.value === 'customized_options') return 'customized_options';
      if (pricingTypeSelect?.value === 'package_period') return 'package_period';
      return 'distance_based';
    }

    function getPricingTypeDisplayName(selectedPricingType) {
      if (selectedPricingType === 'customized_options') return 'Customized signup options';
      if (selectedPricingType === 'package_period') return 'Registration packages';
      return 'Based on distance';
    }

    function updatePricingStepSnapshot() {
      const modeEl = document.getElementById('pricingSnapshotMode');
      const configuredEl = document.getElementById('pricingSnapshotConfigured');
      const missingEl = document.getElementById('pricingSnapshotMissing');
      if (!modeEl || !configuredEl || !missingEl) return;

      updateRegistrationPackageSummaries();

      const isPaid = feeModeSelect?.value === 'paid';
      if (!isPaid) {
        modeEl.textContent = 'Free event';
        configuredEl.textContent = 'No pricing required';
        missingEl.textContent = 'No issues';
        return;
      }

      const selectedPricingType = getSelectedPricingType();
      modeEl.textContent = getPricingTypeDisplayName(selectedPricingType);

      if (selectedPricingType === 'distance_based') {
        const feeRows = Array.from(document.querySelectorAll('#perDistanceFeeRows .per-distance-fee-row'));
        const configuredCount = feeRows.filter((row) => {
          const amountInput = row.querySelector('input[name="distancePricingAmount"]');
          const regularInput = row.querySelector('input[name="distancePricingRegularAmount"]');
          const amount = String(amountInput?.value || regularInput?.value || '').trim();
          return amount !== '' && !Number.isNaN(Number(amount));
        }).length;
        configuredEl.textContent = configuredCount + ' of ' + (feeRows.length || 0) + ' distances priced';
        missingEl.textContent = configuredCount === (feeRows.length || 0)
          ? 'No issues'
          : (feeRows.length || 0) - configuredCount + ' distance' + ((feeRows.length || 0) - configuredCount === 1 ? '' : 's') + ' missing price';
        return;
      }

      if (selectedPricingType === 'customized_options') {
        const optionRows = Array.from(document.querySelectorAll('.customized-options-fields .customized-option-row'));
        const configuredCount = optionRows.filter((row) => {
          const description = row.querySelector('input[name="customizedOptionShortDescription"]')?.value?.trim() || '';
          const amountRaw = row.querySelector('input[name="customizedOptionAmount"]')?.value || '';
          const amount = Number(amountRaw);
          return Boolean(description) && amountRaw !== '' && !Number.isNaN(amount) && amount > 0;
        }).length;
        configuredEl.textContent = configuredCount + ' signup option' + (configuredCount === 1 ? '' : 's') + ' configured';
        missingEl.textContent = configuredCount > 0 ? 'No issues' : 'Add at least one priced signup option';
        return;
      }

      const packageCards = Array.from(document.querySelectorAll('#registrationPackageGrid [data-registration-package-card]'));
      const configuredCount = packageCards.filter((card) => {
        const name = card.querySelector('input[name="registrationPackageName"]')?.value?.trim() || '';
        const hasAmount = Array.from(card.querySelectorAll('input[name="registrationPackageEarlyBirdAmount"], input[name="registrationPackageRegularAmount"], input[name="registrationPackageLateAmount"]'))
          .some((input) => String(input.value || '').trim() !== '');
        return Boolean(name) && hasAmount;
      }).length;
      configuredEl.textContent = configuredCount + ' package' + (configuredCount === 1 ? '' : 's') + ' configured';
      missingEl.textContent = configuredCount > 0 ? 'No issues' : 'Add at least one named package with pricing';
    }

    function updatePricingTypeHint(selectedPricingType) {
      if (!pricingTypeHintEl) return;
      if (selectedPricingType === 'customized_options') {
        pricingTypeHintEl.textContent = 'Customized signup options are best when runners choose inclusion bundles instead of only distance.';
        return;
      }
      if (selectedPricingType === 'package_period') {
        pricingTypeHintEl.textContent = 'Registration packages let runners choose a bundle, with separate inclusions and early, regular, and late pricing windows.';
        return;
      }
      pricingTypeHintEl.textContent = 'Based on distance uses Step 5 race categories and sets one fee per distance.';
    }

    function syncPricingModeInput() {
      const pricingModeInput = document.getElementById('pricingMode');
      if (!pricingModeInput) return;
      const isPaid = feeModeSelect?.value === 'paid';
      if (!isPaid) {
        pricingModeInput.value = 'free';
        return;
      }
      const selectedPricingType = getSelectedPricingType();
      if (selectedPricingType === 'package_period') {
        pricingModeInput.value = 'package_period';
        return;
      }
      pricingModeInput.value = selectedPricingType === 'distance_based' && document.getElementById('enablePricingPeriods')?.checked
        ? 'distance_based_period'
        : selectedPricingType;
    }

    function togglePricingPanels(options) {
      const opts = options || {};
      const shouldAnimate = Boolean(opts.animate);
      const notify = Boolean(opts.notify);
      const isPaid = feeModeSelect?.value === 'paid';
      const selectedPricingType = getSelectedPricingType();

      updatePricingTypeHint(selectedPricingType);
      pricingPanels.forEach((panel) => {
        if (typeof panel.getAnimations === 'function') {
          panel.getAnimations().forEach((animation) => animation.cancel());
        }
        const shouldShow = isPaid && panel.dataset.pricingPanel === selectedPricingType;
        if (!shouldAnimate) {
          panel.style.display = shouldShow ? '' : 'none';
          return;
        }

        const currentlyVisible = window.getComputedStyle(panel).display !== 'none';
        if (shouldShow && !currentlyVisible) {
          panel.style.display = '';
          panel.animate(
            [
              { opacity: 0, transform: 'translateY(-6px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            { duration: 170, easing: 'ease-out' }
          );
          return;
        }

        if (!shouldShow && currentlyVisible) {
          const hideAnimation = panel.animate(
            [
              { opacity: 1, transform: 'translateY(0)' },
              { opacity: 0, transform: 'translateY(-5px)' }
            ],
            { duration: 130, easing: 'ease-in', fill: 'forwards' }
          );
          hideAnimation.onfinish = function onHideFinish() {
            const stillShouldShow = feeModeSelect?.value === 'paid' && panel.dataset.pricingPanel === getSelectedPricingType();
            if (!stillShouldShow) panel.style.display = 'none';
          };
        }
      });

      const periodsToggle = document.querySelector('.pricing-periods-toggle');
      const periodDateFields = document.querySelector('.pricing-period-date-fields');
      if (periodsToggle) {
        periodsToggle.style.display = isPaid && selectedPricingType === 'distance_based' ? '' : 'none';
      }
      if (periodDateFields) {
        periodDateFields.style.display = isPaid && selectedPricingType === 'distance_based' && document.getElementById('enablePricingPeriods')?.checked ? '' : 'none';
      }

      syncPricingModeInput();
      if (isPaid && selectedPricingType === 'distance_based') rebuildPerDistanceFeeRows();
      updatePricingStepSnapshot();
      if (notify && isPaid) {
        showInlineActionToast('Pricing mode switched to ' + getPricingTypeDisplayName(selectedPricingType) + '.', 'success');
      }
    }

    function togglePaymentFields(options) {
      const opts = options || {};
      const notify = Boolean(opts.notify);
      const isPaid = feeModeSelect?.value === 'paid';
      paymentFields.forEach((field) => {
        field.style.display = isPaid ? '' : 'none';
      });
      const paymentFreeNote = document.querySelector('.payment-free-note');
      if (paymentFreeNote) paymentFreeNote.style.display = isPaid ? 'none' : '';
      const pricingFreeNote = document.querySelector('.pricing-free-note');
      if (pricingFreeNote) pricingFreeNote.style.display = isPaid ? 'none' : '';

      togglePricingPanels({ animate: false });
      updatePricingStepSnapshot();
      if (notify) {
        showInlineActionToast(
          isPaid ? 'Paid event enabled. Configure pricing below.' : 'Free event selected. Pricing setup is optional.',
          isPaid ? 'success' : 'warning'
        );
      }
    }

    function onEnablePricingPeriodsChange() {
      syncPricingModeInput();
      togglePricingPanels({ animate: false });
      rebuildPerDistanceFeeRows();
      updatePricingStepSnapshot();
      showInlineActionToast(
        enablePricingPeriodsCheckbox?.checked
          ? 'Pricing periods enabled for per-distance fees.'
          : 'Pricing periods disabled. Using one fee per distance.',
        enablePricingPeriodsCheckbox?.checked ? 'success' : 'warning'
      );
    }

    feeModeSelect?.addEventListener('change', function onFeeModeChange() {
      togglePaymentFields({ notify: true });
    });
    pricingTypeSelect?.addEventListener('change', function onPricingTypeChange() {
      togglePricingPanels({ animate: false, notify: true });
    });
    enablePricingPeriodsCheckbox?.addEventListener('change', onEnablePricingPeriodsChange);

    return {
      getSelectedPricingType,
      getPricingTypeDisplayName,
      updatePricingStepSnapshot,
      updatePricingTypeHint,
      syncPricingModeInput,
      updateRegistrationPackageSummaries,
      setupRegistrationPackageHandlers,
      togglePricingPanels,
      togglePaymentFields,
      onEnablePricingPeriodsChange,
      enablePricingPeriodsCheckbox
    };
  }

  global.createOrganizerPricingStepController = createOrganizerPricingStepController;
})(window);
