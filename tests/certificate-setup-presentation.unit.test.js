'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { Window } = require('happy-dom');
const {
  LAYOUTS,
  getCertificateSetupPresentation
} = require('../src/services/certificate-setup-presentation.service');
const { normalizeTemplateInput } = require('../src/services/certificateTemplate.service');

function template(overrides = {}) {
  return {
    status: 'draft',
    layoutKey: 'verified_achievement',
    name: 'Event certificate',
    updatedAt: new Date('2026-07-22T02:00:00Z'),
    publishedAt: null,
    content: { heading: 'Certificate', bodyText: 'Completed {{distance}}.', footerText: '', signatureName: '', signatureRole: '' },
    displayOptions: { showDistance: true, showFinishTime: true, showEventDate: true, showCertificateNumber: true, showQrCode: true },
    styleOptions: { primaryColor: '#0F172A', accentColor: '#FA9A4B', secondaryAccentColor: '#78C0E9', pageSize: 'A4', orientation: 'landscape', customPageWidthMm: 297, customPageHeightMm: 210 },
    assets: {},
    ...overrides
  };
}

test('certificate presentation describes canonical layouts and draft availability', () => {
  const result = getCertificateSetupPresentation({
    event: { title: 'Bayani Run 2026', digitalCertificateEnabled: true },
    template: template()
  });
  assert.deepEqual(LAYOUTS.map((item) => item.value), ['verified_achievement', 'split_panel_event']);
  assert.equal(result.statusLabel, 'Draft template');
  assert.equal(result.certificatesEnabled, true);
  assert.match(result.availabilityCopy, /Publish this draft/);
  assert.equal(result.assetSummary, 'No custom assets');
  assert.equal(result.uploadMaxMb, 5);
});

test('active and disabled presentations expose accurate status and asset totals', () => {
  const result = getCertificateSetupPresentation({
    event: { digitalCertificateEnabled: false },
    template: template({
      status: 'active',
      publishedAt: new Date('2026-07-21T01:00:00Z'),
      assets: {
        backgroundImageUrl: 'https://cdn.example/background.webp',
        eventLogoUrl: 'https://cdn.example/logo.webp',
        sponsorLogoUrls: Array.from({ length: 8 }, (_, index) => `https://cdn.example/sponsor-${index}.webp`)
      }
    })
  });
  assert.equal(result.statusLabel, 'Active template');
  assert.equal(result.certificatesEnabled, false);
  assert.equal(result.assetCount, 8);
  assert.equal(result.sponsorUrls.length, 6);
  assert.match(result.availabilityCopy, /will not receive certificates/);
  assert.ok(result.publishedLabel);
});

test('preview normalization uses submitted values without mutating or saving the template', () => {
  const stored = template();
  let saved = false;
  stored.save = async () => { saved = true; };
  const normalized = normalizeTemplateInput(stored, {
    layoutKey: 'split_panel_event',
    heading: 'Unsaved preview heading',
    primaryColor: '#112233',
    pageSize: 'LETTER',
    orientation: 'portrait',
    showDistance: '0',
    showQrCode: '1'
  });
  assert.equal(normalized.layoutKey, 'split_panel_event');
  assert.equal(normalized.content.heading, 'Unsaved preview heading');
  assert.equal(normalized.styleOptions.primaryColor, '#112233');
  assert.equal(normalized.styleOptions.pageSize, 'LETTER');
  assert.equal(normalized.styleOptions.orientation, 'portrait');
  assert.equal(normalized.displayOptions.showDistance, false);
  assert.equal(stored.layoutKey, 'verified_achievement');
  assert.equal(stored.content.heading, 'Certificate');
  assert.equal(saved, false);
});

test('certificate builder contains status-aware actions, collapsed assets, and accessible dialogs', () => {
  const view = fs.readFileSync(path.resolve(__dirname, '../src/views/organizer/certificate-setup.ejs'), 'utf8');
  const css = fs.readFileSync(path.resolve(__dirname, '../src/public/css/certificate-setup.css'), 'utf8');
  const js = fs.readFileSync(path.resolve(__dirname, '../src/public/js/certificate-setup.js'), 'utf8');
  const controller = fs.readFileSync(path.resolve(__dirname, '../src/controllers/certificateTemplate.controller.js'), 'utf8');

  assert.doesNotThrow(() => ejs.compile(view, { filename: path.resolve(__dirname, '../src/views/organizer/certificate-setup.ejs') }));

  assert.match(view, /certificate-builder-workspace/);
  assert.match(view, /<details class="certificate-panel certificate-assets"/);
  assert.doesNotMatch(view, /<details class="certificate-panel certificate-assets"[^>]*open/);
  assert.match(view, /formtarget="_blank"[^>]*data-preview-certificate/);
  assert.match(view, /Save Active Template/);
  assert.match(view, /data-open-certificate-publish/);
  assert.match(view, /value="CUSTOM"/);
  assert.match(view, /name="customPageWidthMm"/);
  assert.match(view, /name="customPageHeightMm"/);
  assert.match(view, /role="dialog" aria-modal="true"/);
  assert.match(view, /href="\/organizer\/events\/<%= event\._id %>"/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\) 305px/);
  assert.match(css, /position:\s*sticky/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(js, /beforeunload/);
  assert.match(js, /syncPageSizeControls/);
  assert.match(js, /window\.lucide\.createIcons/);
  assert.match(js, /event\.key === 'Escape'/);

  const previewBody = controller.match(/async function postCertificatePreview[\s\S]*?async function postCertificatePublish/)?.[0] || '';
  assert.match(previewBody, /normalizeTemplateInput\(template, req\.body\)/);
  assert.doesNotMatch(previewBody, /await updateTemplate/);
});

test('custom paper size reveals exact dimensions and disables preset orientation', () => {
  const window = new Window({ url: 'https://hellorun.test/organizer/events/event-1/certificate' });
  window.document.body.innerHTML = `
    <form data-certificate-editor>
      <select data-certificate-page-size name="pageSize"><option value="A4" selected>A4</option><option value="CUSTOM">Custom</option></select>
      <label data-certificate-orientation-field><select data-certificate-orientation name="orientation"><option>landscape</option></select><small data-certificate-orientation-help></small></label>
      <div data-certificate-custom-size-fields><input name="customPageWidthMm"><input name="customPageHeightMm"></div>
    </form>`;
  window.lucide = { createIcons() {} };
  window.eval(fs.readFileSync(path.resolve(__dirname, '../src/public/js/certificate-setup.js'), 'utf8'));
  const size = window.document.querySelector('[data-certificate-page-size]');
  const fields = window.document.querySelector('[data-certificate-custom-size-fields]');
  const orientation = window.document.querySelector('[data-certificate-orientation]');
  assert.equal(fields.hidden, true);
  assert.equal(orientation.disabled, false);
  size.value = 'CUSTOM';
  size.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(fields.hidden, false);
  assert.equal(orientation.disabled, true);
  assert.match(window.document.querySelector('[data-certificate-orientation-help]').textContent, /final orientation/);
});

test('certificate publication and unsaved-asset dialogs restore focus and protect editor changes', () => {
  const window = new Window({ url: 'https://hellorun.test/organizer/events/event-1/certificate' });
  window.document.body.innerHTML = `
    <main><form id="certificateTemplateForm" data-certificate-editor><input name="heading"><button data-save-certificate>Save</button></form>
      <button type="submit" form="certificateTemplateForm" data-open-certificate-publish>Publish</button>
      <form data-certificate-assets-form><input type="file"><button type="submit">Upload</button></form>
    </main>
    <div class="certificate-dialog hidden" id="certificatePublishDialog" aria-hidden="true"><section role="dialog" tabindex="-1"><button data-close-certificate-dialog>Cancel</button><button data-confirm-certificate-publish>Confirm</button></section></div>
    <div class="certificate-dialog hidden" id="certificateUnsavedAssetsDialog" aria-hidden="true"><section role="dialog" tabindex="-1"><button data-close-certificate-dialog>Keep editing</button><button data-confirm-asset-upload>Upload anyway</button></section></div>`;
  window.lucide = { createIcons() {} };
  window.eval(fs.readFileSync(path.resolve(__dirname, '../src/public/js/certificate-setup.js'), 'utf8'));

  const publish = window.document.querySelector('[data-open-certificate-publish]');
  publish.focus();
  publish.click();
  const publishDialog = window.document.getElementById('certificatePublishDialog');
  assert.equal(publishDialog.classList.contains('hidden'), false);
  assert.equal(publishDialog.getAttribute('aria-hidden'), 'false');
  publishDialog.querySelector('[data-close-certificate-dialog]').click();
  assert.equal(publishDialog.classList.contains('hidden'), true);
  assert.equal(window.document.activeElement, publish);

  const input = window.document.querySelector('[name="heading"]');
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  const assetForm = window.document.querySelector('[data-certificate-assets-form]');
  const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
  assetForm.dispatchEvent(submitEvent);
  assert.equal(submitEvent.defaultPrevented, true);
  const unsavedDialog = window.document.getElementById('certificateUnsavedAssetsDialog');
  assert.equal(unsavedDialog.classList.contains('hidden'), false);
  unsavedDialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(unsavedDialog.classList.contains('hidden'), true);
});
