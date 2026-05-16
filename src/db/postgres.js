const postgres = require('postgres');

let client = null;

function getPostgresClient() {
  if (client) return client;

  const connectionString = String(process.env.DATABASE_URL || '').trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for Supabase/PostgreSQL access.');
  }

  client = postgres(connectionString, {
    ssl: 'require',
    prepare: false,
    max: Number(process.env.POSTGRES_MAX_CONNECTIONS || 5),
    idle_timeout: Number(process.env.POSTGRES_IDLE_TIMEOUT || 20),
    connect_timeout: Number(process.env.POSTGRES_CONNECT_TIMEOUT || 10)
  });

  return client;
}

async function closePostgresClient() {
  if (!client) return;
  const sql = client;
  client = null;
  await sql.end({ timeout: 5 });
}

module.exports = {
  getPostgresClient,
  closePostgresClient
};
