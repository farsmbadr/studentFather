const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
(async () => {
  const client = await pool.connect();
  try {
    await client.query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false');
    await client.query("UPDATE app_users SET is_super_admin = true WHERE id = (SELECT id FROM app_users ORDER BY created_at ASC LIMIT 1)");
    await client.query("UPDATE app_users SET is_super_admin = true WHERE id = 'a6bf197e-5b3f-4da2-9163-a88c9e1c9cd1'");
    const { rows } = await client.query('SELECT id, name, username, role, is_super_admin FROM app_users ORDER BY created_at');
    console.log('Users after update:');
    rows.forEach(r => console.log(r.id, r.name, r.username, r.role, r.is_super_admin));
  } finally { client.release(); pool.end(); }
})().catch(e => { console.error(e); process.exit(1); });
