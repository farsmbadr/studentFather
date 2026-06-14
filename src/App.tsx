import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Archive from './pages/Archive';
import Absence from './pages/Absence';
import AbsenceReports from './pages/AbsenceReports';
import AbsenceLatest from './pages/AbsenceLatest';
import AbsenceWarnings from './pages/AbsenceWarnings';
import AbsenceSheet from './pages/AbsenceSheet';
import Exams from './pages/Exams';
import ExamAdd from './pages/ExamAdd';
import ExamTopScorers from './pages/ExamTopScorers';
import ExamGroupReport from './pages/ExamGroupReport';
import ExamScoreSheet from './pages/ExamScoreSheet';
import ExamStatistics from './pages/ExamStatistics';
import ExamSetup from './pages/ExamSetup';
import ExamEssayGrading from './pages/ExamEssayGrading';
import QuestionBank from './pages/QuestionBank';
import Books from './pages/Books';
import BookProfits from './pages/BookProfits';
import BookDelivery from './pages/BookDelivery';
import BookStats from './pages/BookStats';
import Suppliers from './pages/Suppliers';
import Publications from './pages/Publications';
import BasicData from './pages/BasicData';
import Subjects from './pages/Subjects';
import Classes from './pages/Classes';
import Groups from './pages/Groups';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Users from './pages/Users';
import LoginLog from './pages/LoginLog';
import StudentReport from './pages/StudentReport';
import DailyReport from './pages/DailyReport';
import Revenues from './pages/Revenues';
import DepositsReport from './pages/DepositsReport';
import RevenueArchive from './pages/RevenueArchive';
import LatePayers from './pages/LatePayers';
import Expenses from './pages/Expenses';
import ExpenseArchive from './pages/ExpenseArchive';
import MonthlyStats from './pages/MonthlyStats';
import FinanceReport from './pages/FinanceReport';
import GroupFees from './pages/GroupFees';
import Grades from './pages/Grades';
import ParentMessages from './pages/ParentMessages';
import Login from './pages/Login';
import { Page, StudentAction } from './types';
import { ToastProvider } from './components/Toast';
import StudentProfile from './pages/StudentProfile';
import TakeExam from './pages/TakeExam';
import ParentLogin from './pages/ParentLogin';
import ParentDashboard from './pages/ParentDashboard';
import StudentLogin from './pages/StudentLogin';
import StudentDashboard from './pages/StudentDashboard';
import { supabase } from './supabaseClient';
import { XCircle } from 'lucide-react';
import { getCurrentUser, setCurrentUser } from './auth';

function PageContent({ page, studentId, onBack, onEditStudent, onDeleteStudent, onNavigate }: { page: Page; studentId?: string; onBack?: () => void; onEditStudent?: (id: string) => void; onDeleteStudent?: (id: string) => void; onNavigate?: (page: Page) => void }) {
  if (page === 'student-profile' && studentId) return <StudentProfile studentId={studentId} onBack={onBack || (() => {})} onEdit={onEditStudent} onDelete={onDeleteStudent} />;
  switch (page) {
    case 'dashboard': return <Dashboard />;
    case 'students': return <Students />;
    case 'absence-reports': return <AbsenceReports />;
    case 'absence-latest': return <AbsenceLatest />;
    case 'absence-warnings': return <AbsenceWarnings />;
    case 'absence-sheet': return <AbsenceSheet />;
    case 'exams': return <Exams onNavigate={onNavigate} />;
    case 'exam-list': return <Exams onNavigate={onNavigate} />;
    case 'exam-add': return <ExamAdd onNavigate={onNavigate} />;
    case 'exam-top-scorers': return <ExamTopScorers />;
    case 'exam-group-report': return <ExamGroupReport />;
    case 'exam-score-sheet': return <ExamScoreSheet />;
    case 'exam-statistics': return <ExamStatistics />;
    case 'exam-setup': {
      const eid = localStorage.getItem('exam-setup-id');
      if (!eid) return <div className="text-center text-gray-400 py-16">لم يتم تحديد الاختبار</div>;
      return <ExamSetup examId={eid} onBack={() => { localStorage.removeItem('exam-setup-id'); onNavigate?.('exams'); }} />;
    }
    case 'exam-essay-grading': return <ExamEssayGrading />;
    case 'question-bank': return <QuestionBank />;
    case 'books': return <Books onNavigate={onNavigate} />;
    case 'book-list': return <Books onNavigate={onNavigate} />;
    case 'book-profits': return <BookProfits />;
    case 'book-delivery': return <BookDelivery />;
    case 'book-stats': {
      const bid = localStorage.getItem('book-stats-id');
      if (!bid) return <div className="text-center text-gray-400 py-16">لم يتم تحديد الكتاب</div>;
      return <BookStats onBack={() => { localStorage.removeItem('book-stats-id'); onNavigate?.('books'); }} />;
    }
    case 'supplier-list': return <Suppliers mode="list" />;
    case 'publications': return <Publications />;
    case 'basic-data': return <BasicData />;
    case 'subjects': return <Subjects />;
    case 'classes': return <Classes />;
    case 'groups': return <Groups />;
    case 'notifications': return <Notifications />;
    case 'student-report': return <StudentReport />;
    case 'settings': return <Settings />;
    case 'users': return <Users />;
    case 'login-log': return <LoginLog />;
    case 'daily-report': return <DailyReport />;
    case 'revenues': return <Revenues />;
    case 'revenue-archive': return <RevenueArchive />;
    case 'late-payers': return <LatePayers />;
    case 'expenses': return <Expenses />;
    case 'expense-archive': return <ExpenseArchive />;
    case 'monthly-stats': return <MonthlyStats />;
    case 'finance-report': return <FinanceReport />;
    case 'group-fees': return <GroupFees />;
    case 'grades': return <Grades />;
    case 'parent-messages': return <ParentMessages />;
    default: return <Dashboard />;
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [loggedIn, setLoggedIn] = useState(() => !!getCurrentUser().id);
  const [user, setUser] = useState(() => getCurrentUser());
  const perms = user.permissions || [];
  const hasAccess = (page: Page) => user.is_super_admin || perms.includes('all') || perms.includes(page);
  const navigate = (page: Page) => { if (hasAccess(page)) { setCurrentPage(page); } };
  const handleLogin = (u: { id: string; name: string; username: string; role: string; permissions: string[]; is_super_admin?: boolean }) => {
    setCurrentUser(u); setLoggedIn(true); setUser(u);
  };
  const handleLogout = () => {
    localStorage.removeItem('baderp-user'); setLoggedIn(false); setUser({ id: '', name: '', username: '', role: '', permissions: [] }); setCurrentPage('dashboard');
  };
  const handleParentLogin = (token: string, student: any) => {
    localStorage.setItem('baderp-parent-token', token);
    localStorage.setItem('baderp-parent-student', JSON.stringify(student));
    setParentToken(token);
    setParentStudent(student);
  };
  const handleParentLogout = () => {
    localStorage.removeItem('baderp-parent-token');
    localStorage.removeItem('baderp-parent-student');
    setParentToken('');
    setParentStudent(null);
  };
  const handleStudentPortalLogin = (token: string, student: any) => {
    localStorage.setItem('baderp-student-token', token);
    localStorage.setItem('baderp-student-student', JSON.stringify(student));
    setStudentPortalToken(token);
    setStudentPortalStudent(student);
  };
  const handleStudentPortalLogout = () => {
    localStorage.removeItem('baderp-student-token');
    localStorage.removeItem('baderp-student-student');
    setStudentPortalToken('');
    setStudentPortalStudent(null);
  };
  const [beforeProfilePage, setBeforeProfilePage] = useState<Page | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('baderp-theme') === 'dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [studentAction, setStudentAction] = useState<StudentAction>('list');
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>();
  const [editStudentId, setEditStudentId] = useState<string | null>(null);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [centerInfo, setCenterInfo] = useState({ center_name: '', address: '', phone: '', logo: '' });
  const [licenseValid, setLicenseValid] = useState<boolean | null>(null);

  const [isTakeExam, setIsTakeExam] = useState(() => /\/take-exam\//.test(window.location.pathname));

  const [isParent, setIsParent] = useState(() => /\/parent\b/.test(window.location.pathname));
  const [parentToken, setParentToken] = useState(() => localStorage.getItem('baderp-parent-token') || '');
  const [parentStudent, setParentStudent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('baderp-parent-student') || 'null'); } catch { return null; }
  });

  const [isStudent, setIsStudent] = useState(() => /\/student\b/.test(window.location.pathname));
  const [studentPortalToken, setStudentPortalToken] = useState(() => localStorage.getItem('baderp-student-token') || '');
  const [studentPortalStudent, setStudentPortalStudent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('baderp-student-student') || 'null'); } catch { return null; }
  });

  useEffect(() => {
    fetch('/api/check-license').then(r => r.json()).then(d => setLicenseValid(d.valid)).catch(() => setLicenseValid(true));
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsTakeExam(/\/take-exam\//.test(window.location.pathname));
      setIsParent(/\/parent\b/.test(window.location.pathname));
      setIsStudent(/\/student\b/.test(window.location.pathname));
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  useEffect(() => {
    supabase.from('center_config').select('center_name,address,phone,logo').maybeSingle().then(({ data }) => {
      if (data) setCenterInfo(data as any);
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('baderp-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => { setStudentAction('list'); }, [currentPage]);

  const toggleTheme = () => setIsDark(prev => !prev);

  if (isParent) {
    return parentToken && parentStudent ? (
      <ParentDashboard token={parentToken} studentInfo={parentStudent} onLogout={() => { handleParentLogout(); window.location.href = '/parent'; }} />
    ) : (
      <ParentLogin onLogin={handleParentLogin} />
    );
  }

  if (isStudent) {
    return studentPortalToken && studentPortalStudent ? (
      <StudentDashboard token={studentPortalToken} studentInfo={studentPortalStudent} onLogout={() => { handleStudentPortalLogout(); window.location.href = '/student'; }} />
    ) : (
      <StudentLogin onLogin={handleStudentPortalLogin} />
    );
  }

  if (!loggedIn) return <Login onLogin={handleLogin} />;

  const allowSettings = currentPage === 'settings';

  if (licenseValid === false && !allowSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100" dir="rtl">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <XCircle size={40} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">انتهت صلاحية الترخيص</h1>
          <p className="text-gray-500 text-sm mb-6">انتهت فترة التجربة (14 يوم). يرجى التواصل مع المطور لتجديد الترخيص.</p>
          <button onClick={() => navigate('settings')} className="bg-gray-800 hover:bg-gray-900 text-white font-semibold px-6 py-3 rounded-xl transition-colors">عرض معلومات الترخيص</button>
          <a href="https://wa.me/201008667306" target="_blank" rel="noopener noreferrer" className="block mt-3 text-green-600 text-sm font-semibold hover:underline">تواصل عبر واتساب</a>
        </div>
      </div>
    );
  }

  if (licenseValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100" dir="rtl">
        <div className="text-center text-gray-400">جاري التحقق من الترخيص...</div>
      </div>
    );
  }

  return (
    <ToastProvider>
      {isTakeExam ? (
        <TakeExam />
      ) : (
        <>
          <div className={`min-h-screen flex ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`} dir="rtl">
            <Sidebar currentPage={currentPage} onNavigate={navigate} onStudentAction={setStudentAction} collapsed={sidebarCollapsed} onExpand={() => setSidebarCollapsed(false)} />
            <div
              className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${isDark ? 'bg-gray-900' : 'bg-gray-100'} ${sidebarCollapsed ? 'mr-16' : 'mr-56'}`}
              onClick={() => setSidebarCollapsed(true)}
            >
              <Header currentPage={currentPage} onNavigate={navigate} searchQuery={searchQuery} onSearchChange={setSearchQuery} isDark={isDark} onToggleTheme={toggleTheme} onLogout={handleLogout} />
              <main className="flex-1 p-6">
                {currentPage === 'students' ? <Students searchQuery={searchQuery} studentAction={studentAction} onViewStudent={id => { setBeforeProfilePage('students'); navigate('student-profile'); setSelectedStudentId(id); }} editStudentId={editStudentId} onClearEdit={() => setEditStudentId(null)} deleteStudentId={deleteStudentId} onClearDelete={() => setDeleteStudentId(null)} /> :
                 currentPage === 'archive' ? <Archive onViewStudent={id => { setBeforeProfilePage('archive'); navigate('student-profile'); setSelectedStudentId(id); }} /> :
                 currentPage === 'absence' ? <Absence onViewStudent={id => { setBeforeProfilePage('absence'); navigate('student-profile'); setSelectedStudentId(id); }} /> :
                 currentPage === 'deposits-report' ? <DepositsReport onViewStudent={id => { setBeforeProfilePage('deposits-report'); navigate('student-profile'); setSelectedStudentId(id); }} /> :
                 currentPage === 'late-payers' ? <LatePayers onViewStudent={id => { setBeforeProfilePage('late-payers'); navigate('student-profile'); setSelectedStudentId(id); }} /> :
                   <PageContent page={currentPage} studentId={selectedStudentId} onBack={() => { navigate(beforeProfilePage || 'students'); setSelectedStudentId(undefined); }} onEditStudent={id => { setEditStudentId(id); navigate(beforeProfilePage || 'students'); setSelectedStudentId(undefined); }} onDeleteStudent={id => { setDeleteStudentId(id); navigate(beforeProfilePage || 'students'); setSelectedStudentId(undefined); }} onNavigate={navigate} />}
              </main>
            </div>
          </div>
          <div className="print-header">
            <div className="print-header-content">
              {centerInfo.logo && <img src={centerInfo.logo} alt="" className="print-logo" />}
              <strong>{centerInfo.center_name || 'CenterMasr'}</strong>
              <span>{centerInfo.address}</span>
              <span>{centerInfo.phone ? `ت: ${centerInfo.phone}` : ''}</span>
            </div>
          </div>
          <div className="print-footer">
            تمت الطباعة عن طريق CenterMasr لإدارة السناتر التعليمية | 01008667306
          </div>
        </>
      )}
    </ToastProvider>
  );
}
