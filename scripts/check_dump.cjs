const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
(async()=>{
  await c.connect();
  const t = await c.query("SELECT id, name, subjects, subject, group_names, pg_typeof(subjects) as subj_type, pg_typeof(group_names) as grp_type FROM teachers LIMIT 3");
  for (const r of t.rows) {
    console.log(`Name: ${r.name}`);
    console.log(`  subject (text): ${JSON.stringify(r.subject)}`);
    console.log(`  subjects: ${JSON.stringify(r.subjects)} (type: ${r.subj_type})`);
    console.log(`  group_names: ${JSON.stringify(r.group_names)} (type: ${r.grp_type})`);
    console.log('');
  }
  await c.end();
})();
