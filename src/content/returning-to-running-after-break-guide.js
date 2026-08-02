'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'returning-to-running-after-a-break-gradual-restart-plan';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'Returning to Running After a Break: A Gradual Restart Plan',
  excerpt: 'Restart from your current routine—not an old personal best—with flexible walking, run-walk, easy-running, recovery, weather, and event decisions.',
  category: 'Training',
  tags: Object.freeze([
    'return to running',
    'running restart',
    'gradual running plan',
    'beginner running',
    'run walk method',
    'runner recovery',
    'training after a break',
    'virtual run planning'
  ]),
  seoTitle: 'Returning to Running After a Break: A Gradual Restart Plan',
  seoDescription: 'Use a flexible, gradual process to restart running after an ordinary life break without chasing an old pace, missed distance, or a universal progression.',
  coverImageAlt: 'Claymation sequence showing one runner walking, using run-walk, considering a rest path, and moving into a relaxed easy run'
});

const RAW_CONTENT_HTML = `
<p>A return to running is not a test of whether your old fitness still exists. It is a new planning decision based on what life, ordinary movement, health, recovery, route access, and weather look like now. The useful question is not, “How quickly can I get back?” It is, “What is an appropriate next step that leaves room to observe and adjust?”</p>
<p>A break can follow travel, deadlines, exams, caregiving, a change of job, loss of routine, poor weather, low motivation, illness, pregnancy, injury, surgery, or simply choosing other priorities. Those situations do not create the same return path. This guide addresses an ordinary adult restarting after a non-medical break or after receiving any individual clearance they need. It is not an injury rehabilitation, post-operative, postpartum, or return-to-sport protocol.</p>
<blockquote><strong>The restart principle:</strong> begin from recent reality, choose a manageable opportunity, observe the response, and change the next decision instead of trying to repay the break.</blockquote>

<h2>A gradual restart in one minute</h2>
<ol>
  <li><strong>Name what changed.</strong> Record why running paused, what activity continued, and whether health or medical guidance affects the return.</li>
  <li><strong>Check ordinary readiness.</strong> Consider daily movement, current symptoms, illness, energy, sleep, environment, and individual advice before planning a run.</li>
  <li><strong>Release the old baseline.</strong> An old pace, distance, streak, or personal best is history—not today's starting requirement.</li>
  <li><strong>Choose one modest purpose.</strong> Rebuild the habit, explore comfortable movement, prepare for a later event, or reconnect socially without trying to restore everything at once.</li>
  <li><strong>Select a suitable first opportunity.</strong> Walking, a flexible run-walk, or a short easy run may be options when appropriate; none is a compulsory first step.</li>
  <li><strong>Keep the next step conditional.</strong> Review during the activity, later that day, and the next day before repeating or changing it.</li>
  <li><strong>Change gradually.</strong> Adjust time, frequency, distance, or effort in response to the runner—not through a universal percentage or deadline.</li>
  <li><strong>Keep event credit separate.</strong> Planned, recorded, submitted, pending, approved, and rejected activities are different HelloRun states.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in August 2026 using current World Health Organization population physical-activity guidance, current US Centers for Disease Control and Prevention guidance on adding activity and starting slowly, the UK National Health Service Couch to 5K programme as one public example of run-walk progression and rest, NHS running-injury guidance for stop-and-seek-help boundaries, and current Philippine Atmospheric, Geophysical and Astronomical Services Administration weather products.</p>
<p>It was also checked against current HelloRun event, registration, submission, accumulated-distance, review, leaderboard, and recognition behavior. Platform explanations describe evidence status; they do not assess fitness, diagnose a condition, or authorize a return to activity.</p>
<p>This is general educational information for ordinary adult runners. WHO and CDC recommendations describe populations, not a personal training prescription. A chronic condition, disability, pregnancy or postpartum status, recent illness, injury, surgery, medicine, prolonged inactivity, pain, or other individual factor can require qualified guidance. Current medical and emergency instructions take precedence.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.who.int/health-topics/noncommunicable-diseases/physical-activity">World Health Organization: Physical activity</a>, used for the principles that some activity is better than none and inactive people should start with small amounts and increase gradually.</li>
  <li><a href="https://www.cdc.gov/physical-activity-basics/adding-adults/index.html">CDC: Adding Physical Activity as an Adult</a>, used for choosing activity that matches current abilities and recognizing when individual medical advice matters.</li>
  <li><a href="https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html">CDC: Steps for Getting Started With Physical Activity</a>, used for current start-slowly, scheduling, and barrier-planning context—not for weight-change advice.</li>
  <li><a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/">NHS: Couch to 5K running plan</a>, used as one structured example that alternates running and walking and includes rest between sessions.</li>
  <li><a href="https://www.nhs.uk/live-well/exercise/knee-pain-and-other-running-injuries/">NHS: Knee pain and other running injuries</a>, used for general stop, restart-slowly, and seek-help boundaries.</li>
  <li><a href="https://www.pagasa.dost.gov.ph/products-and-services">PAGASA: Products and Services</a>, used for current Philippine forecast, rainfall, thunderstorm, tropical-cyclone, flood, and heat-information context.</li>
</ul>
<p>Population guidance does not determine an individual's first running duration, pace, frequency, or progression. Current local warnings, route conditions, event rules, and qualified personal advice override the illustrative choices below.</p>

<h2>First decide what kind of break this was</h2>
<p>The reason for the break changes the first question. An ordinary life break may be addressed by rebuilding time, access, and routine. A break involving injury, surgery, a significant illness, pregnancy or childbirth, repeated fainting, chest symptoms, or another health concern may require individualized assessment before running is considered. A generic calendar cannot convert one situation into the other.</p>
<p>Write down the start and approximate length of the break, but do not let duration alone decide readiness. Two people who both stopped for six weeks may have very different current activity. One may have continued walking and cycling while the other was unwell and largely inactive. The date is context, not a formula.</p>
<p>Note what movement continued: walking to work, stairs, active work, mobility exercise, another sport, or no structured activity. Then note what changed outside exercise: sleep, work schedule, caregiving, route access, heat tolerance, medicines, or health. This creates a current picture without pretending to be a clinical assessment.</p>

<h2>Know when a generic restart plan is not enough</h2>
<p>Do not use this article as rehabilitation after an injury, operation, hospitalization, serious illness, or a clinician-directed restriction. Follow the professional plan specific to that situation. If clearance was conditional, preserve the conditions rather than treating “you may exercise” as permission for any distance or intensity.</p>
<p>Seek appropriate assessment for new, severe, recurrent, unexplained, or worsening symptoms; pain that changes ordinary movement; meaningful swelling; inability to bear weight; or uncertainty after an injury. Urgent symptoms such as chest pain or pressure, significant breathing difficulty, fainting, confusion, altered awareness, severe or rapidly worsening pain, or suspected serious heat illness require urgent local help.</p>
<p>No online checklist can rule out a health problem. Do not perform a hard test run to discover whether a concerning symptom is safe. When in doubt, leave the running decision open and get qualified advice.</p>

<h2>Release the old pace, distance, and identity</h2>
<p>An old personal best can be meaningful history without being a current target. The runner who once completed a fast 10K is not required to begin at that pace, and the runner who maintained a long streak has no debt to repay. Fitness, routine, weather adaptation, recovery, and life circumstances can change during a break.</p>
<p>Remove old automatic targets from the first activity screen if they encourage chasing. Choose a route where turning back or shortening is easy. Avoid announcing a fixed comeback distance publicly before learning how ordinary movement feels. A flexible plan is easier to change when it has not become a promise to other people.</p>
<p>This is not “starting over” as a judgment. Previous experience may help with equipment, route knowledge, and recognizing ordinary effort. It still does not guarantee that the former workload is suitable now.</p>

<h2>Define the purpose of returning</h2>
<p>Choose one primary purpose for the first phase. It may be rebuilding a regular movement opportunity, enjoying time outdoors, reconnecting with a group, using a comfortable run-walk pattern, preparing gradually for a future event, or exploring whether running still fits. A purpose guides decisions without dictating a number.</p>
<p>Avoid combining “restore my old distance,” “improve my pace,” “lose weight,” “complete this month's challenge,” and “never miss a day” into one restart. Multiple urgent goals make a calm adjustment feel like failure. Begin with the purpose that matters now and reconsider the others later.</p>
<p>If an event is the reason for returning, use the <a href="/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge">distance-choice guide</a> before committing. A later event, a shorter category where changes are allowed, or no registration can be the responsible decision.</p>

<h2>Build a current baseline from ordinary days</h2>
<p>Look at the most recent ordinary week rather than the most active week before the break. How much walking or other movement happens naturally? Do stairs, commuting, standing work, and household tasks feel ordinary? How is energy after work or school? Is sleep predictable enough to support an activity opportunity?</p>
<p>A baseline is descriptive, not a pass-fail test. Being able to walk in daily life does not automatically clear someone to run, and a wearable's readiness score does not diagnose readiness. The goal is to avoid planning from a memory that no longer matches the current week.</p>
<p>Use the <a href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school">weekly schedule guide</a> to mark fixed, flexible, backup, and unavailable time. Count changing, travel, route access, the activity, a gradual finish, food, washing, and return to the next responsibility. A restart that repeatedly removes sleep or collides with essential work is not yet practical.</p>

<h2>Choose the first suitable activity opportunity</h2>
<p>There is no universal first distance or duration. Depending on recent activity, experience, health context, and individual advice, the first opportunity might be an ordinary walk, a walk with brief comfortable running portions, or an easy continuous run shorter than the person remembers. It may also be a rest day while weather or symptoms are resolved.</p>
<p>Select a familiar, forgiving route with good visibility, safe crossings, an easy exit, and access to support. The <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe-route guide</a> explains how to evaluate traffic, surface, lighting, weather exposure, privacy, and backup options. Avoid using a remote, technical, or steep route to prove that the comeback is real.</p>
<p>Start at a time that allows an unhurried finish and later observation. Do not place the first attempt immediately before an exam, night shift, long drive, or essential care responsibility when another window is available.</p>

<h2>Use walking and run-walk without treating them as lesser</h2>
<p>Walking can be the whole planned activity or part of a running restart. A run-walk structure can make decisions explicit: run comfortably for a chosen portion, walk before form or effort becomes unsuitable, and repeat only while the situation remains appropriate. It is not a punishment and does not need to disappear by a fixed date.</p>
<p>The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">run-walk method guide</a> explains how to choose flexible intervals from current ability rather than a universal ratio. The NHS Couch to 5K programme is one public example of alternating walking and running with rest days, but its schedule is not mandatory and may not suit every returning runner.</p>
<p>Do not turn walking portions into secret recovery from repeated sprints. Keep the purpose clear. If the intended session is easy re-entry, the running portions should not become a pace test merely because a walking break follows.</p>

<h2>Keep effort relative and conversational</h2>
<p>Words such as easy, moderate, and hard describe how effort relates to the individual; they are not one pace shared by everyone. Heat, humidity, hills, surface, sleep, stress, recent illness, and the length of the break can change how a familiar pace feels.</p>
<p>For an ordinary restart, being able to speak comfortably can be one observation that the effort remains controlled. It is not a medical test or a command to continue. New pain, dizziness, chest symptoms, unusual breathing difficulty, confusion, severe fatigue, or a rapidly changing situation overrides a conversational-effort check.</p>
<p>Leave pace targets, segments, and comparisons off the first outing if they pull attention away from current effort and surroundings. Record facts after the run without turning every slower number into a problem to correct.</p>

<h2>Change one planning dimension at a time</h2>
<p>Duration, distance, frequency, running-to-walking balance, terrain, and effort all add demand. When several change together, it becomes harder to understand the response. A practical decision process holds most things steady while reconsidering one dimension at the next review point.</p>
<p>This is a reasoning tool, not a rigid rule. Weather may force a route change while the schedule also changes. The point is to avoid automatically making the run longer, faster, more frequent, and hillier because the first activity felt good.</p>
<p>No universal weekly percentage guarantees a safe progression. A fixed “10 percent rule” can be too much, too little, or irrelevant depending on the starting amount and individual context. Use the actual response, current guidance, and the next week's constraints instead of treating arithmetic as clearance.</p>

<h2>Use a three-checkpoint review</h2>
<h3>During the activity</h3>
<p>Notice whether the planned easy effort remains easy, the route remains safe, walking or running mechanics feel ordinary, and any symptom or environmental concern is emerging. Shorten, walk, turn back, or stop without waiting for the planned endpoint.</p>
<h3>Later the same day</h3>
<p>Consider whether ordinary walking, stairs, appetite, energy, and responsibilities remain manageable. Record unusual or worsening symptoms as facts rather than naming a condition. The <a href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back">post-run recovery guide</a> provides a fuller next-decision framework.</p>
<h3>The next day</h3>
<p>Compare current movement and energy with what is ordinary for the person. If symptoms are worsening, daily function is changed, illness is present, or recovery is not ordinary, do not progress the plan. Rest, reduce, postpone, or seek appropriate help. One comfortable activity does not promise that the next increase is suitable.</p>

<h2>Decide whether to repeat, reduce, pause, or progress</h2>
<p><strong>Repeat</strong> when the same suitable opportunity would provide more useful information than adding demand. Repetition is not stagnation. It can help the runner understand whether a choice works across different days.</p>
<p><strong>Reduce</strong> by shortening, increasing walking, choosing an easier route, lowering effort, or using a suitable alternative when the original choice was more demanding than intended but no urgent concern exists.</p>
<p><strong>Pause</strong> when illness, concerning symptoms, marked fatigue, unsafe weather, disrupted sleep, or life commitments make running unsuitable. A pause does not need a make-up session.</p>
<p><strong>Progress</strong> only when the prior choice and later response were appropriate, the next opportunity fits current life, and no individual restriction says otherwise. Progress can be small and does not need to happen every week.</p>

<h2>Protect recovery and non-running time</h2>
<p>A restart plan should include time when running is not expected. Recovery must coexist with sleep, work, study, caregiving, meals, and ordinary life. Do not compress missed opportunities into consecutive days or remove sleep to restore a calendar total.</p>
<p>Ordinary movement, mobility work, or another activity may be appropriate on a non-running day, but cross-training is not automatically required. It can still add demand. If the break followed an injury or medical issue, only use alternatives allowed by the relevant professional guidance.</p>
<p>Do not copy another runner's rest pattern as a prescription. The useful principle is that the next session should be chosen after considering the previous response and present readiness, not because a fixed number of hours has elapsed.</p>

<h2>Adjust for Philippine weather and route conditions</h2>
<p>Check current PAGASA forecasts and applicable heat, rainfall, thunderstorm, tropical-cyclone, and flood products close to the planned activity. A weekly forecast is not clearance on the day. Local authority instructions, facility closures, flooded streets, lightning, dangerous heat, poor visibility, and transport disruptions can cancel the plan.</p>
<p>A returning runner may not currently have the same heat adaptation or route familiarity they remember. Slow down the decision before assuming old hot-weather capacity remains. Use the <a href="/blog/how-to-run-safely-during-hot-and-humid-weather">hot-and-humid weather guide</a> for heat planning and warning signs.</p>
<p>A backup can be a safer time, a sheltered suitable location, an event-permitted treadmill, a walk, or no activity. Do not run through a warning to preserve a streak or scheduled HelloRun submission.</p>

<h2>Handle missed sessions without repayment</h2>
<p>If a planned activity does not happen, delete it as debt. Identify why: schedule conflict, low energy, symptoms, weather, route access, or an unrealistic plan. Each cause suggests a different adjustment. Automatically adding the activity to tomorrow ignores the reason it was missed.</p>
<p>Do not double the next distance, combine separate sessions, remove recovery, or accelerate a progression. Resume at the next suitable decision point. If several planned opportunities are missed, reconsider the baseline and purpose rather than tightening the schedule.</p>
<p>The <a href="/blog/how-to-stay-consistent-during-a-month-long-virtual-run">month-long consistency guide</a> treats consistency as returning to a usable process, not preserving perfection. The <a href="/blog/how-to-set-a-realistic-monthly-running-goal">monthly-goal guide</a> can help reduce a target when the available month has changed.</p>

<h2>Separate a general restart from injury rehabilitation</h2>
<p>Return after injury requires information this article cannot provide: the diagnosis or working assessment, tissue involved, severity, healing, treatment, functional testing, sport demands, recurrence risk, and the individual's response. Generic milestones copied from another person can be unsafe or irrelevant.</p>
<p>Do not use absence of pain at rest as automatic permission to run. Do not use one pain scale, walking duration, hop test, or number of days as universal clearance. A qualified clinician or rehabilitation professional can define criteria for the specific situation.</p>
<p>If a previously settled problem returns, worsens, or changes ordinary movement, pause and obtain appropriate guidance. An event deadline, paid registration, leaderboard position, or planned article schedule does not alter the health decision.</p>

<h2>Three illustrative restart scenarios</h2>
<p>These examples show the decision process. They are not schedules to copy and do not prescribe distance, pace, frequency, or a medical outcome.</p>
<h3>Scenario 1: routine interrupted by deadlines</h3>
<p>Lea stopped running during six weeks of project deadlines but continued ordinary commuting on foot. Her current week has one reliable morning and one possible weekend window. She chooses a familiar flat loop and begins with a comfortable run-walk rather than her former continuous distance. Later that day and the next morning feel ordinary, so she repeats the same structure once before considering a small change. She does not add the missed six weeks to an event goal.</p>
<h3>Scenario 2: old pace feels unexpectedly demanding</h3>
<p>Anton takes the first minutes at his remembered easy pace, but conversation is difficult and the humid morning feels more demanding than expected. He slows to walking, takes the shortest safe route home, and records the mismatch without treating it as failure. The next opportunity uses a slower run-walk plan at a safer time. A comfortable repeat matters more than restoring the old watch number.</p>
<h3>Scenario 3: a health-related break needs another path</h3>
<p>Sam wants to return after an injury and has not received current return-to-running guidance. A social event invitation creates urgency, but this general plan cannot decide readiness. Sam does not use a test run or HelloRun registration as clearance and instead asks the treating professional about suitable criteria. The event remains optional.</p>

<h2>How a restart relates to HelloRun</h2>
<p>A restart plan and an event record answer different questions. The plan organizes possible activity; HelloRun records registration, evidence, review, and approved event progress.</p>
<ul>
  <li><strong>Planned:</strong> an activity opportunity exists on a personal calendar; it has no official event credit.</li>
  <li><strong>Recorded:</strong> a watch or app contains an activity; it has not necessarily been submitted or found eligible.</li>
  <li><strong>Submitted:</strong> evidence has entered the relevant HelloRun workflow.</li>
  <li><strong>Pending:</strong> review is not complete, so the activity does not yet count as approved progress.</li>
  <li><strong>Approved:</strong> evidence met applicable platform and event review requirements and can contribute according to configured rules.</li>
  <li><strong>Rejected:</strong> the current evidence does not contribute officially; read the reason and use a correction path if one is offered.</li>
</ul>
<p>Platform approval is not a health or training-readiness assessment. It does not prove that the activity was medically appropriate, that recovery is complete, or that the next run should progress. Likewise, a safe decision to stop may produce no qualifying activity and still be the right decision.</p>
<p>Review dates, accepted activities, evidence requirements, category rules, and whether distance accumulates before acting. Browse <a href="/events">Events</a> for current configurations and use the <a href="/faq">FAQ</a> for general platform workflow. Personal plans cannot extend an activity window or convert pending distance into approved credit.</p>

<h2>A copyable gradual-restart worksheet</h2>
<ul>
  <li><strong>Reason for the break:</strong> ordinary life change, health-related reason, or uncertain.</li>
  <li><strong>Guidance needed:</strong> none known, current professional instructions, or assessment required before running.</li>
  <li><strong>Movement that continued:</strong> ordinary walking, active work, another activity, or little recent activity.</li>
  <li><strong>Current ordinary function:</strong> daily walking, stairs, work, study, caregiving, sleep, and energy.</li>
  <li><strong>Restart purpose:</strong> routine, enjoyment, social connection, gradual event preparation, or exploration.</li>
  <li><strong>Old targets to release:</strong> pace, distance, frequency, streak, personal best, or event comparison.</li>
  <li><strong>First suitable opportunity:</strong> time, route, weather, support, exit option, and possible walk/run structure.</li>
  <li><strong>During-activity observations:</strong> relative effort, ordinary movement, symptoms, route, and conditions.</li>
  <li><strong>Later response:</strong> daily function, energy, and any improving, unchanged, or worsening concern.</li>
  <li><strong>Next decision:</strong> repeat, reduce, pause, seek guidance, or make one gradual change.</li>
  <li><strong>Event status:</strong> planned, recorded, submitted, pending, approved, or rejected.</li>
</ul>
<p>Keep private health notes out of public proof unless a legitimate event process specifically requires information and explains how it is protected. A runner should not need to disclose a diagnosis publicly to justify a pause.</p>

<h2>Weekly restart review questions</h2>
<ul>
  <li>Did the planned opportunities fit the week that actually occurred?</li>
  <li>Did easy activity remain appropriately easy for this runner and these conditions?</li>
  <li>Was ordinary movement later that day and the next day affected?</li>
  <li>Did any symptom, illness, weather warning, or recovery concern require a change?</li>
  <li>Did walking or run-walk provide a useful option without becoming a hidden speed session?</li>
  <li>Was sleep or another essential responsibility sacrificed?</li>
  <li>Was more than one demand increased at the same time?</li>
  <li>Would repeating the current choice teach more than progressing it?</li>
  <li>Does the event category still fit without catch-up behavior?</li>
  <li>Which part of the plan should be simpler next week?</li>
</ul>
<p>A week does not need a progression to be successful. Repeating, reducing, pausing, or deciding that running does not currently fit can all be valid outcomes.</p>

<h2>Final gradual-restart checklist</h2>
<ul>
  <li>I identified whether this is an ordinary restart or a situation requiring individual guidance.</li>
  <li>I used recent ordinary activity instead of an old personal-best day as context.</li>
  <li>I chose one current purpose without combining every distance, pace, and event goal.</li>
  <li>I released the idea that missed time or distance must be repaid.</li>
  <li>I selected a familiar route, safe time, and easy exit.</li>
  <li>I will use walking or run-walk when appropriate without treating either as failure.</li>
  <li>I did not assign a universal pace, distance, frequency, percentage, or recovery period.</li>
  <li>I will review during the activity, later that day, and the next day.</li>
  <li>I will repeat, reduce, pause, or seek help when that fits better than progressing.</li>
  <li>I checked current PAGASA and local information rather than relying on the weekly plan.</li>
  <li>I understand that HelloRun approval is not medical clearance or proof of readiness.</li>
  <li>I kept planned, recorded, submitted, pending, approved, and rejected activity separate.</li>
</ul>

<h2>Your practical next step</h2>
<p>Complete the worksheet before choosing a comeback distance. Write the reason for the break, what movement continued, current fixed commitments, any guidance needed, the first suitable route and time, and the old target you are willing to release. Then select one conditional activity opportunity with an easy way to shorten or stop.</p>
<p>Afterward, record the three checkpoints without grading yourself: what happened during the activity, how ordinary life felt later, and what changed the next day. Let those facts shape the next decision. If anything is concerning or outside an ordinary non-medical break, postpone the restart and use qualified guidance.</p>
<p>For a separate beginner progression, review the <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K guide</a>. Use it only when running is currently appropriate, and adapt or replace it when individual advice, recovery, weather, or real life requires a different path.</p>

<h2>Review note</h2>
<p>Sources, safety boundaries, and current HelloRun behavior were reviewed in August 2026. Search Console validation of the working title remains pending and is not represented as complete. Future source, platform, event, local-authority, and individual-guidance updates take precedence.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'A gradual restart in one minute',
  'How this guide was prepared',
  'Official and platform sources',
  'First decide what kind of break this was',
  'Know when a generic restart plan is not enough',
  'Release the old pace, distance, and identity',
  'Define the purpose of returning',
  'Build a current baseline from ordinary days',
  'Choose the first suitable activity opportunity',
  'Use walking and run-walk without treating them as lesser',
  'Change one planning dimension at a time',
  'Use a three-checkpoint review',
  'Decide whether to repeat, reduce, pause, or progress',
  'Adjust for Philippine weather and route conditions',
  'Handle missed sessions without repayment',
  'Separate a general restart from injury rehabilitation',
  'Three illustrative restart scenarios',
  'How a restart relates to HelloRun',
  'A copyable gradual-restart worksheet',
  'Weekly restart review questions',
  'Final gradual-restart checklist',
  'Your practical next step',
  'Review note'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/faq',
  '/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge',
  '/blog/how-to-build-a-weekly-running-schedule-around-work-or-school',
  '/blog/how-to-choose-a-safe-route-for-your-virtual-run',
  '/blog/run-walk-method-beginner-friendly-way-build-endurance',
  '/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back',
  '/blog/how-to-run-safely-during-hot-and-humid-weather',
  '/blog/how-to-stay-consistent-during-a-month-long-virtual-run',
  '/blog/how-to-set-a-realistic-monthly-running-goal',
  '/blog/beginner-5k-training-plan-new-runners'
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
  if (/<h[12]>Returning to Running After a Break/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/everyone (?:must|should) (?:start|return) with (?:a )?(?:\d+|five|ten|twenty)[ -]?(?:minute|kilometre|kilometer|km)|all runners? need exactly/i.test(text)) errors.push('article must not prescribe a universal starting amount');
  if (/(?:you )?(?:must|should) increase (?:distance|time|mileage) by (?:exactly )?10 ?%|the 10 percent rule guarantees/i.test(text)) errors.push('article must not prescribe a rigid progression formula');
  if (/(?:this|the) (?:plan|progression) guarantees? (?:a safe return|no injury|fitness|performance|event completion)|will prevent every injury/i.test(text)) errors.push('article must not guarantee restart outcomes');
  if (/(?:you )?(?:must|should) (?:double|make up) (?:the )?(?:next )?(?:run|distance|session)|remove (?:rest|sleep|recovery) to (?:catch up|make up)/i.test(text)) errors.push('article must not prescribe unsafe catch-up');
  if (/continue (?:running|the session) through (?:illness|pain|severe fatigue|unsafe weather)|ignore (?:pain|illness|warning signs)/i.test(text)) errors.push('article must not encourage unsafe continuation');
  if (/(?:walking|run-walk|rest) (?:is|means) (?:failure|weakness)|a real runner never walks/i.test(text)) errors.push('article must not shame lower-impact choices');
  if (/WHO (?:guidance|recommendations?) (?:is|are) (?:your|an) individualized (?:training|medical) plan|WHO provides medical clearance/i.test(text)) errors.push('article must not individualize population guidance');
  if (/absence of pain (?:proves|means) (?:readiness|you are ready)|one test run proves readiness/i.test(text)) errors.push('article must not diagnose readiness');
  if (/(?:planned|recorded|submitted|pending) distance (?:counts|is counted) as approved progress|pending results? (?:are|is) approved progress/i.test(text)) errors.push('article must not count unapproved distance');
  if (/platform approval (?:proves|means) (?:physical readiness|fitness|medical clearance)/i.test(text)) errors.push('article must not treat approval as physical readiness');
  if (!/reviewed in August 2026 using current World Health Organization/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/Platform approval is not a health or training-readiness assessment/i.test(text)) errors.push('article must define approval boundary');
  if (!/planned, recorded, submitted, pending, approved, and rejected/i.test(text)) errors.push('article must separate HelloRun states');
  if (!/Search Console validation of the working title remains pending/i.test(text)) errors.push('article must preserve Search Console validation status');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid gradual restart payload: ${errors.join('; ')}`);
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
