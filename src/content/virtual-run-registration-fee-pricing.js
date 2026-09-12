'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'virtual-run-registration-fee-pricing';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How Much Should You Charge for a Virtual Run?',
  excerpt: 'Set a fair virtual-run registration fee by mapping real costs, participant value, fulfilment risk, payment handling, demand scenarios, and clear event-page disclosures.',
  category: 'Organizer Guide',
  tags: Object.freeze([
    'virtual run registration fee',
    'virtual race pricing',
    'virtual run price',
    'race registration fee',
    'virtual event pricing',
    'running event registration',
    'event cost worksheet',
    'organizer guide'
  ]),
  seoTitle: 'How Much Should You Charge for a Virtual Run?',
  seoDescription: 'Learn how organizers can set a virtual run registration fee based on event costs, participant value, inclusions, payment fees, rewards, and target audience.',
  coverImageAlt: 'Translucent resin diorama of a Filipino virtual-run organizer balancing event costs, participant inclusions, and registration choices'
});

const RAW_CONTENT_HTML = `
<p>There is no universal virtual run registration fee. A fair price is the amount your specific audience can understand in exchange for a clearly defined event, while covering realistic fixed and per-participant costs, fulfilment risk, organizer work, applicable obligations, and any deliberately chosen surplus or fundraising contribution.</p>
<p>Start with costs and delivery capacity—not a competitor's headline price. Model more than one registration outcome, decide what participants actually receive, and publish the total required charges and conditions before asking anyone to pay.</p>
<blockquote><strong>Practical starting point:</strong> total projected event costs ÷ expected paid participants = estimated base cost per participant. Treat that as one planning lens, then test lower turnout, variable costs, contingency, audience fit, and the event's purpose before choosing the public fee.</blockquote>

<h2>Start with your actual event costs</h2>
<p>Open a worksheet before registration. Record every resource needed through support and fulfilment. Separate committed costs from estimates, and label each amount fixed, variable, mixed, optional, donated, sponsored, or recoverable.</p>
<p>Fixed costs, such as setup or a supplier minimum, stay broadly stable within the planned range. Variable costs, such as one medal, payment charge, or shipment, change with volume. Mixed costs can jump when volume requires another production batch, staff shift, storage level, or courier arrangement.</p>
<p>Use supplier quotations with validity dates where possible. Include taxes, setup, minimum orders, defects, samples, packaging, transport, and unsent inventory. A quoted medal unit price is not the whole programme cost.</p>
<p>The US Small Business Administration describes break-even as the point where total cost and revenue are equal and distinguishes fixed from variable costs. That framework is useful for planning, but an event worksheet is still an estimate. Actual registration volume, supplier terms, tax treatment, refunds, failed deliveries, and staffing can change the result.</p>

<h2>What are participants paying for?</h2>
<p>Price and value are related but not identical. A participant is not buying kilometres; they are joining a defined experience. Explain which parts of the fee support:</p>
<ul>
  <li>event design, rules, registration, participant communication, and support;</li>
  <li>activity evidence review, result handling, and fair correction processes;</li>
  <li>digital certificates, badges, results, or other configured recognition;</li>
  <li>medals, shirts, patches, towels, kits, packaging, pickup, or delivery when promised;</li>
  <li>creative work, community programming, or a beneficiary contribution;</li>
  <li>payment administration, accounting, customer service, and closeout;</li>
  <li>a stated organizer margin, reserve, or sustainability allocation where appropriate.</li>
</ul>
<p>Participants do not need confidential vendor contracts, but they need an accurate offer. “Registration fee” is too vague when the choice is digital entry, a physical package, delivery, or a donation-supported place. Name inclusions and exclusions beside each price, without inventing value for ordinary digital items or support.</p>

<h2>Choose between a free and paid virtual run</h2>
<p>A free event can reduce the payment barrier and may suit community participation, a sponsored wellbeing programme, a school activity, a pilot event, or a campaign whose costs are funded elsewhere. Free does not mean costless. Identify who pays for technology, moderation, support, creative work, rewards, and fulfilment, and set capacity to match those resources.</p>
<p>A paid event can fund operations, physical items, professional services, fundraising, or a repeatable programme. Charging can also create expectations about responsiveness, delivery, refunds, invoicing, and consumer support. Do not use a fee merely to imply legitimacy.</p>
<p>Other models include sponsorship, employer or school funding, grants, appropriately handled donations, separate merchandise, or subsidized entries. Keep the payer, beneficiary, restrictions, and participant entitlements explicit, and confirm applicable tax, fundraising, consumer, and accounting requirements.</p>
<p>On HelloRun, an organizer can configure a free or paid event. A free registration does not ask the runner for payment proof. A paid setup requires complete pricing and payment instructions before review. This is platform behavior, not advice that one mode is financially or legally right for every event.</p>

<h2>List every common cost category</h2>
<p>Use headings that make omissions visible:</p>
<ul>
  <li><strong>Planning and administration:</strong> research, project management, contracts, permits, insurance review, accounting, and meetings.</li>
  <li><strong>Creative and communication:</strong> identity, event-page copy, artwork, photography, video, accessibility work, translations, email, and support materials.</li>
  <li><strong>Technology:</strong> event tools, domains, analytics, storage, transaction records, support software, and specialist integrations actually used.</li>
  <li><strong>Participant operations:</strong> registration checks, payment review, questions, evidence review, corrections, disputes, results, and closeout.</li>
  <li><strong>Physical production:</strong> design setup, samples, medals, apparel, printing, personalization, quality control, overruns, and replacements.</li>
  <li><strong>Fulfilment:</strong> packing materials, labels, labour, pickup site, storage, courier collection, delivery, return-to-sender, and redelivery.</li>
  <li><strong>Promotion:</strong> media production, partner materials, paid distribution, referral administration, and promotion compliance where applicable.</li>
  <li><strong>Finance and compliance:</strong> bank or wallet fees, invoices, taxes, professional advice, refund handling, reconciliation, and record retention.</li>
  <li><strong>Contingency:</strong> a reasoned allowance for specific uncertainty rather than a hidden amount with no owner or purpose.</li>
</ul>
<p>Confirm donated labour, venue access, and sponsor-supplied items, and record their estimated replacement cost so the next event can be assessed if support disappears.</p>

<h2>Price a digital-only event</h2>
<p>A digital-only event removes manufacturing and courier work, but it still needs an operating budget. Count event setup, accessible instructions, participant questions, payment administration if paid, evidence review, result handling, digital recognition, moderation, data handling, and closeout.</p>
<p>A volunteer-supported digital event may be free; a professionally operated series may charge for skilled time and reliable service. Neither is inherently fairer. Explain the experience, capacity, support boundary, and post-completion process. No medal does not mean zero operating cost.</p>

<h2>Price medals and physical kits</h2>
<p>Build each physical package from the delivered item backward. Include item cost, artwork or mould setup, sample approval, quantity tiers, defects, personalization, size mix, packaging, warehouse or home storage, picking, labels, courier handoff, failed delivery, support, and replacement rules.</p>
<p>Supplier minimums can make early units expensive. If 100 medals are ordered but only 70 paid participants qualify, price the remaining inventory into the plan and decide whether it is reserve stock, future inventory, a sponsor allocation, or unacceptable risk.</p>
<p>State whether a physical item is included with registration, chosen as a package, purchased as an add-on, earned after approval, collected at pickup, or delivered for a separate charge. Do not promise every registrant a medal if eligibility depends on payment confirmation, approved completion, stock, a deadline, or a selected package.</p>

<h2>Account for payment and transfer costs</h2>
<p>List bank, wallet, gateway, foreign-exchange, withdrawal, failed-payment, and refund charges, identifying whether the participant or organizer pays. Check current provider terms rather than copying an old rate.</p>
<p>The Bangko Sentral ng Pilipinas maintains guidance on disclosure of electronic-payment fees for supervised institutions. Organizers should still verify what their chosen account or provider displays, who bears each charge, and whether the participant's total outlay differs from the event amount.</p>
<p>HelloRun currently does not directly process the external transfer for paid registration. The organizer publishes payment details, the participant can upload a receipt, and the organizer reviews it. Budget the time needed for reconciliation, duplicate checking, unclear references, corrections, reminders, and support. Do not describe receipt upload as instant payment confirmation.</p>

<h2>Separate shipping and fulfilment</h2>
<p>Decide whether delivery is included, charged separately, calculated by region, restricted to a service area, replaced by pickup, or unavailable. Test the economics for remote areas and international addresses before advertising nationwide or worldwide delivery.</p>
<p>For flat shipping, model costly destinations and courier-rate changes. For variable shipping, explain when the total becomes known. Label dispatch estimates, identify the fulfilment owner, and state how incorrect addresses, failed delivery, damage, returns, and unclaimed pickup are handled.</p>
<p>Collect an address only when needed for a defined fulfilment purpose. The Philippine Data Privacy Act requires transparency, legitimate purpose, and proportionality, including data that is adequate and not excessive and retained only as long as necessary. A shipping worksheet should therefore include data access, secure handoff, retention, correction, and deletion—not only courier cost.</p>
<p>HelloRun can record delivery settings and a delivery fee for configured paid events, but the organizer remains responsible for ensuring the public description, selected package, address requirement, claiming method, and actual fulfilment plan agree.</p>

<h2>Budget organizer time and participant support</h2>
<p>Estimate hours by stage and role: planning, suppliers, event setup, questions, payment and activity review, corrections, results, fulfilment, complaints, reconciliation, and closeout. Apply an agreed internal or contractor rate, even when some work is donated.</p>
<p>Use capacity scenarios. One hundred five-minute payment reviews require more than eight hours before questions or corrections; fulfilment adds packing and tracking. A low fee with unlimited manual support can be less sustainable than a narrowly scoped free event.</p>
<p>Do not hide underpriced labour by expecting volunteers to absorb every exception. Define service hours, escalation routes, review estimates, and the cases that require specialist advice.</p>

<h2>Price different distance categories fairly</h2>
<p>A longer distance does not automatically cost more. If 5K and 21K participants receive the same service and package, different prices need an explainable difference such as merchandise, personalization, workload, programme content, capacity, insurance, or hybrid-event elements.</p>
<p>Use the <a href="/blog/how-to-design-fair-distance-categories-and-challenge-goals">distance-category guide</a> to align price, mechanics, evidence, results, and recognition. Compare every option side by side. A category name, displayed amount, package, eligibility rule, and registration selection must refer to the same offer.</p>
<p>HelloRun supports paid distance-based pricing, customized signup options, and dated registration packages in its current organizer workflow. Period-based distance pricing can use configured early-bird, regular, and late windows. The platform resolves the applicable configured option at registration and stores a pricing snapshot. Organizers should preview and test representative registrations for every category, option, package, and live date window.</p>

<h2>Use early-bird and promotional pricing carefully</h2>
<p>An early-bird period can reward earlier commitment, improve demand visibility, or fund initial supplier deposits. It is optional. Use it only when the dates, eligibility, amount, and reason fit the operating plan.</p>
<p>Set start and end instants with a timezone. Avoid overlaps or gaps, and explain whether the price depends on registration, payment, approval, or another milestone. Do not secretly extend a supposedly final deadline for selected people.</p>
<p>A lower promotional price must still fit the cost model or have an identified subsidy. If a campaign includes prizes, raffles, promised gains, or another regulated sales-promotion element, check current requirements with the relevant authority. The DTI Sales Promotion Division describes regulated promotions by their sales or patronage purpose, promised gain, limited period, public announcement, and consumer audience; not every ordinary price window is necessarily treated the same way.</p>
<p>Do not use a crossed-out “regular price” that was never genuinely offered, invented last slots, hidden influencer compensation, or guaranteed savings. Promotion should make the offer easier to evaluate, not manufacture urgency.</p>

<h2>Avoid hidden fees</h2>
<p>Before payment, show the amount, currency, required delivery, package or category, mandatory add-ons, applicable taxes or charges, and conditions that could change the total. Optional items must remain optional.</p>
<p>The Philippine Internet Transactions Act implementing rules require minimum information for online goods or services and, in relevant platform contexts, describe price disclosure inclusive of taxes and other charges. Applicability depends on the organizer, transaction, and platform role, so obtain qualified advice rather than treating this article as a legal determination. The practical standard is still clear: participants should not discover a mandatory charge after committing time or sharing payment details.</p>
<p>Link cancellation, transfer, refund, substitution, delivery, and dispute terms near the price. Use the <a href="/blog/how-to-write-clear-virtual-run-rules-participants-can-follow">clear event-rules guide</a> to keep the public fee and controlling rules consistent. Review current <a href="/refund-and-cancellation-policy">HelloRun refund and cancellation policy</a> and write the event-specific position accurately.</p>

<h2>Build an example pricing worksheet</h2>
<p>The numbers below are fictional Philippine-peso planning examples, not market rates, tax advice, supplier quotations, or a recommended fee.</p>
<h3>Scenario A: 100 paid participants</h3>
<ul>
  <li>Projected fixed event costs: ₱12,000.</li>
  <li>Projected variable cost: ₱120 × 100 participants = ₱12,000.</li>
  <li>Total projected event costs: ₱24,000.</li>
  <li>Base cost per participant: ₱24,000 ÷ 100 = ₱240.</li>
  <li>Illustrative contingency allocation: ₱24 per participant.</li>
  <li>Illustrative sustainability or organizer allocation: ₱36 per participant.</li>
  <li>Illustrative modelled fee: ₱300 before any separately disclosed delivery or optional add-on.</li>
</ul>
<h3>Scenario B: only 75 paid participants</h3>
<ul>
  <li>Fixed costs remain ₱12,000.</li>
  <li>Variable cost becomes ₱120 × 75 = ₱9,000.</li>
  <li>Total projected event costs become ₱21,000.</li>
  <li>Base cost per participant becomes ₱21,000 ÷ 75 = ₱280.</li>
</ul>
<p>The same ₱300 fee leaves far less room for uncertainty at lower turnout. That does not mean the answer must be ₱350. The organizer could reduce scope, secure sponsorship, change the minimum order, cap physical packages, use pickup, accept a deliberate subsidy, adjust the fee, or decide not to proceed.</p>
<h3>Worksheet fields to copy</h3>
<ul>
  <li>Event purpose and funding model.</li>
  <li>Expected, conservative, and capacity-limit paid registrations.</li>
  <li>Fixed, variable, mixed, donated, and sponsored costs.</li>
  <li>Variable cost per participant by package or category.</li>
  <li>Minimum supplier order and unsold-inventory treatment.</li>
  <li>Payment, refund, fulfilment, failed-delivery, and support assumptions.</li>
  <li>Contingency with a stated basis.</li>
  <li>Organizer margin, reserve, or beneficiary contribution.</li>
  <li>Total participant outlay, including required separate charges.</li>
  <li>Break-even registrations at each proposed price.</li>
</ul>
<p>Run at least three scenarios. Expected attendance is an assumption, not a promise. Previous events and expressions of interest can inform—but never guarantee—paid registrations.</p>

<h2>Check break-even and cash flow separately</h2>
<p>A model can break even eventually and still run out of cash before fulfilment. Mark when supplier deposits, creative invoices, promotion costs, taxes, refunds, and courier payments are due, then compare those dates with registration receipts and payment-review timing.</p>
<p>Calculate break-even registrations for each offer using fixed costs ÷ contribution per registration, where contribution is price minus the relevant variable cost. With ₱12,000 fixed cost, a ₱300 price, and ₱120 variable cost, the simplified contribution is ₱180 and the mathematical break-even is 66.67, meaning at least 67 paid registrations in that simplified scenario. This excludes any cost or charge not placed in the model.</p>
<p>Do not accept more registrations than the team can review or fulfil merely because volume improves the spreadsheet. Capacity, safety, fairness, privacy, and delivery quality remain operating constraints.</p>

<h2>Plan margin, contingency, and fundraising honestly</h2>
<p>A sustainable organizer may need compensation or surplus. Name it internally and represent it honestly. “All proceeds go to the cause” differs from “a portion of each registration supports the cause,” and both require matching records.</p>
<p>Contingency is for identified uncertainty such as supplier variance, replacement stock, redelivery, or higher support demand. It is not a substitute for basic research. Review unused contingency after closeout and handle it consistently with the published purpose, organizational rules, and applicable obligations.</p>
<p>Never guarantee profit, fundraising totals, participant numbers, or beneficiary proceeds before the necessary conditions are known. Obtain accounting, tax, fundraising, and legal advice appropriate to the organizer and event.</p>

<h2>Explain the fee on your event page</h2>
<p>The event page should be the authoritative pricing source. Include:</p>
<ul>
  <li>free or paid status, amount, and currency;</li>
  <li>each category, option, or package and exactly what it includes;</li>
  <li>pricing-window dates, times, timezone, and qualifying milestone;</li>
  <li>mandatory delivery, taxes, transfer charges, or other required costs;</li>
  <li>optional add-ons clearly separated from required charges;</li>
  <li>payment route, account name, reference instructions, receipt review, and confirmation timing;</li>
  <li>physical-item eligibility, stock, sizing, pickup, delivery area, and estimated fulfilment;</li>
  <li>refund, cancellation, substitution, transfer, and support routes;</li>
  <li>fundraising or sponsor language that accurately describes the arrangement.</li>
</ul>
<p>The <a href="/blog/participant-communication-timeline-virtual-running-events">participant communication timeline</a> helps carry accurate price, payment, fulfilment, and change information after registration. The <a href="/blog/how-to-promote-a-virtual-run">promotion guide</a> explains how to bring suitable participants to the authoritative page without reducing the offer to a price graphic.</p>
<p>When price or a material inclusion changes, update event fields, rules, campaign and partner copy, and support answers together. Record the change and decide how affected registrants will be handled.</p>

<h2>Test the complete paid-registration journey</h2>
<p>Before publishing, use representative test cases for every distance, custom option, package, pricing window, delivery choice, and participant location. Confirm the visible amount, currency, inclusions, required information, payment instructions, receipt state, organizer review, confirmation, and participant return path.</p>
<p>For HelloRun paid events, verify that the payment QR, account name, instructions, and configured prices are ready. Dated pricing periods must fit within registration, not overlap, and expose a valid price when people are allowed to register. The selected amount is stored with the registration so later configuration changes do not silently redefine the original selection.</p>
<p>Testing confirms configured behavior, not legal compliance or market demand. Ask someone outside the setup team to explain the total cost and inclusions without coaching. If two people reach different totals, the page is not ready.</p>

<h2>Frequently asked questions</h2>
<h3>What is a normal virtual run registration fee?</h3>
<p>There is no dependable universal amount. Format, country, audience, physical items, support, delivery, fundraising, taxes, and organizer model differ. Build the event's own cost and value scenarios instead of copying a headline fee.</p>
<h3>Should longer distances cost more?</h3>
<p>Only when the higher amount corresponds to a real, understandable difference in cost or value. Distance alone does not prove higher operating cost.</p>
<h3>Does HelloRun collect the registration payment?</h3>
<p>No. In the current workflow, the organizer provides an external payment route, the participant may upload a receipt, and the organizer reviews payment evidence. HelloRun records the configured amount and states; it does not directly process the transfer.</p>

<h2>Official and platform sources</h2>
<p>This guide was reviewed in September 2026 against current HelloRun event pricing, registration-price resolution, payment-receipt review, delivery settings, readiness checks, and organizer event-page behavior. External sources provide general planning and Philippine regulatory context; they do not determine a suitable fee for a particular event.</p>
<ul>
  <li><a href="https://legacy.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point">US Small Business Administration: Break-even Point</a>.</li>
  <li><a href="https://ecommerce.dti.gov.ph/wp-content/uploads/2024/06/Joint-Administrative-Order-No.-24-03-1.pdf">DTI and partner agencies: Implementing Rules and Regulations of the Internet Transactions Act</a>.</li>
  <li><a href="https://www.bsp.gov.ph/Pages/PAYMENTS%20AND%20SETTLEMENTS/National%20Retail%20Payment%20System/The-Regulatory-Framework.aspx">Bangko Sentral ng Pilipinas: National Retail Payment System Regulatory Framework</a>.</li>
  <li><a href="https://privacy.gov.ph/data-privacy-act/">National Privacy Commission: Data Privacy Act of 2012</a>.</li>
  <li><a href="https://fairtrade.dti.gov.ph/about/business-regulations/sales-promotion-division/">DTI Fair Trade Enforcement Bureau: Sales Promotion Division</a>.</li>
  <li><a href="https://bir-cdn.bir.gov.ph/BIR/pdf/RR%20No.%207-%202024.pdf">Bureau of Internal Revenue: Revenue Regulations No. 7-2024 on invoicing</a>.</li>
</ul>
<p>Pricing, supplier terms, payment-provider fees, tax rules, consumer requirements, and platform behavior can change. Recheck current authoritative sources and obtain qualified advice for the organizer's legal form, funding model, location, and transactions.</p>

<h2>Calculate before you publish</h2>
<p>Build conservative and expected cost scenarios, decide whether the event should be free, paid, sponsored, subsidized, or packaged differently, and verify that the public offer matches what the team can deliver. Then <a href="/organizer/create-event">create or update the HelloRun event</a> and test every configured price before submitting it for review.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Start with your actual event costs',
  'What are participants paying for?',
  'Choose between a free and paid virtual run',
  'List every common cost category',
  'Price a digital-only event',
  'Price medals and physical kits',
  'Account for payment and transfer costs',
  'Separate shipping and fulfilment',
  'Budget organizer time and participant support',
  'Price different distance categories fairly',
  'Use early-bird and promotional pricing carefully',
  'Avoid hidden fees',
  'Build an example pricing worksheet',
  'Check break-even and cash flow separately',
  'Plan margin, contingency, and fundraising honestly',
  'Explain the fee on your event page',
  'Test the complete paid-registration journey',
  'Frequently asked questions',
  'Official and platform sources',
  'Calculate before you publish'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/organizer/create-event"',
  'href="/blog/participant-communication-timeline-virtual-running-events"',
  'href="/blog/how-to-design-fair-distance-categories-and-challenge-goals"',
  'href="/blog/how-to-write-clear-virtual-run-rules-participants-can-follow"',
  'href="/blog/how-to-promote-a-virtual-run"'
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
  if (/<h[12]>How Much Should You Charge for a Virtual Run\?<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/every virtual run should (?:cost|charge)|the universal virtual run fee is|all virtual runs cost/i.test(text)) errors.push('article must not prescribe a universal registration fee');
  if (/this formula is the only valid pricing method|always divide costs by participants and charge that exact amount/i.test(text)) errors.push('article must not present one formula as universal');
  if (/hide (?:the )?(?:shipping|delivery|payment|mandatory|transfer) fee|reveal (?:the )?(?:fee|charge) only after payment/i.test(text)) errors.push('article must not endorse hidden fees');
  if (/(?:this|our) (?:worksheet|formula|fee|strategy) guarantees? (?:a profit|break-even|registrations|fundraising)|profit is guaranteed/i.test(text)) errors.push('article must not guarantee financial outcomes');
  if (/shipping is always included|every event includes delivery/i.test(text)) errors.push('article must not claim universal shipping treatment');
  if (/longer distances? (?:must|should always) cost more/i.test(text)) errors.push('article must not require higher distance pricing');
  if (/every event (?:must|should) use early[- ]bird pricing|early[- ]bird pricing is always required/i.test(text)) errors.push('article must not require promotional pricing');
  if (/HelloRun directly processes (?:the )?(?:payment|transfer)|HelloRun guarantees payment confirmation/i.test(text)) errors.push('article must not overstate HelloRun payment processing');
  if (/expected participants are guaranteed|follower count guarantees paid registrations/i.test(text)) errors.push('article must not treat demand assumptions as certain');
  if (!/There is no universal virtual run registration fee/i.test(text)) errors.push('article must answer pricing intent immediately');
  if (!/total projected event costs ÷ expected paid participants = estimated base cost per participant/i.test(text)) errors.push('article must include the requested worksheet formula');
  if (!/reviewed in September 2026 against current HelloRun event pricing/i.test(text)) errors.push('article must disclose methodology and date');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }
  if (errors.length) throw new Error(`Invalid virtual-run pricing payload: ${errors.join('; ')}`);
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
