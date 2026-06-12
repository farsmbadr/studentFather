const { Client } = require('pg');

async function main() {
  const db = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
  await db.connect();

  const id = 'a6bf197e-5b3f-4da2-9163-a88c9e1c9cd1';
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO app_users (id, name, username, password, role, status, permissions, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO NOTHING
  `, [id, 'مدير النظام', 'admin', '1234', 'مدير', 'active', '["all"]', now]);

  console.log('Super admin restored: a6bf197e-5b3f-4da2-9163-a88c9e1c9cd1');
  await db.end();
}

main().catch(e => { console.error(e); process.exit(1); });
