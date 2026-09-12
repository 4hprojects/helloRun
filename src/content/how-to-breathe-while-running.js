'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-breathe-while-running';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Breathe While Running',
  excerpt: 'Learn how effort, natural breathing, the talk test, run-walk breaks, hills, and simple adjustments can make breathing during an easy run more manageable.',
  category: 'Training',
  tags: Object.freeze([
    'running breathing',
    'beginner running',
    'breathing rhythm',
    'talk test',
    'easy running',
    'run walk method',
    'running form',
    'effort control'
  ]),
  seoTitle: 'How to Breathe While Running: A Beginner-Friendly Guide',
  seoDescription: 'Learn practical ways to manage your breathing while running, including effort control, breathing rhythm, run-walk breaks, and common beginner mistakes.',
  coverImageAlt: 'Editorial illustration of a Filipino beginner running easily on a tropical park path with soft airflow ribbons suggesting relaxed natural breathing'
});

const RAW_CONTENT_HTML = `
<p>If you are wondering how to breathe while running, adjust effort before trying to perfect a technique. Slow the pace, shorten the running portion, walk until breathing settles, or choose an easier route. For an easy run, breathing should generally remain controlled enough for comfortable phrases or conversation. There is no single nose-versus-mouth rule or step-count rhythm that every runner must follow.</p>
<p>Breathing becomes faster and deeper as working muscles need more oxygen and produce more carbon dioxide. That response is expected. The useful question is not whether you can keep breathing exactly as you do at rest; it is whether the breathing matches the activity you intended and settles when effort falls.</p>
<p>This guide offers general education for beginner running. It cannot diagnose breathlessness, asthma, exercise-induced bronchoconstriction, heart or lung conditions, anxiety, anaemia, infection, or another cause. New, severe, unexplained, recurrent, or worsening breathing difficulty deserves appropriate professional assessment.</p>
<blockquote><strong>The short answer:</strong> begin slowly, allow your nose and mouth to work naturally, use the talk test as an effort cue, and take a planned walk break before breathing becomes chaotic. Technique cues are optional; reducing effort is the first adjustment.</blockquote>

<h2>Why breathing feels difficult when you start running</h2>
<p>Running asks more of the body than quiet sitting or ordinary walking. Breathing rate and depth rise to support that work. A beginner may also start faster than intended, tense the shoulders, choose a hill, run in hot and humid weather, or attempt a continuous run before that duration is familiar. Each factor can make the same pace feel different.</p>
<p>The opening minutes are a common trouble spot. Excitement, a hill, other runners, or an old pace can make an easy session much harder. Start with walking, enter the running portion conservatively, and let the first minutes reveal today's effort.</p>
<p>Breathlessness is also personal. Fitness, current health, sleep, stress, environment, altitude, medicines, pregnancy or postpartum status, disability, and recent illness can change the response. Another runner's smooth breathing at a particular speed does not define an appropriate speed for you.</p>

<h2>Control effort before changing breathing technique</h2>
<p>A breathing trick cannot turn an overly hard pace into an easy pace. If you intended an easy run but can only force out isolated words, slow down. If that is not enough, walk. A longer walk break, flatter route, shorter session, or cooler time of day may be the correct training adjustment.</p>
<p>The US Centers for Disease Control and Prevention describes the talk test as one way to estimate relative intensity. During moderate activity, a person can generally talk but not sing; during vigorous activity, only a few words may be possible before pausing for breath. These are broad population cues, not exact zones, medical tests, or a requirement to speak continuously.</p>
<p>During an intended easy session, try one natural sentence at a safe moment. If only a few words are possible, ease off. Do not speak where it would distract from route safety; effort, symptoms, and conditions still matter.</p>
<p>The <a href="/blog/beginners-guide-to-running-pace">beginner running pace guide</a> explains why pace changes with terrain, weather, fatigue, and experience. Breathing is one useful input among several; it is not a number that must be defended.</p>

<h2>Nose or mouth: which should you use?</h2>
<p>Use the airway combination that lets you breathe comfortably at the current effort. At very light effort, some runners naturally breathe through the nose or use the nose and mouth together. As demand rises, opening the mouth can move air more comfortably. Mouth breathing during running is not evidence that you have failed at technique.</p>
<p>Do not force nose-only breathing to prove that a run is easy. If closing the mouth creates air hunger, anxiety, light-headedness, or an awkward stride, allow natural breathing and reduce effort. Conversely, a runner who comfortably uses nasal breathing during a gentle warm-up does not need to change simply because another person prefers the mouth.</p>
<p>Research on specific running-breathing strategies is limited, so small studies should not become universal rules. During a safe, easy section, notice breathing without forcing it. Continue if it is calm; open the mouth, slow, or walk if it becomes strained. The goal is comfortable ventilation—not loyalty to one airway.</p>

<h2>Let breathing rhythm stay natural</h2>
<p>Runners sometimes match breaths to foot strikes, using descriptions such as three steps in and three out, or two steps in and two out. A rhythm can be an optional attention cue, especially when a runner is unknowingly holding the breath or rushing the exhale. No particular ratio is proven best for every runner, speed, hill, or body.</p>
<p>If counting makes you tense, abandon the count. Let breathing find a rhythm that changes with effort. On a gentle section, breaths may span more steps. On a hill, they may become quicker. During a walk break, the rhythm changes again. Variation is normal.</p>
<p>To explore a cue, notice several breaths on a flat, low-risk section, then try a comfortable exhale. Count only if it helps you relax; never delay an inhale for a foot-strike pattern. Evidence cannot promise that a ratio prevents stitches, fatigue, or injury, so treat rhythm as awareness—not protection.</p>
<p>The <a href="/blog/running-cadence-explained">running cadence guide</a> separates breathing counts from total steps per minute and explains why 180 SPM is not a universal target.</p>

<h2>Use the talk test on an easy run</h2>
<p>The talk test is most useful when paired with the purpose of the session. An easy run should not quietly become a time trial. After warming up, say a short familiar sentence at a safe moment. Notice whether it comes naturally, requires a large gasp, or cannot be completed.</p>
<ul>
  <li><strong>Comfortable phrase or sentence:</strong> keep observing; pace may suit an easy effort today.</li>
  <li><strong>Only a few words:</strong> slow down or walk if the session was meant to be easy.</li>
  <li><strong>Unable to speak because breathing is severely difficult:</strong> stop the activity and respond to the symptoms and surroundings rather than attempting another technique.</li>
</ul>
<p>The talk test becomes less useful if talking itself is unsuitable, communication differs for the runner, or a health professional has supplied a different monitoring approach. It also does not diagnose the reason for unusual shortness of breath. Use an accessible cue appropriate to you, such as perceived effort or an individualized plan.</p>

<h2>Relax the parts that do not need to work hard</h2>
<p>Check whether the jaw, hands, and shoulders carry unnecessary tension. Hold the hands lightly, release the jaw, and let the shoulders sit away from the ears.</p>
<p>A tall but unforced posture can leave room for comfortable movement. Avoid exaggerating the chest upward, pulling the shoulders rigidly back, or bending at the waist to chase air. On an uphill section, a small whole-body lean appropriate to the slope is different from collapsing through the torso.</p>
<p>Do not force the deepest possible breath each cycle. Think “comfortable and complete,” and stop any prolonged exhale that creates dizziness.</p>

<h2>What to do when breathing becomes uncomfortable</h2>
<p>Respond early. Waiting until the running portion feels desperate makes it harder to judge the route and the symptoms. Use the following sequence as a general decision aid:</p>
<ol>
  <li><strong>Reduce pace.</strong> Shorten the stride naturally and let speed fall without braking abruptly in another runner's path.</li>
  <li><strong>Walk.</strong> Continue only if walking is safe and symptoms are mild and improving. There is no penalty for a longer reset.</li>
  <li><strong>Check the environment.</strong> Move away from traffic, smoke, extreme heat, a steep grade, or another avoidable exposure when possible.</li>
  <li><strong>Release tension.</strong> Unclench the hands and jaw, lower the shoulders, and let breathing happen through the nose and mouth as needed.</li>
  <li><strong>Reassess.</strong> Resume easy running only if breathing has settled, there are no concerning symptoms, and continuing is appropriate.</li>
  <li><strong>End the session when needed.</strong> A shortened run is useful information. Do not add harder intervals later to repay it.</li>
</ol>
<p>If the problem repeats at low effort or is unusual for you, record the circumstances and seek qualified assessment.</p>

<h2>How run-walk breaks help breathing control</h2>
<p>Planned walking is a pacing tool, not a failure to run. It lowers demand before form and breathing become disorganized and gives the runner a repeatable way to manage an unfamiliar duration. The NHS Couch to 5K programme is one public example that alternates running and walking and places recovery between running days.</p>
<p>Choose a time, landmark, or effort cue before starting. Begin the run gently and walk long enough for breathing and attention to settle.</p>
<p>The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">run-walk method guide</a> explains how to select and adjust cues. If one minute of running produces rushed breathing, that is not a command to repeat one minute forever. Shorten the run, extend the walk, or use walking first. If a pattern is comfortable, repeat it before making one change.</p>
<p>Walk breaks can remain part of longer-distance preparation. The <a href="/blog/10k-training-plan-for-beginners">beginner 10K training framework</a> keeps run-walk available throughout its eight illustrative weeks rather than treating continuous running as a prerequisite.</p>

<h2>Breathing on hills</h2>
<p>A hill raises effort even when pace falls. Slow before the breathing becomes uncontrolled, shorten the stride, and accept that the device may show a much slower pace. Walking early on a steep section can preserve attention and make the rest of the route more manageable.</p>
<p>Do not preserve flat-ground pace, count, and stride on a hill. Keep the intended effort, walk if needed, and regain control on the descent instead of chasing lost time.</p>
<p>Route choice is a training decision. A flatter loop may be more useful while learning easy effort; a hill can be introduced later as terrain, not as a breathing test. The <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe-route guide</a> covers lighting, crossings, surface, signal, weather exposure, and backup planning.</p>

<h2>Breathing during longer runs</h2>
<p>Longer does not need to mean harder. Begin below the effort you believe you can sustain, particularly in the first third. Use planned walk breaks before urgency appears, and adjust for hills, heat, humidity, wind, surface, and accumulated fatigue.</p>
<p>Breathing that gradually becomes less conversational can signal pace drift or rising environmental strain. Reduce speed while the adjustment is small. A faster final section is not required. If the intended easy effort cannot be restored, shorten the route or finish walking when safe.</p>
<p>In hot and humid conditions, the same pace can create greater strain. Use the <a href="/blog/how-to-run-safely-during-hot-and-humid-weather">hot-weather running guide</a> for timing, route, hydration access, and symptom guidance. Poor air quality, smoke, and respiratory infection are different issues; check suitable local advice and postpone when conditions are unsafe.</p>
<p>Afterward, note overall effort, weather, route, breathing, symptoms, and recovery—not only pace. A pattern across several activities is more informative than one difficult day. The <a href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back">post-run recovery guide</a> explains when easing back may be appropriate.</p>

<h2>Common beginner breathing mistakes</h2>
<h3>Starting at the pace you hope to finish</h3>
<p>The early pace can feel easy before breathing catches up. Start conservatively, especially with a group or after a break. A controlled opening creates room to adjust.</p>
<h3>Forcing nose-only breathing</h3>
<p>Nasal breathing is not a universal test of easy pace. Allow the mouth to contribute when needed and use effort, symptoms, and context to decide whether to slow down.</p>
<h3>Trying to obey a perfect step ratio</h3>
<p>A count that helps one runner can distract another. Do not hold or rush a breath to land on a particular foot. Natural variation is acceptable.</p>
<h3>Waiting too long for a walk break</h3>
<p>Walking while still in control is easier than recovering from an all-out running portion. Plan breaks or respond at the first sign the intended effort is slipping.</p>
<h3>Treating every breathless session as lack of fitness</h3>
<p>Weather, hills, illness, stress, poor recovery, airway conditions, and other factors can contribute. Repeated or disproportionate symptoms need appropriate attention, not automatic extra training.</p>
<h3>Trying to catch up after stopping</h3>
<p>Do not sprint or double a later session after an early finish. A missed portion is not training debt.</p>

<h2>When slowing down is the answer</h2>
<p>Slow down when the intended easy effort no longer feels easy, the talk test changes sharply, form becomes tense, concentration narrows, or conditions add more strain than planned. Pace is an output of the day, not a promise. Walking may be the correct pace.</p>
<p>For someone <a href="/blog/returning-to-running-after-a-break-gradual-restart-plan">returning to running after a break</a>, old pace can be especially misleading. Use current repeatable activity, not a previous personal best, to set the session. If several weeks of easy run-walk are appropriate, that is training—not a delay before “real” running.</p>
<p>End the activity if slowing does not settle mild symptoms, if conditions are worsening, or if safe attention is compromised. Seek urgent help for severe breathing difficulty; chest pain or pressure; fainting or near-fainting; blue, grey, or unusually pale lips or skin; confusion; or another emergency sign. Local emergency guidance and an individual's care plan take priority over this article.</p>

<h2>When breathing symptoms need assessment</h2>
<p>Exercise-related cough, wheeze, chest tightness, and shortness of breath can occur with exercise-induced bronchoconstriction, but those symptoms are not specific enough to diagnose it. The American Thoracic Society guideline bases diagnosis on changes in lung function after exercise or another challenge, not symptoms alone.</p>
<p>Arrange assessment for symptoms that are new, recurrent, worsening, disproportionate, slow to settle, or limiting low-intensity activity—especially with wheeze, chest tightness, persistent cough, faintness, a known condition, or recent illness. Follow existing clinical plans; do not replace them with breathing drills.</p>
<p>Do not borrow another person's inhaler or diagnose yourself from a social-media checklist. A qualified clinician can consider the pattern, health history, exposures, medicines, and appropriate testing. If symptoms are severe or feel like an emergency, stop and seek emergency help.</p>

<h2>A simple breathing practice for your next easy session</h2>
<ol>
  <li><strong>Before:</strong> choose a safe, preferably flat route and decide that pace may change. Check current health and conditions.</li>
  <li><strong>Warm up:</strong> walk easily and let breathing increase gradually. Notice tension without forcing a special pattern.</li>
  <li><strong>Begin:</strong> enter a very easy run or run-walk. Let the nose and mouth work naturally.</li>
  <li><strong>Check:</strong> at a safe moment, use a short phrase or accessible perceived-effort cue. If the intended easy effort is already too high, adjust now.</li>
  <li><strong>Reset:</strong> walk until breathing and attention settle. Relax the hands, jaw, and shoulders.</li>
  <li><strong>Repeat or finish:</strong> resume only when appropriate. Repeating a comfortable pattern is more useful than forcing a longer interval.</li>
  <li><strong>Review:</strong> record what pace, route, conditions, and run-walk pattern kept breathing controlled.</li>
</ol>
<p>This is an observation practice, not a respiratory treatment or performance test. One session cannot prove the cause of symptoms or the best long-term plan.</p>

<h2>Frequently asked questions</h2>
<h3>Should I breathe through my nose or mouth while running?</h3>
<p>Use whichever combination feels comfortable and supplies enough air. Nose-only breathing is not mandatory. At higher effort many runners naturally use the mouth more; if breathing feels strained during an intended easy run, reduce effort rather than forcing one airway.</p>
<h3>What is the best breathing rhythm for running?</h3>
<p>There is no single best step ratio for everyone. A count such as 3:3 or 2:2 may be an optional awareness cue, but it should change or disappear when terrain and effort change. Never hold the breath to preserve a count.</p>
<h3>Why am I out of breath after one minute?</h3>
<p>The running portion may currently be too fast or too long, or hills, heat, health, and other factors may be contributing. Slow down, shorten the run interval, and extend walking. Seek assessment when breathlessness is unusual, recurrent, worsening, or disproportionate.</p>
<h3>Can breathing exercises prevent side stitches?</h3>
<p>No technique can promise prevention. Slowing down, avoiding a rushed start, and using a comfortable exhale may help some runners manage a mild stitch, but persistent, severe, or unusual pain should not be self-diagnosed as a stitch.</p>
<h3>Should I keep running through wheezing?</h3>
<p>No universal article can clear that choice. Stop or reduce activity, follow any personal clinical plan, and seek suitable assessment for wheeze—especially when it is new, recurrent, worsening, or accompanied by chest tightness or significant breathlessness. Severe symptoms require urgent help.</p>

<h2>Official sources and scope</h2>
<p>This article was reviewed in September 2026. The <a href="https://www.cdc.gov/physical-activity-basics/measuring/index.html">CDC intensity guide</a> supports the talk-test description. The <a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/">NHS Couch to 5K plan</a> provides an example of run-walk progression and recovery.</p>
<p>The peer-reviewed review <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC8967998/">Breath Tools: A Synthesis of Evidence-Based Breathing Strategies to Enhance Human Running</a> describes possible strategies while emphasizing limitations in direct experimental evidence. The <a href="https://www.thoracic.org/statements/resources/allergy-asthma/exercise-induced-bronchoconstriction.pdf">American Thoracic Society clinical practice guideline on exercise-induced bronchoconstriction</a> supports the distinction between symptoms and diagnosis.</p>
<p>Population guidance and research summaries are not personal training plans, medical advice, diagnosis, clearance, rehabilitation, or a guarantee of performance. Evidence can change, and source applicability varies. Use qualified individual guidance when health, disability, pregnancy or postpartum status, medicines, recent illness, or symptoms affect activity.</p>

<h2>Try the cues, then keep the ones that help</h2>
<p>On your next suitable easy run or run-walk, begin more slowly than usual, let the nose and mouth work naturally, and use one brief talk-test check. If effort rises, reduce it early. Keep a breathing rhythm only if it helps you relax; discard it if it creates tension.</p>
<p>When you are ready to put that practice into a real activity, <a href="/events">browse current HelloRun events</a>, read the live rules, and choose an option that fits your present ability and schedule. Tracking records what happened; it does not replace safe pacing, event eligibility rules, review, or personal health guidance.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Why breathing feels difficult when you start running',
  'Control effort before changing breathing technique',
  'Nose or mouth: which should you use?',
  'Let breathing rhythm stay natural',
  'Use the talk test on an easy run',
  'What to do when breathing becomes uncomfortable',
  'How run-walk breaks help breathing control',
  'Breathing on hills',
  'Breathing during longer runs',
  'Common beginner breathing mistakes',
  'When slowing down is the answer',
  'When breathing symptoms need assessment',
  'Frequently asked questions',
  'Official sources and scope',
  'Try the cues, then keep the ones that help'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/blog/run-walk-method-beginner-friendly-way-build-endurance"',
  'href="/blog/returning-to-running-after-a-break-gradual-restart-plan"',
  'href="/blog/10k-training-plan-for-beginners"',
  'href="/blog/running-cadence-explained"',
  'href="/blog/beginners-guide-to-running-pace"',
  'href="/blog/how-to-run-safely-during-hot-and-humid-weather"',
  'href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back"'
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
  if (/<h[12]>How to Breathe While Running/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/(?:must|should|need to) breathe (?:only )?through (?:the )?nose|nose-only breathing is (?:required|best for everyone)/i.test(text)) errors.push('article must not mandate nasal breathing');
  if (/(?:must|should|need to) breathe (?:only )?through (?:the )?mouth|mouth-only breathing is (?:required|best for everyone)/i.test(text)) errors.push('article must not mandate mouth breathing');
  if (/(?:everyone|every runner) (?:must|should|needs to) (?:use|follow|breathe).{0,40}(?:2:2|3:2|step rhythm)|(?:2:2|3:2) is the best rhythm for (?:everyone|all runners)/i.test(text)) errors.push('article must not prescribe a universal breathing rhythm');
  if (/(?:breathing|this technique|this rhythm) guarantees? (?:faster running|more endurance|better performance|no fatigue)|(?:breathing|this technique|this rhythm) prevents? (?:all )?(?:fatigue|side stitches|injur)/i.test(text)) errors.push('article must not guarantee breathing outcomes');
  if (/diagnos(?:e|es|ed|ing) (?:yourself with )?(?:asthma|exercise-induced bronchoconstriction)|wheezing (?:always|definitely) means asthma/i.test(text)) errors.push('article must not diagnose breathing conditions');
  if (/(?:always|must|should) (?:push|run|keep running) through (?:chest tightness|wheezing|severe breathlessness)/i.test(text)) errors.push('article must not encourage running through concerning symptoms');
  if (/(?:must|should) make up .{0,50} by (?:sprinting|doubling|running twice)|remove recovery to catch up/i.test(text)) errors.push('article must not prescribe unsafe catch-up activity');
  if (!/adjust effort before trying to perfect a technique/i.test(text)) errors.push('article must answer breathing intent early');
  if (!/Population guidance and research summaries are not personal training plans, medical advice, diagnosis/i.test(text)) errors.push('article must distinguish general guidance from personal advice');
  if (!/reviewed in September 2026/i.test(text)) errors.push('article must disclose methodology date');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid running breathing guide payload: ${errors.join('; ')}`);
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
