import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CheckCircle, Clock, AlertTriangle, ChevronRight, ChevronLeft, Send, BarChart3, User, BookOpen, XCircle } from 'lucide-react';

const DIFFICULTY_COLORS: Record<string, string> = {
  سهل: 'bg-emerald-100 text-emerald-700',
  متوسط: 'bg-amber-100 text-amber-700',
  صعب: 'bg-red-100 text-red-700',
};
const TYPE_ICONS: Record<string, string> = { 'اختيار من متعدد': '🔘', 'صح/خطأ': '✅', مقالي: '📝' };

export default function TakeExam() {
  const { examId } = useParams<{ examId: string }>();
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [studentCode, setStudentCode] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [identified, setIdentified] = useState(false);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [examClosed, setExamClosed] = useState(false);

  const isExpired = exam?.closing_date && new Date(exam.closing_date) < new Date();

  useEffect(() => {
    if (!examId) { setError('رابط الاختبار غير صالح'); setLoading(false); return; }
    (async () => {
      const [examRes, qRes] = await Promise.all([
        supabase.from('exams').select('*').eq('id', examId).maybeSingle(),
        supabase.from('subjects').select('*'),
        supabase.from('questions').select('*'),
      ]);
      if (!examRes.data) { setError('الاختبار غير موجود'); setLoading(false); return; }
      const examData = examRes.data;
      const allQ = qRes[1].data || [];
      const subject = (qRes[0].data || []).find((s: any) => s.name === examData.subject);
      const subjectId = subject?.id;
      let qs: any[] = [];
      if (examData.selection_mode === 'auto') {
        const ac = examData.auto_config || {};
        const easy = +ac.easy || 0;
        const medium = +ac.medium || 0;
        const hard = +ac.hard || 0;
        const bank = allQ.filter((q: any) => q.subject_id === subjectId);
        const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);
        qs = [
          ...shuffle(bank.filter((q: any) => q.difficulty === 'سهل')).slice(0, easy),
          ...shuffle(bank.filter((q: any) => q.difficulty === 'متوسط')).slice(0, medium),
          ...shuffle(bank.filter((q: any) => q.difficulty === 'صعب')).slice(0, hard),
        ].sort(() => Math.random() - 0.5);
      } else {
        const { data: eqData } = await supabase.from('exam_questions').select('*').eq('exam_id', examId);
        const qIds = (eqData || []).map((eq: any) => eq.question_id);
        qs = allQ.filter((q: any) => qIds.includes(q.id)).sort(() => Math.random() - 0.5);
      }
      setExam(examData);
      setQuestions(qs);
      setTotal(qs.length);
      if (examData.duration > 0 && !(examData.closing_date && new Date(examData.closing_date) < new Date())) setTimeLeft(examData.duration * 60);
      setLoading(false);
    })();
  }, [examId]);

  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitted || !identified || reviewMode) return;
    const t = setInterval(() => { setTimeLeft(prev => (prev !== null ? prev - 1 : null)); }, 1000);
    return () => clearInterval(t);
  }, [submitted, identified, reviewMode]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft <= 0 && !submitted && identified && !reviewMode) {
      handleSubmitRef.current();
    }
  }, [timeLeft]);

  const handleIdentify = async () => {
    if (!studentCode.trim() || !studentPhone.trim()) return;
    setSearching(true); setNotFound(false);
    try {
      const { data: student } = await supabase.from('students').select('*').eq('status', 'active').eq('code', studentCode.trim()).eq('phone', studentPhone.trim()).maybeSingle();
      if (student) {
        setStudentId(student.id);
        setStudentName(student.name);
        const currentExamTitle = exam?.title || '';
        const { data: existing } = await supabase.from('exam_results').select('*').eq('student_id', student.id).eq('exam_title', currentExamTitle).maybeSingle();
        if (existing) {
          setScore(Number(existing.score));
          setAnswers(typeof existing.answers === 'object' && existing.answers !== null ? existing.answers : {});
          const savedIds = Array.isArray(existing.questions) ? existing.questions : [];
          if (savedIds.length > 0) {
            const { data: bank } = await supabase.from('questions').select('*');
            const ordered = savedIds.map((id: string) => (bank || []).find((q: any) => q.id === id)).filter(Boolean);
            if (ordered.length > 0) { setQuestions(ordered); setTotal(ordered.length); }
          }
          setReviewMode(true);
        } else if (exam?.closing_date && new Date(exam.closing_date) < new Date()) {
          setExamClosed(true);
        } else {
          setIdentified(true);
        }
      } else {
        setNotFound(true);
      }
    } catch { setNotFound(true); }
    setSearching(false);
  };

  const handleAnswer = (qId: string, val: string) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    setSubmitted(true);
    let correct = 0;
    for (const q of questions) {
      const ans = (answers[q.id] || '').trim().toLowerCase();
      const correctAns = (q.correct_answer || '').trim().toLowerCase();
      if (q.question_type === 'مقالي') continue;
      if (ans === correctAns) correct++;
    }
    setScore(correct);
    await supabase.from('exam_results').insert({
      student_id: studentId,
      student_name: studentName,
      exam_title: exam?.title || '',
      subject: exam?.subject || '',
      score: correct,
      max_score: total,
      answers,
      questions: questions.map(q => q.id),
      date: new Date().toISOString(),
    }).catch(() => {});
  }, [submitted, questions, answers, studentId, studentName, exam?.title, exam?.subject, total]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60); const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
      <div className="text-center"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-500">جاري تحميل الاختبار...</p></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 p-8 max-w-md w-full text-center">
        <AlertTriangle size={48} className="mx-auto text-amber-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">عذراً</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  );

  if (examClosed) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} className="text-amber-500" /></div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">الاختبار مغلق</h2>
        <p className="text-sm text-gray-500">انتهى موعد هذا الاختبار ولم تقم بأدائه</p>
      </div>
    </div>
  );

  if (reviewMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">{studentName[0]}</div>
              <div><h1 className="font-bold text-gray-800 text-sm">{exam?.title}</h1><p className="text-[10px] text-gray-400">{studentName}</p></div>
            </div>
            <div className="flex items-center gap-2 bg-gradient-to-l from-emerald-500 to-green-600 rounded-xl px-4 py-1.5 shadow-sm">
              <BarChart3 size={14} className="text-white" />
              <span className="text-xs font-bold text-white">{score}/{total} · {total > 0 ? Math.round((score / total) * 100) : 0}%</span>
            </div>
          </div>
        </div>
        {questions.length === 0 ? (
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 p-8 text-center">
              <AlertTriangle size={32} className="mx-auto text-amber-400 mb-3" />
              <p className="text-gray-500">لا توجد أسئلة لعرضها في وضع المراجعة</p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 overflow-hidden">
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-gray-400 font-mono">سؤال {currentIdx + 1} من {total}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[questions[currentIdx]?.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_ICONS[questions[currentIdx]?.question_type] || '🔘'} {questions[currentIdx]?.difficulty}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{questions[currentIdx]?.question_type}</span>
                  </div>
                </div>
                <p className="text-base font-semibold text-gray-800 leading-relaxed">{questions[currentIdx]?.question_text}</p>
              </div>
              {(() => {
                const q = questions[currentIdx];
                const studentAnswer = answers[q?.id];
                if (q?.question_type === 'اختيار من متعدد' && Array.isArray(q.options)) {
                  return (
                    <div className="px-6 pb-6 space-y-2">
                      {q.options.map((opt: string, oi: number) => {
                        const isCorrect = opt === q.correct_answer;
                        const isStudentChoice = opt === studentAnswer;
                        const isWrong = isStudentChoice && !isCorrect;
                        return (
                          <div key={oi} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${isCorrect ? 'border-emerald-400 bg-emerald-50' : isWrong ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isCorrect ? 'border-emerald-500 bg-emerald-500' : isWrong ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
                              {(isCorrect || isWrong) && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <span className={`text-sm ${isCorrect ? 'text-emerald-700 font-semibold' : isWrong ? 'text-red-700 font-semibold' : 'text-gray-700'}`}>{opt}</span>
                            {isCorrect && <CheckCircle size={14} className="text-emerald-500 mr-auto" />}
                            {isWrong && <span className="text-[10px] text-red-500 mr-auto">إجابتك</span>}
                            {isStudentChoice && isCorrect && <span className="text-[10px] text-emerald-600 mr-auto">إجابتك</span>}
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                if (q?.question_type === 'صح/خطأ') {
                  return (
                    <div className="px-6 pb-6">
                      <div className="grid grid-cols-2 gap-3">
                        {['صح', 'خطأ'].map((val: string) => {
                          const isCorrect = val === q.correct_answer;
                          const isStudentChoice = val === studentAnswer;
                          const isWrong = isStudentChoice && !isCorrect;
                          return (
                            <div key={val} className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${isCorrect ? 'border-emerald-400 bg-emerald-50' : isWrong ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}>
                              <span className="text-lg">{val === 'صح' ? '✅' : '❌'}</span>
                              <span className={`text-sm font-semibold ${isCorrect ? 'text-emerald-700' : isWrong ? 'text-red-700' : 'text-gray-700'}`}>{val}</span>
                              {isCorrect && <CheckCircle size={14} className="text-emerald-500" />}
                              {isWrong && <span className="text-[10px] text-red-500">إجابتك</span>}
                              {isStudentChoice && isCorrect && <span className="text-[10px] text-emerald-600">إجابتك</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                if (q?.question_type === 'مقالي') {
                  return (
                    <div className="px-6 pb-6 space-y-3">
                      {studentAnswer && (
                        <div className="bg-amber-50 rounded-xl px-4 py-3 border border-amber-200">
                          <p className="text-xs text-amber-600 mb-1">إجابتك:</p>
                          <p className="text-sm text-amber-800">{studentAnswer}</p>
                        </div>
                      )}
                      {q.correct_answer && (
                        <div className="bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200">
                          <p className="text-xs text-emerald-600 mb-1">نموذج الإجابة:</p>
                          <p className="text-sm text-emerald-700">{q.correct_answer}</p>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex items-center justify-between mt-4">
              <button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all">
                <ChevronRight size={16} /> السابق
              </button>
              <div className="flex items-center gap-1.5">
                {questions.map((_, i: number) => (
                  <button key={i} onClick={() => setCurrentIdx(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === currentIdx ? 'w-6 bg-indigo-500' : 'bg-gray-200'}`} />
                ))}
              </div>
              <button onClick={() => setCurrentIdx(Math.min(total - 1, currentIdx + 1))} disabled={currentIdx >= total - 1}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-30 transition-all shadow-md shadow-indigo-200">
                التالي <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!identified) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 overflow-hidden max-w-md w-full">
        <div className="bg-gradient-to-l from-indigo-500 to-purple-600 px-6 py-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4"><BookOpen size={32} className="text-white" /></div>
          <h2 className="text-white font-bold text-lg">{exam?.title}</h2>
          <p className="text-indigo-200 text-sm mt-1">{exam?.subject} · {exam?.grade}</p>
          {isExpired && <p className="text-indigo-200 text-xs mt-2 bg-white/10 rounded-lg px-3 py-1 inline-block">الاختبار مغلق · يمكنك مراجعة إجاباتك فقط</p>}
        </div>
        <div className="p-6">
          <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2"><User size={16} /> تسجيل الدخول</h3>
          <p className="text-xs text-gray-400 mb-4">أدخل بياناتك {isExpired ? 'لمراجعة إجاباتك' : 'لبدء الاختبار'}</p>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-500 font-medium mb-1 block">الكود</label>
              <input type="text" value={studentCode} onChange={e => setStudentCode(e.target.value)} placeholder="أدخل الكود الخاص بك"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-medium mb-1 block">كلمة السر (رقم الموبايل)</label>
              <input type="password" value={studentPhone} onChange={e => setStudentPhone(e.target.value)} placeholder="أدخل رقم الموبايل"
                onKeyDown={e => e.key === 'Enter' && handleIdentify()}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
            </div>
            {notFound && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={12} /> الكود أو كلمة السر غير صحيحة</p>}
            <button onClick={handleIdentify} disabled={!studentCode.trim() || !studentPhone.trim() || searching}
              className="w-full py-3 bg-gradient-to-l from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-sm hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200">
              {searching ? 'جاري التحقق...' : 'تسجيل الدخول'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-200">
          <CheckCircle size={40} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">{studentName}</h2>
        <p className="text-gray-400 text-xs mb-5">تم استلام إجاباتك بنجاح</p>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-5 border border-emerald-100">
          <div className="flex items-center justify-center gap-2 text-emerald-600 mb-1"><BarChart3 size={20} /><span className="text-sm font-bold">نتيجتك</span></div>
          <div className="text-4xl font-bold text-emerald-600">{score}<span className="text-lg text-emerald-400">/{total}</span></div>
          <p className="text-xs text-emerald-500 mt-1">{total > 0 ? Math.round((score / total) * 100) : 0}%</p>
        </div>
      </div>
    </div>
  );

  const q = questions[currentIdx];
  if (!q) return <div className="min-h-screen flex items-center justify-center text-gray-400">لا توجد أسئلة في هذا الاختبار</div>;

  const answeredCount = Object.keys(answers).length;
  const progress = total > 0 ? (answeredCount / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">{studentName[0]}</div>
            <div><h1 className="font-bold text-gray-800 text-sm">{exam?.title}</h1><p className="text-[10px] text-gray-400">{studentName}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
              <span className="font-bold text-indigo-600">{answeredCount}</span>/{total}
            </div>
            {timeLeft !== null && (
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${timeLeft < 60 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'}`}>
                <Clock size={12} /><span>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="h-1 bg-gray-100"><div className="h-full bg-gradient-to-l from-indigo-500 to-purple-500 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-gray-400 font-mono">سؤال {currentIdx + 1} من {total}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[q.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                  {TYPE_ICONS[q.question_type] || '🔘'} {q.difficulty}
                </span>
                <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{q.question_type}</span>
              </div>
            </div>
            <p className="text-base font-semibold text-gray-800 leading-relaxed">{q.question_text}</p>
          </div>

          {q.question_type === 'اختيار من متعدد' && Array.isArray(q.options) && (
            <div className="px-6 pb-6 space-y-2">
              {q.options.map((opt: string, oi: number) => (
                <label key={oi} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${answers[q.id] === opt ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${answers[q.id] === opt ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
                    {answers[q.id] === opt && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => handleAnswer(q.id, opt)} className="sr-only" />
                  <span className="text-sm text-gray-700">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {q.question_type === 'صح/خطأ' && (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 gap-3">
                {['صح', 'خطأ'].map(val => (
                  <label key={val} className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[q.id] === val ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name={q.id} value={val} checked={answers[q.id] === val} onChange={() => handleAnswer(q.id, val)} className="sr-only" />
                    <span className="text-lg">{val === 'صح' ? '✅' : '❌'}</span>
                    <span className="text-sm font-semibold text-gray-700">{val}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {q.question_type === 'مقالي' && (
            <div className="px-6 pb-6">
              <textarea value={answers[q.id] || ''} onChange={e => handleAnswer(q.id, e.target.value)} rows={5} placeholder="اكتب إجابتك هنا..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all">
            <ChevronRight size={16} /> السابق
          </button>
          <div className="flex items-center gap-1.5">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrentIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIdx ? 'w-6 bg-indigo-500' : answers[questions[i]?.id] ? 'bg-indigo-300' : 'bg-gray-200'}`} />
            ))}
          </div>
          {currentIdx < total - 1 ? (
            <button onClick={() => setCurrentIdx(Math.min(total - 1, currentIdx + 1))}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-all shadow-md shadow-indigo-200">
              التالي <ChevronLeft size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-l from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 transition-all shadow-md shadow-emerald-200">
              <Send size={16} /> إنهاء الاختبار
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
