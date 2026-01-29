// Password toggle functionality
document.addEventListener('DOMContentLoaded', function() {
  // Toggle password visibility
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault(); // Prevent any default behavior
      
      const targetId = this.getAttribute('data-target');
      const passwordInput = document.getElementById(targetId);
      const icon = this.querySelector('.eye-icon');
      
      // ✅ ADD SAFETY CHECK
      if (!passwordInput) {
        console.error('Password input not found for ID:', targetId);
        return;
      }
      
      if (!icon) {
        console.error('Eye icon not found in button');
        return;
      }
      
      console.log('Toggle clicked for:', targetId); // Debug log
      console.log('Current type:', passwordInput.type); // Debug log
      
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
        console.log('Changed to visible'); // Debug log
      } else {
        passwordInput.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
        console.log('Changed to hidden'); // Debug log
      }
      
      lucide.createIcons();
    });
  });
  
  // Password strength indicator
  const passwordInput = document.getElementById('password');
  const strengthBar = document.getElementById('passwordStrength');
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');
  
  if (passwordInput) {
    passwordInput.addEventListener('input', function() {
      const password = this.value;
      
      if (password.length === 0) {
        strengthBar.style.display = 'none';
        return;
      }
      
      strengthBar.style.display = 'block';
      
      let strength = 0;
      let text = '';
      let color = '';
      
      // Check criteria
      if (password.length >= 8) strength++;
      if (/[A-Z]/.test(password)) strength++;
      if (/[a-z]/.test(password)) strength++;
      if (/[0-9]/.test(password)) strength++;
      if (/[^A-Za-z0-9]/.test(password)) strength++;
      
      // Update UI
      switch (strength) {
        case 0:
        case 1:
          strengthFill.style.width = '20%';
          strengthFill.style.backgroundColor = '#ef4444';
          text = 'Very Weak';
          color = '#ef4444';
          break;
        case 2:
          strengthFill.style.width = '40%';
          strengthFill.style.backgroundColor = '#f97316';
          text = 'Weak';
          color = '#f97316';
          break;
        case 3:
          strengthFill.style.width = '60%';
          strengthFill.style.backgroundColor = '#eab308';
          text = 'Fair';
          color = '#eab308';
          break;
        case 4:
          strengthFill.style.width = '80%';
          strengthFill.style.backgroundColor = '#3b82f6';
          text = 'Good';
          color = '#3b82f6';
          break;
        case 5:
          strengthFill.style.width = '100%';
          strengthFill.style.backgroundColor = '#10b981';
          text = 'Strong';
          color = '#10b981';
          break;
      }
      
      strengthText.textContent = text;
      strengthText.style.color = color;
    });
  }
  
  // Form validation
  const form = document.getElementById('signupForm');
  if (form) {
    form.addEventListener('submit', function(e) {
      // Clear previous errors
      document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
      
      // Validate passwords match
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      if (password !== confirmPassword) {
        e.preventDefault();
        document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
        return;
      }
      
      // Show loading state
      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = true;
      submitBtn.querySelector('.btn-text').style.display = 'none';
      submitBtn.querySelector('.btn-loader').style.display = 'flex';
    });
  }
});