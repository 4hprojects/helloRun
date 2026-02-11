document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
});

/**
 * Initialize dashboard functionality
 */
function initializeDashboard() {
  setupLogoutHandler();
  setupCardInteractions();
  loadDashboardData();
}

/**
 * Setup logout button handler
 */
function setupLogoutHandler() {
  const logoutForm = document.querySelector('.logout-form');
  
  if (logoutForm) {
    logoutForm.addEventListener('submit', (e) => {
      // Optional: Add confirmation before logout
      const confirmed = confirm('Are you sure you want to logout?');
      if (!confirmed) {
        e.preventDefault();
      }
    });
  }
}

/**
 * Setup card interaction effects
 */
function setupCardInteractions() {
  const cards = document.querySelectorAll('.dashboard-card');
  
  cards.forEach((card) => {
    // Add click effect for browse events button
    const browseBtn = card.querySelector('.btn-secondary');
    if (browseBtn) {
      browseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = browseBtn.href;
      });
    }
  });
}

/**
 * Load dashboard data (placeholder for Phase 6A implementation)
 * This will fetch real data from backend APIs in future phases
 */
function loadDashboardData() {
  console.log('Dashboard initialized - Ready for Phase 6A data integration');
  
  // Placeholder for future implementations:
  // - Fetch upcoming events
  // - Fetch past events
  // - Fetch activity log
  // - Fetch certificates
  // - Fetch statistics
  
  // Example structure for future use:
  // fetchUpcomingEvents();
  // fetchPastEvents();
  // fetchActivityLog();
  // fetchCertificates();
  // fetchStatistics();
}

/**
 * Placeholder functions for Phase 6A features
 * These will be implemented when backend endpoints are ready
 */

function fetchUpcomingEvents() {
  // TODO: Phase 6A
  // GET /api/runner/events/upcoming
  // Update .dashboard-card with upcoming events list
}

function fetchPastEvents() {
  // TODO: Phase 6A
  // GET /api/runner/events/past
  // Update .dashboard-card with past events list
}

function fetchActivityLog() {
  // TODO: Phase 6A
  // GET /api/runner/activity
  // Update .dashboard-card with activity timeline
}

function fetchCertificates() {
  // TODO: Phase 6A
  // GET /api/runner/certificates
  // Update .dashboard-card with certificates grid
}

function fetchStatistics() {
  // TODO: Phase 6A
  // GET /api/runner/statistics
  // Update .dashboard-card with charts and stats
}

/**
 * Utility function to show loading state on cards
 */
function showCardLoading(cardIndex) {
  const cards = document.querySelectorAll('.dashboard-card');
  if (cards[cardIndex]) {
    const content = cards[cardIndex].querySelector('.card-content');
    content.innerHTML = '<p style="color: var(--text-secondary);">Loading...</p>';
  }
}

/**
 * Utility function to show error state on cards
 */
function showCardError(cardIndex, message = 'Failed to load data') {
  const cards = document.querySelectorAll('.dashboard-card');
  if (cards[cardIndex]) {
    const content = cards[cardIndex].querySelector('.card-content');
    content.innerHTML = `<p style="color: var(--danger-color);">${message}</p>`;
  }
}

/**
 * Utility function to update card content
 */
function updateCardContent(cardIndex, htmlContent) {
  const cards = document.querySelectorAll('.dashboard-card');
  if (cards[cardIndex]) {
    const content = cards[cardIndex].querySelector('.card-content');
    content.innerHTML = htmlContent;
  }
}