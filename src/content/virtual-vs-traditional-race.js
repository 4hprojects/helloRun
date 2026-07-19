'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'virtual-run-vs-traditional-race-which-one-should-you-join';
const LEGACY_SLUG = 'virtual-run-vs-traditional-race';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'Virtual Run vs Traditional Race: Which One Should You Join?',
  excerpt: 'Compare virtual and traditional running events across flexibility, cost, timing, safety support, accessibility, proof, atmosphere, and performance goals.',
  category: 'Race Tips',
  tags: Object.freeze([
    'virtual run',
    'traditional race',
    'race comparison',
    'running events',
    'race day',
    'virtual running',
    'event selection',
    'runner guide'
  ]),
  seoTitle: 'Virtual Run vs Traditional Race: Which Should You Join?',
  seoDescription: 'Compare virtual runs and traditional races across flexibility, cost, timing, support, accessibility, proof, atmosphere, and performance goals.',
  coverImageAlt: 'Side-by-side comparison of a runner tracking a virtual run by phone and runners crossing an onsite race finish line'
});

const RAW_CONTENT_HTML = `
<p>A virtual run and a traditional race can ask you to cover the same distance while giving you very different experiences. One may let you choose the route and time; the other may place everyone on one course at a scheduled start. Neither format is automatically better. The useful question is which event's actual rules, support, costs, and demands fit you now.</p>
<p>This guide helps runners compare those details before registering. It treats “traditional race” as an onsite running event, not as a promise that every course is certified, every result is officially timed, or every participant receives the same services.</p>

<h2>Quick recommendations</h2>
<ul>
  <li><strong>Choose a virtual run for scheduling flexibility</strong> when the event window gives you meaningful choice and you have a suitable route, treadmill, or other permitted way to complete it.</li>
  <li><strong>Choose an onsite race for a shared race-day experience</strong> when a fixed place, start time, marked course, other participants, and event operations are important to you.</li>
  <li><strong>Choose a virtual accumulated challenge for consistency</strong> when the rules allow several approved activities to build toward one target.</li>
  <li><strong>Choose an appropriately certified onsite event for a qualifying or record-sensitive goal</strong> only after confirming the governing body's requirements, course certification, timing method, and result eligibility.</li>
  <li><strong>Compare total cost, not only entry price</strong> by including travel, accommodation, equipment, connectivity, proof requirements, shipping, and optional purchases.</li>
  <li><strong>Check accessibility with the specific organiser</strong> because neither a remote format nor an onsite format is inclusive by default.</li>
  <li><strong>Use both formats</strong> if virtual challenges help you stay consistent while selected onsite races provide milestones, community, or performance tests.</li>
</ul>
<blockquote><strong>Fast decision rule:</strong> choose the event whose complete participant journey you can safely, honestly, and realistically complete—not the format with the most attractive headline.</blockquote>

<h2>How this comparison was prepared</h2>
<p>This is a documented event-format comparison, not hands-on testing, a scientific performance study, medical advice, or a universal ranking. It draws on current World Athletics road-event information, Road Runners Club of America event and participant guidance, Google people-first content guidance, and HelloRun's published workflow as reviewed in July 2026.</p>
<p>Individual events vary. A local fun run, a major certified road race, a completion-only virtual 5K, and a month-long accumulated challenge should not be assumed to offer the same timing, safety support, accessibility, ranking, rewards, or refund terms. Always treat the specific event page and applicable local rules as the final source for participation requirements.</p>

<h2>What the two formats mean</h2>
<h3>Virtual run</h3>
<p>A virtual run is an organised event completed away from a shared event course. You register, follow an activity window and event rules, record or document the permitted activity, and submit or import the required evidence. The organiser may offer one-activity distances, accumulated-distance challenges, completion recognition, or reviewed rankings.</p>
<p>“Virtual” does not mean anywhere, anytime, using any activity. The event can restrict dates, locations, activity types, devices, treadmill use, minimum distances, proof fields, and submission deadlines. You normally choose and assess your own route and local conditions unless the organiser specifies something else.</p>
<h3>Traditional or onsite race</h3>
<p>An onsite race brings participants to a defined venue and course at a scheduled time. Depending on the event, it may provide route markings, controlled start waves, course marshals, timing, hydration, toilets, medical planning, bag services, awards, or post-race activities.</p>
<p>Those features must be verified rather than assumed. Small community events and internationally certified races operate at very different levels. An onsite course is not automatically certified, and a recorded finish is not automatically eligible for rankings, qualifying standards, or records outside that event.</p>

<h2>At a glance: compare the actual event, not the label</h2>
<h3>Schedule and location</h3>
<ul>
  <li><strong>Virtual:</strong> commonly offers an activity window and route choice, but may still have fixed registration and submission deadlines.</li>
  <li><strong>Onsite:</strong> normally requires arrival at one venue and start time, with travel, parking, transport, and packet-collection considerations.</li>
</ul>
<h3>Course and conditions</h3>
<ul>
  <li><strong>Virtual:</strong> conditions differ by participant; route distance, elevation, surface, traffic, weather, and treadmill settings can vary.</li>
  <li><strong>Onsite:</strong> participants generally share a course and event window, although waves and changing weather can still produce different conditions.</li>
</ul>
<h3>Timing and evidence</h3>
<ul>
  <li><strong>Virtual:</strong> may rely on an app, watch, treadmill display, supported activity import, screenshot, or another published proof method followed by review.</li>
  <li><strong>Onsite:</strong> may use chips, bib tags, manual timing, gun time, net time, or completion records; confirm which result the event publishes.</li>
</ul>
<h3>Support and responsibility</h3>
<ul>
  <li><strong>Virtual:</strong> gives the runner more control over route and time, and usually places more immediate route and condition decisions with the participant.</li>
  <li><strong>Onsite:</strong> may provide coordinated course operations and emergency planning, but these reduce risk rather than guarantee safety.</li>
</ul>
<h3>Community and motivation</h3>
<ul>
  <li><strong>Virtual:</strong> can connect people across locations through shared goals, approved results, groups, or online communication.</li>
  <li><strong>Onsite:</strong> creates a simultaneous physical gathering, visible course progress, spectators, volunteers, and finish-line interaction.</li>
</ul>

<h2>Flexibility: look beyond the size of the event window</h2>
<p>A virtual event may give you several days or weeks to complete an activity. That can help runners with shift work, caring responsibilities, travel limits, variable weather, or limited access to nearby events. An accumulated challenge can also spread a larger goal across several eligible sessions.</p>
<p>Flexibility still has boundaries. Check whether the window uses the organiser's timezone or your local timezone, whether proof may be submitted after the activity deadline, whether a single continuous activity is required, and whether you can reschedule within the window when conditions are unsafe.</p>
<p>An onsite race provides less schedule choice but more certainty about when the shared event happens. That fixed commitment can be motivating for some runners and impractical for others. Include travel time, packet collection, transport interruptions, start-wave instructions, and cut-off times in the decision.</p>

<h2>Cost: calculate the full participation budget</h2>
<p>Entry price alone cannot establish which format costs less. A virtual run may reduce venue travel or accommodation, but it can involve tracking equipment, mobile data, a gym or treadmill fee, proof preparation, reward shipping, or payment charges outside the platform. A free virtual entry may still have optional merchandise or delivery costs.</p>
<p>An onsite race may include timing, course services, a bib, transport arrangements, photographs, apparel, or a finisher item, but inclusions vary. Add transport, parking, accommodation, meals, packet collection, companion costs, and required equipment to the registration price.</p>
<p>Before paying, identify the currency, included items, optional purchases, receipt-confirmation process, cancellation terms, refund conditions, transfer policy, and fulfilment area. HelloRun's <a href="/refund-and-cancellation-policy">Refund and Cancellation Policy</a> provides platform-level information; the event may publish additional applicable terms.</p>

<h2>Timing, certification, and performance goals</h2>
<p>If your goal is completion or consistency, either format can provide a useful target. If your goal is a personal best, seeded entry, qualification, ranking, or record, the details become more exacting.</p>
<p>World Athletics explains that performances used for specified top lists, entry standards, rankings, and records must meet applicable competition and course requirements. A race being onsite does not by itself satisfy those requirements. Confirm the course measurement certificate, governing rules, timing method, start-to-finish configuration, result status, and the organisation that will recognise the performance.</p>
<p>A virtual result can still be personally meaningful, but runners use different routes, surfaces, elevations, weather, devices, pause settings, and activity modes. Those differences make direct competitive comparison difficult unless the event defines a transparent reviewed method and clearly describes its limitations.</p>

<h2>Why the same displayed distance does not mean the same performance</h2>
<p>Two records showing 10.00 kilometres may describe substantially different efforts. One route may climb continuously; another may descend. One runner may use elapsed time while another app emphasizes moving time. GPS smoothing, signal loss, auto-pause, watch calibration, phone placement, tree cover, tall buildings, treadmill calibration, and manual corrections can change the displayed data.</p>
<p>Weather and surface also matter. Heat, wind, rain, altitude, trail conditions, turns, congestion, and crossings affect pace. Onsite participants share more of the same course context, but start waves, crowding, and changing conditions can still differ.</p>
<p>For virtual proof, submit the original fields requested by the organiser and do not alter evidence to force agreement between devices. If a watch, app, or treadmill disagrees, follow the published discrepancy rule or ask before the deadline. The guides <a href="/blog/best-apps-to-track-your-virtual-run">Best Apps to Track Your Virtual Run</a> and <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> explain the practical evidence fields.</p>

<h2>Safety support differs, but neither format guarantees safety</h2>
<p>At a well-planned onsite race, organisers may coordinate course design, traffic controls, volunteers, weather decisions, communications, aid stations, and emergency response. RRCA's Safe Event Guidelines describe risk management as a core race-director responsibility while making clear that local events need plans specific to their conditions.</p>
<p>Runners still need to read course and participant instructions, disclose information only where appropriately requested, start in the correct wave, follow local event rules, and stop or seek help when necessary. Services, response times, traffic control, and weather policies vary by event.</p>
<p>In a virtual run, you usually select the route, time, surface, and whether to postpone. That control can help you avoid a poor forecast or unsuitable time, but it also means evaluating traffic, lighting, isolation, weather, air quality, and communications without an onsite event team. Use the <a href="/blog/running-safety-tips-early-morning-night-runs">running safety guide</a> and choose a safer alternative rather than chasing a deadline.</p>

<h2>Accessibility and inclusion must be checked event by event</h2>
<p>A remote format can remove travel, crowds, fixed starts, or inaccessible event venues for some participants. It can also create barriers: smartphone or internet access, inaccessible upload forms, route availability, device requirements, payment methods, proof formats, and limited support.</p>
<p>An onsite event may offer accessible transport information, adapted start waves, wheelchair or assisted participation, toilets, course details, early starts, support people, or other accommodations. It may also have terrain, width, cut-off, crowd, sensory, transport, or communication barriers.</p>
<p>Do not infer suitability from a poster. Ask the organiser about the course or proof process, permitted activity or mobility mode, time limits, facilities, support, and a reasonable alternative where applicable. Register early enough for a meaningful response. The presence of an accessibility statement is useful only when it explains the actual participant journey.</p>

<h2>Proof, privacy, and published results</h2>
<p>Virtual participation commonly produces digital evidence that may reveal a name, profile photo, activity time, device, and route. A route map can expose a home, school, workplace, or repeated routine. Review the event's minimum evidence requirements and crop or hide unnecessary private details only when the rules permit it.</p>
<p>Onsite registration and timing also create records. Ask what becomes public, whether age category or club is displayed, how photographs are handled, and where correction or privacy requests go. Read the HelloRun <a href="/privacy">Privacy Policy</a> for the platform's practices and the event's own notice when another organisation determines additional uses.</p>
<p>A public leaderboard is not the same as a certified result. On HelloRun, eligible approved submissions can feed a configured leaderboard. Pending proof is not final, and an event may be completion-only. Read <a href="/blog/how-leaderboards-work-virtual-running-events">How Leaderboards Work in Virtual Running Events</a> before treating a displayed position as directly comparable with onsite race placement.</p>

<h2>Community, accountability, and rewards</h2>
<p>Onsite races concentrate the social experience into a place and time. Running beside others, seeing volunteers and spectators, and crossing a staffed finish can feel important. Some runners find crowds energising; others find travel, congestion, noise, or a mass start stressful.</p>
<p>Virtual events create community differently. A club, school, company, charity, or distributed group can pursue one goal across locations. Communication, fair review, participant support, and recognition determine whether that shared goal feels real. A leaderboard alone does not create belonging.</p>
<p>Medals, shirts, badges, certificates, photographs, prizes, and donations are event-specific. Confirm what is guaranteed, what requires an approved result, whether shipping is included, and when fulfilment is expected. On HelloRun, a configured certificate may become available after the qualifying result is approved; it should not be assumed for every event.</p>

<h2>Which format fits your current goal?</h2>
<h3>First-time runner</h3>
<p>Either format can work. A flexible completion event may reduce schedule pressure, while a welcoming onsite event may offer clear course support and encouragement. Look for walking rules, cut-offs, distance options, proof requirements, and beginner information. The <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K guide</a> can help you assess the preparation required.</p>
<h3>Performance-focused runner</h3>
<p>Choose an onsite event only after confirming that its measurement, timing, and result status match your specific goal. A virtual challenge can support training consistency, but should not be presented as a substitute for a required qualifying event.</p>
<h3>Runner with an unpredictable schedule</h3>
<p>A multi-day virtual window may fit better, provided you can meet its exact activity and submission deadlines. Check whether accumulated activities are permitted rather than assuming you can split the distance.</p>
<h3>Runner who values atmosphere</h3>
<p>An onsite event may provide the shared start, visible route, spectators, and finish-line experience you want. Review transport, crowd, wave, headphone, companion, and spectator rules beforehand.</p>
<h3>Runner facing travel or location barriers</h3>
<p>A virtual option may remove a long journey, but only if you have a permitted, safe, and usable local route or indoor alternative plus access to the required evidence method.</p>
<h3>Treadmill participant</h3>
<p>Choose a virtual event that explicitly accepts treadmill activities and explains the evidence and ranking treatment. A treadmill display, watch, and app can report different values, so follow the event's stated source and discrepancy rules.</p>
<h3>Participant with accessibility needs</h3>
<p>Compare both complete journeys rather than choosing from the format label. Ask specific questions early and select the event that can explain how registration, participation, proof or timing, support, results, and recognition will work for you.</p>

<h2>Virtual-run pre-registration checklist</h2>
<ul>
  <li>Confirm registration, activity, submission, review, and results dates with the named timezone.</li>
  <li>Check single-activity versus accumulated completion.</li>
  <li>Confirm allowed activities, routes, treadmills, devices, apps, units, and manual records.</li>
  <li>Identify required proof fields and whether a map is necessary.</li>
  <li>Read correction, rejection, duplicate, discrepancy, and late-submission rules.</li>
  <li>Check fee, receipt review, refund, reward, shipping, and certificate terms.</li>
  <li>Choose a suitable route and backup time or indoor option.</li>
  <li>Review what participant and activity information may become public.</li>
</ul>

<h2>Onsite-race pre-registration checklist</h2>
<ul>
  <li>Confirm venue, date, start wave, timezone, packet collection, transport, and parking.</li>
  <li>Review course surface, elevation, time limits, hydration, toilets, baggage, and weather policy.</li>
  <li>Check whether the course and result have the certification or recognition needed for your goal.</li>
  <li>Confirm timing method, gun versus net time, category rules, and result-correction process.</li>
  <li>Read policies for headphones, mobility equipment, companions, strollers, animals, and transfers.</li>
  <li>Ask about accessibility, medical or emergency planning, and communication channels relevant to you.</li>
  <li>Calculate travel, accommodation, meals, equipment, and optional purchases.</li>
  <li>Read cancellation, deferral, transfer, refund, reward, and photography terms.</li>
</ul>

<h2>How HelloRun fits into a virtual event</h2>
<p>Start with the public <a href="/events">Events page</a>, then read the individual event's categories, dates, fee, activities, proof, leaderboard, and recognition terms. The <a href="/how-it-works">How It Works</a> page explains the general runner journey, while the <a href="/faq">FAQ</a> covers common platform questions.</p>
<p>HelloRun can support free or paid registration. For a paid event, the current workflow may require the participant to upload a payment receipt for manual review; HelloRun should not be described as directly processing the payment or instantly confirming it.</p>
<p>For run results, participants submit evidence or use a supported activity-import path where available. OCR may assist with entering fields from a screenshot, but the extracted values can be incomplete or wrong. The participant should review them, and an organiser or admin reviews the result against event rules and original evidence. The guide <a href="/blog/how-to-submit-run-proof-correctly-hellorun">How to Submit Run Proof Correctly on HelloRun</a> shows what to check.</p>
<p>HelloRun does not continuously monitor a runner's GPS location. Approved results can appear in eligible configured leaderboards, and configured certificates can recognize qualifying approved results. Availability depends on the event.</p>

<h2>A note for event organisers</h2>
<p>The format should follow the event's purpose and operating capacity. A virtual event reduces some onsite logistics but adds registration, payment-review, proof, privacy, support, deadline, ranking, and fulfilment decisions. An onsite component introduces location-specific course, permit, traffic, volunteer, medical, insurance, and safeguarding work.</p>
<p>Do not call an event “hybrid” until the rules explain how virtual and onsite categories, timing, evidence, rankings, fees, rewards, and results relate. Use <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">How to Organize a Virtual Run</a> for the full operational playbook.</p>

<h2>Frequently asked questions</h2>
<h3>Is an onsite race automatically an official or certified race?</h3>
<p>No. Certification, sanctioning, measurement, timing, and result eligibility are distinct details. Verify the event and governing-body requirements relevant to your goal.</p>
<h3>Can a virtual result qualify me for another race?</h3>
<p>Only if the receiving race or governing organisation expressly accepts that result and its evidence. Do not assume a virtual result satisfies a qualifying standard.</p>
<h3>Are virtual runs cheaper?</h3>
<p>Sometimes, especially when they avoid substantial travel, but not in every case. Compare the complete cost including entry, equipment, connectivity, facilities, payment charges, shipping, and optional items.</p>
<h3>Does every race include a medal or certificate?</h3>
<p>No. Recognition is event-specific and may depend on registration type, payment confirmation, an approved result, shipping availability, or another published condition.</p>
<h3>Can I use a treadmill for a virtual run?</h3>
<p>Only when the event permits it. Check the accepted evidence, activity mode, distance source, and whether treadmill results are eligible for completion, ranking, or both.</p>
<h3>Which format is more accessible?</h3>
<p>There is no universal answer. Compare your actual route or course, registration, transport, technology, proof, facilities, communication, time limits, support, and accommodation needs.</p>
<h3>Which format is safer?</h3>
<p>Neither label guarantees safety. Assess the event's risk controls and your own route, conditions, support, and ability to postpone or stop. Follow local guidance and event instructions.</p>
<h3>Can I join both kinds of event?</h3>
<p>Yes. Many runners use virtual challenges for flexible consistency and choose occasional onsite races for community, a milestone, or a properly recognised performance goal.</p>

<h2>Final decision</h2>
<p>Choose a virtual run when its real flexibility, evidence process, route options, cost, and support match your circumstances. Choose an onsite race when its schedule, course, operations, atmosphere, and result status match your goal. If both add value, use each for what it does well.</p>
<p>Before registering, read the complete event page and policies. A thoughtful choice is based on the participant journey you will actually experience—not assumptions attached to the words “virtual” or “traditional.”</p>

<h2>Official and platform sources</h2>
<p>This comparison was reviewed against the following resources in July 2026:</p>
<ul>
  <li><a href="https://worldathletics.org/records/certified-roadevents">World Athletics: Certified Road Events</a></li>
  <li><a href="https://www.rrca.org/education/event-directors/safe-event-guidelines/">Road Runners Club of America: Safe Event Guidelines</a></li>
  <li><a href="https://www.rrca.org/education/for-runners/runner-etiquette/">Road Runners Club of America: Runner Etiquette</a></li>
  <li><a href="https://support.google.com/adsense/answer/7299563?hl=en">Google AdSense: Make Sure Your Site's Pages Are Ready</a></li>
  <li><a href="https://developers.google.com/search/docs/fundamentals/creating-helpful-content">Google Search Central: Creating Helpful, Reliable, People-First Content</a></li>
  <li><a href="/how-it-works">HelloRun: How It Works</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
  <li><a href="/refund-and-cancellation-policy">HelloRun Refund and Cancellation Policy</a></li>
</ul>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Quick recommendations',
  'How this comparison was prepared',
  'What the two formats mean',
  'At a glance: compare the actual event, not the label',
  'Cost: calculate the full participation budget',
  'Timing, certification, and performance goals',
  'Why the same displayed distance does not mean the same performance',
  'Safety support differs, but neither format guarantees safety',
  'Accessibility and inclusion must be checked event by event',
  'Proof, privacy, and published results',
  'Which format fits your current goal?',
  'Virtual-run pre-registration checklist',
  'Onsite-race pre-registration checklist',
  'How HelloRun fits into a virtual event',
  'A note for event organisers',
  'Frequently asked questions',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/how-it-works',
  '/faq',
  '/privacy',
  '/refund-and-cancellation-policy',
  '/blog/beginner-5k-training-plan-new-runners',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/how-leaderboards-work-virtual-running-events',
  '/blog/running-safety-tips-early-morning-night-runs',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  'worldathletics.org/records/certified-roadevents',
  'rrca.org/education/event-directors/safe-event-guidelines',
  'rrca.org/education/for-runners/runner-etiquette',
  'support.google.com/adsense',
  'developers.google.com/search/docs/fundamentals/creating-helpful-content'
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
  if (wordCount < 2500) errors.push('article must contain at least 2500 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('existing cover image is required for ogImageUrl');
  if (/<h[12]>Virtual Run vs Traditional Race:/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/<em>[^<]+<\/em>\s*\*/i.test(payload.contentHtml)) errors.push('body contains malformed emphasized text');
  if (/automatically (?:approves?|verifies?)/i.test(text)) errors.push('article must not promise automatic approval');
  if (/HelloRun (?:provides|supports|includes) (?:an? )?(?:integrated|direct) payment gateway/i.test(text)) errors.push('article must not claim direct payment processing');
  if (/(?:virtual runs?|onsite races?|traditional races?) (?:are|is) always (?:cheaper|safer|easier|more accessible)/i.test(text)) errors.push('article must not make absolute format claims');
  if (/(?:every|all) onsite (?:race|event).{0,30}(?:certified|officially timed)/i.test(text)) errors.push('article must not claim universal onsite certification');
  if (!/documented event-format comparison, not hands-on testing/i.test(text)) errors.push('article must disclose its methodology');
  if (!/neither format guarantees safety/i.test(text)) errors.push('article must include the safety limitation');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid race-comparison article payload: ${errors.join('; ')}`);
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
