const { Client } = require('pg');

const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });

const SUBJECTS = [
  'اللغة العربية', 'اللغة الإنجليزية', 'الرياضيات', 'العلوم', 'الدراسات الاجتماعية',
  'التربية الدينية', 'الفيزياء', 'الكيمياء', 'الأحياء', 'التاريخ'
];

const GRADES = [
  'الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي',
  'الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي',
  'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'
];

const FIRST_NAMES = ['أحمد', 'محمد', 'عمر', 'علي', 'خالد', 'يوسف', 'محمود', 'عبدالله', 'حسن', 'حسين', 'إبراهيم', 'سليمان', 'نور', 'هادي', 'أمير', 'كريم', 'سامي', 'مصطفى', 'إسماعيل', 'بدر', 'فاطمة', 'مريم', 'سارة', 'نورة', 'هدى', 'آية', 'رنا', 'لينا', 'دينا', 'ياسمين', 'شيماء', 'أسماء', "عفاف", 'خديجة', 'سعاد', 'أمينة', 'جميلة', 'زينب', 'رقية', 'حليمة'];
const LAST_NAMES = ['علي', 'حسن', 'حسين', 'خالد', 'محمود', 'إبراهيم', 'سالم', 'ناصر', 'عبد الله', 'سعيد', 'كمال', 'جمال', 'فتحي', 'محمد', 'أحمد', 'صابر', 'شاكر', 'نادر', 'هاني', 'ماجد', 'عامر', 'عدلي', 'رشاد', 'أمين', 'حمدي', 'وائل', 'نبيل', 'كريم', 'فكري', 'عبد الرحمن'];

const TEACHER_NAMES = ['د. أحمد عبد الله', 'د. محمد إبراهيم', 'أ. عمر حسن', 'أ. خالد سعيد', 'أ. محمود علي', 'د. يوسف كمال', 'أ. عبد الله ناصر', 'أ. حسن فتحي', 'أ. حسين سالم', 'أ. مصطفى شاكر'];

const SCHOOLS = ['مدرسة النصر الابتدائية', 'مدرسة الأمل الإعدادية', 'مدرسة الفتح الثانوية', 'مدرسة الحكمة', 'مدرسة النور', 'مدرسة السلام', 'مدرسة الإيمان', 'مدرسة التحرير', 'مدرسة الواحة', 'مدرسة القاهرة'];
const CITIES = ['القاهرة', 'الجيزة', 'الإسكندرية', 'المنصورة', 'طنطا', 'أسيوط', 'المنيا', 'سوهاج', 'الزقازيق', 'دمنهور'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function seed() {
  await c.connect();

  // Clear all data
  const tables = ['exam_questions', 'exam_results', 'questions', 'payments', 'subject_students', 'group_subjects', 'subject_teachers', 'student_groups', 'exams', 'students', 'teachers', 'groups', 'subjects'];
  for (const t of tables) {
    await c.query(`DELETE FROM ${t}`);
    await c.query(`ALTER SEQUENCE IF EXISTS ${t}_id_seq RESTART WITH 1`);
  }
  console.log('Cleared existing data');

  // 1. Subjects
  const subjectIds = [];
  for (const name of SUBJECTS) {
    const r = await c.query(`INSERT INTO subjects (name) VALUES ($1) RETURNING id`, [name]);
    subjectIds.push(r.rows[0].id);
  }
  console.log(`Created ${subjectIds.length} subjects`);

  // 2. Teachers + subject_teachers
  const teacherIds = [];
  for (let i = 0; i < 10; i++) {
    const name = TEACHER_NAMES[i];
    const phone = `01${randInt(0,1) === 0 ? '0' : '1'}${String(randInt(10000000, 99999999))}`;
    const salary = randInt(3000, 12000);
    const subject = SUBJECTS[i % SUBJECTS.length];
    const r = await c.query(
      `INSERT INTO teachers (name, phone, subject, salary, hire_date, status) VALUES ($1, $2, $3, $4, $5, 'active') RETURNING id`,
      [name, phone, subject, salary, `2024-0${randInt(1,9)}-${String(randInt(10,28)).padStart(2,'0')}`]
    );
    teacherIds.push(r.rows[0].id);
  }
  // Link teachers to 1-3 subjects each
  for (const tid of teacherIds) {
    const count = randInt(1, 3);
    const shuffled = [...subjectIds].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      await c.query(`INSERT INTO subject_teachers (subject_id, teacher_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [shuffled[i], tid]);
    }
  }
  console.log(`Created ${teacherIds.length} teachers`);

  // 3. Groups (10 groups across different grades)
  const groupIds = [];
  const groupNames = ['النخبة', 'المتميزون', 'الأوائل', 'النجوم', 'العباقرة', 'المبدعون', 'الأمل', 'الطموح', 'الإبداع', 'التميز'];
  for (let i = 0; i < 10; i++) {
    const grade = GRADES[i % GRADES.length];
    const fee = randInt(200, 800);
    const r = await c.query(
      `INSERT INTO groups (name, grade, schedule, fee, capacity) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [groupNames[i], grade, `أيام ${['السبت والاثنين','الأحد والثلاثاء','الخميس والجمعة','السبت والأربعاء','الأحد والخميس'][i % 5]}`, fee, randInt(15, 30)]
    );
    groupIds.push(r.rows[0].id);
  }
  // Link groups to 2-4 subjects each
  for (const gid of groupIds) {
    const count = randInt(2, 4);
    const shuffled = [...subjectIds].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      await c.query(`INSERT INTO group_subjects (group_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [gid, shuffled[i]]);
    }
  }
  console.log(`Created ${groupIds.length} groups`);

  // 4. Students (100)
  const studentIds = [];
  const codes = new Set();
  for (let i = 0; i < 100; i++) {
    let code;
    do { code = String(randInt(1000, 9999)); } while (codes.has(code));
    codes.add(code);

    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const grade = GRADES[i % GRADES.length];
    const gender = firstName.endsWith('ة') || ['فاطمة', 'مريم', 'سارة', 'نورة', 'هدى', 'آية', 'رنا', 'لينا', 'دينا', 'ياسمين', 'شيماء', 'أسماء', 'عفاف', 'خديجة', 'سعاد', 'أمينة', 'جميلة', 'زينب', 'رقية', 'حليمة'].includes(firstName) ? 'أنثى' : 'ذكر';
    const monthlyFee = randInt(150, 600);
    const joinDate = `2025-0${randInt(1,9)}-${String(randInt(5,28)).padStart(2,'0')}`;
    const phone = `01${randInt(0,1) === 0 ? '0' : '1'}${String(randInt(10000000, 99999999))}`;
    const parentPhone = `01${randInt(0,1) === 0 ? '0' : '1'}${String(randInt(10000000, 99999999))}`;

    const gid = pick(groupIds);
    const gName = groupNames[groupIds.indexOf(gid)];
    const r = await c.query(
      `INSERT INTO students (name, code, grade, group_name, phone, status, monthly_fee, join_date, parent_name, parent_phone, address, gender, school, division, birth_date)
       VALUES ($1,$2,$3,$4,$5,'active',$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [name, code, grade, gName, phone, monthlyFee, joinDate,
       `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`, parentPhone,
       `${pick(CITIES)}، ${pick(['شارع الجمهورية','شارع النيل','شارع الفتح','شارع السلام','شارع النصر'])}`, gender,
       pick(SCHOOLS), pick(['عام','علمي','أدبي']),
       `${randInt(2008, 2015)}-${String(randInt(1,12)).padStart(2,'0')}-${String(randInt(1,28)).padStart(2,'0')}`]
    );
    studentIds.push(r.rows[0].id);
  }
  console.log(`Created ${studentIds.length} students`);

  // 5. Link students to groups (via student_groups) and update group_id reference
  for (let i = 0; i < studentIds.length; i++) {
    const s = (await c.query(`SELECT group_name FROM students WHERE id = $1`, [studentIds[i]])).rows[0];
    const g = (await c.query(`SELECT id FROM groups WHERE name = $1`, [s.group_name])).rows[0];
    if (g) {
      await c.query(`INSERT INTO student_groups (student_id, group_id, group_name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [studentIds[i], g.id, s.group_name]);
    }

    // Link to 2-4 subjects
    const count = randInt(2, 4);
    const shuffled = [...subjectIds].sort(() => Math.random() - 0.5);
    for (let j = 0; j < count; j++) {
      await c.query(`INSERT INTO subject_students (subject_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [shuffled[j], studentIds[i]]);
    }
  }

  // Update income on subjects
  for (const sid of subjectIds) {
    const r = await c.query(`SELECT COALESCE(SUM(s.monthly_fee),0) as total FROM students s JOIN subject_students ss ON ss.student_id = s.id WHERE ss.subject_id = $1`, [sid]);
    await c.query(`UPDATE subjects SET income = $1 WHERE id = $2`, [r.rows[0].total, sid]);
  }
  console.log('Linked students to groups and subjects');

  // 6. Payments (2-6 months per student)
  let payCount = 0;
  for (const sid of studentIds) {
    const months = randInt(2, 6);
    const s = (await c.query(`SELECT name, monthly_fee FROM students WHERE id = $1`, [sid])).rows[0];
    for (let m = 0; m < months; m++) {
      const month = String(randInt(1, 12)).padStart(2, '0');
      const day = String(randInt(1, 28)).padStart(2, '0');
      const amount = s.monthly_fee * (m === 0 ? 1 : randInt(5, 10) / 10);
      await c.query(
        `INSERT INTO payments (student_id, student_name, amount, date, received_by) VALUES ($1, $2, $3, $4, $5)`,
        [sid, s.name, Math.round(amount), `2025-${month}-${day}`, pick(TEACHER_NAMES)]
      );
      payCount++;
    }
  }
  console.log(`Created ${payCount} payments`);

  // 7. Exams (30 exams across subjects/grades)
  const examIds = [];
  for (let i = 0; i < 30; i++) {
    const subject = pick(SUBJECTS);
    const grade = GRADES[i % GRADES.length];
    const title = `اختبار ${subject} - ${grade}`;
    const teacher = pick(TEACHER_NAMES);
    const maxScore = randInt(20, 100);
    const month = String(randInt(3, 12)).padStart(2, '0');
    const day = String(randInt(1, 28)).padStart(2, '0');
    const r = await c.query(
      `INSERT INTO exams (title, exam_type, subject, grade, teacher, duration, date, max_score, question_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [title, pick(['ورقة', 'إلكتروني', 'ورقة']), subject, grade, teacher, randInt(30, 120),
       `2025-${month}-${day}`, maxScore, randInt(10, 30)]
    );
    examIds.push(r.rows[0].id);
  }
  console.log(`Created ${examIds.length} exams`);

  // 8. Exam results (3-8 results per student)
  let resultCount = 0;
  for (const sid of studentIds) {
    const count = randInt(3, 8);
    const shuffledExams = [...examIds].sort(() => Math.random() - 0.5).slice(0, count);
    const s = (await c.query(`SELECT name FROM students WHERE id = $1`, [sid])).rows[0];
    for (const eid of shuffledExams) {
      const exam = (await c.query(`SELECT title, subject, max_score FROM exams WHERE id = $1`, [eid])).rows[0];
      const score = Math.round(exam.max_score * randInt(30, 100) / 100);
      const month = String(randInt(3, 12)).padStart(2, '0');
      const day = String(randInt(1, 28)).padStart(2, '0');
      await c.query(
        `INSERT INTO exam_results (student_id, student_name, exam_title, subject, date, score, max_score) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sid, s.name, exam.title, exam.subject, `2025-${month}-${day}`, score, exam.max_score]
      );
      resultCount++;
    }
  }
  console.log(`Created ${resultCount} exam results`);

  // 9. Questions (5-15 per subject)
  let qCount = 0;
  const questionTypes = ['اختيار من متعدد', 'صح/خطأ', 'مقالي'];
  const difficulties = ['سهل', 'متوسط', 'صعب'];
  const mcqOptions = [
    ['الفتح', 'النصر', 'الفرقان', 'الإسراء'],
    ['١٠٠', '٢٠٠', '٣٠٠', '٤٠٠'],
    ['الأرض', 'القمر', 'الشمس', 'المريخ'],
    ['الأكسجين', 'الهيدروجين', 'النيتروجين', 'الكربون'],
    ['مصر', 'السعودية', 'العراق', 'سوريا'],
    ['النيل', 'الأمازون', 'المسيسيبي', 'الدانوب'],
  ];
  for (const sid of subjectIds) {
    const count = randInt(5, 15);
    for (let i = 0; i < count; i++) {
      const qtype = pick(questionTypes);
      let options = '[]';
      let correct = 'أ';
      if (qtype === 'اختيار من متعدد') {
        const opts = pick(mcqOptions);
        options = JSON.stringify(opts.map((o, idx) => ({ key: String.fromCharCode(65 + idx), text: o })));
        correct = 'A';
      } else if (qtype === 'صح/خطأ') {
        options = JSON.stringify([{ key: 'A', text: 'صح' }, { key: 'B', text: 'خطأ' }]);
        correct = pick(['A', 'B']);
      } else {
        correct = 'الإجابة النموذجية';
      }
      await c.query(
        `INSERT INTO questions (subject_id, question_text, options, correct_answer, question_type, difficulty) VALUES ($1, $2, $3, $4, $5, $6)`,
        [sid, `سؤال رقم ${i + 1} في ${SUBJECTS[subjectIds.indexOf(sid)]}`, options, correct, qtype, pick(difficulties)]
      );
      qCount++;
    }
  }
  console.log(`Created ${qCount} questions`);

  // 10. Link questions to exams
  let eqCount = 0;
  for (const eid of examIds) {
    const exam = (await c.query(`SELECT subject FROM exams WHERE id = $1`, [eid])).rows[0];
    const subj = await c.query(`SELECT id FROM subjects WHERE name = $1`, [exam.subject]);
    if (subj.rows.length > 0) {
      const questions = await c.query(`SELECT id FROM questions WHERE subject_id = $1 ORDER BY RANDOM() LIMIT $2`, [subj.rows[0].id, randInt(5, 10)]);
      for (let i = 0; i < questions.rows.length; i++) {
        await c.query(
          `INSERT INTO exam_questions (exam_id, question_id, order_number, points) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [eid, questions.rows[i].id, i + 1, randInt(1, 5)]
        );
        eqCount++;
      }
    }
  }
  console.log(`Linked ${eqCount} exam questions`);

  console.log('\n=== Seed Complete! ===');
  console.log(`Subjects: ${subjectIds.length}`);
  console.log(`Teachers: ${teacherIds.length}`);
  console.log(`Groups: ${groupIds.length}`);
  console.log(`Students: ${studentIds.length}`);
  console.log(`Payments: ${payCount}`);
  console.log(`Exams: ${examIds.length}`);
  console.log(`Exam Results: ${resultCount}`);
  console.log(`Questions: ${qCount}`);
  console.log(`Exam-Question Links: ${eqCount}`);

  await c.end();
}

seed().catch(e => { console.error('Seed error:', e.message); process.exit(1); });
