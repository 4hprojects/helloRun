'use strict';

// Saving cookie preferences.
//
// Found by clicking the button in a real browser: "Unable to save cookie preferences."
// The banner's two submit buttons are both `name="action"`, and a form control named
// `action` shadows `HTMLFormElement.action` — so `form.action` returned a RadioNodeList,
// the fetch posted to "/[object RadioNodeList]", and every save 404'd. On every page of
// the site, for every visitor, the banner could never be dismissed.
//
// Nothing server-side was wrong, which is why no existing test caught it: the route, the
// CSRF token and the markup were all correct. Only the browser could see it.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const script = read('src/public/js/cookie-preferences.js');
const markup = read('src/views/partials/cookie-preferences.ejs');

test('the form posts to its action attribute, not its shadowed property', () => {
  assert.match(script, /fetch\(form\.getAttribute\('action'\)/);
  assert.doesNotMatch(script, /fetch\(form\.action/);
  assert.match(script, /a form control named `action` shadows HTMLFormElement\.action/);
});

test('the buttons that cause the shadowing are still there, deliberately', () => {
  // They carry which choice was made, so the fix is on the read side, not by renaming
  // them — renaming would change what the server receives.
  const named = markup.match(/name="action"/g) || [];
  assert.ok(named.length >= 2, 'both submit buttons still submit their choice');
  assert.match(markup, /value="reject_optional"/);
  assert.match(markup, /value="accept_all"/);
  // And the action attribute the fix now reads must actually be present.
  assert.match(markup, /action="\/cookie-preferences"/);
});

test('the endpoint it posts to exists and is CSRF protected', () => {
  const routes = read('src/routes/pageRoutes.js');
  assert.match(routes, /router\.post\('\/cookie-preferences', requireCsrfProtection/);
  assert.match(script, /'x-csrf-token'/);
});
