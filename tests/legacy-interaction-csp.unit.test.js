const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function filesBelow(relativeDirectory, extensions) {
  const directory = path.join(root, relativeDirectory);
  const files = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (extensions.some((extension) => entry.name.endsWith(extension))) files.push(fullPath);
    }
  };
  visit(directory);
  return files;
}

test('views contain no inline event-handler attributes', () => {
  const violations = [];
  for (const file of filesBelow('src/views', ['.ejs'])) {
    const source = fs.readFileSync(file, 'utf8');
    if (/\son(?:click|change|submit|error|load|input)\s*=/i.test(source)) {
      violations.push(path.relative(root, file));
    }
  }
  assert.deepEqual(violations, []);
});

test('application code contains no native window alert, confirm, or prompt calls', () => {
  const violations = [];
  for (const file of [
    ...filesBelow('src/public/js', ['.js']),
    ...filesBelow('src/views', ['.ejs'])
  ]) {
    if (file.includes(`${path.sep}vendor${path.sep}`)) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (/window\.(?:alert|confirm|prompt)\s*\(/.test(source)) {
      violations.push(path.relative(root, file));
    }
  }
  assert.deepEqual(violations, []);
});

test('same-origin POST forms include a CSRF token', () => {
  const violations = [];
  let postFormCount = 0;
  for (const file of filesBelow('src/views', ['.ejs'])) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/<form\b[\s\S]*?<\/form>/gi)) {
      const form = match[0];
      if (!/\bmethod\s*=\s*["']post["']/i.test(form)) continue;
      if (/\baction\s*=\s*["'](?:mailto|https?):/i.test(form)) continue;
      postFormCount += 1;
      if (!/name\s*=\s*["']_csrf["']/i.test(form)) {
        const line = source.slice(0, match.index).split('\n').length;
        violations.push(`${path.relative(root, file)}:${line}`);
      }
    }
  }
  assert.ok(postFormCount >= 170, 'expected to audit the complete POST form inventory');
  assert.deepEqual(violations, []);
});

test('shared accessible interaction primitives preserve focus and submitter semantics', () => {
  const source = fs.readFileSync(path.join(root, 'src/public/js/main.js'), 'utf8');
  assert.match(source, /window\.helloRunConfirm\s*=/);
  assert.match(source, /window\.helloRunPrompt\s*=/);
  assert.match(source, /window\.helloRunToast\s*=/);
  assert.match(source, /form\.requestSubmit\(submitter \|\| undefined\)/);
  assert.match(source, /activeTrigger\.focus\(\)/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /event\.key === 'Tab'/);
});
