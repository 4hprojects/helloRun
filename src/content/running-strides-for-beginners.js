'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'running-strides-for-beginners';
const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'What Are Strides in Running? A Beginner’s Guide',
  excerpt: 'Learn how relaxed, gradual accelerations can introduce faster running without turning an easy day into a sprint workout.',
  category: 'Training',
  tags: Object.freeze(['running strides','strides for beginners','running accelerations','beginner speed work','running technique','easy run strides','relaxed fast running','running recovery']),
  seoTitle: 'What Are Strides in Running? A Beginner’s Guide',
  seoDescription: 'Learn what running strides are, how they differ from sprints, where they can fit after easy runs, and what beginners should understand before trying them.',
  coverImageAlt: 'Editorial sequence of a Filipino beginner moving from an easy jog through a relaxed acceleration and into a walking recovery'
});

const RAW_CONTENT_HTML = `
<p><strong>Running strides for beginners</strong> are short, controlled accelerations in which you smoothly move from an easy run toward a faster—but still relaxed—rhythm, then slow down and recover fully. They are sometimes called stride-outs or accelerations. The aim is to practise coordinated faster movement, not to prove how fast you can sprint.</p>
<p>That distinction matters. A useful stride should finish with control still available. You should not be straining, racing a watch, or staggering into the recovery. Because runners differ in health, experience, route, and training history, there is no universal distance, speed, number of repetitions, or recovery time that suits everyone.</p>
<blockquote><strong>The practical principle:</strong> build speed gradually, stay relaxed, stop while the movement still feels smooth, and recover enough that each attempt is intentional.</blockquote>

<h2>What running strides are</h2>
<p>A stride is a brief exposure to faster running. You begin from an easy jog or controlled moving start, accelerate progressively, spend a short portion moving quickly and smoothly, then decelerate rather than stopping abruptly. Easy walking or jogging follows before another attempt, if another attempt is appropriate.</p>
<p>“Brief” is deliberately flexible. Coaches may describe strides using time, distance, landmarks, or the feel of the acceleration. None of those descriptions becomes a medical or universal prescription. A new runner may need only a very small taste of quicker rhythm, while an experienced runner may use a longer acceleration within a structured plan.</p>
<p>The defining features are purpose and control. A stride is technique-oriented practice at a clearly faster rhythm than easy running. It is not a fitness test, race simulation, or punishment added because an easy run felt slow.</p>

<h2>Strides are not all-out sprints</h2>
<p>An all-out sprint asks for maximum or near-maximum output. A beginner stride should not. During a stride, speed rises progressively rather than exploding from a stationary start, and the runner stays below the point where tension, flailing, or desperate effort takes over.</p>
<p>Do not attach a mandatory percentage to that effort. People interpret percentages differently, wearable pace can lag during a short effort, and maximum speed may be unknown. Better signs are practical: breathing rises but does not become panicked, the face and shoulders remain relatively calm, foot placement feels coordinated, and you could have gone faster but chose not to.</p>
<p>If you finish thinking, “That was quick and smooth,” the intent was probably closer to a stride. If you finish bent over, gasping, or needing a long time because you raced the segment, it became a harder effort than intended.</p>

<h2>Why runners use strides</h2>
<p>Easy running builds much of a beginner’s endurance, yet it does not expose the body to every movement rhythm. Strides can offer a small, controlled chance to feel faster turnover, somewhat greater force, and the coordination that changes with speed. They may help faster running feel less unfamiliar before later training or an event.</p>
<p>Some runners also use strides as a transition near the end of a warm-up before a demanding session or race. That is a different context from adding them after an easy run, and it assumes the runner already tolerates faster work. Evidence about warm-up routines often involves trained athletes or sport-specific protocols, so it should not be turned into a guarantee for every beginner.</p>
<p>Strides do not replace a <a href="/blog/what-is-a-running-base">running base</a>, strength work, recovery, or event-specific preparation. They are an optional tool. A runner can make meaningful progress without them.</p>

<h2>Where strides can fit in a week</h2>
<p>When a runner already handles easy running consistently, strides are commonly placed after an easy run or after an easy warm-up. That location lets the runner become physically warm first while keeping the accelerations separate from the main easy effort. They should not quietly transform several easy days into speed days.</p>
<p>Look at the whole week. A hard interval session, demanding hills, long run, sport practice, physically strenuous job, poor sleep, or recent race may already provide plenty of stress. Adding strides because a calendar says so can be less sensible than preserving recovery.</p>
<p>The <a href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school">weekly running schedule guide</a> can help you see training alongside work, school, travel, and rest. Leave room after unfamiliar fast running to observe how your calves, hamstrings, feet, and overall energy respond.</p>

<h2>Easy running comes first</h2>
<p>Complete beginners do not need to rush into strides. First learn to alternate walking and running as needed, finish sessions without repeated exhaustion, and recover predictably. The ability to run continuously is not a moral requirement; stable run-walk training can also form a base.</p>
<p>An <a href="/blog/easy-run-explained">easy run</a> should remain genuinely easy before the faster portion. Starting tired makes it harder to distinguish relaxed speed from forced effort. If the easy run already felt unusually hard, ending the session may be the better choice.</p>
<p>Readiness is broader than pace. Consider recent illness, injury, sleep, heat exposure, hydration access, medication effects, and clinician guidance. Someone returning after a break may be experienced but temporarily less prepared for acceleration than a steady beginner.</p>

<h2>Warm up before moving faster</h2>
<p>Do not launch directly from sitting, driving, or standing into a hard acceleration. Begin with easy walking or jogging long enough to feel ready for the day and conditions. Some runners also use comfortable mobility or drills, but no complicated routine is required merely to imitate elite athletes.</p>
<p>A warm-up should increase readiness without creating fatigue. On hot and humid Philippine days, a long elaborate routine may add heat strain before the useful work begins. Choose a shaded or cooler time when practical, use a safe surface, and adjust or skip the faster running when conditions make it difficult to stay controlled.</p>
<p>A warm-up can reduce the abruptness of the transition, but it does not make every symptom safe. Stop for chest pressure, faintness, severe shortness of breath, sudden weakness, or other emergency warning signs and seek appropriate help.</p>

<h2>Build speed gradually</h2>
<p>Think of turning a dial rather than flipping a switch. Move out of the easy jog, let the steps become quicker and more forceful naturally, reach a smooth fast rhythm, then ease back down. The acceleration phase is part of the practice, not wasted distance before the “real” effort.</p>
<p>Gradual acceleration gives you time to notice the surface, balance, and rising tension. Research comparing gradual and maximal acceleration in field-sport athletes found that different approaches produced different sprint mechanics and peak speeds. That population and goal are not the same as beginner distance-running strides, but the work reinforces why acceleration style is a meaningful variable—not a detail to ignore.</p>
<p>Avoid using a downhill slope to manufacture speed. Gravity can push a beginner beyond their braking and coordination capacity. A flat, predictable route with room to slow down is usually easier for learning.</p>

<h2>Stay relaxed as pace increases</h2>
<p>Faster running naturally changes stride length, step rate, arm action, and force. Let those changes emerge instead of posing. The <a href="/blog/running-form-for-beginners">beginner running-form guide</a> explains why there is no single perfect silhouette or foot strike.</p>
<p>Simple cues may help: keep the gaze useful, let the shoulders stay away from the ears, hold the hands quietly, and run tall enough to breathe. Use one cue, not a crowded checklist. A relaxed face does not guarantee safe technique, but obvious clenching can tell you that effort is exceeding the intended feel.</p>
<p>Do not force a high knee lift, exaggerated rear kick, forefoot landing, or famous cadence number. The <a href="/blog/running-cadence-explained">cadence guide</a> treats step rate as context-dependent information. A stride is not a reason to rebuild your gait all at once.</p>

<h2>Recover fully between efforts</h2>
<p>Recovery is part of the stride, not dead time. Walk or jog easily until breathing, coordination, and attention are ready for another controlled acceleration. The next effort should not begin simply because a watch has counted down a generic interval.</p>
<p>If each attempt becomes slower, tighter, or more desperate, you may be recovering too little, doing too much, or moving faster than intended. Ending early protects the purpose of the session. There is no prize for completing a planned number with deteriorating form.</p>
<p>Standing completely still may feel uncomfortable for some runners, while others prefer walking. Choose the safe recovery that lets you reset. Keep moving out of other runners’ lanes and remain aware of traffic, cyclists, pets, and people using the path.</p>

<h2>Strides versus intervals</h2>
<p>Intervals are repeated work periods separated by recovery, but that broad structure covers many goals. A formal interval session may target aerobic capacity, race pace, speed endurance, or another adaptation. Its work bouts can create substantial cardiovascular and muscular fatigue.</p>
<p>Strides also repeat faster movement and recovery, yet their usual beginner purpose is smooth acceleration and coordination with generous recovery. They should not accumulate the same strain as a demanding interval workout. If the recovery is deliberately short and fatigue builds from repetition to repetition, the session is moving toward interval training.</p>
<p>Labels alone do not control load. A runner can turn “strides” into a severe workout by sprinting each one, adding too many, or cutting recovery. Judge what you actually did, not only what the training file called it.</p>

<h2>Strides versus hill sprints</h2>
<p>Hill sprints are very short, high-intensity uphill efforts often used for power and neuromuscular training. Despite the incline limiting absolute speed, they can place high demand on calves, Achilles tendons, hamstrings, hips, and overall recovery. They are not automatically safer or more beginner-friendly.</p>
<p>A relaxed stride on flat ground has a different intention. It builds progressively, stays controlled, and gives room to decelerate. Running a steep hill as hard as possible is not an interchangeable substitute.</p>
<p>Beginners interested in slopes should first learn ordinary controlled climbing from the existing hill-running guidance and keep effort appropriate. Do not combine unfamiliar strides, hill sprints, and a new strength routine in the same week just to accelerate progress.</p>

<h2>Should complete beginners do strides?</h2>
<p>Not necessarily. Someone in the first weeks of activity is already adapting to impact, repeated loading, and a new routine. Walking, run-walk sessions, and easy running can supply enough challenge. There is no deadline for adding speed.</p>
<p>Consider strides only when easy sessions are consistent, recovery is predictable, and there is a clear reason to practise quicker movement. Even then, begin with less than you think you could tolerate and observe the following day, not just the exciting moment of speed.</p>
<p>If you have pain, a recent injury, a health condition affected by exertion, pregnancy-related considerations, or advice limiting intensity, obtain individualized guidance. Age alone does not decide readiness, and online content cannot assess it.</p>

<h2>A controlled first-practice framework</h2>
<ol>
<li>Choose a day when you feel normally recovered and no other hard session is planned.</li>
<li>Use a flat, familiar, dry, unobstructed surface with enough space to slow down.</li>
<li>Warm up through easy walking or running and reassess how you feel.</li>
<li>Begin moving easily, then increase speed progressively rather than launching.</li>
<li>Stop accelerating before strain appears; hold only a brief smooth rhythm.</li>
<li>Decelerate under control without stepping into traffic or another lane.</li>
<li>Walk or jog until genuinely ready. Repeat only while every attempt remains calm.</li>
<li>Finish with easy movement and review symptoms and recovery later that day and the next.</li>
</ol>
<p>This is a decision framework, not a prescribed number of efforts or metres. Terrain, experience, current training, and health change what is appropriate. A qualified coach who can observe you may individualize the session.</p>

<h2>Common stride mistakes</h2>
<ul>
<li><strong>Sprinting all-out:</strong> maximum effort defeats the controlled purpose and raises load abruptly.</li>
<li><strong>Starting cold:</strong> jumping from inactivity to speed removes the gradual transition.</li>
<li><strong>Racing watch pace:</strong> short-effort GPS can lag, and a faster number is not the goal.</li>
<li><strong>Using a crowded or slippery route:</strong> speed reduces reaction time and needs safe stopping space.</li>
<li><strong>Skipping recovery:</strong> accumulated fatigue turns coordination practice into a harder workout.</li>
<li><strong>Forcing form:</strong> exaggerated knees, arm drive, or foot strike can create tension.</li>
<li><strong>Adding too much at once:</strong> new shoes, more distance, strides, and strength together obscure the cause of soreness.</li>
<li><strong>Ignoring next-day response:</strong> a session can feel exciting while delayed soreness reveals that it was too much.</li>
</ul>

<h2>When to skip or stop</h2>
<p>Skip strides when you are ill, unusually fatigued, acutely sore, on an unsafe surface, unable to warm up comfortably, or facing heat and humidity that make faster effort difficult to control. Follow medical or rehabilitation restrictions even when a generic plan says strides are scheduled.</p>
<p>Stop the session for new or worsening pain, dizziness, faintness, chest pressure, severe or unusual breathlessness, loss of coordination, or any symptom that concerns you. Seek urgent care for emergency symptoms. Persistent pain, swelling, weakness, numbness, or changed gait deserves assessment by an appropriately qualified professional.</p>
<p>Normal exertion and a medical warning sign are not always easy to separate online. When uncertain—especially with known health conditions—choose the conservative option and get individualized advice.</p>

<h2>Frequently asked questions</h2>
<h3>How fast should a running stride be?</h3><p>Clearly faster than easy pace but below all-out sprinting. Build gradually and stop increasing speed while you remain relaxed and coordinated. A universal pace or percentage would ignore individual readiness and conditions.</p>
<h3>How many strides should a beginner do?</h3><p>There is no number that fits every beginner. The smallest useful exposure may be enough at first. End before quality drops, and consider the rest of the week and next-day response.</p>
<h3>How long should recovery be?</h3><p>Long enough that breathing, movement, and attention are ready for another calm attempt. Walk or jog as appropriate instead of obeying a generic countdown.</p>
<h3>Can strides replace speed workouts?</h3><p>No. They may introduce faster rhythm with relatively little fatigue, but they do not reproduce every training effect of intervals, tempo running, hills, or race-specific work.</p>
<h3>Do I need a track?</h3><p>No. A flat, visible, uncrowded path can work if it has secure footing and room to slow down. Avoid traffic, hidden hazards, sharp turns, steep descents, and congested areas.</p>

<h2>Official sources and health note</h2>
<p>The <a href="https://health.gov/paguidelines/second-edition/pdf/Physical_Activity_Guidelines_2nd_edition.pdf">U.S. Physical Activity Guidelines</a> explain that intensity is relative to an individual’s fitness and that interval-style work has no single universal duration or work-to-recovery formula. A <a href="https://pubmed.ncbi.nlm.nih.gov/30037091/">study comparing gradual and maximal acceleration</a> shows that acceleration strategy changes sprint outcomes, although its field-sport participants and maximal-sprint task do not directly prescribe beginner strides. Research on <a href="https://pubmed.ncbi.nlm.nih.gov/22868404/">warm-ups that included strides in trained middle-distance runners</a> likewise provides context, not a beginner guarantee.</p>
<p>This article is general education, not diagnosis, rehabilitation, or an individualized training plan. Strides are optional. Use conservative judgment, follow applicable clinical advice, and seek professional evaluation when health, pain, disability, pregnancy, medication, or previous injury changes what faster running means for you.</p>

<h2>Practise control, not a watch result</h2>
<p>A good first stride session can feel almost understated. You warmed up, explored a quicker rhythm, stayed relaxed, recovered fully, and stopped with control. No leaderboard or pace screenshot is needed.</p>
<p>Keep a simple note about the surface, conditions, effort, and next-day response. Those observations are more useful than comparing one short GPS pace with another runner's result.</p>
<p>When that experience is repeatable and recovery remains normal, strides can become one small part of a broader running routine. When it is not, return to easy running and walking. The purpose is to expand your movement options—not to turn every run into a race against the watch.</p>
`;

const REQUIRED_HEADINGS = Object.freeze(['What running strides are','Strides are not all-out sprints','Why runners use strides','Where strides can fit in a week','Easy running comes first','Warm up before moving faster','Build speed gradually','Stay relaxed as pace increases','Recover fully between efforts','Strides versus intervals','Strides versus hill sprints','Should complete beginners do strides?','A controlled first-practice framework','Common stride mistakes','When to skip or stop','Frequently asked questions','Official sources and health note','Practise control, not a watch result']);
const REQUIRED_LINKS = Object.freeze(['href="/blog/what-is-a-running-base"','href="/blog/easy-run-explained"','href="/blog/running-form-for-beginners"','href="/blog/running-cadence-explained"','href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school"']);

function buildArticlePayload({ coverImageUrl } = {}) {
  const contentHtml = sanitizeHtml(RAW_CONTENT_HTML).trim();
  const contentText = htmlToPlainText(contentHtml);
  const wordCount = contentText.split(/\s+/).filter(Boolean).length;
  const payload = { ...ARTICLE, tags: [...ARTICLE.tags], contentHtml, contentText, contentRaw: contentText, readingTime: Math.ceil(wordCount / 180), ogImageUrl: String(coverImageUrl || '').trim(), coverImageAlt: ARTICLE.coverImageAlt };
  validateArticlePayload(payload);
  return payload;
}

function validateArticlePayload(payload) {
  const errors = [], text = String(payload.contentText || ''), wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 2500 || wordCount > 3000) errors.push('article must contain 2500-3000 substantive words');
  if (!payload.ogImageUrl) errors.push('cover artwork is required');
  if (!payload.title || !payload.excerpt || payload.excerpt.length > 220 || !payload.seoDescription) errors.push('metadata');
  if (!payload.contentHtml || payload.contentRaw !== payload.contentText) errors.push('content');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8 || payload.tags.some((tag) => !tag || tag.length > 30)) errors.push('tags');
  if (/<h1\b/i.test(payload.contentHtml)) errors.push('h1');
  if (/all[- ]out sprint(?:ing)? is the goal|race the watch|must reach maximum speed/i.test(text)) errors.push('sprint framing');
  if (/everyone should do (?:exactly )?\d+ strides|strides prevent all injuries/i.test(text)) errors.push('universal prescription');
  if (!/running strides for beginners/i.test(text)) errors.push('intent');
  for (const heading of REQUIRED_HEADINGS) if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`heading ${heading}`);
  for (const link of REQUIRED_LINKS) if (!payload.contentHtml.includes(link)) errors.push(`link ${link}`);
  if (errors.length) throw new Error(`Invalid running-strides payload: ${errors.join('; ')}`);
  return true;
}

module.exports = { ARTICLE, CANONICAL_SLUG, RAW_CONTENT_HTML, REQUIRED_HEADINGS, REQUIRED_LINKS, buildArticlePayload, validateArticlePayload };
