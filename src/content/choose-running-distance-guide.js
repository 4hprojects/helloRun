'use strict';

const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const CANONICAL_SLUG = 'how-to-choose-between-a-5k-10k-21k-or-distance-challenge';
const LEGACY_SLUG = '5k-vs-10k-vs-21k-which-distance-should-you-choose';

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Choose Between a 5K, 10K, 21K, or Distance Challenge',
  excerpt: 'Choose a 5K, 10K, 21K, or accumulated-distance challenge by comparing your current base, preparation time, recovery, event format, and goals.',
  category: 'Race Tips',
  tags: Object.freeze([
    'race distance',
    '5k run',
    '10k run',
    '21k run',
    'distance challenge',
    'running goals',
    'event selection',
    'runner guide'
  ]),
  seoTitle: '5K vs 10K vs 21K vs Distance Challenge | HelloRun',
  seoDescription: 'Compare 5K, 10K, 21K, and accumulated-distance challenges using your current running base, preparation time, recovery, event rules, and goals.',
  coverImageAlt: 'Runner comparing 5K, 10K, 21K, and accumulated-distance challenge options before choosing an event'
});

const RAW_CONTENT_HTML = `
<p>Choosing an event distance is not a test of ambition. It is a planning decision: which goal fits the activity you can do consistently, the time you have to prepare, the recovery you can support, and the rules of the particular event? A well-matched 5K can be more meaningful than an overextended 21K, while an accumulated challenge can be a better fit than one continuous effort for some schedules.</p>
<p>The labels alone do not answer the question. A virtual 10K completed on a runner-chosen route differs from an onsite 10K with a fixed start, course cut-off, and aid stations. A “21K” category is not necessarily a formally measured half marathon. A 50K accumulated challenge can spread activity across weeks, but its total workload, minimum-activity rules, proof requirements, and deadlines may still be demanding.</p>
<blockquote><strong>The useful choice:</strong> select the format you can prepare for and complete within its actual rules, without treating the longest option as the best one. No distance guarantees completion, safety, approval, performance, or recognition.</blockquote>

<h2>Choose your distance in one minute</h2>
<ul>
  <li><strong>Consider 5K</strong> when you are new to structured running, returning after time away, building a walk-run routine, or want one manageable event session. It can also suit experienced runners pursuing a shorter performance goal.</li>
  <li><strong>Consider 10K</strong> when regular easy activity is already part of your routine and you want a longer single-session endurance goal without moving directly to half-marathon preparation.</li>
  <li><strong>Consider 21K</strong> when you have time for a gradual, sustained build, longer sessions, recovery, route planning, and event-specific nutrition or hydration preparation. Treat it as a substantial endurance commitment.</li>
  <li><strong>Consider an accumulated-distance challenge</strong> when repeated eligible activities suit your schedule or motivation better than one continuous effort. Check the target, event window, minimum activity, accepted activity types, submission limit, and review process.</li>
</ul>
<p>If two options seem equally suitable, choose the one that leaves more room for ordinary life, recovery, weather changes, and a missed session. You can build on a completed shorter goal later. Browse current <a href="/events">Events</a>, review <a href="/how-it-works">How It Works</a>, and use the <a href="/faq">FAQ</a> before registering.</p>

<h2>How this guide was prepared</h2>
<p>This guide was reviewed in July 2026 using documented HelloRun event and submission behavior and public guidance from World Athletics, the World Health Organization, the US Centers for Disease Control and Prevention, the UK National Health Service, the British Heart Foundation, and the Road Runners Club of America. It is a researched decision framework, not individualized coaching, a medical assessment, or hands-on testing of every event and device.</p>
<p>The sources show that beginner and endurance programmes use progressive preparation, recovery, and different starting points. CDC describes the talk test as a practical way to judge relative effort. RRCA explains virtual events as registered distance activities with a self-reporting system. Those principles help frame a decision, but none creates a universal rule saying that a particular weekly distance, pace, or training history makes every runner ready for a specific event.</p>
<p>Your health, disability, pregnancy, recent illness, injury history, and other circumstances may make qualified individual guidance appropriate. The live event page, local laws, route conditions, and instructions from relevant professionals remain authoritative.</p>

<h2>Understand what each label means</h2>
<h3>5K</h3>
<p>Five kilometres is approximately 3.1 miles. It is a common entry distance because it can support running, walking, or a planned mixture when the event permits those activities. “Beginner-friendly” should not be read as effortless, universally accessible, or safe without preparation. A fast 5K can also be a demanding performance event for an experienced runner.</p>
<h3>10K</h3>
<p>Ten kilometres is approximately 6.2 miles. It is twice the 5K distance, but the practical demand is not captured by simply doubling a recent 5K time. Pacing, time on feet, weather exposure, route support, fuelling needs, recovery, and confidence can change as the session becomes longer.</p>
<h3>21K and the official half marathon</h3>
<p>A category labelled 21K normally means about 21 kilometres. World Athletics defines the standard half marathon as 21.0975 kilometres, or 13.1094 miles. A virtual “21K,” a GPS reading near that distance, or an organiser's rounded category label is not automatically a certified half marathon. Certification concerns an accurately measured eligible road course and applicable competition rules, not merely the number shown by a watch or event title.</p>
<h3>Accumulated-distance challenge</h3>
<p>An accumulated challenge allows separate eligible activities to contribute to one registration-specific target over an event window. Targets may be 25K, 50K, 100K, or another configured amount. The name “distance challenge” is not enough to prove accumulation is allowed: some events use challenge language for one continuous activity. Read the mechanics before assuming that activities can be combined.</p>

<h2>At-a-glance comparison</h2>
<h3>Preparation and current routine</h3>
<ul>
  <li><strong>5K:</strong> often provides the shortest preparation bridge among these choices, with established beginner walk-run examples available. It still deserves recovery and a realistic schedule.</li>
  <li><strong>10K:</strong> generally asks for more sustained endurance and time on feet than 5K. Regular easy activity matters more than one unusually long outing.</li>
  <li><strong>21K:</strong> requires a longer, gradual build for most runners. World Athletics describes half-marathon preparation as dedicated and prolonged rather than an immediate extension of a short run.</li>
  <li><strong>Accumulated challenge:</strong> distributes eligible distance but may create frequent-session and administrative demands. Preparation depends on the total goal, event length, minimum activity, and recovery between submissions.</li>
</ul>
<h3>Route, schedule, and recovery</h3>
<ul>
  <li>A shorter single activity is usually easier to fit into one safe route and weather window, but the specific terrain or pace goal can change its difficulty.</li>
  <li>A longer single activity needs more uninterrupted time, route knowledge, contingency planning, and post-activity recovery.</li>
  <li>An accumulated format offers several activity opportunities, but the calendar can become crowded if the target is divided poorly or submissions are left late.</li>
  <li>Onsite events impose a venue, start time, course, transport plan, and possible cut-off. Virtual events can offer scheduling choice within a window, but not unrestricted participation.</li>
</ul>
<h3>Evidence and results</h3>
<ul>
  <li>A standard virtual 5K, 10K, or 21K commonly expects one accepted activity record for the selected category.</li>
  <li>An accumulated challenge normally expects each eligible activity separately rather than one weekly or monthly dashboard total.</li>
  <li>Pending evidence is not an approved result. For accumulated events, pending distance remains potential progress and does not count officially.</li>
  <li>Times and distances recorded on different routes, surfaces, treadmills, weather conditions, and devices are not inherently comparable.</li>
</ul>

<h2>Start with your consistent base, not your best day</h2>
<p>Look back at several ordinary weeks. What activity did you repeat comfortably enough to recover and continue? A single long outing proves that you completed that outing; it does not automatically establish a durable base for a longer event. Consistency reveals more about the schedule your life and body currently support.</p>
<p>Consider frequency, comfortable session duration, longest recent easy activity, how you felt the following day, and whether the pattern survived work, family, travel, and weather. Do not turn these observations into a universal pass-or-fail score. They are prompts for selecting a sensible next step.</p>
<p>For comfortable aerobic sessions, the talk test can help: at moderate intensity, CDC says a person can generally talk but not sing. Event preparation can include different intensities, but an easy conversational effort offers a useful reference. A goal that requires every training session to feel like a test is a warning that the distance, timeline, or performance target may need adjustment.</p>

<h2>Count the weeks and the real calendar</h2>
<p>Count backward from the activity date or window, then subtract weeks already constrained by travel, major work deadlines, caregiving, examinations, religious observance, or other commitments. The remaining calendar is your actual preparation time. Do not choose from an ideal week that rarely exists.</p>
<p>The NHS Couch to 5K programme is one documented beginner example using three weekly sessions and rest days over nine weeks, with flexibility to take longer. British Heart Foundation schedules show structured preparation for 10K and other distances. World Athletics describes at least a 12-week build for a half marathon. These are examples, not promises or mandatory timelines for every person.</p>
<p>If the event begins sooner than a reasonable build allows, choose a shorter category, an accumulated format with manageable rules, a completion rather than performance goal, or a later event. Changing the plan before registration is often simpler than negotiating a category change after payment or after the activity window begins.</p>

<h2>Include recovery and life load in the decision</h2>
<p>Distance consumes more than activity time. Include warm-up, travel, route preparation, showering, meals, sleep, proof review, and the possibility that you will want an easier day afterward. Longer activities may affect family plans or work even when the event itself is virtual.</p>
<p>Recovery is personal and can change with sleep, stress, heat, terrain, illness, and training history. Avoid selecting 21K only because a registration page remains open if the necessary long sessions would consistently displace sleep or other essential needs. Similarly, do not choose a large accumulated target by dividing it into a deceptively small daily number without allowing rest days and disruptions.</p>
<p>WHO's general activity recommendations describe weekly health-related movement, not race readiness. Meeting a public-health activity target does not automatically prepare someone for a 10K or 21K event, and training for a race does not guarantee that every aspect of the guidance is met.</p>

<h2>Match the distance to the goal that matters</h2>
<ul>
  <li><strong>First completion:</strong> favour a distance and format that lets you practise the whole process without making speed the main test.</li>
  <li><strong>Performance:</strong> a shorter distance can support a demanding pace goal and more specific practice. Longer is not inherently more advanced.</li>
  <li><strong>Consistency:</strong> an accumulated challenge may reward repeated eligible activities, provided its calendar and review rules support that objective.</li>
  <li><strong>Social participation:</strong> match the group pace, walking policy, course cut-off, meeting point, and support arrangement rather than selecting only by distance.</li>
  <li><strong>Personal milestone:</strong> decide whether the milestone is the number, one continuous effort, a certified onsite result, or a reviewed virtual completion. These are different outcomes.</li>
</ul>
<p>If you are preparing for your first virtual event, use <a href="/blog/how-to-prepare-for-your-first-virtual-run">How to Prepare for Your First Virtual Run</a>. For a broader format decision, compare <a href="/blog/virtual-run-vs-traditional-race-which-one-should-you-join">virtual and onsite races</a>.</p>

<h2>When a 5K may fit</h2>
<p>A 5K may fit when you want to learn event preparation through one bounded session, are building from regular walking or short walk-run activity, are returning after a break, or prefer a shorter distance with room for a performance goal. It can be completed with planned walk breaks when the event permits walking; continuous running is not a universal requirement.</p>
<p>Five kilometres can still require careful route, heat, accessibility, and proof planning. A hilly trail 5K, a hot midday 5K, and a flat cool-weather road 5K are different tasks. Onsite cut-offs and virtual minimum-distance rules can also change the experience.</p>
<h3>Questions before selecting 5K</h3>
<ul>
  <li>Can I build or maintain an easy walking or walk-run routine before the event?</li>
  <li>Does the event accept walking, treadmill activity, or my required accessibility adaptation?</li>
  <li>Am I choosing a completion goal or a pace goal, and have I allowed preparation for that goal?</li>
  <li>Can I identify a suitable route, venue, or permitted treadmill session?</li>
</ul>
<p>The <a href="/blog/beginner-5k-training-plan-new-runners">Beginner 5K Training Plan</a> provides a flexible nine-week walk-run framework without guaranteeing that every reader will complete the distance on that schedule.</p>

<h2>When a 10K may fit</h2>
<p>A 10K may fit when regular easy sessions are established, the additional time on feet is manageable, and you want a longer continuous goal. It can be a progression from 5K, but completing one 5K does not automatically mean the next event should be 10K. Look at the consistency around that result and the time available to build.</p>
<p>Route planning becomes more significant. A ten-kilometre route can cross more roads, extend farther from support, or expose the runner to changing weather. A loop can simplify water, toilets, transport, and an early stop, while an onsite event may provide structured support. Neither setting guarantees safety.</p>
<h3>Questions before selecting 10K</h3>
<ul>
  <li>Have recent weeks included repeatable easy activity rather than one isolated 5K?</li>
  <li>Can my calendar support gradually longer sessions and recovery?</li>
  <li>Have I considered route time, weather exposure, fluids, and a backup date?</li>
  <li>Does the event rank elapsed time, moving time, chip time, or another field, and does that matter to my goal?</li>
</ul>

<h2>When a 21K may fit</h2>
<p>A 21K may fit when you already train consistently, can make room for a prolonged gradual build, and understand the demands of longer sessions. It should not be selected only because it offers a larger medal, more points, or a more impressive label. Physical rewards may not exist, and they do not reduce the preparation required.</p>
<p>Longer activity magnifies practical issues: route surface, elevation, weather, low light, toilets, water access, carrying a phone, battery, navigation, transport, and what happens if the session must end early. Onsite entrants should review course cut-offs, wave rules, aid stations, bag arrangements, medical information, and transport. Virtual entrants need an independent support and emergency plan.</p>
<p>“21K” and “half marathon” should not be used interchangeably without checking the event. A certified onsite half marathon uses the standard 21.0975 km distance on a measured course. A virtual category may use 21K as its event-specific target and rely on consumer GPS evidence. Neither a HelloRun result nor a watch display proves formal course measurement or qualifying status.</p>
<h3>Questions before selecting 21K</h3>
<ul>
  <li>Does my real calendar allow a gradual build and recovery over an extended period?</li>
  <li>Have I handled longer easy sessions well enough to continue training consistently?</li>
  <li>Can I prepare route support, weather alternatives, familiar food and fluids, and device battery?</li>
  <li>If certification or qualifying status matters, has the accepting organization confirmed the exact event and result?</li>
</ul>

<h2>When an accumulated-distance challenge may fit</h2>
<p>An accumulated challenge may fit when repeated activities align with your schedule, you value consistency, or one long continuous effort is not the desired format. It can also support a group or workplace goal in which progress across an event window is the central experience.</p>
<p>An accumulated challenge is not automatically the easiest choice. A 100K monthly target may require far more total activity than one 10K event. Minimum distance per activity can prevent very short sessions from counting. Walking, hiking, treadmills, or activity splitting may be restricted. Each submission can require evidence, and one unresolved activity can affect final progress or configured certificate finalization.</p>
<p>On HelloRun, accumulated progress is registration-specific. Approved distance counts officially; pending distance can be shown separately as potential progress; rejected distance does not count. Remaining distance does not fall below zero, and approved distance can exceed the target when the event permits further eligible activities. A configured accumulated leaderboard ranks approved distance, not speed.</p>
<h3>Questions before selecting a challenge</h3>
<ul>
  <li>What is the selected goal, event window, final submission deadline, and timezone?</li>
  <li>What activity types, minimum activity distance, evidence sources, and number of submissions are allowed?</li>
  <li>Can I distribute activity while preserving recovery and room for weather or illness?</li>
  <li>Will I submit each activity promptly enough to address unclear or rejected evidence?</li>
</ul>
<p>Read <a href="/blog/how-accumulated-distance-challenges-work">How Accumulated Distance Challenges Work</a> before treating a displayed target as a simple daily-distance calculation.</p>

<h2>Virtual and onsite versions change the choice</h2>
<p>In an onsite event, the organizer defines the place and time. The course may offer signs, marshals, aid stations, timing, and shared atmosphere, but details vary. Confirm accessibility, terrain, cut-off, transport, start procedures, weather policy, refunds, and whether the course is certified. An onsite race is not automatically certified or suitable for every runner.</p>
<p>In a virtual event, the runner often chooses a permitted route and time within a defined window. That can help with schedule or accessibility, but it transfers more route, weather, tracking, privacy, and personal-support decisions to the participant. “Virtual” does not mean anywhere, anytime, any app, or any activity type.</p>
<p>For standard virtual events, a screenshot or supported connected activity may show date, distance, duration, unit, activity type, and source. For accumulated events, separate eligible activities contribute only after the applicable review. Use the <a href="/blog/best-apps-to-track-your-virtual-run">tracking-app comparison</a>, <a href="/blog/what-counts-as-valid-run-proof">valid-proof guide</a>, and <a href="/blog/how-to-submit-run-proof-correctly-hellorun">proof-submission walkthrough</a> when evidence is part of the choice.</p>

<h2>Five practical runner profiles</h2>
<h3>First-time walk-runner</h3>
<p>Rina can walk comfortably and has begun short run intervals, but she has not followed a consistent running plan. A completion-focused 5K several weeks away may give her room to practise a walk-run pattern. She checks that walking is accepted and does not assume the event requires continuous running. A 10K is not ruled out forever; it is simply not required for this first milestone.</p>
<h3>Regular 5K runner seeking a new goal</h3>
<p>Omar completes easy 5K sessions regularly and recovers predictably. He compares a faster 5K goal with a completion-focused 10K. His choice depends on which experience he values and whether his schedule supports longer sessions. “Progress” could mean better pacing at 5K rather than automatically doubling distance.</p>
<h3>Experienced endurance runner</h3>
<p>Mei has a sustained running routine and time for a gradual build. She considers an onsite half marathon and a virtual 21K. Because she wants a result accepted for a separate qualification process, she checks that organization's rules and the onsite race's certification rather than assuming either 21K label qualifies.</p>
<h3>Runner with an unpredictable schedule</h3>
<p>Paolo cannot protect one long weekend session every week but can complete shorter activities on several days. A month-long accumulated 25K may fit better than one 10K date. He checks the minimum activity, deadline, walking rules, and review process. He also leaves spare days instead of dividing 25K evenly across every calendar day.</p>
<h3>Runner prioritizing accessibility</h3>
<p>Sam needs a predictable accessible surface and support person. A virtual format may permit a familiar route, but only if the event accepts the planned activity and evidence. An onsite 5K with verified accessible facilities might provide stronger support than an unclear virtual 5K. Sam contacts the organizer before paying instead of assuming one format is automatically more inclusive.</p>

<h2>Use a non-scored readiness self-audit</h2>
<p>These questions organize a decision; they do not produce medical clearance or a universal readiness score.</p>
<ul>
  <li>What have I repeated comfortably during ordinary recent weeks?</li>
  <li>How does my body and schedule respond the day after a longer easy activity?</li>
  <li>How many usable preparation weeks remain after known disruptions?</li>
  <li>Can I protect recovery, sleep, and other responsibilities as activity grows?</li>
  <li>Do I want completion, performance, consistency, social participation, or a formal result?</li>
  <li>Can I provide the route, weather backup, accessibility, equipment, and support the format requires?</li>
  <li>Have I read walking, treadmill, pausing, proof, cut-off, correction, refund, and category-change rules?</li>
  <li>Would the next shorter option still feel meaningful and more sustainable?</li>
</ul>
<p>If pain, severe or unexplained symptoms, significant illness, pregnancy considerations, disability-related needs, or a chronic condition creates uncertainty, seek appropriate qualified guidance. General content cannot diagnose a problem or decide an individual's safe distance.</p>

<h2>Complete the decision worksheet</h2>
<ol>
  <li><strong>Write the goal:</strong> Describe the experience you want without naming a distance.</li>
  <li><strong>Record the base:</strong> Note several weeks of repeatable activity, not only the longest session.</li>
  <li><strong>Map the calendar:</strong> Identify preparation days, recovery, travel, and backup dates.</li>
  <li><strong>Compare formats:</strong> List one-activity and accumulated options plus virtual and onsite constraints.</li>
  <li><strong>Read the rules:</strong> Record dates, timezone, cut-off, activities, evidence, fees, refunds, rewards, and support.</li>
  <li><strong>Choose with margin:</strong> Prefer the option that remains workable when an ordinary disruption occurs.</li>
</ol>
<p>If you cannot complete the worksheet because the event page is unclear, ask through the organizer's published route or <a href="/contact">Contact HelloRun</a> for platform-related assistance before registering.</p>

<h2>Pre-registration checklist</h2>
<ul>
  <li>Confirm the organizer, event format, participation mode, and selected category.</li>
  <li>Separate registration close, activity window, submission deadline, results, and fulfilment dates.</li>
  <li>Check the timezone and whether dates shown in an old poster still match the structured page.</li>
  <li>Review fees, external payment instructions, delivery charges, cancellation terms, and the applicable refund policy.</li>
  <li>Check walking, treadmill, route, pausing, minimum distance, splitting, and accessibility rules.</li>
  <li>Confirm evidence source, required fields, corrections, leaderboard basis, and recognition conditions.</li>
  <li>Identify the support route and save important rules that may be needed later.</li>
</ul>
<p>HelloRun can support free or paid registration. For a paid event, the organizer may publish external payment instructions and review an uploaded payment receipt; HelloRun does not directly process the transfer. Payment confirmation is separate from activity-proof approval. Read the current event page and applicable policy rather than assuming listing guarantees legitimacy, refund, reward, or delivery.</p>

<h2>Preparation checklist after choosing</h2>
<ul>
  <li>Build from manageable activity and allow recovery rather than doubling missed sessions.</li>
  <li>Practise the intended effort or walk-run strategy with familiar shoes and clothing.</li>
  <li>Test the phone, watch, treadmill, or connected app before the event attempt.</li>
  <li>Plan a suitable route or venue, weather alternative, check-in, and safe way to stop.</li>
  <li>Review map privacy, home-location exposure, notifications, and unnecessary health fields.</li>
  <li>For accumulated goals, plan individual activities with spare days before the deadline.</li>
  <li>Keep original evidence and verify date, distance, unit, duration, activity type, and source.</li>
</ul>
<p>Use the <a href="/blog/running-safety-tips-early-morning-night-runs">running safety guide</a> for route, traffic, visibility, weather, privacy, and emergency planning. A deadline never requires continuing in unsafe conditions.</p>

<h2>Changing to a shorter distance or later event</h2>
<p>Stepping down is an adjustment, not a failed version of the original goal. New information can make a different distance more appropriate: missed preparation, illness, poor air quality, unsafe weather, route loss, unexpected work, caregiving, or a change in accessibility.</p>
<p>Do not assume that registration categories can be changed after payment or that evidence from one distance can be reassigned. Ask the organizer before completing the activity. If changes are unavailable, a later event may be the cleaner choice. Avoid completing a longer unsupported activity solely to protect a fee, streak, public promise, or deadline.</p>

<h2>Troubleshooting the choice</h2>
<h3>I can finish 5K once, but not consistently</h3>
<p>Choose based on the repeatable pattern around the result. Another 5K with a completion or pacing focus may be more suitable than moving immediately to 10K.</p>
<h3>The accumulated target looks easy when divided by days</h3>
<p>Add rest days, minimum-activity rules, weather, review time, and disruptions. A daily average hides whether the planned individual activities and recovery are practical.</p>
<h3>My friends chose a longer category</h3>
<p>You can participate socially without using the same target when the event allows separate categories. Compare meeting points, pace, route, and support rather than matching a number for appearance.</p>
<h3>The event calls 21K a half marathon</h3>
<p>Ask whether it means an event-specific rounded target or a certified 21.0975 km course. If qualification matters, verify with the organization that will accept the result.</p>
<h3>I registered before reading the rules</h3>
<p>Review the live event page immediately and contact the organizer about permitted changes. Do not alter evidence or combine activities to imitate a format the event does not allow.</p>

<h2>Frequently asked questions</h2>
<h3>Is 5K always the best first distance?</h3>
<p>No. It is a common first goal, but a shorter category, walking event, or accumulated challenge may fit better. Conversely, someone with an established base may reasonably begin with another distance. The choice is individual and event-dependent.</p>
<h3>Should I choose 10K as soon as I finish 5K?</h3>
<p>Not automatically. Consider whether the 5K came from consistent preparation, how recovery went, and whether a longer build fits your calendar. Improving the 5K experience is also a valid next goal.</p>
<h3>Is 21K the same as a half marathon?</h3>
<p>The standard half marathon is 21.0975 km. Some events use “21K” as a rounded category label. Check course measurement, certification, event rules, and the needs of any organization that must accept the result.</p>
<h3>Is an accumulated challenge easier than one long run?</h3>
<p>Not necessarily. It changes the demand from one continuous effort to repeated activities and a total target. The goal size, event window, minimum activity, recovery, evidence, and review queue determine how demanding it is.</p>
<h3>Can I walk?</h3>
<p>Walking can be a valid preparation and completion strategy, but the event decides whether Walk activities, mixed walk-run sessions, or walking within another activity type are accepted.</p>
<h3>Can I use a treadmill?</h3>
<p>Only when the event permits it and you can provide the requested evidence. Treadmill, watch, and app readings can differ; follow the event's correction and proof rules rather than editing values to force agreement.</p>
<h3>Will HelloRun approve my result automatically?</h3>
<p>Correct submission does not guarantee approval. Screenshot evidence may use OCR-assisted field entry, and supported Strava activities may be validated through the connected path. Depending on eligibility rules, some clean submissions may qualify for conditional approval; others require organizer or admin review. Pending is not approved.</p>
<h3>Will my result appear on a leaderboard?</h3>
<p>Only when the event has a configured leaderboard and the result meets its approved-result rules. Standard distance groups can rank approved time, while accumulated standings can rank approved distance. Event-specific standings are not certified timing or universal comparisons.</p>
<h3>Does every finisher receive a certificate or reward?</h3>
<p>No. Certificates, badges, medals, packages, and delivery are configured or fulfilled per event. Read the recognition conditions, deadlines, fees, and fulfilment terms before registration.</p>
<h3>Where can I learn the full virtual-run process?</h3>
<p>Start with <a href="/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers">What Is a Virtual Run?</a>, then review the <a href="/blog/how-leaderboards-work-virtual-running-events">leaderboard guide</a> if ranking influences the distance you choose. The event's live rules remain the final authority.</p>

<h2>Official and platform sources</h2>
<ul>
  <li><a href="https://worldathletics.org/competitions/world-athletics-road-running-championships/copenhagen26/races/free-training-programs">World Athletics: Copenhagen 26 training programmes</a></li>
  <li><a href="https://worldathletics.org/disciplines/road-running-event/half-marathon">World Athletics: Half marathon definition and preparation</a></li>
  <li><a href="https://worldathletics.org/news/performance/advice-runners-beginners">World Athletics: Advice for beginner runners</a></li>
  <li><a href="https://worldathletics.org/records/certified-roadevents">World Athletics: Certified road events</a></li>
  <li><a href="https://www.who.int/initiatives/behealthy/physical-activity">World Health Organization: Physical activity</a></li>
  <li><a href="https://www.cdc.gov/physicalactivity/basics/measuring/index.html">CDC: Measuring physical-activity intensity</a></li>
  <li><a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/">NHS: Couch to 5K</a></li>
  <li><a href="https://www.bhf.org.uk/how-you-can-help/events/running-training-schedules">British Heart Foundation: Running training schedules</a></li>
  <li><a href="https://www.rrca.org/covid-19-information-and-resources/">Road Runners Club of America: Virtual-event definition</a></li>
  <li><a href="/how-it-works">HelloRun: How It Works</a></li>
  <li><a href="/privacy">HelloRun Privacy Policy</a></li>
</ul>
<p>Guidance, platform behavior, and individual event rules can change. Recheck the live event page and source material when choosing and preparing for a distance.</p>
`;

const REQUIRED_HEADINGS = Object.freeze([
  'Choose your distance in one minute',
  'How this guide was prepared',
  'Understand what each label means',
  'At-a-glance comparison',
  'Start with your consistent base, not your best day',
  'Count the weeks and the real calendar',
  'Include recovery and life load in the decision',
  'Match the distance to the goal that matters',
  'When a 5K may fit',
  'When a 10K may fit',
  'When a 21K may fit',
  'When an accumulated-distance challenge may fit',
  'Virtual and onsite versions change the choice',
  'Five practical runner profiles',
  'Use a non-scored readiness self-audit',
  'Complete the decision worksheet',
  'Pre-registration checklist',
  'Preparation checklist after choosing',
  'Changing to a shorter distance or later event',
  'Troubleshooting the choice',
  'Frequently asked questions',
  'Official and platform sources'
]);

const REQUIRED_LINKS = Object.freeze([
  '/events',
  '/how-it-works',
  '/faq',
  '/contact',
  '/privacy',
  '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
  '/blog/how-to-prepare-for-your-first-virtual-run',
  '/blog/beginner-5k-training-plan-new-runners',
  '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
  '/blog/how-accumulated-distance-challenges-work',
  '/blog/best-apps-to-track-your-virtual-run',
  '/blog/what-counts-as-valid-run-proof',
  '/blog/how-to-submit-run-proof-correctly-hellorun',
  '/blog/running-safety-tips-early-morning-night-runs',
  '/blog/how-leaderboards-work-virtual-running-events',
  'worldathletics.org/competitions/world-athletics-road-running-championships/copenhagen26/races/free-training-programs',
  'worldathletics.org/disciplines/road-running-event/half-marathon',
  'worldathletics.org/news/performance/advice-runners-beginners',
  'worldathletics.org/records/certified-roadevents',
  'who.int/initiatives/behealthy/physical-activity',
  'cdc.gov/physicalactivity/basics/measuring/index.html',
  'nhs.uk/better-health/get-active/get-running-with-couch-to-5k',
  'bhf.org.uk/how-you-can-help/events/running-training-schedules',
  'rrca.org/covid-19-information-and-resources'
]);

function buildArticlePayload(existingPost = {}) {
  const contentHtml = sanitizeHtml(RAW_CONTENT_HTML);
  const contentText = htmlToPlainText(contentHtml);
  const coverImageUrl = String(existingPost.coverImageUrl || '').trim();
  const payload = {
    title: ARTICLE.title,
    excerpt: ARTICLE.excerpt,
    contentHtml,
    contentText,
    contentRaw: contentText,
    category: ARTICLE.category,
    customCategory: '',
    tags: [...ARTICLE.tags],
    readingTime: Math.max(1, Math.ceil(contentText.split(/\s+/).filter(Boolean).length / 180)),
    seoTitle: ARTICLE.seoTitle,
    seoDescription: ARTICLE.seoDescription,
    coverImageAlt: ARTICLE.coverImageAlt,
    ogImageUrl: coverImageUrl
  };

  validateArticlePayload(payload);
  return payload;
}

function validateArticlePayload(payload) {
  const errors = [];
  const text = String(payload.contentText || '');
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (ARTICLE.slug !== CANONICAL_SLUG) errors.push('canonical slug does not match');
  if (!payload.title || payload.title.length > 120) errors.push('title must be 1-120 characters');
  if (!payload.excerpt || payload.excerpt.length > 220) errors.push('excerpt must be 1-220 characters');
  if (!payload.contentHtml || payload.contentHtml.length > 50000) errors.push('contentHtml must be 1-50000 characters');
  if (!payload.contentText || payload.contentText.length > 50000) errors.push('contentText must be 1-50000 characters');
  if (payload.contentRaw !== payload.contentText) errors.push('contentRaw and contentText must match');
  if (wordCount < 3200) errors.push('article must contain at least 3200 substantive words');
  if (!Array.isArray(payload.tags) || payload.tags.length !== 8) errors.push('article must contain exactly 8 tags');
  if ((payload.tags || []).some((tag) => !tag || tag.length > 30)) errors.push('tags must be 1-30 characters');
  if (!payload.seoTitle || payload.seoTitle.length > 160) errors.push('seoTitle must be 1-160 characters');
  if (!payload.seoDescription || payload.seoDescription.length > 320) errors.push('seoDescription must be 1-320 characters');
  if (!payload.coverImageAlt || payload.coverImageAlt.length > 180) errors.push('coverImageAlt must be 1-180 characters');
  if (!payload.ogImageUrl) errors.push('existing cover image is required for ogImageUrl');
  if (/<h[12]>How to Choose Between a 5K, 10K, 21K, or Distance Challenge<\/h[12]>/i.test(payload.contentHtml)) errors.push('body must not repeat the page title');
  if (/<em>[^<]+<\/em>\s*\*/i.test(payload.contentHtml)) errors.push('body contains malformed emphasized text');
  if (/\b10\s*%\s*rule\b/i.test(text)) errors.push('article must not prescribe the 10% rule');
  if (/(?:this guide|this article|this plan|the plan|HelloRun|choosing (?:a )?(?:5K|10K|21K|challenge)) (?:will |guarantees? )(?:finish|complete|completion|safety)|prevents? injur/i.test(text)) errors.push('article must not guarantee completion, safety, or injury prevention');
  if (/21K (?:is|always means) (?:an )?(?:official|certified) half marathon|every 21K is certified/i.test(text)) errors.push('article must distinguish 21K from a certified half marathon');
  if (/accumulated (?:distance )?challenges? (?:are|is) always easier|always choose the longer|longer is (?:always )?better/i.test(text)) errors.push('article must not rank longer or accumulated formats universally');
  if (/all events accept|every event accepts|any app is accepted|treadmills? (?:are|is) always accepted/i.test(text)) errors.push('article must not claim universal event acceptance');
  if (/HelloRun (?:directly )?(?:processes|handles) (?:your |event )?(?:payment|funds)|pay (?:through|inside) HelloRun/i.test(text)) errors.push('article must not claim direct payment processing');
  if (/automatic (?:proof )?approval (?:is|will be) guaranteed|every submission is automatically approved/i.test(text)) errors.push('article must not guarantee automatic approval');
  if (!/reviewed in July 2026 using documented HelloRun/i.test(text)) errors.push('article must disclose methodology and date');
  if (!/standard half marathon as 21\.0975 kilometres/i.test(text)) errors.push('article must define the official half-marathon distance');
  if (!/Pending evidence is not an approved result/i.test(text)) errors.push('article must distinguish pending evidence');
  if (!/accumulated challenge[\s\S]{0,80}not automatically the easiest choice/i.test(text)) errors.push('article must explain accumulated challenge tradeoffs');
  if (!/does not directly process the transfer/i.test(text)) errors.push('article must accurately describe external payment processing');

  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`<h2>${heading}</h2>`)) errors.push(`missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing required link: ${link}`);
  }

  if (errors.length) throw new Error(`Invalid distance choice payload: ${errors.join('; ')}`);
  return true;
}

module.exports = {
  ARTICLE,
  CANONICAL_SLUG,
  LEGACY_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
};
