document.addEventListener('DOMContentLoaded', function() {
  
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  let currentStep = 1;
  const totalSteps = 3;
  let uploadedFiles = {
    idProof: null,
    businessProof: null
  };

  // ========================================
  // DOM ELEMENTS
  // ========================================
  const form = document.getElementById('completeProfileForm');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const progressSteps = document.querySelectorAll('.progress-step');
  const formSections = document.querySelectorAll('.form-section');
  const inputGroups = document.querySelectorAll('.input-group');

  // ========================================
  // FLOATING LABELS
  // ========================================
  inputGroups.forEach(group => {
    const input = group.querySelector('input, select, textarea');
    const label = group.querySelector('label');
    
    if (!input || !label) return;

    // Check if input has value on page load
    function checkFilled() {
      if (input.value.trim() !== '') {
        group.classList.add('filled');
      } else {
        group.classList.remove('filled');
      }
    }

    // Focus event
    input.addEventListener('focus', () => {
      group.classList.add('focused');
    });

    // Blur event
    input.addEventListener('blur', () => {
      group.classList.remove('focused');
      checkFilled();
    });

    // Input event for real-time checking
    input.addEventListener('input', checkFilled);
    
    // Change event for select elements
    if (input.tagName === 'SELECT') {
      input.addEventListener('change', checkFilled);
    }

    // Initial check
    checkFilled();
  });

  // ========================================
  // STEP NAVIGATION
  // ========================================
  function updateStepDisplay() {
    // Update progress circles
    progressSteps.forEach((step, index) => {
      const stepNumber = index + 1;
      step.classList.remove('active', 'completed');
      
      if (stepNumber < currentStep) {
        step.classList.add('completed');
      } else if (stepNumber === currentStep) {
        step.classList.add('active');
      }
    });

    // Update form sections
    formSections.forEach((section, index) => {
      section.classList.remove('active');
      if (index + 1 === currentStep) {
        section.classList.add('active');
      }
    });

    // Update button visibility
    prevBtn.style.display = currentStep === 1 ? 'none' : 'flex';
    nextBtn.style.display = currentStep === totalSteps ? 'none' : 'flex';
    submitBtn.style.display = currentStep === totalSteps ? 'flex' : 'none';

    // Scroll to top of form
    document.querySelector('.auth-form-wrapper').scrollTop = 0;
  }

  function validateStep(step) {
    let isValid = true;

    if (step === 1) {
      // Validate Business Information
      const businessName = document.getElementById('businessName');
      const businessType = document.getElementById('businessType');
      const contactPhone = document.getElementById('contactPhone');

      // Business Name
      if (!businessName.value.trim()) {
        showError(businessName, 'Business name is required');
        isValid = false;
      } else if (businessName.value.trim().length < 3) {
        showError(businessName, 'Business name must be at least 3 characters');
        isValid = false;
      } else {
        clearError(businessName);
      }

      // Business Type
      if (!businessType.value) {
        showError(businessType, 'Please select a business type');
        isValid = false;
      } else {
        clearError(businessType);
      }

      // Contact Phone
      const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
      if (!contactPhone.value.trim()) {
        showError(contactPhone, 'Contact phone is required');
        isValid = false;
      } else if (!phoneRegex.test(contactPhone.value.trim())) {
        document.getElementById('phoneError').classList.add('show');
        contactPhone.classList.add('error');
        isValid = false;
      } else {
        document.getElementById('phoneError').classList.remove('show');
        clearError(contactPhone);
      }

    } else if (step === 2) {
      // Validate Documents
      const idProofError = document.getElementById('idProofError');
      const businessProofError = document.getElementById('businessProofError');

      if (!uploadedFiles.idProof) {
        idProofError.classList.add('show');
        isValid = false;
      } else {
        idProofError.classList.remove('show');
      }

      if (!uploadedFiles.businessProof) {
        businessProofError.classList.add('show');
        isValid = false;
      } else {
        businessProofError.classList.remove('show');
      }

    } else if (step === 3) {
      // Validate Terms
      const terms = document.getElementById('terms');
      const termsError = document.getElementById('termsError');

      if (!terms.checked) {
        termsError.classList.add('show');
        isValid = false;
      } else {
        termsError.classList.remove('show');
      }
    }

    return isValid;
  }

  function showError(input, message) {
    input.classList.add('error');
    // You can add custom error message display if needed
  }

  function clearError(input) {
    input.classList.remove('error');
  }

  // Next button handler
  nextBtn.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      currentStep++;
      updateStepDisplay();
      lucide.createIcons(); // Reinitialize icons after DOM update
    }
  });

  // Previous button handler
  prevBtn.addEventListener('click', () => {
    currentStep--;
    updateStepDisplay();
    lucide.createIcons();
  });

  // ========================================
  // FILE UPLOAD HANDLING
  // ========================================
  function setupFileUpload(inputId, zoneId, previewId, thumbnailId, nameId, sizeId, removeId) {
    const input = document.getElementById(inputId);
    const zone = document.getElementById(zoneId);
    const preview = document.getElementById(previewId);
    const thumbnail = document.getElementById(thumbnailId);
    const nameEl = document.getElementById(nameId);
    const sizeEl = document.getElementById(sizeId);
    const removeBtn = document.getElementById(removeId);

    // Drag and drop events
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0], inputId);
      }
    });

    // File input change
    input.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0], inputId);
      }
    });

    // Handle file selection
    function handleFileSelect(file, fileType) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Please upload JPEG, PNG, or PDF files only.');
        return;
      }

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        alert('File size exceeds 5MB. Please upload a smaller file.');
        return;
      }

      // Store file
      uploadedFiles[fileType] = file;

      // Update preview
      nameEl.textContent = file.name;
      sizeEl.textContent = formatFileSize(file.size);

      // Show thumbnail
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          thumbnail.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
      } else {
        thumbnail.innerHTML = '<i data-lucide="file-text"></i>';
        lucide.createIcons();
      }

      // Show preview, hide upload zone
      zone.style.display = 'none';
      preview.classList.add('show');

      // Clear error if exists
      document.getElementById(fileType + 'Error').classList.remove('show');

      lucide.createIcons();
    }

    // Remove file
    removeBtn.addEventListener('click', () => {
      uploadedFiles[inputId] = null;
      input.value = '';
      zone.style.display = 'block';
      preview.classList.remove('show');
      thumbnail.innerHTML = '<i data-lucide="file"></i>';
      lucide.createIcons();
    });

    // Format file size
    function formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
  }

  // Setup both file uploads
  setupFileUpload(
    'idProof', 
    'idProofZone', 
    'idProofPreview', 
    'idProofThumbnail', 
    'idProofName', 
    'idProofSize', 
    'idProofRemove'
  );

  setupFileUpload(
    'businessProof', 
    'businessProofZone', 
    'businessProofPreview', 
    'businessProofThumbnail', 
    'businessProofName', 
    'businessProofSize', 
    'businessProofRemove'
  );

  // ========================================
  // FORM SUBMISSION
  // ========================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Final validation
    if (!validateStep(3)) {
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    try {
      // Create FormData
      const formData = new FormData();
      
      // Add text fields
      formData.append('businessName', document.getElementById('businessName').value.trim());
      formData.append('businessType', document.getElementById('businessType').value);
      formData.append('contactPhone', document.getElementById('contactPhone').value.trim());
      formData.append('businessRegistrationNumber', document.getElementById('businessRegistrationNumber').value.trim());
      formData.append('businessAddress', document.getElementById('businessAddress').value.trim());
      formData.append('additionalInfo', document.getElementById('additionalInfo').value.trim());
      
      // Add files
      if (uploadedFiles.idProof) {
        formData.append('idProof', uploadedFiles.idProof);
      }
      if (uploadedFiles.businessProof) {
        formData.append('businessProof', uploadedFiles.businessProof);
      }

      // Submit form
      const response = await fetch('/organizer/complete-profile', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message
        document.getElementById('successMessage').classList.add('show');
        
        // Redirect after 2 seconds
        setTimeout(() => {
          window.location.href = '/organizer/application-status';
        }, 2000);
      } else {
        // Show error
        alert(data.error || 'An error occurred. Please try again.');
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }

    } catch (error) {
      console.error('Submission error:', error);
      alert('Network error. Please check your connection and try again.');
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  });

  // ========================================
  // REAL-TIME VALIDATION
  // ========================================
  
  // Phone validation
  const contactPhone = document.getElementById('contactPhone');
  contactPhone.addEventListener('input', () => {
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    const phoneError = document.getElementById('phoneError');
    
    if (contactPhone.value.trim() && !phoneRegex.test(contactPhone.value.trim())) {
      phoneError.classList.add('show');
      contactPhone.classList.add('error');
    } else {
      phoneError.classList.remove('show');
      contactPhone.classList.remove('error');
    }
  });

  // Business name validation
  const businessName = document.getElementById('businessName');
  businessName.addEventListener('input', () => {
    if (businessName.value.trim().length > 0 && businessName.value.trim().length < 3) {
      businessName.classList.add('error');
    } else {
      businessName.classList.remove('error');
    }
  });

  // Character counter for additional info
  const additionalInfo = document.getElementById('additionalInfo');
  const maxChars = 500;
  
  additionalInfo.addEventListener('input', () => {
    const remaining = maxChars - additionalInfo.value.length;
    // You can add a character counter display here if needed
  });

  // Initialize Lucide icons
  lucide.createIcons();
  
});