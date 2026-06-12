import { Printer, Download, Eye, Users, GraduationCap, BookOpen, DollarSign, Truck, CreditCard, BarChart3, ClipboardList } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { printHeaderHtml, printHeaderStyle } from '../utils/printHeader';

const openPrintWindow = (title: string, headers: string[], rows: string[][], centerConfig: { name: string; address: string; phone: string; logo: string }) => {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${title}</title>
    <style>
      @page { size: A4 portrait; margin: 18mm 8mm 14mm; }
      * { font-family: 'Traditional Arabic', 'Arabic Typesetting', Arial, sans-serif; }
      body { margin: 0; padding: 0; }
      ${printHeaderStyle()}
      .content { padding: 6mm 5mm; }
      h2 { text-align: center; font-size: 14pt; color: #1e3a5f; margin: 0 0 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      th { background: #1e3a5f; color: white; padding: 5px 6px; text-align: center; font-weight: bold; font-size: 9pt; }
      td { padding: 4px 6px; text-align: center; border-bottom: 1px solid #ddd; font-size: 8.5pt; }
      tr:nth-child(even) td { background: #f8f9fa; }
    </style></head><body>
    ${printHeaderHtml({ center_name: centerConfig.name, address: centerConfig.address, phone: centerConfig.phone, logo: centerConfig.logo })}
    <div class="content">
    <h2>${title}</h2>
    <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(r => `<tr>${r.map(v => `<td>${v ?? ''}</td>`).join('')}</tr>`).join('')}
    </tbody></table>
    </div>
    </body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); setTimeout(() => { w.close(); window.focus(); }, 100); }, 200);
};

const loadAll = async (table: string) => {
  const { data } = await supabase.from(table).select('*');
  return data || [];
};

export default function Publications() {
  const [centerConfig, setCenterConfig] = useState({ name: 'CenterMasr', address: '', phone: '', logo: '' });

  useEffect(() => {
    supabase.from('center_config').select('center_name,address,phone,logo').maybeSingle().then(res => {
      if (res.data) setCenterConfig({ name: res.data.center_name || 'CenterMasr', address: res.data.address || '', phone: res.data.phone || '', logo: res.data.logo || '' });
    });
  }, []);

  const cfg = centerConfig;
  const printTeachers = async () => {
    const [teachers, subjects, st, ss, results] = await Promise.all([
      loadAll('teachers'), loadAll('subjects'), loadAll('subject_teachers'),
      loadAll('subject_students'), loadAll('exam_results'),
    ]);
    const headers = ['#', 'المعلم', 'الهاتف', 'المواد', 'عدد الطلاب', 'متوسط درجات الطلاب'];
    const rows = teachers.map((t: any, i: number) => {
      const subIds = st.filter((s: any) => s.teacher_id === t.id).map((s: any) => s.subject_id);
      const subNames = subIds.map((sid: string) => subjects.find((s: any) => s.id === sid)?.name || '').filter(Boolean).join(' - ');
      const studentIds = ss.filter((s: any) => subIds.includes(s.subject_id)).map((s: any) => s.student_id);
      const uniqueStudents = [...new Set(studentIds)];
      const studentResults = results.filter((r: any) => uniqueStudents.includes(r.student_id));
      const avg = studentResults.length > 0 ? (studentResults.reduce((s: any, r: any) => s + Number(r.score), 0) / studentResults.length).toFixed(1) : '—';
      return [String(i + 1), t.name || '—', t.phone || '—', subNames || '—', String(uniqueStudents.length), avg];
    });
    openPrintWindow('تقرير المعلمين', headers, rows, cfg);
  };

  const printGroups = async () => {
    const [groups, subjects, gs, students] = await Promise.all([
      loadAll('groups'), loadAll('subjects'), loadAll('group_subjects'), loadAll('students'),
    ]);
    const headers = ['#', 'اسم المجموعة', 'المواد', 'عدد الطلاب'];
    const rows = groups.map((g: any, i: number) => {
      const subIds = gs.filter((s: any) => s.group_id === g.id).map((s: any) => s.subject_id);
      const subNames = subIds.map((sid: string) => subjects.find((s: any) => s.id === sid)?.name || '').filter(Boolean).join(' - ');
      const count = students.filter((s: any) => s.group_name === g.name).length;
      return [String(i + 1), g.name || '—', subNames || '—', String(count)];
    });
    openPrintWindow('تقرير المجموعات', headers, rows, cfg);
  };

  const printSubjects = async () => {
    const [subjects, teachers, st, ss] = await Promise.all([
      loadAll('subjects'), loadAll('teachers'), loadAll('subject_teachers'), loadAll('subject_students'),
    ]);
    const headers = ['#', 'المادة', 'المعلمون', 'عدد الطلاب'];
    const rows = subjects.map((sub: any, i: number) => {
      const tIds = st.filter((s: any) => s.subject_id === sub.id).map((s: any) => s.teacher_id);
      const tNames = tIds.map((tid: string) => teachers.find((t: any) => t.id === tid)?.name || '').filter(Boolean).join(' - ');
      const count = ss.filter((s: any) => s.subject_id === sub.id).length;
      return [String(i + 1), sub.name, tNames || '—', String(count)];
    });
    openPrintWindow('تقرير المواد الدراسية', headers, rows, cfg);
  };

  const printSuppliers = async () => {
    const [suppliers, txns] = await Promise.all([
      loadAll('suppliers'), loadAll('supplier_transactions'),
    ]);
    const headers = ['#', 'المورد', 'الهاتف', 'الرصيد الافتتاحي', 'المشتريات', 'المدفوعات', 'الرصيد الحالي'];
    const rows = suppliers.map((s: any, i: number) => {
      const sTxns = txns.filter((t: any) => t.supplier_id === s.id);
      const purchases = sTxns.filter((t: any) => t.type === 'purchase').reduce((a, t) => a + Number(t.amount), 0);
      const payments = sTxns.filter((t: any) => t.type === 'payment').reduce((a, t) => a + Number(t.amount), 0);
      const balance = (Number(s.opening_balance) || 0) + purchases - payments;
      return [String(i + 1), s.name, s.phone || '—', (Number(s.opening_balance) || 0).toFixed(2), purchases.toFixed(2), payments.toFixed(2), balance.toFixed(2)];
    });
    openPrintWindow('كشف حساب الموردين', headers, rows, cfg);
  };

  const printFinancialSummary = async () => {
    const [students, payments, deliveries, txns] = await Promise.all([
      loadAll('students'), loadAll('payments'), loadAll('book_deliveries'), loadAll('supplier_transactions'),
    ]);
    const active = students.filter((s: any) => s.status === 'active');
    const monthlyExpected = active.reduce((s: any, st: any) => s + Number(st.monthly_fee), 0);
    const totalPaid = payments.reduce((s: any, p: any) => s + Number(p.amount), 0);
    const bookRevenue = deliveries.reduce((s: any, d: any) => s + Number(d.total_price), 0);
    const bookPaid = deliveries.reduce((s: any, d: any) => s + Number(d.paid_amount || 0), 0);
    const totalPurchases = txns.filter((t: any) => t.type === 'purchase').reduce((s: any, t: any) => s + Number(t.amount), 0);
    const totalSupplierPayments = txns.filter((t: any) => t.type === 'payment').reduce((s: any, t: any) => s + Number(t.amount), 0);
    const headers = ['البيان', 'القيمة'];
    const rows = [
      ['عدد الطلاب النشطين', String(active.length)],
      ['المتوقع شهرياً', `${monthlyExpected.toFixed(2)} ج`],
      ['المدفوع من الطلاب', `${totalPaid.toFixed(2)} ج`],
      ['إيرادات الكتب', `${bookRevenue.toFixed(2)} ج`],
      ['المدفوع من الكتب', `${bookPaid.toFixed(2)} ج`],
      ['مشتريات الموردين', `${totalPurchases.toFixed(2)} ج`],
      ['مدفوعات الموردين', `${totalSupplierPayments.toFixed(2)} ج`],
      ['صافي الدخل', `${(totalPaid + bookPaid - totalPurchases).toFixed(2)} ج`],
    ];
    openPrintWindow('الملخص المالي', headers, rows, cfg);
  };

  const printBookDeliveries = async () => {
    const deliveries = await loadAll('book_deliveries');
    const grouped: Record<string, { count: number; income: number; paid: number }> = {};
    for (const d of deliveries) {
      if (!grouped[d.book_title]) grouped[d.book_title] = { count: 0, income: 0, paid: 0 };
      grouped[d.book_title].count++;
      grouped[d.book_title].income += Number(d.total_price);
      grouped[d.book_title].paid += Number(d.paid_amount || 0);
    }
    const headers = ['#', 'الكتاب', 'عدد التوزيعات', 'الإجمالي', 'المدفوع', 'المتبقي'];
    const rows = Object.entries(grouped).map(([name, stats], i) => [
      String(i + 1), name, String(stats.count), `${stats.income.toFixed(2)}`, `${stats.paid.toFixed(2)}`, `${(stats.income - stats.paid).toFixed(2)}`,
    ]);
    openPrintWindow('تقرير توزيع الكتب', headers, rows, cfg);
  };

  const printExamSummary = async () => {
    const [exams, results] = await Promise.all([
      loadAll('exams'), loadAll('exam_results'),
    ]);
    const headers = ['#', 'الاختبار', 'المادة', 'المجموعة/المرحلة', 'عدد المتقدمين', 'متوسط الدرجات'];
    const rows = exams.map((e: any, i: number) => {
      const eRes = results.filter((r: any) => r.exam_title === e.title);
      const scores = eRes.map((r: any) => Number(r.score));
      const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '—';
      return [String(i + 1), e.title, e.subject || '—', e.group_name || e.stage || '—', String(eRes.length), avg];
    });
    openPrintWindow('إحصائيات الاختبارات', headers, rows, cfg);
  };

  const printPayments = async () => {
    const payments = await loadAll('payments');
    const headers = ['#', 'الطالب', 'المبلغ', 'التاريخ', 'المستلم'];
    const rows = payments.map((p: any, i: number) => [
      String(i + 1), p.student_name || '—', `${Number(p.amount || 0).toFixed(2)}`, p.date?.slice(0, 10) || '—', p.received_by || '—',
    ]);
    openPrintWindow('تقرير المدفوعات', headers, rows, cfg);
  };

  const printAllStudents = async () => {
    const students = await loadAll('students');
    const headers = ['#', 'الاسم', 'المجموعة', 'الصف', 'الرسوم', 'الرصيد', 'الحالة'];
    const rows = students.map((s: any, i: number) => [
      String(i + 1), s.name || '—', s.group_name || '—', s.grade || '—',
      `${Number(s.monthly_fee || 0).toFixed(2)}`, `${Number(s.balance || 0).toFixed(2)}`, s.status || '—',
    ]);
    openPrintWindow('تقرير الطلاب الكلى', headers, rows, cfg);
  };

  const printAbsence = async () => {
    const [students, absence] = await Promise.all([
      loadAll('students'), loadAll('absence_records'),
    ]);
    const grouped: Record<string, { name: string; count: number }> = {};
    for (const a of absence) {
      if (!grouped[a.student_id]) {
        const st = students.find((s: any) => s.id === a.student_id);
        grouped[a.student_id] = { name: st?.name || '—', count: 0 };
      }
      grouped[a.student_id].count++;
    }
    const headers = ['#', 'الطالب', 'عدد أيام الغياب'];
    const rows = Object.entries(grouped).sort((a, b) => b[1].count - a[1].count).map(([_, v], i) => [
      String(i + 1), v.name, String(v.count),
    ]);
    openPrintWindow('تقرير الغياب', headers, rows, cfg);
  };

  const printGrades = async () => {
    const [exams, results, students] = await Promise.all([
      loadAll('exams'), loadAll('exam_results'), loadAll('students'),
    ]);
    const headers = ['#', 'الطالب', 'الاختبار', 'المادة', 'الدرجة', 'من', 'النسبة'];
    const rows: string[][] = [];
    let idx = 0;
    for (const r of results) {
      const exam = exams.find((e: any) => e.title === r.exam_title);
      const student = students.find((s: any) => s.id === r.student_id);
      const score = Number(r.score) || 0;
      const total = Number(r.max_score) || 0;
      const pct = total > 0 ? ((score / total) * 100).toFixed(1) : '—';
      rows.push([
        String(++idx), student?.name || '—', exam?.title || '—', exam?.subject || '—',
        String(score), String(total), pct !== '—' ? `${pct}%` : '—',
      ]);
    }
    if (rows.length === 0) {
      rows.push(['—', 'لا توجد نتائج', '—', '—', '—', '—', '—']);
    }
    openPrintWindow('تقرير الدرجات', headers, rows, cfg);
  };

  const printMonthlyIncome = async () => {
    const [payments, students] = await Promise.all([
      loadAll('payments'), loadAll('students'),
    ]);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const monthPayments = payments.filter((p: any) => {
      const d = p.date?.slice(0, 10);
      return d && d >= monthStart && d <= monthEnd;
    });
    const total = monthPayments.reduce((s: any, p: any) => s + Number(p.amount), 0);
    const active = students.filter((s: any) => s.status === 'active');
    const expected = active.reduce((s: any, st: any) => s + Number(st.monthly_fee), 0);
    const headers = ['البيان', 'القيمة'];
    const rows = [
      ['الشهر', now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })],
      ['الطلاب النشطين', String(active.length)],
      ['المتوقع', `${expected.toFixed(2)} ج`],
      ['المدفوع', `${total.toFixed(2)} ج`],
      ['المتبقي', `${(expected - total).toFixed(2)} ج`],
      ['عدد المعاملات', String(monthPayments.length)],
    ];
    openPrintWindow('تقرير الدخل الشهري', headers, rows, cfg);
  };

  const printBooks = async () => {
    const [books, deliveries] = await Promise.all([
      loadAll('books'), loadAll('book_deliveries'),
    ]);
    const headers = ['#', 'الكتاب', 'السعر', 'المخزون', 'تم التوزيع', 'إجمالي المبيعات', 'المدفوع'];
    const rows = books.map((b: any, i: number) => {
      const bDel = deliveries.filter((d: any) => d.book_title === b.title);
      const rev = bDel.reduce((s: any, d: any) => s + Number(d.total_price), 0);
      const paid = bDel.reduce((s: any, d: any) => s + Number(d.paid_amount || 0), 0);
      return [String(i + 1), b.title || '—', `${Number(b.selling_price || b.price || 0).toFixed(2)}`, String(Number(b.stock || 0)), String(bDel.length), `${rev.toFixed(2)}`, `${paid.toFixed(2)}`];
    });
    openPrintWindow('تقرير الكتب', headers, rows, cfg);
  };

  const printCustom = async () => {
    const [students, payments, deliveries, suppliers, exams] = await Promise.all([
      loadAll('students'), loadAll('payments'), loadAll('book_deliveries'), loadAll('suppliers'), loadAll('exams'),
    ]);
    const active = students.filter((s: any) => s.status === 'active');
    const totalPaid = payments.reduce((s: any, p: any) => s + Number(p.amount), 0);
    const bookRev = deliveries.reduce((s: any, d: any) => s + Number(d.total_price), 0);
    const headers = ['م', 'البيان', 'القيمة'];
    const rows = [
      ['1', 'إجمالي الطلاب', String(students.length)],
      ['2', 'الطلاب النشطين', String(active.length)],
      ['3', 'المجموعات', String([...new Set(students.map((s: any) => s.group_name).filter(Boolean))].length)],
      ['4', 'المواد', String([...new Set(exams.map((e: any) => e.subject).filter(Boolean))].length)],
      ['5', 'الموردين', String(suppliers.length)],
      ['6', 'المدفوعات الشهرية', `${totalPaid.toFixed(2)} ج`],
      ['7', 'إيرادات الكتب', `${bookRev.toFixed(2)} ج`],
      ['8', 'إجمالي التوزيعات', String(deliveries.length)],
    ];
    openPrintWindow('تقرير مخصص', headers, rows, cfg);
  };

  const existingReports = [
    { title: 'تقرير الطلاب الكلى', desc: 'قائمة بجميع الطلاب المسجلين', icon: <Users size={20} className="text-pink-600" />, color: 'bg-pink-50 border-pink-200', action: printAllStudents },
    { title: 'تقرير الغياب', desc: 'سجل الغياب الشهري للطلاب', icon: <Printer size={20} className="text-orange-600" />, color: 'bg-orange-50 border-orange-200', action: printAbsence },
    { title: 'تقرير الدرجات', desc: 'نتائج الاختبارات لجميع المراحل', icon: <BarChart3 size={20} className="text-blue-600" />, color: 'bg-blue-50 border-blue-200', action: printGrades },
    { title: 'تقرير الدخل الشهري', desc: 'إيرادات الشهر الحالي', icon: <DollarSign size={20} className="text-green-600" />, color: 'bg-green-50 border-green-200', action: printMonthlyIncome },
    { title: 'تقرير الكتب', desc: 'مخزون الكتب والمبيعات', icon: <BookOpen size={20} className="text-teal-600" />, color: 'bg-teal-50 border-teal-200', action: printBooks },
    { title: 'تقرير مخصص', desc: 'إحصائيات شاملة عن البرنامج', icon: <Printer size={20} className="text-purple-600" />, color: 'bg-purple-50 border-purple-200', action: printCustom },
  ];

  const newReports = [
    { title: 'تقرير المعلمين', desc: 'قائمة المعلمين والمواد التي يدرسها كل معلم', icon: <GraduationCap size={20} className="text-indigo-600" />, color: 'bg-indigo-50 border-indigo-200', action: printTeachers },
    { title: 'تقرير المجموعات', desc: 'المجموعات الدراسية مع المواد وعدد الطلاب', icon: <Users size={20} className="text-cyan-600" />, color: 'bg-cyan-50 border-cyan-200', action: printGroups },
    { title: 'تقرير المواد الدراسية', desc: 'المواد مع أسماء المعلمين وعدد الطلاب', icon: <BookOpen size={20} className="text-rose-600" />, color: 'bg-rose-50 border-rose-200', action: printSubjects },
    { title: 'كشف حساب الموردين', desc: 'الموردين والأرصدة والمعاملات', icon: <Truck size={20} className="text-amber-600" />, color: 'bg-amber-50 border-amber-200', action: printSuppliers },
    { title: 'الملخص المالي', desc: 'ملخص الإيرادات والمصروفات والديون', icon: <DollarSign size={20} className="text-emerald-600" />, color: 'bg-emerald-50 border-emerald-200', action: printFinancialSummary },
    { title: 'توزيع الكتب', desc: 'ملخص توزيع الكتب على الطلاب', icon: <ClipboardList size={20} className="text-violet-600" />, color: 'bg-violet-50 border-violet-200', action: printBookDeliveries },
    { title: 'إحصائيات الاختبارات', desc: 'إحصائيات الاختبارات الإلكترونية ونتائجها', icon: <BarChart3 size={20} className="text-sky-600" />, color: 'bg-sky-50 border-sky-200', action: printExamSummary },
    { title: 'تقرير المدفوعات', desc: 'سجل المدفوعات الشهرية للطلاب', icon: <CreditCard size={20} className="text-lime-600" />, color: 'bg-lime-50 border-lime-200', action: printPayments },
  ];

  return (
    <div className="fade-in space-y-6">
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="font-bold text-gray-800 mb-5">المطبوعات والتقارير</h2>

        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-3 font-semibold tracking-wide">التقارير الأساسية</p>
          <div className="grid grid-cols-3 gap-4">
            {existingReports.map((r, i) => (
              <div key={i} className={`border ${r.color} rounded-2xl p-5 hover:shadow-md transition-all`}>
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4">{r.icon}</div>
                <p className="font-bold text-gray-800 text-sm mb-1">{r.title}</p>
                <p className="text-xs text-gray-500 mb-4">{r.desc}</p>
                <button onClick={r.action} className="flex items-center gap-1.5 text-xs text-white bg-gray-800 hover:bg-gray-900 rounded-lg px-3 py-1.5 transition-colors"><Printer size={13} /> طباعة</button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-3 font-semibold tracking-wide">تقارير شاملة عن البرنامج</p>
          <div className="grid grid-cols-3 gap-4">
            {newReports.map((r, i) => (
              <div key={i} className={`border ${r.color} rounded-2xl p-5 hover:shadow-md transition-all`}>
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4">{r.icon}</div>
                <p className="font-bold text-gray-800 text-sm mb-1">{r.title}</p>
                <p className="text-xs text-gray-500 mb-4">{r.desc}</p>
                <div className="flex gap-2">
                  <button onClick={r.action} className="flex items-center gap-1.5 text-xs text-white bg-gray-800 hover:bg-gray-900 rounded-lg px-3 py-1.5 transition-colors"><Printer size={13} /> طباعة</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
