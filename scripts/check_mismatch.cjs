const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
(async()=>{
  await c.connect();
  const s = await c.query("SELECT id, name, grade FROM students WHERE grade LIKE '%صف%'");
  console.log('Students with "صف" in grade: ' + s.rows.length);
  for (const r of s.rows) console.log(r.id.slice(0,8)+' "'+r.name+'" -> "'+r.grade+'"');
  await c.end();
})();
