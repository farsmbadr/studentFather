const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });

const newTeachers = [
  { name: 'د. سامي عبد الرحمن', subject: 'الرياضيات', salary: 11000, phone: '01011111111' },
  { name: 'أ. كريم محمد', subject: 'الفيزياء', salary: 9500, phone: '01022222222' },
  { name: 'م. أحمد علي', subject: 'تكنولوجيا المعلومات', salary: 8000, phone: '01033333333' },
  { name: 'أ. محمد عبد العزيز', subject: 'اللغة الإنجليزية', salary: 9000, phone: '01044444444' },
  { name: 'أ. محمود السيد', subject: 'الكيمياء', salary: 10000, phone: '01055555555' },
  { name: 'أ. أحمد فتحي', subject: 'التربية الدينية', salary: 7000, phone: '01066666666' },
  { name: 'د. خالد يوسف', subject: 'علم النفس', salary: 8500, phone: '01077777777' },
];

(async () => {
  await c.connect();

  // Get subjects map
  const subjRows = await c.query('SELECT id, name FROM subjects');
  const subjectMap = {};
  for (const r of subjRows.rows) subjectMap[r.name] = r.id;

  let added = 0;
  for (const t of newTeachers) {
    // Check if teacher already exists
    const existing = await c.query('SELECT id FROM teachers WHERE name = $1', [t.name]);
    if (existing.rows.length > 0) {
      console.log(`Skipped (exists): ${t.name}`);
      continue;
    }

    // Insert teacher
    const r = await c.query(
      `INSERT INTO teachers (name, phone, subject, salary, hire_date, status)
       VALUES ($1, $2, $3, $4, $5, 'active') RETURNING id`,
      [t.name, t.phone, t.subject, t.salary, '2025-09-01']
    );
    const teacherId = r.rows[0].id;

    // Link to primary subject
    if (subjectMap[t.subject]) {
      await c.query(
        'INSERT INTO subject_teachers (subject_id, teacher_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [subjectMap[t.subject], teacherId]
      );
    }

    // Link to 1-2 additional random subjects (for variety)
    const otherSubjects = Object.keys(subjectMap).filter(s => s !== t.subject);
    const shuffled = otherSubjects.sort(() => Math.random() - 0.5);
    const extraCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < extraCount && i < shuffled.length; i++) {
      await c.query(
        'INSERT INTO subject_teachers (subject_id, teacher_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [subjectMap[shuffled[i]], teacherId]
      );
    }

    added++;
    console.log(`Added: ${t.name} (${t.subject})`);
  }

  console.log(`\nTotal added: ${added}`);
  const total = await c.query('SELECT COUNT(*) FROM teachers');
  console.log(`Total teachers now: ${total.rows[0].count}`);

  await c.end();
})();
