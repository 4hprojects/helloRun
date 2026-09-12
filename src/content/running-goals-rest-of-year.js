'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-set-running-goals-for-the-rest-of-the-year';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Set a Running Goal for the Last Four Months of the Year',
  excerpt: 'Choose one realistic September-to-December running goal, connect it to a repeatable process, and use flexible monthly checkpoints that adapt when health, weather, work, or life changes.',
  category: 'Motivation',
  tags: Object.freeze([
    'running goals',
    'running goals beginners',
    'year end running goal',
    'running goal ideas',
    'running motivation',
    'monthly checkpoints',
    'distance running goals',
    'running plan 2026'
  ]),
  seoTitle: 'How to Set a Running Goal for the Last Four Months of the Year',
  seoDescription: 'Set a realistic running goal for September through December using distance, consistency, event, or habit targets that fit your schedule and current ability.',
  coverImageAlt: 'Woodblock mosaic of a Filipino runner choosing one flexible path through four year-end checkpoints for consistency, distance, and event goals'
});

const RAW_CONTENT_HTML = `
<p>A realistic running goal for the last four months of the year starts with one main outcome—not a list of every distance, streak, pace, and event you could chase before December ends. Review what you can repeat now, choose a goal type that matters, define one process you control, and give September, October, November, and December a flexible checkpoint rather than a compulsory performance test.</p>
<p>If you are reading this on September 30 or later, do not create activity debt for a month that has already passed. Start from today. Treat the four named months as an original planning map, then relabel the remaining checkpoints as Start, Build, Consolidate, and Review or extend the goal into the next year. A shorter honest runway is more useful than pretending you began earlier.</p>
<blockquote><strong>The year-end goal formula:</strong> one meaningful outcome + one repeatable process + four adjustable checkpoints + one clear change rule. The formula organizes decisions; it does not calculate a universally safe distance or guarantee a result.</blockquote>

<h2>Your year-end running goal in one minute</h2>
<ol>
  <li><strong>Audit the present.</strong> Use several ordinary recent weeks, not an old personal best or one unusually free week.</li>
  <li><strong>Choose one main goal type.</strong> Select consistency, distance progression, first-event completion, or a monthly-challenge process.</li>
  <li><strong>Write an outcome and a process.</strong> Name what you hope to reach and the weekly action you can influence.</li>
  <li><strong>Check the runway.</strong> Match the goal and its four adjustable checkpoints to remaining time, recovery, conditions, and commitments.</li>
  <li><strong>Define a minimum and change rule.</strong> Decide what still counts and what would make you repeat, reduce, postpone, or stop.</li>
  <li><strong>Separate personal progress from event status.</strong> A recorded activity, submitted proof, pending review, and approved result are not the same.</li>
  <li><strong>Review the system, not your worth.</strong> One missed week changes the plan; it does not turn the year into failure.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This article was reviewed in September 2026 against current WHO, CDC, NHS, and US HHS guidance, together with HelloRun event and activity-review behavior. The sources support manageable starts, scheduling, gradual progression, simple tracking, and translating choices into a weekly plan. CDC's SMART framework can clarify an objective but cannot make a distance or deadline individually appropriate.</p>
<p>Those sources do not prescribe this article's goals, distances, checkpoints, or examples. Population guidance is not a personal training programme, medical clearance, rehabilitation plan, event-readiness test, or guarantee against injury.</p>
<p>Health conditions, disability, pregnancy or postpartum status, medicines, illness, injury, surgery, and inactivity can change what is suitable. Follow applicable qualified advice and obtain appropriate help for severe, sudden, unexplained, recurrent, or worsening symptoms. December 31 is never permission to continue through them.</p>

<h2>Start with where you are now</h2>
<p>Review four to six ordinary weeks. Record activity frequency, familiar duration and distance, effort, conditions, and later recovery—including disrupted weeks—because the next months will also contain real life.</p>
<p>Separate recent capacity from historical identity. “I used to run 10K” is context, not a repeatable current 10K. One difficult long run is not the required starting point because it is the largest app entry.</p>
<p>If activity has been inconsistent or absent, a rebuilding goal may be the strongest choice. The <a href="/blog/returning-to-running-after-a-break-gradual-restart-plan">returning-to-running guide</a> explains why a gradual restart should begin from current function and circumstances rather than trying to recover lost weeks immediately.</p>
<h3>Write a current-state note</h3>
<ul>
  <li>My most repeatable recent activity is ___.</li>
  <li>The number of suitable weekly opportunities I usually protect is ___.</li>
  <li>The main constraints during the next four months are ___.</li>
  <li>The health, recovery, accessibility, or professional guidance I need to follow is ___.</li>
  <li>A goal that would matter to me even without social comparison is ___.</li>
</ul>

<h2>Choose one main type of running goal</h2>
<p>A goal can have supporting actions, but one main outcome clarifies tradeoffs. When consistency, speed, distance, and several events are equal priorities, a difficult week offers no way to decide what to protect.</p>
<h3>Consistency goal</h3>
<p>Choose consistency when the main need is a routine that survives ordinary disruption. Measure suitable weekly opportunities, returning after a missed week, or completing regular reviews—not an unbroken daily-running streak.</p>
<h3>Distance-progression goal</h3>
<p>Choose progression when a shorter distance is already repeatable and a longer distance has enough preparation runway. The goal should name the starting base, the next distance, and the conditions under which progression pauses.</p>
<h3>First-event goal</h3>
<p>Choose an event when a live category provides a meaningful date and format. The event must fit the runner; registration does not make the runner ready. Rules, activity window, accepted activity, route support, evidence, and review matter alongside training.</p>
<h3>Monthly-challenge goal</h3>
<p>Choose a month container when practising a repeatable process matters more than one finish. The <a href="/blog/30-day-running-challenge-for-beginners">flexible 30-day running challenge</a> includes walking, run-walk, easy running, recovery, backups, and weekly reviews without requiring daily running.</p>

<h2>Turn the idea into an outcome and a process</h2>
<p>An outcome is the hoped-for result: a suitable first 5K, repeatable 10K, eligible event finish, or routine through December. A process is what you influence repeatedly: plan, use suitable opportunities, control effort, review recovery, and adjust demand.</p>
<p>An outcome alone can encourage catch-up; a process alone can lack direction. Write both, then add evidence and a change rule.</p>
<p>For example: “By the end of December, I want to complete one suitable 10K using my practised run-walk strategy. Most weeks I will protect two or three appropriate activity opportunities, with one gradually longer easy activity only when the current level recovers normally. I will repeat or extend the timeline after illness, concerning symptoms, or two weeks of poor recovery.”</p>
<p>This is reviewable, not promised. SMART wording can improve clarity, but “time-bound” should create a review point rather than a command to finish at any cost.</p>

<h2>Consistency goals for beginners</h2>
<p>A consistency goal defines the pattern to establish through year-end. It suits new or rebuilding runners and people working out where activity fits.</p>
<p>Measures can include weeks with suitable opportunities, completed reviews, or useful backup plans. Record recovery and changes honestly: rest is not a run, but it is part of the system.</p>
<p>An illustrative goal might be: “From now through December, I will plan two suitable movement opportunities each week, use walking or run-walk according to current ability, and review the pattern every Sunday. A week with one suitable opportunity remains a minimum success; no missed opportunity creates a doubled session.” The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">run-walk method guide</a> offers flexible time-, landmark-, and effort-led patterns without prescribing one universal ratio.</p>
<p>The <a href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school">weekly running schedule guide</a> provides fixed, flexible, backup, and unavailable categories for turning that statement into a real calendar.</p>

<h2>Distance goals without arbitrary totals</h2>
<p>A distance goal needs a repeatable start, sensible next step, enough time, and plans for recovery and conditions—not a multiplied social-media total or the largest impressive category.</p>
<p>Distance is one workload description. Ten kilometres differs across heat, hills, sleep, surface, and run-walk duration; effort, frequency, and later response provide context.</p>
<p>If choosing an accumulated total, test feasibility against real opportunities without treating arithmetic as a training prescription. Dividing 80 kilometres by 16 weeks gives an average of 5 kilometres per week, but it does not show whether 80 kilometres is appropriate, how activity should be distributed, whether event rules accept it, or what happens during a missed week.</p>
<p>The <a href="/blog/how-to-set-a-realistic-monthly-running-goal">realistic monthly-goal guide</a> is the detailed worksheet for selecting a single month's target. This article stays at the four-month level: one destination, a process, checkpoints, and permission to revise the route.</p>

<h2>Choose a first-event goal carefully</h2>
<p>An event can turn “sometime” into a date, but it should follow readiness review. Browse <a href="/events">current HelloRun events</a> and read the live category, dates, format, accepted activities, evidence, review, recognition, delivery, and onsite instructions.</p>
<p>A personal activity may support the goal without qualifying for the event. Recorded, submitted, pending, and approved are different states; never assume events accept identical activity or proof.</p>
<p>Choose a goal date with spare capacity. Travel, examinations, peak work periods, holidays, weather, illness, and review corrections can consume the final weeks. If the event date makes gradual preparation impossible, select a later event or keep the goal personal.</p>

<h2>Build from 5K toward 10K</h2>
<p>A first 10K goal generally makes more sense when 5K or comparable easy run-walk time is repeatable rather than a one-time maximum effort. The <a href="/blog/10k-training-plan-for-beginners">beginner 10K guide</a> offers an illustrative eight-week framework with a familiar easy activity, optional support activity, one conditionally longer activity, consolidation, rehearsal, and reduction.</p>
<p>Let year-end checkpoints house, not override, progression: Start reviews the base, Build introduces a modest extension, Consolidate repeats and rehearses, and Review attempts or extends. Relabel phases for a later start.</p>
<p>A missed block does not justify compressing eight weeks into four. If 10K is not ready by December, arriving at a stronger 5K base and a workable January plan can still fulfill the larger purpose.</p>

<h2>Move from 10K toward 21K only when it fits</h2>
<p>A half marathon is not the automatic reward for one 10K. Longer duration changes recovery, route support, pacing, food and fluid practice, equipment, tracking, and conditions. Start from a repeatable base with a distinct runway.</p>
<p>The <a href="/blog/21k-half-marathon-for-beginners">beginner 21K guide</a> provides an illustrative 12-week bridge for an established beginner. If only twelve calendar weeks remain but the starting base is not present, the guide does not make the deadline appropriate. Extend into the next year or choose a shorter goal.</p>
<p>Use the <a href="/blog/how-long-to-run-5k-10k-21k">5K, 10K, and 21K finish-time guide</a> for pace arithmetic and ranges, not as evidence that a predicted time establishes readiness.</p>

<h2>Use monthly challenge goals as practice</h2>
<p>A monthly challenge can serve the four-month goal without four maximum efforts. One month can establish, another maintain, and another rehearse. Not every month needs a larger distance total.</p>
<p>Keep personal challenge progress separate from official event progress. A walk, tracker test, planning day, or recovery day may serve a personal challenge while contributing no event distance. Event rules decide eligibility; the personal calendar decides what you are learning.</p>
<p>After a good month, repeatability may beat escalation. After a difficult one, review the target, schedule, route, conditions, recovery, equipment, health, and motivation; change the relevant component.</p>

<h2>Set goals around work, school, and caregiving</h2>
<p>Place fixed commitments and sleep before running. Mark work, school, care, travel, holidays, and appointments, then label activity windows primary, flexible, backup, or unavailable.</p>
<p>A worker may protect consistency through peak season; a student may use exams as consolidation; a caregiver may use shorter opportunities and a wider window.</p>
<p>Minimum success matters here. Define the smallest action that preserves the purpose without creating debt: completing the weekly planning review, taking one suitable walk, repeating a familiar run-walk, or protecting recovery. Minimum success is a personal planning label and may not be event-eligible.</p>

<h2>Create September, October, November, and December checkpoints</h2>
<p>A checkpoint asks whether the goal still fits. It is not a monthly exam. Use the four months as phases even when the actual start occurs late; relabel or extend them rather than backfilling missed activity.</p>
<h3>September — Establish</h3>
<p>Audit recent weeks, choose one main goal, define the outcome and process, identify constraints, and repeat the current base. If starting on September 30, this phase can be one planning session rather than a fictional month of activity.</p>
<h3>October — Build</h3>
<p>Protect the process and consider one modest progression only when the established routine is manageable. Test route, equipment, tracking, or run-walk choices without changing everything together.</p>
<h3>November — Consolidate</h3>
<p>Hold, repeat, or reduce. Use busy weeks, weather, travel, or accumulated fatigue as information. Rehearse event logistics where relevant and decide whether the December outcome remains appropriate.</p>
<h3>December — Complete, continue, or revise</h3>
<p>Attempt the outcome only when preparation and conditions support it. Otherwise continue the process, choose a later event, or close the year with an honest review. December 31 is a checkpoint, not a medical clearance or moral deadline.</p>

<h2>A four-month running-goal worksheet</h2>
<ol>
  <li><strong>Current base:</strong> What activity has been repeatable during ordinary recent weeks?</li>
  <li><strong>Purpose:</strong> Why does this goal matter without comparison or public recognition?</li>
  <li><strong>Main outcome:</strong> What one result will the four-month horizon organize?</li>
  <li><strong>Repeatable process:</strong> Which weekly action is under your influence?</li>
  <li><strong>Evidence:</strong> How will you record progress without confusing it with event approval?</li>
  <li><strong>Minimum success:</strong> What smaller result still serves the purpose?</li>
  <li><strong>Constraints:</strong> Which health, schedule, route, weather, access, or event facts matter?</li>
  <li><strong>Change rule:</strong> What triggers repetition, reduction, postponement, advice, or stopping?</li>
  <li><strong>Checkpoints:</strong> What decision belongs at Establish, Build, Consolidate, and Review?</li>
  <li><strong>Next review:</strong> When will you calmly examine the plan again?</li>
</ol>

<h2>Four illustrative running-goal examples</h2>
<h3>Example 1: rebuild consistency</h3>
<p>Ana has walked regularly but run inconsistently. Her outcome is a repeatable two-opportunity weekly routine, not a race distance. Sunday planning and walking-first or run-walk opportunities establish and protect the pattern before a December review.</p>
<h3>Example 2: move from 5K to a first 10K</h3>
<p>Ben can repeat an easy 5K and has twelve suitable weeks. He aims for one controlled 10K without a target time, using familiar easy activity, optional support, conditional extension, and weekly review. Illness moves the date rather than doubling sessions.</p>
<h3>Example 3: make 10K repeatable instead of rushing to 21K</h3>
<p>Carla's one difficult 10K is not repeatable, so she replaces a December half marathon with a controlled 10K run-walk. The 21K bridge can begin later if recovery and schedule support it.</p>
<h3>Example 4: use a virtual event as a checkpoint</h3>
<p>Diego chooses a December virtual 5K that accepts his activity, then plans suitable weekly opportunities and a tracker rehearsal. He uses the <a href="/blog/how-to-run-your-first-10k-virtual-run">first virtual 10K guide</a> as a rules, route, proof, and recovery checklist—not a reason to change distance.</p>
<p>These fictional examples demonstrate decisions, not recommended schedules, safe predictions, or guaranteed outcomes.</p>

<h2>What to do when the plan changes</h2>
<p>Identify the cause before responding. Weather may require another time or indoor option; illness or symptoms may require rest or guidance; repeated conflicts may require another day; constant catch-up may require a smaller outcome or longer runway.</p>
<p>Do not double activity, remove recovery, add speed, or compress missed weeks. Resume from a manageable baseline; arithmetic does not create readiness.</p>
<p>For a registered event, read documented cancellation, transfer, category, or support options where provided. Do not assume an organizer can alter the rules or deadline. A changed personal goal does not automatically change the event registration.</p>

<h2>Review progress without making one missed week a failure</h2>
<p>A weekly check-in asks what happened and what comes next. A monthly checkpoint asks whether the outcome, process, minimum, and change rule still fit.</p>
<ul>
  <li>Which process actions happened?</li>
  <li>What did effort, symptoms, and later recovery show?</li>
  <li>Which constraint was real rather than anticipated?</li>
  <li>Does the remaining runway still support the outcome?</li>
  <li>Should the next phase build, repeat, consolidate, reduce, or pause?</li>
  <li>For an event, which activities are recorded, submitted, pending, approved, or rejected?</li>
</ul>
<p>Do not turn a calendar completion rate into a judgment of discipline or identity. The plan is a hypothesis about the future. When reality supplies better information, revising it is part of goal setting.</p>

<h2>Frequently asked questions</h2>
<h3>What is a good running goal for a beginner?</h3>
<p>A good goal matches current repeatable activity and real constraints. It may be a consistency process, a gradual 5K or 10K progression, or one suitable event. No single distance applies to every beginner.</p>
<h3>Can I start in October or November?</h3>
<p>Yes. Begin from the current date and reduce, relabel, or extend the checkpoints. Do not repay September with extra activity.</p>
<h3>Should every month increase mileage?</h3>
<p>No. Establishment, consolidation, recovery, and repetition can be deliberate phases. More distance is not the only evidence of progress.</p>
<h3>Can I work toward 21K before year-end?</h3>
<p>Only when a repeatable shorter-distance base, sufficient runway, recovery, health, conditions, and individual circumstances support it. The calendar alone cannot establish readiness.</p>
<h3>Does registering guarantee my goal activity will count?</h3>
<p>No. The live rules, activity window, evidence, and review determine official event status. Pending is not approved.</p>

<h2>Choose one goal and its first action</h2>
<p>Write one sentence for the outcome, one sentence for the process, and one sentence for the change rule. Then place only the Establish checkpoint on the current calendar: audit recent activity, confirm constraints, and repeat the current base. Do not plan December detail before learning from the first phase.</p>
<p>When a current listing genuinely fits, <a href="/events">find a HelloRun event</a> that gives the goal an appropriate date and distance. Read the full live rules before registering. The event can support the plan; it should not pressure you to outrun it.</p>

<h2>Official sources and review notes</h2>
<ul>
  <li><a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity">World Health Organization: Physical activity fact sheet</a> — population-level activity context.</li>
  <li><a href="https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html">US CDC: Steps for Getting Started With Physical Activity</a> — starting slowly, scheduling, and gradual progression.</li>
  <li><a href="https://www.cdc.gov/youth-advisory-councils/action-plans/smart-framework.html">US CDC: SMART Framework</a> — used for general objective-clarity principles, not personal exercise prescription.</li>
  <li><a href="https://www.nhs.uk/better-health/get-active/how-to-be-more-active/">NHS: How to be more active</a> — starting small, planning days, and simple progress tracking.</li>
  <li><a href="https://odphp.health.gov/moveyourway/activity-planner/activities">US HHS Move Your Way: Activity planner</a> — example of mapping selected activities into a weekly plan.</li>
</ul>
<p>Sources and current HelloRun behavior were checked in September 2026. Public guidance, platform behavior, and event rules can change. Recheck current sources and the complete live event page when making a health, training, or participation decision.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Your year-end running goal in one minute',
  'How this guide was prepared',
  'Start with where you are now',
  'Choose one main type of running goal',
  'Turn the idea into an outcome and a process',
  'Consistency goals for beginners',
  'Distance goals without arbitrary totals',
  'Choose a first-event goal carefully',
  'Build from 5K toward 10K',
  'Move from 10K toward 21K only when it fits',
  'Use monthly challenge goals as practice',
  'Set goals around work, school, and caregiving',
  'Create September, October, November, and December checkpoints',
  'A four-month running-goal worksheet',
  'Four illustrative running-goal examples',
  'What to do when the plan changes',
  'Review progress without making one missed week a failure',
  'Frequently asked questions',
  'Choose one goal and its first action',
  'Official sources and review notes'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school"',
  'href="/blog/returning-to-running-after-a-break-gradual-restart-plan"',
  'href="/blog/run-walk-method-beginner-friendly-way-build-endurance"',
  'href="/blog/how-to-set-a-realistic-monthly-running-goal"',
  'href="/blog/30-day-running-challenge-for-beginners"',
  'href="/blog/10k-training-plan-for-beginners"',
  'href="/blog/how-long-to-run-5k-10k-21k"',
  'href="/blog/how-to-run-your-first-10k-virtual-run"',
  'href="/blog/21k-half-marathon-for-beginners"'
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
  if (/<h[12]>How to Set a Running Goal for the Last Four Months of the Year<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/you must run every day|every runner must run daily|daily running is required/i.test(text)) errors.push('article must not require daily running');
  if (/exactly \d+ ?(?:km|kilometres?|kilometers?) (?:is|are) realistic for everyone|every beginner should run \d+ ?(?:km|kilometres?|kilometers?)/i.test(text)) errors.push('article must not prescribe a universal distance');
  if (/every month must increase (?:distance|mileage)|mileage must rise every month/i.test(text)) errors.push('article must not require monthly escalation');
  if (/December 31 guarantees? motivation|this (?:goal|framework|formula) guarantees? (?:success|completion|a finish)/i.test(text)) errors.push('article must not guarantee outcomes');
  if (/make up (?:a )?missed (?:day|week|session) by doubling|double the next (?:run|session)/i.test(text)) errors.push('article must not endorse catch-up activity');
  if (/every event accepts (?:walking|treadmill|run-walk)|all recorded activities automatically count/i.test(text)) errors.push('article must not overstate event eligibility');
  if (/pending (?:activity|distance) counts as (?:official|approved)|every submission is automatically approved/i.test(text)) errors.push('article must not overstate approval');
  if (/SMART goals? (?:make|makes) every deadline achievable|a SMART goal is always safe/i.test(text)) errors.push('article must not overstate SMART framing');
  if (!/starts with one main outcome/i.test(text)) errors.push('article must answer goal-setting intent immediately');
  if (!/do not create activity debt for a month that has already passed/i.test(text)) errors.push('article must address late starts');
  if (!/Population guidance is not a personal training programme/i.test(text)) errors.push('article must distinguish population guidance from personal advice');
  if (!/one meaningful outcome \+ one repeatable process \+ four adjustable checkpoints \+ one clear change rule/i.test(text)) errors.push('article must include the year-end goal formula');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }
  for (const checkpoint of ['September — Establish', 'October — Build', 'November — Consolidate', 'December — Complete, continue, or revise']) {
    if (!payload.contentHtml.includes(`<h3>${checkpoint}</h3>`)) errors.push(`missing checkpoint: ${checkpoint}`);
  }
  if (errors.length) throw new Error(`Invalid year-end running-goals payload: ${errors.join('; ')}`);
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
