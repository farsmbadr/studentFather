import { useState, useEffect } from 'react';
import { AlertTriangle, UserX, Bell, Users, RefreshCw, Check, ExternalLink } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';

const DEFAULT_THRESHOLD = 3;

export default function AbsenceWarnings() {
  const { show, confirm } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [sentWarnings, setSentWarnings] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [sending, setSending] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [warningLog, setWarningLog] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [rec, notif] = await Promise.all([
      supabase.from('absence_records').select('*'),
      supabase.from('notifications').select('*').eq('title', 'إنذار غياب').order('created_at', { ascending: false }),
    ]);
    setRecords(rec.data || []);
    const sent = new Set<string>();
    const log = notif.data || [];
    for (const n of log) {
      const match = n.message?.match(/الطالب\s+(.+?)\s+\(/);
      if (match) sent.add(match[1].trim());
    }
    setSentWarnings(sent);
    setWarningLog(log);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const byStudent: Record<string, { count: number; grade: string; group: string; name: string }> = {};
  for (const r of records) {
    const k = r.student_name || 'غير معروف';
    if (!byStudent[k]) byStudent[k] = { count: 0, grade: r.grade || '', group: r.group_name || '', name: k };
    byStudent[k].count++;
  }
  const flagged = Object.values(byStudent).filter(s => s.count >= threshold).sort((a, b) => b.count - a.count);

  const sendWarning = async (student: typeof flagged[0]) => {
    if (!await confirm(`إرسال إنذار غياب لـ ${student.name}؟`)) return;
    setSending(student.name);
    await supabase.from('notifications').insert({
      title: 'إنذار غياب',
      message: `الطالب ${student.name} (${student.grade}) تجاوز ${student.count} غياب — يرجى التواصل مع ولي الأمر`,
      target: 'all',
      is_read: false,
    });
    sentWarnings.add(student.name);
    setSentWarnings(new Set(sentWarnings));
    show(`تم إرسال إنذار لـ ${student.name} — شوفه في صفحة الإشعارات`);
    setSending(null);
  };

  const sendAll = async () => {
    if (!await confirm(`إرسال إنذارات لجميع الطلاب (${flagged.length})؟`)) return;
    setSending('all');
    const rows = flagged.map(s => ({
      title: 'إنذار غياب',
      message: `الطالب ${s.name} (${s.grade}) تجاوز ${s.count} غياب — يرجى التواصل مع ولي الأمر`,
      target: 'all',
      is_read: false,
    }));
    await supabase.from('notifications').insert(rows);
    for (const s of flagged) sentWarnings.add(s.name);
    setSentWarnings(new Set(sentWarnings));
    show(`تم إرسال ${rows.length} إنذار — شوفها في صفحة الإشعارات`);
    setSending(null);
  };

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <AlertTriangle size={20} className="text-red-500" /> إنذارات الغياب
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">الحد الأدنى:</span>
          <input type="number" min={1} value={threshold} onChange={e => setThreshold(Number(e.target.value))}
            className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <button onClick={load} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><UserX size={20} className="text-red-600" /></div>
            <div><div className="text-2xl font-bold text-gray-800">{Object.keys(byStudent).length}</div><div className="text-xs text-gray-500">إجمالي الطلاب</div></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center"><AlertTriangle size={20} className="text-orange-600" /></div>
            <div><div className="text-2xl font-bold text-gray-800">{flagged.length}</div><div className="text-xs text-gray-500">تجاوزوا الحد</div></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><Users size={20} className="text-blue-600" /></div>
            <div><div className="text-2xl font-bold text-gray-800">{records.length}</div><div className="text-xs text-gray-500">إجمالي الغيابات</div></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><Bell size={20} className="text-purple-600" /></div>
            <div><div className="text-2xl font-bold text-gray-800">{flagged[0]?.count || 0}</div><div className="text-xs text-gray-500">أكثر طالب غيابًا</div></div>
          </div>
        </div>
      </div>

      {/* رابط الإشعارات */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-center justify-between">
        <span>الإنذارات اللي بترسلها بتظهر في صفحة <strong>الإشعارات</strong></span>
        <a href="#" onClick={e => { e.preventDefault(); (window as any).__navigate?.('notifications'); }}
          className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 underline">
          <ExternalLink size={14} /> فتح الإشعارات
        </a>
      </div>

      {flagged.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button onClick={() => setShowHistory(!showHistory)} className="text-xs text-gray-500 hover:text-gray-700 underline">
            {showHistory ? 'إخفاء السجل' : `عرض سجل الإنذارات (${warningLog.length})`}
          </button>
          <button onClick={sendAll} disabled={sending === 'all'}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2">
            {sending === 'all' ? 'جاري الإرسال...' : `إرسال إنذار للكل (${flagged.length})`}
            <Bell size={16} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {flagged.map(s => {
            const alreadySent = sentWarnings.has(s.name);
            return (
              <div key={s.name} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="font-semibold text-gray-800 text-sm">{s.name}</span>
                  <span className="text-xs text-gray-400">{s.grade}</span>
                  <span className="text-xs text-gray-500">{s.group}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {alreadySent && <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><Check size={12} /> تم</span>}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${alreadySent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {s.count} غياب{s.count !== 1 ? 'ات' : ''}
                  </span>
                  <button onClick={() => sendWarning(s)} disabled={sending === s.name || alreadySent}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 flex items-center gap-1 ${alreadySent ? 'border-green-200 text-green-600 bg-green-50' : 'border-orange-200 text-orange-700 hover:bg-orange-50'}`}>
                    {sending === s.name ? <RefreshCw size={12} className="animate-spin" /> : alreadySent ? <Check size={12} /> : <Bell size={12} />}
                    {alreadySent ? 'تم الإرسال' : 'إنذار'}
                  </button>
                </div>
              </div>
            );
          })}
          {!loading && !flagged.length && (
            <div className="py-12 text-center text-gray-300 text-sm flex flex-col items-center gap-2">
              <Check size={32} className="text-green-400" />
              لا يوجد طلاب تجاوزوا الحد الأدنى ({threshold})
            </div>
          )}
          {loading && <div className="py-12 text-center text-gray-400 text-sm">جاري التحميل...</div>}
        </div>
      </div>

      {/* سجل الإنذارات */}
      {showHistory && warningLog.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50">
            <span className="font-bold text-sm text-gray-700">سجل الإنذارات المرسلة</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
            {warningLog.map((n, i) => (
              <div key={n.id || i} className="px-5 py-2.5 text-sm text-gray-600">
                {n.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
