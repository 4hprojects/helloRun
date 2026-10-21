const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '../..');
const SOURCE_DIRS = ['src', 'tests'];
const execFileAsync = promisify(execFile);
const MAX_SYNTAX_WORKERS = 12;

function listFiles(directory, predicate) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(absolute, predicate);
    return predicate(absolute) ? [absolute] : [];
  });
}

const javascriptFiles = SOURCE_DIRS.flatMap((directory) => (
  listFiles(path.join(ROOT, directory), (file) => file.endsWith('.js'))
));
const templateFiles = listFiles(path.join(ROOT, 'src/views'), (file) => file.endsWith('.ejs'));
async function main() {
  const failures = [];
  let nextFileIndex = 0;

  async function syntaxWorker() {
    while (nextFileIndex < javascriptFiles.length) {
      const file = javascriptFiles[nextFileIndex];
      nextFileIndex += 1;
      try {
        await execFileAsync(process.execPath, ['--check', file], { encoding: 'utf8' });
      } catch (error) {
        failures.push(`${path.relative(ROOT, file)}\n${error.stderr || error.stdout || error.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: MAX_SYNTAX_WORKERS }, () => syntaxWorker()));

  for (const file of templateFiles) {
    try {
      ejs.compile(fs.readFileSync(file, 'utf8'), {
        filename: file,
        views: [path.join(ROOT, 'src/views')]
      });
    } catch (error) {
      failures.push(`${path.relative(ROOT, file)}\n${error.message}`);
    }
  }

  if (failures.length > 0) {
    console.error(failures.join('\n\n'));
    process.exit(1);
  }

  console.log(`Checked ${javascriptFiles.length} JavaScript files and ${templateFiles.length} EJS templates.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
