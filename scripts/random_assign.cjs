const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

(async () => {
  await c.connect();

  // 1. Shuffle students into groups
  const groups = (await c.query("SELECT id, name, capacity, grade FROM groups ORDER BY name")).rows;
  const students = (await c.query("SELECT id, name, grade, group_name FROM students WHERE status = 'active' ORDER BY name")).rows;
  console.log(`Groups: ${groups.length}, Active students: ${students.length}`);

  // Build pool of available slots per group
  const slots = [];
  for (const g of groups) {
    for (let i = 0; i < g.capacity; i++) {
      slots.push({ groupId: g.id, groupName: g.name, groupGrade: g.grade });
    }
  }

  // Assign each student to a random slot, matching grade if possible
  // Note: student grades no longer have "الصف " prefix; group grades do
  const unmatched = [];
  for (const st of students) {
    // Find slots matching the student's grade first (with or without "الصف " prefix)
    const matching = slots.filter(s => (s.groupGrade === st.grade || s.groupGrade === 'الصف ' + st.grade) && !s.taken);
    const pool = matching.length > 0 ? matching : slots.filter(s => !s.taken);
    if (pool.length === 0) { unmatched.push(st); continue; }
    const chosen = pick(pool);
    chosen.taken = true;
    chosen.studentId = st.id;
    chosen.studentName = st.name;
  }

  // Update group_name for assigned students
  let assigned = 0;
  for (const s of slots) {
    if (s.studentId) {
      await c.query("UPDATE students SET group_name = $1 WHERE id = $2", [s.groupName, s.studentId]);
      assigned++;
    }
  }

  // Reset unassigned students
  for (const st of unmatched) {
    await c.query("UPDATE students SET group_name = '' WHERE id = $1", [st.id]);
  }

  console.log(`Assigned: ${assigned}, Unmatched: ${unmatched.length}`);
  console.log('Done — group assignment complete');

  // 2. Create 50 random exam results
  const exams = (await c.query("SELECT title, subject FROM exams WHERE exam_type = 'إلكتروني'")).rows;
  console.log(`Electronic exams: ${exams.length}`);
  if (exams.length === 0) { console.log('No electronic exams found — skipping exam results'); await c.end(); return; }

  const pick50 = [];
  const shuffled = [...students].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(50, shuffled.length); i++) pick50.push(shuffled[i]);

  let examResults = 0;
  for (const st of pick50) {
    const exam = pick(exams);
    const totalScore = randInt(10, 100);
    const maxScore = 100;
    const answers = [];
    const qIds = [];
    const qCount = randInt(5, 15);
    for (let j = 0; j < qCount; j++) {
      const qId = `q_${j}`;
      qIds.push(qId);
      answers[qId] = ['أ', 'ب', 'ج', 'د', 'صح', 'خطأ'][randInt(0, 5)];
    }
    try {
      await c.query(
        `INSERT INTO exam_results (student_id, student_name, exam_title, subject, score, max_score, answers, questions, date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [st.id, st.name, exam.title, exam.subject, totalScore, maxScore, JSON.stringify(answers), JSON.stringify(qIds), new Date().toISOString()]
      );
      examResults++;
    } catch (e) { console.log('Insert error:', e.message.slice(0, 80)); }
  }
  console.log(`Exam results created: ${examResults}`);

  await c.end();
})();
