import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, BookOpen, DollarSign, PieChart, BarChart3, Calendar } from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';

const COLORS = ['#14b8a6', '#8b5cf6', '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#f97316', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 text-sm">
      <p className="font-bold text-gray-800 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-gray-600" style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{Number(p.value).toLocaleString()} ج</span>
        </p>
      ))}
    </div>
  );
};

const DailyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 text-sm">
      <p className="font-bold text-gray-800 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-gray-600">
          {p.name === 'income' ? 'الإيرادات' : 'التسليمات'}: <span className="font-semibold">{p.name === 'income' ? `${Number(p.value).toLocaleString()} ج` : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function BookProfits() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('book_deliveries').select('*').order('delivery_date', { ascending: true });
    setDeliveries(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const { totalIncome, totalPaid, totalRemaining, saleCount, bookingCount, freeCount, filteredDeliveries, bookStats, paymentDist, dailyData } = useMemo(() => {
    let totalIncome = 0, totalPaid = 0, totalRemaining = 0;
    let saleCount = 0, bookingCount = 0, freeCount = 0;
    const bookMap: Record<string, { income: number; paid: number; count: number }> = {};
    const payDist = { paid: 0, remaining: 0, free: 0 };
    const dailyMap: Record<string, { deliveries: number; income: number }> = {};

    for (const d of deliveries) {
      const income = Number(d.total_price) || 0;
      const paid = Number(d.paid_amount) || 0;
      const rem = income - paid;
      totalIncome += income;
      totalPaid += paid;
      totalRemaining += Math.max(0, rem - (d.delivery_type === 'مجانى' ? income : 0));

      if (d.delivery_type === 'مجانى') { payDist.free += income; freeCount++; }
      else if (d.delivery_type === 'حجز') { bookingCount++; payDist.remaining += Math.max(0, rem); }
      else { saleCount++; payDist.remaining += Math.max(0, rem); }

      if (rem <= 0 && d.delivery_type !== 'مجانى') payDist.paid += income;

      if (!bookMap[d.book_title]) bookMap[d.book_title] = { income: 0, paid: 0, count: 0 };
      bookMap[d.book_title].income += income;
      bookMap[d.book_title].paid += paid;
      bookMap[d.book_title].count += 1;

      const date = d.delivery_date?.slice(0, 10);
      if (date) {
        if (!dailyMap[date]) dailyMap[date] = { deliveries: 0, income: 0 };
        dailyMap[date].deliveries += 1;
        dailyMap[date].income += income;
      }
    }

    const filteredDeliveries = typeFilter ? deliveries.filter(d => d.delivery_type === typeFilter) : deliveries;

    const filteredBookMap: Record<string, { income: number; paid: number; count: number }> = {};
    for (const d of filteredDeliveries) {
      const income = Number(d.total_price) || 0;
      const paid = Number(d.paid_amount) || 0;
      if (!filteredBookMap[d.book_title]) filteredBookMap[d.book_title] = { income: 0, paid: 0, count: 0 };
      filteredBookMap[d.book_title].income += income;
      filteredBookMap[d.book_title].paid += paid;
      filteredBookMap[d.book_title].count += 1;
    }

    const bookStats = Object.entries(filteredBookMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.income - a.income);

    const paymentDist = [
      { name: 'مدفوع', value: payDist.paid },
      { name: 'متبقي', value: payDist.remaining },
      { name: 'مجانى', value: payDist.free },
    ].filter(p => p.value > 0);

    const dailyData = Object.entries(dailyMap)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { totalIncome, totalPaid, totalRemaining, saleCount, bookingCount, freeCount, filteredDeliveries, bookStats, paymentDist, dailyData };
  }, [deliveries, typeFilter]);

  return (
    <div className="fade-in space-y-6">
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <TrendingUp size={20} className="text-teal-500" /> أرباح الكتب
      </h2>

      {loading && <div className="text-center text-gray-400 py-20">جاري التحميل...</div>}

      {!loading && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center chart-anim-fade">
              <DollarSign size={22} className="mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold text-gray-800">{totalIncome.toLocaleString()} ج</div>
              <div className="text-xs text-gray-400">إجمالي المبيعات</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center chart-anim-fade" style={{ animationDelay: '0.1s' }}>
              <TrendingUp size={22} className="mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold text-gray-800">{totalPaid.toLocaleString()} ج</div>
              <div className="text-xs text-gray-400">المدفوع من الطلاب</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center chart-anim-fade" style={{ animationDelay: '0.2s' }}>
              <DollarSign size={22} className="mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold text-gray-800">{totalRemaining.toLocaleString()} ج</div>
              <div className="text-xs text-gray-400">المتبقي على الطلاب</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center chart-anim-fade" style={{ animationDelay: '0.3s' }}>
              <BookOpen size={18} className="mx-auto mb-1 text-blue-500" />
              <div className="text-xl font-bold text-gray-800">{saleCount}</div>
              <div className="text-xs text-gray-400">بيع عادي</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center chart-anim-fade" style={{ animationDelay: '0.4s' }}>
              <BookOpen size={18} className="mx-auto mb-1 text-amber-500" />
              <div className="text-xl font-bold text-gray-800">{bookingCount}</div>
              <div className="text-xs text-gray-400">بيع بالحجز</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center chart-anim-fade" style={{ animationDelay: '0.5s' }}>
              <BookOpen size={18} className="mx-auto mb-1 text-green-500" />
              <div className="text-xl font-bold text-gray-800">{freeCount}</div>
              <div className="text-xs text-gray-400">تسليم مجاني</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-teal-500" />
                <h3 className="font-bold text-gray-800 text-sm">الإيرادات حسب الكتاب</h3>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(200, bookStats.length * 50)}>
                <BarChart data={bookStats} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#999' }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#666' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" name="الإيرادات" radius={[0, 4, 4, 0]} fill="#14b8a6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <PieChart size={18} className="text-purple-500" />
                <h3 className="font-bold text-gray-800 text-sm">توزيع الإيرادات</h3>
              </div>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={260}>
                  <RePieChart>
                    <Pie
                      data={paymentDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {paymentDist.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={(value: string) => <span className="text-sm text-gray-600">{value}</span>}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {dailyData.length > 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={18} className="text-blue-500" />
                <h3 className="font-bold text-gray-800 text-sm">الاتجاه اليومي</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#999' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#999' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#999' }} />
                  <Tooltip content={<DailyTooltip />} />
                  <Area yAxisId="left" type="monotone" dataKey="income" name="income" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.15} strokeWidth={2} dot={false} />
                  <Area yAxisId="right" type="monotone" dataKey="deliveries" name="deliveries" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} dot={false} />
                  <Legend
                    formatter={(value: string) => <span className="text-sm text-gray-600">{value === 'income' ? 'الإيرادات' : 'التسليمات'}</span>}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <BarChart3 size={16} className="text-orange-500" />
                تفاصيل الأرباح حسب الكتاب
              </h3>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option value="">الكل</option>
                <option value="بيع">بيع عادي</option>
                <option value="حجز">بيع بالحجز</option>
                <option value="مجانى">تسليم مجاني</option>
              </select>
            </div>
            <div className="space-y-3">
              {bookStats.map((b, i) => {
                const maxIncome = bookStats[0]?.income || 1;
                const pct = Math.round((b.income / maxIncome) * 100);
                return (
                  <div key={b.name} className="flex items-center gap-3 chart-anim-fade" style={{ animationDelay: `${i * 0.08}s` }}>
                    <span className="text-xs text-gray-600 w-36 truncate font-medium">{b.name}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-l from-teal-400 to-teal-500 hbar-grow" style={{ ['--target-w' as string]: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-left tabular-nums">{b.count}</span>
                    <span className="text-xs font-bold text-teal-600 w-24 text-left tabular-nums">{b.income.toLocaleString()} ج</span>
                    <span className="text-xs text-gray-400 w-20 text-left tabular-nums">{b.paid.toLocaleString()} ج</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
