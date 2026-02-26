const User = require('../models/User');
const { getCountries, isValidCountryCode, normalizeCountryCode } = require('../utils/country');
const { getRunnerRegistrations, buildRunnerDashboardData } = require('../services/runner-data.service');

const countries = getCountries();

exports.getDashboard = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const [runningGroups, registrations] = await Promise.all([
      getRunningGroupSuggestions(),
      getRunnerRegistrations(user._id)
    ]);
    const dashboardData = buildRunnerDashboardData(registrations);
    const profileCompleteness = getProfileCompleteness(getRunnerProfileFormData(user));

    return res.render('runner/dashboard', {
      user,
      userName: user.firstName,
      countries,
      errors: {},
      message: getRunnerProfileMessage(req.query),
      profileData: getRunnerProfileFormData(user),
      runningGroups,
      profileCompleteness,
      cards: {
        upcoming: dashboardData.upcoming.slice(0, 5).map(normalizeRegistrationCard),
        past: dashboardData.past.slice(0, 5).map(normalizeRegistrationCard),
        activity: dashboardData.activity.slice(0, 8).map((item) => ({
          ...item,
          atLabel: formatDateTime(item.at)
        }))
      },
      stats: dashboardData.stats
    });
  } catch (error) {
    console.error('Runner dashboard load error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your dashboard.'
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await getRunnerFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const formData = getRunnerProfileFormData(req.body);
    const errors = validateRunnerProfileForm(formData);

    if (Object.keys(errors).length > 0) {
      const [runningGroups, registrations] = await Promise.all([
        getRunningGroupSuggestions(),
        getRunnerRegistrations(user._id)
      ]);
      const dashboardData = buildRunnerDashboardData(registrations);
      const profileCompleteness = getProfileCompleteness(formData);

      return res.status(400).render('runner/dashboard', {
        user,
        userName: user.firstName,
        countries,
        errors,
        message: null,
        profileData: formData,
        runningGroups,
        profileCompleteness,
        cards: {
          upcoming: dashboardData.upcoming.slice(0, 5).map(normalizeRegistrationCard),
          past: dashboardData.past.slice(0, 5).map(normalizeRegistrationCard),
          activity: dashboardData.activity.slice(0, 8).map((item) => ({
            ...item,
            atLabel: formatDateTime(item.at)
          }))
        },
        stats: dashboardData.stats
      });
    }

    user.firstName = formData.firstName;
    user.lastName = formData.lastName;
    user.mobile = formData.mobile;
    user.country = formData.country;
    user.dateOfBirth = formData.dateOfBirth ? new Date(`${formData.dateOfBirth}T00:00:00.000Z`) : null;
    user.gender = formData.gender;
    user.emergencyContactName = formData.emergencyContactName;
    user.emergencyContactNumber = formData.emergencyContactNumber;
    user.runningGroup = formData.runningGroup;
    await user.save();

    return res.redirect('/runner/dashboard?type=success&msg=Profile%20updated%20successfully.');
  } catch (error) {
    console.error('Runner profile update error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while updating your profile.'
    });
  }
};

function normalizeRegistrationCard(registration) {
  return {
    id: String(registration._id),
    confirmationCode: registration.confirmationCode || '',
    title: registration.eventId?.title || 'Event unavailable',
    slug: registration.eventId?.slug || '',
    startAtLabel: formatDateTime(registration.eventId?.eventStartAt),
    distance: registration.raceDistance || 'N/A',
    mode: registration.participationMode || 'N/A',
    status: registration.status || 'N/A',
    paymentStatus: registration.paymentStatus || 'N/A',
    isUnpaid: registration.paymentStatus === 'unpaid'
  };
}

function getProfileCompleteness(profileData) {
  const required = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'country', label: 'Country' },
    { key: 'dateOfBirth', label: 'Date of Birth' },
    { key: 'gender', label: 'Gender' },
    { key: 'emergencyContactName', label: 'Emergency Contact Name' },
    { key: 'emergencyContactNumber', label: 'Emergency Contact Number' }
  ];

  const missingFields = required
    .filter((item) => !String(profileData[item.key] || '').trim())
    .map((item) => item.label);

  const completedCount = required.length - missingFields.length;
  const percent = Math.round((completedCount / required.length) * 100);

  return {
    requiredCount: required.length,
    completedCount,
    percent,
    missingFields
  };
}

function getRunnerProfileMessage(query) {
  const msg = typeof query.msg === 'string' ? query.msg.trim() : '';
  if (!msg) return null;
  return {
    type: query.type === 'error' ? 'error' : 'success',
    text: msg.slice(0, 200)
  };
}

function formatDateForInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const utcYear = date.getUTCFullYear();
  const utcMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const utcDay = String(date.getUTCDate()).padStart(2, '0');
  return `${utcYear}-${utcMonth}-${utcDay}`;
}

function formatDateTime(value) {
  if (!value) return 'TBA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBA';
  return date.toLocaleString('en-US');
}

function getRunnerProfileFormData(body = {}) {
  return {
    firstName: String(body.firstName || '').trim(),
    lastName: String(body.lastName || '').trim(),
    mobile: String(body.mobile || '').trim(),
    country: normalizeCountryCode(body.country),
    dateOfBirth: formatDateForInput(body.dateOfBirth),
    gender: String(body.gender || '').trim(),
    emergencyContactName: String(body.emergencyContactName || '').trim(),
    emergencyContactNumber: String(body.emergencyContactNumber || '').trim(),
    runningGroup: String(body.runningGroup || '').trim()
  };
}

function validateRunnerProfileForm(formData) {
  const errors = {};
  const genderValues = new Set(['', 'male', 'female', 'non_binary', 'prefer_not_to_say']);

  if (!formData.firstName || formData.firstName.length < 2 || formData.firstName.length > 60) {
    errors.firstName = 'First name must be 2-60 characters.';
  }
  if (!formData.lastName || formData.lastName.length < 2 || formData.lastName.length > 60) {
    errors.lastName = 'Last name must be 2-60 characters.';
  }
  if (formData.mobile && !/^[\d\s\-()+]{7,25}$/.test(formData.mobile)) {
    errors.mobile = 'Enter a valid mobile number.';
  }
  if (formData.country && !isValidCountryCode(formData.country)) {
    errors.country = 'Select a valid country.';
  }
  if (formData.dateOfBirth) {
    const dobDate = new Date(`${formData.dateOfBirth}T00:00:00.000Z`);
    if (Number.isNaN(dobDate.getTime())) {
      errors.dateOfBirth = 'Enter a valid date of birth.';
    } else if (dobDate > new Date()) {
      errors.dateOfBirth = 'Date of birth cannot be in the future.';
    }
  }
  if (!genderValues.has(formData.gender)) {
    errors.gender = 'Select a valid gender option.';
  }
  if (formData.emergencyContactName && formData.emergencyContactName.length > 120) {
    errors.emergencyContactName = 'Emergency contact name must be 120 characters or less.';
  }
  if (formData.emergencyContactNumber && !/^[\d\s\-()+]{7,25}$/.test(formData.emergencyContactNumber)) {
    errors.emergencyContactNumber = 'Enter a valid emergency contact number.';
  }
  if (formData.runningGroup.length > 120) {
    errors.runningGroup = 'Running group must be 120 characters or less.';
  }

  return errors;
}

async function getRunnerFromSession(req) {
  if (!req.session.userId) {
    return null;
  }
  const user = await User.findById(req.session.userId);
  if (!user || user.role !== 'runner') {
    return null;
  }
  return user;
}

async function getRunningGroupSuggestions() {
  const groups = await User.distinct('runningGroup', { runningGroup: { $exists: true, $ne: '' } });
  return groups
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 50);
}
