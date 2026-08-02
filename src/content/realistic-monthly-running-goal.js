'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-set-a-realistic-monthly-running-goal';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Set a Realistic Monthly Running Goal',
  excerpt: 'Set a useful monthly running goal by reviewing your recent activity, real calendar, recovery, event format, and approved progress instead of choosing an arbitrary distance.',
  category: 'Motivation',
  tags: Object.freeze([
    'monthly running goal',
    'running motivation',
    'goal setting',
    'virtual run',
    'distance challenge',
    'running routine',
    'progress tracking',
    'runner planning'
  ]),
  seoTitle: 'How to Set a Realistic Monthly Running Goal | HelloRun',
  seoDescription: 'Build a realistic monthly running goal from your recent activity, available days, recovery, event rules, and approved progress—with a practical worksheet.',
  coverImageAlt: 'Runner reviewing a monthly calendar with flexible running opportunities, recovery days, and distance progress beside ordinary running shoes'
});

const RAW_CONTENT_HTML = `
<p>A monthly running goal can provide direction without deciding every day in advance. The useful goal is not necessarily the largest number that fits on a calendar. It is a commitment that reflects the activity you have recently repeated, the time and recovery you can genuinely support, the event format you have chosen, and the disruptions that ordinary life may bring.</p>
<p>An arbitrary target can create two unhelpful outcomes. It may be so demanding that every missed activity feels like an emergency, or so disconnected from your purpose that reaching it means little. A realistic goal gives you a reason to act, enough flexibility to adjust, and a clear way to distinguish personal tracking from official event progress.</p>
<blockquote><strong>The goal-setting principle:</strong> choose a target from evidence about your present month, not pressure from another runner, your best-ever week, or a perfect calendar that does not exist.</blockquote>

<h2>Set a monthly running goal in one minute</h2>
<ol>
  <li><strong>Name the purpose.</strong> Decide whether the month is about rebuilding a routine, completing one event, accumulating eligible distance, or preparing for a later goal.</li>
  <li><strong>Review ordinary recent weeks.</strong> Use repeatable activity, not one unusually long or fast day, as your starting information.</li>
  <li><strong>Count usable opportunities.</strong> Include work, care, travel, recovery, weather, route access, and event dates before assigning activity.</li>
  <li><strong>Read the event rules.</strong> Confirm whether distance must be continuous or accumulated and which activities and evidence are accepted.</li>
  <li><strong>Choose three levels.</strong> Define a minimum success, a working range, and an optional stretch goal that never becomes a debt.</li>
  <li><strong>Keep effort adaptable.</strong> Use current conditions and relative effort instead of forcing a fixed pace through fatigue, hills, heat, or humidity.</li>
  <li><strong>Review weekly.</strong> Compare the plan with completed activity and, for HelloRun events, separately review submitted, pending, approved, and rejected evidence.</li>
  <li><strong>Change the goal when the facts change.</strong> Rest, reschedule, lower the target, or withdraw when health, safety, recovery, or life requires it.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in August 2026 using current public guidance from the World Health Organization and the US Centers for Disease Control and Prevention, together with documented HelloRun event, registration, accumulated-progress, evidence-review, and leaderboard behavior. It is general education and an editorial planning framework, not individualized coaching, medical advice, a diagnosis, or a prediction of what any runner can safely complete.</p>
<p>WHO states that some physical activity is better than none and advises people who are inactive to begin with small amounts and gradually increase frequency, intensity, and duration. Its population recommendations describe activity associated with health benefits; they are not race-readiness tests and do not prescribe a personal monthly distance. CDC describes relative intensity and the talk test as practical ways to understand how hard activity feels. Neither source supplies a universal formula for converting last month into a safe target for every person.</p>
<p>Health, disability, pregnancy, recent illness, previous injury, medicines, age, access, and individual circumstances can change what guidance is appropriate. Current local conditions, event instructions, relevant authorities, and appropriately qualified personal guidance remain authoritative. Stop or seek suitable help for severe, unexplained, worsening, or otherwise concerning symptoms rather than using a calendar target as clearance to continue.</p>

<h2>What makes a monthly goal realistic</h2>
<p>A realistic goal is specific enough to guide choices but flexible enough to survive an imperfect month. It connects an outcome—such as completing one eligible 5K or reaching an approved accumulated total—to a process you can influence, such as protecting two suitable activity opportunities each week and reviewing evidence before the deadline.</p>
<p>Realistic does not mean effortless. A goal may still require preparation, patience, and decisions that feel inconvenient. It means the goal has been tested against your current activity, recovery, schedule, route, weather, equipment, event rules, and responsibilities. It leaves space for a changed day without automatically demanding punishment or unsafe catch-up activity.</p>
<p>The goal also needs a clear boundary. “Run more” is difficult to review. “Protect two comfortable activity opportunities most weeks and complete one event-eligible 5K before the final weekend” explains both the routine and the outcome. The exact wording should match your purpose rather than copying someone else's number.</p>

<h2>Start with ordinary recent weeks, not your best day</h2>
<p>Look back over several recent ordinary weeks. Record how often you walked, ran, or used another relevant activity; the approximate time or distance; the effort; and how you felt later that day and the next day. The aim is not to award yourself a readiness score. It is to identify what you have actually repeated while work, sleep, family, transport, and weather were present.</p>
<p>A personal-best run, a holiday week, or one long outing can be meaningful, but it may not describe a sustainable base. Completing 10K once does not prove that four 10K runs will fit next month. Similarly, a quiet recent week does not erase earlier experience; it simply means your current starting point deserves a fresh look.</p>
<p>Use records carefully. A watch or app can help summarize dates, duration, and distance, but device estimates are not perfect and a monthly dashboard may combine walking, running, paused time, private activities, or dates outside an event. Notes about comfort, recovery, route, and circumstances add context that a total alone cannot provide.</p>
<h3>Questions for the recent-week review</h3>
<ul>
  <li>Which activities did I repeat without needing to rescue the next week?</li>
  <li>What was an ordinary comfortable duration or distance, rather than the maximum?</li>
  <li>Did work, care, travel, sleep, pain, illness, or weather regularly change the plan?</li>
  <li>How many recovery days or easier days did the pattern naturally require?</li>
  <li>Was the activity recorded for personal use, and would it qualify under the event I am considering?</li>
  <li>Am I returning after a break and therefore better served by rebuilding before expanding?</li>
</ul>
<p>If there is little recent activity, begin from that fact without shame. WHO's start-small principle supports gradual participation, but it does not establish a required first distance. A process goal based on suitable opportunities may be more useful than a large monthly total.</p>

<h2>Choose the purpose before the number</h2>
<p>The same distance can represent different goals. A runner might want to rebuild a routine, finish a first event, support a community fundraiser, prepare for an onsite race, or complete an accumulated virtual challenge. Each purpose changes what should be measured and which trade-offs matter.</p>
<h3>Consistency or routine</h3>
<p>A consistency goal emphasizes suitable opportunities and returning after interruption. It might track the number of weeks in which planned activity and recovery both happened. It should not automatically become a daily running streak. Read <a href="/blog/how-to-stay-consistent-during-a-month-long-virtual-run">the month-long consistency guide</a> for scheduling, backup, recovery, and missed-session strategies.</p>
<h3>One event completion</h3>
<p>A completion goal emphasizes one eligible activity during the event window. Preparation sessions support it but do not necessarily count as event results. Match the event to your current base and calendar with <a href="/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge">the distance-choice guide</a>.</p>
<h3>Accumulated distance</h3>
<p>An accumulated goal combines separate eligible activities within a defined window. It can offer scheduling flexibility, but the total workload, minimum activity, submission limits, evidence, recovery, and deadline still matter. Review <a href="/blog/how-accumulated-distance-challenges-work">how accumulated-distance challenges work</a> before treating an app's monthly number as official progress.</p>
<h3>Preparation for a later event</h3>
<p>A preparation goal should follow a suitable progression rather than turning every training activity into a performance test. This guide does not produce an individualized programme. New runners considering a 5K can review the flexible <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K framework</a> and seek qualified guidance when appropriate.</p>

<h2>Count the opportunities your real calendar provides</h2>
<p>Open the actual month. Mark travel, examinations, work deadlines, caregiving, religious observance, celebrations, appointments, expected high-demand days, and event boundaries. Add the time needed to reach a route, change, warm up, cool down, review evidence, eat, sleep, and recover. A 30-minute activity rarely consumes only 30 minutes of life.</p>
<p>Next, identify suitable primary opportunities rather than promises. “Tuesday before work if rested and conditions are suitable” is more useful than “must run Tuesday.” Add a backup opportunity or permitted alternative where possible. A backup is not extra workload; it protects the plan when the first option becomes unsuitable.</p>
<p>Do not fill every free-looking square. Some apparently open days need to absorb delayed work, family needs, weather, or recovery. A plan with no spare capacity can become unrealistic after one disruption. If the target works only when every opportunity succeeds, change the target or extend the timeline before committing.</p>
<h3>Calendar questions</h3>
<ul>
  <li>How many suitable activity opportunities are genuinely available?</li>
  <li>Which opportunities have safe routes, daylight, transport, or an allowed indoor option?</li>
  <li>Where will recovery fit if an activity feels harder than expected?</li>
  <li>Which days already carry substantial physical or mental demand?</li>
  <li>What will happen if rain, heat, poor visibility, illness, or urgent work removes one opportunity?</li>
  <li>Does the event deadline leave time to correct rejected evidence?</li>
</ul>

<h2>Understand the event before setting the total</h2>
<p>Browse current <a href="/events">HelloRun events</a> and read the full event page before selecting a goal. Confirm the activity start and end, final submission boundary, timezone, category, distance, whether accumulation is enabled, minimum activity, accepted activity types, evidence path, review process, leaderboard basis, and recognition settings.</p>
<p>A 25K accumulated challenge is not the same task as one continuous 25K activity. A virtual 5K is not automatically identical to an onsite 5K with a fixed course, start time, cut-off, and support. Walking, treadmill activity, or a particular app may be allowed in one event and excluded in another. Never build the month on an assumed rule.</p>
<p>Registration also matters. Official accumulated progress belongs to the relevant event registration. Activity completed before the event window, after its boundary, or outside the accepted rules may remain meaningful personal activity without becoming eligible event progress.</p>

<h2>Use minimum, working, and stretch levels</h2>
<p>A single all-or-nothing number can make a useful month look like failure. Three levels provide direction while preserving honest adjustment. These levels are personal planning labels; they do not change an event category, payment, deadline, or recognition rule.</p>
<h3>Minimum success</h3>
<p>Define the smallest outcome that still serves the month's purpose. It might be protecting a suitable weekly routine, completing a selected event category, or submitting eligible evidence early enough for review. The minimum should not be deliberately trivial, but it should remain meaningful when the month contains ordinary disruption.</p>
<h3>Working range</h3>
<p>Choose a range that reflects your ordinary recent activity and usable calendar. A range acknowledges that weather, route, effort, and recovery change. For an event with one fixed category, the event result remains fixed; the range can instead describe preparation opportunities or personal activity around it.</p>
<h3>Optional stretch</h3>
<p>A stretch goal is considered only when the minimum and working plan are proceeding comfortably, recovery remains appropriate, conditions are suitable, and the event rules permit the activity. It is not distance owed to the calendar. Missing it does not justify doubling, removing recovery, or continuing through unsafe conditions.</p>
<p>Avoid rigid percentage rules or formulas presented as universal safety limits. A calculation can divide an already chosen accumulated target across usable opportunities, but arithmetic cannot decide whether that target is individually suitable. Use the result as a feasibility check, not a prescription.</p>

<h2>Use effort as context, not a command</h2>
<p>Distance alone does not describe workload. Heat, humidity, hills, surface, sleep, stress, pace, walking breaks, and time on feet can change how an activity feels. A monthly goal that requires every session to be hard is a signal to reconsider its number, purpose, or timeline.</p>
<p>CDC's talk test is one accessible indicator of relative intensity: during moderate activity, a person can generally talk but not sing. It does not diagnose fitness or make a route safe, but it can help a runner notice when an intended comfortable activity has become harder than planned. Slow down, walk, stop, or reschedule as appropriate rather than forcing a usual pace.</p>
<p>Do not compare effort only through public pace. Two runners covering the same distance on different routes, in different conditions, with different bodies and responsibilities are not completing identical tasks. Your realistic target should not require proving commitment through another person's speed.</p>

<h2>Separate personal activity from HelloRun event progress</h2>
<p>Personal records and official event records answer different questions. Your app may show everything recorded during the month. HelloRun evaluates evidence against a particular registration and event configuration. Keep the following states distinct:</p>
<ul>
  <li><strong>Recorded:</strong> an activity exists on a phone, watch, treadmill, app, or personal log. Recording alone does not make it eligible.</li>
  <li><strong>Submitted:</strong> evidence has been sent for a particular registration. Submission is not approval.</li>
  <li><strong>Pending:</strong> the submission awaits or still requires a decision. Pending distance is potential progress, not official progress.</li>
  <li><strong>Approved:</strong> the evidence has passed the applicable review and can contribute according to the event configuration.</li>
  <li><strong>Rejected:</strong> the evidence does not currently contribute. Read the reason and use an available correction or support path rather than counting it anyway.</li>
</ul>
<p>For accumulated challenges, use approved distance as the official total. Pending and rejected values should remain separate in the worksheet. Conditional automatic approval may apply to eligible clean evidence under current rules, but it is not universal and should never be promised. Leaderboards and recognition also depend on event configuration and review state.</p>
<p>Submit each required activity in the form the event requests rather than uploading an edited monthly dashboard as proof of several runs. Preserve original records, protect unnecessary location or health information, and confirm the displayed date, distance, duration, and activity type before submission.</p>

<h2>Review the goal once a week</h2>
<p>A weekly review is frequent enough to catch a problem without turning every day into a verdict. Choose a calm time and compare the original purpose, available opportunities, completed activity, recovery, and official event status. The review is a planning conversation, not a punishment session.</p>
<ol>
  <li>Record which opportunities happened, changed, or were skipped.</li>
  <li>Note what made activity easier or harder, including route, weather, sleep, work, care, or equipment.</li>
  <li>Separate personal recorded distance from submitted, pending, approved, and rejected event evidence.</li>
  <li>Check whether the remaining goal still fits the remaining usable opportunities.</li>
  <li>Protect recovery and the next suitable opportunity before considering a stretch target.</li>
  <li>Change one or two useful details rather than rewriting the entire month after one difficult day.</li>
</ol>
<p>If the plan repeatedly fails for the same reason, redesign it. Move the time, choose a safer route, reduce preparation friction, lower the target, select another event, or use a permitted alternative. Stronger self-criticism does not create more hours, safer weather, or faster review.</p>

<h2>Adjust after a missed activity</h2>
<p>A missed activity is information. First identify why it happened. Unsafe weather calls for a different response from poor scheduling; illness differs from a device problem; caregiving differs from a target that was too large from the beginning.</p>
<p>Protect the next suitable opportunity instead of automatically adding the missed distance to it. Do not double a session, sprint an intended easy activity, remove recovery, or continue through unsafe conditions simply to restore the calendar. Recalculate the remaining event requirement across the remaining usable time, then decide whether the target still fits.</p>
<p>For an accumulated event, remember that the category and deadline may not change merely because your personal working range changes. If completion no longer fits, contact the organiser about documented options where appropriate or accept that the event result may differ from the original goal. Honest non-completion is preferable to altered evidence or unsuitable activity.</p>

<h2>Respond to illness, pain, fatigue, and unsafe conditions</h2>
<p>A monthly total does not override current health or safety information. Rest or stop when appropriate. Seek qualified or emergency help for severe, unexplained, worsening, or concerning symptoms using the suitable local service. Do not use this article to diagnose pain, change prescribed medicine, or decide that an event deadline makes continued activity safe.</p>
<p>Illness, unusual fatigue, poor recovery, pregnancy, chronic conditions, disability, or return after injury may require individualized advice and a different goal. Lowering or ending a target can be a responsible decision. No badge, leaderboard position, certificate, streak, or social post is more important than appropriate care.</p>
<p>Check current official weather and local authority information close to departure. Heat, thunderstorms, flooding, unsafe air, poor visibility, traffic, route damage, and other hazards can remove an activity opportunity. Use a permitted safer alternative or reschedule; do not treat the monthly number as a reason to test dangerous conditions.</p>

<h2>Three illustrative monthly-goal scenarios</h2>
<p>These examples demonstrate the decision process. They are not programmes, predictions, or recommendations that the same distances and schedules suit another runner.</p>
<h3>Scenario 1: rebuilding a routine</h3>
<p>Mara has recently taken several weeks away from structured running. Her ordinary calendar offers two suitable mornings most weeks, but one work deadline and a family trip reduce the middle of the month. Instead of choosing a large distance from an old personal record, she defines minimum success as protecting a walk-run opportunity in three of the four planning phases. Her working goal is a flexible number of comfortable opportunities, not a daily streak. She leaves the stretch level blank until recovery and schedule evidence support it.</p>
<p>Mara uses the talk test as context for intended comfortable activity, takes rest when needed, and records how she feels. Her plan remains personally meaningful even though it is not designed around a HelloRun event result.</p>
<h3>Scenario 2: joining one virtual 5K</h3>
<p>Joel already repeats short comfortable runs and walks during ordinary weeks. He selects a virtual 5K whose dates, walking policy, route choice, and evidence method fit his circumstances. His minimum success is to prepare and complete one eligible activity without a pace target. His working range describes preparation opportunities, while the event distance itself stays fixed.</p>
<p>Joel checks the tracker and proof process before the event window. When rain removes one planned route, he uses a later suitable opportunity rather than forcing the date. His personal practice distance is separate from the one submitted event activity.</p>
<h3>Scenario 3: an accumulated challenge</h3>
<p>Lina reviews several ordinary recent weeks and an event that permits multiple eligible activities toward a configured target. She marks work travel, recovery, and likely weather disruptions before checking whether the target fits. Her minimum is responsible participation and timely evidence review; her working goal is the registered accumulated category; her stretch goal concerns personal activity only and does not change the category.</p>
<p>Each week Lina records personal activity, then separately lists what is submitted, pending, approved, or rejected. A pending submission is not added to official completion. When one activity is rejected for unclear evidence, she reads the reason and follows the available correction path instead of increasing the displayed total herself.</p>

<h2>Monthly running-goal worksheet</h2>
<p>Copy these prompts into a private note or paper planner. Collect only the information you need and avoid exposing precise routes, health details, or regular start locations publicly.</p>
<ol>
  <li><strong>Purpose:</strong> What do I want this month to support?</li>
  <li><strong>Recent evidence:</strong> What activity have I repeated during several ordinary weeks?</li>
  <li><strong>Current boundaries:</strong> Which health, recovery, access, work, care, travel, or weather factors need space?</li>
  <li><strong>Event mechanics:</strong> Is the result continuous or accumulated? What dates, activities, evidence, review states, and deadlines apply?</li>
  <li><strong>Usable opportunities:</strong> Which primary and backup windows genuinely fit?</li>
  <li><strong>Minimum success:</strong> What outcome would still make the month useful?</li>
  <li><strong>Working range:</strong> What target reflects ordinary recent activity and the real calendar?</li>
  <li><strong>Optional stretch:</strong> What may be considered only if recovery, conditions, and progress remain suitable?</li>
  <li><strong>Weekly review:</strong> When will I compare the plan, recovery, and official status?</li>
  <li><strong>Adjustment rule:</strong> Which facts will lead me to rest, reschedule, reduce, seek advice, or stop?</li>
</ol>

<h2>Final checklist before committing</h2>
<ul>
  <li>The goal has a purpose beyond choosing the largest number.</li>
  <li>It begins from several ordinary recent weeks, not one best-ever activity.</li>
  <li>The real calendar includes recovery, responsibilities, travel, route access, and backup space.</li>
  <li>The event format, accepted activities, dates, evidence, and review process have been checked.</li>
  <li>Minimum, working, and optional stretch levels are distinct.</li>
  <li>No stretch distance is treated as debt.</li>
  <li>Personal recorded activity is separate from official approved progress.</li>
  <li>Pending and rejected evidence is not counted as approved completion.</li>
  <li>The plan can change after illness, pain, fatigue, unsafe weather, or disrupted life.</li>
  <li>The target does not depend on doubling sessions, removing recovery, or altering evidence.</li>
</ul>

<h2>Take the practical next step</h2>
<p>Write the purpose and recent-week review before choosing the number. Then open the actual calendar, mark unavailable and recovery time, and test the proposed target against the remaining suitable opportunities. If it only works in a perfect month, reduce it or choose a later event.</p>
<p>When an event is part of the goal, browse <a href="/events">current HelloRun events</a> and read the live rules before registering. A realistic monthly goal should make the next responsible decision clearer—even when that decision is to rest, adjust, or choose a different challenge.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.who.int/publications/i/item/9789240015128">World Health Organization: Guidelines on physical activity and sedentary behaviour</a>, used for population-level activity context and the start-small, gradually-increase principle.</li>
  <li><a href="https://www.who.int/initiatives/behealthy/physical-activity">World Health Organization: Be Healthy—Physical activity</a>, used for accessible public-health context that some activity is better than none.</li>
  <li><a href="https://www.cdc.gov/physical-activity-basics/measuring/index.html">US Centers for Disease Control and Prevention: Measuring physical activity intensity</a>, used for relative-intensity and talk-test context.</li>
  <li>Current HelloRun source behavior reviewed in August 2026 for event configuration, registrations, evidence states, accumulated approved progress, and public event navigation.</li>
</ul>
<p>Source guidance can change. Check the linked organizations, the live event page, and current local information when making a decision. HelloRun does not guarantee completion, safety, evidence approval, leaderboard placement, or recognition.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Set a monthly running goal in one minute',
  'How this guide was prepared',
  'What makes a monthly goal realistic',
  'Start with ordinary recent weeks, not your best day',
  'Choose the purpose before the number',
  'Count the opportunities your real calendar provides',
  'Understand the event before setting the total',
  'Use minimum, working, and stretch levels',
  'Separate personal activity from HelloRun event progress',
  'Review the goal once a week',
  'Three illustrative monthly-goal scenarios',
  'Monthly running-goal worksheet',
  'Final checklist before committing',
  'Take the practical next step',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/blog/how-accumulated-distance-challenges-work"',
  'href="/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge"',
  'href="/blog/how-to-stay-consistent-during-a-month-long-virtual-run"',
  'href="/blog/beginner-5k-training-plan-new-runners"',
  'www.who.int/publications/i/item/9789240015128',
  'www.cdc.gov/physical-activity-basics/measuring/index.html'
]);

function buildArticlePayload({ coverImageUrl = '' } = {}) {
  const contentHtml = sanitizeHtml(RAW_CONTENT_HTML);
  const contentText = htmlToPlainText(contentHtml);
  const normalizedCoverImageUrl = String(coverImageUrl || '').trim();
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
    ogImageUrl: normalizedCoverImageUrl
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
  if (/<h[12]>How to Set a Realistic Monthly Running Goal<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/\b10\s*%\s*rule\b/i.test(text)) errors.push('article must not prescribe the 10% rule');
  if (/(?:must|should|need to) run every day|daily running is required|never miss a day/i.test(text)) errors.push('article must not prescribe daily running');
  if (/(?<!not )guarantee(?:s|d)? (?:completion|safety|approval|fitness|injury prevention)|prevents? (?:all )?injur/i.test(text)) errors.push('article must not guarantee outcomes or injury prevention');
  if (/(?:must|should) make up .{0,40} by (?:doubling|running twice)|remove recovery to catch up/i.test(text)) errors.push('article must not prescribe unsafe catch-up activity');
  if (/exactly \d+\s*(?:kilometres?|kilometers?|km) (?:per|each) (?:week|month) (?:is|will be) (?:safe|right|realistic) for everyone/i.test(text)) errors.push('article must not prescribe a universal distance');
  if (/every event accepts|all events accept|walking is always accepted|treadmills? (?:are|is) always accepted/i.test(text)) errors.push('article must not claim universal event acceptance');
  if (/pending (?:distance|activity|evidence) (?:counts|is counted) (?:as )?(?:official|approved|completion)|pending distance completes/i.test(text)) errors.push('article must not count pending progress officially');
  if (/every submission is automatically approved|automatic approval is guaranteed/i.test(text)) errors.push('article must not promise automatic approval');
  if (!/reviewed in August 2026 using current public guidance/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/Pending distance is potential progress, not official progress/i.test(text)) errors.push('article must distinguish pending progress');
  if (!/population recommendations describe activity associated with health benefits; they are not race-readiness tests/i.test(text)) errors.push('article must distinguish public-health guidance from personal training');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid monthly running goal payload: ${errors.join('; ')}`);
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
