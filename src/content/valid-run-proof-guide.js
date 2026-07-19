'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'what-counts-as-valid-run-proof';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'What Counts as Valid Run Proof?',
  excerpt: 'Learn what makes virtual run proof reviewable, including screenshots, Strava imports, dates, distance, duration, privacy, discrepancies, and rejection fixes.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'run proof',
    'activity evidence',
    'virtual run',
    'proof review',
    'run screenshot',
    'strava activity',
    'treadmill proof',
    'result submission'
  ]),
  seoTitle: 'What Counts as Valid Run Proof? | HelloRun',
  seoDescription: 'Learn which activity details make virtual run proof reviewable, how HelloRun handles screenshots and Strava imports, and how to avoid common rejection reasons.',
  coverImageAlt: 'Runner reviewing an activity screenshot with distance, elapsed time, date, and route before submitting virtual run proof'
});

const RAW_CONTENT_HTML = `
<p>Valid run proof is activity evidence that can be matched to the correct runner and event, read clearly, and assessed against the event's published rules. It normally needs to show when the activity happened, what activity was completed, how far it went, and any duration or source information the organiser requires.</p>
<p>A screenshot is not valid merely because it contains a large distance number. An imported activity is not valid merely because it came from a recognised app. Evidence becomes useful in context: the registration, activity window, category, permitted activity type, minimum distance, proof method, units, and review outcome all matter.</p>
<blockquote><strong>Short answer:</strong> the event rules define eligibility, the evidence supports the recorded activity, and the final status determines whether it counts. Pending evidence is not yet approved progress or an official ranked result.</blockquote>

<h2>Quick proof guide</h2>
<h3>Usually strong and reviewable</h3>
<ul>
  <li>An uncropped activity summary showing the date, distance, unit, duration, activity type, and recognisable app or device.</li>
  <li>A supported activity imported from the runner's own connected account with a valid date, positive distance, duration, and permitted sport type.</li>
  <li>A treadmill record when the event expressly accepts indoor activities and the required distance, duration, date, and supporting context are visible.</li>
  <li>A separate, legible record for each activity in an accumulated-distance challenge.</li>
</ul>
<h3>Unclear and likely to need review</h3>
<ul>
  <li>A map without a visible date, distance, unit, or duration.</li>
  <li>A daily or monthly total that does not identify one eligible activity.</li>
  <li>A screenshot whose typed fields disagree with the visible values.</li>
  <li>A watch or treadmill photo without enough context to connect it to the event window.</li>
  <li>An activity in miles when the event uses kilometres but gives no conversion or rounding rule.</li>
</ul>
<h3>Not eligible unless the event's rules and reviewer say otherwise</h3>
<ul>
  <li>An activity outside the permitted window or after the final submission deadline.</li>
  <li>An excluded activity type, a distance below the published minimum, or a one-activity result assembled from several runs.</li>
  <li>The same proof image reused for another activity.</li>
  <li>An altered image that changes the underlying performance fields.</li>
  <li>A payment receipt submitted as run-result evidence.</li>
</ul>

<h2>How this guide was prepared</h2>
<p>This guide documents the HelloRun proof-submission implementation available in July 2026. It was checked against the screenshot upload flow, connected Strava import, submission validation, duplicate controls, review states, public result presentation, and accumulated-activity workflow. It is not an independent audit of GPS or treadmill accuracy, a forensic examination standard, or a universal rule for other platforms.</p>
<p>Official material from World Athletics, Strava, the Road Runners Club of America, and the Information Commissioner's Office supplies context for virtual-route preparation, time fields, privacy, ethical event administration, and data minimisation. Those sources do not decide whether a particular HelloRun submission passes. The individual event mechanics and applicable platform policies remain the authority.</p>

<h2>The eight-part validity test</h2>
<h3>1. Correct registration</h3>
<p>The proof must be attached to the runner's eligible registration, participation mode, and category. A clear 10K record cannot resolve a submission sent to the wrong event account or an inaccessible registration. On HelloRun, event submission requires a confirmed registration whose payment state permits submission. Payment receipt review and run-proof review are separate decisions.</p>
<h3>2. Correct activity window</h3>
<p>The activity date must fall inside the applicable event or virtual window. The form uses the selected run date to identify eligible events, while a connected Strava record supplies its recorded start date. A screenshot dated before the opening time or after the closing time does not become eligible because it was uploaded before the final deadline.</p>
<h3>3. Permitted activity type</h3>
<p>Events can distinguish running, walking, hiking, and trail running. A challenge may accept all four, only some, or apply different rules to onsite and virtual participation. The label shown by an app helps, but the event's list is what matters. Do not rename a cycling or unrelated activity to resemble an accepted run.</p>
<h3>4. Required distance and format</h3>
<p>A single-activity event normally expects one activity that reaches the category's required distance. An accumulated event expects separate eligible activities that meet any minimum-per-activity rule and are added only after approval. A monthly app total is not a substitute for the component activities unless the organiser specifically publishes that method.</p>
<h3>5. Required fields</h3>
<p>Distance and unit are fundamental. Date, duration, activity type, source, location, elevation, steps, participant name, or route may also matter depending on the event. Collecting every possible field is not automatically better; evidence should be sufficient for the published decision without revealing unrelated personal data.</p>
<h3>6. Accepted evidence path</h3>
<p>HelloRun's current public flow offers an activity screenshot or a supported connected Strava import. Event pages may describe accepted proof choices, but runners should follow the live submission form and ask before relying on a manual-only method or another integration. This guide does not claim that every configured proof-type choice is independently enforced at every route layer.</p>
<h3>7. Readable, internally consistent evidence</h3>
<p>The visible values, runner-confirmed fields, and imported data should describe the same activity. A crop that removes the date, a blur over the decimal point, or a typed duration that conflicts with the image creates uncertainty. A discrepancy is a reason to check the record, not automatic proof of dishonesty.</p>
<h3>8. Final status</h3>
<p>Submitting creates a record; it does not by itself make the evidence official. A result counts when its final status is approved under the event workflow. Some clean submissions can meet current automatic-approval criteria. Others remain submitted for organiser or admin review. Rejected evidence stays outside approved progress and standings unless a permitted replacement is later approved.</p>

<h2>What a strong screenshot shows</h2>
<p>A useful screenshot lets a reviewer understand the activity without guessing what was cropped away. Aim to show the app or device context plus the fields requested by the event. For a typical virtual run, that means:</p>
<ul>
  <li>The full activity date, not only “today” or a time of day.</li>
  <li>The distance and its visible unit, such as kilometres or miles.</li>
  <li>Elapsed or moving duration when timing is required.</li>
  <li>The activity type, such as run, walk, hike, or trail run.</li>
  <li>A recognisable app, watch, device, or treadmill source.</li>
  <li>A participant or account indicator only when needed to match the registration.</li>
  <li>Route, pace, elevation, steps, or location only when the event requires them.</li>
</ul>
<p>Do not add decorative frames that cover fields, stitch unrelated screens into a misleading total, or edit the performance numbers. If one screen cannot show all required fields, use the method permitted by the organiser and explain which screens belong to the same original activity. Preserve the original record in the app or device until review is complete.</p>

<h2>Screenshot evidence on HelloRun</h2>
<p>The current HelloRun result form accepts JPEG, PNG, and WebP activity screenshots. The interface currently states a limit of up to 5 MB; the live form is the final authority because deployment limits and supported formats can change. PDFs are not part of the current run-result screenshot input even though other platform uploads may accept them.</p>
<p>After upload, the form can analyse the image and propose activity fields. The runner reviews the detected information and confirms or corrects the final values before choosing an eligible event. The uploaded image remains evidence for review; the typed values do not replace it.</p>
<p>An exact screenshot reuse can be detected using a file hash. HelloRun checks for the same runner's matching proof across standard and accumulated submissions and can block the duplicate before it creates another activity. This prevents accidental double credit and simple reuse. It should not be interpreted as a guarantee that every possible manipulation or duplicate can be detected.</p>

<h2>Connected Strava activity imports</h2>
<p>A runner with a connected Strava account can select a recent supported activity instead of uploading its screenshot. HelloRun verifies that the chosen activity belongs to the connected athlete account and requires a positive distance, a positive duration, and a supported activity type. Current mappings include Run, Virtual Run, Trail Run, Walk, and Hike, subject to the selected event's permitted activities.</p>
<p>For an event submission, the imported activity date is checked against the event window. Its activity type is compared with accepted run types, and an accumulated event can enforce its minimum activity distance. The same Strava activity ID cannot be submitted repeatedly to the same event. A Strava import currently targets one HelloRun event or a Personal Record at a time.</p>
<p>Strava explains that moving time measures active movement while elapsed time covers the duration from start to finish, including stops. Its interface may prioritise moving time in some views. HelloRun's imported submission uses recorded duration data from the activity, so runners should inspect the event's timing basis instead of assuming every displayed pace or time means the same thing.</p>

<h2>Outdoor GPS, watches, and missing maps</h2>
<p>An outdoor phone or watch record is often useful because it can combine date, distance, duration, activity type, and route. It is still a measurement from a consumer device, not independent course certification. Signal loss, tall buildings, tree cover, tunnels, battery settings, auto-pause, device placement, and later app processing can affect the result.</p>
<p>A missing map does not automatically make an activity invalid. Indoor activities may have no route, and a runner may hide a route for privacy. What matters is whether the event requires a map and whether the remaining evidence answers the necessary questions. Conversely, a colourful route map alone is usually weak because it may omit the date, numeric distance, unit, and duration.</p>
<p>Before relying on a watch, confirm that its companion app has finished syncing. Capture or import the completed activity rather than a live workout screen. A live screen can change, may show only partial distance, and may not retain the final date or duration.</p>

<h2>Treadmill proof</h2>
<p>Treadmill evidence is event-dependent. Some virtual events accept indoor running or walking; others require outdoor GPS or separate treadmill categories. Confirm this before completing the activity, particularly when rankings or prizes are involved.</p>
<p>A treadmill console photo can show distance and duration, but it may not show the date, runner, unit, or activity type. A matching watch or app record may add context when the event permits supporting evidence. Do not alter one source to force agreement with the other. If the treadmill says 5.00 km and a watch estimates 4.82 km, keep both originals and use the event's stated source-of-truth or discrepancy rule.</p>
<p>Calibration, belt speed, stride estimation, pauses, and unit settings can explain different readings. Neither number is universally superior. A reviewer can decide only under the published mechanics, so ask before the deadline if no treadmill rule is available.</p>

<h2>Accumulated-distance proof</h2>
<p>In an accumulated challenge, each eligible activity is its own evidence record. HelloRun associates approved activity distance with the applicable registration and adds those approved distances toward the target. Pending and rejected activities do not improve official progress.</p>
<p>For example, a runner submits 4K, 6K, and 5K toward a 20K goal. If the first two are approved and the third is pending, official progress is 10K, not 15K. When the 5K is approved, the verified total becomes 15K. If it is rejected as a duplicate, it contributes nothing.</p>
<p>A single screenshot of a weekly total can obscure the date, activity type, and component distances. Submit the individual activity requested by the form. Read <a href="/blog/how-accumulated-distance-challenges-work">How Accumulated Distance Challenges Work</a> for target, minimum-activity, progress, and finalisation guidance.</p>

<h2>When devices and fields disagree</h2>
<p>Differences do not automatically establish fraud or accuracy. A phone, watch, treadmill, and app can use different sensors, pause rules, smoothing, conversion, or definitions. Moving time can differ from elapsed time; GPS distance can differ from treadmill distance; a five-mile activity can appear as 8.05 kilometres after conversion.</p>
<ol>
  <li>Keep every original record unchanged.</li>
  <li>Check whether the event names a required device, field, timing basis, unit, rounding rule, or tolerance.</li>
  <li>Enter the value from the required source rather than choosing whichever produces the best result.</li>
  <li>Use proof notes to explain a genuine difference when the form and rules allow it.</li>
  <li>Contact the organiser or <a href="/contact">HelloRun support</a> before the deadline when the rule is unclear.</li>
</ol>
<p>The <a href="/blog/best-apps-to-track-your-virtual-run">virtual-run app comparison</a> explains documented app and wearable features without ranking universal accuracy. For a detailed upload walkthrough, use <a href="/blog/how-to-submit-run-proof-correctly-hellorun">How to Submit Run Proof Correctly on HelloRun</a>.</p>

<h2>How OCR and integrity checks help</h2>
<p>Optical character recognition can extract candidate distance, time, date, elevation, steps, location, activity type, source, and name information from a screenshot. It reduces typing and helps compare the visible evidence with runner-confirmed fields. It can also record quality or mismatch signals for review.</p>
<p>OCR can misread stylised fonts, low contrast, small decimals, unusual layouts, or partially hidden fields. A detected “5.01” is not independent proof that the runner completed 5.01 kilometres. The original screenshot, confirmed values, event rules, and validation outcome still matter.</p>
<p>Current HelloRun validation can automatically approve an eligible clean OCR or validated Strava submission when its required checks pass and no relevant integrity signal is present. This is conditional, not guaranteed. A lower-quality extraction, missing required value, mismatch, below-minimum distance, or suspicious signal can keep the entry submitted for review. One signal does not by itself prove manipulation, and a responsible review should consider the complete record.</p>

<h2>Submission and review states</h2>
<h3>Submitted or pending</h3>
<p>The evidence exists but has not reached approval. Interfaces may describe this as submitted or pending review. It receives no approved progress, official leaderboard rank, or final completion benefit while it remains pending.</p>
<h3>Approved</h3>
<p>The submission met the current approval path for that event record. Approval may result from eligible validation or organiser/admin review. It can count toward completion, accumulated progress, an enabled leaderboard, or configured recognition. Approval is event-specific and does not convert the record into certified timing or a qualifying performance.</p>
<h3>Rejected</h3>
<p>The evidence did not satisfy the decision under the event rules or submission requirements. The runner should read the rejection reason rather than uploading the same file again. The current standard-result workflow permits a rejected submission to be replaced through the resubmission path; submitted or approved standard results are not open for ordinary resubmission.</p>
<h3>Flagged for attention</h3>
<p>An integrity signal can help a reviewer locate an inconsistency. It is internal review information, not a public accusation. Depending on event presentation, unresolved flagged results may be kept out of public standings.</p>

<h2>Duplicate evidence and original records</h2>
<p>Keep the original activity in its app or device and retain the original screenshot until the result is final. If a reviewer asks about a crop, date, or discrepancy, the full activity view is more useful than a newly edited copy.</p>
<p>HelloRun hashes uploaded screenshot bytes to identify exact reuse by the same runner across result records. A repeated upload can therefore be blocked as already submitted. Strava imports use the activity ID to prevent repeat submission for the same event. These controls reduce duplicate credit but do not certify the underlying device or prove that every distinct file represents a distinct run.</p>
<p>If one genuine activity is meant to count for more than one eligible registration, use the platform's offered multi-event selection rather than submitting altered copies. Personal Records are handled separately from event targets.</p>

<h2>Common reasons proof needs attention</h2>
<ul>
  <li>The run date is outside the event window or the submission arrived after the permitted deadline.</li>
  <li>The activity is below the category or minimum-activity distance.</li>
  <li>The sport type is not accepted.</li>
  <li>The screenshot is blurry, incomplete, or missing the distance unit, date, or required duration.</li>
  <li>The entered values conflict with the visible or imported fields.</li>
  <li>The image is an overall daily, weekly, monthly, or lifetime total instead of one requested activity.</li>
  <li>The evidence belongs to another account or cannot be matched as required.</li>
  <li>The same screenshot or Strava activity has already been submitted.</li>
  <li>Treadmill, manual, or another source was used without a clear event rule accepting it.</li>
  <li>The runner selected the wrong event, registration, distance, or participation mode.</li>
</ul>
<p>Review attention is not the same as a finding of misconduct. A cropped date may be an ordinary mistake; an implausible total may be a cumulative app screen; a name mismatch may reflect account naming. Clear correction rules help separate mistakes from intentional manipulation.</p>

<h2>Privacy before you share activity evidence</h2>
<p>An activity image or imported record can reveal more than distance. It may expose a home or workplace, repeated route, start time, full name, profile photo, device identifier, social contacts, heart rate, health information, or account notifications. Review the full screen before upload and submit only what the event needs.</p>
<p>Strava provides activity and map-visibility controls, but its help documentation warns that privacy behavior can differ when data is shared with an authorised third-party service. Hiding a map on one platform does not guarantee that every connected service receives the same hidden view. Check both services and avoid including unnecessary location data.</p>
<p>HelloRun public leaderboard rows do not return proof files, raw OCR text, email addresses, suspicious flags, or private review notes. Public result fields and name formatting are separate from reviewer access to submitted evidence. This is not a promise that an uploaded file has no authorised reviewers or retention period; read the <a href="/privacy">HelloRun Privacy Policy</a> and the organiser's notice.</p>
<p>The ICO's data-minimisation guidance recommends collecting data that is adequate, relevant, and limited to what is necessary. Organisers should apply that principle when choosing required fields, and runners should not volunteer unrelated private information merely to make a screenshot look more complete.</p>

<h2>Practical proof examples</h2>
<h3>Clear outdoor 5K</h3>
<p>Nia's activity summary shows 5.08 km, 31:42 elapsed time, the event date, “Run,” and the app name. The event accepts outdoor runs of at least 5.00 km during that week. The screenshot is readable and the confirmed fields match. It is reviewable, though approval still depends on the workflow.</p>
<h3>Cropped 10K summary</h3>
<p>Omar's image shows 10.2 but hides the unit and date. A map is visible, yet the reviewer cannot determine whether the record is kilometres, miles, or inside the event window. Omar should use the original full activity screen rather than adding typed labels to the cropped image.</p>
<h3>Treadmill disagreement</h3>
<p>Priya's event accepts treadmills. The console shows 5.00 km in 34:10, while her wrist device estimates 4.76 km. She keeps both images and follows the rule naming the treadmill as the distance source. If the event has no rule, she asks before submitting rather than editing the watch result.</p>
<h3>Accumulated total screen</h3>
<p>Mateo uploads a monthly dashboard showing 42 km but the challenge requires individual activities of at least 2 km. The total cannot show which runs occurred inside the window. He submits each eligible activity separately so approved distances can be associated with the registration.</p>
<h3>Imported Strava walk</h3>
<p>Ava imports a Walk from her connected account. The record has a valid date, positive distance, and duration, but the event accepts runs only. The import is technically readable yet not eligible under that event's activity rule.</p>

<h2>Runner pre-submission checklist</h2>
<ul>
  <li>Open the correct event and confirm the registration, category, participation mode, and completion format.</li>
  <li>Check the activity window, final deadline, and organiser timezone.</li>
  <li>Confirm the allowed activities, treadmill treatment, proof path, minimum distance, units, and required timing field.</li>
  <li>Wait for the app or watch to finish saving and syncing.</li>
  <li>Choose the final activity summary rather than a live screen or broad dashboard total.</li>
  <li>Check that date, distance, unit, duration, type, and source are readable.</li>
  <li>Review the route, name, photo, notifications, and health fields for unnecessary private information.</li>
  <li>Upload a supported image within the current form limit or select the correct connected Strava activity.</li>
  <li>Compare every extracted or typed value with the original evidence before confirming.</li>
  <li>Keep the original record and monitor the result status after submission.</li>
</ul>

<h2>What to do after rejection</h2>
<ol>
  <li>Read the exact rejection reason and the event mechanics.</li>
  <li>Confirm whether the issue is eligibility, date, distance, activity type, readability, duplication, identity matching, or a conflicting value.</li>
  <li>Return to the original app or device record; do not manufacture missing information.</li>
  <li>Prepare a clearer supported screenshot or correct source only when the activity itself remains eligible.</li>
  <li>Use the rejected-result resubmission action when it is available.</li>
  <li>If the decision appears inconsistent, contact support with the event name, registration or confirmation code, and submission reference—without posting private proof publicly.</li>
</ol>
<p>A new image cannot repair an activity completed outside the event window or an excluded sport type. Organisers should distinguish correctable evidence problems from non-correctable eligibility problems so runners do not waste time repeatedly uploading.</p>

<h2>Organizer evidence-policy checklist</h2>
<ul>
  <li>Define accepted activities, evidence paths, single-versus-accumulated format, minimum distances, units, and timing basis before registration.</li>
  <li>State how treadmills, hidden maps, accessibility alternatives, manual evidence, imported activities, and device discrepancies are handled.</li>
  <li>Separate activity, submission, correction, review, final-results, and reward dates with a timezone.</li>
  <li>Request only the personal data needed to decide eligibility and explain who reviews it.</li>
  <li>Apply the same published standard across comparable submissions and record understandable rejection reasons.</li>
  <li>Describe any competition tolerance, tie, or source-of-truth rule without presenting consumer devices as certified timing.</li>
  <li>Provide a correction and dispute route, including a deadline and escalation owner.</li>
  <li>Test the complete runner flow before launch and update instructions when the form changes.</li>
</ul>
<p>RRCA's race-director ethics provide useful context for honest, fair event administration. For the complete workflow, use <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">How to Organize a Virtual Run</a> and the <a href="/blog/how-leaderboards-work-virtual-running-events">leaderboard guide</a>.</p>

<h2>Frequently asked questions</h2>
<h3>Does every virtual run accept a screenshot?</h3>
<p>No. Evidence rules vary. HelloRun currently offers screenshot and connected Strava paths in its public submission flow, but the event page and live form determine what the runner should use.</p>
<h3>Is a map enough?</h3>
<p>Usually not when the event also requires date, numeric distance, unit, duration, or activity type. A hidden or missing map can still be acceptable when the rules do not require route evidence.</p>
<h3>Can OCR approve my proof?</h3>
<p>OCR can extract and compare fields. An eligible clean submission may meet automatic-approval criteria, but OCR is not perfect and does not guarantee approval. Other records remain available for organiser or admin review.</p>
<h3>Are Strava activities automatically valid?</h3>
<p>No. The connected activity must belong to the account, have supported data, fit the event window and activity rules, meet any minimum, avoid duplicate use, and reach approval.</p>
<h3>Can I submit a treadmill run?</h3>
<p>Only when the event permits it. Check which distance source and supporting fields the organiser requires.</p>
<h3>What if my proof uses miles?</h3>
<p>Keep the unit visible. Follow the event's conversion and rounding rule. Do not relabel miles as kilometres or crop the unit away.</p>
<h3>Why is my result still pending?</h3>
<p>It may require review because a field is missing, uncertain, mismatched, below a minimum, or otherwise outside clean validation criteria. Pending evidence has no approved progress or official rank.</p>
<h3>Can I replace an approved result?</h3>
<p>The ordinary resubmission path is for rejected standard results, not submitted or approved ones. Contact the organiser or support if an approved record contains a genuine error.</p>
<h3>Can other runners see my screenshot?</h3>
<p>Public leaderboard rows do not contain the proof file or private OCR and review fields. Authorised reviewers can access evidence as part of the workflow, so inspect it and read the privacy information before uploading.</p>
<h3>Does approved proof make my result official race timing?</h3>
<p>No. It creates an approved event-specific result. It is not proof of course measurement, World Athletics ranking, certified timing, or qualifying status unless an accepting organisation expressly provides otherwise.</p>
<h3>Where should a first-time runner start?</h3>
<p>Read <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">What Is a Virtual Run?</a>, browse <a href="/events">Events</a>, review <a href="/how-it-works">How It Works</a>, and check the <a href="/faq">FAQ</a>. Compare formats in <a href="/blog/virtual-run-vs-traditional-race-which-one-should-you-join">Virtual Run vs Traditional Race</a> and plan the activity using the <a href="/blog/running-safety-tips-early-morning-night-runs">running safety guide</a>.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://worldathletics.org/news/news/how-run-best-virtual-race-advice">World Athletics: Virtual races—are you up for the challenge?</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations">Strava Support: Moving Time, Speed, and Pace Calculations</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401776-strava-s-privacy-controls-faq">Strava Support: Privacy Controls FAQ</a></li>
  <li><a href="https://www.rrca.org/programs/race-director-certification/race-director-code-of-ethics/">Road Runners Club of America: Race Director Code of Ethics</a></li>
  <li><a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/">Information Commissioner's Office: Data Minimisation</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
  <li><a href="/how-it-works">How HelloRun Works</a></li>
</ul>
<p>Features, integrations, event rules, and upload limits can change. Recheck the live event page and submission form before completing an activity.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Quick proof guide',
  'How this guide was prepared',
  'The eight-part validity test',
  'What a strong screenshot shows',
  'Screenshot evidence on HelloRun',
  'Connected Strava activity imports',
  'Outdoor GPS, watches, and missing maps',
  'Treadmill proof',
  'Accumulated-distance proof',
  'When devices and fields disagree',
  'How OCR and integrity checks help',
  'Submission and review states',
  'Duplicate evidence and original records',
  'Common reasons proof needs attention',
  'Privacy before you share activity evidence',
  'Practical proof examples',
  'Runner pre-submission checklist',
  'What to do after rejection',
  'Organizer evidence-policy checklist',
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
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/how-leaderboards-work-virtual-running-events',
  '/blog/running-safety-tips-early-morning-night-runs',
  '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  'worldathletics.org/news/news/how-run-best-virtual-race-advice',
  'support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations',
  'support.strava.com/en-us/articles/15401776-strava-s-privacy-controls-faq',
  'rrca.org/programs/race-director-certification/race-director-code-of-ethics',
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
  if (wordCount < 2800) errors.push('article must contain at least 2800 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('existing cover image is required for ogImageUrl');
  if (/<h[12]>What Counts as Valid Run Proof\?<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/<em>[^<]+<\/em>\s*\*/i.test(payload.contentHtml)) errors.push('body contains malformed emphasized text');
  if (/OCR (?:is|works with) perfect accuracy/i.test(text)) errors.push('article must not claim perfect OCR');
  if (/(?:proof|submission) (?:is|will be) guaranteed (?:approval|approved)/i.test(text)) errors.push('article must not guarantee approval');
  if (/(?:every|all) (?:app|treadmill|manual) (?:record|entry|activity|proof).{0,25}(?:is|are) accepted/i.test(text)) errors.push('article must not claim universal evidence acceptance');
  if (/(?:one|a single) discrepancy.{0,35}automatically (?:rejects?|invalidates?)/i.test(text)) errors.push('article must not claim automatic rejection from one discrepancy');
  if (/public (?:leaderboard|result).{0,50}(?:shows|includes|exposes) (?:proof|raw OCR|email|suspicious flags|review notes)/i.test(text)) errors.push('article must not claim private review data is public');
  if (/approved proof (?:is|provides|creates) (?:certified|qualifying|official race timing)/i.test(text)) errors.push('article must not claim external certification');
  if (/manual.only (?:proof|entry).{0,35}(?:always|universally|every event)/i.test(text)) errors.push('article must not claim universal manual-only support');
  if (/all configured proof.type restrictions.{0,40}(?:are|remain) enforced/i.test(text)) errors.push('article must not claim complete proof-setting enforcement');
  if (!/documents the HelloRun proof-submission implementation available in July 2026/i.test(text)) errors.push('article must disclose its implementation-based methodology');
  if (!/automatically approve an eligible clean OCR or validated Strava submission/i.test(text)) errors.push('article must describe conditional automatic approval');
  if (!/Public leaderboard rows do not return proof files, raw OCR text, email addresses, suspicious flags, or private review notes/i.test(text)) errors.push('article must describe public-data separation');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid valid-run-proof payload: ${errors.join('; ')}`);
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
