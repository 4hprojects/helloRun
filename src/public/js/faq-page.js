(function faqPageModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) root.addEventListener('DOMContentLoaded', () => api.initFaqPage(root.document, root));
})(typeof window !== 'undefined' ? window : null, function createFaqPageModule() {
  'use strict';

  function normalizeSearchValue(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function entrySearchText(entry) {
    return normalizeSearchValue(`${entry.textContent || ''} ${entry.dataset.faqKeywords || ''}`);
  }

  function filterFaq(documentRef, rawQuery) {
    const query = normalizeSearchValue(rawQuery);
    const entries = Array.from(documentRef.querySelectorAll('[data-faq-entry]'));
    const categories = Array.from(documentRef.querySelectorAll('[data-faq-category]'));
    const categoryLinks = Array.from(documentRef.querySelectorAll('[data-faq-category-link]'));
    let visibleCount = 0;

    entries.forEach((entry) => {
      const matches = !query || entrySearchText(entry).includes(query);
      entry.hidden = !matches;
      if (matches) visibleCount += 1;

      if (query && matches && !entry.open) {
        entry.dataset.faqAutoOpened = 'true';
        entry.open = true;
      } else if (!query && entry.dataset.faqAutoOpened === 'true') {
        entry.open = false;
        delete entry.dataset.faqAutoOpened;
      }
    });

    const matchedCategoryIds = new Set();
    categories.forEach((category) => {
      const hasMatch = Array.from(category.querySelectorAll('[data-faq-entry]')).some((entry) => !entry.hidden);
      category.hidden = !hasMatch;
      if (hasMatch) matchedCategoryIds.add(category.dataset.faqCategory);
    });

    categoryLinks.forEach((link) => {
      link.classList.toggle('is-match', Boolean(query) && matchedCategoryIds.has(link.dataset.faqCategoryLink));
    });

    const clearButton = documentRef.querySelector('[data-faq-clear]');
    const emptyState = documentRef.querySelector('[data-faq-empty]');
    const status = documentRef.querySelector('[data-faq-status]');
    if (clearButton) clearButton.hidden = !query;
    if (emptyState) emptyState.hidden = visibleCount !== 0;
    if (status) {
      status.textContent = query
        ? `${visibleCount} ${visibleCount === 1 ? 'answer' : 'answers'} found for “${String(rawQuery).trim()}”`
        : `${entries.length} answers across ${categories.length} topics`;
    }

    return { query, visibleCount, matchedCategoryIds: [...matchedCategoryIds] };
  }

  function openHashTarget(documentRef, windowRef) {
    const rawHash = windowRef && windowRef.location ? windowRef.location.hash : '';
    if (!rawHash || rawHash.length < 2) return false;

    let targetId;
    try {
      targetId = decodeURIComponent(rawHash.slice(1));
    } catch (_error) {
      return false;
    }

    const target = documentRef.getElementById(targetId);
    if (!target) return false;
    if (target.matches('[data-faq-entry]')) {
      target.hidden = false;
      target.open = true;
      const summary = target.querySelector('summary');
      if (summary) {
        windowRef.setTimeout(() => summary.focus({ preventScroll: true }), 0);
      }
    }
    return true;
  }

  function initFaqPage(documentRef, windowRef) {
    const input = documentRef.querySelector('[data-faq-search]');
    if (!input) return null;

    const clearButtons = Array.from(documentRef.querySelectorAll('[data-faq-clear], [data-faq-empty-clear]'));
    const clear = () => {
      input.value = '';
      filterFaq(documentRef, '');
      input.focus();
    };

    input.addEventListener('input', () => filterFaq(documentRef, input.value));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && input.value) {
        event.preventDefault();
        clear();
      }
    });
    clearButtons.forEach((button) => button.addEventListener('click', clear));

    documentRef.querySelectorAll('[data-faq-entry]').forEach((entry) => {
      entry.addEventListener('toggle', () => {
        if (!entry.open && entry.dataset.faqAutoOpened === 'true') delete entry.dataset.faqAutoOpened;
      });
    });

    if (windowRef) {
      windowRef.addEventListener('hashchange', () => openHashTarget(documentRef, windowRef));
      openHashTarget(documentRef, windowRef);
    }
    filterFaq(documentRef, '');

    if (windowRef && windowRef.lucide) windowRef.lucide.createIcons();
    return { clear, filter: (value) => filterFaq(documentRef, value) };
  }

  return { entrySearchText, filterFaq, initFaqPage, normalizeSearchValue, openHashTarget };
});
