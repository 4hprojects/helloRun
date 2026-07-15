if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard, { once: true });
} else {
  initializeDashboard();
}

function initializeDashboard() {
  setupLogoutHandler();
  setupCollapsiblePanels();
  setupDashboardRefresh();
  setupDashboardFlashBridge();
  setupLoadingStates();
  setupAutoDismissMessages();
  setupCertificateActions();
}

function setupCertificateActions() {
  if (typeof document.addEventListener !== 'function') return;
  document.addEventListener('click', async (event) => {
    const shareToggle = event.target.closest('[data-certificate-share-toggle]');
    if (shareToggle) {
      const wrapper = shareToggle.closest('[data-certificate-share]');
      const menu = wrapper?.querySelector('[data-certificate-share-menu]');
      if (!menu) return;
      const willOpen = menu.hasAttribute('hidden');
      closeCertificateShareMenus({ except: willOpen ? menu : null });
      if (willOpen) {
        menu.removeAttribute('hidden');
        shareToggle.setAttribute('aria-expanded', 'true');
        menu.querySelector('[role="menuitem"]')?.focus();
      } else {
        closeCertificateShareMenu(menu, { restoreFocus: true });
      }
      return;
    }

    const socialLink = event.target.closest('[data-certificate-social-link]');
    if (socialLink) {
      closeCertificateShareMenu(socialLink.closest('[data-certificate-share-menu]'));
      return;
    }

    const nativeShareButton = event.target.closest('[data-native-cert-share-url]');
    if (nativeShareButton) {
      const url = nativeShareButton.getAttribute('data-native-cert-share-url');
      const title = nativeShareButton.getAttribute('data-share-cert-title') || 'My HelloRun achievement';
      const text = nativeShareButton.getAttribute('data-share-cert-text') || `View my HelloRun achievement: ${title}`;
      if (!url) return;
      try {
        if (!navigator.share) throw new Error('Web Share unavailable');
        await navigator.share({ title, text, url });
      } catch (error) {
        if (error?.name === 'AbortError') {
          closeCertificateShareMenu(nativeShareButton.closest('[data-certificate-share-menu]'));
          return;
        }
        const feedbackButton = nativeShareButton.closest('[data-certificate-share]')?.querySelector('[data-certificate-share-toggle]') || nativeShareButton;
        await copyCertificateUrl(url, feedbackButton);
      }
      closeCertificateShareMenu(nativeShareButton.closest('[data-certificate-share-menu]'));
      return;
    }

    const button = event.target.closest('[data-copy-cert-url]');
    if (button) {
      const url = button.getAttribute('data-copy-cert-url');
      if (!url) return;
      const feedbackButton = button.closest('[data-certificate-share]')?.querySelector('[data-certificate-share-toggle]') || button;
      await copyCertificateUrl(url, feedbackButton);
      closeCertificateShareMenu(button.closest('[data-certificate-share-menu]'));
      return;
    }

    if (!event.target.closest('[data-certificate-share]')) closeCertificateShareMenus({ restoreFocus: true });
  });

  document.addEventListener('keydown', (event) => {
    const menu = event.target.closest?.('[data-certificate-share-menu]');
    if (event.key === 'Escape') {
      const openMenu = menu || document.querySelector('[data-certificate-share-menu]:not([hidden])');
      if (!openMenu) return;
      event.preventDefault();
      closeCertificateShareMenu(openMenu, { restoreFocus: true });
      return;
    }
    if (!menu || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
    if (!items.length) return;
    event.preventDefault();
    const current = Math.max(0, items.indexOf(event.target));
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  });
}

function closeCertificateShareMenus({ except = null, restoreFocus = false } = {}) {
  document.querySelectorAll('[data-certificate-share-menu]:not([hidden])').forEach((menu) => {
    if (menu !== except) closeCertificateShareMenu(menu, { restoreFocus });
  });
}

function closeCertificateShareMenu(menu, { restoreFocus = false } = {}) {
  if (!menu) return;
  menu.setAttribute('hidden', '');
  const toggle = menu.closest('[data-certificate-share]')?.querySelector('[data-certificate-share-toggle]');
  toggle?.setAttribute('aria-expanded', 'false');
  if (restoreFocus) toggle?.focus();
}

async function copyCertificateUrl(url, button) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      const originalAriaLabel = button.getAttribute('aria-label') || 'Copy certificate link';
      button.setAttribute('data-action-label', 'Link copied');
      button.setAttribute('aria-label', 'Certificate link copied');
      window.setTimeout(() => {
        button.removeAttribute('data-action-label');
        button.setAttribute('aria-label', originalAriaLabel);
      }, 2000);
    } catch (_) {
      window.prompt('Copy this verification link:', url);
    }
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

function setupDashboardRefresh() {
  const page = document.querySelector('.runner-dashboard-page');
  if (!page) return;

  let activeRequest = null;
  let pollTimer = null;
  const POLL_INTERVAL_MS = 30000;

  const buildEndpointUrl = (sourceHref) => {
    const sourceUrl = new URL(sourceHref, window.location.origin);
    const endpointUrl = new URL('/runner/dashboard/refresh', window.location.origin);
    const resultStatus = sourceUrl.searchParams.get('resultStatus');
    if (resultStatus) endpointUrl.searchParams.set('resultStatus', resultStatus);
    return endpointUrl;
  };

  const parseFragment = (html, name) => {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.querySelector(`[data-dashboard-fragment="${name}"]`);
  };

  const replaceFragments = (fragments) => {
    Object.entries(fragments || {}).forEach(([name, html]) => {
      const currentRoot = document.querySelector(`[data-dashboard-fragment="${name}"]`);
      const nextRoot = parseFragment(html, name);
      if (!currentRoot || !nextRoot) return;

      if (currentRoot.id) {
        currentRoot.innerHTML = nextRoot.innerHTML;
        return;
      }
      currentRoot.replaceWith(nextRoot);
    });
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
    setupCollapsiblePanels();
    setupLoadingStates();
  };

  const refresh = async (href, options = {}) => {
    if (activeRequest) {
      if (options.fallbackToNavigation && href) {
        window.location.assign(href);
        return null;
      }
      return activeRequest;
    }
    const endpointUrl = buildEndpointUrl(href || window.location.pathname + window.location.search);
    page.setAttribute('aria-busy', 'true');

    activeRequest = (async () => {
      const response = await fetch(endpointUrl.toString(), {
        headers: { Accept: 'application/json', 'X-Requested-With': 'fetch' }
      });
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }
      const payload = await response.json();
      if (!payload || payload.success !== true || !payload.fragments) {
        throw new Error('Dashboard refresh response is invalid');
      }
      replaceFragments(payload.fragments);
      if (options.pushHistory) {
        history.pushState({ resultSubmissions: true }, '', href);
      }
      return payload;
    })();

    try {
      return await activeRequest;
    } catch (error) {
      if (options.fallbackToNavigation && href) {
        window.location.assign(href);
        return null;
      }
      if (options.showFailureMessage && typeof window.showRunnerDashboardFlashMessage === 'function') {
        window.showRunnerDashboardFlashMessage({
          type: 'error',
          text: 'Your action was saved, but the dashboard could not refresh. Reload the page to see the latest data.'
        });
        return null;
      }
      throw error;
    } finally {
      activeRequest = null;
      page.removeAttribute('aria-busy');
    }
  };

  window.refreshRunnerDashboard = (options = {}) => {
    if (window.location.pathname !== '/runner/dashboard') {
      return Promise.resolve();
    }
    return refresh(window.location.pathname + window.location.search, {
      showFailureMessage: options.showFailureMessage !== false
    });
  };
  window.refreshRunnerDashboardResultSubmissions = window.refreshRunnerDashboard;

  page.addEventListener('click', (event) => {
    const tab = event.target.closest?.('.result-status-tab');
    if (!tab) return;
    const href = tab.getAttribute('href');
    if (!href) return;
    event.preventDefault();
    if (tab.classList.contains('is-active')) return;
    void refresh(href, { pushHistory: true, fallbackToNavigation: true });
  });

  window.addEventListener('popstate', () => {
    if (window.location.pathname !== '/runner/dashboard') return;
    void refresh(window.location.pathname + window.location.search, { fallbackToNavigation: true });
  });

  const isVisible = () => typeof document.visibilityState === 'undefined' || document.visibilityState === 'visible';
  const startPolling = () => {
    if (pollTimer || typeof setInterval !== 'function') return;
    pollTimer = setInterval(() => {
      if (!isVisible()) return;
      void window.refreshRunnerDashboard({ showFailureMessage: false }).catch(() => {});
    }, POLL_INTERVAL_MS);
  };
  const stopPolling = () => {
    if (!pollTimer || typeof clearInterval !== 'function') return;
    clearInterval(pollTimer);
    pollTimer = null;
  };

  if (typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (isVisible()) {
        startPolling();
        void window.refreshRunnerDashboard({ showFailureMessage: false }).catch(() => {});
      } else {
        stopPolling();
      }
    });
  }
  if (isVisible()) startPolling();
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
