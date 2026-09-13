'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='tempo-run-explained';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'Tempo Run Explained: What Beginners Should Know',excerpt:'Understand what “comfortably hard” running means, how tempo differs from easy and race effort, and when a beginner may be ready to introduce it.',category:'Training',tags:Object.freeze(['tempo run','tempo run beginners','comfortably hard running','threshold running','running intensity','beginner speed work','5k training','10k training']),seoTitle:'Tempo Run Explained: What Beginners Should Know',seoDescription:'Learn what a tempo run is, how it differs from easy running and racing, what controlled hard effort feels like, and when beginners may introduce tempo work.',coverImageAlt:'Editorial sequence of a Filipino recreational runner warming up, sustaining a controlled tempo effort, and cooling down in a tropical park'});
const RAW_CONTENT_HTML=`
<p>A <strong>tempo run explained</strong> simply is a sustained section of controlled hard running placed between easier movement. It should feel purposeful and demanding, but not like an all-out race. You warm up, settle into an effort you can control for the planned portion, and cool down rather than finishing in distress.</p>
<p>Runners and coaches use “tempo” in different ways. Some mean running near an individually assessed threshold; others use the word for a broader steady effort. Those definitions can produce different sessions, so a beginner should understand the intended feel and purpose instead of copying a pace from someone else.</p>
<blockquote><strong>The practical principle:</strong> a tempo effort is controlled enough to sustain with stable form, yet clearly harder than easy running. It is optional, individual, and supported by a much larger foundation of easy work.</blockquote>

<h2>What is a tempo run?</h2>
<p>A tempo session usually has three parts: easy warming up, a controlled-hard segment, and easy cooling down. The middle may be continuous or divided into manageable portions with easy recovery. Splitting the work can make the intended effort easier to learn without requiring a beginner to cling to one long block.</p>
<p>The word describes training structure, not one speed. A trained runner may cover far more distance than a newer runner at the same relative effort. Heat, humidity, hills, wind, sleep, accumulated fatigue, illness, and recent training can all change today’s pace.</p>
<p>Tempo work should have a reason: learning steady concentration, developing tolerance for sustained faster running, or supporting preparation for an event. Adding it merely because easy pace looks unimpressive on an app is not a useful reason.</p>

<h2>Easy effort versus tempo effort</h2>
<p>During an <a href="/blog/easy-run-explained">easy run</a>, conversation is generally comfortable, breathing is controlled, and the runner finishes with reserve. Easy running supports consistency, aerobic development, and recovery between harder days. It should make up much more of a beginner’s routine than demanding work.</p>
<p>Tempo effort is clearly harder. Breathing deepens, speech becomes limited, and attention narrows toward maintaining rhythm. Yet the effort should not surge repeatedly or deteriorate into desperate running. You are working, but you are still making decisions rather than merely surviving the next few seconds.</p>
<p>There is a range between easy and maximal effort, not a switch with two settings. A moderate steady run may sit between them. Ask what the session is meant to accomplish and whether the current effort matches that purpose.</p>

<h2>Tempo effort versus race effort</h2>
<p>Race effort includes competition, tapering, adrenaline, other runners, and a finish line. Depending on event distance, it may be harder, longer, or differently paced than a training tempo. A tempo session is practice within an ordinary training week; it should leave enough capacity to recover and continue that week.</p>
<p>Do not turn the final minutes into a race every time. A dramatic finish makes the pace graph look exciting while changing the load and purpose. Controlled completion is more informative than proving you could accelerate when already tired.</p>
<p>A recent race pace can sometimes help an experienced coach frame training, but it is not a permanent tempo formula. Course profile, weather, measurement accuracy, and current fitness all matter. Beginners without a race result lose nothing by using effort.</p>

<h2>Why runners use tempo sessions</h2>
<p>Sustained controlled work can help a runner practise maintaining a quicker rhythm without the frequent pace changes of short intervals. It can develop confidence around discomfort, pacing judgment, and the ability to stay composed while breathing becomes stronger.</p>
<p>Training near physiological thresholds is used to support endurance performance, but a laboratory marker and a casual phrase such as “comfortably hard” are not identical. Thresholds can be measured or estimated in several ways, and day-to-day conditions affect their practical expression.</p>
<p>No session guarantees a faster result. Training response depends on consistency, total load, recovery, health, and event demands. Tempo work is one tool alongside a stable <a href="/blog/what-is-a-running-base">running base</a>, not a shortcut around it.</p>

<h2>What “comfortably hard” means</h2>
<p>The phrase sounds contradictory because the effort is not comfortable like an easy jog. “Controlled hard” is often clearer. You accept meaningful exertion while remaining below an all-out state. Pace feels sustainable for the intended segment, movement remains coordinated, and you could reduce effort deliberately if the route or body required it.</p>
<p>Signs of too much effort include early straining, breathless panic, rapidly worsening form, repeated surges just to hold a number, or counting every second until escape. Slow down, shorten the work, switch to easy running, or stop when those signs appear.</p>
<p>Experience improves effort judgment. A beginner may initially confuse excitement with control. Starting conservatively allows the effort to settle; beginning too fast can make the rest of the session a test of damage control.</p>

<h2>Use the talk test as a guide</h2>
<p>The talk test is a practical intensity check. At easy intensity, full conversation is usually possible. As effort rises, continuous speech becomes difficult. During controlled-hard running, short phrases may be possible, but comfortable conversation generally is not.</p>
<p>This is not an emergency assessment or exact threshold measurement. Language, anxiety, respiratory conditions, hills, masks, and individual differences affect speech. If you cannot speak because of severe or unusual breathlessness, chest pressure, faintness, or another concerning symptom, stop and seek appropriate help.</p>
<p>Use the test occasionally rather than talking throughout a hazardous path. Route awareness, traffic, and footing come first.</p>

<h2>Pace is individual and conditions change it</h2>
<p>Two runners with the same goal distance can have very different tempo paces. Even one runner will not use the same number in cool dry weather and a humid Philippine afternoon. Holding a cool-weather target in heat can create a much harder physiological load.</p>
<p>The <a href="/blog/beginners-guide-to-running-pace">beginner running pace guide</a> explains why pace needs context. GPS can wobble under buildings or trees and respond slowly to changes. Use lap averages only when helpful and let effort override a misleading live display.</p>
<p>Hills also alter pace. Maintain an appropriate effort rather than forcing flat-ground speed uphill, then avoid racing downhill to restore the average. A flat predictable route is useful while learning.</p>

<h2>Heart rate can inform, not command</h2>
<p>Heart-rate data may help some runners compare repeated sessions, but generic zones and age-based maximum formulas are estimates. Wrist sensors can lag or misread, and heat, dehydration, stress, medication, caffeine, sleep, and illness can change the response.</p>
<p>The <a href="/blog/running-heart-rate-explained">running heart-rate guide</a> describes those limitations. Do not chase a narrow zone while the session feels wrong, and do not use a low reading to dismiss concerning symptoms.</p>
<p>For a medically supervised athlete, individualized test results may guide training. That does not make another person’s threshold number transferable to you.</p>

<h2>A simple beginner tempo structure</h2>
<p>A cautious framework begins with easy movement, adds a small amount of controlled-hard running, and finishes easily. The work may be one continuous segment or several shorter segments with easy jogging or walking between them. The exact minutes, repetitions, and pace require individual context.</p>
<ol><li>Choose a day when you are normally recovered and conditions are manageable.</li><li>Warm up easily on a safe, familiar route.</li><li>Increase effort gradually and settle below racing intensity.</li><li>Check breathing, form, and route awareness rather than only pace.</li><li>Reduce effort before control disappears.</li><li>Use easy recovery if dividing the work into portions.</li><li>Cool down and review the response later and the next day.</li></ol>
<p>Start with less work than your enthusiasm suggests. A successful first session teaches the effort and leaves recovery manageable; it does not prove maximum tolerance.</p>

<h2>Warm-up and cool-down</h2>
<p>Warm up with easy walking or running so the change in demand is progressive. Someone who already uses relaxed <a href="/blog/running-strides-for-beginners">running strides</a> may sometimes include them after easy movement, but they are optional and should not add strain before the tempo section.</p>
<p>The warm-up is also a readiness check. If easy pace feels unexpectedly difficult, pain changes your movement, or weather feels oppressive, convert the day to easy running or stop. Completing a written session is less important than responding to current conditions.</p>
<p>Afterward, jog or walk easily as space and comfort allow. A cool-down does not erase excessive load or guarantee prevention of soreness, but it provides a gradual transition and time to observe how you feel.</p>

<h2>Tempo running for a 5K goal</h2>
<p>A 5K can require sustained concentration and a rhythm faster than ordinary easy running. Tempo practice may help a runner learn restraint and controlled discomfort, but it is not necessarily run at 5K race pace. For many runners, racing effort would be harder.</p>
<p>A beginner preparing to complete a first 5K may not need tempo work at all. Consistent easy and run-walk sessions can be the appropriate priority. A runner seeking a performance improvement should still add harder training gradually and preserve easy days.</p>
<p>Do not stack tempo work beside another demanding session merely because both appear in advanced plans. The weekly pattern and recovery matter more than collecting workout names.</p>

<h2>Tempo running for a 10K goal</h2>
<p>A 10K rewards controlled pacing and aerobic endurance. Tempo work can resemble part of that sustained focus, yet tempo pace and 10K race pace are not universally identical. Faster athletes, slower runners, route conditions, and session structure change the relationship.</p>
<p>The <a href="/blog/10k-training-plan-for-beginners">beginner 10K plan</a> emphasizes gradual preparation. Someone extending distance for the first time may gain more from consistent easy volume and a suitable long run than from adding intensity immediately.</p>
<p>Practise fueling or hydration only when relevant to the overall session and personal needs. A short tempo block does not automatically require products, and trying new equipment, nutrition, and intensity together makes reactions harder to interpret.</p>

<h2>Should new runners do tempo runs?</h2>
<p>Not at the beginning by default. New runners are already adapting to repeated impact, routine, and aerobic work. Walking, run-walk training, and easy running provide substantial stimulus without a formal hard session.</p>
<p>Consider tempo work after training has become consistent, easy sessions feel repeatable, and recovery is predictable. A clear goal and enough scheduling space should exist. Returning runners should assess current capacity rather than rely on old personal bests.</p>
<p>Seek individualized advice when pregnancy, medication, disability, a health condition, previous injury, or clinician instructions affect intensity. An article cannot determine readiness.</p>

<h2>Place tempo work within the whole week</h2>
<p>A tempo session does not exist alone. Long runs, hills, strength training, sport, active commuting, manual work, and poor sleep all contribute to fatigue. Keep demanding days separated by enough easier time for your actual recovery, rather than copying the spacing used by an athlete with a different life and training history.</p>
<p>Protect easy days from pace creep. After discovering tempo effort, some runners begin treating every ordinary run as a chance to hover just below it. That middle-ground habit can make easy running too demanding while never providing the focused purpose of a true hard session.</p>
<p>If the week already contains a race or another unfamiliar challenge, it may not need tempo work. Removing a session is a legitimate adjustment. A calendar is a proposal; your current response supplies the information.</p>

<h2>Progress tempo training conservatively</h2>
<p>Change one main variable at a time. You might first learn the sensation through a small divided dose, later make the controlled portions somewhat longer, or eventually reduce recovery when appropriate. Increasing work duration, pace, frequency, and weekly distance together makes the total jump difficult to judge.</p>
<p>Progress is not automatically linear. Travel, illness, hot weather, exams, peak work periods, or interrupted sleep may justify repeating an easier structure or temporarily removing intensity. Returning to a previous level after disruption should be treated as rebuilding, not as evidence that fitness has been lost forever.</p>
<p>Do not evaluate progress from one GPS split. Look for steadier pacing, less early strain, appropriate recovery, and the ability to complete surrounding training. A faster pace at much greater effort is not the same improvement.</p>

<h2>Choose a suitable route and conditions</h2>
<p>A flat loop or quiet out-and-back with reliable footing makes sustained effort easier to regulate. Avoid repeated road crossings, blind corners, congested paths, loose surfaces, and sections where you would need to race traffic signals. Safety-related interruptions matter more than preserving a workout graph.</p>
<p>On a treadmill, pace and incline are controlled but heat, belt feel, and displayed speed may differ from outdoors. Use the emergency stop system, leave safe space, and do not jump onto moving side rails. A treadmill number should still yield to symptoms and effort.</p>
<p>In Philippine heat and humidity, schedule cooler conditions when practical, select shade, and reduce pace or duration. Severe weather, poor air quality, flooding, lightning, and unsafe visibility are reasons to move, modify, or cancel the session.</p>

<h2>Review the session after recovery</h2>
<p>Record a few useful details: route, conditions, warm-up feel, approximate effort, whether pace was stable, and how you felt later and the next morning. This creates context without turning training into constant surveillance.</p>
<p>Ask whether the middle section stayed controlled, whether you could cool down normally, and whether soreness or fatigue disrupted later activity. If the answer repeatedly points to excessive strain, reduce the load or seek qualified coaching. If pain persists or movement changes, seek health assessment.</p>
<p>Successful tempo training often looks unremarkable. The runner begins patiently, holds a sensible effort, stops at the planned boundary, and returns another day. Consistency is more valuable than one heroic entry.</p>

<h2>Common tempo-run mistakes</h2>
<ul><li><strong>Starting too fast:</strong> early excitement turns controlled work into survival.</li><li><strong>Using another runner’s pace:</strong> relative effort and conditions differ.</li><li><strong>Racing the last section:</strong> this changes the planned load.</li><li><strong>Skipping the warm-up:</strong> the transition to hard work becomes abrupt.</li><li><strong>Ignoring heat and humidity:</strong> fixed pace can demand much more effort.</li><li><strong>Making every run moderate or hard:</strong> recovery and truly easy training disappear.</li><li><strong>Trusting one sensor blindly:</strong> heart rate and GPS both have limitations.</li><li><strong>Adding distance and intensity together:</strong> the combined change may exceed current capacity.</li></ul>

<h2>When easy running is the better choice</h2>
<p>Choose easy running when sleep is poor, fatigue is unusual, legs have not recovered, illness is present, pain affects movement, or heat and route conditions make controlled effort unlikely. Easy training is not a failed tempo session; it can be the decision that protects the rest of the week.</p>
<p>Stop for chest pressure, fainting or near-fainting, severe or unusual breathlessness, confusion, sudden weakness, or another emergency warning sign. Seek urgent help as appropriate. Persistent pain, swelling, numbness, weakness, or changed gait deserves professional assessment.</p>
<p>One missed hard day does not remove fitness. Repeatedly forcing intensity while under-recovered is more likely to interrupt consistency.</p>

<h2>Frequently asked questions</h2>
<h3>What pace is a tempo run?</h3><p>There is no universal pace. Use controlled-hard effort, your current fitness, conditions, and the session purpose. Laboratory or coaching data can refine an individual plan.</p>
<h3>Is tempo the same as threshold?</h3><p>Sometimes coaches use the terms closely; others use tempo more broadly. Ask what intensity and structure the plan intends instead of assuming every label means the same workout.</p>
<h3>Can I walk during a tempo session?</h3><p>Yes. Easy walking or jogging can separate controlled work portions. The structure should serve the runner rather than become a test of identity.</p>
<h3>How often should beginners run tempo?</h3><p>No frequency suits everyone. Account for training age, total load, other hard sessions, recovery, health, and goals. Some beginners should do none yet.</p>
<h3>Should I use pace or heart rate?</h3><p>Either can add context, but neither replaces effort, symptoms, and conditions. Their measurements and zones have limitations.</p>

<h2>Official sources and health note</h2>
<p>The <a href="https://www.cdc.gov/physical-activity/php/about/measuring-physical-activity-intensity.html">U.S. Centers for Disease Control and Prevention guide to measuring intensity</a> explains relative intensity and the talk test, including that vigorous activity generally limits speech to only a few words before pausing for breath. The <a href="https://health.gov/paguidelines/second-edition/pdf/Physical_Activity_Guidelines_2nd_edition.pdf">U.S. Physical Activity Guidelines</a> emphasize that inactivity, health status, and current activity should shape progression and that no single interval formula fits all.</p>
<p>This article is general education, not diagnosis, rehabilitation, medical clearance, or an individualized training plan. Add harder running only after you have enough easy running to support it, and seek appropriately qualified guidance when your health or symptoms change the decision.</p>
`;
const REQUIRED_HEADINGS=Object.freeze(['What is a tempo run?','Easy effort versus tempo effort','Tempo effort versus race effort','Why runners use tempo sessions','What “comfortably hard” means','Use the talk test as a guide','Pace is individual and conditions change it','Heart rate can inform, not command','A simple beginner tempo structure','Warm-up and cool-down','Tempo running for a 5K goal','Tempo running for a 10K goal','Should new runners do tempo runs?','Common tempo-run mistakes','When easy running is the better choice','Frequently asked questions','Official sources and health note']);
const REQUIRED_LINKS=Object.freeze(['href="/blog/what-is-a-running-base"','href="/blog/easy-run-explained"','href="/blog/running-heart-rate-explained"','href="/blog/beginners-guide-to-running-pace"','href="/blog/10k-training-plan-for-beginners"','href="/blog/running-strides-for-beginners"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wordCount=contentText.split(/\s+/).filter(Boolean).length,payload={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wordCount/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(payload);return payload;}
function validateArticlePayload(payload){const errors=[],text=String(payload.contentText||''),wordCount=text.split(/\s+/).filter(Boolean).length;if(wordCount<2500||wordCount>3000)errors.push('article must contain 2500-3000 substantive words');if(!payload.ogImageUrl)errors.push('cover artwork is required');if(!payload.title||!payload.excerpt||payload.excerpt.length>220||!payload.seoDescription)errors.push('metadata');if(!payload.contentHtml||payload.contentRaw!==payload.contentText)errors.push('content');if(!Array.isArray(payload.tags)||payload.tags.length!==8||payload.tags.some(t=>!t||t.length>30))errors.push('tags');if(/<h1\b/i.test(payload.contentHtml))errors.push('h1');if(/tempo pace is the same for everyone|must always race the final/i.test(text))errors.push('universal tempo');if(/tempo runs prevent all injuries|guarantee a faster/i.test(text))errors.push('guarantee');if(!/tempo run explained/i.test(text))errors.push('intent');for(const h of REQUIRED_HEADINGS)if(!payload.contentHtml.includes(`<h2>${h}</h2>`))errors.push(`heading ${h}`);for(const l of REQUIRED_LINKS)if(!payload.contentHtml.includes(l))errors.push(`link ${l}`);if(errors.length)throw new Error(`Invalid tempo-run payload: ${errors.join('; ')}`);return true;}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
