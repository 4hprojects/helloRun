(function () {
  var modal = document.querySelector('[data-submission-hub-modal]');
  if (!modal) return;

  var dialog = modal.querySelector('.submission-hub-modal-dialog');
  var titleEl = modal.querySelector('[data-submission-hub-modal-title]');
  var openNewLink = modal.querySelector('[data-submission-hub-modal-open-new]');
  var closeButtons = modal.querySelectorAll('[data-submission-hub-modal-close]');
  var body = document.getElementById('js-sub-modal-body');
  var loadingEl = document.getElementById('js-sub-panel-loading');

  var activeLink = null;
  var currentSubmissionId = null;
  var lightboxTrigger = null;
  var csrfToken = (document.querySelector('[name="_csrf"]') || {}).value || '';

  function getFocusable(container) {
    return Array.from(container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(function (element) { return !element.hidden && element.offsetParent !== null; });
  }

  // ── Open / Close ────────────────────────────────────────────────────────────

  function openModal(link) {
    activeLink = link;
    var submissionId = link.dataset.submissionId || '';
    currentSubmissionId = submissionId;
    titleEl.textContent = 'Loading…';
    if (openNewLink) openNewLink.style.display = 'none';
    showLoading();
    modal.hidden = false;
    document.body.classList.add('submission-hub-modal-open');
    dialog.focus();
    if (submissionId) loadPanel(submissionId);
  }

  function closeModal() {
    closeLightbox();
    modal.hidden = true;
    document.body.classList.remove('submission-hub-modal-open');
    if (activeLink) activeLink.focus();
    activeLink = null;
    currentSubmissionId = null;
  }

  function showLoading() {
    body.innerHTML = '';
    if (loadingEl) {
      var clone = loadingEl.cloneNode(true);
      clone.style.display = '';
      body.appendChild(clone);
    } else {
      body.innerHTML = '<div class="sub-panel-loading"><span>Loading…</span></div>';
    }
  }

  // ── AJAX Panel Load ─────────────────────────────────────────────────────────

  function loadPanel(submissionId) {
    fetch('/organizer/submissions/' + submissionId + '/review-panel', {
      headers: { Accept: 'application/json' }
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.success) throw new Error(data.message || 'Failed to load');
        renderPanel(data.submission);
      })
      .catch(function (err) {
        body.innerHTML = '<div class="sub-panel-error"><p>Could not load submission: ' + (err.message || 'Unknown error') + '</p><a href="#" class="btn btn-outline" data-submission-hub-modal-close>Close</a></div>';
      });
  }

  // ── Panel Renderer ───────────────────────────────────────────────────────────

  function renderPanel(s) {
    titleEl.textContent = s.participantName || 'Submission';
    if (openNewLink) {
      openNewLink.href = s.fullPageUrl || '#';
      openNewLink.style.display = '';
    }

    var isPending = s.status === 'submitted';
    var isApproved = s.status === 'approved';
    var isRejected = s.status === 'rejected';

    // OCR warnings
    var ocrWarnings = [];
    if (s.ocrData) {
      if (s.ocrData.distanceMismatch) ocrWarnings.push('Distance mismatch (extracted: ' + s.ocrData.extractedDistanceKm + ' km)');
      if (s.ocrData.timeMismatch) ocrWarnings.push('Time mismatch (extracted: ' + (s.ocrData.ocrTimeLabel || '?') + ')');
      if (s.ocrData.dateMismatch) ocrWarnings.push('Date mismatch (extracted: ' + (s.ocrData.extractedRunDate || '?') + ')');
      if (s.ocrData.nameMatchStatus === 'mismatched') ocrWarnings.push('Name mismatch (extracted: ' + (s.ocrData.extractedName || '?') + ')');
    }
    var hasWarnings = s.suspiciousFlag || (s.reviewSignal && s.reviewSignal.label) || ocrWarnings.length > 0;

    var html = '<div class="sub-review-panel">';

    // Header row
    html += '<div class="sub-panel-meta">';
    html += '<div><strong>' + esc(s.participantName) + '</strong><br><small>' + esc(s.participantEmail) + '</small></div>';
    html += '<span class="status-badge status-badge-' + esc(s.status) + '">' + esc(s.status === 'submitted' ? 'Pending Review' : s.status) + '</span>';
    html += '</div>';
    html += '<div class="sub-panel-tags"><span class="mode-badge">' + esc(s.eventTitle) + '</span> <span class="mode-badge">' + esc(s.confirmationCode) + '</span> <span class="mode-badge">' + esc(s.proofTypeLabel) + '</span></div>';

    // Two-column body
    html += '<div class="sub-panel-body">';

    // Left: proof
    html += '<div class="sub-panel-proof">';
    if (s.proofUrl && s.isProofImage) {
      html += '<img src="' + esc(s.proofUrl) + '" alt="Proof" class="sub-panel-proof-img js-lightbox-trigger" data-lightbox-src="' + esc(s.proofUrl) + '">';
    } else if (s.proofUrl) {
      html += '<a href="' + esc(s.proofUrl) + '" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">Open Proof ↗</a>';
    } else {
      html += '<div class="sub-panel-no-proof">No proof file</div>';
    }
    html += '</div>';

    // Right: metrics
    html += '<dl class="sub-panel-metrics">';
    html += '<div><dt>Distance</dt><dd>' + esc(s.distanceKm) + ' km</dd></div>';
    html += '<div><dt>Time</dt><dd>' + esc(s.elapsedLabel) + '</dd></div>';
    html += '<div><dt>Date</dt><dd>' + esc(s.runDateLabel) + '</dd></div>';
    html += '<div><dt>Type</dt><dd>' + esc(s.runType) + '</dd></div>';
    if (s.raceDistance) html += '<div><dt>Category</dt><dd>' + esc(s.raceDistance) + '</dd></div>';
    if (s.runLocation) html += '<div><dt>Location</dt><dd>' + esc(s.runLocation) + '</dd></div>';
    html += '</dl>';
    html += '</div>'; // sub-panel-body

    // Warnings
    if (hasWarnings) {
      html += '<div class="sub-panel-warnings">';
      if (s.suspiciousFlag) html += '<p class="sub-panel-warning-item">⚠ ' + esc(s.suspiciousFlagReason || 'Suspicious activity flagged') + '</p>';
      if (s.reviewSignal && s.reviewSignal.label) html += '<p class="sub-panel-warning-item">⚠ ' + esc(s.reviewSignal.label) + '</p>';
      ocrWarnings.forEach(function (w) { html += '<p class="sub-panel-warning-item">⚠ ' + esc(w) + '</p>'; });
      html += '</div>';
    }

    // OCR confidence (compact)
    if (s.ocrData && s.ocrData.confidence > 0) {
      html += '<div class="sub-panel-ocr-confidence">OCR confidence: ' + s.ocrData.confidence + '%</div>';
    }

    // Admin audit + correction (full-tier admins only)
    if (s.isFullAdmin && s.adminAudit) {
      html += '<div class="sub-panel-admin-audit">';
      html += '<p><strong>Detected Source:</strong> ' + esc(s.adminAudit.detectedSource || 'N/A') + '</p>';
      html += '<p><strong>Validation Method:</strong> ' + esc(s.adminAudit.validationMethod) + '</p>';
      html += '<p><strong>Submission Mode:</strong> ' + esc(s.adminAudit.submissionMode) + '</p>';
      html += '<p><strong>Auto-Approval Eligible:</strong> ' + (s.adminAudit.autoApprovalEligible ? 'Yes' : 'No') + '</p>';
      html += '<p><strong>Review Reason (raw):</strong> ' + esc(s.adminAudit.reviewReasonCode || '(none)') + '</p>';
      html += '</div>';
      html += buildCorrectionFormHtml(s);
    }

    // Action area
    html += '<div class="sub-panel-actions">';
    if (isPending) {
      html += '<form class="sub-panel-approve-form js-panel-approve-form" data-approve-url="' + esc(s.approveUrl) + '">';
      html += '<textarea name="reviewNotes" placeholder="Approval notes (optional)" rows="2" maxlength="1200" class="form-input sub-panel-textarea"></textarea>';
      html += '<button type="submit" class="btn btn-success btn-sm sub-panel-approve-btn">✓ Approve</button>';
      html += '</form>';
      html += '<form class="sub-panel-reject-form js-panel-reject-form" data-reject-url="' + esc(s.rejectUrl) + '">';
      html += '<textarea name="rejectionReason" placeholder="Rejection reason (required, min 5 chars)" rows="2" maxlength="500" required class="form-input sub-panel-textarea"></textarea>';
      html += '<button type="submit" class="btn btn-danger btn-sm sub-panel-reject-btn">✗ Reject</button>';
      html += '</form>';
    } else {
      html += '<div class="sub-panel-reviewed">';
      if (isApproved) html += '<p class="sub-panel-approved-state">✓ Approved</p>';
      if (isRejected) {
        html += '<p class="sub-panel-rejected-state">✗ Rejected</p>';
        if (s.rejectionReason) html += '<p class="sub-panel-rejection-reason"><strong>Reason:</strong> ' + esc(s.rejectionReason) + '</p>';
      }
      if (s.reviewedByName) html += '<p class="sub-panel-reviewer">By ' + esc(s.reviewedByName) + ' · ' + esc(s.reviewedAtLabel) + '</p>';
      html += '</div>';
    }
    html += '</div>'; // sub-panel-actions

    // Footer
    html += '<div class="sub-panel-footer">';
    if (isPending) {
      html += '<button type="button" class="btn btn-sm btn-outline js-panel-next-btn" style="display:none">Next Pending →</button>';
    }
    html += '<a href="' + esc(s.fullPageUrl) + '" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">Open Full Page ↗</a>';
    html += '</div>';

    html += '</div>'; // sub-review-panel
    body.innerHTML = html;

    // Attach form handlers
    var approveForm = body.querySelector('.js-panel-approve-form');
    var rejectForm = body.querySelector('.js-panel-reject-form');
    if (approveForm) approveForm.addEventListener('submit', handleApprove);
    if (rejectForm) rejectForm.addEventListener('submit', handleReject);

    var correctionForm = body.querySelector('.js-panel-correction-form');
    if (correctionForm) correctionForm.addEventListener('submit', handleCorrection);

    // Proof image lightbox
    var lightboxImg = body.querySelector('.js-lightbox-trigger');
    if (lightboxImg) {
      lightboxImg.addEventListener('click', function () {
        openLightbox(lightboxImg.dataset.lightboxSrc, lightboxImg);
      });
    }

    // Lucide icons (if available)
    if (window.lucide) window.lucide.createIcons();
  }

  // ── Inline Approve/Reject ────────────────────────────────────────────────────

  function handleApprove(e) {
    e.preventDefault();
    var form = e.target;
    var url = form.dataset.approveUrl;
    var notes = (form.querySelector('[name="reviewNotes"]') || {}).value || '';
    submitDecision(url, { reviewNotes: notes }, 'approved');
  }

  function handleReject(e) {
    e.preventDefault();
    var form = e.target;
    var url = form.dataset.rejectUrl;
    var reason = (form.querySelector('[name="rejectionReason"]') || {}).value || '';
    if (reason.trim().length < 5) {
      var err = form.querySelector('.sub-panel-form-error') || document.createElement('p');
      err.className = 'sub-panel-form-error';
      err.textContent = 'Rejection reason must be at least 5 characters.';
      form.appendChild(err);
      return;
    }
    submitDecision(url, { rejectionReason: reason }, 'rejected');
  }

  function buildCorrectionFormHtml(s) {
    var options = Array.isArray(s.reviewReasonOptions) ? s.reviewReasonOptions : [];
    var html = '<form class="sub-panel-correction-form js-panel-correction-form" data-correction-url="' + esc(s.correctionUrl) + '">';
    html += '<label>Distance (km)</label><input type="number" step="0.01" min="0.1" max="500" name="distanceKm" value="' + esc(s.distanceKm) + '" class="form-input">';
    html += '<label>Elapsed (HH:MM:SS)</label><input type="text" name="elapsedHms" value="' + esc(s.elapsedLabel) + '" pattern="\\d{1,2}:\\d{2}:\\d{2}" class="form-input">';
    html += '<label>Run Location</label><input type="text" name="runLocation" value="' + esc(s.runLocation) + '" maxlength="200" class="form-input">';
    html += '<label>Run Type</label><select name="runType" class="form-input">';
    ['run', 'walk', 'hike', 'trail_run'].forEach(function (rt) {
      html += '<option value="' + rt + '"' + (s.runType === rt ? ' selected' : '') + '>' + rt + '</option>';
    });
    html += '</select>';
    html += '<label>Review Reason Override</label><select name="reviewReason" class="form-input"><option value="">(none / auto-approved)</option>';
    options.forEach(function (opt) {
      html += '<option value="' + esc(opt.value) + '"' + (s.adminAudit.reviewReasonCode === opt.value ? ' selected' : '') + '>' + esc(opt.label) + '</option>';
    });
    html += '</select>';
    html += '<label><input type="checkbox" name="autoApprovalEligible"' + (s.adminAudit.autoApprovalEligible ? ' checked' : '') + '> Auto-Approval Eligible</label>';
    html += '<button type="submit" class="btn btn-outline btn-sm">Save Correction</button>';
    html += '<p class="sub-panel-muted">Saving does not change approval status — use Approve/Reject above afterward.</p>';
    html += '</form>';
    return html;
  }

  function handleCorrection(e) {
    e.preventDefault();
    var form = e.target;
    var url = form.dataset.correctionUrl;
    var elapsedInput = form.querySelector('[name="elapsedHms"]');
    var parts = String((elapsedInput || {}).value || '00:00:00').split(':').map(function (v) { return Number(v) || 0; });
    var elapsedMs = ((parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)) * 1000;

    var params = new URLSearchParams(new FormData(form));
    params.set('elapsedMs', String(elapsedMs));
    params.delete('elapsedHms');
    if (!form.querySelector('[name="autoApprovalEligible"]').checked) {
      params.set('autoApprovalEligible', 'false');
    }
    params.set('_csrf', csrfToken);

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-csrf-token': csrfToken },
      body: params
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.success) throw new Error(data.message || 'Correction failed');
        loadPanel(currentSubmissionId);
      })
      .catch(function (err) {
        var el = form.querySelector('.sub-panel-form-error') || document.createElement('p');
        el.className = 'sub-panel-form-error';
        el.textContent = 'Correction failed: ' + (err.message || 'Unknown error');
        form.appendChild(el);
      });
  }

  function submitDecision(url, bodyParams, decision) {
    bodyParams._csrf = csrfToken;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-csrf-token': csrfToken },
      body: new URLSearchParams(bodyParams),
      redirect: 'follow'
    })
      .then(function (res) {
        var redirectedUrl = new URL(res.url || window.location.href, window.location.origin);
        if (!res.ok || redirectedUrl.searchParams.get('type') === 'error') {
          throw new Error(redirectedUrl.searchParams.get('msg') || ('Server error ' + res.status));
        }
        showDecisionSuccess(decision);
      })
      .catch(function (err) {
        var panel = body.querySelector('.sub-panel-actions');
        if (panel) {
          var errEl = document.createElement('p');
          errEl.className = 'sub-panel-form-error';
          errEl.textContent = 'Action failed: ' + (err.message || 'Unknown error');
          panel.appendChild(errEl);
        }
      });
  }

  function showDecisionSuccess(decision) {
    var isApproved = decision === 'approved';
    var actionPanel = body.querySelector('.sub-panel-actions');
    if (actionPanel) {
      actionPanel.innerHTML = '<div class="sub-panel-success-state">' +
        (isApproved ? '<span class="sub-panel-approved-state">✓ Approved!</span>' : '<span class="sub-panel-rejected-state">✗ Rejected</span>') +
        '</div>';
    }

    // Update card in list
    updateListCard(currentSubmissionId, decision);

    // Offer the next item without moving the reviewer unexpectedly.
    var footer = body.querySelector('.sub-panel-footer');
    if (footer) {
      var nextBtn = footer.querySelector('.js-panel-next-btn');
      if (nextBtn) {
        nextBtn.style.display = '';
        nextBtn.addEventListener('click', advanceToNextPending);
      }
    }
  }

  function updateListCard(submissionId, decision) {
    var card = document.querySelector('[data-submission-id="' + submissionId + '"]');
    if (!card) return;
    var badge = card.querySelector('.status-badge');
    if (badge) {
      badge.className = 'status-badge status-badge-' + decision;
      badge.textContent = decision === 'approved' ? 'Approved' : 'Rejected';
    }
    card.dataset.status = decision;
    var quickForm = card.querySelector('[data-quick-approval-form]');
    var eligibleCheckbox = card.querySelector('[data-eligible-submission]');
    if (quickForm) quickForm.remove();
    if (eligibleCheckbox) eligibleCheckbox.remove();
    document.dispatchEvent(new CustomEvent('submission:reviewed', { detail: { submissionId: submissionId, decision: decision } }));
  }

  function advanceToNextPending() {
    var pending = Array.from(document.querySelectorAll('[data-submission-id][data-status="submitted"]'));
    if (!pending.length) {
      body.innerHTML = '<div class="sub-panel-all-done"><p>✓ All pending submissions reviewed.</p><button class="btn btn-outline btn-sm" data-submission-hub-modal-close>Close</button></div>';
      return;
    }
    var nextCard = pending[0];
    var nextLink = nextCard.querySelector('[data-submission-modal-link]');
    if (nextLink) openModal(nextLink);
  }

  // ── Lightbox ─────────────────────────────────────────────────────────────────

  function closeLightbox() {
    var lb = document.getElementById('js-sub-lightbox');
    if (!lb || lb.hidden) return;
    lb.hidden = true;
    if (lightboxTrigger) lightboxTrigger.focus();
    lightboxTrigger = null;
  }

  function openLightbox(src, trigger) {
    var lb = document.getElementById('js-sub-lightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'js-sub-lightbox';
      lb.className = 'sub-lightbox-overlay';
      lb.setAttribute('role', 'dialog');
      lb.setAttribute('aria-modal', 'true');
      lb.setAttribute('aria-label', 'Activity proof image');
      lb.innerHTML = '<button type="button" class="sub-lightbox-close" aria-label="Close proof image">×</button><img class="sub-lightbox-img" alt="Activity proof at full size">';
      lb.addEventListener('click', function (event) {
        if (event.target === lb || event.target.closest('.sub-lightbox-close')) closeLightbox();
      });
      document.body.appendChild(lb);
    }
    lightboxTrigger = trigger || document.activeElement;
    lb.querySelector('img').src = src;
    lb.hidden = false;
    lb.querySelector('.sub-lightbox-close').focus();
  }

  // ── Event Listeners ──────────────────────────────────────────────────────────

  document.addEventListener('click', function (event) {
    var link = event.target.closest('[data-submission-modal-link]');
    if (!link) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openModal(link);
  });

  closeButtons.forEach(function (button) {
    button.addEventListener('click', closeModal);
  });

  modal.addEventListener('click', function (event) {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', function (event) {
    var lightbox = document.getElementById('js-sub-lightbox');
    if (lightbox && !lightbox.hidden) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        lightbox.querySelector('.sub-lightbox-close').focus();
      }
      return;
    }
    if (modal.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    var focusable = getFocusable(dialog);
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-submission-hub-modal-close]')) {
      event.preventDefault();
      closeModal();
    }
  });

  function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
