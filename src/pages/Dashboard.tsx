import { useState, useEffect, useRef } from 'react';
import { Users, DollarSign, TrendingUp, Wallet, Clock, UserX, BookOpen, Banknote, Brain, AlertTriangle, Award, Lightbulb, ShoppingCart, CreditCard } from 'lucide-react';
import { supabase } from '../supabaseClient';

function BarChart({ data, color, unit, height = 120, minBarWidth = 20, gap = 10, className = 'w-full', barWidth }: { data: { label: string; value: number }[]; color: string; unit?: string; height?: number; minBarWidth?: number; gap?: number; className?: string; barWidth?: number }) {
  const max = Math.max(...data.map(d => d.value));
  const w = Math.max(500, data.length * 60);
  const h = height;
  const pad = 20;
  const bottomPad = 36;
  const slotW = (w - 2 * pad) / data.length;
  const barW = barWidth || Math.min(Math.max(20, slotW - gap * 3), slotW - gap * 2);
  const startX = (i: number) => barWidth
    ? pad + (w - 2 * pad - data.length * barWidth - (data.length - 1) * gap) / 2 + i * (barWidth + gap)
    : pad + i * slotW + (slotW - barW) / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} style={{ height: h }}>
      {data.map((d, i) => {
        const barH = max > 0 ? ((d.value / max) * (h - pad - bottomPad)) : 2;
        const x = startX(i);
        const y = h - bottomPad - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx="2" fill={color} opacity="0.85" className="chart-anim-bar" style={{ animationDelay: `${i * 0.08}s` }} />
            <text x={x + barW / 2} y={h - 6} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.75)">{d.label}</text>
            <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="13" fill="rgba(255,255,255,0.95)" fontWeight="bold" className="chart-anim-fade" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>{d.value}{unit || ''}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ data, color, unit, height = 120 }: { data: number[]; color: string; unit?: string; height?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 500;
  const h = height;
  const pad = 20;
  const bottomPad = 24;
  const divisor = (data.length - 1) || 1;
  let lineLen = 0;
  let px = 0, py = 0;
  const points = data.map((v, i) => {
    const x = pad + (i / divisor) * (w - 2 * pad);
    const y = h - bottomPad - ((v - min) / range) * (h - pad - bottomPad);
    if (i > 0) lineLen += Math.sqrt((x - px) ** 2 + (y - py) ** 2);
    px = x; py = y;
    return `${x},${y}`;
  });
  lineLen = Math.max(lineLen, 1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ '--len': lineLen }} className="chart-anim-line" />
      {data.map((v, i) => {
        const x = pad + (i / divisor) * (w - 2 * pad);
        const y = h - bottomPad - ((v - min) / range) * (h - pad - bottomPad);
        return <circle key={i} cx={x} cy={y} r="5" fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth="2" className="chart-anim-fade" style={{ animation: 'fadeUp 0.3s ease-out forwards', animationDelay: `${0.6 + i * 0.1}s`, opacity: 0 }} />;
      })}
      {data.map((v, i) => {
        const x = pad + (i / divisor) * (w - 2 * pad);
        const y = h - bottomPad - ((v - min) / range) * (h - pad - bottomPad);
        return <text key={i} x={x} y={y - 7} textAnchor="middle" fontSize="13" fill="rgba(255,255,255,0.95)" fontWeight="bold" style={{ animation: 'fadeUp 0.3s ease-out forwards', animationDelay: `${0.7 + i * 0.1}s`, opacity: 0 }}>{v}{unit || ''}</text>;
      })}
      {data.map((_, i) => {
        const x = pad + (i / divisor) * (w - 2 * pad);
        return <text key={i} x={x} y={h - 4} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.7)" style={{ animation: 'fadeUp 0.3s ease-out forwards', animationDelay: `${0.8 + i * 0.05}s`, opacity: 0 }}>{i + 1}</text>;
      })}
    </svg>
  );
}

interface SmartInsight {
  type: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  desc: string;
}

function SmartAnalysis({ students, payments, absentCount, examCount, monthlyIncome, expectedIncome }: {
  students: any[]; payments: any[]; absentCount: number; examCount: number; monthlyIncome: number; expectedIncome: number;
}) {
  const insights: SmartInsight[] = [];

  if (!students.length) {
    insights.push({ type: 'warning', title: 'لا يوجد طلاب', desc: 'لم يتم تسجيل أي طالب بعد. ابدأ بإضافة طلاب جدد.' });
    return (
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center gap-2 mb-4 border-b pb-2">
          <Brain size={18} className="text-pink-500" />
          <h3 className="font-bold text-gray-800 text-sm">تحليل ذكى</h3>
          <span className="text-[10px] bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-semibold mr-auto">AI</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-yellow-50 text-yellow-700"><AlertTriangle size={18} /></div>
            <div><p className="text-sm font-bold text-gray-800">{insights[0].title}</p><p className="text-xs text-gray-500 mt-0.5">{insights[0].desc}</p></div>
          </div>
        </div>
      </div>
    );
  }

  const studentCount = students.length;

  // 1. Payment rate
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const paidThisMonth = payments.filter(p => {
    const d = new Date(p.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const paidStudentIds = new Set(paidThisMonth.map(p => p.student_id));
  const payers = paidStudentIds.size;
  const expectedPayers = students.filter(s => Number(s.monthly_fee) > 0).length;
  const payRate = expectedPayers > 0 ? Math.round((payers / expectedPayers) * 100) : 0;
  if (payRate >= 80) {
    insights.push({ type: 'success', title: 'نسبة التحصيل', desc: `${payRate}% من الطلاب سددوا مصروفات الشهر الحالي. أداء ممتاز!` });
  } else if (payRate >= 50) {
    insights.push({ type: 'info', title: 'نسبة التحصيل', desc: `${payRate}% من الطلاب سددوا. تبقى ${expectedPayers - payers} طالب لم يسددوا بعد.` });
  } else if (expectedPayers > 0) {
    insights.push({ type: 'danger', title: 'نسبة التحصيل منخفضة', desc: `فقط ${payRate}% سددوا هذا الشهر. يفضل متابعة ${expectedPayers - payers} طالب متخلف.` });
  }

  // 2. Income vs expected
  if (expectedIncome > 0) {
    const incomeRate = Math.round((monthlyIncome / expectedIncome) * 100);
    if (incomeRate >= 90) {
      insights.push({ type: 'success', title: 'الإيرادات', desc: `حققت ${monthlyIncome.toLocaleString('ar-EG')} ج بنسبة ${incomeRate}% من المتوقع.` });
    } else if (incomeRate >= 60) {
      insights.push({ type: 'info', title: 'الإيرادات', desc: `${monthlyIncome.toLocaleString('ar-EG')} ج تم تحصيلها من أصل ${expectedIncome.toLocaleString('ar-EG')} ج متوقعة.` });
    } else {
      insights.push({ type: 'warning', title: 'الإيرادات منخفضة', desc: `تم تحصيل ${monthlyIncome.toLocaleString('ar-EG')} ج فقط من ${expectedIncome.toLocaleString('ar-EG')} ج.` });
    }
  }

  // 3. Absence alert
  if (absentCount > 0) {
    const avgAbsence = studentCount > 0 ? Math.round(absentCount / studentCount * 100) : 0;
    if (avgAbsence > 50) {
      insights.push({ type: 'danger', title: 'الغياب مرتفع', desc: `متوسط الغياب ${avgAbsence}% — ينصح بإرسال رسائل تذكير لأولياء الأمور.` });
    } else if (avgAbsence > 20) {
      insights.push({ type: 'warning', title: 'الغياب متوسط', desc: `${absentCount} حالة غياب بمعدل ${avgAbsence}%.` });
    } else {
      insights.push({ type: 'info', title: 'الغياب منخفض', desc: `${absentCount} حالة غياب بمعدل ${avgAbsence}% — أداء جيد.` });
    }
  }

  // 4. Gender ratio
  const males = students.filter(s => s.gender === 'ذكر').length;
  const females = students.filter(s => s.gender === 'أنثى').length;
  if (males > 0 || females > 0) {
    const pctM = Math.round((males / studentCount) * 100);
    const pctF = Math.round((females / studentCount) * 100);
    insights.push({ type: 'info', title: 'نسبة الذكور والإناث', desc: `ذكور ${males} (${pctM}%) — إناث ${females} (${pctF}%).` });
  }

  // 5. Top paying grade
  const gradePayMap: Record<string, number> = {};
  const studentGradeMap: Record<string, string> = {};
  for (const s of students) studentGradeMap[s.id] = s.grade || 'أخرى';
  for (const p of paidThisMonth) {
    const g = studentGradeMap[p.student_id] || 'أخرى';
    gradePayMap[g] = (gradePayMap[g] || 0) + Number(p.amount);
  }
  const topGrade = Object.entries(gradePayMap).sort(([, a], [, b]) => b - a)[0];
  if (topGrade) {
    insights.push({ type: 'success', title: 'أعلى مرحلة تحصيلاً', desc: `"${topGrade[0]}" الأكثر تحصيلاً هذا الشهر ب ${Number(topGrade[1]).toLocaleString('ar-EG')} ج.` });
  }

  // 6. New students this month
  const newThisMonth = students.filter(s => {
    const d = new Date(s.join_date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  if (newThisMonth > 0) {
    insights.push({ type: 'success', title: 'طلاب جدد', desc: `تم تسجيل ${newThisMonth} طالب جديد هذا الشهر.` });
  }

  // 7. Late payers count
  if (expectedPayers > 0 && payRate < 100) {
    const lateCount = expectedPayers - payers;
    insights.push({ type: 'warning', title: 'المتخلفون عن الدفع', desc: `${lateCount} طالب لم يسددوا مصروفات الشهر الحالي.` });
  }

  // 8. Exam activity
  if (examCount > 0) {
    insights.push({ type: 'info', title: 'الاختبارات', desc: `تم تسجيل ${examCount} اختبار.` });
  }

  // 9. Smart tip
  if (payRate < 50 && absentCount > studentCount) {
    insights.push({ type: 'warning', title: 'نصيحة ذكية', desc: 'نسبة التحصيل منخفضة والغياب مرتفع. يفضل تنظيم اجتماع مع أولياء الأمور.' });
  } else if (payRate < 50) {
    insights.push({ type: 'info', title: 'نصيحة ذكية', desc: 'حاول تحسين نسبة التحصيل بتذكير أولياء الأمور عبر الإشعارات والمكالمات.' });
  } else if (absentCount > studentCount * 0.3) {
    insights.push({ type: 'info', title: 'نصيحة ذكية', desc: 'الغياب في ازدياد — أرسل تقارير غياب أسبوعية لأولياء الأمور.' });
  } else if (newThisMonth === 0 && studentCount < 50) {
    insights.push({ type: 'info', title: 'نصيحة ذكية', desc: 'لم يتم تسجيل طلاب جدد هذا الشهر. فكر في حملة إعلانية أو خصومات للتسجيل المبكر.' });
  } else {
    insights.push({ type: 'info', title: 'مؤشرات إيجابية', desc: 'كل المؤشرات مطمئنة. استمر في الأداء المتميز!' });
  }

  const iconMap: Record<string, { comp: any; bg: string }> = {
    info: { comp: <Users size={18} />, bg: 'bg-blue-50 text-blue-700' },
    success: { comp: <TrendingUp size={18} />, bg: 'bg-emerald-50 text-emerald-700' },
    warning: { comp: <AlertTriangle size={18} />, bg: 'bg-amber-50 text-amber-700' },
    danger: { comp: <UserX size={18} />, bg: 'bg-red-50 text-red-700' },
  };

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center gap-2 mb-4 border-b pb-2">
        <Brain size={18} className="text-pink-500" />
        <h3 className="font-bold text-gray-800 text-sm">تحليل ذكى</h3>
        <span className="text-[10px] bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-semibold mr-auto">AI</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {insights.map((item, i) => {
          const ico = iconMap[item.type];
          return (
            <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ico.bg}`}>{ico.comp}</div>
              <div>
                <p className="text-sm font-bold text-gray-800">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [studentCount, setStudentCount] = useState(0);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [dailyIncome, setDailyIncome] = useState(0);
  const [expectedIncome, setExpectedIncome] = useState(0);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [gradesData, setGradesData] = useState<{ label: string; value: number }[]>([]);
  const [incomeByGrade, setIncomeByGrade] = useState<{ label: string; value: number }[]>([]);
  const [incomeBySubject, setIncomeBySubject] = useState<{ label: string; value: number }[]>([]);
  const [avgScores, setAvgScores] = useState<number[]>([]);
  const [absentCount, setAbsentCount] = useState(0);
  const [examCount, setExamCount] = useState(0);
  const [yearStart, setYearStart] = useState('');
  const [bookPurchaseTotal, setBookPurchaseTotal] = useState(0);
  const [bookPaidTotal, setBookPaidTotal] = useState(0);
  const [bookRemainingTotal, setBookRemainingTotal] = useState(0);
  const [bookSalesTotal, setBookSalesTotal] = useState(0);
  const [lowStockBooks, setLowStockBooks] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      // Load grades for ordering
      const { data: gradeRows } = await supabase.from('grades').select('name, sort_order').order('sort_order', { ascending: true });
      const orderMap: Record<string, number> = {};
      for (const gr of gradeRows || []) orderMap[gr.name] = gr.sort_order;

      const { data: students } = await supabase.from('students').select('*').eq('status', 'active');
      setStudentCount(students?.length || 0);
      setAllStudents(students || []);

      // Grade distribution
      const gradeMap: Record<string, number> = {};
      for (const s of students || []) {
        const g = s.grade || 'أخرى';
        gradeMap[g] = (gradeMap[g] || 0) + 1;
      }
      const sorted = Object.entries(gradeMap)
        .sort(([a], [b]) => (orderMap[a] || 99) - (orderMap[b] || 99))
        .map(([label, value]) => ({ label, value }));
      setGradesData(sorted);

      // Expected monthly income
      const totalFees = (students || []).reduce((s, st) => s + Number(st.monthly_fee || 0), 0);
      setExpectedIncome(totalFees);

      // Payments
      const { data: payments } = await supabase.from('payments').select('*');
      setAllPayments(payments || []);
      const now = new Date();
      let daily = 0;
      let monthly = 0;
      for (const p of payments || []) {
        const d = new Date(p.date);
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
          monthly += Number(p.amount);
          if (d.getDate() === now.getDate()) daily += Number(p.amount);
        }
      }
      setDailyIncome(daily);
      setMonthlyIncome(monthly);

      // Income by grade this month
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
        .map(([label, value]) => ({ label, value }));
      setIncomeByGrade(incomeSorted);

      // Income by subject this month
      const { data: subjects } = await supabase.from('subjects').select('*');
      const { data: subjectStudents } = await supabase.from('subject_students').select('*');
      const subjStudentMap: Record<string, string[]> = {};
      for (const ss of subjectStudents || []) {
        if (!subjStudentMap[ss.student_id]) subjStudentMap[ss.student_id] = [];
        if (!subjStudentMap[ss.student_id].includes(ss.subject_id)) subjStudentMap[ss.student_id].push(ss.subject_id);
      }
      const subjNameMap: Record<string, string> = {};
      for (const s of subjects || []) subjNameMap[s.id] = s.name;
      const subjIncomeMap: Record<string, number> = {};
      for (const p of payments || []) {
        const d = new Date(p.date);
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
          const subjectIds = subjStudentMap[p.student_id];
          if (!subjectIds) { subjIncomeMap['بدون مادة'] = (subjIncomeMap['بدون مادة'] || 0) + Number(p.amount); continue; }
          if (subjectIds.length === 0) { subjIncomeMap['بدون مادة'] = (subjIncomeMap['بدون مادة'] || 0) + Number(p.amount); continue; }
          const share = Number(p.amount) / subjectIds.length;
          for (const sid of subjectIds) {
            const name = subjNameMap[sid];
            if (!name) continue;
            subjIncomeMap[name] = (subjIncomeMap[name] || 0) + share;
          }
        }
      }
      setIncomeBySubject(
        Object.entries(subjIncomeMap)
          .sort(([, a], [, b]) => b - a)
          .map(([label, value]) => ({ label, value: Math.round(value) }))
      );

      // Absence
      const { data: absences } = await supabase.from('absence_records').select('*');
      setAbsentCount(absences?.length || 0);

      // Exam avg scores (last 5)
      const { data: results } = await supabase.from('exam_results').select('*').order('date', { ascending: false }).limit(5);
      const scores: number[] = [];
      for (const r of results || []) {
        if (r.max_score > 0) scores.push(Math.round((Number(r.score) / Number(r.max_score)) * 100));
      }
      setAvgScores(scores.length ? scores : [0]);
      setExamCount(results?.length || 0);

      // Center config
      const { data: config } = await supabase.from('center_config').select('*').maybeSingle();
      if (config?.year_start) setYearStart(new Date(config.year_start).toLocaleDateString('ar-EG'));

      // Book finances
      const { data: books } = await supabase.from('books').select('*');
      const { data: deliveries } = await supabase.from('book_deliveries').select('*');
      if (books) {
        let totalPurchase = 0, totalPaid = 0, totalRemaining = 0;
        for (const b of books) {
          const qty = Number(b.quantity) || 0;
          const pp = Number(b.purchase_price) || 0;
          const dv = Number(b.discount_value) || 0;
          const pa = Number(b.paid_amount) || 0;
          const cost = qty * pp;
          const disc = b.discount_type === 'percent' ? cost * (dv / 100) : dv;
          totalPurchase += cost;
          totalPaid += pa;
          totalRemaining += Math.max(0, cost - disc - pa);
        }
        setBookPurchaseTotal(totalPurchase);
        setBookPaidTotal(totalPaid);
        setBookRemainingTotal(totalRemaining);
        setLowStockBooks(books.filter((b: any) => Number(b.stock) <= 5));
      }
      if (deliveries) {
        setBookSalesTotal(deliveries.reduce((s, d) => s + Number(d.total_price || 0), 0));
      }
    })();
  }, []);

  const stats = [
    { label: 'الوارد اليومى', value: `${dailyIncome.toLocaleString('ar-EG')} ج`, sub: '', icon: <Wallet size={22} />, bg: 'from-pink-500 to-rose-600' },
    { label: 'الوارد الشهرى', value: `${monthlyIncome.toLocaleString('ar-EG')} ج`, sub: '', icon: <DollarSign size={22} />, bg: 'from-green-500 to-emerald-600' },
    { label: 'عدد الطلاب', value: `${studentCount.toLocaleString('ar-EG')} ط`, sub: '', icon: <Users size={22} />, bg: 'from-blue-500 to-blue-600' },
    { label: 'صافى الدخل المتوقع', value: `${expectedIncome.toLocaleString('ar-EG')} ج`, sub: '', icon: <TrendingUp size={22} />, bg: 'from-gray-700 to-gray-900' },
    { label: 'فلوس الكتب', value: `${(bookSalesTotal - bookPurchaseTotal).toLocaleString('ar-EG')} ج`, sub: bookPurchaseTotal ? `مشتريات ${bookPurchaseTotal.toLocaleString('ar-EG')} ج` : '', icon: <ShoppingCart size={22} />, bg: 'from-purple-500 to-purple-700' },
  ];

  const yearInfo = [
    { icon: <Clock size={16} className="text-green-500" />, label: 'بداية العام', value: yearStart || '—' },
    { icon: <UserX size={16} className="text-orange-500" />, label: 'مرات أخد الغياب', value: `${absentCount} مرة` },
    { icon: <BookOpen size={16} className="text-blue-500" />, label: 'مرات تسجيل الدرجات', value: `${examCount} مرة` },
    { icon: <ShoppingCart size={16} className="text-purple-500" />, label: 'مدفوع الكتب', value: `${bookPaidTotal.toLocaleString('ar-EG')} ج` },
    { icon: <CreditCard size={16} className="text-red-500" />, label: 'متبقي الكتب', value: `${bookRemainingTotal.toLocaleString('ar-EG')} ج` },
    { icon: <Banknote size={16} className="text-yellow-500" />, label: 'مجموع الدخل', value: `${monthlyIncome.toLocaleString('ar-EG')} ج` },
  ];

  return (
    <div className="fade-in space-y-5">
      <div className="grid grid-cols-5 gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`stat-card bg-gradient-to-br ${s.bg} shadow-lg`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-xs mb-1">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-white/60 text-xs mt-1">{s.sub}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">{s.icon}</div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-2xl" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="chart-card bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg">
          <p className="font-bold text-sm mb-3">عدد الطلاب بكل مرحلة</p>
          <BarChart data={gradesData.length ? gradesData : [{ label: '—', value: 1 }]} color="rgba(255,255,255,0.85)" unit=" ط" />
        </div>
        <div className="chart-card bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg">
          <p className="font-bold text-sm mb-3">متوسط درجات أخر 5 اختبارات</p>
          <LineChart data={avgScores} color="rgba(255,255,255,0.9)" unit="%" />
        </div>
      </div>
      <div className="chart-card bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
        <p className="font-bold text-sm mb-3">الدخل الشهري حسب المرحلة</p>
        <BarChart data={incomeByGrade.length ? incomeByGrade : [{ label: '—', value: 1 }]} color="rgba(255,255,255,0.85)" unit=" ج" barWidth={60} gap={15} />
        <p className="text-[10px] text-white/50 text-left mt-1">القيم بالجنيه المصري</p>
      </div>
      <div className="chart-card bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg">
        <p className="font-bold text-sm mb-3">الدخل الشهري حسب كل مادة</p>
        <BarChart data={incomeBySubject.length ? incomeBySubject : [{ label: '—', value: 1 }]} color="rgba(255,255,255,0.85)" unit=" ج" barWidth={60} gap={15} />
        <p className="text-[10px] text-white/50 text-left mt-1">القيم بالجنيه المصري — في حالة مواد متعددة للطالب، يتم توزيع رسومه بالتساوي</p>
      </div>

      <div className="bg-white rounded-2xl shadow p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4 border-b pb-2">بيانات عن العام الدراسى</h3>
        <div className="grid grid-cols-2 gap-3">
          {yearInfo.map((item, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                {item.icon}
                <span className="text-sm text-gray-700 font-medium">{item.label}</span>
              </div>
              <span className="text-sm font-bold text-gray-800">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {lowStockBooks.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-5 border-r-4 border-red-400">
          <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <ShoppingCart size={16} className="text-red-500" />
            تنبيهات المخزون
            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold mr-auto">{lowStockBooks.length}</span>
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {lowStockBooks.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-2.5">
                <div>
                  <p className="text-sm font-bold text-gray-800">{b.title}</p>
                  <p className="text-xs text-gray-500">{b.grade || '—'}</p>
                </div>
                <span className={`text-sm font-bold ${Number(b.stock) <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                  {Number(b.stock) <= 0 ? 'نفذ' : `${b.stock} نسخ`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <SmartAnalysis students={allStudents} payments={allPayments} absentCount={absentCount} examCount={examCount} monthlyIncome={monthlyIncome} expectedIncome={expectedIncome} />
    </div>
  );
}
