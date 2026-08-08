// Transfers: approve or decline. Both change who holds an entry, so the page reloads
// afterwards rather than patching the row — a stale list is how the same entry gets
// approved twice.

(function () {
  const root = document.querySelector('[data-transfers]');
  if (!root) return;

  const eventId = root.dataset.eventId;
  const csrfToken = root.dataset.csrf || '';
  const status = root.querySelector('[data-transfer-status]');

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
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setStatus('Network error. Check connection and retry.', 'is-error');
      if (button) button.disabled = false;
    }
  }

  root.addEventListener('click', (event) => {
    const approve = event.target.closest('[data-transfer-approve]');
    if (approve) {
      if (!window.confirm('Approve this transfer? The entry moves to the new person straight away.')) return;
      return post(
        `/organizer/events/${eventId}/transfers/${approve.dataset.transferApprove}/approve`,
        {},
        approve,
        'Approving…'
      );
    }

    const decline = event.target.closest('[data-transfer-decline]');
    if (decline) {
      const reason = window.prompt('Why are you declining this transfer? (optional)');
      if (reason === null) return; // cancelled the prompt
      return post(
        `/organizer/events/${eventId}/transfers/${decline.dataset.transferDecline}/decline`,
        { reason },
        decline,
        'Declining…'
      );
    }
    return undefined;
  });
})();
