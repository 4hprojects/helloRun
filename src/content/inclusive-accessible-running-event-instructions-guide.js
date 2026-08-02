'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-make-running-event-instructions-inclusive-accessible';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Make Running Event Instructions More Inclusive and Accessible',
  excerpt: 'Write event instructions that are easier to find, understand, navigate, and act on while stating real eligibility, accessibility, and support boundaries.',
  category: 'Community',
  tags: Object.freeze([
    'accessible events',
    'inclusive instructions',
    'event communication',
    'plain language',
    'organizer accessibility',
    'runner information',
    'accessible content',
    'community events'
  ]),
  seoTitle: 'How to Make Running Event Instructions Inclusive and Accessible',
  seoDescription: 'Improve running-event instructions with plain language, meaningful headings, clear dates, text alternatives, non-color status cues, useful errors, and honest support details.',
  coverImageAlt: 'Embroidered linen showing diverse participants and stitched instruction paths through calendar, venue, weather, direction, image, status, and help symbols'
});

const RAW_CONTENT_HTML = `
<p>Event instructions are part of the event experience. A runner may have enough time, interest, and ability to participate yet still be blocked by an ambiguous date, an image-only rule, a missing label, a color-only status, an unexplained acronym, an inaccessible attachment, or a support contact that appears after the deadline.</p>
<p>More inclusive instructions make important decisions easier to find and understand. They describe the event that actually exists, identify available support and known limitations, and give participants a practical way to ask questions. They do not claim that clear writing alone makes every course, activity, platform, venue, or policy accessible to every person.</p>
<blockquote><strong>The instruction principle:</strong> say what the participant needs to know, where they need it, in a form they can perceive and understand, with no hidden condition that appears only after action.</blockquote>

<h2>The inclusive-instructions audit in one minute</h2>
<ol>
  <li><strong>Name the event and task.</strong> Make the page title and main heading specific, then tell the reader whether they are deciding, registering, paying, participating, submitting, correcting, or checking results.</li>
  <li><strong>Put decisive facts first.</strong> Format, eligibility, date, timezone, place or activity window, distance, price, evidence, deadlines, and support should not be buried.</li>
  <li><strong>Use common words.</strong> Explain uncommon terms, abbreviations, platform statuses, and event-specific labels.</li>
  <li><strong>Create a real heading outline.</strong> Use one page title and logically nested sections that describe their contents.</li>
  <li><strong>Do not depend on one sense.</strong> Repeat color, image, audio, map, or motion meaning in text or another suitable form.</li>
  <li><strong>Label actions by outcome.</strong> “Submit payment proof” is more useful than “Click here.” Error messages should name the problem and the next correction.</li>
  <li><strong>State support honestly.</strong> Describe confirmed accessibility information, accommodations, restrictions, and contact paths without promising unsupported features.</li>
  <li><strong>Test the whole journey.</strong> Review the event page, form, confirmation, reminders, proof instructions, corrections, and result notices—not only the poster.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in August 2026 using current World Wide Web Consortium Web Accessibility Initiative guidance, including WCAG 2.2, Writing for Web Accessibility, cognitive accessibility patterns for clear words and understandable content, and page-structure guidance.</p>
<p>It was also checked against current HelloRun public event presentation, event formats and participation modes, registration choices, payment and proof states, structured rejection feedback, status labels, accessible dialogs, focus-visible styles, reduced-motion behavior, responsive layouts, privacy routes, community standards, and organizer communication workflows.</p>
<p>This article is practical content guidance, not an accessibility certification, conformance audit, legal opinion, or promise of a particular accommodation. WCAG conformance requires evaluation of applicable success criteria and implementation, not merely following a writing checklist. Organizers must also assess the physical event, course, venue, vendors, communications, policies, and local obligations with appropriate expertise.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.w3.org/WAI/tips/writing/">W3C WAI: Writing for Web Accessibility</a>, including titles, headings, meaningful links, text alternatives, clear instructions, and concise content.</li>
  <li><a href="https://www.w3.org/WAI/WCAG2/supplemental/patterns/o3p01-clear-words/">W3C WAI: Use Clear Words</a>, used for common language, explained terms, labels, instructions, and error messages.</li>
  <li><a href="https://www.w3.org/WAI/WCAG2/supplemental/objectives/o3-clear-content/">W3C WAI: Use Clear and Understandable Content</a>, used for short blocks, unambiguous content, separation, and literal meaning.</li>
  <li><a href="https://www.w3.org/WAI/tutorials/page-structure/">W3C WAI: Page Structure Tutorial</a>, used for meaningful heading hierarchy and navigation.</li>
  <li><a href="https://www.w3.org/TR/WCAG22/">Web Content Accessibility Guidelines 2.2</a>, used as the current technical standard context rather than a claim that this article performs conformance testing.</li>
  <li>HelloRun's <a href="/community-guidelines">Community Guidelines</a>, <a href="/how-it-works">workflow overview</a>, <a href="/contact">contact page</a>, and current event interfaces.</li>
</ul>
<p>Use the latest authoritative event record and current accessibility guidance. A copied template should be revised whenever the real event, supported accommodation, platform workflow, venue, or participant need changes.</p>

<h2>Define inclusion as fewer avoidable barriers</h2>
<p>Inclusive instructions do not assume one kind of runner, device, connection, language ability, reading speed, vision, hearing, movement, memory, schedule, family structure, or previous race knowledge. They reduce barriers that the organizer can reasonably prevent and make remaining requirements visible before commitment.</p>
<p>Do not describe people as inspirational exceptions or frame access needs as inconvenience. Use neutral, person-respecting language and ask for the information necessary to discuss the actual event. Avoid guessing what a participant can do from a diagnosis, device, age, appearance, or previous result.</p>
<p>Accessibility and eligibility are different questions. A clear event may still have a legitimate published format, course, cutoff, age boundary, evidence rule, or capacity limit. Explain the requirement, purpose where useful, supported alternatives, and contact route. Do not hide a condition to appear welcoming.</p>
<p>A statement such as “Everyone can join” is risky when the event has unlisted technical, venue, age, geographic, payment, course, or timing restrictions. Say who the event is designed for, what participation involves, and which questions need organizer confirmation.</p>

<h2>Create one authoritative instruction path</h2>
<p>Choose one event page or rules page as the source of truth and link reminders back to it. Social posts, posters, group chats, and email can announce an update, but they should not become competing versions of the rules.</p>
<p>On HelloRun, the event page can present format, dates, venue or virtual window, categories, pricing, registration, evidence, rewards, organizer information, and status. Keep those configured fields and the rich description consistent. If a poster says “free” while registration includes a required fee, the communication is inaccessible because the decision itself is unreliable.</p>
<p>Version material changes. State what changed, when, why it matters, and which participants need to act. Do not make readers compare two long documents line by line. The <a href="/blog/participant-communication-timeline-virtual-running-events">participant communication timeline</a> can help place those updates at useful stages.</p>
<p>Use stable links where possible. Avoid sending an image that says “link in bio” when the actual destination is not named. Meaningful link text should identify the result, such as “Read the updated activity and proof rules.”</p>

<h2>Put decision facts before promotional copy</h2>
<p>A runner should not need to read a campaign story before learning whether the event fits. Begin with the event format, participation mode, eligibility, activity or venue, date and timezone, distances or goals, registration boundaries, price, evidence, final deadline, and support route.</p>
<p>Separate facts from atmosphere. A phrase such as “Run anywhere, anytime” may conflict with an activity window, allowed activity types, location limitation, or submission deadline. Replace it with exact facts and keep the motivational line as secondary copy if it remains accurate.</p>
<p>For a hybrid event, explain onsite and virtual paths separately. State how registration mode, dates, timing or proof, result review, leaderboards, rewards, and recognition differ. Do not require participants to infer that one paragraph applies only to one mode.</p>
<p>Place important exclusions near the relevant choice. If a distance is onsite-only, say so beside that distance. If physical-item delivery is limited to specified locations, say so before purchase. A policy link at the bottom does not repair a misleading option label.</p>

<h2>Use common words and explain platform states</h2>
<p>Prefer direct verbs: register, pay, upload, review, correct, approve, reject, and publish. Explain abbreviations and event-specific terms on first use. Avoid metaphors such as “crush the queue” or “unlock glory” when the reader needs an operational instruction.</p>
<p>Use the same word for the same thing. If the event calls a category “10K Onsite,” do not call it “Road Ten,” “physical wave,” and “live division” elsewhere. Consistent labels reduce memory and translation burden.</p>
<p>HelloRun distinguishes recorded, submitted, pending review, approved, and rejected information. A recorded activity can exist outside an official event submission. Submitted evidence awaits review. Approved evidence counts according to the event's configured result model. Rejected evidence does not count as approved progress and may have a correction path. Define these states before participants encounter them.</p>
<p>Avoid “invalid” without an explanation. Use a structured reason and useful detail: what did not meet the published rule, what evidence remains accepted, whether correction or resubmission is available, and the applicable deadline. Do not label unusual evidence as dishonest without review.</p>

<h2>Write dates, times, places, and numbers unambiguously</h2>
<p>Use a named month and year for public dates: “August 27, 2026,” not “08/27/26” or “27/08/26.” Include the day of week when useful. Name the timezone: “7:00 PM Asia/Manila (PHT).” Explain whether a deadline is inclusive and whether the time refers to registration, activity, upload, correction, or publication.</p>
<p>Separate event dates that have different purposes. Registration close, onsite check-in, activity start, activity end, final submission, correction cutoff, result finalization, and recognition publication are not interchangeable.</p>
<p>Write the venue name and a usable address, then add landmarks or transport details as supplemental information. A map image without a text address is insufficient. Do not rely on color-coded route lines without labels, direction, or a text alternative.</p>
<p>State units with values and avoid unexplained conversions. “5 km” is clearer than a bare “5.” For accumulated events, distinguish one activity's distance, approved total, goal, pending distance, and remaining distance.</p>

<h2>Build a meaningful heading outline</h2>
<p>Use one page-level heading for the event title. Organize major topics with second-level headings and subdivisions with third-level headings. Do not choose a heading level because its visual size looks attractive; heading structure communicates relationships and supports navigation.</p>
<p>Useful headings answer questions: “Who can register?”, “When can activities be completed?”, “What proof is accepted?”, and “How are corrections handled?” Generic headings such as “More,” “Details,” and “Important” force the reader to open every section.</p>
<p>Keep paragraphs focused and use lists for parallel items. A list is helpful for accepted proof fields or packet contents, but not every sentence should become a bullet. Tables can clarify repeated comparisons when their headers remain understandable on small screens and to assistive technology.</p>
<p>Do not embed headings as styled text inside an image. The visible website needs semantic headings. HelloRun's public event rendering normalizes rich-description heading levels so the page retains one page-level heading, but organizers should still author a logical H2/H3 outline.</p>

<h2>Make links and actions describe their result</h2>
<p>Write links that make sense out of context: “Read the refund and cancellation policy,” “Review accepted run proof,” or “Contact the organizer about venue access.” Avoid repeated “click here,” raw URLs, and icons with no accessible name.</p>
<p>Buttons should describe the action that occurs: “Save registration,” “Submit proof for review,” or “Request a correction.” Do not label a destructive action “Continue.” Keep the visible label aligned with the accessible name.</p>
<p>Distinguish navigation from submission. A link to instructions should not look identical to the final payment or evidence action without a label. State when an action opens a new page, downloads a file, or leaves the site when that change may surprise users.</p>
<p>Place help consistently. WCAG 2.2 includes consistent-help considerations, and predictable contact placement reduces searching. Repeat the same support destination at the point of difficulty without creating conflicting addresses.</p>

<h2>Give images, posters, and media equivalent meaning</h2>
<p>A poster can support promotion, but it should not be the only source of dates, prices, eligibility, route, or proof rules. Put decisive text in the event page where it can reflow, be selected, translated, searched, and read by assistive technology.</p>
<p>Write a concise text alternative for an informative image that conveys its purpose in context. Decorative images should not create repetitive noise. A complex route, schedule, chart, or category graphic may need a nearby text explanation rather than an enormous filename or generic “event image” description.</p>
<p>Provide captions for meaningful prerecorded speech and important sounds in video, and a transcript or suitable alternative where needed. Do not place essential instructions only in an auto-playing video or disappearing story.</p>
<p>Test text embedded in promotional artwork at small mobile sizes and zoom. Better still, repeat all operational content as real text. Do not claim that an image is accessible merely because it has alt text when the surrounding task, contrast, order, or interaction remains unusable.</p>

<h2>Never use color, position, or shape alone</h2>
<p>If green means approved and red means rejected, include the words “Approved” and “Rejected” and use meaningful status context. Color can reinforce the state but cannot be the only signal. The same applies to chart lines, category wristbands, route choices, and required fields.</p>
<p>Do not write “choose the option on the right” or “follow the blue route” without a stable label. Layout can change on mobile, and colors can be difficult to distinguish. Name the option, direction, landmark, or category.</p>
<p>Icons need a text label or accessible name when they perform an action or convey essential meaning. A question mark, pencil, flag, or trophy can mean different things across contexts. Decorative icons should not be announced repeatedly.</p>
<p>Use sufficient contrast and visible keyboard focus in digital instructions. HelloRun styles many interactive surfaces with focus-visible indicators and provides non-color labels in status presentations; organizers should not undo those cues with low-contrast artwork or color-only rich content.</p>

<h2>Make forms and errors support correction</h2>
<p>Every field needs a persistent label. Placeholder text is not a reliable replacement because it disappears during entry and may have poor contrast. Describe the expected format before submission when the format is not obvious.</p>
<p>Mark required fields in text as well as visually. Group related choices under a clear question. Keep the option label close to its control and ensure selecting it does not unexpectedly submit or change context.</p>
<p>An error should identify the field, explain the problem, and suggest a correction. “Something went wrong” does not help a runner distinguish a temporary server failure from a rejected file type or missing date. Preserve valid entries where safe so the person does not need to repeat unnecessary work.</p>
<p>After submission, provide an understandable result and next step. HelloRun separates confirmation, pending review, approval, rejection, and correction states. Do not send a generic success message if the record still requires payment or evidence review.</p>

<h2>State accessibility information without guessing</h2>
<p>For onsite events, publish confirmed information about transport, drop-off, parking, entrances, surface, width, gradients where known, toilets, changing, quiet or waiting spaces, start procedure, course restrictions, cutoff, support people, guide runners, mobility equipment, and emergency communication. Mark unknown details as unknown and assign someone to obtain them.</p>
<p>For virtual events, describe device, connection, evidence, image, file, route, treadmill, activity type, deadline, and support requirements. Flexibility in time or place does not automatically make an event accessible. Proof upload, GPS expectations, payment methods, and public results can create barriers.</p>
<p>Do not advertise an accommodation until the responsible organizer has confirmed how it works. “Wheelchair friendly,” “sensory friendly,” or “fully accessible” is too broad without evidence. Describe specific supported conditions and invite questions through a monitored route.</p>
<p>Do not make the participant publicly disclose disability or health information to ask a question. Use a private contact path, collect only necessary information, restrict access, and explain how it will be used according to current policy.</p>

<h2>Offer a clear contact and escalation path</h2>
<p>Tell participants what the organizer can answer, which details to include, the expected response channel, and any deadline for accommodation or operational questions. Avoid requiring a social-media account when another supported route exists.</p>
<p>HelloRun provides a general <a href="/contact">contact page</a> and event-specific organizer contact patterns. Use the event's supported path for event questions, and route platform or policy issues appropriately. Do not publish a volunteer's personal number without authorization.</p>
<p>Make urgent and non-urgent paths distinct. Race-day emergencies follow local and event emergency procedures, not a routine inbox. Account corrections, payment questions, proof feedback, venue access, and community reports may have different owners.</p>
<p>Track recurring questions. If several people ask the same thing, improve the authoritative instructions rather than answering privately forever. Remove personal details before turning a support exchange into a public example.</p>

<h2>Test with different reading and interaction conditions</h2>
<p>Read the instructions on a small phone, at high zoom, with images disabled, and using keyboard navigation. Check that content reflows, headings remain meaningful, focus stays visible, dialogs can be exited, and essential actions do not require precise dragging or hover.</p>
<p>Listen with a screen reader or text-to-speech tool as part of testing, while recognizing that tool checks do not replace testing with disabled participants. Verify reading order, link names, form labels, error association, image alternatives, and status announcements.</p>
<p>Ask reviewers unfamiliar with the event to find eligibility, price, date, timezone, mode, distance, evidence, deadline, correction path, accessibility information, and contact. Record where they hesitate or disagree. Familiar team members often fill gaps from memory.</p>
<p>Invite feedback from people with relevant lived experience and compensate expertise where appropriate. Do not expect one participant to represent every disability or access need. Re-test after material changes.</p>

<h2>Three illustrative instruction repairs</h2>
<h3>An image-only event announcement</h3>
<p>The original poster contains the event name, three dates, price, distances, and a tiny QR code. The organizer keeps the poster for promotion but adds all decisive facts as structured text on the event page, writes a meaningful cover alternative, links directly with descriptive text, and names the timezone and purpose of each date.</p>
<p>This improves access to the information; it does not by itself certify the registration flow or event as accessible.</p>

<h3>A color-coded hybrid category list</h3>
<p>The original rules say, “Blue runs onsite; orange runs virtually.” The repair labels every option with mode and distance, separates onsite and virtual mechanics under headings, explains timing versus proof, and repeats status using words and shapes where visual tokens remain.</p>
<p>The organizer also checks that the stored registration mode and confirmation use the same labels.</p>

<h3>An unclear rejection message</h3>
<p>The original message says, “Invalid proof. Try again.” The repair names the applicable published rule, states which field or evidence is missing, avoids accusing the runner, links to accepted-proof guidance, explains whether correction is available, and gives the exact deadline and contact path.</p>
<p>The <a href="/blog/why-a-virtual-run-submission-may-be-rejected">submission rejection guide</a> provides more detail on correction states.</p>

<h2>Copyable event-instruction outline</h2>
<ol>
  <li><strong>Event summary:</strong> Purpose, intended participants, format, and one primary next action.</li>
  <li><strong>Eligibility:</strong> Age, location, mode, capacity, category, and other real boundaries.</li>
  <li><strong>Dates and places:</strong> Named dates, timezone, venue or activity window, and purpose of every deadline.</li>
  <li><strong>Options and cost:</strong> Unique labels, inclusions, optional items, payment, and refund path.</li>
  <li><strong>Participation:</strong> Onsite course or virtual activity mechanics, rules, and supported alternatives.</li>
  <li><strong>Evidence and review:</strong> Required fields, accepted files, privacy boundary, states, and correction.</li>
  <li><strong>Accessibility information:</strong> Confirmed physical and digital details, limitations, and question deadline.</li>
  <li><strong>Results and recognition:</strong> Approved-only behavior, public fields, leaderboard, certificate, or reward conditions.</li>
  <li><strong>Changes and support:</strong> Authoritative update channel, monitored contact, and urgent boundary.</li>
</ol>

<h2>Final inclusive-instructions checklist</h2>
<ul>
  <li>The title, main heading, and first section identify the event and task.</li>
  <li>Format, eligibility, mode, dates, timezone, place, distance, price, evidence, and deadlines are easy to find.</li>
  <li>Words are common, terms are consistent, and uncommon abbreviations are explained.</li>
  <li>Headings form a logical H1/H2/H3 outline and lists or tables have a clear purpose.</li>
  <li>Links and buttons describe their destination or action.</li>
  <li>Images and media have suitable text alternatives; operational facts are not image-only.</li>
  <li>Color, position, sound, shape, and motion are not the only carriers of meaning.</li>
  <li>Forms have labels, formats, required cues, useful errors, and understandable confirmation.</li>
  <li>Accessibility information describes confirmed support and limitations without broad guarantees.</li>
  <li>A private, monitored contact route appears before the participant must commit.</li>
  <li>Mobile, zoom, keyboard, screen-reader, and unfamiliar-reader checks are recorded.</li>
  <li>Material updates identify what changed and keep one authoritative source.</li>
</ul>

<h2>Practical next step</h2>
<p>Choose one current event and ask an unfamiliar reviewer to find ten facts without help: format, eligibility, mode, price, start, end, timezone, evidence, correction, and contact. Repair every fact that takes more than one obvious path to locate or produces two plausible answers.</p>
<p>Then compare the result with the <a href="/blog/how-to-write-clear-virtual-run-rules-participants-can-follow">clear-rules guide</a> and the <a href="/blog/how-schools-and-organizations-can-use-virtual-runs">schools and organizations guide</a>. Record confirmed accommodations separately from open questions. Inclusive communication is not a one-time claim; it is repeated work to remove avoidable barriers while telling the truth about the event.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'The inclusive-instructions audit in one minute',
  'How this guide was prepared',
  'Official and platform sources',
  'Define inclusion as fewer avoidable barriers',
  'Create one authoritative instruction path',
  'Put decision facts before promotional copy',
  'Use common words and explain platform states',
  'Write dates, times, places, and numbers unambiguously',
  'Build a meaningful heading outline',
  'Make links and actions describe their result',
  'Give images, posters, and media equivalent meaning',
  'Never use color, position, or shape alone',
  'Make forms and errors support correction',
  'State accessibility information without guessing',
  'Offer a clear contact and escalation path',
  'Test with different reading and interaction conditions',
  'Three illustrative instruction repairs',
  'Copyable event-instruction outline',
  'Final inclusive-instructions checklist',
  'Practical next step'
]);

const REQUIRED_LINKS = Object.freeze([
  '/community-guidelines',
  '/how-it-works',
  '/contact',
  '/blog/how-schools-and-organizations-can-use-virtual-runs',
  '/blog/how-to-write-clear-virtual-run-rules-participants-can-follow',
  '/blog/participant-communication-timeline-virtual-running-events',
  '/blog/why-a-virtual-run-submission-may-be-rejected'
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
  if (wordCount < 3200) errors.push('article must contain at least 3200 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('cover artwork is required for publication');
  if (/<h1\b/i.test(payload.contentHtml)) errors.push('body must not contain a page-level h1');
  if (/<h[12]>How to Make Running Event Instructions More Inclusive/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/this checklist (?:guarantees|certifies) accessibility|following these steps makes every event accessible/i.test(text)) errors.push('article must not certify accessibility');
  if (/(?:everyone|all people) can participate|one design works for everyone/i.test(text)) errors.push('article must not promise universal participation');
  if (/alt text alone makes (?:an image|the event|a page) accessible|WCAG compliance requires only clear writing/i.test(text)) errors.push('article must not oversimplify accessibility');
  if (/color alone is sufficient|use only (?:red|green|blue) to show status/i.test(text)) errors.push('article must not rely on color alone');
  if (/every venue is wheelchair accessible|virtual events? (?:are|is) automatically accessible/i.test(text)) errors.push('article must not invent accessibility support');
  if (/organizers? should infer (?:ability|access needs) from (?:diagnosis|appearance)|participants? (?:should|must) publicly disclose disability/i.test(text)) errors.push('article must not encourage unsafe assumptions or disclosure');
  if (/all accommodations? (?:are|must be) available|requested accommodations? (?:are|is) guaranteed/i.test(text)) errors.push('article must not guarantee accommodations');
  if (/pending (?:evidence|distance|results?) count(?:s)? as approved|rejected evidence is always fraudulent/i.test(text)) errors.push('article must preserve review states');
  if (!/reviewed in August 2026 using current World Wide Web Consortium/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/not an accessibility certification, conformance audit/i.test(text)) errors.push('article must define conformance boundary');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }
  if (errors.length) throw new Error(`Invalid accessible event instructions payload: ${errors.join('; ')}`);
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
