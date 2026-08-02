'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'data-privacy-checklist-running-event-organizers';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'Data Privacy Checklist for Running Event Organizers',
  excerpt: 'Follow participant data from event setup and registration through proof review, exports, public results, support, incidents, and end-of-purpose handling.',
  category: 'Organizer Guide',
  tags: Object.freeze([
    'event data privacy',
    'running organizers',
    'participant data',
    'proof review privacy',
    'privacy checklist',
    'event data exports',
    'data lifecycle',
    'Philippine events'
  ]),
  seoTitle: 'Data Privacy Checklist for Running Event Organizers',
  seoDescription: 'A practical Philippine privacy checklist for running event organizers handling registration data, payment and run proof, exports, results, support, and incidents.',
  coverImageAlt: 'Layered aubergine and teal paper theatre showing event data moving through collection, controlled access, cropped review, minimal results, and disposal'
});

const RAW_CONTENT_HTML = `
<p>Running events need information to register participants, receive payment evidence, review activities, answer questions, publish eligible results, and deliver any promised recognition. That operational need does not make every available detail necessary, every team member an appropriate recipient, or every spreadsheet safe to keep indefinitely.</p>
<p>A practical privacy process follows information through its whole lifecycle. It asks what is needed, why it is needed, who should see it, where copies appear, what becomes public, how concerns are handled, and what happens when the purpose ends. The checklist below helps an organizer ask those questions before a form opens and again after the event closes.</p>
<blockquote><strong>Core principle:</strong> collect for a declared event purpose, use proportionately, restrict access, communicate clearly, and do not keep or disclose information merely because it is convenient.</blockquote>

<h2>The organizer privacy checklist in one minute</h2>
<ol>
  <li><strong>Name each purpose.</strong> Connect every requested field, file, message, export, and public result to an understandable event task.</li>
  <li><strong>Use the minimum suitable data.</strong> Remove fields and proof details that do not contribute to the declared task.</li>
  <li><strong>Explain the flow.</strong> Tell participants what is collected, how it is used, who may receive it, what may be public, and where to ask questions.</li>
  <li><strong>Limit access by role.</strong> Give registration, payment, proof-review, communication, and fulfillment access only to people who need it.</li>
  <li><strong>Treat exports as new copies.</strong> Name an owner, purpose, storage place, recipients, and end-of-purpose action for every downloaded file.</li>
  <li><strong>Separate private evidence from public results.</strong> A proof image, route, payment receipt, contact detail, and internal review note are not public-result content.</li>
  <li><strong>Prepare for requests and incidents.</strong> Use a known privacy contact and an escalation path instead of improvising in a public comment thread.</li>
  <li><strong>Review at closure.</strong> Reconcile platform records, local copies, shared folders, email attachments, and vendor copies against current obligations and purposes.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This checklist was reviewed in August 2026 against the Philippine Data Privacy Act of 2012, its Implementing Rules and Regulations, current National Privacy Commission information about data-subject rights, and NPC breach-management material. The central legal principles used here are transparency, legitimate purpose, proportionality, reasonable and appropriate safeguards, and retention no longer than necessary for the applicable purpose or other valid basis.</p>
<p>The platform examples were checked against current HelloRun event setup, registration records, payment-proof review, standard and accumulated activity evidence, organizer review access, registrant exports, public result and recognition behavior, audit events, and privacy contact routes. They describe present workflow boundaries; they do not determine an organizer's legal role, lawful basis, registration duty, or notification obligation in a particular situation.</p>
<p>This is operational education, not legal advice. The event owner remains responsible for identifying applicable law, contractual duties, internal policies, age-related requirements, sector rules, vendor arrangements, and qualified advice. A checklist can improve consistency, but it cannot certify compliance or replace an incident assessment.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://privacy.gov.ph/data-privacy-act/">National Privacy Commission: Republic Act No. 10173</a>, including general privacy principles, security, data-subject rights, and retention context.</li>
  <li><a href="https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/">NPC: Implementing Rules and Regulations</a>, including transparency, legitimate purpose, proportionality, collection, sharing, security measures, and breach notification.</li>
  <li><a href="https://privacy.gov.ph/data-subject-rights/">NPC: Data Subject Rights</a>, used to frame clear request channels and escalation rather than promise a particular outcome.</li>
  <li><a href="https://privacy.gov.ph/wp-content/uploads/2016/12/sgd-npc-circular-16-03-personal-data-breach-management.pdf">NPC Circular No. 2016-03: Personal Data Breach Management</a>, used for incident preparation and responsible escalation.</li>
  <li>HelloRun's current <a href="/privacy">Privacy Policy</a>, <a href="/data-usage-policy">Data Usage Policy</a>, <a href="/organiser-terms">Organiser Terms</a>, and <a href="/community-guidelines">Community Guidelines</a>.</li>
</ul>
<p>Use the current published policies and event configuration at the time of processing. If law, NPC guidance, platform behavior, or a documented event arrangement changes, the later authoritative requirement takes precedence over this article.</p>

<h2>Start with a participant-data map</h2>
<p>Before opening registration, draw a simple map with six columns: data item, purpose, source, people or systems with access, destinations or copies, and end-of-purpose decision. Include information collected automatically through the chosen service as well as fields the organizer asks participants to submit.</p>
<p>A typical HelloRun event may involve profile and registration details, participation mode, distance or category, registration and payment status, payment evidence, waiver records, activity metrics, proof files, review decisions, support messages, leaderboard or result fields, and recognition records. The exact set depends on event configuration and participant actions. Do not turn that example into a request for every field.</p>
<p>Map data created after collection too. A review note, rejection detail, export, email attachment, fulfillment sheet, exception log, or screenshot copied into a team chat creates another record. The privacy risk often grows through these operational copies rather than through the original registration page.</p>
<p>For every row, ask: could the task be completed with less detail, a shorter access period, a filtered view, or a platform screen instead of a download? If yes, choose the narrower method unless a documented need supports the broader one.</p>

<h2>Define purpose before collecting a field</h2>
<p>Write the purpose in participant-facing language. “Mobile number for delivery coordination if you order a physical event item” is more useful than “for event purposes.” “Run proof for checking the activity against the published rules” is clearer than “for verification.” A purpose should allow the participant and the team to understand what will happen next.</p>
<p>Do not collect speculative data for a possible future campaign, sponsor request, demographic report, or merchandise offer and then search for a purpose later. If a later use is genuinely needed, assess it separately against the original notice, lawful basis, platform terms, and applicable requirements before proceeding.</p>
<p>Keep optional information truly optional. Do not mark a field optional while designing the workflow so that people who leave it blank cannot participate. If a category, delivery, age rule, or onsite safety process requires particular information, explain that dependency before registration.</p>
<p>Consent is not a universal answer for every processing activity, and adding a checkbox does not repair an unclear or excessive request. Identify the appropriate basis and responsibilities for the actual context. When consent is the basis, the NPC rules include requirements around specificity, time relation to the purpose, information, and withdrawal; obtain qualified guidance where the decision is material.</p>

<h2>Use a minimum-fields test</h2>
<p>Apply three questions to each proposed field:</p>
<ol>
  <li>Which published event task cannot be completed without this information?</li>
  <li>Could a less detailed value complete the same task?</li>
  <li>Would the participant reasonably understand this use from the event page and policies?</li>
</ol>
<p>If the team cannot answer the first question, remove the field. If a broad free-text field could invite medical, financial, family, workplace, or other unrelated details, replace it with a bounded choice or narrower instruction where the workflow supports one.</p>
<p>Emergency information deserves particular care. Whether it is necessary depends on the event format, responsibility model, and applicable requirements. A purely virtual challenge does not automatically need the same information as an onsite event. Do not publish emergency contacts, place them in a public leaderboard, or reuse them for promotion.</p>
<p>Age and date-of-birth information can create additional risk and responsibilities. Do not use this general guide to decide whether minors may participate or how consent for a child should work. Establish the event's eligibility and safeguarding approach with qualified advice before accepting those registrations.</p>

<h2>Make the notice match the real workflow</h2>
<p>Compare the event page, rules, registration instructions, policies, confirmation messages, support replies, and team procedure. They should not tell different stories about who reviews evidence, whether names appear in results, how rewards are fulfilled, or which external parties receive information.</p>
<p>Link participants to the current HelloRun policies, but do not assume a platform-wide policy explains every organizer-specific use. If the organizer will provide data to a timing provider, delivery partner, venue, sponsor, school, club, or other recipient, assess what additional transparent information and arrangement are required.</p>
<p>Avoid hidden changes. If a material event change creates a new data use, do not bury it in an unrelated social post. Evaluate the change, update the authoritative event information, notify affected participants appropriately, and preserve an accountable record of the decision.</p>
<p>The <a href="/blog/how-to-write-clear-virtual-run-rules-participants-can-follow">clear virtual-run rules guide</a> helps consolidate dates and mechanics. Privacy information should sit beside those rules where it affects participant choice, not appear only after submission.</p>

<h2>Limit access by task and event</h2>
<p>Access should follow the event and the job. A person answering general questions may not need payment receipts. A fulfillment helper may need a bounded delivery list but not proof images or internal review notes. A proof reviewer may need event, registration, activity, and evidence context but not unrelated profile information.</p>
<p>HelloRun applies authorization checks to organizer event work and restricts registrant exports to approved organizers or administrators with event access. That application control does not govern what happens after an authorized person downloads a file, takes a screenshot, forwards an attachment, or copies values elsewhere.</p>
<p>Keep a current access list: person, role, event, data types, reason, start date, and removal trigger. Remove access when the task or relationship ends. Avoid shared personal accounts, shared passwords, or handing a logged-in device to another person. Use the platform's own role and account boundaries.</p>
<p>Review access before activity begins, before results review, before fulfillment, and at closure. Temporary volunteers and vendors often need access for only one stage. “They helped last year” is not a current purpose.</p>

<h2>Review payment and run proof proportionately</h2>
<p>A payment receipt or activity screenshot can contain more than the event needs: account references, balances, notification previews, faces, map routes, home-area clues, health information, device identifiers, or other activities. Publish clear evidence requirements and ask for the minimum view that supports the review.</p>
<p>Use HelloRun's event-scoped review surfaces where available. Treat OCR values, mismatch indicators, and integrity flags as review prompts rather than conclusive findings. The <a href="/blog/fair-and-consistent-run-proof-review-checklist-for-organizers">fair run-proof review checklist</a> explains the fixed review order and the boundary between evidence and judgment.</p>
<p>Do not paste full proof images into a public results post to explain an approval or rejection. Do not expose private review notes in participant announcements. When feedback is needed, use the relevant private workflow and provide only the detail necessary to understand the outcome or correction.</p>
<p>A platform status answers an event-record question. Submitted evidence is awaiting a decision; approved evidence met the applicable review requirements; rejected evidence did not. Approval does not make the underlying file public, prove identity beyond reviewed evidence, or authorize a new use.</p>

<h2>Treat every export as a controlled new copy</h2>
<p>HelloRun supports event-scoped registrant exports in CSV and XLSX for authorized organizer workflows, and records a critical audit event when an export is generated. An export can still be renamed, duplicated, emailed, synced, printed, or left on a device outside the platform.</p>
<p>Before exporting, record:</p>
<ul>
  <li>the event and specific operational purpose;</li>
  <li>why the platform view is insufficient;</li>
  <li>the fields and filters required;</li>
  <li>the person responsible for the file;</li>
  <li>the approved storage location and recipients;</li>
  <li>the date or trigger for review, return, or secure disposal; and</li>
  <li>how corrections and participant requests will reach every active copy.</li>
</ul>
<p>Filter first. A delivery coordinator does not automatically need the full event roster. A results checker does not automatically need contact or emergency details. If a spreadsheet needs only a confirmation code, name, selected item, and delivery field, do not include proof URLs or review notes.</p>
<p>Do not use ordinary group chats as an unexamined document repository. Do not send a full roster merely because one recipient needs one row. Avoid public links and unbounded forwarding. Use a controlled location and remove obsolete local downloads in line with the documented decision.</p>

<h2>Separate private records from public results</h2>
<p>Decide the public result fields before registration and explain them. Public recognition may use a participant name or display identity, category, approved metric, rank, badge, or certificate according to the event and platform configuration. It should not silently expand to email, mobile number, date of birth, emergency contact, payment details, full route, proof image, or internal note.</p>
<p>Only approved results contribute to official HelloRun results and leaderboards where those features apply. Pending and rejected records remain distinct. A public standing should use the minimum configured result presentation, not become a window into the review file.</p>
<p>Before publishing a separate organizer-created results graphic or file, compare it with the declared event presentation. Check for hidden spreadsheet columns, comments, formulas, metadata, off-canvas content, filenames, and accidentally included rows. A cropped screenshot can still reveal tabs, notifications, or other participants.</p>
<p>If a correction changes an official result, update the authoritative record and any organizer-controlled public copy through a documented process. Do not preserve a knowingly inaccurate copy simply because it has already been shared.</p>

<h2>Keep communications purpose-specific</h2>
<p>Registration updates, payment corrections, evidence decisions, event changes, reward fulfillment, and optional promotion are different communication purposes. Keep audiences and message content aligned with the task.</p>
<p>Use private channels for account-specific questions. A public comment or group thread is not an appropriate place to request a receipt, identification document, exact home address, medical detail, or full activity proof. Direct the participant to the supported private path without repeating sensitive information in public.</p>
<p>Use blind-copy or an appropriate sending system when recipients should not see each other's addresses. Check attachments, recipient lists, and event names before sending. Avoid copying private operational notes into participant-facing messages.</p>
<p>HelloRun provides a <a href="/contact?topic=privacy_data">privacy and data contact path</a>. Organizers should also identify who receives organizer-specific privacy questions, who can locate relevant records, and who can authorize a response or correction.</p>

<h2>Prepare a data-subject request workflow</h2>
<p>The NPC describes rights including being informed, access, objection, rectification, erasure or blocking, portability, complaint, and damages, subject to applicable conditions and limitations. Do not promise that every request will produce immediate deletion, disclosure, or a particular outcome. Do provide a clear, convenient route and a responsible assessment.</p>
<p>A basic request log can record the request date, requester, event, right or issue raised, identity-verification method proportionate to the risk, systems and copies searched, responsible person, actions, response date, and any lawful reason affecting the outcome. Keep the log itself appropriately protected.</p>
<p>Verify identity without collecting excessive new information. The appropriate check depends on the sensitivity of the requested record and the risk of disclosing it to the wrong person. Do not ask for a government ID by default if an account-based or less intrusive method can reasonably establish the requester.</p>
<p>Search beyond the platform when the organizer created additional copies: exports, shared folders, email attachments, delivery lists, printed checklists, vendor transfers, and corrected result files. A response based only on the first database screen may miss the organizer's own records.</p>

<h2>Set retention and closure decisions by purpose</h2>
<p>“Keep everything forever” is not a retention plan, and one universal number is not supplied by this guide. The Data Privacy Act and its rules connect retention to the purpose, legal claims, legitimate business needs, law, and appropriate safeguards. Different records may have different justified periods.</p>
<p>Before launch, define a review trigger for each data group. Examples include completion of payment reconciliation, final result review, expiry of a correction window, completion of physical-item fulfillment, settlement of a documented dispute, or another applicable obligation. A trigger starts a decision; it does not automatically override law or a preservation need.</p>
<p>At event closure, inventory platform records and organizer-created copies. Confirm which records remain necessary, why, who retains access, and when the next review occurs. Remove obsolete downloads and revoke temporary access through the approved process. Coordinate with vendors about their copies according to the applicable arrangement.</p>
<p>Do not claim that deleting a local spreadsheet deletes the platform record, a sent email, a recipient's copy, a backup, or a vendor record. Track each repository separately and communicate accurately about what was completed and what remains subject to another process.</p>

<h2>Prepare for incidents before one happens</h2>
<p>A security incident can include a roster sent to the wrong recipient, a public proof link, a lost device, unauthorized account access, an exposed shared folder, a malicious download, an altered record, or a paper list left accessible. Not every incident is identical, and not every incident automatically has the same notification outcome.</p>
<p>Create an escalation card with the event owner, privacy lead or responsible decision-maker, platform support route, preservation steps, and qualified legal or incident contacts. Team members should know to report promptly, preserve relevant facts, limit further exposure, and avoid making unsupported public statements.</p>
<p>Record what happened, when it was discovered, affected systems and data, people who may be affected, containment steps, outstanding risk, and decisions. Do not conceal, casually delete, or rewrite evidence of the incident. Do not promise that notification is unnecessary before the responsible assessment.</p>
<p>NPC rules and breach guidance include circumstances and timelines for mandatory notification. Determining whether those requirements apply is a case-specific responsibility. Escalate immediately to the responsible privacy and legal process rather than using this checklist as the decision.</p>

<h2>Three illustrative organizer situations</h2>
<h3>A virtual challenge with digital recognition</h3>
<p>The organizer initially proposes collecting a full home address from every runner. The event has no physical delivery. The team removes the address field, publishes the proof requirements, limits review access to two assigned reviewers, and defines a public result using only the configured display identity, category, and approved distance. A filtered result view replaces a general roster export.</p>
<p>This is an example of purpose and proportionality, not a rule that addresses are never needed. If the event later adds physical fulfillment, the organizer must assess and explain the new data flow before collection.</p>

<h3>A paid event with fulfillment support</h3>
<p>The payment reviewer needs receipt evidence and payment status. The fulfillment helper needs the selected physical item and appropriate delivery information after payment confirmation. The organizer separates those tasks instead of giving both people the complete registration and proof file. A filtered fulfillment copy has an owner and a closure trigger.</p>
<p>The example does not establish which party is a controller or processor and does not replace a vendor arrangement. It shows how task boundaries reduce unnecessary access.</p>

<h3>A roster accidentally sent to the wrong address</h3>
<p>A team member notices the error and immediately uses the incident path. The organizer records the recipient, file, fields, sending time, discovery time, and containment attempt; preserves the relevant message and logs; limits further sharing; and escalates for a breach assessment. The team does not assume that deletion by the unintended recipient ends the matter.</p>
<p>The responsible assessment determines next steps under current requirements. The checklist supplies facts and escalation, not the legal conclusion.</p>

<h2>Copyable participant-data worksheet</h2>
<p>Complete one row for every important data group and operational copy:</p>
<ul>
  <li><strong>Data item or group:</strong> What exact fields, file, note, or output are involved?</li>
  <li><strong>Declared purpose:</strong> Which event task requires it?</li>
  <li><strong>Source:</strong> Participant, organizer, platform, payment evidence, activity service, or another source?</li>
  <li><strong>Necessity check:</strong> Could less detail complete the task?</li>
  <li><strong>Notice:</strong> Where is the use explained clearly?</li>
  <li><strong>Access:</strong> Which named roles need it, for which event stage?</li>
  <li><strong>Destinations:</strong> Platform record, export, email, shared folder, printout, or vendor?</li>
  <li><strong>Public portion:</strong> Is any field intended for public results or recognition? Why?</li>
  <li><strong>Safeguards:</strong> What organizational, physical, and technical controls apply?</li>
  <li><strong>Request handling:</strong> Who can find, correct, restrict, export, or assess deletion of the record?</li>
  <li><strong>Review trigger:</strong> When will necessity and access be reviewed?</li>
  <li><strong>Incident owner:</strong> Who receives an urgent exposure report?</li>
</ul>

<h2>Final pre-publication privacy audit</h2>
<ul>
  <li>Every requested field has a declared event purpose and minimum-fields assessment.</li>
  <li>The event page, rules, messages, and current policies describe compatible uses.</li>
  <li>Optional fields and optional communications are not disguised requirements.</li>
  <li>Organizer, reviewer, payment, fulfillment, volunteer, and vendor access is bounded by task.</li>
  <li>Proof requirements discourage irrelevant private information.</li>
  <li>Private evidence and notes are separated from public results and recognition.</li>
  <li>Every planned export has a filter, owner, location, recipient list, and review trigger.</li>
  <li>Participant questions and data-subject requests have a private route and responsible owner.</li>
  <li>Retention decisions cover platform records and organizer-created copies separately.</li>
  <li>The incident card names immediate reporting and escalation contacts.</li>
  <li>The team knows that this checklist does not determine legal roles or certify compliance.</li>
</ul>

<h2>Practical next step</h2>
<p>Before publishing the next event, choose one real participant journey—from opening the event page to final recognition—and complete the worksheet for every data item and copy it creates. Remove one unnecessary field, narrow one access path, and assign one end-of-purpose review trigger before registration opens.</p>
<p>Then compare the finished map with the <a href="/how-it-works">HelloRun workflow overview</a>, current policies, the event rules, and the team's actual habits. If the map and reality disagree, correct the workflow or the participant-facing explanation before collecting more information. For platform privacy questions, use the <a href="/contact?topic=privacy_data">privacy and data contact route</a>.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'The organizer privacy checklist in one minute',
  'How this guide was prepared',
  'Official and platform sources',
  'Start with a participant-data map',
  'Define purpose before collecting a field',
  'Use a minimum-fields test',
  'Make the notice match the real workflow',
  'Limit access by task and event',
  'Review payment and run proof proportionately',
  'Treat every export as a controlled new copy',
  'Separate private records from public results',
  'Keep communications purpose-specific',
  'Prepare a data-subject request workflow',
  'Set retention and closure decisions by purpose',
  'Prepare for incidents before one happens',
  'Three illustrative organizer situations',
  'Copyable participant-data worksheet',
  'Final pre-publication privacy audit',
  'Practical next step'
]);

const REQUIRED_LINKS = Object.freeze([
  '/privacy',
  '/data-usage-policy',
  '/organiser-terms',
  '/community-guidelines',
  '/contact?topic=privacy_data',
  '/how-it-works',
  '/blog/how-to-write-clear-virtual-run-rules-participants-can-follow',
  '/blog/fair-and-consistent-run-proof-review-checklist-for-organizers'
]);

function buildArticlePayload({ coverImageUrl } = {}) {
  const contentHtml = sanitizeHtml(RAW_CONTENT_HTML).trim();
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
  if (/<h[12]>Data Privacy Checklist for Running Event Organizers/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/this checklist (?:guarantees|certifies) compliance|guaranteed data privacy compliance/i.test(text)) errors.push('article must not certify compliance');
  if (/consent is (?:always (?:the )?|the only )lawful basis|a checkbox (?:makes|ensures) processing lawful/i.test(text)) errors.push('article must not oversimplify lawful basis');
  if (/all personal data must be deleted (?:immediately|after exactly)|every event must retain data for exactly/i.test(text)) errors.push('article must not prescribe universal retention');
  if (/every incident (?:must|does) trigger notification|no incident requires notification/i.test(text)) errors.push('article must not predetermine notification');
  if (/proof images? (?:are|become) public|private review notes? (?:are|become) public/i.test(text)) errors.push('article must not expose private review material');
  if (/organizers? may collect any data|more personal data (?:always )?improves verification/i.test(text)) errors.push('article must not endorse excessive collection');
  if (/approved results? (?:prove|certify) identity|approval authorizes any use/i.test(text)) errors.push('article must not overstate approval');
  if (/downloaded exports? (?:are|remain) protected automatically/i.test(text)) errors.push('article must not overstate export protection');
  if (!/reviewed in August 2026 against the Philippine Data Privacy Act/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/This is operational education, not legal advice/i.test(text)) errors.push('article must define legal boundary');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid organizer data privacy payload: ${errors.join('; ')}`);
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
