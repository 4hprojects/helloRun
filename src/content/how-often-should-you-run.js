'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='how-often-should-you-run';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'How Often Should You Run? A Beginner Guide to Running Frequency',excerpt:'Choose a repeatable weekly running frequency from your current activity, goals, recovery, and available time instead of one universal number.',category:'Training',tags:Object.freeze(['how often should I run','running frequency','beginner running schedule','weekly running routine','running consistency','running rest days','5K training frequency','10K training frequency']),seoTitle:'How Often Should You Run? A Beginner Guide to Running Frequency',seoDescription:'Learn how beginners can choose weekly running frequency around current fitness, recovery, goals, and time without assuming everyone needs one schedule.',coverImageAlt:'Filipino beginners comparing different weekly running patterns with walking, family time, and recovery'});
const RAW_CONTENT_HTML=`
<p>If you are asking <strong>“how often should I run?”</strong>, the useful answer starts with your current activity, not a universal weekly number. Running once or twice, three times, or four or more days can each describe a sensible or unsuitable plan depending on experience, duration, intensity, total distance, recovery, health, goals, and ordinary life.</p>
<p>Frequency is only one part of training load. Adding a running day changes the week even when each run is short and easy. A beginner does not need to run almost every day for running to count, and a frequent runner does not automatically have a better plan.</p>
<p>This guide compares common patterns without prescribing one. It is general education, not diagnosis, medical clearance, rehabilitation, or individualized coaching. Follow qualified advice after injury, illness, surgery, pregnancy-related changes, a long break, or when health conditions or medication affect activity.</p>

<h2>There is no universal weekly number</h2>
<p>Population physical-activity guidance describes aerobic and strengthening activity across a week, but it does not require that the aerobic activity be running or prescribe one running frequency. Running plans must translate broad guidance through the person's current ability and context.</p>
<p>“Three days” can mean three ten-minute run-walk sessions or three demanding ten-kilometre runs. The count alone hides duration, distance, effort, terrain, heat, strength work, and recovery.</p>
<p>Use weekly frequency as a planning label, not a readiness test. A number that fits now may change during travel, exams, event preparation, illness, or a different goal.</p>

<h2>Start from your current activity</h2>
<p>Review three or four recent ordinary weeks. Count running and run-walk opportunities, approximate time or distance, effort, route, and response later that day and the next day. Include walking, sport, strength work, physical jobs, caregiving, and disrupted sleep as context.</p>
<p>The <a href="/blog/what-is-a-running-base">running-base guide</a> explains why repeatable activity is more informative than one exceptional outing. A previous race finish or old training peak is not the automatic starting point.</p>
<p>If you currently do no running, the first step may be ordinary walking, a short run-walk opportunity, or qualified assessment. Do not choose four days simply because a template labels them beginner-friendly.</p>

<h2>Running once or twice per week</h2>
<p>One or two weekly opportunities can be a legitimate starting or maintenance pattern. It may fit a new runner, a person balancing another sport, a busy period, or someone following individualized restrictions.</p>
<p>With fewer runs, keep expectations aligned. Rapid distance or performance progression may not fit, and each session should not become hard merely because opportunities are limited. Familiar easy running or run-walk can establish a routine.</p>
<p>Space sessions when practical and observe recovery. If one run repeatedly creates symptoms or disrupts ordinary function for several days, adding another day is not the first solution.</p>

<h2>Is running twice a week enough?</h2>
<p>Enough for what? Twice weekly may support learning, enjoyment, general activity, or maintaining familiarity for some people. It may not supply the specific preparation required for a time-sensitive performance goal.</p>
<p>Define the outcome before judging the number. If the goal is to complete an event, compare the current base, distance, activity format, preparation time, and event date. Choose a later event when the runway is inadequate.</p>
<p>A two-day routine that continues can be more useful than a five-day schedule abandoned after ten days. Do not dismiss a sustainable starting point.</p>

<h2>Running three times per week</h2>
<p>Three days often appears in beginner plans because it can provide repeated practice with non-running days between sessions. That pattern is common, not universally correct.</p>
<p>The sessions do not need three different difficult purposes. Beginners may use easy running or run-walk throughout. Later, an established runner may assign different roles, but intensity should follow an appropriate base and goal.</p>
<p>Spacing matters. Three consecutive runs create a different load from three separated runs. Work, weather, route access, and family obligations may determine the practical arrangement.</p>

<h2>Is running three times a week enough?</h2>
<p>Three suitable sessions may support many beginner goals, but the answer still depends on duration, effort, progression, and preparation time. A frequency label does not guarantee a 5K finish or pace improvement.</p>
<p>Look at whether the routine remains comfortable across several weeks. Check sleep, soreness, motivation, ordinary movement, and how easy effort feels. If the pattern barely fits, preserve it before adding more.</p>
<p>Use coaching or clinical input for individual constraints rather than treating three as a minimum everyone must reach.</p>

<h2>Running four or more days</h2>
<p>Four-plus days may suit established runners whose base, goals, recovery, and schedules support frequent running. It provides more opportunities to distribute volume, but it also creates more transitions, route exposure, and chances for easy days to become moderate.</p>
<p>Adding days should not mean copying every session from a lower-frequency plan and inserting extras. Total load, hard sessions, strength work, and recovery need reconsideration together.</p>
<p>Beginners should not assume frequent running is the badge of becoming serious. A higher count can be inappropriate even when social media makes it look ordinary.</p>

<h2>Rest and easy days have different roles</h2>
<p>A full rest day adds no planned training. An easy day contains controlled activity. A recovery run is a specific low-demand run more often used by runners who already tolerate higher frequency.</p>
<p>The <a href="/blog/running-recovery-days-explained">recovery-day guide</a> compares rest, ordinary movement, walking, and recovery running. Complete beginners often benefit from non-running recovery rather than adding recovery runs.</p>
<p>There is no universal rest-day count. Let recent load, health, sleep, work, symptoms, and response guide the pattern.</p>

<h2>Frequency and total distance are different</h2>
<p>Five two-kilometre runs and two five-kilometre runs both total ten kilometres, but distribution changes preparation, warm-ups, route exposure, and recovery. Neither pattern is automatically superior.</p>
<p>Total distance also hides time and effort. Ten kilometres in heat, hills, or run-walk format can involve very different duration from a flat cool run. Use multiple descriptors.</p>
<p>Do not increase frequency and distance simultaneously without considering the combined change. Hold other variables stable when possible so you can observe the response.</p>

<h2>Frequency and intensity are different</h2>
<p>A week with one interval workout can be more demanding than its running-day count suggests. Tempo work, hills, races, long runs, and strength training need recovery even when frequency remains unchanged.</p>
<p>Most beginner opportunities can remain easy and conversational. The <a href="/blog/easy-run-explained">easy-run guide</a> explains why easy pace changes with conditions.</p>
<p>Do not make every run hard to get more value from fewer days. Intensity is not a shortcut around recovery or gradual progression.</p>

<h2>Count strength training and other sport</h2>
<p>A weekly running count does not show cycling, court sport, hiking, gym work, dance, martial arts, or manual work. Those activities may support general fitness and enjoyment while also adding fatigue, soreness, impact, or scheduling demand. Put them on the same calendar before deciding that an open day needs a run.</p>
<p>Strength training can complement running, but unfamiliar exercises, increased resistance, and eccentric work can affect the following days. Do not add a running day and a new strength day simultaneously merely because they use different labels.</p>
<p>Someone whose main sport is not running may intentionally run once or twice as support. A runner preparing for a specific event may organize more run-specific opportunities. Neither person needs to defend the pattern by comparing counts.</p>
<p>When sports seasons overlap, identify the primary goal and protect enough recovery to perform ordinary responsibilities. Qualified coaching can help coordinate demanding sessions across activities.</p>

<h2>Age and life stage do not create one formula</h2>
<p>Chronological age alone cannot prescribe frequency. Training history, health, recovery, work, caregiving, sleep, menopause, pregnancy and postpartum context, disability, medication, and previous injury can matter. Two people of the same age may need different schedules.</p>
<p>Young participants require age-appropriate safeguarding, supervision, and development-focused guidance rather than adult plans. Older adults may be new runners or experienced lifelong athletes; neither stereotype establishes capacity.</p>
<p>Do not use frequency to test whether you are “too old” or “fit enough.” Begin with current function and follow relevant qualified advice. If a life transition changes sleep or responsibilities, reduce the plan without treating the adjustment as permanent decline.</p>
<p>A sustainable routine can change across a year. The correct December pattern may differ from a school term, peak work season, or later event block.</p>

<h2>Compare sample weeks as structures, not prescriptions</h2>
<p>A one- or two-day pattern might place a familiar easy or run-walk opportunity after adequate recovery, with walking or another suitable activity elsewhere. A three-day pattern might separate easy opportunities across the week. A four-day pattern might use several short easy runs and one distinct purpose for an established runner.</p>
<p>These examples describe spacing, not required workouts. None tells you duration, distance, or readiness. A person can also alternate weeks when shift work or caregiving follows a rotating schedule.</p>
<p>Mark each opportunity primary, flexible, backup, or unavailable. Include the whole appointment: changing, travel, warm-up, activity, return, personal care, food, and transition. A twenty-minute run may occupy substantially more calendar time.</p>
<p>Review what happened instead of forcing the diagram. If Tuesday repeatedly moves, choose a more honest anchor or accept a variable week. A schedule earns usefulness by helping decisions, not by remaining visually symmetrical.</p>
<p>Include commuting and route availability in every example. A dawn run may require visibility equipment and an earlier sleep opportunity; an after-work run may encounter traffic, darkness, or accumulated fatigue. A treadmill may reduce travel but still requires access, safe operation, and event permission. Frequency must fit the actual venue, not an imaginary frictionless hour.</p>

<h2>Frequency during beginner 5K training</h2>
<p>A first 5K plan may use walking, run-walk, and easy running across a few weekly opportunities. The exact count depends on the starting point and plan; a beginner should not add extra running days simply because the event is approaching.</p>
<p>Practice the format you expect to use. If walking is allowed and appropriate, run-walk can support completion. Include route, footwear, weather, and proof preparation for virtual events.</p>
<p>When a missed block makes gradual preparation impossible, choose a later event or a different category rather than compressing the schedule.</p>

<h2>Frequency during 10K training</h2>
<p>A 10K generally requires more duration and preparation than a 5K, but it still does not impose one universal weekly frequency. A repeatable shorter-distance base and enough runway matter more than copying a high-volume plan.</p>
<p>Some runners distribute easy running, one longer activity, and optional quality across several days. Beginners may need a simpler structure. Food, fluid, route, and recovery practice become more important as duration grows.</p>
<p>Use the <a href="/blog/10k-training-plan-for-beginners">beginner 10K guide</a> as an illustrative framework, not a substitute for individual advice.</p>

<h2>Busy-week maintenance</h2>
<p>During deadlines, travel, family events, or exams, reduce complexity. Protect a small familiar routine rather than preserving every feature of an improvement block.</p>
<p>The <a href="/blog/how-to-run-with-a-busy-schedule">busy-schedule guide</a> and <a href="/blog/maintain-running-fitness-during-holidays">holiday maintenance guide</a> help account for the whole appointment, sleep, responsibilities, and backup choices.</p>
<p>A reduced week does not create debt. Resume normally rather than doubling the next week.</p>

<h2>Why adding days is still adding training load</h2>
<p>An extra short run adds steps, impact, time, transitions, and less non-running recovery. It may also make shoes, routes, and heat exposure more frequent.</p>
<p>Add frequency only after the current pattern is stable and when another day serves a defined purpose. Consider reducing duration elsewhere so the weekly change is modest.</p>
<p>Observe several weeks before another increase. Delayed soreness, illness, work stress, and menstrual or other individual factors may change response across time.</p>

<h2>How to add one running day</h2>
<p>Choose a period without simultaneous event racing, major travel, new strength work, or a large distance increase. Add a short familiar easy or run-walk opportunity rather than a hard workout.</p>
<p>Place it where recovery and route access are most suitable. Keep permission to remove it. Track effort, symptoms, sleep, and ordinary function rather than only pace.</p>
<p>If the new day repeatedly creates problems, return to the previous pattern and review. Progress does not require preserving an unsuccessful experiment.</p>

<h2>How to reduce running frequency</h2>
<p>Remove the lowest-priority session first or combine the goal of two easy days into one familiar opportunity only when appropriate. Do not automatically make remaining runs longer or harder.</p>
<p>Reduction may support recovery, schedule changes, travel, heat, illness, or a shift in goals. It is a planning adjustment, not loss of identity.</p>
<p>After a substantial break, restart from current activity. Do not immediately restore the old weekly count.</p>

<h2>Use weather and route access in the decision</h2>
<p>More running days require more suitable windows. Philippine heat, humidity, rain, lightning, flooding, air quality, low light, and traffic may remove planned opportunities.</p>
<p>Maintain a safe backup route, a different time, walking, or an allowed indoor venue. No frequency goal requires exposure to dangerous conditions.</p>
<p>Check current official information close to departure. A monthly climate expectation is not a local forecast.</p>

<h2>Choose a repeatable weekly pattern</h2>
<ol><li>Review recent ordinary activity and response.</li><li>Name one current goal and its timeline.</li><li>Mark fixed work, family, school, travel, and sleep.</li><li>Choose the smallest number of suitable opportunities that serves the goal.</li><li>Place recovery and backup options explicitly.</li><li>Keep most beginner running easy or run-walk.</li><li>Review after several weeks before adding a day.</li></ol>
<p>The <a href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school">weekly schedule guide</a> can turn these decisions into a calendar. Build the smallest weekly routine you can repeat, then add frequency only when it supports your goal.</p>

<h2>A December frequency example</h2>
<p>The <a href="/blog/december-running-challenge-for-beginners">December challenge</a> does not require daily running. A participant can choose a few suitable weekly opportunities, walking, and recovery based on current capacity.</p>
<p>Label days preferred, reduced, or unavailable. If holiday commitments change, use the reduced version or rest rather than cramming.</p>
<p>At month end, review repeatability and choose January frequency from what actually worked.</p>

<h2>When to stop and seek help</h2>
<p>Stop exercise and seek urgent help for chest pressure, fainting, confusion, severe or unusual breathlessness, sudden weakness, loss of coordination, or other emergency signs.</p>
<p>Persistent or worsening pain, swelling, numbness, weakness, fever, changed gait, or reduced ordinary function deserves appropriately qualified assessment. More frequency is not a diagnostic test.</p>
<p>Follow health and rehabilitation restrictions even when a generic schedule suggests another run.</p>

<h2>Frequently asked questions</h2>
<h3>How often should beginners run?</h3><p>There is no universal count. Start from current activity and choose a small repeatable pattern with recovery.</p>
<h3>Is running twice a week worthwhile?</h3><p>Yes, it can support routine, enjoyment, or maintenance. Whether it serves a specific performance goal depends on the full plan.</p>
<h3>Is three days a week enough for 5K?</h3><p>Many plans use three opportunities, but readiness depends on starting point, session design, progression, health, and time—not the count alone.</p>
<h3>How many rest days do runners need?</h3><p>The number varies with load, experience, health, sleep, work, and response. Rest can change week to week.</p>
<h3>Should I add frequency or distance first?</h3><p>Choose the variable that serves the goal and change one element modestly. There is no universal order.</p>

<h2>Official sources and health note</h2>
<p>The <a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity">World Health Organization physical-activity fact sheet</a> and <a href="https://www.cdc.gov/physical-activity-basics/adding-adults/index.html">CDC guidance on adding activity</a> support gradual activity according to current ability; neither prescribes one running frequency.</p>
<p>Use population guidance as background, then choose frequency from your individual context and qualified advice. Reassess whenever your health, goals, responsibilities, routes, or recovery meaningfully change. Review the complete pattern.</p>
`;
const REQUIRED_HEADINGS=Object.freeze(['There is no universal weekly number','Start from your current activity','Running once or twice per week','Is running twice a week enough?','Running three times per week','Is running three times a week enough?','Running four or more days','Rest and easy days have different roles','Frequency and total distance are different','Frequency and intensity are different','Count strength training and other sport','Age and life stage do not create one formula','Compare sample weeks as structures, not prescriptions','Frequency during beginner 5K training','Frequency during 10K training','Busy-week maintenance','Why adding days is still adding training load','How to add one running day','How to reduce running frequency','Use weather and route access in the decision','Choose a repeatable weekly pattern','A December frequency example','When to stop and seek help','Frequently asked questions','Official sources and health note']);
const REQUIRED_LINKS=Object.freeze(['href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school"','href="/blog/what-is-a-running-base"','href="/blog/running-recovery-days-explained"','href="/blog/how-to-run-with-a-busy-schedule"','href="/blog/december-running-challenge-for-beginners"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),w=contentText.split(/\s+/).filter(Boolean).length,p={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(w/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(p);return p;}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),w=t.split(/\s+/).filter(Boolean).length;if(w<2500||w>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||!p.excerpt||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8)e.push('tags');if(/everyone needs exactly \d+ running days|beginners must run daily/i.test(t))e.push('universal frequency');if(/guarantees? improvement|will prevent all injuries/i.test(t))e.push('guarantee');if(!/how often should I run/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes(`<h2>${h}</h2>`))e.push(`heading ${h}`);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push(`link ${l}`);if(e.length)throw new Error(`Invalid running-frequency payload: ${e.join('; ')}`);return true;}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
