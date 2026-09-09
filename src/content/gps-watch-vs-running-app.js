'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'gps-watch-vs-running-app';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'GPS Watch vs Running App: Which Should Beginners Use?',
  excerpt: 'Compare phone running apps and GPS watches by cost, tracking, battery, controls, metrics, privacy, and virtual-run proof before deciding whether to upgrade.',
  category: 'Gear',
  tags: Object.freeze([
    'GPS watch',
    'running app',
    'running watch',
    'phone GPS',
    'beginner running gear',
    'fitness watch',
    'run tracking',
    'virtual run proof'
  ]),
  seoTitle: 'GPS Watch vs Running App: Which Should Beginners Use?',
  seoDescription: 'Compare GPS watches and phone running apps for distance tracking, convenience, accuracy, battery life, cost, and virtual-run proof.',
  coverImageAlt: 'Editorial clay-relief illustration of a Filipino beginner comparing a plain GPS watch and unbranded phone before a park run'
});

const RAW_CONTENT_HTML = `
<p>No, a beginner does not need a GPS watch to start running. A compatible phone running app can record distance, duration, pace, and route well enough for ordinary training and for a virtual event that accepts its evidence. Buy a watch only when a tested wrist-based workflow solves a recurring problem that matters to you.</p>
<p>A watch is not automatically more accurate, safer, or more legitimate. A phone is not automatically simpler or cheaper once battery condition, carrying comfort, permissions, data plans, and accessories are considered. The useful comparison is between the exact phone-and-app setup you have and the exact watch you might buy, on the routes and activity lengths you actually use.</p>
<blockquote><strong>Beginner recommendation:</strong> start with the device you already own, test the complete record-save-sync-proof workflow, and upgrade only when you can name the limitation the purchase should fix.</blockquote>

<h2>Can you run without a GPS watch?</h2>
<p>Yes. Running requires neither a smartwatch nor a live pace display. You can move by time, landmarks, perceived effort, or a measured route. If you want a digital record, a phone app can use the phone's location services to create an outdoor activity. For a virtual run, eligibility comes from the event rules and reviewable evidence—not from wearing a particular category of device.</p>
<p>A phone can also remain valuable after buying a watch. It may provide emergency communication, maps, the companion app, activity history, proof screenshots, music, and the connection used to sync the watch. “Watch versus phone” is therefore often a choice about the primary recorder and controls, not a promise that one device entirely replaces the other.</p>
<p>This guide compares recording workflows. The <a href="/blog/best-apps-to-track-your-virtual-run">running-app comparison</a> evaluates six app ecosystems for virtual-run proof, while the <a href="/blog/how-accurate-is-phone-gps-for-running">phone-GPS accuracy guide</a> explains drift, route cutting, permissions, and processing in more technical depth.</p>

<h2>How this comparison was prepared</h2>
<p>This article was reviewed in August 2026 using current public documentation from GPS.gov, Android Developers, Apple Support, Garmin Support, Strava Support, and the documented HelloRun screenshot and connected-Strava submission workflows. It is a category comparison, not laboratory testing of every phone, app, watch, firmware version, route, or sensor.</p>
<p>Manufacturer documentation is used to show that settings, calibration, satellite modes, sensors, and battery trade-offs exist. It does not prove that one brand is best. Features, prices, subscriptions, compatibility, regional availability, battery estimates, and screen layouts change; verify the current documentation for the exact model and app before spending money.</p>

<h2>Phone running apps in plain language</h2>
<p>A phone running app requests location updates and turns a series of estimated positions into a route, distance, speed, and pace. It may combine satellite signals with other location sources and motion sensors, then process the activity during or after recording. The result depends on the phone hardware, operating-system permissions, power settings, app behavior, route, and signal conditions.</p>
<p>Android documentation shows why setup matters: a user may grant precise or approximate location, and power-saving behavior can affect location access. An app also needs to remain able to record while the screen is locked or another interface is visible. The correct instructions vary by phone manufacturer and operating-system version.</p>
<p>After finishing, the app usually saves the activity locally, uploads it, or does both. Some apps are both recorder and activity history. Others receive a record made by a watch. The visible summary can differ from the raw points because platforms may smooth, filter, recalculate, or format uploaded data.</p>

<h2>GPS running watches in plain language</h2>
<p>A GPS running watch is a wrist-worn computer with an activity profile, satellite receiver, controls, storage, and usually motion and optical heart-rate sensors. It can record without the runner holding a phone, show selected fields at a glance, mark laps, issue alerts, and save the workout for later syncing.</p>
<p>Not every fitness band or smartwatch has independent satellite recording. Some models use a connected phone's location; others have built-in GNSS; some can switch among several satellite modes. An advertised “GPS watch” should therefore be checked for the exact activity behavior you need rather than judged by its product category.</p>
<p>A companion phone app often remains part of the workflow. It can install updates, change settings, receive the saved activity, show the full map and charts, and pass an eligible record to another service. A watch that records reliably but cannot sync to a reviewable source may be a poor fit for a particular virtual event.</p>

<h2>GPS watch versus running app at a glance</h2>
<h3>Initial cost</h3>
<p><strong>Phone app:</strong> usually the lower-cost starting point when you already own a compatible phone and the required recording features are free. A subscription, arm belt, waist belt, battery replacement, or newer phone can change the total.</p>
<p><strong>GPS watch:</strong> requires a separate purchase unless you already own one. The total can include straps, charging cable replacement, sensors, subscriptions, or an eventual battery or device replacement. More expensive does not mean more appropriate.</p>
<h3>GPS tracking</h3>
<p><strong>Phone app:</strong> can produce a useful outdoor track with the right permissions, stable app behavior, secure placement, and suitable satellite conditions.</p>
<p><strong>GPS watch:</strong> offers a dedicated receiver and activity profile on the wrist. Some models provide multiple constellations or frequency modes. These capabilities can help in some environments but do not eliminate obstruction, reflection, drift, or processing differences.</p>
<h3>Battery</h3>
<p><strong>Phone app:</strong> shares one battery with communication, maps, camera, music, screen, mobile data, and background services. Battery health and power restrictions matter.</p>
<p><strong>GPS watch:</strong> separates activity recording from the phone's main battery and may be designed for long workouts. Actual runtime depends on model, age, display, sensors, satellite mode, alerts, music, temperature, and settings.</p>
<h3>Screen access while running</h3>
<p><strong>Phone app:</strong> offers a large readable screen but may require reaching into a pocket, belt, or armband. Audio cues can reduce handling.</p>
<p><strong>GPS watch:</strong> makes selected fields and buttons accessible at the wrist. A small screen can still be hard to read, operate, or interpret, especially in rain, glare, motion, or with limited dexterity.</p>
<h3>Heart-rate and training data</h3>
<p><strong>Phone app:</strong> may estimate pace and accept data from a compatible sensor, but the phone alone usually does not provide wrist optical heart rate.</p>
<p><strong>GPS watch:</strong> may record wrist heart rate, cadence, recovery estimates, training load, navigation, or other metrics. Availability and validity depend on the model, fit, sensor, algorithm, activity, and person.</p>
<h3>Convenience</h3>
<p><strong>Phone app:</strong> keeps recording, communication, maps, photos, and proof in one familiar device but requires a secure carrying plan.</p>
<p><strong>GPS watch:</strong> can reduce phone handling and make start, lap, pause, and finish controls easier. It introduces charging, syncing, firmware, fit, and another interface to learn.</p>
<h3>Virtual-run proof</h3>
<p><strong>Phone app:</strong> can provide a direct completed-activity screen when accepted. Confirm that date, distance, duration, unit, activity type, and source are visible.</p>
<p><strong>GPS watch:</strong> usually produces the most reviewable proof after syncing to its companion app or a supported connected service. A photo of the watch face alone may omit the date, source, map, or full activity context.</p>
<h3>Beginner suitability</h3>
<p><strong>Phone app:</strong> a sensible default when cost matters, sessions fit the battery, the phone is comfortable to carry, and the workflow has been tested.</p>
<p><strong>GPS watch:</strong> a sensible optional upgrade when wrist controls, activity battery, reliable laps, accessibility, or a particular metric solves a defined ongoing need.</p>

<h2>Which is more accurate?</h2>
<p>Neither category is universally more accurate. GPS.gov explains that received accuracy depends on satellite geometry, blockage, atmospheric conditions, and receiver design and quality. Buildings, bridges, and trees can worsen a consumer receiver's position. Route distance then depends on how the device samples and connects many positions, not one accuracy number.</p>
<p>A newer multi-frequency watch may outperform an older phone on a difficult route. A modern phone may outperform an older or poorly configured watch. Either can record a clean open-sky loop or a distorted building-lined street. One successful test does not establish a universal winner, and the closest result to a mapped distance is not necessarily the truest record.</p>
<p>Garmin documents that consumer receivers are not perfectly accurate and recommends acquiring satellite signal outdoors with a clear view of the sky. Its support material also describes satellite modes that trade battery for tracking detail. Apple documents calibration and notes that device generation can change whether a watch uses its own GPS or a nearby phone. These examples show why model and settings matter; they are not endorsements.</p>
<p>Do not compare devices by recording one run on both and automatically declaring the total you prefer correct. Identify the original source, inspect gaps and drift, repeat on familiar routes under comparable conditions, and keep the <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe-route decision</a> more important than signal optimization.</p>

<h2>Battery life: compare the whole activity</h2>
<p>A specification is only a planning estimate. Compare the required activity duration with the actual device at its current battery health and intended settings. Navigation, always-on display, music, phone calls, camera use, mobile data, heart-rate sensors, satellite mode, heat, and background apps can change consumption.</p>
<p>A phone has the advantage of being the communication device you may carry anyway. It has the disadvantage that recording competes with that emergency and navigation reserve. A watch separates the primary activity recorder, but a depleted watch can still end the original record and may not reconstruct missed distance later.</p>
<p>Test a duration close enough to reveal practical battery behavior without turning the test into unnecessary training. Start an important activity with a sensible charge, close avoidable high-drain tasks, and follow device-specific instructions. Do not enable an unfamiliar maximum-battery mode on event day: some modes record less frequently and can reduce track detail.</p>

<h2>Ease of use during a run</h2>
<p>A watch often wins for quick interaction. Physical buttons may work better than a wet touchscreen, laps can be marked without removing a phone, and a glance may show elapsed time or broad pace. That advantage disappears if the screen is cluttered, the controls are unfamiliar, or the runner watches numbers instead of the route.</p>
<p>A phone's larger display can be easier before and after the activity. During movement, unlocking it can disturb form and attention. Configure audio cues or a simple locked-screen view when appropriate, place the phone securely, and move completely aside before using detailed maps or controls.</p>
<p>Accessibility is individual. A runner may prefer a phone's larger type, screen reader, voice control, or familiar interface. Another may find wrist vibration, physical buttons, and independence from a pocket easier. Test with the clothing, rain protection, glasses, hearing environment, and movement pattern you normally use.</p>

<h2>Training metrics: more data is not automatically better</h2>
<p>A basic app can show time, distance, route, average pace, and splits. That is enough to organize many beginner routines. A watch may add live lap pace, wrist heart rate, cadence, elevation, recovery estimates, training status, sleep, navigation, and structured workouts. Each extra field creates another measurement and interpretation question.</p>
<p>The <a href="/blog/running-cadence-explained">cadence guide</a> shows why one metric should remain descriptive unless there is a clear reason to change it. The same principle applies to predicted race times, fitness scores, recovery hours, training load, and performance condition. An algorithm can summarize its inputs; it cannot know every symptom, life demand, route hazard, or medical factor.</p>
<p>Optical wrist heart rate is also an estimate. Fit, motion, skin contact, environment, tattoos, device position, and physiology can affect readings. Apple and Garmin both publish fit and limitation guidance. Do not diagnose a condition, establish medical clearance, or ignore concerning symptoms because a wearable number looks normal. Seek appropriate professional help for alarming or persistent symptoms.</p>

<h2>Cost: decide from the problem, not the product tier</h2>
<p>A free app on an existing suitable phone has the lowest immediate equipment cost. That does not make every phone viable: a failing battery, unreliable location, cracked screen, insufficient storage, unsafe carrying method, or unsupported operating system may create real limitations. Still, buying a watch solely because other runners wear one is not a solution statement.</p>
<p>Write the problem before comparing products. Examples include “I cannot operate my phone safely while moving,” “my planned activities exceed its tested recording battery,” “I need physical lap controls,” or “a clinician or coach has asked for a specific compatible sensor workflow.” Then identify the minimum capability that addresses it.</p>
<p>Ignore premium metrics you cannot explain or will not use. Check warranty, return policy, repairability, charging method, replacement straps, app support, export and sync behavior, privacy controls, accessibility, phone compatibility, and likely useful life. A discounted old model can be poor value if its battery or software support no longer fits the task.</p>

<h2>Virtual-run proof and screenshots</h2>
<p>HelloRun supports event-dependent screenshot evidence and a supported connected-Strava path. An event can accept a narrower set of activity types or proof than the platform can technically display. A phone recording, watch sync, or Strava connection does not guarantee eligibility or approval.</p>
<p>For screenshot evidence, use the completed activity summary—not a live screen, marketing dashboard, daily ring, step total, or cropped map. Confirm the actual date, distance, duration, unit, activity type, source, and required identity context. Preserve the original record and protect unrelated private information without hiding required fields.</p>
<p>For a watch, let the activity save and sync before capturing proof. The companion app is usually clearer than a photograph of a small watch face. For a supported connected Strava activity, HelloRun imports eligible source information from the connected account; it does not repair GPS or turn an excluded activity type into an eligible one.</p>
<p>The <a href="/blog/how-to-submit-run-proof-correctly-hellorun">proof-submission guide</a> covers the current workflow. Submitted and pending are not approved progress. Do not edit distance, splice files, redraw a route, or select the most favorable duplicate record merely to satisfy a minimum.</p>

<h2>Should you record on both phone and watch?</h2>
<p>Dual recording can be useful during a setup test, but it can also create duplicate activities, battery drain, conflicting alerts, and uncertainty about the source of truth. Before using two recorders for an event, decide which one is primary, whether the event permits the intended evidence, and how automatic syncs will behave.</p>
<p>Do not merge totals or choose whichever device happens to show more distance. A difference does not prove either record is fraudulent, and a closer-looking number is not automatically correct. Preserve both originals where necessary, submit the permitted primary record, and explain a genuine discrepancy through the available organizer process.</p>
<p>If the primary device fails, a backup record is not automatically accepted. Safety comes first: reach an appropriate place before troubleshooting. The existence of two screens must not encourage extra distance, a rigid catch-up loop, or continuing in unsafe conditions.</p>

<h2>Which option is better for most beginners?</h2>
<p>Use a phone app first when all of these are reasonably true:</p>
<ul>
  <li>you already own a compatible phone with a healthy enough battery;</li>
  <li>the app records and saves reliably with current permissions;</li>
  <li>you have a secure, comfortable carrying method;</li>
  <li>audio cues or occasional safe checks provide enough information;</li>
  <li>the completed summary meets your event's evidence rules;</li>
  <li>you do not need watch-only controls or a particular compatible sensor;</li>
  <li>avoiding another purchase is valuable.</li>
</ul>
<p>Consider a watch when several of these are consistently true:</p>
<ul>
  <li>you run often enough that starting and controlling activities from the wrist would remove friction;</li>
  <li>your tested phone battery is inadequate for your legitimate planned activity while preserving communication reserve;</li>
  <li>you need readable laps, vibration alerts, buttons, navigation, or accessibility features at the wrist;</li>
  <li>you are following an appropriate plan that uses a specific compatible metric or structured workout;</li>
  <li>you understand the companion app, sync path, privacy, and event-proof output;</li>
  <li>the cost fits without displacing more important needs.</li>
</ul>
<p>Neither list is a medical or training prescription. It is a purchase filter. If the phone passes the first list, a watch can remain a preference rather than a need.</p>

<h2>When upgrading to a watch makes sense</h2>
<p>An upgrade makes sense when the limitation repeats after reasonable setup fixes. For example, Ana has used the same phone app for months. The record is reliable, but removing the phone from a waist belt for manual laps is awkward, and her structured sessions genuinely use lap controls. She chooses a modest compatible watch after testing its interface and proof workflow. The purchase addresses a demonstrated control problem.</p>
<p>Another runner is preparing for longer supported activities and has measured that the phone cannot maintain recording plus communication reserve under the intended settings. A watch with verified activity runtime may separate those jobs. The runner still carries the phone when appropriate and treats advertised battery as something to test, not a guarantee.</p>
<p>A watch may also support accessibility, navigation, or a professional monitoring plan. In those cases, compare the exact feature, compatibility, and limitations. Do not substitute a consumer watch for prescribed medical equipment or professional assessment.</p>

<h2>When keeping the phone makes more sense</h2>
<p>Keep the phone-first workflow when it already records cleanly, sessions are comfortably within battery, the phone is secure, proof is accepted, and live wrist data would not change a useful decision. The money may be better kept for transport to a suitable route, comfortable shoes when genuinely needed, event fees, sun or rain protection, or no purchase at all.</p>
<p>Marco records three weekly run-walk sessions with a free app. Audio cues announce broad time, his waist belt is comfortable, and completed summaries show the fields his selected event requires. He wants a watch because friends share colorful recovery scores, but cannot name a current limitation. Waiting is a sound gear decision.</p>
<p>For a prepared first 10K, the <a href="/blog/how-to-run-your-first-10k-virtual-run">first virtual 10K guide</a> prioritizes rules, route, pacing, tracking tests, honest proof, and recovery. None of those requires a new watch when the existing setup works.</p>

<h2>A beginner buying checklist</h2>
<ul>
  <li><strong>Independent GPS:</strong> does the exact model record outdoors without borrowing the phone's location?</li>
  <li><strong>Activity battery:</strong> what does the manufacturer claim for the intended satellite and display settings, and what return margin will you keep?</li>
  <li><strong>Controls:</strong> can you start, pause, lap, finish, and save with the interface you can actually operate?</li>
  <li><strong>Display and alerts:</strong> are type size, contrast, vibration, sound, buttons, and data fields usable for you?</li>
  <li><strong>Metrics:</strong> which fields solve a real need, and what are their documented limitations?</li>
  <li><strong>Phone compatibility:</strong> does the companion app support your current operating system and account region?</li>
  <li><strong>Sync and export:</strong> can you reach a clear original activity and an accepted proof path?</li>
  <li><strong>Privacy:</strong> can you control route, account, health, and sharing exposure appropriately?</li>
  <li><strong>Fit:</strong> is the watch comfortable and secure without being excessively tight?</li>
  <li><strong>Ownership cost:</strong> include charging, straps, sensors, subscription, warranty, returns, and replacement assumptions.</li>
</ul>
<p>Do not buy on a race-week deadline if you can avoid it. A new device creates setup, calibration, fit, charging, controls, sync, and evidence questions. Familiar equipment is usually the better event-day choice.</p>

<h2>Test either setup before an important activity</h2>
<ol>
  <li>Read the event rules and identify accepted activity types, timing, minimum distance, proof, and deadline.</li>
  <li>Update the device and app with enough time to resolve problems, then avoid unnecessary changes immediately before the event.</li>
  <li>Confirm precise location where required, activity profile, units, pause behavior, battery mode, permissions, storage, and account.</li>
  <li>Use a familiar suitable outdoor route with a clear start location; wait for the documented ready state.</li>
  <li>Record a short ordinary activity without staring at live numbers.</li>
  <li>Finish and save once, then allow the original activity to sync.</li>
  <li>Inspect date, distance, duration, unit, activity type, route anomalies, source, and privacy.</li>
  <li>Open the exact screenshot or connected path intended for proof.</li>
  <li>Repeat if needed before trusting a new setup for a meaningful distance.</li>
</ol>
<p>A test confirms workflow, not permanent accuracy. Recheck battery, weather, route, software, and event status before the qualifying activity.</p>

<h2>Frequently asked questions</h2>
<h3>Do I need a GPS watch for running?</h3>
<p>No. Use time, effort, landmarks, or a tested phone app. A watch is optional equipment.</p>
<h3>Is a running watch more accurate than a phone?</h3>
<p>Not universally. The exact receiver, satellite mode, phone, app, route, obstruction, settings, and processing determine the comparison.</p>
<h3>Can I run without a smartphone?</h3>
<p>Yes for movement itself. Whether a watch records independently, syncs later, provides emergency communication, and produces accepted event proof depends on the model and situation.</p>
<h3>Does a GPS watch need a phone?</h3>
<p>Some watches record an outdoor activity independently but still use a phone for setup, updates, syncing, maps, or proof. Other wearables rely on connected phone GPS. Check the exact model.</p>
<h3>Can a phone app be used for a virtual run?</h3>
<p>Yes when the event accepts its activity type and evidence and the record meets the requirements. Technical recording does not guarantee approval.</p>
<h3>Should I use phone GPS or Garmin?</h3>
<p>Compare your exact phone-and-app workflow with the exact Garmin model and settings. Garmin is a broad product family, not one accuracy result. Choose from tested needs rather than the brand name.</p>
<h3>Is wrist heart rate accurate enough for training?</h3>
<p>It can be useful context, but accuracy varies with fit, motion, environment, sensor, and person. Do not use it as medical clearance or let it override symptoms and appropriate professional guidance.</p>
<h3>Will a watch guarantee better virtual-run proof?</h3>
<p>No. A clear accepted phone summary can be stronger than an incomplete watch photo. The event rules, original record, visible fields, and review determine eligibility.</p>
<h3>Should beginners monitor live pace?</h3>
<p>Only when it supports the planned effort without distracting from route awareness. Broad effort or audio cues may be more useful than reacting to every GPS fluctuation.</p>
<h3>What should I buy first?</h3>
<p>Nothing by default. Test what you own, identify a repeated limitation, then buy the least complicated suitable solution if the benefit justifies the cost.</p>

<h2>Method and limitations</h2>
<p>This comparison describes category-level trade-offs and current HelloRun proof behavior. It does not score products, quote prices or manufacturer battery hours, diagnose sensor readings, certify route distance, or promise that any phone or watch will finish recording.</p>
<p>GPS.gov describes signal and receiver factors. Android documentation describes phone permissions and location behavior. Apple and Garmin documentation illustrates model, calibration, fit, sensor, satellite-mode, and battery trade-offs. Strava documents mobile recording and saving. Each source governs its own system, not every device or HelloRun event.</p>
<p>Recheck manufacturer instructions, app permissions, privacy terms, event mechanics, and local route conditions. Obtain individualized technical, training, accessibility, or health guidance where needed.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.gps.gov/gps-accuracy-0">GPS.gov: GPS Accuracy</a></li>
  <li><a href="https://developer.android.com/develop/sensors-and-location/location/permissions/runtime">Android Developers: Request Location Access at Runtime</a></li>
  <li><a href="https://support.apple.com/en-ie/105048">Apple Support: Calibrate Apple Watch for Workout Accuracy</a></li>
  <li><a href="https://support.apple.com/en-us/105002">Apple Support: Get Accurate Apple Watch Measurements</a></li>
  <li><a href="https://support.garmin.com/en-HK/?faq=Te47runiFR93oKcUAItwU7">Garmin Support: Improve GPS Distance, Speed, and Pace Data</a></li>
  <li><a href="https://support.garmin.com/nl-BE/?faq=13CvcPK8Um0mekc3F2eVmA">Garmin Support: Watch Satellite System Options</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15402137-recording-an-activity">Strava Support: Recording an Activity</a></li>
</ul>

<h2>Use the device you can operate reliably</h2>
<p>Test your current setup before an important activity. If it records, saves, syncs, and produces accepted proof without compromising comfort, attention, battery reserve, or budget, it is enough. When you are ready to use that workflow in an event, <a href="/events">browse current HelloRun events</a> and read the complete live rules before registering.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Can you run without a GPS watch?',
  'How this comparison was prepared',
  'Phone running apps in plain language',
  'GPS running watches in plain language',
  'GPS watch versus running app at a glance',
  'Which is more accurate?',
  'Battery life: compare the whole activity',
  'Ease of use during a run',
  'Training metrics: more data is not automatically better',
  'Cost: decide from the problem, not the product tier',
  'Virtual-run proof and screenshots',
  'Should you record on both phone and watch?',
  'Which option is better for most beginners?',
  'When upgrading to a watch makes sense',
  'When keeping the phone makes more sense',
  'A beginner buying checklist',
  'Test either setup before an important activity',
  'Frequently asked questions',
  'Method and limitations',
  'Official and platform sources',
  'Use the device you can operate reliably'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/blog/best-apps-to-track-your-virtual-run"',
  'href="/blog/how-to-choose-a-safe-route-for-your-virtual-run"',
  'href="/blog/how-accurate-is-phone-gps-for-running"',
  'href="/blog/running-cadence-explained"',
  'href="/blog/how-to-run-your-first-10k-virtual-run"',
  'href="/blog/how-to-submit-run-proof-correctly-hellorun"'
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
  if (/<h[12]>GPS Watch vs Running App: Which Should Beginners Use\?<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/(?:every beginner|all beginners) (?:needs?|must buy|should buy) (?:a )?(?:GPS |running )?watch|you cannot run without (?:a )?(?:GPS |smart)?watch/i.test(text)) errors.push('article must not require a watch universally');
  if (/(?:GPS |running )?watch(?:es)? (?:are|is) always more accurate|phone GPS is always more accurate/i.test(text)) errors.push('article must not promise a universal accuracy winner');
  if (/more expensive (?:always )?means more accurate|the most expensive watch is best/i.test(text)) errors.push('article must not equate price with accuracy');
  if (/(?:wrist|watch) heart rate is medically accurate|a normal watch reading means you are safe|watch data replaces medical advice/i.test(text)) errors.push('article must not medicalize wearable metrics');
  if (/every virtual (?:run|event) accepts (?:any )?(?:watch|phone|app)|a watch guarantees approval/i.test(text)) errors.push('article must not promise universal event acceptance');
  if (/(?:edit|draw|invent) GPS (?:points|route) to (?:fix|reach|complete)|choose whichever device shows (?:more|the longest) distance/i.test(text)) errors.push('article must not endorse manufactured or cherry-picked evidence');
  if (/dual recording guarantees? (?:a )?backup|two devices guarantee/i.test(text)) errors.push('article must not guarantee dual-recording recovery');
  if (!/No, a beginner does not need a GPS watch to start running/i.test(text)) errors.push('article must answer intent immediately');
  if (!/running-app comparison evaluates six app ecosystems/i.test(text)) errors.push('article must distinguish the app guide');
  if (!/phone-GPS accuracy guide explains drift/i.test(text)) errors.push('article must distinguish the phone accuracy guide');
  if (!/reviewed in August 2026 using current public documentation/i.test(text)) errors.push('article must disclose methodology and date');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }
  if (errors.length) throw new Error(`Invalid GPS watch versus running app payload: ${errors.join('; ')}`);
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
