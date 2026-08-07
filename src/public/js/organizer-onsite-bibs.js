// Bib assignment: per-row assign/update, plus a previewed sequential range.
// The roster renders server-side, so the page stays readable without this script.

(function () {
  const root = document.querySelector('[data-onsite-bibs]');
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

  function setRowStatus(row, text, modifier) {
    const status = row.querySelector('[data-bib-status]');
    if (!status) return;
    status.textContent = text;
    status.classList.remove('checkin-row-status-done', 'checkin-row-status-error');
    if (modifier) status.classList.add(modifier);
  }

  async function saveRow(row, button) {
    const input = row.querySelector('[data-bib-input]');
    const bibNumber = input ? input.value.trim() : '';
    if (!bibNumber) {
      setRowStatus(row, 'Enter a bib number.', 'checkin-row-status-error');
      return;
    }

    button.disabled = true;
    setRowStatus(row, 'Saving…');

    try {
      const response = await post(`/organizer/events/${eventId}/bibs/assign`, {
        registrationId: row.dataset.registrationId,
        bibNumber
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setRowStatus(row, payload.error || 'Could not assign this bib.', 'checkin-row-status-error');
        button.disabled = false;
        return;
      }

      row.classList.add('is-checked-in');
      row.dataset.hasBib = '1';
      button.textContent = 'Update';
      button.disabled = false;
      setRowStatus(row, 'Saved', 'checkin-row-status-done');
    } catch (error) {
      setRowStatus(row, 'Network error. Check connection and retry.', 'checkin-row-status-error');
      button.disabled = false;
    }
  }

  // Preview state, held between Preview and Confirm so the operator commits exactly
  // what they were shown.
  let pendingAssignments = [];

  function eligibleRows() {
    return Array.from(root.querySelectorAll('[data-bib-row]')).filter(
      (row) => row.dataset.hasBib === '0' && row.dataset.missingShadow === '0'
    );
  }

  function buildPreview() {
    const startInput = root.querySelector('[data-bulk-start]');
    const prefixInput = root.querySelector('[data-bulk-prefix]');
    const output = root.querySelector('[data-bulk-preview-output]');
    const confirmButton = root.querySelector('[data-bulk-confirm]');
    const status = root.querySelector('[data-bulk-status]');

    const start = Number.parseInt(startInput.value, 10);
    if (!Number.isFinite(start) || start < 1) {
      status.textContent = 'Enter a start number of 1 or more.';
      return;
    }

    const prefix = prefixInput.value.trim();
    const rows = eligibleRows();

    if (rows.length === 0) {
      output.hidden = true;
      confirmButton.hidden = true;
      pendingAssignments = [];
      status.textContent = 'Every listed participant already has a bib.';
      return;
    }

    pendingAssignments = rows.map((row, index) => ({
      registrationId: row.dataset.registrationId,
      bibNumber: `${prefix}${start + index}`,
      row
    }));

    const first = pendingAssignments[0].bibNumber;
    const last = pendingAssignments[pendingAssignments.length - 1].bibNumber;
    output.hidden = false;
    output.textContent = `${pendingAssignments.length} participant(s) will get ${first} through ${last}.`;
    confirmButton.hidden = false;
    status.textContent = '';
  }

  async function confirmBulk(confirmButton) {
    if (pendingAssignments.length === 0) return;
    const status = root.querySelector('[data-bulk-status]');

    confirmButton.disabled = true;
    status.textContent = 'Assigning…';

    try {
      const response = await post(`/organizer/events/${eventId}/bibs/assign-bulk`, {
        assignments: pendingAssignments.map(({ registrationId, bibNumber }) => ({
          registrationId,
          bibNumber
        }))
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok && !Array.isArray(payload.assigned)) {
        status.textContent = payload.error || 'Bulk assignment failed.';
        confirmButton.disabled = false;
        return;
      }

      const assignedIds = new Set((payload.assigned || []).map((item) => item.registrationId));
      pendingAssignments.forEach(({ registrationId, bibNumber, row }) => {
        if (!assignedIds.has(registrationId)) return;
        const input = row.querySelector('[data-bib-input]');
        if (input) input.value = bibNumber;
        row.classList.add('is-checked-in');
        row.dataset.hasBib = '1';
        setRowStatus(row, 'Saved', 'checkin-row-status-done');
      });

      // Partial failures are reported rather than swallowed; the failed rows keep
      // their existing state so the operator can retry individually.
      status.textContent = payload.message || 'Assignment complete.';
      if (Array.isArray(payload.failed) && payload.failed.length > 0) {
        payload.failed.forEach((failure) => {
          const row = root.querySelector(`[data-bib-row][data-registration-id="${failure.registrationId}"]`);
          if (row) setRowStatus(row, failure.error || 'Failed', 'checkin-row-status-error');
        });
      }

      pendingAssignments = [];
      confirmButton.hidden = true;
      confirmButton.disabled = false;
      root.querySelector('[data-bulk-preview-output]').hidden = true;
    } catch (error) {
      status.textContent = 'Network error. Check connection and retry.';
      confirmButton.disabled = false;
    }
  }

  root.addEventListener('click', function (event) {
    const saveButton = event.target.closest('[data-bib-save]');
    if (saveButton) {
      const row = saveButton.closest('[data-bib-row]');
      if (row) saveRow(row, saveButton);
      return;
    }

    if (event.target.closest('[data-bulk-preview]')) {
      buildPreview();
      return;
    }

    const confirmButton = event.target.closest('[data-bulk-confirm]');
    if (confirmButton) confirmBulk(confirmButton);
  });
})();
