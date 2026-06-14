import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Search, Printer } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { printHeaderHtml, printFooterHtml, printHeaderStyle } from '../utils/printHeader';

const rankIcons = [<Trophy size={16} className="text-yellow-500" />, <Medal size={16} className="text-gray-400" />, <Award size={16} className="text-amber-600" />];

export default function ExamTopScorers() {
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterExam, setFilterExam] = useState('');
  const [loading, setLoading] = useState(true);
  const [centerName, setCenterName] = useState('CenterMasr');
  const [centerAddr, setCenterAddr] = useState('');
  const [centerPhone, setCenterPhone] = useState('');
  const [centerLogo, setCenterLogo] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('students').select('id,name,code,group_name,grade').eq('status', 'active'),
      supabase.from('exam_results').select('*'),
      supabase.from('center_config').select('center_name,address,phone,logo').maybeSingle(),
    ]).then(([std, res, cfg]) => {
      setStudents(std.data || []);
      setResults(res.data || []);
      if (cfg.data) { setCenterName(cfg.data.center_name || 'CenterMasr'); setCenterAddr(cfg.data.address || ''); setCenterPhone(cfg.data.phone || ''); setCenterLogo(cfg.data.logo || ''); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const grades = [...new Set(students.map(s => s.grade).filter(Boolean))].sort();
  const groups = [...new Set(students.map(s => s.group_name).filter(Boolean))].sort();
  const examTitles = [...new Set(results.map(r => r.exam_title).filter(Boolean))].sort();

  let filteredStudents = students;
  if (filterGrade) filteredStudents = filteredStudents.filter(s => s.grade === filterGrade);
  if (filterGroup) filteredStudents = filteredStudents.filter(s => s.group_name === filterGroup);

  const studentAvg = filteredStudents.map(s => {
    let sResults = results.filter(r => r.student_id === s.id);
    if (filterExam) sResults = sResults.filter(r => r.exam_title === filterExam);
    if (!sResults.length) return null;
    const pcts = sResults.map(r => r.max_score > 0 ? Math.round((Number(r.score) / Number(r.max_score)) * 100) : 0);
    const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    const examCount = sResults.length;
    const lastExam = sResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return { ...s, avg, examCount, lastExam };
  }).filter(Boolean).sort((a, b) => b!.avg - a!.avg);

  const filtered = studentAvg.filter(s =>
    !search || s!.name.includes(search) || s!.group_name?.includes(search)
  );

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const header = filterGrade || filterGroup || filterExam
      ? `أوائل الاختبارات${filterGrade ? ` — ${filterGrade}` : ''}${filterGroup ? ` — ${filterGroup}` : ''}${filterExam ? ` — ${filterExam}` : ''}`
      : 'أوائل الاختبارات';
    const rows = filtered.map((s, i) => `<tr>
      <td>${i + 1}</td>
      <td style="font-weight:bold">${s!.name}</td>
      <td>${s!.group_name || '—'}</td>
      <td>${s!.grade || '—'}</td>
      <td>${s!.avg}%</td>
      <td>${s!.examCount}</td>
      <td>${s!.lastExam?.exam_title || '—'}</td>
    </tr>`).join('');
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${header}</title>
      <style>
        @page { size: landscape; margin: 5mm; }
        * { font-family: 'Traditional Arabic', 'Arabic Typesetting', Arial, sans-serif; }
        body { margin: 0; padding: 0; }
        ${printHeaderStyle()}
        h2 { text-align: center; font-size: 14pt; color: #1e3a5f; margin: 0 0 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 12pt; }
        th { background: #1e3a5f; color: white; padding: 5px 3px; text-align: center; font-weight: bold; }
        td { padding: 3px 3px; border-bottom: 1px solid #ddd; text-align: center; }
        tr:nth-child(even) { background: #f8f9fa; }
      </style></head><body>
      ${printHeaderHtml({ center_name: centerName, address: centerAddr, phone: centerPhone, logo: centerLogo })}
      <div class="content">
      <h2>${header}</h2>
      <table>
        <thead><tr><th>#</th><th>الطالب</th><th>المجموعة</th><th>الصف</th><th>المتوسط</th><th>عدد الاختبارات</th><th>آخر اختبار</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </div>
      ${printFooterHtml()}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); w.close(); }, 500);
  };

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Trophy size={20} className="text-yellow-500" /> أوائل الاختبارات
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-40" />
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            <Printer size={14} /> طباعة
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-end">
        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 min-w-[120px]">
          <option value="">كل الصفوف</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 min-w-[120px]">
          <option value="">كل المجموعات</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterExam} onChange={e => setFilterExam(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 min-w-[160px]">
          <option value="">كل الاختبارات</option>
          {examTitles.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {(filterGrade || filterGroup || filterExam) && (
          <button onClick={() => { setFilterGrade(''); setFilterGroup(''); setFilterExam(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2">إعادة تعيين</button>
        )}
      </div>

      {loading && <div className="text-center text-gray-400 py-20">جاري التحميل...</div>}

      {!loading && (
        <div className="grid gap-3">
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-300 text-sm">
              {search || filterGrade || filterGroup || filterExam ? 'لا توجد نتائج للبحث' : 'لا توجد درجات اختبارات مسجلة بعد'}
            </div>
          )}

          {filtered.map((s, i) => {
            const rank = studentAvg.indexOf(s) + 1;
            return (
              <div key={s!.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${rank <= 3 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}>
                  {rankIcons[rank - 1] || rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800">{s!.name}</div>
                  <div className="text-xs text-gray-400">{s!.group_name} — {s!.grade}</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${s!.avg >= 85 ? 'text-green-600' : s!.avg >= 65 ? 'text-amber-600' : 'text-red-500'}`}>{s!.avg}%</div>
                  <div className="text-[10px] text-gray-400">{s!.examCount} اختبار{s!.examCount !== 1 ? 'ات' : ''}</div>
                </div>
                <div className="text-left min-w-[100px]">
                  <div className="text-[10px] text-gray-400">آخر اختبار</div>
                  <div className="text-xs text-gray-600">{s!.lastExam?.exam_title || '—'}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
