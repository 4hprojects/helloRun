// Registrant import: check the file, show what would happen, write only on confirm.

(function () {
  const root = document.querySelector('[data-registrant-import]');
  if (!root) return;

  const eventId = root.dataset.eventId;
  const csrfToken = root.dataset.csrf || '';

  const el = {
    file: root.querySelector('[data-import-file]'),
    preview: root.querySelector('[data-import-preview]'),
    commit: root.querySelector('[data-import-commit]'),
    panel: root.querySelector('[data-import-preview-panel]'),
    status: root.querySelector('[data-import-status]'),
    commitStatus: root.querySelector('[data-import-commit-status]'),
    ready: root.querySelector('[data-import-ready]'),
    rejected: root.querySelector('[data-import-rejected]'),
    total: root.querySelector('[data-import-total]'),
    errors: root.querySelector('[data-import-errors]'),
    errorDownload: root.querySelector('[data-import-error-download]'),
    truncated: root.querySelector('[data-import-truncated]'),
    unmapped: root.querySelector('[data-import-unmapped]'),
    sendEmails: root.querySelector('[data-import-send-emails]')
  };

  // Held between preview and confirm, so exactly what was shown is what gets written.
  let readyRows = [];
  let errorObjectUrl = '';

  function setStatus(node, text, tone) {
    if (!node) return;
    node.textContent = text;
    node.classList.remove('is-ok', 'is-warn', 'is-error');
    if (tone) node.classList.add(tone);
  }

  async function preview() {
    const file = el.file && el.file.files && el.file.files[0];
    if (!file) {
      setStatus(el.status, 'Choose a file first.', 'is-error');
      return;
    }

    el.preview.disabled = true;
    setStatus(el.status, 'Reading the file…');
    el.panel.hidden = true;

    try {
      const body = new FormData();
      body.append('resultsFile', file);

      const response = await fetch(`/organizer/events/${eventId}/registrant-imports/preview`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        body
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(el.status, payload.error || 'Could not read that file.', 'is-error');
        return;
      }

      readyRows = Array.isArray(payload.ready) ? payload.ready : [];
      el.ready.textContent = payload.readyCount || 0;
      el.rejected.textContent = payload.rejectedCount || 0;
      el.total.textContent = payload.totalRows || 0;

      el.truncated.hidden = !payload.truncated;
      if (payload.truncated) {
        el.truncated.textContent = `Only the first ${payload.maxRows} rows were read. Split the file and import the rest separately.`;
      }

      el.unmapped.hidden = !(payload.unmappedHeaders && payload.unmappedHeaders.length);
      if (payload.unmappedHeaders && payload.unmappedHeaders.length) {
        el.unmapped.textContent = `Ignored columns: ${payload.unmappedHeaders.join(', ')}.`;
      }

      renderErrors(payload);

      el.commit.disabled = readyRows.length === 0;
      el.panel.hidden = false;
      setStatus(
        el.status,
        readyRows.length > 0
          ? 'Nothing has been created yet. Review below, then import.'
          : 'No rows passed the checks, so there is nothing to import.',
        readyRows.length > 0 ? 'is-ok' : 'is-warn'
      );
    } catch (error) {
      setStatus(el.status, 'Network error. Check connection and retry.', 'is-error');
    } finally {
      el.preview.disabled = false;
    }
  }

  function renderErrors(payload) {
    const rejected = Array.isArray(payload.rejected) ? payload.rejected : [];
    el.errors.hidden = rejected.length === 0;
    if (rejected.length > 0) {
      // Show the first few inline; the rest are in the download.
      const shown = rejected.slice(0, 5).map((r) => `Row ${r.row}: ${r.error}`);
      el.errors.textContent =
        shown.join(' · ') + (rejected.length > shown.length ? ` · and ${rejected.length - shown.length} more` : '');
    }

    if (errorObjectUrl) URL.revokeObjectURL(errorObjectUrl);
    errorObjectUrl = '';

    if (payload.errorCsv) {
      const blob = new Blob([payload.errorCsv], { type: 'text/csv' });
      errorObjectUrl = URL.createObjectURL(blob);
      el.errorDownload.href = errorObjectUrl;
      el.errorDownload.hidden = false;
    } else {
      el.errorDownload.hidden = true;
    }
  }

  async function commit() {
    if (readyRows.length === 0) return;

    el.commit.disabled = true;
    setStatus(el.commitStatus, 'Importing…');

    try {
      const response = await fetch(`/organizer/events/${eventId}/registrant-imports/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ rows: readyRows, sendEmails: Boolean(el.sendEmails && el.sendEmails.checked) })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(el.commitStatus, payload.error || 'Import failed.', 'is-error');
        el.commit.disabled = false;
        return;
      }

      // Rows can still fail at write time — capacity running out mid-import, for
      // instance — so report both halves rather than a flat success.
      const failed = Array.isArray(payload.failed) ? payload.failed : [];
      const detail = failed.length > 0 ? ` First problem: ${failed[0].error}` : '';
      setStatus(
        el.commitStatus,
        `${payload.message || 'Import complete.'}${detail}`,
        failed.length > 0 ? 'is-warn' : 'is-ok'
      );

      // Prevent a second write of the same rows.
      readyRows = [];
    } catch (error) {
      setStatus(el.commitStatus, 'Network error. Check connection and retry.', 'is-error');
      el.commit.disabled = false;
    }
  }

  if (el.preview) el.preview.addEventListener('click', preview);
  if (el.commit) el.commit.addEventListener('click', commit);
})();
