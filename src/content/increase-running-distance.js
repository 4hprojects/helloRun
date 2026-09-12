'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');
const CANONICAL_SLUG = 'how-to-increase-running-distance';
const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Increase Running Distance Without Adding Too Much Too Soon',
  excerpt: 'Build from your recent normal running by changing one variable at a time, keeping added distance easy, protecting recovery, and repeating levels before progressing again.',
  category: 'Training',
  tags: Object.freeze(['how to increase distance','increase running distance','run farther beginners','build running endurance','increase weekly distance','running progression','long run distance','running Philippines']),
  seoTitle: 'How to Increase Running Distance Without Adding Too Much Too Soon',
  seoDescription: 'Learn practical ways to increase running distance gradually by adjusting one part of your routine at a time, using easy effort, recovery, and realistic weekly planning.',
  coverImageAlt: 'Linocut collage of a Filipino beginner running across small route segments beside a tropical bay, with a walking lane and recovery bench'
});

const RAW_CONTENT_HTML = `
<p>To learn <strong>how to increase running distance</strong>, begin with what you have repeated in ordinary recent weeks, then change one part of the routine at a time. Add a modest amount to one easy activity, keep the rest familiar, watch the response during the following day or two, and repeat or step back before progressing again. You do not need a dramatic weekly jump.</p>
<p>Distance is only one part of demand. Effort, time, hills, heat, humidity, surface, frequency, sleep, work, illness, and recovery all change what a kilometre costs. A sensible progression accounts for the whole week instead of treating an app total as the only truth.</p>
<blockquote><strong>The practical sequence:</strong> establish a repeatable baseline → extend one variable → keep the effort controlled → recover and review → repeat, reduce, or progress.</blockquote>

<h2>Start from your recent normal running</h2>
<p>Review four to six ordinary weeks, including disrupted ones. Note how often you ran or walked, the durations and distances that felt controlled, terrain and conditions, and how daily life felt afterward. Your baseline is not the largest activity in the history screen. It is the level you can usually complete without racing or borrowing heavily from the next days.</p>
<p>If activity has been irregular, rebuilding regular short opportunities may come before adding distance. If you previously ran farther, treat that history as context rather than current capacity. Illness, injury, surgery, pregnancy or postpartum status, medicines, disability, and time away can change what is appropriate.</p>
<p>Write a plain baseline: “During three of the last four ordinary weeks, I completed two easy run-walk outings of about thirty minutes and recovered normally.” That sentence is more useful than “I once finished 10K.” The first describes something repeatable; the second describes one result.</p>

<h2>Increase one variable at a time</h2>
<p>You can increase the duration of one outing, total weekly time, distance, frequency, hills, or speed. Changing several together hides which change created difficulty. Keep most of the week stable while testing one small extension.</p>
<p>For example, add a short familiar loop to one easy activity while leaving pace, route type, shoes, and other activity unchanged. Or keep distance steady while trying a hillier route. Do not call the second week “no increase”: the terrain increased demand even if the kilometres did not.</p>
<p>The <a href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school">weekly running schedule guide</a> helps distinguish fixed commitments, suitable windows, backups, and unavailable days. Progress that exists only in an ideal week is not yet a resilient plan.</p>

<h2>Why large distance jumps can cause problems</h2>
<p>A sudden jump may turn an easy run into a hard effort, extend fatigue, disturb sleep or daily tasks, or make the rest of the week impossible to complete. It can also expose route, food, fluid, equipment, and weather problems that shorter outings did not reveal. No single symptom proves the cause, but the pattern is useful information.</p>
<p>More is not automatically better. The purpose is to create a level that becomes normal enough to support the next decision. Repeated overshooting produces little stable evidence because each week begins from incomplete recovery or a changed plan.</p>
<p>Population activity guidance supports gradual progression, but population guidance is not a personal training plan. The <a href="https://health.gov/paguidelines/second-edition/pdf/Physical_Activity_Guidelines_2nd_edition.pdf">U.S. Physical Activity Guidelines</a> advises inactive people to begin with smaller amounts and increase over weeks to months. It does not prescribe your kilometres, weekly percentage, or race date.</p>

<h2>The 10 percent rule is not a universal law</h2>
<p>The often-repeated 10 percent rule is a heuristic, not a safety guarantee. It does not account for whether the starting week was appropriate, how distance is distributed, or whether speed, hills, heat, strength work, and life stress also changed. Ten percent of an unsustainable baseline remains unsustainable.</p>
<p>Percentages can describe a plan, but they cannot approve it. A runner moving from a tiny baseline may find a percentage impractical; another maintaining substantial volume may find the same percentage too large. Prefer modest, observable changes with deliberate repeat weeks and permission to reduce.</p>

<h2>Keep most added distance easy</h2>
<p>Added distance is easier to interpret when effort stays controlled. Begin slowly, use a pace that permits steady breathing and conversation where appropriate, and resist turning the final segment into a test. The CDC recommends that people <a href="https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html">start slowly and work toward more time or challenge</a>; that principle does not create one correct running pace.</p>
<p>Heat, hills, wind, crossings, surface, and fatigue may make the same pace harder. Slow down or walk rather than chasing last week’s screen. The <a href="/blog/beginners-guide-to-running-pace">beginner pace guide</a> explains relative effort and why comparison pace is a weak progression rule.</p>

<h2>Extend one weekly run gradually</h2>
<p>One simple approach is to keep familiar shorter activities and extend only one easy outing. The <a href="/blog/what-is-a-long-run-for-beginners">beginner long-run guide</a> defines that outing relative to your normal week, not by a fixed threshold.</p>
<p>Add a small route segment or a modest block of time, then repeat that level until it fits. A repeat week is active evidence gathering, not stagnation. You are learning whether effort remained easy, the route worked, recovery was ordinary, and the other planned opportunities still fit.</p>
<p>A step-back week may shorten the longer activity or reduce total demand. It can follow several building weeks, travel, exams, peak work, poor sleep, difficult weather, or a response that needs attention. It does not erase adaptation or discipline.</p>

<h2>Use run-walk when it supports control</h2>
<p>Walking is a legitimate way to manage a longer duration. Begin a practised run-walk pattern early instead of using walking only after exhaustion. You can choose time intervals, landmarks, terrain, or effort cues.</p>
<p>The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">Run-Walk Method guide</a> presents flexible options without prescribing one ratio. Walking may also be appropriate at hills, crossings, water stops, crowded paths, or slippery areas. If distance is for an event, confirm its accepted activities; personal progress and event eligibility are separate questions.</p>

<h2>Protect recovery days</h2>
<p>Adding distance creates a reason to protect recovery, not remove it. Place easier time after the changed activity and avoid adding another demanding session simply because the calendar has an empty box. The NHS <a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/">Couch to 5K plan</a> illustrates beginner progression with walking, running, and rest days between runs. Its exact schedule is an example, not a universal prescription.</p>
<p>Recovery can include ordinary movement, food, fluids, sleep, and reduced training demand according to individual needs. The <a href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back">post-run recovery guide</a> offers a decision framework for rest and easing back without promising injury prevention.</p>

<h2>Do not automatically replace missed distance</h2>
<p>A missed run is not distance debt. Do not add its kilometres to the next outing, double sessions, remove rest, or compress two progression weeks into one. The reason for the miss matters: schedule conflict may permit a suitable backup, while illness, symptoms, unsafe conditions, or poor recovery may call for rest or guidance.</p>
<p>Resume from a level that remains manageable now. If several weeks are missed, reassess the baseline rather than returning automatically to the abandoned endpoint. A calendar is a planning tool, not a command to preserve arithmetic.</p>

<h2>Adjust for hills, heat, and schedule changes</h2>
<p>Five flat cool kilometres and five hilly humid kilometres are not the same demand. When the route becomes harder, hold or shorten distance. When work, school, caregiving, or travel increases, maintaining a familiar level may be progression in consistency.</p>
<p>In the Philippines, consult current local forecasts, warnings, and <a href="https://pagasa.dost.gov.ph/weather/heat-index">DOST-PAGASA heat-index information</a>. Change the time, route, venue, pace, duration, or activity when heat, lightning, flooding, visibility, air quality, or surface conditions are unsuitable. Official warnings and real conditions overrule the spreadsheet.</p>
<p>Prefer a familiar route with safe crossings, lighting, exits, shade, water access, signal, and transport options appropriate to the outing. Tell a trusted person the route and expected return when useful. Extending by short loops can preserve exit options better than committing to a distant turnaround.</p>

<h2>Watch how the next day feels</h2>
<p>Review the activity during it, later that day, and over the next day or two. Record broad effort, symptoms, soreness, sleep, appetite, mood, movement, normal responsibilities, and willingness to repeat. No single signal or wearable score decides suitability.</p>
<p>Ordinary temporary tiredness can occur, but severe, sudden, unexplained, recurrent, or worsening symptoms are not a progression challenge. Stop and seek urgent help for possible emergency signs such as chest pressure or pain, fainting, severe breathing difficulty, confusion, or sudden weakness. This list cannot rule out an emergency.</p>
<p>Pause and obtain appropriate guidance when pain changes movement, symptoms persist, or recovery repeatedly disrupts daily life. This guide is educational and cannot diagnose, provide clearance, rehabilitate an injury, or replace individualized professional advice.</p>

<h2>A flexible four-stage distance cycle</h2>
<ol>
  <li><strong>Establish.</strong> Repeat the recent normal level and make route, schedule, and effort dependable.</li>
  <li><strong>Extend.</strong> Add one modest time or distance segment to one easy outing.</li>
  <li><strong>Consolidate.</strong> Repeat the new level while keeping the broader week manageable.</li>
  <li><strong>Review.</strong> Progress, repeat, reduce, or pause based on conditions and recovery.</li>
</ol>
<p>This is not a required four-week cycle. Each stage may take multiple weeks, and you may move backward. The framework exists to separate decisions that social-media plans often collapse into “add more.”</p>
<p>Track planned versus completed activity honestly. Phone and GPS-watch distance can vary with signal, pauses, trees, buildings, tight turns, settings, and processing. Use trends from comparable outings rather than forcing extra laps to make an imperfect device display a round number.</p>

<h2>Moving from 5K toward 10K</h2>
<p>Before building beyond 5K, ask whether 5K or comparable easy time is repeatable rather than a one-time maximum. A progression may keep one or two familiar opportunities while extending one, then use consolidation and step-back periods. The <a href="/blog/10k-training-plan-for-beginners">beginner 10K guide</a> provides an illustrative eight-week framework, not a guaranteed or universally suitable timeline.</p>
<p>You do not need to run 10K hard in training to prove worthiness. Practise controlled effort, walking strategy if used, route and equipment, and recovery. If the chosen event date would require large jumps or missed-week compression, select a later date or keep the goal personal.</p>

<h2>Moving from 10K toward 21K</h2>
<p>A half marathon is not merely “two 10Ks plus a little.” Longer duration increases route-support, weather, food, fluid, equipment, tracking, and recovery demands. Begin from a repeatable shorter-distance base; one difficult 10K does not establish it.</p>
<p>The <a href="/blog/21k-half-marathon-for-beginners">beginner 21K guide</a> describes an illustrative twelve-week bridge for an established beginner. If the base is missing, the calendar does not make the deadline appropriate. Extending the runway is a valid distance decision.</p>

<h2>A weekly distance review</h2>
<ul>
  <li>What level was genuinely repeatable before this week?</li>
  <li>Which one variable changed?</li>
  <li>Did added distance stay at the intended effort?</li>
  <li>Did terrain or weather increase demand unexpectedly?</li>
  <li>How did later recovery and ordinary responsibilities feel?</li>
  <li>Did the rest of the week remain manageable?</li>
  <li>Should the next week extend, consolidate, reduce, or pause?</li>
</ul>
<p>Answer without treating a reduction as failure. Good progression is a series of informed revisions. The aim is not the steepest chart; it is a running pattern that supports the next suitable distance.</p>

<h2>Three illustrative progression decisions</h2>
<h3>From short run-walk outings to a longer loop</h3>
<p>Mara has repeated two thirty-minute run-walk outings during ordinary weeks. Instead of adding a third run, removing walks, and making both outings longer, she adds one short familiar loop to only one outing. She begins her usual run-walk pattern immediately and keeps the other opportunity unchanged. After two repeats, she reviews effort and next-day function before deciding again.</p>
<h3>Holding distance when the route becomes hillier</h3>
<p>Joel usually completes flat park routes but will spend a week in a hilly province. He keeps the planned time shorter, walks steeper sections, and does not chase his flat-route kilometres. The lower number is not lost fitness; terrain changed the demand. His next ordinary week returns to the established baseline rather than “repaying” missing distance.</p>
<h3>Extending a goal after illness</h3>
<p>Lea planned to build from 5K toward 10K, then missed two weeks with illness. She does not resume at the next calendar distance. Once appropriate to return, she reassesses easy activity, repeats a shorter level, and moves the event goal later. The original dates were an estimate, not an obligation.</p>
<p>These fictional examples demonstrate choices, not individualized schedules or predictions. Their common feature is changing the plan when the evidence changes.</p>

<h2>When progress appears to stall</h2>
<p>A flat distance chart does not necessarily mean nothing is improving. The same route may feel more controlled, require fewer unplanned stops, fit the workday better, or leave more ordinary energy afterward. Those changes can make a later extension more sustainable.</p>
<p>If every attempted increase repeatedly feels unmanageable, review the premise rather than forcing it. The baseline may not yet be stable; easy effort may be too hard; the route or conditions may add hidden demand; sleep or schedule may be limiting; symptoms may need appropriate assessment; or the goal date may be too close. Change the relevant constraint, not every variable.</p>
<p>You can also hold distance and build consistency. Protecting two manageable opportunities across a busy month may contribute more to future endurance than alternating one oversized week with one inactive week. Progress should serve your life and purpose, not merely produce a rising graph.</p>

<h2>Prepare the practical details before adding kilometres</h2>
<p>Longer outings can move beyond the water, toilets, shade, lighting, traffic pattern, and phone coverage you know. Preview the added segment, identify turn-back points, and carry suitable essentials. Do not assume a route is safe because an app displays it or another runner uploaded it.</p>
<p>Use familiar shoes and clothing when testing a new distance. If you also need to test equipment, keep the extension conservative so two experiments do not compete. For food and fluids, individual needs vary with duration, conditions, health, medicines, and normal eating. There is no universal drink volume or feeding schedule for every beginner.</p>
<p>For virtual events, confirm the activity window and proof requirements before the attempt. A tracker record may support a submission, but recorded, submitted, pending, and approved are different states. Never add unsafe distance merely to compensate for GPS uncertainty or to force a round display total.</p>

<h2>Frequently asked questions</h2>
<h3>How quickly should I increase running distance?</h3>
<p>There is no universal rate. Start from recent repeatable activity, change one variable modestly, then review effort, conditions, recovery, and the broader week before changing again.</p>
<h3>Should I add distance every week?</h3>
<p>No. Repeat and step-back weeks are useful. Schedule, health, weather, terrain, and recovery can justify holding or reducing distance.</p>
<h3>Can I add distance by walking?</h3>
<p>Yes for personal activity. Walking or run-walk can extend controlled time on feet. Event rules separately determine whether an activity is eligible.</p>
<h3>What if the added distance feels too hard?</h3>
<p>Slow down, walk, shorten, use an exit, or stop as circumstances require. Review whether the extension, effort, route, conditions, or starting baseline needs to change.</p>
<h3>Does a watch decide when I am ready?</h3>
<p>No. A watch records estimates and may offer suggestions; it does not know every health, recovery, weather, route, or life factor and does not provide medical clearance.</p>

<h2>Choose the next distance you can repeat</h2>
<p>Increase distance from reality: establish the current baseline, change one main variable, keep additions easy, protect recovery, and use repeat or step-back weeks. Do not let a percentage, missed total, device, or deadline make the decision alone.</p>
<p>When you want an event checkpoint, <a href="/events">browse current HelloRun events</a> and read the live distance, dates, accepted activity, proof, review, route, and recognition details. Choose your next distance goal based on what you can repeat consistently, not the biggest number available. Registration itself does not establish readiness.</p>

<h2>Official sources and review note</h2>
<p>This guide was reviewed in September 2026 against current U.S. Physical Activity Guidelines, CDC getting-started guidance, the NHS Couch to 5K structure, and DOST-PAGASA heat-index information. These sources support gradual, contextual progression and the specific principles attributed to them; they do not prescribe the article’s examples or make any distance individually appropriate.</p>
`;

const REQUIRED_HEADINGS = Object.freeze(['Start from your recent normal running','Increase one variable at a time','Why large distance jumps can cause problems','The 10 percent rule is not a universal law','Keep most added distance easy','Extend one weekly run gradually','Use run-walk when it supports control','Protect recovery days','Do not automatically replace missed distance','Adjust for hills, heat, and schedule changes','Watch how the next day feels','Moving from 5K toward 10K','Moving from 10K toward 21K','Frequently asked questions','Official sources and review note']);
const REQUIRED_LINKS = Object.freeze(['href="/events"','href="/blog/what-is-a-long-run-for-beginners"','href="/blog/10k-training-plan-for-beginners"','href="/blog/21k-half-marathon-for-beginners"','href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school"','href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back"','href="/blog/run-walk-method-beginner-friendly-way-build-endurance"']);

function buildArticlePayload({coverImageUrl}={}) { const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(); const contentText=htmlToPlainText(contentHtml); const wordCount=contentText.split(/\s+/).filter(Boolean).length; const payload={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wordCount/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt}; validateArticlePayload(payload); return payload; }
function validateArticlePayload(payload) { const errors=[]; const text=String(payload.contentText||''); const words=text.split(/\s+/).filter(Boolean).length;
  if(ARTICLE.slug!==CANONICAL_SLUG) errors.push('canonical slug does not match'); if(!payload.title||payload.title.length>120) errors.push('invalid title'); if(!payload.excerpt||payload.excerpt.length>220) errors.push('invalid excerpt'); if(!payload.contentHtml||payload.contentHtml.length>50000||!payload.contentText||payload.contentText.length>50000) errors.push('invalid content length'); if(payload.contentRaw!==payload.contentText) errors.push('raw text mismatch'); if(words<2500||words>3000) errors.push('article must contain 2500-3000 substantive words'); if(!Array.isArray(payload.tags)||payload.tags.length!==8||(payload.tags||[]).some(t=>!t||t.length>30)) errors.push('invalid tags'); if(!payload.seoTitle||payload.seoTitle.length>160||!payload.seoDescription||payload.seoDescription.length>320) errors.push('invalid SEO metadata'); if(!payload.coverImageAlt||payload.coverImageAlt.length>180) errors.push('invalid cover alt'); if(!payload.ogImageUrl) errors.push('cover artwork is required for publication'); if(/<h1\b/i.test(payload.contentHtml)) errors.push('body must not contain h1');
  if(/10 percent (?:always|guarantees)|always increase.*10 percent/i.test(text)) errors.push('must not universalize 10 percent rule'); if(/you should double the next|make up.*by doubling/i.test(text)) errors.push('must not endorse catch-up'); if(/every runner (?:must|should) add \d+/i.test(text)) errors.push('must not prescribe a universal increase'); if(/everyone needs the same (?:water|fuel|gel)/i.test(text)) errors.push('must not prescribe universal fueling'); if(/every event accepts walking|pending is approved/i.test(text)) errors.push('must not overstate event rules'); if(!/begin with what you have repeated in ordinary recent weeks/i.test(text)) errors.push('must answer search intent immediately'); if(!/Population guidance is not a personal training plan/i.test(text)) errors.push('must distinguish population guidance'); for(const h of REQUIRED_HEADINGS) if(!payload.contentHtml.includes(`<h2>${h}</h2>`)) errors.push(`missing heading: ${h}`); for(const l of REQUIRED_LINKS) if(!payload.contentHtml.includes(l)) errors.push(`missing link: ${l}`); if(errors.length) throw new Error(`Invalid distance progression payload: ${errors.join('; ')}`); return true; }
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
