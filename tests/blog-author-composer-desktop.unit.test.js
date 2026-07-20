'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const root = path.join(__dirname, '..');
const templatePath = path.join(root, 'src/views/blog/author-form.ejs');
const view = fs.readFileSync(templatePath, 'utf8');

test('blog author composer uses a fluid wide desktop canvas', () => {
  assert.match(view, /\.author-form-main\s*\{[^}]*width:\s*100%[^}]*max-width:\s*1440px[^}]*margin:\s*0 auto[^}]*padding:\s*clamp\(/s);
  assert.match(view, /<main class="author-form-main">/);
  assert.doesNotMatch(view, /<main[^>]*max-width\s*:\s*900px/i);
  assert.match(view, /@media \(min-width: 1100px\)/);
});

test('desktop setup fields use a two-column basics and media workspace', () => {
  assert.match(view, /<div class="author-form-setup-grid">[\s\S]*?<section class="form-section post-basics-section"/);
  assert.match(view, /<div class="author-form-media-stack">[\s\S]*?id="coverImageHeading"[\s\S]*?id="galleryHeading"/);
  assert.match(view, /@media \(min-width: 1100px\)[\s\S]*?\.author-form-setup-grid\s*\{\s*grid-template-columns:\s*minmax\(0, 1\.35fr\) minmax\(360px, 0\.85fr\)/);
  assert.match(view, /\.post-basics-grid\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);

  for (const fieldId of ['title', 'excerpt', 'tags']) {
    assert.match(view, new RegExp(`class="form-field post-basics-field-wide"[\\s\\S]*?id="${fieldId}"`));
  }
  assert.match(view, /\.cover-preview-wrap img\s*\{[^}]*width:\s*100%[^}]*aspect-ratio:\s*16 \/ 9[^}]*object-fit:\s*cover/s);
});

test('main content favors editing while keeping an accessible sticky preview', () => {
  assert.match(view, /<div class="composer-editor-column">[\s\S]*?<div class="composer-toolbar">/);
  assert.match(view, /\.composer-shell\s*\{\s*grid-template-columns:\s*minmax\(0, 2fr\) minmax\(360px, 1fr\)/);
  assert.match(view, /\.composer-toolbar\s*\{\s*grid-template-columns:\s*minmax\(280px, 1fr\) minmax\(300px, 0\.9fr\)/);
  assert.match(view, /\.composer-preview\s*\{[^}]*position:\s*sticky[^}]*top:\s*5\.5rem[^}]*max-height:\s*calc\(100vh - 7rem\)[^}]*overflow:\s*auto/s);
  assert.match(view, /<aside class="composer-preview" role="region" aria-label="Live article preview" aria-live="polite" tabindex="0">/);
});

test('desktop actions remain available and smaller screens return to document flow', () => {
  assert.match(view, /@media \(min-width: 1100px\)[\s\S]*?\.form-actions\s*\{[^}]*position:\s*sticky[^}]*bottom:\s*0[^}]*z-index:\s*30/s);
  assert.match(view, /@media \(max-width: 1099px\)[\s\S]*?\.author-form-setup-grid,[\s\S]*?\.composer-shell\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(view, /@media \(max-width: 1099px\)[\s\S]*?\.composer-preview\s*\{[^}]*position:\s*static[^}]*max-height:\s*none[^}]*overflow:\s*visible/s);
  assert.match(view, /@media \(max-width: 1099px\)[\s\S]*?\.form-actions\s*\{\s*position:\s*static/);
});

test('shared composer preserves form compatibility and legacy editing', () => {
  assert.match(view, /<form method="POST" action="<%= formAction %>" enctype="multipart\/form-data" class="author-form">/);
  assert.match(view, /name="_csrf"/);
  assert.match(view, /name="action" id="formActionInput"/);
  assert.match(view, /name="contentBlocksJson"/);
  assert.match(view, /name="contentHtml"/);
  assert.match(view, /name="galleryImageFiles"[^>]*multiple/);
  assert.match(view, /name="publishedAt"/);
  assert.match(view, /name="customCategory"/);
  assert.match(view, /value="save_draft"[^>]*data-submit-action="save_draft"/);
  assert.match(view, /value="submit_review"[^>]*data-submit-action="submit_review"/);
  assert.match(view, /const isLegacyPost = mode === 'edit'/);
  assert.match(view, /<div class="legacy-editor">/);
  assert.doesNotThrow(() => ejs.compile(view, { filename: templatePath }));
});

