const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const failures = [];

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute) : [absolute];
  });
}

const jsonFiles = [
  path.join(ROOT, 'package.json'),
  path.join(ROOT, 'package-lock.json'),
  ...listFiles(path.join(ROOT, 'src/public')).filter((file) => file.endsWith('.json'))
];

for (const file of jsonFiles) {
  const source = fs.readFileSync(file, 'utf8');
  try {
    const formatted = `${JSON.stringify(JSON.parse(source), null, 2)}\n`;
    if (source !== formatted) failures.push(`${path.relative(ROOT, file)} is not canonical two-space JSON.`);
  } catch (error) {
    failures.push(`${path.relative(ROOT, file)} is invalid JSON: ${error.message}`);
  }
}

const automationFiles = [
  ...listFiles(path.join(ROOT, '.github')),
  ...listFiles(path.join(ROOT, 'src/scripts')).filter((file) => file.endsWith('.js'))
];
for (const file of automationFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.endsWith('\n')) failures.push(`${path.relative(ROOT, file)} must end with a newline.`);
  const conflictLine = source.split(/\r?\n/).findIndex((line) => /^(?:<{7}|={7}|>{7})(?: |$)/.test(line));
  if (conflictLine >= 0) failures.push(`${path.relative(ROOT, file)}:${conflictLine + 1} contains a merge marker.`);
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Checked ${jsonFiles.length} JSON files and ${automationFiles.length} automation files without rewriting them.`);
