// Mobile menu toggle
function initMainUi() {
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const runProofCallouts = Array.from(document.querySelectorAll('[data-nav-run-proof-callout]'));
  const backToTopBtn = document.getElementById('globalBackToTopBtn');
  const eventsFilterForm = document.querySelector('.filter-bar[action="/events"]');
  const eventCarousels = Array.from(document.querySelectorAll('[data-event-carousel]'));
  const globalFlash = document.querySelector('[data-global-flash]');

  initHighRiskConfirmations();
  initAdminPrivilegeAffordances();
  initOperationalFilterTools();
  initRegistrationDrafts();
  initMobileOperationalTables();
  initOnsiteFieldMode();
  initWorkspaceDrafts();
  initOrganizerBreadcrumbs();

  if (globalFlash) {
    const dismiss = globalFlash.querySelector('[data-dismiss-global-flash]');
    if (dismiss) dismiss.addEventListener('click', () => globalFlash.remove());
  }

  runProofCallouts.forEach((callout) => {
    if (callout.dataset.navRunProofCalloutInitialized === '1') return;
    callout.dataset.navRunProofCalloutInitialized = '1';
    window.setTimeout(() => {
      callout.classList.add('is-dismissed');
    }, 7000);
  });

  if (menuToggle && menuToggle.dataset.navInitialized !== '1') {
    menuToggle.dataset.navInitialized = '1';
  } else if (menuToggle) {
    return;
  }
  
  if (menuToggle && navLinks) {
    const getFocusable = () =>
      Array.from(navLinks.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])'))
        .filter((el) => !el.disabled && el.offsetParent !== null);

    const firstFocusableLink = () => getFocusable()[0] || null;

    const syncToggleIcon = (isOpen) => {
      // Lucide replaces <i> with <svg> on page load, so query for either
      const existing = menuToggle.querySelector('i, svg');
      if (!existing) return;
      const newIcon = document.createElement('i');
      newIcon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
      existing.replaceWith(newIcon);
      // Use root to limit re-render to the toggle button only
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons({ root: menuToggle });
      }
    };

    const openMenu = () => {
      navLinks.classList.add('active');
      menuToggle.setAttribute('aria-expanded', 'true');
      menuToggle.setAttribute('aria-label', 'Close navigation menu');
      syncToggleIcon(true);
    };

    const closeMenu = ({ returnFocus = false } = {}) => {
      navLinks.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open navigation menu');
      syncToggleIcon(false);

      if (returnFocus) {
        menuToggle.focus();
      }
    };

    menuToggle.addEventListener('click', function() {
      const isOpen = navLinks.classList.contains('active');
      if (isOpen) {
        closeMenu();
        return;
      }

      openMenu();
      const firstLink = firstFocusableLink();
      if (firstLink) {
        firstLink.focus();
      }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
      const eventPath = typeof event.composedPath === 'function' ? event.composedPath() : [];
      const clickInsideNav = eventPath.includes(menuToggle)
        || eventPath.includes(navLinks)
        || Boolean(event.target.closest('.nav-container'));

      if (!clickInsideNav && navLinks.classList.contains('active')) {
        closeMenu();
      }
    });

    navLinks.addEventListener('click', function(event) {
      if (!event.target.closest('a') || !navLinks.classList.contains('active')) return;
      closeMenu();
    });

    // Focus trap: Tab cycles within the open menu; Escape closes it
    document.addEventListener('keydown', function(event) {
      if (!navLinks.classList.contains('active')) return;

      if (event.key === 'Escape') {
        closeMenu({ returnFocus: true });
        return;
      }

      if (event.key === 'Tab') {
        const focusable = getFocusable();
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    });

    // Match CSS nav breakpoint: max-width: 900px means >=901px is desktop.
    window.addEventListener('resize', function() {
      if (window.innerWidth >= 901 && navLinks.classList.contains('active')) {
        closeMenu();
      }
    });
  }

  if (backToTopBtn) {
    const toggleBackToTop = () => {
      if (window.scrollY > 300) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    };

    window.addEventListener('scroll', toggleBackToTop, { passive: true });
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    toggleBackToTop();
  }

  if (eventsFilterForm && eventsFilterForm.dataset.autoSubmitInitialized !== '1') {
    eventsFilterForm.dataset.autoSubmitInitialized = '1';
    eventsFilterForm.querySelectorAll('select').forEach((select) => {
      select.addEventListener('change', () => {
        if (typeof eventsFilterForm.requestSubmit === 'function') {
          eventsFilterForm.requestSubmit();
          return;
        }
        eventsFilterForm.submit();
      });
    });
  }

  eventCarousels.forEach(initEventCarousel);
}

function initRegistrationDrafts() {
  const form = document.getElementById('eventRegisterForm');
  if (!form || !window.localStorage) return;
  const key = `helloRun:registrationDraft:${window.location.pathname}`;
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  const safeFields = () => Array.from(form.elements).filter((field) => field.name && field.name !== '_csrf' && field.type !== 'file' && field.type !== 'password' && !field.disabled);
  try {
    const draft = JSON.parse(window.localStorage.getItem(key) || 'null');
    if (draft && Date.now() - Number(draft.savedAt || 0) <= maxAge) {
      safeFields().forEach((field) => {
        if (!(field.name in draft.values)) return;
        if (field.type === 'checkbox' || field.type === 'radio') field.checked = Array.isArray(draft.values[field.name]) ? draft.values[field.name].includes(field.value) : draft.values[field.name] === field.value;
        else field.value = draft.values[field.name];
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const note = document.createElement('div');
      note.className = 'page-message page-message-info registration-draft-note';
      note.textContent = `Draft restored from ${new Date(draft.savedAt).toLocaleString()}. Uploaded files and sensitive fields are never saved.`;
      form.prepend(note);
    } else if (draft) window.localStorage.removeItem(key);
  } catch (_) { window.localStorage.removeItem(key); }
  let timer;
  form.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const values = {};
      safeFields().forEach((field) => {
        if (field.type === 'checkbox') { values[field.name] = values[field.name] || []; if (field.checked) values[field.name].push(field.value); }
        else if (field.type !== 'radio' || field.checked) values[field.name] = field.value;
      });
      window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), values }));
    }, 350);
  });
  form.addEventListener('submit', () => window.localStorage.removeItem(key));
}

function initMobileOperationalTables() {
  document.querySelectorAll('table.admin-table, table.registrants-table, table.communication-retries-table').forEach((table) => {
    const labels = Array.from(table.querySelectorAll('thead th')).map((cell) => cell.textContent.trim());
    table.classList.add('mobile-card-table');
    table.querySelectorAll('tbody tr').forEach((row) => Array.from(row.children).forEach((cell, index) => {
      if (labels[index]) cell.dataset.label = labels[index];
    }));
  });
}

function initOnsiteFieldMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('fieldMode') !== '1') return;
  document.body.classList.add('onsite-field-mode');
  const status = document.createElement('div');
  status.className = 'field-sync-status';
  status.setAttribute('role', 'status');
  const refresh = () => { status.textContent = navigator.onLine ? 'Online · actions sync immediately' : 'Offline · actions are paused to prevent duplicate check-ins'; status.classList.toggle('is-offline', !navigator.onLine); };
  refresh(); window.addEventListener('online', refresh); window.addEventListener('offline', refresh);
  document.body.appendChild(status);
  document.querySelectorAll('form').forEach((form) => form.addEventListener('submit', (event) => {
    if (!navigator.onLine) { event.preventDefault(); refresh(); status.focus(); return; }
    form.querySelectorAll('button[type="submit"]').forEach((button) => { button.disabled = true; button.textContent = 'Saving…'; });
  }));
}

function initWorkspaceDrafts() {
  const form = document.querySelector('form.create-event-form, form.policy-editor-form');
  if (!form || !window.localStorage) return;
  const kind = form.classList.contains('policy-editor-form') ? 'policy' : 'event';
  const key = `helloRun:${kind}WorkspaceDraft:${window.location.pathname}`;
  const fields = () => Array.from(form.elements).filter((field) => field.name && field.name !== '_csrf' && field.type !== 'file' && field.type !== 'password' && !field.disabled);
  let timer;
  const status = document.createElement('p');
  status.className = 'workspace-autosave-status';
  status.setAttribute('role', 'status');
  status.textContent = 'Changes are saved locally while you work. Uploaded files require an explicit save.';
  form.prepend(status);
  try {
    const draft = JSON.parse(window.localStorage.getItem(key) || 'null');
    if (draft && Date.now() - Number(draft.savedAt || 0) < 7 * 24 * 60 * 60 * 1000 && window.confirm(`Restore your ${kind} workspace draft from ${new Date(draft.savedAt).toLocaleString()}?`)) {
      fields().forEach((field) => {
        const value = draft.values[field.name]; if (value === undefined) return;
        if (field.type === 'checkbox' || field.type === 'radio') field.checked = Array.isArray(value) ? value.includes(field.value) : value === field.value;
        else field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });
      status.textContent = 'Local draft restored. Review readiness and reselect any upload before saving.';
    }
  } catch (_) { window.localStorage.removeItem(key); }
  form.addEventListener('input', () => {
    status.textContent = 'Unsaved changes…'; clearTimeout(timer);
    timer = setTimeout(() => {
      const values = {};
      fields().forEach((field) => {
        if (field.type === 'checkbox') { values[field.name] = values[field.name] || []; if (field.checked) values[field.name].push(field.value); }
        else if (field.type !== 'radio' || field.checked) values[field.name] = field.value;
      });
      try { window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), values })); status.textContent = `Local draft saved at ${new Date().toLocaleTimeString()}.`; } catch (_) { status.textContent = 'Local autosave unavailable. Use Save Draft.'; }
    }, 500);
  });
  form.addEventListener('submit', () => window.localStorage.removeItem(key));
}

function initOrganizerBreadcrumbs() {
  const match = window.location.pathname.match(/^\/organizer\/events\/([^/]+)(?:\/(.*))?$/);
  if (!match) return;
  const main = document.querySelector('main');
  if (!main || main.querySelector('.organizer-workspace-breadcrumbs')) return;
  const trail = document.createElement('nav');
  trail.className = 'organizer-workspace-breadcrumbs';
  trail.setAttribute('aria-label', 'Event workspace breadcrumb');
  const eventHref = `/organizer/events/${encodeURIComponent(match[1])}`;
  const section = String(match[2] || '').split('/')[0].replaceAll('-', ' ');
  trail.innerHTML = `<a href="/organizer/dashboard">Organizer</a><span>/</span><a href="/organizer/events">Events</a><span>/</span><a href="${eventHref}">Event workspace</a>${section ? `<span>/</span><span aria-current="page">${section}</span>` : ''}`;
  main.prepend(trail);
}

function initOperationalFilterTools() {
  const form = document.querySelector('form.admin-filters[method="GET"], form.filter-bar[method="GET"]');
  if (!form) return;
  const params = new URLSearchParams(window.location.search);
  ['type', 'msg'].forEach((key) => params.delete(key));
  const entries = Array.from(params.entries()).filter(([, value]) => String(value).trim() && value !== 'all' && value !== '1');
  const tools = document.createElement('div');
  tools.className = 'operational-filter-tools';
  tools.setAttribute('aria-label', 'Applied filters and saved view');

  const chips = document.createElement('div');
  chips.className = 'operational-filter-chips';
  if (entries.length) {
    entries.forEach(([key, value]) => {
      const link = document.createElement('a');
      const next = new URLSearchParams(params);
      next.delete(key);
      link.href = window.location.pathname + (next.toString() ? '?' + next.toString() : '');
      link.className = 'operational-filter-chip';
      link.textContent = key.replace(/([A-Z])|_/g, ' $1').trim() + ': ' + value + ' ×';
      link.setAttribute('aria-label', `Remove ${key} filter`);
      chips.appendChild(link);
    });
  } else {
    const empty = document.createElement('span');
    empty.className = 'operational-filter-empty';
    empty.textContent = 'No filters applied';
    chips.appendChild(empty);
  }
  tools.appendChild(chips);

  const storageKey = `helloRun:operationalView:${window.location.pathname}`;
  const actions = document.createElement('div');
  actions.className = 'operational-filter-actions';
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn btn-sm btn-secondary';
  save.textContent = 'Save This View';
  save.addEventListener('click', () => {
    window.localStorage.setItem(storageKey, params.toString());
    save.textContent = 'View Saved';
  });
  actions.appendChild(save);
  const saved = window.localStorage.getItem(storageKey);
  if (saved !== null) {
    const open = document.createElement('a');
    open.className = 'btn btn-sm btn-secondary';
    open.href = window.location.pathname + (saved ? '?' + saved : '');
    open.textContent = 'Open Saved View';
    actions.appendChild(open);
  }
  tools.appendChild(actions);
  form.insertAdjacentElement('afterend', tools);

  const scrollKey = `helloRun:queueScroll:${window.location.pathname}${window.location.search}`;
  const savedScroll = Number(window.sessionStorage.getItem(scrollKey) || 0);
  if (savedScroll > 0) window.requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: 'auto' }));
  document.querySelectorAll('a[href]').forEach((link) => {
    if (!link.closest('table, .payment-proof-review-list, .review-queue-list, .admin-list')) return;
    const url = new URL(link.href, window.location.origin);
    if (url.origin === window.location.origin && !url.searchParams.has('returnTo')) {
      url.searchParams.set('returnTo', window.location.pathname + window.location.search);
      link.href = url.pathname + url.search + url.hash;
    }
    link.addEventListener('click', () => window.sessionStorage.setItem(scrollKey, String(window.scrollY)));
  });
}

function getSafeOperationalReturnPath() {
  const value = new URLSearchParams(window.location.search).get('returnTo') || '';
  if (!value.startsWith('/') || value.startsWith('//') || /[\r\n]/.test(value)) return '';
  return value;
}

function initAdminPrivilegeAffordances() {
  const adminMarker = document.querySelector('[data-admin-tier]');
  if (!adminMarker || adminMarker.dataset.adminTier !== 'support') return;

  const fullAdminPatterns = [
    /^\/admin\/(?:analytics|users|audit)\/export\.(?:csv|xlsx)$/,
    /^\/admin\/users(?:\/[^/]+)?\/delete$/,
    /^\/admin\/users\/test-fixtures\/purge$/,
    /^\/admin\/events\/(?:bulk-delete|test-data\/purge)$/,
    /^\/admin\/events\/[^/]+\/delete$/,
    /^\/admin\/communications\/(?:settings|events\/[^/]+|test-email)$/,
    /^\/admin\/(?:homepage-carousel|ads|promote)$/,
    /^\/admin\/submissions\/[^/]+\/correct$/,
    /^\/admin\/(?:privacy-policy|terms-and-conditions|cookie-policy|data-usage-policy|refund-and-cancellation-policy|organiser-terms|community-guidelines|acceptable-use-policy)\/[^/]+\/publish$/
  ];
  const isRestricted = (value) => {
    try {
      const url = new URL(value, window.location.origin);
      return url.origin === window.location.origin && fullAdminPatterns.some((pattern) => pattern.test(url.pathname));
    } catch (_) {
      return false;
    }
  };

  const lock = (element) => {
    if (element.dataset.fullAdminLocked === '1') return;
    element.dataset.fullAdminLocked = '1';
    element.classList.add('full-admin-locked');
    element.setAttribute('aria-disabled', 'true');
    element.setAttribute('title', 'Requires full admin access');
    if ('disabled' in element) element.disabled = true;
    if (element.tagName === 'A') {
      element.addEventListener('click', (event) => event.preventDefault());
    }
  };

  document.querySelectorAll('a[href]').forEach((link) => {
    if (isRestricted(link.getAttribute('href'))) lock(link);
  });
  document.querySelectorAll('form[action]').forEach((form) => {
    if (!isRestricted(form.getAttribute('action'))) return;
    form.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(lock);
    if (!form.querySelector('.full-admin-requirement')) {
      const note = document.createElement('p');
      note.className = 'full-admin-requirement';
      note.textContent = 'Requires full admin access. Support administrators can review this information but cannot submit this action.';
      form.appendChild(note);
    }
  });
  document.querySelectorAll('button[formaction]').forEach((button) => {
    if (isRestricted(button.getAttribute('formaction'))) lock(button);
  });
}

function initHighRiskConfirmations() {
  const forms = Array.from(new Set([
    ...document.querySelectorAll('form[data-high-risk-confirm]'),
    ...Array.from(document.querySelectorAll('[type="submit"][data-high-risk-confirm]')).map((button) => button.form).filter(Boolean)
  ]));
  if (!forms.length) return;

  let modal = document.getElementById('highRiskConfirmModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'highRiskConfirmModal';
    modal.className = 'high-risk-confirm-backdrop';
    modal.hidden = true;
    modal.innerHTML = [
      '<div class="high-risk-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="highRiskConfirmTitle" tabindex="-1">',
      '<p class="high-risk-confirm-kicker">Review this action</p>',
      '<h2 id="highRiskConfirmTitle">Confirm action</h2>',
      '<dl class="high-risk-confirm-summary">',
      '<div><dt>Target</dt><dd data-confirm-target></dd></div>',
      '<div><dt>Impact</dt><dd data-confirm-impact></dd></div>',
      '<div><dt>Reversibility</dt><dd data-confirm-reversibility></dd></div>',
      '<div><dt>Required access</dt><dd data-confirm-privilege></dd></div>',
      '</dl>',
      '<p class="high-risk-confirm-warning" data-confirm-warning></p>',
      '<div class="high-risk-confirm-actions">',
      '<button type="button" class="btn btn-secondary" data-confirm-cancel>Cancel</button>',
      '<button type="button" class="btn btn-danger" data-confirm-proceed>Confirm action</button>',
      '</div>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);
  }

  if (modal.dataset.initialized === '1') return;
  modal.dataset.initialized = '1';
  const dialog = modal.querySelector('.high-risk-confirm-dialog');
  const title = modal.querySelector('#highRiskConfirmTitle');
  const target = modal.querySelector('[data-confirm-target]');
  const impact = modal.querySelector('[data-confirm-impact]');
  const reversibility = modal.querySelector('[data-confirm-reversibility]');
  const privilege = modal.querySelector('[data-confirm-privilege]');
  const warning = modal.querySelector('[data-confirm-warning]');
  const cancel = modal.querySelector('[data-confirm-cancel]');
  const proceed = modal.querySelector('[data-confirm-proceed]');
  let activeForm = null;
  let activeTrigger = null;

  const close = () => {
    modal.hidden = true;
    document.body.classList.remove('high-risk-confirm-open');
    if (activeTrigger) activeTrigger.focus();
    activeForm = null;
    activeTrigger = null;
  };

  const open = (form, trigger) => {
    const source = trigger?.matches?.('[data-high-risk-confirm]') ? trigger : form;
    activeForm = form;
    activeTrigger = trigger || form.querySelector('[type="submit"]');
    title.textContent = source.dataset.confirmTitle || 'Confirm action';
    target.textContent = source.dataset.confirmTarget || 'Selected record';
    impact.textContent = source.dataset.confirmImpact || 'This changes platform data and may notify affected users.';
    reversibility.textContent = source.dataset.confirmReversibility || 'Review the result after completion.';
    privilege.textContent = source.dataset.confirmPrivilege || 'Administrator';
    warning.textContent = source.dataset.confirmWarning || 'Confirm the target and impact before continuing.';
    proceed.textContent = source.dataset.confirmButton || 'Confirm action';
    proceed.disabled = false;
    modal.hidden = false;
    document.body.classList.add('high-risk-confirm-open');
    dialog.focus();
  };

  forms.forEach((form) => {
    if (form.dataset.highRiskInitialized === '1') return;
    form.dataset.highRiskInitialized = '1';
    form.addEventListener('submit', (event) => {
      if (form.dataset.highRiskConfirmed === '1') return;
      if (event.submitter?.matches?.('[data-skip-high-risk-confirm]')) return;
      const triggerRequiresConfirm = event.submitter?.matches?.('[data-high-risk-confirm]');
      if (!form.matches('[data-high-risk-confirm]') && !triggerRequiresConfirm) return;
      if (!form.reportValidity()) return;
      event.preventDefault();
      open(form, event.submitter);
    });
  });

  cancel.addEventListener('click', close);
  proceed.addEventListener('click', () => {
    if (!activeForm) return;
    const form = activeForm;
    form.dataset.highRiskConfirmed = '1';
    proceed.disabled = true;
    proceed.textContent = 'Submitting...';
    close();
    form.requestSubmit();
  });
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
    if (event.key === 'Tab') {
      const focusable = [cancel, proceed].filter((item) => !item.disabled);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
}

function initEventCarousel(carousel) {
  if (!carousel || carousel.dataset.carouselInitialized === '1') return;
  carousel.dataset.carouselInitialized = '1';

  const track = carousel.querySelector('[data-carousel-track]');
  const prevBtn = carousel.querySelector('[data-carousel-prev]');
  const nextBtn = carousel.querySelector('[data-carousel-next]');
  const dotsWrap = carousel.parentElement?.querySelector('[data-carousel-dots]');
  const cards = Array.from(track?.querySelectorAll('.featured-event-card') || []);
  const loops = carousel.dataset.carouselLoop !== '0';
  if (!track || !cards.length) return;

  const getStep = () => {
    const card = cards[0];
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
    return card.getBoundingClientRect().width + gap;
  };

  const getVisibleCount = () => Math.max(1, Math.round(track.clientWidth / Math.max(1, getStep())));
  const getPageCount = () => Math.max(1, Math.ceil(cards.length / getVisibleCount()));
  const getCurrentPage = () => Math.min(getPageCount() - 1, Math.round(track.scrollLeft / Math.max(1, getStep() * getVisibleCount())));

  const renderDots = () => {
    if (!dotsWrap) return;
    const pageCount = getPageCount();
    dotsWrap.innerHTML = '';
    if (pageCount <= 1) return;
    for (let index = 0; index < pageCount; index += 1) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'featured-events-dot';
      dot.setAttribute('aria-label', `Show featured event page ${index + 1}`);
      dot.addEventListener('click', () => {
        track.scrollTo({ left: index * getStep() * getVisibleCount(), behavior: getScrollBehavior() });
      });
      dotsWrap.appendChild(dot);
    }
  };

  const getScrollBehavior = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  const updateState = () => {
    const page = getCurrentPage();
    const pageCount = getPageCount();
    if (prevBtn) prevBtn.disabled = pageCount <= 1 || (!loops && page <= 0);
    if (nextBtn) nextBtn.disabled = pageCount <= 1 || (!loops && page >= pageCount - 1);
    if (dotsWrap) {
      Array.from(dotsWrap.children).forEach((dot, index) => {
        dot.setAttribute('aria-current', index === page ? 'true' : 'false');
      });
    }
  };

  const moveByPage = (direction) => {
    const pageCount = getPageCount();
    if (pageCount <= 1) return;
    const currentPage = getCurrentPage();
    const targetPage = loops
      ? (currentPage + direction + pageCount) % pageCount
      : Math.min(pageCount - 1, Math.max(0, currentPage + direction));
    const pageWidth = getStep() * getVisibleCount();
    track.scrollTo({ left: targetPage * pageWidth, behavior: getScrollBehavior() });
  };

  if (prevBtn) prevBtn.addEventListener('click', () => moveByPage(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => moveByPage(1));
  track.addEventListener('scroll', () => window.requestAnimationFrame(updateState), { passive: true });
  window.addEventListener('resize', () => {
    renderDots();
    updateState();
  });

  renderDots();
  updateState();

  // Suppress browser native tooltips for badges to use custom CSS tooltips
  const badgesWithTooltip = document.querySelectorAll('.mode-badge[title]');
  badgesWithTooltip.forEach((badge) => {
    badge.addEventListener('mouseenter', function() {
      this.setAttribute('data-native-title', this.title);
      this.removeAttribute('title');
    });
    badge.addEventListener('mouseleave', function() {
      const nativeTitle = this.getAttribute('data-native-title');
      if (nativeTitle) {
        this.setAttribute('title', nativeTitle);
      }
    });
    // Restore title for keyboard/accessibility
    badge.addEventListener('focus', function() {
      this.setAttribute('data-native-title', this.title || '');
      this.removeAttribute('title');
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMainUi);
} else {
  initMainUi();
}
