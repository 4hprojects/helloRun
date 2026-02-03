// ========================================
// RESET PASSWORD - CLEAN & SIMPLE
// ========================================

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    REDIRECT_DELAY: 5,
    DEBOUNCE_DELAY: 300,
    PASSWORD_REQUIREMENTS: {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecial: false
    },
    STRENGTH_LEVELS: [
      { min: 0, max: 1, label: 'Very Weak', color: '#ef4444', width: '20%' },
      { min: 2, max: 2, label: 'Weak', color: '#f97316', width: '40%' },
      { min: 3, max: 3, label: 'Fair', color: '#eab308', width: '60%' },
      { min: 4, max: 4, label: 'Good', color: '#3b82f6', width: '80%' },
      { min: 5, max: 5, label: 'Strong', color: '#10b981', width: '100%' }
    ],
    COMMON_PASSWORDS: [
      'password', '12345678', 'qwerty', 'abc123', 'monkey',
      'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou',
      'master', 'sunshine', 'ashley', 'bailey', 'passw0rd',
      'shadow', '123123', '654321', 'superman', 'qazwsx'
    ]
  };

  // State
  let state = {
    touched: {
      password: false,
      confirmPassword: false
    },
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    },
    validationErrors: {
      password: null,
      confirmPassword: null
    },
    isSubmitting: false
  };

  // DOM Elements
  const elements = {};
  let debounceTimer = null;

  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheElements();
    
    // Initialize Lucide icons FIRST
    if (window.lucide) {
      lucide.createIcons();
    }
    
    setupPasswordToggles();
    setupEventListeners();
    setupSuccessCountdown();
  }

  function cacheElements() {
    elements.form = document.getElementById('resetPasswordForm');
    elements.password = document.getElementById('password');
    elements.confirmPassword = document.getElementById('confirmPassword');
    elements.submitBtn = document.getElementById('submitBtn');
    
    elements.togglePasswordBtn = document.getElementById('togglePassword');
    elements.toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
    
    elements.strengthFill = document.getElementById('strengthFill');
    elements.strengthText = document.getElementById('strengthText');
    
    elements.passwordError = document.getElementById('passwordError');
    elements.confirmPasswordError = document.getElementById('confirmPasswordError');
    
    elements.countdown = document.getElementById('countdown');
    elements.progressBar = document.getElementById('progressBar');
    elements.redirectLink = document.getElementById('redirectLink');
    
    elements.liveRegion = document.getElementById('liveRegion') || createLiveRegion();
  }

  function createLiveRegion() {
    const region = document.createElement('div');
    region.id = 'liveRegion';
    region.className = 'sr-only';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    document.body.appendChild(region);
    return region;
  }

  // ========================================
  // PASSWORD TOGGLE - FIXED VERSION
  // ========================================

  function setupPasswordToggles() {
    if (elements.togglePasswordBtn && elements.password) {
      elements.togglePasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePasswordVisibility(elements.password, elements.togglePasswordBtn);
      });
      
      // Prevent mousedown from interfering
      elements.togglePasswordBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
    }

    if (elements.toggleConfirmPasswordBtn && elements.confirmPassword) {
      elements.toggleConfirmPasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePasswordVisibility(elements.confirmPassword, elements.toggleConfirmPasswordBtn);
      });
      
      // Prevent mousedown from interfering
      elements.toggleConfirmPasswordBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
    }
  }

  function togglePasswordVisibility(inputElement, toggleButton) {
    if (!inputElement || !toggleButton) {
      console.error('Toggle: Missing input or button');
      return;
    }
    
    const isPassword = inputElement.type === 'password';
    
    // Toggle input type
    inputElement.type = isPassword ? 'text' : 'password';
    
    // Update button aria-label
    toggleButton.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    
    // Get the icon element
    let icon = toggleButton.querySelector('i');
    
    // If no icon exists, create it
    if (!icon) {
      icon = document.createElement('i');
      toggleButton.appendChild(icon);
    }
    
    // Update the data-lucide attribute
    const iconName = isPassword ? 'eye-off' : 'eye';
    icon.setAttribute('data-lucide', iconName);
    
    // Remove any existing SVG children to prevent duplicates
    while (icon.firstChild) {
      icon.removeChild(icon.firstChild);
    }
    
    // Re-initialize Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }
    
    // Announce to screen reader
    announceToScreenReader(isPassword ? 'Password visible' : 'Password hidden');
    
    // Keep focus on input
    inputElement.focus();
  }

  // ========================================
  // EVENT LISTENERS
  // ========================================

  function setupEventListeners() {
    if (elements.password) {
      elements.password.addEventListener('input', debounce(handlePasswordInput, CONFIG.DEBOUNCE_DELAY));
      elements.password.addEventListener('blur', handlePasswordBlur);
      elements.password.addEventListener('focus', handlePasswordFocus);
    }

    if (elements.confirmPassword) {
      elements.confirmPassword.addEventListener('input', debounce(handleConfirmPasswordInput, CONFIG.DEBOUNCE_DELAY));
      elements.confirmPassword.addEventListener('blur', handleConfirmPasswordBlur);
      elements.confirmPassword.addEventListener('focus', handleConfirmPasswordFocus);
    }

    if (elements.form) {
      elements.form.addEventListener('submit', handleFormSubmit);
    }
  }

  // ========================================
  // PASSWORD VALIDATION
  // ========================================

  function handlePasswordInput(e) {
    const password = e.target.value;
    updatePasswordRequirements(password);
    updatePasswordStrength(password);
    
    if (state.touched.password) {
      validatePassword(password);
    }
    
    if (elements.confirmPassword?.value && state.touched.confirmPassword) {
      validatePasswordMatch();
    }

    updateSubmitButton();
  }

  function handlePasswordBlur() {
    state.touched.password = true;
    validatePassword(elements.password.value);
    updateSubmitButton();
  }

  function handlePasswordFocus() {
    elements.password.classList.remove('error');
    if (elements.passwordError) {
      elements.passwordError.textContent = '';
    }
  }

  function updatePasswordRequirements(password) {
    state.requirements = {
      length: password.length >= CONFIG.PASSWORD_REQUIREMENTS.minLength && 
              password.length <= CONFIG.PASSWORD_REQUIREMENTS.maxLength,
      uppercase: CONFIG.PASSWORD_REQUIREMENTS.requireUppercase ? /[A-Z]/.test(password) : true,
      lowercase: CONFIG.PASSWORD_REQUIREMENTS.requireLowercase ? /[a-z]/.test(password) : true,
      number: CONFIG.PASSWORD_REQUIREMENTS.requireNumber ? /[0-9]/.test(password) : true,
      special: CONFIG.PASSWORD_REQUIREMENTS.requireSpecial ? /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) : true
    };
  }

  function validatePassword(password) {
    state.validationErrors.password = null;

    if (!password || password.trim() === '') {
      if (state.touched.password) {
        state.validationErrors.password = 'Password is required';
        showError(elements.password, elements.passwordError, state.validationErrors.password);
        return false;
      }
      return false;
    }

    if (password.length < CONFIG.PASSWORD_REQUIREMENTS.minLength) {
      state.validationErrors.password = `Password must be at least ${CONFIG.PASSWORD_REQUIREMENTS.minLength} characters`;
      showError(elements.password, elements.passwordError, state.validationErrors.password);
      return false;
    }

    if (password.length > CONFIG.PASSWORD_REQUIREMENTS.maxLength) {
      state.validationErrors.password = `Password must not exceed ${CONFIG.PASSWORD_REQUIREMENTS.maxLength} characters`;
      showError(elements.password, elements.passwordError, state.validationErrors.password);
      return false;
    }

    const allRequirementsMet = Object.values(state.requirements).every(Boolean);
    if (!allRequirementsMet) {
      const unmetRequirements = Object.keys(state.requirements)
        .filter(key => !state.requirements[key])
        .map(key => {
          const labels = {
            length: 'minimum length',
            uppercase: 'uppercase letter',
            lowercase: 'lowercase letter',
            number: 'number',
            special: 'special character'
          };
          return labels[key];
        });
      
      state.validationErrors.password = `Password must include: ${unmetRequirements.join(', ')}`;
      showError(elements.password, elements.passwordError, state.validationErrors.password);
      return false;
    }

    if (isCommonPassword(password)) {
      state.validationErrors.password = 'This password is too common. Please choose a stronger password';
      showError(elements.password, elements.passwordError, state.validationErrors.password);
      return false;
    }

    if (hasSequentialCharacters(password)) {
      state.validationErrors.password = 'Password should not contain sequential characters (e.g., "123", "abc")';
      showError(elements.password, elements.passwordError, state.validationErrors.password);
      return false;
    }

    if (hasRepeatedCharacters(password)) {
      state.validationErrors.password = 'Password should not contain too many repeated characters';
      showError(elements.password, elements.passwordError, state.validationErrors.password);
      return false;
    }

    clearError(elements.password, elements.passwordError);
    elements.password.classList.add('valid');
    announceToScreenReader('Password is valid');
    return true;
  }

  function updatePasswordStrength(password) {
    if (!password) {
      updateStrengthIndicator(0);
      return;
    }

    let strength = Object.values(state.requirements).filter(Boolean).length;

    if (password.length >= 12) strength += 0.5;
    if (password.length >= 16) strength += 0.5;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{2,}/.test(password)) strength += 0.5;
    if (!/(.)\1{2,}/.test(password)) strength += 0.5;

    strength = Math.min(5, Math.floor(strength));
    updateStrengthIndicator(strength);
  }

  function updateStrengthIndicator(strength) {
    const level = CONFIG.STRENGTH_LEVELS.find(l => strength >= l.min && strength <= l.max) || 
                  CONFIG.STRENGTH_LEVELS[0];

    if (elements.strengthFill) {
      elements.strengthFill.style.width = level.width;
      elements.strengthFill.style.background = `linear-gradient(135deg, ${level.color} 0%, ${adjustColor(level.color, -20)} 100%)`;
    }

    if (elements.strengthText) {
      elements.strengthText.textContent = `Strength: ${level.label}`;
      elements.strengthText.style.color = level.color;
    }
  }

  // ========================================
  // CONFIRM PASSWORD VALIDATION
  // ========================================

  function handleConfirmPasswordInput(e) {
    if (state.touched.confirmPassword || e.target.value) {
      validatePasswordMatch();
    }
    updateSubmitButton();
  }

  function handleConfirmPasswordBlur() {
    state.touched.confirmPassword = true;
    validatePasswordMatch();
    updateSubmitButton();
  }

  function handleConfirmPasswordFocus() {
    elements.confirmPassword.classList.remove('error');
    if (elements.confirmPasswordError) {
      elements.confirmPasswordError.textContent = '';
    }
  }

  function validatePasswordMatch() {
    const password = elements.password.value;
    const confirmPassword = elements.confirmPassword.value;

    state.validationErrors.confirmPassword = null;

    if (!confirmPassword || confirmPassword.trim() === '') {
      if (state.touched.confirmPassword) {
        state.validationErrors.confirmPassword = 'Please confirm your password';
        showError(elements.confirmPassword, elements.confirmPasswordError, state.validationErrors.confirmPassword);
        return false;
      }
      return false;
    }

    if (password !== confirmPassword) {
      state.validationErrors.confirmPassword = 'Passwords do not match';
      showError(elements.confirmPassword, elements.confirmPasswordError, state.validationErrors.confirmPassword);
      announceToScreenReader('Passwords do not match');
      return false;
    }

    clearError(elements.confirmPassword, elements.confirmPasswordError);
    elements.confirmPassword.classList.add('valid');
    announceToScreenReader('Passwords match');
    return true;
  }

  // ========================================
  // VALIDATION HELPERS
  // ========================================

  function isCommonPassword(password) {
    const lowerPassword = password.toLowerCase();
    return CONFIG.COMMON_PASSWORDS.some(common => 
      lowerPassword.includes(common) || common.includes(lowerPassword)
    );
  }

  function hasSequentialCharacters(password) {
    const sequences = [
      '012', '123', '234', '345', '456', '567', '678', '789',
      'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij',
      'ijk', 'jkl', 'klm', 'lmn', 'mno', 'nop', 'opq', 'pqr',
      'qrs', 'rst', 'stu', 'tuv', 'uvw', 'vwx', 'wxy', 'xyz'
    ];
    
    const lowerPassword = password.toLowerCase();
    return sequences.some(seq => lowerPassword.includes(seq) || lowerPassword.includes(seq.split('').reverse().join('')));
  }

  function hasRepeatedCharacters(password) {
    return /(.)\1{2,}/.test(password);
  }

  function showError(inputElement, errorElement, message) {
    if (inputElement) {
      inputElement.classList.add('error');
      inputElement.classList.remove('valid');
      inputElement.setAttribute('aria-invalid', 'true');
    }
    
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  }

  function clearError(inputElement, errorElement) {
    if (inputElement) {
      inputElement.classList.remove('error');
      inputElement.setAttribute('aria-invalid', 'false');
    }
    
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
  }

  // ========================================
  // FORM SUBMISSION
  // ========================================

  function handleFormSubmit(e) {
    e.preventDefault();

    if (state.isSubmitting) return;

    state.touched.password = true;
    state.touched.confirmPassword = true;

    const isPasswordValid = validatePassword(elements.password.value);
    const isPasswordMatch = validatePasswordMatch();

    if (!isPasswordValid || !isPasswordMatch) {
      if (!isPasswordValid) {
        elements.password.focus();
      } else if (!isPasswordMatch) {
        elements.confirmPassword.focus();
      }
      
      announceToScreenReader('Please fix the errors before submitting');
      return;
    }

    state.isSubmitting = true;

    if (elements.submitBtn) {
      elements.submitBtn.classList.add('loading');
      elements.submitBtn.disabled = true;
      announceToScreenReader('Submitting password reset');
    }

    setTimeout(() => {
      elements.form.submit();
    }, 300);
  }

  function updateSubmitButton() {
    if (!elements.submitBtn) return;

    const isPasswordValid = !state.validationErrors.password && 
                           Object.values(state.requirements).every(Boolean) &&
                           elements.password?.value;
    const isConfirmValid = !state.validationErrors.confirmPassword &&
                          elements.confirmPassword?.value &&
                          elements.password?.value === elements.confirmPassword?.value;

    elements.submitBtn.disabled = !isPasswordValid || !isConfirmValid || state.isSubmitting;
  }

  // ========================================
  // SUCCESS COUNTDOWN
  // ========================================

  function setupSuccessCountdown() {
    if (!elements.countdown || !elements.progressBar) return;

    let timeLeft = CONFIG.REDIRECT_DELAY;
    const startTime = Date.now();
    const endTime = startTime + (CONFIG.REDIRECT_DELAY * 1000);
    
    announceToScreenReader(`Password reset successful. Redirecting to login in ${timeLeft} seconds.`);

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((endTime - now) / 1000);
      
      if (remaining !== timeLeft) {
        timeLeft = remaining;
        elements.countdown.textContent = Math.max(0, timeLeft);
        
        const progress = ((CONFIG.REDIRECT_DELAY - timeLeft) / CONFIG.REDIRECT_DELAY) * 100;
        elements.progressBar.style.width = `${progress}%`;
        
        if (timeLeft === 3 || timeLeft === 1) {
          announceToScreenReader(`Redirecting in ${timeLeft} second${timeLeft !== 1 ? 's' : ''}`);
        }
      }
      
      if (timeLeft <= 0) {
        clearInterval(interval);
        announceToScreenReader('Redirecting to login now');
        window.location.href = '/login';
      }
    }, 100);

    if (elements.redirectLink) {
      elements.redirectLink.addEventListener('click', (e) => {
        e.preventDefault();
        clearInterval(interval);
        window.location.href = '/login';
      });
    }
  }

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  function debounce(func, wait) {
    return function executedFunction(...args) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func(...args), wait);
    };
  }

  function announceToScreenReader(message) {
    if (!elements.liveRegion) return;
    
    elements.liveRegion.textContent = '';
    setTimeout(() => {
      elements.liveRegion.textContent = message;
    }, 100);
  }

  function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => 
      ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2)
    );
  }

  // ========================================
  // PUBLIC API
  // ========================================

  window.resetPasswordApp = {
    validatePassword: () => validatePassword(elements.password?.value),
    validatePasswordMatch,
    getValidationErrors: () => state.validationErrors,
    isFormValid: () => !state.validationErrors.password && !state.validationErrors.confirmPassword
  };

})();