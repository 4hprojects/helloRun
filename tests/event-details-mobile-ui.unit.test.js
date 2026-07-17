const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const viewPath = path.join(ROOT, 'src/views/pages/event-details.ejs');
const viewSource = fs.readFileSync(viewPath, 'utf8');
const cssSource = fs.readFileSync(path.join(ROOT, 'src/public/css/event-details.css'), 'utf8');

test('event details template compiles and exposes task-first section navigation', () => {
  assert.doesNotThrow(() => ejs.compile(viewSource, { filename: viewPath }));
  assert.match(viewSource, /<details class="event-section-jump">/);
  assert.match(viewSource, /<summary>Jump to section<\/summary>/);
  assert.match(viewSource, /class="event-section-nav" aria-label="Event page sections"/);
  assert.match(viewSource, /href="#event-how-it-works">Steps<\/a>/);
  assert.match(viewSource, /href="#event-registration-options">Registration<\/a>/);
  assert.match(viewSource, /href="#event-full-details">Full details<\/a>/);
  assert.doesNotMatch(viewSource, /href="#event-summary">Summary<\/a>/);
  assert.match(viewSource, /id="event-how-it-works"/);
  assert.match(viewSource, /id="event-submission-rules"/);
  assert.match(viewSource, /id="event-rewards"/);
});

test('section disclosure is mobile-only, touch-friendly, and closes after selection', () => {
  assert.match(cssSource, /\.event-section-jump\s*\{\s*display:\s*none/);
  assert.match(cssSource, /@media \(max-width: 720px\)[\s\S]*\.event-section-jump\s*\{[\s\S]*display:\s*block/);
  assert.match(cssSource, /\.event-section-jump summary[\s\S]*min-height:\s*44px/);
  assert.match(cssSource, /\.event-section-nav[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(cssSource, /@media \(max-width: 340px\)[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(viewSource, /jump\.open = false/);
});

test('hero description and summary card expose clear mobile content hierarchy', () => {
  assert.match(viewSource, /class="event-lead-label">About this event/);
  assert.match(viewSource, /details\.descriptionText \|\| details\.description/);
  assert.match(viewSource, /event-hero-panel-group event-hero-panel-price/);
  assert.match(viewSource, /event-hero-panel-group event-hero-panel-registration/);
  assert.match(viewSource, /class="event-panel-status"/);
});

test('mobile registration bar is contextual and only renders for an actionable public event', () => {
  assert.match(viewSource, /const pagePrimaryAction = runnerState/);
  assert.match(viewSource, /const showMobileStickyCta = Boolean\(!isPreviewMode && pagePrimaryAction\)/);
  assert.match(viewSource, /showMobileStickyCta \? ' has-event-mobile-sticky-cta' : ''/);
  assert.match(viewSource, /if \(showMobileStickyCta\)/);
  assert.match(viewSource, /class="event-mobile-sticky-copy"/);
  assert.match(viewSource, /details\.registrationState\?\.label/);
  assert.match(viewSource, /details\.pricing\?\.amountLabel/);
  assert.match(viewSource, /class="event-details-body[\s\S]*has-runner-mobile-nav/);
});

test('mobile styles coordinate runner navigation and prevent duplicate calls to action', () => {
  assert.match(cssSource, /\.event-details-body\.has-runner-mobile-nav \.event-mobile-sticky-cta[\s\S]*bottom:\s*calc\(56px \+ env\(safe-area-inset-bottom/);
  assert.match(cssSource, /\.event-details-body\.has-event-mobile-sticky-cta \.global-back-to-top[\s\S]*bottom:\s*calc\(78px \+ env\(safe-area-inset-bottom/);
  assert.match(cssSource, /\.event-details-body\.has-event-mobile-sticky-cta\.has-runner-mobile-nav \.global-back-to-top[\s\S]*bottom:\s*calc\(134px \+ env\(safe-area-inset-bottom/);
  assert.match(cssSource, /\.event-side-panel \.event-register-card\s*\{\s*display:\s*none/);
  assert.match(cssSource, /\.event-final-cta-row\s*\{\s*display:\s*none/);
  assert.match(cssSource, /\.event-mobile-sticky-cta \.btn[\s\S]*min-height:\s*48px/);
});

test('desktop layout lifts the right panel into the shell top rows', () => {
  assert.match(cssSource, /\.event-details-shell\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) 330px/);
  assert.match(cssSource, /\.event-main-layout\s*\{\s*display:\s*contents/);
  assert.match(cssSource, /\.event-side-panel\s*\{[\s\S]*grid-column:\s*2[\s\S]*grid-row:\s*1 \/ span 6/);
  assert.match(cssSource, /@media \(max-width: 980px\)[\s\S]*\.event-details-shell\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(cssSource, /@media \(max-width: 980px\)[\s\S]*\.event-side-panel,[\s\S]*\.event-final-cta-row\s*\{[\s\S]*grid-column:\s*auto[\s\S]*grid-row:\s*auto/);
  assert.match(cssSource, /@media \(max-width: 980px\)[\s\S]*\.event-main-layout\s*\{[\s\S]*display:\s*grid/);
});

test('mobile navigation and highlight cards use the requested paired rows', () => {
  assert.match(viewSource, /event-nav-back/);
  assert.match(viewSource, /event-nav-registrations/);
  assert.match(cssSource, /\.event-nav-row[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(cssSource, /\.event-stats-strip \.event-stat-duration[\s\S]*order:\s*2/);
  assert.match(cssSource, /\.event-stats-strip \.event-stat-detail[\s\S]*grid-column:\s*1 \/ -1/);
});

test('registration options highlight card is omitted as redundant', () => {
  assert.match(viewSource, /filter\(\(stat\) => stat\.label !== 'Registration Options'\)/);
  assert.match(viewSource, /event-stat-signups/);
  assert.match(viewSource, /event-stat-duration/);
});

test('how-this-event-works becomes a compact mobile step list', () => {
  assert.match(cssSource, /#event-how-it-works \.event-mechanics-grid article[\s\S]*grid-template-columns:\s*28px minmax\(0, 1fr\)/);
  assert.match(cssSource, /#event-how-it-works \.event-mechanics-grid article[\s\S]*border-bottom:\s*1px solid/);
  assert.match(cssSource, /#event-how-it-works \.event-mechanics-grid span[\s\S]*width:\s*26px/);
  assert.match(cssSource, /#event-how-it-works \.event-mechanics-grid p[\s\S]*font-size:\s*0\.82rem/);
});

test('how-this-event-works is also compact on desktop', () => {
  assert.match(cssSource, /#event-how-it-works\s*\{[\s\S]*padding:\s*20px/);
  assert.match(cssSource, /#event-how-it-works \.event-mechanics-grid article[\s\S]*grid-template-columns:\s*28px minmax\(0, 1fr\)[\s\S]*padding:\s*12px/);
  assert.match(cssSource, /#event-how-it-works \.event-mechanics-grid span[\s\S]*grid-row:\s*1 \/ 3/);
});

test('category completion goals use a compact non-duplicative summary', () => {
  assert.match(viewSource, /event-goal-section-categories/);
  assert.match(viewSource, /Your category sets your finish target/);
  assert.match(viewSource, /class="event-category-goal-grid"/);
  assert.match(viewSource, /option\.name/);
  assert.match(viewSource, /option\.distanceKmLabel/);
  assert.match(viewSource, /Only approved submissions count toward your finish target/);
  assert.doesNotMatch(viewSource, /Category goals:<\/strong>/);
  assert.match(viewSource, /<div class="event-goal-panel">[\s\S]*<span>Completion goal<\/span>/);
});

test('category goal grid is compact and safe at narrow widths', () => {
  assert.match(cssSource, /\.event-category-goal-grid[\s\S]*grid-template-columns:\s*repeat\(auto-fit, minmax\(150px, 1fr\)\)/);
  assert.match(cssSource, /@media \(max-width: 720px\)[\s\S]*\.event-category-goal-grid[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(cssSource, /@media \(max-width: 340px\)[\s\S]*\.event-category-goal-grid[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(cssSource, /\.event-category-goal-grid span,[\s\S]*overflow-wrap:\s*anywhere/);
});

test('race categories are deduplicated unless they contain additional runner details', () => {
  assert.match(viewSource, /const hasDetailedRaceCategories/);
  assert.match(viewSource, /category\.slotsLabel/);
  assert.match(viewSource, /category\.cutoffTime/);
  assert.match(viewSource, /category\.ageGroup/);
  assert.match(viewSource, /category\.rewardsDescription/);
  assert.match(viewSource, /!details\.hasCategorySpecificGoals \|\| hasDetailedRaceCategories/);
  assert.match(viewSource, /if \(showRaceCategoriesSection\)/);
  assert.match(viewSource, /details\.hasCategorySpecificGoals \? 'Category Details' : 'Race Categories'/);
});

test('recap, submission rules, and organizer details use compact semantic patterns', () => {
  assert.match(viewSource, /class="event-recap-body"/);
  assert.match(viewSource, /class="event-recap-list"/);
  assert.match(viewSource, /<dl class="event-rule-list">/);
  assert.match(viewSource, /<dt>Event window<\/dt>/);
  assert.match(viewSource, /<dd><%= details\.virtualRules/);
  assert.match(viewSource, /<details class="event-section event-details-description" id="event-full-details">/);
  assert.match(viewSource, /Additional organizer details/);
  assert.match(viewSource, /structured sections above are the current event settings/);
  assert.match(viewSource, /class="event-rich-details-shell"/);
});

test('accumulated challenges prioritize goal choice and personalized progress', () => {
  assert.match(viewSource, /class="event-challenge-decision/);
  assert.match(viewSource, /Pick a goal that fits your month/);
  assert.match(viewSource, /class="event-challenge-goal-grid"/);
  assert.match(viewSource, /option\.compactName \|\| option\.name/);
  assert.doesNotMatch(viewSource, /Accumulated distance · choose during registration/);
  assert.match(viewSource, /Choose a goal &amp; register/);
  assert.match(viewSource, /You’ll select your category during registration/);
  assert.match(viewSource, /runnerState\.approvedDistanceLabel/);
  assert.match(viewSource, /runnerState\.pendingDistanceLabel/);
  assert.match(viewSource, /role="progressbar"/);
  assert.match(viewSource, /data-run-proof-surface="event-detail"/);
  assert.match(viewSource, /details\.secondaryCtas\?\.\[0\]/);
  assert.match(viewSource, /const showEventSidebar = Boolean/);
  assert.match(viewSource, /event-details-shell<%= showEventSidebar \? '' : ' event-details-shell-wide' %>/);
  assert.match(viewSource, /if \(showEventSidebar\) \{ %><aside class="event-side-panel">/);
  assert.match(cssSource, /\.event-details-shell-wide\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(cssSource, /\.event-challenge-goal-grid[\s\S]*repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(cssSource, /\.event-details-shell:not\(\.event-details-shell-wide\) \.event-challenge-goal-grid[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(cssSource, /@media \(max-width: 980px\)[\s\S]*\.event-challenge-goal-grid[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(cssSource, /@media \(max-width: 720px\)[\s\S]*\.event-challenge-goal-grid[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(cssSource, /@media \(max-width: 720px\)[\s\S]*\.event-challenge-goal-grid article[\s\S]*grid-template-columns:\s*68px minmax\(0, 1fr\)/);
  assert.match(cssSource, /@media \(max-width: 720px\)[\s\S]*\.event-challenge-decision-action[\s\S]*display:\s*none/);
});

test('recap, rules, and full event details compact safely on mobile', () => {
  assert.match(cssSource, /\.event-recap-list[\s\S]*grid-template-columns:\s*repeat\(auto-fit, minmax\(190px, 1fr\)\)/);
  assert.match(cssSource, /\.event-rule-list > div[\s\S]*border:\s*1px solid/);
  assert.match(cssSource, /@media \(max-width: 720px\)[\s\S]*\.event-rule-list > div[\s\S]*grid-template-columns:\s*minmax\(105px, 0\.42fr\) minmax\(0, 1fr\)/);
  assert.match(cssSource, /\.event-rich-details-shell[\s\S]*background:\s*#fbfcfe/);
  assert.match(cssSource, /\.event-rich-details h1[\s\S]*font-size:\s*1\.3rem/);
});

test('decision-support section labels align beside their icons', () => {
  assert.match(cssSource, /:is\([\s\S]*#event-how-it-works,[\s\S]*#event-submission-rules,[\s\S]*#event-rewards,[\s\S]*\.event-challenge-poster-section[\s\S]*\) \.event-section-heading > div[\s\S]*text-align:\s*left/);
  assert.match(cssSource, /\) \.event-section-heading h2[\s\S]*padding-bottom:\s*0;[\s\S]*text-align:\s*left/);
  assert.match(cssSource, /\) \.event-section-heading h2::after[\s\S]*display:\s*none/);
});

test('accumulated guest journey ends with a desktop registration prompt', () => {
  assert.match(viewSource, /details\.isAccumulatedChallenge && !runnerState && !isPreviewMode/);
  assert.match(viewSource, /class="event-challenge-closing-cta"/);
  assert.match(viewSource, /Register for this challenge/);
  assert.match(cssSource, /\.event-challenge-closing-cta\s*\{[\s\S]*display:\s*flex/);
  assert.match(cssSource, /@media \(max-width: 720px\)[\s\S]*\.event-challenge-closing-cta\s*\{[\s\S]*display:\s*none/);
});

test('contact organiser card has clear hierarchy, matching validation, and privacy context', () => {
  assert.match(viewSource, /class="event-side-card event-contact-card"/);
  assert.match(viewSource, /Ask a question about this event/);
  assert.match(viewSource, /minlength="10" maxlength="1000" required/);
  assert.match(viewSource, /aria-describedby="contactMessageHelp"/);
  assert.match(viewSource, /data-contact-message-count/);
  assert.match(viewSource, /Your email is shared only so the organiser can reply directly/);
  assert.match(viewSource, /message\.addEventListener\('input', updateCount\)/);
});

test('contact organiser controls are compact, touch-friendly, and focus-visible', () => {
  assert.match(cssSource, /\.contact-organiser-input[\s\S]*min-height:\s*44px/);
  assert.match(cssSource, /\.contact-organiser-input:focus-visible[\s\S]*outline:\s*3px solid/);
  assert.match(cssSource, /\.event-contact-card \.btn[\s\S]*min-height:\s*44px/);
  assert.match(cssSource, /@media \(max-width: 720px\)[\s\S]*\.event-contact-card[\s\S]*padding:\s*14px/);
});

test('contact organiser confirmation previews the message and protects repeated sends', () => {
  assert.match(viewSource, /<dialog class="event-contact-confirm-dialog"/);
  assert.match(viewSource, /data-contact-preview-event/);
  assert.match(viewSource, /data-contact-preview-organiser/);
  assert.match(viewSource, /data-contact-preview-subject/);
  assert.match(viewSource, /data-contact-preview-message/);
  assert.match(viewSource, /Go back/);
  assert.match(viewSource, /data-contact-confirm-send>Send message/);
  assert.match(viewSource, /form\.dataset\.contactConfirmed = 'true'/);
  assert.match(viewSource, /form\.setAttribute\('aria-busy', 'true'\)/);
  assert.match(viewSource, /dialog\.showModal\(\);[\s\S]*backButton\.focus\(\)/);
  assert.match(viewSource, /data-contact-cooldown-until/);
  assert.match(viewSource, /role="status" aria-live="polite"/);
  assert.match(cssSource, /\.event-contact-confirm-actions \.btn[\s\S]*min-height:\s*44px/);
  assert.match(cssSource, /\.event-contact-confirm-dialog::backdrop/);
});

test('event detail mobile resilience includes narrow tables, focus handling, and reduced motion', () => {
  assert.match(cssSource, /\.event-rich-details table[\s\S]*overflow-x:\s*auto/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(viewSource, /function keepFocusInside\(event\)/);
  assert.match(viewSource, /lastFocusedElement\.focus\(\)/);
  assert.match(viewSource, /event\.key === 'Escape'/);
});
