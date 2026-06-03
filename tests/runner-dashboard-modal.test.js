const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class FakeElement {
  constructor(doc, id = '') {
    this.doc = doc;
    this.id = id;
    this.attributes = new Map();
    this.listeners = new Map();
    this.style = {};
    this.dataset = {};
    this.children = {};
    this.parentForm = null;
    this.className = '';
    this.textContent = '';
    this.appendedChildren = [];
    this.inserted = [];
  }

  setAttribute(name, value = '') { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  hasAttribute(name) { return this.attributes.has(name); }
  getAttribute(name) { return this.attributes.get(name) || null; }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  dispatch(type, event = {}) {
    const handlers = this.listeners.get(type) || [];
    for (const handler of handlers) handler(event);
  }

  querySelector(selector) { return this.children[selector] || null; }
  querySelectorAll(selector) {
    if (selector.includes('button:not([disabled])')) {
      return [this.children['[data-cancel-unlink]'], this.children['[data-confirm-unlink]']].filter(Boolean);
    }
    return [];
  }

  closest(selector) {
    if (selector === 'form') return this.parentForm;
    return null;
  }

  appendChild(node) {
    this.appendedChildren.push(node);
    return node;
  }

  insertAdjacentElement(_position, element) {
    this.inserted.push(element);
    return element;
  }

  focus() { this.doc.activeElement = this; }
}

test('runner dashboard exposes a full refresh hook', async () => {
  const doc = {
    readyState: 'complete',
    body: { style: {} },
    visibilityState: 'hidden',
    activeElement: null,
    listeners: new Map(),
    addEventListener(type, handler) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(handler);
    },
    querySelector(selector) {
      if (selector === '.logout-form') return null;
      if (selector === '.runner-dashboard-page') return page;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-toggle-target]') return [];
      if (selector === 'form') return [];
      return [];
    },
    getElementById() { return null; }
  };

  const page = new FakeElement(doc, 'page');
  page.querySelector = () => null;
  let fetchCount = 0;

  const scriptPath = path.resolve(__dirname, '../src/public/js/runner-dashboard.js');
  const source = fs.readFileSync(scriptPath, 'utf8');

  const context = vm.createContext({
    document: doc,
    window: {
      location: { pathname: '/runner/dashboard', search: '', origin: 'http://localhost' },
      addEventListener: () => {},
      localStorage: { getItem: () => null, setItem: () => {} }
    },
    history: { pushState: () => {} },
    fetch: async () => {
      fetchCount += 1;
      return { ok: true, json: async () => ({ success: true, fragments: {} }) };
    },
    URL
  });

  vm.runInContext(source, context, { filename: 'runner-dashboard.js' });
  assert.equal(typeof context.window.refreshRunnerDashboard, 'function');
  assert.equal(context.window.refreshRunnerDashboardResultSubmissions, context.window.refreshRunnerDashboard);
  await context.window.refreshRunnerDashboard();
  assert.equal(fetchCount, 1);
});

test('runner dashboard flash bridge renders a runtime alert with optional link', async () => {
  const doc = {
    readyState: 'complete',
    body: { style: {} },
    activeElement: null,
    createElement(tag) {
      return new FakeElement(this, tag);
    },
    createTextNode(text) {
      return { nodeType: 3, textContent: text };
    },
    querySelector(selector) {
      if (selector === '.logout-form') return null;
      if (selector === '.runner-dashboard-page') return page;
      if (selector === '[data-dashboard-runtime-message]') return runtimeMessage;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-toggle-target]') return [];
      if (selector === '[data-open-unlink-modal]') return [];
      if (selector === 'form') return [];
      return [];
    },
    getElementById() {
      return null;
    }
  };

  const page = new FakeElement(doc, 'page');
  const container = new FakeElement(doc, 'container');
  const hero = new FakeElement(doc, 'hero');
  let runtimeMessage = null;
  page.children['.dashboard-container'] = container;
  page.children['.dashboard-hero'] = hero;
  page.querySelector = (selector) => {
    if (selector === '.dashboard-container') return container;
    if (selector === '.dashboard-hero') return hero;
    if (selector === '[data-dashboard-runtime-message]') return runtimeMessage;
    return null;
  };
  hero.insertAdjacentElement = (_position, element) => {
    runtimeMessage = element;
    return element;
  };

  const scriptPath = path.resolve(__dirname, '../src/public/js/runner-dashboard.js');
  const source = fs.readFileSync(scriptPath, 'utf8');

  const context = vm.createContext({
    document: doc,
    window: {
      location: { pathname: '/runner/dashboard', search: '' },
      addEventListener: () => {},
      localStorage: { getItem: () => null, setItem: () => {} }
    },
    history: { pushState: () => {} },
    fetch: async () => ({ ok: true, text: async () => '' })
  });

  vm.runInContext(source, context, { filename: 'runner-dashboard.js' });
  assert.equal(typeof context.window.showRunnerDashboardFlashMessage, 'function');

  context.window.showRunnerDashboardFlashMessage({
    type: 'success',
    text: 'Result submitted for review.',
    linkHref: '/my-registrations',
    linkLabel: 'Review my registrations'
  });

  assert.ok(runtimeMessage);
  assert.equal(runtimeMessage.className, 'alert alert-success');
  assert.equal(runtimeMessage.textContent, 'Result submitted for review.');
  assert.equal(runtimeMessage.appendedChildren.length, 2);
  assert.equal(runtimeMessage.appendedChildren[1].href, '/my-registrations');
  assert.equal(runtimeMessage.appendedChildren[1].textContent, 'Review my registrations');
});

test('run proof modal process opens dashboard flow before eligible events finish loading', () => {
  const scriptPath = path.resolve(__dirname, '../src/public/js/run-proof-modal.js');
  const source = fs.readFileSync(scriptPath, 'utf8');
  const partialPath = path.resolve(__dirname, '../src/views/partials/run-proof-modal.ejs');
  const partial = fs.readFileSync(partialPath, 'utf8');

  assert.match(source, /showModalShell\(\);\s*renderEventOptionsLoading\(\);/);
  assert.match(source, /data-run-proof-registration-id/);
  assert.match(source, /Image analysis is unavailable\. Continue by entering your run details manually\./);
  assert.match(source, /Analyse Activity Screenshot/);
  assert.match(source, /ocrDetectedSourceInput\.value = result\.detectedSource/);
  assert.match(source, /ocrSummaryEl\.textContent = 'Detected from image:/);
  assert.doesNotMatch(source, /ocrResultsEl\.innerHTML = detailsHtml/);
  assert.match(source, /fileInput\.value = '';\s*fileInput\.click\(\);/);
  assert.match(source, /requireNameMismatchAcknowledgement/);
  assert.match(source, /pendingNameMismatchAction/);
  assert.match(source, /requireNameMismatchAcknowledgement\('submit-review'\)/);
  assert.match(source, /requireNameMismatchAcknowledgement\('final-submit'\)/);
  assert.match(source, /continueAfterNameMismatchAcknowledgement/);
  assert.match(source, /submitConfirmedRunProof/);
  assert.match(source, /clearRunDetailFields/);
  assert.match(source, /if \(stepsInput\) stepsInput\.value = ''/);
  assert.match(source, /fileInput\.addEventListener\('change'[\s\S]*clearRunDetailFields\(\);/);
  assert.match(source, /hideNameMismatchState/);
  assert.match(source, /const confirmOverlay = document\.getElementById\('runProofNameMismatchConfirm'\)/);
  assert.match(source, /hideNameMismatchState\(\);\s*if \(extractedName\)/);
  assert.match(source, /mismatchWarningWasVisible/);
  assert.match(source, /confirmOverlay && mismatchWarningWasVisible/);
  assert.match(source, /selectedRegistrationIds/);
  assert.match(source, /Submit ' \+ selectedCount \+ ' Entries/);
  assert.match(source, /getSubmissionTargetLabel/);
  assert.match(source, /Challenge Activity/);
  assert.match(source, /Event Result/);
  assert.match(source, /Strava submissions target one event or Personal Record/);
  assert.match(source, /enforceSingleStravaTarget/);
  assert.match(source, /retrying original image/);
  assert.match(source, /requestOcrInterrupt\('replace-image'/);
  assert.match(source, /requestOcrInterrupt\('remove-image'/);
  assert.match(source, /requestOcrInterrupt\('drop-image', file\)/);
  assert.match(source, /handleConfirmedOcrInterrupt/);
  assert.match(source, /runId !== state\.ocrRunId/);
  assert.match(source, /focusEventSelectionPanel\(\);/);
  assert.match(partial, /id="runProofEventsList"[^>]*tabindex="-1"/);
  assert.match(partial, /name="ocrDetectedSource"/);
  assert.match(partial, /id="runProofOcrSummary"/);
  assert.match(partial, /name="ocrExtractedName"/);
  assert.match(partial, /name="ocrNameMatchStatus"/);
  assert.match(partial, /id="runProofStravaSyncBtn"/);
  assert.match(partial, /Sync Strava Data/);
  assert.match(partial, /Activity Screenshot/);
  assert.match(partial, /Strava Activity/);
  assert.match(partial, /Strava submissions currently target one HelloRun event or Personal Record/);
  assert.match(partial, /Personal log/);
  assert.match(source, /\/api\/strava\/activities\?per_page=20/);
  assert.match(source, /\/api\/events\/' \+ encodeURIComponent\(eventId\) \+ '\/submissions\/strava/);
  assert.match(source, /selected\?\.isPersonalRecord\s*\?\s*'personal-record'/);
  assert.match(partial, /id="runProofSubmitInlineBtn"/);
});
