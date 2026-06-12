import { useState, useEffect, useMemo } from 'react';
import { ArrowRight, BookOpen, DollarSign, Package, TrendingUp, Truck, ShoppingCart, CreditCard, BarChart3, PieChart, Calendar } from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const COLORS = ['#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#10b981', '#f97316'];

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 text-sm">
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
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
        <p key={i} className="text-gray-600">{p.name}: <span className="font-semibold">{p.value}</span></p>
      ))}
    </div>
  );
};

export default function BookStats({ onBack }: { onBack?: () => void }) {
  const [book, setBook] = useState<any>(null);
  const [supplier, setSupplier] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    (async () => {
      const id = localStorage.getItem('book-stats-id');
      if (!id) return;
      const [bRes, tRes, dRes] = await Promise.all([
        supabase.from('books').select('*').eq('id', id).maybeSingle(),
        supabase.from('supplier_transactions').select('*'),
        supabase.from('book_deliveries').select('*'),
      ]);
      if (bRes.data) {
        setBook(bRes.data);
        const sRes = await supabase.from('suppliers').select('*').eq('id', bRes.data.supplier_id).maybeSingle();
        if (sRes.data) setSupplier(sRes.data);
        setTxns((tRes.data || []).filter((t: any) => t.book_id === id));
        setDeliveries((dRes.data || []).filter((d: any) => d.book_title === bRes.data.title));
      }
    })();
  }, []);

  const { payDist, dailyData } = useMemo(() => {
    const dist = { paid: 0, remaining: 0, free: 0 };
    const daily: Record<string, { deliveries: number; income: number }> = {};
    for (const d of deliveries) {
      const income = Number(d.total_price) || 0;
      const rem = Math.max(0, income - (Number(d.paid_amount) || 0));
      if (d.delivery_type === 'مجانى') dist.free++;
      else if (rem <= 0) dist.paid++;
      else dist.remaining++;
      const date = d.delivery_date?.slice(0, 10);
      if (date) {
        if (!daily[date]) daily[date] = { deliveries: 0, income: 0 };
        daily[date].deliveries++;
        daily[date].income += income;
      }
    }
    const dailyData = Object.entries(daily)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const payDist = [
      { name: 'مدفوع', value: dist.paid },
      { name: 'متبقي', value: dist.remaining },
      { name: 'مجانى', value: dist.free },
    ].filter(p => p.value > 0);
    return { payDist, dailyData };
  }, [deliveries]);

  if (!book) return <div className="text-center py-20 text-gray-400">جاري التحميل...</div>;

  const totalRevenue = deliveries.reduce((s, d) => s + Number(d.total_price), 0);
  const totalPaid = deliveries.reduce((s, d) => s + Number(d.paid_amount || 0), 0);
  const saleCount = deliveries.filter(d => d.delivery_type === 'بيع').length;
  const bookingCount = deliveries.filter(d => d.delivery_type === 'حجز').length;
  const freeCount = deliveries.filter(d => d.delivery_type === 'مجانى').length;

  return (
    <div className="fade-in space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl"><ArrowRight size={20} className="text-gray-500" /></button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><BookOpen size={22} className="text-teal-500" />{book.title}</h1>
          <p className="text-xs text-gray-400">{book.subject}{book.grade ? ` - ${book.grade}` : ''}{book.is_general ? ' (عام)' : ''}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-400 mb-2"><Package size={16} /><span className="text-xs">المخزون</span></div>
          <div className="text-2xl font-bold text-gray-800">{book.stock || 0}</div>
           <div className="text-xs text-gray-400 mt-1">تم توزيع {deliveries.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-400 mb-2"><DollarSign size={16} /><span className="text-xs">سعر الشراء</span></div>
          <div className="text-2xl font-bold text-orange-600">{Number(book.purchase_price || 0).toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-400 mb-2"><TrendingUp size={16} /><span className="text-xs">سعر البيع</span></div>
          <div className="text-2xl font-bold text-teal-600">{Number(book.selling_price || 0).toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-400 mb-2"><BarChart3 size={16} /><span className="text-xs">الربح المتوقع</span></div>
          <div className="text-2xl font-bold text-green-600">{(Number(book.selling_price || 0) - Number(book.purchase_price || 0)).toFixed(2)}</div>
          <div className="text-xs text-gray-400 mt-1">للنسخة الواحدة</div>
        </div>
      </div>

      {/* Charts */}
      {deliveries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChart size={18} className="text-purple-500" />
              <h3 className="font-bold text-gray-800 text-sm">توزيع التوزيعات</h3>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <RePieChart>
                <Pie data={payDist} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                  {payDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend formatter={(value: string) => <span className="text-sm text-gray-600">{value}</span>} />
              </RePieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-orange-500" />
              <h3 className="font-bold text-gray-800 text-sm">نوع التسليم</h3>
            </div>
            <div className="space-y-4 pt-2">
              {[
                { label: 'بيع عادي', value: deliveries.filter(d => d.delivery_type === 'بيع').length, color: 'bg-blue-500', countColor: 'text-blue-600' },
                { label: 'بيع بالحجز', value: deliveries.filter(d => d.delivery_type === 'حجز').length, color: 'bg-amber-500', countColor: 'text-amber-600' },
                { label: 'تسليم مجاني', value: deliveries.filter(d => d.delivery_type === 'مجانى').length, color: 'bg-green-500', countColor: 'text-green-600' },
              ].map((item, i) => {
                const pct = deliveries.length > 0 ? Math.round((item.value / deliveries.length) * 100) : 0;
                return (
                  <div key={item.label} className="chart-anim-fade" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.label}</span>
                      <span className={`font-bold ${item.countColor}`}>{item.value}</span>
                    </div>
                    <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color} hbar-grow`} style={{ ['--target-w' as string]: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {dailyData.length > 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={18} className="text-blue-500" />
                <h3 className="font-bold text-gray-800 text-sm">الاتجاه اليومي</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#999' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#999' }} />
                  <Tooltip content={<DailyTooltip />} />
                  <Area type="monotone" dataKey="income" name="الإيرادات" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.15} strokeWidth={2} dot={false} />
                  <Legend formatter={(value: string) => <span className="text-sm text-gray-600">{value}</span>} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Financial details */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><DollarSign size={16} /> التفاصيل المالية</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-teal-50 rounded-xl">
            <div className="text-lg font-bold text-teal-700">{totalRevenue.toFixed(2)} ج</div>
            <div className="text-xs text-teal-500 mt-1">إجمالي المبيعات</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <div className="text-lg font-bold text-green-700">{totalPaid.toFixed(2)} ج</div>
            <div className="text-xs text-green-500 mt-1">المدفوع من الطلاب</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <div className="text-lg font-bold text-red-700">{(totalRevenue - totalPaid).toFixed(2)} ج</div>
            <div className="text-xs text-red-500 mt-1">المتبقي على الطلاب</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <div className="text-lg font-bold text-blue-700">{saleCount}</div>
            <div className="text-xs text-blue-500 mt-1">بيع عادي</div>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-xl">
            <div className="text-lg font-bold text-amber-700">{bookingCount}</div>
            <div className="text-xs text-amber-500 mt-1">بيع بالحجز</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <div className="text-lg font-bold text-green-700">{freeCount}</div>
            <div className="text-xs text-green-500 mt-1">تسليم مجاني</div>
          </div>
        </div>
      </div>

      {/* Supplier info */}
      {supplier && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><Truck size={16} /> المورد</h3>
          <div className="text-sm space-y-1">
            <p><span className="text-gray-500">الاسم:</span> <span className="font-semibold">{supplier.name}</span></p>
            {supplier.phone && <p><span className="text-gray-500">الهاتف:</span> {supplier.phone}</p>}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><ShoppingCart size={16} /> المعاملات</h3>
        {txns.length === 0 ? (
          <p className="text-center text-gray-300 py-6 text-sm">لا توجد معاملات</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500 text-xs border-b">
              <th className="text-right py-2 px-2">التاريخ</th><th className="text-right py-2 px-2">النوع</th><th className="text-right py-2 px-2">الوصف</th><th className="text-left py-2 px-2">المبلغ</th>
            </tr></thead>
            <tbody>
              {txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                <tr key={t.id} className="border-b border-gray-50">
                  <td className="py-2 px-2 text-gray-500 text-xs">{new Date(t.date).toLocaleDateString('ar-EG')}</td>
                  <td className="py-2 px-2">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${t.type === 'payment' ? 'text-green-600 bg-green-50' : t.type === 'purchase' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 bg-gray-50'}`}>
                      {t.type === 'payment' ? 'دفع' : t.type === 'purchase' ? 'مشتريات' : t.type}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-gray-600">{t.description || '—'}</td>
                  <td className={`py-2 px-2 text-left font-bold ${t.type === 'payment' ? 'text-green-600' : 'text-red-500'}`}>{t.type === 'payment' ? '+' : '-'}{Number(t.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Book deliveries to students */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><CreditCard size={16} /> توزيعات الكتاب</h3>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
            <option value="">الكل</option>
            <option value="بيع">بيع عادي</option>
            <option value="حجز">بيع بالحجز</option>
            <option value="مجانى">تسليم مجاني</option>
          </select>
        </div>
        {(() => {
          const filtered = typeFilter ? deliveries.filter(d => d.delivery_type === typeFilter) : deliveries;
          if (filtered.length === 0) return <p className="text-center text-gray-300 py-6 text-sm">لم يتم توزيع أي نسخ</p>;
          return (
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500 text-xs border-b">
              <th className="text-right py-2 px-2">الطالب</th><th className="text-center py-2 px-2">النوع</th><th className="text-center py-2 px-2">المدفوع</th><th className="text-center py-2 px-2">المتبقي</th><th className="text-left py-2 px-2">الإجمالي</th><th className="text-center py-2 px-2">التاريخ</th>
            </tr></thead>
            <tbody>
              {filtered.sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime()).map(d => {
                const rem = Number(d.remaining || (Number(d.total_price || 0) - Number(d.paid_amount || 0)));
                return (
                <tr key={d.id} className="border-b border-gray-50">
                  <td className="py-2 px-2 font-semibold text-gray-800">{d.student_name}</td>
                  <td className="text-center py-2 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.delivery_type === 'مجانى' ? 'bg-green-100 text-green-700' : d.delivery_type === 'حجز' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{d.delivery_type || 'بيع'}</span>
                  </td>
                  <td className="text-center py-2 px-2 text-green-600 font-semibold">{Number(d.paid_amount || 0).toFixed(2)}</td>
                  <td className="text-center py-2 px-2 font-bold">{rem > 0 ? <span className="text-red-500">{rem.toFixed(2)}</span> : <span className="text-green-600">—</span>}</td>
                  <td className="text-left py-2 px-2 font-semibold text-teal-600">{Number(d.total_price).toFixed(2)}</td>
                  <td className="text-center py-2 px-2 text-gray-500 text-xs">{new Date(d.delivery_date).toLocaleDateString('ar-EG')}</td>
                </tr>
                );
              })}
            </tbody>
          </table>);
        })()}
      </div>
    </div>
  );
}
