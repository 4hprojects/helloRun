'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-join-a-virtual-run-philippines';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Join a Virtual Run in the Philippines',
  excerpt: 'Join a virtual run in the Philippines with clear steps for choosing an event, registering, paying safely, completing your activity, and submitting proof.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'virtual run philippines',
    'join virtual run',
    'runner registration',
    'payment receipt',
    'run proof',
    'online running event',
    'philippine runners',
    'first virtual run'
  ]),
  seoTitle: 'How to Join a Virtual Run in the Philippines',
  seoDescription: 'Learn how to join a virtual run in the Philippines, compare event rules and fees, register, upload payment receipts, complete your activity, and submit proof.',
  coverImageAlt: 'Filipino runner joining a virtual event on a phone, reviewing PHP registration details, recording an outdoor run, and submitting activity proof'
});

const RAW_CONTENT_HTML = `
<p>Joining a virtual run from the Philippines involves more than choosing a distance from a poster. A trustworthy event should tell you when registration opens, when activities may be completed, what the fee includes, how payment is confirmed, what proof is accepted, and what happens after review.</p>
<p>HelloRun brings those stages into one runner journey: examine the structured event page, register for a mode and goal, complete payment when required, record an eligible activity, submit evidence, and wait for approval. Physical rewards, leaderboards, certificates, and delivery remain event-dependent.</p>
<blockquote><strong>The practical rule:</strong> use the live event settings as your source of truth. A social-media poster or private message should not override the structured dates, price, payment account, activity rules, or support information shown for the event.</blockquote>

<h2>Join a Philippine virtual run in one minute</h2>
<ol>
  <li>Browse <a href="/events">current events</a> and open the complete event page.</li>
  <li>Check organiser identity, registration dates, activity dates, submission deadline, format, distance, fee, proof, rewards, privacy, and support.</li>
  <li>Sign in, choose virtual participation and the correct distance, category, signup option, or package.</li>
  <li>Review your profile snapshot, accept the event waiver, and sign with your full account name.</li>
  <li>For a free event, confirm the registration. For a paid event, follow the organiser's external payment instructions and upload the receipt from My Registrations.</li>
  <li>Wait for the payment status to become paid before relying on the registration as ready for result submission.</li>
  <li>Complete the permitted activity within the event window, using safe conditions and the required tracking method.</li>
  <li>Upload a supported activity screenshot or select an eligible connected Strava activity.</li>
  <li>Wait for approval; pending payment or run proof is not a final result.</li>
  <li>Check configured results, leaderboard, certificate, pickup, delivery, or support updates after review.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This guide documents HelloRun's joining workflow available in July 2026. It was checked against the public event presentation, registration form and validation, pricing resolver, payment-receipt workflow, Asia/Manila activity-date checks, proof submission, runner result presentation, reward settings, and delivery fields. It is not a promise that every organiser enables every feature.</p>
<p>Philippine context comes from PAGASA weather resources, National Privacy Commission guidance, BSP financial-safety resources, and DTI online-transaction guidance. World Athletics supplies virtual-race preparation context. This article is practical platform information, not individualized medical, legal, tax, financial, or consumer-rights advice.</p>

<h2>What “virtual” means in the Philippines</h2>
<p>A virtual event usually lets a participant complete an activity away from a shared start line and submit a record for review. That flexibility does not automatically mean anywhere, anytime, any app, or any activity. An event can limit the country or region, specify outdoor or indoor activity, accept only particular sport types, require one continuous result, or set a minimum for each accumulated activity.</p>
<p>A runner in Quezon City might use a nearby park; a runner in Cebu might choose a safe local loop; a participant in Baguio might encounter elevation and weather unlike Manila. Those results are not inherently comparable. Route, GPS signal, elevation, heat, rain, treadmill calibration, and pause settings can change the recorded experience.</p>
<p>Start with <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">What Is a Virtual Run?</a> for the complete format definition. Use <a href="/blog/virtual-run-vs-traditional-race-which-one-should-you-join">Virtual Run vs Traditional Race</a> when deciding whether flexibility or an onsite course better fits your goal.</p>

<h2>Trust checklist before you register</h2>
<ul>
  <li><strong>Organiser:</strong> Is the organiser named, and is there a clear support route?</li>
  <li><strong>Structured dates:</strong> Are registration, activity, submission, results, and fulfilment stages distinguishable?</li>
  <li><strong>Format:</strong> Is the event single-activity, accumulated-distance, completion-only, competitive, virtual, onsite, or hybrid?</li>
  <li><strong>Goal:</strong> Are the distance, category, participation mode, and permitted activity types clear?</li>
  <li><strong>Price:</strong> Are the currency, registration amount, pricing period, package, optional costs, and delivery fee shown?</li>
  <li><strong>Payment:</strong> Do the payee and instructions match the event and your registration record?</li>
  <li><strong>Proof:</strong> Are screenshot, Strava, treadmill, map, unit, timing, and minimum-distance rules stated?</li>
  <li><strong>Review:</strong> Does the event explain pending, approval, rejection, corrections, and disputes?</li>
  <li><strong>Recognition:</strong> Are leaderboard, certificate, medal, kit, prize, and eligibility conditions separated?</li>
  <li><strong>Fulfilment:</strong> Are pickup, delivery area, address requirements, courier costs, and timing described?</li>
  <li><strong>Policies:</strong> Have you read the <a href="/refund-and-cancellation-policy">Refund and Cancellation Policy</a> and event-specific terms?</li>
  <li><strong>Privacy:</strong> Do you understand what profile, payment, proof, result, and delivery data will be shared?</li>
</ul>
<p>A listing does not mean the Philippine government has approved an event, and it is not a guarantee of organiser performance. Evaluate the actual terms before spending money or sharing evidence.</p>

<h2>Understand the six important dates</h2>
<h3>Registration opening and closing</h3>
<p>This is when you may reserve a place. Registering does not mean you may complete the activity immediately if the activity window starts later.</p>
<h3>Activity opening and closing</h3>
<p>Your qualifying run, walk, hike, or trail run must occur within the published event window. An early activity does not become eligible merely because proof is uploaded later.</p>
<h3>Final submission deadline</h3>
<p>This is the final boundary for sending evidence. It may differ from the last activity date, particularly when organisers allow time for syncing or uploads.</p>
<h3>Review and results period</h3>
<p>Payment receipts and run proof can remain pending while organisers or admins review them. Leaderboards can change before review closes.</p>
<h3>Certificate or recognition finalisation</h3>
<p>Configured recognition can depend on approval and event closeout. Accumulated certificates can wait until the submission boundary and all submitted accumulated activities are reviewed.</p>
<h3>Pickup or delivery period</h3>
<p>Physical rewards follow a separate fulfilment process. Reaching a goal is not the same as a courier dispatch date.</p>
<p>HelloRun's current platform date and day-level activity alignment use the <code>Asia/Manila</code> timezone. That helps establish the Philippine calendar day, but you should still copy the exact structured timestamps and timezone displayed by the event. Do not infer a deadline solely from a poster saying “until Sunday.”</p>

<h2>Choose the right event format and goal</h2>
<h3>Single-activity event</h3>
<p>You normally complete the selected distance in one eligible activity. Several shorter sessions do not form one 10K unless the event is configured for accumulation.</p>
<h3>Accumulated-distance challenge</h3>
<p>You submit distinct activities toward one registration goal. Only approved distance counts officially. Pending distance remains potential progress, and rejected activities contribute nothing. Read <a href="/blog/how-accumulated-distance-challenges-work">How Accumulated Distance Challenges Work</a>.</p>
<h3>Completion versus ranking</h3>
<p>Some events focus on reaching the goal, while others enable reviewed standings. A HelloRun leaderboard is not certified race timing or a World Athletics ranking. See <a href="/blog/how-leaderboards-work-virtual-running-events">How Virtual Running Leaderboards Work</a>.</p>
<h3>Distance and category</h3>
<p>Choose a distance appropriate to your preparation and the event mechanics. A 5K, 10K, or longer challenge can have different fee, package, minimum, proof, or reward conditions. New runners can use the <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K training plan</a> as a flexible preparation framework rather than a guaranteed deadline.</p>

<h2>Register through the current HelloRun form</h2>
<p>Open the event page and choose its registration action. The form shows only the participation modes, race distances, signup options, and packages currently available for that event. For this guide, select virtual participation when it is offered and intended.</p>
<p>Paid events may present a simple distance price, distance-and-period pricing, a custom signup option, or a named registration package. Packages can list items such as a medal, shirt, towel, patch, finisher kit, or another inclusion. Read the package and current pricing period rather than assuming every distance receives the same items.</p>
<p>The form saves a profile snapshot with the registration. Check your name, email, mobile number, country, age information, and other displayed fields. An emergency contact may be collected where the participation mode or event requires it. Correct your profile before confirming when information is outdated.</p>
<p>Read the event waiver, select acceptance, and enter the digital signature using your full HelloRun account name. The form currently requires the normalized signature to match that name. A waiver records agreement; it does not erase an organiser's duties or guarantee that a route, event, or activity is safe.</p>

<h2>Free registration and paid registration</h2>
<h3>Free event</h3>
<p>A free registration has no registration payment receipt step. It can still have strict dates, proof, review, privacy, and activity rules. “Free” does not mean informal or automatically approved.</p>
<h3>Paid event</h3>
<p>The amount due can depend on distance, signup option, registration package, or active pricing period. The currency defaults to PHP for Philippine event setups but is stored per event. Physical rewards can also include a separately shown pickup or delivery charge.</p>
<p>Review the final registration snapshot rather than relying on an old advertisement. Confirm the fee, currency, option or package name, included items, pricing period, and any delivery amount before transferring funds.</p>
<p>HelloRun currently records the registration, instructions, receipt, and review status. It does not directly charge the runner or move money between accounts. Payment occurs through the external method specified by the organiser.</p>

<h2>Pay through the published organiser instructions</h2>
<ol>
  <li>Open My Registrations and expand Payment and receipt.</li>
  <li>Confirm the amount due, currency, signup option or package, payee name, and organiser instructions.</li>
  <li>Use the stated external payment channel. This may be GCash, a bank, another regulated provider, or a different method, but no single method is universal.</li>
  <li>Before confirming the transfer, check the recipient shown by the payment provider against the published payee.</li>
  <li>Save the original transaction receipt with amount, date, recipient, and reference visible as required.</li>
  <li>Return to My Registrations and upload that receipt to the payment section.</li>
  <li>Monitor the payment status and respond to a rejection reason when necessary.</li>
</ol>
<p>If payment instructions change through a private message, do not transfer immediately. Compare them with the official event record and confirm the change through the event's published support route. The BSP verifier can help identify BSP-regulated financial institutions and payment providers, but it does not certify the event organiser or guarantee a transaction.</p>
<p>Keep the transaction reference and registration confirmation. Do not share an OTP, PIN, password, recovery phrase, or full account credentials with an organiser, runner, or support contact.</p>

<h2>Upload and track the payment receipt</h2>
<p>The current My Registrations payment form accepts JPEG, PNG, or PDF receipts up to 5 MB. This differs from the activity-proof form, which currently accepts JPEG, PNG, or WebP images. Upload the file to the correct section.</p>
<h3>Unpaid</h3>
<p>No accepted payment receipt has established a paid registration. Follow the displayed instructions rather than sending run proof to the payment queue.</p>
<h3>Payment receipt submitted</h3>
<p>The receipt is awaiting organiser review. This state is not the same as paid, and the event result action can remain unavailable.</p>
<h3>Paid</h3>
<p>The registration's payment review is approved. This does not approve a future run result or guarantee a refund, reward, or delivery.</p>
<h3>Payment receipt rejected</h3>
<p>Read the reason. The image may be unreadable, for another recipient, missing required transaction details, or inconsistent with the amount. Upload a suitable original replacement only when the payment itself remains valid.</p>
<p>Payment receipt review and activity-proof review are separate decisions. A screenshot of Strava is not a payment receipt, and a GCash or bank receipt is not evidence that you completed a run.</p>

<h2>Check rewards, pickup, and delivery before paying</h2>
<p>An event can offer digital recognition, physical items, both, or neither. Read the actual package and reward settings. A medal image in promotional artwork is not enough if the structured event information does not say who qualifies, what is included, and how it will be fulfilled.</p>
<ul>
  <li>Check whether the item is included in the registration price or sold separately.</li>
  <li>Confirm whether recognition requires registration, payment, approved completion, ranking, or another condition.</li>
  <li>Check pickup only, delivery only, or a choice of both.</li>
  <li>Confirm the delivery area, address requirement, delivery fee, courier instructions, and estimated schedule.</li>
  <li>Ask who handles missing, damaged, delayed, or returned items.</li>
  <li>Read event-specific cancellation and refund terms before payment.</li>
</ul>
<p>HelloRun can record configured reward and delivery details, but the organiser remains responsible for fulfilment. Listing a medal, certificate, package, or courier plan does not guarantee that it will be delivered on a particular date.</p>

<h2>Prepare for Philippine conditions</h2>
<p>The Philippines can present high heat and humidity, thunderstorms, tropical cyclones, intense rainfall, flooding, traffic, uneven surfaces, and low-light conditions. A virtual deadline is not a reason to run through a PAGASA warning or an unsafe route.</p>
<p>Before an outdoor activity, check current PAGASA heat-index information, local rainfall or thunderstorm advisories, tropical-cyclone bulletins, and flood information. Conditions vary by city and can change quickly. Use the most recent regional information rather than a screenshot from the previous day.</p>
<p>Postpone, shorten, or choose an allowed indoor activity when conditions are unsafe. Follow local government and emergency instructions. Do not enter floodwater or a closed route to preserve a streak or submission date.</p>
<p>Use <a href="/blog/running-safety-tips-early-morning-night-runs">Running Safety Tips for Early Morning and Night Runs</a> for route, visibility, weather, check-in, and warning-sign guidance. That article and this one are general information, not individual medical advice.</p>

<h2>Choose and test your tracking method</h2>
<p>The event page determines the accepted evidence. A phone app, GPS watch, companion app, or treadmill display may be useful, but no device is universally required or accurate. Check whether the event accepts screenshot proof, connected Strava, treadmill activities, hidden maps, and the intended activity type.</p>
<p>Before the real activity:</p>
<ul>
  <li>Charge the phone or watch and check location permissions.</li>
  <li>Confirm kilometres versus miles.</li>
  <li>Learn how start, pause, resume, and finish work.</li>
  <li>Test syncing from a watch to its companion app.</li>
  <li>Check what the final activity summary displays.</li>
  <li>Review route-map and profile privacy.</li>
</ul>
<p>The <a href="/blog/best-apps-to-track-your-virtual-run">running-app comparison</a> compares documented features without claiming a universal accuracy winner.</p>

<h2>Complete the eligible activity</h2>
<p>Use the event's required format. For a single-activity 5K, finish one eligible activity that reaches the category requirement. For an accumulated 50K challenge, submit separate qualifying activities that meet any minimum-per-activity rule.</p>
<p>Walking, hiking, trail running, and treadmill activity count only when the event allows them. Do not relabel an excluded sport. Preserve the original date, distance, unit, duration, and activity type. If two devices disagree, keep both originals and follow the event's source-of-truth or discrepancy rule.</p>
<p>Choose a route that is suitable for your ability and conditions, not merely one that produces a fast GPS trace. A virtual event can reduce travel, but it does not provide marshals, traffic control, aid stations, or medical support unless explicitly arranged.</p>

<h2>Submit activity proof on HelloRun</h2>
<p>The current public result flow offers a supported activity screenshot or a connected Strava import. For a screenshot, choose the actual run date, upload JPEG, PNG, or WebP evidence within the current form limit, analyse the screenshot, select an eligible event, and confirm activity type, distance, duration, and location.</p>
<p>OCR-assisted analysis can propose values, but the runner must compare them with the original record. It can misread decimals, units, time, names, or layouts. A mismatch can send the entry to review; OCR does not independently prove accuracy.</p>
<p>A connected Strava activity must belong to the linked account, have supported data, fit the event window and activity rules, and avoid repeat use for the same event. Read <a href="/blog/how-to-submit-run-proof-correctly-hellorun">How to Submit Run Proof Correctly on HelloRun</a> for the complete interface walkthrough and <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> for evidence examples.</p>

<h2>Understand result review and recognition</h2>
<h3>Submitted or pending</h3>
<p>The record exists but has not been approved. It does not count toward official completion, accumulated progress, or ranking.</p>
<h3>Approved</h3>
<p>The result passed an eligible validation path or organiser/admin review. It can count toward the event's configured completion, progress, leaderboard, or certificate behavior.</p>
<h3>Rejected</h3>
<p>Read the reason and use the offered correction path before the applicable deadline. A replacement image cannot repair an activity outside the window or an excluded sport.</p>
<p>Clean eligible OCR or validated Strava entries can meet conditional automatic-approval rules, while other cases remain available for human review. Approval is event-specific; it is not certified course measurement, government recognition, or a qualifying result.</p>
<p>Leaderboards and certificates are configured features, not universal entitlements. Pending results have no official rank, and accumulated certificate finalisation can wait for the deadline and event-wide final review.</p>

<h2>Four Philippine runner examples</h2>
<h3>Free first 5K</h3>
<p>Ana chooses a free virtual 5K, confirms that walking is accepted, signs the waiver, and receives a confirmed registration without payment. She completes one outdoor walk-run inside the window, uploads a clear app summary, and waits for result approval.</p>
<h3>Paid 10K with finisher package</h3>
<p>Paolo selects a 10K package listing a shirt and medal. He checks the PHP registration fee, separate delivery charge, payee, claiming method, and refund terms. He transfers through the published external channel, uploads the receipt, and waits for paid status before completing the result workflow.</p>
<h3>Accumulated 50K challenge</h3>
<p>Mika joins a month-long 50K category. She submits separate 6K, 8K, and 5K activities. The first two are approved and the third is pending, so official progress is 14K rather than 19K. She keeps every original record until review closes.</p>
<h3>Unsafe weather near the deadline</h3>
<p>Joel plans an outdoor activity, but PAGASA and local advisories indicate hazardous rainfall and flooding. He postpones and checks whether an indoor treadmill is allowed. If no safe eligible option remains, he contacts support instead of entering floodwater to meet the deadline.</p>

<h2>Philippine privacy and data-sharing checks</h2>
<p>The National Privacy Commission describes transparency, legitimate purpose, and proportionality as core Philippine data-privacy principles. In practical terms, understand why information is requested, how it will be used, who receives it, and whether it is limited to what the purpose needs.</p>
<p>A registration can contain profile details, waiver data, payment evidence, activity proof, results, communications, and a delivery address. Organisers may need some of those records to operate the event, but that does not make unrelated information necessary.</p>
<ul>
  <li>Do not expose an OTP, PIN, password, full account credentials, or unrelated account balance.</li>
  <li>Check payment receipts for unnecessary transaction history.</li>
  <li>Review screenshots for home coordinates, notifications, photos, contacts, or health fields.</li>
  <li>Provide a delivery address only when the selected fulfilment method requires it.</li>
  <li>Use private support channels rather than posting receipts or run proof publicly.</li>
  <li>Read the <a href="/privacy">HelloRun Privacy Policy</a> and the organiser's event notice.</li>
</ul>

<h2>Pre-registration checklist</h2>
<ul>
  <li>Open the complete event page rather than registering from a poster alone.</li>
  <li>Verify organiser, support, format, participation mode, distance, and category.</li>
  <li>Record registration, activity, submission, review, and fulfilment dates.</li>
  <li>Read accepted activities, treadmills, apps, proof, units, minimums, and correction rules.</li>
  <li>Compare registration price, package, optional costs, delivery fee, and refund terms.</li>
  <li>Check leaderboard, certificate, medal, kit, prize, and fulfilment conditions separately.</li>
  <li>Review privacy and data-sharing information.</li>
</ul>

<h2>Payment checklist</h2>
<ul>
  <li>Use the amount, currency, payee, and instructions shown for the registration.</li>
  <li>Verify a changed instruction through the official event support route.</li>
  <li>Confirm the recipient in the external payment service before sending.</li>
  <li>Save the original transaction receipt and reference.</li>
  <li>Upload JPEG, PNG, or PDF within the current payment-form limit.</li>
  <li>Wait for paid status; receipt submitted is still pending review.</li>
  <li>Read and address any payment rejection reason.</li>
</ul>

<h2>Activity and proof checklist</h2>
<ul>
  <li>Check current PAGASA and local conditions and choose a safe permitted route or indoor option.</li>
  <li>Confirm the device, app, units, activity type, and privacy settings.</li>
  <li>Complete the correct single or accumulated format inside the window.</li>
  <li>Save the final original record with date, distance, unit, duration, type, and source.</li>
  <li>Submit through the correct registration rather than the payment queue.</li>
  <li>Review OCR or imported values against the original.</li>
  <li>Keep the original until approval and event closeout.</li>
</ul>

<h2>Closeout and fulfilment checklist</h2>
<ul>
  <li>Confirm payment and result reached their final expected states.</li>
  <li>Check approved progress rather than counting pending entries.</li>
  <li>Review final standings only after outstanding decisions are resolved.</li>
  <li>Download a configured certificate when it becomes available.</li>
  <li>Confirm pickup or delivery instructions, address, fee, and organiser updates.</li>
  <li>Report unresolved payment, proof, refund, or fulfilment issues through <a href="/contact">Contact</a> with the event and confirmation reference.</li>
</ul>

<h2>Troubleshooting common problems</h2>
<h3>I registered but cannot submit a result</h3>
<p>Check payment status, event status, submission window, participation mode, and whether a standard result already exists. A submitted payment receipt may still need approval.</p>
<h3>The organiser sent different payment details</h3>
<p>Pause and verify through the official event support route. Do not treat an unsolicited private message as a replacement for the structured event information.</p>
<h3>My payment receipt was rejected</h3>
<p>Read the reason, check recipient, amount, date, transaction reference, and readability, then upload an eligible original replacement when appropriate.</p>
<h3>My app uses miles</h3>
<p>Keep the unit visible and use the event's conversion rule. Do not crop the unit or relabel miles as kilometres.</p>
<h3>My result is pending</h3>
<p>Pending means it has not reached approval. It may require review due to evidence quality, a mismatch, a minimum, or another validation condition.</p>
<h3>My reward has not arrived</h3>
<p>Check the qualification, fulfilment schedule, pickup/delivery method, and organiser updates. Contact the organiser with the registration reference; result approval alone does not establish a courier date.</p>

<h2>Frequently asked questions</h2>
<h3>Are all virtual runs in the Philippines legitimate?</h3>
<p>No platform or article can guarantee that universally. Evaluate the organiser, event details, policies, payment instructions, support route, and fulfilment plan before joining.</p>
<h3>Does every paid event accept GCash?</h3>
<p>No. Follow the specific organiser instructions. The external method may involve GCash, a bank, another provider, or another stated channel.</p>
<h3>Does HelloRun process my payment?</h3>
<p>No. The current workflow records external payment instructions, receipt evidence, and manual review status; it does not directly move the funds.</p>
<h3>Can I walk or use a treadmill?</h3>
<p>Only when the event permits that activity and evidence. Check before completing it.</p>
<h3>Can I run anywhere in the Philippines?</h3>
<p>Not automatically. The event may limit location or route type, and the runner must choose a lawful, suitable, and safe place.</p>
<h3>Do I receive a medal or certificate?</h3>
<p>Only when the event configures and promises that recognition and you meet its conditions. Digital and physical rewards have separate workflows.</p>
<h3>When does my approved result appear on a leaderboard?</h3>
<p>Only if the event enables a leaderboard and the result fits its filters. Recently reviewed standings can also take a short time to refresh.</p>
<h3>Can someone outside the Philippines join?</h3>
<p>Only if the event's eligibility, payment, activity, timezone, reward, and delivery rules permit it. International delivery and costs should never be assumed.</p>
<h3>What happens if I miss the deadline?</h3>
<p>Contact support, but do not assume a late activity or upload will be accepted. The published boundary and consistent treatment of participants matter.</p>
<h3>Can I get a refund?</h3>
<p>Review the platform policy and event-specific terms. Eligibility depends on the circumstances and applicable obligations; a cancellation record does not itself prove that external funds were returned.</p>
<h3>Where can organisers learn the full workflow?</h3>
<p>Use <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">How to Organize a Virtual Run</a> for planning, payment review, proof review, support, privacy, and closeout guidance.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://pagasa.dost.gov.ph/weather/heat-index">PAGASA: Heat Index</a></li>
  <li><a href="https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin">PAGASA: Tropical Cyclone Bulletins</a></li>
  <li><a href="https://www.pagasa.dost.gov.ph/flood">PAGASA: Flood Advisories and Monitoring</a></li>
  <li><a href="https://privacy.gov.ph/data-privacy-act/">National Privacy Commission: Data Privacy Act of 2012</a></li>
  <li><a href="https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/">National Privacy Commission: Implementing Rules and Data Privacy Principles</a></li>
  <li><a href="https://www.bsp.gov.ph/SitePages/FinancialStability/BSPVerifier.aspx">Bangko Sentral ng Pilipinas: BSP-Regulated Institution Verifier and Scam Awareness</a></li>
  <li><a href="https://ecommerce.dti.gov.ph/wp-content/uploads/2024/06/Joint-Administrative-Order-No.-24-03.pdf">Department of Trade and Industry: Internet Transactions Act Implementing Rules</a></li>
  <li><a href="https://worldathletics.org/news/news/how-run-best-virtual-race-advice">World Athletics: Virtual Race Preparation</a></li>
  <li><a href="/how-it-works">How HelloRun Works</a></li>
  <li><a href="/faq">HelloRun FAQ</a></li>
  <li><a href="/refund-and-cancellation-policy">HelloRun Refund and Cancellation Policy</a></li>
</ul>
<p>Event settings, government guidance, payment-provider information, and platform features can change. Recheck live sources before registering, paying, or completing an activity.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Join a Philippine virtual run in one minute',
  'How this guide was prepared',
  'What “virtual” means in the Philippines',
  'Trust checklist before you register',
  'Understand the six important dates',
  'Choose the right event format and goal',
  'Register through the current HelloRun form',
  'Free registration and paid registration',
  'Pay through the published organiser instructions',
  'Upload and track the payment receipt',
  'Check rewards, pickup, and delivery before paying',
  'Prepare for Philippine conditions',
  'Choose and test your tracking method',
  'Complete the eligible activity',
  'Submit activity proof on HelloRun',
  'Understand result review and recognition',
  'Four Philippine runner examples',
  'Philippine privacy and data-sharing checks',
  'Pre-registration checklist',
  'Payment checklist',
  'Activity and proof checklist',
  'Closeout and fulfilment checklist',
  'Troubleshooting common problems',
  'Frequently asked questions',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/how-it-works',
  '/faq',
  '/contact',
  '/privacy',
  '/refund-and-cancellation-policy',
  '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
  '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
  '/blog/beginner-5k-training-plan-new-runners',
  '/blog/running-safety-tips-early-morning-night-runs',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/how-leaderboards-work-virtual-running-events',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  'pagasa.dost.gov.ph/weather/heat-index',
  'pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin',
  'pagasa.dost.gov.ph/flood',
  'privacy.gov.ph/data-privacy-act',
  'bsp.gov.ph/SitePages/FinancialStability/BSPVerifier.aspx',
  'ecommerce.dti.gov.ph',
  'worldathletics.org/news/news/how-run-best-virtual-race-advice'
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
  const affirmativeGuaranteeText = text.replace(/\b(?:does|do|is|are|can|will) not\b[^.]{0,160}\bguarantee(?:d|s)?\b/gi, '');
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
  if (/<h[12]>How to Join a Virtual Run in the Philippines<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/<em>[^<]+<\/em>\s*\*/i.test(payload.contentHtml)) errors.push('body contains malformed emphasized text');
  if (/(?:every|all) (?:Philippine )?(?:virtual )?events?.{0,35}(?:accept|allow).{0,25}(?:GCash|walking|treadmills?|any app)/i.test(text)) errors.push('article must not claim universal event acceptance');
  if (/HelloRun (?:directly )?(?:processes?|handles?|moves?) (?:your )?(?:payment|funds|money)/i.test(text)) errors.push('article must not claim direct payment processing');
  if (/(?:payment|receipt|result).{0,30}(?:is|will be) (?:instantly|immediately|automatically) approved/i.test(text)) errors.push('article must not promise instant approval');
  if (/(?:every|all) (?:runner|participant).{0,30}(?:receives?|gets?) (?:a )?(?:medal|certificate|reward)/i.test(text)) errors.push('article must not promise universal recognition');
  if (/(?:guaranteed (?:refund|delivery|legitimacy|safety)|(?:refund|delivery|legitimacy|safety) (?:is|are) guaranteed|guarantees? (?:a )?(?:refund|delivery|legitimacy|safety))/i.test(affirmativeGuaranteeText)) errors.push('article must not guarantee refunds, delivery, legitimacy, or safety');
  if (/(?:government|DTI|BSP).{0,25}(?:approved|certified) (?:event|organiser)/i.test(text)) errors.push('article must not claim government event approval');
  if (/waiver.{0,30}(?:removes?|eliminates?|waives?) (?:all )?(?:organiser|organizer) (?:responsibility|duties|liability)/i.test(text)) errors.push('article must not absolve organisers through waivers');
  if (/(?:run|participate) anywhere,? anytime/i.test(text)) errors.push('article must not promise anywhere-anytime participation');
  if (!/documents HelloRun's joining workflow available in July 2026/i.test(text)) errors.push('article must disclose implementation-based methodology');
  if (!/current platform date and day-level activity alignment use the Asia\/Manila timezone/i.test(text)) errors.push('article must explain platform timezone behavior');
  if (!/current My Registrations payment form accepts JPEG, PNG, or PDF receipts up to 5 MB/i.test(text)) errors.push('article must state receipt formats and limit');
  if (!/does not directly charge the runner or move money between accounts/i.test(text)) errors.push('article must disclose external payment handling');
  if (!/Payment receipt review and activity-proof review are separate decisions/i.test(text)) errors.push('article must separate payment and activity proof');
  if (!/transparency, legitimate purpose, and proportionality/i.test(text)) errors.push('article must include Philippine privacy principles');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid Philippine joining guide payload: ${errors.join('; ')}`);
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
