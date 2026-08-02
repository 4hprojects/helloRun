'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'run-walk-method-beginner-friendly-way-build-endurance';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'The Run-Walk Method: A Beginner-Friendly Way to Build Endurance',
  excerpt: 'Learn how to alternate comfortable running and purposeful walking, choose a repeatable starting pattern, review effort, and adapt without treating walk breaks as failure.',
  category: 'Training',
  tags: Object.freeze([
    'run walk method',
    'beginner running',
    'running endurance',
    'walk breaks',
    'easy running',
    'running intervals',
    '5K preparation',
    'training guide'
  ]),
  seoTitle: 'Run-Walk Method for Beginners: Build Endurance Gradually',
  seoDescription: 'A practical beginner guide to run-walk intervals: choose a manageable pattern, control effort, recover between sessions, adapt safely, and prepare for virtual runs.',
  coverImageAlt: 'Textured editorial illustration of a Filipina beginner alternating purposeful walking, relaxed running, and recovery walking on a colorful winding track'
});

const RAW_CONTENT_HTML = `
<p>The run-walk method alternates planned periods of comfortable running with purposeful walking. The walk is part of the session from the beginning—not a punishment added after a runner has gone too fast. For someone starting, returning after time away, or trying to make movement more repeatable, that distinction can change the whole experience.</p>
<p>A useful run-walk session does not need a heroic running interval. It needs a pattern that lets the runner stay oriented, keep the effort appropriate, finish with reasonable control, and recover well enough for ordinary life and a later session. The best starting pattern is therefore not the one with the most running. It is the one the individual can repeat without turning every outing into a test.</p>
<blockquote><strong>The central idea:</strong> decide the walk breaks before starting, run at a controlled effort, and judge the pattern by repeatability—not by whether walking disappears quickly.</blockquote>

<h2>The run-walk method in one minute</h2>
<ul>
  <li><strong>Warm up with easy walking.</strong> Use the opening minutes to notice the route, weather, breathing, and how movement feels today.</li>
  <li><strong>Alternate by time or landmarks.</strong> A timer is convenient, but safe visible landmarks can work when exact timing adds stress.</li>
  <li><strong>Keep running portions controlled.</strong> They are not sprints. A beginner should not need to race each interval to make it “count.”</li>
  <li><strong>Walk with purpose.</strong> Ease the effort, regain comfortable breathing, and prepare for the next running portion.</li>
  <li><strong>Repeat only while the pattern stays manageable.</strong> End or extend walking when form, breathing, symptoms, conditions, or concentration say the planned session is no longer appropriate.</li>
  <li><strong>Cool down.</strong> Finish with easy walking rather than turning the final interval into an all-out challenge.</li>
  <li><strong>Review the whole session.</strong> Note effort, total time, conditions, and recovery—not only average pace or distance.</li>
</ul>

<h2>How this guide was prepared</h2>
<p>This article was reviewed in August 2026 using current public guidance from the World Health Organization, the US Centers for Disease Control and Prevention, the UK National Health Service, and current HelloRun event and evidence workflows. WHO publishes population recommendations for physical activity and emphasizes that some activity is better than none. CDC explains relative intensity and the talk test. NHS Couch to 5K demonstrates one structured approach that alternates running and walking, includes warm-up and cool-down walking, and places rest days between sessions.</p>
<p>Those sources support general principles, not one compulsory interval prescription. Population recommendations describe activity associated with health benefits; they are not personal training plans, race-readiness tests, medical clearance, or a promise that a particular session is appropriate. This guide cannot diagnose symptoms, protect a runner against injury, replace rehabilitation, or assure endurance, weight change, event completion, or proof approval.</p>
<p>Health conditions, disability, pregnancy or postpartum status, medication, recent illness, injury history, heat exposure, and a long period of inactivity can change what is appropriate. Seek qualified medical or exercise guidance when your circumstances warrant it. Stop and use appropriate medical or emergency support for severe, sudden, or unexplained symptoms rather than trying to complete an interval.</p>

<h2>Why planned walking can help a beginner</h2>
<p>Continuous running asks a new runner to manage pace, breathing, impact, route awareness, and confidence without a built-in reduction in effort. A planned walk interval creates a regular moment to settle breathing, check the environment, take stock, and continue deliberately. It can make the session easier to understand because the next decision has already been made.</p>
<p>The method also counters a common beginner pattern: starting at a pace that feels exciting for the first few minutes, becoming breathless, stopping abruptly, and concluding that running is impossible. Shorter controlled running periods make it easier to learn what “easy” feels like. The goal is not to disguise a hard workout with breaks; it is to practise an effort that remains manageable across repeated cycles.</p>
<p>Walking does not erase the running that came before it. Both are physical activity, and both can contribute to the total duration of a session. Whether walking counts toward a particular event result is a separate rules question. Training value and event eligibility are related only when the event explicitly makes them so.</p>
<h3>Walk breaks are a strategy, not a verdict</h3>
<p>A runner may use run-walk for a first week, an entire training block, a long event, hot conditions, a return after a break, or simply because it makes running enjoyable. There is no universal deadline for removing walk breaks. Someone who continues to use them has not failed to become a “real runner.”</p>
<p>Likewise, run-walk is not automatically easier or safer under every condition. Sprinting the run segments, choosing a dangerous route, ignoring pain, or extending a session far beyond recent activity can still create problems. The pattern supports good decisions; it cannot replace them.</p>

<h2>Start from your current ordinary activity</h2>
<p>Choose a starting point from what you can do now, not from a personal-best day, a friend’s schedule, or the interval printed at the top of a search result. Review the last two to four ordinary weeks. How often did you walk or run? For how long? What surfaces and weather were involved? How did you feel later that day and the next morning?</p>
<p>If a comfortable walk is already a normal part of the week, a few short relaxed running portions within a familiar walk may be a reasonable experiment. If walking itself is new or difficult, the first useful step may be building a repeatable walking routine or seeking individualized guidance—not forcing running intervals because an article labels them beginner-friendly.</p>
<p>Use honest available time. A thirty-minute window before work is not thirty minutes of running if changing, reaching the route, warming up, cooling down, and returning home also occupy the window. A smaller session that fits real life is more useful than a larger plan that exists only on paper.</p>
<h3>A simple readiness inventory</h3>
<ul>
  <li>What movement have I completed comfortably in recent ordinary weeks?</li>
  <li>How many genuine activity opportunities fit this week without removing necessary sleep or recovery?</li>
  <li>Is the route safe, familiar, permitted, and suitable for alternating pace?</li>
  <li>What heat, rain, air quality, darkness, traffic, surface, or accessibility issue could change the plan?</li>
  <li>Do current symptoms or professional instructions mean running is not appropriate today?</li>
  <li>What would make this first session successful even if I do less than expected?</li>
</ul>

<h2>Choose a starting pattern without chasing a perfect ratio</h2>
<p>Run-walk patterns are often written as ratios: one minute running and two minutes walking, for example. Ratios are convenient descriptions, but they are not universal prescriptions. Two people using the same ratio can experience very different effort because their running pace, walking pace, fitness, route, heat, sleep, and health differ.</p>
<p>Begin with a running interval that feels deliberately modest and a walking interval long enough to regain control. If the next running period begins while breathing is still strained, the walk may be too short, the run may be too fast or long, the conditions may be too demanding, or running may not be appropriate that day. Adjust the cause rather than treating the timer as an order.</p>
<h3>Three ways to structure the alternation</h3>
<ol>
  <li><strong>Time:</strong> alternate using a watch or simple timer. This is predictable and easy to repeat, but constant alerts can distract some runners.</li>
  <li><strong>Safe landmarks:</strong> run to a visible tree or path marker, then walk to another. This can feel natural, but landmarks vary in distance and must not encourage unsafe road crossings.</li>
  <li><strong>Effort-led:</strong> shift to walking when a controlled effort is no longer available, then resume only when settled. This responds to the day but requires honest attention rather than waiting for exhaustion.</li>
</ol>
<p>A beginner can combine these methods. A timer may define an upper limit for a running interval while effort permits an earlier transition to walking. The session belongs to the runner, not the alert.</p>
<h3>Illustrative starting patterns</h3>
<p>The following examples show how decisions can differ; they are not prescriptions or stages everyone must complete:</p>
<ul>
  <li><strong>Short introduction:</strong> within a familiar walk, Mina tries several very short relaxed jogs separated by enough walking to speak comfortably again. She stops adding jogs while the experience still feels controlled.</li>
  <li><strong>Equal cues:</strong> Paolo finds equal-length run and walk cues easy to remember, but he slows the running enough that it does not become repeated sprinting.</li>
  <li><strong>Longer recovery:</strong> Ana prefers a short run followed by a longer walk in humid weather. The longer recovery is a planned adjustment, not evidence that the session failed.</li>
</ul>

<h2>Run the running portions easily</h2>
<p>The word “run” does not mean “as fast as possible.” A relaxed jogging pace may look slow, and another person may walk at a similar speed. The distinction that matters in this method is the planned change in movement and effort, not winning a comparison on the path.</p>
<p>CDC’s talk test is one practical reference for relative intensity: during moderate activity, a person can generally talk but not sing; at vigorous intensity, only a few words may be possible before pausing for breath. Individual responses vary, and the talk test is not a medical screen. For a beginner aiming at a repeatable easy session, being able to use comfortable phrases or sentences is often more useful than defending a pace number.</p>
<p>Use compact, natural steps rather than reaching the foot far ahead to imitate speed. Keep the face, hands, and shoulders as relaxed as the movement permits. Do not attempt a major form reconstruction from one article; persistent discomfort or a specific movement concern deserves qualified assessment.</p>
<h3>Signs the running portion may be too aggressive</h3>
<ul>
  <li>The first interval already feels like a time trial.</li>
  <li>Breathing does not settle during the planned walk.</li>
  <li>Each running period begins faster to compensate for walking.</li>
  <li>Form becomes uncontrolled or route awareness drops.</li>
  <li>The runner cannot complete a thought or notice traffic and surface hazards.</li>
  <li>The session creates a strong urge to “make up” average pace at the end.</li>
</ul>
<p>Respond by slowing, shortening the run, lengthening the walk, switching to walking, or ending the session. The purpose is to build a repeatable practice, not to pass a test designed by the timer.</p>

<h2>Walk with purpose</h2>
<p>A walk interval is active recovery within the session. Reduce speed enough for breathing and concentration to settle, but do not force a power-walking pace merely to protect the average. Let the arms and shoulders relax. Check direction, footing, traffic, weather, and how the body feels.</p>
<p>Walking is also a good time to decide whether the next run remains appropriate. Do not wait for the alert to override pain, dizziness, chest discomfort, unusual shortness of breath, confusion, or another concerning symptom. Stop and seek suitable help based on the situation.</p>
<p>When using landmarks, choose the next cue during the walk rather than darting across a road to reach it. On a track or shared path, transition predictably and be aware of people behind you. Avoid stopping suddenly in a narrow lane.</p>

<h2>Warm up, cool down, and leave room for recovery</h2>
<p>NHS Couch to 5K sessions begin with a five-minute warm-up walk and finish with a five-minute cool-down walk. That is one established program’s structure, not a universal duration that fits every person. The transferable principle is to begin gradually and finish gradually rather than launching directly into the fastest interval or sprinting to the final second.</p>
<p>A warm-up walk offers time to notice whether the planned session matches the day. If easy walking feels unexpectedly difficult, the route is flooded, heat is severe, or a symptom appears, change the plan before the running begins. A cool-down walk allows a calmer transition and creates space to review the session while details are fresh.</p>
<p>Recovery happens after the timer stops. Sleep, food, hydration, work demands, stress, and other activity affect how repeatable the session is. NHS places rest days between its three weekly Couch to 5K sessions. This guide does not require the same weekly schedule, but it does recommend avoiding an automatic assumption that more running every day is better.</p>
<h3>What to notice before the next session</h3>
<ul>
  <li>Did ordinary walking and daily tasks feel normal later that day?</li>
  <li>Was fatigue manageable, or did it interfere unusually with work, study, sleep, or caregiving?</li>
  <li>Did a specific discomfort worsen, alter movement, or remain unexplained?</li>
  <li>Did motivation remain steady, or did the session feel like something to survive?</li>
  <li>Would repeating exactly the same pattern feel reasonable?</li>
</ul>

<h2>Progress by changing one useful variable</h2>
<p>Progress does not require removing every walk break. It can mean completing the same pattern with calmer breathing, choosing a more consistent easy pace, recovering better, navigating the route confidently, or fitting the session into the week without disruption.</p>
<p>When a pattern has felt manageable across more than one comparable session, change only one meaningful variable if a change supports the goal. A runner might slightly lengthen some running periods, slightly shorten some walking periods, add one cycle, or keep the structure and use a somewhat longer overall route. Changing all of them together makes it difficult to understand what caused a large increase in demand.</p>
<p>There is no compulsory percentage increase. The familiar “10% rule” is not a law and does not provide assurance of safety; this article does not prescribe it. Conditions and response matter. Repeating a week, reducing the session, or returning to an earlier pattern can be an intelligent adjustment.</p>
<h3>Use a minimum, working plan, and optional extra</h3>
<ul>
  <li><strong>Minimum session:</strong> the smallest version that still practises the method, such as a warm-up walk, a few controlled cycles, and a cool-down.</li>
  <li><strong>Working plan:</strong> the pattern that recent sessions suggest is manageable today.</li>
  <li><strong>Optional extra:</strong> one additional easy cycle or a little more walking only when effort and conditions remain appropriate.</li>
</ul>
<p>This structure prevents the stretch from becoming the hidden definition of success. Completing the minimum can be the correct outcome on a difficult day.</p>

<h2>Use effort and recovery before pace</h2>
<p>Average pace combines the running and walking portions, so it may be slower than the pace shown during each run. That is expected. A lower average does not mean the method is ineffective. It describes the full activity, including the planned recovery that made the session repeatable.</p>
<p>Current GPS pace can jump during transitions. A runner who accelerates every time the display looks slow can turn easy intervals into surges. Focus first on relaxed effort and the planned cue. Review pace after the activity if it adds useful context.</p>
<p>Compare sessions only when the conditions are reasonably similar. Heat, humidity, hills, wind, surface, congestion, poor sleep, recent illness, and stress can change pace at the same perceived effort. The <a href="/blog/beginners-guide-to-running-pace">beginner pace guide</a> explains pace, splits, moving time, and the talk test in more detail.</p>
<h3>A useful session note</h3>
<p>Record the warm-up, run-walk pattern, total duration, route, weather, overall effort, any symptoms, and how recovery felt later. “Six relaxed cycles, sentences remained comfortable, hot final ten minutes, walked longer, normal next day” is often more actionable than “average pace 8:42.”</p>

<h2>Adapt the method to weather, routes, and treadmills</h2>
<p>In hot and humid conditions, normal pace may require more effort. Choose a cooler safe time when possible, reduce the session, use shade, and respond to official local weather advice. Do not use the scheduled running interval as a reason to ignore heat symptoms. The <a href="/blog/how-to-train-safely-for-virtual-runs-in-hot-and-humid-weather">hot and humid weather guide</a> provides broader planning guidance.</p>
<p>Rain changes visibility, grip, drainage, and traffic behavior. Walking breaks do not make lightning, flooding, or an unsafe surface acceptable. Reschedule, move indoors where appropriate, or choose another safe activity when conditions require it. See the <a href="/blog/running-during-rainy-season-philippines">rainy-season running guide</a>.</p>
<p>On a treadmill, use changes that allow stable transitions. Do not jump onto the side rails at speed as a substitute for reducing the belt safely. A watch and treadmill may report different distance or pace. For virtual-event evidence, follow the event’s treadmill rules and the <a href="/blog/how-to-record-a-treadmill-run-for-a-virtual-event">treadmill evidence guide</a>.</p>
<p>On public routes, prioritize predictable movement. Look before changing direction or pace, keep enough awareness to hear or see hazards, and avoid staring at the timer. Low-light conditions need suitable visibility choices; use the <a href="/blog/running-safety-tips-early-morning-night-runs">low-light safety guide</a>.</p>

<h2>Adjust after illness, pain, or a long interruption</h2>
<p>Do not use a missed week as a debt. Doubling intervals, removing walk breaks, or running through concerning symptoms is not a responsible catch-up plan. After illness or a long interruption, current capacity may differ from the last completed session. Reassess from ordinary movement and qualified advice rather than resuming automatically at the old pattern.</p>
<p>Normal effort can involve warmth, faster breathing, and temporary muscle fatigue, but an article cannot classify an individual symptom remotely. Pain that changes movement, worsening symptoms, faintness, chest discomfort, or unusual breathlessness should not be managed by simply adding a longer walk interval and continuing. Stop and seek appropriate guidance.</p>
<p>If a clinician or rehabilitation professional has supplied restrictions or a return plan, that individualized guidance takes precedence over this general article. Run-walk may be useful in some returns, but the label “gradual” does not make every self-designed progression appropriate.</p>

<h2>Use run-walk for a first 5K or virtual event</h2>
<p>A run-walk approach can support a completion goal when the event permits walking and the chosen category, time window, and route match current preparation. It cannot make an unsuitable distance automatically realistic. Start with the <a href="/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge">distance-choice guide</a> and the <a href="/blog/beginner-5k-training-plan-new-runners">flexible beginner 5K guide</a>.</p>
<p>Read the actual event rules before registering. Confirm whether walking, treadmill activity, pauses, a single continuous activity, or accumulated activities are accepted. Check the activity and submission dates, timezone, evidence fields, and any cutoff. Browse current <a href="/events">Events</a> rather than assuming two events use identical mechanics.</p>
<h3>Plan the intervals before event day</h3>
<p>Use a pattern already practised under reasonably similar conditions. Event excitement can make the opening run much faster than training. Begin deliberately, take the first walk when planned, and avoid postponing it merely because other participants continue running. A method abandoned in the first minutes cannot regulate the later effort.</p>
<p>For a virtual event, choose a safe permitted route and decide how the timer will signal transitions without demanding constant screen attention. Preserve the original activity record. If the event requires one activity, stopping and starting separate records for every interval may create the wrong evidence even though the training concept was valid.</p>

<h2>How run-walk appears in HelloRun evidence</h2>
<p>HelloRun records and reviews event evidence according to the event’s configured rules. The platform does not infer a run-walk pattern from average pace, and using planned walks does not guarantee that an activity qualifies. The organizer decides and publishes accepted activities, category requirements, event dates, evidence fields, and relevant completion mechanics.</p>
<p>A participant may submit supported connected activity data or accepted screenshot evidence, depending on the workflow and event. Screenshot entry can use OCR assistance, but the participant must verify extracted distance, duration, date, and other required fields. OCR is not proof that the source was read perfectly.</p>
<p>A recorded activity is not automatically an approved result. Submitted or pending evidence awaits the applicable checks. Approved evidence contributes according to the event rules; rejected evidence does not. Some eligible clean submissions may qualify for conditional approval, while others require organizer or admin review. Read <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> and <a href="/blog/how-to-submit-run-proof-correctly-hellorun">How to Submit Run Proof Correctly</a>.</p>
<p>For accumulated-distance events, each approved eligible activity contributes to official progress according to the configured mechanic. A pending activity is potential progress, not official progress. Do not combine or edit evidence to hide walk intervals unless the event expressly asks for a particular legitimate format.</p>

<h2>Four beginner scenarios</h2>
<h3>Scenario 1: starting inside an established walk</h3>
<p>Jo already walks for thirty minutes several times a week. She adds a few short relaxed running portions to one familiar route. Her minimum success is completing the warm-up, trying the planned cycles without sprinting, and cooling down. Because the later cycles feel less controlled, she walks the remainder and records that decision. The next session repeats the same pattern rather than increasing automatically.</p>
<h3>Scenario 2: the ratio looks easy but the pace is not</h3>
<p>Rafi chooses equal running and walking intervals. During the running portions he tries to match a faster friend and cannot recover by the next cue. The ratio is not necessarily the main problem; his run pace is. He slows to an effort that permits comfortable phrases and keeps the walking interval. The session becomes more consistent without changing the timer.</p>
<h3>Scenario 3: humidity changes the day</h3>
<p>Lina has completed a pattern comfortably in cooler weather. On a humid afternoon, the first cycles feel unusually demanding. She lengthens walking, moves into shade, and ends earlier. She does not treat the previous schedule as a contract. Her log records the conditions so the slower average is not misread as lost fitness.</p>
<h3>Scenario 4: preparing for a permitted walk-run 5K</h3>
<p>Ben’s event allows walking and requires one continuous activity record. In training he practises the same timer alerts while keeping one recording active. He confirms the evidence fields before event day and starts the event at the familiar controlled effort. The planned walks remain part of his completion strategy even when others pass him.</p>
<p>These scenarios illustrate decisions, not predicted outcomes. Each runner’s appropriate pattern can differ, and event rules can change what evidence is accepted.</p>

<h2>A copyable run-walk session worksheet</h2>
<ul>
  <li><strong>Purpose today:</strong> learn the pattern, build consistency, complete easy movement, prepare for an event, or another specific purpose.</li>
  <li><strong>Recent baseline:</strong> ordinary walking or running completed in the last two to four weeks.</li>
  <li><strong>Route and conditions:</strong> surface, lighting, weather, traffic, accessibility, and safe alternatives.</li>
  <li><strong>Warm-up:</strong> easy walking and the observations that would change the plan.</li>
  <li><strong>Running cue:</strong> time, landmark, or effort ceiling.</li>
  <li><strong>Walking cue:</strong> planned duration or the condition needed before resuming.</li>
  <li><strong>Minimum session:</strong> the smallest useful number of controlled cycles.</li>
  <li><strong>Working plan:</strong> the pattern supported by recent experience.</li>
  <li><strong>Optional extra:</strong> only if effort, route, weather, and concentration remain appropriate.</li>
  <li><strong>Stop or change signals:</strong> symptoms, unsafe conditions, uncontrolled effort, or another personal limit.</li>
  <li><strong>Cool-down:</strong> gradual easy walking.</li>
  <li><strong>Review:</strong> effort, breathing, total time, conditions, recovery, and what to repeat or change.</li>
</ul>

<h2>Common run-walk mistakes</h2>
<ul>
  <li><strong>Sprinting every run interval:</strong> the repeated surge makes recovery difficult and teaches little about sustainable effort.</li>
  <li><strong>Waiting for exhaustion before walking:</strong> this turns a planned method into repeated rescue stops.</li>
  <li><strong>Protecting average pace:</strong> shortening walks because the watch number looks slow undermines their purpose.</li>
  <li><strong>Changing several variables together:</strong> longer runs, shorter walks, more cycles, and a faster route create an unclear jump in demand.</li>
  <li><strong>Making up missed sessions:</strong> compressed catch-up removes recovery and ignores why the session was missed.</li>
  <li><strong>Copying another person’s ratio:</strong> the same timer pattern does not produce the same relative intensity.</li>
  <li><strong>Ignoring conditions:</strong> a familiar pattern may not fit heat, rain, hills, illness, poor sleep, or a different surface.</li>
  <li><strong>Assuming event acceptance:</strong> walking may support training even when a particular competitive category has different published rules.</li>
  <li><strong>Removing walks as the only definition of progress:</strong> repeatability, comfort, recovery, and confidence are also meaningful.</li>
</ul>

<h2>Final run-walk checklist</h2>
<ul>
  <li>I chose the session from recent ordinary activity, not another runner’s highlight.</li>
  <li>I have a safe route, suitable conditions, and an alternative if they change.</li>
  <li>My running portions are controlled rather than sprinted.</li>
  <li>My walking portions are planned and long enough to regain control.</li>
  <li>I know that the timer is a cue, not an order to ignore symptoms or hazards.</li>
  <li>I included a gradual beginning and ending.</li>
  <li>I left room for recovery and will not compress missed sessions into catch-up work.</li>
  <li>I will change one useful variable only after the current pattern is repeatable.</li>
  <li>For an event, I confirmed whether walking and my recording method are accepted.</li>
  <li>I will judge the session by effort, repeatability, and recovery—not only pace.</li>
</ul>

<h2>Your practical next step</h2>
<p>Write one small run-walk session using the worksheet. Choose a familiar safe route, a modest minimum, controlled running cues, generous walking recovery, and a clear reason to shorten or stop. If running is not appropriate today, make the session a walk or seek the guidance you need.</p>
<p>Afterward, record how the whole experience felt and how normal activity feels later. Repeat a manageable pattern before increasing it. Sustainable endurance begins with sessions you can understand, recover from, and choose again—not with proving that you can avoid walking.</p>

<h2>Sources and review notes</h2>
<p><strong>Official and platform sources:</strong> the health guidance below supports the general training principles, while current HelloRun source and workflows support the platform descriptions.</p>
<ul>
  <li><a href="https://www.who.int/publications/i/item/9789240015128">World Health Organization: Guidelines on physical activity and sedentary behaviour</a>.</li>
  <li><a href="https://www.cdc.gov/physical-activity-basics/measuring/index.html">US Centers for Disease Control and Prevention: How to measure physical activity intensity</a>.</li>
  <li><a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/">UK National Health Service: Couch to 5K running plan</a>.</li>
</ul>
<p>Source links were reviewed in August 2026. HelloRun workflow descriptions were checked against the current application behavior and remain subject to event-specific configuration and future documented changes.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'The run-walk method in one minute',
  'How this guide was prepared',
  'Why planned walking can help a beginner',
  'Choose a starting pattern without chasing a perfect ratio',
  'Progress by changing one useful variable',
  'How run-walk appears in HelloRun evidence',
  'A copyable run-walk session worksheet',
  'Final run-walk checklist',
  'Your practical next step',
  'Sources and review notes'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/blog/beginner-5k-training-plan-new-runners"',
  'href="/blog/beginners-guide-to-running-pace"',
  'href="/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge"',
  'href="/blog/what-counts-as-valid-run-proof"',
  'href="/blog/how-to-submit-run-proof-correctly-hellorun"',
  'href="/blog/how-to-train-safely-for-virtual-runs-in-hot-and-humid-weather"',
  'href="/blog/running-during-rainy-season-philippines"'
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
  if (wordCount < 3200) errors.push('article must contain at least 3200 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('cover artwork is required for publication');
  if (/<h1\b/i.test(payload.contentHtml)) errors.push('body must not contain a page-level h1');
  if (/<h[12]>The Run-Walk Method: A Beginner-Friendly Way to Build Endurance<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/(?:the )?10\s*%\s*rule (?:applies to|is safe for) every runner|(?:everyone|every runner) (?:must|should) follow the 10\s*%\s*rule/i.test(text)) errors.push('article must not prescribe the 10% rule');
  if (/(?:must|should|need to) run every day|daily running is required|never miss a day/i.test(text)) errors.push('article must not prescribe daily running');
  if (/(?<!not )guarantee(?:s|d)? (?:endurance|completion|safety|approval|fitness|injury prevention)|prevents? (?:all )?injur/i.test(text)) errors.push('article must not guarantee outcomes or injury prevention');
  if (/(?:must|should) make up .{0,40} by (?:doubling|running twice)|remove recovery to catch up/i.test(text)) errors.push('article must not prescribe unsafe catch-up activity');
  if (/(?:everyone|every runner) (?:must|should) start with|the perfect run.walk ratio is|walking is always accepted/i.test(text)) errors.push('article must not prescribe a universal interval or event rule');
  if (/pending (?:distance|activity|evidence) (?:counts|is counted) (?:as )?(?:official|approved|completion)|pending activity completes/i.test(text)) errors.push('article must not count pending progress officially');
  if (/every submission is automatically approved|automatic approval is guaranteed/i.test(text)) errors.push('article must not promise automatic approval');
  if (!/reviewed in August 2026 using current public guidance/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/Population recommendations describe activity associated with health benefits; they are not personal training plans/i.test(text)) errors.push('article must distinguish public-health guidance from personal training');
  if (!/A pending activity is potential progress, not official progress/i.test(text)) errors.push('article must distinguish pending progress');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid run-walk guide payload: ${errors.join('; ')}`);
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
