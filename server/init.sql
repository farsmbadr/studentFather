CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  group_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  monthly_fee REAL NOT NULL DEFAULT 0,
  join_date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now')),
  parent_name TEXT DEFAULT '',
  parent_phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  gender TEXT DEFAULT 'ذكر',
  deleted_at TEXT,
  password TEXT DEFAULT '',
  booking_deposit REAL DEFAULT 0,
  school TEXT DEFAULT '',
  division TEXT DEFAULT '',
  parent_job TEXT DEFAULT '',
  birth_date TEXT,
  email TEXT DEFAULT '',
  deletion_reason TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS absence_records (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL DEFAULT '',
  student_name TEXT NOT NULL DEFAULT '',
  student_code TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  group_name TEXT DEFAULT '',
  date TEXT NOT NULL DEFAULT (date('now')),
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL DEFAULT '',
  student_name TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  date TEXT NOT NULL DEFAULT (date('now')),
  received_by TEXT NOT NULL DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exam_results (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL DEFAULT '',
  student_name TEXT NOT NULL DEFAULT '',
  exam_title TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT (date('now')),
  score REAL NOT NULL DEFAULT 0,
  max_score REAL NOT NULL DEFAULT 100,
  created_at TEXT DEFAULT (datetime('now')),
  answers TEXT DEFAULT '{}',
  questions TEXT DEFAULT '[]',
  essay_scores TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS attendance_notes (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL DEFAULT '',
  student_name TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_groups (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL DEFAULT '',
  group_id TEXT NOT NULL DEFAULT '',
  group_name TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  exam_type TEXT NOT NULL DEFAULT 'ورقة',
  subject TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  teacher TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL DEFAULT 0,
  date TEXT DEFAULT (datetime('now')),
  max_score REAL NOT NULL DEFAULT 100,
  created_at TEXT DEFAULT (datetime('now')),
  exam_link TEXT DEFAULT '',
  closing_date TEXT,
  question_count INTEGER DEFAULT 0,
  group_name TEXT DEFAULT '',
  stage TEXT DEFAULT '',
  selection_mode TEXT DEFAULT 'manual',
  auto_config TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  subjects TEXT DEFAULT '[]',
  group_names TEXT DEFAULT '[]',
  salary REAL NOT NULL DEFAULT 0,
  hire_date TEXT DEFAULT (date('now')),
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  income REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  purchase_price REAL DEFAULT 0,
  selling_price REAL DEFAULT 0,
  supplier_id TEXT,
  discount_value REAL DEFAULT 0,
  discount_type TEXT DEFAULT 'amount',
  paid_amount REAL DEFAULT 0,
  is_general INTEGER DEFAULT 0,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  teacher TEXT NOT NULL DEFAULT '',
  capacity INTEGER NOT NULL DEFAULT 30,
  students_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  schedule TEXT NOT NULL DEFAULT '',
  fee REAL NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 20,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  target TEXT NOT NULL DEFAULT 'all',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  password TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'موظف',
  status TEXT NOT NULL DEFAULT 'active',
  is_super_admin INTEGER DEFAULT 0,
  permissions TEXT DEFAULT '[]',
  phone TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS login_logs (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL DEFAULT 'تسجيل دخول',
  ip_address TEXT NOT NULL DEFAULT '0.0.0.0',
  success INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS center_config (
  id TEXT PRIMARY KEY,
  center_name TEXT NOT NULL DEFAULT 'CenterMasr',
  academic_year TEXT NOT NULL DEFAULT '2025-2026',
  year_start TEXT DEFAULT '2025-09-01',
  year_end TEXT DEFAULT '2026-06-30',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  logo TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_status (
  id TEXT PRIMARY KEY,
  student_name TEXT NOT NULL DEFAULT '',
  student_code TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  status_type TEXT NOT NULL DEFAULT 'جيد',
  notes TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subject_teachers (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(subject_id, teacher_id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subject_students (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(subject_id, student_id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_subjects (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(group_id, subject_id),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  subject_id TEXT,
  question_text TEXT NOT NULL DEFAULT '',
  options TEXT DEFAULT '[]',
  correct_answer TEXT NOT NULL DEFAULT '',
  question_type TEXT NOT NULL DEFAULT 'اختيار من متعدد',
  difficulty TEXT NOT NULL DEFAULT 'متوسط',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  order_number INTEGER NOT NULL DEFAULT 0,
  points REAL NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(exam_id, question_id),
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  opening_balance REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supplier_transactions (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'purchase',
  amount REAL NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  date TEXT NOT NULL DEFAULT (date('now')),
  book_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS book_deliveries (
  id TEXT PRIMARY KEY,
  student_id TEXT,
  student_name TEXT DEFAULT '',
  book_title TEXT NOT NULL DEFAULT '',
  book_subject TEXT DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_unit REAL NOT NULL DEFAULT 0,
  total_price REAL NOT NULL DEFAULT 0,
  delivery_date TEXT DEFAULT (date('now')),
  status TEXT DEFAULT 'مسلم',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS book_delivery_payments (
  id TEXT PRIMARY KEY,
  delivery_id TEXT,
  amount REAL NOT NULL DEFAULT 0,
  date TEXT DEFAULT (date('now')),
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (delivery_id) REFERENCES book_deliveries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT (date('now')),
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS custom_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  permissions TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed admin user
INSERT OR IGNORE INTO app_users (id, name, username, password, role, is_super_admin)
VALUES ('a0000000-0000-0000-0000-000000000001', 'مدير النظام', 'admin', 'admin123', 'مدير', 1);

-- Seed center config
INSERT OR IGNORE INTO center_config (id, center_name, academic_year)
VALUES ('c0000000-0000-0000-0000-000000000001', 'CenterMasr', '2025-2026');

-- Seed grades
INSERT OR IGNORE INTO grades (id, name, sort_order) VALUES
  ('g0000001-0000-0000-0000-000000000001', 'الصف الأول الابتدائي', 1),
  ('g0000002-0000-0000-0000-000000000002', 'الصف الثاني الابتدائي', 2),
  ('g0000003-0000-0000-0000-000000000003', 'الصف الثالث الابتدائي', 3),
  ('g0000004-0000-0000-0000-000000000004', 'الصف الرابع الابتدائي', 4),
  ('g0000005-0000-0000-0000-000000000005', 'الصف الخامس الابتدائي', 5),
  ('g0000006-0000-0000-0000-000000000006', 'الصف السادس الابتدائي', 6),
  ('g0000007-0000-0000-0000-000000000007', 'الصف الأول الإعدادي', 7),
  ('g0000008-0000-0000-0000-000000000008', 'الصف الثاني الإعدادي', 8),
  ('g0000009-0000-0000-0000-000000000009', 'الصف الثالث الإعدادي', 9),
  ('g000000a-0000-0000-0000-00000000000a', 'الصف الأول الثانوي', 10),
  ('g000000b-0000-0000-0000-00000000000b', 'الصف الثاني الثانوي', 11),
  ('g000000c-0000-0000-0000-00000000000c', 'الصف الثالث الثانوي', 12);
