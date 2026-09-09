'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-run-your-first-10k-virtual-run';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Run Your First 10K Virtual Run',
  excerpt: 'Turn 10K preparation into an event-ready plan: verify the rules, choose a safe route, pace conservatively, test proof, complete honestly, and recover before choosing another goal.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'virtual 10K',
    '10K virtual run',
    'first 10K run',
    'beginner virtual run',
    'online 10K challenge',
    '10K pacing',
    'virtual run proof',
    '10K preparation'
  ]),
  seoTitle: 'How to Complete Your First 10K Virtual Run',
  seoDescription: 'Prepare for your first virtual 10K with practical tips on training, route choice, tracking, pacing, proof submission, and event-day planning.',
  coverImageAlt: 'Oil-pastel editorial illustration of a Filipino beginner starting a calm virtual 10K on a familiar tropical park loop with prepared essentials nearby'
});

const RAW_CONTENT_HTML = `
<p>To complete your first 10K virtual run, choose an event whose rules match your intended run or run-walk, prepare until the distance is a realistic next step, test a safe route and recording method, begin conservatively, preserve the original 10K activity, and submit the required proof before the deadline.</p>
<p>A virtual 10K is not simply “run until an app says 10.00.” The event may require one activity, a specific date window, accepted activity types, a minimum displayed distance, particular evidence, and approval before the result becomes official. Your route also lacks many services that an onsite race might provide.</p>
<blockquote><strong>The first-10K principle:</strong> make event day a controlled use of a rehearsed plan—not a test of how much discomfort, speed, distance, or technical uncertainty you can absorb at once.</blockquote>

<h2>What is a virtual 10K?</h2>
<p>A virtual 10K is an organized event in which an eligible participant completes a ten-kilometre activity away from one shared race course and provides the evidence defined by the organizer. The runner often chooses the route and time within an event window, but that flexibility remains bounded by the published rules.</p>
<p>One event may require a single outdoor GPS run of at least 10.00 kilometres. Another may accept run-walk or walking. A different challenge may allow accumulated distance, treadmill evidence, or a supported connected activity. Do not transfer a rule from another event merely because both use “virtual 10K” in the title.</p>
<p>The <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">virtual-run overview</a> explains registration, windows, proof review, privacy, and recognition. This guide focuses on executing one first 10K opportunity after preparation; it is not another week-by-week training programme.</p>

<h2>Check the event rules first</h2>
<ul>
  <li><strong>Category:</strong> confirm that your registration is specifically for 10K and note whether the displayed target is a minimum.</li>
  <li><strong>Completion mode:</strong> determine whether ten kilometres must appear in one activity or may be accumulated.</li>
  <li><strong>Accepted activity:</strong> check running, walking, run-walk, trail, treadmill, or other permitted types.</li>
  <li><strong>Activity window:</strong> record the opening and closing date, time, and time zone.</li>
  <li><strong>Submission deadline:</strong> distinguish the last eligible activity time from the last proof-upload time.</li>
  <li><strong>Evidence:</strong> identify accepted screenshots, connected services, visible fields, activity source, and privacy expectations.</li>
  <li><strong>Pauses and continuity:</strong> check whether one continuous recording is required and how stops are treated.</li>
  <li><strong>Route and location:</strong> confirm outdoor, indoor, treadmill, track, or geographic restrictions.</li>
  <li><strong>Review and recognition:</strong> understand pending, approved, rejected, correction, ranking, certificate, and reward rules.</li>
</ul>
<p>If the wording is unclear, ask the organizer before registering or completing the activity. The activity-type selector or upload form being technically available does not guarantee that a particular record qualifies.</p>

<h2>Give yourself enough preparation time</h2>
<p>A first 10K should follow a repeatable foundation, not one unexpectedly good 5K. Look for several recent weeks in which a comfortable 5K or comparable run-walk duration, ordinary daily movement, and recovery have been manageable. If 5K remains a maximum effort, build that base before using a 10K deadline.</p>
<p>The <a href="/blog/10k-training-plan-for-beginners">eight-week beginner 10K plan</a> provides a flexible progression from a repeatable 5K foundation. Eight weeks is illustrative, not a promise. Someone starting from little recent activity may need a walking phase, a beginner 5K plan, and a longer timeline. Someone already beyond that base may organize preparation differently.</p>
<p>WHO and CDC guidance supports starting with manageable activity and increasing gradually. The NHS Couch to 5K plan is one public example of alternating running and walking with rest days. These population resources support general principles; they do not validate your readiness for ten kilometres or prescribe this event plan.</p>
<p>Do not compress missed training into a last week of catch-up distance. If preparation, health, conditions, work, study, caregiving, or recovery do not support the attempt, choose a later suitable event or another category.</p>

<h2>A seven-day readiness review</h2>
<p>About a week before the planned opportunity, review facts instead of trying to gain last-minute fitness:</p>
<ul>
  <li>the recent longer activity was controlled and recovery was ordinary;</li>
  <li>no new or worsening symptom requires assessment;</li>
  <li>the selected event is live, the registration is correct, and walking or run-walk rules are clear;</li>
  <li>the route has been inspected at a comparable time and has a backup;</li>
  <li>the phone or watch, app, permissions, battery, units, and save/sync workflow were tested;</li>
  <li>shoes, socks, clothing, carrying method, food, and fluids are familiar;</li>
  <li>weather and local conditions have a suitable decision point rather than a fixed assumption;</li>
  <li>transport, companionship, communication, toilets, water, and an early exit are addressed;</li>
  <li>the final submission deadline leaves time to review the original evidence.</li>
</ul>
<p>A failed item does not always cancel the event, but it should change the plan. New shoes can wait. An unsafe route needs replacement. Unclear walking eligibility needs an organizer answer. Incomplete recovery may justify postponement.</p>

<h2>Choose a realistic route</h2>
<p>The fastest-looking route is not necessarily the best first-10K route. Consider traffic, crossings, pavement, elevation, lighting, heat exposure, drainage, construction, crowds, dogs, personal security, mobile coverage, toilets, water, access permission, and ways to stop early.</p>
<p>A familiar loop can keep supplies and transport nearby, make the distance easier to divide mentally, and provide repeated exit points. It can also create tight turns, congestion, monotony, or GPS cutting. An out-and-back is simple but can leave the participant far from help at halfway. A point-to-point course needs reliable transport and may expose the runner to changing conditions.</p>
<p>World Athletics' virtual-race advice recommends checking the course in advance and notes that loops can simplify drinks and keep a runner closer to home. That is useful logistics advice, not a guarantee that loops are safer or more accurate. The <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe-route guide</a> provides the fuller assessment.</p>
<p>Measure route length conservatively with the tool you intend to use, but do not treat a consumer map as certified distance. Never enter traffic, floodwater, a closed area, or another hazard merely to make the device reach 10.00.</p>

<h2>Decide whether you will run or run-walk</h2>
<p>A first virtual 10K does not require continuous running unless the event explicitly says so. A planned run-walk strategy can remain part of the attempt when accepted. Walking from the start can control effort better than waiting for exhaustion to force an unplanned break.</p>
<p>Use a pattern already practised during longer activity. Do not adopt a stranger's interval ratio on event day. Keep the running portions controlled and make the walks long enough to restore breathing, attention, and form. If the pattern stops serving those purposes, slow further, walk longer, or end the attempt.</p>
<p>The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">run-walk guide</a> offers time-, landmark-, and effort-led options without one universal prescription. The guide to <a href="/blog/can-you-walk-a-virtual-run">walking in virtual events</a> explains why personal strategy and event eligibility are separate.</p>

<h2>Test your tracking app or watch</h2>
<p>Use the exact phone, watch, app, activity profile, permissions, carrying position, and sync route planned for the 10K. A short test should confirm the device reaches its documented ready state, records the correct activity type, handles pauses as expected, saves the full record, shows kilometres, and produces acceptable proof.</p>
<p>Phone GPS can drift, add zigzags, cut corners, or lose points around buildings, trees, bridges, tunnels, and steep terrain. A watch can also produce errors. The <a href="/blog/how-accurate-is-phone-gps-for-running">phone-GPS accuracy guide</a> explains why point accuracy and route-distance accuracy differ.</p>
<p>If you are considering new hardware before the event, the <a href="/blog/gps-watch-vs-running-app">GPS watch versus running app guide</a> compares the purchase by tested battery, controls, metrics, cost, and proof needs. A first 10K does not itself require a watch.</p>
<p>Charge the device and understand battery-saving behavior. Avoid installing a major update, changing several settings, or pairing unfamiliar equipment immediately before the attempt. If using two recorders for legitimate backup, know which source the event expects and do not select whichever total is most favorable afterward.</p>
<p>A test activity is not proof that event day will record perfectly. It removes avoidable surprises and confirms where to find the original record.</p>

<h2>Plan your pacing</h2>
<p>Start more conservatively than the excitement of the first kilometre suggests. A pace that feels dramatically slow early can become appropriate once distance, heat, hills, concentration, and time on feet accumulate. The aim of a first completion is controlled decision-making, not defending an arbitrary finish-time prediction.</p>
<p>The <a href="/blog/beginners-guide-to-running-pace">beginner pace guide</a> explains pace, effort, splits, moving time, and elapsed time. The <a href="/blog/how-long-to-run-5k-10k-21k">5K, 10K, and 21K time guide</a> shows exact pace-to-finish arithmetic while emphasizing that examples are not expected beginner outcomes.</p>
<p>Use broad effort checkpoints:</p>
<ul>
  <li><strong>Opening section:</strong> settle into the rehearsed easy effort and resist banking time.</li>
  <li><strong>Middle section:</strong> maintain the run-walk pattern, route awareness, and fluid plan; do not interpret normal distance as a demand to speed up.</li>
  <li><strong>Later section:</strong> continue only while effort, symptoms, conditions, attention, and mechanics remain appropriate.</li>
  <li><strong>Final section:</strong> a faster finish is optional, not required. Holding or reducing effort can be the successful decision.</li>
</ul>
<p>GPS pace can jump. Use perceived effort and route context rather than reacting to every live number. Do not stare at the screen near traffic, crossings, uneven ground, crowds, animals, or poor visibility.</p>

<h2>What to prepare before starting</h2>
<ul>
  <li>Correct event registration, category, activity window, and proof instructions.</li>
  <li>A safe primary route, backup route, start-time window, and cancellation conditions.</li>
  <li>Familiar shoes, socks, clothing, sun or rain protection, and anti-friction choices where normally used.</li>
  <li>A charged recording device with tested app, activity type, units, permissions, and sufficient storage.</li>
  <li>Appropriate fluids and familiar food based on duration, conditions, health, and professional guidance.</li>
  <li>Phone access, emergency information, transport, money where appropriate, and a trusted person's route expectations.</li>
  <li>Necessary medication carried and used according to personal medical instructions.</li>
  <li>A clear decision to shorten, stop, or seek help rather than protect the result.</li>
</ul>
<p>Do not introduce a new supplement, shoe, sock, hydration product, carrying belt, audio system, or aggressive warm-up because the day feels special. Familiar and functional is usually more informative than novel.</p>

<h2>Your final pre-start check</h2>
<ol>
  <li>Recheck official weather, local conditions, air, route access, and event status close to departure.</li>
  <li>Tell the appropriate person the planned route and expected check-in where relevant.</li>
  <li>Open the correct recorder and select the accepted activity type.</li>
  <li>Confirm battery, units, GPS-ready indication where applicable, and that auto-pause matches the tested plan.</li>
  <li>Begin from an appropriate safe location rather than a road edge or crowded crossing.</li>
  <li>Start the recording before moving, then put the device in its secure tested position.</li>
  <li>Begin with the rehearsed easy warm-up or opening effort.</li>
</ol>
<p>If a critical condition is wrong, delay or end the attempt. The event window creates an opportunity, not an instruction to ignore current facts.</p>

<h2>What to do during the 10K</h2>
<h3>Keep the early kilometres deliberately controlled</h3>
<p>Let other runners, app announcements, or an ambitious forecast go. Follow your plan. A calm beginning preserves options later.</p>
<h3>Use checkpoints without turning them into tests</h3>
<p>At familiar landmarks or broad distance points, ask about breathing, symptoms, posture, attention, heat, route, and the next safe exit. The answer may be continue, walk, slow, pause safely, change route, or stop.</p>
<h3>Follow the familiar fluid and food plan</h3>
<p>Needs vary with duration, weather, body size, health, and individual response. Do not force a universal amount or try unfamiliar fuel. Use the plan tested in preparation or guidance specific to you.</p>
<h3>Protect route awareness</h3>
<p>Audio, pace screens, photography, and messages must not displace traffic, surface, people, animals, weather, or personal-security awareness. Move fully aside before operating the device.</p>
<h3>Do not chase GPS distance</h3>
<p>If the route reads short or tracking stops, reach a safe place and preserve the record. Do not automatically add a hard loop, run into an unsafe area, edit points, or invent the planned distance.</p>

<h2>When to slow, stop, or seek help</h2>
<p>Slow or stop when effort becomes uncontrolled, form deteriorates materially, route attention fails, conditions become unsafe, or pain and symptoms require it. Seek appropriate urgent help for chest pain, fainting, confusion, severe breathing difficulty, signs of heat illness, a serious injury, or another alarming change.</p>
<p>Lightning, flooding, dangerous heat, poor air, low visibility, traffic conflict, harassment, route closure, or loss of safe navigation can end the attempt even when the body feels capable. A virtual event does not supply automatic marshals or emergency support.</p>
<p>People with relevant medical conditions, symptoms, recent injury or surgery, pregnancy-related concerns, or uncertainty about increasing activity should seek individualized advice from an appropriately qualified health professional. This guide is not personal clearance.</p>
<p>Stopping does not create training debt. Preserve what was recorded, reach safety, and decide later whether another attempt is appropriate within the rules.</p>

<h2>Save and review your activity</h2>
<ol>
  <li>Move to a safe stationary location before ending the recorder.</li>
  <li>Use the normal finish-and-save workflow once.</li>
  <li>Wait for the original activity to save or sync before closing apps or restarting devices.</li>
  <li>Verify date, distance, duration, activity type, units, and source.</li>
  <li>Inspect the route for gaps, jumps, cut corners, implausible pace, or an early stop.</li>
  <li>Preserve the original record and privacy settings.</li>
  <li>Capture the evidence view required by the event without altering performance fields.</li>
</ol>
<p>A display above 10.00 does not by itself guarantee eligibility, and a clean map does not guarantee approval. Conversely, an honest anomaly is not automatic proof of wrongdoing. Review and disclose it through the organizer's process.</p>

<h2>Submit your proof correctly</h2>
<p>Select the correct registration and activity. Compare every OCR-assisted or imported field with the original. Confirm the actual date, distance, duration, activity type, unit, source, and any required identity information. Protect irrelevant private information without hiding fields the event needs.</p>
<p>The <a href="/blog/how-to-submit-run-proof-correctly-hellorun">HelloRun proof guide</a> documents the screenshot and supported connected-Strava workflows. Connected import does not repair GPS, override activity eligibility, or guarantee approval.</p>
<p>Submit before the deadline and avoid repeated clicks or duplicate uploads when the response is uncertain. Submitted or pending means the evidence exists for applicable checks; it is not yet approved completion, official progress, rank, certificate, or reward.</p>
<p>If rejected, use the documented correction route when available. Do not alter distance, splice files, borrow another person's activity, or create a cleaner-looking record that no device captured.</p>

<h2>What to do after your first 10K</h2>
<p>After saving the record, walk easily if appropriate, move to a suitable place, change wet clothing, and use familiar food and fluids according to your needs. Do not let upload urgency keep you standing in traffic, direct sun, severe weather, or another unsafe location.</p>
<p>Review the attempt after immediate needs settle:</p>
<ul>
  <li>Was the opening effort controlled?</li>
  <li>Did the planned run-walk pattern remain useful?</li>
  <li>Were route, start time, weather decisions, fluids, clothing, and tracking appropriate?</li>
  <li>What changed in the later kilometres?</li>
  <li>How do ordinary movement, appetite, sleep, mood, and symptoms feel later and the next day?</li>
  <li>What should be repeated, simplified, or changed before another longer activity?</li>
</ul>
<p>One first 10K is not a demand to repeat the distance immediately. Return to easier familiar activity and allow recovery appropriate to your response and guidance.</p>

<h2>Define success before you start</h2>
<p>Choose goals that remain meaningful if pace, weather, route, or technology changes. A useful first goal may be to follow the opening effort, use planned walk breaks, make safe decisions, preserve honest evidence, and learn from the distance. A finish time can be recorded without becoming the only verdict.</p>
<p>Separate goals into priorities. Safety and event integrity come first. Controlled execution comes next. A pace goal, negative split, uninterrupted running, photo, or social post is optional and can be abandoned without making the activity a failure. This order prevents a secondary target from overruling current conditions.</p>
<p>Also define what stopping successfully looks like: moving to safety, saving the original activity, contacting the appropriate person, and recovering rather than hiding the attempt. A responsible incomplete 10K can provide better information than an unsafe finish. The next decision should come from that evidence, not embarrassment.</p>

<h2>Are you ready to work toward 21K?</h2>
<p>Not automatically. A half marathon is more than twice the distance and can require substantially more preparation, time on feet, recovery, fueling, route logistics, and risk management. Finishing one 10K—especially if it was a maximum effort—does not establish half-marathon readiness.</p>
<p>First consider making 10K repeatable, improving weekly consistency, or completing it with better control. Review how the attempt affected ordinary movement and subsequent training. A 21K goal should have its own readiness decision, preparation period, event rules, and individualized considerations; the <a href="/blog/21k-half-marathon-for-beginners">beginner 21K preparation guide</a> supplies that separate review.</p>
<p>Do not register for 21K solely to preserve momentum, claim a larger medal, or follow another participant's timeline. Remaining at 5K or 10K can be a complete and worthwhile choice.</p>
<p>The <a href="/blog/how-to-set-running-goals-for-the-rest-of-the-year">year-end running-goals guide</a> helps choose whether repeating 10K, building consistency, or beginning a separate longer progression should become the main outcome.</p>

<h2>Frequently asked questions</h2>
<h3>Can a beginner run a virtual 10K?</h3>
<p>A beginner with an appropriate, repeatable foundation may work toward one. “Beginner” alone does not establish readiness. Use recent activity, recovery, health, preparation time, and event demands.</p>
<h3>Do I need to run the entire 10K?</h3>
<p>Not when the event accepts run-walk or walking and your evidence follows its rules. Continuous running is not a universal requirement.</p>
<h3>How long should a first virtual 10K take?</h3>
<p>There is no required general time. Pace, walking, terrain, stops, weather, GPS, and individual capacity vary. Only a published event cutoff creates an eligibility time.</p>
<h3>Should my training include a full 10K?</h3>
<p>Not universally. The existing beginner plan builds from a repeatable longer activity and does not require a full-distance rehearsal.</p>
<h3>Should I run extra because GPS may read short?</h3>
<p>Do not use a universal buffer. Plan a conservative safe route and understand the event's displayed-distance requirement, but never add unsafe or exhausting distance merely to chase the screen.</p>
<h3>Can I split 10K into two activities?</h3>
<p>Only if the event is accumulated or explicitly accepts split completion. A single-activity 10K ordinarily requires one qualifying record.</p>
<h3>Does walking count?</h3>
<p>Only when the selected event accepts it. Label the activity honestly.</p>
<h3>What if GPS stops?</h3>
<p>Reach a safe place, preserve the original record, and follow the event's anomaly or replacement process. Do not manufacture missing points.</p>
<h3>Does submitting 10K mean I finished officially?</h3>
<p>No. The result may remain pending until it passes applicable checks. Approval determines official event status under the rules.</p>

<h2>Method and limitations</h2>
<p>This guide was reviewed in August 2026 using current WHO, CDC, NHS, and World Athletics public guidance together with HelloRun registration, event-window, one-time-result, screenshot, supported connected-Strava, review, correction, and runner-progress behavior.</p>
<p>The public-health sources provide population guidance and examples of gradual activity. World Athletics provides general virtual-race logistics. None of those sources validates this exact sequence, certifies a route, predicts a finish, or gives personal medical clearance.</p>
<p>HelloRun behavior and event rules can change. The live event listing, source-device instructions, submission interface, and organizer decision remain authoritative. This article is general education, not individualized training, nutrition, hydration, medical, emergency, or legal advice.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.who.int/publications/i/item/9789240015128">WHO Guidelines on Physical Activity and Sedentary Behaviour</a></li>
  <li><a href="https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html">CDC: Steps for Getting Started With Physical Activity</a></li>
  <li><a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/">NHS Couch to 5K Running Plan</a></li>
  <li><a href="https://worldathletics.org/personal-best/performance/how-run-best-virtual-race-advice">World Athletics: Virtual Race Advice</a></li>
</ul>

<h2>Choose a suitable 10K event</h2>
<p><a href="/events">Browse current HelloRun events</a> and choose a 10K challenge only after the schedule, accepted activity, route, proof, and preparation demands fit your situation. The most useful first event is one you can approach honestly and conservatively—not simply the soonest listing.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'What is a virtual 10K?',
  'Check the event rules first',
  'Give yourself enough preparation time',
  'A seven-day readiness review',
  'Choose a realistic route',
  'Decide whether you will run or run-walk',
  'Test your tracking app or watch',
  'Plan your pacing',
  'What to prepare before starting',
  'Your final pre-start check',
  'What to do during the 10K',
  'When to slow, stop, or seek help',
  'Save and review your activity',
  'Submit your proof correctly',
  'What to do after your first 10K',
  'Define success before you start',
  'Are you ready to work toward 21K?',
  'Frequently asked questions',
  'Method and limitations',
  'Official and platform sources',
  'Choose a suitable 10K event'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers"',
  'href="/blog/10k-training-plan-for-beginners"',
  'href="/blog/how-to-choose-a-safe-route-for-your-virtual-run"',
  'href="/blog/run-walk-method-beginner-friendly-way-build-endurance"',
  'href="/blog/can-you-walk-a-virtual-run"',
  'href="/blog/how-accurate-is-phone-gps-for-running"',
  'href="/blog/beginners-guide-to-running-pace"',
  'href="/blog/how-long-to-run-5k-10k-21k"',
  'href="/blog/how-to-submit-run-proof-correctly-hellorun"',
  'href="/blog/gps-watch-vs-running-app"',
  'href="/blog/21k-half-marathon-for-beginners"',
  'href="/blog/how-to-set-running-goals-for-the-rest-of-the-year"'
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

  if (ARTICLE.slug !== CANONICAL_SLUG) errors.push('canonical slug does not match');
  if (!payload.title || payload.title.length > 120) errors.push('title must be 1-120 characters');
  if (!payload.excerpt || payload.excerpt.length > 220) errors.push('excerpt must be 1-220 characters');
  if (!payload.contentHtml || payload.contentHtml.length > 50000) errors.push('contentHtml must be 1-50000 characters');
  if (!payload.contentText || payload.contentText.length > 50000) errors.push('contentText must be 1-50000 characters');
  if (payload.contentRaw !== payload.contentText) errors.push('contentRaw and contentText must match');
  if (wordCount < 3000) errors.push('article must contain at least 3000 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('cover artwork is required for publication');
  if (/<h1\b/i.test(payload.contentHtml)) errors.push('body must not contain a page-level h1');
  if (/<h[12]>How to Run Your First 10K Virtual Run<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/(?:everyone|every beginner) (?:can|will) (?:safely )?(?:run|complete) 10K|10K is safe for everyone/i.test(text)) errors.push('article must not guarantee universal readiness or safety');
  if (/completing (?:this|the) plan guarantees? (?:a )?10K|guaranteed 10K finish/i.test(text)) errors.push('article must not guarantee completion');
  if (/(?:must|should) make up missed (?:training|distance)|double (?:the next|your next) (?:run|session) to catch up/i.test(text)) errors.push('article must not prescribe catch-up training');
  if (/every virtual 10K (?:allows|accepts) (?:walking|run-walk|treadmill)|walking always counts/i.test(text)) errors.push('article must not claim universal event acceptance');
  if (/(?:always|must) run an extra \d+%|universal GPS buffer/i.test(text)) errors.push('article must not prescribe a universal GPS buffer');
  if (/(?:edit|invent|draw) GPS points to (?:reach|complete|fix) 10K|submit planned distance as recorded/i.test(text)) errors.push('article must not endorse manufactured evidence');
  if (/pending (?:evidence|activity|distance) (?:counts|is counted) (?:as )?(?:official|approved|completion)/i.test(text)) errors.push('article must not count pending evidence officially');
  if (/first 10K means you are ready for (?:a )?(?:21K|half marathon)|21K is the automatic next step/i.test(text)) errors.push('article must not claim automatic 21K readiness');
  if (!/To complete your first 10K virtual run, choose an event/i.test(text)) errors.push('article must answer intent immediately');
  if (!/This guide focuses on executing one first 10K opportunity after preparation; it is not another week-by-week training programme/i.test(text)) errors.push('article must distinguish the training plan');
  if (!/reviewed in August 2026/i.test(text)) errors.push('article must disclose methodology and date');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }
  if (errors.length) throw new Error(`Invalid first virtual 10K guide payload: ${errors.join('; ')}`);
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
