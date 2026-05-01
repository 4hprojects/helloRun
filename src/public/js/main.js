// Mobile menu toggle
function initMainUi() {
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const backToTopBtn = document.getElementById('globalBackToTopBtn');
  const eventsFilterForm = document.querySelector('.filter-bar[action="/events"]');

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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMainUi);
} else {
  initMainUi();
}
