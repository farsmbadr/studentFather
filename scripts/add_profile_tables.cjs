const { Client } = require('pg');

(async () => {
  const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
  await c.connect();

  // Add student_id to absence_records
  await c.query(`ALTER TABLE absence_records ADD COLUMN IF NOT EXISTS student_id text DEFAULT ''`);

  // Payments table
  await c.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id text NOT NULL DEFAULT '',
      student_name text NOT NULL DEFAULT '',
      amount numeric NOT NULL DEFAULT 0,
      date date NOT NULL DEFAULT CURRENT_DATE,
      received_by text NOT NULL DEFAULT '',
      notes text DEFAULT '',
      created_at timestamptz DEFAULT now()
    );
  `);

  // Exam results table (links students to exams)
  await c.query(`
    CREATE TABLE IF NOT EXISTS exam_results (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id text NOT NULL DEFAULT '',
      student_name text NOT NULL DEFAULT '',
      exam_title text NOT NULL DEFAULT '',
      subject text NOT NULL DEFAULT '',
      date date NOT NULL DEFAULT CURRENT_DATE,
      score numeric NOT NULL DEFAULT 0,
      max_score numeric NOT NULL DEFAULT 100,
      created_at timestamptz DEFAULT now()
    );
  `);

  // Attendance notes table
  await c.query(`
    CREATE TABLE IF NOT EXISTS attendance_notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id text NOT NULL DEFAULT '',
      student_name text NOT NULL DEFAULT '',
      note text NOT NULL DEFAULT '',
      date date NOT NULL DEFAULT CURRENT_DATE,
      created_at timestamptz DEFAULT now()
    );
  `);

  // Student groups junction table
  await c.query(`
    CREATE TABLE IF NOT EXISTS student_groups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id text NOT NULL DEFAULT '',
      group_id text NOT NULL DEFAULT '',
      group_name text NOT NULL DEFAULT '',
      created_at timestamptz DEFAULT now()
    );
  `);

  console.log('Profile tables created successfully');
  await c.end();
})();
