const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
(async () => {
  const c = await pool.connect();
  try {
    await c.query("UPDATE app_users SET is_super_admin = false, role = 'موظف' WHERE id = '2c126551-8143-4694-a22e-26196b7af330'");
    console.log('Done');
    const { rows } = await c.query('SELECT id, name, username, role, is_super_admin FROM app_users ORDER BY created_at');
    rows.forEach(r => console.log(r.id.slice(0,8)+'...', r.name, r.username, r.role, r.is_super_admin));
  } finally { c.release(); pool.end(); }
})().catch(e => { console.error(e); process.exit(1); });
