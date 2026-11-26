'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const VIEW_ROOT = path.join(ROOT, 'src/views/admin/ocr-training');
const PAGE_NAMES = ['overview', 'analytics', 'audit', 'samples', 'platforms', 'jobs', 'models', 'settings'];

test('every OCR admin page uses the shared accessible shell and local navigation script', () => {
  for (const name of PAGE_NAMES) {
    const source = fs.readFileSync(path.join(VIEW_ROOT, `${name}.ejs`), 'utf8');
    assert.match(source, /<main class="[^"]*ocr-admin-page[^"]*" id="main-content">/, `${name} needs the main landmark target`);
    assert.match(source, /include\('_header'\)/, `${name} needs the shared OCR header`);
    assert.match(source, /src="\/js\/admin-ocr\.js"/, `${name} needs active-tab positioning`);
  }
});

test('shared OCR header renders one page title and one current grouped-navigation link', () => {
  const file = path.join(VIEW_ROOT, '_header.ejs');
  const source = fs.readFileSync(file, 'utf8');
  for (const section of PAGE_NAMES) {
    const html = ejs.render(source, { section, flags: [], message: null }, { filename: file });
    assert.equal((html.match(/<h1>/g) || []).length, 1, `${section} needs one h1`);
    assert.equal((html.match(/aria-current="page"/g) || []).length, 1, `${section} needs one current section`);
    assert.match(html, /data-ocr-active-tab/);
  }
  for (const label of ['Monitor', 'Improve', 'Train', 'Configure']) assert.match(source, new RegExp(`'${label}'`));
});

test('OCR data tables declare the mobile card contract', () => {
  for (const name of PAGE_NAMES) {
    const source = fs.readFileSync(path.join(VIEW_ROOT, `${name}.ejs`), 'utf8');
    const tables = source.match(/<table class="admin-table ocr-table[^"]*"/g) || [];
    for (const table of tables) assert.match(table, /ocr-responsive-table/, `${name} has a table without mobile cards`);
  }
});

test('OCR local navigation script only adjusts horizontal position when overflowed', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/public/js/admin-ocr.js'), 'utf8');
  assert.match(source, /navigation\.scrollWidth <= navigation\.clientWidth/);
  assert.match(source, /navigation\.scrollLeft \+= centeredOffset/);
  assert.doesNotMatch(source, /scrollIntoView|behavior:\s*['"]smooth/);
});
