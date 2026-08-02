'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-close-a-virtual-run-final-reviews-results-recognition';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Close a Virtual Run: Final Reviews, Results, and Recognition',
  excerpt: 'Close a virtual run through explicit review, results, recognition, communication, privacy, and recordkeeping gates instead of treating closure as one button.',
  category: 'Organizer Guide',
  tags: Object.freeze([
    'virtual run closeout',
    'final result review',
    'event results',
    'runner recognition',
    'organizer checklist',
    'event certificates',
    'event recordkeeping',
    'virtual run operations'
  ]),
  seoTitle: 'How to Close a Virtual Run: Final Reviews, Results, and Recognition',
  seoDescription: 'Use a practical closeout process for final submissions, review queues, approved results, leaderboards, certificates, runner communication, privacy, and records.',
  coverImageAlt: 'Cyanotype and copper-leaf artwork showing evidence cards passing through review into orderly results, recognition, and protected records'
});

const RAW_CONTENT_HTML = `
<p>A virtual run does not become complete merely because its activity dates have ended. Participants may still have a valid submission window, organizers may still have evidence to review, corrections may be in progress, and accumulated-distance certificates may still be waiting for the event-wide queue to clear. Closure is a controlled sequence, not a celebratory button.</p>
<p>A useful closeout protects four things at once: participants receive decisions under the published rules; public results reflect only the records that qualify; recognition matches the configured event promises; and personal information remains protected after active operations slow down. Moving too quickly can turn an orderly event into conflicting results, premature certificates, unanswered corrections, and unnecessary data exposure.</p>
<blockquote><strong>The closeout principle:</strong> close each operational gate in order, record unresolved exceptions, communicate what is final and what is still processing, and only then lock the event lifecycle.</blockquote>

<h2>Virtual-run closeout in one minute</h2>
<ol>
  <li><strong>Confirm the real boundaries.</strong> Separate registration close, activity end, final submission deadline, correction availability, final review, and event status.</li>
  <li><strong>Freeze the published criteria.</strong> Review against rules participants could access before activity—not new requirements introduced during closeout.</li>
  <li><strong>Reconcile the queues.</strong> Count standard submissions, accumulated activities, pending corrections, payment issues, and documented exceptions by state.</li>
  <li><strong>Complete final reviews consistently.</strong> Use the same fixed order and evidence boundaries applied during the event.</li>
  <li><strong>Verify the approved-result set.</strong> Treat pending and rejected records separately; check category and leaderboard behavior before describing results as final.</li>
  <li><strong>Confirm recognition readiness.</strong> Distinguish standard certificates, accumulated certificate finalization, badges, rewards, and public standings.</li>
  <li><strong>Communicate in layers.</strong> Tell affected participants their specific outcome before publishing a broad completion message.</li>
  <li><strong>Protect records and learn.</strong> Restrict exports, apply retention rules, preserve an audit trail, and record improvements before closing the event status.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in August 2026 against current HelloRun event lifecycle, structured dates, standard and accumulated submission queues, rejection and correction paths, approved-only leaderboards, certificate generation, accumulated certificate finalization, runner notifications, public event status, and organizer access behavior.</p>
<p>Operational principles were also checked against the Road Runners Club of America Race Director Code of Ethics for honest communication, safety, non-discrimination, and integrity; Philippine National Privacy Commission requirements on purpose, accuracy, proportionality, retention, access, and disposal; and World Wide Web Consortium guidance on clear success, error, progress, and result notifications.</p>
<p>This is an operational framework, not legal advice, accounting advice, or a promise that one checklist eliminates error. Published event rules, HelloRun's current behavior, applicable law, payment and fulfilment commitments, local requirements, and documented participant-specific decisions take precedence.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.rrca.org/programs/race-director-certification/race-director-code-of-ethics/">RRCA: Race Director Code of Ethics</a>, used for honest communication, participant safety, non-discrimination, fairness, and good-faith event conduct.</li>
  <li><a href="https://privacy.gov.ph/data-privacy-act/">Philippine National Privacy Commission: Data Privacy Act of 2012</a>, used for purpose limitation, accuracy, proportionality, retention, and protection of participant information.</li>
  <li><a href="https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/">NPC: Implementing Rules and Regulations of the Data Privacy Act</a>, used for access management, confidentiality, data flows, retention schedules, and disposal procedures.</li>
  <li><a href="https://www.w3.org/WAI/tutorials/forms/notifications/">W3C WAI: User Notifications</a>, used for concise and understandable success, error, and correction feedback.</li>
  <li><a href="https://www.w3.org/WAI/WCAG22/Understanding/status-messages">W3C WAI: Understanding Status Messages</a>, used for communicating changing review, processing, and completion states without relying on visual changes alone.</li>
</ul>
<p>RRCA guidance is useful event-operations context, not a certification claim about HelloRun or any organizer. NPC requirements apply according to the organizer's actual role and processing. W3C techniques support accessible communication but do not by themselves certify an event or site as conformant.</p>

<h2>Define what “closed” means before using the word</h2>
<p>Participants may interpret “closed,” “finished,” and “final” differently. An activity period can be finished while proof submission remains open. Submissions can be closed while final review continues. Results can be visible while a documented correction is unresolved. Recognition can be configured while a certificate is still generating.</p>
<p>Write a closeout vocabulary for the team:</p>
<ul>
  <li><strong>Activity ended:</strong> no new eligible activity should occur after the configured event boundary.</li>
  <li><strong>Final submissions open:</strong> eligible prior activity may still be submitted until the configured final submission deadline.</li>
  <li><strong>Final reviews in progress:</strong> submitted evidence still awaits organizer decisions.</li>
  <li><strong>Results checked:</strong> the approved-result population has been reconciled under the configured rules.</li>
  <li><strong>Recognition processing:</strong> configured certificates, badges, or other entitlements are being generated or checked.</li>
  <li><strong>Operational closeout complete:</strong> submission and review gates are complete, known exceptions are documented, and results and recognition have been checked.</li>
  <li><strong>Event status closed:</strong> the HelloRun event record is locked against ordinary organizer editing and cannot transition again through the organizer status route.</li>
</ul>
<p>Do not announce “all complete” when only the activity period ended. Use the exact state and the next expected step.</p>

<h2>Separate every closing boundary</h2>
<p>Start with the structured event dates and name the timezone. Review registration open and close, event start and end, and final submission deadline. For an onsite or hybrid event, also reconcile any venue or timing boundaries that were published outside the platform.</p>
<p>The event end answers when qualifying activity stops. The final submission deadline answers how long eligible proof can enter or return through an allowed correction path. They are not interchangeable. A late upload may still document in-window activity when event rules and the configured deadline permit it; an activity performed after the activity window does not become eligible merely because the upload arrived before the proof deadline.</p>
<p>Use the <a href="/blog/how-to-write-clear-virtual-run-rules-participants-can-follow">clear-rules guide</a> to compare the closeout against what participants were told. Use the <a href="/blog/participant-communication-timeline-virtual-running-events">communication timeline</a> to plan reminders before each actual boundary.</p>

<h2>Freeze rules and preserve material-change records</h2>
<p>Closeout is not the time to invent stricter evidence, distance, timing, identity, category, or reward requirements. Apply the published rules, configured event fields, and disclosed review process. If a material change was necessary during the event, preserve what changed, why, when, who authorized it, which participants were affected, and how they were informed.</p>
<p>Do not quietly reinterpret an ambiguous rule to reduce workload or change an outcome. Escalate the ambiguity, choose a good-faith consistent treatment, document it, and apply it comparably. If the issue can affect eligibility, payment, reward, or public ranking, communicate the correction and available response path.</p>
<p>The <a href="/blog/how-to-design-fair-distance-categories-and-challenge-goals">category and challenge-goal guide</a> helps compare category labels, distances, pricing, capacity, rewards, and recognition before results are finalized. Closure cannot repair an incoherent category by pretending a different category was published.</p>

<h2>Build one closeout control sheet</h2>
<p>Create one restricted working record that shows the current state without copying proof images or sensitive participant data into a new uncontrolled spreadsheet. Use identifiers and counts where possible. Assign one owner and one target decision time for each unresolved item.</p>
<p>Useful sections include:</p>
<ul>
  <li>event boundaries and timezone;</li>
  <li>registration totals by relevant payment and participation state;</li>
  <li>standard submissions by submitted, approved, and rejected status;</li>
  <li>accumulated activities by submitted, approved, and rejected status;</li>
  <li>corrections or resubmissions awaiting action;</li>
  <li>payment, refund, fulfilment, or support exceptions;</li>
  <li>certificate, badge, leaderboard, reward, and result readiness;</li>
  <li>participant communications sent and still required;</li>
  <li>local exports, access owners, retention basis, and disposal date;</li>
  <li>post-event issues and improvement decisions.</li>
</ul>
<p>The control sheet coordinates work; HelloRun remains the source for platform records. Do not replace review states with a private “done” column that participants cannot understand or challenge.</p>

<h2>Take an opening snapshot of every queue</h2>
<p>At the start of final review, record counts for each genuine state. Separate standard results from individual accumulated-distance activities because their review and certificate behavior differ. Separate clean pending records from records needing inspection, but do not let a private risk label become an outcome.</p>
<p>Include records returned for correction and any support case that can change a review decision. Reconcile counts against confirmed registrations when relevant, but do not assume every registration must have a submission. A participant may not start, may withdraw, may miss the deadline, or may decide not to provide evidence.</p>
<p>Do not count a record twice when an earlier submission was corrected or replaced. Use stable record identifiers and the current platform state. Record the snapshot time so later changes have context.</p>

<h2>Review final evidence in a fixed order</h2>
<p>Use the same published decision sequence applied during ordinary operations. The <a href="/blog/fair-and-consistent-run-proof-review-checklist-for-organizers">run-proof review checklist</a> recommends separating event rules, configured fields, evidence, validation signals, and reviewer judgment. Check registration, event, category, activity type, activity date, distance, duration, identity fields, and required proof in the same order.</p>
<p>OCR mismatches, unusual values, and integrity flags are prompts for inspection, not proof of misconduct. Quick or bulk approval should remain limited to clean eligible pending results. A deadline does not turn a flagged, incomplete, or ineligible record into a clean one.</p>
<p>Use the current structured rejection reasons and useful detail where needed. Explain what failed and whether a correction path remains. Do not reject with “invalid” when the participant needs a specific, understandable next step.</p>

<h2>Handle corrections and exceptions explicitly</h2>
<p>Define which correction requests are still permitted under the published rules and platform workflow. A correction may replace missing or incorrect evidence; it should not silently create a new eligible activity after the activity window or bypass an expired submission boundary.</p>
<p>For an unusual exception, record the rule, evidence, decision, reviewer, timestamp, participant communication, and whether comparable records require the same treatment. Escalate conflicts of interest or high-impact cases to an authorized person who did not make the original disputed decision where practical.</p>
<p>The <a href="/blog/why-a-virtual-run-submission-may-be-rejected">submission-rejection guide</a> explains participant-facing correction context, while the <a href="/blog/what-counts-as-valid-run-proof-for-a-virtual-event">valid-proof guide</a> keeps evidence expectations distinct from unsupported fraud conclusions.</p>

<h2>Calibrate multiple reviewers before the final batch</h2>
<p>If more than one reviewer is working, compare a small set of representative cases before dividing the remainder. Discuss which published rule controls each decision, what evidence is sufficient, when detail is required, and what must be escalated.</p>
<p>Do not calibrate by approving the same percentage. Comparable process matters more than matching outcome totals. Two categories can legitimately have different approval patterns when the underlying records differ.</p>
<p>At the end, sample decisions across reviewers and categories for inconsistent reasoning, missing detail, or accidental reliance on undisclosed criteria. Correct the process and affected records; do not hide the inconsistency to preserve a completion date.</p>

<h2>Know when the review queue is actually clear</h2>
<p>A queue is clear when no reviewable submitted standard result or accumulated activity remains unresolved for the event, allowed corrections have reached a decision or documented expiry, and known exceptions have an owner and state. A zero count in one filtered view is not enough.</p>
<p>Check both standard and accumulated sources, all pages of the queue, active filters, and relevant search terms. Confirm that a reviewer did not leave a modal or draft decision without submission. Reconcile the final counts with the opening snapshot and recorded changes.</p>
<p>HelloRun's operational phase can show final review in progress while pending results remain after the final submission deadline. Once the pending result count reaches zero, it can present operational closeout. This derived phase is separate from manually setting the stored event status to closed.</p>

<h2>Verify results from approved records only</h2>
<p>HelloRun event leaderboards query approved records. Standard race-result leaderboards use approved standard submissions and can order eligible results by elapsed time under the configured settings. Accumulated leaderboards group approved accumulated activities by registration and sum their verified distance. Pending and rejected distance must not be described as official progress.</p>
<p>Check the event's configured leaderboard type, visibility, name-display mode, visible columns, category grouping, and flagged-result handling. Do not publish a private export as a substitute for the configured public presentation. Avoid exposing email, proof images, exact private routes, review notes, or unrelated personal information.</p>
<p>Inspect several positions, category boundaries, tied or near-tied records, participants with corrections, and accumulated totals. Confirm that the result page describes the ranking basis. A leaderboard is a configured recognition view, not universal proof of identity, device accuracy, athletic certification, or equal conditions.</p>

<h2>Distinguish provisional, checked, and corrected results</h2>
<p>Use “provisional” when review or corrections can still change the result set. Use “checked” when the organizer has completed the stated closeout review. If a material error is found later, publish a correction with the affected scope and date instead of pretending the earlier version never existed.</p>
<p>Do not announce final category winners while eligible pending records remain in that category. Do not use a social-media graphic as the authoritative results source unless the event rules explicitly established it and the information is accurate, accessible, and maintained.</p>
<p>Give participants a defined way to report a factual result error. Separate an evidence-review disagreement from a display typo, category mismatch, or name-display concern so it reaches the appropriate owner.</p>

<h2>Confirm standard certificate behavior</h2>
<p>For eligible standard results, HelloRun can generate a configured digital certificate after approval when certificates are enabled and an appropriate template is available. Certificate generation happens as supporting work and a generation failure does not reverse the underlying review decision.</p>
<p>Check that the certificate template reflects the event name, organizer, applicable distance, participant identity fields, and verification behavior. Test a representative issued certificate and its verification page. If generation failed, track regeneration separately from result approval and communicate the processing state honestly.</p>
<p>Do not promise a certificate to every registration. Eligibility, approved result state, event configuration, and successful generation matter. A certificate records the configured achievement; it does not certify health, device accuracy beyond reviewed evidence, or eligibility outside the event.</p>

<h2>Wait for accumulated certificate finalization</h2>
<p>Accumulated-distance certificates follow a different closeout path. HelloRun finalization becomes due after the final submission deadline, checks whether any accumulated activities for the event still have submitted status, and waits when the event-wide queue is not clear.</p>
<p>After final reviews, the finalizer calculates approved progress against the applicable goal. For a completed eligible registration, the certificate snapshot can record the selected goal, final approved distance, approved activity count, and finalization time. It preserves a prior certificate number when regeneration is required and avoids issuing a new certificate when the stored snapshot already matches.</p>
<p>Do not issue an early accumulated certificate from the first threshold-crossing activity as if it were the final verified total. Do not tell one participant that finalization is ready while another submitted activity still blocks the event-wide accumulated queue. Use the <a href="/blog/how-accumulated-distance-challenges-work">accumulated-distance guide</a> for the runner-facing target and finalization model.</p>

<h2>Check badges, rewards, and other recognition separately</h2>
<p>Certificates, badges, leaderboard placement, physical rewards, shop fulfilment, and organizer-created recognition are distinct. One being ready does not prove the others are complete. Build a recognition matrix with the published criterion, source record, owner, current state, delivery method, and exception path.</p>
<p>Badges may use configured event, distance, mode, milestone, rank, or organizer rules. Confirm the relevant badge definition and actual earned state rather than assuming every approved result earns every badge. Physical items require fulfilment records beyond platform approval.</p>
<p>Do not invent a consolation reward after results simply to soften a rejection unless it is consistent with published commitments and applied fairly. Recognition should remain truthful, non-discriminatory, and understandable.</p>

<h2>Reconcile payments, refunds, and fulfilment</h2>
<p>For paid events, closeout includes unresolved payment proofs, refund or cancellation commitments, disputed transactions, inclusions, shipping or pickup, and sponsor or vendor obligations. An approved run result does not automatically prove that every commercial obligation is settled.</p>
<p>Use the published <a href="/refund-and-cancellation-policy">Refund and Cancellation Policy</a> together with event-specific terms and actual payment records. Do not alter refund criteria retroactively. Record who owns each open case, what evidence is needed, and when the participant will hear back.</p>
<p>Keep financial exports restricted and separate from public results. Do not copy payment receipts into recognition files or expose account details while assembling a closeout report.</p>

<h2>Communicate closeout in the right order</h2>
<ol>
  <li><strong>Individual decisions first.</strong> Send or confirm approval, rejection, correction, refund, or support outcomes to affected participants.</li>
  <li><strong>Processing notices next.</strong> Explain when accumulated certificates or other recognition are still waiting on final review or generation.</li>
  <li><strong>Checked results after reconciliation.</strong> Link to the maintained result or leaderboard page and state the ranking basis.</li>
  <li><strong>Recognition instructions.</strong> Explain where eligible participants can find certificates, badges, rewards, or pickup details.</li>
  <li><strong>General thank-you last.</strong> Celebrate participation without implying that every entry received the same outcome.</li>
</ol>
<p>W3C guidance emphasizes concise, clear feedback about success, errors, and progress. Use meaningful headings, plain status language, direct links, and a support route. Do not communicate state only through color, icons, or an image poster.</p>

<h2>Protect privacy after active operations</h2>
<p>Closeout does not make proof images, payment receipts, routes, reviewer notes, contact details, or health-related information public. Limit access to people with an operational need, review shared folders and exported spreadsheets, and remove unnecessary local copies under the applicable retention schedule.</p>
<p>NPC principles require personal data to remain accurate, relevant, not excessive, retained only as long as necessary for the declared or lawful purpose, and protected through appropriate organizational, physical, and technical measures. The organizer should document retention and disposal conditions rather than deleting everything immediately or keeping everything forever.</p>
<p>Use the <a href="/privacy">Privacy Policy</a>, <a href="/data-usage-policy">Data Usage Policy</a>, and <a href="/organiser-terms">Organiser Terms</a> for current platform and organizer responsibilities. Obtain qualified advice for the organizer's own legal retention duties.</p>

<h2>Use the closed event status carefully</h2>
<p>In HelloRun's organizer lifecycle, a published event can transition to closed. Once closed, ordinary organizer editing is blocked and the organizer status route does not provide a transition back. Existing participant and operational records remain available.</p>
<p>Therefore, do not close the stored event status merely because the activity period ended. First verify deadlines, queues, results, recognition, material corrections, participant communications, and outstanding operational duties. If event details still need a legitimate correction, resolve it before applying the irreversible organizer transition.</p>
<p>Archived is a separate lifecycle state and should not be treated as a synonym for closing. Do not claim that setting closed deletes records, hides every public surface, cancels unresolved obligations, or completes certificate generation.</p>

<h2>Keep an exception register</h2>
<p>Not every issue will be resolved on the desired announcement date. An exception register allows closeout to remain truthful. For each item, record a reference identifier, issue type, affected scope, current state, owner, next action, target update, participant communication, and final resolution.</p>
<p>Examples include a certificate-generation failure, disputed correction, missing fulfilment address, refund review, duplicate result, category configuration error, or privacy request. Store only the information necessary to coordinate the issue.</p>
<p>Do not label an unresolved participant as difficult or suspicious. Describe the operational facts. Close the item only when the underlying action and communication are complete.</p>

<h2>Run a small final audit</h2>
<ul>
  <li>Check all structured dates and timezone labels.</li>
  <li>Confirm no valid submission or correction window remains unexpectedly open.</li>
  <li>Confirm standard and accumulated pending queues are reconciled.</li>
  <li>Sample approvals and rejections across categories and reviewers.</li>
  <li>Compare approved counts with leaderboard and recognition outputs.</li>
  <li>Test representative standard and accumulated certificates at the correct lifecycle point.</li>
  <li>Check names, categories, distances, durations, totals, and display privacy.</li>
  <li>Verify participant-facing links and accessible status messages.</li>
  <li>Reconcile payment, refund, reward, and fulfilment exceptions.</li>
  <li>Restrict or dispose of unnecessary local exports.</li>
  <li>Record known limitations rather than converting them into false completion claims.</li>
</ul>

<h2>Three illustrative closeout scenarios</h2>
<p>These examples demonstrate operational decisions, not outcomes every event will share.</p>
<h3>Scenario 1: standard event with two pending proofs</h3>
<p>A 10K virtual event reaches its final submission deadline with two submitted records. The organizer postpones the “final results” message, reviews both under the published proof criteria, approves one, rejects the other with a specific correction explanation after the correction window has ended, and reconciles the approved leaderboard. Standard certificates are checked separately. Only then does the organizer send the checked-results message and consider closing the event status.</p>
<h3>Scenario 2: accumulated challenge waiting on one activity</h3>
<p>An accumulated event has many runners above their selected goals, but one submitted activity remains in the event queue. The organizer does not promise that all final certificates are ready. The outstanding activity is reviewed, the queue reaches zero, and the finalizer can calculate eligible certificate snapshots from final approved distance. A previously earned badge does not substitute for that certificate process.</p>
<h3>Scenario 3: results correction after announcement</h3>
<p>A category assignment error is found after checked results were announced. The organizer confirms the configured registration category and approved record, corrects the display through the authorized workflow, records the affected scope, and publishes a dated correction. The earlier message is not silently deleted, and unrelated proof or participant details are not disclosed.</p>

<h2>A copyable closeout worksheet</h2>
<ul>
  <li><strong>Event and owner:</strong> title, reference, organizer, closeout lead, and approver.</li>
  <li><strong>Boundaries:</strong> registration close, activity end, final submission deadline, timezone, and correction boundary.</li>
  <li><strong>Rules snapshot:</strong> authoritative rules URL or version and material changes.</li>
  <li><strong>Standard results:</strong> submitted, approved, rejected, corrected, and unresolved counts.</li>
  <li><strong>Accumulated activities:</strong> submitted, approved, rejected, finalization state, and unresolved count.</li>
  <li><strong>Results:</strong> approved population checked, category grouping, ranking basis, visibility, and correction route.</li>
  <li><strong>Recognition:</strong> standard certificates, accumulated certificates, badges, rewards, and fulfilment by state.</li>
  <li><strong>Commercial cases:</strong> pending payments, refunds, disputes, inclusions, pickup, or shipping.</li>
  <li><strong>Communications:</strong> individual outcomes, processing notice, results notice, recognition instructions, and thank-you.</li>
  <li><strong>Privacy:</strong> exports, access owners, retention basis, disposal date, and outstanding rights requests.</li>
  <li><strong>Exceptions:</strong> reference, owner, next action, target update, and final resolution.</li>
  <li><strong>Lifecycle decision:</strong> remain published, operational closeout complete, or transition to closed.</li>
</ul>

<h2>Post-event review without rewriting history</h2>
<p>Within a reasonable period, hold a short retrospective with the people who handled registration, review, communication, privacy, payment, and fulfilment. Compare the opening queue snapshot, exception register, support themes, correction patterns, and actual workload with the original plan.</p>
<p>Ask which rule caused repeated questions, which evidence field created unnecessary review, where participants lacked status visibility, whether categories or recognition promises were coherent, and which exports or manual handoffs created privacy risk. Distinguish product limitations from organizer process decisions.</p>
<p>Convert lessons into changes for the next event's rules, configuration, staffing, and communication timeline. Preserve the old event record and dated decision evidence. Do not edit historical claims to make the retrospective look cleaner.</p>

<h2>Final virtual-run closeout checklist</h2>
<ul>
  <li>I separated activity end, final submission, final review, operational closeout, and stored event closure.</li>
  <li>I reviewed against published criteria and documented material changes.</li>
  <li>I reconciled standard results and accumulated activities across all relevant states.</li>
  <li>I treated validation signals as inspection prompts rather than automatic misconduct findings.</li>
  <li>I confirmed pending and rejected records do not count as official approved results.</li>
  <li>I checked leaderboard configuration, categories, ranking basis, and privacy presentation.</li>
  <li>I kept standard certificate issuance distinct from accumulated certificate finalization.</li>
  <li>I checked badges, rewards, fulfilment, refunds, and payments as separate workstreams.</li>
  <li>I communicated individual outcomes before the broad completion message.</li>
  <li>I preserved a correction path and documented unresolved exceptions.</li>
  <li>I restricted local exports and applied a documented retention and disposal approach.</li>
  <li>I understand that closed locks ordinary organizer editing and does not erase unresolved duties.</li>
</ul>

<h2>Your practical next step</h2>
<p>Open the organizer event workspace and copy the worksheet into a restricted closeout record. Enter the actual activity end, final submission deadline, timezone, standard pending count, accumulated pending count, payment exceptions, recognition states, and communications still required. Assign an owner to every non-zero or unknown item.</p>
<p>Do not schedule the final announcement or close the event status from memory. First take the queue snapshot, finish the highest-impact reviews, and verify the approved result set. If an exception remains, communicate its real state and next update instead of hiding it behind “event complete.”</p>
<p>Use <a href="/events">Events</a> to check the public event presentation, <a href="/how-it-works">How It Works</a> for the participant journey, and the <a href="/faq">FAQ</a> for current submission, accumulated challenge, leaderboard, and certificate explanations.</p>

<h2>Review note</h2>
<p>Sources and HelloRun behavior were reviewed in August 2026. Search Console validation of the working title remains pending and is not represented as complete. Later platform changes, published event rules, applicable requirements, and documented participant decisions take precedence.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Virtual-run closeout in one minute',
  'How this guide was prepared',
  'Official and platform sources',
  'Define what “closed” means before using the word',
  'Separate every closing boundary',
  'Freeze rules and preserve material-change records',
  'Build one closeout control sheet',
  'Take an opening snapshot of every queue',
  'Review final evidence in a fixed order',
  'Handle corrections and exceptions explicitly',
  'Know when the review queue is actually clear',
  'Verify results from approved records only',
  'Distinguish provisional, checked, and corrected results',
  'Confirm standard certificate behavior',
  'Wait for accumulated certificate finalization',
  'Check badges, rewards, and other recognition separately',
  'Communicate closeout in the right order',
  'Protect privacy after active operations',
  'Use the closed event status carefully',
  'Keep an exception register',
  'Run a small final audit',
  'Three illustrative closeout scenarios',
  'A copyable closeout worksheet',
  'Post-event review without rewriting history',
  'Final virtual-run closeout checklist',
  'Your practical next step',
  'Review note'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/how-it-works',
  '/faq',
  '/privacy',
  '/data-usage-policy',
  '/organiser-terms',
  '/refund-and-cancellation-policy',
  '/blog/how-to-write-clear-virtual-run-rules-participants-can-follow',
  '/blog/participant-communication-timeline-virtual-running-events',
  '/blog/how-to-design-fair-distance-categories-and-challenge-goals',
  '/blog/fair-and-consistent-run-proof-review-checklist-for-organizers',
  '/blog/why-a-virtual-run-submission-may-be-rejected',
  '/blog/what-counts-as-valid-run-proof-for-a-virtual-event',
  '/blog/how-accumulated-distance-challenges-work'
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
  if (/<h[12]>How to Close a Virtual Run/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/every (?:submission|result) (?:must|should|will) be approved|approve all remaining (?:submissions|results)/i.test(text)) errors.push('article must not require universal approval');
  if (/(?:pending|rejected) (?:results?|distance|activities) (?:count|counts|qualify) as (?:official|approved)|pending results? are final results/i.test(text)) errors.push('article must preserve approved-only results');
  if (/(?:ocr|integrity flag|unusual result) (?:proves|confirms|means) fraud|automatically reject every flagged/i.test(text)) errors.push('article must not treat signals as misconduct proof');
  if (/every (?:runner|registration|participant) (?:receives|is guaranteed) (?:a )?(?:certificate|badge|reward)|all registrants earn recognition/i.test(text)) errors.push('article must not guarantee recognition');
  if (/standard and accumulated certificates? (?:are|work) (?:the same|identically)|accumulated certificates? issue immediately on threshold/i.test(text)) errors.push('article must preserve certificate lifecycle differences');
  if (/closing the event (?:deletes|erases) (?:all )?(?:records|obligations)|closed status completes every obligation/i.test(text)) errors.push('article must not misstate event closure');
  if (/organizers? can reopen (?:a )?closed event|closed events? can transition back/i.test(text)) errors.push('article must not invent a reopen transition');
  if (/publish (?:proof images|payment receipts|private review notes|email addresses) (?:in|with|as) (?:the )?(?:results|leaderboard)/i.test(text)) errors.push('article must not expose private records');
  if (/keep (?:all )?personal data forever|delete all participant data immediately/i.test(text)) errors.push('article must not prescribe indiscriminate retention');
  if (/this checklist guarantees? (?:fairness|accuracy|an error-free closeout)|eliminates every error/i.test(text)) errors.push('article must not guarantee closeout outcomes');
  if (!/reviewed in August 2026 against current HelloRun event lifecycle/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/Search Console validation of the working title remains pending/i.test(text)) errors.push('article must preserve Search Console validation status');
  if (!/pending and rejected distance must not be described as official progress/i.test(text)) errors.push('article must define approved result boundary');
  if (!/Once closed, ordinary organizer editing is blocked/i.test(text)) errors.push('article must define closed-event behavior');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid virtual-run closeout payload: ${errors.join('; ')}`);
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
