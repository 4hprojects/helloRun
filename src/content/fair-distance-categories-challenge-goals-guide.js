'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-design-fair-distance-categories-and-challenge-goals';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Design Fair Distance Categories and Challenge Goals',
  excerpt: 'Design clear single-activity distances and accumulated challenge goals by aligning participant choices, event duration, review capacity, pricing, results, and recognition.',
  category: 'Organizer Guide',
  tags: Object.freeze([
    'event categories',
    'distance goals',
    'virtual run organizer',
    'accumulated challenge',
    'race distance design',
    'event pricing',
    'leaderboard rules',
    'organizer guide'
  ]),
  seoTitle: 'How to Design Fair Distance Categories and Challenge Goals',
  seoDescription: 'A practical organizer guide to designing clear single-activity distances and accumulated goals with consistent pricing, review, leaderboards, and recognition.',
  coverImageAlt: 'Overhead editorial blueprint with four color-coded route loops, goal tokens, measuring tools, and organizer hands comparing event categories'
});

const RAW_CONTENT_HTML = `
<p>Distance categories shape almost every promise in a running event. They affect who believes the event is for them, what a participant must complete, how registration choices appear, how much evidence the team reviews, what a leaderboard compares, and which result or goal can be recognized. A category is therefore more than a label beside a registration button.</p>
<p>“Fair” does not mean that one distance feels equally easy, attractive, or achievable to everyone. People have different experience, health, disability, schedules, environments, resources, and reasons for joining. For an organizer, a fairer design begins with transparent choices, consistent rules, supportable operations, and no hidden disadvantage between what a category promises and what the event actually records.</p>
<blockquote><strong>The category test:</strong> a participant should be able to compare the choices, explain what one choice requires, understand how its result is assessed, and receive the published treatment without needing private organizer knowledge.</blockquote>

<h2>Distance-category design in one minute</h2>
<ol>
  <li><strong>Define the event outcome.</strong> Decide whether the event recognizes one completed activity, accumulated consistency, approved total distance, participation, or another clearly supportable result.</li>
  <li><strong>Choose one completion mechanic.</strong> Separate single-activity distances from accumulated-distance goals. A distance label alone does not explain the difference.</li>
  <li><strong>Describe the intended participant choice.</strong> State who each option is designed to serve without claiming that it is suitable or achievable for every person.</li>
  <li><strong>Test the operating load.</strong> Estimate registrations, activity submissions, payment receipts, corrections, results, support questions, and recognition work for each option.</li>
  <li><strong>Make every label unique.</strong> A category name should reveal its distance or goal and completion mode. Avoid duplicate or near-duplicate choices.</li>
  <li><strong>Align connected settings.</strong> Category, distance, price, capacity, inclusions, evidence, leaderboard, and recognition must describe the same offer.</li>
  <li><strong>Preview representative registrations.</strong> Test what a runner sees, pays, submits, tracks, and receives for each category.</li>
  <li><strong>Publish a category matrix.</strong> Put the important differences in one participant-facing comparison before registration.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in August 2026 against current HelloRun event categories, race distances, category-linked pricing, registration snapshots, single-activity and accumulated-distance completion modes, accumulated target resolution, activity review states, leaderboard settings, progress presentation, and certificate finalization behavior.</p>
<p>It also uses the Road Runners Club of America Race Director Code of Ethics for honest communication and non-discrimination, World Wide Web Consortium Web Accessibility Initiative guidance for clear and descriptive option labels, and World Athletics rules only as limited context for recognized road-running distances. Those sources do not establish one universal set of fair virtual-run goals.</p>
<p>This is event-design education, not individualized training, medical, legal, accessibility-certification, safeguarding, insurance, tax, or competition-rule advice. An organizer must assess the actual audience, jurisdiction, event type, prize structure, and operating capacity. A technically valid platform configuration can still be confusing or inappropriate for a particular event.</p>

<h2>Begin with the event purpose, not a list of distances</h2>
<p>Start by writing one sentence that identifies the outcome the event exists to support. Examples include completing one race-like effort, building a habit across several weeks, recording approved community mileage, supporting a school participation campaign, or recognizing finishers without ordinal ranking. This decision tells the team what a distance category must represent.</p>
<p>If the purpose is a comparable single result, several race distances may be appropriate because each participant submits one eligible activity for the selected distance. If the purpose is sustained participation, an accumulated challenge may be more coherent because several approved activities contribute to one selected goal. Do not choose accumulated mechanics merely because the headline number looks more impressive.</p>
<h3>Write the outcome statement</h3>
<p>Use a structure such as: “This event lets [intended audience] complete [one activity or accumulated activities] during [window], with official recognition based on [approved completion, time, or distance].” If the team cannot fill every bracket honestly, category design is premature.</p>
<p>A fundraising target, marketing slogan, or reward inventory is not the completion mechanic. Keep the participant activity requirement separate from the organization’s financial or promotional goal.</p>

<h2>Separate single-activity distances from accumulated goals</h2>
<p>A single-activity category requires one eligible record to meet the selected distance under the published rules. Several shorter activities do not become a single 10K result merely because their total reaches ten kilometres. This format can support race-like comparison when date, distance, duration, activity type, and review rules are consistent.</p>
<p>An accumulated-distance category combines several separately approved activities during the event window. The organizer must define the goal, accepted activity types, minimum eligible activity when used, evidence, deadline, overshoot treatment, and whether participants may keep submitting after reaching the goal. Read <a href="/blog/how-accumulated-distance-challenges-work">How Accumulated-Distance Challenges Work</a> before configuring that format.</p>
<p>Do not mix both mechanics under an identical label. “50K” could mean one ultra-distance activity or a month of shorter activities. Use a label such as “50K Single Activity” or “50K Accumulated Goal” when confusion is possible, and repeat the completion mode in the participant rules.</p>
<h3>A mechanic decision table</h3>
<ul>
  <li><strong>One comparable effort:</strong> use a single-activity category and define the accepted result basis.</li>
  <li><strong>Several sessions toward one target:</strong> use an accumulated goal and define how approved activities add together.</li>
  <li><strong>Completion without competition:</strong> state that recognition is completion-based and do not imply an ordinal ranking.</li>
  <li><strong>Highest approved mileage:</strong> state that approved accumulated distance controls the standing and explain treatment after the goal.</li>
  <li><strong>Unsupported mixed concept:</strong> simplify the event before promotion rather than inventing manual exceptions after registration.</li>
</ul>

<h2>Define who each choice is intended to serve</h2>
<p>Participant research is more useful than copying another event’s category menu. Review the intended audience’s experience, available event window, access to suitable places or permitted indoor options, technology requirements, cost sensitivity, accessibility needs, and likely support needs. Ask representative people to interpret the proposed options before publishing.</p>
<p>A category description may say that it is designed for people seeking a shorter single activity or a longer accumulated commitment. It should not say that the category is safe, easy, beginner-proof, or universally achievable. Avoid age, disability, gender, or experience assumptions that are unrelated to a legitimate and appropriately reviewed event requirement.</p>
<p>The RRCA Race Director Code of Ethics emphasizes honest communication and prohibits discrimination and harassment across a broad range of participant characteristics. Apply that principle by reviewing whether eligibility boundaries have a defined purpose, whether equivalent information is available to everyone, and whether staff can explain decisions consistently.</p>
<h3>Do not confuse more options with more inclusion</h3>
<p>Ten poorly differentiated categories can create more uncertainty than three clear choices. Inclusion depends on understandable rules, usable registration, appropriate support, considered accessibility, and honest boundaries—not the category count alone. If the event needs a distinct adaptive, youth, team, or institutional pathway, involve the affected community and obtain relevant expert guidance instead of guessing from labels.</p>

<h2>Assess participant burden without prescribing ability</h2>
<p>For each proposed option, list what the participant must do: register, pay if applicable, complete eligible activity, record required fields, submit evidence, respond to correction, and wait for final review. For an accumulated goal, also estimate the number of activity opportunities implied by the event window and minimum-per-activity rule.</p>
<p>This calculation measures event design, not a person’s fitness. For example, a 100K accumulated goal with a ten-kilometre minimum permits fewer qualifying submissions than the same goal with a one-kilometre minimum, but the two designs create different participant and reviewer experiences. Neither is automatically fairer. The organizer must publish the chosen rule and verify that the team can operate it.</p>
<p>Do not publish a rigid formula stating that a participant should increase distance by a fixed percentage or complete a universal weekly amount. Training suitability belongs to the individual and, where appropriate, a qualified professional. The event can explain its own requirement without turning that requirement into health advice.</p>

<h2>Estimate evidence and review capacity</h2>
<p>Category design creates operational volume. A single-activity event with 500 participants may produce roughly one primary result per participant plus corrections. An accumulated event with the same registrations may produce several activities per person, each with its own evidence, status, integrity signals, review decision, and possible correction.</p>
<p>Create a capacity estimate for each category using expected registrations, likely submissions per registration, payment receipts, correction rate, support contacts, and finalization work. Use a range rather than pretending the estimate is exact. Identify the people who will review peak queues and the deadline by which pending work must be resolved.</p>
<p>A lower minimum activity can support more ways to participate, but it may also create many more submissions. A higher minimum can reduce review volume while excluding activity that the intended community expected to count. Make that tradeoff consciously and explain it before registration. Never change the minimum quietly after participants begin.</p>
<h3>Capacity questions</h3>
<ul>
  <li>How many registrations can the team support in each category?</li>
  <li>How many separate activities might an accumulated participant submit?</li>
  <li>Can reviewers apply the same evidence standard across every category?</li>
  <li>When will correction requests close?</li>
  <li>Can final standings and recognition wait until all material pending reviews are resolved?</li>
  <li>What happens if one category reaches its capacity first?</li>
</ul>

<h2>Name categories so participants can compare them</h2>
<p>A useful category label is unique, concise, and descriptive. W3C guidance explains that option labels should communicate the meaning and purpose of a choice. In an event form, that means a runner should not need color, position, a poster, or a support message to distinguish two registration options.</p>
<p>Use the same distance unit and naming structure across the menu. “5K Single Activity,” “25K Accumulated Goal,” and “50K Accumulated Goal” are easier to compare than “Starter,” “Challenge,” and “Elite” when those marketing names hide the actual requirements. A branded nickname can follow the descriptive label rather than replace it.</p>
<p>HelloRun category display names and distance labels must remain unique for reliable registration and pricing. Category identifiers also need to be unique internally. Do not create two visually identical “10K” choices with different prices or rewards and expect the participant to infer the difference.</p>
<h3>Avoid hierarchy language you cannot justify</h3>
<p>Words such as beginner, advanced, elite, inclusive, accessible, competitive, and family can carry promises beyond distance. Use them only when the eligibility, support, operation, and public explanation justify them. Completing a larger number does not make one participant more valuable to the community.</p>

<h2>Use recognized distances as context, not a mandate</h2>
<p>World Athletics technical rules list recognized road-race distances in a regulated competition context. Those rules can help an organizer understand familiar road-running conventions, but they do not require a community virtual event to use only those distances, and they do not make a chosen goal fair for every audience.</p>
<p>A non-standard distance can serve a clear event purpose. An accumulated 30K community goal, a school campaign distance, or a charity-linked target can be understandable when its mechanic and meaning are explicit. Do not call a virtual route officially measured, certified, record-eligible, or compliant with governing-body rules unless the event actually meets the applicable requirements and has appropriate authority.</p>
<p>The runner-facing <a href="/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge">distance-choice guide</a> helps participants compare commitments. This organizer guide addresses how to make the choices coherent before participants see them.</p>

<h2>Keep category settings connected</h2>
<p>For every category, reconcile the public name, completion mode, numerical distance, displayed distance label, capacity, registration price, included items, accepted activities, evidence, leaderboard treatment, and recognition. A mismatch anywhere creates a different offer from the one the participant thought they selected.</p>
<p>HelloRun supports structured race categories with a category identifier, name, type, distance label, numeric distance, optional slots, cutoff description, age-group description, and rewards description. Use only fields that have a defined purpose, and keep narrative rules consistent with them.</p>
<h3>Pricing and capacity</h3>
<p>Category-linked pricing must point to a real category. Test the amount shown for every representative choice, including pricing periods, packages, add-ons, physical rewards, and delivery charges where used. A higher goal does not automatically justify a higher fee; explain actual inclusions rather than charging for perceived status.</p>
<p>If category slots are limited, publish how availability and confirmation work. A submitted registration or payment receipt is not necessarily an approved place when review remains pending. Do not oversell a reward quantity shared across categories.</p>
<h3>Rewards and recognition</h3>
<p>State whether each category receives a configured certificate, badge, physical item, prize eligibility, leaderboard presence, or completion acknowledgement. Avoid vague “finisher rewards” when different categories receive different items. Recognition availability depends on event configuration, eligible approved results, final review, and successful generation or fulfilment.</p>

<h2>Understand how HelloRun resolves an accumulated goal</h2>
<p>The accumulated target belongs to a registration, not to a runner’s entire account. HelloRun first looks for the numeric distance on the specifically selected race category stored with the registration. If that category distance cannot be resolved, it can parse the selected registration distance label. The event-level target is the final fallback.</p>
<p>This precedence permits different goals inside one event. One registration may resolve to 25K while another resolves to 100K. Their progress percentages are assessed against their own selected targets. An organizer should therefore not publish one universal event target if the registration menu actually establishes several goals.</p>
<p>Preserve category identifiers and distances after registration begins. Renaming for clarity requires careful review; deleting, duplicating, or repurposing a category can disconnect public language, pricing references, and registration snapshots. Use a material-change process rather than silent edits.</p>
<h3>Goal-resolution check</h3>
<ol>
  <li>Select each accumulated category in a preview or controlled test registration.</li>
  <li>Confirm the category has the intended numeric distance and readable label.</li>
  <li>Confirm the registration summary shows the same choice.</li>
  <li>Confirm progress uses that selected goal rather than an unrelated event fallback.</li>
  <li>Confirm pricing, recognition, and public rules name the same category.</li>
</ol>

<h2>Choose a leaderboard question the data can answer</h2>
<p>A leaderboard should answer one published question. For a single-activity result, HelloRun’s race-result presentation ranks eligible approved results using the configured race-result basis, commonly fastest approved time within the relevant event grouping. Several shorter activities are not combined into that single result.</p>
<p>For an accumulated challenge, HelloRun can group approved activities by registration and rank by highest verified accumulated distance. Pending activity remains separate and does not enter official ordering. If the event is completion-only, do not imply that a visible list creates a competitive distance ranking.</p>
<p>Use the <a href="/blog/how-leaderboards-work-virtual-running-events">leaderboard guide</a> to define grouping, approval, ties, privacy, and finalization. Categories compared together should have compatible mechanics. A 5K fastest-time result and a 100K accumulated total do not answer the same performance question.</p>
<h3>Publish tie and prize treatment</h3>
<p>State the actual tie behavior and prize-decision process before entries open. Do not invent an automatic shared-rank or tie-break rule that the platform does not implement. Flagged, rejected, or pending evidence must not receive official placement merely to meet an announcement date.</p>

<h2>Plan certificates and final recognition</h2>
<p>For single-activity events, certificate availability depends on approved eligible results and the configured certificate workflow. For accumulated challenges, finalization can preserve the selected goal, final approved distance, approved activity count, and finalization time. The final approved total may exceed the selected goal when eligible activity continues under the rules.</p>
<p>Reaching a goal is not the same as closing the event. Pending reviews, corrections, later eligible submissions, and final deadlines can still change the official total. Do not guarantee instant certificates, rewards, or placement at the moment a progress bar reaches 100%.</p>
<p>Preview each category’s recognition copy. A certificate should not label a 25K goal as 100K, present pending distance as verified, or imply a competitive rank in a completion-only event.</p>

<h2>Three illustrative configurations</h2>
<h3>Scenario 1: three single-activity community distances</h3>
<p>An organizer offers 3K, 5K, and 10K single-activity categories. Each label includes “Single Activity,” each requires one eligible result during the same window, and each has its own registration choice. The team tests category-linked pricing and groups results by the selected distance. The distances are examples, not a declaration that every participant should select one.</p>
<h3>Scenario 2: two accumulated consistency goals</h3>
<p>A month-long event offers 25K and 50K accumulated goals. Both accept the same published activity types and evidence, while each registration stores its selected target. Approved activities add to official progress; pending activities remain separate. The organizer estimates that the lower minimum activity could create a large review queue and assigns sufficient reviewers before launch.</p>
<h3>Scenario 3: one completion goal without ordinal ranking</h3>
<p>A community organization offers one 30K accumulated completion goal and does not promise prizes for highest mileage. The event page explains completion, continued activity after reaching the goal, final review, and configured recognition. The organizer avoids calling the category “competitive” merely because totals can be displayed.</p>
<p>These configurations illustrate alignment. They are not recommendations for a particular audience, duration, person, or organization.</p>

<h2>A copyable category matrix</h2>
<p>Create one row per registration choice and complete every column before publishing:</p>
<ul>
  <li><strong>Public category name:</strong> unique descriptive label.</li>
  <li><strong>Purpose:</strong> participant outcome the category supports.</li>
  <li><strong>Completion mode:</strong> single activity or accumulated distance.</li>
  <li><strong>Distance or goal:</strong> numeric value, unit, and displayed label.</li>
  <li><strong>Activity window:</strong> full dates, times, and controlling timezone.</li>
  <li><strong>Accepted activity:</strong> configured run types and indoor treatment.</li>
  <li><strong>Evidence:</strong> required source and visible fields.</li>
  <li><strong>Minimum activity:</strong> value when applicable, otherwise not applicable.</li>
  <li><strong>Capacity:</strong> available slots and confirmation rule.</li>
  <li><strong>Price:</strong> fee, periods, package, inclusions, add-ons, and delivery.</li>
  <li><strong>Official result:</strong> approved completion, time, or accumulated distance.</li>
  <li><strong>Leaderboard:</strong> grouping and ranking basis, or explicitly none.</li>
  <li><strong>Recognition:</strong> certificate, badge, reward, prize eligibility, or acknowledgement.</li>
  <li><strong>Operations owner:</strong> person responsible for review and support.</li>
</ul>
<p>Compare the rows horizontally. If two rows look the same but charge different amounts or produce different recognition, the distinction is missing. If one row uses a different mechanic, make that difference visible near the category name.</p>

<h2>Run a participant comprehension check</h2>
<p>Give the proposed event page to people who did not configure it. Ask them to choose a category and explain, in their own words, the required distance, completion mechanic, accepted activity, evidence, deadline, price, official result, and recognition. Do not coach them while they answer.</p>
<p>Record where interpretations differ. If participants confuse one activity with accumulated activity, believe pending distance is official, miss a category price, or assume every finisher receives the same reward, revise the public page and repeat the check. A successful test is evidence of improved clarity, not proof that the event is universally accessible or fair.</p>
<p>Use <a href="/blog/how-to-write-clear-virtual-run-rules-participants-can-follow">the clear-rules guide</a> for the full participant-facing rules and <a href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers">the organizer playbook</a> for broader planning.</p>

<h2>Final pre-publication audit</h2>
<ul>
  <li>The event purpose and intended outcome are written clearly.</li>
  <li>Every category states single-activity or accumulated completion.</li>
  <li>Every name, distance label, and category identifier is unique.</li>
  <li>Numeric category distances match displayed labels and event copy.</li>
  <li>Accumulated goals resolve correctly for representative registrations.</li>
  <li>Accepted activities, minimum distance, evidence, deadlines, and overshoot treatment are published.</li>
  <li>Category pricing references the correct category and matches inclusions.</li>
  <li>Capacity and review estimates fit the available operating team.</li>
  <li>Only approved results count officially; pending and rejected records remain separate.</li>
  <li>Leaderboard grouping compares compatible mechanics and states its basis.</li>
  <li>Recognition is configured, previewed, funded where relevant, and not guaranteed prematurely.</li>
  <li>Participant comprehension testing found no unresolved category ambiguity.</li>
  <li>The live event page agrees with promotional summaries and policies.</li>
</ul>
<p>Review the <a href="/organiser-terms">Organiser Terms</a>, <a href="/how-it-works">How HelloRun Works</a>, and current <a href="/events">public events</a> while checking the complete participant journey.</p>

<h2>Your practical next step</h2>
<p>Draft no more than the categories the event genuinely needs, then complete the matrix for each one. Test one representative registration per category from selection through price, evidence expectation, result grouping, and recognition. Remove or merge any option whose difference cannot be explained in one plain sentence.</p>
<p>Keep the design in draft until the event owner, reviewer, support lead, and a person outside the setup team can describe the same mechanics. Fairer category design comes from visible, supportable decisions—not from a persuasive label or a larger headline number.</p>

<h2>Sources and review notes</h2>
<p><strong>Official and platform sources:</strong> the event-design principles below come from the named organizations, while HelloRun behavior comes from the current application fields and services reviewed for this article.</p>
<ul>
  <li><a href="https://www.rrca.org/programs/race-director-certification/race-director-code-of-ethics/">Road Runners Club of America: Race Director Code of Ethics</a>.</li>
  <li><a href="https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions">W3C Web Accessibility Initiative: Understanding Labels or Instructions</a>.</li>
  <li><a href="https://www.w3.org/WAI/curricula/content-author-modules/forms/">W3C Web Accessibility Initiative: Forms in Content Author Modules</a>.</li>
  <li><a href="https://worldathletics.org/about-iaaf/documents/book-of-rules">World Athletics: Book of Rules and current Competition and Technical Rules</a>.</li>
</ul>
<p>Source material and HelloRun behavior were reviewed in August 2026. Event-specific rules, current platform fields, applicable local requirements, and qualified advice take precedence over the examples in this guide.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Distance-category design in one minute',
  'How this guide was prepared',
  'Begin with the event purpose, not a list of distances',
  'Separate single-activity distances from accumulated goals',
  'Estimate evidence and review capacity',
  'Name categories so participants can compare them',
  'Keep category settings connected',
  'Understand how HelloRun resolves an accumulated goal',
  'Choose a leaderboard question the data can answer',
  'Plan certificates and final recognition',
  'A copyable category matrix',
  'Run a participant comprehension check',
  'Final pre-publication audit',
  'Your practical next step',
  'Sources and review notes'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/how-it-works"',
  'href="/events"',
  'href="/organiser-terms"',
  'href="/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers"',
  'href="/blog/how-to-write-clear-virtual-run-rules-participants-can-follow"',
  'href="/blog/how-accumulated-distance-challenges-work"',
  'href="/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge"',
  'href="/blog/how-leaderboards-work-virtual-running-events"'
]);

function buildArticlePayload({ coverImageUrl } = {}) {
  const contentHtml = sanitizeHtml(RAW_CONTENT_HTML);
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
  if (wordCount < 3200) errors.push('article must contain at least 3200 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('cover artwork is required for publication');
  if (/<h1\b/i.test(payload.contentHtml)) errors.push('body must not contain a page-level h1');
  if (/<h[12]>How to Design Fair Distance Categories and Challenge Goals<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/any distance is fair for everyone|every distance is fair|achievable for everyone/i.test(text)) errors.push('article must not claim universal fairness or achievability');
  if (/standard road distances are mandatory|virtual events must only use (?:official|standard) distances/i.test(text)) errors.push('article must not mandate standard road distances');
  if (/pending (?:results?|activities|distance).{0,35}(?:counts?|contributes?) (?:officially|toward official)/i.test(text)) errors.push('article must not count pending results officially');
  if (/categories automatically guarantee (?:accessibility|equal outcomes)|more categories guarantee inclusion/i.test(text)) errors.push('article must not guarantee accessibility or outcomes');
  if (/every (?:registration|submission) is automatically approved|automatic approval is guaranteed/i.test(text)) errors.push('article must not promise automatic approval');
  if (/(?:certificates?|rewards?|leaderboard placement) (?:are|is) guaranteed|guaranteed (?:certificate|reward|leaderboard placement)/i.test(text)) errors.push('article must not guarantee recognition');
  if (!/reviewed in August 2026 against current HelloRun/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/selected race category stored with the registration/i.test(text)) errors.push('article must explain accumulated goal precedence');
  if (!/Pending activity remains separate and does not enter official ordering/i.test(text)) errors.push('article must distinguish pending leaderboard activity');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid fair distance categories payload: ${errors.join('; ')}`);
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
