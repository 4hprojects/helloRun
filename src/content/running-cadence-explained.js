'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'running-cadence-explained';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'Running Cadence Explained: What Beginners Need to Know',
  excerpt: 'Understand steps per minute, cadence and step length, the origin of the 180 idea, device readings, and why beginners do not need one perfect number.',
  category: 'Training',
  tags: Object.freeze([
    'running cadence',
    'steps per minute',
    'running step rate',
    'stride length',
    'beginner running',
    'running form',
    'run tracking',
    'easy running'
  ]),
  seoTitle: 'Running Cadence Explained: What Beginners Need to Know',
  seoDescription: 'Understand running cadence, steps per minute, stride length, and why beginners should focus on comfortable movement instead of chasing one perfect number.',
  coverImageAlt: 'Woodblock-style illustration of a Filipino beginner running comfortably with a subtle sequence of natural footfalls along a tropical park path'
});

const RAW_CONTENT_HTML = `
<p>Running cadence means the total number of steps you take per minute, usually shown as SPM. If both feet together contact the ground 164 times in one minute, your cadence is 164 SPM. It is a description of movement at that moment or across an activity—not a score that every beginner must raise to 180.</p>
<p>You do not need to reach 180 steps per minute to count as a good runner. The number became popular after coach and exercise physiologist Jack Daniels described counting the step rates of elite runners competing at the 1984 Olympics. That observation was valuable, but elite race data are not a universal prescription for beginners running at different speeds, on different terrain, with different bodies.</p>
<p>Use cadence as one data point alongside pace, effort, comfort, route, symptoms, and the purpose of the session. If you are running comfortably without a specific reason to change your gait, an app's colored range or an internet target is not, by itself, a reason to force quicker steps.</p>
<blockquote><strong>The practical answer:</strong> learn how your device defines cadence, observe your natural range during comparable runs, and change it only for a clear individual reason—not to satisfy 180.</blockquote>

<h2>What is running cadence?</h2>
<p>Cadence is step rate. Strava defines running cadence as the rate at which you step on the ground, measured in steps per minute. Most running watches and apps use the same total-steps convention. Cycling cadence uses revolutions per minute, so check the activity type and unit before comparing numbers.</p>
<p>A step occurs from one foot contact to the next foot contact. A full gait cycle or stride traditionally returns to the same foot and contains two steps. Everyday running language sometimes uses “stride” to mean one step, which can create confusion. When someone says 180 strides per minute, ask whether they really mean 180 total steps or 90 full two-step cycles.</p>
<p>Average cadence summarizes an activity, current cadence estimates a shorter window, and lap cadence describes one lap. Running, walking, crossings, and stops can produce an average that hides distinct movement patterns.</p>
<p>Cadence is not pace. Two runners can share 170 SPM while moving at different speeds because their step lengths differ. One runner can also use the same cadence at two nearby speeds while changing step length.</p>
<p>It is also not a complete measure of efficiency, technique, fitness, or safety. A single SPM value cannot show where the foot lands, how effort feels, or why movement changed.</p>

<h2>How cadence is measured</h2>
<h3>Manual counting</h3>
<p>On a safe, steady section, count every foot contact for 30 seconds and multiply by two. Alternatively, count contacts of one foot for 30 seconds and multiply by four. The result estimates total steps per minute. Counting longer can reduce the effect of one missed contact, but do not stare at a timer where route attention matters.</p>
<p>State the method in your notes. Counting one foot for a minute produces roughly half the total-step value because the convention changed, not the cadence.</p>
<h3>Watches and foot sensors</h3>
<p>A wrist watch or foot-mounted sensor can estimate step rate from motion. The exact algorithm, smoothing, sensor location, activity profile, firmware, arm movement, walking segments, and pauses can influence the display. A device value is useful for patterns but is not a laboratory diagnosis of running form.</p>
<h3>Phone apps</h3>
<p>A phone app may use compatible sensor data, infer cadence from phone motion, or omit it. Phone placement can affect signals, so check current documentation and the original recording source before comparing platforms.</p>
<p>If a watch and app disagree, first compare units, moving versus elapsed sections, excluded stops, and whether both use total steps. Do not edit activity evidence merely to make cadence values match.</p>

<h2>Cadence versus step length</h2>
<p>Running speed can be described approximately as step rate multiplied by average distance covered per step. Increase either factor while the other stays constant and speed increases. Real running is more complex because contact time, flight, force, terrain, and body motion also change, but the relationship explains why cadence cannot be interpreted alone.</p>
<p>At a fixed speed, deliberately increasing cadence generally shortens each step. At a fixed cadence, moving faster requires more distance per step. In ordinary running, both can change together. A beginner who speeds up may naturally take somewhat quicker and longer steps rather than selecting one variable consciously.</p>
<p>“Stride length” creates a unit trap. In biomechanics, one stride covers two steps—from one foot contact to the next contact of that same foot. Some consumer platforms label the distance from one foot to the other as stride length. Check the provider's definition before using its number in a formula.</p>
<p>Do not deliberately reach the foot farther in front to create a longer step. That cue can change braking and comfort. Likewise, do not create tiny shuffling steps solely to inflate cadence. Movement changes should have a purpose and be assessed in context.</p>

<h2>Where the 180 steps-per-minute idea came from</h2>
<p>Jack Daniels wrote that he and his wife counted step rates among roughly 47 elite male and female runners during events at the 1984 Los Angeles Olympics, from middle-distance races through the marathon. He reported that only one observed athlete took fewer than 180 steps per minute, with higher rates in shorter events.</p>
<p>That was an observation of selected elite athletes during Olympic competition. It was not a randomized experiment, a sample of new runners, or proof that exactly 180 prevents injury. The athletes were racing at speeds far removed from many beginner easy runs.</p>
<p>The number spread because it is simple. But “many observed elites were at or above 180” describes an observation; “every runner at every pace should use 180” invents a universal rule.</p>
<p>The historical context can still teach a useful lesson: elite runners did not necessarily maintain speed by reaching dramatically farther forward. Yet a beginner should not copy an elite race cadence without accounting for current pace, body dimensions, route, experience, effort, and reason for changing.</p>

<h2>Is there an ideal running cadence?</h2>
<p>There is no single ideal running cadence for every runner. An individual's natural cadence varies across pace, hills, surface, fatigue, walking, and different sessions. Body height and leg length can be associated with cadence, but they do not generate a perfect personal number.</p>
<p>A 2019 study of 82 recreational rearfoot-strike runners found lower cadence among those with longer legs, regardless of injury status. A larger 2017 treadmill reference study found cadence related to speed and body height. These studies help explain variation; they do not provide a calculator that prescribes safe cadence.</p>
<p>Even within one runner, 158 SPM on an easy uphill and 174 SPM on a faster flat segment can both be ordinary. Comparing them without pace and terrain confuses different tasks.</p>
<p>A useful cadence is one that accompanies comfortable, controlled movement for the intended activity. A clinically guided cadence adjustment may be appropriate for a specific presentation, but that is different from declaring an ideal number for the public.</p>

<h2>Why cadence differs between runners</h2>
<ul>
  <li><strong>Speed:</strong> cadence often rises as speed increases, though step length also changes.</li>
  <li><strong>Body dimensions:</strong> height and leg length can influence self-selected step rate and step length.</li>
  <li><strong>Terrain:</strong> hills, trails, turns, and uneven surfaces change foot placement and rhythm.</li>
  <li><strong>Experience and task:</strong> an experienced race effort differs from a beginner's easy run-walk.</li>
  <li><strong>Fatigue:</strong> movement may change across a long activity, but the direction and meaning are not identical for everyone.</li>
  <li><strong>Footwear and surface:</strong> an unfamiliar shoe, treadmill belt, track, road, or trail can change preferred motion.</li>
  <li><strong>Walking and stops:</strong> a blended activity average includes patterns that should not be judged as continuous running.</li>
  <li><strong>Measurement:</strong> sensor location, smoothing, pauses, and total-step versus one-foot conventions affect the number.</li>
</ul>
<p>Because these factors interact, compare cadence only across reasonably similar activities. A change between a hilly humid run-walk and a flat cool 5K does not isolate form.</p>

<h2>Cadence at easy pace versus faster pace</h2>
<p>Cadence commonly increases with speed. A 2025 treadmill study of 30 experienced runners reported mean cadence rising from 169 SPM at 2.68 m/s to 178 SPM at 3.83 m/s. Ground-reaction-force variables also increased with speed. The study shows why a higher cadence observed during faster running cannot automatically be credited with reducing total loading.</p>
<p>Those experienced runners completed controlled treadmill bouts, so their values are not beginner targets. Compare how cadence changes within the same runner and context.</p>
<p>During an easy run, keep the intended effort easy. Do not accelerate merely to move a cadence number into an app's preferred range. If a metronome makes the session harder, tense, or distracting, it is no longer serving an easy-run purpose.</p>
<p>During a faster planned session, both cadence and step length may rise. That does not mean the faster cadence should be copied into recovery running. The <a href="/blog/beginners-guide-to-running-pace">beginner pace guide</a> explains why effort and conditions give essential context to device numbers.</p>

<h2>Should beginners try to increase cadence?</h2>
<p>Not automatically. First observe whether there is a problem to solve. A beginner who is comfortable, building gradually, and not following an individualized gait-retraining plan does not need to manufacture a cadence intervention from one app reading.</p>
<p>A 2022 systematic review and meta-analysis found that increasing step rate generally changed several biomechanical variables, including shorter step length and reduced values for some hip and knee measures. However, it concluded that evidence was insufficient to determine the effects of altering step rate on injury and performance. Most included studies examined immediate effects, and longer-term outcomes remain uncertain.</p>
<p>The same review found very limited evidence that increasing step rate can raise exertion, awkwardness, or effort. Biomechanical change is not automatically clinical benefit.</p>
<p>Cadence retraining may be considered by a qualified clinician or coach for a clear individual goal, especially when symptoms or rehabilitation are involved. The appropriate amount, cue, progression, and monitoring depend on the person. This article does not prescribe a universal 5%, 10%, or SPM increase.</p>

<h2>How to observe cadence without chasing it</h2>
<ol>
  <li><strong>Choose comparable activity.</strong> Use a familiar safe route and an easy effort rather than a race or difficult hill.</li>
  <li><strong>Record normally.</strong> Do not change form during the first observation.</li>
  <li><strong>Check the definition.</strong> Confirm total SPM, data source, and whether stops or walking are included.</li>
  <li><strong>Pair the number with context.</strong> Note pace, terrain, weather, run-walk pattern, comfort, and symptoms.</li>
  <li><strong>Repeat.</strong> Look for a natural range across several similar sessions rather than judging one minute.</li>
  <li><strong>Leave it descriptive.</strong> Do not create a target unless there is a clear reason and suitable plan.</li>
</ol>
<p>For example, Ana's three comfortable flat run-walk sessions show running-segment cadence mostly between 162 and 168 SPM. Her whole-activity averages are lower because they include walking. She records both facts and changes nothing. The data now describe her current routine without inventing a defect.</p>
<p>The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">run-walk guide</a> explains why walking segments are intentional. Compare running with running and walking with walking rather than trying to hold one cadence across both.</p>

<h2>If a qualified plan asks you to adjust cadence</h2>
<p>Follow the individualized rationale and boundaries supplied with the plan. Ask which segments to change, what cue to use, how long to practise, what sensations are acceptable, and when to stop or review. Do not silently turn a short drill into an entire long run.</p>
<p>A metronome or music beat can provide an external cue, but confirm whether one beat represents every step or one foot. Keep volume and awareness appropriate to the route. Do not use audio cues where they mask traffic, warnings, other people, or event instructions.</p>
<p>Maintain the intended pace unless the plan says otherwise. The aim may be slightly shorter steps at similar speed—not simply running faster. Relax the upper body and stop the experiment if it creates pain, significant discomfort, dizziness, loss of safe attention, or an awkward pattern that does not settle.</p>
<p>Introduce one change at a time and review the response later that day and after recovery. A prescribed gait change can redistribute demand rather than remove it. New or worsening symptoms deserve appropriate professional review.</p>

<h2>How to view cadence in running apps and watches</h2>
<p>Cadence may appear as a live field, lap value, activity average, graph, or running-dynamics metric. Its availability depends on the device, sensor, activity type, permissions, and platform. Do not assume a phone recording contains cadence simply because it contains GPS pace.</p>
<p>When reading the graph:</p>
<ul>
  <li>identify where the warm-up, running, walk breaks, crossings, and cooldown occurred;</li>
  <li>compare cadence with pace and elevation at the same time;</li>
  <li>look for sensor dropouts or implausible jumps before interpreting form;</li>
  <li>check whether autopause removed parts of the activity;</li>
  <li>avoid comparing one platform's processed average with another device's live field.</li>
</ul>
<p>If cadence is absent, manual observation is optional; you do not need to buy another device solely to become a legitimate runner. Cadence is supporting information, not required proof for most events. Read the live event rules to know what evidence is actually required.</p>

<h2>Cadence, breathing, and attention</h2>
<p>Step rhythm and breathing rhythm can sometimes appear to synchronize, but neither must follow a fixed ratio. Trying to control a metronome, a breathing count, live pace, and the route simultaneously can overload attention.</p>
<p>Choose one observation at a time in a safe setting. The <a href="/blog/how-to-breathe-while-running">beginner breathing guide</a> explains that effort control comes before a perfect breathing technique. Similarly, cadence should not become a reason to defend an effort that is too hard.</p>
<p>On public roads and shared paths, situational awareness takes priority over counting. Stop watching the device near crossings, traffic, uneven ground, crowds, animals, or severe weather.</p>

<h2>Common mistakes when changing cadence</h2>
<h3>Forcing 180 immediately</h3>
<p>Jumping from a natural easy-run value to 180 because it is famous can change effort and loading abruptly. The number is not universal clearance.</p>
<h3>Speeding up to make the number rise</h3>
<p>Cadence often increases with speed, but this does not demonstrate a successful form change. Keep pace and purpose in view.</p>
<h3>Creating an artificial shuffle</h3>
<p>Tiny tense steps adopted only to inflate SPM can reduce comfort and attention. A higher display is not automatically better movement.</p>
<h3>Comparing different activities</h3>
<p>A trail run, treadmill session, race, walk-run, and easy road run create different data. Compare similar segments before drawing conclusions.</p>
<h3>Ignoring the measurement convention</h3>
<p>Ninety contacts of one foot per minute may be reported informally as 90 or converted to 180 total SPM. Label the unit before reacting.</p>
<h3>Assuming cadence prevents injury</h3>
<p>Biomechanical variables can change without proving fewer injuries. Injury and performance effects remain insufficiently established.</p>
<h3>Changing cadence through pain</h3>
<p>Pain is not evidence that the new number is working. Stop the experiment and obtain suitable assessment rather than forcing adaptation.</p>
<h3>Turning every run into a drill</h3>
<p>Observation and short prescribed practice should not erase easy running, recovery, or route enjoyment. The <a href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school">weekly schedule guide</a> helps keep one metric from taking over the whole week.</p>

<h2>Frequently asked questions</h2>
<h3>What is a good running cadence for beginners?</h3>
<p>There is no universal good number. Record the natural cadence associated with comfortable running at a known pace and context. A qualified individual plan may define a different goal for a specific reason.</p>
<h3>Is 180 cadence good?</h3>
<p>It can be a natural value for some runners and efforts. It is not required for everyone. The famous number came from observations of elite Olympic competitors, not a universal beginner trial.</p>
<h3>Is a cadence below 170 bad?</h3>
<p>Not by itself. Speed, height, leg length, terrain, walking, fatigue, and measurement all matter. One threshold cannot diagnose poor form or injury risk.</p>
<h3>Does higher cadence make you faster?</h3>
<p>Not automatically. Speed reflects both step rate and step length. Increasing cadence while shortening steps can preserve the same speed, and forcing a new rate may increase effort.</p>
<h3>Does cadence prevent overstriding?</h3>
<p>At fixed speed, increasing step rate generally shortens step length, but “overstriding” is a movement assessment, not a cadence threshold. Cadence alone cannot diagnose or guarantee correction.</p>
<h3>Should I use a metronome?</h3>
<p>Only when it serves a clear, appropriate plan and can be used safely. It is optional for observation and should not block environmental sounds or force a universal target.</p>
<h3>Why is my average cadence lower during run-walk?</h3>
<p>The average combines running and walking patterns. Inspect segments separately if the platform permits, and do not treat planned walking as corrupted data.</p>

<h2>Official sources and evidence limits</h2>
<p>This article was reviewed in September 2026. The <a href="https://support.strava.com/en-us/articles/15401948-what-is-cadence-on-strava">Strava cadence definition</a> supports the total steps-per-minute terminology. Jack Daniels' own <a href="https://news.vdoto2.com/2018/11/stride-rate/">account of observing stride rate at the 1984 Olympics</a> supplies historical context for the 180 figure.</p>
<p>The 2022 systematic review <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9441414/">What is the Effect of Changing Running Step Rate on Injury, Performance and Biomechanics?</a> is the main evidence source for biomechanical changes and the conclusion that injury and performance evidence is insufficient. A <a href="https://pubmed.ncbi.nlm.nih.gov/40620407/">2025 treadmill study of running speed and cadence</a> supplies the limited example showing cadence rising with speed in experienced runners.</p>
<p>The study <a href="https://pubmed.ncbi.nlm.nih.gov/30862272/">Is Cadence Related to Leg Length and Load Rate?</a> and a <a href="https://pubmed.ncbi.nlm.nih.gov/28886463/">treadmill reference study of speed and body dimensions</a> support the explanation that individual and task factors affect cadence. Each study has a specific sample and design; none defines a universal beginner target.</p>
<p>This is general education, not personal coaching, gait analysis, injury prevention, diagnosis, treatment, rehabilitation, or medical clearance. Cadence measurement, research, device behavior, and platform documentation can change.</p>

<h2>Use cadence as one data point</h2>
<p>For your next suitable easy run or run-walk, let movement stay natural. If cadence is already recorded, compare it with pace, terrain, walking segments, effort, and comfort afterward. You do not need to change the number simply because it differs from 180.</p>
<p>Keep cadence in its proper place: one descriptive field in a much larger running story. When you want a manageable goal, <a href="/events">browse current HelloRun events</a> and read the live distance and activity rules. The <a href="/blog/10k-training-plan-for-beginners">beginner 10K framework</a> prioritizes repeatable effort and recovery rather than a cadence threshold.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'What is running cadence?',
  'How cadence is measured',
  'Cadence versus step length',
  'Where the 180 steps-per-minute idea came from',
  'Is there an ideal running cadence?',
  'Why cadence differs between runners',
  'Cadence at easy pace versus faster pace',
  'Should beginners try to increase cadence?',
  'How to observe cadence without chasing it',
  'If a qualified plan asks you to adjust cadence',
  'How to view cadence in running apps and watches',
  'Common mistakes when changing cadence',
  'Frequently asked questions',
  'Official sources and evidence limits',
  'Use cadence as one data point'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/blog/beginners-guide-to-running-pace"',
  'href="/blog/run-walk-method-beginner-friendly-way-build-endurance"',
  'href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school"',
  'href="/blog/how-to-breathe-while-running"',
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
  if (wordCount < 2500 || wordCount > 3000) errors.push('article must contain 2500-3000 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('cover artwork is required for publication');
  if (/<h1\b/i.test(payload.contentHtml)) errors.push('body must not contain a page-level h1');
  if (/<h[12]>Running Cadence Explained:/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/(?:every|all) runners? (?:must|should|need to) (?:run at|reach|maintain) 180|180 (?:SPM|steps per minute) is (?:ideal|best|required|perfect) for (?:everyone|all runners)/i.test(text)) errors.push('article must not prescribe 180 universally');
  if (/(?:every|all) beginners? (?:must|should) increase cadence|cadence below 170 is (?:bad|unsafe|wrong)/i.test(text)) errors.push('article must not mandate a cadence increase');
  if (/(?:higher|increased|180) cadence (?:guarantees|prevents all|will prevent) (?:injury|injuries|pain)|cadence guarantees? (?:speed|performance)/i.test(text)) errors.push('article must not guarantee cadence outcomes');
  if (/(?:everyone|all runners) (?:must|should) increase (?:cadence|step rate) by (?:5|10)%|universal (?:5|10)% cadence increase/i.test(text)) errors.push('article must not prescribe a universal percentage change');
  if (/metronome (?:is|required|must be used) for every runner|every runner (?:must|should) use a metronome/i.test(text)) errors.push('article must not require a metronome');
  if (/(?:push|run|continue) through pain to (?:adapt|raise cadence)|pain means the cadence change is working/i.test(text)) errors.push('article must not encourage running through pain');
  if (!/You do not need to reach 180 steps per minute to count as a good runner/i.test(text)) errors.push('article must answer 180 intent early');
  if (!/evidence was insufficient to determine the effects of altering step rate on injury and performance/i.test(text)) errors.push('article must state evidence limits');
  if (!/reviewed in September 2026/i.test(text)) errors.push('article must disclose review date');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }
  if (errors.length) throw new Error(`Invalid running cadence guide payload: ${errors.join('; ')}`);
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
