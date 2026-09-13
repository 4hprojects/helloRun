'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='how-to-review-a-virtual-run-after-it-ends';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'How to Review a Virtual Run After It Ends',excerpt:'Run a practical post-event review across registration, participation, proof, support, communication, privacy, recognition, finances, and next actions.',category:'Organizer Guide',tags:Object.freeze(['event post mortem','post event evaluation','event review','event debrief','virtual event evaluation','running event retrospective','event operations','event organizer']),seoTitle:'How to Review a Virtual Run After It Ends',seoDescription:'Run a practical virtual-event review covering registration, completion, proof, communication, support, feedback, costs, recognition, and improvements.',coverImageAlt:'Filipino virtual-run team reviewing evidence, lessons, and assigned improvements after an event'});
const RAW_CONTENT_HTML=`
<p>An <strong>event post mortem</strong> turns a completed virtual run into evidence and assigned improvements. It is not a search for someone to blame, a celebration deck that hides operational problems, or a quick meeting held while participant cases remain unresolved.</p>
<p>A useful review compares the original purpose and plan with what actually happened across registration, payment, activity, proof, review, results, recognition, support, communication, privacy, and finance. It combines defined metrics with participant and staff experience, records limitations, and gives every accepted action an owner and date.</p>
<p>The process below can serve a public event, school, workplace, club, nonprofit, or private community. Adapt access, safeguarding, privacy, financial, and governance requirements to the setting.</p>

<h2>Review after operational work is actually complete</h2>
<p>Choose the review date after the activity window, proof deadline, correction period, final review, refund processing, result finalization, certificate correction window, and urgent support work are complete or clearly accounted for. A premature meeting confuses provisional numbers with final outcomes.</p>
<p>Do not wait so long that logs disappear and memories become stories. Schedule a short hot debrief for immediate incidents and a formal retrospective after stable closeout. Label unresolved items and bring them back to the final record.</p>
<p>Confirm who facilitates, who records, who owns event data, and who can approve changes. Include people close to registration, review, support, communication, finance, technology, privacy, accessibility, and safeguarding as relevant.</p>

<h2>Restate the event's original goal</h2>
<p>Open with the approved purpose, intended participants, promised experience, success measures, constraints, and exclusions. This prevents the team from judging a beginner participation event mainly by fastest times or a fundraiser mainly by social reactions.</p>
<p>List material changes made after launch: dates, capacity, categories, prices, proof, recognition, communication, staffing, or platform behavior. Explain who approved each change and which participants were affected.</p>
<p>If the goal was vague, record that as a design lesson. Do not rewrite it after seeing results. A stronger purpose becomes an action for the next event.</p>

<h2>Build one evidence pack</h2>
<p>Prepare a controlled evidence pack before discussion: approved plan, event-page version, rules, schedule, communications, metric definitions, registration and payment reconciliation, proof workflow summary, support themes, incident record, feedback, result snapshot, certificate log, privacy record, and financial report.</p>
<p>Use aggregate information in the main meeting. Restrict participant-level evidence to authorized people and only when a case genuinely requires it. Redact screenshots, addresses, routes, health details, payment identifiers, and private messages from broad presentation materials.</p>
<p>Record query dates, filters, exclusions, time zones, missing data, and definition changes. The <a href="/blog/virtual-run-metrics-organizers-should-track">virtual run metrics guide</a> provides formulas and data-quality checks.</p>
<p>Give the pack an owner, version, access list, retention date, and change log. Meeting participants should comment on the same approved evidence rather than presenting conflicting private spreadsheets. When a number changes during reconciliation, preserve both snapshots, the reason, and the person who authorized the correction.</p>

<h2>Review registration</h2>
<p>Compare planned capacity with completed valid registrations, canceled or duplicate records, category distribution, registration timing, source where legitimately known, and onboarding completion. Examine abandonment or confusion only when the source data supports it.</p>
<p>Review repeated questions: eligibility, dates, accepted activities, category differences, name format, team assignment, privacy, or account access. Identify whether the event page, form, confirmation, or support process created each friction.</p>
<p>Check inclusion across intended audiences without exposing small groups or inferring sensitive traits. A raw total cannot show whether instructions were accessible or participation was genuinely voluntary.</p>

<h2>Review payment and refunds</h2>
<p>Reconcile registration status with successful payments, complimentary entries, pending matches, failed payments, manual transfers, refunds, disputes, and canceled entries. Document differences between system records and processor settlement.</p>
<p>Evaluate whether total price, required charges, optional items, delivery, inclusions, exclusions, cancellation, and refund terms were visible before commitment. Count support and correction cases caused by unclear payment references or delayed matching.</p>
<p>Restrict financial records and remove unnecessary identifiers from review materials. Assign reconciliation exceptions rather than leaving them as unexplained totals.</p>

<h2>Review participation</h2>
<p>Report eligible registrations, starters, active participants by defined interval, milestone reach, withdrawals, and approved finishers. State every denominator. Segment by category or team only when group size, purpose, privacy, and interpretation permit it.</p>
<p>Compare actual activity demand with what the category implied. Did participants need an extreme final-week catch-up? Did one contributor dominate a team? Did a daily requirement create unnecessary pressure? These are design questions, not evidence of personal failure.</p>
<p>Acknowledge walking, run-walk, private, accessible, and noncompetitive participation where the event promised it. Do not treat public leaderboard activity as the full participant population.</p>

<h2>Review proof submission</h2>
<p>Map the submission journey from instructions to upload, validation, status display, correction, and confirmation. Count unique submitters, total evidence items, duplicates, incomplete uploads, technical failures, late submissions, and the most common correction reasons.</p>
<p>Compare actual evidence with the published rule. If reviewers needed information not requested on the event page, that is an organizer defect. If the platform accepted a format the rule prohibited, configuration and copy were misaligned.</p>
<p>Identify unnecessary data. Fitness screenshots may expose routes and other personal context. The next event should request only fields needed for the eligibility decision.</p>

<h2>Review proof decisions for fairness</h2>
<p>Use the <a href="/blog/fair-and-consistent-run-proof-review-checklist-for-organizers">fair proof-review checklist</a> to examine first-pass approval, correction, rejection, escalation, reversal, and reviewer disagreement. Sample decisions across dates, categories, reviewers, and common reasons.</p>
<p>Check whether similar evidence received similar treatment. Review documented exceptions and conflicts of interest. Do not use speed alone as quality; a rapid queue can still be inconsistent.</p>
<p>Preserve an audit trail. When a rule or configuration caused unfairness, describe the remedy applied during the event and the prevention action for next time.</p>

<h2>Review correction and support cases</h2>
<p>Summarize unique cases, message volume, channel, topic, first response, final resolution, reopening, escalation, and unresolved age. Separate participant waiting time from organizer waiting time when possible.</p>
<p>Read a responsible sample to find friction that categories miss. Repeated “How do I know this is approved?” questions may point to status design or communication, not weak support effort.</p>
<p>Evaluate staffing, handoffs, templates, language, accessibility, safeguarding escalation, and access controls. Recognize good recovery while still fixing the source problem.</p>

<h2>Review results and finalization</h2>
<p>Confirm when results became provisional and final, how ties were handled, how corrections flowed into displays, and whether public data matched participant privacy choices. Reconcile finisher counts with approved eligibility.</p>
<p>Inspect ranking or team calculations with sample cases. Document rounding, contribution caps, duplicates, withdrawn participants, renamed categories, and late administrative corrections.</p>
<p>Record every post-final change with approval and notification. “Final” should have a clear operational meaning rather than shifting whenever someone asks.</p>

<h2>Review certificates and recognition</h2>
<p>Compare promised recognition with actual delivery date, eligibility source, names, categories, templates, corrections, and undelivered items. Distinguish finisher certificates, participation acknowledgments, awards, merchandise, and consent-based public stories.</p>
<p>Count name and category errors, failed delivery, reissues, unresolved requests, and time spent. Trace common errors back to registration, approval, export, template, or manual handling.</p>
<p>The <a href="/blog/how-to-create-a-virtual-run-certificate">virtual run certificate guide</a> helps convert these findings into a stronger recognition workflow.</p>

<h2>Review participant communication</h2>
<p>Place every essential message against the <a href="/blog/participant-communication-timeline-virtual-running-events">participant communication timeline</a>: confirmation, pre-start, opening, proof reminder, midpoint, closing, deadline, review status, results, recognition, and support closure.</p>
<p>Check delivery and interaction only where legitimately measured, then compare with behavior and support themes. Opens are imperfect, and clicks do not prove comprehension. Look for conflicting dates, buried actions, inaccessible formatting, missing translations, and reliance on scattered social posts.</p>
<p>Identify the canonical page for future rule changes and who must approve and timestamp them. Preserve material communications with the event record.</p>
<p>Review promotion separately from participant operations. Compare each campaign promise with the final event page, price, categories, activity model, evidence, recognition, capacity, and beneficiary statement. Remove or correct reusable creative that overstates inclusion or outcomes. The <a href="/blog/how-to-promote-a-virtual-run">virtual-run promotion guide</a> can help rebuild the next campaign around confirmed terms.</p>

<h2>Review participant feedback</h2>
<p>Combine structured questions with a small number of open prompts: what helped, what caused friction, what felt unclear or unfair, what should remain, and what one change matters most. Make feedback voluntary and explain how it will be used.</p>
<p>Report response count and denominator. Feedback respondents are not automatically representative. Avoid turning one vivid comment into a universal conclusion or dismissing a serious issue because few people named it.</p>
<p>Group themes, attach anonymized examples where appropriate, and connect each accepted finding to operational evidence and an action.</p>
<p>Compare feedback with the event's planned touchpoints. The <a href="/blog/virtual-run-participant-engagement">participant-engagement guide</a> can help distinguish useful support and recognition from empty message volume. Note whether private participants, beginners, walkers, team members, and people who did not finish had an appropriate way to respond, without pressuring them to explain personal circumstances.</p>

<h2>Review privacy and data handling</h2>
<p>List what personal data was collected, why, where it moved, who accessed it, which processors were involved, what was displayed, what incidents or requests occurred, and what retention or deletion should now happen.</p>
<p>Check proof screenshots, route data, school or workplace affiliation, photographs, stories, payment records, support messages, exported spreadsheets, reviewer devices, and backups. Remove access from temporary staff and delete unauthorized local copies through the approved process.</p>
<p>The <a href="/blog/data-privacy-checklist-running-event-organizers">organizer data-privacy checklist</a> provides a fuller review. Escalate suspected incidents through applicable policy and professional advice rather than resolving them casually in a debrief.</p>

<h2>Review accessibility and inclusion</h2>
<p>Evaluate whether people could discover, understand, register, pay, participate, submit proof, request corrections, receive results, and obtain recognition using supported devices and assistive workflows. Include barriers reported through support and testing.</p>
<p>Check headings, labels, keyboard flow, contrast, image alternatives, plain language, captions, color dependence, mobile use, document formats, and contact paths. The <a href="/blog/how-to-make-running-event-instructions-inclusive-accessible">inclusive event-instructions guide</a> helps translate findings into content work.</p>
<p>Do not claim universal accessibility based on one successful test. Record environments, limitations, and unresolved barriers.</p>

<h2>Review costs, revenue, and commitments</h2>
<p>Compare budget and actual gross revenue, taxes where applicable, payment fees, platform costs, creative work, staff or contractor time, merchandise, packing, delivery, prizes, refunds, disputes, and other attributable costs. Explain timing and outstanding liabilities.</p>
<p>Calculate the net result using a declared method. A gross registration total is not profit. For a cause-based event, reconcile the promised beneficiary formula, transfers, reporting, and restricted funds separately.</p>
<p>Use the <a href="/blog/virtual-run-registration-fee-pricing">virtual-run pricing guide</a> when adjusting future price or inclusions. Do not solve a cost problem by hiding required fees.</p>

<h2>Identify what worked</h2>
<p>Name specific practices supported by evidence: a clear category comparison reduced pre-registration questions; a proof example improved first-pass approval; staged reminders prevented deadline spikes; reviewer calibration reduced inconsistent decisions.</p>
<p>Explain the context and preserve the responsible owner, template, configuration, or checklist. “Communication was good” is too vague to repeat.</p>
<p>Recognize teams without hiding strain or treating success as a reason to depend on unpaid overtime again.</p>

<h2>Identify repeated friction</h2>
<p>Prioritize issues that affected many participants, created serious risk, consumed repeated staff time, or violated a core promise. Trace symptoms toward likely process causes without claiming certainty beyond evidence.</p>
<p>A long review queue may come from unexpected volume, excessive proof requirements, poor instructions, a platform defect, missing staff, or all of these. Separate immediate containment from durable correction.</p>
<p>Record problems even when staff recovered gracefully. Hidden heroics make the next event fragile.</p>

<h2>Decide what should change next time</h2>
<p>Turn each accepted lesson into a concrete action: rewrite one section, simplify a category, add a proof example, change a deadline gap, improve status messages, add reviewer calibration, remove unnecessary data, test a keyboard path, or adjust capacity.</p>
<p>For every action record owner, due date, priority, evidence, expected result, dependency, and verification method. Avoid “improve communication” without specifying which message, audience, and observable problem.</p>
<p>Limit work in progress. A short ranked list completed before the next launch is better than fifty unactioned observations.</p>

<h2>Decide what should remain unchanged</h2>
<p>Explicitly preserve parts that served the purpose and did not create hidden harm. Stable rules, a useful support template, category names, a privacy choice, or a review checklist can reduce unnecessary reinvention.</p>
<p>Document why each item remains and under what conditions it should be reconsidered. What worked for a small club event may not scale to a national public challenge.</p>
<p>Do not preserve a process merely because it is familiar. Retention needs evidence and an owner just as change does.</p>

<h2>Assign actions before the next event</h2>
<p>End the review by reading back decisions, owners, due dates, and approval routes. Put actions into the team's actual work system, not only meeting notes. Schedule follow-up before promotion or configuration of the next event.</p>
<p>Require evidence of completion: approved copy, tested configuration, reconciled worksheet, updated policy, resolved defect, or completed rehearsal. Close, defer with reason, or reject each action visibly.</p>
<p>Decide how and when participants will hear about resolved issues, final results, data choices, and future opportunities. The <a href="/blog/virtual-run-participant-retention">participant-retention guide</a> emphasizes honest closeout before another invitation. Do not treat immediate next-event registration as the only sign of a valuable experience; offer relevant choices and respect marketing preferences.</p>
<p>Archive the final review, evidence index, decisions, and completed actions in a location available to authorized future organizers. Record which details are restricted, when they expire, and who owns deletion. A reusable template should preserve the questions and method, not copy participant data or assume the next event has identical risks.</p>
<p>Before approving the next launch, hold a short readiness check against the highest-priority lessons. If essential actions remain open, the owner should state the risk and approving authority should make a documented decision. A retrospective creates value only when its conclusions change preparation, capacity, rules, or delivery.</p>
<p>Carry the lessons deliberately into the next event with care instead of rebuilding the entire process from memory.</p>

<h2>A post-event review table</h2>
<p>Use six fields for each review area: what the team planned, what actually occurred, the specific issue or success, the evidence supporting that conclusion, the change or preserved practice for the next event, and the accountable owner. Apply the same structure to registration, payment, activity, proof, review, results, recognition, communication, support, privacy, and finance so decisions remain comparable and actionable.</p>
<table><thead><tr><th>Area</th><th>Planned</th><th>Actual</th><th>Issue</th><th>Evidence</th><th>Change for next event</th></tr></thead><tbody><tr><td>Registration</td><td>Approved plan</td><td>Final count</td><td>Observed gap</td><td>Defined source</td><td>Owned action</td></tr><tr><td>Payment</td><td>Budget and terms</td><td>Reconciled result</td><td>Exception</td><td>Authorized record</td><td>Process change</td></tr><tr><td>Activity</td><td>Category model</td><td>Participation</td><td>Friction</td><td>Aggregate metrics</td><td>Design action</td></tr><tr><td>Proof and review</td><td>Rules and capacity</td><td>Final states</td><td>Repeated reason</td><td>Queue and sample</td><td>Rule, UI, or training action</td></tr><tr><td>Recognition</td><td>Promise</td><td>Delivery</td><td>Error or delay</td><td>Issue log</td><td>Workflow action</td></tr><tr><td>Support</td><td>Service plan</td><td>Cases and time</td><td>Repeated theme</td><td>Aggregate log</td><td>Prevention action</td></tr></tbody></table>

<h2>Frequently asked questions</h2>
<h3>When should the formal review happen?</h3><p>After key operational work is stable, but while records and memory remain useful. Use an immediate incident debrief plus a later formal retrospective when needed.</p>
<h3>Who should attend?</h3><p>Include decision-makers and people close to registration, proof, support, communication, finance, technology, privacy, accessibility, and safeguarding as the event requires.</p>
<h3>Should participant-level data appear in the meeting?</h3><p>Usually aggregate information is enough. Restrict case details to authorized people and a legitimate need, with redaction and secure handling.</p>
<h3>What is the final output?</h3><p>A factual record of plan versus actual, evidence and limitations, preserved practices, prioritized problems, and assigned actions with dates and verification.</p>

<h2>Official and platform sources</h2>
<p>The Philippine <a href="https://privacy.gov.ph/">National Privacy Commission</a> publishes official data-privacy resources. The W3C publishes the <a href="https://www.w3.org/TR/WCAG22/">Web Content Accessibility Guidelines 2.2</a> for evaluating digital presentation. Apply current law, institutional policy, platform capability, and appropriate professional advice to the event.</p>
<p>HelloRun can support registration, proof review, results, progress, recognition, and engagement according to current configuration. Organizers remain responsible for accurate rules, authorized evidence, fair interpretation, closeout, and follow-through.</p>
`;
const REQUIRED_HEADINGS=Object.freeze(['Review after operational work is actually complete',"Restate the event's original goal",'Build one evidence pack','Review registration','Review payment and refunds','Review participation','Review proof submission','Review proof decisions for fairness','Review correction and support cases','Review results and finalization','Review certificates and recognition','Review participant communication','Review participant feedback','Review privacy and data handling','Review accessibility and inclusion','Review costs, revenue, and commitments','Identify what worked','Identify repeated friction','Decide what should change next time','Decide what should remain unchanged','Assign actions before the next event','A post-event review table','Frequently asked questions','Official and platform sources']);
const REQUIRED_LINKS=Object.freeze(['href="/blog/virtual-run-metrics-organizers-should-track"','href="/blog/participant-communication-timeline-virtual-running-events"','href="/blog/fair-and-consistent-run-proof-review-checklist-for-organizers"','href="/blog/data-privacy-checklist-running-event-organizers"','href="/blog/virtual-run-participant-engagement"','href="/blog/virtual-run-participant-retention"','href="/blog/how-to-create-a-virtual-run-certificate"','href="/blog/how-to-promote-a-virtual-run"','href="/blog/virtual-run-registration-fee-pricing"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wordCount=contentText.split(/\s+/).filter(Boolean).length,payload={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wordCount/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(payload);return payload;}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),w=t.split(/\s+/).filter(Boolean).length;if(w<2500||w>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||!p.excerpt||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8)e.push('tags');if(/(?:blame one person|expose participant evidence publicly|rewrite the original goal after results)/i.test(t))e.push('unsafe retrospective');if(!/event post mortem/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes(`<h2>${h}</h2>`))e.push(`heading ${h}`);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push(`link ${l}`);if(e.length)throw new Error(`Invalid post-event review payload: ${e.join('; ')}`);return true;}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
