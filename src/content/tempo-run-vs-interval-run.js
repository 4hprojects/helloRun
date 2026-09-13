'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='tempo-run-vs-interval-run';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'Tempo Run vs Interval Run: What’s the Difference?',excerpt:'Compare tempo and interval workouts by effort, structure, recovery, purpose, and how each may fit a beginner’s 5K or 10K preparation.',category:'Training',tags:Object.freeze(['tempo run vs intervals','tempo vs intervals','threshold vs intervals','running workout types','speed workouts running','5k workouts','10k workouts','beginner running']),seoTitle:'Tempo Run vs Interval Run: What’s the Difference?',seoDescription:'Compare tempo runs and interval runs by effort, duration, recovery, training purpose, and how each may fit into 5K or 10K preparation.',coverImageAlt:'Editorial comparison of Filipino runners on a continuous tempo path and an alternating interval path in a tropical park'});
const RAW_CONTENT_HTML=`
<p><strong>Tempo run vs interval run</strong> is not a contest between a basic workout and an advanced one. A tempo run generally emphasizes sustained controlled-hard effort. An interval run divides purposeful work into repetitions separated by easier recovery. Both can be demanding, both can be adjusted, and neither belongs in every beginner’s week.</p>
<p>The right choice depends on the training purpose, current foundation, event goal, conditions, and recovery—not which name sounds faster. Coaching vocabulary also varies, so two sessions with different labels may overlap. Read the actual work, recovery, and effort instructions.</p>
<blockquote><strong>Quick answer:</strong> choose tempo when the goal is sustained controlled effort; choose intervals when planned recovery helps you repeat a specific effort. Choose easy running when your base or recovery does not support either.</blockquote>

<h2>Tempo run versus interval run at a glance</h2>
<table><thead><tr><th>Factor</th><th>Tempo run</th><th>Interval run</th></tr></thead><tbody>
<tr><td>Effort structure</td><td>Sustained controlled-hard work</td><td>Repeated work and easier recovery</td></tr>
<tr><td>Recovery breaks</td><td>Often none within the main continuous segment, though divided tempo is possible</td><td>Built into the repeated set</td></tr>
<tr><td>Typical feel</td><td>Steady concentration and accumulating controlled discomfort</td><td>Effort rises during work and settles during recovery</td></tr>
<tr><td>Pace consistency</td><td>Usually relatively even for the work segment</td><td>Work pace may be even while the whole session alternates</td></tr>
<tr><td>Beginner complexity</td><td>Requires restraint over a sustained section</td><td>Requires managing starts, recoveries, and repetitions</td></tr>
<tr><td>5K relevance</td><td>Supports sustained control</td><td>Can practise quicker rhythm in pieces</td></tr>
<tr><td>10K relevance</td><td>Supports steady endurance and concentration</td><td>Can provide focused event-related work</td></tr>
<tr><td>Main mistake</td><td>Turning it into a race</td><td>Sprinting early and shortening recovery</td></tr>
</tbody></table>
<p>This comparison describes common uses, not rigid definitions. A coach may prescribe divided tempo repetitions or long intervals that feel tempo-like. Purpose and actual load matter more than the label.</p>

<h2>What tempo running does</h2>
<p>A <a href="/blog/tempo-run-explained">tempo run</a> asks a runner to settle into controlled-hard effort and maintain it. The work is clearly above easy intensity but below all-out racing. Breathing is strong, conversation is limited, and form should remain coordinated.</p>
<p>Sustained work can teach patience, even pacing, and concentration as discomfort gradually rises. It may support endurance performance, but it does not guarantee a faster race or replace easy mileage, recovery, and event-specific preparation.</p>
<p>Tempo can be continuous or broken into longer controlled portions. Once substantial easy recovery separates much shorter, quicker efforts, the session looks more like conventional interval training.</p>

<h2>What interval running does</h2>
<p><a href="/blog/interval-running-for-beginners">Interval running</a> alternates work with recovery. The work intensity depends on the goal: moderate, controlled hard, event-specific, or briefly quicker. “Interval” never automatically means maximum sprinting.</p>
<p>Recovery lets the runner repeat a targeted effort with better control than one continuous block might allow. Changing recovery changes the workout. Generous recovery supports fresher repetitions; shorter recovery creates more accumulated demand.</p>
<p>Time, distance, or safe landmarks can define repetitions. No universal duration, count, pace, or ratio applies to every runner.</p>

<h2>Continuous effort versus repeated work</h2>
<p>The central difference is continuity. Tempo usually asks, “Can you settle and sustain?” Intervals ask, “Can you repeat the intended work after a deliberate reset?” These create different pacing decisions and mental demands.</p>
<p>During tempo, an aggressive start can spoil the entire sustained section. During intervals, the recovery may temporarily hide an overly hard start, but deterioration across repetitions eventually reveals it.</p>
<p>Neither format makes poor pacing harmless. A session is successful when the intended work remains controlled, not when one split becomes a personal record.</p>

<h2>Recovery differences</h2>
<p>A continuous tempo segment accumulates effort without a planned easy break. Warm-up and cool-down still surround it. Divided tempo may include easy recovery while preserving a sustained-work emphasis.</p>
<p>Intervals explicitly use recovery inside the set. Walking or very easy jogging is legitimate. Racing the recovery to protect average pace changes the training and may reduce the quality of later repetitions.</p>
<p>Both workouts need recovery afterward. Sleep, nutrition, hydration, health, work, stress, and other training affect readiness for the next day. In-session recovery cannot compensate for an overloaded week.</p>

<h2>Pace differences</h2>
<p>Tempo pace is often slower than the pace used for short intervals, but this is not guaranteed. Long intervals may be slower, and a brief tempo for a trained runner may be relatively quick. Compare sessions by purpose and time at effort.</p>
<p>Heat, humidity, hills, wind, surface, fatigue, and GPS error change pace. A Philippine afternoon may require a much slower number for the same relative demand as a cool morning.</p>
<p>Do not use another runner’s splits. The same pace can be easy for one person, tempo for another, and unsustainable for someone else.</p>

<h2>Which workout feels harder?</h2>
<p>Either can feel harder depending on intensity, duration, recovery, and the runner. Tempo discomfort builds continuously. Intervals may reach a higher speed, then offer relief, while cumulative repetitions make later efforts difficult.</p>
<p>Hardness is not a quality score. A more exhausting workout is not automatically more productive. The best session supplies enough stimulus for its purpose without creating avoidable disruption.</p>
<p>If form collapses, breathlessness becomes severe, or the planned effort turns desperate, reduce or end the work. Do not preserve a label at the expense of control.</p>

<h2>Which is better for beginners?</h2>
<p>Often neither—yet. Complete beginners already adapt to walking, run-walk training, and easy running. A stable <a href="/blog/what-is-a-running-base">running base</a> and predictable recovery come before formal hard sessions.</p>
<p>Tempo may be conceptually simple but requires accurate restraint. Intervals provide recovery but require repeated acceleration and judgment. A coach may choose a modest version based on the individual; neither format is universally easier.</p>
<p>Returning runners should use present fitness rather than old results. Health conditions, pregnancy, medications, disability, or previous injury may require individualized guidance.</p>

<h2>Which fits 5K training?</h2>
<p>For an established runner, tempo can support sustained control while intervals can introduce quicker rhythm in manageable portions. Both may contribute to 5K preparation, but neither must exactly match race pace.</p>
<p>A first-time 5K participant may need only consistent easy and run-walk training. A performance goal can justify harder work once the foundation supports it.</p>
<p>Choose according to the gap being addressed. Someone who starts too fast may benefit from controlled sustained pacing; someone unfamiliar with quicker rhythm may use conservative intervals. This is an inference a coach should individualize.</p>

<h2>Which fits 10K training?</h2>
<p>Ten-kilometre performance depends strongly on endurance and pacing. Tempo can practise sustained focus, while intervals can divide event-related or quicker work. The <a href="/blog/10k-training-plan-for-beginners">beginner 10K plan</a> keeps both beneath the broader priorities of consistency and gradual load.</p>
<p>A runner increasing distance may need to stabilize easy running before adding intensity. Longer goals do not mean every quality session must become longer.</p>
<p>Evaluate the whole plan: long run, easy days, strength work, life demands, and recovery. One impressive workout cannot repair an unbalanced week.</p>

<h2>Can a runner use both?</h2>
<p>Yes, an established runner may use both across a training cycle, but that does not mean both belong in the same week. Alternating emphasis can provide variety while leaving recovery space.</p>
<p>Adding tempo and intervals at once makes it difficult to identify which change caused excessive fatigue or soreness. Introduce one modest session type, observe several responses, then decide whether another tool is necessary.</p>
<p>Some workouts blend characteristics, such as longer repetitions at controlled-hard effort. Do not add another hard day merely because the hybrid session does not fit a neat category.</p>

<h2>Why more hard workouts are not better</h2>
<p>Hard sessions create stress that must be supported by easier training and recovery. Turning multiple easy days into tempo, adding intervals, and keeping a demanding long run can leave no real low-intensity space.</p>
<p>The <a href="/blog/easy-run-explained">easy-run guide</a> explains why slower days have a distinct purpose. Feeling that easy pace is “too slow” does not justify replacing it with intensity.</p>
<p>Watch for accumulating fatigue, sleep disruption, irritability, declining easy-run performance, persistent soreness, or loss of enthusiasm. These are reasons to reassess load, not to prove toughness.</p>

<h2>How to choose based on purpose</h2>
<ul><li><strong>Sustained pacing:</strong> a conservative tempo format may fit.</li><li><strong>Repeated quicker rhythm:</strong> intervals with adequate recovery may fit.</li><li><strong>Building basic consistency:</strong> easy or run-walk training likely fits better.</li><li><strong>Recovering from demanding work:</strong> easy movement or rest may be the correct session.</li><li><strong>Unclear goal:</strong> do not add intensity merely for variety; clarify the purpose first.</li></ul>
<p>A plan should explain why a workout exists, what the effort means, how recovery works, and what adjustment is allowed. If it only supplies impressive pace targets, it is missing context.</p>

<h2>How each workout develops pacing judgment</h2>
<p>Tempo running provides continuous feedback. If you begin above the intended effort, breathing and form may deteriorate while there is no recovery break to reset the mistake. Starting slightly conservative and settling into rhythm teaches the runner to distinguish sustainable control from excitement.</p>
<p>Intervals offer repeated chances to adjust. After one work period, you can compare effort, pace, and recovery before beginning the next. That opportunity is useful only when you respond to the evidence. Repeating the same over-fast start does not become better pacing because recovery separates it.</p>
<p>Review the entire set rather than selecting the best split. Stable work, appropriate recovery, and normal subsequent training show more than one exceptional repetition. For tempo, compare the beginning and end of the controlled section instead of rewarding a final sprint.</p>

<h2>How watches can confuse the comparison</h2>
<p>A watch may display current pace, lap pace, heart rate, training effect, or a named workout category. These estimates can be helpful, but they do not define what your body actually completed. Short-interval GPS may lag, wrist heart rate may misread, and proprietary training labels may use definitions different from your plan.</p>
<p>Tempo running can tempt constant pace checking; intervals can tempt frantic correction when a short split looks slow. Configure simple alerts when useful, then keep attention on traffic, surface, effort, and movement. Never accelerate beyond a safe stopping point to complete a device target.</p>
<p>Save interpretation until after cooling down. Look at averages with route and weather context. A watch prediction or performance score is not a diagnosis, medical clearance, or command to increase training.</p>

<h2>How to modify either session</h2>
<p>When tempo becomes too hard, reduce pace, shorten the controlled segment, divide it with easy recovery, or convert the rest to easy running. When intervals become uncontrolled, slow the work, lengthen recovery, remove repetitions, or stop the set. These are training decisions, not failures.</p>
<p>Modify before the session when heat, hills, fatigue, or limited route space are predictable. During the session, respond to new information. A fixed plan cannot anticipate every symptom, obstruction, or weather change.</p>
<p>Change one main variable at a time. Simultaneously increasing tempo duration, interval speed, weekly distance, and strength work hides which demand produced soreness. Conservative progression makes the response easier to understand.</p>

<h2>Examples of labels that overlap</h2>
<p>A runner might complete several longer controlled-hard repetitions with brief easy jogging. One coach may call this cruise intervals, another divided tempo, and another threshold repetitions. The body responds to effort, duration, recovery, and total work rather than the name in the calendar.</p>
<p>Likewise, an unstructured run with faster and easier sections may be called fartlek. It could behave like gentle pickups, demanding intervals, or a varied tempo depending on execution. Informal structure does not automatically reduce load.</p>
<p>When following a plan, ask what the work should feel like, whether recovery is complete or deliberately limited, and how the day relates to other training. Those answers prevent vocabulary from becoming a false source of precision.</p>

<h2>How to review next-day response</h2>
<p>Record conditions, route, work structure, recovery, effort, and any unusual symptoms. The following day, consider soreness, energy, sleep, gait, and whether easy activity feels normal. One number cannot summarize recovery.</p>
<p>Some tiredness after unfamiliar training can occur, but persistent or worsening pain, swelling, weakness, numbness, or changed movement deserves caution and possibly professional assessment. Repeatedly needing to abandon later sessions suggests the hard workout or weekly load needs adjustment.</p>
<p>Progress may appear as steadier tempo pacing, more consistent interval repetitions, calmer breathing at the same contextual effort, or better recovery. It does not require making every comparison faster.</p>

<h2>Place the choice within the week</h2>
<p>Use the <a href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school">weekly schedule guide</a> to count work, school, commuting, sport, strength training, long runs, and sleep. Different workout names still draw from the same recovery capacity.</p>
<p>Separate hard days with enough easier time for your response. There is no universal number of recovery days. A physically strenuous job or poor sleep can change what the calendar should contain.</p>
<p>Do not double the next workout after missing one. Resume a sensible schedule rather than creating a sudden load spike.</p>

<h2>Warm up, cool down, and use a safe route</h2>
<p>Both sessions should begin with easy movement and a readiness check. If easy pace feels unexpectedly hard, pain changes movement, or conditions are unsafe, switch to easy training or stop.</p>
<p>Choose predictable footing, visibility, and room to slow down. Avoid busy crossings, blind corners, slippery surfaces, and routes where a pace target competes with traffic awareness.</p>
<p>Finish with easy walking or jogging. A cool-down provides a gradual transition but does not erase excessive load or guarantee protection from soreness.</p>

<h2>Adjust for Philippine heat and humidity</h2>
<p>Heat and humidity increase the demand of both tempo and interval work. Choose cooler or shaded conditions when practical, reduce pace or work duration, extend recovery, or cancel. A fixed cool-weather target should not override present effort.</p>
<p>Severe weather, lightning, flooding, poor air quality, and unsafe visibility are reasons to move or remove the session. Consider hydration access for the overall outing without assuming every short workout requires a product.</p>
<p>Confusion, fainting, severe weakness, loss of coordination, or other signs of heat illness require stopping and appropriate urgent assistance.</p>

<h2>Common comparison mistakes</h2>
<ul><li>Assuming intervals must be all-out sprints.</li><li>Calling every moderately hard run a tempo.</li><li>Judging quality only by fastest pace.</li><li>Copying another runner’s work and recovery.</li><li>Racing the end of a tempo segment.</li><li>Shortening interval recovery to appear fitter.</li><li>Adding both formats before establishing easy consistency.</li><li>Ignoring heat, hills, sleep, and total weekly stress.</li></ul>

<h2>When easy running is the correct answer</h2>
<p>Choose easy running or rest during illness, unusual fatigue, unresolved soreness, unsafe conditions, or when another hard session already supplies enough stress. Preserving consistency is more useful than winning one workout.</p>
<p>Stop for new or worsening pain, chest pressure, dizziness, faintness, severe or unusual breathlessness, sudden weakness, confusion, or lost coordination. Seek urgent help for emergency symptoms. Persistent swelling, numbness, weakness, pain, or changed gait deserves professional assessment.</p>
<p>An article cannot determine whether higher intensity is safe for a particular person. Follow relevant clinical advice and choose conservatively when uncertain.</p>

<h2>Frequently asked questions</h2>
<h3>Should I do tempo or intervals first?</h3><p>There is no universal order. Many beginners should first build easy consistency. A coach may select a modest format based on goal, current ability, and recovery.</p>
<h3>Are intervals always faster than tempo?</h3><p>No. Short intervals often are, but interval pace depends on length and purpose. Some long intervals may resemble or be slower than tempo effort.</p>
<h3>Can tempo have recovery breaks?</h3><p>Yes. Divided tempo work can use recovery while preserving a controlled-hard emphasis. Labels overlap.</p>
<h3>Can I use both for a 5K or 10K?</h3><p>Possibly, once your base supports harder training. They do not necessarily belong in the same week, and neither is mandatory for completion goals.</p>
<h3>Which burns more calories?</h3><p>Energy use varies with body, duration, intensity, and conditions. Calorie estimates are not a sound way to choose between these workouts.</p>

<h2>Official sources and health note</h2>
<p>The <a href="https://health.gov/paguidelines/second-edition/pdf/Physical_Activity_Guidelines_2nd_edition.pdf">U.S. Physical Activity Guidelines</a> describe interval training as repeated relatively intense activity separated by recovery and note that no single work or recovery formula defines it. The <a href="https://www.cdc.gov/physical-activity/php/about/measuring-physical-activity-intensity.html">CDC intensity guide</a> explains relative effort and the talk test, which support individualized interpretation rather than universal pace.</p>
<p>This comparison is general education, not diagnosis, medical clearance, rehabilitation, or an individualized plan. Choose a workout based on its purpose, not which one sounds more advanced.</p>
`;
const REQUIRED_HEADINGS=Object.freeze(['Tempo run versus interval run at a glance','What tempo running does','What interval running does','Continuous effort versus repeated work','Recovery differences','Pace differences','Which workout feels harder?','Which is better for beginners?','Which fits 5K training?','Which fits 10K training?','Can a runner use both?','Why more hard workouts are not better','How to choose based on purpose','Place the choice within the week','Warm up, cool down, and use a safe route','Adjust for Philippine heat and humidity','Common comparison mistakes','When easy running is the correct answer','Frequently asked questions','Official sources and health note']);
const REQUIRED_LINKS=Object.freeze(['href="/blog/tempo-run-explained"','href="/blog/interval-running-for-beginners"','href="/blog/easy-run-explained"','href="/blog/what-is-a-running-base"','href="/blog/how-to-build-a-weekly-running-schedule-around-work-or-school"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wordCount=contentText.split(/\s+/).filter(Boolean).length,p={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wordCount/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(p);return p;}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),w=t.split(/\s+/).filter(Boolean).length;if(w<2500||w>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||!p.excerpt||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8)e.push('tags');if(/tempo is always better|intervals are always better/i.test(t))e.push('false hierarchy');if(/will guarantee a faster|will prevent all injuries/i.test(t))e.push('guarantee');if(!/tempo run vs interval run/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes(`<h2>${h}</h2>`))e.push(`heading ${h}`);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push(`link ${l}`);if(e.length)throw new Error(`Invalid tempo-vs-interval payload: ${e.join('; ')}`);return true;}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
