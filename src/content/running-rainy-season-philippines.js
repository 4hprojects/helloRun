'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'running-during-rainy-season-philippines';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'Running During the Rainy Season in the Philippines',
  excerpt: 'Plan rainy-season runs in the Philippines with practical checks for PAGASA advisories, lightning, flooding, visibility, wet surfaces, tracking, and virtual-event deadlines.',
  category: 'Training',
  tags: Object.freeze([
    'rainy season running',
    'running in rain',
    'philippine runners',
    'weather safety',
    'flood safety',
    'lightning safety',
    'wet weather running',
    'virtual running'
  ]),
  seoTitle: 'Running During the Rainy Season in the Philippines',
  seoDescription: 'Plan safer rainy-season runs in the Philippines with PAGASA checks, lightning and flood decisions, visibility, wet-route preparation, tracking, and backup options.',
  coverImageAlt: 'Filipino runner in reflective gear checking the weather beside a sheltered park path after light rain with dark storm clouds in the distance'
});

const RAW_CONTENT_HTML = `
<p>Rain changes a run, but the word “rain” does not describe one level of risk. A short shower on a familiar, well-drained park loop is different from a thunderstorm, a tropical-cyclone warning, rapidly rising water, strong gusts, or a route beside a swollen river. The useful rainy-season skill is therefore not learning to tolerate every wet run. It is learning to decide when a route remains reasonable, when it needs to change, and when the run should move indoors or wait.</p>
<p>For runners in the Philippines, that decision should start with current official information. Conditions can differ sharply between regions and can change within the time it takes to travel to a route. Promotional event artwork, yesterday's forecast, a view from one window, or another runner's social-media post cannot replace a current PAGASA advisory and instructions from local authorities.</p>
<blockquote><strong>The safety-first principle:</strong> a virtual-run deadline, training schedule, streak, registration fee, or expected leaderboard result is never a reason to enter floodwater or remain outdoors when lightning, destructive winds, an evacuation order, or another serious hazard is present.</blockquote>

<h2>Rainy-season running in one minute</h2>
<ul>
  <li><strong>Check official information before changing clothes.</strong> Review the current PAGASA forecast, regional products, thunderstorm and rainfall advisories, tropical-cyclone bulletins, and local government instructions for the route—not only your home.</li>
  <li><strong>Light rain is not automatic permission.</strong> Continue only when the route is open, visible, well drained, free of floodwater and dangerous debris, and has a realistic shelter or exit plan.</li>
  <li><strong>Thunder or lightning means stop.</strong> Move to a substantial enclosed building or a hard-topped vehicle. A small open shelter, tree, covered court edge, or waiting shed is not a substitute for appropriate lightning shelter.</li>
  <li><strong>Do not walk, run, or “test” floodwater.</strong> Depth and current are difficult to judge, while holes, debris, contamination, and electrical hazards may be hidden.</li>
  <li><strong>Make yourself easier to detect.</strong> Rain, spray, dim daylight, umbrellas, and wet windscreens can reduce visibility. Use a separated path where possible, bright or retroreflective details, and an active light when conditions warrant it.</li>
  <li><strong>Protect the record before starting.</strong> Confirm battery, permissions, water-resistance limits, offline recording behavior, units, and the proof fields required by the event.</li>
  <li><strong>Keep a backup option.</strong> Postpone, shorten the route, choose a safer loop, use an allowed treadmill, or contribute another eligible activity to an accumulated challenge.</li>
</ul>
<p>If you are preparing for your first event, begin with <a href="/blog/how-to-prepare-for-your-first-virtual-run">How to Prepare for Your First Virtual Run</a>. For broader low-light, traffic, weather, and personal-security planning, use the dedicated <a href="/blog/running-safety-tips-early-morning-night-runs">running safety guide</a>.</p>

<h2>How this guide was prepared</h2>
<p>This article was reviewed in July 2026 using documented guidance from the Philippine Atmospheric, Geophysical and Astronomical Services Administration (PAGASA), HazardHunterPH, the Philippine Department of Health (DOH), the US National Weather Service, and the World Health Organization, together with documented HelloRun event and result behavior. It is general educational guidance, not a weather forecast, engineering inspection, medical diagnosis, individualized training prescription, or guarantee that a particular route or activity is safe.</p>
<p>PAGASA and local authorities remain authoritative for current Philippine conditions. Individual event rules remain authoritative for dates, accepted activity types, treadmills, walking, proof, corrections, and recognition. Conditions, websites, warning products, device features, and event settings can change. Recheck them when making a real decision rather than relying on a saved copy of this article.</p>
<p>The guide does not rank shoes, phones, watches, or tracking apps for wet-weather accuracy. It also does not claim that the described precautions prevent crashes, falls, lightning injury, illness, device failure, or proof rejection. They are practical ways to make a better-informed decision while accepting that postponement may be the appropriate outcome.</p>

<h2>Understand what “rainy season” does and does not mean</h2>
<p>The Philippines does not experience identical weather on every island or in every month. Local climate patterns, the southwest and northeast monsoons, tropical cyclones, thunderstorms, the intertropical convergence zone, terrain, coastlines, and drainage all influence what a runner encounters. PAGASA may announce the onset of rainy-season conditions based on observations and analysis, but that announcement is not a promise that every day will be wet or that every dry-looking hour is safe.</p>
<p>A national forecast can provide context while a regional advisory gives more specific information. A route may also have hazards that do not appear in a general city forecast: an underpass that floods quickly, a creek that rises after rain upstream, a hillside affected by saturated ground, or a road where vehicle spray removes the safe shoulder. Local disaster-risk and traffic instructions therefore matter alongside the weather product.</p>
<p>Rain intensity can also change during one activity. A loop chosen during a light shower may become unsuitable if drains begin overflowing or thunder develops. Treat the decision as continuous. Starting a run does not create an obligation to finish the planned route.</p>

<h2>Use a go, change, or stop decision</h2>
<h3>Go only after a deliberate check</h3>
<p>A light-rain run may remain a reasonable personal choice when no thunderstorm, hazardous-wind, flood, landslide, or evacuation warning affects the route; visibility remains adequate; the surface is passable; drainage is working; and safe shelter or an early exit is available. “Go” still means adjusting the route and effort to conditions, not treating the pavement as dry.</p>
<h3>Change the plan when one part is weak</h3>
<p>Choose “change” when the outdoor option is not clearly dangerous but has avoidable weaknesses. Examples include moving from a roadside route to a separated park loop, shortening an out-and-back so shelter stays close, removing a steep descent, starting later after a short-lived advisory has ended, or using an indoor option accepted by the event. Recheck conditions after the change.</p>
<h3>Stop or do not start when a serious hazard is present</h3>
<p>Do not start, or stop promptly, when you hear thunder, see lightning, encounter floodwater, observe rapidly rising water, receive an official evacuation or stay-indoors instruction, see downed electrical lines, face severe winds or dangerous debris, lose usable visibility, or cannot reach appropriate shelter. The same applies when illness, severe or unexplained symptoms, or a damaged route makes continuing unsafe.</p>

<h2>Check official weather information before the run</h2>
<p>Open <a href="https://www.pagasa.dost.gov.ph/">PAGASA's current weather services</a> close to departure time. Check information for both your starting point and the full route. A practical review includes the local forecast, regional weather products, rainfall or thunderstorm advisories, general flood advisories, and any tropical-cyclone bulletin. During changeable conditions, check again before leaving shelter and while the activity can still be ended safely.</p>
<p>PAGASA's regional pages publish location-specific advisories that may describe expected or observed rain, lightning, strong winds, flash floods, or landslides. Warning colors and product wording have operational meanings. Follow the current product's instructions instead of memorizing a rainfall number from an old graphic or trying to convert a warning into permission to run.</p>
<p>If a tropical cyclone is affecting the country, read the current <a href="https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin">Tropical Cyclone Bulletin</a> and related rainfall or regional products. A cyclone does not need to pass directly over your city to enhance monsoon rain or winds. Likewise, the absence of an active cyclone does not rule out a dangerous localized thunderstorm.</p>
<p>Check local government, disaster-risk reduction, park, campus, and venue announcements. Closures, evacuation instructions, landslide warnings, transport interruptions, and flooded-road reports may be more operationally relevant than a general icon showing rain. If official instructions conflict with a training plan, follow the safety instruction.</p>

<h2>Evaluate the route, not just the forecast</h2>
<p>A useful rainy-season route is easy to leave, easy to shorten, and not dependent on one low crossing. Prefer continuous sidewalks or separated paths, controlled crossings, reliable lighting, and loops near substantial shelter. Tell a trusted person the general plan when appropriate and avoid an isolated route merely because fewer people are using it in the rain.</p>
<p>Review the path in daylight before relying on it during heavy cloud or early morning. Identify broken pavement, uncovered drains, slick tiles, painted road markings, metal covers, moss, wet leaves, construction plates, loose gravel, and places where mud flows across the path. A puddle can conceal a pothole or missing cover. Do not assume that following another runner proves the surface is stable.</p>
<p>Avoid routes through underpasses, drainage channels, riverbanks, creek crossings, coastal edges exposed to large waves, and low areas known to collect water. Give steep slopes and areas below cut hillsides extra caution when rain has been persistent. Fallen branches, leaning trees, damaged structures, and downed or sagging power lines are reasons to turn around and notify the appropriate authority from a safe location.</p>
<p><a href="https://hazardhunter.georisk.gov.ph/map">HazardHunterPH</a> can support advance awareness of mapped flood, rain-induced landslide, and other hazards. A map is not a live guarantee that an unmarked street is safe, and it does not replace current warnings or an on-site closure. Use it as one planning layer, then confirm the actual route and an alternative.</p>

<h2>Lightning changes the decision immediately</h2>
<p>The National Weather Service states that no place outside is safe when a thunderstorm is in the area. If you hear thunder or see lightning, stop the activity and reach a substantial enclosed building or a hard-topped metal vehicle with the windows closed. Do not remain beneath an isolated tree, beside a metal fence, in an open-sided shelter, under a small roof, or on exposed high ground.</p>
<p>Plan shelter before starting. “There is a waiting shed somewhere” is not enough if it is open-sided or too far away. On an out-and-back route, the safe return time grows with every kilometre. A short loop near an appropriate building provides more options than a long route along a ridge, waterfront, or open field.</p>
<p>After reaching safety, wait at least 30 minutes after the last thunder before reconsidering outdoor activity, consistent with <a href="https://www.weather.gov/safety/lightning-sports">National Weather Service outdoor-sport guidance</a>. Restart only if current official information, local instructions, daylight, route condition, and remaining time also support it. The wait is not a promise that conditions are safe; another storm may develop.</p>

<h2>Never turn floodwater into part of the course</h2>
<p><a href="https://www.pagasa.dost.gov.ph/learning-tools/floods">PAGASA flood guidance</a> advises avoiding areas subject to sudden flooding and warns about water-covered roads and bridges. For running, the simple rule is stronger: do not enter floodwater to maintain a route, save a tracking streak, or finish an event distance.</p>
<p>Appearance is unreliable. Water may be deeper or faster than it looks. It may conceal open drains, sharp objects, displaced covers, unstable pavement, sewage, animals, or energized electrical equipment. A familiar street can behave differently when upstream rain, high tide, blocked drainage, or continuing rainfall changes the flow.</p>
<p>Turn around before becoming surrounded. Do not climb barriers or use railway lines, vehicle lanes, private property, or unstable slopes as improvised detours. If safe passage is no longer available, move away from the water and follow local emergency instructions. A tracking app can be stopped; personal safety cannot be restored by editing the activity later.</p>

<h2>Floodwater exposure is a health issue, not a training test</h2>
<p>The DOH advises avoiding swimming or submerging in contaminated or flood water and washing exposed areas with clean water after contact. Floodwater can be associated with leptospirosis and other health hazards. This article does not diagnose infection or recommend preventive medication.</p>
<p>If exposure occurs, especially through broken skin, or if you later feel unwell, contact a qualified local health professional promptly and describe the exposure accurately. Follow current DOH or local health-office guidance. Do not copy a medicine or dose from social media, another runner, or an old event chat because individual circumstances and current public-health instructions matter.</p>
<p>Wash with clean water as advised, change out of contaminated clothing, and keep the clothing and footwear away from food-preparation or living areas until appropriately cleaned. Seek urgent help through local medical or emergency services for severe or unexplained symptoms.</p>

<h2>Make yourself easier to detect in rain</h2>
<p>Rain and spray can reduce what drivers, cyclists, and other path users see. Dark cloud can create low-light conditions well before sunset, while umbrellas and hoods can obstruct sight lines. WHO pedestrian-safety guidance emphasizes environments that separate pedestrians from traffic and support adequate visibility. Prefer a continuous separated path and marked crossings rather than relying on clothing to make a hazardous road safe.</p>
<p>Bright or fluorescent colors can improve daytime conspicuity. Retroreflective material responds to headlights in darker conditions. An active white or red light, placed appropriately, can add another detection cue. These tools perform different jobs; none creates a protected lane or guarantees a driver will respond.</p>
<p>Cross where sight lines are clear and signals or crossings are available. Pause long enough to confirm that vehicles are actually yielding, especially when wet windscreens and spray are present. Avoid sudden direction changes. If a safe shoulder disappears under water or parked vehicles, choose another route rather than moving into traffic.</p>
<p>Keep enough situational awareness to hear warnings, vehicles, cyclists, dogs, and changing weather. If using headphones, use them responsibly and according to local rules, or remove them when traffic, poor visibility, or weather requires full attention.</p>

<h2>Adjust movement for wet and uncertain surfaces</h2>
<p>Use a controlled effort and give yourself time to read the surface. Shorter, cautious steps may help some runners avoid overreaching on a slick patch, but no technique prevents a fall. Slow before turns, bridges, ramps, painted markings, polished tiles, metal covers, muddy sections, and descents. Walk when that is the more controlled choice.</p>
<p>Choose footwear that fits, has suitable remaining tread for the expected surface, and has already been used comfortably. A trail outsole may help on some soft terrain and feel awkward on wet pavement; a road shoe may be unsuitable for mud. No brand or tread pattern makes algae, oil, loose debris, or floodwater safe.</p>
<p>Socks that remain comfortable when damp, a cap or visor that limits rain in the eyes, and clothing that does not become excessively heavy may improve comfort. Test clothing before event day. Use anti-chafing products only according to their instructions and your own needs; this guide does not prescribe a product or claim it prevents skin injury.</p>

<h2>Protect the phone, watch, and activity record</h2>
<p>“Water resistant” and “waterproof” are not interchangeable promises. Check the manufacturer's current rating and limitations for the exact device, including whether buttons, charging ports, cracked screens, salt water, or high-pressure water change the protection. A simple sealed pouch can protect a phone while still allowing it to be carried, but it may affect touchscreen use or GPS placement.</p>
<p>Before leaving shelter, charge the device, confirm location and activity permissions, select the correct activity type and units, and wait for the recorder to be ready. Test whether screen locking, wet sleeves, or accidental taps can pause or end the activity. Know whether the app can record offline and how it synchronizes later. Do not experiment with a major setting during a deadline-sensitive run.</p>
<p>Rain, tree cover, buildings, and where the device is carried can contribute to noisy GPS traces, but a map discrepancy does not prove one universal cause. Preserve the original activity and its visible date, distance, duration, units, and source. Review the <a href="/blog/best-apps-to-track-your-virtual-run">running-app comparison</a> before choosing a recorder and the <a href="/blog/what-counts-as-valid-run-proof">valid-proof guide</a> before relying on a screenshot.</p>
<p>If the tracker stops, move to a safe location before troubleshooting. Do not stand in a crossing, beneath a tree during thunder, or beside floodwater to rescue an app session. Note what happened, retain the original record, and check the event's correction or support process.</p>

<h2>Rain does not remove heat, humidity, or effort</h2>
<p>A rainy Philippine day can remain warm and humid. Cloud and wet clothing can change how conditions feel without removing the body's workload. Use comfortable breathing and the talk test rather than forcing a normal dry-weather pace. If an easy run no longer feels conversational, slow down, walk, shorten the route, or stop.</p>
<p>Drink and eat in an ordinary way appropriate to the activity, conditions, and qualified personal guidance. This article does not prescribe an exact fluid, electrolyte, or supplement dose. Carrying water is not a reason to continue through a weather warning, and rainwater is not a safe drinking source.</p>
<p>Stop and reach safety for severe or unexplained symptoms, confusion, fainting, chest pain, severe breathing difficulty, loss of coordination, or any condition that makes safe movement uncertain. Contact local medical or emergency services when appropriate. A slower split or unfinished run is not the important problem in that situation.</p>

<h2>Prepare a rainy-season route and backup</h2>
<ol>
  <li><strong>Choose a primary loop.</strong> Prefer a familiar, well-lit, well-drained path with controlled crossings and several safe exits.</li>
  <li><strong>Identify appropriate shelter.</strong> Confirm a substantial enclosed building or hard-topped vehicle is realistically reachable; do not count a tree or open-sided roof.</li>
  <li><strong>Choose a dry alternative.</strong> Identify an indoor track or treadmill and verify whether the event accepts it before the deadline arrives.</li>
  <li><strong>Know the transport plan.</strong> Check whether rain, flooding, or suspended transport could make reaching or leaving the route difficult.</li>
  <li><strong>Share the plan when useful.</strong> Tell a trusted contact the route and expected return, especially for quieter hours or changing weather.</li>
  <li><strong>Set a turn-around rule.</strong> Decide in advance which warning, sound of thunder, visibility change, or water level ends the attempt.</li>
</ol>

<h2>Virtual-run alternatives when outdoor conditions are unsafe</h2>
<p>Read the structured event page rather than assuming “virtual” means any time, any place, or any activity. Some events permit treadmills, walking, split activities, or accumulated distance; others require a particular activity type, date window, minimum distance, or evidence source. Browse <a href="/events">Events</a>, review <a href="/how-it-works">How It Works</a>, and use the <a href="/faq">FAQ</a> when learning the platform.</p>
<p>If the event permits an indoor treadmill, prepare the required final summary and follow its distance and duration rules. If it uses accumulated distance, a shorter approved activity on a safer day may contribute without forcing one long wet outing. The <a href="/blog/how-accumulated-distance-challenges-work">accumulated-distance guide</a> explains why approved distance counts officially while pending distance remains potential progress.</p>
<p>If neither option is accepted, postpone within the activity window or contact the organiser through the published support route before the deadline. Do not assume an extension will be granted. If conditions remain unsafe and no compliant alternative exists, missing the event result is safer than improvising through a warning.</p>
<p>HelloRun can support event-specific registration, external payment-receipt review where applicable, screenshot or supported Strava activity evidence, OCR-assisted field entry, and organiser or admin review. HelloRun does not directly process the external payment transfer, and correct evidence does not guarantee approval. Pending is not approved progress or an official ranked result. Leaderboards and certificates appear only when configured and after the applicable review rules are satisfied.</p>

<h2>Four practical rainy-season scenarios</h2>
<h3>Scenario 1: light rain before an outdoor 5K</h3>
<p>Mara checks PAGASA and her local government channels. There is light rain but no thunderstorm, flood, hazardous-wind, or closure information for her park. She chooses a familiar one-kilometre loop beside a substantial building, wears visible gear, protects her phone, and runs by comfortable effort rather than a target pace. When one corner begins collecting water, she turns before it and shortens the loop. The decision is conditional, not proof that every light-rain 5K is safe.</p>
<h3>Scenario 2: thunder develops during the warm-up</h3>
<p>Paolo hears thunder while near the route entrance. He does not wait for rain to become heavy and does not shelter under the nearest tree. He enters an appropriate enclosed building, ends the outdoor plan, and watches current advisories. He waits at least 30 minutes after the last thunder before even reconsidering, then chooses to go home because another cell may approach.</p>
<h3>Scenario 3: the usual route is flooded</h3>
<p>Ana reaches a street where water covers the curb and part of the sidewalk. She does not step in to measure it, follow another pedestrian, or move into a traffic lane. She turns around while the dry exit remains open and reports the obstruction through the appropriate local channel. The recorded distance is shorter than planned, but the activity can be treated according to the event's rules rather than extended through floodwater.</p>
<h3>Scenario 4: unsafe weather near a virtual-run deadline</h3>
<p>Joel's submission deadline is approaching, but PAGASA and local officials warn of hazardous conditions. He checks the event mechanics. Because the event permits treadmills, he records an indoor activity with the required final summary. If the treadmill had not been accepted, his options would have been an earlier safe activity, organiser support, or no result—not an outdoor attempt that ignores the warning.</p>

<h2>Before-run rainy-season checklist</h2>
<ul>
  <li>Check the current forecast and regional PAGASA products for the complete route.</li>
  <li>Check tropical-cyclone, rainfall, thunderstorm, flood, landslide, and local closure information.</li>
  <li>Confirm the route is open, visible, drained, and easy to shorten.</li>
  <li>Identify appropriate lightning shelter and a transport or exit plan.</li>
  <li>Tell a trusted person the route and expected return when useful.</li>
  <li>Use visible clothing or lights appropriate to the conditions.</li>
  <li>Check footwear condition and avoid relying on untested equipment.</li>
  <li>Protect the phone and confirm the exact device's water-resistance limitations.</li>
  <li>Charge and test the tracker, activity type, units, permissions, and screen lock.</li>
  <li>Review event dates, permitted activities, proof fields, and support route.</li>
</ul>

<h2>During-run decision checklist</h2>
<ul>
  <li>Keep scanning the sky, route, drains, trees, traffic, and visibility.</li>
  <li>Stop for thunder or lightning and move to appropriate shelter.</li>
  <li>Turn around before water blocks the dry exit.</li>
  <li>Do not cross floodwater, fallen wires, barriers, unstable ground, or closed areas.</li>
  <li>Slow or walk before slick turns, markings, covers, slopes, and debris.</li>
  <li>Keep the effort conversational when the plan calls for easy running.</li>
  <li>Move to safety before adjusting the phone, watch, headphones, or clothing.</li>
  <li>End the run when the backup plan is no longer realistic.</li>
</ul>

<h2>Post-run and equipment checklist</h2>
<ul>
  <li>Check in with the person who expected your return.</li>
  <li>Move indoors, change out of wet clothing, and dry yourself comfortably.</li>
  <li>Keep contaminated items separate if floodwater contact occurred.</li>
  <li>Clean and dry footwear and equipment according to manufacturer instructions.</li>
  <li>Do not charge a wet device until its manufacturer says the port and device are ready.</li>
  <li>Review the original activity before editing, cropping, or submitting evidence.</li>
  <li>Record route closures, weather changes, and equipment problems for the next plan.</li>
  <li>Seek qualified care for concerning symptoms or floodwater exposure as appropriate.</li>
</ul>

<h2>Tracker and proof checklist</h2>
<ul>
  <li>Keep the original activity in the source app or device account.</li>
  <li>Confirm date, distance, units, duration, activity type, and source are readable.</li>
  <li>Check whether the event uses moving time, elapsed time, or another field.</li>
  <li>Do not create altered copies to hide a route or distance problem; use the supported privacy and correction process.</li>
  <li>Protect private home locations, profile details, notifications, and health information.</li>
  <li>Use <a href="/blog/how-to-submit-run-proof-correctly-hellorun">the HelloRun proof-submission walkthrough</a> for the current screenshot or Strava flow.</li>
  <li>Remember that OCR assists field entry but is fallible; confirm every extracted value.</li>
  <li>Wait for the review result. A submitted or pending activity is not yet approved.</li>
</ul>

<h2>Rainy-season event checklist</h2>
<ul>
  <li>Compare virtual and onsite implications with the <a href="/blog/virtual-run-vs-traditional-race-which-one-should-you-join">race-format decision guide</a>.</li>
  <li>For a first 5K, use the flexible <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K plan</a> rather than trying to replace missed sessions with one large wet-weather workout.</li>
  <li>Use the <a href="/blog/beginners-guide-to-running-pace">beginner pace guide</a> to adjust by effort instead of forcing a dry-weather number.</li>
  <li>For Philippine registration, payments, dates, and fulfilment, read <a href="/blog/how-to-join-a-virtual-run-philippines">How to Join a Virtual Run in the Philippines</a>.</li>
  <li>Check whether walking, treadmills, route changes, and accumulated activities are permitted.</li>
  <li>Check the final submission deadline separately from the activity end.</li>
  <li>Know how reviewed results appear in <a href="/blog/how-leaderboards-work-virtual-running-events">HelloRun leaderboards</a>.</li>
  <li>Save the organiser's support route and use <a href="/contact">Contact</a> for platform support when appropriate.</li>
</ul>

<h2>Troubleshooting rainy-season runs</h2>
<h3>The forecast changed after I started</h3>
<p>Use the latest condition, not the original forecast, for the next decision. Shorten or end the route while a safe exit remains. For thunder or lightning, reach appropriate shelter immediately.</p>
<h3>My phone screen became unresponsive</h3>
<p>Move to a safe sheltered location before handling it. Do not repeatedly unlock or wipe the phone while standing in traffic or exposed weather. Preserve whatever original activity remains and follow the event's support or correction process.</p>
<h3>GPS added or removed distance</h3>
<p>Keep the original record, compare the visible distance and time fields, and do not manufacture a replacement trace. Device and app readings can differ. Submit through an accepted evidence path or explain the discrepancy when the review flow allows it.</p>
<h3>The route became blocked before I reached the goal</h3>
<p>End or reroute only through a clearly safer, permitted path. Do not use floodwater, private property, live traffic lanes, or a closed area. Whether a shorter activity can count depends on the event format and minimum-distance rules.</p>
<h3>I missed the deadline because of weather</h3>
<p>Use the event's published support channel and explain the situation accurately. An organiser may or may not be able to change the result under the rules. Unsafe weather does not create automatic approval or an automatic deadline extension.</p>

<h2>Frequently asked questions</h2>
<h3>Is running in light rain safe?</h3>
<p>No article can make that universal determination. Light rain may be one factor in a reasonable plan when official information, route condition, visibility, shelter, health, and local instructions support it. Conditions can change quickly.</p>
<h3>Should I run when I hear thunder but see no lightning?</h3>
<p>No. Hearing thunder means the outdoor activity should stop and you should reach appropriate enclosed shelter. Do not wait to see a strike or for rain to intensify.</p>
<h3>Can I cross floodwater if it looks shallow?</h3>
<p>Do not use an estimated depth to justify entering floodwater. Hidden current, holes, debris, contamination, and electrical hazards make appearance unreliable.</p>
<h3>Does every virtual event accept treadmill runs?</h3>
<p>No. The event rules determine whether treadmills, walking, split activities, or particular apps are accepted. Confirm before recording the activity.</p>
<h3>Does walking count if the path becomes slippery?</h3>
<p>Walking can be the controlled choice for personal movement, but whether it counts toward an event depends on the accepted activity types. Safety still comes first.</p>
<h3>Do I need waterproof running shoes?</h3>
<p>Not universally. Fit, grip, drainage, route surface, comfort, and conditions matter. Waterproof construction can also retain water once it enters. No shoe makes floodwater or a hazardous surface safe.</p>
<h3>Can rain ruin my virtual-run proof?</h3>
<p>Rain can affect device use or image readability. Protect the device, retain the original activity, and confirm the required fields. Clear submission improves reviewability but does not guarantee approval.</p>
<h3>Will a pending rainy-season activity appear on the leaderboard?</h3>
<p>Pending is not an approved result. HelloRun leaderboards use approved results or approved accumulated distance according to the event configuration.</p>
<h3>What should I do after accidental floodwater exposure?</h3>
<p>Follow current DOH and local health guidance, wash exposed areas with clean water as advised, and consult a qualified local health professional promptly when appropriate. Seek urgent help for severe or unexplained symptoms.</p>
<h3>Where can I ask about an event rule?</h3>
<p>Use the organiser's support contact shown on the event page. For platform questions, review the <a href="/faq">FAQ</a> or <a href="/contact">contact HelloRun</a>. Read the <a href="/privacy">Privacy Policy</a> before sharing route or health-related information that is not required.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.pagasa.dost.gov.ph/">PAGASA weather services</a> — current forecasts, regional products, advisories, and warnings.</li>
  <li><a href="https://www.pagasa.dost.gov.ph/learning-tools/floods">PAGASA flood guidance</a> — Philippine flood causes, warnings, and safety precautions.</li>
  <li><a href="https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin">PAGASA Tropical Cyclone Bulletins</a> — current cyclone position, hazards, and related guidance.</li>
  <li><a href="https://hazardhunter.georisk.gov.ph/map">HazardHunterPH</a> — location-based hazard awareness for advance planning.</li>
  <li><a href="https://bicol.doh.gov.ph/advisories/leptospirosis/">Department of Health leptospirosis advisory</a> — floodwater avoidance and exposure guidance.</li>
  <li><a href="https://www.weather.gov/safety/lightning-sports">National Weather Service lightning safety for outdoor sports</a> — stopping, shelter, and return guidance.</li>
  <li><a href="https://www.who.int/publications/i/item/9789240072497">World Health Organization pedestrian-safety manual</a> — road environment, separation, crossings, and visibility context.</li>
  <li><a href="/blog/what-counts-as-valid-run-proof">HelloRun valid-proof guide</a> and <a href="/blog/how-to-submit-run-proof-correctly-hellorun">proof-submission guide</a> — event-specific evidence quality and current submission procedure.</li>
</ul>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Rainy-season running in one minute',
  'How this guide was prepared',
  'Understand what “rainy season” does and does not mean',
  'Use a go, change, or stop decision',
  'Check official weather information before the run',
  'Evaluate the route, not just the forecast',
  'Lightning changes the decision immediately',
  'Never turn floodwater into part of the course',
  'Floodwater exposure is a health issue, not a training test',
  'Make yourself easier to detect in rain',
  'Adjust movement for wet and uncertain surfaces',
  'Protect the phone, watch, and activity record',
  'Rain does not remove heat, humidity, or effort',
  'Prepare a rainy-season route and backup',
  'Virtual-run alternatives when outdoor conditions are unsafe',
  'Four practical rainy-season scenarios',
  'Before-run rainy-season checklist',
  'During-run decision checklist',
  'Post-run and equipment checklist',
  'Tracker and proof checklist',
  'Rainy-season event checklist',
  'Troubleshooting rainy-season runs',
  'Frequently asked questions',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/how-it-works',
  '/faq',
  '/contact',
  '/privacy',
  '/blog/how-to-join-a-virtual-run-philippines',
  '/blog/how-to-prepare-for-your-first-virtual-run',
  '/blog/beginner-5k-training-plan-new-runners',
  '/blog/beginners-guide-to-running-pace',
  '/blog/running-safety-tips-early-morning-night-runs',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
  '/blog/how-leaderboards-work-virtual-running-events',
  'pagasa.dost.gov.ph/',
  'pagasa.dost.gov.ph/learning-tools/floods',
  'pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin',
  'hazardhunter.georisk.gov.ph/map',
  'bicol.doh.gov.ph/advisories/leptospirosis',
  'weather.gov/safety/lightning-sports',
  'who.int/publications/i/item/9789240072497'
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
  if (/<h[12]>Running During the Rainy Season in the Philippines<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/floodwater (?:under|below|less than) \\d|safe floodwater depth|run through shallow flood/i.test(text)) errors.push('article must not prescribe a safe floodwater depth');
  if (/rain (?:makes|keeps) (?:every|all) run safe|rain eliminates heat|every device is waterproof/i.test(text)) errors.push('article must not make universal weather or device claims');
  if (/guarantee(?:s|d)? (?:safety|completion|injury prevention)|prevent(?:s|ed)? (?:all )?(?:falls|injuries|illness)/i.test(text)) errors.push('article must not guarantee safety or prevention');
  if (/every event accepts|all events accept|treadmills? (?:are|is) always accepted|walking is always accepted/i.test(text)) errors.push('article must not claim universal event acceptance');
  if (/take (?:doxycycline|antibiotics?)|\\d+\\s*(?:mg|milligrams?)|self-medicate/i.test(text)) errors.push('article must not prescribe medication');
  if (/HelloRun (?:directly )?(?:processes|handles) (?:your |event )?(?:payment|funds)|perfect OCR|every submission is automatically approved/i.test(text)) errors.push('article must not claim unsupported HelloRun behavior');
  if (!/reviewed in July 2026 using documented guidance/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/wait at least 30 minutes after the last thunder/i.test(text)) errors.push('article must state the lightning return interval');
  if (!/Pending is not approved progress/i.test(text)) errors.push('article must distinguish pending evidence');
  if (!/does not directly process the external payment transfer/i.test(text)) errors.push('article must accurately describe external payments');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid rainy-season running payload: ${errors.join('; ')}`);
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
