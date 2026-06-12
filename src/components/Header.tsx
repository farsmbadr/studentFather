import { useState } from 'react';
import { Bell, Printer, LogOut, Search, MessageCircle, Sun, Moon, ScanLine } from 'lucide-react';
import { Page } from '../types';

const pageTitles: Record<Page, string> = {
  'dashboard': 'الصفحة الرئيسية',
  'students': 'الطلاب',
  'archive': 'أرشيف الطلاب',
  'status': 'إدارة الأموال',
  'absence': 'تسجيل الغياب',
  'absence-reports': 'إجماليات ونسب',
  'absence-latest': 'آخر التسجيلات',
  'absence-warnings': 'إنذارات الغياب',
  'absence-sheet': 'كشف غياب شهري',
  'exams': 'إدارة الاختبارات',
  'exam-list': 'قائمة الاختبارات',
  'exam-add': 'إضافة اختبار',
  'exam-top-scorers': 'أوائل الاختبارات',
  'exam-group-report': 'تقرير مجموعة',
  'exam-score-sheet': 'كشف الدرجات',
  'exam-statistics': 'إجماليات ونسب',
  'exam-setup': 'إعداد الاختبار',
  'exam-essay-grading': 'تصحيح مقالي',
  'question-bank': 'بنك الأسئلة',
  'books': 'إدارة الكتب والمطبوعات',
  'book-list': 'قائمة الكتب',
  'book-profits': 'أرباح الكتب',
  'book-delivery': 'تسليم كتاب',
  'book-stats': 'إحصائيات الكتاب',
  'supplier-list': 'قائمة الموردين',
  'publications': 'المطبوعات',
  'basic-data': 'بيانات السنتر',
  'classes': 'المعلمين',
  'groups': 'المجموعات',
  'notifications': 'الإشعارات',
  'student-profile': 'ملف الطالب',
  'student-report': 'إجماليات ونسب',
  'subjects': 'المواد',
  'settings': 'الإعدادات',
  'users': 'المستخدمون',
  'login-log': 'سجلات الدخول',
  'grades': 'الصفوف',
};

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
}

function BarcodeModal({ onClose, onCode }: { onClose: () => void; onCode: (code: string) => void }) {
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');

  const startScanning = async () => {
    if (!('BarcodeDetector' in window)) {
      setError('المتصفح لا يدعم مسح الباركود. استخدم البحث اليدوي.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'code_39'] });

      const scan = setInterval(async () => {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            clearInterval(scan);
            stream.getTracks().forEach(t => t.stop());
            onCode(barcodes[0].rawValue);
            onClose();
          }
        } catch { }
      }, 500);

      setTimeout(() => {
        clearInterval(scan);
        stream.getTracks().forEach(t => t.stop());
      }, 30000);
    } catch {
      setError('لم يتم الوصول للكاميرا. استخدم البحث اليدوي.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-gray-800">مسح باركود الطالب</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><span className="text-xl">×</span></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button onClick={startScanning} className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 rounded-xl transition-colors">
            فتح الكاميرا للمسح
          </button>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">أو</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">إدخال كود الطالب يدوياً</label>
            <input value={manual} onChange={e => setManual(e.target.value)} placeholder="أدخل الكود..." className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </div>
        </div>
        <div className="flex gap-3 justify-end p-5 border-t">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
          <button onClick={() => { if (manual.trim()) { onCode(manual.trim()); onClose(); } }} className="px-5 py-2 rounded-lg bg-pink-500 text-white text-sm font-semibold hover:bg-pink-600">بحث</button>
        </div>
      </div>
    </div>
  );
}

export default function Header({ currentPage, onNavigate, searchQuery, onSearchChange, isDark, onToggleTheme, onLogout }: HeaderProps) {
  const [showBarcode, setShowBarcode] = useState(false);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      onNavigate('students');
    }
  };

  const handleBarcode = (code: string) => {
    onSearchChange(code);
    onNavigate('students');
  };

  return (
    <>
      {showBarcode && <BarcodeModal onClose={() => setShowBarcode(false)} onCode={handleBarcode} />}
      <header className={`h-14 shadow-sm flex items-center justify-between px-6 sticky top-0 z-30 transition-colors ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>{pageTitles[currentPage]}</div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="بحث عن كود طالب..."
              autoComplete="off"
              className={`rounded-lg px-4 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all pr-8 ${isDark ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-gray-100 text-gray-700'}`}
            />
            <Search size={14} className="absolute right-2.5 top-2.5 text-gray-400" />
          </div>

          <button onClick={() => window.print()} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}>
            <Printer size={18} />
          </button>

          <button onClick={onToggleTheme} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button onClick={() => setShowBarcode(true)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}>
            <ScanLine size={18} />
          </button>

          <button onClick={() => onNavigate('notifications')} className={`p-2 rounded-lg transition-colors relative ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}>
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full"></span>
          </button>

          <a href="https://wa.me/201008667306" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-sm">
            <MessageCircle size={15} />
            تواصل معنا
          </a>

          <button onClick={onLogout} className={`flex items-center gap-1.5 text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}>
            <LogOut size={16} />
            تسجيل الخروج
          </button>
        </div>
      </header>
    </>
  );
}
