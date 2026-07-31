'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-schools-and-organizations-can-use-virtual-runs';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How Schools and Organizations Can Use Virtual Runs',
  excerpt: 'Learn how schools, workplaces, clubs, nonprofits, and community groups can design a virtual run around participation, fundraising, wellbeing, or shared goals.',
  category: 'Organizer Guide',
  tags: Object.freeze([
    'school virtual run',
    'organization event',
    'community challenge',
    'fundraising run',
    'employee wellbeing',
    'student participation',
    'group event planning',
    'virtual run program'
  ]),
  seoTitle: 'How Schools and Organizations Can Use Virtual Runs | HelloRun',
  seoDescription: 'A practical guide for schools, workplaces, nonprofits, clubs, and community groups using virtual runs for participation, wellbeing, fundraising, and engagement.',
  coverImageAlt: 'School and community organizers planning a virtual run around a laptop with abstract event cards, running shoes, and reusable water bottles'
});

const RAW_CONTENT_HTML = `
<p>A virtual run can give a school, workplace, club, nonprofit, alumni association, or community group a shared activity without requiring every participant to reach one start line at one time. People can complete an eligible run or walk in their own location during a published window, then submit the evidence required by the organiser.</p>
<p>That flexibility is useful, but it is not the purpose by itself. A successful group programme begins with a specific outcome: encourage consistent movement, connect a distributed community, support a cause, celebrate a milestone, or offer an inclusive participation option alongside another event. The format, rules, data, communications, and recognition should all serve that outcome.</p>
<blockquote><strong>Useful principle:</strong> design the smallest virtual-run programme that can deliver the organisation's stated purpose responsibly. More categories, rankings, data, rewards, and proof requirements create more work and are not automatically more engaging.</blockquote>

<h2>What a virtual run can do for a group</h2>
<p>A virtual run separates the shared programme from a single course and clock. An organiser publishes the event window and mechanics. Participants choose an appropriate place and time, complete an accepted activity, and follow the stated submission process. HelloRun can structure event information, registration, external-payment instructions, evidence submission, review states, leaderboards, certificates, badges, and organiser exports. The organisation remains responsible for the programme it creates around those tools.</p>
<p>This distinction matters. Platform configuration does not approve a school activity, establish a lawful fundraising arrangement, insure an event, assess a participant's health, supervise a child, secure a route, or guarantee turnout. A waiver does not eliminate organiser or institutional duties. Local leadership should involve the people responsible for legal, finance, privacy, accessibility, safety, insurance, safeguarding, and communications decisions before publication.</p>
<p>The World Health Organization describes physical activity as beneficial across age groups and recommends that children and adolescents average at least 60 minutes per day of moderate-to-vigorous activity across the week. That recommendation is useful context, not an event prescription. A school should not turn a population guideline into a mandatory distance or individual medical target. Offer age-appropriate choices and direct participants to qualified advice when personal circumstances require it.</p>

<h2>Six practical ways to use a virtual run</h2>
<h3>1. A school participation or house challenge</h3>
<p>A school can use a completion-focused event to invite students, staff, families, and alumni to move during a defined week or month. Categories might reflect appropriate distances or participation groups, but the public mechanics should avoid exposing class lists, ages, locations, or unnecessary student details. For younger participants, guardian involvement, institutional approval, adult supervision, safeguarding routes, and age-appropriate communications need explicit owners.</p>
<p>Competition is optional. A school may recognise completion, collective distance, consistency, or house participation without publishing an individual fastest-time table. If a leaderboard is enabled, HelloRun supports visibility and name-display settings, but the school must decide whether public ranking is appropriate. A pseudonymous or registered-only display can reduce exposure; it does not by itself satisfy every privacy or safeguarding duty.</p>

<h3>2. An employee wellbeing programme</h3>
<p>A distributed workplace can offer a flexible activity window across shifts and locations. A completion-only model usually fits wellbeing better than a fastest-time contest. Include walking where appropriate, allow reasonable schedules, and make participation genuinely voluntary. Do not ask managers to infer health, disability, commitment, performance, or productivity from registration or activity data.</p>
<p>Separate event operations from employment decisions. Limit export access, explain what coworkers can see, and do not publish routes that could reveal home addresses or routines. If teams are used for friendly participation, design them so remote staff, beginners, disabled participants, and people with care responsibilities are not treated as lesser contributors.</p>

<h3>3. A nonprofit awareness or fundraising campaign</h3>
<p>A virtual run can connect supporters to a cause and extend participation beyond one locality. The campaign should state what the fee or donation is, who receives it, what costs are deducted, whether a contribution is tax-deductible, and what happens if the event changes. Do not imply that a registration fee reaches a beneficiary in full unless the financial arrangement proves that claim.</p>
<p>HelloRun does not directly process registration payments. For a paid event, the organiser provides an external transfer method and runners upload receipts for review. The nonprofit or partner organisation remains responsible for the collection method, authority to fundraise, accounting, receipts, refund position, beneficiary agreement, and transparent reporting. The RRCA Race Director Code of Ethics provides useful context by emphasizing honest communication and open financial transactions.</p>

<h3>4. A club, association, or membership challenge</h3>
<p>A club can use an accumulated-distance challenge to encourage regular activity across several weeks. HelloRun can record separate eligible activities against a configured target, display approved progress, and support completion recognition or optional distance ranking. Read <a href="/blog/how-accumulated-distance-challenges-work">how accumulated-distance challenges work</a> before choosing this model.</p>
<p>The club must define accepted activities, minimum activity distance where applicable, date window, target, proof, correction deadline, and treatment of overshoot. It should also decide whether the event is a member benefit, a public recruitment activity, or both. Do not present pending or rejected distance as official progress, and do not use a group total without explaining which approved records contribute to it.</p>

<h3>5. An alumni or community connection event</h3>
<p>Alumni groups, neighbourhood associations, professional networks, and civic organisations can use a virtual run to create a shared moment across locations. Participants can choose familiar routes while the organisation uses one event page for mechanics and updates. Digital certificates or badges can offer lightweight recognition when configured, but they should not be promised until the templates and eligibility conditions have been tested.</p>
<p>Community reach also creates privacy and safety questions. A route screenshot can expose a home, school, workplace, or regular schedule. Tell participants to review screenshots before uploading and offer a support route when the standard evidence would reveal sensitive information. Flexible participation should never be framed as permission to enter restricted property, use unsafe roads, or continue in dangerous conditions.</p>

<h3>6. A milestone, service, or hybrid programme</h3>
<p>An institution may connect a virtual run to an anniversary, service campaign, conference, reunion, or onsite event. Clearly distinguish virtual and onsite participation. The virtual evidence workflow does not manage course permits, traffic, medical coverage, venue access, volunteers, or other onsite controls. A hybrid event needs both sets of operations.</p>
<p>A service-learning programme can pair movement with reflection or community action, but run proof should not become proof of learning or service unless the organisation has designed a valid separate assessment. Likewise, a certificate confirms the configured event outcome; it does not certify fitness, academic credit, professional development, charitable impact, or attendance beyond the approved record.</p>

<h2>Choose the participation model before the technology</h2>
<p>Begin with a one-page brief that names the audience, purpose, accountable owner, dates, completion definition, support route, and success measures. Then choose a format that matches it.</p>
<h3>Single activity or accumulated distance</h3>
<p>A single-activity event asks a participant to complete the required distance in one eligible record. It creates a simpler story and usually a smaller review queue. An accumulated event allows several approved activities to build toward a target. It can support consistency but produces more submissions, more corrections, and more review work.</p>
<p>Choose a distance that fits the audience rather than one that looks impressive in promotion. The <a href="/blog/how-to-choose-between-running-distances">distance-choice guide</a> explains how 5K, 10K, half-marathon, and accumulated formats differ. For a mixed school or community audience, several appropriate categories or a completion-based accumulated target may work better than one demanding distance.</p>

<h3>Completion, collective progress, or ranking</h3>
<p>Completion recognises participants who satisfy the published rule. Collective progress combines eligible contributions toward a shared narrative. Ranking orders approved results under configured rules. These are different experiences.</p>
<p>A leaderboard can motivate some communities and discourage others. If enabled, define its ranking basis, categories, name display, visibility, pending-result treatment, and finalisation point. HelloRun leaderboards use approved or otherwise eligible records under their configured settings; they do not establish that a competitive model is appropriate for a school, workplace, or vulnerable group. See <a href="/blog/how-leaderboards-work-virtual-running-events">How Leaderboards Work in Virtual Running Events</a>.</p>

<h3>Free entry, paid entry, or fundraising</h3>
<p>A free event still has staff, review, communication, platform, recognition, and privacy costs. A paid event adds external payment instructions, receipt review, pricing, refunds, accounting, and fulfilment. A fundraising event adds authority, beneficiary, reporting, and claims that should be reviewed locally.</p>
<p>Keep these concepts separate in public copy. A fee may cover participation costs. A donation may support a beneficiary. A merchandise package may have a price. Do not combine them into one vague “support the cause” amount. Explain inclusions, delivery fees, cutoffs, transfer instructions, receipt-review timing, and the <a href="/refund-and-cancellation-policy">refund and cancellation policy</a>.</p>

<h2>Design for minors, privacy, and accessibility</h2>
<h3>Safeguarding is an organisational responsibility</h3>
<p>If minors may participate, use the institution's approved safeguarding process. Name the safeguarding lead, confirm guardian consent or another appropriate lawful basis, define adult supervision, publish age-appropriate contact routes, and plan escalation for a disclosure or concern. Avoid one-to-one informal messaging between event volunteers and children. Do not collect or display a child's precise route, school schedule, personal contact details, or full identity merely because a form can accept them.</p>
<p>HelloRun configuration does not replace local child-protection duties or institutional approval. The platform does not guarantee guardian authority, supervision, or suitability of a route. For very young participants or contexts where individual accounts and uploads are inappropriate, the organisation should decide with qualified advisers whether a different programme or controlled adult-managed process is needed.</p>

<h3>Collect the minimum useful data</h3>
<p>The ICO's children's data-minimisation guidance says organisations should collect and retain only the minimum personal data needed for the element of a service a child actively uses. Apply the same discipline across the programme: identify a purpose for each registration field, receipt, proof image, leaderboard column, export, delivery address, and support note.</p>
<ul>
  <li>Do not collect a delivery address when there is no physical delivery.</li>
  <li>Do not require a public full name merely to recognise completion.</li>
  <li>Do not ask for a route map when date, distance, duration, activity type, and source are sufficient.</li>
  <li>Restrict exported files to authorised staff and approved suppliers.</li>
  <li>Set retention and deletion decisions before data accumulates.</li>
  <li>Explain when evidence or names may appear to reviewers or on a leaderboard.</li>
</ul>
<p>Review HelloRun's <a href="/privacy">Privacy Policy</a>, <a href="/organiser-terms">Organiser Terms</a>, and the organisation's own notices. A platform policy does not replace the institution's explanation of its own purposes and responsibilities.</p>

<h3>Make the participant journey understandable</h3>
<p>The W3C Web Accessibility Initiative forms tutorial recommends clear labels, instructions, validation, and feedback. Test the event page and registration journey on mobile and desktop, with keyboard navigation and zoom where applicable. Put essential mechanics in text rather than only in a poster. Use plain language, meaningful headings, sufficient contrast, descriptive links, and a monitored alternative support route.</p>
<p>Accessibility also affects the event rules. Consider walking, assistive participation, treadmill use, flexible timing, technology access, language, and evidence alternatives without assuming one accommodation suits everyone. Publish the supported options that the organisation can review consistently. A virtual format is not automatically accessible, inclusive, or equitable.</p>

<h2>Build the event in HelloRun</h2>
<p>An approved organiser can start a draft through <a href="/organizer/create-event">Create Event</a>. Use the <a href="/blog/virtual-run-checklist-for-first-time-organizers">first-time organizer checklist</a> for the complete stage-based process and the <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">organizer playbook</a> for deeper operational context.</p>
<h3>Configure identity, dates, and categories</h3>
<ul>
  <li>Use only names, logos, partners, causes, and photographs the organiser is authorised to publish.</li>
  <li>State the group purpose without promising health, academic, fundraising, attendance, or community outcomes.</li>
  <li>Set registration, activity, and submission dates in a clear sequence.</li>
  <li>Name the controlling timezone. HelloRun currently uses Asia/Manila for platform day-level activity alignment.</li>
  <li>Create categories that participants can understand without exposing protected attributes unnecessarily.</li>
  <li>Set realistic capacity based on support, payment review, submission review, and fulfilment resources.</li>
</ul>

<h3>Configure activity and evidence rules</h3>
<p>State whether Run, Walk, Hike, Trail Run, treadmill, or another supported activity is accepted. Virtual does not mean every activity type or proof source is accepted. For standard results, explain the required one-activity distance. For accumulated challenges, configure the target, minimum activity where applicable, accepted types, deadline, and recognition mode.</p>
<p>Define the evidence needed to establish date, distance and unit, duration, activity type, and recognisable source. Use <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> and <a href="/blog/how-to-submit-run-proof-correctly-hellorun">How to Submit Run Proof Correctly</a> in participant instructions.</p>
<p>OCR is fallible. It may propose fields or surface inconsistencies, but it does not verify a device, identity, route, distance, or eligibility and it does not guarantee approval. Reviewers still assess the original evidence under the event rules. If a result is unclear or ineligible, use a specific reason and an available correction path; the <a href="/blog/why-a-virtual-run-submission-may-be-rejected">submission-rejection guide</a> explains the distinction between waiting, manual review, and rejection.</p>

<h3>Configure payment, waiver, recognition, and results</h3>
<ul>
  <li>For free entry, confirm no paid inclusions or transfer instructions remain in the copy.</li>
  <li>For paid entry, publish the external payment QR or instructions, payee name, amount logic, receipt process, and review timing.</li>
  <li>Use an event-appropriate waiver reviewed for the audience and jurisdiction; never claim that it eliminates organisational responsibility.</li>
  <li>Choose a leaderboard only when ranking serves the programme and its privacy settings are appropriate.</li>
  <li>Configure certificates, badges, or physical rewards before promising them.</li>
  <li>Explain whether recognition depends on registration, approved completion, category, accumulated target, or another supported state.</li>
</ul>
<p>HelloRun records payment instructions and receipt-review states; it is not a direct or integrated payment gateway. Transfers occur through the organiser's external method. The organisation remains responsible for money handling, reconciliation, refunds, fundraising compliance, suppliers, and fulfilment.</p>

<h2>Operate the program fairly</h2>
<h3>Before launch</h3>
<p>Preview the page as a participant who has no inside knowledge. Ask a second person to describe who can join, what it costs, what activity counts, when it must happen, how to submit, what becomes public, how corrections work, and what recognition is offered. Complete an end-to-end test registration and representative proof review before promotion.</p>
<p>Give payment review, participant support, result review, privacy, safeguarding, communication, and fulfilment to named owners with backups. Define response targets and escalation routes. Publish one authoritative mechanics page rather than allowing posters, group chats, and email threads to drift into different rules.</p>

<h3>During registration and activity</h3>
<p>Monitor queues and repeated questions. Remind only people who still need the relevant action. Communicate changes with the old rule, new rule, reason, affected participants, and remedy. Do not invent participant counts, urgency, sponsor relationships, charitable impact, or reward scarcity.</p>
<p>Keep safety messages practical. Participants should choose a lawful route, suitable time, appropriate conditions, and activity within their circumstances. They should not chase a deadline through dangerous weather, darkness, illness, injury, or an unsafe location. Link to <a href="/blog/running-safety-tips-early-morning-night-runs">the runner safety guide</a>. If GPS stops, use <a href="/blog/what-to-do-when-gps-tracking-stops-during-a-run">the GPS troubleshooting guide</a>; if treadmills are permitted, use <a href="/blog/how-to-record-a-treadmill-run-for-a-virtual-event">the treadmill evidence guide</a>.</p>

<h3>During proof review</h3>
<p>Use the published rubric consistently. A review signal is not a finding of misconduct. Compare registration, date window, category, activity type, distance, duration, identity where necessary, source, and duplicate history. Approve qualifying evidence, leave unresolved evidence pending when review is incomplete, and reject with a specific correction reason when it does not meet the rule.</p>
<p>Do not create exceptions privately for influential participants, donors, managers, teachers, organisers, or prize contenders. Record material interpretations and conflicts of interest. When a system incident affects several people, use one documented remedy for similarly situated participants rather than improvising individual favors.</p>

<h3>At closeout</h3>
<p>Resolve pending payments and results before calling standings final. Complete permitted corrections by the published cutoff. Verify categories, name display, ranking basis, ties, and approved-result inclusion. Issue only configured recognition to eligible records, reconcile physical fulfilment, and provide a route for genuine errors.</p>
<p>Protect exports after the event. Remove temporary copies and supplier files according to the retention plan. Record participation, completion, review workload, support themes, accessibility barriers, safety or safeguarding incidents, financial reconciliation, delivery status, and participant feedback. Do not retain data indefinitely merely because it may be useful someday.</p>

<h2>Measure the outcome you actually chose</h2>
<p>Registration count is not the only measure and may not be the most useful one. Select a small set before launch:</p>
<ul>
  <li><strong>Participation:</strong> eligible registrations, confirmed paid registrations where applicable, starters, and approved finishers.</li>
  <li><strong>Consistency:</strong> approved activity frequency or accumulated completion, when that was the stated model.</li>
  <li><strong>Access:</strong> support requests, accommodation use, mobile friction, incomplete registrations, and common evidence barriers.</li>
  <li><strong>Operations:</strong> payment-review time, proof-review time, correction rate, unresolved queue, and fulfilment status.</li>
  <li><strong>Community:</strong> voluntary feedback, repeat interest, or group participation without exposing individual health or performance.</li>
  <li><strong>Fundraising:</strong> gross amount, costs, net amount, beneficiary transfer, timing, and the exact basis used for public claims.</li>
</ul>
<p>Do not claim that the virtual run caused improved fitness, attendance, morale, learning, productivity, retention, fundraising impact, or community cohesion unless the organisation has a suitable evaluation design and evidence. A high registration count does not prove completion, and approved completion does not prove a health or organisational outcome.</p>

<h2>A practical launch blueprint</h2>
<ol>
  <li><strong>Define:</strong> write the purpose, audience, completion model, success measures, and non-goals.</li>
  <li><strong>Approve:</strong> obtain the required institutional, finance, legal, privacy, accessibility, insurance, safety, and safeguarding reviews.</li>
  <li><strong>Own:</strong> name accountable staff for configuration, payments, support, proof, communications, escalation, and closeout.</li>
  <li><strong>Configure:</strong> build dates, categories, completion, activity, proof, price, waiver, leaderboard, and recognition in a draft.</li>
  <li><strong>Explain:</strong> publish complete mechanics, data use, external payment, correction, safety, support, and fulfilment information.</li>
  <li><strong>Test:</strong> complete registration, receipt review, evidence submission, rejection, correction, approval, leaderboard, and recognition paths.</li>
  <li><strong>Launch:</strong> promote only the approved claims and keep one authoritative event page.</li>
  <li><strong>Operate:</strong> monitor queues, communicate consistently, protect participants, and record material decisions.</li>
  <li><strong>Close:</strong> finalise results, deliver configured recognition, reconcile funds and fulfilment, protect data, and document lessons.</li>
</ol>
<p>Before starting, review <a href="/how-it-works">How HelloRun Works</a>, the <a href="/faq">FAQ</a>, and current events in <a href="/events">event discovery</a>. Use <a href="/contact">Contact</a> for platform questions. Those resources explain the service; the organisation must still decide whether its proposed programme is appropriate and authorised.</p>

<h2>Frequently asked questions</h2>
<h3>Can a school require every student to join?</h3>
<p>HelloRun does not decide that. The school must assess authority, curriculum or employment context, accessibility, health, consent, safeguarding, alternatives, and local requirements. A public event tool is not evidence that mandatory participation is appropriate.</p>
<h3>Can parents or teachers submit for children?</h3>
<p>The organisation should establish an approved, age-appropriate account and consent process before launch. Do not assume that any adult has authority to create an account, accept terms, disclose a route, or submit a child's information.</p>
<h3>Does HelloRun collect donations for the organization?</h3>
<p>No. HelloRun does not directly process registration fees or donations. A paid organiser supplies an external payment route and reviews uploaded receipts. Fundraising authority, accounting, tax treatment, beneficiary reporting, and refunds remain outside that transfer workflow.</p>
<h3>Does a virtual format remove safety and insurance work?</h3>
<p>No. It changes the activity model but does not eliminate organisational duties. RRCA's Safe Event Guidelines describe risk management as a race-director responsibility and warn that general guidance is not an all-inclusive local plan.</p>
<h3>Is OCR proof that an activity is valid?</h3>
<p>No. OCR is fallible and only assists extraction or review. Approval depends on readable original evidence and the event's published rules.</p>
<h3>Should a school or workplace use fastest-time rankings?</h3>
<p>Only if ranking genuinely fits the purpose and the organisation can address fairness, privacy, eligibility, evidence, ties, disputes, and accessibility. Completion-only recognition is often the clearer choice.</p>
<h3>Will a virtual run guarantee engagement or wellbeing?</h3>
<p>No. Participation and outcomes depend on the programme, audience, access, communications, and many external factors. Avoid guaranteed attendance, health, fundraising, academic, or workplace claims.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.who.int/europe/news-room/fact-sheets/item/physical-activity">World Health Organization: Physical Activity</a></li>
  <li><a href="https://www.rrca.org/education/event-directors/safe-event-guidelines/">Road Runners Club of America: Safe Event Guidelines</a></li>
  <li><a href="https://www.rrca.org/programs/race-director-certification/race-director-code-of-ethics/">Road Runners Club of America: Race Director Code of Ethics</a></li>
  <li><a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/8-data-minimisation/">Information Commissioner's Office: Children's Data Minimisation</a></li>
  <li><a href="https://www.w3.org/WAI/tutorials/forms/">W3C Web Accessibility Initiative: Forms Tutorial</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
  <li><a href="/organiser-terms">HelloRun Organiser Terms</a></li>
  <li><a href="/refund-and-cancellation-policy">HelloRun Refund and Cancellation Policy</a></li>
</ul>
<p>This guide documents HelloRun's current methodology in July 2026 and provides general planning information, not legal, medical, educational, employment, tax, insurance, accessibility-certification, fundraising, or safeguarding advice. Platform features and external requirements can change. Recheck the live organiser workflow and obtain appropriate local guidance before publication.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'What a virtual run can do for a group',
  'Six practical ways to use a virtual run',
  'Choose the participation model before the technology',
  'Design for minors, privacy, and accessibility',
  'Build the event in HelloRun',
  'Operate the program fairly',
  'Measure the outcome you actually chose',
  'A practical launch blueprint',
  'Frequently asked questions',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/organizer/create-event',
  '/events',
  '/how-it-works',
  '/faq',
  '/contact',
  '/privacy',
  '/organiser-terms',
  '/refund-and-cancellation-policy',
  '/blog/virtual-run-checklist-for-first-time-organizers',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  '/blog/how-to-choose-between-running-distances',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/why-a-virtual-run-submission-may-be-rejected',
  '/blog/what-to-do-when-gps-tracking-stops-during-a-run',
  '/blog/how-to-record-a-treadmill-run-for-a-virtual-event',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/how-leaderboards-work-virtual-running-events',
  '/blog/running-safety-tips-early-morning-night-runs',
  'who.int/europe/news-room/fact-sheets/item/physical-activity',
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
  if (/<h[12]>How Schools and Organizations Can Use Virtual Runs<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/HelloRun (?:collects|processes|handles) (?:registration )?(?:payments?|donations?)/i.test(text)) errors.push('article must not claim direct payment or donation processing');
  if (/(?:^|[.!?]\s)(?:HelloRun|A virtual run|Platform publication) guarantees? (?:attendance|engagement|wellbeing|health|fundraising|success|compliance)/i.test(text)) errors.push('article must not guarantee participation or organizational outcomes');
  if (/OCR (?:is|provides) (?:perfect|infallible|proof|verification)/i.test(text)) errors.push('article must not treat OCR as proof or perfect verification');
  if (/(?:all|every) (?:schools?|organizations?|organisations?|events?).{0,40}(?:may|can|should) (?:require|publish|collect).{0,30}(?:student|employee|participant)/i.test(text)) errors.push('article must not universalize institutional authority');
  if (/waiver (?:removes?|eliminates?|waives?) (?:all )?(?:school|organization|organisation|organizer|organiser) (?:responsibility|duties|liability)/i.test(text)) errors.push('article must not absolve institutions through waivers');
  if (/(?:platform|HelloRun) configuration (?:ensures?|guarantees?|creates?) (?:legal|safety|privacy|accessibility|safeguarding) compliance/i.test(text)) errors.push('article must not claim automatic institutional compliance');
  if (!/HelloRun does not directly process registration payments/i.test(text)) errors.push('article must explain external payment handling');
  if (!/OCR is fallible/i.test(text)) errors.push('article must explain OCR limitations');
  if (!/HelloRun currently uses Asia\/Manila for platform day-level activity alignment/i.test(text)) errors.push('article must state current platform date alignment');
  if (!/not legal, medical, educational, employment, tax, insurance, accessibility-certification, fundraising, or safeguarding advice/i.test(text)) errors.push('article must include advice limitations');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid schools-and-organizations guide payload: ${errors.join('; ')}`);
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
