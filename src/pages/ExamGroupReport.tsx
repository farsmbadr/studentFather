import { useState, useEffect } from 'react';
import { Users, BarChart3, TrendingUp, TrendingDown, Printer } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { printHeaderHtml, printFooterHtml, printHeaderStyle } from '../utils/printHeader';

export default function ExamGroupReport() {
  const [groups, setGroups] = useState<string[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [centerName, setCenterName] = useState('CenterMasr');
  const [centerAddr, setCenterAddr] = useState('');
  const [centerPhone, setCenterPhone] = useState('');
  const [centerLogo, setCenterLogo] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('groups').select('name').order('name'),
      supabase.from('exams').select('*').order('date', { ascending: false }),
      supabase.from('students').select('id,name,code,group_name,grade').eq('status', 'active'),
      supabase.from('exam_results').select('*'),
      supabase.from('center_config').select('center_name,address,phone,logo').maybeSingle(),
    ]).then(([grp, ex, std, res, cfg]) => {
      const seen = new Set<string>();
      setGroups((grp.data || []).map((g: any) => g.name).filter(g => { if (seen.has(g)) return false; seen.add(g); return true; }));
      setExams(ex.data || []);
      setStudents(std.data || []);
      setResults(res.data || []);
      if (cfg.data) { setCenterName(cfg.data.center_name || 'CenterMasr'); setCenterAddr(cfg.data.address || ''); setCenterPhone(cfg.data.phone || ''); setCenterLogo(cfg.data.logo || ''); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const exam = exams.find(e => e.id === selectedExamId);
  const groupStudents = students.filter(s => s.group_name === selectedGroup);
  const groupResults = groupStudents.map(s => {
    const r = results.find(er => er.student_id === s.id && er.exam_title === exam?.title);
    return { ...s, result: r, pct: r && r.max_score > 0 ? Math.round((Number(r.score) / Number(r.max_score)) * 100) : null };
  }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

  const avgPct = groupResults.reduce((s, r) => s + (r.pct ?? 0), 0);
  const validCount = groupResults.filter(r => r.pct !== null).length;
  const overallAvg = validCount > 0 ? Math.round(avgPct / validCount) : 0;
  const passed = groupResults.filter(r => r.pct !== null && r.pct >= 50).length;
  const failed = validCount - passed;

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = groupResults.map((s, i) => `<tr>
      <td>${i + 1}</td>
      <td style="font-weight:bold">${s.name}</td>
      <td>${s.result ? `${s.result.score} / ${s.result.max_score}` : '—'}</td>
      <td>${s.pct !== null ? `${s.pct}%` : '—'}</td>
      <td>${s.pct !== null ? (s.pct >= 85 ? 'ممتاز' : s.pct >= 65 ? 'جيد جداً' : s.pct >= 50 ? 'مقبول' : 'ضعيف') : '—'}</td>
    </tr>`).join('');
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>تقرير مجموعة - ${selectedGroup}</title>
      <style>
        @page { size: landscape; margin: 5mm; }
        * { font-family: 'Traditional Arabic', 'Arabic Typesetting', Arial, sans-serif; }
        body { margin: 0; padding: 0; }
        ${printHeaderStyle()}
        .content { padding: 6mm 3mm; }
        h2 { text-align: center; font-size: 14pt; color: #1e3a5f; margin: 0 0 4px; }
        .sub { text-align: center; font-size: 12pt; color: #666; margin: 0 0 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 12pt; }
        th { background: #1e3a5f; color: white; padding: 5px 3px; text-align: center; font-weight: bold; }
        td { padding: 3px 3px; border-bottom: 1px solid #ddd; text-align: center; }
        tr:nth-child(even) { background: #f8f9fa; }
        .stats { display: flex; justify-content: center; gap: 20px; margin-bottom: 8px; font-size: 12pt; }
        .stats span { background: #f0f4f8; padding: 4px 12px; border-radius: 6px; }
      </style></head><body>
      ${printHeaderHtml({ center_name: centerName, address: centerAddr, phone: centerPhone, logo: centerLogo })}
      <div class="content">
      <h2>تقرير مجموعة — ${selectedGroup}</h2>
      <p class="sub">${exam?.title} — ${exam?.subject}</p>
      <div class="stats">
        <span>المتوسط: ${overallAvg}%</span>
        <span>ناجح: ${passed}</span>
        <span>راسب: ${failed}</span>
      </div>
      <table>
        <thead><tr><th>#</th><th>الطالب</th><th>الدرجة</th><th>النسبة</th><th>التقدير</th></tr></thead>
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
          <Users size={20} className="text-blue-500" /> تقرير مجموعة
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} disabled={!selectedGroup || !selectedExamId}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50">
            <Printer size={14} /> طباعة
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 flex-wrap">
        <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">اختر المجموعة</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">اختر الاختبار</option>
          {exams.map(e => <option key={e.id} value={e.id}>{e.title} — {e.subject}</option>)}
        </select>
      </div>

      {loading && <div className="text-center text-gray-400 py-12">جاري التحميل...</div>}

      {!loading && selectedGroup && selectedExamId && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
              <BarChart3 size={24} className="mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-gray-800">{overallAvg}%</div>
              <div className="text-xs text-gray-400">متوسط المجموعة</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
              <TrendingUp size={24} className="mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold text-green-600">{passed}</div>
              <div className="text-xs text-gray-400">ناجح ({validCount > 0 ? Math.round(passed / validCount * 100) : 0}%)</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
              <TrendingDown size={24} className="mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold text-red-500">{failed}</div>
              <div className="text-xs text-gray-400">راسب ({validCount > 0 ? Math.round(failed / validCount * 100) : 0}%)</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs border-b">
                    <th className="text-right py-3 px-3">#</th>
                    <th className="text-right py-3 px-3">الطالب</th>
                    <th className="text-center py-3 px-3">الدرجة</th>
                    <th className="text-center py-3 px-3">النسبة</th>
                    <th className="text-center py-3 px-3">التقدير</th>
                  </tr>
                </thead>
                <tbody>
                  {groupResults.map((s, i) => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="text-right py-3 px-3 text-gray-400">{i + 1}</td>
                      <td className="py-3 px-3 font-semibold text-gray-800">{s.name}</td>
                      <td className="text-center py-3 px-3">{s.result ? `${s.result.score} / ${s.result.max_score}` : '—'}</td>
                      <td className="text-center py-3 px-3">
                        {s.pct !== null ? (
                          <span className="font-bold">{s.pct}%</span>
                        ) : '—'}
                      </td>
                      <td className="text-center py-3 px-3">
                        {s.pct !== null ? (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.pct >= 85 ? 'bg-green-100 text-green-700' : s.pct >= 65 ? 'bg-amber-100 text-amber-700' : s.pct >= 50 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                            {s.pct >= 85 ? 'ممتاز' : s.pct >= 65 ? 'جيد جداً' : s.pct >= 50 ? 'مقبول' : 'ضعيف'}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                  {!groupResults.length && (
                    <tr><td colSpan={5} className="py-12 text-center text-gray-300 text-sm">لا يوجد طلاب في هذه المجموعة</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
