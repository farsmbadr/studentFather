import { useState, useEffect } from 'react';
import { Users, UserCheck, User, DollarSign, Wallet, TrendingDown, TrendingUp, GraduationCap, BookOpen, PieChart, BarChart3 } from 'lucide-react';
import { supabase } from '../supabaseClient';

function BarChart({ data, color, unit, height = 120, gap = 8 }: { data: { label: string; value: number }[]; color: string; unit?: string; height?: number; gap?: number }) {
  const max = Math.max(...data.map(d => d.value));
  const w = Math.max(500, data.length * 60);
  const h = height;
  const pad = 20;
  const bottomPad = 40;
  const slotW = (w - 2 * pad) / data.length;
  const barW = Math.min(Math.max(20, slotW - gap * 3), slotW - gap * 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      {data.map((d, i) => {
        const barH = max > 0 ? ((d.value / max) * (h - pad - bottomPad)) : 2;
        const x = pad + i * slotW + (slotW - barW) / 2;
        const y = h - bottomPad - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx="2" fill={color} opacity="0.85" className="chart-anim-bar" style={{ animationDelay: `${i * 0.08}s` }} />
            <text x={x + barW / 2} y={h - 6} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.7)" transform={`rotate(-30, ${x + barW / 2}, ${h - 6})`}>{d.label}</text>
            <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.9)" fontWeight="bold" className="chart-anim-fade" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>{d.value}{unit || ''}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ data, size = 120 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <div className="text-center text-white/50 text-xs py-4">لا توجد بيانات</div>;
  const r = size * 0.35;
  const sw = size * 0.12;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  const filtered = data.filter(d => d.value > 0);
  let startAngle = -90;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto" style={{ width: size, height: size }}>
      {filtered.map((d, i) => {
        const pct = d.value / total;
        const sweep = pct * 360;
        const dashLen = pct * circ;
        const angle = startAngle;
        startAngle += sweep;
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={sw}
          strokeDasharray={`${dashLen} ${circ}`} strokeDashoffset={dashLen}
          transform={`rotate(${angle} ${cx} ${cy})`}
          className="donut-segment" style={{ '--dash': `${dashLen}`, animationDelay: `${i * 0.12}s` } as React.CSSProperties} />;
      })}
      <circle cx={cx} cy={cy} r={r - sw / 2 + 0.5} fill="#1e293b" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill="white">{total}</text>
    </svg>
  );
}

const COLORS = ['#f472b6', '#34d399', '#60a5fa', '#fbbf24', '#a78bfa', '#fb923c', '#f87171', '#2dd4bf'];

export default function StudentReport() {
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);
  const [totalFees, setTotalFees] = useState(0);
  const [monthlyCollected, setMonthlyCollected] = useState(0);
  const [remainingCollect, setRemainingCollect] = useState(0);
  const [gradeDist, setGradeDist] = useState<{ label: string; value: number }[]>([]);
  const [groupDist, setGroupDist] = useState<{ label: string; value: number }[]>([]);
  const [genderDist, setGenderDist] = useState<{ label: string; value: number; color: string }[]>([]);
  const [incomeByGrade, setIncomeByGrade] = useState<{ label: string; value: number }[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<{ label: string; value: number; color: string }[]>([]);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [totalAllTime, setTotalAllTime] = useState(0);
  const [avgFee, setAvgFee] = useState(0);

  useEffect(() => {
    (async () => {
      // Load grades table for ordering & display
      const { data: gradeRows } = await supabase.from('grades').select('*').order('sort_order', { ascending: true });

      const nums: Record<string, string> = {'الأول': '1', 'الثاني': '2', 'الثالث': '3', 'الرابع': '4', 'الخامس': '5', 'السادس': '6'};
      const stages: Record<string, string> = {'الابتدائي': '', 'الإعدادي': 'ع', 'الثانوي': 'ث'};
      const stripSaf = (n: string) => n.replace(/^الصف\s+/, '');

      const orderMap: Record<string, number> = {};
      const shortMap: Record<string, string> = {};
      for (let i = 0; i < (gradeRows || []).length; i++) {
        const key = stripSaf(gradeRows[i].name);
        orderMap[key] = i + 1;
        // Compute short label
        const clean = stripSaf(gradeRows[i].name);
        let short = clean;
        for (const [n, d] of Object.entries(nums)) {
          if (clean.startsWith(n)) {
            for (const [s, suff] of Object.entries(stages)) {
              if (clean.endsWith(s)) { short = d + suff; break; }
            }
            break;
          }
        }
        shortMap[key] = short;
      }

      const { data: students } = await supabase.from('students').select('*').eq('status', 'active');
      setTotalStudents(students?.length || 0);
      setMaleCount(students?.filter(s => s.gender === 'ذكر').length || 0);
      setFemaleCount(students?.filter(s => s.gender === 'أنثى').length || 0);
      const feesTotal = (students || []).reduce((s, st) => s + Number(st.monthly_fee || 0), 0);
      setTotalFees(feesTotal);

      // Gender distribution
      const males = students?.filter(s => s.gender === 'ذكر').length || 0;
      const females = students?.filter(s => s.gender === 'أنثى').length || 0;
      setGenderDist([
        { label: 'ذكر', value: males, color: '#60a5fa' },
        { label: 'أنثى', value: females, color: '#f472b6' },
      ]);

      // Grade distribution — use grades table order
      const gradeMap: Record<string, number> = {};
      for (const s of students || []) {
        const g = s.grade || 'أخرى';
        gradeMap[g] = (gradeMap[g] || 0) + 1;
      }
      const sorted = Object.entries(gradeMap)
        .sort(([a], [b]) => (orderMap[a] || 99) - (orderMap[b] || 99))
        .map(([label, value]) => ({ label: shortMap[label] || label, value }));
      setGradeDist(sorted);

      // Group distribution (top 10, shorter labels)
      const groupMap: Record<string, number> = {};
      for (const s of students || []) {
        const g = s.group_name || 'بدون مجموعة';
        groupMap[g] = (groupMap[g] || 0) + 1;
      }
      const groupSorted = Object.entries(groupMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([label, value]) => {
          // Shorten long group names
          let short = label;
          if (label.startsWith('مجموعة الساعة ')) short = label.replace('مجموعة الساعة ', '') + ' م';
          return { label: short, value };
        });
      setGroupDist(groupSorted);

      // Payments this month
      const { data: payments } = await supabase.from('payments').select('*');
      const now = new Date();
      let monthly = 0;
      const paidStudentIds = new Set<string>();
      for (const p of payments || []) {
        const d = new Date(p.date);
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
          monthly += Number(p.amount);
          paidStudentIds.add(p.student_id);
        }
      }
      setMonthlyCollected(monthly);

      // Total all-time payments
      setTotalAllTime((payments || []).reduce((s, p) => s + Number(p.amount), 0));

      // Average fee
      const studentCount = students?.length || 0;
      setAvgFee(studentCount > 0 ? Math.round(feesTotal / studentCount) : 0);

      // Remaining to collect
      const remaining = feesTotal - monthly;
      setRemainingCollect(Math.max(0, remaining));

      // Income by grade
      const { data: allStudents } = await supabase.from('students').select('*');
      const studentGradeMap: Record<string, string> = {};
      for (const s of allStudents || []) studentGradeMap[s.id] = s.grade || 'أخرى';
      const incomeMap: Record<string, number> = {};
      for (const p of payments || []) {
        const d = new Date(p.date);
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
          const g = studentGradeMap[p.student_id] || 'أخرى';
          incomeMap[g] = (incomeMap[g] || 0) + Number(p.amount);
        }
      }
      const incomeSorted = Object.entries(incomeMap)
        .sort(([a], [b]) => (orderMap[a] || 99) - (orderMap[b] || 99))
        .map(([label, value]) => ({ label: shortMap[label] || label, value }));
      setIncomeByGrade(incomeSorted);

      // Payment status (paid vs unpaid this month for active students)
      let unpaid = 0;
      let paidCount = 0;
      for (const s of students || []) {
        if (s.monthly_fee > 0) {
          if (paidStudentIds.has(s.id)) paidCount++;
          else unpaid++;
        }
      }
      setUnpaidCount(unpaid);
      setPaymentStatus([
        { label: 'مسدد', value: paidCount, color: '#34d399' },
        { label: 'غير مسدد', value: unpaid, color: '#f87171' },
      ]);

      setLoading(false);
    })();
  }, []);

  const stats = [
    { label: 'إجمالي الطلاب', value: `${totalStudents} ط`, icon: <Users size={22} />, bg: 'from-blue-500 to-blue-700' },
    { label: 'الذكور', value: `${maleCount} ط`, icon: <UserCheck size={22} />, bg: 'from-cyan-500 to-cyan-700' },
    { label: 'الإناث', value: `${femaleCount} ط`, icon: <User size={22} />, bg: 'from-pink-500 to-rose-600' },
    { label: 'الرسوم الشهرية', value: `${totalFees.toLocaleString('ar-EG')} ج`, icon: <DollarSign size={22} />, bg: 'from-emerald-500 to-emerald-700' },
    { label: 'متوسط المصروفات', value: `${avgFee.toLocaleString('ar-EG')} ج`, icon: <TrendingUp size={22} />, bg: 'from-teal-500 to-teal-700' },
    { label: 'المدفوع هذا الشهر', value: `${monthlyCollected.toLocaleString('ar-EG')} ج`, icon: <Wallet size={22} />, bg: 'from-violet-500 to-violet-700' },
    { label: 'إجمالي المدفوعات', value: `${totalAllTime.toLocaleString('ar-EG')} ج`, icon: <BarChart3 size={22} />, bg: 'from-indigo-500 to-indigo-700' },
    { label: 'المتـبقي تحصيله', value: `${remainingCollect.toLocaleString('ar-EG')} ج`, icon: <TrendingDown size={22} />, bg: 'from-amber-500 to-orange-600' },
  ];
  const collectRate = totalFees > 0 ? Math.round((monthlyCollected / totalFees) * 100) : 0;

  if (loading) {
    return (
      <div className="fade-in flex items-center justify-center py-20">
        <div className="text-gray-400 text-sm">جاري تحميل التقرير...</div>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <GraduationCap size={20} className="text-pink-500" />
        <h1 className="text-lg font-bold text-gray-800">إجماليات ونسب</h1>
      </div>

      {/* 8 Stats: 4×2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`stat-card bg-gradient-to-br ${s.bg} shadow-lg`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-xs mb-1">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">{s.icon}</div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-2xl" />
          </div>
        ))}
      </div>

      {/* Collection Rate Progress Bar */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-white/60" />
            <span className="font-bold text-sm text-white">نسبة التحصيل هذا الشهر</span>
          </div>
          <span className="text-white font-bold text-lg">{collectRate}%</span>
        </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full hbar-grow" style={{ '--target-w': `${Math.min(collectRate, 100)}%`, background: collectRate >= 80 ? '#34d399' : collectRate >= 50 ? '#fbbf24' : '#f87171' } as React.CSSProperties} />
          </div>
        <div className="flex justify-between text-[10px] text-white/40 mt-1">
          <span>0%</span>
          <span>{monthlyCollected.toLocaleString('ar-EG')} ج / {totalFees.toLocaleString('ar-EG')} ج</span>
          <span>100%</span>
        </div>
      </div>

      {/* Pie charts — side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="chart-card bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <PieChart size={14} className="text-white/60" />
            <p className="font-bold text-sm">توزيع الجنس</p>
          </div>
          <div className="flex items-center gap-4">
            <DonutChart data={genderDist} size={120} />
            <div className="space-y-2 text-xs">
              {genderDist.filter(d => d.value > 0).map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-white/70">{d.label}</span>
                  <span className="text-white font-bold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="chart-card bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={14} className="text-white/60" />
            <p className="font-bold text-sm">حالة السداد</p>
          </div>
          <div className="flex items-center justify-center gap-6">
            <DonutChart data={paymentStatus} size={120} />
            <div className="space-y-2 text-xs">
              {paymentStatus.filter(d => d.value > 0).map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-white/70">{d.label}</span>
                  <span className="text-white font-bold">{d.value}</span>
                  <span className="text-white/50">
                    ({totalStudents > 0 ? Math.round((d.value / (paymentStatus[0].value + paymentStatus[1].value)) * 100) : 0}%)
                  </span>
                </div>
              ))}
              {totalStudents > 0 && (
                <div className="text-white/50 text-xs mt-2 border-t border-white/20 pt-2">
                  {unpaidCount > 0
                    ? `${unpaidCount} طالب لم يسددوا بعد`
                    : 'جميع الطلاب مسددين ✓'
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bar charts — each full width */}
      <div className="chart-card bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-white/60" />
          <p className="font-bold text-sm">توزيع المراحل</p>
        </div>
        {gradeDist.length > 0
          ? <BarChart data={gradeDist} color="rgba(255,255,255,0.85)" unit=" ط" height={280} />
          : <div className="text-white/50 text-xs text-center py-6">لا توجد بيانات</div>
        }
      </div>
      <div className="chart-card bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={14} className="text-white/60" />
          <p className="font-bold text-sm">توزيع المجموعات</p>
        </div>
        {groupDist.length > 0
          ? <BarChart data={groupDist} color="rgba(251,191,36,0.85)" unit=" ط" height={280} />
          : <div className="text-white/50 text-xs text-center py-6">لا توجد بيانات</div>
        }
      </div>
      <div className="chart-card bg-gradient-to-br from-green-500 to-emerald-700 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={14} className="text-white/60" />
          <p className="font-bold text-sm">الدخل حسب المرحلة</p>
        </div>
        {incomeByGrade.length > 0
          ? <BarChart data={incomeByGrade} color="rgba(255,255,255,0.85)" unit=" ج" height={280} />
          : <div className="text-white/50 text-xs text-center py-6">لا توجد مدفوعات</div>
        }
        <p className="text-[10px] text-white/50 text-left mt-1">القيم بالجنيه المصري</p>
      </div>
    </div>
  );
}
