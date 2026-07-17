'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('registration page uses task-first hierarchy with collapsed history', () => {
  const view = read('src/views/pages/my-registrations.ejs');

  assert.match(view, /<h1>My Registrations<\/h1>/);
  assert.match(view, /Next actions/);
  assert.match(view, /Active registrations/);
  assert.match(view, /<details class="my-reg-history"/);
  assert.doesNotMatch(view, /<details class="my-reg-history"[^>]*\sopen/);
  assert.match(view, /Browse Events/);
  assert.match(view, /Submission History/);
  assert.match(view, /registrationCounts\.underReview/);
  assert.match(view, /role="<%= message\.type === 'error' \? 'alert' : 'status' %>"/);
});

test('registration card preserves workflows while progressively disclosing detail', () => {
  const view = read('src/views/partials/my-registration-card.ejs');

  assert.match(view, /class="my-reg-card/);
  assert.match(view, /data-open-run-proof-modal/);
  assert.match(view, /data-registration-id/);
  assert.match(view, /role="progressbar"/);
  assert.match(view, /aria-valuetext=/);
  assert.match(view, /Payment receipts and activity proof are reviewed separately/);
  assert.match(view, /action="\/my-registrations\/<%= registration\._id %>\/payment-proof"/);
  assert.match(view, /name="_csrf"/);
  assert.match(view, /accept="\.jpg,\.jpeg,\.png,\.pdf,image\/jpeg,image\/png,application\/pdf"/);
  assert.match(view, /data-registration-form/);
  assert.match(view, /aria-live="polite"/);
  assert.match(view, /Registration details/);
  assert.match(view, /<strong>Emergency contact:<\/strong> <%= participant\.emergencyContactName \|\| 'N\/A' %>/);
  assert.doesNotMatch(view, /participant\.emergencyContactNumber/);
  assert.match(view, /Activity and result record/);
  assert.match(view, /Download certificate/);
});

test('page styling provides horizontal desktop cards and safe responsive stacking', () => {
  const css = read('src/public/css/my-registrations.css');

  assert.match(css, /\.my-reg-card-main\s*\{[^}]*grid-template-columns:\s*148px minmax\(0, 1fr\) 190px/s);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /overflow:\s*clip/);
  assert.doesNotMatch(css, /\.my-reg-card-(?:warning|rejected|submitted|approved|missed)\s*\{[^}]*border-left-color/);
  assert.doesNotMatch(css, /\.(?:my-reg-guidance|my-reg-rejection)\s*\{[^}]*border-left/);
});

test('page behavior opens disclosures, announces uploads, and protects changed forms', () => {
  const script = read('src/public/js/my-reg.js');

  assert.match(script, /data-open-registration-details/);
  assert.match(script, /disclosure\.open = true/);
  assert.match(script, /summary\.focus/);
  assert.match(script, /form\.setAttribute\('aria-busy', 'true'\)/);
  assert.match(script, /Uploading your payment receipt/);
  assert.match(script, /changedForms\.size/);
  assert.match(script, /prefersReducedMotion/);
});

test('active registration templates compile', () => {
  for (const file of ['src/views/pages/my-registrations.ejs', 'src/views/partials/my-registration-card.ejs']) {
    assert.doesNotThrow(() => ejs.compile(read(file), { filename: path.join(root, file) }));
  }
});
