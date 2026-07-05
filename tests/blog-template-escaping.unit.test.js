const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

// Guards the stored-XSS class fixed July 5-6, 2026 (analysis SEC-A/SEC-B + CQ-1
// convention sweep): user-controlled scalars must never reach a page through
// unescaped <%-. Convention (see CLAUDE.md → Architecture Notes):
//   <%- %> is allowed ONLY for include(...), JSON bootstraps hardened with
//   .replace(/</g, '<') (or the blog-post safeJson helper), the layout
//   body, and server-sanitized HTML fields named on the allowlist below.
//   Everything else must use <%= %>.

// Expressions allowed inside <%- ... %> anywhere under src/views/
const ALLOWED_RAW_OUTPUT = [
  /^include\(/,
  // JSON embedded in <script> must escape "<" so "</script>" in the data
  // cannot terminate the tag
  /\.replace\(\/<\/g, '\\\\u003c'\)$/,
  /^safeJson\(/,
  // layouts/main.ejs template composition
  /^body$/,
  // Server-sanitized HTML (all pass through utils/sanitize.js before render):
  /^post\.contentHtml( \|\| '')?$/,
  /^\(blogContentParts && blogContentParts\.beforeAd\) \|\| post\.contentHtml$/,
  /^blogContentParts\.afterAd$/,
  /^policyHtml$/,
  /^policy\.contentHtmlPreview \|\| ''$/,
  /^eventDetailsHtml$/,
  /^waiverHtml$/
];

function readTemplate(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

function listEjsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listEjsFiles(fullPath);
    return entry.name.endsWith('.ejs') ? [fullPath] : [];
  });
}

test('all views only use <%- for includes, hardened JSON, and sanitized HTML', () => {
  const viewsRoot = path.resolve(__dirname, '..', 'src/views');
  const violations = [];

  for (const filePath of listEjsFiles(viewsRoot)) {
    const source = fs.readFileSync(filePath, 'utf8');
    const rawTags = [...source.matchAll(/<%-([\s\S]*?)%>/g)].map((match) =>
      match[1].trim().replace(/\s+/g, ' ')
    );
    for (const expression of rawTags) {
      if (!ALLOWED_RAW_OUTPUT.some((pattern) => pattern.test(expression))) {
        violations.push(`${path.relative(viewsRoot, filePath)}: <%- ${expression} %>`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Unescaped <%- output not on the allowlist — use <%= %>, or harden/sanitize and extend the allowlist deliberately:\n${violations.join('\n')}`
  );
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
