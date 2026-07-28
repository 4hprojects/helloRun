'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-complete-a-50k-accumulated-distance-challenge';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Complete a 50K Accumulated-Distance Challenge',
  excerpt: 'Plan a 50K accumulated-distance challenge with flexible weekly targets, recovery, activity tracking, approved-progress checks, and deadline buffers.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    '50k challenge',
    'accumulated distance',
    'distance challenge',
    'running goals',
    'weekly running plan',
    'activity tracking',
    'approved distance',
    'virtual running'
  ]),
  seoTitle: 'How to Complete a 50K Distance Challenge | HelloRun',
  seoDescription: 'Plan a 50K accumulated-distance challenge using flexible weekly averages, recovery days, tracking, proof review, deadline buffers, and safer backup options.',
  coverImageAlt: 'Runner planning several tracked activities on a calendar toward a 50 km accumulated-distance goal with recovery and proof-review checkpoints'
});

const RAW_CONTENT_HTML = `
<p>A 50K accumulated-distance challenge asks you to reach 50 kilometres through several eligible activities during one event window. It is a consistency and planning goal, not necessarily one continuous 50K run. A runner might combine outdoor runs, walk-run sessions, or an allowed treadmill activity, but only when the individual event rules accept those activities and the resulting evidence is approved.</p>
<p>The number 50 can look simple on a progress bar. The real task includes choosing a suitable event, understanding its calendar, fitting activity around recovery and daily life, recording every eligible session, leaving time for review, and changing the plan when weather, illness, work, travel, or technology makes the original schedule unsuitable.</p>
<blockquote><strong>The central principle:</strong> plan from your current consistent activity and the event's usable window. Do not chase an arithmetic target at the expense of health, recovery, official weather guidance, or event eligibility.</blockquote>

<h2>A 50K challenge in one minute</h2>
<ol>
  <li><strong>Confirm that the event is accumulated.</strong> A “50K challenge” label does not automatically mean that several activities can be combined.</li>
  <li><strong>Read every date.</strong> Separate registration, activity, submission, review, result, and recognition dates, including the event timezone.</li>
  <li><strong>Check what can count.</strong> Review accepted activity types, walking and treadmill rules, minimum activity distance, evidence paths, units, and correction policy.</li>
  <li><strong>Use approved progress as the starting point.</strong> Subtract approved distance from 50K; keep pending distance separate until it is reviewed.</li>
  <li><strong>Divide the remaining distance by usable weeks.</strong> This creates a planning average, not a compulsory weekly prescription.</li>
  <li><strong>Add room for recovery and disruption.</strong> Avoid placing the entire target in the final days or treating missed activity as debt that must be repaid immediately.</li>
  <li><strong>Record and submit individual activities.</strong> Preserve date, distance, units, duration, activity type, and the original evidence requested by the event.</li>
  <li><strong>Close the challenge deliberately.</strong> Reconcile approved, pending, and rejected activities before the deadline and follow up while corrections are still possible.</li>
</ol>
<p>If accumulated events are new to you, read <a href="/blog/how-accumulated-distance-challenges-work">How Accumulated Distance Challenges Work</a> first. It is the source-of-truth companion for HelloRun targets, progress states, standings, and certificate finalisation.</p>
<p>The <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">foundational virtual-run guide</a> explains the full registration-to-result journey, while <a href="/blog/how-to-prepare-for-your-first-virtual-run">the first virtual-run preparation guide</a> covers event trust, tracking tests, routes, and proof preparation in more detail.</p>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in July 2026 using documented HelloRun accumulated-target, activity-validation, progress, leaderboard, and certificate-finalisation behavior. General planning and safety context comes from the World Health Organization, US Centers for Disease Control and Prevention, World Athletics, NHS, Road Runners Club of America, Strava, and the UK Information Commissioner's Office.</p>
<p>It is researched general guidance, not an individualized training prescription, medical assessment, diagnosis, rehabilitation plan, or promise that a runner will complete 50K. It does not independently test devices, routes, evidence, or physical readiness. A qualified professional who understands your circumstances is the appropriate source when illness, pregnancy, disability, chronic conditions, medicines, previous injury, or concerning symptoms make general advice insufficient.</p>
<p>The event page and live submission form remain authoritative. Features, app behavior, evidence limits, and event mechanics can change by event, device, plan, region, and date.</p>

<h2>Accumulated 50K is not one continuous ultramarathon</h2>
<p>A continuous 50K normally describes one activity covering about 50 kilometres from start to finish. It creates very different preparation, route, support, nutrition, safety, and recovery demands. This article does not prepare anyone for that format.</p>
<p>An accumulated 50K combines separate eligible activities within an event registration. For example, ten approved 5K activities can produce 50K of verified progress. Five 10K activities can also reach the arithmetic total, but neither pattern is automatically appropriate for every runner or accepted by every event.</p>
<p>Confirm the format in structured event details before registering. Some events use “challenge” in a promotional sense while still requiring one activity. Others permit accumulation but set a minimum distance for each activity, limit accepted run types, or use a defined submission boundary. The title alone is not the rulebook.</p>
<p>An accumulated format is not inherently easy. Repeated activity creates total workload, scheduling, recovery, tracking, and evidence obligations. A shorter event window or high per-activity minimum can make 50K unsuitable even when no single activity is especially long.</p>

<h2>Read the complete event calendar</h2>
<p>Write down the registration close, activity start, activity end, final submission deadline, expected review period, results date, and any recognition or fulfilment date. These milestones are not interchangeable. An event may stop accepting new registrations while registered runners can still complete activities, and it may allow proof submission after the activity window closes.</p>
<p>Use the timezone stated by the live event. A deadline labelled only as a date can end earlier or later than expected when the organiser and runner are in different regions. HelloRun's structured event settings and the live form should take priority over an old poster, copied social caption, or personal calendar assumption.</p>
<p>Define <strong>usable weeks</strong> as the time in which you can reasonably complete eligible activities—not simply the number of calendar weeks between two dates. Remove travel days, known work peaks, inaccessible venue days, planned recovery, and periods in which local weather commonly requires a backup.</p>
<p>Leave a submission buffer whenever the event window permits it. An activity completed near the boundary can still face a weak screenshot, import delay, correction, or rejection. A buffer creates an opportunity to resolve evidence; it does not extend the official deadline.</p>

<h2>Check every rule before planning kilometres</h2>
<ul>
  <li><strong>Goal and category:</strong> confirm that your selected registration resolves to 50K rather than another event-level fallback.</li>
  <li><strong>Activity types:</strong> check whether Run, Walk, Hike, Trail Run, treadmill, or another type is accepted.</li>
  <li><strong>Minimum activity:</strong> find out whether very short activities qualify and whether there is a submission-count limit.</li>
  <li><strong>Evidence:</strong> confirm screenshot, supported connected activity, or another available path and its current file requirements.</li>
  <li><strong>Units and time:</strong> know whether the form expects kilometres, duration, moving time, elapsed time, or other fields.</li>
  <li><strong>Duplicate policy:</strong> do not assume the same activity or screenshot can be reused across entries.</li>
  <li><strong>Review and correction:</strong> understand pending status, review responsibility, rejection reasons, and the available correction flow.</li>
  <li><strong>Standings and recognition:</strong> check whether a leaderboard, badge, certificate, reward, or completion-only result is actually configured.</li>
</ul>
<p>Walking is a valid way to be active, but whether walking counts is an event decision. The same is true of treadmills and split activities. The <a href="/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge">distance-choice guide</a> can help if the 50K mechanics do not fit your available time.</p>

<h2>Use a non-scored readiness review</h2>
<p>This is not a pass-or-fail quiz. Its purpose is to reveal whether the event fits now and what must change before registration.</p>
<ul>
  <li>What activity have you completed consistently in recent weeks, rather than during one exceptional day?</li>
  <li>Can your calendar support repeated activity and recovery without removing necessary sleep or doubling missed sessions?</li>
  <li>Do you have a safe, accessible route or permitted indoor alternative for likely conditions?</li>
  <li>Can you recognize comfortable effort using breathing and the talk test rather than forcing a target pace?</li>
  <li>Can you record, charge, protect, and troubleshoot the selected tracker?</li>
  <li>Do health, pregnancy, disability, illness, pain, medicines, or previous heat illness call for qualified individual guidance?</li>
  <li>Can you step down, pause, or choose another event without treating the change as failure?</li>
</ul>
<p>WHO advises that some activity is better than none and that people starting from lower levels should build gradually. That public-health principle does not mean every person should pursue a 50K event. The <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K plan</a> offers a gentler starting framework when the current base is below what this challenge demands.</p>

<h2>Calculate a flexible planning average</h2>
<p>Use this planning equation:</p>
<blockquote><strong>Remaining approved kilometres ÷ usable weeks = average kilometres to plan per usable week.</strong></blockquote>
<p>At the start, a runner with zero approved distance has 50K remaining. After 18K is approved, the official remainder is 32K. Pending submissions do not reduce that official remainder until approval.</p>
<p>The weekly result is an arithmetic average, not a medical recommendation, training threshold, or demand to hit the same number every week. Your distribution can vary with recovery, weather, route access, and event rules. A qualified coach or health professional may advise a different goal or no event participation.</p>

<h2>Illustrative four-, six-, and eight-week frameworks</h2>
<h3>Four usable weeks</h3>
<p>Fifty kilometres divided by four equals <strong>12.5K per week</strong>. This is the highest average of the three examples and leaves limited room for disruption. It may be unsuitable for someone whose recent consistent activity is much lower. The runner could distribute the arithmetic total across several eligible sessions, but the article does not prescribe their number, distance, or intensity.</p>
<h3>Six usable weeks</h3>
<p>Fifty divided by six is approximately <strong>8.33K per week</strong>. Because hundredths of a kilometre are not a useful promise, track the actual approved total and recalculate. Six weeks at 8K gives 48K, so the remaining 2K must be planned within an eligible activity that also meets the event's minimum-distance rule.</p>
<h3>Eight usable weeks</h3>
<p>Fifty divided by eight equals <strong>6.25K per week</strong>. A longer window can provide more scheduling flexibility, but it does not guarantee recovery, safety, or completion. A runner might choose lighter and heavier weeks based on existing ability and circumstances while preserving the 50K total.</p>
<p>None of these examples is a universal schedule. A four-week plan is not “advanced,” an eight-week plan is not automatically safe, and equal weekly distance is not required. If the average conflicts with current capacity, recovery, or safe conditions, choose a longer event window, a lower category, or another format.</p>

<h2>Build a weekly plan around recovery and ordinary life</h2>
<p>Start with the days you can genuinely protect for activity, then place recovery between demanding sessions. NHS Couch to 5K uses structured sessions with rest days as a beginner example; it is not a 50K plan, but it illustrates why recovery belongs on the calendar rather than being whatever time remains.</p>
<p>Use comfortable effort for most challenge activity unless qualified guidance and an existing training plan say otherwise. CDC's talk test provides a simple relative-intensity check: at moderate effort, a person can generally talk but not sing. Running pace is individual, and heat, hills, fatigue, sleep, and humidity can change the effort required for the same number. The <a href="/blog/beginners-guide-to-running-pace">pace guide</a> explains this difference.</p>
<p>A useful weekly plan identifies activity opportunities, recovery days, route alternatives, and one check-in point. It does not need to assign an exact pace or force continuous running. If the event allows walking, planned walk breaks can be part of the activity rather than evidence of failure.</p>
<p>Do not make up a missed session by doubling the next one. Recalculate the remaining approved distance across the remaining usable time. If the new average is no longer realistic, change the goal or event rather than turning arithmetic into unsafe pressure.</p>

<h2>Leave a buffer before the final deadline</h2>
<p>A buffer is time, not hidden mileage. Aim to complete the planned activity early enough to review evidence, wait for decisions, correct rejected proof, and respond to weather or device problems. The event's submission deadline remains fixed.</p>
<p>Do not deliberately overtrain just to finish several days early. The correct buffer depends on the event window and your circumstances. Even one or two available correction days can be more useful than submitting every activity in the last hour.</p>
<p>Track two plans: an activity plan and a proof-review plan. The first identifies opportunities to move; the second identifies when to upload, check status, and contact support. A runner who completes 50 physical kilometres but leaves unreadable proof unresolved may not have 50 approved kilometres.</p>

<h2>Understand approved, pending, and rejected distance</h2>
<p>HelloRun progress is scoped to the relevant event registration. It is not an unrestricted account-wide lifetime total.</p>
<ul>
  <li><strong>Approved distance</strong> is official progress. It can affect completion, configured standings, achievements, and the final verified total.</li>
  <li><strong>Pending distance</strong> is potential progress awaiting a decision. Pending is not approved progress and does not officially reduce the remaining distance.</li>
  <li><strong>Rejected distance</strong> does not count. The rejection and available correction path should be reviewed before another submission.</li>
</ul>
<p>Remaining distance is calculated as the target minus approved distance, with a floor of zero. If 53K is approved against a 50K goal, remaining distance is zero and the verified total remains 53K; it is not capped at 50K.</p>
<p>Conditional automatic approval may apply to eligible clean OCR or supported Strava evidence under current rules. It is not guaranteed for every activity. Other cases remain available for organiser or administrator review.</p>

<h2>Five practical progress examples</h2>
<h3>Example 1: steady approved progress</h3>
<p>A runner has approved activities of 5K, 6K, 4K, and 5K. Official progress is 20K, so 30K remains. If five usable weeks remain, the new planning average is 6K per week.</p>
<h3>Example 2: approved plus pending</h3>
<p>The dashboard shows 32K approved and one 6K activity pending. Official remaining distance is 18K, while potential progress would become 38K if the pending activity is approved. The runner does not report 12K remaining as official yet.</p>
<h3>Example 3: rejected evidence</h3>
<p>A 7K activity is rejected because the submitted image does not show the required date and duration. It contributes zero official distance. The runner opens the displayed correction route, retains the original activity information, and does not upload altered duplicate copies to manufacture eligibility.</p>
<h3>Example 4: verified distance beyond the goal</h3>
<p>A runner reaches 48K approved, then receives approval for a separate eligible 5K activity. The official total becomes 53K, completion is true, over-goal distance is 3K, and remaining distance is zero. Recognition still follows event configuration and finalisation rules.</p>
<h3>Example 5: a late start changes the decision</h3>
<p>A runner joins with two usable weeks remaining and no recent consistent base that supports the resulting 25K weekly average. Rather than doubling activity or chasing unsafe weather, the runner asks about a lower category, later event, or another format. Changing the plan is a sound decision, not a failed challenge.</p>

<h2>Record and submit every eligible activity</h2>
<p>Use one separate activity record for each eligible session. A weekly or monthly dashboard total can hide dates, activity types, component distances, and duplicates, making it difficult to establish which activity belongs inside the event window.</p>
<p>For a screenshot path, preserve a readable final activity summary with the fields requested by the live form. HelloRun currently supports JPEG, PNG, or WebP activity screenshots subject to the submission form's current size limit. OCR can assist with field entry, but it is fallible and does not prove accuracy. Confirm every extracted value before submission.</p>
<p>For a supported connected Strava path, use an activity from the connected account and confirm date, type, distance, and time. Strava explains that moving time and elapsed time can differ and that GPS processing can produce differences between services or devices. Do not edit fields merely to force agreement.</p>
<p>Exact screenshot and connected-activity duplicate controls can block reuse. Preserve original evidence and use <a href="/blog/how-to-submit-run-proof-correctly-hellorun">the proof-submission walkthrough</a> for the procedural flow. Use <a href="/blog/what-counts-as-valid-run-proof">the valid-proof guide</a> for evidence quality and privacy.</p>

<h2>Prepare the tracker and protect private information</h2>
<p>Before the first qualifying activity, test the phone, watch, treadmill, or app with a short non-event session. Confirm battery, permissions, units, activity type, screen locking, offline behavior, and how the final summary appears. The <a href="/blog/best-apps-to-track-your-virtual-run">running-app comparison</a> documents supported fields and device requirements without ranking universal accuracy.</p>
<p>Do not rely on a single device if a safe backup is practical, but do not submit two competing records for one activity without reading the rules. When distances conflict, preserve originals and ask which source the event treats as authoritative.</p>
<p>Review maps for home, workplace, school, and repeated routine locations. Strava notes that third-party integrations may receive information differently from what appears hidden in Strava itself. Share only what the event needs, and check the <a href="/privacy">HelloRun Privacy Policy</a> before connecting an account or uploading proof.</p>

<h2>Plan routes, weather, and accessible alternatives</h2>
<p>Build a set of routes rather than one route. Include a short loop with shade and exits, a well-lit option, an accessible surface, and an event-permitted indoor backup. Check current local traffic rules, weather services, air-quality information where relevant, venue access, and emergency contacts.</p>
<p>Use the <a href="/blog/how-to-run-safely-during-hot-and-humid-weather">hot and humid weather guide</a>, <a href="/blog/running-during-rainy-season-philippines">rainy-season guide</a>, and <a href="/blog/running-safety-tips-early-morning-night-runs">low-light safety guide</a> for specialist decisions. A challenge deadline never justifies thunderstorms, flooding, extreme heat, unsafe air, poor visibility, or a route that is otherwise unsuitable.</p>
<p>Treadmill treatment is event-dependent. If permitted, record the activity using the requested evidence and follow the device's instructions. A treadmill display and a watch can disagree; do not combine their distances or claim that one is universally correct.</p>
<p>Accessibility can involve walking, wheeling where an event permits an equivalent activity, a guide, shorter loops, support persons, indoor facilities, or schedule changes. Confirm details before paying or starting, and use <a href="/contact">HelloRun support</a> or the organiser's published contact path for event-specific questions.</p>

<h2>Handle illness, pain, work, and travel without catch-up pressure</h2>
<p>Do not use this article to diagnose pain or illness. Severe, unexplained, worsening, or otherwise concerning symptoms require appropriate qualified or emergency help. Resting, withdrawing, or changing category can be the correct decision.</p>
<p>When work or family removes an activity day, recalculate. When travel changes the timezone, route, privacy, or tracker connectivity, confirm that the new activity remains eligible. When illness interrupts several days, do not assume the original average remains appropriate.</p>
<p>Keep a written fallback hierarchy: safer time, safer route, allowed indoor option, shorter eligible activity, later event, or withdrawal. This prevents the leaderboard or deadline from becoming the only factor considered during a difficult decision.</p>

<h2>How HelloRun leaderboards and recognition work</h2>
<p>A configured accumulated leaderboard ranks registrations by highest approved accumulated distance, not by fastest pace or shortest total elapsed time. Pending distance is excluded. Equal totals currently receive sequential ranks through deterministic review and submission ordering rather than shared ties. Read <a href="/blog/how-leaderboards-work-virtual-running-events">the leaderboard guide</a> before comparing performances recorded on different routes and devices.</p>
<p>A configured completion badge may become available when approved progress reaches the selected goal. Not every event offers a badge. Reaching 50K does not instantly finalise an accumulated certificate.</p>
<p>Certificate finalisation waits until after the configured final submission deadline—or the applicable event-end fallback—and until every submitted accumulated activity for the event has been reviewed. One unresolved activity can delay event-wide finalisation. A final snapshot can contain the selected 50K goal, final approved distance, and approved activity count. Availability still depends on event configuration and successful generation.</p>
<p>HelloRun does not directly process an external payment transfer. Paid registration can require separate payment-receipt review, which is not activity-proof review. Registration, payment, evidence, approval, leaderboard, certificate, and reward rules remain event-dependent.</p>

<h2>50K planning worksheet</h2>
<ul>
  <li>Record the selected event and registration category.</li>
  <li>Confirm that the selected target is 50K rather than another value.</li>
  <li>Record the activity window, final submission deadline, and timezone.</li>
  <li>List accepted activities and any minimum distance per activity.</li>
  <li>Record approved distance and keep pending distance in a separate line.</li>
  <li>Calculate official remaining distance as max(0, 50 − approved).</li>
  <li>Count usable weeks after known constraints and recovery needs.</li>
  <li>Calculate the planning average as remaining distance ÷ usable weeks.</li>
  <li>List primary routes, an allowed indoor backup, and early exits.</li>
  <li>Choose proof-review days and a correction buffer before the deadline.</li>
  <li>Write down the conditions that mean stepping down, pausing, or stopping.</li>
</ul>

<h2>Before-start checklist</h2>
<ul>
  <li>Read the structured event rules, dates, timezone, fees, refund terms, proof, support, standings, and recognition.</li>
  <li>Confirm the selected registration resolves to a 50K accumulated goal.</li>
  <li>Review recent consistent activity and obtain qualified guidance where circumstances call for it.</li>
  <li>Calculate the planning average from usable time without turning it into mandatory weekly mileage.</li>
  <li>Test the tracker, evidence path, privacy settings, and units.</li>
  <li>Plan safe routes, recovery, weather alternatives, and early exits.</li>
  <li>Leave enough calendar room for review and corrections.</li>
</ul>

<h2>Weekly review checklist</h2>
<ul>
  <li>Record approved, pending, and rejected distance in separate columns.</li>
  <li>Recalculate remaining approved distance and the planning average.</li>
  <li>Check whether recovery, sleep, pain, illness, work, or weather changes the next activity.</li>
  <li>Confirm submitted evidence has the correct date, type, distance, units, and duration.</li>
  <li>Resolve rejected evidence through the displayed correction route.</li>
  <li>Do not double the next activity merely because the previous plan changed.</li>
</ul>

<h2>Proof-submission checklist</h2>
<ul>
  <li>Select the correct activity date and 50K event registration.</li>
  <li>Submit the individual activity rather than an aggregate dashboard total.</li>
  <li>Use the accepted screenshot or supported connected-activity path.</li>
  <li>Confirm activity type, kilometres, duration, location, and other required fields.</li>
  <li>Review OCR-assisted fields against the original image.</li>
  <li>Check map, profile, health, notification, and home-location privacy.</li>
  <li>Wait for the recorded status instead of repeating clicks or uploading duplicates.</li>
</ul>

<h2>Final-week checklist</h2>
<ul>
  <li>Use approved distance—not a personal spreadsheet total—to calculate the official remainder.</li>
  <li>Review pending and rejected activities before planning more distance.</li>
  <li>Check the exact submission boundary and current weather or route restrictions.</li>
  <li>Do not chase missing distance through unsafe conditions or an unsuitable catch-up session.</li>
  <li>Submit remaining eligible evidence early enough for available corrections.</li>
  <li>After the deadline, monitor final review, standings, and configured recognition without expecting instant finalisation.</li>
</ul>

<h2>Troubleshooting a 50K challenge</h2>
<h3>The displayed total is lower than my app total</h3>
<p>Check registration scope and review status. Your app may include activities outside the event window, rejected records, duplicates, or pending distance. Compare individual approved activities rather than a lifetime or monthly total.</p>
<h3>A week was missed</h3>
<p>Recalculate remaining approved distance across remaining usable weeks. Do not automatically double the next activity. If the revised average does not fit, change the goal or event.</p>
<h3>GPS stopped during an activity</h3>
<p>Move to safety before troubleshooting. Preserve the original partial record and follow the event's support or correction instructions. Do not invent the missing route or distance.</p>
<h3>A screenshot was rejected</h3>
<p>Open the displayed reason and correction route. Replace unclear proof or correct eligible metadata while preserving the original activity. Ordinary resubmission is generally for rejected records.</p>
<h3>The deadline is close and weather is unsafe</h3>
<p>Use an allowed safer alternative or contact support. The deadline does not make an outdoor activity safe and does not create an automatic extension.</p>

<h2>Concise organiser guidance</h2>
<p>Organisers should publish the 50K goal, dates and timezone, minimum activity, accepted run types, treadmill and walking rules, evidence paths, correction policy, ranking basis, privacy handling, recognition, and support route before registration. Review comparable evidence consistently and do not imply that a waiver removes organiser responsibility.</p>
<p>Provide a realistic review buffer and a failure plan for unsafe weather, app outages, deadline surges, ambiguous evidence, and delayed recognition. The <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">organiser playbook</a> contains the complete operational checklist.</p>

<h2>Frequently asked questions</h2>
<h3>Must I run all 50K continuously?</h3>
<p>No, not in an accumulated-distance event. Separate eligible approved activities contribute to the selected registration goal. A continuous 50K is a different format.</p>
<h3>Can I walk the challenge?</h3>
<p>Only if the event accepts walking or the selected activity type. General fitness guidance does not override event rules.</p>
<h3>Can treadmill activities count?</h3>
<p>Only when the event permits them and the available submission flow accepts the required evidence.</p>
<h3>How many activities should I submit?</h3>
<p>There is no universal number. It depends on current ability, recovery, event minimums or limits, and the usable window. Each submission must represent a distinct eligible activity.</p>
<h3>Does pending distance mean I have completed 50K?</h3>
<p>No. Pending is not approved progress. Only approved distance can establish official completion.</p>
<h3>What happens if I exceed 50K?</h3>
<p>Eligible approved distance can continue beyond the goal until the event's submission boundary. The verified total is not capped at 50K, although recognition remains event-dependent.</p>
<h3>Does the leaderboard reward speed?</h3>
<p>A configured accumulated leaderboard ranks highest approved accumulated distance, not fastest pace. Other events may configure different formats, so check the live leaderboard explanation.</p>
<h3>Will I receive a certificate immediately at 50K?</h3>
<p>No. A configured accumulated certificate waits for the submission boundary and clearance of the event-wide submitted activity queue.</p>
<h3>Can the same activities count toward another event?</h3>
<p>Only when each event and the available platform flow permit it. Progress remains separate by registration and does not become one account-wide challenge total.</p>
<h3>Is changing to a lower goal failure?</h3>
<p>No. Matching an event to current ability, time, recovery, accessibility, and conditions is responsible planning. Browse <a href="/events">current events</a>, review <a href="/how-it-works">How HelloRun Works</a>, or compare <a href="/blog/virtual-run-vs-traditional-race-which-one-should-you-join">virtual and onsite formats</a>.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity">World Health Organization: Physical Activity</a></li>
  <li><a href="https://www.cdc.gov/physicalactivity/basics/measuring/index.html">US Centers for Disease Control and Prevention: Measuring Physical Activity Intensity</a></li>
  <li><a href="https://worldathletics.org/competitions/world-athletics-road-running-championships/copenhagen26/races/free-training-programs">World Athletics: Training Programmes</a></li>
  <li><a href="https://worldathletics.org/personal-best/performance/how-run-best-virtual-race-advice">World Athletics: Virtual Race Preparation</a></li>
  <li><a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/">NHS: Couch to 5K</a> — a gradual beginner-structure example, not a 50K plan.</li>
  <li><a href="https://www.rrca.org/covid-19-information-and-resources/">Road Runners Club of America: Virtual Event Definition and Context</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401736-group-challenges">Strava Support: Group Challenges</a> — an external cumulative-goal example, not a HelloRun rulebook.</li>
  <li><a href="https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations">Strava Support: Moving and Elapsed Time</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401776-strava-s-privacy-controls-faq">Strava Support: Privacy Controls</a></li>
  <li><a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/">Information Commissioner's Office: Data Minimisation</a></li>
  <li><a href="/faq">HelloRun FAQ</a></li>
</ul>
<p>Before every qualifying activity, recheck the live event page, current conditions, and submission form. A useful plan remains adjustable until the event closes.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'A 50K challenge in one minute',
  'How this guide was prepared',
  'Accumulated 50K is not one continuous ultramarathon',
  'Read the complete event calendar',
  'Check every rule before planning kilometres',
  'Use a non-scored readiness review',
  'Calculate a flexible planning average',
  'Illustrative four-, six-, and eight-week frameworks',
  'Build a weekly plan around recovery and ordinary life',
  'Leave a buffer before the final deadline',
  'Understand approved, pending, and rejected distance',
  'Five practical progress examples',
  'Record and submit every eligible activity',
  'Prepare the tracker and protect private information',
  'Plan routes, weather, and accessible alternatives',
  'Handle illness, pain, work, and travel without catch-up pressure',
  'How HelloRun leaderboards and recognition work',
  '50K planning worksheet',
  'Before-start checklist',
  'Weekly review checklist',
  'Proof-submission checklist',
  'Final-week checklist',
  'Troubleshooting a 50K challenge',
  'Concise organiser guidance',
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
  '/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge',
  '/blog/beginner-5k-training-plan-new-runners',
  '/blog/beginners-guide-to-running-pace',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/how-leaderboards-work-virtual-running-events',
  '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
  '/blog/running-during-rainy-season-philippines',
  '/blog/how-to-run-safely-during-hot-and-humid-weather',
  '/blog/running-safety-tips-early-morning-night-runs',
  'who.int/news-room/fact-sheets/detail/physical-activity',
  'cdc.gov/physicalactivity/basics/measuring',
  'worldathletics.org/competitions/world-athletics-road-running-championships',
  'worldathletics.org/personal-best/performance/how-run-best-virtual-race-advice',
  'nhs.uk/better-health/get-active/get-running-with-couch-to-5k',
  'rrca.org/covid-19-information-and-resources',
  'support.strava.com/en-us/articles/15401736-group-challenges',
  'support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations',
  'support.strava.com/en-us/articles/15401776-strava-s-privacy-controls-faq',
  'ico.org.uk/for-organisations'
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
  if (/<h[12]>How to Complete a 50K Accumulated-Distance Challenge<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/guarantee(?:s|d)? (?:completion|safety|injury prevention)|prevents? (?:all )?injur/i.test(text)) errors.push('article must not guarantee completion or injury prevention');
  if (/every runner (?:must|should)|(?:must|should|required to) (?:follow|complete) mandatory weekly mileage|increase (?:distance|mileage) by 10%|the 10% rule/i.test(text)) errors.push('article must not prescribe a universal schedule');
  if (/diagnose yourself|take (?:this |a )?medicine|stop prescribed medicine|lose weight by|exactly \d+\s*(?:ml|litres?|liters?) per hour/i.test(text)) errors.push('article must not provide medical, weight-loss, or hydration prescriptions');
  if (/every event accepts|all events accept|walking is always accepted|treadmills? (?:are|is) always accepted/i.test(text)) errors.push('article must not claim universal activity acceptance');
  if (/pending distance (?:counts|is counted) (?:as )?(?:official|completion)|pending distance completes/i.test(text)) errors.push('article must not count pending distance officially');
  if (/approved (?:distance|progress) (?:is|are) capped at 50|totals? (?:is|are) capped at 50/i.test(text)) errors.push('article must not cap approved progress at the goal');
  if (/accumulated leaderboard ranks? (?:by )?(?:fastest|speed)|fastest-time accumulated/i.test(text)) errors.push('article must not rank accumulated results by speed');
  if (/certificate (?:is|will be) (?:instant|immediate)|immediate certificate|automatically (?:receive|receives?) a certificate/i.test(text)) errors.push('article must not promise immediate or automatic recognition');
  if (/account-wide (?:progress|total)|all registrations (?:share|combine) progress/i.test(text)) errors.push('article must not aggregate progress across registrations');
  if (/perfect OCR|every submission is automatically approved|HelloRun (?:directly )?(?:processes|handles) (?:your |event )?(?:payment|funds)/i.test(text)) errors.push('article must not claim unsupported HelloRun behavior');
  if (!/reviewed in July 2026 using documented HelloRun/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/12\.5K per week/i.test(text) || !/8\.33K per week/i.test(text) || !/6\.25K per week/i.test(text)) errors.push('article must include accurate 4-, 6-, and 8-week arithmetic');
  if (!/Pending is not approved progress/i.test(text)) errors.push('article must distinguish pending progress');
  if (!/does not directly process an external payment transfer/i.test(text)) errors.push('article must accurately describe external payments');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid 50K challenge payload: ${errors.join('; ')}`);
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
