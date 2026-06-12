import { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Users, BookOpen, HelpCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function ExamStatistics() {
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('exams').select('*').order('date', { ascending: false }),
      supabase.from('exam_results').select('*'),
      supabase.from('questions').select('*'),
      supabase.from('exam_questions').select('*'),
      supabase.from('subjects').select('*'),
    ]).then(([ex, res, q, eq, sub]) => {
      setExams(ex.data || []);
      setResults(res.data || []);
      setQuestions(q.data || []);
      setExamQuestions(eq.data || []);
      setSubjects(sub.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Overall stats
  const examCount = exams.length;
  const studentWithResults = new Set(results.map(r => r.student_id)).size;
  const allPcts = results.filter(r => r.max_score > 0).map(r => Math.round((Number(r.score) / Number(r.max_score)) * 100));
  const avgAll = allPcts.length > 0 ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length) : 0;
  const passedAll = allPcts.filter(p => p >= 50).length;
  const passRate = allPcts.length > 0 ? Math.round(passedAll / allPcts.length * 100) : 0;

  // Per exam stats
  const examStats = exams.map(ex => {
    const exResults = results.filter(r => r.exam_title === ex.title);
    const pcts = exResults.filter(r => r.max_score > 0).map(r => Math.round((Number(r.score) / Number(r.max_score)) * 100));
    const avg = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
    const passed = pcts.filter(p => p >= 50).length;
    return { ...ex, resultsCount: exResults.length, avg, passRate: pcts.length > 0 ? Math.round(passed / pcts.length * 100) : 0 };
  });

  // Grade distribution
  const dist = {
    ممتاز: allPcts.filter(p => p >= 85).length,
    'جيد جداً': allPcts.filter(p => p >= 65 && p < 85).length,
    مقبول: allPcts.filter(p => p >= 50 && p < 65).length,
    ضعيف: allPcts.filter(p => p < 50).length,
  };

  // Selected exam detailed stats
  const selectedExam = exams.find(e => e.id === selectedExamId);
  const selectedExamResults = selectedExam ? results.filter(r => r.exam_title === selectedExam.title) : [];
  const selectedPcts = selectedExamResults.filter(r => r.max_score > 0).map(r => Math.round((Number(r.score) / Number(r.max_score)) * 100));
  const selectedAvg = selectedPcts.length > 0 ? Math.round(selectedPcts.reduce((a, b) => a + b, 0) / selectedPcts.length) : 0;
  const selectedPass = selectedPcts.filter(p => p >= 50).length;
  const selectedPassRate = selectedPcts.length > 0 ? Math.round(selectedPass / selectedPcts.length * 100) : 0;

  // Per-question analysis for electronic exams
  const relatedEqs = selectedExam ? examQuestions.filter(eq => eq.exam_id === selectedExam.id) : [];
  const relatedQIds = relatedEqs.map(eq => eq.question_id);
  const relatedQuestions = questions.filter(q => relatedQIds.includes(q.id));

  // For auto-mode exams, use all questions from the bank matching the subject
  const bankQuestions = selectedExam ? questions.filter(q => {
    const sub = (subjects || []).find((s: any) => s.name === selectedExam.subject);
    return q.subject_id === sub?.id || q.subject_id === (selectedExam.subject_id || '');
  }) : [];
  const analysisQuestions = relatedQuestions.length > 0 ? relatedQuestions : bankQuestions;

  const questionAnalysis = analysisQuestions.map(q => {
    let correctCount = 0;
    let answeredCount = 0;
    if (q.question_type !== 'مقالي') {
      for (const r of selectedExamResults) {
        const answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : (r.answers || {});
        const studentAns = answers[q.id];
        if (studentAns !== undefined && studentAns !== null && studentAns !== '') {
          answeredCount++;
          if (studentAns === q.correct_answer) correctCount++;
        }
      }
    }
    const difficultyPct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    return { ...q, correctCount, answeredCount, difficultyPct };
  }).filter(q => q.answeredCount > 0);

  const easyCount = selectedPcts.filter(p => p >= 85).length;
  const goodCount = selectedPcts.filter(p => p >= 65 && p < 85).length;
  const okCount = selectedPcts.filter(p => p >= 50 && p < 65).length;
  const failCount = selectedPcts.filter(p => p < 50).length;
  const maxCount = Math.max(easyCount, goodCount, okCount, failCount, 1);

  return (
    <div className="fade-in space-y-4">
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <BarChart3 size={20} className="text-indigo-500" /> إجماليات ونسب الاختبارات
      </h2>

      {loading && <div className="text-center text-gray-400 py-20">جاري التحميل...</div>}

      {!loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
              <BookOpen size={22} className="mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-gray-800">{examCount}</div>
              <div className="text-xs text-gray-400">إجمالي الاختبارات</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
              <Users size={22} className="mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold text-gray-800">{studentWithResults}</div>
              <div className="text-xs text-gray-400">طلاب لهم درجات</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
              <TrendingUp size={22} className="mx-auto mb-2 text-orange-500" />
              <div className="text-2xl font-bold text-gray-800">{avgAll}%</div>
              <div className="text-xs text-gray-400">المتوسط العام</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
              <PieChart size={22} className="mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold text-gray-800">{passRate}%</div>
              <div className="text-xs text-gray-400">نسبة النجاح</div>
            </div>
          </div>

          {/* Grade distribution */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-4">توزيع التقديرات (جميع الاختبارات)</h3>
            <div className="space-y-2">
              {[
                { label: 'ممتاز', value: dist.ممتاز, color: 'bg-green-500' },
                { label: 'جيد جداً', value: dist['جيد جداً'], color: 'bg-blue-500' },
                { label: 'مقبول', value: dist.مقبول, color: 'bg-amber-500' },
                { label: 'ضعيف', value: dist.ضعيف, color: 'bg-red-500' },
              ].map(d => {
                const max = allPcts.length || 1;
                const pct = Math.round(d.value / max * 100);
                return (
                  <div key={d.label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16 text-left">{d.label}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${d.color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-10 text-right">{d.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-exam detailed section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
              <HelpCircle size={16} className="text-indigo-400" /> تحليل اختبار محدد
            </h3>
            <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4 min-w-[250px]">
              <option value="">اختر الاختبار</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.title} — {e.subject}</option>)}
            </select>

            {selectedExamId && selectedExam && (
              <div className="space-y-4">
                {/* Quick stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-gray-800">{selectedExamResults.length}</div>
                    <div className="text-[10px] text-gray-400">عدد الطلاب</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className={`text-lg font-bold ${selectedAvg >= 75 ? 'text-green-600' : selectedAvg >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{selectedAvg}%</div>
                    <div className="text-[10px] text-gray-400">المتوسط</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-gray-800">{selectedPassRate}%</div>
                    <div className="text-[10px] text-gray-400">نسبة النجاح</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-gray-800">{selectedExam.max_score}</div>
                    <div className="text-[10px] text-gray-400">الدرجة الكاملة</div>
                  </div>
                </div>

                {/* Score distribution bar chart */}
                <div>
                  <h4 className="text-xs font-bold text-gray-600 mb-2">توزيع الدرجات</h4>
                  <div className="flex items-end gap-2 h-28">
                    {[
                      { label: 'ممتاز', value: easyCount, color: 'bg-green-500', pct: Math.round(easyCount / maxCount * 100) },
                      { label: 'جيد جداً', value: goodCount, color: 'bg-blue-500', pct: Math.round(goodCount / maxCount * 100) },
                      { label: 'مقبول', value: okCount, color: 'bg-amber-500', pct: Math.round(okCount / maxCount * 100) },
                      { label: 'ضعيف', value: failCount, color: 'bg-red-500', pct: Math.round(failCount / maxCount * 100) },
                    ].map(d => (
                      <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-semibold text-gray-700">{d.value}</span>
                        <div className="w-full flex flex-col-reverse" style={{ height: '100px' }}>
                          <div className={`w-full rounded-t ${d.color} transition-all duration-500`} style={{ height: `${d.pct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Per-question analysis */}
                {questionAnalysis.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5">
                      <HelpCircle size={13} /> تحليل الأسئلة (نسبة الإجابة الصحيحة)
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b">
                            <th className="text-right py-2 px-2">السؤال</th>
                            <th className="text-center py-2 px-2">النوع</th>
                            <th className="text-center py-2 px-2">أجابوا</th>
                            <th className="text-center py-2 px-2">صحيح</th>
                            <th className="text-center py-2 px-2">النسبة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {questionAnalysis.map(q => (
                            <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2 px-2 text-gray-700 max-w-[200px] truncate">{q.question_text}</td>
                              <td className="text-center py-2 px-2">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100">
                                  {q.question_type === 'اختيار من متعدد' ? '🔘' : q.question_type === 'صح/خطأ' ? '✅' : '📝'}
                                </span>
                              </td>
                              <td className="text-center py-2 px-2 text-gray-600">{q.answeredCount}</td>
                              <td className="text-center py-2 px-2 text-gray-600">{q.correctCount}</td>
                              <td className="text-center py-2 px-2">
                                <span className={`font-bold ${q.difficultyPct >= 75 ? 'text-green-600' : q.difficultyPct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                  {q.difficultyPct}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!questionAnalysis.length && (
                  <p className="text-xs text-gray-400 text-center py-4">لا توجد بيانات تحليل للأسئلة (الاختبار ورقي أو لا توجد إجابات محفوظة)</p>
                )}
              </div>
            )}
          </div>

          {/* Per-exam table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b">
              <h3 className="font-bold text-gray-800 text-sm">أداء الاختبارات</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs border-b">
                    <th className="text-right py-3 px-3">الاختبار</th>
                    <th className="text-center py-3 px-3">عدد الطلاب</th>
                    <th className="text-center py-3 px-3">المتوسط</th>
                    <th className="text-center py-3 px-3">نسبة النجاح</th>
                    <th className="text-center py-3 px-3">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {examStats.map(ex => (
                    <tr key={ex.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 font-semibold text-gray-800">{ex.title}</td>
                      <td className="text-center py-3 px-3 text-gray-600">{ex.resultsCount}</td>
                      <td className="text-center py-3 px-3">
                        <span className={`font-bold ${ex.avg >= 75 ? 'text-green-600' : ex.avg >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{ex.avg}%</span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ex.passRate >= 75 ? 'bg-green-100 text-green-700' : ex.passRate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {ex.passRate}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-3 text-gray-500 text-xs">{new Date(ex.date).toLocaleDateString('ar-EG')}</td>
                    </tr>
                  ))}
                  {!examStats.length && (
                    <tr><td colSpan={5} className="py-12 text-center text-gray-300 text-sm">لا توجد اختبارات مسجلة</td></tr>
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
