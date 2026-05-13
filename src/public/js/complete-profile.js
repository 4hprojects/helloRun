/* ==========================================
   APPLICATION STATUS PAGE – INTERACTIONS
   ========================================== */

/**
 * Main Application Class
 * Handles both status view and multi‑step form
 */
class ApplicationStatusPage {
  constructor() {
    this.init();
  }

  init() {
    this.initLucideIcons();
    this.initCopyButton();
    this.initAutoRefresh();
    this.initMultiStepForm();
  }

  /**
   * Initialize Lucide Icons
   */
  initLucideIcons() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    } else {
      // Retry after a short delay if lucide not loaded yet
      setTimeout(() => {
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }, 200);
    }
  }

  /**
   * Copy Application ID to clipboard (status view)
   */
  initCopyButton() {
    const copyBtn = document.querySelector('.copy-id-btn');
    if (!copyBtn) return;

    copyBtn.addEventListener('click', async () => {
      const appId = document.querySelector('.application-id')?.textContent;
      if (!appId) return;

      try {
        await navigator.clipboard.writeText(appId);
        this.showNotification('Application ID copied!', 'success');
      } catch (err) {
        console.error('Copy failed:', err);
        this.showNotification('Failed to copy', 'error');
      }
    });
  }

  /**
   * Auto‑refresh status for pending/under review (status view)
   */
  initAutoRefresh() {
    const statusBadge = document.querySelector('.status-badge');
    if (!statusBadge) return;

    const status = statusBadge.textContent.toLowerCase();
    const isPending = status.includes('pending') || status.includes('under review');

    if (isPending) {
      // Refresh every 5 minutes only if page is visible
      setInterval(() => {
        if (!document.hidden) {
          location.reload();
        }
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Show a temporary notification
   * @param {string} message - Notification text
   * @param {string} type - 'success' or 'error'
   */
  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.setAttribute('role', 'alert');
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * Initialize multi‑step form (if present)
   */
  initMultiStepForm() {
    const form = document.getElementById('organizerApplicationForm');
    if (!form) return;

    this.form = form;
    this.steps = Array.from(form.querySelectorAll('.form-section'));
    this.progressSteps = Array.from(form.querySelectorAll('.progress-step'));
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.submitBtn = document.getElementById('submitBtn');
    this.currentStep = 0; // 0‑based

    // Validation rules per step
    this.validators = {
      0: () => this.validateStep1(),
      1: () => this.validateStep2(),
      2: () => this.validateStep3()
    };

    this.setupFormEvents();
    this.updateStepVisibility();
    this.setupFileUploads();
    this.setupRealTimeValidation();
  }

  /**
   * Set up event listeners for the form
   */
  setupFormEvents() {
    // Progress step clicks
    this.progressSteps.forEach((step, index) => {
      step.addEventListener('click', () => this.goToStep(index));
      step.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.goToStep(index);
        }
      });
    });

    // Navigation buttons
    this.prevBtn.addEventListener('click', () => this.goToStep(this.currentStep - 1));
    this.nextBtn.addEventListener('click', () => this.goToStep(this.currentStep + 1));

    // Form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  /**
   * Navigate to a specific step
   * @param {number} stepIndex - 0‑based step index
   */
  goToStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.steps.length) return;

    // Validate current step before moving forward
    if (stepIndex > this.currentStep) {
      if (!this.validators[this.currentStep]()) {
        this.showStepErrors(this.currentStep);
        return;
      }
    }

    // If moving to review step, populate summary
    if (stepIndex === 2) {
      this.populateReviewSummary();
    }

    this.currentStep = stepIndex;
    this.updateStepVisibility();
    this.focusOnStep();
  }

  /**
   * Update UI based on current step
   */
  updateStepVisibility() {
    // Show/hide sections
    this.steps.forEach((step, index) => {
      step.classList.toggle('active', index === this.currentStep);
      step.hidden = index !== this.currentStep;
    });

    // Update progress steps
    this.progressSteps.forEach((step, index) => {
      step.classList.toggle('active', index === this.currentStep);
      step.classList.toggle('completed', index < this.currentStep);
      step.setAttribute('aria-selected', index === this.currentStep);
      step.setAttribute('tabindex', index === this.currentStep ? '0' : '-1');
    });

    // Update navigation buttons
    this.prevBtn.disabled = this.currentStep === 0;
    this.nextBtn.hidden = this.currentStep === 2;
    this.submitBtn.hidden = this.currentStep !== 2;
  }

  /**
   * Move focus to the current step heading for accessibility
   */
  focusOnStep() {
    const heading = this.steps[this.currentStep].querySelector('h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }

  /**
   * Show error messages for a specific step
   * @param {number} stepIndex
   */
  showStepErrors(stepIndex) {
    const step = this.steps[stepIndex];
    const inputs = step.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (!input.checkValidity()) {
        this.showFieldError(input, input.validationMessage);
      }
    });
  }

  /* ----- Validation Helpers ----- */
  validateStep1() {
    let isValid = true;
    const requiredFields = [
      'businessName',
      'businessType',
      'contactPhone',
      'businessAddress'
    ];

    requiredFields.forEach(id => {
      const field = document.getElementById(id);
      if (!field || !field.value.trim()) {
        this.showFieldError(field, `${field.labels?.[0]?.textContent.replace('*', '').trim()} is required`);
        isValid = false;
      } else {
        this.clearFieldError(field);
      }
    });

    // Additional validation (e.g., phone format) can be added here
    return isValid;
  }

  validateStep2() {
    let isValid = true;
    const fileFields = ['idProof'];

    fileFields.forEach(id => {
      const field = document.getElementById(id);
      const preview = document.getElementById(`${id}Preview`);
      const hasExistingFile = field?.dataset?.existingFile === '1';
      const hasFile = hasExistingFile || (field && field.files.length > 0) || (preview && !preview.hidden);

      if (!hasFile) {
        this.showFieldError(field, 'This file is required');
        isValid = false;
      } else {
        this.clearFieldError(field);
      }
    });

    return isValid;
  }

  validateStep3() {
    const terms = document.getElementById('terms');
    if (!terms.checked) {
      this.showFieldError(terms, 'You must agree to the terms and conditions');
      return false;
    }
    this.clearFieldError(terms);
    return true;
  }

  /**
   * Show error for a specific field
   * @param {HTMLElement} field - Input/select/textarea element
   * @param {string} message - Error message
   */
  showFieldError(field, message) {
    const container = field.closest('.input-group') || field.closest('.terms-group');
    if (!container) return;

    const errorDiv = container.querySelector('.input-error');
    if (!errorDiv) return;

    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', errorDiv.id);
  }

  /**
   * Clear error for a field
   * @param {HTMLElement} field
   */
  clearFieldError(field) {
    const container = field.closest('.input-group') || field.closest('.terms-group');
    if (!container) return;

    const errorDiv = container.querySelector('.input-error');
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.classList.remove('show');
    }
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
  }

  /**
   * Set up real‑time validation on blur and input
   */
  setupRealTimeValidation() {
    const fields = this.form.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
      field.addEventListener('blur', () => {
        if (field.validity) {
          if (!field.checkValidity()) {
            this.showFieldError(field, field.validationMessage);
          } else {
            this.clearFieldError(field);
          }
        }
      });

      // For checkboxes and file inputs, validate on change
      if (field.type === 'checkbox' || field.type === 'file') {
        field.addEventListener('change', () => {
          if (!field.checkValidity()) {
            this.showFieldError(field, field.validationMessage);
          } else {
            this.clearFieldError(field);
          }
        });
      }
    });

    // Additional real‑time validation for text fields (optional)
    // could be added here
  }

  /* ----- File Upload Handling ----- */
  setupFileUploads() {
    ['idProof', 'businessProof'].forEach(id => {
      this.setupFileUpload(id);
    });
  }

  setupFileUpload(inputId) {
    const input = document.getElementById(inputId);
    const zone = document.getElementById(`${inputId}Zone`);
    const preview = document.getElementById(`${inputId}Preview`);
    const nameSpan = document.getElementById(`${inputId}Name`);
    const sizeSpan = document.getElementById(`${inputId}Size`);
    const thumbnail = document.getElementById(`${inputId}Thumbnail`);
    const removeBtn = document.getElementById(`${inputId}Remove`);

    if (!input || !zone) return;

    // Click zone to trigger file input
    zone.addEventListener('click', () => input.click());

    // Keyboard activation
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        input.click();
      }
    });

    // Drag & drop
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        const confirmed = await this.confirmFileReplacement(input);
        if (!confirmed) {
          this.clearFileInput(input, preview, nameSpan, sizeSpan, thumbnail);
          return;
        }
        this.handleFileSelect(input, preview, nameSpan, sizeSpan, thumbnail, removeBtn);
      }
    });

    // File selection via input
    input.addEventListener('change', async () => {
      const confirmed = await this.confirmFileReplacement(input);
      if (!confirmed) {
        this.clearFileInput(input, preview, nameSpan, sizeSpan, thumbnail);
        return;
      }
      this.handleFileSelect(input, preview, nameSpan, sizeSpan, thumbnail, removeBtn);
    });

    // Remove button
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearFileInput(input, preview, nameSpan, sizeSpan, thumbnail);
      });
    }
  }

  /**
   * Handle file selection: update preview, validate size/type
   */
  handleFileSelect(input, preview, nameSpan, sizeSpan, thumbnail, removeBtn) {
    const file = input.files[0];
    if (!file) {
      this.clearFileInput(input, preview, nameSpan, sizeSpan, thumbnail);
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.showFieldError(input, 'File size must be less than 5MB');
      this.clearFileInput(input, preview, nameSpan, sizeSpan, thumbnail);
      return;
    }

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      this.showFieldError(input, 'Only PDF, JPG, PNG, and WebP files are allowed');
      this.clearFileInput(input, preview, nameSpan, sizeSpan, thumbnail);
      return;
    }

    this.clearFieldError(input);

    // Update preview
    nameSpan.textContent = file.name;
    sizeSpan.textContent = this.formatFileSize(file.size);
    preview.hidden = false;

    // Generate thumbnail for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        thumbnail.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    } else {
      // PDF icon or generic file icon
      thumbnail.innerHTML = '<svg data-lucide="file-text" width="24" height="24"></svg>';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }

  confirmFileReplacement(input) {
    if (!input || input.dataset.existingFile !== '1' || !input.files.length) {
      return Promise.resolve(true);
    }

    const existingLabel = input.dataset.existingLabel || 'the previously uploaded document';
    const selectedFileName = input.files[0]?.name || 'the selected file';

    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'replacement-modal-backdrop';
      modal.setAttribute('role', 'presentation');
      modal.innerHTML = `
        <div class="replacement-modal" role="dialog" aria-modal="true" aria-labelledby="replacementModalTitle" aria-describedby="replacementModalDescription">
          <div class="replacement-modal-icon">
            <svg data-lucide="file-warning" width="24" height="24" aria-hidden="true"></svg>
          </div>
          <div class="replacement-modal-content">
            <h3 id="replacementModalTitle">Replace uploaded document?</h3>
            <p id="replacementModalDescription">
              You already uploaded ${this.escapeHtml(existingLabel)}. If you continue, ${this.escapeHtml(selectedFileName)} will replace it when you save updates, and the previous uploaded file will be deleted.
            </p>
          </div>
          <div class="replacement-modal-actions">
            <button type="button" class="btn btn-secondary" data-cancel-replacement>Keep Previous File</button>
            <button type="button" class="btn btn-primary" data-confirm-replacement>Replace File</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      if (typeof lucide !== 'undefined') lucide.createIcons();

      const cancelBtn = modal.querySelector('[data-cancel-replacement]');
      const confirmBtn = modal.querySelector('[data-confirm-replacement]');
      const close = (confirmed) => {
        modal.remove();
        resolve(confirmed);
      };

      cancelBtn.addEventListener('click', () => close(false));
      confirmBtn.addEventListener('click', () => close(true));
      modal.addEventListener('click', (event) => {
        if (event.target === modal) close(false);
      });
      modal.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close(false);
      });

      confirmBtn.focus();
    });
  }

  /**
   * Clear file input and hide preview
   */
  clearFileInput(input, preview, nameSpan, sizeSpan, thumbnail) {
    input.value = ''; // Reset file input
    preview.hidden = true;
    nameSpan.textContent = '';
    sizeSpan.textContent = '';
    thumbnail.innerHTML = '';
  }

  /**
   * Format file size in human readable form
   * @param {number} bytes
   * @returns {string}
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  /* ----- Review Summary (Step 3) ----- */
  populateReviewSummary() {
    const summary = document.getElementById('reviewSummary');
    if (!summary) return;

    const formData = new FormData(this.form);
    const businessName = formData.get('businessName') || 'Not provided';
    const businessType = formData.get('businessType') || 'Not selected';
    const contactPhone = formData.get('contactPhone') || 'Not provided';
    const businessReg = formData.get('businessRegistrationNumber') || 'Not provided';
    const businessAddress = formData.get('businessAddress') || 'Not provided';
    const additionalInfo = formData.get('additionalInfo') || 'Not provided';

    // Map business type to display text
    const typeMap = {
      'individual': 'Individual/Solo Organizer',
      'company': 'Company/Commercial',
      'ngo': 'Non-Profit/NGO',
      'sports_club': 'Sports Club/Association'
    };
    const businessTypeDisplay = typeMap[businessType] || businessType;

    // File names
    const idProofInput = document.getElementById('idProof');
    const businessProofInput = document.getElementById('businessProof');
    const idProofFile = idProofInput.files[0];
    const businessProofFile = businessProofInput.files[0];
    const idProofName = idProofFile
      ? idProofFile.name
      : (idProofInput?.dataset?.existingFile === '1' ? (idProofInput.dataset.existingLabel || 'Current file on record') : 'Not uploaded');
    const businessProofName = businessProofFile
      ? businessProofFile.name
      : (businessProofInput?.dataset?.existingFile === '1' ? (businessProofInput.dataset.existingLabel || 'Current file on record') : 'Not uploaded');

    summary.innerHTML = `
      <div class="review-panel">
        <h4><svg data-lucide="briefcase" width="18" height="18"></svg> Business Information</h4>
        <div class="review-grid">
          <div class="review-item">
            <span class="review-label">Business Name</span>
            <span class="review-value">${this.escapeHtml(businessName)}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Business Type</span>
            <span class="review-value">${this.escapeHtml(businessTypeDisplay)}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Contact Phone</span>
            <span class="review-value">${this.escapeHtml(contactPhone)}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Registration Number</span>
            <span class="review-value">${this.escapeHtml(businessReg)}</span>
          </div>
          <div class="review-item full-width">
            <span class="review-label">Business Address</span>
            <span class="review-value">${this.escapeHtml(businessAddress)}</span>
          </div>
          <div class="review-item full-width">
            <span class="review-label">Additional Information</span>
            <span class="review-value">${this.escapeHtml(additionalInfo)}</span>
          </div>
        </div>

        <h4 style="margin-top: 1.5rem;"><svg data-lucide="upload-cloud" width="18" height="18"></svg> Uploaded Documents</h4>
        <div class="review-files">
          <div class="review-file">
            <svg data-lucide="file" width="18" height="18"></svg>
            <span>ID Proof: ${this.escapeHtml(idProofName)}</span>
          </div>
          <div class="review-file">
            <svg data-lucide="file" width="18" height="18"></svg>
            <span>Business Proof: ${this.escapeHtml(businessProofName)}</span>
          </div>
        </div>
      </div>
    `;

    // Reinitialize Lucide icons in the new content
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /**
   * Simple escape to prevent XSS
   */
  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ----- Form Submission ----- */
  async handleSubmit(e) {
    e.preventDefault();

    if (!this.validateStep3()) {
      return;
    }

    this.submitBtn.classList.add('loading');
    this.submitBtn.disabled = true;
    this.prevBtn.disabled = true;

    const successMsg = document.getElementById('formSuccessMessage');
    if (successMsg) {
      successMsg.hidden = false;
    }

    try {
      const response = await fetch(this.form.action, {
        method: this.form.method || 'POST',
        body: new FormData(this.form),
        headers: {
          Accept: 'application/json'
        }
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        const message = result.message || 'Application submission failed. Please review the form and try again.';
        this.showNotification(message, 'error');
        if (result.errors && typeof result.errors === 'object') {
          Object.entries(result.errors).forEach(([fieldName, errorMessage]) => {
            const field = this.form.querySelector(`[name="${fieldName}"]`);
            if (field) this.showFieldError(field, errorMessage);
          });
        }
        this.submitBtn.classList.remove('loading');
        this.submitBtn.disabled = false;
        this.prevBtn.disabled = false;
        if (successMsg) successMsg.hidden = true;
        return;
      }

      window.location.assign(result.redirectUrl || '/organizer/application-status');
    } catch (error) {
      console.error('Application submission failed:', error);
      this.showNotification('Application submission failed. Please try again.', 'error');
      this.submitBtn.classList.remove('loading');
      this.submitBtn.disabled = false;
      this.prevBtn.disabled = false;
      if (successMsg) successMsg.hidden = true;
    }
  }
}

/**
 * Initialize page when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  window.applicationStatusPage = new ApplicationStatusPage();
});

// Add basic notification styles dynamically (optional, but included in CSS)
// The CSS already includes .notification styles? We should ensure they exist.
// We'll add a style block if not present (but we assume CSS already covers it).
// For safety, we can add minimal inline styles if needed, but better to rely on CSS.
