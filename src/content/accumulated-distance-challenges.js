'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-accumulated-distance-challenges-work';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How Accumulated Distance Challenges Work',
  excerpt: 'Learn how accumulated-distance challenges add approved activities toward a selected goal, treat pending distance, rank participants, and finalize certificates.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'accumulated distance',
    'distance challenge',
    'virtual challenge',
    'activity tracking',
    'approved distance',
    'progress tracking',
    'challenge leaderboard',
    'running goals'
  ]),
  seoTitle: 'How Accumulated Distance Challenges Work | HelloRun',
  seoDescription: 'Learn how HelloRun accumulated-distance challenges calculate approved progress, pending distance, goals, leaderboards, deadlines, and final certificates.',
  coverImageAlt: 'Runner tracking several approved activities toward an accumulated 100 km challenge with progress, pending distance, and a final certificate'
});

const RAW_CONTENT_HTML = `
<p>An accumulated-distance challenge lets a runner reach one event goal through several eligible activities. Instead of completing 25 kilometres in one continuous run, a participant might submit 4K, 6K, 5K, and 10K activities during the challenge window. Each activity has its own evidence and status. Only approved distance becomes official progress.</p>
<p>This format can fit a month-long community goal, a club mileage challenge, or an event with several distance categories. It is not simply a fitness-app monthly total. The event still defines who can participate, which activities qualify, when they must happen, the minimum distance for each activity, how proof is submitted, and when reviews close.</p>
<blockquote><strong>The central rule:</strong> official progress equals the sum of approved activity distance for one registration. Pending distance is potential progress, rejected distance does not count, and reaching the target is different from final certificate issuance.</blockquote>

<h2>Accumulated challenge in one minute</h2>
<ol>
  <li>Choose an event and register for the intended distance or category.</li>
  <li>Confirm the selected goal, activity window, submission deadline, permitted activity types, and minimum activity distance.</li>
  <li>Complete one eligible activity and save its original app, watch, or treadmill record.</li>
  <li>Upload a supported screenshot or import a connected Strava activity.</li>
  <li>Review the date, distance, unit, duration, activity type, and selected registration.</li>
  <li>Wait for approval or an eligible automatic-approval result.</li>
  <li>Add only approved distance to the official total; keep pending distance separate.</li>
  <li>Repeat with distinct eligible activities until the target or deadline.</li>
  <li>Check any configured leaderboard using approved distance, not submitted distance.</li>
  <li>After the deadline and final reviews, wait for configured certificate finalisation.</li>
</ol>
<h3>Three distances a runner may see</h3>
<ul>
  <li><strong>Approved distance:</strong> verified activities that count officially toward the goal and leaderboard.</li>
  <li><strong>Pending distance:</strong> submitted activities awaiting a final status. It can be shown as potential progress but does not count officially.</li>
  <li><strong>Rejected distance:</strong> activities that did not satisfy the decision. They remain outside official progress.</li>
</ul>

<h2>How this guide was prepared</h2>
<p>This guide documents the HelloRun accumulated-distance implementation available in July 2026. It was checked against the target resolver, activity-submission and validation services, progress calculation, runner presentation, accumulated leaderboard aggregation, and certificate-finalisation worker. It is not independent GPS testing, a training plan, or a universal specification for other challenge platforms.</p>
<p>Strava Group Challenges are cited as an external example showing that cumulative goals and “most activity” rankings exist in other products; their subscription, privacy, eligibility, and calculation rules do not become HelloRun rules. World Athletics and RRCA materials provide virtual-event planning context, while ICO guidance informs data minimisation. The individual HelloRun event page remains the final authority for a participant.</p>

<h2>Single activity versus accumulated distance</h2>
<h3>Single-activity format</h3>
<p>The runner completes the category distance in one eligible activity. A 10K result generally needs one qualifying record that reaches the required distance. Several shorter activities cannot be assembled into that result unless the event is explicitly configured as accumulated distance.</p>
<h3>Accumulated-distance format</h3>
<p>The runner submits multiple separate activities for one registered goal. A 50K challenge might include ten 5K activities, five 10K activities, or another combination that follows the minimum-per-activity and permitted-sport rules. Each record can be approved, remain submitted, or be rejected independently.</p>
<p>Accumulation changes how distance is combined; it does not remove event boundaries. The runner still needs an eligible registration, paid or otherwise confirmed status as required by the workflow, qualifying activity dates, accepted activity types, and reviewable evidence.</p>

<h2>How HelloRun resolves the selected goal</h2>
<p>The target belongs to a registration rather than the runner's whole account. HelloRun first uses the distance on the specifically selected race category when that category is available in the registration snapshot. If no category distance resolves, it reads the selected registration distance, such as “25K” or “100 KM.” The event-level target is the fallback when a registration-specific goal is unavailable.</p>
<p>This means two people in one event can legitimately have different targets. Ana may register for 25K while Ben chooses 100K. Ana's approved 30K represents 120% of her goal; the same 30K represents 30% of Ben's. An organiser should not display a single target in promotional copy if registration categories establish different goals.</p>
<p>Activities are grouped by registration. Distance from a different event, another registration, or a Personal Record does not silently merge into this challenge. If one person has two eligible registrations, each keeps its own accumulated total.</p>

<h2>Rules to check before the first activity</h2>
<ul>
  <li><strong>Selected goal:</strong> Confirm the distance attached to the chosen category.</li>
  <li><strong>Activity window:</strong> Note the start and end, including the organiser's timezone.</li>
  <li><strong>Final submission deadline:</strong> This can be distinct from the last activity date.</li>
  <li><strong>Accepted activities:</strong> Run, walk, hike, and trail run can be configured separately.</li>
  <li><strong>Minimum activity distance:</strong> A challenge may reject a 0.8K record even when the overall target is 25K.</li>
  <li><strong>Evidence method:</strong> Check screenshot, connected activity, treadmill, and other published rules.</li>
  <li><strong>Units:</strong> Find the conversion and rounding rule when a device uses miles.</li>
  <li><strong>After-goal policy:</strong> Confirm whether eligible extra distance remains welcome before the deadline.</li>
  <li><strong>Recognition:</strong> Check whether the event configures a leaderboard, progress achievement, certificate, medal, or no reward.</li>
</ul>
<p>Browse current <a href="/events">Events</a>, read <a href="/how-it-works">How It Works</a>, and use the <a href="/faq">FAQ</a> when an event summary does not answer these questions.</p>

<h2>Submitting individual activities</h2>
<p>Each challenge activity should describe one completed session. On HelloRun, the current public flow supports a JPEG, PNG, or WebP activity screenshot and a connected Strava import. Screenshot analysis can propose fields for the runner to confirm. A supported Strava activity supplies recorded date, distance, duration, and activity type from the connected account.</p>
<p>A weekly, monthly, or lifetime dashboard total is normally poor evidence for this workflow. It does not show which component activities occurred inside the window, whether each met the minimum, whether an activity was duplicated, or which sport type produced the distance. Submit the distinct activity requested by the form.</p>
<p>The same screenshot hash can be blocked when reused by the same runner, and the same Strava activity ID cannot repeatedly count for one event. These controls reduce accidental or simple duplicate credit; they do not certify the underlying device. See <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a> and <a href="/blog/how-to-submit-run-proof-correctly-hellorun">How to Submit Run Proof Correctly on HelloRun</a> for evidence examples.</p>

<h2>How activity status changes progress</h2>
<h3>Submitted or pending</h3>
<p>The activity exists but is not part of the official total. HelloRun can show its distance in a separate pending or potential figure so the runner understands what is under review. It receives no official leaderboard rank contribution and cannot by itself complete the challenge.</p>
<h3>Approved</h3>
<p>The full approved activity distance is added to the registration's verified total. Approval can also refresh configured progress or milestone recognition. If the new total reaches or exceeds the goal, the registration is considered complete for progress purposes.</p>
<h3>Rejected</h3>
<p>The activity remains visible in history but contributes no official distance. The rejection reason may identify an excluded activity, insufficient distance, date problem, unclear evidence, or another rule. In the accumulated workflow, a runner can generally submit another distinct eligible activity before the boundary rather than treating the rejected distance as provisional credit.</p>
<h3>Corrected or later reviewed</h3>
<p>An authorised correction or a later approval can change the total and other runners' standings. During the review window, displayed rankings and completion states should therefore be treated as subject to outstanding decisions.</p>

<h2>The exact progress calculation</h2>
<p>HelloRun separates activity lists by status, then calculates:</p>
<ul>
  <li><strong>Official distance</strong> = sum of approved activity distance.</li>
  <li><strong>Pending distance</strong> = sum of submitted activity distance.</li>
  <li><strong>Potential distance</strong> = approved distance plus pending distance.</li>
  <li><strong>Rejected distance</strong> = sum of rejected activity distance, displayed separately and excluded.</li>
  <li><strong>Progress percentage</strong> = approved distance divided by the target, multiplied by 100.</li>
  <li><strong>Remaining distance</strong> = target minus approved distance, with a minimum of zero.</li>
  <li><strong>Extra verified distance</strong> = approved distance above the target.</li>
</ul>
<p>The underlying progress percentage can exceed 100%. A visual progress bar stops at its full width, while the data can still report extra verified kilometres. The approved total is not cut back to the goal. This matters when an event encourages ongoing activity or ranks by total distance.</p>

<h2>Five practical progress examples</h2>
<h3>Example 1: straightforward 25K completion</h3>
<p>Lea has approved activities of 4K, 6K, 5K, and 10K. Official distance is 25K, pending distance is zero, remaining distance is zero, and progress is 100%. The goal is reached, but any configured certificate still follows the deadline and final-review process.</p>
<h3>Example 2: approved and pending distance</h3>
<p>Noah has 18K approved and a pending 8K activity toward 25K. Official progress is 18K or 72%. Potential distance is 26K, but Noah has not officially completed the goal. If the 8K is approved, the official total becomes 26K; if rejected, it stays 18K.</p>
<h3>Example 3: two category goals</h3>
<p>Mei selected 50K and Luis selected 100K in the same event. Each has 40K approved. Mei is at 80%; Luis is at 40%. Their proof can be reviewed under the same event, but completion is assessed against each registration's selected goal.</p>
<h3>Example 4: rejected minimum-distance activity</h3>
<p>A challenge requires at least 2K per activity. Sam submits 1.5K. That activity does not become official progress merely because several other runs will eventually exceed the overall target. Sam must follow the rejection guidance and complete another eligible activity if time remains.</p>
<h3>Example 5: continuing beyond the goal</h3>
<p>Iris reaches a 100K goal with five days left and the event permits continued submissions. Two more approved 8K activities produce a final verified total of 116K. Remaining distance remains zero, progress is 116%, and extra verified distance is 16K. A configured final certificate can record 116K after closeout rather than freezing at the first 100K.</p>

<h2>Conditional automatic approval and human review</h2>
<p>HelloRun can automatically approve an eligible clean OCR or validated Strava activity when the required validation checks pass and no relevant integrity signal is present. This is conditional. It does not mean every screenshot or connected activity is automatically accepted.</p>
<p>Missing fields, low-quality extraction, mismatches, a below-minimum distance, an implausible single-activity total, or another integrity signal can keep an activity submitted for organiser or admin review. A reviewer can approve a submitted or previously rejected accumulated activity; a submitted activity can also be rejected with a runner-facing reason.</p>
<p>OCR assists extraction and comparison but does not independently prove distance accuracy. The runner should confirm every proposed field against the original evidence. The <a href="/blog/best-apps-to-track-your-virtual-run">tracking-app comparison</a> explains documented app features without claiming a universal accuracy ranking.</p>

<h2>What happens after the goal is reached</h2>
<p>Goal completion is based on approved distance. The runner interface can show “Goal Reached” and configured progress recognition before the challenge closes. When submissions remain open, the runner may continue adding eligible activities if the event rules permit it. Pending distance stays separate even after the approved total exceeds the target.</p>
<p>This open period is why the final certificate should not be issued at the instant the target is crossed. More valid distance may arrive, earlier submissions may still be reviewed, or a correction may change the official total. The goal milestone and the final event snapshot serve different purposes.</p>
<p>No runner should assume that reaching the target guarantees a badge, certificate, medal, leaderboard position, or prize. Each feature must be configured and described by the event.</p>

<h2>How accumulated leaderboards work</h2>
<p>When enabled, an accumulated HelloRun leaderboard groups approved activities by registration and sums their distance. Participants are ordered by highest verified total, not fastest pace or shortest elapsed time. Filters can separate event distance/category and participation mode.</p>
<p>Pending and rejected activities do not enter the official ranking. Two rows with the same displayed total receive sequential ranks rather than a shared rank. The current deterministic order uses verification timing and submission timing as fallback ordering; organisers should publish any prize tie policy rather than presenting that technical fallback as an ideal sporting tie-break.</p>
<p>Positions can change when an activity is approved, rejected, corrected, or added before the deadline. Recently changed results may also take a short cache interval to appear. Read <a href="/blog/how-leaderboards-work-virtual-running-events">How Leaderboards Work in Virtual Running Events</a> for filters, privacy, and troubleshooting.</p>

<h2>Why the final certificate waits</h2>
<p>A configured accumulated certificate is finalized only after the applicable submission boundary has passed. HelloRun uses the event's final submission deadline when set, otherwise the virtual-window end, then the event end as fallback. Reaching 100% before that boundary is not the finalisation trigger.</p>
<p>The certificate worker also checks the event-wide accumulated review queue. If even one activity for that event still has submitted status, eligible certificates wait in a final-reviews state. This protects the final snapshot from being generated while official totals can still change, but it means one unresolved activity can delay certificate finalisation for other completed registrations.</p>
<p>After the boundary and after the submitted queue reaches zero, confirmed and eligible completed registrations can be processed. Generation can still be delayed or fail operationally, so the interface distinguishes final reviews, certificate finalising, ready, and failure states instead of promising instant delivery.</p>

<h2>What a finalized certificate records</h2>
<p>The current accumulated certificate snapshot stores the registration's selected goal, final approved distance, approved activity count, and finalisation time. It is attached to the approved activity that crossed the goal threshold while representing the registration's complete final snapshot.</p>
<p>If the goal is 100K and the final approved distance is 116K across seven activities, the certificate can record the 100K goal and 116K verified total. It does not need to pretend the extra 16K never happened. If the same final snapshot is already generated, finalisation is idempotent rather than producing unnecessary duplicates.</p>
<p>A HelloRun certificate is event-specific recognition. It is not certified course measurement, an official governing-body ranking, or a qualifying performance unless an accepting organisation expressly says otherwise.</p>

<h2>Corrections, rejected activities, and app failures</h2>
<p>If an activity is rejected, read the reason and compare it with the published mechanics. A clearer screenshot can solve a readability problem, but it cannot make an excluded sport or out-of-window activity eligible. Submit a new distinct eligible activity before the deadline when the workflow permits it.</p>
<p>If an app stops early, keep the original partial record. Do not combine unrelated screenshots into a false single activity. The event may allow another activity, a supported explanation, or no correction. Ask through <a href="/contact">Contact</a> before the deadline rather than assuming a private message changes the mechanics.</p>
<p>Authorised corrections and late review decisions can change approved totals. Organisers should keep reasons and apply comparable decisions consistently, especially when leaderboards, recognition, or prizes are involved.</p>

<h2>Devices, units, treadmills, and discrepancies</h2>
<p>Phone GPS, watches, treadmill consoles, and companion apps can report different distances because they use different sensors, calibration, smoothing, pause logic, and conversions. An accumulated challenge does not make these measurements inherently comparable.</p>
<p>Keep the visible unit. Five miles is approximately 8.05 kilometres, not five kilometres. Use the event's conversion and rounding rule rather than changing a screenshot. If no rule exists, ask before submitting.</p>
<p>Treadmill activity is accepted only when the event says so. A console photo may show distance and duration but omit date or runner context; a matching app record may be required. A hidden GPS map can be acceptable when route proof is not required. Preserve original values and explain legitimate differences rather than editing sources to agree.</p>

<h2>Privacy and safe participation</h2>
<p>Each submitted activity can expose a route, home area, schedule, profile name, photo, device, health-related fields, or social information. Submit only the fields needed for the event, check app privacy controls, and review the <a href="/privacy">HelloRun Privacy Policy</a>. Public leaderboard rows do not display the underlying proof or private OCR and review fields.</p>
<p>The ICO's data-minimisation principle recommends collecting information that is adequate, relevant, and limited to the stated purpose. Organisers should not require seven screenshots when one suitable activity record answers the eligibility question.</p>
<p>A multi-day goal is not a reason to run in unsafe traffic, severe weather, poor air quality, illness, or unsuitable conditions. Use the flexibility of the challenge to postpone, choose an allowed indoor option, or adjust the schedule. Review the <a href="/blog/running-safety-tips-early-morning-night-runs">running safety guide</a>. This article does not provide individual medical or training advice.</p>

<h2>Runner planning checklist</h2>
<ul>
  <li>Confirm the selected registration goal and event timezone.</li>
  <li>Record the activity window and separate final submission deadline.</li>
  <li>Check accepted activities, treadmills, minimum distance, proof, units, and after-goal policy.</li>
  <li>Estimate a sustainable schedule with spare days for weather, rest, or technical problems.</li>
  <li>Test the app, watch, or screenshot method before the first qualifying activity.</li>
  <li>Review map privacy and choose suitable routes or indoor alternatives.</li>
  <li>Understand whether the event offers completion recognition, a leaderboard, a certificate, or physical rewards.</li>
</ul>

<h2>Activity submission checklist</h2>
<ul>
  <li>Choose the correct accumulated registration rather than another event or Personal Record.</li>
  <li>Use one distinct activity completed inside the window.</li>
  <li>Confirm it meets the minimum distance and accepted activity type.</li>
  <li>Show date, distance, unit, duration, source, and any other required fields.</li>
  <li>Review OCR-filled or imported values against the original record.</li>
  <li>Do not reuse an already submitted screenshot or Strava activity.</li>
  <li>Keep the original record and note whether the result is submitted, approved, or rejected.</li>
  <li>Track approved and pending distance separately when planning the next activity.</li>
</ul>

<h2>Challenge closeout checklist</h2>
<ul>
  <li>Before the deadline, confirm every intended activity was submitted to the right registration.</li>
  <li>Do not treat potential distance as enough; check that approved distance reaches the goal.</li>
  <li>Read and respond to rejection reasons while submissions remain open.</li>
  <li>Save original activity records until results are final.</li>
  <li>After the deadline, expect a final-review period when the event has pending activities.</li>
  <li>Check the final approved total, activity count, leaderboard, and configured recognition.</li>
  <li>Contact support with the event and confirmation code if a final state remains unresolved.</li>
</ul>

<h2>Organizer mechanics checklist</h2>
<ul>
  <li>Define whether goals come from categories, registration distances, or one event fallback.</li>
  <li>Publish accepted activities, minimum-per-activity distance, evidence, units, treadmills, and duplicates.</li>
  <li>Separate activity dates, final submission deadline, review period, results, and fulfilment dates with a timezone.</li>
  <li>Explain approved, pending, potential, rejected, over-goal, and remaining distance.</li>
  <li>State whether participants can continue after reaching the goal.</li>
  <li>Define leaderboard basis and prize ties without using speed rules for an accumulated-distance ranking.</li>
  <li>Staff reviews so one event-wide pending queue does not create an avoidable certificate delay.</li>
  <li>Describe badges, certificates, medals, and rewards as separate configured outcomes.</li>
  <li>Use minimum necessary evidence and provide consistent correction and dispute channels.</li>
</ul>
<p>Use <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">How to Organize a Virtual Run</a> for the full operational playbook. For format selection, compare <a href="/blog/virtual-run-vs-traditional-race-which-one-should-you-join">virtual and onsite events</a> and read <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">What Is a Virtual Run?</a>.</p>

<h2>Frequently asked questions</h2>
<h3>Does pending distance count toward my goal?</h3>
<p>No. It can appear as potential progress, but only approved distance counts toward official completion, standings, and the final verified total.</p>
<h3>Can one long activity complete the challenge?</h3>
<p>It can when that activity meets the event rules and is approved. “Accumulated” permits multiple activities; it does not necessarily require a minimum number unless the organiser says so.</p>
<h3>Can I submit after reaching 100%?</h3>
<p>HelloRun can continue accepting eligible activities until the submission boundary, and progress can exceed 100%. The event's mechanics decide whether additional activity is intended.</p>
<h3>Why is my progress bar full but my total above the target?</h3>
<p>The bar is visually capped at full width, while verified distance and percentage can continue above the goal. Extra approved distance remains part of the total.</p>
<h3>Are walking and treadmill activities accepted?</h3>
<p>Only when the event permits them. Check accepted run types, indoor evidence, and source-of-truth rules before the activity.</p>
<h3>Can one activity count for two registrations?</h3>
<p>Only through a platform flow and event rules that allow the activity to target both. Totals remain grouped separately by registration; they do not merge account-wide.</p>
<h3>Why did my leaderboard rank change?</h3>
<p>Another approved activity, rejection, correction, or later submission may have changed verified totals. Pending distance never enters the official ordering.</p>
<h3>Do equal totals share a rank?</h3>
<p>No. Current HelloRun standings use sequential ranks with deterministic verification and submission ordering for equal totals.</p>
<h3>Do I receive a certificate as soon as I reach the goal?</h3>
<p>No. A configured accumulated certificate waits until after the submission boundary and until every submitted accumulated activity in the event has been reviewed.</p>
<h3>What is recorded on the final certificate?</h3>
<p>The snapshot can include the selected goal, final approved distance, approved activity count, and finalisation time. Availability still depends on event configuration and successful generation.</p>
<h3>Does this total qualify for an official race?</h3>
<p>Not automatically. It is an event-specific cumulative participation result, not one certified-course performance or a qualifying time.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://support.strava.com/en-us/articles/15401736-group-challenges">Strava Support: Group Challenges</a> — an external example of cumulative and “most activity” challenge formats, not a HelloRun rulebook.</li>
  <li><a href="https://www.rrca.org/covid-19-information-and-resources/">Road Runners Club of America: Virtual Event Definition and Context</a></li>
  <li><a href="https://worldathletics.org/news/news/how-run-best-virtual-race-advice">World Athletics: Virtual Race Preparation</a></li>
  <li><a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/">Information Commissioner's Office: Data Minimisation</a></li>
  <li><a href="/how-it-works">How HelloRun Works</a></li>
  <li><a href="/faq">HelloRun FAQ</a></li>
</ul>
<p>Challenge rules, integrations, review behavior, and configured recognition can change. Recheck the live event page before registering and before each qualifying activity.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Accumulated challenge in one minute',
  'How this guide was prepared',
  'Single activity versus accumulated distance',
  'How HelloRun resolves the selected goal',
  'Rules to check before the first activity',
  'Submitting individual activities',
  'How activity status changes progress',
  'The exact progress calculation',
  'Five practical progress examples',
  'Conditional automatic approval and human review',
  'What happens after the goal is reached',
  'How accumulated leaderboards work',
  'Why the final certificate waits',
  'What a finalized certificate records',
  'Corrections, rejected activities, and app failures',
  'Devices, units, treadmills, and discrepancies',
  'Privacy and safe participation',
  'Runner planning checklist',
  'Activity submission checklist',
  'Challenge closeout checklist',
  'Organizer mechanics checklist',
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
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/how-leaderboards-work-virtual-running-events',
  '/blog/running-safety-tips-early-morning-night-runs',
  '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  'support.strava.com/en-us/articles/15401736-group-challenges',
  'rrca.org/covid-19-information-and-resources',
  'worldathletics.org/news/news/how-run-best-virtual-race-advice',
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
  if (/<h[12]>How Accumulated Distance Challenges Work<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/<em>[^<]+<\/em>\s*\*/i.test(payload.contentHtml)) errors.push('body contains malformed emphasized text');
  if (/pending (?:activity|activities|distance).{0,40}(?:counts?|contributes?) (?:officially|toward official)/i.test(text)) errors.push('article must not count pending distance officially');
  if (/(?:approved|verified) (?:distance|total).{0,35}(?:is|gets) capped at (?:the goal|100%)/i.test(text)) errors.push('article must not cap verified distance at the goal');
  if (/accumulated leaderboard.{0,60}(?:fastest|shortest time|speed first)/i.test(text)) errors.push('article must not rank accumulated challenges by speed');
  if (/(?:certificate|badge).{0,40}(?:immediately|automatically) (?:appears?|issues?|is issued) (?:at|when) 100%/i.test(text)) errors.push('article must not promise immediate recognition');
  if (/(?:every|all) accumulated (?:events?|challenges?).{0,40}(?:include|provide|guarantee) (?:a )?(?:badge|certificate|leaderboard)/i.test(text)) errors.push('article must not promise universal recognition');
  if (/equal (?:totals|distances).{0,35}(?:share|receive the same) rank/i.test(text)) errors.push('article must not claim shared ties');
  if (/(?:account.wide|across all registrations).{0,35}(?:total|distance).{0,25}(?:combines|merges|counts)/i.test(text)) errors.push('article must not claim cross-registration aggregation');
  if (/(?:every|all) (?:activities|submissions).{0,30}(?:are|will be) automatically approved/i.test(text)) errors.push('article must not claim universal automatic approval');
  if (!/documents the HelloRun accumulated-distance implementation available in July 2026/i.test(text)) errors.push('article must disclose its implementation-based methodology');
  if (!/Official distance = sum of approved activity distance/i.test(text)) errors.push('article must define official progress');
  if (!/If even one activity for that event still has submitted status, eligible certificates wait/i.test(text)) errors.push('article must explain event-wide final-review blocking');
  if (!/selected goal, final approved distance, approved activity count, and finalisation time/i.test(text)) errors.push('article must describe the final certificate snapshot');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid accumulated-distance payload: ${errors.join('; ')}`);
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
