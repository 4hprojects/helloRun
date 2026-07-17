(function () {
  'use strict';

  const form = document.querySelector('form.create-event-form');
  const nav = form?.querySelector('[data-builder-nav]');
  if (!form || !nav) return;

  const groups = [
    { id: 'basics', label: 'Basics' },
    { id: 'participation', label: 'Participation' },
    { id: 'commerce', label: 'Commerce' },
    { id: 'public-experience', label: 'Public Experience' },
    { id: 'review', label: 'Review' }
  ];
  const links = Array.from(nav.querySelectorAll('[data-builder-group-link]'));
  const groupNodes = Array.from(form.querySelectorAll('[data-builder-group]'));
  const menuToggle = nav.querySelector('[data-builder-menu-toggle]');
  const menuList = nav.querySelector('.builder-group-nav-list');
  const mobilePosition = nav.querySelector('#builderMobilePosition');
  const mobileTitle = nav.querySelector('#builderMobileTitle');
  const mobileQuery = window.matchMedia('(max-width: 640px)');
  let activeGroup = 'basics';
  const errorFieldFallbacks = [
    [/^(raceCategor|raceDistances)/, 'race-categories-step'],
    [/^(distancePricing|pricingPeriod|customizedOption|registrationPackage|pricingMode|fee)/, 'pricing-step'],
    [/^(payment|paymentQr)/, 'payment-setup-step'],
    [/^(physicalReward|specialReward)/, 'rewards-step'],
    [/^(logo|banner|poster|gallery)/, 'media-step'],
    [/^(venue|geo|city|country)/, 'location-virtual-step'],
    [/^(virtual|proofTypesAllowed|acceptedRunTypes|minimumActivity)/, 'location-virtual-step'],
    [/^(eventDetails|additionalInfo)/, 'event-details-step']
  ];

  document.documentElement.classList.add('event-builder-enhanced');

  function groupForNode(node) {
    return node?.closest?.('[data-builder-group]')?.dataset.builderGroup || '';
  }

  function findField(fieldName) {
    if (!fieldName) return null;
    const byId = document.getElementById(fieldName);
    if (byId) return byId;
    try {
      const byName = form.querySelector('[name="' + CSS.escape(fieldName) + '"]');
      if (byName) return byName;
    } catch (_error) {
      // Continue to a section-level fallback for compound server errors.
    }
    const fallback = errorFieldFallbacks.find(([pattern]) => pattern.test(fieldName));
    return fallback ? document.getElementById(fallback[1]) : null;
  }

  function decodeFragment(value) {
    try {
      return decodeURIComponent(String(value || '').replace(/^#/, ''));
    } catch (_error) {
      return '';
    }
  }

  function isControlComplete(control) {
    if (control.disabled || control.closest('[style*="display: none"]')) return true;
    if (control.type === 'checkbox' || control.type === 'radio') {
      const namedControl = control.name ? form.elements.namedItem(control.name) : null;
      const sameName = namedControl && typeof namedControl.length === 'number'
        ? Array.from(namedControl)
        : [namedControl || control];
      return sameName.some((item) => item.checked);
    }
    return String(control.value || '').trim().length > 0;
  }

  function updateGroupStates() {
    groups.forEach((group) => {
      const nodes = groupNodes.filter((node) => node.dataset.builderGroup === group.id);
      const hasError = nodes.some((node) => node.matches('.has-error') || node.querySelector('.has-error, .error-text, [aria-invalid="true"]'));
      const required = nodes.flatMap((node) => Array.from(node.querySelectorAll('[required]')));
      const isComplete = required.length > 0 && required.every(isControlComplete);
      const link = links.find((item) => item.dataset.builderGroupLink === group.id);
      link?.classList.toggle('has-errors', hasError);
      link?.classList.toggle('is-complete', !hasError && isComplete);
      if (link) {
        const state = hasError ? 'Contains errors' : (isComplete ? 'Required fields complete' : 'In progress');
        link.setAttribute('aria-label', group.label + ': ' + state);
      }
    });
  }

  function applyMobileDisclosure() {
    groupNodes.forEach((node) => {
      const actionsOnly = mobileQuery.matches
        && node.dataset.builderGroup === 'review'
        && node.classList.contains('form-section-review')
        && activeGroup !== 'review';
      node.classList.toggle('is-builder-actions-only', actionsOnly);
      if (mobileQuery.matches) node.hidden = node.dataset.builderGroup !== activeGroup && !actionsOnly;
      else node.hidden = false;
    });
    links.forEach((link) => {
      link.setAttribute('aria-expanded', String(!mobileQuery.matches || link.dataset.builderGroupLink === activeGroup));
    });
  }

  function setActiveGroup(groupId, options) {
    const group = groups.find((item) => item.id === groupId) || groups[0];
    const settings = options || {};
    activeGroup = group.id;
    links.forEach((link) => {
      const active = link.dataset.builderGroupLink === activeGroup;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    if (mobilePosition) mobilePosition.textContent = 'Group ' + (groups.indexOf(group) + 1) + ' of ' + groups.length;
    if (mobileTitle) mobileTitle.textContent = group.label;
    applyMobileDisclosure();
    if (settings.focusGroup) {
      const firstNode = groupNodes.find((node) => node.dataset.builderGroup === activeGroup && !node.hidden);
      firstNode?.querySelector('input, select, textarea, button, [tabindex="-1"]')?.focus({ preventScroll: true });
    }
  }

  function closeMenu() {
    nav.classList.remove('is-menu-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }

  menuToggle?.addEventListener('click', () => {
    const open = !nav.classList.contains('is-menu-open');
    nav.classList.toggle('is-menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  links.forEach((link) => {
    link.addEventListener('click', () => {
      setActiveGroup(link.dataset.builderGroupLink);
      closeMenu();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-menu-open')) {
      closeMenu();
      menuToggle?.focus();
    }
  });

  document.querySelectorAll('[data-builder-error-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const fieldName = decodeFragment(link.getAttribute('href'));
      const field = findField(fieldName);
      if (!field) return;
      event.preventDefault();
      const groupId = groupForNode(field);
      if (groupId) setActiveGroup(groupId);
      history.replaceState(null, '', '#' + encodeURIComponent(fieldName));
      requestAnimationFrame(() => {
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        field.focus({ preventScroll: true });
      });
    });
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (mobileQuery.matches) return;
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const groupId = groupForNode(visible?.target);
      if (groupId) setActiveGroup(groupId);
    }, { rootMargin: '-22% 0px -62% 0px', threshold: [0.1, 0.35] });
    groupNodes.forEach((node) => observer.observe(node));
  }

  form.addEventListener('input', updateGroupStates);
  form.addEventListener('change', updateGroupStates);
  mobileQuery.addEventListener?.('change', () => {
    applyMobileDisclosure();
    closeMenu();
  });

  const hashField = findField(decodeFragment(window.location.hash));
  const invalidField = form.querySelector('.has-error input, .has-error select, .has-error textarea, [aria-invalid="true"]');
  const initialGroup = groupForNode(hashField) || groupForNode(invalidField) || 'basics';
  updateGroupStates();
  setActiveGroup(initialGroup);
  if (invalidField) requestAnimationFrame(() => invalidField.focus({ preventScroll: true }));
}());
