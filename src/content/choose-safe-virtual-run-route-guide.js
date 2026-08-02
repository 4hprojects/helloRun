'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-choose-a-safe-route-for-your-virtual-run';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Choose a Safe Route for Your Virtual Run',
  excerpt: 'Assess event rules, traffic separation, crossings, surface, weather, flooding, lighting, access to help, privacy, and recording reliability before choosing a route.',
  category: 'Race Tips',
  tags: Object.freeze([
    'running route safety',
    'virtual run route',
    'runner safety',
    'route planning',
    'Philippines running',
    'weather awareness',
    'pedestrian safety',
    'virtual race tips'
  ]),
  seoTitle: 'How to Choose a Safer Route for Your Virtual Run',
  seoDescription: 'Choose a more suitable virtual-run route by checking event rules, traffic, crossings, surface, weather, flooding, lighting, support access, privacy, and recording.',
  coverImageAlt: 'Isometric Philippine city route map comparing a shaded park loop with marked crossings against construction, flooding, and high-traffic alternatives'
});

const RAW_CONTENT_HTML = `
<p>A virtual run lets participants choose where to complete an eligible activity, but that flexibility transfers important decisions to the runner. Distance alone does not make a route suitable. Traffic, crossings, surface, lighting, weather, flooding, isolation, access to help, event rules, and the way an activity will be recorded can all change the decision.</p>
<p>No public route is completely safe, and a route that worked last month may not be appropriate today. Construction can close a sidewalk. Rain can flood a low section. Heat can change exposure. A familiar park can be dark or locked at a different hour. The practical goal is to identify a route whose known risks are manageable under the actual conditions, with a clear alternative when they are not.</p>
<blockquote><strong>The route rule:</strong> choose from what is suitable today, not from what looks fastest on a map. Event completion, pace, and an unbroken GPS line never take priority over a safe decision.</blockquote>

<h2>Route selection in one minute</h2>
<ol>
  <li><strong>Read the event rules.</strong> Confirm distance, activity type, event window, single-activity or accumulated mechanic, treadmill policy, evidence, and any location restriction.</li>
  <li><strong>Start with familiar candidates.</strong> Prefer places you can inspect rather than accepting a suggested line without knowing the crossings, access, and surface.</li>
  <li><strong>Check separation from moving vehicles.</strong> Look for usable sidewalks, paths, low-speed environments, predictable access points, and safe crossing opportunities.</li>
  <li><strong>Inspect surface and continuity.</strong> Find construction, broken pavement, stairs, drainage, loose gravel, narrow sections, dogs, gates, and places that force a runner into traffic.</li>
  <li><strong>Check current conditions.</strong> Use current PAGASA forecasts, thunderstorm advisories, rainfall warnings, and flood information, plus relevant local advisories.</li>
  <li><strong>Match the time of day.</strong> Consider visibility, lighting, traffic, public activity, operating hours, and transport before and after the run.</li>
  <li><strong>Plan access to help.</strong> Know practical exit points, staffed locations, transport, and how a trusted person can understand the general plan without publishing private live-location data.</li>
  <li><strong>Test the route.</strong> Walk or inspect important sections under similar conditions before using it for an event attempt.</li>
  <li><strong>Keep an alternative.</strong> Shorten, move, reschedule, use an allowed treadmill, or choose another activity when the original route no longer fits.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in August 2026 using current Philippine Atmospheric, Geophysical and Astronomical Services Administration products for forecasts, thunderstorms, rainfall, and floods; Philippine Department of Public Works and Highways pedestrian-crossing guidance; US National Highway Traffic Safety Administration pedestrian-safety guidance; and current HelloRun event, evidence, and result-review behavior.</p>
<p>It is general educational guidance, not individualized medical, security, legal, traffic-engineering, weather, or emergency advice. It cannot inspect a route, predict driver behavior, certify a crossing, protect a runner from injury or crime, or assure that an activity will be approved. Conditions can change between planning and arrival.</p>
<p>Use official current alerts, instructions from local authorities and site operators, event-specific rules, and your direct observation. Do not enter a closed, restricted, flooded, unstable, or otherwise unsafe area because a map, previous activity, or article shows a route there. Use appropriate local emergency services when needed.</p>

<h2>Begin with the event rules</h2>
<p>A physically suitable route can still produce ineligible evidence if it conflicts with the event. Before planning, confirm the registered category, required distance, accepted activity type, activity dates, submission dates, named timezone, and whether the goal must be completed in one activity or may be accumulated across several approved activities.</p>
<p>Check whether walking, trail running, treadmill activity, pauses, laps, indoor tracks, or mixed surfaces are accepted. Do not assume “virtual” means every location or activity counts. Read the actual public event page and browse current <a href="/events">Events</a> rather than copying another event’s rules.</p>
<p>For a standard single-activity category, the planned route should support one eligible recording without requiring prohibited transport between segments. For an accumulated challenge, several shorter suitable routes may be more practical if each activity meets the configured rules. The <a href="/blog/how-accumulated-distance-challenges-work">accumulated-distance guide</a> explains how approved activity contributes to progress.</p>
<h3>Separate distance from route length</h3>
<p>A mapped loop advertised as five kilometres may not match a device exactly. GPS estimates, route geometry, turns, signal conditions, and where recording starts and stops can change the result. Do not create an unsafe road crossing or continue into a hazardous area merely to make the display reach the category distance.</p>
<p>Plan a modest operational buffer only when the route remains suitable and the event rules permit it. A buffer is not a requirement to add a universal percentage or to circle an unsafe area. The safer choice can be stopping and attempting again under appropriate conditions.</p>

<h2>List two or three candidate routes</h2>
<p>Do not begin by committing emotionally to one attractive route. List alternatives: a local park loop, a campus or sports complex that permits public use, a familiar neighborhood path, a riverside route outside flood conditions, or an allowed indoor option. Evaluate them using the same questions.</p>
<p>Online maps and activity heatmaps can suggest connections, but they may contain stale paths, informal shortcuts, private roads, closed gates, missing sidewalks, construction, or routes popular with cyclists rather than pedestrians. Popularity does not establish permission or suitability.</p>
<p>A candidate should have a clear start, finish, direction, turnaround or loop, and exit points. Note how you will reach it and return. A route that looks good during the activity may be unsuitable if it leaves a tired runner without safe transport afterward.</p>

<h2>Prioritize separation from moving vehicles</h2>
<p>A usable sidewalk, protected shared path, track, or low-speed environment generally reduces direct exposure compared with running in a vehicle lane, but design and behavior still matter. Check whether the separation continues or ends suddenly at a bridge, driveway, construction site, loading area, or parked-vehicle zone.</p>
<p>NHTSA pedestrian guidance emphasizes using sidewalks when available, crossing at crosswalks or intersections, staying alert for turning vehicles, and watching driveways and parking areas. Its advice is written for a US context, so local road rules and conditions still apply, but the hazard patterns are broadly useful.</p>
<h3>When there is no sidewalk</h3>
<p>Do not treat a painted road edge as an automatic running lane. Consider vehicle speed, shoulder width and condition, curves, lighting, drainage, parked vehicles, barriers, and escape space. NHTSA advises pedestrians without a sidewalk to face traffic and stay as far from traffic as possible, but a road can remain unsuitable even when that orientation is used.</p>
<p>A narrow high-speed road, blind curve, bridge without pedestrian space, or shoulder blocked by vehicles or debris is a strong reason to choose another route. Visibility clothing cannot create missing infrastructure.</p>
<h3>Driveways and parking areas</h3>
<p>Drivers entering, exiting, or reversing may look toward other vehicles rather than a runner. Slow down, remain visible, and do not assume eye contact or a turn signal guarantees that a driver has seen you or will yield. Avoid weaving behind reversing vehicles to protect pace.</p>

<h2>Audit every crossing</h2>
<p>A five-kilometre route can contain dozens of conflict points. Count crossings rather than looking only at total distance. Identify signalized crossings, marked pedestrian crossings, minor driveways, unsignalized side streets, wide roads, slip lanes, rail crossings, and places where the path changes sides.</p>
<p>DPWH guidance sets standards for pedestrian crossing markings along Philippine national roads, while accessibility rules address features such as perpendicular crossings, narrower crossing locations, refuge islands, and dropped sidewalks. The presence of paint alone does not remove risk; inspect sight lines, signal behavior, vehicle speed, and whether the crossing remains accessible.</p>
<h3>Crossing questions</h3>
<ul>
  <li>Can a runner and driver see each other with enough time to respond?</li>
  <li>Does traffic turn across the crossing?</li>
  <li>Is the signal phase long enough for the participant’s movement needs?</li>
  <li>Is there a usable curb ramp or level transition where needed?</li>
  <li>Does water, construction, parking, or a vendor block the approach?</li>
  <li>Would the crossing be harder in darkness, rain, or heavy traffic?</li>
  <li>Is there a simpler route with fewer major crossings?</li>
</ul>
<p>Stop as needed. Do not dart through a gap because a watch is running. Elapsed time and pace are secondary to completing the crossing safely.</p>

<h2>Inspect surface, width, and continuity</h2>
<p>Surface risk is more than whether a route is paved. Look for potholes, lifted slabs, metal covers, loose gravel, mud, moss, wet paint, leaves, roots, steps, steep curb transitions, drainage channels, temporary cables, construction plates, and abrupt narrowing. A smooth route in dry weather can become slippery or hidden under water.</p>
<p>Check whether the path is wide enough for the expected number of walkers, runners, cyclists, children, pets, vendors, and mobility-device users. Plan to slow down and yield rather than treating others as obstacles. A busy shared path may be suitable at one time and congested at another.</p>
<h3>Construction and temporary closures</h3>
<p>Barriers and closure signs override the planned line. Do not move fencing, enter a work zone, or run in traffic to bypass a closed sidewalk. If a detour cannot be inspected safely, use the alternative route. Construction schedules can change quickly, so a route check several weeks earlier is not enough for event day.</p>
<h3>Stairs, slopes, and elevation</h3>
<p>Elevation changes effort, speed, visibility, and footing. Steep descents can be demanding even when climbing feels manageable. Stairs may be inaccessible or unsuitable for the intended activity. Confirm that the route matches current preparation and any event description; do not select hills solely to make a map look impressive.</p>

<h2>Check PAGASA forecasts and active warnings</h2>
<p>PAGASA provides public weather forecasts, severe-weather bulletins, thunderstorm alerts, rainfall warnings, and flood advisories. Check the products relevant to the route and region close to the planned time, not only a generic weather icon saved the previous day. Continue monitoring because thunderstorms and heavy rain can develop or affect nearby areas.</p>
<p>A favorable forecast does not guarantee a dry or safe route. Local drainage, river level, tide, dam operations, landslide exposure, and street conditions can differ within a forecast area. Use local government and site-specific advisories where available.</p>
<h3>Thunderstorms and lightning</h3>
<p>PAGASA thunderstorm advisories can include rain showers, lightning, strong winds, flash-flood and landslide impacts, and instructions to monitor updates. Do not begin or continue an exposed outdoor route when an active warning or observed conditions make it unsuitable. A tree, waiting shed, or open gazebo is not automatically a safe lightning shelter.</p>
<p>Build rescheduling flexibility into a virtual run. A deadline should not turn a thunderstorm into a running window. If the event offers several days, use them. If it does not, contact the organizer rather than inventing a late or altered submission.</p>
<h3>Heavy rain and flooding</h3>
<p>PAGASA operates rainfall and flood warning services, and its flood learning material recommends knowing the community warning system. Avoid low crossings, underpasses, riverbanks, drainage channels, slopes, and roads with known rapid flooding when rain or warnings raise concern.</p>
<p>Do not enter moving or unknown-depth floodwater. Water can hide holes, debris, current, contamination, and electrical hazards. A flooded route is not made acceptable by waterproof shoes or a saved map.</p>
<h3>Heat and sun exposure</h3>
<p>Route shade, reflected heat, surface temperature, water access, time of day, and distance between exit points affect exposure. PAGASA publishes computed and forecast heat-index information. Use current official information and the broader <a href="/blog/how-to-run-safely-during-hot-and-humid-weather">hot and humid weather guide</a>.</p>
<p>Do not choose a route with no practical exit merely because it is flat. Reduce, reschedule, move indoors when allowed, or choose another route when conditions exceed what is appropriate for you.</p>

<h2>Match the route to the actual time of day</h2>
<p>Inspect a route at the time you expect to use it. A quiet road at Sunday sunrise may be a loading zone on Monday evening. A park gate may close before the planned finish. A crossing may have different traffic or signal behavior during rush hour. Lighting may not cover the whole loop.</p>
<p>For low-light use, check continuous lighting, contrast at surface changes, visibility at crossings, vehicle headlights, public activity, operating hours, and reliable transport. Reflective or illuminated equipment can improve conspicuity but cannot correct an unsuitable road or guarantee that a driver will see you.</p>
<p>The <a href="/blog/running-safety-tips-early-morning-night-runs">low-light safety guide</a> covers visibility, awareness, and communication in more detail. Choose daylight when it materially simplifies the risks.</p>

<h2>Choose a format: loop, out-and-back, or point-to-point</h2>
<h3>Loop</h3>
<p>A loop can keep the runner near a base point and make water, toilets, transport, and an early exit easier. Repeated short loops may become crowded or mentally tiring, and tight turns can affect movement and GPS. Confirm that laps are allowed and that the path is open for repeated use.</p>
<h3>Out-and-back</h3>
<p>An out-and-back simplifies navigation and lets the runner inspect the return surface on the way out. The turnaround must be suitable and visible. Going too far before reassessing conditions can leave a long return with no alternative.</p>
<h3>Point-to-point</h3>
<p>A point-to-point route can avoid repetition but needs reliable transport and a safe finish area. Do not assume a pickup can reach the finish. Consider what happens if the activity ends early, weather changes, or the participant misses the planned transport.</p>
<p>No format is universally best. Choose the one that reduces uncertainty for the particular runner, distance, conditions, and support plan.</p>

<h2>Plan access to help and an early exit</h2>
<p>A suitable route has more than a start and finish. Mark staffed or public places, transport stops, toilets where available, water access, and points where the route can be shortened without entering traffic or private property. Remote trails require different skills, equipment, permissions, and response planning than an urban park loop.</p>
<p>Tell a trusted person the general route and expected window when appropriate, especially for a solo outing. Agree on what they should do if plans change. Do not rely entirely on live tracking, which can fail through battery, signal, permissions, or service issues.</p>
<p>Carry identification and emergency information in a form appropriate to your privacy needs and local practice. Keep the phone sufficiently charged if it is part of the plan, but maintain environmental awareness rather than watching the screen while moving.</p>

<h2>Protect privacy when planning and sharing routes</h2>
<p>A public activity map can reveal a home, workplace, school, routine, or frequent start time. Begin and end away from a sensitive exact location when practical, review platform privacy controls, and avoid publishing a predictable solo schedule. A screenshot used as proof should contain the event-required information without unnecessary private details.</p>
<p>Sharing a live location with a chosen trusted contact is different from making it public. Confirm who can access the link, how long it remains available, and whether the service saves route history. Do not pressure another runner to share continuous location publicly as a condition of informal participation.</p>
<p>HelloRun’s <a href="/privacy">Privacy Policy</a> and <a href="/data-usage-policy">Data Usage Policy</a> describe platform handling. Event organizers must also explain their own legitimate data needs and public-result rules.</p>

<h2>Test the route before event day</h2>
<p>Walk or cover key parts under similar timing and weather where possible. A map review cannot reveal every blocked curb, aggressive dog, deep puddle, dark section, traffic turn, surface defect, or closed gate. Testing also shows whether the planned distance forces an awkward extra segment.</p>
<h3>Route-test checklist</h3>
<ul>
  <li>Confirm public access and opening hours.</li>
  <li>Inspect every major crossing and path transition.</li>
  <li>Check construction, drainage, surface, width, and lighting.</li>
  <li>Identify toilets, water, transport, staffed points, and exits where relevant.</li>
  <li>Observe traffic and crowd patterns at the intended time.</li>
  <li>Check device signal behavior without assuming it will remain identical.</li>
  <li>Confirm the route does not require private, closed, or restricted access.</li>
  <li>Note a shorter alternative and a completely separate backup.</li>
</ul>
<p>Testing is not certification. Recheck current conditions before the actual activity.</p>

<h2>Plan recording without letting the device lead</h2>
<p>Choose a supported recording method and test it before the event. Wait for the expected outdoor location lock where applicable, use the correct activity profile, and understand pause settings. Preserve the original record. For evidence requirements, read <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a>.</p>
<p>GPS can drift around tall buildings, trees, bridges, tunnels, switchbacks, and tight loops. A poor signal does not justify stepping into a road to “fix” the track. If tracking stops, move to a suitable place before troubleshooting and use the <a href="/blog/what-to-do-when-gps-tracking-stops-during-a-run">GPS interruption guide</a>.</p>
<p>Do not edit distance, route, or timestamps to make an unsafe or incomplete attempt appear eligible. Submit accurate evidence and use the published review or correction process.</p>

<h2>Know when an indoor alternative is better</h2>
<p>An indoor track or treadmill can remove some traffic and weather exposure, but it introduces different access, equipment, crowding, and recording questions. It is only an event alternative when the rules accept it. Confirm operating hours, permission, machine condition, and how distance will be evidenced.</p>
<p>Use the <a href="/blog/how-to-record-a-treadmill-run-for-a-virtual-event">treadmill guide</a> when applicable. Do not assume that an indoor activity is automatically safer for every person or that treadmill distance will match a watch.</p>

<h2>How route choice appears in HelloRun evidence</h2>
<p>HelloRun does not certify a route as safe. Event pages provide the configured rules, and runners remain responsible for choosing appropriate conditions and following applicable instructions. A route visible in submitted evidence does not prove that every part was permitted or suitable.</p>
<p>Depending on the workflow, participants can submit accepted screenshot evidence or supported connected activity data. Screenshot entry may use optical character recognition assistance, but the runner must verify distance, duration, date, activity type, and other required fields. Connected data is still evaluated against event eligibility.</p>
<p>Recorded and submitted activity is not automatically official. Pending evidence awaits the applicable checks. Approved evidence contributes according to the event rules; rejected evidence does not. A route choice, familiar map, or complete GPS line provides no assurance of approval.</p>

<h2>Three route-choice scenarios</h2>
<h3>Scenario 1: the shortest route has the worst crossing</h3>
<p>Mara compares a direct neighborhood route with a park loop. The direct line is shorter but crosses a fast multi-lane road without a comfortable crossing at her intended time. The park requires travel to the entrance and an extra partial loop, but it provides a separated path, marked crossings, public activity, and easier exits. She chooses the park and confirms its opening hours rather than optimizing only for distance.</p>
<h3>Scenario 2: rain changes a familiar riverside path</h3>
<p>Joel has used a riverside route many times. PAGASA advisories and local conditions indicate heavy rain and possible flooding. Familiarity does not remove the low-section risk. He postpones within the event window and keeps an allowed indoor alternative. He does not enter water to preserve the original schedule.</p>
<h3>Scenario 3: a quiet route becomes isolated after dark</h3>
<p>Lea’s shaded morning route has incomplete lighting and little public activity in the evening. Work delays her planned start. Instead of assuming reflective clothing solves the change, she moves to a shorter well-used loop with continuous lighting and tells her trusted contact the revised general plan.</p>
<p>These examples show a decision process, not a declaration that parks, riversides, indoor venues, or lit routes are always suitable.</p>

<h2>A copyable route assessment</h2>
<ul>
  <li><strong>Event fit:</strong> distance, activity type, timing, location, single or accumulated mechanic, treadmill rule, and evidence.</li>
  <li><strong>Access:</strong> public permission, opening hours, transport, start and finish, and early exits.</li>
  <li><strong>Traffic:</strong> separation, speed, shoulder, driveways, parking movements, bridges, and blind curves.</li>
  <li><strong>Crossings:</strong> count, visibility, markings, signals, turning traffic, curb access, and alternatives.</li>
  <li><strong>Surface:</strong> continuity, drainage, construction, defects, slopes, steps, width, and congestion.</li>
  <li><strong>Weather:</strong> current forecast, thunderstorm and rainfall warnings, flood and local advisories, heat, and shade.</li>
  <li><strong>Time:</strong> daylight, lighting, traffic pattern, crowd pattern, site schedule, and transport after finishing.</li>
  <li><strong>Support:</strong> staffed places, water and toilets where relevant, communication, trusted contact, and emergency access.</li>
  <li><strong>Privacy:</strong> sensitive start or finish points, public activity-map settings, and unnecessary proof details.</li>
  <li><strong>Recording:</strong> supported device, battery, signal limitations, pause behavior, and original-record preservation.</li>
  <li><strong>Alternative:</strong> shorter route, different time, different location, permitted indoor option, or reschedule plan.</li>
</ul>
<p>For each line, mark “acceptable today,” “needs a change,” or “do not use.” Do not average a critical hazard away with several convenient features. A flooded underpass is not balanced by good shade elsewhere.</p>

<h2>Final route checklist</h2>
<ul>
  <li>The route matches my registered event category and activity rules.</li>
  <li>I checked the current activity and submission windows in the named timezone.</li>
  <li>I inspected the route rather than relying only on a suggested map line.</li>
  <li>I identified vehicle exposure, driveways, bridges, and every major crossing.</li>
  <li>The surface and path continuity are suitable under current conditions.</li>
  <li>I checked current PAGASA and relevant local information near the planned time.</li>
  <li>I know where flooding, construction, closure, or darkness would invalidate the plan.</li>
  <li>I have practical exit points and a separate alternative.</li>
  <li>A trusted person can understand the general plan when appropriate without unnecessary public location sharing.</li>
  <li>My recording method is tested, but it will not control a safety decision.</li>
  <li>I will stop, reroute, move, or reschedule if conditions change.</li>
  <li>I understand that no checklist can certify a public route as completely safe.</li>
</ul>

<h2>Your practical next step</h2>
<p>Choose two candidate routes and complete the assessment for both. Inspect their crossings, continuity, exits, opening hours, and conditions at the intended time. Check current PAGASA and local information again before the activity. Keep the better candidate and one genuine fallback.</p>
<p>If neither route remains suitable, change the time, location, distance or event category where permitted, use an accepted indoor option, or postpone within the rules. A virtual run is flexible precisely so the route can respond to real conditions.</p>

<h2>Sources and review notes</h2>
<p><strong>Official and platform sources:</strong> route-weather and pedestrian principles come from the official sources below; HelloRun descriptions come from current application behavior and policies.</p>
<ul>
  <li><a href="https://www.pagasa.dost.gov.ph/products-and-services">PAGASA: Products and Services, including forecasts, thunderstorm alerts, rainfall warnings, and flood advisories</a>.</li>
  <li><a href="https://www.pagasa.dost.gov.ph/learning-tools/floods">PAGASA: Flood learning information</a>.</li>
  <li><a href="https://www.nhtsa.gov/road-safety/pedestrian-safety">US National Highway Traffic Safety Administration: Pedestrian Safety</a>.</li>
  <li><a href="https://www.dpwh.gov.ph/dpwh/sites/default/files/issuances/DO_062_S2011.pdf">Philippine Department of Public Works and Highways: Guidelines for pedestrian crossing markings along national roads</a>.</li>
</ul>
<p>Sources and HelloRun behavior were reviewed in August 2026. Current official warnings, local instructions, closures, and event-specific rules take precedence over examples in this guide.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Route selection in one minute',
  'How this guide was prepared',
  'Begin with the event rules',
  'Prioritize separation from moving vehicles',
  'Audit every crossing',
  'Check PAGASA forecasts and active warnings',
  'Plan access to help and an early exit',
  'Protect privacy when planning and sharing routes',
  'How route choice appears in HelloRun evidence',
  'A copyable route assessment',
  'Final route checklist',
  'Your practical next step',
  'Sources and review notes'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/privacy"',
  'href="/data-usage-policy"',
  'href="/blog/how-accumulated-distance-challenges-work"',
  'href="/blog/how-to-run-safely-during-hot-and-humid-weather"',
  'href="/blog/running-safety-tips-early-morning-night-runs"',
  'href="/blog/what-counts-as-valid-run-proof"',
  'href="/blog/what-to-do-when-gps-tracking-stops-during-a-run"',
  'href="/blog/how-to-record-a-treadmill-run-for-a-virtual-event"'
]);

function buildArticlePayload({ coverImageUrl } = {}) {
  const contentHtml = sanitizeHtml(RAW_CONTENT_HTML);
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
  if (wordCount < 3200) errors.push('article must contain at least 3200 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('cover artwork is required for publication');
  if (/<h1\b/i.test(payload.contentHtml)) errors.push('body must not contain a page-level h1');
  if (/<h[12]>How to Choose a Safe Route for Your Virtual Run<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/this route is completely safe|guaranteed safe route|guarantees? (?:safety|approval|completion)|prevents? (?:all )?(?:injury|crime|crash)/i.test(text)) errors.push('article must not guarantee route safety or outcomes');
  if (/a forecast guarantees|no warning means (?:no risk|safe weather)|favorable forecast means safe/i.test(text)) errors.push('article must not overstate forecasts');
  if (/enter (?:moving|unknown.depth) floodwater|run through floodwater|floodwater is safe/i.test(text)) errors.push('article must not endorse entering floodwater');
  if (/visibility (?:gear|clothing) (?:makes|keeps) (?:a )?road safe|drivers? will always see/i.test(text)) errors.push('article must not guarantee visibility');
  if (/every event accepts|all virtual runs accept|treadmills? (?:are|is) always accepted/i.test(text)) errors.push('article must not claim universal event acceptance');
  if (/pending (?:evidence|activity|distance) (?:counts|is counted) (?:as )?(?:official|approved)|pending evidence completes/i.test(text)) errors.push('article must not count pending evidence officially');
  if (/every submission is automatically approved|automatic approval is guaranteed/i.test(text)) errors.push('article must not promise automatic approval');
  if (!/reviewed in August 2026 using current Philippine Atmospheric/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/No public route is completely safe/i.test(text)) errors.push('article must state the route-safety limitation');
  if (!/Pending evidence awaits the applicable checks/i.test(text)) errors.push('article must distinguish pending evidence');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid safer virtual-run route payload: ${errors.join('; ')}`);
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
