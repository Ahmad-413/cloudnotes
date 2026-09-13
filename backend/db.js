const { Pool } = require('pg');
const { getDatabaseUrl } = require('./secrets');

let pool;

/**
 * Lazily initializes and returns a shared PostgreSQL connection pool.
 * The connection string is resolved either from Secrets Manager or
 * from the DATABASE_URL environment variable (see secrets.js).
 */
async function getPool() {
  if (pool) return pool;

  const connectionString = await getDatabaseUrl();

  pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
  });

  pool.on('error', (err) => {
    console.error('[db] Unexpected error on idle client', err);
  });

  return pool;
}

async function query(text, params) {
  const p = await getPool();
  const start = Date.now();
  const result = await p.query(text, params);
  const durationMs = Date.now() - start;
  console.log(`[db] query executed`, { text, durationMs, rows: result.rowCount });
  return result;
}

module.exports = { getPool, query };
