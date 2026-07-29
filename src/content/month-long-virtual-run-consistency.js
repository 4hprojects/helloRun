'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-stay-consistent-during-a-month-long-virtual-run';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Stay Consistent During a Month-Long Virtual Run',
  excerpt: 'Build a sustainable month-long virtual-run routine with practical scheduling, recovery, motivation, tracking, missed-session, and proof-review strategies.',
  category: 'Training',
  tags: Object.freeze([
    'running consistency',
    'monthly challenge',
    'virtual run',
    'running routine',
    'activity planning',
    'recovery days',
    'motivation tips',
    'progress tracking'
  ]),
  seoTitle: 'How to Stay Consistent During a Month-Long Virtual Run',
  seoDescription: 'Stay consistent during a month-long virtual run with flexible scheduling, recovery, progress check-ins, tracking, weather backups, and proof-review guidance.',
  coverImageAlt: 'Runner reviewing a flexible month-long virtual-run calendar beside shoes, a phone, water, and a safe tree-lined route after light rain'
});

const RAW_CONTENT_HTML = `
<p>A month-long virtual run creates enough flexibility to fit activity around ordinary life, but that flexibility can also make the next session easy to postpone. Consistency does not mean running every day, never changing a plan, or producing identical weekly totals. It means returning to an appropriate activity pattern while respecting the event rules, recovery, health, weather, accessibility, and evidence requirements.</p>
<p>A sustainable month is built before motivation becomes the only plan. Decide what the event requires, place realistic activity opportunities on the calendar, protect recovery, reduce avoidable friction, and review approved progress while there is still time to adjust. Missing one session is information, not proof that the month has failed.</p>
<blockquote><strong>The consistency principle:</strong> create a plan that is easy to resume. A flexible routine with recovery and backup options is more useful than a perfect-looking streak that collapses after one disruption.</blockquote>

<h2>Month-long consistency in one minute</h2>
<ol>
  <li><strong>Read the event mechanics.</strong> Confirm whether the goal is one activity, several activities, an accumulated target, or completion-only participation.</li>
  <li><strong>Define success in event terms.</strong> Record the required dates, accepted activities, minimum distance, proof, review, and deadline rather than inventing a daily streak.</li>
  <li><strong>Use a flexible weekly rhythm.</strong> Schedule primary activity opportunities, recovery, and at least one backup rather than assigning all 30 or 31 days.</li>
  <li><strong>Reduce preparation friction.</strong> Test the tracker, choose routes, prepare ordinary equipment, and know the indoor or rescheduling option before conditions change.</li>
  <li><strong>Use comfortable effort.</strong> Let breathing and the talk test guide easy activity instead of forcing a normal pace through fatigue, hills, heat, or humidity.</li>
  <li><strong>Review once a week.</strong> Compare the plan with actual approved, pending, and rejected progress; then adjust the next week.</li>
  <li><strong>Resume after interruption.</strong> Do not double sessions, punish yourself, or chase an unsafe deadline because one activity was missed.</li>
  <li><strong>Close early enough to correct proof.</strong> Leave time for review, rejected-evidence corrections, device problems, and weather changes.</li>
</ol>
<p>For the complete registration-to-result journey, start with <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">What Is a Virtual Run?</a> and <a href="/blog/how-to-prepare-for-your-first-virtual-run">the first virtual-run preparation guide</a>.</p>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in July 2026 using documented guidance from the World Health Organization, US Centers for Disease Control and Prevention, World Athletics, NHS, Road Runners Club of America, and Strava, together with current HelloRun registration, accumulated-progress, proof-review, leaderboard, and certificate behavior.</p>
<p>It is general researched guidance, not personal coaching, medical advice, a diagnosis, a mental-health treatment, or a guarantee that a routine will become a habit. It does not independently test a runner, device, route, app, motivational technique, or event. Individual event rules, local authorities, current weather services, and qualified personal guidance remain authoritative.</p>
<p>Consistency strategies should be adapted for disability, pregnancy, illness, chronic conditions, pain, medicines, caring responsibilities, work, access, and local conditions. A person who needs individualized advice should obtain it from an appropriately qualified professional rather than using a general month plan as clearance.</p>

<h2>Define consistency without demanding perfection</h2>
<p>Consistency is repeated participation at a level that fits the runner and event. It can include running, permitted walking, rest, route changes, rescheduling, and an allowed indoor activity. It does not require activity every day.</p>
<p>A daily streak is one possible personal structure, but it is not a universal measure of commitment and may conflict with recovery or event rules. Do not add a streak requirement that the organiser did not set. A runner who completes three suitable sessions, recovers, and returns the following week can be more consistent than someone who forces short daily runs until fatigue or circumstances end the plan.</p>
<p>Separate process from outcome. Process goals describe controllable actions such as preparing the tracker, protecting two activity windows, or checking proof status. Outcome goals describe a target such as 25K approved or one eligible 5K. Both can be useful, but missing an outcome should lead to review—not shame or unsafe catch-up activity.</p>

<h2>Understand the event before building a routine</h2>
<p>A “month-long virtual run” can mean different things. One event may allow a single qualifying activity on any date in the window. Another may combine several approved activities toward an accumulated goal. A third may publish weekly tasks or require one particular activity type.</p>
<p>Write down the registration close, activity start, activity end, final submission deadline, event timezone, accepted activities, minimum distance, evidence path, correction policy, leaderboard basis, and recognition settings. Structured event details and the live form should take priority over an old poster or copied social caption.</p>
<p>For an accumulated challenge, progress belongs to the registration. Approved distance counts officially, pending distance remains potential, and rejected distance contributes nothing. Read <a href="/blog/how-accumulated-distance-challenges-work">the accumulated-distance mechanics guide</a> before using a fitness-app monthly total as event progress.</p>
<p>If the distance or format does not fit your current activity and calendar, choose another option using <a href="/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge">the event-distance decision guide</a>. Consistency starts with a suitable commitment.</p>

<h2>Choose a reason that survives a low-motivation day</h2>
<p>Write one practical reason for joining. It might be preparing for a first event, sharing a club activity, rebuilding a routine, completing an accumulated goal, or enjoying flexible movement. Avoid making the reason depend entirely on a leaderboard position, weight change, social approval, or never missing a day.</p>
<p>Turn that reason into a decision rule. For example: “I will protect two suitable activity opportunities each week and use the allowed backup when weather closes my normal route.” This is clearer than “I will stay motivated all month.”</p>
<p>Motivation can rise and fall. CDC recommends making activity part of a regular schedule, choosing accessible activities, and seeking social support when helpful. These strategies reduce reliance on a particular mood; they do not guarantee adherence.</p>

<h2>Build a flexible four-part month</h2>
<p>A calendar month does not always contain exactly four weeks, and event dates may start midweek. Use four planning phases rather than treating every seven-day block as identical.</p>
<h3>Phase 1: establish the routine</h3>
<p>Confirm the rules, test the tracker, complete an appropriate first activity, and check how evidence appears. Keep the opening manageable enough to learn from it. Starting aggressively does not create extra commitment.</p>
<h3>Phase 2: repeat and adjust</h3>
<p>Repeat what worked while changing one friction point. Move a session if traffic was difficult, choose a shaded loop if heat increased effort, or prepare the proof workflow sooner. Do not change distance, pace, route, and equipment all at once unless safety requires it.</p>
<h3>Phase 3: expect a disruption</h3>
<p>Work deadlines, family needs, rain, heat, travel, low energy, or a device problem can appear. Use the backup plan and preserve recovery. This phase tests resumability, not toughness.</p>
<h3>Phase 4: close the event deliberately</h3>
<p>Use approved progress as the official reference, resolve pending or rejected evidence, and avoid leaving required activity to the final hours. Recognition and standings may remain provisional while reviews continue.</p>
<p>These phases are planning prompts, not a training prescription. A runner may need more recovery, fewer activities, a lower goal, or no further activity during illness or unsafe conditions.</p>

<h2>Schedule opportunities instead of promises</h2>
<p>Start with the week you actually have. Place primary activity windows around work, care, transport, sleep, daylight, route access, and recovery. Then identify one backup window or allowed alternative. A plan that assumes every evening remains free is fragile.</p>
<p>Use calendar language that permits decisions: “easy activity opportunity” is more adaptable than “must run 8K.” Add the route, expected effort, tracker, and backup, but let current conditions determine whether the activity proceeds.</p>
<p>CDC suggests writing activity on the calendar and choosing times when energy and access are more favorable. It also recommends indoor alternatives for weather barriers. The specific indoor activity must still be accepted by the virtual event if it is intended as event progress.</p>
<p>Protect preparation time. A 30-minute activity can require travel, changing, a GPS lock, cooling down, and proof review. Ignoring those steps makes the routine harder to repeat.</p>

<h2>Use a minimum viable action carefully</h2>
<p>On a difficult but otherwise suitable day, the useful next action may be preparing equipment, taking an allowed short walk, testing the app, or moving the activity to a better time. The smallest action does not automatically qualify for the event.</p>
<p>If the event has a minimum activity distance, a ten-minute walk or short tracker test may support the routine without counting toward progress. Keep personal process activity separate from submitted evidence. Do not upload an ineligible activity simply to preserve a visible streak.</p>
<p>A minimum viable action is not permission to ignore pain, illness, an official warning, or severe fatigue. Rest and qualified care can be the appropriate action.</p>

<h2>Keep easy activity genuinely easy</h2>
<p>World Athletics emphasizes adapting plans from observation rather than copying another runner. CDC's talk test offers a simple intensity check: during moderate activity, a person can generally talk but not sing. For easy running, comfortable sentences are a useful signal that the effort has not drifted too high.</p>
<p>Pace changes with heat, humidity, hills, sleep, stress, surface, and recovery. Do not force the number displayed on a watch. The <a href="/blog/beginners-guide-to-running-pace">beginner pace guide</a> explains pace, moving time, elapsed time, and relative effort.</p>
<p>Walking can support a sustainable routine, but event acceptance is rule-dependent. A planned walk break can reduce effort; it does not make unsafe weather or concerning symptoms harmless.</p>

<h2>Put recovery on the calendar</h2>
<p>Recovery is part of consistency, not an interruption to it. NHS Couch to 5K uses rest days between its beginner sessions; that programme is not a universal month-long virtual-run plan, but it demonstrates that structured activity can include deliberate non-running days.</p>
<p>Keep ordinary sleep, food, fluids, and time away from repeated impact in view. This article does not prescribe exact hydration, supplements, calories, or sleep hours. Needs vary, and some health conditions or medicines require qualified individual advice.</p>
<p>Do not compensate for a missed session by doubling the next workout or removing planned recovery. Recalculate the remaining event requirement across the usable time. If it no longer fits, change the goal or event.</p>

<h2>Reduce friction before it blocks the session</h2>
<ul>
  <li>Keep ordinary, tested clothing and equipment accessible.</li>
  <li>Charge the phone or watch before the planned window.</li>
  <li>Save safe primary and backup routes.</li>
  <li>Check the event date, activity type, and evidence requirement before leaving.</li>
  <li>Choose a realistic departure trigger, such as after breakfast or after work, rather than waiting for enthusiasm.</li>
  <li>Prepare privacy settings and map visibility in advance.</li>
  <li>Know which person or support route to contact when eligibility is unclear.</li>
</ul>
<p>Expensive equipment is not required for consistency, and no shoe, watch, app, or clothing item guarantees comfort, accuracy, or injury prevention. Use <a href="/blog/best-apps-to-track-your-virtual-run">the app comparison</a> to match documented features to the event rather than buying around a universal ranking.</p>

<h2>Use social support without creating pressure</h2>
<p>A friend, running group, family member, or colleague can support check-ins, route safety, and shared activity. Agree on the type of support: a reminder, an easy session, a post-run message, or help choosing a backup.</p>
<p>Support should not become public shaming, forced disclosure, pace comparison, or pressure to exercise when unwell. A runner does not owe a public explanation for rest, disability, pregnancy, health information, or a changed goal.</p>
<p>If leaderboards reduce motivation or encourage unsuitable decisions, focus on the event's completion rules and personal process. A HelloRun accumulated leaderboard uses approved distance, not personal worth or health.</p>

<h2>Track the process without turning it into surveillance</h2>
<p>A simple weekly note can record planned opportunities, completed activities, recovery, approved evidence, pending evidence, and one adjustment. Avoid collecting more health or location information than the task needs.</p>
<p>Strava privacy controls can limit some public details and map visibility, but connected third-party services may receive data differently. Review both the source app and HelloRun permissions. Do not expose a home address, regular start point, health metric, or identity document in a screenshot unless the event legitimately requires that information.</p>
<p>Use approved progress as the event truth. A private spreadsheet can help planning, but it does not override review. Pending is not approved progress, and a personal monthly total can include dates or activities outside the event.</p>

<h2>Use one weekly review instead of daily judgment</h2>
<p>Choose a consistent review time when possible. Ask:</p>
<ul>
  <li>Which planned opportunities happened, changed, or were skipped?</li>
  <li>What made activity easier or harder?</li>
  <li>What is officially approved, pending, or rejected?</li>
  <li>Does the next week still fit recovery and ordinary responsibilities?</li>
  <li>Which weather, route, travel, or device backup is needed?</li>
  <li>Is the goal still appropriate?</li>
</ul>
<p>Change one or two useful variables rather than rewriting the entire month after a difficult week. If the plan repeatedly fails for the same reason, redesign the environment or commitment instead of relying on stronger self-criticism.</p>

<h2>What to do after a missed session</h2>
<ol>
  <li><strong>Remove the moral label.</strong> Record what happened without calling the month ruined.</li>
  <li><strong>Check the reason.</strong> Weather, fatigue, illness, pain, work, access, or unrealistic timing require different responses.</li>
  <li><strong>Protect the next safe opportunity.</strong> Resume with an appropriate activity rather than a punishment session.</li>
  <li><strong>Recalculate event progress.</strong> For accumulated goals, use approved distance and remaining usable time.</li>
  <li><strong>Change the goal when needed.</strong> A lower category, later event, or completion-only objective can be the responsible decision.</li>
</ol>
<p>Do not “make up” a missed day by running twice, sprinting an easy session, removing recovery, or using unsafe conditions. The <a href="/blog/how-to-complete-a-50k-accumulated-distance-challenge">50K planning guide</a> provides a detailed remaining-distance calculation for longer accumulated goals.</p>

<h2>Plan for work, family, and travel</h2>
<p>Identify predictable high-demand days before the month begins. Move activity opportunities away from them when practical. Keep one short, safe route near home or work and one no-travel alternative that the event accepts.</p>
<p>During travel, check timezone, route access, traffic direction, local laws, weather, privacy, and tracker connectivity. An airport walk or hotel treadmill session does not automatically qualify. Confirm activity type and evidence rules first.</p>
<p>Caring responsibilities can change without warning. Avoid plans that require another person to absorb all disruption. A flexible event should remain optional rather than becoming a source of conflict or guilt.</p>

<h2>Use weather and route backups</h2>
<p>Check current official conditions close to departure. A calendar entry is not clearance to run through heat warnings, thunderstorms, flooding, unsafe air, poor visibility, or a dangerous surface.</p>
<p>Use <a href="/blog/how-to-run-safely-during-hot-and-humid-weather">the hot and humid weather guide</a>, <a href="/blog/running-during-rainy-season-philippines">the rainy-season guide</a>, and <a href="/blog/running-safety-tips-early-morning-night-runs">the low-light safety guide</a> for specialist decisions. A suitable backup may be a cooler time, safer route, allowed treadmill, accumulated format, or rescheduled activity.</p>
<p>Do not interpret a virtual deadline as a reason to test flood depth, continue after thunder, or force a hot exposed route. Contact the organiser before the deadline if the event options are unclear.</p>

<h2>Respond to pain, illness, and warning signs</h2>
<p>This article cannot determine the cause of pain, fatigue, dizziness, breathlessness, or another symptom. Stop for severe, unexplained, worsening, or otherwise concerning symptoms and seek appropriate qualified or emergency help using local services.</p>
<p>Do not exercise through fever or change prescribed medicine to maintain a streak without speaking to the appropriate professional. Pregnancy, chronic conditions, disability, recent illness, previous injury, and medicines can change what guidance is suitable.</p>
<p>Withdrawing, resting, or changing the event is not a consistency failure. Consistency is valuable only within safe and appropriate participation.</p>

<h2>Keep tracking and proof manageable</h2>
<p>Test the selected phone, watch, treadmill, or app before the event. Confirm battery, permissions, units, activity type, offline behavior, screen lock, and final summary. Preserve the original activity instead of editing values to fit a target.</p>
<p>HelloRun currently supports activity screenshots and supported connected Strava evidence according to the live form and event rules. OCR can assist field entry but is fallible. The runner remains responsible for confirming the date, distance, duration, activity type, and other required details.</p>
<p>Submit individual activities for accumulated events rather than a weekly dashboard total. Exact screenshot and connected-activity duplicate controls can block reuse. Use <a href="/blog/what-counts-as-valid-run-proof">the valid-proof guide</a> and <a href="/blog/how-to-submit-run-proof-correctly-hellorun">the submission walkthrough</a>.</p>

<h2>Understand review, standings, and recognition</h2>
<p>A submitted activity can remain pending, become approved, or be rejected. Pending evidence does not count as official progress or rank. Conditional automatic approval may apply to eligible clean OCR or supported Strava evidence; it is not universal. Other cases remain available for organiser or administrator review.</p>
<p>A configured race-result leaderboard and an accumulated leaderboard use different ranking bases. Accumulated standings rank approved distance, not speed. Read <a href="/blog/how-leaderboards-work-virtual-running-events">the leaderboard guide</a> before comparing results recorded on different routes, devices, or conditions.</p>
<p>Badges and certificates are configured features, not automatic entitlements. Accumulated certificates wait until the submission boundary and clearance of the event-wide pending queue. HelloRun does not directly process an external payment transfer, and payment-receipt review remains separate from activity-proof review.</p>

<h2>Five practical month-long scenarios</h2>
<h3>Scenario 1: a steady accumulated goal</h3>
<p>A runner protects two easy activity opportunities each week and one backup. Approved distance is reviewed weekly. When one activity stays pending, the runner keeps it separate instead of claiming the potential total as completion.</p>
<h3>Scenario 2: a beginner walk-runner</h3>
<p>A participant chooses an event that explicitly accepts walking and uses the <a href="/blog/beginner-5k-training-plan-new-runners">beginner walk-run framework</a>. Rest days remain scheduled. The participant does not add daily running merely because the event lasts a month.</p>
<h3>Scenario 3: a demanding work week</h3>
<p>Two planned evenings disappear. The runner uses one weekend opportunity at comfortable effort, then recalculates. There is no doubled session and no attempt to remove the next recovery day.</p>
<h3>Scenario 4: travel changes the route</h3>
<p>A runner checks the event's treadmill rules before departure, tests the hotel equipment, protects location privacy, and submits the requested evidence. If treadmill activity is not accepted, the runner reschedules rather than inventing outdoor distance.</p>
<h3>Scenario 5: unsafe weather near the deadline</h3>
<p>Thunderstorms affect the final planned outdoor day. The participant uses an allowed indoor option or contacts support. The streak, leaderboard, and deadline do not outweigh current safety guidance.</p>

<h2>Before-the-month checklist</h2>
<ul>
  <li>Confirm the event format, category, dates, timezone, accepted activities, and proof path.</li>
  <li>Choose a goal that fits recent consistent activity and available recovery.</li>
  <li>Write one practical reason and one resumable process rule.</li>
  <li>Place primary opportunities, recovery, and backups on the calendar.</li>
  <li>Test the tracker, units, privacy, route, and final activity summary.</li>
  <li>Identify weather, work, travel, access, and health reasons to change the plan.</li>
  <li>Leave time before the final submission boundary for review and correction.</li>
</ul>

<h2>Weekly consistency checklist</h2>
<ul>
  <li>Review the week once rather than judging every day.</li>
  <li>Separate completed activity from approved event progress.</li>
  <li>Keep pending and rejected evidence visible but unofficial.</li>
  <li>Protect recovery and comfortable effort.</li>
  <li>Change one useful friction point.</li>
  <li>Confirm the next safe primary and backup opportunity.</li>
  <li>Reassess whether the event goal still fits.</li>
</ul>

<h2>Final-week checklist</h2>
<ul>
  <li>Use the live dashboard and event rules rather than memory or an app total.</li>
  <li>Resolve rejected proof while corrections remain available.</li>
  <li>Check pending evidence before planning additional distance.</li>
  <li>Confirm the exact deadline and timezone.</li>
  <li>Do not chase remaining activity through unsafe weather, illness, or unsuitable catch-up sessions.</li>
  <li>Monitor final review and configured recognition without expecting instant results.</li>
</ul>

<h2>Troubleshooting consistency problems</h2>
<h3>I keep postponing the same session</h3>
<p>Check whether the time, route, effort, travel, or preparation is unrealistic. Move the opportunity, reduce nonessential friction, or choose another accepted format. Repeating the same reminder is not the only solution.</p>
<h3>I missed an entire week</h3>
<p>Resume from current capacity and recalculate the event requirement. Do not compress the lost week into the next one. A changed goal can be appropriate.</p>
<h3>My motivation dropped after the first week</h3>
<p>Return to the practical reason, reduce comparison, use a scheduled opportunity, and ask for the specific social support you want. Motivation does not need to feel identical all month.</p>
<h3>My app total and HelloRun progress differ</h3>
<p>Compare individual event activities, dates, registration scope, and review states. A monthly app total may include pending, rejected, duplicate, or out-of-window activity.</p>
<h3>Proof was rejected</h3>
<p>Read the displayed reason and use the correction route. Preserve original evidence; do not upload altered copies to manufacture eligibility.</p>

<h2>Concise organiser guidance</h2>
<p>Organisers can support consistency by publishing unambiguous dates, timezone, accepted activities, minimum distance, proof, correction, standings, safety, privacy, and support rules before registration. Avoid promoting daily activity unless the event genuinely requires it and the requirement has been reviewed appropriately.</p>
<p>Plan communication around useful milestones rather than shame or constant notifications. Explain pending progress, weather alternatives, review timing, and the final boundary. Use <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">the organiser playbook</a> for the complete operational workflow.</p>

<h2>Frequently asked questions</h2>
<h3>Do I need to run every day?</h3>
<p>No. The event defines the required activity. Recovery and a repeatable weekly rhythm can be more appropriate than an invented daily streak.</p>
<h3>How many days per week should I run?</h3>
<p>There is no universal number. It depends on current activity, recovery, health, accessibility, event requirements, and qualified guidance where needed.</p>
<h3>Does walking count?</h3>
<p>Only when the event accepts walking or the selected activity type. Walking can support a routine without automatically becoming event progress.</p>
<h3>Can I use a treadmill?</h3>
<p>Only when the event permits it and the submission flow accepts the required evidence.</p>
<h3>Should I make up a missed activity?</h3>
<p>Recalculate and resume appropriately. Do not automatically double distance, intensity, or frequency.</p>
<h3>Is a streak the best motivation?</h3>
<p>Not universally. Some runners enjoy streaks; others respond better to weekly opportunities, social support, flexible goals, or completion milestones. A streak should not override recovery or safety.</p>
<h3>Why is pending distance not included?</h3>
<p>Pending evidence has not received final approval. It remains potential progress and does not affect official accumulated standings.</p>
<h3>Can I change my goal during the month?</h3>
<p>That depends on event and registration rules. Contact the organiser or <a href="/contact">HelloRun support</a> before assuming a category can be changed.</p>
<h3>Can I combine a month-long virtual run with an onsite race?</h3>
<p>Possibly, when both events and the available proof flow permit it. Read <a href="/blog/virtual-run-vs-traditional-race-which-one-should-you-join">the race-format comparison</a> and avoid treating one activity as automatically eligible everywhere.</p>
<h3>Where can I find an event?</h3>
<p>Browse <a href="/events">current events</a>, review <a href="/how-it-works">How HelloRun Works</a>, and check the <a href="/faq">FAQ</a> before registering.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity">World Health Organization: Physical Activity</a></li>
  <li><a href="https://www.cdc.gov/physical-activity-basics/overcoming-barriers/index.html">US CDC: Overcoming Barriers to Physical Activity</a></li>
  <li><a href="https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html">US CDC: Getting Started With Physical Activity</a></li>
  <li><a href="https://www.cdc.gov/physicalactivity/basics/measuring/index.html">US CDC: Measuring Physical Activity Intensity</a></li>
  <li><a href="https://worldathletics.org/personal-best/performance/mara-yamauchi-guide-be-your-own-coach">World Athletics: Be Your Own Coach</a></li>
  <li><a href="https://worldathletics.org/competitions/world-athletics-road-running-championships/copenhagen26/races/free-training-programs">World Athletics: Training Programmes</a></li>
  <li><a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/">NHS: Couch to 5K</a> — a structured beginner example, not a universal month plan.</li>
  <li><a href="https://www.rrca.org/covid-19-information-and-resources/">Road Runners Club of America: Virtual Event Definition and Context</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401736-group-challenges">Strava Support: Group Challenges</a> — an external cumulative-goal example, not a HelloRun rulebook.</li>
  <li><a href="https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations">Strava Support: Moving and Elapsed Time</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401776-strava-s-privacy-controls-faq">Strava Support: Privacy Controls</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
</ul>
<p>Recheck the live event page, current conditions, and submission form throughout the month. A consistent plan remains adjustable.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Month-long consistency in one minute',
  'How this guide was prepared',
  'Define consistency without demanding perfection',
  'Understand the event before building a routine',
  'Choose a reason that survives a low-motivation day',
  'Build a flexible four-part month',
  'Schedule opportunities instead of promises',
  'Use a minimum viable action carefully',
  'Keep easy activity genuinely easy',
  'Put recovery on the calendar',
  'Reduce friction before it blocks the session',
  'Use social support without creating pressure',
  'Track the process without turning it into surveillance',
  'Use one weekly review instead of daily judgment',
  'What to do after a missed session',
  'Plan for work, family, and travel',
  'Use weather and route backups',
  'Respond to pain, illness, and warning signs',
  'Keep tracking and proof manageable',
  'Understand review, standings, and recognition',
  'Five practical month-long scenarios',
  'Before-the-month checklist',
  'Weekly consistency checklist',
  'Final-week checklist',
  'Troubleshooting consistency problems',
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
  '/blog/how-to-complete-a-50k-accumulated-distance-challenge',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/how-leaderboards-work-virtual-running-events',
  '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
  '/blog/running-during-rainy-season-philippines',
  '/blog/how-to-run-safely-during-hot-and-humid-weather',
  '/blog/running-safety-tips-early-morning-night-runs',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  'who.int/news-room/fact-sheets/detail/physical-activity',
  'cdc.gov/physical-activity-basics/overcoming-barriers',
  'cdc.gov/healthy-weight-growth/physical-activity/getting-started',
  'cdc.gov/physicalactivity/basics/measuring',
  'worldathletics.org/personal-best/performance/mara-yamauchi-guide-be-your-own-coach',
  'worldathletics.org/competitions/world-athletics-road-running-championships',
  'nhs.uk/better-health/get-active/get-running-with-couch-to-5k',
  'rrca.org/covid-19-information-and-resources',
  'support.strava.com/en-us/articles/15401736-group-challenges',
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
  if (/<h[12]>How to Stay Consistent During a Month-Long Virtual Run<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/(?:you|runners?|participants?) (?:must|should|need to) run every day|daily running is required|you must never miss a day|a perfect streak (?:is|required)|(?:21|30) days (?:creates|guarantees|forms) a habit/i.test(text)) errors.push('article must not prescribe a universal daily streak');
  if (/guarantee(?:s|d)? (?:motivation|consistency|completion|safety|injury prevention)|prevents? (?:all )?injur/i.test(text)) errors.push('article must not guarantee adherence or safety');
  if (/(?:you|runners?|participants?) (?:must|should) make up (?:a|the) missed (?:run|session) by (?:doubling|running twice)|punish yourself with|remove recovery to catch up/i.test(text)) errors.push('article must not prescribe unsafe catch-up activity');
  if (/diagnose yourself|take (?:this |a )?medicine|stop prescribed medicine|lose weight by|exactly \d+\s*(?:ml|litres?|liters?) per hour/i.test(text)) errors.push('article must not provide medical, weight-loss, or hydration prescriptions');
  if (/every event accepts|all events accept|walking is always accepted|treadmills? (?:are|is) always accepted/i.test(text)) errors.push('article must not claim universal activity acceptance');
  if (/pending (?:distance|activity) (?:counts|is counted) (?:as )?(?:official|completion)|pending distance completes/i.test(text)) errors.push('article must not count pending progress officially');
  if (/perfect OCR|every submission is automatically approved|HelloRun (?:directly )?(?:processes|handles) (?:your |event )?(?:payment|funds)/i.test(text)) errors.push('article must not claim unsupported HelloRun behavior');
  if (/certificate (?:is|will be) (?:instant|immediate)|automatically (?:receive|receives?) a certificate/i.test(text)) errors.push('article must not promise automatic recognition');
  if (!/reviewed in July 2026 using documented guidance/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/Pending is not approved progress/i.test(text)) errors.push('article must distinguish pending progress');
  if (!/does not directly process an external payment transfer/i.test(text)) errors.push('article must accurately describe external payments');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid month-long consistency payload: ${errors.join('; ')}`);
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
