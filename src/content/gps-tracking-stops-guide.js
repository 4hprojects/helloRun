'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'what-to-do-when-gps-tracking-stops-during-a-run';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'What to Do When GPS Tracking Stops During a Run',
  excerpt: 'Recover from a lost GPS signal without inventing distance: protect your safety, preserve the original activity, troubleshoot the device, and submit transparent event proof.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'gps tracking',
    'lost gps signal',
    'run tracking',
    'activity proof',
    'tracking problems',
    'running apps',
    'virtual run',
    'gps troubleshooting'
  ]),
  seoTitle: 'GPS Tracking Stopped During a Run: What to Do',
  seoDescription: 'Learn what to do when GPS tracking stops during a run, how to preserve the original record, troubleshoot missing data, and submit transparent virtual-run proof.',
  coverImageAlt: 'Overhead view of a runner checking a watch beside a park underpass where a blue route trace breaks and resumes in the open'
});

const RAW_CONTENT_HTML = `
<p>A GPS interruption can turn a straightforward run into an evidence problem: the timer may continue while the map freezes, the route may jump in a straight line, the activity may save without a map, or the app may stop entirely. The first priority is still the runner—not repairing a screen while moving beside traffic, on a trail, or in unsafe weather.</p>
<p>There is no universal button sequence that can restore missing satellite points. Preserve what the device actually recorded, separate observation from guesswork, and check the event rules before submitting or repeating distance. A transparent incomplete record is more reviewable than an edited route that appears complete but cannot be supported by the original activity.</p>
<blockquote><strong>The recovery principle:</strong> reach a safe place, preserve the original record, document what is visible, and ask what the event accepts. Do not invent the missing section.</blockquote>

<h2>GPS stopped: the one-minute response</h2>
<ol>
  <li><strong>Prioritize the surroundings.</strong> Do not stare at a phone or watch while crossing, descending, running beside traffic, or moving through an unfamiliar area.</li>
  <li><strong>Move to a safe stopping point.</strong> Step completely off the travel line where possible. Do not enter a dangerous location merely to find open sky.</li>
  <li><strong>Observe before tapping.</strong> Note whether the timer, distance, map, location indicator, or recording icon has stopped. A paused workout is different from a lost satellite signal.</li>
  <li><strong>Give the device a clear view.</strong> If conditions are safe, remain still briefly in an open area away from dense cover, tall structures, or an underpass.</li>
  <li><strong>Do not delete or overwrite the activity.</strong> Save the original record according to the device's normal workflow when ending is the appropriate choice.</li>
  <li><strong>Capture a private reference.</strong> After stopping safely, record the displayed time, distance, status, and approximate interruption point without exposing unnecessary location or health information.</li>
  <li><strong>Check the event rule before replacing distance.</strong> A second activity, manual record, treadmill activity, or combined total is not automatically accepted.</li>
  <li><strong>Submit transparently or contact support.</strong> Explain the gap and use the original evidence path. Correct submission improves reviewability but does not guarantee approval.</li>
</ol>
<p>If the activity is for a virtual event, review <a href="/blog/what-counts-as-valid-run-proof">what makes run proof reviewable</a> and <a href="/blog/how-to-submit-run-proof-correctly-hellorun">the HelloRun submission walkthrough</a> before uploading anything.</p>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in July 2026 using current official documentation from Strava, Apple, Android, and World Athletics, together with current HelloRun event-window, screenshot, connected-Strava, duplicate-evidence, review, accumulated-progress, and correction behavior.</p>
<p>It is researched troubleshooting guidance, not independent testing of satellite accuracy, a promise that lost data can be recovered, or instructions for every phone, watch, operating system, and app version. Manufacturer documentation and the live app interface remain authoritative. Event rules determine whether an incomplete, split, manual, indoor, or replacement activity is eligible.</p>
<p>The guide does not provide individualized medical or emergency advice. Stop addressing the tracker and reach appropriate safety or help first when conditions, symptoms, navigation, traffic, weather, or personal security create a more important problem.</p>

<h2>Identify what actually stopped</h2>
<p>“GPS stopped” describes several different failures. The useful response depends on which evidence remains.</p>
<h3>The satellite position stopped updating</h3>
<p>The activity timer may continue, but the map freezes or later draws a straight line between two distant points. Strava explains that a signal lost and reacquired can create a straight connection because only the points before and after the gap exist. That line is not proof that every part of the displayed distance was recorded accurately.</p>
<h3>The activity was accidentally paused</h3>
<p>A manual pause, auto-pause, wet-screen input, clothing contact, or button press may stop recording even though satellite reception is available. Check the state only after moving safely aside. Moving time and elapsed time can then differ for legitimate reasons.</p>
<h3>The recording app closed or was suspended</h3>
<p>A crash, operating-system battery restriction, permission change, memory pressure, or background-app rule can interrupt recording. A navigation app working at the same time does not prove that the fitness recorder received or stored equivalent location points.</p>
<h3>The device lost power</h3>
<p>A flat phone or watch cannot reconstruct the unrecorded section after charging. Preserve any activity that was saved before shutdown. Battery failure is not evidence of the distance completed afterward.</p>
<h3>The activity recorded but did not sync</h3>
<p>Recording and uploading are separate. A completed record may remain on the device while network sync fails. Strava's official sync guidance recommends using reliable coverage or Wi-Fi and checking unsynced activities. Do not create a replacement merely because the original has not appeared online yet.</p>
<h3>The map is hidden rather than missing</h3>
<p>Privacy controls, an indoor tag, or a route entirely within a hidden area can affect map display. Strava documents that “no map” does not always mean “no activity.” Check the original record and visibility settings without making the route public unnecessarily.</p>

<h2>Safety comes before signal recovery</h2>
<p>A tracker alert does not justify stopping in a road, under a low-visibility bridge, on a blind bend, on unstable ground, or where personal security feels uncertain. Continue only far enough to reach an appropriate safe location, using situational awareness rather than the malfunctioning device for navigation.</p>
<p>If the phone was also the navigation tool, use a known safe route, ask for appropriate assistance, or end the activity. Do not continue deeper into an unfamiliar trail to preserve a workout. A friend or emergency contact may need the last known route, but public social posting is not a substitute for direct help.</p>
<p>Weather remains authoritative. Do not stand exposed during lightning, enter floodwater for an unobstructed signal, or continue through heat illness warning signs. The <a href="/blog/running-safety-tips-early-morning-night-runs">general running-safety guide</a>, <a href="/blog/running-during-rainy-season-philippines">rainy-season guide</a>, and <a href="/blog/how-to-run-safely-during-hot-and-humid-weather">hot-weather guide</a> cover those decisions in more depth.</p>

<h2>What to do while the run is still in progress</h2>
<h3>Step 1: reach a safe place and stop moving</h3>
<p>A stationary check is easier to interpret and safer to perform. It also gives the receiver a better chance to reacquire signals than repeated handling while moving through an obstructed location.</p>
<h3>Step 2: check the simplest state indicators</h3>
<p>Look for the recording, pause, GPS, battery, and time indicators that the device normally shows. Avoid changing multiple settings at once. If the timer and distance are still advancing, note that observation; it does not prove the map or distance is correct.</p>
<h3>Step 3: move only to an appropriate open area</h3>
<p>Dense trees, steep terrain, tall buildings, tunnels, and carrying a phone deep inside a bag can interfere with weak satellite signals. Strava recommends a clear view of the sky and allowing time for an initial lock. Never trade personal safety for a clearer signal.</p>
<h3>Step 4: decide whether to continue, restart, or end</h3>
<p>This is event- and device-dependent. Continuing the same activity may preserve elapsed time if the recorder reacquires position. Starting a second activity may create two honest records but may not satisfy a single-activity event. Ending can be the best choice when navigation, conditions, battery, or evidence quality is uncertain.</p>
<p>Do not repeatedly start and stop different apps merely to find the most favorable total. If the event requires one continuous record and the original has a material gap, contact the organiser rather than treating several files as automatically equivalent.</p>

<h2>Preserve the original evidence after stopping</h2>
<ol>
  <li><strong>Save normally.</strong> Use the recorder's ordinary finish-and-save workflow when available.</li>
  <li><strong>Do not crop away the failure immediately.</strong> A complete original record can help explain when the problem occurred.</li>
  <li><strong>Keep the source activity.</strong> Avoid deleting it after making a screenshot or creating a second record.</li>
  <li><strong>Capture the final summary.</strong> Preserve readable date, activity type, distance, duration, units, and source where displayed.</li>
  <li><strong>Note the circumstances privately.</strong> Record the approximate time, location type, device state, and whether recording resumed. Distinguish memory from device data.</li>
  <li><strong>Sync before editing.</strong> When upload is pending, use a stable connection and follow the manufacturer's or app's official recovery process.</li>
  <li><strong>Export only when supported.</strong> If the service permits downloading an original activity file, keep that file unchanged. An export is not a licence to manufacture missing track points.</li>
</ol>
<p>A screenshot of another app's calculated route, a hand-drawn map, or a later route estimate does not transform unrecorded movement into GPS evidence. An organiser may accept an explanation or alternative evidence, but that decision should be explicit.</p>

<h2>What the recorded map can and cannot show</h2>
<p>A gap can appear as a frozen point, missing segment, straight connector, zigzag, implausible jump, shortened distance, enlarged distance, or absent map. Strava states that it cannot fill in a section that the GPS device did not record. Software may ignore obviously poor points, but removing points is different from recreating the true route.</p>
<p>Distance is calculated from recorded or estimated inputs. Two devices carried together can report different totals because hardware, sampling, filtering, satellite view, and software differ. The tracker with the longer distance is not automatically correct.</p>
<p>Likewise, elapsed time and moving time answer different questions. Elapsed time covers the duration from start to finish, including pauses; moving time may be derived from movement detection or the recording source. Review <a href="/blog/beginners-guide-to-running-pace">the running-pace guide</a> and Strava's official timing documentation before comparing pace after a gap.</p>

<h2>How GPS failure affects a single-activity event</h2>
<p>A standard virtual 5K, 10K, or other one-result event may require a single activity meeting the category distance and date. A record that stops at 4.7K cannot be assumed to prove 5K because the runner remembers completing the route. A second 0.3K file also does not automatically satisfy a single-activity rule.</p>
<p>Check whether the event permits split evidence, an alternative source, a corrected entry, or a replacement activity. If it does not say, ask before submission or before repeating the run. Never combine totals in an image editor.</p>
<p>If the captured record already satisfies the minimum distance and required fields despite a missing map section, it may still be reviewable under the event's rules. A visible distance does not guarantee approval; reviewers can consider date, activity type, duration, integrity signals, and the accepted evidence path.</p>

<h2>How GPS failure affects an accumulated-distance challenge</h2>
<p>Accumulated challenges usually treat each eligible activity separately. If the recorded portion meets the event's minimum activity rules, it may be submitted as that captured distance. A later activity can add more approved distance when the event window and submission boundary remain open.</p>
<p>Do not add remembered missing distance to the captured record. Approved distance counts officially, pending distance remains potential, and rejected distance contributes nothing. Progress belongs to the particular registration rather than an unrestricted account total.</p>
<p>The <a href="/blog/how-accumulated-distance-challenges-work">accumulated-distance guide</a> explains exact progress and certificate finalisation. For a planning example, see <a href="/blog/how-to-complete-a-50k-accumulated-distance-challenge">the 50K challenge guide</a>.</p>

<h2>Screenshot proof after a GPS interruption</h2>
<p>Use the original final activity summary. On the current HelloRun screenshot path, the live form accepts JPEG, PNG, or WebP within its displayed file-size limit. Evidence should make the required date, distance, duration, units, and activity type readable where available.</p>
<p>OCR can assist field entry, but it cannot determine the true route or recreate missing GPS points. Confirm every extracted value. A mismatch or unusual record can require organiser or administrator review; one discrepancy does not universally decide the outcome.</p>
<p>Do not conceal the interruption with excessive cropping. You may protect irrelevant private data, but the event metrics must remain understandable. If the evidence includes a home location, profile name, photo, notification, or health metric that the event does not need, use the source app's privacy controls or a careful privacy-preserving capture without changing the result.</p>

<h2>Connected Strava evidence after a GPS interruption</h2>
<p>A supported connected-Strava submission imports the activity data available through the authorised account. HelloRun checks account ownership, activity date, supported activity information, event rules, and duplicate use. The import does not repair the source activity.</p>
<p>If the activity has a straight line, missing map, short distance, or unusual timing, review it in Strava before selecting it. Do not create a manual Strava activity and assume it will be treated like a GPS-recorded import. Strava itself notes that manual activities can have different challenge and segment treatment, while HelloRun acceptance remains event-specific.</p>
<p>When imported fields are locked in a correction flow, use the displayed source-appropriate option to reselect an eligible activity. Ordinary HelloRun resubmission is limited to rejected results; pending evidence is still under review. Pending evidence does not count as official progress or rank.</p>

<h2>Do not manufacture the missing distance</h2>
<ul>
  <li>Do not draw or edit GPS points to make the route look continuous.</li>
  <li>Do not type a planned route distance as though the device recorded it.</li>
  <li>Do not upload a friend's activity as your own event evidence.</li>
  <li>Do not combine screenshots into a new “summary” that the source app never produced.</li>
  <li>Do not reuse altered copies to evade duplicate-evidence controls.</li>
  <li>Do not select whichever device reports the largest total without disclosing the actual source.</li>
  <li>Do not submit a weekly dashboard total in place of an individual activity.</li>
</ul>
<p>Integrity controls are not a claim that every anomaly is dishonest. GPS data can fail legitimately. Transparency gives a reviewer the information needed to distinguish a technical problem from unsupported distance.</p>

<h2>Troubleshoot only after preserving the activity</h2>
<h3>Check permissions</h3>
<p>Confirm that the recording app has the location permission it documents, including precise or background access where genuinely required. Android distinguishes device Location Accuracy from an individual app's precise-location permission. Choose privacy settings deliberately rather than enabling every permission without review.</p>
<h3>Review battery restrictions</h3>
<p>Power-saving modes and vendor-specific background restrictions can change how often an app receives GPS or sensor data. Apple documents that some watch settings take fewer GPS readings to extend battery during workouts. Check the exact device documentation instead of copying settings from another model.</p>
<h3>Check storage, updates, and restart guidance</h3>
<p>Low storage, outdated software, or an app problem may affect saving or syncing. Update or restart only after confirming the original activity is safely stored when possible. A restart cannot restore satellite points that were never recorded.</p>
<h3>Test away from the event</h3>
<p>Use a short non-event test in a safe open area. Confirm an initial GPS lock, stable recording, a saved map, units, battery behavior, and sync. Do not use a critical deadline activity as the first test after changing settings.</p>

<h2>Prevent another interruption</h2>
<ul>
  <li>Charge the device and check battery health before a longer activity.</li>
  <li>Install necessary updates before event day, leaving time for a test.</li>
  <li>Confirm location and background permissions after operating-system updates.</li>
  <li>Wait for the device's documented GPS-ready state in an appropriate open location.</li>
  <li>Carry the device as its manufacturer recommends rather than deeply obstructed.</li>
  <li>Choose a route with safe stopping points and known navigation alternatives.</li>
  <li>Know how the recorder signals pause, lost GPS, low battery, and unsynced activity.</li>
  <li>Keep the event deadline far enough away for a repeat or correction when practical.</li>
  <li>Review privacy and offline behavior before leaving coverage.</li>
</ul>
<p>The <a href="/blog/best-apps-to-track-your-virtual-run">running-app comparison</a> describes documented device and evidence features without ranking universal accuracy. No app or watch guarantees an uninterrupted record.</p>

<h2>Five practical GPS-failure scenarios</h2>
<h3>Scenario 1: signal disappears under an overpass</h3>
<p>The timer continues, and the route later shows a straight connector. The runner keeps the original activity, notes the obstruction, and checks whether the recorded distance and other fields satisfy the event. No track points are added manually.</p>
<h3>Scenario 2: the phone app closes halfway through a 5K</h3>
<p>The saved record shows 2.6K. The runner does not label it a completed 5K. Because the event requires one activity, the runner contacts support or completes another eligible activity before the deadline if appropriate.</p>
<h3>Scenario 3: a watch dies during an accumulated challenge</h3>
<p>The device saved 4.1K before shutdown. If 4.1K meets the event's minimum, that individual record may be submitted. Distance completed after power loss is not added from memory. A later separate activity can contribute after approval.</p>
<h3>Scenario 4: the activity exists but will not sync</h3>
<p>The runner preserves the local activity, connects to stable Wi-Fi, checks the app's unsynced queue, and follows official sync guidance. A duplicate replacement is not created while the original is pending upload.</p>
<h3>Scenario 5: the map is hidden for privacy</h3>
<p>The final activity fields remain visible, but the public map does not. The runner checks event requirements and connected-service permissions. Privacy is not weakened automatically merely to make a public route visible.</p>

<h2>During-run recovery checklist</h2>
<ul>
  <li>Reach a safe stopping point before operating the device.</li>
  <li>Check recording, pause, GPS, time, distance, and battery indicators.</li>
  <li>Use an appropriate open area only when conditions remain safe.</li>
  <li>Avoid changing several settings during the same recording.</li>
  <li>Choose continue, second activity, or end based on safety and event rules.</li>
  <li>Do not chase lost distance or extend the run automatically.</li>
</ul>

<h2>After-run evidence checklist</h2>
<ul>
  <li>Save and retain the original activity.</li>
  <li>Capture its date, activity type, distance, duration, units, and source.</li>
  <li>Record the failure circumstances separately and accurately.</li>
  <li>Allow unsynced records to upload through the official recovery path.</li>
  <li>Compare the captured activity with event minimums and deadlines.</li>
  <li>Protect route, identity, photo, notification, and health privacy.</li>
  <li>Ask the organiser before combining or replacing evidence.</li>
</ul>

<h2>HelloRun submission and correction checklist</h2>
<ul>
  <li>Select the correct registration and actual activity date.</li>
  <li>Use the accepted screenshot or supported connected-Strava path.</li>
  <li>Confirm OCR-assisted values instead of assuming they are accurate.</li>
  <li>Describe the original activity honestly when a GPS gap is visible.</li>
  <li>Remember that submitted or pending is not approved progress.</li>
  <li>Use “Fix entry” when a rejected result offers correction.</li>
  <li>Do not repeatedly upload duplicate or altered proof.</li>
  <li>Contact <a href="/contact">support</a> before the deadline when the rule is unclear.</li>
</ul>

<h2>Guidance for event organisers</h2>
<p>Publish a GPS-failure policy before registration. State whether incomplete tracks, split activities, secondary devices, manual records, route-only evidence, and replacement activities are accepted. Separate technical anomalies from deliberate manipulation and give reviewers a consistent escalation path.</p>
<p>Do not promise that every missing segment can be verified. Ask only for evidence needed to decide the event rule, protect route privacy, document corrections, and explain dispute deadlines. The <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">organiser playbook</a> covers the wider review workflow.</p>

<h2>Frequently asked questions</h2>
<h3>Will GPS reconnect by itself?</h3>
<p>Some devices may reacquire a signal, but behavior varies. A reconnection does not recreate every missing point and may produce a straight connector or changed distance.</p>
<h3>Should I pause the run when GPS disappears?</h3>
<p>Follow the device guidance and event rules after reaching a safe place. Pausing can affect elapsed and moving time, while continuing may preserve time but not location. There is no universal event-safe choice.</p>
<h3>Can an app fill in the missing route?</h3>
<p>Route tools may estimate or edit data, but estimated points are not the original GPS record. Strava states that missing recorded GPS data cannot be filled back in.</p>
<h3>Can I use my planned route distance?</h3>
<p>Not as though it were recorded evidence. An organiser may explicitly accept another measurement method, but a planned route does not prove the exact path completed.</p>
<h3>Can I combine two activity files?</h3>
<p>Only when the event explicitly accepts split or accumulated activities. One-result events may require one qualifying activity.</p>
<h3>Does a missing map make proof invalid?</h3>
<p>Not universally. The map may be absent because of GPS failure, privacy, or an indoor activity. Event rules and the remaining fields determine reviewability.</p>
<h3>Does HelloRun repair GPS data?</h3>
<p>No. HelloRun receives submitted screenshot fields or supported imported activity data and supports review; it does not recreate satellite points or provide live GPS monitoring.</p>
<h3>Will clean OCR automatically approve the activity?</h3>
<p>Eligible clean OCR or supported Strava activities may qualify for conditional approval under current rules, but this is not universal. Other submissions can require human review.</p>
<h3>Can I submit a manual activity?</h3>
<p>Do not assume manual-only evidence is available or accepted in every public flow. Follow the evidence options shown for the event.</p>
<h3>What if the submission deadline is close?</h3>
<p>Contact the organiser promptly and preserve the original evidence. A deadline does not justify inventing data, repeating unsafe distance, or misrepresenting the source.</p>
<h3>Where can I review the full virtual-run process?</h3>
<p>Browse <a href="/events">Events</a>, read <a href="/how-it-works">How It Works</a>, the <a href="/faq">FAQ</a>, <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">the foundational virtual-run guide</a>, and <a href="/blog/how-to-prepare-for-your-first-virtual-run">the first-event preparation guide</a>.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://support.strava.com/en-us/articles/15402181-bad-gps-data">Strava Support: Bad GPS Data</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15402062-troubleshooting-android-gps-issues">Strava Support: Troubleshooting Android GPS Issues</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401579-no-map-on-activity">Strava Support: No Map on Activity</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15402026-troubleshooting-syncing">Strava Support: Troubleshooting Syncing</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations">Strava Support: Moving Time, Speed, and Pace</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401776-strava-s-privacy-controls-faq">Strava Support: Privacy Controls FAQ</a></li>
  <li><a href="https://support.apple.com/en-sg/105048">Apple Support: Calibrate Apple Watch for Workout Accuracy</a></li>
  <li><a href="https://support.apple.com/en-us/122789">Apple Support: Battery and Workout GPS Readings</a></li>
  <li><a href="https://support.google.com/android/answer/15157297?hl=en">Android Help: How Location Accuracy Improves Location</a></li>
  <li><a href="https://worldathletics.org/personal-best/performance/how-run-best-virtual-race-advice">World Athletics: How to Run Your Best Virtual Race</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
</ul>
<p>Device interfaces and app behavior change. Recheck the manufacturer's current instructions, the live event page, and the HelloRun form before relying on a troubleshooting step.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'GPS stopped: the one-minute response',
  'How this guide was prepared',
  'Identify what actually stopped',
  'Safety comes before signal recovery',
  'What to do while the run is still in progress',
  'Preserve the original evidence after stopping',
  'What the recorded map can and cannot show',
  'How GPS failure affects a single-activity event',
  'How GPS failure affects an accumulated-distance challenge',
  'Screenshot proof after a GPS interruption',
  'Connected Strava evidence after a GPS interruption',
  'Do not manufacture the missing distance',
  'Troubleshoot only after preserving the activity',
  'Prevent another interruption',
  'Five practical GPS-failure scenarios',
  'During-run recovery checklist',
  'After-run evidence checklist',
  'HelloRun submission and correction checklist',
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
  '/blog/running-safety-tips-early-morning-night-runs',
  '/blog/running-during-rainy-season-philippines',
  '/blog/how-to-run-safely-during-hot-and-humid-weather',
  '/blog/beginners-guide-to-running-pace',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/how-to-complete-a-50k-accumulated-distance-challenge',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  'support.strava.com/en-us/articles/15402181-bad-gps-data',
  'support.strava.com/en-us/articles/15402062-troubleshooting-android-gps-issues',
  'support.strava.com/en-us/articles/15401579-no-map-on-activity',
  'support.strava.com/en-us/articles/15402026-troubleshooting-syncing',
  'support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations',
  'support.strava.com/en-us/articles/15401776-strava-s-privacy-controls-faq',
  'support.apple.com/en-sg/105048',
  'support.apple.com/en-us/122789',
  'support.google.com/android/answer/15157297',
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
  if (/<h[12]>What to Do When GPS Tracking Stops During a Run<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/missing GPS (?:can|will) always be (?:restored|recovered)|app (?:can|will) fill in the missing route|GPS is perfectly accurate/i.test(text)) errors.push('article must not promise GPS recovery or accuracy');
  if (/(?:you|runners?) (?:should|must) (?:draw|edit|invent|add) (?:the )?(?:missing )?(?:GPS|route|distance)|use (?:a|your) friend(?:'s)? activity as your own/i.test(text)) errors.push('article must not advise manufactured evidence');
  if (/every event accepts|all events accept|split activities are always accepted|manual activities are always accepted|treadmills? (?:are|is) always accepted/i.test(text)) errors.push('article must not claim universal evidence acceptance');
  if (/(?:the app|HelloRun|this process) guarantee(?:s|d) (?:approval|safety|accuracy|recovery)|(?:is|will be) automatically (?:approved|accepted)|OCR is perfect/i.test(text)) errors.push('article must not guarantee approval or OCR');
  if (/HelloRun (?:directly )?(?:records|tracks|monitors) (?:your )?(?:live )?GPS|HelloRun (?:automatically )?repairs GPS data/i.test(text)) errors.push('article must not claim live GPS monitoring or repair');
  if (/pending (?:distance|activity|evidence) (?:counts|is counted) (?:as )?(?:official|approved|completion)/i.test(text)) errors.push('article must not count pending evidence officially');
  if (/deadline (?:means|requires|justifies) (?:running|continuing) (?:in|through) unsafe/i.test(text)) errors.push('article must not prioritize a deadline over safety');
  if (!/reviewed in July 2026 using current official documentation/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/does not guarantee approval/i.test(text)) errors.push('article must disclose review limits');
  if (!/does not recreate satellite points or provide live GPS monitoring/i.test(text)) errors.push('article must state the HelloRun GPS boundary');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid GPS interruption guide payload: ${errors.join('; ')}`);
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
