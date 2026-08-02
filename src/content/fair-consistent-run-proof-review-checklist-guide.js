'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'fair-and-consistent-run-proof-review-checklist-for-organizers';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'A Fair and Consistent Run-Proof Review Checklist for Organizers',
  excerpt: 'Build a repeatable virtual-run evidence review process using published rules, a fixed check order, careful privacy boundaries, and useful outcome feedback.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'run proof review',
    'virtual run organizer',
    'submission review',
    'activity evidence',
    'review checklist',
    'event integrity',
    'runner feedback',
    'organizer workflow'
  ]),
  seoTitle: 'Fair Run-Proof Review Checklist for Virtual Run Organizers',
  seoDescription: 'Use a consistent run-proof review checklist for virtual events, covering evidence, eligibility, review signals, privacy, approvals, corrections, and audit records.',
  coverImageAlt: 'Cobalt, coral, cream, and charcoal risograph illustration of anonymous run-proof cards moving through one consistent review path into three outcomes'
});

const RAW_CONTENT_HTML = `
<p>A run-proof review should answer one bounded question: does this submitted activity satisfy the event requirements that were disclosed to the participant? It should not become a test of whether the reviewer likes the performance, recognizes the app, trusts the runner personally, or can invent a stricter rule after seeing the evidence.</p>
<p>Consistency comes from using the same source of truth, the same order of checks, the same evidence boundaries, and the same outcome vocabulary for comparable entries. Fairness still requires attention to genuine differences between categories, participation modes, activity sources, and accumulated or single-result mechanics. Treating unlike cases as though they were identical can be as misleading as treating comparable cases differently.</p>
<blockquote><strong>The review principle:</strong> compare the submitted record with the published event rule, inspect automated signals without treating them as verdicts, document the decision, and give the runner an outcome they can understand and act on.</blockquote>

<h2>The organizer review checklist in one minute</h2>
<ol>
  <li><strong>Open the controlling rule.</strong> Confirm the event, category, participation mode, activity window, accepted activity, required evidence, distance, timing basis, and submission deadline.</li>
  <li><strong>Confirm the record.</strong> Match the submission to the correct registration and determine whether it is a standard result or one accumulated activity.</li>
  <li><strong>Inspect the original evidence.</strong> Read the source, date, activity type, distance, duration, identity context, and required fields without requesting unrelated personal data.</li>
  <li><strong>Review platform signals.</strong> Use OCR confidence, mismatches, duplicates, and integrity flags as prompts for closer inspection, never as proof of intent.</li>
  <li><strong>Apply the disclosed requirement.</strong> Do not create a new threshold, rounding rule, accepted source, or exception during review.</li>
  <li><strong>Choose one clear outcome.</strong> Approve a qualifying record, leave it pending while a permitted review is genuinely incomplete, or reject it with the applicable structured reason and useful detail.</li>
  <li><strong>Record the decision.</strong> Keep concise review notes, the reviewer, the time, and any approved exception or escalation in the authorized workflow.</li>
  <li><strong>Check downstream effects.</strong> Remember that only approved results contribute to official progress, eligible standings, and configured recognition.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in August 2026 against current HelloRun standard submissions, accumulated activities, screenshot and Strava evidence, OCR and integrity signals, organizer review queues, quick and bulk approval eligibility, structured rejection reasons, correction paths, audit events, leaderboards, certificates, Privacy Policy, and <a href="/organiser-terms">Organiser Terms</a>.</p>
<p>It also uses the Philippine National Privacy Commission's rules on <a href="https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/">transparency, legitimate purpose, and proportionality</a>; the Road Runners Club of America's <a href="https://www.rrca.org/programs/race-director-certification/race-director-code-of-ethics/">race director ethics guidance</a> on honesty, good faith, respect, and non-discrimination; and W3C WAI guidance on <a href="https://www.w3.org/WAI/tutorials/forms/notifications/">clear, understandable outcome and error messages</a>. These sources provide operational context. They do not decide a particular HelloRun submission or replace applicable law and event-specific obligations.</p>
<p>This is a platform workflow and editorial guide, not legal advice, forensic verification, identity certification, or an assurance that a device measured an activity perfectly. The organizer remains responsible for the event rules and authorized review decisions. Where a dispute raises legal, safeguarding, fraud, accessibility, or data-protection concerns beyond an ordinary result review, use the appropriate qualified escalation route.</p>

<h2>Official and platform sources</h2>
<p>The current platform implementation is the source for statements about HelloRun queue eligibility, review states, rejection codes, privacy presentation, audit events, progress, standings, and recognition. The linked NPC, RRCA, and W3C materials provide external privacy, ethical-operation, and understandable-feedback context. Reviewers should return to the current event record and published policies when either the platform or external guidance changes.</p>

<h2>Publish the review standard before activity begins</h2>
<p>A reviewer cannot apply a stable checklist if the event never defined what qualifies. Before registration and activity open, the authoritative event page should identify accepted activity types, category or target distance, single-activity or accumulated mechanics, activity and submission dates with a named timezone, accepted evidence sources, required fields, timing basis, minimum activity rules, duplicate treatment, review states, public-result behavior, and correction route.</p>
<p>Use the <a href="/blog/how-to-write-clear-virtual-run-rules-participants-can-follow">clear virtual run rules guide</a> to make those boundaries readable. Keep configured fields, rich event copy, registration choices, messages, and reviewer instructions aligned. A private staff note should not contradict the public rule. If a material rule must change, document the version, reason, effective point, affected participants, communication, and fair remedy rather than silently applying it to earlier activity.</p>
<p>Write down any permitted discretion. For example, an event might state how it handles a display rounded to one decimal place, a temporary outage in an accepted source, or a correction received before the final deadline. Discretion should be bounded and reviewable, not a general invitation to favor familiar participants.</p>

<h2>Separate five kinds of information</h2>
<p>A disciplined review keeps five layers distinct. Mixing them is a common source of inconsistent decisions.</p>
<ol>
  <li><strong>Published rules</strong> define the eligibility boundary the participant could know in advance.</li>
  <li><strong>Configured event and registration data</strong> identify the selected category, distance, mode, dates, and participant record used by HelloRun.</li>
  <li><strong>Submitted evidence</strong> shows the activity source and the fields available for review.</li>
  <li><strong>Validation signals</strong> identify possible missing values, mismatches, reuse, low confidence, or other conditions that need attention.</li>
  <li><strong>The reviewer decision</strong> records whether the evidence meets the applicable requirement and why.</li>
</ol>
<p>A typed distance does not overwrite a conflicting screenshot. A high OCR confidence value does not become a new event rule. A clean automated signal does not replace the organizer's responsibility when the record still requires review. A reviewer note should explain the decision without rewriting what the source displayed.</p>

<h2>Start with scope and access</h2>
<p>Open the submission through the authorized organizer queue and confirm that the event belongs to the organizer account. HelloRun combines standard and accumulated review work in the organizer submission hub, but each row retains its submission kind and event context. Search or filters can help locate work; they do not change eligibility.</p>
<p>Confirm the event title, registration, participant, selected distance or category, participation mode, payment or registration state when relevant, and submission type. If the record appears attached to the wrong registration or inaccessible event, stop and investigate rather than approving the nearest plausible match.</p>
<p>Use role-based access. Proof images, runner contact details, review signals, and private notes exist for authorized operations, not public discussion. Do not download or forward evidence into a personal chat simply because it is faster. Follow the event's support and incident process when another reviewer needs to participate.</p>

<h2>Use one fixed review order</h2>
<p>A fixed order reduces the chance that an impressive distance, familiar name, or suspicious-looking screenshot controls the whole decision. The order below moves from record identity to event eligibility, then evidence quality and signals.</p>
<ol>
  <li>Correct event and registration.</li>
  <li>Correct category, selected distance, and participation mode.</li>
  <li>Activity date inside the disclosed window and timezone rule.</li>
  <li>Accepted activity type and evidence source.</li>
  <li>Distance against the applicable category, activity minimum, or selected target mechanics.</li>
  <li>Duration or timing basis when the event requires it.</li>
  <li>Identity context sufficient for the declared review purpose.</li>
  <li>Required evidence fields visible and internally understandable.</li>
  <li>Duplicate, OCR, mismatch, and integrity signals considered in context.</li>
  <li>Outcome, notes, and downstream effect checked before confirmation.</li>
</ol>
<p>The sequence is a practical control, not an automatic decision tree. A record can fail early for one disclosed reason while also containing another problem. Choose the most useful structured reason and add concise detail when the runner must address more than one point.</p>

<h2>Check the event, registration, and category</h2>
<p>Verify that the evidence is being reviewed for the event and registration the runner selected. Compare the confirmation record, category or race distance, participation mode, and event format. A genuine activity can be ineligible when it belongs to a different event, a different registration, or an activity type excluded by the selected option.</p>
<p>Do not move a submission to a more convenient category merely to approve it unless the published workflow and authorized event process explicitly permit that change. Pricing, capacity, rewards, leaderboard grouping, target distance, and recognition may depend on the stored selection. Use the <a href="/blog/how-to-design-fair-distance-categories-and-challenge-goals">category and challenge-goal guide</a> to reconcile those dependencies before publication.</p>
<p>If the configured category and public event copy conflict, pause the affected decisions and escalate the event configuration problem. Quietly choosing whichever version produces the desired outcome creates unequal treatment and makes later results difficult to defend.</p>

<h2>Check activity date and timezone</h2>
<p>Compare the activity's original date and time context with the event's activity window, not merely the upload time. A submission sent before the deadline can still describe an activity outside the permitted dates. Conversely, an activity completed inside the window can arrive too late if the final submission deadline has passed.</p>
<p>Use the named event timezone. Relative labels such as “Today” or “Yesterday” become ambiguous after time passes. Ask for the original activity detail when the date cannot be established from the accepted evidence. Do not alter a genuine source date to make the record qualify.</p>
<p>Apply the same boundary convention at opening and closing times. If the event did not explain how an edge case would be handled, record and escalate the ambiguity instead of inventing different rules for the first and last runner reviewed.</p>

<h2>Check activity type, source, and evidence</h2>
<p>Identify whether the source shows a run, walk, hike, trail run, treadmill activity, or another type, and compare it with the published accepted activities. Import success or a readable screenshot establishes that a record can be inspected; it does not override the event rule.</p>
<p>Use <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> and the <a href="/blog/how-to-submit-run-proof-correctly-hellorun">proof-submission walkthrough</a> as participant-facing context. A reviewable screenshot should show the fields the event declared necessary, commonly including distance and unit, duration, activity date, activity type, and enough source context to understand the record. The event should avoid collecting fields it does not need.</p>
<p>Do not demand one preferred commercial app unless the event disclosed that limitation and has a legitimate reason. Do not reject a permitted source because its layout is unfamiliar. Review the content against the rule, not the visual polish of the app.</p>

<h2>Check distance and duration without inventing precision</h2>
<p>Compare the visible or imported distance with the correct requirement: the selected standard distance, an accumulated event's minimum per activity, or another published mechanic. Do not substitute the event-level target when a category-specific rule controls. Do not count several activities as one standard result unless the event was configured and published as accumulated distance.</p>
<p>Keep the unit visible. Kilometres and miles cannot be treated as interchangeable numbers. If a source rounds its display, apply only the disclosed tolerance or rounding rule. A reviewer should not round one participant upward and require another to show additional decimals.</p>
<p>Duration may be required evidence even when ranking is based on something else. Moving time and elapsed time can differ, so the event should identify the basis it uses. If the event did not require pace, elevation, calories, heart rate, or steps, those values should not become informal approval conditions.</p>

<h2>Check identity proportionately</h2>
<p>Identity review should be limited to what the event declared and what is necessary to associate the activity with the registration. A profile name, account context, connected account, confirmation record, or another disclosed field may support that purpose. Minor name variations, nicknames, OCR mistakes, or changed surnames can require clarification without establishing misuse.</p>
<p>The National Privacy Commission's proportionality principle says processing should be adequate, relevant, suitable, necessary, and not excessive for the declared purpose. Do not request government identification, home addresses, medical details, contact lists, or unrelated account history merely to make a routine activity screenshot feel more certain.</p>
<p>If an identity discrepancy cannot be resolved through the established process, use the structured identity-mismatch outcome and private support route. Avoid public accusations. The review decision concerns eligibility of the record, not a broad judgment about the participant.</p>

<h2>Treat OCR and integrity signals as review prompts</h2>
<p>HelloRun can extract candidate fields from screenshots and record confidence, mismatch, quality, or integrity signals. It can also detect exact uploaded-image reuse for the same runner and prevent repeated use of the same connected Strava activity for an event. These controls help organize attention; they do not establish why a difference exists.</p>
<p>OCR can misread decimals, units, stylized fonts, small dates, profile names, or unusual layouts. GPS can drift. Devices and apps can calculate time differently. A crop can hide a field accidentally or intentionally, but the image alone does not reveal intent. Compare the original evidence, runner-confirmed values, event mechanics, and any permitted explanation.</p>
<p>Describe a signal neutrally in private notes. “Visible distance differs from entered distance” is more useful than “runner cheated.” If the evidence still cannot meet the rule, decide the result using the applicable rejection reason. If it does meet the rule after inspection, document why the signal did not control the outcome.</p>

<h2>Use quick and bulk approval narrowly</h2>
<p>The HelloRun organizer hub exposes quick approval only for a submitted result with no suspicious flag and no current review-signal label. Bulk approval applies the same clean-submission check again to each selected record and can skip records that require individual review, were already reviewed, or are inaccessible. It is an efficiency tool for eligible clean work, not a shortcut around evidence inspection.</p>
<p>Before confirming a batch, verify that the selected event and rule are comparable, the queue filter is understood, and the organizer is comfortable making each included decision. A checkbox does not make different categories or mechanics equivalent. Review any surprising selection individually.</p>
<p>Do not batch-reject ambiguous evidence. Rejection needs a reason that helps the runner understand what requires correction. When one result changes state while a batch is being processed, HelloRun's state checks can prevent an outdated approval; treat the skipped item as work to inspect, not a system error to bypass.</p>

<h2>Choose among pending, approved, and rejected</h2>
<h3>Pending or submitted</h3>
<p>The evidence exists but has not reached a final review outcome. Pending distance does not count as approved progress, an official leaderboard result, or completed recognition. Leave a record pending only while legitimate review work remains; do not use pending status to avoid communicating a difficult decision indefinitely.</p>
<h3>Approved</h3>
<p>Approval means the evidence met the applicable platform and event review requirements for that record. Manual approval records the reviewer and time, clears automated suspicion metadata for that decision, updates relevant platform state, and can affect eligible progress, standings, notifications, or later recognition. It does not certify device accuracy, athletic performance, identity beyond the reviewed evidence, or participant intent.</p>
<h3>Rejected and open to correction</h3>
<p>Rejection records that the current evidence did not satisfy the applicable requirement. HelloRun uses a structured reason and runner-facing explanation. A rejected standard result or accumulated activity can have an authorized correction or later approval path, but resubmission returns to review and does not guarantee acceptance.</p>

<h2>Use the eight structured rejection reasons</h2>
<p>HelloRun's current run-review catalog provides eight choices. Select the closest accurate reason and add concise factual detail when it will help the runner act.</p>
<ul>
  <li><strong>Activity proof is unclear:</strong> the image or source lacks readable context needed for the decision.</li>
  <li><strong>Proof does not show the required activity:</strong> the evidence describes the wrong event, registration, source, or excluded activity.</li>
  <li><strong>Activity identity does not match:</strong> the disclosed identity link cannot be reconciled through the available evidence.</li>
  <li><strong>Distance does not meet the event requirement:</strong> the applicable distance or minimum is not satisfied.</li>
  <li><strong>Activity date is outside the event window:</strong> the original activity falls outside the controlling dates.</li>
  <li><strong>Required activity details are missing:</strong> a necessary distance, duration, date, or other published field is absent.</li>
  <li><strong>Activity was already submitted:</strong> the record reuses an activity where duplicate credit is not permitted.</li>
  <li><strong>Another activity issue needs correction:</strong> a different disclosed requirement applies; meaningful additional detail is required.</li>
</ul>
<p>Avoid “invalid,” “fraud,” or “rejected” as the entire explanation. W3C guidance recommends concise, understandable messages that identify the problem and indicate how it can be resolved. The rejection guide explains <a href="/blog/why-a-virtual-run-submission-may-be-rejected">how each outcome appears to runners and what correction may be possible</a>.</p>

<h2>Review accumulated activities separately</h2>
<p>An accumulated challenge stores and reviews individual activities. Each approved activity contributes to verified progress. Submitted distance remains potential, and rejected distance contributes nothing. One rejected activity does not automatically reject the runner's other approved activities.</p>
<p>Check the event's accepted activity types, activity window, minimum distance per activity, selected goal, evidence rule, and duplicate treatment for every record. Do not approve a questionable activity merely because the runner is close to the target, and do not reject a valid activity merely because the runner has already exceeded it.</p>
<p>Use the <a href="/blog/how-accumulated-distance-challenges-work">accumulated-distance guide</a> to distinguish verified, pending, rejected, and remaining values. Final certificates and recognition can depend on approved totals and event-wide review completion, so a progress bar is not a substitute for reviewing the queue.</p>

<h2>Protect proof and review information</h2>
<p>Activity evidence can reveal a home or workplace, repeated route, precise start time, full name, profile photo, device identifier, health information, social contacts, or notifications. Review only through authorized surfaces and collect only what the declared decision needs. Do not place proof screenshots in public results, leaderboards, community posts, or promotional material.</p>
<p>Keep private review notes factual, concise, and relevant. Do not copy a participant's sensitive information into a general note merely because it is visible. Public result presentation is separate from authorized proof access. Read the current <a href="/privacy">Privacy Policy</a> and event notice before defining evidence requirements.</p>
<p>If evidence exposes information the event did not need, minimize further access and follow the appropriate privacy or incident process. Deleting or retaining a record must follow authorized policy and platform behavior rather than an individual reviewer's personal storage habits.</p>

<h2>Record exceptions and escalations</h2>
<p>An exception should identify the published rule, the unusual fact, who authorized the decision, the reason, the affected records, the time, and whether comparable participants require the same remedy. An undocumented exception becomes a hidden rule.</p>
<p>Escalate when the event configuration conflicts with public copy, the evidence source is unavailable across many participants, a material rule changed, an accessibility accommodation is requested, a privacy incident is possible, reviewer access is disputed, or a case falls outside ordinary event operations. Keep the result pending while the authorized escalation is active, then record the resolution.</p>
<p>Do not promise that support, an appeal, or an exception will produce approval. Explain the next review step and expected source of the decision. For general platform questions, use the <a href="/faq">FAQ</a>; event-specific eligibility remains with the event's disclosed process and authorized reviewer.</p>

<h2>Calibrate reviewers with comparable cases</h2>
<p>When several people review one event, start with a small shared sample before the queue grows. Each reviewer should independently apply the checklist, compare outcomes, identify ambiguous rules, and agree on factual note language. Resolve the event rule before processing the remaining comparable records.</p>
<p>Track patterns by reason and event, not by assumptions about participant groups. A sudden cluster of missing dates may indicate unclear instructions or a source layout change. It should prompt a communication or configuration review as well as individual decisions.</p>
<p>Periodically sample approved and rejected records for consistency, especially near category boundaries and after a rule update. The RRCA ethics guidance offers useful context for honesty, fairness, good faith, respect, and non-discrimination, but it is not a universal virtual-event competition rule. Apply applicable local obligations and the event's own disclosed mechanics.</p>

<h2>Three illustrative review cases</h2>
<h3>A clear result with no review signal</h3>
<p>Lina registered for a standard 5K category. Her accepted source shows a 5.08 km Run, duration, eligible date, and matching account context. The configured category and public rule agree, and the record has no suspicious flag or review-signal label. The reviewer compares the evidence with the rule, adds a concise note if needed, and approves it. Quick approval may be available, but the organizer remains responsible for the decision.</p>
<h3>A date hidden by a crop</h3>
<p>Marco's screenshot clearly shows 10.2 km and duration, but the activity date is outside the crop. OCR proposes a date from unrelated visible text with low confidence. The reviewer does not accuse Marco or approve the proposed value. Because the event requires a visible activity date, the reviewer selects “Required activity details are missing” or “Activity proof is unclear,” adds the needed context, and directs Marco to the authorized correction path before the deadline.</p>
<h3>An accumulated activity with a name variation</h3>
<p>Ana submits an eligible 3.4 km activity to an accumulated challenge. The app shows her ordinary nickname while the registration uses her full first name, creating an identity signal. The reviewer checks the connected context and permitted evidence rather than treating the signal as a verdict. If the association is sufficiently established under the disclosed process, the activity can be approved with a factual note. If it cannot be resolved, the identity-mismatch reason explains the correction needed. Her other approved activities remain separate.</p>

<h2>Copyable run-proof review worksheet</h2>
<ul>
  <li><strong>Event and rule version:</strong> title, event reference, rule version, named timezone.</li>
  <li><strong>Registration:</strong> confirmation reference, category or distance, participation mode, relevant registration state.</li>
  <li><strong>Submission kind:</strong> standard result or accumulated activity.</li>
  <li><strong>Activity:</strong> source, type, original date, distance and unit, duration or timing basis.</li>
  <li><strong>Evidence:</strong> required fields present, readable source context, identity link proportionate to purpose.</li>
  <li><strong>Signals:</strong> OCR confidence, mismatch, duplicate, suspicious flag, or none; what was inspected.</li>
  <li><strong>Applicable requirement:</strong> exact published boundary used for the decision.</li>
  <li><strong>Outcome:</strong> pending with active reason, approved, or rejected with structured code.</li>
  <li><strong>Runner feedback:</strong> concise problem, relevant rule, permitted next action, and deadline.</li>
  <li><strong>Record:</strong> reviewer, time, factual notes, exception authority or escalation reference.</li>
</ul>
<p>Use the worksheet as a thinking aid, not a second uncontrolled database. Record necessary review information in the authorized HelloRun workflow and avoid exporting personal evidence into informal documents.</p>

<h2>Escalation checklist</h2>
<ol>
  <li>Stop the affected decision without changing unrelated records.</li>
  <li>Identify the exact conflict, missing authority, privacy concern, accessibility need, or shared technical issue.</li>
  <li>Preserve the original evidence and current state without making copies beyond authorized need.</li>
  <li>Identify who can decide: event owner, full administrator, privacy contact, qualified adviser, or another documented role.</li>
  <li>Record the question and the rule version; avoid speculation about intent.</li>
  <li>Check whether comparable submissions are affected and pause them consistently.</li>
  <li>Communicate a neutral pending update when participants need to know.</li>
  <li>Record the resolution, apply it to comparable cases, and correct public instructions if necessary.</li>
</ol>

<h2>Final pre-decision audit</h2>
<ul>
  <li>The submission belongs to the event, registration, category, and participation mode reviewed.</li>
  <li>The applied dates, timezone, activity type, distance, timing basis, and evidence fields were disclosed.</li>
  <li>The reviewer used the original evidence and did not treat OCR or an integrity flag as a verdict.</li>
  <li>No undisclosed threshold, preferred app, personal familiarity, or public pressure changed the decision.</li>
  <li>Only necessary personal information was inspected and private evidence remains private.</li>
  <li>Quick or bulk approval was limited to records that remained clean and eligible at confirmation.</li>
  <li>The selected outcome and structured rejection reason accurately describe the record.</li>
  <li>The runner feedback is understandable and names a real correction or escalation route when one exists.</li>
  <li>Notes are factual, bounded, and sufficient for another authorized reviewer to understand the decision.</li>
  <li>Approved-only progress, leaderboard, and recognition effects were not attributed to pending or rejected evidence.</li>
</ul>

<h2>Practical next step</h2>
<p>Before the next review session, choose five comparable pending entries from one event. Open the published rule beside the queue, complete the worksheet for each, and compare the resulting decisions before using any quick or bulk action. If two reviewers reach different outcomes, pause and repair the rule or reviewer instruction rather than processing the disagreement silently.</p>
<p>Then review the public event page from a participant's perspective through <a href="/events">Events</a>. Confirm that a runner can predict the required evidence, review states, correction route, public-result treatment, and support channel before completing an activity. The organizer playbook explains how this review stage connects with the wider <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">virtual-event operating lifecycle</a>.</p>
<p>A checklist cannot assure equal outcomes or eliminate every mistake. It can make the basis of each decision visible, repeatable, proportionate, and easier to correct. That is the practical foundation for trustworthy review.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'The organizer review checklist in one minute',
  'How this guide was prepared',
  'Official and platform sources',
  'Publish the review standard before activity begins',
  'Separate five kinds of information',
  'Use one fixed review order',
  'Treat OCR and integrity signals as review prompts',
  'Use quick and bulk approval narrowly',
  'Use the eight structured rejection reasons',
  'Review accumulated activities separately',
  'Protect proof and review information',
  'Three illustrative review cases',
  'Copyable run-proof review worksheet',
  'Escalation checklist',
  'Final pre-decision audit',
  'Practical next step'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/faq',
  '/organiser-terms',
  '/privacy',
  '/blog/how-to-write-clear-virtual-run-rules-participants-can-follow',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/why-a-virtual-run-submission-may-be-rejected',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'
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
  if (/<h[12]>A Fair and Consistent Run-Proof Review Checklist/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/(?:ocr|integrity flag|unusual result).{0,40}(?:proves?|confirms?) (?:fraud|cheating|misconduct)/i.test(text)) errors.push('article must not treat review signals as proof');
  if (/every submitted result (?:qualifies|is eligible) for (?:quick|bulk|automatic) approval|automatically approve all submitted results/i.test(text)) errors.push('article must not promise universal approval');
  if (/pending distance (?:counts|is counted) (?:officially|toward official progress)|pending results? (?:are|is) official/i.test(text)) errors.push('article must not count pending evidence officially');
  if (/every rejection is final|every correction (?:must|will) be approved/i.test(text)) errors.push('article must not guarantee correction outcomes');
  if (/organizers? (?:may|can|should) introduce undisclosed (?:rules|requirements) during review/i.test(text)) errors.push('article must not permit undisclosed review rules');
  if (/proof (?:files?|images?) (?:and|or)? private review notes (?:are|should be) public|publish private review notes/i.test(text)) errors.push('article must not expose private review material');
  if (/collecting (?:more|additional) personal data automatically improves verification/i.test(text)) errors.push('article must not encourage excessive data collection');
  if (/(?:this|one|the) checklist guarantees? (?:equal outcomes|fairness|error-free decisions)/i.test(text)) errors.push('article must not guarantee review fairness');
  if (!/reviewed in August 2026 against current HelloRun/i.test(text)) errors.push('article must disclose platform methodology and date');
  if (!/Approval means the evidence met the applicable platform and event review requirements/i.test(text)) errors.push('article must define platform approval');
  if (!/eight structured rejection reasons/i.test(text)) errors.push('article must document the current rejection catalog');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid run-proof review checklist payload: ${errors.join('; ')}`);
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
