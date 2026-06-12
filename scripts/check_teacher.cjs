const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
(async()=>{
  await c.connect();
  const t = await c.query("SELECT name, subject, subjects, group_names FROM teachers WHERE name IN ('ياسر عبدالله', 'أيمن السيد')");
  for (const row of t.rows) console.log(JSON.stringify(row, null, 2));
  await c.end();
})();
