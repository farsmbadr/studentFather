import { useState, useEffect, useRef } from 'react';
import { CreditCard, Eye, Search, Trash2, Loader } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';

export default function DepositsReport({ onViewStudent }: { onViewStudent?: (id: string) => void }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { show } = useToast();

  const [allGrades, setAllGrades] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [stuRes, grdRes] = await Promise.all([
        supabase.from('students').select('*').order('name'),
        supabase.from('grades').select('name').order('name'),
      ]);
      const withDeposits = (stuRes.data || []).filter((s: any) => Number(s.booking_deposit) > 0);
      setStudents(withDeposits);
      setAllGrades((grdRes.data || []).map((g: any) => g.name));
      setAllGroups([...new Set(withDeposits.map((s: any) => s.group_name).filter(Boolean))].sort() as string[]);
      setLoading(false);
    })();
  }, []);

  const filtered = submitted ? students.filter(s => {
    if (filterGrade && s.grade !== filterGrade) return false;
    if (filterGroup && s.group_name !== filterGroup) return false;
    if (filterDate) {
      const join = s.join_date?.slice(0, 10);
      if (join !== filterDate) return false;
    }
    if (maxAmount && Number(s.booking_deposit) > Number(maxAmount)) return false;
    return true;
  }) : [];

  const total = filtered.reduce((s, st) => s + Number(st.booking_deposit), 0);

  const reload = async () => {
    const { data } = await supabase.from('students').select('*').order('name');
    const withDeposits = (data || []).filter((s: any) => Number(s.booking_deposit) > 0);
    setStudents(withDeposits);
  };

  const handleDelete = async (st: any) => {
    const totalRefund = Number(st.booking_deposit || 0);
    setDeleting(st.id);
    if (!await confirm(st.name, totalRefund)) { setDeleting(null); return; }
    if (totalRefund > 0) {
      await supabase.from('expenses').insert({
        title: `استرداد مقدم حجز ${st.name}`,
        amount: totalRefund, category: 'إهلاكات',
        date: new Date().toISOString().slice(0, 10),
        notes: `حذف ${st.name} مع استرداد مقدم الحجز`,
      });
    }
    await supabase.from('payments').delete().eq('student_id', st.id);
    await supabase.from('students').delete().eq('id', st.id);
    show('تم حذف الطالب واسترداد المقدم');
    await reload();
    setDeleting(null);
  };

  const [confirmData, setConfirmData] = useState<{ name: string; amount: number } | null>(null);
  const confirmResolve = useRef<((v: boolean) => void) | null>(null);

  const confirm = (name: string, amount: number): Promise<boolean> => {
    return new Promise(resolve => {
      confirmResolve.current = resolve;
      setConfirmData({ name, amount });
    });
  };

  return (
    <div className="fade-in space-y-4">
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-center gap-2">
          <CreditCard size={24} />
          <span className="text-lg text-white/80">إجمالى مقدمات الحجز</span>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-bold mr-auto">{students.length} طالب</span>
        </div>
        <p className="text-2xl font-bold mt-1">{total.toFixed(2)} ج</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow p-4 border border-gray-100">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">الصف</span>
            <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="">الكل</option>
              {allGrades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">المجموعة</span>
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="">الكل</option>
              {allGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">تاريخ الحجز</span>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">المبلغ أقل من</span>
            <input type="number" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} placeholder="0"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <button onClick={() => setSubmitted(true)}
            className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-1.5 rounded-lg font-semibold transition-colors">
            <Search size={15} /> عرض التقرير
          </button>
        </div>
      </div>

      {/* Results */}
      {submitted && (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">جاري التحميل...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">لا توجد نتائج</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-50 border-b border-amber-100">
                  <th className="text-center py-3 px-3 text-amber-800 font-semibold">#</th>
                  <th className="text-right py-3 px-3 text-amber-800 font-semibold">اسم الطالب</th>
                  <th className="text-right py-3 px-3 text-amber-800 font-semibold">رقم الهاتف</th>
                  <th className="text-right py-3 px-3 text-amber-800 font-semibold">رقم ولي الأمر</th>
                  <th className="text-center py-3 px-3 text-amber-800 font-semibold">المقدم</th>
                  <th className="text-center py-3 px-3 text-amber-800 font-semibold">التاريخ والساعة</th>
                  <th className="text-center py-3 px-3 text-amber-800 font-semibold">خيارات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((st, i) => (
                  <tr key={st.id} className="border-b border-gray-50 hover:bg-amber-50/40 transition-colors">
                    <td className="text-center py-3 px-3 text-gray-500">{i + 1}</td>
                    <td className="py-3 px-3 font-semibold text-gray-800">{st.name}</td>
                    <td className="py-3 px-3 text-gray-600 dir-ltr text-xs">{st.phone || '—'}</td>
                    <td className="py-3 px-3 text-gray-600 dir-ltr text-xs">{st.parent_phone || '—'}</td>
                    <td className="text-center py-3 px-3 font-bold text-amber-700">{Number(st.booking_deposit).toFixed(2)} ج</td>
                    <td className="text-center py-3 px-3 text-gray-500 text-xs">{new Date(st.join_date).toLocaleString('ar-EG')}</td>
                    <td className="text-center py-3 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => onViewStudent?.(st.id)}
                          className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="عرض ملف الطالب">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => handleDelete(st)} disabled={deleting === st.id}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40" title="حذف مع استرداد">
                          {deleting === st.id ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmData && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setConfirmData(null); confirmResolve.current?.(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
              <Trash2 size={24} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">تأكيد الحذف</h3>
            <p className="text-sm text-gray-500 mb-1">هل أنت متأكد من حذف</p>
            <p className="text-base font-bold text-gray-800 mb-3">{confirmData.name}؟</p>
            <div className="bg-amber-50 rounded-xl p-3 mb-4">
              <span className="text-xs text-gray-500">المبلغ المسترد</span>
              <p className="text-xl font-bold text-amber-700">{confirmData.amount.toFixed(2)} ج</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setConfirmData(null); confirmResolve.current?.(true); }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">تأكيد الحذف</button>
              <button onClick={() => { setConfirmData(null); confirmResolve.current?.(false); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-semibold transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
