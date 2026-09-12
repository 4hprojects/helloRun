'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'what-is-a-long-run-for-beginners';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'What Is a Long Run? A Beginner’s Guide to Running Farther',
  excerpt: 'Understand what makes a run “long” for your current level, then extend one easy weekly activity gradually with flexible distance, time, walking, route, and recovery choices.',
  category: 'Training',
  tags: Object.freeze([
    'long run for beginners', 'beginner long run', 'running farther', 'easy long run',
    'run walk long run', 'running endurance', 'long run recovery', 'running Philippines'
  ]),
  seoTitle: 'What Is a Long Run? A Beginner’s Guide to Running Farther',
  seoDescription: 'Learn what a long run means for beginners, why it is relative to your normal running, how it supports endurance, and how to add longer runs gradually.',
  coverImageAlt: 'Paper-cut illustration of a Filipino beginner extending one relaxed run along a tropical route in three gradual stages'
});

const RAW_CONTENT_HTML = `
<p>A <strong>long run for beginners</strong> is simply the longest planned easy running, run-walk, or walking activity in the current week. It is relative to what you can already repeat—not a fixed distance that suddenly makes someone a “real” runner. If your usual outings are twenty comfortable minutes, a slightly longer easy outing may be your long run. Another runner’s 10K, social-media total, or old personal best does not define yours.</p>
<p>The useful question is not “How far must I go?” but “What extension can I complete at controlled effort, recover from normally, and support with my present health, schedule, route, and conditions?” A long run should build familiarity with sustained easy movement. It should not be a weekly race, punishment, or test of how much discomfort you can ignore.</p>
<blockquote><strong>Beginner definition:</strong> one deliberately longer, mostly easy activity relative to your normal week, separated by enough recovery and adjusted when health, weather, terrain, or life changes.</blockquote>

<h2>What counts as a long run for a beginner?</h2>
<p>No universal kilometre mark counts as long for every beginner. Three kilometres may be a genuine extension for someone beginning with short run-walk sessions; eight kilometres may be ordinary for someone with a repeatable 5K base. Duration can be more informative than distance when routes, hills, heat, or walking breaks change.</p>
<p>Use several ordinary recent weeks as the reference. Identify the duration or distance you can repeat without racing and without a concerning response during or after the activity. A proposed long run is a modest extension from that baseline, not a leap from inactivity to an event distance. If you are returning after illness, injury, surgery, pregnancy, or a long break, current function matters more than what you once did.</p>
<p>A long run can include walking. It can be entirely brisk walking for a new mover, a planned run-walk pattern, or continuous easy running for someone ready for it. The label describes its role in your week, not a required technique or pace.</p>

<h2>Why a weekly longer activity can help</h2>
<p>A controlled longer outing gives you practice staying active beyond your familiar duration. Over time it can support endurance, pacing judgment, route confidence, equipment decisions, and the patience to begin slowly. It also reveals practical needs: where shade or toilets are, whether a shoe causes rubbing, how a tracker behaves, and how the rest of the day feels afterward.</p>
<p>Regular physical activity supports health, but population guidance is not a personal training plan. The <a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity">World Health Organization physical-activity guidance</a> describes weekly activity for populations; it does not assign an individual long-run distance or prove readiness for 10K or 21K.</p>
<p>The benefit comes from a repeatable pattern, not from making every Sunday bigger. Repeating, shortening, or skipping a planned extension can be the right decision. One heroic outing followed by prolonged difficulty is less useful than activity you can integrate into an ordinary month.</p>

<h2>Distance or time: which should you use?</h2>
<p>Either can work. Distance is convenient for learning a known route or preparing for a distance-based event. Time is often simpler for beginners because sixty minutes remains sixty minutes even when hills, humidity, traffic crossings, or walking change the kilometres covered.</p>
<p>A time-based plan might extend a familiar easy outing by a small, manageable amount and then repeat it before changing again. A distance-based plan might add a short safe loop. Neither method is automatically safer. Judge the entire demand: effort, duration, terrain, temperature, sleep, other weekly activity, and later recovery.</p>
<p>Do not treat the popular “10 percent rule” as a guarantee. A percentage ignores the starting value and everything else changing in the week. Ten percent of too much is still too much, while a mathematically larger change from a very small baseline may sometimes remain manageable. Use the number only as descriptive arithmetic, then make the decision from context and response.</p>

<h2>How long should your beginner long run be?</h2>
<p>Long enough to be a controlled extension and short enough that you keep your easy effort, form, judgment, and planned route. Finish with the sense that you could have continued a little rather than emptying the tank. There is no required minimum duration, maximum distance, or ideal share of weekly kilometres that fits everyone.</p>
<p>Start from a repeatable baseline. If several recent easy activities have been manageable during and after, choose one slightly longer opportunity. Hold it for more than one week when useful. If recovery is unusually slow, the effort drifts hard, conditions worsen, or the rest of the week becomes unmanageable, shorten or return to the familiar level.</p>
<p>The <a href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school">weekly running schedule guide</a> can help place primary, flexible, backup, and unavailable windows around work or school. A missed activity is not debt: do not double the next outing or remove recovery to “catch up.”</p>

<h2>How often should beginners do a long run?</h2>
<p>Many runners use one longer easy activity in a week, but that convention is not a command. A new runner may need several weeks of short, repeatable activity before adding one. Someone with fewer suitable days may use a longer cycle rather than forcing seven-day symmetry. Illness, symptoms, travel, extreme weather, poor recovery, or professional guidance may mean no long run that week.</p>
<p>Keep meaningful space around the longer effort. The NHS <a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/">Couch to 5K plan</a> uses walking and running with rest days between its beginner sessions. That is a useful example of gradual structure, not proof that its exact frequency or timeline fits every person.</p>

<h2>Keep the effort easy enough to control</h2>
<p>A beginner long run is normally easy rather than a time trial. Begin more slowly than excitement suggests. On a suitable easy effort, breathing and movement feel controlled, and you are not repeatedly chasing pace. The <a href="https://www.cdc.gov/physicalactivity/basics/measuring/index.html">CDC talk test</a> describes relative intensity through the ability to talk; use it as a broad cue, not a diagnosis or precision instrument.</p>
<p>Pace on the screen can be misleading. Hills, heat, humidity, wind, surface, crossings, fatigue, and walking affect it. The <a href="/blog/beginners-guide-to-running-pace">beginner pace guide</a> explains why one pace is not universally easy. Slow down, shorten the running intervals, walk, turn back, or stop when the planned effort is no longer appropriate.</p>

<h2>Walking and run-walk both belong</h2>
<p>Walking breaks do not cancel a long run. Planned run-walk can help you control effort and practise a longer time on your feet without pretending that continuous running is the only valid method. Choose a simple pattern you already understand and begin it early rather than waiting until exhausted.</p>
<p>The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">run-walk method guide</a> offers time-, landmark-, and effort-led options without prescribing one ratio. You may also walk hills, crowded segments, slippery surfaces, water stops, or road crossings. For an event, confirm whether walking is accepted; event rules, not this article, decide eligibility.</p>

<h2>Progress gradually without chasing a rule</h2>
<p>Change one main variable at a time. You might extend duration while keeping route and effort familiar, or choose a new route while keeping duration steady. Adding distance, hills, speed, frequency, and new shoes together makes it difficult to understand the response.</p>
<ol>
  <li><strong>Establish:</strong> repeat ordinary easy outings and note recovery.</li>
  <li><strong>Extend:</strong> add one modest amount of time or a short route segment.</li>
  <li><strong>Repeat:</strong> keep the same long run until it feels integrated, rather than automatically increasing.</li>
  <li><strong>Step back:</strong> shorten when conditions or accumulated demand call for it.</li>
  <li><strong>Review:</strong> decide whether to repeat, progress, or pause from the full picture.</li>
</ol>
<p>This sequence is a decision framework, not a universal five-week plan. A stage may last one week, several weeks, or longer. Progress includes completing the same route with steadier judgment or better recovery; the app total does not always need to rise.</p>

<h2>Plan a safe, practical route</h2>
<p>A longer route needs more thought than a short loop. Prefer a familiar, well-lit, suitable surface with safe crossings, phone signal where possible, and realistic access to water, shade, toilets, transport, or an exit. Tell a trusted person the route and expected return when appropriate. Carry necessary identification, communication, and personal medication according to your needs.</p>
<p>An out-and-back route is simple, but it can tempt you to go too far before turning. Short loops make early stops and supplies easier. The <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe virtual-run route guide</a> covers traffic, lighting, surface, weather, communications, and contingency planning.</p>
<p>In the Philippines, check current local forecasts, warnings, and <a href="https://pagasa.dost.gov.ph/weather/heat-index">DOST-PAGASA heat-index information</a>. Change the time, route, venue, duration, or activity when heat, lightning, flooding, air quality, visibility, or surface conditions are unsuitable. A calendar plan never overrules an official warning or what is happening around you.</p>

<h2>Food and hydration are individual</h2>
<p>Do not introduce a complicated fueling system simply because an activity is called long. Needs vary with duration, conditions, body, health, medicines, access, normal meals, and professional advice. There is no universal volume of water, electrolyte amount, snack, gel schedule, or carbohydrate target for every beginner.</p>
<p>For a short extension, familiar meals and normal access to fluids may be enough for many people; others have specific requirements. Practise only suitable, familiar options rather than copying a race-day post. Avoid testing several new foods, supplements, and drink concentrations together. People with medical or dietary considerations should follow individualized qualified advice.</p>

<h2>What recovery should look like</h2>
<p>Recovery is part of the long run. Note how you feel later that day and over the next day or two: ordinary tiredness, sleep, appetite, soreness, mood, movement, and readiness for normal responsibilities. A single number cannot decide whether the load was appropriate.</p>
<p>Plan an easier period afterward and avoid scheduling another demanding session merely because an app suggests one. The <a href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back">post-run recovery guide</a> explains rest, fluids, ordinary food, sleep, and decisions about easing back. Persistent, worsening, severe, sudden, or unexplained symptoms need appropriate attention rather than motivational slogans.</p>

<h2>Know when to stop or seek help</h2>
<p>Stop the activity and seek urgent help for emergency warning signs such as chest pressure or pain, fainting, severe breathing difficulty, confusion, sudden weakness, or other severe or rapidly worsening symptoms. Do not use this list to rule out an emergency. Follow local emergency guidance and qualified medical advice.</p>
<p>Pause and obtain appropriate guidance for pain that changes your movement, recurrent dizziness, symptoms that persist or worsen, or recovery that repeatedly disrupts daily life. Health conditions, disability, pregnancy or postpartum status, medicines, recent illness, injury, surgery, and prolonged inactivity can all change what is suitable. This article is education, not diagnosis, clearance, rehabilitation, or an individual prescription.</p>

<h2>Track enough to learn, not to prove worth</h2>
<p>Record the planned and completed time or distance, broad effort, run-walk choice, route, conditions, symptoms, and later recovery. Compare similar outings over several weeks rather than judging one GPS trace. Phone and watch distance can vary because of signal, settings, pauses, buildings, trees, turns, and device processing.</p>
<p>The <a href="/blog/running-cadence-explained">cadence guide</a> explains why step rate is descriptive rather than a universal target. You do not need to manipulate cadence or pace merely because the run is longer. For virtual events, save the evidence required by the live rules. Recorded, submitted, pending, and approved are different states; pending is not approved.</p>

<h2>How long runs fit a first 10K</h2>
<p>A controlled longer activity can gradually make the duration of a first 10K less unfamiliar, but one long run does not prove readiness. The <a href="/blog/10k-training-plan-for-beginners">beginner 10K guide</a> starts from current repeatable activity and uses an illustrative progression with consolidation rather than a guaranteed deadline.</p>
<p>Your longest preparation outing does not have to be an all-out 10K rehearsal. The goal is to arrive with an appropriate base, practised effort and run-walk choices, route and equipment knowledge, and a recovery pattern you understand. Choose an event only when its date leaves a realistic runway.</p>

<h2>How long runs fit a first 21K</h2>
<p>For a half marathon, longer easy activities become more consequential because time on feet, recovery, route support, food and fluids, weather, and tracking all matter more. A first 21K should begin from a repeatable shorter-distance base, not from completing one difficult 10K.</p>
<p>The <a href="/blog/21k-half-marathon-for-beginners">beginner 21K guide</a> offers an illustrative bridge for an established beginner. Its calendar cannot manufacture the missing base or guarantee a finish. The <a href="/blog/how-long-to-run-5k-10k-21k">5K, 10K, and 21K time guide</a> can help with planning arithmetic, but a predicted finish time is not medical clearance or readiness evidence.</p>

<h2>A simple long-run planning card</h2>
<ul>
  <li><strong>Current baseline:</strong> What easy duration or distance has been repeatable recently?</li>
  <li><strong>Purpose:</strong> What will this slightly longer outing help you practise?</li>
  <li><strong>Extension:</strong> What one modest change will you make?</li>
  <li><strong>Effort:</strong> Which talk, breathing, or perceived-effort cue will keep it controlled?</li>
  <li><strong>Route:</strong> Where are the exits, shade, water, toilets, crossings, and hazards?</li>
  <li><strong>Conditions:</strong> Which forecast, warning, or real-time observation changes the plan?</li>
  <li><strong>Recovery:</strong> What easier time follows, and what response will you review?</li>
  <li><strong>Change rule:</strong> What makes you shorten, walk, stop, repeat, postpone, or seek help?</li>
</ul>
<p>Write the card before leaving. Its value is not perfect prediction; it prevents the original plan from disappearing when enthusiasm rises.</p>

<h2>Frequently asked questions</h2>
<h3>Does 5K count as a long run?</h3>
<p>It can. If 5K is longer than your ordinary easy outings and is a controlled, planned extension, it may fill the long-run role. For someone else it may be a routine distance.</p>
<h3>Should my long run be every week?</h3>
<p>Not necessarily. Weekly is a common structure, but beginners can repeat shorter activity first or use a longer cycle. Recovery, health, conditions, schedule, and qualified guidance matter more than maintaining a label.</p>
<h3>Can I walk during a long run?</h3>
<p>Yes for a personal activity. Planned or responsive walking can control effort. If the activity is for an event, read its current rules because accepted activity varies.</p>
<h3>Should the long run be my fastest run?</h3>
<p>No. Its usual purpose is sustained easy practice, not a weekly race. Pace may naturally be slower because duration, terrain, conditions, or walking differ.</p>
<h3>What if I miss the planned day?</h3>
<p>Use a suitable backup window, repeat the familiar level later, or skip it. Do not create activity debt, double the next run, or compress recovery.</p>

<h2>Choose a long run you can repeat</h2>
<p>The right beginner long run is relative, easy, supported, and reviewable. Start with what is repeatable, extend one variable modestly, allow walking, plan the route and recovery, and let conditions or symptoms change the day. Running farther is built through patient decisions, not through earning a fixed distance label.</p>
<p>Review the plan after several ordinary weeks, not only after the most successful outing. A useful long run leaves information you can act on: whether the route worked, the effort stayed controlled, daily life remained manageable, and the same level deserves repetition. That evidence is more valuable than comparing one upload with another runner’s highlight.</p>
<p>When you want a meaningful date for that practice, <a href="/events">browse current HelloRun events</a>. Read the live distance, activity window, accepted activity, proof, review, route, and recognition rules before registering. Choose the event that fits your present path; registration itself does not establish readiness.</p>

<h2>Official sources and review note</h2>
<p>This guide was reviewed in September 2026 against current WHO physical-activity guidance, the CDC intensity talk test, the NHS Couch to 5K beginner structure, and DOST-PAGASA heat-index information. Sources support the bounded principles attributed to them; they do not prescribe this article’s examples or make them individually safe. Final suitability depends on personal circumstances and, when relevant, qualified advice.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'What counts as a long run for a beginner?',
  'Why a weekly longer activity can help',
  'Distance or time: which should you use?',
  'How long should your beginner long run be?',
  'Keep the effort easy enough to control',
  'Walking and run-walk both belong',
  'Plan a safe, practical route',
  'How long runs fit a first 10K',
  'How long runs fit a first 21K',
  'Frequently asked questions',
  'Official sources and review note'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/blog/10k-training-plan-for-beginners"',
  'href="/blog/21k-half-marathon-for-beginners"',
  'href="/blog/running-cadence-explained"',
  'href="/blog/how-long-to-run-5k-10k-21k"',
  'href="/blog/run-walk-method-beginner-friendly-way-build-endurance"',
  'href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school"',
  'href="/blog/how-to-choose-a-safe-route-for-your-virtual-run"'
]);

function buildArticlePayload({ coverImageUrl } = {}) {
  const contentHtml = sanitizeHtml(RAW_CONTENT_HTML).trim();
  const contentText = htmlToPlainText(contentHtml);
  const wordCount = contentText.split(/\s+/).filter(Boolean).length;
  const payload = { ...ARTICLE, tags: [...ARTICLE.tags], contentHtml, contentText, contentRaw: contentText,
    readingTime: Math.ceil(wordCount / 180), ogImageUrl: String(coverImageUrl || '').trim(), coverImageAlt: ARTICLE.coverImageAlt };
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
  if (/every beginner (?:must|should) run \d+|a long run is always \d+/i.test(text)) errors.push('article must not prescribe a universal distance');
  if (/always increase (?:distance|mileage) by 10%|10 percent guarantees/i.test(text)) errors.push('article must not present the 10 percent rule as universal');
  if (/never walk during|walking does not count/i.test(text)) errors.push('article must not exclude walking');
  if (/drink exactly \d+ (?:ml|litres?|liters?) every hour|everyone needs the same (?:fuel|gel)/i.test(text)) errors.push('article must not prescribe universal fueling or hydration');
  if (/every (?:virtual )?event accepts walking|pending is approved/i.test(text)) errors.push('article must not overstate event eligibility or approval');
  if (/you should double the next (?:run|session)|make up.*by doubling/i.test(text)) errors.push('article must not endorse catch-up activity');
  if (!/A long run for beginners is simply the longest planned easy/i.test(text)) errors.push('article must answer search intent immediately');
  if (!/Population guidance is not a personal training plan/i.test(text)) errors.push('article must distinguish population guidance from individual advice');
  for (const heading of REQUIRED_HEADINGS) if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  for (const link of REQUIRED_LINKS) if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  if (errors.length) throw new Error(`Invalid beginner long-run payload: ${errors.join('; ')}`);
  return true;
}

module.exports = { ARTICLE, CANONICAL_SLUG, RAW_CONTENT_HTML, REQUIRED_HEADINGS, REQUIRED_LINKS, buildArticlePayload, validateArticlePayload };
