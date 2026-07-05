const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

// Guards the stored-XSS class fixed July 5, 2026 (analysis SEC-A/SEC-B):
// author-controlled scalars must never reach the page through unescaped <%-.

const TEMPLATES = [
  'src/views/admin/blog-review.ejs',
  'src/views/blog/author-form.ejs'
];

// The only raw outputs these templates are allowed to keep:
// - include(...) partials
// - JSON script bootstraps hardened with .replace(/</g, '<')
// - post.contentHtml in the review textarea (sanitizer-processed HTML)
const ALLOWED_RAW_OUTPUT = [
  /^include\(/,
  /^JSON\.stringify\(.*\)\.replace\(\/<\/g, '\\\\u003c'\)$/,
  /^post\.contentHtml \|\| ''$/
];

function readTemplate(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

test('blog form templates only use <%- for includes, hardened JSON, and sanitized HTML', () => {
  for (const relativePath of TEMPLATES) {
    const source = readTemplate(relativePath);
    const rawTags = [...source.matchAll(/<%-([\s\S]*?)%>/g)].map((match) => match[1].trim());
    const violations = rawTags.filter(
      (expression) => !ALLOWED_RAW_OUTPUT.some((pattern) => pattern.test(expression))
    );
    assert.deepEqual(
      violations,
      [],
      `${relativePath} emits unescaped <%- output that is not on the allowlist:\n${violations.join('\n')}`
    );
  }
});

test('admin blog review neutralises hostile author-controlled values', () => {
  const source = readTemplate('src/views/admin/blog-review.ejs');
  const lines = source.split('\n');
  const titleLine = lines.find((line) => line.includes('id="adminTitle"'));
  const blocksLine = lines.find((line) => line.includes('let adminBlocks ='));
  assert.ok(titleLine, 'expected the adminTitle input line to exist');
  assert.ok(blocksLine, 'expected the adminBlocks bootstrap line to exist');

  const post = {
    title: '"><img src=x onerror=alert(1)>',
    contentBlocks: [{ text: '</script><script>alert(2)</script>' }]
  };

  const renderedTitle = ejs.render(titleLine, { post });
  assert.ok(!renderedTitle.includes('<img'), 'hostile title must not break out of the value attribute');
  assert.ok(renderedTitle.includes('&lt;img'), 'hostile title should render as escaped text');

  const renderedBlocks = ejs.render(blocksLine, { post });
  assert.ok(!renderedBlocks.includes('</script>'), 'content blocks must not be able to close the script tag');

  // The emitted JSON must still parse back to the original author content.
  const jsonText = renderedBlocks.trim().replace(/^let adminBlocks = /, '').replace(/;$/, '');
  const parsed = JSON.parse(jsonText);
  assert.equal(parsed[0].text, post.contentBlocks[0].text);
});
