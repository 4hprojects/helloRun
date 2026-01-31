document.addEventListener('DOMContentLoaded', function() {
  
  // ========================================
  // FLOATING LABEL (Works on any input)
  // ========================================
  const inputGroups = document.querySelectorAll('.input-group');
  
  inputGroups.forEach(group => {
    const input = group.querySelector('input, select');
    
    if (input) {
      // Check if input has value on load
      if (input.value.trim() !== '' || (input.tagName === 'SELECT' && input.value !== '')) {
        group.classList.add('filled');
      }
      
      input.addEventListener('focus', function() {
        group.classList.add('focused');
      });
      
      input.addEventListener('blur', function() {
        group.classList.remove('focused');
        if (this.value.trim() !== '' || (this.tagName === 'SELECT' && this.value !== '')) {
          group.classList.add('filled');
        } else {
          group.classList.remove('filled');
        }
      });
      
      if (input.tagName === 'SELECT') {
        input.addEventListener('change', function() {
          if (this.value !== '') {
            group.classList.add('filled');
          } else {
            group.classList.remove('filled');
          }
        });
      }
    }
  });

  // ========================================
  // PASSWORD TOGGLE (Works on any page)
  // ========================================
  const toggleButtons = document.querySelectorAll('.toggle-password');
  
  toggleButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('data-target');
      const passwordInput = document.getElementById(targetId);
      const showIcon = this.querySelector('.show-password');
      const hideIcon = this.querySelector('.hide-password');
      
      // Safety checks
      if (!passwordInput) {
        console.error('Password input not found for ID:', targetId);
        return;
      }
      
      if (!showIcon || !hideIcon) {
        console.error('Eye icons not found in button');
        return;
      }
      
      // Toggle visibility
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        showIcon.style.display = 'none';
        hideIcon.style.display = 'block';
        this.setAttribute('aria-label', 'Hide password');
      } else {
        passwordInput.type = 'password';
        showIcon.style.display = 'block';
        hideIcon.style.display = 'none';
        this.setAttribute('aria-label', 'Show password');
      }
      
      // Re-create icons to ensure they display correctly
      lucide.createIcons();
    });
  });

  // ========================================
  // PASSWORD STRENGTH (Only for signup)
  // ========================================
  const passwordInput = document.getElementById('password');
  const strengthBar = document.getElementById('passwordStrength');
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');
  
  if (passwordInput && strengthBar) { // Only runs if elements exist
    passwordInput.addEventListener('input', function() {
      const password = this.value;
      
      if (password.length === 0) {
        strengthBar.style.display = 'none';
        return;
      }
      
      strengthBar.style.display = 'block';
      
      let strength = 0;
      
      // Check criteria
      if (password.length >= 8) strength++;
      if (/[A-Z]/.test(password)) strength++;
      if (/[a-z]/.test(password)) strength++;
      if (/[0-9]/.test(password)) strength++;
      if (/[^A-Za-z0-9]/.test(password)) strength++;
      
      // Update UI based on strength
      const strengthLevels = [
        { width: '20%', color: '#ef4444', text: 'Very Weak' },
        { width: '20%', color: '#ef4444', text: 'Very Weak' },
        { width: '40%', color: '#f97316', text: 'Weak' },
        { width: '60%', color: '#eab308', text: 'Fair' },
        { width: '80%', color: '#3b82f6', text: 'Good' },
        { width: '100%', color: '#10b981', text: 'Strong' }
      ];
      
      const level = strengthLevels[strength];
      strengthFill.style.width = level.width;
      strengthFill.style.backgroundColor = level.color;
      strengthText.textContent = level.text;
      strengthText.style.color = level.color;
    });
  }

  // ========================================
  // FORM VALIDATION (Generic)
  // ========================================
  const forms = document.querySelectorAll('form[id$="Form"]'); // Any form ending with "Form"
  
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      // Clear previous errors
      this.querySelectorAll('.form-error').forEach(el => {
        el.textContent = '';
        el.classList.remove('show');
      });
      
      // Password match validation (only if confirmPassword exists)
      const password = this.querySelector('#password');
      const confirmPassword = this.querySelector('#confirmPassword');
      
      if (password && confirmPassword) {
        if (password.value !== confirmPassword.value) {
          e.preventDefault();
          const errorEl = document.getElementById('confirmPasswordError');
          if (errorEl) {
            errorEl.textContent = 'Passwords do not match';
            errorEl.classList.add('show');
          }
          confirmPassword.classList.add('error');
          return;
        }
      }
      
      // Show loading state on submit button
      const submitBtn = this.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'flex';
      }
    });
  });

  // ========================================
  // INITIALIZE LUCIDE ICONS
  // ========================================
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});