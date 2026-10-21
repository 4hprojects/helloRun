const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute) : [absolute];
  });
}

test('pinned Lucide and Quill browser assets are committed locally', () => {
  assert.match(read('src/public/js/vendor/lucide/lucide.min.js'), /lucide v0\.468\.0/);
  assert.match(read('src/public/js/vendor/quill/quill.min.js'), /Quill Editor v1\.3\.7/);
  assert.match(read('src/public/css/vendor/quill/quill.snow.css'), /\.ql-snow/);
  assert.match(read('src/public/vendor-NOTICES.txt'), /Lucide 0\.468\.0[\s\S]*Quill 1\.3\.7/);
});

test('views reference only the local Lucide and Quill assets', () => {
  const viewRoot = path.join(ROOT, 'src/views');
  const viewSource = listFiles(viewRoot)
    .filter((file) => file.endsWith('.ejs'))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');

  assert.doesNotMatch(viewSource, /https:\/\/(?:unpkg\.com|cdn\.jsdelivr\.net)/i);
  assert.match(viewSource, /\/js\/vendor\/lucide\/lucide\.min\.js/);
  assert.match(viewSource, /\/js\/vendor\/quill\/quill\.min\.js/);
  assert.match(viewSource, /\/css\/vendor\/quill\/quill\.snow\.css/);

  const scriptCount = (viewSource.match(/<script\b/gi) || []).length;
  const nonceCount = (
    viewSource.match(/<script nonce="<%= locals\.cspNonce \|\| String\(\) %>"/gi) || []
  ).length;
  assert.ok(scriptCount > 300, 'Expected the complete view script inventory.');
  assert.equal(nonceCount, scriptCount, 'Every script element must receive the response nonce.');
});

test('CSP no longer grants script, style, or connection access to asset CDNs', () => {
  const server = read('src/server.js');
  assert.doesNotMatch(server, /unpkg\.com|cdn\.jsdelivr\.net/);
  assert.match(server, /script-src-elem 'self' 'nonce-\$\{cspNonce\}'/);
  assert.match(server, /script-src-attr 'none'/);
  assert.doesNotMatch(server, /script-src 'self' 'unsafe-inline'/);
});
