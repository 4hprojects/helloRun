'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='hydration-for-runners';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'Hydration for Runners: Short Runs, Long Runs, and Hot Weather',excerpt:'Learn how run duration, heat, sweat, route access, ordinary meals, and individual health shape fluid decisions—without following one universal drinking amount.',category:'Nutrition',tags:Object.freeze(['hydration for runners','running hydration','water before running','water during running','hydration for long runs','hot weather hydration','electrolytes for runners','Philippines running']),seoTitle:'Hydration for Runners: Short Runs, Long Runs, and Hot Weather',seoDescription:'Understand practical hydration for runners before, during, and after short or long runs, especially in hot and humid conditions.',coverImageAlt:'Stained-glass Filipino beginner runner planning a sunny route with a water bottle, shade, and a public refill point'});
const RAW_CONTENT_HTML=`
<p><strong>Hydration for runners</strong> is not one bottle size, one hourly number, or one rule for every distance. Fluid needs change with duration, effort, heat, humidity, sun, clothing, body size, sweat rate, acclimatization, food, health, medications, and access along the route. The useful question is not “How much must every runner drink?” but “What does this runner need for this activity without underdrinking or overdrinking?”</p>
<p>For a short easy run in mild conditions, starting normally hydrated may be enough and carrying water may be optional. A longer outing in Philippine heat can require planned access, a tested carrying method, and sometimes electrolytes or carbohydrate. Even then, drinking beyond losses is not protective.</p>
<blockquote><strong>The hydration principle:</strong> begin in an ordinary hydrated state, plan realistic access for the route and conditions, respond to thirst and other context, and never force fluid merely to satisfy a schedule.</blockquote>

<h2>Hydration needs differ between runners</h2>
<p>Two people on the same route can sweat differently. Pace, fitness, heat acclimatization, genetics, body size, clothing, medications, illness, and the previous day all influence fluid balance. One runner’s bottle may last the whole activity while another uses a refill point.</p>
<p>The National Athletic Trainers’ Association <a href="https://pubmed.ncbi.nlm.nih.gov/28985128/">fluid-replacement position statement</a> emphasizes individualized practices that avoid both insufficient and excessive intake. It supports estimating sweat responses across environments; it does not provide one compulsory volume for every recreational runner.</p>
<p>Online calculators can only estimate. Advice designed for elite athletes, military work, or long races may not fit an easy neighborhood run. People with kidney, heart, endocrine, blood-pressure, or fluid-balance conditions—and those using relevant medicines—need clinical guidance rather than a generic plan.</p>

<h2>Start the run normally hydrated</h2>
<p>Hydration begins across the day, not with last-minute chugging. Drink with meals and according to ordinary thirst and circumstances. Food contributes water and electrolytes too. Arriving at the start after a normal day is different from trying to correct obvious dehydration minutes before activity.</p>
<p>Do not force several bottles immediately before running. This can create discomfort, repeated bathroom stops, and potentially excessive intake. Pale urine is sometimes used as one clue, but urine color varies with vitamins, food, medicines, and timing and cannot certify readiness.</p>
<p>If illness has caused vomiting, diarrhea, fever, or poor intake, postponing the run may be safer than attempting a rapid fluid correction. A running article cannot assess dehydration or medical readiness.</p>
<p>Normal hydration also includes not restricting fluid to change scale weight or appearance. Deliberate dehydration, sauna use, heavy clothing, and diuretics are unsafe shortcuts. A number on the scale is not a running-readiness measure. If drinking or body checking has become rigid or distressing, seek appropriate health support.</p>

<h2>Water before running</h2>
<p>Before departure, consider recent drinks and meals, current thirst, urine pattern, weather, travel, and the planned session. A modest familiar drink may fit; a rigid preload does not. Give yourself enough time to notice comfort and use the bathroom.</p>
<p>Coffee, tea, juice, milk, soup, and watery foods contribute fluid, although ingredients and tolerance differ. Alcohol can impair judgment and recovery and is not a hydration strategy. Energy drinks are not necessary and may contain high caffeine or other stimulants.</p>
<p>Do not start solely because a watch or bottle says hydration is complete. Symptoms, environment, and health still matter.</p>

<h2>Should you carry water on a short run?</h2>
<p>Many short easy runs in tolerable conditions can be completed without drinking during the activity when the runner starts normally hydrated. Carrying water can still be sensible if heat is high, the runner prefers it, access is uncertain, medicines or health needs change the situation, or the outing may extend.</p>
<p>A 5K is not one duration. It may take twenty minutes for one person and well over an hour with walking for another. Use expected time, effort, exposure, and distance from safe water rather than the category name alone.</p>
<p>If carrying fluid makes you feel safer, choose a bottle, belt, vest, or loop route that does not alter movement dangerously. Test it on an easy outing. There is no prize for running empty-handed.</p>

<h2>Hydration for longer runs</h2>
<p>Longer time on feet increases opportunities for fluid loss and weather change. Before starting, identify how much fluid you can safely carry, reliable refill points, toilets, shade, exits, and a way to shorten the route. Do not rely on a shop being open or a public tap being potable without verification.</p>
<p>The <a href="/blog/what-is-a-long-run-for-beginners">long-run guide</a> defines “long” relative to present training. A beginner may need a plan on a distance another runner completes between drinks. Increase duration and hydration complexity gradually.</p>
<p>Practice the event setup during training. Test bottle access while walking first, check for bouncing or chafing, and learn whether the drink remains palatable when warm. Never attempt to fill a bottle while running across traffic or on unstable ground.</p>
<p>Build redundancy into remote or point-to-point routes. One dropped bottle, closed gate, contaminated tap, or longer-than-expected return should not create an immediate crisis. That may mean carrying a backup, running with suitable support, choosing repeated loops, or selecting a shorter venue. The right solution depends on the route; carrying more is not automatically better when it increases heat and load.</p>

<h2>Hot and humid weather</h2>
<p>Heat raises the importance of the whole safety plan, not only water. Humidity can limit sweat evaporation, so a soaked shirt does not prove effective cooling. Direct sun, still air, reflected heat, and warm nights can increase strain.</p>
<p>CDC guidance for <a href="https://www.cdc.gov/heat-health/risk-factors/heat-and-athletes.html">athletes in hot conditions</a> advises changing timing, pacing activity, using suitable clothing, monitoring one another, and stopping for faintness or weakness. Fluid cannot make an unsafe heat exposure safe.</p>
<p>The <a href="/blog/how-to-run-safely-during-hot-and-humid-weather">HelloRun hot-weather guide</a> covers acclimatization, route changes, cooling, symptoms, and emergency action. Check current DOST-PAGASA forecasts, warnings, and <a href="https://pagasa.dost.gov.ph/weather/heat-index">heat-index information</a>. Move indoors, shorten, slow, walk, or postpone when conditions call for it.</p>

<h2>Sweat varies from person to person</h2>
<p>Sweat rate is not a badge of fitness. It changes with conditions and can vary within the same person. Salt concentration also differs, which is why visible salt marks alone cannot produce an exact electrolyte prescription.</p>
<p>Some runners estimate net fluid change by comparing body mass immediately before and after a representative session while accounting for drinks and bathroom losses. This can offer context, but consumer scales, clothing, food, and measurement timing introduce error. Do not repeatedly weigh yourself if it worsens anxiety, body-image concerns, or disordered eating.</p>
<p>One cool indoor estimate should not be applied unchanged to an exposed humid route. Reassess when conditions, pace, distance, or clothing changes, ideally with qualified support for demanding goals.</p>

<h2>Water versus electrolyte drinks</h2>
<p>Plain water may be appropriate for many short, easy activities. Electrolyte-containing drinks may become relevant during prolonged exercise, high sweat loss, hot conditions, or short recovery windows, but the product, total intake, food, health, and individual loss all matter.</p>
<p>“Electrolyte” is not automatically better. Drinks vary widely in sodium, carbohydrate, caffeine, sweeteners, acidity, and serving directions. Ordinary meals also supply sodium and other minerals. Salt tablets can create risk and are not a casual substitute for individualized planning.</p>
<p>For long or demanding activity, a credentialed sports dietitian or clinician can help match fluid and sodium to evidence and health. No drink prevents heat illness when exposure, pace, or illness makes continuing unsafe.</p>

<h2>Do runners need electrolytes?</h2>
<p>Not after every run. A short easy outing followed by ordinary food and fluid often does not require a specialized product. The case becomes more relevant as duration, heat, sweat loss, or repeated activity increases.</p>
<p>Avoid diagnosing a cramp, headache, or fatigue as an electrolyte deficiency from symptoms alone. These symptoms have multiple possible causes. Taking more sodium or fluid without knowing the cause may delay appropriate care or worsen the situation.</p>
<p>Check serving instructions and ingredients, but do not assume the label is an individual prescription. People with conditions affecting sodium or fluid need professional advice.</p>

<h2>Carrying fluid on a route</h2>
<p>Handheld bottles are simple but can alter arm comfort. Belts distribute small containers around the waist but may bounce. Vests can carry more and hold essentials but add warmth and weight. Loop routes can return to a secure personal supply without carrying everything.</p>
<p>Test the system before an important run. Check closures, cleaning, reach, visibility, chafing, and whether the container is food-safe. Do not share bottle mouths. Wash reusable equipment and let it dry to reduce contamination.</p>
<p>Carry only what you can manage without compromising balance or heat control. A very heavy pack can create its own problem; choose a shorter route or supported location when necessary.</p>

<h2>Planning refill points</h2>
<p>Map refill points before starting and confirm whether the water is potable, available at the planned hour, and accessible without unsafe road crossings. Bring payment or a backup where appropriate. Refill only in permitted areas and keep the container clean.</p>
<p>The <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe-route guide</a> recommends exits, lighting, signal, traffic, and environmental review. Add shade, toilets, and fluid access to that checklist. A route near water is not useful if the fountain is broken or the shop opens later.</p>
<p>For a virtual activity, there is no need to avoid pauses unless live rules state otherwise. Stop safely to drink. Recorded, submitted, pending, and approved remain different states; hydration decisions should never be distorted to protect a pace trace.</p>
<p>Keep emergency access separate from routine hydration. A bottle solves neither an unsafe isolated route nor a medical emergency. Know the location well enough to describe it, retain phone charge, and choose areas where help can reach you. If a refill point requires leaving the approved or safe route, redesign the route before starting.</p>

<h2>Hydration for a 10K</h2>
<p>Whether to carry fluid for 10K depends on expected duration, conditions, course support, pace, and personal experience. A cool supported event differs from a solo humid route. Read the official event information rather than assuming aid stations.</p>
<p>The <a href="/blog/10k-training-plan-for-beginners">beginner 10K plan</a> creates opportunities to test longer outings and route access. Do not introduce a concentrated sports drink on event day. Familiarity, storage, and stomach comfort matter.</p>
<p>Slower participants may spend longer in the heat and should plan by time, not by assumptions about the distance.</p>

<h2>Signs not to self-diagnose as simple dehydration</h2>
<p>Headache, nausea, vomiting, dizziness, weakness, confusion, cramps, bloating, breathlessness, fainting, and altered behavior can have multiple causes, including serious heat illness, exercise-associated hyponatremia, cardiac or neurological problems, infection, and other emergencies. Do not automatically respond by drinking large volumes.</p>
<p>Stop activity, move to an appropriate safe place, and seek urgent help for confusion, collapse, seizure, severe breathing difficulty, chest pain or pressure, loss of coordination, hot altered behavior, or rapid deterioration. Follow local emergency guidance.</p>
<p>A blood test is required to confirm hyponatremia. A medical <a href="https://pubmed.ncbi.nlm.nih.gov/32097926/">review of exercise-associated hyponatremia</a> notes that symptoms can be nonspecific and identifies overdrinking as central to prevention. This is why “drink as much as possible” is unsafe advice.</p>

<h2>Avoid overdrinking</h2>
<p>Drinking beyond fluid losses can dilute blood sodium and cause life-threatening illness. The risk is often discussed in long endurance events, but forced drinking is unnecessary at any distance. More water is not always safer.</p>
<p>Do not gain body mass during a run through excessive fluid intake. Do not continue drinking on a schedule when you feel bloated, are urinating repeatedly, or have already consumed unusually large amounts; symptoms still need proper assessment rather than self-treatment.</p>
<p>Electrolytes do not grant permission to overdrink. A sodium-containing beverage can still contribute excessive fluid. Individualized planning aims for sufficient but not excessive replacement.</p>

<h2>Before, during, and after: a flexible checklist</h2>
<h3>Before</h3><p>Review the forecast, duration, route, recent food and drink, current health, access, and backup. Begin from ordinary hydration without last-minute forcing.</p>
<h3>During</h3><p>Adjust pace and route, use planned access, respond to thirst and conditions, and stop for concerning symptoms. Do not chase a universal hourly target.</p>
<h3>After</h3><p>Cool down and use ordinary drinks and meals according to thirst, losses, health, and what comes next. The <a href="/blog/what-to-eat-after-running">post-run food guide</a> connects food and fluid without requiring a recovery product.</p>
<p>The <a href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back">broader post-run recovery guide</a> helps interpret the next hours. Continue monitoring how you feel instead of assuming a completed bottle proves recovery. Replace fluid gradually with ordinary food and drink where appropriate, protect sleep, and ease the next session when symptoms, heat exposure, or unusual fatigue remain.</p>

<h2>Learn from comparable runs</h2>
<p>After a representative run, record duration, effort, temperature, humidity, route shade, drinks carried and used, refill access, thirst, bathroom stops, and later symptoms. Avoid drawing conclusions from a single unusually hot or cool day. Compare similar routes and conditions, then make one adjustment.</p>
<p>A plan that worked in January may not fit October, and a shaded dawn loop may not predict an exposed late-morning event. Rehearse the current season and expected start time. If the run repeatedly ends with intense thirst, large body-mass change, headaches, stomach sloshing, swelling, or repeated urination, stop guessing and seek qualified assessment.</p>
<p>Hydration notes should support decisions, not become a contest. Do not chase a sweat-rate record, copy another person’s intake, or use the data to justify continuing through warning signs. The useful result is a safer route and a reasonable range of access options.</p>

<h2>Virtual-run route planning in Philippine conditions</h2>
<p>Choose a route whose water, shade, signal, traffic, surface, and exits match the expected time. A short repeatable loop around a guarded venue may be safer than a scenic exposed point-to-point route. Tell a trusted person the plan when appropriate.</p>
<p>Carry communication, identification, necessary personal medication, and enough resources for reasonable delays. Do not rely on delivery apps or mobile payment as the only backup. Weather can close roads, interrupt signal, or change potable-water access.</p>
<p>For longer HelloRun activity, prioritize a route you can shorten. An event goal does not require completing unsafe distance in one attempt unless its current rules say so—and even then, safety comes first.</p>

<h2>Frequently asked questions</h2>
<h3>Should I drink water during a 5K?</h3><p>It depends on time, conditions, access, and the runner. Many short easy 5Ks need no during-run drink; carrying or using water can still be appropriate in heat or for individual needs.</p>
<h3>How much water should runners drink?</h3><p>No universal amount is safe or accurate. Build an individualized plan from duration, environment, sweat response, food, health, and access without exceeding losses.</p>
<h3>Do I need electrolytes after sweating?</h3><p>Not automatically. Ordinary food may replace sodium after a short run. Prolonged activity or high losses can change the plan; symptoms alone do not diagnose deficiency.</p>
<h3>Can I rely on thirst?</h3><p>Thirst is useful, especially for avoiding forced overdrinking, but heat, access, age, medication, and illness add context. Plan availability before thirst becomes a route problem.</p>
<h3>Is clear urine proof I am hydrated?</h3><p>No. Urine color is only one imperfect clue and very clear frequent urine can follow excessive intake. Consider the whole situation.</p>

<h2>Plan access, not a universal number</h2>
<p>Short runs may need no carried water; longer and hotter outings deserve more planning. Start normally hydrated, expect individual sweat differences, test carrying and refill systems, and use electrolyte products only when context supports them. Avoid both neglect and forced excess.</p>
<p>Once the route has suitable fluid access, shade, exits, and timing, <a href="/events">browse current HelloRun events</a>. Read live rules and plan the activity around real Philippine conditions.</p>

<h2>Official sources and health note</h2>
<p>This guide was reviewed in September 2026 against the NATA fluid-replacement position statement, current CDC heat guidance, DOST-PAGASA heat information, and a peer-reviewed exercise-associated hyponatremia review. It is general education, not diagnosis, medical clearance, emergency treatment, or an individualized fluid or electrolyte prescription.</p>`;
const REQUIRED_HEADINGS=Object.freeze(['Hydration needs differ between runners','Start the run normally hydrated','Water before running','Should you carry water on a short run?','Hydration for longer runs','Hot and humid weather','Sweat varies from person to person','Water versus electrolyte drinks','Do runners need electrolytes?','Carrying fluid on a route','Planning refill points','Hydration for a 10K','Signs not to self-diagnose as simple dehydration','Avoid overdrinking','Learn from comparable runs','Virtual-run route planning in Philippine conditions','Frequently asked questions','Official sources and health note']);
const REQUIRED_LINKS=Object.freeze(['href="/events"','href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back"','href="/blog/how-to-run-safely-during-hot-and-humid-weather"','href="/blog/how-to-choose-a-safe-route-for-your-virtual-run"','href="/blog/what-is-a-long-run-for-beginners"','href="/blog/what-to-eat-after-running"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wc=contentText.split(/\s+/).filter(Boolean).length,p={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wc/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(p);return p}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),wc=t.split(/\s+/).filter(Boolean).length;if(wc<2500||wc>3000)e.push('article must contain 2500-3000 substantive words');if(ARTICLE.slug!==CANONICAL_SLUG)e.push('slug');if(!p.title||p.title.length>120||!p.excerpt||p.excerpt.length>220)e.push('metadata');if(!p.contentHtml||p.contentHtml.length>50000||!p.contentText||p.contentText.length>50000||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8||p.tags.some(x=>!x||x.length>30))e.push('tags');if(!p.seoTitle||p.seoTitle.length>160||!p.seoDescription||p.seoDescription.length>320)e.push('SEO');if(!p.coverImageAlt||p.coverImageAlt.length>180||!p.ogImageUrl)e.push('cover artwork is required');if(/<h1\b/i.test(p.contentHtml))e.push('h1');if(/everyone must drink \d+|exactly \d+ litres for every/i.test(t))e.push('universal amount');if(/Drink as much as possible[.!]|More water is always safer[.!]/.test(t))e.push('overdrinking');if(/electrolytes prevent all heat illness|electrolytes are required after every run/i.test(t))e.push('electrolyte claim');if(/every event has water|pending is approved/i.test(t))e.push('event claim');if(!/is not one bottle size/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes('<h2>'+h+'</h2>'))e.push('heading '+h);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push('link '+l);if(e.length)throw new Error('Invalid hydration payload: '+e.join('; '));return true}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
