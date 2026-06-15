-- CenterMasr Portal - Supabase Schema (11 tables needed for parent/student portal)
-- Run this in Supabase SQL Editor after creating your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Students
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  group_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  monthly_fee REAL NOT NULL DEFAULT 0,
  join_date TEXT NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  parent_name TEXT DEFAULT '',
  parent_phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  gender TEXT DEFAULT 'ذكر',
  deleted_at TIMESTAMPTZ,
  password TEXT DEFAULT '',
  booking_deposit REAL DEFAULT 0,
  school TEXT DEFAULT '',
  division TEXT DEFAULT '',
  parent_job TEXT DEFAULT '',
  birth_date TEXT,
  email TEXT DEFAULT '',
  balance REAL DEFAULT 0,
  deletion_reason TEXT DEFAULT ''
);

-- 2. Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id TEXT NOT NULL DEFAULT '',
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  date TEXT NOT NULL DEFAULT CURRENT_DATE,
  received_by TEXT NOT NULL DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Exam Results
CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id TEXT NOT NULL DEFAULT '',
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL DEFAULT '',
  exam_title TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT CURRENT_DATE,
  score REAL NOT NULL DEFAULT 0,
  max_score REAL NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answers JSONB DEFAULT '{}',
  questions JSONB DEFAULT '[]',
  essay_scores JSONB DEFAULT '{}'
);

-- 4. Absence Records
CREATE TABLE IF NOT EXISTS absence_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id TEXT NOT NULL DEFAULT '',
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL DEFAULT '',
  student_code TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  group_name TEXT DEFAULT '',
  date TEXT NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Attendance Notes
CREATE TABLE IF NOT EXISTS attendance_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id TEXT NOT NULL DEFAULT '',
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Book Deliveries
CREATE TABLE IF NOT EXISTS book_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id TEXT NOT NULL DEFAULT '',
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT DEFAULT '',
  book_title TEXT NOT NULL DEFAULT '',
  book_subject TEXT DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_unit REAL NOT NULL DEFAULT 0,
  total_price REAL NOT NULL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  remaining REAL DEFAULT 0,
  delivery_type TEXT DEFAULT 'بيع',
  delivery_date TEXT DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'مسلم',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Student Status
CREATE TABLE IF NOT EXISTS student_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id TEXT NOT NULL DEFAULT '',
  student_name TEXT NOT NULL DEFAULT '',
  student_code TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  status_type TEXT NOT NULL DEFAULT 'جيد',
  notes TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  target TEXT NOT NULL DEFAULT 'all',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Parent Messages
CREATE TABLE IF NOT EXISTS parent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id TEXT NOT NULL DEFAULT '',
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT DEFAULT '',
  student_code TEXT DEFAULT '',
  parent_name TEXT DEFAULT '',
  parent_phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  reply TEXT DEFAULT '',
  replied_at TIMESTAMPTZ,
  replied_by TEXT DEFAULT '',
  is_read INTEGER NOT NULL DEFAULT 0,
  parent_read INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Exams
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  exam_type TEXT NOT NULL DEFAULT 'ورقة',
  subject TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  teacher TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL DEFAULT 0,
  date TIMESTAMPTZ DEFAULT NOW(),
  max_score REAL NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  exam_link TEXT DEFAULT '',
  closing_date TIMESTAMPTZ,
  question_count INTEGER DEFAULT 0,
  group_name TEXT DEFAULT '',
  stage TEXT DEFAULT '',
  selection_mode TEXT DEFAULT 'manual',
  auto_config JSONB DEFAULT '{}'
);

-- 11. Questions
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id TEXT NOT NULL DEFAULT '',
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL DEFAULT '',
  options JSONB DEFAULT '[]',
  correct_answer TEXT NOT NULL DEFAULT '',
  question_type TEXT NOT NULL DEFAULT 'اختيار من متعدد',
  difficulty TEXT NOT NULL DEFAULT 'متوسط',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Exam Questions (junction)
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id TEXT NOT NULL DEFAULT '',
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL DEFAULT 0,
  points REAL NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, question_id)
);

-- Helper table needed by TakeExam
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  income REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for portal queries
CREATE INDEX IF NOT EXISTS idx_students_code ON students(code);
CREATE INDEX IF NOT EXISTS idx_students_parent_phone ON students(parent_phone);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_absence_records_student_id ON absence_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_notes_student_id ON attendance_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_book_deliveries_student_id ON book_deliveries(student_id);
CREATE INDEX IF NOT EXISTS idx_student_status_code ON student_status(student_code);
CREATE INDEX IF NOT EXISTS idx_parent_messages_student_id ON parent_messages(student_id);

-- Row Level Security (RLS) - Restrict data access
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all tables (portal uses code+phone auth, not Supabase Auth)
-- In production, replace with more restrictive policies
CREATE POLICY "Allow all select" ON students FOR SELECT USING (true);
CREATE POLICY "Allow all select" ON payments FOR SELECT USING (true);
CREATE POLICY "Allow all select" ON exam_results FOR SELECT USING (true);
CREATE POLICY "Allow all select" ON absence_records FOR SELECT USING (true);
CREATE POLICY "Allow all select" ON attendance_notes FOR SELECT USING (true);
CREATE POLICY "Allow all select" ON book_deliveries FOR SELECT USING (true);
CREATE POLICY "Allow all select" ON student_status FOR SELECT USING (true);
CREATE POLICY "Allow all select" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow all select" ON parent_messages FOR SELECT USING (true);
CREATE POLICY "Allow all select" ON exams FOR SELECT USING (true);
CREATE POLICY "Allow all select" ON questions FOR SELECT USING (true);
CREATE POLICY "Allow all select" ON exam_questions FOR SELECT USING (true);
CREATE POLICY "Allow all select" ON subjects FOR SELECT USING (true);

-- Allow insert for exam_results and parent_messages (students submit exams, parents send messages)
CREATE POLICY "Allow insert" ON exam_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON parent_messages FOR INSERT WITH CHECK (true);

-- Index for multi-center support
CREATE INDEX IF NOT EXISTS idx_students_center_id ON students(center_id);
CREATE INDEX IF NOT EXISTS idx_payments_center_id ON payments(center_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_center_id ON exam_results(center_id);
CREATE INDEX IF NOT EXISTS idx_absence_records_center_id ON absence_records(center_id);
CREATE INDEX IF NOT EXISTS idx_attendance_notes_center_id ON attendance_notes(center_id);
CREATE INDEX IF NOT EXISTS idx_book_deliveries_center_id ON book_deliveries(center_id);
CREATE INDEX IF NOT EXISTS idx_student_status_center_id ON student_status(center_id);
CREATE INDEX IF NOT EXISTS idx_notifications_center_id ON notifications(center_id);
CREATE INDEX IF NOT EXISTS idx_parent_messages_center_id ON parent_messages(center_id);
CREATE INDEX IF NOT EXISTS idx_exams_center_id ON exams(center_id);
CREATE INDEX IF NOT EXISTS idx_questions_center_id ON questions(center_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_center_id ON exam_questions(center_id);
CREATE INDEX IF NOT EXISTS idx_subjects_center_id ON subjects(center_id);

-- Add total_outstanding column to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS total_outstanding REAL DEFAULT 0;

-- Migration for existing databases: add center_id column if missing
DO $$ BEGIN
  ALTER TABLE students ADD COLUMN IF NOT EXISTS center_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS center_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS center_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE absence_records ADD COLUMN IF NOT EXISTS center_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE attendance_notes ADD COLUMN IF NOT EXISTS center_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE book_deliveries ADD COLUMN IF NOT EXISTS center_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE student_status ADD COLUMN IF NOT EXISTS center_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS center_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE parent_messages ADD COLUMN IF NOT EXISTS center_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE exams ADD COLUMN IF NOT EXISTS center_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE questions ADD COLUMN IF NOT EXISTS center_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS center_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE subjects ADD COLUMN IF NOT EXISTS center_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
