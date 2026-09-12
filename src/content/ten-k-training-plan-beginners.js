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
<p>First decide whether 10K training fits your current activity. A recent comfortable 5K or similar easy time on your feet is useful starting information, not a pass-or-fail test. If 5K remains a demanding one-off effort, build that foundation first.</p>
<p>Eight weeks is an example, not a universal deadline. Repeat weeks or use a longer runway when health, recovery, weather, access, or life changes. The goal is to cover 10 kilometres with practised easy running and walking—not a particular finish time.</p>
<blockquote><strong>The progression principle:</strong> keep most activity familiar, extend only one longer opportunity when the current week is repeatable, and let recovery decide whether the next change belongs on the calendar.</blockquote>

<h2>Your beginner 10K plan in one minute</h2>
<ol>
  <li><strong>Confirm the start.</strong> Decide whether a comfortable 5K or comparable run-walk duration is repeatable.</li>
  <li><strong>Choose a strategy.</strong> Easy running, planned run-walk, or walking can support training; event rules decide what qualifies.</li>
  <li><strong>Use three opportunities.</strong> Plan an easy session, optional support session, and longer easy activity with recovery between them.</li>
  <li><strong>Extend conditionally.</strong> Change one variable only when effort, recovery, weather, and schedule support it.</li>
  <li><strong>Keep easy effort easy.</strong> Use controlled breathing and conversation rather than another runner's pace.</li>
  <li><strong>Consolidate during Week 4.</strong> Hold or reduce the longer activity instead of increasing every week.</li>
  <li><strong>Rehearse, do not prove.</strong> Week 7 practises logistics without requiring a full 10K test.</li>
  <li><strong>Reduce before the attempt.</strong> Week 8 uses shorter familiar activity and recovery.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This article was reviewed in September 2026 using current public guidance from the World Health Organization, the US Centers for Disease Control and Prevention, and the UK National Health Service, together with current HelloRun event and submission behavior. The sources support gradual beginnings, planned accessible activity, relative-effort cues, structured run-walk, and rest.</p>
<p>Those sources support general principles, not this exact eight-week sequence or a prediction that every reader can safely complete 10K. Population recommendations describe activity associated with health benefits; they are not personal training plans, race-readiness tests, medical clearance, rehabilitation protocols, or guarantees of finishing. The framework below is original general education and has not assessed your health, route, ability, or event.</p>
<p>Health, disability, pregnancy or postpartum status, medicines, recent illness, surgery, injury, and prolonged inactivity can change what is appropriate. Follow qualified personal advice and seek suitable help for severe, sudden, unexplained, or worsening symptoms.</p>

<h2>Are you ready to train for a 10K?</h2>
<p>Readiness is not one pace or finish time. Review the last two to four ordinary weeks. Have you completed a 5K or similar easy run-walk duration more than once without maximum effort? Was recovery ordinary, and can two or three suitable opportunities fit without removing necessary rest?</p>
<p>A single 5K may not yet be a training base. If it required unusual recovery, worsened a symptom, or followed little recent activity, use the <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K training plan</a> to establish a repeatable foundation first.</p>
<p>If recent activity follows a substantial break, use the <a href="/blog/returning-to-running-after-a-break-gradual-restart-plan">gradual returning-to-running guide</a> before treating an old 5K result as a current baseline.</p>
<p>Useful signs include a repeatable easy session, approximately 5K or comparable time on your feet without racing it, a controlled effort, a safe longer route or indoor option, room for recovery, and an appropriate plan for individual health or accessibility needs.</p>
<p>These are planning prompts, not a medical screen. If they do not fit, postpone the 10K target, rebuild through the <a href="/blog/30-day-running-challenge-for-beginners">flexible 30-day running challenge</a>, or obtain the guidance you need.</p>

<h2>How long does it take to train for a 10K?</h2>
<p>Eight weeks allows time to establish, extend, consolidate, rehearse, and reduce. It may suit someone with a repeatable 5K foundation but is not a promise for every beginner.</p>
<p>If you are starting from walking, returning after a break, or still building toward 5K, add that foundation before Week 1. If illness, work, weather, or caregiving removes part of the block, extend the calendar rather than compressing it.</p>
<p>Count backward only after checking the live event rules and your real commitments. The <a href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school">weekly running schedule guide</a> explains fixed, flexible, backup, and unavailable time.</p>

<h2>What a beginner 10K week should include</h2>
<p>The framework offers three opportunities, but none is mandatory. Two suitable sessions and recovery can be better than a third forced into a difficult week. Avoid grouping harder-for-you activity together.</p>
<ul>
  <li><strong>Easy session:</strong> a familiar duration using relaxed running, run-walk, or walking. Its purpose is repeatability, not adding distance.</li>
  <li><strong>Support session:</strong> repeat a shorter familiar pattern or make this recovery when the week is demanding.</li>
  <li><strong>Longer activity:</strong> an easy run, run-walk, or walk that gradually extends time on your feet. It should not also become the week's fastest session.</li>
  <li><strong>Recovery:</strong> non-running time and observation before another demanding-for-you activity.</li>
  <li><strong>Weekly review:</strong> compare the plan with effort, symptoms, schedule, and recovery before choosing the next week.</li>
</ul>
<p>Keep at least one easier or non-running day between running sessions when practical, especially while learning what the longer activity changes. NHS Couch to 5K uses rest between its beginner running sessions; that programme is an example, not a compulsory 10K schedule.</p>

<h2>Use easy effort instead of a universal training pace</h2>
<p>Most activity in this completion framework should feel controlled. CDC's talk test describes moderate activity as an effort where a person can generally talk but not sing, while vigorous activity permits only a few words before pausing for breath. Individual responses vary, and the talk test is not a diagnostic tool.</p>
<p>For an intended easy run or run-walk, <a href="/blog/how-to-breathe-while-running">comfortable phrases or sentences</a> are often more useful than defending a pace number. Slow down, lengthen a walk, choose a flatter route, or shorten the session when breathing, attention, or conditions say the effort is no longer easy.</p>
<p>Heat, humidity, hills, wind, surface, congestion, sleep, stress, illness, and accumulated fatigue can change pace at the same effort. The <a href="/blog/beginners-guide-to-running-pace">beginner running pace guide</a> explains pace, splits, moving time, elapsed time, and why another runner's easy pace cannot define yours.</p>

<h2>Easy running and run-walk options</h2>
<p>You do not need to remove walk breaks before starting a 10K block. A planned run-walk pattern can distribute effort, improve route awareness, and make a longer activity easier to understand. Decide the pattern before becoming exhausted, keep the running portions controlled, and make the walking long enough to settle breathing and concentration.</p>
<p>The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">run-walk method guide</a> explains time, landmark, and effort-led cues. Use a familiar pattern for the easy and support sessions. During the longer activity, repeating the same pattern for a little more time can be a progression; lengthening every run interval and total duration together is not required.</p>
<p>Walking-first preparation is also possible: build longer purposeful walks, then explore short relaxed running portions when appropriate. Whether walking qualifies for a particular 10K result remains a separate event-rule question.</p>

<h2>Build the longer activity without turning it into a test</h2>
<p>The longer activity develops familiarity with more time on your feet. Start from the longest easy activity that has recently felt repeatable—not the farthest distance you have ever completed. Record its approximate duration, run-walk pattern, route, conditions, overall effort, and later response. That becomes the working baseline.</p>
<p>When the baseline has been manageable in comparable conditions, choose one modest change: a little more time, one additional easy cycle, or a slightly longer safe route. Keep effort and other variables familiar. If the extension changes breathing sharply, disrupts ordinary movement, or produces poor recovery, shorten or repeat rather than defending it.</p>
<p>A full 10K rehearsal is not required. Training can prepare routine, pacing, equipment, and confidence without proving the distance in advance. There is also no compulsory percentage increase: the familiar “10% rule” is not a guarantee of safety and cannot account for terrain, intensity, health, or recovery.</p>

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
<p>If two opportunities already create substantial demand, remove the support session. Repeat or step back when the longer activity is not recovering normally, and choose another attempt date when Week 8 is unsuitable.</p>

<h2>How the eight weeks progress</h2>
<h3>Week 1: establish the real baseline</h3>
<p>Keep activity familiar. Observe the longer opportunity without extending it, begin conservatively, use planned walking early, and note the later response.</p>
<h3>Week 2: make one small extension</h3>
<p>If Week 1 was manageable, add one planned easy run-walk or walking segment to the longer activity while keeping the easy session familiar.</p>
<h3>Week 3: repeat before adding again</h3>
<p>Repeat the longer activity when it still creates enough demand. Consider another small extension only after controlled effort and ordinary recovery.</p>
<h3>Week 4: consolidate</h3>
<p>Hold or reduce the longer activity. This creates room to absorb the routine, resolve friction, and notice accumulated fatigue.</p>
<h3>Week 5: resume from the best-controlled week</h3>
<p>Resume from the best-controlled longer activity, not automatically the largest number. Extend one variable only when current facts support it.</p>
<h3>Week 6: complete the longest supported activity</h3>
<p>This may be the block's longest activity but need not equal 10K. Keep the practised pattern and avoid an unplanned fast finish.</p>
<h3>Week 7: rehearse decisions</h3>
<p>Use familiar equipment, route style, and walk breaks. The rehearsal tests logistics and decisions, not maximum fitness; shorten it if recovery is incomplete.</p>
<h3>Week 8: reduce and attempt</h3>
<p>Use shorter familiar activity early in the week when suitable. Do not add missed distance; attempt 10K only when health, recovery, conditions, and access remain appropriate.</p>

<h2>An illustrative 5K-to-10K example</h2>
<p>Mina has completed several comfortable 5K run-walk activities in about 55 minutes. She repeats that baseline in Week 1, adds one easy cycle in Week 2, repeats in Week 3, and reduces in Week 4. Later extensions follow ordinary recovery; Week 7 rehearses logistics and Week 8 reduces before an attempt. This illustrates decisions, not predicted outcomes.</p>

<h2>Recovery, rest, and optional supporting activity</h2>
<p>Recovery is part of the plan. Sleep, food, fluids, work, caregiving, heat exposure, stress, and other activity all affect whether the next session is repeatable. A rest day does not need to contain replacement kilometres.</p>
<p>Use familiar meals and hydration. This guide does not prescribe supplements, exact fluid volumes, diets, or weight change; individual needs vary.</p>
<p>Optional strength, mobility, or other activity also adds workload. Keep it familiar and place it away from the longer activity when needed. The <a href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back">post-run recovery guide</a> offers a broader review framework.</p>

<h2>What if you miss a training day?</h2>
<p>A missed session is information, not training debt. Identify why it moved: unsafe weather, illness, pain, work, care, sleep, route access, low motivation, or an unrealistic plan. Use a backup only when the reason does not also make the backup unsuitable.</p>
<p>Do not double sessions, combine the support and longer activity, run harder, or remove recovery to restore the printed week. Resume with the next appropriate opportunity. Repeat the week after a larger disruption, or return to the last manageable longer activity when current capacity has changed.</p>

<h2>Weather, routes, treadmills, and equipment</h2>
<p>Philippine heat and humidity can raise effort at the same pace. Rain can change visibility, grip, drainage, and traffic behavior. Thunderstorms, flooding, unsafe air, darkness, and route damage can remove an opportunity. Check current official weather and local conditions close to departure; shorten, reschedule, change route, walk, move indoors, or recover as appropriate.</p>
<p>A longer route should remain easy to exit. Loops can keep water, shelter, transport, toilets, and assistance closer. Avoid a first-time remote route simply because the map shows the desired distance. Use <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">the safe-route guide</a> when planning a self-directed attempt.</p>
<p>A treadmill can support training, but its pace or distance may differ from outdoors. Learn safe controls and confirm event acceptance. Use clothing and footwear already tested during longer activity; do not debut several new products on the attempt.</p>

<h2>Prepare for your first 10K attempt</h2>
<ul>
  <li>Choose the easy running, run-walk, or walking strategy practised during the block.</li>
  <li>Check the route, surface, crossings, lighting, weather, water access, toilets, transport, and exit points.</li>
  <li>Use familiar clothing, footwear, food, hydration, and any individual arrangements.</li>
  <li>Charge and test the tracker while stationary, protect privacy, and begin conservatively.</li>
  <li>Use planned walk breaks before exhaustion.</li>
  <li>Slow, walk, stop, or seek help when symptoms, effort, conditions, or instructions require it.</li>
  <li>Keep the next day flexible for recovery and review.</li>
</ul>
<p>A first 10K does not need a target time. Finish-time estimates can be misleading when they ignore walk breaks, hills, congestion, heat, GPS error, stops, and individual response. The useful first target is a strategy you can control.</p>

<h2>Can your first 10K be a virtual run?</h2>
<p>Yes, when a suitable virtual event offers a 10K category or accepts an eligible 10K activity. A virtual format can provide date and route flexibility, but it does not automatically provide course marshals, aid stations, weather cancellation, medical support, certified distance, or automatic proof approval.</p>
<p>Before registering, confirm the activity window, final submission deadline, timezone, accepted activities, minimum distance, whether one continuous activity is required, treadmill or walking rules, evidence method, review process, and recognition. Browse <a href="/events">current HelloRun events</a> and use the complete live event page as the source of truth.</p>
<p>Record the activity using an accepted method, preserve the original record, and review date, distance, duration, activity type, and privacy before submission. Submitted, pending, approved, and rejected are different states. A pending activity is potential progress, not official progress.</p>
<p>If no suitable 10K event is available, continue training or complete a personal route without presenting it as an official HelloRun result.</p>

<h2>After the 10K</h2>
<p>Move to a safe place, let breathing settle, and use familiar food and fluids. Review the later and next-day response before another demanding activity. For a virtual event, save the original record, monitor review status, and never alter figures or required context.</p>
<p>Your next goal might be repeating 10K more comfortably, building a stable weekly routine, exploring pace with suitable guidance, or remaining at shorter distances. A longer distance is not automatic; it adds training, recovery, logistics, and event demands that deserve a fresh decision.</p>

<h2>Frequently asked questions</h2>
<h3>Can a complete beginner train for 10K in eight weeks?</h3>
<p>This framework assumes a repeatable 5K or similar easy run-walk foundation. Someone beginning from little recent activity may need a walking and 5K phase first, followed by a longer 10K block.</p>
<h3>Do I need to run continuously?</h3>
<p>No. Planned walk breaks can remain part of training and the attempt. Check whether the selected event accepts the intended activity type and timing.</p>
<h3>How far should the longest run be?</h3>
<p>There is no compulsory distance in this guide. Build from a repeatable longer activity, extend conditionally, and avoid treating a full 10K rehearsal as required.</p>
<h3>Can I walk the whole 10K?</h3>
<p>Walking can be a personal completion strategy. Event eligibility, cutoff, and activity-type rules must be checked separately.</p>

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
<p>Source links and current HelloRun behavior were checked in September 2026. Public guidance, platform behavior, and event rules can change. Recheck current sources and the live event page when making a training or participation decision.</p>
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
  'href="/blog/how-to-breathe-while-running"'
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
  if (/<h[12]>10K Training Plan for Beginners:/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/(?:everyone|every runner) (?:must|should) (?:run|train)|(?:must|should|need to) run every day/i.test(text)) errors.push('article must not prescribe universal frequency');
  if (/(?:the )?10\s*%\s*rule (?:guarantees|prevents|is safe)|everyone (?:must|should) follow the 10\s*%\s*rule/i.test(text)) errors.push('article must not present the 10% rule as a safety guarantee');
  if (/(?<!not )guarantee(?:s|d)? (?:a )?(?:10K finish|completion|fitness|safety|performance)|prevents? (?:all )?injur/i.test(text)) errors.push('article must not guarantee outcomes or injury prevention');
  if (/(?:must|should) make up .{0,50} by (?:doubling|running twice)|remove recovery to catch up/i.test(text)) errors.push('article must not prescribe unsafe catch-up activity');
  if (/every event accepts walking|walking is always accepted|every virtual 10K accepts/i.test(text)) errors.push('article must not promise universal event eligibility');
  if (/pending (?:distance|activity|evidence) (?:counts|is counted) (?:as )?(?:official|approved|completion)|pending activity completes/i.test(text)) errors.push('article must not count pending progress officially');
  if (/every submission is automatically approved|automatic approval is guaranteed/i.test(text)) errors.push('article must not promise automatic approval');
  if (!/reviewed in September 2026 using current public guidance/i.test(text)) errors.push('article must disclose methodology and date');
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
