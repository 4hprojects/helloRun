'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'can-you-walk-a-virtual-run';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'Can You Walk a Virtual Run? What Participants Should Check',
  excerpt: 'Walking may count in a virtual run, but the event rules decide. Check accepted activities, completion format, distance, proof, dates, and pace expectations before registering.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'virtual run walking',
    'walk virtual race',
    'walking challenge',
    'walk-run challenge',
    'walking virtual 5k',
    'walking virtual 10k',
    'beginner walking',
    'virtual run rules'
  ]),
  seoTitle: 'Can You Walk a Virtual Run? What Participants Should Check',
  seoDescription: 'Walking may count in some virtual runs, but event rules differ. Learn what participants should check before completing a virtual 5K, 10K, or distance challenge.',
  coverImageAlt: 'Textured colored-pencil illustration of a Filipino participant walking confidently on a tropical park route with a runner farther behind'
});

const RAW_CONTENT_HTML = `
<p>Yes, you can walk some virtual runs—but not all of them. The specific event rules decide whether walking, running, run-walk movement, hiking, trail running, treadmill activity, or accumulated sessions count. The word “run” in an event name is not automatic permission, and it is not automatic proof that walking is forbidden.</p>
<p>Before registering, check the activity types and rules published on the specific event page. Confirm the distance, whether it must be completed in one session or across several activities, the event window, proof method, minimum activity requirements, and submission deadline. If “walk” is not clearly listed, ask the organizer before completing the distance.</p>
<blockquote><strong>The practical answer:</strong> walking counts when the event explicitly accepts it and your evidence satisfies the same applicable rules. Do not relabel a walk as a run, assume every virtual 5K welcomes walking, or rely on a different event's policy.</blockquote>

<h2>Can you walk a virtual run?</h2>
<p>A virtual event separates participation from one fixed start line, but it does not erase eligibility rules. Some organizers intentionally welcome walking. Others allow run-walk activity but require a single session. Some challenges accept walking only as one activity type within an accumulated target. A race-oriented event may specify running or set requirements that a walk does not meet.</p>
<p>Walking can be meaningful physical activity. The World Health Organization includes walking among common ways to be active, and public-health recommendations describe moderate and vigorous activity at a population level. That health value is separate from event eligibility. A beneficial walk does not automatically count toward every medal, certificate, leaderboard, or challenge.</p>
<p>Use the event page as the primary source. Social posts, a friend's experience, an app badge, or the general meaning of “virtual run” cannot replace the published rules.</p>

<h2>The event rules decide what counts</h2>
<p>Look for explicit answers to these questions:</p>
<ul>
  <li><strong>Accepted activity types:</strong> does the event list walk, run, run-walk, hike, trail run, or another category?</li>
  <li><strong>Completion mode:</strong> is the target one continuous activity or an accumulated total?</li>
  <li><strong>Distance or steps:</strong> is the goal measured in kilometres, steps, or both?</li>
  <li><strong>Minimum per activity:</strong> must each contribution reach a stated distance?</li>
  <li><strong>Date window:</strong> when may eligible activity begin and end?</li>
  <li><strong>Submission deadline:</strong> when must proof be received, including the stated time zone?</li>
  <li><strong>Location and equipment:</strong> are outdoor, treadmill, indoor-track, or mixed activities accepted?</li>
  <li><strong>Evidence:</strong> which apps, screenshots, connected accounts, fields, or device records are allowed?</li>
  <li><strong>Ranking:</strong> is the event completion-only, ranked, or separated into activity categories?</li>
  <li><strong>Corrections:</strong> what happens if a submission is incomplete, rejected, or recorded under the wrong activity type?</li>
</ul>
<p>The <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">virtual-run overview</a> explains how event windows, flexible routes, evidence, and organizer review fit together. For a short answer about a live event, use the <a href="/faq">HelloRun FAQ</a> and then read the event listing itself.</p>

<h2>Walking-only virtual events</h2>
<p>A walking event can state that participants should record a walk, complete a walking distance, or accumulate eligible walking activity. It may be designed for community participation, workplace wellness, fundraising, or a progressive movement goal. “Walking-only” should still define what a walk means in its system and whether hiking, treadmill walking, mobility-aid use, or mixed activity is included.</p>
<p>Do not assume a walking event is effortless or suitable for everyone. Distance, hills, heat, humidity, surface, time on feet, and current capacity matter. A 10K walk can be a substantial session for someone who normally walks only short distances. Event inclusion and personal readiness are different questions.</p>
<p>An organizer should use clear language rather than expecting participants to infer intent from artwork. If the event says “walkers welcome,” check whether that statement appears in the official rules and whether it applies to every category.</p>

<h2>Walking, accessibility, and inclusive participation</h2>
<p>Allowing walking can lower one participation barrier, but it does not make an event fully accessible. A participant may also need step-free route options, mobility-aid guidance, accessible toilets, flexible evidence, privacy protection, a support person, additional completion time, or an indoor alternative. The event should state what it can support rather than expecting participants to disclose more health information than necessary.</p>
<p>Walking speed is not a measure of commitment. Age, disability, terrain, crowding, weather, caregiving, recovery, and many other factors affect how someone completes an activity. Avoid language such as “just walk it” or “anyone can do 5K.” Those phrases minimize real preparation and access needs.</p>
<p>A participant using a mobility aid should not assume either exclusion or acceptance from the word “walk.” Check the event's inclusive-participation and route rules, then ask a focused question if the published information is incomplete. An organizer may need to clarify how activity type, assistive equipment, distance evidence, and recognition work without requesting a diagnosis.</p>
<p>When the event cannot accommodate a requested format, learn that before payment and activity completion. Another category or event may be a better fit. Inclusion is strongest when expectations are explicit, contact routes are usable, and alternatives are described before registration.</p>

<h2>Run-walk participation</h2>
<p>Run-walk means planned or responsive alternation between running and walking. It is not automatically the same activity category on every platform. A tracking app may label the whole recording as a run or walk, while an event may describe mixed movement in its written rules.</p>
<p>If run-walk is accepted, walking breaks can be intentional. You do not need to hide them, stop the watch solely because you changed gait, or sprint later to compensate. Follow the event's timing and pause rules, record the session honestly, and choose an overall activity label consistent with the source app and organizer instructions.</p>
<p>The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">beginner run-walk guide</a> explains how walking intervals can support gradual training without prescribing one universal ratio. An interval pattern that works for one participant is not automatically suitable or event-compliant for another.</p>

<h2>Walking versus running is not only about pace</h2>
<p>A slow runner may move at a pace similar to a brisk walker. Pace alone therefore does not reliably classify the activity. Movement pattern, source label, event definition, and honest participant description all matter. Do not change an activity from walk to run simply because the result looks more competitive.</p>
<p>The CDC explains that intensity is relative: fast walking can be moderate activity for one person and feel vigorous to another. The talk test can describe effort—moderate activity generally allows talking but not singing—but it does not determine event eligibility or prove whether the movement should be labeled as a walk.</p>
<p>Leaderboards also require context. Comparing an unrestricted mixed-activity field by pace may disadvantage walkers or encourage mislabeling. Good event rules state whether ranking exists and whether activity types share a category. Participants should not infer that a completion badge creates a race against every other entry.</p>

<h2>Single-session versus accumulated-distance events</h2>
<h3>Single-session event</h3>
<p>A single-session virtual 5K ordinarily asks for one eligible activity that reaches the required distance within the event window. Two 2.5K walks do not automatically equal one qualifying 5K. Pauses, elapsed time, indoor use, and split records depend on the stated rule.</p>
<h3>Accumulated-distance event</h3>
<p>An accumulated challenge allows multiple approved activities to contribute toward a target across a defined period. It can still set an accepted activity list and a minimum distance or step requirement for each contribution. A casual walk below the minimum may be healthy movement without being an eligible challenge activity.</p>
<p>Pending submissions do not become official progress merely because their totals appear in the interface. Only applicable approved contributions count according to the event configuration. The <a href="/blog/how-accumulated-distance-challenges-work">accumulated-challenge guide</a> explains targets, individual activities, approval, and deadlines in detail.</p>

<h2>Does walking change proof requirements?</h2>
<p>Usually, the evidence still needs the fields required by the event: participant identity where applicable, activity date, distance or steps, duration when relevant, activity type, units, and recognizable source. Walking does not make unclear or altered proof acceptable.</p>
<p>Label the activity honestly. HelloRun supports separate run, walk, hike, and trail run activity labels in its submission workflow and supported Strava mapping. Platform support for a label is not a statement that every event accepts it. The event configuration and published rules still govern.</p>
<p>If screenshot analysis proposes an activity type, review it against the original record. Correct an extraction error to match the evidence; do not change the source image or select “run” merely to bypass a walk restriction. A mismatch may require review.</p>
<p>For a supported connected-Strava submission, the source activity type is normalized into a HelloRun activity label and checked where the event defines accepted types. Importing an activity does not transform an ineligible walk into a run or guarantee approval.</p>
<p>Read <a href="/blog/how-to-submit-run-proof-correctly-hellorun">the proof-submission guide</a> before the event, not only after a problem. Keep the original activity, protect unnecessary route privacy, and remember that submitted or pending is not approved.</p>

<h2>Walking a virtual 5K</h2>
<p>A walking virtual 5K is appropriate only when walking is accepted and five kilometres is realistic for the participant. Time varies widely with effort, terrain, stops, crossings, weather, mobility, and experience. Do not promise a universal finish time or treat a pace chart as a deadline unless the event publishes a cutoff.</p>
<p>Prepare by testing shorter walks on similar terrain. Increase distance gradually instead of making the event your first long walk. The NHS advises people who are not very active but are able to walk to build distance gradually. This is general public guidance, not individualized clearance.</p>
<p>On the activity day:</p>
<ul>
  <li>confirm walking is listed for the selected category;</li>
  <li>choose a safe, familiar route with suitable surface, crossings, access, weather, and exit options;</li>
  <li>wear comfortable footwear already tested for the distance;</li>
  <li>start at a manageable effort rather than chasing an app pace;</li>
  <li>carry appropriate water and sun or rain protection for the conditions;</li>
  <li>record with the accepted method and verify the activity label before submission;</li>
  <li>stop or seek appropriate help for concerning symptoms or unsafe conditions.</li>
</ul>
<p>Do not continue into traffic, flooding, severe weather, darkness without suitable precautions, or an unfamiliar unsafe area merely to reach 5.00 on a display. The <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe-route guide</a> puts route suitability ahead of an unbroken GPS line.</p>

<h2>Walking a virtual 10K</h2>
<p>Ten kilometres means more time on feet and more exposure to heat, humidity, friction, hydration needs, changing weather, and route conditions. A person who can comfortably walk 5K is not automatically prepared to double the distance on the next outing.</p>
<p>Use shorter walks to understand comfort, recovery, footwear, carrying needs, route exits, and how long the distance takes under comparable conditions. Progress one variable at a time where practical. A run-walk 10K and a walking 10K may create different demands, yet neither should be improvised from an internet finish-time target.</p>
<p>The <a href="/blog/10k-training-plan-for-beginners">beginner 10K plan</a> is designed around gradual preparation and includes alternatives, but it does not override an event's accepted activity types. If your goal is walking-only, adapt training with appropriate professional guidance rather than copying every running session.</p>
<p>A 10K category should not be chosen only because it offers a different medal or looks more impressive. Select the distance that fits current capacity, preparation time, route, support, and event window.</p>

<h2>Choosing a realistic event category</h2>
<p>Start from what you can currently complete comfortably, not the maximum distance you once covered or hope to reach. Consider:</p>
<ul>
  <li>your recent longest comfortable walk or run-walk;</li>
  <li>how you felt later that day and after recovery;</li>
  <li>the weeks available for gradual preparation;</li>
  <li>surface, elevation, climate, and time of day;</li>
  <li>medical conditions, symptoms, mobility needs, pregnancy, or recent inactivity that may call for individualized advice;</li>
  <li>whether the event allows one session or accumulation;</li>
  <li>the minimum contribution and accepted activity list;</li>
  <li>transport, companionship, accessibility, water, toilets, and exit options.</li>
</ul>
<p>The <a href="/blog/30-day-running-challenge-for-beginners">flexible 30-day challenge</a> includes walking-first and run-walk alternatives. It can help establish a routine, but completing calendar days does not guarantee readiness for a particular distance.</p>

<h2>What to check before registering</h2>
<ol>
  <li><strong>Open the full event listing.</strong> Do not register from a social caption or image alone.</li>
  <li><strong>Find accepted activities.</strong> Look for “walk” in the relevant category or written rules.</li>
  <li><strong>Read the completion mode.</strong> Confirm one session versus accumulated distance or steps.</li>
  <li><strong>Check minimums and targets.</strong> Separate the overall goal from any minimum per activity.</li>
  <li><strong>Check dates and time zone.</strong> Note the activity window and final submission deadline.</li>
  <li><strong>Confirm proof.</strong> Know whether screenshots, supported connected activities, treadmill records, or step evidence are accepted.</li>
  <li><strong>Review recognition.</strong> Understand completion, ranking, certificates, medals, and whether types are separated.</li>
  <li><strong>Assess readiness.</strong> Choose the distance and format you can prepare for appropriately.</li>
  <li><strong>Ask before paying.</strong> If walking is unclear, contact the organizer and retain the answer with the rules.</li>
  <li><strong>Recheck before the activity.</strong> Use the current event page in case instructions have been clarified.</li>
</ol>
<p>If the answer arrives privately from an organizer, keep the message and confirm that it applies to your chosen category and event edition. A general “walkers are welcome” response may still leave questions about accumulation, treadmills, proof, or ranking. Ask one precise follow-up rather than guessing.</p>

<h2>How HelloRun event rules work</h2>
<p>HelloRun provides tools for organizers to configure and publish event requirements. Accumulated challenges can define accepted activity types from run, walk, hike, and trail run, along with distance or step metrics, targets, and other thresholds. Single-activity events use their published category and event instructions. The participant-facing rule remains simple: check the activity types and rules published on the specific event page.</p>
<p>The submission form allowing a “Walk” selection does not mean a walk is eligible for the selected event. Likewise, Strava supporting a Walk activity type does not override the organizer's accepted list. Technical availability and event permission are separate.</p>
<p>HelloRun review can evaluate the submitted activity against event dates, distance or step requirements, accepted activity information, evidence, duplicates, and other configured checks. Correct submission improves reviewability but never guarantees approval.</p>
<p>If an event rule is ambiguous, contact the organizer through the published channel before registering or completing the activity. Do not ask support to retroactively turn a walk into a run.</p>

<h2>Safety and health boundaries</h2>
<p>Walking is accessible to many people, but no distance is universally safe or easy. General population recommendations from WHO, CDC, and the NHS describe the value and intensity of physical activity; they do not determine an individual's suitability for a 5K or 10K event.</p>
<p>Begin gradually when you are new or returning. Use an effort appropriate to your capacity, route, weather, and health. Stop the activity and seek appropriate medical or emergency help for concerning symptoms such as chest pain, fainting, severe breathing difficulty, confusion, or another urgent change. Pain, illness, heat, lightning, flooding, poor air, traffic, or personal-security concerns can justify ending the attempt.</p>
<p>People with relevant medical conditions, symptoms, recent surgery or injury, pregnancy-related concerns, or uncertainty about increasing activity should seek individualized advice from a qualified health professional. This guide cannot provide personal clearance.</p>

<h2>Common mistakes to avoid</h2>
<h3>Assuming “virtual” means any activity counts</h3>
<p>Virtual describes the event format, not unlimited eligibility. Read the accepted types.</p>
<h3>Using another event's policy</h3>
<p>Walking in one organizer's challenge does not establish the rules for another event or later edition.</p>
<h3>Relabeling a walk as a run</h3>
<p>Mislabeling weakens evidence and may violate the rules. Submit the activity honestly.</p>
<h3>Combining sessions for a single activity</h3>
<p>Accumulation must be explicitly allowed. Several walks are not automatically one virtual 5K or 10K.</p>
<h3>Assuming every step counts</h3>
<p>An accumulated challenge may require verified steps, a minimum contribution, approved activity, or a specific evidence source. Ordinary daily steps do not universally qualify.</p>
<h3>Choosing distance from a generic time chart</h3>
<p>Finish times vary and do not establish readiness. Consider recent activity and the actual route.</p>
<h3>Waiting until after the walk to inspect proof rules</h3>
<p>Test the accepted recorder and evidence fields before the event window closes.</p>

<h2>Frequently asked questions</h2>
<h3>Do you have to run the whole virtual race?</h3>
<p>Only the specific event rules can answer. Some accept walking or run-walk movement; others require a particular activity type or format.</p>
<h3>Can I walk a virtual 5K?</h3>
<p>Yes when the event accepts walking for that 5K category and your single or accumulated evidence meets its requirements.</p>
<h3>Can I walk a virtual 10K?</h3>
<p>Yes when permitted, but confirm readiness and prepare gradually. Ten kilometres can be a substantial walking session.</p>
<h3>Can I mix walking and running?</h3>
<p>Some events allow run-walk participation. Confirm how the overall activity should be labeled and whether it must remain one session.</p>
<h3>Does treadmill walking count?</h3>
<p>Only when the event accepts treadmill or indoor activity and its evidence. A treadmill activity does not produce the same outdoor GPS record.</p>
<h3>Do daily steps count toward a virtual run?</h3>
<p>Not automatically. A step-based accumulated challenge may accept verified steps under defined rules; a distance race may require a discrete activity.</p>
<h3>Can I pause during a walking event?</h3>
<p>Check the timing and continuous-activity rules. A safe stop may be necessary, but pause behavior can affect elapsed time, moving time, and eligibility.</p>
<h3>Will a walking activity appear on a leaderboard?</h3>
<p>That depends on event ranking settings and approval. Completion-only events may not rank pace, while other events may combine or separate types.</p>
<h3>Does selecting Walk in HelloRun guarantee acceptance?</h3>
<p>No. It records an activity label. The selected event's rules and review determine whether that walk is eligible.</p>

<h2>Method and limitations</h2>
<p>This guide was reviewed in September 2026 against current HelloRun event configuration, runner submission, supported Strava-type mapping, accumulated-activity validation, FAQ, approval, and progress behavior. Health context was checked against current WHO, CDC, and NHS public guidance.</p>
<p>It does not describe a promise that every current or future HelloRun event accepts walking. Event organizers choose their formats and rules. Interfaces and settings can change, so the live event page and submission flow remain authoritative.</p>
<p>The health sources describe populations and general activity principles, not personal training prescriptions, diagnosis, treatment, or event clearance. Examples involving 5K and 10K distances are planning considerations rather than universal schedules or finish-time predictions.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity">World Health Organization: Physical Activity</a></li>
  <li><a href="https://www.cdc.gov/physical-activity-basics/adding-adults/what-counts.html">CDC: What Counts as Physical Activity for Adults</a></li>
  <li><a href="https://www.nhs.uk/live-well/exercise/walking-for-health/">NHS: Walking for Health</a></li>
  <li><a href="/faq">HelloRun FAQ</a></li>
</ul>

<h2>Find an event that fits</h2>
<p><a href="/events">Browse current HelloRun events</a> and open each listing before registering. Check whether walking is accepted, then match the activity type, distance, completion format, proof, dates, and safety demands to your situation.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Can you walk a virtual run?',
  'The event rules decide what counts',
  'Walking-only virtual events',
  'Walking, accessibility, and inclusive participation',
  'Run-walk participation',
  'Walking versus running is not only about pace',
  'Single-session versus accumulated-distance events',
  'Does walking change proof requirements?',
  'Walking a virtual 5K',
  'Walking a virtual 10K',
  'Choosing a realistic event category',
  'What to check before registering',
  'How HelloRun event rules work',
  'Safety and health boundaries',
  'Common mistakes to avoid',
  'Frequently asked questions',
  'Method and limitations',
  'Official and platform sources',
  'Find an event that fits'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/faq"',
  'href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers"',
  'href="/blog/run-walk-method-beginner-friendly-way-build-endurance"',
  'href="/blog/how-accumulated-distance-challenges-work"',
  'href="/blog/how-to-submit-run-proof-correctly-hellorun"',
  'href="/blog/how-to-choose-a-safe-route-for-your-virtual-run"',
  'href="/blog/10k-training-plan-for-beginners"',
  'href="/blog/30-day-running-challenge-for-beginners"'
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
  if (/<h[12]>Can You Walk a Virtual Run\? What Participants Should Check<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/(?:all|every) (?:virtual runs?|HelloRun events?) (?:allow|accept|permit) walking|walking always counts/i.test(text)) errors.push('article must not claim universal walking acceptance');
  if (/select(?:ing)? (?:the )?walk (?:option|label) guarantees? (?:acceptance|approval)|Walk in HelloRun guarantees acceptance/i.test(text)) errors.push('article must not equate a label with acceptance');
  if (/(?:all|every) (?:daily )?steps? (?:always )?counts? toward (?:a|every) virtual run/i.test(text)) errors.push('article must not claim universal step eligibility');
  if (/(?:two|multiple|several) walks? automatically (?:equal|count as|become) (?:one|a) (?:5K|10K|single activity)/i.test(text)) errors.push('article must not combine sessions universally');
  if (/relabel (?:a )?walk as (?:a )?run to (?:qualify|be accepted|count)|hide walking breaks/i.test(text)) errors.push('article must not encourage mislabeling');
  if (/walking (?:is|will be) safe for everyone|every person can safely walk (?:5K|10K)/i.test(text)) errors.push('article must not guarantee walking safety');
  if (/pending (?:evidence|activity|distance) (?:counts|is counted) (?:as )?(?:official|approved)/i.test(text)) errors.push('article must not count pending evidence officially');
  if (!/Yes, you can walk some virtual runs—but not all of them/i.test(text)) errors.push('article must answer intent immediately');
  if (!/Check the activity types and rules published on the specific event page/i.test(text)) errors.push('article must state the platform direction');
  if (!/reviewed in September 2026/i.test(text)) errors.push('article must disclose methodology and date');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }
  if (errors.length) throw new Error(`Invalid virtual-run walking guide payload: ${errors.join('; ')}`);
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
