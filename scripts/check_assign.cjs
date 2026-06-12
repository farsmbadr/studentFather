const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
(async () => {
  await c.connect();
  const r = await c.query("SELECT id, name, group_name FROM students WHERE status = 'active' AND group_name != '' ORDER BY group_name LIMIT 10");
  console.log('Sample assigned students:', JSON.stringify(r.rows, null, 2));
  const e = await c.query('SELECT COUNT(*) FROM exam_results');
  console.log('Exam results count:', e.rows[0].count);
  const g = await c.query("SELECT name, COUNT(*) FROM students WHERE status = 'active' AND group_name != '' GROUP BY group_name ORDER BY name");
  console.log('Group counts:', JSON.stringify(g.rows, null, 2));
  await c.end();
})();
