'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-record-a-treadmill-run-for-a-virtual-event';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Record a Treadmill Run for a Virtual Event',
  excerpt: 'Record a treadmill run with reviewable evidence by checking event rules, choosing an indoor tracking source, preserving distance and duration, and explaining discrepancies.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'treadmill run',
    'indoor running',
    'virtual run',
    'activity proof',
    'run tracking',
    'treadmill distance',
    'fitness watch',
    'result submission'
  ]),
  seoTitle: 'How to Record a Treadmill Run for a Virtual Event',
  seoDescription: 'Learn how to record a treadmill run for a virtual event, compare console and watch distance, preserve proof, submit accurate fields, and handle discrepancies.',
  coverImageAlt: 'Side view of a runner recording an indoor treadmill activity in a quiet gym with clear space and soft morning light'
});

const RAW_CONTENT_HTML = `
<p>A treadmill can be a practical virtual-event option when weather, route access, personal safety, disability, travel, or schedule makes outdoor running unsuitable. It is not automatically eligible. The event must accept indoor or treadmill activity, and the evidence must show the fields that its reviewer needs.</p>
<p>The treadmill console, a watch in indoor-run mode, a paired sensor, and a connected fitness service can report different distances from the same session. That difference is not solved by choosing the largest number. Decide which source the event recognizes, preserve the original summaries, and disclose a material discrepancy rather than editing several records into one ideal total.</p>
<blockquote><strong>The treadmill-proof principle:</strong> check acceptance first, record with an indoor-appropriate source, preserve the console and device summaries, and submit one transparent set of values under the event's rules.</blockquote>

<h2>Treadmill recording in one minute</h2>
<ol>
  <li><strong>Confirm treadmill eligibility.</strong> Read the live event mechanics before training or paying. Walking, incline, split sessions, and manual records can have separate rules.</li>
  <li><strong>Choose the evidence source.</strong> Decide whether the event expects the treadmill console, an indoor-run watch record, a supported connected activity, or a combination explicitly named in the rules.</li>
  <li><strong>Test before the event activity.</strong> Check units, device mode, calibration guidance, battery, permissions, pairing, and the final summary workflow.</li>
  <li><strong>Record the actual session.</strong> Start the machine and tracker deliberately, use safe controls, and avoid outdoor GPS mode for a stationary indoor run unless the manufacturer specifically directs otherwise.</li>
  <li><strong>Finish without clearing the console.</strong> Stop safely, save the wearable or app record, and preserve readable distance, duration, date, units, and activity type.</li>
  <li><strong>Compare sources honestly.</strong> Keep both values when the console and wearable differ. Do not average them, add them, or select the larger total without a rule-based reason.</li>
  <li><strong>Submit through the accepted path.</strong> Confirm OCR-assisted fields or select a supported connected activity. Correct submission improves reviewability but does not guarantee approval.</li>
  <li><strong>Monitor review status.</strong> Submitted or pending is not approved progress. Use the displayed correction route if a result is rejected.</li>
</ol>
<p>For the wider event journey, read <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">What Is a Virtual Run?</a> and <a href="/blog/how-to-prepare-for-your-first-virtual-run">the first virtual-run preparation guide</a>.</p>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in July 2026 using current official documentation from Garmin, Apple, Strava, Google Fitbit, and World Athletics, together with current HelloRun event, screenshot, OCR, connected-Strava, duplicate-evidence, submission-review, accumulated-progress, and correction behavior.</p>
<p>It is documented guidance rather than personal testing, an independent treadmill calibration study, individualized coaching, or a guarantee that a console or wearable is accurate. Device models, firmware, gym equipment, integrations, and event rules change. The equipment manufacturer, current app interface, venue instructions, and live event mechanics remain authoritative.</p>
<p>This article does not diagnose symptoms, prescribe exercise, or certify that a treadmill is suitable for a particular person. A runner who needs individualized guidance should use an appropriately qualified professional. Stop and obtain appropriate help for severe, unexplained, worsening, or otherwise concerning symptoms.</p>

<h2>Check whether the event accepts treadmill activity</h2>
<p>Do this before relying on an indoor session. “Virtual” does not necessarily mean any location, activity type, app, or proof. An organiser may accept treadmills for completion but exclude them from a competitive category, require one continuous activity, set a minimum activity distance, or ask for a particular console or device summary.</p>
<p>Confirm:</p>
<ul>
  <li>Whether treadmill running and treadmill walking are accepted.</li>
  <li>Whether the goal is one activity or accumulated distance.</li>
  <li>Which activity dates and submission deadline apply, including timezone.</li>
  <li>Whether the distance must be completed in one session.</li>
  <li>Which minimum distance applies to each entry.</li>
  <li>Whether console evidence, a watch, a connected activity, or another source is required.</li>
  <li>Which value controls when console and wearable distances conflict.</li>
  <li>Whether incline, pauses, assisted use, or a gym's own workout summary changes eligibility.</li>
  <li>How corrections and disputes are handled.</li>
</ul>
<p>If the event does not answer a material question, contact the organiser or <a href="/contact">HelloRun support</a> before the deadline. Do not infer acceptance from another event.</p>

<h2>Understand what a treadmill and wearable measure</h2>
<h3>The treadmill console</h3>
<p>A treadmill estimates belt travel from its own mechanics and calibration. Maintenance, belt condition, model, speed changes, and equipment setup can affect the displayed total. A console value is not automatically certified distance merely because it has two decimal places.</p>
<h3>A watch or fitness tracker</h3>
<p>Indoors, a wearable may estimate distance from accelerometer data, cadence, stride patterns, or a paired sensor instead of GPS. Garmin states that its Treadmill profile uses an internal accelerometer or paired sensor, while Apple explains that outdoor calibration can help a watch learn stride for situations where GPS is limited or unavailable.</p>
<h3>A connected treadmill</h3>
<p>Some compatible gym equipment can pair with a wearable. Apple documents pairing with supported cardio equipment, including treadmills. Compatibility, transmitted fields, and accuracy remain model-specific; a connection symbol does not make the result universally accepted by an event.</p>
<h3>A phone app</h3>
<p>A phone lying on the console may record time but cannot infer belt travel through satellite movement. Strava currently states that its mobile app cannot record indoor-run distance using a pedometer or other phone sensors, although its Apple Watch app can use the watch pedometer. Other apps and devices differ.</p>
<p>These sources answer related but different measurement questions. Read <a href="/blog/best-apps-to-track-your-virtual-run">the running-app comparison</a> for documented capabilities rather than a universal accuracy ranking.</p>

<h2>Choose the primary evidence source before starting</h2>
<p>Use the event's published rule. If the event accepts a clear treadmill summary, plan to preserve the console distance and duration. If it expects a supported imported activity, confirm that the indoor record appears with the required fields in the connected service. If it asks for both, preserve both without merging them.</p>
<p>Write down the chosen source, unit, and backup. For example: “Primary distance is the console in kilometres; the watch Indoor Run record supports date and duration.” That is more defensible than deciding after the run which device looks favorable.</p>
<p>A backup is not a second device used to shop for distance. It is an honest secondary record that can explain timing, date, or a technical failure when the event allows it.</p>

<h2>Set up the treadmill safely</h2>
<p>Use equipment you understand and follow its displayed and manufacturer instructions. Check that the belt area is clear, footwear is secure, loose items are controlled, and the emergency stop mechanism is available as intended. Know how to reduce speed and stop before beginning the event record.</p>
<p>Start at a manageable speed rather than stepping onto a fast-moving belt. Keep the area around the machine free from bags, tripods, cables, and objects that could interfere with entry or exit. In a shared gym, respect time limits, cleaning rules, accessibility needs, and staff directions.</p>
<p>Natural arm movement can improve some wrist-device estimates; Garmin advises against holding the handrails when seeking treadmill distance accuracy. Safety overrides data quality. Use the support provided by the equipment when needed, slow or stop appropriately, and do not change safe movement merely to satisfy a watch.</p>

<h2>Prepare the watch, phone, or sensor</h2>
<ol>
  <li><strong>Select an indoor profile.</strong> Apple recommends Indoor Run for treadmill running. Garmin provides a Treadmill activity profile. Do not label a stationary session as outdoor GPS merely to create a map.</li>
  <li><strong>Review calibration guidance.</strong> Follow the specific device manual. Garmin calibration availability and required minimum activity can vary by model.</li>
  <li><strong>Check personal and device settings.</strong> Stride-based estimates can depend on device learning and profile information. Enter only accurate information and avoid changing settings to force a result.</li>
  <li><strong>Confirm units.</strong> Know whether each source shows kilometres or miles. Do not assume a decimal value is in the event's requested unit.</li>
  <li><strong>Charge and update early.</strong> Leave time for a short test after any firmware, app, permission, or pairing change.</li>
  <li><strong>Test saving and syncing.</strong> Confirm that the final indoor summary contains date, distance, and duration and reaches the intended connected service.</li>
  <li><strong>Review privacy.</strong> A gym name, account profile, other people, notifications, or health metrics may appear in a photo or screenshot.</li>
</ol>

<h2>Calibrate without treating calibration as certification</h2>
<p>Calibration can improve consistency, but it does not prove that every future treadmill or pace is exact. Garmin recommends natural arm swing, outdoor GPS runs that help calibrate the accelerometer, and use of its treadmill calibration feature. It also notes that changing treadmills can warrant new calibration.</p>
<p>Apple describes an outdoor walk or run in an open area as a way for Apple Watch to learn stride and improve indoor estimates. Google Fitbit explains that step-based distance uses step count and stride length, while GPS activities use GPS distance.</p>
<p>Follow the device's own steps and minimums. Do not enter a false console value during calibration to make a later activity meet an event goal. Calibration is device preparation, not event proof or certified course measurement.</p>

<h2>Run and record the session step by step</h2>
<h3>Before pressing start</h3>
<p>Confirm the actual date, event window, chosen category, required distance, units, and evidence source. Make sure the machine is reset from the previous user and your wearable is on the correct profile. If pairing equipment, confirm the connection before movement.</p>
<h3>Start deliberately</h3>
<p>Begin the tracker and treadmill in a consistent sequence you tested. A few seconds of difference is normal; do not later edit duration merely to make both screens identical. If the event defines elapsed-time handling, follow that rule.</p>
<h3>During the activity</h3>
<p>Use a suitable effort and maintain safe control. Do not stare at the console, take photos while moving, jump onto side rails to preserve pace, or chase a watch distance after the console reaches the goal. If the machine or runner develops a safety problem, stop appropriately.</p>
<h3>At the finish</h3>
<p>Reduce speed and stop according to the equipment instructions. Save the wearable record and allow the console to display its final summary. Do not clear or start a cooldown that replaces the result before preserving the required fields.</p>

<h2>Capture a reviewable treadmill summary</h2>
<p>A strong console image usually shows the completed distance, duration, and units clearly. Depending on the equipment, speed, pace, incline, or calories may also appear, but more fields are not automatically better. The event determines what matters.</p>
<p>Take the photo only after safely stopping. Frame the result so the display is readable and the source is understandable. Avoid a close crop containing unexplained numbers. At the same time, do not photograph other gym users, membership cards, access codes, locker information, or unrelated personal details.</p>
<p>If the console does not show a date, a watch or synced activity may support the activity date when the event accepts that combination. Do not add a date to the console image with an editor. Preserve separate original sources.</p>

<h2>Preserve the watch or app summary</h2>
<p>Save the indoor activity normally and allow it to sync. Preserve the activity type, date, distance, duration, and source. An indoor activity may have no route map; Strava states that indoor activities normally do not show a map unless virtual GPS data is present.</p>
<p>Check moving time and elapsed time rather than assuming they match the treadmill duration. Pauses, device logic, and source processing can produce legitimate differences. The <a href="/blog/beginners-guide-to-running-pace">beginner pace guide</a> explains timing and pace calculations.</p>
<p>If syncing fails, preserve the local record and follow official app guidance before creating a duplicate. The <a href="/blog/what-to-do-when-gps-tracking-stops-during-a-run">GPS and tracking-failure guide</a> includes a broader evidence-preservation workflow.</p>

<h2>Handle console and wearable distance differences</h2>
<p>A mismatch does not automatically mean either source is dishonest. The treadmill estimates belt travel; the wearable may estimate stride-based motion; a foot pod or paired machine may provide another value. Pace changes, handrail use, arm movement, calibration, and device algorithms can affect the gap.</p>
<ol>
  <li>Keep the original value from each source.</li>
  <li>Confirm that the units match before comparing.</li>
  <li>Check whether one screen includes warm-up or cooldown that the other excludes.</li>
  <li>Use the event's named primary source.</li>
  <li>Disclose a material discrepancy in the available review context.</li>
  <li>Contact the organiser when the rules do not choose a source.</li>
</ol>
<p>Do not average the distances, add the difference, edit the wearable to match the treadmill, or repeat extra distance solely because one source is lower unless the event provides that procedure. A longer number is not automatically more accurate.</p>

<h2>Convert miles and kilometres transparently</h2>
<p>Use the displayed unit first. One mile equals approximately 1.609344 kilometres, and one kilometre equals approximately 0.621371 miles. Keep enough precision for review, then follow the form's expected unit. Do not relabel miles as kilometres or rely on visual similarity between abbreviations.</p>
<p>Example: a treadmill showing 3.11 miles is approximately 5.005 kilometres before ordinary display rounding. That does not prove a certified 5K, but it helps enter a transparent conversion when the event and form permit it.</p>
<p>When OCR reads the wrong unit or decimal, correct the form field to match the original evidence. OCR is an extraction aid, not proof of accuracy.</p>

<h2>Submit a treadmill screenshot on HelloRun</h2>
<p>Individual event mechanics remain authoritative. In the current screenshot flow, HelloRun accepts JPEG, PNG, or WebP within the file-size limit shown by the form. Choose the actual activity date, eligible registration, permitted activity type, distance in kilometres, duration, and location. Elevation and steps are optional where shown.</p>
<p>For location, use an accurate indoor description permitted by the form, such as the gym or “Home treadmill,” without publishing a full private address. Confirm OCR-assisted fields against the console and source record. Excessive cropping, blur, unexplained totals, altered images, or missing units can make review harder.</p>
<p>Screenshot submission can target multiple independently eligible events in the current flow, but each event reviews the activity against its own rules. One screenshot is not universally accepted everywhere.</p>

<h2>Use connected Strava evidence carefully</h2>
<p>A supported Strava activity can be selected when it exists in the authorised runner account and satisfies the event checks. Strava documents that its phone app does not currently record indoor-run distance, while compatible watches and third-party devices may create indoor records that sync to Strava.</p>
<p>Confirm that the imported activity contains a supported type, actual date, distance, and duration. Connected Strava currently uses one event or Personal Record target per submission action. Exact activity reuse can be blocked. Do not create a manual Strava entry and assume it is equivalent to a supported device record or accepted by the event.</p>
<p>Imported fields can be source-locked. If a rejected result requires a different source activity, follow the displayed correction strategy and reselect an eligible record rather than editing imported values.</p>

<h2>Single-activity and accumulated treadmill events</h2>
<p>For a standard event, the activity usually needs to satisfy the selected distance in one accepted record. Two treadmill sessions do not automatically become one 10K because their totals add to 10K.</p>
<p>For an accumulated challenge, separate eligible indoor activities may contribute to the registration when treadmill activity is accepted. Submit each original activity rather than a weekly treadmill dashboard. Approved distance counts officially, pending distance remains potential, and rejected distance contributes nothing.</p>
<p>Read <a href="/blog/how-accumulated-distance-challenges-work">how accumulated challenges work</a> and <a href="/blog/how-to-complete-a-50k-accumulated-distance-challenge">the 50K planning guide</a> before using treadmill sessions toward a larger goal.</p>

<h2>Understand review status and corrections</h2>
<p>A HelloRun result can be submitted or pending, approved, or rejected. Conditional automatic approval may apply to an eligible clean OCR or supported Strava activity under current rules; it is not guaranteed and does not make OCR perfect. Other evidence remains available for organiser or administrator review.</p>
<p>Pending treadmill distance is not approved progress or an official rank. A configured leaderboard reflects approved results under event-specific rules. Treadmill and outdoor performances are not automatically comparable because their surfaces, measurement systems, environment, and timing sources differ.</p>
<p>If rejected, use “Fix entry” and follow the displayed correction path. Ordinary resubmission is limited to rejected results. Preserve the original proof and do not upload altered copies to evade duplicate controls.</p>

<h2>Protect privacy in a shared gym</h2>
<ul>
  <li>Wait until other users are outside the camera frame.</li>
  <li>Avoid membership names, QR access codes, locker numbers, and payment details.</li>
  <li>Hide unrelated phone notifications and health metrics.</li>
  <li>Use a general indoor location instead of a home address where the form permits.</li>
  <li>Review connected-service permissions and activity visibility.</li>
  <li>Keep payment receipts separate from run proof.</li>
</ul>
<p>Strava warns that privacy controls applied within Strava are not necessarily transferred to authorised third-party services. Review <a href="/privacy">HelloRun's Privacy Policy</a> and the connected service's current controls.</p>

<h2>Five practical treadmill examples</h2>
<h3>Example 1: a single indoor 5K</h3>
<p>The event explicitly accepts treadmills and names console distance as primary. The runner records Indoor Run on a watch, stops safely after the console reaches 5.00K, preserves both summaries, and submits the console value with supporting date and duration.</p>
<h3>Example 2: console and watch differ</h3>
<p>The console shows 10.00K while the watch shows 9.72K. The runner keeps both, checks units and warm-up timing, and follows the event's console-source rule. No image or watch file is edited.</p>
<h3>Example 3: an accumulated 25K challenge</h3>
<p>The event accepts separate treadmill runs with a 2K minimum. The runner submits three original indoor activities. Only approved distance enters official progress; the pending session remains separate.</p>
<h3>Example 4: the phone app records time but no distance</h3>
<p>The runner learns that the selected mobile app does not measure treadmill distance. The console image may still be reviewable if the event accepts it, but the runner does not type planned distance as phone-recorded GPS.</p>
<h3>Example 5: unsafe outdoor weather</h3>
<p>The runner checks that treadmill activity is allowed before moving indoors. If it is not, the runner postpones or contacts support instead of assuming that unsafe weather changes the proof rule. See <a href="/blog/running-during-rainy-season-philippines">the rainy-season guide</a> and <a href="/blog/how-to-run-safely-during-hot-and-humid-weather">the hot-weather guide</a>.</p>

<h2>Before-run treadmill checklist</h2>
<ul>
  <li>Confirm event acceptance, dates, minimums, and evidence source.</li>
  <li>Check machine instructions and emergency stop access.</li>
  <li>Clear the area around the treadmill.</li>
  <li>Select the correct indoor profile and units.</li>
  <li>Review model-specific calibration guidance.</li>
  <li>Charge, pair, and test the device.</li>
  <li>Confirm the final summary and sync workflow.</li>
  <li>Plan privacy-safe evidence capture after stopping.</li>
</ul>

<h2>After-run proof checklist</h2>
<ul>
  <li>Stop safely before using a camera or phone.</li>
  <li>Preserve console distance, duration, and units.</li>
  <li>Save the wearable or app activity without altering it.</li>
  <li>Compare sources and identify the event-authoritative value.</li>
  <li>Keep warm-up, cooldown, pauses, and conversions transparent.</li>
  <li>Remove unnecessary private information without changing result fields.</li>
  <li>Submit before the correct deadline and monitor review.</li>
</ul>

<h2>Troubleshooting treadmill records</h2>
<h3>The treadmill reset before I took a photo</h3>
<p>Preserve the watch or connected record and contact the organiser. Do not recreate a console screen. Whether the remaining evidence is enough depends on event rules.</p>
<h3>The watch shows zero or very little distance</h3>
<p>Check that the correct indoor profile was used and review manufacturer calibration guidance after preserving the activity. Do not change the completed result merely to meet the goal.</p>
<h3>The activity will not sync</h3>
<p>Keep the local record, use a stable connection, and follow the device or service's official sync steps. Avoid duplicate creation while the original remains queued.</p>
<h3>OCR read calories as distance</h3>
<p>Correct the confirmation fields to match the readable original distance and unit. OCR extraction is fallible and requires runner review.</p>
<h3>The console only shows miles</h3>
<p>Keep the miles visible and use a transparent conversion to kilometres where the form requires it. Do not replace the unit label in the image.</p>

<h2>Guidance for event organisers</h2>
<p>State clearly whether treadmills are accepted, which source controls distance, whether walking or split activities count, what minimum applies, and what evidence fields are required. Explain how console/watch discrepancies, paused sessions, conversions, and equipment resets will be reviewed.</p>
<p>Avoid presenting treadmill results as inherently equivalent to certified road timing. Collect only evidence needed for the event, protect gym and home privacy, train reviewers consistently, and offer a correction path. Use <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">the organiser playbook</a> for the full mechanics and moderation workflow.</p>

<h2>Frequently asked questions</h2>
<h3>Does every virtual run accept treadmills?</h3>
<p>No. Individual event rules decide whether treadmill running or walking is eligible.</p>
<h3>Should I use Indoor Run or Outdoor Run?</h3>
<p>Use the manufacturer-documented profile that matches treadmill activity. Apple recommends Indoor Run, and Garmin provides a Treadmill profile. Outdoor GPS cannot measure stationary belt travel.</p>
<h3>Which distance is correct: treadmill or watch?</h3>
<p>Neither is universally authoritative. Use the event's named source, preserve both originals, check units, and disclose material differences.</p>
<h3>Do I need a map?</h3>
<p>Indoor treadmill activities commonly have no map. Whether map-free evidence is accepted depends on the event.</p>
<h3>Can I hold the handrails?</h3>
<p>Safety comes first. Handrail use can affect some wearable estimates, but a runner should not sacrifice safe use for a cleaner number.</p>
<h3>Can I pause the treadmill?</h3>
<p>Follow equipment safety and event timing rules. Pauses can change elapsed and moving-time comparisons, so preserve the original summaries.</p>
<h3>Can I add two treadmill sessions together?</h3>
<p>Only for an event that accepts accumulated activities. A standard one-result event may require one qualifying session.</p>
<h3>Can I submit a photo of the console?</h3>
<p>When the event accepts screenshot or photo evidence and the required fields are readable. Check the live form and <a href="/blog/what-counts-as-valid-run-proof">valid-proof guide</a>.</p>
<h3>Can HelloRun read the console automatically?</h3>
<p>OCR can assist field extraction from an uploaded image, but it is fallible and does not verify the treadmill's accuracy or guarantee approval.</p>
<h3>Can I import a treadmill activity from Strava?</h3>
<p>A supported indoor activity may be selectable if it exists in the connected account and satisfies event checks. Availability depends on the source device, imported fields, and event rules.</p>
<h3>Where do I submit the result?</h3>
<p>Use the event page or runner submission flow described in <a href="/blog/how-to-submit-run-proof-correctly-hellorun">the HelloRun proof-submission guide</a>. Browse <a href="/events">Events</a>, <a href="/how-it-works">How It Works</a>, and the <a href="/faq">FAQ</a> for broader guidance.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://support.garmin.com/en-IN/?faq=bpO2rljrqH2yUG1wSG73s9">Garmin Support: Using the Treadmill Activity Profile</a></li>
  <li><a href="https://support.apple.com/en-ie/105002">Apple Support: Get Accurate Apple Watch Measurements</a></li>
  <li><a href="https://support.apple.com/en-sg/105048">Apple Support: Calibrate Apple Watch</a></li>
  <li><a href="https://support.apple.com/guide/watch/use-gym-equipment-apd15b0268fd/watchos">Apple Watch Guide: Use Compatible Gym Equipment</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401956-indoor-treadmill-and-bike-trainer-activities">Strava Support: Indoor and Treadmill Activities</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations">Strava Support: Moving Time, Speed, and Pace</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401776-strava-s-privacy-controls-faq">Strava Support: Privacy Controls FAQ</a></li>
  <li><a href="https://support.google.com/googlehealth/answer/14237111?hl=en">Google Health Help: How Fitbit Calculates Activity</a></li>
  <li><a href="https://worldathletics.org/personal-best/performance/how-run-best-virtual-race-advice">World Athletics: How to Run Your Best Virtual Race</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
</ul>
<p>Recheck the live event page, treadmill instructions, device manual, and submission form before the activity. A well-recorded treadmill run is still event-specific evidence, not certified course measurement or a universal qualifying result.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Treadmill recording in one minute',
  'How this guide was prepared',
  'Check whether the event accepts treadmill activity',
  'Understand what a treadmill and wearable measure',
  'Choose the primary evidence source before starting',
  'Set up the treadmill safely',
  'Prepare the watch, phone, or sensor',
  'Calibrate without treating calibration as certification',
  'Run and record the session step by step',
  'Capture a reviewable treadmill summary',
  'Preserve the watch or app summary',
  'Handle console and wearable distance differences',
  'Convert miles and kilometres transparently',
  'Submit a treadmill screenshot on HelloRun',
  'Use connected Strava evidence carefully',
  'Single-activity and accumulated treadmill events',
  'Understand review status and corrections',
  'Protect privacy in a shared gym',
  'Five practical treadmill examples',
  'Before-run treadmill checklist',
  'After-run proof checklist',
  'Troubleshooting treadmill records',
  'Guidance for event organisers',
  'Frequently asked questions',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/how-it-works',
  '/faq',
  '/contact',
  '/privacy',
  '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
  '/blog/how-to-prepare-for-your-first-virtual-run',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/beginners-guide-to-running-pace',
  '/blog/what-to-do-when-gps-tracking-stops-during-a-run',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/how-to-complete-a-50k-accumulated-distance-challenge',
  '/blog/running-during-rainy-season-philippines',
  '/blog/how-to-run-safely-during-hot-and-humid-weather',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  'support.garmin.com/en-IN/?faq=bpO2rljrqH2yUG1wSG73s9',
  'support.apple.com/en-ie/105002',
  'support.apple.com/en-sg/105048',
  'support.apple.com/guide/watch/use-gym-equipment',
  'support.strava.com/en-us/articles/15401956-indoor-treadmill-and-bike-trainer-activities',
  'support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations',
  'support.strava.com/en-us/articles/15401776-strava-s-privacy-controls-faq',
  'support.google.com/googlehealth/answer/14237111',
  'worldathletics.org/personal-best/performance/how-run-best-virtual-race-advice'
]);

function buildArticlePayload(existingPost = {}) {
  const contentHtml = sanitizeHtml(RAW_CONTENT_HTML);
  const contentText = htmlToPlainText(contentHtml);
  const coverImageUrl = String(existingPost.coverImageUrl || '').trim();
  const payload = {
    title: ARTICLE.title,
    excerpt: ARTICLE.excerpt,
    contentHtml,
    contentText,
    contentRaw: contentText,
    category: ARTICLE.category,
    customCategory: '',
    tags: [...ARTICLE.tags],
    readingTime: Math.max(1, Math.ceil(contentText.split(/\s+/).filter(Boolean).length / 180)),
    seoTitle: ARTICLE.seoTitle,
    seoDescription: ARTICLE.seoDescription,
    coverImageAlt: ARTICLE.coverImageAlt,
    ogImageUrl: coverImageUrl
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
  if (!payload.ogImageUrl) errors.push('existing cover image is required for ogImageUrl');
  if (/<h[12]>How to Record a Treadmill Run for a Virtual Event<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/every virtual (?:run|event) accepts treadmills|treadmills? (?:are|is) always accepted|any treadmill activity is accepted/i.test(text)) errors.push('article must not claim universal treadmill acceptance');
  if (/treadmill (?:distance|console) is always accurate|watch distance is always accurate|calibration guarantees accuracy/i.test(text)) errors.push('article must not guarantee device accuracy');
  if (/(?:choose|use|submit) (?:the )?(?:largest|longest|higher) (?:distance|total)|average the (?:two )?distances to submit/i.test(text)) errors.push('article must not advise favorable-value selection');
  if (/automatically (?:approved|accepted)|perfect OCR|OCR (?:proves|verifies) (?:the )?(?:distance|accuracy)/i.test(text)) errors.push('article must not guarantee approval or OCR accuracy');
  if (/pending (?:distance|activity|evidence) (?:counts|is counted) (?:as )?(?:official|approved|completion)/i.test(text)) errors.push('article must not count pending evidence officially');
  if (/HelloRun (?:directly )?(?:records|tracks|monitors) (?:your )?treadmill|HelloRun certifies treadmill distance/i.test(text)) errors.push('article must not claim platform tracking or certification');
  if (/handrails? (?:must|should) never be used|(?:you|runners?) (?:must|should) jump onto (?:the )?side rails/i.test(text)) errors.push('article must not promote unsafe treadmill use');
  if (!/reviewed in July 2026 using current official documentation/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/does not guarantee approval/i.test(text)) errors.push('article must disclose review limits');
  if (!/Pending treadmill distance is not approved progress or an official rank/i.test(text)) errors.push('article must distinguish pending progress');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid treadmill virtual-event guide payload: ${errors.join('; ')}`);
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
