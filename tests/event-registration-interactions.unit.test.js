'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { Window } = require('happy-dom');

const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'src/public/js/event-register.js'), 'utf8');

function buildWindow() {
  const window = new Window({ url: 'https://hellorun.test/events/sample/register' });
  window.document.body.innerHTML = `
    <form id="eventRegisterForm">
      <input type="radio" id="modeVirtual" name="participationMode" value="virtual" checked>
      <div id="participationModeGroup"></div>
      <input type="radio" id="distance25" name="raceDistance" value="25K" checked>
      <input type="radio" id="distance50" name="raceDistance" value="50K">
      <div id="raceDistanceGroup"></div>
      <input type="checkbox" id="addon" name="addOnProductIds" value="shirt">
      <input type="checkbox" id="waiverAccepted" name="waiverAccepted" value="1">
      <details id="waiverDetails" open><summary>Read waiver</summary><p>Waiver copy</p></details>
      <input type="text" id="waiverSignature" name="waiverSignature">
      <button id="reviewRegistrationBtn" type="submit">Review registration</button>
      <span data-profile-field="name">Jamie Runner</span>
    </form>
    <div data-review-mode></div>
    <div data-review-distance></div>
    <div data-review-registration-cost></div>
    <div data-review-addons-row hidden><span data-review-addons-cost></span></div>
    <div data-review-total></div>
    <dialog id="registrationReviewDialog">
      <span data-dialog-profile></span>
      <span data-dialog-mode></span>
      <span data-dialog-distance></span>
      <div data-dialog-option-row hidden><span data-dialog-option></span></div>
      <div data-dialog-package-row hidden><span data-dialog-package></span></div>
      <div data-dialog-addons-row hidden><span data-dialog-addons></span></div>
      <span data-dialog-total></span>
      <span data-dialog-waiver></span>
      <button id="confirmRegistrationBtn" type="button">Confirm registration</button>
    </dialog>
    <script type="application/json" id="registrationReviewData">${JSON.stringify({
      eventTitle: 'Sample',
      feeMode: 'free',
      currency: 'PHP',
      expectedSignatureName: 'Jamie Runner',
      profileName: 'Jamie Runner',
      modes: [{ value: 'virtual', label: 'Virtual' }],
      distances: [
        { value: '25K', title: '25K Starter' },
        { value: '50K', title: '50K Progress' }
      ],
      distancePricing: { '25K': { amount: 0 }, '50K': { amount: 0 } },
      customizedOptions: [],
      packages: [],
      addOns: [{ id: 'shirt', label: 'Event shirt', amount: 350, currency: 'PHP' }]
    })}</script>
  `;
  window.lucide = { createIcons() {} };
  return window;
}

test('registration interactions update the live review and gate submission behind validation', () => {
  const window = buildWindow();
  window.eval(SCRIPT);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

  assert.equal(window.document.querySelector('[data-review-mode]').textContent, 'Virtual');
  assert.equal(window.document.querySelector('[data-review-distance]').textContent, '25K Starter');
  assert.equal(window.document.querySelector('[data-review-total]').textContent, 'Free');

  const distance50 = window.document.getElementById('distance50');
  distance50.checked = true;
  distance50.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(window.document.querySelector('[data-review-distance]').textContent, '50K Progress');

  const addon = window.document.getElementById('addon');
  addon.checked = true;
  addon.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(window.document.querySelector('[data-review-total]').textContent, 'PHP 350.00');

  const form = window.document.getElementById('eventRegisterForm');
  const invalidSubmit = new window.Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(invalidSubmit);
  assert.equal(invalidSubmit.defaultPrevented, true);
  assert.equal(window.document.getElementById('registrationClientErrorSummary'), null);
  const inlineErrors = Array.from(window.document.querySelectorAll('.registration-client-field-error')).map((item) => item.textContent);
  assert.ok(inlineErrors.includes('Read and accept the event waiver.'));
  assert.ok(inlineErrors.includes('Enter your digital signature.'));
  assert.equal(window.document.getElementById('waiverAccepted').getAttribute('aria-invalid'), 'true');
  assert.equal(window.document.getElementById('waiverSignature').getAttribute('aria-invalid'), 'true');
});

test('waiver starts collapsible, then stays locked open after missing acceptance validation', () => {
  const window = buildWindow();
  window.eval(SCRIPT);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

  const waiver = window.document.getElementById('waiverDetails');
  const summary = waiver.querySelector('summary');
  const accepted = window.document.getElementById('waiverAccepted');
  waiver.open = false;
  waiver.dispatchEvent(new window.Event('toggle'));
  assert.equal(waiver.open, false);
  assert.equal(waiver.dataset.validationLockedOpen, 'false');

  const form = window.document.getElementById('eventRegisterForm');
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(accepted.checked, false);
  assert.equal(waiver.open, true);
  assert.equal(waiver.dataset.validationLockedOpen, 'true');
  assert.equal(summary.getAttribute('aria-disabled'), 'true');

  const pointerActivation = new window.MouseEvent('click', { bubbles: true, cancelable: true });
  summary.dispatchEvent(pointerActivation);
  assert.equal(pointerActivation.defaultPrevented, true);
  assert.equal(waiver.open, true);

  for (const key of ['Enter', ' ']) {
    const keyboardActivation = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    summary.dispatchEvent(keyboardActivation);
    assert.equal(keyboardActivation.defaultPrevented, true);
    assert.equal(waiver.open, true);
  }

  waiver.open = false;
  waiver.dispatchEvent(new window.Event('toggle'));
  assert.equal(waiver.open, true);

  accepted.checked = true;
  accepted.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(waiver.dataset.validationLockedOpen, 'false');
  assert.equal(summary.hasAttribute('aria-disabled'), false);
  waiver.open = false;
  waiver.dispatchEvent(new window.Event('toggle'));
  assert.equal(waiver.open, false);
});

test('server-rendered waiver acceptance errors initialize the disclosure open and locked', () => {
  const window = buildWindow();
  const waiver = window.document.getElementById('waiverDetails');
  waiver.dataset.validationLockedOpen = 'true';
  waiver.open = true;

  window.eval(SCRIPT);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

  assert.equal(waiver.open, true);
  assert.equal(waiver.dataset.validationLockedOpen, 'true');
  assert.equal(waiver.querySelector('summary').getAttribute('aria-disabled'), 'true');

  waiver.open = false;
  waiver.dispatchEvent(new window.Event('toggle'));
  assert.equal(waiver.open, true);
});

test('signature-only validation opens the waiver without locking it', () => {
  const window = buildWindow();
  const waiver = window.document.getElementById('waiverDetails');
  const accepted = window.document.getElementById('waiverAccepted');
  waiver.open = false;
  accepted.checked = true;

  window.eval(SCRIPT);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

  const form = window.document.getElementById('eventRegisterForm');
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(waiver.open, true);
  assert.equal(waiver.dataset.validationLockedOpen, 'false');

  waiver.open = false;
  waiver.dispatchEvent(new window.Event('toggle'));
  assert.equal(waiver.open, false);
});

test('registration page initializes navigation icons and safely supports pages without an active form', () => {
  const window = new Window({ url: 'https://hellorun.test/events/sample/register' });
  window.document.body.innerHTML = '<button class="menu-toggle"><i data-lucide="menu"></i></button>';
  let iconRenderCount = 0;
  window.lucide = { createIcons() { iconRenderCount += 1; } };

  window.eval(SCRIPT);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

  assert.equal(iconRenderCount, 1);
});

test('registration page safely starts when Lucide is unavailable', () => {
  const window = new Window({ url: 'https://hellorun.test/events/sample/register' });
  window.document.body.innerHTML = '<button class="menu-toggle"><i data-lucide="menu"></i></button>';

  assert.doesNotThrow(() => {
    window.eval(SCRIPT);
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  });
});

test('valid registration opens review dialog and final confirmation emits one real submit', () => {
  const window = buildWindow();
  window.eval(SCRIPT);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

  window.document.getElementById('waiverAccepted').checked = true;
  window.document.getElementById('waiverSignature').value = 'Jamie Runner';
  const form = window.document.getElementById('eventRegisterForm');
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

  const dialog = window.document.getElementById('registrationReviewDialog');
  assert.equal(dialog.open, true);
  assert.equal(window.document.querySelector('[data-dialog-waiver]').textContent, 'Accepted and signed');
  assert.equal(window.document.querySelector('[data-dialog-profile]').textContent, 'Jamie Runner');

  let finalSubmitCount = 0;
  form.addEventListener('submit', (event) => {
    finalSubmitCount += 1;
    event.preventDefault();
  });
  window.document.getElementById('confirmRegistrationBtn').click();
  assert.equal(finalSubmitCount, 1);
  assert.equal(window.document.getElementById('confirmRegistrationBtn').disabled, true);
  assert.equal(window.document.getElementById('confirmRegistrationBtn').getAttribute('aria-busy'), 'true');
});
