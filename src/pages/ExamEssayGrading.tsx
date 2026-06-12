import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';

export default function ExamEssayGrading() {
  const { show } = useToast();
  const [exams, setExams] = useState<any[]>([]);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groups, setGroups] = useState<string[]>([]);
  const [essayScores, setEssayScores] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [exRes, qRes, rRes, sRes, subRes, eqRes] = await Promise.all([
      supabase.from('exams').select('*').order('date', { ascending: false }),
      supabase.from('questions').select('*'),
      supabase.from('exam_results').select('*'),
      supabase.from('students').select('id,name,group_name').eq('status', 'active'),
      supabase.from('subjects').select('*'),
      supabase.from('exam_questions').select('*'),
    ]);
    setExams(exRes.data || []);
    setAllQuestions(qRes.data || []);
    setAllResults(rRes.data || []);
    setStudents(sRes.data || []);
    setAllSubjects(subRes.data || []);
    setExamQuestions(eqRes.data || []);
    const gs = [...new Set((sRes.data || []).map((s: any) => s.group_name).filter(Boolean))] as string[];
    setGroups(gs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const exam = exams.find(e => e.id === selectedExamId);
  const examResults = allResults.filter(r => r.exam_title === exam?.title);

  // Find essay questions linked to this exam
  const examQIds = exam ? new Set(examQuestions.filter(eq => eq.exam_id === selectedExamId).map(eq => eq.question_id)) : new Set();
  const essayQuestions = exam
    ? allQuestions.filter(q => q.question_type === 'مقالي' && examQIds.has(q.id))
    : [];

  // Students in the exam (who have results) filtered by group
  const examStudentIds = examResults.map(r => r.student_id);
  const filteredStudents = students.filter(s =>
    examStudentIds.includes(s.id) && (!selectedGroup || s.group_name === selectedGroup)
  );

  const handleScoreChange = (studentId: string, qId: string, val: string) => {
    setEssayScores(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [qId]: val.replace(/[^0-9.]/g, '') },
    }));
  };

  const getAutoScore = (result: any) => {
    if (!result?.answers) return 0;
    const answers = typeof result.answers === 'string' ? JSON.parse(result.answers) : result.answers;
    let auto = 0;
    const relatedQuestions = allQuestions.filter(q => q.question_type !== 'مقالي' && examQIds.has(q.id));
    for (const q of relatedQuestions) {
      const studentAns = answers[q.id];
      if (studentAns && studentAns === q.correct_answer) auto++;
    }
    return auto;
  };

  const getStudentAnswer = (result: any, qId: string) => {
    if (!result?.answers) return '';
    const answers = typeof result.answers === 'string' ? JSON.parse(result.answers) : result.answers;
    return answers[qId] || '';
  };

  const saveAllGrades = async () => {
    setSaving(true);
    try {
      for (const student of filteredStudents) {
        const result = examResults.find(r => r.student_id === student.id);
        if (!result) continue;
        const studentScores = essayScores[student.id];
        if (!studentScores) continue;
        const autoScore = getAutoScore(result);
        const essayTotal = Object.values(studentScores).reduce((s, v) => s + (Number(v) || 0), 0);
        const finalScore = autoScore + essayTotal;
        await supabase.from('exam_results').update({
          score: finalScore,
          essay_scores: studentScores,
        }).eq('id', result.id);
      }
      show('تم حفظ جميع الدرجات', 'success');
      load();
    } catch { show('حدث خطأ أثناء الحفظ', 'error'); }
    setSaving(false);
  };

  return (
    <div className="fade-in space-y-4">
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <ClipboardList size={20} className="text-orange-500" /> تصحيح الأسئلة المقالية
      </h2>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 flex-wrap">
        <select value={selectedExamId} onChange={e => { setSelectedExamId(e.target.value); setEssayScores({}); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 min-w-[200px]">
          <option value="">اختر الاختبار</option>
          {exams.filter(e => e.exam_type === 'إلكتروني').map(e => (
            <option key={e.id} value={e.id}>{e.title} — {e.subject}</option>
          ))}
        </select>
        {selectedExamId && (
          <>
            <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">كل المجموعات</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <span className="text-xs text-gray-400">
              {essayQuestions.length} سؤال مقالي — {filteredStudents.length} طالب
            </span>
          </>
        )}
      </div>

      {loading && <div className="text-center text-gray-400 py-20">جاري التحميل...</div>}

      {!loading && selectedExamId && !essayQuestions.length && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-300 text-sm">
          لا توجد أسئلة مقالية في هذا الاختبار
        </div>
      )}

      {!loading && essayQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs border-b">
                    <th className="text-right py-3 px-3 sticky right-0 bg-gray-50">#</th>
                    <th className="text-right py-3 px-3 sticky right-0 bg-gray-50 min-w-[120px]">الطالب</th>
                    <th className="text-right py-3 px-3">المجموعة</th>
                    {essayQuestions.map(q => (
                      <th key={q.id} className="text-center py-3 px-3 min-w-[200px]">
                        <div className="text-xs font-semibold text-gray-600 mb-1">سؤال مقالي</div>
                        <div className="text-[10px] font-normal text-gray-400 line-clamp-2">{q.question_text}</div>
                        <div className="text-[10px] font-normal text-gray-400 mt-1">الدرجة</div>
                      </th>
                    ))}
                    <th className="text-center py-3 px-3 min-w-[80px]">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, i) => {
                    const result = examResults.find(r => r.student_id === student.id);
                    const autoScore = result ? getAutoScore(result) : 0;
                    const studentEssayScores = essayScores[student.id] || {};
                    const existingScores = result?.essay_scores;
                    const getCurrentScore = (qId: string) => {
                      if (studentEssayScores[qId] !== undefined) return studentEssayScores[qId];
                      if (existingScores) {
                        const es = typeof existingScores === 'string' ? JSON.parse(existingScores) : existingScores;
                        return es[qId] !== undefined ? String(es[qId]) : '';
                      }
                      return '';
                    };
                    const essayTotal = essayQuestions.reduce((s, q) => s + (Number(getCurrentScore(q.id)) || 0), 0);
                    const finalScore = autoScore + essayTotal;

                    return (
                      <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="text-right py-3 px-3 text-gray-400 sticky right-0 bg-white">{i + 1}</td>
                        <td className="py-3 px-3 font-semibold text-gray-800 sticky right-0 bg-white">{student.name}</td>
                        <td className="py-3 px-3 text-gray-500 text-xs">{student.group_name}</td>
                        {essayQuestions.map(q => (
                          <td key={q.id} className="text-center py-2 px-3">
                            <div className="text-xs text-gray-500 mb-1 bg-gray-50 rounded p-1.5 text-right leading-relaxed max-h-16 overflow-y-auto">
                              {getStudentAnswer(result, q.id) || '—'}
                            </div>
                            <input value={getCurrentScore(q.id)} onChange={e => handleScoreChange(student.id, q.id, e.target.value)}
                              placeholder="0"
                              className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 mx-auto" />
                          </td>
                        ))}
                        <td className="text-center py-3 px-3">
                          <span className="font-bold text-gray-800">{finalScore}</span>
                          <span className="text-[10px] text-gray-400 block">({autoScore}+{essayTotal})</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={saveAllGrades} disabled={saving}
              className="px-6 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving ? 'جاري الحفظ...' : <><CheckCircle size={16} /> حفظ جميع الدرجات</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
