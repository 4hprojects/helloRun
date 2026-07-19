'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers';
const LEGACY_SLUG = 'what-is-virtual-run-philippines';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'What is Virtual Run? A Simple Guide for Runners and Event Organizers',
  excerpt: 'Learn how virtual runs work from registration and activity tracking through proof review, results, leaderboards, certificates, and organizer responsibilities.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'virtual run',
    'virtual race',
    'runner guide',
    'event organizer',
    'run tracking',
    'activity proof',
    'virtual challenge',
    'online running event'
  ]),
  seoTitle: 'What Is a Virtual Run? A Simple Guide',
  seoDescription: 'Learn how virtual runs work, including event formats, registration, tracking, proof review, leaderboards, certificates, safety, privacy, and organizer duties.',
  coverImageAlt: 'Runner completing a virtual run beside a phone showing 5.24 km, a mapped route, and a digital finisher badge'
});

const RAW_CONTENT_HTML = `
<p>A virtual run is an organised running event that participants complete away from one shared event course. The organiser publishes a goal, activity window, eligibility rules, and evidence process. Runners register, complete an allowed activity, record or document it, and submit or import the required information for review.</p>
<p>That definition sounds simple, but virtual events differ widely. One may require a single outdoor 5K recorded by GPS. Another may let a participant accumulate 25 kilometres across several runs or walks. Some are free and completion-only; others charge a fee, publish approved results, or provide configured recognition. The individual event rules determine what counts.</p>

<h2>A virtual run in one minute</h2>
<ol>
  <li>Find an event and read its full mechanics.</li>
  <li>Choose an eligible category and register with accurate details.</li>
  <li>Complete payment instructions when the event is paid and wait for any required receipt review.</li>
  <li>Prepare an accepted app, watch, treadmill record, or other evidence method.</li>
  <li>Complete the permitted activity during the stated window.</li>
  <li>Review the recorded date, distance, duration, activity type, source, and units.</li>
  <li>Submit proof or use a supported activity-import option before the deadline.</li>
  <li>Wait for organiser or admin review and respond to a correction request when allowed.</li>
  <li>Check the approved result, eligible leaderboard, or configured certificate instead of treating a pending submission as final.</li>
</ol>
<blockquote><strong>The essential idea:</strong> location may be flexible, but the event still has boundaries. Dates, activities, proof, reviews, rankings, and recognition remain governed by published rules.</blockquote>

<h2>How this guide was prepared</h2>
<p>This is a researched explanation based on documented event practices and HelloRun's current workflow as reviewed in July 2026. It is not hands-on testing of every virtual-run platform, a universal rulebook, individual medical advice, or a promise that every event offers the same features.</p>
<p>Examples from World Athletics, the Road Runners Club of America, and New York Road Runners show how established organisations have described or operated virtual events. They are sources and examples, not rules that automatically apply to another organiser. The event page, applicable policies, and local requirements remain the final authority for a specific event.</p>

<h2>What “virtual” changes—and what it does not</h2>
<p>A virtual format changes where and often when participation happens. It can let runners join from different locations and choose a suitable time within an activity window. It can also support distributed clubs, schools, companies, charities, and communities without bringing every participant to one start line.</p>
<p>Virtual does not remove event structure. It does not necessarily mean any location, any time, any tracking app, any activity, or unlimited submissions. An organiser may exclude unsafe or prohibited locations, require an outdoor GPS record, accept only activities after registration, set a minimum distance, use one timezone, or disallow treadmill and manual entries.</p>
<p>It also does not guarantee lower cost, greater accessibility, improved safety, a medal, a certificate, an approved result, an official qualifying performance, or a public leaderboard. Those outcomes depend on the event design, participant circumstances, evidence, review status, and organisations that recognise the result.</p>

<h2>The complete virtual-run journey</h2>
<h3>1. Discover and assess the event</h3>
<p>Start with the official event page rather than a cropped poster or social-media caption. Confirm the organiser, intended audience, categories, dates, timezone, permitted activities, completion method, fee, evidence, ranking, recognition, privacy information, refund position, and support route.</p>
<p>A legitimate-looking design is not enough. A trustworthy listing makes material conditions understandable before registration and gives participants a way to ask specific questions.</p>
<h3>2. Register for the correct category</h3>
<p>Enter accurate identity and contact details, then select the distance, activity mode, or participant category you can actually complete. Your name may be used to match payment, proof, results, or a certificate. If an accessibility need or alternative evidence process matters, ask before paying.</p>
<h3>3. Complete payment confirmation when required</h3>
<p>A free event may confirm registration immediately. A paid event may have a separate payment workflow. On HelloRun, current paid registration can require a participant to follow the organiser's payment instructions and upload a receipt for manual review. This is not direct payment processing or instant confirmation by HelloRun.</p>
<p>Keep the original payment record and read the <a href="/refund-and-cancellation-policy">Refund and Cancellation Policy</a> plus event-specific terms. Payment approval confirms the registration step; it does not approve a future run result.</p>
<h3>4. Prepare the activity and evidence method</h3>
<p>Confirm that the chosen phone app, watch, treadmill display, or other record exposes the fields the event needs. Check units, location permissions, battery, storage, device connection, date settings, and account privacy before the activity begins. Test the method on a short non-event activity if practical.</p>
<h3>5. Complete the activity inside the window</h3>
<p>Follow the allowed activity type, date, distance, and single-versus-accumulated rule. Choose a suitable route and conditions. Flexibility should make postponement or a safer alternative possible when the rules allow it; it should not create pressure to run through unsafe weather, traffic, poor air quality, illness, or an unsuitable surface.</p>
<h3>6. Submit or import the activity</h3>
<p>Some events ask for a screenshot, activity link, device record, treadmill photo, or form entry. A supported integration may allow activity data to be imported. Submission still requires the runner to select the correct registration and inspect the date, distance, duration, type, units, and source.</p>
<h3>7. Wait for human review</h3>
<p>An organiser or admin compares the submission with the event rules and original evidence. A result may remain pending, be approved, need correction, or be rejected with a reason. Automated extraction and integrity signals can help a reviewer, but they do not establish the final decision by themselves.</p>
<h3>8. Receive the event-specific outcome</h3>
<p>An approved result may count toward completion, an accumulated total, an eligible leaderboard, or configured recognition. A completion-only event may not rank participants. A certificate, badge, medal, prize, donation, or shipped item exists only when the event expressly offers it and its conditions are met.</p>

<h2>Common virtual-run formats</h2>
<h3>Single-activity distance</h3>
<p>The full target is completed in one eligible recorded activity. A 5K category may require one activity showing at least the published distance. This is easy to understand, but route conditions and devices still vary between participants.</p>
<h3>Accumulated-distance challenge</h3>
<p>Several approved activities contribute to one target during the event window. The rules should state minimum activity distance, allowed activities, number of submissions, how totals are calculated, and what happens after the target is reached.</p>
<h3>Completion-only event</h3>
<p>Participants who meet the requirement are recognised without being ordered by speed or distance. This can suit community participation, beginner goals, workplace programmes, and events where different routes make direct comparison less meaningful.</p>
<h3>Competitive virtual event</h3>
<p>The organiser publishes a ranking method, eligible evidence, categories, approval requirement, tie handling, and provisional-versus-final results. A reviewed virtual ranking is still event-specific and should not be treated as identical to an onsite certified race result.</p>
<h3>Charity or cause-related event</h3>
<p>Participation is connected to fundraising or advocacy. Check the named beneficiary, organiser authority, amount or proportion intended for the cause, fees or deductions, and whether any tax claim is valid in the relevant jurisdiction.</p>
<h3>Team or group challenge</h3>
<p>Individual results may contribute to a school, club, department, or team goal. The mechanics need to explain membership, totals, duplicates, privacy, rankings, and how late or rejected activities affect the team.</p>
<h3>Hybrid event</h3>
<p>An organiser offers virtual and onsite participation under one event concept. The rules should separate categories, dates, proof or timing, fees, results, rewards, and safety responsibilities rather than assuming both modes work the same way.</p>

<h2>Four practical examples</h2>
<h3>Example 1: one-activity virtual 5K</h3>
<p>Mina registers for a 5K that permits running or walking between 1 and 7 August. It requires one activity, at least 5.00 kilometres, a visible date and duration, and submission by 8 August in the organiser's timezone. Mina records 5.12 kilometres in one eligible activity and submits the original summary. Approval depends on those published requirements, not only the number “5K” in the category name.</p>
<h3>Example 2: accumulated 25K challenge</h3>
<p>Arun joins a 25K monthly challenge that accepts multiple runs of at least 2 kilometres. Four approved activities of 6K, 5K, 7K, and 7K reach the target. A fifth pending activity does not need to be counted, and a rejected duplicate does not contribute. If the event instead required one continuous 25K, the same records would not satisfy it.</p>
<h3>Example 3: treadmill activity</h3>
<p>Lee chooses an event that explicitly accepts treadmills for completion but excludes them from a GPS-route leaderboard. The rules require the treadmill display to show distance and duration plus a matching date record. A watch shows 4.8K while the treadmill shows 5.0K, so Lee follows the published source-of-truth rule rather than editing either record.</p>
<h3>Example 4: unclear proof</h3>
<p>Sofia submits a screenshot whose distance is visible but whose date and unit are cropped. The reviewer marks it for correction instead of assuming it is valid or fraudulent. Sofia provides the original uncropped activity within the correction window. The result is then decided using the same rules applied to other participants.</p>

<h2>What counts as useful activity proof</h2>
<p>Proof should let a reviewer answer the event's relevant questions without collecting unnecessary information. Common fields include:</p>
<ul>
  <li>Activity date within the permitted window.</li>
  <li>Distance and visible unit.</li>
  <li>Duration or time when required.</li>
  <li>Activity type.</li>
  <li>Recognisable app, device, treadmill, or evidence source.</li>
  <li>Participant identity only to the extent needed to match the registration.</li>
  <li>Route, pace, elevation, or supporting fields only when the rules require them.</li>
</ul>
<p>A map alone may omit distance or time. A cropped summary may hide the date. A manual entry may be allowed for one event and prohibited in another. Read <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> and <a href="/blog/how-to-submit-run-proof-correctly-hellorun">How to Submit Run Proof Correctly on HelloRun</a> for detailed examples.</p>

<h2>Tracking apps, devices, units, and discrepancies</h2>
<p>No app or watch is universally required or universally accepted. Event organisers determine which sources fit their rules. The <a href="/blog/best-apps-to-track-your-virtual-run">running-app comparison</a> explains documented features from Strava, Nike Run Club, Garmin Connect, adidas Running, Apple Workout/Fitness, and Huawei Health without claiming a universal accuracy ranking.</p>
<p>GPS signal, tree cover, tall buildings, phone placement, watch calibration, auto-pause, moving versus elapsed time, treadmill calibration, and manual corrections can produce different values. Confirm whether the event uses kilometres or miles and whether conversion or rounding rules are published.</p>
<p>If two sources conflict, keep the original records. Do not alter a screenshot to manufacture agreement. Submit the required source, explain the discrepancy if the form permits, and ask for the event's review rule before the deadline.</p>

<h2>Safety and route responsibility</h2>
<p>A virtual event usually does not supply a controlled course, marshals, aid stations, or an onsite emergency team. The runner generally chooses the route and immediate conditions. That choice should account for traffic, crossings, lighting, weather, flooding, air quality, surface, isolation, local access rules, communications, and the ability to stop safely.</p>
<p>World Athletics' virtual-race preparation advice highlights advance route planning and practical logistics. RRCA materials distinguish virtual participation from an organiser prescribing and timing a specific course in its insurance context. These sources reinforce planning, but they do not replace local law, event-specific duties, or qualified advice.</p>
<p>Use the <a href="/blog/running-safety-tips-early-morning-night-runs">running safety guide</a> for detailed low-light, traffic, weather, air-quality, and emergency preparation. A deadline or leaderboard position is not a reason to continue in unsafe conditions.</p>

<h2>Privacy: inspect the proof before sharing it</h2>
<p>An activity screenshot or link can expose a profile name, photo, home area, school, workplace, start time, repeated routine, device, health-related fields, or social connections. Submit only what the event requires, and use app privacy controls or permitted map hiding where appropriate.</p>
<p>Do not assume that a private app profile makes an uploaded screenshot private in every workflow. Check who reviews evidence, which result fields become public, how long records may be retained, and where to request help. Review the HelloRun <a href="/privacy">Privacy Policy</a> and the organiser's own notice when it determines additional data use.</p>

<h2>How to assess whether a virtual run is trustworthy</h2>
<ul>
  <li><strong>Organiser:</strong> A clear name, contact route, and responsibility for the event.</li>
  <li><strong>Purpose and audience:</strong> An understandable goal and eligibility policy.</li>
  <li><strong>Dates:</strong> Separate registration, activity, submission, review, results, and fulfilment dates with a timezone.</li>
  <li><strong>Mechanics:</strong> Exact activities, distance, single or accumulated format, treadmill treatment, proof, corrections, and invalidation reasons.</li>
  <li><strong>Money:</strong> Price, currency, payment instructions, inclusions, receipt review, refund or cancellation terms, and shipping charges.</li>
  <li><strong>Results:</strong> Completion or ranking method, approval requirement, categories, ties, provisional status, and publication date.</li>
  <li><strong>Recognition:</strong> The conditions and expected timing for certificates, badges, medals, prizes, donations, or other rewards.</li>
  <li><strong>Privacy:</strong> Required data, public fields, route-map treatment, reviewer access, and a privacy contact.</li>
  <li><strong>Support:</strong> A realistic process for questions, corrections, accessibility needs, system issues, and delayed fulfilment.</li>
</ul>
<p>A virtual event can be legitimate when its organiser, rules, payment, review, results, and promises are transparent and consistently operated. The format alone cannot establish trustworthiness.</p>

<h2>First virtual-run preparation checklist</h2>
<ul>
  <li>Choose a distance and format that match your current preparation.</li>
  <li>Read the full event page and save the key dates and timezone.</li>
  <li>Confirm walking, treadmill, accumulation, apps, devices, units, and proof rules.</li>
  <li>Complete registration and any separate payment-receipt review early.</li>
  <li>Test the tracking or evidence method before the qualifying activity.</li>
  <li>Plan a suitable route, time, backup option, and phone or watch battery.</li>
  <li>Review map and account privacy settings.</li>
  <li>Know where to ask about an ambiguity before the deadline.</li>
</ul>
<p>If you are new to the distance, the <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K guide</a> offers a simple starting framework. It is general information rather than individual medical guidance.</p>

<h2>Proof-submission checklist</h2>
<ul>
  <li>Select the correct event registration and category.</li>
  <li>Confirm the activity occurred within the allowed window.</li>
  <li>Check distance, unit, duration, date, activity type, and source.</li>
  <li>Use the original readable record and avoid unnecessary edits.</li>
  <li>Hide unrelated private information only when the event permits it.</li>
  <li>Review OCR-assisted values against the original image.</li>
  <li>Submit before the deadline rather than relying on a final-hour upload.</li>
  <li>Save confirmation and monitor pending, correction, approved, or rejected status.</li>
</ul>

<h2>How HelloRun supports the workflow</h2>
<p>Browse the <a href="/events">Events page</a> and read the individual listing before registering. The <a href="/how-it-works">How It Works</a> page explains the general runner flow, and the <a href="/faq">FAQ</a> covers common account, registration, proof, and result questions.</p>
<p>HelloRun supports free or paid event registration. For a paid registration, a participant may upload a payment receipt for manual organiser review. HelloRun does not directly process that payment, and payment confirmation remains separate from run-result approval.</p>
<p>Participants submit activity evidence or use a supported activity-import path when available. OCR may assist with entering fields from a screenshot, but it is not perfect. The runner should compare extracted values with the source, and an organiser or admin reviews the submission under the event rules.</p>
<p>HelloRun does not continuously track the runner's GPS location. Eligible approved results may feed configured leaderboards; pending results are not final. Configured certificates may be available after qualifying approval, but neither a leaderboard nor certificate is universal. Read <a href="/blog/how-leaderboards-work-virtual-running-events">How Leaderboards Work</a> for the distinction between pending and approved results.</p>
<p>Use <a href="/contact">Contact</a> for a platform question that the event page and FAQ do not resolve. Questions about an organiser's mechanics or decision may need the event's designated support route.</p>

<h2>Standards for organisers</h2>
<p>A virtual format reduces some physical-event logistics, but it creates a detailed digital participant journey. Before publishing, organisers should define purpose, audience, categories, activity rules, dates, timezone, payment, proof, corrections, review status, rankings, privacy, support, recognition, failure plans, and closeout responsibilities.</p>
<ul>
  <li>Write complete mechanics in accessible headings and lists.</li>
  <li>Collect only data needed for a defined purpose.</li>
  <li>Separate payment receipt review from activity proof review.</li>
  <li>Give reviewers one rubric and record understandable decision reasons.</li>
  <li>Allow fair correction where the published rules permit it.</li>
  <li>Do not rely on OCR, pace flags, or automation as a substitute for responsible review.</li>
  <li>Test registration, payment, submission, review, leaderboard, certificate, and support flows before launch.</li>
  <li>Plan accessible participation, route-map privacy, youth safeguarding, refunds, rewards, and applicable local obligations.</li>
</ul>
<p>The full <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">virtual-run organiser playbook</a> provides copyable mechanics, team roles, timelines, failure plans, and closeout checklists.</p>

<h2>Virtual run versus onsite race</h2>
<p>A virtual run generally gives more control over location and timing within published limits. An onsite race brings participants to a shared course and schedule and may provide timing, markings, volunteers, aid stations, and event operations. Neither label guarantees certification, safety, accessibility, lower cost, or a particular experience.</p>
<p>Use <a href="/blog/virtual-run-vs-traditional-race-which-one-should-you-join">Virtual Run vs Traditional Race</a> for a detailed decision guide covering total cost, performance goals, course comparability, accessibility, atmosphere, proof, privacy, and safety support.</p>

<h2>Frequently asked questions</h2>
<h3>Are virtual runs legitimate?</h3>
<p>They can be. Assess the organiser, rules, payment instructions, proof process, privacy, review, support, and fulfilment rather than relying on the format name or promotional design.</p>
<h3>Can I walk a virtual run?</h3>
<p>Only when the event allows walking or a relevant activity mode. Check whether walking is eligible for completion, ranking, or a specific category.</p>
<h3>Can I use a treadmill?</h3>
<p>Only when expressly permitted. Confirm the required date, distance and duration evidence, source-of-truth rule, and leaderboard treatment.</p>
<h3>Do I need a particular app or watch?</h3>
<p>Requirements vary. Some events accept several apps or devices, while others specify a source or support an activity integration. Test the accepted method before the event activity.</p>
<h3>Do manual activities count?</h3>
<p>They may count when published rules accept them, possibly with supporting evidence. A manually entered activity is not universally valid or invalid.</p>
<h3>Are virtual runs free?</h3>
<p>Some are free and others charge for participation, administration, fundraising, merchandise, rewards, or shipping. Compare the total cost and inclusions before registering.</p>
<h3>Will I receive a medal, badge, or certificate?</h3>
<p>Only if the event offers it and you meet its stated conditions. Confirm whether an approved result, payment confirmation, shipping fee, or fulfilment period applies.</p>
<h3>Can a virtual result qualify me for another race?</h3>
<p>Only when the receiving race or governing organisation explicitly accepts that result and evidence. Virtual participation should not be assumed to replace a certified qualifying performance.</p>
<h3>What happens if my proof is rejected?</h3>
<p>Read the reason and event correction policy. If correction is allowed, provide the original clearer evidence before the deadline. Ask through the published support route when the reason conflicts with the mechanics.</p>
<h3>What if my app fails or distances disagree?</h3>
<p>Keep all original records, follow the alternative-evidence and discrepancy rules, and contact the organiser promptly. Do not reconstruct or edit proof in a misleading way.</p>

<h2>Final takeaway</h2>
<p>A virtual run is not simply an ordinary workout with an online label. It is an event with a defined goal, participant rules, a completion window, recorded evidence, review, and an event-specific outcome.</p>
<p>For runners, the best first step is to read before registering and test before recording. For organisers, the standard is clear mechanics, proportionate data, fair human review, accurate promises, responsive support, and complete fulfilment. When those parts align, a flexible activity can become a trustworthy shared event.</p>

<h2>Official and platform sources</h2>
<p>This guide was reviewed against the following resources in July 2026:</p>
<ul>
  <li><a href="https://www.rrca.org/covid-19-information-and-resources/">Road Runners Club of America: Virtual Events Defined and Related Guidance</a></li>
  <li><a href="https://www.rrca.org/education/event-directors/safe-event-guidelines/">Road Runners Club of America: Safe Event Guidelines</a></li>
  <li><a href="https://worldathletics.org/personal-best/performance/how-run-best-virtual-race-advice">World Athletics: Virtual Race Preparation Advice</a></li>
  <li><a href="https://worldathletics.org/records/certified-roadevents">World Athletics: Certified Road Events</a></li>
  <li><a href="https://www.nyrr.org/Run/Virtual-Racing/Virtual-Racing-Page-for-Translation">New York Road Runners: Virtual Racing Example</a></li>
  <li><a href="/how-it-works">HelloRun: How It Works</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
  <li><a href="/refund-and-cancellation-policy">HelloRun Refund and Cancellation Policy</a></li>
</ul>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'A virtual run in one minute',
  'How this guide was prepared',
  'What “virtual” changes—and what it does not',
  'The complete virtual-run journey',
  'Common virtual-run formats',
  'Four practical examples',
  'What counts as useful activity proof',
  'Tracking apps, devices, units, and discrepancies',
  'Safety and route responsibility',
  'Privacy: inspect the proof before sharing it',
  'How to assess whether a virtual run is trustworthy',
  'First virtual-run preparation checklist',
  'Proof-submission checklist',
  'How HelloRun supports the workflow',
  'Standards for organisers',
  'Virtual run versus onsite race',
  'Frequently asked questions',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/how-it-works',
  '/faq',
  '/contact',
  '/privacy',
  '/refund-and-cancellation-policy',
  '/blog/beginner-5k-training-plan-new-runners',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/how-leaderboards-work-virtual-running-events',
  '/blog/running-safety-tips-early-morning-night-runs',
  '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  'rrca.org/covid-19-information-and-resources',
  'rrca.org/education/event-directors/safe-event-guidelines',
  'worldathletics.org/personal-best/performance/how-run-best-virtual-race-advice',
  'worldathletics.org/records/certified-roadevents',
  'nyrr.org/Run/Virtual-Racing'
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
  if (wordCount < 2800) errors.push('article must contain at least 2800 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('existing cover image is required for ogImageUrl');
  if (/<h[12]>What is Virtual Run\?/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/<em>[^<]+<\/em>\s*\*/i.test(payload.contentHtml)) errors.push('body contains malformed emphasized text');
  if (/automatically (?:approves?|verifies?|issues? certificates?)/i.test(text)) errors.push('article must not promise automatic outcomes');
  if (/HelloRun (?:provides|supports|includes) (?:an? )?(?:integrated|direct) payment gateway/i.test(text)) errors.push('article must not claim direct payment processing');
  if (/HelloRun (?:provides|supports|includes) live GPS (?:monitoring|tracking)/i.test(text)) errors.push('article must not claim live GPS monitoring');
  if (/virtual runs? (?:are|is) always (?:legitimate|cheaper|safer|accessible)/i.test(text)) errors.push('article must not make universal format claims');
  if (/virtual (?:run|race).{0,40}guaranteed qualifying/i.test(text)) errors.push('article must not promise qualifying results');
  if (!/researched explanation based on documented event practices/i.test(text)) errors.push('article must disclose its methodology');
  if (!/does not necessarily mean any location, any time/i.test(text)) errors.push('article must limit anywhere and anytime claims');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid virtual-run guide payload: ${errors.join('; ')}`);
  return true;
}

module.exports = {
  ARTICLE,
  CANONICAL_SLUG,
  LEGACY_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
};
