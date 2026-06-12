import { useState, useEffect } from 'react';
import { PiggyBank, TrendingUp, TrendingDown, DollarSign, Users, BookOpen, Receipt, Calendar, Award, AlertTriangle, BarChart3, PieChart } from 'lucide-react';
import { supabase } from '../supabaseClient';

const MONTHS = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export default function FinanceReport() {
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [stuRes, payRes, expRes, delRes] = await Promise.all([
      supabase.from('students').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('book_deliveries').select('*'),
    ]);
    setStudents(stuRes.data || []);
    setPayments(payRes.data || []);
    setExpenses(expRes.data || []);
    setDeliveries(delRes.data || []);
    setLoading(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center text-gray-400 py-16">جاري التحميل...</div>;

  const activeStudents = students.filter((s: any) => s.status === 'active');
  const totalIncome = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const totalExpenses = expenses.filter((e: any) => !e.is_archived).reduce((s: number, e: any) => s + Number(e.amount), 0);
  const monthlyExpected = activeStudents.reduce((s: number, st: any) => s + Number(st.monthly_fee || 0), 0);
  const bookRevenue = deliveries.reduce((s: number, d: any) => s + Number(d.total_price || 0), 0);
  const bookPaid = deliveries.reduce((s: number, d: any) => s + Number(d.paid_amount || 0), 0);
  const bookRemaining = bookRevenue - bookPaid;
  const netTotal = totalIncome - totalExpenses;
  const netWithBooks = totalIncome + bookPaid - totalExpenses;

  // Monthly income/expense for current year
  const now = new Date();
  const year = now.getFullYear();
  const monthlyChart: { month: number; income: number; expense: number }[] = [];
  for (let m = 0; m < 12; m++) {
    const start = `${year}-${String(m + 1).padStart(2, '0')}-01`;
    const end = new Date(year, m + 1, 0).toISOString().slice(0, 10);
    const income = payments.filter((p: any) => {
      const d = p.date?.slice(0, 10); return d && d >= start && d <= end;
    }).reduce((s: number, p: any) => s + Number(p.amount), 0);
    const expense = expenses.filter((e: any) => {
      if (e.is_archived) return false;
      const d = e.date?.slice(0, 10); return d && d >= start && d <= end;
    }).reduce((s: number, e: any) => s + Number(e.amount), 0);
    monthlyChart.push({ month: m, income, expense });
  }
  const maxMonthly = Math.max(...monthlyChart.map(d => d.income + d.expense), 1);

  // Expense categories
  const catTotals: Record<string, number> = {};
  for (const e of expenses.filter((e: any) => !e.is_archived)) {
    catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
  }
  const catEntries = Object.entries(catTotals).sort(([, a], [, b]) => b - a);
  const grandCatTotal = catEntries.reduce((s, [, v]) => s + v, 0);

  // Collection rate per month
  const collectionRates = monthlyChart.map((m, i) => {
    const start = `${year}-${String(i + 1).padStart(2, '0')}-01`;
    const end = new Date(year, i + 1, 0).toISOString().slice(0, 10);
    const activeThatMonth = activeStudents.length;
    const expected = activeThatMonth * (monthlyExpected / Math.max(activeThatMonth, 1));
    const actual = m.income;
    return { month: i, rate: expected > 0 ? Math.min(100, (actual / expected) * 100) : 0, expected, actual };
  });

  // Monthly net trend
  const currentMonth = now.getMonth();
  const currentMonthIncome = monthlyChart[currentMonth].income;
  const currentMonthExpense = monthlyChart[currentMonth].expense;

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
          <PiggyBank size={22} className="text-indigo-500" />
          إجماليات ونسب مالية
        </h2>
        <span className="text-sm text-gray-400">{year}</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-2"><Users size={16} /><span className="text-xs text-white/80">الطلاب</span></div>
          <p className="text-xl font-bold">{students.length}</p>
          <p className="text-xs text-white/60 mt-1">{activeStudents.length} نشط</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-2"><DollarSign size={16} /><span className="text-xs text-white/80">إجمالي الإيرادات</span></div>
          <p className="text-xl font-bold">{totalIncome.toFixed(2)} ج</p>
          <p className="text-xs text-white/60 mt-1">المتوقع شهرياً: {monthlyExpected.toFixed(2)} ج</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-2"><Receipt size={16} /><span className="text-xs text-white/80">إجمالي المصروفات</span></div>
          <p className="text-xl font-bold">{totalExpenses.toFixed(2)} ج</p>
        </div>
        <div className={`bg-gradient-to-br rounded-2xl p-5 shadow-lg text-white ${netTotal >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-red-600'}`}>
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} /><span className="text-xs text-white/80">صافي الإيرادات</span></div>
          <p className="text-xl font-bold">{netTotal.toFixed(2)} ج</p>
          <p className="text-xs text-white/60 mt-1">مع الكتب: {netWithBooks.toFixed(2)} ج</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-2"><BookOpen size={16} /><span className="text-xs text-white/80">إيرادات الكتب</span></div>
          <p className="text-xl font-bold">{bookRevenue.toFixed(2)} ج</p>
          <p className="text-xs text-white/60 mt-1">المدفوع: {bookPaid.toFixed(2)} ج</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Monthly income/expense chart */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-blue-500" /> الإيرادات والمصروفات الشهرية</h3>
          <div className="flex items-end gap-1.5 h-44" style={{ direction: 'ltr' }}>
            {monthlyChart.map(d => {
              const incomeH = (d.income / maxMonthly) * 160;
              const expenseH = (d.expense / maxMonthly) * 160;
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`${MONTHS[d.month]}: +${d.income.toFixed(0)} / -${d.expense.toFixed(0)}`}>
                  <div className="w-full bg-green-400 rounded-t-sm transition-all duration-700" style={{ height: `${animated ? Math.max(incomeH, 1) : 0}px`, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }} />
                  <div className="w-full bg-red-400 rounded-t-sm transition-all duration-700" style={{ height: `${animated ? Math.max(expenseH, 1) : 0}px`, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)', transitionDelay: '150ms' }} />
                  <span className={`text-[7px] text-gray-400 mt-1 transition-opacity duration-500 ${animated ? 'opacity-100' : 'opacity-0'}`}>{MONTHS[d.month].slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400" /> إيرادات</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> مصروفات</span>
          </div>
        </div>

        {/* Collection rate per month */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><Award size={16} className="text-amber-500" /> نسبة التحصيل الشهرية</h3>
          <div className="flex items-end gap-1.5 h-44" style={{ direction: 'ltr' }}>
            {collectionRates.map((cr, i) => {
              const h = (cr.rate / 100) * 160;
              return (
                <div key={cr.month} className="flex-1 flex flex-col items-center justify-end" title={`${MONTHS[cr.month]}: ${cr.rate.toFixed(1)}% (${cr.actual.toFixed(0)}/${cr.expected.toFixed(0)})`}>
                  <div
                    className={`w-full rounded-t-sm transition-all duration-700 ${cr.rate >= 80 ? 'bg-green-400' : cr.rate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ height: `${animated ? Math.max(h, 1) : 0}px`, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)', transitionDelay: `${i * 50}ms` }}
                  />
                  <span className={`text-[7px] text-gray-400 mt-1 transition-opacity duration-500 ${animated ? 'opacity-100' : 'opacity-0'}`}>{MONTHS[cr.month].slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400" /> ≥80%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400" /> 50-80%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> {'<'}50%</span>
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Expense categories */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><PieChart size={16} className="text-red-500" /> توزيع المصروفات</h3>
          {catEntries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">لا توجد مصروفات</p>
          ) : (
            <div className="space-y-3">
              {/* Pie chart */}
              <div className="flex items-center justify-center gap-1 h-40">
                {catEntries.map(([cat, val], i) => {
                  const pct = val / grandCatTotal;
                  return (
                    <div key={cat} className="relative group transition-all duration-700" style={{ transform: animated ? 'scale(1)' : 'scale(0)', transitionDelay: `${i * 100}ms`, transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)' }} title={`${cat}: ${val.toFixed(2)} ج (${(pct * 100).toFixed(1)}%)`}>
                      <div className="rounded-full border-4 border-white shadow-md transition-transform hover:scale-110" style={{ width: `${40 + pct * 80}px`, height: `${40 + pct * 80}px`, backgroundColor: COLORS[i % COLORS.length], opacity: 0.85 }} />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-md">{cat.slice(0, 4)}</span>
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {catEntries.map(([cat, val], i) => {
                  const pct = grandCatTotal > 0 ? (val / grandCatTotal * 100) : 0;
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-600 flex-1 truncate">{cat}</span>
                      <span className="font-semibold text-gray-800">{val.toFixed(2)} ج</span>
                      <span className="text-gray-400">({pct.toFixed(1)}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Current month details */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><Calendar size={16} className="text-indigo-500" /> تفاصيل {MONTHS[currentMonth]}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3">
              <span className="text-sm text-gray-700">إيرادات الشهر</span>
              <span className="font-bold text-green-600">{currentMonthIncome.toFixed(2)} ج</span>
            </div>
            <div className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
              <span className="text-sm text-gray-700">مصروفات الشهر</span>
              <span className="font-bold text-red-600">{currentMonthExpense.toFixed(2)} ج</span>
            </div>
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${currentMonthIncome - currentMonthExpense >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
              <span className="text-sm text-gray-700">صافي الشهر</span>
              <span className={`font-bold ${currentMonthIncome - currentMonthExpense >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {(currentMonthIncome - currentMonthExpense).toFixed(2)} ج
              </span>
            </div>
            <div className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-3">
              <span className="text-sm text-gray-700">نسبة التحصيل</span>
              <span className="font-bold text-amber-600">{collectionRates[currentMonth]?.rate.toFixed(1)}%</span>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 flex items-center gap-1"><BookOpen size={14} className="text-amber-500" /> إيرادات الكتب</span>
                <span className="font-bold text-amber-600">{bookRevenue.toFixed(2)} ج</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-700">المدفوع</span>
                <span className="font-semibold text-green-600">{bookPaid.toFixed(2)} ج</span>
              </div>
              {bookRemaining > 0 && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-700 flex items-center gap-1"><AlertTriangle size={14} className="text-red-400" /> المتبقي</span>
                  <span className="font-semibold text-red-600">{bookRemaining.toFixed(2)} ج</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collection rate bar - overall */}
      {monthlyExpected > 0 && (
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><BarChart3 size={16} className="text-green-500" /> ملخص الأداء المالي</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">متوسط التحصيل السنوي</p>
              <p className="text-2xl font-bold text-gray-800">
                {(collectionRates.reduce((s, c) => s + c.rate, 0) / 12).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">أعلى شهر إيرادات</p>
              <p className="text-2xl font-bold text-green-600">
                {Math.max(...monthlyChart.map(d => d.income)).toFixed(2)} ج
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">أقل شهر إيرادات</p>
              <p className="text-2xl font-bold text-red-600">
                {Math.min(...monthlyChart.filter(d => d.income > 0).map(d => d.income).length > 0 ? monthlyChart.filter(d => d.income > 0).map(d => d.income) : [0]).toFixed(2)} ج
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
