'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const motionCssFiles = [
  'src/public/css/style.css',
  'src/public/css/design-system.css',
  'src/public/css/helloRun.css',
  'src/public/css/events.css',
  'src/public/css/leaderboard.css',
  'src/public/css/event-register.css',
  'src/public/css/login.css',
  'src/public/css/signup.css',
  'src/public/css/run-proof-modal.css',
  'src/public/css/runner-dashboard.css',
  'src/public/css/event-details.css'
];

test('shared motion contract uses named durations and explicit properties', () => {
  const designSystem = read('src/public/css/design-system.css');
  for (const token of [
    '--hr-motion-fast: 120ms',
    '--hr-motion-state: 180ms',
    '--hr-motion-panel: 240ms',
    '--hr-ease-out:',
    '--hr-ease-in:'
  ]) {
    assert.match(designSystem, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const file of motionCssFiles) {
    assert.doesNotMatch(read(file), /transition(?:-property)?:\s*all\b/, `${file} must not transition all properties`);
  }
});

test('navigation motion preserves progressive enhancement and reduced motion', () => {
  const css = read('src/public/css/style.css');
  const script = read('src/public/js/main.js');

  assert.match(css, /\.nav-links\[data-nav-ready\][^{]*\{\s*display: flex/);
  assert.match(css, /\.nav-account-panel\s*\{[\s\S]*?transform-origin: top right/);
  assert.match(css, /\.nav-account:not\(\[data-account-ready\]\) \.nav-account-panel/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(script, /navLinks\.dataset\.navReady = '1'/);
  assert.match(script, /menuToggle\.setAttribute\('aria-expanded'/);
});

test('interactive surfaces expose restrained press and state feedback', () => {
  for (const file of ['helloRun.css', 'events.css', 'leaderboard.css', 'event-details.css']) {
    const css = read(`src/public/css/${file}`);
    assert.match(css, /scale\(0\.98\)/, `${file} must provide press feedback`);
  }
  assert.match(read('src/public/css/helloRun.css'), /:focus-within/);
  assert.match(read('src/public/css/events.css'), /:focus-within/);
  assert.match(read('src/public/css/leaderboard.css'), /prefers-reduced-motion: reduce/);
});

test('auth and registration validation associate errors and focus the first invalid field', () => {
  const login = read('src/views/auth/login.ejs');
  const signup = read('src/views/auth/signup.ejs');
  const registration = read('src/public/js/event-register.js');

  for (const source of [login, signup, registration]) {
    assert.match(source, /aria-invalid/);
    assert.match(source, /aria-describedby/);
    assert.match(source, /\.focus\(/);
  }
  assert.match(signup, /prefers-reduced-motion: reduce/);
  assert.match(registration, /registration-motion-invalid/);
  assert.match(registration, /behavior: reducedMotion \? 'auto' : 'smooth'/);
});

test('proof modal motion follows existing phases and keeps success server-confirmed', () => {
  const script = read('src/public/js/run-proof-modal.js');
  const css = read('src/public/css/run-proof-modal.css');

  for (const phase of ['date', 'proof', 'ocr_processing', 'review', 'confirmation', 'submitting', 'success', 'recoverable_error']) {
    assert.match(script, new RegExp(`['"]${phase}['"]`));
  }
  assert.match(script, /dialog\.dataset\.flowPhase = phase/);
  assert.match(script, /if \(state\.isSubmitting\) return/);
  assert.match(script, /response\.ok && payload\.success === true \? 'success' : 'error'/);
  assert.match(script, /setAttribute\('aria-busy', 'true'\)/);
  assert.match(css, /\[data-flow-phase="submitting"\]/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('dashboard refresh marks busy state, skips unchanged markup, and restores scroll', () => {
  const script = read('src/public/js/runner-dashboard.js');
  const css = read('src/public/css/runner-dashboard.css');

  assert.match(script, /page\.setAttribute\('aria-busy', 'true'\)/);
  assert.match(script, /classList\.add\('is-loading'\)/);
  assert.match(script, /currentRoot\.innerHTML === nextRoot\.innerHTML/);
  assert.match(script, /classList\.add\('is-entering'\)/);
  assert.match(script, /window\.scrollTo\(scrollX, scrollY\)/);
  assert.match(css, /\[data-dashboard-fragment\]\.is-loading/);
  assert.match(css, /\[data-dashboard-fragment\]\.is-entering/);
});
