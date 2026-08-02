'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Window } = require('happy-dom');

const SCRIPT = fs.readFileSync(
  path.resolve(__dirname, '../src/public/js/cookie-preferences.js'),
  'utf8'
);

const flush = () => new Promise((resolve) => setImmediate(resolve));

function createPage(fetchImpl, { withMobileNavigation = true } = {}) {
  const window = new Window({ url: 'https://hellorun.test/events' });
  window.document.body.innerHTML = `
    ${withMobileNavigation ? '<nav class="mobile-bottom-nav"></nav>' : ''}
    <aside data-cookie-banner>
      <form action="/cookie-preferences" data-cookie-preference-form>
        <input type="hidden" name="_csrf" value="csrf-token">
        <input type="hidden" name="returnTo" value="/events">
        <button id="reject" type="submit" name="action" value="reject_optional" data-cookie-action="reject_optional">Reject optional</button>
        <button id="accept" type="submit" name="action" value="accept_all" data-cookie-action="accept_all">Accept all</button>
        <a href="/cookie-policy#cookie-choices" data-open-cookie-preferences>Customize</a>
        <p data-cookie-preference-status></p>
      </form>
    </aside>
    <button id="footer-opener" data-open-cookie-preferences>Cookie preferences</button>
    <dialog id="cookiePreferencesDialog">
      <form action="/cookie-preferences" data-cookie-preference-form data-cookie-custom-form>
        <input type="hidden" name="_csrf" value="csrf-token">
        <input type="hidden" name="returnTo" value="/events">
        <button type="button" data-close-cookie-preferences>Close</button>
        <input id="functional" type="checkbox" name="functional" value="1">
        <input id="analytics" type="checkbox" name="analytics" value="1">
        <button id="custom-reject" type="button" data-reject-cookie-preferences>Reject optional</button>
        <button id="save" type="submit">Save preferences</button>
        <p data-cookie-preference-status></p>
      </form>
    </dialog>
  `;
  window.HelloRunPrivacy = {
    functional: false,
    analytics: false
  };
  window.fetch = fetchImpl;
  window.setTimeout = () => 1;
  window.eval(SCRIPT);
  return window;
}

function successfulResponse(preferences = {
  functional: true,
  analytics: true
}) {
  return {
    ok: true,
    json: async () => ({ ok: true, preferences })
  };
}

test('Accept all remains explicit when SubmitEvent.submitter is unavailable', async () => {
  const requests = [];
  const window = createPage(async (_url, options) => {
    requests.push(options);
    return successfulResponse();
  });
  const form = window.document.querySelector('[data-cookie-banner] form');
  const accept = window.document.getElementById('accept');

  accept.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await flush();

  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.get('action'), 'accept_all');
  assert.equal(requests[0].body.get('_csrf'), 'csrf-token');
  assert.match(form.querySelector('[data-cookie-preference-status]').textContent, /Preferences saved/i);
});

test('Accept all uses the native submitter when the browser supplies it', async () => {
  const requests = [];
  const window = createPage(async (_url, options) => {
    requests.push(options);
    return successfulResponse();
  });
  const form = window.document.querySelector('[data-cookie-banner] form');
  const accept = window.document.getElementById('accept');

  form.dispatchEvent(new window.SubmitEvent('submit', {
    bubbles: true,
    cancelable: true,
    submitter: accept
  }));
  await flush();

  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.get('action'), 'accept_all');
});

test('Reject optional and custom Save send distinct authoritative payloads', async () => {
  const rejectRequests = [];
  const rejectWindow = createPage(async (_url, options) => {
    rejectRequests.push(options);
    return successfulResponse({
      functional: false,
      analytics: false
    });
  });
  rejectWindow.document.getElementById('custom-reject').click();
  await flush();
  assert.equal(rejectRequests[0].body.get('action'), 'reject_optional');

  const saveRequests = [];
  const saveWindow = createPage(async (_url, options) => {
    saveRequests.push(options);
    return successfulResponse({
      functional: true,
      analytics: false
    });
  });
  const form = saveWindow.document.querySelector('[data-cookie-custom-form]');
  saveWindow.document.getElementById('functional').checked = true;
  form.dispatchEvent(new saveWindow.SubmitEvent('submit', {
    bubbles: true,
    cancelable: true,
    submitter: saveWindow.document.getElementById('save')
  }));
  await flush();

  assert.equal(saveRequests.length, 1);
  assert.equal(saveRequests[0].body.has('action'), false);
  assert.equal(saveRequests[0].body.get('functional'), '1');
  assert.equal(saveRequests[0].body.get('analytics'), null);
  assert.equal(saveRequests[0].body.has('advertising'), false);
});

test('busy state prevents duplicate requests and failures remain visible on the initiating surface', async () => {
  let resolveRequest;
  const requests = [];
  const window = createPage((_url, options) => {
    requests.push(options);
    return new Promise((resolve) => { resolveRequest = resolve; });
  });
  const form = window.document.querySelector('[data-cookie-banner] form');
  const accept = window.document.getElementById('accept');
  const submit = () => form.dispatchEvent(new window.SubmitEvent('submit', {
    bubbles: true,
    cancelable: true,
    submitter: accept
  }));

  submit();
  submit();
  assert.equal(requests.length, 1);

  resolveRequest({
    ok: false,
    json: async () => ({ ok: false, message: 'Your session expired. Refresh and try again.' })
  });
  await flush();

  assert.equal(form.getAttribute('aria-busy'), 'false');
  assert.equal(accept.disabled, false);
  assert.match(form.querySelector('[data-cookie-preference-status]').textContent, /session expired/i);
});

test('network and malformed-response failures restore controls with visible feedback', async () => {
  const networkWindow = createPage(async () => {
    throw new Error('Network unavailable.');
  });
  const networkForm = networkWindow.document.querySelector('[data-cookie-banner] form');
  networkForm.dispatchEvent(new networkWindow.SubmitEvent('submit', {
    bubbles: true,
    cancelable: true,
    submitter: networkWindow.document.getElementById('accept')
  }));
  await flush();
  assert.equal(networkForm.getAttribute('aria-busy'), 'false');
  assert.match(networkForm.querySelector('[data-cookie-preference-status]').textContent, /Network unavailable/i);

  const malformedWindow = createPage(async () => ({
    ok: true,
    json: async () => { throw new Error('Invalid JSON'); }
  }));
  const malformedForm = malformedWindow.document.querySelector('[data-cookie-banner] form');
  malformedForm.dispatchEvent(new malformedWindow.SubmitEvent('submit', {
    bubbles: true,
    cancelable: true,
    submitter: malformedWindow.document.getElementById('accept')
  }));
  await flush();
  assert.equal(malformedForm.getAttribute('aria-busy'), 'false');
  assert.match(
    malformedForm.querySelector('[data-cookie-preference-status]').textContent,
    /Unable to save cookie preferences/i
  );
});

test('mobile-navigation positioning and dialog focus restoration initialize progressively', () => {
  const window = createPage(async () => successfulResponse());
  const banner = window.document.querySelector('[data-cookie-banner]');
  const opener = window.document.getElementById('footer-opener');
  const dialog = window.document.getElementById('cookiePreferencesDialog');
  const close = dialog.querySelector('[data-close-cookie-preferences]');

  assert.equal(banner.classList.contains('has-mobile-navigation'), true);
  opener.focus();
  opener.click();
  assert.equal(dialog.open, true);
  assert.equal(window.document.activeElement, close);
  close.click();
  assert.equal(dialog.open, false);
  assert.equal(window.document.activeElement, opener);

  const pageWithoutNav = createPage(async () => successfulResponse(), { withMobileNavigation: false });
  assert.equal(
    pageWithoutNav.document.querySelector('[data-cookie-banner]').classList.contains('has-mobile-navigation'),
    false
  );
});
