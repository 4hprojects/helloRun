/* ==========================================
   COMPLETE PROFILE FORM - MAIN LOGIC (REFINED)
   ========================================== */

class CompleteProfileForm {
  constructor() {
    this.form = document.getElementById('completeProfileForm');
    this.currentStep = 1;
    this.totalSteps = 3;
    this.uploadedFiles = {
      idProof: null,
      businessProof: null
    };
    this.formData = new FormData();
    this.isSubmitting = false;

    this.init();
  }

  init() {
    if (!this.form) {
      console.error('Form not found');
      return;
    }

    this.setupEventListeners();
    this.initializeLucideIcons();
    this.setupRealTimeValidation();
    this.setupClickableSteps();
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
   * Setup all event listeners
   */
  setupEventListeners() {
    // File upload zones - drag and drop
    document.querySelectorAll('.file-upload-zone').forEach(zone => {
      zone.addEventListener('dragover', (e) => this.handleDragOver(e, zone));
      zone.addEventListener('dragleave', (e) => this.handleDragLeave(e, zone));
      zone.addEventListener('drop', (e) => this.handleDrop(e, zone));
      zone.addEventListener('click', () => this.handleZoneClick(zone));
    });

    // File inputs
    document.querySelectorAll('input[type="file"]').forEach(input => {
      input.addEventListener('change', (e) => this.handleFileSelect(e));
    });

    // Form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Navigation buttons
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());
    if (prevBtn) prevBtn.addEventListener('click', () => this.prevStep());

    // File remove buttons
    const idProofRemove = document.getElementById('idProofRemove');
    const businessProofRemove = document.getElementById('businessProofRemove');

    if (idProofRemove) idProofRemove.addEventListener('click', () => this.removeFile('idProof'));
    if (businessProofRemove) businessProofRemove.addEventListener('click', () => this.removeFile('businessProof'));

    // Character count for textarea
    const additionalInfoTextarea = document.getElementById('additionalInfo');
    if (additionalInfoTextarea) {
      additionalInfoTextarea.addEventListener('input', (e) => {
        this.updateCharCount(e.target);
      });
    }

    // Terms checkbox
    const termsCheckbox = document.getElementById('terms');
    if (termsCheckbox) {
      termsCheckbox.addEventListener('change', () => {
        this.clearError('terms');
      });
    }
  }

  /**
   * Make progress steps clickable
   */
  setupClickableSteps() {
    document.querySelectorAll('.progress-step').forEach(step => {
      step.addEventListener('click', () => {
        const stepNum = parseInt(step.dataset.step, 10);
        if (stepNum && stepNum !== this.currentStep) {
          // Validate all steps up to the target step before allowing navigation
          if (stepNum < this.currentStep) {
            // Going back is always allowed
            this.goToStep(stepNum);
          } else {
            // Going forward: validate each intermediate step
            let valid = true;
            for (let s = this.currentStep; s < stepNum; s++) {
              if (!this.validateFormStep(s)) {
                valid = false;
                this.goToStep(s); // show the step that failed
                break;
              }
            }
            if (valid) this.goToStep(stepNum);
          }
        }
      });
    });
  }

  /**
   * Real-time validation on input fields
   */
  setupRealTimeValidation() {
    const fields = this.form.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
      field.addEventListener('input', () => {
        this.validateField(field);
      });
      field.addEventListener('blur', () => {
        this.validateField(field);
      });
    });
  }

  /**
   * Validate a single field
   * @returns {boolean} true if valid
   */
  validateField(field) {
    const fieldId = field.id;
    if (!fieldId) return true;

    // Clear existing error
    this.clearError(fieldId);

    let isValid = true;
    let errorMessage = '';

    if (field.required && !field.value.trim() && field.type !== 'file' && field.type !== 'checkbox') {
      isValid = false;
      errorMessage = 'This field is required';
    } else if (field.type === 'email' && field.value) {
      if (!this.isValidEmail(field.value)) {
        isValid = false;
        errorMessage = 'Please enter a valid email';
      }
    } else if (field.type === 'tel' && field.value) {
      if (!this.isValidPhone(field.value)) {
        isValid = false;
        errorMessage = 'Please enter a valid phone number';
      }
    } else if (field.name === 'businessName' && field.value && field.value.trim().length < 2) {
      isValid = false;
      errorMessage = 'Business name must be at least 2 characters';
    }

    if (!isValid) {
      this.showError(fieldId, errorMessage);
    }

    // Toggle valid/invalid class on parent group
    const group = field.closest('.input-group');
    if (group) {
      if (isValid && field.value.trim() !== '') {
        group.classList.add('valid');
        group.classList.remove('error');
      } else {
        group.classList.remove('valid');
        if (!isValid) group.classList.add('error');
      }
    }

    return isValid;
  }

  /* ==========================================
     FILE UPLOAD HANDLERS
     ========================================== */

  handleDragOver(e, zone) {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.add('dragover');
  }

  handleDragLeave(e, zone) {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === zone) {
      zone.classList.remove('dragover');
    }
  }

  handleDrop(e, zone) {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fileInput = zone.querySelector('input[type="file"]');
      if (fileInput) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(files[0]);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  handleZoneClick(zone) {
    const fileInput = zone.querySelector('input[type="file"]');
    if (fileInput) fileInput.click();
  }

  handleFileSelect(e) {
    const input = e.target;
    const fieldName = input.name;
    const files = input.files;

    if (files.length === 0) return;

    const file = files[0];
    const zone = document.getElementById(`${fieldName}Zone`);
    const previewContainer = document.getElementById(`${fieldName}Preview`);
    const errorContainer = document.getElementById(`${fieldName}Error`);

    // Clear previous errors
    if (errorContainer) errorContainer.style.display = 'none';

    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      this.showFileError(fieldName, validation.error);
      input.value = '';
      return;
    }

    // Store file
    this.uploadedFiles[fieldName] = file;

    // Display preview
    this.displayFilePreview(file, fieldName, previewContainer, zone);
  }

  validateFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload PDF, JPG, or PNG files only.'
      };
    }

    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024);
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit.`
      };
    }

    return { valid: true };
  }

  showFileError(fieldName, message) {
    const errorContainer = document.getElementById(`${fieldName}Error`);
    if (errorContainer) {
      const span = errorContainer.querySelector('span');
      if (span) span.textContent = message;
      errorContainer.style.display = 'flex';
    }
  }

  displayFilePreview(file, fieldName, previewContainer, zone) {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    const nameEl = document.getElementById(`${fieldName}Name`);
    const sizeEl = document.getElementById(`${fieldName}Size`);
    const thumbnailEl = document.getElementById(`${fieldName}Thumbnail`);

    if (nameEl) nameEl.textContent = this.truncateFilename(file.name);
    if (sizeEl) sizeEl.textContent = `${fileSizeMB} MB`;

    if (file.type.startsWith('image/') && thumbnailEl) {
      const reader = new FileReader();
      reader.onload = (e) => {
        thumbnailEl.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        lucide.createIcons(); // Recreate icons if any were replaced
      };
      reader.readAsDataURL(file);
    } else if (thumbnailEl) {
      thumbnailEl.innerHTML = '<i data-lucide="file-text"></i>';
      lucide.createIcons();
    }

    if (previewContainer) {
      previewContainer.style.display = 'flex';
      previewContainer.classList.add('show');
    }
    if (zone) zone.style.display = 'none';

    // Update review panel if on step 3
    if (this.currentStep === 3) this.updateReviewSummary();
  }

  removeFile(fieldName) {
    const input = document.getElementById(fieldName);
    const previewContainer = document.getElementById(`${fieldName}Preview`);
    const zone = document.getElementById(`${fieldName}Zone`);

    if (input) input.value = '';
    this.uploadedFiles[fieldName] = null;

    if (previewContainer) {
      previewContainer.style.display = 'none';
      previewContainer.classList.remove('show');
    }
    if (zone) zone.style.display = '';

    if (this.currentStep === 3) this.updateReviewSummary();
  }

  truncateFilename(filename, maxLength = 30) {
    if (filename.length <= maxLength) return filename;
    const ext = filename.split('.').pop();
    const name = filename.substring(0, maxLength - ext.length - 3);
    return name + '...' + ext;
  }

  /* ==========================================
     FORM VALIDATION (Step-level)
     ========================================== */

  validateFormStep(stepNumber) {
    const section = document.querySelector(`[data-section="${stepNumber}"]`);
    if (!section) return true;

    let isValid = true;

    // Step 2: Validate file uploads explicitly
    if (stepNumber === 2) {
      if (!this.uploadedFiles.idProof) {
        this.showFileError('idProof', 'Please upload your ID proof document');
        isValid = false;
      }
      if (!this.uploadedFiles.businessProof) {
        this.showFileError('businessProof', 'Please upload your business proof document');
        isValid = false;
      }
    }

    // Validate required text/select fields
    const fields = section.querySelectorAll('input[required]:not([type="file"]):not([type="checkbox"]), select[required], textarea[required]');

    fields.forEach(field => {
      if (!field.value.trim()) {
        this.showError(field.id, 'This field is required');
        const group = field.closest('.input-group');
        if (group) group.classList.add('error');
        isValid = false;
      } else {
        const fieldValid = this.validateField(field);
        if (!fieldValid) isValid = false;
      }
    });

    // Step 3: Validate terms checkbox
    if (stepNumber === 3) {
      const termsCheckbox = section.querySelector('input[type="checkbox"][required]');
      if (termsCheckbox && !termsCheckbox.checked) {
        this.showError('terms', 'You must accept the terms and conditions');
        isValid = false;
      }
    }

    return isValid;
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  isValidPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }

  showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorContainer = document.getElementById(`${fieldId}-error`) || document.getElementById(`${fieldId}Error`);

    if (field) {
      const group = field.closest('.input-group');
      if (group) {
        group.classList.add('error');
        group.classList.remove('valid');
      }
    }

    if (errorContainer) {
      const span = errorContainer.querySelector('span');
      if (span) span.textContent = message;
      errorContainer.style.display = 'flex';
      errorContainer.classList.add('show');
    }
  }

  clearError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorContainer = document.getElementById(`${fieldId}-error`) || document.getElementById(`${fieldId}Error`);

    if (field) {
      const group = field.closest('.input-group');
      if (group) {
        group.classList.remove('error');
        // Keep valid class only if field has value
        if (field.value.trim() !== '') {
          group.classList.add('valid');
        } else {
          group.classList.remove('valid');
        }
      }
    }

    if (errorContainer) {
      errorContainer.style.display = 'none';
      errorContainer.classList.remove('show');
    }
  }

  clearAllErrors() {
    document.querySelectorAll('.input-group').forEach(group => {
      group.classList.remove('error', 'valid');
    });
    document.querySelectorAll('[id$="Error"], [id$="-error"]').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('show');
    });
  }

  /* ==========================================
     MULTI-STEP FORM NAVIGATION
     ========================================== */

  nextStep() {
    if (!this.validateFormStep(this.currentStep)) return;
    if (this.currentStep < this.totalSteps) {
      this.goToStep(this.currentStep + 1);
    }
  }

  prevStep() {
    if (this.currentStep > 1) this.goToStep(this.currentStep - 1);
  }

  goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > this.totalSteps) return;

    // Hide current section
    const currentSection = document.querySelector(`[data-section="${this.currentStep}"]`);
    if (currentSection) currentSection.classList.remove('active');

    // Show new section
    const newSection = document.querySelector(`[data-section="${stepNumber}"]`);
    if (newSection) newSection.classList.add('active');

    // Update progress indicators
    this.updateProgressBar(stepNumber);

    // Update navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (prevBtn) prevBtn.style.display = stepNumber > 1 ? 'inline-flex' : 'none';
    if (nextBtn) nextBtn.style.display = stepNumber < this.totalSteps ? 'inline-flex' : 'none';
    if (submitBtn) submitBtn.style.display = stepNumber === this.totalSteps ? 'inline-flex' : 'none';

    // Update current step
    this.currentStep = stepNumber;

    // If moving to step 3, update review summary
    if (stepNumber === 3) this.updateReviewSummary();

    // Scroll to form top
    this.form.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Focus first input in new section
    const firstInput = newSection.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
  }

  updateProgressBar(stepNumber) {
    const progressSteps = document.querySelectorAll('.progress-step');
    progressSteps.forEach((step, index) => {
      const stepNum = index + 1;
      if (stepNum === stepNumber) {
        step.classList.add('active');
        step.classList.remove('completed');
      } else if (stepNum < stepNumber) {
        step.classList.add('completed');
        step.classList.remove('active');
      } else {
        step.classList.remove('active', 'completed');
      }
    });
  }

  /* ==========================================
     REVIEW SUMMARY (Step 3)
     ========================================== */

  updateReviewSummary() {
    const reviewContainer = document.getElementById('reviewSummary');
    if (!reviewContainer) return;

    // Gather data
    const businessName = document.getElementById('businessName')?.value || '';
    const businessType = document.getElementById('businessType')?.value || '';
    const contactPhone = document.getElementById('contactPhone')?.value || '';
    const registrationNumber = document.getElementById('businessRegistrationNumber')?.value || '';
    const address = document.getElementById('businessAddress')?.value || '';
    const additionalInfo = document.getElementById('additionalInfo')?.value || '';

    const idProofFile = this.uploadedFiles.idProof;
    const businessProofFile = this.uploadedFiles.businessProof;

    // Build HTML
    let html = `
      <div class="review-panel">
        <h4><i data-lucide="briefcase"></i> Business Information</h4>
        <div class="review-grid">
          <div class="review-item">
            <span class="review-label">Business Name</span>
            <span class="review-value ${!businessName ? 'empty' : ''}">${businessName || 'Not provided'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Business Type</span>
            <span class="review-value ${!businessType ? 'empty' : ''}">${businessType ? this.getBusinessTypeLabel(businessType) : 'Not provided'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Contact Phone</span>
            <span class="review-value ${!contactPhone ? 'empty' : ''}">${contactPhone || 'Not provided'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Registration Number</span>
            <span class="review-value ${!registrationNumber ? 'empty' : ''}">${registrationNumber || 'Not provided'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Business Address</span>
            <span class="review-value ${!address ? 'empty' : ''}">${address || 'Not provided'}</span>
          </div>
        </div>
    `;

    if (additionalInfo) {
      html += `
        <div class="review-item" style="margin-top: var(--spacing-md);">
          <span class="review-label">Additional Info</span>
          <span class="review-value">${additionalInfo}</span>
        </div>
      `;
    }

    html += `
        <h4 style="margin-top: var(--spacing-lg);"><i data-lucide="file-text"></i> Uploaded Documents</h4>
        <div class="review-files">
          <div class="review-file">
            <i data-lucide="${idProofFile ? 'check-circle' : 'x-circle'}"></i>
            <span>ID Proof: ${idProofFile ? idProofFile.name : 'Not uploaded'}</span>
          </div>
          <div class="review-file">
            <i data-lucide="${businessProofFile ? 'check-circle' : 'x-circle'}"></i>
            <span>Business Proof: ${businessProofFile ? businessProofFile.name : 'Not uploaded'}</span>
          </div>
        </div>
      </div>
    `;

    reviewContainer.innerHTML = html;
    lucide.createIcons(); // Recreate icons inside review
  }

  getBusinessTypeLabel(value) {
    const map = {
      individual: 'Individual',
      company: 'Company',
      ngo: 'NGO/Non-Profit',
      sports_club: 'Sports Club'
    };
    return map[value] || value;
  }

  /* ==========================================
     CHARACTER COUNT
     ========================================== */

  updateCharCount(textarea) {
    const count = textarea.value.length;
    const max = textarea.getAttribute('maxlength') || 500;
    const countEl = textarea.parentElement.querySelector('.char-count span');
    if (countEl) countEl.textContent = `${count}/${max}`;
  }

  /* ==========================================
     FORM SUBMISSION
     ========================================== */

  async handleSubmit(e) {
    e.preventDefault();

    // Validate all steps
    for (let step = 1; step <= this.totalSteps; step++) {
      if (!this.validateFormStep(step)) {
        this.goToStep(step);
        return;
      }
    }

    await this.submitForm();
  }

  async submitForm() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    const submitBtn = document.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      const formDataToSend = new FormData(this.form);
      if (this.uploadedFiles.idProof) {
        formDataToSend.set('idProof', this.uploadedFiles.idProof);
      }
      if (this.uploadedFiles.businessProof) {
        formDataToSend.set('businessProof', this.uploadedFiles.businessProof);
      }

      const response = await fetch('/organizer/complete-profile', {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        this.showSuccessMessage();
        this.form.reset();
        this.uploadedFiles = { idProof: null, businessProof: null };
        setTimeout(() => {
          window.location.href = '/organizer/application-status';
        }, 2000);
      } else {
        alert(data.message || 'An error occurred');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      this.isSubmitting = false;
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  }

  showSuccessMessage() {
    const successMsg = document.getElementById('successMessage');
    if (successMsg) {
      successMsg.classList.add('show');
      successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.completeProfileForm = new CompleteProfileForm();
});