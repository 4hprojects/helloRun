'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='how-to-create-a-virtual-run-certificate';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'How to Create a Virtual Run Certificate Participants Will Value',excerpt:'Design a credible virtual-run certificate that recognizes an approved accomplishment with clear identity, result, organizer, timing, and verification details.',category:'Organizer Guide',tags:Object.freeze(['virtual run certificate','running certificate','finisher certificate','digital run certificate','race completion certificate','certificate design','event recognition','organizer certificate']),seoTitle:'How to Create a Virtual Run Certificate Participants Will Value',seoDescription:'Learn what to include in a virtual run certificate, how to make recognition meaningful, and how organizers can align certificates with verified event completion.',coverImageAlt:'Paper-cut Filipino organizer reviewing a clear digital virtual-run finisher certificate with verification details'});
const RAW_CONTENT_HTML=`
<p>A meaningful <strong>virtual run certificate</strong> connects a named participant to a real accomplishment defined by an event. It states what was completed, who recognized it, when it happened, and—where supported—how someone can verify it. Decoration supports that message; it does not create legitimacy by itself.</p>
<p>Organizers should define eligibility before designing the page. If the event promises recognition for an approved result, the certificate must not be issued merely because someone registered or uploaded an unreviewed file. The wording, data, issuance trigger, correction process, and visual design should all point to the same rules.</p>
<blockquote><strong>The recognition principle:</strong> certify only what the event can truthfully support. A clear, modest claim carries more value than an impressive-looking but ambiguous award.</blockquote>

<h2>What is a virtual run certificate?</h2>
<p>A virtual-run certificate is a digital record of participation, completion, or another event-defined achievement. It may be delivered as a PDF, image, downloadable page, or verifiable online record. The format matters less than the accuracy and durability of the information.</p>
<p>“Certificate of Participation” and “Certificate of Completion” are not interchangeable. Participation may mean a runner joined or logged approved activity. Completion may mean the participant satisfied a stated distance, time, step, or accumulated goal. Define the label in the rules.</p>
<p>A certificate is event recognition, not a government credential, academic qualification, professional license, medical document, or independent guarantee of athletic performance.</p>

<h2>Certificate, medal, and badge serve different roles</h2>
<p>A certificate records a claim in readable form. A medal is a physical keepsake. A digital badge is a compact symbol that may represent progress, membership, or achievement. An event can use all three, but each should describe the same accomplishment consistently.</p>
<p>Do not imply that buying a package earns completion when the rules require verified activity. Separate registration inclusions from earned recognition in promotional copy. The <a href="/blog/how-to-promote-a-virtual-run">virtual-run promotion guide</a> explains why precise promises protect participant trust.</p>
<p>If different tiers receive different items, publish that distinction before registration. A certificate should not unexpectedly replace a promised physical item or add an undisclosed fee.</p>

<h2>Connect recognition to the event rules</h2>
<p>Start with the completion definition. Is the event single-activity, accumulated-distance, steps-based, participation-based, timed, untimed, or category-specific? Which activity types count? What review status qualifies? What happens to corrected, rejected, duplicate, or late evidence?</p>
<p>The <a href="/blog/how-to-write-clear-virtual-run-rules-participants-can-follow">event-rules guide</a> provides a structure for eligible dates, proof, activity types, and completion. Use the same terms in the certificate system. If the rule says “50 km accumulated,” do not label the award “50 km race finisher” unless that is genuinely what was held.</p>
<p>Document whether a certificate can be revoked or regenerated after a correction. Participants should know that verified records can change when fraud, error, or an appeal is resolved.</p>

<h2>Use the participant’s correct display name</h2>
<p>The participant name is usually the visual focus. Pull it from a defined source such as the verified runner profile or registration record. Explain before issuance how participants can correct spelling, accents, spacing, or chosen display identity.</p>
<p>Do not expose legal names unnecessarily when a configured public display name is sufficient. Conversely, do not promise a legal credential if identity was never verified for that purpose. Apply the event’s privacy notice and correction process.</p>
<p>Test short and long names, compound surnames, suffixes, diacritics, and scripts your audience uses. Text must wrap, scale, or reflow without covering other fields.</p>

<h2>State the exact event name</h2>
<p>Use the published event title consistently across registration, rules, result pages, and certificates. Add a series or year only when it distinguishes the event. Avoid unexplained abbreviations that make a shared certificate hard to understand later.</p>
<p>Brand artwork should support rather than replace the name in accessible text. A logo alone may be unreadable, unfamiliar, or unavailable when images fail.</p>
<p>If multiple organizations are involved, state which entity operates the event and which are sponsors or partners. Logo placement must not imply endorsement beyond the agreement.</p>

<h2>Show the distance, category, or goal accurately</h2>
<p>Display the registered or completed category in the unit used by the event: for example, 5K, 10K, 21K, 50 km accumulated, or a step goal. Do not round a verified result upward to claim completion unless the rules explicitly define an accepted tolerance.</p>
<p>For an accumulated challenge, distinguish the target from the approved total. A certificate might state that the runner completed a 50 km goal with a specified verified distance across approved activities. For steps, do not convert to distance unless the event published a valid method.</p>
<p>When a category has no distance, use the truthful category name rather than inventing a metric for visual impact.</p>

<h2>Distinguish completion from an approved result</h2>
<p>A single-activity certificate may show finish time when the event validates it and the display is meaningful. An untimed participation event may omit time. Accumulated events may show approved distance, steps, or activity count instead.</p>
<p>The <a href="/blog/fair-and-consistent-run-proof-review-checklist-for-organizers">proof-review checklist</a> helps reviewers apply the same fields and escalation rules. Certificate issuance should consume the approved record, not re-interpret screenshots independently.</p>
<p>If rank is shown, define the ranking population, tie method, cut-off, and result status. Do not display a “winner” label based on incomplete or provisional standings.</p>

<h2>Include the relevant date or event period</h2>
<p>A single event date may be appropriate for an onsite or one-day race. A virtual challenge may run across a window, and a participant may finish on another date. Decide whether the certificate shows the event date, event period, completion date, approval date, or issuance date.</p>
<p>Label dates clearly and use an unambiguous format. “10/11/26” can mean different dates in different conventions. A form such as “11 October 2026” is easier to interpret internationally.</p>
<p>Do not backdate approval to make a late review look timely. Keep system timestamps for issuance and correction even if the public certificate emphasizes the event period.</p>

<h2>Identify the organizer responsibly</h2>
<p>Include the organizer’s public name and, where appropriate, verified logo or authorized signatory. A signature graphic should not be added without permission. State a role such as Event Director or Organiser rather than leaving an unexplained mark.</p>
<p>Contact information can point to an official support channel, but avoid placing private phone numbers or personal addresses on a widely shared file. Use a durable event or organization domain where possible.</p>
<p>The organizer identity should match the registration and policy pages. A sponsor logo does not transfer responsibility for certificate claims.</p>

<h2>Add a certificate number and verification path</h2>
<p>A unique certificate number helps distinguish records with similar names and categories. It should be generated by the system rather than typed ad hoc. Do not use sensitive personal identifiers, phone numbers, or birth dates as the public code.</p>
<p>A verification URL can show a limited public record: certificate status, participant display identity as permitted, event, achievement, issue date, and reference. A QR code may open that URL, but also print the human-readable certificate number and provide an accessible link elsewhere.</p>
<p>Verification must account for revoked, corrected, regenerated, and not-found states. A decorative QR-like image that resolves nowhere weakens trust.</p>

<h2>Write certificate language that can be defended</h2>
<p>Prefer direct statements: “completed the 10K category,” “recorded 52.4 verified kilometres toward the 50 km goal,” or “participated with four approved activities.” Match the language to stored evidence and the rules.</p>
<p>Avoid “official world record,” “certified athlete,” “internationally accredited,” or health claims unless a qualified authority truly supports them. Do not imply that platform verification confirms identity, route safety, medical fitness, or every moment of an activity.</p>
<p>Keep the body short enough to read. Detailed conditions belong on the verification page and event rules, linked from the certificate.</p>

<h2>Design for readability before decoration</h2>
<p>Create a clear hierarchy: recognition type, participant, accomplishment, event, date, organizer, and verification. Use sufficient spacing and alignment. A textured background or sponsor collage must not compete with the name and result.</p>
<p>The W3C <a href="https://www.w3.org/TR/WCAG22/">Web Content Accessibility Guidelines 2.2</a> specify a minimum contrast ratio of 4.5:1 for normal text and 3:1 for qualifying large text in web content. A certificate PDF is not automatically a web page, but these thresholds provide a useful baseline for visual testing.</p>
<p>Do not communicate status by color alone. Test grayscale, low-brightness screens, and ordinary home printing. Keep important text as actual text where the format supports it.</p>

<h2>Make the certificate work on mobile</h2>
<p>Many participants will first open the file from a message on a phone. Test the certificate at actual handset width, not only on a desktop design canvas. The name, accomplishment, and verification path should remain recognizable without hunting.</p>
<p>A landscape A4 PDF can be attractive for printing but tiny on a portrait phone. Pair it with a responsive verification page or share card rather than forcing one asset to do every job. Never replace the downloadable record with only a low-resolution social image.</p>
<p>W3C guidance on <a href="https://www.w3.org/WAI/WCAG22/Understanding/resize-text">resizable text</a> explains why text should enlarge without loss. PDFs and images have different constraints, so provide a text-based verification alternative and test zoom.</p>

<h2>Choose assets and typography carefully</h2>
<p>Use licensed logos, artwork, fonts, and signatures. Keep source files, permissions, and brand versions organized. Sponsor logos should preserve aspect ratio and receive comparable treatment based on the agreement.</p>
<p>Use a readable typeface with the characters needed for participant names. Limit decorative fonts to short headings. Check font embedding in exported PDFs so another device does not substitute unpredictably.</p>
<p>Compress backgrounds without making small text blurry. Open the final file in multiple viewers and print a sample when printing is promoted.</p>

<h2>Avoid misleading awards and scarcity</h2>
<p>Do not label everyone “Top Finisher,” “Elite,” or “Winner” unless the definition applies. Avoid fake seals, invented accreditation marks, and serial numbers designed only to look governmental.</p>
<p>A certificate may be valuable because it records a personally meaningful goal, not because it pretends to be rare. Recognition copy should respect walkers, run-walk participants, accumulated challengers, and different categories according to the published rules.</p>
<p>The registration price should reflect the whole event service, not a vague claim that a downloadable certificate has high monetary value. The <a href="/blog/virtual-run-registration-fee-pricing">virtual-run pricing guide</a> covers transparent inclusions and costs.</p>

<h2>Issue certificates at the promised milestone</h2>
<p>For a reviewed single-result event, issue after the submission reaches approved status. For accumulated challenges, issue when the configured completion or participation criteria are finalized. Registration, upload, and approval are different milestones.</p>
<p>Tell participants when review closes and when certificates should become available. The <a href="/blog/participant-communication-timeline-virtual-running-events">communication timeline</a> helps coordinate reminders, proof deadlines, review, and recognition.</p>
<p>Plan for generation failures. The approved result should remain valid even if the PDF upload temporarily fails, and support should have a documented way to regenerate without creating a conflicting identity.</p>

<h2>Provide corrections, regeneration, and revocation</h2>
<p>A participant may report a misspelled name, wrong category, or incorrect result. Verify the underlying record, log the change, regenerate the certificate, and keep the same stable identity where the system supports it.</p>
<p>Revocation is appropriate when a certificate should no longer verify, such as after a substantiated invalid result. The public verification page should show a clear revoked state without exposing private investigation details.</p>
<p>Limit organizer access, require authenticated actions, and maintain an audit trail for issuance, regeneration, and revocation. Never silently replace a certificate to conceal an error.</p>

<h2>Test the complete certificate lifecycle</h2>
<p>A design preview proves only that sample data can render. Before launch, create a controlled test registration and move it through the same stages a participant will use: eligible activity, proof submission, organizer review, approval, certificate generation, runner notification, download, and public verification. Confirm that no certificate appears at registration or while the result is still pending.</p>
<p>Repeat the test with a long participant name, the longest event title, each distance or challenge category, a missing optional result, and the maximum sponsor-logo set. Open the PDF on a phone and desktop, use browser or PDF zoom, print in colour and grayscale, scan the verification code, and type the certificate number manually.</p>
<p>Then test failure and correction paths. Temporarily use an invalid asset in a safe test environment, correct a participant name, regenerate the file, and revoke a test record. The old verification state should not continue to present a revoked achievement as current. Support staff should be able to identify the record without asking the participant to post private data publicly.</p>
<p>Record who completed the test, which event configuration was used, the date, and any known limitations. Re-run it after material template, review, storage, notification, or verification changes. A reusable checklist turns certificate quality from a last-minute visual review into an operational control.</p>

<h2>HelloRun’s current certificate workflow</h2>
<p>As of September 13, 2026, HelloRun organizers can configure an event certificate template in draft and publish one active template per event. Current layouts include verified achievement, classic, modern race, minimal, school event, charity run, and split-panel event options.</p>
<p>The builder supports heading, body, footer, signatory name and role; event, organizer, background, signature, and sponsor artwork; colors, font, page size, and orientation; plus display options for distance, finish time, rank, event date, certificate number, verification QR, and logos.</p>
<p>HelloRun issues a normal event certificate after an eligible submission is approved when digital certificates are enabled. Personal Records do not receive event certificates. Certificate generation does not block review completion if generation fails.</p>

<h2>HelloRun handling for accumulated challenges</h2>
<p>For accumulated events, HelloRun finalizes recognition from approved activity totals and configured completion rules. A finisher certificate can state the goal and verified result. A participation certificate can describe approved activity count and verified progress when the event configuration allows that outcome.</p>
<p>The current system assigns a certificate number and verification URL, can show a QR code, produces a PDF, and stores issuance state. It supports regeneration and revocation. Organizers should preview with long names and real category examples before activating a template.</p>
<p>Platform behavior can change. Use the current organizer interface and event settings rather than treating this article as a permanent UI specification.</p>

<h2>Certificate quality checklist</h2>
<ul><li>Recognition type matches the published completion rule.</li><li>Participant display name comes from the intended source.</li><li>Event title, category, result, and dates are accurate.</li><li>Organizer and partner roles are not misleading.</li><li>Certificate number is unique and contains no sensitive identity data.</li><li>Verification handles valid, corrected, regenerated, and revoked records.</li><li>Text hierarchy, contrast, zoom, mobile viewing, and print output are tested.</li><li>Assets and signatures are authorized.</li><li>Issue timing, corrections, and support are communicated.</li><li>The final certificate has been tested from approval through download and verification.</li></ul>

<h2>Frequently asked questions</h2>
<h3>Should every registrant receive a finisher certificate?</h3><p>Only if the event rules define registration itself as the recognized outcome. Otherwise reserve finisher or completion language for participants who satisfy the stated criteria.</p>
<h3>Does a certificate need a QR code?</h3><p>No, but a reliable verification URL and unique reference can strengthen the record. Provide a human-readable alternative.</p>
<h3>Should a certificate show finish time?</h3><p>Only when time is relevant, approved, and presented consistently. Untimed and accumulated events may use other verified metrics.</p>
<h3>Can we add sponsor logos?</h3><p>Yes, with authorization and appropriate hierarchy. Their presence must not imply responsibility or endorsement beyond the agreement.</p>
<h3>When should the file be available?</h3><p>At the milestone promised in the rules and communication plan—commonly after result approval or accumulated-challenge finalization.</p>

<h2>Official and platform sources</h2>
<p>This guide was reviewed in September 2026 against W3C WCAG 2.2 contrast and text-resizing guidance and HelloRun’s current certificate template, approval, generation, verification, regeneration, and revocation implementation. Use recognition to confirm a real accomplishment defined by the event, not simply to add another graphic to the registration package.</p>`;
const REQUIRED_HEADINGS=Object.freeze(['What is a virtual run certificate?','Certificate, medal, and badge serve different roles','Connect recognition to the event rules','Use the participant’s correct display name','State the exact event name','Show the distance, category, or goal accurately','Distinguish completion from an approved result','Include the relevant date or event period','Identify the organizer responsibly','Add a certificate number and verification path','Write certificate language that can be defended','Design for readability before decoration','Make the certificate work on mobile','Choose assets and typography carefully','Avoid misleading awards and scarcity','Issue certificates at the promised milestone','Provide corrections, regeneration, and revocation','HelloRun’s current certificate workflow','HelloRun handling for accumulated challenges','Certificate quality checklist','Frequently asked questions','Official and platform sources']);
const REQUIRED_LINKS=Object.freeze(['href="/blog/how-to-promote-a-virtual-run"','href="/blog/virtual-run-registration-fee-pricing"','href="/blog/participant-communication-timeline-virtual-running-events"','href="/blog/how-to-write-clear-virtual-run-rules-participants-can-follow"','href="/blog/fair-and-consistent-run-proof-review-checklist-for-organizers"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wc=contentText.split(/\s+/).filter(Boolean).length,p={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wc/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(p);return p}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),wc=t.split(/\s+/).filter(Boolean).length;if(wc<2500||wc>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||!p.excerpt||p.excerpt.length>220||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8||p.tags.some(x=>!x||x.length>30))e.push('tags');if(/<h1\b/i.test(p.contentHtml))e.push('h1');if(/registration always earns a finisher certificate|every registrant is a finisher/i.test(t))e.push('completion');if(/certificate guarantees identity|verification proves route safety/i.test(t))e.push('verification');if(/pending result is approved|issue before review regardless/i.test(t))e.push('review');if(!/virtual run certificate/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes('<h2>'+h+'</h2>'))e.push('heading '+h);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push('link '+l);if(e.length)throw new Error('Invalid certificate guide payload: '+e.join('; '));return true}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
