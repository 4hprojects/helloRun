'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'treadmill-vs-outdoor-running';
const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'Treadmill vs Outdoor Running: Which Should Beginners Choose?',
  excerpt: 'Compare treadmill and outdoor running by pace control, weather, route variety, safety, tracking, convenience, and virtual-run eligibility.',
  category: 'Training',
  tags: Object.freeze(['treadmill vs outdoor running','treadmill running','outdoor running','beginner running','indoor running','running pace','virtual run tracking','Philippines running']),
  seoTitle: 'Treadmill vs Outdoor Running: Which Should Beginners Choose?',
  seoDescription: 'Compare treadmill and outdoor running for beginners by pace, weather, safety, tracking, convenience, terrain, and virtual-run participation.',
  coverImageAlt: 'Filipino beginner runner choosing between a bright indoor treadmill and a safe daylight outdoor park route'
});

const RAW_CONTENT_HTML = `
<p><strong>Treadmill vs outdoor running</strong> is not a contest that produces one correct winner. Both are forms of running, and either can support a beginner when the environment, effort, duration, recovery, and safety fit the person and the day's purpose. The useful question is not which one is more “real,” but which option helps you complete the intended session responsibly.</p>
<p>A treadmill offers a controlled belt, repeatable settings, shelter, and convenience. Outdoor running adds changing terrain, turns, weather, navigation, and real-world pacing. Those differences affect how a session feels and how it should be interpreted, but they do not make one option universally better.</p>
<p>This comparison is general education, not medical clearance or an individualized training prescription. Follow equipment instructions, facility policies, current local conditions, event rules, and qualified health advice.</p>

<h2>Both are forms of running</h2>
<p>On a treadmill, you repeatedly support and move your body while the powered belt travels beneath you. Outdoors, you move across the ground and respond to the route. The environments change the task, yet both can involve running mechanics, cardiovascular effort, coordination, and progressive training.</p>
<p>Calling treadmill sessions “fake” can push beginners toward an unsuitable road, dangerous weather, or a route they cannot use consistently. Calling outdoor running unnecessary can overlook event specificity, terrain skills, navigation, and the confidence developed by practicing in the setting where a goal will happen.</p>
<p>Judge a session by its purpose and execution. An easy treadmill run can be more appropriate than a hard outdoor run in unsafe heat. An easy park run can prepare a runner for outdoor conditions that a perfectly controlled belt cannot reproduce.</p>

<h2>Why treadmill running feels different</h2>
<p>The belt sets a continuous speed, the surface and direction remain predictable, and indoor airflow may be limited. Outdoors, pace changes subtly with turns, slopes, wind, surface, congestion, and attention. The same displayed pace can therefore feel different between environments and between machines.</p>
<p>Treadmill calibration, belt condition, deck response, incline, room temperature, ventilation, footwear, and whether a runner holds the rails all influence the experience. Outdoor effort varies with route and weather. A pace number is not a laboratory-controlled comparison.</p>
<p>Use breathing, the talk test, perceived effort, and symptoms alongside pace. The <a href="/blog/beginners-guide-to-running-pace">beginner pace guide</a> explains why an easy effort is personal. Do not force the same number indoors and outdoors simply to prove equivalence.</p>

<h2>Outdoor route variation</h2>
<p>Outdoor routes can include gentle rises, descents, curves, cambers, uneven patches, wind, and surface changes. These variations ask a runner to adjust stride, direction, attention, and effort. Variety may be enjoyable and useful when introduced gradually on a suitable route.</p>
<p>Variation also adds uncertainty. Broken pavement, traffic, dogs, poor lighting, flooding, crowding, construction, and isolated sections can turn an intended easy run into a navigation or safety problem. The <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe-route guide</a> provides a structured assessment.</p>
<p>Beginners do not need the most varied route available. A familiar, short, well-lit loop with easy exits often supports better pacing and decision-making than an ambitious route chosen for scenery or an impressive activity map.</p>

<h2>Pace control on a treadmill</h2>
<p>A treadmill can make steady pacing straightforward because the runner selects a speed. That can reduce repeated checking and help someone learn how a controlled easy effort feels. Speed should begin conservatively, with enough time to understand the controls and settle into movement.</p>
<p>The displayed setting is not a demand. Reduce it when breathing, form, symptoms, heat, or fatigue no longer fit the session. Do not step onto a fast-moving belt, jump onto side rails at speed, or increase pace to match another person's screen.</p>
<p>A fixed number can also make runners too rigid. Bodies do not deliver identical effort every day. Sleep, illness, travel, stress, previous activity, and room conditions matter. For an easy day, use the principles in <a href="/blog/easy-run-explained">Easy Run Explained</a> rather than treating belt speed as the only truth.</p>

<h2>Weather and safety</h2>
<p>Indoor running can avoid lightning, flooding, unsafe heat, poor air, darkness, and traffic when the facility itself is suitable. It is not automatically safe: ventilation, crowding, wet floors, faulty equipment, emergency access, and facility supervision still matter.</p>
<p>Outdoor running provides fresh settings and may be easier to access without a membership, but conditions require a current check. In the Philippines, humidity, strong sun, heavy rain, and rapidly changing local weather can alter effort and route access. Clothing or confidence cannot cancel an official warning.</p>
<p>Choose the safer available environment, shorten or reschedule, walk where appropriate, or rest. A completed training box is never worth ignoring severe weather, an unsafe facility, threatening behavior, or concerning physical symptoms.</p>

<h2>Hills and terrain</h2>
<p>Many treadmills allow incline changes, which can introduce controlled uphill effort without road crossings or a downhill return. Incline settings vary by machine, however, and do not perfectly recreate a particular outdoor hill, surface, wind, or descent.</p>
<p>Outdoor hills require both climbing and controlled descending unless the route or transport removes one direction. Trails and rough surfaces add footing decisions. Introduce these demands gradually, especially when a target event includes them. Avoid chasing a formula that claims one incline makes every treadmill run equal to outdoors.</p>
<p>If the goal is general consistency, a flat or gently changing session can be enough. If the goal is a hilly outdoor event, suitable outdoor practice may improve familiarity, but only within a progressive plan and safe current conditions.</p>

<h2>Boredom, attention, and environment</h2>
<p>Some runners enjoy a treadmill's simplicity; others find a fixed view monotonous. Music, a screen, or a structured session may help, provided audio and visual choices do not interfere with balance, facility awareness, or equipment controls.</p>
<p>Outdoor scenery and changing landmarks can make time feel different. They also demand attention to people, vehicles, surfaces, directions, and weather. Do not become so absorbed in an app, conversation, or photo that you stop observing the route.</p>
<p>Preference matters because a usable routine is easier to repeat. Preference is not a safety exemption. Choose a lawful, appropriate environment and make the session simple enough that attention remains available for the task.</p>

<h2>Convenience, cost, and access</h2>
<p>A home or building treadmill can remove travel time and make short sessions easier around work, school, caregiving, or holiday commitments. A gym can add fees, opening hours, queues, transport, clothing rules, and guest restrictions. Home equipment adds purchase, maintenance, space, electricity, and household-safety responsibilities.</p>
<p>Outdoor running may appear free, yet a suitable route can require transport, daylight, visibility gear, or access fees. Neither environment has one universal cost. Compare the total practical burden in your own setting.</p>
<p>The best option is often the one you can access safely without creating repeated conflict. A twenty-minute suitable session close to home may serve consistency better than an idealized route or facility that consumes most of the available time.</p>

<h2>Comfort and accessibility needs</h2>
<p>A predictable treadmill surface, nearby toilet, controlled lighting, handrails for entry, or climate control may make indoor activity more usable for some runners. Others may find machine noise, fluorescent lighting, crowds, belt motion, or gym access difficult. Outdoor routes also vary widely in curb cuts, surface quality, gradients, seating, lighting, and transport.</p>
<p>Accessibility cannot be inferred from the label “indoor” or “park.” Ask the facility about step-free entry, equipment spacing, assistance policies, changing areas, and emergency procedures. Inspect an outdoor route for continuous access, suitable crossings, rest points, and return options rather than assuming a mapped path is unobstructed.</p>
<p>Adaptations should match the individual and may require professional input. Do not pressure someone to use a treadmill because it appears controlled or to run outdoors because it appears more natural. The person using the environment is the best source on sensory, mobility, communication, and dignity needs.</p>

<h2>GPS tracking differences</h2>
<p>Outdoor watches and phone apps commonly estimate distance from changing position. Buildings, trees, device placement, signal quality, sampling, and software can affect the recorded track. The <a href="/blog/how-accurate-is-phone-gps-for-running">phone GPS accuracy guide</a> explains why small errors do not justify unsafe extra distance.</p>
<p>Standard GPS cannot measure ordinary treadmill travel in the same way because the runner stays in one location. Watches may estimate indoor distance from arm motion, cadence, calibration, or connected equipment. The treadmill displays its own estimate. Those figures can disagree.</p>
<p>The <a href="/blog/gps-watch-vs-running-app">GPS watch versus app guide</a> compares tools without promising exactness. Keep the original record, label the activity honestly, and follow the event's correction or review process rather than altering evidence.</p>

<h2>Treadmill distance and screenshots</h2>
<p>A treadmill console may show time, distance, speed, incline, and energy estimates, but the exact fields and reset behavior differ. A photo of the console can be useful when rules request it, yet it does not automatically prove identity, date, or uninterrupted completion.</p>
<p>This article does not duplicate submission mechanics. The dedicated <a href="/blog/how-to-record-a-treadmill-run-for-a-virtual-event">treadmill virtual-event guide</a> explains how to check accepted proof, capture required fields, preserve privacy, and handle mismatches.</p>
<p>Never photograph another person's activity, reuse an old display, change a device record to match the console, or assume a screenshot qualifies. If the machine resets unexpectedly, keep honest available evidence and contact the organizer.</p>

<h2>Training for outdoor events</h2>
<p>A treadmill can build consistent running time and support parts of an outdoor-event plan, especially when weather or route access is limited. It cannot reproduce every turn, surface, crowd, temperature, wind, aid station, or pacing decision in the event environment.</p>
<p>When safe and appropriate, some gradual practice on a representative outdoor surface can help with footwear, route attention, effort changes, and logistics. “Representative” does not mean copying the hardest section immediately. Begin with manageable exposure and preserve recovery.</p>
<p>If outdoor practice is unavailable, be honest about the gap rather than compensating with extreme incline or excessive volume. Adjust the goal, choose a more suitable event, or seek qualified coaching for individual planning.</p>

<h2>Using both during one training plan</h2>
<p>A mixed approach can use the treadmill for a short easy run during bad weather and a safe outdoor route for event-specific practice. It can also use outdoor running for variety and a treadmill when daylight, transport, or caregiving makes the route impractical.</p>
<p>Do not turn access to two environments into twice the training. Sessions still accumulate. Track total running, harder efforts, time on feet, strength work, ordinary walking, sleep, and recovery rather than treating indoor and outdoor kilometres as separate budgets.</p>
<p>Keep transitions conservative. The first outdoor run after many treadmill sessions may feel unfamiliar, and a first treadmill session requires learning controls and balance. Reduce ambition while adapting, then assess how you respond later that day and afterward.</p>

<h2>Starting safely on a treadmill</h2>
<p>Read the machine and facility instructions. Identify the stop control and safety key where present, secure loose clothing, tie laces, keep towels and bottles away from the belt, and leave adequate space behind the machine. Children and pets should not have unsupervised access.</p>
<p>Step on while the belt is stopped or moving only as the manufacturer's instructions permit. Begin at a walking speed, look forward, and use the rails briefly for entry or balance rather than supporting the workout at a setting you cannot control.</p>
<p>Stop the belt before stepping away. Report damage, slipping, unusual noise, overheating, or an unreliable control. Familiarity with one treadmill does not guarantee another has the same buttons, speed units, or emergency behavior.</p>

<h2>Starting safely outdoors</h2>
<p>Choose a known legal route, appropriate daylight or lighting, manageable weather, and a surface that fits your experience. Tell a trusted person relevant plans where appropriate, carry essential identification and communication, and preserve route privacy when sharing activities.</p>
<p>Warm up by beginning easily rather than using the first kilometre as a test. Observe crossings, dogs, congestion, construction, water, and changing sky conditions. Turn back or use an exit before a concern becomes harder to manage.</p>
<p>Do not assume a popular route is suitable at every hour. Current local information matters. A shorter loop with clear return options is often a better beginner choice than a remote out-and-back.</p>

<h2>How to choose for today's session</h2>
<ol><li>State the purpose: easy running, general time, event-specific practice, or another goal.</li><li>Check health, fatigue, soreness, sleep, and recovery.</li><li>Assess outdoor weather, daylight, route access, traffic, and air.</li><li>Assess treadmill access, machine condition, ventilation, rules, and time.</li><li>Choose a conservative duration and effort.</li><li>Confirm the tracking method and any event rule before starting.</li><li>Keep a walking, shorter, rescheduled, or rest option.</li><li>Review response afterward instead of declaring one environment permanently superior.</li></ol>
<p>A simple decision can change from day to day. Consistency comes from making suitable choices repeatedly, not from pledging loyalty to one surface.</p>

<h2>Virtual-run event rules decide treadmill eligibility</h2>
<p>A treadmill activity may count for one virtual event and be excluded from another. Rules may specify activity type, app record, console photo, date, time, minimum distance, manual entries, or whether accumulated sessions qualify.</p>
<p>Read the live event page before starting. Do not rely on a previous HelloRun event, a social-media comment, or another participant's assumption. If wording is unclear, contact the organizer through the official support route and retain the response.</p>
<p>Training value and event eligibility are separate. A treadmill run can be personally useful even when a particular category requires an outdoor GPS activity. Never fabricate proof to make a suitable training session fit an unsuitable rule.</p>

<h2>When to stop and seek help</h2>
<p>Stop exercise and seek urgent help for chest pressure, fainting, confusion, severe or unusual breathlessness, sudden weakness, loss of coordination, or other emergency signs. Use the facility's emergency procedure or the appropriate local service.</p>
<p>Persistent or worsening pain, swelling, numbness, weakness, changed gait, fever, or reduced ordinary function deserves qualified assessment. Do not use the controlled treadmill environment or outdoor fresh air as a reason to override symptoms.</p>
<p>People with health conditions, pregnancy, recent illness or injury, medication questions, or uncertainty about exercise should seek appropriately qualified individual guidance.</p>

<h2>Frequently asked questions</h2>
<h3>Is treadmill running as good as outdoor running?</h3><p>It can be equally legitimate running, but “as good” depends on the goal. Outdoor-event preparation may benefit from suitable outdoor practice; consistency during unsafe weather may favor a treadmill.</p>
<h3>Is running on a treadmill easier?</h3><p>Not universally. Belt settings, ventilation, familiarity, pace, incline, and outdoor conditions change effort. Compare by purpose and perceived effort, not one pace alone.</p>
<h3>Should beginners use an incline?</h3><p>There is no required universal incline. Learn safe controls and easy effort first. Avoid formulas claiming one setting exactly reproduces outdoors.</p>
<h3>Can treadmill runs count for virtual races?</h3><p>Only when the specific event rules accept them and the submitted proof meets those rules.</p>
<h3>Can I switch between treadmill and outdoor running?</h3><p>Yes. Keep total load and recovery visible, and make the first sessions in a less familiar environment conservative.</p>

<h2>Official sources and final takeaway</h2>
<p>The <a href="https://www.cdc.gov/physical-activity/php/about/measuring-physical-activity-intensity.html">CDC guide to measuring physical-activity intensity</a> explains relative effort and the talk test. The <a href="https://health.gov/paguidelines/second-edition/pdf/Physical_Activity_Guidelines_2nd_edition.pdf">U.S. Physical Activity Guidelines</a> emphasize starting from current activity and progressing over time; population guidance does not prescribe your personal treadmill speed, incline, outdoor route, or schedule.</p>
<p>Use the environment that supports the day's purpose, then check the event rules before assuming a treadmill activity is eligible. The sound choice is the one that fits current conditions, honest tracking, manageable effort, and recovery.</p>
`;

const REQUIRED_HEADINGS = Object.freeze(['Both are forms of running','Why treadmill running feels different','Outdoor route variation','Pace control on a treadmill','Weather and safety','Hills and terrain','Boredom, attention, and environment','Convenience, cost, and access','Comfort and accessibility needs','GPS tracking differences','Treadmill distance and screenshots','Training for outdoor events','Using both during one training plan','Starting safely on a treadmill','Starting safely outdoors',"How to choose for today's session",'Virtual-run event rules decide treadmill eligibility','When to stop and seek help','Frequently asked questions','Official sources and final takeaway']);
const REQUIRED_LINKS = Object.freeze(['href="/blog/how-to-record-a-treadmill-run-for-a-virtual-event"','href="/blog/how-to-choose-a-safe-route-for-your-virtual-run"','href="/blog/beginners-guide-to-running-pace"','href="/blog/how-accurate-is-phone-gps-for-running"','href="/blog/gps-watch-vs-running-app"','href="/blog/easy-run-explained"']);

function buildArticlePayload({ coverImageUrl } = {}) {
  const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wordCount=contentText.split(/\s+/).filter(Boolean).length;
  const payload={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wordCount/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};
  validateArticlePayload(payload); return payload;
}
function validateArticlePayload(payload) {
  const errors=[],text=String(payload.contentText||''),words=text.split(/\s+/).filter(Boolean).length;
  if(words<2500||words>3000)errors.push('article must contain 2500-3000 substantive words');
  if(!payload.ogImageUrl)errors.push('cover artwork is required');
  if(!payload.title||!payload.excerpt||!payload.seoDescription)errors.push('metadata');
  if(!payload.contentHtml||payload.contentRaw!==payload.contentText)errors.push('content');
  if(!Array.isArray(payload.tags)||payload.tags.length!==8)errors.push('tags');
  if(/treadmill is always safer|run through pain|ignore severe weather/i.test(text))errors.push('unsafe comparison');
  if(/guarantees? exact distance|one percent incline exactly/i.test(text))errors.push('guarantee');
  if(!/treadmill vs outdoor running/i.test(text))errors.push('intent');
  for(const heading of REQUIRED_HEADINGS)if(!payload.contentHtml.includes(`<h2>${heading}</h2>`))errors.push(`heading ${heading}`);
  for(const link of REQUIRED_LINKS)if(!payload.contentHtml.includes(link))errors.push(`link ${link}`);
  if(errors.length)throw new Error(`Invalid treadmill comparison payload: ${errors.join('; ')}`); return true;
}

module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
