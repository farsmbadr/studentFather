const { Client } = require('pg');

async function main() {
  const db = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
  await db.connect();
  await db.query(`CREATE TABLE IF NOT EXISTS custom_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
  )`);
  console.log('Created custom_roles table');
  await db.end();
}
main().catch(e => { console.error(e); process.exit(1); });
