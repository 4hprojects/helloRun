'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-leaderboards-work-virtual-running-events';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How Leaderboards Work in Virtual Running Events',
  excerpt: 'Understand how HelloRun leaderboards rank approved race results and accumulated distance, handle pending reviews, show runner standings, and protect public data.',
  category: 'Race Tips',
  tags: Object.freeze([
    'virtual leaderboard',
    'race ranking',
    'verified results',
    'accumulated distance',
    'proof review',
    'runner standings',
    'leaderboard privacy',
    'virtual running'
  ]),
  seoTitle: 'How Virtual Running Leaderboards Work | HelloRun',
  seoDescription: 'Learn how HelloRun ranks approved virtual run results by verified time or accumulated distance, handles pending reviews, filters standings, and displays runner data.',
  coverImageAlt: 'Runner viewing a virtual race leaderboard with verified results and pending entries while participants run on a waterfront route'
});

const RAW_CONTENT_HTML = `
<p>A virtual running leaderboard turns reviewed event records into an ordered view of participants. The important word is <strong>reviewed</strong>. On HelloRun, an uploaded screenshot, imported activity, or typed result does not receive an official rank merely because it was submitted. The result must meet the event rules and reach the approved state used by that leaderboard.</p>
<p>HelloRun currently supports two main ranking models: race-result leaderboards ordered by fastest verified time, and accumulated-challenge leaderboards ordered by highest verified total distance. Both are event-specific. They do not replace certified race timing or the ranking systems of a sport governing body.</p>

<h2>Quick status guide</h2>
<ul>
  <li><strong>Verified:</strong> The organiser or admin approved the submission. It can count toward the official event ranking and, for accumulated challenges, verified progress.</li>
  <li><strong>Pending review:</strong> The evidence has been submitted but not approved. It may be displayed separately when the event allows public pending entries, but it has no official rank.</li>
  <li><strong>Rejected:</strong> The submission did not qualify under the review decision. It does not appear in official standings.</li>
  <li><strong>Flagged:</strong> An integrity signal may cause the entry to be hidden when the event is configured to hide suspicious submissions. A responsible reviewer still needs to decide the underlying evidence.</li>
  <li><strong>Unranked:</strong> A record can exist without receiving an ordinal position—for example, a pending submission, a personal-record-only entry, a different distance, or an event whose leaderboard is unavailable.</li>
</ul>
<blockquote><strong>Official ranking rule:</strong> pending distance and pending times never improve a HelloRun official rank. Approval comes first.</blockquote>

<h2>How this guide was prepared</h2>
<p>This article documents the HelloRun leaderboard implementation available in July 2026. It was checked against the event leaderboard service, public presentation, data-safety tests, and organiser settings. It is not an independent timing audit, a promise that every event enables a leaderboard, or a universal rule for other platforms.</p>
<p>Broader guidance from World Athletics, the Road Runners Club of America, the Information Commissioner's Office, and W3C provides context for certified performances, honest event communication, data minimisation, and accessible tables. HelloRun event mechanics remain the authority for an individual event.</p>

<h2>Where runners find HelloRun leaderboards</h2>
<p>The global <a href="/leaderboard">Leaderboards page</a> helps runners discover events with available standings. It can be searched by event or organiser and filtered by leaderboard type, distance, and participation mode. Discovery results can be sorted using the available recommended, recent, most-results, or event-date choices.</p>
<p>An individual event may have a standings page at its event-specific leaderboard URL. Start from the <a href="/events">Events page</a> or the event page itself instead of guessing the URL, because not every published event necessarily has an enabled leaderboard.</p>
<p>Within an event, distance tabs separate configured categories such as 5K, 10K, or 21K. A logged-in runner who has not chosen a tab may be taken to the distance associated with an eligible confirmed or paid registration. Search can match a runner or registration code, and a hybrid event may provide a virtual-versus-onsite mode filter.</p>

<h2>Which submissions are eligible for official standings</h2>
<p>For a standard race-result leaderboard, HelloRun loads event submissions with an approved status and excludes entries marked as personal-record-only. When suspicious submissions are configured to be hidden, flagged entries are excluded from the public ranking unless review clears the relevant status.</p>
<p>For an accumulated challenge, HelloRun uses approved accumulated-activity submissions and groups them by registration. This matters because one runner may have more than one event registration or category; the leaderboard total belongs to the applicable registration rather than becoming an unrestricted account-wide total.</p>
<p>Pending submissions can be loaded into a separate public section only when the organiser enables pending display. They remain labelled “Pending Review,” receive no rank, and do not enter official progress. Rejected submissions are not part of the public standings dataset.</p>
<p>Proof files, OCR output, email addresses, internal searchable text, suspicious flags, and private review notes are not returned as public leaderboard fields. The public row is a formatted result summary, not the review record itself.</p>

<h2>Race-result leaderboards: fastest verified time</h2>
<p>A race-result leaderboard ranks approved submissions inside each distance group. A 5K participant is compared with the 5K group, while a 10K participant is ranked separately in the 10K group. The configured distance order determines the navigation order, and an uncategorised group is used only when a result cannot be matched to a configured distance.</p>
<p>The primary ordering value is the approved submission's elapsed time, shortest first. Public entries can show rank, formatted runner name, category, participation mode, distance, elapsed time, calculated pace, status, and verification timing depending on the configured visible columns.</p>
<h3>Race-result example</h3>
<ol>
  <li>Ari has an approved 5K time of 00:27:40.</li>
  <li>Bea has an approved 5K time of 00:29:10.</li>
  <li>Cal has submitted 00:26:50, but the proof is pending.</li>
</ol>
<p>Ari is ranked ahead of Bea. Cal's faster submitted value does not enter the official ordering until approval. If Cal is approved later, the 5K standings are rebuilt and the official positions can change.</p>
<p>The displayed pace is calculated from the approved distance and elapsed time. It is a presentation value, not an independent verification that the route, GPS record, or timing source was accurate.</p>

<h2>Accumulated-challenge leaderboards: highest verified distance</h2>
<p>An accumulated leaderboard adds the distances of approved activities belonging to the same event registration. Participants are ordered by the highest verified total distance. The row can also show approved activity count, target distance, percentage completed, remaining distance, and whether the configured goal has been reached.</p>
<h3>Accumulated example</h3>
<ul>
  <li>Dana has approved activities of 6K, 5K, and 4K: 15K verified.</li>
  <li>Eli has approved activities of 7K and 6K: 13K verified.</li>
  <li>Eli also has a pending 5K activity.</li>
</ul>
<p>Dana ranks ahead with 15K. Eli's pending 5K can be shown as pending progress to the logged-in runner, but the official total stays at 13K. If the 5K is approved, Eli's verified total becomes 18K and the ranking can change.</p>
<p>Only approved activity distance contributes. Rejected, duplicate, or still-pending activities do not count toward the total shown as official challenge progress. Read <a href="/blog/how-accumulated-distance-challenges-work">How Accumulated Distance Challenges Work</a> for the broader completion workflow.</p>

<h2>How ties are ordered today</h2>
<p>HelloRun currently assigns sequential ordinal ranks rather than shared tie positions. Two entries with the same displayed time or distance do not both receive the same rank.</p>
<p>For race results, elapsed time is compared first. If elapsed values match, the current deterministic ordering uses earlier review time, then earlier submission time, then record creation order. For accumulated totals, verified distance is compared first; equal totals are ordered using the current verification and submission timestamps.</p>
<p>This fallback makes the database order stable, but it should not be presented as an ideal sporting tie-break. Organisers should explain any competition or prize tie policy before registration. HelloRun does not currently expose a separate organiser-configurable shared-rank or custom tie-break rule through this leaderboard calculation.</p>

<h2>Verified, pending, flagged, and corrected results</h2>
<h3>Verified results</h3>
<p>Approved entries receive a rank within their event, distance, and applicable filters. Approval means the reviewer accepted the result under the event mechanics; it is not a guarantee that the performance satisfies an external certification or qualifying standard.</p>
<h3>Pending results</h3>
<p>Pending entries remain outside the official ordering. When public pending display is enabled, they appear in a separate labelled section without rank. This lets participants see that review is outstanding without implying an official position.</p>
<h3>Flagged results</h3>
<p>A suspicious-data flag can help reviewers notice an inconsistency. When flagged entries are hidden, the record stays out of public results while the issue is unresolved. A reviewer may later approve valid evidence and clear the relevant suspicious metadata, after which the result can become eligible.</p>
<h3>Corrections and rejections</h3>
<p>A corrected result can change time, distance, category, or eligibility after review. A rejected result is excluded. These decisions can move other participants even when their own evidence has not changed. Organisers should provide understandable reasons and apply the published rule consistently.</p>

<h2>Why leaderboard positions change</h2>
<ul>
  <li>A faster race result receives approval.</li>
  <li>A pending accumulated activity becomes approved and increases a total.</li>
  <li>A submission is corrected into another distance or participation mode.</li>
  <li>A duplicate or invalid entry is rejected or removed from eligibility.</li>
  <li>A flagged result is cleared after review or hidden while unresolved.</li>
  <li>A filter changes which already-ranked entries are displayed.</li>
  <li>The event's configured categories or leaderboard settings change.</li>
</ul>
<p>A position shown during the review window is therefore provisional in practical terms, even when every visible row is verified. Organisers should publish when reviews close and when results become final, especially when prizes or recognition depend on placement.</p>

<h2>Cache delay: approval may not appear immediately</h2>
<p>HelloRun caches an event's base leaderboard groups for up to approximately 60 seconds to reduce repeated database work. Relevant review workflows may invalidate that cache, but runners should still allow a short refresh interval after an approval or correction.</p>
<p>If a dashboard says approved but the leaderboard has not changed, wait about a minute, reload the correct event and distance, and clear any search, mode, or status filters. A delayed page refresh is not evidence that approval failed.</p>
<p>The leaderboard is not live race timing. It is a periodically refreshed presentation of reviewed event records.</p>

<h2>Distance tabs, filters, search, and pagination</h2>
<h3>Distance tabs</h3>
<p>Each configured race distance can have its own group, including a tab with zero results. Ranks start again within each group. Rank 1 in 5K and rank 1 in 10K refer to different fields.</p>
<h3>Participation mode</h3>
<p>Events that include more than one relevant mode may offer a virtual or onsite filter. Filtering changes which rows are displayed but preserves each entry's official rank from its base distance group rather than inventing a new rank for a search result.</p>
<h3>Status filter</h3>
<p>When pending display is enabled, runners can view verified or pending sections. Pending entries still have no rank. Rejected records are not a public filterable standings group.</p>
<h3>Runner or bib search</h3>
<p>Search helps locate a runner using available identity and registration information while the returned row follows the configured public name format. Searching does not reveal proof, email, or review notes.</p>
<h3>Pagination</h3>
<p>Large distance groups are divided into pages. Moving to another page does not restart official rank numbering. Clearing filters is a useful first troubleshooting step when an expected row is missing.</p>

<h2>My standing and nearby runners</h2>
<p>A logged-in participant can use “My standing” to see the result associated with the current event and distance. A verified result shows official rank and nearby runners from that same ranked group. It does not compare the runner across unrelated events or distances.</p>
<p>A pending race result shows an under-review state without a rank. For an accumulated challenge, pending activities can be summarized as potential progress, but the verified progress bar, remaining distance, and official rank continue to use approved activities only.</p>
<p>If the runner registered for 10K but opens the 5K tab, “My standing” may correctly show no result for that selected distance. The personal view is scoped to the same categories as the public ranking.</p>

<h2>Runner names and public data</h2>
<p>HelloRun supports several name-display formats for leaderboard rows: full name, first name with last initial, profile display name, or an anonymous runner identifier. The default resolution is first name plus last initial when an event has not selected another supported mode.</p>
<p>Organisers can also choose from supported public columns such as rank, runner, category, distance, time, pace, and status. A smaller public dataset can reduce unnecessary disclosure while still making the ranking understandable.</p>
<p>Proof images, imported activity payloads, OCR fields, email addresses, internal flags, and review notes belong to the review workflow rather than the public table. Review the HelloRun <a href="/privacy">Privacy Policy</a> and ask the organiser what participant information it intends to publish.</p>
<p>ICO data-minimisation guidance supports collecting and displaying data that is adequate and relevant for a defined purpose without adding information that is not necessary. W3C guidance explains that data tables should use structural headers and relationships so assistive technologies can preserve context.</p>

<h2>What a HelloRun leaderboard does not prove</h2>
<ul>
  <li>It is not proof that a virtual route was measured as a certified road course.</li>
  <li>It is not live chip timing or an independently timed race result.</li>
  <li>It is not a World Athletics ranking, record, or automatic qualifying performance.</li>
  <li>It does not make different routes, elevation, weather, surfaces, GPS devices, pause settings, or treadmill records directly comparable.</li>
  <li>It does not guarantee that an approved entry will be accepted by another race, federation, employer, school, or rewards programme.</li>
  <li>It does not expose the private evidence needed to reproduce the organiser's review.</li>
</ul>
<p>World Athletics explains that performances used for specified rankings, standards, and records must meet applicable competition and certified-course conditions. A reviewed virtual-event standing has a different purpose.</p>

<h2>How proof review affects leaderboard trust</h2>
<p>A leaderboard can be only as consistent as the event mechanics and review process behind it. Reviewers should check the same core fields for comparable submissions: registration, event window, distance, duration, activity type, evidence source, duplication, and any event-specific rule.</p>
<p>OCR-assisted extraction, pace flags, and duplicate signals can draw attention to evidence, but they do not automatically verify or reject it. The reviewer should consider the original record and give a useful reason when correction or rejection is necessary.</p>
<p>Runners can reduce delays by reading <a href="/blog/what-counts-as-valid-run-proof">What Counts as Valid Run Proof?</a>, using the <a href="/blog/best-apps-to-track-your-virtual-run">running-app comparison</a>, and following <a href="/blog/how-to-submit-run-proof-correctly-hellorun">How to Submit Run Proof Correctly on HelloRun</a>.</p>

<h2>Runner troubleshooting checklist</h2>
<ul>
  <li>Confirm that the event actually enables a leaderboard.</li>
  <li>Open the correct event rather than the global discovery page alone.</li>
  <li>Select the correct distance and participation mode.</li>
  <li>Clear runner, mode, and status filters.</li>
  <li>Check whether the submission is approved, pending, rejected, or personal-record-only.</li>
  <li>For accumulated events, distinguish approved total from pending distance.</li>
  <li>Allow approximately 60 seconds after a recent review and refresh.</li>
  <li>Check the runner dashboard for a correction or rejection reason.</li>
  <li>Use the <a href="/faq">FAQ</a> or <a href="/contact">Contact</a> with the event, category, and submission details if the discrepancy remains.</li>
</ul>

<h2>Organizer leaderboard checklist</h2>
<ul>
  <li>Decide whether competition serves the event purpose before enabling rankings.</li>
  <li>Choose race-result or accumulated ranking to match the completion mechanics.</li>
  <li>Publish categories, activity rules, distance source, elapsed-time treatment, and treadmill policy.</li>
  <li>Explain that approval is required and whether pending entries may be shown separately.</li>
  <li>Choose a proportionate runner-name mode and only necessary public columns.</li>
  <li>Document the tie and prize policy; do not imply that equal displayed results share a rank.</li>
  <li>Use one proof-review rubric and record understandable correction or rejection reasons.</li>
  <li>Explain when standings are provisional and when the review window closes.</li>
  <li>Test different distances, modes, search, pagination, personal standing, pending states, and empty groups.</li>
  <li>Provide an escalation route for ambiguous rules, system issues, conflicts, and disputes.</li>
</ul>
<p>RRCA's Race Director Code of Ethics emphasizes honest communication and avoiding false or misleading statements. The <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">virtual-run organiser playbook</a> provides the broader mechanics, staffing, privacy, failure-plan, and closeout workflow.</p>

<h2>Frequently asked questions</h2>
<h3>Does a pending result receive a rank?</h3>
<p>No. It may appear in a separately labelled pending section when the event permits, but it is not part of official ranking or accumulated progress.</p>
<h3>Why did my rank change after I was approved?</h3>
<p>Other results may have been approved, corrected, rejected, or moved between categories. Accumulated participants may also add newly approved distance.</p>
<h3>What happens when two results are equal?</h3>
<p>HelloRun currently assigns sequential ranks. Equal primary values are ordered deterministically using review and submission timestamps rather than shared rank positions.</p>
<h3>Are 5K and 10K runners ranked together?</h3>
<p>No. Event distance groups have separate standings and their own rank sequence.</p>
<h3>Does pending accumulated distance count toward my total?</h3>
<p>It may be shown as pending potential progress, but only approved activities count toward the verified total and official rank.</p>
<h3>Can a treadmill activity appear?</h3>
<p>It can appear when the event accepts the activity, the evidence is approved, and the leaderboard mechanics include it. Treadmill eligibility is an event rule, not a universal platform promise.</p>
<h3>Can everyone see my proof screenshot?</h3>
<p>No. Public leaderboard entries do not include proof or OCR data. The public name and result fields still depend on the event's configured presentation.</p>
<h3>Why is my approved result not visible yet?</h3>
<p>Check the event, distance, mode, and filters, then allow for the short cache interval. If it remains missing, review the submission status and contact the appropriate support route.</p>
<h3>Is the leaderboard final when the event ends?</h3>
<p>Not necessarily. Reviews and corrections may continue after the activity window. The organiser should publish a separate final-results date or review close.</p>
<h3>Can I use a HelloRun rank as a qualifying result?</h3>
<p>Only if the receiving organisation explicitly accepts that event and evidence. A HelloRun virtual leaderboard is not automatically a certified or qualifying result.</p>

<h2>Final takeaway</h2>
<p>A useful leaderboard is not merely a sorted list. It is the visible outcome of clear mechanics, eligible evidence, consistent human review, appropriate privacy choices, and a published ranking rule.</p>
<p>For runners, verified means eligible for the event's official standing; pending does not. For organisers, every rank depends on decisions made before submissions arrive. Use the <a href="/how-it-works">How It Works</a> page and the foundational guide <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">What Is a Virtual Run?</a> for the surrounding registration-to-result journey. The <a href="/blog/virtual-run-vs-traditional-race-which-one-should-you-join">virtual-versus-onsite comparison</a> explains why reviewed virtual standings should not be treated as certified race timing.</p>

<h2>Official and platform sources</h2>
<p>This guide was reviewed against the following resources in July 2026:</p>
<ul>
  <li><a href="https://worldathletics.org/records/certified-roadevents">World Athletics: Certified Road Events</a></li>
  <li><a href="https://www.rrca.org/programs/race-director-certification/race-director-code-of-ethics/">Road Runners Club of America: Race Director Code of Ethics</a></li>
  <li><a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/">Information Commissioner's Office: Data Minimisation</a></li>
  <li><a href="https://www.w3.org/WAI/tutorials/tables/">W3C Web Accessibility Initiative: Tables Tutorial</a></li>
  <li><a href="/leaderboard">HelloRun Leaderboard Discovery</a></li>
  <li><a href="/how-it-works">HelloRun: How It Works</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
</ul>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Quick status guide',
  'How this guide was prepared',
  'Where runners find HelloRun leaderboards',
  'Which submissions are eligible for official standings',
  'Race-result leaderboards: fastest verified time',
  'Accumulated-challenge leaderboards: highest verified distance',
  'How ties are ordered today',
  'Verified, pending, flagged, and corrected results',
  'Why leaderboard positions change',
  'Cache delay: approval may not appear immediately',
  'Distance tabs, filters, search, and pagination',
  'My standing and nearby runners',
  'Runner names and public data',
  'What a HelloRun leaderboard does not prove',
  'How proof review affects leaderboard trust',
  'Runner troubleshooting checklist',
  'Organizer leaderboard checklist',
  'Frequently asked questions',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/leaderboard',
  '/events',
  '/how-it-works',
  '/faq',
  '/contact',
  '/privacy',
  '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
  '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  'worldathletics.org/records/certified-roadevents',
  'rrca.org/programs/race-director-certification/race-director-code-of-ethics',
  'ico.org.uk/for-organisations',
  'w3.org/WAI/tutorials/tables'
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
  if (/<h[12]>How Leaderboards Work in Virtual Running Events<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/<em>[^<]+<\/em>\s*\*/i.test(payload.contentHtml)) errors.push('body contains malformed emphasized text');
  if (/automatically (?:approves?|verifies?|ranks?)/i.test(text)) errors.push('article must not promise automatic review or ranking');
  if (/live (?:GPS )?(?:timing|leaderboard updates?)/i.test(text)) errors.push('article must not claim live timing or updates');
  if (/pending (?:entries|results|submissions).{0,30}(?:receive|have|get) (?:an? )?(?:official )?rank/i.test(text)) errors.push('article must not rank pending entries');
  if (/equal (?:times|distances|results).{0,40}(?:share|receive the same) rank/i.test(text)) errors.push('article must not claim shared ties');
  if (/HelloRun leaderboard (?:is|provides) (?:an? )?(?:official|certified|qualifying)/i.test(text)) errors.push('article must not claim external certification');
  if (/public leaderboard.{0,60}(?:shows|includes|exposes) (?:proof|OCR|email|review notes)/i.test(text)) errors.push('article must not claim private review data is public');
  if (/registered.only|private.until.published/i.test(text)) errors.push('article must not claim unverified restricted visibility behavior');
  if (!/documents the HelloRun leaderboard implementation available in July 2026/i.test(text)) errors.push('article must disclose its implementation-based methodology');
  if (!/up to approximately 60 seconds/i.test(text)) errors.push('article must disclose the leaderboard cache interval');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid leaderboard-guide payload: ${errors.join('; ')}`);
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
