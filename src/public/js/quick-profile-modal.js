(function initQuickProfileModal() {
  const onReady = () => {
    if (window.lucide) {
      window.lucide.createIcons();
    }

    const registrationForm = document.getElementById('eventRegisterForm');
    const registrationSubmitBtn = document.getElementById('confirmRegistrationBtn');
    if (registrationForm && registrationSubmitBtn) {
      registrationForm.addEventListener('submit', () => {
        registrationSubmitBtn.disabled = true;
        registrationSubmitBtn.textContent = 'Submitting...';
      });
    }

    const quickModal = document.getElementById('quickProfileModal');
    if (!quickModal) return;

    const quickDialog = quickModal.querySelector('.quick-profile-modal');
    const quickModalOpenBtn = document.getElementById('openQuickProfileModalBtn');
    const quickModalCloseBtn = document.getElementById('quickProfileCloseBtn');
    const quickModalCancelBtn = document.getElementById('quickProfileCancelBtn');
    const quickForm = document.getElementById('quickProfileForm');
    const quickSaveBtn = document.getElementById('quickProfileSaveBtn');
    const quickMessage = document.getElementById('quickProfileMessage');
    const updateEndpoint = String(quickModal.dataset.updateEndpoint || '/profile/quick-update').trim() || '/profile/quick-update';

    if (!quickDialog || !quickForm || !quickSaveBtn || !quickMessage) return;

    let isQuickSaving = false;

    const setQuickMessage = (text) => {
      if (!text) {
        quickMessage.hidden = true;
        quickMessage.textContent = '';
        return;
      }
      quickMessage.hidden = false;
      quickMessage.textContent = text;
    };

    const clearQuickErrors = () => {
      quickForm.querySelectorAll('[data-error-for]').forEach((node) => {
        node.textContent = '';
        const field = node.getAttribute('data-error-for');
        if (!field) return;
        const input = quickForm.querySelector('[name="' + field + '"], [name="' + field + 'Text"]');
        if (input) input.setAttribute('aria-invalid', 'false');
        const group = node.closest('.form-group');
        if (group) group.classList.remove('is-invalid');
      });
      setQuickMessage('');
    };

    const setQuickErrors = (errors) => {
      clearQuickErrors();
      if (!errors || typeof errors !== 'object') return;

      Object.entries(errors).forEach(([field, message]) => {
        const node = quickForm.querySelector('[data-error-for="' + field + '"]');
        if (!node) return;
        node.textContent = String(message || '');
        const input = quickForm.querySelector('[name="' + field + '"], [name="' + field + 'Text"]');
        if (input) input.setAttribute('aria-invalid', 'true');
        const group = node.closest('.form-group');
        if (group) group.classList.add('is-invalid');
      });
    };

    const getQuickFocusableElements = () => {
      return Array.from(quickDialog.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((node) => !node.hasAttribute('hidden'));
    };

    const openQuickModal = () => {
      clearQuickErrors();
      quickModal.removeAttribute('hidden');
      quickModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      const firstInput = quickForm.querySelector('input:not([readonly]):not([disabled]), select:not([disabled])');
      if (firstInput) firstInput.focus();
    };

    const closeQuickModal = () => {
      if (isQuickSaving) return;
      quickModal.setAttribute('hidden', '');
      quickModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (quickModalOpenBtn && typeof quickModalOpenBtn.focus === 'function') {
        quickModalOpenBtn.focus();
      }
    };

    const computeAge = (dateRaw) => {
      const raw = String(dateRaw || '').trim();
      if (!raw) return 'Not set';
      const dob = new Date(raw + 'T00:00:00');
      if (Number.isNaN(dob.getTime())) return 'Not set';
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      const dayDiff = now.getDate() - dob.getDate();
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
      if (!Number.isFinite(age) || age < 0 || age > 130) return 'Not set';
      return String(age);
    };

    const updateSnapshotField = (name, value) => {
      const target = document.querySelector('[data-profile-field="' + name + '"]');
      if (target) target.textContent = value;
    };

    if (quickModalOpenBtn) {
      quickModalOpenBtn.addEventListener('click', openQuickModal);
    }
    if (quickModalCloseBtn) {
      quickModalCloseBtn.addEventListener('click', closeQuickModal);
    }
    if (quickModalCancelBtn) {
      quickModalCancelBtn.addEventListener('click', closeQuickModal);
    }

    quickModal.addEventListener('click', (event) => {
      if (isQuickSaving) return;
      if (event.target === quickModal) closeQuickModal();
    });

    quickModal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (isQuickSaving) return;
        event.preventDefault();
        closeQuickModal();
        return;
      }

      if (event.key !== 'Tab' || quickModal.hasAttribute('hidden')) return;
      const focusable = getQuickFocusableElements();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    quickForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (isQuickSaving) return;

      clearQuickErrors();
      isQuickSaving = true;
      if (quickModalCloseBtn) quickModalCloseBtn.disabled = true;
      if (quickModalCancelBtn) quickModalCancelBtn.disabled = true;
      quickSaveBtn.setAttribute('aria-busy', 'true');
      quickSaveBtn.disabled = true;
      quickSaveBtn.textContent = 'Saving...';

      try {
        const formData = new FormData(quickForm);
        const encodedBody = new URLSearchParams();
        for (const [key, value] of formData.entries()) {
          encodedBody.append(key, String(value || ''));
        }

        const response = await fetch(updateEndpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          body: encodedBody.toString()
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || payload.success !== true) {
          setQuickErrors(payload.errors || {});
          setQuickMessage(payload.message || 'Unable to update profile.');
          return;
        }

        const profile = payload.profile || {};
        const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Not set';
        updateSnapshotField('name', fullName);
        updateSnapshotField('email', profile.email || 'Not set');
        updateSnapshotField('mobile', profile.mobile || 'Not set');
        updateSnapshotField('country', profile.countryName || profile.country || 'Not set');
        updateSnapshotField('age', computeAge(profile.dateOfBirth));
        updateSnapshotField('gender', profile.gender || 'Not set');

        const emergencyLabel = profile.emergencyContactName && profile.emergencyContactNumber
          ? profile.emergencyContactName + ' (' + profile.emergencyContactNumber + ')'
          : 'Not set';
        updateSnapshotField('emergencyContact', emergencyLabel);

        const quickMobile = document.getElementById('quickMobile');
        const quickEmergencyName = document.getElementById('quickEmergencyName');
        const quickEmergencyNumber = document.getElementById('quickEmergencyNumber');
        if (quickMobile) quickMobile.value = profile.mobile || '';
        if (quickEmergencyName) quickEmergencyName.value = profile.emergencyContactName || '';
        if (quickEmergencyNumber) quickEmergencyNumber.value = profile.emergencyContactNumber || '';

        const emergencyNameInput = document.getElementById('emergencyContactName');
        const emergencyNumberInput = document.getElementById('emergencyContactNumber');
        if (emergencyNameInput) emergencyNameInput.value = profile.emergencyContactName || '';
        if (emergencyNumberInput) emergencyNumberInput.value = profile.emergencyContactNumber || '';

        closeQuickModal();
      } catch (_error) {
        setQuickMessage('Unable to update profile right now.');
      } finally {
        isQuickSaving = false;
        if (quickModalCloseBtn) quickModalCloseBtn.disabled = false;
        if (quickModalCancelBtn) quickModalCancelBtn.disabled = false;
        quickSaveBtn.setAttribute('aria-busy', 'false');
        quickSaveBtn.disabled = false;
        quickSaveBtn.textContent = 'Save Profile';
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
    return;
  }

  onReady();
})();
