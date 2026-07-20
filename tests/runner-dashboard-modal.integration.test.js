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

function createCertificateActionContext({ share, writeText, prompt = () => {} } = {}) {
  const listeners = new Map();
  const document = {
    readyState: 'loading',
    addEventListener(type, handler) { listeners.set(type, handler); },
    querySelector: () => null,
    querySelectorAll: () => []
  };
  const messages = [];
  const context = vm.createContext({
    document,
    navigator: {
      ...(share ? { share } : {}),
      ...(writeText ? { clipboard: { writeText } } : {})
    },
    window: {
      prompt,
      setTimeout: () => {},
      showRunnerDashboardFlashMessage: (message) => messages.push(message)
    }
  });
  const source = fs.readFileSync(path.resolve(__dirname, '../src/public/js/runner-dashboard.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'runner-dashboard.js' });
  context.setupCertificateActions();
  return { click: listeners.get('click'), keydown: listeners.get('keydown'), messages, document };
}

test('certificate More opens native sharing with the verification URL and social text', async () => {
  const calls = [];
  const { click } = createCertificateActionContext({ share: async (payload) => calls.push(payload) });
  const button = {
    getAttribute(name) {
      return { 'data-native-cert-share-url': 'https://example.test/verify/abc', 'data-share-cert-title': 'July Quest', 'data-share-cert-text': 'I completed July Quest!' }[name] || null;
    },
    closest: () => null
  };

  await click({ target: { closest: (selector) => selector === '[data-native-cert-share-url]' ? button : null } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].title, 'July Quest');
  assert.equal(calls[0].text, 'I completed July Quest!');
  assert.equal(calls[0].url, 'https://example.test/verify/abc');
});

test('cancelling native certificate sharing does not copy or prompt', async () => {
  let copied = false;
  let prompted = false;
  const cancelled = Object.assign(new Error('cancelled'), { name: 'AbortError' });
  const { click } = createCertificateActionContext({
    share: async () => { throw cancelled; },
    writeText: async () => { copied = true; },
    prompt: () => { prompted = true; }
  });
  const button = {
    getAttribute(name) {
      return { 'data-native-cert-share-url': 'https://example.test/verify/abc', 'data-share-cert-title': 'July Quest' }[name] || null;
    },
    closest: () => null
  };

  await click({ target: { closest: (selector) => selector === '[data-native-cert-share-url]' ? button : null } });
  assert.equal(copied, false);
  assert.equal(prompted, false);
});

test('certificate More confirms its clipboard fallback without scrolling the page', async () => {
  const copied = [];
  const { click, messages } = createCertificateActionContext({ writeText: async (value) => copied.push(value) });
  const attributes = new Map([
    ['data-native-cert-share-url', 'https://example.test/verify/abc'],
    ['data-share-cert-title', 'July Quest']
  ]);
  const button = {
    getAttribute: (name) => attributes.get(name) || null,
    setAttribute: (name, value) => attributes.set(name, value),
    closest: () => null
  };

  await click({ target: { closest: (selector) => selector === '[data-native-cert-share-url]' ? button : null } });
  assert.deepEqual(copied, ['https://example.test/verify/abc']);
  assert.equal(attributes.get('data-action-label'), 'Link copied');
  assert.equal(attributes.get('aria-label'), 'Certificate link copied');
  assert.equal(messages.length, 0);
});

test('certificate More uses the copy prompt when native share and clipboard are unavailable', async () => {
  const prompts = [];
  const { click } = createCertificateActionContext({ prompt: (message, value) => prompts.push({ message, value }) });
  const button = {
    getAttribute(name) {
      return { 'data-native-cert-share-url': 'https://example.test/verify/abc', 'data-share-cert-title': 'July Quest' }[name] || null;
    },
    closest: () => null,
    setAttribute: () => {}
  };

  await click({ target: { closest: (selector) => selector === '[data-native-cert-share-url]' ? button : null } });
  assert.equal(prompts.length, 1);
  assert.equal(prompts[0].message, 'Copy this verification link:');
  assert.equal(prompts[0].value, 'https://example.test/verify/abc');
});

test('certificate social menu toggles and Escape closes it with focus restored', async () => {
  const { click, keydown, document } = createCertificateActionContext({ writeText: async () => {} });
  const menuAttributes = new Map([['hidden', '']]);
  const zoneClasses = new Set();
  let firstItemFocused = false;
  let secondItemFocused = false;
  let toggleFocused = false;
  const firstItem = { focus: () => { firstItemFocused = true; }, closest: () => menu };
  const secondItem = { focus: () => { secondItemFocused = true; }, closest: () => menu };
  const menu = {
    hasAttribute: (name) => menuAttributes.has(name),
    removeAttribute: (name) => menuAttributes.delete(name),
    setAttribute: (name, value = '') => menuAttributes.set(name, value),
    querySelector: (selector) => selector === '[role="menuitem"]' ? firstItem : null,
    querySelectorAll: () => [firstItem, secondItem],
    closest(selector) {
      if (selector === '[data-certificate-share]') return wrapper;
      if (selector === '[data-dashboard-fragment="latestAchievement"]') return zone;
      return null;
    }
  };
  const zone = {
    classList: {
      toggle(name, force) {
        if (force) zoneClasses.add(name);
        else zoneClasses.delete(name);
      }
    }
  };
  const toggleAttributes = new Map([['aria-expanded', 'false']]);
  const toggle = {
    closest: () => wrapper,
    setAttribute: (name, value) => toggleAttributes.set(name, value),
    focus: () => { toggleFocused = true; }
  };
  const wrapper = {
    querySelector(selector) {
      if (selector === '[data-certificate-share-menu]') return menu;
      if (selector === '[data-certificate-share-toggle]') return toggle;
      return null;
    }
  };
  document.querySelectorAll = () => menuAttributes.has('hidden') ? [] : [menu];
  document.querySelector = () => menuAttributes.has('hidden') ? null : menu;

  await click({ target: { closest: (selector) => selector === '[data-certificate-share-toggle]' ? toggle : null } });
  assert.equal(menuAttributes.has('hidden'), false);
  assert.equal(toggleAttributes.get('aria-expanded'), 'true');
  assert.equal(firstItemFocused, true);
  assert.equal(zoneClasses.has('is-share-open'), true);

  let arrowPrevented = false;
  await keydown({ key: 'ArrowDown', target: firstItem, preventDefault: () => { arrowPrevented = true; } });
  assert.equal(secondItemFocused, true);
  assert.equal(arrowPrevented, true);

  let prevented = false;
  await keydown({ key: 'Escape', target: secondItem, preventDefault: () => { prevented = true; } });
  assert.equal(menuAttributes.has('hidden'), true);
  assert.equal(toggleAttributes.get('aria-expanded'), 'false');
  assert.equal(toggleFocused, true);
  assert.equal(zoneClasses.has('is-share-open'), false);
  assert.equal(prevented, true);

  toggleFocused = false;
  await click({ target: { closest: (selector) => selector === '[data-certificate-share-toggle]' ? toggle : null } });
  const socialLink = { closest: (selector) => selector === '[data-certificate-share-menu]' ? menu : null };
  await click({ target: { closest: (selector) => selector === '[data-certificate-social-link]' ? socialLink : null } });
  assert.equal(menuAttributes.has('hidden'), true);
  assert.equal(zoneClasses.has('is-share-open'), false);

  await click({ target: { closest: (selector) => selector === '[data-certificate-share-toggle]' ? toggle : null } });
  const copyAttributes = new Map([['data-copy-cert-url', 'https://example.test/verify/abc']]);
  const copyButton = {
    getAttribute: (name) => copyAttributes.get(name) || null,
    setAttribute: (name, value) => copyAttributes.set(name, value),
    closest(selector) {
      if (selector === '[data-certificate-share-menu]') return menu;
      if (selector === '[data-certificate-share]') return wrapper;
      return null;
    }
  };
  await click({ target: { closest: (selector) => selector === '[data-copy-cert-url]' ? copyButton : null } });
  assert.equal(menuAttributes.has('hidden'), true);
  assert.equal(zoneClasses.has('is-share-open'), false);

  await click({ target: { closest: (selector) => selector === '[data-certificate-share-toggle]' ? toggle : null } });
  const nativeAttributes = new Map([
    ['data-native-cert-share-url', 'https://example.test/verify/abc'],
    ['data-share-cert-title', 'July Quest']
  ]);
  const nativeButton = {
    getAttribute: (name) => nativeAttributes.get(name) || null,
    setAttribute: (name, value) => nativeAttributes.set(name, value),
    closest(selector) {
      if (selector === '[data-certificate-share-menu]') return menu;
      if (selector === '[data-certificate-share]') return wrapper;
      return null;
    }
  };
  await click({ target: { closest: (selector) => selector === '[data-native-cert-share-url]' ? nativeButton : null } });
  assert.equal(menuAttributes.has('hidden'), true);
  assert.equal(zoneClasses.has('is-share-open'), false);

  await click({ target: { closest: (selector) => selector === '[data-certificate-share-toggle]' ? toggle : null } });
  await click({ target: { closest: () => null } });
  assert.equal(menuAttributes.has('hidden'), true);
  assert.equal(toggleFocused, true);
  assert.equal(zoneClasses.has('is-share-open'), false);
});

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
  const footerPath = path.resolve(__dirname, '../src/views/layouts/footer.ejs');
  const footer = fs.readFileSync(footerPath, 'utf8');

  assert.match(source, /showModalShell\(\);\s*renderEventOptionsLoading\(\);/);
  assert.match(source, /data-run-proof-registration-id/);
  assert.match(source, /Image analysis is unavailable\. Continue by entering your run details manually\./);
  assert.match(source, /Analyse Activity Screenshot/);
  assert.match(source, /submissionDeadlineAt/);
  assert.match(source, /Upload deadline/);
  assert.match(source, /eligibilityContext/);
  assert.match(source, /fallbackMessage/);
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
  assert.match(source, /runnerDisplayName/);
  assert.match(source, /HelloRunOcrIdentity\.evaluateNameMatch/);
  assert.match(source, /const confirmOverlay = document\.getElementById\('runProofNameMismatchConfirm'\)/);
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
  assert.match(partial, /data-runner-display-name/);
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
  assert.match(footer, /\/js\/ocr\/ocr-location-resolver\.js/);

  const runnerRoutes = fs.readFileSync(path.resolve(__dirname, '../src/routes/runner.routes.js'), 'utf8');
  assert.match(runnerRoutes, /submissionEligibilityLimiter/);
  assert.match(runnerRoutes, /\/runner\/submissions\/eligible'[\s\S]*submissionEligibilityLimiter/);
});

test('OCR identity helper matches display name and rejects non-matching names', () => {
  const scriptPath = path.resolve(__dirname, '../src/public/js/ocr/ocr-identity.js');
  const source = fs.readFileSync(scriptPath, 'utf8');
  const context = vm.createContext({ window: {} });
  vm.runInContext(source, context, { filename: 'ocr-identity.js' });

  const helper = context.window.HelloRunOcrIdentity;
  const displayMatch = helper.evaluateNameMatch({
    extractedName: 'Iya',
    accountName: 'Maria Santos',
    displayName: 'Iya',
    hadOcrSignal: true
  });
  assert.equal(displayMatch.status, 'matched');
  assert.equal(displayMatch.matchedAgainst, 'display_name');

  const mismatch = helper.evaluateNameMatch({
    extractedName: 'Iya',
    accountName: 'Maria Santos',
    displayName: 'Runner M',
    hadOcrSignal: true
  });
  assert.equal(mismatch.status, 'mismatched');
});
