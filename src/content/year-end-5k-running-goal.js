'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='year-end-5k-running-goal';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'How to Plan a Year-End 5K Without Turning It Into an All-Out Race',excerpt:'Use a year-end 5K as a calm running checkpoint by choosing a route, effort, tracking method, and goal that fit your current ability.',category:'Training',tags:Object.freeze(['year end 5k','December 5k','holiday 5k','5k running goal','virtual 5k','beginner 5k','running checkpoint','Philippines running']),seoTitle:'How to Plan a Year-End 5K Without Turning It Into an All-Out Race',seoDescription:'Use a year-end 5K as a running checkpoint by choosing a route, effort, tracking method, and realistic goal instead of making it an all-out race.',coverImageAlt:'Filipino beginner completing a controlled year-end 5K and calmly reviewing the activity in a notebook'});
const RAW_CONTENT_HTML=`
<p>A <strong>year end 5K</strong> can be a useful checkpoint without becoming an all-out race. Five kilometres may be completed as an easy run, a run-walk, a comfortable continuous effort, a paced practice, or—only when appropriate—a carefully chosen performance attempt. The distance does not dictate the intensity.</p>
<p>December can include disrupted sleep, travel, celebrations, workload, unfamiliar routes, weather changes, and accumulated fatigue. Decide what you want to learn before selecting a date, route, pace, or public goal. A calmer 5K can provide more useful information than a forced personal record.</p>
<p>This guide is general education, not medical clearance or an individualized training plan. Adapt to current ability, health, recovery, local conditions, and qualified professional advice.</p>

<h2>A 5K can be a checkpoint, not a race</h2>
<p>A checkpoint is a repeatable activity used to observe what is true now. It can show whether five kilometres feels familiar, whether a run-walk pattern remains controlled, how pacing changes across the route, or whether your tracking setup works. It does not have to rank the year or prove fitness.</p>
<p>Race framing can encourage a rushed start, ignored signals, and disappointment when conditions differ from a previous result. Checkpoint framing allows you to finish with honest notes about effort, route, weather, interruptions, and recovery.</p>
<p>If an organized event is involved, its rules still apply. Your personal intention can be easy even if the distance is called a race. Do not obstruct other participants or ignore course instructions.</p>

<h2>Choose your purpose before the date</h2>
<p>Write one primary purpose: complete the distance, practice a comfortable continuous run, use planned walk breaks, hold an even effort, test event logistics, or collect a baseline. Avoid stacking every purpose onto one activity.</p>
<p>A clear purpose determines the route and tracking. A completion checkpoint favors simplicity and generous pacing. A route-practice session should resemble the intended environment. A baseline needs notes about conditions so it is not compared as though every variable were identical.</p>
<p>Choose a date with a backup window. Do not place the only opportunity after travel, a major gathering, or at the final hour of a virtual event. Moving the date for health or safety is responsible.</p>

<h2>Use a completion goal</h2>
<p>A completion goal means covering the eligible five kilometres by the selected permitted method, without a required finish time. It may suit a first attempt, a return after reduced activity, or a runner whose December schedule makes performance training inappropriate.</p>
<p>Completion does not mean continuing regardless of conditions. The activity can be shortened or stopped for unsafe weather, route problems, concerning symptoms, or unexpected fatigue. A changed plan is not a dishonest result when it is recorded accurately.</p>
<p>The <a href="/blog/beginner-5k-training-plan-new-runners">beginner 5K plan</a> explains gradual preparation. Do not use a calendar date to skip the preparation that your current starting point requires.</p>

<h2>Choose a comfortable continuous-run goal</h2>
<p>A runner who already handles similar easy durations may choose to run continuously at a conversational, controlled effort. The goal is continuity, not speed. Begin more gently than excitement suggests and let breathing and perceived effort guide adjustments.</p>
<p>The <a href="/blog/beginners-guide-to-running-pace">beginner pace guide</a> explains why pace varies with terrain, weather, fatigue, and fitness. A continuous run is not invalid because the kilometre splits differ or because another runner finishes sooner.</p>
<p>Walking remains available if the original goal stops fitting. Do not preserve the word “continuous” by shuffling through pain, dizziness, severe breathlessness, unsafe congestion, or worsening conditions.</p>

<h2>Use a run-walk goal</h2>
<p>Planned run-walk intervals can make the 5K structured and manageable. Choose an easy pattern already tested in ordinary sessions, such as running for a comfortable period and walking before form or breathing deteriorates. No universal ratio fits everyone.</p>
<p>The <a href="/blog/run-walk-method-beginner-friendly-way-build-endurance">run-walk method guide</a> covers starting conservatively and adjusting intervals. Walking breaks are part of the plan, not a failure that must be repaid with a sprint.</p>
<p>Use landmarks or a simple timer without staring at the screen in traffic. If event rules distinguish running and walking categories, confirm the accepted method before starting and label proof honestly.</p>

<h2>Use a pacing goal</h2>
<p>A pacing goal can mean keeping effort even, starting conservatively, or avoiding a large slowdown. It need not prescribe an exact finish time. Choose an effort you have practiced, and account for hills, turns, surface, congestion, temperature, humidity, and wind.</p>
<p>Begin the first part under control. Early pace often feels easier than it will later, especially with excitement or cooler starting conditions. Check breathing and posture at planned points, then maintain or reduce effort rather than forcing a watch number.</p>
<p>Evaluate the pattern after finishing. Even effort can produce uneven splits on a varied route. A perfectly even display can conceal increasing strain, so combine data with honest experience.</p>

<h2>Attempt a personal best only when appropriate</h2>
<p>A personal-best attempt is optional. Consider it only when recent training supports the demand, health and recovery are stable, the route and weather are suitable, and the attempt does not conflict with professional advice. December itself supplies no reason to race.</p>
<p>The <a href="/blog/how-to-run-a-faster-5k">faster 5K guide</a> separates gradual training from last-minute effort. Do not add hard sessions, remove recovery, or sharply increase volume in the final days to manufacture readiness.</p>
<p>Define stop conditions in advance. A previous best is historical information, not a pace you are obligated to match. If the day does not fit, convert the activity to an easy checkpoint or reschedule.</p>

<h2>Pick a safe, simple route</h2>
<p>Use a lawful route with suitable surface, visibility, traffic separation, crossings, lighting, exits, signal, and access. A familiar loop can reduce navigation and make pacing easier. Confirm current construction, closures, flooding, events, and local warnings.</p>
<p>The <a href="/blog/how-to-choose-a-safe-route-for-your-virtual-run">safe-route guide</a> provides a complete checklist. Popularity, a heat map, or daylight does not guarantee a route is safe at your chosen hour.</p>
<p>A flat route may simplify comparison, but do not travel to an unsafe or inconvenient location merely to improve the time. Record meaningful hills or interruptions when reviewing the result.</p>

<h2>Measure the route without chasing the watch</h2>
<p>Choose a known measured loop, an event course, or a suitable route that your device can track. GPS estimates vary with sky view, buildings, trees, device placement, software, and turns. The <a href="/blog/how-accurate-is-phone-gps-for-running">phone GPS guide</a> explains those limitations.</p>
<p>Do not add dangerous detours or circle a road after the planned endpoint to correct a suspected short reading. For a virtual event, use its published rounding, correction, and review process.</p>
<p>Keep the five-kilometre purpose separate from exact measurement claims. If you are establishing a repeatable personal checkpoint, use the same suitable route and method later while noting changes.</p>

<h2>Test tracking before the checkpoint</h2>
<p>Confirm units, permissions, activity type, battery, time zone, auto-pause, screen-lock behavior, and saved fields during an ordinary short activity. Update devices before the checkpoint only when there is enough time to test afterward.</p>
<p>Know how to start, pause, resume, and save without standing in a road or blocking a course. Preserve the original file or activity. Review privacy before sharing a map that reveals a home, workplace, school, or regular routine.</p>
<p>If the checkpoint belongs to a virtual event, read the proof requirements first. A personally useful record may still lack a field the organizer requires.</p>

<h2>Check weather and timing</h2>
<p>Review current forecast, warnings, daylight, temperature, humidity, rain, lightning, wind, air quality, and route effects close to the start. Seasonal expectations are not a forecast. In the Philippines, local conditions can vary sharply.</p>
<p>Move to a suitable treadmill, select a safer time, shorten, reschedule, walk where allowed, or rest when outdoor conditions do not fit. Visibility clothing, hydration, or determination cannot make severe conditions safe.</p>
<p>Choose timing that also respects meals, medication, sleep, transport, caregiving, and event access. A rushed gap between obligations is rarely ideal for a reflective checkpoint.</p>

<h2>Prepare without turning the week into a test</h2>
<p>Keep the preceding days consistent with your normal routine. Avoid an unplanned hard workout, extreme rest, unfamiliar diet, aggressive hydration, or new equipment because the date feels important. Familiar preparation makes the result easier to interpret.</p>
<p>Use tested shoes and comfortable clothing appropriate to conditions. Charge the device, know the route, and prepare required proof. These steps reduce logistics; they do not guarantee a finish or performance.</p>
<p>If illness, pain, unusual fatigue, or disrupted sleep changes the week, reassess the purpose. The checkpoint can move or become easier.</p>

<h2>Warm up for the purpose</h2>
<p>A simple warm-up can begin with easy walking and gentle running that gradually approaches the intended effort. The amount depends on the person, conditions, and goal. A comfortable completion does not need an elaborate performance ritual.</p>
<p>Use the opening minutes to assess the body and environment. Notice unusual pain, dizziness, breathing, surface, crowding, and weather. Do not interpret the warm-up as a contract to start.</p>
<p>For an event, follow staging and course rules. Keep moving only in designated spaces and avoid warm-up drills that create collision risk.</p>

<h2>Run the first part conservatively</h2>
<p>The start is where an easy checkpoint most often becomes an unintended race. Other runners, a countdown, a fast first GPS reading, or fresh legs can pull effort upward. Use your purpose as the constraint.</p>
<p>Settle into breathing and route awareness before evaluating pace. Allow others to pass. If using run-walk, take the first planned walk break even when it feels unnecessary; the pattern was chosen for the whole distance.</p>
<p>At halfway, ask whether the effort remains appropriate. Maintaining control is a success. Speeding up is optional and should never override symptoms, traffic, course rules, or recovery context.</p>

<h2>Handle stops and imperfect conditions honestly</h2>
<p>Crossings, crowds, water, navigation, facility access, or safety may require stopping. Use pause settings according to event rules and record what occurred. Do not rush across traffic or weave dangerously to protect elapsed time.</p>
<p>If GPS fails, keep safety first. Do not run extra distance blindly, edit the route to create a preferred result, or use another person's record. Save available evidence and follow the event's documented review route.</p>
<p>An interrupted checkpoint can still teach you about pacing, logistics, and route choice. Label it accurately rather than forcing comparison with an uninterrupted result.</p>

<h2>Choose solo, social, or event participation deliberately</h2>
<p>A solo checkpoint can simplify pacing and reflection, provided the route and communication plan are suitable. Running with a trusted companion can add support, but agree on pace, walk breaks, route, and whether you will stay together. Neither person should be pressured to match the other's effort.</p>
<p>An organized or virtual 5K can add structure and a shared date. Read registration, activity, proof, course, cutoff, waiver, accessibility, and emergency information before joining. A paid entry or public commitment does not require starting or finishing when conditions no longer fit.</p>
<p>Choose the setting that supports the purpose. If conversation turns an easy run into repeated surges, slow down. If solo timing creates pressure to chase the watch, hide pace fields or use a simpler goal. If an event is crowded, prioritize course etiquette and safe space over the ideal line. Confirm meeting points and return transport in advance so those logistics do not create avoidable urgency.</p>
<p>When sharing afterward, describe the checkpoint accurately. Celebrate completion or learning without presenting your method as a universal prescription. Protect route privacy and other participants' identities in maps and photographs, and obtain appropriate consent before identifying companions, volunteers, or spectators publicly.</p>

<h2>Cool down and observe recovery</h2>
<p>After the endpoint, reduce effort in a suitable space rather than stopping in traffic or blocking other participants. Continue ordinary fluid, food, temperature, and comfort practices that fit you. No product or routine guarantees recovery.</p>
<p>Observe the rest of the day and subsequent days: soreness, fatigue, sleep, appetite, mood, gait, and ordinary function. This response is part of the checkpoint, not an afterthought.</p>
<p>Do not schedule a hard celebration run the next morning merely because the 5K felt controlled. Return to the planned routine based on actual recovery.</p>

<h2>Review more than finish time</h2>
<p>Record the purpose, route, surface, weather, start time, sleep, preparation, pace pattern, walk breaks, stops, perceived effort, symptoms, enjoyment, and later recovery. Finish time without context can mislead.</p>
<p>Ask what worked and what should change. Perhaps the route was too crowded, the start too fast, the run-walk timer useful, or the easy effort sustainable. One activity should generate questions, not sweeping judgments about talent.</p>
<p>Compare only when methods and conditions are sufficiently similar, and still expect normal variation. Avoid treating a slower December time as proof of decline or a faster time as guaranteed readiness for a longer race.</p>

<h2>Use the result to inform the next goal</h2>
<p>A comfortable completion might support repeating the routine, improving consistency, or choosing another 5K. A difficult result may suggest maintaining the distance, using run-walk, simplifying the route, or allowing more recovery. A strong result does not require moving up immediately.</p>
<p>Separate what you enjoyed from what looked impressive online. The next goal should fit available weeks, current routine, access, health context, and the type of running you want to practice.</p>
<p>Do not link one day to a rigid annual promise. Use the evidence as one input and revisit the decision after the holiday period settles.</p>

<h2>A year-end 5K checklist</h2>
<ol><li>Choose one primary purpose.</li><li>Select a suitable date and backup.</li><li>Confirm route, weather, daylight, and access.</li><li>Use a goal supported by recent activity.</li><li>Test tracking and proof requirements.</li><li>Prepare familiar clothing and equipment.</li><li>Begin conservatively.</li><li>Stop or change the plan when conditions require it.</li><li>Save an honest record.</li><li>Review effort and recovery before choosing what comes next.</li></ol>
<p>Use your year-end activity to learn what you want from running next year. The most useful finish may be the one that leaves you informed and able to continue.</p>

<h2>When to stop and seek help</h2>
<p>Stop exercise and seek urgent help for chest pressure, fainting, confusion, severe or unusual breathlessness, sudden weakness, loss of coordination, or other emergency signs. Persistent or worsening pain, swelling, numbness, weakness, fever, changed gait, or reduced ordinary function deserves qualified assessment.</p>
<p>People with health conditions, pregnancy, recent illness or injury, medication questions, or uncertainty about exercise should seek appropriately qualified individual guidance. A year-end date does not create medical readiness.</p>

<h2>Frequently asked questions</h2>
<h3>Does a year-end 5K need to be fast?</h3><p>No. It can be an easy completion, run-walk, comfortable continuous run, pacing practice, or baseline.</p>
<h3>Can I walk during the 5K?</h3><p>Yes for a personal checkpoint. For an event, check whether walking is accepted and how the activity must be labeled.</p>
<h3>Should I try for a personal best?</h3><p>Only when recent preparation, recovery, health, route, and weather support it. A personal best is never required.</p>
<h3>What if GPS records less than five kilometres?</h3><p>Stay safe, preserve the original record, and follow event correction rules. Do not add unsafe distance or alter evidence.</p>
<h3>What should I do after the 5K?</h3><p>Review purpose, pacing, conditions, experience, and recovery before selecting another goal.</p>

<h2>Official sources and health note</h2>
<p>The <a href="https://www.cdc.gov/physical-activity/php/about/measuring-physical-activity-intensity.html">CDC intensity guide</a> explains relative effort and the talk test. The <a href="https://health.gov/paguidelines/second-edition/pdf/Physical_Activity_Guidelines_2nd_edition.pdf">U.S. Physical Activity Guidelines</a> emphasize progressing from current activity over time; neither source prescribes a year-end 5K pace or guarantees readiness.</p>
<p>Choose a suitable checkpoint, complete it honestly, and let the full experience—not a single finish time—inform what follows.</p>
`;
const REQUIRED_HEADINGS=Object.freeze(['A 5K can be a checkpoint, not a race','Choose your purpose before the date','Use a completion goal','Choose a comfortable continuous-run goal','Use a run-walk goal','Use a pacing goal','Attempt a personal best only when appropriate','Pick a safe, simple route','Measure the route without chasing the watch','Test tracking before the checkpoint','Check weather and timing','Prepare without turning the week into a test','Warm up for the purpose','Run the first part conservatively','Handle stops and imperfect conditions honestly','Choose solo, social, or event participation deliberately','Cool down and observe recovery','Review more than finish time','Use the result to inform the next goal','A year-end 5K checklist','When to stop and seek help','Frequently asked questions','Official sources and health note']);
const REQUIRED_LINKS=Object.freeze(['href="/blog/beginner-5k-training-plan-new-runners"','href="/blog/how-to-run-a-faster-5k"','href="/blog/beginners-guide-to-running-pace"','href="/blog/run-walk-method-beginner-friendly-way-build-endurance"','href="/blog/how-to-choose-a-safe-route-for-your-virtual-run"','href="/blog/how-accurate-is-phone-gps-for-running"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wordCount=contentText.split(/\s+/).filter(Boolean).length,payload={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wordCount/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(payload);return payload;}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),w=t.split(/\s+/).filter(Boolean).length;if(w<2500||w>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||!p.excerpt||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8)e.push('tags');if(/must race all-out|ignore chest pain|run through unsafe weather/i.test(t))e.push('unsafe 5K');if(/guarantees? a personal best|GPS is exact/i.test(t))e.push('guarantee');if(!/year end 5K/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes(`<h2>${h}</h2>`))e.push(`heading ${h}`);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push(`link ${l}`);if(e.length)throw new Error(`Invalid year-end 5K payload: ${e.join('; ')}`);return true;}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
