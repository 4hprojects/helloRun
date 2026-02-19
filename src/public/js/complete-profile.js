/* ==========================================
   COMPLETE PROFILE FORM - MAIN LOGIC
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

    // Form reset
    document.querySelectorAll('button[type="reset"]').forEach(btn => {
      btn.addEventListener('click', () => this.handleReset());
    });

    // Navigation buttons
    const nextButtons = document.querySelectorAll('[data-action="next"]');
    const prevButtons = document.querySelectorAll('[data-action="prev"]');

    nextButtons.forEach(btn => {
      btn.addEventListener('click', () => this.nextStep());
    });

    prevButtons.forEach(btn => {
      btn.addEventListener('click', () => this.prevStep());
    });

    // Character count for textarea
    const additionalInfoTextarea = document.getElementById('additionalInfo');
    if (additionalInfoTextarea) {
      additionalInfoTextarea.addEventListener('input', (e) => {
        this.updateCharCount(e.target);
      });
    }
  }

  /**
   * Initialize Lucide Icons
   */
  initializeLucideIcons() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /* ==========================================
     FILE UPLOAD HANDLERS
     ========================================== */

  /**
   * Handle drag over event
   */
  handleDragOver(e, zone) {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.add('dragover');
  }

  /**
   * Handle drag leave event
   */
  handleDragLeave(e, zone) {
    e.preventDefault();
    e.stopPropagation();
    
    // Only remove class if leaving the zone entirely
    if (e.target === zone) {
      zone.classList.remove('dragover');
    }
  }

  /**
   * Handle drop event
   */
  handleDrop(e, zone) {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fieldName = zone.dataset.field;
      const fileInput = document.getElementById(fieldName);
      
      // Set files to the input
      fileInput.files = files;
      
      // Trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);
    }
  }

  /**
   * Handle zone click to open file picker
   */
  handleZoneClick(zone) {
    const fieldName = zone.dataset.field;
    const fileInput = document.getElementById(fieldName);
    fileInput.click();
  }

  /**
   * Handle file selection (from input or drag-drop)
   */
  handleFileSelect(e) {
    const input = e.target;
    const fieldName = input.name;
    const files = input.files;

    if (files.length === 0) {
      return;
    }

    const file = files[0];
    const zone = document.getElementById(`${fieldName}-drag-zone`);
    const previewContainer = document.getElementById(`${fieldName}-preview`);
    const errorContainer = document.getElementById(`${fieldName}-error`);

    // Clear previous errors
    if (errorContainer) {
      errorContainer.textContent = '';
      errorContainer.style.display = 'none';
    }

    // Validate file
    const validation = this.validateFile(file, fieldName);
    if (!validation.valid) {
      this.showError(fieldName, validation.error);
      input.value = '';
      return;
    }

    // Store file
    this.uploadedFiles[fieldName] = file;
    this.formData.set(fieldName, file);

    // Display preview
    this.displayFilePreview(file, fieldName, previewContainer, zone);

    // Clear error state
    this.clearError(fieldName);
  }

  /**
   * Validate file (type, size)
   */
  validateFile(file, fieldName) {
    const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 5242880; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload PDF, JPG, or PNG files only.'
      };
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024);
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit.`
      };
    }

    return { valid: true };
  }

  /**
   * Display file preview
   */
  displayFilePreview(file, fieldName, previewContainer, zone) {
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);

    let previewHTML = `
      <div class="file-preview-item">
        <div class="file-preview-thumbnail">
    `;

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = previewContainer.querySelector('.file-preview-thumbnail img');
        if (img) {
          img.src = e.target.result;
        }
      };
      reader.readAsDataURL(file);
      previewHTML += `<img src="" alt="Preview" />`;
    } else if (isPDF) {
      previewHTML += `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      `;
    }

    previewHTML += `
        </div>
        <div class="file-preview-info">
          <div class="file-preview-name">${this.truncateFilename(file.name)}</div>
          <div class="file-preview-size">${fileSizeMB} MB</div>
        </div>
        <button type="button" class="file-preview-remove" onclick="completeProfileForm.removeFile('${fieldName}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          Remove
        </button>
      </div>
    `;

    if (previewContainer) {
      previewContainer.innerHTML = previewHTML;
      previewContainer.classList.add('show');
      zone.style.display = 'none';

      // Re-initialize icons
      this.initializeLucideIcons();
    }
  }

  /**
   * Remove uploaded file
   */
  removeFile(fieldName) {
    const input = document.getElementById(fieldName);
    const previewContainer = document.getElementById(`${fieldName}-preview`);
    const zone = document.getElementById(`${fieldName}-drag-zone`);

    input.value = '';
    this.uploadedFiles[fieldName] = null;
    this.formData.delete(fieldName);

    if (previewContainer) {
      previewContainer.innerHTML = '';
      previewContainer.classList.remove('show');
    }

    if (zone) {
      zone.style.display = 'block';
    }

    // Trigger revalidation
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Truncate long filenames
   */
  truncateFilename(filename, maxLength = 30) {
    if (filename.length <= maxLength) {
      return filename;
    }
    const ext = filename.split('.').pop();
    const name = filename.substring(0, maxLength - ext.length - 3);
    return name + '...' + ext;
  }

  /* ==========================================
     FORM VALIDATION
     ========================================== */

  /**
   * Validate form fields
   */
  validateFormStep(stepNumber) {
    const section = document.querySelector(`[data-section="${stepNumber}"]`);
    if (!section) return true;

    const fields = section.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    fields.forEach(field => {
      if (field.type === 'file') {
        const fieldName = field.name;
        if (!this.uploadedFiles[fieldName]) {
          this.showError(fieldName, 'Please upload a file');
          isValid = false;
        }
      } else if (field.type === 'checkbox') {
        if (!field.checked) {
          this.showError(field.id, 'Please accept the terms');
          isValid = false;
        }
      } else if (field.value.trim() === '') {
        this.showError(field.id, 'This field is required');
        isValid = false;
      } else {
        // Additional validation based on field type
        if (field.type === 'email') {
          if (!this.isValidEmail(field.value)) {
            this.showError(field.id, 'Please enter a valid email');
            isValid = false;
          }
        }

        if (field.type === 'tel') {
          if (!this.isValidPhone(field.value)) {
            this.showError(field.id, 'Please enter a valid phone number');
            isValid = false;
          }
        }

        if (field.name === 'businessName') {
          if (field.value.trim().length < 2) {
            this.showError(field.id, 'Business name must be at least 2 characters');
            isValid = false;
          }
        }
      }
    });

    return isValid;
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format (basic)
   */
  isValidPhone(phone) {
    // Allow various phone formats
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7;
  }

  /**
   * Show error message
   */
  showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorContainer = document.getElementById(`${fieldId}-error`);

    if (field) {
      const group = field.closest('.input-group');
      if (group) {
        group.classList.add('error');
      }
    }

    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';
    }
  }

  /**
   * Clear error message
   */
  clearError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorContainer = document.getElementById(`${fieldId}-error`);

    if (field) {
      const group = field.closest('.input-group');
      if (group) {
        group.classList.remove('error');
      }
    }

    if (errorContainer) {
      errorContainer.textContent = '';
      errorContainer.style.display = 'none';
    }
  }

  /**
   * Clear all errors
   */
  clearAllErrors() {
    document.querySelectorAll('.input-group').forEach(group => {
      group.classList.remove('error');
    });

    document.querySelectorAll('[id$="-error"]').forEach(errorEl => {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    });
  }

  /* ==========================================
     MULTI-STEP FORM NAVIGATION
     ========================================== */

  /**
   * Move to next step
   */
  nextStep() {
    // Validate current step
    if (!this.validateFormStep(this.currentStep)) {
      return;
    }

    // Move to next step
    if (this.currentStep < this.totalSteps) {
      this.goToStep(this.currentStep + 1);
    }
  }

  /**
   * Move to previous step
   */
  prevStep() {
    if (this.currentStep > 1) {
      this.goToStep(this.currentStep - 1);
    }
  }

  /**
   * Go to specific step
   */
  goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > this.totalSteps) {
      return;
    }

    // Hide current section
    const currentSection = document.querySelector(`[data-section="${this.currentStep}"]`);
    if (currentSection) {
      currentSection.classList.remove('active');
    }

    // Show new section
    const newSection = document.querySelector(`[data-section="${stepNumber}"]`);
    if (newSection) {
      newSection.classList.add('active');
    }

    // Update progress indicator
    this.updateProgressBar(stepNumber);

    // Update current step
    this.currentStep = stepNumber;

    // Scroll to form top
    this.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Update progress bar visualization
   */
  updateProgressBar(stepNumber) {
    const progressSteps = document.querySelectorAll('.progress-step');
    const progressContainer = document.querySelector('.progress-steps');

    progressSteps.forEach((step, index) => {
      const stepNum = index + 1;
      if (stepNum <= stepNumber) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });

    // Update progress line
    if (progressContainer) {
      progressContainer.classList.remove('step-1', 'step-2', 'step-3');
      progressContainer.classList.add(`step-${stepNumber}`);
    }
  }

  /* ==========================================
     CHARACTER COUNT
     ========================================== */

  /**
   * Update character count for textarea
   */
  updateCharCount(textarea) {
    const count = textarea.value.length;
    const countEl = textarea.parentElement.querySelector('.char-count span');
    if (countEl) {
      countEl.textContent = count;
    }
  }

  /* ==========================================
     FORM SUBMISSION
     ========================================== */

  /**
   * Handle form submission
   */
  async handleSubmit(e) {
    e.preventDefault();

    // Validate all steps
    for (let step = 1; step <= this.totalSteps; step++) {
      if (!this.validateFormStep(step)) {
        this.goToStep(step);
        return;
      }
    }

    // Check both files are selected
    if (!this.uploadedFiles.idProof || !this.uploadedFiles.businessProof) {
      alert('Please upload both ID proof and business proof documents');
      return;
    }

    await this.submitForm();
  }

  /**
   * Submit form via AJAX
   */
  async submitForm() {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const submitBtn = document.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    // Show loading state
    submitBtn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnLoader) btnLoader.style.display = 'flex';

    try {
      // Collect form data
      const formDataToSend = new FormData(this.form);

      // Add files if not already added
      if (this.uploadedFiles.idProof) {
        formDataToSend.set('idProof', this.uploadedFiles.idProof);
      }
      if (this.uploadedFiles.businessProof) {
        formDataToSend.set('businessProof', this.uploadedFiles.businessProof);
      }

      // Submit form
      const response = await fetch('/organizer/complete-profile', {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message
        this.showSuccessMessage();

        // Reset form
        this.form.reset();
        this.uploadedFiles = {
          idProof: null,
          businessProof: null
        };

        // Redirect after 2 seconds
        setTimeout(() => {
          window.location.href = '/organizer/application-status';
        }, 2000);
      } else {
        // Show error message
        alert(data.message || 'An error occurred while submitting the form');
        console.error('Form submission error:', data);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Failed to submit the form. Please try again.');
    } finally {
      // Hide loading state
      this.isSubmitting = false;
      submitBtn.disabled = false;
      if (btnText) btnText.style.display = 'inline';
      if (btnLoader) btnLoader.style.display = 'none';
    }
  }

  /**
   * Show success message
   */
  showSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
      successMessage.classList.add('show');
      successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Handle form reset
   */
  handleReset() {
    // Clear file inputs
    document.querySelectorAll('input[type="file"]').forEach(input => {
      input.value = '';
    });

    // Clear stored files
    this.uploadedFiles = {
      idProof: null,
      businessProof: null
    };

    // Reset file previews
    document.querySelectorAll('[id$="-preview"]').forEach(preview => {
      preview.innerHTML = '';
      preview.classList.remove('show');
    });

    // Show all upload zones
    document.querySelectorAll('.file-upload-zone').forEach(zone => {
      zone.style.display = 'block';
    });

    // Clear all errors
    this.clearAllErrors();

    // Reset to step 1
    this.goToStep(1);
  }
}

/* ==========================================
   INITIALIZE FORM ON DOM READY
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  window.completeProfileForm = new CompleteProfileForm();
});