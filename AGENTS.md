# CenterMasr — Session Progress

## Goal
Build a centralized `subjects` table and link it across all modules (teachers, students, groups, books, exams), manage subject–teacher/student/group relations, auto‑calculate income per subject from student fees, electronic exam system with question bank, and display it all in a unified UI.

## Constraints & Preferences
- Arabic UI throughout; RTL layout
- Custom local API client at `/api/*` (not real Supabase); no joins — all relation matching is done client‑side by loading full tables
- Backend Express in `server/index.mjs`; frontend Vite + React + Tailwind; local PostgreSQL on port 5433
- Generic CRUD in `server/index.mjs` automatically creates GET/POST/PATCH/DELETE for every table registered in `supabaseClient.ts`
- All IDs are PostgreSQL UUIDs; junction tables use `REFERENCES … ON DELETE CASCADE`
- `node-postgres` returns `numeric` columns as strings — wrap DB values in `Number()`
- `node-postgres` returns `date` columns as UTC ISO strings — use `new Date(d).getFullYear()/getMonth()/getDate()` for local date string, never `.slice(0, 10)`
- Express server started with `Start-Process -WindowStyle Hidden` (bash tool kills child processes on timeout); Vite started via WMI `win32_process.Create()`
- `express.json()` limit raised to `10mb` for logo uploads
- **Server PATCH/POST array handling**: `Array.isArray(req.body[k])` → pass array directly (node-postgres handles `text[]` columns natively); `typeof === 'object' && !== null` → `JSON.stringify()` only for JSONB columns
- **Teachers table has ARRAY columns**: `subjects` (text[]) and `group_names` (text[]) in addition to `subject` (text); both persisted in the database

## Progress

### ✅ Done
- **Subjects page (`src/pages/Subjects.tsx`)** — centralised subject CRUD with:
  - Table columns: #, subject name (with emoji + colour avatar), teachers (badges), students (count), groups count, exams count, income (auto‑calculated), actions
  - Management modal with two tabs: "المعلمون" (add/remove teachers from dropdown) and "الطلاب" (add/remove students, shows total monthly income)
  - Subject emoji mapped from name keywords (📐رياضيات, 🧪كيمياء, 🇬🇧إنجليزي, ☪️دين … fallback 📘)
  - Hash‑based consistent colour per subject name
  - Exam count auto‑loaded from `exams` table by subject name match
  - Groups count auto‑loaded from `group_subjects`
  - Income auto‑calculated as `SUM(students.monthly_fee)` of all students linked via `subject_students`
- **Database migrations** (`scripts/migrate.cjs`):
  - `subject_teachers`, `subject_students`, `group_subjects` (all UNIQUE + ON DELETE CASCADE)
  - `questions` (subject_id FK, question_text, options JSONB, correct_answer, type, difficulty)
  - `exam_questions` (exam_id FK, question_id FK, order_number, points, UNIQUE)
  - `ALTER TABLE exams ADD COLUMN exam_link, closing_date, question_count, group_name, stage`
  - `ALTER TABLE subjects ADD COLUMN income`
  - `grades` table with `sort_order` column, seeded 12 grades with proper ordering
  - All tables registered in `src/supabaseClient.ts`
- **Teachers seeded** — 10 teachers with realistic Arabic names, linked to subjects via `subject_teachers`
- **Groups‑subjects linked** — each group assigned 2‑4 random subjects via `group_subjects`
- **Books.tsx** — subject dropdown from `subjects` table (with custom‑entry option)
- **Students.tsx: subject selection** — toggle‑button grid in student modal; syncs `subject_students`
- **Students.tsx: student file modal** — shows subjects of the student
- **Groups.tsx** — subject multi‑select modal; syncs `group_subjects`; `_subjects` embedded in group data
- **Teachers (Classes.tsx) ↔ subject_teachers sync** — saving a teacher now syncs `subject_teachers` junction table (map selected subject names → IDs)
- **Subjects page: groups count column** — new column showing number of groups per subject
- **Server CRUD fix** — added `crud('subject_teachers')`, `crud('subject_students')`, `crud('group_subjects')`, `crud('questions')`, `crud('exam_questions')` to fix 404 errors
- **MultiSelect duplicate key fix** — deduplicated group/subject names; added index‑based keys in `Classes.tsx`
- **Exam setup page (`src/pages/ExamSetup.tsx`)** — new rich page for electronic exam configuration:
  - Two‑column layout (left: question management, right: settings)
  - Question bank management: add/edit/delete questions with type (اختيار من متعدد / صح/خطأ / مقالي), difficulty, options, correct answer
  - Toggle questions on/off for the exam via checkbox
  - Expand questions to see full details (options, correct answer highlighted)
  - Settings sidebar: exam link (copyable), question count stats (bank vs selected), count input, closing date, stage/group filters
  - Randomize questions button
  - Save all settings including selected questions to `exam_questions` junction table
- **Navigation flow** — `ExamAdd.tsx` redirects to `ExamSetup.tsx` after saving an "إلكتروني" exam; `Exams.tsx` has an edit button for electronic exams
- **Grades table fix** — added `sort_order` column, seeded 1‑12 ordering; student grade data normalized (removed `الصف ` prefix inconsistency)
- **StudentReport.tsx & Dashboard.tsx** — charts now load grades from `grades` table for ordering & display; `gradeOrder`/`gradeShort` hardcoded maps replaced with dynamic grade table loading; group labels shortened; BarChart bottom padding increased for readability

### 🚧 In Progress
- *(none)*

### ❌ Blocked
- *(none)*

## Key Decisions
- **Central subjects table as single source of truth** — all modules reference `subjects` table; free‑text subject fields replaced with dropdowns/toggles
- **Auto‑calculate income** — income per subject = sum of `monthly_fee` of linked students; no manual entry
- **Junction tables for M:N relations** — `subject_teachers`, `subject_students`, `group_subjects`, `exam_questions` (all UNIQUE + ON DELETE CASCADE)
- **Client‑side relation matching** — no server joins; full tables loaded and matched in‑memory with `.find()` / `.filter()`
- **ExamSetup two‑column layout** — large column for questions (add/manage/toggle), small column for settings (link, counts, dates, filters, randomize)
- **Questions stored per subject** — `questions.subject_id` links to central subjects table; filtered by exam's subject
- **Review mode stores per-question answers** — `exam_results.answers` JSONB column saves all student answers on submit; shown in review mode (correct=green, wrong=red, essay=both answers)
- **Review mode must render before !identified check** — early return order: `loading → error → examClosed → alreadyTaken → **reviewMode** → !identified → submitted → exam`
- **Grades table as source of truth for grade ordering & display** — charts in StudentReport and Dashboard load grades dynamically, build order/display maps from `grades` table with `sort_order` column; student grade values normalized to NOT include `الصف ` prefix
- **Teachers table uses ARRAY columns for subjects & group_names** — `text[]` columns `subjects` and `group_names` store display data directly; `subject_teachers` junction table provides link IDs for individual delete operations; both are synced on save

## Relevant Files
- `src/pages/Subjects.tsx` — subject CRUD + teacher/student/income management + groups count
- `src/pages/Groups.tsx` — subject multi‑select in modal; `_subjects` embedded in group objects; rename syncs teachers' `group_names`; delete syncs teachers + students
- `src/pages/Students.tsx` — subject toggle‑grid; syncs `subject_students`; student file modal
- `src/pages/Books.tsx` — subject dropdown from `subjects` table
- `src/pages/Classes.tsx` — teacher CRUD with subject multi‑select; syncs `subject_teachers`; individual group/subject delete; `load()` merges DB ARRAY with junction data
- `src/pages/ExamAdd.tsx` — basic exam form; redirects to ExamSetup for electronic exams
- `src/pages/Exams.tsx` — exam list; edit button for electronic exams opens ExamSetup
- `src/pages/ExamSetup.tsx` — electronic exam setup page (question bank, settings, randomize)
- `src/pages/StudentReport.tsx` — loads grades from `grades` table for chart ordering/labels
- `src/pages/Dashboard.tsx` — loads grades from `grades` table for chart ordering/labels
- `src/supabaseClient.ts` — registers all junction/question tables
- `scripts/migrate.cjs` — all table definitions; grades table with `sort_order`
- `scripts/fix_grades.cjs` — adds `sort_order` to grades, normalizes student grades
- `server/index.mjs` — generic CRUD routes for all registered tables

## Session History (2026-06-10)
- **Grades `sort_order` fix** — added `sort_order` column to `grades` table, seeded 1‑12 ordering
- **Student grades normalized** — removed `الصف ` prefix from all student grade values (2 students had it, now consistent)
- **`random_assign.cjs` bugfix** — stopped overwriting student `grade` when assigning `group_name`; fixed grade matching to handle prefix/non‑prefix
- **StudentReport.tsx overhaul** — replaced hardcoded `gradeOrder`/`gradeShort` maps with dynamic loading from `grades` table; group names shortened (e.g. "مجموعة الساعة 4:00 عصراً" → "4:00 عصراً م"); BarChart bottomPad 30→40, labels rotated -30° for readability; incomeByGrade follows same grade ordering
- **Dashboard.tsx overhaul** — same grade loading fix as StudentReport; BarChart width `Math.max(500, data.length*60)` (was fixed 500), bottomPad 28→36, font 11→12

## Session History (2026-06-11) — Morning
- **Server PATCH/POST array fix** — `server/index.mjs` now passes arrays directly to node-postgres (instead of `JSON.stringify`), fixing PostgreSQL `text[]` column saves
- **Classes.tsx save restored** — `subjects` and `group_names` arrays re‑included in PATCH/POST payload (server can now persist them)
- **Classes.tsx load merged** — teacher subjects now merge DB ARRAY column data with `subject_teachers` junction data (for `stId`‑based individual delete)
- **Individual group delete** — X button next to each group name in teacher list; removes the group from the teacher's `group_names` array
- **Groups.tsx rename syncs teachers** — when a group is renamed, all teachers whose `group_names` contains the old name get it replaced with the new name
- **Groups.tsx delete syncs teachers+students** — when a group is deleted, its name is removed from all teachers' `group_names` arrays AND cleared from all students' `group_name` fields
- **Payment validation** — `PaymentModal.tsx` now prevents paying more than remaining balance with error message
- **Required field indicators** — red asterisk `*` added to required fields across all pages (Students, Classes, Groups, ExamAdd, Subjects, Books, Expenses, Suppliers, Revenues)
- **Student save validation** — `Students.tsx save()` validates name, grade, group_name, phone before submit
- **Student grades normalized** — all 102 students' grades updated to short names matching `grades` table
- **Deposit payment fix** — auto-creates deposit payment for new AND edited students; missing deposits added for 5 existing students
- **Students.tsx filters** — added "بدون مجموعة" and "بدون صف" filter options; renamed "المرحلة" → "الصف"
- **ExamAdd.tsx duplicate key fix** — changed teacher select to use `id` instead of `name` as key
- **StudentProfile.tsx section summaries** — each section title now shows summary stats in parentheses: groups count, payment total/remaining, exam average %, total absences, book paid/remaining
- **Super admin system** — `is_super_admin` flag on `app_users`; server returns it in GET & login response; `auth.ts` interface updated; only super admin can delete/edit other users, change others' passwords, or reset passwords; password change button hidden for non-owners/non-super-admin
- **Payment/monthBalance fix** — removed `depositCredit` from `monthBalance` calculation so remaining is `monthly_fee - payments` only (deposit not treated as monthly payment); red status banner now shows for ALL students with monthly fee (green "paid" or red "remaining")
- **Search clear bug fix** — removed `setTimeout(() => setSearchQuery(''), 0)` from `navigate()` in `App.tsx` so barcode/manual search doesn't flash-and-disappear
- **LoginLog name column** — added "الاسم" column showing full name from `app_users` lookup by username
- **StudentReport chart order** — pie/donut charts moved above bar charts
- **AbsenceReports group names** — updated `absence_records.group_name` from old long names to match current `groups` table (65 records updated)

## Session History (2026-06-11) — Audit & Fixes
- **Comprehensive audit** — 45 issues found across 4 domains (DB 8, Server 16, Frontend 21, Auth 7)
- **Priority fixes applied**:
  - Orphan records deleted (3 records for `810105d4-0eea-4fa6-8aa1-ec0f028b704e`)
  - `DepositsReport.tsx` — fixed missing `await` before `confirm()` (delete was broken)
  - `GroupFees.tsx` — fixed `select('id')` → `select('id, group_name')` (تطبيق على القدام was broken)
  - `ExamStatistics.tsx` — fixed UUID vs text comparison by loading `subjects` and matching by name
  - `LatePayers.tsx` & `Notifications.tsx` — Egypt country code `2` → `20` for WhatsApp links
  - `LatePayers.tsx` — removed `booking_deposit` from `owed()` calculation (deposit not a monthly payment)
  - `TakeExam.tsx` — fixed timer race condition (side effects in `setTimeLeft` setter refactored to separate effects + `useRef`)
  - `server/index.mjs` — ORDER BY SQL injection prevented with regex allowlist
  - `server/index.mjs` — restore handler now handles `text[]` arrays (same as POST/PATCH)
  - `server/index.mjs` — login log INSERT moved after success check to prevent valid login failure
  - `books.supplier_id` — added `ON DELETE CASCADE` (was missing)
