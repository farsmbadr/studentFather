const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });

(async () => {
  await c.connect();
  console.log('Connected');

  // 1. Add sort_order column
  await c.query('ALTER TABLE grades ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0');

  // 2. Set sort_order
  const num = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
  let o = 1;
  for (const st of ['الابتدائي', 'الإعدادي', 'الثانوي']) {
    const max = st === 'الابتدائي' ? 6 : 3;
    for (let n = 1; n <= max; n++) {
      await c.query('UPDATE grades SET sort_order = $1 WHERE name = $2', [o, 'الصف ' + num[n] + ' ' + st]);
      o++;
    }
  }
  await c.query("UPDATE grades SET sort_order = 99 WHERE sort_order = 0");

  // 3. Show
  const grades = await c.query('SELECT name, sort_order FROM grades ORDER BY sort_order');
  console.log('Grades ordered:'); for (const r of grades.rows) console.log('  ' + r.sort_order + '. ' + r.name);

  // 4. Fix student grades
  const fix = await c.query("UPDATE students SET grade = REPLACE(grade, 'الصف ', '') WHERE grade LIKE 'الصف %'");
  console.log('Fixed ' + fix.rowCount + ' student grades');

  // 5. Student distribution
  const d = await c.query("SELECT grade, COUNT(*) as cnt FROM students WHERE status='active' GROUP BY grade ORDER BY cnt DESC");
  console.log('Student grades:'); for (const r of d.rows) console.log('  "' + r.grade + '": ' + r.cnt);

  await c.end();
})();
