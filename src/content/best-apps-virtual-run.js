'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'best-apps-to-track-your-virtual-run';
const LEGACY_SLUG = 'best-running-apps-for-virtual-runs';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'Best Apps to Track Your Virtual Run: 6 Options Compared',
  excerpt: 'Compare six running apps for tracking distance, pace, routes, and virtual run proof, with practical guidance for GPS, treadmill, and wearable activities.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'running apps',
    'virtual run',
    'run tracking',
    'activity proof',
    'strava',
    'nike run club',
    'garmin connect',
    'fitness trackers'
  ]),
  seoTitle: 'Best Apps to Track Your Virtual Run: 6 Compared',
  seoDescription: 'Compare six running apps for recording distance, pace, routes, and reliable virtual run proof, with guidance for GPS, treadmill, and wearable activities.',
  coverImageAlt: 'Comparison of six virtual run tracking apps with a phone showing a completed 10.24 km outdoor run'
});

const RAW_CONTENT_HTML = `
<p>Choosing an app for a virtual run is different from choosing one for everyday training. Coaching, social challenges, and advanced performance charts can be useful, but your event organiser usually needs something more basic: a clear record of what you completed, when you completed it, and whether it matches the event rules.</p>
<p>This guide compares six widely used options through that proof-submission lens. There is no universal winner. The best choice depends on the phone or watch you already own, whether you will run outdoors or on a treadmill, and what evidence your organiser accepts.</p>

<h2>Quick recommendations</h2>
<ul>
  <li><strong>Best general-purpose phone option: Strava.</strong> It records GPS activities, presents familiar activity summaries, and can receive activities synced from many watches and services.</li>
  <li><strong>Best for guided training: Nike Run Club.</strong> It combines run recording with guided runs and structured training plans.</li>
  <li><strong>Best for Garmin watch owners: Garmin Connect.</strong> It keeps the detailed activity record produced by a compatible Garmin device.</li>
  <li><strong>Best straightforward alternative: adidas Running.</strong> It provides phone-based GPS tracking, run statistics, goals, and training features.</li>
  <li><strong>Best for Apple Watch owners: Apple Workout and Fitness.</strong> The Workout app records the activity and the Fitness app provides the completed summary on iPhone.</li>
  <li><strong>Best for Huawei wearable owners: Huawei Health.</strong> It provides the natural activity history for compatible Huawei watches and bands.</li>
</ul>
<blockquote><strong>Important:</strong> An app being included here does not guarantee that its screenshots or links will be accepted for every virtual event. Read the event page before recording your activity.</blockquote>

<h2>How this comparison was prepared</h2>
<p>This is a researched guide, not a laboratory accuracy test or a claim that HelloRun personally tested every app on every supported device. We reviewed official product and support documentation available in July 2026, then compared the documented features with the information commonly needed for virtual run review: activity date, distance, duration, activity type, route or GPS record when required, and a recognisable source.</p>
<p>Features, subscription tiers, regional availability, device compatibility, and screen layouts can change. GPS accuracy also depends on the recording device, permissions, satellite reception, route conditions, and how the app processes activity data. For those reasons, this guide recommends apps by use case rather than making unsupported claims that one service is always the most accurate.</p>

<h2>At a glance: which app fits your run?</h2>
<ul>
  <li><strong>Strava:</strong> a flexible choice for phone GPS recording, activity sharing, and receiving workouts from compatible services.</li>
  <li><strong>Nike Run Club:</strong> a good fit when guided runs and training plans matter alongside a readable run summary.</li>
  <li><strong>Garmin Connect:</strong> the clearest choice when a Garmin watch is your primary recorder and you want to retain its detailed activity data.</li>
  <li><strong>adidas Running:</strong> a practical phone-first alternative for GPS tracking, statistics, goals, and challenges.</li>
  <li><strong>Apple Workout/Fitness:</strong> a convenient ecosystem choice for runners already using an Apple Watch and iPhone.</li>
  <li><strong>Huawei Health:</strong> a convenient ecosystem choice for runners already using a compatible Huawei watch or band.</li>
</ul>
<p>If two apps meet your needs, choose the one you already understand and can test before the event. A simple, complete record is usually more useful to a reviewer than an advanced dashboard with the date or distance hidden.</p>

<h2>1. Strava</h2>
<p><strong>Best for:</strong> runners who want phone-based GPS recording, shareable activities, or a common destination for activities recorded by compatible devices.</p>
<p>Strava can record a GPS activity from its mobile app and shows a map and live statistics while recording. After the activity syncs, the completed activity page can provide the core details a virtual run reviewer needs. Strava also explains that GPS distance can differ slightly from a recording device because each service may process the uploaded data independently.</p>
<h3>Why it can work well for proof</h3>
<ul>
  <li>The completed activity can show the activity type, distance, time, date, pace, and route when GPS data exists.</li>
  <li>An activity page can be easier to review than a screenshot containing only a map.</li>
  <li>It can serve as a central activity history when a supported watch or another service syncs to Strava.</li>
</ul>
<h3>Watch-outs</h3>
<p>Do not assume a public activity link is required or accepted; some organisers ask for a screenshot instead. Review your map visibility before sharing because a route may reveal where you started or finished. Strava's mobile app does not use phone GPS to measure treadmill distance in the same way it records an outdoor run, so indoor runners may need a compatible watch, another device, or treadmill evidence allowed by the event.</p>

<h2>2. Nike Run Club</h2>
<p><strong>Best for:</strong> beginners and returning runners who want guided runs or a training plan as well as activity tracking.</p>
<p>Nike Run Club offers coach-created training plans and Audio Guided Runs for different experience levels. That makes it useful before the virtual event, not only on submission day. A completed run summary can provide the activity information needed for proof when the relevant fields are visible.</p>
<h3>Why it can work well for proof</h3>
<ul>
  <li>Run summaries are designed around running rather than general step counting.</li>
  <li>Guided sessions can help a new runner complete a planned workout without switching apps.</li>
  <li>Training plans can support preparation for common distances such as 5K and 10K.</li>
</ul>
<h3>Watch-outs</h3>
<p>Training features do not replace event evidence. Before submission, open the completed activity and confirm that the screenshot shows the date, full distance, and duration. Check location and motion permissions before your event, and do a short test activity if you have never recorded with the app on that phone.</p>

<h2>3. Garmin Connect</h2>
<p><strong>Best for:</strong> runners whose main recording device is a Garmin watch.</p>
<p>Garmin devices can save an activity with time, distance, location, heart-rate, and other supported data, then upload it to Garmin Connect for review. When GPS information is present, Garmin Connect can display the recorded route on a map. The exact fields available depend on the watch and activity profile.</p>
<h3>Why it can work well for proof</h3>
<ul>
  <li>It preserves the activity created by the watch rather than relying on a second phone recording.</li>
  <li>The activity history can contain both a readable summary and detailed data from supported sensors.</li>
  <li>Outdoor and indoor activity profiles help distinguish GPS runs from treadmill sessions.</li>
</ul>
<h3>Watch-outs</h3>
<p>Garmin Connect itself is generally the place where a Garmin activity is reviewed; the watch is the recorder. Wait for the activity to sync before taking proof. A missing outdoor map can mean the activity was recorded without GPS, with GPS disabled, or with an indoor profile. For treadmill proof, check whether your organiser accepts the watch's indoor distance and whether calibration is expected.</p>

<h2>4. adidas Running</h2>
<p><strong>Best for:</strong> runners who want a phone-first alternative with GPS tracking, statistics, challenges, and training features.</p>
<p>The official adidas Running page describes GPS tracking, run statistics, challenges, training plans, and voice coaching. For virtual events, the useful part is the completed activity record: it should make the event distance, date, and duration easy to identify.</p>
<h3>Why it can work well for proof</h3>
<ul>
  <li>It can record common outdoor activities directly from a phone.</li>
  <li>Its run-focused statistics are more relevant than a daily step-count screen.</li>
  <li>Goals and coaching features can be useful during preparation.</li>
</ul>
<h3>Watch-outs</h3>
<p>Some features and integrations may depend on the current app version, region, or account tier. Check what appears on the saved activity screen before committing to it for your event. Do not use a challenge-completion badge alone when the organiser requires the underlying date, distance, and time.</p>

<h2>5. Apple Workout and Fitness</h2>
<p><strong>Best for:</strong> runners who already own an Apple Watch and use an iPhone.</p>
<p>On Apple Watch, the Workout app can record Outdoor Run and Indoor Run activities. Available running views can include distance, average pace, splits, heart rate, elevation, and other metrics. After the run, the completed workout can be viewed in the Activity app on the watch or the Fitness app on iPhone.</p>
<h3>Why it can work well for proof</h3>
<ul>
  <li>The Apple Watch records both outdoor and indoor running workout types.</li>
  <li>The iPhone summary can be easier to capture and read than the smaller watch screen.</li>
  <li>It fits runners who prefer the built-in Apple workflow rather than adding another tracking account.</li>
</ul>
<h3>Watch-outs</h3>
<p>This option requires an Apple Watch for the workout workflow described here. Make sure the final screenshot includes the activity date and complete distance, not only Activity rings or daily totals. Route availability and metrics vary by workout type, permissions, watch model, and software version.</p>

<h2>6. Huawei Health</h2>
<p><strong>Best for:</strong> runners using a compatible Huawei watch or band.</p>
<p>Huawei Health supports workout modes such as Outdoor run and can display fitness data including distance, duration, and pace on supported devices. Outdoor workout records may include routes, while some wearables rely on a connected phone for positioning.</p>
<h3>Why it can work well for proof</h3>
<ul>
  <li>It keeps the activity within the same ecosystem as the Huawei wearable that recorded it.</li>
  <li>Workout records can provide distance, duration, pace, and route information when supported.</li>
  <li>It avoids adding another app solely for proof when the runner already uses Huawei Health.</li>
</ul>
<h3>Watch-outs</h3>
<p>Capabilities differ between watches, bands, phones, and regions. Some devices need the connected phone's GPS to record an outdoor route. Sync the record before taking a screenshot, and confirm that the final image identifies the workout as a run or walk rather than showing only general daily activity.</p>

<h2>What valid virtual run proof should show</h2>
<p>The app matters less than the completeness of the saved record. Unless the event publishes different requirements, prepare proof that clearly shows:</p>
<ul>
  <li>The completed distance and its unit, such as kilometres or miles.</li>
  <li>The activity date, within the event's permitted window.</li>
  <li>The duration or elapsed time.</li>
  <li>The activity type, such as Run, Walk, Outdoor Run, or Indoor Run.</li>
  <li>The app or device source.</li>
  <li>The runner or account identity when required by the organiser.</li>
  <li>The route or supporting activity details when required.</li>
</ul>
<p>A map by itself is usually weak proof because it may not show distance, date, or time. A daily step total can have the same problem. Read <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> and <a href="/blog/how-to-submit-run-proof-correctly-hellorun">How to Submit Run Proof Correctly on HelloRun</a> for a more detailed submission guide.</p>

<h2>Before your run: a five-minute setup check</h2>
<ol>
  <li>Read the event page and confirm accepted activities, proof formats, distance rules, event dates, and the final submission deadline.</li>
  <li>Choose the correct activity type: outdoor run, indoor run, walk, or another type explicitly allowed by the organiser.</li>
  <li>Check location, motion, Bluetooth, health-data, and background permissions needed by your phone or wearable.</li>
  <li>Confirm the distance unit. If the event uses kilometres and your app uses miles, be ready to show an unambiguous conversion.</li>
  <li>Record a short test on the same device, then confirm that it saves, syncs, and displays the fields you will need.</li>
</ol>
<p>If you have not chosen an event yet, <a href="/events">browse current HelloRun events</a>. The <a href="/how-it-works">How It Works guide</a> explains the broader registration and submission flow.</p>

<h2>Outdoor GPS, treadmills, and synced wearables</h2>
<h3>Outdoor GPS runs</h3>
<p>Wait for a usable GPS signal before starting, especially near tall buildings, dense tree cover, or other obstructions. Keep the recording device positioned where it can maintain reception. If the route shows a straight line, a large jump, or missing sections, save the original record and follow the organiser's instructions rather than editing the image to hide the problem.</p>
<h3>Treadmill runs</h3>
<p>Indoor runs do not produce a normal outdoor GPS map. Depending on the app and device, distance may come from a watch estimate, calibrated sensor, connected equipment, or the treadmill display. Check the event rules before running: some organisers accept a workout summary, some require a treadmill-console photo, and others do not allow indoor activities.</p>
<h3>Wearable sync</h3>
<p>If a watch records the activity, let it finish syncing to its companion app before opening or sharing the result. Avoid recording the same run independently in two apps unless you understand how duplicates are handled. Submit the record from the original source when possible and do not combine two different distance values without explanation.</p>

<h2>Privacy and sharing</h2>
<p>A virtual run reviewer needs enough information to verify the activity, but that does not mean every detail must be public. Review the app's privacy controls before sharing an activity link. A route can reveal a home, workplace, school, or regular running location.</p>
<p>If the organiser accepts screenshots, you may be able to protect an unnecessary location detail while keeping the date, distance, time, activity type, and source visible. Do not crop or cover a field that the event rules require, and do not alter the performance data. When unsure, ask the organiser or use the <a href="/faq">HelloRun FAQ</a> before submitting.</p>

<h2>What to do when two apps show different distances</h2>
<p>Small differences can occur because a watch and an app may sample GPS points differently, smooth the route differently, or calculate moving time and distance separately. First identify which device originally recorded the activity. Preserve that original record and avoid choosing whichever total is more favourable.</p>
<ul>
  <li>Check that both records use the same unit.</li>
  <li>Look for pauses, missing GPS sections, indoor tags, or delayed syncing.</li>
  <li>Use the original device record when the event rules do not specify another source.</li>
  <li>Add a short explanation during submission if the organiser provides a notes field.</li>
  <li>Contact the organiser before the deadline when the discrepancy could affect qualification.</li>
</ul>

<h2>Proof-submission checklist</h2>
<ul>
  <li>The activity belongs to the correct runner and registration.</li>
  <li>The date falls within the official event period.</li>
  <li>The distance meets the selected category or accumulated-activity rule.</li>
  <li>The distance unit, duration, activity type, and source are readable.</li>
  <li>The screenshot is not blurry, misleadingly cropped, or edited.</li>
  <li>The proof does not expose more location information than necessary.</li>
  <li>The result is submitted before the event's final deadline.</li>
</ul>

<h2>Frequently asked questions</h2>
<h3>Does HelloRun require Strava?</h3>
<p>No universal app is required across every HelloRun event. Organisers define the acceptable evidence for their event. Strava may be familiar, but Garmin Connect, Nike Run Club, Apple Fitness, Huawei Health, adidas Running, or another clear activity source may also be accepted when the event rules allow it.</p>
<h3>Do I need a paid running app?</h3>
<p>Not necessarily. Proof usually depends on whether the saved activity shows the required details, not whether you pay for premium analytics. Free features and subscription boundaries can change, so confirm that your chosen app can record and display the fields you need before event day.</p>
<h3>Can I use a treadmill?</h3>
<p>Only when the event permits indoor or treadmill activities. Follow its evidence requirements because an indoor record may not include a route and may estimate distance differently from the treadmill.</p>
<h3>Can I record with a watch instead of a phone?</h3>
<p>Yes, when the event accepts the resulting proof. Sync the watch activity to its companion app so the date, distance, time, and activity type are easier to review.</p>
<h3>Are manual activities accepted?</h3>
<p>That depends on the event. A manually entered activity has less independent recording data than a GPS or wearable record, so an organiser may reject it or request supporting evidence.</p>
<h3>Which app is the most accurate?</h3>
<p>This guide does not name a universal accuracy winner. Results depend on the phone or watch, GPS conditions, permissions, sensors, activity settings, and processing. Test the actual device you will use and choose the clearest original record for submission.</p>

<h2>Final recommendation</h2>
<p>Start with the ecosystem you already own. Use Strava or adidas Running for a phone-first outdoor run, Nike Run Club when guided training is important, Garmin Connect for a Garmin watch, Apple Workout and Fitness for an Apple Watch, or Huawei Health for a compatible Huawei wearable. Then test the complete workflow before the event: record, save, sync, open the summary, and confirm that the required proof is visible.</p>
<p>The best virtual run app is not the one with the longest feature list. It is the one that records your permitted activity consistently, protects your privacy, and produces evidence your organiser can review.</p>

<h2>Official sources</h2>
<p>Product capabilities were checked against the following official documentation in July 2026:</p>
<ul>
  <li><a href="https://support.strava.com/en-us/articles/15402137-recording-an-activity">Strava: Recording an Activity</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401893-how-distance-is-calculated">Strava: How Distance Is Calculated</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401956-indoor-treadmill-and-bike-trainer-activities">Strava: Indoor and Treadmill Activities</a></li>
  <li><a href="https://www.nike.com/help/a/nrc-plan/add-run-nrc">Nike Run Club: Training Plans</a></li>
  <li><a href="https://support.garmin.com/en-US/?faq=nX12YoAcTe3riUNJU2GBP8">Garmin: Activities and Recorded Data</a></li>
  <li><a href="https://support.garmin.com/en-IE/?faq=ebPOlI4buWAZDXIqCG44w8">Garmin: Missing Activity Maps</a></li>
  <li><a href="https://www.adidas.com/us/running-app">adidas Running App</a></li>
  <li><a href="https://support.apple.com/guide/watch/run-with-apple-watch-apd73a43493f/watchos">Apple: Run with Apple Watch</a></li>
  <li><a href="https://consumer.huawei.com/en/support/content/en-us01057431/">Huawei: Selecting a Workout Mode</a></li>
  <li><a href="https://consumer.huawei.com/en/support/content/en-us15893332/">Huawei Health: Workout Routes</a></li>
</ul>
<p>Ready to participate? Review the event's proof rules, read <a href="/how-it-works">how HelloRun works</a>, and submit your result before the published deadline.</p>
`;

const REQUIRED_APP_HEADINGS = Object.freeze([
  '1. Strava',
  '2. Nike Run Club',
  '3. Garmin Connect',
  '4. adidas Running',
  '5. Apple Workout and Fitness',
  '6. Huawei Health'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/how-it-works',
  '/faq',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  'support.strava.com',
  'nike.com/help',
  'support.garmin.com',
  'adidas.com/us/running-app',
  'support.apple.com',
  'consumer.huawei.com'
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
  if (wordCount < 1500) errors.push('article must contain at least 1500 words of substantive content');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('existing cover image is required for ogImageUrl');
  if (/<h[12]>Best Apps to Track Your Virtual Run(?:<|:)/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/<em>Best for:<\/em>\s*\*/i.test(payload.contentHtml)) errors.push('body contains malformed best-for markup');

  for (const heading of REQUIRED_APP_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing app heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) {
    throw new Error(`Invalid best-apps article payload: ${errors.join('; ')}`);
  }
  return true;
}

module.exports = {
  ARTICLE,
  CANONICAL_SLUG,
  LEGACY_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_APP_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
};
