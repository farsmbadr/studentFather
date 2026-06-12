
-- Students table
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
  created_at timestamptz DEFAULT now()
);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_students_select" ON students FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_all_students_insert" ON students FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_all_students_update" ON students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_students_delete" ON students FOR DELETE TO anon, authenticated USING (true);

-- Absence records
CREATE TABLE IF NOT EXISTS absence_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL DEFAULT '',
  student_code text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE absence_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_absence_select" ON absence_records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_all_absence_insert" ON absence_records FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_all_absence_update" ON absence_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_absence_delete" ON absence_records FOR DELETE TO anon, authenticated USING (true);

-- Exams
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  exam_type text NOT NULL DEFAULT 'ورقة',
  subject text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  teacher text NOT NULL DEFAULT '',
  duration integer NOT NULL DEFAULT 0,
  date timestamptz DEFAULT now(),
  max_score numeric NOT NULL DEFAULT 100,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_exams_select" ON exams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_all_exams_insert" ON exams FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_all_exams_update" ON exams FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_exams_delete" ON exams FOR DELETE TO anon, authenticated USING (true);

-- Teachers
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
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_teachers_select" ON teachers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_all_teachers_insert" ON teachers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_all_teachers_update" ON teachers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_teachers_delete" ON teachers FOR DELETE TO anon, authenticated USING (true);

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_subjects_select" ON subjects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_all_subjects_insert" ON subjects FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_all_subjects_update" ON subjects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_subjects_delete" ON subjects FOR DELETE TO anon, authenticated USING (true);

-- Exam results
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
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_examresults_select" ON exam_results FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_all_examresults_insert" ON exam_results FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_all_examresults_update" ON exam_results FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_examresults_delete" ON exam_results FOR DELETE TO anon, authenticated USING (true);

-- Books
CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_books_select" ON books FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_all_books_insert" ON books FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_all_books_update" ON books FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_books_delete" ON books FOR DELETE TO anon, authenticated USING (true);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  teacher text NOT NULL DEFAULT '',
  capacity integer NOT NULL DEFAULT 30,
  students_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_classes_select" ON classes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_all_classes_insert" ON classes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_all_classes_update" ON classes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_classes_delete" ON classes FOR DELETE TO anon, authenticated USING (true);

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  schedule text NOT NULL DEFAULT '',
  fee numeric NOT NULL DEFAULT 0,
  capacity integer NOT NULL DEFAULT 20,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_groups_select" ON groups FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_all_groups_insert" ON groups FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_all_groups_update" ON groups FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_groups_delete" ON groups FOR DELETE TO anon, authenticated USING (true);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  target text NOT NULL DEFAULT 'all',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_notifications_select" ON notifications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_all_notifications_insert" ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_all_notifications_update" ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_notifications_delete" ON notifications FOR DELETE TO anon, authenticated USING (true);

-- App users
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  username text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'موظف',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_appusers_select" ON app_users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_all_appusers_insert" ON app_users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_all_appusers_update" ON app_users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_appusers_delete" ON app_users FOR DELETE TO anon, authenticated USING (true);

-- Login logs
CREATE TABLE IF NOT EXISTS login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL DEFAULT '',
  action text NOT NULL DEFAULT 'تسجيل دخول',
  ip_address text NOT NULL DEFAULT '0.0.0.0',
  success boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_loginlogs_select" ON login_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_all_loginlogs_insert" ON login_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_all_loginlogs_update" ON login_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_loginlogs_delete" ON login_logs FOR DELETE TO anon, authenticated USING (true);

-- Center config
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
ALTER TABLE center_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_config_select" ON center_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_all_config_insert" ON center_config FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_all_config_update" ON center_config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_config_delete" ON center_config FOR DELETE TO anon, authenticated USING (true);

-- Student status
CREATE TABLE IF NOT EXISTS student_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL DEFAULT '',
  student_code text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  status_type text NOT NULL DEFAULT 'جيد',
  notes text NOT NULL DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE student_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_status_select" ON student_status FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_all_status_insert" ON student_status FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_all_status_update" ON student_status FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_status_delete" ON student_status FOR DELETE TO anon, authenticated USING (true);
