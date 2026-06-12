const { Client } = require('pg');

(async () => {
  const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
  await c.connect();
  const r = await c.query("UPDATE app_users SET name = 'مدير النظام', role = 'مدير' WHERE username = 'admin' AND name LIKE '%ط%ظ%' RETURNING id, name, username, role");
  if (r.rows.length > 0) {
    console.log('Fixed:', r.rows[0].id, '→', r.rows[0].name, '(' + r.rows[0].role + ')');
  } else {
    console.log('No garbled admin found — checking current admin name...');
    const chk = await c.query("SELECT id, name, username, role FROM app_users WHERE username = 'admin'");
    if (chk.rows.length > 0) {
      const u = chk.rows[0];
      console.log('Admin name is:', JSON.stringify(u.name), 'Role:', JSON.stringify(u.role));
      if (u.name !== 'مدير النظام') {
        await c.query("UPDATE app_users SET name = 'مدير النظام', role = 'مدير' WHERE id = $1", [u.id]);
        console.log('→ Updated to مدير النظام');
      } else {
        console.log('→ Name already correct');
      }
    } else {
      console.log('No admin user found at all');
    }
  }
  await c.end();
})();
