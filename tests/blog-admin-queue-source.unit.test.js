const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

test('admin blog management queue uses the shared paginated service and clear manage cards', () => {
  const controller = readSource('src/controllers/blog/admin.controller.js');
  const service = readSource('src/services/admin-blog-management.service.js');
  const queueView = readSource('src/views/admin/blog-queue.ejs');

  assert.match(controller, /listManagedPosts\(req\.query\)/);
  assert.match(service, /\.select\('title slug status category customCategory coverImageUrl/);
  assert.match(service, /\.skip\(skip\)[\s\S]*\.limit\(PAGE_SIZE\)/);
  assert.match(queueView, /post\.coverImageUrl/);
  assert.match(queueView, /Revision review/);
  assert.match(queueView, />Manage<\/a>/);
  assert.doesNotMatch(queueView, /target="_blank"/);
});
