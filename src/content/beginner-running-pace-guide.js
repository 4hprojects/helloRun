'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'beginners-guide-to-running-pace';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'Beginner’s Guide to Running Pace',
  excerpt: 'Learn what running pace means, calculate minutes per kilometre or mile, use effort wisely, read splits, and plan a realistic pace for training and events.',
  category: 'Training',
  tags: Object.freeze([
    'running pace',
    'pace calculator',
    'beginner running',
    'easy running',
    'race pace',
    'run tracking',
    'running splits',
    'runner guide'
  ]),
  seoTitle: 'Beginner’s Guide to Running Pace | HelloRun',
  seoDescription: 'Learn how running pace works, calculate minutes per kilometre or mile, understand splits and effort, and choose realistic training and event pacing.',
  coverImageAlt: 'Beginner runner checking an unbranded sports watch while practising a comfortable pace on a measured park route'
});

const RAW_CONTENT_HTML = `
<p>Running pace is a way to describe how long you take to cover a unit of distance. A display of 7:00 min/km means seven minutes for each kilometre at that moment or across the measured activity, depending on the screen. A display of 11:16 min/mi represents approximately the same speed in miles. The number is useful, but it is not a grade, a definition of who counts as a runner, or a complete description of effort.</p>
<p>Beginners often meet pace in several places at once: a watch shows current pace, an app shows average pace, a training plan says “easy,” and an event asks for an estimated finish time. Those values can disagree without any one of them being dishonest. GPS movement, hills, weather, pauses, unit settings, treadmill calibration, and the difference between moving and elapsed time all influence what appears.</p>
<blockquote><strong>The useful principle:</strong> use pace as one piece of information alongside breathing, perceived effort, conditions, and the purpose of the session. A faster number is not automatically better, and no pace guarantees completion, safety, fitness, proof approval, or a particular result.</blockquote>

<h2>Running pace in one minute</h2>
<ul>
  <li><strong>Pace is time divided by distance.</strong> If 5 kilometres takes 35 minutes, average pace is 7:00 min/km.</li>
  <li><strong>Lower pace numbers are faster.</strong> Six minutes per kilometre is faster than seven minutes per kilometre because each kilometre takes less time.</li>
  <li><strong>Speed reverses that relationship.</strong> Higher kilometres per hour or miles per hour are faster.</li>
  <li><strong>Average pace summarizes a whole recorded period.</strong> Current or instant pace estimates what is happening now and can fluctuate sharply.</li>
  <li><strong>A split is one segment.</strong> Kilometre, mile, or lap splits show how pace changed across an activity.</li>
  <li><strong>Easy is an effort, not one universal number.</strong> A conversational pace can vary by runner, route, weather, fatigue, disability, and day.</li>
  <li><strong>Event pace needs context.</strong> Course, cut-off, proof field, timing method, and whether the activity is virtual or onsite can all matter.</li>
</ul>
<p>Start with the arithmetic, then compare it with how the session felt. If you are choosing an event as well as learning pace, use the <a href="/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge">distance-choice guide</a> and browse current <a href="/events">Events</a>.</p>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in July 2026 using documented guidance from the US Centers for Disease Control and Prevention, the American College of Sports Medicine, the UK National Health Service, World Athletics, and Strava, together with documented HelloRun event and result behavior. It is general educational information, not individualized coaching, medical advice, a laboratory test, or a claim that one device was independently tested against another.</p>
<p>CDC and ACSM describe the talk test and perceived exertion as practical ways to assess relative intensity. NHS Couch to 5K uses a flexible walk-run progression rather than requiring a starting pace. World Athletics advises adjusting pace for extreme weather and using perceived effort when conditions make pace misleading. Strava documents how moving time and elapsed time can produce different calculations.</p>
<p>These sources explain useful principles; they do not provide a universal pace chart for every person. Training response, disability, age, pregnancy, health conditions, medication, recent illness, and injury history can affect what is appropriate. Seek qualified guidance when your circumstances warrant it, and use local medical or emergency services for severe or unexplained symptoms.</p>

<h2>What running pace means</h2>
<p>Pace answers the question, “How much time did each unit of distance take?” Running apps commonly express it as minutes and seconds per kilometre or per mile. If you cover 1 kilometre in 8 minutes 30 seconds, the pace is 8:30 min/km. If you cover 1 mile in 12 minutes, it is 12:00 min/mi.</p>
<p>The slash can be read as “per.” The unit matters: 8:00 min/km is not the same as 8:00 min/mi. A kilometre is shorter than a mile, so copying a number without its unit can create a large misunderstanding. Keep the unit beside the value in a plan, screenshot, message, or event estimate.</p>
<p>Pace may refer to an entire activity, a segment, or an estimate at one instant. Read the label before comparing screens. “Average pace” across a run can include different segments depending on how the platform treats pauses. “Lap pace” covers the current or completed lap. “Grade-adjusted pace” is a model, not the actual time per unit measured on level ground.</p>

<h2>Pace, speed, effort, and finish time are different</h2>
<h3>Pace</h3>
<p>Pace is duration per unit distance. A smaller time per kilometre or mile represents faster movement. It is especially convenient for planning splits and estimating how long a known distance could take if the pace were maintained.</p>
<h3>Speed</h3>
<p>Speed is distance per unit time, such as kilometres per hour. A larger speed is faster. Treadmills often display speed while outdoor running apps emphasize pace. The two describe the same movement from opposite directions, but conversion errors are common.</p>
<h3>Effort</h3>
<p>Effort describes how demanding the activity feels or how the body responds. Two runs at 7:00 min/km can have different effort because of heat, hills, wind, sleep, surface, or accumulated fatigue. Two runners at the same effort can have very different pace numbers.</p>
<h3>Finish time</h3>
<p>Finish time is the total duration for the event distance under its timing rules. It can be estimated from pace, but a prediction assumes that the pace is maintained and the distance is accurate. Water stops, congestion, hills, navigation, pauses, and fatigue can change the result.</p>

<h2>How to calculate pace</h2>
<p>The formula is simple: divide total time by distance. The careful part is converting time into one consistent unit before dividing.</p>
<h3>Example: 5K in 35 minutes</h3>
<ol>
  <li>Total time is 35 minutes.</li>
  <li>Distance is 5 kilometres.</li>
  <li>35 divided by 5 equals 7.</li>
  <li>Average pace is 7:00 min/km.</li>
</ol>
<h3>Example: 5K in 37 minutes 30 seconds</h3>
<ol>
  <li>Convert the 30 seconds to half a minute: 37.5 minutes.</li>
  <li>Divide 37.5 by 5: 7.5 minutes per kilometre.</li>
  <li>Convert the decimal half-minute back to seconds: 30 seconds.</li>
  <li>Average pace is 7:30 min/km.</li>
</ol>
<h3>Example: 3.1 miles in 40 minutes</h3>
<p>Divide 40 by 3.1 to get about 12.903 minutes per mile. The decimal .903 is not 90 seconds. Multiply .903 by 60 to get about 54 seconds, producing approximately 12:54 min/mi. Small differences can appear if the displayed distance was rounded.</p>
<p>A calculator or trusted app is convenient, but understanding the steps helps you spot a unit mistake. Do not round every split before calculating an overall average; use the original total time and distance where possible.</p>

<h2>How to convert pace and speed</h2>
<p>For metric pace, speed in km/h is 60 divided by minutes per kilometre. A pace of 6:00 min/km corresponds to 10 km/h. A pace of 7:30 min/km is 7.5 minutes per kilometre, so 60 divided by 7.5 equals 8 km/h.</p>
<p>To convert speed to metric pace, divide 60 by km/h. A treadmill set to 9 km/h corresponds to about 6.667 minutes per kilometre. Convert .667 minutes to about 40 seconds, giving roughly 6:40 min/km.</p>
<p>For miles, pace in minutes per mile is 60 divided by miles per hour. A speed of 5 mph corresponds to 12:00 min/mi. Converting between kilometre and mile pace also requires the distance conversion: one mile is about 1.609 kilometres. Use a calculator rather than relying on a memorized approximation when an event field must be accurate.</p>
<p>Treadmill belt speed, watch estimates, and footpod readings can disagree. The conversion only translates the displayed number; it does not prove that the machine or device measured distance perfectly.</p>

<h2>Average, current, lap, moving, and elapsed pace</h2>
<h3>Current or instant pace</h3>
<p>Current pace reacts to recent location samples. Consumer GPS does not know your position with perfect continuity, so the number can jump when turning, passing buildings, moving under trees, or starting from rest. Chasing every fluctuation can create erratic running. A smoothed lap or rolling pace may be easier to use when the device supports it.</p>
<h3>Average pace</h3>
<p>Average pace divides a selected duration by a selected distance. The key question is which duration the platform selected. A watch may show the average while its timer is actively running; an app may later recalculate using moving time.</p>
<h3>Lap or split pace</h3>
<p>Lap pace summarizes one kilometre, mile, track lap, or manually marked segment. It responds more slowly than instant pace and makes changes across the activity visible. Auto-lap depends on device distance, so a GPS kilometre may not line up exactly with a physical course marker.</p>
<h3>Moving pace and elapsed pace</h3>
<p>Moving time attempts to count periods of movement. Elapsed time includes the full span from start to finish, including stops. Strava explains that its calculations can depend on activity type, recording method, and whether an activity is treated as a race. An event may rank elapsed time, imported moving time, chip time, gun time, or another configured field. Do not substitute one for another without checking the rules.</p>

<h2>Read splits without judging every kilometre</h2>
<p>Splits reveal the shape of a run. If five kilometre splits are 7:20, 7:15, 7:10, 7:05, and 7:00, the runner gradually became faster. This is often called a negative split because the later portion is quicker than the earlier portion. If the later splits slow, it is a positive split. Even splits stay relatively consistent.</p>
<p>Those labels describe the data, not whether the session succeeded. A hill in kilometre four can make the split slower at the same effort. Waiting at a crossing can affect elapsed time. A planned walk break can be appropriate. Trail kilometres should not be judged as though they were identical track laps.</p>
<p>Look for patterns across comparable runs rather than treating one split as a verdict. Ask whether the early pace matched the plan, whether effort rose sharply, whether conditions changed, and whether the final part remained controlled. Splits are most useful when paired with notes about route, weather, pauses, and perceived effort.</p>

<h2>Use the talk test and perceived effort</h2>
<p>CDC describes the talk test as a way to assess relative intensity: during moderate activity, a person can generally talk but not sing; at vigorous intensity, only a few words may be possible before pausing for breath. ACSM also presents steady conversation as a practical signal associated with moderate aerobic effort.</p>
<p>For a beginner's easy session, comfortable sentences are often more useful than forcing a pace copied from another runner. “Easy” can slow on an uphill, in humidity, after poor sleep, or while returning from a break. Walk breaks can keep the intended effort manageable. The pace may improve over time, but improvement is not guaranteed and should not be forced from one session to the next.</p>
<p>Perceived effort can use plain language: very easy, easy, steady, hard, and very hard. Numbers can be added, but avoid turning a subjective scale into a medical measurement. If the session calls for easy running and talking becomes difficult, reducing speed, walking, or stopping may be the appropriate response.</p>

<h2>Common training pace labels</h2>
<h3>Easy or conversational</h3>
<p>An easy run supports repeatable activity at a controlled effort. The runner should not need to prove fitness on every outing. Pace varies substantially among people and across conditions, so this guide does not publish a universal easy-pace table.</p>
<h3>Steady</h3>
<p>Steady usually means controlled but more purposeful than easy. Its exact meaning varies by coach or plan. Read the plan's definition rather than assuming that every use refers to the same intensity.</p>
<h3>Tempo or threshold</h3>
<p>These terms are used inconsistently. They often describe sustained work harder than easy pace but below an all-out effort. A beginner does not need to derive a threshold number from a race result without context. When a plan includes this work, follow its effort description and qualified guidance.</p>
<h3>Intervals</h3>
<p>Intervals alternate defined work and recovery. The appropriate pace depends on interval duration, recovery, purpose, surface, and experience. Short repetitions are not a license to sprint uncontrollably. Warm-up, recovery, and form matter more than matching another person's number.</p>
<h3>Event or race pace</h3>
<p>Event pace is the planned average for a specific distance and setting. A sustainable 5K pace is not automatically sustainable for 10K or 21K. Virtual routes and onsite courses also differ, so a goal should reflect the actual course, conditions, support, and timing method.</p>

<h2>Why the same effort produces different pace</h2>
<ul>
  <li><strong>Heat and humidity:</strong> add physiological demand. World Athletics advises slowing and using perceived effort when extreme weather makes normal pace inappropriate.</li>
  <li><strong>Wind:</strong> changes the cost of maintaining speed and can make outbound and return splits look very different.</li>
  <li><strong>Elevation:</strong> uphill pace usually slows at a similar effort, while downhill running has its own demands and risks.</li>
  <li><strong>Surface:</strong> trail, sand, grass, wet pavement, snow, and treadmill belts do not behave like a dry level road.</li>
  <li><strong>Congestion and crossings:</strong> alter rhythm and elapsed time even when fitness is unchanged.</li>
  <li><strong>Sleep, stress, and recovery:</strong> can change perceived difficulty. A slower easy day may be the correct decision.</li>
  <li><strong>Accessibility and movement pattern:</strong> mobility devices, guide support, planned rests, and individual movement strategies affect pace comparisons.</li>
</ul>
<p>Do not use a warm-weather slowdown, hilly split, or walk break as evidence of failure. Compare like with like where possible, and prioritize current conditions over a target generated on a different day.</p>

<h2>GPS and treadmill pace are estimates</h2>
<p>Outdoor devices estimate distance from recorded positions and processing rules. Tall buildings, tunnels, tree cover, tight turns, device placement, battery settings, autopause, and signal acquisition can change the track. A small distance difference changes calculated pace even when total time is identical.</p>
<p>Indoor devices cannot rely on a normal outdoor GPS track. A treadmill reports belt-based distance according to its calibration; a watch may estimate from arm movement or a learned stride; a footpod uses another method. Their totals may disagree without proving which one is universally correct.</p>
<p>Test the device before an event, wait for the expected outdoor signal where appropriate, choose the correct activity profile, and preserve the original record. For app options, see <a href="/blog/best-apps-to-track-your-virtual-run">Best Apps to Track Your Virtual Run</a>. Never edit evidence merely to make two devices match.</p>

<h2>Build a personal pace reference safely</h2>
<ol>
  <li>Choose a familiar, reasonably level route or permitted treadmill setting.</li>
  <li>Record several easy sessions rather than one all-out test.</li>
  <li>Note distance, total time, displayed pace unit, route, weather, stops, and perceived effort.</li>
  <li>Identify the range in which conversation stayed comfortable.</li>
  <li>Repeat under similar conditions before treating the range as useful.</li>
  <li>Update the reference when conditions, health, training, or equipment change.</li>
</ol>
<p>A personal reference is descriptive, not a permanent prescription. If your comfortable pace varies from 7:40 to 8:20 min/km across ordinary runs, that range may be more useful than forcing 8:00 exactly. Walk-run sessions can be referenced by total average pace while also recording the chosen intervals.</p>
<p>Do not use an exhausting time trial as the only basis for every training pace. Beginners can build a valuable reference from repeatable easy movement and the <a href="/blog/beginner-5k-training-plan-new-runners">flexible beginner 5K plan</a>.</p>

<h2>Estimate an event pace without making a promise</h2>
<p>Begin with recent activities that resemble the event in distance, surface, elevation, and conditions. A comfortable 3K on a cool flat route is incomplete evidence for a hot hilly 10K. Consider whether the goal is completion, consistent effort, or performance.</p>
<p>To estimate finish time, multiply pace by distance. At 7:30 min/km, a mathematically even 5K is 37:30 and a 10K is 1:15:00. That does not mean both distances are equally sustainable. The calculation is arithmetic, not a physiological prediction.</p>
<p>Allow for the event setting. Onsite starts can include crowding and course markers; virtual runs can include crossings, navigation, and runner-managed support. If an organizer asks for an estimated time to assign a start wave, provide an honest, conservative estimate based on recent relevant activity, not an aspirational number chosen to enter a faster group.</p>

<h2>A simple pacing plan for a first event</h2>
<p>A practical completion plan is to begin controlled, settle into a repeatable effort, and review how you feel after the early section. Starting faster than a recent sustainable effort because of excitement can make the later distance harder. Planned walk breaks can begin before fatigue becomes severe when the event permits them.</p>
<ol>
  <li><strong>Opening section:</strong> use an effort that feels deliberately restrained while the body and route settle.</li>
  <li><strong>Middle section:</strong> maintain a conversational or planned effort, adjusting for hills, weather, and surface rather than defending one number.</li>
  <li><strong>Final section:</strong> only increase effort if conditions remain safe and the runner still feels controlled. Finishing at the planned effort is also a valid outcome.</li>
</ol>
<p>This is not a guarantee of an even or negative split. Route and health decisions take priority. If the original event date or distance is no longer realistic, use a permitted later date, shorter category, planned walking, or another event rather than treating a pace target as an obligation.</p>

<h2>Virtual and onsite pace are not automatically comparable</h2>
<p>An onsite result can use gun time, chip time, officially measured course distance, or another event rule. The course may be certified, but onsite does not automatically mean certified. A virtual result may use consumer-device distance and an approved submitted duration on a runner-selected route.</p>
<p>Different elevation, turns, weather, surfaces, crossings, GPS devices, treadmill estimates, and pause rules make direct comparisons uncertain. A virtual 5K average pace can be meaningful within that event and personal record without becoming a certified qualifying result.</p>
<p>Check whether the event ranks elapsed time or another verified field, whether walking or treadmills are allowed, and what evidence is accepted. Use <a href="/blog/virtual-run-vs-traditional-race-which-one-should-you-join">Virtual Run vs Traditional Race</a> for the broader format comparison.</p>

<h2>Pace in HelloRun results and proof</h2>
<p>HelloRun events use event-specific categories and rules. Registration can be free or paid; paid registration can involve an external transfer and manual payment-receipt review. HelloRun does not directly process that transfer. Payment evidence is separate from activity proof.</p>
<p>For a result, a runner may submit an accepted screenshot or a supported connected Strava activity. Screenshot entry can use OCR assistance, but the runner must confirm the extracted distance, duration, date, activity type, and other required fields. OCR is fallible and does not prove accuracy. Supported imported activity data is also validated against current eligibility rules.</p>
<p>Some eligible clean submissions may qualify for conditional approval; others require organizer or admin review. Pending is not an approved result. Configured race-result leaderboards can rank approved elapsed time within relevant groups, while accumulated leaderboards rank approved distance rather than pace. Certificates are event-dependent and are not guaranteed by displaying a pace.</p>
<p>Keep the original activity and read <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> and <a href="/blog/how-to-submit-run-proof-correctly-hellorun">How to Submit Run Proof Correctly</a>. For standings, use the <a href="/blog/how-leaderboards-work-virtual-running-events">leaderboard guide</a>.</p>

<h2>Four practical pace examples</h2>
<h3>Example 1: a walk-run 5K</h3>
<p>Lea completes 5K in 42 minutes using planned run and walk intervals. Her average is 8:24 min/km. That average describes the full session; it does not show that every kilometre or every running interval occurred at 8:24. She records the interval pattern and conversational effort so the number has context.</p>
<h3>Example 2: hills change the splits</h3>
<p>Omar's first two kilometres are 6:55 and 7:00 on level ground. The third climbs steadily and takes 7:50 at a similar effort. He does not accelerate dangerously to rescue the average. The slower split reflects the route demand, and the descent is approached with control rather than treated as free time.</p>
<h3>Example 3: moving and elapsed time</h3>
<p>Priya's app reports 30 minutes moving and 33 minutes elapsed for 4 kilometres after a safe stop at crossings. Moving pace is 7:30 min/km; elapsed pace is 8:15 min/km. Neither number should silently replace the other in an event field. She follows the event's required duration and preserves the source record.</p>
<h3>Example 4: treadmill disagreement</h3>
<p>Daniel's treadmill shows 5.00 km in 35 minutes, while his watch estimates 4.72 km. The treadmill pace converts to 7:00 min/km, but that calculation does not certify the machine. He checks the event's treadmill and evidence policy, keeps both originals, and submits the accepted source without altering either value.</p>

<h2>Beginner pace mistakes to avoid</h2>
<ul>
  <li>Copying another runner's easy pace without considering relative effort.</li>
  <li>Confusing min/km with min/mi or pace with km/h.</li>
  <li>Reading 7.5 minutes as 7 minutes 5 seconds instead of 7 minutes 30 seconds.</li>
  <li>Chasing instant GPS pace through every fluctuation.</li>
  <li>Starting every run at an event effort and leaving no truly easy sessions.</li>
  <li>Using one exceptional workout as a guaranteed prediction.</li>
  <li>Ignoring heat, humidity, wind, hills, surface, pain, illness, or poor visibility to protect an average.</li>
  <li>Pausing or editing a record to produce a more attractive result rather than following event rules.</li>
  <li>Assuming a watch, app, treadmill, or calculator is perfectly accurate.</li>
  <li>Believing that a slower pace removes the need for route and personal-safety planning.</li>
</ul>

<h2>Before-run pace checklist</h2>
<ul>
  <li>Define the session purpose: easy movement, intervals, event practice, or completion.</li>
  <li>Choose kilometres or miles and confirm every device uses the intended unit.</li>
  <li>Check weather, air quality, route, surface, elevation, visibility, and local warnings.</li>
  <li>Choose an effort range and walk-break plan rather than one number that must be defended.</li>
  <li>Confirm GPS signal, battery, activity type, autopause choice, and treadmill mode.</li>
  <li>Know which screen shows current, lap, average, moving, or elapsed information.</li>
  <li>For an event, confirm the timing and proof field the organizer will review.</li>
  <li>Prepare a safe option to slow, shorten, stop, or reschedule.</li>
</ul>

<h2>After-run review checklist</h2>
<ul>
  <li>Save the original activity once and allow synchronization to finish.</li>
  <li>Compare total time, distance, unit, average pace, elapsed time, and splits.</li>
  <li>Add context: effort, weather, elevation, surface, stops, walk breaks, and device used.</li>
  <li>Look for broad patterns rather than judging the slowest split in isolation.</li>
  <li>Ask whether the session matched its intended purpose and left reasonable recovery.</li>
  <li>Do not diagnose a health problem or change an entire plan from one unusual reading.</li>
  <li>For virtual proof, retain readable required fields while protecting unnecessary route and profile data.</li>
  <li>If a result is pending or rejected, follow the displayed review or correction path rather than editing evidence.</li>
</ul>

<h2>When to stop focusing on pace</h2>
<p>Stop watching the number when it distracts from traffic, crossings, an uncertain surface, severe weather, pain, dizziness, faintness, chest discomfort, severe or unusual breathing difficulty, confusion, or another concerning symptom. Reach safety and obtain appropriate medical or emergency help through local services when needed.</p>
<p>Also set pace aside during an easy day when the device number is causing you to run harder than the intended effort. A watch can be covered, alerts can be widened, or the activity can be guided by conversation and time. Technology should support the session, not override judgment.</p>
<p>For route, low-light, weather, and emergency preparation, read the <a href="/blog/running-safety-tips-early-morning-night-runs">running safety guide</a>. General guidance cannot guarantee safety or replace individual professional advice.</p>

<h2>Frequently asked questions</h2>
<h3>What is a good running pace for a beginner?</h3>
<p>There is no universal good number. A useful beginner pace supports the intended session and a manageable effort. For easy activity, the ability to speak in comfortable sentences is more informative than matching another person's pace.</p>
<h3>Why does a lower pace number mean faster?</h3>
<p>Pace measures time required for one unit. Taking six minutes for a kilometre is faster than taking seven. Speed uses the opposite direction: more kilometres per hour is faster.</p>
<h3>Should I use min/km or min/mi?</h3>
<p>Use the unit required by your plan or event and one you understand consistently. Keep the unit visible whenever sharing a value.</p>
<h3>Is average pace the same as moving pace?</h3>
<p>Not always. Average pace depends on which time the platform divides by distance. Moving pace can exclude detected non-moving periods; elapsed pace includes the entire start-to-finish span.</p>
<h3>Why is instant pace unstable?</h3>
<p>It relies on recent position and timing estimates. GPS noise, turns, signal obstruction, and changes in speed can cause large short-term jumps. Lap pace or effort may be easier to follow.</p>
<h3>Do walk breaks ruin average pace?</h3>
<p>No. They become part of the overall result when included in the timing method. Planned walking can be an appropriate pacing strategy, although event rules decide whether the activity type is accepted.</p>
<h3>Can I predict a 10K by doubling my 5K time?</h3>
<p>The arithmetic gives a hypothetical time at identical pace, not a reliable guarantee. Maintaining the pace for twice the distance may be unrealistic, and course or weather differences matter.</p>
<h3>Why do my treadmill and watch disagree?</h3>
<p>They estimate distance differently and may have different calibration. Follow the event's accepted evidence rule and keep the original readings instead of forcing agreement.</p>
<h3>Does faster pace mean better fitness?</h3>
<p>Not by itself. Route, conditions, effort, recovery, device behavior, and session purpose matter. Fitness change is better considered across comparable repeated observations.</p>
<h3>What pace should I use in hot weather?</h3>
<p>This guide does not prescribe a number. Heat and humidity increase demand, so reduce effort, use local warnings, reschedule when appropriate, and prioritize symptoms and safety over a target.</p>
<h3>Will HelloRun calculate an official qualifying pace?</h3>
<p>No. HelloRun records event-specific reviewed results. A leaderboard is not certified timing, course measurement, a World Athletics ranking, or a qualifying result unless an accepting organization explicitly says otherwise.</p>
<h3>Where should I start if I have not run before?</h3>
<p>Use the <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K plan</a>, which starts with flexible walk-run sessions, or read <a href="/blog/how-to-prepare-for-your-first-virtual-run">first virtual-run preparation</a>. Ask a qualified professional when your health circumstances call for individual guidance.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.cdc.gov/physicalactivity/basics/measuring/index.html">CDC: Measuring Physical Activity Intensity</a></li>
  <li><a href="https://www.acsm.org/docs/default-source/files-for-resource-library/exercise-intensity-infographic.pdf">American College of Sports Medicine: Monitoring Aerobic Exercise Intensity</a></li>
  <li><a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/">NHS: Couch to 5K</a></li>
  <li><a href="https://worldathletics.org/personal-best/performance/running-through-extreme-weather">World Athletics: Running Through Extreme Weather</a></li>
  <li><a href="https://worldathletics.org/news/performance/advice-runners-beginners">World Athletics: Advice for Beginner Runners</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations">Strava: Moving Time, Speed, and Pace Calculations</a></li>
  <li><a href="/how-it-works">HelloRun: How It Works</a></li>
  <li><a href="/faq">HelloRun FAQ</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
</ul>
<p>Apps, devices, source guidance, and event rules can change. Recheck the live event page, recording interface, and linked sources before relying on a pace or submitting a result.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Running pace in one minute',
  'How this guide was prepared',
  'What running pace means',
  'Pace, speed, effort, and finish time are different',
  'How to calculate pace',
  'How to convert pace and speed',
  'Average, current, lap, moving, and elapsed pace',
  'Read splits without judging every kilometre',
  'Use the talk test and perceived effort',
  'Common training pace labels',
  'Why the same effort produces different pace',
  'GPS and treadmill pace are estimates',
  'Build a personal pace reference safely',
  'Estimate an event pace without making a promise',
  'A simple pacing plan for a first event',
  'Virtual and onsite pace are not automatically comparable',
  'Pace in HelloRun results and proof',
  'Four practical pace examples',
  'Beginner pace mistakes to avoid',
  'Before-run pace checklist',
  'After-run review checklist',
  'When to stop focusing on pace',
  'Frequently asked questions',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/how-it-works',
  '/faq',
  '/privacy',
  '/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge',
  '/blog/how-to-prepare-for-your-first-virtual-run',
  '/blog/beginner-5k-training-plan-new-runners',
  '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/how-leaderboards-work-virtual-running-events',
  '/blog/running-safety-tips-early-morning-night-runs',
  'cdc.gov/physicalactivity/basics/measuring/index.html',
  'acsm.org/docs/default-source/files-for-resource-library/exercise-intensity-infographic.pdf',
  'nhs.uk/better-health/get-active/get-running-with-couch-to-5k',
  'worldathletics.org/personal-best/performance/running-through-extreme-weather',
  'worldathletics.org/news/performance/advice-runners-beginners',
  'support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations'
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
  if (/<h[12]>Beginner(?:’|')s Guide to Running Pace<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/\b10\s*%\s*rule\b/i.test(text)) errors.push('article must not prescribe the 10% rule');
  if (/(?:this guide|this plan|the plan|HelloRun|a pace target) (?:will |can )?(?:guarantee|prevent)|guaranteed (?:safe completion|finish|injury prevention)|prevents? injur/i.test(text)) errors.push('article must not guarantee safety, completion, or injury prevention');
  if (/good beginner pace is \d|every beginner should run|universal (?:easy|race) pace/i.test(text)) errors.push('article must not prescribe a universal pace');
  if (/all events accept|every event accepts|treadmills? (?:are|is) always accepted/i.test(text)) errors.push('article must not claim universal event acceptance');
  if (/HelloRun (?:directly )?(?:processes|handles) (?:your |event )?(?:payment|funds)|perfect OCR|every submission is automatically approved/i.test(text)) errors.push('article must not claim unsupported HelloRun behavior');
  if (!/reviewed in July 2026 using documented guidance/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/Pace is time divided by distance/i.test(text)) errors.push('article must define the pace formula');
  if (!/Pending is not an approved result/i.test(text)) errors.push('article must distinguish pending evidence');
  if (!/does not directly process that transfer/i.test(text)) errors.push('article must accurately describe external payments');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid beginner pace payload: ${errors.join('; ')}`);
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
