const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const DOCS = path.join(ROOT, 'docs');
const failures = [];

function listMarkdown(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return listMarkdown(absolute);
    return entry.name.endsWith('.md') ? [absolute] : [];
  });
}

function record(file, line, message) {
  failures.push(`${path.relative(ROOT, file)}:${line} ${message}`);
}

const files = listMarkdown(DOCS);
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const lines = source.split(/\r?\n/);
  let inFence = false;
  let fenceMarker = '';
  let h1Count = 0;
  let previousHeading = 0;

  lines.forEach((line, index) => {
    const fence = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      const marker = fence[1][0];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (marker === fenceMarker) {
        inFence = false;
        fenceMarker = '';
      }
      return;
    }
    if (inFence) return;

    const heading = line.match(/^(#{1,6})\s+\S/);
    if (!heading) return;
    const level = heading[1].length;
    if (level === 1) h1Count += 1;
    if (previousHeading > 0 && level > previousHeading + 1) {
      record(file, index + 1, `heading jumps from H${previousHeading} to H${level}.`);
    }
    previousHeading = level;
  });

  if (inFence) record(file, lines.length, 'has an unclosed fenced code block.');
  if (h1Count !== 1) record(file, 1, `must contain exactly one H1; found ${h1Count}.`);

  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of source.matchAll(linkPattern)) {
    let target = match[1].trim();
    if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
    target = target.split(/\s+["']/)[0];
    if (!target || /^(?:[a-z][a-z\d+.-]*:|#|\/)/i.test(target)) continue;
    const pathPart = target.split('#')[0].split('?')[0];
    if (!pathPart) continue;
    let decoded;
    try { decoded = decodeURIComponent(pathPart); } catch { decoded = pathPart; }
    const resolved = path.resolve(path.dirname(file), decoded);
    if (!fs.existsSync(resolved)) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      record(file, line, `broken relative link: ${target}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Audited ${files.length} Markdown files: one H1, balanced fences, heading progression, and relative links.`);
