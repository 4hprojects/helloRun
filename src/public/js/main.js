// Mobile menu toggle
function initMainUi() {
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const runProofCallouts = Array.from(document.querySelectorAll('[data-nav-run-proof-callout]'));
  const backToTopBtn = document.getElementById('globalBackToTopBtn');
  const eventsFilterForm = document.querySelector('.filter-bar[action="/events"]');
  const eventCarousels = Array.from(document.querySelectorAll('[data-event-carousel]'));

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
