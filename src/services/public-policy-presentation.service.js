'use strict';

const TERMS_SUMMARY = Object.freeze([
  'Keep account and registration information accurate and protect your sign-in credentials.',
  'Read the event page before joining; organizers control their event-specific rules and decisions.',
  'Submit only genuine payment and activity evidence that belongs to you.',
  'Assess your own fitness and safety and follow event-specific precautions.',
  'Treat other community members respectfully and do not misuse messages, comments, or reports.',
  'HelloRun may restrict content, results, events, or accounts to protect users and platform integrity.'
]);

const RELATED_POLICIES = Object.freeze([
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Data Usage Policy', href: '/data-usage-policy' },
  { label: 'Cookie Policy', href: '/cookie-policy' },
  { label: 'Refund and Cancellation Policy', href: '/refund-and-cancellation-policy' },
  { label: 'Organiser Terms', href: '/organiser-terms' },
  { label: 'Community Guidelines', href: '/community-guidelines' },
  { label: 'Acceptable Use Policy', href: '/acceptable-use-policy' },
  { label: 'Contact', href: '/contact' }
]);

const PRIVACY_BOUNDARIES = Object.freeze([
  { icon: 'lock-keyhole', title: 'What stays private', text: 'Payment and activity proof, emergency details, precise routes, contact messages, OCR output, report evidence, and internal review signals stay inside authorized workflows.' },
  { icon: 'eye', title: 'What may be public', text: 'Configured identity, approved result metrics, standings, certificates, badges, posts, comments, revision history, and group contributions may be visible by design.' },
  { icon: 'users-round', title: 'Who may access it', text: 'Access is limited to you, the relevant organizer, authorized HelloRun personnel, configured providers, or the public when a feature explicitly publishes information.' }
]);

const PRIVACY_RIGHTS = Object.freeze([
  { icon: 'info', title: 'Be informed and access data', text: 'Ask what HelloRun holds about you, why it is used, and who receives it.', action: 'Make a privacy request', href: '/contact?topic=privacy_data' },
  { icon: 'file-pen-line', title: 'Correct inaccurate information', text: 'Update eligible profile fields directly or ask for help with locked registration, result, or recognition records.', action: 'Review your profile', href: '/runner/profile' },
  { icon: 'shield-question', title: 'Object or withdraw consent', text: 'Object to eligible processing or withdraw consent where consent is the applicable basis; essential records may still be required for a requested service.', action: 'Contact privacy support', href: '/contact?topic=privacy_data' },
  { icon: 'trash-2', title: 'Request deletion or blocking', text: 'Request deletion, restriction, or blocking where available. Legal, payment, dispute, security, event-integrity, and public-record needs may limit the request.', action: 'Start a request', href: '/contact?topic=privacy_data' },
  { icon: 'package-open', title: 'Request portability', text: 'Ask for applicable personal data in a usable format. Identity verification and lawful limitations may apply.', action: 'Ask about portability', href: '/contact?topic=privacy_data' },
  { icon: 'cookie', title: 'Control browser storage', text: 'Essential security storage remains active. Functional, Analytics, and Advertising choices are managed per browser.', action: 'Cookie preferences', href: '/cookie-policy#cookie-choices' },
  { icon: 'bell-ring', title: 'Manage communications', text: 'Choose eligible email updates in your profile. Essential service and security messages may still be sent.', action: 'Notification preferences', href: '/runner/profile#notifications' },
  { icon: 'plug-zap', title: 'Disconnect integrations', text: 'Disconnect supported third-party connections to stop future access. Provider-held copies remain governed by that provider.', action: 'Manage connections', href: '/runner/profile#integrations' },
  { icon: 'landmark', title: 'Raise a complaint', text: 'Contact HelloRun first where practical, or exercise the right to complain to the National Privacy Commission.', action: 'Privacy contact', href: '/contact?topic=privacy_data' }
]);

const PRIVACY_PROCESSING = Object.freeze([
  { icon: 'user-round', category: 'Account and profile', source: 'You, sign-in providers, and account activity', purpose: 'Authentication, profile management, support, preferences, and role access', access: 'You and authorized HelloRun personnel', visibility: 'Selected display identity or avatar may appear with public participation', retention: 'While active, then restricted or removed subject to security, dispute, and legal needs', control: 'Profile correction, account support, and applicable rights request' },
  { icon: 'clipboard-list', category: 'Registration and emergency details', source: 'You and the relevant event workflow', purpose: 'Entry eligibility, participant operations, safety, fulfilment, and event communication', access: 'You, the relevant organizer, and authorized support', visibility: 'Confirmation, contact, and emergency information are not public', retention: 'Through event operations and the necessary audit, dispute, and obligation period', control: 'Registration correction through the organizer or privacy support' },
  { icon: 'credit-card', category: 'Payments, orders, and receipts', source: 'You, organizers, and configured payment-review workflows', purpose: 'Match transactions, review payment, fulfil orders, and resolve disputes', access: 'You, relevant payment reviewers, and authorized support', visibility: 'Proof and transaction references are not public', retention: 'Restricted for accounting, payment review, fraud prevention, disputes, and applicable obligations', control: 'Correction or privacy request; deletion may be limited by financial obligations' },
  { icon: 'activity', category: 'Activities, OCR, and integrations', source: 'Your entries, uploaded proof, and authorized fitness providers such as Strava', purpose: 'Validate eligible activity, assist review, detect mismatches, and calculate results', access: 'You, the relevant organizer, and authorized reviewers', visibility: 'Proof, precise routes, OCR, and internal signals stay private; approved metrics may be public', retention: 'Through review, event integrity, disputes, and recognition needs; restricted or removed when no longer required', control: 'Review before submission, eligible correction, integration disconnect, and privacy request' },
  { icon: 'trophy', category: 'Results, standings, badges, and certificates', source: 'Approved event records and organizer settings', purpose: 'Publish official results and provide verifiable recognition', access: 'Public or event-visible where configured', visibility: 'Configured name, result, rank, goal, and verification fields may be public', retention: 'May remain as event history or an immutable recognition snapshot; visibility corrections can be requested', control: 'Result correction or privacy request subject to event-history and integrity needs' },
  { icon: 'messages-square', category: 'Messages, notifications, and support', source: 'You, organizers, HelloRun, and delivery providers', purpose: 'Operational communication, support, delivery, retry handling, and anti-flood protection', access: 'Communication participants and authorized support', visibility: 'Private unless separately published by a participant', retention: 'For delivery, support, safety, abuse prevention, and dispute needs, then restricted or removed', control: 'Notification preferences, archive controls, and privacy request' },
  { icon: 'message-circle-reply', category: 'Community content and moderation', source: 'Posts, comments, replies, edits, reports, and running-group activity', purpose: 'Publish contributions, preserve conversation context, and review reports', access: 'Published content and active revision history may be public; report snapshots are restricted', visibility: 'Depends on publication and deletion state; moderation evidence remains private', retention: 'Public while active; tombstones or private evidence may remain for thread, report, safety, and dispute integrity', control: 'Eligible edit, revision redaction, deletion, reporting, and privacy request' },
  { icon: 'file-down', category: 'Organizer exports', source: 'Event registration and participant records', purpose: 'Operate the relevant event, participant communication, safety, and fulfilment', access: 'Authorized staff of the relevant organizer', visibility: 'Not public merely because it was exported', retention: 'Organizer must secure and remove local exports when the event purpose and obligations end', control: 'Contact the organizer first, then HelloRun for platform or privacy concerns' },
  { icon: 'shield-check', category: 'Technical, security, and audit records', source: 'Devices, browsers, requests, authentication, and administrative actions', purpose: 'Protect accounts, enforce limits, investigate incidents, and maintain accountability', access: 'Authorized technical, security, and administrative personnel', visibility: 'Not public', retention: 'For proportionate security, audit, incident, and legal needs; short-lived tokens expire automatically where configured', control: 'Security support and applicable privacy request' },
  { icon: 'chart-no-axes-combined', category: 'Analytics', source: 'Browser and usage signals after Analytics opt-in', purpose: 'Measure aggregate visits, reliability, and feature use', access: 'HelloRun and configured analytics providers', visibility: 'Not displayed as profile or event data', retention: 'Controlled by configuration and provider policy', control: 'Disable Analytics in Cookie Preferences and use browser/provider controls' },
  { icon: 'badge-ad', category: 'Advertising', source: 'Ad requests, cookies, IP address, browser/device identifiers, and similar signals after Advertising opt-in', purpose: 'Serve, measure, limit, and protect configured advertising', access: 'Configured advertising providers under their policies', visibility: 'Not displayed as HelloRun profile or event data', retention: 'Controlled by provider configuration, consent, browser, and provider settings', control: 'Disable Advertising in Cookie Preferences and use Google Ads Settings' }
]);

const PRIVACY_RELATED = Object.freeze([
  { label: 'Data Usage Policy', href: '/data-usage-policy' },
  { label: 'Cookie Policy', href: '/cookie-policy' },
  { label: 'Terms and Conditions', href: '/terms' },
  { label: 'Organiser Terms', href: '/organiser-terms' },
  { label: 'Community Guidelines', href: '/community-guidelines' },
  { label: 'Acceptable Use', href: '/acceptable-use-policy' },
  { label: 'Refund Policy', href: '/refund-and-cancellation-policy' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact privacy support', href: '/contact?topic=privacy_data' }
]);

const DATA_USAGE_JOURNEY = Object.freeze([
  { number: '01', icon: 'inbox', title: 'You provide it', text: 'Account, registration, payment, activity, and community information enters HelloRun through a task you choose.' },
  { number: '02', icon: 'scan-search', title: 'Checks assist review', text: 'Validation, OCR, name matching, and duplicate checks can organize evidence and identify records that need attention.' },
  { number: '03', icon: 'user-check', title: 'Authorized people review', text: 'Relevant organizers, administrators, or support reviewers see only the records needed for their event or operational role.' },
  { number: '04', icon: 'route', title: 'Approved data powers the service', text: 'Privacy-safe information supports registration, results, standings, recognition, communication, and support.' },
  { number: '05', icon: 'archive-restore', title: 'Records reach an end state', text: 'Data is retained, restricted, anonymized, or deleted according to its purpose and the authoritative Privacy Policy.' }
]);

const DATA_USAGE_CATEGORIES = Object.freeze([
  { icon: 'user-round', label: 'Account and profile', data: 'Identity, contact, location, preferences, and account state', purpose: 'Sign-in, account support, registration readiness, and personalization', access: 'You and authorized HelloRun staff', visibility: 'Selected display identity may appear with public participation or community content', retention: 'Account and profile retention in Privacy' },
  { icon: 'clipboard-list', label: 'Registration', data: 'Event choice, category, mode, participant snapshot, confirmation, and status', purpose: 'Manage entry eligibility, event participation, and organizer operations', access: 'You, the relevant organizer, and authorized support', visibility: 'Confirmation and contact details stay private; configured participation or results may be public', retention: 'Event registration records in Privacy' },
  { icon: 'credit-card', label: 'Payment proof', data: 'Receipt image, amount, channel, reference, and review history', purpose: 'Match payment to a registration and resolve payment concerns', access: 'You, relevant payment reviewers, and authorized support', visibility: 'Never part of public event results', retention: 'Payment and transaction retention in Privacy' },
  { icon: 'file-check-2', label: 'Activity proof', data: 'Proof file, submitted metrics, OCR output, validation signals, and review state', purpose: 'Verify event activity, detect mismatches, and support correction', access: 'You, the relevant organizer, and authorized reviewers', visibility: 'Proof and internal signals stay private; approved safe metrics may become public', retention: 'Proof and OCR retention in Privacy' },
  { icon: 'plug-zap', label: 'Imported activity', data: 'Authorized activity metrics and connection metadata from supported fitness services', purpose: 'Reduce manual entry and validate an eligible activity', access: 'You and reviewers for the selected workflow', visibility: 'Only approved privacy-safe result fields may become public', retention: 'Imported event records and integration guidance in Privacy' },
  { icon: 'trophy', label: 'Public results', data: 'Configured runner name, rank, distance, time, pace, category, and completion state', purpose: 'Publish official standings and event recognition', access: 'Public when the organizer enables the leaderboard or result view', visibility: 'Public by design; proof and pending/internal review details are excluded', retention: 'Event history and public-result guidance in Privacy' },
  { icon: 'award', label: 'Certificates and badges', data: 'Achievement, selected goal, final verified result, certificate number, and verification state', purpose: 'Issue, verify, and share event recognition', access: 'You; verification-safe certificate details may be public', visibility: 'Public verification and sharing fields only', retention: 'Recognition and event-history guidance in Privacy' },
  { icon: 'messages-square', label: 'Messages and notifications', data: 'Event messages, delivery state, notification text, support context, and timestamps', purpose: 'Deliver operational updates, prevent flooding, and resolve support requests', access: 'Participants in the communication and authorized support', visibility: 'Not public unless you separately publish the content', retention: 'Communication and support retention in Privacy' },
  { icon: 'message-circle-reply', label: 'Community content', data: 'Posts, comments, replies, revisions, reports, and moderation records', purpose: 'Publish community contributions and support accountable moderation', access: 'Published content and active revision history may be public; report evidence is restricted', visibility: 'Depends on publication state; moderation evidence stays private', retention: 'Content, moderation, and dispute needs described in Privacy' },
  { icon: 'shield-check', label: 'Technical and security', data: 'Session, device, request, rate-limit, audit, and incident records', purpose: 'Protect accounts, investigate misuse, and keep workflows reliable', access: 'Authorized technical, security, and administrative personnel', visibility: 'Not public', retention: 'Security, audit, and incident retention in Privacy' },
  { icon: 'badge-ad', label: 'Advertising data', data: 'Cookies, IP address, browser or device identifiers, and ad-request signals where ads are shown', purpose: 'Serve, measure, limit, and protect advertising', access: 'Configured advertising providers under their policies', visibility: 'Not displayed as profile or event data', retention: 'Privacy and Cookie policies; proof, payment, account, and precise activity data are not intentionally sent as identifiable advertising data' }
]);

const DATA_USAGE_SUMMARIES = Object.freeze([
  { icon: 'lock-keyhole', title: 'What stays private', text: 'Payment and activity proof, raw OCR, internal review signals, contact and emergency details, report snapshots, and security records are restricted to authorized workflows.' },
  { icon: 'eye', title: 'What may be public', text: 'Configured display identity, approved result metrics, official standings, certificate verification details, badges, and content you publish may be visible to others.' },
  { icon: 'sliders-horizontal', title: 'Your controls', text: 'Review your profile and entries, correct eligible records, manage preferences and integrations, and contact HelloRun to exercise applicable data rights.' }
]);

const DATA_USAGE_RELATED = Object.freeze([
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Cookie Policy', href: '/cookie-policy' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact about data', href: '/contact' }
]);

const ACCEPTABLE_USE_RULES = Object.freeze([
  { icon: 'user-round-check', area: 'Accounts and access', expected: 'Use accurate identity information, protect credentials, and use only accounts and roles you are authorized to access.', prohibited: 'Impersonation, credential sharing, account evasion, unauthorized access, or duplicate accounts used to manipulate benefits.', response: 'Secure the account, correct identity details, or restrict access while ownership and misuse are reviewed.' },
  { icon: 'calendar-check-2', area: 'Events and promotions', expected: 'Publish accurate event ownership, rules, dates, prices, packages, affiliations, and organizer decisions.', prohibited: 'Fabricated events, misleading sponsorship or accreditation claims, deceptive promotions, or unauthorized organizer activity.', response: 'Correct or unpublish the claim; serious or repeated misuse may restrict organizer access.' },
  { icon: 'credit-card', area: 'Registration and payment', expected: 'Register honestly and submit genuine payment evidence through the configured event workflow.', prohibited: 'Altered or reused receipts, dishonest disputes, workflow bypasses, fake registrations, or discount and referral abuse.', response: 'Payment or registration may be rejected, corrected, restricted, or escalated for review.' },
  { icon: 'activity', area: 'Proof, results, and recognition', expected: 'Submit your own eligible activity and let approved records determine official progress, rank, badges, and certificates.', prohibited: 'Manipulated or duplicated proof, another person’s activity, rank manipulation, or forged recognition.', response: 'Reject or remove the record, correct official standings, and restrict repeated or material fraud.' },
  { icon: 'shield-user', area: 'Participant and personal data', expected: 'Use participant information only for its authorized event or support purpose and protect exported records.', prohibited: 'Scraping, selling, doxxing, publishing private evidence, or repurposing participant data without authority.', response: 'Remove exposure, restrict access, preserve relevant evidence, and investigate the privacy risk.' },
  { icon: 'messages-square', area: 'Community and messaging', expected: 'Contribute respectfully, message with a legitimate purpose, and report concerns in good faith.', prohibited: 'Threats, hate, harassment, scams, spam, unsafe advice, unwanted promotion, flooding, retaliation, or malicious reports.', response: 'Correct or remove content, limit communication, or restrict the account according to severity and repetition.' },
  { icon: 'bot', area: 'Automation and security', expected: 'Use normal interfaces and approved integrations; report suspected vulnerabilities before taking further action.', prohibited: 'Unauthorized testing, scraping, rate-limit bypass, malware, API abuse, fake engagement, or invalid advertising traffic.', response: 'Stop the activity immediately; technical or account access may be restricted while impact is assessed.' }
]);

const ACCEPTABLE_USE_ENFORCEMENT = Object.freeze([
  { number: '01', icon: 'inbox', title: 'Concern received', text: 'A report, platform signal, organizer concern, or support request identifies possible misuse.' },
  { number: '02', icon: 'archive', title: 'Evidence preserved', text: 'Relevant records are retained within the authorized workflow so the concern can be reviewed fairly.' },
  { number: '03', icon: 'search-check', title: 'Context reviewed', text: 'HelloRun considers available context, severity, prior behavior, event authority, and immediate safety risk.' },
  { number: '04', icon: 'shield-check', title: 'Action applied', text: 'Guidance, correction, removal, rejection, restriction, suspension, or another proportionate response may follow.' },
  { number: '05', icon: 'rotate-ccw', title: 'Recovery where appropriate', text: 'A correction path or review request may be available when the workflow and safety risk permit it.' }
]);

const ACCEPTABLE_USE_REPORTING = Object.freeze([
  { icon: 'flag', title: 'Blog posts and comments', text: 'Use the reason-based Report action on eligible content. Reports enter the existing moderation workflow.', href: '/blog', label: 'Visit the community' },
  { icon: 'life-buoy', title: 'Events, accounts, safety, and security', text: 'Use Contact for event, organizer, account, privacy, messaging, content, or security concerns.', href: '/contact', label: 'Contact HelloRun' },
  { icon: 'siren', title: 'Immediate physical danger', text: 'HelloRun is not an emergency service. Contact the appropriate local emergency service or authority.', href: '', label: '' }
]);

const ACCEPTABLE_USE_RELATED = Object.freeze([
  { label: 'Terms and Conditions', href: '/terms' },
  { label: 'Community Guidelines', href: '/community-guidelines' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Data Usage Policy', href: '/data-usage-policy' },
  { label: 'Contact', href: '/contact' }
]);

const ORGANISER_CAPABILITIES = Object.freeze([
  { icon: 'mail-check', title: 'Start with verified access', text: 'A verified email plus the existing acknowledgement can enable free virtual event creation.' },
  { icon: 'badge-check', title: 'Verify to unlock higher risk', text: 'Identity approval is required for paid, physical-reward, delivery, onsite, and hybrid setups.' },
  { icon: 'clipboard-check', title: 'Meet publication readiness', text: 'Complete rules, dates, pricing, safety, payment, and fulfilment information before publication.' },
  { icon: 'shield-check', title: 'Auto-publication is conditional', text: 'Compatible events may qualify, but risk or readiness concerns can still require manual review.' }
]);

const ORGANISER_LIFECYCLE = Object.freeze([
  { number: '01', icon: 'user-round-check', title: 'Establish authority', organizer: 'Keep identity, organization authority, contact details, and capability acknowledgement accurate.', platform: 'HelloRun verifies access proportionately and limits higher-risk event configurations until requirements are met.', record: 'Account status, acknowledgement, application, and capability state provide the recovery path.' },
  { number: '02', icon: 'calendar-cog', title: 'Design and publish', organizer: 'Publish complete rules, dates, pricing, inclusions, safety information, sponsor claims, and change processes.', platform: 'Readiness and risk checks may publish, return, hold, or unpublish an event.', record: 'The structured event page and revision context remain the operational source of truth.' },
  { number: '03', icon: 'receipt-text', title: 'Manage entry and payment', organizer: 'Apply registration and payment rules consistently, protect receipts, explain decisions, and avoid conflicts.', platform: 'Separate payment-review tools, correction paths, and audit records support accountable decisions.', record: 'Registration, payment state, runner-safe reason, and timestamps remain distinct from result approval.' },
  { number: '04', icon: 'list-checks', title: 'Review results fairly', organizer: 'Review activity evidence against published rules without treating assisted signals as conclusive fraud findings.', platform: 'OCR, matching, duplicate checks, standings, badges, and certificate workflows support the review.', record: 'Verified and pending totals, review decisions, official ranks, and final recognition stay separate.' },
  { number: '05', icon: 'package-check', title: 'Deliver the event', organizer: 'Own event-day safety, communication, products, inventory, order payment, pickup, delivery, and fulfilment.', platform: 'HelloRun provides event, messaging, shop, and operational tools without taking over organizer obligations.', record: 'Communications, order state, fulfilment logs, and event settings document delivery.' },
  { number: '06', icon: 'archive-check', title: 'Close responsibly', organizer: 'Finish reviews, resolve refunds and entitlements, correct results, and restrict or delete local exports.', platform: 'Final-review and certificate processes preserve accurate event history and privacy-safe recognition.', record: 'Closure does not erase unresolved participant, data, safety, payment, or fulfilment duties.' }
]);

const ORGANISER_DUTIES = Object.freeze([
  { icon: 'heart-pulse', title: 'Participant safety', text: 'Plan appropriate permits, venue and route controls, staffing, emergency response, safeguarding, waivers, and communications.' },
  { icon: 'wallet-cards', title: 'Money and refunds', text: 'Keep prices and payment instructions accurate, separate payment scopes, review fairly, and honor disclosed and applicable remedies.' },
  { icon: 'file-lock-2', title: 'Participant exports', text: 'Limit exports to the event purpose, control access, store them securely, and delete local copies when no longer required.' },
  { icon: 'scale', title: 'Conflicts of interest', text: 'Do not bypass self-approval controls or arrange nominal review of your own evidence without genuine independent review.' },
  { icon: 'messages-square', title: 'Organizer communication', text: 'Respond to legitimate runner concerns and do not flood, retaliate, mislead, or request sensitive files through unsuitable channels.' },
  { icon: 'calendar-sync', title: 'Material event changes', text: 'Communicate cancellations, postponements, route, date, pricing, inclusion, deadline, and recognition changes promptly.' }
]);

const ORGANISER_RELATED = Object.freeze([
  { label: 'Terms and Conditions', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Data Usage Policy', href: '/data-usage-policy' },
  { label: 'Refund and Cancellation', href: '/refund-and-cancellation-policy' },
  { label: 'Community Guidelines', href: '/community-guidelines' },
  { label: 'Acceptable Use', href: '/acceptable-use-policy' },
  { label: 'Organizer support', href: '/contact?source=organizer-dashboard' }
]);

const COMMUNITY_APPLICABILITY = Object.freeze([
  { icon: 'user-round', label: 'Profiles and identity' },
  { icon: 'notebook-pen', label: 'Blogs and articles' },
  { icon: 'message-circle-reply', label: 'Comments and replies' },
  { icon: 'history', label: 'Revision history' },
  { icon: 'users-round', label: 'Running groups' },
  { icon: 'megaphone', label: 'Organizer announcements' },
  { icon: 'messages-square', label: 'Events and messages' },
  { icon: 'image', label: 'Uploaded media' }
]);

const COMMUNITY_PRINCIPLES = Object.freeze([
  { number: '01', icon: 'target', title: 'Contribute with purpose', text: 'Keep posts, replies, group activity, and messages relevant, useful, and appropriate for the channel.' },
  { number: '02', icon: 'handshake', title: 'Respect people', text: 'Challenge ideas and decisions without harassment, humiliation, hate, threats, or retaliation.' },
  { number: '03', icon: 'shield-user', title: 'Protect privacy', text: 'Do not expose another person’s private messages, contact details, evidence, identity records, or health information.' },
  { number: '04', icon: 'badge-check', title: 'Be honest and transparent', text: 'Represent identity, experience, affiliations, sources, sponsorships, and event evidence accurately.' },
  { number: '05', icon: 'heart-pulse', title: 'Share experience safely', text: 'Personal training or health experience is welcome; diagnosis, guaranteed outcomes, and dangerous instructions are not.' }
]);

const COMMUNITY_SITUATIONS = Object.freeze([
  { situation: 'Disagreement or criticism', encouraged: 'Describe the decision or experience, give relevant context, and separate fact from opinion.', avoid: 'Personal attacks, pile-ons, threats, humiliation, or repeated targeting.', route: 'Public discussion when safe; event or Contact channel for private records.' },
  { situation: 'Privacy and screenshots', encouraged: 'Remove unnecessary personal details and confirm you have an appropriate reason to share.', avoid: 'Doxxing, private messages, IDs, receipts, contact details, or unredacted evidence.', route: 'Use Contact for private or sensitive concerns.' },
  { situation: 'Promotion and sponsorship', encouraged: 'Keep it relevant and disclose payment, free products, employment, affiliation, or sponsorship.', avoid: 'Hidden promotion, deceptive endorsements, repetitive links, or unsolicited advertising.', route: 'Use the article or event context where the relationship is relevant.' },
  { situation: 'Copied work and attribution', encouraged: 'Credit sources, quote sparingly, and obtain permission where required.', avoid: 'Copied articles, comments, photos, logos, or impersonated contributions.', route: 'Use the content Report action for eligible published material.' },
  { situation: 'Event concern', encouraged: 'State what happened and request a correction or review without exposing private evidence.', avoid: 'Unsupported accusations, retaliation, or using community posts to pressure reviewers.', route: 'Event organizer first; Contact when platform safety or policy is involved.' },
  { situation: 'Health and training', encouraged: 'Describe personal experience and encourage appropriate professional support.', avoid: 'Diagnosis, guaranteed results, dangerous restriction, unsafe substances, or ignoring serious symptoms.', route: 'Qualified health or emergency services for individual or urgent concerns.' },
  { situation: 'Spam and flooding', encouraged: 'Post once in the most relevant place and allow a reasonable response time.', avoid: 'Repeated content, unrelated promotion, mass replies, or contact-form flooding.', route: 'Use the single most relevant event, community, or support channel.' },
  { situation: 'Reporting and moderation', encouraged: 'Choose the closest reason and provide concise, truthful context.', avoid: 'Self-report bypasses, coordinated false reports, threats, or reports used to silence disagreement.', route: 'Report eligible posts/comments; Contact for other surfaces.' },
  { situation: 'After a report', encouraged: 'Let the review proceed and use an offered correction or review path.', avoid: 'Retaliation, publishing private report details, or deleting evidence to mislead readers.', route: 'Follow the status or support guidance provided by HelloRun.' }
]);

const COMMUNITY_CHECKLIST = Object.freeze([
  'Is this relevant to the event, article, group, or conversation?',
  'Do I have permission or authority to share every person and detail shown?',
  'Have I credited sources and disclosed promotional or personal interests?',
  'Have I removed contact details, private messages, evidence, and sensitive records?',
  'Am I describing experience honestly without presenting unsafe advice as fact?',
  'Would a private event or support channel resolve this more safely?',
  'Can I express the concern without attacking, threatening, or humiliating someone?'
]);

const COMMUNITY_MODERATION = Object.freeze([
  { number: '01', icon: 'inbox', title: 'Concern received', text: 'A report, organizer concern, support request, legal request, or platform signal identifies possible harm.' },
  { number: '02', icon: 'archive', title: 'Evidence preserved', text: 'Relevant content and report-time context may be retained within the authorized moderation workflow.' },
  { number: '03', icon: 'search-check', title: 'Context reviewed', text: 'Severity, intent, repetition, safety, event authority, and available evidence are considered.' },
  { number: '04', icon: 'shield-check', title: 'Proportionate action', text: 'Guidance, correction, removal, restriction, suspension, or another suitable response may follow.' },
  { number: '05', icon: 'rotate-ccw', title: 'Recovery where appropriate', text: 'A correction or review path may be offered when the workflow and immediate safety risk permit it.' }
]);

const COMMUNITY_REPORTING = Object.freeze([
  { icon: 'flag', title: 'Posts, comments, and replies', text: 'Use the reason-based Report action on eligible content. Choose the closest reason and include only useful context.', href: '/blog', label: 'Visit community stories' },
  { icon: 'life-buoy', title: 'Profiles, groups, events, and messages', text: 'Use Contact for concerns without a dedicated report action. Do not send sensitive files unless requested.', href: '/contact', label: 'Contact HelloRun' },
  { icon: 'siren', title: 'Immediate physical danger', text: 'HelloRun is not an emergency or medical service. Contact the appropriate local emergency or health service.', href: '', label: '' }
]);

const COMMUNITY_RELATED = Object.freeze([
  { label: 'Terms and Conditions', href: '/terms' },
  { label: 'Acceptable Use', href: '/acceptable-use-policy' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Data Usage Policy', href: '/data-usage-policy' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' }
]);

const REFUND_OUTCOMES = Object.freeze([
  { icon: 'undo-2', situation: 'Changed mind before payment or fulfilment', owner: 'Organizer or merchant', action: 'Cancel an eligible unpaid shop order through its order page. Ask the event organizer about registration cancellation or transfer.', include: 'Order or confirmation number and the item or entry concerned.', caution: 'Cancellation does not automatically return money or cancel a separate registration or order.' },
  { icon: 'copy-check', situation: 'Duplicate or incorrect payment', owner: 'Organizer, then payment provider if needed', action: 'Ask the organizer to match both transaction records before requesting a correction or refund.', include: 'Amount, date, method, references, event or product, and order or confirmation number.', caution: 'A duplicated receipt image does not prove that two payments settled.' },
  { icon: 'receipt-text', situation: 'Rejected or unverified payment proof', owner: 'Relevant payment reviewer', action: 'Follow the correction guidance or provide the minimum transaction context requested through the authorized channel.', include: 'Accurate reference, amount, payment date, and clearer evidence only when requested.', caution: 'Rejected proof does not mean money was returned or that a refund is automatically due.' },
  { icon: 'clipboard-x', situation: 'Rejected or cancelled registration', owner: 'Event organizer', action: 'Request the reason and available correction, transfer, credit, cancellation, or refund path.', include: 'Event, confirmation number, payment state, and requested outcome.', caution: 'Registration status and actual money movement are separate records.' },
  { icon: 'calendar-x-2', situation: 'Organizer-cancelled event', owner: 'Event organizer', action: 'Review the organizer’s cancellation notice and ask which remedy or alternative applies to your entry.', include: 'Event, category or package, confirmation, paid amount, and entitlements already received.', caution: 'HelloRun can support records and communication but does not automatically fund or guarantee the remedy.' },
  { icon: 'calendar-sync', situation: 'Postponed or materially changed event', owner: 'Event organizer', action: 'Ask whether you may continue, transfer, receive credit, cancel, or request another appropriate remedy.', include: 'The original commitment, announced change, participant impact, and preferred resolution.', caution: 'Not every minor operational update creates a refund right; a material failure cannot be hidden by event terms.' },
  { icon: 'package-x', situation: 'Missing, defective, cancelled, or unfulfilled shop order', owner: 'Organizer or event-shop merchant', action: 'Report the order issue and request the applicable repair, replacement, fulfilment, refund, or other remedy.', include: 'Order number, product, condition or missing item, delivery or pickup context, and concise supporting detail.', caution: 'Cancelling fulfilment does not itself prove a paid order was refunded.' }
]);

const REFUND_BOUNDARIES = Object.freeze([
  { icon: 'package-minus', title: 'Cancel an eligible shop order', text: 'Stops an unpaid or payment-review order before fulfilment starts. It does not itself send money.' },
  { icon: 'clipboard-x', title: 'Cancel a registration', text: 'Changes event participation under organizer rules. No general runner-facing cancellation endpoint currently exists.' },
  { icon: 'message-square-text', title: 'Request a refund', text: 'Asks the responsible organizer or merchant to assess payment, terms, fulfilment, and applicable remedies.' },
  { icon: 'badge-check', title: 'Record refunded status', text: 'Documents a reported or confirmed outcome in platform records; it is not the payment transaction itself.' },
  { icon: 'landmark', title: 'Return money', text: 'Requires action in the responsible organizer, merchant, bank, wallet, or payment-provider workflow.' }
]);

const REFUND_JOURNEY = Object.freeze([
  { number: '01', icon: 'search', title: 'Identify the transaction', text: 'Separate the registration, shop order, payment, product, and event decision involved.' },
  { number: '02', icon: 'messages-square', title: 'Contact the responsible organizer', text: 'Use the event page and give the minimum reference information needed to locate the record.' },
  { number: '03', icon: 'file-search-2', title: 'Review records and terms', text: 'Payment state, disclosed terms, event changes, fulfilment, evidence, and applicable obligations are considered.' },
  { number: '04', icon: 'route', title: 'Communicate the outcome', text: 'The organizer should explain the decision, remedy, responsible party, and next step without misleading status labels.' },
  { number: '05', icon: 'life-buoy', title: 'Escalate unresolved platform concerns', text: 'Use Contact for platform, safety, policy, privacy, or repeated organizer-conduct concerns.' }
]);

const REFUND_CHECKLIST = Object.freeze([
  'Event or product name',
  'Registration confirmation or shop order number',
  'Amount and currency',
  'Payment date and method',
  'Transaction reference where available',
  'Requested correction, cancellation, refund, replacement, transfer, or credit',
  'Concise description of what happened',
  'Relevant dates or organizer communication without unnecessary private data'
]);

const REFUND_RESPONSIBILITIES = Object.freeze([
  { icon: 'store', title: 'Organizer or merchant', text: 'Owns event fees, packages, products, inventory, fulfilment, event changes, participant communication, and practical processing of approved remedies.' },
  { icon: 'layout-dashboard', title: 'HelloRun platform', text: 'Provides records, review tools, communication, status handling, support context, and policy enforcement; it does not automatically transfer refunded money.' },
  { icon: 'landmark', title: 'Payment provider', text: 'Controls settlement, reversals, disputes, conversion, provider fees, and its own processing timeline.' }
]);

const REFUND_RELATED = Object.freeze([
  { label: 'Terms and Conditions', href: '/terms' },
  { label: 'Organiser Terms', href: '/organiser-terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Data Usage Policy', href: '/data-usage-policy' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' }
]);

const COOKIE_CATEGORIES = Object.freeze([
  { icon: 'shield-check', key: 'essential', title: 'Essential', state: 'Always on', text: 'Secure sessions, CSRF protection, authentication, and the record that remembers your choices.' },
  { icon: 'sliders-horizontal', key: 'functional', title: 'Functional', state: 'Your choice', text: 'Local form drafts, saved workspace views, collapsed panels, and interface preferences on this browser.' },
  { icon: 'chart-no-axes-combined', key: 'analytics', title: 'Analytics', state: 'Your choice', text: 'Configured Google Analytics measurement used to understand visits and improve platform reliability.' },
  { icon: 'badge-ad', key: 'advertising', title: 'Advertising', state: 'Your choice', text: 'Configured Google AdSense delivery, measurement, frequency controls, and invalid-traffic protection.' }
]);

const COOKIE_STORAGE_MATRIX = Object.freeze([
  { provider: 'HelloRun', name: 'hr.sid', purpose: 'Session, authentication, CSRF protection, and secure forms', technology: 'HTTP cookie', duration: 'Up to 7 days', category: 'Essential', removal: 'Sign out or clear site cookies; protected features will stop working' },
  { provider: 'HelloRun', name: 'hr.cookie_preferences', purpose: 'Remember this browser’s Functional, Analytics, and Advertising choices', technology: 'HTTP cookie', duration: 'Up to 12 months', category: 'Essential', removal: 'Clear site cookies; optional categories return to off' },
  { provider: 'HelloRun', name: 'Registration and run-proof drafts', purpose: 'Restore eligible form values without storing uploaded files', technology: 'Local storage', duration: 'Up to 7 days', category: 'Functional', removal: 'Disable Functional storage, submit or clear the draft, or clear site data' },
  { provider: 'HelloRun', name: 'Organizer and policy workspace drafts', purpose: 'Restore unsaved event or policy form values on the same browser', technology: 'Local storage', duration: 'Up to 7 days', category: 'Functional', removal: 'Disable Functional storage, save or clear the draft, or clear site data' },
  { provider: 'HelloRun', name: 'Views, panels, columns, and queue position', purpose: 'Remember selected interface state and short-lived navigation context', technology: 'Local or session storage', duration: 'Until removed; session values end with the browser session', category: 'Functional', removal: 'Disable Functional storage or clear site data' },
  { provider: 'Google Analytics', name: '_ga and related identifiers', purpose: 'Measure visits and aggregate site usage when Analytics is allowed', technology: 'First-party and provider storage', duration: 'Controlled by Google and configuration', category: 'Analytics', removal: 'Disable Analytics and use browser or Google controls' },
  { provider: 'Google AdSense', name: 'Google advertising identifiers', purpose: 'Serve, measure, limit, and protect ads on configured pages', technology: 'First- and third-party cookies or similar storage', duration: 'Controlled by Google and user settings', category: 'Advertising', removal: 'Disable Advertising and use browser or Google Ads Settings' },
  { provider: 'Requested integrations', name: 'Provider-managed state', purpose: 'Support Cloudflare security checks, Google sign-in, Strava authorization, fonts, or another feature you request', technology: 'Provider request, cookie, or storage where applicable', duration: 'Controlled by the provider', category: 'Essential or feature-specific', removal: 'Use provider controls, disconnect the integration, or clear browser data' }
]);

const COOKIE_CHOICE_GUIDANCE = Object.freeze([
  { icon: 'file-x-2', title: 'Functional declined', text: 'Core forms still work, but HelloRun will not save local drafts or persistent interface choices on this browser.' },
  { icon: 'chart-no-axes-column-decreasing', title: 'Analytics declined', text: 'The Google Analytics tag is not loaded and HelloRun receives no optional Analytics measurement from the page.' },
  { icon: 'badge-x', title: 'Advertising declined', text: 'AdSense tags and ad placements are not requested. Useful page content remains available without empty ad gaps.' }
]);

const COOKIE_RELATED = Object.freeze([
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Data Usage Policy', href: '/data-usage-policy' },
  { label: 'Terms and Conditions', href: '/terms' },
  { label: 'Google partner data', href: 'https://policies.google.com/technologies/partner-sites' },
  { label: 'Google Ads Settings', href: 'https://adssettings.google.com' },
  { label: 'Contact about privacy', href: '/contact' }
]);

function decodeText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugifyHeading(value) {
  return decodeText(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function isDuplicateTitle(value, policyDocument = {}) {
  const normalized = decodeText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const candidates = [policyDocument.title, policyDocument.dbTitle, 'HelloRun Terms and Conditions']
    .map((item) => decodeText(item).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
    .filter(Boolean);
  return candidates.includes(normalized);
}

function stripLeadingPolicyPreamble(html, policyDocument) {
  let output = String(html || '').trim();
  output = output.replace(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i, (match, content) => (
    isDuplicateTitle(content, policyDocument) ? '' : match
  ));
  let previous;
  do {
    previous = output;
    output = output.replace(/^\s*<p[^>]*>(?:\s|<br\s*\/?\s*>|&nbsp;)*<\/p>/i, '');
    output = output.replace(/^\s*<p[^>]*>\s*(?:(?:<strong>)?\s*(?:last\s+updated|version|effective|platform|website|contact)\s*:?[\s\S]*?)?<\/p>/i, '');
  } while (output !== previous);
  return output.trim();
}

function normalizePolicyHtml(html, policyDocument = {}) {
  const source = stripLeadingPolicyPreamble(html, policyDocument);
  const used = new Set();
  const contents = [];
  let wordText = source.replace(/<[^>]+>/g, ' ');

  const normalizedHtml = source.replace(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi, (_match, rawLevel, inner) => {
    const label = decodeText(inner);
    if (!label) return '';
    const level = Number(rawLevel) === 1 ? 2 : Number(rawLevel);
    const base = slugifyHeading(label);
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    contents.push({ id, label, level });
    return `<h${level} id="${id}" tabindex="-1">${inner}</h${level}>`;
  });

  const wordCount = decodeText(wordText).split(/\s+/).filter(Boolean).length;
  return { html: normalizedHtml, contents, wordCount, readingMinutes: Math.max(1, Math.ceil(wordCount / 220)) };
}

function formatPolicyDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Manila' }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('day')} ${get('month')} ${get('year')}`.trim();
}

function buildPublicPolicyPresentation({ policyDocument = {}, policyHtml = '', policyMeta = {} } = {}) {
  const normalized = normalizePolicyHtml(policyHtml, policyDocument);
  const isPrivacy = policyDocument.key === 'privacy';
  const isTerms = policyDocument.key === 'terms';
  const isDataUsage = policyDocument.key === 'dataUsage';
  const isAcceptableUse = policyDocument.key === 'acceptableUse';
  const isOrganiserTerms = policyDocument.key === 'organiserTerms';
  const isCommunityGuidelines = policyDocument.key === 'communityGuidelines';
  const isRefundPolicy = policyDocument.key === 'refund';
  const isCookiePolicy = policyDocument.key === 'cookie';
  return {
    isPrivacy,
    isTerms,
    isDataUsage,
    isAcceptableUse,
    isOrganiserTerms,
    isCommunityGuidelines,
    isRefundPolicy,
    isCookiePolicy,
    contentHtml: normalized.html,
    contents: normalized.contents,
    readingMinutes: normalized.readingMinutes,
    versionLabel: policyMeta.versionNumber ? `Version ${policyMeta.versionNumber}` : '',
    effectiveLabel: formatPolicyDate(policyMeta.effectiveDate),
    updatedLabel: formatPolicyDate(policyMeta.updatedAt),
    summaryOfChanges: String(policyMeta.summaryOfChanges || '').trim(),
    summary: isTerms ? TERMS_SUMMARY : [],
    relatedPolicies: isPrivacy ? PRIVACY_RELATED : (isTerms ? RELATED_POLICIES : (isDataUsage ? DATA_USAGE_RELATED : (isAcceptableUse ? ACCEPTABLE_USE_RELATED : (isOrganiserTerms ? ORGANISER_RELATED : (isCommunityGuidelines ? COMMUNITY_RELATED : (isRefundPolicy ? REFUND_RELATED : (isCookiePolicy ? COOKIE_RELATED : []))))))),
    privacyBoundaries: isPrivacy ? PRIVACY_BOUNDARIES : [],
    privacyRights: isPrivacy ? PRIVACY_RIGHTS : [],
    privacyProcessing: isPrivacy ? PRIVACY_PROCESSING : [],
    dataJourney: isDataUsage ? DATA_USAGE_JOURNEY : [],
    dataCategories: isDataUsage ? DATA_USAGE_CATEGORIES : [],
    dataSummaries: isDataUsage ? DATA_USAGE_SUMMARIES : [],
    acceptableUseRules: isAcceptableUse ? ACCEPTABLE_USE_RULES : [],
    acceptableUseEnforcement: isAcceptableUse ? ACCEPTABLE_USE_ENFORCEMENT : [],
    acceptableUseReporting: isAcceptableUse ? ACCEPTABLE_USE_REPORTING : [],
    organiserCapabilities: isOrganiserTerms ? ORGANISER_CAPABILITIES : [],
    organiserLifecycle: isOrganiserTerms ? ORGANISER_LIFECYCLE : [],
    organiserDuties: isOrganiserTerms ? ORGANISER_DUTIES : [],
    communityApplicability: isCommunityGuidelines ? COMMUNITY_APPLICABILITY : [],
    communityPrinciples: isCommunityGuidelines ? COMMUNITY_PRINCIPLES : [],
    communitySituations: isCommunityGuidelines ? COMMUNITY_SITUATIONS : [],
    communityChecklist: isCommunityGuidelines ? COMMUNITY_CHECKLIST : [],
    communityModeration: isCommunityGuidelines ? COMMUNITY_MODERATION : [],
    communityReporting: isCommunityGuidelines ? COMMUNITY_REPORTING : [],
    refundOutcomes: isRefundPolicy ? REFUND_OUTCOMES : [],
    refundBoundaries: isRefundPolicy ? REFUND_BOUNDARIES : [],
    refundJourney: isRefundPolicy ? REFUND_JOURNEY : [],
    refundChecklist: isRefundPolicy ? REFUND_CHECKLIST : [],
    refundResponsibilities: isRefundPolicy ? REFUND_RESPONSIBILITIES : [],
    cookieCategories: isCookiePolicy ? COOKIE_CATEGORIES : [],
    cookieStorageMatrix: isCookiePolicy ? COOKIE_STORAGE_MATRIX : [],
    cookieChoiceGuidance: isCookiePolicy ? COOKIE_CHOICE_GUIDANCE : []
  };
}

module.exports = {
  ACCEPTABLE_USE_ENFORCEMENT,
  ACCEPTABLE_USE_RELATED,
  ACCEPTABLE_USE_REPORTING,
  ACCEPTABLE_USE_RULES,
  ORGANISER_CAPABILITIES,
  ORGANISER_DUTIES,
  ORGANISER_LIFECYCLE,
  ORGANISER_RELATED,
  PRIVACY_BOUNDARIES,
  PRIVACY_PROCESSING,
  PRIVACY_RELATED,
  PRIVACY_RIGHTS,
  COMMUNITY_APPLICABILITY,
  COMMUNITY_CHECKLIST,
  COMMUNITY_MODERATION,
  COMMUNITY_PRINCIPLES,
  COMMUNITY_RELATED,
  COMMUNITY_REPORTING,
  COMMUNITY_SITUATIONS,
  COOKIE_CATEGORIES,
  COOKIE_CHOICE_GUIDANCE,
  COOKIE_RELATED,
  COOKIE_STORAGE_MATRIX,
  REFUND_BOUNDARIES,
  REFUND_CHECKLIST,
  REFUND_JOURNEY,
  REFUND_OUTCOMES,
  REFUND_RELATED,
  REFUND_RESPONSIBILITIES,
  DATA_USAGE_CATEGORIES,
  DATA_USAGE_JOURNEY,
  DATA_USAGE_RELATED,
  DATA_USAGE_SUMMARIES,
  RELATED_POLICIES,
  TERMS_SUMMARY,
  buildPublicPolicyPresentation,
  decodeText,
  formatPolicyDate,
  normalizePolicyHtml,
  slugifyHeading,
  stripLeadingPolicyPreamble
};
