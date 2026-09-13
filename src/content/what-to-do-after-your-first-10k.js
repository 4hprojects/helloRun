'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='what-to-do-after-your-first-10k';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'What to Do After Your First 10K: Recover, Review, and Choose Your Next Goal',excerpt:'Recover from your first 10K, review what the experience taught you, rebuild a repeatable week, and choose whether to maintain, improve, or progress gradually.',category:'Training',tags:Object.freeze(['after first 10K','10K recovery','next goal after 10K','first 10K finish','maintain 10K fitness','improve 10K time','10K to half marathon','runner goal review']),seoTitle:'What to Do After Your First 10K: Recover, Review, and Choose Your Next Goal',seoDescription:'Finished your first 10K? Learn how to recover, review your experience, maintain consistency, and decide whether your next goal should be another 10K or a 21K.',coverImageAlt:'Gouache-style Filipino runner calmly recovering and reviewing choices after completing a first 10K'});
const RAW_CONTENT_HTML=`
<p>Knowing <strong>what to do after your first 10K</strong> is less about choosing a longer distance immediately and more about recovering, reviewing, and returning to a sustainable routine. Your finish is useful information: it shows what preparation, pacing, gear, conditions, tracking, and support felt like across the full distance.</p>
<p>You may want another 10K, a faster attempt, a gradual path toward 21K, or simply more consistent running. None is automatically the correct next step. Health, symptoms, enjoyment, schedule, recovery, and current capacity should shape the decision.</p>
<blockquote><strong>The next-goal principle:</strong> use what the first 10K taught you. Do not let finish-line excitement commit your future training before you have recovered enough to think clearly.</blockquote>

<h2>Do not rush the next goal</h2>
<p>Finishing can create a powerful urge to register for the next available distance. Pause before making an expensive or demanding commitment. A first 10K may represent the largest recent load your body has handled, even when the day felt successful.</p>
<p>Save event options without assuming you must enter. Review the required preparation window, terrain, climate, travel, fees, schedule, and cancellation policy. A date that creates pressure to skip recovery or compress progression is not necessarily a motivating deadline.</p>
<p>The <a href="/blog/how-to-set-running-goals-for-the-rest-of-the-year">running-goals guide</a> helps separate an outcome from the repeatable actions beneath it. Waiting several days to decide does not erase your achievement.</p>

<h2>Finish the day with ordinary recovery</h2>
<p>Move to a safe area, cool down gradually as comfortable, change wet clothing, drink according to thirst and your practised plan, and eat familiar food that supports ordinary needs. No special product is mandatory because the distance was 10K.</p>
<p>The <a href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back">post-run recovery guide</a> covers rest, fluid, food, gentle movement, sleep, and symptom monitoring. Recovery is not a competition for the coldest bath, hardest stretch, or most expensive supplement.</p>
<p>Do not use alcohol, forced fluid, pain medicine, or an intense recovery workout as a universal solution. Individual health, medication, heat exposure, and symptoms matter.</p>

<h2>Separate normal effort from warning signs</h2>
<p>Tiredness and some unfamiliar muscle soreness can occur after a new distance, but online labels cannot diagnose what you feel. Pay attention to severity, location, swelling, function, progression, and associated symptoms.</p>
<p>Seek appropriate clinical guidance for severe, worsening, persistent, recurrent, or unexplained pain; marked swelling; inability to bear weight; weakness; numbness; illness; or symptoms that change normal movement. Stop and seek urgent help for chest pain or pressure, fainting, severe breathing difficulty, confusion, sudden weakness, or other possible emergency signs.</p>
<p>Do not let a medal, certificate, or next registration pressure you to hide symptoms. This article is general education, not diagnosis or a return-to-running clearance.</p>

<h2>Give the next few days flexibility</h2>
<p>There is no universal number of rest days after a 10K. The appropriate return depends on prior training, effort, terrain, conditions, travel, sleep, health, symptoms, and ordinary responsibilities. A runner who raced at maximum effort may respond differently from one who completed a comfortable run-walk.</p>
<p>Easy walking or daily movement may feel fine for some people, while others prefer more rest. Do not prescribe a recovery run merely because athletes online use the term. If you run, choose a short, controlled session and remain willing to stop or walk.</p>
<p>Delay harder running, long distance, hills, or heavy unfamiliar strength work until ordinary movement and easy activity feel settled. Recovery is an observation process, not a countdown that guarantees readiness.</p>

<h2>Protect sleep and ordinary routines</h2>
<p>Event travel, an early start, nerves, heat, and post-finish activity can disrupt sleep. Return to a regular sleep opportunity where possible. Avoid treating one poor night as a reason for a hard “make-up” session.</p>
<p>Continue usual meals rather than sharply restricting food because training volume temporarily falls. Hydration needs change with weather, sweat, food, and health; use normal monitoring rather than forcing a fixed volume.</p>
<p>Work, school, and caregiving do not disappear after the finish. Give the week enough space that recovery does not create new stress.</p>

<h2>Review pacing while the experience is fresh</h2>
<p>Look at perceived effort by segment: the start, middle, later kilometres, and finish. Did excitement make the first section faster than planned? Could you speak in the early section? Did hills, heat, congestion, or stops change the effort?</p>
<p>The <a href="/blog/beginners-guide-to-running-pace">beginner pace guide</a> explains why pace changes with terrain, weather, fatigue, GPS, and the individual. A slower split is not automatically a failure.</p>
<p>If you have data, compare it with how the run felt. Do not interpret one average pace as a complete performance diagnosis. Record useful observations before memory becomes a finish-line story.</p>

<h2>Review food, fluid, and stomach comfort</h2>
<p>Note what and when you ate before the run, whether it was familiar, and how appetite and stomach comfort changed. Record what you drank, access points, heat, thirst, and whether carrying the bottle worked.</p>
<p>A single good or bad day does not prove a universal nutrition rule. If the plan was comfortable, preserve it before adding complexity. If it was not, change one feature during lower-stakes training.</p>
<p>Persistent gastrointestinal symptoms, faintness, repeated vomiting, or other concerning symptoms deserve appropriate care. Anyone with medical nutrition needs should use individualized professional advice.</p>

<h2>Review shoes, clothing, and comfort</h2>
<p>Check for rubbing, blisters, pressure, numbness, slipping, wet fabric, pocket bounce, sun exposure, and weather mismatch. Ask whether the item caused the issue or whether fit, lacing, socks, terrain, moisture, and duration contributed.</p>
<p>Do not replace comfortable shoes solely because an app reached an arbitrary distance. Likewise, do not assume a painful shoe will become suitable because it was expensive. The <a href="/blog/how-to-choose-running-shoes-for-beginners">shoe guide</a> focuses on fit, comfort, use, and gradual testing.</p>
<p>Test one change on a shorter run before relying on it in another event.</p>

<h2>Review the route and conditions</h2>
<p>Write down surface, climbs, descents, turns, crossings, congestion, shade, weather, air quality, water access, and toilet availability. These details help explain effort and inform the next route.</p>
<p>If the course felt difficult, that does not necessarily mean you are unready for every 10K. A flatter, cooler, familiar route may create a different experience. Conversely, one favourable route does not guarantee the same result on hills or in heat.</p>
<p>Review any point where you felt unsafe or unable to exit. Future preparation should change the route or support plan, not normalize the hazard.</p>

<h2>Review tracking and proof problems</h2>
<p>Confirm the original activity saved and synced. Compare distance, elapsed time, moving time, route, and event result. GPS differences can come from signal, sampling, device placement, pauses, course measurement, or processing.</p>
<p>For a virtual event, preserve the original activity and organizer messages until review is final. If proof was rejected, read the reason and correct only through the stated process.</p>
<p>The <a href="/blog/how-to-run-your-first-10k-virtual-run">first virtual 10K guide</a> connects pacing, route, tracking, and proof. Use any issue to improve the next rehearsal.</p>

<h2>Close the first event before chasing another</h2>
<p>For a virtual 10K, check that the submission reached the intended event, required fields are complete, and the displayed status is accurate. “Uploaded” may not mean approved. Respond to an organizer request through the official channel and within the stated correction window.</p>
<p>For an onsite event, retain the bib or confirmation details until timing questions are resolved. Compare the official result with your recollection without expecting consumer GPS to match a measured course exactly. Use the organizer’s result-query process for a missing or incorrect time.</p>
<p>Download an eligible certificate only after the platform makes it available. Verify your display name, event, category, and result, then report errors rather than editing the certificate yourself. Recognition should reflect the reviewed event record.</p>
<p>Finish any practical tasks as well: collect an advertised item through the stated method, clean and dry reusable gear, dispose of waste, organize receipts where relevant, and save route or travel notes. These small actions create a clean boundary between the completed event and the next decision.</p>
<p>If you want to share publicly, review the activity map, home location, profile details, bib data, and names of other people first. A finish does not require giving an audience more personal information than you intended.</p>

<h2>Return through easy effort before adding a test</h2>
<p>When ordinary movement feels settled and there are no concerning symptoms, an easy return can answer a simple question: does controlled activity feel normal enough to continue? It should not become an immediate fitness test or attempt to prove that recovery is complete.</p>
<p>Choose familiar terrain and a route that is easy to shorten. Start gently, use breathing and conversation as effort cues, and keep permission to walk or stop. Avoid combining the return with new shoes, a new strength circuit, steep hills, speed targets, and extra distance.</p>
<p>Review how you feel during the session and afterward. A comfortable start does not guarantee the next day will be unaffected. If symptoms change gait, worsen, or interfere with daily function, step back and seek appropriate guidance rather than repeatedly testing the same problem.</p>
<p>One easy outing does not require the next session to be longer or faster. Repeatability across the week is more informative than a single enthusiastic return.</p>

<h2>Keep the achievement without making it your identity</h2>
<p>Your first 10K can be meaningful without becoming a permanent demand to outperform it. Record the date, route or event, a few memories, what helped, and what you learned. Thank people who supported the preparation if that matters to you.</p>
<p>Then allow running to fit alongside the rest of life. Missing an immediate next goal does not turn you back into a beginner or erase the finish. Some runners enjoy collecting events; others prefer private routines, shorter distances, walking, volunteering, or time away.</p>
<p>If comparison is affecting mood or driving unwanted training choices, reduce exposure to leaderboards and social feeds. Choose measures that serve your actual reason for running.</p>

<h2>Review the training plan, not only race day</h2>
<p>Look back across the weeks. Which sessions were repeatable? Where did work, school, illness, weather, or recovery interrupt the plan? Did long runs build gradually? Did you repeatedly turn easy sessions into tests?</p>
<p>The <a href="/blog/10k-training-plan-for-beginners">beginner 10K plan</a> is a framework, not proof that every completed box was appropriate. Identify the smallest habits that supported consistency and the ambitious parts you often skipped.</p>
<p>Your next plan should start from what you actually maintained, not from the most demanding week on paper.</p>

<h2>Decide what you enjoyed</h2>
<p>Performance data cannot tell you whether the process mattered to you. Did you enjoy steady training, event atmosphere, solo route choice, social support, a structured challenge, or the satisfaction of finishing?</p>
<p>Also name what you disliked: early travel, crowded starts, public comparison, long weekend sessions, proof administration, or a specific course. Some friction can be changed without abandoning running.</p>
<p>A goal you want to practise is more sustainable than one selected only because it looks impressive.</p>

<h2>Option 1: maintain comfortable 10K capacity</h2>
<p>Maintenance is a legitimate goal. Return gradually to a balanced week of easy running or run-walk, shorter sessions, recovery, and an occasional longer run appropriate to your base. The exact frequency and distance depend on the runner.</p>
<p>You can explore new safe routes, join a social event, or complete another 10K without targeting a faster time. Consistency through busy periods may be more valuable than constant progression.</p>
<p>Keep enough variation to enjoy training while avoiding sudden additions of distance, intensity, frequency, and hills together.</p>

<h2>Option 2: prepare for another 10K</h2>
<p>A second 10K lets you apply what you learned without changing the nominal distance. Choose one priority: steadier pacing, better preparation, a comfortable finish, fewer equipment problems, or a faster result. Do not demand all of them at once.</p>
<p>Rebuild easy consistency first, then introduce goal-specific work gradually. A faster 10K requires more than racing ordinary runs; easy running, appropriate harder sessions, long-run support, recovery, and schedule all interact.</p>
<p>Use a course and date that allow preparation. No workout or pace target guarantees a personal best.</p>

<h2>Option 3: move gradually toward 21K</h2>
<p>A half marathon is more than “two 10Ks plus a little.” It increases time on feet, long-run preparation, pacing, food and fluid planning, route logistics, and recovery demand. One 10K finish does not automatically establish readiness.</p>
<p>The <a href="/blog/21k-half-marathon-for-beginners">21K beginner guide</a> asks for a stable shorter-distance base before progression. The <a href="/blog/what-is-a-long-run-for-beginners">long-run guide</a> explains how the longest weekly session fits the whole week.</p>
<p>Choose a realistic preparation window and remain willing to delay. Health concerns, persistent symptoms, and repeated recovery problems should be addressed before adding distance.</p>

<h2>Option 4: focus on consistency rather than distance</h2>
<p>Your next goal can be a number of repeatable weeks, an enjoyable routine around work or school, a run-walk habit, regular easy effort, or participation in a month-long challenge. Distance is only one way to frame progress.</p>
<p>The CDC advises people starting or increasing activity to <a href="https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html">start slowly and build toward more time or challenge</a>. Public-health recommendations are not an individualized race plan, but the gradual principle supports a measured return.</p>
<p>A smaller goal that survives ordinary life may create a stronger base for a later race.</p>

<h2>Compare goals by their weekly cost</h2>
<p>Estimate the training windows, longest session, transport, route access, recovery, food, equipment, fees, and support each goal requires. Include the difficult week, not only the ideal one.</p>
<p>If the plan crowds out sleep, family responsibilities, work, medical care, or financial needs, revise the goal or date. A registration fee is already spent once paid, but that does not make unsafe continuation necessary.</p>
<p>Use a calendar to find conflicts before choosing an event. More distance usually requires more logistics as well as fitness.</p>

<h2>Choose the next event after reviewing the fit</h2>
<p>Read the current event details: format, route, virtual window, distance, allowed activity types, proof, cutoff, aid, accessibility, fees, inclusions, delivery, transfers, refunds, and organizer support. Do not assume rules match your first 10K.</p>
<p>When your recovery is settled and the plan fits, <a href="/events">browse current HelloRun events</a>. Select a goal consistent with your current base and the preparation you can maintain.</p>
<p>A planned October guide will compare 5K, 10K, and 21K goals in more detail after it is published; this article does not link to an unpublished page.</p>

<h2>A post-10K review worksheet</h2>
<ul><li><strong>Recovery:</strong> How did ordinary movement, sleep, appetite, and symptoms change?</li><li><strong>Pacing:</strong> Where did effort rise, and why?</li><li><strong>Food and fluid:</strong> What was familiar and comfortable?</li><li><strong>Gear:</strong> What worked across the full duration?</li><li><strong>Route:</strong> Which conditions shaped the experience?</li><li><strong>Tracking:</strong> Did the source activity save, sync, and support proof?</li><li><strong>Training:</strong> Which weekly habits were actually repeatable?</li><li><strong>Enjoyment:</strong> What part would you choose again?</li><li><strong>Next option:</strong> Maintain, improve, progress, or build consistency?</li><li><strong>Constraint:</strong> What schedule, health, access, or cost factor must the plan respect?</li></ul>

<h2>Frequently asked questions</h2>
<h3>Should I run the day after my first 10K?</h3><p>There is no universal answer. Consider symptoms, effort, prior training, sleep, travel, terrain, and health. Rest or gentle movement may be more appropriate; seek guidance for concerning symptoms.</p>
<h3>How long should 10K recovery take?</h3><p>No fixed duration fits everyone. Monitor ordinary movement, soreness, fatigue, function, and response to easy activity rather than relying only on a calendar.</p>
<h3>Should my next race be a half marathon?</h3><p>Only if you have a stable base, realistic preparation window, suitable health and recovery, and genuine interest in the added demands.</p>
<h3>Is another 10K still progress?</h3><p>Yes. You might improve preparation, pacing, comfort, consistency, or enjoyment without changing distance.</p>
<h3>What if the first 10K went badly?</h3><p>Separate correctable factors from health concerns, recover, and choose a lower-stakes next step. One difficult day does not define your ability.</p>

<h2>Official sources and health note</h2>
<p>This article was reviewed in September 2026 against the <a href="https://www.who.int/publications/i/item/9789240014886">WHO physical-activity guidelines</a> and current CDC gradual-activity guidance. Population recommendations do not determine individual race recovery or readiness. Use what your first 10K taught you to choose the next goal, rather than automatically choosing the longest available distance.</p>`;
const REQUIRED_HEADINGS=Object.freeze(['Do not rush the next goal','Finish the day with ordinary recovery','Separate normal effort from warning signs','Give the next few days flexibility','Protect sleep and ordinary routines','Review pacing while the experience is fresh','Review food, fluid, and stomach comfort','Review shoes, clothing, and comfort','Review the route and conditions','Review tracking and proof problems','Review the training plan, not only race day','Decide what you enjoyed','Option 1: maintain comfortable 10K capacity','Option 2: prepare for another 10K','Option 3: move gradually toward 21K','Option 4: focus on consistency rather than distance','Compare goals by their weekly cost','Choose the next event after reviewing the fit','A post-10K review worksheet','Frequently asked questions','Official sources and health note']);
const REQUIRED_LINKS=Object.freeze(['href="/events"','href="/blog/how-to-run-your-first-10k-virtual-run"','href="/blog/10k-training-plan-for-beginners"','href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back"','href="/blog/beginners-guide-to-running-pace"','href="/blog/21k-half-marathon-for-beginners"','href="/blog/what-is-a-long-run-for-beginners"','href="/blog/how-to-set-running-goals-for-the-rest-of-the-year"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wc=contentText.split(/\s+/).filter(Boolean).length,p={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wc/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(p);return p}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),wc=t.split(/\s+/).filter(Boolean).length;if(wc<2500||wc>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||!p.excerpt||p.excerpt.length>220||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8||p.tags.some(x=>!x||x.length>30))e.push('tags');if(/<h1\b/i.test(p.contentHtml))e.push('h1');if(/everyone must rest exactly \d+ days|run the day after every 10K/i.test(t))e.push('recovery');if(/every 10K finisher is ready for 21K|half marathon is the mandatory next step/i.test(t))e.push('progression');if(/ignore severe pain|train through chest pain/i.test(t))e.push('safety');if(!/what to do after your first 10K/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes('<h2>'+h+'</h2>'))e.push('heading '+h);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push('link '+l);if(e.length)throw new Error('Invalid post-10K payload: '+e.join('; '));return true}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
