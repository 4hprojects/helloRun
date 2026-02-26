document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
});

/**
 * Initialize dashboard functionality
 */
function initializeDashboard() {
  setupLogoutHandler();
  setupCardInteractions();
  setupProfileForm();
}

/**
 * Setup logout button handler
 */
function setupLogoutHandler() {
  const logoutForm = document.querySelector('.logout-form');
  
  if (logoutForm) {
    logoutForm.addEventListener('submit', (e) => {
      // Optional: Add confirmation before logout
      const confirmed = confirm('Are you sure you want to logout?');
      if (!confirmed) {
        e.preventDefault();
      }
    });
  }
}

/**
 * Setup card interaction effects
 */
function setupCardInteractions() {
  const browseBtn = document.querySelector('[data-dashboard-action="browse-events"]');
  if (browseBtn) {
    browseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = browseBtn.href;
    });
  }
}

function setupProfileForm() {
  const profileForm = document.getElementById('runnerProfileForm');
  const saveButton = document.getElementById('saveProfileBtn');

  if (!profileForm || !saveButton) {
    return;
  }

  profileForm.addEventListener('submit', (event) => {
    const dobInput = profileForm.querySelector('input[name="dateOfBirth"]');
    if (dobInput && dobInput.value) {
      const selectedDate = new Date(`${dobInput.value}T00:00:00.000Z`);
      const today = new Date();
      if (!Number.isNaN(selectedDate.getTime()) && selectedDate > today) {
        event.preventDefault();
        alert('Date of birth cannot be in the future.');
        dobInput.focus();
        return;
      }
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
  });
}

