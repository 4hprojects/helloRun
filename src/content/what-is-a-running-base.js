'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'what-is-a-running-base';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'What Is a Running Base? How Beginners Build One',
  excerpt: 'Learn how repeatable easy running, run-walk sessions, a suitable long run, strength, and recovery create a stable foundation for future training.',
  category: 'Training',
  tags: Object.freeze([
    'running base',
    'base building running',
    'aerobic base running',
    'running foundation',
    'beginner base training',
    'running consistency',
    'easy running',
    'running base beginners'
  ]),
  seoTitle: 'What Is a Running Base? How Beginners Build One',
  seoDescription: 'Learn what runners mean by a running base, how regular easy running builds consistency, and why a stable routine matters before harder 5K, 10K, or 21K training.',
  coverImageAlt: 'Paper-collage Filipino beginner building a running base through relaxed running, run-walk practice, strength, and recovery'
});

const RAW_CONTENT_HTML = `
<p>A <strong>running base</strong> is the repeatable foundation that supports what you want to do next. For a beginner, it is not a secret pace, a compulsory weekly distance, or a test of whether you are a “real runner.” It is a stretch of reasonably consistent running or run-walk activity that your body, schedule, routes, and recovery can sustain.</p>
<p>Base building makes ordinary weeks more dependable before you add more demanding work. It may prepare you to complete a first 5K, extend toward 10K, begin a careful 21K pathway, or simply keep running through work and family changes. The useful question is not “How much should every runner do?” It is “What can I repeat without constantly needing to recover from the plan itself?”</p>
<blockquote><strong>The base-building principle:</strong> establish manageable frequency and mostly easy effort, then change one demand at a time. A smaller routine you can repeat is a stronger foundation than an impressive week you cannot sustain.</blockquote>

<h2>What is a running base?</h2>
<p>A running base is a period of regular, mostly comfortable aerobic activity that prepares you for more specific training. “Aerobic” describes sustained activity that asks the heart, lungs, circulation, and working muscles to support movement over time. In practical beginner language, much of the work feels controlled enough that you are not racing every session.</p>
<p>The base includes more than kilometres. It includes the habit of starting, suitable routes, footwear you have tested, an effort you can judge, room for rest, and a way to adapt when weather or responsibilities change. It also includes learning how walking can manage effort instead of treating every walk break as failure.</p>
<p>There is no single official threshold at which a base suddenly exists. It becomes visible through patterns: you can complete suitable sessions repeatedly, ordinary fatigue settles, and the routine fits more than an unusually quiet week.</p>

<h2>Base training is not only for marathon runners</h2>
<p>The phrase can sound like a stage reserved for high-mileage athletes. In reality, a first-time runner benefits from a foundation precisely because everything is still new. Repeating simple sessions teaches pacing, breathing, route judgment, preparation, recovery, and how running fits daily life.</p>
<p>A base can support a comfortable 5K just as meaningfully as a later half marathon. The size of the base should reflect the intended goal and the runner's current situation. Someone building toward a first run-walk 5K does not need to copy the routine of an experienced runner preparing for 21K.</p>
<p>General physical-activity guidance describes health targets for populations, but those targets are not individualized running prescriptions. Running can be vigorous activity for many people, while brisk walking may provide a more manageable starting point. Build from your present capacity and seek qualified guidance when health, disability, pregnancy, medication, persistent symptoms, or previous injury changes the decision.</p>

<h2>Consistency comes before complexity</h2>
<p>A base is created by what happens across ordinary weeks, not by one long or fast day. Begin with sessions that have a realistic place in the calendar. Include dressing, travel, warm-up, cooldown, showering, food, and the next day's responsibilities rather than counting only recorded minutes.</p>
<p>The <a href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school">weekly running schedule guide</a> starts with fixed commitments and protects flexible alternatives. If your ideal session disappears during every deadline, rainy afternoon, or family event, it is not yet a dependable base. A shorter run, planned walk, indoor option, or moved rest day can preserve continuity.</p>
<p>Do not compensate for a missed session by crowding several demanding runs together. Training load includes duration, effort, terrain, frequency, strength work, other sport, and ordinary life stress. The calendar may show separate activities while your body experiences their combined demand.</p>

<h2>Easy running is the main component</h2>
<p>Most base activity should be controlled enough to repeat. The <a href="/blog/easy-run-explained">easy-run guide</a> explains why pace changes with heat, hills, sleep, fatigue, surface, and experience. A pace that looks slow on a watch may still be too hard for today's conditions, while a different runner may experience the same number comfortably.</p>
<p>The talk test offers a practical cue. At a moderate relative effort, a person can generally talk but not sing; vigorous effort makes more than a few words difficult. This is a broad guide, not a diagnosis or a command that every base run must occupy one intensity category. Many beginners experience jogging as vigorous and may need walking or run-walk intervals to keep a session manageable.</p>
<p>Easy does not mean meaningless. It provides time to practise relaxed movement, notice the route, learn hydration access, test tracking, and finish with enough reserve for the rest of the week. If every run becomes a race, it becomes difficult to add frequency or learn what sustainable effort feels like.</p>

<h2>Run-walk belongs in base building</h2>
<p>Planned walking can be the structure of the base, not an emergency response. The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">beginner run-walk guide</a> shows how alternating modes can control effort and extend manageable time on feet. Ratios should come from practice rather than a universal formula.</p>
<p>You might walk from the beginning, use walking on hills, or change the pattern when heat and fatigue raise the demand. The useful pattern is one that keeps movement controlled without requiring you to ignore symptoms. Gradually lengthening running portions is optional; consistent run-walk remains a valid way to train and participate when event rules allow it.</p>
<p>Walking also makes a reduced-day version possible. When a full planned session does not fit, a comfortable walk can maintain the appointment with movement without pretending it produces exactly the same training effect.</p>

<h2>Long runs within a running base</h2>
<p>A long run is the relatively longest session in your current week, not a universal distance. The <a href="/blog/what-is-a-long-run-for-beginners">beginner long-run guide</a> focuses on purpose, easy effort, route, recovery, and relationship to the rest of the schedule.</p>
<p>Within a base, a longer session can develop comfort with more time on feet and reveal practical issues that short routes hide. You may learn that the route lacks shade, the phone battery drains, breakfast timing feels wrong, or the next day's schedule leaves no recovery space. These lessons are part of the foundation.</p>
<p>Do not lengthen the long run automatically every week. Repeat, shorten, or replace it when recovery, weather, illness, route safety, or life load calls for a different choice. The goal is to make longer easy activity compatible with the whole routine, not to win each weekend.</p>

<h2>Strength training supports the foundation</h2>
<p>Running is only one form of physical demand. Simple strength work can support general capacity and prepare muscles for forces that easy running alone may not cover. The <a href="/blog/strength-training-for-runners-beginners">beginner runner strength guide</a> uses fundamental movement patterns and scalable home options rather than an equipment-heavy program.</p>
<p>Place strength work where it can be performed with control and recovered from. A new lifting routine can create soreness and should not be stacked carelessly beside a new long run, hill session, or faster workout. Start with movements and loads you can execute safely, and obtain individual instruction when technique, pain, balance, or a health condition needs assessment.</p>
<p>Strength training does not guarantee injury prevention, and no exercise makes every runner ready for a particular distance. It is one component of a broader routine that also includes appropriate progression and recovery.</p>

<h2>Rest and recovery are part of the base</h2>
<p>A stable base includes space where adaptation and ordinary life can occur. Rest may mean no planned training; recovery may also include normal walking or another comfortable activity when appropriate. Neither should become a punishment for missing a target.</p>
<p>The NHS beginner plan, for example, places rest days between runs. That is one accessible example rather than a schedule everyone must copy. Your spacing may differ with current fitness, age, health, work, terrain, intensity, and other activity.</p>
<p>Watch patterns rather than demanding a perfect feeling after every session. Ongoing exhaustion, worsening sleep, declining performance, irritability, unusual breathlessness, persistent pain, changed gait, or symptoms that concern you are reasons to reduce or stop activity and seek appropriate care. Do not use a base-building calendar to override medical advice.</p>

<h2>Increase one major demand at a time</h2>
<p>Frequency, duration, distance, pace, hills, strength load, and technical workouts all add demand. The <a href="/blog/how-to-increase-running-distance">distance-progression guide</a> recommends changing one major variable at a time so you can judge the response.</p>
<p>If you add another running day, keep it modest rather than also making the long run much longer. If you extend one session, let other runs remain familiar. If work becomes unusually demanding, holding or reducing training may be the progression that preserves the base.</p>
<p>No fixed percentage increase is safe or correct for everyone. A small numerical change can still be difficult when terrain, heat, intensity, or consecutive days change. Use actual recovery and repeatability, not arithmetic alone.</p>

<h2>When to add faster running</h2>
<p>Faster training is not required to prove that the base works. First establish controlled sessions and recover from them reliably. A beginner can make meaningful progress by becoming more consistent at an appropriate effort without adding formal speed work.</p>
<p>When the routine is stable and faster running suits the goal, introduce one new element conservatively. Brief relaxed accelerations, a controlled sustained effort, and repeated faster intervals are different tools. They should not all arrive in the same week simply because a plan uses advanced vocabulary.</p>
<p>Keep easy days genuinely easier around a harder session. Stop if movement becomes uncontrolled or concerning symptoms appear. A coach or qualified health professional can help when performance goals, prior injury, or medical context makes self-directed progression uncertain.</p>

<h2>How long does it take to build a running base?</h2>
<p>There is no universal number of weeks. A former runner returning after a short interruption, a person beginning from regular walking, and someone starting after years of inactivity do not share the same starting point. The target distance and available schedule also change what “enough base” means.</p>
<p>Use several ordinary weeks as evidence rather than treating one successful session as proof. The period should be long enough to show what happens during work pressure, changing weather, imperfect sleep, and at least a few longer or busier days. If the routine only works under ideal conditions, continue simplifying it.</p>
<p>Plans can provide structure, but dates are checkpoints rather than guarantees. Repeat a week, reduce a session, or delay a target when needed. Building patiently is not lost time; it is the work that makes specific training more usable.</p>

<h2>Signs your routine is becoming more stable</h2>
<ul>
<li>You can place suitable sessions in typical weeks without repeatedly sacrificing sleep.</li>
<li>Most runs or run-walks begin at a controlled effort instead of becoming accidental races.</li>
<li>You know a few safe routes and have alternatives for heat, rain, darkness, or traffic.</li>
<li>Your ordinary post-run fatigue is manageable and does not consistently disrupt later sessions.</li>
<li>You can miss or modify one session without cramming it into the next day.</li>
<li>Your footwear, clothing, tracking, food, and fluid routines are familiar enough not to dominate every outing.</li>
<li>You understand which discomforts settle and which symptoms require stopping or evaluation.</li>
</ul>
<p>These are discussion points, not an eligibility test. A runner can have a useful base while using walking, adapting for disability, training fewer days, or avoiding a metric that does not serve the goal.</p>

<h2>Base building before a 5K</h2>
<p>For a first 5K, the base may be a consistent walking and run-walk routine that gradually supports more comfortable running. The <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K plan</a> offers flexible progression rather than assuming continuous running on day one.</p>
<p>Practise the time commitment, route, event activity type, and finish goal. If your goal is simply completion, pace does not need to become the centre of the base. If you later want a faster 5K, stable easy running provides somewhere to place controlled quality work.</p>

<h2>Base building before a 10K</h2>
<p>A 10K foundation usually asks for greater comfort with longer easy activity and its recovery, but it still should not be defined by one compulsory weekly total. The <a href="/blog/10k-training-plan-for-beginners">beginner 10K guide</a> connects run-walk choices, easy running, gradually longer sessions, and rest.</p>
<p>Before beginning a more specific plan, review whether shorter runs are repeatable and whether the longer session leaves enough capacity for the following days. Route access and schedule may be the limiting factors even when one 10K completion is possible.</p>

<h2>Base building before a 21K</h2>
<p>A half-marathon pathway magnifies time, route, fueling, hydration, tracking, and recovery demands. The <a href="/blog/21k-half-marathon-for-beginners">beginner 21K guide</a> treats durable shorter-distance consistency as a prerequisite, not a guarantee based on one result.</p>
<p>Choose a generous preparation window and confirm that progressively longer sessions can coexist with work, family, sleep, and safe route access. A 10K base may be a useful bridge, but readiness remains individual. Delaying the distance is appropriate when persistent symptoms, unstable recovery, or logistics make the plan unreliable.</p>

<h2>Build a base around Philippine conditions</h2>
<p>In the Philippines, a routine must survive heat, humidity, rain, traffic, changing daylight, and large differences between lowland and higher-elevation conditions. Do not copy a plan's pace or clothing assumptions without considering the local route and forecast.</p>
<p>Identify shaded or well-lit options, water access, toilets, transport, safe turnaround points, and an indoor alternative if available. Start-time changes should not repeatedly take away needed sleep. During severe weather, poor air quality, flooding, unsafe heat, or dangerous visibility, modifying or cancelling the session protects the routine better than forcing it.</p>
<p>Virtual events add rule checks. Confirm the activity window, accepted activity types, single-session or accumulated format, treadmill policy, proof requirements, and privacy settings before using an event as the base-building goal.</p>

<h2>A simple base-building decision framework</h2>
<ol>
<li><strong>Review the present:</strong> list what you actually completed during recent ordinary weeks.</li>
<li><strong>Choose the purpose:</strong> first 5K, comfortable 10K preparation, longer-term 21K work, or general consistency.</li>
<li><strong>Protect easy effort:</strong> use pace, talk, walking, terrain, and weather cues to keep most sessions controlled.</li>
<li><strong>Select a manageable long session:</strong> make it relative to the current routine and repeat it when needed.</li>
<li><strong>Add strength and recovery:</strong> place them deliberately rather than treating them as leftovers.</li>
<li><strong>Prepare alternatives:</strong> define what happens during a busy, wet, hot, or low-energy week.</li>
<li><strong>Review before adding complexity:</strong> change one major demand only when the current pattern is stable.</li>
</ol>

<h2>Find a practical goal for the base</h2>
<p>A goal can give the routine direction without making every session a test. When your timeline and current capacity align, <a href="/events">browse HelloRun events</a> and compare distance, format, dates, activity window, accepted movement, proof, route, fees, cutoffs, accessibility, and organizer support.</p>
<p>Registration does not create readiness. Choose an event because its preparation fits the base you can build. A shorter or later event may be the stronger choice when it allows repeatable training and a safer experience.</p>

<h2>Frequently asked questions</h2>
<h3>How much running do I need before starting a training plan?</h3>
<p>There is no universal amount. Compare the plan's opening demands with your recent repeatable activity, recovery, schedule, health, and route access. Start with a gentler foundation or individual guidance when the gap is large.</p>
<h3>Can walking build a running base?</h3>
<p>Walking can develop activity tolerance and support a run-walk foundation. It does not create exactly the same demand as running, but it can be the appropriate starting point and remain part of the routine.</p>
<h3>Should all base runs be slow?</h3>
<p>Most base work is generally controlled, but “slow” has no universal pace. Some established runners may include limited faster practice. Beginners do not need formal speed sessions before they can sustain ordinary running.</p>
<h3>Does a running base disappear after one missed week?</h3>
<p>No. Fitness and routine do not switch off instantly. Resume according to the length and reason for the interruption, and avoid trying to repay missed sessions through cramming.</p>
<h3>Can I build a base on a treadmill?</h3>
<p>Yes, if treadmill running is suitable for you and supports the goal. Outdoor events still warrant route, surface, weather, and navigation practice, while virtual-event treadmill acceptance depends on the rules.</p>

<h2>Official sources and health note</h2>
<p>The <a href="https://odphp.health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines/about-physical-activity-guidelines/questions-answers">U.S. Office of Disease Prevention and Health Promotion</a> explains that inactive adults can start with small amounts of activity and build over time. The <a href="https://www.cdc.gov/physical-activity-basics/adding-adults/what-counts.html">CDC guide to relative activity intensity</a> describes the conversation-based talk test. The <a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/">NHS Couch to 5K plan</a> provides an official example of gradual run-walk progression with rest between runs.</p>
<p>This article provides general education, not diagnosis or an individualized training prescription. Stop and seek urgent help for emergency symptoms. Discuss starting or changing exercise with a qualified professional when symptoms, health conditions, pregnancy, medication, disability, previous injury, or a clinician's advice affects what is appropriate.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'What is a running base?',
  'Base training is not only for marathon runners',
  'Consistency comes before complexity',
  'Easy running is the main component',
  'Run-walk belongs in base building',
  'Long runs within a running base',
  'Strength training supports the foundation',
  'Rest and recovery are part of the base',
  'Increase one major demand at a time',
  'When to add faster running',
  'How long does it take to build a running base?',
  'Signs your routine is becoming more stable',
  'Base building before a 5K',
  'Base building before a 10K',
  'Base building before a 21K',
  'Build a base around Philippine conditions',
  'A simple base-building decision framework',
  'Find a practical goal for the base',
  'Frequently asked questions',
  'Official sources and health note'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/blog/easy-run-explained"',
  'href="/blog/what-is-a-long-run-for-beginners"',
  'href="/blog/strength-training-for-runners-beginners"',
  'href="/blog/how-to-increase-running-distance"',
  'href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school"',
  'href="/blog/run-walk-method-beginner-friendly-way-build-endurance"',
  'href="/blog/beginner-5k-training-plan-new-runners"',
  'href="/blog/10k-training-plan-for-beginners"',
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
  if (wordCount < 2500 || wordCount > 3000) errors.push('article must contain 2500-3000 substantive words');
  if (!payload.ogImageUrl) errors.push('cover artwork is required');
  if (!payload.title || !payload.excerpt || payload.excerpt.length > 220 || !payload.seoDescription) errors.push('metadata');
  if (!payload.contentHtml || payload.contentRaw !== payload.contentText) errors.push('content');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8 || payload.tags.some((tag) => !tag || tag.length > 30)) errors.push('tags');
  if (/<h1\b/i.test(payload.contentHtml)) errors.push('h1');
  if (/every runner needs \d+ kilometres per week|everyone must run \d+ days/i.test(text)) errors.push('universal mileage');
  if (/base training prevents injury|guarantees? (a )?faster/i.test(text)) errors.push('guarantee');
  if (/ignore persistent pain|run through concerning symptoms/i.test(text)) errors.push('unsafe symptoms');
  if (!/running base/i.test(text)) errors.push('intent');
  for (const heading of REQUIRED_HEADINGS) if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`heading ${heading}`);
  for (const link of REQUIRED_LINKS) if (!payload.contentHtml.includes(link)) errors.push(`link ${link}`);
  if (errors.length) throw new Error(`Invalid running-base payload: ${errors.join('; ')}`);
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
