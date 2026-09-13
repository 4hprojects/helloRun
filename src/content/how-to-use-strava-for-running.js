'use strict';
const {sanitizeHtml,htmlToPlainText}=require('../utils/sanitize');
const CANONICAL_SLUG='how-to-use-strava-for-running';
const ARTICLE=Object.freeze({slug:CANONICAL_SLUG,title:'How to Use Strava for Running: A Beginner’s Guide',excerpt:'Learn the current basics of recording, saving, reviewing, and managing Strava runs, then use a connected activity in HelloRun when an event allows it.',category:'General',tags:Object.freeze(['how to use Strava','Strava running','Strava for beginners','record run on Strava','Strava GPS running','track running Strava','Strava virtual run','running app guide']),seoTitle:'How to Use Strava for Running: A Beginner’s Guide',seoDescription:'Learn how beginners can record, review, and manage running activities in Strava, understand GPS limitations, and prepare activity evidence for virtual runs.',coverImageAlt:'Risograph-style Filipino beginner runner recording and saving a generic GPS activity with a phone and connected watch'});
const RAW_CONTENT_HTML=`
<p>Learning <strong>how to use Strava for running</strong> starts with one complete practice cycle: choose how you will record, select the correct sport, start outdoors, finish deliberately, save the activity, wait for it to sync, and review the result. Do that on an ordinary run before depending on Strava for an important virtual event.</p>
<p>This guide reflects Strava’s official help pages checked on September 13, 2026 and HelloRun’s current repository implementation on the same date. App labels and integrations can change. Follow the current screen and official support when it differs from this article.</p>
<blockquote><strong>The reliable habit:</strong> recording is not complete when you stop moving. Confirm that the activity is saved, synced, plausible, private enough for you, and suitable for the event rules.</blockquote>

<h2>What is Strava?</h2>
<p>Strava is an activity-recording and social platform. A runner can record directly with its iOS or Android app, sync an activity from a compatible watch or platform, import a workout file, or add some activities manually. Features, compatibility, and subscription access can change.</p>
<p>A recorded running activity may include date, route, distance, moving time, elapsed time, pace, elevation, and other device data. These fields are measurements produced from sensors and software, not certified facts. GPS errors, pauses, processing, device differences, and edits can affect them.</p>
<p>The <a href="/blog/best-apps-to-track-your-virtual-run">running-app comparison</a> helps you choose by device, event needs, and workflow. You do not have to use Strava unless your event or personal process calls for it.</p>

<h2>Do you need a GPS watch?</h2>
<p>No. Strava’s official <a href="https://support.strava.com/en-us/articles/15402066-how-to-get-your-activities-to-strava">activity-upload guide</a> describes four main paths: record in the mobile app, sync a connected device, import from another platform, or upload an activity file. A supported phone with location permission can record a GPS run directly.</p>
<p>A watch may be convenient for viewing time or pace without holding a phone, and some devices offer longer battery life or extra sensors. It also adds setup, charging, syncing, account permissions, and another source of possible differences. The <a href="/blog/gps-watch-vs-running-app">watch-versus-app guide</a> explains the tradeoffs.</p>
<p>Choose one primary recorder. Recording the same run independently on a phone and watch can create duplicates, different distances, and confusion about which record is official.</p>

<h2>Prepare the phone before recording</h2>
<p>Install the current official app from the device’s trusted app store, sign in to the intended account, update when appropriate, and review location and motion permissions. Confirm there is enough battery and storage. Device power-saving settings can restrict background location on some phones.</p>
<p>Open Strava before leaving. Make sure the account is correct, the phone clock and timezone are sensible, and the intended privacy default is understood. If the run matters, restart or troubleshoot the phone before the start—not midway through the activity.</p>
<p>Use a secure carrying position that does not obstruct the phone’s signal or create a drop risk. The <a href="/blog/how-accurate-is-phone-gps-for-running">phone GPS accuracy guide</a> covers buildings, tree cover, device position, signal loss, and route distortion.</p>

<h2>Record a run with the current mobile flow</h2>
<p>As of the review date, Strava’s official <a href="https://support.strava.com/en-us/articles/15402137-how-do-i-record-an-activity-on-strava">recording instructions</a> say to tap <strong>Record</strong> in the bottom navigation. The app defaults to the last recorded activity type. Tap the sport icon beside the start control when you need to change it, then select the appropriate running type.</p>
<p>Go outdoors and allow the device to establish a useful location signal. The current recording screen represents GPS strength with a halo around the location; Strava says a smaller halo indicates a stronger signal. A visual indicator still cannot guarantee perfect accuracy.</p>
<p>Tap <strong>Start</strong> near the bottom of the screen and verify that time advances before putting the phone away. Do not walk into traffic while checking it. Exact placement, icons, and labels may differ by platform or later release.</p>

<h2>Choose the correct activity type</h2>
<p>Select Run for an ordinary outdoor run when that accurately describes the activity. Walking, hiking, trail running, treadmill, and virtual running can be treated differently by platforms or event rules. Do not label an activity strategically just to enter a category.</p>
<p>If a connected watch assigned the wrong sport, review whether Strava lets you correct it without misrepresenting the source. Keep the original sensor data. Event organizers may assess activity type alongside route, time, and other details.</p>
<p>HelloRun’s current direct import supports Strava types Run, VirtualRun, TrailRun, Walk, and Hike, mapping them to the corresponding available HelloRun run types. The selected event still controls which types it accepts.</p>

<h2>Understand pause, moving time, and elapsed time</h2>
<p>You may pause manually at a stop or use auto-pause, but consistency matters. Strava’s current instructions say manual pausing is unnecessary unless you want direct control; when auto-pause is off and you do not pause, server processing estimates rest from GPS data.</p>
<p><strong>Elapsed time</strong> covers the interval from start to finish, including stops. <strong>Moving time</strong> attempts to represent active movement. Strava’s <a href="https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations">time and pace explanation</a> notes that feeds and general stats usually prioritize moving time, while race-tagged runs and some other views use elapsed time.</p>
<p>Neither choice should be used to hide an ineligible activity. Check the virtual event’s definition of time and whether pauses are allowed. A long stopped recording can also consume battery and produce GPS drift.</p>

<h2>Finish and save the activity</h2>
<p>At the end, move somewhere safe, open the recording screen, and tap the pause control. Then tap <strong>Finish</strong> to reach the save screen. Review the activity type, title, privacy, and visible details before saving.</p>
<p>Strava’s current guidance says iOS uses <strong>Save Activity</strong>, while Android places <strong>Save</strong> at the top right. It also warns that a confirmed discarded Android activity cannot be recovered by Strava. Read the confirmation instead of tapping from habit.</p>
<p>After saving, let the upload finish. Open the completed activity from your account and confirm it exists. Seeing numbers on the recording screen before saving is not proof that the server received the record.</p>

<h2>Confirm syncing before closing the workflow</h2>
<p>A direct phone recording needs data later to upload even if maps were not viewed during the run. A watch recording normally passes through its manufacturer’s app or service and then through the authorized Strava connection. Either path can be delayed.</p>
<p>If the activity remains pending, use stable Wi-Fi or data and follow current official troubleshooting. Avoid repeatedly creating manual duplicates. Preserve any original file on the recorder until the correct activity appears.</p>
<p>Open the activity details and check date, sport, time, distance, and route. If the record is missing or obviously corrupted, resolve that before submitting it to an organizer.</p>

<h2>Read distance, time, pace, and route carefully</h2>
<p>Distance summarizes the recorded or processed path. Pace relates time to distance and may use moving time in many Strava views. Elapsed time includes stops. A map shows sampled locations joined into a route. Elevation may be device-based or adjusted through a platform dataset.</p>
<p>These values answer different questions. A fast-looking moving pace does not describe the full time from start to finish. A smooth map line can still contain errors, while a small jagged section does not automatically invalidate an entire run.</p>
<p>Compare the result with the known route and ordinary effort. Investigate major surprises rather than editing values to match an expectation.</p>

<h2>Why GPS distance can differ</h2>
<p>Phones and watches sample location at intervals, estimate a route between points, and process noisy signals. Tall buildings, covered areas, dense trees, turns, tunnels, weather, antenna position, battery settings, and temporary signal loss can change the track.</p>
<p>Two runners side by side can receive different points or apply different processing. Strava may also calculate moving time differently from the device that created the activity. Small disagreement does not prove cheating or device failure.</p>
<p>Start with a location signal, carry the recorder consistently, keep the relevant permissions enabled, and avoid editing or trimming unless necessary and allowed. No setup makes consumer GPS exact.</p>

<h2>Review activity privacy</h2>
<p>A running map can reveal routines, start locations, workplaces, schools, and homes. Review privacy before making activities broadly visible. Strava currently offers activity visibility choices of Everyone, Followers, and Only You, plus separate map-visibility controls.</p>
<p>Its current <a href="https://support.strava.com/en-us/articles/15401987-activity-privacy-controls">activity privacy guide</a> says the mobile path is the settings icon in the You tab, then Privacy Controls for defaults. An individual mobile activity can be opened, edited through the three-dot control, and assigned a different visibility.</p>
<p>Privacy controls affect leaderboards, challenges, and what others can open. Do not make an activity public merely because you assume an organizer needs it. Check the organizer’s actual workflow first.</p>

<h2>Use map visibility deliberately</h2>
<p>Map visibility is separate from whole-activity visibility. Strava currently allows users to hide portions near chosen addresses, hide start and end portions wherever they occur, or hide an entire activity map from others.</p>
<p>Strava warns that hidden map portions may still pass to an authorized third-party service when the service has permission to access private activity data. Review both Strava’s authorization screen and the third party’s own privacy controls.</p>
<p>A screenshot can also expose a route even if the online activity is restricted. Crop only when event rules permit, and check the entire image for names, notifications, profile photos, home locations, and unrelated personal data.</p>

<h2>Keep useful activity evidence</h2>
<p>The original saved activity is stronger evidence than a retyped summary because it preserves source fields. Keep the activity ID or link where appropriate, along with the date, sport, distance, and duration. Do not delete the original immediately after taking a screenshot.</p>
<p>The <a href="/blog/what-counts-as-valid-run-proof">valid-proof guide</a> explains that acceptance belongs to the event rules. Some organizers need a screenshot; others accept a direct synchronized activity; some require extra fields. Strava availability alone does not decide validity.</p>
<p>When screenshots are allowed, use the completed activity details rather than a live recording screen. Confirm required fields are visible and legible while protecting information the organizer did not request.</p>

<h2>Use Strava with HelloRun’s current workflow</h2>
<p>As of September 13, 2026, a signed-in HelloRun runner can connect Strava through the runner workspace. The authorization step redirects to Strava, where the runner reviews the requested access and returns to HelloRun. Connection is optional and can be disconnected from the profile.</p>
<p>In the HelloRun run-proof flow, <strong>Sync from Strava</strong> requests up to 20 recent activities. The runner selects one activity, then chooses one eligible HelloRun event or Personal Record and confirms the submission. Distance, elapsed duration, date, type, elevation when available, and source are filled from the selected activity.</p>
<p>A Strava import targets one event or Personal Record at a time. To use a screenshot for more than one eligible event, follow the screenshot workflow and each event’s rules. Current behavior may change, so follow the live interface.</p>

<h2>Review connection permissions and account identity</h2>
<p>When connecting a third-party service, read the authorization screen instead of treating it as a routine login. Confirm which Strava account is active, which activity information the service requests, and whether access to private activities is included. Continue only when the permissions match what you intend to share.</p>
<p>A connected account is specific to the signed-in HelloRun runner. Before selecting an activity, verify the athlete identity and recent history are yours. Shared phones, multiple browser profiles, and remembered logins can make it easy to authorize the wrong account. Disconnect and reconnect correctly rather than submitting first and explaining later.</p>
<p>Strava’s privacy documentation notes that map portions hidden inside Strava may be transmitted to authorized third parties that can access private activity data. Treat HelloRun’s stored activity fields and organizer review as a separate disclosure context. Avoid routes beginning at a sensitive location when a safer alternative is practical.</p>
<p>Disconnecting can stop future access, but it does not necessarily erase a submission already created from an activity. Account deletion and data-removal requests are separate processes governed by each service’s current controls and policies. Review them before connecting if this distinction matters to you.</p>

<h2>Know HelloRun’s current import limits</h2>
<p>Connecting Strava does not register you for an event. Event submission currently requires a paid, confirmed registration. The activity must belong to the connected Strava account, have positive distance and duration, use a supported activity type, fall within the event window, and satisfy accepted-type and minimum-distance rules.</p>
<p>If an event requires a screenshot for every activity, HelloRun directs the runner to upload that screenshot instead of using the direct Strava-only path. Strava-only activities also cannot enter a steps competition because the current import does not provide verified steps.</p>
<p>The same Strava activity cannot be submitted twice to the same event, and an existing non-rejected submission can block another result for that registration. Clean synchronized activities may auto-approve under platform rules; others remain available for review. Never describe import as guaranteed approval.</p>

<h2>Submit according to the event rules</h2>
<p>Before the run, open the actual event page and check dates, timezone, distance, completion method, allowed activity types, minimum activity distance, screenshot requirements, and submission deadline. Rules differ even within the same platform.</p>
<p>After the activity syncs, open the proof flow, select the Strava activity, review the auto-filled values, choose one eligible target, and confirm. Do not submit a friend’s activity or an activity from another account.</p>
<p>The <a href="/blog/how-to-submit-run-proof-correctly-hellorun">HelloRun proof guide</a> covers the broader submission process. Keep the original record until review is complete.</p>

<h2>Common beginner mistakes</h2>
<ul><li>Starting before location is ready or forgetting to tap Start.</li><li>Leaving the previous sport type selected.</li><li>Stopping movement but forgetting Finish and Save.</li><li>Discarding instead of saving after a run.</li><li>Assuming a watch sync is immediate.</li><li>Recording simultaneously on multiple primary devices and creating duplicates.</li><li>Confusing moving time with elapsed time.</li><li>Publishing a home route without reviewing privacy.</li><li>Using a cropped screenshot that omits required fields.</li><li>Assuming every event accepts Strava, walking, manual activities, or direct import.</li><li>Submitting before the activity appears completely in Strava.</li><li>Deleting the source activity before organizer review.</li></ul>

<h2>A simple practice run</h2>
<ol><li>Review location permissions, battery, storage, and privacy.</li><li>Go outdoors and open Record.</li><li>Select the correct running activity type.</li><li>Wait for a useful location signal, then tap Start.</li><li>Complete a familiar low-stakes route.</li><li>Pause safely, tap Finish, and review the save screen.</li><li>Save, wait for sync, and open the completed activity.</li><li>Check time, distance, route, sport, and visibility.</li><li>If using HelloRun later, connect Strava and learn the proof flow without making a false submission.</li></ol>
<p>Test Strava on an ordinary activity before relying on it for an important virtual-run submission. If you are preparing for a longer goal, the <a href="/blog/how-to-run-your-first-10k-virtual-run">first virtual 10K guide</a> connects tracking with pacing and event preparation.</p>

<h2>Frequently asked questions</h2>
<h3>Does Strava track distance?</h3><p>Yes, for GPS-based activities it calculates distance from recorded location data, subject to device, signal, and processing limitations.</p>
<h3>Can I use Strava without a watch?</h3><p>Yes. A compatible iOS or Android phone can record directly with the app when permissions and GPS work properly.</p>
<h3>Why is my Strava pace different from my watch?</h3><p>The platforms may process distance, pauses, moving time, and GPS data differently. Review moving versus elapsed time and the recorded route.</p>
<h3>Does a Strava activity automatically count for HelloRun?</h3><p>No. You must connect the correct account and submit an eligible activity to one eligible target under that event’s current rules.</p>
<h3>Must my activity be public?</h3><p>Not universally. Choose privacy deliberately and follow the specific event or integration requirements shown at submission.</p>

<h2>Official and platform sources</h2>
<p>Strava product steps in this guide were checked against official Strava Help Center pages on September 13, 2026. HelloRun import behavior was checked against the deployed repository workflow for connection, recent-activity selection, validation, and submission. Both services may change after publication. Strava is a trademark of its owner; HelloRun is not claiming ownership of or endorsement by Strava.</p>`;
const REQUIRED_HEADINGS=Object.freeze(['What is Strava?','Do you need a GPS watch?','Prepare the phone before recording','Record a run with the current mobile flow','Choose the correct activity type','Understand pause, moving time, and elapsed time','Finish and save the activity','Confirm syncing before closing the workflow','Read distance, time, pace, and route carefully','Why GPS distance can differ','Review activity privacy','Use map visibility deliberately','Keep useful activity evidence','Use Strava with HelloRun’s current workflow','Know HelloRun’s current import limits','Submit according to the event rules','Common beginner mistakes','A simple practice run','Frequently asked questions','Official and platform sources']);
const REQUIRED_LINKS=Object.freeze(['href="/blog/best-apps-to-track-your-virtual-run"','href="/blog/how-accurate-is-phone-gps-for-running"','href="/blog/gps-watch-vs-running-app"','href="/blog/what-counts-as-valid-run-proof"','href="/blog/how-to-submit-run-proof-correctly-hellorun"','href="/blog/how-to-run-your-first-10k-virtual-run"']);
function buildArticlePayload({coverImageUrl}={}){const contentHtml=sanitizeHtml(RAW_CONTENT_HTML).trim(),contentText=htmlToPlainText(contentHtml),wc=contentText.split(/\s+/).filter(Boolean).length,p={...ARTICLE,tags:[...ARTICLE.tags],contentHtml,contentText,contentRaw:contentText,readingTime:Math.ceil(wc/180),ogImageUrl:String(coverImageUrl||'').trim(),coverImageAlt:ARTICLE.coverImageAlt};validateArticlePayload(p);return p}
function validateArticlePayload(p){const e=[],t=String(p.contentText||''),wc=t.split(/\s+/).filter(Boolean).length;if(wc<2500||wc>3000)e.push('article must contain 2500-3000 substantive words');if(!p.ogImageUrl)e.push('cover artwork is required');if(!p.title||!p.excerpt||p.excerpt.length>220||!p.seoDescription)e.push('metadata');if(!p.contentHtml||p.contentRaw!==p.contentText)e.push('content');if(!Array.isArray(p.tags)||p.tags.length!==8||p.tags.some(x=>!x||x.length>30))e.push('tags');if(/<h1\b/i.test(p.contentHtml))e.push('h1');if(/Strava always records exact distance|GPS is perfectly accurate/i.test(t))e.push('accuracy');if(/(?:^|[.!?]\s+)Every event accepts Strava|Strava automatically counts for every event/i.test(t))e.push('event');if(/direct import guarantees approval|every import auto-approves/i.test(t))e.push('approval');if(!/how to use Strava for running/i.test(t))e.push('intent');for(const h of REQUIRED_HEADINGS)if(!p.contentHtml.includes('<h2>'+h+'</h2>'))e.push('heading '+h);for(const l of REQUIRED_LINKS)if(!p.contentHtml.includes(l))e.push('link '+l);if(e.length)throw new Error('Invalid Strava guide payload: '+e.join('; '));return true}
module.exports={ARTICLE,CANONICAL_SLUG,RAW_CONTENT_HTML,REQUIRED_HEADINGS,REQUIRED_LINKS,buildArticlePayload,validateArticlePayload};
