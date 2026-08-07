require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getPostgresClient, closePostgresClient } = require('../db/postgres');

async function main() {
  const sql = getPostgresClient();
  const migrationsDir = path.resolve(__dirname, '..', 'db', 'migrations');

  // `--only=<filename>` applies a single pending migration instead of the whole queue.
  //
  // Needed because the queue is strictly ordered: one migration that cannot apply blocks
  // every later one, even when they are unrelated. Use this only when the migration is
  // genuinely independent of what it is skipping — check which tables each one touches
  // first, because applying out of order is otherwise how you get a broken schema.
  const onlyArg = process.argv.slice(2).find((arg) => arg.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice('--only='.length).trim() : '';

  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .filter((file) => (only ? file === only : true))
    .sort();

  if (only && files.length === 0) {
    throw new Error(`No migration named ${only}`);
  }
  if (only) {
    console.log(`Applying only ${only}; every other pending migration is left alone.`);
  }

  await sql`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const appliedRows = await sql`select filename from schema_migrations`;
  const applied = new Set(appliedRows.map((row) => row.filename));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip ${file}`);
      continue;
    }

    const fullPath = path.join(migrationsDir, file);
    const statement = fs.readFileSync(fullPath, 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(statement);
      await tx`insert into schema_migrations (filename) values (${file})`;
    });
    console.log(`applied ${file}`);
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePostgresClient();
  });
