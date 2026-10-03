'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ejs = require('ejs');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const {
  VERSION_PLACEHOLDER,
  renderServiceWorker,
  resolveServiceWorkerVersion
} = require('../src/utils/service-worker');

function pngSize(file) {
  const buffer = fs.readFileSync(path.join(root, 'src/public', file));
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG', `${file} is not a PNG`);
  return `${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`;
}

test('manifest is valid, branded, root-scoped, and its icons exist at their declared sizes', () => {
  const manifest = JSON.parse(read('src/public/manifest.webmanifest'));
  assert.equal(manifest.name, 'HelloRun');
  assert.equal(manifest.short_name, 'HelloRun');
  assert.equal(manifest.id, '/');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');

  const tokens = read('src/public/css/design-system.css');
  assert.match(tokens, new RegExp(`--hr-color-brand:\\s*${manifest.theme_color}`, 'i'));
  assert.match(tokens, new RegExp(`--hr-color-page:\\s*${manifest.background_color}`, 'i'));

  const sizes = manifest.icons.map((icon) => icon.sizes);
  assert.ok(sizes.includes('192x192'));
  assert.ok(sizes.includes('512x512'));
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable' && icon.sizes === '512x512'));
  for (const icon of manifest.icons) {
    assert.equal(pngSize(icon.src), icon.sizes, `${icon.src} does not match ${icon.sizes}`);
  }
  assert.equal(pngSize('/images/pwa/apple-touch-icon-180.png'), '180x180');
});

test('manifest shortcuts only point at existing routes', () => {
  const manifest = JSON.parse(read('src/public/manifest.webmanifest'));
  const pageRoutes = read('src/routes/pageRoutes.js');
  for (const shortcut of manifest.shortcuts || []) {
    assert.ok(
      pageRoutes.includes(`router.get('${shortcut.url}'`),
      `shortcut ${shortcut.url} has no matching GET route`
    );
  }
});

test('shared head links the manifest, theme colour, touch icon, and install module', () => {
  const head = read('src/views/layouts/head.ejs');
  assert.match(head, /<link rel="manifest" href="\/manifest\.webmanifest">/);
  assert.match(head, /<meta name="theme-color" content="#c2410c">/);
  assert.match(head, /<link rel="apple-touch-icon" sizes="180x180" href="\/images\/pwa\/apple-touch-icon-180\.png">/);
  assert.match(head, /<script src="\/js\/pwa\.js" defer><\/script>/);
  assert.match(head, /<link rel="stylesheet" href="\/css\/pwa\.css">/);
  assert.doesNotMatch(head, /user-scalable=no|maximum-scale=1/);
});

test('install control renders once in the nav and is hidden until a real install path exists', () => {
  const html = ejs.render(read('src/views/layouts/nav.ejs'), {
    locals: { currentPath: '/', isAuthenticated: false, flash: null }
  });
  assert.equal((html.match(/data-pwa-install-action/g) || []).length, 1);
  assert.match(html, /<button type="button" class="nav-icon-link nav-install-btn" data-pwa-install-action aria-label="Install HelloRun"/);

  const css = read('src/public/css/pwa.css');
  assert.match(css, /\[data-pwa-install-action\] \{\s*display: none !important;/);
  assert.match(css, /html\[data-pwa-install="installable"\] \[data-pwa-install-action\],\s*html\[data-pwa-install="ios-manual"\] \[data-pwa-install-action\]/);
});

test('install module never prompts automatically and keeps iOS on the guidance path', () => {
  const js = read('src/public/js/pwa.js');
  assert.match(js, /addEventListener\('beforeinstallprompt'[\s\S]*event\.preventDefault\(\)/);
  assert.match(js, /addEventListener\('appinstalled'/);
  assert.match(js, /\(display-mode: standalone\)/);
  // prompt() is only reachable through requestInstall(), which only the click handler calls.
  assert.equal((js.match(/\.prompt\(\)/g) || []).length, 1);
  assert.match(js, /function requestInstall\(\)[\s\S]*state === 'ios-manual'[\s\S]*showIOSGuidance\(\)/);
  assert.match(js, /closest\('\[data-pwa-install-action\]'\)[\s\S]*requestInstall\(\)/);
  assert.doesNotMatch(js, /innerHTML/);
});

test('service worker version is stamped per deploy and sanitised', () => {
  const source = read('src/public/sw.js');
  assert.ok(source.includes(VERSION_PLACEHOLDER));
  const rendered = renderServiceWorker(source, "abc1234'</script>");
  assert.ok(!rendered.includes(VERSION_PLACEHOLDER));
  assert.match(rendered, /const SW_VERSION = 'abc1234script';/);

  assert.equal(resolveServiceWorkerVersion({ commitShort: 'deadbee', startedAt: '2026-10-03T00:00:00.000Z' }), 'deadbee');
  assert.equal(
    resolveServiceWorkerVersion({ commitShort: 'unknown', startedAt: '2026-10-03T00:00:00.000Z' }),
    `start-${Date.parse('2026-10-03T00:00:00.000Z')}`
  );
});

test('server serves sw.js with no-cache ahead of the long-lived static cache', () => {
  const server = read('src/server.js');
  const swRoute = server.indexOf("app.get('/sw.js'");
  const staticMount = server.indexOf('app.use(express.static(');
  assert.ok(swRoute > 0 && staticMount > swRoute, '/sw.js must be registered before express.static');
  assert.match(server, /\.webmanifest'\) \|\| filePath\.endsWith\('offline\.html'\)\) \{\s*res\.setHeader\('Cache-Control', 'no-cache'\)/);
  assert.match(server, /"worker-src 'self' blob:"/);
});

// ---- Behavioural checks: run the real worker against mocked browser APIs ----

function loadServiceWorker() {
  const handlers = {};
  const puts = [];
  const store = new Map();
  const fetched = [];
  const cache = {
    addAll: async (urls) => urls.forEach((url) => store.set(url, { url, cached: true })),
    match: async (request) => store.get(typeof request === 'string' ? request : request.url) || undefined,
    put: async (request) => { puts.push(typeof request === 'string' ? request : request.url); }
  };
  const sandbox = {
    URL,
    Response: { error: () => ({ error: true }) },
    self: {
      location: { origin: 'https://hellorun.online' },
      addEventListener: (type, handler) => { handlers[type] = handler; },
      clients: { claim: async () => {} },
      skipWaiting: () => {}
    },
    caches: {
      open: async () => cache,
      keys: async () => [],
      delete: async () => true,
      match: async (url) => store.get(url)
    },
    fetch: async (request) => {
      fetched.push(request.url);
      if (env.offline) throw new TypeError('Failed to fetch');
      return { ok: true, type: 'basic', clone() { return this; } };
    }
  };
  const env = { handlers, store, puts, fetched, offline: false };
  vm.createContext(sandbox);
  vm.runInContext(renderServiceWorker(read('src/public/sw.js'), 'test'), sandbox);
  return env;
}

function fetchEvent(env, { url, method = 'GET', mode = 'cors' }) {
  let responded = null;
  env.handlers.fetch({
    request: { url, method, mode },
    respondWith: (promise) => { responded = promise; }
  });
  return responded;
}

test('service worker ignores writes, cross-origin requests, and API calls', () => {
  const env = loadServiceWorker();
  const base = 'https://hellorun.online';
  assert.equal(fetchEvent(env, { url: `${base}/events/run/register`, method: 'POST', mode: 'navigate' }), null);
  assert.equal(fetchEvent(env, { url: `${base}/my-registrations/1/submit-result`, method: 'POST' }), null);
  assert.equal(fetchEvent(env, { url: `${base}/api/events/1/submissions/strava` }), null);
  assert.equal(fetchEvent(env, { url: `${base}/runner/notifications/unread-count` }), null);
  assert.equal(fetchEvent(env, { url: 'https://unpkg.com/lucide@latest' }), null);
  assert.equal(fetchEvent(env, { url: 'https://fonts.gstatic.com/s/inter.woff2' }), null);
  assert.equal(fetchEvent(env, { url: `${base}/js/vendor/tesseract/tesseract.min.js` }), null);
});

test('service worker never caches page HTML and falls back to the offline page', async () => {
  const env = loadServiceWorker();
  await env.handlers.install({ waitUntil: (promise) => promise });
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(env.store.has('/offline.html'));

  const response = await fetchEvent(env, { url: 'https://hellorun.online/runner/dashboard', mode: 'navigate' });
  assert.equal(response.ok, true);
  assert.deepEqual(env.puts, [], 'navigation responses must not be written to the cache');

  env.offline = true;
  const fallback = await fetchEvent(env, { url: 'https://hellorun.online/events', mode: 'navigate' });
  assert.equal(fallback.url, '/offline.html');
});

test('service worker caches same-origin static assets only', async () => {
  const env = loadServiceWorker();
  const response = await fetchEvent(env, { url: 'https://hellorun.online/css/style.css' });
  assert.equal(response.ok, true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(env.puts, ['https://hellorun.online/css/style.css']);
});
