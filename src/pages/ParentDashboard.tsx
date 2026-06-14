import { useState, useEffect } from 'react';
import { GraduationCap, LogOut, User, Phone, BookOpen, DollarSign, FileText, Bell, AlertTriangle, CheckCircle, XCircle, BarChart3, RefreshCw, MessageSquare, Send } from 'lucide-react';

interface DashboardData {
  student: any;
  payments: any[];
  exams: any[];
  absence: any[];
  notes: any[];
  books: any[];
  statusEntries: any[];
  notifications: any[];
  totalPaid: number;
}

interface ParentDashboardProps {
  token: string;
  studentInfo: any;
  onLogout: () => void;
}

export default function ParentDashboard({ token, studentInfo, onLogout }: ParentDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/parent/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
    } catch (e: any) {
      setError(e.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    setLoadingMessages(true);
    try {
      const r = await fetch('/api/parent/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setMessages(await r.json());
    } catch {} finally { setLoadingMessages(false); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setSendingMsg(true);
    try {
      const r = await fetch('/api/parent/messages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      });
      if (r.ok) { setNewMessage(''); loadMessages(); }
    } catch {} finally { setSendingMsg(false); }
  };

  useEffect(() => { loadDashboard(); loadMessages(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" dir="rtl">
        <div className="text-center">
          <RefreshCw size={32} className="text-emerald-400 animate-spin mx-auto mb-3" />
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
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-white/50 text-xs">{label}</p>
        <p className="text-white font-bold text-lg">{value}</p>
      </div>
    </div>
  );

  const Section = ({ id, title, icon, color, children }: any) => (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setActiveSection(activeSection === id ? null : id)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
            {icon}
          </div>
          <span className="text-white font-semibold text-sm">{title}</span>
        </div>
        <div className={`text-white/30 transition-transform ${activeSection === id ? 'rotate-180' : ''}`}>
          ▼
        </div>
      </button>
      {activeSection === id && <div className="px-4 pb-4 border-t border-white/5 pt-3">{children}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" dir="rtl">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">بوابة ولي الأمر</h1>
            <p className="text-white/30 text-xs">مركز بدر التعليمي</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-white/40 hover:text-red-400 text-xs transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
          <LogOut size={14} />
          تسجيل خروج
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Student Info Card */}
        <div className="bg-gradient-to-bl from-emerald-600/20 to-teal-600/10 backdrop-blur-xl rounded-2xl border border-emerald-500/20 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shrink-0">
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
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${student.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
              {student.status === 'active' ? 'نشط' : 'غير نشط'}
            </span>
          </div>
          {(student.parent_name || student.parent_phone) && (
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-3 text-xs text-white/40">
              {student.parent_name && <span className="flex items-center gap-1"><User size={11} />{student.parent_name}</span>}
              {student.parent_phone && <span className="flex items-center gap-1"><Phone size={11} />{student.parent_phone}</span>}
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<DollarSign size={16} className="text-white" />} label="المدفوع" value={`${data.totalPaid?.toLocaleString() || 0} ج`} color="from-emerald-500 to-teal-600" />
          <StatCard icon={<BarChart3 size={16} className="text-white" />} label="الامتحانات" value={exams.length} color="from-blue-500 to-indigo-600" />
          <StatCard icon={<FileText size={16} className="text-white" />} label="الغياب" value={absence.length} color="from-amber-500 to-orange-600" />
          <StatCard icon={<BookOpen size={16} className="text-white" />} label="الكتب" value={books.length} color="from-purple-500 to-pink-600" />
        </div>

        {/* Sections */}
        <Section id="payments" title="المصروفات" icon={<DollarSign size={14} className="text-white" />} color="from-emerald-500 to-teal-600">
          {payments.length === 0 ? <p className="text-white/30 text-sm text-center py-4">لا توجد مدفوعات</p> : (
            <div className="space-y-2">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-xl px-3.5 py-2.5">
                  <div>
                    <p className="text-white text-sm font-medium">{p.amount?.toLocaleString()} ج</p>
                    <p className="text-white/30 text-xs">{p.date}</p>
                  </div>
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
                      <div>
                        <p className="text-white text-sm font-medium">{e.exam_title}</p>
                        <p className="text-white/30 text-xs">{e.subject} — {e.date}</p>
                      </div>
                      <div className="text-left">
                        <span className={`text-sm font-bold ${pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                          {e.score}/{e.max_score}
                        </span>
                        <span className={`block text-xs ${pct >= 80 ? 'text-emerald-400/60' : pct >= 50 ? 'text-amber-400/60' : 'text-red-400/60'}`}>
                          {pct}%
                        </span>
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
                  <div>
                    <p className="text-white text-sm"><span className="text-red-400">❌</span> {a.date}</p>
                    {a.reason && <p className="text-white/30 text-xs">السبب: {a.reason}</p>}
                  </div>
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
                  <div>
                    <p className="text-white text-sm font-medium">{b.book_title}</p>
                    <p className="text-white/30 text-xs">{b.book_subject} — {b.delivery_date} ({b.quantity} نسخة)</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">{b.status}</span>
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

        {/* Messages Section */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          <button
            onClick={() => setActiveSection(activeSection === 'messages' ? null : 'messages')}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                <MessageSquare size={14} className="text-white" />
              </div>
              <span className="text-white font-semibold text-sm">رسائلي إلى المركز</span>
            </div>
            <div className={`text-white/30 transition-transform ${activeSection === 'messages' ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </button>

          {activeSection === 'messages' && (
            <div className="px-4 pb-4 border-t border-white/5 pt-3">
              {/* Send new message */}
              <div className="flex items-end gap-2 mb-4">
                <div className="flex-1">
                  <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    placeholder="اكتب رسالتك إلى الإدارة..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none" />
                </div>
                <button onClick={sendMessage} disabled={sendingMsg || !newMessage.trim()}
                  className="bg-gradient-to-l from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white px-4 py-2.5 rounded-xl transition-all text-xs font-semibold disabled:opacity-50 shrink-0">
                  {sendingMsg ? '...' : <Send size={16} />}
                </button>
              </div>

              {/* Messages list */}
              {loadingMessages ? (
                <p className="text-white/30 text-sm text-center py-4">جاري التحميل...</p>
              ) : messages.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-4">لا توجد رسائل سابقة</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {messages.map((m: any) => (
                    <div key={m.id} className={`rounded-xl px-3.5 py-2.5 ${m.reply ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5'}`}>
                      <div className="flex items-start justify-between">
                        <p className={`text-sm ${m.reply ? 'text-emerald-200' : 'text-white'}`}>{m.message}</p>
                        <span className="text-white/20 text-[10px] shrink-0 mr-2">
                          {new Date(m.created_at).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      {m.reply && (
                        <div className="mt-2 pt-2 border-t border-emerald-500/20">
                          <p className="text-xs text-emerald-300"><span className="font-semibold">رد المركز:</span> {m.reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="text-center pb-6">
        <p className="text-white/10 text-xs">مركز بدر التعليمي — نظام إدارة السناتر التعليمية</p>
      </div>
    </div>
  );
}
