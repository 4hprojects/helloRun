'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-accurate-is-phone-gps-for-running';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How Accurate Is Phone GPS for Running?',
  excerpt: 'Learn what phone GPS can and cannot prove, why running distance changes, how to reduce avoidable errors, and how to handle unusual virtual-run records honestly.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'phone GPS accuracy',
    'running GPS accuracy',
    'smartphone GPS',
    'Strava GPS accuracy',
    'GPS drift running',
    'running distance',
    'run tracking',
    'virtual run proof'
  ]),
  seoTitle: 'How Accurate Is Phone GPS for Running?',
  seoDescription: 'Learn why phone GPS running distance can vary, what causes GPS drift, how routes affect tracking, and how to improve activity recording for virtual runs.',
  coverImageAlt: 'Miniature-style Filipino runner in an open tropical park beside a phone and a route of slightly scattered location points near trees and buildings'
});

const RAW_CONTENT_HTML = `
<p>Phone GPS is often accurate enough to record a recreational run and may be acceptable evidence for a virtual event—but there is no universal accuracy percentage, distance tolerance, or approval guarantee. A phone estimates a sequence of positions; the app processes those points into a route and distance. The result can be close on one run and noticeably short or long on another.</p>
<p>For a virtual run, you can use a compatible phone and app when the rules accept that evidence. Do not treat the displayed distance as an exact survey or assume a clean-looking map must be correct. Test the setup, preserve the original activity, and let the event requirements decide eligibility.</p>
<blockquote><strong>The practical answer:</strong> phone GPS is a useful consumer measurement, not perfect ground truth. Improve the recording conditions you control, review anomalies without manufacturing data, and submit only through an evidence method the event accepts.</blockquote>

<h2>How phone GPS measures a run</h2>
<p>GPS is one satellite-navigation system within the wider group commonly called GNSS. A modern phone may receive signals from GPS and other constellations, then combine satellite information with device sensors, Wi-Fi, mobile-network information, and software estimates. The exact combination depends on the phone, operating system, settings, and app.</p>
<p>During a run, the app connects time-stamped locations to estimate distance. It may filter points, smooth the line, use motion sensors, apply corrections, separate moving from elapsed time, or pause when it thinks you stopped. Those decisions explain why two apps on the same phone can show different totals.</p>
<p>A location accuracy radius is not the same thing as distance accuracy. The archived U.S. government GPS information page says GPS-enabled smartphones are typically within a 4.9-metre radius under open sky, while emphasizing that buildings, bridges, trees, satellite geometry, atmospheric conditions, and receiver quality affect what the user gets. That figure describes a favorable position estimate—not a promise that a five-kilometre track will be within a fixed number of metres.</p>
<p>Distance is accumulated from many estimated points. Small sideways errors can add zigzags and make a route long. Missing points can cut corners or bridge a gap with a straight segment and make it short. A single summary number hides which pattern occurred.</p>

<h2>Is phone GPS accurate enough for running?</h2>
<p>For everyday training, a stable phone record can be useful for approximate distance, route history, pace trends, and session notes. For a virtual run, it can be adequate when the specific event accepts the app or screenshot and the activity meets its other rules. “Adequate” is a decision about purpose and evidence, not a claim of laboratory precision.</p>
<p>No responsible universal statement can say every phone is accurate within one, two, or five percent. Hardware generations, antennas, supported frequencies, location services, carrying position, apps, route geometry, surroundings, and operating-system behavior vary. A result from one phone in an open track cannot be transferred automatically to another phone in a dense city.</p>
<p>An exploratory study of nine running apps on one smartphone found differences among applications using the same GPS setup. Its 2013 apps and device are not a current ranking, but it illustrates why you should test the exact phone-app combination you intend to use.</p>
<p>Do not use a phone GPS total as a medical, legal, surveying, navigation-safety, or certified-course measurement. For training decisions, pair the record with effort and context. For event decisions, follow the organizer's defined evidence and review process.</p>

<h2>Why GPS distance changes between devices</h2>
<ul>
  <li><strong>Receiver and antenna:</strong> phones differ in GNSS constellations, frequencies, antenna design, and how well they handle weak or reflected signals.</li>
  <li><strong>Phone placement:</strong> a device held openly may receive signals differently from one buried under dense items, though no carrying position guarantees accuracy.</li>
  <li><strong>Location permission:</strong> an app given approximate rather than precise access may not receive the detail expected for activity recording.</li>
  <li><strong>Power management:</strong> battery-saving and background restrictions can reduce or interrupt location updates, depending on the device and app.</li>
  <li><strong>Sampling and filtering:</strong> apps can request, accept, smooth, reject, or connect location points differently.</li>
  <li><strong>Pause rules:</strong> manual pause, auto-pause, moving-time calculations, and traffic stops change the summarized activity.</li>
  <li><strong>Start readiness:</strong> starting before a reliable initial position can produce a displaced first point or an early jump.</li>
</ul>
<p>When comparing two records, first ask whether they measured the same thing. Compare the same start and finish, elapsed period, activity type, units, pause behavior, and source file. A screenshot of an imported activity can display a platform's processed value rather than the exact number shown on the recording device.</p>

<h2>Buildings and urban canyons</h2>
<p>Tall buildings can block direct satellite signals and reflect signals from glass, concrete, and other surfaces. A receiver may place the runner on the wrong side of a street, inside a building, or along a parallel road. Repeated sideways jumps create extra line segments, often called GPS bounce or drift.</p>
<p>Strava's official bad-GPS guidance explains that bounced signals near tall buildings can add distance because the platform connects each zig and zag. The opposite can also happen: filtering may discard uncertain points or a gap may be bridged by a direct line that cuts the route short. “City GPS always runs long” is therefore not a reliable rule.</p>
<p>Tight turns and short loops magnify the issue because a straight connection may clip a bend and repeat the same error each lap. Broader turns may produce a cleaner trace, but traffic, weather, accessibility, lighting, and personal security take priority over satellite visibility.</p>
<p>Use the <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe-route guide</a> to assess the whole route. Never step into traffic, an exposed area, private property, or another unsafe position simply to improve reception.</p>

<h2>Trees, mountains, tunnels, and covered areas</h2>
<p>Dense tree canopy, steep terrain, cliffs, overpasses, roofs, and tunnels can block or weaken satellite signals. Wet foliage and changing orientation may add variability. A phone can continue displaying time while location points become sparse or stop.</p>
<p>After a loss and reacquisition, an app may connect the last point before the gap to the first point after it. Strava documents this straight-line behavior and states that missing GPS data cannot simply be filled back in. The connector shows how software joined two known samples; it does not prove the exact path or distance between them.</p>
<p>If tracking stops during an activity, reach a safe place before operating the device. Preserve the activity and follow <a href="/blog/what-to-do-when-gps-tracking-stops-during-a-run">the GPS-interruption guide</a>. Do not enter a dangerous clearing, continue without safe navigation, or repeat lost distance automatically.</p>

<h2>GPS drift, route cutting, and impossible pace</h2>
<p><strong>GPS drift</strong> appears when points wander away from the path even though the runner followed it. A stationary start can draw a small cloud of movement. A run beside buildings can produce sudden lateral jumps. Those extra connections may inflate distance and make calculated pace appear faster.</p>
<p><strong>Route cutting</strong> occurs when sparse points connect across a curve, switchback, loop, or obstruction instead of following the traveled path. It may reduce distance. A straight line through buildings or water usually indicates a recording gap, not a shortcut completed by the runner.</p>
<p><strong>An impossible spike</strong> can arise when a point lands far away and the next returns. It may add distance or an implausible fastest pace, so inspect a personal record produced by one isolated jump.</p>
<p>Look at the whole route, not only the final total. Compare unusual sections with the route you remember, elapsed time, stops, and any warnings shown by the source app. Memory can add context, but it cannot create missing track points.</p>

<h2>Why two running apps may show different distances</h2>
<p>Two apps can differ even if both are honest. One might record more frequently, ignore points with a large reported uncertainty, smooth a corner, apply auto-pause, use fused sensor data, calculate on the phone, or recalculate after upload. Another might import the same file but calculate distance from a different set of fields.</p>
<p>Strava can only process the data it receives. Its support documentation says bad source data may produce missing or extra distance and that the platform cannot reconstruct portions that were never recorded. “Strava shows the wrong distance” may therefore describe the source device, the uploaded points, or Strava's processing; the map and source should be reviewed before assigning one cause.</p>
<p>Do not run several apps merely to choose the largest total afterward. If comparison matters, perform a short non-event test under repeatable conditions, label each source, and compare route shape as well as distance.</p>
<p>The <a href="/blog/best-apps-to-track-your-virtual-run">running-app guide</a> compares evidence workflows and documented features. It does not name a universally most accurate app because the phone, settings, route, and event requirements remain part of the system.</p>

<h2>How to improve phone GPS recording</h2>
<ol>
  <li><strong>Update and test early.</strong> Install necessary updates before event day, then make a short test recording with the exact app and phone.</li>
  <li><strong>Review the app's documented permissions.</strong> On Android, users can choose approximate or precise location. Grant only the access needed, but understand that approximate access is not designed for a detailed running track.</li>
  <li><strong>Check background and battery behavior.</strong> Follow current instructions for the phone and app. Do not assume another brand's menu names or settings apply.</li>
  <li><strong>Charge sufficiently.</strong> Location recording, screen use, audio, data, and heat can increase power demand.</li>
  <li><strong>Begin in a suitable open area when safe.</strong> Allow the app to reach its documented ready state before pressing start. An icon alone is not a precision guarantee.</li>
  <li><strong>Carry the phone consistently.</strong> Use a secure position that does not obstruct movement or require watching the screen. Follow device guidance and keep route awareness.</li>
  <li><strong>Avoid unnecessary handling.</strong> Wet screens, pocket taps, and repeated app switching can pause or close a recording.</li>
  <li><strong>Know auto-pause behavior.</strong> Test how crossings, walk breaks, and short stops affect moving time and distance.</li>
  <li><strong>Save and sync normally.</strong> Confirm that the original activity exists before editing, exporting, or deleting anything.</li>
</ol>
<p>These steps reduce avoidable problems; they do not guarantee exact distance. Privacy still matters. Give the app only permissions needed for the recording, review route-visibility settings, and avoid exposing a home or sensitive location publicly.</p>

<h2>What to check before starting a virtual run</h2>
<ul>
  <li>Read the live event page for accepted activity types, evidence methods, distance, date window, deadline, and single-session or accumulated rules.</li>
  <li>Set the correct activity type and preferred unit before recording.</li>
  <li>Check battery, storage, precise-location choice, and the app's required background access.</li>
  <li>Test GPS readiness, start, pause, finish, save, screenshot, and sync on a non-event activity.</li>
  <li>Choose a familiar route with appropriate safety, access, weather, and exit options.</li>
  <li>Leave time before the deadline to address an honest failure without unsafe rushing.</li>
  <li>Know which visible fields the event needs and how to protect unrelated private information.</li>
</ul>
<p>A familiar route is useful as a consistency check, not automatic proof of exact distance. Public tracks, road markings, consumer map tools, and a previous device recording can also contain errors. A certified race course has a defined measurement process, but your phone still records the path you actually take rather than the course's official shortest possible route.</p>

<h2>Test your setup on a familiar route</h2>
<ol>
  <li>Choose a short, safe route you can repeat without entering an event result.</li>
  <li>Use the same phone, app, permissions, carrying position, and start procedure planned for the activity.</li>
  <li>Record normally; do not watch the map while moving.</li>
  <li>After saving, inspect whether the start, turns, covered sections, pauses, finish, duration, and distance are plausible.</li>
  <li>Repeat on another day if one result is unusual. One clean trace does not guarantee the next run, while one anomaly does not prove the phone is always unusable.</li>
  <li>Resolve permission, power, or sync problems using current official documentation before the event.</li>
</ol>
<p>Change one variable at a time so you can identify what helped. Keep brief notes and do not present a consumer test as scientific calibration.</p>

<h2>What to do if the recorded distance looks wrong</h2>
<ol>
  <li><strong>Preserve the original.</strong> Do not delete the source activity or overwrite it with a manual total.</li>
  <li><strong>Inspect the route safely after the run.</strong> Look for a displaced start, zigzags, straight gaps, cut corners, pauses, or an early finish.</li>
  <li><strong>Check the source and processing.</strong> Identify which device recorded the points and whether another service recalculated the summary.</li>
  <li><strong>Separate known facts from estimates.</strong> The displayed fields and visible track are evidence; a planned route or remembered distance is context.</li>
  <li><strong>Read the event rule.</strong> A short record, split activity, manual entry, secondary device, or edited file is not universally accepted.</li>
  <li><strong>Contact the organizer before the deadline.</strong> Explain the anomaly honestly and ask which correction or replacement path applies.</li>
</ol>
<p>Do not add points, draw a cleaner route, splice files, type the intended distance as recorded distance, or extend a later run automatically to “catch up.” Strava may offer cropping or other platform tools for ordinary activity presentation, but editing can alter evidence. Preserve the source and confirm the event's rule first.</p>
<p>The <a href="/blog/what-counts-as-valid-run-proof">valid-proof guide</a> explains reviewable fields, and the <a href="/blog/how-to-submit-run-proof-correctly-hellorun">HelloRun proof-submission guide</a> covers the current screenshot and supported connected-Strava paths. Submission or pending status is not the same as approved progress.</p>

<h2>Phone GPS versus a GPS watch</h2>
<p>A running watch may offer wrist controls, long recording battery, and multiple GNSS modes. A phone may offer a larger screen, familiar apps, connectivity, emergency communication, and no additional purchase.</p>
<p>Neither category wins every route. An older watch can perform worse than a newer phone; a high-end watch mode can still drift beside tall buildings; a phone can record a clean open-sky route; and either device can be affected by settings, placement, software, and obstruction. Product specifications describe capabilities, not guaranteed results on your run.</p>
<p>Choose based on current evidence requirements, route, battery, comfort, accessibility, privacy, and budget. You do not need a watch merely to be a legitimate runner. If using two devices, identify the original source and do not submit whichever total is most favorable without regard to the event rules.</p>

<h2>Phone GPS and HelloRun proof</h2>
<p>HelloRun does not turn a phone into a certified measuring instrument and does not reconstruct missing satellite points. A supported connected-Strava submission imports eligible information available through the authorized account. Screenshot submission uses the evidence and confirmed fields supplied through the current flow. Both remain subject to the event configuration and applicable review.</p>
<p>A map that looks neat does not guarantee approval, and a visible anomaly does not automatically prove dishonesty. Review can consider date, activity type, distance, duration, units, source, duplicates, event window, and other published requirements. Pending evidence awaits those checks and does not count as official progress or rank.</p>
<p>Before your next activity, visit <a href="/events">current HelloRun events</a>, open the event details, and test your tracking setup on a familiar route. Do not rely on this article in place of the live rules.</p>

<h2>Frequently asked questions</h2>
<h3>How accurate is phone GPS for running?</h3>
<p>There is no universal distance percentage. Open-sky position estimates can be close, but route distance depends on many points plus the phone, app, settings, placement, surroundings, and processing. Test the actual setup and treat the result as consumer measurement.</p>
<h3>Why is my running GPS inaccurate?</h3>
<p>Common causes include starting before a stable fix, tall buildings, trees, steep terrain, tunnels, reflected signals, approximate permission, power restrictions, app suspension, sparse samples, auto-pause, and processing differences.</p>
<h3>Why does Strava show the wrong distance?</h3>
<p>The source device may have recorded drift or gaps, and Strava then processes the received data. Strava states that it can filter some bad data but cannot fill in GPS points that were never recorded. Compare the source activity, uploaded map, and processing before deciding what happened.</p>
<h3>Can GPS add distance?</h3>
<p>Yes. Wandering or bounced points can create extra zigzags. GPS can also remove apparent distance when gaps or sparse sampling cut corners, so error does not always have one direction.</p>
<h3>Is a phone accurate enough for a virtual 5K?</h3>
<p>It may be when the event accepts that recording method and the activity satisfies its rules. No phone or app guarantees an exact 5K or automatic approval. Test beforehand and preserve honest evidence.</p>
<h3>Should I run extra distance as a GPS buffer?</h3>
<p>Do not use a universal extra-distance formula. If an event requires at least a displayed distance, plan conservatively within your current ability and its rules, but do not turn uncertainty into unsafe overexertion or a rigid catch-up session.</p>
<h3>Can I correct a bad GPS route before submitting?</h3>
<p>Do not assume edits are accepted evidence. Preserve the original and ask the organizer which correction path applies. Never manufacture points or represent planned distance as recorded distance.</p>

<h2>Method and limitations</h2>
<p>This guide was reviewed in September 2026 using the official GPS accuracy explanation from the U.S. government, Android location and power documentation, current Strava bad-data guidance, a published study of running-tracker applications, and current HelloRun evidence behavior.</p>
<p>The sources explain mechanisms and platform behavior; they do not validate every current phone, app version, route, or Philippine environment. The 4.9-metre open-sky figure is a position-radius example, not a running-distance tolerance. The running-app study is older exploratory evidence and is not used to rank current products.</p>
<p>This is general technical and event-preparation information, not a certification of any device, individualized training advice, or a promise of event acceptance. Current manufacturer instructions, app behavior, event rules, and organizer decisions remain authoritative.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://archive.gps.gov/systems/gps/performance/accuracy/">GPS.gov archive: GPS Accuracy</a></li>
  <li><a href="https://developer.android.com/develop/sensors-and-location/location/permissions">Android Developers: Request Location Permissions</a></li>
  <li><a href="https://developer.android.com/develop/sensors-and-location/location/battery">Android Developers: Background Location and Battery Life</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15402181-bad-gps-data">Strava Support: Bad GPS Data</a></li>
  <li><a href="https://gruppe.wst.univie.ac.at/~bauer/chb_eu/wp-content/uploads/bauer2013_momm_inaccuracy_gps.pdf">Bauer: On the (In-)Accuracy of GPS Measures of Smartphones</a></li>
</ul>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'How phone GPS measures a run',
  'Is phone GPS accurate enough for running?',
  'Why GPS distance changes between devices',
  'Buildings and urban canyons',
  'Trees, mountains, tunnels, and covered areas',
  'GPS drift, route cutting, and impossible pace',
  'Why two running apps may show different distances',
  'How to improve phone GPS recording',
  'What to check before starting a virtual run',
  'Test your setup on a familiar route',
  'What to do if the recorded distance looks wrong',
  'Phone GPS versus a GPS watch',
  'Phone GPS and HelloRun proof',
  'Frequently asked questions',
  'Method and limitations',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/blog/how-to-choose-a-safe-route-for-your-virtual-run"',
  'href="/blog/best-apps-to-track-your-virtual-run"',
  'href="/blog/what-to-do-when-gps-tracking-stops-during-a-run"',
  'href="/blog/what-counts-as-valid-run-proof"',
  'href="/blog/how-to-submit-run-proof-correctly-hellorun"'
]);

function buildArticlePayload({ coverImageUrl } = {}) {
  const contentHtml = sanitizeHtml(RAW_CONTENT_HTML).trim();
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
  if (wordCount < 2500 || wordCount > 3000) errors.push('article must contain 2500-3000 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('cover artwork is required for publication');
  if (/<h1\b/i.test(payload.contentHtml)) errors.push('body must not contain a page-level h1');
  if (/<h[12]>How Accurate Is Phone GPS for Running\?/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/phone GPS (?:is|will be) (?:always|100%) accurate|phone GPS guarantees? (?:exact|accurate) distance/i.test(text)) errors.push('article must not guarantee GPS accuracy');
  if (/(?:every|all) phones? (?:are|is) accurate within \d+%|universal GPS (?:accuracy|error) (?:rate|percentage)/i.test(text)) errors.push('article must not claim a universal accuracy percentage');
  if (/Strava (?:always|automatically) (?:fixes|corrects|repairs) (?:bad|missing) GPS/i.test(text)) errors.push('article must not promise GPS repair');
  if (/every virtual (?:run|event) accepts? phone GPS|phone GPS guarantees? (?:approval|acceptance)/i.test(text)) errors.push('article must not claim universal event acceptance');
  if (/(?:draw|invent|add) GPS points to (?:fix|complete) (?:the )?(?:route|distance)|submit planned distance as recorded/i.test(text)) errors.push('article must not endorse manufactured GPS evidence');
  if (/(?:always|must) run an extra \d+%|mandatory GPS buffer/i.test(text)) errors.push('article must not prescribe a universal distance buffer');
  if (/pending (?:evidence|activity|distance) (?:counts|is counted) (?:as )?(?:official|approved)/i.test(text)) errors.push('article must not count pending evidence officially');
  if (!/phone GPS is a useful consumer measurement, not perfect ground truth/i.test(text)) errors.push('article must state the accuracy limitation early');
  if (!/reviewed in September 2026/i.test(text)) errors.push('article must disclose methodology and date');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }
  if (errors.length) throw new Error(`Invalid phone GPS accuracy guide payload: ${errors.join('; ')}`);
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
