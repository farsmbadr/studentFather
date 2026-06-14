export type Page =
  | 'dashboard'
  | 'students'
  | 'archive'
  | 'absence'
  | 'absence-reports'
  | 'absence-latest'
  | 'absence-warnings'
  | 'absence-sheet'
  | 'exams'
  | 'exam-list'
  | 'exam-add'
  | 'exam-top-scorers'
  | 'exam-group-report'
  | 'exam-score-sheet'
  | 'exam-statistics'
  | 'exam-setup'
  | 'exam-essay-grading'
  | 'question-bank'
  | 'books'
  | 'book-list'
  | 'book-profits'
  | 'book-delivery'
  | 'book-stats'
  | 'supplier-list'
  | 'publications'
  | 'basic-data'
  | 'classes'
  | 'groups'
  | 'subjects'
  | 'notifications'
  | 'settings'
  | 'users'
  | 'login-log'
  | 'student-profile'
  | 'student-report'
  | 'daily-report'
  | 'revenues'
  | 'deposits-report'
  | 'revenue-archive'
  | 'late-payers'
  | 'expenses'
  | 'expense-archive'
  | 'monthly-stats'
  | 'finance-report'
  | 'group-fees'
  | 'grades'
  | 'parent-messages';

export interface Student {
  id: string;
  name: string;
  code: string;
  grade: string;
  group: string;
  phone: string;
  status: 'active' | 'inactive';
  monthly_fee: number;
  join_date: string;
}

export interface Absence {
  id: string;
  student_id: string;
  student_name: string;
  date: string;
  grade: string;
  reason: string;
}

export interface Exam {
  id: string;
  title: string;
  grade: string;
  date: string;
  max_score: number;
  subject: string;
  teacher: string;
  duration: number;
}

export type StudentAction = 'list' | 'add' | 'report' | 'confirm' | 'edit' | 'delete';

export interface Payment {
  id: string;
  student_id: string;
  student_name: string;
  amount: number;
  date: string;
  month: string;
  type: 'monthly' | 'books' | 'other';
}
