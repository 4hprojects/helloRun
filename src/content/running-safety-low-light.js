'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'running-safety-tips-early-morning-night-runs';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'Running Safety Tips for Early Morning and Night Runs',
  excerpt: 'Plan safer low-light runs with practical guidance on routes, visibility, traffic, weather, personal security, emergency preparation, and virtual run deadlines.',
  category: 'Training',
  tags: Object.freeze([
    'running safety',
    'night running',
    'morning running',
    'reflective gear',
    'runner visibility',
    'road safety',
    'weather safety',
    'virtual running'
  ]),
  seoTitle: 'Running Safety Tips for Early Morning and Night Runs',
  seoDescription: 'Early-morning and night running safety tips for visibility, traffic, weather, personal security, emergency planning, and safer virtual run completion.',
  coverImageAlt: 'Runner in reflective clothing carrying a light on a well-lit path at dawn, contrasted with an isolated dark route'
});

const RAW_CONTENT_HTML = `
<p>Running before sunrise or after dark can make training fit around work, school, family, or hot daytime weather. It also changes what you can see, how quickly drivers can detect you, which places are open, and how easily you can get help if something goes wrong.</p>
<p>A safer low-light run starts before you leave. Choose a route that gives you options, make yourself easier to detect, check the conditions, tell someone your plan, and be willing to postpone the activity. No event deadline, streak, or leaderboard position is worth continuing when the route or conditions are unsafe.</p>

<h2>Quick go or no-go check</h2>
<p>Before starting, ask these questions:</p>
<ul>
  <li>Is the route legal, familiar, sufficiently lit, and open at this hour?</li>
  <li>Can I use a sidewalk, protected path, track, or other space separated from moving traffic?</li>
  <li>Can drivers, cyclists, and other path users detect me from more than one direction?</li>
  <li>Are the weather, air quality, surface conditions, and local alerts acceptable?</li>
  <li>Does someone know where I am going and when I expect to return?</li>
  <li>Do I have identification, a charged phone or another way to call for help, and a simple exit plan?</li>
  <li>Do I feel well enough to run, without concerning symptoms?</li>
</ul>
<blockquote><strong>Make it a no-go</strong> if you cannot answer an important safety question, hear thunder, encounter flooding or dangerous traffic, feel threatened, or develop concerning symptoms. Move the run, shorten it, use an allowed indoor alternative, or try another day.</blockquote>

<h2>How this guide was prepared</h2>
<p>This article is general educational guidance, not individualized medical, legal, security, or emergency advice. It was prepared from road-safety, runner-safety, weather, environmental-health, and exercise-health guidance available in July 2026. Sources include the World Health Organization, national road and weather agencies, the Road Runners Club of America, CDC, EPA, and NHS health providers.</p>
<p>Traffic rules, road design, crime risks, weather alerts, air-quality systems, and emergency numbers differ by country and community. Follow local law and official local instructions. The steps below can reduce exposure to common hazards, but reflective gear, route sharing, lights, and other precautions cannot guarantee safety.</p>

<h2>1. Build a route around safety, not distance</h2>
<p>A route that feels comfortable in daylight may be very different before dawn or late at night. Shops may be closed, a park gate may be locked, lighting may stop abruptly, and a quiet shortcut may become isolated. Preview a new route in daylight before relying on it in low light.</p>
<h3>Prefer separation from traffic</h3>
<p>Use sidewalks, protected paths, running tracks, and well-maintained shared paths when they are available and permitted. A well-lit road is not automatically pedestrian-friendly. Look for controlled crossings, manageable driveway traffic, an even surface, and room to move away from danger.</p>
<p>If no sidewalk or protected path exists, follow local pedestrian law. Guidance in several countries advises pedestrians to travel facing approaching traffic when they must be beside a road, because that can help them see vehicles coming. This is not a universal substitute for local rules or a reason to run on a road that feels unsafe. Stay as far from moving vehicles as legally and practically possible.</p>
<h3>Reduce difficult crossings</h3>
<p>Cross at marked crossings or intersections where available. Pause long enough to confirm that turning and approaching drivers have actually stopped; eye contact alone does not prove that a driver has seen you. Watch driveways, parking exits, delivery areas, and vehicles reversing across the path.</p>
<h3>Keep an exit option</h3>
<p>Choose a loop or out-and-back route that lets you shorten the activity without becoming stranded. Identify open, staffed, or populated places where you could wait, call someone, or get help. Avoid routes that depend on one locked gate, one unstaffed trail, or a crossing that may become impassable.</p>

<h2>2. Understand visibility: bright is not the same as reflective</h2>
<p>Bright or high-contrast clothing can help in some conditions, especially around dawn and dusk. At night, retroreflective material is more useful because it returns light toward its source, such as a vehicle's headlights. Active lights produce their own light. These tools serve different purposes and can be used together.</p>
<ul>
  <li><strong>Retroreflective details:</strong> Place them where movement helps identify a person, such as the wrists, ankles, shoes, or lower legs, as well as on the torso.</li>
  <li><strong>Front light:</strong> A headlamp or chest light can reveal uneven pavement, debris, potholes, animals, and low branches.</li>
  <li><strong>Rear or side light:</strong> A red or contrasting light can improve detection from directions your front beam does not cover.</li>
  <li><strong>Spare power:</strong> Charge rechargeable lights and know their realistic runtime. Carry a small backup on longer or remote routes.</li>
</ul>
<p>Angle a strong beam toward the path rather than into other people's eyes. Avoid assuming that a driver has detected you simply because you can see the vehicle. Visibility aids improve detectability; they do not compensate for speeding, distraction, poor road design, or unsafe crossings.</p>

<h2>3. Protect your awareness</h2>
<p>Low-light running requires you to notice engines, bicycles, footsteps, dogs, changing weather, and people approaching from outside your field of view. Keep enough hearing and attention available to respond.</p>
<ul>
  <li>Consider running without headphones near traffic, at crossings, or in isolated areas.</li>
  <li>If you use audio, keep it low enough to hear your surroundings and comply with local rules and event policies.</li>
  <li>Do not read messages, change playlists, or study the tracking screen while crossing a road.</li>
  <li>Pause in a safe place before using your phone or adjusting equipment.</li>
  <li>On shared paths, keep to the locally expected side and signal before passing.</li>
</ul>
<p>Noise-cancelling and high-volume audio can reduce awareness even when only one earbud is used. There is no headphone setting that makes an otherwise unsafe road safe.</p>

<h2>4. Make a check-in and emergency plan</h2>
<p>Tell a trusted person your general route, start time, and expected return time. Agree on what they should do if you miss the check-in. For a group run, decide whether anyone may leave alone and how the group will account for every participant.</p>
<h3>Carry the essentials you can use</h3>
<ul>
  <li>Identification and relevant emergency information.</li>
  <li>A charged phone or connected device that works in the area.</li>
  <li>The local emergency number saved or known before the run.</li>
  <li>A payment method or transport option if you need to stop far from home.</li>
  <li>Any medication or emergency item prescribed for you, carried according to professional advice.</li>
</ul>
<p>Location sharing can help a trusted contact, but it depends on battery, signal, permissions, and a person actually monitoring it. Treat it as one layer, not a rescue guarantee. Keep enough battery for communication rather than using every feature at maximum brightness.</p>

<h2>5. Respond early to personal-security concerns</h2>
<p>Harassment, stalking, assault, and threatening behaviour are the responsibility of the person causing harm, not the runner. Route and check-in choices may reduce exposure or improve access to help, but they do not transfer blame to someone targeted while exercising.</p>
<p>If a person, vehicle, or situation makes you feel unsafe, change direction, move toward a populated or staffed place, contact someone you trust, or call local emergency services when needed. Do not continue solely to preserve your recorded route or pace. Recording evidence may be useful in some circumstances, but reaching safety comes first.</p>
<ul>
  <li>Run with a trusted person or established group when that is the safer option.</li>
  <li>Avoid publishing a predictable live routine to a broad audience.</li>
  <li>Review who can see your activity start point, finish point, and live location.</li>
  <li>Do not confront someone or enter an isolated area to recover dropped property.</li>
  <li>Report an incident through the appropriate local channel once you are safe.</li>
</ul>

<h2>6. Check weather, flooding, heat, and air quality</h2>
<p>Running early or late may avoid the warmest part of the day, but the clock alone does not make conditions safe. Check an official local forecast and current alerts shortly before leaving.</p>
<h3>Thunder and lightning</h3>
<p>If you hear thunder, stop the outdoor activity and reach a substantial enclosed building or a hard-topped enclosed vehicle. Open shelters, trees, porches, and covered benches are not reliable lightning protection. Weather agencies advise waiting at least 30 minutes after the last thunder before resuming outdoor activity.</p>
<h3>Heat and humidity</h3>
<p>High humidity can make heat harder to manage even before sunrise or after sunset. Adjust pace and duration, choose lighter clothing, and use an appropriate hydration plan. CDC guidance for athletes says to stop activity and reach a cool place if you feel faint or weak. Seek prompt medical help for suspected heat illness.</p>
<h3>Flooding, rain, and wind</h3>
<p>Do not enter floodwater or a closed route. Water can hide holes, sharp objects, unstable surfaces, and moving currents. Rain also reduces traction and driver visibility. Strong winds can bring falling branches, debris, or unstable signs. Postpone the run when official warnings or conditions make the route unsafe.</p>
<h3>Air quality</h3>
<p>Check the local air-quality index or public-health guidance when smoke, haze, ozone, or pollution is a concern. Advice varies with the pollutant, alert level, personal health, activity intensity, and exposure time. Reduce intensity or duration, relocate, reschedule, or move indoors when local guidance recommends it. People with heart or lung conditions and other higher-risk groups should follow their clinician's advice.</p>

<h2>7. Watch the surface, animals, and other path users</h2>
<p>A front light is not only for being seen. Scan far enough ahead to avoid potholes, lifted pavement, loose gravel, wet paint, cables, branches, and construction barriers. Slow down where the surface changes and do not assume every obstacle will be marked.</p>
<p>Give unfamiliar animals space. Do not approach wildlife or a loose dog to protect your pace or route line. On shared paths, expect walkers, runners, cyclists, scooters, maintenance vehicles, and people whose visibility may also be limited. Make predictable movements and pass only when there is enough room.</p>

<h2>8. Know when to stop for physical symptoms</h2>
<p>General fatigue from a normal run is not the same as a warning sign, but an online article cannot determine the cause of a symptom. Stop exercising and move to a safe place if you become light-headed, dizzy, faint, unusually weak, confused, or develop chest pain, uncomfortable breathing, or another sudden concerning symptom.</p>
<p>Contact local emergency services for severe, persistent, or emergency symptoms. Seek medical advice before resuming if symptoms are new, unexplained, or recurring. If you have a diagnosed condition or an individualized action plan, follow the instructions from your qualified healthcare professional.</p>
<p>Do not attempt to diagnose a symptom from a pace chart, heart-rate reading, or this guide. A wearable alert can be useful information, but it does not replace professional assessment.</p>

<h2>9. Adjust the virtual run instead of forcing it</h2>
<p>Virtual events are flexible only within their published rules. Before event day, check whether walking, treadmills, indoor tracks, multiple activities, or accumulated distance are accepted.</p>
<ul>
  <li>Reschedule within the event window when the planned route is unsafe.</li>
  <li>Use daylight hours or a staffed indoor venue when the rules allow it.</li>
  <li>Split an accumulated target across shorter, safer sessions.</li>
  <li>Choose an alternate route rather than entering floodwater, heavy traffic, an unlit area, or a closed path.</li>
  <li>Contact the organiser before the deadline if unsafe conditions affect completion.</li>
</ul>
<p>Browse the current <a href="/events">HelloRun events</a> and read <a href="/how-it-works">How HelloRun Works</a> before choosing an activity. The event page, not a general blog article, controls which alternatives count.</p>

<h2>10. Protect your privacy after the run</h2>
<p>A route map can expose a home, school, workplace, or repeated schedule. Before posting or submitting proof, review the tracking app's privacy settings and the event's required fields. If the organiser accepts a screenshot, keep the required date, distance, duration, activity type, and source visible while avoiding unnecessary personal details.</p>
<p>Do not alter performance data or conceal a field required for review. For app and route-sharing considerations, read <a href="/blog/best-apps-to-track-your-virtual-run">Best Apps to Track Your Virtual Run</a>. If a requirement is unclear, consult the <a href="/faq">FAQ</a> or <a href="/contact">contact HelloRun support</a>.</p>

<h2>Before-you-leave checklist</h2>
<ul>
  <li>Route checked in daylight and legal at the planned time.</li>
  <li>Sidewalk, protected path, track, or safest locally permitted position chosen.</li>
  <li>Weather alerts, lightning risk, heat, flooding, and air quality checked.</li>
  <li>Retroreflective details and appropriate front, rear, or side lighting ready.</li>
  <li>Phone, watch, and lights charged; identification carried.</li>
  <li>Trusted contact knows the plan and expected return time.</li>
  <li>Audio settings will preserve awareness.</li>
  <li>Shortening, transport, shelter, and emergency options identified.</li>
</ul>

<h2>After-the-run checklist</h2>
<ul>
  <li>Complete the agreed check-in.</li>
  <li>Cool down in a safe, visible place rather than at the road edge.</li>
  <li>Note failed lights, route closures, threatening incidents, or surface hazards before the next run.</li>
  <li>Review the activity map's privacy before sharing it.</li>
  <li>Save clear proof and submit only the details required by the event.</li>
</ul>

<h2>Frequently asked questions</h2>
<h3>Is bright clothing enough for running at night?</h3>
<p>No single clothing choice is enough. Bright colours can provide contrast in some light, while retroreflective material returns headlight illumination and active lights produce their own light. Combine appropriate visibility tools with a safer route and cautious crossing decisions.</p>
<h3>Should I run facing traffic?</h3>
<p>Use a sidewalk or protected path first where available. If you must travel beside a road, follow local law and official local guidance. Some authorities advise facing approaching traffic so you can see vehicles, but road layout and legal requirements vary.</p>
<h3>Can I wear one earbud?</h3>
<p>One earbud may still reduce awareness, especially with noise cancellation or high volume. Near traffic, at crossings, or in isolated areas, going without audio is the safer default. Follow local rules and event policies.</p>
<h3>Do I need a headlamp on a lit route?</h3>
<p>Street lighting can be uneven or fail to reveal surface hazards. A suitable light can help you see and be detected, but its beam should not blind other path users. Match the equipment to the route and conditions.</p>
<h3>Is sharing my live location enough?</h3>
<p>No. Live sharing can fail because of signal, battery, permissions, or lack of monitoring. Combine it with a trusted contact, expected return time, identification, a charged device, and an exit plan.</p>
<h3>What if I cannot safely finish before a virtual-run deadline?</h3>
<p>Stop and contact the organiser. Ask whether the rules allow rescheduling within the event window, an indoor activity, walking, or accumulated sessions. Do not enter unsafe conditions to preserve a result.</p>
<h3>How should a beginner prepare?</h3>
<p>Start with a manageable route and duration in daylight, then learn the route and equipment before using them in low light. The <a href="/blog/beginner-5k-training-plan-new-runners">Beginner 5K Training Plan</a> provides a gradual starting framework, but personal health questions belong with a qualified professional.</p>

<h2>Final takeaway</h2>
<p>A safer early-morning or night run is built from several layers: a suitable route, local traffic knowledge, visibility, awareness, current condition checks, a trusted contact, and permission to stop. None of those layers eliminates risk, but together they support better decisions than relying on reflective clothing or a tracking app alone.</p>
<p>Plan the run you can safely abandon. Your distance can be completed later; a warning sign should not be ignored for a deadline.</p>

<h2>Official sources</h2>
<p>This guide was reviewed against the following authoritative resources in July 2026:</p>
<ul>
  <li><a href="https://www.who.int/publications/i/item/9789240072497">World Health Organization: Pedestrian Safety Manual</a></li>
  <li><a href="https://www.nhtsa.gov/road-safety/pedestrian-safety">NHTSA: Pedestrian Safety</a></li>
  <li><a href="https://www.nhtsa.gov/book/countermeasures-that-work/pedestrian-safety/countermeasures/other-strategies-behavior-change-4">NHTSA: Pedestrian Conspicuity Enhancement</a></li>
  <li><a href="https://www.rrca.org/education/for-runners/runner-safety-tips/">Road Runners Club of America: Runner Safety Tips</a></li>
  <li><a href="https://www.cdc.gov/heat-health/risk-factors/heat-and-athletes.html">CDC: Heat and Athletes</a></li>
  <li><a href="https://www.weather.gov/safety/lightning-safety-overview">National Weather Service: Lightning Safety</a></li>
  <li><a href="https://weather.metoffice.gov.uk/warnings-and-advice/seasonal-advice/stay-safe-in-lightning">Met Office: Staying Safe in Lightning</a></li>
  <li><a href="https://www.epa.gov/wildfire-smoke-course/using-air-quality-index-aqi-plan-daily-activities">US EPA: Using Air Quality Information to Plan Activities</a></li>
  <li><a href="https://www.newcastle-hospitals.nhs.uk/services/newcastle-occupational-health-service/information-for-staff/physiotherapy/self-help-leaflets/exercise-and-your-health-a-guide-to-getting-started/">NHS: Exercise Warning Signs and Medical Advice</a></li>
</ul>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Quick go or no-go check',
  'How this guide was prepared',
  '1. Build a route around safety, not distance',
  '2. Understand visibility: bright is not the same as reflective',
  '3. Protect your awareness',
  '4. Make a check-in and emergency plan',
  '5. Respond early to personal-security concerns',
  '6. Check weather, flooding, heat, and air quality',
  '8. Know when to stop for physical symptoms',
  '9. Adjust the virtual run instead of forcing it',
  '10. Protect your privacy after the run',
  'Official sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/how-it-works',
  '/faq',
  '/contact',
  '/blog/beginner-5k-training-plan-new-runners',
  '/blog/best-apps-to-track-your-virtual-run',
  'who.int',
  'nhtsa.gov',
  'rrca.org',
  'cdc.gov',
  'weather.gov',
  'metoffice.gov.uk',
  'epa.gov',
  'nhs.uk'
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
  const wordCount = String(payload.contentText || '').split(/\s+/).filter(Boolean).length;

  if (ARTICLE.slug !== CANONICAL_SLUG) errors.push('canonical slug does not match');
  if (!payload.title || payload.title.length > 120) errors.push('title must be 1-120 characters');
  if (!payload.excerpt || payload.excerpt.length > 220) errors.push('excerpt must be 1-220 characters');
  if (!payload.contentHtml || payload.contentHtml.length > 50000) errors.push('contentHtml must be 1-50000 characters');
  if (!payload.contentText || payload.contentText.length > 50000) errors.push('contentText must be 1-50000 characters');
  if (payload.contentRaw !== payload.contentText) errors.push('contentRaw and contentText must match');
  if (wordCount < 2000) errors.push('article must contain at least 2000 words of substantive content');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('existing cover image is required for ogImageUrl');
  if (/<h[12]>Running Safety Tips for Early Morning and Night Runs<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/\b911\b/.test(payload.contentText)) errors.push('article must use globally applicable emergency-number wording');
  if (!/follow local law/i.test(payload.contentText)) errors.push('article must include a local-law caveat');
  if (!/cannot guarantee safety/i.test(payload.contentText)) errors.push('article must not imply that precautions guarantee safety');
  if (!/not individualized medical, legal, security, or emergency advice/i.test(payload.contentText)) errors.push('article must include its advice limitations');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid running-safety article payload: ${errors.join('; ')}`);
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
