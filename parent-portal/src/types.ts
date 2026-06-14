export interface Student {
  id: string;
  name: string;
  code: string;
  grade: string;
  group_name: string;
  phone: string;
  status: 'active' | 'inactive';
  monthly_fee: number;
  join_date: string;
  parent_name?: string;
  parent_phone?: string;
  address?: string;
}

export interface Payment {
  id: string;
  student_id: string;
  student_name: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface ExamResult {
  id: string;
  student_id: string;
  student_name: string;
  exam_title: string;
  subject: string;
  score: number;
  max_score: number;
  date: string;
}

export interface AbsenceRecord {
  id: string;
  student_id: string;
  date: string;
  reason?: string;
}

export interface AttendanceNote {
  id: string;
  student_id: string;
  note: string;
  date: string;
}

export interface BookDelivery {
  id: string;
  student_id: string;
  book_title: string;
  book_subject: string;
  quantity: number;
  delivery_date: string;
  status: string;
}

export interface StudentStatus {
  id: string;
  student_name: string;
  student_code: string;
  status_type: string;
  notes?: string;
  date: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

export interface ParentMessage {
  id: string;
  student_id: string;
  message: string;
  reply?: string;
  created_at: string;
  replied_at?: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  grade: string;
  duration: number;
  date: string;
  closing_date?: string;
  selection_mode: 'auto' | 'manual';
  auto_config?: any;
}

export interface Question {
  id: string;
  subject_id?: string;
  question_text: string;
  options?: string[];
  correct_answer: string;
  question_type: 'اختيار من متعدد' | 'صح/خطأ' | 'مقالي';
  difficulty: 'سهل' | 'متوسط' | 'صعب';
}

export interface DashboardData {
  student: Student;
  payments: Payment[];
  exams: ExamResult[];
  absence: AbsenceRecord[];
  notes: AttendanceNote[];
  books: BookDelivery[];
  statusEntries: StudentStatus[];
  notifications: Notification[];
  totalPaid: number;
}
