(function () {
  var csrfToken = (document.querySelector('[name="_csrf"]') || {}).value || '';
  var statusTimer = null;

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
    region.classList.toggle('is-error', !!isError);
    window.requestAnimationFrame(function () {
      region.textContent = message;
      region.classList.add('is-visible');
    });
    statusTimer = window.setTimeout(function () {
      region.classList.remove('is-visible');
    }, isError ? 6000 : 3500);
  }

  function setPending(button, pending) {
    button.disabled = pending;
    button.setAttribute('aria-busy', pending ? 'true' : 'false');
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.js-save-event');
    if (!btn) return;

    var slug = btn.dataset.eventSlug;
    if (!slug) return;

    setPending(btn, true);

    fetch('/runner/events/' + encodeURIComponent(slug) + '/save-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      credentials: 'same-origin'
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (!r.ok || !data.success) {
            throw new Error(data.message || 'Could not update this saved event.');
          }
          return data;
        });
      })
      .then(function (data) {
        var isSaved = data.saved;

        // Update every button for this event slug on the page
        document.querySelectorAll('.js-save-event[data-event-slug="' + slug + '"]').forEach(function (b) {
          b.dataset.saved = isSaved ? '1' : '0';
          b.classList.toggle('is-saved', isSaved);
          setPending(b, false);
          b.title = isSaved ? 'Remove from saved' : 'Save event';
          b.setAttribute('aria-label', isSaved ? 'Remove from saved' : 'Save event');

          var label = b.querySelector('.save-label');
          if (label) label.textContent = isSaved ? 'Saved' : 'Save';
        });

        showStatus(isSaved ? 'Event saved.' : 'Event removed from saved events.', false);

        // If unsaved from the dashboard card, remove the card row
        if (!isSaved) {
          var card = document.querySelector('.runner-saved-events-card');
          var row = btn.closest('.item-row');
          if (row) {
            row.remove();
            // Hide section if empty
            if (card && !card.querySelector('.item-row')) card.style.display = 'none';
          }
        }
      })
      .catch(function () {
        setPending(btn, false);
        showStatus('Could not update this saved event. Please try again.', true);
      });
  });
})();
