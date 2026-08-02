'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'participant-communication-timeline-virtual-running-events';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'A Participant Communication Timeline for Virtual Running Events',
  excerpt: 'Plan what participants need before registration, during activity and submission windows, through review, results, recognition, changes, and event closeout.',
  category: 'Organizer Guide',
  tags: Object.freeze([
    'event communication',
    'virtual run organizer',
    'participant updates',
    'event timeline',
    'registration messages',
    'submission reminders',
    'runner support',
    'organizer guide'
  ]),
  seoTitle: 'Participant Communication Timeline for Virtual Running Events',
  seoDescription: 'Build a participant communication timeline for virtual runs, from announcement and registration through activity, proof review, results, recognition, and closeout.',
  coverImageAlt: 'Bright blue and green editorial timeline showing announcement, registration, messages, running, proof submission, and recognition beside a Filipina organizer'
});

const RAW_CONTENT_HTML = `
<p>A virtual running event has no shared starting-area briefing where every participant hears the same instructions at the same moment. The communication timeline must do that work across registration, payment, preparation, activity, submission, review, results, and recognition. A good timeline gives each participant the information needed for the next decision without forcing them to reconstruct the event from old posts and private messages.</p>
<p>The goal is not to send the largest possible number of messages. It is to deliver a small set of timely, consistent, accessible messages tied to real event states. Every message should agree with the authoritative event page, identify what changed or what happens next, use a named timezone, and point to the correct action or support route.</p>
<blockquote><strong>The timing principle:</strong> communicate before a participant must decide, again when an important window opens or closes, and whenever the organizer changes something material. Do not use reminders to repair rules that were never clear.</blockquote>

<h2>The communication timeline in one minute</h2>
<ol>
  <li><strong>Before announcement:</strong> approve the event source of truth, message owners, support route, escalation path, and change process.</li>
  <li><strong>Announcement:</strong> explain who the event is for, the format, important dates, price or free status, and where the complete rules live.</li>
  <li><strong>Registration:</strong> confirm receipt and distinguish registration submitted, payment pending, payment approved, and correction required.</li>
  <li><strong>Before activity starts:</strong> send a practical orientation with the participant’s category, accepted activities, evidence, safety boundary, and timezone.</li>
  <li><strong>During the event:</strong> use a predictable cadence for useful reminders, genuine changes, and support—not daily promotional noise.</li>
  <li><strong>Before submission closes:</strong> state the exact deadline, evidence fields, status after submission, and available correction route.</li>
  <li><strong>During review:</strong> explain pending, approved, rejected, and correction outcomes without exposing private evidence.</li>
  <li><strong>Results and recognition:</strong> identify when results are provisional or final and keep certificates, badges, rewards, and fulfilment conditional on actual configuration.</li>
  <li><strong>Closeout:</strong> confirm what is complete, what support remains open, how data and public results are handled, and where future updates will appear.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in August 2026 against current HelloRun event publication, registration, external payment-receipt review, standard and accumulated activity submission, result review, correction, rejection, leaderboard, certificate, badge, policy, and support workflows. It also uses current World Wide Web Consortium Web Accessibility Initiative guidance on clear content, accessible web writing, and concise user notifications, together with Philippine National Privacy Commission guidance on transparency, legitimate purpose, proportionality, and plain-language privacy information.</p>
<p>This is operational and editorial guidance, not legal advice or a promise of message delivery. Channel providers, participant settings, connectivity, invalid addresses, filtering, and user preferences can affect delivery. Organizers must confirm applicable consumer, privacy, accessibility, safeguarding, marketing, fundraising, and sector requirements for their event and jurisdiction.</p>
<p>HelloRun can present event and account states and can support configured notices, but an organizer should not claim that every participant has read a message. Important information must remain available on the authoritative event page and support routes. A sent message is evidence of an attempted communication, not proof of comprehension or acceptance.</p>

<h2>Build the communication system before writing messages</h2>
<p>Begin with the event’s operating model, not an email subject line. List each decision participants must make, each status they may enter, each deadline they can miss, and each material change that could affect eligibility, money, evidence, results, privacy, or rewards. Then identify which message should prevent confusion at that point.</p>
<p>Assign a named owner for public event copy, registration questions, payment review, activity evidence, result decisions, fulfilment, and incident communication. One person may hold several roles in a small event, but the responsibility should still be explicit. If nobody is responsible for a stage, a scheduled message will not repair the operational gap.</p>
<h3>Create a message inventory</h3>
<p>For every planned communication, record:</p>
<ul>
  <li><strong>Trigger:</strong> a date, event-state change, participant action, review decision, or material incident.</li>
  <li><strong>Audience:</strong> all interested people, registered participants, one category, paid participants awaiting review, people with pending evidence, approved finishers, or another specific group.</li>
  <li><strong>Purpose:</strong> the one decision or action the message supports.</li>
  <li><strong>Owner:</strong> who verifies the facts and authorizes sending.</li>
  <li><strong>Source:</strong> the event page, published policy, configured field, or reviewed record that supports the message.</li>
  <li><strong>Channel:</strong> on-page notice, account notification, email, organizer support reply, or approved external channel.</li>
  <li><strong>Fallback:</strong> where the same essential information remains available if the message is not delivered.</li>
  <li><strong>Evidence:</strong> a non-sensitive record of the version, audience criteria, send attempt, and important outcome.</li>
</ul>

<h2>Choose one authoritative event page</h2>
<p>The public event page should control dates, timezone, eligibility, categories, price, inclusions, accepted activities, proof requirements, review process, result treatment, rewards, and support. Messages summarize and link to that page. They should not become independent rulebooks.</p>
<p>If a social post says submissions close at midnight but the event page says 19:00 Asia/Manila, a participant has two deadlines. If an email says walking is accepted but the configured activity type does not, communication has created an operational contradiction. Reconcile structured fields, rich event copy, registration presentation, and templates before announcing.</p>
<p>Use the <a href="/blog/how-to-write-clear-virtual-run-rules-participants-can-follow">clear virtual run rules guide</a> to prepare the controlling rules. Date every material revision and state how participants will be notified. A change log is especially useful when a deadline, price, eligibility boundary, accepted activity, reward, ranking method, or privacy practice changes after registration opens.</p>

<h2>Choose channels by purpose, not habit</h2>
<p>Different channels have different strengths. The event page is durable and authoritative. An account notification can connect a participant to an in-platform task. Email can carry a concise summary and link. A social post can reach interested people but is weak for private status and easily separates from corrections. A direct support reply can resolve an individual case but should not create a new rule unavailable to everyone else.</p>
<p>Do not require participants to join an unrelated private group merely to discover essential rules. Do not publish payment receipts, proof screenshots, addresses, phone numbers, medical details, identity documents, or private dispute information in community channels. Use current <a href="/privacy">Privacy Policy</a>, <a href="/data-usage-policy">Data Usage Policy</a>, and event-specific notices to explain appropriate processing.</p>
<h3>Use redundancy for essential facts</h3>
<p>Redundancy does not mean copying the full rules into every channel. It means placing essential time-sensitive facts in more than one appropriate location while keeping one controlling source. A submission-closing reminder might appear on the participant dashboard and in a concise email, both linking to the same event section.</p>
<p>Do not describe a channel as guaranteed. Ask participants to keep contact details current and check the event page. Respect notification and marketing choices. A transactional status message about a registration or submitted result is different from promotional communication about another event.</p>

<h2>Phase 0: internal readiness before announcement</h2>
<p>Do not announce a date merely because a poster is ready. Confirm that the event can accept the promised registrations, payments, evidence, reviews, support requests, results, and recognition. The communication plan should be built from real readiness.</p>
<h3>Internal readiness message checklist</h3>
<ul>
  <li>Event page and rules have one approved version.</li>
  <li>All dates include year, time, and named timezone.</li>
  <li>Category, activity type, single-activity or accumulated mechanic, and evidence agree with configuration.</li>
  <li>Free or paid registration, payment instructions, inclusions, and refund position are accurate.</li>
  <li>Support owners know their scope and escalation route.</li>
  <li>Reviewers understand approval, rejection, correction, duplicate, and fraud-handling boundaries.</li>
  <li>Result, leaderboard, certificate, badge, reward, and fulfilment claims match enabled capabilities.</li>
  <li>Privacy notice, retention, access, and public-result presentation have been reviewed.</li>
  <li>Incident and material-change approval is assigned.</li>
  <li>Templates have been tested on mobile and with links opened as a participant.</li>
</ul>

<h2>Phase 1: event announcement</h2>
<p>The announcement helps a person decide whether to inspect the event. It should not pressure them to register before material conditions are available. Include the purpose, intended participant, completion format, headline category or goal, registration dates, activity dates, price or free status, named timezone, and link to complete rules.</p>
<p>Avoid “run anytime, anywhere” when location, route, activity, date, or evidence limits apply. Avoid “everyone gets a medal” when recognition depends on approval, a purchased package, stock, shipping, or another condition. Avoid a countdown that implies scarcity unless capacity and allocation are real and explained.</p>
<h3>Copyable announcement structure</h3>
<blockquote>
<p><strong>Event:</strong> [public event name]</p>
<p><strong>For:</strong> [intended participants and important eligibility]</p>
<p><strong>Format:</strong> [single activity or accumulated distance; accepted headline activity]</p>
<p><strong>Dates:</strong> Registration [date/time]; activity [date/time]; submission [date/time], all in [timezone].</p>
<p><strong>Entry:</strong> [free or amount and what it covers]</p>
<p><strong>Before joining:</strong> Read the categories, evidence, review, result, reward, privacy, and support rules at [event link].</p>
</blockquote>

<h2>Phase 2: registration opening and decision support</h2>
<p>When registration opens, tell participants what they need before starting the form: category decision, profile details, payment method where applicable, waiver or acknowledgement, and any event-specific information. Provide the closing date and distinguish “registration closes” from the activity or submission deadline.</p>
<p>Paid HelloRun events can use an external transfer process followed by receipt upload and review; HelloRun does not directly process the external transfer. Do not say “payment complete” when only a receipt was submitted. Explain the expected next status, correction route, and support contact without promising a review time the team cannot meet.</p>
<p>For personal-data fields, explain why the information is required and avoid collecting it through public comments or unsecured group messages. NPC principles emphasize transparency, legitimate purpose, and proportionality. Collecting extra data “in case it becomes useful” is not a communication strategy.</p>
<h3>Registration-opening message</h3>
<blockquote>
<p>Registration is now open until [full date and time, timezone]. Review the category, activity, evidence, payment, public-result, and reward conditions before submitting. A submitted registration may still require payment or organizer review. Use [support route] if an essential detail is unclear before you pay or register.</p>
</blockquote>

<h2>Phase 3: registration confirmation and payment states</h2>
<p>Confirmation should describe the participant’s actual state, not a generic celebration. A free registration may be ready. A paid registration may be awaiting a transfer, receipt upload, or review. A record may need correction. Use different messages because the next action differs.</p>
<h3>Registration received</h3>
<p>Confirm event, category, registration reference where appropriate, and the next step. Include a link to the participant’s registration or event details. Do not place sensitive profile or payment information in a subject line.</p>
<h3>Payment evidence pending</h3>
<p>Say that evidence was received for review and that this is not yet payment approval. Tell the participant where status will appear and how a correction request will be communicated. Avoid asking them to upload the same receipt repeatedly while review is pending.</p>
<h3>Payment approved</h3>
<p>Confirm the event and category, then point to preparation and activity dates. “Approved” should refer to the payment or registration state being approved—not to future run evidence.</p>
<h3>Correction required or payment rejected</h3>
<p>Use a specific, respectful reason and an actionable next step. Separate an unreadable receipt, wrong reference, missing amount, duplicate, or other issue where the workflow supports that distinction. Do not accuse a participant of misconduct based only on an incomplete image.</p>

<h2>Phase 4: pre-event orientation</h2>
<p>Send orientation early enough for a participant to choose a route, prepare an accepted tracking method, clarify a rule, and adjust responsibly. The night before is too late to reveal that a treadmill is not accepted or that the goal requires one continuous activity.</p>
<p>Orientation should include the participant’s category, single-activity or accumulated mechanic, accepted activity types, event window, submission window, timezone, minimum eligible activity where configured, required evidence fields, relevant safety boundary, public result treatment, review states, and support route.</p>
<p>Link to <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> for evidence preparation, while keeping event-specific rules on the event page. A general guide cannot override a configured event requirement.</p>
<h3>Seven-day orientation example</h3>
<blockquote>
<p>Your event activity window opens [date/time, timezone]. Your registered category is [category] using [single activity or accumulated activity]. Before starting, confirm the accepted activity types, evidence fields, route or treadmill rules, and submission deadline at [event link]. Keep the original activity record. Questions: [support route].</p>
</blockquote>

<h2>Phase 5: start-of-window message</h2>
<p>The start message should be brief because the detailed orientation already exists. Confirm that the activity window is open, restate the closing boundary, link to the rules, and emphasize that participants should choose conditions appropriate to them. Do not imply that the opening minute is a shared start or that someone must exercise immediately.</p>
<p>For accumulated events, remind participants whether each activity is submitted separately, what minimum activity applies, and that official progress uses approved eligible activity. For standard events, remind them if the category requires one qualifying activity rather than several combined records.</p>
<h3>Start message example</h3>
<blockquote>
<p>The activity window is now open and closes [full date/time, timezone]. Participate within the published rules and conditions appropriate to you. Keep the original record and submit through [task link] by [submission deadline]. Recorded activity is not automatically an approved result.</p>
</blockquote>

<h2>Phase 6: communication during the activity window</h2>
<p>Use a predictable cadence based on event length and participant needs. A weekend event may need a start message and deadline reminder. A month-long challenge may benefit from a weekly progress and support note. Daily messages can become noise unless the event explicitly promises daily programming.</p>
<p>Every routine message needs a purpose. Useful purposes include clarifying an observed shared question, reminding participants how approved progress works, pointing to support, or identifying a real upcoming boundary. Avoid publishing private participation lists or calling out people who have not submitted.</p>
<h3>Segment by state</h3>
<ul>
  <li><strong>Registered but payment pending:</strong> payment task and support, not activity completion praise.</li>
  <li><strong>Ready but no submission:</strong> activity and evidence preparation, without assuming inactivity.</li>
  <li><strong>Pending evidence:</strong> review expectation, not another generic upload reminder.</li>
  <li><strong>Correction available:</strong> the specific correction task and deadline.</li>
  <li><strong>Approved activity:</strong> confirmed progress or result and any remaining event requirement.</li>
  <li><strong>Completed participant:</strong> result finalization or recognition information, not repeated “submit now” messages.</li>
</ul>
<p>Segmentation reduces contradictory communication. It must use only appropriate participant data and should not expose segment membership to other recipients.</p>

<h2>Phase 7: submission-window reminders</h2>
<p>An activity deadline and a submission deadline may differ. State both. A participant may complete an eligible activity before the event window closes but still need to submit evidence during a grace period. Conversely, a late activity does not become eligible merely because upload remains open.</p>
<p>Send reminders at intervals participants can act on. Common operational checkpoints are several days before closing, the final day, and a final-hours notice for a longer window, but the event should choose timing proportionate to its duration. Do not manufacture urgency with misleading countdowns.</p>
<p>Include required evidence fields, accepted source, correction route, and what “submitted” means. For screenshot workflows, OCR may assist extraction, but participants must confirm the values. For supported connected activities, eligibility checks still apply. Direct participants to <a href="/blog/how-to-submit-run-proof-correctly-hellorun">the submission guide</a>.</p>
<h3>Submission reminder example</h3>
<blockquote>
<p>Activity must occur by [activity deadline, timezone]. Evidence must be submitted by [submission deadline, timezone]. Confirm distance, duration, date, activity type, and the event’s other required fields before submitting. “Submitted” or “pending” means awaiting applicable checks; it is not approved progress. Review your task at [link].</p>
</blockquote>

<h2>Phase 8: review status and correction communication</h2>
<p>Review messages should reduce uncertainty without exposing internal fraud controls or another participant’s evidence. Distinguish received, pending, conditionally approved where applicable, approved, rejected, and correction available. Use the exact public vocabulary supported by the workflow.</p>
<h3>Pending</h3>
<p>Confirm that evidence is in the queue and identify where status will appear. Do not promise approval or a review time unless the team has adopted and can meet a service target.</p>
<h3>Approved</h3>
<p>Identify the approved event and result or activity. For accumulated events, show how approved distance affects official progress. For standard events, explain any next step toward final results or recognition.</p>
<h3>Rejected or correction required</h3>
<p>State a specific participant-facing reason, what can be corrected, the deadline, and where to act. The <a href="/blog/why-a-virtual-run-submission-may-be-rejected">submission rejection guide</a> helps participants understand common outcomes, but the individual record must contain its actual reason.</p>
<p>Do not use public posts to resolve individual payment or evidence disputes. Do not include private screenshots in bulk messages. Follow the <a href="/community-guidelines">Community Guidelines</a> and current privacy policies.</p>

<h2>Phase 9: activity close, final review, and provisional results</h2>
<p>When activity or submission closes, explain what has closed and what remains open. The review queue may continue after submissions end. Calling results “final” while eligible pending evidence remains can create avoidable disputes.</p>
<p>A close message can state the number of stages still underway without publishing participant-level private status. Explain whether corrections remain possible, when the organizer expects review to finish, and where a participant can see their own record.</p>
<h3>Provisional result language</h3>
<blockquote>
<p>The submission window is closed. Review and permitted corrections are still in progress. Any standings shown before [finalization condition or date] are provisional. Approved results contribute according to the published event rules; pending evidence is not yet official.</p>
</blockquote>

<h2>Phase 10: final results and recognition</h2>
<p>Publish final results only after the event’s review and correction process reaches the stated boundary. Explain the ranking or completion method and how ties, exclusions, category groups, or accumulated totals were handled according to published rules. Avoid implying certified timing when results use participant-submitted consumer-device evidence.</p>
<p>Recognition is event-dependent. Certificates, digital badges, leaderboard placement, physical rewards, or finisher packages should be mentioned only when configured and available to that participant. Approval of an activity does not automatically guarantee every form of recognition.</p>
<p>For physical fulfilment, provide realistic preparation or dispatch information without exposing addresses. If a delay occurs, communicate it specifically and preserve the applicable refund or cancellation position at <a href="/refund-and-cancellation-policy">Refund and Cancellation Policy</a>.</p>
<h3>Final result example</h3>
<blockquote>
<p>Final event results are now available at [public result link]. Your participant record at [private task link] shows your approved outcome. Recognition available for your event and category appears there. Questions about a specific record should use [private support route] by [date, if applicable].</p>
</blockquote>

<h2>Phase 11: event closeout</h2>
<p>Closeout tells participants which operational work is complete and which support remains available. Thank participants without inflating outcomes. If the event supported a cause, report only verified, appropriately approved information. Do not publish a fundraising total, impact claim, or beneficiary statement without evidence and authorization.</p>
<p>Explain where final results remain accessible, how public presentation works, and which policy governs personal information. If feedback is requested, state its purpose, whether it is optional, and how it will be used. Do not make event completion dependent on marketing consent or public praise.</p>
<p>Archive the final rules version, material notices, audience criteria, approved templates, and non-sensitive delivery evidence. Record lessons for the next event: repeated questions, avoidable corrections, support volume, delayed reviews, misunderstood dates, and messages that arrived too late to help.</p>

<h2>Communicate material changes and incidents</h2>
<p>A material change affects a participant’s decision, obligation, money, eligibility, evidence, result, safety boundary, privacy, or promised inclusion. It needs more than a silent edit. Date the change, explain what changed and why at an appropriate level, identify who is affected, state the new action or option, and keep the previous version recoverable internally.</p>
<p>Examples include moving a deadline, changing an accepted activity, altering a category, changing a fee or inclusion, delaying a promised item, discovering an incorrect privacy statement, or correcting a result method. Obtain the required approval before sending and apply contractual, consumer, or refund obligations rather than assuming a notice alone resolves them.</p>
<h3>Material-change template</h3>
<blockquote>
<p><strong>Updated [date/time, timezone]:</strong> [specific fact] changed from [old state] to [new state]. This affects [audience]. The reason is [clear bounded explanation]. Your available next step is [action or option] by [deadline]. The authoritative event page is [link]. Private questions use [support route].</p>
</blockquote>
<p>For an incident, prioritize accuracy over speed while still acknowledging the situation. Separate confirmed facts, current impact, temporary action, next update time, and support. Do not speculate, expose security details, or identify affected individuals publicly.</p>

<h2>Write accessible, understandable messages</h2>
<p>W3C guidance recommends clear, concise content, meaningful headings and links, ordinary words, short sentences, and instructions that explain what to do. These choices help many people, including participants using assistive technology, people with cognitive or learning disabilities, and people reading in a second language.</p>
<ul>
  <li>Put the action and deadline near the beginning.</li>
  <li>Write full dates with year, time, and named timezone; avoid ambiguous numeric dates.</li>
  <li>Use one instruction per step and active voice.</li>
  <li>Expand unfamiliar abbreviations the first time.</li>
  <li>Use descriptive links such as “Review your submission,” not “Click here.”</li>
  <li>Do not rely on color, an icon, or an attached poster as the only way to convey status.</li>
  <li>Give images useful text alternatives when they carry information.</li>
  <li>Keep correction and error messages specific and explain resolution.</li>
  <li>Use a language the intended participants understand and label language changes appropriately.</li>
  <li>Test at narrow mobile widths and with enlarged text.</li>
</ul>
<p>W3C also notes that success and error notifications should be concise and clear. A notification should confirm what happened and what the participant should do, not simply display “Success” or “Error.”</p>

<h2>Protect participant privacy in every channel</h2>
<p>NPC guidance describes transparency, legitimate purpose, and proportionality as core principles. Participants should understand the nature, purpose, and extent of processing, and communication about personal data should be easy to access and understand in clear language.</p>
<p>Use the minimum personal information needed for the message. Put recipients in an appropriate privacy-preserving field or use the platform’s supported individual delivery. Do not expose the full recipient list. Do not copy sensitive evidence into an email merely for convenience. Link an authenticated participant to the appropriate private record where possible.</p>
<p>Separate essential event operations from optional promotion. A participant who joins one event does not automatically agree to unrelated advertising. Respect account preferences and applicable lawful-basis requirements. Keep “purposes for own use” and third-party sharing aligned with the published privacy information rather than adding them informally to a campaign.</p>

<h2>A copyable communication matrix</h2>
<p>Copy each line into the team’s planning document and add the real send owner, channel, template version, and approval state.</p>
<ul>
  <li><strong>Announcement:</strong> Trigger—event approved for promotion. Audience—intended public audience. Purpose—support an informed decision. Facts—format, dates, timezone, price, and rules link.</li>
  <li><strong>Registration open:</strong> Trigger—registration boundary. Audience—eligible prospective participants. Purpose—explain the registration task. Facts—category, fields, payment, and closing time.</li>
  <li><strong>Registration status:</strong> Trigger—participant submission or review. Audience—individual participant. Purpose—confirm real state and next action. Facts—event, category, status, and task link.</li>
  <li><strong>Orientation:</strong> Trigger—before activity opens. Audience—ready participants. Purpose—prepare activity and evidence. Facts—mechanic, activities, dates, proof, and support.</li>
  <li><strong>Activity open:</strong> Trigger—start boundary. Audience—ready participants. Purpose—confirm the window and rules. Facts—opening, closing, timezone, and event link.</li>
  <li><strong>Progress and support:</strong> Trigger—planned cadence or shared question. Audience—relevant status segment. Purpose—help the next task. Facts—current state, one action, and support.</li>
  <li><strong>Submission reminder:</strong> Trigger—before submission closes. Audience—participants without approved completion. Purpose—prevent avoidable missed evidence. Facts—activity and submission deadlines, fields, and status.</li>
  <li><strong>Review outcome:</strong> Trigger—decision or correction. Audience—individual participant. Purpose—explain result and action. Facts—status, reason, correction, and deadline.</li>
  <li><strong>Provisional results:</strong> Trigger—submission closed while review remains open. Audience—participants. Purpose—set finalization expectations. Facts—what remains, provisional label, and next update.</li>
  <li><strong>Final result:</strong> Trigger—review boundary reached. Audience—participants and permitted public audience. Purpose—publish final outcome. Facts—method, result link, recognition, and support.</li>
  <li><strong>Closeout:</strong> Trigger—operations complete. Audience—participants. Purpose—close responsibilities clearly. Facts—final access, remaining support, privacy, and feedback.</li>
</ul>

<h2>Comprehension test before sending</h2>
<p>Give the message to someone who did not write it and ask them to answer:</p>
<ol>
  <li>Who is this for?</li>
  <li>What happened or what is about to happen?</li>
  <li>What must the participant do, if anything?</li>
  <li>What is the exact deadline and timezone?</li>
  <li>Where is the authoritative detail?</li>
  <li>What status will appear after the action?</li>
  <li>Where can a private question be resolved?</li>
  <li>Does the message reveal information another recipient should not see?</li>
  <li>Does any sentence promise delivery, approval, recognition, safety, or a result that the system cannot guarantee?</li>
</ol>
<p>If two readers produce different deadlines or next actions, revise the message. If the message only makes sense after reading several older announcements, replace it with a self-contained correction and link to the source of truth.</p>

<h2>Final organizer checklist</h2>
<ul>
  <li>One event page controls the current rules.</li>
  <li>Every important date includes time, year, and named timezone.</li>
  <li>Each message has a trigger, audience, purpose, owner, source, channel, and fallback.</li>
  <li>Registration, payment, activity, submission, review, result, and recognition states are not blended together.</li>
  <li>Messages are segmented by the participant’s actual next task.</li>
  <li>Essential information does not depend on one social or private group channel.</li>
  <li>Instructions use clear language, meaningful links, and accessible structure.</li>
  <li>Recipient lists and private evidence are protected.</li>
  <li>Transactional event updates are separated from optional promotion.</li>
  <li>Material changes are dated, approved, explained, and communicated.</li>
  <li>Provisional results are not presented as final.</li>
  <li>Recognition and fulfilment claims match actual configuration.</li>
  <li>Support ownership and escalation remain active through closeout.</li>
  <li>Templates were checked as a participant on mobile before sending.</li>
</ul>

<h2>Your practical next step</h2>
<p>Copy the communication matrix and fill it with the exact event dates, configured participant states, owners, and task links. Start with registration, activity, submission, review, and finalization boundaries. Then add only the reminders and support messages that help a real decision. Compare the draft with current public <a href="/events">Events</a> to see how participants encounter event dates and mechanics.</p>
<p>Compare every row with the public event page and the current <a href="/organiser-terms">Organiser Terms</a>. Remove a message if it only repeats promotion. Add a message where a participant could otherwise lose eligibility, misunderstand a payment or evidence state, miss a correction opportunity, or rely on a silent material change.</p>

<h2>Sources and review notes</h2>
<p><strong>Official and platform sources:</strong> accessibility and privacy principles come from the official sources below; HelloRun workflow descriptions come from current application behavior and published HelloRun policies.</p>
<ul>
  <li><a href="https://www.w3.org/WAI/tips/writing/">W3C Web Accessibility Initiative: Writing for Web Accessibility</a>.</li>
  <li><a href="https://www.w3.org/WAI/curricula/content-author-modules/clear-content/">W3C Web Accessibility Initiative: Clear Content</a>.</li>
  <li><a href="https://www.w3.org/WAI/tutorials/forms/notifications/">W3C Web Accessibility Initiative: User Notification</a>.</li>
  <li><a href="https://privacy.gov.ph/wp-content/uploads/2022/01/DPO18-DPA_PCREL.pdf">Philippine National Privacy Commission: Data Privacy Act principles and data-subject rights</a>.</li>
</ul>
<p>Sources and platform behavior were reviewed in August 2026. Event-specific configuration and later documented workflow changes take precedence over examples in this guide.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'The communication timeline in one minute',
  'How this guide was prepared',
  'Build the communication system before writing messages',
  'Phase 1: event announcement',
  'Phase 4: pre-event orientation',
  'Phase 7: submission-window reminders',
  'Phase 8: review status and correction communication',
  'Communicate material changes and incidents',
  'A copyable communication matrix',
  'Comprehension test before sending',
  'Final organizer checklist',
  'Your practical next step',
  'Sources and review notes'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/organiser-terms"',
  'href="/community-guidelines"',
  'href="/privacy"',
  'href="/data-usage-policy"',
  'href="/refund-and-cancellation-policy"',
  'href="/blog/how-to-write-clear-virtual-run-rules-participants-can-follow"',
  'href="/blog/what-counts-as-valid-run-proof"',
  'href="/blog/how-to-submit-run-proof-correctly-hellorun"',
  'href="/blog/why-a-virtual-run-submission-may-be-rejected"'
]);

function buildArticlePayload({ coverImageUrl } = {}) {
  const contentHtml = sanitizeHtml(RAW_CONTENT_HTML);
  const contentText = htmlToPlainText(contentHtml);
  const wordCount = contentText.split(/\s+/).filter(Boolean).length;
  const payload = {
    ...ARTICLE,
    tags: [...ARTICLE.tags],
    contentHtml,
    contentText,
    contentRaw: contentText,
    readingTime: Math.ceil(wordCount / 180),
    ogImageUrl: String(coverImageUrl || '').trim(),
    coverImageAlt: ARTICLE.coverImageAlt
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
  if (/<h[12]>A Participant Communication Timeline for Virtual Running Events<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/every (?:message|email|notification) (?:is|will be) (?:delivered|read)|delivery is guaranteed/i.test(text)) errors.push('article must not guarantee message delivery');
  if (/a sent message proves (?:acceptance|comprehension)|(?:we know|this proves|it proves) every participant has read|every participant has read (?:the|this|our) message/i.test(text)) errors.push('article must not claim comprehension');
  if (/every (?:registration|payment|submission|result) is automatically approved|automatic approval is guaranteed/i.test(text)) errors.push('article must not promise automatic approval');
  if (/pending (?:evidence|activity|distance) (?:counts|is counted) (?:as )?(?:official|approved)|pending evidence completes/i.test(text)) errors.push('article must not count pending evidence officially');
  if (/every participant (?:gets|receives) (?:a )?(?:medal|certificate|badge|reward)|recognition is guaranteed/i.test(text)) errors.push('article must not guarantee recognition');
  if (/joining (?:the )?event (?:automatically )?(?:means|provides) marketing consent|registration is marketing consent/i.test(text)) errors.push('article must not conflate registration and marketing consent');
  if (!/reviewed in August 2026 against current HelloRun/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/A sent message is evidence of an attempted communication, not proof of comprehension or acceptance/i.test(text)) errors.push('article must distinguish sending from comprehension');
  if (!/Pending evidence is not yet official/i.test(text)) errors.push('article must distinguish pending evidence');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid participant communication timeline payload: ${errors.join('; ')}`);
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
