'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='5k-10k-or-21k-next-running-goal';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'5K, 10K, or 21K: What Should Your Next Running Goal Be?',excerpt:'Compare 5K, 10K, and 21K by recent experience, weekly time, long-run demand, recovery, fueling, tracking, route, and the kind of goal you actually want.',category:'Training',tags:Object.freeze(['next running goal','5K vs 10K','10K vs half marathon','next race distance','running distance goals','running goals beginners','choose race distance','5K 10K 21K']),seoTitle:'5K, 10K, or 21K: What Should Your Next Running Goal Be?',seoDescription:'Compare 5K, 10K, and 21K goals based on your current routine, recent distance, available training time, recovery, and what you actually want from running.',coverImageAlt:'Cut-paper Filipino runner choosing among equally inviting 5K, 10K, and 21K-style routes based on time and recovery'});
const RAW_CONTENT_HTML=`
<p>Your <strong>next running goal</strong> does not have to be the longest distance available. A 5K can build consistency or speed, a 10K can extend endurance while remaining manageable, and a 21K can become realistic after a durable shorter-distance base. The useful choice is the goal whose training you can support—not the number that receives the loudest reaction.</p>
<p>Compare recent running, available weekly time, long-run demand, recovery, route, weather, food and fluid planning, tracking, event rules, cost, and enjoyment. These factors matter more than a universal mileage formula.</p>
<blockquote><strong>The decision principle:</strong> choose the smallest goal that genuinely excites you and requires a manageable, repeatable step from where you are now.</blockquote>

<h2>Bigger is not automatically better</h2>
<p>Distance is easy to compare, so it can become a shortcut for progress. But progress can also mean running comfortably, using a run-walk plan, improving pacing, returning consistently, learning a route, solving tracking problems, or enjoying an event without exhaustion.</p>
<p>A longer event asks for more time on feet and usually more preparation logistics. It does not make a shorter event less meaningful. A runner who repeats 5K consistently may have a stronger routine than someone who enters 21K and cannot sustain the training.</p>
<p>Do not let a medal size, social post, discount deadline, or friend’s schedule make the decision for you.</p>

<h2>Start from your recent running</h2>
<p>Review the last several weeks, not your best-ever activity. How often did you actually run or run-walk? What was the longest comfortable session? How did ordinary movement and easy activity feel afterward? Which weeks survived work, school, caregiving, travel, and weather?</p>
<p>The <a href="/blog/how-to-increase-running-distance">distance-progression guide</a> recommends changing one major demand at a time. If frequency and consistency are still new, adding a much longer target at the same time can make it difficult to identify what caused trouble.</p>
<p>A past distance can inform the choice, but it does not guarantee current readiness after a long break, illness, injury, pregnancy-related change, or major schedule shift.</p>

<h2>When 5K is still a good goal</h2>
<p>Choose 5K when you are building a first continuous or run-walk completion, returning after a break, learning consistent weekly sessions, working with limited time, or simply enjoy shorter events. It can also support a carefully planned faster-performance goal for an experienced runner.</p>
<p>The <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K guide</a> begins with manageable running and walking options. Repeating the distance can improve route judgment, tracking, pacing, comfort, and event familiarity without requiring a new category.</p>
<p>Five kilometres is not automatically easy. Terrain, heat, effort, health, and current capacity shape its demand. Treat a first 5K as real preparation rather than a test you should pass without training.</p>

<h2>When moving to 10K makes sense</h2>
<p>Consider 10K when shorter sessions and a developing long run are repeatable, recovery is acceptable, and you can add time gradually. You should want the endurance process, not only the finish label.</p>
<p>The <a href="/blog/10k-training-plan-for-beginners">beginner 10K plan</a> connects easy sessions, run-walk options, recovery, and gradual longer efforts. The <a href="/blog/how-to-run-your-first-10k-virtual-run">first virtual 10K guide</a> adds route, tracking, pacing, proof, and event preparation.</p>
<p>Ten kilometres may fit runners who want a substantial goal without the long-run and fueling complexity of a half marathon. It is also worth repeating after a first finish; the <a href="/blog/what-to-do-after-your-first-10k">post-first-10K guide</a> compares maintaining, improving, and progressing.</p>

<h2>When 21K becomes realistic</h2>
<p>A 21K or half-marathon goal becomes more realistic when you have a durable shorter-distance base, can make room for progressively longer sessions, recover reliably, and are willing to practise pacing, route logistics, food, fluids, gear, and tracking over greater time.</p>
<p>The <a href="/blog/21k-half-marathon-for-beginners">21K beginner guide</a> does not treat one 10K completion as automatic readiness. The gap is not merely another 11.1 kilometres on event day; it changes the preparation week and the consequences of mistakes.</p>
<p>Choose a generous timeline. Persistent pain, concerning symptoms, unstable health, repeated difficulty recovering, or inability to support the necessary schedule are reasons to pause and seek appropriate guidance.</p>

<h2>Compare the weekly time you truly have</h2>
<p>Count full time, not only moving minutes. Include dressing, food, travel, route access, warm-up, cooldown, showering, equipment care, tracking, proof, and recovery. A long run that lasts two hours may occupy much more of the day.</p>
<p>The <a href="/blog/how-to-run-with-a-busy-schedule">busy-schedule running guide</a> and weekly planning approach start with fixed responsibilities. Identify ordinary and difficult weeks. A goal should have a reduced version that preserves continuity without forcing missed sleep.</p>
<p>Five kilometres usually allows shorter long-session demand than 10K or 21K, but an ambitious speed goal can also require structured time. Compare the actual plan, not only the race label.</p>

<h2>Consider recovery and the rest of your schedule</h2>
<p>Training draws from the same recovery budget as work, school, caregiving, commuting, other sports, strength work, and sleep. More distance can affect the next day even when the run fits the calendar.</p>
<p>Ask how you responded to recent longer sessions. Did soreness change gait or stairs? Did fatigue interfere with concentration? Did you repeatedly skip later sessions? One strong day does not prove the whole plan is sustainable.</p>
<p>There is no universal number of recovery days for each distance. Prior training, intensity, terrain, health, age, conditions, and the individual matter.</p>

<h2>Consider route, weather, and access</h2>
<p>A safe, practical 5K loop may be available nearby while longer routes require traffic crossings, transport, repetitive loops, unlit hours, or exposed heat. Route access is part of readiness, not an afterthought.</p>
<p>In the Philippines, longer time outdoors can extend into stronger sun, humidity, rain, or changing traffic. Starting earlier may conflict with sleep or transport. Treadmill access may offer an alternative only if the event rules allow it.</p>
<p>Map water, toilets, exits, signal, and turnaround points. Do not choose a longer distance because you expect preparation to make an unsafe route acceptable.</p>

<h2>Include run-walk options honestly</h2>
<p>Run-walk can support 5K, 10K, and some 21K goals when the participant and event rules allow it. Planned walking from the beginning may control effort more effectively than waiting for exhaustion.</p>
<p>Longer distance does not require pretending to run continuously. Check cutoffs and accepted activity types. An onsite road closure or virtual event window may create practical limits even when walking is permitted.</p>
<p>Choose intervals through practice rather than copying one ratio. Weather, slopes, fitness, symptoms, and goals affect the pattern.</p>

<h2>Compare long-run demand</h2>
<p>A long run is the relatively longest session in the current week, not a universal distance. The <a href="/blog/what-is-a-long-run-for-beginners">long-run guide</a> explains that its purpose, effort, and relationship to the full schedule matter.</p>
<p>A 5K goal may need only a modest extension beyond ordinary sessions, depending on the runner. A 10K goal generally asks for more endurance exposure. A 21K goal makes the long-run progression and recovery more central.</p>
<p>No plan requires you to complete the full event distance every week. The exact structure should reflect experience, health, goal, and appropriate guidance.</p>

<h2>Compare food and hydration complexity</h2>
<p>As expected duration grows, pre-run timing, water access, carrying equipment, and possible during-run fuel become more relevant. Not every 5K or 10K requires food during the activity, and no universal threshold fits every runner.</p>
<p>A 21K goal generally provides more reason to practise an individualized food and fluid plan. Hot and humid conditions can increase the importance of pacing, access, and symptom awareness at any distance.</p>
<p>Do not select a long event to justify supplements or products. Familiar ordinary food, a practised plan, and professional guidance for medical needs matter more than marketing.</p>

<h2>Compare tracking and proof needs</h2>
<p>A phone or watch can record any of the three distances, but battery, storage, GPS exposure, carrying comfort, and sync reliability matter more as duration grows. Test the complete save and submission cycle.</p>
<p>Virtual events may require one activity, accumulated activities, screenshots, direct imports, or additional fields. Read the event-specific rules. Longer distance does not make inaccurate proof acceptable, and a polished screenshot does not override an ineligible date or activity type.</p>
<p>Preserve original records and review route privacy before sharing.</p>

<h2>Choose the kind of goal you actually want</h2>
<p><strong>Distance:</strong> gradually extend the longest manageable activity. <strong>Speed:</strong> prepare for a performance target at a familiar distance. <strong>Consistency:</strong> repeat suitable activity across weeks. <strong>Participation:</strong> enjoy an event, community, or cause without a time target.</p>
<p>These goals can overlap, but one should lead. Trying to increase distance, pace, frequency, hills, and strength simultaneously makes the plan harder to recover from and evaluate.</p>
<p>The <a href="/blog/how-to-set-running-goals-for-the-rest-of-the-year">running-goals guide</a> turns an outcome into controllable behaviours. Choose measures that still make sense when weather or a busy week changes the ideal session.</p>

<h2>Goal comparison by decision question</h2>
<p>The publishing system uses a readable stacked comparison instead of a rigid visual table so the content remains usable on narrow screens and with enlarged text.</p>
<h3>Current experience</h3><ul><li><strong>5K:</strong> suitable for a first structured goal, return, or familiar-distance focus.</li><li><strong>10K:</strong> fits a developing shorter-distance base and gradual endurance interest.</li><li><strong>21K:</strong> calls for durable shorter-distance consistency and longer-run experience.</li></ul>
<h3>Weekly time needed</h3><ul><li><strong>5K:</strong> often the easiest to fit, though a speed goal adds structure.</li><li><strong>10K:</strong> requires more room for endurance development.</li><li><strong>21K:</strong> demands the largest training and logistics window.</li></ul>
<h3>Long-run demand</h3><ul><li><strong>5K:</strong> relatively modest for many prepared runners.</li><li><strong>10K:</strong> a meaningful but often manageable progression.</li><li><strong>21K:</strong> central to preparation, pacing practice, and recovery planning.</li></ul>
<h3>Fueling complexity</h3><ul><li><strong>5K:</strong> usually focuses on ordinary familiar pre-run routines.</li><li><strong>10K:</strong> expected duration and conditions determine whether more planning matters.</li><li><strong>21K:</strong> generally requires greater practice with food, fluid, and carrying options.</li></ul>
<h3>Tracking needs</h3><ul><li><strong>5K:</strong> simplest battery and route exposure.</li><li><strong>10K:</strong> test signal, save, and event proof.</li><li><strong>21K:</strong> account for longer battery use, navigation, and more possible signal variation.</li></ul>
<h3>Beginner suitability</h3><ul><li><strong>5K:</strong> often the most accessible first distance.</li><li><strong>10K:</strong> reasonable after a gradual base.</li><li><strong>21K:</strong> a later goal for beginners who build sufficient time and capacity.</li></ul>
<h3>Best goal type</h3><ul><li><strong>5K:</strong> first finish, return, speed, consistency, or participation.</li><li><strong>10K:</strong> endurance, another well-executed race, or bridge goal.</li><li><strong>21K:</strong> long-distance preparation when the process itself is desired.</li></ul>

<h2>Use a simple decision sequence</h2>
<ol><li>List what you completed consistently in recent weeks.</li><li>Remove options whose weekly time or route needs do not fit.</li><li>Account for recovery, health, weather, travel, and cost.</li><li>Choose distance, speed, consistency, or participation as the main purpose.</li><li>Select the smallest step that remains exciting.</li><li>Preview the event rules and calendar before paying.</li><li>Write a reduced-week option and a condition for delaying the goal.</li></ol>
<p>If two distances still fit, favour the one whose preparation you would enjoy even if no public result were attached.</p>

<h2>Compare cost, equipment, and event logistics</h2>
<p>The registration fee is only one cost. Add transport, accommodation, food, event-day access, required proof tools, mobile data, replacement gear that is genuinely needed, delivery, and the time another person may spend supporting you. A longer event can require more route practice and supplies, but price does not increase in a neat line with distance.</p>
<p>Use familiar suitable gear before buying specialized equipment. A phone may be sufficient for virtual proof; an expensive watch does not create readiness. Likewise, a hydration vest can solve a real access problem on a long route but should be tested rather than purchased as a symbol of commitment.</p>
<p>Read transfer, cancellation, refund, and delivery terms before paying. If the event changes or your circumstances change, those policies determine your options. Never let sunk cost pressure you to train or participate through unsafe conditions or concerning symptoms.</p>

<h2>Consider accessibility and participation support</h2>
<p>Distance suitability also depends on the actual event experience. Review path surface, width, gradients, toilets, transport, start procedure, cutoffs, guide or companion policies, sensory environment, communication format, and whether virtual participation offers a workable alternative.</p>
<p>A shorter distance with inaccessible instructions or an unsuitable route may be harder to join than a well-supported longer format. Contact the organizer with specific questions and allow time for an answer before registering.</p>
<p>Adaptive equipment, disability, pregnancy, age, chronic conditions, and previous injury can change planning without defining ambition. Use qualified individualized guidance where needed. Event inclusion and medical suitability are separate questions.</p>

<h2>Do not borrow someone else’s goal</h2>
<p>Training with a friend can support consistency, but people sharing a route do not necessarily share fitness, health, recovery, pace, time, or motivation. One runner may choose a faster 5K while another gradually prepares for 10K; both can still train together on compatible easy sessions.</p>
<p>Agree on what happens when paces separate, someone walks, or one person changes distance. No participant should be pressured to keep up, continue with pain, or enter a category to preserve the group.</p>
<p>Social accountability works best when it supports the chosen process: meeting for an easy run, checking that both arrived home, sharing route information, or celebrating consistent weeks. It becomes less useful when every session turns into comparison.</p>

<h2>Work through three example decisions</h2>
<p><strong>A new run-walk participant:</strong> they completed several comfortable shorter sessions but have not yet covered 5K. A supported 5K with a generous timeline may be the clear next step. Jumping to 10K adds no necessary value.</p>
<p><strong>A consistent 5K runner with limited weekends:</strong> they enjoy the distance and can train during short weekday windows. Another 5K focused on comfort, pacing, or participation may fit better than a 10K plan whose longer sessions repeatedly conflict with caregiving.</p>
<p><strong>A comfortable 10K finisher interested in endurance:</strong> they have months available, reliable route access, acceptable recovery, and genuine interest in longer training. A gradual 21K pathway may fit, with a condition to delay if long-run recovery or health becomes unstable.</p>
<p>Examples illustrate reasoning, not eligibility rules. Change one fact—terrain, heat, pain, cost, schedule, or interest—and the sensible answer may change.</p>

<h2>Pick one focus for November and December</h2>
<p>A two-month focus might be completing a comfortable 5K, developing toward 10K, beginning—but not rushing—a longer 21K pathway, or building consistent easy activity. The calendar does not require the event itself to happen by year-end.</p>
<p>Choose weekly behaviours: protected training windows, an easy-effort habit, a gradual long-run practice, a tracker rehearsal, or a recovery routine. Review after several weeks using what actually happened.</p>
<p>Holiday travel, weather, family commitments, and changing daylight may alter the plan. Reduce or move sessions instead of treating adaptation as failure.</p>

<h2>Find a matching HelloRun event</h2>
<p>When the goal and preparation window fit, <a href="/events">browse current HelloRun events</a>. Compare format, distance, dates, virtual window, route or location, activity types, completion method, proof, cutoffs, fees, inclusions, accessibility, and organizer support.</p>
<p>Do not assume a 5K, 10K, or 21K label tells you everything. A steep onsite course, accumulated virtual challenge, single-activity requirement, or time cutoff changes the demand.</p>
<p>Choose the distance that matches the training you can realistically support. Registration is a commitment to the event rules, not proof that you are ready.</p>

<h2>Frequently asked questions</h2>
<h3>Should I move from 5K to 10K?</h3><p>Consider it when recent shorter running is consistent, recovery is acceptable, you have time to progress gradually, and you want the endurance process.</p>
<h3>Does finishing 10K mean I am ready for 21K?</h3><p>No. Review the durability of your base, long-run development, recovery, schedule, health, logistics, and interest in the additional preparation.</p>
<h3>Is it better to run a faster 5K or a longer race?</h3><p>Neither is universally better. They are different goals with different training demands. Choose the process you want and can support.</p>
<h3>Can my next goal be consistency?</h3><p>Yes. Repeatable weeks, easy effort, or regular participation can be more useful than immediately increasing distance.</p>
<h3>How much weekly mileage do I need?</h3><p>This guide intentionally avoids a rigid universal number. Current experience, plan, health, intensity, terrain, recovery, and professional guidance matter.</p>

<h2>Official sources and health note</h2>
<p>This guide was reviewed in September 2026 against <a href="https://www.who.int/publications/i/item/9789240014886">WHO physical-activity guidance</a> and the CDC’s advice to <a href="https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html">start slowly and build up</a>. Population guidance does not determine readiness for an individual race. This article is general education, not medical clearance or an individualized training plan.</p>`;
const REQUIRED_HEADINGS=Object.freeze(['Bigger is not automatically better','Start from your recent running','When 5K is still a good goal','When moving to 10K makes sense','When 21K becomes realistic','Compare the weekly time you truly have','Consider recovery and the rest of your schedule','Consider route, weather, and access','Include run-walk options honestly','Compare long-run demand','Compare food and hydration complexity','Compare tracking and proof needs','Choose the kind of goal you actually want','Goal comparison by decision question','Use a simple decision sequence','Pick one focus for November and December','Find a matching HelloRun event','Frequently asked questions','Official sources and health note']);
const REQUIRED_LINKS=Object.freeze(['href="/events"','href="/blog/beginner-5k-training-plan-new-runners"','href="/blog/10k-training-plan-for-beginners"','href="/blog/how-to-run-your-first-10k-virtual-run"','href="/blog/what-to-do-after-your-first-10k"','href="/blog/21k-half-marathon-for-beginners"','href="/blog/what-is-a-long-run-for-beginners"','href="/blog/how-to-increase-running-distance"','href="/blog/how-to-run-with-a-busy-schedule"','href="/blog/how-to-set-running-goals-for-the-rest-of-the-year"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wc=contentText.split(/\s+/).filter(Boolean).length,p={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wc/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(p);return p}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),wc=t.split(/\s+/).filter(Boolean).length;if(wc<2500||wc>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||!p.excerpt||p.excerpt.length>220||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8||p.tags.some(x=>!x||x.length>30))e.push('tags');if(/<h1\b/i.test(p.contentHtml))e.push('h1');if(/bigger distance is always better|21K is the best goal for everyone/i.test(t))e.push('hierarchy');if(/every runner needs \d+ kilometres per week|universal weekly mileage/i.test(t))e.push('mileage');if(/one 10K guarantees half-marathon readiness|ignore persistent pain/i.test(t))e.push('safety');if(!/next running goal/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes('<h2>'+h+'</h2>'))e.push('heading '+h);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push('link '+l);if(e.length)throw new Error('Invalid next-goal payload: '+e.join('; '));return true}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
