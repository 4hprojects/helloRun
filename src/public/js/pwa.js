// src/public/js/pwa.js
// The single owner of HelloRun's install state and service-worker registration.
//
// Install state is published as `data-pwa-install` on <html> so CSS alone decides
// whether "Install HelloRun" controls are visible (no layout logic in JS):
//   unknown      – not decided yet (controls hidden)
//   installable  – Chromium fired `beforeinstallprompt`; clicking opens the native prompt
//   ios-manual   – iPhone/iPad browser tab; clicking opens Add to Home Screen guidance
//   installed    – running as the installed app, or just installed (controls hidden)
//   unsupported  – no install path we can honestly offer (controls hidden)
//
// Any element with `data-pwa-install-action` becomes an install control. The prompt is
// only ever opened from a user click; nothing is shown automatically on page load.
(function () {
  'use strict';

  if (window.HelloRunPWA) return;

  var root = document.documentElement;
  var deferredPrompt = null;
  var guidanceDialog = null;

  function setState(state) {
    root.setAttribute('data-pwa-install', state);
  }

  function getState() {
    return root.getAttribute('data-pwa-install') || 'unknown';
  }

  function isStandalone() {
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    } catch (_) { /* matchMedia unsupported */ }
    // Legacy iOS Safari flag; only consulted as a secondary signal.
    return window.navigator.standalone === true;
  }

  // Targeted iOS detection is used only to choose the manual-instructions path, because
  // iOS exposes no install capability to detect. iPadOS reports a desktop UA, so touch
  // support on "MacIntel" is checked as well. In-app webviews cannot add to Home Screen.
  function isIOSBrowserTab() {
    var ua = window.navigator.userAgent || '';
    var isAppleMobile = /iPhone|iPad|iPod/i.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    if (!isAppleMobile) return false;
    var isInAppWebview = /FBAN|FBAV|Instagram|Line\/|GSA\/|MicroMessenger|TikTok/i.test(ua);
    return !isInAppWebview;
  }

  function resolveInitialState() {
    if (isStandalone()) return 'installed';
    if (isIOSBrowserTab()) return 'ios-manual';
    // Chromium may still fire `beforeinstallprompt`, which upgrades this to installable.
    return 'unsupported';
  }

  function buildGuidanceDialog() {
    var dialog = document.createElement('dialog');
    dialog.className = 'pwa-install-guidance';
    dialog.setAttribute('aria-labelledby', 'pwaInstallGuidanceTitle');

    var heading = document.createElement('h2');
    heading.id = 'pwaInstallGuidanceTitle';
    heading.textContent = 'Install HelloRun';

    var intro = document.createElement('p');
    intro.textContent = 'Add HelloRun to your Home Screen for faster access.';

    var steps = document.createElement('ol');
    [
      'Open your browser’s Share menu.',
      'Choose “Add to Home Screen”.',
      'Confirm by tapping “Add”.'
    ].forEach(function (text) {
      var item = document.createElement('li');
      item.textContent = text;
      steps.appendChild(item);
    });

    var form = document.createElement('form');
    form.method = 'dialog';
    var close = document.createElement('button');
    close.type = 'submit';
    close.className = 'pwa-install-guidance-close';
    close.textContent = 'Got it';
    form.appendChild(close);

    dialog.appendChild(heading);
    dialog.appendChild(intro);
    dialog.appendChild(steps);
    dialog.appendChild(form);
    dialog.addEventListener('click', function (event) {
      // Backdrop click closes the dialog.
      if (event.target === dialog) dialog.close();
    });
    document.body.appendChild(dialog);
    return dialog;
  }

  function showIOSGuidance() {
    if (!guidanceDialog) guidanceDialog = buildGuidanceDialog();
    if (typeof guidanceDialog.showModal === 'function') {
      guidanceDialog.showModal();
    } else {
      guidanceDialog.setAttribute('open', '');
    }
  }

  function requestInstall() {
    var state = getState();
    if (state === 'ios-manual') {
      showIOSGuidance();
      return Promise.resolve('guidance');
    }
    if (state !== 'installable' || !deferredPrompt) return Promise.resolve('unavailable');

    var promptEvent = deferredPrompt;
    // A deferred prompt can be used once; the browser fires a new event if it allows
    // another attempt after a dismissal.
    deferredPrompt = null;
    setState('unsupported');
    promptEvent.prompt();
    return promptEvent.userChoice
      .then(function (choice) { return choice && choice.outcome ? choice.outcome : 'dismissed'; })
      .catch(function () { return 'dismissed'; });
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    if (isStandalone()) return;
    deferredPrompt = event;
    setState('installable');
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    setState('installed');
  });

  try {
    var standaloneQuery = window.matchMedia && window.matchMedia('(display-mode: standalone)');
    if (standaloneQuery && typeof standaloneQuery.addEventListener === 'function') {
      standaloneQuery.addEventListener('change', function (event) {
        if (event.matches) setState('installed');
      });
    }
  } catch (_) { /* matchMedia unsupported */ }

  // One delegated listener covers every install control, including ones rendered later.
  document.addEventListener('click', function (event) {
    var trigger = event.target && event.target.closest
      ? event.target.closest('[data-pwa-install-action]')
      : null;
    if (!trigger) return;
    event.preventDefault();
    requestInstall();
  });

  if (getState() === 'unknown' || !root.hasAttribute('data-pwa-install')) {
    setState(resolveInitialState());
  }

  // ---- Service worker registration and update prompt ----

  function showUpdatePrompt(registration) {
    if (document.querySelector('[data-pwa-update]')) return;
    var bar = document.createElement('div');
    bar.className = 'pwa-update-toast';
    bar.setAttribute('role', 'status');
    bar.setAttribute('data-pwa-update', '');

    var message = document.createElement('span');
    message.textContent = 'A new version of HelloRun is available.';

    var refresh = document.createElement('button');
    refresh.type = 'button';
    refresh.textContent = 'Refresh';
    refresh.addEventListener('click', function () {
      var waiting = registration.waiting;
      if (!waiting) {
        window.location.reload();
        return;
      }
      // Reload only after the new worker has taken control, and only because the user asked.
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        window.location.reload();
      }, { once: true });
      waiting.postMessage({ type: 'SKIP_WAITING' });
    });

    var dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'pwa-update-toast-dismiss';
    dismiss.setAttribute('aria-label', 'Dismiss update message');
    dismiss.textContent = '×';
    dismiss.addEventListener('click', function () { bar.remove(); });

    bar.appendChild(message);
    bar.appendChild(refresh);
    bar.appendChild(dismiss);
    document.body.appendChild(bar);
  }

  function watchForUpdates(registration) {
    // First install (no controlling worker yet) is not an "update".
    if (registration.waiting && navigator.serviceWorker.controller) {
      showUpdatePrompt(registration);
    }
    registration.addEventListener('updatefound', function () {
      var installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', function () {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdatePrompt(registration);
        }
      });
    });
  }

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(watchForUpdates)
        .catch(function () { /* Registration failure must never affect the page. */ });
    });
  }

  window.HelloRunPWA = {
    getState: getState,
    requestInstall: requestInstall,
    showIOSGuidance: showIOSGuidance
  };
})();
