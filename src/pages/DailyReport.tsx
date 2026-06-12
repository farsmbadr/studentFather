import { useState, useEffect } from 'react';
import { CalendarRange, TrendingUp, TrendingDown, Wallet, DollarSign, Receipt, BookOpen, Search, FilterX } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function DailyReport() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const [filterDate, setFilterDate] = useState(today);
  const [filterGrade, setFilterGrade] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterReceivedBy, setFilterReceivedBy] = useState('');
  const [filterGroup, setFilterGroup] = useState('');

  const [allGrades, setAllGrades] = useState<string[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [allReceivers, setAllReceivers] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [deliveryPayments, setDeliveryPayments] = useState<any[]>([]);

  const [shown, setShown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [stuRes, tRes, payRes, grpRes, expRes, delRes, delPayRes, grdRes] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('teachers').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('groups').select('name'),
        supabase.from('expenses').select('*'),
        supabase.from('book_deliveries').select('*'),
        supabase.from('book_delivery_payments').select('*'),
        supabase.from('grades').select('name').order('name'),
      ]);
      setAllStudents(stuRes.data || []);
      setAllTeachers(tRes.data || []);
      setAllReceivers([...new Set((payRes.data || []).map((p: any) => p.received_by).filter(Boolean))]);
      setAllGrades((grdRes.data || []).map((g: any) => g.name));
      setAllGroups([...new Set((stuRes.data || []).map((s: any) => s.group_name).filter(Boolean))]);
      setPayments(payRes.data || []);
      setExpenses(expRes.data || []);
      setDeliveries(delRes.data || []);
      setDeliveryPayments(delPayRes.data || []);
      setShown(true);
      setLoading(false);
    })();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [payRes, expRes, delRes, delPayRes] = await Promise.all([
      supabase.from('payments').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('book_deliveries').select('*'),
      supabase.from('book_delivery_payments').select('*'),
    ]);
    setPayments(payRes.data || []);
    setExpenses(expRes.data || []);
    setDeliveries(delRes.data || []);
    setDeliveryPayments(delPayRes.data || []);
    setShown(true);
    setLoading(false);
  };

  const filterByDate = (d: string) => {
    if (!d) return false;
    const dt = new Date(d);
    const local = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    return local === filterDate;
  };

  const filteredPayments = payments.filter(p => {
    if (!filterByDate(p.date)) return false;
    const st = allStudents.find(s => s.id === p.student_id);
    if (filterGrade && st?.grade !== filterGrade) return false;
    if (filterGroup && st?.group_name !== filterGroup) return false;
    if (filterReceivedBy && p.received_by !== filterReceivedBy) return false;
    return true;
  });

  const filteredExpenses = expenses.filter(e => {
    if (e.is_archived) return false;
    if (!filterByDate(e.date)) return false;
    return true;
  });

  const filteredDeliveries = deliveries.filter(d => {
    if (!filterByDate(d.delivery_date)) return false;
    const st = allStudents.find(s => s.id === d.student_id);
    if (filterGrade && st?.grade !== filterGrade) return false;
    if (filterGroup && st?.group_name !== filterGroup) return false;
    return true;
  });

  const incomeTotal = filteredPayments.reduce((s, p) => s + Number(p.amount), 0);
  const expenseTotal = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const deliveriesTotal = filteredDeliveries.reduce((s, d) => s + Number(d.total_price), 0);
  const netTotal = incomeTotal - expenseTotal;

  const monthLabel = `${now.getMonth() + 1}/${now.getFullYear()}`;

  const fmtDateTime = (d: string) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleString('ar-EG');
  };

  const clearFilters = () => {
    setFilterGrade('');
    setFilterTeacher('');
    setFilterReceivedBy('');
    setFilterGroup('');
  };

  const hasAnyFilter = filterGrade || filterTeacher || filterReceivedBy || filterGroup;

  return (
    <div className="fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
          <CalendarRange size={22} className="text-blue-500" />
          التقرير اليومى
        </h2>
        <span className="text-sm text-gray-400">{new Date().toLocaleDateString('ar-EG')}</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={20} /><span className="text-sm text-white/80">الإيرادات</span></div>
          <p className="text-2xl font-bold">{incomeTotal.toFixed(2)} ج</p>
          <p className="text-xs text-white/60 mt-1">{filteredPayments.length} معاملة</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-2"><TrendingDown size={20} /><span className="text-sm text-white/80">المصروفات</span></div>
          <p className="text-2xl font-bold">{expenseTotal.toFixed(2)} ج</p>
          <p className="text-xs text-white/60 mt-1">{filteredExpenses.length} معاملة</p>
        </div>
        <div className={`bg-gradient-to-br rounded-2xl p-5 shadow-lg text-white ${netTotal >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-red-600'}`}>
          <div className="flex items-center gap-2 mb-2"><Wallet size={20} /><span className="text-sm text-white/80">صافى الدخل</span></div>
          <p className="text-2xl font-bold">{netTotal.toFixed(2)} ج</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-2"><BookOpen size={20} /><span className="text-sm text-white/80">الكتب</span></div>
          <p className="text-2xl font-bold">{deliveriesTotal.toFixed(2)} ج</p>
          <p className="text-xs text-white/60 mt-1">{filteredDeliveries.length} توزيعة</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Search size={16} className="text-gray-400" />
          <h3 className="font-bold text-gray-800 text-sm">عوامل التصفية</h3>
          {hasAnyFilter && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mr-auto">
              <FilterX size={13} /> مسح الكل
            </button>
          )}
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">اليوم</label>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">الصف</label>
            <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">الكل</option>
              {allGrades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">المعلم</label>
            <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">الكل</option>
              {allTeachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">المستلم</label>
            <select value={filterReceivedBy} onChange={e => setFilterReceivedBy(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">الكل</option>
              {allReceivers.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">المجموعة</label>
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">الكل</option>
              {allGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <button onClick={loadData} disabled={loading}
          className="mt-4 w-full py-2.5 bg-gradient-to-l from-blue-500 to-blue-600 text-white rounded-xl font-bold text-sm hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 shadow-md shadow-blue-200">
          {loading ? 'جاري التحميل...' : 'تحديث'}
        </button>
      </div>

      {/* Results */}
      {shown && (
        <div className="space-y-6">

          {/* Table 1: الإيرادات */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-l from-green-500 to-emerald-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={18} className="text-white" />
                <h3 className="text-white font-bold text-sm">متحصلات الإيرادات</h3>
              </div>
              <span className="text-white/90 text-sm font-bold">الإجمالي: {incomeTotal.toFixed(2)} ج</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center w-10">#</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">اسم الطالب</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">المجموعة</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">الصف</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">المبلغ</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">تم خلال</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">تاريخ الدفع</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">المستلم</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-gray-400 py-8 text-sm">لا توجد إيرادات</td></tr>
                  ) : filteredPayments.map((p, i) => {
                    const st = allStudents.find(s => s.id === p.student_id);
                    return (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-center text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-800">{p.student_name || '—'}</td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">{st?.group_name || '—'}</td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">{st?.grade || '—'}</td>
                        <td className="px-4 py-3 text-center font-bold text-green-600">{Number(p.amount).toFixed(2)} ج</td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">{monthLabel}</td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">{fmtDateTime(p.created_at || p.date)}</td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">{p.received_by || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: المصروفات */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-l from-red-500 to-rose-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-white" />
                <h3 className="text-white font-bold text-sm">المصروفات</h3>
              </div>
              <span className="text-white/90 text-sm font-bold">الإجمالي: {expenseTotal.toFixed(2)} ج</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center w-10">#</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">المبلغ</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">السبب</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">المستخدم</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-gray-400 py-8 text-sm">لا توجد مصروفات</td></tr>
                  ) : filteredExpenses.map((e, i) => (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-600">{Number(e.amount).toFixed(2)} ج</td>
                      <td className="px-4 py-3 text-center text-gray-700">{e.title}</td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">—</td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">{e.date?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 3: الدخل المالى */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-l from-amber-500 to-orange-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-white" />
                <h3 className="text-white font-bold text-sm">الدخل المالى</h3>
              </div>
              <span className="text-white/90 text-sm font-bold">الإجمالي: {netTotal.toFixed(2)} ج</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center w-10">#</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">الطالب</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">المستخدم</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">المبلغ</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">النوع</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">السبب</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rows: any[] = [];
                    filteredPayments.forEach(p => {
                      rows.push({ ...p, _type: 'إيراد', _label: p.notes || 'دفع مصروفات', _user: p.received_by || '—', _student: p.student_name || '—', _amt: Number(p.amount), _date: p.date });
                    });
                    filteredExpenses.forEach(e => {
                      rows.push({ ...e, _type: 'مصروف', _label: e.title, _user: '—', _student: '—', _amt: -Number(e.amount), _date: e.date });
                    });
                    rows.sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime());
                    if (rows.length === 0) return <tr><td colSpan={7} className="text-center text-gray-400 py-8 text-sm">لا توجد معاملات</td></tr>;
                    return rows.map((r, i) => (
                      <tr key={r.id || i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-center text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-800">{r._student}</td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">{r._user}</td>
                        <td className={`px-4 py-3 text-center font-bold ${r._type === 'إيراد' ? 'text-green-600' : 'text-red-600'}`}>{r._type === 'إيراد' ? '+' : ''}{r._amt.toFixed(2)} ج</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r._type === 'إيراد' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r._type}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">{r._label}</td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">{r._date?.slice(0, 10)}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 4: الكتب والملزمات والمطبوعات */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-l from-purple-500 to-purple-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-white" />
                <h3 className="text-white font-bold text-sm">الكتب والملزمات والمطبوعات</h3>
              </div>
              <span className="text-white/90 text-sm font-bold">الإجمالي: {deliveriesTotal.toFixed(2)} ج</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center w-10">#</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">اسم الطالب</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">المجموعة</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">الصف</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">المبلغ</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">تاريخ الدفع</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold text-center">المستخدم</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeliveries.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-gray-400 py-8 text-sm">لا توجد توزيعات</td></tr>
                  ) : filteredDeliveries.map((d, i) => {
                    const st = allStudents.find(s => s.id === d.student_id);
                    return (
                      <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-center text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-800">{d.student_name || '—'}</td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">{st?.group_name || '—'}</td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">{st?.grade || '—'}</td>
                        <td className="px-4 py-3 text-center font-bold text-purple-600">{Number(d.total_price).toFixed(2)} ج</td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">{d.delivery_date?.slice(0, 10)}</td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">—</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
