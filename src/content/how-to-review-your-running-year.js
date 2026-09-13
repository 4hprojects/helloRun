'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='how-to-review-your-running-year';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'How to Review Your Running Year and Plan Your Next Goal',excerpt:'Review consistency, distance, events, pace, routes, recovery, disruptions, and enjoyment before choosing one realistic next running goal.',category:'Training',tags:Object.freeze(['running year review','running goals','running progress','yearly running goals','running reflection','running goal setting','next running goal','year end running review']),seoTitle:'How to Review Your Running Year and Plan Your Next Goal',seoDescription:'Review your running year through consistency, distance, events, recovery, enjoyment, and lessons, then choose one realistic next goal.',coverImageAlt:'Filipino runner reviewing a year of routes, events, consistency, recovery, and enjoyment before choosing one next goal'});
const RAW_CONTENT_HTML=`
<p>A useful <strong>running year review</strong> asks more than how many kilometres an app recorded. It looks at consistency, distances, events, pace in context, routes, tracking reliability, recovery, health interruptions, ordinary life, and enjoyment. Those details help you choose a next goal based on your actual year rather than another runner's highlight reel.</p>
<p>The review is not a verdict on discipline. A year can include illness, injury, caregiving, work, school, travel, unsafe weather, financial changes, or a shift in what you enjoy. An interrupted year still contains information. A high-volume year may reveal that the next goal should be recovery or repeatability rather than more distance.</p>
<p>Set aside your app summaries, calendar, event records, and a blank page. Treat device data as evidence with limitations, not perfect truth. This article is general education, not diagnosis, medical clearance, rehabilitation, or an individualized training plan.</p>

<h2>Total distance is only one measure</h2>
<p>Annual distance can describe exposure to running, but it does not show how that distance was distributed, how hard it felt, whether walking was included, which surfaces were used, or how recovery went. Two identical totals may represent very different years.</p>
<p>Check whether the app includes treadmill activities, manual entries, duplicate imports, warm-ups, walks, private records, or dates outside the calendar year. Do not alter data merely to make the total impressive. Write what the number includes.</p>
<p>Compare the total only when comparison serves a question. If your goal was consistency, active weeks may matter more. If you prepared for a specific event, relevant practice and outcome may matter more. A smaller healthy year can be more useful than a larger year built through repeated distress.</p>

<h2>Review how consistently you ran</h2>
<p>Count active weeks or months, then inspect the pattern. Did you repeat one or two suitable opportunities most weeks? Were there concentrated bursts followed by long gaps? Consistency is not daily running or an unbroken streak; it is a pattern you could return to without constant rescue.</p>
<p>Separate planned recovery from disruption. A quiet week after an event can be appropriate. A break for illness is not the same as losing interest. Labeling reasons helps you avoid solving the wrong problem.</p>
<p>Use the <a href="/blog/what-is-a-running-base">running-base guide</a> to evaluate repeatable frequency and easy duration. The best week of the year is not automatically the baseline for January.</p>

<h2>List the distances you completed</h2>
<p>Record familiar easy distances, longest activities, repeated event distances, and any accumulated challenges. Note whether each was continuous, run-walk, walking, treadmill, trail, or another accepted format. These distinctions add context without ranking one method morally.</p>
<p>A single 10K finish proves that activity occurred; it does not automatically prove that 10K training was consistently tolerated. Ask how you felt during the following hours and days, and whether ordinary life remained manageable.</p>
<p>Use the <a href="/blog/5k-10k-or-21k-next-running-goal">5K, 10K, or 21K decision guide</a> when considering another distance. Bigger is not automatically better.</p>

<h2>Review the events you joined</h2>
<p>List virtual, onsite, hybrid, team, school, workplace, charitable, and informal challenges. For each, note why you registered, whether the preparation fit, whether you completed, and how the event experience matched its promise.</p>
<p>Separate registered, submitted, approved, and recognized. A personal activity can be meaningful without qualifying under event rules. Keep rejection or correction notes because they can improve future proof preparation.</p>
<p>Ask which format you enjoyed: independent flexibility, social accountability, a live start, an accumulated window, or completion recognition. Your next event should fit that preference rather than only offering a larger distance.</p>

<h2>Put pace changes in context</h2>
<p>Compare pace only across reasonably similar routes, distances, effort, weather, surface, device setup, and health. Heat, humidity, wind, elevation, traffic, GPS error, sleep, and training purpose can change the number.</p>
<p>Look for repeated trends rather than one personal best. A slower easy pace with lower strain may reflect better control. A fast event does not mean every future training run should match it.</p>
<p>If faster running is a genuine next goal, the <a href="/blog/how-to-run-a-faster-5k">faster 5K guide</a> and <a href="/blog/how-to-run-a-faster-10k">faster 10K guide</a> explain foundations, controlled quality, and recovery without promising a result.</p>

<h2>Identify which routes worked best</h2>
<p>Review route safety, access, surface, shade, lighting, traffic, crossings, hills, weather exposure, toilets, fluid access, signal, transport, and enjoyment. A convenient route that repeatedly felt unsafe should not become the default through habit.</p>
<p>Note seasonal changes. A route suitable at dawn in one month may be dark, flooded, hotter, busier, or closed in another. Keep a backup route and an indoor option where appropriate and allowed.</p>
<p>Protect location privacy when saving or sharing maps. Crop home starts, use privacy zones where available, and avoid publishing routines that expose another person.</p>

<h2>Audit tracking problems</h2>
<p>List GPS dropouts, battery failure, wrong activity type, treadmill calibration issues, duplicate sync, paused recordings, unit confusion, missing dates, and screenshots that omitted required fields. Distinguish device problems from event-rule misunderstandings.</p>
<p>Ask which prevention step is worthwhile: charging, testing phone lock behavior, confirming permissions, waiting for a signal in a safe place, saving the original record, or reading proof rules before activity. No device guarantees perfect distance.</p>
<p>Do not fabricate or edit activity evidence to repair a failed recording. For events, use the disclosed correction process and accept the organizer's documented outcome.</p>

<h2>Let recovery teach you</h2>
<p>Review how you felt later on run days and during the following days. Note sleep, fatigue, appetite, soreness, mood, ordinary movement, motivation, and whether easy running remained easy. These are observations, not self-diagnoses.</p>
<p>The <a href="/blog/running-recovery-days-explained">recovery-day guide</a> distinguishes full rest, walking, ordinary movement, and recovery runs. The appropriate balance depends on load, experience, health, and life demands.</p>
<p>Record recurring pain, swelling, numbness, weakness, illness, changed gait, or severe fatigue and any professional advice you received. Do not use an annual chart to override clinical restrictions or to diagnose the cause.</p>

<h2>Notice what you enjoyed</h2>
<p>Enjoyment is not a trivial metric. It influences which routines you willingly repeat. List routes, companions, event formats, times of day, distances, and session types that made running feel worthwhile.</p>
<p>Also note what you disliked and why. The issue may be the activity itself, competitive pressure, a repetitive route, unsafe conditions, inconvenient timing, cost, a group mismatch, or a goal you never chose for yourself.</p>
<p>A next goal may prioritize exploration, community, calm easy running, or volunteering rather than speed and distance. That is still a legitimate running direction.</p>

<h2>Understand what caused missed weeks</h2>
<p>Group interruptions into categories such as health, pain, recovery, schedule, caregiving, work, study, travel, weather, route access, equipment, cost, motivation, and event timing. Count patterns without blaming yourself.</p>
<p>Some constraints are solvable through planning; others require acceptance, support, or a changed goal. A backup route may address access. It cannot solve illness. A shorter session may fit a meeting-heavy week. It should not replace needed sleep.</p>
<p>If holiday disruption is current, use the <a href="/blog/maintain-running-fitness-during-holidays">holiday maintenance guide</a> to choose a reduced routine without cramming missed work.</p>

<h2>Review progression from 5K to 10K or 21K</h2>
<p>If you moved to a new distance, examine the process rather than only the finish. Did easy running become repeatable? Did one longer activity grow gradually? Did food, fluids, route, equipment, proof, and recovery practice improve?</p>
<p>A completed 10K or 21K does not require another escalation. Repeating the distance more comfortably, returning to 5K speed, developing consistency, or recovering may be the better next focus.</p>
<p>The <a href="/blog/21k-half-marathon-for-beginners">21K beginner guide</a> explains why longer duration changes the preparation and should not be chosen from ambition alone.</p>

<h2>Decide between faster, farther, or more consistent</h2>
<p>These are different goals. Faster usually requires a suitable base, controlled quality work, recovery, and comparable measurement. Farther requires more time on feet, route support, and gradual load. More consistent requires a pattern that survives ordinary weeks.</p>
<p>Choose the direction that answers your review. If pace improved but weeks were irregular, consistency may be the useful emphasis. If a stable base feels enjoyable, a carefully selected distance may fit. If the distance is familiar and health permits, a performance goal may be interesting.</p>
<p>You can value all three without training all three aggressively at once. Name one primary outcome and let other qualities support it.</p>

<h2>Choose one primary next goal</h2>
<p>Write an outcome, a process, and a boundary. For example: “Prepare to complete an eligible 10K run-walk in March by protecting three suitable activity opportunities most weeks, while adjusting for symptoms, recovery, and conditions.” The example is not a prescription.</p>
<p>The outcome should fit your present base and available runway. The process should describe controllable actions. The boundary should explain when to change, pause, seek advice, or choose a later event.</p>
<p>Use the <a href="/blog/how-to-set-running-goals-for-the-rest-of-the-year">running-goals framework</a> to connect the goal to checkpoints. Avoid stacking a weight-loss target, personal best, new distance, daily streak, and perfect attendance into one plan.</p>

<h2>Set an early-2027 checkpoint</h2>
<p>A checkpoint is a review date, not an exam. Choose a point early enough to change course before an event deadline. Review completed opportunities, effort, recovery, health, route, weather, schedule, and enjoyment.</p>
<p>Define possible decisions in advance: continue, repeat, reduce, progress one element, change the event, or seek qualified input. This makes adjustment part of the plan rather than evidence of failure.</p>
<p>Do not backfill missed January activity. If the starting point changes, update the runway and goal date.</p>

<h2>Find a matching event</h2>
<p>Browse <a href="/events">current HelloRun events</a> only after defining the goal. Compare category, accepted activities, dates, format, proof, review, recognition, fees, delivery, location, and accessibility with your preparation and preferences.</p>
<p>A convenient date is not enough if the category requires a format you have not prepared for. Leave spare capacity for illness, weather, travel, and corrections. Select a later event when the timeline demands rushed training.</p>
<p>Registration can support commitment, but it does not create readiness. The live event rules remain authoritative.</p>

<h2>Review equipment and spending without chasing upgrades</h2>
<p>List the shoes, clothing, lights, hydration equipment, phone, watch, subscriptions, transport, registrations, and recovery products you actually used. Note what solved a real problem, what wore out, what caused discomfort, and what remained unused. This is a practical inventory, not a reason to replace everything in January.</p>
<p>Shoe mileage alone does not supply a universal replacement date. Inspect fit, outsole, upper, midsole feel, changes in comfort, and the demands of your routes. A new model or expensive watch does not guarantee injury prevention, accurate GPS, or better performance. Replace damaged safety equipment and seek suitable advice when fit or pain is a concern.</p>
<p>Compare event and travel spending with the value you experienced. Include hidden costs such as transport, accommodation, shipping, food, and time. A next goal should fit the household budget without relying on an uncertain discount or prize.</p>
<p>Choose purchases after defining the goal. A familiar 5K routine may need no major equipment change. A low-light route may justify visibility gear; a new trail goal may require route-specific research. Buy for a demonstrated need rather than an identity you feel pressured to perform.</p>

<h2>Consider community and support</h2>
<p>Review who helped the year work: running companions, family, coaches, clinicians, clubs, organizers, volunteers, online communities, or colleagues who respected your activity time. Also note settings that created pressure, comparison, unsafe pacing, unwanted public sharing, or repeated schedule conflict.</p>
<p>Decide what support the next goal needs. This might be one regular companion, a group with an appropriate pace, childcare coordination, a coach for a performance target, a clinician for symptoms, or a friend who receives a route check-in. Support is more specific than asking everyone to motivate you.</p>
<p>Protect boundaries. You can decline a distance, pace, public challenge, photo, leaderboard, or social post. A community should not require running through pain, hiding illness, sharing a home route, or buying products to belong.</p>
<p>Thank people where appropriate and discuss next-year logistics before setting a demanding calendar. A goal that quietly transfers responsibilities to someone else is not fully planned.</p>

<h2>Compare intentions with what the year actually supported</h2>
<p>Find any goals written at the beginning or middle of the year. Mark them completed, changed, paused, no longer relevant, or still useful. Do not force every unfinished goal into the next year. Sometimes new evidence should retire an old intention.</p>
<p>For each changed goal, write what happened without accusation. Perhaps an event was cancelled, a route became unavailable, work expanded, health changed, or you discovered that trail walking was more enjoyable than road racing. The lesson is the decision you can make now.</p>
<p>Look for capacity you built even when the original outcome was missed: a repeatable walk-run routine, better proof preparation, safer route choices, more honest pacing, improved rest, or willingness to seek help. These can support a different next goal.</p>
<p>Then identify assumptions that failed. If the plan depended on every weekend staying free, unlimited access to one route, or never getting sick, replace those assumptions with primary, backup, and unavailable conditions. Resilience comes from realistic options, not from pretending disruption will disappear.</p>

<h2>Create a one-page running year review</h2>
<ul><li><strong>Pattern:</strong> active weeks, gaps, and repeatable easy activity.</li><li><strong>Distance:</strong> familiar, longest, and event distances with format.</li><li><strong>Events:</strong> purpose, result, proof, and experience.</li><li><strong>Pace:</strong> comparable trends with conditions.</li><li><strong>Routes and tracking:</strong> what worked, failed, and needs a backup.</li><li><strong>Recovery and health:</strong> observations, interruptions, and professional restrictions.</li><li><strong>Enjoyment:</strong> what you want more or less of.</li><li><strong>Constraints:</strong> patterns that need planning or acceptance.</li><li><strong>Next direction:</strong> faster, farther, or more consistent.</li><li><strong>Checkpoint:</strong> a date and possible adjustment decisions.</li></ul>
<p>Keep the page descriptive. You do not need to publish it, compare it, or turn every experience into a score. Use your actual year, not another runner's numbers, to decide what you want to work toward next.</p>

<h2>When the review suggests rest or assessment</h2>
<p>A year-end goal exercise should not push you through concerning symptoms. Stop exercise and seek urgent help for chest pressure, fainting, confusion, severe or unusual breathlessness, sudden weakness, loss of coordination, or other emergency signs.</p>
<p>Persistent or worsening pain, swelling, numbness, weakness, fever, changed gait, or reduced ordinary function deserves appropriately qualified assessment. Follow advice after illness, injury, surgery, pregnancy-related concerns, or medication changes.</p>
<p>If the review brings distress around food, body image, compulsive exercise, or an inability to rest, seek qualified support. A running total is not a measure of personal worth.</p>

<h2>Frequently asked questions</h2>
<h3>Should I compare this year with last year?</h3><p>Only when circumstances and the question make comparison useful. Health, time, goals, and recording methods may have changed.</p>
<h3>Is total distance the best running metric?</h3><p>No single metric is best. Consistency, relevant sessions, recovery, event experience, and enjoyment may better answer your goal.</p>
<h3>What if my year had several missed months?</h3><p>Review why, acknowledge the current starting point, and choose a gradual next step. Do not compress missed training into the next month.</p>
<h3>Should my next goal be a longer race?</h3><p>Not automatically. Repeating a distance, improving comfort, building consistency, or choosing recovery can be more appropriate.</p>
<h3>Can I use an app's yearly summary?</h3><p>Yes, as one source. Check dates, duplicates, activity types, privacy, and missing context before drawing conclusions.</p>

<h2>Official sources and health note</h2>
<p>The <a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity">World Health Organization physical-activity fact sheet</a> describes population benefits and emphasizes that some activity is better than none. The <a href="https://www.cdc.gov/physical-activity-basics/adding-adults/index.html">CDC guidance on adding activity</a> recommends beginning according to current ability and increasing over time.</p>
<p>Population guidance cannot determine your readiness, explain symptoms, or prescribe a personal 2027 goal. Review your year honestly, follow qualified individual advice, and choose a goal flexible enough to respond to health, recovery, weather, and life.</p>
`;
const REQUIRED_HEADINGS=Object.freeze(['Total distance is only one measure','Review how consistently you ran','List the distances you completed','Review the events you joined','Put pace changes in context','Identify which routes worked best','Audit tracking problems','Let recovery teach you','Notice what you enjoyed','Understand what caused missed weeks','Review progression from 5K to 10K or 21K','Decide between faster, farther, or more consistent','Choose one primary next goal','Set an early-2027 checkpoint','Find a matching event','Review equipment and spending without chasing upgrades','Consider community and support','Compare intentions with what the year actually supported','Create a one-page running year review','When the review suggests rest or assessment','Frequently asked questions','Official sources and health note']);
const REQUIRED_LINKS=Object.freeze(['href="/blog/how-to-set-running-goals-for-the-rest-of-the-year"','href="/blog/5k-10k-or-21k-next-running-goal"','href="/blog/what-is-a-running-base"','href="/blog/how-to-run-a-faster-5k"','href="/blog/how-to-run-a-faster-10k"','href="/blog/21k-half-marathon-for-beginners"','href="/blog/maintain-running-fitness-during-holidays"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),w=contentText.split(/\s+/).filter(Boolean).length,p={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(w/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(p);return p;}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),w=t.split(/\s+/).filter(Boolean).length;if(w<2500||w>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||!p.excerpt||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8)e.push('tags');if(/total distance proves your worth|everyone should progress to 21K/i.test(t))e.push('harmful comparison');if(/guarantees? improvement|will prevent all injuries/i.test(t))e.push('guarantee');if(!/running year review/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes(`<h2>${h}</h2>`))e.push(`heading ${h}`);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push(`link ${l}`);if(e.length)throw new Error(`Invalid running-year-review payload: ${e.join('; ')}`);return true;}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
