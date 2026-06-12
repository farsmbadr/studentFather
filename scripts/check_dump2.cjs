const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
(async()=>{
  await c.connect();
  const t = await c.query("SELECT name, subjects, group_names FROM teachers ORDER BY created_at");
  for (const r of t.rows) {
    const s = r.subjects && r.subjects.length > 0 ? r.subjects.slice(0,3) : '(empty)';
    const g = r.group_names && r.group_names.length > 0 ? r.group_names.slice(0,3) : '(empty)';
    console.log(`${r.name}: subjects=${JSON.stringify(s)}, groups=${JSON.stringify(g)}`);
  }
  await c.end();
})();
