const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
(async() => {
  await c.connect();
  // Clear subjects ARRAY column and subject TEXT column from all teachers
  const r = await c.query("UPDATE teachers SET subjects = '{}', subject = ''");
  console.log(`Cleared subjects/subject from ${r.rowCount} teachers`);
  // Verify subject_teachers is intact
  const st = await c.query("SELECT count(*) FROM subject_teachers");
  console.log(`subject_teachers records: ${st.rows[0].count}`);
  await c.end();
})();
