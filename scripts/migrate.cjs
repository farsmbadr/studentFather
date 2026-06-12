const { Client } = require('pg');

async function main() {
  const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
  await c.connect();

  // Students
  await c.query(`
    CREATE TABLE IF NOT EXISTS students (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      code text NOT NULL,
      grade text NOT NULL DEFAULT '',
      group_name text NOT NULL DEFAULT '',
      phone text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'active',
      monthly_fee numeric NOT NULL DEFAULT 0,
      join_date date NOT NULL DEFAULT CURRENT_DATE,
      created_at timestamptz DEFAULT now(),
      parent_name text DEFAULT '',
      parent_phone text DEFAULT '',
      address text DEFAULT '',
      notes text DEFAULT '',
      photo_url text DEFAULT '',
      gender text DEFAULT 'ط°ظƒط±',
      deleted_at timestamptz,
      password text DEFAULT '',
      booking_deposit numeric DEFAULT 0,
      school text DEFAULT '',
      division text DEFAULT '',
      parent_job text DEFAULT '',
      birth_date date,
      email text DEFAULT '',
      deletion_reason text DEFAULT ''
    );
  `);

  // Absence records
  await c.query(`
    CREATE TABLE IF NOT EXISTS absence_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id text NOT NULL DEFAULT '',
      student_name text NOT NULL DEFAULT '',
      student_code text NOT NULL DEFAULT '',
      grade text NOT NULL DEFAULT '',
      group_name text DEFAULT '',
      date date NOT NULL DEFAULT CURRENT_DATE,
      reason text NOT NULL DEFAULT '',
      created_at timestamptz DEFAULT now()
    );
  `);

  // Payments
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

  // Exam results
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

  // Attendance notes
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

  // Student groups junction
  await c.query(`
    CREATE TABLE IF NOT EXISTS student_groups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id text NOT NULL DEFAULT '',
      group_id text NOT NULL DEFAULT '',
      group_name text NOT NULL DEFAULT '',
      created_at timestamptz DEFAULT now()
    );
  `);

  // Exams
  await c.query(`
    CREATE TABLE IF NOT EXISTS exams (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL DEFAULT '',
      exam_type text NOT NULL DEFAULT 'ظˆط±ظ‚ط©',
      subject text NOT NULL DEFAULT '',
      grade text NOT NULL DEFAULT '',
      teacher text NOT NULL DEFAULT '',
      duration integer NOT NULL DEFAULT 0,
      date timestamptz DEFAULT now(),
      max_score numeric NOT NULL DEFAULT 100,
      created_at timestamptz DEFAULT now()
    );
  `);
  await c.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_type text DEFAULT 'ظˆط±ظ‚ط©'`);
  await c.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS teacher text DEFAULT ''`);
  await c.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS duration integer DEFAULT 0`);

  // Teachers
  await c.query(`
    CREATE TABLE IF NOT EXISTS teachers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL DEFAULT '',
      phone text NOT NULL DEFAULT '',
      subject text NOT NULL DEFAULT '',
      salary numeric NOT NULL DEFAULT 0,
      hire_date date DEFAULT CURRENT_DATE,
      status text NOT NULL DEFAULT 'active',
      notes text DEFAULT '',
      created_at timestamptz DEFAULT now()
    );
  `);

  // Subjects
  await c.query(`
    CREATE TABLE IF NOT EXISTS subjects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL DEFAULT '',
      created_at timestamptz DEFAULT now()
    );
  `);

  // Books
  await c.query(`
    CREATE TABLE IF NOT EXISTS books (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL DEFAULT '',
      subject text NOT NULL DEFAULT '',
      grade text NOT NULL DEFAULT '',
      price numeric NOT NULL DEFAULT 0,
      stock integer NOT NULL DEFAULT 0,
      created_at timestamptz DEFAULT now()
    );
  `);

  // Classes
  await c.query(`
    CREATE TABLE IF NOT EXISTS classes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL DEFAULT '',
      grade text NOT NULL DEFAULT '',
      teacher text NOT NULL DEFAULT '',
      capacity integer NOT NULL DEFAULT 30,
      students_count integer NOT NULL DEFAULT 0,
      created_at timestamptz DEFAULT now()
    );
  `);

  // Groups
  await c.query(`
    CREATE TABLE IF NOT EXISTS groups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL DEFAULT '',
      grade text NOT NULL DEFAULT '',
      schedule text NOT NULL DEFAULT '',
      fee numeric NOT NULL DEFAULT 0,
      capacity integer NOT NULL DEFAULT 20,
      created_at timestamptz DEFAULT now()
    );
  `);

  // Notifications
  await c.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL DEFAULT '',
      message text NOT NULL DEFAULT '',
      target text NOT NULL DEFAULT 'all',
      is_read boolean NOT NULL DEFAULT false,
      created_at timestamptz DEFAULT now()
    );
  `);

  // App users
  await c.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL DEFAULT '',
      username text NOT NULL DEFAULT '',
      password text NOT NULL DEFAULT '',
      role text NOT NULL DEFAULT 'ظ…ظˆط¸ظپ',
      status text NOT NULL DEFAULT 'active',
      is_super_admin boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );
  `);

  // Login logs
  await c.query(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username text NOT NULL DEFAULT '',
      action text NOT NULL DEFAULT 'طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„',
      ip_address text NOT NULL DEFAULT '0.0.0.0',
      success boolean NOT NULL DEFAULT true,
      created_at timestamptz DEFAULT now()
    );
  `);

  // Center config
  await c.query(`
    CREATE TABLE IF NOT EXISTS center_config (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      center_name text NOT NULL DEFAULT 'CenterMasr',
      academic_year text NOT NULL DEFAULT '2025-2026',
      year_start date DEFAULT '2025-09-01',
      year_end date DEFAULT '2026-06-30',
      address text NOT NULL DEFAULT '',
      phone text NOT NULL DEFAULT '',
      email text NOT NULL DEFAULT '',
      created_at timestamptz DEFAULT now()
    );
  `);

  // Student status
  await c.query(`
    CREATE TABLE IF NOT EXISTS student_status (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_name text NOT NULL DEFAULT '',
      student_code text NOT NULL DEFAULT '',
      grade text NOT NULL DEFAULT '',
      status_type text NOT NULL DEFAULT 'ط¬ظٹط¯',
      notes text NOT NULL DEFAULT '',
      date date NOT NULL DEFAULT CURRENT_DATE,
      created_at timestamptz DEFAULT now()
    );
  `);

  // Seed admin user
  await c.query(`
    INSERT INTO app_users (name, username, password, role)
    VALUES ('مدير النظام', 'admin', 'admin123', 'مدير')
    ON CONFLICT DO NOTHING;
  `);

  // Seed center config
  await c.query(`
    INSERT INTO center_config (center_name, academic_year)
    VALUES ('CenterMasr', '2025-2026')
    ON CONFLICT DO NOTHING;
  `);

  // Subject <-> Teachers junction
  await c.query(`
    CREATE TABLE IF NOT EXISTS subject_teachers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      UNIQUE(subject_id, teacher_id)
    );
  `);

  // Subject <-> Students junction
  await c.query(`
    CREATE TABLE IF NOT EXISTS subject_students (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      UNIQUE(subject_id, student_id)
    );
  `);

  // Income column on subjects
  await c.query(`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS income numeric(10,2) DEFAULT 0`);

  // Group <-> Subjects junction
  await c.query(`
    CREATE TABLE IF NOT EXISTS group_subjects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      UNIQUE(group_id, subject_id)
    );
  `);

  // Questions bank
  await c.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
      question_text text NOT NULL DEFAULT '',
      options jsonb DEFAULT '[]',
      correct_answer text NOT NULL DEFAULT '',
      question_type text NOT NULL DEFAULT 'ط§ط®طھظٹط§ط± ظ…ظ† ظ…طھط¹ط¯ط¯',
      difficulty text NOT NULL DEFAULT 'ظ…طھظˆط³ط·',
      created_at timestamptz DEFAULT now()
    );
  `);

  // Exam <-> Questions junction
  await c.query(`
    CREATE TABLE IF NOT EXISTS exam_questions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      order_number integer NOT NULL DEFAULT 0,
      points numeric NOT NULL DEFAULT 1,
      created_at timestamptz DEFAULT now(),
      UNIQUE(exam_id, question_id)
    );
  `);

  // Extra columns on exams for electronic exams
  await c.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_link text DEFAULT ''`);
  await c.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS closing_date timestamptz`);
  await c.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS question_count integer DEFAULT 0`);
  await c.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS group_name text DEFAULT ''`);
  await c.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS stage text DEFAULT ''`);
  await c.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS selection_mode text DEFAULT 'manual'`);
  await c.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS auto_config jsonb DEFAULT '{}'`);

  // Per-question answers on exam_results for review mode
  await c.query(`ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS answers jsonb DEFAULT '{}'`);
  // Question IDs per student (to show exact same questions in review mode)
  await c.query(`ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS questions jsonb DEFAULT '[]'`);
  await c.query(`ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS essay_scores jsonb DEFAULT '{}'`);

  // Suppliers table for book suppliers
  await c.query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL DEFAULT '',
      phone text DEFAULT '',
      address text DEFAULT '',
      notes text DEFAULT '',
      created_at timestamptz DEFAULT now()
    );
  `);

  // Financial columns for suppliers
  await c.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS opening_balance numeric(10,2) DEFAULT 0`);

  // Purchase fields on books
  await c.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS purchase_price numeric(10,2) DEFAULT 0`);
  await c.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS selling_price numeric(10,2) DEFAULT 0`);
  await c.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id)`);
  await c.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS discount_value numeric(10,2) DEFAULT 0`);
  await c.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'amount'`);
  await c.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS paid_amount numeric(10,2) DEFAULT 0`);
  await c.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS is_general boolean DEFAULT false`);

  // Supplier transactions ledger
  await c.query(`
    CREATE TABLE IF NOT EXISTS supplier_transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      type text NOT NULL DEFAULT 'purchase',
      amount numeric(10,2) NOT NULL DEFAULT 0,
      description text DEFAULT '',
      date date NOT NULL DEFAULT CURRENT_DATE,
      book_id uuid REFERENCES books(id),
      created_at timestamptz DEFAULT now()
    );
  `);
  await c.query(`ALTER TABLE supplier_transactions ADD COLUMN IF NOT EXISTS book_id uuid`);
  await c.query(`ALTER TABLE supplier_transactions DROP CONSTRAINT IF EXISTS supplier_transactions_book_id_fkey, ADD CONSTRAINT supplier_transactions_book_id_fkey FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE`);

  // Book deliveries to students
  await c.query(`
    CREATE TABLE IF NOT EXISTS book_deliveries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid REFERENCES students(id) ON DELETE CASCADE,
      student_name text DEFAULT '',
      book_title text NOT NULL DEFAULT '',
      book_subject text DEFAULT '',
      quantity integer NOT NULL DEFAULT 1,
      price_per_unit numeric NOT NULL DEFAULT 0,
      total_price numeric NOT NULL DEFAULT 0,
      delivery_date date DEFAULT CURRENT_DATE,
      status text DEFAULT 'مسلم',
      notes text DEFAULT '',
      created_at timestamptz DEFAULT now()
    );
  `);

  // Grades table
  await c.query(`
    CREATE TABLE IF NOT EXISTS grades (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz DEFAULT now()
    );
  `);
  // Seed default grades
  const existingGrades = await c.query('SELECT COUNT(*) FROM grades');
  if (parseInt(existingGrades.rows[0].count) === 0) {
    const gradesSeed = [
      ['الصف الأول الابتدائي', 1], ['الصف الثاني الابتدائي', 2], ['الصف الثالث الابتدائي', 3],
      ['الصف الرابع الابتدائي', 4], ['الصف الخامس الابتدائي', 5], ['الصف السادس الابتدائي', 6],
      ['الصف الأول الإعدادي', 7], ['الصف الثاني الإعدادي', 8], ['الصف الثالث الإعدادي', 9],
      ['الصف الأول الثانوي', 10], ['الصف الثاني الثانوي', 11], ['الصف الثالث الثانوي', 12],
    ];
    for (const [name, order] of gradesSeed) {
      await c.query('INSERT INTO grades (name, sort_order) VALUES ($1, $2) ON CONFLICT DO NOTHING', [name, order]);
    }
    console.log('Default grades seeded with sort_order');
  }

  console.log('All tables created and seeded');
  await c.end();
}

main().catch(e => { console.error('Migration error:', e.message); process.exit(1); });
