'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-prepare-for-your-first-virtual-run';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Prepare for Your First Virtual Run',
  excerpt: 'Prepare for your first virtual run with a practical timeline for choosing an event, training, testing your tracker, planning a safe route, and submitting proof.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'first virtual run',
    'virtual run prep',
    'runner checklist',
    'run tracking',
    'activity proof',
    'route planning',
    'event rules',
    'race preparation'
  ]),
  seoTitle: 'How to Prepare for Your First Virtual Run | HelloRun',
  seoDescription: 'Prepare for your first virtual run with practical steps for event rules, training, route safety, tracking, proof submission, deadlines, and review.',
  coverImageAlt: 'First-time virtual runner checking event rules, testing a phone tracker, planning a safe route, and preparing run proof'
});

const RAW_CONTENT_HTML = `
<p>Your first virtual run begins before you press Start on a watch or phone. A useful preparation process connects five things: the event rules, a realistic activity plan, a tested recording method, a suitable place and time, and evidence that can be reviewed afterward. Missing any one of them can turn a completed run into an unclear submission.</p>
<p>Virtual events can offer more control over schedule and location than an onsite race, but that flexibility is bounded by the individual event. A runner may still have a registration close, activity window, final submission deadline, permitted activity types, minimum distance, evidence rules, and review process. Preparing well means finding those boundaries early rather than assuming that every virtual event works the same way.</p>
<blockquote><strong>The practical goal:</strong> complete an allowed activity at a manageable effort, preserve the original record, and submit it within the event's rules. Correct preparation improves reviewability, but it cannot guarantee completion, safety, approval, ranking, a certificate, or a reward.</blockquote>

<h2>Your first virtual run in one minute</h2>
<ol>
  <li><strong>Choose the event:</strong> read its organizer details, format, distance, dates, timezone, cost, refund terms, proof rules, support route, and recognition details.</li>
  <li><strong>Choose a realistic goal:</strong> decide whether the event requires one activity or allows several activities to build an accumulated total.</li>
  <li><strong>Prepare your body and schedule:</strong> practise the distance or a suitable walk-run strategy gradually, with recovery and room to change the date.</li>
  <li><strong>Test the tracker:</strong> record a short activity, check date, distance, unit, duration, activity type, battery use, synchronization, and screenshot visibility.</li>
  <li><strong>Plan the setting:</strong> choose a route or allowed treadmill, check weather and surface conditions, protect map privacy, and prepare a safer alternative.</li>
  <li><strong>Complete without chasing the app:</strong> use a manageable effort and make safety decisions independently of a deadline or target displayed on a device.</li>
  <li><strong>Save and review:</strong> keep the original activity, confirm the required fields, submit through the accepted evidence path, and monitor the review status.</li>
</ol>
<p>If any event detail is unclear, use its published support route before running. On HelloRun, start with current <a href="/events">Events</a>, the platform's <a href="/how-it-works">How It Works</a> page, and the <a href="/faq">FAQ</a>.</p>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in July 2026 using documented HelloRun registration and result-submission behavior plus public guidance from World Athletics, the Road Runners Club of America, the World Health Organization, and Strava. It is a researched preparation guide, not a report of personally testing every event, app, watch, treadmill, route, or runner.</p>
<p>World Athletics' virtual-race advice highlights planning a course, start time, equipment, hydration, and a goal. RRCA describes virtual events as registered activities in which participants complete a distance and self-report participation to an organization. WHO provides general physical-activity guidance, while Strava documents privacy controls and the distinction between moving and elapsed time. These sources help explain the decisions a runner should make; they do not create universal event rules.</p>
<p>The individual event page and live submission form remain authoritative. Features can depend on the event, device, account connection, plan, region, and current platform implementation. This article is not individualized medical, legal, safety, financial, or coaching advice.</p>

<h2>Start by deciding whether the event is a good fit</h2>
<p>A polished poster is not enough information for registration. Look for a structured event page that identifies the organizer, format, eligible participants, registration process, activity dates, submission deadline, categories, fees, proof requirements, review process, rewards, privacy information, and a working support path. If the event uses several pages or social posts, treat the current structured rules as more reliable than an old promotional image.</p>
<h3>Check organizer identity and support</h3>
<p>Identify who operates the event and how questions or corrections are handled. A trustworthy listing should make it possible to ask about unclear rules, payment instructions, fulfilment, or rejected evidence. A platform listing does not by itself guarantee an organizer, payment recipient, refund, delivery, or event outcome. If material instructions change, verify them through the event's official support route rather than relying on an unsolicited message.</p>
<h3>Check every important date separately</h3>
<p>Registration closing, activity completion, proof submission, review, results, and reward fulfilment can be separate milestones. Record the exact timezone, especially when you and the organizer are in different countries. An activity completed before the finish window may still be late if proof is uploaded after the submission boundary. Conversely, registration approval does not necessarily mean the activity window has begun.</p>
<h3>Read the fee and refund terms</h3>
<p>Some events are free. Others vary the amount by distance, registration option, package, pricing period, or delivery method. On HelloRun, a paid event can publish external payment instructions and ask the runner to upload a receipt for organizer review; HelloRun does not directly process that transfer. Payment-receipt review and run-proof review are separate stages. Read the applicable <a href="/refund-and-cancellation-policy">refund and cancellation information</a> before paying, and retain the original transaction record.</p>
<h3>Check what recognition actually exists</h3>
<p>A leaderboard, badge, digital certificate, medal, shirt, or delivery package is not universal. Determine whether recognition is configured, what approval or completion rule triggers it, when results become final, and who fulfils physical items. A certificate for an event-specific reviewed result is not automatically certified timing or a qualifying result.</p>

<h2>Choose a format and goal you can prepare for</h2>
<p>Read <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">What Is a Virtual Run?</a> if the overall journey is new, and use <a href="/blog/virtual-run-vs-traditional-race-which-one-should-you-join">Virtual Run vs Traditional Race</a> when deciding between a runner-chosen setting and an onsite event. Within virtual events, the first major choice is usually one activity versus accumulated distance.</p>
<h3>Single-activity format</h3>
<p>A single-activity event normally expects the selected distance in one recorded session. This format suits a runner who can plan one suitable route or treadmill session within the window. Confirm whether the activity must reach an exact minimum, whether pausing is allowed, which time field is ranked, and whether walking or hiking is an eligible activity type. Do not assume two shorter activities can be combined unless the rules explicitly allow accumulation.</p>
<h3>Accumulated-distance format</h3>
<p>An accumulated challenge adds separate eligible activities toward the selected registration goal. It can suit a runner who prefers repeated manageable sessions over one long effort. Preparation includes scheduling enough opportunities before the deadline, submitting individual activities rather than a weekly dashboard total, and leaving time for review or correction. The detailed <a href="/blog/how-accumulated-distance-challenges-work">accumulated-distance guide</a> explains approved, pending, rejected, and over-goal progress.</p>
<h3>Distance and category</h3>
<p>Choose from current ability and available preparation time, not from the most impressive category name. A first event might be a walk-run 5K, but another runner may be better served by a shorter category or an accumulated goal. Category names can also encode age, participation mode, package, or ranking rules. Confirm that the category selected during registration is the one your proof must satisfy.</p>
<h3>Completion and performance goals</h3>
<p>A completion goal prioritizes covering the allowed distance at a manageable effort. A performance goal adds pace, terrain, and timing considerations and may require more specific training. Results recorded on different routes, surfaces, elevations, weather conditions, treadmills, and devices are not automatically comparable. Your first virtual run does not need to be a personal-best attempt.</p>

<h2>Build enough readiness without treating a date as a guarantee</h2>
<p>Preparation should begin from what you can comfortably do now. Someone who already walks for 30 minutes may start with short easy running intervals. Someone who is less active may first build a walking routine. The <a href="/blog/beginner-5k-training-plan-new-runners">Beginner 5K Training Plan</a> offers a flexible nine-week walk-run framework, but nine weeks is not a medical clearance standard or completion promise.</p>
<p>Use comfortable breathing and a simple talk test for easy sessions: you should generally be able to speak a short sentence without gasping. Planned walking is a valid training strategy. Whether walking counts toward an event remains a separate rules question.</p>
<ul>
  <li>Allow recovery between running days instead of compressing missed sessions into one workout.</li>
  <li>Increase preparation only when the present activity feels manageable and recovery is ordinary for you.</li>
  <li>Practise the run-walk pattern you expect to use rather than saving every walk break for an emergency.</li>
  <li>Use familiar food, fluids, shoes, and clothing; a first event is a poor time to test several new products.</li>
  <li>Choose optional strength or mobility work appropriate to your ability rather than following rigid loads from a general article.</li>
</ul>
<p>People who are pregnant, disabled, returning after surgery or significant illness, managing chronic conditions, or experiencing concerning symptoms may need qualified, individualized guidance. Stop, reach a safe location, and seek appropriate local medical or emergency help for severe or unexplained symptoms such as intense chest pain or pressure, fainting, or severe breathlessness. A web guide cannot diagnose symptoms or decide when a particular person should exercise.</p>

<h2>Select and test your recording method</h2>
<p>The best tracker is one that records the fields the event accepts, works with your device and setting, and can produce a reviewable original activity. The <a href="/blog/best-apps-to-track-your-virtual-run">virtual-run app comparison</a> reviews documented features from six common options without claiming a universal accuracy winner.</p>
<h3>Phone recording</h3>
<p>A phone can record outdoor GPS when the app has the required location permission and the operating system does not suspend it. Test a short activity with the screen locked, verify that distance continues to update, and learn how the activity is saved. Check battery condition and storage. Download required maps or instructions when the route may have weak data coverage, but confirm that the tracker itself supports offline recording.</p>
<h3>Watch or fitness tracker</h3>
<p>Charge the device, select the correct activity profile, wait for any needed GPS readiness signal, and confirm how the completed record syncs to the app used for proof. A watch total and phone total may differ because of sampling, autopause, smoothing, calibration, or time definitions. Decide which original record the event accepts rather than combining the most favorable fields from different devices.</p>
<h3>Treadmill recording</h3>
<p>First verify that the event permits treadmill activity and specifies acceptable evidence. A treadmill display, watch estimate, and footpod can report different distances. Note whether the rules want the machine summary, a wearable record, or another view. Avoid changing a recorded value merely to make two devices agree unless the accepted workflow explicitly permits a documented correction.</p>
<h3>Connected Strava activity</h3>
<p>When a supported Strava import is available, connect the account you own, review third-party permissions, and make a short test activity if appropriate. Strava distinguishes moving time from elapsed time, so know which field an event displays or ranks. Privacy controls can restrict activity visibility, but the event's authorized import and review path may still require selected activity data.</p>

<h2>Know the proof fields before activity day</h2>
<p>Read <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> for evidence quality and <a href="/blog/how-to-submit-run-proof-correctly-hellorun">How to Submit Run Proof Correctly on HelloRun</a> for the procedural walkthrough. The common preparation fields are:</p>
<ul>
  <li><strong>Correct registration:</strong> the activity must target the event and category you joined.</li>
  <li><strong>Activity date:</strong> the actual local activity date must fall within the permitted window.</li>
  <li><strong>Distance and unit:</strong> kilometres and miles must be readable and interpreted correctly.</li>
  <li><strong>Duration or time:</strong> know whether the evidence shows moving time, elapsed time, or another event-defined field.</li>
  <li><strong>Activity type:</strong> Run, Walk, Hike, Trail Run, treadmill, or another type must be allowed by the event.</li>
  <li><strong>Source:</strong> keep enough context to identify the app, watch, treadmill, or connected activity without exposing unnecessary data.</li>
  <li><strong>Readable original evidence:</strong> avoid blur, excessive cropping, altered copies, dashboards without individual activity details, and screenshots that hide required fields.</li>
</ul>
<p>A visible total does not by itself establish eligibility. OCR may help extract screenshot fields, but extraction is fallible and is not proof that a reading is accurate. Confirm every populated value against the original before submitting. Depending on current eligibility rules, a clean OCR or validated Strava submission may qualify for conditional approval; other submissions can require organizer or admin review.</p>

<h2>Plan the route or indoor setting</h2>
<h3>Outdoor route</h3>
<p>Choose a route you can inspect in advance. Consider surface condition, crossings, traffic exposure, lighting, elevation, toilets, water access, shelter, transport, phone coverage, and a safe way to shorten the attempt. A loop near a familiar base can be easier to support than an isolated point-to-point route. Follow local laws and use the detailed <a href="/blog/running-safety-tips-early-morning-night-runs">low-light running safety guide</a> when relevant.</p>
<p>Do not build the route so tightly around an exact GPS endpoint that you must stop in traffic or stare at a screen while moving. GPS can drift near tall buildings, heavy tree cover, tunnels, or sharp turns. Plan a small, safe buffer only when event rules allow it; never add distance by entering a hazardous area.</p>
<h3>Indoor setting</h3>
<p>For an allowed treadmill activity, inspect the machine, its emergency stop, ventilation, space around the belt, and how the final summary remains visible. Test how you will photograph or synchronize the completed activity without blocking another user or exposing someone else's information. If using a shared facility, follow its rules.</p>
<h3>Accessibility</h3>
<p>Preparation may include a support person, mobility device, accessible surface, rest points, transport, or a different activity window. Ask the organizer how the event rules apply before registering when the page does not explain an adaptation. Avoid assuming that a virtual format automatically makes an event accessible.</p>

<h2>Check weather, air, visibility, and personal safety</h2>
<p>Use an authoritative local forecast and air-quality service close to the planned time. Heat, high humidity, thunderstorms, flooding, ice, smoke, poor air quality, strong wind, and darkness can change the decision. A deadline does not make unsafe conditions acceptable. Reschedule within the event window, shorten a training session, select an allowed indoor alternative, or contact the organizer when the only safe option falls outside the published rules.</p>
<p>For low light, distinguish bright clothing from retroreflective material and active lights. Choose a familiar populated route where practical, tell a trusted person the plan, carry appropriate identification, and prepare the phone for local emergency contact. Responsible awareness does not make runners responsible for harassment, crime, or a driver's actions.</p>
<p>Save a backup plan before activity day: a second route, a later time, a permitted treadmill, or another date. The backup should satisfy the same event window and proof rules rather than being invented after the original plan fails.</p>

<h2>Protect privacy before sharing a map or screenshot</h2>
<p>Activity evidence can expose a home location, workplace, regular routine, profile name, photo, contacts, notifications, health-related fields, or other people on screen. Review the original and the proposed screenshot separately. Crop only unnecessary private areas while keeping the required activity fields and enough source context readable.</p>
<ul>
  <li>Use an app's map-privacy or hidden-start controls where available.</li>
  <li>Avoid beginning or ending a public map exactly at a private address when a safer alternative is practical.</li>
  <li>Dismiss notifications before capturing the screen.</li>
  <li>Do not include payment details, identity documents, messages, or health metrics that the result rules do not require.</li>
  <li>Review connected-app permissions and disconnect integrations you no longer want to use.</li>
</ul>
<p>HelloRun's public leaderboard rows do not publish proof files, raw OCR content, email addresses, suspicious flags, or private review notes. Still, submit only information relevant to the event and use the <a href="/privacy">Privacy</a> page to understand platform handling.</p>

<h2>One week before the activity</h2>
<ul>
  <li>Reopen the live event page and check for structured rule or schedule changes.</li>
  <li>Confirm registration and, for a paid event, the payment status required to participate or submit.</li>
  <li>Verify the selected mode, distance or category, activity window, submission deadline, and timezone.</li>
  <li>Complete an easy tracking test using the planned phone, watch, app, or treadmill workflow.</li>
  <li>Inspect the route or indoor setting and define a safe backup.</li>
  <li>Use familiar equipment and avoid trying to gain last-minute fitness through an unusually hard session.</li>
  <li>Ask support about unresolved walking, treadmill, proof, accessibility, or correction questions.</li>
</ul>

<h2>Forty-eight hours before the activity</h2>
<ul>
  <li>Check local weather, air quality, surface reports, daylight, and transport.</li>
  <li>Charge devices and any light, confirm available storage, and install necessary updates early enough to test them.</li>
  <li>Prepare familiar clothing, footwear, identification, ordinary food and fluids, and route information.</li>
  <li>Confirm how the tracker starts, pauses, resumes, finishes, saves, synchronizes, and displays the final summary.</li>
  <li>Decide the start time, check-in plan, pacing or walk-break strategy, and conditions that will trigger postponement.</li>
  <li>Avoid a hard catch-up workout. Missed preparation cannot be safely replaced in the final two days.</li>
</ul>

<h2>Activity-day checklist</h2>
<ol>
  <li>Check that the date is inside the activity window and conditions remain suitable.</li>
  <li>Confirm the correct activity profile, unit, GPS or treadmill setting, battery, and required permissions.</li>
  <li>Warm up in a way already familiar to you and start at a manageable effort.</li>
  <li>Use planned walk breaks and follow local traffic, facility, organizer, and safety instructions.</li>
  <li>Do not manipulate the device while moving through traffic or an uncertain surface.</li>
  <li>If the tracker fails, move to safety first. Note what happened and preserve any original partial record.</li>
  <li>When finished, stop in a safe place, save the activity once, wait for synchronization, and confirm it opens correctly.</li>
</ol>

<h2>Proof-submission checklist</h2>
<ul>
  <li>Use the actual activity date and the correct eligible event registration.</li>
  <li>Choose the accepted screenshot or supported connected-activity path.</li>
  <li>Confirm activity type, distance in kilometres where requested, duration, location, and any optional fields.</li>
  <li>Compare OCR-assisted values with the original rather than accepting them automatically.</li>
  <li>Keep date, distance, unit, duration, activity type, and source readable while removing unnecessary private data.</li>
  <li>Do not upload a payment receipt as run proof or a run screenshot as payment evidence.</li>
  <li>Review the final summary, confirm that it is your own activity, and submit once.</li>
  <li>Retain the original evidence until the event review, correction, and results period is complete.</li>
</ul>

<h2>After submission: approval is a separate step</h2>
<p>A successfully uploaded result can be submitted or pending rather than approved. Pending distance does not become official progress or a ranked result. An approved result can count according to the event mechanics; a rejected result does not count and may expose a correction path. An internally flagged result may require additional review without making private integrity signals public.</p>
<p>On a configured HelloRun leaderboard, approved single-activity results may be ranked by verified time within the relevant distance group, while an accumulated leaderboard ranks summed approved distance for each registration. Review <a href="/blog/how-leaderboards-work-virtual-running-events">How Leaderboards Work</a> before comparing standings. Recently changed results can also take time to appear after review.</p>
<p>A configured certificate or badge can follow its event-specific completion rules. Reaching an accumulated target does not necessarily finalize a certificate immediately, and not every event provides recognition. Check the dashboard and event page, respond to a displayed correction request, and use <a href="/contact">Contact</a> only after confirming the event, category, date, and status.</p>

<h2>Four first-event examples</h2>
<h3>Example 1: one outdoor 5K</h3>
<p>Mina chooses a completion-based virtual 5K with a seven-day activity window. The event accepts running and walking and requests a readable screenshot showing date, distance, unit, duration, and source. She follows a walk-run plan, tests the app with the phone locked, maps a familiar loop, checks weather, and plans a second morning inside the window. After completing 5.08 km, she saves the original activity, checks privacy around the route start, submits the requested fields, and waits for review. The visible app total supports the submission but does not approve it by itself.</p>
<h3>Example 2: an accumulated 25K</h3>
<p>Jules registers for a 25K accumulated category over four weeks. He plans six manageable sessions rather than one 25K effort and leaves the final week available for weather or correction. Each activity is submitted separately. Approved kilometres count officially, pending kilometres remain potential progress, and a rejected screenshot contributes nothing until an allowed correction is reviewed. Reaching 25K early does not promise immediate certificate finalization.</p>
<h3>Example 3: an allowed treadmill run</h3>
<p>Sam confirms that the event permits treadmill activities and reads the required evidence before visiting the gym. She tests the machine and watch, learns that their totals differ slightly, and chooses the original evidence path specified by the organizer. On activity day she preserves the final machine summary and does not edit a screenshot to force agreement. The organizer applies the published event rule during review.</p>
<h3>Example 4: weather changes the plan</h3>
<p>Alex plans an outdoor attempt, but the local authority issues a severe-weather warning. He does not chase the deadline in unsafe conditions. Because he prepared a backup, he moves to another permitted date within the activity window. If no safe option remained, the appropriate next step would be contacting the organizer—not inventing an activity date or submitting unrelated evidence.</p>

<h2>Troubleshooting common preparation problems</h2>
<h3>The app stops or GPS loses the route</h3>
<p>Reach a safe place before troubleshooting. Save any original partial activity, note the circumstances, and check the event's correction or support process. Do not manufacture a replacement map or combine fields from unrelated activities. A missing map is not always invalid, but the remaining evidence and event rules determine whether it is reviewable.</p>
<h3>The watch and phone show different distances</h3>
<p>Differences can result from GPS sampling, calibration, autopause, smoothing, or indoor estimation. Preserve both originals if useful, select the source accepted by the event, and explain a discrepancy through the supported route. Do not assume the larger number is authoritative.</p>
<h3>The activity is short of the selected distance</h3>
<p>Do not alter the record or continue into an unsafe area to reach an exact screen number. Review any published tolerance or accumulated rule. A single-activity event may require another eligible attempt; an accumulated event may allow another distinct activity before the deadline.</p>
<h3>The deadline was misunderstood</h3>
<p>Check the structured date and timezone first. If the deadline has passed, contact the organizer only through the official support path. Do not backdate an activity or assume an exception. Organizers need consistent rules for all participants.</p>
<h3>The proof is unclear</h3>
<p>Keep the original record. If the result is rejected and the interface offers Fix entry, follow the displayed correction strategy. Replace an unclear image or correct eligible metadata without obscuring the original facts. Ordinary resubmission may be limited to rejected results.</p>
<h3>Your original plan is no longer realistic</h3>
<p>Change the goal, use planned walking, postpone within the permitted window, or choose another event. A registration does not obligate you to finish through illness, pain, unsafe weather, or inadequate preparation. Read refund and transfer terms rather than assuming they exist.</p>

<h2>Frequently asked questions</h2>
<h3>Can I walk during my first virtual run?</h3>
<p>Walking is a valid preparation and pacing strategy. Whether it qualifies for the event depends on its allowed activity types and mechanics.</p>
<h3>Can I use a treadmill?</h3>
<p>Only when the event permits it and you can provide its accepted evidence. Test the machine and recording method before the planned activity.</p>
<h3>Do I need a running watch?</h3>
<p>No universal device is required. A suitable phone app may be enough when it records the accepted fields. Watches can be useful, but compatibility, synchronization, battery, and evidence still need testing.</p>
<h3>Which running app is most accurate?</h3>
<p>This guide does not rank universal accuracy. Devices, settings, routes, buildings, trees, treadmills, and processing methods affect readings. Choose a documented method accepted by the event and preserve the original activity.</p>
<h3>What happens if GPS fails?</h3>
<p>Move to safety, save any original record, and consult the event's evidence or correction rules. A tracker failure does not authorize invented or altered proof.</p>
<h3>Why do moving and elapsed time differ?</h3>
<p>Moving time attempts to represent motion, while elapsed time includes the full period from start to finish. Implementations vary, and an event may use a specific field for review or ranking.</p>
<h3>Does completing the distance guarantee approval?</h3>
<p>No. Correct registration, date, activity type, evidence path, readable fields, distance rules, duplicate checks, and review status can all matter.</p>
<h3>Is a pending result on the leaderboard?</h3>
<p>Pending is not an approved official result or accumulated total. Only approved entries count under the configured leaderboard rules.</p>
<h3>Will every finisher get a certificate or medal?</h3>
<p>No. Certificates, badges, physical rewards, pickup, and delivery are event-dependent. Read what is configured and what the organizer promises before registering.</p>
<h3>Is a virtual result an official qualifying time?</h3>
<p>Not by default. It is an event-specific participation record unless an accepting body explicitly states otherwise. It is not proof of certified course measurement or universal device accuracy.</p>
<h3>What if weather is unsafe on my chosen day?</h3>
<p>Use the backup date, route, or permitted indoor option you prepared. If none fits the rules, contact the organizer. Do not put a deadline ahead of local warnings or conditions.</p>
<h3>Where should I ask an event-specific question?</h3>
<p>Read the live event page and <a href="/faq">FAQ</a>, then use the organizer's stated support method or HelloRun <a href="/contact">Contact</a> path.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://worldathletics.org/personal-best/performance/how-run-best-virtual-race-advice">World Athletics: Virtual races—are you up for the challenge?</a></li>
  <li><a href="https://www.rrca.org/covid-19-information-and-resources/">Road Runners Club of America: Virtual Events Defined</a></li>
  <li><a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity">World Health Organization: Physical Activity Fact Sheet</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations">Strava: Moving Time, Speed, and Pace Calculations</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401776-strava-s-privacy-controls-faq">Strava: Privacy Controls FAQ</a></li>
  <li><a href="/events">HelloRun Events</a></li>
  <li><a href="/how-it-works">How HelloRun Works</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
  <li><a href="/refund-and-cancellation-policy">HelloRun Refund and Cancellation Policy</a></li>
</ul>
<p>Public guidance, platform behavior, and event rules can change. Recheck the live sources and event page when preparing your activity.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Your first virtual run in one minute',
  'How this guide was prepared',
  'Start by deciding whether the event is a good fit',
  'Choose a format and goal you can prepare for',
  'Build enough readiness without treating a date as a guarantee',
  'Select and test your recording method',
  'Know the proof fields before activity day',
  'Plan the route or indoor setting',
  'Check weather, air, visibility, and personal safety',
  'Protect privacy before sharing a map or screenshot',
  'One week before the activity',
  'Forty-eight hours before the activity',
  'Activity-day checklist',
  'Proof-submission checklist',
  'After submission: approval is a separate step',
  'Four first-event examples',
  'Troubleshooting common preparation problems',
  'Frequently asked questions',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/how-it-works',
  '/faq',
  '/contact',
  '/privacy',
  '/refund-and-cancellation-policy',
  '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
  '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
  '/blog/beginner-5k-training-plan-new-runners',
  '/blog/running-safety-tips-early-morning-night-runs',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/how-leaderboards-work-virtual-running-events',
  'worldathletics.org/personal-best/performance/how-run-best-virtual-race-advice',
  'rrca.org/covid-19-information-and-resources',
  'who.int/news-room/fact-sheets/detail/physical-activity',
  'support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations',
  'support.strava.com/en-us/articles/15401776-strava-s-privacy-controls-faq'
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
  if (/<h[12]>How to Prepare for Your First Virtual Run<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/<em>[^<]+<\/em>\s*\*/i.test(payload.contentHtml)) errors.push('body contains malformed emphasized text');
  if (/anywhere,?\s+anytime|any app is accepted|all events accept|every event accepts/i.test(text)) errors.push('article must not claim universal event flexibility or acceptance');
  if (/(?:this guide|this preparation|HelloRun|the event|the plan) guarantee(?:s|d)? (?:completion|safety|approval|a certificate|a medal|a reward)|will keep you safe|prevents? injur/i.test(text)) errors.push('article must not guarantee completion, safety, recognition, or injury prevention');
  if (/HelloRun (?:directly )?(?:processes|handles) (?:your |event )?(?:payment|funds)|pay (?:through|inside) HelloRun/i.test(text)) errors.push('article must not claim direct payment processing');
  if (/perfect OCR|OCR (?:is|will be) always (?:correct|accurate)|automatic approval (?:is|will be) guaranteed/i.test(text)) errors.push('article must not claim perfect OCR or guaranteed approval');
  if (/(?:is|provides|includes) certified timing|(?:is|counts as) (?:an )?official qualifying (?:time|result)/i.test(text)) errors.push('article must not claim certified or qualifying status');
  if (!/reviewed in July 2026 using documented HelloRun/i.test(text)) errors.push('article must disclose its methodology and date');
  if (!/Pending distance does not become official progress or a ranked result/i.test(text)) errors.push('article must distinguish pending progress');
  if (!/does not directly process that transfer/i.test(text)) errors.push('article must accurately describe external payments');
  if (!/OCR may help extract screenshot fields, but extraction is fallible/i.test(text)) errors.push('article must explain OCR limitations');
  if (!/A deadline does not make unsafe conditions acceptable/i.test(text)) errors.push('article must include a weather and safety boundary');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid first virtual run payload: ${errors.join('; ')}`);
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
