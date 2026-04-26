// Initialize Lucide icons
lucide.createIcons();

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const backToTopBtn = document.getElementById('globalBackToTopBtn');
  
  if (menuToggle && navLinks) {
    const firstFocusableLink = () => navLinks.querySelector('a, button, [tabindex]:not([tabindex="-1"])');

    const syncToggleIcon = (isOpen) => {
      const icon = menuToggle.querySelector('i');
      icon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
      lucide.createIcons();
    };

    const openMenu = () => {
      navLinks.classList.add('active');
      navLinks.setAttribute('data-open', 'true');
      menuToggle.setAttribute('aria-expanded', 'true');
      menuToggle.setAttribute('aria-label', 'Close navigation menu');
      syncToggleIcon(true);
    };

    const closeMenu = ({ returnFocus = false } = {}) => {
      navLinks.classList.remove('active');
      navLinks.setAttribute('data-open', 'false');
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
      if (!event.target.closest('.nav-container') && navLinks.classList.contains('active')) {
        closeMenu();
      }
    });

    navLinks.addEventListener('click', function(event) {
      if (!event.target.closest('a') || !navLinks.classList.contains('active')) return;
      closeMenu();
    });

    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && navLinks.classList.contains('active')) {
        closeMenu({ returnFocus: true });
      }
    });

    window.addEventListener('resize', function() {
      if (window.innerWidth > 768 && navLinks.classList.contains('active')) {
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
});
