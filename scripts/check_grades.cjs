const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
(async()=>{
  await c.connect();
  const r = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='grades'");
  console.log('=== GRADES TABLE COLUMNS ===');
  for (const col of r.rows) console.log('  ' + col.column_name + ' (' + col.data_type + ')');
  
  const d = await c.query('SELECT * FROM grades ORDER BY name');
  console.log('\n=== GRADES ===');
  for (const row of d.rows) console.log('  ' + JSON.stringify(row));
  
  const s = await c.query("SELECT grade, COUNT(*) as cnt FROM students WHERE status='active' GROUP BY grade ORDER BY cnt DESC");
  console.log('\n=== STUDENT GRADES ===');
  for (const row of s.rows) console.log('  "' + row.grade + '": ' + row.cnt);
  await c.end();
})();
