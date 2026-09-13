'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='running-heart-rate-explained';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'Running Heart Rate Explained: What Beginners Should Know',excerpt:'Understand what running heart rate represents, why watches and formulas are estimates, what changes the number, and how to combine it with effort and symptoms.',category:'Training',tags:Object.freeze(['running heart rate','heart rate while running','running heart rate zones','heart rate training','high heart rate running','heart rate beginners','running effort','wrist heart rate']),seoTitle:'Running Heart Rate Explained: What Beginners Should Know',seoDescription:'Learn what running heart rate means, how watches estimate zones, why heart rate varies, and why beginners should combine numbers with perceived effort.',coverImageAlt:'Gouache Filipino beginner runner surrounded by abstract rhythm waves and context scenes of heat, hills, sleep, coffee, and a watch'});
const RAW_CONTENT_HTML=`
<p>Your <strong>running heart rate</strong> is the number of heartbeats counted per minute while you move. It usually rises as the body works harder, but the reading is shaped by far more than pace: heat, hills, hydration, sleep, stress, caffeine, illness, medication, device fit, and measurement error can all change it. A number without context cannot diagnose health or define a successful run.</p>
<p>Heart-rate zones can organize training, yet consumer watches estimate both the pulse and the boundaries. Age formulas describe population averages, not an individual maximum. Beginners are better served by combining heart rate with breathing, conversation, perceived effort, pace, terrain, and symptoms.</p>
<blockquote><strong>The useful rule:</strong> treat heart rate as one data point. Check the signal, interpret the conditions, and respond to how you feel instead of chasing or fearing an isolated number.</blockquote>

<h2>What heart rate means during running</h2>
<p>The heart pumps blood so oxygen and nutrients can reach working tissue and heat can be moved toward the skin. As running demand rises, heart rate commonly rises along with other cardiovascular responses. It may continue drifting upward during a steady prolonged run, especially in heat.</p>
<p>Beats per minute do not directly measure fitness, calorie use, danger, or effort. Two runners at the same pace may have different rates, and the same runner may record different rates on separate days. Comparisons are most useful within the same person under similar conditions.</p>
<p>A watch reading is not an electrocardiogram or medical evaluation. It cannot determine why a heart rate is high, low, irregular, or accompanied by symptoms.</p>

<h2>Resting versus exercise heart rate</h2>
<p>Resting heart rate is commonly checked while calm and still, often after waking. Exercise heart rate reflects the active task. Comparing a run reading with a resting range confuses two different conditions.</p>
<p>The American Heart Association’s <a href="https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/target-heart-rates">heart-rate overview</a> describes age-based target figures as averages and notes that stress, hormones, medication, and activity influence heart rate. Its chart is a general guide, not clearance or an individual diagnosis.</p>
<p>Trends in a consistently measured resting rate can provide context, but sleep, illness, alcohol, heat, dehydration, and device error can affect them. An unexplained persistent change—especially with symptoms—deserves appropriate assessment rather than a harder training response.</p>

<h2>How watches measure heart rate</h2>
<p>Most wrist watches use photoplethysmography: light emitted into the skin is analyzed for changes associated with blood flow. Software turns that signal into an estimated pulse. Movement, loose fit, cold skin, sweat, tattoos, hair, cadence-like motion, sensor placement, and algorithms can affect the result.</p>
<p>A <a href="https://pubmed.ncbi.nlm.nih.gov/32552580/">systematic review and meta-analysis of wrist devices</a> found small average differences for several activities while also showing activity-dependent performance. Group averages can hide large errors for an individual moment or device.</p>
<p>Wear the device according to its instructions, allow it to settle, and clean the sensor. If a reading jumps implausibly while effort feels unchanged, slow down, check fit and signal, and compare with a manual pulse or validated chest sensor if appropriate. Do not continue through concerning symptoms because the number looks normal.</p>

<h2>Skin tone and wearable evidence</h2>
<p>Optical sensing works through reflected light, so researchers have examined whether skin tone affects performance. A <a href="https://pubmed.ncbi.nlm.nih.gov/36376641/">systematic review covering skin-tone evidence</a> found inconsistent results: some studies reported reduced accuracy with darker skin while others did not, and the authors called for larger, better research.</p>
<p>This uncertainty matters in a Filipino audience. Do not assume a commercial device has been equally validated across all skin tones, bodies, intensities, and environments. A watch company’s confidence score does not replace transparent independent validation.</p>
<p>Use trends cautiously and escalate persistent discrepancies rather than blaming the wearer. When measurement accuracy is important for clinical care, ask the relevant health professional what device and method to use.</p>

<h2>What are heart-rate zones?</h2>
<p>Zones divide a heart-rate range into bands intended to represent different intensities. Apps may label them warm-up, easy, aerobic, threshold, or maximum. Names and boundaries vary by platform, so Zone 2 in one app may not equal Zone 2 in another.</p>
<p>Some systems use a percentage of predicted maximum; others use measured maximum, resting-rate reserve, threshold heart rate, or laboratory testing. Changing the method can move every boundary without changing your body.</p>
<p>A zone is only as sound as its inputs and intended purpose. Default zones may be useful for observation, but they are not personalized merely because they appear beside your name.</p>
<p>Before using a zone screen, open the app settings and identify the calculation method, maximum value, resting value, and any manual overrides. A software update, new account, or different platform can reset these inputs. If the app changes a boundary automatically, note the change before comparing old and new sessions.</p>
<p>Zone labels can create false precision. A heartbeat on either side of a colored boundary does not transform the body instantly from safe to unsafe or from aerobic to ineffective. Physiological responses overlap, measurements have error, and heart rate can lag. Use bands as broad organizing tools rather than traffic lights with perfect edges.</p>

<h2>Why maximum-heart-rate formulas are estimates</h2>
<p>The familiar “220 minus age” formula is a rough population shortcut. A <a href="https://pubmed.ncbi.nlm.nih.gov/11153730/">large meta-analysis and validation study</a> proposed a different age relationship after examining many studies and healthy adults. Both approaches remain predictions with individual variation.</p>
<p>An equation cannot know medication effects, medical history, actual maximal response, or whether a device captured the peak correctly. Being above a predicted value does not automatically prove danger; being below it does not prove safety.</p>
<p>Do not perform an unsupervised maximal test to correct an app. Maximal testing adds risk and may be inappropriate. When exact intensity boundaries matter, qualified exercise or medical professionals can determine a suitable assessment.</p>

<h2>Why the same pace can produce different heart rates</h2>
<p>A flat cool kilometer after good sleep is not the same task as that pace uphill, into wind, after illness, in humidity, or late in a long run. Heart rate reflects the total demand rather than the pace number alone.</p>
<p>Day-to-day variation is normal. Warm-up, accumulated fatigue, menstrual-cycle factors, food, hydration, emotion, altitude, and sensor behavior can contribute. Look for repeated patterns under comparable conditions.</p>
<p>The <a href="/blog/beginners-guide-to-running-pace">beginner pace guide</a> explains why pace must be interpreted rather than obeyed. Slowing when heart rate and effort rise can preserve the session’s purpose.</p>

<h2>Heat and humidity</h2>
<p>In heat, the cardiovascular system helps move heat toward the skin while sweat supports cooling. Heart rate may rise at a pace that felt easy in cooler conditions. High humidity limits evaporation and can increase strain.</p>
<p>Use the <a href="/blog/how-to-run-safely-during-hot-and-humid-weather">hot-weather guide</a> for timing, acclimatization, clothing, route, cooling, and symptom decisions. A lower target pace, walking, shade, an indoor venue, or postponement may be appropriate. Heart-rate zones do not make unsafe heat safe.</p>
<p>Confusion, collapse, faintness, severe weakness, loss of coordination, or rapid deterioration requires urgent action, not watch troubleshooting.</p>

<h2>Hills</h2>
<p>Climbing raises work at a given pace, so heart rate and breathing often rise while speed falls. Descending may lower aerobic demand but adds balance and braking demands. The <a href="/blog/hill-running-for-beginners">hill-running guide</a> recommends managing slope by effort instead of preserving flat pace.</p>
<p>Optical sensors can also be disrupted by arm motion, grip tension, or rapid intensity changes. Judge the trend across the climb rather than one delayed or spiking value.</p>
<p>Walk when that better controls effort or footing. A zone alert is never a command to accelerate downhill.</p>

<h2>Heart rate is not running cadence</h2>
<p>Heart rate counts cardiac beats per minute; cadence counts steps per minute. The values can sometimes appear similar, which can make an optical watch “lock” onto repeated arm or step motion and report cadence-like data as pulse. That is a measurement artifact, not proof that the heart and feet should share a target.</p>
<p>The <a href="/blog/running-cadence-explained">running cadence guide</a> rejects a universal step-rate prescription. The same caution applies here: do not change stride to make heart rate and cadence separate on a screen, and do not force either metric toward a popular number.</p>
<p>Look at both traces after the run. A suspiciously identical shape, sudden jump without an effort change, or implausibly steady plateau can prompt a fit and signal check. It cannot confirm the cause by itself.</p>

<h2>Sleep, stress, caffeine, and other variables</h2>
<p>Poor sleep, emotional stress, pain, fever, illness, dehydration, and fatigue can change heart rate and perceived effort. Caffeine and other stimulants may affect the pulse, anxiety, gut, and sleep. Prescription and nonprescription medicines can raise, lower, or otherwise alter heart-rate response.</p>
<p>Do not stop or change medication based on a running reading. Ask the prescribing clinician how it affects exercise and whether app zones apply. Energy drinks and pre-workout products are not required for beginner running.</p>
<p>If the same easy route repeatedly feels much harder or produces an unexplained sustained change, step back and review health and recovery rather than treating the number as a challenge.</p>

<h2>Running heart rate versus pace</h2>
<p>Pace describes speed over ground; heart rate describes one physiological response. Hills, surface, wind, heat, and GPS error can change the relationship. Neither metric is universally superior.</p>
<p>On an easy run, a runner might slow to preserve conversational effort even when pace drops. In a short interval, heart rate can lag behind the work and peak after the pace changes. This delay makes instant zone chasing unhelpful.</p>
<p>Use lap averages and context if reviewing data later. Do not manipulate a safe route or sprint at the end simply to improve a chart.</p>

<h2>Running heart rate versus the talk test</h2>
<p>The talk test asks whether speech remains comfortable. It costs nothing and responds to the body in real time. A <a href="https://pubmed.ncbi.nlm.nih.gov/35507232/">review of subjective intensity methods</a> found useful relationships between talk-test or perceived-exertion responses and physiological intensity domains, while also discussing limitations.</p>
<p>For easy activity, comfortable sentences can be a practical cue alongside breathing and heart rate. The test is not diagnosis and may not suit every workout or person, particularly with speech, respiratory, or medical limitations.</p>
<p>If the watch says “easy” but speech is unexpectedly difficult, slow or stop and assess the situation. If conversation is comfortable but one reading spikes, check the signal without assuming either source is infallible.</p>

<h2>Why is my heart rate high when running?</h2>
<p>Possible explanations range from normal intensity and a steep hill to heat, fatigue, caffeine, illness, medication, anxiety, dehydration, or sensor error. The number alone cannot identify which one.</p>
<p>First reduce intensity and move to a safe environment. Check for symptoms and whether the device signal is plausible. Do not repeatedly test the high number with harder running.</p>
<p>Seek urgent help for chest pain or pressure, fainting, severe breathing difficulty, confusion, sudden weakness, or other emergency signs. Seek appropriate assessment for persistent, recurrent, unexplained, or symptomatic changes.</p>

<h2>When not to rely on a watch number alone</h2>
<p>A normal-looking heart rate does not clear chest symptoms, severe breathlessness, faintness, or neurological changes. An alarming-looking number without symptoms can still be artifact, but it deserves a safe pause and verification.</p>
<p>Consumer alerts are not a diagnosis of rhythm disorders. Do not dismiss an alert that repeats or occurs with symptoms, and do not self-diagnose from a screenshot. Save relevant context for a clinician if advised.</p>
<p>No watch can see road hazards, heat illness, pain, or declining coordination. Safety decisions remain broader than biometrics.</p>

<h2>Checking a surprising reading</h2>
<p>When a number looks surprising, move out of traffic and reduce or stop activity. Notice symptoms first. Then check whether the strap is secure, the sensor is clean, the wrist is warm enough, and the watch has stable contact. Give it time rather than repeatedly tightening until circulation or skin comfort is affected.</p>
<p>A manual radial pulse can provide a rough comparison when you know how to find it, but short counting intervals and irregular rhythms create error. Do not press both sides of the neck or attempt a complex check while moving. A chest strap can improve signal for some uses, yet it is still equipment—not diagnosis.</p>
<p>Save the time, route, activity, symptoms, medicines, and screenshot if a clinician asks for context. Editing or deleting an inconvenient spike may make a training chart prettier but removes information needed to understand the device.</p>

<h2>Three beginner heart-rate scenarios</h2>
<h3>A warm easy run</h3><p>Ana’s pace is slower than last week but heart rate and breathing rise in humid sun. She moves to shade, slows to walking, and ends early. She does not chase last week’s pace or assume water alone makes continuing safe.</p>
<h3>A sudden watch spike</h3><p>Ben’s display jumps while conversation and effort feel unchanged. He steps safely off the route, checks the loose watch, and compares the signal after it settles. If symptoms had appeared, the response would be medical rather than technical.</p>
<h3>A default zone alert</h3><p>Carla’s new app labels an ordinary conversational run “maximum.” She discovers it used an unverified predicted maximum. She keeps the run controlled and seeks qualified help before using zones as a prescription.</p>
<p>These fictional examples illustrate decisions, not diagnoses or promised safe outcomes.</p>

<h2>Using heart rate as one training data point</h2>
<ol><li><strong>Define the run.</strong> Decide whether it should be easy, steady, or something else appropriate.</li><li><strong>Check the device.</strong> Use correct fit and allow the signal to settle.</li><li><strong>Add context.</strong> Note heat, hills, sleep, stress, caffeine, illness, and medication.</li><li><strong>Use human cues.</strong> Monitor breathing, talk, perceived effort, movement, and symptoms.</li><li><strong>Adjust safely.</strong> Slow, walk, shorten, stop, or move venues as needed.</li><li><strong>Review trends.</strong> Compare similar sessions rather than isolated peaks.</li><li><strong>Escalate uncertainty.</strong> Use qualified help when health or precise prescription is involved.</li></ol>
<p>The <a href="/blog/gps-watch-vs-running-app">GPS watch versus app guide</a> explains why device choice and signal context matter. Heart-rate capability is one feature, not proof of medical-grade accuracy.</p>

<h2>Frequently asked questions</h2>
<h3>What should my heart rate be while running?</h3><p>There is no universal target. Appropriate intensity depends on health, medication, testing method, goals, and context. Default age zones are estimates.</p>
<h3>Is 180 beats per minute too high?</h3><p>A single value cannot be interpreted safely without age, health, symptoms, activity, duration, and signal confidence. Slow or stop safely, assess symptoms, and seek appropriate care when concerned.</p>
<h3>Why does my watch lock onto cadence?</h3><p>Optical algorithms may sometimes interpret repeated motion as pulse. Fit, location, motion, and device design matter. Check manually or with an appropriate reference rather than assuming the trace is correct.</p>
<h3>Should beginners train by zones?</h3><p>Zones may add context, but beginners can also use talk, breathing, and effort. Do not let unverified default zones override safety or enjoyment.</p>
<h3>Does a lower running heart rate always mean better fitness?</h3><p>No. Pace, weather, fatigue, medicine, device error, and health all affect the number. Fitness trends require comparable conditions and broader evidence.</p>

<h2>Keep the number in context</h2>
<p>Heart rate can help explain effort, but watches estimate it and formulas estimate zones. Interpret trends beside pace, terrain, heat, sleep, stress, conversation, and symptoms. Never use one number to diagnose yourself or force a run.</p>
<p>Use appropriate effort and a safe route when you <a href="/events">browse current HelloRun events</a>. The goal is a repeatable activity, not a perfect chart.</p>

<h2>Official sources and health note</h2>
<p>This guide was reviewed in September 2026 against current American Heart Association information and peer-reviewed research on wrist-device validity, skin-tone evidence, maximum-heart-rate prediction, and subjective intensity methods. It is general education, not diagnosis, medical clearance, cardiac rehabilitation, or an individual exercise prescription.</p>`;
const REQUIRED_HEADINGS=Object.freeze(['What heart rate means during running','Resting versus exercise heart rate','How watches measure heart rate','Skin tone and wearable evidence','What are heart-rate zones?','Why maximum-heart-rate formulas are estimates','Why the same pace can produce different heart rates','Heat and humidity','Hills','Sleep, stress, caffeine, and other variables','Running heart rate versus pace','Running heart rate versus the talk test','Why is my heart rate high when running?','When not to rely on a watch number alone','Using heart rate as one training data point','Frequently asked questions','Official sources and health note']);
const REQUIRED_LINKS=Object.freeze(['href="/events"','href="/blog/running-cadence-explained"','href="/blog/gps-watch-vs-running-app"','href="/blog/beginners-guide-to-running-pace"','href="/blog/hill-running-for-beginners"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wc=contentText.split(/\s+/).filter(Boolean).length,p={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wc/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(p);return p}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),wc=t.split(/\s+/).filter(Boolean).length;if(wc<2500||wc>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||p.title.length>120||!p.excerpt||p.excerpt.length>220||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8||p.tags.some(x=>!x||x.length>30))e.push('tags');if(/<h1\b/i.test(p.contentHtml))e.push('h1');if(/everyone should target \d+|one safe heart rate for everyone/i.test(t))e.push('universal target');if(/watch readings diagnose|a normal watch reading proves/i.test(t))e.push('diagnosis');if(/220 minus age is exact|age formula is always accurate/i.test(t))e.push('formula');if(/every event requires heart rate|pending is approved/i.test(t))e.push('event');if(!/number without context cannot diagnose/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes('<h2>'+h+'</h2>'))e.push('heading '+h);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push('link '+l);if(e.length)throw new Error('Invalid heart-rate payload: '+e.join('; '));return true}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
