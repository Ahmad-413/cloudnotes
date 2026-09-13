require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getPool } = require('../db');

async function main() {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const pool = await getPool();
  console.log('[initdb] Running schema.sql against the database...');
  await pool.query(schema);
  console.log('[initdb] Done. "notes" table is ready.');
  await pool.end();
}

main().catch((err) => {
  console.error('[initdb] Failed:', err);
  process.exit(1);
});
