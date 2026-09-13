'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='virtual-run-metrics-organizers-should-track';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'Virtual Run Metrics Organizers Should Track',excerpt:'Measure a virtual run beyond registrations using participation, proof review, support, engagement, retention, finance, and operational performance.',category:'Organizer Guide',tags:Object.freeze(['virtual run metrics','event metrics','running event analytics','event KPIs','completion rate','registration conversion','event operations','event organizer']),seoTitle:'Virtual Run Metrics Organizers Should Track',seoDescription:'Measure a virtual run using registrations, starters, approved finishers, proof review, support, engagement, repeat participation, and operations.',coverImageAlt:'Filipino virtual-run organizer reviewing registration, participation, proof, support, retention, and finance metrics'});
const RAW_CONTENT_HTML=`
<p><strong>Virtual run metrics</strong> should tell organizers whether the event reached its intended audience, moved people through a clear participation journey, reviewed evidence fairly, resolved support cases, delivered recognition, and used resources responsibly. Total registrations alone answer only how many records entered one stage.</p>
<p>A useful measurement plan begins before launch. State the event's purpose, write a small set of questions, define each metric, identify a legitimate data source, assign an owner, choose a reporting period, and decide what action the result could inform. Collecting every available field creates risk and noise without guaranteeing insight.</p>
<p>This guide covers acquisition, participation, operations, engagement, retention, and finance. It does not treat activity data as medical evidence or claim that a virtual run proves health improvement, employee productivity, morale, academic performance, or community impact.</p>

<h2>Begin with decisions, not a dashboard</h2>
<p>Ask what the organizer needs to decide. Should registration instructions change? Is review capacity sufficient? Are beginners reaching their first approved activity? Which support problem recurs? Did the event cover its disclosed costs? Are participants choosing another event after a complete closeout?</p>
<p>For each question, choose one primary metric and perhaps one diagnostic measure. A school may prioritize voluntary participation across classes and safeguarding cases. A workplace may prioritize equitable access across shifts and support quality. A public event may prioritize registration conversion, completion, review turnaround, and net event result.</p>
<p>The <a href="/blog/how-schools-and-organizations-can-use-virtual-runs">schools and organizations guide</a> helps connect governance to event design. Do not copy another organizer's key performance indicators without understanding their purpose and constraints.</p>

<h2>Write a metric definition sheet</h2>
<p>A metric name is not a definition. “Starter,” for example, could mean someone who opened the event page, connected an app, recorded an activity, submitted proof, or received approval. Choose one meaning and keep it consistent across reports.</p>
<p>Record numerator, denominator, filters, date field, time zone, status rules, source system, refresh timing, owner, and known limitations. Version the definition when it changes. If an old and new report use different logic, label the break rather than drawing a continuous trend.</p>
<p>Use unique participant identifiers carefully and document duplicate-account handling. Raw activity count, unique active participants, and approved finishers answer different questions.</p>

<h2>Event-page visits and acquisition</h2>
<p>Event-page visits, when legitimately and reliably measured, provide context for registrations. Define whether the measure is page views, sessions, or unique visitors, and exclude authorized test traffic where possible. Consent requirements and analytics configuration affect what is available.</p>
<p>Campaign source data may show whether a participant arrived from email, a school portal, an office channel, social media, a partner, or direct navigation. Treat missing or unattributed traffic as unknown, not as evidence that a channel had no effect.</p>
<p>Do not collect invasive tracking data simply to produce a prettier acquisition chart. Use proportionate tools, accurate notices, retention controls, and legitimate access.</p>

<h2>Registrations and confirmed payments</h2>
<p>Count completed registrations rather than form starts unless both are explicitly defined. Separate valid registrations, duplicates, canceled entries, refunded entries, complimentary access, staff tests, and pending payment. The headline total should not silently combine incompatible states.</p>
<p>Where payment applies, distinguish initiated checkout, successful payment, matched registration, failed payment, manual reconciliation, refund, and charge dispute. Registration without confirmed payment may or may not be eligible under the published rules.</p>
<p>A daily registration trend can help detect broken links, campaign response, or capacity pressure. It cannot by itself explain why people registered.</p>

<h2>Registration conversion rate</h2>
<p>Registration conversion is commonly completed registrations divided by an eligible visit or session denominator. State the exact formula. If reliable page traffic is unavailable, do not manufacture a conversion percentage; report registrations and source limitations separately.</p>
<p>Segment only when it serves a legitimate question and group sizes support responsible interpretation. Device, channel, category, or campaign comparisons may reveal friction, but demographic profiling requires stronger purpose, protection, and review.</p>
<p>Investigate a change alongside dates, prices, capacity, page errors, messaging, and external context. A high conversion rate is not automatically good if important terms were unclear.</p>

<h2>Registered participants and starters</h2>
<p>Registered participants show the enrolled population. Starters show how many crossed a defined participation threshold, such as receiving one approved activity. Reporting both reveals the gap between joining and beginning.</p>
<p>A useful starter rate is unique starters divided by eligible registered participants. Decide how cancellations, refunds, late entries, teams, and people awaiting corrections affect the denominator. Freeze a reporting snapshot or explain later restatements.</p>
<p>Use the gap to improve onboarding, category clarity, first-activity instructions, and support—not to shame individuals who did not start.</p>

<h2>Proof submitters and approved finishers</h2>
<p>A proof submitter has sent at least one item for review. An approved finisher has met the event's full published completion rule after review. Between them may be pending, correction requested, rejected, withdrawn, or incomplete participants.</p>
<p>Count unique people as well as submissions. One participant may upload many activities in an accumulated challenge, so submission volume measures operational work while unique submitters measure participant progression.</p>
<p>The <a href="/blog/fair-and-consistent-run-proof-review-checklist-for-organizers">fair proof-review guide</a> supports consistent decisions. Never inflate finishers by treating uploads as approvals.</p>

<h2>Completion rate needs a declared denominator</h2>
<p>Completion rate might mean approved finishers divided by eligible registrations, starters, or proof submitters. Each formula is valid for a different question, and unlabeled percentages are misleading.</p>
<p>Registration-to-completion shows the complete funnel. Starter-to-completion focuses on people who began. Submitter-to-approval can reveal proof or review friction. Publish numerator, denominator, snapshot date, exclusions, and whether results remain provisional.</p>
<p>Compare categories cautiously. A single 5K and a month-long high-distance category do not create equivalent completion opportunities.</p>

<h2>Accumulated activities and milestone participation</h2>
<p>For accumulated events, track approved activity count, unique active participants, approved distance or another defined unit, and participation by milestone. Separate recorded, submitted, and approved values.</p>
<p>Milestone reach can show where participation slows, but it cannot explain individual health, effort, or motivation. Provide a non-public reporting path and suppress small groups when disclosure could identify people.</p>
<p>Do not incentivize excessive activity merely to raise a dashboard total. The event target and contribution caps should come from the <a href="/blog/how-to-design-fair-distance-categories-and-challenge-goals">fair distance and goals process</a>.</p>

<h2>Pending proof volume</h2>
<p>The current pending queue is a direct operational signal. Break it down by age band—such as received today, one to two days, three to five days, and older—using the event's promised service window.</p>
<p>Monitor incoming volume, completed reviews, reopened cases, and reviewer availability together. A small queue can still contain an old or urgent case; a large queue may be manageable when capacity and participant expectations are aligned.</p>
<p>Define alerts before launch. Assign who can add reviewers, pause nonessential work, update participants, or escalate technical failures.</p>

<h2>Proof-review turnaround time</h2>
<p>Turnaround begins and ends at defined events: valid submission received to first review decision, or receipt to final resolution after corrections. Report both when useful. Median and a high percentile often reveal experience better than an average distorted by a few extreme cases.</p>
<p>Pause rules matter. If the organizer waits for participant correction, label that time separately rather than quietly removing it. Preserve timestamps and avoid manual spreadsheet edits that erase history.</p>
<p>Faster review is not automatically fairer. Pair turnaround with correction, reversal, and quality measures.</p>

<h2>Rejection and correction rates</h2>
<p>Track first-pass approval, correction requested, rejection, resubmission, and final outcome. Use standardized reason categories such as missing date, unreadable distance, wrong activity window, duplicate proof, or unsupported activity type, while retaining a secure case note where justified.</p>
<p>A high correction rate for one reason may indicate unclear instructions, an upload design problem, or inconsistent review. It does not prove participant dishonesty. Review samples and support messages before choosing an intervention.</p>
<p>Measure reviewer disagreement or overturned decisions when possible. Update training and canonical rules rather than hiding corrections.</p>

<h2>Support requests and unresolved cases</h2>
<p>Count unique cases, messages, topic, channel, first-response time, resolution time, reopenings, escalations, and unresolved age. One case with ten replies should not be mistaken for ten participants needing support.</p>
<p>Tag only what is operationally necessary. Payment, account, proof, accessibility, safeguarding, privacy, and certificate issues may require different owners and access. Free-text messages can contain sensitive data and should not be copied into broad reports.</p>
<p>The <a href="/blog/participant-communication-timeline-virtual-running-events">participant communication timeline</a> can prevent repeated questions when messages arrive at the right stage.</p>

<h2>Communication engagement</h2>
<p>Email delivery, bounce, open, click, and unsubscribe data can help diagnose whether essential instructions reached people, but availability and accuracy vary. Opens may be affected by privacy technology. Clicks show interaction, not comprehension.</p>
<p>Separate transactional event messages from optional marketing. Respect consent, preference, and lawful-basis requirements. Do not require promotional engagement for event completion.</p>
<p>Use repeated support questions and task completion alongside communication metrics. A message with a strong click rate can still lead to a confusing page.</p>

<h2>Leaderboard and community engagement</h2>
<p>When measured, leaderboard views, reactions, comments, milestone acknowledgments, or story participation can describe platform interaction. They should not become a proxy for worth, team spirit, or the value of private participants.</p>
<p>Distinguish unique participants from total actions and remove unauthorized tests or abuse where policy permits. Obtain consent for public stories and provide moderation, reporting, and privacy controls.</p>
<p>The <a href="/blog/virtual-run-participant-engagement">participant-engagement guide</a> offers inclusive touchpoints that do not depend solely on public ranking.</p>

<h2>Returning participants and next-event registrations</h2>
<p>Retention can mean a participant joined any prior event, returned to the same organizer, or registered again within a defined period. Choose one definition and use privacy-respecting identity matching.</p>
<p>Cohort analysis can compare first-time and returning participants without implying causation. Next-event registrations should be counted only after the first event is responsibly closed, not as proof that every participant was satisfied.</p>
<p>Use the <a href="/blog/virtual-run-participant-retention">participant-retention guide</a> to plan closeout, feedback, and relevant choices. Respect marketing opt-outs and deletion requests.</p>

<h2>Gross revenue, costs, refunds, and net result</h2>
<p>Financial reporting should distinguish gross registration revenue, taxes where applicable, payment costs, platform costs, merchandise, packing, delivery, creative work, staff or contractor time, refunds, disputes, prizes, donations, and other event-specific costs.</p>
<p>Define cash versus accrual timing and reconcile payment records with valid registrations. A gross total is not profit. A charitable event should separately report the promised beneficiary calculation and transfer evidence.</p>
<p>The <a href="/blog/virtual-run-registration-fee-pricing">virtual-run pricing guide</a> covers transparent participant-facing fees. Restrict detailed financial access to authorized roles.</p>

<h2>Use a compact event scorecard</h2>
<p>A practical scorecard may contain registrations, starter rate, approved completion rate with denominator, median and high-percentile review time, correction rate, unresolved support cases, returning-participant rate, gross revenue, refunds, total attributable cost, and net result. Add or remove measures according to purpose.</p>
<p>For every line show target or expected range, actual, comparison period if legitimate, status, explanation, owner, and next action. Avoid red-amber-green labels without thresholds or context.</p>
<p>Keep a separate operational detail view for teams that need queues and cases. Executive summaries should not expose participant-level evidence.</p>

<h2>Check data quality before interpreting results</h2>
<p>Reconcile totals across the participant journey. Eligible registrations should connect sensibly to starters, submitters, approval states, withdrawals, and final recognition. Differences may be valid, but each unexplained gap deserves investigation before a report is distributed.</p>
<p>Check duplicate people, duplicate activities, missing timestamps, impossible status sequences, test accounts, inconsistent time zones, categories renamed after launch, refunded registrations still counted as eligible, and proof decisions made outside the expected workflow. Record correction rules and rerun the same checks after any repair.</p>
<p>Data completeness is a measure too. Report the percentage of records with a usable source, category, or result when those fields support an analysis. Do not silently discard “unknown” values, because their pattern may reveal an access or workflow problem.</p>
<p>Preserve the raw authorized record and create a reproducible reporting layer rather than editing values until a chart looks coherent. Document query date, code or formula version, filters, exclusions, and reviewer. A second authorized person should be able to reproduce important financial, completion, or fairness figures.</p>

<h2>Use targets and comparisons carefully</h2>
<p>A target should represent capacity, service promise, budget, or an evidence-based expectation—not a motivational wish. Review time may have a published service target; registration may have a capacity ceiling; completion may have an expected range based on a sufficiently comparable event.</p>
<p>Compare like with like. A free January team challenge should not be benchmarked casually against a paid individual 10K in another season. Note differences in audience, categories, activity window, price, proof burden, promotion, weather disruptions, platform version, and organizer staffing.</p>
<p>When there is no valid benchmark, report the first event as a baseline with limitations. The goal is to improve decisions, not to force every number into an upward arrow.</p>

<h2>Interpret differences without claiming causation</h2>
<p>If completion rose after a new reminder, say the change followed the reminder—not that the reminder caused it—unless the evaluation design supports that conclusion. Season, audience, category difficulty, price, weather, platform changes, and review policy may differ.</p>
<p>Small samples fluctuate. Missing data and changing definitions can overwhelm apparent differences. Record limitations beside the conclusion rather than burying them.</p>
<p>Qualitative feedback can suggest explanations, while logs and funnel measures test their scale. Neither alone proves broad impact.</p>

<h2>Protect privacy and limit access</h2>
<p>Collect only metrics and underlying data needed for a stated purpose. Define access, retention, sharing, security, correction, and deletion processes. Aggregate reports and suppress or combine small cells when identification is possible.</p>
<p>Fitness proof may reveal routes, homes, workplaces, schedules, health context, and companions. Do not export screenshots into a general analytics folder. Use authorized systems and role-based access.</p>
<p>Document third-party analytics and processors, applicable notices, agreements, and transfer requirements. A metric's usefulness does not override participant rights.</p>

<h2>Prepare the post-event review</h2>
<p>Freeze a labeled reporting snapshot only after the relevant review, correction, refund, and recognition work is sufficiently complete. Preserve subsequent adjustments with an audit trail.</p>
<p>Compare planned and actual values, identify repeated friction, attach evidence, and assign a specific change or decision. A structured post-event review can then turn this scorecard into a retrospective after operational work is complete.</p>
<p>Choose a small set of metrics before launch so the event can answer the questions the organizer actually cares about.</p>

<h2>A pre-launch metrics checklist</h2>
<ol><li>Restate the event purpose and decisions.</li><li>Choose a small metric set.</li><li>Define every numerator and denominator.</li><li>Map legitimate sources and owners.</li><li>Set privacy, access, and retention controls.</li><li>Exclude tests and document missing data.</li><li>Set operational thresholds and escalation.</li><li>Prepare a scorecard with limitations.</li><li>Schedule closeout and retrospective dates.</li><li>Use findings to assign changes, not blame.</li></ol>

<h2>Frequently asked questions</h2>
<h3>What should we track besides registrations?</h3><p>Track starters, proof submitters, approved finishers, a clearly defined completion rate, review queues and time, corrections, support, appropriate engagement, return, and financial results.</p>
<h3>What is the correct completion-rate formula?</h3><p>There is no single universal denominator. State whether approved finishers are divided by eligible registrations, starters, or submitters and why.</p>
<h3>Does a high completion rate prove health impact?</h3><p>No. It describes an event outcome under a defined formula. Health or organizational impact needs an appropriate evaluation design and expertise.</p>
<h3>How many metrics should a small organizer use?</h3><p>Use only enough to answer the most important decisions and monitor fair operations. A compact, well-defined scorecard is more useful than an unowned dashboard.</p>

<h2>Official and platform sources</h2>
<p>The Philippine <a href="https://privacy.gov.ph/">National Privacy Commission</a> publishes official data-privacy resources. The UK Information Commissioner's Office provides an official <a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/">data protection impact assessment guide</a> that can help teams think systematically about higher-risk processing; organizers must apply the laws and advice relevant to their own context.</p>
<p>HelloRun can support event, registration, proof, progress, result, and engagement records according to current features and configuration. Organizers remain responsible for definitions, lawful collection, access, interpretation, reporting, and action.</p>
`;
const REQUIRED_HEADINGS=Object.freeze(['Begin with decisions, not a dashboard','Write a metric definition sheet','Event-page visits and acquisition','Registrations and confirmed payments','Registration conversion rate','Registered participants and starters','Proof submitters and approved finishers','Completion rate needs a declared denominator','Accumulated activities and milestone participation','Pending proof volume','Proof-review turnaround time','Rejection and correction rates','Support requests and unresolved cases','Communication engagement','Leaderboard and community engagement','Returning participants and next-event registrations','Gross revenue, costs, refunds, and net result','Use a compact event scorecard','Check data quality before interpreting results','Use targets and comparisons carefully','Interpret differences without claiming causation','Protect privacy and limit access','Prepare the post-event review','A pre-launch metrics checklist','Frequently asked questions','Official and platform sources']);
const REQUIRED_LINKS=Object.freeze(['href="/blog/how-schools-and-organizations-can-use-virtual-runs"','href="/blog/virtual-run-participant-engagement"','href="/blog/virtual-run-participant-retention"','href="/blog/virtual-run-registration-fee-pricing"','href="/blog/participant-communication-timeline-virtual-running-events"','href="/blog/fair-and-consistent-run-proof-review-checklist-for-organizers"','href="/blog/how-to-design-fair-distance-categories-and-challenge-goals"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wordCount=contentText.split(/\s+/).filter(Boolean).length,payload={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wordCount/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(payload);return payload;}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),w=t.split(/\s+/).filter(Boolean).length;if(w<2500||w>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||!p.excerpt||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8)e.push('tags');if(/(?:this|the) (?:registration|completion|distance) metric (?:proves|guarantees) (?:health|productivity|morale|community impact)/i.test(t))e.push('unsupported impact claim');if(!/virtual run metrics/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes(`<h2>${h}</h2>`))e.push(`heading ${h}`);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push(`link ${l}`);if(e.length)throw new Error(`Invalid virtual run metrics payload: ${e.join('; ')}`);return true;}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
