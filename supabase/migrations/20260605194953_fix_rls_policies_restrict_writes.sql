
-- =============================================
-- Drop all overly-permissive write policies
-- and replace with authenticated-only versions
-- =============================================

-- STUDENTS
DROP POLICY IF EXISTS "allow_all_students_insert" ON students;
DROP POLICY IF EXISTS "allow_all_students_update" ON students;
DROP POLICY IF EXISTS "allow_all_students_delete" ON students;

CREATE POLICY "students_insert_authenticated" ON students
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "students_update_authenticated" ON students
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "students_delete_authenticated" ON students
  FOR DELETE TO authenticated USING (true);

-- ABSENCE_RECORDS
DROP POLICY IF EXISTS "allow_all_absence_insert" ON absence_records;
DROP POLICY IF EXISTS "allow_all_absence_update" ON absence_records;
DROP POLICY IF EXISTS "allow_all_absence_delete" ON absence_records;

CREATE POLICY "absence_insert_authenticated" ON absence_records
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "absence_update_authenticated" ON absence_records
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "absence_delete_authenticated" ON absence_records
  FOR DELETE TO authenticated USING (true);

-- EXAMS
DROP POLICY IF EXISTS "allow_all_exams_insert" ON exams;
DROP POLICY IF EXISTS "allow_all_exams_update" ON exams;
DROP POLICY IF EXISTS "allow_all_exams_delete" ON exams;

CREATE POLICY "exams_insert_authenticated" ON exams
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "exams_update_authenticated" ON exams
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "exams_delete_authenticated" ON exams
  FOR DELETE TO authenticated USING (true);

-- BOOKS
DROP POLICY IF EXISTS "allow_all_books_insert" ON books;
DROP POLICY IF EXISTS "allow_all_books_update" ON books;
DROP POLICY IF EXISTS "allow_all_books_delete" ON books;

CREATE POLICY "books_insert_authenticated" ON books
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "books_update_authenticated" ON books
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "books_delete_authenticated" ON books
  FOR DELETE TO authenticated USING (true);

-- CLASSES
DROP POLICY IF EXISTS "allow_all_classes_insert" ON classes;
DROP POLICY IF EXISTS "allow_all_classes_update" ON classes;
DROP POLICY IF EXISTS "allow_all_classes_delete" ON classes;

CREATE POLICY "classes_insert_authenticated" ON classes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "classes_update_authenticated" ON classes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "classes_delete_authenticated" ON classes
  FOR DELETE TO authenticated USING (true);

-- GROUPS
DROP POLICY IF EXISTS "allow_all_groups_insert" ON groups;
DROP POLICY IF EXISTS "allow_all_groups_update" ON groups;
DROP POLICY IF EXISTS "allow_all_groups_delete" ON groups;

CREATE POLICY "groups_insert_authenticated" ON groups
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "groups_update_authenticated" ON groups
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "groups_delete_authenticated" ON groups
  FOR DELETE TO authenticated USING (true);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "allow_all_notifications_insert" ON notifications;
DROP POLICY IF EXISTS "allow_all_notifications_update" ON notifications;
DROP POLICY IF EXISTS "allow_all_notifications_delete" ON notifications;

CREATE POLICY "notifications_insert_authenticated" ON notifications
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifications_update_authenticated" ON notifications
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "notifications_delete_authenticated" ON notifications
  FOR DELETE TO authenticated USING (true);

-- APP_USERS
DROP POLICY IF EXISTS "allow_all_appusers_insert" ON app_users;
DROP POLICY IF EXISTS "allow_all_appusers_update" ON app_users;
DROP POLICY IF EXISTS "allow_all_appusers_delete" ON app_users;

CREATE POLICY "appusers_insert_authenticated" ON app_users
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "appusers_update_authenticated" ON app_users
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "appusers_delete_authenticated" ON app_users
  FOR DELETE TO authenticated USING (true);

-- LOGIN_LOGS
DROP POLICY IF EXISTS "allow_all_loginlogs_insert" ON login_logs;
DROP POLICY IF EXISTS "allow_all_loginlogs_update" ON login_logs;
DROP POLICY IF EXISTS "allow_all_loginlogs_delete" ON login_logs;

CREATE POLICY "loginlogs_insert_authenticated" ON login_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "loginlogs_update_authenticated" ON login_logs
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "loginlogs_delete_authenticated" ON login_logs
  FOR DELETE TO authenticated USING (true);

-- CENTER_CONFIG
DROP POLICY IF EXISTS "allow_all_config_insert" ON center_config;
DROP POLICY IF EXISTS "allow_all_config_update" ON center_config;
DROP POLICY IF EXISTS "allow_all_config_delete" ON center_config;

CREATE POLICY "config_insert_authenticated" ON center_config
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "config_update_authenticated" ON center_config
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "config_delete_authenticated" ON center_config
  FOR DELETE TO authenticated USING (true);

-- STUDENT_STATUS
DROP POLICY IF EXISTS "allow_all_status_insert" ON student_status;
DROP POLICY IF EXISTS "allow_all_status_update" ON student_status;
DROP POLICY IF EXISTS "allow_all_status_delete" ON student_status;

CREATE POLICY "status_insert_authenticated" ON student_status
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "status_update_authenticated" ON student_status
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "status_delete_authenticated" ON student_status
  FOR DELETE TO authenticated USING (true);
