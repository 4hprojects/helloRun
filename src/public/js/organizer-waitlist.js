// Waitlist: promote the next person, or take somebody off the list.
//
// Both actions change capacity, so the page reloads on success rather than patching the
// table — a stale "taken" count is how an organiser talks themselves into overselling.

(function () {
  const root = document.querySelector('[data-waitlist]');
  if (!root) return;

  const eventId = root.dataset.eventId;
  const csrfToken = root.dataset.csrf || '';
  const status = root.querySelector('[data-waitlist-status]');

  function setStatus(text, tone) {
    if (!status) return;
    status.textContent = text;
    status.classList.remove('is-ok', 'is-warn', 'is-error');
    if (tone) status.classList.add(tone);
  }

  async function post(url, body, button, pendingText) {
    if (button) button.disabled = true;
    setStatus(pendingText);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(body || {})
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success) {
        setStatus(payload.error || 'That did not work.', 'is-error');
        if (button) button.disabled = false;
        return;
      }

      setStatus(payload.message || 'Done.', 'is-ok');
      // Capacity moved, so re-read it rather than trusting what is on screen.
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setStatus('Network error. Check connection and retry.', 'is-error');
      if (button) button.disabled = false;
    }
  }

  root.addEventListener('click', (event) => {
    const offer = event.target.closest('[data-waitlist-offer]');
    if (offer) {
      const categoryId = offer.dataset.waitlistOffer || '';
      return post(
        `/organizer/events/${eventId}/waitlist/offers`,
        { categoryId },
        offer,
        'Sending the offer…'
      );
    }

    const withdraw = event.target.closest('[data-waitlist-withdraw]');
    if (withdraw) {
      // Irreversible from this page: they would have to join again themselves.
      if (!window.confirm('Remove this person from the waitlist?')) return;
      const entryId = withdraw.dataset.waitlistWithdraw;
      return post(
        `/organizer/events/${eventId}/waitlist/${entryId}/withdraw`,
        {},
        withdraw,
        'Removing…'
      );
    }
    return undefined;
  });
})();
