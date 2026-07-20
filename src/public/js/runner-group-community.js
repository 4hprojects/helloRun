(async function initializeRunningGroupCommunity() {
  'use strict';
  const page = document.querySelector('[data-group-community]');
  if (!page) return;

  const slug = String(page.dataset.groupSlug || '');
  const csrfToken = String(page.dataset.csrfToken || '');
  const currentUserId = String(page.dataset.currentUserId || '');
  const isMember = page.dataset.isMember === 'true';
  const dialog = document.querySelector('[data-group-community-dialog]');
  let restoreFocus = null;
  let confirmAction = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'x-csrf-token': csrfToken, ...(options.headers || {}) }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Request failed.');
    return body;
  };

  function confirm(title, body, action, trigger, danger = false, confirmLabel = '') {
    if (!dialog) return;
    restoreFocus = trigger || document.activeElement;
    dialog.querySelector('[data-dialog-title]').textContent = title;
    dialog.querySelector('[data-dialog-body]').innerHTML = body;
    dialog.querySelector('[data-dialog-status]').textContent = '';
    const button = dialog.querySelector('[data-dialog-confirm]');
    button.textContent = confirmLabel || (danger ? 'Confirm' : 'Continue');
    button.classList.toggle('btn-danger', danger);
    button.classList.toggle('btn-primary', !danger);
    confirmAction = action;
    dialog.showModal();
    button.focus();
  }

  if (dialog) {
    dialog.addEventListener('close', () => restoreFocus?.focus());
    dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]), textarea:not([disabled]), select:not([disabled]), input:not([disabled]), a[href]'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    dialog.querySelector('[data-dialog-confirm]').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await confirmAction?.(dialog);
        dialog.close('confirmed');
      } catch (error) {
        dialog.querySelector('[data-dialog-status]').textContent = error.message;
      } finally { button.disabled = false; }
    });
  }

  const createForm = page.querySelector('[data-announcement-create]');
  if (createForm) {
    const textarea = createForm.querySelector('textarea');
    const count = createForm.querySelector('[data-announcement-count]');
    const syncCount = () => { if (count) count.textContent = String(textarea.value.length); };
    textarea.addEventListener('input', syncCount);
    syncCount();
    createForm.addEventListener('submit', (event) => {
      if (!dialog) return;
      event.preventDefault();
      const content = textarea.value.trim();
      if (!content) return textarea.focus();
      confirm('Post this announcement?', `<p class="runner-group-dialog-preview">${escapeHtml(content)}</p>`, async () => {
        const body = await request(createForm.action, { method: 'POST', body: JSON.stringify({ content }) });
        location.assign(`/runner/groups/${encodeURIComponent(slug)}?type=success&msg=${encodeURIComponent('Announcement posted.')}#announcement-${body.announcementId}`);
      }, createForm.querySelector('button[type="submit"]'), false, 'Post announcement');
    });
  }

  page.addEventListener('click', async (event) => {
    const edit = event.target.closest('[data-announcement-edit]');
    const remove = event.target.closest('[data-announcement-delete]');
    const report = event.target.closest('[data-announcement-report]');
    const history = event.target.closest('[data-announcement-history]');
    if (!edit && !remove && !report && !history) return;
    const card = event.target.closest('[data-announcement-id]');
    const id = card.dataset.announcementId;
    const content = card.querySelector('.runner-group-announcement-content').textContent.trim();
    const base = `/runner/groups/${encodeURIComponent(slug)}/announcements/${encodeURIComponent(id)}`;
    card.querySelector('details')?.removeAttribute('open');
    if (history) {
      try {
        const body = await request(`${base}/history`, { method: 'GET' });
        const owner = String(body.announcement?.authorId || '') === currentUserId;
        confirm('Announcement edit history', `<div class="runner-group-history">${body.versions.map((version) => `<article><strong>${version.isCurrent ? 'Current version' : 'Earlier version'}</strong><p>${escapeHtml(version.content)}</p><time>${new Date(version.effectiveAt).toLocaleString('en-PH')}</time>${owner && !version.isCurrent && !version.isRedacted ? `<button type="button" class="btn btn-outline-danger" data-redact-announcement-revision="${escapeHtml(version.id)}" data-redact-announcement-id="${escapeHtml(id)}">Remove revision text</button>` : ''}</article>`).join('')}</div>`, null, history);
      } catch (error) { if (typeof window.showToast === 'function') window.showToast(error.message); }
    } else if (edit) {
      confirm('Edit announcement', `<label class="runner-group-dialog-field">Announcement<textarea data-dialog-content maxlength="2000" rows="7" required>${escapeHtml(content)}</textarea></label>`, async (node) => {
        const nextContent = node.querySelector('[data-dialog-content]').value.trim();
        await request(base, { method: 'PATCH', body: JSON.stringify({ content: nextContent, expectedUpdatedAt: card.dataset.announcementVersion }) });
        location.reload();
      }, edit, false, 'Save changes');
    } else if (remove) {
      confirm('Delete this announcement?', '<p>The announcement will be removed. Existing discussion records remain available as a tombstone.</p>', async () => {
        await request(base, { method: 'DELETE', body: '{}' });
        location.reload();
      }, remove, true, 'Delete announcement');
    } else {
      const reasons = ['spam','plagiarism','promotion','unsafe_medical','abuse','other'];
      confirm('Report this announcement?', `<label class="runner-group-dialog-field">Reason<select data-report-reason required><option value="">Select a reason</option>${reasons.map((reason) => `<option value="${reason}">${reason.replaceAll('_', ' ')}</option>`).join('')}</select></label><label class="runner-group-dialog-field">Optional note<textarea data-report-note maxlength="500" rows="3"></textarea></label>`, async (node) => {
        const reason = node.querySelector('[data-report-reason]').value;
        if (!reason) throw new Error('Select a reason.');
        await request(`${base}/report`, { method: 'POST', body: JSON.stringify({ reason, note: node.querySelector('[data-report-note]').value }) });
        if (typeof window.showToast === 'function') window.showToast('Report submitted.');
      }, report, false, 'Submit report');
    }
  });

  dialog?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-redact-announcement-revision]');
    if (!button) return;
    const announcementId = button.dataset.redactAnnouncementId;
    const revisionId = button.dataset.redactAnnouncementRevision;
    dialog.close();
    confirm('Remove this revision’s text?', '<p>The earlier wording will be permanently replaced by a redaction marker. Existing report snapshots remain unchanged.</p>', async () => {
      await request(`/runner/groups/${encodeURIComponent(slug)}/announcements/${encodeURIComponent(announcementId)}/history/${encodeURIComponent(revisionId)}/redact`, { method: 'POST', body: '{}' });
      location.reload();
    }, button, true, 'Remove revision');
  });

  try {
    await import('/js/threaded-comments-component.js');
    page.querySelectorAll('[data-group-comments]').forEach((host) => {
      const announcementId = String(host.dataset.announcementId || '');
      const element = host.querySelector('threaded-comments');
      element.configure({
        resourceKey: announcementId,
        endpointBase: `/runner/groups/${encodeURIComponent(slug)}/announcements/${encodeURIComponent(announcementId)}/comments`,
        authenticated: isMember,
        actor: isMember ? { id: currentUserId } : null,
        csrfToken,
        locale: 'en-PH',
        policy: { maxContentLength: 1000, maxReportNoteLength: 500, editWindowMs: 30 * 60 * 1000, maxEdits: 5, replyPreviewSize: 3, reportReasons: ['spam','plagiarism','promotion','unsafe_medical','abuse','other'] },
        labels: { title: 'Discussion', placeholder: 'Add to this discussion…' }
      });
    });
  } catch (error) {
    page.querySelectorAll('[data-comments-bootstrap-status]').forEach((node) => { node.textContent = 'Discussion could not be loaded. Refresh to try again.'; });
  }

  if (window.lucide?.createIcons) window.lucide.createIcons();
})();
