const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
(async()=>{
  await c.connect();
  const g = await c.query("SELECT id, name, grade FROM groups ORDER BY name");
  console.log('=== GROUPS TABLE ===');
  for (const r of g.rows) console.log('  "'+r.name+'" -> grade: "'+r.grade+'"');
  await c.end();
})();
