// Race-day check-in console.
// The participant list renders server-side, so the page stays readable without this
// script; only the check-in action itself needs it.

(function () {
  const root = document.querySelector('[data-checkin-console]');
  if (!root) return;

  const eventId = root.dataset.eventId;
  const csrfToken = root.dataset.csrf || '';

  function setStatus(row, text, modifier) {
    const status = row.querySelector('[data-checkin-status]');
    if (!status) return;
    status.textContent = text;
    status.classList.remove('checkin-row-status-done', 'checkin-row-status-error');
    if (modifier) status.classList.add(modifier);
  }

  async function checkIn(row, button) {
    const registrationId = row.dataset.registrationId;
    if (!registrationId) return;

    button.disabled = true;
    setStatus(row, 'Checking in…');

    try {
      const response = await fetch(`/organizer/events/${eventId}/check-ins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({
          registrationId,
          participationMode: 'onsite',
          verificationMethod: 'manual'
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(row, payload.error || 'Check-in failed. Try again.', 'checkin-row-status-error');
        button.disabled = false;
        return;
      }

      // The server upserts, so a repeat scan is reported rather than duplicated.
      const alreadyCheckedIn = Boolean(payload.checkIn && payload.checkIn.was_already_checked_in);
      row.classList.add('is-checked-in');
      button.remove();
      setStatus(row, alreadyCheckedIn ? 'Already checked in' : 'Checked in', 'checkin-row-status-done');
    } catch (error) {
      setStatus(row, 'Network error. Check connection and retry.', 'checkin-row-status-error');
      button.disabled = false;
    }
  }

  root.addEventListener('click', function (event) {
    const button = event.target.closest('[data-checkin-button]');
    if (!button) return;
    const row = button.closest('[data-checkin-row]');
    if (row) checkIn(row, button);
  });
})();
