'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-submit-run-proof-correctly-hellorun';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Submit Run Proof Correctly on HelloRun',
  excerpt: 'Submit HelloRun activity proof step by step, from choosing the run date and evidence source through field confirmation, review status, and corrections.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'run proof',
    'proof submission',
    'activity screenshot',
    'strava import',
    'ocr review',
    'result review',
    'virtual run',
    'runner guide'
  ]),
  seoTitle: 'How to Submit Run Proof Correctly | HelloRun',
  seoDescription: 'Follow HelloRun’s run-proof submission flow for screenshots and Strava imports, confirm activity details, avoid common errors, and handle pending or rejected results.',
  coverImageAlt: 'Runner using HelloRun’s three-step proof form to choose a run date, upload an activity screenshot, confirm distance and duration, and submit for review'
});

const RAW_CONTENT_HTML = `
<p>Submitting run proof on HelloRun is a short workflow with an important purpose: it connects one completed activity to the correct registration and gives the event reviewer enough information to make a decision. A clear screenshot or connected activity is only the evidence source. You still need the correct run date, event, activity type, distance, duration, and location.</p>
<p>The current form separates those decisions into three stages: choose the run date, provide an activity screenshot or connected Strava activity, then confirm the event and activity details. A final review screen lets you check the complete entry before sending it.</p>
<blockquote><strong>Important:</strong> completing the form correctly makes an activity reviewable; it does not guarantee approval. The event rules, registration eligibility, evidence, validation checks, and final review status determine whether it counts.</blockquote>

<h2>Run-proof submission in one minute</h2>
<ol>
  <li>Read the event mechanics and confirm your registration can submit.</li>
  <li>Finish the activity inside the event window and save the original record.</li>
  <li>Open Submit from the event page, runner dashboard, registration progress, or mobile navigation.</li>
  <li>Choose the date on which the activity was completed.</li>
  <li>Upload a supported screenshot and analyse it, or select a recent activity from your connected Strava account.</li>
  <li>Select the eligible event registration or Personal Record destination.</li>
  <li>Confirm activity type, distance, duration, location, and any optional fields.</li>
  <li>Review every value against the original activity and submit once.</li>
  <li>Open Submitted Entries and monitor whether the result is submitted, approved, or rejected.</li>
  <li>If rejected, read the reason and use the offered correction path before the deadline.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This guide documents the HelloRun proof-submission implementation available in July 2026. It was checked against the runner proof modal, browser-side workflow, image-upload rules, page controller, submission and accumulated-activity services, Strava validation, duplicate controls, and runner-facing result presentation. It is not an independent audit of OCR, GPS, treadmill, or device accuracy.</p>
<p>World Athletics provides virtual-race preparation context. Strava documents moving and elapsed time and third-party privacy behavior. RRCA ethics and ICO data-minimisation guidance provide fairness and privacy context. Those sources do not decide a HelloRun result: the live event mechanics, form, and applicable platform policies remain authoritative.</p>

<h2>Before opening the form</h2>
<h3>Confirm the registration</h3>
<p>You need an eligible registration belonging to your runner account. For a paid event, the payment state must permit result submission. Uploading a payment receipt and submitting activity proof are separate actions reviewed for different purposes. A receipt does not prove a run, and an activity screenshot does not confirm payment.</p>
<h3>Read the event boundaries</h3>
<p>Check the activity start and end, final submission deadline, timezone, category distance, accepted activity types, treadmill policy, minimum activity distance, and evidence instructions. An upload made before the deadline can still fail eligibility if the activity date is outside the event window.</p>
<h3>Finish and save the original activity</h3>
<p>Wait for the app, watch, or treadmill record to finish saving. If a wearable syncs to a companion app, let that process complete before taking a screenshot. Capture the final activity summary rather than a live workout screen or a weekly dashboard.</p>
<h3>Check privacy and readability</h3>
<p>Make sure the fields required by the event are readable, but avoid sharing unrelated information. A full activity view may contain a home location, profile photo, notifications, heart rate, health fields, contacts, or recurring schedule. Read <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> for detailed examples of strong, unclear, and ineligible evidence.</p>

<h2>Where to start a submission</h2>
<p>Signed-in runners can encounter a Submit or Submit Run action in several places: an eligible event's details, the runner dashboard, active-registration progress, and the mobile navigation Submit button. A rejected result can instead show a resubmission or “Fix entry” action.</p>
<p>If you start from a particular event or registration, the form can preselect that destination. The same form still checks current eligibility when it opens and again when it submits. A previously visible button does not override a closed window, changed registration, or payment state.</p>
<p>If you are signed out, sign in to the runner account that owns the registration. Browse current <a href="/events">Events</a>, review <a href="/how-it-works">How It Works</a>, and use the <a href="/faq">FAQ</a> when the overall registration journey is unclear.</p>

<h2>Step 1: choose the actual run date</h2>
<p>The first stage asks for the date you completed the activity. Choose the activity date shown in the original app or device record, not the upload date and not the day you happened to register.</p>
<p>HelloRun uses that date to find joined events whose activity schedules include it. If you completed a run on 12 July, an event whose eligible window ended on 10 July should not appear as a valid target. The server also rechecks the selected date against each event during submission and can return an outside-event-window error.</p>
<p>Date labels such as “Today” on an app can become ambiguous later. Prefer a final activity view that shows the calendar date. If an overnight activity crosses midnight, follow the source record and event rule rather than changing the date to obtain eligibility.</p>
<p>If no event is eligible for the chosen date, check the following before contacting support:</p>
<ul>
  <li>The date matches the completed activity.</li>
  <li>You are signed into the account that owns the registration.</li>
  <li>The registration is confirmed and its payment state allows submission.</li>
  <li>The event activity window and submission period are still applicable.</li>
  <li>The registration has not already received its one standard result.</li>
</ul>

<h2>Step 2A: upload an activity screenshot</h2>
<p>The current run-result form accepts JPEG, PNG, and WebP images. Its interface currently states a maximum of 5 MB. PDF is not accepted by this run-proof input, even though other HelloRun workflows may accept different formats. Treat the live form as the final authority because deployment limits can change.</p>
<p>Select or drop one image into the upload area. The form displays a preview and offers Replace and Remove actions before submission. Inspect the preview: orientation, crop, compression, or an accidental image selection can make an otherwise useful record unreadable.</p>
<p>A typical screenshot should visibly identify the completed activity and show the date, distance and unit, duration, activity type, and recognizable source. Location, route, pace, elevation, steps, or participant name may be needed depending on the event. Do not edit performance values or combine unrelated screens into one misleading activity.</p>
<p>After selecting the image, choose Analyse Activity Screenshot. Analysis attempts to extract candidate values for the next stage. It is an assistance step, not a certification step. If analysis cannot read the image, replace it with a clearer original or enter the values carefully when the form permits continuation.</p>

<h2>Step 2B: select a connected Strava activity</h2>
<p>A runner who has authorised a Strava connection can choose Sync Strava Data and select one recent supported activity. HelloRun checks that the activity belongs to the connected athlete account and reads its source values rather than asking the runner to recreate the record from memory.</p>
<p>Current supported mappings include Run, Virtual Run, Trail Run, Walk, and Hike. The selected event can accept a narrower set. The activity also needs a positive distance and duration, an eligible date, and any event-specific minimum distance. A technically successful Strava sync does not make an excluded Walk eligible for a run-only event.</p>
<p>A Strava submission currently targets one HelloRun event or Personal Record at a time. This differs from the screenshot path, which can offer several eligible event registrations for one genuine activity. Do not create altered screenshots to imitate multi-event Strava targeting.</p>
<p>The same Strava activity ID cannot repeatedly count for the same event. If an activity has already been submitted, select the correct distinct activity or inspect the existing entry. Disconnecting and reconnecting the account does not turn one activity into a new run.</p>
<p>Strava distinguishes moving time from elapsed time. Elapsed time covers the period from start to finish, including stops, while moving time measures detected active movement. Its interface may emphasize different fields in different views. Confirm the event's timing basis instead of assuming every displayed pace or duration is equivalent.</p>

<h2>How screenshot and Strava targeting differ</h2>
<h3>Screenshot submission</h3>
<p>After the date and image are processed, the form can show every currently eligible registration that the same activity may target. Select only events whose mechanics allow that activity. HelloRun validates each selected target before writing results so an ordinary eligibility error does not intentionally create a partial multi-event submission.</p>
<h3>Strava submission</h3>
<p>The imported activity targets one event registration or one Personal Record destination. Its activity identity and imported fields stay associated with that source. If you select the wrong event, correct the selection before final confirmation.</p>
<h3>Personal Record</h3>
<p>Personal Record is a personal-log destination rather than an event registration. It does not silently count toward an event, leaderboard, reward, or certificate. A new personal record entry is created for each submission rather than using the standard rejected-result replacement rule.</p>

<h2>Step 3: select the event and classify the activity</h2>
<p>The Event Selection area lists destinations available for the chosen date and current account state. Confirm the event title, distance/category, and registration. A correct 10K screenshot attached to the wrong registration is still an incorrect submission.</p>
<p>For screenshots, select each eligible event the activity should count toward only when its rules permit that use. For Strava, select one target. If an event disappears after the form was opened, eligibility may have changed; refresh rather than trying to bypass the current state.</p>
<p>Next choose one run classification:</p>
<ul>
  <li><strong>Run:</strong> an activity recorded and represented as running.</li>
  <li><strong>Walk:</strong> a walking activity when the event accepts it.</li>
  <li><strong>Hike:</strong> a hiking activity when permitted.</li>
  <li><strong>Trail Run:</strong> a trail-running activity when permitted.</li>
</ul>
<p>Use the source activity's genuine type. Renaming a ride or another excluded sport does not make it eligible. Treadmill acceptance is also event-dependent; the activity type button alone does not establish indoor eligibility.</p>

<h2>Step 3: confirm distance, duration, and location</h2>
<h3>Distance in kilometres</h3>
<p>The form records distance in kilometres, with two decimal places available. If the source uses miles, keep the original unit visible and follow the event's conversion or rounding rule. Five miles is about 8.05 kilometres; it is not five kilometres. Do not crop away the unit or simply relabel the number.</p>
<h3>Duration in hours, minutes, and seconds</h3>
<p>Enter the time requested by the event and represented by the source. The form combines hours, minutes, and seconds into the submitted duration. Check that “1 hour 05 minutes” has not become “1 minute 05 seconds,” and distinguish moving from elapsed time when the event does.</p>
<h3>Location</h3>
<p>Location is required in the current form. Use a concise city, route, venue, or indoor description that is accurate without exposing a precise home address. “Indoor treadmill” or a general park name may be more appropriate than unnecessary coordinates when the event does not require a route.</p>
<h3>Elevation gain and steps</h3>
<p>Elevation gain and steps are optional fields in the current interface. Leave an unavailable optional value blank rather than inventing zero or copying it from another session. If OCR proposes either field, verify it against the visible source.</p>

<h2>Review OCR-assisted values carefully</h2>
<p>Screenshot analysis can propose distance, duration, date, location, activity type, elevation, steps, source, and name information. The form can display an autofill notice, an extraction summary, and mismatch warnings. Every proposed value remains the runner's responsibility to check.</p>
<p>OCR can confuse decimal separators, small fonts, stylized digits, low contrast, cropped labels, or miles and kilometres. A visible 5.01 can be read as 501; a duration can be mistaken for pace; an account nickname can look like another person. Correct an ordinary reading error to match the original evidence rather than changing the evidence to match the extraction.</p>
<p>If the detected name differs from the HelloRun account, the form warns the runner and offers a chance to replace the screenshot. Continuing with a genuine mismatch places the result into manual review rather than guaranteeing rejection or approval. A name warning is an integrity signal, not a public accusation.</p>
<p>Eligible clean OCR or validated Strava submissions can meet current conditional automatic-approval rules. Missing fields, mismatches, below-minimum values, or other integrity signals can keep an entry submitted for organiser or admin review. OCR is fallible and does not independently prove accuracy.</p>

<h2>Saved drafts and proof privacy</h2>
<p>The form can save entered details locally in the browser so an interrupted runner can resume on the same device. When a saved entry is found, the runner can resume it or start over.</p>
<p>The uploaded proof image is deliberately not restored from that draft. The runner must choose it again after resuming. This reduces the chance that sensitive image data remains available through a stored text draft. It also means a resumed entry must be rechecked from the evidence stage rather than submitted without its source.</p>
<p>A local draft is not a submitted result and does not reserve deadline eligibility. If the event closes while a draft remains on the device, the server can still reject the eventual attempt.</p>

<h2>Review before submitting</h2>
<p>Submitting first opens a review screen summarising the chosen destination and activity details. Compare it line by line with the original record. Use Edit Details for an error instead of assuming it can be changed freely after submission.</p>
<p>The confirmation states that the activity is your own and the submitted details are accurate. It also explains that HelloRun may analyse the screenshot, retain OCR-assisted fields, flag mismatches or suspicious entries, and share the evidence with an authorised event organiser for review.</p>
<ul>
  <li>Confirm the run date and selected event registration.</li>
  <li>Confirm the activity classification.</li>
  <li>Compare distance, unit conversion, and duration with the source.</li>
  <li>Check the location is useful but not unnecessarily precise.</li>
  <li>Review any optional elevation or step values.</li>
  <li>Make sure the preview is the intended activity image or Strava record.</li>
</ul>
<p>Select Submit Now once. The interface disables or marks an in-progress action, and the server uses submission-attempt and proof/activity idempotency controls to reduce duplicate writes during retries. If a network response is uncertain, inspect Submitted Entries before repeating the action.</p>

<h2>What happens after submission</h2>
<p>A success screen confirms that the activity details and evidence were received. You can submit another distinct result when eligible or open the submitted-entry list.</p>
<h3>Submitted or pending</h3>
<p>The record exists but has not reached approval. Pending distance is not approved completion, accumulated progress, or an official leaderboard result.</p>
<h3>Approved</h3>
<p>The record passed an eligible approval path or was approved by an organiser/admin. It can count under that event's configured completion, progress, leaderboard, or recognition behavior. Approval remains event-specific evidence, not certified timing or a qualifying result.</p>
<h3>Rejected or needs correction</h3>
<p>The runner-facing submission area displays the rejection reason and a Fix entry action when correction is available. A rejected result does not count unless a permitted replacement or correction later reaches approval.</p>
<h3>Flagged internally</h3>
<p>An integrity signal can direct reviewer attention to a discrepancy. Raw OCR output, suspicious flags, emails, proof files, and private review notes are not public leaderboard columns.</p>

<h2>Standard results, accumulated activities, and personal logs</h2>
<h3>Standard one-result event</h3>
<p>A standard registration ordinarily has one result record. Once it has a submitted or approved result, a new ordinary submission is blocked. If that result is rejected, use its correction or resubmission action rather than trying to create another independent record.</p>
<h3>Accumulated-distance event</h3>
<p>An accumulated registration accepts separate distinct activities while the event permits submission. Each activity receives its own status. Only approved distance enters official progress; a pending activity remains potential distance and a rejected activity contributes nothing. Read <a href="/blog/how-accumulated-distance-challenges-work">How Accumulated Distance Challenges Work</a>.</p>
<h3>Personal Record</h3>
<p>A Personal Record saves an activity to the runner's personal log. It does not replace selecting an event registration when the activity is meant to count for that event.</p>

<h2>How to correct a rejected result</h2>
<ol>
  <li>Open Submitted Entries and select the result labelled Needs correction.</li>
  <li>Read the rejection reason and compare it with the event mechanics.</li>
  <li>Follow the displayed correction strategy: correct eligible metadata, replace unclear proof, or address both when offered.</li>
  <li>For a Strava-source result, reselect the appropriate imported activity rather than editing locked imported fields.</li>
  <li>Review the replacement against the original record and resubmit before the applicable deadline.</li>
  <li>Monitor the new status; resubmission returns the result to review unless it meets a conditional approval path.</li>
</ol>
<p>The ordinary correction path applies to rejected results. Submitted and approved standard results are not freely editable through ordinary resubmission. Contact the organiser or <a href="/contact">HelloRun support</a> for a genuine error, including the event name and submission reference without posting private proof publicly.</p>
<p>A clearer image cannot repair an activity outside the window, an excluded activity type, or a distance below an inflexible rule. Do not manufacture missing information or upload a modified version of the same evidence merely to evade a rejection.</p>

<h2>Troubleshooting common submission errors</h2>
<h3>No eligible events appear</h3>
<p>Check the run date, account, registration, payment state, event window, and whether a standard result already exists. Refresh if the event or registration changed after opening the form.</p>
<h3>The image is rejected</h3>
<p>Confirm it is JPEG, PNG, or WebP and within the limit currently shown by the form. Renaming a PDF or unsupported file extension does not convert its actual file type.</p>
<h3>Analysis reads the wrong value</h3>
<p>Use a clearer original and check the preview. If continuation is available, enter values that match the evidence and expect review when a mismatch remains. Do not treat OCR confidence as an approval score.</p>
<h3>A different name is detected</h3>
<p>Confirm the screenshot belongs to you and is the correct file. Replace it if not. If an app nickname or OCR error explains the difference, preserve the original and continue only when the activity is genuinely yours, understanding that manual review follows.</p>
<h3>The screenshot was already submitted</h3>
<p>HelloRun can identify exact image reuse by the same runner across standard and accumulated records. Inspect existing entries and use offered multi-event selection for one genuine activity. Complete and submit a distinct activity when the event expects another result.</p>
<h3>The Strava activity is missing or duplicated</h3>
<p>Confirm the correct Strava account is connected, the activity has finished syncing, and its type is supported. If already used for the same event, inspect the existing submission instead of selecting it again.</p>
<h3>The form says a result already exists</h3>
<p>A standard registration cannot receive another ordinary result while its result is submitted or approved. If rejected, open that existing entry's correction action.</p>
<h3>The network stopped after Submit</h3>
<p>Do not immediately create altered evidence or repeatedly press Submit. Reopen Submitted Entries and check whether the attempt succeeded. Retry only when no record exists and the interface permits it.</p>

<h2>Privacy before sending proof</h2>
<p>Inspect the entire image, not only the distance. Screenshots can expose map start and end points, home or work locations, start times, full names, profile images, health metrics, photos, notifications, and device identifiers. Submit only what the event needs and review the <a href="/privacy">HelloRun Privacy Policy</a>.</p>
<p>Strava offers activity and map privacy controls, but its documentation explains that information shared with authorised third-party services can behave differently from the public Strava view. In particular, map visibility applied within Strava may not be transmitted in the same way to a connected service. Review both services before authorising access.</p>
<p>The ICO's data-minimisation principle recommends information that is adequate, relevant, and limited to the stated purpose. A reviewer may need distance and date; that does not automatically justify unrelated messages, contacts, or health details. Organisers should request only what is necessary and explain who can review it.</p>

<h2>Four practical submission examples</h2>
<h3>One screenshot for two eligible events</h3>
<p>Lena completes one 10K during the overlapping windows of two events whose mechanics permit the same activity. She chooses the actual date, uploads the unchanged final summary, and selects both eligible registrations in the screenshot flow. She does not upload two edited copies.</p>
<h3>Accumulated 25K challenge</h3>
<p>Marco submits a distinct 6K activity to his 25K accumulated registration. The entry is pending, so it is not official progress yet. He keeps the original and waits for approval before treating the verified total as six kilometres higher.</p>
<h3>Strava walk for a run-only event</h3>
<p>A connected Walk syncs successfully, but the event accepts Run and Trail Run only. The imported record is real but not eligible for that event. Technical availability does not override the activity rule.</p>
<h3>Rejected blurry screenshot</h3>
<p>Imani's screenshot hides the decimal and date. The result is rejected with an unclear-proof reason. She opens Fix entry, selects the original full activity summary, confirms the same genuine values, and resubmits before the deadline.</p>

<h2>Before-upload checklist</h2>
<ul>
  <li>Confirm the correct account, registration, category, payment state, and event rules.</li>
  <li>Check the activity date, final submission deadline, and timezone.</li>
  <li>Confirm walking, hiking, trail running, treadmill, and evidence rules where relevant.</li>
  <li>Wait for the original activity to finish saving and syncing.</li>
  <li>Choose a final activity summary rather than a live or weekly-total screen.</li>
  <li>Check date, distance, unit, duration, activity type, and source are readable.</li>
  <li>Remove unnecessary private information without hiding required evidence.</li>
  <li>Use a supported file within the live limit or the correct connected Strava account.</li>
</ul>

<h2>Final-confirmation checklist</h2>
<ul>
  <li>The chosen run date matches the source.</li>
  <li>The selected event registration and category are correct.</li>
  <li>The activity type is genuine and permitted.</li>
  <li>Distance is correctly represented in kilometres and the source unit remains understandable.</li>
  <li>Hours, minutes, and seconds are in the correct fields.</li>
  <li>Location is accurate without unnecessary precision.</li>
  <li>OCR-proposed and optional fields match the evidence.</li>
  <li>The activity is your own and the selected evidence is the intended record.</li>
</ul>

<h2>Post-submission checklist</h2>
<ul>
  <li>Open Submitted Entries and confirm the event and activity appear once.</li>
  <li>Record whether the status is submitted, approved, or rejected.</li>
  <li>Keep the original activity and screenshot until review is final.</li>
  <li>Do not count pending distance as approved progress or rank.</li>
  <li>Read rejection reasons promptly and use Fix entry when available.</li>
  <li>Check the <a href="/blog/how-leaderboards-work-virtual-running-events">leaderboard guide</a> before reporting a missing rank.</li>
  <li>Use private support channels rather than posting evidence publicly.</li>
</ul>

<h2>Organizer note: make the runner flow testable</h2>
<p>Organisers should publish accepted activities, evidence path, dates, timezone, distance and unit rules, treadmill policy, review states, correction deadline, and support contact before registration. Test the complete runner path with the same instructions participants will receive.</p>
<p>Apply comparable review decisions, write understandable rejection reasons, and request only necessary evidence. RRCA's ethics offer fairness context; the full operational workflow is in <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">How to Organize a Virtual Run</a>.</p>

<h2>Frequently asked questions</h2>
<h3>Can I submit without an event registration?</h3>
<p>You need an eligible registration for an event result. Personal Record is a separate personal-log destination and does not create event eligibility.</p>
<h3>Can a screenshot count for more than one event?</h3>
<p>The current screenshot flow can offer multiple eligible registrations for the same genuine activity. Every selected event must permit it. Strava currently targets one event or Personal Record at a time.</p>
<h3>Does HelloRun accept PDF proof?</h3>
<p>Not in the current run-result image input. It accepts JPEG, PNG, and WebP, currently up to the limit displayed by the form.</p>
<h3>Must I use OCR?</h3>
<p>Screenshot analysis helps fill fields, but the runner must confirm the final values. It is not a device-accuracy or approval guarantee.</p>
<h3>Can I submit a treadmill activity?</h3>
<p>Only when the event permits it and the evidence meets its requirements. The public flow does not make treadmill proof universally acceptable.</p>
<h3>Why can I not edit an approved result?</h3>
<p>Ordinary resubmission is designed for rejected standard results. Contact the organiser or support about a genuine error in a submitted or approved record.</p>
<h3>Why is my result still pending?</h3>
<p>It may require organiser or admin review because clean conditional approval criteria were not met. Pending is not approved progress or an official rank.</p>
<h3>Does approval guarantee a certificate?</h3>
<p>No. Certificates and other recognition depend on event configuration and workflow. Accumulated certificates can also wait for the deadline and final reviews.</p>
<h3>Can other runners see my screenshot?</h3>
<p>Public leaderboard rows exclude proof files and private OCR or review fields. Authorised reviewers can access submitted evidence, so inspect it and read the privacy terms before uploading.</p>
<h3>Does approved proof create an official qualifying time?</h3>
<p>No. It is an event-specific reviewed result, not certified course timing or a qualifying performance unless an accepting organisation expressly says otherwise.</p>
<h3>How should a new runner prepare for the activity?</h3>
<p>Use the <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K plan</a> for a flexible walk-run framework and the <a href="/blog/running-safety-tips-early-morning-night-runs">running safety guide</a> for route, visibility, weather, and check-in decisions.</p>
<h3>Where can I compare the full event format?</h3>
<p>Start with <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">What Is a Virtual Run?</a>, compare <a href="/blog/virtual-run-vs-traditional-race-which-one-should-you-join">virtual and onsite races</a>, and review the <a href="/blog/best-apps-to-track-your-virtual-run">tracking-app comparison</a>.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://worldathletics.org/news/news/how-run-best-virtual-race-advice">World Athletics: Virtual Race Preparation</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations">Strava Support: Moving Time, Speed, and Pace Calculations</a></li>
  <li><a href="https://support.strava.com/en-us/articles/15401776-strava-s-privacy-controls-faq">Strava Support: Privacy Controls FAQ</a></li>
  <li><a href="https://www.rrca.org/programs/race-director-certification/race-director-code-of-ethics/">Road Runners Club of America: Race Director Code of Ethics</a></li>
  <li><a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/">Information Commissioner's Office: Data Minimisation</a></li>
  <li><a href="/how-it-works">How HelloRun Works</a></li>
  <li><a href="/faq">HelloRun FAQ</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
</ul>
<p>The interface, integrations, event mechanics, and upload limits can change. Recheck the live form and event page before relying on a submission instruction.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Run-proof submission in one minute',
  'How this guide was prepared',
  'Before opening the form',
  'Where to start a submission',
  'Step 1: choose the actual run date',
  'Step 2A: upload an activity screenshot',
  'Step 2B: select a connected Strava activity',
  'How screenshot and Strava targeting differ',
  'Step 3: select the event and classify the activity',
  'Step 3: confirm distance, duration, and location',
  'Review OCR-assisted values carefully',
  'Saved drafts and proof privacy',
  'Review before submitting',
  'What happens after submission',
  'Standard results, accumulated activities, and personal logs',
  'How to correct a rejected result',
  'Troubleshooting common submission errors',
  'Privacy before sending proof',
  'Four practical submission examples',
  'Before-upload checklist',
  'Final-confirmation checklist',
  'Post-submission checklist',
  'Organizer note: make the runner flow testable',
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
  '/blog/what-counts-as-valid-run-proof',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/how-leaderboards-work-virtual-running-events',
  '/blog/running-safety-tips-early-morning-night-runs',
  '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  '/blog/beginner-5k-training-plan-new-runners',
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
  if (wordCount < 3000) errors.push('article must contain at least 3000 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('existing cover image is required for ogImageUrl');
  if (/<h[12]>How to Submit Run Proof Correctly on HelloRun<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/<em>[^<]+<\/em>\s*\*/i.test(payload.contentHtml)) errors.push('body contains malformed emphasized text');
  if (/(?:OCR|submission|proof).{0,35}(?:guarantees?|always receives?) (?:approval|acceptance)/i.test(text)) errors.push('article must not guarantee approval');
  if (/OCR (?:is|provides) (?:perfect|infallible|proof of accuracy)/i.test(text)) errors.push('article must not claim perfect OCR');
  if (/(?:every|all) events?.{0,35}(?:accept|allow).{0,25}(?:screenshots?|treadmills?|manual proof)/i.test(text)) errors.push('article must not claim universal evidence acceptance');
  if (/(?:submitted|approved) (?:results?|entries).{0,35}(?:can|may) (?:always|freely) (?:be )?(?:edited|resubmitted)/i.test(text)) errors.push('article must not claim unrestricted editing');
  if (/public leaderboard.{0,40}(?:shows?|contains?|exposes?).{0,30}(?:proof files?|raw OCR|review notes?)/i.test(text)) errors.push('article must not claim public review data exposure');
  if (/(?:approved proof|HelloRun approval).{0,35}(?:is|creates?|guarantees?) (?:certified|qualifying|official timing)/i.test(text)) errors.push('article must not claim certified timing');
  if (!/documents the HelloRun proof-submission implementation available in July 2026/i.test(text)) errors.push('article must disclose implementation-based methodology');
  if (!/current run-result form accepts JPEG, PNG, and WebP images/i.test(text)) errors.push('article must state current screenshot formats');
  if (!/maximum of 5 MB/i.test(text)) errors.push('article must state the current interface limit');
  if (!/Strava submission currently targets one HelloRun event or Personal Record at a time/i.test(text)) errors.push('article must state Strava single-target behavior');
  if (!/uploaded proof image is deliberately not restored from that draft/i.test(text)) errors.push('article must explain draft proof privacy');
  if (!/ordinary correction path applies to rejected results/i.test(text)) errors.push('article must explain rejected-only correction');
  if (!/Pending distance is not approved completion/i.test(text)) errors.push('article must distinguish pending results');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid proof-submission payload: ${errors.join('; ')}`);
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
