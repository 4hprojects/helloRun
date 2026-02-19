/* ==========================================
   APPLICATION STATUS PAGE - INTERACTIONS
   ========================================== */

class ApplicationStatusPage {
  constructor() {
    this.init();
  }

  init() {
    this.initializeLucideIcons();
    this.setupEventListeners();
    this.startAutoRefresh();
  }

  /**
   * Initialize Lucide Icons
   */
  initializeLucideIcons() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Add future event listeners here
  }

  /**
   * Auto-refresh status every 5 minutes if pending
   */
  startAutoRefresh() {
    const statusBadge = document.querySelector('.status-badge');
    if (!statusBadge) return;

    const status = statusBadge.textContent.toLowerCase();
    const isPending = status.includes('pending') || status.includes('under review');

    if (isPending) {
      // Refresh every 5 minutes
      setInterval(() => {
        location.reload();
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Copy application ID to clipboard
   */
  copyApplicationId() {
    const applicationId = document.querySelector('.application-id');
    if (!applicationId) return;

    const text = applicationId.textContent;
    navigator.clipboard.writeText(text).then(() => {
      this.showCopyNotification();
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  /**
   * Show copy notification
   */
  showCopyNotification() {
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = 'Application ID copied!';
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 2000);
  }
}

/**
 * Initialize page when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  window.applicationStatusPage = new ApplicationStatusPage();
});