'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'why-a-virtual-run-submission-may-be-rejected';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'Why a Virtual Run Submission May Be Rejected',
  excerpt: 'Understand why virtual-run evidence may be blocked, held for review, or rejected—and how to correct unclear proof, activity, identity, distance, date, metric, or duplicate issues.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'virtual run',
    'submission rejection',
    'run proof',
    'activity evidence',
    'proof review',
    'result correction',
    'GPS activity',
    'event rules'
  ]),
  seoTitle: 'Why a Virtual Run Submission May Be Rejected | HelloRun',
  seoDescription: 'Learn why virtual-run proof may be blocked, reviewed, or rejected, what HelloRun rejection reasons mean, and how to correct an eligible result safely.',
  coverImageAlt: 'Runner calmly reviewing a virtual-run submission on a phone beside running shoes, a sports watch, and a water bottle near a bright park window'
});

const RAW_CONTENT_HTML = `
<p>A virtual run submission may be rejected when the activity or its evidence does not satisfy the event's published requirements. The issue might be a blurry screenshot, the wrong activity, a name mismatch, insufficient distance, an ineligible date, missing metrics, duplicate evidence, or another problem that the reviewer explains.</p>
<p>Rejection is not the same as an upload error, a pending review, or an integrity flag. Those states call for different responses. A failed file check means no result may have been created. A submitted result is still awaiting a decision. A review signal asks a reviewer to look more closely. A rejected result has received a decision and should include a reason the runner can act on.</p>
<blockquote><strong>The practical rule:</strong> read the live event mechanics, preserve the original activity, identify the exact state and reason, and correct only what the evidence and workflow genuinely allow.</blockquote>

<h2>Rejection guidance in one minute</h2>
<ol>
  <li><strong>Confirm the state.</strong> Decide whether the attempt was blocked, submitted, flagged for review, or rejected.</li>
  <li><strong>Open the actual result.</strong> Use Submitted Entries or the registration card rather than relying only on an email preview.</li>
  <li><strong>Read the reason and event rules together.</strong> A rejection label identifies the issue; the event mechanics determine what qualifies.</li>
  <li><strong>Keep the source unchanged.</strong> Do not edit activity values, manufacture missing fields, or alter an image to evade review.</li>
  <li><strong>Use the offered correction path.</strong> Replace unclear proof, correct eligible metadata, or select a different eligible Strava activity as directed.</li>
  <li><strong>Act before the applicable deadline.</strong> A correction action does not extend the event or submission window.</li>
  <li><strong>Ask privately when needed.</strong> Contact the organiser or <a href="/contact">HelloRun support</a> with the event and submission reference, without posting private proof publicly.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This guide documents the HelloRun run-submission implementation available in July 2026. It was checked against the current rejection-reason catalog, screenshot and Strava submission services, event-window validation, duplicate controls, OCR and integrity signals, organiser review pages, runner correction presentation, accumulated-activity workflow, notifications, and public-result rules.</p>
<p>It is not a universal rule for every virtual event, an independent audit of a phone, watch, treadmill, GPS track, OCR model, or Strava record, or a finding about any runner's intent. The live event page, applicable policies, original activity, and final review record remain decisive for a particular entry.</p>
<p>Official material from Strava explains why moving and elapsed time or GPS-derived values can differ. The Road Runners Club of America provides general fairness and good-faith context for race directors. Information Commissioner's Office guidance supports collecting evidence that is adequate, relevant, and limited to what is necessary. Those sources provide context; they do not approve or reject HelloRun results.</p>

<h2>Four outcomes that are easy to confuse</h2>
<h3>1. Blocked before submission</h3>
<p>The form or service can refuse an attempt before a reviewable result is created. Examples include an unsupported file, an invalid or out-of-window run date, an ineligible registration, a closed submission window, a duplicate proof hash, an already-used Strava activity for the same event, an unsupported activity type, or a result that already exists in a state that is not open for ordinary resubmission.</p>
<p>Read the displayed validation message and check Submitted Entries before retrying. Repeatedly pressing Submit can create confusion when a network response is delayed. A blocked attempt is not a reviewer rejecting a stored result.</p>
<h3>2. Submitted and awaiting review</h3>
<p>A submitted result exists, but it has not been approved or rejected. Some clean evidence can satisfy a conditional automatic-approval path; other evidence remains pending for an organiser or administrator. Pending distance is not approved completion, official accumulated progress, or an official leaderboard result.</p>
<h3>3. Flagged for manual attention</h3>
<p>A validation or integrity signal can direct a reviewer to a possible mismatch, missing value, low-confidence extraction, below-minimum distance, or suspicious pattern. A review flag does not prove fraud or misconduct. OCR can misread small text, nicknames can differ, GPS can drift, and devices can calculate time differently. Reviewers should inspect the complete record before deciding.</p>
<h3>4. Rejected with a correction reason</h3>
<p>A rejected result has received a review decision. On HelloRun, organisers choose a structured run-rejection reason and can add details. The runner-facing result shows the feedback and an appropriate correction action when the workflow permits it. Rejected distance does not count toward official completion, standings, or accumulated progress unless a corrected replacement is later approved.</p>

<h2>The eight HelloRun run-rejection reasons</h2>
<p>The current review interface uses eight structured categories. They make feedback more consistent, but the reviewer still needs to apply the event's published mechanics and explain unusual cases.</p>
<h3>Activity proof is unclear</h3>
<p>The screenshot may be blurry, compressed, dark, partly covered, excessively cropped, or missing enough context to read the activity. A decimal point, unit, full date, duration, activity type, or source might be impossible to verify. A route map by itself may look convincing while omitting the numeric fields the event needs.</p>
<p>Open the original activity summary and upload a clear supported image that shows the required fields. Check the preview before submitting. Do not sharpen, paint over, or reconstruct performance numbers. If the source app uses several legitimate summary screens, ask whether the event accepts supporting evidence before combining anything.</p>
<h3>Proof does not show the required activity</h3>
<p>The evidence may belong to another event, registration, or activity; show a daily or monthly dashboard instead of one run; show cycling for a run-only category; or use a treadmill, walk, hike, or trail activity that the selected event does not accept. A genuine workout can still be ineligible for a particular event.</p>
<p>Compare the activity type, category, participation mode, proof method, and event window. Submit a different eligible original activity when the rules permit. Renaming an excluded activity does not change what happened.</p>
<h3>Activity identity does not match</h3>
<p>The proof may show a different person's account, an unrelated participant name, or identity information that cannot be reconciled with the runner's registration. OCR can also read a profile name incorrectly, so a mismatch signal should lead to review rather than an automatic accusation.</p>
<p>First confirm that the selected image or connected account is yours. If the evidence belongs to someone else, replace it with your own eligible activity. If a nickname, changed surname, shared device display, or OCR error explains a genuine discrepancy, retain the original evidence and give the organiser concise context through a private channel.</p>
<h3>Distance does not meet the event requirement</h3>
<p>A standard one-time result may be below the selected category distance. An accumulated activity may be below the event's minimum per activity. The visible source distance may also disagree with the typed value. Rounding a 4.96K record to 5K is not automatically permitted merely because an app displays fewer decimals elsewhere.</p>
<p>Check the event's distance source, unit, conversion, rounding, and tolerance rules. Correct a transcription or unit mistake only when the original evidence supports the correction. If the actual activity is too short, clearer proof cannot make it qualify; complete another eligible activity if time and rules allow.</p>
<h3>Activity date is outside the event window</h3>
<p>The activity must occur within the applicable dates and timezone. Uploading before the final deadline does not make an earlier or later activity eligible. A screenshot that says only “Today” can become ambiguous, and a Strava activity can carry recorded local and UTC timing that needs to be interpreted under the event rule.</p>
<p>Use the original activity date and check the event's opening, closing, and final submission times. Correct an entry mistake when the source proves the eligible date. Do not change the recorded date to move a genuinely out-of-window run into the event.</p>
<h3>Required activity details are missing</h3>
<p>Distance, duration, and date are common required fields. Depending on the event, the reviewer may also need the activity type, unit, source, category, location, participant identifier, or another published metric. A screenshot can be readable yet incomplete.</p>
<p>Return to the original activity detail view and capture the required fields using an accepted method. More personal information is not always better. Include what the decision needs without exposing unrelated notifications, messages, contacts, health information, or precise home locations.</p>
<h3>Activity was already submitted</h3>
<p>One original activity should not receive unintended duplicate credit. HelloRun can compare exact uploaded-image hashes for the same runner across standard and accumulated records, and it prevents the same Strava activity ID from being used repeatedly for the same event. These controls reduce simple reuse; they do not prove that every distinct file represents a distinct activity.</p>
<p>Inspect existing entries before trying again. When one genuine activity is eligible for multiple events, use the multi-event option offered by the screenshot flow rather than editing or re-exporting copies. If the event expects a new activity, complete and submit a new eligible record.</p>
<h3>Another activity issue needs correction</h3>
<p>Some legitimate problems do not fit the seven specific categories. The organiser must add meaningful detail for this option so the runner knows what to address. “Invalid” or “Rejected” alone is not useful correction guidance.</p>
<p>Compare the explanation with the published event mechanics. If the requested correction was not disclosed, appears inconsistent with comparable decisions, or cannot be understood, ask the organiser for clarification through the official contact route.</p>

<h2>Why screenshot evidence may need correction</h2>
<p>HelloRun's current screenshot flow accepts JPEG, PNG, and WebP activity images within the limit shown by the live form. The image should normally expose the source context, distance and unit, duration, date, and activity type requested by the event. A live workout screen, cropped map, weekly total, training plan, payment receipt, or social-media graphic may not establish one completed eligible activity.</p>
<p>Typed fields do not replace the source. If the runner enters 10.00K but the screenshot visibly shows 1.00K, a reviewer needs to resolve the discrepancy. The same applies to hours, minutes, seconds, date, elevation, steps, location, and run type. Ordinary mistakes are possible, so reviewers should request correction instead of assuming intent from one mismatch.</p>
<p>Before uploading, read <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> and follow <a href="/blog/how-to-submit-run-proof-correctly-hellorun">the HelloRun proof-submission walkthrough</a>. Preserve the original file and completed activity until review is final.</p>

<h2>Why a Strava submission may need review or rejection</h2>
<p>A connected Strava activity must belong to the connected athlete, contain a positive distance and duration, map to a supported run type, fall within the event window, satisfy any applicable minimum distance, and not already be used for that event. A successful sync proves that data was imported; it does not override the event's eligibility rules.</p>
<p>Strava documents that elapsed time covers start to finish while moving time represents active movement, and it can calculate or prioritize fields differently depending on sport, pauses, and device data. An event must state which timing basis it uses. A difference between the watch, uploaded activity, and displayed feed value is a reason to inspect definitions, not automatically a reason to accuse the runner.</p>
<p>A rejected Strava-source result does not offer ordinary free editing of imported fields. The correction guidance directs the runner to sync or select an appropriate eligible activity and submit it again. Keep the original activity unchanged and explain a genuine timing or type discrepancy if the event provides that route.</p>

<h2>OCR and validation signals are not verdicts</h2>
<p>Screenshot analysis can propose distance, time, date, elevation, steps, location, run type, source, and name fields. It can also record missing values, low confidence, mismatches, and quality signals. This helps route evidence efficiently, but OCR is fallible. Stylised fonts, glare, small decimals, low contrast, unusual layouts, and crops can change what is detected.</p>
<p>Current conditional approval criteria are intentionally separate from the final rejection decision. A screenshot that does not meet automatic criteria can remain submitted for human review. Similarly, a below-minimum or name-mismatch signal can prompt attention without proving manipulation. OCR or Strava does not guarantee approval.</p>
<p>Runners should correct proposed values to match the genuine visible source when the form allows it. Reviewers should compare the original evidence, runner-confirmed fields, event mechanics, and any explanation. An algorithmic signal should never be described publicly as a misconduct finding.</p>

<h2>GPS interruptions, treadmills, and device disagreements</h2>
<p>GPS signal loss, battery limits, tall buildings, tree cover, tunnels, auto-pause, phone placement, and device processing can create gaps or unexpected totals. Use <a href="/blog/what-to-do-when-gps-tracking-stops-during-a-run">the GPS interruption guide</a> before deciding whether the original partial or split record can be submitted. Split activities are not automatically eligible for a one-activity result.</p>
<p>Treadmill evidence has different constraints because an indoor activity may have no GPS map and a console, watch, sensor, and app can report different distances. Read <a href="/blog/how-to-record-a-treadmill-run-for-a-virtual-event">the treadmill recording guide</a>. The event must accept treadmill activity and should name its evidence source and discrepancy rule.</p>
<p>Do not average competing distances, choose the largest value, draw a missing route, or edit one source to match another. Preserve both originals and follow the event's stated source. If no rule exists, ask before the deadline.</p>

<h2>Standard results and accumulated activities</h2>
<p>A standard virtual result normally uses one qualifying activity for one registration. The ordinary correction flow is attached to the existing rejected result; a submitted or approved standard result is not freely replaceable. A rejection clears official result eligibility until a permitted corrected entry reaches approval.</p>
<p>An accumulated challenge stores each activity separately. Approved activity distance contributes to verified progress. Submitted distance remains potential, and rejected distance contributes nothing. One rejected activity does not necessarily reject every other activity in the challenge, but it can leave the runner below the target.</p>
<p>For example, a runner has approved activities of 8K and 7K, a pending 5K, and a rejected duplicate 5K. Official progress is 15K, not 25K. Read <a href="/blog/how-accumulated-distance-challenges-work">how accumulated-distance challenges work</a> before interpreting totals or certificate readiness.</p>

<h2>How to correct a rejected result</h2>
<ol>
  <li>Open the rejected entry from Submitted Entries or the registration card.</li>
  <li>Read the structured reason, organiser detail, review notes, event mechanics, and deadline.</li>
  <li>Use the displayed correction strategy. Distance or incomplete-metric issues may allow eligible metadata correction; unclear, wrong, identity, date, or duplicate proof issues normally call for replacement evidence.</li>
  <li>For a Strava source, select a corrected eligible imported activity rather than rewriting locked source fields.</li>
  <li>Compare every field with the unchanged original before resubmitting.</li>
  <li>Submit once, verify the new status, and keep the source until the decision is final.</li>
</ol>
<p>Resubmission normally returns the result to review unless it satisfies a current conditional approval path. It does not guarantee approval and it does not erase the need to meet the event rules.</p>

<h2>When a rejection cannot be fixed by a clearer upload</h2>
<p>A better screenshot can resolve blur, crop, or missing context. It cannot turn an excluded activity into an accepted one, increase a genuinely short distance, move a genuine run into the event window, undo a final deadline, or make another person's activity yours.</p>
<p>Do not fabricate a route, duration, name, or date. Do not submit altered copies to evade duplicate controls. If the event allows another attempt, complete a new eligible activity safely within the remaining window. If no compliant correction remains, ask whether the organiser has a published appeal or exception process, but do not assume one exists.</p>

<h2>Five practical rejection scenarios</h2>
<h3>A cropped 5K screenshot</h3>
<p>The image clearly shows 5.02K but hides the date and duration. The organiser rejects it as unclear proof. The runner uploads the unchanged full activity summary through Fix entry before the deadline.</p>
<h3>A real walk in a run-only event</h3>
<p>The activity synced correctly and belongs to the runner, but the event accepts Run and Trail Run only. The proof is genuine yet ineligible. The runner selects another eligible activity instead of renaming the walk.</p>
<h3>A nickname triggers review</h3>
<p>OCR reads an app nickname that differs from the registration name. The result is held for review, not automatically rejected. The runner preserves the original account view and privately explains the nickname if asked.</p>
<h3>A treadmill and watch disagree</h3>
<p>The permitted treadmill shows 5.00K while the indoor watch estimates 4.81K. The event names console distance as primary and requests both summaries. The runner submits both unchanged rather than choosing or editing the more favorable record.</p>
<h3>An accumulated activity is duplicated</h3>
<p>A runner accidentally uploads the same 6K screenshot twice. One activity is rejected as already submitted. The approved original remains 6K of progress; the rejected copy adds nothing.</p>

<h2>Runner checklist before submitting</h2>
<ul>
  <li>Use the correct HelloRun account, event registration, category, and participation mode.</li>
  <li>Read activity dates, timezone, final submission deadline, accepted types, minimum distance, and treadmill rules.</li>
  <li>Wait for the activity to finish saving and syncing.</li>
  <li>Choose one original completed activity rather than a live screen or summary dashboard.</li>
  <li>Check distance, unit, duration, date, activity type, and source are readable.</li>
  <li>Confirm typed or OCR-proposed values match the original.</li>
  <li>Inspect the entire image for unrelated private information.</li>
  <li>Use an accepted file or the correct connected Strava account.</li>
  <li>Check existing entries before retrying a duplicate or delayed request.</li>
  <li>Keep the original evidence until approval or final resolution.</li>
</ul>

<h2>Organizer note: reject consistently and explain the fix</h2>
<p>Organisers should publish activity types, dates and timezone, distance rules, proof fields, timing basis, treadmill treatment, review states, correction deadline, and support route before registration. Comparable evidence should receive comparable treatment.</p>
<p>Select the most specific rejection category and add concise detail when the label alone does not identify the fix. Separate an honest discrepancy from a proven policy violation. The RRCA's ethics emphasize fairness, good faith, respect, honesty, and integrity; those principles support documented, consistent decisions rather than unexplained outcomes.</p>
<p>Request only evidence needed for the decision. ICO data-minimisation guidance describes personal data as adequate, relevant, and limited to what is necessary. Reviewers do not need unrelated messages, contacts, or health details merely because a screenshot can expose them. Use <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">the virtual-run organiser guide</a> for the wider workflow.</p>

<h2>Frequently asked questions</h2>
<h3>Does a review flag mean my submission was rejected?</h3>
<p>No. A flag or review reason can explain why human attention is needed while the status remains submitted. The final stored status determines whether the result is pending, approved, or rejected.</p>
<h3>Does a mismatch mean the organiser thinks I cheated?</h3>
<p>Not by itself. OCR errors, device definitions, naming differences, and ordinary entry mistakes can create mismatches. The full record should be reviewed before any conclusion.</p>
<h3>Can every rejected result be resubmitted?</h3>
<p>The current standard-result workflow offers correction for rejected entries when the surrounding event and submission rules still permit it. A correction action does not guarantee eligibility after the deadline or override an event rule.</p>
<h3>Why is my result pending instead of rejected?</h3>
<p>It may need organiser or administrator review because conditional approval criteria were not met. Pending evidence has no approved result benefit while the review is unresolved.</p>
<h3>Can I edit an approved result?</h3>
<p>Not through ordinary rejected-result resubmission. Contact the organiser or support privately about a genuine approved-record error.</p>
<h3>Can I use the same activity for two events?</h3>
<p>Only when both events permit it and the offered workflow supports the selection. The screenshot flow can offer multiple eligible events for one genuine activity; a Strava submission currently targets one event or Personal Record at a time.</p>
<h3>Will a clearer screenshot always be approved?</h3>
<p>No. It can solve readability or missing-context problems, but the activity must still satisfy date, distance, type, identity, duplicate, and event-specific requirements.</p>
<h3>Does rejected proof affect the leaderboard?</h3>
<p>Rejected proof does not create an approved ranked result. Review <a href="/blog/how-leaderboards-work-virtual-running-events">the leaderboard guide</a> for event-specific publication and ranking behavior.</p>
<h3>Where should I look for the final rule?</h3>
<p>Start with the live event page, then use <a href="/how-it-works">How HelloRun Works</a>, the <a href="/faq">FAQ</a>, and the applicable <a href="/privacy">privacy terms</a>. Browse <a href="/events">current events</a> to compare published mechanics.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations">Strava Support: Moving Time, Speed, and Pace Calculations</a></li>
  <li><a href="https://www.rrca.org/programs/race-director-certification/race-director-code-of-ethics/">Road Runners Club of America: Race Director Code of Ethics</a></li>
  <li><a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/">Information Commissioner's Office: Data Minimisation</a></li>
  <li><a href="/how-it-works">How HelloRun Works</a></li>
  <li><a href="/faq">HelloRun FAQ</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
</ul>
<p>Interfaces, event mechanics, integrations, and correction availability can change. Recheck the live event page, result detail, and submission form before relying on a correction instruction.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Rejection guidance in one minute',
  'How this guide was prepared',
  'Four outcomes that are easy to confuse',
  'The eight HelloRun run-rejection reasons',
  'Why screenshot evidence may need correction',
  'Why a Strava submission may need review or rejection',
  'OCR and validation signals are not verdicts',
  'GPS interruptions, treadmills, and device disagreements',
  'Standard results and accumulated activities',
  'How to correct a rejected result',
  'When a rejection cannot be fixed by a clearer upload',
  'Five practical rejection scenarios',
  'Runner checklist before submitting',
  'Organizer note: reject consistently and explain the fix',
  'Frequently asked questions',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/how-it-works',
  '/faq',
  '/contact',
  '/privacy',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/what-to-do-when-gps-tracking-stops-during-a-run',
  '/blog/how-to-record-a-treadmill-run-for-a-virtual-event',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/how-leaderboards-work-virtual-running-events',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  'support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations',
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
  if (/<h[12]>Why a Virtual Run Submission May Be Rejected<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/(?:review flag|integrity flag|mismatch signal) (?:proves?|confirms?|means?) (?:fraud|cheating|misconduct)/i.test(text)) errors.push('article must not present review signals as misconduct findings');
  if (/(?:OCR|Strava) (?:guarantees?|always receives?) (?:approval|acceptance)/i.test(text)) errors.push('article must not guarantee OCR or Strava approval');
  if (/(?:every|all) (?:virtual )?events?.{0,40}(?:use|apply|accept|allow).{0,25}(?:the same|identical|screenshots?|treadmills?)/i.test(text)) errors.push('article must not claim universal event rules');
  if (/rejected distance (?:always )?(?:counts?|contributes?|qualifies?) (?:as|toward)? ?(?:official|approved|completion|progress)/i.test(text)) errors.push('article must not count rejected evidence officially');
  if (/(?:every|all) rejected (?:results?|entries|submissions?).{0,40}(?:can|may) (?:always )?(?:be )?(?:fixed|corrected|resubmitted).{0,30}(?:after|past) the deadline/i.test(text)) errors.push('article must not promise post-deadline correction');
  if (!/documents the HelloRun run-submission implementation available in July 2026/i.test(text)) errors.push('article must disclose implementation-based methodology');
  if (!/A review flag does not prove fraud or misconduct/i.test(text)) errors.push('article must distinguish review signals from verdicts');
  if (!/Pending distance is not approved completion/i.test(text)) errors.push('article must distinguish pending evidence');
  if (!/Rejected distance does not count toward official completion/i.test(text)) errors.push('article must distinguish rejected evidence');
  if (!/correction action does not extend the event or submission window/i.test(text)) errors.push('article must state correction deadline limits');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid submission-rejection payload: ${errors.join('; ')}`);
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
