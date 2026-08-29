(function initEventSharing() {
  var widgets = Array.from(document.querySelectorAll('[data-event-share]'));
  var statusTimer = null;
  if (!widgets.length) return;

  function getStatusRegion() {
    var region = document.querySelector('[data-events-action-status]');
    if (region) return region;

    region = document.createElement('div');
    region.className = 'events-action-status';
    region.setAttribute('data-events-action-status', '');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    document.body.appendChild(region);
    return region;
  }

  function showStatus(message, isError) {
    var region = getStatusRegion();
    window.clearTimeout(statusTimer);
    region.textContent = '';
    region.classList.toggle('is-error', Boolean(isError));
    window.requestAnimationFrame(function () {
      region.textContent = message;
      region.classList.add('is-visible');
    });
    statusTimer = window.setTimeout(function () {
      region.classList.remove('is-visible');
    }, isError ? 6000 : 3500);
  }

  function closeWidget(widget, restoreFocus) {
    if (!widget || !widget.open) return;
    widget.open = false;
    if (restoreFocus) widget.querySelector('summary')?.focus();
  }

  function closeOtherWidgets(currentWidget) {
    widgets.forEach(function (widget) {
      if (widget !== currentWidget) closeWidget(widget, false);
    });
  }

  async function copyShareUrl(widget) {
    var value = widget.dataset.shareUrl || window.location.href;
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(value);
      showStatus('Link copied.', false);
    } catch (error) {
      showStatus('Could not copy the link. Please try again.', true);
    }
  }

  widgets.forEach(function (widget) {
    var items = Array.from(widget.querySelectorAll('[role="menuitem"]'));

    widget.addEventListener('toggle', function () {
      if (!widget.open) return;
      closeOtherWidgets(widget);
      items[0]?.focus();
    });

    items.forEach(function (item) {
      item.addEventListener('click', function () {
        if (!item.matches('[data-copy-event-link]')) closeWidget(widget, false);
      });
    });

    widget.querySelector('[data-copy-event-link]')?.addEventListener('click', async function () {
      await copyShareUrl(widget);
      closeWidget(widget, true);
    });
  });

  document.addEventListener('click', function (event) {
    widgets.forEach(function (widget) {
      if (!widget.contains(event.target)) closeWidget(widget, false);
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var openWidget = widgets.find(function (widget) { return widget.open; });
    if (!openWidget) return;
    event.preventDefault();
    closeWidget(openWidget, true);
  });
})();
