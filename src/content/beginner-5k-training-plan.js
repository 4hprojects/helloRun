'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'beginner-5k-training-plan-new-runners';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'Beginner 5K Training Plan for New Runners',
  excerpt: 'Prepare for your first 5K with a flexible nine-week walk-run plan, effort guidance, recovery days, safety checks, and virtual or onsite event preparation.',
  category: 'Training',
  tags: Object.freeze([
    'beginner 5k',
    '5k training plan',
    'new runners',
    'walk run plan',
    'running basics',
    'race preparation',
    'easy running',
    'first 5k'
  ]),
  seoTitle: 'Beginner 5K Training Plan for New Runners',
  seoDescription: 'Use a flexible nine-week beginner 5K plan with walk-run sessions, easy-effort guidance, recovery, safety checks, and virtual or onsite event preparation.',
  coverImageAlt: 'New runner following a nine-week walk-run 5K training plan with easy sessions, recovery days, and a first-event checklist'
});

const RAW_CONTENT_HTML = `
<p>A first 5K can be a finish-line goal rather than a speed test. Five kilometres is about 3.1 miles, and a new runner can cover it with a mixture of comfortable running and purposeful walking. The useful question is not “How fast should a beginner be?” It is “What amount of easy, repeatable training fits my present ability?”</p>
<p>This nine-week framework uses three walk-run sessions each week, with recovery between running days. The running portions should feel controlled enough for short conversation. The plan gradually lengthens them, but it never requires continuous running. Repeat a week, shorten a session, or return to an earlier interval whenever that is the more sensible choice.</p>
<blockquote><strong>The goal:</strong> arrive at a 5K attempt with a pacing plan you have practised. Nine weeks is a flexible framework, not a deadline, medical clearance, injury-prevention promise, or guarantee of finishing.</blockquote>

<h2>Is this plan suitable for you?</h2>
<p>This guide is designed for an adult beginner who can already manage roughly 20 minutes of comfortable walking and wants to prepare for a first virtual or onsite 5K. You do not need a previous race result or a particular pace. If 20 minutes of walking is currently too much, build a comfortable walking routine first and begin the schedule later.</p>
<p>Some people need a more individual starting point. Seek guidance from an appropriately qualified health or exercise professional before beginning when pregnancy, disability, a chronic condition, recent surgery, a recent illness, prescribed activity restrictions, or concerning symptoms may affect exercise. That is not a universal exclusion from running: it is a reason to adapt the plan to the person instead of treating a web article as an assessment.</p>
<p>Do not begin a session when you are acutely unwell, feverish, dizzy, or unable to move normally. Stop exercising, reach a safe place, and seek appropriate medical or emergency help for intense chest pain or pressure, fainting, severe or unexplained breathlessness, sudden severe pain, or other symptoms that feel urgent or dangerous. Use the emergency number and health services for your location.</p>

<h2>How this guide was prepared</h2>
<p>This article was reviewed in July 2026 using public guidance from the World Health Organization, the US Centers for Disease Control and Prevention, the UK National Health Service, and World Athletics. Those sources support gradually increasing activity, allowing recovery, and adapting activity to health and ability. The NHS Couch to 5K programme is also a documented example of three weekly sessions over nine weeks with rest days between them.</p>
<p>The schedule below is HelloRun's original general framework; it does not reproduce an official programme or claim to have been personally tested on every type of runner. It is educational information, not individualized medical care, physiotherapy, nutrition treatment, or coaching. Weather, surfaces, disability, health, event rules, and prior activity can all change what is appropriate.</p>

<h2>Understand the goal before training</h2>
<h3>Completion goal</h3>
<p>A completion goal means covering 5K using a manageable combination of running and walking. Planned walk breaks are part of the strategy, not evidence that the attempt failed. This is the plan's default goal.</p>
<h3>Continuous-running goal</h3>
<p>Running the entire distance can be a later preference, but it is not required by this schedule. A runner who feels good with intervals can keep them through week nine. Removing walk breaks too soon can turn an easy session into a hard one.</p>
<h3>Time goal</h3>
<p>A target finish time adds a different training demand. This guide deliberately gives no target pace or race-time prediction. Complete a consistent foundation first; then use qualified coaching or an appropriate follow-on plan if performance becomes the goal.</p>
<h3>Virtual or onsite goal</h3>
<p>A virtual 5K is completed on a runner-chosen route or permitted indoor setting and normally requires recorded activity evidence. An onsite race has a fixed venue, start procedure, course, and organizer instructions. Neither format is automatically easier, safer, officially timed, accessible, or suitable for every participant. Compare the formats in <a href="/blog/virtual-run-vs-traditional-race-which-one-should-you-join">Virtual Run vs Traditional Race</a>.</p>

<h2>Use easy effort instead of chasing pace</h2>
<p>Keep the running portions at an easy effort. You should usually be able to speak a short sentence without gasping. Breathing will be quicker than during a walk, but it should feel controlled. If only isolated words are comfortable, slow down, shorten the running interval, or walk.</p>
<p>This talk test is intentionally simple. Speed varies with terrain, temperature, wind, sleep, health, and experience. A pace that is easy for another runner may be inappropriate for you, and a pace that felt easy last week can feel harder in heat or after poor rest. Do not use another participant's app screenshot as your training target.</p>
<p>Most sessions in this plan should finish with the sense that another short interval would have been possible. The third session is longer by time, not faster. There are no mandatory sprints, hills, or hard time trials.</p>

<h2>Your weekly rhythm</h2>
<p>Choose three non-consecutive running days when practical—for example Monday, Wednesday, and Saturday. At least one non-running day between walk-run sessions gives time for recovery and lets you notice how you respond before adding another session.</p>
<ul>
  <li><strong>Session one:</strong> use the lower half of the week's duration and learn the new interval.</li>
  <li><strong>Session two:</strong> repeat the same easy pattern; do not turn it into a race.</li>
  <li><strong>Session three:</strong> use the upper end of the duration while keeping the same controlled effort.</li>
  <li><strong>Other days:</strong> rest or choose comfortable ordinary movement. Optional strength work should not compromise the next walk-run session.</li>
</ul>
<p>The stated session time refers to the walk-run interval block. Add an easy five-minute walk before it and another five-minute walk afterward. If the total is initially too long, reduce the interval block rather than rushing the warm-up or cooldown.</p>

<h2>The flexible nine-week walk-run plan</h2>
<h3>Week 1: learn the rhythm</h3>
<p>Complete three sessions of 20–25 minutes using 1 minute of easy running followed by 2 minutes of walking. Repeat the pattern for the planned time and finish the last partial interval by walking. The purpose is to practise changing pace without letting the run minute become a sprint.</p>
<p>If one minute is not controlled, try 30 seconds of easy running and 90–120 seconds of walking. If the week feels very comfortable, still complete it as written rather than skipping several stages.</p>

<h3>Week 2: small running increase</h3>
<p>Complete three sessions of 22–28 minutes using 90 seconds of easy running followed by 2 minutes of walking. Stay relaxed through the first interval. The third session can use the upper end of the duration, but it should use the same easy effort as the first.</p>
<p>Repeat week one if recovery is poor or the longer running interval consistently becomes breathless. Repeating a stage is a normal adjustment, not a failed week.</p>

<h3>Week 3: equal run and walk intervals</h3>
<p>Complete three sessions of 24–30 minutes using 2 minutes of easy running followed by 2 minutes of walking. Concentrate on a compact, comfortable stride rather than trying to cover a particular distance.</p>
<p>Different sessions can produce different distances at the same effort. That variation does not require an extra workout or a faster final interval.</p>

<h3>Week 4: extend control</h3>
<p>Complete three sessions of 25–32 minutes using 3 minutes of easy running followed by 2 minutes of walking. Begin conservatively enough that the final running interval resembles the first.</p>
<p>If three minutes changes your form or breathing sharply, return to two-minute running intervals or add a longer walk. The useful adaptation is repeatable time on your feet, not forcing the printed ratio.</p>

<h3>Week 5: five-minute blocks</h3>
<p>Complete three sessions of 28–34 minutes using 5 minutes of easy running followed by 2 minutes of walking. The longer block may require a slower pace than earlier weeks. That is expected.</p>
<p>Keep planned walk breaks even if the first block feels unusually easy. They help distribute the effort and make it possible to evaluate the full session rather than only its opening minutes.</p>

<h3>Week 6: patient endurance</h3>
<p>Complete three sessions of 30–35 minutes using 8 minutes of easy running followed by 2 minutes of walking. Treat the first two minutes of every running block as deliberately gentle.</p>
<p>This is a substantial interval change. Repeat week five, alternate five- and eight-minute blocks, or shorten the session if the full pattern is not yet controlled.</p>

<h3>Week 7: longer easy sections</h3>
<p>Complete three sessions of 30–38 minutes using 10–12 minutes of easy running followed by 2–3 minutes of walking. Choose ten minutes when twelve would make the session hard. Longer walking recovery is also acceptable.</p>
<p>The goal remains conversational effort. Do not add a fast finish merely because the event is approaching.</p>

<h3>Week 8: rehearse your preferred strategy</h3>
<p>Complete three sessions of 30–40 minutes. If earlier weeks have been comfortable, one session can include a continuous easy segment of 15–20 minutes. Otherwise retain a familiar interval such as 8 minutes running and 2 minutes walking or 10 minutes running and 3 minutes walking.</p>
<p>Use the third session as a calm rehearsal: choose similar shoes, tracking method, and run-walk rhythm to the planned 5K. It is not necessary to cover the full event distance in training.</p>

<h3>Week 9: reduce training and attempt 5K</h3>
<p>Complete two shorter easy sessions early in the week, roughly 20–25 minutes each with the interval that felt most dependable. Allow recovery before the planned event or virtual attempt. Do not add a missed long workout in the final days.</p>
<p>For the 5K, start more slowly than your impulse suggests and use planned walk breaks from the beginning. A strategy such as 8 minutes easy running and 2 minutes walking is valid if it was practised. You may also walk the entire distance when that suits your ability and the event permits it.</p>
<p>If illness, pain, unsafe conditions, or incomplete preparation makes the attempt unwise, change the date when possible or choose another event. An entry deadline is not a reason to override safety.</p>

<h2>How to warm up and cool down</h2>
<p>Before every session, walk easily for about five minutes. Start gently and let the pace become purposeful. Use this time to notice the surface, weather, footwear, and how you feel. The first running interval should still be easy; the warm-up is not permission to sprint.</p>
<p>After the interval block, walk easily for about five minutes while breathing settles. A cooldown does not guarantee that soreness or injury will be prevented. It simply creates a gradual transition and a chance to review the session.</p>
<p>Record a brief note: the interval used, general effort, surface, and anything that should change next time. Avoid treating one slow day as a problem requiring compensation.</p>

<h2>When to repeat, shorten, or step back</h2>
<p>Move forward when the week's pattern is controlled across the sessions and ordinary recovery is manageable. Repeat the week when the final intervals repeatedly become hard, when you need unplanned long recoveries, or when life has prevented consistent practice.</p>
<ul>
  <li><strong>Shorten:</strong> use the lower time, fewer cycles, or shorter running intervals.</li>
  <li><strong>Repeat:</strong> keep the same week until it feels familiar; there is no penalty for taking more than nine weeks.</li>
  <li><strong>Step back:</strong> return to the last comfortable ratio after illness, a long break, or a difficult progression.</li>
  <li><strong>Reschedule:</strong> move a session instead of completing two walk-runs on one day.</li>
  <li><strong>Stop:</strong> end the session when symptoms, pain, weather, traffic, or the surface make continuing unsafe.</li>
</ul>
<p>A missed session is not training debt. Continue with a sensible next session; do not double duration or intensity to catch up.</p>

<h2>Optional strength and balance work</h2>
<p>General public-health guidance includes muscle-strengthening activity, but a beginner does not need an elaborate gym programme to start this 5K framework. Once or twice a week, consider a brief set of movements that you can perform with control and suitable support.</p>
<ul>
  <li>Supported sit-to-stands from a stable chair.</li>
  <li>Calf raises while holding a stable surface.</li>
  <li>Low step-ups on a secure step.</li>
  <li>Supported single-leg or tandem balance.</li>
  <li>Wall or counter push movements if appropriate.</li>
</ul>
<p>Choose a manageable range rather than a prescribed load from an article. Stop a movement that causes concerning pain, dizziness, or loss of control. A qualified professional can provide adaptations for disability, pregnancy, health conditions, previous injury, or unfamiliar equipment.</p>

<h2>Recovery, food, hydration, and sleep</h2>
<p>Recovery days are part of the schedule. Easy walking or normal daily movement may feel good, but a rest day does not need to be filled with another demanding workout. Sleep, work, caregiving, heat, and illness can affect how a session feels.</p>
<p>Use ordinary meals and fluids that already agree with you. For a short beginner session, there is usually no reason to introduce an unfamiliar supplement, restrictive diet, or complicated race product solely because it appears in running advertising. Individual nutrition and fluid needs vary with health, climate, session length, and other factors; seek qualified advice when those needs are medically significant.</p>
<p>Do not use this plan as a rapid weight-loss programme. Training progress is measured by consistent, manageable sessions and recovery, not by a promised change in body size.</p>

<h2>Shoes, clothing, routes, and treadmills</h2>
<p>Use comfortable shoes that fit, stay secure, and do not create obvious rubbing during short sessions. They need not be the most expensive model, and no shoe can guarantee protection from injury. Test event-day clothing and footwear during training rather than wearing unfamiliar gear for the first time at 5K.</p>
<p>Choose a route with a predictable surface, safe crossings, suitable lighting, and an easy way to shorten the session. A short loop can be practical because water, shelter, transport, or assistance remains nearby. Follow local traffic laws and review <a href="/blog/running-safety-tips-early-morning-night-runs">Running Safety Tips for Early Morning and Night Runs</a> before low-light sessions.</p>
<p>A treadmill can provide a controlled indoor option during unsafe weather or poor air quality. Start at a comfortable setting, use the machine's safety features, and avoid holding a pace merely because it was planned outdoors. Treadmill and outdoor readings can differ. For a virtual event, confirm in advance whether treadmill activity and its evidence are accepted.</p>

<h2>Adapt the plan to the runner</h2>
<h3>If you prefer walking</h3>
<p>Use brisk and easier walking intervals instead of running. Walking is a legitimate way to build activity and may be the right 5K strategy. Event eligibility is separate: read whether the organizer accepts walking.</p>
<h3>If you are returning after a long break</h3>
<p>Start from current capacity rather than a previous personal best. Week one or a walking foundation may be more appropriate even if you once ran farther.</p>
<h3>If you are older, pregnant, disabled, or managing a condition</h3>
<p>The plan can be modified, but the appropriate movement, duration, environment, assistance, and warning signs are individual. Use guidance from a qualified professional familiar with your circumstances and check the event's accessibility information.</p>
<h3>If weather or air quality is unsafe</h3>
<p>Postpone, shorten, or use a permitted indoor option. Heat, thunderstorms, flooding, smoke, ice, and poor visibility are not challenges to “push through.” A flexible virtual window can be useful only when its deadline is not treated as more important than conditions.</p>
<h3>If illness or pain interrupts training</h3>
<p>Do not diagnose the cause from this schedule. Stop or reduce activity, allow appropriate recovery, and seek professional assessment for severe, persistent, worsening, or otherwise concerning symptoms. Resume from a manageable stage rather than automatically returning to the missed week.</p>

<h2>Virtual 5K preparation checklist</h2>
<ul>
  <li>Browse current <a href="/events">Events</a> and read the complete event mechanics before registering.</li>
  <li>Confirm the activity window, final submission deadline, timezone, accepted activity types, and whether walking or treadmill completion is allowed.</li>
  <li>Check the required distance, units, tracking app, screenshot fields, map rules, and review process.</li>
  <li>Use the <a href="/blog/best-apps-to-track-your-virtual-run">running-app comparison</a> to choose a documented tracking method; do a short recording test before event day.</li>
  <li>Review route-map privacy and avoid exposing a home location or unnecessary personal data.</li>
  <li>Plan a suitable route, indoor alternative, charged device, and check-in with someone you trust when appropriate.</li>
  <li>Keep the original activity record until review is complete.</li>
  <li>Read <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> and <a href="/blog/how-to-submit-run-proof-correctly-hellorun">How to Submit Run Proof Correctly on HelloRun</a>.</li>
</ul>
<p>A visible 5K on an app does not by itself establish eligibility. The correct registration, date, activity type, evidence path, and final review status can also matter. Learn the overall journey in <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">What Is a Virtual Run?</a> and <a href="/how-it-works">How It Works</a>.</p>

<h2>Onsite 5K preparation checklist</h2>
<ul>
  <li>Read the venue, start time, wave, cutoff, course, accessibility, bag, aid-station, and weather information.</li>
  <li>Check transport, parking or transit, bib collection, identification, and arrival instructions.</li>
  <li>Confirm whether the event is timed, how results are produced, and whether headphones or walking are restricted.</li>
  <li>Use familiar footwear, clothing, breakfast, medication arrangements, and pacing.</li>
  <li>Locate toilets, water, the start area, the finish meeting point, and event help.</li>
  <li>Tell a companion or contact how to find you when that supports your safety.</li>
  <li>Follow organizer, venue, local-law, and emergency instructions on the day.</li>
</ul>
<p>Do not assume an onsite race is certified or that it provides the same support as another event. The individual event is the source of truth.</p>

<h2>How to pace the 5K attempt</h2>
<p>Begin with the easiest rhythm you practised. Excitement can make the opening kilometre feel unusually effortless, but starting too quickly can make the remainder unnecessarily difficult. Use walk breaks on schedule rather than waiting until you are exhausted.</p>
<p>For a virtual attempt, choose a route that does not depend on repeated road crossings or an exact GPS reading at a dangerous stopping point. Do not stare at a phone while moving. For an onsite event, position yourself appropriately and follow course directions.</p>
<p>If the attempt becomes uncomfortable beyond ordinary exertion, slow to a walk or stop in a safe place. Completing on another date, when rules allow, is preferable to chasing proof or a finish line through unsafe symptoms or conditions.</p>

<h2>After the finish</h2>
<p>Walk easily while breathing settles, reach a safe location, and complete any planned check-in. Eat and drink in a familiar way appropriate to your circumstances. Keep the following day easy if that is what recovery requires.</p>
<p>For a virtual event, save the original activity and review date, distance, unit, duration, and activity type before submission. Uploaded proof may remain pending while it is reviewed; pending is not an approved result. If the event is an <a href="/blog/how-accumulated-distance-challenges-work">accumulated-distance challenge</a>, confirm whether one 5K activity is part of a larger registration goal rather than a standalone finish.</p>
<p>Celebrate the process as well as the result: consistent sessions, learning an appropriate effort, and making a sound decision to adjust are meaningful outcomes. Wait until recovery is clear before selecting a faster 5K or longer-distance plan.</p>

<h2>Frequently asked questions</h2>
<h3>Must I run continuously to complete a 5K?</h3>
<p>No. This plan supports planned walk breaks through week nine. A particular event may define eligible activity types or cutoffs, so check its rules.</p>
<h3>Can I walk the entire plan or event?</h3>
<p>Yes as a training adaptation. Whether the resulting activity qualifies for a specific event depends on that event's published mechanics.</p>
<h3>Can I train or complete the 5K on a treadmill?</h3>
<p>A treadmill can be a useful training option. Virtual-event acceptance and proof requirements vary, while an onsite event follows its physical course.</p>
<h3>What if I miss a week?</h3>
<p>Do not double sessions. Resume at the last manageable stage, repeat a week, or step back after a longer interruption.</p>
<h3>Is soreness normal?</h3>
<p>An article cannot determine the cause or significance of symptoms. Reduce or stop activity and seek appropriate assessment when pain is severe, persistent, worsening, changes normal movement, or otherwise concerns you.</p>
<h3>Do I need specialist running shoes?</h3>
<p>You need comfortable, secure footwear suitable for your surface and circumstances. Price or a marketing category does not guarantee comfort or injury prevention.</p>
<h3>How fast should an easy run be?</h3>
<p>Use controlled breathing and the short-sentence talk test instead of a universal pace. Slow down or walk when the interval stops feeling easy.</p>
<h3>Should I add strength training?</h3>
<p>Optional, manageable strength and balance work can complement the plan. Choose movements appropriate to you and obtain qualified adaptation when needed.</p>
<h3>What if nine weeks is not enough?</h3>
<p>Take longer. Repeat stages or rebuild walking consistency. The calendar does not override health, recovery, or safe conditions.</p>
<h3>Will HelloRun accept my 5K proof automatically?</h3>
<p>Not necessarily. Event rules and the submitted evidence determine eligibility, and some results require organizer or admin review. A pending submission is not yet approved.</p>
<h3>When am I ready for a longer distance?</h3>
<p>There is no universal date. First establish comfortable recovery and consistent training at the current level, then choose a gradual plan appropriate to the new goal and your circumstances.</p>
<h3>Where can I ask an event-specific question?</h3>
<p>Check the <a href="/faq">FAQ</a> and event page first, then use <a href="/contact">Contact</a> when the published information does not resolve it.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity">World Health Organization: Physical Activity Fact Sheet</a></li>
  <li><a href="https://www.who.int/publications/i/item/9789240014886">World Health Organization: Guidelines on Physical Activity and Sedentary Behaviour at a Glance</a></li>
  <li><a href="https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html">US Centers for Disease Control and Prevention: Getting Started with Physical Activity</a></li>
  <li><a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/">NHS: Get Running with Couch to 5K</a></li>
  <li><a href="https://www.newcastle-hospitals.nhs.uk/services/newcastle-occupational-health-service/information-for-staff/physiotherapy/self-help-leaflets/exercise-and-your-health-a-guide-to-getting-started/">Newcastle Hospitals NHS Foundation Trust: Exercise and Your Health—A Guide to Getting Started</a></li>
  <li><a href="https://worldathletics.org/en/competitions/world-athletics-road-running-championships/copenhagen26/races/free-training-programs">World Athletics: 5 km Training Programmes</a></li>
  <li><a href="https://worldathletics.org/news/series/advice-runners-beginners">World Athletics: Advice for New Runners</a></li>
  <li><a href="/how-it-works">How HelloRun Works</a></li>
  <li><a href="/faq">HelloRun FAQ</a></li>
</ul>
<p>Public guidance, event features, and rules can change. Recheck the source and the live event page when making a training or participation decision.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Is this plan suitable for you?',
  'How this guide was prepared',
  'Understand the goal before training',
  'Use easy effort instead of chasing pace',
  'Your weekly rhythm',
  'The flexible nine-week walk-run plan',
  'How to warm up and cool down',
  'When to repeat, shorten, or step back',
  'Optional strength and balance work',
  'Recovery, food, hydration, and sleep',
  'Shoes, clothing, routes, and treadmills',
  'Adapt the plan to the runner',
  'Virtual 5K preparation checklist',
  'Onsite 5K preparation checklist',
  'How to pace the 5K attempt',
  'After the finish',
  'Frequently asked questions',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/how-it-works',
  '/faq',
  '/contact',
  '/blog/running-safety-tips-early-morning-night-runs',
  '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
  '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/how-accumulated-distance-challenges-work',
  'who.int/news-room/fact-sheets/detail/physical-activity',
  'cdc.gov/healthy-weight-growth/physical-activity/getting-started.html',
  'nhs.uk/better-health/get-active/get-running-with-couch-to-5k',
  'newcastle-hospitals.nhs.uk',
  'worldathletics.org'
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
  if (wordCount < 3000) errors.push('article must contain at least 3000 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('existing cover image is required for ogImageUrl');
  if (/<h[12]>Beginner 5K Training Plan for New Runners<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/<em>[^<]+<\/em>\s*\*/i.test(payload.contentHtml)) errors.push('body contains malformed emphasized text');
  if (/(?:this|the) plan (?:will|guarantees?) (?:help you )?(?:finish|complete)|you will (?:finish|complete) (?:the )?5K|prevents? injuries/i.test(text)) errors.push('article must not guarantee completion or injury prevention');
  if (/(?:lose weight|weight loss).{0,30}(?:guaranteed|promise|will)/i.test(text)) errors.push('article must not promise weight loss');
  if (/increase.{0,20}(?:distance|mileage).{0,15}10\s*(?:%|percent).{0,20}(?:rule|week)/i.test(text)) errors.push('article must not prescribe the 10 percent rule');
  if (/(?:must|need to) run (?:the entire|all|continuously)/i.test(text)) errors.push('article must not require continuous running');
  if (/(?:every|all) (?:virtual )?events?.{0,35}(?:accept|allow).{0,20}(?:walking|treadmill)/i.test(text)) errors.push('article must not claim universal event acceptance');
  if (/(?:drink|consume) \d+(?:\.\d+)?\s*(?:ml|litres?|liters?|ounces?|oz).{0,30}(?:before|during|after|per hour)/i.test(text)) errors.push('article must not prescribe exact hydration dosing');
  if (/(?:a|the|these) (?:shoe|shoes|trainer|trainers) (?:will|can) (?:prevent|guarantee protection from) (?:injury|injuries)/i.test(text)) errors.push('article must not claim footwear prevents injury');
  if (!/reviewed in July 2026 using public guidance/i.test(text)) errors.push('article must disclose its research methodology');
  if (!/three non-consecutive running days/i.test(text)) errors.push('article must explain recovery spacing');
  if (!/A missed session is not training debt/i.test(text)) errors.push('article must discourage doubling missed sessions');
  if (!/Nine weeks is a flexible framework/i.test(text)) errors.push('article must state the schedule is flexible');
  if (!/pending is not an approved result/i.test(text)) errors.push('article must distinguish pending virtual proof');

  for (let week = 1; week <= 9; week += 1) {
    if (!payload.contentHtml.includes(`<h3>Week ${week}:`)) errors.push(`missing plan week: ${week}`);
  }
  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid beginner 5K payload: ${errors.join('; ')}`);
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
