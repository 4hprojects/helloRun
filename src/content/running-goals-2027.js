'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='running-goals-2027';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'How to Set Running Goals for 2027',excerpt:'Choose a realistic 2027 running goal using your current consistency, recent distances, available time, preferences, and lessons from 2026.',category:'Training',tags:Object.freeze(['running goals 2027','running goals','running goals for beginners','new year running goals','running goal ideas','running resolutions','goal setting','Philippines running']),seoTitle:'How to Set Running Goals for 2027',seoDescription:'Set a realistic 2027 running goal using your current consistency, recent distances, available time, training preferences, and lessons from 2026.',coverImageAlt:'Filipino runner reviewing the past year and choosing one realistic running path with smaller checkpoints for 2027'});
const RAW_CONTENT_HTML=`
<p><strong>Running goals for 2027</strong> should begin with evidence, not New Year pressure. Review what you actually did in 2026, decide what kind of running you want to improve, estimate the weekly time and environments available, then choose one primary early-year goal. Smaller checkpoints can show whether the plan still fits.</p>
<p>A goal can focus on consistency, a first 5K, a faster 5K, a first or faster 10K, a first 21K, an accumulated-distance challenge, or a dependable habit. None is automatically more serious than another. The best choice matches your current starting point and life.</p>
<p>This guide is general education, not medical clearance or an individualized training plan. Health conditions, pregnancy, recent illness or injury, medication questions, or uncertainty about exercise deserve appropriately qualified personal guidance.</p>

<h2>Review before setting the goal</h2>
<p>Start with the <a href="/blog/how-to-review-your-running-year">running-year review</a>. Look at completed weeks, common distances, longest manageable session, easy versus harder efforts, interruptions, walking, strength work, recovery, routes, weather, and enjoyment. Include what happened after sessions, not only totals.</p>
<p>Separate official approved event results from app totals, and separate intention from completed activity. A plan written in January is not evidence that its volume became normal. Missing data should stay missing rather than being estimated upward.</p>
<p>Write three useful observations: what was sustainable, what repeatedly broke down, and what you want more or less of. These observations create a more honest starting point than comparing your year with another runner's highlights.</p>

<h2>Choose what you actually want to improve</h2>
<p>“Become a better runner” is too broad to guide a week. Decide whether the priority is showing up regularly, covering a particular distance, feeling more comfortable at an existing distance, improving time, learning pacing, participating socially, or completing an accumulated event.</p>
<p>Ask why the change matters and what work it implies. A faster time usually needs different preparation from a first completion. A habit goal emphasizes repeatability. An event goal adds registration dates, rules, route, proof, and sometimes travel.</p>
<p>Choose a goal you would still value if nobody saw the activity online. External recognition can be enjoyable, but it should not turn an unsuitable target into an obligation.</p>

<h2>Define a primary goal and supporting behaviors</h2>
<p>A primary goal is the main outcome or capability you will evaluate first. Supporting behaviors are repeatable actions that may help, such as protecting two or three suitable activity windows, completing easy sessions, recording recovery, or checking event rules.</p>
<p>Behaviors are not guarantees. Completing every planned week cannot promise a time or injury-free season. They do, however, give you observable decisions to review before the distant outcome arrives.</p>
<p>Write the goal with a boundary: “build a repeatable running routine through March” is clearer than “run more.” If choosing an event, include the date and completion method only after verifying current official information.</p>

<h2>Option one: a consistency goal</h2>
<p>A consistency goal can focus on weeks with one or more suitable sessions, rather than a daily streak or enormous annual total. It may fit beginners, returning runners, or anyone whose 2026 pattern was repeatedly interrupted by an unrealistic schedule.</p>
<p>Define what counts: running, run-walk, or another accepted activity; a minimum useful duration; and exceptions for illness, unsafe weather, travel, or recovery. A flexible goal should make restarting visible, not reward training through warning signs.</p>
<p>Use the <a href="/blog/what-is-a-running-base">running-base guide</a> to understand why repeatable easy activity matters. Avoid turning consistency into a performance test every session.</p>

<h2>Option two: a first 5K</h2>
<p>A first 5K goal may mean completing five kilometres by running, run-walk, or an event-approved method. Specify the intended method without treating walking as failure. Choose enough preparation time from your actual starting point.</p>
<p>The <a href="/blog/5k-10k-or-21k-next-running-goal">next-distance guide</a> helps compare 5K, 10K, and 21K demands. A 5K is not merely a smaller version of a long race; it can be a complete, meaningful goal.</p>
<p>Select a safe route or suitable event, test tracking, and use an early shorter checkpoint. Do not schedule the finish so soon that the calendar requires abrupt progression.</p>

<h2>Option three: a faster 5K</h2>
<p>A faster 5K is a performance goal for someone with a stable current 5K routine and a reason to work on pace. Establish a recent comparable baseline instead of using an old personal best as an automatic target.</p>
<p>The <a href="/blog/how-to-run-a-faster-5k">faster 5K guide</a> explains easy running, selective quality, recovery, and specific preparation. More hard sessions are not automatically better, and no workout guarantees a result.</p>
<p>Define success beyond one number: improved pacing, a controlled start, a consistent training block, or a stronger finish may provide evidence even if weather or course conditions prevent the target time.</p>

<h2>Option four: a first 10K</h2>
<p>A first 10K goal adds time on feet and recovery demand beyond a first 5K. It may fit a runner who already completes shorter distances consistently and has weekly space to extend gradually.</p>
<p>Choose completion rather than speed as the primary aim unless a qualified plan and established background support something else. Practice route, clothing, tracking, and any fluid or food decisions during ordinary preparation rather than improvising on goal day.</p>
<p>Do not choose 10K solely because 5K appears too ordinary online. The distance should reflect what you want and can prepare for safely.</p>

<h2>Option five: a faster 10K</h2>
<p>A faster 10K combines sustained pacing with adequate endurance. Review whether the distance is already routine and whether recovery after harder work fits your schedule. If not, consistency at 10K may be the more useful goal.</p>
<p>The <a href="/blog/how-to-run-a-faster-10k">faster 10K guide</a> describes controlled progression without presenting one universal pace formula. A performance block still contains easy running and recovery.</p>
<p>Use a range or process target where appropriate. Course hills, turns, heat, humidity, wind, congestion, and measurement can change finish time without invalidating the work.</p>

<h2>Option six: a first 21K</h2>
<p>A first 21K or half-marathon goal requires substantially more time, long-run progression, fueling and hydration practice, recovery, and event logistics than a shorter goal. Interest alone does not establish readiness.</p>
<p>The <a href="/blog/21k-half-marathon-for-beginners">beginner 21K guide</a> outlines the commitment and health boundaries. Review available months, recent base, longest comfortable activity, safe routes, climate, and weekly responsibilities.</p>
<p>If the preparation cannot fit without sacrificing sleep, work, study, caregiving, or recovery, move the event later or choose a shorter target. Deferring is a planning decision, not a failure.</p>

<h2>Option seven: an accumulated-distance challenge</h2>
<p>An accumulated goal spreads distance across multiple approved activities. It can reward consistency, but a large total can hide an unrealistic daily or weekly requirement. Calculate the average and compare it with your demonstrated routine before registering.</p>
<p>Confirm activity window, accepted activity types, proof, review, category, and submission cutoff. Only approved eligible distance counts officially. Do not assume ordinary steps, duplicate records, or activities outside the dates qualify.</p>
<p>Include recovery and missed-week scenarios. A goal that becomes unsafe after one interruption is fragile. Choose a lower total or longer window when needed.</p>

<h2>Option eight: a running habit goal</h2>
<p>A habit goal focuses on a stable cue and a small repeatable action: preparing clothes, protecting a regular window, beginning with an easy walk, or recording the session. It can reduce decision friction without demanding daily running.</p>
<p>Define a minimum version and a restart rule. The minimum must still respect health and safety; it is not a requirement to exercise while ill or in dangerous conditions. A restart rule tells you what to do after disruption without punishment.</p>
<p>Track the behavior separately from pace and distance so an easy or shortened session is not erased by a performance score.</p>

<h2>Avoid stacking too many goals</h2>
<p>Trying to build consistency, run a first 10K, set a 5K personal best, complete a huge annual total, and maintain a daily streak at once creates competing demands. Progress toward one goal can undermine recovery or specificity for another.</p>
<p>Choose one primary early-year goal and at most a small number of supporting behaviors. Put attractive alternatives on a later list rather than pretending they are simultaneous priorities.</p>
<p>Revisit after the checkpoint. Completing the first block may justify a new goal; struggling may justify simplification. Neither result requires protecting the original annual plan.</p>

<h2>Match the goal to available weekly time</h2>
<p>Map work, school, commute, caregiving, worship, household tasks, sleep, meals, and travel before placing training. Use actual weeks, including busy periods, rather than an ideal January week.</p>
<p>Count preparation, route travel, warm-up, activity, cool-down, changing, and recovery—not only recorded running minutes. A plan that technically fits by removing sleep does not fit.</p>
<p>Create preferred, reduced, and unavailable versions of the week. When the reduced version cannot support the target for many weeks, adjust the goal rather than hiding the mismatch.</p>

<h2>Match the goal to route and climate access</h2>
<p>A goal requiring hills, long uninterrupted routes, a track, or a treadmill should account for whether those environments are legally, safely, and consistently accessible. Do not assume an event course can be simulated on an unsafe road.</p>
<p>In the Philippines, heat, humidity, heavy rain, flooding, lightning, and daylight may change training opportunities. Build backups and check current warnings. Gear does not remove environmental risk.</p>
<p>If travel or facility fees make the planned environment unreliable, choose a goal that uses available safe routes or revise the event timing.</p>

<h2>Set an early-year checkpoint</h2>
<p>Choose a checkpoint several weeks into the plan to review completed sessions, effort, recovery, schedule fit, and enjoyment. It need not be a race. A familiar easy route, comfortable distance, or consistency count can provide useful evidence.</p>
<p>Decide in advance what would support continuing, reducing, changing, or stopping the goal. Do not make the checkpoint a pass-fail test that requires an all-out effort.</p>
<p>Record context so later comparison is honest: weather, route, sleep, interruptions, symptoms, and device. One strong or difficult day should not override the full pattern.</p>

<h2>Test the goal against an ordinary difficult week</h2>
<p>Imagine a week with a late workday, heavy rain, family responsibility, or reduced sleep. Ask which sessions remain suitable, which become shorter, and which disappear. If the goal works only when every day is unusually convenient, it is not yet grounded in your normal year.</p>
<p>Test finances too. Registration, transport, facility access, shoes, food, accommodation, and device costs should not be hidden behind the goal. Running does not require buying every optional product, and a costly event is not automatically more meaningful than a local personal checkpoint.</p>
<p>Finally, test social support. Tell household members what time and responsibilities the plan requires, without assigning them work by assumption. A goal that repeatedly creates conflict may need a different schedule or format. The test is not meant to eliminate ambition; it reveals the version that can survive ordinary constraints.</p>

<h2>Plan the year in reviewable seasons</h2>
<p>Do not prescribe all twelve months in December. Plan the first block in enough detail to act, identify a checkpoint, and keep later periods provisional. Work changes, weather, health, event calendars, and preferences can make a precise annual map obsolete.</p>
<p>A simple sequence might establish routine, review, prepare for one goal, recover, and then decide what follows. The sequence should not assume automatic advancement from 5K to 10K to 21K. Repeating a distance, maintaining a base, or taking an easier period can be deliberate.</p>
<p>At each transition, review completed work and recovery before confirming the next block. This prevents the January goal from silently expanding into a year of commitments that were never reassessed.</p>

<h2>Choose measures that do not reward unsafe behavior</h2>
<p>A useful measure should not pressure you to run through illness, pain, severe weather, or missing recovery. Daily streaks and large totals can become harmful when the metric matters more than the decision.</p>
<p>Consider weeks with suitable activity, planned sessions completed or responsibly adapted, easy effort kept easy, or review notes recorded. Performance goals can include pacing decisions and recovery, not only finish time.</p>
<p>Never fabricate, duplicate, or edit activities to preserve a goal. An honest gap is valuable information; a false perfect record cannot guide the next decision.</p>

<h2>Write decision rules before motivation changes</h2>
<p>Specify when you will use the shorter version, move indoors, reschedule, walk, or rest. Include unsafe weather, route closure, illness, concerning symptoms, unusual fatigue, travel disruption, and significant loss of sleep.</p>
<p>Also define when to seek qualified help and when to revise the goal. Written boundaries are easier to follow than rules invented while feeling guilty about a missed session.</p>
<p>A goal is allowed to change. Adjustment based on evidence is not weak commitment; it is the purpose of monitoring.</p>

<h2>Choose a January starting point</h2>
<p>Begin from the routine you have at the end of December, not the runner you hope to be in June. If recent activity was low or interrupted, use walking, run-walk, short easy running, or recovery as appropriate.</p>
<p>Do not repay December inactivity with a high-volume first week. Establish repeatable times and observe response before adding distance or intensity. A delayed start after illness or travel can be the correct start.</p>
<p>Choose one small first-week action that directly serves the primary goal. The complete January structure should be reviewed as its own plan, not improvised from a resolution slogan.</p>

<h2>A one-page 2027 goal statement</h2>
<ol><li>What did 2026 show about my current routine?</li><li>What do I genuinely want to improve?</li><li>What is my one primary early-year goal?</li><li>Which behaviors support it?</li><li>How much weekly time and route access exist?</li><li>What is the first checkpoint?</li><li>What evidence will make me continue, reduce, or change?</li><li>What are my health, recovery, and weather stop rules?</li><li>What is the minimum restart version after disruption?</li></ol>
<p>Choose one primary running goal for early 2027, then use smaller checkpoints to decide whether the plan is working. Keep the statement somewhere you can revise it rather than posting it as an irreversible promise.</p>

<h2>When to stop and seek help</h2>
<p>Stop exercise and seek urgent help for chest pressure, fainting, confusion, severe or unusual breathlessness, sudden weakness, loss of coordination, or other emergency signs. Persistent or worsening pain, swelling, numbness, weakness, changed gait, fever, or reduced ordinary function deserves qualified assessment.</p>
<p>No goal date creates medical readiness. Return after illness or injury should follow appropriate individual advice, not a generic calendar.</p>

<h2>Frequently asked questions</h2>
<h3>What is a realistic running goal for a beginner?</h3><p>One based on current activity, available weeks, safe access, and personal interest. Consistency, run-walk, or a first 5K may fit, but there is no universal choice.</p>
<h3>Should I choose distance or consistency?</h3><p>Choose the outcome you value most. A consistency block can precede a distance goal when routine is not yet stable.</p>
<h3>Can I have more than one running goal?</h3><p>Yes, but sequence them. One primary goal with supporting behaviors is usually clearer than several competing performance targets.</p>
<h3>When should I change the goal?</h3><p>Change it when health, schedule, route access, recovery, preferences, or checkpoint evidence shows that the current version no longer fits.</p>
<h3>Do I need an event?</h3><p>No. An event can provide structure, while a personal checkpoint can work without registration.</p>

<h2>Official sources and health note</h2>
<p>The <a href="https://www.who.int/publications/i/item/9789240014886">WHO physical-activity guidelines</a> emphasize that some activity is better than none and that inactive people should begin with small amounts and progress over time. The <a href="https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html">CDC getting-started guidance</a> recommends starting slowly, identifying barriers, and scheduling activity. Population guidance does not choose your race distance, pace, or individual plan.</p>
<p>A useful 2027 goal is specific enough to guide the next week and flexible enough to change when evidence changes.</p>
`;
const REQUIRED_HEADINGS=Object.freeze(['Review before setting the goal','Choose what you actually want to improve','Define a primary goal and supporting behaviors','Option one: a consistency goal','Option two: a first 5K','Option three: a faster 5K','Option four: a first 10K','Option five: a faster 10K','Option six: a first 21K','Option seven: an accumulated-distance challenge','Option eight: a running habit goal','Avoid stacking too many goals','Match the goal to available weekly time','Match the goal to route and climate access','Set an early-year checkpoint','Test the goal against an ordinary difficult week','Plan the year in reviewable seasons','Choose measures that do not reward unsafe behavior','Write decision rules before motivation changes','Choose a January starting point','A one-page 2027 goal statement','When to stop and seek help','Frequently asked questions','Official sources and health note']);
const REQUIRED_LINKS=Object.freeze(['href="/blog/how-to-review-your-running-year"','href="/blog/5k-10k-or-21k-next-running-goal"','href="/blog/how-to-run-a-faster-5k"','href="/blog/how-to-run-a-faster-10k"','href="/blog/21k-half-marathon-for-beginners"','href="/blog/what-is-a-running-base"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wordCount=contentText.split(/\s+/).filter(Boolean).length,payload={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wordCount/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(payload);return payload;}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),w=t.split(/\s+/).filter(Boolean).length;if(w<2500||w>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||!p.excerpt||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8)e.push('tags');if(/you must stack every goal|you should ignore recovery|you must run while ill/i.test(t))e.push('unsafe goals');if(/guarantees? success|injury-free guarantee/i.test(t))e.push('guarantee');if(!/running goals for 2027/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes(`<h2>${h}</h2>`))e.push(`heading ${h}`);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push(`link ${l}`);if(e.length)throw new Error(`Invalid 2027 running-goals payload: ${e.join('; ')}`);return true;}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
