'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'running-form-for-beginners';
const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'Running Form for Beginners: What Actually Matters',
  excerpt: 'Understand relaxed posture, natural arm movement, stride and foot placement, cadence, hills, and why beginners do not need to copy one perfect running style.',
  category: 'Training',
  tags: Object.freeze(['running form beginners','proper running form','running technique','running posture','running stride','beginner technique','foot placement running','relaxed running form']),
  seoTitle: 'Running Form for Beginners: What Actually Matters',
  seoDescription: 'Learn practical running-form basics for beginners, including posture, arm movement, stride, foot placement, cadence, and why there is no single perfect running style.',
  coverImageAlt: 'Editorial sequence of a Filipino beginner running with relaxed, adaptable form on flat, uphill, and downhill park paths'
});

const RAW_CONTENT_HTML = `
<p><strong>Running form for beginners</strong> should make movement more understandable, not turn every step into an exam. Useful form cues can help you run with less unnecessary tension, notice when stride changes, and adapt to pace or terrain. They cannot define one body shape, foot strike, cadence, or posture that is perfect for everyone.</p>
<p>Running styles vary with anatomy, mobility, strength, speed, fatigue, shoes, surface, slope, disability, and experience. A relaxed runner at easy pace will not look identical to the same runner climbing a hill or finishing a faster effort. Start with broad, low-pressure observations and change something only when there is a clear reason.</p>
<blockquote><strong>The practical principle:</strong> aim for controlled, repeatable movement. Do not rebuild a pain-free natural stride around a social-media rule or assume that one visible detail predicts injury.</blockquote>

<h2>There is no single perfect running form</h2>
<p>Pictures of “proper” running often freeze one instant and remove the context. The runner's speed, limb proportions, slope, surface, and phase of the stride may be unknown. Copying that pose can create stiffness without improving how you move.</p>
<p>Research on gait retraining shows that form cues can change biomechanics, but changes in one area can shift load elsewhere. Evidence about performance, pain, and injury outcomes is more limited than claims online often suggest. That is why a cue should solve a specific problem, be introduced gradually, and be evaluated rather than treated as a universal upgrade.</p>
<p>If you run comfortably, recover normally, and have no problem that needs attention, you may not need a deliberate overhaul. Beginners gain more from a suitable <a href="/blog/what-is-a-running-base">running base</a>, manageable effort, and gradual training than from chasing a textbook silhouette.</p>

<h2>Start with relaxed posture</h2>
<p>Think tall enough to breathe and move freely, not rigidly upright. Let the body organize over the supporting foot while the whole runner travels forward. Avoid deliberately leaning back from the waist or forcing the chest upward, but do not hold an artificial forward lean throughout the run.</p>
<p>A slight whole-body inclination can appear naturally as speed or slope changes. It is not the same as bending sharply at the hips. The useful cue may simply be “move forward comfortably” or “stay relaxed,” especially when detailed instructions make you tense.</p>
<p>Check posture during an easy section, not only when tired at the end. Fatigue naturally changes movement. A small change late in a long or hard run does not prove that your everyday form is defective; it may show that the current effort exceeds what you can control.</p>

<h2>Keep the head and gaze useful</h2>
<p>Look far enough ahead to see the route, people, traffic, roots, potholes, wet paint, animals, and changes in surface. Staring at the feet can narrow awareness and encourage the upper body to fold, while looking too high can make the neck uncomfortable.</p>
<p>The exact gaze distance changes on a smooth track, crowded footpath, technical trail, treadmill, or steep descent. Route safety comes before an aesthetic head position. Briefly checking a watch is different from spending long stretches with the neck bent toward a phone.</p>
<p>Let the jaw and face stay easy when possible. Clenching can accompany unnecessary effort elsewhere. If vision, balance, dizziness, or neck symptoms affect safe movement, seek individualized assessment rather than relying on a generic gaze cue.</p>

<h2>Let the shoulders and arms move naturally</h2>
<p>Arms help balance the rotation and rhythm created by the legs. Let them swing generally forward and back with elbows comfortably bent. Some movement across the body is normal; the goal is not to pin the arms to imaginary rails.</p>
<p>Notice whether shoulders creep toward the ears, elbows flare because of tension, or one hand carries an object that changes the swing. Relaxing the shoulders or changing how you carry a phone may help more than forcing a precise elbow angle.</p>
<p>Arm action changes uphill and at faster pace. A stronger swing can support rhythm, while a very easy jog may use less. Large asymmetry can also reflect the route camber, a turn, fatigue, pain, or individual anatomy. Persistent or concerning asymmetry deserves context, not an instant correction from a single video.</p>

<h2>Keep the hands quiet rather than rigid</h2>
<p>Hands can remain softly closed or partly open. Avoid squeezing the fists as if holding something fragile that must not escape. Tension can travel into forearms and shoulders, particularly when effort rises.</p>
<p>Do not force a special finger position. The simplest check is whether your hands feel calm and whether carrying keys, a bottle, or a phone changes your balance. Use secure storage when possible and alternate sides if hand-carrying is unavoidable.</p>

<h2>Allow the trunk to respond to movement</h2>
<p>The trunk is not motionless. Small rotation and side-to-side movement occur as the arms and legs alternate. Trying to eliminate all motion may make running stiff. Excessive movement is also difficult to judge without knowing the runner's anatomy, pace, and camera angle.</p>
<p>General strength can support controlled movement, but no single core exercise guarantees correct form or prevents injury. The <a href="/blog/strength-training-for-runners-beginners">strength guide for beginner runners</a> focuses on scalable movement patterns and recovery rather than promising perfect mechanics.</p>
<p>When fatigue causes a large loss of control, shorten or slow the session instead of repeatedly ordering yourself to “hold form” through exhaustion.</p>

<h2>Understand stride length without reaching forward</h2>
<p>Stride length is the distance covered from one step to the next on the same side, and it normally grows as running speed increases. A problem can arise when a runner deliberately reaches the lower leg far ahead to manufacture a longer step. This may create braking and tension rather than useful speed.</p>
<p>Do not respond by forcing tiny steps. Let the foot return toward the ground near where the body can support it, while movement behind you and increased force contribute to speed naturally. A quiet cue such as “land under yourself” may help some runners, but camera perspective makes exact placement difficult to judge.</p>
<p>Your stride will shorten on steeper climbs, crowded paths, slippery surfaces, and during easy recovery. It may lengthen at faster controlled speed. Variation is normal.</p>

<h2>Foot placement matters more than one foot-strike label</h2>
<p>Rearfoot, midfoot, and forefoot describe which area contacts first, but they do not tell the whole story. Research reviews have not established that one strike pattern universally prevents running injury. Changing from a habitual rearfoot strike to a forefoot strike can reduce some loads while increasing demand on the ankle and calf structures.</p>
<p>An uninjured beginner should not force a forefoot landing simply because it looks advanced. Likewise, a runner who naturally lands farther forward does not need to manufacture a heel strike. Consider where the foot lands relative to the moving body, how quietly and comfortably the stride occurs, and whether symptoms or a specific clinical goal provide a reason to change.</p>
<p>Sudden retraining can make familiar distances feel unfamiliar. When a qualified professional recommends a change, introduce it in small doses and monitor the response.</p>

<h2>Cadence is information, not a universal target</h2>
<p>Cadence is step rate, commonly expressed as total steps per minute. It varies with pace, height, terrain, fatigue, and individual movement. The <a href="/blog/running-cadence-explained">running cadence guide</a> explains why one famous number should not become every runner's command.</p>
<p>A modest cadence adjustment can be one gait-retraining tool for a specific runner, often alongside professional feedback. That does not mean beginners must constantly count steps or make abrupt changes. If you are reaching far ahead, a slightly quicker, lighter rhythm may help, but it should not create breathlessness, shuffling, or calf tension.</p>
<p>Measure only if the information helps. A watch estimate, phone recording, or short manual count can show trends, but accuracy varies and the number needs pace and route context.</p>

<h2>Running form changes with pace</h2>
<p>At <a href="/blog/easy-run-explained">easy running effort</a>, arm drive, knee lift, and stride length are usually smaller than during faster work. That is appropriate. Trying to display a sprint shape while jogging can waste energy and create tension.</p>
<p>As speed rises, time on the ground, step rate, force, and limb positions change. These adaptations should emerge from controlled practice rather than exaggerated posing. Brief relaxed accelerations may later help a runner explore faster rhythm, but beginners do not need them before a stable base.</p>
<p>Compare videos only at similar speeds and conditions. A slow uphill clip and a fast flat clip do not diagnose a form change.</p>

<h2>Uphill running form</h2>
<p>On a climb, shorten the stride to match the grade, let the whole body incline with the hill, and use the arms naturally. Effort matters more than protecting flat-ground pace. The <a href="/blog/hill-running-for-beginners">beginner hill-running guide</a> encourages walking when needed and warns against turning every climb into a hard workout.</p>
<p>Look ahead for drainage channels, loose stones, vehicles, and people. On very steep grades, purposeful walking may be more controlled and nearly as fast as strained running. Do not interpret the choice as broken form.</p>

<h2>Downhill running form</h2>
<p>Downhill running can tempt you to brake with long reaching steps or, in the opposite direction, to rush beyond what the route allows. Use a controlled rhythm, keep the gaze on the upcoming surface, and let speed match visibility, grip, turns, traffic, and experience.</p>
<p>A slight whole-body relationship to the slope is different from folding at the waist. Avoid forcing a dramatic lean. Downhill load can be unfamiliar even when breathing feels easy, so introduce descents gradually and leave recovery space.</p>

<h2>Running form at easy pace</h2>
<p>Easy pace is a useful place to notice form because you have attention available. Check one cue at a time: relaxed jaw, free shoulders, quiet hands, useful gaze, or steps that do not reach deliberately forward. Then return attention to the route and effort.</p>
<p>Do not conduct a full-body checklist every minute. Constant monitoring can make running less natural and enjoyable. A single short cue used occasionally is more practical than trying to control every joint.</p>
<p>Walking breaks can reset effort and tension. Resume gently instead of accelerating to compensate for the walk.</p>

<h2>Common beginner overcorrections</h2>
<ul>
<li><strong>Forcing a forefoot strike:</strong> this can shift load toward the calf, ankle, and Achilles region without guaranteeing a better outcome.</li>
<li><strong>Chasing one cadence number:</strong> step rate must be interpreted with pace, terrain, body dimensions, and comfort.</li>
<li><strong>Standing unnaturally rigid:</strong> running includes rotation and adaptable movement.</li>
<li><strong>Taking tiny steps at every pace:</strong> avoiding an exaggerated reach does not require shuffling.</li>
<li><strong>Pulling the shoulders back hard:</strong> relaxed alignment is different from squeezing the shoulder blades.</li>
<li><strong>Changing shoes and form together:</strong> simultaneous changes make the response harder to understand.</li>
<li><strong>Practising while exhausted:</strong> stop or reduce the session when control is declining rather than reinforcing strained movement.</li>
</ul>

<h2>Use video carefully</h2>
<p>A short recording can reveal tension or a large reach that you did not feel, but one angle is incomplete. Camera height, lens distortion, frame rate, clothing, speed, and route direction can change the appearance. Obtain consent before recording anyone else and avoid blocking a public path.</p>
<p>Record brief clips from the side and front or back only where safe. Compare similar conditions and look for broad patterns rather than drawing lines over every joint. Do not diagnose injury from a phone video.</p>

<h2>When professional assessment may be useful</h2>
<p>Seek appropriate health evaluation for persistent or worsening pain, swelling, weakness, numbness, instability, changed gait, recurrent problems, or symptoms that concern you. A qualified clinician can connect movement to examination, history, training load, and the location of symptoms in a way an online form tip cannot.</p>
<p>A knowledgeable coach may help with performance-focused technique when you are healthy and have a stable base. Clarify the goal, ask why a change is proposed, introduce it gradually, and track comfort as well as appearance. No professional should promise that one cue guarantees injury prevention or a faster result.</p>

<h2>A simple form-check sequence</h2>
<ol>
<li>Choose a flat, familiar, safe route and begin at easy effort.</li>
<li>Notice whether breathing and conversation match the intended session.</li>
<li>Release obvious tension in the face, hands, and shoulders.</li>
<li>Look ahead far enough to navigate safely.</li>
<li>Let the arms swing naturally and avoid manufacturing a precise angle.</li>
<li>Notice deliberate reaching, but do not force a new foot-strike label.</li>
<li>Use one cue briefly, then run normally and review how it felt.</li>
<li>Stop, reduce, or seek help when symptoms—not appearance—make the run concerning.</li>
</ol>

<h2>Practise form without turning it into a workout</h2>
<p>Choose a few short, calm sections within an easy run rather than extending the session to collect more practice. On one section, release the hands and shoulders. On another, notice whether the feet are reaching forward. Later, compare how the same easy effort feels with no cue at all. Walk between attempts if that helps you reset.</p>
<p>A familiar flat path makes observations easier, but it is not the only valid setting. A treadmill can provide a consistent surface while changing visual flow and belt interaction. Grass may feel softer but can hide holes or uneven ground. A track has predictable turns and markings but may encourage pace comparison. Select the safest practical place and keep the goal observational.</p>
<p>Do not add drills, barefoot running, a new shoe, a cadence target, and faster pace together. Each change introduces a different demand, and combining them prevents you from learning what produced discomfort. If a cue makes the stride feel worse, return to normal movement rather than repeating it until it feels compulsory.</p>
<p>Review the result later: Did the cue reduce obvious tension? Could you still breathe at the intended effort? Did any new soreness appear during the following day? Did the movement remain comfortable once attention moved back to the route? A useful cue is understandable and repeatable; it does not require constant surveillance.</p>

<h2>Frequently asked questions</h2>
<h3>Where should my foot land when running?</h3><p>Avoid deliberately reaching far ahead. The exact contact point and strike pattern vary. A comfortable landing near where the body can support it matters more than forcing every runner onto the same part of the foot.</p>
<h3>Should beginners lean forward?</h3><p>A small whole-body inclination can occur naturally, especially with speed or hills. Do not bend sharply at the waist or hold a forced lean. Prioritize balance, breathing, and route awareness.</p>
<h3>Is heel striking bad?</h3><p>No strike pattern is automatically bad. Evidence does not support forcing every uninjured rearfoot striker to change, and moving load to another structure is not the same as removing it.</p>
<h3>Will better running form prevent injury?</h3><p>No technique guarantees prevention. Training load, recovery, health, terrain, previous injury, equipment, and many other factors matter. Form retraining may be useful for a specific assessed problem.</p>
<h3>Do I need a gait analysis?</h3><p>Not simply because you are a beginner. It may be useful when persistent symptoms, repeated problems, disability, or a specific performance question needs individualized assessment.</p>

<h2>Official sources and health note</h2>
<p>A <a href="https://pubmed.ncbi.nlm.nih.gov/35128941/">systematic review of gait-retraining trials</a> found that interventions can alter selected running mechanics, while evidence for performance and clinical outcomes was more limited. A <a href="https://pubmed.ncbi.nlm.nih.gov/31823338/">systematic review of foot-strike changes</a> found no basis for recommending a forced non-rearfoot strike to an uninjured rearfoot runner and described shifts in loading. Another <a href="https://pubmed.ncbi.nlm.nih.gov/34527750/">review of foot strike and running-related injury</a> judged the evidence for a relationship to be low.</p>
<p>This article is general education, not diagnosis, rehabilitation, or individualized coaching. Stop and seek urgent help for emergency symptoms. Consult an appropriately qualified professional when pain, disability, pregnancy, medication, a health condition, previous injury, or clinician advice affects running.</p>
`;

const REQUIRED_HEADINGS = Object.freeze(['There is no single perfect running form','Start with relaxed posture','Keep the head and gaze useful','Let the shoulders and arms move naturally','Keep the hands quiet rather than rigid','Allow the trunk to respond to movement','Understand stride length without reaching forward','Foot placement matters more than one foot-strike label','Cadence is information, not a universal target','Running form changes with pace','Uphill running form','Downhill running form','Running form at easy pace','Common beginner overcorrections','Use video carefully','When professional assessment may be useful','A simple form-check sequence','Practise form without turning it into a workout','Frequently asked questions','Official sources and health note']);
const REQUIRED_LINKS = Object.freeze(['href="/blog/what-is-a-running-base"','href="/blog/running-cadence-explained"','href="/blog/easy-run-explained"','href="/blog/hill-running-for-beginners"','href="/blog/strength-training-for-runners-beginners"']);

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
  if (/everyone must (forefoot|heel) strike|one perfect running form/i.test(text)) errors.push('universal form');
  if (/form change (will|can) prevent every injury|proper form prevents all injuries/i.test(text)) errors.push('injury guarantee');
  if (/cadence must be 180|every runner needs 180/i.test(text)) errors.push('universal cadence');
  if (!/running form for beginners/i.test(text)) errors.push('intent');
  for (const heading of REQUIRED_HEADINGS) if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`heading ${heading}`);
  for (const link of REQUIRED_LINKS) if (!payload.contentHtml.includes(link)) errors.push(`link ${link}`);
  if (errors.length) throw new Error(`Invalid running-form payload: ${errors.join('; ')}`);
  return true;
}

module.exports = { ARTICLE, CANONICAL_SLUG, RAW_CONTENT_HTML, REQUIRED_HEADINGS, REQUIRED_LINKS, buildArticlePayload, validateArticlePayload };
