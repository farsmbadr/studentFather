import { useState, useEffect, useRef } from 'react';
import { ArrowRight, User, Edit2, Trash2, Printer, Sticker, FileText, ClipboardList, X, MessageCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import { printHeaderHtml, printFooterHtml, printHeaderStyle } from '../utils/printHeader';

interface Student {
  id: string; name: string; code: string; grade: string; gender: string; group_name: string;
  phone: string; parent_phone?: string; parent_name?: string; address?: string;
  status: string; monthly_fee: number; join_date: string; notes?: string;
  booking_deposit?: number; school?: string; division?: string; parent_job?: string;
  birth_date?: string; email?: string; photo_url?: string;
}
interface Payment { id: string; amount: number; date: string; received_by: string; }
interface ExamResult { id: string; exam_title: string; date: string; score: number; max_score: number; }
interface Absence { id: string; group_name: string; date: string; }
interface Note { id: string; note: string; date: string; }

export default function StudentProfile({ studentId, onBack, onEdit, onDelete }: { studentId: string; onBack: () => void; onEdit?: (id: string) => void; onDelete?: (id: string) => void }) {
  const { show } = useToast();
  const barcodeRef = useRef<HTMLCanvasElement>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [studentGroups, setStudentGroups] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [newAbsenceDate, setNewAbsenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAbsenceReason, setNewAbsenceReason] = useState('');
  const [centerName, setCenterName] = useState('CenterMasr');
  const [centerAddress, setCenterAddress] = useState('');
  const [centerPhone, setCenterPhone] = useState('');
  const [centerLogo, setCenterLogo] = useState('');
  const [bookDeliveries, setBookDeliveries] = useState<any[]>([]);

  const load = async () => {
    const { data: cfg } = await supabase.from('center_config').select('center_name,address,phone,logo').maybeSingle();
    if (cfg) { setCenterName(cfg.center_name || 'CenterMasr'); setCenterAddress(cfg.address || ''); setCenterPhone(cfg.phone || ''); setCenterLogo(cfg.logo || ''); }
    const { data: s } = await supabase.from('students').select('*').eq('id', studentId).maybeSingle();
    setStudent(s);
    if (!s) return;

    const { data: p } = await supabase.from('payments').select('*').eq('student_id', studentId).order('date', { ascending: false });
    setPayments(p || []);

    const { data: e } = await supabase.from('exam_results').select('*').eq('student_id', studentId).order('date', { ascending: false });
    setExams(e || []);

    const { data: a } = await supabase.from('absence_records').select('*').eq('student_id', studentId).order('date', { ascending: false });
    setAbsences(a || []);

    const { data: n } = await supabase.from('attendance_notes').select('*').eq('student_id', studentId).order('date', { ascending: false });
    setNotes(n || []);

    const { data: bd } = await supabase.from('book_deliveries').select('*').eq('student_id', studentId).order('delivery_date', { ascending: false });
    setBookDeliveries(bd || []);

    const { data: g } = await supabase.from('student_groups').select('*').eq('student_id', studentId);
    setStudentGroups((g || []).map((r: any) => r.group_name));

    const { data: ss } = await supabase.from('subject_students').select('subject_id').eq('student_id', studentId);
    if (ss && ss.length) {
      const subjectIds = [...new Set(ss.map((r: any) => r.subject_id))];
      const { data: subs } = await supabase.from('subjects').select('name');
      setSubjects((subs || []).filter((sub: any) => subjectIds.includes(sub.id)).map((sub: any) => sub.name));
    } else setSubjects([]);
  };

  useEffect(() => { load(); }, [studentId]);

  useEffect(() => {
    if (student && barcodeRef.current) {
      import('jsbarcode').then(m => {
        try { m.default(barcodeRef.current, student.code, { format: 'CODE128', width: 1.5, height: 40, displayValue: false, margin: 0 }); }
        catch {}
      });
    }
  }, [student]);

  if (!student) return <div className="text-center text-gray-400 py-20">جاري التحميل...</div>;

  const mainFields: [string, string | number][] = [
    ['الكود', student.code],
    ['النوع', student.gender],
    ['المرحلة', student.grade],
    ['المجموعة', student.group_name || '—'],
    ['المواد', subjects.length > 0 ? subjects.join(' - ') : '—'],
    ['الهاتف', student.phone],
    ['تاريخ الميلاد', student.birth_date ? student.birth_date.slice(0, 10).split('-').reverse().join('/') : '—'],
    ['ولي الأمر', student.parent_name || '—'],
    ['هاتف ولي الأمر', student.parent_phone || '—'],
    ['العنوان', student.address || '—'],
    ['تاريخ التقديم', new Date(student.join_date).toLocaleDateString('ar-EG')],
    ['مقدم الحجز', student.booking_deposit ? `${student.booking_deposit} ج` : '—'],
    ['الرسوم الشهرية', `${student.monthly_fee} ج`],
    ['المدرسة', student.school || '—'],
    ['الشعبة', student.division || '—'],
    ['وظيفة ولي الأمر', student.parent_job || '—'],
    ['الإيميل', student.email || '—'],
  ];
  if (student.notes) mainFields.push(['ملحوظات', student.notes]);

  const deleteNote = async (id: string) => {
    await supabase.from('attendance_notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
    show('تم حذف الملحوظة');
  };

  const sendWhatsApp = async (text: string) => {
    const phone = student.parent_phone || student.phone;
    if (!phone) return show('لا يوجد رقم هاتف للطالب', 'error');
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/2${phone.replace(/^0/, '')}?text=${encoded}`, '_blank');
  };

  const sendProfileToWhatsApp = async () => {
    const phone = student.parent_phone || student.phone;
    if (!phone) return show('لا يوجد رقم هاتف للطالب', 'error');
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير ${student.name}</title>
      <style>
        @page { margin: 8mm; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 12px; }
        .doc { max-width: 500px; margin: 0 auto; background: white; border-radius: 14px; box-shadow: 0 8px 40px rgba(0,0,0,0.12); overflow: hidden; }
        .hdr { background: #1e3a5f; color: white; text-align: center; padding: 16px; }
        .hdr h2 { margin: 0; font-size: 17px; }
        .hdr p { margin: 3px 0 0; font-size: 10px; opacity: 0.8; }
        .body { padding: 14px 16px; }
        .sec { margin-bottom: 16px; }
        .sec-title { font-size: 12px; font-weight: bold; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 5px; margin-bottom: 8px; }
        .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #eee; font-size: 11px; }
        .row .lbl { color: #888; }
        .row .val { font-weight: bold; color: #333; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #f0f2f5; padding: 6px; border: 1px solid #ddd; font-size: 10px; color: #555; }
        .empty { text-align: center; color: #bbb; font-size: 11px; padding: 16px 0; }
        .foot { text-align: center; padding: 10px; font-size: 8px; color: #aaa; border-top: 1px solid #eee; }
      </style></head><body>
      <div class="doc">
        <div class="hdr"><h2>${centerName}</h2><p>${centerAddress}${centerPhone ? ' | ' + centerPhone : ''}</p></div>
        <div class="body">
          <div class="sec"><div class="sec-title">بيانات الطالب</div>
            ${mainFields.map(([l, v]) => `<div class="row"><span class="lbl">${l}</span><span class="val">${v}</span></div>`).join('')}
          </div>
          ${studentGroups.length || student.group_name ? `<div class="sec"><div class="sec-title">المجموعات</div>
            <table><thead><tr><th style="width:30px">#</th><th>المجموعة</th></tr></thead>
            <tbody>${(studentGroups.length ? studentGroups : [student.group_name]).map((g, i) => `<tr><td style="text-align:center;padding:5px;border:1px solid #ddd">${i+1}</td><td style="padding:5px;border:1px solid #ddd">${g}</td></tr>`).join('')}</tbody></table>
          </div>` : ''}
          ${payments.length ? `<div class="sec"><div class="sec-title">المدفوعات (الإجمالي: ${totalPaid.toLocaleString()} ج)${totalOutstanding > 0 ? ` - إجمالي المتأخر: ${totalOutstanding} ج` : ''}</div>
            <table><thead><tr><th style="width:30px">#</th><th>المبلغ</th><th>التاريخ</th><th>المستلم</th></tr></thead>
            <tbody>${payments.map((p, i) => `<tr><td style="text-align:center;padding:5px;border:1px solid #ddd">${i+1}</td><td style="text-align:center;padding:5px;border:1px solid #ddd;font-weight:bold;color:#2e7d32">${Number(p.amount).toLocaleString()} ج</td><td style="text-align:center;padding:5px;border:1px solid #ddd">${p.date ? p.date.split('T')[0] : '—'}</td><td style="text-align:center;padding:5px;border:1px solid #ddd">${p.received_by || '—'}</td></tr>`).join('')}</tbody></table>
          </div>` : ''}
          ${exams.length ? `<div class="sec"><div class="sec-title">نتائج الامتحانات</div>
            <table><thead><tr><th style="width:30px">#</th><th>الامتحان</th><th>الدرجة</th><th>التاريخ</th></tr></thead>
            <tbody>${exams.map((e, i) => `<tr><td style="text-align:center;padding:5px;border:1px solid #ddd">${i+1}</td><td style="padding:5px;border:1px solid #ddd">${e.exam_title}</td><td style="text-align:center;padding:5px;border:1px solid #ddd;font-weight:bold">${e.score}/${e.max_score}</td><td style="text-align:center;padding:5px;border:1px solid #ddd">${e.date ? e.date.split('T')[0] : '—'}</td></tr>`).join('')}</tbody></table>
          </div>` : ''}
          ${absences.length ? `<div class="sec"><div class="sec-title">سجل الغياب (${absences.length} غياب)</div>
            <table><thead><tr><th style="width:30px">#</th><th>التاريخ</th><th>المجموعة</th></tr></thead>
            <tbody>${absences.map((a, i) => `<tr><td style="text-align:center;padding:5px;border:1px solid #ddd">${i+1}</td><td style="text-align:center;padding:5px;border:1px solid #ddd">${a.date ? a.date.split('T')[0] : '—'}</td><td style="text-align:center;padding:5px;border:1px solid #ddd">${a.group_name || '—'}</td></tr>`).join('')}</tbody></table>
          </div>` : ''}
          ${notes.length ? `<div class="sec"><div class="sec-title">الملحوظات</div>
            <table><thead><tr><th style="width:30px">#</th><th>الملحوظة</th><th>التاريخ</th></tr></thead>
            <tbody>${notes.map((n, i) => `<tr><td style="text-align:center;padding:5px;border:1px solid #ddd">${i+1}</td><td style="padding:5px;border:1px solid #ddd">${n.note || '—'}</td><td style="text-align:center;padding:5px;border:1px solid #ddd">${n.date ? n.date.split('T')[0] : '—'}</td></tr>`).join('')}</tbody></table>
          </div>` : ''}
        </div>
        <div class="foot">تم التصدير عن طريق CenterMasr لإدارة السناتر | 01008667306</div>
      </div></body></html>`;
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const file = new File([blob], 'student-profile.html', { type: 'text/html' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `تقرير ${student.name}` });
        return;
      }
    } catch {}
    const encoded = encodeURIComponent(mainFields.map(([l, v]) => `${l}: ${v}`).join('\n') +
      `\n\n---\nإجمالي المدفوعات: ${totalPaid.toLocaleString()} ج` +
      `${totalOutstanding > 0 ? `\nإجمالي المتأخر: ${totalOutstanding} ج` : '\nمدفوع بالكامل ✓'}` +
      `\nالغياب: ${absences.length} يوم\nالامتحانات: ${exams.length}\nالملحوظات: ${notes.length}`);
    window.open(`https://wa.me/2${phone.replace(/^0/, '')}?text=${encoded}`, '_blank');
  };

  const saveAbsence = async () => {
    if (!newAbsenceDate) return show('الرجاء اختيار التاريخ', 'error');
    await supabase.from('absence_records').insert({
      student_id: student.id,
      student_name: student.name,
      student_code: student.code,
      group_name: student.group_name || '',
      grade: student.grade,
      date: newAbsenceDate,
      reason: newAbsenceReason,
    });
    await supabase.from('notifications').insert({ title: 'تسجيل غياب', message: `تم تسجيل غياب ${student.name}`, target: 'all', is_read: false });
    show('تم تسجيل الغياب');
    setShowAbsenceModal(false);
    setNewAbsenceReason('');
    setNewAbsenceDate(new Date().toISOString().split('T')[0]);
    load();
  };

  const printReport = () => {
    const w = window.open('', '_blank');
    if (!w) return show('الرجاء السماح بالنوافذ المنبثقة', 'error');
    const payStatus = totalOutstanding > 0 ? `إجمالي المتأخر ${totalOutstanding} ج` : 'مدفوع بالكامل ✓';
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>تقرير ${student.name}</title>
      <style>
        @page { size: A4 portrait; margin: 5mm; }
        * { font-family: 'Traditional Arabic', 'Arabic Typesetting', Arial, sans-serif; }
        body { }
        ${printHeaderStyle()}
        .content { padding: 6mm 5mm; }
        h2 { text-align: center; font-size: 16pt; color: #1e3a5f; margin: 0 0 10px; }
        .info-table { width: 100%; border-collapse: collapse; font-size: 12pt; margin-bottom: 12px; }
        .info-table th { background: #1e3a5f; color: white; padding: 5px 8px; text-align: right; font-weight: bold; }
        .info-table td { padding: 4px 8px; border-bottom: 1px solid #ddd; font-weight: 600; }
        .info-table tr:nth-child(even) td { background: #f8f9fa; }
        .info-table td:first-child { color: #666; font-weight: 400; width: 35%; }
        .section-title { font-size: 13pt; font-weight: bold; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 3px; margin: 14px 0 6px; }
        table.data-table { width: 100%; border-collapse: collapse; font-size: 12pt; }
        table.data-table th { background: #eef2f7; padding: 4px 6px; border: 1px solid #ccc; text-align: center; font-weight: bold; }
        table.data-table td { padding: 3px 6px; border: 1px solid #ddd; text-align: center; }
        .status-badge { display: inline-block; padding: 0 6px; border-radius: 10px; font-weight: bold; font-size: 12pt; background: #e8f5e9; color: #2e7d32; }
        .status-badge.partial { background: #fff3e0; color: #e65100; }
        .status-badge.unpaid { background: #ffebee; color: #c62828; }
      </style></head><body>
      ${printHeaderHtml({ center_name: centerName, address: centerAddress, phone: centerPhone, logo: centerLogo })}
      <div class="content">
        <h2>تقرير ${student.name}</h2>
        <table class="info-table">
          <tr><td>الكود</td><td>${student.code}</td></tr>
          <tr><td>الاسم</td><td>${student.name}</td></tr>
          <tr><td>النوع</td><td>${student.gender}</td></tr>
          <tr><td>المرحلة</td><td>${student.grade}</td></tr>
          <tr><td>المجموعة</td><td>${student.group_name || '—'}</td></tr>
          <tr><td>المواد</td><td>${subjects.length > 0 ? subjects.join(' - ') : '—'}</td></tr>
          <tr><td>الهاتف</td><td style="direction:ltr;text-align:left">${student.phone}</td></tr>
          <tr><td>تاريخ الميلاد</td><td>${student.birth_date ? student.birth_date.slice(0, 10).split('-').reverse().join('/') : '—'}</td></tr>
          <tr><td>ولي الأمر</td><td>${student.parent_name || '—'}</td></tr>
          <tr><td>هاتف ولي الأمر</td><td style="direction:ltr;text-align:left">${student.parent_phone || '—'}</td></tr>
          <tr><td>العنوان</td><td>${student.address || '—'}</td></tr>
          <tr><td>المدرسة</td><td>${student.school || '—'}</td></tr>
          <tr><td>الشعبة</td><td>${student.division || '—'}</td></tr>
          <tr><td>تاريخ التقديم</td><td>${new Date(student.join_date).toLocaleDateString('ar-EG')}</td></tr>
          <tr><td>الرسوم الشهرية</td><td>${fee} ج</td></tr>
          <tr><td>المدفوع هذا الشهر</td><td>${thisMonthPaid.toLocaleString()} ج</td></tr>
          <tr><td>حالة المصروفات</td><td>${payStatus}</td></tr>
        </table>
        ${payments.length ? `<div class="section-title">سجل المدفوعات</div>
          <table class="data-table"><thead><tr><th>#</th><th>المبلغ</th><th>التاريخ</th><th>المستلم</th></tr></thead>
          <tbody>${payments.map((p, i) => `<tr><td>${i+1}</td><td style="font-weight:bold;color:#2e7d32">${Number(p.amount).toLocaleString()} ج</td><td>${p.date ? p.date.split('T')[0] : '—'}</td><td>${p.received_by || '—'}</td></tr>`).join('')}</tbody></table>` : ''}
        ${exams.length ? `<div class="section-title">نتائج الامتحانات</div>
          <table class="data-table"><thead><tr><th>#</th><th>الامتحان</th><th>الدرجة</th><th>التاريخ</th></tr></thead>
          <tbody>${exams.map((e, i) => `<tr><td>${i+1}</td><td>${e.exam_title}</td><td style="font-weight:bold">${e.score}/${e.max_score}</td><td>${e.date ? e.date.split('T')[0] : '—'}</td></tr>`).join('')}</tbody></table>` : ''}
        ${absences.length ? `<div class="section-title">سجل الغياب (${absences.length})</div>
          <table class="data-table"><thead><tr><th>#</th><th>التاريخ</th><th>المجموعة</th></tr></thead>
          <tbody>${absences.map((a, i) => `<tr><td>${i+1}</td><td>${a.date ? a.date.split('T')[0] : '—'}</td><td>${a.group_name || '—'}</td></tr>`).join('')}</tbody></table>` : ''}
        ${notes.length ? `<div class="section-title">الملحوظات</div>
          <table class="data-table"><thead><tr><th>#</th><th>الملحوظة</th><th>التاريخ</th></tr></thead>
          <tbody>${notes.map((n, i) => `<tr><td>${i+1}</td><td>${n.note || ''}</td><td>${n.date ? n.date.split('T')[0] : '—'}</td></tr>`).join('')}</tbody></table>` : ''}
      </div>
      ${printFooterHtml()}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); w.close(); }, 500);
  };

  const joinDate = new Date(student.join_date);
  const now = new Date();

  // Build per-month fee breakdown (chronological allocation: pay oldest debt first)
  const fee = Number(student.monthly_fee) || 0;
  const sortedPayments = [...payments].filter(p => p.date).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const months: { key: string; label: string; expected: number; paid: number; remaining: number }[] = [];
  let y = joinDate.getFullYear();
  let m = joinDate.getMonth();
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
    const isFirst = y === joinDate.getFullYear() && m === joinDate.getMonth();
    const startRemaining = fee - (isFirst ? Number(student.booking_deposit || 0) : 0);
    months.push({ key: `${y}-${String(m + 1).padStart(2, '0')}`, label: `${String(m + 1).padStart(2, '0')}/${y}`, expected: fee, paid: isFirst ? Math.min(Number(student.booking_deposit || 0), fee) : 0, remaining: Math.max(0, startRemaining) });
    m++; if (m > 11) { m = 0; y++; }
  }
  for (const p of sortedPayments) {
    let amt = Number(p.amount);
    for (const mo of months) {
      if (amt <= 0) break;
      if (mo.remaining > 0) {
        const payNow = Math.min(amt, mo.remaining);
        mo.paid += payNow;
        mo.remaining -= payNow;
        amt -= payNow;
      }
    }
  }
  const feeBreakdown = months.filter(mo => mo.remaining > 0);
  let totalFeeDebt = months.reduce((sum, mo) => sum + mo.remaining, 0);
  // Book debt
  let bookDebt = 0;
  for (const bd of bookDeliveries) bookDebt += Number(bd.remaining || 0);
  const totalOutstanding = totalFeeDebt + bookDebt;

  const thisMonthPayments = payments.filter(p => {
    const d = new Date(p.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const thisMonthPaid = thisMonthPayments.reduce((s, p) => s + Number(p.amount), 0);
  const monthBalance = Math.max(0, fee - thisMonthPaid);

  const printBarcode = async () => {
    const w = window.open('', '_blank');
    if (!w) return show('الرجاء السماح بالنوافذ المنبثقة', 'error');
    const canvas = document.createElement('canvas');
    try {
      const JsBarcode = (await import('jsbarcode')).default;
      JsBarcode(canvas, student.code, { format: 'CODE128', width: 2, height: 60, displayValue: false, margin: 0 });
    } catch {}
    const barcodeData = canvas.toDataURL('image/png');
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>بطاقة الطالب - ${student.name}</title>
      <style>
        @page { margin: 10mm; size: auto; }
        body { margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f0f0f0; }
        .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); padding: 30px 40px; text-align: center; width: 320px; margin: 0 auto; }
        .logo-bar { background: #1e3a5f; color: white; padding: 10px 20px; border-radius: 10px; font-size: 14pt; font-weight: bold; margin-bottom: 20px; display:flex;align-items:center;justify-content:center;gap:8px; }
        .logo-bar img { height: 28px; width: auto; }
        .name { font-size: 24pt; font-weight: bold; color: #1e3a5f; margin-bottom: 15px; }
        .info-row { display: flex; justify-content: center; gap: 20px; font-size: 14pt; color: #555; margin-bottom: 8px; }
        .info-row span { background: #f5f7fa; padding: 4px 12px; border-radius: 20px; }
        .barcode-wrap { background: white; padding: 10px; border-radius: 8px; margin: 15px 0; }
        .barcode-wrap img { width: 100%; max-width: 240px; }
        .code { font-size: 16pt; color: #1e3a5f; font-weight: bold; letter-spacing: 2px; direction: ltr; }
        .footer { font-size: 11pt; color: #aaa; margin-top: 12px; }
      </style></head><body>
      <div class="card">
      <div class="logo-bar">${centerLogo ? `<img src="${centerLogo}" alt="logo"/>` : ''}${centerName}</div>
      <div class="name">${student.name}</div>
      <div class="info-row"><span>${student.grade}</span><span>${student.group_name || '—'}</span></div>
      <div class="barcode-wrap"><img src="${barcodeData}" alt="barcode" /></div>
      <div class="code">${student.code}</div>
      <div class="footer">${centerName} © ${new Date().getFullYear()}</div>
      </div>${printFooterHtml()}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 500);
  };

  const printAdmissionDoc = () => {
    const w = window.open('', '_blank');
    if (!w) return show('الرجاء السماح بالنوافذ المنبثقة', 'error');
    const bd = student.birth_date ? student.birth_date.slice(0, 10).split('-').reverse().join(' / ') : '—';
    const jd = new Date(student.join_date).toLocaleDateString('ar-EG');
    const sh = student.school || '—';
    const di = student.division || '—';
    const pj = student.parent_job || '—';
    const em = student.email || '—';
    const ad = student.address || '—';
    const pn = student.parent_name || '—';
    const pp = student.parent_phone || '—';
    const bkd = student.booking_deposit ? `${student.booking_deposit} ج` : '—';
    const mf = `${student.monthly_fee} ج`;
    const gender = student.gender === 'ذكر' ? 'ذكر' : 'أنثى';

    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>وثيقة التقديم - ${student.name}</title>
      <style>
        @page { size: A4; margin: 5mm; }
        body { margin: 0; padding: 0; font-family: 'Traditional Arabic', 'Arabic Typesetting', Arial, sans-serif; color: #222; background: #fff; }
        ${printHeaderStyle()}
        .doc { max-width: 170mm; margin: 0 auto; }
        .doc-title { text-align: center; font-size: 18pt; font-weight: bold; color: #1e3a5f; margin: 20px 0; padding: 8px 0; border-bottom: 2px solid #1e3a5f; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 30px; margin: 16px 0; }
        .info-row { display: flex; align-items: baseline; border-bottom: 1px dotted #ddd; padding: 6px 0; }
        .info-row .label { min-width: 90px; font-size: 14pt; color: #1e3a5f; font-weight: bold; }
        .info-row .value { font-size: 14pt; color: #222; }
        .barcode-wrap { text-align: center; margin: 20px 0 10px; }
        .barcode-wrap img { max-width: 220px; }
        .code-text { text-align: center; font-size: 14pt; font-weight: bold; color: #1e3a5f; letter-spacing: 3px; direction: ltr; margin-top: 4px; }
        .terms { margin-top: 25px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 12pt; color: #555; line-height: 1.8; }
        .terms h3 { font-size: 14pt; color: #1e3a5f; margin: 0 0 8px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; }
        .signature { text-align: center; min-width: 120px; }
        .signature .line { width: 140px; height: 1px; border-top: 1px solid #333; margin: 30px auto 6px; }
        .signature .label { font-size: 13pt; color: #555; }
        .footer-note { text-align: center; font-size: 12pt; color: #999; margin-top: 25px; border-top: 1px solid #eee; padding-top: 10px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      ${printHeaderHtml({ center_name: centerName, address: centerAddress, phone: centerPhone, logo: centerLogo })}
      <div class="doc">
        <div class="doc-title">وثيقة تقديم طالب</div>
        <div class="info-grid">
          <div class="info-row"><span class="label">الاسم</span><span class="value">${student.name}</span></div>
          <div class="info-row"><span class="label">الكود</span><span class="value dir-ltr" style="direction:ltr;text-align:left;font-family:monospace">${student.code}</span></div>
          <div class="info-row"><span class="label">النوع</span><span class="value">${gender}</span></div>
          <div class="info-row"><span class="label">تاريخ الميلاد</span><span class="value">${bd}</span></div>
          <div class="info-row"><span class="label">المرحلة</span><span class="value">${student.grade}</span></div>
          <div class="info-row"><span class="label">المجموعة</span><span class="value">${student.group_name || '—'}</span></div>
          <div class="info-row"><span class="label">المدرسة</span><span class="value">${sh}</span></div>
          <div class="info-row"><span class="label">الشعبة</span><span class="value">${di}</span></div>
          <div class="info-row"><span class="label">هاتف الطالب</span><span class="value">${student.phone}</span></div>
          <div class="info-row"><span class="label">الإيميل</span><span class="value">${em}</span></div>
          <div class="info-row"><span class="label">العنوان</span><span class="value">${ad}</span></div>
          <div class="info-row"><span class="label">تاريخ التقديم</span><span class="value">${jd}</span></div>
        </div>
        <div style="border-top:2px solid #1e3a5f;margin:16px 0"></div>
        <div class="info-grid">
          <div class="info-row"><span class="label">ولي الأمر</span><span class="value">${pn}</span></div>
          <div class="info-row"><span class="label">هاتف ولي الأمر</span><span class="value">${pp}</span></div>
          <div class="info-row"><span class="label">وظيفة ولي الأمر</span><span class="value">${pj}</span></div>
          <div class="info-row"><span class="label">الرسوم الشهرية</span><span class="value">${mf}</span></div>
          <div class="info-row"><span class="label">مقدم الحجز</span><span class="value">${bkd}</span></div>
          <div class="info-row"><span class="label">ملحوظات</span><span class="value">${student.notes || '—'}</span></div>
        </div>
        <div class="terms">
          <h3>الشروط والأحكام</h3>
          <p>١. يلتزم ولي الأمر بسداد الرسوم الدراسية في مواعيدها المحددة.</p>
          <p>٢. في حالة انسحاب الطالب بعد بدء الدراسة لا تسترد الرسوم المدفوعة.</p>
          <p>٣. يحق للمركز فصل الطالب في حالة عدم الالتزام بقواعد النظام والانضباط.</p>
          <p>٤. يقر ولي الأمر بصحة البيانات المدونة أعلاه.</p>
        </div>
        <div class="signatures">
          <div class="signature"><div class="line"></div><span class="label">توقيع ولي الأمر</span></div>
          <div class="signature"><div class="line"></div><span class="label">توقيع إدارة السنتر</span></div>
        </div>
        <div class="footer-note">${centerName} © ${new Date().getFullYear()} - جميع الحقوق محفوظة</div>
      </div>${printFooterHtml()}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 500);
  };

  return (
    <div className="fade-in max-w-6xl mx-auto profile-print">
      <style>{`@media print{@page{margin:22mm 3mm 12mm 3mm}aside,nav,header{display:none!important}.profile-print{margin:0!important;max-width:100%!important}.profile-print .no-print{display:none!important}body{background:white!important}}`}</style>
      <button onClick={onBack} className="no-print flex items-center gap-1.5 text-sm text-pink-500 hover:text-pink-600 mb-4 transition-colors">
        <ArrowRight size={16} /> عودة
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-l from-pink-500 to-rose-500 p-6 text-white text-center">
              <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-3">
                <User size={32} className="text-white" />
              </div>
              <h2 className="text-lg font-bold">{student.name}</h2>
              <canvas ref={barcodeRef} className="mx-auto mt-2 bg-white rounded p-1" />
              <span className="text-xs text-white/70 mt-1 block">{student.code}</span>
            </div>
            <div className="p-5 space-y-3">
              {mainFields.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-semibold text-gray-800 text-left">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">📚 المجموعات (عدد {(studentGroups.length > 0 ? studentGroups : [student.group_name].filter(Boolean)).length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-gray-500 text-xs">
                  <th className="text-right py-2 px-2 w-10">#</th>
                  <th className="text-right py-2 px-2">المجموعة</th>
                </tr></thead>
                <tbody>
                  {(studentGroups.length > 0 ? studentGroups : [student.group_name].filter(Boolean)).map((g, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 px-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-2 px-2 text-gray-700">{g}</td>
                    </tr>
                  ))}
                  {(!studentGroups.length && !student.group_name) && <tr><td colSpan={2} className="py-4 text-center text-gray-300 text-xs">لا توجد مجموعات</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
              💰 سجل المدفوعات
              {totalOutstanding > 0
                ? <span className="mr-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">إجمالي المتأخر {totalOutstanding} ج</span>
                : <span className="mr-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">مدفوع بالكامل ✓</span>
              }
            </h3>

            {/* Fee breakdown bar */}
            {(feeBreakdown.length > 0 || bookDebt > 0) && (
              <div className="border rounded-xl p-3 mb-3 text-xs space-y-2 bg-gradient-to-br from-gray-50 to-white">
                <p className="font-bold text-gray-700 mb-1">📊 تفصيل المتأخرات:</p>
                {feeBreakdown.map((fb) => (
                  <div key={fb.key} className="flex items-center justify-between py-0.5">
                    <span className="text-gray-600">شهر {fb.label}</span>
                    <span className="text-red-600 font-semibold">{fb.remaining} ج</span>
                  </div>
                ))}
                {bookDebt > 0 && (
                  <div className="flex items-center justify-between py-0.5 border-t border-gray-200 pt-1.5 mt-1">
                    <span className="text-gray-600">الكتب والملزمات</span>
                    <span className="text-red-600 font-semibold">{bookDebt} ج</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-0.5 border-t border-amber-200 pt-1.5 mt-1 font-bold">
                  <span className="text-amber-800">الإجمالي</span>
                  <span className="text-amber-800">{totalOutstanding} ج</span>
                </div>
              </div>
            )}

            {student.monthly_fee ? (
              <div className={`border rounded-lg px-3 py-2 mb-3 text-xs ${totalOutstanding > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                {totalOutstanding > 0 ? `إجمالي المتأخر ${totalOutstanding} ج` : `تم دفع ${fee} ج بالكامل ✓`}
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-gray-500 text-xs">
                  <th className="text-right py-2 px-2 w-10">#</th>
                  <th className="text-right py-2 px-2">المبلغ</th>
                  <th className="text-right py-2 px-2">التاريخ</th>
                  <th className="text-right py-2 px-2">المستلم</th>
                </tr></thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={p.id} className="border-b border-gray-50">
                      <td className="py-2 px-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-2 px-2 text-green-700 font-semibold">{p.amount} ج</td>
                      <td className="py-2 px-2 text-gray-600">{new Date(p.date).toLocaleDateString('ar-EG')}</td>
                      <td className="py-2 px-2 text-gray-600">{p.received_by || '—'}</td>
                    </tr>
                  ))}
                  {!payments.length && <tr><td colSpan={4} className="py-4 text-center text-gray-300 text-xs">لا توجد مدفوعات</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">📝 سجل الدرجات (المتوسط {exams.length ? Math.round(exams.reduce((s, e) => s + (e.max_score ? (Number(e.score) / Number(e.max_score)) * 100 : 0), 0) / exams.length) : 0}%)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-gray-500 text-xs">
                  <th className="text-right py-2 px-2 w-10">#</th>
                  <th className="text-right py-2 px-2">الاختبار</th>
                  <th className="text-right py-2 px-2">التاريخ</th>
                  <th className="text-right py-2 px-2">الدرجة</th>
                  <th className="text-right py-2 px-2">الدرجة الكلية</th>
                  <th className="text-right py-2 px-2">النسبة</th>
                </tr></thead>
                <tbody>
                  {exams.map((e, i) => (
                    <tr key={e.id} className="border-b border-gray-50">
                      <td className="py-2 px-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-2 px-2 text-gray-700 font-semibold">{e.exam_title}</td>
                      <td className="py-2 px-2 text-gray-500 text-xs">{new Date(e.date).toLocaleDateString('ar-EG')}</td>
                      <td className={`py-2 px-2 font-bold ${Number(e.score) >= Number(e.max_score) * 0.5 ? 'text-green-600' : 'text-red-600'}`}>{e.score}</td>
                      <td className="py-2 px-2 text-gray-600">{e.max_score}</td>
                      <td className="py-2 px-2 font-semibold text-gray-700">{e.max_score ? Math.round((Number(e.score) / Number(e.max_score)) * 100) : 0}%</td>
                    </tr>
                  ))}
                  {!exams.length && <tr><td colSpan={6} className="py-4 text-center text-gray-300 text-xs">لا توجد درجات</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">🚫 سجل الغياب (إجمالي {absences.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-gray-500 text-xs">
                  <th className="text-right py-2 px-2 w-10">#</th>
                  <th className="text-right py-2 px-2">المجموعة</th>
                  <th className="text-right py-2 px-2">التاريخ</th>
                </tr></thead>
                <tbody>
                  {absences.map((a, i) => (
                    <tr key={a.id} className="border-b border-gray-50">
                      <td className="py-2 px-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-2 px-2 text-gray-700">{a.group_name || student.group_name || '—'}</td>
                      <td className="py-2 px-2 text-gray-500 text-xs">{new Date(a.date).toLocaleDateString('ar-EG')}</td>
                    </tr>
                  ))}
                  {!absences.length && <tr><td colSpan={3} className="py-4 text-center text-gray-300 text-xs">لا توجد غيابات</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">📋 ملحوظات حضور الطالب</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-gray-500 text-xs">
                  <th className="text-right py-2 px-2">الملحوظة</th>
                  <th className="text-right py-2 px-2">التاريخ</th>
                  <th className="text-right py-2 px-2">خيارات</th>
                </tr></thead>
                <tbody>
                  {notes.map(n => (
                    <tr key={n.id} className="border-b border-gray-50">
                      <td className="py-2 px-2 text-gray-700">{n.note}</td>
                      <td className="py-2 px-2 text-gray-500 text-xs">{new Date(n.date).toLocaleDateString('ar-EG')}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => deleteNote(n.id)} title="حذف"
                            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                          <button onClick={() => sendWhatsApp(n.note)} title="إرسال واتساب"
                            className="p-1 rounded text-green-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!notes.length && <tr><td colSpan={3} className="py-4 text-center text-gray-300 text-xs">لا توجد ملحوظات</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">📖 الكتب والملزمات (مدفوع {bookDeliveries.reduce((s, d) => s + Number(d.paid_amount || 0), 0)} ج - باقي {bookDeliveries.reduce((s, d) => s + Number(d.remaining || 0), 0)} ج)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-gray-500 text-xs">
                  <th className="text-right py-2 px-2 w-10">#</th>
                  <th className="text-right py-2 px-2">الكتاب</th>
                  <th className="text-center py-2 px-2">النوع</th>
                  <th className="text-center py-2 px-2">السعر</th>
                  <th className="text-center py-2 px-2">المدفوع</th>
                  <th className="text-center py-2 px-2">المتبقي</th>
                  <th className="text-center py-2 px-2">التاريخ</th>
                </tr></thead>
                <tbody>
                  {bookDeliveries.map((d: any, i: number) => {
                    const rem = Number(d.remaining || (Number(d.total_price || 0) - Number(d.paid_amount || 0)));
                    return (
                      <tr key={d.id} className="border-b border-gray-50">
                        <td className="py-2 px-2 text-gray-400 text-xs">{i + 1}</td>
                        <td className="py-2 px-2 text-gray-700 font-semibold">{d.book_title}</td>
                        <td className="text-center py-2 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.delivery_type === 'مجانى' ? 'bg-green-100 text-green-700' : d.delivery_type === 'حجز' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{d.delivery_type || 'بيع'}</span>
                        </td>
                        <td className="text-center py-2 px-2">{Number(d.price_per_unit).toLocaleString()} ج</td>
                        <td className="text-center py-2 px-2 text-green-600 font-semibold">{Number(d.paid_amount || 0).toLocaleString()} ج</td>
                        <td className="text-center py-2 px-2 font-bold">
                          {rem > 0
                            ? <span className="text-red-500">باقي {rem.toLocaleString()} ج</span>
                            : d.delivery_type === 'مجانى'
                            ? <span className="text-green-600 text-xs">مجانى</span>
                            : <span className="text-green-600 text-xs">تم ✓</span>
                          }
                        </td>
                        <td className="text-center py-2 px-2 text-gray-500 text-xs">{d.delivery_date?.slice(0, 10) || '—'}</td>
                      </tr>
                    );
                  })}
                  {!bookDeliveries.length && <tr><td colSpan={7} className="py-4 text-center text-gray-300 text-xs">لا توجد كتب أو ملزمات</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {showAbsenceModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAbsenceModal(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-800">تسجيل غياب - {student.name}</h3>
                  <button onClick={() => setShowAbsenceModal(false)}><X size={18} className="text-gray-400" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">التاريخ</label>
                    <input type="date" value={newAbsenceDate} onChange={e => setNewAbsenceDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">السبب (اختياري)</label>
                    <textarea value={newAbsenceReason} onChange={e => setNewAbsenceReason(e.target.value)} rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setShowAbsenceModal(false)}
                      className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
                    <button onClick={saveAbsence}
                      className="px-5 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600">تسجيل الغياب</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-7 gap-1.5 no-print">
            <button onClick={() => onEdit?.(studentId)}
              className="flex items-center justify-center gap-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-1 py-2 text-[11px] font-semibold transition-all shadow-sm">
              <Edit2 size={13} /> تعديل
            </button>
            <button onClick={() => onDelete?.(studentId)}
              className="flex items-center justify-center gap-1 bg-red-500 hover:bg-red-600 text-white rounded-xl px-1 py-2 text-[11px] font-semibold transition-all shadow-sm">
              <Trash2 size={13} /> حذف
            </button>
            <button onClick={printReport}
              className="flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-800 text-white rounded-xl px-1 py-2 text-[11px] font-semibold transition-all shadow-sm">
              <Printer size={13} /> تقرير
            </button>
            <button onClick={printBarcode}
              className="flex items-center justify-center gap-1 bg-purple-500 hover:bg-purple-600 text-white rounded-xl px-1 py-2 text-[11px] font-semibold transition-all shadow-sm">
              <Sticker size={13} /> ملصق
            </button>
            <button onClick={printAdmissionDoc}
              className="flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-1 py-2 text-[11px] font-semibold transition-all shadow-sm">
              <FileText size={13} /> وثيقة
            </button>
            <button onClick={sendProfileToWhatsApp}
              className="flex items-center justify-center gap-1 text-white rounded-xl px-1 py-2 text-[11px] font-semibold transition-all shadow-sm"
              style={{ backgroundColor: '#25D366' }}>
              <MessageCircle size={13} /> واتساب
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
