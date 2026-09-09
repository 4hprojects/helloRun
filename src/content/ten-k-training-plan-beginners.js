'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = '10k-training-plan-for-beginners';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: '10K Training Plan for Beginners: Prepare for Your First 10K',
  excerpt: 'Prepare for your first 10K with a flexible eight-week framework built around easy effort, run-walk options, a gradually longer activity, recovery, and honest weekly reviews.',
  category: 'Training',
  tags: Object.freeze([
    '10K training plan',
    'beginner 10K',
    'first 10K',
    '5K to 10K',
    'easy running',
    'run walk training',
    'long run',
    'race preparation'
  ]),
  seoTitle: '10K Training Plan for Beginners: Prepare for Your First 10K',
  seoDescription: 'Prepare for your first 10K with a beginner-friendly training framework covering easy runs, run-walk sessions, recovery, pacing, and weekly scheduling.',
  coverImageAlt: 'Cut-paper illustration of a Filipino runner progressing through an easy run, walk break, and longer run along a tropical route toward a first 10K'
});

const RAW_CONTENT_HTML = `
<p>A 10K training plan for beginners should help you extend a repeatable 5K foundation—not ask you to double your distance in one heroic session. This flexible eight-week framework uses three possible activity opportunities: a familiar easy session, a shorter support session, and one gradually longer activity. Walking and run-walk remain available throughout the plan.</p>
<p>The first decision is whether 10K training fits your current activity. A recent comfortable 5K or a similar amount of easy time on your feet can provide useful starting information. It is not a pass-or-fail test. If 5K is still a demanding one-off effort, continue building that foundation before adding a longer goal.</p>
<p>Eight weeks is an example planning window, not a universal deadline. Some runners may repeat weeks, start with walking, use a longer runway, or stop the block when health, recovery, weather, access, or ordinary life changes. The completion goal is to cover 10 kilometres using a practised combination of easy running and walking—not to reach a particular finish time.</p>
<blockquote><strong>The progression principle:</strong> keep most activity familiar, extend only one longer opportunity when the current week is repeatable, and let recovery decide whether the next change belongs on the calendar.</blockquote>

<h2>Your beginner 10K plan in one minute</h2>
<ol>
  <li><strong>Confirm the starting point.</strong> Review several ordinary weeks and decide whether a comfortable 5K or comparable run-walk duration is repeatable.</li>
  <li><strong>Choose a completion strategy.</strong> Easy continuous running, planned run-walk, or walking can all support training; event rules decide what qualifies on the day.</li>
  <li><strong>Use three possible opportunities.</strong> Plan one familiar easy session, one shorter support session, and one longer easy activity with recovery between demanding-for-you days.</li>
  <li><strong>Extend gradually and conditionally.</strong> Repeat first; then change one variable only when effort, symptoms, recovery, weather, and schedule support it.</li>
  <li><strong>Keep easy effort easy.</strong> Use controlled breathing and conversation rather than another runner's pace.</li>
  <li><strong>Consolidate during Week 4.</strong> Hold or reduce the longer activity instead of increasing every week.</li>
  <li><strong>Rehearse, do not prove.</strong> Week 7 practises route, equipment, tracking, and pacing without requiring a full 10K test.</li>
  <li><strong>Reduce before the attempt.</strong> Week 8 uses shorter familiar activity and recovery before a suitable first 10K opportunity.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This article was reviewed in August 2026 using current public guidance from the World Health Organization, the US Centers for Disease Control and Prevention, and the UK National Health Service, together with current HelloRun event and submission behavior. WHO supports beginning with small amounts of physical activity and increasing gradually. CDC describes starting slowly, scheduling activity, addressing barriers, and using the talk test as one way to understand relative intensity. NHS Couch to 5K is a public example of structured run-walk sessions with rest between running days.</p>
<p>Those sources support general principles, not this exact eight-week sequence or a prediction that every reader can safely complete 10K. Population recommendations describe activity associated with health benefits; they are not personal training plans, race-readiness tests, medical clearance, rehabilitation protocols, or guarantees of finishing. The framework below is original general education and has not assessed your health, route, ability, or event.</p>
<p>Disability, pregnancy or postpartum status, chronic conditions, medicines, recent illness, surgery, injury history, prolonged inactivity, pain, and other individual circumstances can change what is appropriate. Follow qualified personal advice that applies to you. Seek suitable medical or emergency help for severe, sudden, unexplained, recurrent, or worsening symptoms rather than using an event date as permission to continue.</p>

<h2>Are you ready to train for a 10K?</h2>
<p>Readiness is not one pace or finish time. Look at the last two to four ordinary weeks. Have you completed a 5K, or a similar easy run-walk duration, more than once without turning each attempt into a maximum effort? Did ordinary walking, sleep, work, study, and caregiving remain manageable afterward? Can two or three suitable opportunities fit most weeks without removing necessary recovery?</p>
<p>A single 5K finish can be meaningful, but it may not yet be a training base. If it required several days of unusual recovery, worsened a symptom, or happened after little recent activity, repeat a comfortable foundation first. The <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K training plan</a> provides a walk-run framework when 5K is still the current goal.</p>
<p>If recent activity follows a substantial break, use the <a href="/blog/returning-to-running-after-a-break-gradual-restart-plan">gradual returning-to-running guide</a> before treating an old 5K result as a current baseline.</p>
<h3>Useful starting signs</h3>
<ul>
  <li>A familiar easy or run-walk session can be repeated during an ordinary week.</li>
  <li>You can cover approximately 5K or comparable time on your feet without treating it as a race.</li>
  <li>You know an easy effort that can be controlled with pace and planned walking.</li>
  <li>You have a safe route or suitable indoor option that can support longer activity.</li>
  <li>Your calendar contains recovery and a backup—not only three ideal training slots.</li>
  <li>Any individual medical, rehabilitation, or accessibility needs have an appropriate plan.</li>
</ul>
<p>These are planning prompts, not a medical screen. If they do not fit, postpone the 10K target, rebuild through the <a href="/blog/30-day-running-challenge-for-beginners">flexible 30-day running challenge</a>, or obtain the guidance you need.</p>

<h2>How long does it take to train for a 10K?</h2>
<p>This guide uses eight weeks because it creates time to establish a baseline, extend a longer activity, consolidate, rehearse, and reduce before an attempt. Eight weeks may be suitable for someone with a repeatable 5K foundation. It is not a promise that eight weeks is enough for every beginner.</p>
<p>If you are starting from walking, returning after a break, or still building toward 5K, add that foundation before Week 1. If illness, pain, work, severe weather, or caregiving removes part of the block, extend the calendar rather than compressing it. An event farther away is often more useful than a deadline that forces unsuitable activity.</p>
<p>Count backward from a possible event only after checking the live date, registration window, activity rules, and your real calendar. Mark travel, exams, deadlines, family commitments, route access, and recovery. The <a href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school">weekly running schedule guide</a> explains how to place fixed, flexible, backup, and unavailable time.</p>

<h2>What a beginner 10K week should include</h2>
<p>The framework offers three activity opportunities, but none is automatically mandatory. Two well-chosen sessions and recovery can be more appropriate than a third session forced into a difficult week. Avoid placing all the longer or harder-for-you activity together simply because weekends are busy.</p>
<ul>
  <li><strong>Easy session:</strong> a familiar duration using relaxed running, run-walk, or walking. Its purpose is repeatability, not adding distance.</li>
  <li><strong>Support session:</strong> usually similar to or shorter than the easy session. It can repeat the same pattern, practise transitions, or become recovery when the week is demanding.</li>
  <li><strong>Longer activity:</strong> an easy run, run-walk, or walk that gradually extends time on your feet. It should not also become the week's fastest session.</li>
  <li><strong>Recovery:</strong> non-running time, sleep opportunity, ordinary meals and fluids, and observation of the response before another demanding-for-you activity.</li>
  <li><strong>Optional strength or mobility:</strong> only when appropriate and placed so it does not quietly turn every day into training.</li>
  <li><strong>Weekly review:</strong> compare the plan with actual effort, symptoms, conditions, schedule, and recovery before choosing the next week.</li>
</ul>
<p>Keep at least one easier or non-running day between running sessions when practical, especially while learning what the longer activity changes. NHS Couch to 5K uses rest between its beginner running sessions; that programme is an example, not a compulsory 10K schedule.</p>

<h2>Use easy effort instead of a universal training pace</h2>
<p>Most activity in this completion framework should feel controlled. CDC's talk test describes moderate activity as an effort where a person can generally talk but not sing, while vigorous activity permits only a few words before pausing for breath. Individual responses vary, and the talk test is not a diagnostic tool.</p>
<p>For an intended easy run or run-walk, comfortable phrases or sentences are often more useful than defending a pace number. Slow down, lengthen a walk, choose a flatter route, or shorten the session when breathing, form, attention, or conditions say the effort is no longer easy.</p>
<p>The <a href="/blog/how-to-breathe-while-running">beginner guide to breathing while running</a> explains the talk test, natural nose-and-mouth breathing, optional rhythm cues, and when reducing effort is the more useful answer.</p>
<p>Heat, humidity, hills, wind, surface, congestion, sleep, stress, illness, and accumulated fatigue can change pace at the same effort. The <a href="/blog/beginners-guide-to-running-pace">beginner running pace guide</a> explains pace, splits, moving time, elapsed time, and why another runner's easy pace cannot define yours.</p>

<h2>Easy running and run-walk options</h2>
<p>You do not need to remove walk breaks before starting a 10K block. A planned run-walk pattern can distribute effort, improve route awareness, and make a longer activity easier to understand. Decide the pattern before becoming exhausted, keep the running portions controlled, and make the walking long enough to settle breathing and concentration.</p>
<p>The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">run-walk method guide</a> explains time, landmark, and effort-led cues. Use a familiar pattern for the easy and support sessions. During the longer activity, repeating the same pattern for a little more time can be a progression; lengthening every run interval and total duration together is not required.</p>
<p>Walking-first preparation is also possible. A runner may build longer purposeful walks, then explore short relaxed running portions when appropriate. Whether walking qualifies for a particular 10K result is a separate event-rule question; check <a href="/blog/can-you-walk-a-virtual-run">what the event must say about walking</a>.</p>

<h2>Build the longer activity without turning it into a test</h2>
<p>The longer activity develops familiarity with more time on your feet. Start from the longest easy activity that has recently felt repeatable—not the farthest distance you have ever completed. Record its approximate duration, run-walk pattern, route, conditions, overall effort, and later response. That becomes the working baseline.</p>
<p>When the baseline has been manageable in comparable conditions, choose one modest change: a little more time, one additional easy cycle, or a slightly longer safe route. Keep effort and other variables familiar. If the extension changes breathing sharply, disrupts ordinary movement, or produces poor recovery, shorten or repeat rather than defending it.</p>
<p>A full 10K rehearsal is not required. Training can prepare the routine, pacing, equipment, and confidence without proving the entire distance in advance. Some runners may cover close to the target during their longest activity; others may use a shorter longest activity and a conservative run-walk strategy. Individual readiness cannot be decided from this article.</p>
<p>There is no compulsory percentage increase. The familiar “10% rule” is not a guarantee of safety and does not account for terrain, intensity, frequency, health, or recovery. Use the runner's response and qualified guidance rather than treating arithmetic as clearance.</p>

<h2>Example eight-week beginner 10K framework</h2>
<p>Define <strong>E</strong> as a familiar easy session you can repeat and <strong>L</strong> as your current repeatable longer activity. This avoids assigning the same minutes or kilometres to runners with different 5K times, walk breaks, routes, and circumstances. Place recovery between sessions and move opportunities when needed.</p>
<ol>
  <li><strong>Week 1 — Establish.</strong> Easy: complete E at controlled effort. Support: repeat E or use a shorter run-walk. Longer: complete L without extending it. Decision: confirm the baseline and later response.</li>
  <li><strong>Week 2 — Extend once.</strong> Easy: repeat E. Support: choose a shorter familiar activity or recovery. Longer: repeat L or add one modest time segment. Decision: change only the longer opportunity.</li>
  <li><strong>Week 3 — Repeat.</strong> Easy: repeat E. Support: practise the intended run-walk rhythm. Longer: repeat Week 2 or extend slightly if it was manageable. Decision: keep effort easy and do not chase distance.</li>
  <li><strong>Week 4 — Consolidate.</strong> Easy: use a shorter or familiar E. Support: optional easy movement or recovery. Longer: repeat or reduce it. Decision: remove accumulated fatigue rather than adding again.</li>
  <li><strong>Week 5 — Resume.</strong> Easy: return to E. Support: use a familiar session. Longer: extend from the best-controlled longer activity. Decision: use the Week 4 review, not the calendar alone.</li>
  <li><strong>Week 6 — Longest supported activity.</strong> Easy: repeat E. Support: use a shorter easy session or run-walk. Longer: repeat Week 5 or make one final modest extension. Decision: this may be the longest activity of the block.</li>
  <li><strong>Week 7 — Rehearse.</strong> Easy: use a familiar session. Support: complete a short rehearsal with event equipment. Longer: keep the controlled rehearsal no longer than the proven plan. Decision: practise route, tracking, pacing, and walk breaks.</li>
  <li><strong>Week 8 — Reduce and attempt.</strong> Easy: use one or two shorter familiar activities early. Support: recovery and preparation. Longer: attempt the first 10K only when conditions are suitable. Decision: begin conservatively and use the practised strategy.</li>
</ol>
<p>“Optional” means optional. If two opportunities already create substantial demand, remove the support session. If the longer activity is not recovering normally, repeat or step back. If Week 8 is not suitable, continue the block or choose another date rather than forcing the attempt.</p>

<h2>How the eight weeks progress</h2>
<h3>Week 1: establish the real baseline</h3>
<p>Keep every activity familiar. The longer opportunity is an observation, not an extension. Start slower than your first impulse, use planned walking early, and choose a route with an easy way home. Record how ordinary movement feels later that day and the next morning.</p>
<h3>Week 2: make one small extension</h3>
<p>Repeat the easy session. If Week 1 was manageable, add one modest segment to the longer activity—perhaps another easy run-walk cycle or a little more walking. Decide the extension before starting so excitement does not keep moving the finish point.</p>
<h3>Week 3: repeat before adding again</h3>
<p>Repetition is useful training. Keep the same longer activity when it still creates enough demand. If Week 2 felt controlled across the session and recovery, a second small extension may be considered, but pace remains easy and the support activity stays familiar.</p>
<h3>Week 4: consolidate</h3>
<p>Hold or reduce the longer activity and keep the week simple. A consolidation week creates space to absorb the routine, resolve equipment or route friction, and notice whether fatigue has been accumulating. It is not a lost week.</p>
<h3>Week 5: resume from the best-controlled week</h3>
<p>Do not automatically continue from the largest number. Resume from the longer activity that was best controlled and recovered. Extend one variable only when the current facts support it. Hotter weather or a more difficult route can make the same duration a progression.</p>
<h3>Week 6: complete the longest supported activity</h3>
<p>This can be the longest activity of the block, but “longest” is personal and does not need to equal 10K. Keep the practised run-walk pattern, take the safe route, and end the activity rather than adding an unplanned fast finish.</p>
<h3>Week 7: rehearse decisions</h3>
<p>Use familiar shoes, clothing, tracker, route style, and walk breaks. Practise starting conservatively and checking effort without staring at the device. The rehearsal tests logistics and decisions, not maximum fitness. Shorten it if recovery from Week 6 is incomplete.</p>
<h3>Week 8: reduce and attempt</h3>
<p>Use one or two shorter easy activities early in the week only when suitable. Do not add missed distance. Protect ordinary sleep and recovery, check event or route details, and attempt 10K only when health, conditions, access, and the event window remain appropriate.</p>

<h2>An illustrative 5K-to-10K example</h2>
<p>Mina has completed several comfortable 5K run-walk activities in about 55 minutes. Her ordinary easy session is roughly 35–40 minutes, and her current longer activity is the familiar 55-minute 5K. She schedules Tuesday as an easy opportunity, Thursday as a shorter support opportunity, and Sunday as the longer opportunity, with Saturday available as a backup rather than extra training.</p>
<p>In Week 1 she repeats those durations. In Week 2 she adds one easy run-walk cycle to Sunday. Week 3 repeats it because the last part still requires concentration. Week 4 shortens Sunday. Weeks 5 and 6 add small amounts of time only after recovery feels ordinary. Week 7 rehearses the tracker and planned walk breaks on a safe loop. Week 8 uses one short easy session before a conservative virtual 10K opportunity.</p>
<p>These details illustrate decisions, not predicted outcomes or a prescription for another runner. Someone with a different 5K time, route, health, work schedule, or recovery would choose different durations and may need more than eight weeks.</p>

<h2>Recovery, rest, and optional supporting activity</h2>
<p>Recovery is part of the plan. Sleep, food, fluids, work, caregiving, heat exposure, stress, and other activity all affect whether the next session is repeatable. A rest day does not need to contain replacement kilometres.</p>
<p>Use ordinary meals and hydration that already agree with you. This guide does not prescribe supplements, exact fluid volumes, restrictive diets, or weight change. Needs vary with duration, conditions, health, medicines, and the individual. Use qualified nutrition or medical advice when appropriate.</p>
<p>Optional strength, balance, mobility, cycling, or other activity can complement a routine, but it also adds workload. Begin from familiar movements and place them where they do not compromise the longer activity or recovery. The <a href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back">post-run recovery guide</a> offers a broader review framework.</p>

<h2>What if you miss a training day?</h2>
<p>A missed session is information, not training debt. Identify why it moved: unsafe weather, illness, pain, work, care, sleep, route access, low motivation, or an unrealistic plan. Use a backup only when the reason does not also make the backup unsuitable.</p>
<p>Do not double sessions, combine the support and longer activity, run harder, or remove recovery to restore the printed week. Resume with the next appropriate opportunity. Repeat the week after a larger disruption, or return to the last manageable longer activity when current capacity has changed.</p>
<p>If the event date no longer fits, choose another event or revise the goal. Training evidence does not become invalid because the calendar took longer. An honest delay is preferable to unsafe catch-up activity.</p>

<h2>Weather, routes, treadmills, and equipment</h2>
<p>Philippine heat and humidity can raise effort at the same pace. Rain can change visibility, grip, drainage, and traffic behavior. Thunderstorms, flooding, unsafe air, darkness, and route damage can remove an opportunity. Check current official weather and local conditions close to departure; shorten, reschedule, change route, walk, move indoors, or recover as appropriate.</p>
<p>A longer route should remain easy to exit. Loops can keep water, shelter, transport, toilets, and assistance closer. Avoid a first-time remote route simply because the map shows the desired distance. Use <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">the safe-route guide</a> when planning a self-directed attempt.</p>
<p>A treadmill can support training when suitable, but outdoor and treadmill pace or distance may differ. Learn safe controls, use a familiar setting, and do not jump onto side rails at speed. For a virtual event, confirm whether treadmill activities and their evidence are accepted.</p>
<p>Use comfortable, secure footwear and clothing already tested during easy and longer activities. New shoes, socks, fuel, carrying systems, or devices should not all debut on the 10K attempt. No product can assure comfort, performance, or protection from injury.</p>

<h2>Prepare for your first 10K attempt</h2>
<ul>
  <li>Choose the easy running, run-walk, or walking strategy practised during the block.</li>
  <li>Check the route, surface, crossings, lighting, weather, water access, toilets, transport, and exit points.</li>
  <li>Use familiar clothing, footwear, food, hydration, and any individual arrangements.</li>
  <li>Charge and test the tracker while stationary; protect route and personal privacy.</li>
  <li>Begin more conservatively than excitement suggests.</li>
  <li>Use planned walk breaks before exhaustion rather than saving them as a last resort.</li>
  <li>Slow, walk, stop, or seek help when symptoms, effort, conditions, or instructions require it.</li>
  <li>Keep the next day flexible for recovery and review.</li>
</ul>
<p>A first 10K does not need a target time. Finish-time estimates can be misleading when they ignore walk breaks, hills, congestion, heat, GPS error, stops, and individual response. The useful first target is a strategy you can control.</p>

<h2>Can your first 10K be a virtual run?</h2>
<p>Yes, when a suitable virtual event offers a 10K category or accepts an eligible 10K activity. A virtual format can provide date and route flexibility, but it does not automatically provide course marshals, aid stations, weather cancellation, medical support, certified distance, or automatic proof approval.</p>
<p>Before registering, confirm the activity window, final submission deadline, timezone, accepted activities, minimum distance, whether one continuous activity is required, treadmill or walking rules, evidence method, review process, and recognition. Browse <a href="/events">current HelloRun events</a> and use the complete live event page as the source of truth.</p>
<p>Record the activity using an accepted method, preserve the original record, and review date, distance, duration, activity type, and privacy before submission. Submitted, pending, approved, and rejected are different states. A pending activity is potential progress, not official progress.</p>
<p>If no suitable 10K event is available, continue training or complete a personal route without representing it as an official HelloRun result. The goal can remain meaningful without forcing it into the wrong event format.</p>
<p>When preparation is complete and a suitable category is available, use the <a href="/blog/how-to-run-your-first-10k-virtual-run">first virtual 10K guide</a> for the final rules, route, pacing, recording, proof, and post-attempt workflow. That guide executes one opportunity; it does not replace this progression.</p>

<h2>After the 10K</h2>
<p>Move to a safe place, walk easily if appropriate, and let breathing settle. Use familiar food and fluids according to your circumstances. Review how ordinary movement, sleep, and symptoms feel later and the next day before scheduling another demanding activity.</p>
<p>For a virtual event, save the original record and monitor review status. Correct rejected evidence only through the documented route. Do not alter figures, crop away required context, or count pending distance as an approved finish.</p>
<p>Your next goal might be repeating 10K more comfortably, building a stable weekly routine, exploring pace with suitable guidance, or remaining at shorter distances. A 21K plan is not an automatic next step. Longer distance adds training, recovery, logistics, and event demands that deserve a fresh decision. When 10K is repeatable, the <a href="/blog/21k-half-marathon-for-beginners">beginner 21K guide</a> provides a separate readiness review and flexible bridge. The <a href="/blog/how-to-set-running-goals-for-the-rest-of-the-year">year-end goal guide</a> can place either choice inside a wider set of adjustable checkpoints.</p>

<h2>Frequently asked questions</h2>
<h3>Can a complete beginner train for 10K in eight weeks?</h3>
<p>This framework assumes a repeatable 5K or similar easy run-walk foundation. Someone beginning from little recent activity may need a walking and 5K phase first, followed by a longer 10K block.</p>
<h3>Do I need to run continuously?</h3>
<p>No. Planned walk breaks can remain part of training and the attempt. Check whether the selected event accepts the intended activity type and timing.</p>
<h3>How many days a week should I run?</h3>
<p>The framework offers up to three activity opportunities, but there is no universal number. Two may fit better in some weeks or circumstances. Recovery and individual guidance can change the schedule.</p>
<h3>How far should the longest run be?</h3>
<p>There is no compulsory distance in this guide. Build from a repeatable longer activity, extend conditionally, and avoid treating a full 10K rehearsal as required.</p>
<h3>What pace should I use?</h3>
<p>Use an easy, controlled effort rather than a universal number. Pace changes with the runner, route, weather, surface, sleep, and run-walk pattern.</p>
<h3>Can I walk the whole 10K?</h3>
<p>Walking can be a personal completion strategy. Event eligibility, cutoff, and activity-type rules must be checked separately.</p>
<h3>Should I add speed workouts?</h3>
<p>This first-completion framework does not require them. Adding speed changes the training demand and may be better addressed after a stable base or with suitable coaching.</p>
<h3>What if eight weeks is not enough?</h3>
<p>Take longer. Repeat weeks, return to the last manageable baseline, or choose a later event. The schedule is a framework, not a deadline.</p>
<h3>Does completing this plan assure a 10K finish?</h3>
<p>No. The plan cannot predict health, conditions, event rules, or individual response. Adjust or stop when current facts require it.</p>

<h2>Your practical next step</h2>
<p>Review the last two to four ordinary weeks and write down your familiar easy session and current repeatable longer activity. Place one easy opportunity, one optional support opportunity, one longer opportunity, and recovery on next week's real calendar. Week 1 repeats that baseline; it does not extend it.</p>
<p>When a current event provides an appropriate target, <a href="/events">find a HelloRun event</a> and verify the full live rules before registering. Use the date as a planning boundary, not a reason to override recovery, symptoms, weather, or safe progression.</p>

<h2>Official sources and review notes</h2>
<ul>
  <li><a href="https://www.who.int/publications/i/item/9789240015128">World Health Organization: Guidelines on physical activity and sedentary behaviour</a> — used for population-level activity and gradual-start context.</li>
  <li><a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity">World Health Organization: Physical activity fact sheet</a> — used for the principle that some activity is better than none.</li>
  <li><a href="https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html">US CDC: Steps for Getting Started With Physical Activity</a> — used for starting slowly, scheduling, and barrier planning.</li>
  <li><a href="https://www.cdc.gov/physicalactivity/basics/measuring/index.html">US CDC: Measuring Physical Activity Intensity</a> — used for general talk-test context.</li>
  <li><a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/">NHS: Couch to 5K running plan</a> — used as one structured example of walk-run progression and rest between running sessions.</li>
</ul>
<p>Source links and current HelloRun behavior were checked in August 2026. Public guidance, platform behavior, and event rules can change. Recheck current sources and the live event page when making a training or participation decision.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Your beginner 10K plan in one minute',
  'How this guide was prepared',
  'Are you ready to train for a 10K?',
  'How long does it take to train for a 10K?',
  'What a beginner 10K week should include',
  'Use easy effort instead of a universal training pace',
  'Build the longer activity without turning it into a test',
  'Example eight-week beginner 10K framework',
  'What if you miss a training day?',
  'Prepare for your first 10K attempt',
  'Can your first 10K be a virtual run?',
  'Frequently asked questions',
  'Your practical next step',
  'Official sources and review notes'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/blog/beginner-5k-training-plan-new-runners"',
  'href="/blog/30-day-running-challenge-for-beginners"',
  'href="/blog/run-walk-method-beginner-friendly-way-build-endurance"',
  'href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school"',
  'href="/blog/returning-to-running-after-a-break-gradual-restart-plan"',
  'href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back"',
  'href="/blog/beginners-guide-to-running-pace"',
  'href="/blog/how-to-choose-a-safe-route-for-your-virtual-run"',
  'href="/blog/how-to-breathe-while-running"',
  'href="/blog/can-you-walk-a-virtual-run"',
  'href="/blog/how-to-run-your-first-10k-virtual-run"',
  'href="/blog/21k-half-marathon-for-beginners"',
  'href="/blog/how-to-set-running-goals-for-the-rest-of-the-year"'
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
  if (/<h[12]>10K Training Plan for Beginners:/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/(?:everyone|every runner) (?:must|should) (?:run|train)|(?:must|should|need to) run every day/i.test(text)) errors.push('article must not prescribe universal frequency');
  if (/(?:the )?10\s*%\s*rule (?:guarantees|prevents|is safe)|everyone (?:must|should) follow the 10\s*%\s*rule/i.test(text)) errors.push('article must not present the 10% rule as a safety guarantee');
  if (/(?<!not )guarantee(?:s|d)? (?:a )?(?:10K finish|completion|fitness|safety|performance)|prevents? (?:all )?injur/i.test(text)) errors.push('article must not guarantee outcomes or injury prevention');
  if (/(?:must|should) make up .{0,50} by (?:doubling|running twice)|remove recovery to catch up/i.test(text)) errors.push('article must not prescribe unsafe catch-up activity');
  if (/every event accepts walking|walking is always accepted|every virtual 10K accepts/i.test(text)) errors.push('article must not promise universal event eligibility');
  if (/pending (?:distance|activity|evidence) (?:counts|is counted) (?:as )?(?:official|approved|completion)|pending activity completes/i.test(text)) errors.push('article must not count pending progress officially');
  if (/every submission is automatically approved|automatic approval is guaranteed/i.test(text)) errors.push('article must not promise automatic approval');
  if (!/reviewed in August 2026 using current public guidance/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/Population recommendations describe activity associated with health benefits; they are not personal training plans/i.test(text)) errors.push('article must distinguish public-health guidance from personal training');
  if (!/A pending activity is potential progress, not official progress/i.test(text)) errors.push('article must distinguish pending progress');
  if (!/extend a repeatable 5K foundation/i.test(text)) errors.push('article must answer progression intent early');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid beginner 10K training payload: ${errors.join('; ')}`);
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
