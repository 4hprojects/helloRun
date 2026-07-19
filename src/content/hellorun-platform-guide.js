'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'hellorun-a-smarter-way-to-manage-running-events';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'HelloRun: A Smarter Way to Manage Running Events',
  excerpt: 'See how HelloRun connects event setup, registration, external payment-receipt review, activity proof, reviewed results, leaderboards, certificates, and organiser operations.',
  category: 'Organizer Guide',
  tags: Object.freeze([
    'running event management',
    'event organizer',
    'event registration',
    'payment review',
    'result review',
    'virtual events',
    'onsite events',
    'hybrid events'
  ]),
  seoTitle: 'HelloRun: Running Event Management Platform Guide',
  seoDescription: 'See how HelloRun supports virtual, onsite, and hybrid running events with structured registration, receipt and result review, leaderboards, certificates, and organiser tools.',
  coverImageAlt: 'HelloRun organiser dashboard connecting event setup, participant registration, payment and result review, leaderboards, and certificates'
});

const RAW_CONTENT_HTML = `
<p>A running event is not one form and one finish line. It is a chain of decisions: who may join, which dates apply, what a fee includes, how payments are confirmed, what counts as a result, who reviews disputes, and when recognition becomes final. When those decisions live across forms, chats, folders, and spreadsheets, participants can see different versions of the same event.</p>
<p>HelloRun is a web platform that connects those stages for virtual, onsite, and hybrid running events. It gives organisers structured event setup, registration records, review queues, approved results, and configured recognition while giving runners one place to follow their event journey.</p>
<blockquote><strong>The useful distinction:</strong> HelloRun organises the workflow and its records. It does not replace the organiser, payment provider, timing company, local authority, medical team, courier, or the individual event rules.</blockquote>

<h2>HelloRun in one minute</h2>
<ol>
  <li>An aspiring organiser creates an account and completes the organiser application process.</li>
  <li>An approved organiser drafts an event, defines its format, dates, registration choices, prices, rules, proof, visibility, and recognition.</li>
  <li>The organiser previews the runner-facing page and addresses readiness or consistency issues before publication.</li>
  <li>Runners find the published event, review its organiser and mechanics, and register for an available mode and category.</li>
  <li>Free registrations proceed without a payment receipt. Paid registrations follow the organiser's external payment instructions and enter a receipt-review workflow.</li>
  <li>Virtual runners submit an eligible screenshot or connected Strava activity. Onsite organisers can maintain registration, bib, check-in, and result records.</li>
  <li>Eligible result submissions are approved conditionally or reviewed by an authorised organiser or administrator.</li>
  <li>Approved results can feed an event's configured standings, progress, badges, or certificates.</li>
  <li>Organisers use queues, summaries, exports, and audit history to close out the event and answer participant questions.</li>
</ol>
<p>Every feature is subject to the event's setup and the runner's eligibility. A platform account or public event page does not itself guarantee entry, approval, ranking, a reward, or delivery.</p>

<h2>How this platform guide was prepared</h2>
<p>This guide documents the HelloRun implementation available in July 2026. It was checked against the organiser application, event creation and preview, publication, registration pricing, payment-receipt review, activity submission, OCR and Strava validation, leaderboard, certificate, dashboard, registrant export, event audit, and onsite-operation code. It is not based on personal testing and is not an independent usability, security, timing-accuracy, or competitor audit.</p>
<p>The evaluation also uses official event-safety, race-director ethics, accessibility, data-minimisation, course-certification, and people-first publishing guidance. Those sources give context; they do not certify HelloRun or an event listed on it. Product behavior, policies, and event configurations can change, so the live interface and published event record remain authoritative.</p>

<h2>The operational problem HelloRun addresses</h2>
<p>Small teams often begin with tools they already know. A form collects names, a spreadsheet tracks payment, a chat inbox receives receipts, another folder stores screenshots, and a designer creates certificates. That can work at limited scale, but the records do not automatically share one status or source of truth.</p>
<p>A runner may pay but remain marked unpaid because the receipt is in a different inbox. A reviewer may approve a screenshot while the spreadsheet still says pending. A leaderboard may be copied before a correction. A courier may receive an outdated address. None of these outcomes is inevitable, and software alone cannot prevent them, but a connected record reduces the number of manual handoffs the team must reconcile.</p>
<p>HelloRun links a registration to its event, pricing snapshot, payment state, submission, review decision, and recognition. That does not promise fewer hours or zero errors. It gives the team defined states and a traceable place to perform the work.</p>
<p>This article explains that platform layer. The dedicated <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">virtual-run organiser playbook</a> covers the broader planning work: purpose, staffing, rules, deadlines, support, disputes, and closeout.</p>

<h2>Capability matrix: supported, configured, and outside the platform</h2>
<h3>Currently supported workflow</h3>
<ul>
  <li>Organiser application and status review.</li>
  <li>Event draft, clone, preview, readiness checks, publication workflow, and public detail page.</li>
  <li>Virtual, onsite, and hybrid participation configuration.</li>
  <li>Structured dates, modes, categories, registration options, packages, pricing snapshots, waivers, and profile snapshots.</li>
  <li>External payment instructions with uploaded receipt and organiser review states.</li>
  <li>Screenshot and connected-Strava virtual result paths with OCR-assisted entry and validation.</li>
  <li>Organiser or administrator result review, corrections, queues, and critical audit history.</li>
  <li>Race-result and accumulated-distance standings based on approved records.</li>
  <li>Organiser dashboard summaries and registrant CSV or XLSX export.</li>
  <li>Onsite records for bib assignment, check-in, result import, and result approval.</li>
</ul>
<h3>Available only when the event configures or qualifies for it</h3>
<ul>
  <li>Paid registration, pricing periods, packages, physical rewards, pickup, or delivery fields.</li>
  <li>Automatic publication or approval pathways that meet current eligibility rules.</li>
  <li>Public leaderboards, badges, certificate templates, and runner recognition.</li>
  <li>Accumulated-distance goals, minimum activity rules, and pending-progress presentation.</li>
  <li>Onsite or hybrid operational fields and imported results.</li>
</ul>
<h3>Responsibilities outside HelloRun</h3>
<ul>
  <li>Event purpose, truthful promotion, staffing, financial viability, contracts, tax, insurance, and legal review.</li>
  <li>External payment transfer, account ownership, charge recovery, and payment-provider service.</li>
  <li>Road closure, permits, course measurement, traffic control, medical provision, safeguarding, and emergency planning.</li>
  <li>Professional or certified timing unless separately arranged by the organiser.</li>
  <li>Manufacturing, inventory, pickup, courier delivery, and physical reward quality.</li>
  <li>Fair rules, consistent human decisions, support response, corrections, disputes, and final event accountability.</li>
</ul>

<h2>Who HelloRun can fit</h2>
<h3>Running clubs and community teams</h3>
<p>A club can publish a virtual challenge, a local onsite event, or a hybrid format and keep participants connected to one event record. The team still needs named owners for rules, reviews, route operations, and support.</p>
<h3>Schools and youth programmes</h3>
<p>A school can structure categories and registration details, but child safeguarding, guardian consent, age-appropriate rules, data access, pickup authority, and applicable institutional approval remain school and organiser responsibilities.</p>
<h3>Companies and wellness teams</h3>
<p>A company can use accumulated goals and reviewed progress for a wellness programme. Participation should not be presented as a medical assessment or used to expose health information that the programme does not need.</p>
<h3>Charities and advocacy groups</h3>
<p>A charity event can combine participation with fundraising or awareness, but the organiser must explain where money goes, what fees cover, whether a donation is refundable, and which entity is accountable. HelloRun's receipt record is not a charity audit or fundraising licence.</p>
<h3>Independent event organisers</h3>
<p>An organiser can use the platform around existing suppliers and operations. HelloRun need not replace a specialist timing provider, accounting system, permitting process, safety plan, or fulfilment partner.</p>
<p>Teams should compare the intended workflow with actual requirements before adopting any platform. If an event needs complex team scoring, bespoke integrations, specialised fundraising, high-volume onsite timing, or jurisdiction-specific reporting, confirm support before opening registration.</p>

<h2>Step 1: organiser application and access</h2>
<p>HelloRun separates a runner account from approved organiser access. An applicant provides business or organiser information and supporting documents through the organiser application workflow. The application can remain pending, under review, approved, or rejected, with an update path where offered.</p>
<p>Approval is an access control for organiser tools. It is not a government licence, a guarantee that every future event is legitimate, or a substitute for due diligence by participants. Organisers remain responsible for keeping account and business information current and for complying with the <a href="/organiser-terms">Organiser Terms</a>.</p>
<p>An interested organiser can start from the <a href="/signup?role=organiser">organiser signup path</a>. Access to event creation depends on the current account, application, and platform eligibility state.</p>

<h2>Step 2: create, preview, and publish an event</h2>
<p>The creation workflow asks organisers to define structured information rather than relying on a poster. That includes the event identity, organiser, type, participation modes, dates, categories, fee and pricing model, virtual mechanics, onsite details, proof, recognition, media, contact, and policies relevant to the configuration.</p>
<p>Organisers can save a draft and preview the public event presentation before publication. Readiness checks and consistency warnings help expose missing or contradictory setup, such as dates that do not align or paid options without complete payment instructions. They assist review; they do not prove that a rule is lawful, safe, fair, or operationally achievable.</p>
<p>The current event lifecycle uses draft, pending-review, published, and closed states, with archived records where applicable. Publication can follow an eligible current approval path or administrator review depending on the event and organiser. The public event page should be checked again after publication because it is what runners use to make decisions.</p>
<p>Structured dates should distinguish registration, activity, final submission, review, results, and fulfilment. HelloRun currently uses <code>Asia/Manila</code> for platform day-level activity alignment. Global organisers should state the event timezone explicitly and treat the displayed structured timestamps as authoritative rather than assuming every participant shares Philippine local time.</p>

<h2>Step 3: configure registration and pricing</h2>
<p>A registration records the participant's chosen mode and category together with a profile snapshot and pricing snapshot. Depending on the event, the runner may also choose a customised signup option or a named package with an active pricing period. This helps preserve what the runner selected even if later promotional copy changes.</p>
<p>The registration form includes waiver acceptance and a digital signature matching the runner's full account name. A waiver documents acknowledgement. It does not remove organiser responsibility, replace informed consent, authorise unnecessary data collection, or make an unsafe operation safe.</p>
<p>Free events skip the payment-receipt requirement but retain their registration, eligibility, proof, privacy, and review rules. Paid amounts can vary by distance, option, package, or pricing period. An event can also disclose delivery or claiming fees for physical items. In Philippine configurations the currency may be PHP, but the platform stores event-specific pricing and should not be described as PHP-only.</p>
<p>Before launch, test the full runner path with the real choices. Check labels, keyboard use, error messages, package inclusions, fee totals, waiver content, required profile data, and the mobile layout. W3C form guidance supports explicit labels, understandable instructions, and useful validation. Accessible registration is an operational requirement, not a decorative feature.</p>

<h2>Step 4: handle free and paid registrations</h2>
<p>HelloRun does not directly process event registration funds. For a paid registration, the organiser publishes the external payee and instructions. The runner transfers through that external provider, then uploads a payment receipt from My Registrations. The organiser reviews the receipt and approves or rejects it.</p>
<p>The payment state can move through unpaid, receipt submitted, paid, and receipt rejected. Those states create a shared record, but they do not prove that funds are recoverable or that a payment provider will resolve a dispute. Organisers must reconcile receipts with the actual receiving account and maintain appropriate financial records outside the platform.</p>
<p>Payment receipt review is separate from run-result review. A paid runner has not yet proved event completion, and an activity screenshot does not prove payment. The organiser should assign each queue to a trained reviewer and communicate realistic review times.</p>
<p>For refunds, cancellations, failed transfers, charge disputes, and delivery questions, the event's terms, payment provider, organiser responsibilities, and applicable law remain relevant. Review the <a href="/refund-and-cancellation-policy">Refund and Cancellation Policy</a> before opening paid registration.</p>

<h2>Step 5: collect and review virtual activity evidence</h2>
<p>The current runner flow supports a screenshot path and a connected Strava path. Screenshot evidence is analysed with OCR-assisted extraction, after which the runner confirms the event, activity type, distance, duration, location, and other fields. Strava imports use activity data from the connected account and currently target one event or Personal Record at a time.</p>
<p>OCR is an input aid, not proof that the image is accurate. It can misread a decimal, unit, date, name, or duration. Strava data can also differ according to moving time, elapsed time, device, privacy, and sync behavior. The event mechanics decide what is eligible, and the runner remains responsible for confirming the submitted record.</p>
<p>Eligible clean submissions may follow a current conditional approval path. Other records can remain pending for organiser or administrator review, including mismatches and flagged cases. A reviewer can approve or reject according to the event rule, while rejected results can use the supported correction flow.</p>
<p>Use <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> for evidence quality and <a href="/blog/how-to-submit-run-proof-correctly-hellorun">the proof-submission walkthrough</a> for the runner interface. The <a href="/blog/best-apps-to-track-your-virtual-run">app comparison</a> explains documented tracking features without claiming a universal accuracy winner.</p>

<h2>Step 6: publish reviewed results and recognition</h2>
<p>HelloRun leaderboards use approved event records. A race-result leaderboard ranks verified elapsed time within the relevant distance group. An accumulated leaderboard sums approved distance for each registration and ranks the highest approved total first. Pending records do not receive an official rank or add official accumulated progress.</p>
<p>Standings can change when organisers approve, correct, reject, or review later submissions. They can also take a short cache interval to refresh. The <a href="/blog/how-leaderboards-work-virtual-running-events">leaderboard guide</a> documents filters, sequential tie ordering, privacy display, and troubleshooting.</p>
<p>Badges and certificates are configured features, not universal entitlements. Standard approved results may receive a certificate when an eligible template and event workflow allow it. Accumulated certificate finalisation follows the configured submission boundary and review queue rather than occurring the moment one runner first reaches the goal. See <a href="/blog/how-accumulated-distance-challenges-work">the accumulated-distance guide</a>.</p>
<p>A HelloRun result, leaderboard, badge, or certificate is event-specific recognition. It is not automatically certified timing, proof of a measured course, a World Athletics ranking, a qualifying performance, an academic credential, or government documentation.</p>

<h2>Step 7: support onsite and hybrid operations accurately</h2>
<p>For onsite participation, HelloRun can maintain structured registration records and operational records for bib assignment, check-in, result import, result entry, and approval. Hybrid events can place onsite and virtual participants under one event while retaining their different activity and result paths.</p>
<p>These records do not make HelloRun a complete physical-race operation. The organiser still needs the venue, route, permits, course measurement, traffic plan, volunteer briefing, medical and emergency arrangements, timing process, contingency plan, and local coordination. RRCA's Safe Event Guidelines treat location-specific risk management as a race-director responsibility and a planning process, not a software checkbox.</p>
<p>Participant-facing route and low-light guidance belongs in the event communications as well as the operating plan. The <a href="/blog/running-safety-tips-early-morning-night-runs">running safety guide</a> provides general visibility, weather, privacy, check-in, and stop-decision context without replacing local professional planning.</p>
<p>If a specialist timing company supplies results, agree on the import format, participant identifiers, correction authority, tie rules, and publication timing before race day. Do not claim official or qualifying timing unless the course, event, timing, and accepting body meet the applicable requirements.</p>
<p>The <a href="/blog/virtual-run-vs-traditional-race-which-one-should-you-join">virtual-versus-onsite decision guide</a> explains why results across formats, routes, devices, and conditions are not inherently comparable.</p>

<h2>Dashboard, review queues, exports, and audit history</h2>
<p>The organiser dashboard currently summarises total and active events, registration activity, submissions, approved results, and pending payment or result queues. Date-range comparisons help the organiser see recent movement, while queue links direct reviewers to work that needs attention.</p>
<p>Approved organisers or administrators can export accessible event registrants in CSV or XLSX form. Export creates another copy of participant information, so the team must control who downloads it, where it is stored, how it is shared, and when it is deleted. A spreadsheet export is not public merely because it exists.</p>
<p>Critical event actions can be represented in an event audit history, including review and export activity. An audit record supports accountability but does not prove that the original decision was correct. Review notes should be factual, necessary, and suitable for later dispute handling.</p>
<p>Dashboard summaries and registrant exports are not complete accounting statements, tax returns, sponsor reports, charity reports, custom business intelligence, or inventory reconciliation. Use appropriate specialist systems and professional review where those outputs are required.</p>

<h2>The runner journey on HelloRun</h2>
<ol>
  <li><strong>Discover:</strong> Browse <a href="/events">published events</a> and compare organiser, format, dates, rules, fee, proof, support, privacy, rewards, and refund terms.</li>
  <li><strong>Register:</strong> Choose an available participation mode, category, option, or package and confirm the profile snapshot and waiver.</li>
  <li><strong>Pay if required:</strong> Follow the event's external instructions, keep the original transaction record, and upload the receipt to the payment section.</li>
  <li><strong>Complete:</strong> Perform the allowed activity within the correct window or attend the onsite event according to its operational instructions.</li>
  <li><strong>Submit:</strong> Use the accepted evidence path and confirm the activity details rather than trusting OCR blindly.</li>
  <li><strong>Wait for review:</strong> Treat pending as unofficial. Read a rejection reason and use the offered correction path when appropriate.</li>
  <li><strong>Check results:</strong> View approved progress, configured standings, or recognition and contact the organiser with a specific reference when something is missing.</li>
</ol>
<p>The <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">foundational virtual-run guide</a> explains this journey in more detail. Philippine runners can use <a href="/blog/how-to-join-a-virtual-run-philippines">the Philippines joining guide</a> for PHP payment examples, PAGASA checks, local privacy context, and delivery questions.</p>

<h2>Four practical HelloRun examples</h2>
<h3>Free virtual 5K</h3>
<p>A club publishes one virtual 5K with a clear activity window and screenshot or Strava evidence. Registration is free, so no payment receipt is required. A runner submits an eligible activity; an approved result appears only in configured event outputs. The club still owns participant support and safety messaging.</p>
<h3>Paid event with manual receipt review</h3>
<p>An organiser offers several distances and a finisher package. The runner selects a package, follows the stated external payment method, and uploads the transaction receipt. The organiser confirms the actual account record before marking the registration paid. Result approval and delivery remain later, separate decisions.</p>
<h3>Accumulated company challenge</h3>
<p>A wellness team offers a 50K accumulated goal. Employees submit separate eligible activities. Approved distance counts officially; pending distance remains potential progress. The company limits exported data to the operational team and avoids treating activity records as medical or employment-performance assessments.</p>
<h3>Hybrid community event</h3>
<p>A community team offers an onsite 5K and a remote virtual option. Onsite staff use registration, bib, check-in, and imported result records while remote runners submit accepted evidence. The organiser publishes separate timing, route, proof, reward, and safety expectations so one mode is not mistaken for the other.</p>

<h2>Platform-fit checklist</h2>
<ul>
  <li>Can the event be represented with the available virtual, onsite, or hybrid structures?</li>
  <li>Do the category, pricing, package, date, proof, leaderboard, and recognition options match the promised mechanics?</li>
  <li>Can the team staff payment, result, support, correction, and fulfilment queues?</li>
  <li>Is external payment acceptable, with a reliable reconciliation process?</li>
  <li>Can existing timing or onsite systems provide records in a usable workflow?</li>
  <li>Are the dashboard summaries and registrant exports sufficient, or is specialist reporting required?</li>
  <li>Can the team meet local legal, tax, insurance, privacy, accessibility, safeguarding, safety, and consumer obligations?</li>
  <li>Has the complete runner journey been tested on mobile and with assistive technology?</li>
</ul>
<p>If a required capability is uncertain, confirm it through <a href="/contact">HelloRun support</a> before advertising the event or taking payment.</p>

<h2>Implementation checklist before launch</h2>
<ul>
  <li>Complete and maintain the organiser application information.</li>
  <li>Write the event brief, mechanics, responsibilities, and failure plan before entering the form.</li>
  <li>Create the event, then preview every public section and registration choice.</li>
  <li>Name one timezone and separate registration, activity, submission, review, results, and fulfilment dates.</li>
  <li>Test free or paid totals, receipt instructions, packages, and delivery fees with realistic examples.</li>
  <li>Test screenshot and Strava paths only if the event will accept them.</li>
  <li>Document reviewer standards, correction policy, escalation owner, and response target.</li>
  <li>Verify leaderboard, badge, and certificate wording does not promise unsupported recognition.</li>
  <li>Rehearse onsite bib, check-in, result, safety, and contingency workflows where applicable.</li>
  <li>Review the final public page and policies before submitting it for publication.</li>
</ul>

<h2>Privacy and accessibility checklist</h2>
<ul>
  <li>Collect only information adequate, relevant, and necessary for a stated event purpose.</li>
  <li>Restrict payment receipts, activity proof, emergency details, messages, and review notes to authorised roles.</li>
  <li>Explain public name, bib, category, result, leaderboard, badge, and certificate visibility.</li>
  <li>Secure exported spreadsheets and remove local copies when the purpose and obligations no longer require them.</li>
  <li>Avoid requesting unrelated health, identity, financial, home, or route information.</li>
  <li>Use explicit form labels, meaningful instructions, accessible error messages, keyboard operation, and readable contrast.</li>
  <li>Present data tables with useful headings and scope so assistive technology can identify relationships.</li>
  <li>Offer a support path for access needs and reasonable event-specific adjustments.</li>
</ul>
<p>Read the <a href="/privacy">Privacy Policy</a>, <a href="/data-usage-policy">Data Usage Policy</a>, and <a href="/acceptable-use-policy">Acceptable Use Policy</a>. ICO guidance describes data minimisation as limiting collection to what is necessary for the stated purpose; local privacy law remains authoritative for the event.</p>

<h2>Important limitations and responsibility boundaries</h2>
<p>HelloRun does not guarantee event legitimacy, registrations, participant numbers, revenue, fundraising results, safety, payment recovery, refunds, reward quality, delivery, proof approval, device accuracy, certified timing, course measurement, qualifying results, accessibility, legal compliance, or organiser performance.</p>
<p>The platform does not watch a runner through live GPS. OCR is fallible. Strava and other devices remain third-party services. Payment is external. Human reviewers can make mistakes. A public page can contain organiser-supplied information that later changes. A waiver cannot replace safe operations or applicable duties.</p>
<p>Organisers should publish only what their team and suppliers can deliver. Runners should check each event rather than treating platform-wide explanations as event-specific promises. Report unclear or harmful content through the event support route or <a href="/contact">Contact</a>.</p>

<h2>Frequently asked questions</h2>
<h3>Does HelloRun process registration payments?</h3>
<p>No. The current event-registration workflow records organiser instructions, uploaded receipts, and review states. The transfer occurs through the external method stated by the organiser.</p>
<h3>Does HelloRun automatically approve every event or result?</h3>
<p>No. Some eligible records may follow conditional current approval rules. Other events or results require organiser or administrator review, and all must meet their applicable readiness or eligibility conditions.</p>
<h3>Can HelloRun replace a chip-timing company?</h3>
<p>Do not assume so. It can hold onsite registrations, bibs, check-ins, imported or recorded results, and approval states. Professional timing, course certification, hardware, start-line operations, and qualifying standards require separate confirmation.</p>
<h3>Does every event have a leaderboard and certificate?</h3>
<p>No. They depend on the event configuration, approved results, and applicable completion or finalisation rules.</p>
<h3>Can organisers export participant information?</h3>
<p>Approved organisers or administrators can export accessible registrant records in CSV or XLSX. The exported file must be protected and used only for legitimate event purposes.</p>
<h3>Does the dashboard provide complete event reporting?</h3>
<p>No. It provides current summaries, comparisons, review queues, and accessible records. Accounting, tax, sponsor, charity, inventory, or custom analytics may require other systems.</p>
<h3>Is HelloRun only for the Philippines?</h3>
<p>No. The workflow can serve global events, subject to organiser eligibility and event rules. PHP and manual local payment patterns are examples, while the current platform date alignment uses Asia/Manila and should be disclosed where it affects participants.</p>
<h3>Where should a new organiser start?</h3>
<p>Read <a href="/about">About HelloRun</a>, <a href="/how-it-works">How It Works</a>, the <a href="/faq">FAQ</a>, and the organiser playbook. Then create the account and application without promising a live event before access and mechanics are confirmed.</p>
<h3>Does using HelloRun make an event safe or compliant?</h3>
<p>No. Safety plans, local law, permits, insurance, privacy, accessibility, safeguarding, consumer obligations, financial controls, and professional advice remain event responsibilities.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.rrca.org/education/event-directors/safe-event-guidelines/">Road Runners Club of America: Safe Event Guidelines</a></li>
  <li><a href="https://www.rrca.org/programs/race-director-certification/race-director-code-of-ethics/">Road Runners Club of America: Race Director Code of Ethics</a></li>
  <li><a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/">Information Commissioner's Office: Data Minimisation</a></li>
  <li><a href="https://www.w3.org/WAI/tutorials/forms/">W3C Web Accessibility Initiative: Forms Tutorial</a></li>
  <li><a href="https://www.w3.org/WAI/tutorials/tables/">W3C Web Accessibility Initiative: Tables Tutorial</a></li>
  <li><a href="https://worldathletics.org/records/certified-roadevents">World Athletics: Certified Road Events</a></li>
  <li><a href="https://developers.google.com/search/docs/fundamentals/creating-helpful-content">Google Search Central: Creating Helpful, Reliable, People-First Content</a></li>
  <li><a href="/about">About HelloRun</a></li>
  <li><a href="/how-it-works">How HelloRun Works</a></li>
  <li><a href="/faq">HelloRun FAQ</a></li>
  <li><a href="/organiser-terms">HelloRun Organiser Terms</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
  <li><a href="/data-usage-policy">HelloRun Data Usage Policy</a></li>
</ul>
<p>This guide explains a current platform workflow, not a universal recommendation or a guarantee of suitability. Evaluate the live product, event requirements, team capacity, and applicable obligations before publication.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'HelloRun in one minute',
  'How this platform guide was prepared',
  'The operational problem HelloRun addresses',
  'Capability matrix: supported, configured, and outside the platform',
  'Who HelloRun can fit',
  'Step 1: organiser application and access',
  'Step 2: create, preview, and publish an event',
  'Step 3: configure registration and pricing',
  'Step 4: handle free and paid registrations',
  'Step 5: collect and review virtual activity evidence',
  'Step 6: publish reviewed results and recognition',
  'Step 7: support onsite and hybrid operations accurately',
  'Dashboard, review queues, exports, and audit history',
  'The runner journey on HelloRun',
  'Four practical HelloRun examples',
  'Platform-fit checklist',
  'Implementation checklist before launch',
  'Privacy and accessibility checklist',
  'Important limitations and responsibility boundaries',
  'Frequently asked questions',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/about',
  '/events',
  '/how-it-works',
  '/faq',
  '/contact',
  '/privacy',
  '/data-usage-policy',
  '/organiser-terms',
  '/refund-and-cancellation-policy',
  '/acceptable-use-policy',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
  '/blog/how-to-join-a-virtual-run-philippines',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/how-leaderboards-work-virtual-running-events',
  '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
  '/blog/running-safety-tips-early-morning-night-runs',
  'rrca.org/education/event-directors/safe-event-guidelines',
  'rrca.org/programs/race-director-certification/race-director-code-of-ethics',
  'ico.org.uk/for-organisations',
  'w3.org/WAI/tutorials/forms',
  'w3.org/WAI/tutorials/tables',
  'worldathletics.org/records/certified-roadevents',
  'developers.google.com/search/docs/fundamentals/creating-helpful-content'
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
  if (wordCount < 3200) errors.push('article must contain at least 3200 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('existing cover image is required for ogImageUrl');
  if (/<h[12]>HelloRun: A Smarter Way to Manage Running Events<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/<em>[^<]+<\/em>\s*\*/i.test(payload.contentHtml)) errors.push('body contains malformed emphasized text');
  if (/(?:run|participate) anywhere,? anytime/i.test(text)) errors.push('article must not promise anywhere-anytime participation');
  if (/HelloRun (?:directly )?(?:processes?|handles?|moves?) (?:registration )?(?:payments?|funds|money)/i.test(text)) errors.push('article must not claim direct payment processing');
  if (/(?:perfect|100% accurate) OCR|OCR (?:is|will be) always accurate/i.test(text)) errors.push('article must not claim perfect OCR');
  if (/(?:every|all) (?:event|result|submission).{0,35}(?:automatically|instantly) approved/i.test(text)) errors.push('article must not promise automatic approval');
  if (/HelloRun (?:provides?|includes?|is) (?:live GPS|certified timing|course certification)/i.test(text)) errors.push('article must not claim live GPS or certified timing');
  if (/complete (?:accounting|tax|sponsor|charity|custom) report/i.test(text)) errors.push('article must not promise complete reporting');
  if (/(?:HelloRun guarantees? (?:event legitimacy|registrations|revenue|safety|refunds?|delivery|legal compliance)|(?:event legitimacy|registrations|revenue|safety|refunds?|delivery|legal compliance) (?:is|are) guaranteed)/i.test(text)) errors.push('article must not guarantee event outcomes');
  if (/waiver (?:removes?|eliminates?|waives?) (?:all )?(?:organiser|organizer) (?:responsibility|duties|liability)/i.test(text)) errors.push('article must not absolve organisers through waivers');
  if (!/documents the HelloRun implementation available in July 2026/i.test(text)) errors.push('article must disclose implementation-based methodology');
  if (!/does not directly process event registration funds/i.test(text)) errors.push('article must disclose external payment handling');
  if (!/Dashboard summaries and registrant exports are not complete accounting statements/i.test(text)) errors.push('article must bound reporting claims');
  if (!/does not guarantee event legitimacy, registrations, participant numbers, revenue/i.test(text)) errors.push('article must include responsibility limitations');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid HelloRun platform guide payload: ${errors.join('; ')}`);
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
