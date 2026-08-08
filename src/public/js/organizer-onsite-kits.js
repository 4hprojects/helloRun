// Race kit release. The roster renders server-side; only the release action needs JS.

(function () {
  const root = document.querySelector('[data-onsite-kits]');
  if (!root) return;

  const eventId = root.dataset.eventId;
  const csrfToken = root.dataset.csrf || '';

  function setStatus(row, text, modifier) {
    const status = row.querySelector('[data-kit-status]');
    if (!status) return;
    status.textContent = text;
    status.classList.remove('checkin-row-status-done', 'checkin-row-status-error');
    if (modifier) status.classList.add(modifier);
  }

  async function releaseKit(row, button) {
    button.disabled = true;
    setStatus(row, 'Releasing…');

    try {
      const response = await fetch(`/organizer/events/${eventId}/race-kits/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        // An explicit size is a substitution the desk is making on purpose, usually
        // because the size this person chose has run out.
        body: JSON.stringify({
          registrationId: row.dataset.registrationId,
          size: (row.querySelector('[data-kit-size]') || {}).value || ''
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Running out of a size is an ordinary Saturday: leave the button live so the desk
        // can pick another size rather than being stuck on an error.
        setStatus(row, payload.error || 'Could not release this kit.', 'checkin-row-status-error');
        button.disabled = false;
        return;
      }

      row.classList.add('is-checked-in');
      button.remove();
      const picker = row.querySelector('[data-kit-size]');
      if (picker) picker.remove();
      setStatus(
        row,
        payload.size
          ? `Kit released — ${payload.size}${payload.remaining === null ? '' : ` (${payload.remaining} left)`}`
          : 'Kit released',
        'checkin-row-status-done'
      );
    } catch (error) {
      setStatus(row, 'Network error. Check connection and retry.', 'checkin-row-status-error');
      button.disabled = false;
    }
  }

  root.addEventListener('click', function (event) {
    const button = event.target.closest('[data-kit-button]');
    if (!button) return;
    const row = button.closest('[data-kit-row]');
    if (row) releaseKit(row, button);
  });
})();
