'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'virtual-run-checklist-for-first-time-organizers';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'Virtual Run Checklist for First-Time Organizers',
  excerpt: 'Use a stage-by-stage virtual-run checklist to plan the format, configure registration and proof, test the runner journey, operate reviews, and close the event responsibly.',
  category: 'Organizer Guide',
  tags: Object.freeze([
    'virtual run checklist',
    'first-time organizer',
    'event planning',
    'event rules',
    'runner registration',
    'proof review',
    'participant support',
    'event closeout'
  ]),
  seoTitle: 'Virtual Run Checklist for First-Time Organizers | HelloRun',
  seoDescription: 'A practical checklist for first-time virtual-run organizers covering planning, HelloRun setup, registration, proof review, participant support, results, and closeout.',
  coverImageAlt: 'First-time virtual-run organizer reviewing an abstract checklist beside a laptop, running shoes, route notes, stopwatch, and water bottle'
});

const RAW_CONTENT_HTML = `
<p>A first virtual run can look simple: publish a distance, collect registrations, and ask runners for screenshots. In practice, the organiser is coordinating promises, dates, money, evidence, decisions, support, privacy, results, and recognition. A missed decision early in the process can become dozens of participant questions later.</p>
<p>This checklist turns that work into six stages. Use it as an operating sequence, not as a guarantee that an event is safe, legal, insured, accessible, financially viable, or successful. Mark an item complete only when the responsible person can show where the decision, configuration, test result, or communication is recorded.</p>
<blockquote><strong>First-time organiser rule:</strong> draft completely, test realistically, publish only what the team can deliver, and keep one authoritative event page for participants.</blockquote>

<h2>How to use this checklist</h2>
<ol>
  <li>Copy the stage headings into the team's planning document or task system.</li>
  <li>Assign an owner and due date to every item that affects eligibility, payment, proof, privacy, support, results, or rewards.</li>
  <li>Link each completed item to the event page, policy, screenshot, test record, supplier agreement, or internal decision that supports it.</li>
  <li>Leave uncertain items open. Do not convert an assumption into public copy merely to complete a form.</li>
  <li>Repeat the pre-publication checks after every material change to dates, fees, mechanics, evidence, categories, or recognition.</li>
  <li>Retain a closeout copy so the next event begins with evidence rather than memory.</li>
</ol>
<p>The checklist is deliberately broader than the HelloRun event form. Software can structure an event record, but it cannot choose an appropriate purpose, approve local legal duties, arrange insurance, manage a supplier, create a safeguarding programme, or decide what the team can honestly promise.</p>

<h2>How this checklist was prepared</h2>
<p>This article documents the HelloRun organiser workflow available in July 2026. It was checked against organiser access, event creation and preview, publication readiness, structured dates, categories, virtual completion modes, proof settings, pricing, external payment instructions, waivers, registration, receipt review, result review and correction, leaderboard settings, certificates, badges, exports, event status, and audit-oriented records.</p>
<p>It also uses current planning context from the Road Runners Club of America's Safe Event Guidelines and Race Director Code of Ethics, Information Commissioner's Office data-minimisation guidance, and the W3C Web Accessibility Initiative forms tutorial. RRCA states that its guidance is a planning tool rather than an all-inclusive local plan. W3C recommends clear labels, instructions, validation, notifications, and logical stages for accessible forms. ICO guidance describes personal data as adequate, relevant, and limited to what is necessary.</p>
<p>This is not legal, tax, insurance, medical, financial, accessibility-certification, or safeguarding advice. Requirements differ by jurisdiction, participant age, event model, prize value, fundraising structure, and organisation. Obtain appropriate local advice before accepting registrations, money, or responsibility for participants.</p>

<h2>Stage 1: Before creating the event</h2>
<p>The first stage produces an internal event brief. Do not begin with promotional artwork. A poster can hide unresolved mechanics; a brief exposes them.</p>
<h3>Purpose and audience checklist</h3>
<ul>
  <li>Write one sentence explaining why the event exists.</li>
  <li>Name the intended participants: public runners, club members, employees, students, supporters, or another defined group.</li>
  <li>Define what success means beyond registrations, such as verified completion, participation consistency, fundraising transparency, response time, or participant feedback.</li>
  <li>Decide whether participation is open, invitation-only, age-restricted, location-restricted, or membership-based.</li>
  <li>Identify accessibility, disability, language, technology, and schedule needs likely to affect the chosen audience.</li>
  <li>For youth participation, confirm institutional approval, guardian consent, safeguarding ownership, age-appropriate communication, data access, and escalation requirements with qualified local guidance.</li>
</ul>
<h3>Format and capacity checklist</h3>
<ul>
  <li>Choose virtual-only, onsite, or hybrid deliberately. This checklist focuses on virtual operations; an onsite component requires location-specific course, traffic, medical, volunteer, permit, and emergency planning.</li>
  <li>Choose a single qualifying activity or an accumulated-distance challenge.</li>
  <li>Decide whether the event recognises completion, ranks performance, supports teams, or uses another clearly defined outcome.</li>
  <li>Estimate registrations, payment receipts, activity submissions, corrections, support messages, and fulfilment items the team can manage.</li>
  <li>Set a capacity limit when reviewer or reward capacity is finite.</li>
  <li>Do not add competitive ranking or prizes unless the team can define eligibility, review evidence consistently, resolve ties, and handle disputes.</li>
</ul>
<h3>Team and ownership checklist</h3>
<ul>
  <li>Name one accountable event owner.</li>
  <li>Assign platform configuration, participant support, payment review, result review, communications, privacy, fulfilment, and escalation.</li>
  <li>Name backups for time-sensitive queues and deadlines.</li>
  <li>Define conflicts of interest, including who reviews the organiser's own result or a close associate's prize-eligible entry.</li>
  <li>Set realistic response targets for registration, payment, proof, correction, privacy, and delivery questions.</li>
  <li>Create one internal decision log for material rule interpretations and changes.</li>
</ul>
<h3>Budget, risk, and external-duty checklist</h3>
<ul>
  <li>Record platform work, design, marketing, reviewer time, certificates, badges, prizes, merchandise, payment charges, storage, tax, and delivery costs.</li>
  <li>Confirm authority to use organisation, sponsor, charity, school, club, and beneficiary names or artwork.</li>
  <li>Review applicable permits, insurance, consumer, promotion, prize, fundraising, tax, privacy, accessibility, employment, and safeguarding requirements.</li>
  <li>Write contingency positions for unsafe weather, tracking outages, platform interruption, low registration, reward delay, reviewer absence, and deadline surges.</li>
  <li>Confirm the event can be delivered if registrations are lower than hoped or operational work is higher than expected.</li>
  <li>Do not describe a waiver as removing organiser duties. A waiver records acknowledgement and does not make an unsafe or unlawful event acceptable.</li>
</ul>
<p>RRCA's Safe Event Guidelines place risk management and location-specific planning with the race director. A virtual format changes the controls available, but it does not eliminate the need for clear safety messaging, honest communication, appropriate local compliance, and escalation.</p>

<h2>Stage 2: Configure the event in HelloRun</h2>
<p>An approved organiser can build a draft and preview the structured event. Treat the draft as a working record until every applicable readiness item is complete.</p>
<h3>Identity and public information checklist</h3>
<ul>
  <li>Use a clear event title that does not imitate another event or imply an unauthorised partner.</li>
  <li>Write a short description that states the format, audience, goal, dates, and primary inclusion.</li>
  <li>Provide accurate organiser identity and a monitored support contact.</li>
  <li>Upload only media the organiser may use, with meaningful alternative text and no essential rules embedded only in an image.</li>
  <li>Keep title, description, poster, social copy, email, and event page claims consistent.</li>
</ul>
<h3>Dates and timezone checklist</h3>
<ul>
  <li>Set registration opening and closing dates.</li>
  <li>Set the event or activity start and end dates.</li>
  <li>Set the final submission deadline where supported, especially for accumulated challenges.</li>
  <li>Plan the review window, correction cutoff, final-results date, and recognition or fulfilment date even when they are described in event copy rather than separate fields.</li>
  <li>Name the timezone in the mechanics. HelloRun currently uses Asia/Manila for platform day-level activity alignment; participants should not have to infer the controlling timezone.</li>
  <li>Check that registration, pricing periods, activity, submission, review, and delivery dates do not contradict one another.</li>
</ul>
<h3>Category and completion checklist</h3>
<ul>
  <li>Define each distance or category with a label runners can understand.</li>
  <li>For a single-activity result, state that the required distance must be completed in one eligible record unless another rule is expressly published.</li>
  <li>For an accumulated challenge, configure the target, minimum activity distance where applicable, accepted activity types, final submission deadline, and recognition mode.</li>
  <li>Choose whether Run, Walk, Hike, Trail Run, treadmill, or another activity is accepted; do not assume “virtual” means every activity type.</li>
  <li>Define unit conversion, rounding, overshoot, pauses, and moving-versus-elapsed-time treatment where those affect eligibility or ranking.</li>
  <li>Explain how participants choose a category and whether changes are permitted after registration.</li>
</ul>
<h3>Proof and correction checklist</h3>
<ul>
  <li>Select at least one supported proof type for virtual participation.</li>
  <li>State whether the runner should use an activity screenshot, connected Strava activity, treadmill summary, or another expressly supported route.</li>
  <li>Name required fields: normally date, distance and unit, duration, activity type, and recognisable source, plus identity or route only when necessary.</li>
  <li>Define duplicate, wrong-activity, identity, distance, date, incomplete-metric, and unclear-proof treatment.</li>
  <li>Explain whether and when a rejected result can be corrected before the deadline.</li>
  <li>Treat OCR as fallible rather than as device verification. OCR can propose fields and surface signals; runners and reviewers still inspect the original evidence.</li>
</ul>
<p>Use <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a>, <a href="/blog/how-to-submit-run-proof-correctly-hellorun">the submission walkthrough</a>, and <a href="/blog/why-a-virtual-run-submission-may-be-rejected">the rejection guide</a> when writing proof mechanics.</p>
<h3>Pricing and external payment checklist</h3>
<ul>
  <li>Choose free or paid entry and confirm the displayed currency.</li>
  <li>Define category, package, add-on, and time-period pricing without overlapping or contradictory promises.</li>
  <li>For a paid event, upload the correct payment QR, name the payee, and write complete external transfer instructions.</li>
  <li>State what the fee includes, what it excludes, applicable delivery charges, refund and cancellation rules, and payment-review timing.</li>
  <li>Test the amount displayed for representative registration choices.</li>
  <li>Do not describe HelloRun as a direct or integrated payment gateway. The runner transfers using the organiser's external method, uploads a receipt, and waits for review.</li>
</ul>
<h3>Waiver, privacy, leaderboard, and recognition checklist</h3>
<ul>
  <li>Use a valid, event-appropriate waiver reviewed for the relevant jurisdiction and participant group.</li>
  <li>Confirm registration explains acceptance and the digital signature requirement.</li>
  <li>Collect only participant information that has a defined event purpose.</li>
  <li>Choose whether the leaderboard is enabled, what it ranks, which categories it separates, how names display, and whether flagged or pending entries are hidden.</li>
  <li>State that approved status and configured rules control official standings.</li>
  <li>Configure and preview any certificate or badge before promising it.</li>
  <li>Record physical reward quantity, eligibility, shipping area, address handling, supplier, fulfilment owner, expected date, and delay communication.</li>
</ul>
<p>Review the <a href="/privacy">Privacy Policy</a>, <a href="/organiser-terms">Organiser Terms</a>, and <a href="/refund-and-cancellation-policy">Refund and Cancellation Policy</a> alongside any organisation-specific terms.</p>

<h2>Stage 3: Before publishing</h2>
<p>The publish decision is a release review. Passing required fields is necessary, but a technically valid configuration can still be unclear or operationally unsupported.</p>
<h3>Readiness and consistency checklist</h3>
<ul>
  <li>Run the platform readiness review and resolve every required field.</li>
  <li>Confirm event title, type, participation modes, categories, dates, price, proof, waiver, and details agree across every section.</li>
  <li>Check paid-event QR and payee information using a second reviewer.</li>
  <li>Confirm accumulated challenges have a target, accepted activity types, proof, deadline, and recognition settings.</li>
  <li>Check that promised certificates, badges, merchandise, prizes, or shipping are actually configured and funded.</li>
  <li>Remove placeholder copy, test contact details, internal notes, unsupported claims, and expired links.</li>
</ul>
<h3>Runner-facing preview checklist</h3>
<ul>
  <li>Open the preview as though you know nothing about the event.</li>
  <li>Read the page on a phone and desktop without relying on organiser knowledge.</li>
  <li>Confirm the first screen makes format, date, fee, distance, and primary action understandable.</li>
  <li>Check every rule can be found in text, not only artwork.</li>
  <li>Verify images crop acceptably and alternative text communicates their purpose.</li>
  <li>Ask someone who did not configure the event to explain how to register, pay, complete, submit, correct, and receive recognition.</li>
</ul>
<h3>Accessibility and privacy checklist</h3>
<ul>
  <li>Use clear headings, labels, instructions, error explanations, and confirmation messages.</li>
  <li>Check keyboard navigation, zoom, contrast, focus visibility, and mobile touch targets in the available runner flow.</li>
  <li>Offer a monitored support route for participants who cannot use the default proof process.</li>
  <li>Review registration fields, payment instructions, proof requirements, exports, and public leaderboard fields for unnecessary personal data.</li>
  <li>Warn runners that route images can expose home, school, workplace, and routine information.</li>
  <li>Define access and retention for receipts, proof images, review notes, exports, and fulfilment files.</li>
</ul>
<h3>End-to-end test checklist</h3>
<ol>
  <li>Discover the preview or test event from a runner perspective.</li>
  <li>Complete a representative registration and confirm the selected category and amount.</li>
  <li>For paid entry, follow the exact external payment instructions and inspect the receipt-review state.</li>
  <li>Confirm a runner can identify when activity submission becomes eligible.</li>
  <li>Submit representative valid, unclear, wrong-date, and duplicate evidence in an appropriate test environment.</li>
  <li>Approve one result and reject one with an actionable reason.</li>
  <li>Verify the runner sees the correct status and correction action.</li>
  <li>Check approved results appear only in the intended standings.</li>
  <li>Preview promised certificate or badge output.</li>
  <li>Test support, policy, and organiser contact links.</li>
</ol>
<p>Delete or clearly mark test data according to the platform's test-data process. Never leave a fake participant, result, or payment record looking like a real public outcome.</p>

<h2>Stage 4: During registration</h2>
<p>Once registration opens, the event becomes an operating service. Monitor the actual questions and queue state instead of relying on launch copy.</p>
<h3>Daily or scheduled operations checklist</h3>
<ul>
  <li>Monitor registration count, category distribution, payment states, support messages, and capacity.</li>
  <li>Review paid-event receipts on the published schedule.</li>
  <li>Use specific payment rejection reasons and tell the runner what can be corrected.</li>
  <li>Keep payment evidence separate from run-result evidence.</li>
  <li>Confirm reminder recipients still need the action before sending a message.</li>
  <li>Record repeated questions that reveal unclear event copy, then improve the authoritative page rather than answering privately forever.</li>
</ul>
<h3>Communication checklist</h3>
<ul>
  <li>Send confirmation and reminder content that matches the current event record.</li>
  <li>Remind runners about registration close, activity start, accepted proof, final submission, and status checking at useful times.</li>
  <li>Do not create false urgency, invented participant counts, unsupported sponsor claims, or prize scarcity.</li>
  <li>Publish material changes through the promised channel and identify what changed, why, who is affected, and what remedy applies.</li>
  <li>Keep one current version of mechanics and avoid conflicting instructions across chat, email, poster, and event page.</li>
  <li>Track delivery or communication failures without treating an attempted email as guaranteed receipt.</li>
</ul>
<h3>Participant safety and support checklist</h3>
<ul>
  <li>Remind participants to choose conditions appropriate to their location and circumstances.</li>
  <li>Do not encourage deadline chasing, unsafe weather exposure, prohibited routes, or activity beyond an individual's capacity.</li>
  <li>Link to <a href="/blog/running-safety-tips-early-morning-night-runs">the low-light safety guide</a> when flexible schedules may involve darkness.</li>
  <li>Prepare one response for widespread weather, tracking, or platform issues rather than improvising different rules for individual runners.</li>
  <li>Route medical, safeguarding, privacy, and urgent safety matters to the responsible qualified contact rather than ordinary event support.</li>
</ul>

<h2>Stage 5: During the activity and submission window</h2>
<p>The busiest review period should execute rules already published. Do not invent new eligibility standards because a queue is large or an unusual submission appears.</p>
<h3>Submission guidance checklist</h3>
<ul>
  <li>Repeat the accepted activity types, date window, distance, proof method, required fields, and deadline.</li>
  <li>Tell runners to preserve the original completed activity and inspect screenshot privacy.</li>
  <li>Direct GPS interruptions to <a href="/blog/what-to-do-when-gps-tracking-stops-during-a-run">the GPS interruption guide</a>.</li>
  <li>Direct permitted indoor activities to <a href="/blog/how-to-record-a-treadmill-run-for-a-virtual-event">the treadmill recording guide</a>.</li>
  <li>For accumulated events, remind participants that each eligible activity is reviewed separately and only approved distance becomes official progress.</li>
  <li>Use <a href="/blog/how-accumulated-distance-challenges-work">the accumulated challenge guide</a> to explain pending, approved, rejected, and remaining distance.</li>
</ul>
<h3>Review-queue checklist</h3>
<ul>
  <li>Review regularly instead of waiting for the final deadline.</li>
  <li>Compare registration, event window, category, activity type, distance, duration, source, and proof under the published rubric.</li>
  <li>Treat OCR, name, distance, pace, duplicate, and other signals as review aids rather than automatic misconduct findings.</li>
  <li>Approve only evidence that satisfies the event rule.</li>
  <li>Choose the most specific rejection reason: unclear proof, wrong activity, identity mismatch, distance mismatch, date outside window, incomplete metrics, duplicate activity, or another explained issue.</li>
  <li>Add concise detail when a structured label alone does not tell the runner what to correct.</li>
  <li>Escalate ambiguous mechanics, system incidents, conflicts, and suspected manipulation without public accusation.</li>
  <li>Do not bulk-approve merely to reduce the queue.</li>
</ul>
<h3>Correction and contingency checklist</h3>
<ul>
  <li>Apply the published correction deadline consistently.</li>
  <li>Allow a clearer original when the problem is readability and the workflow permits replacement.</li>
  <li>Do not let metadata correction turn an ineligible activity into an eligible one.</li>
  <li>Do not ask runners to fabricate missing distance, route, identity, time, or date.</li>
  <li>Document platform interruption periods and use one remedy for similarly affected participants.</li>
  <li>Communicate revised review timing without silently extending activity eligibility.</li>
  <li>Keep pending and rejected evidence out of official completion and final standings unless the configured rules expressly define another visible provisional state.</li>
</ul>

<h2>Stage 6: Finalize and close the event</h2>
<p>An event is not finished when the activity window closes. Closeout resolves decisions, delivers promises, protects records, and captures what the team learned.</p>
<h3>Results checklist</h3>
<ul>
  <li>Resolve or formally account for every pending payment and result review.</li>
  <li>Complete eligible corrections and escalations before declaring results final.</li>
  <li>Check category filters, approval rules, ranking basis, tie handling, name display, and flagged-result treatment.</li>
  <li>Use <a href="/blog/how-leaderboards-work-virtual-running-events">the leaderboard guide</a> to distinguish provisional movement from final results.</li>
  <li>Publish only the participant information needed for the stated result.</li>
  <li>Provide a private route and reasonable cutoff for genuine result errors.</li>
</ul>
<h3>Recognition and fulfilment checklist</h3>
<ul>
  <li>Confirm every certificate or badge is linked to the intended approved eligibility state.</li>
  <li>For accumulated challenges, wait for the configured finalisation conditions and unresolved review queue where applicable.</li>
  <li>Reconcile prize, merchandise, medal, shirt, and shipping lists against eligible records.</li>
  <li>Restrict address and fulfilment files to authorised people and suppliers.</li>
  <li>Tell participants where to find digital recognition and when physical fulfilment is expected.</li>
  <li>Communicate delays with the confirmed item, reason, next update, and available remedy rather than disappearing after the event.</li>
</ul>
<h3>Data and team closeout checklist</h3>
<ul>
  <li>Remove or restrict temporary exports, downloaded receipts, proof copies, and supplier files according to the retention plan.</li>
  <li>Retain the minimum records required for legitimate event, accounting, dispute, or legal purposes.</li>
  <li>Review registration, paid confirmation, verified completion, rejection, correction, support, response-time, delivery, and feedback measures.</li>
  <li>Record unclear rules, repeated questions, queue bottlenecks, accessibility problems, supplier issues, and incidents.</li>
  <li>Assign unresolved refunds, delivery, privacy, or support obligations to an owner and due date.</li>
  <li>Archive the final mechanics, communications, decision log, and lessons for the next event.</li>
</ul>

<h2>First-time organizer master checklist</h2>
<ul>
  <li>Purpose, audience, success measure, and format are documented.</li>
  <li>Accountable owner, reviewers, support, communications, privacy, and backups are assigned.</li>
  <li>Budget, capacity, suppliers, risk, local duties, and contingencies are reviewed.</li>
  <li>Registration, activity, submission, review, results, and fulfilment dates use one named timezone.</li>
  <li>Categories, accepted activities, distance, timing, proof, correction, and duplicate rules are complete.</li>
  <li>Pricing, external payment, inclusions, refund, and delivery instructions agree.</li>
  <li>Waiver, privacy, accessibility, safeguarding, and contact paths are appropriate.</li>
  <li>Leaderboard, certificate, badge, prize, and reward promises are configured and tested.</li>
  <li>The complete runner journey has been tested on mobile and desktop.</li>
  <li>Registration, payment, result, correction, support, and escalation queues have owners.</li>
  <li>Reviewers use the same published rubric and actionable reasons.</li>
  <li>Final results, fulfilment, retention, unresolved obligations, and lessons are closed deliberately.</li>
</ul>
<p>For deeper planning context, read <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">How to Organize a Virtual Run</a>. Review the participant-facing <a href="/how-it-works">How HelloRun Works</a> page and <a href="/faq">FAQ</a> before finalising organiser instructions. Eligible accounts can use <a href="/organizer/create-event">Create Event</a> to start a draft.</p>

<h2>Frequently asked questions</h2>
<h3>How early should a first-time organiser start?</h3>
<p>Start early enough to resolve local duties, suppliers, mechanics, configuration, testing, and corrections before promotion. The exact lead time depends on scale and complexity; a checklist cannot replace a realistic schedule.</p>
<h3>Does HelloRun process registration payments?</h3>
<p>No. For a paid event, the organiser publishes an external payment method and runners upload receipts for review. HelloRun records instructions and review states rather than processing the transfer directly.</p>
<h3>Will HelloRun automatically approve every valid result?</h3>
<p>No. Some eligible clean evidence may satisfy current conditional approval criteria. Other results remain pending for organiser or administrator review, and every result still has to meet its event rules.</p>
<h3>Does OCR verify that a run really happened?</h3>
<p>No. OCR can extract candidate fields and surface inconsistencies from an image. It does not certify a device, route, distance, identity, or event eligibility.</p>
<h3>What does a waiver change?</h3>
<p>No. It records participant acknowledgement under the applicable process. It does not replace appropriate safety, legal, insurance, accessibility, safeguarding, or operational work.</p>
<h3>Should every virtual event have a leaderboard?</h3>
<p>No. Completion-only recognition may fit the purpose better. Ranking adds evidence, privacy, fairness, tie, dispute, and workload requirements.</p>
<h3>Are treadmills and screenshots universally accepted?</h3>
<p>No. The organiser must publish accepted activity and evidence rules. A supported upload control does not make every source eligible for every event.</p>
<h3>What does platform publication confirm?</h3>
<p>No. Publication means the event passed the applicable platform workflow. Organisers remain responsible for their own local duties, claims, suppliers, participants, and delivery.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.rrca.org/education/event-directors/safe-event-guidelines/">Road Runners Club of America: Safe Event Guidelines</a></li>
  <li><a href="https://www.rrca.org/programs/race-director-certification/race-director-code-of-ethics/">Road Runners Club of America: Race Director Code of Ethics</a></li>
  <li><a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/">Information Commissioner's Office: Data Minimisation</a></li>
  <li><a href="https://www.w3.org/WAI/tutorials/forms/">W3C Web Accessibility Initiative: Forms Tutorial</a></li>
  <li><a href="/how-it-works">How HelloRun Works</a></li>
  <li><a href="/faq">HelloRun FAQ</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
  <li><a href="/organiser-terms">HelloRun Organiser Terms</a></li>
</ul>
<p>Platform interfaces, settings, and policies can change. Recheck the live organiser form, runner-facing preview, event page, and applicable policies before relying on a checklist item.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'How to use this checklist',
  'How this checklist was prepared',
  'Stage 1: Before creating the event',
  'Stage 2: Configure the event in HelloRun',
  'Stage 3: Before publishing',
  'Stage 4: During registration',
  'Stage 5: During the activity and submission window',
  'Stage 6: Finalize and close the event',
  'First-time organizer master checklist',
  'Frequently asked questions',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/organizer/create-event',
  '/how-it-works',
  '/faq',
  '/organiser-terms',
  '/privacy',
  '/refund-and-cancellation-policy',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/why-a-virtual-run-submission-may-be-rejected',
  '/blog/what-to-do-when-gps-tracking-stops-during-a-run',
  '/blog/how-to-record-a-treadmill-run-for-a-virtual-event',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/how-leaderboards-work-virtual-running-events',
  '/blog/running-safety-tips-early-morning-night-runs',
  'rrca.org/education/event-directors/safe-event-guidelines',
  'rrca.org/programs/race-director-certification/race-director-code-of-ethics',
  'ico.org.uk/for-organisations',
  'w3.org/WAI/tutorials/forms'
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
  const text = String(payload.contentText || '');
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (ARTICLE.slug !== CANONICAL_SLUG) errors.push('canonical slug does not match');
  if (!payload.title || payload.title.length > 120) errors.push('title must be 1-120 characters');
  if (!payload.excerpt || payload.excerpt.length > 220) errors.push('excerpt must be 1-220 characters');
  if (!payload.contentHtml || payload.contentHtml.length > 50000) errors.push('contentHtml must be 1-50000 characters');
  if (!payload.contentText || payload.contentText.length > 50000) errors.push('contentText must be 1-50000 characters');
  if (payload.contentRaw !== payload.contentText) errors.push('contentRaw and contentText must match');
  if (wordCount < 3000) errors.push('article must contain at least 3000 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('existing cover image is required for ogImageUrl');
  if (/<h[12]>Virtual Run Checklist for First-Time Organizers<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/HelloRun (?:provides|supports|includes|is) (?:an? )?(?:integrated|direct) payment gateway/i.test(text)) errors.push('article must not claim direct payment processing');
  if (/(?:HelloRun|OCR|publication).{0,35}(?:guarantees?|always guarantees?) (?:approval|attendance|success|compliance)/i.test(text)) errors.push('article must not guarantee approval, attendance, success, or compliance');
  if (/OCR (?:is|provides) (?:perfect|infallible|proof of accuracy)/i.test(text)) errors.push('article must not claim perfect OCR');
  if (/(?:every|all) (?:virtual )?events?.{0,35}(?:accept|allow).{0,25}(?:screenshots?|treadmills?|all proof)/i.test(text)) errors.push('article must not claim universal evidence acceptance');
  if (/(?:publishing|publication|platform publication).{0,30}(?:makes?|means?|guarantees?) (?:the )?event (?:is )?(?:legal|legally compliant|compliant)/i.test(text)) errors.push('article must not claim automatic legal compliance');
  if (/waiver (?:removes?|eliminates?|waives?) (?:all )?(?:organiser|organizer) (?:responsibility|duties|liability)/i.test(text)) errors.push('article must not absolve organisers through waivers');
  if (!/not legal, tax, insurance, medical, financial, accessibility-certification, or safeguarding advice/i.test(text)) errors.push('article must include advice limitations');
  if (!/HelloRun currently uses Asia\/Manila for platform day-level activity alignment/i.test(text)) errors.push('article must state current platform date alignment');
  if (!/Do not describe HelloRun as a direct or integrated payment gateway/i.test(text)) errors.push('article must explain external payment handling');
  if (!/OCR can propose fields and surface signals/i.test(text)) errors.push('article must explain OCR limitations');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid first-time-organizer checklist payload: ${errors.join('; ')}`);
  return true;
}

module.exports = {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
};
