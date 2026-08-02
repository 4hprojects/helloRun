'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const BEGIN_MARKER = '# BEGIN HELLORUN SCHEDULED BLOG PUBLISHER';
const END_MARKER = '# END HELLORUN SCHEDULED BLOG PUBLISHER';

function quoteShell(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function buildCronBlock({
  repositoryRoot = path.resolve(__dirname, '../..'),
  nodeExecutable = process.execPath,
  logPath = path.join(os.homedir(), '.pm2/logs/hellorun-scheduled-blog.log')
} = {}) {
  const scriptPath = path.join(repositoryRoot, 'src/scripts/publish-scheduled-blogs.js');
  const command = [
    '*/5 * * * *',
    `cd ${quoteShell(repositoryRoot)}`,
    `&& ${quoteShell(nodeExecutable)} ${quoteShell(scriptPath)}`,
    `>> ${quoteShell(logPath)} 2>&1`
  ].join(' ');
  return [BEGIN_MARKER, command, END_MARKER].join('\n');
}

function reconcileCrontab(existingCrontab, block) {
  const existing = String(existingCrontab || '').trimEnd();
  const markerPattern = new RegExp(
    `${BEGIN_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`,
    'g'
  );
  const withoutManagedBlock = existing.replace(markerPattern, '').trimEnd();
  return `${withoutManagedBlock ? `${withoutManagedBlock}\n\n` : ''}${block}\n`;
}

function readCrontab() {
  try {
    return execFileSync('crontab', ['-l'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (error) {
    if (error.status === 1) return '';
    throw error;
  }
}

function installScheduledPublisherCron({ apply = false } = {}) {
  const repositoryRoot = path.resolve(__dirname, '../..');
  const logPath = path.join(os.homedir(), '.pm2/logs/hellorun-scheduled-blog.log');
  const block = buildCronBlock({ repositoryRoot, logPath });
  const current = readCrontab();
  const reconciled = reconcileCrontab(current, block);
  const changed = current !== reconciled;

  if (apply && changed) {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    execFileSync('crontab', ['-'], { input: reconciled, encoding: 'utf8' });
  }

  return { apply, changed, repositoryRoot, nodeExecutable: process.execPath, logPath, crontab: reconciled };
}

function main() {
  const unsupported = process.argv.slice(2).filter((argument) => !['--apply', '--dry-run'].includes(argument));
  if (unsupported.length) throw new Error(`Unsupported argument: ${unsupported[0]}`);
  if (process.argv.includes('--apply') && process.argv.includes('--dry-run')) {
    throw new Error('Choose either --apply or --dry-run, not both.');
  }
  const result = installScheduledPublisherCron({ apply: process.argv.includes('--apply') });
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`${error.name}: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  BEGIN_MARKER,
  END_MARKER,
  buildCronBlock,
  installScheduledPublisherCron,
  reconcileCrontab
};
