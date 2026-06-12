import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Search } from 'lucide-react';
import { supabase } from '../supabaseClient';

const rankIcons = [<Trophy size={16} className="text-yellow-500" />, <Medal size={16} className="text-gray-400" />, <Award size={16} className="text-amber-600" />];

export default function ExamTopScorers() {
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('students').select('id,name,code,group_name,grade').eq('status', 'active'),
      supabase.from('exam_results').select('*'),
    ]).then(([std, res]) => {
      setStudents(std.data || []);
      setResults(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Group results by student, compute average
  const studentAvg = students.map(s => {
    const sResults = results.filter(r => r.student_id === s.id);
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

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Trophy size={20} className="text-yellow-500" /> أوائل الاختبارات
        </h2>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو المجموعة..."
          className="border border-gray-200 rounded-lg px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-56" />
      </div>

      {loading && <div className="text-center text-gray-400 py-20">جاري التحميل...</div>}

      {!loading && (
        <div className="grid gap-3">
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-300 text-sm">
              {search ? 'لا توجد نتائج للبحث' : 'لا توجد درجات اختبارات مسجلة بعد'}
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
