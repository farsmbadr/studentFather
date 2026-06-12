const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
(async()=>{
  await c.connect();
  const s = await c.query("SELECT id, name, stage FROM subjects ORDER BY name");
  console.log('Subjects:');
  for (const r of s.rows) console.log(`  ${r.id.slice(0,8)} | ${r.name} | ${r.stage || '-'}`);
  const t = await c.query("SELECT id, name, subjects FROM teachers WHERE subjects IS NOT NULL AND array_length(subjects,1) > 0 LIMIT 5");
  console.log('\nTeachers with subjects:');
  for (const r of t.rows) console.log(`  ${r.name} | ${JSON.stringify(r.subjects)}`);
  await c.end();
})();
