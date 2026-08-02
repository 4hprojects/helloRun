'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'what-to-bring-race-day-onsite-hybrid-events';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'What to Bring on Race Day: A Checklist for On-Site and Hybrid Events',
  excerpt: 'Build a race-day kit from the event’s real venue, check-in, weather, course, support, and hybrid-mode instructions—not a universal packing list.',
  category: 'Race Tips',
  tags: Object.freeze([
    'race day checklist',
    'onsite running event',
    'hybrid running event',
    'runner packing list',
    'event check in',
    'race day weather',
    'running essentials',
    'race preparation'
  ]),
  seoTitle: 'What to Bring on Race Day: On-Site and Hybrid Event Checklist',
  seoDescription: 'Prepare for an on-site or hybrid running event with a flexible checklist for confirmation, transport, clothing, weather, hydration, course rules, and emergencies.',
  coverImageAlt: 'Colorful ceramic mosaic of a venue gate, unnumbered bib, running shoes, light layer, cap, bottle, snack pouch, essentials bag, weather, and finish arch'
});

const RAW_CONTENT_HTML = `
<p>A useful race-day kit is built from the selected event, not from a photograph of someone else's gear. Venue access, check-in, packet collection, course surface, distance, weather, baggage rules, aid stations, timing, accessibility, transport, and hybrid participation all change what is useful and what is prohibited.</p>
<p>This guide helps a runner turn published instructions into a compact personal checklist. It does not declare that every participant needs the same clothing, food, fluid, device, identification, or equipment. Bring what the event requires and what is appropriate for your circumstances; leave out items that create clutter, conflict with rules, or have no clear purpose.</p>
<blockquote><strong>The race-day packing principle:</strong> every item should answer one real need—entry, movement, weather, comfort, communication, or recovery—without replacing event instructions or a safety decision.</blockquote>

<h2>The race-day checklist in one minute</h2>
<ol>
  <li><strong>Confirm the mode.</strong> Check that the registration says onsite rather than virtual when the event is hybrid.</li>
  <li><strong>Save the authoritative instructions.</strong> Record the venue, arrival window, start time, timezone, check-in or packet steps, category, course rules, and organizer contact path.</li>
  <li><strong>Choose transport and arrival margins.</strong> Include travel, parking or transit, walking to the venue, queues, toilets, baggage, and the organizer's closing times.</li>
  <li><strong>Wear familiar, suitable clothing.</strong> Match the likely surface and conditions without experimenting with untested race-day products.</li>
  <li><strong>Pack only permitted essentials.</strong> Confirmation, any required identification, assigned bib or collection details, appropriate fluid or food, weather layer, personal necessities, and a small secure carrier where allowed.</li>
  <li><strong>Check current conditions.</strong> Review PAGASA products, local authority instructions, venue notices, and organizer updates again close to departure.</li>
  <li><strong>Know the support plan.</strong> Locate event help, medical or emergency points if published, exits, transport home, and a trusted contact where appropriate.</li>
  <li><strong>Keep withdrawal available.</strong> A packed bag does not require starting or finishing when illness, symptoms, weather, venue conditions, or official instructions make participation unsuitable.</li>
</ol>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in August 2026 using current Philippine Atmospheric, Geophysical and Astronomical Services Administration products and warning descriptions, current US Centers for Disease Control and Prevention heat guidance for athletes, and Road Runners Club of America safe-event guidance as general event context.</p>
<p>It was also checked against current HelloRun event types, allowed participation modes, venue fields, registration records, confirmation codes, onsite check-in, bib assignment, onsite-result operations, virtual proof workflows, event details, and runner-facing status behavior. Those platform capabilities are conditional: an event being onsite or hybrid does not mean it uses every available bib, QR, timing, baggage, hydration, medical, photography, or check-in feature.</p>
<p>This article is general educational information, not individualized medical, nutrition, accessibility, security, transport, weather, or emergency advice. The event's published instructions, venue rules, current local authority directions, qualified personal guidance, and direct observations take precedence. No packing list can guarantee entry, comfort, safety, performance, or completion.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://www.pagasa.dost.gov.ph/products-and-services">PAGASA Products and Services</a>, including public forecasts, tropical-cyclone warnings, rainfall warnings, thunderstorm alerts, and flood information.</li>
  <li><a href="https://www.pagasa.dost.gov.ph/learnings/legend">PAGASA warning legend</a>, used to distinguish current advisories, watches, warnings, and information.</li>
  <li><a href="https://www.cdc.gov/heat-health/risk-factors/heat-and-athletes.html">CDC: Heat and Athletes</a>, used for conservative heat-preparation and stop-activity boundaries rather than a personal hydration prescription.</li>
  <li><a href="https://www.rrca.org/education/event-directors/safe-event-guidelines/">RRCA Safe Event Guidelines</a>, used as non-regulatory context for event-specific planning, communications, accessibility, and emergency readiness.</li>
  <li>Current HelloRun <a href="/events">event pages</a>, <a href="/how-it-works">workflow overview</a>, and <a href="/faq">FAQ</a>.</li>
</ul>
<p>Check the current source and the selected event rather than relying on a saved copy from another race. A later organizer announcement should be verified through the event's authoritative channel, especially when it changes venue access, time, weather operations, or required items.</p>

<h2>Start with the event, not the bag</h2>
<p>Open the specific event page and registration record. Confirm the event title, date, venue name and address, participation mode, selected distance or category, registration and payment status where applicable, and any confirmation code or organizer-issued instructions. A similar event name, poster, social post, or old email is not enough.</p>
<p>HelloRun supports virtual, onsite, and hybrid event types. A hybrid event can offer virtual and onsite participation, and the runner's registration stores a selected mode. Do not assume that registering for the hybrid event automatically creates access to both experiences. Check the recorded mode and contact the organizer through the supported path if it is wrong or unclear.</p>
<p>Read the entire onsite section. Look for packet or bib collection, identification, waiver, arrival, start wave, cutoff, baggage, course, aid, headphone, stroller, animal, companion, photography, accessibility, results, reward, and post-event instructions. Absence of a detail is not permission; ask before packing an item that could affect access or other participants.</p>
<p>Save essential details for offline use without copying unnecessary personal information. A concise note can include the official venue, arrival window, category, emergency update channel, return transport, and support contact. Do not depend on finding an old social message while standing in a crowded check-in area.</p>

<h2>Confirm mode, category, and entry status</h2>
<p>For a hybrid event, identify which parts are shared and which are mode-specific. The onsite runner may follow a fixed venue, course, start, check-in, and result process. The virtual runner may use an activity window, permitted route or indoor option, and proof submission. Rewards and leaderboards may also differ according to event configuration and rules.</p>
<p>Check the selected distance or category exactly as registered. A bib color, start wave, course turn, cutoff, reward, and result classification may depend on it. Do not switch distance because another queue looks shorter or because a friend registered elsewhere unless the organizer has approved the change through its procedure.</p>
<p>Check payment status for a paid event and resolve rejected or incomplete evidence before traveling when possible. Bring only the confirmation or payment material the organizer actually requests. A full bank statement or unrelated financial information is not an appropriate substitute for a bounded receipt.</p>
<p>An event may assign bibs, use check-in records, or record onsite results through HelloRun-compatible operations, but not every event will do so. Do not invent a QR-code requirement or print a homemade bib because the platform can support those functions. Follow the event's actual collection and issuance instructions.</p>

<h2>Build a door-to-start timeline</h2>
<p>Race time is not arrival time. Work backward from the organizer's check-in closure or start-wave instruction. Include travel, transfer or parking, walking from the drop-off point, security, queues, packet collection, toilets, baggage deposit, meeting support people, and reaching the correct start area.</p>
<p>Use current transit, road, parking, and venue information. A parking space from last year's edition may now be restricted. A route shown in a general map may be closed for the event. Confirm drop-off rules and road closures through organizers or local authorities, not by asking a driver to stop in an unsafe place.</p>
<p>Add a reasonable logistical margin without turning arrival into hours of unnecessary exposure. The suitable margin depends on event scale, venue layout, collection status, mobility, transport reliability, weather, and organizer instructions. There is no universal “arrive exactly 60 minutes early” rule.</p>
<p>Plan the journey home too. Consider the finish location, expected crowd, public transport hours, parking exit, pickup point, communication if a phone loses power, and an alternative if weather or event operations change. Do not drive or travel in a condition that makes doing so unsafe.</p>

<h2>Choose familiar clothing for the real conditions</h2>
<p>Start with clothing and footwear already familiar during comparable activity. Race day is usually a poor time to discover that a new shoe, seam, sock, undergarment, pack, or fastening causes discomfort. Familiarity does not guarantee comfort, but it removes one avoidable uncertainty.</p>
<p>Match footwear to the published surface and access conditions. A paved road, track, trail, grass field, stadium, muddy approach, or mixed course may create different needs. Do not assume “running shoes” means one design is suitable for every route or runner.</p>
<p>Choose layers based on current conditions, exposure before and after the activity, baggage rules, and personal needs. A light rain layer, dry change, hat, or sun protection may be useful for one event and impractical for another. Avoid loose items that could obstruct movement or violate course rules.</p>
<p>If the event provides a bib, learn the attachment and placement rule. Do not fold, cover, swap, duplicate, or alter timing components unless instructed. If you use pins, clips, a belt, or another holder, confirm it is permitted and test it before the event.</p>

<h2>Use a purpose-based packing method</h2>
<p>Instead of copying a long universal list, create six small groups:</p>
<ul>
  <li><strong>Entry:</strong> the required confirmation, permitted identification, assigned bib or packet details, and any explicit waiver or access item.</li>
  <li><strong>Movement:</strong> familiar clothing, footwear, and any personally appropriate support or accessibility equipment permitted by the event.</li>
  <li><strong>Weather:</strong> suitable protection for the current forecast and event plan, without carrying items the venue prohibits.</li>
  <li><strong>Fuel and fluid:</strong> familiar options appropriate to the event, personal needs, and published aid arrangements, without universal quantities.</li>
  <li><strong>Communication:</strong> a charged device if useful, emergency or trusted-contact information, transport details, and the event update channel.</li>
  <li><strong>Afterward:</strong> transport home, a dry or comfortable layer if useful, required medication managed under individual guidance, and recovery items with a real purpose.</li>
</ul>
<p>Every item needs a planned location during the activity. “I might need it” is incomplete if it will bounce, fall, become wet, interfere with a bib, or be abandoned on the course. Use only permitted baggage and secure essentials.</p>
<p>Leave valuables and unnecessary documents at home where practical. The presence of a baggage area does not guarantee that every item is accepted, insured, supervised continuously, or recoverable. Read the event's baggage responsibility and prohibited-item information.</p>

<h2>Handle confirmation and identification carefully</h2>
<p>Bring the form of confirmation the organizer specifies: an in-app record, email, code, printed copy, assigned bib, or other event credential. Do not publish a confirmation code or QR image in a public pre-race photo when it can be used for access or lookup.</p>
<p>If identification is required, bring only an accepted form and keep it secure. Do not carry extra identity documents “just in case” without a reason. If the event's requirement is unclear or creates an accessibility or privacy issue, contact the organizer before race day.</p>
<p>Keep emergency information in a form appropriate to personal privacy and local practice. This might be an emergency-contact card, a device feature, or event profile information when supported. A public bib does not need to display a home address, health history, or unrelated account detail.</p>
<p>For a participant under the applicable age threshold, the event's guardian, consent, collection, and accompaniment rules control. This guide does not establish eligibility or substitute for the organizer's safeguarding process.</p>

<h2>Plan fluid and food without universal formulas</h2>
<p>Read the aid-station and outside-container rules. Determine whether the event supplies fluid, where it is available, whether cups or refill points are used, and whether a personal bottle, vest, or food is permitted. Services can change, so check final instructions.</p>
<p>Use familiar choices that fit personal guidance and experience. This article does not prescribe a fixed amount of water, electrolytes, sodium, carbohydrate, caffeine, or food. Needs vary with duration, conditions, body, effort, health, medications, acclimatization, aid availability, and professional advice.</p>
<p>Do not try a new supplement, concentrated drink, gel, or unfamiliar meal simply because it appears in another runner's checklist. Packaging claims and popularity are not evidence of individual suitability. If a medical condition or medication affects fluid, food, heat, or exertion decisions, follow qualified individualized guidance.</p>
<p>Keep waste contained and use event disposal points. Do not drop wrappers, cups, or bottles where they can obstruct runners, enter drains or waterways, or create work for local communities.</p>

<h2>Check PAGASA and official event updates</h2>
<p>Review PAGASA's current public forecast and relevant tropical cyclone, rainfall, thunderstorm, flood, and heat information for the actual venue and travel route. A screenshot taken several days earlier is not a current warning. Understand whether the product is information, a watch, an advisory, or a warning.</p>
<p>Weather affects more than clothing. It can change transport, venue access, road closures, start time, course, aid, baggage, visibility, surface, and the organizer's decision to delay, modify, or cancel. Monitor the event's official channel rather than relying on forwarded messages.</p>
<p>The CDC notes increased heat-related risk for people exercising on hot days and advises stopping activity and reaching a cool place if faint or weak. Use the <a href="/blog/how-to-run-safely-during-hot-and-humid-weather">hot-and-humid weather guide</a> for fuller decision boundaries. Do not use a hat, bottle, or cooling item as proof that it is safe to continue.</p>
<p>For lightning, flooding, severe rain, damaging wind, or another hazard, follow PAGASA, local authority, venue, and organizer instructions. Do not enter a closed course, cross floodwater, shelter under an unsafe structure, or continue because the registration was paid.</p>

<h2>Prepare for course rules and shared space</h2>
<p>Read the course description, route markings, laps, turns, surfaces, width, elevation context, cutoff, aid, toilets, start procedure, finish procedure, and any crossing instructions. A familiar city street can operate differently under event control.</p>
<p>Position yourself according to organizer guidance and expected movement where possible. Do not push toward a faster wave for a better photograph or early space. Allow others to pass safely, signal substantial changes of direction where appropriate, and follow marshals and authorized officials.</p>
<p>Headphones, speakers, strollers, wheelchairs, mobility equipment, guide runners, animals, flags, costumes, and poles may have event-specific rules. Do not infer acceptance from another event. Ask early about accommodations or assisted participation so the organizer can explain the supported arrangement.</p>
<p>Keep environmental awareness. A watch or phone can support timing or communication, but it should not pull attention away from people, vehicles, surface changes, barriers, and directions. Stop in a safe place before changing settings or reading a long message.</p>

<h2>Understand timing, proof, and results</h2>
<p>An onsite result may be recorded through a bib, timing provider, manual process, organizer entry, or another published method. A hybrid event may separately handle virtual activity proof. Do not submit an onsite activity through the virtual workflow unless the event explicitly instructs that process.</p>
<p>HelloRun distinguishes participation mode and supports onsite check-in, bib assignment, and onsite results as organizer operations. Availability and use depend on the event. A recorded onsite result may still need organizer review or approval under the configured process before it becomes official platform progress or recognition.</p>
<p>Keep any device record as a personal record unless the event asks for it. A watch distance can differ from a measured course because of satellite behavior, line choice, turns, crowding, or device settings. Do not interrupt the shared course or dispute a result in the finish chute based only on a watch display.</p>
<p>Use the published correction or support path after reaching a safe, calm place. Keep recorded, submitted, pending, approved, and rejected states distinct. Platform approval concerns the event record; it does not certify physical readiness or guarantee an external qualifying result.</p>

<h2>Carry communication and privacy essentials</h2>
<p>If a phone is part of the plan, charge it and reduce unnecessary battery use. Save the organizer channel, trusted contact, venue, and return transport. Also plan for weak service, rain exposure, or a depleted device. A phone is helpful but not a substitute for following the course or seeking nearby assistance.</p>
<p>Share only necessary information. Public pre-race images can expose confirmation codes, bib details, travel timing, vehicle plates, children, other participants, exact accommodation, or valuables. Activity maps can reveal home or hotel locations. Review the whole frame and privacy settings before posting.</p>
<p>Ask before photographing or tagging another person, especially in changing, medical, prayer, breastfeeding, baggage, or family areas. Follow event photography and media instructions. Do not photograph someone receiving help as entertainment.</p>
<p>Use the <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe-route guide</a> for broader privacy and emergency-planning principles, while recognizing that the onsite organizer controls the event route.</p>

<h2>Know when the checklist should stop</h2>
<p>Do not start merely because everything is packed. Reassess acute illness, fever, faintness, unusual breathing difficulty, chest pain or pressure, confusion, severe or worsening pain, inability to move normally, suspected heat illness, and other concerning symptoms. Seek appropriate qualified or emergency help according to urgency and location.</p>
<p>During the event, stop and get to an appropriate safe or supported place when conditions or symptoms demand it. Follow event medical and emergency instructions. Do not hide symptoms to preserve a finish, leaderboard position, reward, or fee.</p>
<p>A weather delay, course change, transport failure, missed wave, inaccessible venue, or missing required credential may make participation impossible. Ask the organizer about the available process, but do not bypass barriers, enter restricted areas, use another person's credential, or create an unsafe unofficial start.</p>
<p>Withdrawing, changing plans, or going home can be the responsible outcome. No item in the bag removes that option.</p>

<h2>Three illustrative race-day kits</h2>
<h3>A short city road event</h3>
<p>Mika confirms the onsite registration, venue gate, transit plan, arrival window, collection status, and category. The event permits a small waist pouch and provides fluid on course. Mika wears familiar shoes and clothing, secures the required confirmation and transit fare, carries a charged phone and personal essentials, and leaves unrelated cards and a large bag at home.</p>
<p>This is not a universal short-race list. Another venue may require a clear bag, provide no baggage, prohibit a carrier, or use a different confirmation method.</p>

<h3>A hybrid event during unsettled weather</h3>
<p>Paolo selected onsite participation and does not assume the virtual window is an automatic fallback. The evening before and morning of the event, Paolo checks PAGASA, transport, and the organizer's official channel. A permitted light layer and dry post-event top are packed, but the decision to travel still depends on current warnings and official instructions.</p>
<p>If the onsite component changes, Paolo follows the organizer's process rather than independently converting the registration or submitting virtual proof.</p>

<h3>A runner using an accommodation</h3>
<p>Ari contacts the organizer before race day to confirm venue access, the supported start arrangement, course surface, companion or guide rules, toilet access, and equipment handling. The kit contains familiar permitted equipment and a concise copy of the agreed instructions. Ari does not rely on a generic checklist to prove the event can meet every need.</p>
<p>The example illustrates early communication, not a fixed accommodation model. The participant and organizer should establish the actual supported arrangement.</p>

<h2>Copyable race-day worksheet</h2>
<ul>
  <li><strong>Event and mode:</strong> Title, onsite or hybrid, selected participation mode.</li>
  <li><strong>Entry:</strong> Registration status, payment status, confirmation, identification, bib or packet process.</li>
  <li><strong>Place and time:</strong> Venue, gate, timezone, arrival window, wave, check-in close, start, cutoff.</li>
  <li><strong>Travel:</strong> Primary and backup transport, road or transit changes, pickup, return plan.</li>
  <li><strong>Course:</strong> Surface, distance or category, laps, aid, toilets, baggage, prohibited items, accessibility.</li>
  <li><strong>Clothing:</strong> Familiar footwear, familiar clothing, permitted bib attachment, condition-specific layer.</li>
  <li><strong>Food and fluid:</strong> Published provision, permitted familiar personal options, disposal plan.</li>
  <li><strong>Weather:</strong> Current PAGASA products, organizer channel, modification or cancellation process.</li>
  <li><strong>Communication:</strong> Charged device if used, organizer contact, trusted contact, offline details.</li>
  <li><strong>Privacy:</strong> Secure confirmation, minimal identification, safe public-photo check.</li>
  <li><strong>Support:</strong> Published help or medical points, exit, transport home, urgent-action boundary.</li>
  <li><strong>Afterward:</strong> Finish procedure, results process, collection, dry layer or familiar recovery option.</li>
</ul>

<h2>Final bag and departure check</h2>
<ul>
  <li>The event, date, venue, mode, category, and entry status match the registration.</li>
  <li>The latest organizer instructions and current PAGASA information have been checked.</li>
  <li>Travel includes the actual gate, check-in closure, queues, and return plan.</li>
  <li>Clothing, footwear, food, fluid, and carriers are familiar and permitted.</li>
  <li>Confirmation, identification, bib, waiver, or packet items match explicit requirements.</li>
  <li>No unnecessary valuables, documents, supplements, or untested products were added.</li>
  <li>Phone, emergency information, privacy, and trusted-contact choices suit the plan.</li>
  <li>Course, aid, baggage, accessibility, timing, and results expectations come from the event.</li>
  <li>A change, withdrawal, or urgent-help decision remains available.</li>
</ul>

<h2>Practical next step</h2>
<p>Open the actual event page now and create the six purpose groups—entry, movement, weather, food and fluid, communication, and afterward. Put no more than the items supported by a published requirement or a clear personal need into the first draft. Mark every unresolved assumption as a question for the organizer.</p>
<p>Then compare the event with the <a href="/blog/virtual-run-vs-traditional-race-which-one-should-you-join">virtual-versus-onsite format guide</a> and the <a href="/blog/how-to-prepare-for-your-first-virtual-run">first-event preparation guide</a>. Recheck the list after the final event advisory and current weather information. The best race-day bag is not the fullest one; it is the one that supports the real plan without obscuring the decision to adapt.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'The race-day checklist in one minute',
  'How this guide was prepared',
  'Official and platform sources',
  'Start with the event, not the bag',
  'Confirm mode, category, and entry status',
  'Build a door-to-start timeline',
  'Choose familiar clothing for the real conditions',
  'Use a purpose-based packing method',
  'Handle confirmation and identification carefully',
  'Plan fluid and food without universal formulas',
  'Check PAGASA and official event updates',
  'Prepare for course rules and shared space',
  'Understand timing, proof, and results',
  'Carry communication and privacy essentials',
  'Know when the checklist should stop',
  'Three illustrative race-day kits',
  'Copyable race-day worksheet',
  'Final bag and departure check',
  'Practical next step'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/how-it-works',
  '/faq',
  '/blog/how-to-prepare-for-your-first-virtual-run',
  '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
  '/blog/how-to-run-safely-during-hot-and-humid-weather',
  '/blog/how-to-choose-a-safe-route-for-your-virtual-run'
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
  if (/<h[12]>What to Bring on Race Day/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/(?:every|all) runners? (?:must|should) bring|the following items? (?:are|is) mandatory for every/i.test(text)) errors.push('article must not impose a universal packing list');
  if (/drink exactly \d+|everyone needs exactly \d+ (?:liters?|milliliters?)|take \d+ electrolyte/i.test(text)) errors.push('article must not prescribe universal hydration');
  if (/this checklist guarantees? (?:entry|safety|comfort|performance|completion)|packing these items guarantees/i.test(text)) errors.push('article must not guarantee outcomes');
  if (/onsite events? (?:always|automatically) (?:provide|include) (?:medical|hydration|timing|baggage)|every onsite event uses (?:bibs|QR|timing)/i.test(text)) errors.push('article must not invent event services');
  if (/hybrid registration automatically (?:includes|allows) both modes|runners? may switch modes? without approval/i.test(text)) errors.push('article must not invent hybrid mode access');
  if (/continue (?:running|the race) through (?:illness|chest pain|fainting|severe fatigue|unsafe weather)|ignore official weather warnings/i.test(text)) errors.push('article must not encourage unsafe continuation');
  if (/a packed bag means you must (?:start|finish)|paid registration means you must continue/i.test(text)) errors.push('article must preserve withdrawal');
  if (/approved onsite result (?:proves|certifies) physical readiness|platform approval guarantees qualifying status/i.test(text)) errors.push('article must not overstate approval');
  if (!/reviewed in August 2026 using current Philippine Atmospheric/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/general educational information, not individualized medical/i.test(text)) errors.push('article must define safety boundary');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }
  if (errors.length) throw new Error(`Invalid race-day packing payload: ${errors.join('; ')}`);
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
