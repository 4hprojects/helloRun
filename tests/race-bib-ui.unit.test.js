'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('organizer and runner bib templates compile and expose private actions', () => {
  for (const file of ['src/views/organizer/race-bib-design.ejs', 'src/views/pages/race-bib.ejs']) {
    assert.doesNotThrow(() => ejs.compile(read(file), { filename: path.join(root, file) }));
  }
  const runner = read('src/views/pages/race-bib.ejs');
  assert.match(runner, /Download PNG/);
  assert.match(runner, /Print PDF/);
  assert.match(runner, /does not contain your check-in QR or registration confirmation code/);
  assert.match(runner, /Show my name on my virtual bib/);
});

test('bib editor has desktop, tablet, and 375px-safe mobile layouts', () => {
  const css = read('src/public/css/race-bib-design.css');
  assert.match(css, /@media\(max-width:1024px\)/);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /\.bib-builder__grid\{grid-template-columns:1fr\}/);
  assert.match(css, /\.bib-field-grid[^}]*grid-template-columns:1fr/);
  assert.match(css, /min-height:48px/);
  assert.match(css, /\.runner-bib__canvas img\{display:block;width:100%;height:auto\}/);
});

test('personalized routes require auth or private guest token and disable caching', () => {
  const accountRoutes = read('src/routes/pageRoutes.js');
  const guestRoutes = read('src/routes/guest.routes.js');
  const controller = read('src/controllers/raceBib.controller.js');
  assert.match(accountRoutes, /bib', requireAuth, requireRunnerWorkspace/);
  assert.match(accountRoutes, /bib\/preferences', requireAuth, requireRunnerWorkspace, requireCsrfProtection/);
  assert.match(guestRoutes, /resolveToken\(req\.params\.token, 'manage'\)/);
  assert.match(controller, /'Cache-Control': 'private, no-store'/);
  assert.match(guestRoutes, /'Cache-Control': 'private, no-store'/);
});
