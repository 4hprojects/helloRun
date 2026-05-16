require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getPostgresClient, closePostgresClient } = require('../db/postgres');

async function main() {
  const sql = getPostgresClient();
  const migrationsDir = path.resolve(__dirname, '..', 'db', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

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
