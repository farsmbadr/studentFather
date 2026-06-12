import { useState, useEffect } from 'react';
import { BarChartHorizontal, TrendingUp, TrendingDown, DollarSign, Users, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';

const MONTHS = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function toLocalDateStr(d: any): string {
  if (!d) return '';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0);
  const end = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  return { start, end };
}

function prevMonth(year: number, month: number) {
  if (month === 0) return { year: year - 1, month: 11 };
  return { year, month: month - 1 };
}

export default function MonthlyStats() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [animated, setAnimated] = useState(false);

  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [prevIncome, setPrevIncome] = useState(0);
  const [prevExpense, setPrevExpense] = useState(0);
  const [monthPayments, setMonthPayments] = useState<any[]>([]);
  const [monthExpenses, setMonthExpenses] = useState<any[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [expectedIncome, setExpectedIncome] = useState(0);
  const [dailyData, setDailyData] = useState<{ day: number; income: number; expense: number }[]>([]);
  const [latePayers, setLatePayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (yr: number, mo: number) => {
    setLoading(true);
    const { start, end } = monthRange(yr, mo);
    const prev = prevMonth(yr, mo);
    const prevRange = monthRange(prev.year, prev.month);

    const [payRes, expRes, stuRes, prevPayRes, prevExpRes] = await Promise.all([
      supabase.from('payments').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('students').select('*').eq('status', 'active'),
      supabase.from('payments').select('*'),
      supabase.from('expenses').select('*'),
    ]);

    const payments = (payRes.data || []).filter((p: any) => {
      const d = toLocalDateStr(p.date);
      return d && d >= start && d <= end;
    });
    const expenses = (expRes.data || []).filter((e: any) => {
      if (e.is_archived) return false;
      const d = toLocalDateStr(e.date);
      return d && d >= start && d <= end;
    });

    const prevPayments = (prevPayRes.data || []).filter((p: any) => {
      const d = toLocalDateStr(p.date);
      return d && d >= prevRange.start && d <= prevRange.end;
    });
    const prevExpenses = (prevExpRes.data || []).filter((e: any) => {
      if (e.is_archived) return false;
      const d = toLocalDateStr(e.date);
      return d && d >= prevRange.start && d <= prevRange.end;
    });

    const income = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const expense = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);

    setMonthPayments(payments);
    setMonthExpenses(expenses);
    setIncomeTotal(income);
    setExpenseTotal(expense);
    setPrevIncome(prevPayments.reduce((s: number, p: any) => s + Number(p.amount), 0));
    setPrevExpense(prevExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0));
    setStudentCount(stuRes.data?.length || 0);
    setExpectedIncome((stuRes.data || []).reduce((s: number, st: any) => s + Number(st.monthly_fee || 0), 0));

    // Daily chart data
    const daysInMonth = new Date(yr, mo + 1, 0).getDate();
    const daily: { day: number; income: number; expense: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${start.slice(0, 8)}${String(d).padStart(2, '0')}`;
      const dayIncome = payments.filter((p: any) => toLocalDateStr(p.date) === dayStr).reduce((s: number, p: any) => s + Number(p.amount), 0);
      const dayExpense = expenses.filter((e: any) => toLocalDateStr(e.date) === dayStr).reduce((s: number, e: any) => s + Number(e.amount), 0);
      daily.push({ day: d, income: dayIncome, expense: dayExpense });
    }
    setDailyData(daily);

    // Late payers
    const payingIds = new Set(payments.map((p: any) => p.student_id));
    const late = (stuRes.data || []).filter((s: any) => Number(s.monthly_fee) > 0 && !payingIds.has(s.id));
    setLatePayers(late);
    setLoading(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)));
  };

  useEffect(() => {
    setAnimated(false);
    load(year, month);
  }, [year, month]);

  const navigate = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  };

  if (loading) return <div className="text-center text-gray-400 py-16">جاري التحميل...</div>;

  const net = incomeTotal - expenseTotal;
  const prevNet = prevIncome - prevExpense;
  const netChange = prevNet !== 0 ? ((net - prevNet) / Math.abs(prevNet) * 100) : 0;
  const incomeChange = prevIncome !== 0 ? ((incomeTotal - prevIncome) / prevIncome * 100) : 0;
  const expenseChange = prevExpense !== 0 ? ((expenseTotal - prevExpense) / prevExpense * 100) : 0;
  const collectionRate = expectedIncome > 0 ? Math.min(100, (incomeTotal / expectedIncome * 100)) : 0;

  const maxDaily = Math.max(...dailyData.map(d => d.income + d.expense), 1);

  const monthLabel = `${MONTHS[month]} ${year}`;

  return (
    <div className="fade-in space-y-6">
      {/* Header with month picker */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
          <BarChartHorizontal size={22} className="text-blue-500" />
          إحصائيات {monthLabel}
        </h2>
        <div className="flex items-center gap-3 bg-white rounded-xl shadow px-4 py-2">
          <button onClick={() => navigate(-1)} className="p-1 text-gray-400 hover:text-gray-600"><ChevronRight size={18} /></button>
          <span className="text-sm font-semibold text-gray-700 min-w-[100px] text-center">{monthLabel}</span>
          <button onClick={() => navigate(1)} className="p-1 text-gray-400 hover:text-gray-600"><ChevronLeft size={18} /></button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {idx:0,gradient:'from-green-500 to-emerald-600',Icon:TrendingUp,label:'الإيرادات',sub:`${monthPayments.length} معاملة`,value:`${incomeTotal.toFixed(2)} ج`,
           cmp: prevIncome>0 ? {val:incomeChange,up:incomeChange>=0,label:'عن الشهر الماضي'} : null},
          {idx:1,gradient:'from-red-500 to-rose-600',Icon:TrendingDown,label:'المصروفات',sub:`${monthExpenses.length} معاملة`,value:`${expenseTotal.toFixed(2)} ج`,
           cmp: prevExpense>0 ? {val:expenseChange,up:expenseChange<=0,label:'عن الشهر الماضي'} : null},
          {idx:2,gradient:net>=0?'from-blue-500 to-blue-600':'from-orange-500 to-red-600',Icon:DollarSign,label:'صافى الشهر',value:`${net.toFixed(2)} ج`,
           cmp: prevNet!==0 ? {val:netChange,up:netChange>=0,label:'عن الشهر الماضي'} : null},
          {idx:3,gradient:'from-purple-500 to-purple-700',Icon:Users,label:'الطلاب النشطين',sub:`المتوقع: ${expectedIncome.toFixed(2)} ج`,value:`${studentCount} طالب`},
        ].map(c => (
          <div key={c.idx} className={`bg-gradient-to-br ${c.gradient} rounded-2xl p-5 shadow-lg text-white transition-all duration-700`} style={{opacity:animated?1:0,transform:animated?'translateY(0)':'translateY(20px)',transitionDelay:`${c.idx*100}ms`}}>
            <div className="flex items-center gap-2 mb-2"><c.Icon size={18} /><span className="text-xs text-white/80">{c.label}</span></div>
            <p className="text-xl font-bold">{c.value}</p>
            {c.sub && <p className="text-xs text-white/60 mt-1">{c.sub}</p>}
            {c.cmp && (
              <p className={`text-xs mt-2 flex items-center gap-1 ${c.cmp.up ? 'text-green-200' : 'text-red-200'}`}>
                {c.cmp.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(c.cmp.val).toFixed(1)}% {c.cmp.label}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Collection rate bar */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">نسبة التحصيل</span>
          <span className="text-sm font-bold text-gray-800">{collectionRate.toFixed(1)}%</span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${collectionRate >= 80 ? 'bg-green-500' : collectionRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${animated ? collectionRate : 0}%`, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>المحصل: {incomeTotal.toFixed(2)} ج</span>
          <span>المتوقع: {expectedIncome.toFixed(2)} ج</span>
        </div>
      </div>

      {/* Daily chart - full width */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4">الإيرادات والمصروفات يوميًا</h3>
        <div className="flex items-end gap-[3px] h-48" style={{ direction: 'ltr' }}>
          {dailyData.map(d => {
            const incomeH = (d.income / maxDaily) * 170;
            const expenseH = (d.expense / maxDaily) * 170;
            return (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-[2px]" title={`يوم ${d.day}: +${d.income.toFixed(0)} / -${d.expense.toFixed(0)}`}>
                <div className="w-full bg-green-400 rounded-t-sm transition-all duration-700" style={{ height: `${animated ? Math.max(incomeH, 1) : 0}px`, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }} />
                <div className="w-full bg-red-400 rounded-t-sm transition-all duration-700" style={{ height: `${animated ? Math.max(expenseH, 1) : 0}px`, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)', transitionDelay: '100ms' }} />
                {dailyData.length <= 31 && <span className={`text-[8px] text-gray-400 mt-1 transition-opacity duration-500 ${animated ? 'opacity-100' : 'opacity-0'}`}>{d.day}</span>}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400" /> إيرادات</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> مصروفات</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Late payers */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> المتأخرون عن السداد</h3>
          {latePayers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">جميع الطلاب سددوا هذا الشهر ✓</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {latePayers.slice(0, 20).map(s => (
                <div key={s.id} className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-2">
                  <span className="text-sm font-medium text-gray-700">{s.name}</span>
                  <span className="text-xs font-bold text-red-600">{Number(s.monthly_fee).toFixed(2)} ج</span>
                </div>
              ))}
              {latePayers.length > 20 && <p className="text-xs text-gray-400 text-center">+ {latePayers.length - 20} آخرون</p>}
            </div>
          )}
        </div>

        {/* Expenses by category */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-3">المصروفات حسب التصنيف</h3>
          {(() => {
            const categoryTotals: Record<string, number> = {};
            for (const e of monthExpenses) categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
            return Object.keys(categoryTotals).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">لا توجد مصروفات</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(categoryTotals).sort(([,a], [,b]) => b - a).map(([cat, total]) => {
                  const pct = expenseTotal > 0 ? (total / expenseTotal * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700">{cat}</span>
                        <span className="font-bold text-red-600">{total.toFixed(2)} ج</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
