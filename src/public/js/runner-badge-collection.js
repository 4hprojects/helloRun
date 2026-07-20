(function () {
  'use strict';

  function initializeIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function setupFilters() {
    var filters = document.querySelector('[data-badge-filters]');
    if (!filters) return;

    var buttons = Array.from(filters.querySelectorAll('[data-scope]'));
    var cards = Array.from(document.querySelectorAll('[data-badge-grid] [data-badge-scope]'));
    var status = document.querySelector('[data-badge-filter-status]');

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var selectedScope = button.dataset.scope || 'all';
        var visibleCount = 0;

        buttons.forEach(function (candidate) {
          var isSelected = candidate === button;
          candidate.classList.toggle('is-active', isSelected);
          candidate.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        });

        cards.forEach(function (card) {
          var isVisible = selectedScope === 'all' || card.dataset.badgeScope === selectedScope;
          card.hidden = !isVisible;
          if (isVisible) visibleCount += 1;
        });

        if (status) {
          var scopeLabel = selectedScope === 'all' ? 'all' : button.childNodes[0].textContent.trim();
          status.textContent = 'Showing ' + scopeLabel + ' ' + visibleCount + ' verified badge' + (visibleCount === 1 ? '' : 's') + '.';
        }
      });
    });
  }

  function fallbackCopy(value) {
    var field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    var copied = document.execCommand('copy');
    field.remove();
    return copied;
  }

  function setupCopyLink() {
    var button = document.querySelector('[data-copy-collection-link]');
    if (!button) return;
    var feedback = document.querySelector('[data-copy-feedback]');

    button.addEventListener('click', async function () {
      var value = button.dataset.collectionUrl || window.location.href;
      var copied = false;
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(value);
          copied = true;
        } else {
          copied = fallbackCopy(value);
        }
      } catch (_error) {
        copied = fallbackCopy(value);
      }

      if (feedback) feedback.textContent = copied ? 'Collection link copied.' : 'Copy failed. Select the link instead.';
    });
  }

  initializeIcons();
  setupFilters();
  setupCopyLink();
})();
