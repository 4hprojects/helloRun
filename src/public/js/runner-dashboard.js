if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard, { once: true });
} else {
  initializeDashboard();
}

function initializeDashboard() {
  setupLogoutHandler();
  setupCollapsiblePanels();
  setupAsyncResultSubmissions();
  setupDashboardFlashBridge();
  setupUnlinkConfirmation();
  setupLoadingStates();
  setupAutoDismissMessages();
}

/**
 * Logout handler with modal confirmation
 */
function setupLogoutHandler() {
  const logoutForm = document.querySelector('.logout-form');
  const logoutModal = document.getElementById('logoutModal');
  if (!logoutForm || !logoutModal) return;

  const cancelBtn = logoutModal.querySelector('[data-cancel-logout]');
  const confirmBtn = logoutModal.querySelector('[data-confirm-logout]');

  const openModal = () => {
    logoutModal.removeAttribute('hidden');
    logoutModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const focusables = getFocusableInDialog(logoutModal);
    if (focusables.length) focusables[0].focus();
  };

  const closeModal = () => {
    logoutModal.setAttribute('hidden', '');
    logoutModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  logoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    openModal();
  });

  confirmBtn?.addEventListener('click', () => logoutForm.submit());
  cancelBtn?.addEventListener('click', closeModal);

  logoutModal.addEventListener('click', (e) => {
    if (e.target === logoutModal) closeModal();
  });
  logoutModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  });
}

/**
 * Helper: get focusable elements inside modal
 */
function getFocusableInDialog(modal) {
  const dialog = modal.querySelector('.modal-dialog');
  if (!dialog) return [];
  return Array.from(dialog.querySelectorAll(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
  ));
}

/**
 * Setup collapsible panels with localStorage
 */
function setupCollapsiblePanels() {
  const toggleButtons = document.querySelectorAll('[data-toggle-target]');
  if (!toggleButtons.length) return;

  toggleButtons.forEach((button) => {
    if (button.dataset.toggleBound === 'true') return;

    const targetId = button.getAttribute('data-toggle-target');
    if (!targetId) return;
    const panel = document.getElementById(targetId);
    if (!panel) return;

    const showLabel = button.getAttribute('data-toggle-show-label') || 'Show';
    const hideLabel = button.getAttribute('data-toggle-hide-label') || 'Hide';
    const storageKey = `dashboard-toggle:${targetId}`;
    const labelNode = button.querySelector('[data-toggle-label]');

    // Restore state from localStorage if available
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'open') {
        panel.removeAttribute('hidden');
      } else if (saved === 'closed') {
        panel.setAttribute('hidden', '');
      }
    } catch (e) {}

    const updateButton = () => {
      const expanded = !panel.hasAttribute('hidden');
      button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      button.classList.toggle('is-open', expanded);
      if (labelNode) {
        labelNode.textContent = expanded ? hideLabel : showLabel;
      } else {
        button.textContent = expanded ? hideLabel : showLabel;
      }
    };
    updateButton();

    button.addEventListener('click', () => {
      if (panel.hasAttribute('hidden')) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
      updateButton();
      try {
        localStorage.setItem(storageKey, panel.hasAttribute('hidden') ? 'closed' : 'open');
      } catch (e) {}
    });

    button.dataset.toggleBound = 'true';
  });
}

function setupAsyncResultSubmissions() {
  const page = document.querySelector('.runner-dashboard-page');
  if (!page) return;

  let requestToken = 0;

  const getRoot = () => document.querySelector('[data-result-submissions-root]');

  const buildEndpointUrl = (sourceHref, root) => {
    const sourceUrl = new URL(sourceHref, window.location.origin);
    const endpoint = root?.getAttribute('data-result-submissions-endpoint');
    if (!endpoint) return null;

    const endpointUrl = new URL(endpoint, window.location.origin);
    const resultStatus = sourceUrl.searchParams.get('resultStatus');
    const groupQ = sourceUrl.searchParams.get('groupQ');

    if (resultStatus) endpointUrl.searchParams.set('resultStatus', resultStatus);
    if (groupQ) endpointUrl.searchParams.set('groupQ', groupQ);
    return endpointUrl;
  };

  const bindTabs = (root) => {
    const tabs = root?.querySelectorAll('.result-status-tab');
    if (!tabs?.length) return;

    tabs.forEach((tab) => {
      tab.addEventListener('click', (event) => {
        const href = tab.getAttribute('href');
        if (!href) return;
        if (tab.classList.contains('is-active')) {
          event.preventDefault();
          return;
        }

        event.preventDefault();
        void loadCard(href, { pushHistory: true });
      });
    });
  };

  const replaceRoot = (html) => {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const nextRoot = template.content.querySelector('[data-result-submissions-root]');
    const currentRoot = getRoot();
    if (!nextRoot || !currentRoot) return false;

    currentRoot.replaceWith(nextRoot);
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
    bindTabs(nextRoot);
    return true;
  };

  const loadCard = async (href, { pushHistory }) => {
    const currentRoot = getRoot();
    if (!currentRoot) return;

    const endpointUrl = buildEndpointUrl(href, currentRoot);
    if (!endpointUrl) {
      window.location.assign(href);
      return;
    }

    const currentRequest = ++requestToken;
    currentRoot.classList.add('is-loading');
    currentRoot.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(endpointUrl.toString(), {
        headers: { 'X-Requested-With': 'fetch' }
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const html = await response.text();
      if (currentRequest !== requestToken) return;

      const replaced = replaceRoot(html);
      if (!replaced) {
        throw new Error('Partial markup missing result submissions root');
      }

      if (pushHistory) {
        history.pushState({ resultSubmissions: true }, '', href);
      }
    } catch (error) {
      window.location.assign(href);
    } finally {
      const latestRoot = getRoot();
      latestRoot?.classList.remove('is-loading');
      latestRoot?.removeAttribute('aria-busy');
    }
  };

  window.refreshRunnerDashboardResultSubmissions = () => {
    if (window.location.pathname !== '/runner/dashboard') {
      return Promise.resolve();
    }
    return loadCard(window.location.pathname + window.location.search, { pushHistory: false });
  };

  window.addEventListener('popstate', () => {
    if (window.location.pathname !== '/runner/dashboard') return;
    void loadCard(window.location.pathname + window.location.search, { pushHistory: false });
  });

  bindTabs(getRoot());
}

function setupDashboardFlashBridge() {
  const page = document.querySelector('.runner-dashboard-page');
  if (!page) return;

  const container = page.querySelector('.dashboard-container');
  const hero = page.querySelector('.dashboard-hero');
  if (!container || !hero) return;

  window.showRunnerDashboardFlashMessage = ({ type, text, linkHref, linkLabel }) => {
    const messageText = String(text || '').trim();
    if (!messageText) return;

    const safeType = String(type || '').trim().toLowerCase() === 'error' ? 'danger' : 'success';
    let alert = page.querySelector('[data-dashboard-runtime-message]');
    if (!alert) {
      alert = document.createElement('div');
      alert.setAttribute('data-dashboard-runtime-message', '1');
      hero.insertAdjacentElement('afterend', alert);
    }

    alert.className = `alert alert-${safeType}`;
    alert.setAttribute('role', safeType === 'danger' ? 'alert' : 'status');
    alert.setAttribute('aria-live', safeType === 'danger' ? 'assertive' : 'polite');
    alert.textContent = messageText;

    const href = String(linkHref || '').trim();
    const label = String(linkLabel || '').trim();
    if (href && label) {
      const spacer = document.createTextNode(' ');
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      alert.appendChild(spacer);
      alert.appendChild(link);
    }

    if (typeof alert.scrollIntoView === 'function') {
      alert.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };
}

/**
 * Unlink Google confirmation modal
 */
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
    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
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
      const focusables = getFocusableInDialog(modal);
      if (focusables.length) focusables[0].focus();
    });
  });

  cancelBtn?.addEventListener('click', closeModal);
  confirmBtn?.addEventListener('click', () => {
    if (activeForm) activeForm.submit();
    closeModal();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      const focusables = getFocusableInDialog(modal);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
        return;
      }
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
        return;
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  });
}

/**
 * Loading states on form submissions (except logout)
 */
function setupLoadingStates() {
  document.querySelectorAll('form').forEach(form => {
    if (form.dataset.loadingStateBound === 'true') return;
    if (form.classList.contains('logout-form')) {
      form.dataset.loadingStateBound = 'true';
      return;
    }
    form.addEventListener('submit', () => {
      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn && !submitBtn.disabled && !submitBtn.classList.contains('btn-loading')) {
        submitBtn.classList.add('btn-loading');
        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy', 'true');
      }
    });
    form.dataset.loadingStateBound = 'true';
  });
}

/**
 * Auto-dismiss success messages after 5 seconds
 */
function setupAutoDismissMessages() {
  document.querySelectorAll('.alert-success').forEach(msg => {
    setTimeout(() => {
      msg.style.transition = 'opacity 0.3s';
      msg.style.opacity = '0';
      setTimeout(() => msg.remove(), 300);
    }, 5000);
  });
}
