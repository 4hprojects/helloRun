'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-choose-running-shoes-for-beginners';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Choose Running Shoes for Beginners',
  excerpt: 'Choose your first running shoes by fit, comfort, intended surface, and budget—without assuming the most expensive model or one technical category is best.',
  category: 'Training',
  tags: Object.freeze([
    'running shoes',
    'beginner running',
    'running shoe fit',
    'shoe buying guide',
    'road running shoes',
    'trail running shoes',
    'running gear',
    'runner comfort'
  ]),
  seoTitle: 'How to Choose Running Shoes for Beginners',
  seoDescription: 'Learn how beginner runners can choose running shoes based on fit, comfort, intended use, surface, sizing, and budget without getting lost in technical jargon.',
  coverImageAlt: 'Filipino beginner comparing two unbranded running shoes for fit and comfort beside a tropical park path and simple shoe bench'
});

const RAW_CONTENT_HTML = `
<p>The best running shoes for beginners are the pair that fits both feet comfortably, suits the main surface, stays within budget, and feels stable during the movement you actually plan to do. You do not need the most expensive model, the thickest foam, a fashionable brand, or a shoe selected from arch shape alone.</p>
<p>Start by checking length, width, depth, heel hold, and immediate comfort. Try both shoes with your usual running socks and any professionally recommended insert or brace. Walk and, when permitted, jog in them. Your longest toe should not touch the front; your toes should be able to move; the midfoot should feel secure without pressure; and the heel should not slide excessively.</p>
<p>No shoe can guarantee injury prevention, correct pain, or make an unsuitable training plan safe. If pain, numbness, weakness, wounds, substantial swelling, a recent injury, diabetes-related foot risk, or another individual condition affects footwear, obtain suitable clinical guidance rather than relying on a generic buying guide or store scan.</p>
<blockquote><strong>The beginner priority order:</strong> fit both feet, test immediate comfort, match the primary surface, confirm the return policy, and then compare price and optional features.</blockquote>

<h2>You do not need the most expensive shoe</h2>
<p>Price can reflect materials, research, marketing, retailer costs, new foam compounds, plates, limited releases, or branding. It does not prove that a shoe fits your foot or suits an easy beginner routine. A less expensive current or previous-season daily trainer can be the better choice when it is comfortable and appropriate for the intended use.</p>
<p>Set a total budget that includes delivery, possible return fees, socks, and any prescribed insert. A discounted non-returnable pair may be poor value when sizing is uncertain, and beginners do not need separate race and training shoes because an advertisement shows both. Model updates can also change fit even when the name remains familiar.</p>
<p>Do not assume an expensive shoe prevents injury. A 2022 Cochrane review found uncertainty about how effectively running shoes prevent lower-limb running injuries and reported low- or very-low-certainty evidence for most comparisons between shoe types. It found no evidence that prescribing footwear based on foot posture reduces such injuries in adults; the relevant studies used military populations, limiting generalization.</p>

<h2>Start with fit and immediate comfort</h2>
<p>A running shoe should feel comfortable during the fitting. Do not buy a painful or cramped shoe expecting a break-in period to create needed length or width. Uppers may soften, but the shoe does not become longer, and pressure during the test can worsen over a run.</p>
<p>Fit both feet because they may differ. Start with the larger foot, then adjust secure hold through width, volume, and lacing. Printed size is only a starting point because internal shapes vary across brands, models, versions, and regions.</p>
<p>Check the whole foot:</p>
<ul>
  <li><strong>Length:</strong> the longest toe has space from the front when standing, without the foot sliding forward.</li>
  <li><strong>Width:</strong> toes and forefoot are not squeezed, and the foot does not visibly spill over the platform.</li>
  <li><strong>Depth or volume:</strong> the upper does not press painfully on the top of the foot or toes.</li>
  <li><strong>Midfoot:</strong> secure rather than numb, pinched, or dependent on overtight laces.</li>
  <li><strong>Heel:</strong> held without painful rubbing or excessive lift; tiny movement is different from repeated slipping.</li>
  <li><strong>Flex and ride:</strong> movement feels natural enough for your intended walk, run-walk, or run.</li>
</ul>
<p>Comfort is personal and must be tested rather than inferred from a reviewer's score. Research can compare general shoe features, but it cannot feel pressure on your foot through a screen.</p>

<h2>How much room should your toes have?</h2>
<p>The American Academy of Orthopaedic Surgeons and other clinical fitting guides commonly suggest at least about one-half inch—or roughly a thumb's width—between the longest toe and the front of an athletic shoe. Treat that as a fitting check, not an exact formula for every thumb, foot, or shoe shape.</p>
<p>Stand with weight on both feet and check the longest toe, which is not always the big toe. Toes should wiggle without stacking or pressure from above. Width and depth matter too: a long but narrow or shallow toe box can still be unsuitable.</p>
<p>Too much space can cause sliding and friction. When permitted, recheck on an incline or short jog; toes should not strike the front while stopping or moving downhill. Wear the intended socks and fit any prescribed orthotic or brace according to professional guidance.</p>

<h2>Road, trail, and treadmill shoes</h2>
<p>Choose for the surface you will use most, not the terrain you hope to tackle someday.</p>
<h3>Road and paved-path use</h3>
<p>Road shoes suit relatively consistent surfaces such as pavement, tracks, and paved paths. Beginners commonly start with a comfortable daily trainer, but outsole, flexibility, cushioning, and upper fit vary widely within the category.</p>
<h3>Trail use</h3>
<p>Trail shoes may add outsole lugs, protective materials, and a secure upper for dirt, loose surfaces, roots, or uneven terrain. More aggressive tread is not automatically safer on smooth wet tile or pavement. Match lug depth and protection to the actual trail, and recognize that grip still has limits on mud, wet rock, moss, roots, and steep ground.</p>
<h3>Treadmill use</h3>
<p>A comfortable road shoe often works on a treadmill. Breathability can matter indoors, and extremely aggressive trail lugs are usually unnecessary on a belt. Follow facility rules and ensure the outsole is clean. A treadmill does not correct poor shoe fit.</p>
<h3>Mixed use</h3>
<p>For mostly paved sessions with occasional smooth packed paths, one versatile pair may be enough. Regular technical trails may justify a dedicated trail option. The <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe-route guide</a> can help identify surface, slope, weather exposure, and backup routes before you shop.</p>

<h2>Cushioning and stability in simple terms</h2>
<p>Cushioning describes how the midsole feels and responds underfoot. More stack height or softness is not automatically more comfortable, more stable, or safer. Some runners like a soft sensation; others prefer a firmer or lower platform. Test rather than treating marketing adjectives as measurements.</p>
<p>Stability shoes use geometry, foam placement, sidewalls, or width to guide movement; neutral shoes generally use fewer obvious guidance features. These inconsistent marketing labels do not diagnose how you move.</p>
<p>Pronation—some inward motion of the foot—is part of normal walking and running. A wet-foot arch test or salesperson watching a few walking steps does not, by itself, determine the only safe shoe category. The Cochrane review found no evidence that prescribing footwear from foot posture reduces lower-limb running injuries in adults, while noting limits in the available studies.</p>
<p>Compare suitable shoes during the same movement. Choose the option that feels predictable and comfortable, keeps the foot centered, and does not press into the arch.</p>
<p>People with an injury, recurrent symptoms, substantial deformity, loss of sensation, prescribed orthotics, or a clinician-directed footwear need should follow individualized advice. A retail assessment is not a medical diagnosis.</p>

<h2>Other shoe features without the jargon</h2>
<h3>Heel-to-toe drop</h3>
<p>Drop is the difference between heel and forefoot stack height. It does not reveal the entire ride. Abruptly changing to a very different design can alter demand on the foot, ankle, calf, or knee, so introduce unfamiliar shoes conservatively rather than assuming lower or higher is universally better.</p>
<h3>Stack height</h3>
<p>Stack describes how much material sits between foot and ground at measured points. A tall shoe can feel cushioned but may also feel unfamiliar; a lower shoe can feel direct but not necessarily harsh. Geometry, foam, width, and the runner interact.</p>
<h3>Weight</h3>
<p>Lighter can feel lively, but a small gram difference may not matter to a beginner's easy sessions. Do not trade away fit, usable outsole, or budget only to reduce catalogue weight.</p>
<h3>Upper</h3>
<p>The upper holds the foot. Check seams, overlays, tongue pressure, toe-box shape, and breathability. Thin mesh can improve airflow but does not guarantee durability or quick drying.</p>
<h3>Outsole</h3>
<p>The outsole contacts the ground. Rubber placement and tread influence wear and traction, but no pattern guarantees grip on every wet surface. Inspect the route rather than relying on a product claim.</p>

<h2>Trying running shoes at a store</h2>
<ol>
  <li><strong>Bring your actual setup.</strong> Wear running socks and bring prescribed orthotics or braces.</li>
  <li><strong>Measure both feet.</strong> Length and width can change over time; do not rely only on the last box you bought.</li>
  <li><strong>Try more than one option.</strong> Compare similar-purpose shoes within budget without asking for the universal best.</li>
  <li><strong>Lace each pair properly.</strong> The heel and midfoot should become secure without painful pressure.</li>
  <li><strong>Stand and check space.</strong> Inspect the longest toe, width, depth, and heel.</li>
  <li><strong>Move in both shoes.</strong> Walk, turn, and jog when the store provides a safe permitted area.</li>
  <li><strong>Notice immediate problems.</strong> Reject pinching, toe contact, numbness, hot spots, unstable sliding, or pressure that requires hope.</li>
  <li><strong>Confirm terms.</strong> Ask what condition the shoe must remain in for a return or exchange.</li>
</ol>
<p>Trying later in the day or after ordinary activity may account for foot expansion, as AAOS guidance notes. A treadmill video can offer observations, but it is neither compulsory nor a diagnosis. Ask what the salesperson saw and compare alternatives by comfort.</p>

<h2>Buying running shoes online</h2>
<p>Online buying works best when you already know the exact model, version, size, and width—or when the seller offers a clear practical return process. A familiar brand size does not guarantee a new model fits the same.</p>
<p>Before ordering:</p>
<ul>
  <li>Read the official size chart and identify its measurement and sizing system.</li>
  <li>Measure both feet using the seller's stated method, standing when instructed.</li>
  <li>Check available widths rather than sizing up repeatedly to solve width pressure.</li>
  <li>Confirm whether the listing is the expected model version and intended category.</li>
  <li>Read return deadlines, fees, packaging requirements, and whether indoor try-on is allowed.</li>
  <li>Check seller identity and authenticity safeguards.</li>
</ul>
<p>On arrival, inspect both shoes for matching size, defects, and outsole condition. Try them indoors on a clean surface with running socks, and stay within the seller's return terms. Keep order details and address labels out of public sizing requests.</p>

<h2>Running shoes in the Philippine climate</h2>
<p>Heat, humidity, sudden rain, wet pavement, and storage conditions can affect comfort and use. A breathable upper may feel useful, but ventilation does not make hot-weather running safe. A grippy-looking outsole cannot promise traction on painted crossings, smooth tile, algae, metal covers, mud, or oil.</p>
<p>Choose materials and fit for your routes. Socks, foot movement, and water affect comfort. Waterproof uppers may feel warmer and can still admit water through the collar, while quick-drying preference is personal.</p>
<p>After a wet session, remove debris, follow the maker's care directions, and dry shoes in a ventilated place rather than assuming intense heat is safe for adhesives and foam. Alternating pairs can provide drying time, but buying two is not mandatory.</p>
<p>Read the <a href="/blog/running-during-rainy-season-philippines">rainy-season running guide</a> and <a href="/blog/how-to-run-safely-during-hot-and-humid-weather">hot-weather guide</a> for route and condition decisions that footwear cannot solve.</p>

<h2>How many pairs does a beginner need?</h2>
<p>One suitable pair is enough for many beginners. A rotation is optional, not an entry fee for running. Start with one comfortable pair, learn what works, and spend further only when a real use case appears.</p>
<p>A second pair may be useful when:</p>
<ul>
  <li>regular trail and road sessions genuinely need different outsoles;</li>
  <li>a wet pair cannot dry before the next appropriate activity;</li>
  <li>a prescribed or individual need calls for another setup;</li>
  <li>the current pair is nearing replacement and a gradual handover is practical.</li>
</ul>
<p>Owning several pairs does not guarantee longer shoe life in total, prevent injury, or improve consistency. A beginner challenge such as the <a href="/blog/30-day-running-challenge-for-beginners">flexible 30-day running reset</a> can be completed with walking, recovery, and a suitable single pair; it does not require daily running or daily footwear changes.</p>

<h2>When should running shoes be replaced?</h2>
<p>There is no exact universal replacement mileage. Published consumer guidance often mentions ranges such as 300–500 miles, roughly 480–800 kilometres, but shoe construction, runner, surface, weather, storage, use, and wear pattern vary. Treat mileage as a reminder to inspect, not an expiry switch.</p>
<p>Review the pair when:</p>
<ul>
  <li>the outsole is worn through, separating, or no longer suitable for the surface;</li>
  <li>the upper, heel hold, or lacing structure is torn and cannot secure the foot;</li>
  <li>the midsole is visibly distorted or the shoe no longer sits evenly;</li>
  <li>comfort or stability has changed consistently across comparable easy sessions;</li>
  <li>the shoe has been exposed to damage, contamination, or storage conditions outside maker guidance;</li>
  <li>new symptoms repeatedly occur and warrant assessment rather than another forced run.</li>
</ul>
<p>Do not wait for dramatic failure when structure or traction is compromised, but cosmetic creasing or dirt alone does not prove a shoe unusable. Introduce a replacement during shorter familiar activity; even a familiar model needs a real-world comfort check.</p>

<h2>Common beginner buying mistakes</h2>
<h3>Buying the same printed size without trying it</h3>
<p>Internal shape changes across models and versions. Fit both feet every time.</p>
<h3>Expecting a painful shoe to break in</h3>
<p>Immediate discomfort is a reason to compare another size, width, volume, or model—not a training challenge.</p>
<h3>Using arch height as a prescription</h3>
<p>Arch shape alone does not select the only correct category. Comfort, movement, history, and individual clinical needs matter.</p>
<h3>Assuming more cushioning is always safer</h3>
<p>Softness and stack are preferences and design variables, not injury guarantees. Test how the complete shoe feels.</p>
<h3>Ignoring the return policy</h3>
<p>Especially online, a cheap non-returnable pair can cost more than a correctly fitted option.</p>
<h3>Replacing only because an app reached a number</h3>
<p>Mileage helps trigger inspection; it does not know the shoe's construction, condition, or use.</p>

<h2>A practical beginner shoe checklist</h2>
<ul>
  <li>I defined my primary use: road, trail, treadmill, walking, run-walk, or mixed.</li>
  <li>I set a total budget including delivery and returns.</li>
  <li>I measured and tried both feet with the intended socks and prescribed aids.</li>
  <li>My longest toe has usable room; the toe box also has enough width and depth.</li>
  <li>My midfoot is secure without pressure, and my heel is not slipping excessively.</li>
  <li>The shoe feels comfortable now, without requiring a painful break-in.</li>
  <li>I walked and jogged in both shoes when safely permitted.</li>
  <li>The outsole and upper make sense for my actual route and climate.</li>
  <li>I understand the seller, model version, warranty, and return conditions.</li>
  <li>I did not accept a guarantee about injury prevention or performance.</li>
</ul>
<p>For event preparation beyond footwear, use the <a href="/blog/what-to-bring-race-day-onsite-hybrid-events">race-day packing guide</a>. Shoes are one item in a broader plan that includes route, weather, identification, hydration access, proof requirements, and recovery.</p>

<h2>Frequently asked questions</h2>
<h3>What running shoes should I buy as a beginner?</h3>
<p>Start with a comfortable daily-use shoe suited to your main surface and budget. Try multiple sizes, widths, and models rather than seeking one universal recommendation. Specialized race technology is not required.</p>
<h3>Should running shoes be one size bigger?</h3>
<p>Not automatically. Printed sizing varies. Fit by actual length, width, depth, and heel hold. Many guides suggest roughly a thumb's width in front of the longest toe, but blindly adding a full size can create sliding.</p>
<h3>Are expensive running shoes better?</h3>
<p>Not necessarily for your foot or use. Price can buy particular materials and features, but it does not prove fit, comfort, durability, safety, or better outcomes.</p>
<h3>Do I need a gait analysis?</h3>
<p>No. A store running assessment can offer observations and comparison opportunities, but it is not compulsory or diagnostic. Persistent symptoms and clinical needs belong with a qualified professional.</p>
<h3>Can I use walking shoes for beginner run-walk?</h3>
<p>Possibly, when they fit securely and feel appropriate for the movement and surface. Test short controlled running portions rather than assuming every walking shoe or casual sneaker is suitable.</p>
<h3>How long do running shoes last?</h3>
<p>There is no exact lifespan. Use mileage as an inspection reminder and consider outsole, upper, midsole shape, changed comfort, surface, storage, and maker guidance.</p>

<h2>Official sources and review scope</h2>
<p>This article was reviewed in September 2026. The <a href="https://www.orthoinfo.org/staying-healthy/athletic-shoes/">American Academy of Orthopaedic Surgeons athletic-shoe guide</a> supports fitting both shoes, allowing toe room, checking heel hold, wearing intended socks, and trying footwear later in the day. The <a href="https://www.guysandstthomas.nhs.uk/health-information/choosing-athletic-footwear">Guy's and St Thomas' NHS Foundation Trust footwear guide</a> supplies current clinical fitting context.</p>
<p>The 2022 <a href="https://pubmed.ncbi.nlm.nih.gov/35993829/">Cochrane review of running shoes for preventing lower-limb injuries</a> supports caution about injury-prevention claims, including claims based on foot posture, and describes important limits in the evidence.</p>
<p>These sources offer general information, not an endorsement of a brand, model, retailer, fitting service, or replacement date. Product specifications, availability, pricing, and return policies change. This article contains no affiliate recommendation and has not independently tested shoes.</p>
<p>Footwear information is not personal medical advice, diagnosis, treatment, or a guarantee against pain or injury. Individual conditions, prescribed devices, disability, pregnancy-related changes, wounds, sensation changes, and recovery needs can alter what is appropriate.</p>

<h2>Choose the shoe, then choose a manageable goal</h2>
<p>Once a pair passes the fit, comfort, surface, and budget checks, introduce it during a short familiar walk or run-walk. Keep the packaging and return terms until the decision is final. A shoe should support the plan—not become a reason to increase distance immediately.</p>
<p>When your basic gear is ready, <a href="/events">browse current HelloRun events</a>, read the live rules, and start with a manageable distance. The <a href="/blog/10k-training-plan-for-beginners">beginner 10K framework</a> is available when a repeatable 5K foundation already exists; buying new shoes does not create that foundation by itself.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'You do not need the most expensive shoe',
  'Start with fit and immediate comfort',
  'How much room should your toes have?',
  'Road, trail, and treadmill shoes',
  'Cushioning and stability in simple terms',
  'Trying running shoes at a store',
  'Buying running shoes online',
  'Running shoes in the Philippine climate',
  'How many pairs does a beginner need?',
  'When should running shoes be replaced?',
  'Common beginner buying mistakes',
  'A practical beginner shoe checklist',
  'Frequently asked questions',
  'Official sources and review scope',
  'Choose the shoe, then choose a manageable goal'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/events"',
  'href="/blog/how-to-choose-a-safe-route-for-your-virtual-run"',
  'href="/blog/what-to-bring-race-day-onsite-hybrid-events"',
  'href="/blog/30-day-running-challenge-for-beginners"',
  'href="/blog/10k-training-plan-for-beginners"',
  'href="/blog/running-during-rainy-season-philippines"',
  'href="/blog/how-to-run-safely-during-hot-and-humid-weather"'
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
  if (wordCount < 2500 || wordCount > 3000) errors.push('article must contain 2500-3000 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('cover artwork is required for publication');
  if (/<h1\b/i.test(payload.contentHtml)) errors.push('body must not contain a page-level h1');
  if (/<h[12]>How to Choose Running Shoes for Beginners/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/(?:the|this|our) (?:best|perfect) (?:running )?shoe (?:for everyone|for all beginners)|every beginner (?:must|should) buy/i.test(text)) errors.push('article must not recommend one universal shoe');
  if (/(?:running shoes|this shoe|these shoes) (?:guarantee|prevent all|will prevent) (?:injury|injuries|pain)|injury-proof shoe/i.test(text)) errors.push('article must not guarantee injury prevention');
  if (/(?:flat feet|high arches?|arch height) (?:always|automatically|must) (?:need|require|mean)|wet-foot test (?:proves|determines)/i.test(text)) errors.push('article must not prescribe from arch shape alone');
  if (/gait analysis is (?:mandatory|required for every)|every beginner (?:must|should) get a gait analysis/i.test(text)) errors.push('article must not mandate gait analysis');
  if (/(?:all|every) running shoes? (?:must|should) be replaced (?:at|after)|exactly (?:300|400|500) miles/i.test(text)) errors.push('article must not prescribe rigid replacement mileage');
  if (/(?:every|all) beginners? (?:need|must own|should own) (?:two|multiple|several) pairs/i.test(text)) errors.push('article must not require multiple pairs');
  if (/(?:most expensive|highest-priced) shoe is (?:always )?(?:best|safest)|higher price guarantees/i.test(text)) errors.push('article must not equate price with suitability');
  if (!/best running shoes for beginners are the pair that fits both feet comfortably/i.test(text)) errors.push('article must answer buying intent early');
  if (!/Footwear information is not personal medical advice, diagnosis, treatment/i.test(text)) errors.push('article must distinguish general footwear information');
  if (!/reviewed in September 2026/i.test(text)) errors.push('article must disclose review date');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }
  if (errors.length) throw new Error(`Invalid beginner running-shoe guide payload: ${errors.join('; ')}`);
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
