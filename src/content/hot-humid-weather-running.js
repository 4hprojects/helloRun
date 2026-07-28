'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-run-safely-during-hot-and-humid-weather';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Run Safely During Hot and Humid Weather',
  excerpt: 'Run more safely in hot and humid weather with practical guidance on heat-index checks, timing, pace, shade, hydration, warning signs, and virtual-event alternatives.',
  category: 'Training',
  tags: Object.freeze([
    'hot weather running',
    'humid weather',
    'heat safety',
    'heat index',
    'runner hydration',
    'easy running',
    'virtual running',
    'philippine runners'
  ]),
  seoTitle: 'How to Run Safely During Hot and Humid Weather',
  seoDescription: 'Plan hot-weather runs with heat-index checks, safer timing and routes, adjusted effort, hydration planning, warning signs, and virtual-event alternatives.',
  coverImageAlt: 'Filipino runner checking current heat conditions in deep shade beside a tree-lined route with water available before an early-morning run'
});

const RAW_CONTENT_HTML = `
<p>Hot and humid weather changes what a running pace costs. The body creates heat while moving and must release it to the environment. High air temperature, direct sun, still air, and humidity can make that release more difficult. A pace that feels easy on a cooler day may become demanding, and an ordinary route can become a poor choice when shade, water, transport, or help is not available.</p>
<p>The useful question is not “What temperature can runners handle?” There is no single number that makes strenuous outdoor exercise safe for every person. The better question is whether the current conditions, route, effort, duration, runner, and backup plan support the activity today. Sometimes the correct answer is to shorten, slow down, move indoors, or rest.</p>
<blockquote><strong>The safety-first principle:</strong> a training target, virtual-run deadline, paid registration, streak, leaderboard position, or planned pace never outweighs an official heat warning or signs that a runner may be developing heat-related illness.</blockquote>

<h2>Hot-weather running in one minute</h2>
<ul>
  <li><strong>Check current conditions, not a seasonal assumption.</strong> Review the local forecast, heat index or other official heat product, cloud and sun exposure, air quality where relevant, and local health or event instructions.</li>
  <li><strong>Do not turn one threshold into permission.</strong> Heat-index categories communicate increasing concern, but the route, sun, wind, effort, duration, acclimatization, health, and access to cooling also matter.</li>
  <li><strong>Move the activity when practical.</strong> A cooler hour, shaded loop, indoor track, or event-permitted treadmill may be safer than exposed midday pavement.</li>
  <li><strong>Reduce the demand.</strong> Slow down, shorten the session, add walk and cooling breaks, and use comfortable breathing or the talk test instead of forcing a normal pace.</li>
  <li><strong>Plan fluids without guessing a universal dose.</strong> Start with ordinary access to safe drinking water, know where more is available, and follow qualified personal guidance when health conditions or medicines affect fluid or salt needs.</li>
  <li><strong>Stop early for warning signs.</strong> Faintness, weakness, unusual dizziness, confusion, loss of coordination, collapse, severe breathing difficulty, or rapidly worsening symptoms require prompt action, cooling, and appropriate medical or emergency help.</li>
  <li><strong>Check on other runners.</strong> Heat can affect judgment. A buddy, organiser, family member, or route contact should know how to stop the plan and reach help.</li>
</ul>
<p>For broader weather, traffic, personal-security, and emergency planning, read the <a href="/blog/running-safety-tips-early-morning-night-runs">running safety guide</a>. If wet weather is also present, use <a href="/blog/running-during-rainy-season-philippines">Running During the Rainy Season in the Philippines</a> rather than assuming rain removes heat risk.</p>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in July 2026 using documented guidance from PAGASA, the Philippine Department of Health, the World Health Organization, the US Centers for Disease Control and Prevention, the National Institute for Occupational Safety and Health, the American College of Sports Medicine, and World Athletics, together with documented HelloRun event and result behavior.</p>
<p>It is general educational information, not a medical assessment, diagnosis, treatment plan, individualized hydration prescription, or guarantee of safe completion. It does not independently test a runner, route, weather station, wearable, drink, supplement, or cooling product. Current official warnings, local authorities, event rules, and qualified health guidance remain authoritative.</p>
<p>Heat advice must be applied conservatively because conditions can change and people respond differently. Age, disability, pregnancy, recent illness, sleep, acclimatization, training status, previous heat illness, alcohol use, underlying conditions, and some medicines can affect heat response. A person who needs individualized advice should obtain it from an appropriately qualified professional before using a general article to make a high-risk decision.</p>

<h2>Why heat and humidity change a run</h2>
<p>Running produces metabolic heat. The body responds through processes that include moving blood toward the skin and producing sweat. Evaporation of sweat can support cooling, but high humidity reduces how readily that evaporation occurs. Sweat on the skin or a soaked shirt is not proof that cooling is working well.</p>
<p>Direct solar radiation, hot pavement, limited shade, dark surfaces, heavy clothing, and low air movement can add to the environmental load. A city route between buildings may feel different from a shaded park recorded at the same air temperature. A breeze can change, and a route that is shaded at 7:00 a.m. may be exposed later.</p>
<p>WHO explains that heat stress is shaped by air temperature, humidity, wind, thermal radiation, clothing, and internally generated heat. The combination matters. That is why this guide does not publish a universal safe temperature, pace adjustment, or maximum duration.</p>

<h2>Use heat index as one decision input</h2>
<p>Heat index describes how hot conditions may feel when air temperature and relative humidity are considered together. In the Philippines, consult <a href="https://pagasa.dost.gov.ph/weather/heat-index">PAGASA's current heat-index information</a> and the current local forecast. PAGASA advises using its most recent station data because reported values can be corrected and automated maps can contain gaps or technical errors.</p>
<p>PAGASA uses effect-based categories to communicate increasing concern. Read the current category, forecast, and official advice rather than relying on a screenshot from another date. A value from a distant station may not describe the sun, shade, wind, or surface on your route. Heat index also should not be interpreted as the only possible heat-stress measure.</p>
<p>A “lower” category is not automatic clearance for a hard session. Individual vulnerability, direct sun, exertion, duration, limited cooling, and rapidly changing conditions may still make the plan unsuitable. Conversely, being accustomed to a tropical climate does not make a runner immune to heat illness.</p>
<p>Check conditions again close to departure. If the route crosses different districts, elevations, or exposed areas, review those places as well. Follow local government, school, park, workplace, venue, and event instructions when they restrict activity.</p>

<h2>Use a go, modify, or stop decision</h2>
<h3>Go only with a complete plan</h3>
<p>An outdoor easy run may remain a reasonable personal decision when current official guidance does not advise against it, the runner feels well, the route has shade and cooling options, the duration is manageable, and an early exit is available. “Go” still means monitoring effort and conditions rather than proving toughness.</p>
<h3>Modify before conditions become a crisis</h3>
<p>Choose “modify” when the original plan adds avoidable load. Move to a cooler time, replace exposed roads with a shaded short loop, reduce pace or duration, add walk breaks, run with a buddy, carry appropriate water, or use an indoor option. If the modified plan is still uncertain, do not start.</p>
<h3>Stop or do not start</h3>
<p>Choose “stop” when an official warning or local instruction says to avoid strenuous outdoor activity, cooling and safe water are unavailable, the route is unusually exposed, the runner is unwell, or concerning symptoms appear. Confusion, collapse, altered behavior, loss of coordination, or suspected heat stroke is an emergency—not a signal to complete the last kilometre.</p>

<h2>Choose a cooler time without assuming it is cool</h2>
<p>CDC recommends limiting outdoor activity during the middle of hot days where possible and scheduling exercise earlier or later. In tropical climates, early morning can still be humid, while evenings can retain heat from pavement and buildings. Check actual conditions rather than using the clock alone.</p>
<p>Allow enough daylight and transport time for the selected route. Moving a run earlier must not create a new low-light or personal-security problem. If the safest time conflicts with traffic, visibility, park access, sleep, or available support, an indoor activity or rest day may be more appropriate.</p>
<p>Do not wait in direct sun for a GPS lock, group photo, delayed start, or event briefing. Organisers should provide shade and adjust procedures; individual runners should keep pre-run time and effort proportionate to the conditions.</p>

<h2>Build the route around shade, cooling, and exits</h2>
<p>Prefer a short loop over a long exposed out-and-back. A loop makes it easier to stop near water, shade, transport, a staffed facility, or a trusted companion. Identify which buildings are actually open and whether drinking water is safe and available.</p>
<p>Look at the route at the intended time. Trees, buildings, awnings, and covered walkways cast different shadows through the day. Avoid long unshaded bridges, concrete fields, industrial roads, treeless waterfronts, and routes where a vehicle pickup cannot reach you.</p>
<p>Plan at least one early exit that does not require completing the loop. Share the general route and expected return when appropriate. Carry identification and local emergency information, especially when running alone. Do not rely on a phone if battery, signal, or overheating could prevent use.</p>
<p>A shaded route is not a guarantee of safe conditions. Humidity, still air, exertion, and accumulated heat can remain high. Shade reduces one part of the load; it does not remove the need to monitor the runner.</p>

<h2>Adjust effort before pace becomes the problem</h2>
<p>World Athletics advises being ready to run more slowly in hot weather and using perceived effort rather than pace. The same easy pace can require more effort in heat and humidity. Trying to “hold the number” can turn an easy session into a hard one.</p>
<p>Use the talk test as a simple check. If the planned easy effort no longer allows comfortable sentences, slow down, walk, move to shade, or stop. Current pace on a watch can fluctuate and should not overrule how the runner is functioning.</p>
<p>Shorten the session before fatigue makes route decisions harder. Do not make up reduced distance by sprinting the end, doubling the next workout, or skipping recovery. Use the <a href="/blog/beginners-guide-to-running-pace">beginner pace guide</a> to understand why pace and effort are different.</p>
<p>Walking is a valid way to reduce effort, but whether walking counts toward a virtual event depends on its rules. A walk break also does not make a dangerous heat warning harmless.</p>

<h2>Adapt gradually without treating acclimatization as protection</h2>
<p>Repeated heat exposure can lead to physiological adaptation, but the process varies. Returning runners, travelers, people moving between air-conditioned indoor life and outdoor training, and runners after illness may respond differently. Do not copy an elite athlete's schedule or assume that living in the Philippines equals complete acclimatization.</p>
<p>Use shorter, easier exposures when qualified guidance and current conditions support them. Increase only one demand at a time, such as duration or intensity, and preserve cooling and rest. There is no universal number of days that certifies readiness.</p>
<p>Acclimatization can reduce some strain but does not eliminate heat illness. Official warnings, symptoms, health changes, and environmental conditions still control the decision. Rest or indoor training can be the correct choice even for an experienced runner.</p>

<h2>Plan hydration without a universal formula</h2>
<p>CDC advises athletes to drink more water than usual during hot conditions and not wait for pronounced thirst, while WHO emphasizes regular access to water during heat. Those public-health principles do not produce one exact dose for every runner. Sweat rate, body size, duration, intensity, food, weather, pregnancy, health conditions, and medicines can change fluid and electrolyte needs.</p>
<p>Begin with reliable access to safe drinking water. Know whether fountains work, whether aid stations are stocked, and how to carry enough without creating discomfort. Drink in a practical, regular way appropriate to the activity and personal guidance. Do not treat clear urine, a fixed bottle count, or another runner's plan as proof of correct hydration.</p>
<p>More is not always better. Excessive fluid intake can also be dangerous. Avoid forced drinking contests and do not take salt tablets or supplements simply because the day is humid. Runners with fluid restrictions, kidney or heart conditions, diabetes, pregnancy, or medicines affecting fluids or heat response should obtain qualified advice.</p>
<p>Alcohol before or immediately after a demanding hot-weather run can complicate hydration and judgment. Ordinary food may contribute fluid, carbohydrate, and salt, but this article does not prescribe a sports drink, electrolyte concentration, supplement, or recovery meal.</p>

<h2>Use clothing and sun protection as support, not armor</h2>
<p>Loose, lightweight, light-colored clothing can support comfort and heat release. Choose items already tested for fit and movement. Clothing that is fashionable, expensive, or labeled “cooling” does not override the environment.</p>
<p>A breathable cap or visor can provide some facial shade. Sunglasses may help with glare when appropriate. Use sunscreen according to its current label, including application and reapplication instructions, while remembering that sunscreen protects against ultraviolet exposure—not heat illness.</p>
<p>Carry the minimum equipment needed for safe identification, communication, water, and proof. A heavy vest or dark backpack adds load. If an event requires costume, protective equipment, or a package that traps heat, organisers and participants should reassess the activity rather than assume the normal plan still applies.</p>

<h2>Know who may need qualified guidance</h2>
<p>WHO identifies older adults, infants, people who work outdoors, and people with chronic conditions among groups that can be more vulnerable to heat. Exercise adds internally generated heat. Pregnancy, disability, recent illness, fever, previous heat illness, cardiovascular or kidney conditions, diabetes, respiratory conditions, and medicines affecting sweating, circulation, fluids, or alertness may change personal risk.</p>
<p>This list is not a diagnosis or a reason to exclude someone automatically. It is a reason to use individualized, accessible planning and qualified guidance. A runner should not stop prescribed medicine to accommodate an event without speaking to the prescribing professional.</p>
<p>Accessibility planning can include a shorter shaded loop, guide or support person, more frequent cooling access, mobility-device considerations, communication needs, and a clear evacuation route. Event organisers should publish accessible options rather than forcing participants to disclose unnecessary medical detail publicly.</p>

<h2>Recognize early warning signs and stop</h2>
<p>CDC tells athletes who feel faint or weak to stop activity and get to a cool place. Other concerning signs can include unusual dizziness, headache, nausea, heavy fatigue, cramps, worsening breathlessness, or behavior that is not normal for the runner. Symptoms can overlap with other conditions, so do not diagnose the cause on the route.</p>
<p>Stop the activity, move to a cooler shaded or air-conditioned place, loosen unnecessary clothing, and begin appropriate cooling while arranging help. Do not send an unwell runner home alone on foot or allow them to “jog it off.” If symptoms are severe, worsening, unusual, or do not improve promptly, seek qualified medical help.</p>
<p>Confusion, altered mental state, slurred speech, loss of coordination, collapse, seizure, or loss of consciousness can indicate a medical emergency. Contact local emergency services immediately and begin rapid cooling using the safest available method while following dispatcher or trained medical instructions. Do not give fluids to someone who is unconscious or unable to swallow safely.</p>
<p>Heat stroke is a medical emergency. The goal is not to confirm a temperature on a consumer watch before acting. A runner's survival and care take priority over the activity record, event result, or device.</p>

<h2>Use a buddy and check-in plan</h2>
<p>Heat can affect judgment, and a runner may underestimate how quickly their condition is changing. Run with another person when conditions warrant it and agree in advance that either person can end the session without debate.</p>
<p>Know each other's general emergency contact and route plan without collecting unnecessary private medical information. At a group session, designate someone who can call for help, identify the nearest cooling location, and direct responders.</p>
<p>After the run, confirm that everyone has returned and is recovering normally. A post-run social photo is not a check-in. Ask whether the person is alert, coordinated, able to communicate normally, and has safe transport.</p>

<h2>Protect the tracker without chasing heat-affected pace</h2>
<p>Charge the phone or watch, check activity permissions, confirm units, and select the correct activity type before leaving shade. Direct sun and heavy processing can contribute to device overheating or battery drain. Follow the manufacturer's current temperature and operating guidance.</p>
<p>Keep the device positioned so it does not interfere with cooling or movement. Do not stand in exposed sun to fix a GPS trace. If recording fails, move to a safe cool location before troubleshooting and retain the original activity rather than inventing missing data.</p>
<p>Heat, sweat, sunscreen, and wet hands can affect touchscreen use. Use screen locking or physical controls that have been tested in advance. Review <a href="/blog/best-apps-to-track-your-virtual-run">the app comparison</a> and <a href="/blog/what-counts-as-valid-run-proof">the valid-proof guide</a> before event day.</p>

<h2>Virtual-run alternatives when outdoor heat is unsuitable</h2>
<p>Virtual events can offer scheduling flexibility, but “virtual” does not mean any activity, any location, or an automatic deadline extension. Read the event's activity window, final submission deadline, accepted activity types, minimum distance, treadmill policy, proof requirements, and support route.</p>
<p>When allowed, move to an air-conditioned indoor track or treadmill, choose a cooler day within the window, split an accumulated-distance goal across eligible activities, or shorten the attempt. The <a href="/blog/how-accumulated-distance-challenges-work">accumulated-distance guide</a> explains why only approved activities count officially.</p>
<p>If no compliant alternative exists, contact the organiser before the deadline. An extension or substitution is not guaranteed. Missing a result is preferable to forcing an exposed run through dangerous conditions.</p>
<p>HelloRun supports event-dependent registration, external payment-receipt review where applicable, screenshot or supported Strava evidence, OCR-assisted field entry, and organiser or admin review. HelloRun does not directly process the external payment transfer. OCR is fallible, and correct submission does not guarantee approval. Pending is not approved progress or an official ranked result. Leaderboards and certificates are available only when configured and after applicable review.</p>

<h2>Four practical hot-weather scenarios</h2>
<h3>Scenario 1: an easy 5K on a humid morning</h3>
<p>Lina checks the current heat information and finds no instruction to avoid activity, but humidity is high. She changes her exposed 5K route to a shaded one-kilometre loop near water and transport. She runs by conversational effort, adds walk breaks, and ends at four kilometres when effort rises. The shorter result is a successful safety decision, not a failed workout.</p>
<h3>Scenario 2: a danger-level heat forecast</h3>
<p>Marco's normal run falls during a PAGASA danger-level period. He does not interpret his experience as immunity. He moves the session to an allowed indoor treadmill, confirms the event accepts treadmill evidence, and records the required final summary.</p>
<h3>Scenario 3: a runner becomes confused</h3>
<p>During a group run, Bea begins answering questions incorrectly and loses coordination. Her companion stops the activity, calls local emergency services, moves her toward appropriate cooling, and follows dispatcher instructions. They do not wait for a watch temperature or ask her to finish the loop.</p>
<h3>Scenario 4: heat near an accumulated-challenge deadline</h3>
<p>Sam has five kilometres remaining, but the only available outdoor hour is dangerously hot. The event permits multiple activities until the deadline, but conditions are not expected to improve. Sam contacts the organiser rather than forcing the distance. Pending or incomplete progress is not worth a medical emergency.</p>

<h2>Before-run heat checklist</h2>
<ul>
  <li>Check the current local forecast, PAGASA heat index, sun exposure, wind, and relevant official advice.</li>
  <li>Confirm no local authority, venue, school, workplace, or event restriction affects the activity.</li>
  <li>Assess personal health, recent illness, sleep, previous heat exposure, and qualified guidance.</li>
  <li>Choose the coolest practical time without creating low-light or security problems.</li>
  <li>Select a short shaded route with safe water, cooling, transport, and early exits.</li>
  <li>Tell a trusted person the route and expected return when appropriate.</li>
  <li>Use tested lightweight clothing and sunscreen according to its label.</li>
  <li>Confirm water access without copying a universal hydration formula.</li>
  <li>Charge and test the tracker, activity type, units, and proof fields.</li>
  <li>Define the symptom or condition that ends the run.</li>
</ul>

<h2>During-run heat checklist</h2>
<ul>
  <li>Run by effort rather than forcing a cooler-day pace.</li>
  <li>Use walk, shade, water, and cooling breaks before distress develops.</li>
  <li>Monitor yourself and companions for weakness, faintness, unusual behavior, and coordination changes.</li>
  <li>Keep the route close to an exit; do not add exposed distance impulsively.</li>
  <li>Stop if official conditions worsen or cooling becomes unavailable.</li>
  <li>Move to a cool safe place before adjusting a phone, clothing, or equipment.</li>
  <li>Do not pressure another runner to continue.</li>
</ul>

<h2>Post-run recovery and review checklist</h2>
<ul>
  <li>Move out of direct heat and cool down progressively.</li>
  <li>Continue ordinary fluid and food intake appropriate to personal guidance.</li>
  <li>Confirm companions are alert, coordinated, and have safe transport.</li>
  <li>Seek appropriate care for severe, unusual, worsening, or persistent symptoms.</li>
  <li>Do not assume feeling normal immediately means the session had no effect.</li>
  <li>Record conditions, effort, stops, route exposure, and equipment issues.</li>
  <li>Allow recovery before deciding the next workout.</li>
</ul>

<h2>Virtual-event and proof checklist</h2>
<ul>
  <li>Read the activity window and final submission deadline separately.</li>
  <li>Confirm whether walking, treadmills, split distance, or accumulated activities are accepted.</li>
  <li>Keep the original date, distance, duration, units, activity type, and source readable.</li>
  <li>Protect private home locations and unnecessary health information.</li>
  <li>Use <a href="/blog/how-to-submit-run-proof-correctly-hellorun">the proof-submission walkthrough</a> for the current HelloRun flow.</li>
  <li>Confirm OCR-assisted values rather than treating extraction as proof of accuracy.</li>
  <li>Wait for review; submitted and pending evidence is not official progress.</li>
  <li>Review <a href="/blog/how-leaderboards-work-virtual-running-events">how approved leaderboard results work</a>.</li>
</ul>

<h2>Guidance for event organisers</h2>
<p>Organisers should publish clear activity and submission windows, accepted indoor alternatives, postponement or cancellation rules, emergency communication, and the authority responsible for weather decisions. Avoid language that rewards finishing despite an official warning.</p>
<p>For onsite components, qualified event-safety and medical planning must address environmental monitoring, shade, water, cooling, staffing, transport, participant communication, and emergency response. A waiver does not remove organiser responsibility, and a generic heat-index screenshot is not a complete heat plan.</p>
<p>Virtual organisers should allow enough schedule flexibility for participants to avoid dangerous hours where practical. Recognition, leaderboards, and deadlines should not encourage unsafe attempts. Use the <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">organiser playbook</a> for the wider operational workflow.</p>

<h2>Troubleshooting hot and humid runs</h2>
<h3>My easy pace is much slower</h3>
<p>That can happen because environmental load changes effort. Use breathing and perceived effort, shorten the session, and avoid judging the result against a cooler route without context.</p>
<h3>I cannot find a shaded route</h3>
<p>Move the time, choose an indoor option, reduce the activity, or rest. Clothing and water do not convert a long exposed route into a shaded one.</p>
<h3>I drank water but still feel unwell</h3>
<p>Hydration does not rule out heat illness or another medical problem. Stop, reach a cool place, and obtain appropriate help based on symptoms. Do not diagnose the cause yourself.</p>
<h3>My event deadline is today</h3>
<p>Check permitted indoor or accumulated options and contact the organiser. Do not use the deadline to justify running through an official warning or concerning symptoms.</p>
<h3>My watch recorded an unusual heart rate or pace</h3>
<p>Consumer readings can be affected by fit, movement, sweat, device limitations, and physiology. Stop if you feel unwell and seek qualified guidance for concerning data or symptoms. Preserve the original record for event review.</p>

<h2>Frequently asked questions</h2>
<h3>What temperature is too hot to run?</h3>
<p>There is no universal number for every runner and situation. Use current official heat information, sun, humidity, wind, route, effort, duration, health, acclimatization, cooling access, and symptoms together.</p>
<h3>Is the heat index the same as air temperature?</h3>
<p>No. Heat index combines air temperature and relative humidity to describe perceived heat under defined assumptions. Read PAGASA's current product and limitations.</p>
<h3>Does running early guarantee cooler conditions?</h3>
<p>No. Early hours may be cooler but can remain humid, dark, isolated, or already hot. Check actual conditions and route safety.</p>
<h3>Should I force myself to drink a fixed amount?</h3>
<p>No universal formula fits everyone. Ensure access to safe water, drink regularly in a practical way, and obtain individualized advice when health, medicines, long duration, or heavy sweating makes planning more complex.</p>
<h3>Do I always need a sports drink?</h3>
<p>No. Needs vary with duration, sweat, food, health, and conditions. This guide does not prescribe a product, electrolyte amount, or supplement.</p>
<h3>Can experienced runners ignore heat warnings?</h3>
<p>No. Experience and acclimatization do not create immunity. Current warnings, symptoms, and event instructions still apply.</p>
<h3>Does every virtual run accept a treadmill?</h3>
<p>No. Individual event rules determine accepted activity types and evidence. Confirm before completing the activity.</p>
<h3>Can I submit a shortened activity?</h3>
<p>That depends on the event's minimum distance and format. Keep the original activity and check the organiser's correction or support route.</p>
<h3>When is heat illness an emergency?</h3>
<p>Confusion, altered mental state, loss of coordination, collapse, seizure, or loss of consciousness require immediate emergency action. Contact local emergency services and follow trained instructions.</p>
<h3>Where should a first-time runner begin?</h3>
<p>Use the flexible <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K plan</a>, the <a href="/blog/how-to-prepare-for-your-first-virtual-run">first virtual-run preparation guide</a>, and current qualified guidance. Browse <a href="/events">Events</a>, review <a href="/how-it-works">How It Works</a>, and use the <a href="/faq">FAQ</a> before registering.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://pagasa.dost.gov.ph/weather/heat-index">PAGASA Heat Index</a> — current Philippine station observations, forecasts, interactive mapping, and data limitations.</li>
  <li><a href="https://www.pagasa.dost.gov.ph/press-release/174">PAGASA iHeatMap announcement</a> — nationwide real-time heat-index monitoring and hourly forecasts.</li>
  <li><a href="https://rmc.doh.gov.ph/patientscorner/health-corner/97-heat-stroke">Philippine Department of Health hospital heat-stroke guidance</a> — medical-emergency context and heat-risk information.</li>
  <li><a href="https://www.cdc.gov/heat-health/risk-factors/heat-and-athletes.html">CDC Heat and Athletes</a> — timing, pacing, clothing, monitoring, water, and stop guidance.</li>
  <li><a href="https://www.cdc.gov/niosh/heat-stress/about/illnesses.html">CDC/NIOSH heat-related illnesses</a> — warning signs and first-response context.</li>
  <li><a href="https://www.who.int/news-room/fact-sheets/detail/climate-change-heat-and-health">WHO Heat and Health</a> — environmental heat load, vulnerability, warnings, cooling, and public-health guidance.</li>
  <li><a href="https://worldathletics.org/personal-best/performance/running-through-extreme-weather">World Athletics extreme-weather running guidance</a> — pace, perceived effort, equipment, rest, and emergency preparation.</li>
  <li><a href="https://acsm.org/education-resources/pronouncements-scientific-communications/official-statements/">ACSM official statements</a> — exertional heat-illness recognition, management, and return-to-activity resources.</li>
  <li><a href="/blog/what-counts-as-valid-run-proof">HelloRun valid-proof guide</a> and <a href="/privacy">Privacy Policy</a> — reviewable evidence and responsible handling of runner information.</li>
  <li><a href="/contact">HelloRun Contact</a> — platform support; event-specific questions should use the organiser's published support route.</li>
</ul>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Hot-weather running in one minute',
  'How this guide was prepared',
  'Why heat and humidity change a run',
  'Use heat index as one decision input',
  'Use a go, modify, or stop decision',
  'Choose a cooler time without assuming it is cool',
  'Build the route around shade, cooling, and exits',
  'Adjust effort before pace becomes the problem',
  'Adapt gradually without treating acclimatization as protection',
  'Plan hydration without a universal formula',
  'Use clothing and sun protection as support, not armor',
  'Know who may need qualified guidance',
  'Recognize early warning signs and stop',
  'Use a buddy and check-in plan',
  'Protect the tracker without chasing heat-affected pace',
  'Virtual-run alternatives when outdoor heat is unsuitable',
  'Four practical hot-weather scenarios',
  'Before-run heat checklist',
  'During-run heat checklist',
  'Post-run recovery and review checklist',
  'Virtual-event and proof checklist',
  'Guidance for event organisers',
  'Troubleshooting hot and humid runs',
  'Frequently asked questions',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/how-it-works',
  '/faq',
  '/contact',
  '/privacy',
  '/blog/running-during-rainy-season-philippines',
  '/blog/running-safety-tips-early-morning-night-runs',
  '/blog/how-to-prepare-for-your-first-virtual-run',
  '/blog/beginner-5k-training-plan-new-runners',
  '/blog/beginners-guide-to-running-pace',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/how-leaderboards-work-virtual-running-events',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  'pagasa.dost.gov.ph/weather/heat-index',
  'pagasa.dost.gov.ph/press-release/174',
  'rmc.doh.gov.ph/patientscorner/health-corner/97-heat-stroke',
  'cdc.gov/heat-health/risk-factors/heat-and-athletes',
  'cdc.gov/niosh/heat-stress/about/illnesses',
  'who.int/news-room/fact-sheets/detail/climate-change-heat-and-health',
  'worldathletics.org/personal-best/performance/running-through-extreme-weather',
  'acsm.org/education-resources/pronouncements-scientific-communications/official-statements'
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
  if (/<h[12]>How to Run Safely During Hot and Humid Weather<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/safe (?:temperature|heat index) (?:is|of) \d|everyone can run (?:safely )?below \d/i.test(text)) errors.push('article must not prescribe a universal safe threshold');
  if (/drink exactly|every runner (?:must|should) drink|\d+\s*(?:ml|litres?|liters?|cups?) (?:every|per) (?:hour|kilometre|mile)/i.test(text)) errors.push('article must not prescribe universal hydration dosing');
  if (/guarantee(?:s|d)? (?:safety|completion|injury prevention)|prevents? (?:all )?(?:heat illness|injuries|collapse)/i.test(text)) errors.push('article must not guarantee safety or prevention');
  if (/diagnose yourself|(?:you|runners?) (?:should|must) (?:stop prescribed medicine|take salt tablets?|take (?:electrolyte|hydration) supplements? daily)/i.test(text)) errors.push('article must not provide unsafe medical instructions');
  if (/every event accepts|all events accept|treadmills? (?:are|is) always accepted|walking is always accepted/i.test(text)) errors.push('article must not claim universal event acceptance');
  if (/HelloRun (?:directly )?(?:processes|handles) (?:your |event )?(?:payment|funds)|perfect OCR|every submission is automatically approved/i.test(text)) errors.push('article must not claim unsupported HelloRun behavior');
  if (!/reviewed in July 2026 using documented guidance/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/Heat stroke is a medical emergency/i.test(text)) errors.push('article must identify heat stroke as an emergency');
  if (!/Pending is not approved progress/i.test(text)) errors.push('article must distinguish pending evidence');
  if (!/does not directly process the external payment transfer/i.test(text)) errors.push('article must accurately describe external payments');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid hot-weather running payload: ${errors.join('; ')}`);
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
