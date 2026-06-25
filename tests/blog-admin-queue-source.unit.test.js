const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

test('admin published blog queue cards show cover previews and open review in a new tab', () => {
  const controller = readSource('src/controllers/blog.controller.js');
  const queueView = readSource('src/views/admin/blog-queue.ejs');

  assert.match(controller, /\.select\('title slug status category customCategory coverImageUrl/);
  assert.match(queueView, /const opensInNewTab = selectedStatus === 'published'/);
  assert.match(queueView, /<% if \(post\.coverImageUrl\) \{ %>[\s\S]*<img src="<%= post\.coverImageUrl %>"/);
  assert.match(queueView, /object-fit: cover/);
  assert.match(queueView, /justify-content: flex-end/);
  assert.match(queueView, /opensInNewTab \? ' target="_blank" rel="noopener noreferrer"'/);
});
