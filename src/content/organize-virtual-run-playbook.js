'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers';
const LEGACY_SLUG = 'how-to-organize-community-virtual-run';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Organize a Virtual Run: A Practical Guide for Event Organizers',
  excerpt: 'Plan a trustworthy virtual run with clear formats, dates, registration, payment, proof review, leaderboards, participant support, and closeout checklists.',
  category: 'Organizer Guide',
  tags: Object.freeze([
    'virtual run planning',
    'event organizer',
    'event rules',
    'proof review',
    'participant registration',
    'virtual race',
    'leaderboard rules',
    'runner experience'
  ]),
  seoTitle: 'How to Organize a Virtual Run: Practical Guide',
  seoDescription: 'A practical virtual run playbook covering formats, rules, registration, payments, proof review, leaderboards, participant support, and event closeout.',
  coverImageAlt: 'Virtual run organiser workflow from event planning and registration through proof review, results, and finisher recognition'
});

const RAW_CONTENT_HTML = `
<p>A virtual run removes the shared start line, but it does not remove the organiser's work. Participants still need to know exactly what they are joining, when an activity counts, what evidence to submit, how decisions are made, and what happens after they finish.</p>
<p>The most trustworthy events are not necessarily the largest or most expensive. They are the ones whose promises, rules, systems, and team capacity agree with each other. This playbook helps clubs, schools, companies, charities, and community teams design that complete experience.</p>

<h2>Quick start: make these decisions before creating the event</h2>
<ol>
  <li>What is the event's purpose, intended audience, and measurable definition of success?</li>
  <li>Will the target be completed in one activity or accumulated across several activities?</li>
  <li>Which activity types, locations, devices, and evidence will be accepted?</li>
  <li>What are the registration, activity, submission, review, results, and reward dates in one named timezone?</li>
  <li>Is the event free or paid, and what exactly does any fee include?</li>
  <li>How will payment receipts, run results, corrections, duplicates, and appeals be reviewed?</li>
  <li>Will the event rank speed, accumulated distance, completion, teams, or nothing competitive?</li>
  <li>What participant data is truly required, who may access it, and when will it be removed?</li>
  <li>Who owns participant support, payment review, result review, communications, and escalation?</li>
  <li>What will happen if weather, technology, demand, fulfilment, or staffing does not follow the plan?</li>
</ol>
<blockquote><strong>Do not publish yet</strong> if the team cannot answer a question that affects eligibility, money, proof acceptance, safety, ranking, privacy, or rewards. A clear draft is easier to repair than a live promise.</blockquote>

<h2>How this playbook was prepared</h2>
<p>This is practical planning guidance, not legal, tax, insurance, medical, financial, or safeguarding advice. It combines HelloRun's current virtual-event workflow with event risk-management, data-minimisation, and accessible-form guidance available in July 2026.</p>
<p>Requirements vary by country, participant age, event structure, fundraising model, prize value, and organisation type. Confirm applicable local laws, permits, insurance, consumer rules, tax treatment, safeguarding duties, and payment obligations before accepting registrations or money. A waiver records acknowledgement; it does not erase an organiser's responsibilities or replace professional advice.</p>

<h2>1. Write a one-page event brief</h2>
<p>Begin with a short internal brief rather than a poster. If the operating team cannot explain the event on one page, participants will struggle to understand it on a registration page.</p>
<h3>Copyable event brief</h3>
<ul>
  <li><strong>Purpose:</strong> Why does this event exist?</li>
  <li><strong>Audience:</strong> Who is it designed for, and who is not eligible?</li>
  <li><strong>Format:</strong> Single activity, accumulated distance, completion-only, or competitive.</li>
  <li><strong>Goal:</strong> The exact distance or completion requirement.</li>
  <li><strong>Dates and timezone:</strong> Every opening, closing, and publication date.</li>
  <li><strong>Entry model:</strong> Free or paid, inclusions, payment method, and refund position.</li>
  <li><strong>Evidence:</strong> Accepted sources and the minimum fields reviewers need.</li>
  <li><strong>Recognition:</strong> Certificate, badge, leaderboard, physical reward, or participation record.</li>
  <li><strong>People:</strong> Named owners for operations, reviews, support, and communications.</li>
  <li><strong>Success measures:</strong> Registrations, paid confirmations, valid completions, response time, participant satisfaction, or another useful outcome.</li>
  <li><strong>Constraints:</strong> Budget, staffing, fulfilment capacity, platform limits, and legal requirements.</li>
</ul>
<p>Use success measures that the team can act on. Registration count alone does not reveal whether payment review was timely, instructions were understood, submissions were valid, or participants received what was promised.</p>

<h2>2. Choose a format that matches the purpose</h2>
<h3>Single-activity virtual run</h3>
<p>The participant completes the full target in one recorded activity. This suits a race-like 3K, 5K, 10K, or other distance when a comparable single result matters. It is simpler to review, but it may be less accessible to beginners or people with limited scheduling flexibility.</p>
<h3>Accumulated-distance challenge</h3>
<p>The participant combines approved activities during the event window. This suits consistency, wellness, club mileage, and longer goals. The rules must explain minimum activity distance, maximum or unlimited entries, allowed activity types, how totals are calculated, and whether exceeding the target affects ranking.</p>
<h3>Completion-only or competitive</h3>
<p>A completion event recognises participants who meet the published requirement. A competitive event ranks an approved result using a disclosed method. Do not add a speed leaderboard merely because the platform can display one. Ranking changes participant behaviour, review workload, tie handling, and dispute risk.</p>
<p>Time-based, team, charity, or mixed-mode concepts may need processes beyond a standard distance event. Confirm that the chosen platform and team can support the mechanics before advertising them.</p>

<h2>3. Build one timeline with six distinct stages</h2>
<p>“Event ends Friday” is not enough. Publish exact dates, times, and a named timezone for each stage:</p>
<ol>
  <li><strong>Registration window:</strong> When entries open and close.</li>
  <li><strong>Activity window:</strong> When qualifying activities may occur.</li>
  <li><strong>Submission window:</strong> When evidence may be uploaded, including any grace period after the activity window.</li>
  <li><strong>Review window:</strong> When the team expects to decide pending evidence and corrections.</li>
  <li><strong>Results date:</strong> When rankings or the verified finisher list become final.</li>
  <li><strong>Recognition or fulfilment date:</strong> When certificates, badges, or physical items should become available or ship.</li>
</ol>
<p>Separate the activity deadline from the submission deadline if runners are allowed time to upload proof. State whether the deadline follows the participant's location or the organiser's timezone. Decide how daylight-saving changes or a platform outage will be handled before they become disputes.</p>

<h2>4. Publish complete mechanics before registration</h2>
<p>Rules should let a reasonable participant decide whether to join and complete the event without relying on private messages. Use headings and lists instead of hiding critical terms inside promotion copy.</p>
<h3>Copyable mechanics outline</h3>
<ul>
  <li><strong>Eligibility:</strong> Age, location, organisation, membership, and guardian requirements.</li>
  <li><strong>Categories:</strong> Distance, mode, team, or participant categories and how to choose one.</li>
  <li><strong>Qualifying activity:</strong> Run, walk, wheelchair activity, treadmill, or another expressly allowed type.</li>
  <li><strong>Completion rule:</strong> One activity or accumulated activities; minimum distance; overshoot and rounding treatment.</li>
  <li><strong>Timing rule:</strong> Elapsed or moving time, pauses, and whether pace affects eligibility or ranking.</li>
  <li><strong>Evidence:</strong> Accepted apps, watches, screenshots, links, treadmill records, and manual entries.</li>
  <li><strong>Required fields:</strong> Date, distance, duration, activity type, source, identity, and route only when necessary.</li>
  <li><strong>Corrections:</strong> What happens when proof is unclear, incomplete, or submitted to the wrong category.</li>
  <li><strong>Deadlines:</strong> Exact dates, times, timezone, and any grace period.</li>
  <li><strong>Ranking:</strong> Metric, eligibility, approval requirement, tie-break method, and publication date.</li>
  <li><strong>Invalidation:</strong> Duplicate evidence, dates outside the window, prohibited activities, manipulated records, or other defined reasons.</li>
  <li><strong>Privacy:</strong> What is collected, what becomes public, who reviews it, and where participants can ask questions.</li>
  <li><strong>Recognition:</strong> Certificate, badge, reward, shipping limitations, and conditions.</li>
  <li><strong>Changes and disputes:</strong> How necessary changes are announced and how a participant may request review.</li>
</ul>
<p>Avoid broad clauses that let the team change anything without explanation. If a material change becomes unavoidable, document the reason, notify affected participants through the promised channels, and offer the remedy required by applicable rules and policies.</p>

<h2>5. Design proof rules around the event's risk</h2>
<p>A casual completion challenge and a prize-bearing speed competition should not use identical review standards. Decide what evidence is proportionate to the consequence of approval.</p>
<h3>Minimum useful activity evidence</h3>
<ul>
  <li>Activity date within the permitted window.</li>
  <li>Distance and visible unit.</li>
  <li>Duration or time when relevant.</li>
  <li>Activity type.</li>
  <li>Recognisable app or device source.</li>
  <li>Participant identity only to the extent required to match the registration.</li>
  <li>Route or supporting fields only when the published policy requires them.</li>
</ul>
<p>Decide explicitly whether treadmill activities and manual entries count. A treadmill may be reasonable for completion but excluded from a GPS-based ranking. Manual evidence may require a second supporting record. These are event choices, not universal rules.</p>
<p>Read <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> and the <a href="/blog/best-apps-to-track-your-virtual-run">virtual run tracking-app comparison</a> before writing the policy.</p>

<h2>6. Create a fair review and correction policy</h2>
<p>Reviewers need the same rubric. Without it, identical submissions can receive different outcomes depending on who opens the queue.</p>
<h3>Separate unclear evidence from invalid evidence</h3>
<ul>
  <li><strong>Unclear:</strong> A required field is hidden, the image is blurry, the unit is ambiguous, or the wrong file was attached. Allow correction when the published rules permit it.</li>
  <li><strong>Invalid:</strong> The activity is outside the event window, below the required distance, duplicated, prohibited by the mechanics, or cannot be matched to an eligible registration.</li>
  <li><strong>Needs escalation:</strong> The rules are ambiguous, a system issue affected the submission, or manipulation is suspected but not established.</li>
</ul>
<p>Record a concise reason for rejection or correction. Avoid accusing a participant of fraud based only on an automated flag. OCR, duplicate detection, pace checks, and other signals can help reviewers notice inconsistencies; a responsible human decision still requires the original evidence, submitted values, event rules, and available context.</p>

<h2>7. Define the leaderboard before accepting entries</h2>
<p>A leaderboard should answer one published question. Examples include fastest approved time for a single distance, greatest approved accumulated distance, or completion status without ordinal ranking.</p>
<ul>
  <li>Include only results whose status qualifies under the rules.</li>
  <li>Define whether ranking uses elapsed time, moving time, distance, percentage completed, or another metric.</li>
  <li>Publish category and mode boundaries.</li>
  <li>Choose a tie-break method before the first tie.</li>
  <li>State when rankings remain provisional and when they become final.</li>
  <li>Do not expose proof images, contact details, review flags, or private notes on a public leaderboard.</li>
</ul>
<p>HelloRun's public leaderboard is based on approved submissions by default. The guide <a href="/blog/how-leaderboards-work-virtual-running-events">How Leaderboards Work in Virtual Running Events</a> explains why pending evidence should not be treated as a final result.</p>

<h2>8. Plan free, paid, charity, and reward-based events honestly</h2>
<h3>Free events</h3>
<p>Free does not mean costless to operate. Estimate platform work, design, participant support, reviewer time, certificates, prizes, storage, and fulfilment before promising scale.</p>
<h3>Paid events</h3>
<p>State the price, currency, inclusions, exclusions, payment instructions, confirmation process, cancellation terms, refund rules, and fulfilment expectations before checkout or receipt submission. Keep payment evidence separate from activity evidence.</p>
<p>HelloRun's current paid-registration flow uses participant-uploaded payment receipts and organiser review. It should not be described as an integrated payment gateway or instant payment confirmation. Reviewers compare the receipt with the registration and published payment instructions, then approve or reject it with an appropriate explanation.</p>
<h3>Charity or advocacy events</h3>
<p>Name the beneficiary accurately, confirm authority to use its name and branding, explain whether entry fees or a defined amount support the cause, identify deductions or costs where required, and avoid tax-deductibility claims unless they are valid in the relevant jurisdiction. Keep records appropriate to applicable fundraising and accounting obligations.</p>
<h3>Prizes and physical rewards</h3>
<p>Publish eligibility, quantity, selection method, tie handling, geographic restrictions, shipping responsibility, expected dates, and substitution or delay terms. Do not advertise a medal, shirt, prize, badge, or certificate that has not been approved and operationally planned.</p>

<h2>9. Minimise participant data and protect route privacy</h2>
<p>Identify why every requested field is needed. Data-minimisation guidance recommends collecting information that is adequate and relevant for a defined purpose, but no more than necessary. Decide who can access registration records, payment receipts, activity proof, and review notes, plus how long each category should be retained.</p>
<ul>
  <li>Do not collect emergency contacts for a purely virtual activity unless there is a justified operational purpose.</li>
  <li>Do not make payment receipts or proof screenshots public.</li>
  <li>Warn participants when route maps may reveal a home, school, or workplace.</li>
  <li>Separate public leaderboard fields from private operational records.</li>
  <li>Publish a contact path for privacy questions and applicable rights requests.</li>
</ul>
<p>Review the HelloRun <a href="/privacy">Privacy Policy</a> and <a href="/organiser-terms">Organiser Terms</a>. An organiser may have additional responsibilities under its own policies and local law.</p>

<h2>10. Make registration and communication accessible</h2>
<p>Accessible forms are easier for everyone. Use clear labels, concise instructions, understandable validation, visible error messages, and confirmation after submission. Avoid relying on colour alone or placing essential rules only inside an image.</p>
<ul>
  <li>Use plain-language headings and short rule sections.</li>
  <li>Provide meaningful alternative text for event images.</li>
  <li>Test registration and proof instructions with keyboard and mobile navigation.</li>
  <li>Explain errors and how to correct them.</li>
  <li>Offer a support route for participants who cannot use the default evidence process.</li>
</ul>
<p>Youth events need an appropriate safeguarding plan, guardian consent where required, age-appropriate communication, restricted data collection, and clear escalation responsibilities. Obtain qualified local guidance rather than copying an adult community event waiver.</p>

<h2>11. Assign operating roles before launch</h2>
<p>One person may hold several roles in a small event, but every responsibility still needs an owner and backup.</p>
<ul>
  <li><strong>Event owner:</strong> Final decisions, published promises, budget, and escalation.</li>
  <li><strong>Platform operator:</strong> Event setup, categories, dates, access, and status changes.</li>
  <li><strong>Participant support:</strong> Questions, corrections, accessibility needs, and response targets.</li>
  <li><strong>Payment reviewer:</strong> Receipt review for paid registrations.</li>
  <li><strong>Result reviewer:</strong> Activity evidence, notes, approvals, rejections, and escalation.</li>
  <li><strong>Communications owner:</strong> Launch, reminders, changes, results, and fulfilment notices.</li>
  <li><strong>Privacy or safeguarding contact:</strong> Sensitive issues and appropriate referrals.</li>
</ul>
<p>Define who may approve their own entry or the entry of a close associate. For competitive or prize-bearing events, use a second reviewer or escalation path when a conflict could undermine trust.</p>

<h2>12. Configure HelloRun without overstating automation</h2>
<p>An approved organiser can create and preview an event, configure its format and dates, publish registration information, manage registrants, review payment receipts for paid events, review run proof, and configure supported recognition features.</p>
<p>HelloRun does not continuously track a participant's GPS location. Runners submit activity evidence or import supported activity data, and OCR may assist with extracting fields from screenshots. OCR is not perfect and does not replace organiser or admin review.</p>
<p>For paid events, manual payment-receipt review is separate from run-result review. Approved submissions can feed eligible leaderboards, and approved results may receive configured certificates. Do not promise a certificate, badge, ranking, or physical item merely because a setting exists; finish configuration and test the output first.</p>
<p>Start an <a href="/organizer/complete-profile">organiser application</a> if required, or open <a href="/organizer/create-event">Create Event</a> when your account is eligible. Review the runner-facing <a href="/how-it-works">How It Works</a> page so your instructions use the same workflow participants will see.</p>

<h2>13. Test the full runner journey before publishing</h2>
<p>Do not test only the organiser form. Use a realistic participant perspective from discovery through completion.</p>
<ol>
  <li>Find the event from the public <a href="/events">Events page</a>.</li>
  <li>Read the description, categories, dates, fee, rules, and reward promises on mobile.</li>
  <li>Register with the minimum required information.</li>
  <li>For a paid test, verify that payment instructions and receipt status are understandable.</li>
  <li>Confirm when run-result submission becomes available.</li>
  <li>Upload representative valid and unclear evidence.</li>
  <li>Review the organiser decision and participant-facing reason.</li>
  <li>Confirm the approved result appears only where the rules say it should.</li>
  <li>Preview the certificate or badge when one is promised.</li>
  <li>Check every email, support link, policy link, deadline, and timezone.</li>
</ol>
<p>Ask someone who did not write the mechanics to perform the test. Familiarity hides assumptions.</p>

<h2>14. Promote the exact event you built</h2>
<p>Promotion should summarize the event, not replace its rules. Use the same title, categories, fee, dates, inclusions, and reward terms everywhere. Link back to one authoritative event page.</p>
<ul>
  <li>Do not use invented participant counts, testimonials, partnerships, scarcity, or prize claims.</li>
  <li>Do not call an activity free when a mandatory purchase or fee applies.</li>
  <li>Do not imply that a charity receives all proceeds when costs or deductions apply.</li>
  <li>Do not encourage unsafe routes, deadline chasing, or exercise beyond a participant's capacity.</li>
  <li>Schedule reminders for registration close, activity start, submission deadline, and status checking.</li>
</ul>
<p>Link participants to the <a href="/blog/running-safety-tips-early-morning-night-runs">low-light running safety guide</a> when flexible timing may lead them to complete activities before sunrise or after dark.</p>

<h2>15. Operate the event in manageable queues</h2>
<p>Review regularly rather than waiting for the final deadline. Track registrations, unpaid or pending payment receipts, submitted results, correction requests, escalations, and participant questions separately.</p>
<ul>
  <li>Publish a realistic response time and update it if demand changes.</li>
  <li>Use standard reasons, but add enough context for the participant to act.</li>
  <li>Do not bulk-approve evidence merely to clear the queue.</li>
  <li>Escalate ambiguous cases instead of inventing a private exception.</li>
  <li>Keep an audit trail of material rule changes and review decisions.</li>
  <li>Communicate widespread system issues once, through the official channel.</li>
</ul>

<h2>16. Prepare failure plans</h2>
<ul>
  <li><strong>Unsafe weather:</strong> Remind participants that they choose safe local conditions; extend or adjust only through a documented, consistently applied decision.</li>
  <li><strong>Tracking-app outage:</strong> Use the prepublished alternative-evidence rule rather than improvising for individual runners.</li>
  <li><strong>Deadline surge:</strong> Add reviewers, triage incomplete entries, and communicate revised review timing without silently changing activity eligibility.</li>
  <li><strong>Platform interruption:</strong> Record the affected period, preserve reports from participants, and publish one remedy for similarly affected entries.</li>
  <li><strong>Ambiguous mechanics:</strong> Pause disputed decisions, document the interpretation, and apply it consistently.</li>
  <li><strong>Suspected manipulation:</strong> Preserve evidence, restrict sensitive details, and use the review/escalation process rather than public accusations.</li>
  <li><strong>Reward delay:</strong> Tell affected participants what changed, what remains confirmed, and when the next update will arrive.</li>
  <li><strong>Low registration:</strong> Deliver the published event unless the cancellation policy allows another outcome; do not fabricate momentum.</li>
</ul>

<h2>17. Finalise results and close the event</h2>
<p>Resolve pending reviews and corrections before marking rankings final. Publish only the participant information required by the event. Release configured certificates or badges after the qualifying result is approved, and communicate physical fulfilment separately.</p>
<h3>Closeout checklist</h3>
<ul>
  <li>All payment and result queues reviewed or assigned a documented status.</li>
  <li>Leaderboard filters, categories, tie handling, and final status checked.</li>
  <li>Certificates, badges, prizes, and shipping lists reconciled against eligible records.</li>
  <li>Participants told where to find results and how to report a genuine error.</li>
  <li>Refund, cancellation, and fulfilment obligations tracked to completion.</li>
  <li>Sensitive exports and temporary working files restricted or removed according to the retention plan.</li>
  <li>Team review completed using registration, completion, support, review-time, and feedback measures.</li>
</ul>
<p>Ask concise feedback questions: Were the rules understandable? Was registration manageable? Did participants know what proof to submit? Were decisions explained? Did recognition arrive as promised? Use the answers to change the next brief, not merely the next poster.</p>

<h2>Pre-launch checklist</h2>
<ul>
  <li>Purpose, audience, format, and success measures approved.</li>
  <li>Dates, timezone, categories, activities, and completion rules consistent everywhere.</li>
  <li>Fee, payment, refund, charity, prize, and fulfilment statements verified.</li>
  <li>Proof requirements, correction rules, invalidation reasons, and ranking method published.</li>
  <li>Privacy, retention, accessibility, youth, and safeguarding needs reviewed.</li>
  <li>Operating owners and backups assigned.</li>
  <li>Valid, unclear, invalid, duplicate, and late submission scenarios tested.</li>
  <li>Public event page, registration, support, review, leaderboard, and certificate journey tested.</li>
  <li>Failure plans and participant communications prepared.</li>
</ul>

<h2>Frequently asked questions</h2>
<h3>How long should a virtual run remain open?</h3>
<p>Match the activity window to the format and audience. A single 5K may need a weekend or a flexible multi-day window; a large accumulated target may need several weeks. Also allow realistic time for evidence submission and review. There is no universal ideal duration.</p>
<h3>Should treadmill activities count?</h3>
<p>They can count when the published event design allows them. Define acceptable treadmill evidence and whether indoor results qualify for completion, ranking, or both.</p>
<h3>Can OCR approve results automatically?</h3>
<p>No. OCR can assist with reading fields from an image, but extraction may be incomplete or wrong. The runner should review submitted values, and the organiser or admin should decide according to the event rules and original evidence.</p>
<h3>Should every virtual run have a leaderboard?</h3>
<p>No. Completion-only recognition may better fit beginner, school, workplace, charity, or wellbeing events. Use a leaderboard only when competition serves the purpose and the review process can support it fairly.</p>
<h3>What data should registration collect?</h3>
<p>Collect only what has a defined purpose for eligibility, communication, payment, results, recognition, or a justified operational requirement. Do not request information merely because another event did.</p>
<h3>Does a waiver remove organiser liability?</h3>
<p>No document should be presented as removing every responsibility. Waiver effect and event obligations depend on applicable law and circumstances. Obtain qualified advice for the actual event.</p>
<h3>Where can organisers get HelloRun help?</h3>
<p>Review the <a href="/faq">HelloRun FAQ</a>, relevant policies, and <a href="/contact">contact support</a> with the event name and a specific workflow question.</p>

<h2>Final takeaway</h2>
<p>A well-run virtual event is a chain of aligned decisions: purpose, format, rules, registration, money, evidence, reviews, communication, results, and recognition. Weakness in one link becomes participant confusion somewhere else.</p>
<p>Start with the one-page brief. Publish only promises the team and platform can deliver. Test the runner journey, review consistently, protect participant data, communicate problems early, and close every obligation after the final result.</p>

<h2>Official and platform sources</h2>
<p>This playbook was reviewed against the following resources in July 2026:</p>
<ul>
  <li><a href="https://www.rrca.org/education/event-directors/safe-event-guidelines/">Road Runners Club of America: Safe Event Guidelines</a></li>
  <li><a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/">Information Commissioner's Office: Data Minimisation</a></li>
  <li><a href="https://www.w3.org/WAI/tutorials/forms/">W3C Web Accessibility Initiative: Forms Tutorial</a></li>
  <li><a href="/organiser-terms">HelloRun Organiser Terms</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
  <li><a href="/refund-and-cancellation-policy">HelloRun Refund and Cancellation Policy</a></li>
</ul>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Quick start: make these decisions before creating the event',
  'How this playbook was prepared',
  '1. Write a one-page event brief',
  '2. Choose a format that matches the purpose',
  '3. Build one timeline with six distinct stages',
  '4. Publish complete mechanics before registration',
  '5. Design proof rules around the event\'s risk',
  '6. Create a fair review and correction policy',
  '7. Define the leaderboard before accepting entries',
  '8. Plan free, paid, charity, and reward-based events honestly',
  '9. Minimise participant data and protect route privacy',
  '10. Make registration and communication accessible',
  '12. Configure HelloRun without overstating automation',
  '13. Test the full runner journey before publishing',
  '16. Prepare failure plans',
  '17. Finalise results and close the event',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/organizer/complete-profile',
  '/organizer/create-event',
  '/events',
  '/how-it-works',
  '/faq',
  '/contact',
  '/privacy',
  '/organiser-terms',
  '/refund-and-cancellation-policy',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/how-leaderboards-work-virtual-running-events',
  '/blog/running-safety-tips-early-morning-night-runs',
  'rrca.org',
  'ico.org.uk',
  'w3.org/WAI'
]);

function buildArticlePayload(existingPost = {}) {
  const contentHtml = sanitizeHtml(RAW_CONTENT_HTML);
  const contentText = htmlToPlainText(contentHtml);
  const coverImageUrl = String(existingPost.coverImageUrl || '').trim();
  const payload = {
    title: ARTICLE.title,
    excerpt: ARTICLE.excerpt,
    contentHtml,
    contentText,
    contentRaw: contentText,
    category: ARTICLE.category,
    customCategory: '',
    tags: [...ARTICLE.tags],
    readingTime: Math.max(1, Math.ceil(contentText.split(/\s+/).filter(Boolean).length / 180)),
    seoTitle: ARTICLE.seoTitle,
    seoDescription: ARTICLE.seoDescription,
    coverImageAlt: ARTICLE.coverImageAlt,
    ogImageUrl: coverImageUrl
  };

  validateArticlePayload(payload);
  return payload;
}

function validateArticlePayload(payload) {
  const errors = [];
  const wordCount = String(payload.contentText || '').split(/\s+/).filter(Boolean).length;

  if (ARTICLE.slug !== CANONICAL_SLUG) errors.push('canonical slug does not match');
  if (!payload.title || payload.title.length > 120) errors.push('title must be 1-120 characters');
  if (!payload.excerpt || payload.excerpt.length > 220) errors.push('excerpt must be 1-220 characters');
  if (!payload.contentHtml || payload.contentHtml.length > 50000) errors.push('contentHtml must be 1-50000 characters');
  if (!payload.contentText || payload.contentText.length > 50000) errors.push('contentText must be 1-50000 characters');
  if (payload.contentRaw !== payload.contentText) errors.push('contentRaw and contentText must match');
  if (wordCount < 3000) errors.push('article must contain at least 3000 words of substantive content');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('existing cover image is required for ogImageUrl');
  if (/<h[12]>How to Organize a Virtual Run:/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/<em>[^<]+<\/em>\s*\*/i.test(payload.contentHtml)) errors.push('body contains malformed emphasized list text');
  if (/automatically (?:approves?|verifies?)/i.test(payload.contentText)) errors.push('article must not promise automatic result approval');
  if (/HelloRun (?:provides|supports|includes) (?:an? )?(?:integrated|direct) payment gateway/i.test(payload.contentText)) errors.push('article must not claim direct payment processing');
  if (/waiver (?:removes?|eliminates?) (?:all )?(?:liability|responsibility)/i.test(payload.contentText)) errors.push('article must not claim waivers remove organiser responsibility');
  if (!/not legal, tax, insurance, medical, financial, or safeguarding advice/i.test(payload.contentText)) errors.push('article must include advice limitations');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid organizer-guide article payload: ${errors.join('; ')}`);
  return true;
}

module.exports = {
  ARTICLE,
  CANONICAL_SLUG,
  LEGACY_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
};
