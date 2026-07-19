'use strict';

const FAQ_CATEGORIES = Object.freeze([
  {
    id: 'getting-started',
    label: 'Getting started and event formats',
    shortLabel: 'Getting started',
    icon: 'circle-play',
    description: 'Understand HelloRun, event formats, eligibility, and where to begin.',
    questions: [
      {
        id: 'what-is-hellorun',
        question: 'What is HelloRun?',
        answer: 'HelloRun is a running-event platform for discovering events, registering, submitting accepted activity evidence, following review status, viewing verified standings, and collecting recognition when an event enables it.',
        keywords: ['platform', 'runner', 'events'],
        links: [{ label: 'Browse current events', href: '/events' }]
      },
      {
        id: 'event-formats',
        question: 'What event formats does HelloRun support?',
        answer: 'Events may be virtual, on-site, or hybrid. A single-result event normally records one qualifying performance, while an accumulated challenge combines multiple approved activities toward a selected distance goal. Each event page is authoritative for its own format and rules.',
        keywords: ['virtual', 'on-site', 'hybrid', 'single result', 'accumulated'],
        links: [{ label: 'See how events work', href: '/how-it-works' }]
      },
      {
        id: 'virtual-event-location',
        question: 'Can I join a virtual event from anywhere?',
        answer: 'Often, but not always. Check the event page for country, location, delivery, age, activity, and eligibility restrictions before registering. An organizer may limit participation even when the activity itself is completed remotely.',
        keywords: ['country', 'location', 'eligibility', 'virtual run'],
        links: [{ label: 'Find an event', href: '/events' }]
      },
      {
        id: 'walk-or-other-activity',
        question: 'Can I walk, hike, or use another activity instead of running?',
        answer: 'Only when the event lists that activity as accepted. Some challenges accept walking, hiking, trail running, or mixed eligible activities; others require a particular activity type. Follow the event page rather than assuming every movement will count.',
        keywords: ['walk', 'hike', 'trail run', 'activity type'],
        links: [{ label: 'Review event listings', href: '/events' }]
      },
      {
        id: 'tracking-device',
        question: 'Do I need a GPS watch or a specific tracking app?',
        answer: 'Not necessarily. Many events accept clear records from common fitness apps, GPS watches, or treadmills, and some allow manual entries with supporting evidence. The event rules decide which sources are accepted and which details must be visible.',
        keywords: ['GPS', 'Strava', 'Garmin', 'treadmill', 'tracking app'],
        links: [{ label: 'Read the submission checklist', href: '/how-it-works#submit-title' }]
      }
    ]
  },
  {
    id: 'registration-payment',
    label: 'Registration and payment',
    shortLabel: 'Registration',
    icon: 'clipboard-check',
    description: 'Choose a category, understand payment review, and manage an event entry.',
    questions: [
      {
        id: 'register-for-event',
        question: 'How do I register for an event?',
        answer: 'Open the event page, review its organizer, dates, category or goal, price, participation mode, and proof rules, then use the registration action. Sign in or create an account when prompted and keep the confirmation code shown after registration.',
        keywords: ['join', 'signup', 'confirmation code', 'category'],
        links: [{ label: 'Browse events', href: '/events' }]
      },
      {
        id: 'free-or-paid-events',
        question: 'Are HelloRun events free?',
        answer: 'Creating a runner account may be free, but each organizer sets the price and package options for its event. Events may be free or paid. Review the amount, inclusions, refund terms, and organizer before completing registration.',
        keywords: ['price', 'fee', 'free event', 'package'],
        links: [{ label: 'Read the refund and cancellation policy', href: '/refund-and-cancellation-policy' }]
      },
      {
        id: 'payment-versus-activity-review',
        question: 'Are payment approval and activity approval the same?',
        answer: 'No. Payment review confirms the transaction for a paid registration. Activity-proof review separately decides whether a submitted run or other activity follows the event rules. An approved payment does not automatically approve a result, and an activity should not be submitted as payment evidence.',
        keywords: ['receipt', 'payment proof', 'activity proof', 'approval'],
        links: [{ label: 'Manage registrations', href: '/my-registrations' }]
      },
      {
        id: 'payment-pending-or-rejected',
        question: 'What should I do if my payment is pending or rejected?',
        answer: 'Pending means the organizer or an authorized reviewer has not completed the payment review. If rejected, read the runner-facing reason and use the payment section of My Registrations to provide a corrected receipt when allowed. Contact the event organizer for event-specific transaction decisions.',
        keywords: ['unpaid', 'pending payment', 'rejected receipt', 'fix payment'],
        links: [{ label: 'Open My Registrations', href: '/my-registrations' }]
      },
      {
        id: 'change-cancel-refund-registration',
        question: 'Can I change, cancel, transfer, or refund a registration?',
        answer: 'Availability depends on the organizer rules, event status, and applicable HelloRun policies. Do not assume an entry can be transferred or refunded. Contact the organizer through the event page and include the event name and confirmation code without publishing payment details.',
        keywords: ['cancel', 'transfer', 'refund', 'change category'],
        links: [
          { label: 'Read the refund policy', href: '/refund-and-cancellation-policy' },
          { label: 'Contact support', href: '/contact' }
        ]
      }
    ]
  },
  {
    id: 'activities-proof',
    label: 'Activities, proof, and submission rules',
    shortLabel: 'Activities and proof',
    icon: 'file-check-2',
    description: 'Prepare readable evidence and submit the right activity within the event window.',
    questions: [
      {
        id: 'accepted-proof',
        question: 'What activity proof is accepted?',
        answer: 'Accepted proof is event-specific. Common examples include a fitness-app screenshot, GPS activity record, treadmill summary, or another source named by the organizer. The evidence must match the activity, date, distance, and other requirements shown on the event page.',
        keywords: ['screenshot', 'GPS record', 'treadmill', 'evidence'],
        links: [{ label: 'See the proof workflow', href: '/how-it-works#submit-title' }]
      },
      {
        id: 'proof-visible-details',
        question: 'What should an activity screenshot show?',
        answer: 'Submit the clearest view available. It should normally show the activity date, distance, duration when relevant, and the source app or device. Include the activity type and account identity when the event requires them, and do not edit an image in a way that hides or changes evidence.',
        keywords: ['date', 'distance', 'duration', 'identity', 'clear screenshot'],
        links: [{ label: 'Review common proof mistakes', href: '/how-it-works#submit-title' }]
      },
      {
        id: 'activity-window-deadline',
        question: 'Which date matters: the activity date or the submission deadline?',
        answer: 'Both can matter. The activity must occur inside the event activity window, and the evidence must be submitted before the configured final deadline. A late upload does not make an out-of-window activity eligible, and an eligible activity may still be unavailable for submission after the deadline.',
        keywords: ['event window', 'run date', 'submission deadline', 'late activity'],
        links: [{ label: 'Check your event entries', href: '/my-registrations' }]
      },
      {
        id: 'one-activity-multiple-events',
        question: 'Can one activity be submitted to more than one event?',
        answer: 'It may be possible when every registration independently accepts that activity, its date falls within each event window, and the evidence satisfies each rule set. Reviewers assess each submission separately, and duplicate or reused evidence may be rejected when an event prohibits it.',
        keywords: ['multiple events', 'same run', 'duplicate proof'],
        links: [{ label: 'View Submission History', href: '/runner/submissions' }]
      },
      {
        id: 'units-and-manual-values',
        question: 'What if my activity uses miles or a value is read incorrectly?',
        answer: 'Use the clearest original record and check every value before confirming submission. Where the workflow allows correction, enter the accurate distance or duration and keep the source unit clear. Automated screenshot reading assists entry but does not replace runner review or organizer approval.',
        keywords: ['miles', 'kilometers', 'OCR', 'wrong distance', 'manual entry'],
        links: [{ label: 'Open Submission History', href: '/runner/submissions' }]
      }
    ]
  },
  {
    id: 'review-corrections',
    label: 'Review states, corrections, and appeals',
    shortLabel: 'Reviews and corrections',
    icon: 'scan-search',
    description: 'Know what pending, approved, and rejected mean—and what action comes next.',
    questions: [
      {
        id: 'why-results-reviewed',
        question: 'Why does my activity need review?',
        answer: 'Review protects the credibility of event records. Depending on the event, an organizer or authorized reviewer may check the activity date, distance, identity, proof clarity, duplicate use, category, and other published requirements before the result becomes official.',
        keywords: ['verification', 'reviewer', 'official result', 'credibility'],
        links: [{ label: 'Learn how review works', href: '/how-it-works#review-title' }]
      },
      {
        id: 'review-statuses',
        question: 'What do submitted, approved, and rejected mean?',
        answer: 'Submitted means the activity is awaiting review and is not yet official. Approved means it passed the configured review and may contribute to progress or standings. Rejected means it did not meet a requirement; read the visible reason to learn whether to correct metadata or provide new evidence.',
        keywords: ['pending', 'submitted', 'approved', 'rejected'],
        links: [{ label: 'Check Submission History', href: '/runner/submissions' }]
      },
      {
        id: 'fix-rejected-entry',
        question: 'How do I fix a rejected activity?',
        answer: 'Open the rejected entry in Submission History and follow its specific next action. Some issues allow a metadata correction, while unclear proof, identity mismatches, wrong activities, or other evidence problems may require a new submission. The correction option shown on the entry is authoritative.',
        keywords: ['fix entry', 'resubmit', 'metadata correction', 'new proof'],
        links: [{ label: 'Open Submission History', href: '/runner/submissions?status=rejected' }]
      },
      {
        id: 'review-time',
        question: 'How long does activity review take?',
        answer: 'Review time varies by organizer, event volume, and evidence quality. Check the status rather than submitting the same activity repeatedly. If a deadline or published review expectation has passed, contact the organizer through the event page with the registration or submission reference.',
        keywords: ['waiting', 'pending review', 'review time', 'organizer'],
        links: [{ label: 'View current submissions', href: '/runner/submissions?status=submitted' }]
      },
      {
        id: 'disagree-with-decision',
        question: 'What if I disagree with a payment or activity decision?',
        answer: 'First compare the runner-facing reason with the published event rules. Event organizers remain responsible for their event-specific eligibility, payment, package, and result decisions. Use the event contact form or Contact page with a concise explanation and reference code; do not post private evidence publicly.',
        keywords: ['appeal', 'review decision', 'organizer contact', 'dispute'],
        links: [{ label: 'Prepare a support request', href: '/contact' }]
      }
    ]
  },
  {
    id: 'accumulated-challenges',
    label: 'Accumulated challenges and over-goal progress',
    shortLabel: 'Accumulated challenges',
    icon: 'chart-no-axes-combined',
    description: 'Follow verified totals, pending activities, selected goals, and over-goal progress.',
    questions: [
      {
        id: 'accumulated-challenge',
        question: 'How does an accumulated-distance challenge work?',
        answer: 'Instead of submitting one finishing result, you add multiple eligible activities during the challenge window. Approved distances are combined toward the goal selected during registration. The event page controls accepted activities, minimum entries, dates, target choices, and final submission deadline.',
        keywords: ['multiple activities', 'distance goal', 'challenge progress', 'selected goal'],
        links: [{ label: 'Browse accumulated challenges', href: '/events?q=accumulated' }]
      },
      {
        id: 'verified-pending-potential',
        question: 'What is the difference between verified, pending, and potential distance?',
        answer: 'Verified distance is the approved official total. Pending distance belongs to submitted activities still awaiting review and does not affect rank, badges, or certificates. Potential distance is a helpful preview of verified plus pending totals, not an official result.',
        keywords: ['approved distance', 'pending approval', 'potential total', 'official progress'],
        links: [{ label: 'Manage challenge entries', href: '/my-registrations' }]
      },
      {
        id: 'continue-after-goal',
        question: 'Can I keep adding activities after reaching my goal?',
        answer: 'Yes for compatible accumulated challenges while the final submission window remains open and the activity is otherwise eligible. Approved distance is not capped, so a runner may show 30 km verified against a 21 km goal and continue improving the official total.',
        keywords: ['goal reached', 'over goal', 'keep submitting', '30 km 21 km'],
        links: [{ label: 'Open My Registrations', href: '/my-registrations' }]
      },
      {
        id: 'over-goal-and-pending',
        question: 'Does pending distance count toward over-goal progress?',
        answer: 'No. Only approved distance can create an official over-goal amount, affect accumulated standings, or satisfy recognition rules. Pending activity stays separate until approved; the interface may show a potential total so you can understand what progress could become official.',
        keywords: ['overage', 'pending distance', 'leaderboard total', 'progress bar'],
        links: [{ label: 'Check activity reviews', href: '/runner/submissions' }]
      },
      {
        id: 'challenge-after-deadline',
        question: 'What happens when an accumulated challenge submission deadline passes?',
        answer: 'New activities and late resubmissions are closed at the configured boundary. Existing submitted activities may still require organizer review. The page can show Final reviews in progress until the event-wide pending queue is cleared and eligible certificates can be finalized.',
        keywords: ['deadline passed', 'final review', 'submission closed', 'certificate finalization'],
        links: [{ label: 'Check your registration status', href: '/my-registrations' }]
      }
    ]
  },
  {
    id: 'recognition',
    label: 'Leaderboards, badges, and certificates',
    shortLabel: 'Results and recognition',
    icon: 'trophy',
    description: 'Understand official standings and when configured recognition becomes available.',
    questions: [
      {
        id: 'leaderboard-appearance',
        question: 'When will my result appear on a leaderboard?',
        answer: 'A result can appear only when it is approved and the organizer enables public standings for that event. Pending and rejected entries are not official ranks. Name display, eligible distances, visible columns, and pending visibility remain controlled by the event settings.',
        keywords: ['standings', 'rank', 'public results', 'verified'],
        links: [{ label: 'Find a leaderboard', href: '/leaderboard' }]
      },
      {
        id: 'ranking-method',
        question: 'How are HelloRun rankings calculated?',
        answer: 'The event configuration determines the ranking method. A race-result leaderboard may rank approved finish times, while an accumulated challenge may rank total verified distance. The event leaderboard states its ranking rule and preserves official rank when you search within the list.',
        keywords: ['fastest time', 'verified distance', 'ranking rule', 'official rank'],
        links: [{ label: 'Browse standings', href: '/leaderboard' }]
      },
      {
        id: 'badge-timing',
        question: 'When is a challenge badge earned?',
        answer: 'A completion badge may be awarded when approved progress reaches the configured target. Pending activities do not earn it. For accumulated challenges, later approved distance can increase the official total without creating duplicate completion badges.',
        keywords: ['achievement', 'goal badge', 'approved progress', 'duplicate badge'],
        links: [{ label: 'View profile achievements', href: '/runner/profile#badges' }]
      },
      {
        id: 'certificate-timing',
        question: 'When does an accumulated-challenge certificate become available?',
        answer: 'Reaching the goal can unlock a badge before the certificate. The accumulated certificate is finalized only after the event submission deadline and after every submitted accumulated activity for that event has been reviewed. It records the selected goal and final approved distance.',
        keywords: ['final certificate', 'deadline', 'pending queue', 'verified distance'],
        links: [{ label: 'Check recognition status', href: '/my-registrations' }]
      },
      {
        id: 'certificate-meaning-correction',
        question: 'What does a certificate recognize, and how do I correct its name?',
        answer: 'A HelloRun certificate records recognition configured for a particular event; it is not external professional or academic accreditation. If the displayed name is wrong, review your profile and contact the organizer or support with the event and certificate reference. Never publish private verification details.',
        keywords: ['certificate name', 'accreditation', 'verification', 'correction'],
        links: [
          { label: 'Review My Profile', href: '/runner/profile' },
          { label: 'Contact support', href: '/contact' }
        ]
      }
    ]
  },
  {
    id: 'account-privacy',
    label: 'Accounts, notifications, privacy, and security',
    shortLabel: 'Account and privacy',
    icon: 'shield-check',
    description: 'Manage your account and understand how private operational information is handled.',
    questions: [
      {
        id: 'registration-and-submission-pages',
        question: 'What is the difference between My Registrations and Submission History?',
        answer: 'My Registrations is task-first: it shows event entry, payment, readiness, deadlines, progress, and the next action. Submission History is the authoritative record for individual activity reviews, corrections, approved results, and related certificates.',
        keywords: ['dashboard', 'event entries', 'submitted entries', 'activity history'],
        links: [
          { label: 'Open My Registrations', href: '/my-registrations' },
          { label: 'Open Submission History', href: '/runner/submissions' }
        ]
      },
      {
        id: 'notification-center',
        question: 'How do runner notifications work?',
        answer: 'The notification center keeps chronological updates about registrations, reviews, corrections, results, and recognition. Opening a notification marks it read after confirmation from the server. You may archive completed notifications and restore them later without deleting the record.',
        keywords: ['unread', 'archive', 'restore', 'notification preferences'],
        links: [{ label: 'Open Notifications', href: '/runner/notifications' }]
      },
      {
        id: 'saved-events',
        question: 'Where can I find events I saved?',
        answer: 'Authenticated runners can save an individual event for later. Saved events are separate from registrations and do not reserve a place, create an entry, or preserve a filtered search view. Return to event discovery or the runner tools area to review them.',
        keywords: ['bookmark', 'favorite', 'saved event', 'registration'],
        links: [{ label: 'Browse events', href: '/events' }]
      },
      {
        id: 'proof-privacy',
        question: 'Who can see my payment receipt or activity proof?',
        answer: 'Evidence is operational information for authorized reviewers and is not displayed on public leaderboards unless a separate published feature explicitly says otherwise. Do not post proof, contact details, identity records, or payment information in public comments or support descriptions.',
        keywords: ['proof access', 'receipt privacy', 'reviewer', 'personal data'],
        links: [
          { label: 'Read the Privacy Policy', href: '/privacy' },
          { label: 'Read the Data Usage Policy', href: '/data-usage-policy' }
        ]
      },
      {
        id: 'account-security',
        question: 'How should I protect or update my HelloRun account?',
        answer: 'Use a secure sign-in method, keep your account email and profile details current, and never share passwords or sign-in codes. Use My Profile for available account, notification, integration, and security controls. Contact support if you cannot safely access the account.',
        keywords: ['password', 'Google sign in', 'Strava', 'profile', 'email'],
        links: [
          { label: 'Open My Profile', href: '/runner/profile' },
          { label: 'Contact support', href: '/contact' }
        ]
      }
    ]
  },
  {
    id: 'organizers-community',
    label: 'Organizers, community, and support',
    shortLabel: 'Organizers and community',
    icon: 'users-round',
    description: 'Learn who controls event decisions and how community publishing and reporting work.',
    questions: [
      {
        id: 'create-event',
        question: 'Who can create and manage an event?',
        answer: 'Organizer access depends on account status and platform review. Approved organizers can create compatible events, publish complete rules, manage registrations, review payment and activity evidence separately, and configure public results and recognition through organizer tools.',
        keywords: ['organizer application', 'event editor', 'review access', 'create event'],
        links: [{ label: 'Start the organizer pathway', href: '/signup?role=organiser' }]
      },
      {
        id: 'schools-groups-community-events',
        question: 'Can schools, clubs, or community groups use HelloRun?',
        answer: 'Yes, when the proposed event and organization fit HelloRun requirements. Groups can use supported event formats for wellness, participation, fundraising, or community challenges, but they remain responsible for accurate rules, participant communication, safety planning, and lawful operations.',
        keywords: ['school', 'club', 'fundraising', 'community challenge'],
        links: [{ label: 'Contact HelloRun', href: '/contact?source=organizer-dashboard' }]
      },
      {
        id: 'event-ownership',
        question: 'Is every event operated directly by HelloRun?',
        answer: 'No. HelloRun-operated events and organizer-managed events are identified through their event information. For an organizer-managed event, that organizer remains authoritative for its published rules, packages, payment decisions, schedules, eligibility, and event-specific communications.',
        keywords: ['official event', 'third-party organizer', 'ownership', 'event decision'],
        links: [{ label: 'Review an event organizer', href: '/events' }]
      },
      {
        id: 'blog-comments-reporting',
        question: 'How do blog comments, replies, editing, and reporting work?',
        answer: 'Authenticated runners may join article discussions where enabled. Comments can have one visible reply level, and an author may edit an active contribution within the displayed time and edit limits; an Edited marker exposes public revision history while active. Report another runner’s comment only for a genuine listed concern and provide useful context.',
        keywords: ['reply', 'edit comment', 'revision history', 'report comment'],
        links: [
          { label: 'Read community guidelines', href: '/community-guidelines' },
          { label: 'Visit the blog', href: '/blog' }
        ]
      },
      {
        id: 'contact-right-person',
        question: 'When should I contact the organizer, HelloRun support, or a professional?',
        answer: 'Contact the event organizer for event-specific rules, packages, refunds, payment decisions, schedules, and result eligibility. Contact HelloRun for account, platform, privacy, or technical concerns. For health, medical, route-safety, or emergency decisions, use qualified local professionals and emergency services rather than relying on an FAQ or event listing.',
        keywords: ['support', 'organizer contact', 'medical advice', 'safety', 'emergency'],
        links: [{ label: 'Prepare a support request', href: '/contact' }]
      }
    ]
  }
]);

function normalizeKeywords(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))];
}

function buildRoleActions(locals = {}) {
  const contact = { label: 'Contact Support', href: '/contact', icon: 'life-buoy' };

  if (locals.isAdmin) {
    return [
      { label: 'Admin Dashboard', href: '/admin/dashboard', icon: 'shield-check' },
      { label: 'How Events Work', href: '/how-it-works', icon: 'route' },
      contact
    ];
  }

  if (locals.isOrganizer || locals.isApprovedOrganizer) {
    return [
      { label: 'Organizer Dashboard', href: '/organizer/dashboard', icon: 'layout-dashboard' },
      { label: 'Organizer Guidance', href: '/how-it-works#organizer-path', icon: 'clipboard-check' },
      contact
    ];
  }

  if (locals.isAuthenticated) {
    return [
      { label: 'My Registrations', href: '/my-registrations', icon: 'clipboard-list' },
      { label: 'Submission History', href: '/runner/submissions', icon: 'file-check-2' },
      contact
    ];
  }

  return [
    { label: 'Browse Events', href: '/events', icon: 'calendar-search' },
    { label: 'Sign In', href: '/login', icon: 'log-in' },
    contact
  ];
}

function buildStartAction(locals = {}) {
  if (locals.isAdmin) return { label: 'Open Admin Dashboard', href: '/admin/dashboard' };
  if (locals.isOrganizer || locals.isApprovedOrganizer) return { label: 'Open Organizer Dashboard', href: '/organizer/dashboard' };
  if (locals.isAuthenticated) return { label: 'Check My Registrations', href: '/my-registrations' };
  return { label: 'Browse Events', href: '/events' };
}

function serializeStructuredData(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildFaqPresentation({ locals = {} } = {}) {
  const seenIds = new Set();
  const categories = FAQ_CATEGORIES.map((category) => {
    const questions = category.questions.map((entry) => {
      if (seenIds.has(entry.id)) throw new Error(`Duplicate FAQ entry id: ${entry.id}`);
      seenIds.add(entry.id);
      return {
        ...entry,
        categoryId: category.id,
        keywords: normalizeKeywords(entry.keywords),
        anchor: `faq-${entry.id}`
      };
    });

    return {
      ...category,
      anchor: `faq-category-${category.id}`,
      count: questions.length,
      questions
    };
  });

  const entries = categories.flatMap((category) => category.questions);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer
      }
    }))
  };

  return {
    categories,
    entryCount: entries.length,
    categoryCount: categories.length,
    actions: buildRoleActions(locals),
    startAction: buildStartAction(locals),
    structuredData,
    structuredDataJson: serializeStructuredData(structuredData)
  };
}

module.exports = {
  FAQ_CATEGORIES,
  buildFaqPresentation,
  buildRoleActions,
  buildStartAction,
  normalizeKeywords,
  serializeStructuredData
};
