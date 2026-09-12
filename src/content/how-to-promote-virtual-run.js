'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-promote-a-virtual-run';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Promote a Virtual Run and Get More Participants',
  excerpt: 'Build an honest virtual-run promotion system around a clear offer, conversion-ready event page, useful content, community partners, respectful reminders, and measurable registration learning.',
  category: 'Organizer Guide',
  tags: Object.freeze([
    'how to promote a virtual run',
    'virtual run marketing',
    'promote running event',
    'running event promotion',
    'increase race registration',
    'virtual event promotion',
    'social media marketing',
    'organizer guide'
  ]),
  seoTitle: 'How to Promote a Virtual Run and Get More Participants',
  seoDescription: 'Learn how to promote a virtual run using clear event positioning, social media, participant communication, partnerships, reminders, and post-event content.',
  coverImageAlt: 'Woven textile collage of a Filipino organizer connecting a virtual-run event page with runners and community groups through colorful pathways'
});

const RAW_CONTENT_HTML = `
<p>To promote a virtual run, stop reposting the registration link by itself. Give one specific audience a clear reason to join, send every campaign message to one complete event page, explain the unfamiliar parts before people ask, use trusted community partners, and measure which messages lead to qualified registrations rather than empty reach.</p>
<p>More promotion cannot repair unclear rules, weak value, difficult registration, unsupported promises, or an event the team is not ready to operate. The strongest campaign begins with a credible event and then gives people several useful reasons to inspect it before the deadline.</p>
<blockquote><strong>The acquisition principle:</strong> each promotional message should help the right person move one step—from awareness, to understanding, to fit, to trust, to registration—without hiding the conditions needed for an informed decision.</blockquote>

<h2>Start with a clear reason to join</h2>
<p>“Join our virtual run” describes a format, not a reason. Define the participant outcome or shared purpose in one sentence. It might be a flexible first-event experience, a school community activity, an employee movement programme, a transparent fundraiser, a local club challenge, or a distance goal with meaningful recognition.</p>
<p>The promise must match the event. Beginner offers need readable categories, instructions, proof, and deadlines. Fundraisers should identify the beneficiary, authority, contribution, deductions, and reporting plan. Competitive events should explain ranking, timing, review, and result boundaries.</p>
<p>Use a positioning sentence:</p>
<blockquote><p><strong>For</strong> [specific participant], [event name] is a [format and goal] that helps them [credible benefit] during [window], with [one differentiator], subject to [important eligibility or proof boundary].</p></blockquote>
<p>Remove a benefit you cannot evidence. Do not promise fitness, weight loss, safety, donations, prizes, medals, approval, ranking, or delivery merely because those claims attract clicks. Promotion is the first layer of participant trust.</p>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in September 2026 against current HelloRun event creation, publication, registration, payment-receipt review, communication, activity evidence, result review, and organizer-dashboard behavior. HelloRun is not presented as a complete advertising, attribution, social scheduling, or email-marketing suite.</p>
<p>External guidance comes from the Philippine National Privacy Commission on consent and direct marketing, the US Federal Trade Commission on endorsements and material connections, W3C Web Accessibility Initiative guidance for image alternatives, and Google Analytics documentation explaining tagged campaign URLs. These are sources for general principles or specific tools, not universal legal instructions for every organizer, platform, audience, or jurisdiction.</p>
<p>This article is operational and editorial guidance, not legal, advertising, tax, fundraising, employment, educational, accessibility-certification, or data-protection advice. Confirm the requirements that apply to the event, organization, channels, partners, participants, and locations involved.</p>

<h2>Define the target participant</h2>
<p>An event marketed to “everyone” usually speaks clearly to nobody. Choose a primary audience and describe the situation that makes the event relevant. Useful distinctions include:</p>
<ul>
  <li>first-time virtual-run participants who need the format explained;</li>
  <li>walkers or run-walk participants, when the event actually accepts them;</li>
  <li>experienced runners seeking a flexible distance opportunity;</li>
  <li>employees, students, alumni, parents, or school communities;</li>
  <li>members of a club, barangay, association, advocacy, or faith community;</li>
  <li>supporters of a clearly identified cause;</li>
  <li>participants in a defined Philippine city, province, or nationwide online community.</li>
</ul>
<p>For each audience, record motivation, hesitation, trusted channels, accessible format needs, likely questions, registration constraints, and what would disqualify the event. A beginner may need proof that walking is permitted. An employee may need privacy clarity. A fundraiser may need transparent beneficiary information. A competitive runner may need exact result rules.</p>

<h2>Make the event page conversion-ready</h2>
<p>The event page is the campaign's source of truth. Social posts, partner messages, posters, emails, and chats should summarize and link to it. Before promotion, open the page as a participant on a phone and confirm that a person can answer:</p>
<ul>
  <li>Who organizes this event, and why should they be trusted?</li>
  <li>Who may join, and what categories or goals exist?</li>
  <li>Is completion one activity or accumulated across several activities?</li>
  <li>Which activity types, routes, treadmills, or locations are accepted?</li>
  <li>When do registration, activity, and submission open and close, in which timezone?</li>
  <li>Is entry free or paid, what is included, and how does payment review work?</li>
  <li>What proof is required, how is it reviewed, and what can be corrected?</li>
  <li>How are public results, leaderboards, certificates, badges, rewards, or delivery handled?</li>
  <li>What personal information is collected and where can participants get support?</li>
</ul>
<p>Use the <a href="/blog/how-to-write-clear-virtual-run-rules-participants-can-follow">clear event-rules guide</a> before buying promotion. The <a href="/blog/how-to-design-fair-distance-categories-and-challenge-goals">distance-category guide</a> helps ensure that the offer gives different participants meaningful choices without misleading labels.</p>

<h2>Remove registration friction before increasing traffic</h2>
<p>Walk through the actual registration using a test account and supported device. Verify the public link, account and email requirements, category choices, waiver or acknowledgement, custom questions, free or paid path, receipt instructions where applicable, confirmation state, and return route. A broken or confusing step wastes every campaign click sent to it.</p>
<p>Paid HelloRun registrations can involve external transfer followed by receipt upload and organizer review; HelloRun does not directly process that external transfer. Promotion should not describe “instant confirmation” when review remains necessary. State what submitted, pending, paid, approved, and correction-required mean.</p>
<p>Test on a realistic mobile connection. Compress media, link directly, and keep essential information in text rather than image-only copy. A person should not need to ask “How do I join?” after reaching the page.</p>

<h2>Create a promotion timeline</h2>
<p>Work backward from registration close, while leaving enough time for people to understand the event and prepare. The existing <a href="/blog/participant-communication-timeline-virtual-running-events">participant communication timeline</a> focuses on registered participants through payment, activity, proof, review, and closeout. This promotion timeline focuses on acquiring suitable participants before and during registration.</p>
<h3>Readiness phase</h3>
<p>Finalize the event page, rules, creative system, audience, partner kit, tracking convention, support answers, and approval owners. Do not announce a date that operations cannot support.</p>
<h3>Early awareness phase</h3>
<p>Introduce the purpose and intended participant. Use educational content that makes the problem or goal recognizable. Build interest before every post asks for registration.</p>
<h3>Registration launch</h3>
<p>Publish the complete offer: who, why, format, dates, price or free status, headline inclusions, key boundaries, and event link. Give partners an approved version at the same time.</p>
<h3>Decision-support phase</h3>
<p>Answer one real hesitation per message: how virtual participation works, category choice, walking eligibility, proof, schedule flexibility, payment review, privacy, or recognition. Use live questions to improve the event page, not only private replies.</p>
<h3>Closing phase</h3>
<p>Use truthful deadline reminders for people who still have time to decide and complete registration. Do not invent capacity, price increases, “last slots,” or social proof.</p>
<h3>Activity and closeout phase</h3>
<p>Shift from acquisition to participant success, then document reviewed outcomes and lessons for future trust. Registration pressure after closing should not replace support for people already joined.</p>

<h2>Use social media before registration closes</h2>
<p>A social calendar needs varied jobs, not endless poster variants. Rotate content that serves different decision stages:</p>
<ul>
  <li><strong>Purpose:</strong> why the event exists and who it is designed for.</li>
  <li><strong>Format education:</strong> what a virtual run is and how this event works.</li>
  <li><strong>Fit:</strong> category, activity type, schedule, and preparation prompts.</li>
  <li><strong>Trust:</strong> organizer identity, beneficiary detail, rules, review, support, and fulfilment plan.</li>
  <li><strong>Demonstration:</strong> a truthful registration, tracking, or proof walkthrough without exposing real private records.</li>
  <li><strong>Story:</strong> a participant or partner experience used with permission and appropriate disclosure.</li>
  <li><strong>Question:</strong> one common concern answered publicly and added to the event page when useful.</li>
  <li><strong>Deadline:</strong> a factual date, time, timezone, and direct link.</li>
</ul>
<p>Write the decisive point in the post instead of relying on an image to carry every word. Add an appropriate text alternative for informative images, captions or transcripts for relevant audio and video, readable contrast, and a meaningful link label. W3C guidance explains that informative images need text alternatives conveying their essential information.</p>

<h2>Explain how the virtual run works</h2>
<p>Many potential participants do not reject the event; they simply do not understand the workflow. Give them a compact sequence:</p>
<ol>
  <li>Read the event page and choose an eligible category.</li>
  <li>Register and complete any applicable payment-review step.</li>
  <li>Prepare a permitted activity and recording method.</li>
  <li>Complete the activity within the published window.</li>
  <li>Submit accepted evidence before the deadline.</li>
  <li>Wait for the applicable review and correct an eligible issue when offered.</li>
  <li>Receive configured results or recognition only after the required state is reached.</li>
</ol>
<p>Link to <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">What Is a Virtual Run?</a> for the broader format. Do not advertise “run anytime, anywhere” when date, place, route, activity, evidence, or safety constraints apply.</p>
<p>A short demonstration can show fictional or dedicated test data. Do not record a real participant's account, receipt, route, contact details, proof, or rejection screen for promotional content without an appropriate basis and permission.</p>

<h2>Use participant stories and proof responsibly</h2>
<p>A story can help someone imagine the experience, but it must remain honest, voluntary, and bounded. Agree on content, channels, duration, and identifying details without turning one completion into a guaranteed transformation.</p>
<p>Do not condition ordinary support, results, certificates, refunds, rewards, or future eligibility on providing a positive testimonial. Do not write a quote and ask someone to attach their name. Do not present staff, partners, paid ambassadors, gifted entrants, or beneficiaries as independent customers when that relationship would matter to the audience.</p>
<p>FTC endorsement guidance is a US source, so applicable Philippine and other requirements still need review. Its useful general principle is that endorsements should reflect honest experience and material relationships should be disclosed clearly near the endorsement. Use visible, understandable disclosure in the language of the promotion; do not hide it in a profile or distant terms page.</p>
<p>Proof screenshots are evidence, not a free content library. Use fictional examples or obtain appropriate permission and minimize exposed routes, routines, identities, and accounts.</p>

<h2>Partner with schools, offices, clubs, and communities</h2>
<p>Partnership works when the event serves the community and the community can explain the fit. Start with a small list whose mission, members, schedule, and safeguards align. The <a href="/blog/how-schools-and-organizations-can-use-virtual-runs">schools and organizations guide</a> covers internal event design and governance; promotion still requires an authorized contact and accurate public offer.</p>
<p>Give each partner a compact kit:</p>
<ul>
  <li>one-paragraph event description and intended audience;</li>
  <li>complete event link and exact registration deadline;</li>
  <li>approved square and landscape creative with alternative text;</li>
  <li>three short accurate caption options;</li>
  <li>key eligibility, price, beneficiary, activity, and evidence boundaries;</li>
  <li>relationship or sponsorship disclosure when applicable;</li>
  <li>support contact and a date after which old creative should not be reposted;</li>
  <li>a consistent source code or tagged link only when the measurement setup and privacy notice support it.</li>
</ul>
<p>Ask partners to adapt tone, not facts. A school should not promise student credit the organizer cannot authorize. An office should not imply mandatory participation when it is voluntary. A club should not describe an unofficial result as certified.</p>

<h2>Use reminders without spamming</h2>
<p>A reminder is useful when expected, timely, and clear about why it was sent. Repeated unsolicited contact damages trust and can create privacy, marketing, employment, school, or platform issues.</p>
<p>Do not scrape runners from public result lists, groups, event pages, or social profiles. Do not purchase contact lists. Do not add partner members to a marketing database merely because a community shared one event. Give people a clear way to object, unsubscribe, or change relevant preferences, and honor it.</p>
<p>The Philippine National Privacy Commission's consent guidance explains that direct marketing can require consent in some circumstances and that legitimate-interest reliance requires assessment. If consent is the basis and it is withdrawn, the guidance says it cannot simply be replaced with legitimate interest to continue the same processing. Obtain organization-specific advice rather than treating this paragraph as a legal formula.</p>
<p>Separate necessary payment or proof messages from promotion of another event. Segment reminders so registered people stop receiving “join now” messages and finishers avoid irrelevant upload pressure.</p>

<h2>Make registration simple</h2>
<p>Every campaign action should lead to one primary event page, not a chain of bio links, private-message keywords, unlabelled forms, and outdated posters. Use a direct descriptive call to action such as “Read the 10K rules and register” rather than “Click here.”</p>
<p>Keep choices understandable. Too many nearly identical categories, packages, prices, add-ons, and deadlines can create hesitation or errors. Where choices are necessary, name the difference and show the total cost and important conditions before commitment.</p>

<h2>Promote during the activity period</h2>
<p>Once registration closes or the event begins, promotion should support the experience and preserve trust. Depending on the event, appropriate public content may include:</p>
<ul>
  <li>a factual activity-window opening notice;</li>
  <li>route, weather, evidence, or support guidance already grounded in the rules;</li>
  <li>an anonymized aggregate milestone that is accurate and useful;</li>
  <li>voluntary participant stories with permission and disclosure;</li>
  <li>clarification of a shared question or material change;</li>
  <li>a transparent last registration reminder only while registration genuinely remains open.</li>
</ul>
<p>Do not publicly shame non-starters, pending participants, slow participants, rejected evidence, or people who withdraw. Do not imply that pending submissions are approved finishers. Avoid real-time location disclosure that creates privacy or safety risk.</p>

<h2>Turn finishers into future participants</h2>
<p>Retention begins by completing the current promise. Finish review fairly, communicate provisional and final states, deliver configured recognition, resolve support, explain delays, and close the event. A discount for the next event cannot substitute for an unresolved certificate, reward, refund, correction, or privacy request.</p>
<p>After closeout, ask why someone joined, which page detail mattered, what caused hesitation, and where registration or proof was confusing. Request separate permission before marketing a response; service feedback is not automatically a testimonial license.</p>

<h2>Measure which channels worked</h2>
<p>Reach, views, likes, comments, and follower growth can describe exposure; they do not establish registrations, qualified participants, successful completion, or trust. Define the funnel before launch:</p>
<ul>
  <li><strong>Awareness:</strong> relevant people exposed to the message where the channel can measure it.</li>
  <li><strong>Interest:</strong> event-page visits or meaningful information requests.</li>
  <li><strong>Decision:</strong> registration starts where available.</li>
  <li><strong>Registration:</strong> completed registration, separated from payment-pending or correction states.</li>
  <li><strong>Activation:</strong> eligible participants who begin the event workflow.</li>
  <li><strong>Completion:</strong> approved results or progress under the event rules.</li>
  <li><strong>Retention:</strong> participants who voluntarily return or consent to relevant future communication.</li>
</ul>
<p>HelloRun surfaces event and registration information but is not a complete cross-channel attribution platform. If using separate analytics, document the processing and verify its configuration and notices.</p>
<p>Google Analytics documents UTM parameters such as source, medium, campaign, and content for distinguishing referral links and creative. Tagged URLs only produce useful attribution when the destination analytics is configured, naming remains consistent, privacy obligations are addressed, and links are tested. Do not append tags and then claim measurement that was never collected.</p>
<p>Log date, audience, channel, message, link, cost, and outcome. Compare effort with qualified registrations rather than impressions, and remember that participants may see several messages before registering.</p>

<h2>A practical low-budget promotion plan</h2>
<ol>
  <li><strong>Week 1:</strong> finalize the offer and page; recruit three to five aligned partners; publish the purpose and audience.</li>
  <li><strong>Week 2:</strong> launch registration; demonstrate the format; answer the largest objection; give partners approved assets.</li>
  <li><strong>Week 3:</strong> publish one truthful story, one category or proof explainer, and one organizer-trust post; update the page from recurring questions.</li>
  <li><strong>Final week:</strong> send proportionate consent-aware reminders; state the exact deadline and timezone; stop using outdated creative.</li>
  <li><strong>Activity period:</strong> support participants, share only appropriate momentum, and keep review and safety boundaries accurate.</li>
  <li><strong>Closeout:</strong> fulfil the current event, collect feedback, document channel lessons, and request separate permission for future stories.</li>
</ol>

<h2>Promotion mistakes to avoid</h2>
<ul>
  <li>Posting the same registration graphic every day without new decision support.</li>
  <li>Buying followers, engagement, reviews, registrations, or contact lists.</li>
  <li>Creating false countdowns, capacity, price changes, demand, or “almost sold out” claims.</li>
  <li>Using participant photos, quotes, results, routes, or proof without an appropriate basis.</li>
  <li>Hiding paid, gifted, employment, beneficiary, or partner relationships.</li>
  <li>Promising guaranteed fitness, fundraising, approval, ranking, recognition, or delivery.</li>
  <li>Letting partner captions contradict the event page.</li>
  <li>Counting pending registrations or evidence as completed outcomes.</li>
</ul>

<h2>Frequently asked questions</h2>
<h3>How do I get more participants for a virtual run?</h3>
<p>Improve fit and trust before reach: define one audience, publish a complete event page, answer barriers through varied content, work with aligned communities, simplify registration, and measure qualified registrations.</p>
<h3>Should I pay for social advertising?</h3>
<p>Only after the event page, audience, registration path, measurement, privacy review, support capacity, and organic message are credible. Paid reach magnifies the current system; it does not repair it.</p>
<h3>Should I use influencers?</h3>
<p>Use a genuinely aligned person who can speak honestly, follow channel rules, and disclose material relationships clearly. A large follower count does not establish audience fit or trustworthy registrations.</p>
<h3>Can I reuse participant proof in an advertisement?</h3>
<p>Do not assume operational submission authorizes marketing use. Consider the original notice, purpose, lawful basis, permission, private fields, route exposure, and event commitments before any reuse.</p>
<h3>Does HelloRun guarantee more registrations?</h3>
<p>No. HelloRun can support event publication and participation workflows, but registration depends on the offer, audience, trust, timing, promotion, operations, competition, and other factors.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://privacy.gov.ph/wp-content/uploads/2023/11/NPC-Circular-No.-2023-04_Guidelines-on-Consent_07Nov2023.pdf">Philippine National Privacy Commission: Guidelines on Consent</a></li>
  <li><a href="https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking">US FTC: Endorsement Guides Questions and Answers</a></li>
  <li><a href="https://www.w3.org/WAI/tutorials/images/">W3C WAI: Images Tutorial</a></li>
  <li><a href="https://support.google.com/analytics/answer/10917952?hl=en">Google Analytics: Collect Campaign Data with Custom URLs</a></li>
</ul>

<h2>Create the event page at the center of your campaign</h2>
<p><a href="/organizer/create-event">Create your next HelloRun event</a>, complete its rules and readiness checks, and publish only when the page accurately represents the experience your promotion promises. Use that one event page as the durable destination for every approved campaign message.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Start with a clear reason to join',
  'How this guide was prepared',
  'Define the target participant',
  'Make the event page conversion-ready',
  'Remove registration friction before increasing traffic',
  'Create a promotion timeline',
  'Use social media before registration closes',
  'Explain how the virtual run works',
  'Use participant stories and proof responsibly',
  'Partner with schools, offices, clubs, and communities',
  'Use reminders without spamming',
  'Make registration simple',
  'Promote during the activity period',
  'Turn finishers into future participants',
  'Measure which channels worked',
  'A practical low-budget promotion plan',
  'Promotion mistakes to avoid',
  'Frequently asked questions',
  'Official and platform sources',
  'Create the event page at the center of your campaign'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/organizer/create-event"',
  'href="/blog/participant-communication-timeline-virtual-running-events"',
  'href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers"',
  'href="/blog/how-to-write-clear-virtual-run-rules-participants-can-follow"',
  'href="/blog/how-to-design-fair-distance-categories-and-challenge-goals"',
  'href="/blog/how-schools-and-organizations-can-use-virtual-runs"'
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
  if (/<h[12]>How to Promote a Virtual Run and Get More Participants<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/this strategy guarantees? (?:more )?(?:registrations|participants|signups)|promotion guarantees? (?:more )?(?:registrations|participants)/i.test(text)) errors.push('article must not guarantee participant acquisition');
  if (/buying (?:followers|engagement|reviews|registrations) is recommended|buy followers to grow|purchase contact lists to promote/i.test(text)) errors.push('article must not endorse artificial promotion');
  if (/fake scarcity increases registrations|claim almost sold out even when (?:it is not|capacity is available)|fabricate demand to convert/i.test(text)) errors.push('article must not endorse false urgency');
  if (/scrape emails for promotion|harvest phone numbers for marketing|ignore unsubscribe requests/i.test(text)) errors.push('article must not endorse spam or unlawful contact collection');
  if (/hide (?:a )?(?:paid|sponsored|gifted) relationship|no need to disclose sponsorship/i.test(text)) errors.push('article must not hide material relationships');
  if (/publish (?:private )?(?:proof|receipts|routes|medical details) without permission|participant proof is free marketing content/i.test(text)) errors.push('article must not endorse private evidence reuse');
  if (/HelloRun (?:guarantees|automatically provides) (?:registrations|participants|UTM attribution|cross-channel attribution)/i.test(text)) errors.push('article must not overstate HelloRun acquisition features');
  if (!/To promote a virtual run, stop reposting the registration link by itself/i.test(text)) errors.push('article must answer intent immediately');
  if (!/participant communication timeline focuses on registered participants/i.test(text)) errors.push('article must distinguish participant communication');
  if (!/reviewed in September 2026 against current HelloRun event creation/i.test(text)) errors.push('article must disclose methodology and date');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }
  if (errors.length) throw new Error(`Invalid virtual-run promotion payload: ${errors.join('; ')}`);
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
