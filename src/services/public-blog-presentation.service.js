const DEFAULT_ACTIONS = [
  { label: 'Browse events', href: '/events', icon: 'calendar' },
  { label: 'How it works', href: '/how-it-works', icon: 'info' },
  { label: 'Read the FAQ', href: '/faq', icon: 'help-circle' }
];

const CATEGORY_PRESENTATION = {
  Training: {
    audience: 'Runners and walkers',
    actions: [
      { label: 'Browse events', href: '/events', icon: 'calendar' },
      { label: 'How proof works', href: '/how-it-works', icon: 'file-check' },
      { label: 'View your results', href: '/runner', icon: 'trophy' }
    ],
    nextStep: { label: 'Find your next run', href: '/events' }
  },
  'Race Tips': {
    audience: 'Race participants',
    actions: [
      { label: 'Browse events', href: '/events', icon: 'calendar' },
      { label: 'Register for a run', href: '/events', icon: 'user-plus' },
      { label: 'Read the event FAQ', href: '/faq', icon: 'help-circle' }
    ],
    nextStep: { label: 'Browse upcoming events', href: '/events' }
  },
  'Virtual Run Guide': {
    audience: 'Virtual runners',
    actions: [
      { label: 'Browse virtual runs', href: '/events?eventType=virtual', icon: 'play-circle' },
      { label: 'How to submit proof', href: '/how-it-works', icon: 'file-check' },
      { label: 'Read the FAQ', href: '/faq', icon: 'help-circle' }
    ],
    nextStep: { label: 'Explore virtual events', href: '/events?eventType=virtual' }
  },
  'Organizer Guide': {
    audience: 'Event organisers',
    actions: [
      { label: 'Open organiser portal', href: '/organizer', icon: 'layout-dashboard' },
      { label: 'Create an event', href: '/organizer', icon: 'plus-circle' },
      { label: 'Review the FAQ', href: '/faq', icon: 'search' }
    ],
    nextStep: { label: 'Go to the organiser portal', href: '/organizer' }
  },
  Nutrition: { audience: 'Runners and walkers' },
  Gear: { audience: 'All runners' },
  'Injury Prevention': { audience: 'Runners and walkers' },
  'Mental Health': { audience: 'All runners' },
  Community: { audience: 'The HelloRun community' },
  Motivation: { audience: 'All runners' }
};

function getBlogArticlePresentation(post = {}) {
  const configured = CATEGORY_PRESENTATION[post.category] || {};
  const categoryLabel = post.category === 'Other' && post.customCategory
    ? post.customCategory
    : post.category || 'Community';
  return {
    categoryLabel,
    audience: configured.audience || 'The running community',
    actions: configured.actions || DEFAULT_ACTIONS,
    nextStep: configured.nextStep || { label: 'Browse community events', href: '/events' },
    tags: Array.isArray(post.tags) ? post.tags.slice(0, 2) : []
  };
}

module.exports = {
  getBlogArticlePresentation
};
