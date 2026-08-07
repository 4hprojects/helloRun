// Onsite results entry and approval. The roster renders server-side; this handles the
// record and approve actions.

(function () {
  const root = document.querySelector('[data-onsite-results]');
  if (!root) return;

  const eventId = root.dataset.eventId;
  const csrfToken = root.dataset.csrf || '';

  function post(path, body) {
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify(body)
    });
  }

  function setStatus(row, text, modifier) {
    const status = row.querySelector('[data-result-status]');
    if (!status) return;
    status.textContent = text;
    status.classList.remove('checkin-row-status-done', 'checkin-row-status-error');
    if (modifier) status.classList.add(modifier);
  }

  async function saveResult(row, button) {
    const input = row.querySelector('[data-result-time]');
    const displayTime = input ? input.value.trim() : '';

    if (!displayTime) {
      setStatus(row, 'Enter a finish time.', 'checkin-row-status-error');
      return;
    }

    button.disabled = true;
    setStatus(row, 'Saving…');

    try {
      const response = await post(`/organizer/events/${eventId}/onsite-results`, {
        registrationId: row.dataset.registrationId,
        displayTime,
        dataSource: 'manual_entry'
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(row, payload.error || 'Could not save this result.', 'checkin-row-status-error');
        button.disabled = false;
        return;
      }

      // A saved result becomes approvable, so surface the button without a reload.
      row.dataset.resultId = (payload.result && payload.result.id) || '';
      button.textContent = 'Update';
      button.disabled = false;
      setStatus(row, 'Recorded', 'checkin-row-status-done');
      ensureApproveButton(row);
    } catch (error) {
      setStatus(row, 'Network error. Check connection and retry.', 'checkin-row-status-error');
      button.disabled = false;
    }
  }

  function ensureApproveButton(row) {
    if (row.querySelector('[data-result-approve]')) return;
    const holder = row.querySelector('.checkin-result-buttons');
    if (!holder) return;
    const approve = document.createElement('button');
    approve.type = 'button';
    approve.className = 'nav-signup-btn checkin-action';
    approve.setAttribute('data-result-approve', '');
    approve.textContent = 'Approve';
    holder.appendChild(approve);
  }

  async function approveResult(row, button) {
    const resultId = row.dataset.resultId;
    if (!resultId) {
      setStatus(row, 'Record a finish time first.', 'checkin-row-status-error');
      return;
    }

    button.disabled = true;
    setStatus(row, 'Approving…');

    try {
      const response = await post(
        `/organizer/events/${eventId}/onsite-results/${resultId}/approve`,
        {}
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(row, payload.error || 'Could not approve this result.', 'checkin-row-status-error');
        button.disabled = false;
        return;
      }

      // The Postgres approval is already committed even if the result could not enter
      // the leaderboard, so say which of the two happened rather than a flat "Approved".
      if (!payload.submissionCreated) {
        setStatus(
          row,
          payload.submissionError || 'Approved, but not in the results yet.',
          'checkin-row-status-error'
        );
        button.disabled = false;
        return;
      }

      row.classList.add('is-checked-in');
      const input = row.querySelector('[data-result-time]');
      if (input) input.disabled = true;
      const holder = row.querySelector('.checkin-result-buttons');
      if (holder) holder.replaceChildren();

      const awards = Number(payload.awardsCreated || 0);
      setStatus(
        row,
        awards > 0 ? `Approved · ${awards} badge${awards === 1 ? '' : 's'}` : 'Approved',
        'checkin-row-status-done'
      );
    } catch (error) {
      setStatus(row, 'Network error. Check connection and retry.', 'checkin-row-status-error');
      button.disabled = false;
    }
  }

  root.addEventListener('click', function (event) {
    const saveButton = event.target.closest('[data-result-save]');
    if (saveButton) {
      const row = saveButton.closest('[data-result-row]');
      if (row) saveResult(row, saveButton);
      return;
    }

    const approveButton = event.target.closest('[data-result-approve]');
    if (approveButton) {
      const row = approveButton.closest('[data-result-row]');
      if (row) approveResult(row, approveButton);
    }
  });
})();
