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

test('public desktop navigation exposes persistent labels and retains mobile rules', () => {
  const nav = read('src/views/layouts/nav.ejs');
  const css = read('src/public/css/style.css');

  for (const href of ['/', '/events', '/blog', '/leaderboard']) {
    assert.ok(nav.includes(`navClass('${href}', 'nav-primary-link')`));
  }
  assert.match(css, /\.nav-primary-link \.nav-tooltip[\s\S]*position: static/);
  assert.match(css, /\.nav-icon-link:not\(\.nav-primary-link\):hover \.nav-tooltip/);
  assert.match(css, /@media \(min-width: 901px\)[\s\S]*\.nav-primary-link::after[\s\S]*height: 3px/);
  assert.match(css, /\.nav-primary-link\[aria-current="page"\][\s\S]*background: transparent/);
  assert.match(css, /\.nav-primary-link\[aria-current="page"\]::after[\s\S]*opacity: 1;[\s\S]*transform: scaleX\(1\)/);
  assert.match(css, /@media \(min-width: 901px\) and \(hover: hover\) and \(pointer: fine\)[\s\S]*\.nav-primary-link:hover[\s\S]*background: transparent;[\s\S]*transform: translateY\(-1px\)/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.nav-links\.active[\s\S]*display: flex/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.nav-primary-link:hover[\s\S]*transform: none/);

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
