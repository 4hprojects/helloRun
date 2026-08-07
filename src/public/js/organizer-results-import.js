// Results import: check the file, show what would happen, then write only on confirm.

(function () {
  const root = document.querySelector('[data-results-import]');
  if (!root) return;

  const eventId = root.dataset.eventId;
  const csrfToken = root.dataset.csrf || '';

  const fileInput = root.querySelector('[data-import-file]');
  const previewButton = root.querySelector('[data-import-preview]');
  const commitButton = root.querySelector('[data-import-commit]');
  const panel = root.querySelector('[data-import-preview-panel]');
  const status = root.querySelector('[data-import-status]');
  const commitStatus = root.querySelector('[data-import-commit-status]');
  const validCount = root.querySelector('[data-import-valid]');
  const failedCount = root.querySelector('[data-import-failed]');
  const totalCount = root.querySelector('[data-import-total]');
  const errorBox = root.querySelector('[data-import-errors]');
  const errorDownload = root.querySelector('[data-import-error-download]');
  const truncatedNote = root.querySelector('[data-import-truncated]');
  const unmappedNote = root.querySelector('[data-import-unmapped]');

  // Held between preview and confirm, so exactly what was shown is what gets written.
  let readyRows = [];
  let fileName = '';
  let errorObjectUrl = '';

  function setStatus(node, text, tone) {
    if (!node) return;
    node.textContent = text;
    node.classList.remove('is-ok', 'is-warn', 'is-error');
    if (tone) node.classList.add(tone);
  }

  async function preview() {
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) {
      setStatus(status, 'Choose a results file first.', 'is-error');
      return;
    }

    previewButton.disabled = true;
    setStatus(status, 'Reading the file…');
    panel.hidden = true;

    try {
      const body = new FormData();
      body.append('resultsFile', file);

      const response = await fetch(`/organizer/events/${eventId}/result-imports/preview`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        body
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(status, payload.error || 'Could not read that file.', 'is-error');
        return;
      }

      readyRows = Array.isArray(payload.rows) ? payload.rows : [];
      fileName = payload.fileName || file.name;

      validCount.textContent = payload.valid_rows || 0;
      failedCount.textContent = payload.failed_rows || 0;
      totalCount.textContent = payload.total_rows || 0;

      truncatedNote.hidden = !payload.truncated;
      if (payload.truncated) {
        truncatedNote.textContent = `Only the first ${payload.maxRows} rows were read. Split the file and import the rest separately.`;
      }

      unmappedNote.hidden = !(payload.unmappedHeaders && payload.unmappedHeaders.length);
      if (payload.unmappedHeaders && payload.unmappedHeaders.length) {
        unmappedNote.textContent = `Ignored columns: ${payload.unmappedHeaders.join(', ')}.`;
      }

      renderErrors(payload);

      commitButton.disabled = readyRows.length === 0;
      panel.hidden = false;
      setStatus(
        status,
        readyRows.length > 0
          ? 'Nothing has been written yet. Review below, then import.'
          : 'No rows passed validation, so there is nothing to import.',
        readyRows.length > 0 ? 'is-ok' : 'is-warn'
      );
    } catch (error) {
      setStatus(status, 'Network error. Check connection and retry.', 'is-error');
    } finally {
      previewButton.disabled = false;
    }
  }

  function renderErrors(payload) {
    const summary = payload.error_summary && payload.error_summary.summary;
    errorBox.hidden = !summary;
    if (summary) errorBox.textContent = `Rejected rows: ${summary}.`;

    if (errorObjectUrl) URL.revokeObjectURL(errorObjectUrl);
    errorObjectUrl = '';

    if (payload.errorCsv) {
      const blob = new Blob([payload.errorCsv], { type: 'text/csv' });
      errorObjectUrl = URL.createObjectURL(blob);
      errorDownload.href = errorObjectUrl;
      errorDownload.hidden = false;
    } else {
      errorDownload.hidden = true;
    }
  }

  async function commit() {
    if (readyRows.length === 0) return;

    commitButton.disabled = true;
    setStatus(commitStatus, 'Importing…');

    try {
      const response = await fetch(`/organizer/events/${eventId}/result-imports/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ rows: readyRows, fileName })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(commitStatus, payload.error || 'Import failed.', 'is-error');
        commitButton.disabled = false;
        return;
      }

      // Rows can fail at write time even after passing validation — an unknown bib, for
      // instance — so report both halves rather than a flat success.
      const failed = Array.isArray(payload.failed) ? payload.failed : [];
      const detail = failed.length > 0 ? ` First problem: ${failed[0].error}` : '';
      setStatus(
        commitStatus,
        `${payload.message || 'Import complete.'}${detail}`,
        failed.length > 0 ? 'is-warn' : 'is-ok'
      );

      // Prevent a second write of the same rows.
      readyRows = [];
    } catch (error) {
      setStatus(commitStatus, 'Network error. Check connection and retry.', 'is-error');
      commitButton.disabled = false;
    }
  }

  if (previewButton) previewButton.addEventListener('click', preview);
  if (commitButton) commitButton.addEventListener('click', commit);
})();
