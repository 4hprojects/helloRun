'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='running-log-for-beginners';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'Running Log for Beginners: What Should You Actually Track?',excerpt:'Create a useful running log with date, duration, distance, effort, route, conditions, notes, and recovery without turning every run into analysis.',category:'Training',tags:Object.freeze(['running log','running journal','running tracker','running training log','track running progress','running data','running diary','beginner running']),seoTitle:'Running Log for Beginners: What Should You Actually Track?',seoDescription:'Create a useful running log with date, distance, duration, effort, route, conditions, notes, and recovery without turning every run into data analysis.',coverImageAlt:'Filipino beginner recording a simple run with date, route, time, effort, weather, shoes, notes, and recovery context'});
const RAW_CONTENT_HTML=`
<p>A <strong>running log</strong> should help you make better decisions, not turn every activity into a data-analysis project. For many beginners, a useful entry can be short: date, duration or distance, activity method, effort, relevant conditions, one sentence about the session, and a later recovery note.</p>
<p>Extra fields such as pace, heart rate, cadence, elevation, shoes, sleep, or event-proof status can be added when they answer a real question. More data is not automatically better, and a watch metric is not a diagnosis or a grade.</p>
<p>This guide is general education, not medical advice or an individualized training plan. Protect privacy, follow event rules, and seek qualified care for concerning symptoms.</p>

<h2>Why keep a running log?</h2>
<p>A log preserves context that memory loses. It can show which schedules were repeatable, how easy effort changed with weather or terrain, whether a new route caused interruptions, and how recovery followed different sessions.</p>
<p>It can also prevent selective memory. Runners may remember one excellent run and overlook three difficult days, or remember one slow pace and miss a month of consistent activity. Written entries make the pattern visible.</p>
<p>A log cannot prove causation. If pain followed a shoe change, the timing is worth noting, but it does not establish the shoe as the cause. Use the record to form questions and support qualified conversations.</p>

<h2>Start with the question the log should answer</h2>
<p>Choose one or two questions: Am I building a repeatable weekly routine? Does this route make easy effort harder? How do I recover after a longer session? Which run-walk pattern feels controlled? Did event proof get submitted and approved?</p>
<p>The question determines the fields. A consistency log needs dates and completed or adapted sessions. A pacing review needs route and conditions. A shoe comparison needs footwear and enough comparable uses. An event log needs approval status separate from personal activity.</p>
<p>If a field never influences a decision, remove it. The best template is one you can complete honestly in a minute or two.</p>

<h2>Track the date and local time</h2>
<p>Record the activity date and, when useful, approximate start time. Morning and evening conditions can differ, and travel across time zones can make an app display another calendar date.</p>
<p>For virtual events, use the timestamp required by the event and preserve the original record. Do not backdate or edit an activity to fit an eligibility window. A submission date may differ from the activity date.</p>
<p>Exact times can reveal routines, so avoid publishing a detailed schedule with home or workplace locations. A private log can retain context without making it public.</p>

<h2>Track duration</h2>
<p>Duration is often the simplest measure of time on feet. Decide whether you mean elapsed time, moving time, or planned session time, and use the same definition when comparing entries.</p>
<p>Stops for traffic, water, navigation, or safety are real context. Auto-pause may remove them from moving time, so record a meaningful interruption when it affects interpretation. Do not rush crossings to protect the clock.</p>
<p>For run-walk, total duration plus a short description of the pattern may be more useful than average pace. Longer does not automatically mean better; duration must fit current ability and recovery.</p>

<h2>Track distance with appropriate humility</h2>
<p>Distance can come from a measured route, treadmill, GPS watch, phone, or event course. Each method has limitations. Buildings, trees, device position, turns, calibration, and software can change estimates.</p>
<p>Record the displayed distance and the source when comparison matters. The same loop on the same device may be more interpretable than mixing several tools as though every number were exact.</p>
<p>Do not add unsafe distance to repair a reading. For events, follow published rounding and correction rules. Personal totals and officially approved distance should remain separate.</p>

<h2>Track pace only when it serves a purpose</h2>
<p>Pace combines distance and time, so errors or different definitions affect it. Average pace can also hide a fast start, walk breaks, stops, hills, or a hard finish. It is one summary, not the whole session.</p>
<p>The <a href="/blog/beginners-guide-to-running-pace">beginner pace guide</a> explains why pace varies with fitness, weather, terrain, and purpose. Compare suitable sessions with context rather than declaring every slower run a regression.</p>
<p>Hide pace during easy runs if it creates pressure. You can review it later or omit it entirely while establishing routine.</p>

<h2>Record perceived effort</h2>
<p>Use a simple description such as very easy, easy, moderate, hard, or very hard, plus whether conversation felt comfortable. A numeric scale can work if you define it consistently, but it is not objectively universal.</p>
<p>Perceived effort captures information a pace cannot: heat, poor sleep, stress, illness, hills, and accumulated fatigue. A usual pace feeling unusually hard is worth noting and may support reducing the next session.</p>
<p>Do not train harder to make the rating look impressive. Honest effort data is useful because it reflects your experience, not because it resembles someone else's.</p>

<h2>Use heart rate as context, not a verdict</h2>
<p>Wrist and chest devices estimate or measure heart signals differently, and readings can be affected by fit, motion, temperature, device limitations, medication, stress, and individual physiology. One number cannot diagnose health or define readiness.</p>
<p>The <a href="/blog/running-heart-rate-explained">heart-rate guide</a> explains averages, zones, device errors, and health boundaries. If you track heart rate, pair it with effort, pace, conditions, and symptoms.</p>
<p>Do not chase a target zone through concerning symptoms or dismiss symptoms because the display looks normal. Seek appropriate medical help based on the situation.</p>

<h2>Track cadence only for a specific reason</h2>
<p>Cadence is steps per minute, often estimated by a watch or phone. It changes with pace, height, terrain, fatigue, measurement, and individual movement. There is no universal ideal number every runner must reach.</p>
<p>The <a href="/blog/running-cadence-explained">cadence guide</a> explains why deliberately forcing a popular target can be inappropriate. Log cadence when observing a coached change or comparing similar sessions, not as a daily score.</p>
<p>A sudden strange reading may be sensor error. Check the raw activity and context before changing how you run.</p>

<h2>Record route, surface, and elevation</h2>
<p>A short label such as flat park loop, rolling road, treadmill, track, or trail explains why pace and effort changed. Note unusual construction, crowding, mud, repeated crossings, or route errors.</p>
<p>Elevation estimates vary among devices and mapping services. Treat them as context rather than exact proof unless an event defines an accepted method. Do not seek steep terrain merely to increase a metric.</p>
<p>Protect location privacy. Use a private route nickname instead of publishing a precise home start, school, workplace, or regular time pattern.</p>

<h2>Record weather and environmental conditions</h2>
<p>Temperature, humidity, sun, rain, wind, air quality, lighting, and surface conditions can change effort and safety. A simple note such as humid morning or wet path may be enough.</p>
<p>Use official current warnings for decisions; the log is a record, not a forecast. Do not run in unsafe conditions merely to create a comparison entry.</p>
<p>For indoor sessions, note treadmill, ventilation, room temperature, machine, and incline only when relevant. Indoor does not mean conditions are identical.</p>

<h2>Track shoes without overclaiming mileage</h2>
<p>Recording the shoe pair can help identify usage and provide context for comfort or surface. Apps may total kilometres automatically, but wear also depends on fit, gait, construction, terrain, storage, damage, and individual use.</p>
<p>There is no universal retirement mileage that guarantees safety. Inspect shoes and consider comfort and function; seek qualified fitting or clinical advice where appropriate.</p>
<p>Do not keep using damaged or unsuitable footwear solely to reach a round number, and do not assume new shoes solve pain.</p>

<h2>Label the workout type plainly</h2>
<p>Use labels you understand: walk, run-walk, easy run, long easy run, intervals, tempo, hills, race, recovery, or strength. Define them once so later review does not depend on guessing.</p>
<p>A label does not make execution match the purpose. If an easy run became hard, record that honestly. If a planned workout was shortened, retain both the plan and what occurred.</p>
<p>Avoid collecting elaborate categories before they are useful. Beginners can start with activity method and effort.</p>

<h2>Write one sentence about how the session felt</h2>
<p>Capture the most decision-relevant fact: breathing stayed controlled, route was crowded, left shoe rubbed, first interval was too fast, walking breaks worked, or energy faded after poor sleep.</p>
<p>Avoid turning every note into a moral judgment. “Lazy” and “bad runner” do not explain what happened. Describe observable conditions, choices, sensations, and emotions.</p>
<p>When symptoms occur, note location, timing, change, and effect on ordinary function without diagnosing them. Share the record with a qualified professional when needed.</p>

<h2>Add recovery or next-day notes</h2>
<p>A session entry is incomplete for planning when you never observe what followed. Note later soreness, pain, fatigue, sleep, appetite, mood, gait, stairs, and ordinary work or caregiving function.</p>
<p>The <a href="/blog/running-recovery-days-explained">recovery-days guide</a> offers a framework for deciding whether to repeat, reduce, rest, or seek help. A good finish does not guarantee normal next-day response.</p>
<p>Keep the note proportionate. A simple normal, more tired than usual, or persistent pain with context may be sufficient.</p>

<h2>Keep health information private and purposeful</h2>
<p>A running log may contain symptoms, medication context, menstrual information, sleep, mood, locations, or diagnoses. Decide what must remain private, who can access it, and how cloud services use the data.</p>
<p>Do not post screenshots that expose addresses, contacts, account identifiers, or another person's health information. Crop only for privacy when event rules permit, without removing required proof fields.</p>
<p>A private notebook can be useful, but protect it appropriately. Delete fields you do not need rather than collecting sensitive information indefinitely.</p>

<h2>Separate personal logging from event proof</h2>
<p>Your journal can use subjective notes and chosen fields. Event proof must meet the organizer's current requirements for identity, date, activity, distance, time, and other evidence. A diary entry alone may not qualify.</p>
<p>Record submitted, pending, approved, rejected, or corrected separately from completed activity. Only approved entries count toward official accumulated totals when the rules say so.</p>
<p>Never edit, duplicate, backdate, or borrow activities to make the official record match the personal log. Contact support through the documented route.</p>

<h2>Choose app, spreadsheet, or notebook</h2>
<p>An app can capture GPS, time, pace, splits, and device data automatically. Review privacy, permissions, exports, account recovery, and whether the interface encourages unwanted comparison. The <a href="/blog/how-to-use-strava-for-running">Strava guide</a> covers one platform's runner setup and privacy.</p>
<p>A spreadsheet makes custom fields and monthly summaries easy but requires manual entry and appropriate file protection. A paper notebook is flexible and offline, while totals and search require more work.</p>
<p>Choose the least complex tool that answers your question. You can combine an app record with one brief private note without recreating every metric.</p>

<h2>Keep records portable without collecting forever</h2>
<p>If the log matters for a long-term comparison, check whether the app can export common data and whether your notes remain readable outside the service. Account closure, subscription changes, device replacement, or a forgotten password can otherwise remove access.</p>
<p>Back up only what you need, in a location protected appropriately for its sensitivity. Test that a backup opens before relying on it. Avoid copying precise routes and health notes into several loosely protected services merely to feel secure.</p>
<p>Set a review or deletion interval. Event proof may need retention until review and appeals close, while ordinary training notes may not need indefinite storage. Follow applicable rules and organizer instructions. Portability is useful when it preserves decision-making context, not when it expands a permanent archive without purpose.</p>

<h2>What not to obsess over</h2>
<p>Do not treat daily pace, calories, heart rate, cadence, steps, training scores, predicted race times, streaks, or social reactions as grades. Estimates can be wrong, and even accurate values require context.</p>
<p>More fields can create false certainty. Avoid changing training because one device score says productive, unproductive, recovered, or ready when your symptoms and circumstances contradict it.</p>
<p>Logging should not make you exercise to avoid an empty row. A blank day can mean planned recovery, illness, unsafe weather, or a changed priority.</p>

<h2>Review weekly patterns</h2>
<p>Once a week, ask which sessions occurred, which were adapted, how effort and recovery behaved, and whether the schedule fit. Look for repeated conflicts rather than blaming one missed day.</p>
<p>Compare total activity only with appropriate recent periods. Do not use the review to manufacture distance debt. If load increased while recovery worsened, consider repeating, reducing, or seeking guidance.</p>
<p>Write one decision for the next week: keep the same, shorten a session, move a time window, use a safer route, or request help.</p>

<h2>Review monthly trends carefully</h2>
<p>A month can show frequency, total duration, common distance, easy-effort consistency, route use, and recovery patterns. The <a href="/blog/how-to-review-your-running-year">running-year review</a> offers a broader framework that can also guide a monthly summary.</p>
<p>Do not confuse association with cause. Several hard sessions and poor sleep may appear together, but the log alone cannot determine every relationship. Use trends to ask better questions.</p>
<p>Account for holidays, illness, travel, weather, and missing data. A lower month is not automatically failure, and a higher month is not automatically improvement.</p>

<h2>Use the log to set future goals</h2>
<p>The <a href="/blog/running-goals-2027">2027 goal-setting guide</a> asks you to choose one primary goal based on current consistency, recent distance, time, preferences, and lessons learned. The log provides that evidence.</p>
<p>Look for the routine you can repeat, not the single biggest week. Use recovery and enjoyment alongside pace and distance. A goal should not require hiding the inconvenient parts of the record.</p>
<p>Set an early checkpoint and decide what evidence would support continuing, reducing, or changing. Keep the log aligned with that decision.</p>

<h2>A minimum useful running-log template</h2>
<ol><li>Date and approximate time.</li><li>Activity method and purpose.</li><li>Duration or distance, with measurement source when relevant.</li><li>Perceived effort.</li><li>Route and important conditions.</li><li>One sentence about the session.</li><li>Later or next-day recovery.</li><li>Event proof status only when applicable.</li></ol>
<p>Track enough information to make better decisions, not so much that logging becomes harder than running. Add an optional field only when you know how it will affect a choice.</p>

<h2>When to stop logging and seek help</h2>
<p>A journal cannot evaluate chest pressure, fainting, confusion, severe or unusual breathlessness, sudden weakness, loss of coordination, or other emergency signs. Stop exercise and use appropriate urgent care.</p>
<p>Persistent or worsening pain, swelling, numbness, weakness, fever, changed gait, reduced ordinary function, or concerning mood and eating patterns deserve qualified assessment. Do not use normal-looking metrics to dismiss symptoms.</p>

<h2>Frequently asked questions</h2>
<h3>Do I need to record every run?</h3><p>No. Consistency helps reveal patterns, but the log should remain sustainable. Decide what level answers your question.</p>
<h3>Which fields are essential?</h3><p>Date, activity, duration or distance, effort, relevant context, and recovery form a useful minimum for many beginners.</p>
<h3>Should I track pace and heart rate?</h3><p>Only if they serve a purpose. Both require context and neither is a diagnosis.</p>
<h3>Is an app better than a notebook?</h3><p>No universal tool is best. Choose based on questions, privacy, access, and ease of consistent use.</p>
<h3>How often should I review the log?</h3><p>A brief weekly decision and a broader monthly review are practical starting points, but adapt them to your needs.</p>

<h2>Official sources and health note</h2>
<p>The <a href="https://www.cdc.gov/physical-activity/php/about/measuring-physical-activity-intensity.html">CDC intensity guide</a> explains relative effort and the talk test. The <a href="https://www.heart.org/en/healthy-living/fitness/fitness-basics/target-heart-rates">American Heart Association heart-rate overview</a> notes that age-based figures are averages and that medication, stress, and other factors influence heart rate. Neither source turns a consumer metric into individualized medical advice.</p>
<p>Keep the log simple, honest, contextual, and private enough to support the next sound decision.</p>
`;
const REQUIRED_HEADINGS=Object.freeze(['Why keep a running log?','Start with the question the log should answer','Track the date and local time','Track duration','Track distance with appropriate humility','Track pace only when it serves a purpose','Record perceived effort','Use heart rate as context, not a verdict','Track cadence only for a specific reason','Record route, surface, and elevation','Record weather and environmental conditions','Track shoes without overclaiming mileage','Label the workout type plainly','Write one sentence about how the session felt','Add recovery or next-day notes','Keep health information private and purposeful','Separate personal logging from event proof','Choose app, spreadsheet, or notebook','Keep records portable without collecting forever','What not to obsess over','Review weekly patterns','Review monthly trends carefully','Use the log to set future goals','A minimum useful running-log template','When to stop logging and seek help','Frequently asked questions','Official sources and health note']);
const REQUIRED_LINKS=Object.freeze(['href="/blog/beginners-guide-to-running-pace"','href="/blog/running-heart-rate-explained"','href="/blog/running-cadence-explained"','href="/blog/how-to-use-strava-for-running"','href="/blog/how-to-review-your-running-year"','href="/blog/running-goals-2027"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wordCount=contentText.split(/\s+/).filter(Boolean).length,payload={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wordCount/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(payload);return payload;}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),w=t.split(/\s+/).filter(Boolean).length;if(w<2500||w>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||!p.excerpt||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8)e.push('tags');if(/metrics replace medical advice|run to avoid a blank row|publish precise home address/i.test(t))e.push('unsafe logging');if(/heart rate guarantees|cadence always prevents injury/i.test(t))e.push('guarantee');if(!/running log/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes(`<h2>${h}</h2>`))e.push(`heading ${h}`);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push(`link ${l}`);if(e.length)throw new Error(`Invalid running-log payload: ${e.join('; ')}`);return true;}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
