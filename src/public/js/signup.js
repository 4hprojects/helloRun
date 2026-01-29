document.addEventListener('DOMContentLoaded', function() {
  
  // Floating label functionality
  const inputGroups = document.querySelectorAll('.input-group');
  
  inputGroups.forEach(group => {
    const input = group.querySelector('input, select');
    
    if (input) {
      // Focus event - add focused class
      input.addEventListener('focus', () => {
        group.classList.add('focused');
      });
      
      // Blur event - remove focused, check if filled
      input.addEventListener('blur', () => {
        group.classList.remove('focused');
        
        if (input.value && input.value.trim() !== '') {
          group.classList.add('filled');
        } else {
          group.classList.remove('filled');
        }
      });
      
      // Check on page load if input already has value
      if (input.value && input.value.trim() !== '') {
        group.classList.add('filled');
      }
    }
  });

  // Password toggle functionality
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const passwordInput = document.getElementById(targetId);
      const icon = this.querySelector('.eye-icon');

      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
      } else {
        passwordInput.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
      }
      
      // Re-create icons to update the SVG
      lucide.createIcons();
    });
  });

  // Password strength indicator
  const passwordInput = document.getElementById('password');
  const strengthIndicator = document.getElementById('passwordStrength');
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');

  // Password strength checker function
  function checkPasswordStrength(pwd) {
    let strength = 0;
    const feedback = [];

    if (pwd.length >= 8) strength++;
    else feedback.push('at least 8 characters');

    if (/[a-z]/.test(pwd)) strength++;
    else feedback.push('a lowercase letter');

    if (/[A-Z]/.test(pwd)) strength++;
    else feedback.push('an uppercase letter');

    if (/[0-9]/.test(pwd)) strength++;
    else feedback.push('a number');

    if (/[^a-zA-Z0-9]/.test(pwd)) strength++; // Special character bonus

    return { strength, feedback };
  }

  // Update password strength indicator on input
  if (passwordInput && strengthIndicator) {
    passwordInput.addEventListener('input', (e) => {
      const pwd = e.target.value;
      
      if (pwd.length === 0) {
        strengthIndicator.style.display = 'none';
        return;
      }

      strengthIndicator.style.display = 'block';
      const { strength, feedback } = checkPasswordStrength(pwd);

      // Update visual indicator
      const percentage = (strength / 5) * 100;
      strengthFill.style.width = percentage + '%';

      // Update color and text based on strength
      if (strength <= 2) {
        strengthFill.style.backgroundColor = '#e74c3c';
        strengthText.textContent = 'Weak password';
        strengthText.style.color = '#e74c3c';
      } else if (strength === 3) {
        strengthFill.style.backgroundColor = '#f39c12';
        strengthText.textContent = 'Fair password';
        strengthText.style.color = '#f39c12';
      } else if (strength === 4) {
        strengthFill.style.backgroundColor = '#2ecc71';
        strengthText.textContent = 'Good password';
        strengthText.style.color = '#2ecc71';
      } else {
        strengthFill.style.backgroundColor = '#27ae60';
        strengthText.textContent = 'Strong password';
        strengthText.style.color = '#27ae60';
      }

      // Show what's missing
      if (feedback.length > 0 && strength < 4) {
        strengthText.textContent += ' (needs: ' + feedback.join(', ') + ')';
      }
    });
  }

  // Real-time password match validation
  const confirmPassword = document.getElementById('confirmPassword');
  if (confirmPassword && passwordInput) {
    confirmPassword.addEventListener('input', () => {
      const confirmError = document.getElementById('confirmPasswordError');
      
      if (confirmPassword.value && passwordInput.value !== confirmPassword.value) {
        confirmError.textContent = 'Passwords do not match';
        confirmError.classList.add('show');
        confirmPassword.classList.add('error');
      } else {
        confirmError.textContent = '';
        confirmError.classList.remove('show');
        confirmPassword.classList.remove('error');
      }
    });
  }

  // Form validation
  const form = document.getElementById('signupForm');
  const submitBtn = document.getElementById('submitBtn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear previous errors
      document.querySelectorAll('.form-error').forEach(el => {
        el.textContent = '';
        el.classList.remove('show');
      });
      document.querySelectorAll('.checkbox-error').forEach(el => {
        el.textContent = '';
        el.classList.remove('show');
      });
      document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

      let isValid = true;

      // Validate first name
      const firstName = document.getElementById('firstName');
      if (!firstName.value.trim() || firstName.value.trim().length < 2) {
        showError('firstNameError', 'First name must be at least 2 characters');
        firstName.classList.add('error');
        isValid = false;
      }

      // Validate last name
      const lastName = document.getElementById('lastName');
      if (!lastName.value.trim() || lastName.value.trim().length < 2) {
        showError('lastNameError', 'Last name must be at least 2 characters');
        lastName.classList.add('error');
        isValid = false;
      }

      // Validate email
      const email = document.getElementById('email');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.value)) {
        showError('emailError', 'Please enter a valid email address');
        email.classList.add('error');
        isValid = false;
      }

      // Validate password
      const { strength } = checkPasswordStrength(passwordInput.value);
      if (strength < 4) {
        showError('passwordError', 'Password must contain uppercase, lowercase, and a number');
        passwordInput.classList.add('error');
        isValid = false;
      }

      // Validate password match
      if (passwordInput.value !== confirmPassword.value) {
        showError('confirmPasswordError', 'Passwords do not match');
        confirmPassword.classList.add('error');
        isValid = false;
      }

      // Validate role
      const role = document.getElementById('role');
      if (!role.value) {
        showError('roleError', 'Please select a role');
        role.classList.add('error');
        isValid = false;
      }

      // Validate terms and conditions checkbox
      const agreeTerms = document.getElementById('agreeTerms');
      const termsGroup = document.getElementById('termsGroup');
      if (!agreeTerms.checked) {
        showCheckboxError('termsError', 'You must agree to the Terms and Conditions');
        termsGroup.classList.add('error');
        isValid = false;
      }

      if (isValid) {
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-loader').style.display = 'flex';
        
        // Submit form
        form.submit();
      }
    });
  }

  function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('show');
    }
  }

  function showCheckboxError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('show');
    }
  }
});