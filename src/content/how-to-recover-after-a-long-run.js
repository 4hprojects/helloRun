'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='how-to-recover-after-a-long-run';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'How to Recover After a Long Run',excerpt:'Use practical long-run recovery choices for cool-down, familiar food and fluids, dry clothing, sleep, next-day movement, symptom checks, and training return.',category:'Training',tags:Object.freeze(['long run recovery','recover after long run','recovery after running','post long run recovery','sore after long run','recovery after 10k','running recovery','after long run']),seoTitle:'How to Recover After a Long Run',seoDescription:'Learn practical long-run recovery basics covering cool-down, food, fluids, sleep, easy movement, soreness, and how to approach the next few days of training.',coverImageAlt:'Editorial recovery sequence of a Filipino runner cooling down, eating, drinking, changing clothes, sleeping, and walking after a long run'});
const RAW_CONTENT_HTML=`
<p><strong>Long run recovery</strong> begins when the planned run ends, but it is not one product, stretch, or fixed number of hours. It is a series of ordinary decisions: stop adding distance, transition calmly, address food and fluids, change out of wet clothing, sleep, observe symptoms, and adjust the following days.</p>
<p>A long run is relative. For one beginner it may be the first sustained run-walk outing; for another it may extend beyond a familiar 10K. Recovery depends on duration, intensity, heat, hills, fueling, health, training history, and the rest of life.</p>
<p>The <a href="/blog/what-is-a-long-run-for-beginners">long-run guide</a> explains why “long” belongs to the runner’s current week rather than one fixed distance. The existing <a href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back">post-run recovery basics</a> provide a shorter companion checklist for routine outings.</p>
<blockquote><strong>The practical principle:</strong> review the entire experience—including the hours and days afterward—before deciding how far or hard to run next time.</blockquote>

<h2>Recovery starts when the run ends</h2>
<p>Notice how you feel before opening an app or taking a finish photo. Are you alert, coordinated, breathing normally for the effort, and able to walk safely? Move out of traffic and direct sun, and contact support when symptoms are concerning.</p>
<p>The finish is a transition, not a challenge to prove toughness. A runner can feel excited while judgment is affected by fatigue and heat. Follow the planned ending rather than negotiating for extra work.</p>
<p>Recovery is not guaranteed by completing a checklist. The checklist helps you notice needs and avoid preventable complications while time and appropriate care do their work.</p>

<h2>Stop chasing extra distance</h2>
<p>If the plan is complete, stop. A GPS reading slightly short of a round number may reflect route measurement and device error. Adding loops around a car park or crossing an unsafe road to perfect the screen can create unnecessary load and risk.</p>
<p>When an event requires a specific distance, plan margin and route safety before starting, then follow its proof rules. Do not manipulate tracking data or extend beyond your prepared capacity merely for a badge.</p>
<p>Log what happened and adjust the next route. Today’s recovery matters more than an aesthetically complete graph.</p>

<h2>Cool down naturally</h2>
<p>Walk easily until breathing and movement settle, when the environment is safe. There is no mandatory cool-down distance. Some runners prefer a few quiet minutes; others need to sit promptly because of symptoms or conditions.</p>
<p>Do not stop in a roadway, crowded finish funnel, or exposed hot area. Choose shade and space. If dizzy, do not keep walking alone as a supposed cure; stop safely and seek help.</p>
<p>A cool-down can make the transition feel more comfortable, but it does not erase an excessive session, prevent all soreness, or treat a medical problem.</p>

<h2>Move to shade and assess heat</h2>
<p>Philippine heat and humidity can continue affecting you after pace stops. Move to a cooler location, loosen unnecessary layers, and observe mental clarity, balance, and skin and body sensations.</p>
<p>Confusion, fainting, collapse, severe weakness, loss of coordination, or altered mental state may indicate an emergency. Seek urgent assistance and active cooling as directed by emergency professionals rather than attempting to walk it off.</p>
<p>Prevention begins before the run through timing, route, effort, hydration access, and willingness to shorten. Post-run actions cannot fully compensate for unsafe exposure.</p>

<h2>Replace fluids without forcing them</h2>
<p>The <a href="/blog/hydration-for-runners">runner hydration guide</a> explains that needs differ with sweat, climate, duration, body, access, and health. Drink familiar fluids according to thirst and a considered plan; do not force extreme volumes quickly.</p>
<p>Water may be adequate for many outings, while longer or sweat-heavy sessions may involve food and electrolytes. More is not automatically better, and excessive fluid can be dangerous.</p>
<p>Medical conditions and medications can alter fluid or electrolyte guidance. Follow individualized advice. Persistent vomiting, confusion, severe headache, swelling, or worsening illness needs appropriate assessment.</p>

<h2>Choose ordinary recovery food</h2>
<p>The <a href="/blog/what-to-eat-after-running">post-run food guide</a> emphasizes familiar meals rather than mandatory branded shakes. Carbohydrate-containing food can help replace used energy, protein contributes to ordinary repair, and a balanced meal may provide both.</p>
<p>Appetite may be low immediately after heat or hard effort. Start with tolerable familiar food and fluids, then eat a normal meal when comfortable. Do not force a large meal while nauseated.</p>
<p>Food is not a reward that must be earned. Disordered-eating concerns, diabetes, allergies, gastrointestinal problems, and other health needs warrant qualified individualized support.</p>

<h2>Change out of wet clothing</h2>
<p>Sweat-soaked clothing can become uncomfortable, cause chafing, and feel cool once you stop. Change into dry clothing when practical and private. Clean and dry affected skin gently.</p>
<p>Inspect feet for blisters, hot spots, cuts, embedded debris, or swelling. Do not tear skin from a blister or assume every nail change is harmless. Keep wounds clean and seek care when infection or severity is concerning.</p>
<p>In cooler or windy conditions, carry a light dry layer. In heat, choose breathable clothing and shade rather than staying in direct sun for post-run socializing.</p>

<h2>Use simple comfort measures</h2>
<p>A shower, comfortable seating, gentle movement, or familiar relaxation routine may help you feel settled. Stretching, foam rolling, massage, compression, and cold exposure are optional—not required proof of serious training.</p>
<p>Avoid forcing painful stretching or aggressive massage over an acute injury. A temporary change in soreness does not mean tissue is fully recovered.</p>
<p>Cold-water immersion has context-specific uses, risks, and tradeoffs. Beginners do not need an extreme ice bath after every long run, and people with health concerns should obtain appropriate guidance.</p>

<h2>Protect sleep that night</h2>
<p>Sleep supports health, attention, and physical function. Plan a realistic opportunity to sleep rather than adding late commitments after an exhausting outing when avoidable.</p>
<p>Hard late running, travel, caffeine, discomfort, and heat can disrupt sleep. Note the pattern if it repeats and adjust run timing or load. One imperfect night does not erase fitness.</p>
<p>Persistent sleep problems, severe pain that prevents sleep, or symptoms such as breathing disturbance deserve appropriate health advice.</p>

<h2>Expect individual next-morning responses</h2>
<p>The next morning may bring mild familiar heaviness, no soreness, or more fatigue than expected. None alone produces a precise recovery countdown. Check ordinary walking, stairs, balance, energy, and whether movement changes.</p>
<p>Delayed soreness can appear after unfamiliar distance, hills, or downhill running. Severe, worsening, sharply localized, or asymmetric symptoms require more caution than general mild stiffness.</p>
<p>Do not use a watch readiness score as the only decision. It cannot examine swelling, gait, or the full context.</p>

<h2>Choose rest, walking, or easy movement</h2>
<p>The <a href="/blog/running-recovery-days-explained">recovery-days guide</a> distinguishes full rest, ordinary movement, walking, and recovery runs. The day after a long run does not require one universal option.</p>
<p>A gentle walk may feel comfortable, but a long hot sightseeing day is not automatically recovery. Count terrain, duration, heat, standing, and work demands.</p>
<p>A recovery run is appropriate only for runners whose established volume supports it. Complete beginners often benefit more from a non-running day.</p>

<h2>Do not automatically run the next day</h2>
<p>A daily streak is not more important than recovery. Running again because the calendar demands it may add load when walking or rest better supports the week.</p>
<p>If you do run, begin very easily and keep permission to stop. Do not use the first minutes as a test you must pass. Worsening pain, altered movement, dizziness, or unusual fatigue means reassess.</p>
<p>Experienced high-volume schedules are built on prior adaptation. Copying their next-day mileage does not create that history.</p>

<h2>Normal fatigue versus concerning symptoms</h2>
<p>General tiredness and mild diffuse soreness can occur after unfamiliar long running, but online descriptions cannot confirm what is normal for you. Direction matters: symptoms should not keep worsening or impair basic function without review.</p>
<p>Persistent swelling, inability to bear weight normally, marked weakness, numbness, fever, dark urine, repeated vomiting, or changed gait deserves qualified assessment. Chest pressure, fainting, severe breathlessness, confusion, or collapse requires urgent help.</p>
<p>Do not diagnose dehydration, electrolyte problems, muscle injury, or another condition from a social-media checklist. Provide clinicians with the run duration, heat, fluids, symptoms, and relevant history.</p>

<h2>Return to training gradually</h2>
<p>Resume with easy movement and observe. The next tempo or interval session should not occur merely because a generic plan places it there. Move it, reduce it, or remove it if recovery remains incomplete.</p>
<p>There is no universal number of days after a long run. Current load, experience, session difficulty, and individual response matter. A first long distance may require more space than a familiar outing.</p>
<p>Do not compensate for rest by doubling later mileage. Continue from a sustainable point.</p>

<h2>Review route and pacing</h2>
<p>Recovery problems can begin with route and pacing decisions. A fast start, long exposed section, unexpected hills, repeated stops, or unsafe finish location may make the outing harder than planned.</p>
<p>Compare pace with effort and conditions. A slower time in heat may represent good restraint, while a fast downhill finish can add load despite comfortable breathing.</p>
<p>Adjust next time: choose more shade, shorter loops, easier exit points, better visibility, or a route with reliable water and transport access.</p>

<h2>Review food and fluid choices</h2>
<p>Note what you ate and drank before, during, and after without turning one experience into a universal rule. Hunger, stomach comfort, thirst, urine changes, weather, and energy can inform future planning.</p>
<p>Do not change breakfast, gels, electrolytes, caffeine, and pace together. One change at a time makes the response easier to interpret.</p>
<p>Persistent gastrointestinal symptoms, recurrent dizziness, or difficulty meeting nutrition needs warrants qualified advice.</p>

<h2>Review gear and tracking</h2>
<p>Check whether shoes, socks, clothing, pack, phone, or watch caused pressure, chafing, distraction, or battery problems. Familiar gear reduces uncertainty but does not prevent every issue.</p>
<p>GPS errors can tempt extra distance. The <a href="/blog/how-to-prepare-for-a-long-run">long-run preparation guide</a> recommends checking device charge, route, essentials, and recovery plans before leaving.</p>
<p>Dry equipment according to manufacturer guidance and replace damaged safety items. Do not make a major shoe change solely because one difficult run produced soreness.</p>

<h2>Plan transportation and support</h2>
<p>A long run can finish far from home or after public transport becomes less available. Plan how you will return before starting, carry identification and a charged phone where appropriate, and tell a trusted person the route when circumstances warrant it.</p>
<p>Do not drive while dizzy, severely fatigued, confused, or otherwise impaired. Rest safely and arrange help. A fast transition from finishing to driving may also leave no time to notice worsening symptoms.</p>
<p>For group runs, agree on check-in and regroup expectations. A runner who stops early should have a safe way back without pressure to complete the route.</p>

<h2>Recovery is not a competition</h2>
<p>Another runner may post that they felt ready for intervals the next morning. That does not establish what your recovery should look like. Their distance, pace, background, sleep, terrain, health, and definition of “fine” may differ.</p>
<p>Avoid comparing soreness scores as proof of who trained harder. Severe soreness is not a training achievement, while little soreness does not mean the session lacked value.</p>
<p>Choose actions that support your next ordinary days. Resting, walking, or reducing training can reflect accurate judgment rather than weakness.</p>

<h2>Keep a short recovery record</h2>
<p>Record the finish time, conditions, perceived effort, food and fluids, sleep, next-morning function, and any symptoms. A few useful notes are enough; recovery does not need constant surveillance.</p>
<p>Across similar long runs, the record can reveal patterns. Perhaps humid routes require more conservative pace, late starts disrupt sleep, or a certain food repeatedly causes discomfort. Treat patterns as questions, not diagnoses.</p>
<p>Share the record with a coach or clinician when seeking advice. Specific timing and context are more useful than saying only that the run felt bad.</p>

<h2>Adjust the next long run</h2>
<p>Progress only when the current distance and recovery are manageable. The next long run does not have to be farther. Repeating a distance with better pacing, safer conditions, and calmer recovery can be meaningful progress.</p>
<p>If the previous run produced excessive fatigue, shorten the next one, slow down, add walking, change the route, or allow more time. Avoid increasing pace and distance together.</p>
<p>When recovery remains difficult despite conservative adjustments, pause progression and seek qualified guidance. A goal date does not force the body to adapt on schedule.</p>
<p>Include recovery expectations when planning the route and date. A demanding run before travel, exams, overnight work, or major family duties may be poorly timed even when the training calendar appears open and uncomplicated.</p>

<h2>Recovery after a first 10K</h2>
<p>A first 10K may be both the longest run and an event effort. Excitement can mask fatigue, so use the same calm sequence: stop, cool down, move to shade, address familiar food and fluids, change, sleep, and observe.</p>
<p>Do not commit immediately to a harder goal. Recover, then review the experience. The next target might be another comfortable 10K, a faster 10K, a shorter event, or simply consistent running.</p>
<p>Virtual-event flexibility does not standardize heat, hills, or measurement. Interpret recovery and time together.</p>

<h2>Recovery during half-marathon preparation</h2>
<p>As long runs extend during half-marathon preparation, recovery becomes part of whether progression is sustainable. Increasing distance while keeping speed work and strength unchanged may create a larger total jump than expected.</p>
<p>Plan the following days before starting. Leave room to reduce training when the long run, conditions, or life load exceeds expectations.</p>
<p>Persistent inability to recover is not solved automatically by another product. Reassess distance, pace, frequency, health, sleep, and overall schedule with qualified help when needed.</p>

<h2>Common long-run recovery mistakes</h2>
<ul><li>Adding distance to perfect the GPS total.</li><li>Standing in direct heat after finishing.</li><li>Forcing excessive fluid quickly.</li><li>Believing a branded shake or ice bath is mandatory.</li><li>Staying in wet clothing for hours.</li><li>Running hard the next day to maintain a streak.</li><li>Ignoring work, walking, and sleep load.</li><li>Treating severe or worsening symptoms as ordinary soreness.</li></ul>

<h2>A practical recovery sequence</h2>
<ol><li>End at the planned boundary and move to a safe location.</li><li>Walk easily if appropriate and assess symptoms.</li><li>Move to shade or shelter and address temperature.</li><li>Drink familiar fluids without forcing extreme volume.</li><li>Eat familiar food when comfortable.</li><li>Change from wet clothing and inspect feet and skin.</li><li>Protect sleep and note unusual symptoms.</li><li>Choose next-day rest or easy movement from actual response.</li><li>Return gradually and review the full experience before progressing.</li></ol>

<h2>Frequently asked questions</h2>
<h3>How long does long-run recovery take?</h3><p>There is no universal duration. Distance, intensity, heat, terrain, experience, health, sleep, and life load all matter.</p>
<h3>Should I run the day after a long run?</h3><p>Not automatically. Rest, walking, or a very easy run may fit depending on established training and current response.</p>
<h3>What should I eat?</h3><p>Familiar ordinary food containing carbohydrate and protein can be practical. Individual health and tolerance guide the exact choice.</p>
<h3>Do I need electrolytes?</h3><p>Not universally. Duration, sweat, climate, food, fluids, and health affect the decision. Avoid both rigid avoidance and excessive replacement.</p>
<h3>Is soreness normal?</h3><p>Mild familiar soreness can occur, but severe, worsening, localized, or movement-changing symptoms need caution and possibly assessment.</p>

<h2>Official sources and health note</h2>
<p>The <a href="https://www.cdc.gov/heat-health/about/index.html">CDC heat-health guidance</a> describes heat illness warning signs and prevention. The <a href="https://www.cdc.gov/sleep/about/index.html">CDC sleep overview</a> explains sleep’s importance to health. The <a href="https://health.gov/paguidelines/second-edition/pdf/Physical_Activity_Guidelines_2nd_edition.pdf">U.S. Physical Activity Guidelines</a> emphasize gradual progression from current activity and health.</p>
<p>This article is general education, not diagnosis, emergency care, rehabilitation, medical clearance, or individualized nutrition or training advice. Review the entire long-run experience, including recovery, before deciding how much farther to run next time.</p>
`;
const REQUIRED_HEADINGS=Object.freeze(['Recovery starts when the run ends','Stop chasing extra distance','Cool down naturally','Move to shade and assess heat','Replace fluids without forcing them','Choose ordinary recovery food','Change out of wet clothing','Use simple comfort measures','Protect sleep that night','Expect individual next-morning responses','Choose rest, walking, or easy movement','Do not automatically run the next day','Normal fatigue versus concerning symptoms','Return to training gradually','Review route and pacing','Review food and fluid choices','Review gear and tracking','Recovery after a first 10K','Recovery during half-marathon preparation','Common long-run recovery mistakes','A practical recovery sequence','Frequently asked questions','Official sources and health note']);
const REQUIRED_LINKS=Object.freeze(['href="/blog/what-is-a-long-run-for-beginners"','href="/blog/how-to-prepare-for-a-long-run"','href="/blog/what-to-eat-after-running"','href="/blog/hydration-for-runners"','href="/blog/running-recovery-days-explained"','href="/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),w=contentText.split(/\s+/).filter(Boolean).length,p={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(w/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(p);return p;}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),w=t.split(/\s+/).filter(Boolean).length;if(w<2500||w>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||!p.excerpt||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8)e.push('tags');if(/everyone must run the next day|everyone needs exactly \d+ recovery days/i.test(t))e.push('universal recovery');if(/will guarantee recovery|will prevent all soreness/i.test(t))e.push('guarantee');if(!/long run recovery/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes(`<h2>${h}</h2>`))e.push(`heading ${h}`);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push(`link ${l}`);if(e.length)throw new Error(`Invalid long-run-recovery payload: ${e.join('; ')}`);return true;}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
