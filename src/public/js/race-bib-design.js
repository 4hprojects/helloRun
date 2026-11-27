'use strict';

(() => {
  const form = document.getElementById('bibDesignForm');
  if (!form) return;

  const previewImage = document.querySelector('[data-preview-image]');
  const previewStage = document.querySelector('[data-preview-stage]');
  const previewLoading = document.querySelector('[data-preview-loading]');
  const dimensions = document.querySelector('[data-preview-dimensions]');
  const previewMeta = document.querySelector('[data-preview-meta]');
  const warningTitle = document.querySelector('[data-review-title]');
  const warningList = document.querySelector('[data-review-warnings]');
  const socialToggle = form.elements.socialEnabled;
  const socialFields = form.querySelector('[data-social-fields]');
  let previewUrl = '';
  let previewAbort = null;
  let timer = null;

  const warningLabels = {
    artwork_missing: 'Selected artwork is unavailable; output will use the solid fallback.',
    number_contrast: 'Number colors need more contrast.',
    partner_logo_limit: 'Only the first three partner logos can appear.',
    event_title_overflow: 'Sample event title reaches its minimum readable size.',
    runner_name_overflow: 'Sample runner name reaches its minimum readable size.',
    bib_number_overflow: 'Sample bib number reaches its minimum readable size.',
    layout_unknown: 'Choose a supported template.'
  };

  function syncConditionalFields() {
    if (socialFields) socialFields.hidden = !socialToggle?.checked;
  }

  function syncRangeOutput(input) {
    const output = form.querySelector(`[data-range-output="${input.name}"]`);
    if (!output) return;
    output.value = `${input.value}${input.name === 'zoom' ? '×' : '%'}`;
    output.textContent = output.value;
  }

  function showWarnings(headerValue) {
    if (!warningList || !warningTitle) return;
    const warnings = String(headerValue || '').split(',').filter(Boolean);
    warningList.replaceChildren();
    if (!warnings.length) {
      warningTitle.textContent = 'Preview checks passed';
      const item = document.createElement('li');
      item.textContent = 'Number contrast, managed assets, and template bounds pass this proof.';
      warningList.append(item);
      return;
    }
    warningTitle.textContent = `${warnings.length} check${warnings.length === 1 ? '' : 's'} need attention`;
    warnings.forEach((warning) => {
      const item = document.createElement('li');
      item.textContent = warningLabels[warning] || warning.replaceAll('_', ' ');
      warningList.append(item);
    });
  }

  async function refreshPreview() {
    window.clearTimeout(timer);
    previewAbort?.abort();
    previewAbort = new AbortController();
    previewLoading.hidden = false;
    previewStage?.setAttribute('aria-busy', 'true');

    const body = new URLSearchParams();
    for (const [name, value] of new FormData(form)) {
      if (typeof value === 'string') body.append(name, value);
    }

    try {
      const response = await fetch(form.dataset.previewAction, {
        method: 'POST',
        body,
        signal: previewAbort.signal,
        headers: { Accept: 'image/png' },
        credentials: 'same-origin'
      });
      if (!response.ok) throw new Error(await response.text() || 'Preview could not be rendered.');
      const blob = await response.blob();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(blob);
      previewImage.src = previewUrl;
      previewImage.hidden = false;
      const variant = form.elements.previewVariant?.value === 'social' ? 'social' : 'print';
      previewStage.dataset.variant = variant;
      dimensions.textContent = variant === 'social' ? '1800 × 1800' : '1800 × 1080';
      previewMeta.textContent = variant === 'social'
        ? 'Square frame wraps the unchanged printable bib. CTA stays outside print output.'
        : 'Preview, PNG, and PDF share the same 1800 × 1080 print canvas.';
      showWarnings(response.headers.get('X-HelloRun-Design-Warnings'));
    } catch (error) {
      if (error.name === 'AbortError') return;
      previewImage.hidden = true;
      warningTitle.textContent = 'Preview failed';
      warningList.replaceChildren();
      const item = document.createElement('li');
      item.textContent = error.message || 'Preview could not be rendered.';
      warningList.append(item);
    } finally {
      previewLoading.hidden = true;
      previewStage?.setAttribute('aria-busy', 'false');
    }
  }

  function queuePreview() {
    window.clearTimeout(timer);
    timer = window.setTimeout(refreshPreview, 350);
  }

  form.addEventListener('input', (event) => {
    if (event.target.matches('input[type="file"]')) return;
    if (event.target.matches('input[type="range"]')) syncRangeOutput(event.target);
    if (event.target === socialToggle) syncConditionalFields();
    queuePreview();
  });
  form.addEventListener('change', (event) => {
    if (event.target === socialToggle) syncConditionalFields();
    queuePreview();
  });
  document.querySelector('[data-refresh-preview]')?.addEventListener('click', refreshPreview);
  window.addEventListener('beforeunload', () => { if (previewUrl) URL.revokeObjectURL(previewUrl); });

  form.querySelectorAll('input[type="range"]').forEach(syncRangeOutput);
  syncConditionalFields();
  refreshPreview();
})();
