const { Client } = require('pg');
const c = new Client({ host:'localhost', port:5433, user:'postgres', password:'root', database:'baderp' });
(async()=>{
  await c.connect();
  // Find all كريم محمد teachers
  const teachers = await c.query("SELECT id, name, subject, subjects, group_names FROM teachers WHERE name LIKE '%كريم%'");
  for (const t of teachers.rows) {
    console.log('Teacher:', t.id, t.name);
    console.log('  subject (text):', t.subject);
    console.log('  subjects (array):', JSON.stringify(t.subjects));
    console.log('  group_names:', JSON.stringify(t.group_names));
    // Check subject_teachers
    const st = await c.query("SELECT st.*, s.name as subj_name FROM subject_teachers st JOIN subjects s ON s.id = st.subject_id WHERE st.teacher_id = $1", [t.id]);
    console.log('  subject_teachers:', JSON.stringify(st.rows.map(r => ({ subj: r.subj_name, stId: r.id }))));
  }
  await c.end();
})();
