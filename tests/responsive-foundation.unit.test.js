'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderNav } = require('./helpers/render-nav');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const cssDir = path.join(root, 'src/public/css');
const cssFiles = fs.readdirSync(cssDir).filter((file) => file.endsWith('.css'));

function viewFiles(dir = path.join(root, 'src/views')) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return viewFiles(full);
    return entry.name.endsWith('.ejs') ? [full] : [];
  });
}

test('the page body no longer hides horizontal overflow', () => {
  const style = read('src/public/css/style.css');
  const bodyRule = style.match(/\nbody \{[^}]*\}/)[0];
  assert.doesNotMatch(bodyRule, /overflow-x/);
  for (const file of cssFiles) {
    assert.doesNotMatch(
      read(`src/public/css/${file}`),
      /(^|[\s,}])(html|body)\s*\{[^}]*overflow-x:\s*(hidden|clip)/,
      `${file} clips document overflow`
    );
  }
});

test('auto-fit/auto-fill grids never force a column wider than a phone', () => {
  const fixedMinimum = /repeat\(auto-(?:fit|fill),\s*minmax\(([0-9.]+)(px|rem),/g;
  for (const file of cssFiles) {
    for (const match of read(`src/public/css/${file}`).matchAll(fixedMinimum)) {
      const px = Number(match[1]) * (match[2] === 'rem' ? 16 : 1);
      assert.ok(px < 200, `${file}: ${match[0]} should use minmax(min(100%, ${match[1]}${match[2]}), …)`);
    }
  }
});

test('design system exposes shared tokens, layout primitives, and global reduced motion', () => {
  const css = read('src/public/css/design-system.css');
  for (const token of ['--hr-space-4', '--hr-gutter', '--hr-z-bottom-nav', '--hr-z-skip-link']) {
    assert.match(css, new RegExp(`${token}:`));
  }
  assert.match(css, /\.hr-container \{[^}]*width: min\(100% - 2 \* var\(--hr-gutter\), var\(--hr-container\)\)/);
  assert.match(css, /\.hr-grid \{[^}]*minmax\(min\(100%, var\(--hr-grid-min, 18rem\)\), 1fr\)/);
  assert.match(css, /\.hr-table-wrap \{[^}]*overflow-x: auto/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\*,/);
});

test('every page gets exactly one skip link with a resolvable target', () => {
  const html = renderNav({ currentPath: '/', isAuthenticated: false });
  assert.equal((html.match(/class="skip-link"/g) || []).length, 1);
  assert.match(html, /<a class="skip-link" href="#main-content">Skip to main content<\/a>/);
  assert.ok(html.indexOf('skip-link') < html.indexOf('<nav class="nav"'), 'skip link must come first');

  const main = read('src/public/js/main.js');
  assert.match(main, /function initSkipLinkTarget\(\)[\s\S]*document\.querySelector\('main'\)[\s\S]*target\.id = 'main-content'/);
  assert.match(main, /initSkipLinkTarget\(\);/);

  for (const file of viewFiles()) {
    if (path.basename(file) === 'nav.ejs') continue;
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /Skip to main content/, `${path.relative(root, file)} renders a second skip link`);
  }
});

test('every page with the shared nav loads main.js, which drives the mobile menu', () => {
  for (const file of viewFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    if (!source.includes("include('../layouts/nav')")) continue;
    assert.match(source, /<script src="\/js\/main\.js"[^>]*><\/script>/, `${path.relative(root, file)} has no mobile menu script`);
  }
});

test('guest sign-in actions stack inside the mobile menu instead of overflowing it', () => {
  const style = read('src/public/css/style.css');
  const unscoped = style.indexOf('\n.nav .nav-auth-buttons {');
  const mobileOverride = style.lastIndexOf('.nav .nav-auth-buttons {\n    display: contents;');
  assert.ok(unscoped > 0 && mobileOverride > unscoped, 'the ≤900px display: contents rule must come after the unscoped flex rule');
});

test('known narrow-width overflow fixes stay in place', () => {
  assert.match(read('src/public/css/cookie-policy.css'), /\.cookie-choice-form-actions\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(read('src/public/css/admin.css'), /\.admin-page-header \{[^}]*flex-wrap: wrap/);
  assert.match(read('src/public/css/organizer-registrants.css'), /\.organizer-roster-header \{[^}]*flex-wrap: wrap/);
  assert.match(read('src/public/css/events.css'), /\.events-intro-actions \.btn \{\s*width: auto;\s*max-width: none;/);
});
