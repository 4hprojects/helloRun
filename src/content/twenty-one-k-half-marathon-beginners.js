'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = '21k-half-marathon-for-beginners';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: '21K for Beginners: How to Prepare for Your First Half Marathon',
  excerpt: 'Build from a repeatable 10K base toward a first 21K with a flexible framework for longer activities, easy effort, run-walk, recovery, fueling practice, and safe event planning.',
  category: 'Training',
  tags: Object.freeze([
    'half marathon beginners',
    '21K training plan',
    'beginner half marathon',
    'first half marathon',
    'first 21K',
    'long run training',
    'run walk 21K',
    '21K Philippines'
  ]),
  seoTitle: '21K for Beginners: How to Prepare for Your First Half Marathon',
  seoDescription: 'Thinking about your first 21K? Learn how beginners can build from shorter distances, structure training, manage pacing, recovery, and prepare for a half marathon.',
  coverImageAlt: 'Layered glass-map illustration of a Filipino beginner progressing from a familiar 10K loop toward a longer supported 21K route'
});

const RAW_CONTENT_HTML = `
<p>A half marathon for beginners should begin with a repeatable shorter-distance base—not with one attempt to stretch from little recent running to 21K. If you can complete an easy 10K or a comparable run-walk duration regularly, recover normally, and fit longer training into ordinary life, you may be ready to explore a gradual 21K progression. If 10K is still a demanding one-off achievement, build that foundation first.</p>
<p>This guide offers an illustrative 12-week bridge for an established beginner, not a universal 21K training plan or a promise that 12 weeks is enough. Walking, planned run-walk intervals, repeated weeks, step-back weeks, and a later event are valid adjustments. The goal is a controlled first completion using a practised strategy, not a particular pace or uninterrupted run.</p>
<blockquote><strong>The key decision:</strong> move toward 21K only when your present routine is repeatable, the longer activity recovers appropriately, and your health, schedule, route, weather, and support arrangements allow the next modest step.</blockquote>

<h2>Your first 21K plan in one minute</h2>
<ol>
  <li><strong>Build before bridging.</strong> Establish several ordinary weeks that include a comfortable 10K or comparable easy time on your feet.</li>
  <li><strong>Choose a realistic runway.</strong> Twelve weeks can organize the bridge for some runners with that base; others need longer or should remain at shorter distances.</li>
  <li><strong>Keep most work easy.</strong> Use conversational effort, planned walking, recovery, and conditional long-activity extensions rather than making every session a test.</li>
  <li><strong>Practise logistics.</strong> Test route access, tracking, clothing, carrying, fluids, and suitable food during training.</li>
  <li><strong>Consolidate and reduce.</strong> Use step-back weeks and avoid last-minute catch-up distance.</li>
  <li><strong>Let completion be enough.</strong> A first 21K does not require a target time, continuous running, or an immediate next distance.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This article was reviewed in September 2026 against public guidance from WHO, CDC, NHS, USADA, and DOST-PAGASA, together with current HelloRun event and activity-submission behavior. Those sources support manageable progression, rest, individualized fluid and food decisions, and checking Philippine weather; none prescribes this exact sequence or determines personal readiness.</p>
<p>Population guidance is not a personal training plan, medical clearance, rehabilitation protocol, nutrition prescription, or finish guarantee. This framework has not assessed your health, medicines, injury history, pregnancy or postpartum status, disability, route, climate, diet, or event support.</p>
<p>Seek appropriate professional guidance when needed. Stop and obtain suitable medical or emergency help for severe, sudden, unexplained, recurrent, or worsening symptoms. A calendar, fee, streak, or unfinished distance is never permission to continue through a concerning response.</p>

<h2>What is a 21K or half marathon?</h2>
<p>An official half marathon is 21.0975 kilometres, or 13.1094 miles. Philippine event listings often shorten the category to 21K or 21km. In everyday planning, runners may say “21K,” but the live event page should state the actual required distance, route or virtual-activity rules, cutoff, and proof requirements.</p>
<p>The additional time beyond 10K changes pacing, route access, weather exposure, fluid and food decisions, equipment comfort, tracking battery, transport, toilets, recovery, and the consequences of starting too fast.</p>
<p>Finish-time tables are estimates, not readiness tests. The <a href="/blog/how-long-to-run-5k-10k-21k">5K, 10K, and 21K time guide</a> shows how pace arithmetic works while explaining why hills, stops, walk breaks, weather, GPS error, and individual response change real outcomes.</p>

<h2>Should a beginner start with 21K?</h2>
<p>A person new to running usually benefits from establishing walking, run-walk, 5K, and then 10K consistency before choosing 21K. Racing every shorter distance is unnecessary; the point is learning how the body, calendar, route, equipment, and recovery respond.</p>
<p>Consider staying with a shorter goal when recent activity is irregular, a 10K creates several days of unusual disruption, pain or other symptoms are unresolved, the available route is unsafe, or the training window would require frequent catch-up sessions. The <a href="/blog/10k-training-plan-for-beginners">beginner 10K framework</a> is the more appropriate bridge when 10K is not yet repeatable.</p>
<p>Readiness is not age, body size, pace, or one finish. Look for stable weeks, controlled easy effort, predictable recovery, room for rest, and a workable route. These are planning prompts, not medical screening criteria.</p>

<h2>Build a base before increasing distance</h2>
<p>Review the last four to six ordinary weeks, not your best historical result. Record frequency, familiar duration, the longest repeatable activity, terrain, walk breaks, effort, schedule demands, and later recovery.</p>
<p>A practical starting base for this framework is a comfortable 10K or comparable easy run-walk duration that has been completed more than once without racing it. “Comparable” matters because a 10K can take very different amounts of time. A runner whose 10K involves two hours of run-walk already has a different time-on-feet demand from someone covering it much faster.</p>
<p>Keep at least one familiar easy opportunity and one optional support opportunity while developing the longer activity. The <a href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school">weekly scheduling guide</a> helps distinguish fixed sessions, flexible opportunities, backups, and genuinely unavailable days.</p>
<p>Other activity may help, but it should not make every day demanding. Exercise selection may need professional guidance, and recovery remains part of the plan.</p>

<h2>How long does half-marathon preparation take?</h2>
<p>There is no universal answer. This article uses 12 weeks as an illustrative bridge for someone who already has a stable shorter-distance base. A person building from walking or 5K may need an earlier foundation phase plus a longer bridge. A runner returning after illness, injury, surgery, pregnancy, prolonged inactivity, or a major schedule change may need individual advice and a different timeline.</p>
<p>Do not choose an event and force adaptation into the remaining weeks. First check current fitness, event windows, work or school, travel, weather, route access, support, recovery, and space for disrupted or repeated weeks.</p>
<p>Progression is not an uninterrupted upward line. Establish, extend modestly, consolidate, rehearse, and reduce. Repeating or shortening an activity can be the right progression decision.</p>

<h2>Structure a beginner half-marathon week</h2>
<p>The framework offers up to three purposeful running or run-walk opportunities. It does not require every runner to complete all three every week.</p>
<ul>
  <li><strong>Familiar easy activity:</strong> a controlled session whose distance or duration is already repeatable.</li>
  <li><strong>Optional support activity:</strong> usually shorter and familiar; it may practise run-walk transitions, route skills, or simply become recovery.</li>
  <li><strong>Longer easy activity:</strong> the one opportunity that may extend time on your feet after the previous level is manageable.</li>
  <li><strong>Recovery:</strong> non-running time, ordinary sleep opportunity, familiar meals and fluids, and enough observation before another demanding-for-you effort.</li>
  <li><strong>Weekly review:</strong> compare planned and actual activity, effort, symptoms, conditions, and recovery before setting the next week.</li>
</ul>
<p>Place easier or non-running time between demanding sessions. Even “easy” activities can create excessive total demand when they become longer, hillier, hotter, or faster together. Change one main variable at a time.</p>

<h2>The role of the weekly long activity</h2>
<p>The long activity practises patient pacing, time on feet, logistics, equipment, and recovery. It is not a weekly race. Start from the longest recent repeatable activity, not the farthest ever completed.</p>
<p>Use duration, distance, or route segments—whichever is clearest and safest. When controlled, add a modest easy block or familiar run-walk cycle while keeping other variables similar. Weather or hills may make the same duration a progression.</p>
<p>No percentage makes an increase safe; the 10% rule cannot account for frequency, intensity, terrain, health, climate, or recovery. The longest training activity also need not universally equal 21.1K. Some runners approach it; others use a shorter supported rehearsal and conservative completion strategy.</p>
<p>Plan an exit using loops, transport, water, toilets, lighting, phone signal, and an appropriate companion or check-in. Do not use a route that strands a tired runner.</p>

<h2>Easy running, recovery, and run-walk strategies</h2>
<p>Most activity in a first-completion block should feel controlled. The CDC talk test describes moderate effort as generally allowing conversation but not singing, while vigorous effort permits only a few words before pausing. This is general intensity guidance, not a diagnosis or a required half-marathon zone.</p>
<p>Use sentences, breathing, form, attention, and perceived effort together. Slow down or walk when conversation disappears unexpectedly, coordination deteriorates, concentration narrows, or conditions make the same pace harder. The <a href="/blog/beginners-guide-to-running-pace">beginner pace guide</a> explains pace, splits, moving time, elapsed time, and effort context.</p>
<p>Planned walking can remain in every week and in the attempt. Choose a simple pattern that has already worked—time-based, landmark-based, or effort-led—and begin walk breaks before exhaustion. The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">run-walk guide</a> offers alternatives without declaring one interval universal.</p>
<p>Recovery reveals the effect of training. Persistent, focal, worsening, severe, or function-changing symptoms deserve attention rather than an automatic next session. The <a href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back">post-run recovery guide</a> covers general rest, fluid, food, and ease-back principles.</p>

<h2>Illustrative 12-week 10K-to-21K framework</h2>
<p>Define <strong>E</strong> as one familiar easy session and <strong>L</strong> as the current repeatable longer activity. The framework avoids universal kilometres because runners with the same 10K distance can have very different durations, walk patterns, routes, and recovery needs.</p>
<ol>
  <li><strong>Week 1 — Establish.</strong> Repeat E, use an optional shorter support activity, and repeat L without extending it. Record effort, conditions, and later response.</li>
  <li><strong>Week 2 — Extend once.</strong> Keep E familiar. Add one modest block to L only when Week 1 was manageable.</li>
  <li><strong>Week 3 — Repeat or extend.</strong> Practise the intended run-walk rhythm. Repeat Week 2 or add a small amount when recovery supports it.</li>
  <li><strong>Week 4 — Consolidate.</strong> Shorten or repeat the longer activity. Resolve route, shoe, carrying, or schedule friction.</li>
  <li><strong>Week 5 — Resume.</strong> Start from the best-controlled longer activity, not automatically the largest number, and make one modest change.</li>
  <li><strong>Week 6 — Practise support.</strong> Repeat E, keep the support activity easy, and use L to practise accessible fluids or familiar food if the duration warrants it.</li>
  <li><strong>Week 7 — Extend conditionally.</strong> Repeat or slightly extend L. Keep pace easy and avoid adding hills, speed, and distance together.</li>
  <li><strong>Week 8 — Step back.</strong> Reduce or hold the longer activity and review accumulated fatigue, equipment comfort, and schedule capacity.</li>
  <li><strong>Week 9 — Resume carefully.</strong> Return to the last well-controlled L and make one final progression only when appropriate.</li>
  <li><strong>Week 10 — Longest supported rehearsal.</strong> Use the practised route style, run-walk, clothing, carrying, tracking, fluid, and food decisions. It need not equal 21K.</li>
  <li><strong>Week 11 — Reduce and rehearse details.</strong> Use shorter familiar activity, check event rules and logistics, and do not replace missed distance.</li>
  <li><strong>Week 12 — Recover and attempt.</strong> Keep early activity brief and familiar. Attempt 21K only when health, conditions, route, event window, and recovery are suitable.</li>
</ol>
<p>This is a sequence of decisions, not twelve boxes that must be checked on schedule. Repeat a week, remove the support activity, return to a previous baseline, or choose a later event when needed. A missed activity is not debt and does not belong in a doubled catch-up session.</p>

<h2>Pace your first 21K conservatively</h2>
<p>Begin deliberately restrained. Excitement, downhills, other runners, or a watch target can make sustainable pace feel slow, but restraint protects the later portion.</p>
<p>Use a practised run-walk pattern from the start rather than waiting until the run has already become difficult. A runner can define effort checkpoints at route landmarks or time intervals: breathing, form, attention, conditions, fluid access, and whether the next segment remains sensible.</p>
<p>Cadence is an observation, not a compulsory target. Fatigue and pace changes may alter it, but chasing a universal step rate during a first half marathon can raise effort. The <a href="/blog/running-cadence-explained">running cadence guide</a> explains how to read the metric without treating 180 steps per minute as a rule.</p>
<p>A finish-time goal is optional. Base any range on comparable efforts plus walk breaks, elevation, stops, heat, congestion, and GPS uncertainty. Never let a prediction override symptoms, instructions, conditions, or a need to stop.</p>

<h2>Practise hydration and fueling basics</h2>
<p>Longer activities introduce questions that may not arise during a short easy run. There is no universal volume of water, electrolyte amount, food, gel schedule, or carbohydrate target suitable for every beginner. Needs and tolerance vary with body size, sweat rate, duration, intensity, temperature, humidity, diet, health, medicines, and access.</p>
<p>USADA emphasizes individual variation and practising fluids and food during training. Test familiar options during longer activities rather than introducing a product on the attempt. More is not automatically safer; excessive fluid intake can be harmful.</p>
<p>Map water, toilets, aid, and carried supplies. Check organized-event aid and carrying rules; assume a virtual route has no support unless arranged. Seek qualified individualized guidance when health, medicines, dietary restrictions, gastrointestinal issues, or performance needs complicate the plan.</p>

<h2>Choose a route and prepare for Philippine conditions</h2>
<p>A longer route should be safe at the time you will use it, not only attractive on a map. Check surface, elevation, crossings, lighting, traffic, construction, dogs, flooding, air quality, signal, water, toilets, transport, and places to shorten the activity. The <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe-route guide</a> provides a reusable assessment.</p>
<p>Heat, humidity, rain, thunderstorms, and flooding can change effort and risk. Consult current DOST-PAGASA forecasts, warnings, and heat-index information before leaving. Heat index combines temperature and humidity effects; a pace that was easy in cooler conditions may not remain easy. Reschedule, shorten, move indoors, or stop when conditions make the plan unsuitable.</p>
<p>When appropriate, share the route and expected return with a trusted person. Carry suitable identification, phone, needed medication, and an emergency plan, without unnecessarily publishing a live route or home location.</p>

<h2>Track longer activities without serving the device</h2>
<p>A phone or GPS watch can record duration, approximate distance, route, and pace, but neither makes the activity safe or the measurement exact. Battery, satellite view, device settings, pauses, tunnels, buildings, trees, and phone power management can affect the record.</p>
<p>Choose based on the runner's needs, battery, carrying comfort, route, and budget. The <a href="/blog/gps-watch-vs-running-app">GPS watch versus running app guide</a> compares those tradeoffs without declaring one universally more accurate.</p>
<p>Charge and test the chosen method during training. Save the original activity, and do not add distance solely because a device shows a round-number shortfall while conditions or symptoms say to stop. For a virtual event, the live rules determine accepted evidence and whether one continuous activity is required.</p>

<h2>Common first-half-marathon mistakes</h2>
<ul>
  <li><strong>Starting without a base:</strong> treating one hard 10K as proof that longer training is ready.</li>
  <li><strong>Racing the long activity:</strong> combining the week's greatest duration with its fastest effort.</li>
  <li><strong>Skipping step-back weeks:</strong> assuming every week must contain a larger number.</li>
  <li><strong>Saving walking for failure:</strong> waiting until exhaustion instead of using a practised plan.</li>
  <li><strong>Copying another runner's fuel or fluid schedule:</strong> ignoring individual tolerance and conditions.</li>
  <li><strong>Testing new gear on the attempt:</strong> discovering rubbing, carrying, battery, or stomach problems too late.</li>
  <li><strong>Making up missed distance:</strong> compressing the calendar or doubling the next activity.</li>
  <li><strong>Choosing an unsupported virtual route:</strong> assuming aid, toilets, transport, or emergency response will appear.</li>
</ul>

<h2>Can your first 21K be a virtual run?</h2>
<p>Yes, when a suitable virtual event offers a 21K or half-marathon category and its rules accept your intended activity. Virtual participation can offer date and route flexibility, but it does not automatically supply closed roads, course measurement, marshals, aid stations, weather cancellation, medical support, toilets, or transport.</p>
<p>Before registering, verify dates, distance, completion format, walking and treadmill rules, evidence, deadline, review, recognition, and cutoff. Browse <a href="/events">current HelloRun events</a> and treat the live event page as authoritative.</p>
<p>Use the <a href="/blog/how-to-run-your-first-10k-virtual-run">first virtual 10K guide</a> as a shorter-distance rehearsal for rules, route, pacing, tracking, proof, and post-activity review. Completing a virtual 10K does not automatically establish 21K readiness, but it can reveal logistical gaps before a longer goal.</p>
<p>HelloRun stores submitted activities for review according to the event configuration. Pending is not approved, and a tracked distance is not automatically an official result. Preserve the original record and never alter evidence to manufacture eligibility.</p>

<h2>What should come after your first half marathon?</h2>
<p>First, recover and review. Note pacing, walk breaks, route, conditions, fluids and food, equipment, tracking, symptoms, and how ordinary movement and sleep feel afterward. Avoid using post-finish excitement to schedule another demanding session immediately.</p>
<p>The next goal may be repeating 21K more comfortably, improving support, returning to shorter distances, building consistency, or taking a break. A marathon is not an automatic or required next step; farther is not inherently better.</p>
<p>Success can mean making good decisions, completing with a controlled strategy, stopping when appropriate, or learning that a later date is better. Distance is one outcome; sustainable participation is the larger one.</p>

<h2>Frequently asked questions</h2>
<h3>Is 12 weeks enough to train for a half marathon?</h3>
<p>It may organize a bridge for some runners with a stable base. It is not a universal deadline. Starting point, health, recovery, schedule, conditions, and individual guidance can require more time.</p>
<h3>Do I need gels or a sports drink?</h3>
<p>Not every runner needs the same product or schedule. Longer-duration fueling and hydration should be individualized and practised; seek qualified advice when needed.</p>
<h3>What if I miss a week?</h3>
<p>Do not compress or double the plan. Resume from a recent manageable baseline, repeat a week, extend the schedule, or choose a later event.</p>

<h2>Your practical next step</h2>
<p>Review the last four to six weeks and identify E, your familiar easy activity, and L, your current repeatable longer activity. If a controlled 10K or comparable duration is not yet part of that record, continue the shorter-distance foundation. If it is, place Week 1 on the real calendar with recovery and a backup; Week 1 repeats the baseline rather than extending it.</p>
<p>When preparation and a live category align, <a href="/events">browse HelloRun events</a> and verify every current rule before registering. Choose the event because the distance fits the plan—not as pressure to skip the plan.</p>

<h2>Official sources and review notes</h2>
<ul>
  <li><a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity">World Health Organization: Physical activity fact sheet</a> — population-level activity context and gradual participation.</li>
  <li><a href="https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html">US CDC: Steps for Getting Started With Physical Activity</a> — starting slowly, scheduling activity, and adapting to individual circumstances.</li>
  <li><a href="https://www.cdc.gov/physical-activity-basics/adding-adults/what-counts.html">US CDC: What Counts as Physical Activity for Adults</a> — relative intensity and talk-test context.</li>
  <li><a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/">NHS: Couch to 5K running plan</a> — one public example of walk-run progression and rest between beginner sessions.</li>
  <li><a href="https://www.usada.org/athletes/substances/nutrition-guide/">USADA: Nutrition Guide</a> — individual sports-nutrition, hydration, and fueling context.</li>
  <li><a href="https://pagasa.dost.gov.ph/weather/heat-index">DOST-PAGASA: Heat Index</a> — current Philippine heat-index observations and forecasts for outdoor planning.</li>
</ul>
<p>Sources and current HelloRun behavior were checked in September 2026. Guidance, weather information, platform behavior, and event rules can change. Recheck current sources and the complete live event page when making a training or participation decision.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Your first 21K plan in one minute',
  'How this guide was prepared',
  'What is a 21K or half marathon?',
  'Should a beginner start with 21K?',
  'Build a base before increasing distance',
  'How long does half-marathon preparation take?',
  'Structure a beginner half-marathon week',
  'The role of the weekly long activity',
  'Easy running, recovery, and run-walk strategies',
  'Illustrative 12-week 10K-to-21K framework',
  'Pace your first 21K conservatively',
  'Practise hydration and fueling basics',
  'Choose a route and prepare for Philippine conditions',
  'Track longer activities without serving the device',
  'Common first-half-marathon mistakes',
  'Can your first 21K be a virtual run?',
  'What should come after your first half marathon?',
  'Frequently asked questions',
  'Your practical next step',
  'Official sources and review notes'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/blog/10k-training-plan-for-beginners"',
  'href="/blog/how-long-to-run-5k-10k-21k"',
  'href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school"',
  'href="/blog/run-walk-method-beginner-friendly-way-build-endurance"',
  'href="/blog/how-to-choose-a-safe-route-for-your-virtual-run"',
  'href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back"',
  'href="/blog/beginners-guide-to-running-pace"',
  'href="/blog/running-cadence-explained"',
  'href="/blog/gps-watch-vs-running-app"',
  'href="/blog/how-to-run-your-first-10k-virtual-run"'
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
  if (wordCount < 2500 || wordCount > 3000) errors.push('article must contain 2500-3000 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('cover artwork is required for publication');
  if (/<h1\b/i.test(payload.contentHtml)) errors.push('body must not contain a page-level h1');
  if (/<h[12]>21K for Beginners: How to Prepare for Your First Half Marathon<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/every beginner (?:should|must) start with 21K|21K is the best starting distance/i.test(text)) errors.push('article must not prescribe 21K as a beginner starting distance');
  if (/every runner (?:must|should) train (?:four|five|six|seven) days/i.test(text)) errors.push('article must not prescribe a universal training frequency');
  if (/12 weeks (?:is|are) enough for everyone|everyone can train for (?:a )?(?:21K|half marathon) in 12 weeks/i.test(text)) errors.push('article must not prescribe a universal timeline');
  if (/the 10% rule guarantees safety|always increase (?:distance|mileage) by 10%/i.test(text)) errors.push('article must not present the 10% rule as safe or universal');
  if (/(?:this|the) (?:plan|framework) guarantees? (?:a )?(?:21K|half[- ]marathon) finish|guaranteed to finish/i.test(text)) errors.push('article must not guarantee outcomes');
  if (/make up (?:a )?missed (?:day|week|session) by doubling|double the next (?:run|session)/i.test(text)) errors.push('article must not endorse catch-up activity');
  if (/everyone needs (?:the same )?(?:gel|fuel|water|hydration)|drink exactly \d+ (?:ml|litres?|liters?) every hour/i.test(text)) errors.push('article must not prescribe universal fueling or hydration');
  if (/every (?:virtual )?event accepts walking|walking always qualifies/i.test(text)) errors.push('article must not overstate event eligibility');
  if (/pending (?:activity|distance) counts as (?:an )?(?:official|approved)|every submission is automatically approved/i.test(text)) errors.push('article must not overstate approval');
  if (!/should begin with a repeatable shorter-distance base/i.test(text)) errors.push('article must answer readiness intent immediately');
  if (!/illustrative 12-week bridge/i.test(text)) errors.push('article must qualify its planning window');
  if (!/Population guidance is not a personal training plan/i.test(text)) errors.push('article must distinguish population guidance from individual advice');
  if (!/A missed activity is not debt/i.test(text)) errors.push('article must include missed-session guidance');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }
  for (let week = 1; week <= 12; week += 1) {
    if (!payload.contentHtml.includes(`<strong>Week ${week} —`)) errors.push(`missing framework week: ${week}`);
  }
  if (errors.length) throw new Error(`Invalid beginner 21K payload: ${errors.join('; ')}`);
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
