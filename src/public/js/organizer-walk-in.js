// Registering a walk-in from the check-in console.
//
// The panel stays collapsed until asked for: the console's main job on race day is
// checking people in, and a seven-field form in the way of that would be a nuisance.

(function () {
  const root = document.querySelector('[data-checkin-console]');
  if (!root) return;

  const form = root.querySelector('[data-walkin-form]');
  const toggle = root.querySelector('[data-walkin-toggle]');
  const result = root.querySelector('[data-walkin-result]');
  if (!form || !toggle) return;

  const eventId = root.dataset.eventId;
  const csrfToken = root.dataset.csrf || '';

  function setResult(text, tone) {
    if (!result) return;
    result.textContent = text;
    result.classList.remove('is-ok', 'is-warn', 'is-error');
    if (tone) result.classList.add(tone);
  }

  toggle.addEventListener('click', function () {
    form.hidden = !form.hidden;
    toggle.textContent = form.hidden ? 'Add a walk-in' : 'Cancel';
    if (!form.hidden) form.querySelector('input')?.focus();
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    setResult('Registering…');

    // FormData omits unchecked boxes entirely, which is exactly what the server expects
    // for "payment not collected".
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch(`/organizer/events/${eventId}/walk-ins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(payload)
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setResult(body.error || 'Could not register that walk-in.', 'is-error');
        submit.disabled = false;
        return;
      }

      // A bib cannot be assigned until the onsite record exists, so say which it is
      // rather than letting the desk discover it at the bib table.
      const bibNote = body.readyForBib
        ? ' Ready for a bib.'
        : ' Not ready for a bib yet — it will be shortly.';
      const payNote = body.paymentStatus === 'paid' ? '' : ' Payment still outstanding.';
      setResult(
        `${body.message} Code ${body.confirmationCode}.${payNote}${bibNote}`,
        body.readyForBib ? 'is-ok' : 'is-warn'
      );

      form.reset();
      form.hidden = true;
      toggle.textContent = 'Add a walk-in';
    } catch (error) {
      setResult('Network error. Check connection and retry.', 'is-error');
    } finally {
      submit.disabled = false;
    }
  });
})();
