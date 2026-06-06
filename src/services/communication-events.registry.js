const COMMUNICATION_EVENTS = Object.freeze([
  {
    eventKey: 'account.email_verification',
    name: 'Email Verification',
    description: 'Sends account verification links during signup and resend verification.',
    category: 'account',
    priority: 'critical',
    required: true,
    emailEnabled: true,
    inAppEnabled: false,
    locked: true,
    recipientRoles: [],
    displayOrder: 10
  },
  {
    eventKey: 'account.password_reset',
    name: 'Password Reset',
    description: 'Sends password reset links.',
    category: 'account',
    priority: 'critical',
    required: true,
    emailEnabled: true,
    inAppEnabled: false,
    locked: true,
    recipientRoles: [],
    displayOrder: 20
  },
  {
    eventKey: 'account.password_reset_confirmation',
    name: 'Password Reset Confirmation',
    description: 'Confirms that an account password was reset.',
    category: 'account',
    priority: 'critical',
    required: false,
    emailEnabled: true,
    inAppEnabled: false,
    locked: false,
    recipientRoles: [],
    displayOrder: 30
  },
  {
    eventKey: 'organiser.application_submitted',
    name: 'Organiser Application Submitted',
    description: 'Confirms that an organiser application was received.',
    category: 'organiser',
    priority: 'medium',
    required: false,
    emailEnabled: true,
    inAppEnabled: false,
    locked: false,
    recipientRoles: ['organiser'],
    displayOrder: 100
  },
  {
    eventKey: 'organiser.application_approved',
    name: 'Organiser Application Approved',
    description: 'Notifies an organiser that their application was approved.',
    category: 'organiser',
    priority: 'high',
    required: false,
    emailEnabled: true,
    inAppEnabled: false,
    locked: false,
    recipientRoles: ['organiser'],
    displayOrder: 110
  },
  {
    eventKey: 'organiser.application_rejected',
    name: 'Organiser Application Rejected',
    description: 'Notifies an organiser that their application was rejected.',
    category: 'organiser',
    priority: 'high',
    required: false,
    emailEnabled: true,
    inAppEnabled: false,
    locked: false,
    recipientRoles: ['organiser'],
    displayOrder: 120
  },
  {
    eventKey: 'event.published',
    name: 'Event Published',
    description: 'Notifies an organiser that an event was approved and published.',
    category: 'organiser',
    priority: 'medium',
    required: false,
    emailEnabled: true,
    inAppEnabled: true,
    locked: false,
    recipientRoles: ['organiser'],
    displayOrder: 130
  },
  {
    eventKey: 'registration.confirmed',
    name: 'Registration Confirmed',
    description: 'Confirms an event registration.',
    category: 'registration',
    priority: 'low',
    required: false,
    emailEnabled: false,
    inAppEnabled: true,
    locked: false,
    recipientRoles: ['runner'],
    displayOrder: 200
  },
  {
    eventKey: 'payment.receipt_submitted',
    name: 'Payment Receipt Submitted',
    description: 'Records runner payment receipt submission and optional organiser email.',
    category: 'payment',
    priority: 'low',
    required: false,
    emailEnabled: false,
    inAppEnabled: true,
    locked: false,
    recipientRoles: ['runner', 'organiser'],
    displayOrder: 300
  },
  {
    eventKey: 'payment.approved',
    name: 'Payment Approved',
    description: 'Notifies a runner that payment was approved.',
    category: 'payment',
    priority: 'medium',
    required: false,
    emailEnabled: false,
    inAppEnabled: true,
    locked: false,
    recipientRoles: ['runner'],
    displayOrder: 310
  },
  {
    eventKey: 'payment.rejected',
    name: 'Payment Rejected',
    description: 'Notifies a runner that payment receipt needs correction.',
    category: 'payment',
    priority: 'high',
    required: false,
    emailEnabled: true,
    inAppEnabled: true,
    locked: false,
    recipientRoles: ['runner'],
    displayOrder: 320
  },
  {
    eventKey: 'result.approved',
    name: 'Result Approved',
    description: 'Notifies a runner that a run result was approved.',
    category: 'result',
    priority: 'medium',
    required: false,
    emailEnabled: false,
    inAppEnabled: true,
    locked: false,
    recipientRoles: ['runner'],
    displayOrder: 400
  },
  {
    eventKey: 'result.rejected',
    name: 'Result Rejected',
    description: 'Notifies a runner that a run result needs correction.',
    category: 'result',
    priority: 'high',
    required: false,
    emailEnabled: true,
    inAppEnabled: true,
    locked: false,
    recipientRoles: ['runner'],
    displayOrder: 410
  },
  {
    eventKey: 'certificate.issued',
    name: 'Certificate Issued',
    description: 'Notifies a runner that a certificate is available.',
    category: 'certificate',
    priority: 'medium',
    required: false,
    emailEnabled: false,
    inAppEnabled: true,
    locked: false,
    recipientRoles: ['runner'],
    displayOrder: 500
  },
  {
    eventKey: 'badge.earned',
    name: 'Badge Earned',
    description: 'Emails runners for earned badges only when this event is enabled and the badge definition email level opts in.',
    category: 'achievement',
    priority: 'low',
    required: false,
    emailEnabled: true,
    inAppEnabled: true,
    locked: false,
    recipientRoles: ['runner'],
    displayOrder: 600
  }
]);

const COMMUNICATION_EVENT_MAP = new Map(COMMUNICATION_EVENTS.map((event) => [event.eventKey, event]));

function getDefaultCommunicationEvent(eventKey) {
  return COMMUNICATION_EVENT_MAP.get(eventKey) || null;
}

module.exports = {
  COMMUNICATION_EVENTS,
  COMMUNICATION_EVENT_MAP,
  getDefaultCommunicationEvent
};
