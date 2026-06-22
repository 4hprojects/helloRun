(function () {
  var csrfToken = (document.querySelector('[name="_csrf"]') || {}).value || '';

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.js-save-event');
    if (!btn) return;

    var slug = btn.dataset.eventSlug;
    if (!slug) return;

    btn.disabled = true;

    fetch('/runner/events/' + encodeURIComponent(slug) + '/save-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      credentials: 'same-origin'
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) { btn.disabled = false; return; }

        var isSaved = data.saved;

        // Update every button for this event slug on the page
        document.querySelectorAll('.js-save-event[data-event-slug="' + slug + '"]').forEach(function (b) {
          b.dataset.saved = isSaved ? '1' : '0';
          b.classList.toggle('is-saved', isSaved);
          b.disabled = false;
          b.title = isSaved ? 'Remove from saved' : 'Save event';
          b.setAttribute('aria-label', isSaved ? 'Remove from saved' : 'Save event');

          var label = b.querySelector('.save-label');
          if (label) label.textContent = isSaved ? 'Saved' : 'Save';
        });

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
      .catch(function () { btn.disabled = false; });
  });
})();
