import { useState, useEffect } from 'react';
import { BarChart, Calendar, Users, UserX, TrendingUp, Award, Sun, Moon } from 'lucide-react';
import { supabase } from '../supabaseClient';

function Donut({ data, colors, size = 130 }: { data: { label: string; value: number }[]; colors: string[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <div className="text-xs text-gray-300 text-center py-8">لا توجد بيانات</div>;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const sw = 16;
  const filtered = data.filter(d => d.value > 0);
  let startAngle = -90;
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 100 100">
        {filtered.map((d, i) => {
          const pct = d.value / total;
          const sweep = pct * 360;
          const dashLen = pct * circ;
          const angle = startAngle;
          startAngle += sweep;
          return <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={colors[i % colors.length]} strokeWidth={sw}
            strokeDasharray={`${dashLen} ${circ}`} strokeDashoffset={dashLen}
            transform={`rotate(${angle} 50 50)`}
            className="donut-segment" style={{ '--dash': `${dashLen}` } as React.CSSProperties}
            data-delay={`${i * 0.12}s`} />;
        })}
        {/* The drawCircle animation starts each segment hidden (offset=dashLen) and offsets to 0 */}
        <circle cx="50" cy="50" r={r - sw / 2 + 1} fill="white" />
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs animate-legend" style={{ animation: 'fadeUp 0.4s ease-out forwards', animationDelay: `${0.3 + filtered.length * 0.12}s` }}>
        {filtered.slice(0, 6).map((d, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: colors[i % colors.length] }} />
            {d.label} ({d.value})
          </span>
        ))}
        {filtered.length > 6 && <span className="text-gray-400">+{filtered.length - 6}</span>}
      </div>
    </div>
  );
}

const PIE_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308', '#ef4444', '#6366f1', '#84cc16'];

export default function AbsenceReports() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('absence_records').select('*').order('date', { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center text-gray-400 py-20">جاري التحميل...</div>;

  const total = records.length;
  const uniqueDates = new Set(records.map(r => r.date)).size;

  // By group
  const byGroup: Record<string, number> = {};
  for (const r of records) {
    const g = r.group_name || 'بدون مجموعة';
    byGroup[g] = (byGroup[g] || 0) + 1;
  }
  const sortedGroups = Object.entries(byGroup).sort((a, b) => b[1] - a[1]);
  const bestGroups = [...sortedGroups].sort((a, b) => a[1] - b[1]);

  // By day of week
  const dowNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const byDow: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const r of records) {
    if (r.date) {
      const d = new Date(r.date);
      // getDay(): 0=Sun, 1=Mon, ... 6=Sat — matches Arabic week
      byDow[d.getDay()]++;
    }
  }
  const dowData = byDow.map((c, i) => ({ label: dowNames[i], value: c })).filter(d => d.value > 0);

  // By student (rate %)
  const byStudent: Record<string, { count: number; grade: string }> = {};
  for (const r of records) {
    const key = r.student_name || 'غير معروف';
    if (!byStudent[key]) byStudent[key] = { count: 0, grade: r.grade || '' };
    byStudent[key].count++;
  }
  const studentsRate = Object.entries(byStudent)
    .map(([name, info]) => ({ name, grade: info.grade, count: info.count, rate: uniqueDates > 0 ? Math.round((info.count / uniqueDates) * 100) : 0 }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);

  const topGroup = sortedGroups[0]?.[1] || 1;
  const topStudentRate = studentsRate[0]?.rate || 0;

  // By month
  const byMonth: Record<string, number> = {};
  for (const r of records) {
    if (r.date) {
      const m = r.date.slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + 1;
    }
  }
  const monthData = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));
  const maxMonth = Math.max(...monthData.map(([, v]) => v), 1);

  return (
    <div className="fade-in space-y-6">
      <style>{`
        @keyframes cardIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes barGrow { from { width: 0; } to { width: var(--target-w); } }
        @keyframes barGrowV { from { height: 0; } to { height: var(--target-h); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes drawCircle { from { stroke-dashoffset: var(--dash); } to { stroke-dashoffset: 0; } }
        @keyframes drawLine { from { stroke-dashoffset: var(--line-len); } to { stroke-dashoffset: 0; } }
        .anim-card { animation: cardIn 0.35s ease-out forwards; }
        .anim-donut { animation: fadeUp 0.5s ease-out forwards; }
        .anim-bar { width: 0; animation: barGrow 0.5s ease-out forwards; }
        .anim-bar-v { height: 0; animation: barGrowV 0.5s ease-out forwards; }
        .line-path { animation: drawLine 1s ease-out forwards; }
        .donut-segment { animation: drawCircle 0.6s ease-out forwards; }
        .bar-fill { animation: barGrow 0.5s ease-out forwards; }
      `}</style>

      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <BarChart size={20} className="text-orange-500" /> إجماليات ونسب
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { icon: <UserX size={20} className="text-red-600" />, bg: 'bg-red-100', value: total, label: 'إجمالي الغيابات' },
          { icon: <Users size={20} className="text-blue-600" />, bg: 'bg-blue-100', value: Object.keys(byGroup).length, label: 'مجموعات متأثرة' },
          { icon: <Calendar size={20} className="text-purple-600" />, bg: 'bg-purple-100', value: uniqueDates, label: 'أيام تسجيل' },
          { icon: <TrendingUp size={20} className="text-amber-600" />, bg: 'bg-amber-100', value: `${topStudentRate}%`, label: 'أعلى نسبة غياب' },
          { icon: <Sun size={20} className="text-green-600" />, bg: 'bg-green-100', value: byDow[0] + byDow[6] || 0, label: 'غياب نهاية الأسبوع' },
        ].map((card, i) => (
          <div key={card.label} className="anim-card bg-white rounded-2xl shadow-sm border border-gray-100 p-4" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>{card.icon}</div>
              <div><div className="text-2xl font-bold text-gray-800">{card.value}</div><div className="text-xs text-gray-500">{card.label}</div></div>
            </div>
          </div>
        ))}
      </div>

      {/* Donut row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="anim-donut bg-white rounded-2xl shadow-sm border border-gray-100 p-5" style={{ animationDelay: '0.15s' }}>
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm"><Users size={16} className="text-orange-500" /> نسبة الغياب حسب المجموعة</h3>
          <Donut data={sortedGroups.map(([label, value]) => ({ label, value }))} colors={PIE_COLORS} />
        </div>
        <div className="anim-donut bg-white rounded-2xl shadow-sm border border-gray-100 p-5" style={{ animationDelay: '0.25s' }}>
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm"><Calendar size={16} className="text-blue-500" /> توزيع الغياب على أيام الأسبوع</h3>
          <Donut data={dowData} colors={['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308']} />
        </div>
      </div>

      {/* Bar chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="anim-donut bg-white rounded-2xl shadow-sm border border-gray-100 p-5" style={{ animationDelay: '0.4s' }}>
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm"><Award size={16} className="text-red-500" /> أعلى نسبة غياب بين الطلاب</h3>
          <div className="space-y-2.5">
            {studentsRate.map((s, i) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700 truncate flex-1">{s.name}</span>
                  <span className="text-gray-500 text-xs shrink-0 ml-2">{s.grade}</span>
                  <span className="text-xs font-semibold text-red-600 w-10 text-left">{s.rate}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="anim-bar h-full rounded-full bg-red-500" style={{ '--target-w': `${(s.rate / Math.max(topStudentRate, 1)) * 100}%`, animationDelay: `${0.4 + i * 0.06}s` } as React.CSSProperties} />
                </div>
              </div>
            ))}
            {!studentsRate.length && <p className="text-gray-300 text-xs text-center">لا توجد بيانات</p>}
          </div>
        </div>

        <div className="anim-donut bg-white rounded-2xl shadow-sm border border-gray-100 p-5" style={{ animationDelay: '0.65s' }}>
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm"><TrendingUp size={16} className="text-green-500" /> المجموعات الأكثر انتظامًا</h3>
          <div className="space-y-2.5">
            {bestGroups.map(([group, count], i) => (
              <div key={group}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">{group}</span>
                  <span className="text-gray-500 text-xs">{count} غياب{count !== 1 ? 'ات' : ''}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="anim-bar h-full rounded-full bg-green-500" style={{ '--target-w': `${(count / Math.max(...bestGroups.map(g => g[1]))) * 100}%`, animationDelay: `${0.5 + i * 0.06}s` } as React.CSSProperties} />
                </div>
              </div>
            ))}
            {!bestGroups.length && <p className="text-gray-300 text-xs text-center">لا توجد بيانات</p>}
          </div>
        </div>
      </div>

      {/* Monthly comparison — line chart */}
      {monthData.length > 1 && (() => {
        const W = 600, H = 200, padL = 35, padR = 15, padT = 20, padB = 35;
        const plotW = W - padL - padR;
        const plotH = H - padT - padB;
        const yMax = Math.ceil(maxMonth * 1.15);
        const points = monthData.map(([m, v], i) => ({
          x: padL + (i / (monthData.length - 1)) * plotW,
          y: padT + plotH - (v / yMax) * plotH,
          v,
          label: new Date(m + '-01').toLocaleDateString('ar-EG', { month: 'short' }),
        }));
        const polylinePts = points.map(p => `${p.x},${p.y}`).join(' ');
        const lineLen = points.reduce((acc, p, i) => {
          if (i === 0) return 0;
          const prev = points[i - 1];
          return acc + Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2);
        }, 0);
        return (
          <div className="anim-donut bg-white rounded-2xl shadow-sm border border-gray-100 p-5" style={{ animationDelay: '0.55s' }}>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm"><TrendingUp size={16} className="text-purple-500" /> مقارنة الغياب بين الشهور</h3>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ direction: 'ltr' }}>
              {[0, 0.25, 0.5, 0.75, 1].map(r => {
                const y = padT + plotH - r * plotH;
                const val = Math.round(r * yMax);
                return (
                  <g key={r}>
                    <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f0f0f0" strokeWidth={1} />
                    <text x={padL - 4} y={y + 3} textAnchor="end" fill="#aaa" className="text-[9px]">{val}</text>
                  </g>
                );
              })}
              <polyline fill="none" stroke="#8b5cf6" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"
                points={polylinePts} className="line-path" style={{ '--line-len': `${lineLen}` } as React.CSSProperties} />
              {points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={4} fill="#8b5cf6" stroke="white" strokeWidth={2}
                    style={{ animation: 'fadeUp 0.3s ease-out forwards', animationDelay: `${1 + i * 0.06}s`, opacity: 0 }} />
                  <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#6b7280" fontWeight="600" className="text-[10px]"
                    style={{ animation: 'fadeUp 0.3s ease-out forwards', animationDelay: `${1 + i * 0.06}s`, opacity: 0 }}>{p.v}</text>
                  <text x={p.x} y={H - 4} textAnchor="middle" fill="#aaa" className="text-[9px]"
                    style={{ animation: 'fadeUp 0.3s ease-out forwards', animationDelay: `${1 + (monthData.length + 1) * 0.06}s`, opacity: 0 }}>{p.label}</text>
                </g>
              ))}
            </svg>
          </div>
        );
      })()}
    </div>
  );
}
