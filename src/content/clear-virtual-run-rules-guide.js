'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-write-clear-virtual-run-rules-participants-can-follow';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Write Clear Virtual Run Rules Participants Can Follow',
  excerpt: 'Write participant-friendly virtual run rules covering dates, eligibility, activities, evidence, reviews, results, rewards, changes, privacy, and support.',
  category: 'Organizer Guide',
  tags: Object.freeze([
    'virtual run rules',
    'event organizer',
    'event mechanics',
    'participant guide',
    'proof requirements',
    'event communication',
    'runner support',
    'organizer checklist'
  ]),
  seoTitle: 'How to Write Clear Virtual Run Rules Participants Can Follow',
  seoDescription: 'Create clear virtual run rules participants can understand, with practical templates for dates, activities, proof, reviews, results, rewards, privacy, and support.',
  coverImageAlt: 'Community virtual-run organizer reviewing a structured participant rules checklist beside a laptop, running shoes, and a safe green route'
});

const RAW_CONTENT_HTML = `
<p>Virtual run rules should let a participant decide whether to join, understand what to do, submit the right evidence, and know what happens next without depending on a private message. If an organizer must repeatedly explain a deadline, accepted activity, payment step, or proof requirement, the public rules are not yet doing enough work.</p>
<p>Clear rules are not the longest possible terms. They are a structured agreement between what the event promises, what HelloRun is configured to support, what the operating team can review, and what participants can reasonably understand before registering. Important conditions should appear where participants make decisions—not only after payment or at the bottom of a promotional poster.</p>
<blockquote><strong>The participant test:</strong> a person with no inside knowledge should be able to explain who may join, what counts, when it must happen, what evidence is required, how decisions work, and where to ask for help.</blockquote>

<h2>Virtual run rules in one minute</h2>
<ol>
  <li><strong>Publish one authoritative page.</strong> Identify the live event page as the controlling source and keep promotional summaries consistent with it.</li>
  <li><strong>Name every stage and timezone.</strong> Separate registration, activity, submission, review, results, and recognition dates.</li>
  <li><strong>Define the completion mechanic.</strong> Say whether the target is one activity or several approved activities accumulated within the event window.</li>
  <li><strong>List accepted activities and evidence.</strong> Do not assume participants know whether walking, treadmill activity, screenshots, or connected records count.</li>
  <li><strong>Explain review outcomes.</strong> Distinguish submitted or pending evidence from approved progress, rejection, and an available correction path.</li>
  <li><strong>Make money and rewards specific.</strong> State the amount, transfer process, inclusions, refund position, eligibility, and fulfilment limits.</li>
  <li><strong>Explain public visibility.</strong> Tell participants which name, category, result, or approved distance may appear publicly.</li>
  <li><strong>Provide a monitored contact.</strong> Name the support route, response expectation, and escalation path before launch.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in August 2026 against current HelloRun event fields, organizer configuration, publication readiness, registration, external payment-receipt review, standard and accumulated activity evidence, correction and rejection presentation, leaderboards, certificates, badges, policy pages, and participant support routes.</p>
<p>It also uses the World Wide Web Consortium Web Accessibility Initiative guidance on labels, instructions, validation, notifications, and understandable form structure. Clear digital instructions support more participants, but following this guide does not certify legal compliance, accessibility, safety, insurance, safeguarding, financial viability, or event success.</p>
<p>Requirements vary by jurisdiction, participant age, event model, prize value, fundraising arrangement, activity setting, and organization. Obtain appropriate local legal, insurance, tax, consumer, accessibility, safeguarding, and professional advice where required. A waiver records an acknowledgement; it does not erase organizer responsibilities or convert unclear rules into fair ones.</p>

<h2>Make one event page the source of truth</h2>
<p>Choose one public event page as the authoritative version of the mechanics. Posters, email, group chats, social captions, and partner announcements should summarize and link to it. They should not quietly create different eligibility, dates, prices, or rewards.</p>
<p>At the beginning of the rules, use a statement such as: “These rules apply to the 2026 Community Distance Challenge. If a promotional summary differs from this page, contact the organizer before registering. Material changes will be dated and announced through the listed channels.” Adapt that language to the actual event and applicable obligations rather than using it to avoid responsibility for misleading promotion.</p>
<p>Keep structured HelloRun fields and narrative copy aligned. If the event form says registration closes on August 20 but a paragraph says August 21, participants have two competing rules. If the category is configured as one 10K result, do not describe it as a 10K accumulated challenge. Preview the live page after every material edit.</p>
<h3>Use promotion as a summary</h3>
<p>A poster can show the title, purpose, headline category, important date, price, and link. It is not a reliable place for every evidence field, correction rule, privacy notice, or fulfilment condition. Avoid “details to follow” when the missing detail affects whether someone should pay or join.</p>

<h2>Start with a plain-language event summary</h2>
<p>Before the detailed sections, write a short summary that answers the main participant questions. Use ordinary words, active sentences, meaningful headings, and lists. Define platform-specific terms the first time they appear.</p>
<h3>Copyable summary structure</h3>
<ul>
  <li><strong>Purpose:</strong> This event exists to…</li>
  <li><strong>Who may join:</strong> Participation is open to…</li>
  <li><strong>Completion:</strong> A participant completes the event by…</li>
  <li><strong>When:</strong> Registration, activity, and submission follow the dates below in… timezone.</li>
  <li><strong>Evidence:</strong> Participants submit…</li>
  <li><strong>Cost and inclusions:</strong> Entry is free, or the fee and inclusions are…</li>
  <li><strong>Public information:</strong> The event may display…</li>
  <li><strong>Help:</strong> Questions and correction requests use…</li>
</ul>
<p>The summary is an orientation, not a substitute for the full rules. Link each important phrase to the matching detailed section when the page supports anchors. Avoid slogans such as “run anytime, anywhere” when the event actually has date, location, route, activity, or evidence limits.</p>

<h2>Define eligibility before registration</h2>
<p>State who can join and any meaningful restrictions before asking for personal data or payment. Eligibility might depend on age, location, organization, membership, invitation, guardian process, capacity, or category. Do not create a restriction merely because a field exists, and do not collect a protected characteristic without a defined and appropriate purpose.</p>
<p>If minors may participate, publish the relevant guardian and safeguarding process using organization-approved language. Do not imply that platform registration verifies legal guardian authority or provides supervision. Identify the responsible organization and monitored safeguarding route where applicable.</p>
<h3>Make categories understandable</h3>
<p>For each category, state the distance or goal, completion mode, accepted activities, price or package, participant group, leaderboard treatment, and recognition. Two categories should not look identical while producing different obligations.</p>
<p>Explain whether category changes are allowed, who may request one, any price difference, the deadline, and whether existing submissions can transfer. Do not promise a change that the team or platform workflow cannot safely perform.</p>
<h3>Clarify capacity and registration status</h3>
<p>State whether registration is confirmed immediately, waits for payment review, or requires another decision. A submitted form does not necessarily mean payment or participation has been approved. If capacity is limited, explain what determines a place and what happens to an unconfirmed transfer.</p>

<h2>Publish a complete date and timezone table</h2>
<p>“Finish by Sunday” is ambiguous across locations and across the different stages of an event. Use full dates, local times, and one named controlling timezone. HelloRun commonly presents Philippine day-level event operations using Asia/Manila, but organizers must confirm the actual configured fields and public copy.</p>
<h3>Six dates participants may need</h3>
<ol>
  <li><strong>Registration window:</strong> when entries open and close.</li>
  <li><strong>Activity window:</strong> when a qualifying run or other accepted activity may occur.</li>
  <li><strong>Submission window:</strong> when evidence may be sent, including any separate grace period.</li>
  <li><strong>Review and correction window:</strong> when decisions are expected and when permitted corrections close.</li>
  <li><strong>Final results date:</strong> when the organizer expects standings or the finisher record to stop changing.</li>
  <li><strong>Recognition or fulfilment date:</strong> when configured certificates, badges, or physical items become available or begin shipping.</li>
</ol>
<p>Use a table with “Stage,” “Opens,” “Closes,” and “Timezone” columns. If a stage has no separate opening time, say so rather than leaving participants to infer it. Explain how an announced platform outage, official emergency, or material event change will be handled, but do not promise extensions for every personal connectivity problem.</p>

<h2>State whether the goal is continuous or accumulated</h2>
<p>A distance label alone does not explain the mechanic. “25K challenge” might mean one continuous 25K activity or several approved activities totaling at least 25K. Put the completion mode beside the category name and repeat it in the rules.</p>
<h3>Single-activity rule</h3>
<p>For a standard single result, state that one eligible record must meet the category requirement. Explain whether overshoot is accepted, whether elapsed or moving time affects ranking, whether pauses are allowed, and which evidence establishes the result. Do not suggest that several shorter activities will be combined unless the event is configured to do so.</p>
<h3>Accumulated-distance rule</h3>
<p>For an accumulated event, state the target, event window, minimum eligible activity where configured, accepted activities, number of submissions allowed, treatment of overshoot, and whether ranking uses approved distance or completion only. Explain that each activity is submitted separately; a monthly dashboard total may hide dates, activity types, duplicates, or ineligible records.</p>
<p>Approved activities contribute to official accumulated progress. Pending or submitted evidence remains potential progress, and rejected evidence contributes nothing. Direct participants to <a href="/blog/how-accumulated-distance-challenges-work">the accumulated-distance guide</a> when that format is used.</p>

<h2>List accepted activities and route boundaries</h2>
<p>Say exactly whether the event accepts running, walking, wheelchair activity, hiking, trail activity, treadmill activity, or another configured type. “Virtual” does not mean every movement type qualifies. If walking is accepted for completion but excluded from a speed ranking, explain both facts together.</p>
<p>State whether participants choose their own route, use an onsite course, or combine virtual and onsite stages. A participant-chosen route does not remove the need to follow local laws, property restrictions, weather warnings, traffic rules, facility rules, and current safety information.</p>
<p>Do not guarantee that a suggested route is safe. Explain required permissions or location limits and provide a rescheduling or allowed indoor option where the event supports one. Avoid encouraging participants to disclose a home address or regular route publicly.</p>

<h2>Explain evidence with a field-by-field checklist</h2>
<p>“Upload proof” is not enough. Name the accepted source and visible fields. Depending on the event and submission path, evidence may need the activity date, distance and unit, duration or time, activity type, recognizable source, and enough identity context to match the registration.</p>
<h3>Copyable evidence checklist</h3>
<ul>
  <li>The activity date is visible and falls inside the published window.</li>
  <li>The distance and its unit are readable.</li>
  <li>The duration, moving time, or elapsed time is visible when required.</li>
  <li>The activity type matches an accepted type.</li>
  <li>The source app, watch, treadmill, or connected activity is identifiable.</li>
  <li>Participant identity is shown only to the extent needed to match the registration.</li>
  <li>The image is the original relevant summary rather than an edited collage or unrelated monthly total.</li>
</ul>
<p>HelloRun can support screenshot evidence and supported connected activity evidence under the current form and event settings. OCR may propose values or surface inconsistencies, but it is fallible and does not certify the device, identity, route, or activity. Conditional automatic approval can apply only when the configured criteria are met; other evidence remains available for review.</p>
<p>Use <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> for participant examples. State file type and size limits shown by the current form rather than copying values that may later change.</p>

<h2>Collect only the evidence the event needs</h2>
<p>A rule that asks for more information than the decision requires creates avoidable privacy and support risk. Decide why the organizer needs a route, face, full name, health metric, school, workplace, or precise location before requiring it. If date, distance, duration, activity type, and source establish eligibility, a detailed home-area map may be unnecessary.</p>
<p>Explain who can review evidence, which information may become public, how support uses it, and where participants can read the <a href="/privacy">HelloRun Privacy Policy</a>. An organizer may have its own privacy responsibilities and notice; the platform policy does not replace them.</p>
<p>Ask participants to review screenshots for home addresses, private messages, unrelated notifications, health information, or other people before uploading. Do not tell them to edit the activity values. Privacy cropping should preserve the fields required for review.</p>

<h2>Describe every review outcome</h2>
<p>Participants should know that sending evidence is not the same as receiving an approved result. Use consistent status language across the rules, confirmation messages, and support replies.</p>
<ul>
  <li><strong>Submitted or pending:</strong> the evidence has been received but is not yet official progress or a final result.</li>
  <li><strong>Approved:</strong> the evidence meets the applicable event and review requirements and contributes according to the configured mechanic.</li>
  <li><strong>Rejected:</strong> the evidence does not currently contribute; the displayed reason should explain the relevant problem.</li>
  <li><strong>Correction available:</strong> the participant may use the displayed route within the permitted window to replace evidence or correct eligible metadata.</li>
  <li><strong>Final:</strong> the review and correction boundary has passed and the organizer has closed the applicable result process.</li>
</ul>
<p>Differentiate unclear evidence from an ineligible activity. A blurry field may be correctable; a date outside the activity window may remain ineligible. Avoid accusing a participant of dishonesty based only on OCR, pace, duplicate, or another automated signal. Review the original evidence and event rule.</p>
<p>State expected review time as a target the team can support, not an instant-approval promise. Explain the contact route for a missing decision and any documented appeal or reconsideration process. Do not invent an appeal after disputes begin unless affected participants receive a fair and consistent change.</p>

<h2>Make payment and refund language specific</h2>
<p>If entry is free, say so and remove old transfer instructions. If it is paid, state the exact fee logic, currency, payee, external transfer method, receipt requirement, review status, deadline, and what the fee includes. HelloRun records organizer-provided payment instructions and receipt-review states; it does not directly process the external transfer.</p>
<p>Separate registration, payment, and confirmation. A runner may submit a registration and receipt while payment review remains pending. Explain whether activity can begin during that period and what happens if the receipt is rejected or never corrected.</p>
<p>List physical and digital inclusions without presenting them as unconditional. State size selection, delivery limits, shipping charges, collection options, production timing, stock substitutions, and eligibility where relevant. Link the applicable <a href="/refund-and-cancellation-policy">Refund and Cancellation Policy</a> and identify any event-specific terms that have received appropriate review.</p>

<h2>Explain public results and leaderboards</h2>
<p>Tell participants whether the event publishes a finisher list, result time, approved accumulated distance, category, team, or rank. State the name-display setting and whether participants can limit public presentation where supported. Do not publish proof images, receipts, routes, contact details, or unrelated profile data as leaderboard content.</p>
<p>If a leaderboard is enabled, define the ranking basis, eligible status, categories, tie treatment, visibility, and finalization point. Standard race results and accumulated-distance standings use different measures. Pending evidence should not be described as an approved rank.</p>
<p>A leaderboard compares records under the configured event rules; it does not prove equal routes, weather, devices, accessibility, or participant circumstances. If ranking does not serve the event's purpose, use completion recognition instead of adding competition by default.</p>

<h2>Define rewards without automatic promises</h2>
<p>Certificates, badges, medals, shirts, prizes, and other recognition are configured or organizer-provided features, not automatic consequences of creating an event. State what is offered, who qualifies, when eligibility becomes final, how a digital item is accessed, and how a physical item is fulfilled.</p>
<p>For accumulated challenges, final certificate handling can depend on the event boundary and clearance of relevant pending evidence. For competitive prizes, describe the final-results date, tie treatment, verification, disqualification conditions, and claim deadline using appropriately reviewed rules.</p>
<p>Avoid phrases such as “all registrants get a finisher certificate” if approval or completion is required. Distinguish participant recognition from finisher recognition, and test the configured template before publishing the promise.</p>

<h2>Plan changes, cancellation, and outages</h2>
<p>Rules should explain how material changes will be dated, approved, and communicated. A material change includes dates, price, category, completion mechanic, accepted activity, evidence, ranking, reward, delivery, or privacy presentation. Correcting a typo is different from changing what participants purchased or prepared for.</p>
<p>Name the channels used for announcements and preserve the current rules version. Do not rely only on a social feed that some registered participants may not see. If applicable law or policy requires a remedy, refund, or consent, follow that requirement rather than using a broad “organizer may change anything” clause.</p>
<p>Describe the support process for a platform outage or official emergency without guaranteeing a particular extension before the facts are known. Record the affected window, decision, responsible person, participant notice, and revised boundary.</p>

<h2>Provide a real support and escalation route</h2>
<p>Publish a monitored contact method and the kinds of issues it handles. Use <a href="/faq">the HelloRun FAQ</a> for common platform questions and <a href="/how-it-works">How It Works</a> for the general participant journey, but give event-specific questions to the organizer responsible for the event.</p>
<p>State the expected response window, controlling timezone, information the participant should include, and what should never be sent through an insecure public comment. Provide an escalation route for payment, safeguarding, privacy, evidence, or urgent operational concerns where appropriate.</p>
<p>Support agents should answer from the authoritative page. If a private answer changes a rule, the organizer should decide whether the public page and other affected participants need a documented update.</p>

<h2>Clear and ambiguous rule examples</h2>
<h3>Dates</h3>
<p><strong>Ambiguous:</strong> “Run any time in August and submit afterward.”</p>
<p><strong>Clearer:</strong> “Complete the activity from August 3 at 12:00 AM through August 31 at 11:59 PM Asia/Manila. Submit evidence by September 2 at 11:59 PM Asia/Manila.” Use the actual configured dates, not this example.</p>
<h3>Activity</h3>
<p><strong>Ambiguous:</strong> “Any exercise counts.”</p>
<p><strong>Clearer:</strong> “This category accepts Run and Walk activities. Submit one activity of at least 5.00 km. Treadmill activity is accepted with the evidence fields listed below.” Change each statement to match the event.</p>
<h3>Accumulation</h3>
<p><strong>Ambiguous:</strong> “Reach 50K during the challenge.”</p>
<p><strong>Clearer:</strong> “This is an accumulated-distance category. Submit each eligible activity separately during the event window. Only approved activity distance contributes to the 50K target; pending and rejected activity does not.”</p>
<h3>Payment</h3>
<p><strong>Ambiguous:</strong> “Pay now to secure your slot.”</p>
<p><strong>Clearer:</strong> “Transfer the displayed amount to the organizer's named external account and upload the receipt by the deadline. Registration remains pending until the organizer approves the receipt.”</p>
<h3>Recognition</h3>
<p><strong>Ambiguous:</strong> “Join and get a certificate.”</p>
<p><strong>Clearer:</strong> “A configured digital finisher certificate becomes eligible after the event's completion and review requirements are satisfied.” Confirm the actual configuration before using this language.</p>

<h2>Copyable participant-rules template</h2>
<ol>
  <li><strong>Event summary:</strong> purpose, organizer, audience, and authoritative-page statement.</li>
  <li><strong>Eligibility:</strong> age, location, membership, guardian, capacity, and confirmation conditions.</li>
  <li><strong>Categories:</strong> distance, mechanic, accepted activities, price, results, and recognition for each choice.</li>
  <li><strong>Timeline:</strong> registration, activity, submission, review, correction, final results, and fulfilment with timezone.</li>
  <li><strong>Completion:</strong> one activity or accumulated approved activities, minimums, overshoot, and deadlines.</li>
  <li><strong>Evidence:</strong> accepted sources, required visible fields, file constraints, privacy checks, and duplicate treatment.</li>
  <li><strong>Review:</strong> submitted, pending, approved, rejected, correction, and final states with response expectations.</li>
  <li><strong>Payment:</strong> fee, external method, receipt review, inclusions, confirmation, and refund link.</li>
  <li><strong>Results:</strong> public fields, name display, ranking basis, tie treatment, and finalization.</li>
  <li><strong>Recognition:</strong> configured eligibility, delivery, access, and limits.</li>
  <li><strong>Changes:</strong> version date, announcement channels, cancellation, outage, and applicable remedies.</li>
  <li><strong>Support:</strong> contact method, response target, escalation, and privacy warning.</li>
  <li><strong>Policies:</strong> relevant <a href="/organiser-terms">Organiser Terms</a>, <a href="/community-guidelines">Community Guidelines</a>, privacy, refund, and event-specific notices.</li>
</ol>
<p>Do not publish the template unchanged. Remove irrelevant sections and complete every placeholder. Have the operating, review, payment, privacy, communication, and fulfilment owners confirm that the public wording matches their actual process.</p>

<h2>Run a participant comprehension test</h2>
<p>Give the preview to someone who did not plan the event. Do not explain it first. Ask the person to find and answer the following questions:</p>
<ul>
  <li>Who can join, and when is registration confirmed?</li>
  <li>Which category would you select, and what exactly completes it?</li>
  <li>When may the activity happen, and when is evidence due?</li>
  <li>Which activity types and evidence sources are accepted?</li>
  <li>Which fields must be visible without exposing unnecessary information?</li>
  <li>What happens after submission, and how is a rejection corrected?</li>
  <li>What does the fee include, and where is the refund position?</li>
  <li>Which information may become public?</li>
  <li>When and how does recognition become available?</li>
  <li>Where do you ask for help?</li>
</ul>
<p>Record every place where the reader guessed, contradicted the intended behavior, or needed a private explanation. Repair the page and repeat the test on mobile and desktop. Test keyboard navigation, zoom, meaningful headings, link labels, error presentation, and sufficient contrast using the relevant W3C guidance.</p>

<h2>Final pre-publication checklist</h2>
<ul>
  <li>One public page is identified as authoritative.</li>
  <li>The summary, structured fields, categories, and detailed rules agree.</li>
  <li>All stages use full dates, times, and a named timezone.</li>
  <li>Single-activity or accumulated completion is unmistakable.</li>
  <li>Accepted activities, minimums, evidence, and privacy boundaries are explicit.</li>
  <li>Submitted or pending evidence is not described as approved progress.</li>
  <li>Correction, rejection, review time, and support routes are practical.</li>
  <li>Payment, confirmation, inclusions, delivery, and refund language agree.</li>
  <li>Public results, leaderboard settings, and recognition match the configuration.</li>
  <li>Material-change and outage communication has an owner.</li>
  <li>Policies and organizer responsibilities are linked accurately.</li>
  <li>A person outside the planning team passed the comprehension test.</li>
</ul>

<h2>Take the practical next step</h2>
<p>Open the current event preview and copy the participant-rules template into a working document. Complete the timeline and completion sections first, because they influence registration, categories, evidence, review, results, and recognition. Then compare every public sentence with the live HelloRun fields.</p>
<p>Use the <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">organizer playbook</a> for the wider operating plan. Rules are ready only when the team can deliver them consistently and a participant can understand them without private clarification.</p>

<h2>Official and platform sources</h2>
<ul>
  <li>Current HelloRun event creation, publication readiness, registration, payment-receipt review, submission, accumulated-progress, correction, leaderboard, certificate, badge, and public presentation behavior reviewed in August 2026.</li>
  <li><a href="/organiser-terms">HelloRun Organiser Terms</a>, used for organizer responsibilities and event representation context.</li>
  <li><a href="/community-guidelines">HelloRun Community Guidelines</a>, used for respectful communication and participant conduct context.</li>
  <li><a href="/privacy">HelloRun Privacy Policy</a>, used for platform data-processing and public-presentation context.</li>
  <li><a href="/refund-and-cancellation-policy">HelloRun Refund and Cancellation Policy</a>, used for platform and event refund context.</li>
  <li><a href="https://www.w3.org/WAI/tutorials/forms/instructions/">W3C Web Accessibility Initiative: Form Instructions</a>, used for clear labels, instructions, structure, and feedback.</li>
</ul>
<p>Policies, platform behavior, and external guidance can change. Recheck the live event form, current policy pages, and applicable local requirements before publishing an event. This article does not guarantee that a rule set is legally sufficient, accessible to every participant, or suitable for a particular event.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Virtual run rules in one minute',
  'How this guide was prepared',
  'Make one event page the source of truth',
  'Publish a complete date and timezone table',
  'State whether the goal is continuous or accumulated',
  'Explain evidence with a field-by-field checklist',
  'Describe every review outcome',
  'Make payment and refund language specific',
  'Explain public results and leaderboards',
  'Clear and ambiguous rule examples',
  'Copyable participant-rules template',
  'Run a participant comprehension test',
  'Final pre-publication checklist',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/how-it-works"',
  'href="/faq"',
  'href="/organiser-terms"',
  'href="/community-guidelines"',
  'href="/privacy"',
  'href="/refund-and-cancellation-policy"',
  'href="/blog/what-counts-as-valid-run-proof"',
  'href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers"',
  'www.w3.org/WAI/tutorials/forms/instructions/'
]);

function buildArticlePayload({ coverImageUrl = '' } = {}) {
  const contentHtml = sanitizeHtml(RAW_CONTENT_HTML);
  const contentText = htmlToPlainText(contentHtml);
  const normalizedCoverImageUrl = String(coverImageUrl || '').trim();
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
    ogImageUrl: normalizedCoverImageUrl
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
  if (!payload.ogImageUrl) errors.push('cover artwork is required for publication');
  if (/<h1\b/i.test(payload.contentHtml)) errors.push('body must not contain a page-level h1');
  if (/<h[12]>How to Write Clear Virtual Run Rules Participants Can Follow<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/all virtual runs accept|every virtual run accepts|any activity always counts/i.test(text)) errors.push('article must not claim universal activity acceptance');
  if (/pending (?:distance|evidence|activity) (?:counts|is counted) as (?:approved|official)|pending evidence completes/i.test(text)) errors.push('article must not count pending progress officially');
  if (/every submission is automatically approved|automatic approval is guaranteed/i.test(text)) errors.push('article must not promise automatic approval');
  if (/HelloRun (?:directly )?(?:processes|handles) (?:the |your |event )?(?:payment|transfer|funds)/i.test(text)) errors.push('article must not claim direct payment processing');
  if (/all registrants (?:automatically )?(?:receive|get) (?:a )?(?:certificate|badge)|every participant automatically receives/i.test(text)) errors.push('article must not promise automatic recognition');
  if (/(?<!not )guarantee(?:s|d)? (?:legal compliance|accessibility|safety|approval|event success)|waiver eliminates (?:all )?(?:risk|responsibility)/i.test(text)) errors.push('article must not guarantee compliance or erase responsibility');
  if (!/reviewed in August 2026 against current HelloRun event fields/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/Pending or submitted evidence remains potential progress, and rejected evidence contributes nothing/i.test(text)) errors.push('article must distinguish accumulated review states');
  if (!/does not directly process the external transfer/i.test(text)) errors.push('article must accurately describe external payments');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid clear virtual run rules payload: ${errors.join('; ')}`);
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
