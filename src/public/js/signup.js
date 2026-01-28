// Password validation function
function isValidPassword(password) {
  // Requires at least one uppercase letter, one lowercase letter, one number, and at least 8 characters
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
}

// Check individual password requirements
function checkPasswordRequirements(password) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password)
  };
}

// Update requirement indicators
function updateRequirementIndicators(checks) {
  Object.keys(checks).forEach(requirement => {
    const element = document.querySelector(`[data-requirement="${requirement}"]`);
    if (element) {
      const icon = element.querySelector('.icon');
      if (checks[requirement]) {
        element.classList.add('met');
        element.classList.remove('unmet');
        icon.textContent = '✅';
      } else {
        element.classList.add('unmet');
        element.classList.remove('met');
        icon.textContent = '❌';
      }
    }
  });
}

// Password visibility toggle
document.querySelectorAll('.toggle-password').forEach(button => {
  button.addEventListener('click', function() {
    const targetId = this.getAttribute('data-target');
    const input = document.getElementById(targetId);
    const showIcon = this.querySelector('.show-password');
    const hideIcon = this.querySelector('.hide-password');
    
    if (input.type === 'password') {
      input.type = 'text';
      showIcon.style.display = 'none';
      hideIcon.style.display = 'inline';
    } else {
      input.type = 'password';
      showIcon.style.display = 'inline';
      hideIcon.style.display = 'none';
    }
  });
});

// Real-time password validation
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const submitBtn = document.getElementById('submitBtn');
const matchMessage = document.querySelector('.password-match-message');

passwordInput.addEventListener('input', function() {
  const checks = checkPasswordRequirements(this.value);
  updateRequirementIndicators(checks);
  checkPasswordMatch();
});

confirmPasswordInput.addEventListener('input', checkPasswordMatch);

function checkPasswordMatch() {
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  if (confirmPassword === '') {
    matchMessage.textContent = '';
    matchMessage.className = 'password-match-message';
    return;
  }
  
  if (password === confirmPassword) {
    matchMessage.textContent = '✅ Passwords match';
    matchMessage.className = 'password-match-message match';
  } else {
    matchMessage.textContent = '❌ Passwords do not match';
    matchMessage.className = 'password-match-message no-match';
  }
}

// Form submission validation
document.getElementById('signupForm').addEventListener('submit', function(e) {
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  if (!isValidPassword(password)) {
    e.preventDefault();
    alert('Please meet all password requirements');
    return;
  }
  
  if (password !== confirmPassword) {
    e.preventDefault();
    alert('Passwords do not match');
    return;
  }
});