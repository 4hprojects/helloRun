'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('homepage hero presents the approved runner value proposition and CTAs', () => {
  const view = read('src/views/pages/home.ejs');

  assert.match(view, /Run anywhere\. <span class="highlight">Track every finish\.<\/span>/);
  assert.match(view, /submit your activity from your preferred tracking app/);
  assert.match(view, /keep your progress, results, rankings, and certificates in one place/);
  assert.match(view, /href="\/events" class="btn btn-primary">View Events/);
  assert.match(view, /href="\/signup" class="btn btn-outline">Sign Up Free/);
  assert.doesNotMatch(view, /hero-audience-paths/);
  assert.match(view, /href="\/signup\?role=runner" class="audience-action">Start Running/);
  assert.match(view, /href="\/signup\?role=organiser" class="audience-action">Create Events/);
});

test('homepage provides skip navigation and an addressable main landmark', () => {
  const view = read('src/views/pages/home.ejs');
  const css = read('src/public/css/helloRun.css');

  assert.match(view, /href="#main-content">Skip to main content/);
  assert.match(view, /<main class="home" id="main-content" tabindex="-1">/);
  assert.match(css, /\.home-skip-link:focus[\s\S]*transform: translateY\(0\)/);
});

test('returning runners receive a low-emphasis registration shortcut', () => {
  const view = read('src/views/pages/home.ejs');
  const css = read('src/public/css/helloRun.css');

  assert.match(view, /class="hero-returning-user"/);
  assert.match(view, /Already registered\?/);
  assert.match(view, /href="\/my-registrations">Review your event entries/);
  assert.doesNotMatch(view, /hero-inline-action/);
  assert.match(css, /\.hero-returning-user > a[\s\S]*min-height: 44px/);
  assert.match(css, /\.hero-returning-user > a:focus-visible/);
});

test('mobile hero actions and returning-runner shortcut are centered', () => {
  const css = read('src/public/css/helloRun.css');

  assert.match(css, /@media \(max-width: 480px\)[\s\S]*\.hero-cta-row\s*\{[\s\S]*justify-content: center/);
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*\.hero-cta-row \.btn\s*\{[\s\S]*justify-content: center;[\s\S]*text-align: center/);
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*\.hero-returning-user,[\s\S]*justify-items: center;[\s\S]*text-align: center/);
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*\.hero-returning-user > a\s*\{[\s\S]*justify-content: center;[\s\S]*text-align: center/);
});

test('shared navigation collapses inactive desktop labels and expands active, hover, and focus states', () => {
  const nav = read('src/views/layouts/nav.ejs');
  const css = read('src/public/css/style.css');
  const mobileCss = read('src/public/css/mobile-nav.css');

  for (const href of ['/', '/events', '/blog', '/leaderboard']) {
    assert.ok(nav.includes(`navClass('${href}', 'nav-primary-link')`));
  }
  assert.match(css, /@media \(min-width: 901px\)[\s\S]*\.nav \.nav-icon-link\s*\{[\s\S]*width: 44px;[\s\S]*min-width: 44px;[\s\S]*max-width: none;[\s\S]*overflow: hidden/);
  assert.match(css, /\.nav \.nav-icon-link > svg\s*\{[\s\S]*flex: 0 0 20px/);
  assert.match(css, /\.nav \.nav-icon-link \.nav-tooltip\s*\{[\s\S]*display: none;[\s\S]*opacity: 0/);
  assert.match(css, /\.nav \.nav-icon-link:hover,[\s\S]*\.nav \.nav-icon-link\[aria-current="page"\][\s\S]*width: auto;[\s\S]*min-width: max-content;[\s\S]*padding-right: 16px/);
  assert.match(css, /\.nav \.nav-icon-link:hover \.nav-tooltip,[\s\S]*\.nav \.nav-icon-link\[aria-current="page"\] \.nav-tooltip[\s\S]*display: inline-block;[\s\S]*width: auto;[\s\S]*opacity: 1/);
  assert.match(css, /animation: nav-label-reveal 0\.14s ease-out both/);
  assert.match(css, /@keyframes nav-label-reveal[\s\S]*opacity: 0\.25;[\s\S]*translateX\(-2px\)[\s\S]*opacity: 1/);
  assert.match(css, /\.nav \.nav-icon-link\[aria-current="page"\][\s\S]*background: #fff7ed;[\s\S]*border-color: #fed7aa/);
  assert.match(css, /\.nav-notification-badge\s*\{[\s\S]*left: 27px/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.nav-links\.active[\s\S]*display: flex/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.nav-tooltip\s*\{[\s\S]*opacity: 1;[\s\S]*visibility: visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.nav \.nav-icon-link,[\s\S]*transition: none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/);
  assert.match(mobileCss, /\.mobile-nav-tab > span\s*\{[\s\S]*display: none/);
  assert.match(mobileCss, /\.mobile-nav-tab\.is-active > span,[\s\S]*\.mobile-nav-tab-submit > span\s*\{[\s\S]*display: inline/);
  assert.match(mobileCss, /\.mobile-nav-tab\.is-active\s*\{[\s\S]*flex-grow: 1\.45;[\s\S]*flex-direction: row/);
  assert.match(css, /@media \(min-width: 901px\) and \(max-width: 1280px\)[\s\S]*\.nav \.nav-user \.nav-username[\s\S]*clip-path: inset\(50%\)/);
  assert.match(css, /@media \(min-width: 901px\) and \(max-width: 1050px\)[\s\S]*\.nav \.logo > span[\s\S]*clip-path: inset\(50%\)/);

  for (const currentPath of ['/', '/events', '/blog', '/leaderboard']) {
    const html = ejs.render(nav, {
      locals: {
        currentPath,
        renderRunProofModal: false,
        isAuthenticated: false,
        flash: null
      }
    });
    const selectedPrimaryLinks = html.match(/class="[^"]*nav-primary-link[^"]*"[^>]*aria-current="page"/g) || [];
    assert.equal(selectedPrimaryLinks.length, 1, `${currentPath} should select exactly one primary link`);
  }
});

test('runner, organizer, and admin mobile destinations retain accessible names and active-page semantics', () => {
  const nav = read('src/views/layouts/nav.ejs');
  const render = (locals) => ejs.render(nav, {
    locals: {
      currentPath: '/',
      renderRunProofModal: false,
      flash: null,
      csrfToken: 'test',
      runnerUnreadNotifications: 0,
      isAuthenticated: true,
      isAdmin: false,
      isOrganizer: false,
      isApprovedOrganizer: false,
      isFullAdmin: false,
      user: { firstName: 'Long Navigation Runner', avatarUrl: '' },
      ...locals
    }
  });

  const runner = render({ currentPath: '/runner/submissions' });
  assert.match(runner, /aria-label="Submission History" aria-current="page"/);
  assert.match(runner, /mobile-nav-tab is-active[^>]*aria-label="Submission History"[^>]*aria-current="page"/);

  const organizer = render({ currentPath: '/organizer/events/active-event', isApprovedOrganizer: true });
  assert.match(organizer, /aria-label="Organizer Events" aria-current="page"/);
  assert.match(organizer, /aria-label="Organizer Work Queue"/);

  const admin = render({ currentPath: '/admin/reviews', isAdmin: true, isFullAdmin: true });
  assert.match(admin, /aria-label="Admin Reviews" aria-current="page"/);
  assert.match(admin, /aria-label="Admin Communications"/);
});

test('login and logout controls use concise labels and distinct restrained interaction states', () => {
  const nav = read('src/views/layouts/nav.ejs');
  const css = read('src/public/css/style.css');

  assert.match(nav, /aria-label="Log in to HelloRun" title="Log in"/);
  assert.match(nav, /aria-label="Log out of HelloRun" title="Log out"/);
  assert.match(nav, /<span class="nav-tooltip">Log in<\/span>/);
  assert.match(nav, /<span class="nav-tooltip">Log out<\/span>/);
  assert.match(css, /\.nav \.nav-login-btn,[\s\S]*\.nav \.nav-user \.nav-logout-btn\s*\{[\s\S]*color: #475569;[\s\S]*border-color: #e2e8f0/);
  assert.match(css, /\.nav \.nav-user \.nav-logout-btn:hover,[\s\S]*color: #b42318;[\s\S]*background: #fff5f4;[\s\S]*border-color: #fecaca/);
  assert.match(css, /\.nav \.nav-login-btn\[aria-current="page"\][\s\S]*font-weight: 750/);
  assert.match(css, /\.nav \.nav-auth-buttons\s*\{[\s\S]*padding-left: 0\.6rem;[\s\S]*border-left-color: #edf1f5/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.nav \.nav-auth-buttons \.nav-login-btn,[\s\S]*min-height: 44px/);
});

test('signup role intent is allowlisted, preselected, and reflected in organizer messaging', () => {
  const route = read('src/routes/authRoutes.js');
  const signup = read('src/views/auth/signup.ejs');

  assert.match(route, /value === 'runner' \|\| value === 'organiser'/);
  assert.match(route, /options\.formData \|\| \(requestedRole \? \{ role: requestedRole \} : null\)/);
  assert.match(signup, /selectedSignupRole === 'organiser'/);
  assert.match(signup, /Create Your Organizer Account/);
  assert.match(signup, /Publish virtual and on-site events/);
});

test('homepage fixes background ownership and exposes carousel status accessibly', () => {
  const view = read('src/views/pages/home.ejs');
  const css = read('src/public/css/helloRun.css');
  const js = read('src/public/js/main.js');

  assert.match(css, /\.audience \{[\s\S]*background:[\s\S]*#f8fafc;/);
  assert.match(view, /aria-roledescription="carousel"/);
  assert.match(view, /data-carousel-status aria-live="polite" aria-atomic="true"/);
  assert.match(js, /Featured events page \$\{page \+ 1\} of \$\{pageCount\}/);
  assert.match(css, /\.featured-events-dot \{[\s\S]*width: 44px;[\s\S]*height: 44px/);
});

test('audience section presents distinct runner and organizer journey cards', () => {
  const view = read('src/views/pages/home.ejs');
  const css = read('src/public/css/helloRun.css');

  assert.match(view, /id="audienceTitle"/);
  assert.match(view, /Runner journey/);
  assert.match(view, /Organizer journey/);
  assert.match(view, /aria-label="Runner benefits"/);
  assert.match(view, /aria-label="Organizer benefits"/);
  assert.match(css, /\.audience-grid[\s\S]*grid-template-columns: repeat\(2[\s\S]*gap: 0;[\s\S]*overflow: hidden/);
  assert.match(css, /\.audience-card-runner[\s\S]*linear-gradient\(135deg, #7c2d12/);
  assert.match(css, /\.audience-card-organizer[\s\S]*background: #ffffff/);
  assert.match(css, /\.audience-card-runner \.audience-action[\s\S]*background: #ffffff/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.audience-grid[\s\S]*grid-template-columns: 1fr/);
});

test('closing CTA actions use equal dimensions and balanced treatments', () => {
  const view = read('src/views/pages/home.ejs');
  const css = read('src/public/css/helloRun.css');

  assert.match(view, /href="\/signup" class="cta-action cta-action-primary">Start running today/);
  assert.match(view, /href="\/events" class="cta-action cta-action-secondary">View Events/);
  assert.match(css, /\.cta-action \{[\s\S]*width: 230px;[\s\S]*min-height: 52px[\s\S]*white-space: nowrap/);
  assert.match(css, /\.cta-action-primary \{[\s\S]*background: #ffffff/);
  assert.match(css, /\.cta-action-secondary \{[\s\S]*background: rgba\(255, 255, 255, 0\.08\)/);
});
