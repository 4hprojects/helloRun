'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-build-a-weekly-running-schedule-around-work-or-school';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Build a Weekly Running Schedule Around Work or School',
  excerpt: 'Build a flexible seven-day running schedule from real work, classes, commuting, caregiving, recovery, weather, and event requirements—not an ideal week.',
  category: 'Training',
  tags: Object.freeze([
    'weekly run schedule',
    'running routine',
    'work life balance',
    'student runners',
    'shift work running',
    'training calendar',
    'runner recovery',
    'virtual run planning'
  ]),
  seoTitle: 'How to Build a Weekly Running Schedule Around Work or School',
  seoDescription: 'Build a flexible weekly running schedule around work, classes, commuting, caregiving, recovery, weather, and virtual-run requirements.',
  coverImageAlt: 'Text-free indigo, jade, mustard, and off-white linocut sequence showing worker and student routines, a changed running window, a shared run, and rest'
});

const RAW_CONTENT_HTML = `
<p>A useful weekly running schedule begins with the week that actually exists. Work hours, classes, commuting, caregiving, sleep, meals, household tasks, route access, weather, and recovery take space before running enters the calendar. Ignoring those facts may produce a neat plan, but it does not produce usable time.</p>
<p>The purpose of a weekly schedule is not to force every planned run to happen. It is to make suitable opportunities visible, protect the commitments that cannot move, identify safe backups, and give the runner a calm way to revise the week when reality changes. A missed window should trigger a decision, not punishment.</p>
<blockquote><strong>The weekly-planning principle:</strong> schedule opportunities with alternatives, not promises without conditions. Running should fit around a sustainable life rather than requiring work, study, caregiving, sleep, recovery, or safety to disappear.</blockquote>

<h2>A flexible weekly schedule in one minute</h2>
<ol>
  <li><strong>Mark fixed commitments first.</strong> Add work, classes, commute, caregiving, essential appointments, and sleep before searching for running time.</li>
  <li><strong>Count the whole activity window.</strong> Include changing, travel, route access, warm-up, the activity, a gradual finish, food, washing, and the return to the next responsibility.</li>
  <li><strong>Choose the week's purpose.</strong> Decide whether the week supports ordinary consistency, one event activity, accumulated progress, a beginner plan, or recovery—not every goal at once.</li>
  <li><strong>Classify available time.</strong> Label windows fixed, flexible, backup, or unavailable instead of treating every blank square as equal.</li>
  <li><strong>Choose anchor opportunities.</strong> Protect the most practical windows without assuming they must proceed under illness, fatigue, unsafe weather, or disrupted life.</li>
  <li><strong>Create Plan B.</strong> Identify a safer time, shorter appropriate activity, permitted run-walk option, suitable route, or allowed indoor alternative.</li>
  <li><strong>Define a minimum-viable week.</strong> Decide what preserves the routine when the original week collapses, including rest or rescheduling when that is the responsible outcome.</li>
  <li><strong>Review once, then rebuild.</strong> Compare the plan with actual activity and HelloRun status before making the next seven-day plan.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in August 2026 using current World Health Organization population physical-activity guidance, US Centers for Disease Control and Prevention material on barriers and relative intensity, the UK National Health Service Couch to 5K programme as one example that includes rest between sessions, and Philippine Atmospheric, Geophysical and Astronomical Services Administration weather products.</p>
<p>It was also checked against current HelloRun event dates, registration choices, recorded evidence, standard and accumulated submissions, review statuses, approved progress, leaderboards, and recognition behavior. Platform examples explain how a planned week relates to event records; they do not turn a general schedule into individualized coaching.</p>
<p>This article is general educational information, not medical clearance, a diagnosis, a rehabilitation plan, or a universal training prescription. Disability, pregnancy or postpartum status, chronic conditions, medicines, recent illness, pain, shift work, sleep disruption, caring responsibilities, and individual professional advice can change what is appropriate. Qualified personal guidance and local emergency instructions take precedence.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.who.int/publications/i/item/9789240015128">World Health Organization: Guidelines on physical activity and sedentary behaviour</a>, used as population-level context rather than a personal running plan.</li>
  <li><a href="https://www.cdc.gov/physical-activity-basics/overcoming-barriers/index.html">CDC: Overcoming Barriers to Physical Activity</a>, used for scheduling, access, energy, support, and weather-backup context.</li>
  <li><a href="https://www.cdc.gov/physical-activity-basics/measuring/index.html">CDC: Measuring Physical Activity Intensity</a>, used for relative-intensity and talk-test context.</li>
  <li><a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/">NHS: Couch to 5K running plan</a>, used only as an example of a structured beginner programme that includes rest days.</li>
  <li><a href="https://www.pagasa.dost.gov.ph/products-and-services">PAGASA: Products and Services</a> and its current regional warnings, forecasts, heat information, and advisories, used for Philippine weather-planning context.</li>
</ul>
<p>Current event configuration and published HelloRun policies control platform behavior. Current local advisories, access restrictions, and qualified individual guidance control real-world decisions. Later documented changes take precedence over examples in this guide.</p>

<h2>Keep the weekly layer distinct</h2>
<p>A monthly goal answers what the runner hopes to build or complete over a broader period. A training progression explains how sessions may change across several weeks. The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">run-walk method guide</a> explains the structure of one activity. This article addresses the layer between them: where suitable opportunities can live inside the next seven days.</p>
<p>The <a href="/blog/how-to-set-a-realistic-monthly-running-goal">monthly-goal worksheet</a> can define the larger purpose, while the <a href="/blog/how-to-stay-consistent-during-a-month-long-virtual-run">month-long consistency guide</a> explains how to resume across a longer challenge. The weekly schedule should translate those intentions into a small number of conditional decisions without recreating an entire training programme.</p>
<p>Do not use one unusually free week as the template for every week. Exam periods, project deadlines, payroll cycles, travel, changing shifts, family needs, and weather can create different weekly shapes. Rebuild from current facts.</p>

<h2>Start with fixed commitments</h2>
<p>Write the commitments that cannot reasonably move: scheduled work or classes, commuting, caregiving handovers, essential appointments, regular meals, required study or preparation, and a realistic sleep opportunity. Include weekend duties rather than treating Saturday and Sunday as automatically free.</p>
<p>Be specific about location. A one-hour break on campus may not provide access to a safe route, a place to change, or enough time to return. An hour after work may be consumed by transport. Remote work removes one commute but may add care, household, or screen demands.</p>
<p>Do not describe essential responsibilities as excuses. The schedule exists to support the person using it. If running repeatedly conflicts with responsibilities that matter, the appropriate response is to move, shorten, replace, or defer the running plan—not to label the person uncommitted.</p>

<h2>Count the whole opportunity</h2>
<p>A 30-minute run rarely occupies only 30 minutes. The complete window may include changing clothes, reaching the route, waiting for safe daylight or transport, warming up gradually, completing the activity, returning toward ordinary comfort, eating, washing, reviewing evidence, and arriving at the next task.</p>
<p>Estimate those transitions honestly. If a class ends at 17:00 and the suitable route is 25 minutes away, a 17:05 run is fictional. If an office requires a long commute, the runner may have more control near work before travelling or at home on another day.</p>
<p>Add a small logistical buffer where possible. The buffer is not permission to extend the workout; it absorbs a late meeting, transport delay, crowded changing area, device start-up, or ordinary transition. When there is no buffer, treat the window as fragile.</p>

<h2>Classify time instead of filling every gap</h2>
<p>Use four labels for the next seven days:</p>
<ul>
  <li><strong>Fixed opportunity:</strong> a time and place that are usually stable enough to protect, while still conditional on safety and readiness.</li>
  <li><strong>Flexible opportunity:</strong> a suitable window that can move within the day or between nearby days.</li>
  <li><strong>Backup opportunity:</strong> an alternative used only if the primary plan changes and the alternative remains appropriate and event-eligible.</li>
  <li><strong>Unavailable:</strong> a period reserved for work, school, care, sleep, recovery, unsafe conditions, or another priority.</li>
</ul>
<p>Unavailable time is a successful planning result. It prevents a blank-looking calendar from creating a false obligation. A busy day does not need a token run squeezed between incompatible tasks.</p>

<h2>Choose one purpose for the week</h2>
<p>Name the primary purpose in plain language. It might be returning to an ordinary routine, completing one suitable activity, continuing a beginner progression, adding approved distance to an accumulated event, practising a comfortable run-walk pattern, or protecting recovery during a demanding week.</p>
<p>One week can contain several kinds of movement, but it does not need to maximize distance, speed, frequency, event progress, and strength simultaneously. A crowded purpose makes every session feel incomplete.</p>
<p>Check the relevant event mechanics before assigning event work. Use <a href="/events">Events</a> for current dates and formats, the <a href="/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge">distance-choice guide</a> for commitment fit, and the <a href="/faq">FAQ</a> for the wider HelloRun journey. A personal schedule cannot extend an activity window or change an accepted activity type.</p>

<h2>Begin from recent ordinary activity</h2>
<p>Review the last two to four ordinary weeks rather than a personal-best day or an old period with different responsibilities. Note how often the runner moved, the kinds of activity, ordinary duration, route and conditions, and whether later work, study, sleep, or daily movement was affected.</p>
<p>If recent activity has been inconsistent, the weekly plan should not assume that enthusiasm creates immediate capacity for a large schedule. Start with opportunities that reflect what has recently been manageable. The <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K guide</a> provides a separate flexible progression for new runners; this weekly framework should not replace its session guidance.</p>
<p>Recent ordinary activity is planning evidence, not a medical assessment. A runner returning after illness, injury, pregnancy, or a long break may need individualized advice even when the calendar appears open.</p>

<h2>Describe sessions by purpose, not ego</h2>
<p>Use labels that help a decision: easy run or walk, run-walk practice, longer familiar activity, more demanding planned session, route check, or rest. Avoid labels such as “must crush 10K” that make adjustment feel like failure.</p>
<p>CDC's talk test is a simple relative-intensity reference: moderate activity generally permits conversation but not singing, while vigorous activity allows only a few words before pausing. Individual responses differ, and the talk test is not medical clearance. It can help a runner notice when an intended ordinary session has become more demanding than planned.</p>
<p>Do not assign a universal pace or weekly distance. Heat, hills, surface, sleep, stress, recent activity, and health context affect effort. The schedule should leave room to slow, shorten, walk, replace, postpone, or stop.</p>

<h2>Use anchor opportunities carefully</h2>
<p>An anchor opportunity is the most practical window for the week's main purpose. It is protected from avoidable scheduling conflicts but remains conditional. A Sunday morning slot can be an anchor without becoming an order to run through fever, pain, a typhoon warning, or a night without sleep.</p>
<p>Choose anchors where preparation, route access, light, transport, and recovery are reasonably predictable. A worker might choose a day without an early meeting. A student might choose a gap after the last class rather than before an examination. A shift worker may avoid treating a post-night-shift morning as automatically available.</p>
<p>Protecting an anchor means preparing ordinary equipment and reducing avoidable friction. It does not mean rejecting all social, family, or academic changes. When a higher priority appears, use the alternative plan.</p>

<h2>Add flexible and backup opportunities</h2>
<p>A flexible opportunity can move without breaking the week. For example, an easy activity might fit Tuesday or Wednesday depending on assignments and rain. The schedule should identify the decision point: “Choose Tuesday if the route and recovery are suitable; otherwise reconsider Wednesday.”</p>
<p>A backup must be a genuine alternative, not the primary activity added on top. It might be a different safe time, a shorter appropriate activity, a permitted run-walk session, an allowed treadmill, or a non-event process task such as preparing equipment. Confirm event acceptance before submitting an alternative.</p>
<p>Do not create so many backups that every day becomes obligated. One or two meaningful alternatives are easier to evaluate than seven potential make-up sessions.</p>

<h2>Create Plan A, Plan B, and a minimum-viable week</h2>
<h3>Plan A: the ordinary week</h3>
<p>Plan A uses the best current information: real commitments, recent activity, suitable routes, current event requirements, and ordinary recovery. It contains the intended anchor and any limited supporting opportunities.</p>
<h3>Plan B: one major disruption</h3>
<p>Plan B assumes the most likely disruption happens: a late meeting, changed class, rain, transport delay, caregiving need, or unavailable route. It replaces or moves the affected opportunity instead of stacking both versions into the remaining days.</p>
<h3>Minimum-viable week: protect resumability</h3>
<p>The minimum-viable week answers, “What keeps the routine understandable if most planned running cannot happen?” It might include one suitable easy activity, a permitted short run-walk, a route or equipment check, or deliberate rest followed by a fresh plan. The minimum action may support the routine without qualifying for event progress.</p>
<p>These three versions are decision tools, not tiers of moral success. Sometimes the minimum-viable week is the correct plan from Monday because work, exams, illness, weather, or recovery already demand it.</p>

<h2>Protect recovery, sleep, and ordinary life</h2>
<p>Place recovery in the plan rather than hoping it appears in the unused spaces. Consider how a session affects the next workday, class, commute, care task, and ordinary movement. A late run that repeatedly removes sleep may be less usable than an earlier shorter opportunity or a different day.</p>
<p>NHS Couch to 5K places rest days between its three weekly sessions. That is one programme's structure, not a rule that every runner must copy. The transferable lesson is that an organized plan can deliberately include non-running time.</p>
<p>The <a href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back">post-run recovery guide</a> explains next-day readiness and warning boundaries. Do not remove recovery or sleep to compensate for a missed activity. Do not treat rest as an empty calendar cell available for debt collection.</p>

<h2>Plan around office and commute demands</h2>
<p>Identify recurring meeting-heavy days, on-site requirements, commute peaks, and the facilities genuinely available near work. A lunch break may support a walk but not changing, running, cooling down, and returning professionally ready. An after-work route may be suitable only before darkness or only when transport remains available.</p>
<p>Consider whether one home-based day creates a practical window, but do not assume remote work means free time. Put the activity outside committed work hours and preserve breaks required for food and ordinary responsibilities.</p>
<p>When a deadline week removes the normal anchor, downgrade the purpose rather than compressing the same workload into fewer days. The next suitable week can be rebuilt without punishment.</p>

<h2>Plan around classes, assignments, and exams</h2>
<p>A student schedule can have visible gaps that are not usable. Travel between buildings, laboratory preparation, group work, study, meals, campus access rules, and the need to carry books or equipment all affect a running opportunity.</p>
<p>Mark assessment periods early. A week with several exams or submissions may use a minimum-viable plan from the start. Avoid assuming that running late at night after study is automatically suitable; route safety, transport, fatigue, and the next morning's responsibilities matter.</p>
<p>Students under 18 should use age-appropriate guidance and relevant adult supervision rather than treating this adult-oriented article as a personal training plan. School rules and safeguarding requirements also take precedence.</p>

<h2>Plan around shifts and caregiving</h2>
<p>Shift work changes the meaning of morning and evening. Use the person's actual sleep-wake period rather than a conventional clock label. A daylight hour after a night shift may still be recovery time, and an upcoming schedule change can make a previously stable anchor unreliable.</p>
<p>Caregiving can change with little notice. Build a plan that does not depend on another person absorbing every disruption. Identify whether a safe activity can happen only when cover is confirmed, and allow the plan to end without blame when care takes priority.</p>
<p>Do not treat severe fatigue as a motivation problem. Shorten, replace, postpone, or omit the activity based on the real situation and any individual guidance. A running calendar is never authority to drive, commute, or exercise while dangerously impaired.</p>

<h2>Use current Philippine weather information</h2>
<p>Check current PAGASA forecasts, heat information, rainfall warnings, thunderstorm advisories, and regional products close to the planned activity. A forecast viewed when the week was written is not clearance several days later. Conditions and warnings can change quickly.</p>
<p>PAGASA's products include public forecasts, tropical-cyclone warnings, rainfall warnings, thunderstorm alerts, flood advisories, and heat information. Follow current local authority instructions and use the newest applicable information. A planned event result does not justify entering a flooded route, exposed area during lightning, dangerous heat, or another warned condition.</p>
<p>Use the <a href="/blog/how-to-run-safely-during-hot-and-humid-weather">hot-and-humid weather guide</a> and <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe-route guide</a> for specialist decisions. The backup may be a safer time, appropriate route, allowed indoor activity, or no run.</p>

<h2>Respond to illness, pain, and excessive fatigue</h2>
<p>A general weekly worksheet cannot determine the cause or seriousness of a symptom. New, severe, worsening, or concerning symptoms; illness; disrupted ordinary movement; or excessive fatigue are reasons to change the plan and seek appropriate help when needed.</p>
<p>Do not “test” readiness by forcing the hardest planned session. Do not continue to protect a streak, deadline, or leaderboard. Use individual professional instructions over a generic schedule.</p>
<p>When the situation resolves, rebuild from current capacity and the remaining safe event window. Do not assume the missed workload should be restored in full.</p>

<h2>What to do when a session is missed</h2>
<ol>
  <li><strong>Name the cause without judgment.</strong> Work, class, care, weather, route access, fatigue, illness, and unrealistic timing require different changes.</li>
  <li><strong>Delete the missed version.</strong> Do not leave it as invisible debt.</li>
  <li><strong>Check the next commitments and recovery.</strong> Confirm whether a backup genuinely fits.</li>
  <li><strong>Use the backup only if appropriate.</strong> Replace rather than automatically add.</li>
  <li><strong>Reduce the week's purpose when needed.</strong> Preserve resumability instead of chasing the original volume.</li>
  <li><strong>Recheck event feasibility.</strong> A lower goal, later event, or incomplete target can be the responsible result.</li>
</ol>
<p>Never double the next run, remove sleep, combine demanding sessions, or enter unsafe conditions merely to make the calendar total look correct.</p>

<h2>Separate the schedule from HelloRun status</h2>
<p>A runner may plan an activity, record it in an app, submit evidence, wait for review, receive approval, or receive a rejection that needs correction. Those are different states.</p>
<ul>
  <li><strong>Planned:</strong> an opportunity on the personal calendar; it has no event credit.</li>
  <li><strong>Recorded:</strong> an activity exists in an app or device; it has not necessarily been submitted or found eligible.</li>
  <li><strong>Submitted or pending:</strong> HelloRun has a reviewable record, but it does not yet count as approved progress.</li>
  <li><strong>Approved:</strong> the evidence met the applicable platform and event review requirements and may affect configured progress, standings, or recognition.</li>
  <li><strong>Rejected:</strong> the current record contributes no approved credit; read the reason and use an available correction path when permitted.</li>
</ul>
<p>Platform approval is not a health or training-readiness assessment. Do not schedule extra activity merely because evidence approval was delayed, and do not assume a recorded monthly total equals official HelloRun progress.</p>

<h2>Three illustrative weekly schedules</h2>
<p>These examples demonstrate decisions, not prescriptions. None specifies a universal distance, pace, frequency, or rest pattern.</p>
<h3>Office commuter with a late meeting</h3>
<p>Rafi marks Monday and Thursday as long on-site days with heavy commuting. Wednesday after work is the most practical anchor, with Saturday morning as a flexible opportunity. Plan B moves Wednesday's easy activity to Saturday if the meeting extends; it does not keep both. Friday remains unavailable for sleep and family commitments. When thunderstorms affect Saturday, Rafi uses no event activity and rebuilds the next week.</p>
<h3>Student with changing classes</h3>
<p>Bea has a stable Tuesday afternoon gap near a safe campus loop, but Thursday group work changes weekly. Tuesday becomes the anchor for a comfortable run-walk session based on her separate beginner plan. Thursday is flexible, not promised. During examination week, her minimum-viable plan is one suitable walk-run opportunity or rest, plus preparing the next week's route and equipment.</p>
<h3>Shift worker with caregiving duties</h3>
<p>Noel's shifts rotate, so he plans from actual sleep blocks each Sunday rather than copying Monday-to-Friday labels. One post-rest-day window becomes an anchor only after caregiving cover is confirmed. A second window is a backup. When a night shift changes and fatigue is marked, Noel removes both rather than moving them into consecutive days. The event target remains optional.</p>

<h2>Seven-day planning worksheet</h2>
<p>For each day, record:</p>
<ul>
  <li><strong>Fixed commitments:</strong> work, classes, commute, caregiving, appointments, meals, study, and sleep opportunity.</li>
  <li><strong>Location and access:</strong> where the runner will be, route access, changing, transport, light, and safety.</li>
  <li><strong>Recovery context:</strong> recent activity, ordinary movement, fatigue, illness, and individual instructions.</li>
  <li><strong>Weather decision point:</strong> when current PAGASA and local information will be checked.</li>
  <li><strong>Window type:</strong> fixed opportunity, flexible opportunity, backup, or unavailable.</li>
  <li><strong>Session purpose:</strong> easy activity, run-walk, plan-directed session, event activity, route check, or rest.</li>
  <li><strong>Whole-window duration:</strong> preparation through return to the next responsibility, not exercise time alone.</li>
  <li><strong>Alternative:</strong> replace, shorten appropriately, move, use an eligible alternative, or omit.</li>
  <li><strong>HelloRun relevance:</strong> personal activity only or potentially eligible evidence under the current event rule.</li>
</ul>
<p>Keep the worksheet private and proportionate. It does not need detailed health, location, employer, school, or family information. Record only what helps the planning decision.</p>

<h2>Weekly review questions</h2>
<ul>
  <li>Which opportunities were genuinely available?</li>
  <li>Which transition or buffer was underestimated?</li>
  <li>Did the week's purpose remain appropriate?</li>
  <li>Did an ordinary session become more demanding than intended?</li>
  <li>Were work, class, care, meals, sleep, and recovery protected?</li>
  <li>Which backup replaced a primary plan, and did any backup accidentally become extra workload?</li>
  <li>What did current weather or route access change?</li>
  <li>What is recorded, submitted, pending, approved, or rejected on HelloRun?</li>
  <li>What one change would make the next week more realistic?</li>
</ul>
<p>Review the system rather than grading personal worth. A week with less running can still reveal the correct anchor, a necessary buffer, or an unsuitable event commitment.</p>

<h2>Final weekly schedule checklist</h2>
<ul>
  <li>The plan starts with real commitments and a realistic sleep opportunity.</li>
  <li>Every activity window includes preparation, route access, recovery transition, and the next responsibility.</li>
  <li>Fixed, flexible, backup, and unavailable times are distinguishable.</li>
  <li>The week has one clear purpose rather than several competing targets.</li>
  <li>Anchor opportunities remain conditional on readiness, weather, route, and life changes.</li>
  <li>Plan B replaces disrupted activity rather than adding automatic workload.</li>
  <li>The minimum-viable week can include rest or no event progress.</li>
  <li>No missed session creates doubling, removed recovery, or lost sleep.</li>
  <li>Current PAGASA and local conditions are checked near activity time.</li>
  <li>Planned, recorded, submitted, pending, approved, and rejected states remain separate.</li>
</ul>

<h2>Practical next step</h2>
<p>Take one blank seven-day view and add fixed commitments, sleep opportunities, and travel before adding running. Mark every remaining window as fixed, flexible, backup, or unavailable. Choose one weekly purpose, one anchor opportunity, and no more than two meaningful alternatives. Then write the condition that would cancel or replace each activity.</p>
<p>At the end of the week, complete the review once. Keep the useful structure, remove fictional availability, and rebuild the next seven days from current facts. A practical weekly schedule is not one that survives unchanged. It is one that changes without turning disruption into unsafe debt.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'A flexible weekly schedule in one minute',
  'How this guide was prepared',
  'Official and platform sources',
  'Keep the weekly layer distinct',
  'Start with fixed commitments',
  'Classify time instead of filling every gap',
  'Choose one purpose for the week',
  'Use anchor opportunities carefully',
  'Create Plan A, Plan B, and a minimum-viable week',
  'Protect recovery, sleep, and ordinary life',
  'Use current Philippine weather information',
  'Separate the schedule from HelloRun status',
  'Three illustrative weekly schedules',
  'Seven-day planning worksheet',
  'Weekly review questions',
  'Final weekly schedule checklist',
  'Practical next step'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/faq',
  '/blog/how-to-set-a-realistic-monthly-running-goal',
  '/blog/how-to-stay-consistent-during-a-month-long-virtual-run',
  '/blog/run-walk-method-beginner-friendly-way-build-endurance',
  '/blog/beginner-5k-training-plan-new-runners',
  '/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back',
  '/blog/how-to-choose-a-safe-route-for-your-virtual-run',
  '/blog/how-to-run-safely-during-hot-and-humid-weather',
  '/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge'
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
  if (/<h[12]>How to Build a Weekly Running Schedule Around Work or School/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/everyone (?:must|should) run exactly \d+ times? (?:a|per) week|all runners? need \d+ weekly runs?/i.test(text)) errors.push('article must not prescribe universal weekly frequency');
  if (/(?:this|the) schedule guarantees? (?:fitness|performance|weight loss|consistency|event completion)|will guarantee event completion/i.test(text)) errors.push('article must not guarantee schedule outcomes');
  if (/(?:must|should) double (?:the )?(?:next )?(?:run|session)|remove (?:sleep|recovery) to (?:catch up|make up)/i.test(text)) errors.push('article must not prescribe unsafe catch-up');
  if (/continue (?:running|the session) through (?:illness|pain|severe fatigue|unsafe weather)|ignore (?:illness|pain|fatigue) and continue/i.test(text)) errors.push('article must not encourage unsafe continuation');
  if (/(?:work|school|caregiving|disability|schedule disruption) (?:is|shows|means) (?:an excuse|a lack of commitment)/i.test(text)) errors.push('article must not shame real-life constraints');
  if (/WHO (?:guidance|recommendations?) (?:is|are) (?:your|an) individualized training plan|WHO provides medical clearance/i.test(text)) errors.push('article must not individualize population guidance');
  if (/(?:planned|recorded|submitted|pending) distance (?:counts|is counted) as approved progress|pending results? (?:are|is) approved progress/i.test(text)) errors.push('article must not count unapproved distance');
  if (/platform approval (?:proves|means) (?:physical readiness|fitness|medical clearance)/i.test(text)) errors.push('article must not treat approval as physical readiness');
  if (!/reviewed in August 2026 using current World Health Organization/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/Platform approval is not a health or training-readiness assessment/i.test(text)) errors.push('article must define approval boundary');
  if (!/planned, recorded, submitted, pending, approved, and rejected/i.test(text)) errors.push('article must separate HelloRun states');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid weekly running schedule payload: ${errors.join('; ')}`);
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
