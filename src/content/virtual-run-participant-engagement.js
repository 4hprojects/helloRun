'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='virtual-run-participant-engagement';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'How to Keep Virtual Run Participants Engaged Until the Finish',excerpt:'Plan an inclusive participant journey from registration through progress, proof, recognition, feedback, and an optional next event—without relying on spam or pressure.',category:'Organizer Guide',tags:Object.freeze(['participant engagement','virtual event engagement','running challenge engagement','virtual challenge ideas','race communication','runner milestones','event reminders','organizer engagement']),seoTitle:'How to Keep Virtual Run Participants Engaged Until the Finish',seoDescription:'Keep virtual-run participants involved from registration to completion using clear milestones, reminders, progress visibility, recognition, and useful communication.',coverImageAlt:'Isometric Filipino organizer guiding diverse virtual-run participants through milestones, proof, and inclusive recognition'});
const RAW_CONTENT_HTML=`
<p>Strong <strong>virtual run participant engagement</strong> does not come from sending the most messages. It comes from designing a coherent journey: registration sets accurate expectations, the start message makes the first action easy, progress feels visible, reminders arrive when useful, proof is understandable, and recognition matches the accomplishment.</p>
<p>Organizers cannot manufacture motivation for every runner. Work, health, weather, caregiving, access, and changing priorities affect participation. The goal is to remove avoidable confusion and make returning to the event straightforward—without shame, manipulation, public pressure, or unwanted contact.</p>
<blockquote><strong>The engagement principle:</strong> every message should help a participant understand, act, recover from a problem, or feel truthfully recognized.</blockquote>

<h2>Engagement starts before the activity begins</h2>
<p>The participant journey begins with the event page, not the opening day. A clear title, format, dates, distance or challenge goal, allowed activities, proof method, fees, inclusions, and support path help people decide whether the event fits them.</p>
<p>Misleading urgency may increase clicks while damaging completion and trust. Do not hide difficult rules after payment or imply that every participant will receive a finisher award regardless of the published eligibility.</p>
<p>The <a href="/blog/how-to-promote-a-virtual-run">virtual-run promotion guide</a> helps align the promise with the actual experience. Recruit people who understand the event rather than optimizing only for registration volume.</p>

<h2>Set expectations during registration</h2>
<p>At registration, repeat the essential decisions in plain language: participation window, timezone, category, completion method, accepted activity types, proof fields, review process, deadline, recognition, and contact route. Link to the full rules without forcing participants to remember a social post.</p>
<p>Ask only for information needed to operate the event. The Philippine Data Privacy Act emphasizes transparency, legitimate purpose, and proportionality in the <a href="https://privacy.gov.ph/data-privacy-act/">National Privacy Commission’s published law</a>. Explain what participant data supports communication, results, and recognition.</p>
<p>Send or display a confirmation that the runner can find later. Include the selected category and next milestone. If payment or organizer verification remains pending, say so rather than presenting registration as final.</p>

<h2>Map the participant journey before launch</h2>
<p>Create a timeline from discovery to post-event follow-up. Mark decisions and likely failure points: incomplete payment, missing waiver, start uncertainty, no first activity, progress below expectation, rejected proof, approaching deadline, pending review, approved completion, certificate availability, and feedback.</p>
<p>For each point, define who should receive a message, what action it supports, what data selects the audience, which channel is appropriate, and who handles replies. A blanket message to everyone often gives the wrong instruction to someone.</p>
<p>The <a href="/blog/participant-communication-timeline-virtual-running-events">participant communication timeline</a> provides operational checkpoints. Assign owners and prepare templates before the event becomes busy.</p>

<h2>Send a useful pre-start message</h2>
<p>A pre-start message should orient, not hype. State when activity becomes eligible, where rules live, how progress or proof works, what to test, and where to ask questions. Include a short checklist and one primary action.</p>
<p>Encourage participants to test their chosen tracker and review route privacy before an important activity. If weather or safety conditions matter, direct people to current local information and remind them they may adjust within the event rules.</p>
<p>Avoid sending the same full rulebook repeatedly. Link to one maintained source so corrections do not leave several conflicting copies in circulation.</p>

<h2>Make the first action small and obvious</h2>
<p>For a month-long challenge, “complete the whole goal” is too distant to guide today. The first action might be checking the dashboard, testing the tracker, planning one eligible walk or run, or reviewing the submission flow.</p>
<p>Use a direct label that matches the destination. “View event rules” is clearer than “Learn more.” W3C guidance on <a href="https://www.w3.org/WAI/fundamentals/accessibility-principles/">accessibility principles</a> recommends readable, understandable content and clear navigation.</p>
<p>Do not create an artificial task solely to generate activity. Every step should reduce uncertainty or move the participant toward the event goal.</p>

<h2>Show participants what progress means</h2>
<p>Progress must match the completion metric. A single-activity event may show submitted and approved status. An accumulated challenge may show approved distance or steps toward a goal. A participation event may show eligible activity count.</p>
<p>Distinguish recorded, submitted, pending, approved, rejected, and remaining values. A participant who uploaded 10 km but has 5 km approved needs to see both facts. Do not label pending evidence as completed progress.</p>
<p>Explain rounding and update timing. If dashboards are delayed, say when data normally refreshes and how to report a mismatch.</p>

<h2>Use milestones that fit the challenge</h2>
<p>Milestones divide a distant goal into meaningful stages. They might represent a first approved activity, a quarter of an accumulated distance, consistent participation across weeks, or completion of a category.</p>
<p>Choose thresholds before launch and apply them consistently. Avoid adding a surprise competitive requirement after people have started. A badge can recognize progress without pretending the final goal is complete.</p>
<p>Milestones should not pressure someone to make an unsafe leap. A runner who starts late may need a different future event, not messages telling them to compress a month of activity into a weekend.</p>

<h2>Use leaderboards carefully</h2>
<p>Leaderboards can create interest for participants who enjoy comparison, but they can discourage others or encourage questionable activity when treated as the only story. Publish the metric, eligible population, tie method, update schedule, privacy choices, and finalization rule.</p>
<p>The <a href="/blog/how-leaderboards-work-virtual-running-events">virtual leaderboard guide</a> explains verified results, provisional positions, filters, and fairness. Label incomplete standings as provisional and do not celebrate a winner before review closes.</p>
<p>Offer non-ranked progress views or personal goals where practical. Never expose a participant’s location or other unrelated personal data to make a ranking more engaging.</p>

<h2>Highlight participation beyond the top performers</h2>
<p>Feature a range of truthful stories: a first approved walk, consistent weekly progress, a return after a break, a team supporting one another, or a participant completing within their chosen category. Obtain permission before sharing names, photos, quotes, or activity details.</p>
<p>Rotate recognition rather than repeatedly selecting the most visible accounts. Publish the criteria if a spotlight is judged or sponsored. Avoid tokenizing participants by disability, age, body size, or background.</p>
<p>Recognition should not reveal pace, route, health information, or personal circumstances the participant did not agree to share.</p>

<h2>Build an inclusive community tone</h2>
<p>Use language that welcomes runners, walkers, run-walk participants, and supported categories only where the rules allow them. Do not use “real runner” as a pace threshold or mock someone for a short activity.</p>
<p>Provide key instructions in formats your audience can use. Use readable text rather than burying deadlines inside posters, add text alternatives to meaningful images, caption video, and keep contrast and type size practical.</p>
<p>Moderate community spaces with published standards. Remove harassment, impersonation, dangerous advice, and unauthorized personal-data sharing. Engagement is not an excuse to maximize comments at someone’s expense.</p>

<h2>Remind without spamming</h2>
<p>Send messages because a milestone or participant state makes them useful: start opened, no activity yet, deadline approaching, proof incomplete, review updated, or recognition ready. Segment audiences so finishers do not keep receiving “start now” reminders.</p>
<p>Separate operational messages from promotional subscriptions. Google’s current <a href="https://support.google.com/mail/answer/81126">email sender guidelines</a> require authentication for senders to Gmail accounts and add unsubscribe obligations for relevant high-volume marketing or subscribed messages. Applicable law and other providers may impose more.</p>
<p>Use a recognizable sender, descriptive subject, one main action, and a support route. Monitor delivery failures and complaints. More frequency is not a substitute for clearer content.</p>

<h2>Coordinate channels instead of duplicating noise</h2>
<p>Email, in-app notices, dashboards, event pages, and social channels serve different purposes. Put authoritative rules and status in the event platform; use messages to point people there. Social reminders should not become the only source of deadlines.</p>
<p>Keep terminology and dates consistent across channels. When a rule changes under an allowed correction process, update the source, log the change, notify affected participants, and state what changed.</p>
<p>Provide a fallback for participants who cannot access one channel. Do not require joining an unrelated private social group unless that requirement was disclosed and justified.</p>

<h2>Encourage proof submission before the deadline</h2>
<p>Explain proof requirements before the activity, then remind participants with enough time to correct a problem. Include where to submit, required fields, accepted formats, timezone, deadline, and what confirmation looks like.</p>
<p>Avoid “last chance” messages that arrive after support closes. Schedule the strongest reminder while the organizer can still answer questions.</p>
<p>Link to a maintained guide such as <a href="/blog/how-to-submit-run-proof-correctly-hellorun">how to submit HelloRun proof</a>. Remind runners to preserve the original activity until review is complete.</p>

<h2>Respond clearly to incomplete or rejected submissions</h2>
<p>A rejection should identify the rule or missing evidence, state what can be corrected, provide the resubmission path and deadline, and explain escalation or appeal where available. “Invalid” alone does not help a participant recover.</p>
<p>The <a href="/blog/fair-and-consistent-run-proof-review-checklist-for-organizers">proof-review checklist</a> supports consistent decisions. Use reason categories internally, allow reviewer notes where needed, and protect private evidence from public discussion.</p>
<p>Do not shame a participant or imply intentional fraud without appropriate review. Differentiate technical mistakes, rule mismatches, duplication, and suspected manipulation.</p>

<h2>Celebrate approved completion accurately</h2>
<p>Send recognition after the qualifying status is reached. Name the event, participant as permitted, category or goal, approved result when relevant, and available certificate or badge. Keep provisional language out of final recognition.</p>
<p>A celebration can be warm without exaggeration. Do not call a participation certificate a race win or imply that platform verification proves medical fitness, identity beyond the process, or route safety.</p>
<p>Give participants privacy-respecting share options and a direct way to report a name or result error.</p>

<h2>Use certificates and badges as records</h2>
<p>A certificate is strongest when it connects the participant to an event-defined approved accomplishment. A badge can represent a milestone, category, or verified award. Both should use clear labels and stable verification where supported.</p>
<p>The <a href="/blog/how-to-create-a-virtual-run-certificate">virtual-run certificate guide</a> covers participant name, event identity, metrics, dates, verification, accessibility, issuance, correction, and revocation.</p>
<p>Do not promise immediate files if generation or final review takes time. Communicate the expected availability and support process.</p>

<h2>Ask for feedback at the right time</h2>
<p>Ask soon enough that the experience is fresh but not while a participant is still waiting for review. Keep the survey short, explain its purpose, and distinguish anonymous from identifiable responses.</p>
<p>Ask actionable questions: which instruction was unclear, where tracking or proof became difficult, whether reminders arrived at useful times, and whether recognition matched expectations. Include an open field without requiring sensitive details.</p>
<p>Report what changed when feedback produces an improvement. Do not offer a reward that pressures participants to provide only positive public reviews.</p>

<h2>Invite participants to a next event respectfully</h2>
<p>A next-event invitation should follow completion or closure, not interrupt an unresolved problem. Recommend options based on published format and stated interest, not inferred health or aggressive assumptions about progression.</p>
<p>Explain why the next event may fit and provide a clear choice. Do not auto-register anyone, carry payment without authorization, or imply that rest means losing status.</p>
<p>Transparent pricing matters to retention. The <a href="/blog/virtual-run-registration-fee-pricing">virtual-run pricing guide</a> helps organizers explain inclusions, delivery, fees, and refund expectations.</p>

<h2>Measure engagement without distorting it</h2>
<p>Registration count alone does not show participant success. Track useful operational measures such as confirmation delivery, first eligible activity, submission completion, approval, support volume, resolution time, certificate access, opt-out, and feedback response.</p>
<p>Define each measure. A dashboard visit is not the same as a completed run; an email open is uncertain and may involve privacy-sensitive tracking. Collect only data that supports a declared purpose.</p>
<p>Compare segments carefully and avoid blaming participants for product barriers. Use findings to improve instructions, timing, accessibility, review staffing, and event design.</p>

<h2>Build a participant-support response playbook</h2>
<p>Engagement often depends on what happens after someone replies. Prepare answers and escalation routes for payment status, category corrections, forgotten passwords, tracking failures, privacy concerns, inaccessible instructions, duplicate submissions, proof rejection, result correction, certificate errors, refunds, and complaints. A quick but wrong answer creates more work than a careful, traceable one.</p>
<p>Give support staff the current rule source, event timezone, role permissions, standard response language, and the boundary between a routine correction and an organizer decision. They should know what they may view, edit, approve, or promise. Never ask a participant to send passwords, full payment credentials, government identifiers, or health details through an informal chat.</p>
<p>Use a case reference or documented thread so the participant does not repeat the same story across channels. Record the issue, action, owner, next update, and resolution without collecting irrelevant information. When several people report the same confusion, correct the event instructions and notify the affected group instead of treating every report as an isolated mistake.</p>
<p>Publish realistic response hours. An instant automated acknowledgement may confirm receipt, but it must not pretend a person reviewed the case. For deadline-sensitive problems, define how evidence received before the cut-off will be handled if staff respond later.</p>
<p>Close the loop. Tell the participant what changed, whether any action remains, and where the authoritative status appears. Review support themes after the event; repeated questions often reveal a journey problem that another reminder alone will not solve.</p>
<p>Test the playbook with a new team member. If they cannot find the correct answer and escalation owner, simplify the documentation before participants depend on it.</p>

<h2>HelloRun’s current engagement touchpoints</h2>
<p>As of September 13, 2026, HelloRun supports registration status, runner dashboards, progress and submission states, organizer review, certificates, badges, and event-related communications. Current registered event reminders include an event-started reminder for eligible participants and a submission reminder for eligible runners with no activity as the deadline approaches.</p>
<p>These automations do not replace a complete journey design. Organizers must still publish clear rules, configure accurate dates and goals, review evidence consistently, and answer participant questions. Available notifications and interface labels can change.</p>
<p>Do not claim a custom broadcast, milestone sequence, or delivery guarantee unless it exists in the live configuration. Test communications with controlled accounts before launch.</p>

<h2>A practical engagement map</h2>
<ul><li><strong>Registration:</strong> accurate promise, category, rules, privacy, confirmation.</li><li><strong>Before start:</strong> orientation, tracker test, one clear first action.</li><li><strong>Start:</strong> eligible window open and progress explanation.</li><li><strong>During:</strong> truthful milestones, inclusive stories, segmented support.</li><li><strong>Before deadline:</strong> proof checklist while correction is possible.</li><li><strong>Review:</strong> visible status and actionable rejection reasons.</li><li><strong>Completion:</strong> approved recognition, certificate or badge, correction path.</li><li><strong>Closure:</strong> final results, feedback, retention, and optional next event.</li></ul>

<h2>Frequently asked questions</h2>
<h3>How often should we message participants?</h3><p>There is no universal frequency. Send when a milestone or participant state makes the message useful, segment recipients, and monitor opt-outs and complaints.</p>
<h3>Do leaderboards improve engagement?</h3><p>They can engage some participants, but should not be the only progress view. Publish rules, protect privacy, and celebrate more than top positions.</p>
<h3>Should we reward every milestone?</h3><p>No. Use a small set of meaningful, predefined milestones. Too many awards can confuse the final accomplishment.</p>
<h3>What should a rejection message include?</h3><p>The relevant rule or missing item, correction path, deadline, and support or appeal route where available.</p>
<h3>How do we retain participants?</h3><p>Deliver the promised event well, close unresolved issues, ask for feedback, and offer a relevant optional next step without pressure.</p>

<h2>Official and platform sources</h2>
<p>This guide was reviewed in September 2026 against the Philippine Data Privacy Act, W3C accessibility principles, Google’s current sender guidance, and HelloRun’s current event-start, proof-reminder, review, progress, certificate, and badge behavior. Design the participant journey before launch so communication, progress, proof, and recognition feel like one event rather than separate tasks.</p>`;
const REQUIRED_HEADINGS=Object.freeze(['Engagement starts before the activity begins','Set expectations during registration','Map the participant journey before launch','Send a useful pre-start message','Make the first action small and obvious','Show participants what progress means','Use milestones that fit the challenge','Use leaderboards carefully','Highlight participation beyond the top performers','Build an inclusive community tone','Remind without spamming','Coordinate channels instead of duplicating noise','Encourage proof submission before the deadline','Respond clearly to incomplete or rejected submissions','Celebrate approved completion accurately','Use certificates and badges as records','Ask for feedback at the right time','Invite participants to a next event respectfully','Measure engagement without distorting it','HelloRun’s current engagement touchpoints','A practical engagement map','Frequently asked questions','Official and platform sources']);
const REQUIRED_LINKS=Object.freeze(['href="/blog/participant-communication-timeline-virtual-running-events"','href="/blog/how-to-promote-a-virtual-run"','href="/blog/virtual-run-registration-fee-pricing"','href="/blog/how-to-create-a-virtual-run-certificate"','href="/blog/fair-and-consistent-run-proof-review-checklist-for-organizers"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wc=contentText.split(/\s+/).filter(Boolean).length,p={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wc/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(p);return p}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),wc=t.split(/\s+/).filter(Boolean).length;if(wc<2500||wc>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||!p.excerpt||p.excerpt.length>220||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8||p.tags.some(x=>!x||x.length>30))e.push('tags');if(/<h1\b/i.test(p.contentHtml))e.push('h1');if(/message participants every day|more messages always improve engagement/i.test(t))e.push('spam');if(/shame inactive participants|publicly shame rejected runners/i.test(t))e.push('pressure');if(/pending proof counts as completion|registration guarantees completion/i.test(t))e.push('status');if(!/virtual run participant engagement/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes('<h2>'+h+'</h2>'))e.push('heading '+h);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push('link '+l);if(e.length)throw new Error('Invalid engagement guide payload: '+e.join('; '));return true}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
