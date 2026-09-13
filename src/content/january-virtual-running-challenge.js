'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='january-virtual-running-challenge';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'How to Plan a January Virtual Running Challenge',excerpt:'Plan a January virtual challenge with realistic goals, inclusive categories, clear proof, communication, recognition, and a path beyond New Year interest.',category:'Organizer Guide',tags:Object.freeze(['January running challenge','New Year running challenge','virtual running challenge','January fitness challenge','employee wellness challenge','school running challenge','event organizer','Philippines virtual run']),seoTitle:'How to Plan a January Virtual Running Challenge',seoDescription:'Plan a January virtual running challenge around realistic goals, beginner categories, proof rules, communication, tracking, recognition, and participation.',coverImageAlt:'Filipino organizer planning an inclusive January virtual challenge with running, run-walk, walking, proof, communication, and retention'});
const RAW_CONTENT_HTML=`
<p>A <strong>January running challenge</strong> should convert New Year interest into a behavior participants can realistically continue, not exploit a week of enthusiasm with an extreme target. Organizers need a clear purpose, audience, format, activity window, categories, accepted activities, proof rules, review capacity, communication calendar, recognition, pricing, and closeout plan before promotion begins.</p>
<p>A virtual challenge can serve a public community, school, workplace, club, nonprofit, or private group. The correct design depends on participant context. One template cannot determine medical suitability, accessibility, employment consequences, school safeguarding, or individual training.</p>
<p>This guide focuses on event operations and participant clarity. Organizers should obtain appropriate legal, privacy, safeguarding, medical, and accessibility advice for their circumstances.</p>

<h2>Decide the purpose first</h2>
<p>Write one primary purpose: welcome beginners, support general participation, build community, raise funds transparently, encourage employee wellness, or prepare an existing club for a later event. A purpose such as “maximum kilometres” can silently reward volume over inclusion.</p>
<p>Define what success will mean for the organizer. Useful measures may include completed registrations, first approved activity, participant retention, support response, completion across categories, or satisfaction. Avoid health or productivity claims the event cannot establish.</p>
<p>The purpose should guide every later choice. If inclusion is primary, a single extreme distance and winner-only recognition contradict it. If fundraising is primary, explain beneficiaries, costs, and payment terms clearly.</p>

<h2>Do not design only for New Year enthusiasm</h2>
<p>January interest can produce early registrations and ambitious declarations, but motivation naturally changes. Design for the participant who misses a week, starts late within the permitted window, walks, needs instructions repeated, or cannot post publicly.</p>
<p>Avoid daily streak requirements unless the format genuinely needs them and health, safety, and accessibility implications have been reviewed. A completion goal based on approved activity across a window can allow more flexible participation.</p>
<p>Use supportive language rather than promises of transformation, guilt about holiday behavior, or claims that one month fixes health. The event is a structure for participation, not a treatment.</p>

<h2>Define the audience and eligibility</h2>
<p>Specify who can join, age requirements, guardian consent, geography, organization membership, registration capacity, accessibility support, and whether employees or students face any participation consequences. Voluntary participation should be genuinely voluntary.</p>
<p>Do not call an event beginner-friendly merely because it includes a low category. Review instructions, proof burden, app access, language, pricing, route independence, deadline flexibility, and support channels.</p>
<p>For a school or workplace, the <a href="/blog/how-schools-and-organizations-can-use-virtual-runs">schools and organizations guide</a> covers ownership, safeguarding, access, and internal coordination.</p>

<h2>Choose a 30-day or longer format deliberately</h2>
<p>A January 1–31 window is easy to understand, but it includes holidays, return-to-work transitions, travel, and uneven weather. A four- or six-week window starting later may give organizers more preparation and participants a calmer beginning.</p>
<p>Publish registration open and close, activity start and end, time zone, proof deadline, review period, correction window, and recognition date. Do not use “all January” when the system applies exact timestamps that participants cannot see.</p>
<p>Leave enough time after the activity window for honest proof review without implying that later activities count. The activity deadline and submission deadline must be distinct.</p>

<h2>Choose single-result categories carefully</h2>
<p>A 5K or 10K single-result category asks a participant to complete one eligible activity. It can suit people who prefer a clear checkpoint, but it should not automatically become a fastest-time race.</p>
<p>State whether run-walk or walking is allowed, whether the distance must be continuous, how pauses are treated, and whether treadmill activity qualifies. Explain route responsibility and avoid prescribing unsafe pacing.</p>
<p>If results are ranked, disclose the ranking method, tie handling, proof standard, privacy choices, and whether course variation makes comparisons informal.</p>

<h2>Design accumulated-distance options</h2>
<p>Accumulated categories add approved activities across the event window. Calculate what each target implies per week and per available day. Compare that demand with the intended audience rather than selecting round numbers for marketing.</p>
<p>Offer meaningfully spaced options with clear units. Too many categories create choice burden and review complexity; too few may exclude beginners or participants with limited time.</p>
<p>Explain whether a participant chooses one category, whether progress can count toward several goals, and what happens after a target is reached. The <a href="/blog/end-of-year-virtual-running-challenge">end-of-year challenge guide</a> provides a reusable structure for rules and closeout.</p>

<h2>Include walking and mixed activity intentionally</h2>
<p>Decide whether walking, running, jogging, hiking, trail running, treadmill, wheelchair activity, or other movement is accepted. Use precise activity labels and confirm the platform can record and review them as promised.</p>
<p>Mixed-activity inclusion can broaden participation, but organizers should not combine incomparable results into a fastest leaderboard without explanation. Completion recognition may fit better.</p>
<p>Do not improvise acceptance after participants start. Publish any route, equipment, age, or supervision restrictions before registration and apply them consistently.</p>

<h2>Create genuinely beginner-friendly goals</h2>
<p>A beginner goal should permit an appropriate starting method, manageable weekly demand, rest, safe route choice, and clear support. It should not require a daily session, public weigh-in, expensive watch, or advanced app knowledge.</p>
<p>Provide examples as illustrations, not prescriptions. State that participants should choose based on current ability and qualified advice, and that stopping or not completing is acceptable.</p>
<p>Test the instructions with someone unfamiliar with virtual running. If they cannot tell what counts, when to act, or how to ask for help, revise before launch.</p>

<h2>Set registration dates that support onboarding</h2>
<p>Open registration only after the event page, rules, privacy notices, pricing, support, and proof workflow are ready. Early promotion without usable details creates avoidable questions and inconsistent promises.</p>
<p>Choose a close date that leaves enough time for payment review, participant profile corrections, consent, and onboarding. State whether late registration is possible and whether earlier activities can be submitted.</p>
<p>Send confirmation with the selected category, event window, proof method, privacy choice, and support route. Do not rely on a social post as the participant's only record.</p>

<h2>Write proof rules before promotion</h2>
<p>Define accepted apps or methods, required screenshot fields, manual entries, treadmill proof, identity, date, distance, time, activity type, duplicates, edits, privacy redaction, and correction procedure. The system must support the published rule.</p>
<p>Explain that only approved valid submissions count toward official completion when that is the model. Separate uploaded, pending, approved, rejected, and corrected states.</p>
<p>Use the <a href="/blog/what-counts-as-valid-run-proof">valid-proof guide</a> and the organizer review checklist. Do not quietly raise the standard after seeing results.</p>

<h2>Plan review capacity and escalation</h2>
<p>Estimate registrations, activities per participant, peak upload days, reviewer availability, languages, and correction volume. An accumulated month can produce far more evidence than a single-result event.</p>
<p>Train reviewers on the same checklist, document decisions, limit access, and define escalation for ambiguity or conflict of interest. Speed should not replace fairness.</p>
<p>Publish realistic response times and the final review window. Do not promise instant approval or leave certificates dependent on an undocumented queue.</p>

<h2>Build a communication schedule</h2>
<p>The <a href="/blog/virtual-run-participant-engagement">participant-engagement guide</a> can help plan useful touchpoints. At minimum, prepare registration confirmation, pre-start reminder, opening instructions, proof reminder, midpoint support, closing warning, submission cutoff, review status, and results or recognition.</p>
<p>Each message should have one primary action and link to the canonical event page. Avoid changing rules through scattered posts. If a rule changes, update the page, timestamp the change, notify affected participants, and preserve fairness.</p>
<p>Provide an accessible support channel and expected response time. Do not require public comments for account, payment, proof, disability, or health-related questions.</p>

<h2>Promote the confirmed event rather than a concept</h2>
<p>The <a href="/blog/how-to-promote-a-virtual-run">virtual-run promotion guide</a> explains channel, audience, message, creative, tracking, and consent. Every campaign should point to the canonical event page where dates, categories, fees, proof, privacy, and support are current.</p>
<p>Prepare separate messages for beginners, returning participants, teams, schools, or workplaces only when the event truly serves them. Do not use generic “everyone can do this” claims, invented scarcity, unverified testimonials, or before-and-after body imagery. Obtain permission for participant stories and photographs.</p>
<p>Use campaign tracking proportionately and disclose it where required. Promotional reach is not the same as qualified registrations. Monitor which questions arise before purchase or signup; repeated confusion signals that the event page needs revision, not merely another post.</p>
<p>Stop or correct promotion immediately when a material rule, date, price, capacity, or reward changes. Preserve the terms accepted by existing participants and communicate the effect transparently.</p>

<h2>Build an operational risk register</h2>
<p>List foreseeable failures: registration overload, payment mismatch, duplicate profiles, unclear categories, inaccessible instructions, proof upload failure, reviewer absence, privacy incident, abusive leaderboard behavior, certificate errors, and severe weather affecting many participants. Assign an owner and response for each.</p>
<p>Define what requires pausing registration, extending an administrative deadline, notifying participants, or escalating to technical, legal, safeguarding, or emergency support. Extensions must be documented and applied fairly; they should not quietly expand the eligible activity window for selected people.</p>
<p>Back up critical configurations and export only the operational data you are authorized to retain. Restrict access to staff who need it, remove former reviewers promptly, and record decisions that affect eligibility or recognition.</p>
<p>A risk register does not guarantee a trouble-free event. It makes ownership visible before January volume and staff holidays combine. Review it after launch using actual support and review patterns, but do not rewrite history by deleting resolved incidents. A concise record can improve the next event and demonstrate why a decision was made.</p>

<h2>Test the complete participant journey</h2>
<p>Before launch, use non-production or authorized test accounts to experience discovery, registration, category selection, payment where applicable, consent, confirmation, activity submission, correction, approval, progress, privacy display, certificate, and support. Test mobile and keyboard use as well as common screen sizes.</p>
<p>Use varied scenarios: a walker, a treadmill participant when allowed, a private leaderboard choice, a rejected duplicate, a corrected proof, a late upload, a name with punctuation, and a participant using an assistive technology workflow. Verify that the system behaves exactly as the published rule says.</p>
<p>Remove test data from public results using the approved process before launch. Do not experiment with real participant records or send production messages unintentionally. Record defects, owners, severity, retest evidence, and the exact configuration version that passed.</p>
<p>Run a final content comparison across event page, checkout, confirmation, FAQ, scheduled messages, and support scripts. A polished poster cannot compensate for contradictory operational copy.</p>

<h2>Support the mid-month participation dip</h2>
<p>Around the middle of the challenge, participants may have fewer completed activities than they expected. Do not encourage unsafe catch-up mileage or shame people with empty dashboards.</p>
<p>Send a reset message: check approved progress, review remaining days, choose a realistic next activity, and accept that completion may not fit. Remind them of walking or reduced options only when the published rules allow them.</p>
<p>Highlight process stories across different categories and privacy choices, with consent. Avoid featuring only the highest-volume leaders.</p>

<h2>Choose leaderboards or completion goals</h2>
<p>A leaderboard can rank verified time, distance, elevation, activities, or another defined metric. It can motivate some participants and discourage or expose others. Offer privacy options and state how names appear.</p>
<p>Completion goals emphasize reaching a threshold rather than defeating another participant. They may align better with beginner inclusion and varied routes. A progress view can still show individual movement without public ranking.</p>
<p>Use the metric that matches the purpose. Never imply a leaderboard proves health, effort, or personal worth.</p>

<h2>Plan certificates and recognition</h2>
<p>Define eligibility, approval cutoff, name source, delivery format, correction period, and issue date. A certificate should reflect the category and rules actually completed.</p>
<p>Recognition can include finisher certificates, participation acknowledgments where clearly distinguished, team stories, or milestone messages. Do not promise badges, merchandise, prizes, or rankings the platform and budget cannot deliver.</p>
<p>Obtain consent before publishing names, photographs, workplaces, schools, or stories. Make private participation possible where the event design permits it.</p>

<h2>Set transparent pricing</h2>
<p>The <a href="/blog/virtual-run-registration-fee-pricing">virtual-run pricing guide</a> covers cost, value, payment, delivery, refunds, and disclosure. Price from actual event costs and participant value, not merely what January enthusiasm might tolerate.</p>
<p>State registration fee, platform or payment charges, optional merchandise, delivery or claiming fees, taxes where applicable, inclusions, exclusions, refund and cancellation terms, and beneficiary information for fundraising.</p>
<p>Do not hide required costs until checkout. A free tier with optional add-ons can broaden access only when the free experience is complete and claims are accurate.</p>

<h2>Protect participant data</h2>
<p>Collect only information needed for registration, safety, proof, payment, recognition, and lawful operations. State purpose, access, retention, sharing, and participant rights in the applicable privacy notice.</p>
<p>Fitness screenshots can reveal routes, homes, workplaces, health context, and other people. Request only necessary fields and provide a secure submission route.</p>
<p>Review the Philippine National Privacy Commission's official resources and obtain appropriate advice. A public leaderboard should use an explicit participant privacy choice rather than assuming full-name consent.</p>

<h2>Make instructions accessible</h2>
<p>Use descriptive headings, plain language, high contrast, meaningful link labels, image alternatives, captions where needed, and instructions that do not rely on color alone. Test keyboard and mobile use.</p>
<p>Offer a contact path for reasonable accommodations and clarify essential event requirements. Do not promise universal accessibility without testing the actual platform and process.</p>
<p>Include accessible formats for school or workplace audiences when needed. The Web Content Accessibility Guidelines can inform digital presentation, while local context requires appropriate review.</p>

<h2>Plan January-to-February retention</h2>
<p>The <a href="/blog/virtual-run-participant-retention">participant-retention guide</a> explains how honest closeout, useful feedback, and relevant next steps support return. Do not immediately pressure every finisher into a harder February goal.</p>
<p>Offer several paths: maintain the same activity, join a smaller next challenge, volunteer, follow educational content, or take a recovery period. Base recommendations on participant choice and event data.</p>
<p>Send a final message that states review status, recognition timing, support deadline, feedback route, and how to control future marketing. Close the event before launching the next one.</p>

<h2>A January challenge production checklist</h2>
<ol><li>Approve purpose, audience, and success measures.</li><li>Set registration, activity, submission, review, and recognition dates.</li><li>Choose realistic categories and accepted activities.</li><li>Publish complete proof and correction rules.</li><li>Prepare review capacity and escalation.</li><li>Schedule participant communication.</li><li>Confirm pricing, privacy, accessibility, and support.</li><li>Test registration through recognition.</li><li>Prepare midpoint and non-completion messages.</li><li>Close January before inviting participants into February.</li></ol>
<p>Design the January challenge around a behavior participants can realistically sustain safely after the first week and well beyond.</p>

<h2>Frequently asked questions</h2>
<h3>Should a January challenge last exactly 30 days?</h3><p>No. Choose a window that fits purpose, operations, and participant context, then publish exact timestamps.</p>
<h3>Should organizers require daily activity?</h3><p>Usually not for a flexible beginner event. Daily requirements need explicit justification and careful health, safety, and accessibility review.</p>
<h3>Can walking count?</h3><p>Yes when the event intentionally accepts it and the platform, categories, proof, and communication match that promise.</p>
<h3>Do we need a leaderboard?</h3><p>No. Completion goals or private progress may better serve an inclusive purpose.</p>
<h3>When should promotion start?</h3><p>After the canonical event page, rules, pricing, privacy, support, and proof workflow are ready.</p>

<h2>Official and platform sources</h2>
<p>The <a href="https://privacy.gov.ph/">Philippine National Privacy Commission</a> provides official data-privacy resources. The W3C publishes the <a href="https://www.w3.org/TR/WCAG22/">Web Content Accessibility Guidelines 2.2</a> for digital accessibility. Organizers should apply current law, policies, platform capabilities, and appropriate professional advice to their event.</p>
<p>HelloRun can support event pages, registration, proof review, progress, results, and recognition, but organizer settings and published rules remain the source participants must be able to understand.</p>
`;
const REQUIRED_HEADINGS=Object.freeze(['Decide the purpose first','Do not design only for New Year enthusiasm','Define the audience and eligibility','Choose a 30-day or longer format deliberately','Choose single-result categories carefully','Design accumulated-distance options','Include walking and mixed activity intentionally','Create genuinely beginner-friendly goals','Set registration dates that support onboarding','Write proof rules before promotion','Plan review capacity and escalation','Build a communication schedule','Promote the confirmed event rather than a concept','Build an operational risk register','Test the complete participant journey','Support the mid-month participation dip','Choose leaderboards or completion goals','Plan certificates and recognition','Set transparent pricing','Protect participant data','Make instructions accessible','Plan January-to-February retention','A January challenge production checklist','Frequently asked questions','Official and platform sources']);
const REQUIRED_LINKS=Object.freeze(['href="/blog/end-of-year-virtual-running-challenge"','href="/blog/how-schools-and-organizations-can-use-virtual-runs"','href="/blog/how-to-promote-a-virtual-run"','href="/blog/virtual-run-registration-fee-pricing"','href="/blog/virtual-run-participant-engagement"','href="/blog/virtual-run-participant-retention"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wordCount=contentText.split(/\s+/).filter(Boolean).length,payload={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wordCount/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(payload);return payload;}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),w=t.split(/\s+/).filter(Boolean).length;if(w<2500||w>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||!p.excerpt||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8)e.push('tags');if(/require extreme daily mileage|shame non-finishers|publish health data without consent/i.test(t))e.push('unsafe challenge');if(/guarantees? transformation|universally accessible guarantee/i.test(t))e.push('guarantee');if(!/January running challenge/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes(`<h2>${h}</h2>`))e.push(`heading ${h}`);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push(`link ${l}`);if(e.length)throw new Error(`Invalid January challenge payload: ${e.join('; ')}`);return true;}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
