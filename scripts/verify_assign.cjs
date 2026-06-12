const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
(async () => {
  await c.connect();
  const students = await c.query("SELECT COUNT(*) FROM students WHERE status = 'active' AND group_name != ''");
  console.log('Assigned students:', students.rows[0].count);
  const unassigned = await c.query("SELECT COUNT(*) FROM students WHERE status = 'active' AND (group_name IS NULL OR group_name = '')");
  console.log('Unassigned students:', unassigned.rows[0].count);
  const groups = await c.query("SELECT group_name, COUNT(*)::int as cnt FROM students WHERE status = 'active' AND group_name != '' GROUP BY group_name ORDER BY group_name");
  for (const g of groups.rows) console.log(`  ${g.group_name}: ${g.cnt} طالب`);
  const results = await c.query('SELECT COUNT(*) FROM exam_results');
  console.log('Total exam results:', results.rows[0].count);
  await c.end();
})();
