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

test('runner dashboard unlink modal traps focus and restores trigger focus', async () => {
  const doc = {
    readyState: 'complete',
    body: { style: {} },
    activeElement: null,
    listeners: new Map(),
    addEventListener(type, handler) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(handler);
    },
    querySelector(selector) {
      if (selector === '.logout-form') return null;
      if (selector === '[data-dashboard-action="browse-events"]') return null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-toggle-target]') return [];
      if (selector === '[data-open-unlink-modal]') return [openButton];
      return [];
    },
    getElementById(id) {
      if (id === 'unlinkGoogleModal') return modal;
      return null;
    }
  };

  const modal = new FakeElement(doc, 'unlinkGoogleModal');
  modal.setAttribute('hidden', '');
  modal.setAttribute('aria-hidden', 'true');
  const dialog = new FakeElement(doc, 'dialog');
  const cancel = new FakeElement(doc, 'cancel');
  const confirm = new FakeElement(doc, 'confirm');
  const openButton = new FakeElement(doc, 'open');
  const form = new FakeElement(doc, 'form');
  let submitCount = 0;
  form.submit = () => { submitCount += 1; };
  openButton.parentForm = form;

  modal.children['.modal-dialog'] = dialog;
  modal.children['[data-cancel-unlink]'] = cancel;
  modal.children['[data-confirm-unlink]'] = confirm;
  dialog.children['[data-cancel-unlink]'] = cancel;
  dialog.children['[data-confirm-unlink]'] = confirm;

  const scriptPath = path.resolve(__dirname, '../src/public/js/runner-dashboard.js');
  const source = fs.readFileSync(scriptPath, 'utf8');

  const context = vm.createContext({
    document: doc,
    window: { localStorage: { getItem: () => null, setItem: () => {} } },
    confirm: () => true
  });

  vm.runInContext(source, context, { filename: 'runner-dashboard.js' });

  openButton.dispatch('click');
  assert.equal(modal.hasAttribute('hidden'), false);
  assert.equal(doc.body.style.overflow, 'hidden');
  assert.equal(doc.activeElement, cancel);

  doc.activeElement = confirm;
  let prevented = false;
  modal.dispatch('keydown', {
    key: 'Tab',
    shiftKey: false,
    preventDefault() { prevented = true; }
  });
  assert.equal(prevented, true);
  assert.equal(doc.activeElement, cancel);

  confirm.dispatch('click');
  assert.equal(submitCount, 1);

  openButton.dispatch('click');
  modal.dispatch('keydown', {
    key: 'Escape',
    preventDefault() {}
  });
  assert.equal(modal.hasAttribute('hidden'), true);
  assert.equal(doc.body.style.overflow, '');
  assert.equal(doc.activeElement, openButton);
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
