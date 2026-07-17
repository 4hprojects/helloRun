const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const viewPath = path.join(ROOT, 'src/views/pages/about.ejs');
const viewSource = fs.readFileSync(viewPath, 'utf8');
const cssSource = fs.readFileSync(path.join(ROOT, 'src/public/css/about.css'), 'utf8');
const { buildAboutActions } = require('../src/controllers/page/home.controller');

test('about template compiles and follows the runner-first hierarchy', () => {
  assert.doesNotThrow(() => ejs.compile(viewSource, { filename: viewPath }));

  const sections = [
    'about-hero',
    'about-trust-strip',
    'about-runner-journey',
    'about-accountability',
    'about-organizer-path',
    'about-operator',
    'about-current-events',
    'about-final-cta'
  ];
  sections.forEach((section) => assert.match(viewSource, new RegExp(`class="[^"]*${section}`)));

  for (let index = 0; index < sections.length - 1; index += 1) {
    assert.ok(viewSource.indexOf(sections[index]) < viewSource.indexOf(sections[index + 1]), `${sections[index]} should precede ${sections[index + 1]}`);
  }
});

test('about hero and final prompt prioritize event discovery without repeated account prompts', () => {
  assert.match(viewSource, /A clearer way to join, prove, and celebrate every run\./);
  assert.match(viewSource, /aboutActions\.primary/);
  assert.match(viewSource, /aboutActions\.account/);
  assert.match(viewSource, /aboutActions\.organizer/);
  assert.match(viewSource, /Find an event that fits the way you run\./);
  assert.doesNotMatch(viewSource, /Create Account/);
});

test('runner journey is four steps with all supported event formats', () => {
  for (const heading of ['Discover and register', 'Complete the activity', 'Submit accepted proof', 'Receive reviewed recognition']) {
    assert.match(viewSource, new RegExp(heading));
  }
  for (const format of ['Virtual runs', 'On-site races', 'Hybrid events', 'Accumulated-distance challenges', 'Community events']) {
    assert.match(viewSource, new RegExp(format));
  }
  assert.match(cssSource, /\.about-steps\s*\{[\s\S]*grid-template-columns:\s*repeat\(4,/);
  assert.match(cssSource, /@media \(max-width: 980px\)[\s\S]*\.about-steps[\s\S]*repeat\(2,/);
  assert.match(cssSource, /@media \(max-width: 760px\)[\s\S]*\.about-steps\s*\{[\s\S]*grid-template-columns:\s*1fr/);
});

test('trust content preserves review, privacy, ownership, and recognition boundaries', () => {
  assert.match(viewSource, /Why submissions and leaderboards are reviewed/);
  assert.match(viewSource, /Data privacy and proof handling/);
  assert.match(viewSource, /href="\/privacy"/);
  assert.match(viewSource, /Official HelloRun Event/);
  assert.match(viewSource, /Organiser-Managed Event/);
  assert.match(viewSource, /do not replace official timing, government records, accreditation, or third-party certification/);
});

test('operator block retains accountable public identity and contact details', () => {
  assert.match(viewSource, /Henson M\. Sagorsor/);
  assert.match(viewSource, /4HProjects/);
  assert.match(viewSource, /Benguet, Philippines/);
  assert.match(viewSource, /href="\/contact"/);
});

test('about actions adapt to guest, runner, organizer, and admin states', () => {
  assert.deepEqual(buildAboutActions({}).account, { label: 'How It Works', href: '/how-it-works', icon: 'route' });
  assert.deepEqual(buildAboutActions({ isAuthenticated: true }).account, { label: 'My Registrations', href: '/my-registrations', icon: 'clipboard-list' });
  assert.deepEqual(buildAboutActions({ isAuthenticated: true, isOrganizer: true }).account, { label: 'Organizer Dashboard', href: '/organizer/dashboard', icon: 'layout-dashboard' });
  assert.deepEqual(buildAboutActions({ isAuthenticated: true, isAdmin: true }).account, { label: 'Admin Dashboard', href: '/admin/dashboard', icon: 'shield-check' });
  assert.equal(buildAboutActions({ isOrganizer: true }).organizer.label, 'Manage Your Events');
});

test('current events retain safe images, clear metadata, and a simple empty state', () => {
  assert.match(viewSource, /currentEvents && currentEvents\.length/);
  assert.match(viewSource, /loading="lazy"/);
  assert.match(viewSource, /onerror="this\.onerror=null;this\.src=/);
  assert.match(viewSource, /event\.displayState\?\.label/);
  assert.match(viewSource, /class="about-event-distance"/);
  assert.match(viewSource, /No published events are available right now/);
  assert.match(cssSource, /\.about-event-grid\s*\{[\s\S]*repeat\(3,/);
  assert.match(cssSource, /\.about-event-distance\s*\{[\s\S]*-webkit-line-clamp:\s*2/);
});

test('about page exposes accessible targets, focus, zoom-safe responsiveness, and reduced motion', () => {
  assert.match(viewSource, /aria-labelledby="aboutHeroTitle"/);
  assert.match(viewSource, /aria-label="Why runners use HelloRun"/);
  assert.match(cssSource, /min-height:\s*44px/);
  assert.match(cssSource, /:focus-visible/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(cssSource, /overflow-x:\s*clip/);
});
