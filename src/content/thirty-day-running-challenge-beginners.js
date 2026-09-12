'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = '30-day-running-challenge-for-beginners';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: '30-Day Running Challenge for Beginners: A Flexible Running Reset',
  excerpt: 'Use a flexible 30-day running challenge with walking, run-walk sessions, easy running, recovery, weekly reviews, and options that begin from your current routine.',
  category: 'Training',
  tags: Object.freeze([
    '30 day running challenge',
    'beginner running',
    'running challenge',
    'run walk challenge',
    'running consistency',
    'running reset',
    'recovery days',
    'monthly challenge'
  ]),
  seoTitle: '30-Day Running Challenge for Beginners: A Flexible Running Reset',
  seoDescription: 'Start a flexible 30-day running challenge for beginners with walking, run-walk options, easy running, recovery days, weekly reviews, and adaptable goals.',
  coverImageAlt: 'Editorial illustration of a Filipino beginner planning a flexible calendar, then walking and jogging easily along a sunny tropical park path'
});

const RAW_CONTENT_HTML = `
<p>A 30-day running challenge for beginners does not need 30 straight days of running. This flexible reset uses movement opportunities, walking, run-walk sessions, easy running, recovery, and weekly reviews. The aim is to create a routine that can be repeated and resumed—not to defend a streak at the expense of health, safety, sleep, work, or ordinary life.</p>
<p>Begin on September 1 or any useful date. Day 1 means your first planning day, not a compulsory weekday. Choose the walking-first, run-walk, or easy-running option closest to what you comfortably do now, and adjust it as the month unfolds.</p>
<p>This general guide is not individualized training, medical advice, rehabilitation, or a promise of event readiness. A successful month can include shorter sessions, repeated weeks, changed routes, and recovery days.</p>
<blockquote><strong>The 30-day reset principle:</strong> build a routine you can return to. Count thoughtful planning, suitable movement, recovery, and honest review as parts of the challenge rather than treating only running kilometres as progress.</blockquote>

<h2>The 30-day running challenge in one minute</h2>
<ol>
  <li><strong>Begin from recent reality.</strong> Review the walking, running, and ordinary movement you have actually repeated in recent weeks.</li>
  <li><strong>Choose one starting track.</strong> Use walking-first, run-walk, or easy-running options without treating the labels as levels you must race through.</li>
  <li><strong>Plan opportunities, not debts.</strong> Place a few suitable movement windows around work, school, care, sleep, route access, and recovery.</li>
  <li><strong>Keep movement comfortable.</strong> Slow down, walk, shorten, reschedule, or stop when effort, symptoms, weather, or surroundings require a different decision.</li>
  <li><strong>Include recovery deliberately.</strong> A recovery day is part of the calendar, not an empty square to repay later.</li>
  <li><strong>Review each week.</strong> Notice what was repeatable and change one useful variable only when a change serves the goal.</li>
  <li><strong>Resume after disruption.</strong> Missing a day does not restart the challenge and does not create double activity tomorrow.</li>
  <li><strong>Finish with a next step.</strong> Use Days 29 and 30 to review the month and choose an appropriate continuation, event, or repeat.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This article was reviewed in September 2026 using current public guidance from the World Health Organization, the US Centers for Disease Control and Prevention, and the UK National Health Service. Those sources support gradual beginnings, accessible activity, and structured run-walk with rest.</p>
<p>Those sources support the broad choices in this guide; they do not validate one universal 30-day schedule. Population recommendations describe activity associated with health benefits; they are not personal training plans, race-readiness tests, medical clearance, or guarantees against injury. The NHS plan lasts longer than this challenge and is cited as an example of structured run-walk and rest—not as evidence that every reader should copy its intervals.</p>
<p>Health conditions, disability, pregnancy or postpartum status, medicines, recent illness, pain, injury history, surgery, prolonged inactivity, and other personal circumstances can change what activity is appropriate. Follow current professional advice that applies to you. Seek appropriate medical or emergency help for severe, sudden, unexplained, or worsening symptoms instead of using a challenge calendar as permission to continue.</p>

<h2>What this challenge is—and what it is not</h2>
<p>This challenge is a 30-day container for practising decisions: prepare, move, recover, use a backup, or review. It assigns no compulsory distance, pace, body-change goal, or progression to continuous running. It may help beginners, walkers exploring relaxed jogging, appropriately cleared returning runners, and busy people who need backup opportunities. Personal challenge progress remains separate from official event progress.</p>
<p>If you are specifically returning after time away, first read <a href="/blog/returning-to-running-after-a-break-gradual-restart-plan">the gradual returning-to-running guide</a>. It helps distinguish an ordinary routine break from a situation that needs individualized return-to-activity guidance.</p>

<h2>Choose your starting track</h2>
<p>These tracks are alternatives, not rankings. Choose from your recent ordinary weeks rather than a best-ever day or another person's result.</p>
<h3>Walking-first</h3>
<p>Choose this option when purposeful walking is the most suitable repeatable activity right now. Movement days use comfortable walks. An optional experiment may add a few very short relaxed jogs only when that choice is appropriate. Completing the whole month with walking remains a valid personal reset.</p>
<h3>Run-walk</h3>
<p>Choose this option when you already tolerate comfortable walking and want planned running portions separated by enough walking to regain control. Decide the walk breaks before the session. Keep the running relaxed rather than sprinting between recoveries. The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">run-walk method guide</a> explains how to select cues without chasing a perfect ratio.</p>
<h3>Easy-running</h3>
<p>Choose this option when short easy runs are already part of your current routine and recovery is ordinary. Movement days can use familiar easy running, but the challenge does not ask you to increase pace and distance together. Walking remains available during any session, and a recovery day does not become a test run.</p>
<p>If none of the tracks resembles your present situation, do not force a label. Build a walking or general-activity routine, obtain individual guidance where needed, or use the calendar only for planning and observation.</p>

<h2>Prepare before Day 1</h2>
<p>Start by looking at the next 30 days. Mark work deadlines, examinations, caregiving, travel, appointments, celebrations, expected high-demand days, and any other fixed commitments. Then identify a few realistic movement opportunities and at least one backup. The <a href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school">weekly running schedule guide</a> provides a fuller method for fitting activity around real responsibilities.</p>
<p>Choose routes that are permitted, visible enough for the planned time, and easy to shorten. Check crossings, surface, lighting, water access, and the ability to turn back. A phone timer, calendar, paper note, or activity app can help, but tracking is optional. Learn device controls while stationary and put the device away near traffic.</p>
<h3>Write three boundaries</h3>
<ul>
  <li><strong>Your minimum:</strong> the smallest useful version of an opportunity, which may be preparation, comfortable walking, or a shortened session.</li>
  <li><strong>Your working plan:</strong> the version that current activity, time, route, and recovery suggest is reasonable.</li>
  <li><strong>Your stop or change rule:</strong> the symptoms, conditions, schedule conflict, or effort signals that mean walk, end, reschedule, rest, or seek help.</li>
</ul>

<h2>Your flexible 30-day challenge calendar</h2>
<p>Each numbered day has a role rather than a compulsory workout. Move the roles within a week when recovery and real life require it, while preserving space between harder-for-you activities. “Movement” means the suitable version from your selected track. “Easy walk” can be a comfortable personal walk that supports the routine without needing to become a recorded result.</p>
<ol>
  <li><strong>Day 1 — Plan:</strong> review recent activity, calendar, route, and boundaries; choose a track.</li>
  <li><strong>Day 2 — Movement:</strong> use a comfortable walk, modest planned run-walk cycles, or a familiar short easy run.</li>
  <li><strong>Day 3 — Recover:</strong> rest or use ordinary gentle movement; notice the later-day response.</li>
  <li><strong>Day 4 — Easy walk:</strong> walk comfortably if appropriate and keep it separate from pace goals.</li>
  <li><strong>Day 5 — Movement:</strong> repeat or shorten Day 2 using the same selected track.</li>
  <li><strong>Day 6 — Backup or recover:</strong> use only if a suitable earlier opportunity moved; otherwise recover.</li>
  <li><strong>Day 7 — Review:</strong> record what fit, what did not, and one adjustment for Week 2.</li>
  <li><strong>Day 8 — Prepare:</strong> confirm two primary opportunities, a backup, route, and weather plan.</li>
  <li><strong>Day 9 — Movement:</strong> use a comfortable walk, repeatable run-walk, or comfortable easy run.</li>
  <li><strong>Day 10 — Recover:</strong> protect recovery; do not add distance because yesterday felt good.</li>
  <li><strong>Day 11 — Technique cue:</strong> notice relaxed posture, calm transitions, effort, and route awareness.</li>
  <li><strong>Day 12 — Movement:</strong> use a repeatable walk, controlled run-walk, or familiar easy run.</li>
  <li><strong>Day 13 — Backup or recover:</strong> move a missed opportunity here only when the day is suitable.</li>
  <li><strong>Day 14 — Review:</strong> keep what works and remove one source of preparation friction.</li>
  <li><strong>Day 15 — Reset:</strong> rechoose the same track or a more suitable one without judging the label.</li>
  <li><strong>Day 16 — Movement:</strong> walk with an optional brief jog experiment, repeat one run-walk cue, or run easily at familiar effort.</li>
  <li><strong>Day 17 — Recover:</strong> review effort, symptoms, sleep, and ordinary movement.</li>
  <li><strong>Day 18 — Easy walk:</strong> use a safe familiar route or choose recovery when needed.</li>
  <li><strong>Day 19 — Movement:</strong> repeat or modestly extend walking, or change at most one useful run-walk or easy-running variable.</li>
  <li><strong>Day 20 — Backup or recover:</strong> do not combine two missed sessions into this day.</li>
  <li><strong>Day 21 — Review:</strong> decide whether Week 4 should repeat, reduce, or consolidate.</li>
  <li><strong>Day 22 — Prepare:</strong> choose a calm final-week rhythm rather than a finishing test.</li>
  <li><strong>Day 23 — Movement:</strong> use a comfortable walk, best-understood run-walk pattern, or comfortable familiar run.</li>
  <li><strong>Day 24 — Recover:</strong> leave the successful session alone; recovery completes the pair.</li>
  <li><strong>Day 25 — Choice:</strong> choose an easy walk, preparation, gentle personal movement, or recovery.</li>
  <li><strong>Day 26 — Movement:</strong> use a repeatable walk, run-walk, or easy run.</li>
  <li><strong>Day 27 — Backup or recover:</strong> keep this flexible; it is not a last chance to chase totals.</li>
  <li><strong>Day 28 — Review:</strong> compare the month with your starting reality, not another runner.</li>
  <li><strong>Day 29 — Celebrate and summarize:</strong> name the decisions and routines that became easier to repeat.</li>
  <li><strong>Day 30 — Choose the next step:</strong> repeat, continue, pause, seek guidance, or select an appropriate goal.</li>
</ol>
<p>This calendar is flexible. If its order conflicts with professional advice, recovery, weather, route safety, or real life, change it. Repeating Week 1 can be more useful than forcing Week 3.</p>

<h2>Week 1: establish a manageable baseline</h2>
<p>The first week is an observation week. Use the opening movement opportunity to learn how the track feels under ordinary conditions. Keep the route easy to shorten, begin gradually, and finish while you can still review the session calmly. Do not turn Day 2 into a fitness test that the rest of the month must repay.</p>
<p>Notice effort during movement and the next morning. Controlled effort and an ordinary recovery suggest repetition; unusual fatigue, worsening discomfort, or disruption to ordinary movement call for a reduction, change, or appropriate guidance.</p>

<h2>Week 2: make the routine easier to repeat</h2>
<p>Week 2 focuses on friction. Lay out clothing, charge the device, choose the route, or move the activity window before the day becomes crowded. If rain or heat often removes the original time, identify a permitted indoor option or another day. The goal is not to eliminate every obstacle; it is to stop solving the same avoidable problem at the last minute.</p>
<p>Repeat the movement pattern when it remains suitable. Familiarity can improve pacing and confidence without changing distance or duration. Use the technique-cue day for one observation, such as relaxed shoulders, route awareness, or smoother run-to-walk transitions—not a complete running-form reconstruction.</p>

<h2>Week 3: progress one variable only when useful</h2>
<p>Progress is optional. Calmer effort, ordinary recovery, a safer route, or using the planned walk earlier can matter even when time and distance stay the same.</p>
<p>If more than one comparable session has felt manageable and a change supports your goal, adjust one useful variable. A walking-first participant might add a small amount of comfortable walking or briefly explore relaxed jogging. A run-walk participant might slightly change a running cue, walking recovery, number of cycles, or total duration—but not all at once. An easy runner might modestly change time or route while leaving pace easy.</p>

<h2>Week 4: consolidate rather than peak</h2>
<p>The final full week is not a race against the calendar. Choose the version you understand best and practise it. Consolidation means the setup, route, effort, and recovery form a routine you could reasonably use again. It does not require the longest or fastest activity of the month.</p>
<p>The choice and backup days let the plan breathe. Use them for an easy walk, preparation, suitable gentle movement, or recovery. If both primary opportunities happened, the backup can remain empty; do not hide a hard workout inside an optional square because the month is ending.</p>

<h2>Days 29 and 30: review and choose what comes next</h2>
<p>On Day 29, summarize the month without reducing it to a streak. Count how many suitable opportunities happened, how often you resumed after a change, which routes and times worked, and how recovery felt. Note whether walking-first, run-walk, or easy-running remained the best description. Record any unresolved symptom or barrier that should affect the next decision.</p>
<p>On Day 30, choose one next step. You might repeat the challenge with the same track, continue the weekly rhythm without numbered days, use <a href="/blog/how-to-set-a-realistic-monthly-running-goal">the realistic monthly running goal guide</a>, prepare gradually for a suitable event, pause, or seek individualized guidance. Do not choose the largest target merely because the calendar ended.</p>
<p>If a comfortable 5K is repeatable, the <a href="/blog/10k-training-plan-for-beginners">beginner 10K framework</a> offers a flexible next progression.</p>
<p>If a HelloRun event provides useful motivation, browse <a href="/events">current events</a> and read the complete live rules before registering. Match the event format, distance, dates, accepted activities, evidence, and recovery demands to your current situation.</p>

<h2>How to adjust when you miss a day</h2>
<p>A missed day does not erase the work before it. Identify the cause: schedule, sleep, caregiving, weather, route access, illness, discomfort, motivation, or a plan that was too ambitious. Different causes need different changes. Moving the opportunity may solve a calendar conflict; it does not solve worsening pain.</p>
<p>Use a backup day only when it remains suitable. Do not double the next session, combine two running opportunities, remove recovery, or push pace to restore a perfect row of check marks. Resume with the next useful role or repeat the earlier week. The challenge ends after 30 calendar days even when some movement squares remain intentionally incomplete.</p>
<p>If you miss most planned opportunities, review the design without shame. A smaller routine, walking-first track, safer route, different time, or non-running activity may fit better.</p>

<h2>Track progress without turning every number into a target</h2>
<p>Note the day role, activity, effort, conditions, and later response. That context is often more useful than pace alone. Devices can drift, so review numbers after stopping safely.</p>
<p>For a personal challenge, you decide what the check mark means. For an event, the organizer's published rules decide eligibility. Recorded, submitted, pending, approved, and rejected activity are different states. A pending activity is potential progress, not official progress. Never alter evidence or claim a personal planning activity as an eligible result when it does not meet the event rules.</p>

<h2>Adapt for weather, routes, and ordinary life</h2>
<p>In the Philippines, heat, humidity, heavy rain, thunderstorms, flooding, poor visibility, and traffic can alter an activity. Check official forecasts and local conditions close to departure. Choose a safer time, route, indoor option, shorter session, walking, rescheduling, or recovery as appropriate.</p>
<p>Choose a route that permits an early return, maintain awareness, and use suitable visibility after dark. Busy weeks need honest time accounting: if a session repeatedly competes with necessary sleep or work, redesign it with the weekly scheduling guide.</p>

<h2>Recovery and safety boundaries</h2>
<p>Recovery includes sleep, ordinary food and hydration, easier days, and time between activities that are demanding for you. The <a href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back">post-run recovery guide</a> explains how to review the whole response without claiming that one routine removes injury risk.</p>
<p>Slow down, walk, stop, or change the plan when effort is no longer appropriate for the intended easy session. Seek qualified guidance for new, recurrent, unexplained, or worsening pain; symptoms that alter ordinary movement; uncertainty after illness or injury; or circumstances covered by individualized medical advice.</p>
<p>Use urgent local help for severe breathing difficulty, chest pain or pressure, fainting, confusion, altered awareness, suspected serious heat illness, or another severe or rapidly worsening symptom. Do not test whether it will disappear by finishing the planned session.</p>

<h2>Personal challenge progress versus virtual-run progress</h2>
<p>This reset is personal unless you separately register for an event. Walking counts here but may not be accepted by every virtual run. Completing the calendar also does not prove readiness for a particular distance. Read the current event's activity, date, distance, proof, and review rules; preserve original records and never assume every tracker, treadmill session, walk, or screenshot qualifies.</p>

<h2>Frequently asked questions</h2>
<h3>Do I have to run for 30 days?</h3>
<p>No. The challenge lasts 30 calendar days, but running is only one possible role. Walking, run-walk movement, recovery, planning, backup, and review days are built into the structure.</p>
<h3>What if I can only walk?</h3>
<p>Use the walking-first track when it is appropriate for you. Walking can support a personal movement routine. Check separate event rules before assuming it earns virtual-run progress.</p>
<h3>How many kilometres should a beginner complete?</h3>
<p>This guide does not assign a universal distance. Recent activity, time, recovery, health, route, weather, and purpose differ. Begin from repeatable reality rather than a number attached to the word beginner.</p>
<h3>What happens if I miss several days?</h3>
<p>Resume with the next useful role or repeat an earlier week. Do not compress missed running into the remaining days. Review why the original plan did not fit and redesign it.</p>
<h3>Do recovery days break the challenge?</h3>
<p>No. Recovery days are assigned challenge roles. They help preserve the distinction between building a routine and chasing a daily-running streak.</p>

<h2>Your practical next step</h2>
<p>Open the next 30 days and mark Day 1. Review recent ordinary activity, choose the track that most closely matches it, identify two realistic movement opportunities and one backup for the first week, and write a stop-or-change rule. Keep the first opportunity deliberately manageable.</p>
<p>If an event would give the routine a meaningful direction, <a href="/events">browse current HelloRun events</a>. Choose only after reading the live dates, activity rules, evidence requirements, and goal. The event should support a suitable routine—not turn recovery or safety into an obstacle.</p>

<h2>Official sources and review notes</h2>
<ul>
  <li><a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity">World Health Organization: Physical activity</a> — used for population-level context that some activity is better than none and activity can begin with small amounts.</li>
  <li><a href="https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html">US CDC: Steps for Getting Started With Physical Activity</a> — used for starting slowly, choosing accessible activity, scheduling, and addressing barriers.</li>
  <li><a href="https://www.cdc.gov/physicalactivity/basics/measuring/index.html">US CDC: Measuring Physical Activity Intensity</a> — used for general relative-intensity and talk-test context.</li>
  <li><a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/">NHS: Couch to 5K running plan</a> — used as one public example of walking, running, gradual structure, and rest between running sessions.</li>
</ul>
<p>Sources were checked in September 2026. They support general education, not the personal suitability of a particular track, session, event, distance, pace, or progression. Current professional instructions, official local warnings, route conditions, and live event rules remain authoritative.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'The 30-day running challenge in one minute',
  'How this guide was prepared',
  'Choose your starting track',
  'Your flexible 30-day challenge calendar',
  'Week 1: establish a manageable baseline',
  'Week 3: progress one variable only when useful',
  'Days 29 and 30: review and choose what comes next',
  'How to adjust when you miss a day',
  'Recovery and safety boundaries',
  'Frequently asked questions',
  'Your practical next step',
  'Official sources and review notes'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/blog/returning-to-running-after-a-break-gradual-restart-plan"',
  'href="/blog/run-walk-method-beginner-friendly-way-build-endurance"',
  'href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school"',
  'href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back"',
  'href="/blog/how-to-set-a-realistic-monthly-running-goal"',
  'href="/blog/10k-training-plan-for-beginners"'
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
  if (/<h[12]>30-Day Running Challenge for Beginners:/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/(?:must|should|need to) run every day|daily running is required|never miss a day/i.test(text)) errors.push('article must not prescribe daily running');
  if (/(?<!not )guarantee(?:s|d)? (?:results|fitness|completion|safety|weight loss|injury prevention)|prevents? (?:all )?injur/i.test(text)) errors.push('article must not guarantee outcomes or injury prevention');
  if (/(?:must|should) make up .{0,50} by (?:doubling|running twice)|remove recovery to catch up/i.test(text)) errors.push('article must not prescribe unsafe catch-up activity');
  if (/(?:everyone|every runner) (?:must|should) start with|the perfect run.walk ratio is|walking is always accepted/i.test(text)) errors.push('article must not prescribe a universal track, interval, or event rule');
  if (/pending (?:distance|activity|evidence) (?:counts|is counted) (?:as )?(?:official|approved|completion)|pending activity completes/i.test(text)) errors.push('article must not count pending progress officially');
  if (/every submission is automatically approved|automatic approval is guaranteed/i.test(text)) errors.push('article must not promise automatic approval');
  if (!/reviewed in September 2026 using current public guidance/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/Population recommendations describe activity associated with health benefits; they are not personal training plans/i.test(text)) errors.push('article must distinguish public-health guidance from personal training');
  if (!/A pending activity is potential progress, not official progress/i.test(text)) errors.push('article must distinguish pending progress');
  if (!/does not need 30 straight days of running/i.test(text)) errors.push('article must answer daily-running intent early');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid 30-day running challenge payload: ${errors.join('; ')}`);
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
