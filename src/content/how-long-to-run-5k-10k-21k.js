'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-long-to-run-5k-10k-21k';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How Long Does It Take to Run 5K, 10K, and 21K?',
  excerpt: 'Compare exact pace-to-finish calculations for 5K, 10K, and a half marathon, then learn why beginner times vary with strategy, route, conditions, and timing rules.',
  category: 'Training',
  tags: Object.freeze([
    'average running time',
    '5K finish time',
    '10K finish time',
    'half marathon time',
    'beginner pace',
    'run walk time',
    'race planning',
    'distance goals'
  ]),
  seoTitle: 'How Long Does It Take to Run 5K, 10K, and 21K?',
  seoDescription: 'See typical finish-time ranges for 5K, 10K, and 21K distances and learn why your pace, experience, route, weather, and run-walk strategy matter.',
  coverImageAlt: 'Editorial illustration of Filipino runners moving at different comfortable paces along connected 5K, 10K, and half-marathon route loops'
});

const RAW_CONTENT_HTML = `
<p>How long does it take to run 5K, 10K, or 21K? At a steady 6:00 min/km pace, the mathematical answers are 30 minutes for 5K, 1 hour for 10K, and about 2:06:35 for an official 21.0975 km half marathon. At 8:00 min/km, they are 40 minutes, 1:20:00, and about 2:48:47. At 10:00 min/km, they are 50 minutes, 1:40:00, and about 3:30:59.</p>
<p>Those calculations are exact only if the stated average pace and measured distance are exact. A real finish can include walk breaks, hills, congestion, crossings, aid stops, heat, navigation, device error, or different timing rules. There is no single correct average running time that every beginner should match.</p>
<p>A “good” time is one that fits your current preparation, the route, the event rules, and a sustainable strategy. Completing a distance safely with planned walking can be a more appropriate goal than chasing the midpoint of a dataset built from experienced race finishers.</p>
<blockquote><strong>The useful answer:</strong> calculate a planning range from your own repeatable pace, add context for the route and conditions, and treat published averages as descriptions of selected finishers—not pass marks.</blockquote>

<h2>Why there is no single correct finish time</h2>
<p>Two people can cover the same distance appropriately and finish far apart. One may run continuously on a flat certified road course. Another may use run-walk on a humid virtual route with crossings. A third may be returning after a break or using an accessibility strategy. The clock records duration; it does not explain the circumstances.</p>
<p>“Average” can also mean different things. A mean adds every result and divides by the number of results. A median is the middle result after sorting. A percentile describes the position of a result in a particular dataset. Online articles often use these terms loosely, then remove the year, country, event type, inclusion rules, and who was missing.</p>
<p>A dataset of registered road-race finishers does not represent every beginner, walker, virtual participant, person who did not finish, or member of the general population. Course cut-offs can exclude slower times. Fast events and inclusive community events attract different fields. Historical results do not automatically describe runners in the Philippines today.</p>
<p>Use comparative data for curiosity and broad context. Use current training and event details for decisions. If you are still selecting a distance, the <a href="/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge">distance-choice guide</a> focuses on readiness rather than prestige.</p>
<p>Finish-time distributions change with participation, cut-offs, timing methods, and event format. Even a large dataset answers only questions about its included records. This guide therefore avoids demographic “beginner” targets and asks instead what range is supported by the runner's preparation and event.</p>

<h2>How running time is calculated</h2>
<p>The basic formula is <strong>finish time = average pace × distance</strong>. Pace must use the same distance unit. A pace of 7:00 min/km means seven minutes for each kilometre. Multiply seven minutes by 5 kilometres to estimate 35 minutes. Multiply by 10 to estimate 1:10:00.</p>
<p>For a half marathon, multiply by 21.0975 rather than 21 if the event uses the official distance. At 7:00 min/km, that is 147.6825 minutes. Convert the decimal portion into seconds: 0.6825 × 60 is about 41 seconds, producing approximately 2:27:41.</p>
<p>The formula assumes one overall average. It does not require every kilometre to be identical. Faster and slower segments, including planned walks, can combine into the same average pace. Elapsed-time pace includes the entire interval between start and finish; moving-time pace may remove detected stops. Check which one the event uses.</p>
<p>The <a href="/blog/beginners-guide-to-running-pace">beginner running pace guide</a> explains units, decimals, splits, current pace, moving time, and elapsed time in more detail.</p>

<h2>Pace-to-finish-time reference for 5K, 10K, and 21.1K</h2>
<p>This reference uses exact multiplication rounded to the nearest second for a 21.0975 km half marathon. The numbers are planning calculations, not predictions or required targets. The displayed pace is the average across the whole distance, including walking if elapsed time is used.</p>
<ul>
  <li><strong>5:00 min/km:</strong> 5K — 25:00; 10K — 50:00; half marathon — 1:45:29.</li>
  <li><strong>6:00 min/km:</strong> 5K — 30:00; 10K — 1:00:00; half marathon — 2:06:35.</li>
  <li><strong>7:00 min/km:</strong> 5K — 35:00; 10K — 1:10:00; half marathon — 2:27:41.</li>
  <li><strong>8:00 min/km:</strong> 5K — 40:00; 10K — 1:20:00; half marathon — 2:48:47.</li>
  <li><strong>9:00 min/km:</strong> 5K — 45:00; 10K — 1:30:00; half marathon — 3:09:53.</li>
  <li><strong>10:00 min/km:</strong> 5K — 50:00; 10K — 1:40:00; half marathon — 3:30:59.</li>
  <li><strong>12:00 min/km:</strong> 5K — 1:00:00; 10K — 2:00:00; half marathon — 4:13:10.</li>
  <li><strong>15:00 min/km:</strong> 5K — 1:15:00; 10K — 2:30:00; half marathon — 5:16:28.</li>
</ul>
<p>Do not select the desired finish time first and assume its pace is sustainable. Start with several recent, repeatable activities in comparable conditions. Calculate a range, not one perfect second. For example, a recent controlled 5K between 42 and 45 minutes provides more honest planning information than an old 35-minute personal best completed under different circumstances.</p>

<h2>Average 5K time: what the numbers can and cannot tell you</h2>
<p>Five kilometres is 3.107 miles. Depending on average pace, common mathematical examples include 25 minutes at 5:00 min/km, 35 minutes at 7:00, 45 minutes at 9:00, 1 hour at 12:00, and 1:15:00 at 15:00. These examples span running, run-walk, and purposeful walking without declaring boundaries between them.</p>
<p>A historical RunRepeat comparison, updated in 2024 and based on 35 million results collected over 20 years from more than 28,000 races, reports an overall 5K midpoint of 34:37. Its displayed 80th-percentile time is 43:39 and 90th-percentile time is 50:04. In that table, a higher percentile number represents a slower finish.</p>
<p>That does not make 34:37 the average 5K time a beginner “should” run. The dataset pools selected race results across years and settings and is not a beginner-only Philippine sample. It includes people motivated to enter races and can reflect event cut-offs and data availability. A 45-minute or 60-minute 5K can be an appropriate first completion even though it sits beyond that historical midpoint.</p>
<p>A good 5K time for beginners is therefore better framed personally: Can the pace be controlled? Does the runner use a practised run-walk plan? Is the route safe? Does recovery remain manageable? Has the live event confirmed that the anticipated duration and walking strategy fit its rules?</p>
<p>If 5K is the current goal, the <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K plan</a> provides an illustrative walk-run progression without imposing a finish-time requirement.</p>

<h2>Average 10K time: doubling 5K is not the whole story</h2>
<p>Ten kilometres is 6.214 miles. The arithmetic is convenient: multiply min/km pace by ten. A 6:00 pace equals 1 hour; 7:00 equals 1:10:00; 8:00 equals 1:20:00; 10:00 equals 1:40:00; and 12:00 equals 2 hours.</p>
<p>The same RunRepeat historical race-result dataset reports an overall 10K midpoint of 1:02:08, with 1:16:45 at its displayed 80th percentile and 1:27:58 at its 90th percentile. Again, these are positions among included finishers, not standards for first-time runners and not current HelloRun averages.</p>
<p>A 10K time is often more than exactly twice a runner's 5K time because the longer distance requires a more conservative sustainable effort. Training history, fueling needs, weather exposure, hills, and accumulated fatigue have more time to affect the result. Simply doubling a maximum-effort 5K assumes that maximum 5K pace can continue for twice the distance, which is generally not a sound beginner plan.</p>
<p>Use a repeatable easy or run-walk pace for a conservative estimate. If recent longer activity averages between 8:30 and 9:00 min/km in similar conditions, the bare calculation is 1:25:00 to 1:30:00. Add reasonable time for the actual course, planned stops, and timing method rather than advertising 1:25 as guaranteed.</p>
<p>The <a href="/blog/10k-training-plan-for-beginners">beginner 10K training framework</a> explains how to extend one longer activity from a repeatable 5K base without turning every week into a test.</p>

<h2>Average half marathon time and average 21K time</h2>
<p>A half marathon is officially 21.0975 kilometres or 13.1094 miles, according to World Athletics. People often say “21K,” but a route measured as exactly 21.000 km is 97.5 metres shorter. At 7:00 min/km, that difference is about 41 seconds. Use the distance on the live event page when estimating.</p>
<p>At steady average paces, a half marathon calculates to approximately 1:45:29 at 5:00 min/km, 2:06:35 at 6:00, 2:27:41 at 7:00, 2:48:47 at 8:00, 3:09:53 at 9:00, and 3:30:59 at 10:00. Run-walk and walking calculations can extend well beyond those examples, subject to event rules and cut-offs.</p>
<p>The RunRepeat dataset reports an overall half-marathon midpoint of 2:14:59, with 2:41:05 at its displayed 80th percentile and 2:59:18 at its 90th percentile. This comparison reflects included race finishers, not every person who began training or every event. It should not be turned into a beginner deadline.</p>
<p>The average 21K time for beginners is particularly difficult to define because “beginner” can mean new to running, new to the distance, returning after a break, or experienced at shorter races. A first half marathon also exposes the runner to much more duration, weather, hydration access, fueling decisions, and muscular fatigue than a 5K.</p>
<p>Readiness for 21.1K cannot be inferred from a pace table. Build an appropriate foundation, understand the event's cut-off and support, and obtain individualized guidance where needed. The later September half-marathon article will be linked only after it exists.</p>

<h2>Walking and run-walk finish times</h2>
<p>Walking and run-walk can produce a wide range of finish times. A steady 12:00 min/km average calculates to 1 hour for 5K, 2 hours for 10K, and about 4:13:10 for a half marathon. At 15:00 min/km, the same distances calculate to 1:15:00, 2:30:00, and about 5:16:28.</p>
<p>A run-walk result depends on the running pace, walking pace, transition time, interval pattern, stops, and whether the displayed calculation uses moving or elapsed time. It cannot be predicted from the running portion alone. A runner alternating relaxed running with complete walking resets may finish later—and more appropriately—than someone forcing continuous running.</p>
<p>The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">run-walk method guide</a> explains time-, landmark-, and effort-led patterns. No single interval is universally best. Choose a practised pattern and estimate from the whole session.</p>
<p>Walking does not automatically qualify for every event. Some events welcome it, some apply a cut-off, and some define completion differently. Read the live activity rules before registering or attempting the distance.</p>

<h2>How pace affects finish time</h2>
<p>A change of one minute per kilometre changes 5K by 5 minutes, 10K by 10 minutes, and a half marathon by about 21 minutes 6 seconds. That multiplication explains why a small pace difference becomes a large finish-time difference as distance grows.</p>
<p>It does not mean a beginner should force a one-minute improvement. Pace is an outcome of effort, preparation, route, conditions, and measurement. Trying to remove 10 minutes from a 10K simply by watching the device can make the opening unsustainable.</p>
<p>Use a range with checkpoints. Suppose a runner estimates 8:00–8:30 min/km for 10K. The bare finish range is 1:20:00–1:25:00. They can begin near the slower end, review breathing and effort after the opening kilometres, and keep the planned walk breaks. The target guides decisions without becoming permission to ignore symptoms or conditions.</p>
<p>The <a href="/blog/how-to-breathe-while-running">breathing guide</a> explains why reducing effort is usually more useful than forcing a breathing pattern when an easy pace stops feeling controlled.</p>

<h2>Terrain, elevation, heat, and weather</h2>
<p>A flat, cool, uncongested route and a hilly, humid route cannot be compared by distance alone. Climbing usually slows pace at similar effort. Descending can regain some time but adds impact and does not guarantee an equal return. Tight turns, trail surfaces, puddles, crossings, and crowds also change rhythm.</p>
<p>Heat and humidity can raise strain at a familiar pace. Slow down, use perceived effort, choose safer timing and routes, and change or postpone the attempt when conditions warrant it. Do not use a target time calculated in cool weather as a command during severe heat.</p>
<p>The <a href="/blog/how-to-run-safely-during-hot-and-humid-weather">hot-weather running guide</a> covers planning and warning signs. The <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe-route guide</a> covers lighting, surface, crossings, signal, weather exposure, and backup routes.</p>
<p>When comparing results, note total climb, surface, temperature, humidity, congestion, stops, and route measurement. “Same distance” does not mean “same test.”</p>

<h2>Why virtual-run times may differ</h2>
<p>An onsite race usually supplies a defined course, start procedure, timing system, and support. A virtual participant chooses a permitted route and time within the event window. That flexibility can reduce congestion, but it also introduces crossings, navigation, GPS reception, weather choice, elevation, and individual stop decisions.</p>
<p>Virtual distance may come from a consumer phone, watch, treadmill, or another accepted source. Recorded distance and pace can vary with signal, device processing, calibration, and autopause. An onsite certified road course and a personal GPS route are not interchangeable measurements.</p>
<p>Check whether the event uses elapsed time, moving time, uploaded proof, manual fields, accumulated sessions, or a single activity. Confirm whether walking and treadmill activity qualify. A pending submission is potential progress, not an approved result, and tracking a distance does not guarantee acceptance.</p>
<p>Choose a route and strategy that fit the rules rather than seeking a downhill or interrupted route only to improve the displayed average. Preserve the original evidence and explain legitimate interruptions through the provided process.</p>

<h2>Should beginners chase a target time?</h2>
<p>A target can guide pacing when it comes from current evidence and remains adjustable. It becomes unhelpful when copied from a global midpoint or someone with different preparation and conditions.</p>
<p>A personal best and a successful run are not synonyms. A deliberately slower finish can be successful when it reflects an appropriate first attempt, planned walking, a demanding route, hot conditions, or a return after time away. Conversely, a fast result does not prove that the pacing decision was appropriate or that recovery can be ignored.</p>
<p>For a first distance, consider a completion range rather than a single ambitious time. Set an opening effort, planned walk strategy, review points, and conditions that would trigger slowing, stopping, or choosing another day. A “C goal” can simply be making a safe, honest attempt; a “B goal” can be following the pacing plan; an “A goal” can be a time considered only if the day remains suitable.</p>
<p>Do not leap from 5K to 21K because the arithmetic looks manageable. Longer distance adds training, recovery, route, hydration, fueling, and time-on-feet demands that multiplication cannot assess.</p>
<p>New, severe, unexplained, recurrent, or worsening symptoms need appropriate attention. Finish-time advice is general education, not medical clearance, diagnosis, rehabilitation, or individualized coaching.</p>

<h2>How to set your next distance goal</h2>
<ol>
  <li><strong>Review recent activity.</strong> Use several ordinary, repeatable sessions, not only a personal best.</li>
  <li><strong>Choose the distance.</strong> Check whether the training runway and event support fit your current foundation.</li>
  <li><strong>Confirm the rules.</strong> Read cut-offs, walking policy, timing method, proof requirements, route rules, and event window.</li>
  <li><strong>Calculate a range.</strong> Multiply a realistic whole-activity pace range by the exact event distance.</li>
  <li><strong>Add context.</strong> Account for hills, heat, congestion, stops, surface, navigation, and device behavior without pretending the adjustment is exact.</li>
  <li><strong>Plan conservatively.</strong> Begin near the easier end and use practised walk breaks before urgency develops.</li>
  <li><strong>Review afterward.</strong> Record elapsed time, moving time, distance, route, conditions, effort, and recovery before choosing the next goal.</li>
</ol>
<p>A missed target is information, not debt. Do not double the next session, remove recovery, or immediately repeat a maximal attempt to recover a number.</p>

<h2>Frequently asked questions</h2>
<h3>What is a good 5K time for a beginner?</h3>
<p>There is no universal good time. A controlled first 5K may take 30 minutes, 45 minutes, an hour, or longer depending on pace, walking, route, conditions, and the runner. Use current repeatable activity and the event's rules.</p>
<h3>Is one hour a good 10K time?</h3>
<p>One hour equals 6:00 min/km. It is a meaningful goal for some runners and unsuitable for others. The relevant question is whether that pace is supported by current training and can be approached safely under the actual conditions.</p>
<h3>Can I predict 10K by doubling my 5K time?</h3>
<p>Doubling provides a lower-bound arithmetic comparison, not a reliable beginner prediction. Most people cannot sustain maximum 5K effort for twice the distance. Use longer easy activity and a conservative pace range instead.</p>
<h3>Does 21K mean the same as a half marathon?</h3>
<p>It is commonly used as shorthand, but an official half marathon is 21.0975 km. Check the live event distance. The additional 97.5 metres changes finish time slightly.</p>
<h3>Should stops count in my finish time?</h3>
<p>That depends on the event's timing rules. Elapsed time includes stops; moving time may remove detected non-moving periods. Do not choose whichever value looks faster without checking the rule.</p>
<h3>Can walking count toward these distances?</h3>
<p>Walking covers distance mathematically, but event eligibility varies. Confirm the live walking, cut-off, activity, and proof rules. Never assume every virtual or onsite event accepts the same strategy.</p>

<h2>Official sources and calculation notes</h2>
<p>This article was reviewed in September 2026. <a href="https://worldathletics.org/disciplines/road-running/half-marathon">World Athletics' half-marathon overview</a> is used for the official 21.0975 km distance. Its <a href="https://worldathletics.org/records/certified-roadevents">certified-road-events guidance</a> explains why certified course measurement and performance conditions matter when formal results are compared.</p>
<p>The comparative midpoint and percentile values come from RunRepeat's <a href="https://runrepeat.com/uk/how-do-you-masure-up-the-runners-percentile-calculator">finish-time comparison</a>, updated March 2024 and described as using 35 million results collected across more than 28,000 races over 20 years. HelloRun has not independently reproduced that dataset. We cite it as historical race-finisher context, not a current population average, beginner standard, Philippine benchmark, or training prescription.</p>
<p>Every pace-to-time value in this article was calculated by multiplying the displayed min/km pace by 5, 10, or 21.0975 and rounding the half-marathon result to the nearest second. Calculations assume the average pace is maintained across the measured distance. They are not performance guarantees.</p>
<p>Finish-time information is general education, not personal training or medical advice. Event rules, sources, and datasets can change; check the live event page and current source before acting.</p>

<h2>Choose a distance, then build toward it</h2>
<p>Start with the distance that fits your present foundation. Use a repeatable pace range, plan for the actual route and weather, and let the first part of the activity be conservative. Your finish time can describe the day without defining your worth or requiring an unsafe next target.</p>
<p>When you are ready, <a href="/events">browse current HelloRun events</a>, read the live distance and activity rules, and choose a manageable goal. Registration creates a target; it does not guarantee readiness, completion, proof approval, or a particular finish time.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Why there is no single correct finish time',
  'How running time is calculated',
  'Pace-to-finish-time reference for 5K, 10K, and 21.1K',
  'Average 5K time: what the numbers can and cannot tell you',
  'Average 10K time: doubling 5K is not the whole story',
  'Average half marathon time and average 21K time',
  'Walking and run-walk finish times',
  'How pace affects finish time',
  'Terrain, elevation, heat, and weather',
  'Why virtual-run times may differ',
  'Should beginners chase a target time?',
  'How to set your next distance goal',
  'Frequently asked questions',
  'Official sources and calculation notes',
  'Choose a distance, then build toward it'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/blog/beginners-guide-to-running-pace"',
  'href="/blog/run-walk-method-beginner-friendly-way-build-endurance"',
  'href="/blog/how-to-choose-a-safe-route-for-your-virtual-run"',
  'href="/blog/10k-training-plan-for-beginners"',
  'href="/blog/how-to-breathe-while-running"',
  'href="/blog/how-to-run-safely-during-hot-and-humid-weather"'
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
  if (wordCount < 2500 || wordCount > 3000) errors.push('article must contain 2500 to 3000 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('cover artwork is required for publication');
  if (/<h1\b/i.test(payload.contentHtml)) errors.push('body must not contain a page-level h1');
  if (/<h[12]>How Long Does It Take to Run/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/(?:every|all) beginners? (?:must|should|need to) finish/i.test(text)) errors.push('article must not prescribe a universal finish time');
  if (/(?:34:37|1:02:08|2:14:59) is (?:the )?(?:required|correct|ideal) (?:beginner )?(?:time|target)/i.test(text)) errors.push('article must not turn dataset midpoints into standards');
  if (/(?:this|the) (?:table|pace chart|calculation) guarantees? (?:a )?(?:finish|result|time)|guaranteed finish time/i.test(text)) errors.push('article must not guarantee calculated outcomes');
  if (/doubling (?:your|a) 5K time (?:always|will) predict/i.test(text)) errors.push('article must not promise a doubled 5K prediction');
  if (/walking (?:always|automatically) (?:counts|qualifies)|every event accepts walking/i.test(text)) errors.push('article must not promise walking eligibility');
  if (/(?:must|should) make up .{0,50} by (?:doubling|running twice)|remove recovery to catch up/i.test(text)) errors.push('article must not prescribe unsafe catch-up activity');
  if (/pending (?:activity|submission|distance) (?:is|counts as) (?:approved|official|completion)/i.test(text)) errors.push('article must not count pending progress officially');
  if (!/There is no single correct average running time that every beginner should match/i.test(text)) errors.push('article must answer comparison intent early');
  if (!/historical race-finisher context, not a current population average, beginner standard, Philippine benchmark/i.test(text)) errors.push('article must state dataset limitations');
  if (!/reviewed in September 2026/i.test(text)) errors.push('article must disclose review date');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }
  if (errors.length) throw new Error(`Invalid finish-time guide payload: ${errors.join('; ')}`);
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
