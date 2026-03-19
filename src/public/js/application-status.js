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
    const refreshBtn = document.querySelector('[data-refresh-status]');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        window.location.reload();
      });
    }

    const copyBtn = document.querySelector('[data-copy-application-id]');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        this.copyApplicationId();
      });
    }
  }

  /**
   * Auto-refresh status every 5 minutes if pending
   */
  startAutoRefresh() {
    const shell = document.querySelector('[data-application-status]');
    if (!shell) return;
    const status = String(shell.getAttribute('data-application-status') || '').trim();
    const isPending = status === 'pending' || status === 'under_review';

    if (isPending) {
      setInterval(() => {
        window.location.reload();
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Copy application ID to clipboard
   */
  copyApplicationId() {
    const applicationId = document.querySelector('.application-id');
    if (!applicationId) return;

    const text = String(applicationId.textContent || '').trim();
    if (!text || !navigator.clipboard) return;

    navigator.clipboard.writeText(text)
      .then(() => {
        this.showCopyNotification();
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
      });
  }

  /**
   * Show copy notification
   */
  showCopyNotification() {
    const notification = document.createElement('div');
    notification.className = 'copy-toast';
    notification.textContent = 'Application ID copied to clipboard.';
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
