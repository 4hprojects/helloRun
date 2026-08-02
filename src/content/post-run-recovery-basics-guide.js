'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'post-run-recovery-basics-rest-hydration-when-to-ease-back';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'Post-Run Recovery Basics: Rest, Hydration, and When to Ease Back',
  excerpt: 'Use a calm post-run reset, flexible hydration and food choices, a next-day readiness check, and clear stop or seek-care boundaries without self-diagnosing.',
  category: 'Injury Prevention',
  tags: Object.freeze([
    'post-run recovery',
    'recovery basics',
    'runner hydration',
    'rest after running',
    'muscle soreness',
    'injury awareness',
    'running safety',
    'beginner runners'
  ]),
  seoTitle: 'Post-Run Recovery Basics: Rest, Hydration, and When to Ease Back',
  seoDescription: 'A practical post-run recovery guide covering a calm reset, fluids, ordinary food, sleep, next-day readiness, and signs to stop or seek qualified care.',
  coverImageAlt: 'Filipino runner resting calmly on a veranda after an evening run beside unbranded shoes, water, towel, banana, and a simple sandwich'
});

const RAW_CONTENT_HTML = `
<p>Recovery begins when the run ends, but it is not a contest to complete as quickly as possible. It is the period in which a runner notices what the effort and conditions required, returns to ordinary comfort, replaces practical needs, and decides whether the next planned activity still makes sense.</p>
<p>There is no single recovery routine for every run or every person. Distance, intensity, heat, humidity, route, sleep, food, fluids, illness, medicines, disability, pregnancy, chronic conditions, recent activity, and individual advice can all change what is appropriate. A short familiar run and a long unfamiliar effort should not automatically receive the same response.</p>
<blockquote><strong>The recovery rule:</strong> use the next activity as a decision, not a debt. A calendar, challenge target, streak, leaderboard, or submitted result never requires a runner to ignore symptoms or remove needed recovery.</blockquote>

<h2>Post-run recovery in one minute</h2>
<ol>
  <li><strong>Finish in a suitable place.</strong> Move away from traffic, heat, crowding, or another immediate hazard before checking a watch or phone.</li>
  <li><strong>Let the effort settle.</strong> Transition gradually to comfortable movement or rest according to the situation rather than stopping in an unsafe location.</li>
  <li><strong>Check the whole experience.</strong> Note effort, conditions, unusual symptoms, pain, balance, breathing, and whether the run differed from the plan.</li>
  <li><strong>Replace practical needs.</strong> Use suitable fluids and ordinary food according to thirst, appetite, conditions, the activity, and any individual guidance.</li>
  <li><strong>Change out of wet or unsuitable clothing.</strong> Get dry, cool or warm as conditions require, and avoid remaining exposed merely to complete an upload.</li>
  <li><strong>Protect rest and sleep.</strong> Do not compress the next session into time the body or ordinary life needs.</li>
  <li><strong>Check again later.</strong> Worsening symptoms, disrupted ordinary movement, illness, marked fatigue, or poor recovery are reasons to ease back and seek advice when appropriate.</li>
  <li><strong>Treat urgent signs urgently.</strong> Chest pain, breathing difficulty, fainting, confusion, severe or rapidly worsening symptoms, and suspected serious heat illness need immediate attention.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in August 2026 using World Health Organization physical-activity guidance, American College of Sports Medicine recovery material, UK National Health Service running and injury guidance, and US Centers for Disease Control and Prevention heat guidance. It was also checked against current HelloRun event, evidence, review, progress, leaderboard, and recognition behavior.</p>
<p>WHO guidance describes population-level physical activity, not a personalized running plan. The other sources provide general recovery, rest, injury-awareness, or heat-safety context. None can examine the reader, identify the cause of a symptom, or approve a return to running through an article.</p>
<p>This guide is educational information for ordinary adult runners. It is not a diagnosis, treatment plan, rehabilitation protocol, emergency assessment, or substitute for a qualified healthcare professional who knows the person’s circumstances. Follow individual medical instructions and local emergency guidance over any general example here.</p>

<h2>What recovery means after an ordinary run</h2>
<p>Recovery is not one product, stretch, meal, device, or number. It is a collection of ordinary processes and decisions between one effort and the next. The useful question is not “How do I erase every sensation?” but “What does this run tell me about what I need now and whether the next plan remains appropriate?”</p>
<p>Some post-exercise sensations can occur without indicating a specific injury, but a written checklist cannot reliably classify their cause. Location, severity, onset, change over time, swelling, function, illness, heat exposure, previous injury, and individual health context matter. Avoid giving a confident label to an unfamiliar symptom simply because it appeared after a run.</p>
<p>A recovery check can still be practical without making a diagnosis. Record what happened, notice whether it improves or worsens, protect ordinary movement and rest, and use qualified help when the situation is uncertain or concerning.</p>
<h3>Recovery varies from run to run</h3>
<p>A familiar comfortable run may be followed by an ordinary evening and a normal next day. A harder, longer, hotter, hillier, or technically demanding run may create different fluid, food, sleep, and scheduling needs. Travel, work, care responsibilities, stress, and limited access to a cool or dry place can also affect the recovery opportunity.</p>
<p>Do not use another runner’s routine as proof of what is right for you. Their sweat rate, medical history, medicines, diet, environment, and training history may be different even when the distance looks identical.</p>

<h2>Start with an immediate post-run reset</h2>
<p>The first task is to end the activity safely. Leave a roadway, crossing, isolated section, direct sun, heavy rain, or congested finish area before studying pace or evidence. If the route itself has become unsuitable, the <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe-route guide</a> explains why the activity record never controls a safety decision.</p>
<p>Move or rest in a way that feels appropriate to the actual situation. A gradual transition to easy walking may feel comfortable after an ordinary run, but a runner who is faint, confused, injured, or otherwise unwell should not continue walking merely to complete a ritual or improve a GPS line.</p>
<h3>Use a simple check-in</h3>
<ul>
  <li>Did the effort feel ordinary for the intended session?</li>
  <li>Were heat, humidity, rain, air quality, hills, surface, or traffic materially different from the plan?</li>
  <li>Is breathing returning toward the runner’s ordinary comfort?</li>
  <li>Is there new, severe, localized, or worsening pain?</li>
  <li>Is balance, awareness, vision, or ordinary walking affected?</li>
  <li>Was there a fall, collision, sudden stop, or equipment problem?</li>
  <li>Does the runner need a cool, dry, warm, staffed, or supported place now?</li>
</ul>
<p>This is a decision prompt, not a scoring system. One concerning answer can matter more than several reassuring ones.</p>

<h2>Change the environment before optimizing recovery</h2>
<p>Get out of continuing exposure. In hot or humid conditions, move to a cooler suitable place. In rain or wind, remove wet layers and get dry. After darkness, prioritize safe transport and communication. Do not remain outdoors to take a cleaner photo, wait for a watch to sync, or complete a social post.</p>
<p>Change out of clothing that is wet, chafing, or no longer appropriate for the temperature when practical. Address ordinary comfort and hygiene without treating a clothing change as medical treatment. Check feet and skin for issues that require attention, especially after unfamiliar footwear, long duration, rain, or rough surfaces.</p>
<p>For heat-specific planning and warning signs, use the <a href="/blog/how-to-run-safely-during-hot-and-humid-weather">hot-and-humid weather guide</a>. CDC advises athletes who feel faint or weak in heat to stop activity and move to a cool place, and it directs people with heat-illness symptoms to medical care.</p>

<h2>Replace fluids without using a universal formula</h2>
<p>Fluid needs differ with the runner, activity duration and intensity, sweat, heat, humidity, clothing, body size, prior intake, access, health conditions, and medicines. No fixed bottle size, hourly quantity, color chart, or electrolyte rule is appropriate for everyone through a general article.</p>
<p>After an ordinary run, use thirst, appetite, conditions, the activity, and relevant personal guidance to choose suitable fluids over time. Water may be practical for many ordinary situations. Longer or hotter activity and substantial sweating can raise different considerations, but that does not make a sports drink, electrolyte product, salt tablet, or supplement automatically necessary or appropriate.</p>
<p>People with kidney, heart, endocrine, blood-pressure, fluid-balance, gastrointestinal, or other health considerations—and people using medicines that affect fluids or electrolytes—may need individualized advice. More fluid is not always better. Avoid turning “rehydrate” into a challenge to drink rapidly or meet another runner’s number.</p>
<h3>Hydration questions</h3>
<ul>
  <li>How long and demanding was the run compared with the runner’s ordinary activity?</li>
  <li>Were conditions hotter, more humid, or more exposed than expected?</li>
  <li>Was fluid available before and during the activity?</li>
  <li>Are thirst, nausea, vomiting, dizziness, confusion, marked weakness, or other symptoms present?</li>
  <li>Does the runner have individual fluid or sodium instructions?</li>
</ul>
<p>Symptoms can have more than one cause. Do not declare dehydration from thirst alone, and do not assume that drinking a large amount resolves fainting, confusion, persistent vomiting, chest symptoms, or suspected serious heat illness.</p>

<h2>Use ordinary food without a recovery-product promise</h2>
<p>After an ordinary run, a familiar meal or snack can support the return to normal eating. Appetite, activity, time of day, cultural food preferences, allergies, access, health conditions, and individual nutrition advice all matter. This guide does not prescribe calories, protein grams, carbohydrate ratios, supplements, or a compulsory eating window.</p>
<p>A practical option may include ordinary foods the runner tolerates, along with fluids. Avoid framing one powder, bar, drink, or “recovery meal” as necessary for every runner. Products do not compensate for an unsuitable workload, missed sleep, illness, or a concerning symptom.</p>
<p>If nausea, vomiting, difficulty keeping fluids down, an eating disorder, diabetes, gastrointestinal disease, allergy, or another nutrition-related concern affects recovery, obtain appropriate professional advice rather than following a generic food checklist.</p>

<h2>Protect rest, sleep, and ordinary life</h2>
<p>Recovery needs time that cannot be manufactured by a watch. ACSM recovery material includes exercise design, hydration, nutrition, sleep, stress, and rest among relevant considerations, while NHS beginner running guidance deliberately places rest between running sessions. Those examples support planning space between efforts; they do not create one mandatory schedule for every runner.</p>
<p>Do not remove sleep to complete an early run, stay awake to upload evidence, or schedule a late hard effort solely because a challenge deadline is approaching. A restless night, travel, illness, care responsibility, or unusually demanding day can change the next decision even when the legs feel acceptable.</p>
<p>Rest does not need to mean proving complete inactivity. Ordinary daily movement may continue when appropriate, but a recovery day should not quietly become an unplanned hard workout. If a clinician or rehabilitation professional has given specific activity limits, follow them.</p>

<h2>Avoid turning every sensation into a diagnosis</h2>
<p>General muscle tiredness, stiffness, heaviness, tenderness, or reduced energy can occur after unfamiliar or demanding exercise. The same words can also be used by people with injuries or illness. Timing and description alone do not let an article determine the cause.</p>
<p>Do not rely on slogans such as “pain is weakness leaving,” “soreness means growth,” or “if you can walk, you can run.” Do not test a sharp or worsening symptom by repeatedly running on it. Do not use a foam roller, stretch, ice bath, massage, pain medicine, or supplement simply because an online routine labels it essential.</p>
<p>NHS injury guidance identifies worsening pain, substantial swelling or bruising, inability to bear weight, marked stiffness or movement difficulty, and lack of improvement as reasons to seek help. Those examples are not exhaustive and should not be used to rule out a problem when something feels wrong.</p>
<h3>Record facts instead of naming the condition</h3>
<ul>
  <li>Where is the symptom?</li>
  <li>When did it begin: during the run, immediately after, or later?</li>
  <li>Was there a fall, twist, impact, sudden change, or unusual surface?</li>
  <li>Is it improving, unchanged, or worsening?</li>
  <li>Does it change ordinary walking, stairs, sleep, work, or daily tasks?</li>
  <li>Is swelling, bruising, warmth, numbness, weakness, or reduced movement present?</li>
  <li>Are fever, illness, chest, breathing, balance, awareness, or heat-related symptoms present?</li>
</ul>
<p>These observations can support a conversation with a qualified professional. They are not a home diagnostic test.</p>

<h2>Use a next-day readiness check</h2>
<p>Before the next planned activity, compare the runner’s current state with what is ordinary for them. Do not ask only whether the schedule contains a run. Ask whether ordinary movement, energy, symptoms, environment, and responsibilities support the intended session.</p>
<h3>Green does not mean guaranteed</h3>
<p>If the runner feels ordinary, daily movement is unaffected, no concerning symptoms are present, and the planned activity fits current guidance, the next session may remain a consideration. That offers no assurance against injury and does not make a fixed pace necessary.</p>
<h3>Ease back or postpone</h3>
<p>Shorten, reduce, replace, or postpone when fatigue is unusually high, sleep or illness has changed, soreness is worsening, ordinary movement is altered, heat exposure was substantial, the route is unsuitable, or the runner is uncertain. A walk or rest day is not a failed run when it is the appropriate decision.</p>
<h3>Seek qualified assessment</h3>
<p>Use professional advice for new, unexplained, recurrent, worsening, or function-limiting symptoms; after meaningful injury; when a health condition or medicine affects exercise; or when return-to-running guidance is needed. A previous diagnosis should follow its individual action plan, not a generic online progression.</p>

<h2>When urgent help matters</h2>
<p>Contact local emergency services or obtain immediate medical help for symptoms such as chest pain or pressure, significant trouble breathing, fainting, confusion, altered awareness, seizure, severe or rapidly worsening pain, major trauma, obvious deformity, or signs of a serious heat-related illness. Do not leave an unwell person alone simply to retrieve activity evidence.</p>
<p>In hot conditions, CDC heat guidance identifies confusion, loss of consciousness, major weakness, dizziness, nausea, heavy sweating, and other symptoms within its heat-illness information. Serious heat illness can be time-critical. Move away from heat and follow current emergency instructions; do not assume a drink alone is sufficient.</p>
<p>This list cannot include every urgent condition. If the situation appears dangerous or is rapidly changing, seek immediate help rather than waiting for an article’s exact wording.</p>

<h2>Decide how to ease back</h2>
<p>Easing back is a change in the next plan, not a punishment. Options include ending the current effort, resting, choosing comfortable ordinary movement, shortening the next activity, lowering intensity, using a permitted lower-impact alternative, moving to safer conditions, changing the event category where allowed, or withdrawing.</p>
<p>Do not automatically add missed distance to the next run, double a session, remove a recovery day, or sprint an intended easy effort. Recalculate an accumulated event only after health and safety decisions. If the remaining requirement no longer fits, the responsible outcome may be a lower goal or no completion.</p>
<p>The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">run-walk guide</a> offers a flexible activity structure, while the <a href="/blog/how-to-stay-consistent-during-a-month-long-virtual-run">month-long consistency guide</a> explains how to resume after disruption. Neither should be used as rehabilitation for an injury or illness.</p>

<h2>Be cautious with recovery scores and trends</h2>
<p>Watches and apps may display sleep estimates, heart-rate trends, training load, readiness, stress, or a recovery score. These measurements can help a runner notice patterns, but they are estimates shaped by sensor contact, device algorithms, missing data, illness, medicines, environment, and the person’s baseline. A green score cannot overrule symptoms, and a low score does not identify a diagnosis.</p>
<p>Use device information as one observation beside how the run felt, ordinary movement, sleep, appetite, illness, and individual guidance. Compare like with like when possible, and avoid changing a medical plan because a consumer device produced one unusual number. If a repeated or unexpected trend is concerning, discuss the underlying facts with an appropriate professional rather than asking the device to explain its own result.</p>
<p>Public sharing is optional. Recovery data can reveal sleep patterns, health concerns, location routines, and daily schedules. HelloRun does not require a recovery score, sleep chart, heart-rate trend, or diagnosis as ordinary run proof. Submit only the evidence the event legitimately requests, and keep unrelated health information private.</p>

<h2>How recovery relates to HelloRun status</h2>
<p>HelloRun records event and evidence workflow; it does not examine a runner’s physical recovery. An activity can exist on a device before it is submitted. Submitted or pending evidence awaits the applicable checks. Approved evidence contributes according to event rules, while rejected evidence does not contribute officially.</p>
<p>Approval means the evidence met the applicable platform and event review requirements. It does not prove that the effort was medically appropriate, the route was safe, the runner has recovered, or another activity should begin. A leaderboard position, badge, certificate, or progress percentage is not health clearance.</p>
<p>If illness, pain, fatigue, heat, or another concern changes the next activity, protect recovery even when an event deadline remains open. Browse <a href="/events">Events</a> for the configured rules and use the <a href="/faq">FAQ</a> for platform workflow questions. Contact the organizer about event-specific options, not for medical diagnosis.</p>

<h2>Three recovery scenarios</h2>
<h3>Scenario 1: an ordinary easy run</h3>
<p>Paolo finishes a familiar easy route in ordinary conditions. He moves to a safe shaded area, lets his breathing settle, changes out of wet clothing, drinks according to thirst, eats his usual evening meal, and notes that the effort felt normal. The next day, ordinary movement and energy feel typical. This example describes a calm check, not a promise that every similar run needs the same recovery.</p>
<h3>Scenario 2: heat changes the plan</h3>
<p>Mina finishes earlier than planned because she feels unusually weak in humid conditions. She stops, moves to a cool supported place, and does not continue for a target or screenshot. Because symptoms are concerning and heat-related illness is possible, the priority is current CDC-aligned medical guidance rather than a generic recovery routine or next-day schedule.</p>
<h3>Scenario 3: worsening localized pain</h3>
<p>Ren notices localized pain during a run and it affects ordinary walking afterward. He does not label it as routine soreness or repeatedly test it with another run. He records what happened, cancels the next planned session, and obtains qualified assessment. The event’s pending distance remains secondary.</p>
<p>These scenarios illustrate decision boundaries. They do not diagnose the runners or predict a recovery time.</p>

<h2>A copyable recovery worksheet</h2>
<ul>
  <li><strong>Planned activity:</strong> intended duration, distance, and effort.</li>
  <li><strong>Actual activity:</strong> what happened without editing the record.</li>
  <li><strong>Conditions:</strong> heat, humidity, rain, surface, elevation, traffic, and route changes.</li>
  <li><strong>Immediate check:</strong> breathing, awareness, balance, pain, weakness, nausea, and ordinary movement.</li>
  <li><strong>Environment:</strong> safe place, cooling or warmth, dry clothing, transport, and support.</li>
  <li><strong>Fluids and food:</strong> practical choices made under personal guidance, without target-chasing.</li>
  <li><strong>Rest:</strong> sleep, work, care, travel, and time available before the next effort.</li>
  <li><strong>Later change:</strong> improving, stable, worsening, or uncertain.</li>
  <li><strong>Next decision:</strong> continue as planned, reduce, replace, postpone, stop, or seek advice.</li>
  <li><strong>Event status:</strong> recorded, submitted, pending, approved, or rejected—kept separate from health readiness.</li>
</ul>
<p>Keep private health notes outside public proof unless the event legitimately requires specific information and provides an appropriate process. A runner should not need to disclose a diagnosis publicly to explain a responsible decision not to continue.</p>

<h2>Final post-run checklist</h2>
<ul>
  <li>I finished in a suitable place before checking technology.</li>
  <li>I considered effort, conditions, symptoms, and any incident.</li>
  <li>I moved out of continued heat, rain, cold, traffic, or isolation.</li>
  <li>I used suitable fluids without forcing a universal target.</li>
  <li>I chose ordinary familiar food when appropriate without relying on a recovery product.</li>
  <li>I protected rest, sleep, and the next realistic decision.</li>
  <li>I did not label an unfamiliar or worsening symptom from an online checklist.</li>
  <li>I will reduce, replace, postpone, or stop the next activity when recovery is not ordinary.</li>
  <li>I know that urgent or rapidly changing symptoms require immediate help.</li>
  <li>I will not double missed distance or remove recovery to repair a calendar.</li>
  <li>I understand that HelloRun approval is not medical clearance.</li>
</ul>

<h2>Your practical next step</h2>
<p>After the next ordinary run, complete the worksheet once without trying to produce a perfect score. Note the actual effort, conditions, immediate state, practical fluid and food choices, rest opportunity, and next-day change. Use the result to make one honest next decision.</p>
<p>If anything is unfamiliar, worsening, function-limiting, or concerning, leave the next run open and seek the level of help the situation requires. For gradual beginner preparation, use the <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K guide</a> only when running is currently appropriate for you.</p>

<h2>Sources and review notes</h2>
<p><strong>Official and platform sources:</strong> health and activity principles come from the official organizations below; HelloRun status descriptions come from current application behavior.</p>
<ul>
  <li><a href="https://www.who.int/publications/i/item/9789240015128">World Health Organization: Guidelines on physical activity and sedentary behaviour</a>.</li>
  <li><a href="https://www.acsm.org/docs/default-source/nyshsi_resources/resources/sssi-nyshsi-recovery.pdf">American College of Sports Medicine resource: Proper Recovery</a>.</li>
  <li><a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/">UK National Health Service: Couch to 5K running plan and rest-day context</a>.</li>
  <li><a href="https://www.nhs.uk/conditions/sprains-and-strains/">UK National Health Service: Sprains and strains guidance</a>.</li>
  <li><a href="https://www.cdc.gov/heat-health/risk-factors/heat-and-athletes.html">US Centers for Disease Control and Prevention: Heat and Athletes</a>.</li>
</ul>
<p>Sources and HelloRun behavior were reviewed in August 2026. Current emergency instructions, individual healthcare guidance, event-specific rules, and local conditions take precedence over examples in this guide.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Post-run recovery in one minute',
  'How this guide was prepared',
  'What recovery means after an ordinary run',
  'Start with an immediate post-run reset',
  'Replace fluids without using a universal formula',
  'Use ordinary food without a recovery-product promise',
  'Protect rest, sleep, and ordinary life',
  'Avoid turning every sensation into a diagnosis',
  'Use a next-day readiness check',
  'When urgent help matters',
  'Decide how to ease back',
  'Be cautious with recovery scores and trends',
  'How recovery relates to HelloRun status',
  'A copyable recovery worksheet',
  'Final post-run checklist',
  'Your practical next step',
  'Sources and review notes'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/faq"',
  'href="/blog/how-to-run-safely-during-hot-and-humid-weather"',
  'href="/blog/beginner-5k-training-plan-new-runners"',
  'href="/blog/run-walk-method-beginner-friendly-way-build-endurance"',
  'href="/blog/how-to-stay-consistent-during-a-month-long-virtual-run"',
  'href="/blog/how-to-choose-a-safe-route-for-your-virtual-run"'
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
  if (/<h[12]>Post-Run Recovery Basics:/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/this is definitely (?:soreness|a strain|dehydration|an injury)|you have (?:dehydration|a strain|an injury)/i.test(text)) errors.push('article must not diagnose symptoms');
  if (/everyone (?:must|should) drink|exactly \d+\s*(?:ml|litres?|liters?)|universal hydration dose/i.test(text)) errors.push('article must not prescribe universal hydration');
  if (/(?:take|use) (?:ibuprofen|paracetamol|acetaminophen|painkillers?|supplements?|salt tablets?) (?:after|for) every run/i.test(text)) errors.push('article must not recommend medication or supplements');
  if (/ignore (?:the )?pain and continue|you must continue through pain|pain always means progress/i.test(text)) errors.push('article must not encourage continuing through pain');
  if (/guarantees? (?:injury prevention|recovery)|recover(?:y|ed) in exactly \d+ (?:hours?|days?|weeks?)/i.test(text)) errors.push('article must not guarantee prevention or recovery time');
  if (/approved evidence (?:proves|means) (?:you are|the runner is) (?:recovered|ready)|approval is medical clearance/i.test(text)) errors.push('article must not treat approval as health readiness');
  if (/(?:must|should) make up .{0,40} by (?:doubling|running twice)|remove recovery to catch up/i.test(text)) errors.push('article must not prescribe unsafe catch-up activity');
  if (!/reviewed in August 2026 using World Health Organization/i.test(text)) errors.push('article must disclose health methodology and date');
  if (!/Approval means the evidence met the applicable platform and event review requirements/i.test(text)) errors.push('article must define platform approval');
  if (!/Contact local emergency services or obtain immediate medical help/i.test(text)) errors.push('article must provide an urgent-care boundary');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid post-run recovery payload: ${errors.join('; ')}`);
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
