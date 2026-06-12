import { useState, useEffect, useMemo } from 'react';
import { AlertCircle, Download, Printer, RefreshCw, Eye, MessageCircle, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { printHeaderHtml, printHeaderStyle } from '../utils/printHeader';

export default function LatePayers({ onViewStudent }: { onViewStudent?: (id: string) => void }) {
  const [allActive, setAllActive] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [filterMonth, setFilterMonth] = useState(defaultMonth);
  const [filterGrade, setFilterGrade] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [grades, setGrades] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    const [stuRes, payRes, grdRes] = await Promise.all([
      supabase.from('students').select('*').eq('status', 'active'),
      supabase.from('payments').select('*'),
      supabase.from('grades').select('name').order('name'),
    ]);
    setAllActive(stuRes.data || []);
    setAllPayments(payRes.data || []);
    setGrades((grdRes.data || []).map((g: any) => g.name));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const groups = useMemo(() => [...new Set(allActive.map(s => s.group_name).filter(Boolean))].sort() as string[], [allActive]);

  const lateStudents = useMemo(() => {
    const [year, month] = filterMonth.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10);
    const monthPayers = new Set(
      allPayments.filter((p: any) => {
        const d = p.date?.slice(0, 10);
        return d && d >= monthStart && d <= monthEnd;
      }).map((p: any) => p.student_id)
    );
    let list = allActive.filter((s: any) => !monthPayers.has(s.id) && Number(s.monthly_fee) > 0);
    if (filterGrade) list = list.filter((s: any) => s.grade === filterGrade);
    if (filterGroup) list = list.filter((s: any) => s.group_name === filterGroup);
    return list;
  }, [allActive, allPayments, filterMonth, filterGrade, filterGroup]);

  const owed = (st: any) => Number(st.monthly_fee);
  const totalExpected = lateStudents.reduce((s, st) => s + owed(st), 0);

  const handleSort = (key: string) => {
    if (sortKey === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...lateStudents].sort((a, b) => {
    if (!sortKey) return 0;
    let av = a[sortKey], bv = b[sortKey];
    if (sortKey === 'name') { av = a.name || ''; bv = b.name || ''; }
    if (sortKey === 'monthly_fee') { av = owed(a); bv = owed(b); }
    if (sortKey === 'phone' || sortKey === 'parent_phone') { av = a[sortKey] || ''; bv = b[sortKey] || ''; }
    if (sortKey === 'group_name') { av = a.group_name || ''; bv = b.group_name || ''; }
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const SortIcon = (key: string) => {
    if (sortKey !== key) return <ArrowUpDown size={12} className="opacity-30 inline mr-1" />;
    return sortDir === 'asc' ? <ArrowUp size={12} className="inline mr-1" /> : <ArrowDown size={12} className="inline mr-1" />;
  };

  const Th = ({ field, label, className }: { field: string; label: string; className?: string }) => (
    <th className={`cursor-pointer select-none py-3 px-2 text-red-800 font-semibold hover:bg-red-100/50 transition-colors ${className || ''}`} onClick={() => handleSort(field)}>
      {SortIcon(field)}{label}
    </th>
  );

  const [center, setCenter] = useState({ center_name: '', address: '', phone: '', logo: '' });
  useEffect(() => { supabase.from('center_config').select('*').maybeSingle().then(({ data }) => { if (data) setCenter(data as any); }); }, []);

const fmt = (n: number | string) => Math.round(Number(n));
  const monthNames = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const [y, m] = filterMonth.split('-').map(Number);
  const monthLabel = `${monthNames[m - 1]} ${y}`;

  const exportExcel = () => {
    const rows = [['#', 'اسم الطالب', 'الصف', 'المجموعة', 'رقم الموبايل', 'موبايل ولي الأمر', 'المبلغ المستحق'], ...sorted.map((st, i) => [i + 1, st.name, st.grade, st.group_name || '', st.phone || '', st.parent_phone || '', fmt(owed(st))])];
    const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><Worksheet xmlns="urn:schemas-microsoft-com:office:spreadsheet" ss:Name="المتخلفون"><Table>${rows.map(r => `<Row>${r.map(c => `<Cell><Data ss:Type="String">${c}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `المتخلفون_${filterMonth}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  const printList = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>المتخلفون عن الدفع</title><style>
      @page{margin:10mm} body{font-family:Tahoma,Arial,sans-serif;padding:20px;padding-top:45px;padding-bottom:35px}
      ${printHeaderStyle()}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#dc2626;color:#fff;padding:8px;text-align:center}
      td{padding:6px;border:1px solid #ddd;text-align:center}
      tr:nth-child(even){background:#fef2f2}
      h1{text-align:center;color:#dc2626;margin-bottom:16px}
      .total{text-align:center;font-size:14px;margin-top:12px;color:#666}
    </style></head><body>
    ${printHeaderHtml(center)}
    <h1>المتخلفون عن الدفع - ${monthLabel}</h1>
    <table><thead><tr><th>#</th><th>اسم الطالب</th><th>الصف</th><th>المجموعة</th><th>رقم الموبايل</th><th>موبايل ولي الأمر</th><th>المبلغ المستحق</th></tr></thead><tbody>${sorted.map((st, i) => `<tr><td>${i + 1}</td><td>${st.name}</td><td>${st.grade}</td><td>${st.group_name || '—'}</td><td>${st.phone || '—'}</td><td>${st.parent_phone || '—'}</td><td>${fmt(owed(st))} ج</td></tr>`).join('')}</tbody></table>
    <p class="total">الإجمالي: ${fmt(totalExpected)} ج - عدد الطلاب: ${lateStudents.length}</p>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const sendWhatsApp = (phone: string, name: string, fee: number) => {
    const msg = `السلام عليكم ورحمة الله وبركاته\nعزيزي ولي أمر الطالب ${name}\nنذكركم بسداد الرسوم الشهرية المستحقة وقدرها ${fmt(fee)} ج عن شهر ${monthLabel}\nشاكرين تعاونكم`;
    window.open(`https://wa.me/${phone.replace(/^0/, '20')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return <div className="text-center text-gray-400 py-16">جاري التحميل...</div>;

  return (
    <div className="fade-in space-y-4">
      <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-center gap-2">
          <AlertCircle size={24} />
          <span className="text-lg text-white/80">المتخلفون عن الدفع - {monthLabel}</span>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-bold mr-auto">{lateStudents.length} طالب</span>
        </div>
        <p className="text-2xl font-bold mt-1">{fmt(totalExpected)} ج المتوقع</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow p-4 border border-gray-100">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">الشهر</span>
            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">الصف</span>
            <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-red-400">
              <option value="">الكل</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">المجموعة</span>
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-red-400">
              <option value="">الكل</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <Filter size={16} className="text-gray-400" />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        <button onClick={exportExcel} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-4 py-2 rounded-xl font-semibold transition-colors shadow-sm">
          <Download size={15} /> تصدير إكسل
        </button>
        <button onClick={printList} className="flex items-center gap-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-xl font-semibold transition-colors shadow-sm">
          <Printer size={15} /> طباعة
        </button>
        <button onClick={load} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-xl font-semibold transition-colors shadow-sm">
          <RefreshCw size={15} /> تحديث
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {sorted.length === 0 ? (
          <p className="text-sm text-green-600 text-center py-8">جميع الطلاب سددوا هذا الشهر ✓</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-red-50 border-b border-red-100">
                <th className="text-center py-3 px-2 text-red-800 font-semibold w-10">#</th>
                <Th field="name" label="اسم الطالب" className="text-right" />
                <Th field="grade" label="الصف" />
                <Th field="group_name" label="المجموعات" />
                <Th field="phone" label="رقم الموبايل" />
                <Th field="parent_phone" label="موبايل ولي الأمر" />
                <Th field="monthly_fee" label="حالة المصروفات" />
                <th className="text-center py-3 px-2 text-red-800 font-semibold">خيارات</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((st, i) => (
                <tr key={st.id} className="border-b border-gray-50 hover:bg-red-50/40 transition-colors">
                  <td className="text-center py-3 px-2 text-gray-500">{i + 1}</td>
                  <td className="py-3 px-2 font-semibold text-gray-800">{st.name}</td>
                  <td className="text-center py-3 px-2 text-gray-600">{st.grade}</td>
                  <td className="text-center py-3 px-2 text-gray-600">{st.group_name || '—'}</td>
                  <td className="text-center py-3 px-2 text-gray-600 dir-ltr text-xs">{st.phone || '—'}</td>
                  <td className="text-center py-3 px-2 text-gray-600 dir-ltr text-xs">{st.parent_phone || '—'}</td>
                  <td className="text-center py-3 px-2">
                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                      <AlertCircle size={11} /> {fmt(owed(st))} ج غير مدفوعة
                    </span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <div className="flex items-center justify-center gap-1">
                      {st.parent_phone && (
                        <button onClick={() => sendWhatsApp(st.parent_phone, st.name, owed(st))}
                          className="text-green-500 hover:text-green-700 p-1.5 rounded-lg hover:bg-green-50 transition-colors" title="إرسال واتساب لولي الأمر">
                          <MessageCircle size={16} />
                        </button>
                      )}
                      <button onClick={() => onViewStudent?.(st.id)}
                        className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="عرض ملف الطالب">
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {lateStudents.length > 0 && (
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-4 shadow-lg text-white flex items-center justify-between">
          <span className="text-sm font-semibold">إجمالى المتوقع</span>
          <span className="text-lg font-bold">{fmt(totalExpected)} ج</span>
        </div>
      )}
    </div>
  );
}
