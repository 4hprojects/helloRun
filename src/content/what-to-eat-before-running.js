'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'what-to-eat-before-running';
const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'What Should You Eat Before a Run? A Beginner’s Guide',
  excerpt: 'Build a flexible pre-run food routine around session length, timing, comfort, familiar carbohydrate foods, and the way your own body responds in training.',
  category: 'Nutrition',
  tags: Object.freeze(['what to eat before running', 'food before running', 'pre run meal', 'pre run snack', 'running breakfast', 'food before a long run', 'what to eat before a 10k', 'Filipino running food']),
  seoTitle: 'What Should You Eat Before a Run? A Beginner’s Guide',
  seoDescription: 'Learn practical pre-run food basics for beginners, including meal timing, easy-to-digest options, short vs long runs, and familiar Filipino food examples.',
  coverImageAlt: 'Paper-collage Filipino beginner runner considering banana, rice, pandesal, egg, and water before an early-morning run'
});

const RAW_CONTENT_HTML = `
<p>Deciding <strong>what to eat before running</strong> starts with three questions: how soon will you run, how long and demanding is the session, and what foods have already felt comfortable for you? A short easy run after an ordinary day may need no special snack. A longer outing after an overnight fast may benefit from familiar food and more planning. Neither choice is a rule for everyone.</p>
<p>For many runners, carbohydrate-rich food supplies useful pre-run energy. The portion, timing, fiber, fat, protein, fluid, and familiarity of that food can influence comfort. A larger mixed meal usually needs more time than a small snack, but digestion varies. The goal is not a perfect menu; it is a repeatable routine that supports the intended activity without avoidable hunger or stomach distress.</p>
<blockquote><strong>The beginner principle:</strong> match familiar food to the run and the available digestion time. Test ordinary options in training, record what happens, and avoid turning a single example into a universal prescription.</blockquote>

<h2>Do you need to eat before every run?</h2>
<p>No single answer fits every run. Consider the time since your last meal, ordinary hunger, the session’s length and intensity, morning or evening timing, health needs, medications, heat, and your previous experience. Some people feel comfortable beginning a short easy run without an extra snack; others feel better after eating something small.</p>
<p>A 2020 <a href="https://pubmed.ncbi.nlm.nih.gov/33198277/">review of pre-exercise nutrition and endurance exercise</a> reported clearer performance benefits from pre-exercise carbohydrate for longer rather than shorter exercise, while emphasizing that duration and intensity change the question. That research does not prove that every longer run requires the same food or that a short fasted run is suitable for every person.</p>
<p>Do not use fasting to earn food or compensate for eating. Recurrent dizziness, faintness, unusual weakness, gastrointestinal symptoms, or anxiety around food deserves appropriate professional attention. People managing diabetes, pregnancy, eating disorders, food allergy, gastrointestinal disease, kidney disease, or other medical concerns need individualized advice rather than a generic running article.</p>

<h2>Short easy run versus a longer session</h2>
<p>For a short, genuinely easy outing, the ordinary meal pattern may already be enough. If lunch was recent and the run is relaxed, an additional pre-run meal may add fullness without clear benefit. If it is early morning and dinner was many hours ago, a small familiar snack may feel helpful even for the same distance.</p>
<p>As duration, intensity, or accumulated climbing rises, starting adequately fueled becomes more relevant. The <a href="/blog/what-is-a-long-run-for-beginners">beginner long-run guide</a> defines “long” relative to the runner rather than by one distance. Food planning should be equally contextual. A session that is routine for one runner may be unusually long for another.</p>
<p>Separate the question of food before the run from food during it. Longer activities may require a tested during-run plan, but that does not justify adding unfamiliar gels, drinks, or supplements at the last minute. This article focuses on what happens before departure.</p>

<h2>Larger meal versus small snack</h2>
<p>A larger meal can provide more energy and variety but generally leaves more food to digest. A small snack may fit a shorter gap yet may not be enough for a long or demanding session. Think of meal size and available time as connected: less time usually favors a smaller, simpler, familiar choice.</p>
<p>Sports Dietitians Australia notes that there is no single best option and advises considering timing, food volume, carbohydrate, fat, fiber, fluid, individual tolerance, and exercise demands in its <a href="https://www.sportsdietitians.com.au/factsheets/pre-exercise-fuelling/">pre-exercise fuelling guidance</a>. Example timings are starting points for experimentation, not deadlines that guarantee digestion.</p>
<p>If you must run soon after an ordinary meal, the sensible adjustment may be to delay the run, shorten it, walk, or keep the effort easier. Trying to override fullness with speed is not a nutrition strategy. Likewise, skipping a needed meal only to preserve a calendar slot may undermine the rest of the day.</p>

<h2>Carbohydrates in simple terms</h2>
<p>Carbohydrate is stored in the body in forms that can help fuel activity, and carbohydrate-containing foods can contribute energy before endurance exercise. Rice, bread, oats, fruit, potatoes, noodles, and many other familiar foods contain carbohydrate. They are examples, not an approved-food list.</p>
<p>The Academy of Nutrition and Dietetics, Dietitians of Canada, and American College of Sports Medicine joint <a href="https://pubmed.ncbi.nlm.nih.gov/26891166/">position statement on nutrition and athletic performance</a> emphasizes that type, amount, and timing should be matched to the athlete and sporting situation, and recommends qualified dietitian support for personalized planning. It does not establish one beginner breakfast or require supplements.</p>
<p>Protein and fat remain parts of ordinary balanced eating, but a heavy combination immediately before running may be uncomfortable for some people. You do not need to isolate pure carbohydrate or calculate grams for every beginner run. Start with familiar food, reasonable hunger, and the session context.</p>

<h2>Why lower-fiber and lower-fat foods may feel easier close to running</h2>
<p>Fiber and fat can slow stomach emptying or contribute to fullness in some runners. When the run is close, a simpler option with less fiber and fat than a normal full meal may reduce discomfort for that person. This is a tolerance strategy, not a judgment that fiber or fat is unhealthy.</p>
<p>High-fiber vegetables, beans, rich sauces, fried foods, or very large portions may work perfectly well earlier in the day yet feel different just before bouncing movement. Spicy food, dairy, caffeine, and sugar alcohols are also highly individual. Keep foods that support ordinary health in the overall diet; adjust only the pre-run window when experience gives a reason.</p>
<p>Do not eliminate broad food groups based on one difficult run. The cause might instead be pace, heat, dehydration, anxiety, illness, menstrual symptoms, medication, or timing. Persistent or severe symptoms need proper assessment.</p>

<h2>How long before running should you eat?</h2>
<p>There is no exact waiting period. Many runners leave a longer gap after a full meal and a shorter gap after a light snack, but the practical interval depends on portion size, composition, intensity, personal digestion, and the day’s circumstances. Rather than adopting a rigid clock, test a range during low-stakes training.</p>
<p>Write down what you ate, roughly when, how hungry or full you felt at the start, the run’s effort and duration, weather, and any symptoms. Repeat the same setup before changing several variables. A pattern across several similar runs is more useful than one unusually good or bad day.</p>
<p>If food still feels present in the stomach, waiting longer is reasonable. If you repeatedly begin hungry and fade early, test an earlier meal or a small familiar snack. A qualified sports dietitian can help when training volume, symptoms, medical needs, or restrictive eating makes the decision complicated.</p>

<h2>What to eat before running in the morning</h2>
<p>Morning runners often choose among three workable structures: an early small snack, a longer lead time for breakfast, or a short easy run followed by breakfast when that is appropriate for them. Sleep matters too. Waking much earlier for a complicated meal can be a poor trade if a simpler tested option works.</p>
<p>Possible small choices include a banana, a piece of pandesal, toast, a small amount of rice, crackers, or another familiar carbohydrate food. Some runners combine this with a little egg, milk, yogurt, nut butter, or another tolerated food; others prefer a simpler snack close to departure. Portion and combination are personal.</p>
<p>Prepare the night before if mornings are rushed. The <a href="/blog/how-to-run-with-a-busy-schedule">busy-schedule guide</a> recommends counting preparation and recovery time, not only moving time. Food storage, safe preparation, bathroom access, commute, and daylight belong in that calculation.</p>

<h2>What to eat before an evening run</h2>
<p>An evening run is shaped by breakfast, lunch, afternoon food, commuting, and the planned dinner. If lunch was early, a familiar afternoon snack may bridge the gap. If dinner must come first, allow a comfortable interval or change the run rather than squeezing hard activity immediately after a large meal.</p>
<p>Examples might include fruit with bread, a small rice-based snack, oats, crackers, or part of an ordinary meal. Avoid framing the snack as extra food that must be burned off. It is part of the day’s nourishment and should be considered alongside hunger, total intake, and the run.</p>
<p>Caffeine late in the day may disrupt sleep for some people, and sleep loss can matter more than any claimed workout boost. Energy drinks also introduce varying caffeine, sugar, and other ingredients. They are not required for beginner running.</p>

<h2>Familiar Filipino food examples</h2>
<p>Accessible local foods can support a pre-run routine without special products. Pandesal, rice, lugaw, oatmeal, saba or lakatan banana, boiled camote, crackers, noodles, and fruit are possible carbohydrate sources. Egg, fish, chicken, tofu, milk, or yogurt may be included when the portion and timing feel comfortable.</p>
<p>A runner with several hours before activity might tolerate rice with a modest familiar ulam. Closer to the run, that same runner might prefer a banana and pandesal, a small bowl of plain lugaw, or another simple snack. These are illustrations only. Fried, spicy, coconut-rich, very fibrous, or large meals may need more digestion time for some runners, while others tolerate them.</p>
<p>Food safety matters in heat. Refrigerate perishable items appropriately, use clean water and containers, and do not eat food that has sat unsafely during travel or at an event venue. A “healthy” ingredient cannot compensate for unsafe storage.</p>

<h2>Foods to test during training, not event day</h2>
<p>Use ordinary training to test one change at a time: the food, portion, timing, or drink. Keep the route and effort familiar where possible. Notice hunger, fullness, reflux, cramping, nausea, bowel urgency, energy, and enjoyment. The objective is not to tolerate the largest possible meal; it is to find a practical setup.</p>
<p>Event morning adds travel, nerves, queues, an unfamiliar start time, heat, and limited bathrooms. A food that worked once at home should still be tested under reasonably similar timing. Pack a backup only if you have used it before and can store it safely.</p>
<p>Do not try a new supplement because another participant recommends it. Products can contain allergens, high caffeine, sugar alcohols, herbs, or undeclared substances. Beginners can build a sound routine from ordinary foods.</p>

<h2>What to eat before a 5K</h2>
<p>A 5K can be a short easy outing, a hard effort, or a long challenge for a new runner. Distance alone does not decide the meal. After a normal meal pattern, a short easy 5K may not require extra food. Before a harder effort or after a long overnight gap, a tested carbohydrate-focused snack or earlier meal may feel more supportive.</p>
<p>Keep the event-day routine close to training. Do not copy an elite runner’s breakfast, force food when nauseated, or deliberately arrive depleted. Check the actual start time, travel, warm-up, and weather. The <a href="/blog/how-long-to-run-5k-10k-21k">distance-time guide</a> can help frame how long the effort may take without promising a finish time.</p>

<h2>What to eat before a 10K</h2>
<p>A beginner 10K usually creates a longer period of activity than a 5K, so an earlier familiar meal or snack may deserve more attention. Consider total time on feet, run-walk breaks, travel, and whether food will also be needed during a particularly long completion.</p>
<p>The <a href="/blog/10k-training-plan-for-beginners">beginner 10K plan</a> treats readiness as a progression, not an event-day trick. Use its longer sessions to rehearse the pre-run routine. If the event starts very early, test the same waking and eating structure beforehand instead of improvising.</p>
<p>Read the live event rules and support information. Available water or food, route access, proof windows, and accepted activity can change the practical plan. Registration does not make a nutrition approach safe or suitable.</p>

<h2>What changes before longer runs</h2>
<p>Longer runs raise the importance of sufficient everyday eating, pre-run fuel, fluids, and possibly during-run intake. They also create more opportunities for stomach problems. Build the plan gradually as distance grows rather than introducing a large meal and multiple products on the same day.</p>
<p>For a 21K goal, preparation should cover repeated long-run practice, not just the final breakfast. The <a href="/blog/21k-half-marathon-for-beginners">21K beginner guide</a> emphasizes a repeatable shorter-distance base and individualized readiness. Runners expecting prolonged activity may benefit from a sports dietitian’s specific guidance.</p>
<p>Heat and humidity can change appetite, thirst, pace, and food safety. A pre-run meal does not replace a sensible hydration strategy, and drinking excessive water is not safer. Topic-specific fluid needs require their own assessment.</p>

<h2>Avoid unfamiliar food before an important activity</h2>
<p>Novelty is one of the easiest pre-run risks to remove. Hotel buffets, event freebies, rich celebratory meals, unfamiliar sports products, and “lucky” foods can wait. Choose something you already know, in a portion and time window you have rehearsed.</p>
<p>If travel makes the normal choice unavailable, identify realistic local substitutes in advance and test them before event day if possible. Check allergen information and storage. Do not assume that a product with similar packaging has the same ingredients.</p>
<p>When no tested option is available, lower the activity’s ambition rather than gambling on a large unfamiliar meal or running in a condition that feels wrong.</p>

<h2>Build your personal pre-run routine</h2>
<ol>
<li><strong>Name the session.</strong> Record its expected time, effort, route, weather, and significance.</li>
<li><strong>Review the day.</strong> Note the last ordinary meal, current hunger, sleep, and constraints.</li>
<li><strong>Choose one familiar option.</strong> Match its size and simplicity to the available time.</li>
<li><strong>Keep the run adjustable.</strong> Delay, shorten, slow, walk, or stop if comfort or safety changes.</li>
<li><strong>Record the result.</strong> Look for repeatable patterns rather than judging one attempt.</li>
<li><strong>Rehearse important days.</strong> Test start time, travel, food, and storage before an event.</li>
<li><strong>Escalate when needed.</strong> Seek qualified help for persistent symptoms or complex needs.</li>
</ol>

<h2>Frequently asked questions</h2>
<h3>Is a banana enough before running?</h3><p>It may be a suitable small snack for some people and sessions, but “enough” depends on the time since eating, run demands, portion, tolerance, and overall diet. It is not a universal prescription.</p>
<h3>Can I run after eating rice?</h3><p>Many runners use rice as familiar carbohydrate food. Meal size, ulam, fat, fiber, spice, and the waiting interval influence comfort. Test an ordinary combination in training.</p>
<h3>Should I run on an empty stomach to burn more fat?</h3><p>Acute fuel use is not the same as guaranteed long-term fat loss or better training. The cited review found little evidence for enhanced long-term fat-burning capacity from fasted training. Suitability is individual.</p>
<h3>Should I drink coffee before a run?</h3><p>Caffeine can affect alertness, the gut, heart sensations, anxiety, medications, and sleep. It is not required. If you already consume it, avoid making a new or larger dose an event-day experiment.</p>
<h3>What if eating before running makes me nauseated?</h3><p>Try a smaller simpler familiar option, more time, or an easier later session. Persistent, severe, or unexplained nausea requires appropriate assessment rather than repeated self-testing.</p>

<h2>Choose familiarity over perfection</h2>
<p>A useful pre-run routine fits the actual session and the runner. Short easy activity may need no special food; longer or harder work often deserves more deliberate preparation. Match portion to time, use familiar carbohydrate foods, preserve ordinary nutrition, and rehearse before important days.</p>
<p>When food, timing, and preparation feel repeatable, <a href="/events">browse current HelloRun events</a> and choose a distance consistent with your present training. Review live event details before registering.</p>

<h2>Official sources and health note</h2>
<p>This guide was reviewed in September 2026 against the 2016 Academy/DC/ACSM joint position statement, a 2020 peer-reviewed pre-exercise nutrition review, and current Sports Dietitians Australia guidance. It provides general education, not medical care, dietetic assessment, treatment for gastrointestinal symptoms, eating-disorder support, or a personalized sports-nutrition plan.</p>
`;

const REQUIRED_HEADINGS = Object.freeze(['Do you need to eat before every run?', 'Short easy run versus a longer session', 'Larger meal versus small snack', 'Carbohydrates in simple terms', 'Why lower-fiber and lower-fat foods may feel easier close to running', 'How long before running should you eat?', 'What to eat before running in the morning', 'What to eat before an evening run', 'Familiar Filipino food examples', 'Foods to test during training, not event day', 'What to eat before a 5K', 'What to eat before a 10K', 'What changes before longer runs', 'Avoid unfamiliar food before an important activity', 'Frequently asked questions', 'Official sources and health note']);
const REQUIRED_LINKS = Object.freeze(['href="/events"', 'href="/blog/10k-training-plan-for-beginners"', 'href="/blog/21k-half-marathon-for-beginners"', 'href="/blog/what-is-a-long-run-for-beginners"', 'href="/blog/how-to-run-with-a-busy-schedule"']);

function buildArticlePayload({ coverImageUrl } = {}) {
  const contentHtml = sanitizeHtml(RAW_CONTENT_HTML).trim();
  const contentText = htmlToPlainText(contentHtml);
  const wordCount = contentText.split(/\s+/).filter(Boolean).length;
  const payload = { ...ARTICLE, tags: [...ARTICLE.tags], contentHtml, contentText, contentRaw: contentText, readingTime: Math.ceil(wordCount / 180), ogImageUrl: String(coverImageUrl || '').trim(), coverImageAlt: ARTICLE.coverImageAlt };
  validateArticlePayload(payload);
  return payload;
}

function validateArticlePayload(payload) {
  const errors = [];
  const text = String(payload.contentText || '');
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 2500 || wordCount > 3000) errors.push('article must contain 2500-3000 substantive words');
  if (ARTICLE.slug !== CANONICAL_SLUG) errors.push('canonical slug');
  if (!payload.title || payload.title.length > 120 || !payload.excerpt || payload.excerpt.length > 220) errors.push('metadata');
  if (!payload.contentHtml || payload.contentHtml.length > 50000 || !payload.contentText || payload.contentText.length > 50000 || payload.contentRaw !== payload.contentText) errors.push('content');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8 || payload.tags.some((tag) => !tag || tag.length > 30)) errors.push('tags');
  if (!payload.seoTitle || payload.seoTitle.length > 160 || !payload.seoDescription || payload.seoDescription.length > 320) errors.push('SEO');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180 || !payload.ogImageUrl) errors.push('cover artwork is required');
  if (/<h1\b/i.test(payload.contentHtml)) errors.push('h1');
  if (/everyone must eat before running|never run without eating/i.test(text)) errors.push('universal meal');
  if (/exactly \d+ calories|must eat \d+ calories/i.test(text)) errors.push('calorie prescription');
  if (/fasted running guarantees|guarantees fat loss/i.test(text)) errors.push('fasting claim');
  if (/every event provides food|pending is approved/i.test(text)) errors.push('event claim');
  if (!/starts with three questions/i.test(text)) errors.push('search intent');
  for (const heading of REQUIRED_HEADINGS) if (!payload.contentHtml.includes('<h2>' + heading + '</h2>')) errors.push('heading ' + heading);
  for (const link of REQUIRED_LINKS) if (!payload.contentHtml.includes(link)) errors.push('link ' + link);
  if (errors.length) throw new Error('Invalid pre-run food payload: ' + errors.join('; '));
  return true;
}

module.exports = { ARTICLE, CANONICAL_SLUG, RAW_CONTENT_HTML, REQUIRED_HEADINGS, REQUIRED_LINKS, buildArticlePayload, validateArticlePayload };
