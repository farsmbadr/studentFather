import { useState } from 'react';
import {
  LayoutDashboard, Users, ClipboardList, UserX, FileText, BookOpen,
  Printer, Database, Group, Bell, UserCog, LogIn, MessageSquare,
  ChevronDown, ChevronLeft, Eye, Plus, FileText as FileTextIcon, Archive,
  Server, GraduationCap, Sliders, AlertTriangle, Trophy, BarChart3, ScrollText,
  HelpCircle, TrendingUp, CheckCircle, Truck, Wallet, DollarSign, CreditCard,
  PiggyBank, AlertCircle, BarChartHorizontal, CalendarRange, Receipt, Settings
} from 'lucide-react';
import { Page, StudentAction } from '../types';
import { getCurrentUser } from '../auth';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
  children?: { id: Page; action?: StudentAction; label: string; icon: React.ReactNode }[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard size={18} /> },
  {
    id: 'students', label: 'إدارة الطلاب', icon: <Users size={18} />,
    children: [
      { id: 'students', action: 'list', label: 'قائمة الطلاب', icon: <Eye size={14} /> },
      { id: 'student-report', label: 'إجماليات ونسب', icon: <FileTextIcon size={14} /> },
      { id: 'archive', label: 'أرشيف الطلاب', icon: <Archive size={14} /> },
    ],
  },
  {
    id: 'absence', label: 'إدارة الغياب', icon: <UserX size={18} />,
    children: [
      { id: 'absence', action: 'list', label: 'تسجيل الغياب', icon: <Plus size={14} /> },
      { id: 'absence-reports', label: 'إجماليات ونسب', icon: <FileTextIcon size={14} /> },
      { id: 'absence-latest', label: 'آخر التسجيلات', icon: <Eye size={14} /> },
      { id: 'absence-warnings', label: 'إنذارات الغياب', icon: <AlertTriangle size={14} /> },
      { id: 'absence-sheet', label: 'كشف غياب شهري', icon: <Printer size={14} /> },
    ],
  },
  {
    id: 'exams', label: 'إدارة الاختبارات', icon: <FileText size={18} />,
    children: [
      { id: 'exam-list', action: 'list', label: 'قائمة الاختبارات', icon: <Eye size={14} /> },
      { id: 'exam-top-scorers', label: 'أوائل الاختبارات', icon: <Trophy size={14} /> },
      { id: 'exam-group-report', label: 'تقرير مجموعة', icon: <Users size={14} /> },
      { id: 'exam-score-sheet', label: 'كشف الدرجات', icon: <ScrollText size={14} /> },
      { id: 'exam-statistics', label: 'إجماليات ونسب', icon: <BarChart3 size={14} /> },
      { id: 'exam-essay-grading', label: 'تصحيح مقالي', icon: <ClipboardList size={14} /> },
      { id: 'question-bank', label: 'بنك الأسئلة', icon: <HelpCircle size={14} /> },
    ],
  },
  {
    id: 'books', label: 'إدارة الكتب والمطبوعات', icon: <BookOpen size={18} />,
    children: [
      { id: 'book-list', label: 'قائمة الكتب', icon: <Eye size={14} /> },
      { id: 'book-profits', label: 'أرباح الكتب', icon: <TrendingUp size={14} /> },
      { id: 'book-delivery', label: 'تسليم كتاب', icon: <CheckCircle size={14} /> },
      { id: 'supplier-list', label: 'قائمة الموردين', icon: <Truck size={14} /> },
      { id: 'publications', label: 'المطبوعات', icon: <Printer size={14} /> },
    ],
  },
  {
    id: 'revenues', label: 'إدارة الأموال', icon: <Wallet size={18} />,
    children: [
      { id: 'daily-report', label: 'التقرير اليومى', icon: <CalendarRange size={14} /> },
      { id: 'revenues', label: 'الإيرادات', icon: <DollarSign size={14} /> },
      { id: 'deposits-report', label: 'مقدمات الحجز', icon: <CreditCard size={14} /> },
      { id: 'revenue-archive', label: 'أرشيف الإيرادات', icon: <Archive size={14} /> },
      { id: 'late-payers', label: 'المتخلفون عن الدفع', icon: <AlertCircle size={14} /> },
      { id: 'group-fees', label: 'تحديد المصروفات', icon: <Settings size={14} /> },
      { id: 'expenses', label: 'المصروفات والإهلاكات', icon: <Receipt size={14} /> },
      { id: 'expense-archive', label: 'أرشيف المصروفات', icon: <Archive size={14} /> },
      { id: 'monthly-stats', label: 'إحصائيات الشهر', icon: <BarChartHorizontal size={14} /> },
      { id: 'finance-report', label: 'إجماليات ونسب', icon: <PiggyBank size={14} /> },
    ],
  },
  {
    id: 'basic-data', label: 'الإدارة الرئيسية', icon: <Database size={18} />,
    children: [
      { id: 'basic-data', label: 'بيانات السنتر', icon: <Server size={14} /> },
      { id: 'subjects', label: 'المواد', icon: <BookOpen size={14} /> },
      { id: 'grades', label: 'الصفوف', icon: <BarChart3 size={14} /> },
      { id: 'classes', label: 'المعلمين', icon: <GraduationCap size={14} /> },
      { id: 'groups', label: 'المجموعات', icon: <Group size={14} /> },
      { id: 'notifications', label: 'الإشعارات', icon: <Bell size={14} /> },
      { id: 'parent-messages', label: 'إشعارات أولياء الأمور', icon: <MessageSquare size={14} /> },
      { id: 'settings', label: 'الإعدادات', icon: <Sliders size={14} /> },
      { id: 'users', label: 'المستخدمين', icon: <UserCog size={14} /> },
      { id: 'login-log', label: 'سجلات الدخول', icon: <LogIn size={14} /> },
    ],
  },
];

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onStudentAction: (action: StudentAction) => void;
  collapsed: boolean;
  onExpand: () => void;
}

export default function Sidebar({ currentPage, onNavigate, onStudentAction, collapsed, onExpand }: SidebarProps) {
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const user = getCurrentUser();
  const perms = user.permissions || [];
  const hasAccess = (pageId: string) => perms.includes('all') || perms.includes(pageId);

  const visibleNav = user.is_super_admin ? navItems : navItems.filter(item => {
    if (hasAccess(item.id)) return true;
    if (item.children) return item.children.some(c => hasAccess(c.id));
    return false;
  });



  const toggleMenu = (id: string) => setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <aside
      onMouseEnter={onExpand}
      className={`h-screen bg-gray-900 flex flex-col fixed right-0 top-0 z-40 shadow-2xl transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}
    >
      {/* Logo */}
      <div className={`flex items-center py-5 border-b border-white/10 shrink-0 ${collapsed ? 'justify-center px-0' : 'gap-2 px-4'}`}>
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
           <img src="/logo.png" alt="شعار" className="w-8 h-8 object-contain" />
        </div>
        {!collapsed && <span className="text-white font-bold text-base tracking-wide">CenterMasr</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
        {visibleNav.map((item) => {
          const visibleChildren = user.is_super_admin ? item.children : item.children?.filter(c => hasAccess(c.id));
          return (
          <div key={item.id}>
            <button
              onClick={() => {
                if (item.children && !collapsed) {
                  toggleMenu(item.id);
                } else {
                  if (item.children) onStudentAction('list');
                  onNavigate(item.id);
                }
              }}
              className={`flex items-center w-full rounded-lg cursor-pointer transition-all duration-200 ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2.5 text-right'} text-sm font-medium ${currentPage === item.id ? 'bg-pink-500 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="opacity-80 shrink-0">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.children && (
                    expandedMenus[item.id] ? <ChevronDown size={14} /> : <ChevronLeft size={14} />
                  )}
                </>
              )}
            </button>

            {!collapsed && item.children && expandedMenus[item.id] && visibleChildren && visibleChildren.length > 0 && (
              <div className="mr-4 mt-0.5 space-y-0.5 border-r border-white/10 pr-2">
                {visibleChildren.map((child, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onStudentAction(child.action || 'list');
                      onNavigate(child.id);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    {child.icon}
                    <span>{child.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );})}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/10 space-y-1 shrink-0">
          <p className="text-gray-500 text-xs text-center">v1.0.0 &copy; 2026</p>
          <a href="https://wa.me/201008667306" target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-green-400 hover:text-green-300 transition-colors">
            تواصل معنا عبر واتساب
          </a>
        </div>
      )}
    </aside>
  );
}
