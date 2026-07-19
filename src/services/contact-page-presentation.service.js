'use strict';

const DEFAULT_SUPPORT_EMAIL = 'hellorunonline@gmail.com';
const PRIVACY_EMAIL = '4hprojects@proton.me';
const ORGANIZER_SOURCE = 'organizer-dashboard';

const CONTACT_TOPICS = Object.freeze([
  { value: 'account_access', label: 'Account access', subject: 'Account access', inbox: 'support', hint: 'Include the account email and explain where sign-in or account recovery stops working.' },
  { value: 'registration_payment', label: 'Registration or payment', subject: 'Registration or payment concern', inbox: 'support', hint: 'Include the event name and confirmation code. Event-specific approval or refund decisions may require the organizer.' },
  { value: 'activity_result', label: 'Activity proof or result', subject: 'Activity proof or result review', inbox: 'support', hint: 'Include the event, submission context, and the runner-facing review message. Do not attach proof unless requested.' },
  { value: 'recognition', label: 'Leaderboard or certificate', subject: 'Leaderboard or certificate concern', inbox: 'support', hint: 'Include the event, selected distance or goal, and the result or certificate reference when available.' },
  { value: 'organizer_tools', label: 'Organizer application or event tools', subject: 'Organizer support', inbox: 'support', hint: 'Include the application ID, event name, or event reference code so support can locate the correct workspace.' },
  { value: 'privacy_data', label: 'Privacy or account data', subject: 'Privacy or account data request', inbox: 'privacy', hint: 'Describe the request first. Do not email identity documents, proof files, or sensitive records unless support asks for them.' },
  { value: 'safety_content', label: 'Safety or content report', subject: 'Safety or content report', inbox: 'support', hint: 'Include the public page URL and enough context to identify the event, post, comment, or account involved.' },
  { value: 'partnership_other', label: 'Partnership or another question', subject: 'Partnership or general inquiry', inbox: 'support', hint: 'Share the organization, event idea, dates, and the HelloRun tools you expect to use.' }
]);

function normalizeEmail(value, fallback) {
  const normalized = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : fallback;
}

function normalizeContactSource(value) {
  return String(value || '').trim() === ORGANIZER_SOURCE ? ORGANIZER_SOURCE : '';
}

function normalizeContactTopic(value) {
  const normalized = String(value || '').trim();
  return CONTACT_TOPICS.some((topic) => topic.value === normalized) ? normalized : '';
}

function resolveRole(locals = {}) {
  if (locals.isAdmin) return 'Administrator';
  if (locals.isOrganizer || locals.isApprovedOrganizer) return 'Organizer';
  if (locals.isAuthenticated) return 'Runner';
  return 'Guest';
}

function buildRoleActions(locals = {}) {
  const actions = [
    { label: 'Read the FAQ', href: '/faq', icon: 'circle-help', help: 'Common account, registration, proof, and recognition questions.' },
    { label: 'See how events work', href: '/how-it-works', icon: 'route', help: 'Understand registration, proof review, standings, and certificates.' }
  ];

  if (locals.isAdmin) {
    actions.push({ label: 'Admin Dashboard', href: '/admin/dashboard', icon: 'shield-check', help: 'Return to platform operations and review tools.' });
  } else if (locals.isOrganizer || locals.isApprovedOrganizer) {
    actions.push({ label: 'Organizer Dashboard', href: '/organizer/dashboard', icon: 'layout-dashboard', help: 'Return to event setup, participants, and review work.' });
  } else if (locals.isAuthenticated) {
    actions.push(
      { label: 'My Registrations', href: '/my-registrations', icon: 'clipboard-list', help: 'Check payment, event, and submission readiness.' },
      { label: 'Submission History', href: '/runner/submissions', icon: 'file-check', help: 'Review approved, pending, or rejected activities.' }
    );
  } else {
    actions.push({ label: 'Browse Events', href: '/events', icon: 'calendar-search', help: 'Open an event page for its rules and organizer contact.' });
  }

  return actions;
}

function buildContactPresentation({ locals = {}, source, topic, supportEmail } = {}) {
  const normalizedSource = normalizeContactSource(source);
  const role = resolveRole(locals);
  const selectedTopic = normalizedSource === ORGANIZER_SOURCE ? 'organizer_tools' : normalizeContactTopic(topic);

  return {
    supportEmail: normalizeEmail(supportEmail, DEFAULT_SUPPORT_EMAIL),
    privacyEmail: PRIVACY_EMAIL,
    topics: CONTACT_TOPICS.map((topic) => ({ ...topic, selected: topic.value === selectedTopic })),
    selectedTopic,
    source: normalizedSource,
    sourceContext: normalizedSource
      ? {
          title: 'Organizer support context',
          message: 'Include your application ID, event name, or event reference code so support can find the correct organizer record.'
        }
      : null,
    actor: {
      role,
      email: locals.isAuthenticated ? normalizeEmail(locals.user?.email, '') : ''
    },
    actions: buildRoleActions(locals)
  };
}

module.exports = {
  CONTACT_TOPICS,
  DEFAULT_SUPPORT_EMAIL,
  PRIVACY_EMAIL,
  buildContactPresentation,
  buildRoleActions,
  normalizeContactSource,
  normalizeContactTopic,
  normalizeEmail
};
