// runner-profile.js – enhanced interactions
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    setupEditablePanels();
    setupDobToggle();
    highlightActiveMenu();
    setupUnlinkConfirmation();
  }

  function setupEditablePanels() {
    const editButtons = document.querySelectorAll('[data-panel-edit]');

    editButtons.forEach(button => {
      const formId = button.dataset.formId;
      const form = document.getElementById(formId);
      if (!form) return;

      const editableInputs = form.querySelectorAll('[data-editable]');
      const actions = form.querySelector('.runner-profile-form-actions');
      const cancelBtn = form.querySelector('[data-cancel-edit]');
      const defaultLabel = button.textContent.trim();

      let originalValues = [];

      // helper to toggle edit/view mode
      const setMode = (editing) => {
        editableInputs.forEach(input => {
          if (editing) {
            input.removeAttribute('readonly');
          } else {
            input.setAttribute('readonly', '');
          }
        });
        if (actions) actions.hidden = !editing;
        // change button appearance but keep it enabled so user can cancel editing by clicking again?
        // Instead we disable the edit button while editing – prevents confusion.
        button.disabled = editing;
        button.textContent = editing ? 'Editing…' : defaultLabel;
        if (editing && editableInputs.length) {
          editableInputs[0].focus();
        }
      };

      // start editing
      button.addEventListener('click', () => {
        if (button.disabled) return; // already editing
        // snapshot current values
        originalValues = Array.from(editableInputs).map(input => input.value);
        setMode(true);
      });

      // cancel editing
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          // restore original values
          editableInputs.forEach((input, idx) => {
            input.value = originalValues[idx] || '';
          });
          setMode(false);
        });
      }

      // on submit, disable save button to prevent double submission
      form.addEventListener('submit', () => {
        const saveBtn = form.querySelector('[data-save-btn]');
        if (saveBtn && !saveBtn.disabled) {
          saveBtn.disabled = true;
          saveBtn.setAttribute('aria-busy', 'true');
        }
      });

      // Force initial state: view mode with hidden actions.
      setMode(false);
    });
  }

  function setupDobToggle() {
    const toggleBtn = document.querySelector('[data-dob-toggle]');
    const valueSpan = document.querySelector('[data-dob-value]');
    if (!toggleBtn || !valueSpan) return;

    const masked = valueSpan.dataset.masked || '****-**-**';
    const unmasked = valueSpan.dataset.unmasked || 'Not set';
    let isMasked = true;

    const updateButton = () => {
      const iconName = isMasked ? 'eye' : 'eye-off';
      toggleBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
      toggleBtn.setAttribute('aria-pressed', (!isMasked).toString());
      toggleBtn.setAttribute('aria-label', isMasked ? 'Show date of birth' : 'Hide date of birth');
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    };

    toggleBtn.addEventListener('click', () => {
      isMasked = !isMasked;
      valueSpan.textContent = isMasked ? masked : unmasked;
      updateButton();
    });

    // initial state
    updateButton();
  }

  function highlightActiveMenu() {
    // highlight the menu link corresponding to the currently visible section
    const sections = document.querySelectorAll('.runner-profile-card[id]');
    const menuLinks = document.querySelectorAll('.runner-profile-menu a[href^="#"]');

    if (!sections.length || !menuLinks.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // remove active class from all links
          menuLinks.forEach(link => link.classList.remove('active'));
          // add active class to link with matching href
          const activeLink = document.querySelector(`.runner-profile-menu a[href="#${entry.target.id}"]`);
          if (activeLink) activeLink.classList.add('active');
        }
      });
    }, { threshold: 0.3, rootMargin: '-20px 0px -20px 0px' });

    sections.forEach(section => observer.observe(section));
  }

  function setupUnlinkConfirmation() {
    const modal = document.getElementById('unlinkGoogleModal');
    const openButtons = document.querySelectorAll('[data-open-unlink-modal]');
    if (!modal || !openButtons.length) return;

    const cancelBtn = modal.querySelector('[data-cancel-unlink]');
    const confirmBtn = modal.querySelector('[data-confirm-unlink]');
    let activeForm = null;
    let lastTrigger = null;

    const closeModal = () => {
      modal.setAttribute('hidden', '');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      activeForm = null;
      if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
      lastTrigger = null;
    };

    openButtons.forEach((button) => {
      if (button.disabled) return;
      button.addEventListener('click', () => {
        activeForm = button.closest('form');
        lastTrigger = button;
        modal.removeAttribute('hidden');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        const focusables = modal.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
        if (focusables.length) focusables[0].focus();
      });
    });

    cancelBtn && cancelBtn.addEventListener('click', closeModal);
    confirmBtn && confirmBtn.addEventListener('click', () => {
      if (activeForm) activeForm.submit();
      closeModal();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal();
    });
  }
})();
