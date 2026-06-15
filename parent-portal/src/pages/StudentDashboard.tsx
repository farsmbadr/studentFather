import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { User, BookOpen, DollarSign, FileText, Bell, AlertTriangle, CheckCircle, XCircle, BarChart3, RefreshCw, GraduationCap, LogOut } from 'lucide-react';
import type { DashboardData } from '../types';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const stored = sessionStorage.getItem('portal_student');
  const studentInfo = stored ? JSON.parse(stored) : null;

  useEffect(() => {
    if (!studentInfo) { navigate('/student', { replace: true }); return; }
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    if (!studentInfo) return;
    setLoading(true);
    setError('');
    try {
      const sid = studentInfo.id;
      const [studentRes, paymentsRes, examsRes, absenceRes, notesRes, booksRes, notifRes, totalRes] = await Promise.all([
        supabase.from('students').select('*').eq('id', sid).maybeSingle(),
        supabase.from('payments').select('*').eq('student_id', sid).order('date', { ascending: false }).limit(20),
        supabase.from('exam_results').select('*').eq('student_id', sid).order('date', { ascending: false }),
        supabase.from('absence_records').select('*').eq('student_id', sid).order('date', { ascending: false }).limit(30),
        supabase.from('attendance_notes').select('*').eq('student_id', sid).order('date', { ascending: false }).limit(20),
        supabase.from('book_deliveries').select('*').eq('student_id', sid).order('delivery_date', { ascending: false }).limit(20),
        supabase.from('notifications').select('*').or(`target.eq.all,target.eq.${studentInfo.code}`).order('created_at', { ascending: false }).limit(20),
        supabase.from('payments').select('amount').eq('student_id', sid),
      ]);
      const student = studentRes.data;
      if (!student) { setError('الطالب غير موجود'); setLoading(false); return; }
      const payments = paymentsRes.data || [];
      const totalPaid = totalRes.data?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
      const code = student.code;
      const statusRes = await supabase.from('student_status').select('*').eq('student_code', code).order('date', { ascending: false }).limit(10);
      setData({
        student,
        payments,
        exams: examsRes.data || [],
        absence: absenceRes.data || [],
        notes: notesRes.data || [],
        books: booksRes.data || [],
        statusEntries: statusRes.data || [],
        notifications: notifRes.data || [],
        totalPaid,
      });
    } catch (e: any) {
      setError(e.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('portal_student');
    sessionStorage.removeItem('portal_type');
    navigate('/student', { replace: true });
  };

  if (!studentInfo) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" dir="rtl">
        <div className="text-center">
          <RefreshCw size={32} className="text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-white/50 text-sm">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4" dir="rtl">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center max-w-sm">
          <XCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-300 text-sm mb-4">{error || 'حدث خطأ'}</p>
          <button onClick={loadDashboard} className="bg-white/10 hover:bg-white/20 text-white text-sm px-5 py-2 rounded-xl transition-colors">إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  const { student, payments, exams, absence, notes, books, statusEntries, notifications } = data;

  const StatCard = ({ icon, label, value, color }: any) => (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg shrink-0`}>{icon}</div>
      <div><p className="text-white/50 text-xs">{label}</p><p className="text-white font-bold text-lg">{value}</p></div>
    </div>
  );

  const Section = ({ id, title, icon, color, children }: any) => (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      <button onClick={() => setActiveSection(activeSection === id ? null : id)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>{icon}</div>
          <span className="text-white font-semibold text-sm">{title}</span>
        </div>
        <div className={`text-white/30 transition-transform ${activeSection === id ? 'rotate-180' : ''}`}>▼</div>
      </button>
      {activeSection === id && <div className="px-4 pb-4 border-t border-white/5 pt-3">{children}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" dir="rtl">
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">بوابة الطالب</h1>
            <p className="text-white/30 text-xs">مركز بدر التعليمي</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-white/40 hover:text-red-400 text-xs transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
          <LogOut size={14} /> تسجيل خروج
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="bg-gradient-to-bl from-blue-600/20 to-indigo-600/10 backdrop-blur-xl rounded-2xl border border-blue-500/20 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shrink-0">
                <span className="text-white font-bold text-xl">{student.name?.charAt(0) || '?'}</span>
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">{student.name}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  <span className="text-white/40 text-xs flex items-center gap-1"><User size={11} />{student.code}</span>
                  <span className="text-white/40 text-xs">{student.grade}</span>
                  {student.group_name && <span className="text-white/40 text-xs">مجموعة: {student.group_name}</span>}
                </div>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${student.status === 'active' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'}`}>
              {student.status === 'active' ? 'نشط' : 'غير نشط'}
            </span>
          </div>
          {student.address && <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/40">{student.address}</div>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<DollarSign size={16} className="text-white" />} label="المدفوع" value={`${data.totalPaid?.toLocaleString() || 0} ج`} color="from-emerald-500 to-teal-600" />
          <StatCard icon={<BarChart3 size={16} className="text-white" />} label="الامتحانات" value={exams.length} color="from-blue-500 to-indigo-600" />
          <StatCard icon={<FileText size={16} className="text-white" />} label="الغياب" value={absence.length} color="from-amber-500 to-orange-600" />
          <StatCard icon={<BookOpen size={16} className="text-white" />} label="الكتب" value={books.length} color="from-purple-500 to-pink-600" />
        </div>

        <Section id="payments" title="المصروفات" icon={<DollarSign size={14} className="text-white" />} color="from-emerald-500 to-teal-600">
          {payments.length === 0 ? <p className="text-white/30 text-sm text-center py-4">لا توجد مدفوعات</p> : (
            <div className="space-y-2">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-xl px-3.5 py-2.5">
                  <div><p className="text-white text-sm font-medium">{p.amount?.toLocaleString()} ج</p><p className="text-white/30 text-xs">{p.date}</p></div>
                  {p.notes && <span className="text-white/30 text-xs">{p.notes}</span>}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section id="exams" title="نتائج الامتحانات" icon={<BarChart3 size={14} className="text-white" />} color="from-blue-500 to-indigo-600">
          {exams.length === 0 ? <p className="text-white/30 text-sm text-center py-4">لا توجد نتائج</p> : (
            <div className="space-y-2">
              {exams.map((e: any) => {
                const pct = e.max_score > 0 ? Math.round((e.score / e.max_score) * 100) : 0;
                return (
                  <div key={e.id} className="bg-white/5 rounded-xl px-3.5 py-2.5">
                    <div className="flex items-center justify-between">
                      <div><p className="text-white text-sm font-medium">{e.exam_title}</p><p className="text-white/30 text-xs">{e.subject} — {e.date}</p></div>
                      <div className="text-left">
                        <span className={`text-sm font-bold ${pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{e.score}/{e.max_score}</span>
                        <span className={`block text-xs ${pct >= 80 ? 'text-emerald-400/60' : pct >= 50 ? 'text-amber-400/60' : 'text-red-400/60'}`}>{pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section id="absence" title="الغياب" icon={<AlertTriangle size={14} className="text-white" />} color="from-amber-500 to-orange-600">
          {absence.length === 0 ? <p className="text-white/30 text-sm text-center py-4">لا توجد غيابات</p> : (
            <div className="space-y-2">
              {absence.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between bg-white/5 rounded-xl px-3.5 py-2.5">
                  <div><p className="text-white text-sm"><span className="text-red-400">❌</span> {a.date}</p>{a.reason && <p className="text-white/30 text-xs">السبب: {a.reason}</p>}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section id="notes" title="ملاحظات الحضور" icon={<FileText size={14} className="text-white" />} color="from-cyan-500 to-blue-600">
          {notes.length === 0 ? <p className="text-white/30 text-sm text-center py-4">لا توجد ملاحظات</p> : (
            <div className="space-y-2">
              {notes.map((n: any) => (
                <div key={n.id} className="bg-white/5 rounded-xl px-3.5 py-2.5">
                  <p className="text-white text-sm">{n.note}</p>
                  <p className="text-white/30 text-xs mt-0.5">{n.date}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section id="books" title="الكتب المستلمة" icon={<BookOpen size={14} className="text-white" />} color="from-purple-500 to-pink-600">
          {books.length === 0 ? <p className="text-white/30 text-sm text-center py-4">لا توجد كتب مسلمة</p> : (
            <div className="space-y-2">
              {books.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between bg-white/5 rounded-xl px-3.5 py-2.5">
                  <div><p className="text-white text-sm font-medium">{b.book_title}</p><p className="text-white/30 text-xs">{b.book_subject} — {b.delivery_date} ({b.quantity} نسخة)</p></div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">{b.status}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section id="status" title="الحالة الدراسية" icon={<CheckCircle size={14} className="text-white" />} color="from-green-500 to-emerald-600">
          {statusEntries.length === 0 ? <p className="text-white/30 text-sm text-center py-4">لا توجد تقييمات</p> : (
            <div className="space-y-2">
              {statusEntries.map((s: any) => (
                <div key={s.id} className="bg-white/5 rounded-xl px-3.5 py-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-white text-sm">{s.status_type}</p>
                    <span className="text-white/30 text-xs">{s.date}</span>
                  </div>
                  {s.notes && <p className="text-white/40 text-xs mt-1">{s.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section id="notifications" title="الإشعارات" icon={<Bell size={14} className="text-white" />} color="from-violet-500 to-purple-600">
          {notifications.length === 0 ? <p className="text-white/30 text-sm text-center py-4">لا توجد إشعارات</p> : (
            <div className="space-y-2">
              {notifications.map((n: any) => (
                <div key={n.id} className="bg-white/5 rounded-xl px-3.5 py-2.5">
                  <p className="text-white text-sm font-medium">{n.title}</p>
                  <p className="text-white/40 text-xs mt-0.5">{n.message}</p>
                  <p className="text-white/20 text-xs mt-1">{n.created_at}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="text-center pb-6">
        <p className="text-white/10 text-xs">مركز بدر التعليمي — نظام إدارة السناتر التعليمية</p>
      </div>
    </div>
  );
}
