import { useState, useEffect } from 'react';
import { ScrollText, Printer, Download } from 'lucide-react';
import { supabase } from '../supabaseClient';

function getGrade(pct: number | null) {
  if (pct === null) return '—';
  if (pct >= 85) return 'ممتاز';
  if (pct >= 65) return 'جيد جداً';
  if (pct >= 50) return 'مقبول';
  return 'ضعيف';
}

function getGradeColor(pct: number | null) {
  if (pct === null) return '';
  if (pct >= 85) return 'bg-green-100 text-green-700';
  if (pct >= 65) return 'bg-amber-100 text-amber-700';
  if (pct >= 50) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

export default function ExamScoreSheet() {
  const [groups, setGroups] = useState<string[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('groups').select('name').order('name'),
      supabase.from('exams').select('*').order('date', { ascending: false }),
      supabase.from('students').select('id,name,code,group_name,grade').eq('status', 'active'),
      supabase.from('exam_results').select('*'),
    ]).then(([grp, ex, std, res]) => {
      const seen = new Set<string>();
      setGroups((grp.data || []).map((g: any) => g.name).filter((g: string) => { if (seen.has(g)) return false; seen.add(g); return true; }));
      setExams(ex.data || []);
      setStudents(std.data || []);
      setResults(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const exam = exams.find(e => e.id === selectedExamId);
  const groupStudents = students.filter(s => !selectedGroup || s.group_name === selectedGroup);

  const exportExcel = async () => {
    if (!exam) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const rows = groupStudents.map((s, i) => {
        const r = results.find(er => er.student_id === s.id && er.exam_title === exam?.title);
        const pct = r && r.max_score > 0 ? Math.round((Number(r.score) / Number(r.max_score)) * 100) : null;
        return {
          '#': i + 1,
          'كود الطالب': s.code,
          'اسم الطالب': s.name,
          'المجموعة': s.group_name || '—',
          'الدرجة': r ? `${r.score}/${r.max_score}` : '—',
          'النسبة': pct !== null ? `${pct}%` : '—',
          'التقدير': getGrade(pct),
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الدرجات');
      ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 10 }];
      XLSX.writeFile(wb, `كشف_درجات_${exam.title}.xlsx`);
    } catch { /* XLSX not available */ }
    setExporting(false);
  };

  return (
    <div className="fade-in space-y-4">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 8mm; }
          @page { size: landscape; }
          table { font-size: 12pt !important; }
        }
      `}</style>

      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <ScrollText size={20} className="text-purple-500" /> كشف الدرجات
        </h2>
        <div className="flex items-center gap-2">
          <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="">كل المجموعات</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="">اختر الاختبار</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.title} — {e.subject}</option>)}
          </select>
          <button onClick={() => window.print()} disabled={!selectedExamId}
            className="px-4 py-1.5 bg-purple-500 text-white rounded-lg text-sm font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-2">
            <Printer size={16} /> طباعة
          </button>
          <button onClick={exportExcel} disabled={!selectedExamId || exporting}
            className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2">
            <Download size={16} /> {exporting ? 'جاري...' : 'Excel'}
          </button>
        </div>
      </div>

      {loading && <div className="text-center text-gray-400 py-12">جاري التحميل...</div>}

      {!loading && !selectedExamId && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-300 text-sm">
          اختر الاختبار لعرض كشف الدرجات
        </div>
      )}

      {!loading && selectedExamId && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4" id="print-area">
            <div className="text-center mb-4 hidden print:block">
              <h3 className="font-bold text-lg">{exam?.title}</h3>
              <p className="text-xs text-gray-500">{exam?.subject} — الدرجة الكاملة: {exam?.max_score}</p>
            </div>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="text-right py-2 px-2 font-bold text-gray-700">#</th>
                  <th className="text-right py-2 px-2 font-bold text-gray-700">اسم الطالب</th>
                  <th className="text-right py-2 px-2 font-bold text-gray-700">المجموعة</th>
                  <th className="text-center py-2 px-2 font-bold text-gray-700">الدرجة</th>
                  <th className="text-center py-2 px-2 font-bold text-gray-700">النسبة</th>
                  <th className="text-center py-2 px-2 font-bold text-gray-700">التقدير</th>
                </tr>
              </thead>
              <tbody>
                {groupStudents.map((s, i) => {
                  const r = results.find(er => er.student_id === s.id && er.exam_title === exam?.title);
                  const pct = r && r.max_score > 0 ? Math.round((Number(r.score) / Number(r.max_score)) * 100) : null;
                  return (
                    <tr key={s.id} className="border-b border-gray-50">
                      <td className="text-right py-2 px-2 text-gray-400">{i + 1}</td>
                      <td className="py-2 px-2 font-semibold text-gray-800">{s.name}</td>
                      <td className="py-2 px-2 text-gray-500 text-xs">{s.group_name}</td>
                      <td className="text-center py-2 px-2">{r ? `${r.score}/${r.max_score}` : '—'}</td>
                      <td className="text-center py-2 px-2">{pct !== null ? `${pct}%` : '—'}</td>
                      <td className="text-center py-2 px-2">
                        {pct !== null ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getGradeColor(pct)}`}>
                            {getGrade(pct)}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-3 text-xs text-gray-400 flex items-center justify-between">
              <span>{exam?.title}</span>
              <span>{exam?.subject} — الدرجة الكاملة: {exam?.max_score}</span>
              <span>{groupStudents.length} طالب</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
